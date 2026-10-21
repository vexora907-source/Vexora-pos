import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareTicketCode } from '../src/shared/services/ticketCode.js'

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

  const missing = prepareTicketCode({ numero: 'sale-456' }, { tipoCodigo: 'BARCODE' })
  assert.equal(missing.barcode12, '')
})
