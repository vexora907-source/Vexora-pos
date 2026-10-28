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

test('mezcla ventas locales pendientes durante el mismo turno compartido', async () => {
  const { mergeCashState } = await import('../src/shared/services/cashRegister.js')
  const merged = mergeCashState({
    isOpen: true,
    openedAt: '2026-10-27T14:00:00.000Z',
    sales: [{ id: 'remote', amount: 1000, paymentMethod: 'efectivo' }],
    history: [],
  }, {
    isOpen: true,
    openedAt: '2026-10-27T14:00:00.000Z',
    sales: [{ id: 'local', amount: 2000, paymentMethod: 'tarjeta' }],
    history: [],
  })

  assert.deepEqual(merged.sales.map((sale) => sale.id), ['remote', 'local'])
})

test('server state wins when local data belongs to an older or different shift', async () => {
  const { mergeCashState } = await import('../src/shared/services/cashRegister.js')
  const serverCash = {
    isOpen: false,
    openedAt: '2026-10-27T10:00:00.000Z',
    closedAt: '2026-10-27T13:00:00.000Z',
    sales: [],
    history: [],
  }
  const merged = mergeCashState(serverCash, {
    isOpen: true,
    openedAt: '2026-10-27T11:00:00.000Z',
    sales: [{ id: 'stale', amount: 1000, paymentMethod: 'efectivo' }],
    history: [],
  })

  assert.equal(merged.isOpen, false)
  assert.deepEqual(merged.sales, [])
})

test('migra la caja local anterior a una clave estable por negocio sin perder el turno', async () => {
  const { readCashRegister } = await import('../src/shared/services/cashRegister.js')
  localStorage.setItem('vexora.tenant', JSON.stringify({
    id: 'tenant-123',
    business: { email: 'negocio@example.com' },
  }))
  const previousKey = 'vexora.cash-register:negocio@example.com:papeleria'
  const cash = { isOpen: true, openedAt: '2026-10-27T14:00:00.000Z', sales: [], history: [] }
  localStorage.setItem(previousKey, JSON.stringify(cash))

  assert.deepEqual(readCashRegister('papeleria'), cash)
  assert.equal(localStorage.getItem('vexora.cash-register:tenant-123:papeleria'), JSON.stringify(cash))
  assert.equal(localStorage.getItem(previousKey), null)
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
