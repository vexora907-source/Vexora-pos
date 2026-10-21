import { useEffect, useState } from 'react'
import { ArrowLeft, Building2, CalendarClock, CircleDollarSign, Cpu, FileText, KeyRound, LockKeyhole, QrCode, Save, Wallet } from 'lucide-react'
import { getBusinessConfig, saveBusinessConfig } from '../../shared/services/admin.js'
import { API_URL } from '../../shared/services/api.js'
import { printPrinterTest } from '../../shared/services/printers.js'
import { getAuthToken } from '../../shared/services/auth.js'
import { appStorage, isDemoMode, readTenant } from '../../shared/services/tenantStorage.js'
import { fetchLicenseSummary, updateAutoRenew } from '../../shared/services/licenseService.js'
import { TutorialGremio } from '../components/TutorialGremio.jsx'

const STORAGE_KEY = 'vexora.business.config'
const DENOMINATIONS = [1000, 2000, 5000, 10000, 20000, 50000, 100000]
const DEFAULT_CONFIG = {
  negocio: { nombre: '', razonSocial: '', nit: '', logo: '', direccion: '', telefono: '', mensajeTicket: '¡Gracias por tu compra!' },
  caja: { baseDefault: 100000, moneda: 'COP', permitirPropinas: false, permitirFiado: false, denominacionesActivas: DENOMINATIONS },
  hardware: {
    impresora: '80mm',
    imprimirAutomaticamente: false,
    abrirCajon: false,
    lectorCodigo: 'USB',
    segundaPantalla: false,
    impresoraCaja: { tipo: 'usb', ip: '', imprimirAutomaticamente: false },
    impresoraCocina: { tipo: 'red', ip: '', imprimirAutomaticamente: false },
  },
  impuestos: { iva: 0, prefijoFactura: '' },
  ticket: { tipoCodigo: 'QR' },
  pagos: [
    { nombre: 'Efectivo', activo: true, comision: 0 },
    { nombre: 'Nequi', activo: true, comision: 0 },
    { nombre: 'Bancolombia', activo: true, comision: 0 },
    { nombre: 'Tarjeta', activo: true, comision: 3 },
    { nombre: 'Crédito', activo: false, comision: 0 },
  ],
  seguridad: { cajeroPuedeAnular: false, verCierresAjenos: false, cierreSesionMinutos: 15 },
}
const TABS = [
  { id: 'negocio', label: 'Mi negocio', icon: Building2 },
  { id: 'caja', label: 'Caja y dinero', icon: CircleDollarSign },
  { id: 'hardware', label: 'Impresoras y hardware', icon: Cpu },
  { id: 'impuestos', label: 'Impuestos', icon: FileText },
  { id: 'ticket', label: 'Ticket', icon: QrCode },
  { id: 'pagos', label: 'Métodos de pago', icon: Wallet },
  { id: 'licencia', label: 'Licencia', icon: KeyRound },
  { id: 'seguridad', label: 'Usuarios y seguridad', icon: LockKeyhole },
]

function mergeConfig(value) {
  return Object.fromEntries(Object.keys(DEFAULT_CONFIG).map((key) => [
    key,
    key === 'pagos'
      ? (Array.isArray(value?.pagos) ? value.pagos : DEFAULT_CONFIG.pagos)
      : key === 'hardware'
        ? {
          ...DEFAULT_CONFIG.hardware,
          ...(value?.hardware ?? {}),
          impresoraCaja: { ...DEFAULT_CONFIG.hardware.impresoraCaja, ...(value?.hardware?.impresoraCaja ?? {}) },
          impresoraCocina: { ...DEFAULT_CONFIG.hardware.impresoraCocina, ...(value?.hardware?.impresoraCocina ?? {}) },
        }
        : { ...DEFAULT_CONFIG[key], ...(value?.[key] ?? {}) },
  ]))
}

function Input({ label, value, onChange, type = 'text', ...props }) {
  return <label className="block text-sm font-semibold">{label}<input type={type} value={value ?? ''} onChange={onChange} {...props} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal" /></label>
}

