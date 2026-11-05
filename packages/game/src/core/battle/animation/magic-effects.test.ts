/** Spell gestures and effect placement; damage and script execution remain with action callers. Data-level contracts; not browser or visual acceptance. */
import { describe, expect, it } from 'vitest'
import {
  buildEnemyMagicCastIntro,
  buildEnemyMagicTimeline,
  buildPlayerDefMagicTimeline,
  buildPlayerOffMagicTimeline,
  buildPreMagicTimeline,
  buildShowMagicAnimTimeline,
} from '../anim-timeline.js'

const FRAME_MS = 40 // SDLPal battle.h: BATTLE_FPS=25.
const EFFECT_SPRITE_CHUNK = 10 // DATA.MKF built-in hit effects.

describe('buildPreMagicTimeline (fight.c:2337-2445)', () => {
  // caster idx0 站立 (240,170);castEffectFrameBase=35(= rgwBattleEffectIndex[sprite][0]*10+15)。
  const frames = buildPreMagicTimeline({
    casterPos: { x: 240, y: 170 },
    casterIdx: 0,
    castEffectFrameBase: 35,
    isSummon: false,
  })

  it('总帧数 = 4 上移 + Delay(2) + 帧5 + 10 cast + Delay(1) = 17', () => {
    expect(frames).toHaveLength(17)
  })

  it('四步分别取整后累计前移 10、上移 4，停在 (230,166)', () => {
    // i0: x-=4 → 236, y-=2 → 168. i1: x-=3 → 233, y-=1 → 167. i2: x-=2 → 231, y-=1 → 166. i3: x-=1 → 230, y-=0 → 166.
    expect(frames[0]!.fighters).toEqual([{ side: 'player', idx: 0, pos: { x: 236, y: 168 } }])
    expect(frames[1]!.fighters).toEqual([{ side: 'player', idx: 0, pos: { x: 233, y: 167 } }])
    expect(frames[2]!.fighters).toEqual([{ side: 'player', idx: 0, pos: { x: 231, y: 166 } }])
    expect(frames[3]!.fighters).toEqual([{ side: 'player', idx: 0, pos: { x: 230, y: 166 } }])
    expect(frames[0]!.durationMs).toBe(1 * FRAME_MS)
  })

  it('frame4 = Delay(2) 空帧;frame5 = currentFrame=5 施法手势', () => {
    expect(frames[4]!.durationMs).toBe(2 * FRAME_MS)
    expect(frames[4]!.fighters).toBeUndefined()
    expect(frames[5]!.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 5 }])
  })

  // M6 施法音帧同步:castSound 挂在施法姿帧(frame5,前摇 4 移动 + Delay(2) 之后),修"略快"(不在 cast 起手播)。
  it('castSound>0 → 仅 frame5(施法姿)带 sound;前摇移动帧不带', () => {
    const f = buildPreMagicTimeline({
      casterPos: { x: 240, y: 170 },
      casterIdx: 0,
      castEffectFrameBase: 35,
      isSummon: false,
      castSound: 9,
    })
    expect(f[5]!.sound).toBe(9) // 施法姿帧
    expect(f.filter((fr, i) => i !== 5 && fr.sound !== undefined)).toHaveLength(0) // 其余帧无 sound
    // castSound=0/缺 → 不挂
    expect(frames[5]!.sound).toBeUndefined()
  })

  it('10 帧 cast 特效:overlay effect chunk10 frameIdx=base+j 落点上移后 caster (230,166)', () => {
    // frame6..15 = cast 特效 j=0..9
    for (let j = 0; j < 10; j++) {
      const f = frames[6 + j]!
      expect(f.overlay).toMatchObject({
        kind: 'effect',
        spriteChunk: EFFECT_SPRITE_CHUNK,
        frameIdx: 35 + j,
        x: 230,
        y: 166,
      })
      expect(f.durationMs).toBe(1 * FRAME_MS)
    }
  })

  it('末帧 = Delay(1) 收尾', () => {
    expect(frames[16]!.durationMs).toBe(1 * FRAME_MS)
    expect(frames[16]!.overlay).toBeUndefined()
  })

  it('isSummon=true → 跳过 10 帧 cast 特效(总帧 4+1+1+1=7)', () => {
    const fr = buildPreMagicTimeline({
      casterPos: { x: 240, y: 170 },
      casterIdx: 0,
      castEffectFrameBase: 35,
      isSummon: true,
    })
    expect(fr).toHaveLength(7)
    expect(fr.every((f) => f.overlay === undefined)).toBe(true)
  })
})

