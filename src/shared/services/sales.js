import { apiRequest } from './api.js'

export function newSaleKey() {
  return globalThis.crypto?.randomUUID?.() ?? `sale-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function registerSale(gremio, items, paymentMethod, saleKey = newSaleKey(), occurredAt = new Date().toISOString()) {
  return apiRequest('/api/sales', {
    method: 'POST',
    body: JSON.stringify({
      saleKey,
      occurredAt,
      gremio,
      paymentMethod,
      items: items.map((item) => ({
        ...(item.id ? { id: String(item.id) } : {}),
        ...(item.variantSku || item.sku ? { variantSku: item.variantSku ?? item.sku } : {}),
        ...(item.name ? { name: item.name } : {}),
        quantity: Number(item.quantity),
        ...(item.price !== undefined ? { price: Number(item.price) } : {}),
      })),
    }),
  })
}
