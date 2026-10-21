import { useEffect, useMemo, useState } from 'react'
import { Banknote, CircleDollarSign, Coins, Printer } from 'lucide-react'
import { formatCOP } from '../../services/ticket.js'
import { BILLETES_COP, MONEDAS_COP } from '../../utils/denominaciones.js'
import { CASH_REGISTER_SALES_LIMIT, countDenominations, readCashRegister, saveCashRegister } from '../../services/cashRegister.js'
import { printUniversalTicket } from '../../services/thermalPrint.js'

const DENOMINATIONS = [...BILLETES_COP, ...MONEDAS_COP]

function emptyCounts() {
  return Object.fromEntries(DENOMINATIONS.map(({ valor }) => [valor, 0]))
}

function savedCounts(counts = {}) {
  return Object.fromEntries(Object.entries(counts).map(([value, count]) => [value, Number(count) || 0]))
}

function countsForAmount(amount) {
  let remaining = amount
  const counts = emptyCounts()
  for (const { valor } of DENOMINATIONS) {
    counts[valor] = Math.floor(remaining / valor)
    remaining %= valor
  }
  return counts
}

function DenominationCounter({ title, counts, onChange }) {
  const total = countDenominations(counts)
  return (
    <div className="mt-4 space-y-4">
      {[['Billetes', BILLETES_COP], ['Monedas', MONEDAS_COP]].map(([group, denominations]) => <fieldset key={group} className="rounded-xl border border-zinc-200 p-3">
        <legend className="px-1 text-sm font-bold">{title} · {group}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {denominations.map(({ valor, label }) => <div key={valor} className="grid grid-cols-[1fr_36px_42px_36px] items-center gap-2 rounded-xl bg-zinc-50 px-2.5 py-2 text-xs font-bold text-zinc-700">
            <span>{label}</span>
            <button type="button" aria-label={`Quitar un billete o moneda de ${label}`} disabled={!counts[valor]} onClick={() => onChange((current) => ({ ...current, [valor]: Math.max(0, current[valor] - 1) }))} className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 bg-white text-lg disabled:opacity-40">−</button>
            <output aria-label={`Cantidad de ${label}`} className="text-center text-sm tabular-nums">{counts[valor]}</output>
            <button type="button" aria-label={`Agregar un billete o moneda de ${label}`} onClick={() => onChange((current) => ({ ...current, [valor]: current[valor] + 1 }))} className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 bg-white text-lg">+</button>
          </div>)}
        </div>
      </fieldset>)}
      <p className="flex justify-between rounded-xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white"><span>Total contado</span><span>{formatCOP(total)}</span></p>
    </div>
  )
}

