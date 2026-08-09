/**
 * Core/session 共用的最近行动证据。
 *
 * `side + kind` 是真正的双判别联合：目标字段只出现在与其阵营/行动相容的变体中，
 * 结算字段也不再以 optional 形式把 malformed action 放进生产表现层。尤其是
 * enemy attackMate 必须携带敌槽目标和完整公式伤害（可大于目标余血）。
 */

/** 表现层可在任一行动上追加的共同证据。 */
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
  fleeSuccess?: boolean
  spawnedIdxs?: number[]
}

type PlayerActionBase = BattleLastActionBase & { side: 'player' }
type EnemyActionBase = BattleLastActionBase & { side: 'enemy' }

/** Named discriminated union；core 与 session 不得各自复制匿名结构。 */
export type BattleLastAction =
  // Player actions
  | (PlayerActionBase & { kind: 'pass' })
  | (PlayerActionBase & { kind: 'attack'; targetEnemyIdx: number })
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
  | (EnemyActionBase & { kind: 'attack'; targetPlayerIdx: number })
  | (EnemyActionBase & { kind: 'attackMate'; targetEnemyIdx: number; damage: number })
  | (EnemyActionBase & { kind: 'cast'; skillId: string; targetPlayerIdx: number })
  | (EnemyActionBase & { kind: 'transform' })
  | (EnemyActionBase & { kind: 'divide' })
  | (EnemyActionBase & { kind: 'summon' })
  | (EnemyActionBase & { kind: 'fleeAll' })

export type BattleLastActionKind = BattleLastAction['kind']
