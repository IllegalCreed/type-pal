import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import { gunzipSync } from 'node:zlib'

const folder = new URL('./', import.meta.url)
const root = fileURLToPath(new URL('../../../../../', import.meta.url))
const read = (path) => readFileSync(new URL(path, `file://${root}/`))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const review = JSON.parse(readFileSync(new URL('review.json', folder)))
assert.equal(review.files.length, 54)
for (const file of [...review.files, ...review.adjacent])
  assert.equal(sha(read(file.path)), file.sha256, file.path)
const archive = readFileSync(new URL(review.implementationReceipts.path, folder))
assert.equal(sha(archive), review.implementationReceipts.sha256)
const files = JSON.parse(gunzipSync(archive)).files
for (const [name, file] of Object.entries(files)) {
  assert.equal(Buffer.byteLength(file.text), file.bytes, name)
  assert.equal(sha(file.text), file.sha256, name)
}
const native = (id) => JSON.parse(files[`${id}.native.json`].text)
const red = native('slot-domain-red-r2')
assert.equal(red.numPassedTests, 2)
assert.equal(red.numFailedTests, 6)
assert.equal(red.numPendingTests, 0)
const expected = ['memory', 'indexedDB'].flatMap((backend) =>
  ['saveSlot', 'loadSlot', 'deleteSlot'].map(
    (op) =>
      `Save slot domain: ${backend} ${op} rejects each invalid number without changing a saved slot`,
  ),
)
const failed = red.testResults.flatMap((s) =>
  s.assertionResults.filter((a) => a.status === 'failed'),
)
assert.deepEqual(failed.map((f) => f.fullName).sort(), expected.sort())
for (const test of failed)
  assert(test.failureMessages.every((m) => m.startsWith('AssertionError:')))
for (const [id, count] of [
  ['menu-approved-final', 407],
  ['final-test-quality', 37],
  ['load-error-r2-old', 37],
]) {
  const result = native(id)
  assert.equal(result.numPassedTests, count, id)
  assert.equal(result.numFailedTests, 0, id)
  assert.equal(result.numPendingTests, 0, id)
  assert.equal(files[`${id}.stderr.raw`].text, '', id)
}
const counter = native('load-error-r2-new')
assert.equal(counter.numPassedTests, 36)
assert.equal(counter.numFailedTests, 1)
assert.equal(counter.numPendingTests, 0)
const counterFailures = counter.testResults.flatMap((s) =>
  s.assertionResults.filter((a) => a.status === 'failed'),
)
assert.equal(
  counterFailures[0].fullName,
  'cov85r3 菜单栈恢复与生命周期 save-slot load handler 异步 reject:记录原错误并收束，栈态不被破坏',
)
assert(counterFailures[0].failureMessages.every((m) => m.startsWith('AssertionError:')))
const baseline = JSON.parse(
  execFileSync('git', ['show', `${review.originMain}:scripts/coverage/baseline.fast.json`], {
    cwd: root,
  }),
).packages.game.fastTests.fileEntries
const { isApprovedTestRetirement } = await import(
  new URL('scripts/coverage/approved-test-retirements.mjs', `file://${root}/`)
)
const passed = native('menu-approved-final')
for (const approval of review.retirements.records) {
  const entry = passed.testResults.find((f) => f.name.endsWith(approval.file))
  const names = entry.assertionResults
    .map((a) => `${approval.file} :: project root :: ${[...a.ancestorTitles, a.title].join(' > ')}`)
    .sort((a, b) => a.localeCompare(b))
  const proof = {
    removal: {
      kind: 'test-count',
      value: approval.file,
      previous: approval.previous,
      current: approval.current,
    },
    previous: baseline.find((e) => e.file === approval.file),
    current: {
      file: approval.file,
      testCount: names.length,
      identityDigest: sha(JSON.stringify(names)),
    },
    fileSha256: sha(read(approval.file)),
  }
  assert.equal(isApprovedTestRetirement(proof), true, approval.file)
  assert.equal(
    isApprovedTestRetirement({ ...proof, fileSha256: 'wrong bytes' }),
    false,
    approval.file,
  )
}
if (review.uniform?.status === 'passed') {
  const compressed = readFileSync(new URL(review.uniform.receipts, folder))
  assert.equal(sha(compressed), review.uniform.receiptsSha256)
  const members = JSON.parse(gunzipSync(compressed))
  const receipt = (name) => {
    const member = members[name]
    assert(member, `missing uniform receipt: ${name}`)
    const bytes = Buffer.from(member.base64, 'base64')
    assert.equal(bytes.length, member.bytes, name)
    assert.equal(sha(bytes), member.sha256, name)
    return bytes.toString('utf8')
  }
  for (const name of Object.keys(members)) receipt(name)
  for (const id of review.uniform.cleanExecutions) {
    const execution = JSON.parse(receipt(`${id}.execution.json`))
    assert.equal(execution.exit, 0, id)
    assert.equal(execution.signal, null, id)
    assert.equal(execution.spawnError, null, id)
    assert.equal(execution.observerTimeout, false, id)
    assert.equal(receipt(`${id}.stderr.raw`), '', id)
  }
  const output = stripVTControlCharacters(receipt('whole-check-r3.stdout.raw'))
  const packages = [...output.matchAll(/^\s*Tests\s+(\d+) passed \((\d+)\)\s*$/gm)]
  assert.equal(packages.length, 7)
  assert(packages.every((match) => match[1] === match[2]))
  assert.equal(
    packages.reduce((count, match) => count + Number(match[1]), 0),
    20605,
  )
  assert.equal(
    [...output.matchAll(/^# pass (\d+)$/gm)].reduce((count, match) => count + Number(match[1]), 0),
    714,
  )
  assert(output.includes('0 errors / 0 warnings / 0 infos; complete report'))
  const official = JSON.parse(receipt('official-summary.json'))
  const persisted = JSON.parse(read('scripts/coverage/baseline.fast.json'))
  assert.equal(official.sourceFileCount, review.uniform.sourceFileCount)
  assert.equal(official.testCount, review.uniform.testCount)
  assert.deepEqual(persisted.total, official.total)
  for (const [id, item] of Object.entries(official.packages)) {
    const baselinePackage = persisted.packages[id]
    for (const field of ['metrics', 'sourceFiles', 'scopeDigest'])
      assert.deepEqual(baselinePackage[field], item[field], `${id}.${field}`)
    const { identities: _identities, ...snapshot } = item.fastTests
    assert.deepEqual(baselinePackage.fastTests, snapshot, `${id}.fastTests`)
  }
  console.log(
    'PASS:all uniform raw bytes,clean executions,20605+714 full-check results,and frozen official metrics/scope/identities match current baseline. Publication/semantic quality are separate claims.',
  )
}
console.log(
  `PASS:54main+${review.adjacent.length}adjacent bindings,all implementation raw bytes,6exact red contracts,407+37green,old37/new36+1counter,4strict retirement snapshots. Does not replace uniform gates.`,
)
