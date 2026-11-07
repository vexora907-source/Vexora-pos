import test from 'node:test'
import assert from 'node:assert/strict'
import { createPosWebsiteVisitRecorder } from '../src/shared/services/websiteVisits.js'

test('records one POS website visit per app load', async () => {
  const requests = []
  const recordVisit = createPosWebsiteVisitRecorder('https://pos.example.com', async (url, options) => {
    requests.push({ url: String(url), options })
    return { ok: true, json: async () => ({ value: 43 }) }
  })

  const counts = await Promise.all([recordVisit(), recordVisit()])

  assert.deepEqual(counts, [43, 43])
  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, 'https://pos.example.com/api/public/metrics/visits')
  assert.deepEqual(requests[0].options, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    credentials: 'omit',
    cache: 'no-store',
  })
})

test('retries visit registration after a failed request', async () => {
  let attempts = 0
  const recordVisit = createPosWebsiteVisitRecorder('https://pos.example.com', async () => {
    attempts += 1
    return attempts === 1
      ? { ok: false, status: 503 }
      : { ok: true, json: async () => ({ value: 44 }) }
  })

  await assert.rejects(recordVisit(), /visita web del POS \(503\)/)
  assert.equal(await recordVisit(), 44)
  assert.equal(attempts, 2)
})

test('does not send a request when no POS API URL is configured', async () => {
  const fetcher = async () => {
    throw new Error('A request should not be sent.')
  }
  const recordVisit = createPosWebsiteVisitRecorder('', fetcher)

  assert.equal(await recordVisit(), null)
})
