import Dexie from 'dexie'
import { db, notifyOfflineQueueChanged, salesScope, tenantScope } from './offlineDB.js'

const QUEUE_EVENT = 'vexora:offline-queue-updated'
const TOKEN_KEY = 'vexora.accessToken'
let synchronization = null

function getAccessToken() {
  return window.localStorage.getItem(TOKEN_KEY)
}

function tokenIsValid() {
  const token = getAccessToken()
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return Number.isFinite(payload.exp) && payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

export function isNetworkUnavailable(error) {
  return navigator.onLine === false || error?.cause instanceof TypeError
}

export async function canSellOffline(licenseStatus) {
  if (!tokenIsValid() || !licenseStatus || licenseStatus.blocked) return false
  const validUntil = Date.parse(licenseStatus.validUntil ?? '')
  return Number.isFinite(validUntil) && validUntil > Date.now()
}

export async function registerOfflineSale(gremio, items, paymentMethod, saleKey, occurredAt, licenseStatus) {
  if (!await canSellOffline(licenseStatus)) {
    throw new Error('No hay una licencia activa verificada y una sesión válida para vender sin conexión.')
  }
  const scope = salesScope()
  const productScope = tenantScope()
  const sale = {
    saleKey,
    scope,
    tenantScope: productScope,
    gremio,
    paymentMethod,
    items: items.map((item) => ({
      ...(item.id ? { id: String(item.id) } : {}),
      ...(item.variantSku || item.sku ? { variantSku: item.variantSku ?? item.sku } : {}),
      ...(item.name ? { name: item.name } : {}),
      quantity: Number(item.quantity),
      ...(item.price !== undefined ? { price: Number(item.price) } : {}),
    })),
    occurredAt,
    createdAt: occurredAt,
    status: 'pending',
    error: '',
  }

  await db.transaction('rw', db.products, db.pendingSales, async () => {
    for (const item of sale.items) {
      if (!item.id) continue
      const product = await db.products.get([productScope, gremio, item.id])
      if (!product) throw new Error(`No hay una copia local de ${item.name ?? item.id}; conecta el POS para actualizar el inventario.`)
      if (Number(product.quantity ?? product.stock) < item.quantity) {
        throw new Error(`Inventario insuficiente para ${product.name}.`)
      }
      if (item.price !== undefined && Number(product.price) !== item.price) {
        throw new Error(`El precio de ${product.name} no coincide con el inventario local.`)
      }
      if (item.variantSku) {
        const variant = (product.variants ?? []).find((entry) => entry.sku === item.variantSku)
        if (!variant || variant.stock < item.quantity) {
          throw new Error(`Inventario insuficiente para ${item.variantSku}.`)
        }
        variant.stock -= item.quantity
      }
      product.quantity = Number(product.quantity ?? product.stock) - item.quantity
      product.stock = product.quantity
      await db.products.put(product)
    }
    await db.pendingSales.add(sale)
  })
  notifyOfflineQueueChanged()
  return {
    sale: { ...sale, total: sale.items.reduce((sum, item) => sum + item.quantity * (item.price ?? 0), 0) },
    products: await db.products.where('[tenantScope+gremio+id]')
      .between([productScope, gremio, ''], [productScope, gremio, '\uffff'])
      .toArray(),
  }
}

export async function pendingSalesCount() {
  const scope = salesScope()
  return db.pendingSales.where('scope').equals(scope).count()
}

export async function reservePendingSales(gremio, products) {
  const scope = salesScope()
  const pending = await db.pendingSales.where('scope').equals(scope).toArray()
  const reserved = new Map(products.map((product) => [String(product.id), { ...product, variants: (product.variants ?? []).map((variant) => ({ ...variant })) }]))
  for (const sale of pending) {
    if (sale.gremio !== gremio) continue
    for (const item of sale.items) {
      if (!item.id) continue
      const product = reserved.get(item.id)
      if (!product) continue
      product.quantity = Math.max(0, Number(product.quantity ?? product.stock) - item.quantity)
      product.stock = product.quantity
      if (item.variantSku) {
        const variant = product.variants.find((entry) => entry.sku === item.variantSku)
        if (variant) variant.stock = Math.max(0, variant.stock - item.quantity)
      }
    }
  }
  return [...reserved.values()]
}

export async function synchronizePendingSales(apiRequest, { retryFailed = false } = {}) {
  if (synchronization) return synchronization
  synchronization = (async () => {
    const scope = salesScope()
    await db.pendingSales.where('scope').equals(scope).and((sale) => sale.status === 'syncing')
      .modify({ status: 'pending' })
    const statuses = retryFailed ? ['pending', 'failed'] : ['pending']
    const queue = await db.pendingSales.where('scope').equals(scope).sortBy('createdAt')
    const pending = queue.filter((sale) => statuses.includes(sale.status))
    let synced = 0
    let failure = null

    for (const sale of pending) {
      if (!navigator.onLine || !getAccessToken()) break
      await db.pendingSales.update(sale.id, { status: 'syncing', error: '' })
      try {
        const result = await apiRequest('/api/sales', {
          method: 'POST',
          body: JSON.stringify({
            saleKey: sale.saleKey,
            gremio: sale.gremio,
            paymentMethod: sale.paymentMethod,
            items: sale.items,
            occurredAt: sale.occurredAt,
            offlineSync: true,
          }),
        })
        await db.transaction('rw', db.pendingSales, db.sales, db.products, async () => {
          await db.sales.put({ ...sale, status: 'synced', sale: result.sale })
          await db.pendingSales.delete(sale.id)
          const remainingSales = await db.pendingSales.where('scope').equals(scope).count()
          if (!remainingSales && result.inventory?.products) {
            const products = result.inventory.products.map((product) => ({
              ...product,
              id: String(product.id),
              tenantScope: sale.tenantScope,
              gremio: sale.gremio,
            }))
            await db.products.where('[tenantScope+gremio+id]')
              .between([sale.tenantScope, sale.gremio, Dexie.minKey], [sale.tenantScope, sale.gremio, Dexie.maxKey])
              .delete()
            await db.products.bulkPut(products)
          }
        })
        synced += 1
      } catch (error) {
        const status = Number.isInteger(error?.status) ? error.status : null
        failure = { status, message: error instanceof Error ? error.message : 'No se pudo sincronizar la venta.' }
        await db.pendingSales.update(sale.id, {
          status: status && status < 500 && status !== 401 ? 'failed' : 'pending',
          error: failure.message,
        })
        if (!status || status >= 500 || status === 401) break
      }
    }

    notifyOfflineQueueChanged()
    return { synced, pending: await pendingSalesCount(), failure }
  })().finally(() => {
    synchronization = null
  })
  return synchronization
}

export function subscribeOfflineQueue(callback) {
  window.addEventListener(QUEUE_EVENT, callback)
  return () => window.removeEventListener(QUEUE_EVENT, callback)
}
