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
  // CODE94 C5 +3；C01精确退役3条；C02合并1条undo和1条草稿回流用例；C03去掉1条纯宿主占位；接收3y的sell精确退役1条；CODE2退役1条重复delta；CODE2b转移4条YJ2合同；CODE3主文件转移3条注释合同；C1精简一条同输入BALL弱重复；C10合并G07两弱子集。
  // CODE3h 两个坏 PNG 弱摘要并入完整上下文与真实 cause oracle。
  // CODE3h 启动主测试的 glyph 降级并入保留的独立屏障例。
  // CODE3u: duplicate player snapshots transferred with the independent conservation mutant.
  // CODE53/79/80/81/90：两份精确快照新增，分别净少6和1例；合同迁移见五卡回执。
  // CODE88: one weaker identical-input length assertion is covered by the retained exact labels.
  // CODE62/64/67: four detector cases move to canonical factories; exact scope snapshots only.
  // CODE43-47: five more exact snapshots, net nine retirements; predicates unchanged.
  // User2026-10-21 OGG retirement: one new file snapshot (+2 cases); replace old
  // glm 3->2 snapshot with current 2->1, preserving its old authority in Git/receipt.
  // Main script corrections: exact326→324 retirement retained alongside loader7→4.
  // CODE3h: three weak loader subsets transfer to exact retained HTTP/cache contracts.
  assert.equal(approvedTestRetirements.length, 52)
  assert.equal(new Set(approvedTestRetirements.map((entry) => entry.file)).size, 52)
  assert.equal(
    approvedTestRetirements.reduce((sum, entry) => sum + entry.previous - entry.current, 0),
    106,
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
    '未批准的其它文件',
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
