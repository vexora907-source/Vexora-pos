import { useEffect, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import JsBarcode from 'jsbarcode'
import { formatCOP } from '../../services/ticket.js'

const BARCODE_PATTERN = /^\d{12}$/

function formatDate(value) {
  const date = value ? new Date(value) : new Date()
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('es-CO')
}

export default function TicketPro({ datos = {}, tipoCodigo = 'QR' }) {
  const barcodeRef = useRef(null)
  const business = datos.negocio ?? {}
  const customer = datos.customer ?? datos.cliente ?? {}
  const items = datos.items ?? datos.productos ?? []
  const barcode = String(datos.barcode12 ?? datos.facturaCodigo12 ?? datos.ticketCode12 ?? '').replace(/\D/g, '')
  const qrValue = String(datos.qrValue ?? datos.verificationUrl ?? datos.qrUrl ?? datos.saleKey ?? datos.numero ?? '')
  const total = Number(datos.total ?? items.reduce((sum, item) => sum + (Number(item.price ?? item.precio) || 0) * (Number(item.quantity ?? item.cantidad) || 0), 0))

  useEffect(() => {
    if (!barcodeRef.current || tipoCodigo !== 'BARCODE' || !BARCODE_PATTERN.test(barcode)) return
    JsBarcode(barcodeRef.current, barcode, {
      format: 'CODE128',
      displayValue: true,
      fontSize: 12,
      height: 48,
      margin: 0,
    })
  }, [barcode, tipoCodigo])

  return <article className="mx-auto w-full max-w-[360px] overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-900 shadow-sm">
    <div className="h-1.5 bg-vexora-700" />
    <header className="px-6 pb-4 pt-6 text-center">
      {business.logo && <img src={business.logo} alt="" className="mx-auto mb-3 max-h-14 max-w-24 object-contain" />}
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-vexora-700">Vexora POS · Comprobante</p>
      <h2 className="mt-2 break-words text-xl font-black uppercase">{business.nombre || business.name || datos.businessName || 'VEXORA POS'}</h2>
      {(datos.legalName || business.razonSocial) && <p className="mt-1 text-xs text-zinc-600">{datos.legalName || business.razonSocial}</p>}
      {(datos.nit || business.nit) && <p className="mt-1 text-xs text-zinc-600">NIT {datos.nit || business.nit}</p>}
      {(datos.address || business.direccion || business.address) && <p className="mt-1 text-xs text-zinc-600">{datos.address || business.direccion || business.address}</p>}
      {(datos.phone || business.telefono || business.phone) && <p className="mt-1 text-xs text-zinc-600">{datos.phone || business.telefono || business.phone}</p>}
    </header>

    <div className="mx-5 border-t border-dashed border-zinc-300" />
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 px-6 py-4 text-xs">
      <dt className="font-semibold text-zinc-500">TICKET</dt><dd className="break-all text-right font-bold">{datos.numero || datos.saleKey || '—'}</dd>
      <dt className="font-semibold text-zinc-500">FECHA</dt><dd className="text-right">{formatDate(datos.createdAt)}</dd>
      {datos.copy && <><dt className="font-bold text-amber-800">TIPO</dt><dd className="text-right font-black text-amber-800">COPIA</dd></>}
    </dl>

    <section className="mx-5 border-y border-dashed border-zinc-300 py-3">
      <div className="mb-2 flex items-start justify-between gap-3 text-xs">
        <div className="min-w-0">
          <p className="font-bold uppercase tracking-wide text-zinc-500">Cliente</p>
          <p className="mt-1 break-words font-bold">{customer.name || customer.nombre || 'Cliente Final'}</p>
        </div>
        {(customer.documentNumber || customer.documento) && <div className="text-right">
          <p className="font-bold uppercase tracking-wide text-zinc-500">Documento</p>
          <p className="mt-1">{customer.documentType ? `${customer.documentType} ` : ''}{customer.documentNumber || customer.documento}</p>
        </div>}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-zinc-200 pb-1 text-[10px] font-bold uppercase text-zinc-500"><span>Producto</span><span>Total</span></div>
      <div className="divide-y divide-zinc-100">
        {items.map((item, index) => {
          const quantity = Number(item.quantity ?? item.cantidad) || 0
          const price = Number(item.price ?? item.precio) || 0
          return <div key={item.id ?? item.lineId ?? `${item.name ?? item.nombre}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 py-2 text-xs">
            <div className="min-w-0">
              <p className="break-words font-semibold">{quantity} × {item.name ?? item.nombre}</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">{formatCOP(price)} c/u</p>
            </div>
            <p className="whitespace-nowrap text-right font-semibold">{formatCOP(price * quantity)}</p>
          </div>
        })}
        {!items.length && <p className="py-3 text-center text-xs text-zinc-500">Sin productos en el comprobante.</p>}
      </div>
    </section>

    <section className="px-6 py-4">
      <div className="flex items-center justify-between gap-3 text-xs text-zinc-600"><span>Medio de pago</span><span className="font-semibold">{datos.paymentMethod || 'No informado'}</span></div>
      {String(datos.paymentMethod ?? '').toLowerCase() === 'efectivo' && Number.isFinite(Number(datos.cashReceived)) && <>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-zinc-600"><span>Recibido en efectivo</span><span className="font-semibold tabular-nums">{formatCOP(Number(datos.cashReceived))}</span></div>
        <div className="mt-1 flex items-center justify-between gap-3 text-xs text-zinc-600"><span>Devuelta</span><span className="font-semibold tabular-nums">{formatCOP(Number(datos.changeDue) || 0)}</span></div>
      </>}
      <div className="mt-3 flex items-end justify-between gap-3 border-t border-zinc-200 pt-3">
        <span className="text-xs font-bold uppercase tracking-wide text-zinc-600">Total</span>
        <span className="text-xl font-black tabular-nums">{formatCOP(total)}</span>
      </div>
    </section>

    <div className="mx-5 border-t border-dashed border-zinc-300" />
    <section className="grid justify-items-center gap-2 px-6 py-4 text-center">
      {tipoCodigo === 'BARCODE'
        ? BARCODE_PATTERN.test(barcode)
          ? <svg ref={barcodeRef} role="img" aria-label={`Código de barras ${barcode}`} className="max-w-full" />
          : <p className="max-w-[240px] text-[10px] leading-4 text-amber-800">Pendiente: el backend debe asignar el consecutivo de 12 dígitos para generar el código de barras.</p>
        : qrValue
          ? <><QRCodeCanvas value={qrValue} size={132} level="M" includeMargin title="Código QR del ticket" /><p className="max-w-[240px] break-all text-[9px] text-zinc-500">{datos.verificationUrl || datos.qrUrl ? 'Escanea para consultar la verificación' : 'Código de referencia del ticket'}</p></>
          : <p className="text-[10px] text-zinc-500">Código QR no disponible.</p>}
    </section>

    <footer className="bg-zinc-50 px-6 py-4 text-center text-[10px] leading-4 text-zinc-600">
      <p className="font-semibold">{datos.footer || business.mensajeTicket || business.message || '¡Gracias por tu compra!'}</p>
      <p className="mt-1">{datos.isDianInvoice ? 'Factura electrónica sujeta a validación DIAN.' : 'Comprobante interno · No es factura electrónica DIAN.'}</p>
    </footer>
  </article>
}