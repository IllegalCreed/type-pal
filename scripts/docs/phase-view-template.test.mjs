import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { renderPhaseGovernanceIndexes } from './build-phase-lore-governance.mjs'
import { checkMigratedDocument } from './document-model.mjs'

test('both generated phase views satisfy the public index contract and reject a lost authority section', () => {
  const registry = JSON.parse(
    readFileSync(new URL('../../docs/phase-governance/templates/registry.json', import.meta.url)),
  )
  const catalog = {
    entries: [
      {
        path: 'docs/lore/example.md',
        title: 'Known | unresolved',
        phase: 'lore',
        module: 'canon',
        owner: 'Source owner',
        status: 'draft',
      },
    ],
  }
  const before = structuredClone(catalog)
  const views = renderPhaseGovernanceIndexes(catalog)
  for (const [name, text] of Object.entries(views)) {
    const path = `docs/phase-governance/${name}`
    const doc = { path, templateId: 'governance-index-v1', historyOverlay: false }
    assert.deepEqual(
      checkMigratedDocument(doc, registry, () => text),
      [],
    )
    assert.match(text, /Status: current/)
    assert.match(text, /1份lore/)
    assert.match(text, /draft/)
    const broken = text.replace('## 入口与责任', '## unrelated')
    assert.deepEqual(
      checkMigratedDocument(doc, registry, () => broken),
      ['missing section: 入口与责任'],
    )
  }
  assert.deepEqual(catalog, before)
})
