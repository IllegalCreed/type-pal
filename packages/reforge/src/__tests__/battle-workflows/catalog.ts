/**
 * TEST-BATTLE-WORKFLOWS-1 薄 fixture：合法战斗目录（catalog）。
 * 全部数据经**生产 guard**（validateSkills/validateActors/validateBattleSprites/
 * validateItems/validateEnemies）核验（见 assertWfCatalogFixtureLegal）；帧资源为
 * 真实 RleFrame（宽高/像素/不透明位图），不再以空对象帧+强转冒充。
 * 战斗用品 effects 取 battle 上下文支持域（healHp），经 itemUseSupportsContext 核验。
 */
import type {
  ActorDef,
  BattleSpriteDef,
  EnemyBattleSpriteProfile,
  EnemyDef,
  ItemData,
  SkillData,
} from '@type-pal/content'
import {
  itemUseSupportsContext,
  validateActors,
  validateBattleSprites,
  validateEnemies,
  validateItems,
  validateSkills,
} from '@type-pal/content'
import type { RleFrame } from '@type-pal/shared'
import type { CreatePlayerInput } from '../../battle/battle-core.js'

/** player-fighter 帧表（castEffectBase/attackEffectBase 非负，过 validateBattleSprites）。 */
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
  castEffectBase: 0,
  attackEffectBase: 0,
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

/** 完整 EnemyDef（与现行类型一致；validateEnemies 核验）。 */
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

/** 完整 CreatePlayerInput。 */
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

/** 合法攻击法术（完整 SkillData：cost/target:'oneEnemy'/effects/animation）。 */
export function wfSkill(id = 'wf-strike', mp = 20): SkillData {
  return {
    id,
    name: `name.${id}`,
    desc: '',
    cost: { mp },
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [{ kind: 'damage', power: 20, elemental: 0 }],
    animation: { effectSprite: 0 },
  }
}

/** 带一生限用的合法法术（skillUse 写回正控）。 */
export function wfLifetimeSkill(id = 'wf-once', mp = 5): SkillData {
  return { ...wfSkill(id, mp), lifetimeLimit: 1 }
}

/** 战斗可用品（healHp 属 battle 上下文域；validateItems + itemUseSupportsContext 核验）。 */
export function wfHealItem(id = 'wf-tonic', amount = 30): ItemData {
  return {
    id,
    name: `name.${id}`,
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    use: {
      target: 'oneAlly',
      consuming: true,
      effects: [{ kind: 'healHp', amount }],
    },
  }
}

/** 可投掷战斗品（throw 经 validateItems 内 checkThrowSpec 核验；W1 投掷选择流）。 */
export function wfThrowItem(id = 'wf-dart'): ItemData {
  return {
    id,
    name: `name.${id}`,
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    use: {
      target: 'oneAlly',
      consuming: true,
      effects: [{ kind: 'healHp', amount: 5 }],
    },
    throw: {
      target: 'oneEnemy',
      effects: [{ kind: 'currentHpDamage', numerator: 1, denominator: 2, bonus: 20, cap: 500 }],
      sound: 'sound.item-throw',
    },
  }
}

/** 完整 ActorDef（spriteId 等现行必填字段；validateActors 核验）。 */
export function wfActorDef(
  id: string,
  o: { initialMagic?: string[]; coopSkill?: string } = {},
): ActorDef {
  return {
    id,
    name: `name.${id}`,
    spriteId: `sprite.${id}`,
    battler: {
      baseStats: {
        level: 1,
        hp: 100,
        maxHP: 100,
        mp: 40,
        maxMP: 40,
        attack: 40,
        defense: 30,
        magicAttack: 20,
        speed: 50,
        luck: 20,
      },
      battleSprite: `battle-sprite.${id}`,
      initialEquipment: {},
      initialMagic: o.initialMagic ?? [],
      ...(o.coopSkill ? { cooperativeMagicSkillId: o.coopSkill } : {}),
    },
  }
}

/** 完整 BattleSpriteDef（validateBattleSprites 核验；castEffectBase 非负）。 */
export function wfBattleSpriteDef(
  id: string,
  profile: BattleSpriteDef['profile'],
): BattleSpriteDef {
  return { id, label: id, asset: `asset.${id}`, profile }
}

/** 真实 RleFrame（1×1 全不透明单像素；宽高/像素/不透明数组长度一致）。 */
export function realFrame(): RleFrame {
  return {
    width: 1,
    height: 1,
    pixels: new Uint8Array([1]),
    opaque: new Uint8Array([1]),
  }
}

/** 生产 guard 合法门：本 fixture 全部工厂产物经现行校验器核验（R1）。
 * 任何字段漂移导致 guard 拒绝时，此函数 throw——测试的合法性断言先于业务断言。 */
export function assertWfCatalogPassesProductionGuards(): void {
  const skill = wfSkill('wf-gate-skill', 20)
  const skills = validateSkills({ skills: [skill], levelUp: {} })
  if (skills.skills[0]?.id !== 'wf-gate-skill') throw new Error('wfSkill 未过 validateSkills')

  const enemy = wfEnemy('wf-gate-enemy')
  validateEnemies([enemy])

  const item = wfHealItem('wf-gate-item', 30)
  validateItems([item])
  if (!item.use || !itemUseSupportsContext(item.use, 'battle'))
    throw new Error('wfHealItem 不支持 battle 上下文')

  validateItems([wfThrowItem('wf-gate-dart')]) // throw 过 checkThrowSpec

  const actor = wfActorDef('wf-gate-actor')
  validateActors([actor])

  validateBattleSprites([
    wfBattleSpriteDef('wf-gate-player', PLAYER_PROFILE),
    wfBattleSpriteDef('wf-gate-enemy', enemyProfile('wf-gate-enemy')),
  ])

  const lifetime = wfLifetimeSkill('wf-gate-once', 5)
  validateSkills({ skills: [lifetime], levelUp: {} })

  const frame = realFrame()
  if (
    frame.pixels.length !== frame.width * frame.height ||
    frame.opaque.length !== frame.width * frame.height
  )
    throw new Error('realFrame 像素/不透明数组与宽高不一致')
}
