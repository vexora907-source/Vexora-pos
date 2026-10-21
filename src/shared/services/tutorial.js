import { canonicalPlan } from '../../app/components/PricingCalculator.jsx'
import { appStorage } from './tenantStorage.js'

export function tutorialStorageKey(tenant, gremio, plan) {
  const account = tenant.business?.email
    || tenant.dian?.nit
    || tenant.user?.id
    || tenant.user?.userCode
    || tenant.business?.name
    || 'cuenta'
  return `vexora.tutorial-seen:${String(account).trim().toLocaleLowerCase()}:${gremio}:${canonicalPlan(String(plan ?? '').toUpperCase())}`
}

export function hasSeenTutorial(tenant, gremio, plan) {
  return appStorage().getItem(tutorialStorageKey(tenant, gremio, plan)) === 'true'
}

export function markTutorialSeen(tenant, gremio, plan) {
  appStorage().setItem(tutorialStorageKey(tenant, gremio, plan), 'true')
}
