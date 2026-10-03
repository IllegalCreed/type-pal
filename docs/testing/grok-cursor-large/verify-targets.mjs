#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const campaign = 'docs/testing/grok-cursor-large'
const owners = {
  grok: {
    package: 'game',
    fixture: 'grok-render-r1',
    count: 46,
    cases: 400,
    groups: 40,
    counters: 40,
  },
  cursor: {
    package: 'editor',
    fixture: 'cursor-asset-r1',
    count: 74,
    cases: 700,
    groups: 70,
    counters: 50,
  },
}
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
const read = (path) => readFileSync(resolve(root, path))
const show = (sha, path) => execFileSync('git', ['show', `${sha}:${path}`], { cwd: root })
const cleanPath = (path) =>
  typeof path === 'string' &&
  Boolean(path) &&
  !path.includes('\\') &&
  path.split('/').every((part) => part && part !== '.' && part !== '..')

/** Scope guard only: legitimate input, deduplication and business oracle still need independent review. */
export function allowedNewPath(owner, path) {
  const rule = Object.hasOwn(owners, owner) ? owners[owner] : undefined
  if (!rule || !cleanPath(path)) return false
  if (path.startsWith(`${campaign}/${owner}/`)) return true
  const prefix = `packages/${rule.package}/src/`
  if (!path.startsWith(prefix)) return false
  const relative = path.slice(prefix.length)
  return (
    relative.startsWith(`__tests__/${rule.fixture}/`) ||
    new RegExp(`\\.${owner}-r1\\.test\\.tsx?$`).test(relative)
  )
}

export function allowedPrimarySource(owner, path, targets) {
  return (
    Object.hasOwn(owners, owner) &&
    cleanPath(path) &&
    targets.owners.some((entry) => entry.id === owner && entry.sources.some((s) => s.path === path))
  )
}

export function allocationProblems(targets) {
  const failures = []
  const claimed = new Set()
  const ids = new Set()
  if (targets.schemaVersion !== 1 || targets.owners.length !== 2)
    failures.push('unsupported or incomplete owner manifest')
  for (const entry of targets.owners) {
    const rule = Object.hasOwn(owners, entry.id) ? owners[entry.id] : undefined
    if (!rule || ids.has(entry.id)) {
      failures.push(`invalid/repeated owner: ${entry.id}`)
      continue
    }
    ids.add(entry.id)
    if (
      entry.package !== rule.package ||
      entry.sources.length !== rule.count ||
      entry.targetNewCases !== rule.cases ||
      entry.workGroups !== rule.groups ||
      entry.minimumCounters !== rule.counters
    )
      failures.push(`allocation/workload changed: ${entry.id}`)
    for (const source of entry.sources) {
      if (
        !cleanPath(source.path) ||
        !source.path.startsWith(`packages/${rule.package}/src/`) ||
        !/\.(?:ts|tsx)$/.test(source.path) ||
        /\.(?:test|spec)\./.test(source.path) ||
        source.package !== rule.package ||
        !/^[a-f0-9]{64}$/.test(source.sha256)
      )
        failures.push(`invalid source: ${source.path}`)
      if (claimed.has(source.path)) failures.push(`cross-owner source overlap: ${source.path}`)
      claimed.add(source.path)
    }
  }
  if (ids.size !== 2 || claimed.size !== 120) failures.push('incomplete 120-source allocation')
  return failures
}

function verifyScope(owner, base, targets, failures) {
  if (!Object.hasOwn(owners, owner) || !/^[a-f0-9]{40}$/.test(base ?? ''))
    throw new Error('owner must be grok/cursor and BASE a complete 40-character Git commit')
  git(['cat-file', '-e', `${base}^{commit}`])
  git(['merge-base', '--is-ancestor', targets.sourceBase, base])
  git(['merge-base', '--is-ancestor', base, 'HEAD'])
  const registered = git([
    'log',
    '-1',
    '--format=%H',
    base,
    '--',
    `${campaign}/targets.json`,
  ]).trim()
  if (registered !== base)
    throw new Error('BASE must be target registration commit, not a candidate')
  if (!read(`${campaign}/targets.json`).equals(show(base, `${campaign}/targets.json`)))
    failures.push('allocation manifest changed since dispatch')
  const fields = git(['diff', '--name-status', '--no-renames', '-z', base, '--']).split('\0')
  const changes = []
  for (let index = 0; index + 1 < fields.length; index += 2)
    changes.push({ status: fields[index], path: fields[index + 1] })
  for (const path of git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0'))
    if (path) changes.push({ status: '?', path })
  for (const { status, path } of changes) {
    if (!['A', 'M', '?'].includes(status) || !allowedNewPath(owner, path)) {
      failures.push(`outside ${owner} write scope: ${status} ${path}`)
      continue
    }
    if (!path.startsWith('packages/')) continue
    let existed = false
    try {
      execFileSync('git', ['cat-file', '-e', `${base}:${path}`], { cwd: root, stdio: 'ignore' })
      existed = true
    } catch {
      // Only new tests/fixtures may be added; existing evidence inside owner's directory may change.
    }
    if (existed) failures.push(`pre-existing test/fixture modified: ${path}`)
  }
  return { owner, dispatchBase: base, changedPaths: changes.length }
}

function main() {
  const args = process.argv.slice(2)
  if (args.length && (args.length !== 4 || args[0] !== '--owner' || args[2] !== '--base'))
    throw new Error('usage: node verify-targets.mjs [--owner grok|cursor --base <BASE>]')
  const targets = JSON.parse(read(`${campaign}/targets.json`).toString('utf8'))
  const failures = allocationProblems(targets)
  for (const sha of [
    targets.sourceBase,
    targets.productionFreeze,
    ...Object.values(targets.dedupCandidates),
  ]) {
    if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('invalid source/freeze/dedup commit')
    git(['cat-file', '-e', `${sha}^{commit}`])
  }
  // Reuse the already tested global frozen-source guard, without changing the GLM tool or its whitelist.
  execFileSync(process.execPath, ['docs/testing/glm-tenfold-triple/verify-targets.mjs'], {
    cwd: root,
    stdio: 'pipe',
  })
  for (const entry of targets.owners) {
    for (const source of entry.sources) {
      if (hash(read(source.path)) !== source.sha256)
        failures.push(`current source changed: ${source.path}`)
      if (hash(show(targets.productionFreeze, source.path)) !== source.sha256)
        failures.push(`frozen source mismatch: ${source.path}`)
    }
  }
  if (hash(read('scripts/coverage/baseline.fast.json')) !== targets.officialBaselineSha256)
    failures.push('official baseline changed')
  const scope = args.length ? verifyScope(args[1], args[3], targets, failures) : undefined
  if (failures.length) {
    for (const failure of failures) console.error(failure)
    process.exitCode = 1
  } else {
    console.log(
      JSON.stringify(
        {
          globalFrozenSources: 716,
          allocatedSources: 120,
          ownerOverlap: 0,
          scope,
          frozenHashesValid: true,
        },
        null,
        2,
      ),
    )
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    console.error(String(error))
    process.exitCode = 1
  }
}
