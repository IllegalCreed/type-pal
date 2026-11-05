/** Physical attack choreography for players and enemies, including confused attacks. Data-level contracts; not browser or visual acceptance. */
import { describe, expect, it } from 'vitest'
import {
  buildAttackMateTimeline,
  buildEnemyConfusedAttackTimeline,
  buildEnemyPhysicalTimeline,
  buildPlayerAttackTimeline,
} from '../anim-timeline.js'

const FRAME_MS = 40 // SDLPal battle.h: BATTLE_FPS=25.
const EFFECT_SPRITE_CHUNK = 10 // DATA.MKF built-in hit effects.

describe('buildPlayerAttackTimeline (fight.c:2008-2263)', () => {
  // 攻击者 player idx0 站立 (240,170);目标 enemy idx0 站立 (160,80);enemy_h=0;
  // effectFrameBase = rgwBattleEffectIndex[sprite][1]*3。此处直接传 base=6(sprite=1 → list[3]=1 → *3=3 等
  // 由调用方算;builder 只用传入的 base)。damage=37。
  const frames = buildPlayerAttackTimeline({
    attackerPos: { x: 240, y: 170 },
    attackerIdx: 0,
    targetEnemyPos: { x: 160, y: 80 },
    targetIdx: 0,
    targetEnemyHeight: 0,
    effectFrameBase: 6,
    damage: 37,
  })

  it('总帧数 = 8(frame0 冲刺 + frame1 推进 + 3 特效 + 3 抖动)', () => {
    expect(frames).toHaveLength(8)
  })

  // L12:首击前摇 —— C 在 ShowPlayerAttackAnim 前(仅 t==0)`wCurrentFrame=7 + PAL_BattleDelay(4)`
  //   (fight.c:3667-3671 单体 / 3690-3694 群攻)。window=true 时前置该前摇帧。
  it('windup=true → 前置 currentFrame=7 + Delay(4) 前摇帧(总帧 9);默认 off 仍 8', () => {
    const fr = buildPlayerAttackTimeline({
      attackerPos: { x: 240, y: 170 },
      attackerIdx: 0,
      targetEnemyPos: { x: 160, y: 80 },
      targetIdx: 0,
      targetEnemyHeight: 0,
      effectFrameBase: 6,
      damage: 37,
      windup: true,
    })
    expect(fr).toHaveLength(9) // 8 + 1 前摇
    expect(fr[0]!.durationMs).toBe(4 * FRAME_MS) // PAL_BattleDelay(4) = 4 * FRAME_MS
    expect(fr[0]!.fighters).toEqual([
      { side: 'player', idx: 0, currentFrame: 7, pos: { x: 240, y: 170 } },
    ])
    expect(frames).toHaveLength(8) // 默认 windup off 不影响既有路径
  })

  it('frame0:currentFrame=8,冲到敌前 (enemy_x+64, enemy_y+20)=(224,100),Delay(2)', () => {
    const f = frames[0]!
    expect(f.durationMs).toBe(2 * FRAME_MS)
    expect(f.fighters).toEqual([
      { side: 'player', idx: 0, currentFrame: 8, pos: { x: 224, y: 100 } },
    ])
  })

  it('frame1:x-=10,y-=2 → (214,98),Delay(1)', () => {
    const f = frames[1]!
    expect(f.durationMs).toBe(1 * FRAME_MS)
    expect(f.fighters).toEqual([{ side: 'player', idx: 0, pos: { x: 214, y: 98 } }])
  })

  it('frame2(特效 i=0):currentFrame=9 + target.iColorShift=6 + damageNum + overlay chunk10 frame=base+0', () => {
    const f = frames[2]!
    expect(f.durationMs).toBe(1 * FRAME_MS)
    expect(f.fighters).toEqual([
      { side: 'player', idx: 0, currentFrame: 9 },
      { side: 'enemy', idx: 0, iColorShift: 6 },
    ])
    expect(f.overlay).toMatchObject({
      kind: 'effect',
      spriteChunk: EFFECT_SPRITE_CHUNK,
      frameIdx: 6, // base+0
      x: 160, // enemy_x
      y: 80 - 0 + 10, // enemy_y - enemy_h/3 + 10 = 90
    })
    expect(f.damageNum).toEqual({ target: { kind: 'enemy', idx: 0 }, value: 37, color: 'blue' })
  })

  it('frame3(特效 i=1):overlay frame=base+1 落点 x-=16/y+=16;attacker.pos += (2,1)', () => {
    const f = frames[3]!
    expect(f.overlay).toMatchObject({
      kind: 'effect',
      spriteChunk: EFFECT_SPRITE_CHUNK,
      frameIdx: 7,
      x: 160 - 16,
      y: 90 + 16,
    })
    // attacker.pos = frame1 pos (214,98) + (2,1) = (216,99)
    expect(f.fighters).toEqual([{ side: 'player', idx: 0, pos: { x: 216, y: 99 } }])
    expect(f.damageNum).toBeUndefined()
  })

  it('frame4(特效 i=2):overlay frame=base+2 落点 (128,122);无 fighter delta', () => {
    const f = frames[4]!
    expect(f.overlay).toMatchObject({
      kind: 'effect',
      spriteChunk: EFFECT_SPRITE_CHUNK,
      frameIdx: 8,
      x: 160 - 32,
      y: 90 + 32,
    })
    expect(f.fighters).toBeUndefined()
  })

  it('frame5..7:抖动 dist 8→-4→2 → target.pos.x 序列 152/156/154;首帧 iColorShift=0 复位', () => {
    // ex=160. i0: x-=8 → 152, dist=-4, y+=-4 → 76. i1: x-=-4 → 156, dist=2, y+=2 → 78.
    // i2: x-=2 → 154, dist=-1, y+=-1 → 77.
    const f5 = frames[5]!
    expect(f5.durationMs).toBe(1 * FRAME_MS)
    expect(f5.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 152, y: 76 }, iColorShift: 0 }])
    const f6 = frames[6]!
    expect(f6.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 156, y: 78 } }])
    const f7 = frames[7]!
    expect(f7.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 154, y: 77 } }])
  })

  it('effectFrameBase 透传:base=0 → overlay frameIdx 0/1/2', () => {
    const fr = buildPlayerAttackTimeline({
      attackerPos: { x: 240, y: 170 },
      attackerIdx: 0,
      targetEnemyPos: { x: 160, y: 80 },
      targetIdx: 0,
      targetEnemyHeight: 0,
      effectFrameBase: 0,
      damage: 1,
    })
    expect(fr[2]!.overlay!.frameIdx).toBe(0)
    expect(fr[3]!.overlay!.frameIdx).toBe(1)
    expect(fr[4]!.overlay!.frameIdx).toBe(2)
  })

  it('enemy_h>0:overlay 落点 y = enemy_y - enemy_h/3 + 10', () => {
    const fr = buildPlayerAttackTimeline({
      attackerPos: { x: 240, y: 170 },
      attackerIdx: 0,
      targetEnemyPos: { x: 160, y: 80 },
      targetIdx: 0,
      targetEnemyHeight: 60,
      effectFrameBase: 0,
      damage: 1,
    })
    // 80 - 60/3 + 10 = 80 - 20 + 10 = 70
    expect(fr[2]!.overlay!.y).toBe(70)
  })

  // M6 双击声画同步(user 2026-06-05 报"单体双击出招音只响一次"):出招声/武器声不再由 attack.ts loop 内
  //   同步 bus.emit(同 tick drain 重叠成一次),改挂时间线 frame.sound 逐 tick 播 → 双击两段错开各响。
  //   sdlpal 真值:出招声 attackSound/criticalSound 在 ShowPlayerAttackAnim 起手(fight.c:2061-2071,frame=8 前)
  //   → 挂 frame0 冲刺帧;武器声 weaponSound 在 currentFrame=9 后(fight.c:2124)→ 挂特效 i==0 帧(frame2)。
  it('attackVoice/weaponSound → frame0 挂出招声、currentFrame=9 帧挂武器声(fight.c:2061/2124)', () => {
    const fr = buildPlayerAttackTimeline({
      attackerPos: { x: 240, y: 170 },
      attackerIdx: 0,
      targetEnemyPos: { x: 160, y: 80 },
      targetIdx: 0,
      targetEnemyHeight: 0,
      effectFrameBase: 0,
      damage: 10,
      attackVoice: 37,
      weaponSound: 88,
    })
    expect(fr[0]!.sound).toBe(37) // 出招声挂冲刺起手帧(fight.c:2061-2071)
    // frame2 = 特效 i==0,currentFrame=9(fight.c:2120)→ 武器声(fight.c:2124)
    expect(fr[2]!.fighters).toEqual([
      { side: 'player', idx: 0, currentFrame: 9 },
      { side: 'enemy', idx: 0, iColorShift: 6 },
    ])
    expect(fr[2]!.sound).toBe(88)
    // 其余帧无 sound
    fr.forEach((f, i) => {
      if (i !== 0 && i !== 2) expect(f.sound).toBeUndefined()
    })
  })

  it('attackVoice/weaponSound 缺省或 0 → 无帧带 sound', () => {
    const fr = buildPlayerAttackTimeline({
      attackerPos: { x: 240, y: 170 },
      attackerIdx: 0,
      targetEnemyPos: { x: 160, y: 80 },
      targetIdx: 0,
      targetEnemyHeight: 0,
      effectFrameBase: 0,
      damage: 1,
      attackVoice: 0,
      weaponSound: 0,
    })
    expect(fr.every((f) => f.sound === undefined)).toBe(true)
  })
})

