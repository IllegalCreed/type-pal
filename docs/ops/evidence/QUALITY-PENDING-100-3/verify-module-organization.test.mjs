import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { pathToFileURL } from 'node:url'
import { verifyFixtureOrganization } from './verify-fixture-organization.mjs'
import { moduleFrozenInputs, verifyModuleOrganization } from './verify-module-organization.mjs'

const sha = (s) => createHash('sha256').update(s).digest('hex')

// Synthetic receipts exercise the verifier, never claim a product test was run.
function scenario(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quality-counter-boundary-'))
  const root = pathToFileURL(`${dir}/`)
  const original =
    "import { expect,it } from 'vitest';import { value } from './old-fixture.js';it('value',()=>expect(value()).toBe(1))"
  const moved = original.replace('./old-fixture.js', './fixture.js')
  const provider = 'export function value(){return 1}'
  const source = 'export const amount = 1'
  const input = { path: 'case.test.ts', member: 'old-case', sha256: sha(original) }
  const report = (failed = false) => ({
    numPassedTests: failed ? 0 : 1,
    numFailedTests: failed ? 1 : 0,
    numPendingTests: 0,
    numTotalTests: 1,
    numTodoTests: 0,
    testResults: [
      {
        name: `${dir}/case.test.ts`,
        assertionResults: [
          {
            fullName: 'value',
            status: failed ? 'failed' : 'passed',
            failureMessages: failed ? ['AssertionError: expected 2 to be 1'] : [],
          },
        ],
      },
    ],
  })
  const native = {
    'old-case': original,
    'old-provider': provider,
    'n/before.native.json': JSON.stringify(report()),
    'n/neighbors.native.json': JSON.stringify(report()),
    'n/old.native.json': JSON.stringify(report()),
    'n/new.native.json': JSON.stringify(report(true)),
    'n/old.execution.json': JSON.stringify({ exit: 0, signal: null, spawnError: null }),
    'n/new.execution.json': JSON.stringify({ exit: 1, signal: null, spawnError: null }),
    'n/lint.stdout.raw': '0 errors / 0 warnings / 0 infos',
    'n/docs.stdout.raw': 'PASS (0 issues)',
    'n/content-review.stdout.raw': 'content review: PASS',
    'n/counter.json': JSON.stringify({
      sourcePath: 'source.ts',
      sourceSha256: sha(source),
      testPath: 'case.test.ts',
      finalTestSha256: sha(original),
      from: 'amount = 1',
      to: 'amount = 2',
      mutantSha256: sha(source.replace('amount = 1', 'amount = 2')),
      restored: { sourceExact: true, currentTestExact: true },
      reports: [
        { id: 'old', fullName: 'value' },
        { id: 'new', fullName: 'value' },
      ],
    }),
  }
  const module = {
    id: 'counter',
    namespace: 'n',
    inputs: [input],
    outputs: [{ path: input.path, sha256: input.sha256 }],
    replacements: [],
    registrations: [
      {
        old: { file: input.path, ordinal: 0 },
        current: { file: input.path, titles: [], template: 'value' },
      },
    ],
    identities: [
      {
        old: { file: input.path, fullName: 'value' },
        current: { file: input.path, fullName: 'value' },
      },
    ],
    retirements: [],
    cohortSubjects: [],
    preserved: [],
    profiles: [],
    neighborPaths: [input.path],
    cleanExecutions: [],
    counter: 'counter.json',
  }
  const fixture = {
    id: 'move',
    namespace: 'n',
    cohortSubjects: [],
    providers: {
      before: [{ path: 'old-fixture.ts', member: 'old-provider', sha256: sha(provider) }],
      current: [{ path: 'fixture.ts', sha256: sha(provider), imports: [] }],
    },
    consumers: [{ ...input, currentSha256: sha(moved) }],
    exports: [
      {
        oldPath: 'old-fixture.ts',
        oldName: 'value',
        currentPath: 'fixture.ts',
        currentName: 'value',
      },
    ],
    retiredPaths: ['old-fixture.ts'],
    preserved: [],
    profiles: [
      {
        path: 'fixture.ts',
        axes: Object.fromEntries([...'ABCDEFGH'].map((k) => [k, 'Synthetic boundary test only'])),
      },
    ],
    neighborPaths: [input.path],
    cleanExecutions: [],
  }
  const readCurrent = (p) => fs.readFileSync(path.join(dir, p), 'utf8')
  const readRecorded = (p, expected) =>
    p === input.path && expected === input.sha256 ? native[input.member] : readCurrent(p)
  try {
    fs.writeFileSync(path.join(dir, 'package.json'), '{}')
    fs.symlinkSync(path.join(process.cwd(), 'node_modules'), path.join(dir, 'node_modules'))
    fs.writeFileSync(path.join(dir, 'source.ts'), source)
    fs.writeFileSync(path.join(dir, input.path), original)
    fs.writeFileSync(path.join(dir, 'fixture.ts'), provider)
    run({ dir, root, original, moved, input, native, module, fixture, readRecorded, readCurrent })
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function successorModule(module, moved) {
  return {
    ...module,
    counter: undefined,
    outputs: [{ path: 'case.test.ts', sha256: sha(moved) }],
    sourceBridges: [
      {
        path: 'case.test.ts',
        changes: [{ from: './old-fixture.js', to: './fixture.js', count: 1 }],
      },
    ],
  }
}

test('same candidate counter needs no successor checkpoint', () =>
  scenario(({ root, native, module }) => {
    assert.equal(verifyModuleOrganization(root, native, module).neighborCases, 1)
  }))

test('verified import move keeps historical counter through the declared checkpoint', () =>
  scenario(({ dir, root, moved, native, module, fixture, readRecorded }) => {
    fs.writeFileSync(path.join(dir, 'case.test.ts'), moved)
    assert.equal(verifyModuleOrganization(root, native, module, readRecorded).neighborCases, 1)
    assert.equal(verifyFixtureOrganization(root, native, fixture).unchangedConsumerCases, 1)
    assert.equal(
      verifyModuleOrganization(root, native, successorModule(module, moved)).neighborCases,
      1,
    )
  }))

test('an import move without a declared checkpoint still fails', () =>
  scenario(({ dir, root, moved, native, module }) => {
    fs.writeFileSync(path.join(dir, 'case.test.ts'), moved)
    assert.throws(() => verifyModuleOrganization(root, native, module), { code: 'ERR_ASSERTION' })
  }))

test('corrupt frozen source cannot supply a checkpoint', () =>
  scenario(({ root, native, module, readRecorded }) => {
    native['old-case'] += '\n// different bytes'
    assert.throws(
      () => verifyModuleOrganization(root, native, module, readRecorded),
      /case.test.ts/,
    )
  }))

test('successor owner rejects changed assertions even with updated current hash', () =>
  scenario(({ dir, root, moved, native, fixture, module }) => {
    const weakened = moved.replace('toBe(1)', 'toBe(2)')
    fs.writeFileSync(path.join(dir, 'case.test.ts'), weakened)
    fixture.consumers[0].currentSha256 = sha(weakened)
    assert.throws(
      () => verifyFixtureOrganization(root, native, fixture),
      /Consumer body: case.test.ts/,
    )
    const owner = successorModule(module, moved)
    owner.outputs[0].sha256 = sha(weakened)
    assert.throws(() => verifyModuleOrganization(root, native, owner), /case.test.ts/)
  }))

test('counter business source stays bound to the physical current candidate', () =>
  scenario(({ dir, root, native, module, readRecorded }) => {
    const changed = 'export const amount = 3'
    fs.writeFileSync(path.join(dir, 'source.ts'), changed)
    assert.throws(
      () => verifyModuleOrganization(root, native, module, readRecorded),
      (error) => error.actual === sha(changed) && error.expected === sha('export const amount = 1'),
    )
  }))

test('counter results cannot include reported pending tests', () =>
  scenario(({ root, native, module }) => {
    const report = JSON.parse(native['n/new.native.json'])
    report.numPendingTests = 1
    report.testResults[0].assertionResults.push({ fullName: 'not executed', status: 'pending' })
    native['n/new.native.json'] = JSON.stringify(report)
    assert.throws(() => verifyModuleOrganization(root, native, module), { code: 'ERR_ASSERTION' })
  }))

test('a targeted counter reconciles deliberately excluded cases', () =>
  scenario(({ root, native, module }) => {
    for (const id of ['old', 'new']) {
      const key = `n/${id}.native.json`
      const report = JSON.parse(native[key])
      report.numPendingTests = 1
      report.numTotalTests = 2
      report.testResults[0].assertionResults.push({ fullName: 'not selected', status: 'skipped' })
      native[key] = JSON.stringify(report)
    }
    assert.equal(verifyModuleOrganization(root, native, module).neighborCases, 1)
  }))

test('unexecuted counter records cannot hide behind a zero pending count', () =>
  scenario(({ root, native, module }) => {
    const report = JSON.parse(native['n/new.native.json'])
    report.testResults[0].assertionResults.push({ fullName: 'hidden', status: 'skipped' })
    native['n/new.native.json'] = JSON.stringify(report)
    assert.throws(() => verifyModuleOrganization(root, native, module), { code: 'ERR_ASSERTION' })
  }))

function commentRepairScenario(run) {
  scenario((context) => {
    const before =
      "export { value } from './fixture.js';export const record={first:1,last:2};export function check(){expect(record.last).toBe(2)}"
    const after = `/** A corrected ownership explanation. */\n${before}`
    const input = { path: 'comment.ts', member: 'old-comment', sha256: sha(before) }
    const output = { path: input.path, sha256: sha(after) }
    context.native[input.member] = before
    context.module.commentRepair = {
      input,
      output,
      profile: {
        path: output.path,
        axes: Object.fromEntries([...'ABCDEFGH'].map((k) => [k, 'Synthetic comment boundary'])),
      },
    }
    fs.writeFileSync(path.join(context.dir, input.path), after)
    run({ ...context, before, after, input, output })
  })
}

test('comment-only re-export module stays executable-identical and supplies a forward checkpoint', () =>
  commentRepairScenario(({ root, native, module, input }) => {
    assert.equal(verifyModuleOrganization(root, native, module).neighborCases, 1)
    assert.deepEqual(moduleFrozenInputs(module), [...module.inputs, input])
  }))

for (const [name, from, to] of [
  ['last object field', 'last:2', 'last:3'],
  ['last assertion', 'toBe(2)', 'toBe(3)'],
  ['re-export source', './fixture.js', './other.js'],
  ['re-export name', '{ value }', '{ other }'],
  ['declaration ownership', 'const record', 'let record'],
])
  test(`comment repair rejects changed ${name} even when the after hash is updated`, () =>
    commentRepairScenario(({ dir, root, native, module, after, output }) => {
      const changed = after.replace(from, to)
      assert.notEqual(changed, after)
      fs.writeFileSync(path.join(dir, output.path), changed)
      output.sha256 = sha(changed)
      assert.throws(() => verifyModuleOrganization(root, native, module), /Comment-only repair/)
    }))

test('comment repair rejects corrupt frozen bytes', () =>
  commentRepairScenario(({ root, native, module, input }) => {
    native[input.member] += '\n// not the frozen source'
    assert.throws(() => verifyModuleOrganization(root, native, module), { code: 'ERR_ASSERTION' })
  }))