describe('buildPlayerOffMagicTimeline (fight.c:2608-2844)', () => {
  // n=8, fireDelay=2, effectTimes=1, shake=0 → l = (8-2)*1 + 8 + 0 = 14。
  // speed=2 → durationMs=(2+5)*10=70。type=normal,target enemy pos (160,80),xOff=4,yOff=-6。
  function buildNormal(
    opts: {
      n?: number
      fireDelay?: number
      effectTimes?: number
      shake?: number
      speed?: number
      wave?: number
      keepEffect?: number
      sound?: number
      baseScreenWave?: number
    } = {},
  ) {
    return buildPlayerOffMagicTimeline({
      casterIdx: 0,
      magic: {
        effect: 12,
        type: 'normal',
        speed: opts.speed ?? 2,
        fireDelay: opts.fireDelay ?? 2,
        effectTimes: opts.effectTimes ?? 1,
        shake: opts.shake ?? 0,
        xOffset: 4,
        yOffset: -6,
        wave: opts.wave,
        keepEffect: opts.keepEffect,
        sound: opts.sound,
      },
      n: opts.n ?? 8,
      targetIdx: 1,
      targetEnemyPos: { x: 160, y: 80 },
      baseScreenWave: opts.baseScreenWave,
    })
  }

  // M6 效果音(user 2026-06-05 选 WIN95 式):magic.sound 在 OffMagic **起手帧 i==0** 播一次
  //   (sdlpal WIN95 fight.c:2669-2672 `if (fIsWIN95 && !fSummon && wSound) AUDIO_PlaySound` 在帧循环前)。
  //   CLASSIC 真值是 (i-fireDelay)%n==0 帧(fight.c:2713,命中帧才播)→ user 反馈万剑诀"比剑出现晚、滞后",
  //   故按其选择统一改 WIN95 起手播(声画同步)。**召唤二次 OffMagic 不传 sound → 不受影响**。
  it('效果音(WIN95):sound 只挂 OffMagic 起手帧 i==0(fight.c:2669)', () => {
    const f = buildNormal({ sound: 55 }) // l = (8-2)*1 + 8 + 0 = 14
    const soundFrames = f.map((fr, i) => (fr.sound === 55 ? i : -1)).filter((i) => i >= 0)
    expect(soundFrames).toEqual([1]) // 仅起手帧(WIN95);frames[0] 是 L14 前置 Delay(1)(无 sound)
    // sound=0/缺 → 不挂任何帧
    expect(buildNormal({ sound: 0 }).every((fr) => fr.sound === undefined)).toBe(true)
  })

  it('scriptOnUse 0x35:scriptShake 从 OffMagic 起手帧递减', () => {
    const f = buildPlayerOffMagicTimeline({
      casterIdx: 0,
      magic: {
        effect: 12,
        type: 'normal',
        speed: 2,
        fireDelay: 2,
        effectTimes: 1,
        shake: 0,
        scriptShake: { time: 3, level: 4 },
        xOffset: 0,
        yOffset: 0,
      },
      n: 8,
      targetIdx: 1,
      targetEnemyPos: { x: 160, y: 80 },
    })
    expect(f[0]!.shake).toBeUndefined() // L14 前置 Delay(1) 帧无 shake
    expect(f[1]!.shake).toEqual({ time: 3, level: 4 })
    expect(f[2]!.shake).toEqual({ time: 2, level: 4 })
    expect(f[3]!.shake).toEqual({ time: 1, level: 4 })
    expect(f[4]!.shake).toBeUndefined()
  })

  it('keepEffect:keepEffect==0xFFFF && wave<9 → 仅末帧 keepEffect=true;否则全无(fight.c:2757)', () => {
    const kf = buildNormal({ keepEffect: 0xffff })
    expect(kf[kf.length - 1]!.keepEffect).toBe(true) // 末帧烙背景
    expect(kf.slice(0, -1).every((f) => f.keepEffect === undefined)).toBe(true) // 仅末帧
    expect(
      buildNormal({ keepEffect: 0xffff, wave: 9 }).every((f) => f.keepEffect === undefined),
    ).toBe(true) // wave>=9 不烙
    expect(buildNormal({ keepEffect: 0 }).every((f) => f.keepEffect === undefined)).toBe(true) // 非 0xFFFF 不烙
    expect(buildNormal().every((f) => f.keepEffect === undefined)).toBe(true) // 缺省不烙
  })

  // L17:<9 判定的 wScreenWave = 战场基础屏波(battle.c:1563)+ magic.wWave(fight.c:2666-2667),
  //   而非只看 magic.wWave。11 个 keepEffect 法术 wWave 全=0;唯一 base>=9 的战场是 field 32(screenWave=128)。
  it('keepEffect <9 判定叠加战场基础屏波 baseScreenWave + wWave(fight.c:2757,battle.c:1563)', () => {
    // base=0(陆战)→ (0+0)<9 → 末帧烙背景
    const burn = buildNormal({ keepEffect: 0xffff, baseScreenWave: 0 })
    expect(burn[burn.length - 1]!.keepEffect).toBe(true)
    // base=128(field 32)→ (128+0)>=9 → 不烙(原 TS 只看 wave=0 恒烙,与 C 相反)
    expect(
      buildNormal({ keepEffect: 0xffff, baseScreenWave: 128 }).every(
        (f) => f.keepEffect === undefined,
      ),
    ).toBe(true)
    // 跨 9 边界:base=5 + wWave=5 = 10 >=9 → 不烙;base=5 + wWave=3 = 8 <9 → 烙
    expect(
      buildNormal({ keepEffect: 0xffff, baseScreenWave: 5, wave: 5 }).every(
        (f) => f.keepEffect === undefined,
      ),
    ).toBe(true)
    const edge = buildNormal({ keepEffect: 0xffff, baseScreenWave: 5, wave: 3 })
    expect(edge[edge.length - 1]!.keepEffect).toBe(true)
  })

  it('iBlow:iBlow!=0 → 全体活敌逐帧累加 (blow, trunc(blow/2)),末帧复位 posOriginal(fight.c:2681-2694)', () => {
    const frames = buildPlayerOffMagicTimeline({
      casterIdx: 0,
      magic: {
        effect: 12,
        type: 'normal',
        speed: 2,
        fireDelay: 2,
        effectTimes: 1,
        shake: 0,
        xOffset: 0,
        yOffset: 0,
      },
      n: 8,
      targetIdx: 1,
      targetEnemyPos: { x: 160, y: 80 },
      iBlow: 4,
      blowTargets: [{ side: 'enemy', idx: 0, pos: { x: 100, y: 50 } }],
      rng: { rangeInclusive: (_a: number, _b: number) => 2 }, // blow 恒 2 → 每帧 +2 / +1
    })
    const at = (fi: number): { x: number; y: number } | undefined =>
      frames[fi]!.fighters?.find((f) => f.side === 'enemy' && f.idx === 0)?.pos
    expect(at(0)).toBeUndefined() // L14 前置 Delay(1) 帧无吹飞位移
    expect(at(1)).toEqual({ x: 102, y: 51 }) // 100+2, 50+trunc(2/2)
    expect(at(2)).toEqual({ x: 104, y: 52 }) // 累加
    expect(at(frames.length - 1)).toEqual({ x: 100, y: 50 }) // 末帧复位 posOriginal
  })

  it('iBlow=0 → 不摇 rng + 无 enemy 位移(常见无吹飞法术不污染 rng)', () => {
    let calls = 0
    const frames = buildPlayerOffMagicTimeline({
      casterIdx: 0,
      magic: {
        effect: 12,
        type: 'normal',
        speed: 2,
        fireDelay: 2,
        effectTimes: 1,
        shake: 0,
        xOffset: 0,
        yOffset: 0,
      },
      n: 8,
      targetIdx: 1,
      targetEnemyPos: { x: 160, y: 80 },
      iBlow: 0,
      blowTargets: [{ side: 'enemy', idx: 0, pos: { x: 100, y: 50 } }],
      rng: {
        rangeInclusive: () => {
          calls++
          return 0
        },
      },
    })
    expect(calls).toBe(0) // iBlow=0 → 不摇 blow rng
    expect(frames.every((frame) => !frame.fighters?.some((f) => f.side === 'enemy'))).toBe(true)
  })

  it('wWave:magic.wave>0 → 每帧带 screenWave=wave;wave=0/缺 → 无 screenWave(fight.c:2667)', () => {
    const fw = buildNormal({ wave: 5 })
    expect(fw[0]!.screenWave).toBeUndefined() // L14 前置 Delay(1) 帧无屏波
    expect(fw.slice(1).every((f) => f.screenWave === 5)).toBe(true) // 特效循环全程屏波
    expect(buildNormal().every((f) => f.screenWave === undefined)).toBe(true) // 默认无 wave → 无屏波
    expect(buildNormal({ wave: 0 }).every((f) => f.screenWave === undefined)).toBe(true)
  })

  it('总帧数 l = (n-fireDelay)*effectTimes + n + shake', () => {
    expect(buildNormal()).toHaveLength((8 - 2) * 1 + 8 + 0 + 1) // 14 + 1 L14 前置 Delay(1)
    expect(buildNormal({ n: 8, fireDelay: 2, effectTimes: 2, shake: 3 })).toHaveLength(
      (8 - 2) * 2 + 8 + 3 + 1, // 23 + 1
    )
  })

  it('每帧 durationMs = (speed+5)*10', () => {
    const f = buildNormal({ speed: 2 })
    expect(f[0]!.durationMs).toBe(40) // L14 前置 Delay(1) = 40ms
    expect(f[1]!.durationMs).toBe(70) // 特效帧 (speed+5)*10
    const f3 = buildNormal({ speed: 3 })
    expect(f3[1]!.durationMs).toBe(80)
  })

  it('caster.currentFrame=6 仅在 i==fireDelay 帧(PAL_CLASSIC)', () => {
    const f = buildNormal({ fireDelay: 2 })
    expect(f[0]!.fighters).toBeUndefined() // L14 前置 Delay(1)
    expect(f[1]!.fighters).toBeUndefined()
    expect(f[2]!.fighters).toBeUndefined()
    expect(f[3]!.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 6 }]) // i==fireDelay=2 → frames[1+2]
    expect(f[4]!.fighters).toBeUndefined()
  })

  it('帧 index k:i<n → k=i;i>=n → ((i-fireDelay)%(n-fireDelay))+fireDelay', () => {
    // n=8, fireDelay=2, effectTimes=2, shake=0 → l=(8-2)*2+8=20.
    const f = buildPlayerOffMagicTimeline({
      casterIdx: 0,
      magic: {
        effect: 12,
        type: 'normal',
        speed: 2,
        fireDelay: 2,
        effectTimes: 2,
        shake: 0,
        xOffset: 0,
        yOffset: 0,
      },
      n: 8,
      targetIdx: 1,
      targetEnemyPos: { x: 160, y: 80 },
    })
    // frames[0] 是 L14 前置 Delay(1);循环 i 对应 frames[i+1]。i=0..7 → k=i
    expect(f[1]!.overlays![0]!.frameIdx).toBe(0)
    expect(f[8]!.overlays![0]!.frameIdx).toBe(7)
    // i=8 → ((8-2)%(8-2))+2 = (6%6)+2 = 0+2 = 2
    expect(f[9]!.overlays![0]!.frameIdx).toBe(2)
    // i=9 → ((9-2)%6)+2 = (7%6)+2 = 1+2 = 3
    expect(f[10]!.overlays![0]!.frameIdx).toBe(3)
    // i=14 → ((14-2)%6)+2 = (12%6)+2 = 0+2 = 2
    expect(f[15]!.overlays![0]!.frameIdx).toBe(2)
  })

  it('normal 落点 = enemy.pos + (xOff,yOff) = (164,74),overlay kind=magic chunk=effect', () => {
    const f = buildNormal()
    expect(f[1]!.overlays).toMatchObject([
      { kind: 'magic', spriteChunk: 12, frameIdx: 0, x: 164, y: 74 },
    ]) // frames[0] 是 L14 前置 Delay(1)
  })

  it('attackAll:三落点 {70,140}{100,110}{160,100} 各 +off → overlays[3] 同帧', () => {
    const f = buildPlayerOffMagicTimeline({
      casterIdx: 0,
      magic: {
        effect: 20,
        type: 'attackAll',
        speed: 0,
        fireDelay: 0,
        effectTimes: 1,
        shake: 0,
        xOffset: 5,
        yOffset: 10,
      },
      n: 4,
      targetIdx: -1,
    })
    expect(f[1]!.overlays).toMatchObject([
      // frames[0] 是 L14 前置 Delay(1)
      { kind: 'magic', spriteChunk: 20, frameIdx: 0, x: 75, y: 150 },
      { kind: 'magic', spriteChunk: 20, frameIdx: 0, x: 105, y: 120 },
      { kind: 'magic', spriteChunk: 20, frameIdx: 0, x: 165, y: 110 },
    ])
  })

  it('attackWhole:(120,100)+off ; attackField:(160,200)+off', () => {
    const fw = buildPlayerOffMagicTimeline({
      casterIdx: 0,
      magic: {
        effect: 30,
        type: 'attackWhole',
        speed: 0,
        fireDelay: 0,
        effectTimes: 1,
        shake: 0,
        xOffset: 0,
        yOffset: 0,
      },
      n: 4,
      targetIdx: -1,
    })
    expect(fw[1]!.overlays).toMatchObject([
      // frames[0] 是 L14 前置 Delay(1)
      { kind: 'magic', spriteChunk: 30, frameIdx: 0, x: 120, y: 100 },
    ])
    const ff = buildPlayerOffMagicTimeline({
      casterIdx: 0,
      magic: {
        effect: 31,
        type: 'attackField',
        speed: 0,
        fireDelay: 0,
        effectTimes: 1,
        shake: 0,
        xOffset: 0,
        yOffset: 0,
      },
      n: 4,
      targetIdx: -1,
    })
    expect(ff[1]!.overlays).toMatchObject([
      // frames[0] 是 L14 前置 Delay(1)
      { kind: 'magic', spriteChunk: 31, frameIdx: 0, x: 160, y: 200 },
    ])
  })

  it('shake 区末 shake 帧:带 shake{time:i,level:3} + 定帧 k=(l-shake-1)%n', () => {
    // n=8, fireDelay=2, effectTimes=1, shake=3 → l=(8-2)*1+8+3=17. shake 区 = 末 3 帧 i=14,15,16.
    const f = buildNormal({ n: 8, fireDelay: 2, effectTimes: 1, shake: 3 })
    expect(f).toHaveLength(18) // 17 + 1 L14 前置 Delay(1)
    // frames[0] 是前置 Delay(1);循环 i 对应 frames[i+1]。非 shake 区 i=13 → frames[14]:l-i=4 > shake=3 → 无 shake
    expect(f[14]!.shake).toBeUndefined()
    // shake 区 i=14 → frames[15]:l-i=3 <= shake=3 → 带 shake;k=(17-3-1)%8 = 13%8 = 5
    expect(f[15]!.shake).toEqual({ time: 14, level: 3 })
    expect(f[15]!.overlays![0]!.frameIdx).toBe(5)
    expect(f[17]!.shake).toEqual({ time: 16, level: 3 })
  })
})

