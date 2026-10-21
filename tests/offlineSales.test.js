import test, { before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import 'fake-indexeddb/auto'

const localStorage = new Map()
globalThis.window = {
  localStorage: {
    getItem: (key) => localStorage.get(key) ?? null,
    setItem: (key, value) => localStorage.set(key, value),
  },
  dispatchEvent: () => true,
}
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true })

const { db, cacheProducts, readCachedProducts } = await import('../src/shared/services/offlineDB.js')
const { pendingSalesCount, registerOfflineSale, synchronizePendingSales } = await import('../src/shared/services/offlineSales.js')

function setSession(exp = Math.floor(Date.now() / 1000) + 3600) {
  localStorage.set('vexora.tenant', JSON.stringify({
    business: { email: 'offline@example.com' },
    user: { id: 'user-1' },
  }))
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url')
  localStorage.set('vexora.accessToken', `header.${payload}.signature`)
}

before(() => setSession())
beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
  setSession()
})
after(() => db.close())

test('persists offline sales and decrements cached stock atomically', async () => {
  await cacheProducts('papeleria', [{ id: 'pencil', name: 'Lápiz', price: 500, stock: 4, quantity: 4 }])
  const sale = await registerOfflineSale(
    'papeleria',
    [{ id: 'pencil', name: 'Lápiz', price: 500, quantity: 2 }],
    'efectivo',
    'offline-sale-1',
    new Date().toISOString(),
    { blocked: false, validUntil: new Date(Date.now() + 60_000).toISOString() },
  )

  assert.equal(sale.sale.status, 'pending')
  assert.equal(await pendingSalesCount(), 1)
  assert.equal((await readCachedProducts('papeleria'))[0].quantity, 2)
})

test('does not queue a sale or change stock when offline stock is insufficient', async () => {
  await cacheProducts('papeleria', [{ id: 'pencil', name: 'Lápiz', price: 500, stock: 1, quantity: 1 }])
  await assert.rejects(
    registerOfflineSale(
      'papeleria',
      [{ id: 'pencil', name: 'Lápiz', price: 500, quantity: 2 }],
      'efectivo',
      'offline-sale-2',
      new Date().toISOString(),
      { blocked: false, validUntil: new Date(Date.now() + 60_000).toISOString() },
    ),
    /Inventario insuficiente/,
  )
  assert.equal(await pendingSalesCount(), 0)
  assert.equal((await readCachedProducts('papeleria'))[0].quantity, 1)
})

test('retries queued sales idempotently and removes them after sync', async () => {
  await cacheProducts('papeleria', [{ id: 'pencil', name: 'Lápiz', price: 500, stock: 4, quantity: 4 }])
  await registerOfflineSale(
    'papeleria',
    [{ id: 'pencil', name: 'Lápiz', price: 500, quantity: 1 }],
    'efectivo',
    'offline-sale-3',
    new Date().toISOString(),
    { blocked: false, validUntil: new Date(Date.now() + 60_000).toISOString() },
  )
  let calls = 0
  const result = await synchronizePendingSales(async (_path, options) => {
    calls += 1
    assert.equal(JSON.parse(options.body).saleKey, 'offline-sale-3')
    return { sale: { saleKey: 'offline-sale-3' }, inventory: { products: [] } }
  })

  assert.equal(calls, 1)
  assert.equal(result.synced, 1)
  assert.equal(result.pending, 0)
  assert.equal(await db.sales.where('saleKey').equals('offline-sale-3').count(), 1)
})
