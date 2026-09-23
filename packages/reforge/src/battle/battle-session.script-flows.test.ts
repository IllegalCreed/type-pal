/**
 * TEST-BATTLE-WORKFLOWS-1 W4：敌 ready/turnStart 真实 activation 与屏障。
 * 旧 readiness 十项及 ready-hook 专项保持（去重：不重写屏障基础合同）；本文件新增
 * 钩子与下一动作**组合**：ready 挂起期间输入不提交；屏障失败降级继续；非空后续动作
 * 作为见证；多轮屏障重新拍摄。全部经公开 tick+debugReadiness；异步按 entered+微任务
 * 冲洗观察（不 await 可能不 settle 的 promise、不用超时判红）。
 */
import { SfxReadinessResourceError } from '../audio/sfx.js'
import { describe, expect, test } from 'vitest'
import { wfEnemy, wfPlayer } from './__tests__/battle-workflows/catalog.js'
import { makeWfSession } from './__tests__/battle-workflows/session-driver.js'

const defer = <T>(): { promise: Promise<T>; resolve: (v: T) => void } => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i += 1) await Promise.resolve()
}

describe('W4 敌钩子与屏障组合', () => {
  test('屏障挂起：pending 期间菜单输入零提交，放行后真实推进', async () => {
    const gate = defer<void>()
    let entered = false
    const h = makeWfSession({
      players: [wfPlayer('p1')],
      enemies: [wfEnemy('e1', { health: 400, attackStrength: 1 })],
      extraOpts: {
        prepareTurnSounds: async () => {
          entered = true
          await gate.promise // 首轮屏障挂起
        },
      },
    })
    h.press([' ']) // 提交攻击
    h.press([' ']) // 确认 → 全员交招 → 进入准备屏障
    h.idle(16)
    await flush()
    expect(entered).toBe(true) // entered 见证：屏障真实发生
    // 挂起期间按键不得提交（phase 停在 preparing）
    expect(h.session.debugReadiness().phase).toBe('preparing')
    h.press([' '])
    expect(h.session.debugReadiness().phase).toBe('preparing')
    gate.resolve()
    for (let i = 0; i < 60 && h.session.debugReadiness().phase !== 'menu'; i += 1) {
      h.idle(500)
      await flush()
    }
    expect(h.session.debugReadiness().phase).toBe('menu') // 放行后真实推进回菜单
  })

  test('屏障失败降级继续：资源失败后战斗仍到终态（钩子后仍有动作）', async () => {
    let failures = 0
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 300 })],
      enemies: [wfEnemy('e1', { health: 10, defense: 0, attackStrength: 1 })],
      extraOpts: {
        prepareTurnSounds: async () => {
          failures += 1
          if (failures === 1) throw new SfxReadinessResourceError([new Error('missing.wav')])
        },
        reportReadinessError: () => {},
      },
    })
    h.press([' '])
    h.press([' '])
    for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'over'; i += 1) {
      h.idle(500)
      await flush()
    }
    expect(h.session.debugReadiness().phase).toBe('over') // 降级继续到达终态
    expect(failures).toBeGreaterThanOrEqual(1)
  })

  test('非空后续动作见证：屏障放行后敌行动真实发生（玩家 HP 下降可见）', async () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { hp: 500, maxHp: 500 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 30 })],
    })
    h.press([' '])
    h.press([' '])
    for (let i = 0; i < 60; i += 1) {
      h.idle(500)
      await flush()
    }
    const players = h.session.debugPlayers()
    expect(players[0]!.hp).toBeLessThan(500) // 敌真实行动
  })

  test('多轮屏障：第二轮重新拍摄（非空 lastActs 之后屏障再次出现）', async () => {
    let barrierCount = 0
    const h = makeWfSession({
      players: [wfPlayer('p1')],
      enemies: [wfEnemy('e1', { health: 400, attackStrength: 1 })],
      extraOpts: {
        prepareTurnSounds: async () => {
          barrierCount += 1
        },
      },
    })
    h.press([' '])
    h.press([' '])
    let menuSeen = false
    for (let i = 0; i < 160; i += 1) {
      if (!menuSeen && h.session.debugReadiness().phase === 'menu') menuSeen = true
      if (menuSeen && barrierCount >= 2) break
      h.idle(500)
      await flush()
    }
    expect(menuSeen).toBe(true) // 第一轮真实回到菜单
    if (barrierCount < 2) {
      h.press([' ']) // 第二轮默认攻击
      h.press([' '])
      for (let i = 0; i < 120; i += 1) {
        h.idle(500)
        await flush()
      }
    }
    expect(barrierCount).toBeGreaterThanOrEqual(2) // 两轮各自屏障
  })
})
