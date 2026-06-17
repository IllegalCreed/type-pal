/**
 * 物理战斗动画时间线 builder(D17a)—— 纯函数,**不 mutate state**,只产
 * `BattleAnimFrame[]`。接收 fighter pos/idx 等只读快照 + sdlpal 参数,
 * tickPerformAction 逐帧驱动(applyAnimFrame)。
 *
 * 本切片:物理攻击(player→enemy)/ 物理受击(enemy→player)/ 死亡帧。
 * D17:player **攻击魔法**链(PreMagic → OffMagic → PostMagic)。
 * D17 法术补全:player **防御/治疗魔法** DefMagic + **敌方攻击魔法** EnemyMagic。
 * 召唤 Summon 已接入 buildAndStartSummonAnim;Trance 已接入成功后的 colorShift 变身段。
 *
 * 出处:
 *   - buildPlayerAttackTimeline   ← fight.c:2008-2263 PAL_BattleShowPlayerAttackAnim
 *   - buildEnemyPhysicalTimeline  ← fight.c:4910-5149 PAL_BattleEnemyPerformAction(physical 分支)
 *   - buildPreMagicTimeline       ← fight.c:2337-2445 PAL_BattleShowPlayerPreMagicAnim
 *   - buildPlayerOffMagicTimeline ← fight.c:2608-2844 PAL_BattleShowPlayerOffMagicAnim
 *   - buildPostMagicTimeline      ← fight.c:3189-3246 PAL_BattleShowPostMagicAnim
 *   - buildPlayerDefMagicTimeline ← fight.c:2447-2606 PAL_BattleShowPlayerDefMagicAnim
 *   - buildEnemyMagicTimeline     ← fight.c:2846-3069 PAL_BattleShowEnemyMagicAnim
 *   - buildEnemySummonTimeline    ← script.c:2870-2950 0x9E enemy summon visible slices
 *   - buildEnemyTransformTimeline ← script.c:2957-2983 0x9F enemy transform color shift
 *   - 帧时长 PAL_BattleDelay(N) = N × BATTLE_FRAME_TIME(battle.h:28-29,BATTLE_FPS=25 → 40ms)
 */

import type { BattleAnimFrame, BattleAnimOverlay, FighterDelta } from './battle-state.js'

/** BATTLE_FRAME_TIME = 1000 / BATTLE_FPS = 1000/25 = 40ms(battle.h:28-29)。 */
export const BATTLE_FRAME_TIME = 40

/** lpEffectSprite = DATA.MKF chunk 10(battle.c:1790 PAL_MKFReadChunk(..., 10, fpDATA))。 */
export const EFFECT_SPRITE_CHUNK = 10

/** N 帧 × 40ms(sdlpal PAL_BattleDelay(N))。 */
function delayMs(frames: number): number {
  return frames * BATTLE_FRAME_TIME
}

function timedScriptShake(i: number, scriptShake: { time: number; level: number } | undefined): BattleAnimFrame['shake'] {
  if (!scriptShake || scriptShake.time <= 0) return undefined
  if (i >= scriptShake.time) return undefined
  return { time: scriptShake.time - i, level: scriptShake.level }
}

/**
 * 逃跑失败动画(sdlpal fight.c:4155-4168,kBattleActionFlee 失败分支):
 *   frame 0;3 步每步 pos +=(4,2) Delay(1);最后 frame 1(濒死姿)Delay(8)。
 *   末帧同步显示 BATTLE_LABEL_ESCAPEFAIL(WORD 31 "逃跑失败")。
 * startPos = 失败队员 posOriginal(站立锚)。
 */
export function buildFleeFailTimeline(playerIdx: number, startPos: { x: number, y: number }): BattleAnimFrame[] {
  const frames: BattleAnimFrame[] = []
  let x = startPos.x
  let y = startPos.y
  for (let i = 0; i < 3; i++) {
    x += 4
    y += 2
    frames.push({
      durationMs: delayMs(1),
      fighters: [{ side: 'player', idx: playerIdx, currentFrame: 0, pos: { x, y } }],
    })
  }
  // frame 1(濒死姿)hold 8 帧,期间显示 BATTLE_LABEL_ESCAPEFAIL=31 @ (130,75)。
  frames.push({
    durationMs: delayMs(8),
    fighters: [{ side: 'player', idx: playerIdx, currentFrame: 1 }],
    battleMessage: { text: '逃跑失败', durationMs: delayMs(8) },
  })
  return frames
}

/**
 * 偷窃动画(sdlpal fight.c:5218-5246,PAL_BattleStealFromEnemy 动画段):
 *   玩家 frame 10(偷窃姿);offset=(target-player)*8;冲到敌前 (enemy.x+64-offset, enemy.y+22+offset) Delay(1);
 *   5 步逼近:每步 x-=(i+8) y-=4,第 5 步(i==4)敌 iColorShift=6 闪白,各 Delay(1);
 *   收尾:敌 iColorShift=0,x--,Delay(3)。enemyPos = 目标敌 posOriginal(底锚)。
 */
