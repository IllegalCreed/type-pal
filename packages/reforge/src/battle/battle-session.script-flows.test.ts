/**
 * TEST-BATTLE-WORKFLOWS-1 W4（含 W3 变身/召唤接线）：敌 hook 与屏障组合。
 * - 敌 ready/turnStart 经真实 ai.hooks（现行 schema）构造；hook 结束后**同一敌真实行动**
 *   以行首前缀（`ready-hook ` 开头的敌行动行）+ 我方 HP 实际下降作证（C2：子串匹配混淆行动者）；
 * - 敌 hook 等待（wait 命令）期间输入零提交，hook 完成后选择恢复可继续（W4 原合同）；
 * - 变身/召唤经 hook effect 命令接线（W3 原合同）：新敌形/新召唤敌随后真实行动；
 * - prepareTurnSounds 屏障挂起期间输入零业务副作用（一回合恰一次准备回调）；
 *   gate 在 finally 放行并**消费实际返回的 pending**（保留最初断言错误，不留悬挂 Promise）；
 * - 取消经公开 cancel：done 以 AbortError 精确拒绝，迟到放行后日志/队员快照完整不变。
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
  test('敌 ready hook 真实激活：hook 音先播，完成后同一敌以自己名义真实攻击（HP 实降）', async () => {
    const sfx = recordingSfx()
    const enemy = wfEnemy('ready-hook', { attackStrength: 40, health: 500, dexterity: 10 })
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
      players: [wfPlayer('p1', { attackStrength: 30, hp: 200, maxHp: 200 })],
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
    // 同一敌以自己名义行动：敌行动行以「ready-hook 」开头（非我方攻击该敌的行）
    expect(
      h.session.debugLog().some((line) => line.startsWith('ready-hook ') && line.includes('攻击')),
    ).toBe(true)
    // 该敌行动真实落在我方：HP 实际下降（拿走敌行动队列的变异会在此红）
    const players = h.session.debugPlayers()
    expect(players[0]!.hp).toBeLessThan(200)
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

  test('敌 hook 等待与选择恢复：wait 期间输入零提交，hook 完成后菜单恢复可继续', async () => {
    const sfx = recordingSfx()
    const enemy = wfEnemy('waiter', { attackStrength: 1, health: 500 })
    enemy.ai.hooks = {
      turnStart: {
        initial: 'hold',
        states: {
          hold: {
            body: [
              { kind: 'wait', ms: 400 },
              { kind: 'playSound', asset: 'sound.after-wait' },
            ],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const h = makeWfSession({ players: [wfPlayer('p1', { attackStrength: 30 })], enemies: [enemy] })
    Object.assign(h.assets, { sfx: sfx.player })
    h.idle(16) // 第一 tick：turnStart hook 激活并进入 wait
    // 等待窗口（<400ms）内乱按确认：hook 未完成 → 输入不得提交任何行动
    for (let i = 0; i < 8; i += 1) h.press([' '], 16)
    expect(sfx.plays).not.toContain('sound.after-wait') // hook 仍在等待
    expect(h.session.debugLog().filter((line) => line.startsWith('p1 ')).length).toBe(0) // 零提交（等待期间输入全部被 hook 泵消费）
    // 时间推过 wait：hook 完成（尾音作证）→ 选择恢复
    for (let i = 0; i < 40 && !sfx.plays.includes('sound.after-wait'); i += 1) {
      h.idle(100)
      await flush()
    }
    expect(sfx.plays).toContain('sound.after-wait')
    h.idle(16) // 排干 hook complete 步（该 tick 仍归 hook 泵）
    // 菜单恢复可继续：默认攻击真实执行
    h.press([' ']) // 菜单确认 → 选敌
    h.press([' ']) // 确认目标 → 提交
    for (let i = 0; i < 40; i += 1) {
      h.idle(500)
      await flush()
    }
    expect(
      h.session.debugLog().some((line) => line.startsWith('p1 ') && line.includes('攻击')),
    ).toBe(true)
  })

  test('敌 hook effect 召唤接线：summon 填空槽，新敌随后以自己名义真实攻击', async () => {
    const boss = wfEnemy('boss', { attackStrength: 1, health: 500 })
    boss.ai.hooks = {
      turnStart: {
        initial: 'spawn',
        states: {
          spawn: {
            body: [
              {
                kind: 'effect',
                id: 'spawn',
                effect: { kind: 'summon', enemyId: 'minion', count: 1 },
              },
            ],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 10, hp: 200, maxHp: 200 })],
      enemies: [boss, null], // 固定敌槽留一个空位
      enemiesById: { minion: wfEnemy('minion', { attackStrength: 25, health: 100 }) },
      extraOpts: { auto: true }, // 自动推进回合，敌每轮行动（hook 效果不走 AI 决策 log）
    })
    for (let i = 0; i < 80; i += 1) {
      h.idle(500)
      await flush()
    }
    // 召唤经真 runtime → core 接线落进战场：新召唤敌随后以自己名义行动（行首「minion 」）
    expect(
      h.session.debugLog().some((line) => line.startsWith('minion ') && line.includes('攻击')),
    ).toBe(true)
    expect(h.session.debugPlayers()[0]!.hp).toBeLessThan(200) // 其行动真实落在我方
  })

  test('敌 hook effect 变身接线：transform 换身后新敌形以新名义继续行动', async () => {
    const boss = wfEnemy('boss', { attackStrength: 1, health: 500 })
    boss.ai.hooks = {
      turnStart: {
        initial: 'reveal',
        states: {
          reveal: {
            body: [
              {
                kind: 'effect',
                id: 'reveal',
                effect: { kind: 'transform', enemyId: 'boss-true' },
              },
            ],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 1, hp: 200, maxHp: 200 })],
      enemies: [boss],
      enemiesById: { 'boss-true': wfEnemy('boss-true', { attackStrength: 30, health: 500 }) },
      extraOpts: { auto: true },
    })
    for (let i = 0; i < 60; i += 1) {
      h.idle(500)
      await flush()
    }
    // 换身后新敌形以新 id 名义行动（原槽位 def 已被 transform 替换），伤害按新形数值落在我方
    expect(
      h.session.debugLog().some((line) => line.startsWith('boss-true ') && line.includes('攻击')),
    ).toBe(true)
    expect(
      h.session
        .debugLog()
        .some(
          (line) =>
            line.startsWith('boss-true ') === false &&
            line.startsWith('boss ') &&
            line.includes('攻击'),
        ),
    ).toBe(false) // 旧 id 不再作为行动者出现（已换形）
    expect(h.session.debugPlayers()[0]!.hp).toBeLessThan(200)
  })

  test('屏障挂起：pending 期间按键零业务副作用（MP 不偷扣），放行后真实推进', async () => {
    const gate = defer<void>()
    let prepareCalls = 0
    let pending: Promise<void> | undefined
    const h = makeWfSession({
      players: [wfPlayer('p1', { skills: ['wf-strike'], mp: 40, maxMp: 40 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      extraOpts: {
        skills: {},
        prepareTurnSounds: () => {
          prepareCalls += 1
          pending = gate.promise // 保存实际返回的 pending（finally 消费同一 Promise）
          return gate.promise
        },
      },
    })
    let bodyFailed = false
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
        // 我方行动行以「p1 」开头；敌反击行以「e1 」开头
        .filter((line) => line.startsWith('p1 ') && line.includes('攻击'))
      expect(attacks.length).toBe(1)
    } catch (error) {
      bodyFailed = true
      throw error
    } finally {
      // finally 放行并消费同一 pending：断言失败也不遗留悬挂 Promise，且保留最初断言错误
      gate.resolve()
      if (pending)
        await pending.catch((error) => {
          if (!bodyFailed) throw error
        })
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

  test('公开 cancel：pending 屏障期间取消 → done 以 AbortError 精确拒绝，迟到完成零推进', async () => {
    const gate = defer<void>()
    let pending: Promise<void> | undefined
    const h = makeWfSession({
      players: [wfPlayer('p1')],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      extraOpts: {
        prepareTurnSounds: () => {
          pending = gate.promise
          return gate.promise
        },
      },
    })
    let bodyFailed = false
    try {
      h.press([' '])
      h.press([' '])
      h.idle(16)
      await flush()
      expect(h.session.debugReadiness().phase).toBe('preparing')
      const logAtCancel = [...h.session.debugLog()]
      const playersAtCancel = h.session.debugPlayers()
      h.session.cancel()
      await expect(h.session.done).rejects.toMatchObject({ name: 'AbortError' })
      // 取消后不再接受推进：gate 放行也不复活；业务状态/日志完整不变（非仅 phase 名字）
      gate.resolve()
      await flush()
      h.idle(500)
      expect(h.session.debugReadiness().phase).toBe('preparing') // 迟到完成无新 core 推进
      expect(h.session.debugLog()).toEqual(logAtCancel) // 日志零增长
      expect(h.session.debugPlayers()).toEqual(playersAtCancel) // 队员状态不变
    } catch (error) {
      bodyFailed = true
      throw error
    } finally {
      gate.resolve()
      if (pending)
        await pending.catch((error) => {
          if (!bodyFailed) throw error
        })
    }
  })
})
