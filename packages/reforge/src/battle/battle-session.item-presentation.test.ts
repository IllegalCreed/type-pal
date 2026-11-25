// @vitest-environment jsdom
import { validateEnemies, validateItems } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import palEnemies from '../../../../projects/pal/content/enemies.json' with { type: 'json' }
import palItems from '../../../../projects/pal/content/items.json' with { type: 'json' }
import { PLAYER_PROFILE, wfEnemy, wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { recordingSfx } from '../__tests__/battle-workflows/controlled-io.js'
import {
  battleCanvas,
  bitmap,
  infoBoxAssets,
  posePalette,
  poseRed,
  poseSprite,
} from '../__tests__/battle-workflows/render-io.js'
import { makeWfSession } from '../__tests__/battle-workflows/session-driver.js'
import { expectDefined } from '../defined.js'
import { DialogBox } from '../dialog/dialog-box.js'

describe('道具使用和投掷的战场画面', () => {
  test('灵蛊的十三拍辉光同时覆盖两名队员，归位帧显示各自回复的真气', () => {
    const item = expectDefined(validateItems(palItems.filter(({ id }) => id === '145'))[0])
    const h = makeWfSession({
      players: [
        wfPlayer('li-xiaoyao', { mp: 10, maxMp: 100, baseDexterity: 900 }),
        wfPlayer('anu', { mp: 30, maxMp: 100, baseDexterity: 100 }),
      ],
      enemies: [wfEnemy('item-target', { health: 500, attackStrength: 1 })],
      extraOpts: {
        items: { [item.id]: item },
        inventory: [{ itemId: item.id, count: 1 }],
        soundRoles: { 'audio.battleItemUseSound': 'sound.pal.028' },
      },
    })
    const sfx = recordingSfx()
    h.assets.sfx = sfx.player
    h.assets.palette = posePalette
    const spriteId = expectDefined(h.assets.playerBaseDefinitionIds[0])
    h.assets.battleSprites = new Map(h.assets.battleSprites).set(
      spriteId,
      poseSprite(expectDefined(h.assets.battleSprites.get(spriteId))),
    )
    h.assets.ui = {
      ...infoBoxAssets(),
      numsCyan: Array.from({ length: 10 }, (_, digit) =>
        bitmap(6, 8, `rgb(0,0,${(digit + 1) * 16})`),
      ),
    }
    const ctx = battleCanvas()
    const pixel = (x: number, y: number, channel = 0) => ctx.getImageData(x, y, 1, 1).data[channel]
    h.press(['e'])
    h.press([' '])
    h.press(['d'])
    for (let i = 0; i < 120 && !sfx.plays.length; i++) h.idle(8)
    expect(sfx.plays).toEqual(['sound.pal.028'])
    const glow = [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0]
    const frames = glow.map(() => {
      h.session.render(ctx, 1)
      const frame = [pixel(185, 161), pixel(256, 144)]
      h.idle(40)
      return frame
    })
    expect(frames).toEqual(
      glow.map((shift) => [
        poseRed(PLAYER_PROFILE.frames.preMagic + shift),
        poseRed(PLAYER_PROFILE.frames.idle + shift),
      ]),
    )
    h.session.render(ctx, 1)
    expect(pixel(200, 168)).toBe(poseRed(PLAYER_PROFILE.frames.idle))
    expect([pixel(194, 109, 2), pixel(200, 109, 2)]).toEqual([160, 16])
    expect([pixel(250, 85, 2), pixel(256, 85, 2)]).toEqual([128, 16])
  })

  test('还魂香保留倒地辉光，在黄字首帧切到复活后的濒死姿态', () => {
    const item = expectDefined(validateItems(palItems.filter(({ id }) => id === '95'))[0])
    const h = makeWfSession({
      players: [
        wfPlayer('li-xiaoyao', { hp: 0, maxHp: 150 }),
        wfPlayer('zhao-linger', { baseDexterity: 900 }),
      ],
      enemies: [wfEnemy('revive-target', { health: 500, attackStrength: 1 })],
      extraOpts: {
        items: { [item.id]: item },
        inventory: [{ itemId: item.id, count: 1 }],
        soundRoles: { 'audio.battleItemUseSound': 'sound.pal.028' },
      },
    })
    const sfx = recordingSfx()
    h.assets.sfx = sfx.player
    h.assets.palette = posePalette
    const spriteId = expectDefined(h.assets.playerBaseDefinitionIds[0])
    h.assets.battleSprites = new Map(h.assets.battleSprites).set(
      spriteId,
      poseSprite(expectDefined(h.assets.battleSprites.get(spriteId))),
    )
    h.assets.ui = {
      ...infoBoxAssets(),
      nums: Array.from({ length: 10 }, (_, digit) => bitmap(6, 8, `rgb(0,${(digit + 1) * 16},0)`)),
    }
    const ctx = battleCanvas()
    const targetPose = () => {
      h.session.render(ctx, 1)
      return ctx.getImageData(200, 168, 1, 1).data[0]
    }
    h.press(['e'])
    h.press([' '])
    h.press(['ArrowLeft'])
    h.press([' '])
    for (let i = 0; i < 120 && !sfx.plays.length; i++) h.idle(8)
    expect(sfx.plays).toEqual(['sound.pal.028'])
    expect(targetPose()).toBe(poseRed(PLAYER_PROFILE.frames.dead))
    h.idle(240)
    expect(targetPose()).toBe(poseRed(PLAYER_PROFILE.frames.dead + 6))
    h.idle(280)
    const firstNumberFramePose = targetPose()
    expect([194, 200].map((x) => ctx.getImageData(x, 101, 1, 1).data[1])).toEqual([32, 96])
    expect(firstNumberFramePose).toBe(poseRed(PLAYER_PROFILE.frames.dying))
  })

  test('吸星锁的蓝伤害与黄回血同帧显示，施用者仍在出手位', () => {
    const enemy = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-406'))
    const item = expectDefined(validateItems(palItems.filter(({ id }) => id === '158'))[0])
    const animation = expectDefined(item.throw?.presentation).animation
    const h = makeWfSession({
      players: [
        wfPlayer('li-xiaoyao', { hp: 10, maxHp: 150, baseDexterity: 900 }),
        wfPlayer('anu', { baseDexterity: 100 }),
      ],
      enemies: [enemy],
      extraOpts: {
        items: { [item.id]: item },
        inventory: [{ itemId: item.id, count: 1 }],
      },
    })
    h.assets.palette = posePalette
    const spriteId = expectDefined(h.assets.playerBaseDefinitionIds[0])
    const sprite = poseSprite(expectDefined(h.assets.battleSprites.get(spriteId)))
    h.assets.battleSprites = new Map(h.assets.battleSprites).set(spriteId, sprite)
    h.assets.fireSprites = {
      [animation.effectSprite]: {
        ...sprite.sprite,
        frames: [expectDefined(sprite.sprite.frames[0])],
      },
    }
    h.assets.ui = {
      ...infoBoxAssets(),
      nums: Array.from({ length: 10 }, (_, digit) => bitmap(6, 8, `rgb(0,${(digit + 1) * 16},0)`)),
      numsBlue: Array.from({ length: 10 }, (_, digit) =>
        bitmap(6, 8, `rgb(0,0,${(digit + 1) * 16})`),
      ),
    }
    const ctx = battleCanvas()
    h.press(['w'])
    h.press([' '])
    h.press([' '])
    h.press(['d'])
    let firstNumbers: number[][] = []
    for (let i = 0; i < 130; i++) {
      h.idle(8)
      h.session.render(ctx, 1)
      const blue = [88, 94, 100].map((x) => expectDefined(ctx.getImageData(x, 10, 1, 1).data[2]))
      if (!blue.some((value) => value)) continue
      const yellow = [178, 184, 190].map((x) =>
        expectDefined(ctx.getImageData(x, 97, 1, 1).data[1]),
      )
      firstNumbers = [blue, yellow]
      break
    }
    expect(ctx.getImageData(190, 164, 1, 1).data[0]).toBe(poseRed(PLAYER_PROFILE.frames.magic))
    expect(firstNumbers).toEqual([
      [32, 144, 16], // 敌人扣 180。
      [32, 80, 16], // 施用者回复 140，受最大体力所限。
    ])
  })

  function beginIneffectiveThrow(withDialog: boolean) {
    const item = expectDefined(validateItems(palItems.filter(({ id }) => id === '134'))[0])
    const enemies = validateEnemies(palEnemies)
    const lantern = expectDefined(enemies.find(({ id }) => id === 'enemy-399'))
    const bug = expectDefined(enemies.find(({ id }) => id === 'enemy-406'))
    const h = makeWfSession({
      players: [wfPlayer('li-xiaoyao', { baseDexterity: 500 })],
      enemies: [lantern, bug],
      extraOpts: {
        items: { [item.id]: item },
        inventory: [{ itemId: item.id, count: 1 }],
        playerSounds: [{ magic: 'sound.pal.009' }],
      },
    })
    const sfx = recordingSfx()
    h.assets.sfx = sfx.player
    h.assets.palette = posePalette
    const spriteId = expectDefined(h.assets.playerBaseDefinitionIds[0])
    const sprite = expectDefined(h.assets.battleSprites.get(spriteId))
    h.assets.battleSprites = new Map(h.assets.battleSprites).set(spriteId, poseSprite(sprite))
    const glyph = { width: 16, height: 16, bitmap: Uint8Array.of(0x80, ...Array(31).fill(0)) }
    h.assets.glyphs = { has: () => true, get: () => glyph }
    const scroll = { tiles: Array.from({ length: 9 }, () => bitmap(8, 8, '#00ff00')) }
    const ctx = battleCanvas()
    const box = withDialog
      ? new DialogBox(ctx, h.assets.glyphs, [], new Map(), {}, scroll)
      : undefined
    if (box) h.assets.dialogBox = box
    const draw = () => h.session.render(ctx, 1)
    const pixel = (x: number, y: number) =>
      Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3))
    const actorAt = (x: number, y: number) => pixel(x, y - 8)[0]
    const stepAndDraw = (ms: number) => {
      h.idle(ms)
      draw()
    }

    h.press(['w'])
    h.press(['Enter'])
    for (let i = 0; i < 20 && !h.session.debugLog().includes('无任何效果'); i++) h.idle(8)
    expect(h.session.debugLog()).toContain('无任何效果')
    draw()
    return { h, item, sfx, box, draw, pixel, actorAt, stepAndDraw }
  }

  test.each([
    'timeout',
    'confirm',
  ] as const)('化尸水未达标的中央小框在投掷出手后出现，%s 后收招', (dismissal) => {
    const { h, item, sfx, box, draw, pixel, actorAt, stepAndDraw } = beginIneffectiveThrow(true)
    const dialogue = expectDefined(box)
    const notice = () => dialogue.observe()?.pageText ?? null
    expect(notice()).toBeNull()
    // The failure text has never been a white notice at (130,75).
    expect(pixel(130, 75)).toEqual([0, 0, 0])
    stepAndDraw(160) // Four approach beats before the item name.
    expect(pixel(210, 50)).toEqual([255, 255, 255])
    expect(notice()).toBeNull()
    stepAndDraw(399)
    expect(actorAt(230, 166)).toBe(poseRed(PLAYER_PROFILE.frames.preMagic))
    expect(sfx.plays).toEqual(['sound.pal.009'])
    stepAndDraw(1)
    expect(actorAt(230, 166)).toBe(poseRed(PLAYER_PROFILE.frames.magic))
    stepAndDraw(79)
    expect(pixel(210, 50)).toEqual([255, 255, 255])
    expect(notice()).toBeNull()
    // The script runs after two release beats (fight.c:4355–4362), even when a tick overshoots.
    stepAndDraw(dismissal === 'timeout' ? 1 : 1000)
    expect(pixel(210, 50)).toEqual([0, 0, 0])
    expect(dialogue.observe()).toMatchObject({ slot: 'narration', pageText: '无任何效果' })
    expect(pixel(120, 40)).toEqual([0, 255, 0]) // The actual centered scroll, not a text banner.
    expect(actorAt(230, 166)).toBe(poseRed(PLAYER_PROFILE.frames.magic))
    if (dismissal === 'timeout') {
      stepAndDraw(1399)
      expect(notice()).toBe('无任何效果')
      stepAndDraw(1)
    } else {
      stepAndDraw(200)
      h.press(['Enter'], 1)
      draw()
    }
    expect(notice()).toBeNull()
    expect(pixel(120, 40)).toEqual([0, 0, 0])
    expect(actorAt(230, 166)).toBe(poseRed(PLAYER_PROFILE.frames.magic))
    stepAndDraw(159)
    expect(actorAt(230, 166)).toBe(poseRed(PLAYER_PROFILE.frames.magic))
    stepAndDraw(1)
    expect(actorAt(240, 170)).toBe(poseRed(PLAYER_PROFILE.frames.idle))
    const inventory = [{ itemId: item.id, count: 1 }]
    h.session.writeBackInventory(inventory)
    expect(inventory).toEqual([])
    expect(h.session.debugLog().filter((line) => line === '无任何效果')).toHaveLength(1)
  })

  test('化尸水提示显示期间取消战斗，卷轴清除且战斗不会再推进', async () => {
    const { h, box, draw, pixel, stepAndDraw } = beginIneffectiveThrow(true)
    const dialogue = expectDefined(box)
    stepAndDraw(640) // Four approach beats and twelve item-name beats.
    expect(dialogue.observe()).toMatchObject({ slot: 'narration', pageText: '无任何效果' })
    expect(pixel(120, 40)).toEqual([0, 255, 0])

    const cancelled = expect(h.session.done).rejects.toMatchObject({ name: 'AbortError' })
    const log = [...h.session.debugLog()]
    h.session.cancel()
    expect(dialogue.observeSlots()).toEqual([])
    await cancelled
    h.press(['Enter'], 2000)
    draw()
    expect(pixel(120, 40)).toEqual([0, 0, 0])
    expect(h.session.debugLog()).toEqual(log)
  })

  test('缺少对话框资源时，化尸水出手后显示一次兜底提示并自动继续', () => {
    const { pixel, actorAt, stepAndDraw } = beginIneffectiveThrow(false)
    expect(pixel(130, 75)).toEqual([0, 0, 0])
    stepAndDraw(639)
    expect(pixel(210, 50)).toEqual([255, 255, 255])
    expect(pixel(130, 75)).toEqual([0, 0, 0])
    stepAndDraw(1)
    expect(pixel(210, 50)).toEqual([0, 0, 0])
    expect(pixel(130, 75)).toEqual([255, 255, 255])
    stepAndDraw(1399)
    expect(pixel(130, 75)).toEqual([255, 255, 255])
    expect(actorAt(230, 166)).toBe(poseRed(PLAYER_PROFILE.frames.magic))
    stepAndDraw(1)
    expect(pixel(130, 75)).toEqual([0, 0, 0])
    stepAndDraw(160)
    expect(actorAt(240, 170)).toBe(poseRed(PLAYER_PROFILE.frames.idle))
  })

  test('木剑投掷实绘挥臂、出手和回位，两段收尾后才轮到队友', () => {
    const enemy = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-406'))
    const item = expectDefined(validateItems(palItems.filter(({ id }) => id === '166'))[0])
    const presentation = expectDefined(item.throw?.presentation)
    const sfx = recordingSfx()
    const h = makeWfSession({
      players: [
        wfPlayer('li-xiaoyao', { hp: 20, maxHp: 150, attackStrength: 52, baseDexterity: 903 }),
        wfPlayer('anu', { attackStrength: 950, baseDexterity: 150 }),
      ],
      enemies: [enemy],
      extraOpts: {
        items: { [item.id]: item },
        inventory: [{ itemId: item.id, count: 1 }],
        playerSounds: [{ magic: 'sound.pal.009' }],
      },
    })
    h.assets.sfx = sfx.player
    h.assets.palette = posePalette
    const spriteId = expectDefined(h.assets.playerBaseDefinitionIds[0])
    const sprite = expectDefined(h.assets.battleSprites.get(spriteId))
    const enemySprite = expectDefined(h.assets.battleSprites.get(enemy.battleSprite))
    h.assets.battleSprites = new Map(h.assets.battleSprites)
      .set(spriteId, poseSprite(sprite))
      .set(enemy.battleSprite, poseSprite(enemySprite))
    h.assets.fireSprites = {
      [presentation.animation.effectSprite]: {
        ...sprite.sprite,
        frames: [expectDefined(sprite.sprite.frames[0])],
      },
    }
    h.assets.ui = {
      ...infoBoxAssets(),
      numsBlue: Array.from({ length: 10 }, (_, digit) =>
        bitmap(6, 8, `rgb(0,0,${(digit + 1) * 16})`),
      ),
    }
    const ctx = battleCanvas()
    const draw = () => h.session.render(ctx, 1)
    const fighterAt = (x: number, footY: number) => ctx.getImageData(x, footY - 8, 1, 1).data[0]
    h.press(['w'])
    h.press([' '])
    h.press([' '])
    h.press([' ']) // 阿奴普攻。
    h.press([' '])
    for (let i = 0; i < 20 && !h.session.debugLog().some((line) => line.includes('投掷 木剑')); i++)
      h.idle(8)
    expect(h.session.debugLog().some((line) => line.includes('投掷 木剑'))).toBe(true)
    draw()
    expect(fighterAt(196, 174)).toBe(poseRed(PLAYER_PROFILE.frames.dying))

    for (const [x, y] of [
      [193, 173],
      [191, 172],
      [190, 172],
    ] as const) {
      h.idle(40)
      draw()
      expect(fighterAt(x, y)).toBe(poseRed(PLAYER_PROFILE.frames.dying))
    }
    h.idle(119)
    expect(sfx.plays).toEqual([])
    h.idle(1)
    draw()
    expect(fighterAt(190, 172)).toBe(poseRed(PLAYER_PROFILE.frames.preMagic))
    expect(sfx.plays).toEqual(['sound.pal.009'])
    h.idle(320)
    draw()
    expect(fighterAt(190, 172)).toBe(poseRed(PLAYER_PROFILE.frames.magic))
    expect(sfx.plays).toEqual(['sound.pal.009'])
    // 出手姿保留两拍，投掷脚本开始 OffMagic 后再停一拍（fight.c:4355–4356,2659）。
    h.idle(119)
    draw()
    expect(fighterAt(190, 172)).toBe(poseRed(PLAYER_PROFILE.frames.magic))
    expect(sfx.plays).toEqual(['sound.pal.009'])
    h.idle(1)
    expect(sfx.plays).toEqual(['sound.pal.009', 'sound.pal.347'])
    h.idle(50) // 最后一张特效退场后，结算数字立即实绘。
    draw()
    expect([88, 94, 100].map((x) => ctx.getImageData(x, 10, 1, 1).data[2])).toEqual([32, 160, 144])
    expect([poseRed(0), poseRed(1)]).toContain(fighterAt(100, 110))
    // fight.c:4369–4372。数字后先保持出手姿四拍，再恢复濒死姿四拍。
    h.idle(159)
    draw()
    expect(fighterAt(190, 172)).toBe(poseRed(PLAYER_PROFILE.frames.magic))
    h.idle(1)
    draw()
    expect(fighterAt(200, 176)).toBe(poseRed(PLAYER_PROFILE.frames.dying))
    h.idle(160)
    h.idle(39)
    draw()
    expect(fighterAt(256, 152)).toBe(poseRed(PLAYER_PROFILE.frames.idle))
    h.idle(1)
    draw()
    expect(fighterAt(256, 152)).toBe(poseRed(PLAYER_PROFILE.frames.attackWindup))
    const inventory = [{ itemId: item.id, count: 1 }]
    h.session.writeBackInventory(inventory)
    expect(inventory).toEqual([])
  })
})
