import { apiRequest } from './api.js'
import { getAuthToken } from './auth.js'

function inventoryRequest(path, options = {}) {
  const token = getAuthToken()
  if (!token) throw new Error('Inicia sesión para guardar el inventario del negocio.')
  return apiRequest(path, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  })
}

export async function initializeInventory(gremio, products) {
  const result = await inventoryRequest(`/api/inventory/${encodeURIComponent(gremio)}/initialize`, {
    method: 'POST',
    body: JSON.stringify({ products }),
  })
  return result.inventory
}

export async function saveInventory(gremio, products, version) {
  const result = await inventoryRequest(`/api/inventory/${encodeURIComponent(gremio)}`, {
    method: 'PUT',
    body: JSON.stringify({ products, version }),
  })
  return result.inventory
}
