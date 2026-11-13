/** Spell gestures and effect placement; damage and script execution remain with action callers. */
import type { BattleAnimFrame, BattleAnimOverlay, FighterDelta } from '../battle-state.js'
import { delayMs, EFFECT_SPRITE_CHUNK } from './frames.js'

function timedScriptShake(
  i: number,
  scriptShake: { time: number; level: number } | undefined,
): BattleAnimFrame['shake'] {
  if (!scriptShake || scriptShake.time <= 0) return undefined
  if (i >= scriptShake.time) return undefined
  return { time: scriptShake.time - i, level: scriptShake.level }
}

export interface BuildPreMagicInput {
  /** caster 站立底锚(g_Battle.rgPlayer[idx].pos)。 */
  casterPos: { x: number; y: number }
  /** caster idx(players[])。 */
  casterIdx: number
  /**
   * 施法 cast 特效帧基号 = rgwBattleEffectIndex[battleSpriteId][0] * 10 + 15(fight.c:2387-2389)。
   * 调用方先查表算好传入;非 summon 时该 10 帧 lpEffectSprite(DATA.MKF chunk 10)叠到 caster 头顶。
   */
  castEffectFrameBase: number
  /** 召唤路径传 true,跳过 10 帧 cast 特效；普通攻击、治疗和变身传 false。 */
  isSummon: boolean
  /** M6 施法音(rgwMagicSound[role]):挂到"施法姿"帧(fight.c:2375-2377 CLASSIC,前摇后才播)。0/缺 = 不挂。 */
  castSound?: number
}

/**
 * player PreMagic 动画时间线(port fight.c:2337-2445 PAL_BattleShowPlayerPreMagicAnim)。
 *
 *   - i=0..3:caster 上移 4 帧,pos.x-=(4-i),pos.y-=(4-i)/2,各 Delay(1)(fight.c:2363-2370)
 *   - Delay(2)(fight.c:2372)
 *   - currentFrame=5(施法手势,fight.c:2374)
 *   - 非 summon:10 帧 cast 特效(fight.c:2394-2441),overlay kind='effect' chunk10,
 *     frameIdx = castEffectFrameBase + j,落点 caster 头顶 (caster_x, caster_y),各 Delay(1)
 *   - Delay(1)(fight.c:2444)
 *
 * 注:cast 特效落点 sdlpal 用上移后的 caster pos(fight.c:2384-2385 x/y = 当前 pos);
 *     每一步先整除再累加，上移后为 (casterX - 10, casterY - 4)，不是把总和除以 2。
 */
export function buildPreMagicTimeline(input: BuildPreMagicInput): BattleAnimFrame[] {
  const { casterPos, casterIdx, castEffectFrameBase, isSummon, castSound } = input
  const frames: BattleAnimFrame[] = []

  // —— i=0..3:上移 4 帧(fight.c:2363-2370)——
  let cx = casterPos.x
  let cy = casterPos.y
  for (let i = 0; i < 4; i++) {
    cx -= 4 - i
    cy -= Math.trunc((4 - i) / 2)
    frames.push({
      durationMs: delayMs(1),
      fighters: [{ side: 'player', idx: casterIdx, pos: { x: cx, y: cy } }],
    })
  }

  // —— Delay(2)(fight.c:2372)——
  frames.push({ durationMs: delayMs(2) })

  // —— currentFrame=5(施法手势,fight.c:2374)+ 施法音(fight.c:2375-2377 CLASSIC,前摇后才播)——
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'player', idx: casterIdx, currentFrame: 5 }],
    ...(castSound && castSound > 0 ? { sound: castSound } : {}),
  })

  // —— 非 summon:10 帧 cast 特效(fight.c:2394-2441),落点上移后 caster pos ——
  if (!isSummon) {
    for (let j = 0; j < 10; j++) {
      frames.push({
        durationMs: delayMs(1),
        overlay: {
          kind: 'effect',
          spriteChunk: EFFECT_SPRITE_CHUNK,
          frameIdx: castEffectFrameBase + j,
          x: cx,
          y: cy,
        },
      })
    }
  }

  // —— Delay(1)(fight.c:2444)——
  frames.push({ durationMs: delayMs(1) })

  return frames
}

export interface BuildShowMagicAnimInput {
  casterPos: { x: number; y: number }
  casterIdx: number
  /** rgwBattleEffectIndex[battleSprite][0]*10+15(caller 算好,fight.c:2387-2389)。 */
  castEffectFrameBase: number
  /** 全体在场队员 idx(iColorShift cycle 作用对象,sdlpal j=0..wMaxPartyMemberIndex)。 */
  partyIndices: number[]
}

/**
 * sdlpal `script.c:2637-2662 (0x0092)` show-magic-casting-anim 1:1 port(scripted 施法前摇,
 * 如赵灵儿力量觉醒 cutscene)。
 *  - PreMagic 上移 4 帧 + 施法姿 + 10 帧 cast 特效(buildPreMagicTimeline,fight.c:2363-2444)
 *  - caster wCurrentFrame=6(script.c:2646)
 *  - 全队 5 步 iColorShift=i*2 cycle(script.c:2649-2656,"力量觉醒"白闪蓄势)
 *  - 末复位 iColorShift=0(对齐 BattleFadeScene 后正常色;ts present 自动重绘)
 */