export function buildStealTimeline(playerIdx: number, targetEnemyIdx: number, enemyPos: { x: number, y: number }): BattleAnimFrame[] {
  const offset = (targetEnemyIdx - playerIdx) * 8
  let x = enemyPos.x + 64 - offset
  let y = enemyPos.y + 22 + offset
  const frames: BattleAnimFrame[] = [
    { durationMs: delayMs(1), fighters: [{ side: 'player', idx: playerIdx, currentFrame: 10, pos: { x, y } }] },
  ]
  for (let i = 0; i < 5; i++) {
    x -= i + 8
    y -= 4
    const fighters: FighterDelta[] = [{ side: 'player', idx: playerIdx, currentFrame: 10, pos: { x, y } }]
    if (i === 4) fighters.push({ side: 'enemy', idx: targetEnemyIdx, iColorShift: 6 }) // 敌闪白
    frames.push({ durationMs: delayMs(1), fighters })
  }
  x -= 1
  frames.push({
    durationMs: delayMs(3),
    fighters: [{ side: 'player', idx: playerIdx, pos: { x, y } }, { side: 'enemy', idx: targetEnemyIdx, iColorShift: 0 }],
  })
  return frames
}

/**
 * 投掷物**挥臂出手动画**(port fight.c:4339-4356,kBattleActionThrowItem 演出)。
 *   - i=0..3:4 步前移 pos-=(4-i, (4-i)/2),各 Delay(1)(fight.c:4339-4346)
 *   - Delay(2)(fight.c:4348)
 *   - currentFrame=5(投掷姿)+ magicSound(rgwMagicSound[role],fight.c:4350-4351),Delay(8)(fight.c:4353)
 *   - currentFrame=6,Delay(2)(fight.c:4355-4356)
 * 之后由 caller 接 OffMagic 特效(0x42 PAL_BattleSimulateMagic → ShowPlayerOffMagicAnim,fight.c:5340)。
 * startPos = 投掷队员 posOriginal(站立锚);magicSound=0 → frame5 不带 sound。
 */
export function buildThrowWindupTimeline(playerIdx: number, startPos: { x: number, y: number }, magicSound: number, itemName?: string): BattleAnimFrame[] {
  const frames: BattleAnimFrame[] = []
  let x = startPos.x
  let y = startPos.y
  // —— 4 步前移(fight.c:4339-4346,PAL_BattleDelay(1,0) 不显名)——
  for (let i = 0; i < 4; i++) {
    x -= 4 - i
    y -= Math.trunc((4 - i) / 2)
    frames.push({ durationMs: delayMs(1), fighters: [{ side: 'player', idx: playerIdx, pos: { x, y } }] })
  }
  // —— Delay(2) hold(fight.c:4348 PAL_BattleDelay(2,wObject) 起在 (210,50) 显示所投物品名,
  //    L15:贯穿挥臂 hold(2)+frame5(8)+frame6(2)=12 帧)——
  frames.push({
    durationMs: delayMs(2),
    ...(itemName ? { battleMessage: { text: itemName, durationMs: delayMs(12), pos: { x: 210, y: 50 } } } : {}),
  })
  // —— frame5(投掷姿)+ magicSound,Delay(8)(fight.c:4350-4353)——
  frames.push({
    durationMs: delayMs(8),
    fighters: [{ side: 'player', idx: playerIdx, currentFrame: 5 }],
    ...(magicSound > 0 ? { sound: magicSound } : {}),
  })
  // —— frame6,Delay(2)(fight.c:4355-4356)——
  frames.push({ durationMs: delayMs(2), fighters: [{ side: 'player', idx: playerIdx, currentFrame: 6 }] })
  return frames
}

/**
 * 战斗使用物品前摇(port fight.c:2266-2335 PAL_BattleShowPlayerUseItemAnim)。
 *   - Delay(4)
 *   - 使用者前移(-15,-7)、frame5、sound 28
 *   - 目标队员 colorShift 0..6 再 5..0;全体目标时所有队员同步闪。
 *
 * 脚本和 consuming 扣除在这条时间线播完后执行(见 battle-system afterComplete),
 * 对齐 fight.c:4385 先 ShowPlayerUseItemAnim,随后 4387-4400 RunTriggerScript/AddItem。
 */
