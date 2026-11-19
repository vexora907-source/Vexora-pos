import assert from 'node:assert/strict'
import test from 'node:test'
import {
  mapQuickMealOrders,
  quickMealKitchenTicket,
  quickMealReadyTicket,
} from '../src/pos/restaurante/components/kitchen/kitchenOrderAdapters.js'

test('maps active quick-meal orders to the shared kitchen display and hides completed orders', () => {
  const [tableOrder, takeawayOrder] = mapQuickMealOrders([
    {
      _id: 'order-123456',
      type: 'table',
      table: '7',
      status: 'IN_KITCHEN',
      kitchenAt: '2026-11-19T10:00:00.000Z',
      items: [{ productId: 'burger', name: 'Hamburguesa', quantity: 2, price: 18000 }],
    },
    { _id: 'order-ready', type: 'takeaway', status: 'READY', items: [{ name: 'Papas', quantity: 1 }] },
    { _id: 'order-654321', type: 'takeaway', status: 'RECEIVED', items: [] },
  ])

  assert.equal(tableOrder.id, 'order-123456')
  assert.equal(tableOrder.name, 'Orden 123456 · Mesa 7')
  assert.equal(tableOrder.items[0].lineId, 'order-123456-0')
  assert.equal(tableOrder.items[0].sentAt, '2026-11-19T10:00:00.000Z')
  assert.equal(tableOrder.items[0].readyAt, null)
  assert.equal(takeawayOrder.name, 'Orden 654321 · Para llevar')
  assert.equal(mapQuickMealOrders([{ status: 'DELIVERED', items: [] }]).length, 0)
})

test('builds kitchen and ready tickets with the order items and location', () => {
  const order = {
    _id: 'order-123456',
    type: 'delivery',
    customer: 'Ana',
    createdAt: '2026-11-19T10:00:00.000Z',
    items: [{ name: 'Hamburguesa', quantity: 2, price: 18000, note: 'Sin cebolla' }],
    total: 36000,
  }

  assert.deepEqual(quickMealKitchenTicket(order).productos, [
    { nombre: 'Hamburguesa', cantidad: 2, nota: 'Sin cebolla' },
  ])
  assert.deepEqual(quickMealReadyTicket(order).productos, [
    { nombre: 'LISTO PARA ENTREGAR · Hamburguesa', cantidad: 2, total: 36000, nota: 'Sin cebolla' },
  ])
  assert.equal(quickMealReadyTicket(order).mesa, 'Domicilio')
  assert.equal(quickMealReadyTicket(order).cliente.nombre, 'Ana')
  assert.equal(quickMealReadyTicket(order).total, 36000)
})