function ClosureReceipt({ closure, onClose }) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="cash-receipt-title" className="cash-receipt-dialog fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-zinc-950/60 p-4 print:static print:block print:bg-white print:p-0">
      <section className="cash-receipt w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <header className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest">Vexora POS</p>
          <h2 id="cash-receipt-title" className="mt-1 text-lg font-black">Cierre de caja</h2>
          <p className="mt-1 text-xs">{new Date(closure.fecha).toLocaleString('es-CO')}</p>
        </header>
        <div className="my-3 border-t border-dashed border-zinc-400" />
        <div className="space-y-1 font-mono text-xs">
          <p className="flex justify-between"><span>Base inicial</span><b>{formatCOP(closure.base)}</b></p>
          <p className="flex justify-between"><span>Ventas efectivo</span><b>{formatCOP(closure.ventas)}</b></p>
          <p className="flex justify-between"><span>Efectivo esperado</span><b>{formatCOP(closure.esperado)}</b></p>
          <p className="flex justify-between"><span>Contado físico</span><b>{formatCOP(closure.contado)}</b></p>
          <p className="flex justify-between"><span>Ventas digitales POS</span><b>{formatCOP(closure.ventasDigitales)}</b></p>
          <p className="flex justify-between"><span>Digital confirmado</span><b>{formatCOP(closure.digitalContado)}</b></p>
          <p className="flex justify-between font-black"><span>Diferencia efectivo</span><b>{formatCOP(closure.diferencia)}</b></p>
          <p className="flex justify-between font-black"><span>Diferencia digital</span><b>{formatCOP(closure.diferenciaDigital)}</b></p>
        </div>
        <div className="my-3 border-t border-dashed border-zinc-400" />
        <p className="text-xs font-black">DESGLOSE DE EFECTIVO</p>
        <div className="mt-2 space-y-1 font-mono text-xs">
          {DENOMINATIONS.filter(({ valor }) => closure.desglose[valor] > 0).map(({ valor, label }) => <p key={valor} className="flex justify-between"><span>{label} × {closure.desglose[valor]}</span><span>{formatCOP(valor * closure.desglose[valor])}</span></p>)}
          {!DENOMINATIONS.some(({ valor }) => closure.desglose[valor] > 0) && <p>Sin efectivo contado</p>}
        </div>
        <div className="my-3 border-t border-dashed border-zinc-400" />
        <p className={`text-center text-sm font-black ${closure.diferencia === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{closure.diferencia === 0 ? 'CAJA CUADRADA' : closure.diferencia > 0 ? 'SOBRANTE' : 'FALTANTE'}</p>
        <div className="mt-4 flex gap-2 print:hidden">
          <button type="button" onClick={() => printUniversalTicket({
            tipo: 'CIERRE',
            createdAt: closure.fecha,
            negocio: { nombre: 'VEXORA POS' },
            resumen: [
              { label: 'Base inicial', valor: formatCOP(closure.base) },
              { label: 'Ventas en efectivo', valor: formatCOP(closure.ventas) },
              { label: 'Efectivo esperado', valor: formatCOP(closure.esperado) },
              { label: 'Contado físico', valor: formatCOP(closure.contado) },
              { label: 'Ventas digitales POS', valor: formatCOP(closure.ventasDigitales) },
              { label: 'Digital confirmado', valor: formatCOP(closure.digitalContado) },
              { label: 'Diferencia efectivo', valor: formatCOP(closure.diferencia) },
              { label: 'Diferencia digital', valor: formatCOP(closure.diferenciaDigital) },
            ],
            desglose: DENOMINATIONS.filter(({ valor }) => closure.desglose[valor] > 0).map(({ valor, label }) => ({ label, cantidad: closure.desglose[valor], total: formatCOP(valor * closure.desglose[valor]) })),
            resultado: closure.diferencia === 0 ? 'CAJA CUADRADA' : closure.diferencia > 0 ? 'SOBRANTE' : 'FALTANTE',
          }, 'caja')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white"><Printer className="h-4 w-4" />Imprimir ticket</button>
          <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold">Cerrar</button>
        </div>
      </section>
    </div>
  )
}

export function CashRegister({ gremio = 'general' }) {
  const [cash, setCash] = useState(() => readCashRegister(gremio))
  const [openingCounts, setOpeningCounts] = useState(emptyCounts)
  const [closingCounts, setClosingCounts] = useState(emptyCounts)
  const [digitalCounted, setDigitalCounted] = useState('')
  const [closing, setClosing] = useState(false)
  const [message, setMessage] = useState('')
  const [receipt, setReceipt] = useState(null)

  useEffect(() => {
    const onUpdate = (event) => {
      if (event.detail?.gremio === gremio) setCash(event.detail.cash)
    }
    window.addEventListener('vexora:cash-register-updated', onUpdate)
    return () => window.removeEventListener('vexora:cash-register-updated', onUpdate)
  }, [gremio])

  const isOpen = cash?.isOpen === true
  const sales = cash?.sales ?? []
  const shiftSales = useMemo(() => sales.reduce((sum, sale) => sum + (Number(sale.amount) || 0), 0), [sales])
  const cashSales = useMemo(() => sales.filter((sale) => sale.paymentMethod === 'efectivo').reduce((sum, sale) => sum + sale.amount, 0), [sales])
  const digitalSales = useMemo(() => sales.filter((sale) => sale.paymentMethod !== 'efectivo' && sale.paymentMethod !== 'fiado').reduce((sum, sale) => sum + sale.amount, 0), [sales])
  const expectedCash = (cash?.base ?? cash?.openingAmount ?? 0) + cashSales
  const openingTotal = countDenominations(openingCounts)
  const physicalTotal = countDenominations(closingCounts)
  const history = cash?.history ?? []
  const stage = closing ? 'cierre' : isOpen ? 'abierta' : 'cerrada'

  function openCash() {
    const initialBase = openingTotal
    if (!Number.isInteger(initialBase) || initialBase < 1000) {
      setMessage('La base inicial debe ser de al menos $1.000 COP.')
      return
    }
    const fecha = new Date().toISOString()
    const opening = { fecha, tipo: 'APERTURA', base: initialBase, usuario: 'vexora' }
    const next = {
      isOpen: true,
      openedAt: fecha,
      base: initialBase,
      openingAmount: initialBase,
      sales: [],
      lastClosure: cash?.lastClosure ?? null,
      history: [...history, opening],
    }
    saveCashRegister(gremio, next)
    setCash(next)
    setOpeningCounts(emptyCounts())
    setMessage('Caja abierta correctamente.')
  }

  function closeCash() {
    const invalidCounts = Object.values(closingCounts).some((count) => count !== '' && (!Number.isInteger(Number(count)) || Number(count) < 0))
    if (invalidCounts) {
      setMessage('El conteo debe usar cantidades enteras iguales o mayores que cero.')
      return
    }
    if (digitalSales > 0 && digitalCounted === '') {
      setMessage('Ingresa el total digital confirmado en el datáfono, banco o billetera.')
      return
    }
    const digitalAmount = Number(digitalCounted) || 0
    const fecha = new Date().toISOString()
    const closure = {
      fecha,
      tipo: 'CIERRE',
      base: cash.base ?? cash.openingAmount ?? 0,
      ventas: cashSales,
      ventasDigitales: digitalSales,
      esperado: expectedCash,
      contado: physicalTotal,
      diferencia: physicalTotal - expectedCash,
      diferenciaDigital: digitalAmount - digitalSales,
      digitalContado: digitalAmount,
      desglose: savedCounts(closingCounts),
    }
    const next = {
      ...cash,
      isOpen: false,
      closedAt: fecha,
      lastClosure: closure,
      history: [...history, closure],
    }
    saveCashRegister(gremio, next)
    setCash(next)
    setClosingCounts(emptyCounts())
    setDigitalCounted('')
    setClosing(false)
    setMessage(closure.diferencia === 0 && closure.diferenciaDigital === 0
      ? 'Cierre correcto: efectivo y pagos digitales conciliados.'
      : `Descuadre efectivo ${formatCOP(closure.diferencia)} · digital ${formatCOP(closure.diferenciaDigital)}.`)
    setReceipt(closure)
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${stage === 'abierta' ? 'bg-emerald-100 text-emerald-700' : stage === 'cierre' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}><CircleDollarSign className="h-5 w-5" /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">Caja</h2><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${stage === 'abierta' ? 'bg-emerald-100 text-emerald-800' : stage === 'cierre' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'}`}>{stage === 'cierre' ? 'Cierre en curso' : stage}</span></div><p className="text-xs text-zinc-500">{isOpen ? `Abierta ${new Date(cash.openedAt).toLocaleString('es-CO')}` : 'Abre un turno registrando la base inicial.'}</p></div></div>
      {isOpen ? <>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-emerald-50 p-3"><p className="text-emerald-800">Base</p><strong className="mt-1 block text-sm text-emerald-950">{formatCOP(cash.base ?? cash.openingAmount)}</strong></div>
          <div className="rounded-xl bg-emerald-50 p-3"><p className="text-emerald-800">Efectivo esperado</p><strong className="mt-1 block text-sm text-emerald-950">{formatCOP(expectedCash)}</strong></div>
          <div className="rounded-xl bg-zinc-50 p-3"><p className="text-zinc-600">Ventas en efectivo</p><strong className="mt-1 block text-sm text-zinc-950">{formatCOP(cashSales)}</strong></div>
          <div className="rounded-xl bg-blue-50 p-3"><p className="text-blue-800">Ventas digitales</p><strong className="mt-1 block text-sm text-blue-950">{formatCOP(digitalSales)}</strong></div>
          <div className={`col-span-2 rounded-xl p-3 ${shiftSales >= CASH_REGISTER_SALES_LIMIT ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-900'}`}>
            <p className="flex justify-between gap-2"><span>Acumulado del turno</span><strong>{formatCOP(shiftSales)} / {formatCOP(CASH_REGISTER_SALES_LIMIT)}</strong></p>
            <p className="mt-1 text-[11px]">{shiftSales >= CASH_REGISTER_SALES_LIMIT ? 'Límite alcanzado. Cierra la caja para continuar vendiendo.' : `Disponible antes del límite: ${formatCOP(CASH_REGISTER_SALES_LIMIT - shiftSales)}.`}</p>
          </div>
        </div>
        {closing && <>
          <DenominationCounter title="Conteo de cierre" counts={closingCounts} onChange={setClosingCounts} />
          <label className="mt-4 block text-xs font-bold text-zinc-600">Total digital confirmado<input type="number" min="0" step="1" value={digitalCounted} onChange={(event) => setDigitalCounted(event.target.value)} placeholder={String(digitalSales)} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-normal" /><span className="mt-1 block font-normal">Esperado: {formatCOP(digitalSales)}</span></label>
          <div className="mt-3 rounded-xl bg-zinc-900 p-3 text-sm text-white"><p className="flex justify-between"><span>Esperado en efectivo</span><b>{formatCOP(expectedCash)}</b></p><p className="mt-1 flex justify-between"><span>Contado</span><b>{formatCOP(physicalTotal)}</b></p><p className={`mt-2 border-t border-white/15 pt-2 text-right font-black ${physicalTotal - expectedCash === 0 ? 'text-emerald-300' : physicalTotal > expectedCash ? 'text-amber-300' : 'text-rose-300'}`}>Diferencia: {formatCOP(physicalTotal - expectedCash)}</p></div>
          <button type="button" onClick={closeCash} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700"><Printer className="h-4 w-4" />Cerrar caja e imprimir ticket</button>
          <button type="button" onClick={() => { setClosing(false); setMessage('') }} className="mt-2 w-full rounded-xl px-4 py-2 text-sm font-semibold text-zinc-500">Cancelar conteo</button>
        </>}
        {!closing && <button type="button" onClick={() => { setClosingCounts(emptyCounts()); setDigitalCounted(digitalSales === 0 ? '0' : ''); setClosing(true); setMessage('') }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800"><Banknote className="h-4 w-4" />Contar y cerrar caja</button>}
      </> : <>
        <div className="mt-4">
          <p className="text-sm font-bold">Base inicial · Conteo de efectivo</p>
          <div className="mt-2 flex flex-wrap gap-2">{[50000, 100000, 200000].map((amount) => <button key={amount} type="button" onClick={() => setOpeningCounts(countsForAmount(amount))} className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:border-vexora-400 hover:bg-vexora-50">{formatCOP(amount)}</button>)}</div>
          <DenominationCounter title="Base inicial" counts={openingCounts} onChange={setOpeningCounts} />
          <p className="mt-3 flex justify-between rounded-xl bg-vexora-50 px-4 py-3 text-sm font-bold text-vexora-900"><span>Base inicial</span><span>{formatCOP(openingTotal)}</span></p>
        </div>
        <button type="button" onClick={openCash} disabled={openingTotal < 1000} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-vexora-600 px-4 py-3 text-sm font-bold text-white hover:bg-vexora-700 disabled:cursor-not-allowed disabled:opacity-50"><Coins className="h-4 w-4" />Abrir caja</button>
      </>}
      {history.length > 0 && <div className="mt-5 border-t border-zinc-100 pt-4"><h3 className="text-sm font-black">Historial por fecha</h3><div className="mt-2 max-h-48 space-y-2 overflow-y-auto">{[...history].reverse().slice(0, 8).map((item, index) => <div key={`${item.fecha}-${item.tipo}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs"><span><b>{item.tipo}</b><span className="ml-2 text-zinc-500">{new Date(item.fecha).toLocaleString('es-CO')}</span></span><strong>{formatCOP(item.tipo === 'APERTURA' ? item.base : item.contado)}</strong></div>)}</div></div>}
      {message && <p role="status" className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs font-semibold text-zinc-700">{message}</p>}
      {receipt && <ClosureReceipt closure={receipt} onClose={() => setReceipt(null)} />}
    </section>
  )
}
