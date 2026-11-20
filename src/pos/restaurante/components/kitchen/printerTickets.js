import { isKitchenItemPending, kitchenItemName } from './kitchenOrderAdapters.js'

export function ticketForPrinter(order) {
  return {
    numero: order._id,
    mesa: order.tableName,
    productos: order.items.map((item) => ({
      nombre: kitchenItemName(item),
      cantidad: item.quantity,
      nota: item.note,
    })),
  }
}

export function kitchenTicketForTable(table, remote = false) {
  const pending = table.items.filter((item) => isKitchenItemPending(item, remote))
  return {
    numero: table.id,
    mesa: table.name,
    fecha: pending[0]?.sentAt ? new Date(pending[0].sentAt).toLocaleString('es-CO') : undefined,
    productos: pending.map((item) => ({
      nombre: kitchenItemName(item),
      cantidad: item.quantity,
      nota: item.note,
    })),
  }
}

export function readyTicketForPrinter(table, readyOrder) {
  return {
    numero: `MESA-${table?.id ?? readyOrder.tableId}`,
    mesa: table?.name ?? String(readyOrder.tableId),
    cliente: { nombre: 'Cliente de restaurante' },
    productos: readyOrder.productos,
    total: readyOrder.total,
  }
}
