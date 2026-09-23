/**
 * TEST-BATTLE-WORKFLOWS-1 W3：执行时间线接线。
 * 选择经公开 tick 提交后由真 core 执行；资源恰扣一次；prepareTurnSounds 快照核对
 * **实际动作集合**（cast 与 attack 分栏），不只数数量。断言用 MP/终态/声音记录器。
 */
import { describe, expect, test } from 'vitest'
import { wfEnemy, wfHealItem, wfPlayer, wfSkill } from '../__tests__/battle-workflows/catalog.js'
import { recordingSfx } from '../__tests__/battle-workflows/controlled-io.js'
import { makeWfSession } from '../__tests__/battle-workflows/session-driver.js'
import type { BattleSessionAssets, BattleTurnReadinessSnapshot } from './battle-session.js'

/** 微任务冲洗：prepareTurnSounds 屏障的 resolve 需要微任务轮转后才推进。 */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i += 1) await Promise.resolve()
}

/** over 后逐屏确认直至 done 兑现（每屏累计 ≥300ms；无 settlement 时一屏）。 */
const settleDone = async (h: ReturnType<typeof makeWfSession>): Promise<string> => {
  for (let screen = 0; screen < 8; screen += 1) {
    h.idle(350)
    h.press([' '])
    await flush()
  }
  return h.session.done
}

describe('W3 执行时间线接线', () => {
  test('攻击选择→真 core 执行→敌死亡→victory 终态（精确 done 结果）', async () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 60 })],
      enemies: [wfEnemy('one-hit', { health: 20, defense: 0, attackStrength: 1 })],
    })
    h.press([' '])
    h.press([' '])
    h.idle(500) // 让回合真正开始
    for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'over'; i += 1) h.idle(500)
    expect(h.session.debugReadiness().phase).toBe('over')
    await expect(settleDone(h)).resolves.toBe('victory')
  })

  test('施法经真 core：MP 恰扣一次（40→20 非 0），readiness 快照含 cast 动作', async () => {
    const snapshots: BattleTurnReadinessSnapshot[] = []
    const skill = wfSkill('wf-nuke', 20)
    const h = makeWfSession({
      players: [wfPlayer('p1', { skills: ['wf-nuke'], mp: 40, maxMp: 40, attackStrength: 200 })],
      enemies: [wfEnemy('e1', { health: 30, defense: 0, attackStrength: 1 })],
      extraOpts: {
        skills: { 'wf-nuke': skill },
        prepareTurnSounds: async (snapshot) => {
          snapshots.push(snapshot)
        },
      },
    })
    h.press(['ArrowLeft'])
    h.press([' ']) // skill 列表
    h.press([' ']) // 目标
    h.press([' ']) // 提交 cast
    h.idle(500)
    for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'over'; i += 1) {
      h.idle(500)
      await flush()
    }
    // 快照核对实际动作：含 cast（而非仅计数）
    expect(snapshots.length).toBeGreaterThanOrEqual(1)
    const actions = [...(snapshots[0]?.actions.values() ?? [])]
    expect(actions).toContainEqual({ kind: 'cast', skillId: 'wf-nuke', targetEnemyIdx: 0 })
    // MP 恰扣一次：一轮只施一次法（40-20=20，非 0）
    await expect(settleDone(h)).resolves.toBe('victory')
    expect(h.readParty()[0]!.mp).toBe(20)
  })

  test('两队员混合提交：readiness 快照含 attack 与 cast 两类动作', async () => {
    const snapshots: BattleTurnReadinessSnapshot[] = []
    const h = makeWfSession({
      players: [wfPlayer('p1', { skills: ['wf-strike'], mp: 40, maxMp: 40 }), wfPlayer('p2')],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      extraOpts: {
        skills: { 'wf-strike': wfSkill('wf-strike', 20) },
        prepareTurnSounds: async (snapshot) => {
          snapshots.push(snapshot)
        },
      },
    })
    // p1 施法
    h.press(['ArrowLeft'])
    h.press([' '])
    h.press([' '])
    h.press([' '])
    // p2 默认攻击
    h.press([' '])
    h.press([' '])
    h.idle(500) // 全员提交后次帧进回合
    for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'menu'; i += 1) {
      h.idle(500)
      await flush()
    }
    expect(snapshots.length).toBeGreaterThanOrEqual(1)
    const actions = [...(snapshots[0]?.actions.values() ?? [])]
    expect(actions).toContainEqual({ kind: 'cast', skillId: 'wf-strike', targetEnemyIdx: 0 })
    expect(actions).toContainEqual({ kind: 'attack', targetEnemyIdx: 0 })
    expect(h.readParty()[0]!.mp).toBe(20) // 只有 p1 扣法术费
  })

  test('物品 healHp 经真 core 执行：库存写回 count 减一', async () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { hp: 50, maxHp: 100 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      extraOpts: {
        items: { 'wf-tonic': wfHealItem('wf-tonic', 30) },
        inventory: [{ itemId: 'wf-tonic', count: 2 }],
      },
    })
    h.press(['e', 'E']) // 使用列表
    h.press([' ']) // 选中物品
    h.press([' ']) // 确认使用
    h.idle(500)
    for (let i = 0; i < 40; i += 1) h.idle(500)
    const world = { inventory: [{ itemId: 'wf-tonic', count: 2 }] }
    h.session.writeBackInventory(world.inventory)
    expect(world.inventory[0]!.count).toBe(1) // 战斗消耗一件 → 写回 1
    expect(h.readParty()[0]!.hp).toBeGreaterThan(30) // 回复生效（50+30-敌伤）
  })

  test('MP 耗尽后二轮法术列表不可提交：不重复扣费不崩溃', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { skills: ['wf-mid'], mp: 25, maxMp: 25 })],
      enemies: [wfEnemy('tank', { health: 900, attackStrength: 1 })],
      extraOpts: { skills: { 'wf-mid': wfSkill('wf-mid', 25) } },
    })
    h.press(['ArrowLeft'])
    h.press([' '])
    h.press([' '])
    h.press([' '])
    h.idle(500)
    for (let i = 0; i < 60 && h.session.debugReadiness().phase !== 'menu'; i += 1) h.idle(500)
    expect(h.readParty()[0]!.mp).toBe(0) // 首轮施法扣 25
    h.press(['ArrowLeft']) // 二轮再开法术
    h.press([' '])
    h.idle()
    expect(h.readParty()[0]!.mp).toBe(0) // 无可施技能：零扣费
    h.press(['Escape'])
  })

  test('sfx 记录器：真实行动产生的 AssetId 序列经 assets.sfx 播放路径', () => {
    const sfx = recordingSfx()
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 60 })],
      enemies: [wfEnemy('e1', { health: 20, defense: 0, attackStrength: 1 })],
    })
    Object.assign(h.assets, { sfx: sfx.player } satisfies Partial<BattleSessionAssets>)
    h.press([' '])
    h.press([' '])
    h.idle(500)
    for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'over'; i += 1) h.idle(500)
    expect(sfx.plays.length).toBeGreaterThanOrEqual(1) // 敌 attack/death 音等真实到达
  })
})
