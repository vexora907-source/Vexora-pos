import { PackagePlus } from 'lucide-react'
import { formatCOP } from '../../../shared/services/ticket.js'

const stockTone = (stock) => stock < 5 ? 'bg-amber-100 text-amber-800' : stock < 15 ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-700'

export function ProductGridPapeleria({ products = [], onAdd = () => {} }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => <button key={product.id} type="button" onClick={() => onAdd(product)} className="rounded-2xl border border-zinc-200 bg-white p-3 text-left transition hover:border-vexora-500 hover:shadow-md">
        <div className={`grid aspect-[4/3] place-items-center rounded-xl ${product.tone}`}><span className="text-4xl" aria-hidden="true">{product.icon}</span></div>
        <div className="mt-3 flex items-start justify-between gap-1"><p className="font-bold leading-snug">{product.name}</p><PackagePlus className="mt-0.5 h-4 w-4 shrink-0 text-vexora-600" /></div>
        <div className="mt-2 flex items-center justify-between"><span className="font-black text-vexora-700">{formatCOP(product.price)}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${stockTone(product.stock)}`}>{product.stock} und.</span></div>
      </button>)}
    </div>
  )
}
