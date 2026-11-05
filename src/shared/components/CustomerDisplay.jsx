import { useEffect, useState } from 'react'
import { Megaphone, Monitor, ShoppingBag } from 'lucide-react'
import { apiRequest } from '../services/api.js'
import { formatCOP } from '../services/ticket.js'
import { getPrinterConfig } from '../services/printers.js'
import { subscribeToCustomerDisplay } from '../services/customerDisplay.js'
import { isDemoMode, readTenant } from '../services/tenantStorage.js'

const AD_REFRESH_MS = 5 * 60_000
const AD_ROTATE_MS = 10_000
const RECEIPT_DISPLAY_MS = 45_000

function customerDisplayTenant() {
  return readTenant()
}

export default function CustomerDisplay({ gremio, sourceId }) {
  const [configState, setConfigState] = useState({ loading: true, enabled: false, error: '' })
  const [sale, setSale] = useState(null)
  const [ads, setAds] = useState([])
  const [adIndex, setAdIndex] = useState(0)
  const [adError, setAdError] = useState('')

  useEffect(() => {
    let active = true
    setConfigState({ loading: true, enabled: false, error: '' })
    getPrinterConfig(gremio)
      .then((config) => {
        if (active) setConfigState({ loading: false, enabled: config.segundaPantalla === true, error: '' })
      })
      .catch((cause) => {
        if (active) setConfigState({
          loading: false,
          enabled: false,
          error: cause instanceof Error ? cause.message : 'No se pudo validar la configuración de la pantalla.',
        })
      })
    return () => { active = false }
  }, [gremio])

  useEffect(() => {
    if (configState.loading || !configState.enabled || !sourceId) return undefined
    return subscribeToCustomerDisplay(customerDisplayTenant(), sourceId, (payload) => {
      const isExpiredReceipt = payload.status === 'receipt' && Date.now() - payload.updatedAt >= RECEIPT_DISPLAY_MS
      setSale(isExpiredReceipt ? null : payload)
    })
  }, [configState.enabled, configState.loading, sourceId])

  useEffect(() => {
    if (!configState.enabled || isDemoMode()) return undefined
    let active = true
    const loadAds = async () => {
      try {
        const result = await apiRequest('/api/publicidad/feed')
        if (active) {
          setAds(Array.isArray(result?.anuncios) ? result.anuncios : [])
          setAdError('')
        }
      } catch (cause) {
        if (active) setAdError(cause instanceof Error ? cause.message : 'No se pudieron cargar los anuncios aprobados.')
      }
    }
    void loadAds()
    const intervalId = window.setInterval(() => void loadAds(), AD_REFRESH_MS)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [configState.enabled])

  useEffect(() => {
    const onSessionChange = (event) => {
      if (event.key !== 'vexora.tenant' && event.key !== 'vexora.accessToken') return
      setSale(null)
      setAds([])
      setConfigState({
        loading: false,
        enabled: false,
        error: 'La sesión del punto de venta terminó. Inicia sesión de nuevo para reactivar esta pantalla.',
      })
    }
    window.addEventListener('storage', onSessionChange)
    return () => window.removeEventListener('storage', onSessionChange)
  }, [])

  useEffect(() => {
    if (ads.length < 2) {
      setAdIndex(0)
      return undefined
    }
    const intervalId = window.setInterval(() => setAdIndex((index) => (index + 1) % ads.length), AD_ROTATE_MS)
    return () => window.clearInterval(intervalId)
  }, [ads.length])

  useEffect(() => {
    if (sale?.status !== 'receipt') return undefined
    const timeoutId = window.setTimeout(() => setSale((current) => current?.status === 'receipt' ? null : current), RECEIPT_DISPLAY_MS)
    return () => window.clearTimeout(timeoutId)
  }, [sale])

  const isPurchase = sale?.status === 'purchase' && sale.items?.length > 0
  const isReceipt = sale?.status === 'receipt' && sale.items?.length > 0
  const ad = ads.length ? ads[adIndex % ads.length] : null

  if (configState.loading) {
    return <main className="grid min-h-screen place-items-center bg-slate-950 text-white"><p role="status">Conectando la pantalla del cliente…</p></main>
  }
  if (!configState.enabled) {
    return <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-center text-white"><section className="max-w-xl"><Monitor className="mx-auto h-12 w-12 text-violet-300" /><h1 className="mt-4 text-2xl font-black">Pantalla para clientes no habilitada</h1><p className="mt-2 text-sm text-slate-300">{configState.error || 'Activa esta opción en Configuración → Impresoras y hardware y vuelve a abrir esta pantalla.'}</p></section></main>
  }

  if (!isPurchase && !isReceipt) {
    return <main className="grid min-h-screen place-items-center overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 p-6 text-white">
      {ad ? <section key={ad.id} className="w-full max-w-5xl text-center">
        <p className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-[0.3em] text-violet-200"><Megaphone className="h-5 w-5" />Publicidad aprobada · {ad.cliente}</p>
        {ad.imagenUrl && <img src={ad.imagenUrl} alt="" className="mx-auto mt-8 max-h-[50vh] max-w-full rounded-3xl object-contain shadow-2xl" />}
        <h1 className="mt-8 text-4xl font-black sm:text-6xl">{ad.titulo}</h1>
        <p className="mx-auto mt-4 max-w-3xl text-xl text-slate-200 sm:text-2xl">{ad.descripcion}</p>
        {ad.enlaceUrl && <p className="mt-6 break-all text-sm text-violet-200">{ad.enlaceUrl}</p>}
      </section> : <section className="text-center">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-violet-200">Bienvenido</p>
        <h1 className="mt-4 text-4xl font-black sm:text-6xl">Gracias por visitarnos</h1>
        <p className="mt-4 text-lg text-slate-200">Aquí verás los detalles de tu compra.</p>
        {adError && <p role="status" className="mt-5 text-sm text-slate-400">No se pudo actualizar la publicidad: {adError}</p>}
      </section>}
    </main>
  }

  return <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-10 sm:py-12">
    <div className="mx-auto max-w-5xl">
      <header className="flex items-center gap-4 border-b border-white/15 pb-6">
        <ShoppingBag className="h-9 w-9 text-violet-300" />
        <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-200">{isReceipt ? 'Compra registrada' : 'Tu compra'}</p><h1 className="mt-1 text-3xl font-black sm:text-4xl">{isReceipt ? `Gracias${sale.customerName ? `, ${sale.customerName}` : ''}` : 'Revisa tus productos'}</h1></div>
      </header>
      <section className="mt-8 divide-y divide-white/10">
        {sale.items.map((item, index) => <article key={`${item.name}-${index}`} className="flex items-center justify-between gap-5 py-5">
          <div className="min-w-0"><p className="break-words text-lg font-bold sm:text-2xl">{item.quantity} × {item.name}</p>{item.note && <p className="mt-1 text-sm text-slate-300">{item.note}</p>}<p className="mt-1 text-sm text-slate-300">{formatCOP(item.price)} c/u</p></div>
          <p className="shrink-0 text-lg font-black tabular-nums sm:text-2xl">{formatCOP(item.total)}</p>
        </article>)}
      </section>
      <footer className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-white/20 pt-6">
        <div>{sale.paymentMethod && <p className="text-sm text-slate-300">Pago: <span className="font-bold text-white">{sale.paymentMethod}</span></p>}
          {isReceipt && <p className="mt-2 text-sm text-violet-200">¡Gracias por tu compra!</p>}
        </div>
        <p className="text-right"><span className="block text-xs font-bold uppercase tracking-widest text-slate-300">Total</span><span className="text-4xl font-black tabular-nums sm:text-5xl">{formatCOP(sale.total)}</span></p>
      </footer>
    </div>
  </main>
}
