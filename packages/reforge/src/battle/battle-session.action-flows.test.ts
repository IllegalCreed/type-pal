// @vitest-environment jsdom
import { validateItems, validateSkills } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import palItems from '../../../../projects/pal/content/items.json' with { type: 'json' }
import palSkills from '../../../../projects/pal/content/skills.json' with { type: 'json' }
import { wfEnemy, wfHealItem, wfPlayer, wfSkill } from '../__tests__/battle-workflows/catalog.js'
import { stubGlyphs } from '../__tests__/battle-workflows/controlled-io.js'
import {
  battleCanvas,
  bitmap,
  infoBoxAssets,
  posePalette,
} from '../__tests__/battle-workflows/render-io.js'
import {
  flush,
  makeWfSession,
  makeWfSessionFromWorld,
  settleDone,
} from '../__tests__/battle-workflows/session-driver.js'
import { expectDefined } from '../defined.js'
import { MenuBox } from '../menu/menu-box.js'
import type { BattleTurnReadinessSnapshot } from './battle-session.js'

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

  test('战斗杂项状态页实际绘制施法后的真气，关闭后回到选招', () => {
    const spell = wfSkill('status-mp-spell', 9)
    const { harness: battle, world } = makeWfSessionFromWorld({
      actorIds: ['p1'],
      enemies: [wfEnemy('status-mp-target', { health: 900, attackStrength: 1 })],
      initialMagic: [spell.id],
      extraOpts: { skills: { [spell.id]: spell } },
    })
    const menu = infoBoxAssets()
    menu.statusBg = bitmap(320, 200, '#0f1113')
    // Distinct numeric tiles let the pixel oracle distinguish 31 from the entry snapshot 40.
    menu.nums = Array.from({ length: 10 }, (_, digit) =>
      bitmap(6, 8, `rgb(${20 + 20 * digit}, 7, 30)`),
    )
    battle.assets.statusPanel = {
      renderer: new MenuBox(stubGlyphs, {}, menu, {}),
      party: world.party,
    }

    for (const key of ['ArrowLeft', 'Enter', 'Enter', 'Enter']) battle.press([key])
    battle.idle(40)
    for (let step = 0; step < 80 && battle.session.debugReadiness().phase !== 'menu'; step++)
      battle.idle(40)
    expect(battle.session.debugReadiness().phase).toBe('menu')
    expect(battle.readParty()[0]?.mp).toBe(31)
    expect(world.party[0]?.mp).toBe(40)

    for (const key of ['ArrowDown', 'Enter', 'ArrowUp', 'Enter']) battle.press([key])
    const ctx = battleCanvas()
    battle.session.render(ctx, 1)
    const pixel = (x: number, y: number) => Array.from(ctx.getImageData(x, y, 1, 1).data)
    expect([pixel(61, 75), pixel(67, 75)]).toEqual([
      [80, 7, 30, 255],
      [40, 7, 30, 255],
    ])
    expect(pixel(0, 0)).toEqual([15, 17, 19, 255])

    battle.press(['Escape'])
    expect(battle.session.debugReadiness().phase).toBe('menu')
    ctx.clearRect(0, 0, 320, 200)
    battle.session.render(ctx, 1)
    expect(pixel(0, 0)).not.toEqual([15, 17, 19, 255])
  })

  test('用物和仙术列表按当前选项在 PAL 原坐标、色板与行距实绘说明', () => {
    const revive = expectDefined(validateItems(palItems.filter(({ id }) => id === '95'))[0])
    const blank = { ...wfHealItem('no-description'), desc: [] }
    const skill = expectDefined(validateSkills(palSkills).skills.find(({ id }) => id === '295'))
    const h = makeWfSession({
      players: [wfPlayer('zhao-linger', { mp: 100, maxMp: 100, skills: [skill.id] })],
      enemies: [wfEnemy('description-control')],
      extraOpts: {
        items: { [revive.id]: revive, [blank.id]: blank },
        skills: { [skill.id]: skill },
        inventory: [
          { itemId: revive.id, count: 1 },
          { itemId: blank.id, count: 1 },
        ],
      },
    })
    h.assets.ui = infoBoxAssets()
    const ink = [243, 239, 93] as const
    h.assets.palette = { ...posePalette, colors: [...posePalette.colors] }
    h.assets.palette.colors[0x3c] = [...ink]
    // 给说明首字各画一个点阵像素，在真画布取位置和颜色。
    const firstChars = new Set(
      [...revive.desc, ...skill.desc.split('\n')].map((line) => line.codePointAt(0)),
    )
    const glyph = { width: 16, height: 16, bitmap: Uint8Array.of(0x80, ...new Uint8Array(31)) }
    h.assets.glyphs = {
      has: (cp) => firstChars.has(cp),
      get: (cp) => (firstChars.has(cp) ? glyph : undefined),
    }
    const ctx = battleCanvas()
    const read = (x: number, y: number) => Array.from(ctx.getImageData(x, y, 1, 1).data)
    const color = [...ink, 255]
    h.press(['ArrowLeft'])
    h.press([' '])
    h.session.render(ctx, 1)
    expect([read(102, 3), read(102, 19)]).toEqual([color, color])
    h.press(['Escape'])
    h.press(['e'])
    h.session.render(ctx, 1)
    expect([read(71, 151), read(71, 167), read(71, 183)]).toEqual([color, color, color])
    h.press(['ArrowRight'])
    h.session.render(ctx, 1)
    expect(read(71, 151)).not.toEqual(color)
    expect(h.readParty()[0]?.mp).toBe(100)
  })

  test('施法经真 core：MP 恰扣一次（40→20 非 0），readiness 快照含 cast 动作', async () => {
    const snapshots: BattleTurnReadinessSnapshot[] = []
    const skill = wfSkill('wf-nuke', 20)
    const h = makeWfSession({
      players: [wfPlayer('p1', { skills: ['wf-nuke'], mp: 40, maxMp: 40, magicStrength: 45 })],
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
    expect(h.session.debugReadiness().phase).toBe('menu')
    h.press(['ArrowLeft']) // 二轮再开法术
    h.press([' '])
    expect(h.session.debugReadiness().phase).toBe('skill')
    h.press(['Enter']) // 确认灰置的技能
    expect(h.session.debugReadiness().phase).toBe('skill')
    h.press(['Escape'])
    h.press(['d'])
    for (let i = 0; i < 40 && !h.session.debugLog().includes('p1 防御'); i++) h.idle(80)
    expect(h.session.debugLog()).toContain('p1 防御')
    expect(h.session.debugLog().filter((line) => line.startsWith('p1 施展'))).toHaveLength(1)
    expect(h.readParty()[0]!.mp).toBe(0)
  })
})
