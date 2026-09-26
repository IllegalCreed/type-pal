import { validateSkills } from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import {
  magic,
  raw,
  type SourceInstruction,
  spell,
  unchanged,
} from './__tests__/pure-migration-fixtures.js'
import {
  buildLabelIndex,
  mapSkills,
  mapSourceMagicAnimation,
  type SourceMagic,
  type SourceSpell,
} from './migrate-content.js'

function assemble(
  spells: SourceSpell[],
  magics: SourceMagic[],
  commands: SourceInstruction[] = [],
  enabled = true,
) {
  return unchanged({ spells, magics, commands }, (v) =>
    mapSkills(
      v.spells,
      new Map(v.magics.map((m) => [m.id, m])),
      (ip) => [`desc:${ip}`, 'second'],
      v.commands,
      buildLabelIndex(v.commands),
      undefined,
      enabled,
      'current-r13-6b',
    ),
  )
}

describe('self-contained skill record assembly', () => {
  it.each([
    'normal',
    'attackAll',
    'attackField',
    'attackWhole',
  ] as const)('animation %s normalizes signed fields without losing zero/default fields', (type) => {
    const m = magic({
      type,
      xOffset: 65530,
      yOffset: 32768,
      speed: 32767,
      sound: 2,
      keepEffect: 65535,
      fireDelay: 2,
      effectTimes: 3,
      shake: 4,
      wave: 5,
    })
    expect(unchanged(m, mapSourceMagicAnimation)).toEqual({
      effectSprite: 7,
      placement: type,
      xOffset: -6,
      yOffset: -32768,
      speed: 32767,
      fireDelay: 2,
      effectTimes: 3,
      shake: 4,
      wave: 5,
      sound: 'sound.pal.002',
      keepEffect: true,
    })
  })

  it('animation default fields and suppressed sound are distinct from authored keepEffect', () => {
    expect(
      mapSourceMagicAnimation(
        magic({ type: 'applyToPlayer', sound: 122, keepEffect: 1 }),
        () => undefined,
      ),
    ).toEqual({
      effectSprite: 7,
      placement: 'normal',
      xOffset: 0,
      yOffset: 0,
      speed: 0,
      fireDelay: 0,
      effectTimes: 0,
      shake: 0,
      wave: 0,
    })
  })

  it.each([
    ['normal', 'oneEnemy'],
    ['attackAll', 'allEnemies'],
    ['attackField', 'allEnemies'],
    ['attackWhole', 'allEnemies'],
    ['applyToPlayer', 'oneAlly'],
    ['applyToParty', 'allAllies'],
    ['trance', 'self'],
  ])('type %s maps target %s through the public assembler', (type, target) => {
    const result = assemble([spell()], [magic({ type })])
    expect(result).toEqual({
      skills: [
        {
          id: '400',
          name: '测试法术',
          desc: 'desc:0\nsecond',
          cost: { mp: 3 },
          usableOutsideBattle: false,
          target,
          effects: [{ kind: 'damage', power: 12, elemental: 0 }],
          animation: {
            effectSprite: 7,
            placement: ['attackAll', 'attackField', 'attackWhole'].includes(type) ? type : 'normal',
            xOffset: 0,
            yOffset: 0,
            speed: 0,
            fireDelay: 0,
            effectTimes: 0,
            shake: 0,
            wave: 0,
          },
        },
      ],
      pending: [],
      lossy: [],
    })
    expect(() => validateSkills({ skills: result.skills, levelUp: {} })).not.toThrow()
  })

  it('missing magic and unsupported type remain explicitly pending rather than silently lost', () => {
    expect(assemble([spell()], [])).toEqual({
      skills: [],
      pending: [{ id: 400, name: '测试法术', reason: 'magicNumber 1 不在 magic.json' }],
      lossy: [],
    })
    expect(assemble([spell()], [magic({ type: 'unknown' })])).toEqual({
      skills: [],
      pending: [{ id: 400, name: '测试法术', reason: 'type=unknown 无 target 映射' }],
      lossy: [],
    })
  })

  it('item-cost recognition requires complete remove/end shape and preserves default count of one', () => {
    const commands = [raw(0x68, [0], 'L_10'), raw(0x20, [23, 0, 40]), { op: 'end' }]
    const result = assemble([spell({ scriptOnUse: 10 })], [magic()], commands)
    expect(result.pending).toEqual([])
    expect(result.skills[0]?.cost).toEqual({ mp: 3, items: [{ itemId: '23', amount: 1 }] })
    expect(() => validateSkills({ skills: result.skills, levelUp: {} })).not.toThrow()
    const direct = [raw(0x20, [23, 2, 40], 'L_10'), { op: 'end' }]
    expect(assemble([spell({ scriptOnUse: 10 })], [magic()], direct).skills[0]?.cost).toEqual({
      mp: 3,
      items: [{ itemId: '23', amount: 2 }],
    })
  })

  it.each<{ name: string; commands: SourceInstruction[] }>([
    { name: 'missing entry', commands: [] },
    {
      name: 'nonzero enemy dispatch',
      commands: [raw(0x68, [1], 'L_10'), raw(0x20, [23, 1, 40]), { op: 'end' }],
    },
    { name: 'wrong opcode', commands: [raw(0x21, [23, 1, 40], 'L_10'), { op: 'end' }] },
    { name: 'missing end', commands: [raw(0x20, [23, 1, 40], 'L_10')] },
    { name: 'zero failure address', commands: [raw(0x20, [23, 1, 0], 'L_10'), { op: 'end' }] },
    { name: 'zero item', commands: [raw(0x20, [0, 1, 40], 'L_10'), { op: 'end' }] },
  ])('item-cost $name is not accepted as a partial skill', ({ commands }) => {
    expect(assemble([spell({ scriptOnUse: 10 })], [magic()], commands)).toEqual({
      skills: [],
      pending: [{ id: 400, name: '测试法术', reason: 'scriptOnUse=10(非纯物品门)→ 战斗期' }],
      lossy: [],
    })
  })

  it('explicitly disabled item-cost capability reports its existing diagnostic', () => {
    expect(
      assemble(
        [spell({ scriptOnUse: 10 })],
        [magic()],
        [raw(0x20, [23, 1, 40], 'L_10'), { op: 'end' }],
        false,
      ),
    ).toEqual({
      skills: [],
      pending: [
        { id: 400, name: '测试法术', reason: 'scriptOnUse=10(动态公式 0x35/0x88 系)→ 战斗期' },
      ],
      lossy: [],
    })
  })

  it('success-script pending and empty effects reject skill; script sound overrides animation source', () => {
    expect(
      assemble([spell({ scriptOnSuccess: 10 })], [magic()], [{ op: 'end', label: 'L_10' }]),
    ).toEqual({
      skills: [],
      pending: [{ id: 400, name: '测试法术', reason: 'scriptOnSuccess 空链(无效果 op)' }],
      lossy: [],
    })
    expect(assemble([spell({ scriptOnSuccess: 10 })], [magic()]).pending).toEqual([
      { id: 400, name: '测试法术', reason: 'L_10 不存在' },
    ])
    const result = assemble(
      [spell({ scriptOnSuccess: 10 })],
      [magic({ sound: 2 })],
      [raw(0x47, [3], 'L_10'), raw(0x1b, [0, 30]), raw(0x68, [50]), { op: 'end' }],
    )
    expect(result.pending).toEqual([])
    expect(result.skills[0]?.effects).toEqual([{ kind: 'healHp', amount: 30 }])
    expect(result.skills[0]?.animation?.sound).toBe('sound.pal.003')
    expect(result.lossy).toEqual([
      { id: 400, name: '测试法术', notes: ['0x68 敌方施法分支(alt L_50)未表达 —— 战斗期'] },
    ])
  })

  it('summon separates actor identity/tint/source sound from secondary effect animation', () => {
    const result = assemble(
      [spell()],
      [
        magic({ type: 'summon', special: 2, effect: 9, effectTimes: 65535, speed: 3, sound: 2 }),
        magic({ id: 9, effect: 4, sound: 3, type: 'attackAll' }),
      ],
    )
    expect(result.pending).toEqual([])
    expect(result.lossy).toEqual([])
    expect(result.skills[0]).toEqual({
      id: '400',
      name: '测试法术',
      desc: '',
      cost: { mp: 3 },
      usableOutsideBattle: false,
      target: 'allEnemies',
      effects: [
        {
          kind: 'summon',
          battleSprite: 'player-summon-12',
          speed: 3,
          tint: -1,
          sound: 'sound.pal.002',
        },
        { kind: 'damage', power: 12, elemental: 0 },
      ],
      animation: {
        effectSprite: 4,
        placement: 'attackAll',
        xOffset: 0,
        yOffset: 0,
        speed: 0,
        fireDelay: 0,
        effectTimes: 0,
        shake: 0,
        wave: 0,
        sound: 'sound.pal.003',
      },
    })
    expect(() => validateSkills({ skills: result.skills, levelUp: {} })).not.toThrow()
  })

  it('summon missing god identity fails loudly; current wine note and absent secondary animation stay explicit', () => {
    expect(() => assemble([spell()], [magic({ type: 'summon' })])).toThrow(
      '召唤技能 400(测试法术) 缺 magic.special(godId)',
    )
    const result = assemble([spell({ _name: '酒神' })], [magic({ type: 'summon', special: 0 })])
    expect(result.skills[0]?.effects).toEqual([
      { kind: 'summon', battleSprite: 'player-summon-10', speed: undefined },
      { kind: 'damage', power: 12, elemental: 0 },
    ])
    expect(result.skills[0]?.animation?.effectSprite).toBe(7)
    expect(result.lossy).toEqual([
      {
        id: 400,
        name: '酒神',
        notes: ['summon 伤害=按剩余真气×8 动态(原版 0x57 清空真气);暂按 baseDamage=3 直译'],
      },
    ])
  })
})
