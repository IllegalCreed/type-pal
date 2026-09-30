#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const campaignPath = 'docs/testing/glm-tenfold-triple'
const ownerPackages = {
  O: ['migrate', 'content', 'shared'],
  P: ['editor'],
  Q: ['reforge', 'game', 'pal-extract'],
}
const read = (path) => readFileSync(resolve(root, path))
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
const gitShow = (ref, path) => execFileSync('git', ['show', `${ref}:${path}`], { cwd: root })

/** This is a write-scope guard, not a claim that the new contract is legitimate. */
export function allowedNewPath(wave, path) {
  if (!Object.hasOwn(ownerPackages, wave) || typeof path !== 'string') return false
  if (!path || path.includes('\\')) return false
  if (path.split('/').some((part) => !part || part === '.' || part === '..')) return false
  if (path.startsWith(`${campaignPath}/wave-${wave}/`)) return true
  const letter = wave.toLowerCase()
  return ownerPackages[wave].some((pkg) => {
    const prefix = `packages/${pkg}/src/`
    if (!path.startsWith(prefix)) return false
    const relative = path.slice(prefix.length)
    return (
      relative.startsWith(`__tests__/glm-${letter}/`) ||
      new RegExp(`\\.glm-${letter}\\.test\\.tsx?$`).test(relative)
    )
  })
}

function verifySources(targets, failures) {
  if (targets.schemaVersion !== 1 || !Array.isArray(targets.waves))
    throw new Error('unsupported targets schema')
  if (!/^[a-f0-9]{40}$/.test(targets.productionFreeze)) throw new Error('invalid production freeze')
  const baselinePath = 'scripts/coverage/baseline.fast.json'
  if (hash(read(baselinePath)) !== targets.officialBaselineSha256)
    failures.push('current official baseline changed')
  if (hash(gitShow(targets.productionFreeze, baselinePath)) !== targets.officialBaselineSha256)
    failures.push('frozen official baseline hash mismatch')
  const claimed = new Set()
  const waves = new Set()
  const summaries = []
  let branchCovered = 0
  let branchTotal = 0
  for (const wave of targets.waves) {
    if (!Object.hasOwn(ownerPackages, wave.id) || waves.has(wave.id))
      throw new Error(`invalid or repeated wave: ${wave.id}`)
    waves.add(wave.id)
    if (JSON.stringify(wave.packages) !== JSON.stringify(ownerPackages[wave.id]))
      failures.push(`package ownership mismatch: ${wave.id}`)
    if (wave.targetNewCases !== 700 || wave.minimumCounters !== 40)
      failures.push(`workload target mismatch: ${wave.id}`)
    let missingBranches = 0
    for (const source of wave.sources) {
      const path = source.path
      if (
        !ownerPackages[wave.id].includes(source.package) ||
        !path.startsWith(`packages/${source.package}/`) ||
        path.split('/').some((part) => !part || part === '.' || part === '..') ||
        !/\.(?:ts|tsx|mts)$/.test(path) ||
        /\.(?:test|spec)\./.test(path) ||
        !/^[a-f0-9]{64}$/.test(source.sha256)
      )
        failures.push(`invalid production source: ${path}`)
      if (claimed.has(path)) failures.push(`cross-owner source overlap: ${path}`)
      claimed.add(path)
      try {
        if (hash(read(path)) !== source.sha256) failures.push(`current source changed: ${path}`)
        if (hash(gitShow(targets.productionFreeze, path)) !== source.sha256)
          failures.push(`frozen source hash mismatch: ${path}`)
      } catch (error) {
        failures.push(`source unreadable: ${path}: ${String(error)}`)
      }
      for (const metric of ['branches', 'statements', 'lines']) {
        const { covered, total } = source[metric]
        if (
          !Number.isSafeInteger(covered) ||
          !Number.isSafeInteger(total) ||
          covered < 0 ||
          total < covered
        )
          failures.push(`invalid coverage count: ${path}: ${metric}`)
      }
      branchCovered += source.branches.covered
      branchTotal += source.branches.total
      missingBranches += source.branches.total - source.branches.covered
    }
    summaries.push({ id: wave.id, sources: wave.sources.length, missingBranches })
  }
  if (waves.size !== 3 || claimed.size !== 716) failures.push('incomplete 3-wave/716-source census')
  if (
    branchCovered !== targets.candidateBranches.covered ||
    branchTotal !== targets.candidateBranches.total ||
    targets.candidateIsOfficial !== false
  )
    failures.push('candidate coverage census mismatch')
  return {
    productionFreeze: targets.productionFreeze,
    waves: summaries,
    totalSources: claimed.size,
  }
}

function verifyScope(wave, base, targets, failures) {
  if (!Object.hasOwn(ownerPackages, wave) || !/^[a-f0-9]{40}$/.test(base ?? ''))
    throw new Error('--wave requires O/P/Q and --base requires a full 40-character dispatch SHA')
  git(['merge-base', '--is-ancestor', targets.productionFreeze, base])
  git(['merge-base', '--is-ancestor', base, 'HEAD'])
  const dispatches = git([
    'log',
    '--format=%H',
    '--diff-filter=A',
    base,
    '--',
    `${campaignPath}/README.md`,
  ])
    .trim()
    .split('\n')
  if (dispatches.length !== 1 || dispatches[0] !== base)
    throw new Error('--base must be the campaign creation commit, not a later candidate')
  const changes = []
  const tracked = git(['diff', '--name-status', '--no-renames', '-z', base, '--']).split('\0')
  for (let index = 0; index + 1 < tracked.length; index += 2)
    changes.push({ status: tracked[index], path: tracked[index + 1] })
  for (const path of git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0'))
    if (path) changes.push({ status: '?', path })
  for (const { status, path } of changes) {
    if (!['A', 'M', '?'].includes(status) || !allowedNewPath(wave, path)) {
      failures.push(`outside ${wave} write scope: ${status} ${path}`)
      continue
    }
    if (path.startsWith('packages/')) {
      let existed = false
      try {
        execFileSync('git', ['cat-file', '-e', `${base}:${path}`], {
          cwd: root,
          stdio: 'ignore',
        })
        existed = true
      } catch {
        // A missing path in the dispatch tree is required for new tests and fixtures.
      }
      if (existed) failures.push(`pre-existing test/fixture modified: ${path}`)
    }
  }
  return { owner: wave, dispatchBase: base, changedPaths: changes.length }
}

function main() {
  const args = process.argv.slice(2)
  if (args.length !== 0 && (args.length !== 4 || args[0] !== '--wave' || args[2] !== '--base'))
    throw new Error('usage: node verify-targets.mjs [--wave O|P|Q --base <DISPATCH_SHA>]')
  const targets = JSON.parse(read(`${campaignPath}/targets.json`).toString('utf8'))
  const failures = []
  const summary = verifySources(targets, failures)
  if (args.length) summary.scope = verifyScope(args[1], args[3], targets, failures)
  if (failures.length) {
    for (const failure of failures) console.error(failure)
    process.exitCode = 1
  } else {
    console.log(JSON.stringify({ ...summary, frozenHashesValid: true, ownerOverlap: 0 }, null, 2))
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
