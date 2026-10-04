import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(new URL('../..', import.meta.url).pathname)
const planPath = resolve(repoRoot, 'docs/testing/archive/migrations/legacy-full-closeout-plan.json')
const outputPath = resolve(
  repoRoot,
  'docs/testing/archive/migrations/legacy-full-closeout-relocation.json',
)
const plan = JSON.parse(readFileSync(planPath, 'utf8'))
const entries = [
  ...(plan.entries ?? []),
  ...(plan.entryFiles ?? []).flatMap(
    (path) => JSON.parse(readFileSync(resolve(repoRoot, 'docs/testing', path), 'utf8')).entries,
  ),
]

const moves = entries
  .filter((entry) => entry.kind !== 'tool')
  .map((entry) => ({
    from: `docs/testing/${entry.path}`,
    to: `docs/testing/${entry.canonicalTarget}`,
    sha256: entry.sourceSha,
    decision: entry.decision,
    sourceSha: entry.sourceSha,
  }))

const output = {
  schemaVersion: 1,
  id: 'legacy-full-closeout-relocation',
  generatedBy: 'scripts/docs/build-legacy-closeout-relocation.mjs',
  sourcePlan: 'docs/testing/archive/migrations/legacy-full-closeout-plan.json',
  policy:
    'Only non-tool legacy records are physically relocated; tool paths remain stable until their import/cwd/runner audit permits a separate move.',
  entries: moves,
}
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(
  JSON.stringify(
    {
      files: entries.length,
      output: 'docs/testing/archive/migrations/legacy-full-closeout-relocation.json',
    },
    null,
    2,
  ),
)