export function buildUseItemTimeline(input: {
  casterIdx: number
  casterPos: { x: number; y: number }
  targetIdx: number | 'all'
  playerCount: number
  itemName?: string // L15:演出期间在 (210,50) 显示所用物品名(fight.c:2316/2333)
}): BattleAnimFrame[] {
  const frames: BattleAnimFrame[] = []
  const { casterIdx, casterPos, targetIdx, playerCount, itemName } = input
  const shiftedCasterPos = { x: casterPos.x - 15, y: casterPos.y - 7 }

  frames.push({ durationMs: delayMs(4) })

  const targetDeltas = (shift: number): FighterDelta[] => {
    if (targetIdx === 'all') {
      return Array.from({ length: playerCount }, (_, idx) => ({
        side: 'player' as const,
        idx,
        iColorShift: shift,
      }))
    }
    return [{ side: 'player' as const, idx: targetIdx, iColorShift: shift }]
  }

  for (let i = 0; i <= 6; i++) {
    const fighters = targetDeltas(i)
    if (i === 0) {
      fighters.unshift({
        side: 'player',
        idx: casterIdx,
        pos: shiftedCasterPos,
        currentFrame: 5,
      })
    }
    frames.push({
      durationMs: delayMs(1),
      fighters,
      ...(i === 0 ? { sound: 28 } : {}),
      // L15:i==0 起在 (210,50) 显示物品名,贯穿两个 colorShift 循环 7+6=13 帧(fight.c:2316/2333)
      ...(i === 0 && itemName ? { battleMessage: { text: itemName, durationMs: delayMs(13), pos: { x: 210, y: 50 } } } : {}),
    })
  }

  for (let i = 5; i >= 0; i--) {
    frames.push({
      durationMs: delayMs(1),
      fighters: targetDeltas(i),
    })
  }

  // DM12:用毕收尾停顿 PAL_BattleDelay(8)(fight.c:4404-4406:UpdateFighters → DisplayStatChange →
  //   Delay(8))——数字弹出后停 ~320ms 再进下一动作,飘字不叠下一段演出。
  frames.push({ durationMs: delayMs(8) })

  return frames
}

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
    frames.push({ durationMs: delayMs(1), fighters: [{ side: 'player', idx: casterIdx, currentFrame: 8 }] })
    frames.push({ durationMs: delayMs(1), fighters: [{ side: 'player', idx: casterIdx, currentFrame: 0 }] })
  }
  frames.push({ durationMs: delayMs(2) }) // Delay(2)(fight.c:3800)
  // 走到 target+(30,12) frame8 Delay(5)(fight.c:3802-3807)
  const lungeX = targetPos.x + 30
  const lungeY = targetPos.y + 12
  frames.push({ durationMs: delayMs(5), fighters: [{ side: 'player', idx: casterIdx, currentFrame: 8, pos: { x: lungeX, y: lungeY } }] })
  // frame9(武器音 M6)+ 友军击退 pos-(12,6)(fight.c:3809-3840)
  const knockX = targetPos.x - 12
  const knockY = targetPos.y - 6
  frames.push({ durationMs: delayMs(1), fighters: [
    { side: 'player', idx: casterIdx, currentFrame: 9, pos: { x: lungeX, y: lungeY } },
    { side: 'player', idx: targetIdx, pos: { x: knockX, y: knockY } },
  ] })
  // 友军 iColorShift 6 闪白 Delay(1)(fight.c:3842-3843)
  frames.push({ durationMs: delayMs(1), fighters: [{ side: 'player', idx: targetIdx, iColorShift: 6, pos: { x: knockX, y: knockY } }] })
  // 友军 iColorShift 0 Delay(4)(fight.c:3847-3848)
  frames.push({ durationMs: delayMs(4), fighters: [{ side: 'player', idx: targetIdx, iColorShift: 0, pos: { x: knockX, y: knockY } }] })
  // UpdateFighters 复位 caster+target Delay(4)(fight.c:3850-3851)
  frames.push({ durationMs: delayMs(4), fighters: [
    { side: 'player', idx: casterIdx, currentFrame: 0, pos: casterPos },
    { side: 'player', idx: targetIdx, currentFrame: 0, pos: targetPos },
  ] })
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
      fighters: [{ side: 'player', idx: attackerIdx, currentFrame: 7, pos: { x: attackerPos.x, y: attackerPos.y } }],
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
  enemy: { magicFrames: number; attackFrames: number; actWaitFrames: number; idleFrames: number; actionSound: number; callSound: number }
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
          ? { side: 'player' as const, idx: cover.idx, currentFrame: 3, pos: { x: targetPlayerPos.x - 24, y: targetPlayerPos.y - 12 } }
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
          ? { side: 'player', idx: cover.idx, currentFrame: 3, pos: { x: targetPlayerPos.x - 24, y: targetPlayerPos.y - 12 } }
          : { side: 'player', idx: targetIdx, currentFrame: 3 },
      ],
      ...(coverSound > 0 ? { sound: coverSound } : {}),
    })
  }
  else {
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
        { side: 'player', idx: cover.idx, pos: { x: targetPlayerPos.x - 20, y: targetPlayerPos.y - 10 } },
      ],
    })
  }
  else {
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
    ...(cover ? {} : { fighters: [{ side: 'player' as const, idx: targetIdx, pos: { x: knockX + 2, y: knockY + 1 } }] }),
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
      { side: 'player', idx: targetIdx, currentFrame: frameBak, pos: { x: targetPlayerPos.x, y: targetPlayerPos.y } },
      ...(cover ? [{ side: 'player' as const, idx: cover.idx, pos: { x: cover.pos.x, y: cover.pos.y } }] : []),
    ],
    updateGesture: true,
  })
  frames.push({ durationMs: delayMs(4), updateGesture: true })

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
 *     上移 4 帧后 pos = (casterX - 10, casterY - 5)(累 (4+3+2+1)=10,/2=5),固定不再动。
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
  const frames = buildPreMagicTimeline({ casterPos, casterIdx, castEffectFrameBase, isSummon: false })
  // script.c:2646:施法者 wCurrentFrame=6
  frames.push({ durationMs: delayMs(1), fighters: [{ side: 'player', idx: casterIdx, currentFrame: 6 }] })
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
  /** caster idx(players[]);-1 = 无 caster(summon 内调,本切片不走)。 */
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
    /** M6 wSound — 法术效果音。CLASSIC 在 (i-fireDelay)%n==0 帧播(fight.c:2713);0/缺 = 无音。 */
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
   * **仅 iBlow!=0 时生效**(iBlow==0 sdlpal 仍每帧 RandomLong(0,0) 消耗 rng,但 ts rng 算法本异、且 blow 恒 0
   *  无视觉,故 iBlow==0 跳过 blow 不摇 rng —— 文档化 deviation,避免污染常见无吹飞法术的 rng 序)。
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
 * blow 位移(iBlow,line 697)/ keepEffect 烙背景(0xFFFF,line 732)/ wScreenWave(line 730)
 * 均已实现(此前残注称 defer,已落地)。
 */
