import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(new URL('../..', import.meta.url).pathname)
const testingRoot = resolve(repoRoot, 'docs/testing')
const manifestPath = resolve(testingRoot, 'legacy-flat.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
let changed = 0
for (const entry of manifest.retired ?? []) {
  if (!entry.plan?.includes('legacy-full-closeout-relocation.json')) continue
  const target = resolve(testingRoot, entry.movedTo)
  if (!existsSync(target)) throw new Error(`Archived target missing: ${entry.movedTo}`)
  const storedSha256 = digest(target)
  if (entry.storedSha256 === storedSha256) continue
  entry.storedSha256 = storedSha256
  changed++
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`legacy closeout stored SHA backfilled: ${changed}`)
