import { motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'

export const GREMIOS = [
  { id: 'papeleria', name: 'Papelería', icon: '📚', desc: 'Cuadernos, impresiones y útiles', color: 'blue', detail: 'Productos, inventario y lectura de código de barras' },
  { id: 'cerrajeria', name: 'Cerrajería', icon: '🔑', desc: 'Llaves, aperturas y servicios', color: 'zinc', detail: 'Órdenes de trabajo, servicios y técnicos' },
  { id: 'restaurante', name: 'Restaurante', icon: '🍔', desc: 'Mesas, cocina y delivery', color: 'amber', detail: 'Mapa de mesas, comandas y menú' },
  { id: 'ferreteria', name: 'Ferretería', icon: '🔧', desc: 'Tornillos, herramientas y materiales', color: 'blue', detail: 'Ventas rápidas e inventario de ferretería' },
  { id: 'tienda', name: 'Tienda / Mini market', icon: '🛒', desc: 'Abarrotes, granel y fiados', color: 'blue', detail: 'Venta rápida, vencimientos y proveedores' },
  { id: 'ropa', name: 'Almacén de ropa', icon: '👕', desc: 'Prendas por talla y color', color: 'zinc', detail: 'Variantes, apartados y cambios' },
  { id: 'comidas_rapidas', name: 'Comidas rápidas', icon: '🍟', desc: 'Mesas, cocina y domicilios', color: 'amber', detail: 'Comandas, ingredientes y entregas' },
]

const styles = {
  zinc: 'border-zinc-200 bg-zinc-50 text-zinc-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  blue: 'border-blue-200 bg-blue-50 text-blue-800',
}

export function GremioSelector({ selected = [], onToggle = () => {} }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {GREMIOS.map((gremio, index) => {
        const active = selected.includes(gremio.id)
        return (
          <motion.button
            key={gremio.id}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07 }}
            aria-pressed={active}
            onClick={() => onToggle(gremio.id)}
            className={`relative rounded-2xl border-2 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${active ? 'border-vexora-500 bg-white shadow-md ring-4 ring-vexora-100' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}
          >
            <span className={`grid h-14 w-14 place-items-center rounded-2xl border text-3xl ${styles[gremio.color]}`}>{gremio.icon}</span>
            {active && <span className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full bg-vexora-600 text-white"><Check className="h-4 w-4" /></span>}
            <h2 className="mt-4 text-xl font-bold">{gremio.name}</h2>
            <p className="mt-1 text-sm text-zinc-600">{gremio.desc}</p>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-zinc-500"><Sparkles className="h-3.5 w-3.5" />{gremio.detail}</p>
          </motion.button>
        )
      })}
    </div>
  )
}
