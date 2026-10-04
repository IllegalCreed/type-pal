import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rewriteLinks, rewriteRepositoryPaths } from './relocate.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const testingRoot = resolve(repoRoot, 'docs/testing')
const manifestPath = resolve(testingRoot, 'legacy-flat.json')
const planPath = 'docs/testing/archive/migrations/testing-layout-unresolved-tools-20261004.json'
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const tools = []
function walk(root) {
  for (const item of readdirSync(root, { withFileTypes: true })) {
    const file = resolve(root, item.name)
    if (item.isDirectory()) walk(file)
    else if (/\.(?:mjs|mts|js|ts|tsx)$/.test(item.name)) tools.push(file)
  }
}
walk(resolve(testingRoot, 'domains'))
const missing = []
for (const file of tools) {
  const text = readFileSync(file, 'utf8')
  for (const line of text.split('\n')) {
    const match = line.match(
      /^\s*(?:import\s+(?:.+?\s+from\s+)?|const\s+\w+\s*=\s*require\s*\()(['"])(\.\.?\/[^'"]+)\1/,
    )
    if (!match) continue
    const target = resolve(dirname(file), match[2])
    const candidates = [
      target,
      `${target}.mjs`,
      `${target}.mts`,
      `${target}.js`,
      `${target}.ts`,
      `${target}.tsx`,
      resolve(target, 'index.mjs'),
      resolve(target, 'index.js'),
    ]
    if (!candidates.some(existsSync)) {
      missing.push({
        file: relative(repoRoot, file),
        specifier: match[2],
        target: relative(repoRoot, target),
      })
      break
    }
  }
}
const entries = missing.map((item) => {
  const from = item.file
  const to = `docs/testing/archive/legacy/unresolved-tools/${from.split('/').at(-1)}`
  const sourceSha = digest(readFileSync(resolve(repoRoot, from)))
  return {
    from,
    to,
    sourceSha,
    missingImports: [item],
    resolution: 'archive-unresolved-static-import',
    stopLine:
      'do not restore as canonical tool until every static relative import resolves to a tracked input',
    governanceTask: 'docs/ops/tasks/TESTING-DOC-LAYOUT-1-clean-root.md',
  }
})
const mapping = new Map(entries.map((entry) => [entry.from, entry.to]))
for (const entry of entries) {
  const source = resolve(repoRoot, entry.from)
  const target = resolve(repoRoot, entry.to)
  mkdirSync(dirname(target), { recursive: true })
  renameSync(source, target)
  entry.afterSha256 = digest(readFileSync(target))
}
for (const file of [
  resolve(repoRoot, 'README.md'),
  ...tools.map((file) => resolve(repoRoot, relative(repoRoot, file))).filter(existsSync),
]) {
  const repoPath = relative(repoRoot, file)
  const original = readFileSync(file, 'utf8')
  const next = rewriteRepositoryPaths(rewriteLinks(original, repoPath, repoPath, mapping), mapping)
  if (next !== original) writeFileSync(file, next)
}
for (const entry of entries) {
  const relativeTarget = entry.to.replace(/^docs\/testing\//, '')
  const retired = manifest.retired?.find(
    (candidate) => candidate.movedTo === entry.from.replace(/^docs\/testing\//, ''),
  )
  if (!retired) throw new Error(`No retired manifest entry for ${entry.from}`)
  retired.movedTo = relativeTarget
  retired.storedSha256 = entry.afterSha256
  retired.plan = planPath
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
const plan = {
  schemaVersion: 1,
  id: 'testing-layout-unresolved-tools-20261004',
  generatedBy: 'scripts/docs/archive-unresolved-layout-tools.mjs',
  resolution:
    'archive-only; missing static imports are preserved as historical evidence and are not runtime proof',
  summary: { files: entries.length, missingImports: missing.length },
  entries,
}
writeFileSync(resolve(repoRoot, planPath), `${JSON.stringify(plan, null, 2)}\n`)
console.log(JSON.stringify(plan.summary, null, 2))
