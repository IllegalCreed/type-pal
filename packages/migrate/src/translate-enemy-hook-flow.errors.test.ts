import { describe, expect, test } from 'vitest'
import { end, go, type HookInstruction, hookFixture, raw } from './__tests__/enemy-hook-fixtures.js'

describe('enemy hook source admission', () => {
  test('missing root and missing target report the actual owner, channel and source', () => {
    expect(() => hookFixture({}).run({ turnStart: 432 })).toThrow(
      'enemy-boundary「边界敌人」 turnStart L_432: 脚本根目标不可达',
    )
    expect(() => hookFixture({ 100: [go(432)] }).run()).toThrow(
      'enemy-boundary「边界敌人」 ready L_100: 目标 L_432 不可达',
    )
    expect(hookFixture({ 100: [go(432)], 432: [end()] }).ready().states.initial?.next).toEqual({
      kind: 'continue',
      state: 'state-L_432',
    })
  })

  test.each([
    ['advance', end({ advance: true }), 'advance END 缺 fallthrough'],
    ['chance', raw(0x06, 50, 0), '0x06 缺 fallthrough'],
    ['party', raw(0x79, 36, 0), '0x79 缺 fallthrough'],
    ['first', raw(0x91, 0), '0x91 缺 fallthrough'],
    ['effect', raw(0x9c, 2, 200), '0x9c 缺 fallthrough'],
    ['linear', raw(0x85, 1), 'raw 缺 fallthrough'],
  ] satisfies [
    string,
    HookInstruction,
    string,
  ][])('%s rejects missing fallthrough with a same-command valid control', (_, command, message) => {
    expect(() => hookFixture({ 100: [command], 200: [end()] }).run()).toThrow(message)
    // Same source command and target: the sole repaired axis is the missing fallthrough.
    const valid = hookFixture({ 100: [command, end({ reset: true, resetTo: 100 })], 200: [end()] })
    expect(valid.ready().initial).toBe('initial')
  })

  test('invalid goto text and delayed goto are separately rejected', () => {
    expect(() => hookFixture({ 100: [{ op: 'goto', to: 'script#wrong' }] }).run()).toThrow(
      'goto 目标非法 script#wrong',
    )
    expect(() => hookFixture({ 100: [{ ...go(200), frameDelay: 2 }], 200: [end()] }).run()).toThrow(
      'delayed goto(2) 不受敌 hook 支持',
    )
    expect(
      hookFixture({
        100: [{ op: 'goto', to: 'script#L_200', frameDelay: 0 }],
        200: [end()],
      }).ready().states.initial?.next,
    ).toEqual({ kind: 'continue', state: 'state-L_200' })
  })

  test.each([undefined, 0, -1])('reset requires a positive target, got %s', (resetTo) => {
    expect(() => hookFixture({ 100: [end({ reset: true, resetTo })] }).run()).toThrow(
      `reset END 目标非法 ${resetTo ?? 0}`,
    )
  })

  test('random count validation distinguishes invalid count from truncated choice data', () => {
    for (const count of [0, -1, 1.5])
      expect(() => hookFixture({ 100: [raw(0xa2, count), end()] }).run()).toThrow(
        `0xA2 臂数非法 ${count}`,
      )
    expect(() => hookFixture({ 100: [raw(0xa2, 2), end()] }).run()).toThrow('0xA2 第 2 臂越界')
    expect(hookFixture({ 100: [raw(0xa2, 1), end()] }).ready().states.initial?.next).toEqual({
      kind: 'random',
      choices: [{ weight: 1, then: { kind: 'continue', state: 'state-L_101' } }],
    })
  })

  test('the instruction limit accepts its boundary and rejects one additional reachable instruction', () => {
    const make = (count: number) =>
      hookFixture({ 100: [...Array.from({ length: count - 1 }, () => raw(0x05)), end()] })
    expect(make(2048).run().hookSources?.ready?.reachableSourceAddresses).toHaveLength(2048)
    expect(() => make(2049).run()).toThrow('可达闭包超过 2048 条指令')
  })

  test('public malformed source fails loudly for unknown actor, missing opcode and named command', () => {
    expect(() => hookFixture({ 100: [raw(0x79, 900, 0), end()] }).run()).toThrow(
      '0x79 未知角色 word=900',
    )
    expect(() => hookFixture({ 100: [{ op: 'raw' }, end()] }).run()).toThrow(
      'op 0xunknown 不受敌 hook 支持',
    )
    expect(() => hookFixture({ 100: [{ op: 'unknownCommand' }, end()] }).run()).toThrow(
      'unknownCommand 不受敌 hook 支持',
    )
  })

  test('absent battleEnd root is rejected before reading a body', () => {
    expect(() => hookFixture({}).run({ battleEnd: 999 })).toThrow(
      'enemy-boundary「边界敌人」 battleEnd L_999: 期望恰好 1 个 stage，收到 0',
    )
  })

  test('wrapper rejects a same-activation cycle but accepts an explicit scheduling boundary', () => {
    expect(() => hookFixture({ 100: [go(100)] }).run()).toThrow('continue 图存在无调度边界循环')
    expect(
      hookFixture({ 100: [end({ reset: true, resetTo: 100 })] }).ready().states.initial?.next,
    ).toEqual({ kind: 'restart' })
  })
})
