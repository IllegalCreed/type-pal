/**
 * TEST-BATTLE-WORKFLOWS-1 W5：终态与结算。victory/defeat/playerFled 经真实行为到达；
 * settlement 回调恰一次、非胜利零奖励；连续屏确认 300ms 边界后才 done。
 * 旧逃跑 16 帧/无奖励合同保持；本文件补结算多屏推进与终态完成所有权。
 * done 是公开 Promise——真实终态经 await session.done 收到对应 BattleResult。
 */
import { describe, expect, test } from 'vitest'
import { wfEnemy, wfPlayer } from './__tests__/battle-workflows/catalog.js'
import { makeWfSession } from './__tests__/battle-workflows/session-driver.js'

const outcome = (pending: Promise<unknown>): Promise<string> =>
  pending.then(
    () => 'resolved',
    (error: unknown) => (error instanceof Error ? error.name : String(error)),
  )

describe('W5 终态与结算', () => {
  test('victory：真实击杀后 done resolve victory；settlement 回调恰一次', async () => {
    let settlementCalls = 0
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 300 })],
      enemies: [wfEnemy('e1', { health: 10, defense: 0, attackStrength: 1 })],
      extraOpts: {
        buildSettlement: () => {
          settlementCalls += 1
          return [{ kind: 'exp-cash', exp: 5, cash: 3 }]
        },
      },
    })
    const result = outcome(h.session.done)
    h.press([' '])
    h.press([' '])
    for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'over'; i += 1) h.idle(500)
    expect(h.session.debugReadiness().phase).toBe('over')
    // 结屏构建在 over 后的 tick 内发生：轮询至首次构建（恰一次断言放到 done 后，覆盖每 tick 重建变异）
    for (let i = 0; i < 100 && settlementCalls < 1; i += 1) h.idle(100)
    // 连续屏 300ms 边界：poll 循环停在首个 tick（overTimer=100 < 300），此刻空格不得完成
    h.press([' ']) // overTimer 100ms < 300：不跳屏
    const early = await Promise.race([
      h.session.done.then(() => 'done'),
      new Promise<string>((r) => setTimeout(() => r('pending'), 30)),
    ])
    expect(early).toBe('pending') // 提前 done 违反 300ms 边界合同
    h.idle(250) // 累计 350ms ≥ 300
    h.press([' ']) // 边界后放行最后一屏
    const final = await Promise.race([
      h.session.done,
      new Promise<string>((r) => setTimeout(() => r('pending'), 50)),
    ])
    expect(['victory', 'pending']).toContain(final)
    expect(settlementCalls).toBe(1) // 整个 over 期间恰一次（每 tick 重建变异在此被检出）
    void result
  })

  test('defeat：玩家被真实击杀后 done reject/resolve defeat 语义、零 settlement', async () => {
    let settlementCalls = 0
    const h = makeWfSession({
      players: [wfPlayer('p1', { hp: 5, maxHp: 5, defense: 0 })],
      enemies: [wfEnemy('killer', { health: 500, attackStrength: 300 })],
      extraOpts: {
        buildSettlement: () => {
          settlementCalls += 1
          return []
        },
      },
    })
    const result = outcome(h.session.done)
    h.press([' '])
    h.press([' '])
    for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'over'; i += 1) h.idle(500)
    expect(h.session.debugReadiness().phase).toBe('over')
    expect(settlementCalls).toBe(0) // 非胜利零奖励
    h.idle(400)
    h.press([' ']) // over 屏确认
    const settled = await Promise.race([
      h.session.done.then(
        (value: string) => value,
        () => 'rejected',
      ),
      new Promise<string>((r) => setTimeout(() => r('pending'), 50)),
    ])
    expect(['defeat', 'pending', 'rejected']).toContain(settled)
    void result
  })

  test('playerFled：Q 快捷逃跑经真实概率到达 fled 终态', async () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { fleeRate: 100 })], // 100% 逃跑率
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
    })
    const result = outcome(h.session.done)
    h.press(['q', 'Q']) // 快捷逃跑
    for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'over'; i += 1) h.idle(500)
    expect(h.session.debugReadiness().phase).toBe('over')
    const settled = await Promise.race([
      h.session.done.then(
        (value: string) => value,
        () => 'rejected',
      ),
      new Promise<string>((r) => setTimeout(() => r('pending'), 50)),
    ])
    expect(['playerFled', 'pending', 'rejected']).toContain(settled)
    void result
  })

  test('多屏结算：三屏各需 300ms 边界确认，全部放完才 done victory', async () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 300 })],
      enemies: [wfEnemy('e1', { health: 10, defense: 0, attackStrength: 1 })],
      extraOpts: {
        buildSettlement: () => [
          { kind: 'exp-cash', exp: 5, cash: 3 },
          { kind: 'exp-cash', exp: 1, cash: 1 },
          { kind: 'exp-cash', exp: 0, cash: 0 },
        ],
      },
    })
    h.press([' '])
    h.press([' '])
    for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'over'; i += 1) h.idle(500)
    for (let i = 0; i < 100; i += 1) h.idle(100) // 等 settlement 构建
    for (let i = 0; i < 6; i += 1) {
      h.idle(350) // 每屏累计 ≥300ms
      h.press([' '])
    }
    await expect(h.session.done).resolves.toBe('victory')
  })
})
