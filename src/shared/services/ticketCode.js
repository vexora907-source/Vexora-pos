import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import { apiRequest } from './api.js'
import { appStorage, isDemoMode } from './tenantStorage.js'

const CONFIG_KEY = 'vexora.business.config'
const BARCODE_PATTERN = /^\d{12}$/

export async function getTicketConfiguration(gremio) {
  if (isDemoMode()) {
    return JSON.parse(appStorage().getItem(`${CONFIG_KEY}:${gremio}`) ?? 'null') ?? {}
  }
  const result = await apiRequest(`/api/printers/${encodeURIComponent(gremio)}/ticket-config`)
  return result.config ?? {}
}

export async function getTicketCodeSettings(gremio) {
  const config = await getTicketConfiguration(gremio)
  return { tipoCodigo: config.ticket?.tipoCodigo === 'BARCODE' ? 'BARCODE' : 'QR' }
}

export function mapTicketBusiness(tenantBusiness = {}, configuredBusiness = {}) {
  return {
    ...tenantBusiness,
    name: configuredBusiness.nombre || tenantBusiness.name,
    razonSocial: configuredBusiness.razonSocial || tenantBusiness.razonSocial,
    nit: configuredBusiness.nit || tenantBusiness.nit,
    logo: configuredBusiness.logo || tenantBusiness.logo,
    address: configuredBusiness.direccion || tenantBusiness.address,
    phone: configuredBusiness.telefono || tenantBusiness.phone,
    mensajeTicket: configuredBusiness.mensajeTicket || tenantBusiness.mensajeTicket,
    message: configuredBusiness.mensajeTicket || tenantBusiness.message,
  }
}

export function prepareTicketCode(ticket, settings = {}) {
  const tipoCodigo = settings.tipoCodigo === 'BARCODE' ? 'BARCODE' : 'QR'
  const rawBarcode = ticket.barcode12 ?? ''
  const barcode12 = typeof rawBarcode === 'string' && BARCODE_PATTERN.test(rawBarcode) ? rawBarcode : ''
  const qrValue = String(ticket.verificationUrl ?? ticket.qrUrl ?? ticket.saleKey ?? ticket.numero ?? '')

  return {
    ...ticket,
    tipoCodigo,
    barcode12,
    qrValue,
  }
}

export async function prepareTicketForPrinting(gremio, ticket) {
  let settings
  if (ticket.tipoCodigo === 'QR' || ticket.tipoCodigo === 'BARCODE') {
    settings = { tipoCodigo: ticket.tipoCodigo }
  } else {
    settings = { tipoCodigo: 'QR' }
    try {
      settings = await getTicketCodeSettings(gremio)
    } catch {
      // Keep printing available if the settings endpoint is temporarily unavailable.
    }
  }

  const prepared = prepareTicketCode(ticket, settings)
  if (prepared.tipoCodigo === 'BARCODE') {
    if (BARCODE_PATTERN.test(prepared.barcode12)) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      JsBarcode(svg, prepared.barcode12, { format: 'CODE128', displayValue: true, fontSize: 12, height: 44, margin: 0 })
      prepared.codeImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`
    }
  } else if (prepared.qrValue) {
    prepared.codeImage = await QRCode.toDataURL(prepared.qrValue, { width: 256, margin: 1 })
  }
  return prepared
}
