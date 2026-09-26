import { validateItems } from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import { raw, type SourceInstruction, unchanged } from './__tests__/pure-migration-fixtures.js'
import { buildLabelIndex, translateEquipScript } from './migrate-content.js'

function run(commands: SourceInstruction[], actors: string[] = ['li-xiaoyao'], ip = 10) {
  return unchanged({ commands, actors }, (v) =>
    translateEquipScript(v.commands, buildLabelIndex(v.commands), ip, v.actors),
  )
}

describe('self-contained equipment translation', () => {
  it('absent entry is empty; pure labels and markers precede an explicit slot with no phantom effects', () => {
    expect(run([], [], 0)).toEqual({ effects: [], pending: [] })
    expect(run([])).toEqual({ effects: [], pending: [] })
    expect(run([{ label: 'L_10' }, raw(167), raw(0x18, [14]), { op: 'end' }, raw(0x99)])).toEqual({
      slot: 'weapon',
      effects: [],
      pending: [],
    })
  })

  it('stat, resistance and max-pool rows retain signed values and exact order', () => {
    const result = run([
      raw(0x18, [11], 'L_10'),
      raw(0x17, [0, 17, 65535]),
      raw(0x17, [0, 18, 2]),
      raw(0x17, [0, 19, 3]),
      raw(0x17, [0, 20, 4]),
      raw(0x17, [0, 21, 5]),
      raw(0x17, [0, 22, 6]),
      raw(0x17, [0, 23, 7]),
      raw(0x17, [0, 24, 8]),
      raw(0x17, [0, 25, 9]),
      raw(0x17, [0, 26, 10]),
      raw(0x17, [0, 27, 11]),
      raw(0x17, [0, 7, 12]),
      raw(0x17, [0, 8, 13]),
      { op: 'end' },
    ])
    expect(result).toEqual({
      slot: 'head',
      pending: [],
      effects: [
        { kind: 'statBonus', stat: 'attack', delta: -1 },
        { kind: 'statBonus', stat: 'magicAttack', delta: 2 },
        { kind: 'statBonus', stat: 'defense', delta: 3 },
        { kind: 'statBonus', stat: 'speed', delta: 4 },
        { kind: 'statBonus', stat: 'luck', delta: 5 },
        { kind: 'resistance', element: 'poison', percent: 6 },
        { kind: 'resistance', element: 'wind', percent: 7 },
        { kind: 'resistance', element: 'thunder', percent: 8 },
        { kind: 'resistance', element: 'water', percent: 9 },
        { kind: 'resistance', element: 'fire', percent: 10 },
        { kind: 'resistance', element: 'earth', percent: 11 },
        { kind: 'maxPool', pool: 'hp', delta: 12 },
        { kind: 'maxPool', pool: 'mp', delta: 13 },
      ],
    })
    expect(() =>
      validateItems([
        {
          id: '20',
          name: '装备',
          buyPrice: 1,
          sellPrice: 0,
          sellable: true,
          equip: { slot: 'head', equipableBy: ['li-xiaoyao'], effects: result.effects },
        },
      ]),
    ).not.toThrow()
  })

  it('last battle form assignment replaces only earlier form effects across all equipable actors', () => {
    const result = run(
      [
        raw(0x1a, [1, 2], 'L_10'),
        raw(0x1a, [65, 336]),
        raw(0x1a, [4, 1]),
        raw(0x1a, [1, 9]),
        raw(0x2d, [8]),
        raw(0x29, [0, 563]),
        raw(0x29, [0, 564]),
      ],
      ['li-xiaoyao', 'wu-hou'],
    )
    expect(result).toEqual({
      pending: [],
      effects: [
        { kind: 'grantSkill', skillId: '336' },
        { kind: 'attackAll' },
        {
          kind: 'battleSprite',
          byActor: { 'li-xiaoyao': 'player-fighter-9', 'wu-hou': 'player-fighter-9' },
        },
        { kind: 'grantStatus', status: 'dualAttack' },
        { kind: 'regenHp', amount: 20 },
        { kind: 'regenMp', amount: 20 },
      ],
    })
  })

  it.each([
    -1, 10,
  ])('out-of-domain fighter %s is diagnostic, with no guessed replacement', (fighter) => {
    expect(run([raw(0x1a, [1, fighter, 7], 'L_10')])).toEqual({
      effects: [],
      pending: [
        {
          opcode: 0x1a,
          operands: [1, fighter, 7],
          reason: `装备战斗精灵号 ${fighter} 不在 player fighter 0..9`,
        },
      ],
    })
  })

  it('battle-form input needs nonempty owners; pending rows remain alongside later recognized effects', () => {
    expect(run([raw(0x1a, [1, 2], 'L_10')], [])).toEqual({
      effects: [],
      pending: [
        {
          opcode: 0x1a,
          operands: [1, 2, 0],
          reason: '装备战斗形象没有可装备角色，无法建立按角色覆写',
        },
      ],
    })
    const result = run([
      raw(0x17, [2, 99, 3], 'L_10'),
      raw(0x1a, [99, 4, 5]),
      raw(0x2d, [0, 2]),
      raw(0x29, [0, 552]),
      raw(0x99),
      raw(0x17, [0, 17, 8]),
    ])
    expect(result).toEqual({
      effects: [{ kind: 'statBonus', stat: 'attack', delta: 8 }],
      pending: [
        { opcode: 0x17, operands: [2, 99, 3], reason: '未知 row 99' },
        { opcode: 0x1a, operands: [99, 4, 5], reason: '未知 row 99' },
        { opcode: 0x2d, operands: [0, 2, 0], reason: '未知状态 id 0' },
        { opcode: 0x29, operands: [0, 552, 0], reason: '装备授毒 id 552(非回补伪毒)' },
        { opcode: 0x99, operands: [0, 0, 0], reason: '封闭集外 opcode' },
      ],
    })
  })

  it('non-raw instruction stops while absent opcode records the current explicit sentinel', () => {
    expect(
      run([{ op: 'raw', label: 'L_10' }, { op: 'showDialog', text: 'unexpected' }, raw(0x1a, [4])]),
    ).toEqual({
      effects: [],
      pending: [
        { opcode: -1, operands: [0, 0, 0], reason: '封闭集外 opcode' },
        { opcode: -1, operands: [], reason: '非 raw op "showDialog"' },
      ],
    })
  })
})