describe('buildEnemyPhysicalTimeline (fight.c:4910-5149)', () => {
  // enemy idx0 站立 (160,80);target player idx0 站立 (240,170);damage=12;未死未濒死。
  // magicFrames=0, attackFrames=2, actWaitFrames=1, idleFrames=4。
  function build(
    opts: {
      magicFrames?: number
      attackFrames?: number
      actWaitFrames?: number
      idleFrames?: number
      targetDied?: boolean
      targetDying?: boolean
      actionSound?: number
      callSound?: number
    } = {},
  ) {
    return buildEnemyPhysicalTimeline({
      enemyPos: { x: 160, y: 80 },
      enemyIdx: 0,
      targetPlayerPos: { x: 240, y: 170 },
      targetIdx: 0,
      enemy: {
        magicFrames: opts.magicFrames ?? 0,
        attackFrames: opts.attackFrames ?? 2,
        actWaitFrames: opts.actWaitFrames ?? 1,
        idleFrames: opts.idleFrames ?? 4,
        actionSound: opts.actionSound ?? 0,
        callSound: opts.callSound ?? 0,
      },
      damage: 12,
      targetDied: opts.targetDied ?? false,
      targetDying: opts.targetDying ?? false,
    })
  }

  it('前移帧数 = 3 - magicFrames(magicFrames=0 → 3 帧 pos.x-=2/y-=1)', () => {
    const frames = build()
    // frame0..2 = 前移(magicFrames=0 → 无 magic 帧);pos 从 (160,80) 每帧 -2/-1
    expect(frames[0]!.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 158, y: 79 } }])
    expect(frames[1]!.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 156, y: 78 } }])
    expect(frames[2]!.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 154, y: 77 } }])
    expect(frames[0]!.durationMs).toBe(1 * FRAME_MS)
  })

  // M6:actionSound(fight.c:5005,接近 Delay 帧)/ callSound(fight.c:5084,命中帧)帧同步 frame.sound。
  it('actionSound 落接近帧、callSound 落命中帧(与 damageNum 同帧)', () => {
    const frames = build({ actionSound: 39, callSound: 90 })
    // actionSound 帧 = 接近 Delay(1)(无 fighters/damageNum,仅 sound)
    const actionFrame = frames.find((f) => f.sound === 39)
    expect(actionFrame).toBeDefined()
    expect(actionFrame!.fighters).toBeUndefined()
    // callSound 帧 = 命中帧(有 damageNum + iColorShift=6)
    const hitFrame = frames.find((f) => f.damageNum)
    expect(hitFrame!.sound).toBe(90)
    // 0 音 → 不设 sound(无音帧)
    expect(build({ actionSound: 0, callSound: 0 }).every((f) => f.sound === undefined)).toBe(true)
  })

  it('magicFrames=2:前 2 帧 currentFrame=idleFrames+i,只 1 帧前移', () => {
    const frames = build({ magicFrames: 2, idleFrames: 4 })
    // magic 帧 0/1:currentFrame = 4+0 / 4+1,Delay(2)
    expect(frames[0]!.fighters).toEqual([{ side: 'enemy', idx: 0, currentFrame: 4 }])
    expect(frames[0]!.durationMs).toBe(2 * FRAME_MS)
    expect(frames[1]!.fighters).toEqual([{ side: 'enemy', idx: 0, currentFrame: 5 }])
    // 前移帧 = 3 - 2 = 1 帧
    expect(frames[2]!.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 158, y: 79 } }])
  })

  it('冲刺帧:pos = player.x-44 / player.y-16 = (196,154)(attackFrames 各帧)', () => {
    const frames = build({ attackFrames: 2, actWaitFrames: 1, magicFrames: 0, idleFrames: 4 })
    // frame0..2 前移;frame3 = actionSound Delay(1)(无 fighters);frame4..6 = 冲刺(attackFrames+1=3 帧)
    const chargeFrames = frames.filter((f) =>
      f.fighters?.some((d) => d.side === 'enemy' && d.pos?.x === 196 && d.pos?.y === 154),
    )
    expect(chargeFrames.length).toBe(3) // i=0..attackFrames=2 → 3 帧
    // currentFrame = idleFrames + magicFrames + i - 1 = 4 + 0 + i - 1
    expect(chargeFrames[0]!.fighters).toEqual([
      { side: 'enemy', idx: 0, currentFrame: 3, pos: { x: 196, y: 154 } },
    ])
    expect(chargeFrames[1]!.fighters).toEqual([
      { side: 'enemy', idx: 0, currentFrame: 4, pos: { x: 196, y: 154 } },
    ])
    expect(chargeFrames[2]!.fighters).toEqual([
      { side: 'enemy', idx: 0, currentFrame: 5, pos: { x: 196, y: 154 } },
    ])
    expect(chargeFrames[0]!.durationMs).toBe(1 * FRAME_MS) // actWaitFrames=1
  })

  it('命中帧:target.currentFrame=4 + iColorShift=6 + damageNum(blue, value=12)', () => {
    const frames = build()
    const hit = frames.find((f) =>
      f.fighters?.some((d) => d.side === 'player' && d.currentFrame === 4),
    )!
    expect(hit.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 4, iColorShift: 6 }])
    expect(hit.damageNum).toEqual({ target: { kind: 'player', idx: 0 }, value: 12, color: 'blue' })
  })

  it('命中后:iColorShift=0 + 击退 target.pos += (8,4)=(248,174)', () => {
    const frames = build()
    const knock = frames.find((f) =>
      f.fighters?.some((d) => d.side === 'player' && d.iColorShift === 0),
    )!
    expect(knock.fighters).toEqual([
      { side: 'player', idx: 0, iColorShift: 0, pos: { x: 248, y: 174 } },
    ])
  })

  // frameBak 帧自带坐标归位(姿势+坐标同帧一次复位,法术式改良;旧两段式 user 报"回一半→卡顿→瞬移")
  it('死亡:target frameBak=2(濒死帧之后赋值)+ 坐标同帧归位', () => {
    const frames = build({ targetDied: true })
    // 倒数第二帧 = target.currentFrame = frameBak;最后一帧 = Delay(4) 空帧
    const last2 = frames[frames.length - 2]!
    expect(last2.fighters).toEqual([
      { side: 'player', idx: 0, currentFrame: 2, pos: { x: 240, y: 170 } },
    ])
  })

  it('濒死(非死):target frameBak=1 + 坐标同帧归位', () => {
    const frames = build({ targetDying: true })
    const last2 = frames[frames.length - 2]!
    expect(last2.fighters).toEqual([
      { side: 'player', idx: 0, currentFrame: 1, pos: { x: 240, y: 170 } },
    ])
  })

  it('未死未濒死:target frameBak=0(站立)+ 坐标同帧归位', () => {
    const frames = build()
    const last2 = frames[frames.length - 2]!
    expect(last2.fighters).toEqual([
      { side: 'player', idx: 0, currentFrame: 0, pos: { x: 240, y: 170 } },
    ])
  })

  it('复位帧:enemy.pos=posOriginal(160,80) + currentFrame=0', () => {
    const frames = build()
    const reset = frames.find((f) =>
      f.fighters?.some(
        (d) => d.side === 'enemy' && d.currentFrame === 0 && d.pos?.x === 160 && d.pos?.y === 80,
      ),
    )!
    expect(reset).toBeDefined()
  })

  it('最后一帧 = Delay(4) 空帧(actWaitFrames 收尾)', () => {
    const frames = build()
    const last = frames[frames.length - 1]!
    expect(last.durationMs).toBe(4 * FRAME_MS)
    expect(last.fighters).toBeUndefined()
  })

  it('attackFrames=0:单冲刺帧 currentFrame=idleFrames-1,Delay(2)', () => {
    const frames = build({ attackFrames: 0, idleFrames: 4, magicFrames: 0 })
    const charge = frames.find((f) =>
      f.fighters?.some((d) => d.side === 'enemy' && d.pos?.x === 196),
    )!
    expect(charge.fighters).toEqual([
      { side: 'enemy', idx: 0, currentFrame: 3, pos: { x: 196, y: 154 } },
    ])
    expect(charge.durationMs).toBe(2 * FRAME_MS)
  })

  // BUG(2026-06-04 user 报"高级草妖普攻只出声、无动作、无受击、无掉血"):被动格挡(fAutoDefend)触发。
  //   sdlpal fight.c:5023-5085 真值:格挡时玩家摆 frame 3 格挡姿 + 播 coverSound,**不结算伤害**(无 damageNum、
  //   无 frame 4 受击闪烁),敌人 lunge 攻击动画照常(5029-5050)。此前 attack.ts autoDefend 分支只 emit
  //   playEnemyAttack(经 audio 播敌攻击音)+ return 不建时间线 → 有声无动画。
  it('autoDefend(格挡):玩家 frame 3 格挡姿 + coverSound,无 damageNum/frame4 受击,敌 lunge 照常', () => {
    const frames = build({
      attackFrames: 2,
      actWaitFrames: 1,
      magicFrames: 0,
      idleFrames: 4,
      callSound: 90,
    })
    const blockFrames = buildEnemyPhysicalTimeline({
      enemyPos: { x: 160, y: 80 },
      enemyIdx: 0,
      targetPlayerPos: { x: 240, y: 170 },
      targetIdx: 0,
      enemy: {
        magicFrames: 0,
        attackFrames: 2,
        actWaitFrames: 1,
        idleFrames: 4,
        actionSound: 0,
        callSound: 90,
      },
      damage: 0,
      targetDied: false,
      targetDying: false,
      autoDefend: true,
      coverSound: 47,
    })
    // 格挡不掉血 → 全程无 damageNum
    expect(blockFrames.every((f) => f.damageNum === undefined)).toBe(true)
    // 玩家显格挡姿 frame 3(非受击 frame 4)
    expect(
      blockFrames.some((f) => f.fighters?.some((d) => d.side === 'player' && d.currentFrame === 3)),
    ).toBe(true)
    expect(
      blockFrames.some((f) =>
        f.fighters?.some((d) => d.side === 'player' && d.currentFrame === 4 && d.iColorShift === 6),
      ),
    ).toBe(false)
    // 播 coverSound(47),不播 callSound(90,命中音格挡路不响)
    expect(blockFrames.some((f) => f.sound === 47)).toBe(true)
    expect(blockFrames.some((f) => f.sound === 90)).toBe(false)
    // 敌人 lunge 攻击动画照常(冲到 player.x-44=196 / y-16=154,与命中路相同)
    expect(
      blockFrames.some((f) =>
        f.fighters?.some((d) => d.side === 'enemy' && d.pos?.x === 196 && d.pos?.y === 154),
      ),
    ).toBe(true)
    // 对照:命中路确有 damageNum + frame4(证明差异)
    expect(frames.some((f) => f.damageNum !== undefined)).toBe(true)
  })

  it('cover 替挡:coverer 跳到目标前 frame3 + coverSound,目标不受击不位移', () => {
    const frames = buildEnemyPhysicalTimeline({
      enemyPos: { x: 160, y: 80 },
      enemyIdx: 0,
      targetPlayerPos: { x: 240, y: 170 },
      targetIdx: 0,
      enemy: {
        magicFrames: 0,
        attackFrames: 2,
        actWaitFrames: 1,
        idleFrames: 4,
        actionSound: 0,
        callSound: 90,
      },
      damage: 0,
      targetDied: false,
      targetDying: false,
      autoDefend: true,
      coverSound: 47,
      cover: { idx: 1, pos: { x: 180, y: 150 } },
    })
    expect(frames.every((f) => f.damageNum === undefined)).toBe(true)
    expect(frames.some((f) => f.sound === 47)).toBe(true)
    expect(frames.some((f) => f.sound === 90)).toBe(false)
    expect(
      frames.some((f) =>
        f.fighters?.some(
          (d) =>
            d.side === 'player' &&
            d.idx === 1 &&
            d.currentFrame === 3 &&
            d.pos?.x === 216 &&
            d.pos?.y === 158,
        ),
      ),
    ).toBe(true)
    expect(
      frames.some((f) =>
        f.fighters?.some(
          (d) => d.side === 'enemy' && d.idx === 0 && d.pos?.x === 186 && d.pos?.y === 146,
        ),
      ),
    ).toBe(true)
    expect(
      frames.some((f) =>
        f.fighters?.some(
          (d) => d.side === 'player' && d.idx === 1 && d.pos?.x === 220 && d.pos?.y === 160,
        ),
      ),
    ).toBe(true)
    expect(
      frames.some((f) =>
        f.fighters?.some(
          (d) => d.side === 'player' && d.idx === 0 && d.pos?.x === 248 && d.pos?.y === 174,
        ),
      ),
    ).toBe(false)
    expect(
      frames.some((f) =>
        f.fighters?.some((d) => d.side === 'player' && d.idx === 0 && d.currentFrame === 4),
      ),
    ).toBe(false)
  })

  // C 物攻收尾 Delay 第三参(fight.c:5133/5135 = TRUE,其余全 FALSE):TRUE 段敌人 idle 呼吸动画
  // 持续推进。旧版整链冻结敌 idle → 收尾 200ms 全画面死冻 + 瞬移复位,显著"卡顿感"
  // (user 2026-06-13 报"物理攻击复位明显卡顿,法术正常")。
  it('收尾两帧(frameBak + Delay(4))带 updateGesture,演出主体帧不带(fight.c:5133-5135 TRUE)', () => {
    const frames = build()
    expect(frames[frames.length - 1]!.updateGesture).toBe(true) // Delay(4, 0, TRUE)
    expect(frames[frames.length - 2]!.updateGesture).toBe(true) // frameBak Delay(1, 0, TRUE)
    frames.slice(0, -2).forEach((f) => {
      expect(f.updateGesture).toBeUndefined()
    })
  })
})

