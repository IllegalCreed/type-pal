/**
 * Core/session 共用的最近行动证据。
 *
 * `side + kind` 是真正的双判别联合：目标字段只出现在与其阵营/行动相容的变体中，
 * enemy attackMate 必须携带敌槽目标和完整公式伤害（可大于目标余血）。
 */

/** 表现层可在任一行动上追加的共同证据。 */
export type BattleFailureFeedback = 'statusIneffective'

export interface BattleLastActionBase {
  idx: number
  fizzled?: boolean
  crit?: boolean
  secondDamage?: number
  attackAllHits?: { idx: number; value: number }[]
  throwHits?: { idx: number; value: number }[]
  blocked?: boolean
  coverIdx?: number
  autoDefend?: number[]
  coopContributors?: number[]
  notice?: string
  /** 结算已失败、但文案/时序由 session 按战斗 UI 真值呈现。 */
  failureFeedback?: BattleFailureFeedback
  fleeSuccess?: boolean
  spawnedIdxs?: number[]
}

type PlayerActionBase = BattleLastActionBase & { side: 'player' }
type EnemyActionBase = BattleLastActionBase & { side: 'enemy' }
type EnemyPlayerHit = EnemyActionBase & {
  /** 本次结算后跨入濒死并满足 CLASSIC 伤亡声条件的队伍槽位。 */
  enteredDyingPlayerIdxs?: number[]
}

/** Named discriminated union；core 与 session 不得各自复制匿名结构。 */
export type BattleLastAction =
  // Player actions
  | (PlayerActionBase & { kind: 'pass' })
  | (PlayerActionBase & {
      kind: 'attack'
      targetEnemyIdx: number
      /** 单体首击的完整计算伤害，可超过目标剩余生命。 */
      firstDamage?: number
    })
  | (PlayerActionBase & { kind: 'attackMate'; targetAllyIdx: number; damage: number })
  | (PlayerActionBase & {
      kind: 'cast'
      skillId: string
      targetEnemyIdx?: number
      targetAllyIdx?: number
    })
  | (PlayerActionBase & { kind: 'item'; itemId: string; targetAllyIdx?: number })
  | (PlayerActionBase & { kind: 'throw'; itemId: string; targetEnemyIdx?: number })
  | (PlayerActionBase & { kind: 'coop'; skillId: string; targetEnemyIdx?: number })
  | (PlayerActionBase & { kind: 'defend' })
  | (PlayerActionBase & { kind: 'flee' })
  // Enemy actions
  | (EnemyActionBase & { kind: 'pass' })
  | (EnemyPlayerHit & {
      kind: 'attack'
      targetPlayerIdx: number
      /** 命中时的物理扣血，附带道具在其后结算；格挡时省略。 */
      damage?: number
    })
  | (EnemyActionBase & { kind: 'attackMate'; targetEnemyIdx: number; damage: number })
  | (EnemyPlayerHit & {
      kind: 'cast'
      skillId: string
      targetPlayerIdx: number
      /** 法术正基础伤害结算致死的队伍槽位。 */
      magicDeathPlayerIdxs?: number[]
    })
  | (EnemyActionBase & { kind: 'transform' })
  | (EnemyActionBase & { kind: 'divide' })
  | (EnemyActionBase & { kind: 'summon' })
  | (EnemyActionBase & { kind: 'fleeAll' })

export type BattleLastActionKind = BattleLastAction['kind']
