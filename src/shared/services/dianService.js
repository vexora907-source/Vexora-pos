import { apiRequest } from './api.js'
import { isDemoMode } from './tenantStorage.js'

export async function getDianConfiguration() {
  if (isDemoMode()) throw new Error('La cuenta demo no permite conectar una cuenta Dataico.')
  return apiRequest('/api/dian/configuration')
}

export async function configureDian(configuration) {
  if (isDemoMode()) throw new Error('La cuenta demo no permite conectar una cuenta Dataico.')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(configuration.accountId?.trim() ?? '')) {
    throw new Error('El ID de cuenta Dataico debe ser un UUID válido.')
  }
  if (!/^\d{9,10}$/.test(configuration.nit)) throw new Error('El NIT debe contener entre 9 y 10 dígitos, sin puntos ni guion.')
  if (!configuration.legalName?.trim()) throw new Error('Ingresa la razón social tal como aparece en el RUT.')
  if (!/^[A-Za-z0-9]{1,5}$/.test(configuration.prefix)) throw new Error('El prefijo debe tener entre 1 y 5 letras o números.')
  if (!/^\d{1,20}$/.test(configuration.resolutionNumber ?? '')) throw new Error('Ingresa el número de resolución DIAN sincronizado en Dataico.')
  if (configuration.technicalKey && !/^[a-fA-F0-9]{32,128}$/.test(configuration.technicalKey)) throw new Error('La clave técnica debe tener entre 32 y 128 caracteres hexadecimales.')
  if (configuration.environment === 'PRODUCCION') {
    const rangeStart = Number(configuration.rangeStart)
    const rangeEnd = Number(configuration.rangeEnd)
    const currentNumber = Number(configuration.currentNumber)
    if (!Number.isInteger(rangeStart) || !Number.isInteger(rangeEnd) || !Number.isInteger(currentNumber) || !configuration.validFrom || !configuration.validTo) {
      throw new Error('Para Producción completa el rango, consecutivo actual y vigencia de la resolución.')
    }
    if (rangeStart > rangeEnd || currentNumber < rangeStart || currentNumber > rangeEnd) {
      throw new Error('El consecutivo actual debe estar dentro del rango autorizado.')
    }
    if (configuration.validFrom > configuration.validTo) throw new Error('La fecha inicial debe ser anterior a la fecha final de la resolución.')
    if (!configuration.technicalKey && !configuration.technicalKeyConfigured) {
      throw new Error('Ingresa la clave técnica DIAN para habilitar Producción.')
    }
  }
  if (configuration.authToken && configuration.authToken.trim().length < 12) throw new Error('El token API de Dataico parece incompleto.')
  const { technicalKeyConfigured, ...configurationValues } = configuration
  const payload = {
    ...configurationValues,
    rangeStart: configuration.rangeStart === '' ? undefined : Number(configuration.rangeStart),
    rangeEnd: configuration.rangeEnd === '' ? undefined : Number(configuration.rangeEnd),
    currentNumber: configuration.currentNumber === '' ? undefined : Number(configuration.currentNumber),
  }
  return apiRequest('/api/dian/configuration', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function syncDianNumberings() {
  if (isDemoMode()) throw new Error('La cuenta demo no permite sincronizar resoluciones.')
  return apiRequest('/api/dian/numberings/sync', { method: 'POST', body: '{}' })
}

export function buildDianInvoiceRequest(invoice, gremio) {
  const invoiceGremio = gremio ?? invoice?.gremio
  if (!invoiceGremio) throw new Error('No se pudo identificar el gremio de la venta.')
  return { ...invoice, gremio: invoiceGremio }
}

export async function submitDianInvoice(invoice, gremio) {
  if (isDemoMode()) throw new Error('La cuenta demo no permite enviar facturas al backend.')
  if (!invoice || !invoice.nit || !Array.isArray(invoice.items) || invoice.items.length === 0) {
    throw new Error('La factura necesita NIT e ítems de venta.')
  }
  return apiRequest('/api/dian/invoices', {
    method: 'POST',
    body: JSON.stringify(buildDianInvoiceRequest(invoice, gremio)),
  })
}
