import { DoorOpen, KeyRound, Plus } from 'lucide-react'

export const services = [
  { id: 'house', name: 'Apertura casa', price: 60000, icon: DoorOpen, detail: 'Apertura de puerta residencial' },
  { id: 'car', name: 'Apertura carro', price: 80000, icon: KeyRound, detail: 'Apertura vehicular' },
  { id: 'copy', name: 'Copia de llave', price: 10000, icon: KeyRound, detail: 'Copia de llave sencilla' },
  { id: 'secure', name: 'Llave seguridad', price: 25000, icon: KeyRound, detail: 'Copia de llave de seguridad' },
]
const currency = (amount) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)

export function ServiceBoard({ onAdd = () => {} }) {
  return <div className="grid gap-3 sm:grid-cols-2">{services.map(({ id, name, price, icon: Icon, detail }) => <button key={id} type="button" onClick={() => onAdd({ id, name, price })} className="flex items-center gap-4 rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-left transition hover:border-amber-400 hover:bg-zinc-700"><span className="grid h-12 w-12 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><Icon /></span><span className="min-w-0 flex-1"><span className="block font-bold text-white">{name}</span><span className="mt-0.5 block text-xs text-zinc-400">{detail}</span><span className="mt-2 block font-black text-amber-300">{currency(price)}</span></span><Plus className="h-5 w-5 text-zinc-400" /></button>)}</div>
}
