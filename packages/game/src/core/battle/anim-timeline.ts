/**
 * 物理战斗动画时间线 builder(D17a)—— 纯函数,**不 mutate state**,只产
 * `BattleAnimFrame[]`。接收 fighter pos/idx 等只读快照 + sdlpal 参数,
 * tickPerformAction 逐帧驱动(applyAnimFrame)。
 *
 * 本切片:物理攻击(player→enemy)/ 物理受击(enemy→player)/ 死亡帧。
 * D17:player **攻击魔法**链(PreMagic → OffMagic → PostMagic)。
 * 治疗/防御 DefMagic、召唤 Summon、敌方 EnemyMagic 留后续叶子(明确 defer)。
 *
 * 出处:
 *   - buildPlayerAttackTimeline   ← fight.c:2008-2263 PAL_BattleShowPlayerAttackAnim
 *   - buildEnemyPhysicalTimeline  ← fight.c:4910-5149 PAL_BattleEnemyPerformAction(physical 分支)
 *   - buildPreMagicTimeline       ← fight.c:2337-2445 PAL_BattleShowPlayerPreMagicAnim
 *   - buildPlayerOffMagicTimeline ← fight.c:2608-2844 PAL_BattleShowPlayerOffMagicAnim
 *   - buildPostMagicTimeline      ← fight.c:3189-3246 PAL_BattleShowPostMagicAnim
 *   - 帧时长 PAL_BattleDelay(N) = N × BATTLE_FRAME_TIME(battle.h:28-29,BATTLE_FPS=25 → 40ms)
 */

import type { BattleAnimFrame, BattleAnimOverlay } from './battle-state.js'

/** BATTLE_FRAME_TIME = 1000 / BATTLE_FPS = 1000/25 = 40ms(battle.h:28-29)。 */
export const BATTLE_FRAME_TIME = 40

/** lpEffectSprite = DATA.MKF chunk 10(battle.c:1790 PAL_MKFReadChunk(..., 10, fpDATA))。 */
export const EFFECT_SPRITE_CHUNK = 10

/** N 帧 × 40ms(sdlpal PAL_BattleDelay(N))。 */
function delayMs(frames: number): number {
  return frames * BATTLE_FRAME_TIME
}

export interface BuildPlayerAttackInput {
  /** 攻击者站立底锚(g_rgPlayerPos[count-1][playerIdx])。 */
  attackerPos: { x: number; y: number }
  /** 攻击者 idx(players[])。 */
  attackerIdx: number
  /** 目标敌人底锚(EnemyPos + yPosOffset)。 */
  targetEnemyPos: { x: number; y: number }
  /** 目标敌人 idx(enemies[])。 */
  targetIdx: number
  /** 目标敌人精灵高度(像素;effect 落点 enemy_y - enemy_h/3 + 10 用)。 */
  targetEnemyHeight: number
  /**
   * 命中特效帧基号 = rgwBattleEffectIndex[battleSpriteId][1] * 3(fight.c:2055-2056)。
   * 调用方先查 battleEffectIndex 表(rgwBattleEffectIndex[10][2] flat)算好传入。
   */
  effectFrameBase: number
  /** 钳后真实掉血(damageNum value;掉血 → blue)。 */
  damage: number
}

/**
 * player 物理攻击动画时间线(单体目标,sTarget>=0 且 <3 → dist=0 简化)。
 *
 * 对照 fight.c:2008-2263:
 *   - frame 0(Delay(2)):currentFrame=8,attacker 冲到敌前 (enemy_x+64, enemy_y+20)
 *   - frame 1(Delay(1)):attacker x-=10,y-=2 → (enemy_x+54, enemy_y+18)
 *   - frame 2..4:currentFrame=9 + 3 帧 lpEffectSprite 命中特效
 *       落点 (enemy_x, enemy_y - enemy_h/3 + 10) 每帧 x-=16/y+=16;
 *       i==0 帧 target.iColorShift=6 + damageNum;i==1 帧 attacker.pos += (2,1)
 *   - frame 5..7:target.iColorShift=0 + 抖动 3 帧(dist 8→-4→2,x 序列 ex-8/ex-4/ex-6)
 */
