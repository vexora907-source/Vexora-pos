const PLAN_RANK = { INICIO: 0, NEGOCIO: 1, PRO: 2, VEXORA: 3 }

const PLAN_ALIASES = { BASICO: 'INICIO', TIENDA: 'INICIO', ENTERPRISE: 'VEXORA' }

export const FEATURE_PLANS = Object.freeze({
  accounting: 'NEGOCIO',
  a4InventoryReport: 'NEGOCIO',
  advancedCharts: 'PRO',
  thermalInventoryReport: 'PRO',
})

export function canonicalAdminPlan(planId) {
  const plan = String(planId ?? 'INICIO').trim().toUpperCase()
  const canonical = PLAN_ALIASES[plan] ?? plan
  return PLAN_RANK[canonical] === undefined ? 'INICIO' : canonical
}

export function adminPlanHasFeature(planId, feature) {
  const requiredPlan = FEATURE_PLANS[feature]
  return Boolean(requiredPlan && PLAN_RANK[canonicalAdminPlan(planId)] >= PLAN_RANK[requiredPlan])
}
