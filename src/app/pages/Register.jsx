import { useState } from 'react'
import { ArrowLeft, ArrowRight, Layers3, ShieldCheck } from 'lucide-react'
import { readTenant, saveTenant } from '../../shared/services/tenantStorage.js'
import { API_URL } from '../../shared/services/api.js'
import { saveRegistrationDraft } from '../../shared/services/registrationDraft.js'
import { normalizeEmail } from '../../shared/services/auth.js'
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
    }

    const normalizedEmail = normalizeEmail(business.email)
    const existingEmail = normalizeEmail(tenant.business?.email)
    if (normalizedEmail && existingEmail && normalizedEmail === existingEmail) {
      setError('Ya existe una cuenta con este correo. Inicia sesión o usa otro correo.')
      return
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
          <p className="mt-4 text-center text-xs leading-5 text-zinc-400">{API_URL ? 'Tu contraseña se conserva solo durante este registro y se envía al backend al finalizar la configuración.' : 'Demo de interfaz: activa VITE_API_URL para registrar cuentas en el backend.'}</p>
        </div>
      </section>
      {privacyOpen && <PrivacyPolicy onClose={() => setPrivacyOpen(false)} />}
    </main>
  )
}
