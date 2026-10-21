import { formatCOP } from '../../services/ticket.js'

export function SecondScreen({ items = [], total, businessName = 'Vexora POS' }) {
  const calculated = total ?? items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 p-6 text-white">
      <section className="w-full max-w-2xl text-center">
        <p className="text-sm font-bold uppercase tracking-[.3em] text-vexora-300">{businessName}</p>
        <h1 className="mt-4 text-5xl font-black">¡Gracias por tu compra!</h1>
        <div className="mt-8 rounded-3xl bg-white p-6 text-left text-zinc-900">
          {items.length ? items.map((item) => <div key={item.id ?? item.name} className="flex justify-between border-b border-zinc-100 py-3"><span>{item.quantity} × {item.name}</span><span>{formatCOP(item.price * item.quantity)}</span></div>) : <p className="py-8 text-center text-zinc-500">Tu compra aparecerá aquí.</p>}
          <div className="flex justify-between pt-5 text-xl font-black"><span>Total</span><span>{formatCOP(calculated)}</span></div>
        </div>
      </section>
    </main>
  )
}
