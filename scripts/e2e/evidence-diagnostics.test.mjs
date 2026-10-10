import assert from 'node:assert/strict'
import test from 'node:test'
import { guardedEvidenceReader } from './evidence-diagnostics.mjs'

test('failure diagnostics preserve export errors and never reread a closed or failed page', async () => {
  const primary = new Error('archive transport failed'),
    diagnostics = []
  let page = { isClosed: () => false },
    reads = 0,
    diagnosticCalls = 0
  const reader = guardedEvidenceReader({
    page: () => page,
    read: async () => {
      reads++
      throw primary
    },
    diagnostics,
  })
  await assert.rejects(
    async () => {
      try {
        await reader.read()
      } finally {
        await reader.diagnose(async () => {
          diagnosticCalls++
          await reader.read()
        })
      }
    },
    (error) => error === primary,
  )
  assert.equal(reads, 1)
  assert.equal(diagnosticCalls, 0)
  assert.equal(diagnostics.at(-1).skipped, 'export already failed')
  let retainedStatus
  await reader.diagnoseStatus(() => {
    retainedStatus = { overflow: true, bytes: 96 }
  })
  assert.deepEqual(
    retainedStatus,
    { overflow: true, bytes: 96 },
    'small failure status remains readable after a failed full export',
  )
  assert.equal(reads, 1)
  await reader.diagnoseStatus(() => {
    throw new Error('status unavailable')
  })
  assert.match(diagnostics.at(-1).error, /status unavailable/)
  page = { isClosed: () => true }
  await reader.diagnose(() => {
    diagnosticCalls++
  })
  assert.equal(diagnosticCalls, 0)
  assert.equal(diagnostics.at(-1).skipped, 'page closed')
  page = { isClosed: () => false }
  await reader.diagnose(() => {
    diagnosticCalls++
    throw new Error('diagnostic snapshot failed')
  })
  assert.equal(diagnosticCalls, 1)
  assert.match(diagnostics.at(-1).error, /diagnostic snapshot failed/)
  // A fresh context is independent of a previous context's failed export.
  await reader.diagnose(() => {
    diagnosticCalls++
  })
  assert.equal(diagnosticCalls, 2)
})
