const VISIT_ENDPOINT = '/api/public/metrics/visits'

export function createPosWebsiteVisitRecorder(apiUrl, fetcher = fetch) {
  let visitRequest

  return function recordPosWebsiteVisit() {
    if (!apiUrl) return Promise.resolve(null)
    if (visitRequest) return visitRequest

    visitRequest = Promise.resolve()
      .then(() => fetcher(new URL(VISIT_ENDPOINT, apiUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        credentials: 'omit',
        cache: 'no-store',
      }))
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`No se pudo registrar la visita web del POS (${response.status}).`)
        }

        const result = await response.json()
        if (!Number.isSafeInteger(result?.value) || result.value < 0) {
          throw new Error('El contador de visitas del POS devolvió un valor no válido.')
        }
        return result.value
      })
      .catch((error) => {
        visitRequest = undefined
        throw error
      })

    return visitRequest
  }
}
