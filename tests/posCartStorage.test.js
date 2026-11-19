import assert from 'node:assert/strict'
import test from 'node:test'
import { getPosCartStorageKey, readPosCart, writePosCart } from '../src/shared/services/posCartStorage.js'

class MemoryStorage {
  values = new Map()

  getItem(key) {
    return this.values.get(key) ?? null
  }

  setItem(key, value) {
    this.values.set(key, String(value))
  }
}

test('cart keys are isolated by tenant and gremio', () => {
  const first = getPosCartStorageKey({ business: { email: 'ventas@ejemplo.com' } }, 'tienda')
  const otherGremio = getPosCartStorageKey({ business: { email: 'ventas@ejemplo.com' } }, 'ropa')
  const otherTenant = getPosCartStorageKey({ business: { email: 'otro@ejemplo.com' } }, 'tienda')

  assert.notEqual(first, otherGremio)
  assert.notEqual(first, otherTenant)
  assert.equal(getPosCartStorageKey({}, 'tienda'), null)
})

test('restores cart data after reload and clears it after a confirmed sale', () => {
  const storage = new MemoryStorage()
  const key = getPosCartStorageKey({ id: 'tenant-1' }, 'papeleria')
  const cart = [{ id: 'notebook', name: 'Cuaderno', price: 4500, quantity: 2 }]

  writePosCart(storage, key, cart)
  assert.deepEqual(readPosCart(storage, key), cart)

  writePosCart(storage, key, [])
  assert.deepEqual(readPosCart(storage, key), [])
})

test('invalid saved cart data does not become an active cart', () => {
  const storage = new MemoryStorage()
  storage.setItem('cart', JSON.stringify({ product: 'not an array' }))
  const originalError = console.error
  console.error = () => {}
  try {
    assert.deepEqual(readPosCart(storage, 'cart'), [])
  } finally {
    console.error = originalError
  }
})
