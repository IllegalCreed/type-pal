// @vitest-environment jsdom
/**
 * TEST-BATTLE-WORKFLOWS-1 W3：执行时间线接线。
 * 选择经公开 tick 提交后由真 core 执行；资源恰扣一次；prepareTurnSounds 快照核对
 * **实际动作集合**（cast 与 attack 分栏），不只数数量。断言用 MP/终态/声音记录器。
 */
import type { BattleChoreography } from '@type-pal/content'
import {
  checkBattleChoreography,
  validateActors,
  validateBattleSprites,
  validateEnemies,
  validateItems,
  validatePoisons,
  validateSkills,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import standardPalette from '../../../../projects/pal/assets/migrated/colors/project-standard.json' with {
  type: 'json',
}
import palActors from '../../../../projects/pal/content/actors.json' with { type: 'json' }
import palBattleSprites from '../../../../projects/pal/content/battle-sprites.json' with {
  type: 'json',
}
import palEnemies from '../../../../projects/pal/content/enemies.json' with { type: 'json' }
import palItems from '../../../../projects/pal/content/items.json' with { type: 'json' }
import palPoisons from '../../../../projects/pal/content/poisons.json' with { type: 'json' }
import palSkills from '../../../../projects/pal/content/skills.json' with { type: 'json' }
import {
  enemyProfile,
  PLAYER_PROFILE,
  wfEnemy,
  wfHealItem,
  wfPlayer,
  wfSkill,
} from '../__tests__/battle-workflows/catalog.js'
import { fixedRng, recordingSfx, stubGlyphs } from '../__tests__/battle-workflows/controlled-io.js'
import {
  makeWfSession,
  wfLoadedBattleSprite,
} from '../__tests__/battle-workflows/session-driver.js'
import type { LoadedBattleSpriteDefinition } from '../assets.js'
import { expectDefined } from '../defined.js'
import type { MenuAssets } from '../menu/menu-box.js'
import type { CreatePlayerInput } from './battle-core.js'
import type { BattleTurnReadinessSnapshot } from './battle-session.js'
import { BattleSession } from './battle-session.js'

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

const poseRed = (frame: number): number => (frame + 1) * 16
const posePalette = {
  colors: Array.from({ length: 256 }, (_, index): [number, number, number] => [
    index < 16 ? index * 16 : 0,
    0,
    0,
  ]),
  cycles: [],
}

/** 在每个真实 RLE 帧的顶部画不同颜色，观察实际使用的姿态和底点。 */
function poseSprite(sprite: LoadedBattleSpriteDefinition): LoadedBattleSpriteDefinition {
  const frames = sprite.sprite.frames.map((frame, index) => ({
    ...frame,
    height: 8,
    pixels: new Uint8Array([index + 1, 0, 0, 0, 0, 0, 0, 0]),
    opaque: new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0]),
  }))
  return { ...sprite, sprite: { ...sprite.sprite, frames } }
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

