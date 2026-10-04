import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rewriteLinks, rewriteRepositoryPaths } from './relocate.mjs'

// Mechanical link/manifest reconciliation after a SHA-checked relocation.
// This command never rewrites tests, runners, product files or raw receipts.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const [planPath] = process.argv.slice(2)
if (!planPath) throw new Error('Usage: node scripts/docs/finalize-testing-migration.mjs PLAN.json')
const plan = JSON.parse(readFileSync(resolve(root, planPath), 'utf8'))
const mapping = new Map(plan.entries.map((entry) => [entry.from, entry.to]))
const paths = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  {
    cwd: root,
    encoding: 'utf8',
  },
).split('\0')
let rewritten = 0
for (const path of paths) {
  if (
    !path.endsWith('.md') ||
    (!path.startsWith('docs/') && path !== 'projects/pal/e2e-checkpoints/README.md')
  )
    continue
  if (mapping.has(path)) continue
  const original = readFileSync(resolve(root, path), 'utf8')
  const next = rewriteRepositoryPaths(rewriteLinks(original, path, path, mapping), mapping)
  if (next !== original) {
    writeFileSync(resolve(root, path), next)
    rewritten++
  }
}
const manifestPath = resolve(root, 'docs/testing/legacy-flat.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const retired = new Set((manifest.retired ?? []).map((entry) => entry.path))
for (const entry of plan.entries) {
  const path = entry.from.replace(/^docs\/testing\//, '')
  if (retired.has(path)) continue
  const legacy = manifest.entries.find((candidate) => candidate.path === path)
  if (!legacy) throw new Error(`Migration source was not registered: ${path}`)
  manifest.retired ??= []
  manifest.retired.push({
    ...legacy,
    movedTo: entry.to.replace(/^docs\/testing\//, ''),
    sourceSha256: entry.sha256,
    plan: planPath,
  })
}
manifest.entries = manifest.entries.filter((entry) => !mapping.has(`docs/testing/${entry.path}`))
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(
  `testing migration reconciled: ${plan.entries.length} retired / ${rewritten} Markdown references rewritten`,
)
