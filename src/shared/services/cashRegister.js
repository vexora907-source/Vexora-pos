import { appStorage, isDemoMode, readTenant } from './tenantStorage.js'
import { BILLETES_COP, MONEDAS_COP } from '../utils/denominaciones.js'
import { API_URL, apiRequest } from './api.js'
import { getAuthToken } from './auth.js'

export const CASH_DENOMINATIONS = [...BILLETES_COP, ...MONEDAS_COP].map(({ valor, label }) => ({ value: valor, label }))
export const CASH_REGISTER_SALES_LIMIT = 1_000_000

const CASH_EVENT = 'vexora:cash-register-updated'
const CASH_SYNC_ERROR_EVENT = 'vexora:cash-register-sync-error'
const LEGACY_CASH_KEY = 'vexora.cash-register'
const serverVersions = new Map()
const syncQueues = new Map()
const pendingSyncs = new Map()

function cashKey(gremio) {
  const tenant = readTenant()
  const businessKey = tenant.isDemo
    ? 'demo-vexora-pos'
    : tenant.id || tenant.business?.email || tenant.dian?.nit || tenant.business?.name || 'demo'
  return `vexora.cash-register:${String(businessKey).toLowerCase()}:${gremio}`
}

function legacyTenantCashKey(gremio) {
  const tenant = readTenant()
  const businessKey = tenant.business?.email || tenant.dian?.nit || tenant.business?.name || 'demo'
  return `vexora.cash-register:${String(businessKey).toLowerCase()}:${gremio}`
}

export function readCashRegister(gremio) {
  try {
    const key = cashKey(gremio)
    const storage = appStorage()
    let saved = storage.getItem(key)
    if (!saved && !isDemoMode()) {
      const legacyTenantKey = legacyTenantCashKey(gremio)
      saved = storage.getItem(legacyTenantKey)
      if (saved) {
        storage.setItem(key, saved)
        storage.removeItem(legacyTenantKey)
      }
    }
    if (saved) {
      const cash = JSON.parse(saved)
      if (cash && Array.isArray(cash.history)) return cash
      const history = []
      if (cash?.openedAt) history.push({ fecha: cash.openedAt, tipo: 'APERTURA', base: Number(cash.openingAmount) || 0 })
      if (cash?.lastClosure?.closedAt) history.push({
        fecha: cash.lastClosure.closedAt,
        tipo: 'CIERRE',
        base: Number(cash.openingAmount) || 0,
        ventas: (cash.sales ?? []).reduce((sum, sale) => sum + (sale.paymentMethod === 'efectivo' ? sale.amount : 0), 0),
        esperado: cash.lastClosure.expectedCash,
        contado: cash.lastClosure.countedCash,
        diferencia: cash.lastClosure.difference,
        desglose: cash.lastClosure.closingCounts ?? {},
      })
      return { ...cash, history }
    }
    if (isDemoMode()) return null
    const legacy = appStorage().getItem(LEGACY_CASH_KEY)
    if (!legacy) return null
    const oldCash = JSON.parse(legacy)
    const migrated = {
      ...oldCash,
      base: Number(oldCash.base ?? oldCash.openingAmount) || 0,
      openingAmount: Number(oldCash.openingAmount) || 0,
      sales: Array.isArray(oldCash.sales) ? oldCash.sales : [],
      history: oldCash.openedAt ? [{ fecha: oldCash.openedAt, tipo: 'APERTURA', base: Number(oldCash.openingAmount) || 0 }] : [],
    }
    appStorage().setItem(key, JSON.stringify(migrated))
    appStorage().removeItem(LEGACY_CASH_KEY)
    return migrated
  } catch (error) {
    console.error('No se pudo leer el estado de caja guardado.', error)
    return null
  }
}

function writeLocalCashRegister(gremio, cash) {
  if (cash) appStorage().setItem(cashKey(gremio), JSON.stringify(cash))
  else appStorage().removeItem(cashKey(gremio))
  window.dispatchEvent(new CustomEvent(CASH_EVENT, { detail: { gremio, cash } }))
}

function remoteSyncEnabled() {
  return Boolean(API_URL && getAuthToken() && !isDemoMode())
}

export function mergeCashState(serverCash, localCash) {
  if (!localCash) return serverCash
  const serverClosedAt = new Date(serverCash.closedAt ?? 0).getTime()
  const localOpenedAt = new Date(localCash.openedAt ?? 0).getTime()
  if (!serverCash.isOpen && localCash.isOpen && localOpenedAt > serverClosedAt) return localCash

  const sameShift = Boolean(serverCash.openedAt && serverCash.openedAt === localCash.openedAt)
  const historyByKey = new Map()
  for (const entry of [...(serverCash.history ?? []), ...(localCash.history ?? [])]) {
    historyByKey.set(`${entry.fecha}:${entry.tipo}:${entry.base ?? ''}:${entry.contado ?? ''}`, entry)
  }
  return {
    ...serverCash,
    sales: sameShift
      ? [...new Map([...(serverCash.sales ?? []), ...(localCash.sales ?? [])].map((sale) => [sale.id, sale])).values()]
      : serverCash.sales ?? [],
    history: [...historyByKey.values()].sort((left, right) => new Date(left.fecha) - new Date(right.fecha)),
  }
}

