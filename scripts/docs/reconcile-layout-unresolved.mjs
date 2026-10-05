import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(new URL('../..', import.meta.url).pathname)
const layoutPath = resolve(
  repoRoot,
  'docs/testing/archive/migrations/testing-layout-closeout-20261004.json',
)
const unresolvedPath = resolve(
  repoRoot,
  'docs/testing/archive/migrations/testing-layout-unresolved-tools-20261004.json',
)
const layout = JSON.parse(readFileSync(layoutPath, 'utf8'))
const unresolved = JSON.parse(readFileSync(unresolvedPath, 'utf8'))
const moved = new Map(unresolved.entries.map((entry) => [entry.from, entry]))
for (const entry of layout.entries) {
  const replacement = moved.get(entry.to)
  if (!replacement) continue
  entry.to = replacement.to
  entry.afterSha256 = replacement.afterSha256
  entry.resolution = replacement.resolution
  entry.stopLine = replacement.stopLine
}
writeFileSync(layoutPath, `${JSON.stringify(layout, null, 2)}\n`)
console.log(`layout unresolved targets reconciled: ${moved.size}`)
