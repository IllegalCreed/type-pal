import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(new URL('../..', import.meta.url).pathname)
const planPath = resolve(repoRoot, 'docs/ops/archive/ops-governance-layout-20261004.json')
const plan = JSON.parse(readFileSync(planPath, 'utf8'))
const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
for (const entry of plan.entries) {
  const target = resolve(repoRoot, entry.to)
  if (!existsSync(target)) throw new Error(`Ops layout target missing: ${entry.to}`)
  entry.afterSha256 = digest(target)
}
plan.appliedRevision = 'working-tree-finalized'
writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`)
console.log(JSON.stringify({ files: plan.entries.length }, null, 2))
