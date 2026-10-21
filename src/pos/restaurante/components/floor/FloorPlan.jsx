import { LayoutGrid } from 'lucide-react'
import { TableCard } from './TableCard.jsx'

export function FloorPlan({ tables, selected, onSelect, onMove, designer = false }) {
  function dropOnPlan(event) {
    event.preventDefault()
    const tableId = Number(event.dataTransfer.getData('text/table-id'))
    if (!tableId) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = Math.max(8, Math.min(92, ((event.clientX - bounds.left) / bounds.width) * 100))
    const y = Math.max(14, Math.min(86, ((event.clientY - bounds.top) / bounds.height) * 100))
    onMove(tableId, { x, y })
  }
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-black"><LayoutGrid className="h-5 w-5 text-amber-600" />Plano de mesas</h2><div className="flex gap-3 text-xs font-semibold text-zinc-500"><span className="text-emerald-700">● Libre</span><span className="text-amber-700">● Ocupada</span></div></div>
      <div onDragOver={(event) => event.preventDefault()} onDrop={dropOnPlan} className={`relative mt-4 min-h-[420px] overflow-hidden rounded-2xl border border-dashed border-amber-200 bg-[linear-gradient(to_right,#f4f4f5_1px,transparent_1px),linear-gradient(to_bottom,#f4f4f5_1px,transparent_1px)] bg-[size:28px_28px] ${designer ? 'bg-amber-50/40' : 'bg-zinc-50'}`}>
        <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-7xl font-black text-zinc-100">VEXORA</span>
        {tables.map((table) => <TableCard key={table.id} table={table} selected={selected === table.id} onSelect={onSelect} designer={designer} onDragStart={(event, id) => event.dataTransfer.setData('text/table-id', String(id))} />)}
      </div>
      {designer && <p className="mt-3 text-xs text-zinc-500">Arrastra cada mesa a su posición. Los cambios se guardan en este navegador.</p>}
    </section>
  )
}
