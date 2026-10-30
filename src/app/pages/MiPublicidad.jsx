import { useEffect, useState } from 'react'
import { ArrowLeft, Megaphone, RefreshCw } from 'lucide-react'
import { apiRequest } from '../../shared/services/api.js'
import { useTenantGremio } from '../../shared/hooks/useTenantGremio.js'
import { PRECIOS_PUBLICIDAD, TIPOS_PUBLICIDAD, VIGENCIA_PUBLICIDAD_DIAS } from '../../shared/services/preciosPublicidad.js'

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const statusLabels = {
  PENDING_PAYMENT: 'Pago pendiente',
  PAYMENT_DECLINED: 'Pago rechazado',
  PENDING_REVIEW: 'En revisión del CRM',
  APPROVED: 'Aprobado y activo',
  REJECTED: 'Rechazado',
  EXPIRED: 'Vencido',
}

export default function MiPublicidad() {
  const tenant = useTenantGremio()
  const [campaigns, setCampaigns] = useState([])
  const [freeAvailable, setFreeAvailable] = useState(false)
  const [type, setType] = useState('PROPIO_EXTRA')
  const [free, setFree] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [requestId, setRequestId] = useState(() => window.crypto.randomUUID())

  async function refresh() {
    if (tenant.isDemo) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const result = await apiRequest('/api/publicidad/me')
      setCampaigns(result.anuncios ?? [])
      setFreeAvailable(Boolean(result.espacioGratisDisponible))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo consultar la publicidad.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [tenant.isDemo])

  async function submit(event) {
    event.preventDefault()
    if (sending) return
    setSending(true)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest('/api/publicidad/requests', {
        method: 'POST',
        body: JSON.stringify({
          requestId,
          tipo: type,
          gratis: free,
          titulo: title,
          descripcion: description,
          imagenUrl: imageUrl,
          enlaceUrl: linkUrl,
        }),
      })
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl)
        return
      }
      setTitle('')
      setDescription('')
      setImageUrl('')
      setLinkUrl('')
      setFree(false)
      setRequestId(window.crypto.randomUUID())
      setNotice('Solicitud enviada. El CRM la revisará antes de publicarla.')
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo enviar la solicitud.')
    } finally {
      setSending(false)
    }
  }

  const price = free ? 0 : PRECIOS_PUBLICIDAD[type]
  const demo = tenant.isDemo

  return (
    <main className="mx-auto min-h-screen max-w-5xl bg-zinc-50 px-4 py-6 sm:px-6">
      <a href="/pos" className="inline-flex items-center gap-2 text-sm font-bold text-violet-700 hover:text-violet-900">
        <ArrowLeft size={16} />Volver al POS
      </a>
      <header className="mt-5 rounded-3xl bg-gradient-to-r from-violet-700 to-indigo-600 p-6 text-white sm:p-8">
        <div className="flex items-center gap-3"><Megaphone size={25} /><h1 className="text-2xl font-black">Mi publicidad</h1></div>
        <p className="mt-2 max-w-2xl text-sm text-violet-100">Publica una campaña en la pantalla de tu negocio o llega a más tiendas. Cada pago habilita 30 días de difusión; el CRM revisa la campaña antes de publicarla.</p>
      </header>

      {demo && <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">La cuenta demo permite explorar esta pantalla, pero no puede solicitar ni pagar publicidad.</p>}
      {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-black text-zinc-900">Crear campaña</h2>
            <p className="mt-1 text-sm text-zinc-500">Los precios son adicionales a tu plan POS y se cobran una sola vez por 30 días.</p>
          </div>
          <label className="block text-sm font-semibold text-zinc-700">Alcance
            <select value={type} onChange={(event) => { setType(event.target.value); setFree(false) }} className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5">
              {Object.entries(TIPOS_PUBLICIDAD).map(([key, label]) => <option key={key} value={key}>{label} · {money.format(PRECIOS_PUBLICIDAD[key])}</option>)}
            </select>
          </label>
          {freeAvailable && type === 'PROPIO_EXTRA' && (
            <label className="flex items-center gap-2 rounded-xl bg-violet-50 p-3 text-sm font-semibold text-violet-900">
              <input type="checkbox" checked={free} onChange={(event) => setFree(event.target.checked)} />
              Usar mi único espacio gratuito
            </label>
          )}
          <label className="block text-sm font-semibold text-zinc-700">Título
            <input value={title} onChange={(event) => setTitle(event.target.value)} minLength={2} maxLength={80} required className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5" placeholder="Ej. Descuento de temporada" />
          </label>
          <label className="block text-sm font-semibold text-zinc-700">Descripción
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} minLength={5} maxLength={300} required rows={3} className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5" placeholder="Cuéntales a tus clientes qué ofreces." />
          </label>
          <label className="block text-sm font-semibold text-zinc-700">URL de imagen (opcional)
            <input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} maxLength={2048} className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5" placeholder="https://…" />
          </label>
          <label className="block text-sm font-semibold text-zinc-700">Enlace de destino (opcional)
            <input type="url" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} maxLength={2048} className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5" placeholder="https://…" />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
            <p className="text-lg font-black text-violet-800">{free ? 'Gratis' : money.format(price)} <span className="text-xs font-medium text-zinc-500">· {VIGENCIA_PUBLICIDAD_DIAS} días</span></p>
            <button type="submit" disabled={demo || sending} className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-black text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50">
              {sending ? 'Enviando…' : free ? 'Solicitar espacio gratis' : 'Pagar con Wompi'}
            </button>
          </div>
        </form>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-lg font-black text-zinc-900">Mis campañas</h2><p className="mt-1 text-sm text-zinc-500">Solicitudes y anuncios activos.</p></div>
            <button type="button" onClick={() => void refresh()} disabled={loading || demo} aria-label="Actualizar campañas" className="rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
          </div>
          {loading ? <p className="mt-5 text-sm text-zinc-500">Cargando campañas…</p>
            : campaigns.length === 0 ? <p className="mt-5 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">Aún no tienes campañas.</p>
              : <ul className="mt-4 space-y-3">{campaigns.map((campaign) => (
                <li key={campaign._id} className="rounded-xl border border-zinc-200 p-4">
                  <div className="flex items-start justify-between gap-3"><strong className="text-sm text-zinc-900">{campaign.titulo}</strong><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${campaign.estado === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{statusLabels[campaign.estado] ?? campaign.estado}</span></div>
                  <p className="mt-2 text-xs text-zinc-600">{TIPOS_PUBLICIDAD[campaign.tipo] ?? campaign.tipo}</p>
                  <p className="mt-1 text-xs text-zinc-500">{campaign.gratis ? 'Espacio gratuito' : money.format(campaign.valor)}{campaign.venceEn ? ` · vence ${new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(campaign.venceEn))}` : ''}</p>
                  {campaign.motivoRechazo && <p className="mt-2 text-xs text-rose-700">Motivo: {campaign.motivoRechazo}</p>}
                </li>
              ))}</ul>}
        </section>
      </section>
    </main>
  )
}
