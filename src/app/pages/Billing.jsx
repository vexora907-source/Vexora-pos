import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Check, CircleDot, Crown, RefreshCw, Sparkles, Users } from 'lucide-react'
import { useTenantGremio } from '../../shared/hooks/useTenantGremio.js'
import { apiRequest, API_URL } from '../../shared/services/api.js'
import { getAuthToken } from '../../shared/services/auth.js'
import { isDemoMode } from '../../shared/services/tenantStorage.js'
import { canonicalPlan, PLANS } from '../components/PricingCalculator.jsx'

const currency = (amount) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)
const invoiceStatuses = {
  PAID: { label: 'Pagada', className: 'bg-emerald-100 text-emerald-800' },
  PENDING: { label: 'Pendiente', className: 'bg-amber-100 text-amber-800' },
  VOID: { label: 'Anulada', className: 'bg-zinc-100 text-zinc-600' },
}
const CHECKOUT_SESSION_KEY = 'vexora.billing.checkout'
const features = {
  INICIO: ['1 gremio activo', '1 usuario / 1 sucursal', '300 productos', 'POS, modo offline y exportación a Excel', '0 facturas DIAN'],
  NEGOCIO: ['1 gremio potenciado', '3 usuarios / 1 sucursal', 'Productos ilimitados', 'Módulos profesionales y panel admin', '30 facturas DIAN al mes'],
  PRO: ['2 gremios simultáneos', '6 usuarios / 2 sucursales', 'Multi-caja y reportes consolidados', 'Ingredientes, domicilios y soporte prioritario', '100 facturas DIAN al mes'],
  VEXORA: ['3 a 5 gremios', '12 usuarios / sucursales ilimitadas', 'Marca blanca + API', 'Instalación presencial Yumbo/Cali', '250 facturas DIAN al mes'],
}

