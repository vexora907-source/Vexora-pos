import { useState } from 'react'
import { CreditCard, Smartphone, Wallet } from 'lucide-react'
import { formatCOP } from '../../services/ticket.js'

export const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo', icon: Wallet },
  { id: 'nequi', label: 'Nequi', icon: Smartphone },
  { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { id: 'transferencia', label: 'Transferencia', icon: Smartphone },
]

export function Payment({ total = 0, onPay = () => {} }) {
  const [cashReceived, setCashReceived] = useState('')
  const received = Number(cashReceived)
  const validCash = cashReceived !== '' && Number.isFinite(received) && received >= total

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <p className="text-sm font-semibold text-zinc-500">Total a pagar</p><p className="mt-1 text-3xl font-black">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(total)}</p>
      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-zinc-500">Registrar venta · selecciona el medio de pago</p>
      <label className="mt-4 block text-sm font-semibold">Efectivo recibido
        <input type="number" inputMode="numeric" min={total} step="1" value={cashReceived} onChange={(event) => setCashReceived(event.target.value)} placeholder={String(total)} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 tabular-nums outline-none focus:border-vexora-500" />
      </label>
      {validCash
        ? <p role="status" className="mt-2 flex justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900"><span>Devuelta</span><strong>{formatCOP(received - total)}</strong></p>
        : <p className="mt-2 text-xs text-zinc-500">Ingresa el efectivo entregado; debe cubrir el total.</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">{PAYMENT_METHODS.map(({ id, label, icon: Icon }) => {
        const disabled = !total || (id === 'efectivo' && !validCash)
        const cashDetails = id === 'efectivo' ? { cashReceived: received, changeDue: received - total } : undefined
        return <button key={id} type="button" disabled={disabled} onClick={() => onPay(id, cashDetails)} className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-3 py-3 text-sm font-semibold hover:border-vexora-500 hover:bg-vexora-50 disabled:cursor-not-allowed disabled:opacity-40"><Icon className="h-4 w-4" />Cobrar venta · {label}</button>
      })}</div>
    </section>
  )
}
