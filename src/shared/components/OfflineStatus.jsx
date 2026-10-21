import { useEffect, useState } from 'react'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../hooks/useOnlineStatus.js'
import { clearAuthToken } from '../services/auth.js'
import { clearTenant } from '../services/tenantStorage.js'
import { pendingSalesCount, subscribeOfflineQueue, synchronizePendingSales } from '../services/offlineSales.js'
import { apiRequest } from '../services/api.js'

export function OfflineStatus() {
  const isOnline = useOnlineStatus()
  const [pending, setPending] = useState(0)
  const [failure, setFailure] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let mounted = true
    const refresh = () => {
      void pendingSalesCount()
        .then((count) => { if (mounted) setPending(count) })
        .catch((error) => { if (mounted) setFailure(error.message) })
      if (navigator.onLine) {
        void synchronizePendingSales(apiRequest)
          .then((result) => {
            if (!mounted) return
            setPending(result.pending)
            setFailure(result.failure)
          })
          .catch((error) => {
            if (mounted) setFailure({ message: error instanceof Error ? error.message : 'No se pudieron sincronizar las ventas.' })
          })
      }
    }
    refresh()
    const unsubscribe = subscribeOfflineQueue(refresh)
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!isOnline) return
    let mounted = true
    setBusy(true)
    void synchronizePendingSales(apiRequest)
      .then((result) => {
        if (!mounted) return
        setPending(result.pending)
        setFailure(result.failure)
      })
      .catch((error) => {
        if (mounted) setFailure({ message: error instanceof Error ? error.message : 'No se pudieron sincronizar las ventas.' })
      })
      .finally(() => { if (mounted) setBusy(false) })
    return () => { mounted = false }
  }, [isOnline])

  async function retry() {
    setBusy(true)
    try {
      const result = await synchronizePendingSales(apiRequest, { retryFailed: true })
      setPending(result.pending)
      setFailure(result.failure)
    } catch (error) {
      setFailure({ message: error instanceof Error ? error.message : 'No se pudieron sincronizar las ventas.' })
    } finally {
      setBusy(false)
    }
  }

  function signInAgain() {
    clearAuthToken()
    clearTenant()
    window.location.assign('/login')
  }

  return (
    <section role="status" className={`mx-auto mt-3 flex max-w-[1500px] flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${isOnline ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-950'}`}>
      <p className="flex items-center gap-2">
        {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        {isOnline ? 'En línea' : 'Sin conexión: las ventas se guardan en este dispositivo'}
        {pending > 0 && ` · ${pending} venta(s) pendiente(s) de sincronizar`}
        {isOnline && pending === 0 && ' · Sin ventas pendientes'}
      </p>
      <div className="flex items-center gap-3">
        {failure?.status === 401 && <button type="button" onClick={signInAgain} className="underline">Inicia sesión para sincronizar</button>}
        {failure && failure.status !== 401 && <span className="font-normal">{failure.message}</span>}
        {pending > 0 && isOnline && <button type="button" disabled={busy} onClick={() => void retry()} className="inline-flex items-center gap-2 rounded-lg border border-current/20 px-3 py-1.5 disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />{failure && failure.status !== 401 ? 'Reintentar sincronización' : busy ? 'Sincronizando…' : 'Sincronizar ahora'}</button>}
      </div>
    </section>
  )
}
