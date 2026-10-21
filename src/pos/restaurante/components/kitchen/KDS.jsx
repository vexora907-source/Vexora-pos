import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChefHat, Clock3 } from 'lucide-react'
import { apiRequest } from '../../../../shared/services/api.js'
import { connectRealtimeSocket } from '../../../../shared/services/realtime.js'
import { printConfiguredUsbTicket } from '../../../../shared/services/printers.js'
import { TicketKitchen } from './TicketKitchen.jsx'

function mapKitchenOrders(orders) {
  const tablesById = new Map()
  for (const order of orders) {
    const table = tablesById.get(order.tableId) ?? {
      id: order.tableId,
      name: order.tableName,
      items: [],
    }
    table.items.push(...order.items.map((item) => ({
      ...item,
      id: item.productId,
      sentAt: item.sentAt ?? order.createdAt,
    })))
    tablesById.set(order.tableId, table)
  }
  return [...tablesById.values()]
}

function ticketForPrinter(order) {
  return {
    numero: order._id,
    mesa: order.tableName,
    productos: order.items.map((item) => ({
      nombre: item.name,
      cantidad: item.quantity,
      nota: item.note,
    })),
  }
}

export function KDS({ tables, onBump, onBack, remote = false }) {
  const [kitchenOrders, setKitchenOrders] = useState([])
  const [error, setError] = useState('')
  const visibleTables = useMemo(
    () => remote ? mapKitchenOrders(kitchenOrders) : tables,
    [kitchenOrders, remote, tables],
  )
  const active = visibleTables.filter((table) => table.items.some((item) => item.sentAt && !item.readyAt))
  const waitingItems = active.reduce((sum, table) => sum + table.items.filter((item) => item.sentAt && !item.readyAt).length, 0)

  useEffect(() => {
    if (!remote) return undefined
    let activeRequest = true
    const loadOrders = () => apiRequest('/api/restaurante/orders')
      .then((result) => {
        if (activeRequest) {
          setKitchenOrders(result.orders ?? [])
          setError('')
        }
      })
      .catch((cause) => {
        if (activeRequest) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las comandas.')
      })
    const socket = connectRealtimeSocket()
    void loadOrders()
    const refreshTimer = window.setInterval(() => { void loadOrders() }, 10000)
    socket?.on('connect', loadOrders)
    socket?.on('restaurant-order-created', (order) => {
      setKitchenOrders((current) => current.some((item) => item._id === order._id)
        ? current
        : [order, ...current])
      void printConfiguredUsbTicket('restaurante', 'cocina', ticketForPrinter(order))
        .catch((cause) => setError(cause instanceof Error ? cause.message : 'No se pudo imprimir la comanda USB.'))
    })
    socket?.on('restaurant-order-ready', ({ tableId, lineIds, readyAt }) => {
      setKitchenOrders((current) => current.map((order) => order.tableId === tableId
        ? {
          ...order,
          items: order.items.map((item) => lineIds.includes(item.lineId) ? { ...item, readyAt } : item),
        }
        : order))
    })
    socket?.on('restaurant-printer-error', ({ message }) => setError(`Error de impresión en cocina: ${message}`))
    socket?.on('connect_error', (cause) => setError(`No se pudo conectar al KDS en tiempo real: ${cause.message}`))
    return () => {
      activeRequest = false
      window.clearInterval(refreshTimer)
      socket?.disconnect()
    }
  }, [remote])

  async function bump(tableId, lineIds) {
    try {
      let printerWarning = ''
      if (remote) {
        const result = await apiRequest('/api/restaurante/orders/ready', {
          method: 'PATCH',
          body: JSON.stringify({ tableId: String(tableId), lineIds }),
        })
        printerWarning = result.printerWarning
        const readyAt = new Date().toISOString()
        setKitchenOrders((current) => current.map((order) => order.tableId === String(tableId)
          ? {
            ...order,
            items: order.items.map((item) => lineIds.includes(item.lineId) ? { ...item, readyAt } : item),
          }
          : order))
      }
      await onBump(tableId, lineIds)
      setError(printerWarning ? `La comanda está lista, pero falló la impresión de caja: ${printerWarning}` : '')
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo marcar la comanda como lista.')
      return false
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-7">
      <header className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-amber-400"><ChefHat className="h-4 w-4" />Vexora · Cocina</p><h1 className="mt-1 text-3xl font-black">Comandas activas</h1></div>
        <div className="flex items-center gap-4"><span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"><Clock3 className="h-4 w-4 text-amber-400" />{waitingItems} plato(s) pendientes</span><button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-zinc-950 hover:bg-amber-400"><ArrowLeft className="h-4 w-4" />Volver a mesas</button></div>
      </header>
      {error && <p role="alert" className="mx-auto mt-4 max-w-3xl rounded-xl bg-rose-950 px-4 py-3 text-sm text-rose-100">{error}</p>}
      {active.length ? <div className="mx-auto mt-6 grid max-w-[1600px] gap-4 sm:grid-cols-2 xl:grid-cols-4">{active.map((table) => <TicketKitchen key={table.id} table={table} onBump={bump} />)}</div> : <div className="mx-auto mt-20 max-w-lg text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400"><ChefHat className="h-8 w-8" /></div><h2 className="mt-5 text-2xl font-black">Cocina al día</h2><p className="mt-2 text-zinc-400">Las nuevas comandas aparecerán aquí al enviarlas desde una mesa.</p></div>}
    </main>
  )
}
