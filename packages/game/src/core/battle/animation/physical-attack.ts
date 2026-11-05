/** Physical attack choreography for players and enemies, including confused attacks. */
import type { BattleAnimFrame } from '../battle-state.js'
import { delayMs, EFFECT_SPRITE_CHUNK } from './frames.js'
import { buildPostMagicTimeline } from './hit-reaction.js'

/**
 * 混乱队员攻击友军的**走入动画**(port fight.c:3791-3858,kBattleActionAttackMate 演出,PAL_CLASSIC)。
 *   windup frame8/0 ×2 各 Delay(1)(3791-3798)→ Delay(2)(3800)→ 走到 target+(30,12) frame8 Delay(5)
 *   (3802-3807)→ frame9(+武器音 M6,3809-3810)+ 友军击退 pos-(12,6)(3837-3840)Delay(1)→ 友军
 *   iColorShift 6 闪白 Delay(1)(3842-3843)→ iColorShift 0 Delay(4)(3847-3848)→ UpdateFighters
 *   复位 caster+target Delay(4)(3850-3851)。pos 均用 posOriginal 底锚。
 * D8(2026-06-02):此前 attack-mate 只做伤害结算,无走入精灵动画 → 补齐。
 */
export function buildAttackMateTimeline(input: {
  casterIdx: number
  casterPos: { x: number; y: number }
  targetIdx: number
  targetPos: { x: number; y: number }
}): BattleAnimFrame[] {
  const { casterIdx, casterPos, targetIdx, targetPos } = input
  const frames: BattleAnimFrame[] = []
  // windup frame8/0 ×2(fight.c:3791-3798)
  for (let j = 0; j < 2; j++) {
    frames.push({
      durationMs: delayMs(1),
      fighters: [{ side: 'player', idx: casterIdx, currentFrame: 8 }],
    })
    frames.push({
      durationMs: delayMs(1),
      fighters: [{ side: 'player', idx: casterIdx, currentFrame: 0 }],
    })
  }
  frames.push({ durationMs: delayMs(2) }) // Delay(2)(fight.c:3800)
  // 走到 target+(30,12) frame8 Delay(5)(fight.c:3802-3807)
  const lungeX = targetPos.x + 30
  const lungeY = targetPos.y + 12
  frames.push({
    durationMs: delayMs(5),
    fighters: [{ side: 'player', idx: casterIdx, currentFrame: 8, pos: { x: lungeX, y: lungeY } }],
  })
  // frame9(武器音 M6)+ 友军击退 pos-(12,6)(fight.c:3809-3840)
  const knockX = targetPos.x - 12
  const knockY = targetPos.y - 6
  frames.push({
    durationMs: delayMs(1),
    fighters: [
      { side: 'player', idx: casterIdx, currentFrame: 9, pos: { x: lungeX, y: lungeY } },
      { side: 'player', idx: targetIdx, pos: { x: knockX, y: knockY } },
    ],
  })
  // 友军 iColorShift 6 闪白 Delay(1)(fight.c:3842-3843)
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'player', idx: targetIdx, iColorShift: 6, pos: { x: knockX, y: knockY } }],
  })
  // 友军 iColorShift 0 Delay(4)(fight.c:3847-3848)
  frames.push({
    durationMs: delayMs(4),
    fighters: [{ side: 'player', idx: targetIdx, iColorShift: 0, pos: { x: knockX, y: knockY } }],
  })
  // UpdateFighters 复位 caster+target Delay(4)(fight.c:3850-3851)
  frames.push({
    durationMs: delayMs(4),
    fighters: [
      { side: 'player', idx: casterIdx, currentFrame: 0, pos: casterPos },
      { side: 'player', idx: targetIdx, currentFrame: 0, pos: targetPos },
    ],
  })
  return frames
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
  /** 钳后真实掉血(damageNum value;掉血 → blue)。单体目标用;群攻传 0(各敌数字走 groupDamageNums)。 */
  damage: number
  /**
   * M6 出招声(attackSound / criticalSound,fight.c:2061-2071):ShowPlayerAttackAnim 起手(frame=8 前)播一次
   * → 挂 frame0 冲刺帧 frame.sound。0/缺 = 不挂。**改帧同步**而非 attack.ts loop 内同步 bus.emit ——
   * 后者双击两段同 tick drain 重叠成一次(user 2026-06-05 报"单体双击出招音只响一次")。
   */
  attackVoice?: number
  /**
   * M6 武器声(weaponSound,fight.c:2124):currentFrame=9 后、命中特效循环前播一次 → 挂特效 i==0 帧
   * (该帧 currentFrame=9)frame.sound。0/缺 = 不挂。同 attackVoice 改帧同步避免双击重叠。
   */
  weaponSound?: number
  /**
   * 群攻(sTarget==-1)各掉血敌的伤害数字 —— 挂挥砍 i==0 帧(sdlpal PAL_BattleDisplayStatChange
   * 在 ShowPlayerAttackAnim i==0 遍历全敌,fight.c:2209/626-659),非挥砍后。单体目标走单数 damage
   * (嵌 i==0 帧 damageNum),不传此。
   */
  groupDamageNums?: Array<{
    target: { kind: 'enemy' | 'player'; idx: number }
    value: number
    color: 'yellow' | 'blue' | 'cyan'
  }>
  /**
   * L12 首击前摇:C 在 PAL_BattleShowPlayerAttackAnim 之前、仅首击(t==0)`wCurrentFrame=7 +
   * PAL_BattleDelay(4)`(fight.c:3667-3671 单体 / 3690-3694 群攻)。true → 前置一帧
   * { currentFrame:7, pos:attackerPos, Delay(4) }。双击/群攻第二击不传(只首击有前摇)。
   */
  windup?: boolean
  /**
   * DH6:群攻(sTarget==-1)参与演出的敌人(idx + posOriginal)。C 真值:
   *   - 特效 i==0 帧**所有敌人** iColorShift=6(fight.c:2196-2203);
   *   - 收势前全敌 colorShift 复位(:2225-2228);
   *   - 收势 3 帧**所有敌人** x-=dist(dist 8→-4→2,y 不动)各 Delay(1)(:2229-2247)。
   * 仅 targetIdx<0 时消费;不传 → 退化为旧"只弹数字"行为(旧 fixture 兼容)。
   */
  groupEnemies?: Array<{ idx: number; x: number; y: number }>
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
    groupDamageNums,
    attackVoice,
    weaponSound,
    windup,
    groupEnemies,
  } = input
  const ex = targetEnemyPos.x
  const ey = targetEnemyPos.y
  const enemyH = targetEnemyHeight

  const frames: BattleAnimFrame[] = []

  // —— L12 首击前摇:wCurrentFrame=7(举武器蓄力姿)+ PAL_BattleDelay(4)=4 帧(fight.c:3667-3671/3690-3694,
  //   仅 t==0)。攻击者原地不动(pos=attackerPos),冲刺(frame8)之前的蓄势停顿。——
  if (windup) {
    frames.push({
      durationMs: delayMs(4),
      fighters: [
        {
          side: 'player',
          idx: attackerIdx,
          currentFrame: 7,
          pos: { x: attackerPos.x, y: attackerPos.y },
        },
      ],
    })
  }

  // —— frame 0:currentFrame=8,冲刺到敌前(fight.c:2076-2097)+ 出招声(fight.c:2061-2071 起手)——
  // x = enemy_x - dist + 64;y = enemy_y + dist + 20(dist=0 单体简化)
  const rushX0 = ex + 64
  const rushY0 = ey + 20
  frames.push({
    durationMs: delayMs(2),
    fighters: [
      { side: 'player', idx: attackerIdx, currentFrame: 8, pos: { x: rushX0, y: rushY0 } },
    ],
    ...(attackVoice && attackVoice > 0 ? { sound: attackVoice } : {}),
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
      // i==0:target 染色 + 伤害数字(fight.c:2195-2209)。
      if (targetIdx >= 0) {
        fighters.push({ side: 'enemy', idx: targetIdx, iColorShift: 6 })
      } else if (groupEnemies) {
        // DH6:群攻(sTarget==-1)i==0 帧**所有敌人** iColorShift=6(fight.c:2196-2203)。
        for (const ge of groupEnemies) fighters.push({ side: 'enemy', idx: ge.idx, iColorShift: 6 })
      }
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
      ...(i === 0 && targetIdx >= 0
        ? {
            damageNum: {
              target: { kind: 'enemy' as const, idx: targetIdx },
              value: damage,
              color: 'blue' as const,
            },
          }
        : {}),
      // 群攻(targetIdx<0):各掉血敌数字挂 i==0 帧(sdlpal DisplayStatChange 遍历全敌,fight.c:2209/626-659)。
      ...(i === 0 && groupDamageNums && groupDamageNums.length > 0
        ? { damageNums: groupDamageNums }
        : {}),
      // M6 武器声(fight.c:2124):currentFrame=9 后、特效循环前播 → 挂特效 i==0 帧(currentFrame=9 同帧)。
      ...(i === 0 && weaponSound && weaponSound > 0 ? { sound: weaponSound } : {}),
    })
  }

  // —— frame 5..7:抖动 3 帧 + 复位 iColorShift=0(fight.c:2223-2262)——
  if (targetIdx < 0) {
    // DH6:群攻收势 —— 收势前**全敌** colorShift 复位(fight.c:2225-2228),随后 3 帧
    //   **所有敌人** x-=dist(dist 8→-4→2,y 不动:C 注释掉了 `y -= dist/2`)各 Delay(1)
    //   (fight.c:2229-2247)。位移累积不复位,播完由 driver resetFightersAfterAction 归位
    //   (= C 动作收尾 UpdateFighters 复位 posOriginal)。无 groupEnemies(旧 fixture)→ 空延时。
    let gDist = 8
    const offsets: number[] = []
    let acc = 0
    for (let i = 0; i < 3; i++) {
      acc -= gDist
      offsets.push(acc)
      gDist = Math.trunc(gDist / -2)
    }
    for (let i = 0; i < 3; i++) {
      if (!groupEnemies || groupEnemies.length === 0) {
        frames.push({ durationMs: delayMs(1) })
        continue
      }
      const fighters: BattleAnimFrame['fighters'] = groupEnemies.map((ge) => ({
        side: 'enemy' as const,
        idx: ge.idx,
        pos: { x: ge.x + offsets[i]!, y: ge.y },
        ...(i === 0 ? { iColorShift: 0 } : {}),
      }))
      frames.push({ durationMs: delayMs(1), fighters })
    }
    return frames
  }
  // 单体:dist=8;每帧 x-=dist;dist/=-2;y+=dist。x 序列:ex-8 / ex-4 / ex-6
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
  /** DL32:攻击开始时目标当前帧(= sdlpal wFrameBak,fight.c:4915;睡眠姿 1 等)。缺省 0。 */
  targetFrameBak?: number
  /** 敌人 idle 底锚(EnemyPos + yPosOffset)。 */
  enemyPos: { x: number; y: number }
  /** 敌人 idx(enemies[])。 */
  enemyIdx: number
  /** 目标队员当前底锚(g_rgPlayerPos[count-1][playerIdx])。 */
  targetPlayerPos: { x: number; y: number }
  /** 目标队员 idx(players[])。 */
  targetIdx: number
  /** 敌人精灵帧参数(enemies.json[id])+ M6 攻击中段/命中音(actionSound/callSound,fight.c:5003/5084)。 */
  enemy: {
    magicFrames: number
    attackFrames: number
    actWaitFrames: number
    idleFrames: number
    actionSound: number
    callSound: number
  }
  /** 钳后真实掉血(damageNum value)。 */
  damage: number
  /** 命中后队员是否死亡(hp→0)。 */
  targetDied: boolean
  /** 命中后队员是否濒死(PAL_IsPlayerDying;死亡优先)。 */
  targetDying: boolean
  /**
   * 被动格挡(fAutoDefend,fight.c:4938 `RandomLong(0,16)>=10` 7/17 命中)。true 时:
   *   - **不结算伤害**(5052 `!fAutoDefend` gate 罩住整个伤害块)→ 无 damageNum、无 frame 4 受击闪烁;
   *   - 玩家在敌人冲锋时摆**格挡姿 frame 3**(fight.c:5025);
   *   - 命中帧播 `coverSound`(rgwCoverSound[role],fight.c:5026/5082)而非 callSound;
   *   - 敌人 lunge 攻击动画照常(5029-5050 不受 fAutoDefend 影响)。
   */
  autoDefend?: boolean
  /** 格挡音 rgwCoverSound[targetRole](fight.c:5026;autoDefend 命中帧播,0 跳过)。 */
  coverSound?: number
  /** 队友替挡(iCoverIndex!=-1):coverer 跳到目标前 frame 3,并在命中后略前移(fight.c:5017-5025/5088-5106)。 */
  cover?: { idx: number; pos: { x: number; y: number } }
}

