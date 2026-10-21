import { Users } from 'lucide-react'
import { formatCOP } from '../../../../shared/services/ticket.js'

export function SplitBill({ total, people, onPeopleChange }) {
  const each = total / people

  return (
    <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-3">
      <label className="flex items-center gap-2 text-sm font-bold">
        <Users className="h-4 w-4 text-amber-600" />
        Dividir entre
        <input
          type="number"
          min="1"
          max="30"
          value={people}
          onChange={(event) => onPeopleChange(Math.min(30, Math.max(1, Number(event.target.value) || 1)))}
          className="ml-auto w-16 rounded-lg border border-zinc-200 p-2 text-center"
        />
        personas
      </label>
      {people > 1 && <p className="mt-2 text-right text-xs text-zinc-600">División informativa: {formatCOP(each)} / persona. El pago registra el total de la mesa.</p>}
    </section>
  )
}