export function buildPlayerAttackTimeline(input: BuildPlayerAttackInput): BattleAnimFrame[] {
  const {
    attackerPos,
    attackerIdx,
    targetEnemyPos,
    targetIdx,
    targetEnemyHeight,
    effectFrameBase,
    damage,
  } = input
  const ex = targetEnemyPos.x
  const ey = targetEnemyPos.y
  const enemyH = targetEnemyHeight

  const frames: BattleAnimFrame[] = []

  // —— frame 0:currentFrame=8,冲刺到敌前(fight.c:2076-2097)——
  // x = enemy_x - dist + 64;y = enemy_y + dist + 20(dist=0 单体简化)
  const rushX0 = ex + 64
  const rushY0 = ey + 20
  frames.push({
    durationMs: delayMs(2),
    fighters: [
      { side: 'player', idx: attackerIdx, currentFrame: 8, pos: { x: rushX0, y: rushY0 } },
    ],
  })

  // —— frame 1:x-=10,y-=2(fight.c:2099-2118)——
  const rushX1 = rushX0 - 10
  const rushY1 = rushY0 - 2
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'player', idx: attackerIdx, pos: { x: rushX1, y: rushY1 } }],
  })

  // —— frame 2..4:currentFrame=9 + 3 帧 lpEffectSprite 命中特效(fight.c:2120-2221)——
  // effect 落点起点 (enemy_x, enemy_y - enemy_h/3 + 10),每帧画后 x-=16,y+=16
  const fxX0 = ex
  const fxY0 = ey - Math.floor(enemyH / 3) + 10
  for (let i = 0; i < 3; i++) {
    const overlayX = fxX0 - 16 * i
    const overlayY = fxY0 + 16 * i
    const fighters: BattleAnimFrame['fighters'] = []
    if (i === 0) {
      // currentFrame=9 自 effect frame 0 起(fight.c:2120)
      fighters.push({ side: 'player', idx: attackerIdx, currentFrame: 9 })
      // i==0:target 染色 + 伤害数字(fight.c:2195-2209)
      fighters.push({ side: 'enemy', idx: targetIdx, iColorShift: 6 })
    }
    if (i === 1) {
      // i==1:attacker pos += (2,1)(fight.c:2215-2220)
      fighters.push({ side: 'player', idx: attackerIdx, pos: { x: rushX1 + 2, y: rushY1 + 1 } })
    }
    frames.push({
      durationMs: delayMs(1),
      fighters: fighters.length > 0 ? fighters : undefined,
      overlay: {
        kind: 'effect',
        spriteChunk: EFFECT_SPRITE_CHUNK,
        frameIdx: effectFrameBase + i,
        x: overlayX,
        y: overlayY,
      },
      ...(i === 0
        ? {
            damageNum: {
              target: { kind: 'enemy' as const, idx: targetIdx },
              value: damage,
              color: 'blue' as const,
            },
          }
        : {}),
    })
  }

  // —— frame 5..7:抖动 3 帧 + 复位 iColorShift=0(fight.c:2223-2262)——
  // dist=8;每帧 x-=dist;dist/=-2;y+=dist。x 序列:ex-8 / ex-4 / ex-6
  let dist = 8
  let sx = ex
  let sy = ey
  for (let i = 0; i < 3; i++) {
    sx -= dist
    dist = Math.trunc(dist / -2)
    sy += dist
    const fighters: BattleAnimFrame['fighters'] = [
      { side: 'enemy', idx: targetIdx, pos: { x: sx, y: sy } },
    ]
    // 第一抖动帧顺带把命中染色复位(fight.c:2225-2228 在抖动前 iColorShift=0)
    if (i === 0) fighters[0]!.iColorShift = 0
    frames.push({ durationMs: delayMs(1), fighters })
  }

  return frames
}

export interface BuildEnemyPhysicalInput {
  /** 敌人 idle 底锚(EnemyPos + yPosOffset)。 */
  enemyPos: { x: number; y: number }
  /** 敌人 idx(enemies[])。 */
  enemyIdx: number
  /** 目标队员当前底锚(g_rgPlayerPos[count-1][playerIdx])。 */
  targetPlayerPos: { x: number; y: number }
  /** 目标队员 idx(players[])。 */
  targetIdx: number
  /** 敌人精灵帧参数(enemies.json[id])。 */
  enemy: { magicFrames: number; attackFrames: number; actWaitFrames: number; idleFrames: number }
  /** 钳后真实掉血(damageNum value)。 */
  damage: number
  /** 命中后队员是否死亡(hp→0)。 */
  targetDied: boolean
  /** 命中后队员是否濒死(PAL_IsPlayerDying;死亡优先)。 */
  targetDying: boolean
}