/**
 * enemy 物理攻击动画时间线。
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
  const { magicFrames, attackFrames, actWaitFrames, idleFrames, actionSound, callSound } = enemy
  // 被动格挡(fight.c:4938 fAutoDefend):玩家摆格挡姿 frame 3、不结算伤害、命中帧播 coverSound(见下)。
  const autoDefend = input.autoDefend ?? false
  const coverSound = input.coverSound ?? 0
  const cover = input.cover
  // 格挡 / 替挡姿 fighter(冲锋帧首帧起摆;sdlpal fight.c:5025 在 charge 前设 wCurrentFrame=3)。
  const blockPose = autoDefend
    ? [
        cover
          ? {
              side: 'player' as const,
              idx: cover.idx,
              currentFrame: 3,
              pos: { x: targetPlayerPos.x - 24, y: targetPlayerPos.y - 12 },
            }
          : { side: 'player' as const, idx: targetIdx, currentFrame: 3 },
      ]
    : []

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

  // —— Delay(1) + actionSound(fight.c:5001-5005,classic 即使 0 也播,ts 0 视为无音跳过)——
  frames.push({ durationMs: delayMs(1), ...(actionSound > 0 ? { sound: actionSound } : {}) })

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
        ...blockPose, // autoDefend:冲锋首帧起玩家摆格挡姿 frame 3
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
          ...(i === 0 ? blockPose : []), // autoDefend:冲锋首帧起玩家摆格挡姿 frame 3
        ],
      })
    }
  }

  // —— 命中帧(fight.c:5052-5086)——
  if (autoDefend) {
    // 格挡:`if (!fAutoDefend)`(fight.c:5052)gate 罩住整个伤害块 → 不结算伤害、无 frame 4 受击闪烁、无 damageNum。
    //   玩家保持格挡姿 frame 3;命中帧播 coverSound(iSound=rgwCoverSound[role],fight.c:5026/5082;0 跳过)。
    frames.push({
      durationMs: delayMs(1),
      fighters: [
        cover
          ? {
              side: 'player',
              idx: cover.idx,
              currentFrame: 3,
              pos: { x: targetPlayerPos.x - 24, y: targetPlayerPos.y - 12 },
            }
          : { side: 'player', idx: targetIdx, currentFrame: 3 },
      ],
      ...(coverSound > 0 ? { sound: coverSound } : {}),
    })
  } else {
    // 命中:target.currentFrame=4,iColorShift=6 + damageNum + callSound,Delay(1)(fight.c:5052-5086)。
    //   callSound(iSound=enemy.wCallSound,fight.c:5010/5084)在命中帧播(classic 即使 0 也播,ts 0 跳过)。
    frames.push({
      durationMs: delayMs(1),
      fighters: [{ side: 'player', idx: targetIdx, currentFrame: 4, iColorShift: 6 }],
      damageNum: { target: { kind: 'player', idx: targetIdx }, value: damage, color: 'blue' },
      ...(callSound > 0 ? { sound: callSound } : {}),
    })
  }

  // —— iColorShift=0;命中后位移,Delay(1)(fight.c:5088-5106)——
  // 普通命中:target.pos += (8,4);cover:enemy.pos -= (10,8),coverer.pos += (4,2),目标本人不动。
  const knockX = targetPlayerPos.x + 8
  const knockY = targetPlayerPos.y + 4
  if (cover) {
    frames.push({
      durationMs: delayMs(1),
      fighters: [
        { side: 'enemy', idx: enemyIdx, pos: { x: chargeX - 10, y: chargeY - 8 } },
        {
          side: 'player',
          idx: cover.idx,
          pos: { x: targetPlayerPos.x - 20, y: targetPlayerPos.y - 10 },
        },
      ],
    })
  } else {
    frames.push({
      durationMs: delayMs(1),
      fighters: [{ side: 'player', idx: targetIdx, iColorShift: 0, pos: { x: knockX, y: knockY } }],
    })
  }

  // —— 死亡 / 濒死 frameBak;target.pos += (2,1),Delay(3)(fight.c:5108-5125)——
  // wFrameBak 在 Delay(3) 后才赋给 currentFrame(fight.c:5132),这里先算好留到后面帧用。
  // DL32:wFrameBak = **攻击开始时目标当前帧**(fight.c:4915,睡眠姿 1 等),仅死(→2)/濒死(→1)
  //   覆盖 —— 睡倒目标被打后收尾恢复睡姿而非站立(reset 兜底前 ~5 帧)。缺省 0(旧 fixture)。
  let frameBak = input.targetFrameBak ?? 0
  if (targetDied) frameBak = 2
  else if (targetDying) frameBak = 1
  frames.push({
    durationMs: delayMs(3),
    ...(cover
      ? {}
      : {
          fighters: [
            { side: 'player' as const, idx: targetIdx, pos: { x: knockX + 2, y: knockY + 1 } },
          ],
        }),
  })

  // —— enemy.pos=posOriginal,currentFrame=0,Delay(1)(fight.c:5127-5130)——
  frames.push({
    durationMs: delayMs(1),
    fighters: [
      { side: 'enemy', idx: enemyIdx, currentFrame: 0, pos: { x: enemyPos.x, y: enemyPos.y } },
    ],
  })

  // —— target.currentFrame=frameBak,Delay(1,TRUE) + Delay(4,TRUE)(fight.c:5132-5135)——
  // 仅此收尾两帧 fUpdateGesture=TRUE(物攻段其余 Delay 全 FALSE):敌人 idle 呼吸恢复推进,
  // 200ms 收尾不再全画面死冻(瞬移复位的"卡顿感"根因,user 2026-06-13 报)。
  //
  // 位置归位**改良**(有意偏离 C 帧序,总时长不变):C 是 frameBak 切站姿(坐标仍在击退处)
  // → 200ms → UpdateFighters 瞬移归位的两段式;受击帧与站立帧精灵视觉中心不同,切帧时
  // 人物"弹回一截",停 200ms 后坐标又跳一次 → user 报"回一半→卡顿→瞬移"。法术受击收尾
  // (C fight.c:4906)本就是姿势+坐标同帧一次归位 → 手感流畅。物攻对齐法术式:坐标复位
  // 提前并入 frameBak 帧(cover 替挡者同帧归位),200ms 停顿期人已就位。
  frames.push({
    durationMs: delayMs(1),
    fighters: [
      {
        side: 'player',
        idx: targetIdx,
        currentFrame: frameBak,
        pos: { x: targetPlayerPos.x, y: targetPlayerPos.y },
      },
      ...(cover
        ? [{ side: 'player' as const, idx: cover.idx, pos: { x: cover.pos.x, y: cover.pos.y } }]
        : []),
    ],
    updateGesture: true,
  })
  frames.push({ durationMs: delayMs(4), updateGesture: true })

  return frames
}

export interface BuildEnemyConfusedAttackInput {
  /** 混乱攻击者 enemy idx + 站立底锚 posOriginal。 */
  attackerIdx: number
  attackerPos: { x: number; y: number }
  /** 被打的友敌 idx + 站立底锚 posOriginal。 */
  targetIdx: number
  targetPos: { x: number; y: number }
  /** 目标 sprite frame0 高度(PAL_RLEGetHeight;core 无资源 → 传 0,火花 Y 仅退化 +10)。 */
  targetHeight: number
  /** 已结算的实际掉血(钳后 delta)。 */
  damage: number
}

