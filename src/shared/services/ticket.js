export function formatCOP(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
}

export function buildTicket({ businessName = 'Vexora POS', items = [], paymentMethod = '' }) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('No se puede generar un ticket sin productos o servicios.')
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  return { businessName, items, total, paymentMethod, createdAt: new Date().toISOString() }
}
