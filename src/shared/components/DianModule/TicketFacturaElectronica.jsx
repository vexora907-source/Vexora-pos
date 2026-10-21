import { useEffect, useState } from 'react'
import { Printer, X } from 'lucide-react'
import QRCode from 'qrcode'
import { formatCOP } from '../../services/ticket.js'

function firstValue(source, keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source[key] !== null && source[key] !== '') return source[key]
  }
  return ''
}

export function TicketFacturaElectronica({ invoice, dian, business = {}, result, onClose = () => {}, autoPrint = false, sample = false }) {
  const [qrImage, setQrImage] = useState('')
  const [qrError, setQrError] = useState('')
  const issued = result?.invoice ?? result?.data?.invoice ?? result?.data ?? result ?? {}
  const qrUrl = firstValue(issued, ['qrUrl', 'qr_url', 'verificationUrl', 'verification_url'])
  const items = invoice.items ?? []
  const total = Number(firstValue(issued, ['total', 'amount'])) || items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)
  const suppliedTax = firstValue(issued, ['totalIva', 'totalTax', 'taxTotal'])
  const itemTaxRates = items.map((item) => item.iva ?? item.taxRate)
  const hasItemTaxRates = itemTaxRates.every((rate) => rate !== undefined && rate !== null && Number.isFinite(Number(rate)))
  const totalIva = suppliedTax !== '' ? Number(suppliedTax) : hasItemTaxRates
    ? items.reduce((sum, item) => {
      const lineTotal = Number(item.price || 0) * Number(item.quantity || 0)
      const rate = Number(item.iva ?? item.taxRate)
      return sum + (rate > 0 ? lineTotal * rate / (100 + rate) : 0)
    }, 0)
    : null
  const suppliedSubtotal = firstValue(issued, ['subtotal', 'subTotal', 'netAmount'])
  const subtotal = suppliedSubtotal !== '' ? Number(suppliedSubtotal) : totalIva === null ? null : total - totalIva

  useEffect(() => {
    let active = true
    setQrImage('')
    setQrError('')
    if (!qrUrl) return () => { active = false }
    QRCode.toDataURL(String(qrUrl), { width: 256, margin: 1 })
      .then((dataUrl) => {
        if (active) setQrImage(dataUrl)
      })
      .catch((cause) => {
        if (active) setQrError(cause instanceof Error ? cause.message : 'No se pudo generar el código QR.')
      })
    return () => { active = false }
  }, [qrUrl])

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = '@media print { @page { size: 80mm auto; margin: 0; } }'
    document.head.append(style)
    return () => style.remove()
  }, [])

  useEffect(() => {
    if (!autoPrint || (qrUrl && !qrImage && !qrError)) return undefined
    const timer = window.setTimeout(() => window.print(), 100)
    return () => window.clearTimeout(timer)
  }, [autoPrint, qrError, qrImage, qrUrl])

  const number = firstValue(issued, ['number', 'invoiceNumber', 'consecutive', 'numero'])
  const issueDate = firstValue(issued, ['issuedAt', 'issueDate', 'date', 'fecha'])
  const issueTime = firstValue(issued, ['issueTime', 'time', 'hora'])
  const cufe = firstValue(issued, ['cufe', 'CUFE'])
  const resolution = firstValue(issued, ['resolution', 'resolucion']) || dian.resolution || dian.resolucion
  const resolutionDate = firstValue(issued, ['resolutionDate', 'fechaResolucion']) || dian.resolutionDate || dian.fechaResolucion
  const rangeFrom = firstValue(issued, ['rangeFrom', 'rangoDesde']) || dian.rangeFrom || dian.rangoDesde
  const rangeTo = firstValue(issued, ['rangeTo', 'rangoHasta']) || dian.rangeTo || dian.rangoHasta
  const provider = firstValue(issued, ['technologyProvider', 'provider', 'proveedorTecnologico']) || dian.technologyProvider || ''
  const paymentMethod = invoice.paymentMethod || 'No informado'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-zinc-950/60 p-4">
      <section role="dialog" aria-modal="true" aria-label="Factura electrónica para impresión" className="invoice-ticket-dialog w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <div className="print:hidden flex justify-end gap-2">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-vexora-600 px-3 py-2 text-sm font-bold text-white"><Printer className="h-4 w-4" />{sample ? 'Imprimir muestra' : 'Imprimir factura'}</button>
          <button type="button" onClick={onClose} aria-label="Cerrar factura" className="rounded-lg p-2 hover:bg-zinc-100"><X className="h-5 w-5" /></button>
        </div>
        <article id="ticket-dian" className="mx-auto mt-4 w-full bg-white p-3 font-mono text-[11px] leading-tight text-black print:mt-0 print:w-full print:p-0">
          {sample && <div className="mb-3 border-2 border-dashed border-amber-700 p-2 text-center text-[10px] font-black uppercase">Muestra de impresión · Sin validez fiscal · No enviada a DIAN</div>}
          <header className="text-center">
            {business.logo && <img src={business.logo} alt="" className="mx-auto mb-1 max-h-16 max-w-16 object-contain" />}
            <h1 className="text-[14px] font-black uppercase">{business.name || dian.legalName || 'Negocio'}</h1>
            <p>NIT: {dian.nit || business.nit || 'No informado'}</p>
            {business.address && <p>{business.address}</p>}
            {(business.phone || business.email) && <p>{business.phone || business.email}</p>}
            {business.regimen && <p className="mt-1">{business.regimen}</p>}
          </header>
          <div className="my-2 border-t border-dashed border-black" />
          <h2 className="text-center text-[12px] font-bold">{sample ? 'FACTURA ELECTRÓNICA · MUESTRA' : 'FACTURA ELECTRÓNICA DE VENTA'}</h2>
          <div className="mt-1 break-words">
            <p><b>No:</b> {number || `${dian.prefix || ''} · consecutivo no informado`}</p>
            {issueDate && <p><b>Fecha:</b> {issueDate}{issueTime ? ` · ${issueTime}` : ''}</p>}
            {sample
              ? <p><b>CUFE:</b> No aplica en una muestra</p>
              : <><p><b>CUFE:</b></p><p className="break-all text-[8px]">{cufe || 'No informado por el proveedor DIAN'}</p></>}
            {resolution && <p><b>Res. DIAN:</b> {resolution}{resolutionDate ? ` del ${resolutionDate}` : ''}</p>}
            {(rangeFrom || rangeTo) && <p><b>Rango:</b> {rangeFrom || '—'} al {rangeTo || '—'}</p>}
          </div>
          <div className="my-2 border-t border-dashed border-black" />
          <div>
            <p><b>Cliente:</b> {invoice.customer?.name || 'Cliente Final'}</p>
            {(invoice.customer?.documentType || invoice.customer?.documentNumber) && <p><b>{invoice.customer.documentType || 'Documento'}:</b> {invoice.customer.documentNumber || 'No informado'}</p>}
            {invoice.customer?.email && <p><b>Correo:</b> {invoice.customer.email}</p>}
            <p><b>Medio de pago:</b> {paymentMethod}</p>
          </div>
          <div className="my-2 border-t border-dashed border-black" />
          <table className="w-full">
            <thead><tr className="border-b border-black"><th className="text-left">Desc</th><th className="text-right">Cant</th><th className="text-right">Total</th></tr></thead>
            <tbody>{items.map((item, index) => {
              const rate = item.iva ?? item.taxRate
              return <tr key={item.id ?? `${item.name}-${index}`}>
                <td className="py-1 text-left">{item.name}<br /><span className="text-[9px]">{formatCOP(Number(item.price) || 0)} x {item.quantity} {rate === undefined || rate === null ? '' : Number(rate) > 0 ? `IVA ${rate}%` : 'Excluido'}</span></td>
                <td className="text-right align-top">{item.quantity}</td>
                <td className="text-right align-top">{formatCOP((Number(item.price) || 0) * (Number(item.quantity) || 0))}</td>
              </tr>
            })}</tbody>
          </table>
          <div className="my-2 border-t border-dashed border-black" />
          <div className="text-right">
            {subtotal !== null && <p>Subtotal: {formatCOP(subtotal)}</p>}
            <p>IVA: {totalIva === null ? 'No discriminado por el backend' : formatCOP(totalIva)}</p>
            <p className="text-[14px] font-black">TOTAL: {formatCOP(total)} COP</p>
          </div>
          <div className="my-2 border-t border-dashed border-black" />
          {qrImage && <div className="text-center"><img src={qrImage} alt="Código QR para verificar la factura" className="mx-auto h-32 w-32" /><p className="break-all text-[8px]">Verifica en: {qrUrl}</p></div>}
          {qrError && <p className="text-center text-[9px]">No se pudo generar el QR localmente: {qrError}</p>}
          {!qrImage && !qrError && !qrUrl && <p className="text-center text-[9px]">El backend no suministró el enlace de verificación DIAN.</p>}
          {cufe && <p className="mt-1 break-all text-center text-[8px]">CUFE: {cufe}</p>}
          <div className="my-2 border-t border-dashed border-black" />
          <footer className="text-center text-[9px]">
            {sample && <p className="mb-1 font-black">MUESTRA · SIN VALIDEZ FISCAL</p>}
            {provider && <p>Proveedor tecnológico: {provider}</p>}
            <p>{business.message || business.mensajeTicket || 'Gracias por su compra'}</p>
            <p className="mt-1">Powered by VexoraIA</p>
          </footer>
        </article>
      </section>
    </div>
  )
}