/**
 * enemy 物理攻击动画时间线(无 cover / 无 autoDefend 简化 — 命中结算分支)。
 *
 * 对照 fight.c:4910-5149(physical 分支,iCoverIndex=-1 && !fAutoDefend):
 *   - magicFrames 帧:currentFrame = idleFrames + i,Delay(2)(fight.c:4987-4992)
 *   - (3 - magicFrames) 帧前移:pos.x-=2,y-=1,Delay(1)(fight.c:4994-5000)
 *   - Delay(1)(actionSound;fight.c:5005)
 *   - 冲到队员前 ex=player.x-44,ey=player.y-16:
 *       attackFrames==0 → currentFrame=idleFrames-1,Delay(2)(fight.c:5029-5037)
 *       否则 i=0..attackFrames:currentFrame=idleFrames+magicFrames+i-1,Delay(actWaitFrames)(fight.c:5040-5049)
 *   - 命中:target.currentFrame=4,iColorShift=6 + damageNum,Delay(1)(fight.c:5052-5086)
 *   - iColorShift=0;击退 target.pos += (8,4),Delay(1)(fight.c:5088-5106)
 *   - 死亡 frameBak=2 / 濒死 frameBak=1;target.pos += (2,1),Delay(3)(fight.c:5108-5125)
 *   - enemy.pos=posOriginal,currentFrame=0,Delay(1)(fight.c:5127-5130)
 *   - target.currentFrame=frameBak,Delay(1) + Delay(4)(fight.c:5132-5135)
 */
export function buildEnemyPhysicalTimeline(input: BuildEnemyPhysicalInput): BattleAnimFrame[] {
  const { enemyPos, enemyIdx, targetPlayerPos, targetIdx, enemy, damage, targetDied, targetDying } =
    input
  const { magicFrames, attackFrames, actWaitFrames, idleFrames } = enemy

  const frames: BattleAnimFrame[] = []
  let ex = enemyPos.x
  let ey = enemyPos.y

  // —— magicFrames 帧:currentFrame = idleFrames + i,Delay(2)(fight.c:4987-4992)——
  for (let i = 0; i < magicFrames; i++) {
    frames.push({
      durationMs: delayMs(2),
      fighters: [{ side: 'enemy', idx: enemyIdx, currentFrame: idleFrames + i }],
    })
  }

  // —— (3 - magicFrames) 帧前移:pos.x-=2,y-=1,Delay(1)(fight.c:4994-5000)——
  for (let i = 0; i < 3 - magicFrames; i++) {
    ex -= 2
    ey -= 1
    frames.push({
      durationMs: delayMs(1),
      fighters: [{ side: 'enemy', idx: enemyIdx, pos: { x: ex, y: ey } }],
    })
  }

  // —— Delay(1)(actionSound;fight.c:5005)——
  frames.push({ durationMs: delayMs(1) })

  // —— 冲到队员前(fight.c:5007-5050)——
  const chargeX = targetPlayerPos.x - 44
  const chargeY = targetPlayerPos.y - 16
  if (attackFrames === 0) {
    frames.push({
      durationMs: delayMs(2),
      fighters: [
        {
          side: 'enemy',
          idx: enemyIdx,
          currentFrame: idleFrames - 1,
          pos: { x: chargeX, y: chargeY },
        },
      ],
    })
  } else {
    for (let i = 0; i <= attackFrames; i++) {
      frames.push({
        // actWaitFrames 可能为 0 → Delay(0) 是 sdlpal 真值(零长帧,逻辑即时切下一帧)。
        durationMs: delayMs(actWaitFrames),
        fighters: [
          {
            side: 'enemy',
            idx: enemyIdx,
            currentFrame: idleFrames + magicFrames + i - 1,
            pos: { x: chargeX, y: chargeY },
          },
        ],
      })
    }
  }

  // —— 命中:target.currentFrame=4,iColorShift=6 + damageNum,Delay(1)(fight.c:5052-5086)——
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'player', idx: targetIdx, currentFrame: 4, iColorShift: 6 }],
    damageNum: { target: { kind: 'player', idx: targetIdx }, value: damage, color: 'blue' },
  })

  // —— iColorShift=0;击退 target.pos += (8,4),Delay(1)(fight.c:5088-5106)——
  const knockX = targetPlayerPos.x + 8
  const knockY = targetPlayerPos.y + 4
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'player', idx: targetIdx, iColorShift: 0, pos: { x: knockX, y: knockY } }],
  })

  // —— 死亡 / 濒死 frameBak;target.pos += (2,1),Delay(3)(fight.c:5108-5125)——
  // wFrameBak 在 Delay(3) 后才赋给 currentFrame(fight.c:5132),这里先算好留到后面帧用。
  let frameBak = 0 // 站立(默认 — 实际复位走 resetFightersAfterAction,这里 frameBak 给死/濒死帧短暂展示)
  if (targetDied) frameBak = 2
  else if (targetDying) frameBak = 1
  frames.push({
    durationMs: delayMs(3),
    fighters: [{ side: 'player', idx: targetIdx, pos: { x: knockX + 2, y: knockY + 1 } }],
  })

  // —— enemy.pos=posOriginal,currentFrame=0,Delay(1)(fight.c:5127-5130)——
  frames.push({
    durationMs: delayMs(1),
    fighters: [
      { side: 'enemy', idx: enemyIdx, currentFrame: 0, pos: { x: enemyPos.x, y: enemyPos.y } },
    ],
  })

  // —— target.currentFrame=frameBak,Delay(1) + Delay(4)(fight.c:5132-5135)——
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'player', idx: targetIdx, currentFrame: frameBak }],
  })
  frames.push({ durationMs: delayMs(4) })

  return frames
}

