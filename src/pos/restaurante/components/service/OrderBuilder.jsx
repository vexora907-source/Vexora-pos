import { useEffect, useMemo, useState } from 'react'
import { Check, Minus, Plus, Search, Send, Trash2, Utensils } from 'lucide-react'
import { formatCOP } from '../../../../shared/services/ticket.js'
import { menuItems } from '../MenuGrid.jsx'

export function OrderBuilder({ table, onAdd, onUpdateQuantity, onRemove, onSend, dishes = menuItems }) {
  const [selectedDish, setSelectedDish] = useState(dishes[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')
  useEffect(() => {
    if (!dishes.some((item) => item.id === selectedDish)) setSelectedDish(dishes[0]?.id ?? '')
  }, [dishes, selectedDish])
  const dish = dishes.find((item) => item.id === selectedDish)
  const selectedQuantityInOrder = table.items
    .filter((item) => item.id === dish?.id)
    .reduce((sum, item) => sum + item.quantity, 0)
  const selectedDishUnavailable = !dish || (Number.isFinite(dish.quantity) && dish.quantity - selectedQuantityInOrder <= 0)
  const filteredDishes = useMemo(
    () => dishes.filter((item) => `${item.name} ${item.category ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())),
    [dishes, query],
  )
  const dailyDishes = filteredDishes.filter((item) => item.isDailyMenu)
  const regularDishes = filteredDishes.filter((item) => !item.isDailyMenu)
  const total = table.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-widest text-amber-700">Comanda</p><h3 className="mt-1 text-lg font-black">Agregar platos</h3></div>
        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">{table.items.reduce((sum, item) => sum + item.quantity, 0)} unidades</span>
      </div>
      <label className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2.5 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100">
        <Search className="h-4 w-4 shrink-0 text-zinc-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en el menú…" aria-label="Buscar platos en el menú" className="min-w-0 flex-1 text-sm outline-none" />
      </label>
      <div className="mt-3 max-h-72 space-y-4 overflow-y-auto pr-1">
        {[['Menú del día', dailyDishes], ['Carta', regularDishes]].map(([section, sectionDishes]) => sectionDishes.length > 0 && <section key={section}>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">{section}</h4>
          <div className="grid grid-cols-2 gap-2">
        {sectionDishes.map((item) => {
          const selected = item.id === selectedDish
          const inOrder = table.items.filter((line) => line.id === item.id).reduce((sum, line) => sum + line.quantity, 0)
          const remaining = Number.isFinite(item.quantity) ? Math.max(0, item.quantity - inOrder) : null
          const unavailable = remaining === 0
          return (
            <button key={item.id} type="button" disabled={unavailable} aria-pressed={selected} onClick={() => { setSelectedDish(item.id); setNote('') }} className={`relative min-w-0 rounded-xl border p-3 text-left transition ${selected ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-100' : 'border-zinc-200 bg-white hover:border-amber-300 hover:bg-zinc-50'} disabled:cursor-not-allowed disabled:opacity-50`}>
              {selected && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-amber-600 text-white"><Check className="h-3 w-3" /></span>}
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-zinc-100 text-2xl">{item.icon || <Utensils className="h-5 w-5 text-zinc-500" />}</span>
              <span className="mt-2 block truncate text-sm font-bold text-zinc-900">{item.name}</span>
              <span className="mt-1 block text-sm font-black text-amber-800">{formatCOP(item.price)}</span>
              <span className={`mt-1 block text-[11px] font-medium ${unavailable ? 'text-rose-600' : 'text-zinc-500'}`}>{unavailable ? 'Sin unidades disponibles' : remaining !== null ? `${remaining} disponibles${inOrder ? ` · ${inOrder} en comanda` : ''}` : 'Disponible'}</span>
            </button>
          )
        })}
          </div>
        </section>)}
        {!filteredDishes.length && <p className="rounded-xl bg-zinc-50 p-5 text-center text-sm text-zinc-500">No hay platos que coincidan con la búsqueda.</p>}
      </div>
      <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Detalle del plato</p>
        <label className="mt-2 block text-xs font-semibold text-zinc-600">Nota para cocina <span className="font-normal text-zinc-400">(opcional)</span>
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ej.: sin cebolla, término medio…" className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-amber-400" />
        </label>
        <button type="button" disabled={selectedDishUnavailable} onClick={() => { onAdd(dish, note.trim()); setNote('') }} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-4 w-4" />Agregar{dish ? ` · ${formatCOP(dish.price)}` : ' plato'}</button>
      </div>
      <div className="mt-5 flex items-center justify-between border-b border-zinc-100 pb-2"><h4 className="text-sm font-black">Platos en esta comanda</h4><span className="text-xs font-semibold text-zinc-500">{table.items.length} líneas</span></div>
      <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
        {table.items.length ? table.items.map((item) => <div key={item.lineId} className="flex flex-wrap items-center gap-2 rounded-xl bg-zinc-50 p-3">
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-zinc-900">{item.icon} {item.name}</p>{item.isDailyMenu && <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">Menú del día</span>}{item.note && <p className="mt-0.5 truncate text-xs text-amber-800">Nota: {item.note}</p>}<p className={`mt-1 text-xs font-semibold ${item.readyAt ? 'text-emerald-700' : 'text-zinc-500'}`}>{formatCOP(item.price)} · {item.readyAt ? 'En mesa · listo para servir' : item.sentAt ? 'En cocina' : 'Pendiente de enviar'}</p></div>
          <button type="button" aria-label={`Restar ${item.name}`} onClick={() => onUpdateQuantity(item.lineId, -1)} className="rounded-lg border border-zinc-200 bg-white p-2 hover:bg-zinc-100"><Minus className="h-4 w-4" /></button><span className="w-5 text-center text-sm font-bold">{item.quantity}</span><button type="button" aria-label={`Sumar ${item.name}`} onClick={() => onUpdateQuantity(item.lineId, 1)} className="rounded-lg border border-zinc-200 bg-white p-2 hover:bg-zinc-100"><Plus className="h-4 w-4" /></button>
          {!item.sentAt && <button type="button" aria-label={`Eliminar ${item.name}`} onClick={() => onRemove(item.lineId)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}
        </div>) : <p className="rounded-xl bg-zinc-50 px-3 py-5 text-center text-sm text-zinc-500">Selecciona un plato del menú para empezar.</p>}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4"><span className="text-sm font-semibold text-zinc-500">Total de la mesa</span><strong className="text-xl">{formatCOP(total)}</strong></div>
      <button type="button" disabled={!table.items.some((item) => !item.sentAt)} onClick={onSend} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" />Enviar pendientes a cocina</button>
    </section>
  )
}