describe('buildPlayerDefMagicTimeline (fight.c:2447-2606)', () => {
  // applyToPlayer:target 队员 idx1 站立 (180,150);n=5;speed=2 → magic 帧 (2+5)*10=70。
  // xOff=4, yOff=-6 → 落点 (184,144)。
  function buildToPlayer(opts: { n?: number; speed?: number } = {}) {
    return buildPlayerDefMagicTimeline({
      casterIdx: 0,
      magic: { effect: 15, type: 'applyToPlayer', speed: opts.speed ?? 2, xOffset: 4, yOffset: -6 },
      n: opts.n ?? 5,
      targetPlayerIdx: 1,
      targetPlayerPos: { x: 180, y: 150 },
    })
  }

  it('总帧数 = 1(caster 帧6)+ n + 13(辉光,DL31)', () => {
    expect(buildToPlayer({ n: 5 })).toHaveLength(1 + 5 + 13) // 19
    expect(buildToPlayer({ n: 8 })).toHaveLength(1 + 8 + 13) // 22
  })

  it('frame0:caster.currentFrame=6,Delay(1)', () => {
    const f = buildToPlayer()
    expect(f[0]!.durationMs).toBe(1 * FRAME_MS)
    expect(f[0]!.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 6 }])
    expect(f[0]!.overlays).toBeUndefined()
  })

  it('magic 帧:frameIdx=i 直放,落点 target.pos+(xOff,yOff)=(184,144),durationMs=(speed+5)*10', () => {
    const f = buildToPlayer({ n: 5, speed: 2 })
    // frame1..5 = magic sprite i=0..4
    for (let i = 0; i < 5; i++) {
      const mf = f[1 + i]!
      expect(mf.durationMs).toBe(70)
      expect(mf.overlays).toMatchObject([
        { kind: 'magic', spriteChunk: 15, frameIdx: i, x: 184, y: 144 },
      ])
    }
  })

  it('辉光 13 帧:iColorShift 0..5 升 + 6..0 降(峰值一次,fight.c:2573-2605;DL31)', () => {
    const f = buildToPlayer({ n: 5 })
    const glow = f.slice(1 + 5) // 末 13 帧
    expect(glow).toHaveLength(13)
    const expectedShifts = [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0]
    glow.forEach((gf, idx) => {
      expect(gf.durationMs).toBe(1 * FRAME_MS)
      expect(gf.fighters).toEqual([{ side: 'player', idx: 1, iColorShift: expectedShifts[idx] }])
    })
  })

  // 效果音声画同步(fight.c:2497-2502):WIN95 在特效帧循环 i==0 播 AUDIO_PlaySound(magic.wSound)。
  // 之前 magic.ts 即时 push → 音效在 PreMagic 前摇时就响,先闻其声后见其形(user 2026-06-13 报气疗术)。
  it('magic.sound > 0 → 挂特效首帧(frames[1],caster帧6 之后);其余帧无 sound', () => {
    const f = buildPlayerDefMagicTimeline({
      casterIdx: 0,
      magic: { effect: 15, type: 'applyToPlayer', speed: 2, xOffset: 4, yOffset: -6, sound: 335 },
      n: 5,
      targetPlayerIdx: 1,
      targetPlayerPos: { x: 180, y: 150 },
    })
    expect(f[0]!.sound).toBeUndefined() // caster 帧6(循环前,fight.c:2492)不带
    expect(f[1]!.sound).toBe(335) // 特效 i==0
    f.forEach((fr, i) => {
      if (i !== 1) expect(fr.sound).toBeUndefined()
    })
  })

  it('magic.sound 缺省/0 → 全帧无 sound', () => {
    expect(buildToPlayer().every((fr) => fr.sound === undefined)).toBe(true)
  })

  it('applyToParty:落点对每个队员各放一份(overlays 多落点);辉光设全队员', () => {
    const f = buildPlayerDefMagicTimeline({
      casterIdx: 0,
      magic: { effect: 16, type: 'applyToParty', speed: 0, xOffset: 0, yOffset: 0 },
      n: 3,
      targetPlayerIdx: -1,
      partyPlayerPositions: [
        { idx: 0, pos: { x: 240, y: 170 } },
        { idx: 1, pos: { x: 200, y: 150 } },
        { idx: 2, pos: { x: 160, y: 130 } },
      ],
    })
    // frame0=caster帧6; frame1..3 = magic; frame4..16 = 13 帧辉光
    const mf = f[1]!
    expect(mf.overlays).toMatchObject([
      { kind: 'magic', spriteChunk: 16, frameIdx: 0, x: 240, y: 170 },
      { kind: 'magic', spriteChunk: 16, frameIdx: 0, x: 200, y: 150 },
      { kind: 'magic', spriteChunk: 16, frameIdx: 0, x: 160, y: 130 },
    ])
    // 辉光首帧:全队员 iColorShift=0
    const glow0 = f[4]!
    expect(glow0.fighters).toEqual([
      { side: 'player', idx: 0, iColorShift: 0 },
      { side: 'player', idx: 1, iColorShift: 0 },
      { side: 'player', idx: 2, iColorShift: 0 },
    ])
    // 辉光峰值帧(i=6)全队员 iColorShift=6
    const glowPeak = f[4 + 6]!
    expect(glowPeak.fighters).toEqual([
      { side: 'player', idx: 0, iColorShift: 6 },
      { side: 'player', idx: 1, iColorShift: 6 },
      { side: 'player', idx: 2, iColorShift: 6 },
    ])
  })
})

