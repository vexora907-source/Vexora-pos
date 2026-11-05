import test from 'node:test'
import assert from 'node:assert/strict'
import { getCustomerDisplayTenantKey, normalizeCustomerDisplayState } from '../src/shared/services/customerDisplay.js'

test('normalizes purchase lines for the customer screen without exposing extra product data', () => {
  const state = normalizeCustomerDisplayState({
    gremio: 'ropa',
    items: [{
      id: 'shirt-1',
      name: 'Camiseta',
      price: 25000,
      quantity: 2,
      variant: { size: 'M', color: 'Azul', sku: 'PRIVATE-SKU' },
      note: 'Empaque para regalo',
      supplierCost: 12000,
    }],
  })

  assert.equal(state.status, 'purchase')
  assert.equal(state.total, 50000)
  assert.deepEqual(state.items, [{
    name: 'Camiseta · M · Azul',
    quantity: 2,
    price: 25000,
    total: 50000,
    note: 'Empaque para regalo',
  }])
})

test('keeps receipt data and prevents negative totals', () => {
  const state = normalizeCustomerDisplayState({
    status: 'receipt',
    customerName: 'Cliente de prueba',
    total: -1,
    items: [{ nombre: 'Servicio', precio: 12000, cantidad: 1 }],
  })

  assert.equal(state.status, 'receipt')
  assert.equal(state.customerName, 'Cliente de prueba')
  assert.equal(state.total, 12000)
})

test('isolates customer display channels by business identity', () => {
  assert.equal(
    getCustomerDisplayTenantKey({ business: { email: 'ventas@ejemplo.com' } }),
    'ventas%40ejemplo.com',
  )
  assert.notEqual(
    getCustomerDisplayTenantKey({ business: { email: 'uno@ejemplo.com' } }),
    getCustomerDisplayTenantKey({ business: { email: 'dos@ejemplo.com' } }),
  )
})