export function buildShowMagicAnimTimeline(input: BuildShowMagicAnimInput): BattleAnimFrame[] {
  const { casterPos, casterIdx, castEffectFrameBase, partyIndices } = input
  const frames = buildPreMagicTimeline({
    casterPos,
    casterIdx,
    castEffectFrameBase,
    isSummon: false,
  })
  // script.c:2646:施法者 wCurrentFrame=6
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'player', idx: casterIdx, currentFrame: 6 }],
  })
  // script.c:2649-2656:全队 5 步 iColorShift=i*2(0/2/4/6/8)
  for (let i = 0; i < 5; i++) {
    frames.push({
      durationMs: delayMs(1),
      fighters: partyIndices.map((idx) => ({ side: 'player' as const, idx, iColorShift: i * 2 })),
    })
  }
  // 末复位(BattleFadeScene 重绘 → 正常色)
  frames.push({
    durationMs: delayMs(1),
    fighters: partyIndices.map((idx) => ({ side: 'player' as const, idx, iColorShift: 0 })),
  })
  return frames
}

export interface BuildOffMagicInput {
  /** caster slot(players[])；合击和召唤的二次特效传 -1，不切换施法者姿势。 */
  casterIdx: number
  /** 解析后的 magic 参数(对照 sdlpal `lprgMagic[iMagicNum]`)。 */
  magic: {
    /** FIRE.MKF chunk 号(= overlay.spriteChunk)。 */
    effect: number
    /** DM9:MAGIC.special(非 summon 语义 = sLayerOffset,SHORT;z 排序)。 */
    special?: number
    /** 法术类型(落点分支)。 */
    type: 'normal' | 'attackAll' | 'attackWhole' | 'attackField'
    /** SHORT — (speed+5)*10 = 帧 durationMs。 */
    speed: number
    /** wFireDelay — 帧循环 / 总帧数。 */
    fireDelay: number
    /** wEffectTimes — 总帧数循环次数。 */
    effectTimes: number
    /** wShake — 末尾震屏帧数。 */
    shake: number
    /** scriptOnUse 0x35 ShakeScreen — 从 OffMagic 起始帧开始抖,避免 PreMagic 阶段先抖。 */
    scriptShake?: { time: number; level: number }
    /** wXOffset / wYOffset — 落点偏移。 */
    xOffset: number
    yOffset: number
    /** W4 wWave — 动画期间 wScreenWave += 此值(屏波扭曲);0/缺 = 无屏波(陆战常 0)。fight.c:2667/2895。 */
    wave?: number
    /** W4 wKeepEffect — ==0xFFFF 时末帧把魔法精灵烙进战斗背景(持久);其它值/缺 = 不烙。fight.c:2758/2983。 */
    keepEffect?: number
    /** 法术效果音；按用户确定的 WIN95 时序在特效首帧播放，0/缺 = 无音。 */
    sound?: number
  }
  /** FIRE.MKF chunk[effect] 帧数 n(performMagic 从 fire-sprites.json 取)。 */
  n: number
  /** 单体目标 enemy idx(type=normal 用);全体类型时无意义传 -1。 */
  targetIdx: number
  /** 单体目标 enemy 落点(type=normal 用;EnemyPos + yPosOffset 底锚)。type 全体时可传 undefined。 */
  targetEnemyPos?: { x: number; y: number }
  /**
   * 吹飞强度(g_Battle.iBlow,fight.c:2681)。每帧 blow = iBlow>0?RandomLong(0,iBlow):RandomLong(iBlow,0),
   * 全体受击方逐帧累加 (x+=blow, y+=trunc(blow/2)),末帧复位 posOriginal(fight.c:2840+)。
   * iBlow==0 时不抽样：SDLPal util.c 的 RandomLong(0,0) 直接返回 0，同样不推进随机状态。
   */
  iBlow?: number
  /** W4 iBlow:受吹飞的对象(player off-magic = 全体活敌;含 posOriginal 底锚)。空/缺 → 不吹飞。 */
  blowTargets?: Array<{ side: 'player' | 'enemy'; idx: number; pos: { x: number; y: number } }>
  /** W4 iBlow:每帧 blow 取值 rng(仅 iBlow!=0 用);缺 → 不吹飞。 */
  rng?: { rangeInclusive: (a: number, b: number) => number }
  /**
   * L17 战场基础屏波(battle.c:1563 `wScreenWave = lprgBattleField[].wScreenWave`)。keepEffect 的
   * `wScreenWave<9` 判定值 = 此基础 + magic.wWave(fight.c:2666-2667)。缺/0 = 陆战(58 战场仅 field 32=128)。
   * 注:仅用于 keepEffect 决策;战场基础屏波的逐帧视觉扭曲是另一独立缺失,本条不实现。
   */
  baseScreenWave?: number
}

