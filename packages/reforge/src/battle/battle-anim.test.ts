import { describe, expect, test } from 'vitest'
import {
  type AnimFrame,
  AnimPlayer,
  buildEnemyCast,
  buildEnemyPhysical,
  buildMateAttack,
  buildPlayerAttack,
  buildPlayerCast,
  buildUseItem,
} from './battle-anim.js'

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
  test('玩家物攻:冲刺(+64,+20)→挥击9+敌染色+伤害数字→敌抖动(−8/−4/−6)', () => {
    const frames = buildPlayerAttack({
      attackerIdx: 0,
      attackerPos: { x: 240, y: 170 },
      targetIdx: 1,
      targetPos: { x: 100, y: 100 },
      targetHeight: 60,
      effectFrameBase: 3,
      damage: 42,
      windup: true,
      sounds: { attack: 37, weapon: 1 },
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
    expect(events).toContain('snd:37')
    expect(events).toContain('snd:1')
    expect(events.indexOf('snd:37')).toBeLessThan(events.indexOf('snd:1'))
    expect(events.indexOf('snd:1')).toBe(events.indexOf('f:player0#9') + 2) // 与挥击同帧(f→f→snd 派发序)
  })

  test('玩家施法:吟唱音挂 frame5 姿势帧(rgwMagicSound,非起手即播)', () => {
    const frames = buildPlayerCast({
      casterIdx: 0,
      casterPos: { x: 240, y: 170 },
      magicSound: 9,
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
        sound: 0,
      },
      damageNums: [],
    })
    const { events, player } = record(frames)
    let guard = 0
    while (!player.tick(50) && guard++ < 200) {}
    const snd = events.indexOf('snd:9')
    const gesture = events.indexOf('f:player0#5')
    expect(snd).toBeGreaterThan(-1)
    expect(gesture).toBeGreaterThan(-1)
    expect(snd).toBe(gesture + 1) // 与 frame5 同帧派发(fighter 先于 sound)
  })

  test('敌施法:受伤队员受击反应(frame4+前3帧红闪+递减击退 8>>i,4>>i)', () => {
    const frames = buildEnemyCast({
      enemyIdx: 0,
      anim: { idleFrames: 4, magicFrames: 2 },
      magicSound: 0,
      fireFrames: 0, // 无特效资产也要有受击反应
      fx: { placement: 'normal', xOffset: 0, yOffset: 0, speed: 0, fireDelay: 0, effectTimes: 1, shake: 0, wave: 0, sound: 0 },
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
        anim: { idleFrames: 4, magicFrames: 2 },
        magicSound: 0,
        fireFrames: 3,
        fx: { placement: 'normal', xOffset: 0, yOffset: 0, speed: 0, fireDelay: 0, effectTimes: 1, shake: 0, wave: 0, sound: 0 },
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
      attackerIdx: 0,
      attackerPos: { x: 200, y: 170 },
      mateIdx: 1,
      matePos: { x: 240, y: 190 },
      weaponSound: 12,
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
    expect(events[swing + 1]).toBe('snd:12') // 挥击帧同帧武器音
    expect(events).toContain('f:player1@228,184') // 队友击退(−12,−6)
    expect(events).toContain('f:player1c6') // 红闪
    expect(events).toContain('dmg:player1:5')
    expect(events).toContain('f:player0#0@200,170') // 攻击者复位
    expect(events).toContain('f:player1#0@240,190') // 队友复位站立(死则帧2)
  })

  test('敌人物攻:action 音→冲至(−44,−16)→命中 frame4+call 音+数字→击退→双方复位', () => {
    const frames = buildEnemyPhysical({
      enemyIdx: 0,
      enemyPos: { x: 100, y: 100 },
      targetIdx: 0,
      targetPos: { x: 240, y: 170 },
      anim: { idleFrames: 4, magicFrames: 0, attackFrames: 2, actWaitFrames: 1 },
      sounds: { action: 355, call: 2 },
      damage: 7,
      targetDied: false,
    })
    const { events, player } = record(frames)
    let guard = 0
    while (!player.tick(50) && guard++ < 200) {}
    expect(events).toContain('snd:355')
    expect(events).toContain('f:enemy0#5@196,154') // 冲锋帧:idle4+magic0+2−1=5 @ (240−44,170−16)
    expect(events).toContain('f:player0#4c6')
    expect(events).toContain('snd:2')
    expect(events).toContain('dmg:player0:7')
    expect(events).toContain('f:player0@248,174c0') // 击退 +8,+4
    expect(events).toContain('f:enemy0#0@100,100') // 敌回位
    expect(events).toContain('f:player0#0@240,170') // 队员复位站立
  })

  test('使用物品:举物(-15,-7)frame5+音28 → 目标 colorShift 0..6..0 呼吸 → 复位(fight.c:2266)', () => {
    const frames = buildUseItem({
      casterIdx: 1,
      casterPos: { x: 240, y: 170 },
      targetIdxs: [1], // v1 施己
      itemName: '观音符',
    })
    const { events, player } = record(frames)
    let guard = 0
    while (!player.tick(50) && guard++ < 200) {}
    expect(events).toContain('f:player1#5@225,163') // 前移举物姿
    expect(events).toContain('snd:28') // 用品音(fight.c:2300)
    expect(events).toContain('f:player1c6') // 呼吸峰值
    expect(events).toContain('f:player1c0') // 降回
    expect(events).toContain('f:player1#0@240,170') // 复位
    // 升 0..6 七级 + 降 5..0 六级 = 13 次染色事件
    expect(events.filter((e) => /^f:player1c\d$/.test(e)).length).toBe(13)
    // 「三同步」(作者对照原版):前移举物 / 音效 / 物品名 banner 同帧派发 —— 事件序列上
    // banner 紧邻 snd:28 与举物帧,且早于任何 colorShift>0
    const bannerAt = events.indexOf('banner:观音符:520')
    expect(bannerAt).toBeGreaterThanOrEqual(0)
    expect(Math.abs(bannerAt - events.indexOf('snd:28'))).toBeLessThanOrEqual(2)
    expect(bannerAt).toBeLessThan(events.indexOf('f:player1c1'))
  })

  test('actWaitFrames=0 的零长帧不卡死,一次 tick 全跨过', () => {
    const frames = buildEnemyPhysical({
      enemyIdx: 0,
      enemyPos: { x: 100, y: 100 },
      targetIdx: 0,
      targetPos: { x: 240, y: 170 },
      anim: { idleFrames: 2, magicFrames: 0, attackFrames: 3, actWaitFrames: 0 },
      sounds: { action: 0, call: 0 },
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
