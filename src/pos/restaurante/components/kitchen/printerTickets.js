export function ticketForPrinter(order) {
  return {
    numero: order._id,
    mesa: order.tableName,
    productos: order.items.map((item) => ({
      nombre: item.name,
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
