import { getBusinessConfig } from './admin.js'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import { appStorage, isDemoMode } from './tenantStorage.js'

const CONFIG_KEY = 'vexora.business.config'
const BARCODE_PATTERN = /^\d{12}$/

export async function getTicketCodeSettings(gremio) {
  let config
  if (isDemoMode()) {
    config = JSON.parse(appStorage().getItem(`${CONFIG_KEY}:${gremio}`) ?? 'null') ?? {}
  } else {
    const result = await getBusinessConfig(gremio)
    config = result.config ?? {}
  }

  return { tipoCodigo: config.ticket?.tipoCodigo === 'BARCODE' ? 'BARCODE' : 'QR' }
}

export function prepareTicketCode(ticket, settings = {}) {
  const tipoCodigo = settings.tipoCodigo === 'BARCODE' ? 'BARCODE' : 'QR'
  const rawBarcode = ticket.barcode12 ?? ticket.facturaCodigo12 ?? ticket.ticketCode12 ?? ''
  const barcode12 = String(rawBarcode).replace(/\D/g, '')
  const qrValue = String(ticket.verificationUrl ?? ticket.qrUrl ?? ticket.saleKey ?? ticket.numero ?? '')

  return {
    ...ticket,
    tipoCodigo,
    barcode12: BARCODE_PATTERN.test(barcode12) ? barcode12 : '',
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
