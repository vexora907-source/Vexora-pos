const DRAFT_KEY = 'vexora.registrationDraft'

export function saveRegistrationDraft(draft) {
  window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

export function readRegistrationDraft() {
  const saved = window.sessionStorage.getItem(DRAFT_KEY)
  if (!saved) return null
  const draft = JSON.parse(saved)
  if (!draft || typeof draft !== 'object' || typeof draft.password !== 'string') {
    throw new Error('Los datos temporales de registro no son válidos. Vuelve a iniciar el registro.')
  }
  return draft
}

export function clearRegistrationDraft() {
  window.sessionStorage.removeItem(DRAFT_KEY)
}