export function buildPlayerOffMagicTimeline(input: BuildOffMagicInput): BattleAnimFrame[] {
  // targetIdx 透传供调用方语义对齐;落点由 magic.type + targetEnemyPos 决定,本体不直接读 targetIdx。
  const { casterIdx, magic, n, targetEnemyPos, iBlow, blowTargets, rng, baseScreenWave } = input
  const { effect, type, speed, fireDelay, effectTimes, shake, scriptShake, xOffset, yOffset, wave, keepEffect, sound } = magic
  // DM9:sLayerOffset(= MAGIC.special 的非 summon 语义,SHORT)—— 法术精灵与敌我精灵统一按
  //   PAL_Y+sLayerOffset 排序(fight.c:2735/battle.c:441-442);99≈恒最上,负值(地面型)画单位身后。
  const layerOffset = asShortLocal((magic as { special?: number }).special ?? 0)
  // W4 iBlow:吹飞累加态(per target 运行 x/y),仅 iBlow!=0 + 有 targets + rng 时启用。
  const blowOn = !!iBlow && iBlow !== 0 && !!blowTargets && blowTargets.length > 0 && !!rng
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
        if (isLast) { t.x = t.pos.x; t.y = t.pos.y } // 末帧复位 posOriginal
        else { t.x += blow; t.y += Math.trunc(blow / 2) }
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
    if (i === l - 1 && keepEffect === 0xffff && (baseScreenWave ?? 0) + (wave ?? 0) < 9) frame.keepEffect = true
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
export function buildEnemyConfusedAttackTimeline(input: BuildEnemyConfusedAttackInput): BattleAnimFrame[] {
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

/** 协力合击聚拢队形(sdlpal fight.c:3602 `rgwCoopPos[3][2]`):发起者→[0],其余贡献者按队序→[1][2]。 */
const COOP_POS: ReadonlyArray<readonly [number, number]> = [[208, 157], [234, 170], [260, 183]]

export interface BuildCoopMagicInput {
  /** 发起者 slot 索引(state.players)。 */
  casterIdx: number
  /** 在场队员数(= wMaxPartyMemberIndex + 1)。t 计数遍历全队 slot。 */
  partySize: number
  /** 贡献者 slot 索引集合(含发起者;= healthy 队员)。 */
  contributorIdxs: number[]
  /** 各 slot 的站立底锚(index = slot;非贡献者可 undefined)。 */
  originalPositions: ReadonlyArray<{ x: number; y: number } | undefined>
  /** 合击 magic 参数(同 OffMagic)。 */
  magic: BuildOffMagicInput['magic']
  /** FIRE.MKF chunk[effect] 帧数。 */
  n: number
  /** 单体目标 enemy idx(normal 用;全体 -1)。 */
  targetIdx: number
  /** 单体目标 enemy 落点(normal 用)。 */
  targetEnemyPos?: { x: number; y: number }
  iBlow?: number
  /** L17 战场基础屏波(battle.c:1563);透传给内部 OffMagic 的 keepEffect<9 判定。缺/0 = 陆战。 */
  baseScreenWave?: number
  /** PostMagic 抖动的受伤敌(idx + idle 底锚)。 */
  hurtEnemies: Array<{ idx: number; pos: { x: number; y: number } }>
  /** 挂在 PostMagic 第一帧的伤害数字(PAL_BattleDisplayStatChange → PAL_BattleShowPostMagicAnim)。 */
  damageNums?: BattleAnimFrame['damageNums']
}

/**
 * 协力合击动画时间线(port fight.c:3856-4107 PAL_CLASSIC,非召唤分支)。
 *
 *  Phase1 聚拢(fight.c:3877-3925):i=1..6,所有贡献者 6 帧线性插值滑向 COOP_POS,各 Delay(1)。
 *    pos =(posOriginal*(6-i) + coopPos*i)/ 6(整除)。t 计数:遍历全队 slot,**每个非发起者 slot 都 t++**
 *    (含非贡献者,fight.c:3905 在贡献者判定前自增)→ 贡献者用 COOP_POS[t]。
 *  Phase2 蓄势(fight.c:3927-3941):slot 倒序,非发起贡献者逐个 wCurrentFrame=5,各 Delay(3)。
 *  Phase3 发起者闪白(fight.c:3943-3945):iColorShift=6 + frame5,Delay(5)。
 *  Phase4 发起者出招(fight.c:3947-3949):frame6 + iColorShift=0,Delay(3)。
 *  Phase5 OffMagic(fight.c:3951):buildPlayerOffMagicTimeline,casterIdx=-1(不切发起者帧6)。
 *  Phase6 PostMagic(fight.c:4046):受伤敌抖动。
 *  Phase7 滑回(fight.c:4056-4106):i=1..6 反向插值回原位,所有贡献者 frame0,各 Delay(1)。
 *    pos =(posOriginal*i + coopPos*(6-i))/ 6。t 计数此处**仅非发起贡献者 t++**(fight.c:4091 在贡献者
 *    判定+发起者跳过之后自增)—— 与 Phase1 的 t 语义不同(sdlpal 原样,非对称,如实复刻)。
 */
export function buildCoopMagicTimeline(input: BuildCoopMagicInput): BattleAnimFrame[] {
  const { casterIdx, partySize, contributorIdxs, originalPositions, magic, n, targetIdx, targetEnemyPos, iBlow, hurtEnemies, damageNums, baseScreenWave } = input
  const isContrib = (j: number): boolean => contributorIdxs.includes(j)
  const frames: BattleAnimFrame[] = []
  const lerp = (orig: number, coop: number, num: number): number => Math.trunc((orig * (6 - num) + coop * num) / 6)

  // —— Phase1 聚拢(i=1..6,fight.c:3877-3925)——
  for (let i = 1; i <= 6; i++) {
    const fighters: FighterDelta[] = []
    const oc = originalPositions[casterIdx]
    if (oc) fighters.push({ side: 'player', idx: casterIdx, pos: { x: lerp(oc.x, COOP_POS[0]![0], i), y: lerp(oc.y, COOP_POS[0]![1], i) } })
    let t = 0
    for (let j = 0; j < partySize; j++) {
      if (j === casterIdx) continue
      t++ // fight.c:3905:贡献者判定**之前**自增(非贡献者也占 t 槽)
      if (!isContrib(j)) continue
      const oj = originalPositions[j]
      const cp = COOP_POS[t]
      if (!oj || !cp) continue
      fighters.push({ side: 'player', idx: j, pos: { x: lerp(oj.x, cp[0], i), y: lerp(oj.y, cp[1], i) } })
    }
    frames.push({ durationMs: delayMs(1), fighters })
  }

  // —— Phase2 非发起贡献者逐个 frame5(slot 倒序,fight.c:3927-3941)——
  for (let i = partySize - 1; i >= 0; i--) {
    if (i === casterIdx || !isContrib(i)) continue
    frames.push({ durationMs: delayMs(3), fighters: [{ side: 'player', idx: i, currentFrame: 5 }] })
  }

  // —— Phase3 发起者闪白(fight.c:3943-3945)——
  frames.push({ durationMs: delayMs(5), fighters: [{ side: 'player', idx: casterIdx, iColorShift: 6, currentFrame: 5 }] })
  // —— Phase4 发起者出招(fight.c:3947-3949)——
  frames.push({ durationMs: delayMs(3), fighters: [{ side: 'player', idx: casterIdx, currentFrame: 6, iColorShift: 0 }] })

  // —— Phase5 OffMagic(fight.c:3951,casterIdx=-1)——
  frames.push(...buildPlayerOffMagicTimeline({ casterIdx: -1, magic, n, targetIdx, targetEnemyPos, iBlow, baseScreenWave }))

  // —— Phase6 PostMagic(fight.c:4046)。数字在 PostMagic 第一帧显示,不是滑回结束后。——
  const postFrames = buildPostMagicTimeline({ hurtEnemies })
  if (damageNums && damageNums.length > 0 && postFrames[0])
    postFrames[0].damageNums = [...(postFrames[0].damageNums ?? []), ...damageNums]
  frames.push(...postFrames)

  // —— Phase7 滑回(i=1..6,fight.c:4056-4106)——
  for (let i = 1; i <= 6; i++) {
    const fighters: FighterDelta[] = []
    const oc = originalPositions[casterIdx]
    // 回位 pos =(posOriginal*i + coopPos*(6-i))/ 6 = lerp(coopPos, posOriginal, i) 的对称(用 lerp(orig,coop,6-i) 不对,显式算)。
    if (oc) fighters.push({ side: 'player', idx: casterIdx, currentFrame: 0, pos: { x: Math.trunc((oc.x * i + COOP_POS[0]![0] * (6 - i)) / 6), y: Math.trunc((oc.y * i + COOP_POS[0]![1] * (6 - i)) / 6) } })
    let t = 0
    for (let j = 0; j < partySize; j++) {
      if (!isContrib(j)) continue
      if (j === casterIdx) continue // frame0 已由发起者块设;此处仅其余贡献者
      t++ // fight.c:4091:贡献者判定 + 发起者跳过**之后**自增(与 Phase1 不同)
      const oj = originalPositions[j]
      const cp = COOP_POS[t]
      if (!oj || !cp) continue
      fighters.push({ side: 'player', idx: j, currentFrame: 0, pos: { x: Math.trunc((oj.x * i + cp[0] * (6 - i)) / 6), y: Math.trunc((oj.y * i + cp[1] * (6 - i)) / 6) } })
    }
    frames.push({ durationMs: delayMs(1), fighters })
  }

  return frames
}

/** PAL_BattleFadeScene crossfade 步数(battle.c:632 12 outer × 6 inner = 72)。 */
export const SUMMON_FADE_STEPS = 72
/** crossfade 每步时长(battle.c:631 time = SDL_GetTicks()+16)。 */
export const SUMMON_FADE_STEP_MS = 16

/**
 * 召唤全员变亮(sdlpal fight.c:3120-3128):i=1..10,所有队员 iColorShift=i,各 Delay(1)。
 * 召唤神精灵载入前的"聚光"前奏。
 */
export function buildSummonBrightenTimeline(partySize: number): BattleAnimFrame[] {
  const frames: BattleAnimFrame[] = []
  for (let i = 1; i <= 10; i++) {
    const fighters: FighterDelta[] = []
    for (let j = 0; j < partySize; j++) fighters.push({ side: 'player', idx: j, iColorShift: i })
    frames.push({ durationMs: delayMs(1), fighters })
  }
  return frames
}

export interface BuildSummonInput {
  /** 召唤神精灵 key('player-{wSummonEffect+10}',F.MKF chunk)。 */
  spriteKey: string
  /** 召唤神屏幕底锚(posSummon = 240+xOffset, 165+yOffset)。 */
  pos: { x: number; y: number }
  /** 背景染色低 nibble 偏移(= (SHORT)magic.effectTimes)。 */
  bgColorShift: number
  /** 召唤神精灵帧数(F.MKF chunk numFrames)。 */
  totalFrames: number
  /** 召唤神逐帧时长 = (magic.speed + 5) * 10 ms(fight.c:3170-3171)。 */
  frameTimeMs: number
  /** 二次法术效果(FIRE.MKF)时间线 —— 调用方用 buildPlayerOffMagicTimeline(casterIdx=-1)建好传入。 */
  offMagicFrames: BattleAnimFrame[]
  /**
   * PostMagic(敌受击抖动)时间线 —— 调用方用 buildPostMagicTimeline 建好传入(缺/空 = 无)。
   * sdlpal PostMagic(fight.c:4323)在召唤神**仍在场**时播,神淡出(fight.c:899 cleanup)在其**之后**。
   * 故此处把 postMagic 裹召唤神留场(frame=lastFrame)排在 offMagic 后、fadeOut 前 —— 否则神先淡出敌再抖,
   * 受击动画过晚(user 2026-06-05 报"天剑敌人受击动画太晚")。
   */
  postMagicFrames?: BattleAnimFrame[]
  /**
   * 召唤淡出**前**复位的队员 fighter delta —— 对齐 sdlpal fight.c:901 `PAL_BattleUpdateFighters()` 在
   * `PAL_BattleFadeScene()`(:911 fadeOut)**之前**调。挂 fadeOut **首帧** → crossfade 目标场景 = 复位后的
   * 正常主角(站立帧 / iColorShift=0 / pos=posOriginal),而非残留的**施法帧(PreMagic currentFrame=5)+
   * 高亮(brighten iColorShift=10)+ 上移(PreMagic pos)**(user 2026-06-17 报"天剑变回来是施法帧+高亮+迁移")。
   * 缺/空 = 不复位(向后兼容旧测试)。
   */
  resetFighters?: BattleAnimFrame['fighters']
}

/**
 * 召唤神演出序列(port fight.c:3072-3187 PAL_BattleShowPlayerSummonMagicAnim 主体 + fight.c:897-912 淡出)。
 *
 *  fadeIn(3151-3152 PAL_BattleFadeScene):召唤神 frame0,72 步 dither crossfade(队员→召唤神),各 16ms。
 *  loop(3160-3181):召唤神 frame 0..totalFrames-2,各 (speed+5)*10 ms(隐队员只画召唤神)。
 *  offMagic(3186):二次法术效果落敌;召唤神定格 last frame 仍在场(精灵未释放,PAL_BattleMakeScene 续画)。
 *  postMagic(4323):敌受击抖动;召唤神**仍在场**(fight.c:899 cleanup 淡出在 PostMagic 之后)→ 裹 summon 留场。
 *  fadeOut(897-912 cleanup):72 步 dither crossfade(召唤神→队员),各 16ms;末态清 summon → 队员归位。
 *
 * 全程 summon.bgColorShift 给背景染色(battle.c:63-67)。present 据 summon.fadeDir 决定渲染"召唤神场景"
 * (in/loop,神在场仍画敌)还是"队员场景"(out),并 dither crossfade 对侧快照。
 */
export function buildSummonGodSequence(input: BuildSummonInput): BattleAnimFrame[] {
  const { spriteKey, pos, bgColorShift, totalFrames, frameTimeMs, offMagicFrames, postMagicFrames } = input
  const frames: BattleAnimFrame[] = []
  const lastFrame = Math.max(0, totalFrames - 1)

  // —— fadeIn:召唤神 frame0,72 步 crossfade(队员→召唤神)——
  for (let s = 0; s < SUMMON_FADE_STEPS; s++) {
    frames.push({ durationMs: SUMMON_FADE_STEP_MS, summon: { spriteKey, frame: 0, pos, bgColorShift, fadeStep: s, fadeDir: 'in' } })
  }
  // —— loop:塌缩成**单一时间线帧**(durationMs = loop 总时长),present 每 rAF 按 wall-clock 细分 iSummonFrame
  //   (stepSummonLoopRender),绕开 40ms 逻辑 tick 对 frameTimeMs(天剑 50ms)的拍频离散 —— 否则 frame0 在
  //   40ms tick 下停 80ms(user 2026-06-17 报"刚完全变成剑的前几帧卡顿")。sdlpal loop 本是独立 50ms blocking
  //   循环(精确 50ms/帧)。loop 帧数 = totalFrames-1(fight.c while iSummonFrame < numFrames-1)。——
  const loopCount = totalFrames - 1
  if (loopCount > 0) {
    frames.push({
      durationMs: loopCount * frameTimeMs,
      summon: { spriteKey, frame: 0, pos, bgColorShift, loop: { count: loopCount, frameTimeMs } },
    })
  }
  // —— offMagic:二次效果落敌,召唤神定格 last frame 在场 ——
  for (const f of offMagicFrames) {
    frames.push({ ...f, summon: { spriteKey, frame: lastFrame, pos, bgColorShift } })
  }
  // —— postMagic:敌受击抖动,召唤神**仍在场**(fight.c:4323 神在场 → 899 后淡出);裹 summon 留场,排 fadeOut 前 ——
  for (const f of postMagicFrames ?? []) {
    frames.push({ ...f, summon: { spriteKey, frame: lastFrame, pos, bgColorShift } })
  }
  // —— fadeOut:72 步 crossfade(召唤神→队员)。**首帧注入 resetFighters** 复位队员(sdlpal fight.c:901
  //   `PAL_BattleUpdateFighters()` 在 :911 `PAL_BattleFadeScene()` 之前调)→ crossfade 目标场景 = 复位后的
  //   正常主角(站立帧/iColorShift=0/原位),而非残留的施法帧+高亮+上移。applyAnimFrame 累积保持,后续帧不必重复。——
  for (let s = 0; s < SUMMON_FADE_STEPS; s++) {
    const frame: BattleAnimFrame = { durationMs: SUMMON_FADE_STEP_MS, summon: { spriteKey, frame: lastFrame, pos, bgColorShift, fadeStep: s, fadeDir: 'out' } }
    if (s === 0 && input.resetFighters && input.resetFighters.length > 0) frame.fighters = input.resetFighters
    frames.push(frame)
  }
  return frames
}

// ============================================================================
// D17 法术补全:player DefMagic(治疗/防御) + 敌方 EnemyMagic(攻击)
// ============================================================================

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
 *   - 末:iColorShift 辉光(fight.c:2573-2605)—— i=0..6 渐亮 + i=6..0 渐暗 = 14 帧,
 *     各 Delay(1)=40ms;applyToParty 设全队员 iColorShift,applyToPlayer 设 target。
 *
 * 总帧数 = 1(caster 切施法帧 6,Delay(1))+ n(magic sprite)+ 14(辉光)。
 * 帧间时长:magic 帧 (speed+5)*10(fight.c:2512-2513);caster 帧 + 辉光帧 = Delay(1)=40ms。
 */
export function buildPlayerDefMagicTimeline(input: BuildPlayerDefMagicInput): BattleAnimFrame[] {
  const { casterIdx, magic, n, targetPlayerIdx, targetPlayerPos, partyPlayerPositions } = input
  const { effect, type, speed, xOffset, yOffset } = magic
  const layerOffset = asShortLocal((magic as { special?: number }).special ?? 0) // DM9:sLayerOffset
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

  // —— iColorShift 辉光(fight.c:2573-2605):i=0..6 渐亮 + i=6..0 渐暗 = 14 帧 ——
  // DL31:C 为 `for(i=0;i<6;i++)` 0..5 升 + `for(i=6;i>=0;i--)` 6..0 降 = 13 帧,峰值 6 只一次
  //   (fight.c:2573-2605;UseItem 同构循环 0..6+5..0 本就 13,此处旧 14 帧系笔误)。
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
  /** 敌人施法起手位(= posOriginal)。 */
  enemyPos: { x: number; y: number }
  idleFrames: number
  magicFrames: number
  attackFrames: number
  actWaitFrames: number
  /** magic.fireDelay —— ==0 时额外用 attackFrames 当施法手势(fight.c:4709-4717)。 */
  fireDelay: number
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
  const { enemyCasterIdx, enemyPos, idleFrames, magicFrames, attackFrames, actWaitFrames, fireDelay } = input
  const frames: BattleAnimFrame[] = []
  let ex = enemyPos.x
  let ey = enemyPos.y

  // 前移 2 帧(fight.c:4683-4693)
  ex += 12
  ey += 6
  frames.push({ durationMs: delayMs(1), fighters: [{ side: 'enemy', idx: enemyCasterIdx, pos: { x: ex, y: ey } }] })
  ex += 4
  ey += 2
  frames.push({ durationMs: delayMs(1), fighters: [{ side: 'enemy', idx: enemyCasterIdx, pos: { x: ex, y: ey } }] })

  // magicFrames 施法手势(fight.c:4697-4702)
  for (let i = 0; i < magicFrames; i++) {
    frames.push({
      durationMs: delayMs(actWaitFrames),
      fighters: [{ side: 'enemy', idx: enemyCasterIdx, currentFrame: idleFrames + i }],
    })
  }
  // magicFrames==0 → 补 1 帧停顿(fight.c:4704-4707)
  if (magicFrames === 0)
    frames.push({ durationMs: delayMs(1) })

  // fireDelay==0 → attackFrames(+1)帧手势(fight.c:4709-4717)
  if (fireDelay === 0) {
    for (let i = 0; i <= attackFrames; i++) {
      frames.push({
        durationMs: delayMs(actWaitFrames),
        fighters: [{ side: 'enemy', idx: enemyCasterIdx, currentFrame: i - 1 + idleFrames + magicFrames }],
      })
    }
  }

  return frames
}

export function buildEnemySummonTimeline(input: {
  casterIdx: number
  casterPos: { x: number; y: number }
  caster: {
    idleFrames: number
    magicFrames: number
    attackFrames: number
    actWaitFrames: number
  }
  summonedIdxs: number[]
  activeEnemyIdxs: number[]
}): BattleAnimFrame[] {
  // 0x9E 召唤起手:仅 magicFrames 手势循环,施法者**原地不动**(script.c:2874-2879)——
  //   与敌人放普通魔法(fight.c:4683 前移 12,6/4,2 共 16px)不同,召唤者不位移、无 attackFrames。
  const frames: BattleAnimFrame[] = []
  for (let i = 0; i < input.caster.magicFrames; i++) {
    frames.push({
      durationMs: delayMs(input.caster.actWaitFrames),
      fighters: [{ side: 'enemy', idx: input.casterIdx, currentFrame: input.caster.idleFrames + i }],
    })
  }

  if (input.summonedIdxs.length > 0) {
    frames.push({
      durationMs: delayMs(1),
      fighters: input.summonedIdxs.map(idx => ({ side: 'enemy' as const, idx, iColorShift: 8 })),
      sound: 212,
    })
    frames.push({ durationMs: delayMs(2) })
  }

  frames.push({
    durationMs: delayMs(1),
    fighters: input.activeEnemyIdxs.map(idx => ({ side: 'enemy' as const, idx, iColorShift: 0 })),
  })
  return frames
}

export function buildEnemyTransformTimeline(enemyIdx: number): BattleAnimFrame[] {
  const frames: BattleAnimFrame[] = []
  for (let i = 0; i < 6; i++) {
    frames.push({
      durationMs: delayMs(1),
      fighters: [{ side: 'enemy', idx: enemyIdx, iColorShift: i }],
    })
  }
  frames.push({
    durationMs: delayMs(1),
    fighters: [{ side: 'enemy', idx: enemyIdx, iColorShift: 0 }],
    sound: 47,
  })
  return frames
}

/**
 * 0x9C 敌人分裂收尾散开动画(sdlpal script.c:009C 末段)。分裂后全部副本 pos 先**叠在原敌位置**(startPos),
 * 再 10 帧每帧 `pos = (pos + posOriginal)/2` 缓动散开到各自阵型位(targets),末帧 PAL_BattleUpdateFighters 归位。
 * 每帧 Delay(1)。startPos = 分裂前唯一活敌(原敌)posOriginal;targets = 分裂后全部活敌 {idx, posOriginal}。
 * 缺此动画 → 副本瞬间出现在阵型位(user 2026-06-08 报"分裂动画没做")。
 */
export function buildEnemyDivisionTimeline(input: {
  startPos: { x: number; y: number }
  targets: { idx: number; pos: { x: number; y: number } }[]
}): BattleAnimFrame[] {
  const frames: BattleAnimFrame[] = []
  // 各敌当前 pos —— 初始全叠在 startPos(sdlpal 把所有副本 pos 设成原敌 pos)。
  const cur = new Map(input.targets.map((t) => [t.idx, { x: input.startPos.x, y: input.startPos.y }]))
  for (let step = 0; step < 10; step++) {
    const fighters: FighterDelta[] = input.targets.map((t) => {
      const c = cur.get(t.idx)!
      c.x = Math.trunc((c.x + t.pos.x) / 2)
      c.y = Math.trunc((c.y + t.pos.y) / 2)
      return { side: 'enemy' as const, idx: t.idx, pos: { x: c.x, y: c.y } }
    })
    frames.push({ durationMs: delayMs(1), fighters })
  }
  // 末帧归位 posOriginal(PAL_BattleUpdateFighters)。
  frames.push({
    durationMs: delayMs(1),
    fighters: input.targets.map((t) => ({ side: 'enemy' as const, idx: t.idx, pos: { x: t.pos.x, y: t.pos.y } })),
  })
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
  const { enemyCasterIdx, magic, n, enemy, targetPlayerPos, iBlow, blowTargets, rng, baseScreenWave } = input
  const { effect, type, speed, fireDelay, effectTimes, shake, scriptShake, xOffset, yOffset, wave, keepEffect } = magic
  const layerOffset = asShortLocal((magic as { special?: number }).special ?? 0) // DM9:sLayerOffset
  const { idleFrames, magicFrames, attackFrames } = enemy
  // W4 iBlow:吹飞累加态(per target 运行 x/y),仅 iBlow!=0 + 有 targets + rng 时启用。镜像 OffMagic,吹**全体队员**。
  const blowOn = !!iBlow && iBlow !== 0 && !!blowTargets && blowTargets.length > 0 && !!rng
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
        if (isLast) { t.x = t.pos.x; t.y = t.pos.y } // 末帧复位 posOriginal
        else { t.x += blow; t.y += Math.trunc(blow / 2) }
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
    if (i === l - 1 && keepEffect === 0xffff && (baseScreenWave ?? 0) + (wave ?? 0) < 9) frame.keepEffect = true // W4 烙背景(fight.c:2983)
    frames.push(frame)
  }

  return frames
}

/**
 * 队员被敌方法术命中的**受击动画**(port fight.c:4861-4899,PAL_BattleEnemyPerformAction 魔法分支)。
 * sdlpal 在 ShowEnemyMagicAnim + 伤害结算 + DisplayStatChange **之后**对**受伤队员**跑 5 帧:
 *   for i=0..4:wCurrentFrame=4(受击姿);i>0 → pos += (8>>i, 4>>i)(递减击退 4,2/2,1/1,0/0,0);
 *   iColorShift=(i<3 ? 6 : 0)(前 3 帧红闪);各 PAL_BattleDelay(1)。
 * 之后 resetFightersAfterAction 复位 pos/frame。**之前 ts 完全没播 → user 实测"我方受击动画还是没有"**。
 *
 * @param affected 受伤队员 + 其复位底锚(posOriginal)。AoE 时多个;单体一个。
 */
export function buildPlayerMagicHitReaction(
  affected: ReadonlyArray<{ idx: number; pos: { x: number; y: number } }>,
): BattleAnimFrame[] {
  if (affected.length === 0) return []
  const cur = affected.map((a) => ({ idx: a.idx, x: a.pos.x, y: a.pos.y }))
  const frames: BattleAnimFrame[] = []
  for (let i = 0; i < 5; i++) {
    const fighters: FighterDelta[] = cur.map((c) => {
      if (i > 0) {
        c.x += 8 >> i
        c.y += 4 >> i
      }
      return {
        side: 'player' as const,
        idx: c.idx,
        currentFrame: 4,
        iColorShift: i < 3 ? 6 : 0,
        pos: { x: c.x, y: c.y },
      }
    })
    frames.push({ durationMs: delayMs(1), fighters })
  }
  return frames
}

/** SHORT cast(xOffset/yOffset 是 WORD 但 sdlpal 用 (SHORT) 强转,fight.c:2749)。 */
function asShortLocal(n: number): number {
  return (n << 16) >> 16
}
