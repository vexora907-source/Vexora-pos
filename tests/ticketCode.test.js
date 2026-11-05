import assert from 'node:assert/strict'
import test from 'node:test'
import { mapTicketBusiness, prepareTicketCode } from '../src/shared/services/ticketCode.js'

test('prepares a QR from a verification URL or ticket reference', () => {
  const qr = prepareTicketCode({ saleKey: 'sale-123', verificationUrl: 'https://example.test/verify/123' }, { tipoCodigo: 'QR' })
  assert.equal(qr.qrValue, 'https://example.test/verify/123')

  const reference = prepareTicketCode({ saleKey: 'sale-456' }, { tipoCodigo: 'QR' })
  assert.equal(reference.qrValue, 'sale-456')
})

test('accepts only a backend-provided 12 digit barcode', () => {
  const barcode = prepareTicketCode({ barcode12: '750000010234' }, { tipoCodigo: 'BARCODE' })
  assert.equal(barcode.tipoCodigo, 'BARCODE')
  assert.equal(barcode.barcode12, '750000010234')

  const barcodeOverridesQr = prepareTicketCode({ barcode12: '750000010234' }, { tipoCodigo: 'QR' })
  assert.equal(barcodeOverridesQr.tipoCodigo, 'BARCODE')
  assert.equal(barcodeOverridesQr.barcode12, '750000010234')

  const missing = prepareTicketCode({ numero: 'sale-456' }, { tipoCodigo: 'BARCODE' })
  assert.equal(missing.barcode12, '')

  const malformed = prepareTicketCode({ barcode12: '750000010234-extra' }, { tipoCodigo: 'BARCODE' })
  assert.equal(malformed.barcode12, '')

  const numeric = prepareTicketCode({ barcode12: 750000010234 }, { tipoCodigo: 'BARCODE' })
  assert.equal(numeric.barcode12, '')

  const legacyAlias = prepareTicketCode({ facturaCodigo12: '750000010234' }, { tipoCodigo: 'BARCODE' })
  assert.equal(legacyAlias.barcode12, '')
})

test('uses saved per-gremio business details while keeping tenant fallbacks', () => {
  const business = mapTicketBusiness(
    { name: 'Nombre del negocio', address: 'Dirección anterior', phone: '3000000000' },
    { nombre: 'Tienda por gremio', logo: 'https://example.test/logo.png', mensajeTicket: 'Gracias' },
  )

  assert.equal(business.name, 'Tienda por gremio')
  assert.equal(business.logo, 'https://example.test/logo.png')
  assert.equal(business.message, 'Gracias')
  assert.equal(business.address, 'Dirección anterior')
  assert.equal(business.phone, '3000000000')
})
