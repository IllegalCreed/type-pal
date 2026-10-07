import assert from 'node:assert/strict'
import test from 'node:test'
import { approvedTestRetirements, isApprovedTestRetirement } from './approved-test-retirements.mjs'

const proof = (approval) => ({
  removal: {
    kind: 'test-count',
    value: approval.file,
    previous: approval.previous,
    current: approval.current,
  },
  previous: {
    file: approval.file,
    testCount: approval.previous,
    identityDigest: approval.previousIdentityDigest,
  },
  current: {
    file: approval.file,
    testCount: approval.current,
    identityDigest: approval.currentIdentityDigest,
  },
  fileSha256: approval.fileSha256,
})

test('批准账只含精确历史/审计文件，运行时不能扩大', () => {
  assert.equal(approvedTestRetirements.length, 13)
  assert.equal(new Set(approvedTestRetirements.map((entry) => entry.file)).size, 13)
  assert.equal(
    approvedTestRetirements.reduce((sum, entry) => sum + entry.previous - entry.current, 0),
    40,
  )
  assert.throws(() => approvedTestRetirements.push({}), TypeError)
  assert.throws(() => {
    approvedTestRetirements[0].current = 0
  }, TypeError)
})

for (const approval of approvedTestRetirements) {
  test(`仅精确历史快照获准：${approval.file}`, () => {
    // Actual file bytes are checked by the protected runner only when a retirement applies.
    // Do not prohibit legitimate future test edits after the new baseline is established.
    assert.equal(isApprovedTestRetirement(proof(approval)), true)
  })
}

const exact = proof(approvedTestRetirements[0])
const refusals = [
  [
    '未知第六文件',
    { ...exact, removal: { ...exact.removal, value: 'packages/migrate/src/other.test.ts' } },
  ],
  ['test-file删除不是计数退役', { ...exact, removal: { ...exact.removal, kind: 'test-file' } }],
  ['生产范围删除不适用', { ...exact, removal: { ...exact.removal, kind: 'source' } }],
  ['额外删除一例', { ...exact, removal: { ...exact.removal, current: exact.removal.current - 1 } }],
  ['其它旧数量', { ...exact, removal: { ...exact.removal, previous: exact.removal.previous + 1 } }],
  ['旧身份摘要漂移', { ...exact, previous: { ...exact.previous, identityDigest: 'different' } }],
  ['同数替换新身份', { ...exact, current: { ...exact.current, identityDigest: 'different' } }],
  [
    '候选数量伪造',
    { ...exact, current: { ...exact.current, testCount: exact.current.testCount + 1 } },
  ],
  ['旧数量伪造', { ...exact, previous: { ...exact.previous, testCount: 10 } }],
  ['旧文件不相同', { ...exact, previous: { ...exact.previous, file: 'different.test.ts' } }],
  ['新文件不相同', { ...exact, current: { ...exact.current, file: 'different.test.ts' } }],
  ['文件字节漂移', { ...exact, fileSha256: 'different' }],
  ['缺旧条目', { ...exact, previous: undefined }],
  ['缺新条目', { ...exact, current: undefined }],
]
for (const [name, input] of refusals) {
  test(`退役判据拒绝：${name}`, () => assert.equal(isApprovedTestRetirement(input), false))
}