describe('buildEnemyConfusedAttackTimeline (M8, fight.c:4596-4654)', () => {
  it('滑步 3 帧逼近(pos=(self+target)/2) + 火花 effectSprite 9-11 中点 + 受击抖动(数字挂首帧) + 复位 attacker', () => {
    const frames = buildEnemyConfusedAttackTimeline({
      attackerIdx: 0,
      attackerPos: { x: 100, y: 100 },
      targetIdx: 1,
      targetPos: { x: 200, y: 160 },
      targetHeight: 0,
      damage: 50,
    })
    // —— 滑步 3 帧:attacker pos = (self+target)/2 累进,Delay(1)(fight.c:4598-4612)——
    expect(frames[0]!.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 150, y: 130 } }])
    expect(frames[0]!.durationMs).toBe(1 * FRAME_MS)
    expect(frames[1]!.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 175, y: 145 } }])
    expect(frames[2]!.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 187, y: 152 } }]) // trunc(375/2),trunc(305/2)
    // —— 火花 3 帧:effectSprite 9/10/11,中点 x=(187+200)/2=193,y=160-0+10=170(fight.c:4614-4632)——
    expect(frames[3]!.overlay).toMatchObject({
      kind: 'effect',
      spriteChunk: EFFECT_SPRITE_CHUNK,
      frameIdx: 9,
      x: 193,
      y: 170,
    })
    expect(frames[4]!.overlay).toMatchObject({ frameIdx: 10, x: 193, y: 170 })
    expect(frames[5]!.overlay).toMatchObject({ frameIdx: 11 })
    // —— 受击:target 抖动(PostMagic)+ 伤害数字挂首帧(fight.c:4647-4648 DisplayStatChange→PostMagic)——
    expect(frames[6]!.damageNum).toEqual({
      target: { kind: 'enemy', idx: 1 },
      value: 50,
      color: 'blue',
    })
    expect(frames[6]!.fighters).toEqual([
      { side: 'enemy', idx: 1, pos: { x: 192, y: 160 }, iColorShift: 0 },
    ]) // 200-8
    expect(frames[7]!.fighters).toEqual([
      { side: 'enemy', idx: 1, pos: { x: 196, y: 160 }, iColorShift: 6 },
    ]) // i1 -(-4)
    // —— 复位 attacker:末帧回 posOriginal,Delay(2)(fight.c:4651-4652)——
    const last = frames[frames.length - 1]!
    expect(last.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 100, y: 100 } }])
    expect(last.durationMs).toBe(2 * FRAME_MS)
  })
})

