import { apiRequest } from './api.js'
import { isDemoMode } from './tenantStorage.js'

export async function configureDian({ nit, legalName, prefix, certificate, certificatePassword }) {
  if (isDemoMode()) throw new Error('La cuenta demo no permite enviar datos ni certificados al backend.')
  if (!(certificate instanceof File) || !certificate.name.toLowerCase().endsWith('.p12')) {
    throw new Error('Selecciona el certificado digital en formato .p12.')
  }
  if (!/^\d{9,10}$/.test(nit)) throw new Error('El NIT debe contener entre 9 y 10 dígitos, sin puntos ni guion.')
  if (!legalName.trim()) throw new Error('Ingresa la razón social tal como aparece en el RUT.')
  if (!/^[A-Za-z0-9]{1,5}$/.test(prefix)) throw new Error('El prefijo debe tener entre 1 y 5 letras o números.')
  if (!certificatePassword) throw new Error('Ingresa la contraseña del certificado para enviarla de forma segura al backend.')

  const apiUrl = import.meta.env.VITE_API_URL
  if (!apiUrl) return { status: 'pending_backend', uploaded: false }

  const form = new FormData()
  form.append('nit', nit)
  form.append('legalName', legalName.trim())
  form.append('prefix', prefix.toUpperCase())
  form.append('certificate', certificate)
  form.append('certificatePassword', certificatePassword)
  const response = await fetch(new URL('/dian/configuration', apiUrl), { method: 'POST', body: form })
  if (!response.ok) throw new Error(`No se pudo configurar DIAN (${response.status}).`)
  const result = await response.json()
  return { ...result, uploaded: true }
}

export async function submitDianInvoice(invoice) {
  if (isDemoMode()) throw new Error('La cuenta demo no permite enviar facturas al backend.')
  if (!invoice || !invoice.nit || !Array.isArray(invoice.items) || invoice.items.length === 0) {
    throw new Error('La factura necesita NIT e ítems de venta.')
  }
  return apiRequest('/dian/invoices', { method: 'POST', body: JSON.stringify(invoice) })
}
