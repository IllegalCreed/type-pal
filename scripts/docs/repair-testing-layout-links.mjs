import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, posix, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rewriteLinks, rewriteRepositoryPaths } from './relocate.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const planPath = 'docs/testing/archive/migrations/testing-layout-closeout-20261004.json'
const plan = JSON.parse(readFileSync(resolve(repoRoot, planPath), 'utf8'))
const unresolvedPath = resolve(
  repoRoot,
  'docs/testing/archive/migrations/testing-layout-unresolved-tools-20261004.json',
)
const unresolved = existsSync(unresolvedPath)
  ? JSON.parse(readFileSync(unresolvedPath, 'utf8'))
  : { entries: [] }
const manifest = JSON.parse(
  readFileSync(resolve(repoRoot, 'docs/testing/legacy-flat.json'), 'utf8'),
)
const retiredTargets = new Map(
  (manifest.retired ?? [])
    .filter((entry) => entry.plan?.includes('testing-layout-closeout-20261004.json'))
    .map((entry) => [`docs/testing/${entry.movedTo}`, `docs/testing/${entry.path}`]),
)
const normalizedEntries = plan.entries.map((entry) => ({
  ...entry,
  from:
    retiredTargets.get(entry.to) ??
    (entry.to.includes('/archive/legacy/batches/')
      ? `docs/testing/${entry.to.split('/archive/legacy/batches/')[1]}`
      : entry.from),
}))
plan.entries = normalizedEntries
plan.directories = {}
const mapping = new Map([
  ...plan.entries.map((entry) => [entry.from, entry.to]),
  ...unresolved.entries.map((entry) => [entry.from, entry.to]),
])
const canonicalAliases = {
  'docs/testing/archive/legacy/unresolved-tools/command-form-families-mutants.mjs':
    'docs/testing/domains/editor/editor-workflows/tools/command-form-families-mutants.mjs',
  'docs/testing/archive/legacy/unresolved-tools/map-pointer-gesture-mutants.mjs':
    'docs/testing/domains/editor/authoring-and-runtime/tools/map-pointer-gesture-mutants.mjs',
  'docs/testing/archive/legacy/unresolved-tools/map-workspace-sessions-mutants.mjs':
    'docs/testing/domains/editor/authoring-and-runtime/tools/map-workspace-sessions-mutants.mjs',
  'docs/testing/archive/legacy/unresolved-tools/battle-host-shell-parity.mjs':
    'docs/testing/domains/runtime/battle/tools/battle-host-shell-parity.mjs',
  'docs/testing/archive/legacy/unresolved-tools/battle-host-refactor-mutants.mjs':
    'docs/testing/domains/runtime/battle/tools/battle-host-refactor-mutants.mjs',
  'docs/testing/archive/legacy/unresolved-tools/battle-host-rng-witness.mjs':
    'docs/testing/domains/runtime/battle/tools/battle-host-rng-witness.mjs',
  'docs/testing/archive/legacy/unresolved-tools/battle-session-owners-mutants.mjs':
    'docs/testing/domains/runtime/battle/tools/battle-session-owners-mutants.mjs',
  'docs/testing/archive/legacy/unresolved-tools/menu-session-parity.mjs':
    'docs/testing/domains/runtime/editor-workflows/tools/menu-session-parity.mjs',
  'docs/testing/archive/legacy/unresolved-tools/menu-session-refactor-mutants.mjs':
    'docs/testing/domains/editor/editor-workflows/tools/menu-session-refactor-mutants.mjs',
  'docs/testing/archive/legacy/unresolved-tools/active-scene-mutants.mjs':
    'docs/testing/domains/content/authoring-and-runtime/tools/active-scene-mutants.mjs',
  'docs/testing/archive/legacy/unresolved-tools/world-runtime-mutants.mjs':
    'docs/testing/domains/content/authoring-and-runtime/tools/world-runtime-mutants.mjs',
  'docs/testing/archive/authoring-and-runtime/tools/map-pointer-gesture-mutants.mjs':
    'docs/testing/domains/editor/authoring-and-runtime/tools/map-pointer-gesture-mutants.mjs',
  'docs/testing/archive/authoring-and-runtime/tools/map-workspace-sessions-mutants.mjs':
    'docs/testing/domains/editor/authoring-and-runtime/tools/map-workspace-sessions-mutants.mjs',
  'docs/testing/archive/editor-workflows/tools/menu-session-parity.mjs':
    'docs/testing/domains/runtime/editor-workflows/tools/menu-session-parity.mjs',
  'docs/testing/archive/legacy/authoring-and-runtime/tools/scene-reference-guard-mutants.mjs':
    'docs/testing/domains/editor/authoring-and-runtime/tools/scene-reference-guard-mutants.mjs',
}
for (const [from, to] of Object.entries(canonicalAliases)) mapping.set(from, to)
const toolFiles = []
function collectTools(root) {
  if (!existsSync(root)) return
  for (const item of readdirSync(root, { withFileTypes: true })) {
    const file = resolve(root, item.name)
    if (item.isDirectory()) collectTools(file)
    else if (/\.(?:mjs|mts|js|ts|tsx)$/.test(item.name)) toolFiles.push(relative(repoRoot, file))
  }
}
collectTools(resolve(repoRoot, 'docs/testing/domains'))
collectTools(resolve(repoRoot, 'docs/testing/archive/legacy/unresolved-tools'))
for (const target of toolFiles) {
  const basename = target.split('/').at(-1)
  const actual = target
  if (target.startsWith('docs/testing/domains/')) {
    const domainSuffix = target.replace(/^docs\/testing\/domains\//, '')
    mapping.set(`docs/testing/${domainSuffix}`, actual)
    mapping.set(`docs/testing/archive/${domainSuffix}`, actual)
  }
  const candidates = [
    `docs/testing/archive/legacy/unresolved-tools/${basename}`,
    `docs/testing/archive/unresolved-tools/${basename}`,
    `docs/testing/archive/authoring-and-runtime/tools/${basename}`,
    `docs/testing/archive/editor-workflows/tools/${basename}`,
    `docs/testing/archive/testing-records/tools/${basename}`,
    `docs/testing/archive/engine-boundaries/tools/${basename}`,
    `docs/testing/archive/supply-and-import/tools/${basename}`,
    `docs/testing/archive/battle/tools/${basename}`,
    `docs/testing/archive/save-and-recovery/tools/${basename}`,
    `docs/testing/archive/quality-gates/tools/${basename}`,
    `docs/testing/authoring-and-runtime/tools/${basename}`,
    `docs/testing/editor-workflows/tools/${basename}`,
    `docs/testing/testing-records/tools/${basename}`,
    `docs/testing/engine-boundaries/tools/${basename}`,
    `docs/testing/supply-and-import/tools/${basename}`,
    `docs/testing/battle/tools/${basename}`,
    `docs/testing/save-and-recovery/tools/${basename}`,
    `docs/testing/quality/quality-gates/tools/${basename}`,
  ]
  for (const candidate of candidates) mapping.set(candidate, actual)
}
for (const entry of plan.entries) {
  let from = entry.from
  let to = entry.to
  while (from.includes('/')) {
    from = posix.dirname(from)
    to = posix.dirname(to)
    if (from === 'docs/testing') break
    if (!mapping.has(from)) mapping.set(from, to)
  }
}
writeFileSync(resolve(repoRoot, planPath), `${JSON.stringify(plan, null, 2)}\n`)
const textPattern = /\.(?:md|json|mjs|mts|js|ts|tsx)$/i
const scriptPattern = /\.(?:mjs|mts|js|ts|tsx)$/i
function rewriteRelativeSpecifiers(text, file) {
  if (!scriptPattern.test(file)) return text
  return text.replace(/(['"])(\.\.?\/[^'"\n]+)\1/g, (_whole, quote, specifier) => {
    const oldTarget = posix.normalize(posix.join(posix.dirname(file), specifier))
    const mappedTarget = mapping.get(oldTarget) ?? oldTarget
    let next = posix.relative(posix.dirname(file), mappedTarget)
    if (!next.startsWith('.')) next = `./${next}`
    return `${quote}${next}${quote}`
  })
}
const files = []
function walk(root) {
  for (const item of readdirSync(root, { withFileTypes: true })) {
    const file = resolve(root, item.name)
    if (item.isDirectory()) walk(file)
    else files.push(file)
  }
}
walk(resolve(repoRoot, 'docs'))
files.push(resolve(repoRoot, 'README.md'))
let changed = 0
for (const file of files) {
  const repoPath = relative(repoRoot, file)
  if (!textPattern.test(repoPath)) continue
  const original = readFileSync(file, 'utf8')
  let next = original
  if (repoPath.endsWith('.md')) next = rewriteLinks(next, repoPath, repoPath, mapping)
  next = rewriteRelativeSpecifiers(next, repoPath)
  next = rewriteRepositoryPaths(next, mapping)
  if (next !== original) {
    writeFileSync(file, next)
    changed++
  }
}
console.log(`testing layout links repaired: ${changed}`)
