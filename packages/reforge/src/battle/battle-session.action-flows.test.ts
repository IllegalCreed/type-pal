// @vitest-environment jsdom
/**
 * TEST-BATTLE-WORKFLOWS-1 W3：执行时间线接线。
 * 选择经公开 tick 提交后由真 core 执行；资源恰扣一次；prepareTurnSounds 快照核对
 * **实际动作集合**（cast 与 attack 分栏），不只数数量。断言用 MP/终态/声音记录器。
 */
import { describe, expect, test } from 'vitest'
import { wfEnemy, wfHealItem, wfPlayer, wfSkill } from '../__tests__/battle-workflows/catalog.js'
import { recordingSfx } from '../__tests__/battle-workflows/controlled-io.js'
import { makeWfSession } from '../__tests__/battle-workflows/session-driver.js'
import type { MenuAssets } from '../menu/menu-box.js'
import type { BattleTurnReadinessSnapshot } from './battle-session.js'

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

function bitmap(width: number, height: number, color: string): ImageBitmap {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  return Object.assign(canvas, { close() {} })
}

function battleCanvas(): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 200
  return canvas.getContext('2d')!
}

function infoBoxAssets(): MenuAssets {
  const blank = bitmap(1, 1, 'transparent')
  const box = { tiles: Array.from({ length: 9 }, () => blank) }
  const digits = Array.from({ length: 10 }, () => blank)
  return {
    box,
    itembox: box,
    statusBg: blank,
    equipSlot: blank,
    scroll: box,
    nums: digits,
    avatar: undefined,
    numsBlue: digits,
    numsCyan: digits,
    slash: blank,
    itemIcons: {},
    redBox: box,
    magicPlayerBox: bitmap(75, 35, '#ff0000'),
    cursorGrid: blank,
    cursorUp: blank,
    cursorUpRed: blank,
    cursorDown: blank,
    settleArrow: blank,
    battleIcons: [],
  }
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

  test('实际选指令与目标时显示人物框，攻击执行时隐藏，下轮重新选指令时恢复', () => {
    const h = makeWfSession({
      players: [wfPlayer('p1')],
      enemies: [wfEnemy('tank', { health: 900, attackStrength: 1 })],
    })
    h.assets.ui = infoBoxAssets()
    const ctx = battleCanvas()
    const panelVisible = (): boolean => {
      h.session.render(ctx, 1)
      return ctx.getImageData(91, 165, 1, 1).data[0] === 255
    }

    const visibleBeforeSelection = panelVisible()
    h.idle()
    expect(panelVisible()).toBe(true)
    h.press([' ']) // 进入目标选择
    expect(panelVisible()).toBe(true)
    h.press([' '])
    h.idle() // 提交本轮指令
    h.idle(240) // 真实攻击进入时间线
    expect(h.session.debugLog()).toContainEqual(expect.stringMatching(/^p1 .*攻击 tank 造成 /))
    expect(panelVisible()).toBe(false)
    expect(visibleBeforeSelection).toBe(false)

    for (let i = 0; i < 160 && h.session.debugReadiness().phase !== 'menu'; i++) h.idle()
    expect(h.session.debugReadiness().phase).toBe('menu')
    expect(panelVisible()).toBe(true)
    h.press(['a'])
    expect(panelVisible()).toBe(false)
  })

  test('非末敌死亡淡出期间阻塞下一行动，且无绘制也会恢复', () => {
    const sfx = recordingSfx()
    const h = makeWfSession({
      players: [wfPlayer('first', { baseDexterity: 200, attackStrength: 60 }), wfPlayer('next')],
      enemies: [
        wfEnemy('doomed', { health: 20, defense: 0, attackStrength: 1 }),
        wfEnemy('survivor', { health: 900, attackStrength: 1 }),
      ],
    })
    h.assets.sfx = sfx.player
    h.press([' '])
    h.press([' ']) // first 攻击首槽
    h.press([' '])
    h.press(['ArrowRight'])
    h.press([' ']) // next 攻击仍存活的第二槽

    const deathSound = 'sound.pal.030'
    for (let i = 0; i < 100 && !sfx.plays.includes(deathSound); i++) h.idle()
    expect(sfx.plays).toContain(deathSound) // 死音与淡出同拍开始
    const nextAttack = () =>
      h.session.debugLog().find((event) => /^next .*攻击 survivor 造成 /.test(event))
    for (let i = 0; i < 71; i++) h.idle() // 1152ms 淡出尚未结束
    expect(nextAttack()).toBeUndefined()

    h.idle() // 完成淡出，留出这一拍的终帧
    expect(nextAttack()).toBeUndefined()
    h.idle() // 正常下一拍开始后续行动
    expect(nextAttack()).toBeDefined()
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

  test('致死普攻绘出完整伤害，收尾播放一次敌人死亡音效', () => {
    const sfx = recordingSfx()
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 60 })],
      enemies: [wfEnemy('e1', { health: 20, defense: 0, attackStrength: 1 })],
    })
    h.assets.sfx = sfx.player
    h.assets.ui = {
      ...infoBoxAssets(),
      numsBlue: Array.from({ length: 10 }, (_, digit) =>
        bitmap(6, 8, `rgb(0,0,${(digit + 1) * 16})`),
      ),
    }
    const ctx = battleCanvas()
    h.press([' '])
    h.press([' '])
    let firstNumber: number[] | undefined
    for (let i = 0; i < 80 && !sfx.plays.includes('sound.pal.030'); i++) {
      h.idle()
      h.session.render(ctx, 1)
      // 单敌位置 (100,110)，首帧数字右缘 106、y=10。每个数字的蓝通道用来识别该字模。
      const blue = [88, 94, 100].map((x) => ctx.getImageData(x, 10, 1, 1).data[2] ?? 0)
      if (!firstNumber && blue.some((value) => value > 0)) firstNumber = blue
    }
    // 固定 RNG 下攻 60、防 28，基础伤害 75，追加 1 后暴击 ×3 = 228。
    expect(firstNumber).toEqual([48, 48, 144])
    expect(sfx.plays).toEqual(['sound.pal.030'])
  })
})
