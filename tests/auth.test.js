import test from 'node:test'
import assert from 'node:assert/strict'

const localStorage = new Map()
const sessionStorage = new Map()

globalThis.window = {
  localStorage: {
    getItem: (key) => localStorage.get(key) ?? null,
    setItem: (key, value) => localStorage.set(key, value),
    removeItem: (key) => localStorage.delete(key),
    key: (index) => Array.from(localStorage.keys())[index] ?? null,
    length: 0,
  },
  sessionStorage: {
    getItem: (key) => sessionStorage.get(key) ?? null,
    setItem: (key, value) => sessionStorage.set(key, value),
    removeItem: (key) => sessionStorage.delete(key),
    key: (index) => Array.from(sessionStorage.keys())[index] ?? null,
    length: 0,
  },
  dispatchEvent: () => true,
}
Object.defineProperty(globalThis.window.localStorage, 'length', {
  get: () => localStorage.size,
  configurable: true,
})
Object.defineProperty(globalThis.window.sessionStorage, 'length', {
  get: () => sessionStorage.size,
  configurable: true,
})

const { register, requestPasswordReset } = await import('../src/shared/services/auth.js')
const { isDemoMode, startDemoMode } = await import('../src/shared/services/tenantStorage.js')
const { normalizeLicenseSummary } = await import('../src/shared/services/licenseService.js')

test('normalizes license metadata and auto-renew status for the client', () => {
  const summary = normalizeLicenseSummary({
    plan: 'PRO',
    status: 'active',
    active: true,
    autoRenew: true,
    startedAt: '2026-10-01T10:00:00.000Z',
    validUntil: '2026-10-31T23:59:00.000Z',
  })

  assert.equal(summary.plan, 'PRO')
  assert.equal(summary.status, 'active')
  assert.equal(summary.autoRenew, true)
  assert.equal(summary.validUntil, '2026-10-31T23:59:00.000Z')
})

test('register rejects duplicate email before contacting the backend', async () => {
  localStorage.clear()
  sessionStorage.clear()
  localStorage.set('vexora.tenant', JSON.stringify({
    business: { email: 'demo@empresa.com' },
    user: { name: 'Demo' },
  }))

  await assert.rejects(
    register({
      name: 'Negocio',
      ownerName: 'Admin',
      email: ' DEMO@empresa.com ',
      phone: '3001234567',
      address: 'Calle 1',
      password: '1234567890',
      gremios: ['papeleria'],
    }),
    /Ya existe una cuenta con este correo\. Inicia sesión o usa otro correo\./,
  )
})

test('leaves demo mode before requesting a password reset', async () => {
  localStorage.clear()
  sessionStorage.clear()
  startDemoMode()

  await assert.rejects(requestPasswordReset('owner@example.com'), /servicio no está disponible/i)
  assert.equal(isDemoMode(), false)
})
