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
  const palAutoFile = 'packages/reforge/src/pal-unified-steps-content.test.ts'
  const workspaceFile = 'packages/editor/src/ui/SceneScriptWorkspace.test.tsx'
  const historical = approvedTestRetirements.filter(
    (entry) => entry.file !== palAutoFile && entry.file !== workspaceFile,
  )
  assert.deepEqual(
    approvedTestRetirements.filter((entry) => entry.file === palAutoFile),
    [
      {
        file: palAutoFile,
        previous: 5414,
        current: 5410,
        previousIdentityDigest: '1952a3f8f7cb645ee161bbae45050334a83094c44796bd2d9072faba4e55855b',
        currentIdentityDigest: '00b739bc6c5e5465fe69a24cda7beeedd7a9c95d4e4c657cf1241e37cab2e450',
        fileSha256: '6dc2404d5fac5ea54fd62ec4101d830405842a352395ce9f32b47f8707ca1523',
      },
      {
        file: palAutoFile,
        previous: 5410,
        current: 5406,
        previousIdentityDigest: '00b739bc6c5e5465fe69a24cda7beeedd7a9c95d4e4c657cf1241e37cab2e450',
        currentIdentityDigest: '3fbc8654e47b43b9a3a377a57acb507751bff58afac3b4d7e250bb883e566efa',
        fileSha256: '2efbeacc654c8df2dbfc1cebb0b61f85259a34c2d5bddd9e26664a7adf7feea5',
      },
      {
        file: palAutoFile,
        previous: 5406,
        current: 5404,
        previousIdentityDigest: '8b4314499191fa049c7ccf96d2a6491f92b6369b8fd31ef4b6087177a2a2e7b2',
        currentIdentityDigest: 'ae3a7f9cfdc2290a1588205cface1f180d605aaeae0d689be06c26243fcb5a84',
        fileSha256: '64a697fc706c100bd295dbebf50a2fc6d549969ab3f7ad7568d5e2387b4fdd21',
      },
      {
        file: palAutoFile,
        previous: 5404,
        current: 5167,
        previousIdentityDigest: 'ae3a7f9cfdc2290a1588205cface1f180d605aaeae0d689be06c26243fcb5a84',
        currentIdentityDigest: '69987d4f175eb1250205fbc4d76f6453aff6398393cce2c8fe51fe7720a56f85',
        fileSha256: 'df78da33df898da1d97d59eadfda0e48e292b1cd5661713df4b913d9f1512cc2',
      },
    ],
  )
  assert.deepEqual(
    approvedTestRetirements.filter((entry) => entry.file === workspaceFile),
    [
      {
        file: workspaceFile,
        previous: 10,
        current: 9,
        previousIdentityDigest: '474a9a8c7713d19f5a43384187a2f9443d6667bb48804e55d8144944bb6dfc6f',
        currentIdentityDigest: 'd919abf76fd922bf736e4e6c6371533dc020632c976f32d39e742bcc98c32d92',
        fileSha256: '5e2fb0fc53dc4b959d285af8f38d4a9d08a5d2d1d1a232a5a09908abc63949db',
      },
    ],
  )
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
  // CODE3k/3l: five exact file snapshots retire ten duplicate/subset cases.
  // CODE3m/3n: two exact overlapping contracts, each retaining its stronger oracle.
  // CODE3q: 32 cases relocate; 4 redundant cases transfer to stronger literal/matrix oracles.
  // CODE1: main26->19; GLM-o input-axis splits increase its current count.
  // CODE42: two test-only rectangle placeholders removed; native full identities pinned.
  // Window100: five new exact snapshots; PNG replaces5→4 with4→3; nine current removals.
  // Window2: eight exact snapshots, 23 case retirements; four deleted files stay separately audited.
  // Recent200: two new snapshots; map15→8 replaced by current8→6. Active snapshot sum remains255.
  // Naming/organization: eleven current snapshots replace six old entries; transfers retain their contracts.
  // Localization: messages13→3 moves all old cases to their consumers; +10 is a per-file delta.
  // Pending93: five exact current snapshots; net66 per-file cases move/merge.
  // Q2 casualty sweep checks retire after real caller and render assertions.
  // Content + adjacent window: three exact Reforge snapshots (18 per-file moves/merges).
  // Migration source projections: four exact snapshots transfer or merge nine per-file cases.
  // PAL shop scanner retirement: one exact snapshot, three per-file cases.
  // Reforge presentation: seven exact snapshots transfer or merge eighteen per-file cases.
  // This census sums snapshot count deltas, not retired unique business contracts.
  assert.equal(historical.length, 116)
  assert.equal(new Set(historical.map((entry) => entry.file)).size, 116)
  assert.equal(
    historical.reduce((sum, entry) => sum + entry.previous - entry.current, 0),
    502,
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
  [
    '旧数量伪造',
    { ...exact, previous: { ...exact.previous, testCount: exact.previous.testCount + 1 } },
  ],
  ['旧文件不相同', { ...exact, previous: { ...exact.previous, file: 'different.test.ts' } }],
  ['新文件不相同', { ...exact, current: { ...exact.current, file: 'different.test.ts' } }],
  ['文件字节漂移', { ...exact, fileSha256: 'different' }],
  ['缺旧条目', { ...exact, previous: undefined }],
  ['缺新条目', { ...exact, current: undefined }],
]
for (const [name, input] of refusals) {
  test(`退役判据拒绝：${name}`, () => assert.equal(isApprovedTestRetirement(input), false))
}
