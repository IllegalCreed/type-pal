import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dir, '../../../../..')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const report = JSON.parse(fs.readFileSync(path.join(dir, 'review.json')))
const stale = [
  ...report.files,
  ...report.context,
  ...report.primary,
  ...report.externalAssets,
].filter(
  (pin) =>
    !fs.existsSync(path.join(root, pin.path)) ||
    hash(fs.readFileSync(path.join(root, pin.path))) !== pin.sha256,
)
if (stale.length) {
  console.log(
    JSON.stringify({
      state: 'STALE',
      paths: stale.map((pin) => pin.path),
      scope: 'Only affected claims need revalidation.',
    }),
  )
  process.exitCode = 2
} else {
  for (const file of report.files) assert.deepEqual(Object.keys(file.dimensions), [...'ABCDEFGH'])
  const compressed = fs.readFileSync(path.join(dir, report.rawArchive.path))
  assert.equal(hash(compressed), report.rawArchive.sha256)
  const archive = new Map()
  for (const [name, item] of Object.entries(JSON.parse(gunzipSync(compressed)))) {
    const bytes = Buffer.from(item.base64, 'base64')
    assert.equal(bytes.length, item.bytes, name)
    assert.equal(hash(bytes), item.sha256, name)
    archive.set(name, bytes)
  }
  assert.equal(archive.size, report.rawArchive.entries)
  const json = (name) => JSON.parse(archive.get(name))
  const native = (id, passed, failed, files) => {
    const execution = json(`${id}.execution.json`),
      result = json(`${id}.vitest.json`)
    assert.equal(execution.exit, failed ? 1 : 0)
    assert.equal(execution.signal, null)
    assert.equal(execution.spawnError, null)
    assert.equal(result.numPassedTests, passed)
    assert.equal(result.numFailedTests, failed)
    assert.equal(result.numTotalTests, passed + failed)
    assert.equal(result.numPendingTests, 0)
    assert.equal(result.numTodoTests, 0)
    assert.equal(result.testResults.length, files)
    const cases = result.testResults.flatMap((file) => file.assertionResults)
    assert.equal(cases.length, passed + failed)
    for (const item of cases.filter((item) => item.status === 'failed')) {
      assert(item.failureMessages.length > 0)
      assert(item.failureMessages.every((message) => message.startsWith('AssertionError:')))
    }
    if (!failed) {
      assert.equal(archive.get(`${id}.stderr.raw`).length, 0)
      assert(!/\b(?:stdout|stderr)\s*\|/.test(archive.get(`${id}.stdout.raw`).toString()))
    }
    return cases
  }
  native('cap-50-old', 7, 0, 1)
  native('cap-50-new', 5, 2, 1)
  native('mutate-restore-input-old', 7, 0, 1)
  native('mutate-restore-input-new', 6, 1, 1)
  native('force-all-mp-success-old', 6, 0, 1)
  native('force-all-mp-success-new', 4, 2, 1)
  native('wrong-unknown-role-diagnostic-old', 41, 0, 1)
  native('wrong-unknown-role-diagnostic-new', 40, 1, 1)
  native('final-local', 610, 0, 13)
  native('poison-adjacent-final', 486, 0, 11)
  native('equip-cleanup', 36, 0, 1)
  const red = native('poison-approved-red', 0, 2, 1)
  const green = native('poison-approved-green', 29, 0, 3)
  assert.deepEqual(
    red.map((item) => item.fullName),
    green.filter((item) => item.fullName.startsWith('Wear removal ')).map((item) => item.fullName),
  )
  const testPath = 'packages/game/src/core/player-poison-equipment-lifecycle.test.ts'
  assert.equal(
    hash(archive.get('poison-red-spec.ts')),
    hash(fs.readFileSync(path.join(root, testPath))),
  )
  for (const id of ['history-counters', 'opcode-counters', 'warning-counter'])
    assert.equal(json(`${id}.json`).restored, true)

  // Narrow normalization only: local rename, a dead literal and expansion of the unchanged target helper.
  const ts = createRequire(path.join(root, 'package.json'))('typescript')
  const canon = (name, source) => {
    if (name.endsWith('event-opcode-player.ts'))
      source = source.replaceAll(
        'playerTargets(gs, currentEventObjectId, applyAll)',
        'applyAll ? gs.partyMembers : currentEventObjectId !== undefined && currentEventObjectId !== 0xffff ? [currentEventObjectId] : []',
      )
    const ast = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true)
    const result = ts.transform(ast, [
      (context) => (node) => {
        const visit = (child) => {
          if (
            name.endsWith('mode.ts') &&
            ts.isIdentifier(child) &&
            child.text === 'waiting' &&
            !(ts.isPropertyAccessExpression(child.parent) && child.parent.name === child)
          )
            return ts.factory.createIdentifier('w')
          if (
            name.endsWith('scene-system-search.ts') &&
            ts.isVariableStatement(child) &&
            child.declarationList.declarations.length === 1 &&
            child.declarationList.declarations[0].name.getText(ast) === '_DIR_WEST'
          ) {
            assert.equal(child.declarationList.declarations[0].initializer.getText(ast), '1')
            return undefined
          }
          return ts.visitEachChild(child, visit, context)
        }
        return ts.visitNode(node, visit)
      },
    ])
    const printed = ts.createPrinter({ removeComments: true }).printFile(result.transformed[0])
    result.dispose()
    const parsed = ts.createSourceFile(name, printed, ts.ScriptTarget.Latest, true)
    const shape = (node) => {
      const children = node.getChildren(parsed)
      return [node.kind, children.length ? children.map(shape) : node.getText(parsed)]
    }
    return JSON.stringify(shape(parsed))
  }
  for (const base of [
    'dialog-history.ts',
    'mode.ts',
    'scene-system-search.ts',
    'event-system.ts',
    'event-opcode-player.ts',
    'equipment-state.ts',
  ]) {
    const name = `packages/game/src/core/${base}`
    const old = execFileSync('git', ['show', `${report.base}:${name}`], {
      cwd: root,
      encoding: 'utf8',
    })
    assert(canon(name, old) === canon(name, fs.readFileSync(path.join(root, name), 'utf8')), base)
  }
  console.log(
    JSON.stringify({
      state: 'MATCH',
      files: report.files.length,
      rawEntries: archive.size,
      preservedCounters: 4,
      businessRed: 2,
      approvedPolicy: 'stable Wear compaction, retain global dedup and poisons after holes',
      unifiedGates: 'DEFERRED',
      scope:
        'Specified identity/results and narrow source continuity; not automatic semantic or whole-pre94 acceptance.',
    }),
  )
}
