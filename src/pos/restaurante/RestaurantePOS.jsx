import { useEffect, useMemo, useState } from 'react'
import { ChefHat, LayoutGrid, PackagePlus, PencilRuler, Utensils } from 'lucide-react'
import { FloorPlan } from './components/floor/FloorPlan.jsx'
import { FloorSelector } from './components/floor/FloorSelector.jsx'
import { TableDesigner } from './components/floor/TableDesigner.jsx'
import { TableDetail } from './components/service/TableDetail.jsx'
import { PaymentTable } from './components/service/PaymentTable.jsx'
import { KDS } from './components/kitchen/KDS.jsx'
import { DailyMenuManager } from './components/menu/DailyMenuManager.jsx'
import { AdCarousel } from '../../shared/components/Publicity/AdCarousel.jsx'
import { formatCOP } from '../../shared/services/ticket.js'
import { SaleReceipt } from '../../shared/components/Payment/SaleReceipt.jsx'
import { useTenantGremio } from '../../shared/hooks/useTenantGremio.js'
import { useTableSocket } from './hooks/useTableSocket.js'
import { menuItems } from './components/MenuGrid.jsx'
import { useInventory } from '../../shared/hooks/useInventory.js'
import { InventoryManager } from '../../shared/components/Inventory/InventoryManager.jsx'
import { EmptyInventoryState } from '../../shared/components/Inventory/EmptyInventoryState.jsx'
import { assertCashRegisterOpen, recordCashSale } from '../../shared/services/cashRegister.js'
import { apiRequest } from '../../shared/services/api.js'
import { connectRealtimeSocket } from '../../shared/services/realtime.js'
import { printConfiguredUsbTicket } from '../../shared/services/printers.js'