describe('buildEnemyMagicTimeline (fight.c:2846-3069)', () => {
  // n=8, fireDelay=2, effectTimes=1, shake=0 → l=(8-2)*1+8=14。speed=2 → durationMs=70。
  // type=normal,target player pos (240,170),xOff=4,yOff=-6 → 落点 (244,164)。
  // enemy idleFrames=4, magicFrames=2, attackFrames=3。
  function buildNormal(
    opts: {
      n?: number
      fireDelay?: number
      effectTimes?: number
      shake?: number
      speed?: number
      idleFrames?: number
      magicFrames?: number
      attackFrames?: number
    } = {},
  ) {
    return buildEnemyMagicTimeline({
      enemyCasterIdx: 0,
      magic: {
        effect: 12,
        type: 'normal',
        speed: opts.speed ?? 2,
        fireDelay: opts.fireDelay ?? 2,
        effectTimes: opts.effectTimes ?? 1,
        shake: opts.shake ?? 0,
        xOffset: 4,
        yOffset: -6,
      },
      n: opts.n ?? 8,
      enemy: {
        idleFrames: opts.idleFrames ?? 4,
        magicFrames: opts.magicFrames ?? 2,
        attackFrames: opts.attackFrames ?? 3,
      },
      targetPlayerIdx: 1,
      targetPlayerPos: { x: 240, y: 170 },
    })
  }

  it('总帧数 l = (n-fireDelay)*effectTimes + n + shake(OffMagic 镜像公式)', () => {
    expect(buildNormal()).toHaveLength((8 - 2) * 1 + 8 + 0) // 14
    expect(buildNormal({ effectTimes: 2, shake: 3 })).toHaveLength((8 - 2) * 2 + 8 + 3) // 23
  })

  it('每帧 durationMs = (speed+5)*10', () => {
    expect(buildNormal({ speed: 2 })[0]!.durationMs).toBe(70)
    expect(buildNormal({ speed: 3 })[0]!.durationMs).toBe(80)
  })

  it('帧 index k:i<n → k=i;i>=n → ((i-fireDelay)%(n-fireDelay))+fireDelay', () => {
    // n=8, fireDelay=2, effectTimes=2 → l=20.
    const f = buildNormal({ effectTimes: 2 })
    expect(f[0]!.overlays![0]!.frameIdx).toBe(0)
    expect(f[7]!.overlays![0]!.frameIdx).toBe(7)
    // i=8 → ((8-2)%6)+2 = 0+2 = 2
    expect(f[8]!.overlays![0]!.frameIdx).toBe(2)
    // i=9 → ((9-2)%6)+2 = 1+2 = 3
    expect(f[9]!.overlays![0]!.frameIdx).toBe(3)
  })

  it('敌施法帧:fireDelay>0 且 fireDelay<=i<fireDelay+attackFrames → currentFrame=i-fireDelay+idleFrames+magicFrames', () => {
    // fireDelay=2, attackFrames=3, idleFrames=4, magicFrames=2 → 施法帧区 i=2,3,4.
    const f = buildNormal({ fireDelay: 2, attackFrames: 3, idleFrames: 4, magicFrames: 2 })
    // i=2 → currentFrame = 2-2+4+2 = 6
    expect(f[2]!.fighters).toEqual([{ side: 'enemy', idx: 0, currentFrame: 6 }])
    // i=3 → 3-2+4+2 = 7
    expect(f[3]!.fighters).toEqual([{ side: 'enemy', idx: 0, currentFrame: 7 }])
    // i=4 → 4-2+4+2 = 8
    expect(f[4]!.fighters).toEqual([{ side: 'enemy', idx: 0, currentFrame: 8 }])
    // i=1(< fireDelay)无施法帧
    expect(f[1]!.fighters).toBeUndefined()
    // i=5(= fireDelay+attackFrames)无施法帧
    expect(f[5]!.fighters).toBeUndefined()
  })

  it('fireDelay=0:不产敌施法帧(gate fireDelay>0)', () => {
    const f = buildNormal({ fireDelay: 0, attackFrames: 3, n: 8, effectTimes: 1 })
    expect(f.every((fr) => fr.fighters === undefined)).toBe(true)
  })

  it('normal 落点 = player.pos + (xOff,yOff) = (244,164),overlay kind=magic chunk=effect', () => {
    const f = buildNormal()
    expect(f[0]!.overlays).toMatchObject([
      { kind: 'magic', spriteChunk: 12, frameIdx: 0, x: 244, y: 164 },
    ])
  })

  // 效果音声画同步(fight.c:2925-2930):WIN95 在特效帧循环 i==0 播 AUDIO_PlaySound(magic.wSound)
  // (gate e.wMagicSound>=0 由调用方决定传不传 sound)。之前 magic.ts 即时 push → 音效在敌人
  // 前移/施法手势(intro)时就响(user 2026-06-13 报草妖风咒)。
  it('magic.sound > 0 → 挂特效循环首帧(frames[0]);其余帧无 sound', () => {
    const f = buildEnemyMagicTimeline({
      enemyCasterIdx: 0,
      magic: {
        effect: 12,
        type: 'normal',
        speed: 2,
        fireDelay: 2,
        effectTimes: 1,
        shake: 0,
        xOffset: 4,
        yOffset: -6,
        sound: 99,
      },
      n: 8,
      enemy: { idleFrames: 4, magicFrames: 2, attackFrames: 3 },
      targetPlayerIdx: 1,
      targetPlayerPos: { x: 240, y: 170 },
    })
    expect(f[0]!.sound).toBe(99)
    f.forEach((fr, i) => {
      if (i !== 0) expect(fr.sound).toBeUndefined()
    })
  })

  it('magic.sound 缺省/0 → 全帧无 sound', () => {
    expect(buildNormal().every((fr) => fr.sound === undefined)).toBe(true)
  })

  it('attackAll:三落点 {180,180}{234,170}{270,146} 各 +off → overlays[3] 同帧(敌方坐标,异于 OffMagic)', () => {
    const f = buildEnemyMagicTimeline({
      enemyCasterIdx: 0,
      magic: {
        effect: 20,
        type: 'attackAll',
        speed: 0,
        fireDelay: 0,
        effectTimes: 1,
        shake: 0,
        xOffset: 5,
        yOffset: 10,
      },
      n: 4,
      enemy: { idleFrames: 4, magicFrames: 0, attackFrames: 0 },
      targetPlayerIdx: -1,
    })
    expect(f[0]!.overlays).toMatchObject([
      { kind: 'magic', spriteChunk: 20, frameIdx: 0, x: 185, y: 190 },
      { kind: 'magic', spriteChunk: 20, frameIdx: 0, x: 239, y: 180 },
      { kind: 'magic', spriteChunk: 20, frameIdx: 0, x: 275, y: 156 },
    ])
  })

  it('attackWhole:(240,150)+off ; attackField:(160,200)+off(敌方坐标)', () => {
    const fw = buildEnemyMagicTimeline({
      enemyCasterIdx: 0,
      magic: {
        effect: 30,
        type: 'attackWhole',
        speed: 0,
        fireDelay: 0,
        effectTimes: 1,
        shake: 0,
        xOffset: 0,
        yOffset: 0,
      },
      n: 4,
      enemy: { idleFrames: 4, magicFrames: 0, attackFrames: 0 },
      targetPlayerIdx: -1,
    })
    expect(fw[0]!.overlays).toMatchObject([
      { kind: 'magic', spriteChunk: 30, frameIdx: 0, x: 240, y: 150 },
    ])
    const ff = buildEnemyMagicTimeline({
      enemyCasterIdx: 0,
      magic: {
        effect: 31,
        type: 'attackField',
        speed: 0,
        fireDelay: 0,
        effectTimes: 1,
        shake: 0,
        xOffset: 0,
        yOffset: 0,
      },
      n: 4,
      enemy: { idleFrames: 4, magicFrames: 0, attackFrames: 0 },
      targetPlayerIdx: -1,
    })
    expect(ff[0]!.overlays).toMatchObject([
      { kind: 'magic', spriteChunk: 31, frameIdx: 0, x: 160, y: 200 },
    ])
  })

  it('shake 区末 shake 帧:带 shake{time:i,level:3} + 定帧 k=(l-shake-1)%n;施法帧 gate 仅非 shake 区', () => {
    // n=8, fireDelay=2, effectTimes=1, shake=3 → l=17. shake 区 = 末 3 帧 i=14,15,16.
    const f = buildNormal({ n: 8, fireDelay: 2, effectTimes: 1, shake: 3 })
    expect(f).toHaveLength(17)
    expect(f[13]!.shake).toBeUndefined()
    expect(f[14]!.shake).toEqual({ time: 14, level: 3 })
    // k=(17-3-1)%8 = 13%8 = 5
    expect(f[14]!.overlays![0]!.frameIdx).toBe(5)
    expect(f[16]!.shake).toEqual({ time: 16, level: 3 })
    // shake 区不产施法帧(fight.c:2932-2938 在 l-i>shake 分支内)
    expect(f[14]!.fighters).toBeUndefined()
  })

  it('iBlow:iBlow!=0 → 全体队员逐帧累加 (blow, trunc(blow/2)),末帧复位 posOriginal(fight.c:2901-2909)', () => {
    const frames = buildEnemyMagicTimeline({
      enemyCasterIdx: 0,
      magic: {
        effect: 12,
        type: 'normal',
        speed: 2,
        fireDelay: 2,
        effectTimes: 1,
        shake: 0,
        xOffset: 0,
        yOffset: 0,
      },
      n: 8,
      enemy: { idleFrames: 4, magicFrames: 2, attackFrames: 3 },
      targetPlayerIdx: 1,
      targetPlayerPos: { x: 240, y: 170 },
      iBlow: 4,
      blowTargets: [{ side: 'player', idx: 0, pos: { x: 120, y: 180 } }],
      rng: { rangeInclusive: (_a: number, _b: number) => 2 }, // blow 恒 2 → 每帧 +2 / +1
    })
    const at = (fi: number): { x: number; y: number } | undefined =>
      frames[fi]!.fighters?.find((f) => f.side === 'player' && f.idx === 0)?.pos
    expect(at(0)).toEqual({ x: 122, y: 181 }) // 120+2, 180+trunc(2/2)
    expect(at(1)).toEqual({ x: 124, y: 182 }) // 累加
    expect(at(frames.length - 1)).toEqual({ x: 120, y: 180 }) // 末帧复位 posOriginal
  })

  it('iBlow=0 → 不摇 rng + 无队员位移(常见无吹飞敌法术不污染 rng)', () => {
    let calls = 0
    const frames = buildEnemyMagicTimeline({
      enemyCasterIdx: 0,
      magic: {
        effect: 12,
        type: 'normal',
        speed: 2,
        fireDelay: 2,
        effectTimes: 1,
        shake: 0,
        xOffset: 0,
        yOffset: 0,
      },
      n: 8,
      enemy: { idleFrames: 4, magicFrames: 2, attackFrames: 3 },
      targetPlayerIdx: 1,
      targetPlayerPos: { x: 240, y: 170 },
      iBlow: 0,
      blowTargets: [{ side: 'player', idx: 0, pos: { x: 120, y: 180 } }],
      rng: {
        rangeInclusive: () => {
          calls++
          return 0
        },
      },
    })
    expect(calls).toBe(0) // iBlow=0 → 不摇 blow rng
    expect(frames.every((frame) => !frame.fighters?.some((f) => f.side === 'player'))).toBe(true)
  })
})

