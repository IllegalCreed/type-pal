import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { auditCodeQualityLedger } from './code-quality-ledger.mjs'

const inventory = {
  schemaVersion: 1,
  records: ['a.ts', 'b.test.ts', 'c.ts'].map((path) => ({ path })),
}
const rowA = '| `a.ts` | product | 已验证 | primary:1 + caller + regression | reviewed |'
const rowB = '| `b.test.ts` | test | review | direct test executed | oracle still pending |'
const ledger = (rows = [rowA, rowB]) =>
  [
    '当前 tracked 清单（test revision）：3。',
    '当前已闭合核验：1；已读但待审：1；尚未逐文件核验：1；合计未闭合：2。',
    '',
    '| 文件 | 类别 | 状态 | 证据 / 验证 | 备注 |',
    '|---|---|---|---|---|',
    ...rows,
    '',
  ].join('\n')

test('unique files determine all counts; running the guard does not change evidence', () => {
  const source = ledger()
  const before = JSON.stringify(inventory)
  assert.deepEqual(auditCodeQualityLedger(source, inventory), {
    issues: [],
    counts: { total: 3, verified: 1, review: 1, pending: 1, unclosed: 2 },
  })
  assert.equal(JSON.stringify(inventory), before)
  assert.equal(source, ledger())
})

test('duplicate ledger row fails even if the header gives it no extra credit', () => {
  const result = auditCodeQualityLedger(ledger([rowA, rowB, rowA]), inventory)
  assert.deepEqual(result.issues, ['duplicate ledger path: a.ts'])
  assert.equal(result.counts.verified, 1)
})

test('untracked evidence path cannot count as a reviewed file', () => {
  const result = auditCodeQualityLedger(
    ledger([rowA, rowB, rowA.replace('a.ts', 'fake.ts')]),
    inventory,
  )
  assert.deepEqual(result.issues, ['unknown ledger path: fake.ts'])
  assert.equal(result.counts.verified, 1)
})

test('each published status count is checked independently', () => {
  for (const axis of ['已闭合核验', '已读但待审', '尚未逐文件核验', '合计未闭合']) {
    const changed = ledger().replace(new RegExp(`${axis}：\\d+`), `${axis}：9`)
    assert.match(
      auditCodeQualityLedger(changed, inventory).issues.join('\n'),
      /status count mismatch/,
    )
  }
})

test('added and removed tracked files invalidate inventory and pending counts', () => {
  for (const records of [
    [...inventory.records, { path: 'new.ts' }],
    inventory.records.slice(0, 2),
  ]) {
    const result = auditCodeQualityLedger(ledger(), { schemaVersion: 1, records })
    assert.match(result.issues.join('\n'), /inventory count mismatch/)
    assert.match(result.issues.join('\n'), /status count mismatch/)
  }
})

test('table shape, status and evidence cannot be silently skipped', () => {
  for (const [source, expected] of [
    [ledger().replace('|---|---|---|---|---|', '|---|'), /separator/],
    [
      ledger().replace(rowA, '| a.ts | product | 已验证 | evidence | note |'),
      /malformed ledger row/,
    ],
    [ledger().replace(rowA, rowA.replace('已验证', 'done')), /invalid status/],
    [ledger().replace(rowA, '| `a.ts` | product | 已验证 | | note |'), /missing evidence/],
  ])
    assert.match(auditCodeQualityLedger(source, inventory).issues.join('\n'), expected)
})

test('fenced examples give no credit; duplicate/missing summary or table fails closed', () => {
  assert.deepEqual(
    auditCodeQualityLedger(`${ledger()}\n\`\`\`md\n${ledger()}\`\`\``, inventory).issues,
    [],
  )
  for (const source of [
    ledger().replace('当前已闭合核验：', '旧快照：'),
    ledger() + ledger(),
    '',
  ]) {
    assert.ok(auditCodeQualityLedger(source, inventory).issues.length > 0)
  }
})

test('malformed or duplicate inventory is rejected before claiming success', () => {
  for (const invalid of [
    null,
    {},
    { schemaVersion: 1, records: [] },
    { schemaVersion: 1, records: [{ path: null }] },
    { schemaVersion: 1, records: [...inventory.records, { path: 'a.ts' }] },
  ]) {
    assert.ok(auditCodeQualityLedger(ledger(), invalid).issues.length > 0)
  }
})

test('real quality-tools caller checks the current repository ledger against the inventory CLI', () => {
  const run = spawnSync(
    process.execPath,
    [fileURLToPath(new URL('./code-quality-ledger.mjs', import.meta.url))],
    {
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
      encoding: 'utf8',
    },
  )
  assert.equal(run.status, 0, run.stderr)
  assert.match(run.stdout, /code-quality ledger: PASS/)
  assert.match(run.stdout, /semantic review still required/)
  assert.equal(run.stderr, '')
})
