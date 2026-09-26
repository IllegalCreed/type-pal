import type { ItemData } from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import { raw, type SourceInstruction, unchanged } from './__tests__/pure-migration-fixtures.js'
import {
  buildLabelIndex,
  migratedItemUseScriptRef,
  translateThrowScript,
} from './migrate-content.js'

function run(commands: SourceInstruction[], ip = 10) {
  return unchanged(commands, (c) => translateThrowScript(c, buildLabelIndex(c), ip))
}

describe('self-contained thrown item translation', () => {
  it('poison and hp-damage sequence omits source control markers and stops at end', () => {
    expect(
      run([
        { label: 'L_10' },
        raw(167),
        raw(0x05),
        raw(0x28, [0, 552]),
        raw(0x5e),
        raw(0x60),
        raw(0x5b, [300]),
        { op: 'end' },
        raw(0x99),
      ]),
    ).toEqual({
      effects: [
        { kind: 'applyPoison', poisonId: '552' },
        { kind: 'currentHpDamage', numerator: 1, denominator: 2, bonus: 1, cap: 300 },
      ],
    })
    expect(run([{ label: 'L_10', op: 'raw', opcode: 0x5b }])).toEqual({
      effects: [{ kind: 'currentHpDamage', numerator: 1, denominator: 2, bonus: 1, cap: 0 }],
    })
  })

  it('missing/nonraw/unsupported paths remain explicit diagnostics', () => {
    expect(run([], 0)).toEqual({ effects: [], pendingReason: 'L_0 不存在' })
    expect(run([])).toEqual({ effects: [], pendingReason: 'L_10 不存在' })
    expect(run([{ label: 'L_10', op: 'showDialog', text: 'no' }])).toEqual({
      effects: [],
      pendingReason: '剧情类(showDialog)→ B2 脚本',
    })
    expect(run([{ label: 'L_10', op: 'raw' }])).toEqual({
      effects: [],
      pendingReason: 'op 0x0(相克 use 链)→ 相克 use 层',
    })
  })

  it.each([
    [1, 0],
    [0, 1],
  ])('simulated magic with gameplay parameters %i/%i is never downgraded to presentation', (b, d) => {
    expect(run([raw(0x28, [0, 551], 'L_10'), raw(0x42, [9, b, d])])).toEqual({
      effects: [{ kind: 'applyPoison', poisonId: '551' }],
      pendingReason: `0x42[9,${b},${d}] 含非零玩法参数，拒绝降级为纯演出`,
    })
  })

  it('presentation resolver receives actual object ids and preserves only proved visual output', () => {
    const presentation: NonNullable<NonNullable<ItemData['throw']>['presentation']> = {
      kind: 'magic',
      animation: {
        effectSprite: 3,
        placement: 'normal',
        xOffset: 0,
        yOffset: 0,
        speed: 0,
        fireDelay: 0,
        effectTimes: 0,
        shake: 0,
        wave: 0,
      },
    }
    const commands = [
      raw(0x42, [8], 'L_10'),
      raw(0x42, [9]),
      raw(0x42, [9]),
      raw(0x28, [0, 552]),
      { op: 'end' },
    ]
    const calls: number[] = []
    const input = { commands, presentation }
    expect(
      unchanged(input, (v) =>
        translateThrowScript(v.commands, buildLabelIndex(v.commands), 10, undefined, (id) => {
          calls.push(id)
          return id === 9 ? structuredClone(v.presentation) : undefined
        }),
      ),
    ).toEqual({ effects: [{ kind: 'applyPoison', poisonId: '552' }], presentation })
    expect(calls).toEqual([8, 9, 9])
    expect(run([raw(0x42, [9], 'L_10'), raw(0x28, [0, 552])])).toEqual({
      effects: [{ kind: 'applyPoison', poisonId: '552' }],
    })
  })

  it('conflicting presentations preserve the first in the diagnostic, without later gameplay effects', () => {
    const first = {
      kind: 'magic' as const,
      animation: {
        effectSprite: 3,
        placement: 'normal' as const,
        xOffset: 0,
        yOffset: 0,
        speed: 0,
        fireDelay: 0,
        effectTimes: 0,
        shake: 0,
        wave: 0,
      },
    }
    const commands = [raw(0x42, [8], 'L_10'), raw(0x42, [9]), raw(0x28, [0, 552])]
    const result = unchanged(commands, (c) =>
      translateThrowScript(c, buildLabelIndex(c), 10, undefined, (id) => ({
        kind: 'magic',
        animation: { ...first.animation, effectSprite: id === 8 ? 3 : 4 },
      })),
    )
    expect(result).toEqual({
      effects: [],
      presentation: first,
      pendingReason: '投掷链含多个不同魔法演出',
    })
  })

  it('sound resolver omission/repetition is safe, distinct sounds explicitly conflict', () => {
    const commands = [raw(0x47, [0], 'L_10'), raw(0x47, [2]), raw(0x47, [3]), raw(0x47, [3])]
    const calls: number[] = []
    expect(
      unchanged(commands, (c) =>
        translateThrowScript(c, buildLabelIndex(c), 10, (n) => {
          calls.push(n)
          return n === 3 ? 'sound.custom' : undefined
        }),
      ),
    ).toEqual({ effects: [], sound: 'sound.custom' })
    expect(calls).toEqual([2, 3, 3])
    expect(run([raw(0x47, [2], 'L_10'), raw(0x47, [3])])).toEqual({
      effects: [],
      sound: 'sound.pal.002',
      pendingReason: '多个不同 0x47 音效(sound.pal.002,sound.pal.003)',
    })
  })

  it('item use aliases remain stable in the author-maintainable shared namespace', () => {
    expect(migratedItemUseScriptRef(23)).toEqual({
      chunk: 'shared/c12',
      id: 'shared/user/pal-item-use/23',
    })
    expect(migratedItemUseScriptRef('23')).toEqual(migratedItemUseScriptRef(23))
  })
})