describe('buildEnemyMagicCastIntro (fight.c:4680-4717)', () => {
  // 林月如 enemy82:idleFrames=1 / magicFrames=0 / attackFrames=4 / actWaitFrames=1;magic360→鞭击 fireDelay=0。
  // user 2026-05-31:她施法时「完全不动、不位移」—— 真因是漏 port 这段施法起手(前移 + attackFrames 手势)。
  const f = buildEnemyMagicCastIntro({
    enemyCasterIdx: 0,
    enemyPos: { x: 100, y: 80 },
    idleFrames: 1,
    magicFrames: 0,
    attackFrames: 4,
    actWaitFrames: 1,
    fireDelay: 0,
  })

  it('前移 2 帧:pos += (12,6) → += (4,2)(fight.c:4683-4693)', () => {
    expect(f[0]!.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 112, y: 86 } }])
    expect(f[1]!.fighters).toEqual([{ side: 'enemy', idx: 0, pos: { x: 116, y: 88 } }])
    expect(f[0]!.durationMs).toBe(FRAME_MS)
  })

  it('magicFrames==0 → 补 1 帧停顿(fight.c:4704-4707)', () => {
    // 前移 2 帧后,magicFrames=0 → 无手势帧 → 第 3 帧是纯停顿(无 fighters)
    expect(f[2]!.fighters).toBeUndefined()
    expect(f[2]!.durationMs).toBe(FRAME_MS)
  })

  it('fireDelay==0 → attackFrames 手势 currentFrame 0,1,2,3,4(fight.c:4709-4717)', () => {
    // f[3..7] = 5 帧手势(i=0..4),currentFrame = i-1+idleFrames(1)+magicFrames(0) = i
    const gesture = f.slice(3).map((fr) => fr.fighters?.[0]?.currentFrame)
    expect(gesture).toEqual([0, 1, 2, 3, 4]) // ★ 这就是林月如施法时该动的帧
  })

  it('magicFrames>0:用 magicFrames 帧手势 currentFrame=idleFrames+i,且不补停顿帧', () => {
    const g = buildEnemyMagicCastIntro({
      enemyCasterIdx: 1,
      enemyPos: { x: 0, y: 0 },
      idleFrames: 2,
      magicFrames: 3,
      attackFrames: 0,
      actWaitFrames: 2,
      fireDelay: 5,
    })
    // 前移 2 帧 + magicFrames=3 手势(currentFrame 2,3,4);fireDelay=5(!=0)→ 无 attackFrames 段;magicFrames!=0 → 无停顿帧
    expect(g).toHaveLength(5)
    expect(g.slice(2).map((fr) => fr.fighters?.[0]?.currentFrame)).toEqual([2, 3, 4])
  })
})

