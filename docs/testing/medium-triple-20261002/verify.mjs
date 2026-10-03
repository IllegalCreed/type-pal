import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function ownerAllows(owner, path) {
  if (!path || path.includes('..') || path.includes('\\')) return false
  return (
    owner.newTestFiles.includes(path) ||
    [...owner.fixturePrefixes, owner.evidencePrefix].some((prefix) => path.startsWith(prefix))
  )
}

export function main(args) {
  const flag = (name) => {
    const at = args.indexOf(name)
    return at >= 0 ? args[at + 1] : undefined
  }
  const registration = args.includes('--registration')
  const id = flag('--owner')
  const base = flag('--base')
  assert.ok(
    id && base,
    'usage: node verify.mjs --owner grok|kimi|cursor --base COMMIT [--registration]',
  )
  const root = fileURLToPath(new URL('../../../', import.meta.url))
  const git = (...argv) => execFileSync('git', argv, { cwd: root, encoding: 'utf8' }).trim()
  const inventory = JSON.parse(readFileSync(new URL('./targets.json', import.meta.url), 'utf8'))
  const owner = inventory.owners.find((item) => item.id === id)
  assert.ok(owner, `unknown owner: ${id}`)
  git('cat-file', '-e', `${base}^{commit}`)
  assert.equal(git('merge-base', '--is-ancestor', inventory.sourceBase, base), '')
  const branch = git('branch', '--show-current')
  assert.equal(branch, registration ? inventory.dispatchBranch : owner.branch, 'wrong branch')
  if (!registration) assert.equal(resolve(root), resolve(owner.worktree), 'wrong worktree')
  const hashes = []
  for (const file of [
    ...inventory.owners.flatMap((item) => item.sources),
    ...inventory.configuration,
  ]) {
    const actual = createHash('sha256')
      .update(readFileSync(resolve(root, file.path)))
      .digest('hex')
    assert.equal(actual, file.sha256, `frozen source/config drift: ${file.path}`)
    hashes.push({ path: file.path, sha256: actual })
  }
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
  const paths = [...new Set([...changed, ...untracked])].sort()
  const registrationFiles = [
    'docs/ops/board.md',
    'docs/ops/tasks/index.md',
    'docs/testing/README.md',
    ...inventory.owners.map((item) => `docs/ops/tasks/${item.taskId}.md`),
    'docs/testing/medium-triple-20261002/README.md',
    'docs/testing/medium-triple-20261002/targets.json',
    'docs/testing/medium-triple-20261002/verify.mjs',
    'docs/testing/medium-triple-20261002/verify.test.mjs',
  ]
  const baseChanges = git(
    'diff',
    '--name-only',
    '--no-renames',
    `${inventory.sourceBase}...${base}`,
  )
    .split('\n')
    .filter(Boolean)
  for (const path of baseChanges)
    assert.ok(registrationFiles.includes(path), `BASE is not docs-only registration: ${path}`)
  for (const path of ['packages', 'scripts', 'patches'])
    assert.equal(
      git('rev-parse', `${base}:${path}`),
      git('rev-parse', `${inventory.sourceBase}:${path}`),
      `BASE product/dependency tree changed: ${path}`,
    )
  for (const path of paths)
    assert.ok(
      registration ? registrationFiles.includes(path) : ownerAllows(owner, path),
      `out of scope: ${path}`,
    )
  const deleted = git('diff', '--name-only', '--diff-filter=D', base)
  assert.equal(deleted, '', `deletion not allowed: ${deleted}`)
  console.log(
    JSON.stringify(
      {
        owner: id,
        base,
        sourceBase: inventory.sourceBase,
        branch,
        registration,
        frozenFiles: hashes.length,
        frozenHashesValid: true,
        changedPaths: paths.length,
        scopeValid: true,
      },
      null,
      2,
    ),
  )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main(process.argv.slice(2))
