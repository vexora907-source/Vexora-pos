import { appStorage } from './tenantStorage.js'

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
  const documentNumber = String(customer.documentNumber ?? '').replace(/\D/g, '')
  if (!documentNumber || !customer.name?.trim()) {
    throw new Error('El nombre y el número de documento del cliente son obligatorios.')
  }
  if (current.some((item) => item.documentNumber === documentNumber)) {
    throw new Error('Ya existe un cliente registrado con ese documento.')
  }
  const saved = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    documentType: customer.documentType,
    documentNumber,
    name: customer.name.trim(),
    phone: customer.phone.trim(),
    email: customer.email.trim(),
  }
  appStorage().setItem(storageKey(tenantKey), JSON.stringify([...current, saved]))
  return saved
}
