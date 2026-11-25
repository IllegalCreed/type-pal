// @vitest-environment jsdom
import { validateBattleSprites, validateEnemies, validateSkills } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import palBattleSprites from '../../../../projects/pal/content/battle-sprites.json' with {
  type: 'json',
}
import palEnemies from '../../../../projects/pal/content/enemies.json' with { type: 'json' }
import palSkills from '../../../../projects/pal/content/skills.json' with { type: 'json' }
import {
  enemyProfile,
  PLAYER_PROFILE,
  wfEnemy,
  wfPlayer,
  wfSkill,
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
  makeWfSession,
  settleDone,
  wfLoadedBattleSprite,
} from '../__tests__/battle-workflows/session-driver.js'
import { expectDefined } from '../defined.js'
import { DialogBox } from '../dialog/dialog-box.js'
import { BattleSession } from './battle-session.js'

describe('法术施展与受术画面', () => {
  test('梦蛇前移保留濒死姿态，闪色后整幅画面溶到原站位的施法姿态', () => {
    const spell = expectDefined(validateSkills(palSkills).skills.find(({ id }) => id === '295'))
    const form = expectDefined(
      validateBattleSprites(palBattleSprites).find(({ id }) => id === 'player-fighter-5'),
    )
    if (form.profile.kind !== 'player-fighter') throw new Error('梦蛇精灵缺战斗姿态')
    const h = makeWfSession({
      players: [
        wfPlayer('zhao-linger', {
          hp: 15,
          mp: 100,
          maxMp: 100,
          baseDexterity: 500,
          skills: [spell.id],
        }),
      ],
      enemies: [wfEnemy('trance-control', { attackStrength: 0 })],
      extraOpts: { skills: { [spell.id]: spell }, playerSounds: [{ magic: 'sound.pal.010' }] },
    })
    const baseId = expectDefined(h.assets.playerBaseDefinitionIds[0])
    const base = poseSprite(expectDefined(h.assets.battleSprites.get(baseId)))
    const trance = poseSprite({
      ...wfLoadedBattleSprite(form.id, PLAYER_PROFILE),
      definition: form,
    })
    for (const frame of trance.sprite.frames)
      frame.pixels[0] = expectDefined(frame.pixels[0]) + 0x30
    h.assets.battleSprites = new Map(h.assets.battleSprites).set(baseId, base).set(form.id, trance)
    h.assets.palette = {
      colors: Array.from({ length: 256 }, (_, index): [number, number, number] => [index, 0, 0]),
      cycles: [],
    }
    const sfx = recordingSfx()
    h.assets.sfx = sfx.player
    const ctx = battleCanvas()
    const pixel = (x: number, y: number) => expectDefined(ctx.getImageData(x, y, 1, 1).data[0])
    const draw = () => h.session.render(ctx, 1)
    h.press(['ArrowLeft'])
    h.press([' '])
    h.press([' '])
    for (let i = 0; i < 120; i++) {
      h.idle(8)
      draw()
      if (pixel(236, 160) > 0) break
    }
    expect([pixel(236, 160), pixel(240, 162)]).toEqual([0x02, 0])
    expect(sfx.plays).toEqual([])

    for (let i = 0; i < 40 && !sfx.plays.length; i++) h.idle(8)
    draw()
    expect(sfx.plays).toEqual(['sound.pal.010'])
    expect(pixel(230, 158)).toBe(0x06)

    // 该局不加载起手特效，施法姿势与等待各一拍，再闪色六拍。
    h.idle(312)
    draw()
    expect([pixel(230, 158), pixel(240, 162)]).toEqual([0x0f, 0])

    h.idle(88)
    draw()
    // 六相位首次换入新色系，旧图在施法站位留下亮度轮廓。
    expect([pixel(230, 158), pixel(240, 162)]).toEqual([0x0f, 0x30])

    h.idle(1056)
    draw()
    expect([pixel(230, 158), pixel(240, 162)]).toEqual([0, 0x36])
    h.idle(16)
    draw()
    expect(pixel(240, 162)).toBe(0x32)
    expect(h.readParty()[0]?.mp).toBe(1)
  })

  test('半人树妖回梦用攻击帧施法，保持前移位置到受击收尾', () => {
    const enemy = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-507'))
    const skill = expectDefined(validateSkills(palSkills).skills.find(({ id }) => id === '303'))
    const definition = expectDefined(
      validateBattleSprites(palBattleSprites).find(({ id }) => id === enemy.battleSprite),
    )
    const profile = definition.profile
    if (profile.kind !== 'enemy') throw new Error('半人树妖的战斗资源必须是敌人精灵')
    const enemySprite = poseSprite(wfLoadedBattleSprite(enemy.battleSprite, profile))
    const playerSprite = poseSprite(wfLoadedBattleSprite('battle-sprite.player', PLAYER_PROFILE))
    const sfx = recordingSfx()
    const session = new BattleSession(
      [wfPlayer('li-xiaoyao', { baseDexterity: 0 })],
      [enemy],
      {
        palette: posePalette,
        glyphs: stubGlyphs,
        battleSprites: new Map([
          [playerSprite.definition.id, playerSprite],
          [enemySprite.definition.id, enemySprite],
        ]),
        playerBaseDefinitionIds: [playerSprite.definition.id],
        fireSprites: {
          [skill.animation.effectSprite]: {
            ...playerSprite.sprite,
            frames: [expectDefined(playerSprite.sprite.frames[8])],
          },
        },
        sfx: sfx.player,
      },
      (id) => id,
      fixedRng(),
      { skills: { [skill.id]: skill } },
    )
    const ctx = battleCanvas()
    const red = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[0]
    const draw = (dtMs: number) => {
      session.tick(dtMs, new Set())
      session.render(ctx, 1)
    }
    const casting = () => session.debugLog().some((line) => line.includes('施展 回梦'))
    session.tick(16, new Set(['d']))
    for (let i = 0; i < 100 && !casting(); i++) draw(4)
    expect(casting()).toBe(true)

    // fight.c:4683–4717，两个移动拍、一个空施法拍、两张动作帧各占两个拍。
    expect(red(112, 108)).toBe(poseRed(0))
    draw(40)
    expect(red(116, 110)).toBe(poseRed(0))
    draw(159)
    expect(red(116, 110)).toBe(poseRed(0))
    draw(1)
    expect(red(116, 110)).toBe(poseRed(1))
    draw(79)
    expect(red(240, 166)).toBe(0)
    expect(sfx.plays).toEqual([])
    draw(1)
    expect(red(240, 166)).toBe(poseRed(8))
    expect(red(116, 110)).toBe(poseRed(1))
    expect(sfx.plays).toEqual(['sound.pal.169'])
    draw(269)
    expect(red(116, 110)).toBe(poseRed(1))
    draw(1)
    expect(red(100, 102)).toBe(poseRed(0))
    expect(red(116, 110)).toBe(0)
  })

  test.each([
    'timeout',
    'arrow',
  ] as const)('鬼降失败在归位后显示卷轴，%s 清除后恢复战斗', (dismissal) => {
    const skill = expectDefined(validateSkills(palSkills).skills.find(({ id }) => id === '305'))
    const enemy = wfEnemy(
      'hex-caster',
      { dexterity: 0 },
      {
        ai: {
          resistanceToSorcery: 0,
          rules: [{ at: 'act', do: { kind: 'cast', skillId: skill.id } }],
        },
      },
    )
    const playerSprite = poseSprite(wfLoadedBattleSprite('battle-sprite.player', PLAYER_PROFILE))
    const enemySprite = poseSprite(
      wfLoadedBattleSprite(enemy.battleSprite, enemyProfile(enemy.battleSprite)),
    )
    const ctx = battleCanvas()
    const glyph = { width: 16, height: 16, bitmap: Uint8Array.of(0x80, ...Array(31).fill(0)) }
    const glyphs = { has: () => true, get: () => glyph }
    const scroll = { tiles: Array.from({ length: 9 }, () => bitmap(8, 8, '#00ff00')) }
    const box = new DialogBox(ctx, glyphs, [], new Map(), {}, scroll)
    const session = new BattleSession(
      [wfPlayer('li-xiaoyao')],
      [enemy],
      {
        palette: posePalette,
        glyphs,
        dialogBox: box,
        battleSprites: new Map([
          [playerSprite.definition.id, playerSprite],
          [enemySprite.definition.id, enemySprite],
        ]),
        playerBaseDefinitionIds: [playerSprite.definition.id],
        fireSprites: {
          [skill.animation.effectSprite]: {
            ...playerSprite.sprite,
            frames: [expectDefined(playerSprite.sprite.frames[8])],
          },
        },
      },
      (id) => id,
      fixedRng([0.99]),
      { skills: { [skill.id]: skill } },
    )
    const draw = (dtMs: number, keys: string[] = []) => {
      session.tick(dtMs, new Set(keys))
      session.render(ctx, 1)
    }
    const pixel = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data

    draw(16, ['d'])
    for (let i = 0; i < 100 && !box.active; i++) draw(16)
    expect(session.debugLog()).toContain('鬼降 无任何效果')
    expect(box.observe()).toMatchObject({ slot: 'narration', pageText: '失败　没有效果' })
    expect(pixel(110, 40)[1]).toBe(255)
    expect(pixel(100, 102)[0]).toBeGreaterThan(0)
    expect(pixel(116, 110)[0]).toBe(0)
    expect(session.debugPlayers()[0]).toMatchObject({ hp: 100, status: { confused: 0 } })

    draw(dismissal === 'timeout' ? 1399 : 300)
    expect(pixel(110, 40)[1]).toBe(255)
    draw(1, dismissal === 'arrow' ? ['ArrowRight'] : [])
    expect(pixel(110, 40)[1]).toBe(0)
    expect(box.active).toBe(false)
    draw(319)
    expect(session.debugReadiness().phase).toBe('acting')
    for (let i = 0; i < 20 && session.debugReadiness().phase === 'acting'; i++) draw(40)
    expect(session.debugReadiness().phase).toBe('menu')
  })

  test('敌方单体封咒无 FIRE 资源且不扣血，目标仍播放五拍受击', () => {
    const spell = {
      ...wfSkill('wf-silence', 0),
      effects: [{ kind: 'applyStatus' as const, status: 'silence' as const, turns: 2 }],
      animation: { effectSprite: 1, fireDelay: 1 },
    }
    const enemy = wfEnemy(
      'wf-silencer',
      { dexterity: 0 },
      {
        ai: {
          resistanceToSorcery: 0,
          rules: [{ at: 'act', do: { kind: 'cast', skillId: spell.id } }],
        },
      },
    )
    const h = makeWfSession({
      players: [wfPlayer('p1', { baseDexterity: 0 })],
      enemies: [enemy],
      extraOpts: { skills: { [spell.id]: spell } },
    })
    const playerSpriteId = expectDefined(h.assets.playerBaseDefinitionIds[0])
    const casterSprite = expectDefined(h.assets.battleSprites.get(enemy.battleSprite))
    const playerSprite = expectDefined(h.assets.battleSprites.get(playerSpriteId))
    h.assets.palette = posePalette
    h.assets.battleSprites = new Map([
      [playerSpriteId, poseSprite(playerSprite)],
      [enemy.battleSprite, poseSprite(casterSprite)],
    ])
    const ctx = battleCanvas()
    const red = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[0]
    const draw = (dtMs: number) => {
      h.idle(dtMs)
      h.session.render(ctx, 1)
    }
    h.press(['d'])
    const castResolved = () =>
      h.session.debugLog().includes('wf-silencer 对 p1 施加 silence 2 回合')
    for (let i = 0; i < 100 && !castResolved(); i++) draw(4)
    expect(castResolved()).toBe(true)
    expect(h.readParty()[0]?.hp).toBe(100)

    draw(120)
    expect(red(240, 162)).toBe(poseRed(PLAYER_PROFILE.frames.hurt + 6))
    draw(199)
    expect(red(247, 165)).toBe(poseRed(PLAYER_PROFILE.frames.hurt))
    draw(1)
    expect(red(100, 102)).toBe(poseRed(0))
  })

  test('敌方群体仙术的两个受击队员各按原站位显示姿态和伤害数字', () => {
    const spell = {
      ...wfSkill('wf-gust', 0),
      target: 'allEnemies' as const,
      animation: { effectSprite: 1, placement: 'attackAll' as const },
    }
    const enemy = wfEnemy(
      'wf-gust-caster',
      { magicStrength: 18 },
      {
        ai: {
          resistanceToSorcery: 0,
          rules: [{ at: 'act', do: { kind: 'cast', skillId: spell.id } }],
        },
      },
    )
    const h = makeWfSession({
      players: [
        wfPlayer('p1', { defense: 0, baseDexterity: 0 }),
        wfPlayer('p2', { defense: 50, baseDexterity: 0 }),
      ],
      enemies: [enemy],
      extraOpts: { skills: { [spell.id]: spell } },
    })
    h.assets.palette = posePalette
    const playerSpriteId = expectDefined(h.assets.playerBaseDefinitionIds[0])
    const sprite = poseSprite(expectDefined(h.assets.battleSprites.get(playerSpriteId)))
    h.assets.battleSprites = new Map(h.assets.battleSprites).set(playerSpriteId, sprite)
    h.assets.fireSprites = {
      [spell.animation.effectSprite]: {
        ...sprite.sprite,
        frames: [expectDefined(sprite.sprite.frames[8])],
      },
    }
    h.assets.ui = {
      ...infoBoxAssets(),
      numsBlue: Array.from({ length: 10 }, (_, digit) =>
        bitmap(6, 8, `rgb(0,0,${(digit + 1) * 16})`),
      ),
    }
    const ctx = battleCanvas()
    const pixel = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data
    const draw = (dtMs: number) => {
      h.idle(dtMs)
      h.session.render(ctx, 1)
    }

    h.press(['d'])
    h.press(['d'])
    for (let i = 0; i < 100 && pixel(180, 172)[0] !== poseRed(8); i++) draw(4)
    expect(pixel(180, 172)[0]).toBe(poseRed(8))
    expect([pixel(200, 101)[2], pixel(256, 77)[2]]).toEqual([0, 0])

    // battle.c 双人底锚 (200,176)/(256,152)；fight.c 首拍原位，后拍各自击退。
    draw(50)
    const hurt = poseRed(PLAYER_PROFILE.frames.hurt + 6)
    expect([pixel(200, 168)[0], pixel(256, 144)[0]]).toEqual([hurt, hurt])
    // 原盘公式：灵力 60、防御 0/50、威力 20、被动格挡除 2，分别扣 25/15。
    expect(h.readParty().map(({ hp }) => hp)).toEqual([75, 85])
    expect([pixel(194, 101)[2], pixel(200, 101)[2]]).toEqual([48, 96])
    expect([pixel(250, 77)[2], pixel(256, 77)[2]]).toEqual([32, 96])
    draw(40)
    expect([pixel(204, 170)[0], pixel(260, 146)[0]]).toEqual([hurt, hurt])
    expect([pixel(194, 100)[2], pixel(250, 76)[2]]).toEqual([48, 32])
  })

  test.each([
    { skillId: '303', failure: '攻击无效' },
    { skillId: '327', failure: null },
  ])('对敌仙术 $skillId 的特效消失后保留施法姿九拍，再允许敌人起手', ({ skillId, failure }) => {
    const spell = expectDefined(validateSkills(palSkills).skills.find(({ id }) => id === skillId))
    const sfx = recordingSfx()
    const h = makeWfSession({
      players: [
        wfPlayer('zhao-linger', {
          baseDexterity: 900,
          magicStrength: 208,
          skills: [spell.id],
        }),
        wfPlayer('li-xiaoyao', { baseDexterity: 500 }),
      ],
      enemies: [
        wfEnemy(
          'spell-target',
          {
            health: 310,
            level: 12,
            elemResistance: { wind: 0, thunder: 0, water: 0, fire: 5, earth: 0 },
          },
          { ai: { resistanceToSorcery: 10 } },
        ),
      ],
      extraOpts: {
        skills: { [spell.id]: spell },
        fieldEffect: { wind: 0, thunder: 0, water: 0, fire: 1, earth: 0 },
        playerSounds: [{ magic: 'sound.pal.010' }],
      },
    })
    h.assets.sfx = sfx.player
    h.assets.palette = posePalette
    const spriteId = expectDefined(h.assets.playerBaseDefinitionIds[0])
    const sprite = poseSprite(expectDefined(h.assets.battleSprites.get(spriteId)))
    h.assets.battleSprites = new Map(h.assets.battleSprites).set(spriteId, sprite)
    h.assets.fireSprites = {
      [spell.animation.effectSprite]: {
        ...sprite.sprite,
        frames: [expectDefined(sprite.sprite.frames[8])],
      },
    }
    h.assets.ui = {
      ...infoBoxAssets(),
      numsBlue: Array.from({ length: 10 }, (_, digit) =>
        bitmap(6, 8, `rgb(0,0,${(digit + 1) * 16})`),
      ),
    }
    const bg = battleCanvas()
    bg.fillStyle = '#000000'
    bg.fillRect(0, 0, 320, 200)
    bg.fillStyle = '#00ff00'
    bg.fillRect(20, 0, 1, 200)
    h.assets.bg = bg.canvas

    const ctx = battleCanvas()
    const box = new DialogBox(ctx, stubGlyphs, [])
    h.assets.dialogBox = box
    const draw = (ms: number) => {
      h.idle(ms)
      h.session.render(ctx, 1)
    }
    const red = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[0]
    const greenRows = () =>
      ctx.getImageData(20, 0, 1, 32).data.filter((value, i) => i % 4 === 1 && value === 255).length
    const enemyStarted = () => sfx.plays.includes('sound.pal.355')

    h.press(['ArrowLeft'])
    h.press([' '])
    h.press([' '])
    h.press([' '])
    h.press(['d'])
    for (let i = 0; i < 100 && sfx.plays.length < 2; i++) h.idle(10)
    h.session.render(ctx, 1)
    expect(sfx.plays).toEqual(['sound.pal.010', spell.animation.sound])
    const effectY = failure ? 106 : 102
    expect(red(100, effectY)).toBe(poseRed(8))
    if (!failure) expect(greenRows()).toBeLessThan(32)

    draw(failure ? 70 : 50) // 单个 FIRE 测试帧的时长来自各自原盘 wSpeed。
    expect(red(100, effectY)).toBe(0)
    expect(red(190, 164)).toBe(poseRed(PLAYER_PROFILE.frames.magic))
    expect(box.active).toBe(false)
    expect(enemyStarted()).toBe(false)

    if (failure) {
      expect(red(100, 109)).toBeGreaterThan(0) // 无伤害时目标不抖动。
      draw(359)
    } else {
      // 灵力 208、有效防御 82、火抗 5、场地 +1，固定倍率 1：原盘伤害 155。
      expect([88, 94, 100].map((x) => ctx.getImageData(x, 10, 1, 1).data[2])).toEqual([32, 96, 96])
      expect(red(92, 109)).toBeGreaterThan(0) // 已受击退，数字仍按 (100,110) 的原底锚绘制。
      expect(greenRows()).toBe(32)
      for (const x of [96, 94, 100]) {
        draw(40)
        expect(red(x, 109)).toBeGreaterThan(0)
      }
      draw(239)
    }
    expect(red(190, 164)).toBe(poseRed(PLAYER_PROFILE.frames.magic))
    expect(box.active).toBe(false)
    expect(enemyStarted()).toBe(false)

    draw(1)
    expect(red(190, 164)).toBe(0)
    expect(red(200, 168)).toBe(poseRed(PLAYER_PROFILE.frames.idle))
    expect(box.observe()?.pageText ?? null).toBe(failure)
    if (failure) {
      draw(1399)
      expect(box.active).toBe(true)
      expect(enemyStarted()).toBe(false)
      draw(1)
      expect(box.active).toBe(false)
    }
    draw(39)
    expect(enemyStarted()).toBe(false)
    draw(1)
    expect(enemyStarted()).toBe(true)
  })

  test.each([
    { skillId: '306', all: false },
    { skillId: '300', all: true },
  ])('友方法术 $skillId 将特效与十三拍辉光实绘在受术队员身上', ({ skillId, all }) => {
    const spell = expectDefined(validateSkills(palSkills).skills.find(({ id }) => id === skillId))
    const sfx = recordingSfx()
    const h = makeWfSession({
      players: [
        wfPlayer('zhao-linger', {
          hp: 30,
          maxHp: 150,
          mp: 100,
          maxMp: 100,
          baseDexterity: 100,
          skills: [spell.id],
        }),
        wfPlayer('li-xiaoyao', { hp: 20, maxHp: 150, baseDexterity: 8 }),
      ],
      enemies: [wfEnemy('ally-spell-control', { attackStrength: 0 })],
      extraOpts: { skills: { [spell.id]: spell }, playerSounds: [{ magic: 'sound.pal.009' }] },
    })
    h.assets.sfx = sfx.player
    h.assets.palette = posePalette
    const spriteId = expectDefined(h.assets.playerBaseDefinitionIds[0])
    const sprite = poseSprite(expectDefined(h.assets.battleSprites.get(spriteId)))
    h.assets.battleSprites = new Map(h.assets.battleSprites).set(spriteId, sprite)
    h.assets.fireSprites = {
      [spell.animation.effectSprite]: {
        ...sprite.sprite,
        frames: [expectDefined(sprite.sprite.frames[8])],
      },
    }
    const ctx = battleCanvas()
    const pixel = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[0]
    const draw = () => h.session.render(ctx, 1)
    h.press(['ArrowLeft'])
    h.press([' '])
    h.press([' '])
    if (!all) {
      h.press(['ArrowRight'])
      h.press([' '])
    }
    h.press(['d'])
    for (let i = 0; i < 120 && !sfx.plays.length; i++) h.idle(8)
    draw()
    expect(sfx.plays).toEqual(['sound.pal.009'])
    expect(pixel(190, 164)).toBe(poseRed(PLAYER_PROFILE.frames.preMagic))

    h.idle(80) // 无前摇精灵时，仅两拍施法姿，再转施法帧6。
    draw()
    expect(pixel(190, 164)).toBe(poseRed(PLAYER_PROFILE.frames.magic))
    expect(sfx.plays).toEqual(['sound.pal.009'])
    h.idle(40)
    draw()
    // 友方底锚 (256,152) + (-6,-18)；全队法术也覆盖已前移的施法者。
    expect(pixel(250, 126)).toBe(poseRed(8))
    expect(pixel(184, 146)).toBe(all ? poseRed(8) : 0)
    expect(pixel(194, 150)).toBe(0)
    expect(sfx.plays).toEqual(['sound.pal.009', spell.animation.sound])

    h.idle(40)
    const glow = [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0]
    for (const shift of glow) {
      draw()
      expect(pixel(256, 144)).toBe(poseRed(PLAYER_PROFILE.frames.dying + shift))
      expect(pixel(190, 164)).toBe(poseRed(PLAYER_PROFILE.frames.magic + (all ? shift : 0)))
      h.idle(40)
    }
    draw()
    expect(pixel(200, 168)).toBe(poseRed(PLAYER_PROFILE.frames.idle))
    expect(pixel(256, 144)).toBe(
      poseRed(all ? PLAYER_PROFILE.frames.idle : PLAYER_PROFILE.frames.dying),
    )
    expect(h.readParty()[0]?.mp).toBe(100 - expectDefined(spell.cost.mp))
  })

  test('爆炸合击实绘敌方伤害，队员扣除生命但不显示伤害数字', () => {
    const enemy = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-406'))
    const skill = expectDefined(validateSkills(palSkills).skills.find(({ id }) => id === '381'))
    const h = makeWfSession({
      players: [
        wfPlayer('zhao-linger', {
          hp: 150,
          maxHp: 150,
          attackStrength: 8,
          magicStrength: 208,
          baseDexterity: 906,
          cooperativeMagicSkillId: skill.id,
        }),
        wfPlayer('anu', {
          hp: 150,
          maxHp: 150,
          attackStrength: 300,
          magicStrength: 112,
          baseDexterity: 150,
        }),
      ],
      enemies: [enemy],
      extraOpts: {
        skills: { [skill.id]: skill },
        fieldEffect: { wind: -3, thunder: -2, water: 0, fire: 1, earth: 0 },
      },
    })
    h.assets.ui = {
      ...infoBoxAssets(),
      numsBlue: Array.from({ length: 10 }, (_, digit) =>
        bitmap(6, 8, `rgb(0,0,${(digit + 1) * 16})`),
      ),
    }
    const ctx = battleCanvas()
    const blue = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[2]
    h.press(['ArrowRight'])
    h.press([' '])
    h.press([' '])
    for (let i = 0; i < 100; i++) {
      h.idle()
      h.session.render(ctx, 1)
      if (blue(92, 10)) break
    }
    // 固定倍率 1，合击灵力 157、有效防御 82、火抗 5、战场 +1，伤害 159。
    // 受击首拍向左移 8px，数字仍以受击前的坐标为锚点。
    expect([88, 94, 100].map((x) => blue(x, 10))).toEqual([32, 96, 160])
    expect(blue(80, 10)).toBe(0)
    // 合击时队员暂在 (208,157) 与 (234,170)，两处不应绘出生命代价。
    expect([blue(208, 82), blue(234, 95)]).toEqual([0, 0])
    expect(h.readParty().map(({ hp }) => hp)).toEqual([140, 140])
  })

  test('御蜂术击杀三只血口虫时，三个槽位绘出完整法术伤害', async () => {
    const enemy = expectDefined(validateEnemies(palEnemies).find(({ id }) => id === 'enemy-406'))
    const skill = expectDefined(validateSkills(palSkills).skills.find(({ id }) => id === '353'))
    const h = makeWfSession({
      players: [
        wfPlayer('anu', {
          mp: 100,
          maxMp: 100,
          magicStrength: 112,
          baseDexterity: 900,
          skills: [skill.id],
        }),
      ],
      enemies: [enemy, enemy, enemy],
      extraOpts: { skills: { [skill.id]: skill } },
    })
    h.assets.ui = {
      ...infoBoxAssets(),
      numsBlue: Array.from({ length: 10 }, (_, digit) =>
        bitmap(6, 8, `rgb(0,0,${(digit + 1) * 16})`),
      ),
    }
    const ctx = battleCanvas()
    h.press(['ArrowLeft'])
    h.press([' '])
    h.press([' ']) // 群体技能无需选择单独目标。

    let firstNumbers: number[][] = []
    for (let i = 0; i < 80; i++) {
      h.idle()
      h.session.render(ctx, 1)
      // 三敌的底锚分别是 (70,140)、(100,110)、(160,100)，数字距底锚 115 像素。
      const numberPositions = [
        [70, 25],
        [100, 10],
        [160, 10],
      ] as const
      const blue = numberPositions.map(([x, y]) =>
        [x - 12, x - 6, x].map((digitX) => ctx.getImageData(digitX, y, 1, 1).data[2] ?? 0),
      )
      if (blue.some((digits) => digits.some((value) => value > 0))) {
        firstNumbers = blue
        break
      }
    }
    // 灵力 112、敌防 82、基础伤 150、毒抗 0、浮动倍率 1 → 346；每只敌人仅剩 310 HP。
    expect(firstNumbers).toEqual([
      [64, 80, 112],
      [64, 80, 112],
      [64, 80, 112],
    ])
    for (let i = 0; i < 8 && h.session.debugReadiness().phase !== 'over'; i++) h.idle(500)
    await expect(settleDone(h)).resolves.toBe('victory')
    expect(h.readParty()[0]?.mp).toBe(82)
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
})
