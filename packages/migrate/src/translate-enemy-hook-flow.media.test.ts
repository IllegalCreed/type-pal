import { describe, expect, test } from 'vitest'
import { end, hookFixture, raw } from './__tests__/enemy-hook-fixtures.js'

describe('enemy hook media boundaries', () => {
  test('sound resolution records exact asset identity while silence is equivalent', () => {
    const calls: number[] = []
    const f = hookFixture(
      { 100: [raw(0x47, 0), raw(0x47, 7), end()] },
      {
        soundAssetForNum: (n) => {
          calls.push(n)
          return 'sound-custom'
        },
      },
    )
    const result = f.run()
    expect(result.hooks?.ready?.states.initial?.body).toEqual([
      { kind: 'playSound', asset: 'sound-custom' },
    ])
    expect(calls).toEqual([7])
    expect(result.hookSources?.ready?.sourceMappings[0]).toEqual({
      sourceAddress: 100,
      disposition: 'equivalent',
      targetSelectors: ['states.initial'],
    })
  })

  test('a positive missing sound fails loudly instead of becoming silence', () => {
    const bad = hookFixture({ 100: [raw(0x47, 7), end()] }, { soundAssetForNum: () => undefined })
    expect(() => bad.run()).toThrow('enemy-boundary「边界敌人」 ready L_100: 音效 7 无可用资产')
    expect(hookFixture({ 100: [raw(0x47, 7), end()] }).ready().states.initial?.body).toEqual([
      { kind: 'playSound', asset: 'sound.pal.007' },
    ])
  })

  test('music start, immediate stop and the two fade durations stay distinct', () => {
    expect(
      hookFixture({
        100: [raw(0x43, 2), raw(0x43, 0), raw(0x77, 0), raw(0x77, 3), raw(0x85, 2), end()],
      }).ready().states.initial?.body,
    ).toEqual([
      { kind: 'playMusic', asset: 'music.pal.002' },
      { kind: 'stopMusic' },
      { kind: 'stopMusic', fadeMs: 2000 },
      { kind: 'stopMusic', fadeMs: 9000 },
      { kind: 'wait', ms: 160 },
    ])
  })

  test('restoration and exact self-clear opcodes leave an explicit equivalent provenance trail', () => {
    const result = hookFixture({ 100: [raw(0x05), raw(0x8e), raw(0x90, 77, 0, 0), end()] }).run()
    expect(result.hooks?.ready?.states.initial?.body).toEqual([])
    expect(result.hookSources?.ready?.sourceMappings.slice(0, 3)).toEqual(
      [100, 101, 102].map((sourceAddress) => ({
        sourceAddress,
        disposition: 'equivalent',
        targetSelectors: ['states.initial'],
      })),
    )
    expect(() => hookFixture({ 100: [raw(0x90, 77, 1, 0), end()] }).run()).toThrow(
      'op 0x90 不受敌 hook 支持',
    )
    expect(() => hookFixture({ 100: [raw(0x90, 77, 0, 1), end()] }).run()).toThrow(
      'op 0x90 不受敌 hook 支持',
    )
  })

  test('empty battleEnd keeps source evidence without inventing a reward body', () => {
    expect(hookFixture({ 100: [end()] }).run({ battleEnd: 100 })).toEqual({
      rules: [],
      choreography: [],
      pending: [],
      battleEndSource: { rootAddress: 100, reachableSourceAddresses: [100] },
    })
    expect(hookFixture({}).run({ ready: 0, turnStart: 0, battleEnd: 0 })).toEqual({
      rules: [],
      choreography: [],
      pending: [],
    })
  })
})
