import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { summarizeDocumentRegistry } from './document-registry.mjs'

// Owned temporary docs schema fixtures only; never used by registry CLI consumers.
export function saveDocumentRegistryFixture(directory, entries) {
  const manifestPath = join(directory, 'docs/phase-governance/document-registry.json')
  mkdirSync(dirname(manifestPath), { recursive: true })
  const phases = [...new Set(entries.map((entry) => entry.phase))]
  if (!phases.length) phases.push('ops')
  const shards = phases.map((phase) => {
    const path = `document-registry.${phase}.json`
    const positions = entries.flatMap((entry, index) => (entry.phase === phase ? [index] : []))
    const bytes = `${JSON.stringify({ schemaVersion: 1, phase, positions, entries: positions.map((index) => entries[index]) }, null, 2)}
`
    writeFileSync(join(dirname(manifestPath), path), bytes)
    return {
      key: phase,
      phase,
      path,
      total: positions.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    }
  })
  writeFileSync(
    manifestPath,
    `${JSON.stringify({ schemaVersion: 2, storageProducer: 'owned-test-fixture', summary: summarizeDocumentRegistry(entries), shards }, null, 2)}
`,
  )
  return manifestPath
}
