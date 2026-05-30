/**
 * 物理战斗动画时间线 builder(D17a)—— 纯函数,**不 mutate state**,只产
 * `BattleAnimFrame[]`。接收 fighter pos/idx 等只读快照 + sdlpal 参数,
 * tickPerformAction 逐帧驱动(applyAnimFrame)。
 *
 * 本切片:物理攻击(player→enemy)/ 物理受击(enemy→player)/ 死亡帧。
 * 6 种法术动画 + 平滑 fade-scene 留后续叶子(明确 defer)。
 *
 * 出处:
 *   - buildPlayerAttackTimeline  ← fight.c:2008-2263 PAL_BattleShowPlayerAttackAnim
 *   - buildEnemyPhysicalTimeline ← fight.c:4910-5149 PAL_BattleEnemyPerformAction(physical 分支)
 *   - 帧时长 PAL_BattleDelay(N) = N × BATTLE_FRAME_TIME(battle.h:28-29,BATTLE_FPS=25 → 40ms)
 */

import type { BattleAnimFrame } from './battle-state.js'

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