/**
 * player OffMagic 动画时间线(port fight.c:2608-2844 PAL_BattleShowPlayerOffMagicAnim)。
 *
 * 总帧数 l = (n - fireDelay) * effectTimes + n + shake(fight.c:2661-2664)。
 * 每帧:
 *   - durationMs = (speed+5)*10(fight.c:2729-2730)。
 *   - caster.currentFrame=6 当 i==fireDelay(PAL_CLASSIC,fight.c:2677-2680)。
 *   - 帧 index k:
 *       非 shake 区(l - i > shake):i<n ? i : ((i-fireDelay)%(n-fireDelay)+fireDelay)(fight.c:2698-2707)
 *       shake 区(l - i <= shake):k=(l-shake-1)%n,带 shake:{time:i,level:3}(fight.c:2716-2720)
 *   - overlay kind='magic' spriteChunk=effect frameIdx=k,落点按 type:
 *       normal(target!=-1):enemy[target].pos + (xOff,yOff)(fight.c:2746-2750)
 *       attackAll:三点 {70,140}{100,110}{160,100} 各 +off → overlays[3](fight.c:2766-2776)
 *       attackWhole:(120,100)+off ; attackField:(160,200)+off(fight.c:2796-2808)
 *
 * 吹飞、烙背景和屏波只产出帧数据；driver 与 present 负责写入及显示。
 */
