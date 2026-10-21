import { Armchair, Coffee, Sun } from 'lucide-react'

const icons = { interior: Armchair, terraza: Sun, barra: Coffee }

export function FloorSelector({ floors, selected, onSelect }) {
  return (
    <nav aria-label="Zonas del restaurante" className="flex flex-wrap gap-2">
      {floors.map((floor) => {
        const Icon = icons[floor.id] ?? Armchair
        return <button key={floor.id} type="button" onClick={() => onSelect(floor.id)} aria-pressed={selected === floor.id} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${selected === floor.id ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20' : 'border border-zinc-200 bg-white text-zinc-600 hover:border-amber-300'}`}><Icon className="h-4 w-4" />{floor.name}</button>
      })}
    </nav>
  )
}
