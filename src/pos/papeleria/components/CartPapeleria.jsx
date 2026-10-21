import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { formatCOP } from '../../../shared/services/ticket.js'

export function CartPapeleria({ items = [], onChange = () => {}, onPay = () => {} }) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4">
      <h2 className="flex items-center gap-2 font-black"><ShoppingBag className="h-5 w-5 text-vexora-600" />Carrito <span className="ml-auto rounded-full bg-zinc-100 px-2.5 py-1 text-xs">{items.reduce((sum, item) => sum + item.quantity, 0)}</span></h2>
      <div className="mt-3 max-h-80 divide-y divide-zinc-100 overflow-y-auto">{items.length ? items.map((item) => <div key={item.id} className="flex items-center gap-3 py-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${item.tone ?? 'bg-zinc-100'} text-2xl`}>{item.icon ?? '📦'}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.name}</p><p className="text-xs text-zinc-500">{formatCOP(item.price)} c/u · {formatCOP(item.price * item.quantity)} total</p></div><div className="flex items-center gap-1"><button type="button" aria-label={`Restar ${item.name}`} onClick={() => onChange(item.id, item.quantity - 1)} className="rounded-lg border p-1.5"><Minus className="h-3 w-3" /></button><span className="w-5 text-center text-sm font-bold">{item.quantity}</span><button type="button" aria-label={`Sumar ${item.name}`} onClick={() => onChange(item.id, item.quantity + 1)} className="rounded-lg border p-1.5"><Plus className="h-3 w-3" /></button><button type="button" aria-label={`Eliminar ${item.name}`} onClick={() => onChange(item.id, 0)} className="ml-1 p-1 text-zinc-400 hover:text-vexora-700"><Trash2 className="h-4 w-4" /></button></div></div>) : <p className="py-8 text-center text-sm text-zinc-400">Agrega productos para comenzar.</p>}</div>
      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-4"><span className="font-bold">Total</span><span className="text-xl font-black">{formatCOP(total)}</span></div>
      <button type="button" disabled={!items.length} onClick={onPay} className="mt-4 w-full rounded-xl bg-vexora-600 px-4 py-3 font-bold text-white hover:bg-vexora-700 disabled:opacity-40">Cobrar venta</button>
    </section>
  )
}
