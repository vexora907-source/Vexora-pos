import assert from 'node:assert/strict'
import test from 'node:test'

let responseToSend = { ok: true }
let extensionAvailable = true
let responseDelayMs = 0
const listeners = new Set()

globalThis.window = {
  location: { origin: 'http://localhost:5173' },
  sessionStorage: { getItem: (key) => key === 'vexora.demoMode' ? 'true' : null },
  localStorage: { getItem: () => null },
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
  value: { userAgent: 'Mozilla/5.0 Firefox/128.0' },
  configurable: true,
})

const { imprimirPosFirefox } = await import('../src/shared/services/firefoxPrint.js')
const { printReceipt } = await import('../src/shared/services/printers.js')

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
  extensionAvailable = true
  responseDelayMs = 0
  responseToSend = { ok: true }
  await printReceipt('papeleria', { numero: 'T-2', productos: [], total: 1500 })
  assert.equal(listeners.size, 0)
})

test('returns to system print when the Firefox extension is not loaded', async () => {
  extensionAvailable = false
  responseDelayMs = 0
  assert.equal(await imprimirPosFirefox('caja', {}), false)
  assert.equal(listeners.size, 0)
})

test('waits for a slow Native Host instead of opening a competing system print', async () => {
  extensionAvailable = true
  responseDelayMs = 1300
  responseToSend = { ok: true }
  assert.equal(await imprimirPosFirefox('caja', { numero: 'SLOW-1' }), true)
  assert.equal(listeners.size, 0)
  responseDelayMs = 0
})