export function buildPlayerOffMagicTimeline(input: BuildOffMagicInput): BattleAnimFrame[] {
  // targetIdx 透传供调用方语义对齐;落点由 magic.type + targetEnemyPos 决定,本体不直接读 targetIdx。
  const { casterIdx, magic, n, targetEnemyPos, iBlow, blowTargets, rng, baseScreenWave } = input
  const {
    effect,
    type,
    speed,
    fireDelay,
    effectTimes,
    shake,
    scriptShake,
    xOffset,
    yOffset,
    wave,
    keepEffect,
    sound,
  } = magic
  // DM9:sLayerOffset(= MAGIC.special 的非 summon 语义,SHORT)—— 法术精灵与敌我精灵统一按
  //   PAL_Y+sLayerOffset 排序(fight.c:2735/battle.c:441-442);99≈恒最上,负值(地面型)画单位身后。
  const layerOffset = asShortLocal(magic.special ?? 0)
  // W4 iBlow:吹飞累加态(per target 运行 x/y),仅 iBlow!=0 + 有 targets + rng 时启用。
  const blowOn = !!iBlow && !!blowTargets && blowTargets.length > 0 && !!rng
  const blowAcc = blowOn ? blowTargets!.map((t) => ({ ...t, x: t.pos.x, y: t.pos.y })) : []

  const frames: BattleAnimFrame[] = []

  // 总帧数 l(fight.c:2661-2664)。effectTimes 是 (SHORT) 强转(fight.c:2662 `l *= (SHORT)wEffectTimes`)
  //   —— 攻击魔法都是小正值,但严格忠实:>=32768 当负(召唤类才有,本 builder 未来若复用需正确)。
  const l = (n - fireDelay) * asShortLocal(effectTimes) + n + shake
  const frameDuration = (speed + 5) * 10

  // L14:主特效循环前的 PAL_BattleDelay(1,0,TRUE)(fight.c:2659)—— 施法姿 hold 一帧(40ms),特效尚未喷发
  //   (无 overlay)。CLASSIC 路径此帧不切 frame6(frame6 在循环内 i==fireDelay 才切,fight.c:2677-2680;
  //   仅 WIN95 在循环前设);caster 帧由 caller 的 preFrames 末帧 hold。敌方 EnemyMagic(fight.c:2897)无此前导。
  frames.push({ durationMs: delayMs(1) })

  for (let i = 0; i < l; i++) {
    const fighters: BattleAnimFrame['fighters'] = []
    // PAL_CLASSIC:i==fireDelay 帧把 caster 切到施法帧 6(fight.c:2677-2680)。
    if (casterIdx >= 0 && i === fireDelay) {
      fighters.push({ side: 'player', idx: casterIdx, currentFrame: 6 })
    }

    // 帧 index k + shake 判定(fight.c:2696-2720)。
    let k: number
    let shakeOverlay: BattleAnimFrame['shake']
    if (l - i > shake) {
      if (i < n) {
        k = i
      } else {
        k = ((i - fireDelay) % (n - fireDelay)) + fireDelay
      }
    } else {
      // shake 区:震屏 + 定帧 (l-shake-1)%n(fight.c:2716-2720)。
      k = (l - shake - 1) % n
      shakeOverlay = { time: i, level: 3 }
    }

    // 落点 overlay(按 magic.type;fight.c:2742-2825)。
    const overlays: BattleAnimOverlay[] = []
    if (type === 'normal') {
      // target!=-1:enemy[target].pos + (xOff,yOff)(fight.c:2746-2750)。
      const ep = targetEnemyPos ?? { x: 0, y: 0 }
      overlays.push({
        kind: 'magic',
        spriteChunk: effect,
        layerOffset,
        frameIdx: k,
        x: ep.x + asShortLocal(xOffset),
        y: ep.y + asShortLocal(yOffset),
      })
    } else if (type === 'attackAll') {
      // 三点 {70,140}{100,110}{160,100} 各 +off(fight.c:2766-2776)。
      const pts: Array<[number, number]> = [
        [70, 140],
        [100, 110],
        [160, 100],
      ]
      for (const [px, py] of pts) {
        overlays.push({
          kind: 'magic',
          spriteChunk: effect,
          layerOffset,
          frameIdx: k,
          x: px + asShortLocal(xOffset),
          y: py + asShortLocal(yOffset),
        })
      }
    } else {
      // attackWhole(120,100) / attackField(160,200)(fight.c:2796-2808)。
      const px = type === 'attackWhole' ? 120 : 160
      const py = type === 'attackWhole' ? 100 : 200
      overlays.push({
        kind: 'magic',
        spriteChunk: effect,
        layerOffset,
        frameIdx: k,
        x: px + asShortLocal(xOffset),
        y: py + asShortLocal(yOffset),
      })
    }

    // W4 iBlow:本帧 blow 位移 —— 全体受击方累加 (x+=blow, y+=trunc(blow/2));末帧复位 posOriginal(fight.c:2681-2694/2840+)。
    if (blowOn) {
      const blow = iBlow! > 0 ? rng!.rangeInclusive(0, iBlow!) : rng!.rangeInclusive(iBlow!, 0)
      const isLast = i === l - 1
      for (const t of blowAcc) {
        if (isLast) {
          t.x = t.pos.x
          t.y = t.pos.y
        } // 末帧复位 posOriginal
        else {
          t.x += blow
          t.y += Math.trunc(blow / 2)
        }
        fighters.push({ side: t.side, idx: t.idx, pos: { x: t.x, y: t.y } })
      }
    }

    const frame: BattleAnimFrame = {
      durationMs: frameDuration,
      overlays,
    }
    if (fighters.length > 0) frame.fighters = fighters
    const effectiveShake = shakeOverlay ?? timedScriptShake(i, scriptShake)
    if (effectiveShake) frame.shake = effectiveShake
    // W4 屏波:动画期间 wScreenWave += magic.wave(陆战 base 0 → 帧值 = wave),present applyScreenWave。fight.c:2667。
    if (wave && wave > 0) frame.screenWave = wave
    // W4 keepEffect:末帧 + wKeepEffect==0xFFFF + wScreenWave<9 → 烙背景(fight.c:2757-2762)。
    //   L17:wScreenWave = 战场基础屏波(battle.c:1563)+ magic.wWave(fight.c:2666-2667),非只 wWave。
    if (i === l - 1 && keepEffect === 0xffff && (baseScreenWave ?? 0) + (wave ?? 0) < 9)
      frame.keepEffect = true
    // M6 法术效果音(user 2026-06-05 选 WIN95 式):在 OffMagic **起手帧 i==0** 播一次 magic.wSound
    //   (sdlpal WIN95 fight.c:2669-2672 `if (fIsWIN95 && !fSummon && wSound) AUDIO_PlaySound` 在帧循环前)。
    //   CLASSIC 真值本是 `(i-fireDelay)%n==0` 命中帧才播(fight.c:2713,!fIsWIN95)→ user 反馈万剑诀声音比剑
    //   出现晚、滞后,故按其选择统一改 WIN95 起手播(声画同步)。
    //   **召唤二次 OffMagic(casterIdx=-1)不传 sound → undefined → 不挂帧**,与 WIN95 `!fSummon` gate 一致,不碰召唤路径。
    if (sound && sound > 0 && i === 0) frame.sound = sound
    frames.push(frame)
  }

  return frames
}

export interface BuildPlayerDefMagicInput {
  /** caster idx(players[])。 */
  casterIdx: number
  /** 解析后的 magic 参数(对照 sdlpal `lprgMagic[iMagicNum]`)。 */
  magic: {
    /** FIRE.MKF chunk 号(= overlay.spriteChunk)。 */
    effect: number
    /** DM9:MAGIC.special(非 summon 语义 = sLayerOffset,SHORT;z 排序)。 */
    special?: number
    /** 防御类落点分支:applyToPlayer(单体队员)/ applyToParty(全队员)。 */
    type: 'applyToPlayer' | 'applyToParty'
    /** SHORT — (speed+5)*10 = 帧 durationMs。 */
    speed: number
    /** wXOffset / wYOffset — 落点偏移。 */
    xOffset: number
    yOffset: number
    /** W4 wWave — 动画期间 wScreenWave += 此值(屏波扭曲);0/缺 = 无屏波(陆战常 0)。fight.c:2667/2895。 */
    wave?: number
    /** W4 wKeepEffect — ==0xFFFF 时末帧把魔法精灵烙进战斗背景(持久);其它值/缺 = 不烙。fight.c:2758/2983。 */
    keepEffect?: number
    /** magic.wSound 效果音 — WIN95 在特效帧循环 i==0 播(fight.c:2497-2502);挂特效首帧。0/缺 = 不挂。 */
    sound?: number
  }
  /** FIRE.MKF chunk[effect] 帧数 n(magic sprite 帧序 + 总帧数;DefMagic 无 effectTimes/shake 循环)。 */
  n: number
  /** applyToPlayer 目标队员 idx(applyToParty 时 -1,无意义)。 */
  targetPlayerIdx: number
  /** applyToPlayer 目标队员落点底锚(applyToParty 时 undefined)。 */
  targetPlayerPos?: { x: number; y: number }
  /** applyToParty 全队员落点底锚列表(applyToPlayer 时 undefined / 空)。 */
  partyPlayerPositions?: Array<{ idx: number; pos: { x: number; y: number } }>
}

