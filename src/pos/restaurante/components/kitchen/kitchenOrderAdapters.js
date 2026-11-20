const QUICK_MEAL_TYPES = {
  table: 'Mesa',
  takeaway: 'Para llevar',
  delivery: 'Domicilio',
}

export function kitchenItemName(item) {
  const name = [item.name, item.productName, item.product?.name, item.product?.nombre, item.productId]
    .find((value) => typeof value === 'string' && value.trim())
  return name?.trim() ?? 'Producto sin nombre'
}

export function mapQuickMealOrders(orders) {
  return orders
    .filter((order) => ['RECEIVED', 'IN_KITCHEN'].includes(order.status))
    .map((order) => {
      const id = String(order._id ?? order.id)
      const location = order.type === 'table'
        ? `${QUICK_MEAL_TYPES.table} ${order.table || ''}`.trim()
        : QUICK_MEAL_TYPES[order.type] ?? 'Pedido'
      return {
        id,
        name: `Orden ${id.slice(-6)} · ${location}`,
        quickMeal: true,
        status: order.status,
        items: (order.items ?? []).map((item, index) => ({
          ...item,
          name: kitchenItemName(item),
          id: item.productId,
          lineId: `${id}-${index}`,
          sentAt: order.kitchenAt ?? order.createdAt ?? order.receivedAt,
          readyAt: null,
        })),
      }
    })
}

function quickMealLocation(order) {
  return order.type === 'table'
    ? `Mesa ${order.table || ''}`.trim()
    : QUICK_MEAL_TYPES[order.type] ?? 'Pedido'
}

export function quickMealKitchenTicket(order) {
  return {
    numero: String(order._id ?? order.id),
    mesa: quickMealLocation(order),
    tipo: order.type,
    fecha: new Date(order.createdAt ?? order.receivedAt).toLocaleString('es-CO'),
    productos: (order.items ?? []).map((item) => ({
      nombre: kitchenItemName(item),
      cantidad: item.quantity,
      nota: item.note,
    })),
  }
}

export function quickMealReadyTicket(order) {
  return {
    ...quickMealKitchenTicket(order),
    cliente: { nombre: order.customer || 'Cliente Final' },
    productos: (order.items ?? []).map((item) => ({
      nombre: `LISTO PARA ENTREGAR · ${kitchenItemName(item)}`,
      cantidad: item.quantity,
      total: item.price * item.quantity,
      nota: item.note,
    })),
    total: order.total,
  }
}
