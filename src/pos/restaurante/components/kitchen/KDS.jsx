import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChefHat, Clock3 } from 'lucide-react'
import { apiRequest } from '../../../../shared/services/api.js'
import { connectRealtimeSocket } from '../../../../shared/services/realtime.js'
import { printConfiguredUsbTicket, printKitchenTicket } from '../../../../shared/services/printers.js'
import { kitchenTicketForTable, readyTicketForPrinter, ticketForPrinter } from './printerTickets.js'
import {
  kitchenItemName,
  mapQuickMealOrders,
  quickMealKitchenTicket,
  quickMealReadyTicket,
} from './kitchenOrderAdapters.js'
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
      name: kitchenItemName(item),
      id: item.productId,
      sentAt: item.sentAt ?? order.createdAt,
    })))
    tablesById.set(order.tableId, table)
  }
  return [...tablesById.values()]
}

export function KDS({ tables, onBump, onBack, remote = false, gremio = 'restaurante' }) {
  const apiGremio = gremio === 'comidas_rapidas' ? 'comidas-rapidas' : gremio
  const [kitchenOrders, setKitchenOrders] = useState([])
  const [error, setError] = useState('')
  const visibleTables = useMemo(
    () => {
      if (!remote) return tables
      return gremio === 'comidas_rapidas'
        ? mapQuickMealOrders(kitchenOrders)
        : mapKitchenOrders(kitchenOrders)
    },
    [gremio, kitchenOrders, remote, tables],
  )
  const active = visibleTables.filter((table) => table.items.some((item) => item.sentAt && !item.readyAt))
  const waitingItems = active.reduce((sum, table) => sum + table.items.filter((item) => item.sentAt && !item.readyAt).length, 0)

  async function printTable(table) {
    try {
      await printKitchenTicket(gremio, kitchenTicketForTable(table))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo imprimir la comanda de cocina.')
    }
  }

  useEffect(() => {
    if (!remote) return undefined
    let activeRequest = true
    const loadOrders = () => {
      const requestOrders = gremio === 'comidas_rapidas'
        ? Promise.all(['RECEIVED', 'IN_KITCHEN'].map((status) =>
          apiRequest(`/api/${apiGremio}/orders?status=${status}`, { cache: 'no-store' })))
          .then((results) => ({
            orders: results.flatMap((result) => result.orders ?? [])
              .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
          }))
        : apiRequest(`/api/${apiGremio}/orders`, { cache: 'no-store' })
      return requestOrders
        .then((result) => {
          if (activeRequest) {
            setKitchenOrders(result.orders ?? [])
            setError('')
          }
        })
        .catch((cause) => {
          if (activeRequest) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las comandas.')
        })
    }
    const socket = connectRealtimeSocket()
    void loadOrders()
    const refreshTimer = window.setInterval(() => { void loadOrders() }, 5000)
    socket?.on('connect', loadOrders)
    const orderCreatedEvent = gremio === 'comidas_rapidas' ? 'quick-meal-order-created' : 'restaurant-order-created'
    const orderReadyEvent = gremio === 'comidas_rapidas' ? 'quick-meal-order-ready' : 'restaurant-order-ready'
    const printerErrorEvent = gremio === 'comidas_rapidas' ? 'printer-error' : 'restaurant-printer-error'
    socket?.on(orderCreatedEvent, (order) => {
      setKitchenOrders((current) => [
        order,
        ...current.filter((item) => String(item._id ?? item.id) !== String(order._id ?? order.id)),
      ])
      const ticket = gremio === 'comidas_rapidas' ? quickMealKitchenTicket(order) : ticketForPrinter(order)
      void printConfiguredUsbTicket(gremio, 'cocina', ticket)
        .catch((cause) => setError(cause instanceof Error ? cause.message : 'No se pudo imprimir la comanda USB.'))
    })
    socket?.on(orderReadyEvent, (payload) => {
      if (gremio === 'comidas_rapidas') {
        setKitchenOrders((current) => current.filter((order) =>
          String(order._id ?? order.id) !== String(payload._id ?? payload.id)))
        return
      }
      const { tableId, lineIds, readyAt } = payload
      setKitchenOrders((current) => current.map((order) => order.tableId === tableId
        ? { ...order, items: order.items.map((item) => lineIds.includes(item.lineId) ? { ...item, readyAt } : item) }
        : order))
    })
    socket?.on(printerErrorEvent, ({ target, message }) => {
      setError(`Error de impresión ${target === 'caja' ? 'en caja' : 'en cocina'}: ${message}`)
    })
    socket?.on('connect_error', (cause) => setError(`No se pudo conectar al KDS en tiempo real: ${cause.message}`))
    return () => {
      activeRequest = false
      window.clearInterval(refreshTimer)
      socket?.disconnect()
    }
  }, [apiGremio, gremio, remote])

  async function bump(tableId, lineIds) {
    try {
      let printerWarning = ''
      if (remote) {
        if (gremio === 'comidas_rapidas') {
          const result = await apiRequest(`/api/${apiGremio}/orders/${encodeURIComponent(tableId)}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'READY' }),
          })
          printerWarning = result.printerWarning
          setKitchenOrders((current) => current.filter((order) =>
            String(order._id ?? order.id) !== String(tableId)))
          try {
            await printConfiguredUsbTicket(gremio, 'caja', quickMealReadyTicket(result.order))
          } catch (cause) {
            const message = cause instanceof Error ? cause.message : 'No se pudo imprimir el aviso USB de caja.'
            printerWarning = [printerWarning, message].filter(Boolean).join(' ')
          }
        } else {
          const result = await apiRequest('/api/restaurante/orders/ready', {
            method: 'PATCH',
            body: JSON.stringify({ tableId: String(tableId), lineIds }),
          })
          printerWarning = result.printerWarning
          const readyAt = result.readyAt ?? new Date().toISOString()
          setKitchenOrders((current) => current.map((order) => order.tableId === String(tableId)
            ? {
              ...order,
              items: order.items.map((item) => lineIds.includes(item.lineId) ? { ...item, readyAt } : item),
            }
            : order))
          try {
            await printConfiguredUsbTicket(
              gremio,
              'caja',
              readyTicketForPrinter(
                kitchenOrders.find((order) => order.tableId === String(tableId)),
                result,
              ),
            )
          } catch (cause) {
            const message = cause instanceof Error ? cause.message : 'No se pudo imprimir el aviso USB de caja.'
            printerWarning = [printerWarning, message].filter(Boolean).join(' ')
          }
        }
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
        <div className="flex items-center gap-4"><span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"><Clock3 className="h-4 w-4 text-amber-400" />{waitingItems} plato(s) pendientes</span>{onBack && <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-zinc-950 hover:bg-amber-400"><ArrowLeft className="h-4 w-4" />Volver a mesas</button>}</div>
      </header>
      {error && <p role="alert" className="mx-auto mt-4 max-w-3xl rounded-xl bg-rose-950 px-4 py-3 text-sm text-rose-100">{error}</p>}
      {active.length ? <div className="mx-auto mt-6 grid max-w-[1600px] gap-4 sm:grid-cols-2 xl:grid-cols-4">{active.map((table) => <TicketKitchen key={table.id} table={table} onBump={bump} onPrint={printTable} />)}</div> : <div className="mx-auto mt-20 max-w-lg text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400"><ChefHat className="h-8 w-8" /></div><h2 className="mt-5 text-2xl font-black">Cocina al día</h2><p className="mt-2 text-zinc-400">Las nuevas comandas aparecerán aquí al enviarlas desde una mesa.</p></div>}
    </main>
  )
}