/**
 * 混乱敌人攻击友敌动画时间线(port fight.c:4596-4654 confused 分支)。
 *
 *   - 滑步 3 帧:attacker.pos = (attacker.pos + target.pos)/2,Delay(1)(fight.c:4598-4612)
 *   - 火花 3 帧:lpEffectSprite frame 9/10/11,落点中点 x=(attacker_滑后+target)/2,
 *       y=target.y - targetH/3 + 10,各 Delay(1)(fight.c:4614-4632)
 *   - 受击:PAL_BattleDisplayStatChange(伤害数字)+ PAL_BattleShowPostMagicAnim(target 抖动),
 *       数字挂 PostMagic 首帧(fight.c:4647-4648)
 *   - Delay(5) 停顿,复位 attacker.pos=posOriginal,Delay(2)(fight.c:4649-4652)
 */
export function buildEnemyConfusedAttackTimeline(
  input: BuildEnemyConfusedAttackInput,
): BattleAnimFrame[] {
  const { attackerIdx, attackerPos, targetIdx, targetPos, targetHeight, damage } = input
  const frames: BattleAnimFrame[] = []

  // —— 滑步 3 帧:attacker pos 向 target 中点逼近(fight.c:4598-4612)——
  let ax = attackerPos.x
  let ay = attackerPos.y
  for (let i = 0; i < 3; i++) {
    ax = Math.trunc((ax + targetPos.x) / 2)
    ay = Math.trunc((ay + targetPos.y) / 2)
    frames.push({
      durationMs: delayMs(1),
      fighters: [{ side: 'enemy', idx: attackerIdx, pos: { x: ax, y: ay } }],
    })
  }

  // —— 火花 3 帧:lpEffectSprite 9/10/11,落点中点(fight.c:4614-4632)——
  const fxX = Math.trunc((ax + targetPos.x) / 2)
  const fxY = targetPos.y - Math.floor(targetHeight / 3) + 10
  for (let i = 9; i < 12; i++) {
    frames.push({
      durationMs: delayMs(1),
      overlay: { kind: 'effect', spriteChunk: EFFECT_SPRITE_CHUNK, frameIdx: i, x: fxX, y: fxY },
    })
  }

  // —— 受击:target 抖动(PostMagic)+ 伤害数字挂首帧(fight.c:4647-4648)——
  const postFrames = buildPostMagicTimeline({ hurtEnemies: [{ idx: targetIdx, pos: targetPos }] })
  const first = postFrames[0]
  if (first) {
    postFrames[0] = {
      ...first,
      damageNum: { target: { kind: 'enemy', idx: targetIdx }, value: damage, color: 'blue' },
    }
  }
  frames.push(...postFrames)

  // —— Delay(5) 停顿 + 复位 attacker.pos,Delay(2)(fight.c:4649-4652)——
  frames.push({ durationMs: delayMs(5) })
  frames.push({
    durationMs: delayMs(2),
    fighters: [{ side: 'enemy', idx: attackerIdx, pos: { x: attackerPos.x, y: attackerPos.y } }],
  })

  return frames
}
