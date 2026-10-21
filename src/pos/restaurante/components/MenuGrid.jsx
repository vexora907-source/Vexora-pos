import { formatCOP } from '../../../shared/services/ticket.js'

export const menuItems = [
  { id: 'burger', name: 'Hamburguesa clásica', price: 18000, icon: '🍔' },
  { id: 'fries', name: 'Papas crocantes', price: 7000, icon: '🍟' },
  { id: 'juice', name: 'Jugo natural', price: 6500, icon: '🥤' },
  { id: 'salad', name: 'Ensalada fresca', price: 12000, icon: '🥗' },
]

export function MenuGrid({ onAdd = () => {} }) {
  return <section><h2 className="mb-3 font-black">Menú rápido</h2><div className="grid grid-cols-2 gap-3">{menuItems.map((item) => <button key={item.id} type="button" onClick={() => onAdd(item)} className="rounded-2xl border border-zinc-200 bg-white p-4 text-left hover:border-amber-400 hover:shadow-md"><span className="text-3xl">{item.icon}</span><p className="mt-3 font-bold">{item.name}</p><p className="mt-1 text-sm font-black text-amber-700">{formatCOP(item.price)}</p></button>)}</div></section>
}
