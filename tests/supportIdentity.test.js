import assert from 'node:assert/strict'
import test from 'node:test'

class MemoryStorage {
  values = new Map()

  getItem(key) {
    return this.values.get(key) ?? null
  }

  setItem(key, value) {
    this.values.set(key, String(value))
  }
}

const localStorage = new MemoryStorage()
globalThis.window = { localStorage }

const { getSupportIdentity } = await import('../src/shared/services/supportIdentity.js')

function tokenWithClaims(claims) {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `header.${payload}.signature`
}

test('recovers support identity from the authenticated token when cached tenant details are incomplete', () => {
  localStorage.setItem('vexora.accessToken', tokenWithClaims({
    sub: 'user-from-token',
    tenantId: 'tenant-from-token',
  }))
  localStorage.setItem('vexora.tenant', JSON.stringify({
    business: { name: 'Mi negocio' },
    user: { name: 'Usuario local' },
  }))

  assert.deepEqual(getSupportIdentity(), {
    tenantId: 'tenant-from-token',
    userId: 'user-from-token',
    senderName: 'Usuario local',
  })
})

test('uses complete cached identity when it is available', () => {
  localStorage.setItem('vexora.accessToken', tokenWithClaims({
    sub: 'token-user',
    tenantId: 'token-tenant',
  }))
  localStorage.setItem('vexora.tenant', JSON.stringify({
    id: 'cached-tenant',
    user: { id: 'cached-user', email: 'cashier@example.com' },
  }))

  assert.deepEqual(getSupportIdentity(), {
    tenantId: 'cached-tenant',
    userId: 'cached-user',
    senderName: 'cashier@example.com',
  })
})

test('asks the user to sign in again when neither cache nor token identifies the account', () => {
  localStorage.setItem('vexora.accessToken', 'invalid-token')
  localStorage.setItem('vexora.tenant', '{invalid json')

  assert.throws(getSupportIdentity, /Cierra sesión e inicia sesión de nuevo/)
})
