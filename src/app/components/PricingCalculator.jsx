import { useState } from 'react'
import { Check, Crown, Sparkles } from 'lucide-react'

export const PLANS = {
  INICIO: { id: 'INICIO', name: 'Plan Inicio', price: 79000, annualPrice: 948000, maxGremios: 1, maxBranches: 1, maxUsers: 1, maxProducts: 300, monthlyDianInvoices: 0 },
  NEGOCIO: { id: 'NEGOCIO', name: 'Plan Negocio', price: 149000, annualPrice: 1788000, maxGremios: 1, maxBranches: 1, maxUsers: 3, maxProducts: null, monthlyDianInvoices: 30 },
  PRO: { id: 'PRO', name: 'Plan Pro', price: 259000, annualPrice: 3108000, maxGremios: 2, maxBranches: 2, maxUsers: 6, maxProducts: null, monthlyDianInvoices: 100 },
  VEXORA: { id: 'VEXORA', name: 'Plan Vexora', price: 399000, annualPrice: 4788000, maxGremios: 5, maxBranches: null, maxUsers: 12, maxProducts: null, monthlyDianInvoices: 250 },
}

const planDetails = {
  INICIO: {
    description: 'Un gremio a tu elección para arrancar y validar tu punto de venta.',
    features: [
      'Elige entre Tienda, Papelería, Ropa, Comidas Rápidas, Cerrajería o Salón',
      '1 gremio activo; puedes cambiarlo una vez al mes desde tu panel sin perder inventario',
      '1 usuario (dueño) y 1 sucursal',
      'Hasta 300 productos',
      'POS, cierre de caja COP con billetes, lector de barras, modo offline y exportación a Excel',
      'Sin facturación DIAN; ticket POS válido hasta $212.000',
      'Ideal para validar tu punto de venta sin pagar de más',
    ],
    factura: '0 facturas DIAN al mes',
    cta: 'Comenzar con Inicio',
  },
  NEGOCIO: {
    description: 'Un gremio potenciado con herramientas profesionales y facturación electrónica.',
    features: [
      '1 gremio fijo potenciado, 1 sucursal y productos ilimitados',
      '3 usuarios: 1 administrador y 2 cajeros con permisos',
      'Tienda: fiados y alertas de vencimiento; Ropa: tallas, colores y apartados con abonos',
      'Comidas rápidas: mapa de mesas, KDS de cocina y combos; Cerrajería: órdenes de trabajo y técnicos',
      'Panel admin: usuarios, ventas por cajero, historial por fechas y anulaciones',
      'Tutorial paso a paso según tu gremio',
    ],
    factura: '30 facturas electrónicas DIAN / mes',
    cta: 'Elegir Negocio',
  },
  PRO: {
    description: 'Dos gremios simultáneos en el mismo local, con ventas separadas y una caja compartida.',
    features: [
      '2 gremios activos simultáneamente',
      '6 usuarios y hasta 2 sucursales del mismo combo, con stock sincronizado',
      'Productos ilimitados y 100 facturas electrónicas DIAN al mes',
      'Multi-caja y reportes consolidados por gremio',
      'Control de ingredientes, domicilios y soporte prioritario',
      'El segundo gremio lo activa Vexora al confirmar el pago; los cajeros no pueden cambiarlo',
    ],
    factura: '100 facturas electrónicas DIAN / mes',
    cta: 'Elegir Pro',
  },
  VEXORA: {
    description: 'Multi-negocio total: opera de 3 a 5 gremios en uno o varios puntos.',
    features: [
      'De 3 a 5 gremios activos',
      '12 usuarios y sucursales ilimitadas',
      '250 facturas electrónicas DIAN al mes',
      'Marca blanca, API para contador y ventas consolidadas por gremio',
      'Instalación presencial en Yumbo o Cali',
      'Un gremio adicional gratis cada 6 meses de fidelidad',
    ],
    factura: '250 facturas electrónicas DIAN / mes',
    cta: 'Elegir Vexora',
  },
}

const currency = (amount) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)

