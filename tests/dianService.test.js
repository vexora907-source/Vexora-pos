import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDianInvoiceRequest } from '../src/shared/services/dianService.js'

test('preserves the POS gremio when no positional override is supplied', () => {
  const invoice = { gremio: 'papeleria', nit: '900123456', items: [] }
  assert.deepEqual(buildDianInvoiceRequest(invoice), invoice)
})

test('uses an explicitly supplied gremio for the invoice request', () => {
  const invoice = { gremio: 'tienda', nit: '900123456', items: [] }
  assert.deepEqual(buildDianInvoiceRequest(invoice, 'papeleria'), {
    ...invoice,
    gremio: 'papeleria',
  })
})

test('rejects invoice requests without a gremio', () => {
  assert.throws(() => buildDianInvoiceRequest({ nit: '900123456', items: [] }), /identificar el gremio/)
})
