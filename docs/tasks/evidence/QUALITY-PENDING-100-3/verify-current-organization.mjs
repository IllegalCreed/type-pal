import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  foundationTestFiles,
  onlyFoundationBoundaryCases,
  withoutFoundationBoundaryCases,
} from '../../../testing/domains/quality/quality-gates/tools/foundation-migration-selection.mjs'
import { analyzeOrganization } from './organization-program.mjs'

export function verifyCurrentOrganization(root, native, manifest, profiles) {
  const sha = (x) => createHash('sha256').update(x).digest('hex')
  const frozen = Object.fromEntries(
    manifest.inputs.map((entry) => {
      const body = native[entry.member]
      assert.equal(sha(body), entry.sha256, entry.path)
      return [entry.path, body]
    }),
  )
  const actual = Object.fromEntries(
    manifest.outputs.map((entry) => {
      const body = readFileSync(new URL(entry.path, root), 'utf8')
      assert.equal(sha(body), entry.sha256, entry.path)
      assert.ok(profiles.some((x) => x.path === entry.path))
      return [entry.path, body]
    }),
  )
  const old = analyzeOrganization(
    fileURLToPath(root),
    frozen,
    manifest.replacements,
    manifest.sourceBridges,
  )
  const current = analyzeOrganization(fileURLToPath(root), actual, manifest.replacements)
  const signature = (test) => ({
    statement: test.statementSyntaxSha256,
    declarations: test.declarations.map((x) => x.syntaxSha256).sort(),
    hooks: test.hooks.map((x) => x.syntaxSha256).sort(),
    imports: test.imports,
  })
  const key = (x) => `${x.file}\0${x.fullName}`
  const covered = new Set()
  for (const mapping of manifest.registrations) {
    const before = old[mapping.old.file].tests[mapping.old.ordinal]
    const after = current[mapping.current.file].tests.find(
      (x) =>
        x.template === mapping.current.template &&
        JSON.stringify(x.titles) === JSON.stringify(mapping.current.titles),
    )
    assert.ok(after, JSON.stringify(mapping.current))
    assert.deepEqual(signature(after), signature(before), JSON.stringify(mapping.old))
    covered.add(`${mapping.current.file}#${after.ordinal}`)
  }
  assert.equal(covered.size, 105)
  assert.equal(
    Object.values(current).reduce((sum, x) => sum + x.tests.length, 0),
    105,
  )
  const identities = (report) =>
    report.testResults.flatMap((file) =>
      file.assertionResults.map((test) => ({
        file: `packages/migrate/src/${file.name.split('/').at(-1)}`,
        fullName: test.fullName,
        status: test.status,
      })),
    )
  const baseline = JSON.parse(native['organization-current/before.native.json'])
  const neighbors = JSON.parse(native['organization-current/neighbors-final-r2.native.json'])
  assert.equal(baseline.numPassedTests, 131)
  assert.equal(neighbors.numPassedTests, 238)
  for (const report of [baseline, neighbors]) {
    assert.equal(report.numFailedTests, 0)
    assert.equal(report.numPendingTests, 0)
  }
  assert.deepEqual(
    manifest.identities.map((x) => key(x.old)).sort(),
    identities(baseline).map(key).sort(),
  )
  const moved = identities(neighbors).filter((x) => Object.hasOwn(actual, x.file))
  assert.equal(moved.length, 131)
  assert.deepEqual(manifest.identities.map((x) => key(x.current)).sort(), moved.map(key).sort())
  assert.equal(new Set(moved.map(key)).size, 131)
  for (const entry of manifest.preserved)
    assert.equal(sha(readFileSync(new URL(entry.path, root))), entry.sha256, entry.path)
  for (const profile of profiles) {
    assert.deepEqual(Object.keys(profile.axes), [...'ABCDEFGH'])
    assert.ok(Object.hasOwn(actual, profile.path))
    assert.ok(profile.subjects.length > 0)
  }
  const cohort = JSON.parse(native['organization-current/diagnostic-cohort.json'])
  assert.deepEqual(foundationTestFiles, cohort.foundationFiles)
  for (const name of cohort.allNames) {
    assert.equal(new RegExp(onlyFoundationBoundaryCases).test(name), cohort.expected.includes(name))
    assert.equal(
      new RegExp(withoutFoundationBoundaryCases).test(name),
      !cohort.expected.includes(name),
    )
  }
  assert.equal(new RegExp(onlyFoundationBoundaryCases).test('a new unrelated case'), false)
  for (const [id, count] of [
    ['diagnostic-before', 47],
    ['diagnostic-mutant-selection', 28],
  ]) {
    const report = JSON.parse(native[`organization-current/${id}.native.json`])
    assert.equal(report.numPassedTests, count)
    assert.equal(report.numPendingTests, 75 - count)
    assert.equal(report.numFailedTests, 0)
  }
  for (const id of ['before', 'neighbors-final-r2', 'typecheck-final-r2']) {
    const execution = JSON.parse(native[`organization-current/${id}.execution.json`])
    assert.equal(execution.exit, 0, id)
    assert.equal(execution.signal, null, id)
    assert.equal(execution.spawnError, null, id)
    assert.equal(native[`organization-current/${id}.stderr.raw`], '', id)
  }
  return {
    originalSubjects: 17,
    currentFiles: 12,
    registrations: 105,
    relocatedRuntimeCases: 131,
    restoredFGSubjects: 9,
    newFullReviewCredit: 0,
  }
}