function newLineId() {
  return globalThis.crypto?.randomUUID?.() ?? `line-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function RestaurantePOS() {
  const { dian, business } = useTenantGremio()
  const { floors, tables, designed, updateData } = useTableSocket()
  const { products: dishes, allProducts, addProduct, importProducts, adjustStock, updateProduct, deleteProduct, loadSampleInventory, validateSale, recordSale, loading: inventoryLoading, error: inventoryError, remote: inventoryRemote } = useInventory('restaurante', menuItems.map((item) => ({ ...item, quantity: 50, category: 'Menú' })))
  const [floorId, setFloorId] = useState('interior')
  const [tableId, setTableId] = useState(1)
  const [designOpen, setDesignOpen] = useState(!designed)
  const [kitchenOpen, setKitchenOpen] = useState(false)
  const [paying, setPaying] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [dailyMenuOpen, setDailyMenuOpen] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [kitchenError, setKitchenError] = useState('')
  const [readyNotice, setReadyNotice] = useState('')

  useEffect(() => {
    if (!inventoryRemote) return undefined
    const socket = connectRealtimeSocket()
    if (!socket) return undefined
    socket.on('restaurant-order-ready', ({ tableId: readyTableId, lineIds, productos, total, printerWarning }) => {
      updateData((current) => ({
        ...current,
        tables: current.tables.map((item) => String(item.id) === readyTableId
          ? {
            ...item,
            items: item.items.map((line) => lineIds.includes(line.lineId)
              ? { ...line, readyAt: new Date().toISOString() }
              : line),
          }
          : item),
      }))
      setReadyNotice(`Mesa ${readyTableId}: ${lineIds.length} plato(s) listo(s) para entregar.`)
      if (printerWarning) setKitchenError(`El pedido está listo, pero falló la impresión de caja: ${printerWarning}`)
      void printConfiguredUsbTicket('restaurante', 'caja', {
        numero: `MESA-${readyTableId}`,
        mesa: readyTableId,
        cliente: { nombre: 'Cliente de restaurante' },
        productos,
        total,
      }).catch((error) => setKitchenError(error instanceof Error ? error.message : 'No se pudo imprimir el aviso USB de caja.'))
    })
    socket.on('restaurant-printer-error', ({ target, message }) => {
      setKitchenError(`Error de impresión ${target === 'caja' ? 'en caja' : 'en cocina'}: ${message}`)
    })
    socket.on('connect_error', (cause) => setKitchenError(`No se pudo conectar con la cocina en tiempo real: ${cause.message}`))
    return () => socket.disconnect()
  }, [inventoryRemote, updateData])

  const currentFloor = floors.find((floor) => floor.id === floorId) ?? floors[0]
  const floorTables = tables.filter((table) => table.floorId === currentFloor?.id)
  const table = tables.find((item) => item.id === tableId && item.floorId === currentFloor?.id) ?? floorTables[0]
  const total = useMemo(() => table?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) ?? 0, [table])

  function updateTables(updater) {
    updateData((current) => ({
      ...current,
      tables: typeof updater === 'function' ? updater(current.tables) : updater,
    }))
  }

  function chooseFloor(id) {
    setFloorId(id)
    const first = tables.find((item) => item.floorId === id)
    if (first) setTableId(first.id)
  }

  function addItem(dish, note) {
    if (!table) return
    const alreadyOrdered = table.items.filter((item) => item.id === dish.id).reduce((sum, item) => sum + item.quantity, 0)
    if (Number.isFinite(dish.quantity) && alreadyOrdered >= dish.quantity) return
    updateTables((current) => current.map((item) => item.id === table.id
      ? { ...item, items: [...item.items, { ...dish, lineId: newLineId(), quantity: 1, note, sentAt: null, readyAt: null }] }
      : item))
  }

  function updateQuantity(lineId, amount) {
    if (!table) return
    updateTables((current) => current.map((item) => item.id === table.id
      ? { ...item, items: item.items.map((line) => line.lineId === lineId ? { ...line, quantity: Math.max(1, line.quantity + amount) } : line) }
      : item))
  }

  function removeItem(lineId) {
    if (!table) return
    updateTables((current) => current.map((item) => item.id === table.id
      ? { ...item, items: item.items.filter((line) => line.lineId !== lineId) }
      : item))
  }

  async function sendToKitchen() {
    if (!table) return
    const pending = table.items.filter((line) => !line.sentAt)
    if (!pending.length) return
    const sentAt = new Date().toISOString()
    if (inventoryRemote) {
      try {
        const result = await apiRequest('/api/restaurante/orders', {
          method: 'POST',
          body: JSON.stringify({
            tableId: String(table.id),
            tableName: table.name,
            items: pending.map((line) => ({
              lineId: line.lineId,
              productId: String(line.id),
              quantity: line.quantity,
              note: line.note ?? '',
            })),
          }),
        })
        if (result.printerWarning) setKitchenError(`La comanda quedó enviada, pero falló la impresión: ${result.printerWarning}`)
        else setKitchenError('')
      } catch (error) {
        setKitchenError(error instanceof Error ? error.message : 'No se pudo enviar la comanda a cocina.')
        return
      }
    }
    updateTables((current) => current.map((item) => item.id === table.id
      ? {
          ...item,
          startedAt: item.startedAt ?? sentAt,
          items: item.items.map((line) => line.sentAt ? line : { ...line, sentAt }),
        }
      : item))
    setReadyNotice(`Comanda de ${table.name} enviada a cocina.`)
  }

  async function markReady(targetId, lineIds) {
    const readyAt = new Date().toISOString()
    updateTables((current) => current.map((item) => String(item.id) === String(targetId)
      ? { ...item, items: item.items.map((line) => lineIds.includes(line.lineId) ? { ...line, readyAt } : line) }
      : item))
    setKitchenError('')
  }

  async function finishSale(paymentMethod, people, cashDetails) {
    try {
      const soldItems = table.items.reduce((items, line) => {
        const existing = items.find((item) => item.id === line.id)
        if (existing) existing.quantity += line.quantity
        else items.push({ id: line.id, quantity: line.quantity })
        return items
      }, [])
      validateSale(soldItems)
      assertCashRegisterOpen('restaurante', total)
      const sale = await recordSale(soldItems, paymentMethod)
      recordCashSale('restaurante', total, paymentMethod)
      setReceipt({ table: { ...table }, paymentMethod, people, sale, cashReceived: cashDetails?.cashReceived, changeDue: cashDetails?.changeDue })
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'No se pudo registrar el pago.')
      return
    }
    setPaymentError('')
    setPaying(false)
  }

  function settleTable(targetId) {
    updateTables((current) => current.map((item) => item.id === targetId
      ? { ...item, items: [], startedAt: null }
      : item))
  }

  function saveDesign(next, close = false) {
    updateData(next)
    if (close) setDesignOpen(false)
  }

  if (kitchenOpen) {
    return <KDS tables={tables} onBump={markReady} onBack={() => setKitchenOpen(false)} remote={inventoryRemote} />
  }
  if (dailyMenuOpen) {
    return <DailyMenuManager dishes={dishes} onAdd={addProduct} onUpdate={updateProduct} onBack={() => setDailyMenuOpen(false)} loading={inventoryLoading} error={inventoryError} />
  }

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-700"><Utensils className="h-4 w-4" />Restaurante</p><h1 className="mt-1 text-3xl font-black">Salón, mesas y comandas</h1></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setKitchenOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"><ChefHat className="h-4 w-4" />Pantalla cocina</button>
          <button type="button" onClick={() => setDailyMenuOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm font-bold text-amber-900 hover:bg-amber-100"><Utensils className="h-4 w-4" />Menú del día</button>
          <button type="button" onClick={() => setInventoryOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm font-bold text-amber-900"><PackagePlus className="h-4 w-4" />Inventario</button>
          <button type="button" onClick={() => setDesignOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-900"><PencilRuler className="h-4 w-4" />Personalizar plano</button>
          <a href="/onboarding" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-500">Cambiar gremios</a>
        </div>
      </header>
      {(inventoryLoading || inventoryError) && <p role={inventoryError ? 'alert' : 'status'} className={`mb-4 rounded-xl px-4 py-3 text-sm ${inventoryError ? 'bg-rose-50 text-rose-800' : 'bg-blue-50 text-blue-800'}`}>{inventoryError || 'Cargando inventario del negocio…'}</p>}
      {!dishes.length && !inventoryLoading && !inventoryError && <EmptyInventoryState onLoadSamples={loadSampleInventory} title="Aún no hay platos para vender" />}
      {kitchenError && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{kitchenError}</p>}
      {readyNotice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{readyNotice}</p>}
      <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-white p-4">
        <FloorSelector floors={floors} selected={currentFloor?.id} onSelect={chooseFloor} />
        <p className="text-right text-sm text-zinc-500">{floorTables.length} mesas · <span className="font-bold text-emerald-700">{floorTables.filter((item) => !item.items.length).length} libres</span> · <span className="font-bold text-amber-700">{floorTables.filter((item) => item.items.length).length} ocupadas</span><span className="mt-1 block text-xs">Sincronización local entre pestañas; entre dispositivos requiere backend.</span></p>
      </section>
      <div className="grid items-start gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className="space-y-4 xl:sticky xl:top-4 xl:z-10 xl:self-start">
          {floorTables.length
            ? <FloorPlan tables={floorTables} selected={table?.id} onSelect={setTableId} onMove={(id, position) => updateTables((current) => current.map((item) => item.id === id ? { ...item, ...position } : item))} />
            : <div className="rounded-2xl border border-dashed border-amber-300 bg-white p-8 text-center"><LayoutGrid className="mx-auto h-8 w-8 text-amber-600" /><p className="mt-3 font-bold">Esta zona todavía no tiene mesas.</p><button type="button" onClick={() => setDesignOpen(true)} className="mt-3 font-bold text-amber-700">Configurar plano</button></div>}
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">Selecciona una mesa para abrir su detalle, agregar platos y enviar la comanda a cocina.</p>
        </section>
        <aside className="space-y-4">
          {table && <TableDetail table={table} dishes={dishes} onAdd={addItem} onUpdateQuantity={updateQuantity} onRemove={removeItem} onSend={sendToKitchen} onPay={() => setPaying(true)} />}
          <AdCarousel gremio="restaurante" />
        </aside>
      </div>
      {designOpen && <TableDesigner floors={floors} tables={tables} onSave={saveDesign} onCancel={() => { updateData((current) => ({ ...current, designed: true })); setDesignOpen(false) }} />}
      {inventoryOpen && <InventoryManager title="Inventario y menú del restaurante" gremio="restaurante" products={allProducts} onAddProduct={addProduct} onImportProducts={importProducts} onAdjustStock={adjustStock} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct} onLoadSamples={loadSampleInventory} onClose={() => setInventoryOpen(false)} remote={inventoryRemote} loadError={inventoryError} />}
      {paying && table && <PaymentTable table={table} total={total} error={paymentError} onCancel={() => { setPaying(false); setPaymentError('') }} onPay={finishSale} />}
      {receipt && <SaleReceipt items={receipt.table.items.map(({ lineId, note, ...item }) => ({ ...item, id: lineId, name: note ? `${item.name} · ${note}` : item.name }))} sale={receipt.sale} cashReceived={receipt.cashReceived} changeDue={receipt.changeDue} paymentMethod={receipt.paymentMethod} dian={dian} gremio="restaurante" businessName={business?.name} onIssued={() => settleTable(receipt.table.id)} onClose={() => { if (!dian?.enabled) settleTable(receipt.table.id); setReceipt(null) }} />}
    </main>
  )
}
