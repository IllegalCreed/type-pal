import type { SkillEffect } from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import { raw, type SourceInstruction, unchanged } from './__tests__/pure-migration-fixtures.js'
import { buildLabelIndex, translateSkillScript } from './migrate-content.js'

function run(commands: SourceInstruction[], ip = 10) {
  return unchanged(commands, (input) => translateSkillScript(input, buildLabelIndex(input), ip))
}

describe('self-contained skill effect translation', () => {
  const cases: { name: string; commands: SourceInstruction[]; effects: SkillEffect[] }[] = [
    {
      name: 'signed HP and MP amounts',
      commands: [raw(0x1b, [0, 65535], 'L_10'), raw(0x1c, [0, 20])],
      effects: [
        { kind: 'healHp', amount: -1 },
        { kind: 'healMp', amount: 20 },
      ],
    },
    {
      name: 'revive and both poison tiers',
      commands: [
        raw(0x22, [0, 3], 'L_10'),
        raw(0x2c, [0, 2]),
        raw(0x2c, [0, 3]),
        raw(0x2b, [0, 551]),
      ],
      effects: [
        { kind: 'revive', hpPercent: 30 },
        { kind: 'curePoison', curesTier: 'common' },
        { kind: 'curePoison', curesTier: 'severe' },
        { kind: 'curePoison', poisonId: '551' },
      ],
    },
    {
      name: 'status application preserves zero-resistance gate',
      commands: [raw(0x2d, [5, 2], 'L_10'), raw(0x2e, [2, 3]), raw(0x2e, [0, 0])],
      effects: [
        { kind: 'applyStatus', status: 'bravery', turns: 2 },
        { kind: 'applyStatus', status: 'sleep', turns: 3 },
        { kind: 'gate', magicResist: true },
      ],
    },
    {
      name: 'deduplicated removals keep encounter order',
      commands: [raw(0x2f, [0], 'L_10'), raw(0x2f, [2]), raw(0x2f, [0])],
      effects: [{ kind: 'removeStatus', statuses: ['confused', 'sleep'] }],
    },
    {
      name: 'gates precede terminal effects',
      commands: [raw(0x06, [60], 'L_10'), raw(0x64, [25]), raw(0x60), raw(0x33)],
      effects: [
        { kind: 'gate', chance: 60 },
        { kind: 'gate', hpAtMostPercent: 25 },
        { kind: 'instantKill' },
        { kind: 'collectTreasure' },
      ],
    },
    {
      name: 'poison, theft and form identity',
      commands: [raw(0x28, [0, 552], 'L_10'), raw(0x29, [0, 551]), raw(0x6a, [3]), raw(0x31, [4])],
      effects: [
        { kind: 'applyPoison', poisonId: '552' },
        { kind: 'applyPoison', poisonId: '551' },
        { kind: 'steal', rate: 3 },
        { kind: 'trance', battleSprite: 'player-fighter-4' },
      ],
    },
    {
      name: 'all buff attribute rows remain distinct',
      commands: [
        raw(0x30, [17, 50], 'L_10'),
        raw(0x30, [18, 40]),
        raw(0x30, [19, 30]),
        raw(0x30, [20, 20]),
      ],
      effects: [
        { kind: 'buffStat', stat: 'attack', percent: 50, duration: 'battle' },
        { kind: 'buffStat', stat: 'magic', percent: 40, duration: 'battle' },
        { kind: 'buffStat', stat: 'defense', percent: 30, duration: 'battle' },
        { kind: 'buffStat', stat: 'dexterity', percent: 20, duration: 'battle' },
      ],
    },
  ]
  for (const { name, commands, effects } of cases)
    it(name, () => {
      expect(run([...commands, { op: 'end' }, raw(0x35)])).toEqual({ effects, lossyNotes: [] })
    })

  it.each([
    { opcode: 0x2d, operands: [99, 2], reason: '0x2D 未知状态 id 99' },
    { opcode: 0x2e, operands: [99, 2], reason: '0x2E 未知状态 id 99' },
    { opcode: 0x2f, operands: [99], reason: '0x2F 未知状态 id 99' },
    { opcode: 0x30, operands: [99, 2], reason: '0x30 未知 row 99' },
    {
      opcode: 0x35,
      operands: [],
      reason: 'op 0x35 超出线性集(概率门/阈值门/战斗公式 → M1c-2/战斗期)',
    },
  ])('unsupported $opcode preserves prefix but explicitly diagnoses the whole translation', ({
    opcode,
    operands,
    reason,
  }) => {
    expect(run([raw(0x1b, [0, 10], 'L_10'), raw(opcode, operands), raw(0x1c, [0, 99])])).toEqual({
      effects: [{ kind: 'healHp', amount: 10 }],
      lossyNotes: [],
      pendingReason: reason,
    })
  })

  it('missing entry and non-linear command do not become empty successful effects', () => {
    expect(run([], 0)).toEqual({ effects: [], lossyNotes: [], pendingReason: 'L_0 不存在' })
    expect(run([], 99)).toEqual({ effects: [], lossyNotes: [], pendingReason: 'L_99 不存在' })
    expect(run([{ label: 'L_10', op: 'showDialog', text: 'hello' }])).toEqual({
      effects: [],
      lossyNotes: [],
      pendingReason: '非线性(showDialog)',
    })
  })

  it('tail calls follow real labels while missing target and cycles remain pending', () => {
    expect(
      run([
        { label: 'L_10', op: 'goto', to: 'L_30' },
        raw(0x35),
        { label: 'L_30' },
        raw(167),
        raw(0x1c, [0, 3]),
      ]),
    ).toEqual({ effects: [{ kind: 'healMp', amount: 3 }], lossyNotes: [] })
    expect(run([{ label: 'L_10', op: 'goto' }])).toEqual({
      effects: [],
      lossyNotes: [],
      pendingReason: 'goto ? 不可跟进(缺标签/回环)',
    })
    expect(run([{ label: 'L_10', op: 'goto', to: 'L_10' }])).toEqual({
      effects: [],
      lossyNotes: [],
      pendingReason: 'goto L_10 不可跟进(缺标签/回环)',
    })
  })

  it('sound resolver omission and repeated sound preserve one identity; conflicting identity stops translation', () => {
    const source = [
      raw(0x47, [0], 'L_10'),
      raw(0x47, [5]),
      raw(0x47, [6]),
      raw(0x47, [6]),
      raw(0x68, [31]),
      { op: 'end' },
    ]
    const calls: number[] = []
    expect(
      unchanged(source, (c) =>
        translateSkillScript(c, buildLabelIndex(c), 10, (n) => {
          calls.push(n)
          return n === 6 ? 'sound.custom' : undefined
        }),
      ),
    ).toEqual({
      effects: [],
      sound: 'sound.custom',
      lossyNotes: ['0x68 敌方施法分支(alt L_31)未表达 —— 战斗期'],
    })
    expect(calls).toEqual([5, 6, 6])
    expect(run([raw(0x47, [6], 'L_10'), raw(0x47, [7])])).toEqual({
      effects: [],
      sound: 'sound.pal.006',
      lossyNotes: [],
      pendingReason: '多个不同 0x47 音效(sound.pal.006,sound.pal.007)',
    })
  })

  it('default operands and unknown missing opcode are diagnosed at the actual instruction', () => {
    expect(run([{ op: 'raw', opcode: 0x1b, label: 'L_10' }])).toEqual({
      effects: [{ kind: 'healHp', amount: 0 }],
      lossyNotes: [],
    })
    expect(run([{ op: 'raw', label: 'L_10' }])).toEqual({
      effects: [],
      lossyNotes: [],
      pendingReason: 'op 0x0 超出线性集(概率门/阈值门/战斗公式 → M1c-2/战斗期)',
    })
  })
})
