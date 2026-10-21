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

const { appStorage, isDemoMode, readTenant, saveTenant, startDemoMode, stopDemoMode } = await import('../src/shared/services/tenantStorage.js')

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