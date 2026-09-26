import type { Command } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { body, raw, translation } from './__tests__/translation-fixtures.js'
import { assertNoMigrationGaps } from './translate-events.js'

function branchFixture(opcode: number, operands: number[]) {
  const f = translation([
    raw(opcode, operands),
    raw(0x09, [3]),
    { op: 'end' },
    raw(0x09, [7], 'L_900'),
  ])
  const stages = f.run('e3')
  expect(f.ctx.report.gaps).toEqual([])
  const refs = f.ctx.registry!.auditRecords()
  expect(refs).toHaveLength(1)
  expect(refs[0]!.source).toMatchObject({ label: 'L_900', owner: 'e3' })
  const ref = { chunk: refs[0]!.chunk, id: refs[0]!.id }
  expect(f.ctx.registry!.bodyFor(ref.id)).toEqual([{ kind: 'wait', ms: 280 }])
  const jump: Command[] = [{ kind: 'jumpScript', ref, self: 'e3' }]
  return { ...f, output: stages[0]!.body, jump }
}

describe('current translation branch boundaries', () => {
  test('insufficient money jumps before debit and positive awards do not spuriously branch', () => {
    const f = branchFixture(0x1e, [65526, 900])
    expect(f.output).toEqual([
      {
        kind: 'branch',
        cond: { kind: 'not', cond: { kind: 'hasMoney', atLeast: 10 } },
        then: f.jump,
      },
      { kind: 'giveMoney', delta: -10 },
      { kind: 'wait', ms: 120 },
    ])
    const positive = translation([raw(0x1e, [10, 900])])
    expect(positive.run('e3')).toEqual([{ body: [{ kind: 'giveMoney', delta: 10 }] }])
    expect(positive.ctx.registry!.auditRecords()).toEqual([])
    expect(positive.ctx.report.notes['addCash 正数带跳(原版不可能跳)']).toBe(1)
    expect(body([raw(0x1e, [65526, 0])])).toEqual([{ kind: 'giveMoney', delta: -10 }])
  })

  test.each([
    0, 3,
  ])('item removal checks owned count %i before consuming and retains default one', (count) => {
    const f = branchFixture(0x20, [20, count, 900])
    expect(f.output).toEqual([
      {
        kind: 'branch',
        cond: { kind: 'not', cond: { kind: 'ownsItem', itemId: '20', atLeast: count || 1 } },
        then: f.jump,
      },
      { kind: 'loseItem', itemId: '20', ...(count > 1 ? { count } : {}) },
      { kind: 'wait', ms: 120 },
    ])
    expect(body([raw(0x20, [20, count, 0])])).toEqual([
      { kind: 'loseItem', itemId: '20', ...(count > 1 ? { count } : {}) },
    ])
  })

  test('item possession is a non-consuming check distinct from ownsItem removal', () => {
    const f = branchFixture(0x58, [20, 0, 900])
    expect(f.output).toEqual([
      {
        kind: 'branch',
        cond: { kind: 'not', cond: { kind: 'hasItem', itemId: '20', atLeast: 1 } },
        then: f.jump,
      },
      { kind: 'wait', ms: 120 },
    ])
  })

  test.each([
    0, 2,
  ])('equipped-item threshold %i and all-full-HP keep distinct conditions', (count) => {
    const f = branchFixture(0x86, [20, count, 900])
    expect(f.output).toEqual([
      {
        kind: 'branch',
        cond: { kind: 'not', cond: { kind: 'itemEquipped', itemId: '20', atLeast: count || 1 } },
        then: f.jump,
      },
      { kind: 'wait', ms: 120 },
    ])
    const hp = branchFixture(0x74, [900])
    expect(hp.output).toEqual([
      { kind: 'branch', cond: { kind: 'not', cond: { kind: 'allFullHp' } }, then: hp.jump },
      { kind: 'wait', ms: 120 },
    ])
  })

  test.each([
    0, 2,
  ])('facing branch range %i changes trigger only after a positive-range hit', (range) => {
    const f = branchFixture(0x81, [2, range, 900])
    expect(f.output).toEqual([
      {
        kind: 'branch',
        cond: {
          kind: 'not',
          cond: { kind: 'facingEntity', entity: 'e1', ...(range ? { range } : {}) },
        },
        then: f.jump,
      },
      ...(range ? [{ kind: 'setEntityTriggerMode', entity: 'e1', on: 'touch', range }] : []),
      { kind: 'wait', ms: 120 },
    ])
  })

  test('entity membership, signed state and scene identity remain separate predicates', () => {
    const member = branchFixture(0x83, [2, 0, 900])
    expect(member.output).toEqual([
      {
        kind: 'branch',
        cond: { kind: 'not', cond: { kind: 'entityInScene', entity: 'e1' } },
        then: member.jump,
      },
      { kind: 'wait', ms: 120 },
    ])
    const state = branchFixture(0x94, [65535, 65535, 900])
    expect(state.output).toEqual([
      { kind: 'branch', cond: { kind: 'entityState', entity: 'e3', is: -1 }, then: state.jump },
      { kind: 'wait', ms: 120 },
    ])
    const scene = branchFixture(0x95, [2, 900])
    expect(scene.output).toEqual([
      { kind: 'branch', cond: { kind: 'currentScene', scene: 's001' }, then: scene.jump },
      { kind: 'wait', ms: 120 },
    ])
  })

  test('teleport failure invokes a registered target, absent failure target stays absent', () => {
    const f = branchFixture(0x38, [900])
    expect(f.output).toEqual([
      { kind: 'teleportOut', onFail: f.jump },
      { kind: 'wait', ms: 120 },
    ])
    expect(body([raw(0x38, [0])])).toEqual([{ kind: 'teleportOut' }])
  })

  test('missing target records a reachable gap rather than pretending the branch was translated', () => {
    const f = translation([raw(0x58, [20, 1, 900])])
    f.run('e3')
    expect(f.ctx.report.gaps).toHaveLength(1)
    expect(() => assertNoMigrationGaps(f.ctx.report)).toThrow('脚本引用目标缺失 L_900')
    expect(f.ctx.registry!.commandBodies()).toEqual([[]])
  })

  test('unimplemented control flow cuts the unsafe suffix; unknown linear opcode only records a gap', () => {
    const branch = translation([raw(0x2e, [1, 900]), raw(0x09, [3])])
    expect(branch.run('e3')).toEqual([{ body: [] }])
    expect(branch.ctx.report.flowCuts).toBe(1)
    expect(branch.ctx.report.gaps).toHaveLength(1)
    const linear = translation([raw(0xbeef), raw(0x09, [3])])
    expect(linear.run('e3')).toEqual([{ body: [{ kind: 'wait', ms: 120 }] }])
    expect(linear.ctx.report.flowCuts).toBe(0)
    expect(linear.ctx.report.gaps).toHaveLength(1)
  })
})