export async function loadCashRegister(gremio) {
  if (!remoteSyncEnabled()) return readCashRegister(gremio)
  const saved = await apiRequest(`/api/cash-register/${encodeURIComponent(gremio)}`)
  const key = cashKey(gremio)
  serverVersions.set(key, saved.version)
  if (saved.cash) {
    const merged = mergeCashState(saved.cash, readCashRegister(gremio))
    writeLocalCashRegister(gremio, merged)
    if (JSON.stringify(merged) !== JSON.stringify(saved.cash)) void syncCashRegister(gremio)
    return merged
  }
  const local = readCashRegister(gremio)
  if (local) {
    const migrated = await apiRequest(`/api/cash-register/${encodeURIComponent(gremio)}`, {
      method: 'PUT',
      body: JSON.stringify({ version: saved.version, cash: local }),
    })
    serverVersions.set(key, migrated.version)
    writeLocalCashRegister(gremio, migrated.cash)
    return migrated.cash
  }
  writeLocalCashRegister(gremio, null)
  return null
}

export function syncCashRegister(gremio) {
  if (!remoteSyncEnabled()) return Promise.resolve()
  const key = cashKey(gremio)
  pendingSyncs.set(key, (pendingSyncs.get(key) ?? 0) + 1)
  if (syncQueues.has(key)) return syncQueues.get(key)

  const sync = async () => {
    if (!serverVersions.has(key)) {
      const current = await apiRequest(`/api/cash-register/${encodeURIComponent(gremio)}`)
      serverVersions.set(key, current.version)
      if (current.cash) {
        const merged = mergeCashState(current.cash, readCashRegister(gremio))
        writeLocalCashRegister(gremio, merged)
      }
    }
    let syncedVersion = 0
    let conflicts = 0
    while (syncedVersion < (pendingSyncs.get(key) ?? 0)) {
      const generation = pendingSyncs.get(key) ?? 0
      const cash = readCashRegister(gremio)
      if (!cash) break
      try {
        const saved = await apiRequest(`/api/cash-register/${encodeURIComponent(gremio)}`, {
          method: 'PUT',
          body: JSON.stringify({ version: serverVersions.get(key), cash }),
        })
        serverVersions.set(key, saved.version)
        syncedVersion = generation
        conflicts = 0
      } catch (cause) {
        if (cause?.status !== 409 || conflicts >= 2) throw cause
        const latest = await apiRequest(`/api/cash-register/${encodeURIComponent(gremio)}`)
        serverVersions.set(key, latest.version)
        const local = readCashRegister(gremio)
        writeLocalCashRegister(gremio, latest.cash ? mergeCashState(latest.cash, local) : local)
        conflicts += 1
      }
    }
    pendingSyncs.set(key, 0)
  }

  const queued = (syncQueues.get(key) ?? Promise.resolve())
    .then(sync)
    .catch((cause) => {
      window.dispatchEvent(new CustomEvent(CASH_SYNC_ERROR_EVENT, {
        detail: { gremio, message: cause instanceof Error ? cause.message : 'No se pudo sincronizar la caja.' },
      }))
    })
    .finally(() => {
      syncQueues.delete(key)
    })
  syncQueues.set(key, queued)
  return queued
}

export function refreshCashRegister(gremio) {
  return (pendingSyncs.get(cashKey(gremio)) ?? 0) > 0
    ? syncCashRegister(gremio)
    : loadCashRegister(gremio)
}

export function saveCashRegister(gremio, cash) {
  writeLocalCashRegister(gremio, cash)
  void syncCashRegister(gremio)
}

export function recordCashSale(gremio, amount, paymentMethod) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('El valor de la venta no es válido.')
  assertCashRegisterOpen(gremio, amount)
  const cash = readCashRegister(gremio)
  const sale = { id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, amount, paymentMethod, createdAt: new Date().toISOString() }
  saveCashRegister(gremio, { ...cash, sales: [...(cash.sales ?? []), sale] })
}

export function assertCashRegisterOpen(gremio, upcomingAmount = 0) {
  const cash = readCashRegister(gremio)
  if (!cash?.isOpen) throw new Error('Abre la caja antes de registrar ventas.')
  if (!Number.isFinite(upcomingAmount) || upcomingAmount < 0) throw new Error('El valor de la venta no es válido.')
  const shiftSales = (cash.sales ?? []).reduce((total, sale) => total + (Number(sale.amount) || 0), 0)
  if (shiftSales + upcomingAmount > CASH_REGISTER_SALES_LIMIT) {
    throw new Error('La caja superó el límite de ventas de $1.000.000 COP. Cierra la caja para iniciar un nuevo turno y continuar vendiendo.')
  }
}

export function countDenominations(counts = {}) {
  return CASH_DENOMINATIONS.reduce((total, denomination) => {
    const count = Math.max(0, Number(counts[denomination.value]) || 0)
    return total + denomination.value * count
  }, 0)
}