export default function Billing() {
  const tenant = useTenantGremio()
  const [currentPlan, setCurrentPlan] = useState(canonicalPlan(tenant.plan))
  const [message, setMessage] = useState('')
  const [busyPlan, setBusyPlan] = useState('')
  const [summary, setSummary] = useState(null)
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('plans')
  const [checkoutSession, setCheckoutSession] = useState(() => {
    try {
      return JSON.parse(window.sessionStorage.getItem(CHECKOUT_SESSION_KEY) ?? 'null')
    } catch {
      return null
    }
  })
  const demo = isDemoMode()
  const signedIn = Boolean(getAuthToken()) && !demo
  const latestInvoice = summary?.invoices?.find((invoice) => invoice.number === checkoutSession?.invoiceNumber)
    ?? summary?.invoices?.[0]
  const paymentApproved = latestInvoice?.status === 'PAID'

  const refreshSummary = useCallback(async () => {
    setRefreshing(true)
    try {
      const result = await apiRequest('/api/billing/me')
      setSummary(result)
      const plan = result.subscription?.plan ?? result.license?.plan
      if (plan) setCurrentPlan(canonicalPlan(plan))
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!signedIn || !API_URL) return
    refreshSummary()
      .catch((error) => setMessage(error.message))
  }, [refreshSummary, signedIn])

  async function updatePaymentStatus() {
    setMessage('')
    try {
      await refreshSummary()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo actualizar el estado del pago.')
    }
  }

  async function checkout(planId) {
    if (!signedIn) {
      setMessage('Inicia sesión para iniciar el proceso de pago de un plan.')
      return
    }
    setBusyPlan(planId)
    setMessage('')
    try {
      const result = await apiRequest('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: planId, billingCycle }),
      })
      if (!result.checkoutUrl) throw new Error('El backend no devolvió el enlace seguro de pago.')
      const session = {
        invoiceNumber: result.invoice?.number,
        plan: result.invoice?.plan ?? planId,
        startedAt: new Date().toISOString(),
      }
      window.sessionStorage.setItem(CHECKOUT_SESSION_KEY, JSON.stringify(session))
      setCheckoutSession(session)
      window.location.assign(result.checkoutUrl)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo iniciar el pago.')
      setBusyPlan('')
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-6 sm:p-10">
      <div className="mx-auto max-w-5xl">
        <a href={tenant.gremios.length ? '/pos' : '/'} className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500"><ArrowLeft className="h-4 w-4" />Volver</a>
        <div className="mt-8 flex items-center gap-3"><img src="/logo/logo-vexoraia.png" alt="Vexoraia" className="h-12 w-12 object-contain" /><span className="font-black">VEXORA POS</span></div>
        <p className="mt-7 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-vexora-600"><Sparkles className="h-4 w-4" />Planes VexoraIA</p>
        <h1 className="mt-2 text-4xl font-black">Un plan que encaja con tu operación</h1>
        <p className="mt-3 text-zinc-600">Tienes 15 días gratis. Después eliges un plan y decides si pagas mensual o anual. No activamos cobros automáticos.</p>
        <nav aria-label="Facturación" className="mt-6 flex flex-wrap gap-2 border-b border-zinc-200">
          <button type="button" aria-current={activeTab === 'plans' ? 'page' : undefined} onClick={() => setActiveTab('plans')} className={`rounded-t-xl px-4 py-3 text-sm font-bold ${activeTab === 'plans' ? 'border-b-2 border-vexora-600 bg-white text-vexora-700' : 'text-zinc-500 hover:bg-white'}`}>Planes y compra</button>
          <button type="button" aria-current={activeTab === 'process' ? 'page' : undefined} onClick={() => setActiveTab('process')} className={`inline-flex items-center gap-2 rounded-t-xl px-4 py-3 text-sm font-bold ${activeTab === 'process' ? 'border-b-2 border-vexora-600 bg-white text-vexora-700' : 'text-zinc-500 hover:bg-white'}`}><CircleDot className="h-4 w-4" />Proceso de pago</button>
        </nav>
        {activeTab === 'plans' && <>
        <div className="mt-5 flex items-center gap-3 text-sm"><span className={billingCycle === 'monthly' ? 'font-bold' : 'text-zinc-500'}>Mensual</span><button type="button" role="switch" aria-checked={billingCycle === 'annual'} aria-label="Cambiar ciclo de pago" onClick={() => setBillingCycle((cycle) => cycle === 'monthly' ? 'annual' : 'monthly')} className="h-8 w-14 rounded-full bg-zinc-900 p-1"><span className={`block h-6 w-6 rounded-full bg-white transition-transform ${billingCycle === 'annual' ? 'translate-x-6' : ''}`} /></button><span className={billingCycle === 'annual' ? 'font-bold' : 'text-zinc-500'}>Anual</span></div>
        {summary?.subscription?.billingCycle === 'trial' && <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Tu prueba gratuita está activa hasta {summary.subscription.nextBillingDate ? new Date(summary.subscription.nextBillingDate).toLocaleDateString('es-CO') : 'completar 15 días'}. No hay cobro automático.</p>}
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Object.values(PLANS).map((plan) => {
            const current = plan.id === currentPlan
            const allowed = tenant.gremios.length <= plan.maxGremios
            const price = billingCycle === 'annual' ? plan.annualPrice : plan.price
            return <section key={plan.id} className={`rounded-3xl border bg-white p-6 ${current ? 'border-vexora-500 ring-4 ring-vexora-100' : 'border-zinc-200'}`}>
              <div className="flex items-center justify-between"><h2 className="text-xl font-black">{plan.name}</h2>{plan.id === 'VEXORA' && <Crown className="h-5 w-5 text-amber-500" />}{current && <span className="rounded-full bg-vexora-100 px-2.5 py-1 text-xs font-bold text-vexora-700">Plan actual</span>}</div>
              <p className="mt-3 text-2xl font-black">{currency(price)}<span className="text-xs font-medium text-zinc-500">/{billingCycle === 'annual' ? 'año' : 'mes'}</span></p>
              {billingCycle === 'annual' && <p className="mt-1 text-xs text-zinc-500">Equivale a {currency(price / 12)} al mes</p>}
              <ul className="mt-5 space-y-3">{features[plan.id].map((feature) => <li key={feature} className="flex items-center gap-2 text-sm text-zinc-600"><Check className="h-4 w-4 text-emerald-600" />{feature}</li>)}</ul>
              {!allowed && <p className="mt-4 text-xs font-semibold text-amber-800">Tu negocio tiene más gremios de los permitidos en este plan.</p>}
              {!demo && <button type="button" disabled={!allowed || busyPlan !== ''} onClick={() => checkout(plan.id)} className="mt-5 w-full rounded-xl bg-vexora-600 px-4 py-3 font-bold text-white hover:bg-vexora-700 disabled:cursor-not-allowed disabled:opacity-50">{busyPlan === plan.id ? 'Conectando con pagos…' : current ? 'Pagar o renovar' : 'Elegir plan y pagar'}</button>}
            </section>
          })}
        </div>
        {message && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-800">{message}</p>}
        </>}
        {activeTab === 'process' && message && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-800">{message}</p>}
        {activeTab === 'process' && <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-widest text-vexora-600">Seguimiento de compra</p><h2 className="mt-1 text-2xl font-black">Proceso de pago de licencia</h2><p className="mt-2 max-w-2xl text-sm text-zinc-600">Consulta cada etapa desde la creación del checkout hasta la confirmación segura de Wompi y la activación de tu licencia.</p></div>
            <button type="button" disabled={!signedIn || refreshing} onClick={() => void updatePaymentStatus()} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-700 hover:border-vexora-500 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />{refreshing ? 'Consultando…' : 'Actualizar proceso'}</button>
          </div>
          {!signedIn ? <p role="status" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Inicia sesión con la cuenta propietaria para consultar y comprar una licencia.</p> : <>
            <ol className="mt-6 space-y-4">
              {[
                { title: 'Plan e invoice preparados', description: latestInvoice ? `${latestInvoice.number} · ${latestInvoice.plan} · ${currency(latestInvoice.amount)}` : 'Selecciona un plan en “Planes y compra” para crear una factura y un checkout.', complete: Boolean(latestInvoice) },
                { title: 'Pago en Wompi', description: latestInvoice?.status === 'PENDING' ? 'La factura está pendiente. Completa el pago en la página segura de Wompi y vuelve a esta pestaña.' : latestInvoice?.status === 'PAID' ? 'Wompi notificó un pago aprobado.' : latestInvoice?.status === 'VOID' ? 'La factura fue anulada. Inicia un nuevo checkout desde Planes y compra.' : 'Al elegir un plan, te enviaremos al checkout hospedado de Wompi.' , complete: paymentApproved, current: latestInvoice?.status === 'PENDING' },
                { title: 'Webhook y activación de licencia', description: paymentApproved ? `Pago confirmado; la licencia del plan ${latestInvoice.plan} está activada.` : 'El backend valida la firma, el importe y la moneda del webhook antes de activar la licencia. El retorno desde Wompi por sí solo no confirma el pago.', complete: paymentApproved, current: false },
              ].map((step, index) => <li key={step.title} className="flex gap-4">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black ${step.complete ? 'bg-emerald-100 text-emerald-800' : step.current ? 'bg-amber-100 text-amber-900' : 'bg-zinc-100 text-zinc-500'}`}>{step.complete ? <Check className="h-5 w-5" /> : index + 1}</span>
                <div className="min-w-0 flex-1 border-b border-zinc-100 pb-4"><h3 className="font-bold text-zinc-900">{step.title}{step.current && <span className="ml-2 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-900">En curso</span>}</h3><p className="mt-1 text-sm leading-6 text-zinc-600">{step.description}</p></div>
              </li>)}
            </ol>
            {latestInvoice && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-zinc-50 p-4 text-sm">
              <div><p className="font-bold">Última factura: {latestInvoice.number}</p><p className="mt-1 text-zinc-500">Creada {new Date(latestInvoice.createdAt).toLocaleString('es-CO')} · vence {new Date(latestInvoice.dueDate).toLocaleDateString('es-CO')}</p></div>
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${(invoiceStatuses[latestInvoice.status] ?? invoiceStatuses.PENDING).className}`}>{(invoiceStatuses[latestInvoice.status] ?? invoiceStatuses.PENDING).label}</span>
            </div>}
          </>}
        </section>}
        {activeTab === 'plans' && <>
        {signedIn && <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black">Estado de tus pagos</h2>
              <p className="mt-1 text-sm text-zinc-500">La licencia se activa cuando el backend confirma el pago recibido de Wompi.</p>
            </div>
            <button type="button" disabled={refreshing} onClick={() => void updatePaymentStatus()} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-700 hover:border-vexora-500 disabled:cursor-wait disabled:opacity-50">
              {refreshing ? 'Actualizando…' : 'Actualizar estado'}
            </button>
          </div>
          {summary?.invoices?.length ? <ul className="mt-4 divide-y divide-zinc-100">
            {summary.invoices.map((invoice) => {
              const status = invoiceStatuses[invoice.status] ?? invoiceStatuses.PENDING
              return <li key={invoice._id ?? invoice.number} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-semibold text-zinc-800">{invoice.number} · Plan {invoice.plan}</p>
                  <p className="mt-1 text-zinc-500">{new Date(invoice.createdAt).toLocaleDateString('es-CO')} · {currency(invoice.amount)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
              </li>
            })}
          </ul> : <p className="mt-4 text-sm text-zinc-500">{refreshing ? 'Consultando facturas…' : 'Todavía no tienes facturas de pago.'}</p>}
          {summary?.invoices?.some((invoice) => invoice.status === 'PENDING') && <p className="mt-3 text-xs text-zinc-500">Si acabas de pagar, espera la notificación de Wompi y vuelve a actualizar. El retorno al sitio no confirma el pago.</p>}
        </section>}
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="font-black">Configuración actual</h2>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-600"><span className="flex items-center gap-2"><Users className="h-4 w-4" />Gremios: {tenant.gremios.join(', ') || 'ninguno'}</span><span>DIAN: {tenant.dian?.enabled ? `activada para ${tenant.dian.nit ?? 'NIT pendiente'}` : 'desactivada'}</span>{summary?.subscription && <span>Suscripción: {summary.subscription.status}</span>}</div>
          <a href="/configuracion" className="mt-5 inline-flex rounded-xl bg-zinc-900 px-5 py-3 font-bold text-white hover:bg-zinc-800">Configurar mi negocio</a>
          {tenant.user?.role === 'OWNER' || tenant.user?.role === 'SUPER_ADMIN' ? <a href="/admin" className="ml-3 mt-5 inline-flex rounded-xl border border-zinc-200 px-5 py-3 font-bold hover:border-vexora-500">Panel administrativo</a> : null}
        </section>
        {demo && <p className="mt-4 text-sm text-zinc-500">La cuenta demo es temporal; no se guardan cambios ni se realizan cobros.</p>}
        </>}
      </div>
    </main>
  )
}
