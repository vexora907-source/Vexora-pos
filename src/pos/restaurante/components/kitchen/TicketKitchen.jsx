import { Clock3, Printer } from 'lucide-react'
import { useState } from 'react'
import { formatCOP } from '../../../../shared/services/ticket.js'
import { useKitchenTimer, formatElapsed } from '../../hooks/useKitchenTimer.js'
import { KDSBump } from './KDSBump.jsx'

export function TicketKitchen({ table, onBump, onPrint }) {
  const [printing, setPrinting] = useState(false)
  const pending = table.items.filter((item) => item.sentAt && !item.readyAt)
  const start = pending.reduce((oldest, item) => !oldest || new Date(item.sentAt) < new Date(oldest) ? item.sentAt : oldest, null)
  const seconds = useKitchenTimer(start)
  const urgent = seconds >= 15 * 60
  const total = pending.reduce((sum, item) => sum + item.price * item.quantity, 0)
  if (!pending.length) return null

  async function printTicket() {
    setPrinting(true)
    try {
      await onPrint(table)
    } finally {
      setPrinting(false)
    }
  }

  return (
    <article className={`rounded-2xl border-2 bg-white p-4 shadow-sm ${urgent ? 'animate-pulse border-rose-500' : 'border-amber-200'}`}>
      <div className="flex items-start justify-between gap-2"><div><p className="text-xs font-black uppercase tracking-widest text-amber-700">Comanda</p><h2 className="mt-1 text-xl font-black">{table.name}</h2></div><span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-black ${urgent ? 'bg-rose-100 text-rose-800' : 'bg-zinc-100 text-zinc-700'}`}><Clock3 className="h-4 w-4" />{formatElapsed(seconds)}</span></div>
      <ul className="mt-4 space-y-2">{pending.map((item) => <li key={item.lineId} className="rounded-xl bg-amber-50 p-3"><div className="flex justify-between gap-2"><span className="font-black">{item.quantity} × {item.name}</span><span className="text-xs text-zinc-500">{formatCOP(item.price * item.quantity)}</span></div>{item.note && <p className="mt-1 rounded-md bg-white px-2 py-1 text-sm font-bold text-rose-800">Nota: {item.note}</p>}</li>)}</ul>
      <p className="my-3 text-right text-sm font-bold text-zinc-600">Subtotal comanda: {formatCOP(total)}</p>
      <button type="button" onClick={printTicket} disabled={printing} className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 px-4 py-3 text-sm font-black text-zinc-800 hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-60"><Printer className="h-4 w-4" />{printing ? 'Imprimiendo…' : 'Imprimir comanda'}</button>
      <KDSBump tableId={table.id} lineIds={pending.map((item) => item.lineId)} onBump={onBump} />
    </article>
  )
}
