const EXTENSION_PROBE_TIMEOUT_MS = 300
const NATIVE_PRINT_TIMEOUT_MS = 21000
const PAGE_SOURCE = 'vexora-pos-print'
const EXTENSION_SOURCE = 'vexora-print-extension'

function sendBridgeMessage(type, responseType, payload = null, timeoutMs) {
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

  return new Promise((resolve) => {
    let timeoutId
    const finish = (value) => {
      clearTimeout(timeoutId)
      window.removeEventListener('message', onMessage)
      resolve(value)
    }
    const onMessage = (event) => {
      if (event.source !== window || event.origin !== window.location.origin) return
      const response = event.data
      if (response?.source !== EXTENSION_SOURCE || response.type !== responseType || response.requestId !== requestId) return
      finish(response)
    }

    window.addEventListener('message', onMessage)
    timeoutId = setTimeout(() => finish(null), timeoutMs)
    window.postMessage({ source: PAGE_SOURCE, type, requestId, payload }, window.location.origin)
  })
}

export function imprimirPosFirefox(target, ticket) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return Promise.resolve(false)
  if (!/Firefox\//.test(navigator.userAgent ?? '')) return Promise.resolve(false)
  if (!['caja', 'cocina'].includes(target)) return Promise.reject(new Error('El destino de impresión no es válido.'))

  return sendBridgeMessage('print-ping', 'print-ready', null, EXTENSION_PROBE_TIMEOUT_MS)
    .then((ready) => {
      if (!ready) return false
      return sendBridgeMessage('print-request', 'print-result', { target, ticket }, NATIVE_PRINT_TIMEOUT_MS)
        .then((response) => {
          if (!response) throw new Error('La extensión de impresión no respondió a tiempo.')
          if (response.response?.ok === true) return true
          throw new Error(response.response?.error || 'No se pudo imprimir con Vexora Print.')
        })
    })
}
