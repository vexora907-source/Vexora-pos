import { Clock3, Users } from 'lucide-react'
import { formatCOP } from '../../../../shared/services/ticket.js'
import { useKitchenTimer, formatElapsed } from '../../hooks/useKitchenTimer.js'
import { OrderBuilder } from './OrderBuilder.jsx'

export function TableDetail({ table, dishes, onAdd, onUpdateQuantity, onRemove, onSend, onPay }) {
  const elapsed = useKitchenTimer(table.startedAt)
  const total = table.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-amber-800">Detalle de servicio</p><h2 className="mt-1 text-xl font-black">{table.name}</h2></div><span className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-zinc-600">{table.items.length ? 'En servicio' : 'Nueva atención'}</span></div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-600"><span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{table.capacity} puestos</span>{table.startedAt && <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" />{formatElapsed(elapsed)} en cocina</span>}<span className="font-bold text-zinc-900">{formatCOP(total)}</span></div>
      </div>
      <OrderBuilder table={table} dishes={dishes} onAdd={onAdd} onUpdateQuantity={onUpdateQuantity} onRemove={onRemove} onSend={onSend} />
      {total > 0 && <button type="button" onClick={onPay} className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-700">Cobrar mesa · {formatCOP(total)}</button>}
    </section>
  )
}