// ============================================================================
// D17 player 攻击魔法动画链(PreMagic → OffMagic → PostMagic)
// ============================================================================

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
  /** 是否召唤魔法(fSummon);true → 跳过 10 帧 cast 特效(fight.c:2380)。本切片只攻击法术,恒 false。 */
  isSummon: boolean
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
 *     上移 4 帧后 pos = (casterX - 10, casterY - 5)(累 (4+3+2+1)=10,/2=5),固定不再动。
 */
export function buildPreMagicTimeline(input: BuildPreMagicInput): BattleAnimFrame[] {
  const { casterPos, casterIdx, castEffectFrameBase, isSummon } = input
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

  // —— currentFrame=5(施法手势,fight.c:2374)——
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'player', idx: casterIdx, currentFrame: 5 }],
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

export interface BuildOffMagicInput {
  /** caster idx(players[]);-1 = 无 caster(summon 内调,本切片不走)。 */
  casterIdx: number
  /** 解析后的 magic 参数(对照 sdlpal `lprgMagic[iMagicNum]`)。 */
  magic: {
    /** FIRE.MKF chunk 号(= overlay.spriteChunk)。 */
    effect: number
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
    /** wXOffset / wYOffset — 落点偏移。 */
    xOffset: number
    yOffset: number
  }
  /** FIRE.MKF chunk[effect] 帧数 n(performMagic 从 fire-sprites.json 取)。 */
  n: number
  /** 单体目标 enemy idx(type=normal 用);全体类型时无意义传 -1。 */
  targetIdx: number
  /** 单体目标 enemy 落点(type=normal 用;EnemyPos + yPosOffset 底锚)。type 全体时可传 undefined。 */
  targetEnemyPos?: { x: number; y: number }
  /**
   * 吹飞强度(g_Battle.iBlow)—— 敌方 pos 逐帧位移 (blow, blow/2)。
   * 本切片无 per-enemy pos 追踪(纯函数不 mutate state)→ 仅当需要时由调用方处理;
   * iBlow 缺(本切片恒 0)则不产生位移(标注 defer:blow 位移需 per-enemy pos,留 present)。
   */
  iBlow?: number
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
 * blow 位移(iBlow) / keepEffect 烙背景(0xFFFF) / wScreenWave 增复位 → defer(标注;
 * 需 per-enemy pos mutate / present-only background blit,本数据级切片不建模)。
 */
export function buildPlayerOffMagicTimeline(input: BuildOffMagicInput): BattleAnimFrame[] {
  // targetIdx 透传供调用方语义对齐;落点由 magic.type + targetEnemyPos 决定,本体不直接读 targetIdx。
  const { casterIdx, magic, n, targetEnemyPos } = input
  const { effect, type, speed, fireDelay, effectTimes, shake, xOffset, yOffset } = magic

  const frames: BattleAnimFrame[] = []

  // 总帧数 l(fight.c:2661-2664)。effectTimes 是 (SHORT) 强转(fight.c:2662 `l *= (SHORT)wEffectTimes`)
  //   —— 攻击魔法都是小正值,但严格忠实:>=32768 当负(召唤类才有,本 builder 未来若复用需正确)。
  const l = (n - fireDelay) * asShortLocal(effectTimes) + n + shake
  const frameDuration = (speed + 5) * 10

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
        frameIdx: k,
        x: px + asShortLocal(xOffset),
        y: py + asShortLocal(yOffset),
      })
    }

    const frame: BattleAnimFrame = {
      durationMs: frameDuration,
      overlays,
    }
    if (fighters.length > 0) frame.fighters = fighters
    if (shakeOverlay) frame.shake = shakeOverlay
    frames.push(frame)
  }

  return frames
}

