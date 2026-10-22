import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../../../../..')
const require = createRequire(path.join(root, 'package.json'))
const ts = require('typescript')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const review = JSON.parse(fs.readFileSync(path.join(here, 'review.json')))
const packed = fs.readFileSync(path.join(here, review.native.path))
assert.equal(hash(packed), review.native.sha256)
const native = JSON.parse(gunzipSync(packed))
assert.deepEqual(Object.keys(native.members).sort(), Object.keys(review.native.members).sort())
const member = (name) => Buffer.from(native.members[name].data, 'base64')
const json = (name) => JSON.parse(member(name))
for (const [name, pin] of Object.entries(review.native.members)) {
  assert.equal(native.members[name].encoding, 'base64', name)
  const bytes = member(name)
  assert.equal(bytes.length, pin.bytes, name)
  assert.equal(hash(bytes), pin.sha256, name)
}
for (const pin of [...review.sourceBindings, ...review.primary]) {
  assert.equal(hash(fs.readFileSync(path.join(root, pin.path))), pin.sha256, pin.path)
}
for (const file of review.files) {
  assert.deepEqual(Object.keys(file.dimensions).sort(), [...'ABCDEFGH'])
  assert(Object.values(file.dimensions).every((text) => typeof text === 'string' && text.length))
}
const emit = (text) =>
  ts.transpileModule(text, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      removeComments: true,
    },
  }).outputText
const tokens = (text) => {
  const scan = ts.createScanner(
    ts.ScriptTarget.ES2022,
    true,
    ts.LanguageVariant.Standard,
    emit(text),
  )
  const result = []
  while (scan.scan() !== ts.SyntaxKind.EndOfFileToken) {
    result.push([scan.getToken(), scan.getTokenText()])
  }
  return result
}
for (const file of json('basic/refactor-invariance.json').files) {
  assert.deepEqual(
    tokens(fs.readFileSync(path.join(root, file.path), 'utf8')),
    tokens(member(`basic/${file.draft}`).toString()),
    file.path,
  )
}
for (const row of json('mobile/two-comment-invariance.json').rows) {
  const name = path.basename(row.path, '.ts')
  assert.equal(
    emit(member(`mobile/${name}-comment-before.ts`).toString()),
    emit(fs.readFileSync(path.join(root, row.path), 'utf8')),
    row.path,
  )
}
const cases = (name) => json(name).testResults.flatMap((file) => file.assertionResults)
const green = (name, count) => {
  const result = json(name)
  assert.equal(result.numPassedTests, count, name)
  assert.equal(result.numFailedTests, 0, name)
  assert(
    cases(name).every((test) => test.status === 'passed'),
    name,
  )
}
const red = (name, passed, expected) => {
  const result = json(name)
  assert.equal(result.numPassedTests, passed, name)
  const failed = cases(name).filter((test) => test.status === 'failed')
  assert.equal(result.numFailedTests, expected.length, name)
  assert.equal(failed.length, expected.length, name)
  failed.forEach((test, index) => {
    assert(test.fullName.includes(expected[index]), test.fullName)
    assert(test.failureMessages.join('\n').includes('AssertionError'), name)
  })
  return failed
}
green('basic/basic-draft-six-adjacent.native.json', 154)
green('basic/old-test-reroll-mutant-green.native.json', 7)
red('basic/preferred-slot-reroll-mutant-red.native.json', 6, ['宿主预选队伍位置'])
green('basic/preferred-slot-restored-green.native.json', 7)
green('mobile/privacy-old-noop.native.json', 2)
red('mobile/privacy-new-noop.native.json', 1, ['公开安装器'])
green('mobile/privacy-restored-new.native.json', 2)
green('mobile/analytics-adjacent.native.json', 30)
const aviRed = red('mobile/avi-final-old-source-red.native.json', 3, ['连续拒绝', '旧提示'])
assert(aviRed[0].failureMessages.join('\n').includes('to be undefined'))
assert.equal(
  json('mobile/avi-final-old-source-red.execution.json').testSha256,
  hash(
    fs.readFileSync(path.join(root, 'packages/game/src/shell/avi-player.glm-next-wave.test.ts')),
  ),
)
green('mobile/avi-adjacent-final.native.json', 61)
for (const id of ['analytics-adjacent', 'avi-adjacent-final', 'avi-types']) {
  assert.equal(json(`mobile/${id}.execution.json`).exit, 0)
  assert.equal(member(`mobile/${id}.stderr.raw`).length, 0)
}
for (const name of ['docs', 'coverage-final']) {
  const run = json(`ci868/github-868-${name}.raw`)
  assert.equal(run.headSha, review.base)
  assert.equal(run.conclusion, 'success')
}
for (const name of ['docs', 'coverage']) {
  const suffix = name === 'coverage' ? '-r2' : ''
  const annotations = json(`ci868/github-868-${name}-annotations${suffix}.raw`)
  assert.equal(annotations.length, 2)
  assert.equal(annotations.filter((item) => item.annotation_level === 'warning').length, 1)
  assert.equal(annotations.filter((item) => item.annotation_level === 'notice').length, 1)
}
console.log(
  JSON.stringify({
    currentBindingsMatch: review.sourceBindings.length,
    perFileEightDimensions: review.files.length,
    archiveMembers: Object.keys(native.members).length,
    formalAviCounter: '3 passed / 2 named AssertionErrors; current adjacent61 green',
    historicalMainCi: '868 Docs and Coverage succeeded; platform warning+notice retained',
    groupedGates: review.validation.gates,
    limits: 'Read-only evidence verification; no tests, network or acceptance promotion performed.',
  }),
)
