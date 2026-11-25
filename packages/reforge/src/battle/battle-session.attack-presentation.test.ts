// @vitest-environment jsdom
import {
  buildWorld,
  effectiveBattleSpriteId,
  equipItem,
  validateActors,
  validateBattleSprites,
  validateEnemies,
  validateItems,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import palActors from '../../../../projects/pal/content/actors.json' with { type: 'json' }
import palBattleSprites from '../../../../projects/pal/content/battle-sprites.json' with {
  type: 'json',
}
import palEnemies from '../../../../projects/pal/content/enemies.json' with { type: 'json' }
import palItems from '../../../../projects/pal/content/items.json' with { type: 'json' }
import {
  enemyProfile,
  PLAYER_PROFILE,
  wfEnemy,
  wfPlayer,
} from '../__tests__/battle-workflows/catalog.js'
import { fixedRng, recordingSfx, stubGlyphs } from '../__tests__/battle-workflows/controlled-io.js'
import {
  battleCanvas,
  bitmap,
  infoBoxAssets,
  posePalette,
  poseRed,
  poseSprite,
} from '../__tests__/battle-workflows/render-io.js'
import {
  flush,
  makeWfSession,
  settleDone,
  wfLoadedBattleSprite,
} from '../__tests__/battle-workflows/session-driver.js'
import { expectDefined } from '../defined.js'
import { DialogBox } from '../dialog/dialog-box.js'
import { createBattlePlayers } from './battle-player-input.js'
import { BattleSession } from './battle-session.js'

describe('物理命中、防御和伤亡演出', () => {
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

  test.each([
    {
      firstCrit: false,
      voices: ['038', '006'],
      numbers: [
        [32, 64, 128],
        [80, 32, 32],
      ],
    },
    {
      firstCrit: true,
      voices: ['006', '038'],
      numbers: [
        [80, 32, 32],
        [32, 64, 128],
      ],
    },
  ])('单体双击首击会心=$firstCrit，每击独立发声，第二击沿用击退后的目标底锚', ({
    firstCrit,
    voices,
    numbers,
  }) => {
    const enemy = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-507'))
    const playerSprite = poseSprite(wfLoadedBattleSprite('battle-sprite.player', PLAYER_PROFILE))
    const enemySprite = wfLoadedBattleSprite(enemy.battleSprite, enemyProfile(enemy.battleSprite))
    validateBattleSprites([playerSprite.definition, enemySprite.definition])
    const sfx = recordingSfx()
    const session = new BattleSession(
      [
        wfPlayer('zhao-linger', {
          attackStrength: 258,
          baseDexterity: 900,
          grantedStatuses: ['dualAttack'], // 初始武器仙女剑170。
        }),
      ],
      [enemy],
      {
        palette: posePalette,
        glyphs: stubGlyphs,
        battleSprites: new Map([
          [playerSprite.definition.id, playerSprite],
          [enemySprite.definition.id, enemySprite],
        ]),
        playerBaseDefinitionIds: [playerSprite.definition.id],
        sfx: sfx.player,
        ui: {
          ...infoBoxAssets(),
          numsBlue: Array.from({ length: 10 }, (_, digit) =>
            bitmap(6, 8, `rgb(0,0,${(digit + 1) * 16})`),
          ),
        },
      },
      (id) => id,
      fixedRng([0.5, 0.5, 0.25, firstCrit ? 0.05 : 0.5, 0, 0.25, firstCrit ? 0.5 : 0.05, 0]),
      {
        playerSounds: [
          { attack: 'sound.pal.038', critical: 'sound.pal.006', weapon: 'sound.pal.002' },
        ],
      },
    )
    const ctx = battleCanvas()
    const firstFrames: Array<{ enemy: number; digits: number[] }> = []
    session.tick(16, new Set([' ']))
    session.tick(16, new Set([' ']))
    for (let i = 0; i < 100 && firstFrames.length < 2; i++) {
      const soundsBefore = sfx.plays.length
      session.tick(8, new Set())
      if (sfx.plays.length === soundsBefore || sfx.plays.at(-1) !== 'sound.pal.002') continue
      session.render(ctx, 1)
      const [x, y] = firstFrames.length === 0 ? [100, 109] : [94, 106]
      firstFrames.push({
        enemy: ctx.getImageData(x, y, 1, 1).data[0] ?? 0,
        digits: [x - 12, x - 6, x].map((digitX) => ctx.getImageData(digitX, 10, 1, 1).data[2] ?? 0),
      })
    }

    // DEF 152、物抗2、+1、浮动倍率1 → 137，会心 → 411。第二击目标仍在首击偏移处。
    expect({ sounds: sfx.plays, firstFrames }).toEqual({
      sounds: voices.flatMap((voice) => [`sound.pal.${voice}`, 'sound.pal.002']),
      firstFrames: numbers.map((digits) => ({ enemy: poseRed(6), digits })),
    })
  })

  test('玄冥宝刀一次确认后两挥均把命中特效画在两个敌槽底锚', () => {
    const actor = expectDefined(validateActors(palActors.filter(({ id }) => id === 'anu'))[0])
    const actorsById = { [actor.id]: actor }
    const start = buildWorld(
      { party: [actor.id], money: 0, inventory: [{ itemId: '187', count: 1 }] },
      actorsById,
    )
    const member = expectDefined(start.party[0])
    const itemIds = ['187', ...Object.values(member.equipment)]
    const items = Object.fromEntries(
      validateItems(palItems.filter(({ id }) => itemIds.includes(id))).map((item) => [
        item.id,
        item,
      ]),
    )
    const world = equipItem(start, member.id, '187', items)
    const appearanceId = expectDefined(
      effectiveBattleSpriteId(expectDefined(world.party[0]), actor, items),
    )
    const appearance = expectDefined(
      validateBattleSprites(palBattleSprites.filter(({ id }) => id === appearanceId))[0],
    )
    const fighter = {
      ...wfLoadedBattleSprite(appearance.id, PLAYER_PROFILE),
      definition: appearance,
    }
    const enemy = expectDefined(
      validateEnemies(palEnemies.filter(({ id }) => id === 'enemy-444'))[0],
    )
    const enemySprite = wfLoadedBattleSprite(enemy.battleSprite, enemyProfile(enemy.battleSprite))
    const sfx = recordingSfx()
    const sounds = expectDefined(actor.battler?.sounds)
    const weaponSound = expectDefined(sounds.weapon)
    const session = new BattleSession(
      createBattlePlayers(world, { actorsById, items }),
      [enemy, enemy],
      {
        palette: posePalette,
        glyphs: stubGlyphs,
        battleSprites: new Map([
          [appearance.id, fighter],
          [enemy.battleSprite, enemySprite],
        ]),
        playerBaseDefinitionIds: [appearance.id],
        sfx: sfx.player,
        effectSprite: {
          anchorX: 0,
          anchorY: 1,
          frames: fighter.sprite.frames.slice(0, 3).map((frame, index) => ({
            ...frame,
            pixels: new Uint8Array([index + 13]),
          })),
        },
      },
      (id) => id,
      fixedRng([0.5]),
      { playerSounds: [sounds] },
    )
    const ctx = battleCanvas()
    const impactPixels: number[][] = []
    session.tick(16, new Set([' ']))
    for (let i = 0; i < 140 && impactPixels.length < 2; i++) {
      const soundsBefore = sfx.plays.length
      session.tick(8, new Set())
      if (!sfx.plays.slice(soundsBefore).includes(weaponSound)) continue
      session.render(ctx, 1)
      // ENEMYPOS 双槽 (70,130)/(140,106)，一像素底中锚各向上 1。
      impactPixels.push([
        ctx.getImageData(70, 129, 1, 1).data[0] ?? 0,
        ctx.getImageData(140, 105, 1, 1).data[0] ?? 0,
      ])
    }
    expect(impactPixels).toEqual([
      [208, 208],
      [208, 208],
    ])
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
    // Start on a complete battle beat before measuring the relative attack frames.
    session.tick(40, new Set(['d']))
    for (let i = 0; i < 60 && sfx.plays.length === 0; i++) tick(40)
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

  test('队友阵亡对白在回位和十帧停拍后开始，旁白结束才结算回血和增益', () => {
    const lantern = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-399'))
    const actors = validateActors(
      palActors.filter(({ id }) => id === 'zhao-linger' || id === 'li-xiaoyao'),
    )
    const h = makeWfSession({
      players: [
        wfPlayer('zhao-linger', {
          hp: 3,
          maxHp: 24,
          defense: 13,
          baseDexterity: 6,
          coveredBy: 'li-xiaoyao',
        }),
        wfPlayer('li-xiaoyao', { hp: 100, maxHp: 150, attackStrength: 902, baseDexterity: 3 }),
      ],
      enemies: [lantern],
      extraOpts: {
        actorsById: Object.fromEntries(actors.map((actor) => [actor.id, actor])),
      },
    })
    const ctx = battleCanvas()
    const portrait = bitmap(8, 8, '#00ff00')
    const box = new DialogBox(ctx, stubGlyphs, [], new Map([['portrait.pal.005', portrait]]))
    h.assets.dialogBox = box
    const spriteId = expectDefined(h.assets.playerBaseDefinitionIds[0])
    const sprite = expectDefined(h.assets.battleSprites.get(spriteId))
    h.assets.battleSprites = new Map(h.assets.battleSprites).set(spriteId, poseSprite(sprite))
    h.assets.palette = posePalette
    const draw = (dtMs: number) => {
      h.idle(dtMs)
      h.session.render(ctx, 1)
    }
    const deadPose = () =>
      ctx.getImageData(200, 168, 1, 1).data[0] === poseRed(PLAYER_PROFILE.frames.dead)

    h.press(['d'])
    h.press([' '])
    h.press([' '])
    for (let i = 0; i < 160 && !deadPose() && !box.active; i += 1) draw(8)
    expect(h.session.debugPlayers()[0]?.hp).toBe(0)
    expect(box.active).toBe(false)
    expect(deadPose()).toBe(true)
    expect(h.session.debugPlayers()[1]?.hp).toBe(100)
    draw(200) // 播完正常的回位帧。
    draw(399)
    expect(box.active).toBe(false)
    draw(1)
    expect(box.observe()).toMatchObject({ slot: 'bottom', rowTextIds: ['dlg.13499'] })
    expect(box.observeSlots()).toContainEqual(
      expect.objectContaining({ active: true, portraitAsset: 'portrait.pal.005' }),
    )
    expect(h.session.debugPlayers()[1]?.hp).toBe(100)

    draw(2000)
    expect(box.observe()).toMatchObject({ slot: 'narration', rowTextIds: ['dlg.13500'] })
    expect(box.observeSlots()).toContainEqual(
      expect.objectContaining({ slot: 'narration', visibleText: null }),
    )
    h.idle(200)
    draw(0)
    expect(box.observeSlots()).toContainEqual(
      expect.objectContaining({ slot: 'narration', visibleText: expect.any(String) }),
    )
    draw(1399)
    expect(box.active).toBe(true)
    expect(h.session.debugPlayers()[1]?.hp).toBe(100)
    draw(1)
    expect(box.active).toBe(false)
    draw(40)
    expect(h.session.debugPlayers()[1]?.hp).toBe(150)
    draw(40)
    draw(40)
    // 攻击 902 + 5% = 947，灯笼有效防御 28、物抗 2，固定骰首击 (924+1)×3×2。
    expect(h.session.debugLog()).toContain('li-xiaoyao 会心一击 攻击 enemy-399 造成 5550')
  })
})
