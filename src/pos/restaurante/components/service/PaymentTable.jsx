import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { formatCOP } from '../../../../shared/services/ticket.js'
import { Payment } from '../../../../shared/components/Payment/Payment.jsx'
import { SplitBill } from './SplitBill.jsx'

export function PaymentTable({ table, total, onPay, onCancel, error = '' }) {
  const [people, setPeople] = useState(1)
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="table-payment-title" className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-zinc-950/60 p-4">
      <section className="my-6 w-full max-w-lg rounded-3xl bg-zinc-50 p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-amber-700">Pago de mesa</p><h2 id="table-payment-title" className="mt-1 text-2xl font-black">{table.name}</h2></div><button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-bold text-zinc-500">Cerrar</button></div>
        <SplitBill total={total} people={people} onPeopleChange={setPeople} />
        <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm"><div className="flex justify-between"><span>Total mesa</span><strong>{formatCOP(total)}</strong></div></div>
        <Payment total={total} onPay={(method, cashDetails) => onPay(method, people, cashDetails)} />
        {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}
        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-zinc-500"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Al confirmar el pago, la mesa quedará libre.</p>
      </section>
    </div>
  )
}
