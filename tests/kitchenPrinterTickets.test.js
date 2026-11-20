import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  kitchenTicketForTable,
  readyTicketForPrinter,
  ticketForPrinter,
} from '../src/pos/restaurante/components/kitchen/printerTickets.js'

test('creates the same kitchen printer ticket from a restaurant order', () => {
  assert.deepEqual(ticketForPrinter({
    _id: 'order-1',
    tableName: 'Mesa 4',
    items: [{ name: 'Hamburguesa', quantity: 2, note: 'Sin cebolla' }],
  }), {
    numero: 'order-1',
    mesa: 'Mesa 4',
    productos: [{ nombre: 'Hamburguesa', cantidad: 2, nota: 'Sin cebolla' }],
  })
})

test('builds a printable ticket from an already loaded kitchen card', () => {
  assert.deepEqual(kitchenTicketForTable({
    id: 'order-1',
    name: 'Orden 1 · Mesa 4',
    items: [
      { name: 'Hamburguesa', quantity: 2, note: 'Sin cebolla', sentAt: '2026-11-19T10:00:00.000Z', readyAt: null },
      { name: 'Papas', quantity: 1, sentAt: '2026-11-19T10:00:00.000Z', readyAt: '2026-11-19T10:01:00.000Z' },
    ],
  }), {
    numero: 'order-1',
    mesa: 'Orden 1 · Mesa 4',
    fecha: new Date('2026-11-19T10:00:00.000Z').toLocaleString('es-CO'),
    productos: [{ nombre: 'Hamburguesa', cantidad: 2, nota: 'Sin cebolla' }],
  })
})

test('creates a caja ticket for items marked ready from the kitchen screen', () => {
  assert.deepEqual(readyTicketForPrinter(
    { id: 'table-4', name: 'Mesa 4' },
    {
      tableId: 'table-4',
      productos: [{ nombre: 'LISTO PARA ENTREGAR · Hamburguesa', cantidad: 2, total: 24000 }],
      total: 24000,
    },
  ), {
    numero: 'MESA-table-4',
    mesa: 'Mesa 4',
    cliente: { nombre: 'Cliente de restaurante' },
    productos: [{ nombre: 'LISTO PARA ENTREGAR · Hamburguesa', cantidad: 2, total: 24000 }],
    total: 24000,
  })
})
