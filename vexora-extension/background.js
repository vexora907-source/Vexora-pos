const NATIVE_HOST = 'com.vexora.print'
const MAX_NATIVE_WAIT_MS = 20000

function sendToNativeHost(payload) {
  return new Promise((resolve) => {
    let settled = false
    let timeoutId
    let port

    const finish = (response) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      try {
        port?.disconnect()
      } catch {}
      resolve(response)
    }

    try {
      port = browser.runtime.connectNative(NATIVE_HOST)
      port.onMessage.addListener((response) => {
        finish(response && typeof response === 'object'
          ? response
          : { ok: false, error: 'El host devolvio una respuesta invalida.' })
      })
      port.onDisconnect.addListener(() => {
        const reason = port.error?.message || browser.runtime.lastError?.message
        finish({ ok: false, error: reason || 'El host de impresion se desconecto sin responder.' })
      })
      timeoutId = setTimeout(() => {
        finish({ ok: false, error: 'El host de impresion excedio el tiempo de espera.' })
      }, MAX_NATIVE_WAIT_MS)
      port.postMessage({ type: 'print', payload })
    } catch (error) {
      finish({ ok: false, error: error instanceof Error ? error.message : 'No se pudo iniciar el host de impresion.' })
    }
  })
}

browser.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'VEXORA_PRINT') return undefined
  return sendToNativeHost(message.payload)
})
