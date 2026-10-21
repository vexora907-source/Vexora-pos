import { MapPin, UserRound } from 'lucide-react'
import { KeyTypeSelector } from './KeyTypeSelector.jsx'
import { TechnicianAssign } from './TechnicianAssign.jsx'

export function JobOrder({ service = 'Apertura casa', serviceId = '', servicePrice = 0, onSubmit = () => {} }) {
  function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSubmit({ service, serviceId, price: servicePrice, address: form.get('address'), customer: form.get('customer'), keyType: form.get('keyType'), technician: form.get('technician') })
    event.currentTarget.reset()
  }
  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-zinc-700 bg-zinc-800 p-5">
      <h2 className="font-black text-white">Nueva orden de trabajo</h2><p className="text-sm text-amber-300">{service}</p>
      <label className="block text-sm font-semibold text-zinc-300"><span className="flex items-center gap-2"><MapPin className="h-4 w-4" />Dirección del servicio</span><input name="address" required placeholder="Dirección y barrio" className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-white placeholder:text-zinc-500" /></label>
      <label className="block text-sm font-semibold text-zinc-300"><span className="flex items-center gap-2"><UserRound className="h-4 w-4" />Cliente</span><input name="customer" required placeholder="Nombre y teléfono" className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-white placeholder:text-zinc-500" /></label>
      <KeyTypeSelector /><TechnicianAssign />
      <button className="w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-zinc-950 hover:bg-amber-300">Crear orden</button>
    </form>
  )
}
