import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(new URL('../..', import.meta.url).pathname)
const planPath = resolve(
  repoRoot,
  'docs/testing/archive/migrations/testing-layout-closeout-20261004.json',
)
const manifestPath = resolve(repoRoot, 'docs/testing/legacy-flat.json')
const plan = JSON.parse(readFileSync(planPath, 'utf8'))
const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
for (const entry of plan.entries) {
  const target = resolve(repoRoot, entry.to)
  if (!existsSync(target)) throw new Error(`Layout target missing: ${entry.to}`)
  entry.afterSha256 = digest(target)
  entry.governanceTask = 'docs/ops/archive/tasks/done/TESTING-DOC-LAYOUT-1-clean-root.md'
}
plan.appliedRevision = 'working-tree-finalized'
writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`)

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const storedByTarget = new Map(
  plan.entries
    .filter((entry) => entry.kind === 'tool')
    .map((entry) => [entry.to.replace(/^docs\/testing\//, ''), entry.afterSha256]),
)
for (const entry of manifest.retired ?? []) {
  if (!entry.plan?.includes('testing-layout-closeout-20261004.json')) continue
  const stored = storedByTarget.get(entry.movedTo)
  if (stored) entry.storedSha256 = stored
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(JSON.stringify({ files: plan.entries.length, tools: storedByTarget.size }, null, 2))