/**
 * player DefMagic 动画时间线(port fight.c:2447-2606 PAL_BattleShowPlayerDefMagicAnim)。
 *
 * 与 OffMagic 的关键差异:
 *   - **n 帧直放**(无 l = (n-fireDelay)*effectTimes+n+shake 循环;fight.c:2495 `for i in 0..n-1`)。
 *   - caster.currentFrame=6 在**第一帧之前就设**(fight.c:2492),不是 i==fireDelay。
 *   - 落点对**队员**:applyToParty → 每个队员 pos+(xOff,yOff)(fight.c:2525-2541);
 *     applyToPlayer → target 队员 pos+(xOff,yOff)(fight.c:2543-2557)。
 *   - 末:iColorShift 辉光(fight.c:2573-2605)—— 0..5 渐亮 + 6..0 渐暗，共 13 帧，峰值只一次。
 *     各 Delay(1)=40ms;applyToParty 设全队员 iColorShift,applyToPlayer 设 target。
 *
 * 总帧数 = 1(caster 切施法帧 6,Delay(1))+ n(magic sprite)+ 13(辉光)。
 * 帧间时长:magic 帧 (speed+5)*10(fight.c:2512-2513);caster 帧 + 辉光帧 = Delay(1)=40ms。
 */
export function buildPlayerDefMagicTimeline(input: BuildPlayerDefMagicInput): BattleAnimFrame[] {
  const { casterIdx, magic, n, targetPlayerIdx, targetPlayerPos, partyPlayerPositions } = input
  const { effect, type, speed, xOffset, yOffset } = magic
  const layerOffset = asShortLocal(magic.special ?? 0)
  const frames: BattleAnimFrame[] = []
  const frameDuration = (speed + 5) * 10

  // —— caster.currentFrame=6 + PAL_BattleDelay(1)(fight.c:2492-2493)——
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'player', idx: casterIdx, currentFrame: 6 }],
  })

  // 落点表(按 type;fight.c:2525-2557)。
  // applyToParty:全队员各放一份;applyToPlayer:仅 target 一份。
  const dropPoints: Array<{ x: number; y: number }> = []
  if (type === 'applyToParty') {
    for (const pp of partyPlayerPositions ?? []) {
      dropPoints.push({ x: pp.pos.x + asShortLocal(xOffset), y: pp.pos.y + asShortLocal(yOffset) })
    }
  } else {
    const tp = targetPlayerPos ?? { x: 0, y: 0 }
    dropPoints.push({ x: tp.x + asShortLocal(xOffset), y: tp.y + asShortLocal(yOffset) })
  }

  // —— n 帧 magic sprite,frameIdx=i 直放,各 (speed+5)*10ms(fight.c:2495-2569)——
  for (let i = 0; i < n; i++) {
    const overlays: BattleAnimOverlay[] = dropPoints.map((p) => ({
      kind: 'magic',
      spriteChunk: effect,
      layerOffset,
      frameIdx: i,
      x: p.x,
      y: p.y,
    }))
    const frame: BattleAnimFrame = { durationMs: frameDuration, overlays }
    // 效果音声画同步:WIN95 i==0 播 magic.wSound(fight.c:2497-2502)。
    if (i === 0 && magic.sound && magic.sound > 0) frame.sound = magic.sound
    frames.push(frame)
  }

  // 与 C 的两段循环相同：0..5 升、6..0 降，峰值不重复。
  const glowSeq = [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0]
  for (const shift of glowSeq) {
    const fighters: FighterDelta[] = []
    if (type === 'applyToParty') {
      for (const pp of partyPlayerPositions ?? []) {
        fighters.push({ side: 'player', idx: pp.idx, iColorShift: shift })
      }
    } else {
      fighters.push({ side: 'player', idx: targetPlayerIdx, iColorShift: shift })
    }
    frames.push({ durationMs: delayMs(1), fighters })
  }

  return frames
}

