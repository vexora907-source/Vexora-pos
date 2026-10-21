import { useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, X } from 'lucide-react'
import { PLANS, canonicalPlan } from './PricingCalculator.jsx'
import { markTutorialSeen } from '../../shared/services/tutorial.js'

const gremioSteps = {
  papeleria: [
    ['Configura tu negocio', 'En Configuración > Mi negocio completa el nombre, NIT y dirección que quieras mostrar en tus comprobantes.'],
    ['Carga el inventario', 'Abre Inventario para crear productos o importar una hoja Excel. El archivo solo modifica el inventario de Papelería de esta cuenta.'],
    ['Abre caja', 'En Apertura y cierre de caja registra la base antes de comenzar el turno.'],
    ['Registra una venta', 'Busca o escanea cada artículo, agrégalo al carrito, cobra y elige el método de pago.'],
  ],
  cerrajeria: [
    ['Configura el negocio', 'Completa los datos del negocio desde Configuración para identificar tus comprobantes.'],
    ['Prepara servicios e inventario', 'Usa Inventario para cargar los servicios y productos que ofrece tu cerrajería.'],
    ['Abre caja', 'Registra la base inicial desde Apertura y cierre de caja antes de vender.'],
    ['Registra el trabajo', 'Busca el servicio o producto, cobra la venta y revisa la orden de trabajo generada para continuar su atención.'],
  ],
  restaurante: [
    ['Configura el negocio', 'Completa los datos de identificación y contacto desde Configuración.'],
    ['Prepara el menú', 'Administra los platos y existencias desde Inventario y menú del restaurante.'],
    ['Atiende mesas y cocina', 'Selecciona una mesa, agrega los platos y envía la comanda para que cocina la prepare.'],
    ['Cobra el pedido', 'Cuando corresponda, abre caja y registra el pago desde el flujo de atención.'],
  ],
  ferreteria: [
    ['Configura el negocio', 'Completa los datos del negocio desde Configuración para identificar tus comprobantes.'],
    ['Carga productos y stock', 'Abre Inventario de ferretería para agregar artículos o importar el Excel de tu negocio.'],
    ['Abre caja', 'Registra la base inicial en Apertura y cierre de caja antes de comenzar.'],
    ['Vende', 'Busca o escanea el artículo, revisa la cantidad y el precio y completa el cobro.'],
  ],
  tienda: [
    ['Configura el negocio', 'Completa los datos del negocio desde Configuración.'],
    ['Carga productos y unidades', 'En Inventario de la tienda agrega los artículos; para productos a granel puedes indicar unidad y vencimiento.'],
    ['Abre caja', 'Registra la base inicial desde Apertura y cierre de caja.'],
    ['Registra ventas', 'Busca o escanea los productos, verifica cantidades y cobra el pedido.'],
  ],
  ropa: [
    ['Configura el negocio', 'Completa los datos del negocio desde Configuración.'],
    ['Carga las prendas', 'Agrega prendas al Inventario de ropa con su código, categoría, precio y existencias.'],
    ['Abre caja', 'Registra la base inicial desde Apertura y cierre de caja.'],
    ['Registra la venta', 'Selecciona las prendas del cliente, confirma el total y completa el cobro.'],
  ],
  comidas_rapidas: [
    ['Configura el negocio', 'Completa los datos del negocio desde Configuración.'],
    ['Carga ingredientes y menú', 'En Ingredientes crea los insumos y platos con receta. Para pizzas, usa la categoría “Pizza personalizada” o “Pizza de la casa”; configura los toppings como ingredientes opcionales con su precio adicional.'],
    ['Envía la comanda', 'Elige mesa, para llevar o domicilio; agrega los productos para que el pedido aparezca en el flujo de cocina.'],
    ['Cobra y entrega', 'Registra el pago y actualiza el estado del pedido conforme avance su preparación y entrega.'],
  ],
}

function advancedStep(plan) {
  if (plan === 'INICIO') return null
  if (plan === 'VEXORA') return ['Funciones del plan Vexora', 'Administra tus gremios y equipo desde el panel administrativo. Las opciones disponibles dependen de los permisos de tu usuario.']
  if (plan === 'PRO') return ['Funciones del plan Pro', 'Consulta los reportes y administra usuarios o sucursales desde el panel administrativo, de acuerdo con los permisos de tu usuario.']
  return ['Funciones del plan Negocio', 'Revisa las herramientas de administración y reportes disponibles para tu cuenta desde el panel administrativo.']
}

export function TutorialGremio({ tenant, gremio, plan: planValue, onClose }) {
  const plan = canonicalPlan(String(planValue ?? '').toUpperCase())
  const steps = [...(gremioSteps[gremio] ?? gremioSteps.papeleria)]
  const advanced = advancedStep(plan)
  if (advanced) steps.push(advanced)
  const [step, setStep] = useState(0)

  function close() {
    markTutorialSeen(tenant, gremio, plan)
    onClose()
  }

  const gremioName = gremio.replaceAll('_', ' ')

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-zinc-950/70 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="tutorial-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800"><BookOpen className="h-4 w-4" />Tutorial · {gremioName} · {PLANS[plan].name}</p>
            <h2 id="tutorial-title" className="mt-4 text-2xl font-black">{steps[step][0]}</h2>
          </div>
          <button type="button" onClick={close} aria-label="Cerrar tutorial" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"><X className="h-5 w-5" /></button>
        </header>
        <p className="mt-3 min-h-16 leading-6 text-zinc-600">{steps[step][1]}</p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-100" aria-label={`Paso ${step + 1} de ${steps.length}`}>
          <div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={close} className="text-sm font-semibold text-zinc-500 hover:text-zinc-800">Saltar tutorial</button>
          <div className="flex items-center gap-2">
            {step > 0 && <button type="button" onClick={() => setStep((current) => current - 1)} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700"><ArrowLeft className="h-4 w-4" />Atrás</button>}
            {step < steps.length - 1
              ? <button type="button" onClick={() => setStep((current) => current + 1)} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white">Siguiente<ArrowRight className="h-4 w-4" /></button>
              : <button type="button" onClick={close} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white">¡Empezar a vender!</button>}
          </div>
        </footer>
        <p className="mt-4 text-center text-xs text-zinc-400">{step + 1} de {steps.length}</p>
      </section>
    </div>
  )
}
