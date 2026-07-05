import { describe, expect, test } from 'vitest'
import {
  type AnimFrame,
  AnimPlayer,
  buildEnemyPhysical,
  buildPlayerAttack,
  buildPlayerCast,
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
