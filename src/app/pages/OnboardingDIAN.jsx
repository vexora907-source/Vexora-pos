import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useTenantGremio } from '../../shared/hooks/useTenantGremio.js'
import { register } from '../../shared/services/auth.js'
import { API_URL } from '../../shared/services/api.js'
import { clearRegistrationDraft, readRegistrationDraft } from '../../shared/services/registrationDraft.js'
import { saveTenant } from '../../shared/services/tenantStorage.js'

export default function OnboardingDIAN() {
  const tenant = useTenantGremio()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function finishRegistration() {
    setBusy(true)
    setError('')
    try {
      if (API_URL) {
        const draft = readRegistrationDraft()
        if (!draft) throw new Error('No encontramos tus datos de acceso. Vuelve a registrar el negocio para continuar.')
        if (draft.privacyConsent?.accepted !== true) {
          throw new Error('No encontramos tu autorización de tratamiento de datos. Vuelve al registro y autorízala para continuar.')
        }
        const result = await register({
          name: draft.name,
          ownerName: draft.owner,
          email: draft.email,
          phone: draft.phone,
          address: draft.address,
          password: draft.password,
          privacyConsent: draft.privacyConsent,
          gremios: tenant.gremios,
          planId: 'INICIO',
          dianEnabled: false,
        })
        saveTenant({
          business: {
            name: result.tenant.name,
            owner: result.tenant.ownerName,
            email: result.tenant.email,
            phone: result.tenant.phone,
            address: result.tenant.address,
          },
          gremios: result.tenant.gremios,
          dian: result.tenant.dian,
          plan: 'INICIO',
          user: result.user,
        })
        clearRegistrationDraft()
      } else {
        tenant.updateTenant({ plan: 'INICIO', dian: { enabled: false, status: 'disabled' } })
      }
      window.location.assign('/pos')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la cuenta.')
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <a href="/onboarding" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900"><ArrowLeft className="h-4 w-4" />Volver a elegir gremios</a>
        <div className="mt-8 flex items-center gap-3"><img src="/logo/logo-vexoraia.png" alt="Vexoraia" className="h-12 w-12 object-contain" /><span className="font-black">VEXORA POS</span></div>
        <p className="mt-7 text-sm font-bold uppercase tracking-widest text-vexora-600">Paso 2 de 2 · Prueba gratis</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Prueba Vexora POS durante 15 días</h1>
        <p className="mt-3 text-zinc-600">Comienzas con el Plan Inicio sin costo y sin cobro automático. Después de la prueba eliges un plan y decides si pagas mensual o anual.</p>
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="font-bold">Durante la prueba</h2>
          <p className="mt-2 text-sm text-zinc-600">Puedes vender y explorar tu gremio. La facturación DIAN se configura al elegir un plan que la incluya y no se emitirán facturas DIAN durante la prueba.</p>
          {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <button type="button" disabled={busy} onClick={() => void finishRegistration()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-vexora-600 px-5 py-4 font-bold text-white hover:bg-vexora-700 disabled:opacity-50">{busy ? 'Creando cuenta…' : 'Iniciar mis 15 días gratis'} <ArrowRight className="h-5 w-5" /></button>
        </section>
        <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-zinc-400"><Check className="h-4 w-4" />{tenant.gremios.length} gremio(s) seleccionados: {tenant.gremios.join(', ') || 'ninguno'}</p>
      </div>
    </main>
  )
}
