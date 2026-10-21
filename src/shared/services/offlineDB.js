import Dexie from 'dexie'

export const db = new Dexie('VexoraPOS')

db.version(1).stores({
  products: '[tenantScope+gremio+id], tenantScope, gremio',
  pendingSales: '++id, &saleKey, scope, status, createdAt',
  sales: '++id, &saleKey, scope, createdAt',
  metadata: '&key',
})

export function tenantScope() {
  const tenant = JSON.parse(window.localStorage.getItem('vexora.tenant') ?? '{}')
  const identity = tenant.business?.email || tenant.dian?.nit
  if (!identity) throw new Error('No se pudo identificar el negocio para el almacenamiento sin conexión.')
  return identity.trim().toLowerCase()
}

export function salesScope() {
  const tenant = JSON.parse(window.localStorage.getItem('vexora.tenant') ?? '{}')
  const identity = tenant.user?.id
  if (!identity) throw new Error('Inicia sesión para vender sin conexión.')
  return `${tenantScope()}:${identity}`
}

export async function cacheProducts(gremio, products) {
  const scope = tenantScope()
  await db.transaction('rw', db.products, async () => {
    await db.products.where('[tenantScope+gremio+id]')
      .between([scope, gremio, Dexie.minKey], [scope, gremio, Dexie.maxKey])
      .delete()
    await db.products.bulkPut(products.map((product) => ({
      ...product,
      id: String(product.id),
      tenantScope: scope,
      gremio,
    })))
  })
}

export async function readCachedProducts(gremio) {
  const scope = tenantScope()
  const products = await db.products.where('[tenantScope+gremio+id]')
    .between([scope, gremio, Dexie.minKey], [scope, gremio, Dexie.maxKey])
    .toArray()
  return products.map(({ tenantScope: _tenantScope, gremio: _gremio, ...product }) => product)
}

export async function cacheLicenseStatus(status) {
  await db.metadata.put({
    key: `license:${tenantScope()}`,
    status,
    verifiedAt: new Date().toISOString(),
  })
}

export async function readCachedLicenseStatus() {
  const entry = await db.metadata.get(`license:${tenantScope()}`)
  return entry?.status ?? null
}

export function notifyOfflineQueueChanged() {
  window.dispatchEvent(new Event('vexora:offline-queue-updated'))
}
