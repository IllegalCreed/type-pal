/**
 * TEST-BATTLE-WORKFLOWS-1 薄 fixture：合法战斗目录（catalog）。
 * 与既有 battle-session.test.ts 的 mkEnemy/player 同型——字段按现行 EnemyDef/
 * CreatePlayerInput/SkillData 类型完整给出；资产替身只代渲染资源（LoadedBattleSpriteDefinition
 * 帧数组），不 mock BattleSession/battle-core/battle-anim 本体。
 */
import type { EnemyDef, SkillData } from '@type-pal/content'
import type { CreatePlayerInput } from '../../battle-core.js'
import type { EnemyBattleSpriteProfile } from '@type-pal/content'

/** player-fighter 帧表（与现行 BattleSession.requireAppearance 合同一致）。 */
export const PLAYER_PROFILE = {
  kind: 'player-fighter',
  frames: {
    idle: 0,
    dying: 1,
    dead: 2,
    defend: 3,
    hurt: 4,
    preMagic: 5,
    magic: 6,
    attackWindup: 7,
    attackRush: 8,
    attackStrike: 9,
    steal: 10,
  },
  castEffectBase: -1,
  attackEffectBase: -1,
} as const

export function enemyProfile(definitionId: string): EnemyBattleSpriteProfile {
  const magicCount = definitionId.endsWith('.magic') ? 1 : 0
  return {
    kind: 'enemy',
    idle: { start: 0, count: 2 },
    magic: { start: 2, count: magicCount },
    attack: { start: 2 + magicCount, count: 2 },
    idleTicksPerFrame: 5,
    actTicksPerFrame: 1,
  }
}

/** 完整 EnemyDef（与旧 mkEnemy 同合同；fleeRate 0 = 不可逃正控可另行覆盖）。 */
export function wfEnemy(
  id: string,
  o: Partial<EnemyDef['stats']> = {},
  extra: Partial<EnemyDef> = {},
): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    battleSprite: `battle-sprite.${id}`,
    yPosOffset: 0,
    stats: {
      health: 30,
      level: 1,
      exp: 5,
      cash: 3,
      attackStrength: 20,
      magicStrength: 0,
      defense: 10,
      dexterity: 10,
      fleeRate: 0,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
      ...o,
    },
    ai: { resistanceToSorcery: 5 },
    sounds: {
      attack: 'sound.pal.355',
      action: 'sound.pal.300',
      death: 'sound.pal.030',
      call: 'sound.pal.002',
    },
    ...extra,
  }
}

/** 完整 CreatePlayerInput（可携带技能/HP/MP 覆写）。 */
export function wfPlayer(roleId: string, o: Partial<CreatePlayerInput> = {}): CreatePlayerInput {
  return {
    roleId,
    actorTemplateId: roleId,
    hp: 100,
    maxHp: 100,
    mp: 30,
    maxMp: 30,
    attackStrength: 40,
    defense: 30,
    magicStrength: 20,
    baseDexterity: 50,
    skills: [],
    fleeRate: 20,
    ...o,
  }
}

/** 合法攻击型技能（mp 成本 5；单目标）。 */
export function attackSkill(id = 'wf-strike', mp = 5): SkillData {
  return {
    id,
    name: `name.${id}`,
    mpCost: mp,
    target: 'enemy',
    power: 20,
    level: 1,
    kind: 'attack',
  } as unknown as SkillData
}

/** fixture 合法门：构造的敌人/玩家/技能满足结构性最低要求（id 非空、stats 完整）。 */
export function assertWfCatalogFixtureLegal(catalog: {
  enemies: EnemyDef[]
  players: CreatePlayerInput[]
}): void {
  for (const enemy of catalog.enemies) {
    if (!enemy.id || !enemy.battleSprite || !enemy.stats || enemy.stats.health <= 0)
      throw new Error(`wf fixture enemy 非法: ${enemy.id}`)
    if (typeof enemy.stats.attackStrength !== 'number')
      throw new Error(`wf fixture enemy stats 不完整: ${enemy.id}`)
  }
  for (const player of catalog.players) {
    if (!player.roleId || player.hp <= 0 || player.maxHp < player.hp)
      throw new Error(`wf fixture player 非法: ${player.roleId}`)
  }
}
