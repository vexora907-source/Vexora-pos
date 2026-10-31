import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitizeBusinessConfig } from './admin.js'

test('removes generated payment subdocument ids without mutating the config', () => {
  const config = {
    pagos: [
      { _id: '0123456789abcdef01234567', nombre: 'Efectivo', activo: true, comision: 0 },
      { _id: '1123456789abcdef01234567', nombre: 'Tarjeta', activo: true, comision: 3 },
    ],
  }

  const sanitized = sanitizeBusinessConfig(config)

  assert.deepEqual(sanitized, {
    pagos: [
      { nombre: 'Efectivo', activo: true, comision: 0 },
      { nombre: 'Tarjeta', activo: true, comision: 3 },
    ],
  })
  assert.notEqual(sanitized, config)
  assert.ok(config.pagos.every((payment) => payment._id))
})

test('preserves configs without a payment array', () => {
  const config = { negocio: { nombre: 'Negocio de prueba' } }
  assert.equal(sanitizeBusinessConfig(config), config)
})