function Toggle({ label, checked, onChange, disabled = false }) {
  return <label className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 p-3 text-sm font-medium"><span>{label}</span><input type="checkbox" checked={Boolean(checked)} onChange={onChange} disabled={disabled} className="h-4 w-4 accent-violet-600 disabled:cursor-not-allowed disabled:opacity-50" /></label>
}

function PrinterSettingsCard({ title, description, printer, busy, onChange, onTest }) {
  return <section className="rounded-2xl border border-zinc-200 p-4">
    <div><h3 className="font-bold">{title}</h3><p className="mt-1 text-xs text-zinc-500">{description}</p></div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Conexión<select value={printer.tipo} onChange={(event) => onChange('tipo', event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-3"><option value="usb">USB · ESC/POS</option><option value="red">Red local · IP</option></select></label>
      {printer.tipo === 'red' && <Input label="IP privada de la impresora" value={printer.ip} onChange={(event) => onChange('ip', event.target.value)} placeholder="192.168.1.100" maxLength={15} />}
      <Toggle label="Imprimir automáticamente" checked={printer.imprimirAutomaticamente} onChange={(event) => onChange('imprimirAutomaticamente', event.target.checked)} />
    </div>
    <button type="button" disabled={busy} onClick={onTest} className="mt-3 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50">{busy ? 'Probando…' : `Probar impresión ${title.toLowerCase()}`}</button>
  </section>
}

export default function Configuration() {
  const [tab, setTab] = useState('negocio')
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const demo = isDemoMode()
  const tenant = readTenant()
  const [gremio, setGremio] = useState(tenant.gremios?.[0] ?? '')
  const [printerTestBusy, setPrinterTestBusy] = useState('')
  const [showTutorial, setShowTutorial] = useState(false)
  const [licenseInfo, setLicenseInfo] = useState({ loading: false, summary: null, error: '', updatingAutoRenew: false })
  const currentPlan = String(licenseInfo.summary?.plan ?? tenant.plan ?? 'INICIO').trim().toUpperCase()
  const canConfigureDian = ['PRO', 'VEXORA', 'ENTERPRISE'].includes(currentPlan)

  useEffect(() => {
    if (demo || !API_URL || !getAuthToken()) {
      setLicenseInfo({ loading: false, summary: null, error: '', updatingAutoRenew: false })
      return
    }

    let active = true
    setLicenseInfo((current) => ({ ...current, loading: true, error: '' }))
    fetchLicenseSummary()
      .then((summary) => {
        if (active) setLicenseInfo({ loading: false, summary, error: '', updatingAutoRenew: false })
      })
      .catch((cause) => {
        if (active) setLicenseInfo({ loading: false, summary: null, error: cause instanceof Error ? cause.message : 'No se pudo consultar la licencia.', updatingAutoRenew: false })
      })

    return () => { active = false }
  }, [demo])

  function updatePrinter(target, field, value) {
    const key = target === 'caja' ? 'impresoraCaja' : 'impresoraCocina'
    setConfig((current) => ({
      ...current,
      hardware: {
        ...current.hardware,
        [key]: { ...current.hardware[key], [field]: value },
      },
    }))
  }

  async function testPrinter(target) {
    const key = target === 'caja' ? 'impresoraCaja' : 'impresoraCocina'
    const printer = config.hardware[key]
    setPrinterTestBusy(target)
    setError('')
    setMessage('')
    try {
      const savePrinterConfig = async () => {
        if (!demo) {
          const next = {
            ...config,
            negocio: { ...config.negocio, nombre: config.negocio.nombre || readTenant().business?.name || '' },
            caja: { ...config.caja, baseDefault: Number(config.caja.baseDefault) },
            hardware: {
              ...config.hardware,
              impresoraCaja: { ...config.hardware.impresoraCaja },
              impresoraCocina: { ...config.hardware.impresoraCocina },
            },
            impuestos: { ...config.impuestos, iva: Number(config.impuestos.iva) },
            seguridad: { ...config.seguridad, cierreSesionMinutos: Number(config.seguridad.cierreSesionMinutos) },
          }
          const result = await saveBusinessConfig(gremio, next)
          setConfig(mergeConfig(result.config))
        }
      }
      if (printer.tipo === 'usb') {
        await printPrinterTest(gremio, target, printer)
        await savePrinterConfig()
      } else {
        await savePrinterConfig()
        await printPrinterTest(gremio, target, printer)
      }
      setMessage(`Impresora de ${target} probada correctamente.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `No se pudo probar la impresora de ${target}.`)
    } finally {
      setPrinterTestBusy('')
    }
  }

  useEffect(() => {
    let active = true
    if (!gremio) return () => { active = false }
    const storageKey = `${STORAGE_KEY}:${gremio}`
    const load = demo
      ? Promise.resolve().then(() => JSON.parse(appStorage().getItem(storageKey) ?? 'null') ?? DEFAULT_CONFIG)
      : getBusinessConfig(gremio).then((result) => result.config)
    load.then((value) => { if (active) setConfig(mergeConfig(value)) })
      .catch((cause) => { if (active) setError(cause.message) })
    return () => { active = false }
  }, [demo, gremio])

  function update(section, field, value) {
    setConfig((current) => ({ ...current, [section]: { ...current[section], [field]: value } }))
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const next = {
        ...config,
        negocio: { ...config.negocio, nombre: config.negocio.nombre || readTenant().business?.name || '' },
        caja: { ...config.caja, baseDefault: Number(config.caja.baseDefault) },
        impuestos: { ...config.impuestos, iva: Number(config.impuestos.iva) },
        seguridad: { ...config.seguridad, cierreSesionMinutos: Number(config.seguridad.cierreSesionMinutos) },
      }
      if (demo) {
        appStorage().setItem(`${STORAGE_KEY}:${gremio}`, JSON.stringify(next))
      } else {
        const result = await saveBusinessConfig(gremio, next)
        setConfig(mergeConfig(result.config))
      }
      setMessage(demo ? 'Configuración guardada solo en esta sesión de demo.' : 'Configuración actualizada correctamente.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la configuración.')
    } finally {
      setBusy(false)
    }
  }

  function renderTab() {
    if (tab === 'negocio') return <div className="grid gap-4 sm:grid-cols-2">
      <Input label="Nombre del negocio" value={config.negocio.nombre || readTenant().business?.name} onChange={(event) => update('negocio', 'nombre', event.target.value)} maxLength={120} />
      <Input label="NIT" value={config.negocio.nit} onChange={(event) => update('negocio', 'nit', event.target.value)} maxLength={20} />
      <Input label="Dirección" value={config.negocio.direccion} onChange={(event) => update('negocio', 'direccion', event.target.value)} maxLength={200} />
      <Input label="Teléfono / WhatsApp" value={config.negocio.telefono} onChange={(event) => update('negocio', 'telefono', event.target.value)} maxLength={40} />
      <Input label="URL del logo para el ticket" value={config.negocio.logo} onChange={(event) => update('negocio', 'logo', event.target.value)} maxLength={2048} />
      <Input label="Mensaje al pie del ticket" value={config.negocio.mensajeTicket} onChange={(event) => update('negocio', 'mensajeTicket', event.target.value)} maxLength={240} />
    </div>
    if (tab === 'caja') return <div className="space-y-5">
      <Input label="Base inicial por defecto (COP)" type="number" min="0" value={config.caja.baseDefault} onChange={(event) => update('caja', 'baseDefault', event.target.value)} />
      <div className="grid gap-3 sm:grid-cols-2"><Toggle label="Permitir propinas" checked={config.caja.permitirPropinas} onChange={(event) => update('caja', 'permitirPropinas', event.target.checked)} /><Toggle label="Permitir ventas a crédito / fiado" checked={config.caja.permitirFiado} onChange={(event) => update('caja', 'permitirFiado', event.target.checked)} /></div>
      <fieldset><legend className="text-sm font-bold">Denominaciones manejadas</legend><div className="mt-2 flex flex-wrap gap-2">{DENOMINATIONS.map((amount) => <label key={amount} className="rounded-lg border bg-white px-3 py-2 text-sm"><input type="checkbox" checked={config.caja.denominacionesActivas.includes(amount)} onChange={(event) => update('caja', 'denominacionesActivas', event.target.checked ? [...config.caja.denominacionesActivas, amount].sort((a, b) => a - b) : config.caja.denominacionesActivas.filter((item) => item !== amount))} /> <span className="ml-1">${amount.toLocaleString('es-CO')}</span></label>)}</div></fieldset>
    </div>
    if (tab === 'hardware') return <div className="space-y-5">
      <label className="block text-sm font-semibold">Ancho del papel de caja<select value={config.hardware.impresora} onChange={(event) => update('hardware', 'impresora', event.target.value)} className="mt-1 w-full rounded-lg border p-3"><option value="58mm">58 mm</option><option value="80mm">80 mm</option></select></label>
      <PrinterSettingsCard
        title="Impresora de caja"
        description="Imprime facturas y tickets."
        printer={config.hardware.impresoraCaja}
        busy={printerTestBusy === 'caja'}
        onChange={(field, value) => updatePrinter('caja', field, value)}
        onTest={() => void testPrinter('caja')}
      />
      {(gremio === 'restaurante' || gremio === 'comidas_rapidas') && <PrinterSettingsCard
        title="Impresora de cocina"
        description="Imprime las comandas automáticamente al enviarlas."
        printer={config.hardware.impresoraCocina}
        busy={printerTestBusy === 'cocina'}
        onChange={(field, value) => updatePrinter('cocina', field, value)}
        onTest={() => void testPrinter('cocina')}
      />}
      <Toggle label="Abrir cajón al vender" checked={config.hardware.abrirCajon} onChange={(event) => update('hardware', 'abrirCajon', event.target.checked)} />
      <Toggle label="Activar segunda pantalla para clientes" checked={config.hardware.segundaPantalla} onChange={(event) => update('hardware', 'segundaPantalla', event.target.checked)} />
      <p className="text-sm text-zinc-600">USB envía comandos ESC/POS directamente desde Chrome o Edge. Firefox, Safari y los navegadores sin USB/Serial imprimen mediante el diálogo del sistema usando el controlador instalado. Pulsa “Probar impresión” para elegir y autorizar la impresora USB en navegadores compatibles. La autorización USB se comparte entre los gremios de este navegador, pero debes activar la impresión automática en cada gremio. La impresión por red usa el backend y el puerto fijo 9100. Lector de código de barras: USB.</p>
    </div>
    if (tab === 'impuestos') return <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">IVA<select value={config.impuestos.iva} onChange={(event) => update('impuestos', 'iva', event.target.value)} className="mt-1 w-full rounded-lg border p-3"><option value={0}>0% / Excluido</option><option value={19}>19%</option></select></label>
      </div>
      {canConfigureDian ? <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 sm:p-5">
        <div className="mb-4">
          <h3 className="font-bold text-slate-900">Datos para facturación DIAN <span className="ml-1 rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-800">Opcional</span></h3>
          <p className="mt-1 text-sm text-slate-600">Completa los datos fiscales de tu negocio. Se guardarán con la configuración de este gremio.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Razón social registrada en el RUT" value={config.negocio.razonSocial} onChange={(event) => update('negocio', 'razonSocial', event.target.value)} maxLength={160} />
          <Input label="NIT" value={config.negocio.nit} onChange={(event) => update('negocio', 'nit', event.target.value)} maxLength={20} inputMode="numeric" />
          <Input label="Dirección fiscal" value={config.negocio.direccion} onChange={(event) => update('negocio', 'direccion', event.target.value)} maxLength={200} />
          <Input label="Teléfono de contacto" value={config.negocio.telefono} onChange={(event) => update('negocio', 'telefono', event.target.value)} maxLength={40} />
          <Input label="Prefijo de factura" value={config.impuestos.prefijoFactura} onChange={(event) => update('impuestos', 'prefijoFactura', event.target.value.toUpperCase())} maxLength={5} />
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-600">Guardar estos datos no activa por sí solo la emisión electrónica. La integración DIAN y los requisitos de firma se configuran por separado.</p>
      </section> : <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="font-bold text-slate-800">Datos para facturación DIAN</h3>
        <p className="mt-1 text-sm text-slate-600">La captura de datos fiscales está disponible en los planes Pro y Vexora.</p>
      </section>}
    </div>
    if (tab === 'ticket') return <section className="max-w-2xl space-y-4">
      <label className="block text-sm font-semibold">Código impreso en el ticket
        <select value={config.ticket.tipoCodigo} onChange={(event) => update('ticket', 'tipoCodigo', event.target.value)} className="mt-1 w-full rounded-xl border border-zinc-200 bg-white p-3">
          <option value="QR">QR · referencia del ticket y verificación DIAN cuando exista</option>
          <option value="BARCODE">Código de barras · 12 dígitos para devoluciones</option>
        </select>
      </label>
      <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">La preferencia se guarda con la configuración de este gremio y se aplica a los tickets nuevos.</p>
      {config.ticket.tipoCodigo === 'BARCODE' && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">El barcode se imprime solo cuando el backend entrega un consecutivo de 12 dígitos. El consecutivo debe generarse en backend para evitar duplicados entre cajas y dispositivos.</p>}
    </section>
    if (tab === 'pagos') return <div className="space-y-3">{config.pagos.map((payment, index) => <div key={payment.nombre} className="grid items-center gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_auto_150px]"><span className="font-semibold">{payment.nombre}</span><Toggle label="Activo" checked={payment.activo} onChange={(event) => setConfig((current) => ({ ...current, pagos: current.pagos.map((item, itemIndex) => itemIndex === index ? { ...item, activo: event.target.checked } : item) }))} /><Input label="Comisión %" type="number" min="0" max="100" value={payment.comision} onChange={(event) => setConfig((current) => ({ ...current, pagos: current.pagos.map((item, itemIndex) => itemIndex === index ? { ...item, comision: Number(event.target.value) } : item) }))} /></div>)}</div>
    if (tab === 'licencia') {
      const summary = licenseInfo.summary
      const active = Boolean((summary?.active ?? false) || summary?.status === 'active' || summary?.status === 'trial')
      const statusLabel = summary?.blocked ? 'Bloqueada' : summary?.status === 'trial' ? 'Prueba activa' : active ? 'Activa' : 'Inactiva'
      const formatDate = (value) => {
        if (!value) return 'Sin información'
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return value
        return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
      }
      const startDate = summary?.startedAt ?? summary?.createdAt ?? null
      const endDate = summary?.validUntil ?? summary?.nextBillingDate ?? summary?.expiresAt ?? null

      return <div className="space-y-4">
        {licenseInfo.loading && <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">Cargando información de la licencia…</p>}
        {licenseInfo.error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{licenseInfo.error}</p>}
        {!licenseInfo.loading && !summary && !licenseInfo.error && <p className="rounded-xl border border-dashed bg-zinc-50 p-4 text-sm text-zinc-500">No hay información disponible de licencia para esta cuenta.</p>}
        {summary && <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-zinc-50 p-4"><p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Plan</p><p className="mt-2 text-lg font-black">{summary.plan || tenant.plan || 'INICIO'}</p></div>
            <div className="rounded-xl border bg-zinc-50 p-4"><p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Estado</p><p className={`mt-2 text-lg font-black ${active ? 'text-emerald-700' : 'text-rose-700'}`}>{statusLabel}</p></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-white p-4"><div className="flex items-center gap-2 text-sm font-bold text-zinc-700"><CalendarClock className="h-4 w-4 text-vexora-600" />Inicio</div><p className="mt-2 text-sm text-zinc-600">{formatDate(startDate)}</p></div>
            <div className="rounded-xl border bg-white p-4"><div className="flex items-center gap-2 text-sm font-bold text-zinc-700"><CalendarClock className="h-4 w-4 text-vexora-600" />Vence</div><p className="mt-2 text-sm text-zinc-600">{formatDate(endDate)}</p></div>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
            <Toggle label="Pago automático" checked={Boolean(summary.autoRenew)} disabled={licenseInfo.updatingAutoRenew} onChange={async (event) => {
              const nextValue = event.target.checked
              setLicenseInfo((current) => ({ ...current, updatingAutoRenew: true }))
              try {
                const updated = await updateAutoRenew(nextValue)
                setLicenseInfo((current) => ({
                  ...current,
                  summary: { ...current.summary, ...updated, autoRenew: Boolean(updated.autoRenew ?? nextValue) },
                  updatingAutoRenew: false,
                  error: '',
                }))
              } catch (cause) {
                setLicenseInfo((current) => ({ ...current, updatingAutoRenew: false, error: cause instanceof Error ? cause.message : 'No se pudo actualizar el pago automático.' }))
              }
            }} />
            <p className="mt-2 text-xs text-violet-800">{Boolean(summary.autoRenew) ? 'El cobro automático está habilitado.' : 'El pago automático está deshabilitado. Puedes activarlo en cualquier momento.'}</p>
          </div>
        </>}
      </div>
    }
    return <div className="space-y-3">
      <Toggle label="Permitir a cajeros anular ventas" checked={config.seguridad.cajeroPuedeAnular} onChange={(event) => update('seguridad', 'cajeroPuedeAnular', event.target.checked)} />
      <Toggle label="Permitir ver cierres de caja de otros usuarios" checked={config.seguridad.verCierresAjenos} onChange={(event) => update('seguridad', 'verCierresAjenos', event.target.checked)} />
      <Input label="Cierre automático de sesión (minutos)" type="number" min="1" max="240" value={config.seguridad.cierreSesionMinutos} onChange={(event) => update('seguridad', 'cierreSesionMinutos', event.target.value)} />
      <p className="text-xs text-amber-800">Los permisos de acceso del servidor siguen siendo la autoridad; estas preferencias no conceden privilegios a un cajero.</p>
    </div>
  }

  return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-6"><div className="mx-auto max-w-[1400px] rounded-[30px] border border-slate-200 bg-white/90 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6">
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <a href="/pos" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft className="h-4 w-4" />Volver al punto de venta</a>
        <h1 className="mt-4 text-3xl font-black text-slate-900">Configuración del negocio</h1>
        <p className="mt-2 text-sm text-slate-600">Personaliza las preferencias de cada gremio por separado.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {gremio && <button type="button" onClick={() => setShowTutorial(true)} className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700 hover:bg-violet-100">Ver tutorial de nuevo</button>}
      </div>
    </div>

    {tenant.gremios?.length > 1 && <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-3">
      <label className="text-sm font-semibold text-slate-700">Gremio<select value={gremio} onChange={(event) => setGremio(event.target.value)} className="ml-2 rounded-xl border bg-white px-3 py-2 text-sm font-medium shadow-sm">{tenant.gremios.map((id) => <option key={id} value={id}>{id.replaceAll('_', ' ')}</option>)}</select></label>
    </div>}

    <div className="mt-6 flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-2 shadow-inner">
      {TABS.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${tab === id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'}`}><Icon className="h-4 w-4" />{label}</button>)}
    </div>

    <div className="mt-6">
      <form onSubmit={submit} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-900">{TABS.find((item) => item.id === tab)?.label}</h2>
          <div className="rounded-full bg-vexora-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-vexora-700">clienteId · {tenant.user?.id ?? tenant.business?.email ?? 'sin id'}</div>
        </div>
        {renderTab()}
        {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {message && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-vexora-600 px-5 py-3 font-bold text-white shadow-lg shadow-vexora-600/20 hover:bg-vexora-700 disabled:opacity-50"><Save className="h-4 w-4" />{busy ? 'Guardando…' : 'Guardar configuración'}</button>
          {demo && <p className="text-xs text-slate-500">Los cambios de demo viven únicamente en esta sesión.</p>}
        </div>
      </form>
    </div>
  </div>{showTutorial && gremio && <TutorialGremio tenant={tenant} gremio={gremio} plan={tenant.plan} onClose={() => setShowTutorial(false)} />}</main>
}
