import test from 'node:test'
import assert from 'node:assert/strict'
import { adminPlanHasFeature } from './adminPlanFeatures.js'

test('administrative panel features unlock at the agreed plan levels', () => {
  assert.equal(adminPlanHasFeature('INICIO', 'accounting'), false)
  assert.equal(adminPlanHasFeature('NEGOCIO', 'accounting'), true)
  assert.equal(adminPlanHasFeature('NEGOCIO', 'a4InventoryReport'), true)
  assert.equal(adminPlanHasFeature('NEGOCIO', 'advancedCharts'), false)
  assert.equal(adminPlanHasFeature('PRO', 'advancedCharts'), true)
  assert.equal(adminPlanHasFeature('PRO', 'thermalInventoryReport'), true)
  assert.equal(adminPlanHasFeature('VEXORA', 'thermalInventoryReport'), true)
})
