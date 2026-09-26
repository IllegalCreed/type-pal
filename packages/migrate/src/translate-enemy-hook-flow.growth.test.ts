import { describe, expect, test } from 'vitest'
import { end, hookFixture, raw } from './__tests__/enemy-hook-fixtures.js'

describe('enemy hook growth boundaries', () => {
  test('adjacent growth aggregates all eight signed fields without losing the initial delta', () => {
    const result = hookFixture({
      100: [
        raw(0x19, 6, 2, 1),
        raw(0x19, 7, 10, 1),
        raw(0x19, 8, 11, 1),
        raw(0x19, 17, 12, 1),
        raw(0x19, 18, 13, 1),
        raw(0x19, 19, 14, 1),
        raw(0x19, 20, 15, 1),
        raw(0x19, 21, 16, 1),
        raw(0x19, 17, 65535, 1),
        end(),
      ],
    }).run()
    expect(result.hooks?.ready?.states.initial?.body).toEqual([
      {
        kind: 'applyActorGrowth',
        actor: 'li-xiaoyao',
        delta: {
          level: 2,
          maxHP: 10,
          maxMP: 11,
          attack: 11,
          magicAttack: 13,
          defense: 14,
          speed: 15,
          luck: 16,
        },
      },
    ])
    expect(result.hookSources?.ready?.sourceMappings.slice(0, 9)).toEqual(
      Array.from({ length: 9 }, (_, i) => ({
        sourceAddress: 100 + i,
        disposition: 'translated',
        targetSelectors: ['states.initial'],
      })),
    )
  })

  test('growth never coalesces across actor identity or intervening commands', () => {
    const zero = {
      level: 0,
      maxHP: 0,
      maxMP: 0,
      attack: 0,
      magicAttack: 0,
      defense: 0,
      speed: 0,
      luck: 0,
    }
    expect(
      hookFixture({
        100: [raw(0x19, 17, 4, 4), raw(0x19, 17, 5, 5), raw(0x85, 1), raw(0x19, 17, 6, 5), end()],
      }).ready().states.initial?.body,
    ).toEqual([
      { kind: 'applyActorGrowth', actor: 'wu-hou', delta: { ...zero, attack: 4 } },
      { kind: 'applyActorGrowth', actor: 'anu', delta: { ...zero, attack: 5 } },
      { kind: 'wait', ms: 80 },
      { kind: 'applyActorGrowth', actor: 'anu', delta: { ...zero, attack: 6 } },
    ])
  })

  test.each([
    [99, 1],
    [17, 0],
    [17, 7],
  ])('unsupported growth stat=%i role=%i fails instead of disappearing', (stat, role) => {
    expect(() => hookFixture({ 100: [raw(0x19, stat, 3, role), end()] }).run()).toThrow(
      'enemy-boundary「边界敌人」 ready L_100: 0x19 属性/角色不受支持',
    )
  })

  test('party recovery preserves signed delta, resurrection fraction and cast actor identity', () => {
    expect(
      hookFixture({
        100: [raw(0x22, 1, 7), raw(0x1d, 1, 65534), raw(0x92, 4), raw(0x92, 5), end()],
      }).ready().states.initial?.body,
    ).toEqual([
      { kind: 'revivePartyAll', tenths: 7 },
      { kind: 'increaseHpMp', delta: -2, pools: 'both' },
      { kind: 'playActorCastEffect', actor: 'wu-hou', effect: 'pre-magic-white-flash' },
      { kind: 'playActorCastEffect', actor: 'anu', effect: 'pre-magic-white-flash' },
    ])
    expect(() => hookFixture({ 100: [raw(0x92, 7), end()] }).run()).toThrow(
      '0x92 角色 word=7 不存在',
    )
  })

  test.each([
    0x22, 0x1d,
  ])('single-target recovery opcode %i is not silently treated as party-wide', (opcode) => {
    expect(() => hookFixture({ 100: [raw(opcode, 0, 1), end()] }).run()).toThrow(
      `op 0x${opcode.toString(16)} 不受敌 hook 支持`,
    )
  })
})
