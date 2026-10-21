import { appStorage, isDemoMode, readTenant } from './tenantStorage.js'
import { BILLETES_COP, MONEDAS_COP } from '../utils/denominaciones.js'

export const CASH_DENOMINATIONS = [...BILLETES_COP, ...MONEDAS_COP].map(({ valor, label }) => ({ value: valor, label }))
export const CASH_REGISTER_SALES_LIMIT = 1_000_000

const CASH_EVENT = 'vexora:cash-register-updated'
const LEGACY_CASH_KEY = 'vexora.cash-register'

function cashKey(gremio) {
  const tenant = readTenant()
  const businessKey = tenant.isDemo ? 'demo-vexora-pos' : tenant.business?.email || tenant.dian?.nit || tenant.business?.name || 'demo'
  return `vexora.cash-register:${businessKey.toLowerCase()}:${gremio}`
}

export function readCashRegister(gremio) {
  try {
    const key = cashKey(gremio)
    const saved = appStorage().getItem(key)
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

export function saveCashRegister(gremio, cash) {
  appStorage().setItem(cashKey(gremio), JSON.stringify(cash))
  window.dispatchEvent(new CustomEvent(CASH_EVENT, { detail: { gremio, cash } }))
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
