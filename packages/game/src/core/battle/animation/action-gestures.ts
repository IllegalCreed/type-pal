/** Flee, steal and item gestures; scripts and inventory remain owned by the action caller. */
import { localize } from '../../../localization/language.js'
import type { BattleAnimFrame, FighterDelta } from '../battle-state.js'
import { delayMs } from './frames.js'

/**
 * 逃跑失败动画(sdlpal fight.c:4155-4168,kBattleActionFlee 失败分支):
 *   frame 0;3 步每步 pos +=(4,2) Delay(1);最后 frame 1(濒死姿)Delay(8)。
 *   末帧同步显示 BATTLE_LABEL_ESCAPEFAIL(WORD 31 "逃跑失败")。
 * startPos = 失败队员 posOriginal(站立锚)。
 */
export function buildFleeFailTimeline(
  playerIdx: number,
  startPos: { x: number; y: number },
): BattleAnimFrame[] {
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
    battleMessage: { text: localize('逃跑失败', 'Escape failed'), durationMs: delayMs(8) },
  })
  return frames
}

/**
 * 偷窃动画(sdlpal fight.c:5218-5246,PAL_BattleStealFromEnemy 动画段):
 *   玩家 frame 10(偷窃姿);offset=(target-player)*8;冲到敌前 (enemy.x+64-offset, enemy.y+22+offset) Delay(1);
 *   5 步逼近:每步 x-=(i+8) y-=4,第 5 步(i==4)敌 iColorShift=6 闪白,各 Delay(1);
 *   收尾:敌 iColorShift=0,x--,Delay(3)。enemyPos = 目标敌 posOriginal(底锚)。
 */
export function buildStealTimeline(
  playerIdx: number,
  targetEnemyIdx: number,
  enemyPos: { x: number; y: number },
): BattleAnimFrame[] {
  const offset = (targetEnemyIdx - playerIdx) * 8
  let x = enemyPos.x + 64 - offset
  let y = enemyPos.y + 22 + offset
  const frames: BattleAnimFrame[] = [
    {
      durationMs: delayMs(1),
      fighters: [{ side: 'player', idx: playerIdx, currentFrame: 10, pos: { x, y } }],
    },
  ]
  for (let i = 0; i < 5; i++) {
    x -= i + 8
    y -= 4
    const fighters: FighterDelta[] = [
      { side: 'player', idx: playerIdx, currentFrame: 10, pos: { x, y } },
    ]
    if (i === 4) fighters.push({ side: 'enemy', idx: targetEnemyIdx, iColorShift: 6 }) // 敌闪白
    frames.push({ durationMs: delayMs(1), fighters })
  }
  x -= 1
  frames.push({
    durationMs: delayMs(3),
    fighters: [
      { side: 'player', idx: playerIdx, pos: { x, y } },
      { side: 'enemy', idx: targetEnemyIdx, iColorShift: 0 },
    ],
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
export function buildThrowWindupTimeline(
  playerIdx: number,
  startPos: { x: number; y: number },
  magicSound: number,
  itemName?: string,
): BattleAnimFrame[] {
  const frames: BattleAnimFrame[] = []
  let x = startPos.x
  let y = startPos.y
  // —— 4 步前移(fight.c:4339-4346,PAL_BattleDelay(1,0) 不显名)——
  for (let i = 0; i < 4; i++) {
    x -= 4 - i
    y -= Math.trunc((4 - i) / 2)
    frames.push({
      durationMs: delayMs(1),
      fighters: [{ side: 'player', idx: playerIdx, pos: { x, y } }],
    })
  }
  // —— Delay(2) hold(fight.c:4348 PAL_BattleDelay(2,wObject) 起在 (210,50) 显示所投物品名,
  //    L15:贯穿挥臂 hold(2)+frame5(8)+frame6(2)=12 帧)——
  frames.push({
    durationMs: delayMs(2),
    ...(itemName
      ? { battleMessage: { text: itemName, durationMs: delayMs(12), pos: { x: 210, y: 50 } } }
      : {}),
  })
  // —— frame5(投掷姿)+ magicSound,Delay(8)(fight.c:4350-4353)——
  frames.push({
    durationMs: delayMs(8),
    fighters: [{ side: 'player', idx: playerIdx, currentFrame: 5 }],
    ...(magicSound > 0 ? { sound: magicSound } : {}),
  })
  // —— frame6,Delay(2)(fight.c:4355-4356)——
  frames.push({
    durationMs: delayMs(2),
    fighters: [{ side: 'player', idx: playerIdx, currentFrame: 6 }],
  })
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
      ...(i === 0 && itemName
        ? { battleMessage: { text: itemName, durationMs: delayMs(13), pos: { x: 210, y: 50 } } }
        : {}),
    })
  }

  for (let i = 5; i >= 0; i--) {
    frames.push({
      durationMs: delayMs(1),
      fighters: targetDeltas(i),
    })
  }

  return frames
}
