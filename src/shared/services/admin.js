import { apiRequest } from './api.js'

export function sanitizeBusinessConfig(config) {
  if (!Array.isArray(config?.pagos)) return config
  return {
    ...config,
    pagos: config.pagos.map((payment) => {
      const sanitizedPayment = { ...payment }
      delete sanitizedPayment._id
      return sanitizedPayment
    }),
  }
}

export function getBusinessConfig(gremio) {
  return apiRequest(`/api/admin/config/${encodeURIComponent(gremio)}`)
}

export function saveBusinessConfig(gremio, config) {
  return apiRequest(`/api/admin/config/${encodeURIComponent(gremio)}`, {
    method: 'PUT',
    body: JSON.stringify(sanitizeBusinessConfig(config)),
  })
}

export function getAdminUsers() {
  return apiRequest('/api/admin/users')
}

export function createAdminUser(input) {
  return apiRequest('/api/admin/users', { method: 'POST', body: JSON.stringify(input) })
}

export function updateAdminUser(userId, input) {
  return apiRequest(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function createBranch(input) {
  return apiRequest('/api/admin/branches', { method: 'POST', body: JSON.stringify(input) })
}

export function getAdminActivity() {
  return apiRequest('/api/admin/activity')
}

export function getSalesReport(from, to) {
  const params = new URLSearchParams({ from, to })
  return apiRequest(`/api/admin/sales?${params}`)
}

export function getInventoryReport(gremio) {
  return apiRequest(`/api/admin/inventory/${encodeURIComponent(gremio)}/report`)
}

export function getAccountingReport(from, to) {
  const params = new URLSearchParams({ from, to })
  return apiRequest(`/api/admin/accounting?${params}`)
}

export function createExpense(input) {
  return apiRequest('/api/admin/expenses', { method: 'POST', body: JSON.stringify(input) })
}

export function getAdminLicenses() {
  return apiRequest('/api/admin/licenses')
}

export function assignTenantGremios(tenantId, gremios) {
  return apiRequest(`/api/admin/tenants/${encodeURIComponent(tenantId)}/gremios`, {
    method: 'PUT',
    body: JSON.stringify({ gremios }),
  })
}