export interface BuildPostMagicInput {
  /**
   * 受伤的敌人(health != prevHP)idx + idle 底锚 pos —— 本帧抖动这些敌人。
   * 调用方过滤好(只传 health != prevHP 的);空 → 无敌人抖,但仍产 3 帧 delay + 复位(忠实 sdlpal)。
   */
  hurtEnemies: Array<{ idx: number; pos: { x: number; y: number } }>
}

/**
 * PostMagic 动画时间线(port fight.c:3189-3246 PAL_BattleShowPostMagicAnim)。
 *
 *   - i=0..2:受伤敌 pos.x-=dist(dist 8→-4→2),iColorShift=(i==1?6:0),各 Delay(1)(fight.c:3216-3237)
 *   - 末:所有敌 pos=posBak 复位,Delay(1)(fight.c:3240-3245)
 *
 * 注:sdlpal y 不变(fight.c:3229 注释掉 y -= dist/2)。
 *     iColorShift 复位由 resetFightersAfterAction 兜底,但末复位帧仍显式带 iColorShift=0
 *     (i=2 帧已 iColorShift=0;复位帧只动 pos)。
 */
export function buildPostMagicTimeline(input: BuildPostMagicInput): BattleAnimFrame[] {
  const { hurtEnemies } = input
  const frames: BattleAnimFrame[] = []

  let dist = 8
  // 累积 x 位移(每帧基于上一帧 pos 再 -=dist,对齐 sdlpal in-place mutate)。
  const curX = new Map<number, number>()
  for (const he of hurtEnemies) curX.set(he.idx, he.pos.x)

  for (let i = 0; i < 3; i++) {
    const fighters: BattleAnimFrame['fighters'] = []
    for (const he of hurtEnemies) {
      const nx = (curX.get(he.idx) ?? he.pos.x) - dist
      curX.set(he.idx, nx)
      fighters.push({
        side: 'enemy',
        idx: he.idx,
        pos: { x: nx, y: he.pos.y },
        iColorShift: i === 1 ? 6 : 0,
      })
    }
    frames.push({
      durationMs: delayMs(1),
      fighters: fighters.length > 0 ? fighters : undefined,
    })
    dist = Math.trunc(dist / -2)
  }

  // —— 末:复位 pos = posBak,Delay(1)(fight.c:3240-3245)——
  const resetFighters: BattleAnimFrame['fighters'] = hurtEnemies.map((he) => ({
    side: 'enemy' as const,
    idx: he.idx,
    pos: { x: he.pos.x, y: he.pos.y },
    iColorShift: 0,
  }))
  frames.push({
    durationMs: delayMs(1),
    fighters: resetFighters.length > 0 ? resetFighters : undefined,
  })

  return frames
}

/** SHORT cast(xOffset/yOffset 是 WORD 但 sdlpal 用 (SHORT) 强转,fight.c:2749)。 */
function asShortLocal(n: number): number {
  return (n << 16) >> 16
}
