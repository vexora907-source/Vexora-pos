import { appStorage, isDemoMode } from './tenantStorage.js'
import { apiRequest } from './api.js'

function storageKey(tenantKey) {
  return `vexora.customers:${tenantKey || 'default'}`
}

export function getRegisteredCustomers(tenantKey) {
  try {
    const customers = JSON.parse(appStorage().getItem(storageKey(tenantKey)) ?? '[]')
    return Array.isArray(customers) ? customers.filter((customer) => customer && typeof customer.id === 'string') : []
  } catch (error) {
    console.error('No se pudo leer el registro local de clientes.', error)
    return []
  }
}

export function saveRegisteredCustomer(tenantKey, customer) {
  const current = getRegisteredCustomers(tenantKey)
  const documentNumber = String(customer.documentNumber ?? '').trim()
  if (!documentNumber || !customer.name?.trim() || !customer.documentType?.trim()) {
    throw new Error('El nombre y el número de documento del cliente son obligatorios.')
  }
  const existing = current.find((item) => item.documentType === customer.documentType && item.documentNumber === documentNumber)
  const saved = {
    id: existing?.id ?? globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    documentType: customer.documentType,
    documentNumber,
    name: customer.name.trim(),
    phone: customer.phone?.trim() ?? '',
    email: customer.email?.trim() ?? '',
  }
  appStorage().setItem(storageKey(tenantKey), JSON.stringify([
    ...current.filter((item) => item.id !== existing?.id),
    saved,
  ]))
  return saved
}

function mapServerCustomer(customer) {
  return { ...customer, id: String(customer._id ?? customer.id) }
}

export async function getCustomers(tenantKey, gremio) {
  if (isDemoMode()) return getRegisteredCustomers(tenantKey)
  if (!gremio) throw new Error('No se pudo identificar el gremio para consultar sus clientes.')
  const result = await apiRequest(`/api/customers/${encodeURIComponent(gremio)}`)
  return (result?.customers ?? []).map(mapServerCustomer)
}

export async function saveCustomer(tenantKey, gremio, customer) {
  if (isDemoMode()) return saveRegisteredCustomer(tenantKey, customer)
  if (!gremio) throw new Error('No se pudo identificar el gremio para guardar el cliente.')
  const result = await apiRequest(`/api/customers/${encodeURIComponent(gremio)}`, {
    method: 'POST',
    body: JSON.stringify(customer),
  })
  if (!result?.customer) throw new Error('El backend no confirmó el guardado del cliente.')
  return mapServerCustomer(result.customer)
}
