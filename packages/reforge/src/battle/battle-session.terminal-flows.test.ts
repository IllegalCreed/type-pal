/**
 * TEST-BATTLE-WORKFLOWS-1 W5：终态与结算。
 * 每个终态精确 resolve 对应 BattleResult（victory/defeat/playerFled）——
 * pending/rejected 不得进入成功集合；300ms 边界前 done 必须仍未兑现；
 * settlement 恰一次（done 后断言，覆盖每-tick 重建变异）；非胜利零结算。
 * done 只会在本测试驱动的 tick 内兑现：探测用 setTimeout(0) 竞速（宏任务），
 * 已兑现的 done（微任务）先于 pending 返回——不长时间竞速遮盖原错误。
 */
import { describe, expect, test } from 'vitest'
import { wfEnemy, wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { recordingSfx } from '../__tests__/battle-workflows/controlled-io.js'
import { makeWfSession } from '../__tests__/battle-workflows/session-driver.js'

type WfHarness = ReturnType<typeof makeWfSession>

const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i += 1) await Promise.resolve()
}

/** 非阻塞探测 done：'pending' | 'done' | 'rejected'。 */
const probe = (h: WfHarness): Promise<string> =>
  Promise.race([
    h.session.done.then(
      () => 'done',
      () => 'rejected',
    ),
    new Promise<string>((resolve) => setTimeout(() => resolve('pending'), 0)),
  ])

const toOver = async (h: WfHarness): Promise<void> => {
  for (let i = 0; i < 100 && h.session.debugReadiness().phase !== 'over'; i += 1) {
    h.idle(500)
    await flush()
  }
  expect(h.session.debugReadiness().phase).toBe('over')
}

/** 逐次（≥300ms 累计+空格）推进 narration/结算屏直至 done 兑现；返回探测结果。 */
const finish = async (h: WfHarness): Promise<string> => {
  let state = await probe(h)
  for (let i = 0; i < 40 && state === 'pending'; i += 1) {
    h.idle(350)
    h.press([' '], 50)
    await flush()
    state = await probe(h)
  }
  return state
}

