import assert from 'node:assert/strict'
import test from 'node:test'
import { inspectTraceCapabilities } from './obligation-registry.mjs'

test('capability admission does not mistake absent actors/pages/actions for complete evidence', () => {
  for (const fragment of ['001', '002', '003', '004', '005', '006']) {
    const result = inspectTraceCapabilities(fragment, {
      events: [],
      worldRenders: [],
      pages: [],
      actions: [],
      causes: [],
    })
    assert(result.every((entry) => entry.status === 'unknown'))
    assert(result.find((entry) => entry.domain === 'motion').missing.includes('assetIdentity'))
    assert(result.find((entry) => entry.domain === 'dialogue').missing.includes('pageInstances'))
  }
})

test('capability presence is not proof; missing page identity or asset selection blocks its domain', () => {
  // IO boundary fixture tests availability only, not gameplay conformance.
  const trace = {
    events: [
      { kind: 'actor-render', state: { drawStatus: 'drawn', assetId: 21, frameResourceId: 0 } },
    ],
    resources: [{ order: 0 }],
    worldRenders: [{ renderId: 1 }],
    causes: [
      {
        phase: 'run-started',
        author: { kind: 'entity-behavior' },
        lifecycle: { authority: {}, activations: [] },
      },
    ],
    pages: [{ sceneVisit: 1, page: { instance: 1 } }],
    actions: [{ key: 'Enter' }],
  }
  assert(inspectTraceCapabilities('001', trace).every((entry) => entry.status === 'available'))
  const wrongPage = structuredClone(trace)
  delete wrongPage.pages[0].page.instance
  assert.equal(
    inspectTraceCapabilities('001', wrongPage).find((e) => e.domain === 'dialogue').status,
    'unknown',
  )
  const wrongAsset = structuredClone(trace)
  delete wrongAsset.events[0].state.assetId
  assert.equal(
    inspectTraceCapabilities('001', wrongAsset).find((e) => e.domain === 'motion').status,
    'unknown',
  )
})
