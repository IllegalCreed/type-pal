/**
 * TEST-BATTLE-WORKFLOWS-1 W4：敌 hook 与屏障组合。
 * - 敌 ready/turnStart 经真实 ai.hooks（现行 schema）构造，非空后续动作作见证；
 * - prepareTurnSounds 屏障挂起期间输入零业务副作用（MP 不偷扣——不仅是 phase 标签）；
 * - gate 在 finally 放行并消费同一 pending（保留最初断言错误）；
 * - 取消经公开 cancel：done 以 AbortError 精确拒绝，不冒充 pending。
 */
import { describe, expect, test } from 'vitest'
import { wfEnemy, wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { recordingSfx } from '../__tests__/battle-workflows/controlled-io.js'
import { makeWfSession } from '../__tests__/battle-workflows/session-driver.js'
import { SfxReadinessResourceError } from '../audio/sfx.js'

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
  test('敌 ready hook 真实激活：每个行动 entry 先播 hook 音，完成后同一敌正常行动', async () => {
    const sfx = recordingSfx()
    const enemy = wfEnemy('ready-hook', { attackStrength: 1, health: 500, dexterity: 10 })
    enemy.ai.hooks = {
      ready: {
        initial: 'ready',
        states: {
          ready: {
            body: [{ kind: 'playSound', asset: 'sound.ready' }],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 30 })],
      enemies: [enemy],
    })
    Object.assign(h.assets, { sfx: sfx.player })
    h.press([' '])
    h.press([' '])
    h.idle(500)
    for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'menu'; i += 1) {
      h.idle(500)
      await flush()
    }
    expect(sfx.plays).toContain('sound.ready') // 敌 ready hook 真实执行
    expect(
      h.session.debugLog().some((line) => line.includes('ready-hook') && line.includes('攻击')),
    ).toBe(true) // hook 完成后同一敌正常行动（非空后续动作见证）
  })

  test('敌 turnStart hook 真实激活（战斗开场即排队执行）', async () => {
    const sfx = recordingSfx()
    const enemy = wfEnemy('turn-hook', { attackStrength: 1, health: 500 })
    enemy.ai.hooks = {
      turnStart: {
        initial: 'intro',
        states: {
          intro: {
            body: [{ kind: 'playSound', asset: 'sound.intro' }],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const h = makeWfSession({ players: [wfPlayer('p1')], enemies: [enemy] })
    Object.assign(h.assets, { sfx: sfx.player })
    h.idle() // 第一 tick 排队并激活 turnStart
    for (let i = 0; i < 40; i += 1) {
      h.idle(500)
      await flush()
    }
    expect(sfx.plays).toContain('sound.intro')
  })

  test('屏障挂起：pending 期间按键零业务副作用（MP 不偷扣），放行后真实推进', async () => {
    const gate = defer<void>()
    let prepareCalls = 0
    const h = makeWfSession({
      players: [wfPlayer('p1', { skills: ['wf-strike'], mp: 40, maxMp: 40 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      extraOpts: {
        skills: {},
        prepareTurnSounds: async () => {
          prepareCalls += 1
          await gate.promise
        },
      },
    })
    try {
      h.press([' '])
      h.press([' '])
      h.idle(16)
      await flush()
      expect(prepareCalls).toBeGreaterThan(0) // 屏障确实已进入（挂起中）
      expect(h.session.debugReadiness().phase).toBe('preparing')
      // 挂起期间乱按技能/确认键：不得产生任何业务提交（MP 偷扣即红）
      h.press(['ArrowLeft'])
      h.press([' '])
      h.press([' '])
      h.press([' '])
      // 屏障合同：一回合恰好一次准备回调；挂起期间输入不得解锁并重新进入准备
      expect(prepareCalls).toBe(1)
      expect(h.readParty()[0]!.mp).toBe(40) // 零业务副作用（非仅 phase 停留）
      expect(h.session.debugReadiness().phase).toBe('preparing')
      gate.resolve()
      for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'menu'; i += 1) {
        h.idle(500)
        await flush()
      }
      expect(h.session.debugReadiness().phase).toBe('menu') // 放行后真实推进
      expect(h.readParty()[0]!.mp).toBe(40) // 乱按未被采纳为零提交
      // 挂起期间的乱按没有产生额外提交：本轮只执行提交前那一笔攻击
      const attacks = h.session
        .debugLog()
        // 我方行动行以「p1 」开头（如「p1 会心一击 攻击 e1」）；敌反击行以「e1 」开头
        .filter((line) => line.startsWith('p1 ') && line.includes('攻击'))
      expect(attacks.length).toBe(1)
    } finally {
      gate.resolve() // finally 放行同一 pending：断言失败也不遗留挂起 Promise
    }
  })

  test('屏障资源失败降级继续：SfxReadinessResourceError 后战斗仍到 victory 终态', async () => {
    let failures = 0
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 60 })],
      enemies: [wfEnemy('e1', { health: 20, defense: 0, attackStrength: 1 })],
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
    h.idle(500)
    for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'over'; i += 1) {
      h.idle(500)
      await flush()
    }
    expect(h.session.debugReadiness().phase).toBe('over')
    for (let screen = 0; screen < 6; screen += 1) {
      h.idle(350)
      h.press([' '])
      await flush()
    }
    await expect(h.session.done).resolves.toBe('victory') // 降级继续到达精确终态
  })

  test('公开 cancel：pending 屏障期间取消 → done 以 AbortError 精确拒绝', async () => {
    const gate = defer<void>()
    const h = makeWfSession({
      players: [wfPlayer('p1')],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      extraOpts: {
        prepareTurnSounds: async () => {
          await gate.promise
        },
      },
    })
    try {
      h.press([' '])
      h.press([' '])
      h.idle(16)
      await flush()
      expect(h.session.debugReadiness().phase).toBe('preparing')
      h.session.cancel()
      await expect(h.session.done).rejects.toMatchObject({ name: 'AbortError' })
      // 取消后不再接受推进：gate 放行也不复活
      gate.resolve()
      await flush()
      h.idle(500)
      expect(h.session.debugReadiness().phase).toBe('preparing') // 迟到完成无新 core 推进
    } finally {
      gate.resolve()
    }
  })
})