describe('buildAttackMateTimeline (fight.c:3791-3858 混乱攻友军走入动画)', () => {
  it('windup frame8/0×2 → 走到 target+(30,12) frame8 → frame9+友军击退 pos-(12,6) → 复位', () => {
    const frames = buildAttackMateTimeline({
      casterIdx: 0,
      casterPos: { x: 100, y: 180 },
      targetIdx: 1,
      targetPos: { x: 140, y: 170 },
    })
    // windup: frame 0..3 = 8/0/8/0
    expect(frames[0]!.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 8 }])
    expect(frames[1]!.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 0 }])
    expect(frames[2]!.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 8 }])
    expect(frames[3]!.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 0 }])
    // frame 4 = Delay(2) 无 fighters
    expect(frames[4]!.fighters).toBeUndefined()
    expect(frames[4]!.durationMs).toBe(FRAME_MS * 2)
    // frame 5 = 走到 target+(30,12)=(170,182) frame8 Delay(5)
    expect(frames[5]!.fighters).toEqual([
      { side: 'player', idx: 0, currentFrame: 8, pos: { x: 170, y: 182 } },
    ])
    expect(frames[5]!.durationMs).toBe(FRAME_MS * 5)
    // frame 6 = caster frame9 + 友军击退 target-(12,6)=(128,164)
    expect(frames[6]!.fighters).toContainEqual({
      side: 'player',
      idx: 0,
      currentFrame: 9,
      pos: { x: 170, y: 182 },
    })
    expect(frames[6]!.fighters).toContainEqual({ side: 'player', idx: 1, pos: { x: 128, y: 164 } })
    // frame 7 = 友军 iColorShift 6 闪白
    expect(frames[7]!.fighters).toEqual([
      { side: 'player', idx: 1, iColorShift: 6, pos: { x: 128, y: 164 } },
    ])
    // 末帧 = 复位 caster(100,180) + target(140,170) frame0
    const last = frames[frames.length - 1]!.fighters!
    expect(last).toContainEqual({
      side: 'player',
      idx: 0,
      currentFrame: 0,
      pos: { x: 100, y: 180 },
    })
    expect(last).toContainEqual({
      side: 'player',
      idx: 1,
      currentFrame: 0,
      pos: { x: 140, y: 170 },
    })
  })
})

