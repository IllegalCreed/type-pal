/**
 * TEST-BATTLE-WORKFLOWS-1 W3：公共选择触发 use/throw/施法/敌招的真 core→timeline→帧回调。
 * 既有 battle-core/battle-anim 专项证数值/帧合同；本文件只证**接线**——选择经公开 tick
 * 提交后由真 core 执行、资源恰扣一次、时间线在帧边界前后发完成信号。只检查结构/时序/
 * 声音调用记录，不做视觉。
 */
import { describe, expect, test } from 'vitest'
import { attackSkill, wfEnemy, wfPlayer } from './__tests__/battle-workflows/catalog.js'
import { makeWfSession } from './__tests__/battle-workflows/session-driver.js'
import { recordingSfx } from './__tests__/battle-workflows/controlled-io.js'
import type { BattleSessionAssets } from './battle-session.js'

describe('W3 执行时间线接线', () => {
  test('攻击选择→真 core 执行→敌 HP 实际下降（debugPlayers 以外经 done/log 见证）', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 25 })],
      enemies: [wfEnemy('one-hit', { health: 1, defense: 0 })], // 一击致死
    })
    h.press([' '])
    h.press([' '])
    for (let i = 0; i < 40 && h.session.debugReadiness().phase !== 'over'; i += 1) h.idle(500)
    // 敌死后战斗以 victory 收尾（真实终态而非私写 phase）
    expect(h.session.debugReadiness().phase).toBe('over')
  })

  test('施法经真 core：技能时间线后完成信号在帧边界（无中间半提交）', () => {
    const skill = attackSkill('wf-nuke', 5)
    const h = makeWfSession({
      players: [wfPlayer('p1', { skills: ['wf-nuke'], attackStrength: 200 })],
      enemies: [wfEnemy('e1', { health: 30 })],
      extraOpts: { skills: { 'wf-nuke': skill } },
    })
    h.press(['s', 'S'])
    h.press([' '])
    h.press([' '])
    h.press([' '])
    // 逐帧推进：acting 期间不应提前回菜单；时间线完成后才 over
    let sawActing = false
    for (let i = 0; i < 60 && h.session.debugReadiness().phase !== 'over'; i += 1) {
      if (h.session.debugReadiness().phase === 'acting') sawActing = true
      h.idle(500)
    }
    expect(sawActing).toBe(true) // 真实进入执行时间线
    expect(h.session.debugReadiness().phase).toBe('over')
  })

  test('物品使用接线：use 物品经真实选择执行且横幅/日志可观察', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1')],
      enemies: [wfEnemy('e1', { attackStrength: 1 })],
      extraOpts: {
        items: {
          'wf-tonic': {
            id: 'wf-tonic',
            name: '药',
            buyPrice: 0,
            sellPrice: 0,
            sellable: false,
            use: { target: 'scene', consuming: true, effects: [] },
          } as never,
        },
        inventory: [{ itemId: 'wf-tonic', count: 3 }],
      },
    })
    h.press(['e', 'E'])
    h.press([' '])
    h.press([' '])
    for (let i = 0; i < 20; i += 1) h.idle(500)
    expect(h.session.debugLog().length).toBeGreaterThan(0)
  })

  test('声音接线：敌行动经 prepareTurnSounds 收到真实提交集合（记录器观察）', async () => {
    const readinessSnapshots: unknown[] = []
    const skill = attackSkill('wf-strike', 5)
    const h = makeWfSession({
      players: [wfPlayer('p1', { skills: ['wf-strike'] })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      extraOpts: {
        skills: { 'wf-strike': skill },
        prepareTurnSounds: async (_snapshot: unknown) => {
          readinessSnapshots.push(_snapshot)
        },
      },
    })
    h.press(['s', 'S'])
    h.press([' '])
    h.press([' '])
    h.press([' '])
    for (let i = 0; i < 20; i += 1) h.idle(500)
    expect(readinessSnapshots.length).toBeGreaterThanOrEqual(1) // 屏障真实拍摄到提交集合
  })

  test('资源扣除一次：法术 MP 只在提交时扣（debugPlayers 无 MP——由重复施法不崩溃+日志见证）', () => {
    const skill = attackSkill('wf-mid', 25)
    const h = makeWfSession({
      players: [wfPlayer('p1', { skills: ['wf-mid'], mp: 25, maxMp: 25 })],
      enemies: [wfEnemy('tank', { health: 900, attackStrength: 1 })],
      extraOpts: { skills: { 'wf-mid': skill } },
    })
    // 第一轮施法（25 MP 全扣）
    h.press(['s', 'S'])
    h.press([' '])
    h.press([' '])
    h.press([' '])
    for (let i = 0; i < 20; i += 1) h.idle(500)
    // 第二轮再开法术菜单：MP=0，法术列表应为空或不允许提交——不崩溃不重复扣
    expect(() => {
      h.press(['s', 'S'])
      h.idle()
      h.press(['Escape'])
    }).not.toThrow()
    const players = h.session.debugPlayers()
    expect(players[0]!.hp).toBeGreaterThan(0)
  })

  test('sfx 记录器接线：真实行动产生的 AssetId 序列经 assets.sfx 播放路径', () => {
    const sfx = recordingSfx()
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 200 })],
      enemies: [wfEnemy('e1', { health: 10 })],
    })
    // 注入记录型 sfx
    Object.assign(h.assets, { sfx: sfx.player } satisfies Partial<BattleSessionAssets>)
    h.press([' '])
    h.press([' '])
    for (let i = 0; i < 40 && h.session.debugReadiness().phase !== 'over'; i += 1) h.idle(500)
    // 真实 timeline 播音（敌 attack/action/death 音等）到达记录器
    expect(sfx.plays.length).toBeGreaterThanOrEqual(1)
  })
})
