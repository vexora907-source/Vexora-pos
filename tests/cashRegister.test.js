import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'

class MemoryStorage {
  values = new Map()

  get length() {
    return this.values.size
  }

  key(index) {
    return [...this.values.keys()][index] ?? null
  }

  getItem(key) {
    return this.values.get(key) ?? null
  }

  setItem(key, value) {
    this.values.set(key, String(value))
  }

  removeItem(key) {
    this.values.delete(key)
  }
}

const localStorage = new MemoryStorage()
const sessionStorage = new MemoryStorage()

beforeEach(() => {
  localStorage.values.clear()
  sessionStorage.values.clear()
  globalThis.window = {
    localStorage,
    sessionStorage,
    dispatchEvent() {},
  }
})

afterEach(() => {
  delete globalThis.window
})

test('permite ventas que completan el tope de caja y bloquea las que lo exceden', async () => {
  const { recordCashSale, saveCashRegister, assertCashRegisterOpen } = await import('../src/shared/services/cashRegister.js')
  saveCashRegister('papeleria', { isOpen: true, sales: [] })

  assertCashRegisterOpen('papeleria', 400_000)
  recordCashSale('papeleria', 400_000, 'efectivo')
  recordCashSale('papeleria', 600_000, 'tarjeta')
  assert.throws(
    () => assertCashRegisterOpen('papeleria', 1),
    /límite de ventas de \$1\.000\.000 COP/i,
  )
})

test('bloquea una venta cuyo valor individual supera el límite', async () => {
  const { recordCashSale, saveCashRegister } = await import('../src/shared/services/cashRegister.js')
  saveCashRegister('tienda', { isOpen: true, sales: [] })

  assert.throws(
    () => recordCashSale('tienda', 1_000_001, 'efectivo'),
    /límite de ventas de \$1\.000\.000 COP/i,
  )
})

test('la cuenta demo guarda datos solo en sessionStorage y los elimina al salir', async () => {
  const { appStorage, clearTenant, saveTenant, startDemoMode } = await import('../src/shared/services/tenantStorage.js')
  localStorage.setItem('vexora.tenant', JSON.stringify({ business: { name: 'Cuenta real' } }))
  localStorage.setItem('preferencia-ajena', 'conservar')

  startDemoMode()
  saveTenant({ business: { name: 'Cuenta Demo Vexora' }, gremios: ['papeleria'], isDemo: true })
  appStorage().setItem('vexora.inventory:demo:papeleria', '[]')

  assert.equal(localStorage.getItem('vexora.tenant'), JSON.stringify({ business: { name: 'Cuenta real' } }))
  assert.equal(sessionStorage.getItem('vexora.inventory:demo:papeleria'), '[]')

  clearTenant()
  assert.equal(sessionStorage.getItem('vexora.demoMode'), null)
  assert.equal(sessionStorage.getItem('vexora.tenant'), null)
  assert.equal(sessionStorage.getItem('vexora.inventory:demo:papeleria'), null)
  assert.equal(localStorage.getItem('preferencia-ajena'), 'conservar')
})

test('el recargo reinicia y redirige una sesión demo al inicio', async () => {
  const { resetDemoOnReload, startDemoMode } = await import('../src/shared/services/tenantStorage.js')
  let redirectedTo
  window.performance = { getEntriesByType: () => [{ type: 'reload' }] }
  window.history = { replaceState: (_state, _title, url) => { redirectedTo = url } }
  startDemoMode()
  sessionStorage.setItem('vexora.tenant', '{"isDemo":true}')
  sessionStorage.setItem('vexora.inventory:test', '[]')

  assert.equal(resetDemoOnReload(), true)
  assert.equal(redirectedTo, '/')
  assert.equal(sessionStorage.getItem('vexora.demoMode'), null)
  assert.equal(sessionStorage.getItem('vexora.tenant'), null)
  assert.equal(sessionStorage.getItem('vexora.inventory:test'), null)
})
