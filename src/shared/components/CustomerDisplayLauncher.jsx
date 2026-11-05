import { useEffect, useState } from 'react'
import { Monitor } from 'lucide-react'
import { detectExternalDisplay, openCustomerDisplay } from '../services/customerDisplay.js'
import { getPrinterConfig } from '../services/printers.js'

export function CustomerDisplayLauncher({ gremio }) {
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    let active = true
    setEnabled(false)
    setError('')
    getPrinterConfig(gremio)
      .then((config) => {
        if (active) setEnabled(config.segundaPantalla === true)
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudo consultar la configuración de pantalla.')
      })
    return () => { active = false }
  }, [gremio])

  async function launch() {
    setError('')
    setStatus('')
    let displayWindow
    let detectionPromise
    try {
      detectionPromise = detectExternalDisplay()
      displayWindow = openCustomerDisplay(gremio)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo abrir la pantalla del cliente.')
      return
    }

    try {
      const detection = await detectionPromise
      if (detection.screen) {
        const screen = detection.screen
        displayWindow.moveTo(screen.availLeft ?? screen.left ?? 0, screen.availTop ?? screen.top ?? 0)
        displayWindow.resizeTo(screen.availWidth ?? screen.width, screen.availHeight ?? screen.height)
        displayWindow.focus()
        setStatus('Monitor adicional detectado; se ubicó la pantalla del cliente allí.')
      } else if (detection.connected) {
        setStatus('Se detectó una pantalla adicional; el navegador abrió la pantalla del cliente en otra ventana.')
      } else if (detection.permissionDenied) {
        setStatus('No se autorizó detectar otros monitores. La pantalla del cliente quedó abierta en otra ventana.')
      } else {
        setStatus('No se detectó otro monitor. La pantalla del cliente quedó abierta en otra ventana o pestaña.')
      }
    } catch (cause) {
      setError(cause instanceof Error
        ? `La pantalla quedó abierta, pero no se pudo detectar o ubicar el monitor: ${cause.message}`
        : 'La pantalla quedó abierta, pero no se pudo detectar el monitor.')
    }
  }

  if (!enabled) return error ? <span role="status" className="text-xs text-rose-700">{error}</span> : null
  return <div className="flex flex-col items-start gap-1">
    <button type="button" onClick={() => void launch()} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-bold text-violet-800 hover:bg-violet-50"><Monitor className="h-4 w-4" />Pantalla del cliente</button>
    {(status || error) && <span role={error ? 'alert' : 'status'} className={`max-w-64 text-xs ${error ? 'text-rose-700' : 'text-zinc-500'}`}>{error || status}</span>}
  </div>
}