export function canonicalPlan(planId) {
  if (planId === 'basic' || planId === 'BASICO' || planId === 'TIENDA') return 'INICIO'
  if (planId === 'enterprise' || planId === 'ENTERPRISE') return 'VEXORA'
  return PLANS[planId] ? planId : 'INICIO'
}

export function planForGremios(count) {
  if (count <= 1) return PLANS.INICIO
  return count === 2 ? PLANS.PRO : PLANS.VEXORA
}

export function PricingCalculator({ gremioCount = 0, selectedPlan, onSelect, onChoosePlan, showSelection = true }) {
  const [annual, setAnnual] = useState(false)
  const selectedId = canonicalPlan(selectedPlan ?? planForGremios(gremioCount).id)

  return (
    <section aria-live="polite" className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5 sm:p-7">
      <div className="text-center">
        <p className="flex items-center justify-center gap-2 text-sm font-bold text-slate-700"><Sparkles className="h-4 w-4" />Planes Vexora POS</p>
        <h2 className="mt-2 text-2xl font-black text-slate-900">Elige el plan de tu negocio</h2>
        <p className="mt-2 text-sm text-slate-600">15 días gratis para probar. Después eliges plan y ciclo de pago, sin cobro automático.</p>
        <div className="mt-5 flex items-center justify-center gap-3 text-sm">
          <span className={!annual ? 'font-bold' : 'text-slate-500'}>Mensual</span>
          <button type="button" role="switch" aria-checked={annual} aria-label="Cambiar entre pago mensual y anual" onClick={() => setAnnual((value) => !value)} className="h-8 w-14 rounded-full bg-slate-900 p-1">
            <span className={`block h-6 w-6 rounded-full bg-white transition-transform ${annual ? 'translate-x-6' : ''}`} />
          </button>
          <span className={annual ? 'font-bold' : 'text-slate-500'}>Anual</span>
        </div>
      </div>
      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Object.values(PLANS).map((plan) => {
          const details = planDetails[plan.id]
          const selected = showSelection && plan.id === selectedId
          const disabled = gremioCount < 1 || gremioCount > plan.maxGremios
          const price = annual ? plan.annualPrice : plan.price
          return (
            <article key={plan.id} className={`relative rounded-2xl border bg-white p-5 text-left shadow-sm ${plan.id === 'NEGOCIO' ? 'border-slate-900 ring-2 ring-slate-900' : selected ? 'border-violet-500 ring-2 ring-violet-100' : 'border-slate-200'} ${disabled ? 'opacity-50' : ''}`}>
              {plan.id === 'NEGOCIO' && <span className="absolute -top-3 left-5 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">EL MÁS VENDIDO ⭐</span>}
              {selected && plan.id !== 'NEGOCIO' && <span className="absolute right-4 top-4 text-xs font-bold text-violet-700">Seleccionado</span>}
              <h3 className="flex items-center gap-2 font-bold text-slate-900">{plan.name}{plan.id === 'VEXORA' && <Crown className="h-4 w-4 text-amber-500" />}</h3>
              <p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">{details.description}</p>
              <p className="mt-4 text-2xl font-black text-slate-900">{currency(price)}<span className="text-xs font-medium text-slate-500">{annual ? ' / año' : ' / mes'}</span></p>
              {annual && <p className="mt-1 text-xs text-slate-500">Equivale a {currency(Math.round(price / 12))} al mes</p>}
              <p className="mt-4 min-h-10 rounded-lg bg-slate-50 p-3 text-xs font-semibold text-slate-700">{details.factura}</p>
              <ul className="mt-4 space-y-2 text-xs text-slate-600">{details.features.map((feature) => <li key={feature} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{feature}</li>)}</ul>
              <button type="button" disabled={disabled} aria-pressed={showSelection ? selected : undefined} onClick={() => onChoosePlan ? onChoosePlan(plan.id) : onSelect?.(plan.id)} className={`mt-5 w-full rounded-lg py-3 text-sm font-bold ${selected ? 'bg-violet-700 text-white' : 'bg-slate-100 text-slate-900'} disabled:cursor-not-allowed`}>{onChoosePlan ? 'Comenzar registro' : plan.id === 'INICIO' ? details.cta : selected ? 'Plan seleccionado' : details.cta}</button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
