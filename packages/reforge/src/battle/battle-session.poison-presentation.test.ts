// @vitest-environment jsdom
import type { BattleChoreography } from '@type-pal/content'
import {
  checkBattleChoreography,
  validateActors,
  validateEnemies,
  validateItems,
  validatePoisons,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import standardPalette from '../../../../projects/pal/assets/migrated/colors/project-standard.json' with {
  type: 'json',
}
import palActors from '../../../../projects/pal/content/actors.json' with { type: 'json' }
import palEnemies from '../../../../projects/pal/content/enemies.json' with { type: 'json' }
import palItems from '../../../../projects/pal/content/items.json' with { type: 'json' }
import palPoisons from '../../../../projects/pal/content/poisons.json' with { type: 'json' }
import {
  PLAYER_PROFILE,
  wfEnemy,
  wfHealItem,
  wfPlayer,
} from '../__tests__/battle-workflows/catalog.js'
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
import type { CreatePlayerInput } from './battle-core.js'

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

describe('附毒、毒发和头像反馈', () => {
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