export interface BuildEnemyMagicInput {
  /** 施法敌人 idx(enemies[])。 */
  enemyCasterIdx: number
  /** 解析后的 magic 参数(对照 sdlpal `lprgMagic[iMagicNum]`)。 */
  magic: {
    /** FIRE.MKF chunk 号(= overlay.spriteChunk)。 */
    effect: number
    /** DM9:MAGIC.special(非 summon 语义 = sLayerOffset,SHORT;z 排序)。 */
    special?: number
    /** 法术类型(落点分支;敌方攻击魔法 4 类型 — 落点对队员/全队)。 */
    type: 'normal' | 'attackAll' | 'attackWhole' | 'attackField'
    /** SHORT — (speed+5)*10 = 帧 durationMs。 */
    speed: number
    /** wFireDelay — 帧循环 / 敌施法帧 gate。 */
    fireDelay: number
    /** wEffectTimes — 总帧数循环次数。 */
    effectTimes: number
    /** wShake — 末尾震屏帧数。 */
    shake: number
    /** scriptOnUse 0x35 ShakeScreen — 从 EnemyMagic 起始帧开始抖。 */
    scriptShake?: { time: number; level: number }
    /** wXOffset / wYOffset — 落点偏移。 */
    xOffset: number
    yOffset: number
    /** W4 wWave — 动画期间 wScreenWave += 此值(屏波扭曲);0/缺 = 无屏波(陆战常 0)。fight.c:2667/2895。 */
    wave?: number
    /** W4 wKeepEffect — ==0xFFFF 时末帧把魔法精灵烙进战斗背景(持久);其它值/缺 = 不烙。fight.c:2758/2983。 */
    keepEffect?: number
    /**
     * magic.wSound 效果音 — WIN95 在特效帧循环 i==0 播(fight.c:2925-2930);挂首帧。
     * fight.c gate `e.wMagicSound >= 0` 由调用方判定(负值敌人传 0/缺 = 效果音静音)。
     */
    sound?: number
  }
  /** FIRE.MKF chunk[effect] 帧数 n(总帧数公式 fight.c:2887/2889)。 */
  n: number
  /** 敌人精灵帧参数(enemies.json[id];敌施法帧 currentFrame 用)。 */
  enemy: { idleFrames: number; magicFrames: number; attackFrames: number }
  /** 单体目标 player idx(type=normal 用);全体类型时无意义传 -1。 */
  targetPlayerIdx: number
  /** 单体目标 player 落点(type=normal 用;底锚)。type 全体时可传 undefined。 */
  targetPlayerPos?: { x: number; y: number }
  /**
   * 吹飞强度(g_Battle.iBlow,fight.c:2901)。每帧 blow = iBlow>0?RandomLong(0,iBlow):RandomLong(iBlow,0),
   * **全体队员**逐帧累加 (x+=blow, y+=trunc(blow/2)),末帧复位 posOriginal(fight.c:2901-2909)。
   * 仅 iBlow!=0 时生效(同 OffMagic:iBlow==0 跳过不摇 rng,避免污染常见无吹飞敌法术 rng 序)。
   */
  iBlow?: number
  /** W4 iBlow:受吹飞对象(enemy off-magic 镜像 = 全体队员;含 posOriginal 底锚)。空/缺 → 不吹飞。 */
  blowTargets?: Array<{ side: 'player' | 'enemy'; idx: number; pos: { x: number; y: number } }>
  /** W4 iBlow:每帧 blow 取值 rng(仅 iBlow!=0 用);缺 → 不吹飞。 */
  rng?: { rangeInclusive: (a: number, b: number) => number }
  /**
   * L17 战场基础屏波(battle.c:1563)。keepEffect 的 `wScreenWave<9` 判定值 = 此基础 + magic.wWave
   * (fight.c:2895/2983)。缺/0 = 陆战(58 战场仅 field 32=128)。仅用于 keepEffect 决策,不实现屏波视觉。
   */
  baseScreenWave?: number
}

export interface BuildEnemyMagicIntroInput {
  enemyCasterIdx: number
  /** 敌人施法起手位。 */
  enemyPos: { x: number; y: number }
  idleFrames: number
  magicFrames: number
  attackFrames: number
  actWaitFrames: number
  /** magic.fireDelay —— ==0 时额外用 attackFrames 当施法手势(fight.c:4709-4717)。 */
  fireDelay: number
  /** 施法声在两次滑步完成后开始。 */
  sound?: number
}

/**
 * 敌人施法**起手**动画(port fight.c:4680-4717 PAL_BattleEnemyPerformAction magic 分支前段)——
 * 落点特效(PAL_BattleShowEnemyMagicAnim)**之前**敌人本体的表演:前移 + 施法手势。
 *
 *   - 前移 2 帧:pos += (12,6) Delay(1) → += (4,2) Delay(1)(fight.c:4683-4693)
 *   - magicFrames 帧施法手势:currentFrame = idleFrames + i,Delay(actWaitFrames)(fight.c:4697-4702)
 *   - magicFrames==0 → 补 Delay(1)(fight.c:4704-4707)
 *   - fireDelay==0 → 用 attackFrames(+1)帧手势:currentFrame = i-1+idleFrames+magicFrames,
 *     Delay(actWaitFrames)(fight.c:4709-4717)
 *
 * **「敌人施法没动画/没位移」的真因**:之前只 port 了落点特效 loop(其内 fireDelay=0 时不动敌帧),
 * 漏了这整段起手。林月如(enemy82:magic360→鞭击 fireDelay=0;idleFrames=1/magicFrames=0/attackFrames=4)
 * 即靠 fireDelay==0 分支动:frame 0→1→2→3→4,并前移两步。
 */
