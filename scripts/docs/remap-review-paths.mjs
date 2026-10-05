import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(new URL('../..', import.meta.url).pathname)
const reviewDir = resolve(root, 'docs/phase-governance/reviews')
const remaps = new Map([
  [
    'docs/ops/tasks/TEST-GLM-EDITOR-ASSET-LIFECYCLE-1.md',
    'docs/ops/archive/tasks/done/TEST-GLM-EDITOR-ASSET-LIFECYCLE-1.md',
  ],
  [
    'docs/ops/tasks/TEST-GLM-REFORGE-RUNTIME-SESSION-1.md',
    'docs/ops/archive/tasks/done/TEST-GLM-REFORGE-RUNTIME-SESSION-1.md',
  ],
])
for (const file of readdirSync(reviewDir).filter((name) => name.endsWith('.json'))) {
  const path = resolve(reviewDir, file)
  const review = JSON.parse(readFileSync(path, 'utf8'))
  for (const entry of review.entries ?? []) {
    const next = remaps.get(entry.path)
    if (!next) continue
    entry.path = next
    entry.module = next.split('/')[2] ?? entry.module
    entry.capability = next
      .replace(/^docs\//, '')
      .replace(/\.[^.]+$/, '')
      .replaceAll('/', '-')
    entry.legalInputs = entry.legalInputs.map((value) => remaps.get(value) ?? value)
    entry.publicCallers = entry.publicCallers.map((value) =>
      value
        .replaceAll([...remaps.keys()][0], [...remaps.values()][0])
        .replaceAll([...remaps.keys()][1], [...remaps.values()][1]),
    )
    entry.evidence.path = next
    entry.evidence.sourceSha256 = entry.sourceSha256
  }
  writeFileSync(path, `${JSON.stringify(review, null, 2)}\n`)
}
