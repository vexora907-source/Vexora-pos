import { useState } from 'react'
import { Check, Minus, Plus, Users } from 'lucide-react'
import { FloorPlan } from './FloorPlan.jsx'
import { FloorSelector } from './FloorSelector.jsx'

export function TableDesigner({ floors, tables, onSave, onCancel }) {
  const [floorId, setFloorId] = useState(floors[0]?.id ?? 'interior')
  const [selectedId, setSelectedId] = useState(tables.find((table) => table.floorId === floorId)?.id ?? tables[0]?.id)
  const floorTables = tables.filter((table) => table.floorId === floorId)
  const selected = tables.find((table) => table.id === selectedId)

  function updateSelected(updates) {
    onSave({ floors, tables: tables.map((table) => table.id === selectedId ? { ...table, ...updates } : table), designed: false }, false)
  }

  function addTable() {
    const nextId = Math.max(0, ...tables.map((table) => table.id)) + 1
    onSave({
      floors,
      tables: [...tables, { id: nextId, name: `Mesa ${nextId}`, floorId, capacity: 4, shape: 'square', x: 50, y: 50, items: [], startedAt: null }],
      designed: false,
    }, false)
    setSelectedId(nextId)
  }

  function removeSelected() {
    if (!selected || tables.length <= 1) return
    onSave({ floors, tables: tables.filter((table) => table.id !== selectedId), designed: false }, false)
    setSelectedId(tables.find((table) => table.id !== selectedId)?.id)
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="table-designer-title" className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/70 p-3 sm:p-6">
      <section className="mx-auto max-w-5xl rounded-3xl bg-zinc-50 p-4 shadow-2xl sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-widest text-amber-700">Configuración inicial</p><h2 id="table-designer-title" className="mt-1 text-2xl font-black">Diseña el plano de tu restaurante</h2><p className="mt-2 text-sm text-zinc-500">Organiza las zonas y arrastra cada mesa a su lugar. El plano se guarda en este navegador.</p></div>
          <div className="flex gap-2"><button type="button" onClick={addTable} className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-bold"><Plus className="h-4 w-4" />Mesa</button><button type="button" onClick={onCancel} className="rounded-xl px-3 py-2 text-sm font-semibold text-zinc-500">Usar plano sugerido</button></div>
        </div>
        <div className="mt-5"><FloorSelector floors={floors} selected={floorId} onSelect={(id) => { setFloorId(id); setSelectedId(tables.find((table) => table.floorId === id)?.id) }} /></div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
          <FloorPlan tables={floorTables} selected={selectedId} onSelect={setSelectedId} onMove={(id, position) => onSave({ floors, tables: tables.map((table) => table.id === id ? { ...table, ...position } : table), designed: false }, false)} designer />
          <aside className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h3 className="font-black">Mesa seleccionada</h3>
            {selected ? <div className="mt-4 space-y-4">
              <label className="block text-sm font-semibold">Nombre<input value={selected.name} onChange={(event) => updateSelected({ name: event.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 p-2" /></label>
              <label className="block text-sm font-semibold"><span className="flex items-center gap-1"><Users className="h-4 w-4" />Puestos</span><input type="number" min="1" max="30" value={selected.capacity} onChange={(event) => updateSelected({ capacity: Math.max(1, Number(event.target.value)) })} className="mt-1 w-full rounded-lg border border-zinc-200 p-2" /></label>
              <label className="block text-sm font-semibold">Forma<select value={selected.shape} onChange={(event) => updateSelected({ shape: event.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 p-2"><option value="square">Cuadrada</option><option value="round">Redonda</option></select></label>
              <button type="button" onClick={removeSelected} disabled={tables.length <= 1} className="inline-flex items-center gap-1 text-sm font-bold text-rose-700 disabled:opacity-40"><Minus className="h-4 w-4" />Eliminar mesa</button>
            </div> : <p className="mt-3 text-sm text-zinc-500">Selecciona una mesa en el plano.</p>}
          </aside>
        </div>
        <div className="mt-5 flex justify-end"><button type="button" onClick={() => onSave({ floors, tables, designed: true }, true)} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-3 font-bold text-white hover:bg-amber-700"><Check className="h-5 w-5" />Guardar plano</button></div>
      </section>
    </div>
  )
}
