import assert from 'node:assert/strict'
import test, { beforeEach } from 'node:test'

class MemoryStorage {
  values = new Map()

  get length() {
    return this.values.size
  }

  key(index) {
    return [...this.values.keys()][index] ?? null
  }

  getItem(key) {
    return this.values.get(key) ?? null
  }

  setItem(key, value) {
    this.values.set(key, String(value))
  }

  removeItem(key) {
    this.values.delete(key)
  }
}

const localStorage = new MemoryStorage()
const sessionStorage = new MemoryStorage()
globalThis.window = { localStorage, sessionStorage }

const { appStorage, clearTenant, isDemoMode, readTenant, saveTenant, startDemoMode, stopDemoMode } = await import('../src/shared/services/tenantStorage.js')

beforeEach(() => {
  localStorage.values.clear()
  sessionStorage.values.clear()
})

test('demo workspace is isolated from a persisted test account and clears its token', () => {
  localStorage.setItem('vexora.tenant', JSON.stringify({ business: { email: 'test@company.com' }, user: { id: 'test-user' } }))
  localStorage.setItem('vexora.accessToken', 'test-token')

  startDemoMode()
  saveTenant({ isDemo: true, business: { email: 'demo@vexora.local' }, gremios: ['papeleria'] })

  assert.equal(isDemoMode(), true)
  assert.equal(appStorage(), sessionStorage)
  assert.equal(localStorage.getItem('vexora.accessToken'), null)
  assert.equal(JSON.parse(localStorage.getItem('vexora.tenant')).user.id, 'test-user')

  stopDemoMode()
  assert.equal(isDemoMode(), false)
  assert.equal(JSON.parse(readTenant() ? localStorage.getItem('vexora.tenant') : 'null').user.id, 'test-user')
  assert.equal(sessionStorage.getItem('vexora.tenant'), null)
})

test('clears tenant identity before switching business accounts', () => {
  saveTenant({
    id: 'tenant-a',
    business: { name: 'Negocio A', logo: 'https://example.test/a.png' },
    user: { id: 'user-a', role: 'ADMIN' },
    gremios: ['tienda'],
  })

  clearTenant()
  saveTenant({
    id: 'tenant-b',
    business: { name: 'Negocio B' },
    user: { id: 'user-b', role: 'CAJERO' },
    gremios: ['ropa'],
  })

  const tenant = readTenant()
  assert.equal(tenant.id, 'tenant-b')
  assert.equal(tenant.user.role, 'CAJERO')
  assert.deepEqual(tenant.gremios, ['ropa'])
  assert.equal(tenant.business.logo, undefined)
})