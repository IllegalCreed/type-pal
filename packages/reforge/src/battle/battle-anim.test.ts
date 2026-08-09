import type { EnemyBattleSpriteProfile, PlayerFighterFrames } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  type AnimFrame,
  AnimPlayer,
  buildEnemyCast,
  buildEnemyDivide,
  buildEnemyEscape,
  buildEnemyMateAttack,
  buildEnemyPhysical,
  buildEnemyTransform,
  buildFleeFail,
  buildMateAttack,
  buildOffMagic,
  buildPartyFlee,
  buildPlayerAttack,
  buildPlayerCast,
  buildPlayerScriptCastEffect,
  buildPlayerTrance,
  buildSteal,
  buildThrowItem,
  buildUseItem,
} from './battle-anim.js'

const PLAYER_FRAMES: PlayerFighterFrames = {
  idle: 0,
  dying: 1,
  dead: 2,
  defend: 3,
  hurt: 4,
  preMagic: 5,
  magic: 6,
  attackWindup: 7,
  attackRush: 8,
  attackStrike: 9,
  steal: 10,
}

function enemyProfile(
  idleFrames = 4,
  magicFrames = 0,
  attackFrames = 2,
  actTicksPerFrame = 1,
): EnemyBattleSpriteProfile {
  return {
    kind: 'enemy',
    idle: { start: 0, count: idleFrames },
    magic: { start: idleFrames, count: magicFrames },
    attack: { start: idleFrames + magicFrames, count: attackFrames },
    idleTicksPerFrame: 1,
    actTicksPerFrame,
  }
}

function record(frames: AnimFrame[]) {
  const events: string[] = []
  const player = new AnimPlayer(frames, {
    onSound: (id) => events.push(`snd:${id}`),
    onDamage: (t, v) => events.push(`dmg:${t.side}${t.idx}:${v}`),
    onFighter: (d) =>
      events.push(
        `f:${d.side}${d.idx}${d.frame !== undefined ? `#${d.frame}` : ''}${d.pos ? `@${d.pos.x},${d.pos.y}` : ''}${d.colorShift !== undefined ? `c${d.colorShift}` : ''}`,
      ),
    onBanner: (text, durMs) => events.push(`banner:${text}:${durMs}`),
  })
  return { events, player }
}

