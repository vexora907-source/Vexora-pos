import { useEffect, useState } from 'react'
import { FileKey2, RefreshCw, ShieldCheck } from 'lucide-react'

export function DianConfig({
  initial = {},
  onSubmit,
  onSync,
  busy = false,
  syncing = false,
  error = '',
  message = '',
  numberingResponse = null,
  configured = false,
}) {
  const [values, setValues] = useState({
    accountId: initial.accountId ?? '',
    authToken: '',
    technicalKey: '',
    environment: initial.environment ?? 'PRUEBAS',
    resolutionNumber: initial.resolutionNumber ?? '',
    rangeStart: initial.rangeStart ?? '',
    rangeEnd: initial.rangeEnd ?? '',
    currentNumber: initial.currentNumber ?? '',
    validFrom: initial.validFrom ?? '',
    validTo: initial.validTo ?? '',
    nit: initial.nit ?? '',
    verificationDigit: initial.verificationDigit ?? '',
    legalName: initial.legalName ?? '',
    prefix: initial.prefix ?? '',
    address: initial.address ?? '',
    cityCode: initial.cityCode ?? '',
    cityName: initial.cityName ?? '',
    departmentCode: initial.departmentCode ?? '',
    departmentName: initial.departmentName ?? '',
    email: initial.email ?? '',
    taxRegime: initial.taxRegime ?? '',
    technicalKeyConfigured: Boolean(initial.technicalKeyConfigured),
  })

  useEffect(() => {
    setValues((current) => ({
      ...current,
      accountId: initial.accountId ?? '',
      environment: initial.environment ?? 'PRUEBAS',
      resolutionNumber: initial.resolutionNumber ?? '',
      rangeStart: initial.rangeStart ?? '',
      rangeEnd: initial.rangeEnd ?? '',
      currentNumber: initial.currentNumber ?? '',
      validFrom: initial.validFrom ?? '',
      validTo: initial.validTo ?? '',
      nit: initial.nit ?? '',
      verificationDigit: initial.verificationDigit ?? '',
      legalName: initial.legalName ?? '',
      prefix: initial.prefix ?? '',
      address: initial.address ?? '',
      cityCode: initial.cityCode ?? '',
      cityName: initial.cityName ?? '',
      departmentCode: initial.departmentCode ?? '',
      departmentName: initial.departmentName ?? '',
      email: initial.email ?? '',
      taxRegime: initial.taxRegime ?? '',
      technicalKeyConfigured: Boolean(initial.technicalKeyConfigured),
    }))
  }, [initial])

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function submit() {
    const saved = await onSubmit(values)
    if (saved) {
      update('authToken', '')
      update('technicalKey', '')
    }
  }

  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="font-bold text-slate-900">Conexión de facturación electrónica · Dataico</h3>
        <p className="mt-1 text-sm text-slate-600">Esta es la conexión Dataico del negocio cliente, no una cuenta global de Vexora. El propietario obtiene el UUID de cuenta y la llave API en app.dataico.com → Opciones → Configuración. La conexión se comparte entre los gremios de este negocio; el token se cifra en backend y nunca se devuelve.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">ID de cuenta Dataico<input value={values.accountId} onChange={(event) => update('accountId', event.target.value)} autoComplete="off" required maxLength={36} pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}" placeholder="UUID de la cuenta Dataico" className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold">Token API Dataico<input value={values.authToken} onChange={(event) => update('authToken', event.target.value)} type="password" autoComplete="new-password" required={!configured} placeholder={configured ? 'Guardado de forma segura; deja vacío para conservarlo' : 'Pega aquí el token API'} maxLength={4096} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold">Entorno<select value={values.environment} onChange={(event) => update('environment', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal"><option value="PRUEBAS">Pruebas</option><option value="PRODUCCION">Producción</option></select></label>
        <label className="block text-sm font-semibold">Clave técnica DIAN<input value={values.technicalKey} onChange={(event) => update('technicalKey', event.target.value)} type="password" autoComplete="new-password" required={values.environment === 'PRODUCCION' && !values.technicalKeyConfigured} pattern="[A-Fa-f0-9]{32,128}" placeholder={values.technicalKeyConfigured ? 'Guardada cifrada; deja vacío para conservarla' : 'Clave técnica hex de la resolución'} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold">Número de resolución DIAN<input value={values.resolutionNumber} onChange={(event) => update('resolutionNumber', event.target.value.replace(/\D/g, ''))} required inputMode="numeric" pattern="[0-9]{1,20}" maxLength={20} placeholder="Número de resolución sincronizada" className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold">Numeración desde<input value={values.rangeStart} onChange={(event) => update('rangeStart', event.target.value.replace(/\D/g, ''))} type="number" min="1" required={values.environment === 'PRODUCCION'} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold">Numeración hasta<input value={values.rangeEnd} onChange={(event) => update('rangeEnd', event.target.value.replace(/\D/g, ''))} type="number" min="1" required={values.environment === 'PRODUCCION'} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold">Consecutivo actual<input value={values.currentNumber} onChange={(event) => update('currentNumber', event.target.value.replace(/\D/g, ''))} type="number" min="0" required={values.environment === 'PRODUCCION'} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold">Inicio de vigencia<input value={values.validFrom} onChange={(event) => update('validFrom', event.target.value)} type="date" required={values.environment === 'PRODUCCION'} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold">Fin de vigencia<input value={values.validTo} onChange={(event) => update('validTo', event.target.value)} type="date" required={values.environment === 'PRODUCCION'} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold">NIT emisor<input value={values.nit} onChange={(event) => update('nit', event.target.value.replace(/\D/g, ''))} required inputMode="numeric" pattern="[0-9]{9,10}" maxLength={10} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold">Dígito de verificación<input value={values.verificationDigit} onChange={(event) => update('verificationDigit', event.target.value.replace(/\D/g, '').slice(0, 1))} inputMode="numeric" pattern="[0-9]" maxLength={1} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold">Razón social<input value={values.legalName} onChange={(event) => update('legalName', event.target.value)} required maxLength={160} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold">Prefijo de factura<input value={values.prefix} onChange={(event) => update('prefix', event.target.value.toUpperCase())} required pattern="[A-Za-z0-9]{1,5}" maxLength={5} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold sm:col-span-2">Dirección fiscal<input value={values.address} onChange={(event) => update('address', event.target.value)} maxLength={200} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold">Código DIAN de ciudad<input value={values.cityCode} onChange={(event) => update('cityCode', event.target.value)} maxLength={10} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold">Ciudad<input value={values.cityName} onChange={(event) => update('cityName', event.target.value)} maxLength={100} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold">Código DIAN de departamento<input value={values.departmentCode} onChange={(event) => update('departmentCode', event.target.value)} maxLength={10} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold">Departamento<input value={values.departmentName} onChange={(event) => update('departmentName', event.target.value)} maxLength={100} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold">Correo para facturas<input value={values.email} onChange={(event) => update('email', event.target.value)} type="email" maxLength={254} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold">Régimen IVA<select value={values.taxRegime} onChange={(event) => update('taxRegime', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 font-normal"><option value="">Seleccionar</option><option value="RESPONSABLE_IVA">Responsable de IVA</option><option value="NO_RESPONSABLE_IVA">No responsable de IVA</option></select></label>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      {numberingResponse && <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(numberingResponse, null, 2)}</pre>}
      <p className="mt-4 flex gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Cada negocio utiliza su propia cuenta Dataico; la cuenta no se comparte con otros clientes Vexora. Empieza en Pruebas y habilita Producción solo cuando hayas validado la cuenta y el esquema fiscal.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={() => void submit()} className="inline-flex items-center gap-2 rounded-xl bg-vexora-600 px-4 py-3 font-bold text-white hover:bg-vexora-700 disabled:opacity-50"><FileKey2 className="h-4 w-4" />{busy ? 'Conectando…' : configured ? 'Guardar conexión Dataico' : 'Conectar Dataico'}</button>
        {configured && <button type="button" disabled={syncing || busy} onClick={() => void onSync()} className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-white px-4 py-3 font-bold text-violet-800 hover:bg-violet-50 disabled:opacity-50"><RefreshCw className="h-4 w-4" />{syncing ? 'Sincronizando…' : 'Sincronizar resoluciones DIAN'}</button>}
      </div>
    </section>
  )
}
