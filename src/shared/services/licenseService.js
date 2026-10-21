import { API_URL, apiRequest } from './api.js'
import { getAuthToken } from './auth.js'
import { cacheLicenseStatus, readCachedLicenseStatus } from './offlineDB.js'
import { isDemoMode } from './tenantStorage.js'

function safeLower(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function normalizeLicenseSummary(raw = null) {
  if (!raw || typeof raw !== 'object') return null

  const subscription = raw.subscription && typeof raw.subscription === 'object' ? raw.subscription : {}
  const license = raw.license && typeof raw.license === 'object' ? raw.license : {}
  const merged = { ...raw, ...subscription, ...license }

  const statusValue = safeLower(merged.status ?? subscription.status ?? license.status ?? 'active')
  const active = merged.active ?? license.active ?? subscription.active ?? ![ 'expired', 'inactive', 'blocked', 'cancelled', 'canceled' ].includes(statusValue)
  const blocked = Boolean(merged.blocked ?? license.blocked ?? subscription.blocked ?? false)
  const autoRenew = Boolean(merged.autoRenew ?? merged.auto_renew ?? merged.billingAutoRenew ?? license.autoRenew ?? subscription.autoRenew ?? false)

  return {
    ...merged,
    plan: merged.plan ?? subscription.plan ?? license.plan ?? 'INICIO',
    status: statusValue === 'trial' ? 'trial' : statusValue === 'blocked' ? 'blocked' : statusValue === 'expired' ? 'expired' : statusValue === 'inactive' ? 'inactive' : statusValue === 'cancelled' || statusValue === 'canceled' ? 'cancelled' : active ? 'active' : 'inactive',
    active: Boolean(active) && !blocked,
    blocked,
    autoRenew,
    startedAt: merged.startedAt ?? merged.started_at ?? merged.createdAt ?? merged.validFrom ?? merged.valid_from ?? subscription.startedAt ?? license.startedAt ?? null,
    validUntil: merged.validUntil ?? merged.valid_until ?? merged.expiresAt ?? merged.expires_at ?? merged.nextBillingDate ?? merged.next_billing_date ?? subscription.validUntil ?? subscription.nextBillingDate ?? license.validUntil ?? null,
    nextBillingDate: merged.nextBillingDate ?? merged.next_billing_date ?? merged.validUntil ?? merged.valid_until ?? merged.expiresAt ?? merged.expires_at ?? subscription.nextBillingDate ?? license.validUntil ?? null,
  }
}

export async function fetchLicenseSummary() {
  if (isDemoMode() || !API_URL || !getAuthToken()) return null

  const endpoints = ['/api/billing/me', '/api/license/me']
  let lastError = null
  for (const endpoint of endpoints) {
    try {
      const result = await apiRequest(endpoint)
      const summary = normalizeLicenseSummary(result)
      if (summary) {
        await cacheLicenseStatus(summary)
        return summary
      }
    } catch (error) {
      lastError = error
    }
  }

  if (lastError) throw lastError
  return null
}

export async function updateAutoRenew(enabled) {
  if (isDemoMode()) {
    return { autoRenew: Boolean(enabled), status: 'demo', active: true }
  }

  const payload = { autoRenew: Boolean(enabled) }
  const candidates = [
    { path: '/api/billing/auto-renew', methods: ['PATCH', 'PUT', 'POST'] },
    { path: '/api/license/auto-renew', methods: ['PATCH', 'PUT', 'POST'] },
  ]

  let lastError = null
  for (const candidate of candidates) {
    for (const method of candidate.methods) {
      try {
        const result = await apiRequest(candidate.path, {
          method,
          body: JSON.stringify(payload),
        })
        return normalizeLicenseSummary(result) ?? { ...payload, status: 'updated' }
      } catch (error) {
        lastError = error
        if (error?.status === 404 || error?.status === 405) continue
      }
    }
  }

  if (lastError) throw lastError
  return { ...payload, status: 'updated' }
}

export async function fetchLicenseStatus() {
  return fetchLicenseSummary()
}

export function getCachedLicenseStatus() {
  if (isDemoMode()) return Promise.resolve(null)
  return readCachedLicenseStatus()
}
