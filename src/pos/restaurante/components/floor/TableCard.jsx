import { Armchair, Check, Clock3, Users } from 'lucide-react'
import { formatCOP } from '../../../../shared/services/ticket.js'
import { useKitchenTimer, formatElapsed } from '../../hooks/useKitchenTimer.js'

export function TableCard({ table, selected, onSelect, onDragStart, designer = false }) {
  const seconds = useKitchenTimer(table.startedAt)
  const total = table.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const occupied = table.items.length > 0
  const urgent = occupied && seconds >= 15 * 60
  const sentItems = table.items.filter((item) => item.sentAt)
  const readyItems = sentItems.filter((item) => item.readyAt)
  return (
    <button type="button" draggable={designer} onDragStart={(event) => onDragStart?.(event, table.id)} onClick={() => onSelect(table.id)} aria-pressed={selected} style={{ left: `${table.x}%`, top: `${table.y}%` }} className={`absolute flex min-h-28 w-32 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 border-2 p-3 text-center shadow-sm transition hover:shadow-lg ${table.shape === 'round' ? 'rounded-full' : 'rounded-2xl'} ${occupied ? (urgent ? 'border-rose-400 bg-rose-50 text-rose-950' : 'border-amber-300 bg-amber-50 text-amber-950') : 'border-emerald-200 bg-emerald-50 text-emerald-900'} ${selected ? 'ring-4 ring-vexora-200' : ''} ${designer ? 'cursor-grab active:cursor-grabbing' : ''}`}>
      <span className="font-black">{table.name}</span>
      <span className="flex items-center gap-1 text-[11px] font-semibold"><Users className="h-3 w-3" />{table.capacity} puestos</span>
      {occupied ? <><span className="text-[11px] font-bold">{formatCOP(total)}</span><span className={`flex items-center gap-1 text-[11px] font-bold ${urgent ? 'text-rose-700' : ''}`}><Clock3 className="h-3 w-3" />{formatElapsed(seconds)}</span>{sentItems.length > 0 && <span className={`flex items-center gap-1 text-[10px] font-bold ${readyItems.length === sentItems.length ? 'text-emerald-700' : 'text-amber-700'}`}>{readyItems.length === sentItems.length ? <><Check className="h-3 w-3" />En mesa</> : `${readyItems.length}/${sentItems.length} en mesa`}</span>}</> : <span className="flex items-center gap-1 text-[11px] font-bold"><Armchair className="h-3 w-3" />Libre</span>}
      {designer && <span className="mt-1 text-[9px] uppercase tracking-wide text-zinc-500">Arrastra</span>}
    </button>
  )
}