export function buildEnemyMagicCastIntro(input: BuildEnemyMagicIntroInput): BattleAnimFrame[] {
  const {
    enemyCasterIdx,
    enemyPos,
    idleFrames,
    magicFrames,
    attackFrames,
    actWaitFrames,
    fireDelay,
    sound,
  } = input
  const frames: BattleAnimFrame[] = []
  let ex = enemyPos.x
  let ey = enemyPos.y

  // 前移 2 帧(fight.c:4683-4693)
  ex += 12
  ey += 6
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'enemy', idx: enemyCasterIdx, pos: { x: ex, y: ey } }],
  })
  ex += 4
  ey += 2
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'enemy', idx: enemyCasterIdx, pos: { x: ex, y: ey } }],
  })

  // The first casting gesture or the fallback beat starts the cue (fight.c:4695–4707).
  for (let i = 0; i < magicFrames; i++) {
    frames.push({
      durationMs: delayMs(actWaitFrames),
      fighters: [{ side: 'enemy', idx: enemyCasterIdx, currentFrame: idleFrames + i }],
      ...(i === 0 && sound ? { sound } : {}),
    })
  }
  if (magicFrames === 0) frames.push({ durationMs: delayMs(1), ...(sound ? { sound } : {}) })

  // fireDelay==0 → attackFrames(+1)帧手势(fight.c:4709-4717)
  if (fireDelay === 0) {
    for (let i = 0; i <= attackFrames; i++) {
      frames.push({
        durationMs: delayMs(actWaitFrames),
        fighters: [
          { side: 'enemy', idx: enemyCasterIdx, currentFrame: i - 1 + idleFrames + magicFrames },
        ],
      })
    }
  }

  return frames
}

/**
 * 敌方 EnemyMagic 动画时间线(port fight.c:2846-3069 PAL_BattleShowEnemyMagicAnim)——
 * **OffMagic 镜像**:同总帧数公式 / 帧循环 k / shake 区,落点对**队员**而非敌人。
 *
 * 总帧数 l = (n - fireDelay) * (SHORT)effectTimes + n + shake(fight.c:2889-2892)。
 * 每帧:
 *   - durationMs = (speed+5)*10(fight.c:2954-2955)。
 *   - 帧 index k:
 *       非 shake 区(l - i > shake):i<n ? i : ((i-fireDelay)%(n-fireDelay)+fireDelay)(fight.c:2911-2922)
 *       shake 区(l - i <= shake):k=(l-shake-1)%n,带 shake:{time:i,level:3}(fight.c:2942-2943)
 *   - 敌施法帧(仅非 shake 区,fight.c:2932-2938):fireDelay>0 且
 *       fireDelay<=i<fireDelay+attackFrames → enemy.currentFrame = i-fireDelay+idleFrames+magicFrames。
 *   - overlay kind='magic' spriteChunk=effect frameIdx=k,落点按 type **对队员**(fight.c:2967-3046):
 *       normal(target!=-1):player[target].pos + (xOff,yOff)(fight.c:2971-2975)
 *       attackAll:三点 {180,180}{234,170}{270,146} 各 +off → overlays[3](fight.c:2991-3001)
 *       attackWhole:(240,150)+off ; attackField:(160,200)+off(fight.c:3021-3033)
 *
 * W4 演出全套(镜像 OffMagic):wWave 屏波(fight.c:2895)+ keepEffect 烙背景(fight.c:2983)+
 *   iBlow 抖**队员**(fight.c:2901-2909,2026-06-02 补,需调用方传 iBlow/blowTargets=全体队员/rng)。
 */