describe('buildShowMagicAnimTimeline (0x92, script.c:2637-2662)', () => {
  // caster idx0 站立 (240,170);castEffectFrameBase=35;全队 3 人(idx 0/1/2)。
  const frames = buildShowMagicAnimTimeline({
    casterPos: { x: 240, y: 170 },
    casterIdx: 0,
    castEffectFrameBase: 35,
    partyIndices: [0, 1, 2],
  })

  it('总帧数 = 17 preMagic + 1 frame6 + 5 iColorShift + 1 reset = 24', () => {
    expect(frames).toHaveLength(24)
  })

  it('脚本施法前摇保留四步位置、停顿、施法姿和十帧效果', () => {
    expect(frames.slice(0, 4).map((frame) => frame.fighters)).toEqual([
      [{ side: 'player', idx: 0, pos: { x: 236, y: 168 } }],
      [{ side: 'player', idx: 0, pos: { x: 233, y: 167 } }],
      [{ side: 'player', idx: 0, pos: { x: 231, y: 166 } }],
      [{ side: 'player', idx: 0, pos: { x: 230, y: 166 } }],
    ])
    expect(frames[4]).toEqual({ durationMs: 80 })
    expect(frames[5]).toEqual({
      durationMs: 40,
      fighters: [{ side: 'player', idx: 0, currentFrame: 5 }],
    })
    expect(frames.slice(6, 16).map((frame) => frame.overlay?.frameIdx)).toEqual([
      35, 36, 37, 38, 39, 40, 41, 42, 43, 44,
    ])
    expect(
      frames
        .slice(6, 16)
        .every(
          (frame) =>
            frame.durationMs === 40 &&
            frame.overlay?.spriteChunk === 10 &&
            frame.overlay.x === 230 &&
            frame.overlay.y === 166,
        ),
    ).toBe(true)
    expect(frames[16]).toEqual({ durationMs: 40 })
  })

  it('frame17:施法者 wCurrentFrame=6(script.c:2646)', () => {
    expect(frames[17]!.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 6 }])
  })

  it('frame18..22:全队 5 步 iColorShift=i*2(0/2/4/6/8,script.c:2649-2656)', () => {
    for (let i = 0; i < 5; i++) {
      expect(frames[18 + i]!.fighters).toEqual([
        { side: 'player', idx: 0, iColorShift: i * 2 },
        { side: 'player', idx: 1, iColorShift: i * 2 },
        { side: 'player', idx: 2, iColorShift: i * 2 },
      ])
      expect(frames[18 + i]!.durationMs).toBe(1 * FRAME_MS)
    }
  })

  it('末帧:全队 iColorShift 复位 0(BattleFadeScene 重绘)', () => {
    expect(frames[23]!.fighters).toEqual([
      { side: 'player', idx: 0, iColorShift: 0 },
      { side: 'player', idx: 1, iColorShift: 0 },
      { side: 'player', idx: 2, iColorShift: 0 },
    ])
  })
})