describe('群攻全敌闪白+收势抖动(fight.c:2196-2247)', () => {
  it('i==0 特效帧全敌 iColorShift=6;收势 3 帧全敌 x-=dist(8→-4→2)且首帧复位染色', () => {
    const frames = buildPlayerAttackTimeline({
      attackerPos: { x: 200, y: 170 },
      attackerIdx: 0,
      targetEnemyPos: { x: 150, y: 100 },
      targetIdx: -1,
      targetEnemyHeight: 0,
      effectFrameBase: 0,
      damage: 0,
      groupEnemies: [
        { idx: 0, x: 90, y: 90 },
        { idx: 1, x: 170, y: 80 },
      ],
    })
    // i==0 特效帧:全敌染色 6
    const flashFrame = frames.find((f) =>
      f.fighters?.some((d) => d.side === 'enemy' && d.iColorShift === 6),
    )
    expect(flashFrame).toBeDefined()
    expect(
      flashFrame!.fighters!.filter((d) => d.side === 'enemy' && d.iColorShift === 6),
    ).toHaveLength(2)
    // 收势 3 帧:全敌位移(累积 -8/-4/-6),首帧带 iColorShift=0
    const recoil = frames.filter((f) =>
      f.fighters?.some((d) => d.side === 'enemy' && d.pos !== undefined),
    )
    expect(recoil).toHaveLength(3)
    const xsOf = (fi: number, idx: number) =>
      recoil[fi]!.fighters!.find((d) => d.side === 'enemy' && d.idx === idx)!.pos!.x
    expect([xsOf(0, 0), xsOf(1, 0), xsOf(2, 0)]).toEqual([90 - 8, 90 - 4, 90 - 6])
    expect([xsOf(0, 1), xsOf(1, 1), xsOf(2, 1)]).toEqual([170 - 8, 170 - 4, 170 - 6])
    expect(recoil[0]!.fighters!.every((d) => d.iColorShift === 0)).toBe(true)
    // y 不动(C 注释掉了 y -= dist/2)
    expect(recoil[2]!.fighters!.find((d) => d.idx === 0)!.pos!.y).toBe(90)
  })

  it('不传 groupEnemies(旧 fixture)→ 收势 3 帧退化为空延时,不染色', () => {
    const frames = buildPlayerAttackTimeline({
      attackerPos: { x: 200, y: 170 },
      attackerIdx: 0,
      targetEnemyPos: { x: 150, y: 100 },
      targetIdx: -1,
      targetEnemyHeight: 0,
      effectFrameBase: 0,
      damage: 0,
    })
    expect(frames.some((f) => f.fighters?.some((d) => d.side === 'enemy'))).toBe(false)
  })
})
