import type { EnemySounds } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  enemyProfile,
  finishRecordedAnimation,
  recordBattleAnimation,
} from '../__tests__/battle-workflows/animation-observer.js'
import { PLAYER_PROFILE } from '../__tests__/battle-workflows/catalog.js'
import {
  buildEnemyMateAttack,
  buildEnemyPhysical,
  buildMateAttack,
  buildPlayerAttack,
} from './battle-anim.js'

const PLAYER_FRAMES = PLAYER_PROFILE.frames

describe('物理攻击和队友受击表现', () => {
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
    const { events, player } = recordBattleAnimation(frames)
    finishRecordedAnimation(player, 50)
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

  test('疯魔打友:抽搐后走位，击退与武器音同拍，闪白一拍后显示数字并复位', () => {
    const frames = buildMateAttack({
      attackerFrames: PLAYER_FRAMES,
      attackerRestFrame: PLAYER_FRAMES.idle,
      attackerIdx: 0,
      attackerPos: { x: 200, y: 170 },
      mateIdx: 1,
      matePos: { x: 240, y: 190 },
      weaponSound: 'sound.pal.012',
      damage: 5,
      mateRestFrame: PLAYER_FRAMES.defend,
    })
    const strike = frames.findIndex((frame) => frame.sound === 'sound.pal.012')
    expect(frames[strike]).toMatchObject({
      durationMs: 40,
      fighters: [
        { side: 'player', idx: 0, frame: 9 },
        { side: 'player', idx: 1, pos: { x: 228, y: 184 } },
      ],
    })
    expect(frames[strike + 1]).toEqual({
      durationMs: 40,
      fighters: [{ side: 'player', idx: 1, colorShift: 6 }],
    })
    expect(frames[strike + 2]).toMatchObject({
      durationMs: 160,
      fighters: [{ side: 'player', idx: 1, colorShift: 0 }],
      damageNum: { target: { side: 'player', idx: 1 }, value: 5 },
    })
    const { events, player } = recordBattleAnimation(frames)
    finishRecordedAnimation(player, 50)
    expect(events.filter((e) => e === 'f:player0#8').length).toBe(2) // 原地抽搐 2 轮 frame8
    expect(events).toContain('f:player0#8@270,202') // 瞬移至队友旁(+30,+12)
    const swing = events.indexOf('f:player0#9')
    expect(swing).toBeGreaterThan(-1)
    expect(events[swing + 2]).toBe('snd:sound.pal.012') // 挥击、击退及武器音同帧
    expect(events).toContain('f:player1@228,184') // 队友击退(−12,−6)
    expect(events).toContain('f:player1c6') // 红闪
    expect(events).toContain('dmg:player1:5')
    expect(events).toContain('f:player0#0@200,170') // 攻击者复位
    expect(events).toContain('f:player1#3@240,190') // 复位后保持防御姿势
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
      targetRecoveryFrame: PLAYER_FRAMES.idle,
    })
    const { events, player } = recordBattleAnimation(frames)
    player.tick(0)
    expect(events).toEqual(['f:enemy0@98,99'])
    finishRecordedAnimation(player, 50)
    expect(events.filter((event) => event.startsWith('snd:'))).toEqual([
      'snd:sound.pal.355',
      'snd:sound.pal.002',
    ])
    expect(events).toContain('f:enemy0#5@196,154') // 冲锋帧:idle4+magic0+2−1=5 @ (240−44,170−16)
    expect(events).toContain('f:player0#4c6')
    expect(events).toContain('dmg:player0:7')
    expect(events).toContain('f:player0@248,174c0') // 击退 +8,+4
    expect(events).toContain('f:enemy0#0@100,100') // 敌回位
    expect(events).toContain('f:player0#0@240,170') // 队员复位站立
  })

  test('替挡演出(fight.c:5012-5099):守护者 frame3 瞬移目标前接刀 → 敌被架开 + 守护者小退,零伤害', () => {
    const sounds: EnemySounds = {
      attack: 'sound.pal.368',
      action: 'sound.pal.355',
      call: 'sound.pal.094',
    }
    const frames = buildEnemyPhysical({
      enemyIdx: 0,
      enemyPos: { x: 100, y: 100 },
      targetIdx: 1,
      targetPos: { x: 240, y: 170 },
      anim: enemyProfile(1, 1, 2, 2),
      playerFrames: [PLAYER_FRAMES, PLAYER_FRAMES],
      sounds,
      damage: 0,
      targetRecoveryFrame: PLAYER_FRAMES.idle,
      blocked: true,
      cover: { idx: 0, sound: 'sound.pal.015' },
    })
    const { events, player } = recordBattleAnimation(frames)
    player.tick(0)
    expect(events).toEqual(['f:enemy0#1', 'snd:sound.pal.368'])
    finishRecordedAnimation(player, 50)
    expect(events).toContain('f:player0#3@216,158') // 守护者瞬移目标前 (−24,−12)
    expect(events.filter((event) => event.startsWith('snd:'))).toEqual([
      'snd:sound.pal.368',
      'snd:sound.pal.355',
      'snd:sound.pal.015', // 守护者的 coverSound。
    ])
    expect(events).toContain('f:enemy0@186,146') // 敌被架开(冲锋位 (196,154) −10,−8)
    expect(events).toContain('f:player0@220,160') // 守护者小退(目标 −20,−10)
    expect(events.some((e) => e.startsWith('dmg:'))).toBe(false) // 完全免伤
    expect(events.some((e) => e.includes('player1#4'))).toBe(false) // 目标无受击帧
  })

  test('敌攻击每帧零等待时，仍完成时间线并恢复阵亡目标姿态', () => {
    const frames = buildEnemyPhysical({
      enemyIdx: 0,
      enemyPos: { x: 100, y: 100 },
      targetIdx: 0,
      targetPos: { x: 240, y: 170 },
      anim: enemyProfile(2, 0, 3, 0),
      playerFrames: [PLAYER_FRAMES],
      sounds: {},
      damage: 1,
      targetRecoveryFrame: PLAYER_FRAMES.dead,
    })
    const { events, player } = recordBattleAnimation(frames)
    expect(player.tick(1000)).toBe(true)
    expect(events).toContain('f:player0#2@240,170') // 死亡收尾 frame2
  })

  test('队友阵亡后在收招使用倒地姿', () => {
    const frames = buildMateAttack({
      attackerFrames: PLAYER_FRAMES,
      attackerRestFrame: PLAYER_FRAMES.idle,
      attackerIdx: 0,
      attackerPos: { x: 40, y: 140 },
      mateIdx: 1,
      matePos: { x: 120, y: 60 },
      damage: 6,
      mateRestFrame: PLAYER_FRAMES.dead,
    })
    const mateFrames = frames.flatMap((frame) =>
      (frame.fighters ?? []).filter((fighter) => fighter.side === 'player' && fighter.idx === 1),
    )
    // 复位帧 = 阵亡倒地姿；击退/受击帧只带位移或染色。
    expect(mateFrames).toContainEqual({
      side: 'player',
      idx: 1,
      frame: PLAYER_FRAMES.dead,
      pos: { x: 120, y: 60 },
    })
  })
})