function enemyPoisonAttackSession(players: CreatePlayerInput[], attackStrength = 0) {
  const egg = {
    ...wfHealItem('117'),
    use: {
      target: 'oneAlly' as const,
      consuming: true,
      effects: [{ kind: 'applyPoison' as const, poisonId: '551' }],
    },
  }
  return makeWfSession({
    players,
    enemies: [wfEnemy('e1', { attackStrength }, { attackEquivItem: { itemId: '117', rate: 4 } })],
    extraOpts: {
      items: { [egg.id]: egg },
      poisonDefs: {
        551: {
          id: 551,
          name: '赤毒',
          color: 16,
          curability: 'common',
          playerTicks: [{ hpDelta: -7 }],
        },
      },
    },
  })
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

  test('已准备的防御在首个战斗拍实绘，下一拍才开始敌普攻', async () => {
    const h = makeWfSession({
      players: [wfPlayer('li-xiaoyao', { defense: 100 })],
      enemies: [wfEnemy('next-enemy', { attackStrength: 0 })],
      extraOpts: { prepareTurnSounds: async () => {} },
    })
    const spriteId = expectDefined(h.assets.playerBaseDefinitionIds[0])
    const sprite = expectDefined(h.assets.battleSprites.get(spriteId))
    h.assets.battleSprites = new Map(h.assets.battleSprites).set(spriteId, poseSprite(sprite))
    h.assets.palette = posePalette
    const sfx = recordingSfx()
    h.assets.sfx = sfx.player
    const ctx = battleCanvas()
    const drawnPose = () => {
      h.session.render(ctx, 1)
      return ctx.getImageData(240, 162, 1, 1).data[0]
    }

    h.press(['d'])
    h.idle(16)
    expect(h.session.debugReadiness().phase).toBe('preparing')
    await flush()
    h.idle(23)
    expect(drawnPose()).toBe(poseRed(PLAYER_PROFILE.frames.idle))
    h.idle(1)
    expect(drawnPose()).toBe(poseRed(PLAYER_PROFILE.frames.defend))
    expect(sfx.plays).toEqual([])

    h.idle(39)
    expect(drawnPose()).toBe(poseRed(PLAYER_PROFILE.frames.defend))
    expect(sfx.plays).toEqual([])
    h.idle(1)
    expect(sfx.plays).toEqual(['sound.pal.355'])
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

  test('灯笼普攻在首帧播放起手音，命中与死亡保留原声', async () => {
    const enemy = expectDefined(
      validateEnemies(palEnemies.filter(({ id }) => id === 'enemy-399'))[0],
    )
    const definition = expectDefined(
      validateBattleSprites(palBattleSprites.filter(({ id }) => id === enemy.battleSprite))[0],
    )
    const h = makeWfSession({
      players: [wfPlayer('li-xiaoyao', { defense: 100 })],
      enemies: [enemy],
    })
    const sprite = expectDefined(h.assets.battleSprites.get(enemy.battleSprite))
    h.assets.battleSprites = new Map(h.assets.battleSprites).set(enemy.battleSprite, {
      ...sprite,
      definition,
    })
    const sfx = recordingSfx()
    h.assets.sfx = sfx.player

    h.press(['d'])
    const playerHp = () => expectDefined(h.readParty()[0]).hp
    for (let i = 0; i < 80 && playerHp() === 100; i++) h.idle()
    expect(playerHp()).toBe(99)
    expect(sfx.plays).toEqual(['sound.pal.050'])

    // 3 步前摇、1 拍 action、2 拍各 80ms 的冲锋帧，共 320ms 后命中。
    for (let i = 0; i < 7; i++) h.idle(40)
    h.idle(39)
    expect(sfx.plays).toEqual(['sound.pal.050'])
    h.idle(1)
    expect(sfx.plays).toEqual(['sound.pal.050', 'sound.pal.352'])

    for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'menu'; i++) h.idle(40)
    expect(h.session.debugReadiness().phase).toBe('menu')
    h.press([' '])
    h.press([' '])
    for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'over'; i++) h.idle(40)
    await expect(settleDone(h)).resolves.toBe('victory')
    expect(sfx.plays).toEqual(['sound.pal.050', 'sound.pal.352', 'sound.pal.032'])
  })

  test('敌普攻蓝字仅显示物理伤害，附毒立即单独扣血', () => {
    const h = enemyPoisonAttackSession([wfPlayer('p1', { defense: 100 })])
    h.assets.ui = {
      ...infoBoxAssets(),
      numsBlue: Array.from({ length: 10 }, (_, digit) =>
        bitmap(6, 8, `rgb(0,0,${(digit + 1) * 16})`),
      ),
    }
    const ctx = battleCanvas()
    h.press(['d'])
    let blue = 0
    for (let i = 0; i < 80 && blue === 0; i++) {
      h.idle()
      h.session.render(ctx, 1)
      // 单人脚底 (240,170)，命中蓝字的个位从 (240,95) 起画。
      blue = ctx.getImageData(240, 95, 1, 1).data[2] ?? 0
    }
    expect(blue).toBe(32) // 字模 1；把赤毒合并会画出字模 8。
    expect(h.session.debugPlayers()[0]).toMatchObject({
      hp: 92,
      poisons: [{ poisonId: 551, tickIndex: 0 }],
    })
  })

  test.each([
    {
      label: '法术致死',
      hp: 24,
      maxHp: 60,
      damage: 24,
      frame: PLAYER_PROFILE.frames.dead,
      sound: 'sound.pal.023',
    },
    {
      label: '法术濒死',
      hp: 85,
      maxHp: 150,
      damage: 58,
      frame: PLAYER_PROFILE.frames.dying,
      sound: 'sound.pal.019',
    },
  ])('雷咒$label，原位首次绘制受击和数字，再经过完整五拍及收尾', ({
    label,
    hp,
    maxHp,
    damage,
    frame,
    sound,
  }) => {
    const enemy = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-418'))
    const spell = expectDefined(validateSkills(palSkills).skills.find(({ id }) => id === '316'))
    const h = makeWfSession({
      players: [
        wfPlayer('li-xiaoyao', { hp, maxHp, defense: 9, baseDexterity: 3 }),
        wfPlayer('anu', { hp: 150, maxHp: 150, attackStrength: 2250, baseDexterity: 1 }),
      ],
      enemies: [enemy],
      extraOpts: {
        skills: { [spell.id]: spell },
        fieldEffect: { wind: -3, thunder: -2, water: 0, fire: 1, earth: 0 },
        playerSounds: [{ dying: 'sound.pal.019', death: 'sound.pal.023' }],
      },
    })
    const sfx = recordingSfx()
    h.assets.sfx = sfx.player
    h.assets.palette = posePalette
    const spriteId = expectDefined(h.assets.playerBaseDefinitionIds[0])
    const sprite = expectDefined(h.assets.battleSprites.get(spriteId))
    h.assets.battleSprites = new Map(h.assets.battleSprites).set(spriteId, poseSprite(sprite))
    h.assets.fireSprites = {
      [spell.animation.effectSprite]: {
        ...sprite.sprite,
        frames: [expectDefined(sprite.sprite.frames[0])],
      },
    }
    h.assets.ui = {
      ...infoBoxAssets(),
      magicPlayerBox: bitmap(1, 1, 'transparent'),
      numsBlue: Array.from({ length: 10 }, (_, digit) =>
        bitmap(6, 8, `rgb(0,0,${(digit + 1) * 16})`),
      ),
    }
    const ctx = battleCanvas()
    const pixel = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data
    const hurt = poseRed(PLAYER_PROFILE.frames.hurt)
    const tintedHurt = hurt + 6 * 16
    const draw = (dtMs: number) => {
      h.idle(dtMs)
      h.session.render(ctx, 1)
    }
    const casualtySounds = () =>
      sfx.plays.filter((id) => id === 'sound.pal.019' || id === 'sound.pal.023')
    h.press(['d'])
    h.press([' '])
    h.press([' '])
    for (let i = 0; i < 150; i += 1) {
      draw(8)
      if (pixel(200, 168)[0] === tintedHurt || pixel(208, 172)[0] === tintedHurt) break
    }
    expect(h.session.debugPlayers()[0]?.hp).toBe(hp - damage)
    expect(pixel(200, 168)[0]).toBe(tintedHurt)
    expect(pixel(200, 101)[2]).toBe(((damage % 10) + 1) * 16)
    expect(casualtySounds()).toEqual(label === '法术致死' ? [sound] : [])
    // CLASSIC fight.c:4886–4905: 只在 i>0 增加位移，敌回位一拍后才恢复队员。
    for (const [x, y, red] of [
      [204, 170, tintedHurt],
      [206, 171, tintedHurt],
      [207, 171, hurt],
      [207, 171, hurt],
      [207, 171, hurt],
    ] as const) {
      draw(40)
      expect(pixel(x, y)[0]).toBe(red)
    }
    draw(40)
    expect(pixel(200, 168)[0]).toBe(poseRed(frame))
    expect(casualtySounds()).toEqual([sound])
    const allyActed = () =>
      h.session
        .debugLog()
        .some((line) => line.startsWith('anu ') && line.includes('攻击 enemy-418'))
    draw(319)
    expect(allyActed()).toBe(false)
    draw(1)
    draw(40)
    draw(40)
    expect(allyActed()).toBe(true)
  })

  test('回合末毒伤显示 320ms 后开放选招，解毒后无数字的回合直接开放', () => {
    const enemy = expectDefined(
      validateEnemies(palEnemies.filter(({ id }) => id === 'enemy-406'))[0],
    )
    const [antidote, egg] = validateItems(palItems.filter(({ id }) => id === '87' || id === '117'))
    const redPoison = expectDefined(validatePoisons(palPoisons).find(({ id }) => id === 551))
    const turnStartSound = 'sound.pal.077'
    const encounterChoreo: BattleChoreography[] = [
      {
        at: 'turnStart',
        when: { kind: 'turn', op: '==', value: 2 },
        body: [{ kind: 'playSound', asset: turnStartSound }],
      },
    ]
    checkBattleChoreography(encounterChoreo, '血口虫起手')
    const h = makeWfSession({
      players: [
        wfPlayer('li-xiaoyao', {
          hp: 150,
          maxHp: 150,
          defense: 259,
          initialStatuses: { protect: 2 },
        }),
      ],
      enemies: [
        {
          ...enemy,
          // 固定随机数可复现首轮附毒，次轮让敌方跳过以单独观测解毒后的节拍。
          ai: {
            ...enemy.ai,
            rules: [
              { at: 'act', when: { kind: 'turn', op: '>=', value: 2 }, do: { kind: 'pass' } },
            ],
          },
        },
      ],
      extraOpts: {
        items: { 87: expectDefined(antidote), 117: expectDefined(egg) },
        poisonDefs: { [redPoison.id]: redPoison },
        inventory: [{ itemId: '87', count: 1 }],
        encounterChoreo,
      },
    })
    const sfx = recordingSfx()
    h.assets.sfx = sfx.player
    const finger = bitmap(1, 1, '#00ff00')
    h.assets.ui = {
      ...infoBoxAssets(),
      cursorDown: finger,
      cursorGrid: finger,
      numsBlue: Array.from({ length: 10 }, (_, digit) =>
        bitmap(6, 8, `rgb(0,0,${(digit + 1) * 16})`),
      ),
    }
    const ctx = battleCanvas()
    let nowMs = 0
    const tick = (dtMs = 16, keys: readonly string[] = []) => {
      nowMs += dtMs
      h.session.tick(dtMs, new Set(keys), nowMs)
    }
    const player = () => expectDefined(h.session.debugPlayers()[0])

    tick(16, ['d'])
    // 护体的计数独立标出真实空队列步，避免以菜单何时打开倒推回合末。
    for (let i = 0; i < 100 && player().status.protect === 2; i++) tick()
    expect(player()).toMatchObject({ hp: 135, status: { protect: 1 } })
    h.session.render(ctx, 1)
    expect(ctx.getImageData(240, 95, 1, 1).data[2]).toBe(128) // 首帧蓝字 7。
    const feedbackAtMs = nowMs

    tick(16, ['e'])
    tick(16, ['e'])
    expect(h.session.debugReadiness().phase).toBe('acting')
    expect(sfx.plays).not.toContain(turnStartSound)
    while (nowMs + 16 < feedbackAtMs + 319) tick()
    tick(feedbackAtMs + 319 - nowMs, ['e'])
    tick(0, ['e'])
    h.session.render(ctx, 1)
    expect(ctx.getImageData(91, 165, 1, 1).data[0]).toBe(0)
    expect(ctx.getImageData(232, 96, 1, 1).data[1]).toBe(0)
    expect(sfx.plays).not.toContain(turnStartSound)

    tick(1)
    expect(sfx.plays.filter((id) => id === turnStartSound)).toEqual([turnStartSound])
    tick()
    expect(h.session.debugReadiness().phase).toBe('menu')
    h.session.render(ctx, 1)
    expect(ctx.getImageData(91, 165, 1, 1).data[0]).toBe(255)

    tick(16, ['e'])
    expect(h.session.debugReadiness().phase).toBe('item')
    tick(16, [' '])
    tick(16, [' '])
    for (let i = 0; i < 100 && player().status.protect === 1; i++) tick(40)
    expect(player()).toMatchObject({ hp: 135, poisons: [], status: { protect: 0 } })
    const inventory = [{ itemId: '87', count: 1 }]
    h.session.writeBackInventory(inventory)
    expect(inventory).toEqual([])
    tick()
    expect(h.session.debugReadiness().phase).toBe('menu')
  })

  test('回合末毒伤的数字停拍保留原姿势，随后切濒死或倒地且无伤亡音', () => {
    const worm = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-406'))
    const egg = expectDefined(validateItems(palItems.filter(({ id }) => id === '117'))[0])
    const redPoison = expectDefined(validatePoisons(palPoisons).find(({ id }) => id === 551))
    const actors = validateActors(
      palActors.filter(({ id }) => id === 'zhao-linger' || id === 'li-xiaoyao'),
    )
    const h = makeWfSession({
      players: [
        wfPlayer('zhao-linger', {
          hp: 19,
          maxHp: 50,
          defense: 263,
          baseDexterity: 906,
          coveredBy: 'li-xiaoyao',
        }),
        wfPlayer('li-xiaoyao', { baseDexterity: 503 }),
      ],
      enemies: [worm],
      extraOpts: {
        items: { [egg.id]: egg },
        poisonDefs: { [redPoison.id]: redPoison },
        actorsById: Object.fromEntries(actors.map((actor) => [actor.id, actor])),
        playerSounds: [{ dying: 'sound.pal.020', death: 'sound.pal.024' }],
      },
    })
    const sfx = recordingSfx()
    h.assets.sfx = sfx.player
    const spriteId = expectDefined(h.assets.playerBaseDefinitionIds[0])
    const sprite = expectDefined(h.assets.battleSprites.get(spriteId))
    h.assets.battleSprites = new Map(h.assets.battleSprites).set(spriteId, poseSprite(sprite))
    h.assets.palette = posePalette
    h.assets.ui = {
      ...infoBoxAssets(),
      magicPlayerBox: bitmap(1, 1, 'transparent'),
      numsBlue: Array.from({ length: 10 }, (_, digit) =>
        bitmap(6, 8, `rgb(0,0,${(digit + 1) * 16})`),
      ),
    }
    const ctx = battleCanvas()
    const readPose = () => {
      h.session.render(ctx, 1)
      return ctx.getImageData(200, 168, 1, 1).data[0]
    }
    const player = () => expectDefined(h.session.debugPlayers()[0])
    for (const [hp, damage, before, after] of [
      [4, 7, PLAYER_PROFILE.frames.defend, PLAYER_PROFILE.frames.dying],
      [0, 3, PLAYER_PROFILE.frames.dying, PLAYER_PROFILE.frames.dead],
    ] as const) {
      h.press(['d'])
      h.press(['d'])
      for (let i = 0; i < 100 && player().hp !== hp; i++) h.idle()
      expect(player().hp).toBe(hp)
      // PAL 回合末只恢复坐标。新数字与毒伤前的队员姿势同帧实绘。
      expect(readPose()).toBe(poseRed(before))
      expect(ctx.getImageData(200, 101, 1, 1).data[2]).toBe((damage + 1) * 16)
      h.idle(319)
      expect(readPose()).toBe(poseRed(before))
      expect(h.session.debugReadiness().phase).toBe('acting')
      h.idle(1)
      expect(readPose()).toBe(poseRed(after))
      expect(h.session.debugReadiness().phase).toBe('menu')
    }
    expect(sfx.plays.filter((id) => id === 'sound.pal.020' || id === 'sound.pal.024')).toEqual([])
  })

  test('赤毒头像保留原色阶，雄黄解毒后恢复原画', () => {
    const antidote = expectDefined(validateItems(palItems.filter(({ id }) => id === '87'))[0])
    const redPoison = expectDefined(validatePoisons(palPoisons).find(({ id }) => id === 551))
    const h = makeWfSession({
      players: [wfPlayer('li-xiaoyao', { poisons: [{ poisonId: redPoison.id, tickIndex: 0 }] })],
      enemies: [
        wfEnemy(
          'waiting',
          {},
          { ai: { resistanceToSorcery: 5, rules: [{ at: 'act', do: { kind: 'pass' } }] } },
        ),
      ],
      extraOpts: {
        items: { [antidote.id]: antidote },
        poisonDefs: { [redPoison.id]: redPoison },
        inventory: [{ itemId: antidote.id, count: 1 }],
      },
    })
    h.assets.palette = {
      colors: standardPalette.colors.map(([red, green, blue]) => [
        expectDefined(red),
        expectDefined(green),
        expectDefined(blue),
      ]),
      cycles: [],
    }
    h.assets.ui = infoBoxAssets()
    const portrait = document.createElement('canvas')
    portrait.width = 4
    portrait.height = 1
    const portraitCtx = expectDefined(portrait.getContext('2d'))
    const source = portraitCtx.createImageData(4, 1)
    // PAL frame-48 (14,4) / (12,12) 为索引 2 / 153；再放未入色表的作者灰与透明像素。
    source.data.set([40, 40, 40, 255, 203, 146, 121, 255, 128, 128, 128, 255, 0, 0, 0, 0])
    portraitCtx.putImageData(source, 0, 0)
    h.assets.faces = { 'li-xiaoyao': Object.assign(portrait, { close() {} }) }

    const ctx = battleCanvas()
    const drawFace = () => {
      h.session.render(ctx, 1)
      return Array.from(ctx.getImageData(89, 161, 4, 1).data)
    }
    h.idle()
    expect(drawFace()).toEqual([81, 0, 0, 255, 178, 56, 44, 255, 166, 40, 32, 255, 0, 0, 0, 255])

    h.press(['e'])
    h.press([' '])
    h.press([' '])
    h.idle()
    for (let i = 0; i < 60 && h.session.debugReadiness().phase !== 'menu'; i++) h.idle(40)
    expect(h.session.debugReadiness().phase).toBe('menu')
    expect(h.session.debugPlayers()[0]?.poisons).toEqual([])
    expect(drawFace()).toEqual([
      40, 40, 40, 255, 203, 146, 121, 255, 128, 128, 128, 255, 0, 0, 0, 255,
    ])
  })

  test('敌人先手时自动格挡从冲锋首帧出现，格挡音留在命中拍', () => {
    const enemy = expectDefined(validateEnemies([wfEnemy('block-check')])[0])
    const playerArt = poseSprite(wfLoadedBattleSprite('battle-sprite.player', PLAYER_PROFILE))
    const enemyArt = wfLoadedBattleSprite(enemy.battleSprite, enemyProfile(enemy.battleSprite))
    validateBattleSprites([playerArt.definition, enemyArt.definition])
    const sfx = recordingSfx()
    const session = new BattleSession(
      [wfPlayer('li-xiaoyao', { baseDexterity: 1 })],
      [enemy],
      {
        palette: posePalette,
        glyphs: stubGlyphs,
        battleSprites: new Map([
          [playerArt.definition.id, playerArt],
          [enemy.battleSprite, enemyArt],
        ]),
        playerBaseDefinitionIds: [playerArt.definition.id],
        sfx: sfx.player,
      },
      (id) => id,
      // 敌、玩家各自抽身法后，第三抽 floor(0.75 × 17) 命中格挡。
      fixedRng([0.5, 0.5, 0.75]),
      { playerSounds: [{ cover: 'sound.pal.015' }] },
    )
    const ctx = battleCanvas()
    const tick = (ms: number) => session.tick(ms, new Set())
    const pixel = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[0]
    session.tick(16, new Set(['d']))
    for (let i = 0; i < 60 && sfx.plays.length === 0; i++) tick(16)
    expect(session.debugLog()).toContain('li-xiaoyao 格挡了 block-check 的攻击')
    expect(sfx.plays).toEqual(['sound.pal.355'])

    tick(80)
    tick(79)
    session.render(ctx, 1)
    expect(pixel(240, 162)).toBe(poseRed(PLAYER_PROFILE.frames.idle))
    tick(1)
    session.render(ctx, 1)
    expect(pixel(196, 153)).toBe(16) // 冲至 (240−44,170−16) 的敌方精灵。
    expect(pixel(240, 162)).toBe(poseRed(PLAYER_PROFILE.frames.defend))
    expect(sfx.plays).toEqual(['sound.pal.355', 'sound.pal.300'])

    tick(80)
    tick(39)
    expect(sfx.plays).toHaveLength(2)
    tick(1)
    expect(sfx.plays).toEqual(['sound.pal.355', 'sound.pal.300', 'sound.pal.015'])
    expect(session.debugPlayers()[0]?.hp).toBe(100)
    tick(40)
    session.render(ctx, 1)
    expect(pixel(248, 166)).toBe(poseRed(PLAYER_PROFILE.frames.defend))
    tick(40)
    session.render(ctx, 1)
    expect(pixel(250, 167)).toBe(poseRed(PLAYER_PROFILE.frames.defend))
  })

  test('灯笼使李逍遥濒死再倒地，伤亡声各在实际受击时间线内播一次', async () => {
    const lantern = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-399'))
    const h = makeWfSession({
      players: [
        wfPlayer('li-xiaoyao', {
          hp: 40,
          maxHp: 40,
          defense: 9,
          baseDexterity: 3,
          coveredBy: 'lin-yueru',
        }),
        wfPlayer('anu', { attackStrength: 950, baseDexterity: 1 }),
      ],
      enemies: [lantern],
      extraOpts: {
        playerSounds: [
          { dying: 'sound.pal.019', death: 'sound.pal.023' },
          { weapon: 'sound.pal.004' },
        ],
      },
    })
    const sfx = recordingSfx()
    h.assets.sfx = sfx.player
    h.assets.palette = posePalette
    const spriteId = expectDefined(h.assets.playerBaseDefinitionIds[0])
    const sprite = expectDefined(h.assets.battleSprites.get(spriteId))
    h.assets.battleSprites = new Map(h.assets.battleSprites).set(spriteId, poseSprite(sprite))
    const ctx = battleCanvas()
    const pixel = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[0]
    const drawUntil = (x: number, y: number, frame: number) => {
      for (let i = 0; i < 80; i += 1) {
        h.idle()
        h.session.render(ctx, 1)
        if (pixel(x, y) === poseRed(frame)) return
      }
      expect(pixel(x, y)).toBe(poseRed(frame))
    }
    const casualtySounds = () =>
      sfx.plays.filter((sound) => sound === 'sound.pal.019' || sound === 'sound.pal.023')

    h.press(['d'])
    h.press(['d'])
    // 两人队首归位 (200,176)，读取精灵顶部。
    drawUntil(200, 168, PLAYER_PROFILE.frames.dying)
    expect(h.session.debugPlayers()[0]?.hp).toBe(5)
    expect(casualtySounds()).toEqual([])
    h.idle(160)
    expect(casualtySounds()).toEqual([])
    for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'menu'; i += 1) h.idle()
    expect(h.session.debugReadiness().phase).toBe('menu')
    expect.soft(casualtySounds()).toEqual(['sound.pal.019'])

    h.press(['d'])
    h.press([' '])
    h.press([' '])
    drawUntil(208, 172, PLAYER_PROFILE.frames.hurt)
    expect(h.session.debugPlayers()[0]?.hp).toBe(0)
    expect(casualtySounds()).not.toContain('sound.pal.023')
    drawUntil(210, 173, PLAYER_PROFILE.frames.hurt)
    expect.soft(casualtySounds()).toContain('sound.pal.023')
    drawUntil(200, 168, PLAYER_PROFILE.frames.dead)
    expect(sfx.plays).not.toContain('sound.pal.004')

    let result: string | undefined
    void h.session.done.then((value) => {
      result = value
    })
    for (let i = 0; i < 100; i += 1) h.idle(40)
    await flush()
    expect(result).toBe('victory')
    expect(sfx.plays).toContain('sound.pal.004')
    expect(casualtySounds()).toEqual(['sound.pal.019', 'sound.pal.023'])
  })

  test.each([
    {
      cause: '附毒后濒死仍先恢复主动防御姿态',
      hp: 21,
      maxHp: 100,
      attackStrength: 0,
      returnFrame: PLAYER_PROFILE.frames.defend,
      poisonCount: 1,
      nextHp: 6,
    },
    {
      cause: '物理先跨入濒死且随后附毒致死',
      hp: 8,
      maxHp: 40,
      attackStrength: 0,
      returnFrame: PLAYER_PROFILE.frames.dying,
      poisonCount: 1,
      nextHp: 0,
    },
    {
      cause: '物理直接致死',
      hp: 8,
      maxHp: 40,
      attackStrength: 300,
      returnFrame: PLAYER_PROFILE.frames.dead,
      poisonCount: 1,
      nextHp: 0,
    },
  ])('$cause，敌普攻归位姿势由物理扣血决定且下一轮队员框显示最终 HP', ({
    hp,
    maxHp,
    attackStrength,
    returnFrame,
    poisonCount,
    nextHp,
  }) => {
    const h = enemyPoisonAttackSession(
      [wfPlayer('p1', { hp, maxHp, defense: 100 }), wfPlayer('p2')],
      attackStrength,
    )
    const spriteId = expectDefined(h.assets.playerBaseDefinitionIds[0])
    const sprite = expectDefined(h.assets.battleSprites.get(spriteId))
    h.assets.battleSprites = new Map(h.assets.battleSprites).set(spriteId, poseSprite(sprite))
    h.assets.palette = posePalette
    h.assets.ui = {
      ...infoBoxAssets(),
      magicPlayerBox: bitmap(1, 1, 'transparent'),
      nums: Array.from({ length: 10 }, (_, digit) => bitmap(6, 8, `rgb(0,${(digit + 1) * 16},0)`)),
    }
    const ctx = battleCanvas()
    h.press(['d'])
    h.press(['d'])
    let knockedBack = false
    let firstReturnPose: number | undefined
    for (let i = 0; i < 100 && firstReturnPose === undefined; i++) {
      h.idle()
      h.session.render(ctx, 1)
      // 两人队首脚底 (200,176)；后坐到 (210,181) 后才识别归位帧。取精灵顶部避开队员框。
      if (ctx.getImageData(210, 173, 1, 1).data[0] === poseRed(PLAYER_PROFILE.frames.hurt))
        knockedBack = true
      const pose = ctx.getImageData(200, 168, 1, 1).data[0]
      if (knockedBack && pose) firstReturnPose = pose
    }
    expect(firstReturnPose).toBe(poseRed(returnFrame))
    expect(h.session.debugPlayers()[0]?.poisons).toHaveLength(poisonCount)

    for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'menu'; i++) h.idle()
    h.session.render(ctx, 1)
    expect(h.session.debugReadiness().phase).toBe('menu')
    const nextFrame = nextHp === 0 ? PLAYER_PROFILE.frames.dead : PLAYER_PROFILE.frames.dying
    expect(ctx.getImageData(200, 168, 1, 1).data[0]).toBe(poseRed(nextFrame))
    expect(h.session.debugPlayers()[0]?.hp).toBe(nextHp)
    expect(ctx.getImageData(135, 170, 1, 1).data[1]).toBe((nextHp + 1) * 16)
  })
})