export function buildEnemyMagicTimeline(input: BuildEnemyMagicInput): BattleAnimFrame[] {
  // targetPlayerIdx 透传供调用方语义对齐;落点由 magic.type + targetPlayerPos 决定,本体不直接读 idx。
  const {
    enemyCasterIdx,
    magic,
    n,
    enemy,
    targetPlayerPos,
    iBlow,
    blowTargets,
    rng,
    baseScreenWave,
  } = input
  const {
    effect,
    type,
    speed,
    fireDelay,
    effectTimes,
    shake,
    scriptShake,
    xOffset,
    yOffset,
    wave,
    keepEffect,
  } = magic
  const layerOffset = asShortLocal(magic.special ?? 0)
  const { idleFrames, magicFrames, attackFrames } = enemy
  // W4 iBlow:吹飞累加态(per target 运行 x/y),仅 iBlow!=0 + 有 targets + rng 时启用。镜像 OffMagic,吹**全体队员**。
  const blowOn = !!iBlow && !!blowTargets && blowTargets.length > 0 && !!rng
  const blowAcc = blowOn ? blowTargets!.map((t) => ({ ...t, x: t.pos.x, y: t.pos.y })) : []

  const frames: BattleAnimFrame[] = []

  // 总帧数 l(fight.c:2889-2892)。effectTimes 是 (SHORT) 强转(fight.c:2890)。
  const l = (n - fireDelay) * asShortLocal(effectTimes) + n + shake
  const frameDuration = (speed + 5) * 10

  for (let i = 0; i < l; i++) {
    const fighters: FighterDelta[] = []

    // 帧 index k + shake 判定(fight.c:2911-2944)。
    let k: number
    let shakeOverlay: BattleAnimFrame['shake']
    if (l - i > shake) {
      if (i < n) {
        k = i
      } else {
        k = ((i - fireDelay) % (n - fireDelay)) + fireDelay
      }
      // 敌施法帧(仅非 shake 区;fight.c:2932-2938)。
      if (fireDelay > 0 && i >= fireDelay && i < fireDelay + attackFrames) {
        fighters.push({
          side: 'enemy',
          idx: enemyCasterIdx,
          currentFrame: i - fireDelay + idleFrames + magicFrames,
        })
      }
    } else {
      // shake 区:震屏 + 定帧 (l-shake-1)%n(fight.c:2942-2943)。
      k = (l - shake - 1) % n
      shakeOverlay = { time: i, level: 3 }
    }

    // 落点 overlay(按 magic.type **对队员**;fight.c:2967-3046)。
    const overlays: BattleAnimOverlay[] = []
    if (type === 'normal') {
      // target!=-1:player[target].pos + (xOff,yOff)(fight.c:2971-2975)。
      const pp = targetPlayerPos ?? { x: 0, y: 0 }
      overlays.push({
        kind: 'magic',
        spriteChunk: effect,
        layerOffset,
        frameIdx: k,
        x: pp.x + asShortLocal(xOffset),
        y: pp.y + asShortLocal(yOffset),
      })
    } else if (type === 'attackAll') {
      // 三点 {180,180}{234,170}{270,146} 各 +off(fight.c:2991-3001)。
      const pts: Array<[number, number]> = [
        [180, 180],
        [234, 170],
        [270, 146],
      ]
      for (const [px, py] of pts) {
        overlays.push({
          kind: 'magic',
          spriteChunk: effect,
          layerOffset,
          frameIdx: k,
          x: px + asShortLocal(xOffset),
          y: py + asShortLocal(yOffset),
        })
      }
    } else {
      // attackWhole(240,150) / attackField(160,200)(fight.c:3021-3033)。
      const px = type === 'attackWhole' ? 240 : 160
      const py = type === 'attackWhole' ? 150 : 200
      overlays.push({
        kind: 'magic',
        spriteChunk: effect,
        layerOffset,
        frameIdx: k,
        x: px + asShortLocal(xOffset),
        y: py + asShortLocal(yOffset),
      })
    }

    // W4 iBlow:本帧 blow 位移 —— 全体队员累加 (x+=blow, y+=trunc(blow/2));末帧复位 posOriginal(fight.c:2901-2909)。
    if (blowOn) {
      const blow = iBlow! > 0 ? rng!.rangeInclusive(0, iBlow!) : rng!.rangeInclusive(iBlow!, 0)
      const isLast = i === l - 1
      for (const t of blowAcc) {
        if (isLast) {
          t.x = t.pos.x
          t.y = t.pos.y
        } // 末帧复位 posOriginal
        else {
          t.x += blow
          t.y += Math.trunc(blow / 2)
        }
        fighters.push({ side: t.side, idx: t.idx, pos: { x: t.x, y: t.y } })
      }
    }

    const frame: BattleAnimFrame = { durationMs: frameDuration, overlays }
    // 效果音声画同步:WIN95 i==0 播 magic.wSound(fight.c:2925-2930;e.wMagicSound>=0 gate 在调用方)。
    if (i === 0 && magic.sound && magic.sound > 0) frame.sound = magic.sound
    if (fighters.length > 0) frame.fighters = fighters
    const effectiveShake = shakeOverlay ?? timedScriptShake(i, scriptShake)
    if (effectiveShake) frame.shake = effectiveShake
    if (wave && wave > 0) frame.screenWave = wave // W4 屏波(fight.c:2895)
    // L17:keepEffect 的 wScreenWave<9 判定 = 战场基础屏波 + magic.wWave(fight.c:2895/2983,battle.c:1563)。
    if (i === l - 1 && keepEffect === 0xffff && (baseScreenWave ?? 0) + (wave ?? 0) < 9)
      frame.keepEffect = true // W4 烙背景(fight.c:2983)
    frames.push(frame)
  }

  return frames
}

/** SHORT cast(xOffset/yOffset 是 WORD 但 sdlpal 用 (SHORT) 强转,fight.c:2749)。 */
function asShortLocal(n: number): number {
  return (n << 16) >> 16
}
