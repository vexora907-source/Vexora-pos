import { useEffect, useRef, useState } from 'react'
import { Printer, QrCode, X } from 'lucide-react'
import { formatCOP } from '../../services/ticket.js'
import { submitDianInvoice } from '../../services/dianService.js'
import { getBusinessConfig } from '../../services/admin.js'
import { appStorage, isDemoMode } from '../../services/tenantStorage.js'
import { DianStatus } from './DianStatus.jsx'
import { TicketFacturaElectronica } from './TicketFacturaElectronica.jsx'

function getIssuedInvoice(response) {
  return response?.invoice ?? response?.data?.invoice ?? response?.data ?? response ?? {}
}

function getVerificationUrl(issued) {
  return issued.qrUrl ?? issued.qr_url ?? issued.verificationUrl ?? issued.verification_url ?? ''
}

export function InvoicePreview({ invoice, dian, business, gremio, canPrintThermalInvoice = false, onClose = () => {}, onIssued = () => {} }) {
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [businessConfig, setBusinessConfig] = useState(null)
  const [businessConfigError, setBusinessConfigError] = useState('')
  const [sending, setSending] = useState(false)
  const [printing, setPrinting] = useState(false)
  const onIssuedRef = useRef(onIssued)
  const total = invoice.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  onIssuedRef.current = onIssued

  useEffect(() => {
    if (!canPrintThermalInvoice || !gremio) return undefined
    let cancelled = false
    setBusinessConfigError('')
    if (isDemoMode()) {
      try {
        const saved = JSON.parse(appStorage().getItem(`vexora.business.config:${gremio}`) ?? 'null')
        if (!cancelled) setBusinessConfig(saved?.negocio ?? {})
      } catch (cause) {
        if (!cancelled) setBusinessConfigError(cause instanceof Error ? cause.message : 'No se pudo leer la configuración del negocio.')
      }
      return () => { cancelled = true }
    }
    getBusinessConfig(gremio).then((response) => {
      if (!cancelled) setBusinessConfig(response.config?.negocio ?? {})
    }).catch((cause) => {
      if (!cancelled) setBusinessConfigError(cause instanceof Error ? cause.message : 'No se pudo cargar la configuración del negocio.')
    })
    return () => { cancelled = true }
  }, [canPrintThermalInvoice, gremio])

  useEffect(() => {
    if (dian.status !== 'active') return undefined
    let cancelled = false
    setSending(true)
    submitDianInvoice({
      nit: dian.nit,
      legalName: dian.legalName,
      prefix: dian.prefix,
      customer: invoice.customer,
      items: invoice.items,
      paymentMethod: invoice.paymentMethod,
    }).then((response) => {
      if (cancelled) return
      const issued = getIssuedInvoice(response)
      const status = String(issued.status ?? issued.estado ?? '').toLowerCase()
      if (response?.success === false || issued.success === false || ['rejected', 'rechazada', 'failed', 'error', 'invalid'].includes(status)) {
        throw new Error(issued.message ?? issued.mensaje ?? 'El proveedor no aceptó la factura.')
      }
      if (!issued.cufe && !issued.CUFE) {
        throw new Error('El backend no devolvió el CUFE; la factura no se considera emitida y no se puede imprimir.')
      }
      if (!getVerificationUrl(issued)) {
        throw new Error('El backend no devolvió el enlace QR de verificación; la factura no se considera completa.')
      }
      setResult(response)
      onIssuedRef.current(response)
    }).catch((cause) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : 'No se pudo enviar la factura a la DIAN.')
    }).finally(() => {
      if (!cancelled) setSending(false)
    })
    return () => { cancelled = true }
  }, [dian, invoice.items, invoice.paymentMethod])

  if (printing && result) {
    const details = businessConfig ?? {}
    return <TicketFacturaElectronica
      invoice={invoice}
      dian={dian}
      business={{
        ...business,
        name: details.nombre || business?.name,
        nit: details.nit || business?.nit,
        address: details.direccion || business?.address,
        phone: details.telefono || business?.phone,
        logo: details.logo || business?.logo,
        regimen: details.regimen || business?.regimen,
        message: details.mensajeTicket || business?.message,
      }}
      result={result}
      autoPrint
      onClose={() => setPrinting(false)}
    />
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-zinc-950/60 p-4">
      <section role="dialog" aria-modal="true" aria-label="Vista previa de factura" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <header className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-vexora-700">Vista previa · No es documento tributario</p><h2 className="mt-1 text-xl font-black">Factura electrónica</h2></div><button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-zinc-100"><X className="h-5 w-5" /></button></header>
        <div className="mt-5 rounded-xl border border-zinc-200 p-4"><p className="font-bold">{dian.legalName}</p><p className="text-sm text-zinc-500">NIT {dian.nit} · Prefijo {dian.prefix}</p><div className="mt-3 rounded-lg bg-zinc-50 p-3"><p className="text-xs font-bold text-zinc-500">CLIENTE</p><p className="mt-1 text-sm font-bold">{invoice.customer?.name ?? 'Cliente Final'}</p>{invoice.customer?.documentNumber && <p className="text-xs text-zinc-500">{invoice.customer.documentType} {invoice.customer.documentNumber}</p>}</div><div className="my-4 border-t border-dashed" />{invoice.items.map((item) => <p key={item.id ?? item.name} className="flex justify-between gap-2 py-1 text-sm"><span>{item.quantity} × {item.name}</span><span>{formatCOP(item.price * item.quantity)}</span></p>)}<div className="my-3 border-t border-dashed" /><p className="flex justify-between font-black"><span>TOTAL</span><span>{formatCOP(total)}</span></p><div className="mt-5 flex items-center gap-3 rounded-lg bg-zinc-50 p-3"><QrCode className="h-12 w-12 shrink-0 text-zinc-400" /><p className="text-xs text-zinc-500">{sending ? 'Enviando factura al backend DIAN…' : result ? 'Respuesta de emisión recibida del backend.' : 'El código QR se genera con el enlace de verificación devuelto por el backend.'}</p></div><p className="mt-3 break-all text-xs text-zinc-500">CUFE: {result?.cufe ?? 'Pendiente de emisión por backend'}</p></div>
        {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">No se emitió la factura: {error}. La venta sigue pendiente; corrige la conexión e inténtalo de nuevo.</p>}
        {businessConfigError && canPrintThermalInvoice && <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No se cargaron algunos datos comerciales para el ticket: {businessConfigError}. La factura se imprimirá con los datos disponibles.</p>}
        <div className="mt-4"><DianStatus dian={dian} /></div>
        {result && <p role="status" className="mt-2 text-sm font-semibold text-emerald-700">Factura emitida: se recibieron el CUFE y el enlace QR del backend.</p>}
        {result && canPrintThermalInvoice && <button type="button" onClick={() => setPrinting(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-vexora-600 px-4 py-3 font-bold text-white hover:bg-vexora-700"><Printer className="h-4 w-4" />Imprimir factura electrónica</button>}
      </section>
    </div>
  )
}
