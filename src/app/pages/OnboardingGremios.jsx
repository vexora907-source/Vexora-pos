import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { GremioSelector } from '../components/GremioSelector.jsx'
import { PLANS, PricingCalculator, planForGremios } from '../components/PricingCalculator.jsx'
import { useTenantGremio } from '../../shared/hooks/useTenantGremio.js'

export default function OnboardingGremios() {
  const { gremios, updateTenant } = useTenantGremio()
  const [selected, setSelected] = useState(gremios)
  const [selectedPlan, setSelectedPlan] = useState(() => planForGremios(gremios.length).id)
  const [message, setMessage] = useState('')

  useEffect(() => setSelected(gremios), [gremios])

  function toggle(id) {
    const next = selected.includes(id)
      ? []
      : [id]
    setSelected(next)
    setSelectedPlan(planForGremios(next.length).id)
    setMessage('')
  }

  function submit(event) {
    event.preventDefault()
    if (selected.length === 0) {
      setMessage('Elige al menos un gremio para continuar.')
      return
    }
    if (selected.length > 1) {
      setMessage('Selecciona un gremio inicial. Los gremios adicionales del plan Vexora los asigna VexoraIA después del pago.')
      return
    }
    if (selected.length > PLANS[selectedPlan].maxGremios) {
      setMessage('El plan seleccionado no admite esa cantidad de gremios.')
      return
    }
    updateTenant({ gremios: selected, plan: selectedPlan })
    window.location.assign('/onboarding-dian')
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <a href="/register" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900"><ArrowLeft className="h-4 w-4" />Volver a los datos del negocio</a>
        <div className="mt-10 flex items-center gap-3"><img src="/logo/logo-vexoraia.png" alt="Vexoraia" className="h-14 w-14 object-contain" /><span className="font-black">VEXORA POS</span></div>
        <p className="mt-8 text-sm font-bold uppercase tracking-widest text-vexora-600">Paso 1 de 2 · Elige tus gremios</p>
        <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h1 className="text-4xl font-black tracking-tight">¿Qué vende tu negocio?</h1><p className="mt-3 max-w-2xl text-zinc-600">Selecciona un gremio inicial. En los planes Pro y Vexora, VexoraIA asigna los gremios adicionales después del pago.</p></div><span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-600 shadow-sm">{selected.length} seleccionados</span></div>
        <form onSubmit={submit} className="mt-8">
          <GremioSelector selected={selected} onToggle={toggle} />
          {message && <p role="alert" className="mt-4 text-sm font-semibold text-rose-700">{message}</p>}
          <div className="mt-5"><PricingCalculator gremioCount={selected.length} selectedPlan={selectedPlan} onSelect={setSelectedPlan} /></div>
          <div className="mt-7 flex flex-col-reverse items-center justify-between gap-3 border-t border-zinc-200 pt-6 sm:flex-row"><a href="/" className="text-sm font-semibold text-zinc-500">Lo configuraré después</a><button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-vexora-600 px-6 py-4 font-bold text-white shadow-lg shadow-vexora-600/20 hover:bg-vexora-700 sm:w-auto">Continuar a facturación DIAN <ArrowRight className="h-5 w-5" /></button></div>
          <p className="mt-2 text-center text-xs text-zinc-400">Precios ilustrativos; no se realiza ningún cobro desde esta demostración.</p>
        </form>
      </div>
    </main>
  )
}
