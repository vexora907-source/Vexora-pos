import { useState } from 'react'
import { ArrowLeft, ArrowRight, Layers3, ShieldCheck } from 'lucide-react'
import { readTenant, saveTenant } from '../../shared/services/tenantStorage.js'
import { API_URL } from '../../shared/services/api.js'
import { saveRegistrationDraft } from '../../shared/services/registrationDraft.js'
import PrivacyPolicy from '../components/PrivacyPolicy.jsx'

export default function Register() {
  const tenant = readTenant()
  const [error, setError] = useState('')
  const [privacyOpen, setPrivacyOpen] = useState(false)

  function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const business = {
      name: String(form.get('business')).trim(),
      owner: String(form.get('owner')).trim(),
      email: String(form.get('email')).trim(),
      phone: String(form.get('phone')).trim(),
      address: String(form.get('address')).trim(),
      dianNit: String(form.get('dianNit')).trim(),
      dianVerificationDigit: String(form.get('dianVerificationDigit')).trim(),
      dianLegalName: String(form.get('dianLegalName')).trim(),
      dianAddress: String(form.get('dianAddress')).trim(),
      dianCityCode: String(form.get('dianCityCode')).trim(),
      dianCityName: String(form.get('dianCityName')).trim(),
      dianDepartmentCode: String(form.get('dianDepartmentCode')).trim(),
      dianDepartmentName: String(form.get('dianDepartmentName')).trim(),
      dianEmail: String(form.get('dianEmail')).trim(),
      dianTaxRegime: String(form.get('dianTaxRegime')).trim(),
    }

    const privacyAccepted = form.get('privacyConsent') === 'accepted'
    if (!privacyAccepted) {
      setError('Debes autorizar el tratamiento de datos para continuar con el registro.')
      return
    }

    if (API_URL) {
      saveRegistrationDraft({
        ...business,
        password: String(form.get('password') ?? ''),
        privacyConsent: {
          accepted: true,
          acceptedAt: new Date().toISOString(),
          policyVersion: '2026-05-21',
          marketing: form.get('marketingConsent') === 'accepted',
        },
      })
    }
    saveTenant({
      business,
    })
    window.location.assign('/onboarding')
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[.85fr_1.15fr]">
      <aside className="hidden flex-col justify-between bg-zinc-950 p-12 text-white lg:flex">
        <a href="/" aria-label="Vexora POS, inicio" className="flex items-center gap-3 font-black"><img src="/logo/logo-vexoraia.png" alt="Vexoraia" className="h-14 w-14 object-contain" />VEXORA POS</a>
        <div><p className="text-sm font-bold uppercase tracking-widest text-vexora-300">Empieza por lo esencial</p><h1 className="mt-4 text-4xl font-black leading-tight">Tu negocio merece un POS que lo entienda.</h1><p className="mt-5 max-w-sm leading-7 text-zinc-400">Crea tu espacio y elige uno o varios gremios para personalizar tus herramientas.</p></div>
        <p className="flex items-center gap-2 text-sm text-zinc-400"><ShieldCheck className="h-4 w-4 text-emerald-400" />La configuración de tu gremio es editable.</p>
      </aside>
      <section className="flex items-center justify-center p-6 py-14">
        <div className="w-full max-w-lg">
          <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900"><ArrowLeft className="h-4 w-4" />Volver al inicio</a>
          <p className="mt-12 text-sm font-bold uppercase tracking-widest text-vexora-600">Crear espacio de negocio</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">Registra tu negocio</h2>
          <p className="mt-3 text-zinc-500">Cuéntanos lo básico para personalizar tu espacio de trabajo.</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block text-sm font-semibold">Nombre del negocio<input name="business" required defaultValue={tenant.business?.name ?? ''} placeholder="Ej. Papel Color" className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3.5 outline-none transition focus:border-vexora-500 focus:ring-4 focus:ring-vexora-100" /></label>
            <label className="block text-sm font-semibold">Teléfono del negocio <span className="font-normal text-zinc-400">(opcional)</span><input name="phone" type="tel" defaultValue={tenant.business?.phone ?? ''} placeholder="300 123 4567" className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3.5 outline-none transition focus:border-vexora-500 focus:ring-4 focus:ring-vexora-100" /></label>
            <label className="block text-sm font-semibold">Dirección del negocio <span className="font-normal text-zinc-400">(opcional)</span><input name="address" maxLength={200} defaultValue={tenant.business?.address ?? ''} placeholder="Dirección y ciudad" className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3.5 outline-none transition focus:border-vexora-500 focus:ring-4 focus:ring-vexora-100" /></label>
            <details className="rounded-xl border border-zinc-200 p-4">
              <summary className="cursor-pointer text-sm font-bold">Datos fiscales del negocio (opcional, puedes completarlos después)</summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">NIT sin dígito de verificación<input name="dianNit" inputMode="numeric" pattern="[0-9]{9,10}" maxLength={10} defaultValue={tenant.dian?.nit ?? ''} placeholder="900123456" className="mt-2 w-full rounded-lg border border-zinc-200 p-3 font-normal" /></label>
                <label className="block text-sm font-semibold">Dígito de verificación<input name="dianVerificationDigit" inputMode="numeric" pattern="[0-9]" maxLength={1} defaultValue={tenant.dian?.verificationDigit ?? ''} placeholder="5" className="mt-2 w-full rounded-lg border border-zinc-200 p-3 font-normal" /></label>
                <label className="block text-sm font-semibold sm:col-span-2">Razón social legal<input name="dianLegalName" maxLength={160} defaultValue={tenant.dian?.legalName ?? ''} placeholder="Como aparece en el RUT" className="mt-2 w-full rounded-lg border border-zinc-200 p-3 font-normal" /></label>
                <label className="block text-sm font-semibold sm:col-span-2">Dirección fiscal<input name="dianAddress" maxLength={200} defaultValue={tenant.dian?.address ?? ''} className="mt-2 w-full rounded-lg border border-zinc-200 p-3 font-normal" /></label>
                <label className="block text-sm font-semibold">Código DIAN de ciudad<input name="dianCityCode" maxLength={10} defaultValue={tenant.dian?.cityCode ?? ''} className="mt-2 w-full rounded-lg border border-zinc-200 p-3 font-normal" /></label>
                <label className="block text-sm font-semibold">Ciudad<input name="dianCityName" maxLength={100} defaultValue={tenant.dian?.cityName ?? ''} className="mt-2 w-full rounded-lg border border-zinc-200 p-3 font-normal" /></label>
                <label className="block text-sm font-semibold">Código DIAN de departamento<input name="dianDepartmentCode" maxLength={10} defaultValue={tenant.dian?.departmentCode ?? ''} className="mt-2 w-full rounded-lg border border-zinc-200 p-3 font-normal" /></label>
                <label className="block text-sm font-semibold">Departamento<input name="dianDepartmentName" maxLength={100} defaultValue={tenant.dian?.departmentName ?? ''} className="mt-2 w-full rounded-lg border border-zinc-200 p-3 font-normal" /></label>
                <label className="block text-sm font-semibold">Correo para facturas DIAN<input name="dianEmail" type="email" maxLength={254} defaultValue={tenant.dian?.email ?? ''} className="mt-2 w-full rounded-lg border border-zinc-200 p-3 font-normal" /></label>
                <label className="block text-sm font-semibold">Régimen de IVA<select name="dianTaxRegime" defaultValue={tenant.dian?.taxRegime ?? ''} className="mt-2 w-full rounded-lg border border-zinc-200 bg-white p-3 font-normal"><option value="">Seleccionar después</option><option value="RESPONSABLE_IVA">Responsable de IVA</option><option value="NO_RESPONSABLE_IVA">No responsable de IVA</option></select></label>
              </div>
            </details>
            <label className="block text-sm font-semibold">Tu nombre<input name="owner" required defaultValue={tenant.business?.owner ?? ''} placeholder="Nombre de quien administra" className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3.5 outline-none transition focus:border-vexora-500 focus:ring-4 focus:ring-vexora-100" /></label>
            <label className="block text-sm font-semibold">Correo electrónico<input name="email" required type="email" defaultValue={tenant.business?.email ?? ''} placeholder="tu@negocio.com" className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3.5 outline-none transition focus:border-vexora-500 focus:ring-4 focus:ring-vexora-100" /></label>
            {API_URL && <label className="block text-sm font-semibold">Contraseña<input name="password" required type="password" minLength={10} maxLength={72} autoComplete="new-password" placeholder="Al menos 10 caracteres" className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3.5 outline-none transition focus:border-vexora-500 focus:ring-4 focus:ring-vexora-100" /></label>}
            <fieldset className="space-y-3 rounded-xl border border-zinc-200 p-4">
              <legend className="px-1 text-sm font-bold">Autorización de datos personales</legend>
              <label className="flex items-start gap-3 text-sm leading-6 text-zinc-700">
                <input name="privacyConsent" type="checkbox" value="accepted" required className="mt-1 h-4 w-4 shrink-0 accent-vexora-600" />
                <span>Autorizo a VexoraIA S.A.S. (NIT 1006180026-5) a tratar mis datos para prestar el servicio POS y de facturación electrónica, brindar soporte y gestionar la cobranza. Conozco mis derechos de Habeas Data y la <button type="button" onClick={() => setPrivacyOpen(true)} className="font-semibold text-vexora-700 underline">Política de Privacidad</button>.</span>
              </label>
              <label className="flex items-start gap-3 text-sm leading-6 text-zinc-600">
                <input name="marketingConsent" type="checkbox" value="accepted" className="mt-1 h-4 w-4 shrink-0 accent-vexora-600" />
                <span>Autorizo recibir información comercial de Vexora. Esta autorización es opcional y puedo retirarla cuando quiera.</span>
              </label>
            </fieldset>
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</p>}
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-vexora-600 px-5 py-4 font-bold text-white hover:bg-vexora-700">Continuar al selector de gremios <ArrowRight className="h-5 w-5" /></button>
          </form>
          <p className="mt-4 text-center text-xs leading-5 text-zinc-400">{API_URL ? 'Tu contraseña se conserva solo durante este registro y se envía de forma segura al completar la configuración.' : 'El registro en línea no está disponible en este momento.'}</p>
        </div>
      </section>
      {privacyOpen && <PrivacyPolicy onClose={() => setPrivacyOpen(false)} />}
    </main>
  )
}
