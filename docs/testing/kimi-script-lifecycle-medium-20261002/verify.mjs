import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const targets = JSON.parse(readFileSync(new URL('./targets.json', import.meta.url), 'utf8'))
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const args = process.argv.slice(2)
const at = args.indexOf('--base')
const base = at >= 0 ? args[at + 1] : undefined
const registration = args.includes('--registration')
assert.ok(base && /^[a-f0-9]{40}$/.test(base), '--base requires an actual full commit')
git('cat-file', '-e', `${base}^{commit}`)
git('merge-base', '--is-ancestor', targets.sourceBase, base)
assert.equal(git('branch', '--show-current'), targets.branch, 'wrong branch')
assert.equal(resolve(root), resolve(targets.worktree), 'wrong worktree')
for (const file of targets.frozen) {
  const bytes = readFileSync(resolve(root, file.path))
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path)
  assert.equal(git('rev-parse', `${targets.sourceBase}:${file.path}`), file.blob, file.path)
}
for (const path of ['packages', 'scripts', 'patches'])
  assert.equal(
    git('rev-parse', `${base}:${path}`),
    git('rev-parse', `${targets.sourceBase}:${path}`),
  )
const changed = execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', base], {
  cwd: root,
  encoding: 'utf8',
})
  .split('\0')
  .filter(Boolean)
const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], {
  cwd: root,
  encoding: 'utf8',
})
  .split('\0')
  .filter(Boolean)
const registrationFiles = [
  'docs/ops/board.md',
  'docs/ops/tasks/index.md',
  'docs/ops/tasks/TEST-KIMI-SCRIPT-LIFECYCLE-MEDIUM-2.md',
  'docs/testing/README.md',
  'docs/testing/kimi-script-lifecycle-medium-20261002/README.md',
  'docs/testing/kimi-script-lifecycle-medium-20261002/targets.json',
  'docs/testing/kimi-script-lifecycle-medium-20261002/preflight.json',
  'docs/testing/kimi-script-lifecycle-medium-20261002/verify.mjs',
  'docs/testing/kimi-script-lifecycle-medium-20261002/evidence/README.md',
]
const allowed = (path) => {
  if (!path || path.split('/').some((part) => !part || part === '.' || part === '..')) return false
  return registration
    ? registrationFiles.includes(path)
    : targets.newTests.includes(path) ||
        path.startsWith(targets.fixturePrefix) ||
        path.startsWith(targets.evidencePrefix)
}
for (const path of [...new Set([...changed, ...untracked])])
  assert.ok(allowed(path), `out of scope: ${path}`)
assert.equal(git('diff', '--name-only', '--diff-filter=D', base), '', 'deletion not allowed')
console.log(
  JSON.stringify(
    {
      base,
      sourceBase: targets.sourceBase,
      frozen: targets.frozen.length,
      scopeValid: true,
      registration,
    },
    null,
    2,
  ),
)
