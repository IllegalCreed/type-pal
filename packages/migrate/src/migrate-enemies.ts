/**
 * M4a/M4c · 敌人数据迁移:enemies.json(154 stats) + enemy-objects.json(153 AI 指针) → EnemyDef[]。
 * 纯函数,golden 钉真值。AI/演出/战后 = translate-enemy-scripts 翻译(M4c-2)。
 */
import type { EnemyDef, EnemyTeamDef } from '@type-pal/content'
import { translateEnemyScripts } from './translate-enemy-scripts.js'
import { emptyTranslateReport, type TranslateCtx } from './translate-events.js'

export interface SourceEnemy {
  id: number
  idleFrames: number
  magicFrames: number
  attackFrames: number
  idleAnimSpeed: number
  actWaitFrames: number
  yPosOffset: number
  attackSound: number
  actionSound: number
  magicSound: number
  deathSound: number
  callSound: number
  health: number
  exp: number
  cash: number
  level: number
  magic: number
  magicRate: number
  attackEquivItem: number
  attackEquivItemRate: number
  stealItem: number
  stealItemCount: number
  attackStrength: number
  magicStrength: number
  defense: number
  dexterity: number
  fleeRate: number
  poisonResistance: number
  elemResistance: { wind: number; thunder: number; water: number; fire: number; earth: number }
  physicalResistance: number
  dualMove: number
  collectValue: number
  _name?: string
}

export interface SourceEnemyObject {
  objectIndex: number
  enemyId: number
  resistanceToSorcery: number
  scriptOnTurnStart: number
  scriptOnBattleEnd: number
  scriptOnReady: number
  _name?: string
}

export interface EnemyMigrationResult {
  enemies: EnemyDef[]
  /** name.<enemyId> → 显示名 + 战斗脚本对白(并入工程 locale)。 */
  localeNames: Record<string, string>
  report: {
    total: number
    /** 有 AI 脚本(≥1 指针)的敌人数 → M4c 翻译目标。 */
    withScript: number
    /** 引用了越界 enemyId 的对象(数据异常)。 */
    danglingEnemyId: string[]
    /** M4c-2:脚本翻译翻不净明细(敌 id → 原因;编辑器手修清单)。 */
    pendingScripts: { id: string; name: string; notes: string[] }[]
  }
}

/** 敌人稳定 id(enemy-<objectIndex>;objectIndex 全局唯一,当不透明串)。 */
export function enemySlug(objectIndex: number): string {
  return `enemy-${objectIndex}`
}

