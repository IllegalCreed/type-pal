/** Contributor formation, spell sequence and return to standing positions. */
import type { BattleAnimFrame, FighterDelta } from '../battle-state.js'
import { delayMs } from './frames.js'
import { buildPostMagicTimeline } from './hit-reaction.js'
import type { BuildOffMagicInput } from './magic-effects.js'
import { buildPlayerOffMagicTimeline } from './magic-effects.js'

/** 协力合击聚拢队形(sdlpal fight.c:3602 `rgwCoopPos[3][2]`):发起者→[0],其余贡献者按队序→[1][2]。 */
const COOP_POS: ReadonlyArray<readonly [number, number]> = [
  [208, 157],
  [234, 170],
  [260, 183],
]

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
  const {
    casterIdx,
    partySize,
    contributorIdxs,
    originalPositions,
    magic,
    n,
    targetIdx,
    targetEnemyPos,
    iBlow,
    hurtEnemies,
    damageNums,
    baseScreenWave,
  } = input
  const isContrib = (j: number): boolean => contributorIdxs.includes(j)
  const frames: BattleAnimFrame[] = []
  const lerp = (orig: number, coop: number, num: number): number =>
    Math.trunc((orig * (6 - num) + coop * num) / 6)

  // —— Phase1 聚拢(i=1..6,fight.c:3877-3925)——
  for (let i = 1; i <= 6; i++) {
    const fighters: FighterDelta[] = []
    const oc = originalPositions[casterIdx]
    if (oc)
      fighters.push({
        side: 'player',
        idx: casterIdx,
        pos: { x: lerp(oc.x, COOP_POS[0]![0], i), y: lerp(oc.y, COOP_POS[0]![1], i) },
      })
    let t = 0
    for (let j = 0; j < partySize; j++) {
      if (j === casterIdx) continue
      t++ // fight.c:3905:贡献者判定**之前**自增(非贡献者也占 t 槽)
      if (!isContrib(j)) continue
      const oj = originalPositions[j]
      const cp = COOP_POS[t]
      if (!oj || !cp) continue
      fighters.push({
        side: 'player',
        idx: j,
        pos: { x: lerp(oj.x, cp[0], i), y: lerp(oj.y, cp[1], i) },
      })
    }
    frames.push({ durationMs: delayMs(1), fighters })
  }

  // —— Phase2 非发起贡献者逐个 frame5(slot 倒序,fight.c:3927-3941)——
  for (let i = partySize - 1; i >= 0; i--) {
    if (i === casterIdx || !isContrib(i)) continue
    frames.push({ durationMs: delayMs(3), fighters: [{ side: 'player', idx: i, currentFrame: 5 }] })
  }

  // —— Phase3 发起者闪白(fight.c:3943-3945)——
  frames.push({
    durationMs: delayMs(5),
    fighters: [{ side: 'player', idx: casterIdx, iColorShift: 6, currentFrame: 5 }],
  })
  // —— Phase4 发起者出招(fight.c:3947-3949)——
  frames.push({
    durationMs: delayMs(3),
    fighters: [{ side: 'player', idx: casterIdx, currentFrame: 6, iColorShift: 0 }],
  })

  // —— Phase5 OffMagic(fight.c:3951,casterIdx=-1)——
  frames.push(
    ...buildPlayerOffMagicTimeline({
      casterIdx: -1,
      magic,
      n,
      targetIdx,
      targetEnemyPos,
      iBlow,
      baseScreenWave,
    }),
  )

  // —— Phase6 PostMagic(fight.c:4046)。数字在 PostMagic 第一帧显示,不是滑回结束后。——
  const postFrames = buildPostMagicTimeline({ hurtEnemies })
  if (damageNums && damageNums.length > 0 && postFrames[0])
    postFrames[0].damageNums = [...(postFrames[0].damageNums ?? []), ...damageNums]
  frames.push(...postFrames)

  // —— Phase7 滑回(i=1..6,fight.c:4056-4106)——
  for (let i = 1; i <= 6; i++) {
    const fighters: FighterDelta[] = []
    const oc = originalPositions[casterIdx]
    // 回位使用反向权重：(posOriginal*i + coopPos*(6-i))/6；保留下面与聚拢不同的队员计数。
    if (oc)
      fighters.push({
        side: 'player',
        idx: casterIdx,
        currentFrame: 0,
        pos: {
          x: Math.trunc((oc.x * i + COOP_POS[0]![0] * (6 - i)) / 6),
          y: Math.trunc((oc.y * i + COOP_POS[0]![1] * (6 - i)) / 6),
        },
      })
    let t = 0
    for (let j = 0; j < partySize; j++) {
      if (!isContrib(j)) continue
      if (j === casterIdx) continue // frame0 已由发起者块设;此处仅其余贡献者
      t++ // fight.c:4091:贡献者判定 + 发起者跳过**之后**自增(与 Phase1 不同)
      const oj = originalPositions[j]
      const cp = COOP_POS[t]
      if (!oj || !cp) continue
      fighters.push({
        side: 'player',
        idx: j,
        currentFrame: 0,
        pos: {
          x: Math.trunc((oj.x * i + cp[0] * (6 - i)) / 6),
          y: Math.trunc((oj.y * i + cp[1] * (6 - i)) / 6),
        },
      })
    }
    frames.push({ durationMs: delayMs(1), fighters })
  }

  return frames
}
