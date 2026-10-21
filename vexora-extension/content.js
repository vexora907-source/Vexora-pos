const PAGE_SOURCE = 'vexora-pos-print'
const EXTENSION_SOURCE = 'vexora-print-extension'

window.addEventListener('message', (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return

  const request = event.data
  if (request?.source !== PAGE_SOURCE) return
  if (typeof request.requestId !== 'string' || request.requestId.length > 100) return

  if (request.type === 'print-ping') {
    window.postMessage({
      source: EXTENSION_SOURCE,
      type: 'print-ready',
      requestId: request.requestId,
    }, window.location.origin)
    return
  }
  if (request.type !== 'print-request') return

  browser.runtime.sendMessage({ type: 'VEXORA_PRINT', payload: request.payload })
    .then((response) => {
      window.postMessage({
        source: EXTENSION_SOURCE,
        type: 'print-result',
        requestId: request.requestId,
        response,
      }, window.location.origin)
    })
    .catch((error) => {
      window.postMessage({
        source: EXTENSION_SOURCE,
        type: 'print-result',
        requestId: request.requestId,
        response: { ok: false, error: error instanceof Error ? error.message : 'No se pudo contactar la extension.' },
      }, window.location.origin)
    })
})