export function mapEnemies(
  enemies: readonly SourceEnemy[],
  enemyObjects: readonly SourceEnemyObject[],
  /** M4c-2:战斗脚本翻译上下文(all.json labelAt;缺省 = 只翻 fallback)。 */
  tctx?: TranslateCtx,
): EnemyMigrationResult {
  const byId = new Map(enemies.map((e) => [e.id, e]))
  const localeNames: Record<string, string> = {}
  const danglingEnemyId: string[] = []
  const pendingScripts: EnemyMigrationResult['report']['pendingScripts'] = []
  let withScript = 0

  const out: EnemyDef[] = []
  for (const eo of enemyObjects) {
    const stats = byId.get(eo.enemyId)
    if (!stats) {
      danglingEnemyId.push(enemySlug(eo.objectIndex))
      continue
    }
    const id = enemySlug(eo.objectIndex)
    const name = eo._name ?? stats._name ?? `敌人 ${eo.objectIndex}`
    localeNames[`name.${id}`] = name
    if (eo.scriptOnReady || eo.scriptOnTurnStart || eo.scriptOnBattleEnd) withScript++

    out.push({
      id,
      name: `name.${id}`,
      spriteNum: eo.enemyId, // 战斗精灵 = enemyId(→ battle-sprite/enemy/N.rle)
      stats: {
        health: stats.health,
        level: stats.level,
        exp: stats.exp,
        cash: stats.cash,
        attackStrength: stats.attackStrength,
        magicStrength: stats.magicStrength,
        defense: stats.defense,
        dexterity: stats.dexterity,
        fleeRate: stats.fleeRate,
        physicalResistance: stats.physicalResistance,
        poisonResistance: stats.poisonResistance,
        elemResistance: { ...stats.elemResistance },
        dualMove: stats.dualMove !== 0,
        collectValue: stats.collectValue,
      },
      // M4c:AI 全走翻译器 —— fallback(magic+magicRate)并入 0x67 时间线生成区间规则,
      // 钩子链(advance 游标状态机)翻成 [turn/chance] transform/divide/summon/cast 规则
      // + 演出 choreography + 战后 onDefeated(考证:translate-enemy-scripts.ts 头注)。
      ...(() => {
        const t = tctx
          ? translateEnemyScripts(
              tctx,
              {
                turnStart: eo.scriptOnTurnStart || undefined,
                ready: eo.scriptOnReady || undefined,
                battleEnd: eo.scriptOnBattleEnd || undefined,
              },
              { magic: stats.magic, rate: stats.magicRate },
            )
          : translateEnemyScripts(
              { labelAt: new Map(), locale: localeNames, report: emptyTranslateReport() },
              {},
              { magic: stats.magic, rate: stats.magicRate },
            )
        if (t.pending.length) pendingScripts.push({ id, name, notes: t.pending })
        return {
          ai: {
            resistanceToSorcery: eo.resistanceToSorcery,
            ...(t.rules.length ? { rules: t.rules } : {}),
          },
          ...(t.choreography.length ? { choreography: t.choreography } : {}),
          ...(t.onDefeated?.length ? { onDefeated: t.onDefeated } : {}),
        }
      })(),
      anim: {
        idleFrames: stats.idleFrames,
        magicFrames: stats.magicFrames,
        attackFrames: stats.attackFrames,
        idleAnimSpeed: stats.idleAnimSpeed,
        actWaitFrames: stats.actWaitFrames,
        yPosOffset: stats.yPosOffset,
      },
      sounds: {
        attack: stats.attackSound,
        action: stats.actionSound,
        magic: stats.magicSound,
        death: stats.deathSound,
        call: stats.callSound,
      },
      ...(stats.stealItem
        ? { steal: { itemId: String(stats.stealItem), count: Math.max(1, stats.stealItemCount) } }
        : {}),
      ...(stats.attackEquivItem
        ? {
            attackEquivItem: {
              itemId: String(stats.attackEquivItem),
              rate: stats.attackEquivItemRate,
            },
          }
        : {}),
    })
  }

  return {
    enemies: out,
    localeNames,
    report: { total: out.length, withScript, danglingEnemyId, pendingScripts },
  }
}

// ════════════════════════════════════════════════════════════════════
// M4b · 敌队表(enemy-teams.json → EnemyTeamDef;startBattle 的 team 号查此)
// ════════════════════════════════════════════════════════════════════

export interface SourceEnemyTeam {
  id: number
  /** 5 槽 enemyObjectIndexes;65535 = 空位。 */
  enemyObjectIndexes: number[]
  _names?: string[]
}

/** 敌队稳定 id(team-<原版队号>;startBattle{team:n} → `team-${n}` 查表)。 */
export function teamSlug(id: number): string {
  return `team-${id}`
}

const EMPTY_SLOT = 65535

export function mapEnemyTeams(
  teams: readonly SourceEnemyTeam[],
  knownEnemyIds: ReadonlySet<string>,
): { teams: EnemyTeamDef[]; report: { total: number; danglingMember: string[] } } {
  const danglingMember: string[] = []
  const out: EnemyTeamDef[] = []
  for (const t of teams) {
    const members: string[] = []
    for (const oi of t.enemyObjectIndexes) {
      if (oi === EMPTY_SLOT) continue
      const id = enemySlug(oi)
      if (!knownEnemyIds.has(id)) {
        danglingMember.push(`${teamSlug(t.id)}:${id}`)
        continue
      }
      members.push(id)
    }
    out.push({ id: teamSlug(t.id), members })
  }
  return { teams: out, report: { total: out.length, danglingMember } }
}
