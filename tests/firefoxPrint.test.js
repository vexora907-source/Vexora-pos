import assert from 'node:assert/strict'
import test from 'node:test'

let responseToSend = { ok: true }
let extensionAvailable = true
let responseDelayMs = 0
let userAgent = 'Mozilla/5.0 Firefox/128.0'
let webUsbRequests = 0
let systemPrintCalls = 0
const listeners = new Set()
const bodyClasses = new Set()

globalThis.window = {
  location: { origin: 'http://localhost:5173' },
  sessionStorage: { getItem: (key) => key === 'vexora.demoMode' ? 'true' : null },
  localStorage: { getItem: () => null },
  print() {
    systemPrintCalls += 1
    for (const listener of listeners) listener({ type: 'afterprint' })
  },
  addEventListener: (_name, listener) => listeners.add(listener),
  removeEventListener: (_name, listener) => listeners.delete(listener),
  postMessage(message, targetOrigin) {
    assert.equal(targetOrigin, window.location.origin)
    if (message.type === 'print-ping') {
      if (!extensionAvailable) return
      queueMicrotask(() => {
        for (const listener of listeners) {
          listener({
            source: window,
            origin: targetOrigin,
            data: { source: 'vexora-print-extension', type: 'print-ready', requestId: message.requestId },
          })
        }
      })
      return
    }
    if (message.type !== 'print-request') return
    setTimeout(() => {
      for (const listener of listeners) {
        listener({
          source: window,
          origin: targetOrigin,
          data: {
            source: 'vexora-print-extension',
            type: 'print-result',
            requestId: message.requestId,
            response: responseToSend,
          },
        })
      }
    }, responseDelayMs)
  },
}
Object.defineProperty(globalThis, 'navigator', {
  value: {
    get userAgent() { return userAgent },
    usb: {
      getDevices: async () => [],
      requestDevice: async () => {
        webUsbRequests += 1
        throw new Error('WebUSB request intercepted by the routing test')
      },
    },
  },
  configurable: true,
})
globalThis.document = {
  createElement: () => ({
    className: '',
    setAttribute() {},
    remove() {},
    classList: { add() {}, remove() {} },
  }),
  body: {
    append() {},
    classList: {
      add: (name) => bodyClasses.add(name),
      remove: (name) => bodyClasses.delete(name),
    },
  },
}

const { imprimirPosFirefox } = await import('../src/shared/services/firefoxPrint.js')
const { isFirefoxDesktop, printReceipt } = await import('../src/shared/services/printers.js')

test('identifies Firefox separately from Chrome and Edge', () => {
  assert.equal(isFirefoxDesktop('Mozilla/5.0 Firefox/128.0'), true)
  assert.equal(isFirefoxDesktop('Mozilla/5.0 Chrome/128.0 Safari/537.36'), false)
  assert.equal(isFirefoxDesktop('Mozilla/5.0 Edg/128.0'), false)
})

test('sends Firefox print requests and resolves successful host responses', async () => {
  extensionAvailable = true
  responseDelayMs = 0
  responseToSend = { ok: true }
  assert.equal(await imprimirPosFirefox('caja', { numero: 'T-1' }), true)
  assert.equal(listeners.size, 0)
})

test('surfaces Native Messaging host errors to the caller', async () => {
  extensionAvailable = true
  responseDelayMs = 0
  responseToSend = { ok: false, error: 'No hay impresora USB.' }
  await assert.rejects(imprimirPosFirefox('cocina', {}), /No hay impresora USB/)
  assert.equal(listeners.size, 0)
})

test('routes Firefox receipt printing through the native extension', async () => {
  userAgent = 'Mozilla/5.0 Firefox/128.0'
  extensionAvailable = true
  responseDelayMs = 0
  responseToSend = { ok: true }
  webUsbRequests = 0
  await printReceipt('papeleria', { numero: 'T-2', productos: [], total: 1500 })
  assert.equal(webUsbRequests, 0)
  assert.equal(listeners.size, 0)
})

test('falls back to the system print dialog when Chrome WebUSB fails manually', async () => {
  userAgent = 'Mozilla/5.0 Chrome/128.0 Safari/537.36'
  webUsbRequests = 0
  systemPrintCalls = 0
  assert.equal(await printReceipt('papeleria', { numero: 'T-3', productos: [], total: 1500 }), 'system')
  assert.equal(webUsbRequests, 1)
  assert.equal(systemPrintCalls, 1)
  assert.equal(listeners.size, 0)
})

test('does not open a system print dialog after automatic Chrome printing fails', async () => {
  userAgent = 'Mozilla/5.0 Chrome/128.0 Safari/537.36'
  systemPrintCalls = 0
  await assert.rejects(
    printReceipt('papeleria', { numero: 'T-4', productos: [], total: 1500 }, { requestDevice: false }),
    /No hay una impresora USB autorizada/,
  )
  assert.equal(systemPrintCalls, 0)
  assert.equal(listeners.size, 0)
})

test('returns to system print when the Firefox extension is not loaded', async () => {
  userAgent = 'Mozilla/5.0 Firefox/128.0'
  extensionAvailable = false
  responseDelayMs = 0
  assert.equal(await imprimirPosFirefox('caja', {}), false)
  assert.equal(listeners.size, 0)
})

test('waits for a slow Native Host instead of opening a competing system print', async () => {
  userAgent = 'Mozilla/5.0 Firefox/128.0'
  extensionAvailable = true
  responseDelayMs = 1300
  responseToSend = { ok: true }
  assert.equal(await imprimirPosFirefox('caja', { numero: 'SLOW-1' }), true)
  assert.equal(listeners.size, 0)
  responseDelayMs = 0
})