describe('M4d-2 战斗动画时间线', () => {
  test('R13-6B preShake 与 OffMagic 起手帧并发，末尾 shake 仍是独立时间点', () => {
    const frames = buildOffMagic({
      fireFrames: 3,
      fx: {
        placement: 'normal',
        xOffset: 0,
        yOffset: 0,
        speed: 0,
        fireDelay: 0,
        effectTimes: 1,
        shake: 1,
        preShake: { frames: 2, level: 3 },
        wave: 0,
      },
    })
    expect(frames.length).toBeGreaterThan(3)
    expect(frames[0]).toMatchObject({
      screenShake: true,
      screenShakeLevel: 3,
      overlays: [expect.objectContaining({ sheet: 'magic', frameIdx: 0 })],
    })
    expect(frames[1]).toMatchObject({ screenShake: true, screenShakeLevel: 3 })
    expect(frames[2]?.screenShakeLevel).toBeUndefined()
    expect(frames.at(-1)).toMatchObject({ screenShake: true })
    expect(frames.at(-1)?.screenShakeLevel).toBeUndefined()
  })

  test('玩家物攻:冲刺(+64,+20)→挥击9+敌染色+伤害数字→敌抖动(−8/−4/−6)', () => {
    const frames = buildPlayerAttack({
      frames: PLAYER_FRAMES,
      attackerIdx: 0,
      attackerPos: { x: 240, y: 170 },
      targetIdx: 1,
      targetPos: { x: 100, y: 100 },
      targetHeight: 60,
      effectFrameBase: 3,
      damage: 42,
      windup: true,
      sounds: { attack: 'sound.pal.037', weapon: 'sound.pal.001' },
    })
    const { events, player } = record(frames)
    let guard = 0
    while (!player.tick(50) && guard++ < 200) {}
    // 蓄力 7 → 冲刺 8 到 (164,120) → 挥击 9 + 染色 + 42 伤害
    expect(events).toContain('f:player0#7@240,170')
    expect(events).toContain('f:player0#8@164,120')
    expect(events).toContain('f:player0#9')
    expect(events).toContain('f:enemy1c6')
    expect(events).toContain('dmg:enemy1:42')
    // 抖动首帧 x=ex−8 且染色复位
    expect(events).toContain('f:enemy1@92,96c0')
    // 音效挂帧:出招音在冲刺帧(fight.c:2061)、兵器音在挥击帧(fight.c:2124)且序为 37→1
    expect(events).toContain('snd:sound.pal.037')
    expect(events).toContain('snd:sound.pal.001')
    expect(events.indexOf('snd:sound.pal.037')).toBeLessThan(events.indexOf('snd:sound.pal.001'))
    expect(events.indexOf('snd:sound.pal.001')).toBe(events.indexOf('f:player0#9') + 2) // 与挥击同帧(f→f→snd 派发序)
  })

  test('玩家施法:吟唱音挂 frame5 姿势帧(rgwMagicSound,非起手即播)', () => {
    const frames = buildPlayerCast({
      casterFrames: PLAYER_FRAMES,
      casterIdx: 0,
      casterPos: { x: 240, y: 170 },
      magicSound: 'sound.pal.009',
      castEffectBase: -1,
      fireFrames: 0,
      fx: {
        placement: 'normal',
        xOffset: 0,
        yOffset: 0,
        speed: 0,
        fireDelay: 0,
        effectTimes: 1,
        shake: 0,
        wave: 0,
      },
      damageNums: [],
    })
    const { events, player } = record(frames)
    let guard = 0
    while (!player.tick(50) && guard++ < 200) {}
    const snd = events.indexOf('snd:sound.pal.009')
    const gesture = events.indexOf('f:player0#5')
    expect(snd).toBeGreaterThan(-1)
    expect(gesture).toBeGreaterThan(-1)
    expect(snd).toBe(gesture + 1) // 与 frame5 同帧派发(fighter 先于 sound)
  })

  test('敌施法:受伤队员受击反应(frame4+前3帧红闪+递减击退 8>>i,4>>i)', () => {
    const frames = buildEnemyCast({
      enemyIdx: 0,
      anim: enemyProfile(4, 2, 0),
      playerFrames: [PLAYER_FRAMES],
      fireFrames: 0, // 无特效资产也要有受击反应
      fx: {
        placement: 'normal',
        xOffset: 0,
        yOffset: 0,
        speed: 0,
        fireDelay: 0,
        effectTimes: 1,
        shake: 0,
        wave: 0,
      },
      damageNums: [{ target: { side: 'player', idx: 0 }, value: 9 }],
      hurtPlayers: [{ idx: 0, pos: { x: 240, y: 170 } }],
    })
    const { events, player } = record(frames)
    let guard = 0
    while (!player.tick(50) && guard++ < 200) {}
    expect(events).toContain('f:player0#4@248,174c6') // i=0:+8,+4 红闪
    expect(events).toContain('f:player0#4@252,176c6') // i=1:+4,+2
    expect(events).toContain('f:player0#4@255,177c0') // i=3:红闪结束(+1,+0 累积 255,177)
    expect(events).toContain('dmg:player0:9') // 数字在反应之后
  })

  test('敌施法:被动格挡队员在起手末帧摆防御姿 frame3,特效帧不覆写(fight.c:4737/4755)', () => {
    const mk = (autoDefendPlayers?: number[]) =>
      buildEnemyCast({
        enemyIdx: 0,
        anim: enemyProfile(4, 2, 0),
        playerFrames: [PLAYER_FRAMES, PLAYER_FRAMES, PLAYER_FRAMES],
        fireFrames: 3,
        fx: {
          placement: 'normal',
          xOffset: 0,
          yOffset: 0,
          speed: 0,
          fireDelay: 0,
          effectTimes: 1,
          shake: 0,
          wave: 0,
        },
        damageNums: [],
        ...(autoDefendPlayers ? { autoDefendPlayers } : {}),
      })
    const frames = mk([0, 2])
    // 起手 2 帧:姿势注入**末帧**(一阶段 DL10b:早数帧是修过的坑);首帧无 player delta
    expect(frames[0]!.fighters?.some((f) => f.side === 'player')).toBe(false)
    expect(frames[1]!.fighters).toEqual(
      expect.arrayContaining([
        { side: 'player', idx: 0, frame: 3 },
        { side: 'player', idx: 2, frame: 3 },
      ]),
    )
    // 后续特效/结算帧不覆写 player(delta 持续 → 姿势贯穿特效,收尾 resetVisual 归位)
    for (const f of frames.slice(2))
      expect(f.fighters?.some((x) => x.side === 'player') ?? false).toBe(false)
    // 未格挡:全时间线无 player delta
    for (const f of mk()) expect(f.fighters?.some((x) => x.side === 'player') ?? false).toBe(false)
  })

  test('疯魔打友:抽搐2轮→瞬移队友旁(+30,+12)→frame9+武器音→击退(−12,−6)+红闪+数字→双方复位', () => {
    const frames = buildMateAttack({
      attackerFrames: PLAYER_FRAMES,
      mateFrames: PLAYER_FRAMES,
      attackerIdx: 0,
      attackerPos: { x: 200, y: 170 },
      mateIdx: 1,
      matePos: { x: 240, y: 190 },
      weaponSound: 'sound.pal.012',
      damage: 5,
      mateDied: false,
    })
    const { events, player } = record(frames)
    let guard = 0
    while (!player.tick(50) && guard++ < 200) {}
    expect(events.filter((e) => e === 'f:player0#8').length).toBe(2) // 原地抽搐 2 轮 frame8
    expect(events).toContain('f:player0#8@270,202') // 瞬移至队友旁(+30,+12)
    const swing = events.indexOf('f:player0#9')
    expect(swing).toBeGreaterThan(-1)
    expect(events[swing + 1]).toBe('snd:sound.pal.012') // 挥击帧同帧武器音
    expect(events).toContain('f:player1@228,184') // 队友击退(−12,−6)
    expect(events).toContain('f:player1c6') // 红闪
    expect(events).toContain('dmg:player1:5')
    expect(events).toContain('f:player0#0@200,170') // 攻击者复位
    expect(events).toContain('f:player1#0@240,190') // 队友复位站立(死则帧2)
  })

  test('敌疯魔打友:12 段递归中点→effect 9/10/11→抖动/完整数字→Delay5→复位，无声音', () => {
    const frames = buildEnemyMateAttack({
      attackerIdx: 0,
      targetIdx: 2,
      attackerPos: { x: 0, y: 0 },
      targetPos: { x: 80, y: 40 },
      targetHeight: 30,
      anim: enemyProfile(),
      damage: 777,
      targetDied: true,
    })
    expect(frames).toHaveLength(12)
    expect(frames.map((frame) => frame.durationMs)).toEqual([
      40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 200, 80,
    ])
    expect(frames.slice(0, 3).map((frame) => frame.fighters?.[0]?.pos)).toEqual([
      { x: 40, y: 20 },
      { x: 60, y: 30 },
      { x: 70, y: 35 },
    ])
    expect(frames.slice(3, 6).map((frame) => frame.overlays?.[0])).toEqual([
      { sheet: 'effect', frameIdx: 9, x: 75, y: 40 },
      { sheet: 'effect', frameIdx: 10, x: 75, y: 40 },
      { sheet: 'effect', frameIdx: 11, x: 75, y: 40 },
    ])
    expect(frames.slice(6, 9).map((frame) => frame.fighters?.[0])).toEqual([
      { side: 'enemy', idx: 2, pos: { x: 72, y: 40 }, colorShift: 0 },
      { side: 'enemy', idx: 2, pos: { x: 76, y: 40 }, colorShift: 6 },
      { side: 'enemy', idx: 2, pos: { x: 74, y: 40 }, colorShift: 0 },
    ])
    expect(frames[6]!.damageNum).toEqual({
      target: { side: 'enemy', idx: 2 },
      value: 777,
    })
    expect(frames[9]!.fighters).toEqual([
      { side: 'enemy', idx: 2, frame: 0, pos: { x: 80, y: 40 }, colorShift: 0 },
    ])
    expect(frames[10]).toEqual({ durationMs: 200 })
    expect(frames[11]!.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 0, y: 0 } }])
    expect(frames.every((frame) => frame.sound === undefined)).toBe(true)
  })

  test('敌人物攻:action 音→冲至(−44,−16)→命中 frame4+call 音+数字→击退→双方复位', () => {
    const frames = buildEnemyPhysical({
      enemyIdx: 0,
      enemyPos: { x: 100, y: 100 },
      targetIdx: 0,
      targetPos: { x: 240, y: 170 },
      anim: enemyProfile(4, 0, 2, 1),
      playerFrames: [PLAYER_FRAMES],
      sounds: { action: 'sound.pal.355', call: 'sound.pal.002' },
      damage: 7,
      targetDied: false,
    })
    const { events, player } = record(frames)
    let guard = 0
    while (!player.tick(50) && guard++ < 200) {}
    expect(events).toContain('snd:sound.pal.355')
    expect(events).toContain('f:enemy0#5@196,154') // 冲锋帧:idle4+magic0+2−1=5 @ (240−44,170−16)
    expect(events).toContain('f:player0#4c6')
    expect(events).toContain('snd:sound.pal.002')
    expect(events).toContain('dmg:player0:7')
    expect(events).toContain('f:player0@248,174c0') // 击退 +8,+4
    expect(events).toContain('f:enemy0#0@100,100') // 敌回位
    expect(events).toContain('f:player0#0@240,170') // 队员复位站立
  })

  test('使用物品:举物(-15,-7)frame5+音28 → 目标 colorShift 0..6..0 呼吸 → 复位(fight.c:2266)', () => {
    const frames = buildUseItem({
      casterFrames: PLAYER_FRAMES,
      casterIdx: 1,
      casterPos: { x: 240, y: 170 },
      targetIdxs: [1], // v1 施己
      itemName: '观音符',
      sound: 'sound.pal.028',
      gains: [{ idx: 1, value: 50, tone: 'yellow' }],
    })
    const { events, player } = record(frames)
    let guard = 0
    while (!player.tick(50) && guard++ < 200) {}
    // 走近 = 原版通用位移形制:6 步线性插值 ×40ms、整数除法(合击聚拢
    // fight.c:3881-3890 同构;作者六轮对照原版收口 —— 非 ease/密帧/渲染平滑)
    const walk = events.filter((e) => /^f:player1@/.test(e))
    expect(walk).toEqual([
      'f:player1@237,168',
      'f:player1@235,167',
      'f:player1@232,166',
      'f:player1@230,165',
      'f:player1@227,164',
      'f:player1@225,163',
    ])
    expect(events).toContain('f:player1#5@225,163') // 到位举物姿(无渲染平滑标记)
    expect(events).toContain('snd:sound.pal.028') // 用品音(fight.c:2300)
    expect(events).toContain('f:player1c6') // 呼吸峰值
    expect(events).toContain('f:player1c0') // 降回
    expect(events).toContain('f:player1#0@240,170') // 归位帧**不带**平滑 = 瞬移直落
    // 升 0..6 七级 + 降 5..0 六级 = 13 次染色事件
    expect(events.filter((e) => /^f:player1c\d$/.test(e)).length).toBe(13)
    // 「三同步」(作者对照原版):前移举物 / 音效 / 物品名 banner 同帧派发 —— 事件序列上
    // banner 紧邻 snd:sound.pal.028 与举物帧,且早于任何 colorShift>0
    const bannerAt = events.indexOf('banner:观音符:520')
    expect(bannerAt).toBeGreaterThanOrEqual(0)
    expect(Math.abs(bannerAt - events.indexOf('snd:sound.pal.028'))).toBeLessThanOrEqual(2)
    expect(bannerAt).toBeLessThan(events.indexOf('f:player1c1'))
    // 涨益数字先于归位(作者对照原版:先显血量、后瞬移归位)
    expect(events).toContain('dmg:player1:50')
    expect(events.indexOf('dmg:player1:50')).toBeLessThan(events.indexOf('f:player1#0@240,170'))
  })

  test('投掷物品:纯施毒不显数字；即时伤害在目标闪色帧显示蓝字', () => {
    const poison = record(
      buildThrowItem({
        casterFrames: PLAYER_FRAMES,
        casterIdx: 0,
        targetIdx: 1,
        damage: 0,
      }),
    )
    let guard = 0
    while (!poison.player.tick(50) && guard++ < 20) {}
    expect(poison.events.some((event) => event.startsWith('dmg:'))).toBe(false)

    const damage = record(
      buildThrowItem({
        casterFrames: PLAYER_FRAMES,
        casterIdx: 0,
        targetIdx: 1,
        sound: 'sound.pal.028',
        damage: 1000,
      }),
    )
    guard = 0
    while (!damage.player.tick(50) && guard++ < 20) {}
    expect(damage.events).toContain('f:enemy1c6')
    expect(damage.events).toContain('dmg:enemy1:1000')
    expect(damage.events.indexOf('dmg:enemy1:1000')).toBeGreaterThan(
      damage.events.indexOf('f:enemy1c6'),
    )
    expect(damage.events).toContain('f:enemy1c0')
  })

  test('投掷法术物品:投掷姿后复用 OffMagic，传递 special 层序，结果数字最后出现', () => {
    const frames = buildThrowItem({
      casterFrames: PLAYER_FRAMES,
      casterIdx: 0,
      targetIdx: 1,
      sound: 'sound.pal.028',
      presentation: {
        fireFrames: 3,
        fx: {
          placement: 'normal',
          xOffset: -12,
          yOffset: 0,
          layerOffset: 1,
          speed: -1,
          fireDelay: 0,
          effectTimes: 0,
          shake: 0,
          wave: 0,
          sound: 'sound.pal.157',
        },
        targetPos: { x: 100, y: 80 },
      },
      damage: 1000,
    })

    expect(frames[0]?.fighters).toEqual([{ side: 'player', idx: 0, frame: 5 }])
    expect(frames.slice(1, 4).map((frame) => frame.overlays?.[0])).toEqual([
      { sheet: 'magic', frameIdx: 0, x: 88, y: 80, layerOffset: 1 },
      { sheet: 'magic', frameIdx: 1, x: 88, y: 80, layerOffset: 1 },
      { sheet: 'magic', frameIdx: 2, x: 88, y: 80, layerOffset: 1 },
    ])
    expect(frames[1]?.sound).toBe('sound.pal.157')
    expect(frames.slice(1, 4).some((frame) => frame.fighters?.length)).toBe(false)
    expect(frames[4]?.damageNum).toEqual({
      target: { side: 'enemy', idx: 1 },
      value: 1000,
    })
  })

  test('逃跑成功:16 帧×40ms 全员统一 (+5,+4)(一阶段 fleeStepDelta,作者 2026-05-31 拍板);音效45首帧', () => {
    const frames = buildPartyFlee({
      sound: 'sound.pal.045',
      players: [
        { idx: 0, pos: { x: 200, y: 160 }, idleFrame: PLAYER_FRAMES.idle },
        { idx: 1, pos: { x: 240, y: 170 }, idleFrame: PLAYER_FRAMES.idle },
      ],
    })
    expect(frames.length).toBe(16)
    expect(frames[0]!.sound).toBe('sound.pal.045')
    expect(frames[0]!.fighters).toEqual([
      { side: 'player', idx: 0, frame: 0, pos: { x: 205, y: 164 } },
      { side: 'player', idx: 1, frame: 0, pos: { x: 245, y: 174 } },
    ])
    // 三人同向同速(非 sdlpal 扇形):16 步后各 +80,+64
    expect(frames[15]!.fighters).toEqual([
      { side: 'player', idx: 0, frame: 0, pos: { x: 280, y: 224 } },
      { side: 'player', idx: 1, frame: 0, pos: { x: 320, y: 234 } },
    ])
  })

  test('偷窃冲刺(fight.c:5218,一阶段 buildStealTimeline 1:1):敌前瞬移 frame10 → 5 步滑步 → 末步敌闪白', () => {
    const frames = buildSteal({
      casterIdx: 0,
      targetIdx: 1,
      enemyPos: { x: 100, y: 100 },
      stealFrame: 10,
    })
    expect(frames.length).toBe(7)
    // offset=(1−0)×8=8 → 起点 (100+64−8, 100+22+8) = (156,130)
    expect(frames[0]!.fighters![0]).toEqual({
      side: 'player',
      idx: 0,
      frame: 10,
      pos: { x: 156, y: 130 },
    })
    // 5 步:x −= i+8(8,9,10,11,12)、y −= 4
    expect(frames[1]!.fighters![0]!.pos).toEqual({ x: 148, y: 126 })
    expect(frames[5]!.fighters![0]!.pos).toEqual({ x: 106, y: 110 })
    expect(frames[5]!.fighters![1]).toEqual({ side: 'enemy', idx: 1, colorShift: 6 }) // 末步敌闪白
    // 收尾:再退 1px 定格 3 帧 + 敌复色
    expect(frames[6]!.durationMs).toBe(120)
    expect(frames[6]!.fighters).toEqual([
      { side: 'player', idx: 0, pos: { x: 105, y: 110 } },
      { side: 'enemy', idx: 1, colorShift: 0 },
    ])
  })

  test('逃跑失败(fight.c:4152):3 帧 (+4,+2) 挪步 → frame1 定格 320ms + 「逃跑失败」banner', () => {
    const frames = buildFleeFail({ idx: 1, pos: { x: 240, y: 170 }, frames: PLAYER_FRAMES })
    expect(frames.length).toBe(4)
    expect(frames[0]!.fighters![0]).toEqual({
      side: 'player',
      idx: 1,
      frame: 0,
      pos: { x: 244, y: 172 },
    })
    expect(frames[2]!.fighters![0]!.pos).toEqual({ x: 252, y: 176 })
    expect(frames[3]).toEqual({
      durationMs: 320,
      fighters: [{ side: 'player', idx: 1, frame: 1 }],
      banner: { text: '逃跑失败', durationMs: 320, x: 130, y: 75 }, // 一阶段标签位真值
    })
  })

  test('敌逃(battle.c:1376):每 10ms x−5 至滑出左屏 + 终帧停 500ms;音效45首帧', () => {
    const frames = buildEnemyEscape({
      enemies: [{ idx: 0, pos: { x: 100, y: 110 }, width: 50 }],
      sound: 'sound.pal.045',
    })
    // ceil((100+50)/5) = 30 步 + 终帧
    expect(frames.length).toBe(31)
    expect(frames[0]!.sound).toBe('sound.pal.045')
    expect(frames[0]!.durationMs).toBe(10)
    expect(frames[0]!.fighters![0]!.pos).toEqual({ x: 95, y: 110 })
    expect(frames[29]!.fighters![0]!.pos).toEqual({ x: -50, y: 110 }) // 完全出屏
    expect(frames[30]).toEqual({ durationMs: 500 })
  })

  test('变身现形:旧图 colorShift 0→5 六帧染白 → 72帧 dither 过渡至新图', () => {
    const frames = buildEnemyTransform({
      idx: 2,
      oldDefinitionId: 'battle-sprite.enemy.001',
      newDefinitionId: 'battle-sprite.enemy.002',
      oldIdleFrame: 0,
      newIdleFrame: 3,
      sound: 'sound.pal.047',
    })
    expect(frames.length).toBe(78)
    expect(frames.slice(0, 6).map((f) => f.fighters![0]!.colorShift)).toEqual([0, 1, 2, 3, 4, 5])
    expect(frames.slice(0, 6).map((f) => f.appearanceTransition?.step)).toEqual([0, 0, 0, 0, 0, 0])
    expect(frames.slice(6).map((f) => f.appearanceTransition?.step)).toEqual(
      Array.from({ length: 72 }, (_, i) => i + 1),
    )
    expect(frames.slice(6).every((f) => f.durationMs === 16)).toBe(true)
    expect(frames[6]!.fighters![0]!.frame).toBe(3)
    expect(frames[6]!.sound).toBe('sound.pal.047')
  })

  test('梦蛇:旧图施法后 0/2/4/6/8/10 闪色，再 72×16ms 切换到新图', () => {
    // 一阶段 golden：packages/game/src/core/battle/actions/magic.ts:751-809。
    const frames = buildPlayerTrance({
      casterIdx: 0,
      casterPos: { x: 240, y: 170 },
      oldDefinitionId: 'battle-sprite.player.000',
      newDefinitionId: 'battle-sprite.player.005',
      oldFrames: PLAYER_FRAMES,
      newFrames: { ...PLAYER_FRAMES, idle: 2 },
      castEffectBase: -1,
      magicSound: 'sound.pal.009',
    })
    const flash = frames.slice(7, 13)
    expect(flash.map((f) => f.fighters![0]!.colorShift)).toEqual([0, 2, 4, 6, 8, 10])
    expect(flash.every((f) => f.durationMs === 40)).toBe(true)
    expect(flash.every((f) => f.appearanceTransition?.step === 0)).toBe(true)
    const fade = frames.slice(-72)
    expect(fade.map((f) => f.appearanceTransition?.step)).toEqual(
      Array.from({ length: 72 }, (_, i) => i + 1),
    )
    expect(fade.every((f) => f.durationMs === 16 && f.fighters![0]!.frame === 2)).toBe(true)
  })

  test('剧情施法白闪:PreMagic + frame6 + 全队 0/2/4/6/8 后复色', () => {
    const frames = buildPlayerScriptCastEffect({
      casterIdx: 1,
      casterPos: { x: 240, y: 170 },
      casterFrames: PLAYER_FRAMES,
      castEffectBase: 70,
      partyIdxs: [0, 1, 2],
      magicSound: 'sound.pal.019',
    })
    expect(frames).toHaveLength(24)
    expect(frames[3]?.fighters?.[0]?.pos).toEqual({ x: 230, y: 166 })
    expect(frames[5]?.fighters?.[0]?.frame).toBe(PLAYER_FRAMES.preMagic)
    expect(frames[5]?.sound).toBe('sound.pal.019')
    expect(frames.slice(6, 16).map((frame) => frame.overlays?.[0]?.frameIdx)).toEqual(
      Array.from({ length: 10 }, (_, index) => 70 + index),
    )
    expect(frames[17]?.fighters?.[0]?.frame).toBe(PLAYER_FRAMES.magic)
    expect(
      frames.slice(18, 23).map((frame) => frame.fighters?.map((fighter) => fighter.colorShift)),
    ).toEqual([
      [0, 0, 0],
      [2, 2, 2],
      [4, 4, 4],
      [6, 6, 6],
      [8, 8, 8],
    ])
    expect(frames[23]?.fighters?.map((fighter) => fighter.colorShift)).toEqual([0, 0, 0])
  })

  test('分裂滑开(script.c:2853 0x9C):10 帧整数二分逼近 + 终帧精确落位', () => {
    const frames = buildEnemyDivide({
      motherPos: { x: 100, y: 100 },
      spawns: [{ idx: 3, target: { x: 180, y: 120 }, idleFrame: 0 }],
    })
    expect(frames.length).toBe(11)
    const xs = frames.map((f) => f.fighters![0]!.pos!.x)
    expect(xs).toEqual([140, 160, 170, 175, 177, 178, 179, 179, 179, 179, 180]) // (cur+target)/2 整除
    expect(frames[0]!.fighters![0]!.pos!.y).toBe(110)
    expect(frames[10]!.fighters![0]!.pos).toEqual({ x: 180, y: 120 })
  })

  test('替挡演出(fight.c:5012-5099):守护者 frame3 瞬移目标前接刀 → 敌被架开 + 守护者小退,零伤害', () => {
    const frames = buildEnemyPhysical({
      enemyIdx: 0,
      enemyPos: { x: 100, y: 100 },
      targetIdx: 1,
      targetPos: { x: 240, y: 170 },
      anim: enemyProfile(4, 0, 2, 1),
      playerFrames: [PLAYER_FRAMES, PLAYER_FRAMES],
      sounds: { call: 'sound.pal.002' },
      damage: 0,
      targetDied: false,
      blocked: true,
      cover: { idx: 0, sound: 'sound.pal.015' },
    })
    const { events, player } = record(frames)
    let guard = 0
    while (!player.tick(50) && guard++ < 200) {}
    expect(events).toContain('f:player0#3@216,158') // 守护者瞬移目标前 (−24,−12)
    expect(events).toContain('snd:sound.pal.015') // 音 = 守护者的 coverSound(非敌 call)
    expect(events).toContain('f:enemy0@186,146') // 敌被架开(冲锋位 (196,154) −10,−8)
    expect(events).toContain('f:player0@220,160') // 守护者小退(目标 −20,−10)
    expect(events.some((e) => e.startsWith('dmg:'))).toBe(false) // 完全免伤
    expect(events.some((e) => e.includes('player1#4'))).toBe(false) // 目标无受击帧
  })

  test('actWaitFrames=0 的零长帧不卡死,一次 tick 全跨过', () => {
    const frames = buildEnemyPhysical({
      enemyIdx: 0,
      enemyPos: { x: 100, y: 100 },
      targetIdx: 0,
      targetPos: { x: 240, y: 170 },
      anim: enemyProfile(2, 0, 3, 0),
      playerFrames: [PLAYER_FRAMES],
      sounds: {},
      damage: 1,
      targetDied: true,
    })
    const { events, player } = record(frames)
    let ticks = 0
    while (!player.tick(1000) && ticks++ < 10) {}
    expect(ticks).toBeLessThan(10)
    expect(events).toContain('f:player0#2@240,170') // 死亡收尾 frame2
  })
})
