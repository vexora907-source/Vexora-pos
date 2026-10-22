import { useEffect, useRef, useState } from 'react'
import { Printer, X } from 'lucide-react'
import { formatCOP } from '../../services/ticket.js'
import { getCustomers, getRegisteredCustomers, saveCustomer } from '../../services/customerService.js'
import { getTicketCodeSettings } from '../../services/ticketCode.js'
import { isDemoMode } from '../../services/tenantStorage.js'
import { useTenantGremio } from '../../hooks/useTenantGremio.js'
import { InvoicePreview } from '../DianModule/InvoicePreview.jsx'
import { TicketFacturaElectronica } from '../DianModule/TicketFacturaElectronica.jsx'
import TicketPro from './TicketPro.jsx'
import { printReceipt } from '../../services/printers.js'
import { canonicalPlan } from '../../../app/components/PricingCalculator.jsx'

export function SaleReceipt({ items = [], paymentMethod, cashReceived, changeDue, dian, gremio, sale = {}, businessName = 'Vexora POS', paperWidth = 80, onClose = () => {}, onIssued = () => {} }) {
  const tenant = useTenantGremio()
  const tenantKey = tenant.business?.email || dian?.nit || businessName
  const [customers, setCustomers] = useState(() => getRegisteredCustomers(tenantKey))
  const [customerId, setCustomerId] = useState('')
  const [addingCustomer, setAddingCustomer] = useState(false)
  const [customerError, setCustomerError] = useState('')
  const [customersLoading, setCustomersLoading] = useState(false)
  const [customer, setCustomer] = useState({ type: 'final', name: 'Cliente Final' })
  const [showInvoice, setShowInvoice] = useState(false)
  const [showSampleInvoice, setShowSampleInvoice] = useState(false)
  const [printerError, setPrinterError] = useState('')
  const [printerMessage, setPrinterMessage] = useState('')
  const [ticketSettings, setTicketSettings] = useState({ tipoCodigo: 'QR' })
  const [ticketSettingsLoaded, setTicketSettingsLoaded] = useState(false)
  const fallbackSaleKey = useRef(globalThis.crypto?.randomUUID?.() ?? `sale-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const autoPrintTriggered = useRef(false)
  const saleGremio = gremio ?? tenant.activeGremio
  const business = tenant.business ?? {}
  const demo = isDemoMode()
  const canPrintThermalInvoice = ['PRO', 'VEXORA'].includes(canonicalPlan(String(tenant.plan ?? '').toUpperCase()))
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const saleKey = sale.saleKey ?? sale.id ?? sale._id ?? fallbackSaleKey.current
  const printerTicket = {
    negocio: {
      nombre: business.name || businessName,
      razonSocial: dian?.legalName || business.razonSocial,
      nit: dian?.nit || business.nit,
      direccion: business.address || business.direccion,
      telefono: business.phone || business.telefono,
      logo: business.logo,
      mensajeTicket: business.message || business.mensajeTicket,
    },
    numero: sale.barcode12 ?? sale.facturaCodigo12 ?? sale.number ?? saleKey,
    saleKey,
    barcode12: sale.barcode12 ?? sale.facturaCodigo12 ?? sale.ticketCode12 ?? '',
    verificationUrl: sale.verificationUrl ?? sale.qrUrl ?? '',
    tipoCodigo: ticketSettings.tipoCodigo,
    cliente: { nombre: customer.name },
    productos: items.map((item) => ({
      nombre: item.name,
      cantidad: item.quantity,
      total: item.price * item.quantity,
    })),
    total,
    paymentMethod,
    cashReceived,
    changeDue,
  }

  useEffect(() => {
    if (demo || !saleGremio) return undefined
    let active = true
    setCustomersLoading(true)
    getCustomers(tenantKey, saleGremio)
      .then((savedCustomers) => {
        if (active) setCustomers(savedCustomers)
      })
      .catch((error) => {
        if (active) setCustomerError(error instanceof Error ? error.message : 'No se pudieron cargar los clientes guardados.')
      })
      .finally(() => {
        if (active) setCustomersLoading(false)
      })
    return () => { active = false }
  }, [demo, saleGremio, tenantKey])
  const sampleDian = {
    enabled: true,
    status: 'sample',
    nit: dian?.nit || business.nit || '000000000',
    legalName: dian?.legalName || business.razonSocial || business.name || businessName,
    prefix: 'MUE',
  }
  const sampleItems = items.length
    ? items.map((item) => ({ ...item, iva: 19 }))
    : [{ id: 'muestra-1', name: 'Producto de muestra', price: 11900, quantity: 1, iva: 19 }]
  const sampleTotal = sampleItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)
  const sampleIva = sampleItems.reduce((sum, item) => {
    const lineTotal = Number(item.price || 0) * Number(item.quantity || 0)
    return sum + lineTotal * 19 / 119
  }, 0)
  const sampleInvoice = {
    items: sampleItems,
    paymentMethod: paymentMethod || 'Efectivo',
    customer: {
      type: 'sample',
      name: 'Cliente de prueba',
      documentType: 'CC',
      documentNumber: '0000000000',
      email: 'cliente.muestra@example.invalid',
    },
  }
  const sampleResult = {
    invoice: {
      number: 'MUESTRA-000001',
      issuedAt: sale.createdAt ?? sale.occurredAt ?? new Date().toISOString(),
      subtotal: sampleTotal - sampleIva,
      totalIva: sampleIva,
      total: sampleTotal,
      qrUrl: `https://example.invalid/dian-demo/${encodeURIComponent(String(saleKey))}`,
    },
  }

  useEffect(() => {
    if (!saleGremio) return undefined
    let active = true
    getTicketCodeSettings(saleGremio)
      .then((settings) => { if (active) setTicketSettings(settings) })
      .catch(() => { if (active) setTicketSettings({ tipoCodigo: 'QR' }) })
      .finally(() => { if (active) setTicketSettingsLoaded(true) })
    return () => { active = false }
  }, [saleGremio])

  async function printSaleReceipt(copy = false, requestDevice = true) {
    setPrinterError('')
    setPrinterMessage('')
    try {
      await printReceipt(saleGremio, copy ? { ...printerTicket, copy: true } : printerTicket, { requestDevice })
      setPrinterMessage(copy ? 'Copia del ticket enviada a la impresora.' : 'Ticket enviado a la impresora.')
    } catch (cause) {
      setPrinterError(cause instanceof Error ? cause.message : 'No se pudo imprimir el ticket.')
    }
  }

  useEffect(() => {
    if (!saleGremio || !ticketSettingsLoaded || autoPrintTriggered.current) return
    autoPrintTriggered.current = true
    void printSaleReceipt(false, false)
  }, [saleGremio, saleKey, ticketSettingsLoaded, ticketSettings.tipoCodigo])

  async function registerCustomer(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setCustomerError('')
    try {
      const saved = await saveCustomer(tenantKey, saleGremio, {
        documentType: form.get('documentType'),
        documentNumber: form.get('documentNumber'),
        name: form.get('name'),
        phone: form.get('phone'),
        email: form.get('email'),
      })
      setCustomers((current) => [
        ...current.filter((item) => !(item.documentType === saved.documentType && item.documentNumber === saved.documentNumber)),
        saved,
      ])
      setCustomer(saved)
      setCustomerId(saved.id)
      setAddingCustomer(false)
    } catch (error) {
      setCustomerError(error instanceof Error ? error.message : 'No se pudo registrar el cliente.')
    }
  }

  if (dian?.enabled && showInvoice) {
    return <InvoicePreview invoice={{ items, paymentMethod, customer }} dian={dian} business={business} gremio={saleGremio} canPrintThermalInvoice={canPrintThermalInvoice} onClose={onClose} onIssued={onIssued} />
  }
  if (demo && showSampleInvoice) {
    return <TicketFacturaElectronica
      invoice={sampleInvoice}
      dian={sampleDian}
      business={{ ...business, name: business.name || businessName, nit: sampleDian.nit }}
      result={sampleResult}
      sample
      onClose={() => setShowSampleInvoice(false)}
    />
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-zinc-950/60 p-4">
      <section role="dialog" aria-modal="true" aria-label={dian?.enabled ? 'Factura de venta' : 'Ticket de venta'} className="w-full max-w-lg rounded-2xl bg-slate-100 p-4 shadow-2xl sm:p-6">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-vexora-700">Venta registrada</p><h2 className="mt-1 text-lg font-black text-slate-900">Comprobante de venta</h2><p className="mt-1 text-xs text-slate-500">Vista previa · Papel térmico {paperWidth} mm</p></div>
          <button type="button" onClick={onClose} aria-label="Cerrar comprobante" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 print:hidden"><X className="h-4 w-4" /></button>
        </header>
        <div className="max-h-[58vh] overflow-y-auto rounded-lg">
          <TicketPro datos={{ ...printerTicket, businessName: business.name || businessName, customer, items, total, createdAt: sale.createdAt ?? sale.occurredAt, isDianInvoice: Boolean(dian?.enabled) }} tipoCodigo={ticketSettings.tipoCodigo} />
        </div>
        <section className="mt-3 rounded-xl border border-slate-200 bg-white p-3 print:hidden">
          <label className="block text-xs font-bold text-slate-600">Cliente para el comprobante
            <select aria-label="Seleccionar cliente registrado" value={customerId} onChange={(event) => { const selected = customers.find((item) => item.id === event.target.value); setCustomerId(event.target.value); setCustomer(selected ?? { type: 'final', name: 'Cliente Final' }) }} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium"><option value="">Cliente Final</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.documentNumber}</option>)}</select>
          </label>
          <p className="mt-2 text-[10px] text-zinc-400">{customersLoading ? 'Cargando clientes guardados…' : customers.length ? demo ? 'Clientes guardados en este navegador demo.' : 'Clientes guardados en la base de datos de este gremio.' : 'No hay clientes registrados; se usará Cliente Final.'}</p>
          {customerError && !addingCustomer && <p role="alert" className="mt-2 text-xs text-rose-700">{customerError}</p>}
          <button type="button" onClick={() => { setAddingCustomer((value) => !value); setCustomerError('') }} className="mt-2 text-xs font-bold text-vexora-700 hover:underline">{addingCustomer ? 'Cancelar registro' : '+ Registrar nuevo cliente'}</button>
          {addingCustomer && <form onSubmit={(event) => void registerCustomer(event)} className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3">
            <label className="text-xs font-semibold">Tipo de documento<select name="documentType" className="mt-1 w-full rounded-lg border p-2"><option>CC</option><option>NIT</option><option>CE</option><option>Pasaporte</option></select></label>
            <label className="text-xs font-semibold">Documento<input name="documentNumber" required inputMode="numeric" className="mt-1 w-full rounded-lg border p-2" /></label>
            <label className="col-span-2 text-xs font-semibold">Nombre o razón social<input name="name" required className="mt-1 w-full rounded-lg border p-2" /></label>
            <label className="text-xs font-semibold">Teléfono<input name="phone" type="tel" className="mt-1 w-full rounded-lg border p-2" /></label>
            <label className="text-xs font-semibold">Correo<input name="email" type="email" className="mt-1 w-full rounded-lg border p-2" /></label>
            {customerError && <p role="alert" className="col-span-2 text-xs text-rose-700">{customerError}</p>}
            <button disabled={customersLoading} className="col-span-2 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Guardar cliente y seleccionar</button>
          </form>}
        </section>
        {printerError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800 print:hidden">{printerError}</p>}
        {printerMessage && <p role="status" className="mt-3 text-xs font-semibold text-emerald-700 print:hidden">{printerMessage}</p>}
        <div className="mt-3 grid gap-2 sm:grid-cols-2 print:hidden">
          {dian?.enabled ? <button type="button" onClick={() => setShowInvoice(true)} className="flex items-center justify-center gap-2 rounded-xl bg-vexora-600 px-4 py-3 text-sm font-bold text-white hover:bg-vexora-700 sm:col-span-2">Continuar con factura DIAN</button> : <button type="button" onClick={() => void printSaleReceipt()} className="flex items-center justify-center gap-2 rounded-xl bg-vexora-600 px-4 py-3 text-sm font-bold text-white hover:bg-vexora-700"><Printer className="h-4 w-4" />Imprimir ticket</button>}
          <button type="button" onClick={() => void printSaleReceipt(true)} className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50"><Printer className="h-4 w-4" />Sacar copia</button>
          {demo && <button type="button" onClick={() => setShowSampleInvoice(true)} className="flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 hover:bg-amber-100 sm:col-span-2">Vista previa DIAN de muestra</button>}
        </div>
      </section>
    </div>
  )
}
