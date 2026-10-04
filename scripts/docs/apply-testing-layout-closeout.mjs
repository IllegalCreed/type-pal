import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { dirname, posix, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rewriteLinks, rewriteRepositoryPaths } from './relocate.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const testingRoot = resolve(repoRoot, 'docs/testing')
const planPath = 'docs/testing/archive/migrations/testing-layout-closeout-20261004.json'
const plan = JSON.parse(readFileSync(resolve(repoRoot, planPath), 'utf8'))
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const mapping = new Map([
  ...plan.entries.map((entry) => [entry.from, entry.to]),
  ...Object.entries(plan.directories ?? {}),
])
const sourcePaths = new Set(plan.entries.map((entry) => entry.from))
const textPattern = /\.(?:md|json|mjs|mts|js|ts|tsx)$/i
const scriptPattern = /\.(?:mjs|mts|js|ts|tsx)$/i

function rewriteRelativeSpecifiers(text, from, to) {
  if (!scriptPattern.test(from)) return text
  return text.replace(/(['"])(\.\.?\/[^'"\n]+)\1/g, (_whole, quote, specifier) => {
    const oldTarget = posix.normalize(posix.join(posix.dirname(from), specifier))
    const mappedTarget = mapping.get(oldTarget) ?? oldTarget
    let next = posix.relative(posix.dirname(to), mappedTarget)
    if (!next.startsWith('.')) next = `./${next}`
    return `${quote}${next}${quote}`
  })
}

function prepare(entry) {
  const source = resolve(repoRoot, entry.from)
  if (!existsSync(source)) throw new Error(`Layout source missing: ${entry.from}`)
  const bytes = readFileSync(source)
  if (digest(bytes) !== entry.sha256) throw new Error(`Layout source changed: ${entry.from}`)
  if (!textPattern.test(entry.from)) return { ...entry, bytes, afterSha256: digest(bytes) }
  let text = bytes.toString('utf8')
  if (/\.md$/i.test(entry.from)) text = rewriteLinks(text, entry.from, entry.to, mapping)
  text = rewriteRelativeSpecifiers(text, entry.from, entry.to)
  text = rewriteRepositoryPaths(text, mapping)
  const next = Buffer.from(text)
  return { ...entry, bytes: next, afterSha256: digest(next) }
}

const prepared = plan.entries.map(prepare)
const destinations = new Set()
for (const entry of prepared) {
  if (destinations.has(entry.to)) throw new Error(`Layout destination collision: ${entry.to}`)
  destinations.add(entry.to)
  const destination = resolve(repoRoot, entry.to)
  if (existsSync(destination) && !sourcePaths.has(entry.to))
    throw new Error(`Layout destination exists: ${entry.to}`)
}

if (process.argv.includes('--write')) {
  for (const entry of prepared) {
    const destination = resolve(repoRoot, entry.to)
    mkdirSync(dirname(destination), { recursive: true })
    renameSync(resolve(repoRoot, entry.from), destination)
    if (!readFileSync(destination).equals(entry.bytes)) writeFileSync(destination, entry.bytes)
  }

  const manifestPath = resolve(testingRoot, 'legacy-flat.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const movedTools = new Map(
    prepared
      .filter((entry) => entry.kind === 'tool')
      .map((entry) => [entry.from.replace(/^docs\/testing\//, ''), entry]),
  )
  const existingRetired = new Set((manifest.retired ?? []).map((entry) => entry.path))
  for (const [path, entry] of movedTools) {
    if (existingRetired.has(path)) continue
    const legacy = manifest.entries.find((candidate) => candidate.path === path)
    if (!legacy) throw new Error(`Layout tool missing from legacy manifest: ${path}`)
    manifest.retired ??= []
    manifest.retired.push({
      ...legacy,
      movedTo: entry.to.replace(/^docs\/testing\//, ''),
      sourceSha256: entry.sha256,
      storedSha256: entry.afterSha256,
      plan: planPath,
    })
  }
  manifest.entries = manifest.entries.filter((entry) => !movedTools.has(entry.path))
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  const nextPlan = {
    ...plan,
    appliedRevision: 'working-tree',
    entries: prepared.map(({ bytes, ...entry }) => entry),
  }
  writeFileSync(resolve(repoRoot, planPath), `${JSON.stringify(nextPlan, null, 2)}\n`)

  const files = []
  function walk(root) {
    for (const item of readdirSync(root, { withFileTypes: true })) {
      const file = resolve(root, item.name)
      if (item.isDirectory()) walk(file)
      else files.push(file)
    }
  }
  walk(resolve(repoRoot, 'docs'))
  for (const file of files) {
    if (!textPattern.test(file) || sourcePaths.has(relative(repoRoot, file))) continue
    const from = relative(repoRoot, file)
    const original = readFileSync(file, 'utf8')
    let next = original
    if (from.endsWith('.md')) next = rewriteLinks(next, from, from, mapping)
    next = rewriteRepositoryPaths(next, mapping)
    if (next !== original) writeFileSync(file, next)
  }
}

console.log(
  JSON.stringify(
    {
      mode: process.argv.includes('--write') ? 'write' : 'dry-run',
      files: prepared.length,
      moved: prepared.length,
      afterSha: prepared.filter((entry) => entry.afterSha256).length,
    },
    null,
    2,
  ),
)