describe('W5 终态与结算', () => {
  test('victory：真实击杀→settlement 恰一次→300ms 边界前不兑现→精确 resolve victory', async () => {
    let settlementCalls = 0
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 60 })],
      enemies: [wfEnemy('e1', { health: 20, defense: 0, attackStrength: 1 })],
      extraOpts: {
        buildSettlement: () => {
          settlementCalls += 1
          return [{ kind: 'exp-cash', exp: 5, cash: 3 }]
        },
      },
    })
    h.press([' '])
    h.press([' '])
    await toOver(h)
    for (let i = 0; i < 50 && settlementCalls < 1; i += 1) {
      h.idle(100)
      await flush()
    }
    expect(settlementCalls).toBe(1) // 结算已构建
    // 300ms 边界前空格（overTimer 累计 16ms < 300）：done 必须仍未兑现
    h.press([' '], 16)
    expect(await probe(h)).toBe('pending')
    const state = await finish(h) // 350ms 累计 + 空格放行
    expect(state).toBe('done')
    await expect(h.session.done).resolves.toBe('victory') // 精确终态
    expect(settlementCalls).toBe(1) // 整个 over 期间恰一次（每-tick 重建变异在此检出）
  })

  test('defeat：玩家被真实击杀→零 settlement→done 精确 resolve defeat', async () => {
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
    h.press([' '])
    h.press([' '])
    await toOver(h)
    expect(settlementCalls).toBe(0) // 非胜利零结算
    expect(await finish(h)).toBe('done')
    await expect(h.session.done).resolves.toBe('defeat')
  })

  test('playerFled：Q 快捷逃跑（fleeRate 100）→零 settlement 零奖励→done 精确 resolve playerFled', async () => {
    let settlementCalls = 0
    const h = makeWfSession({
      players: [wfPlayer('p1', { fleeRate: 100 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      extraOpts: {
        buildSettlement: () => {
          settlementCalls += 1
          return []
        },
      },
    })
    h.press(['q', 'Q'])
    await toOver(h)
    expect(settlementCalls).toBe(0) // 非胜利零结算（无奖励）
    expect(await finish(h)).toBe('done')
    await expect(h.session.done).resolves.toBe('playerFled')
  })

  test('多屏结算：前两屏放行后 done 仍未兑现，第三屏即最后一屏（其后无需再确认）', async () => {
    let settlementCalls = 0
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 60 })],
      enemies: [wfEnemy('e1', { health: 20, defense: 0, attackStrength: 1 })],
      extraOpts: {
        buildSettlement: () => {
          settlementCalls += 1
          return [
            { kind: 'exp-cash', exp: 5, cash: 3 },
            { kind: 'exp-cash', exp: 1, cash: 1 },
            { kind: 'exp-cash', exp: 0, cash: 0 },
          ]
        },
      },
    })
    h.press([' '])
    h.press([' '])
    await toOver(h)
    for (let i = 0; i < 50; i += 1) {
      h.idle(100)
      await flush()
    }
    // 两屏放行
    h.idle(350)
    h.press([' '], 50)
    await flush()
    h.idle(350)
    h.press([' '], 50)
    await flush()
    expect(await probe(h)).toBe('pending') // 第三屏未放：不得提前完成
    // 第三屏 = 最后一屏：放行后 done 立即兑现（无 finish 循环兜底；若存在第四屏此处仍 pending 即红）
    h.idle(350)
    h.press([' '], 50)
    await flush()
    expect(await probe(h)).toBe('done')
    await expect(h.session.done).resolves.toBe('victory')
    expect(settlementCalls).toBe(1) // 三屏同一次构建；额外确认不再产生新结算
  })

  test('enemyFled：敌经 turnStart hook fleeBattle 真实逃跑→零 settlement→done 精确 resolve enemyFled', async () => {
    let settlementCalls = 0
    const enemy = wfEnemy('flee-hook', { attackStrength: 1, health: 500 })
    enemy.ai.hooks = {
      turnStart: {
        initial: 'escape',
        states: {
          escape: {
            body: [{ kind: 'fleeBattle' }, { kind: 'playSound', asset: 'sound.after-flee' }],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const sfx = recordingSfx()
    const h = makeWfSession({
      players: [wfPlayer('p1')],
      enemies: [enemy],
      extraOpts: {
        buildSettlement: () => {
          settlementCalls += 1
          return []
        },
      },
    })
    Object.assign(h.assets, { sfx: sfx.player })
    for (let i = 0; i < 40; i += 1) {
      h.idle(500)
      await flush()
    }
    expect(settlementCalls).toBe(0) // 非胜利零结算（本包观察器补齐旧证缺失的零奖励断言）
    await expect(h.session.done).resolves.toBe('enemyFled') // 经真实行为到达的独立终态
  })

  test('terminated：encounterChoreo endBattle(terminate) 于第 2 轮到达→零 settlement→done 精确 resolve terminated', async () => {
    let settlementCalls = 0
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 1 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      extraOpts: {
        buildSettlement: () => {
          settlementCalls += 1
          return []
        },
        encounterChoreo: [
          {
            at: 'turnStart',
            once: true,
            when: { kind: 'turn', op: '>=', value: 2 },
            body: [{ kind: 'endBattle', result: 'terminate' }],
          },
        ],
      },
    })
    // 第 1 轮：防御性普攻推进（敌高血不致死）；第 2 轮起手 → endBattle
    for (let round = 0; round < 4 && h.session.debugReadiness().phase !== 'over'; round += 1) {
      h.press([' '])
      h.press([' '])
      for (let i = 0; i < 60 && h.session.debugReadiness().phase !== 'menu'; i += 1) {
        h.idle(500)
        await flush()
        if (h.session.debugReadiness().phase === 'over') break
      }
    }
    for (let i = 0; i < 40; i += 1) {
      h.idle(500)
      await flush()
    }
    expect(settlementCalls).toBe(0) // 终止无奖励（本包观察器补齐旧证缺失的零奖励断言）
    await expect(h.session.done).resolves.toBe('terminated') // 非 cancel AbortError 的独立终态
  })
})
