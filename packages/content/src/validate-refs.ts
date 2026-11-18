/**
 * 工程结构通过字段校验后，在此按实际登记的稳定 ID 核对跨表引用。
 * 编辑器保存读取首个 error，诊断面板展示完整列表，故遍历顺序也是输出约定。
 * 物理文件可读性与加载生命周期由各自的资产和装配层负责。
 */

import { isActorEntity } from './actor.js'
import { ACTOR_STATUS_DEFINITIONS, isCarryableStatusId } from './actor-condition.js'
import { ACTOR_REFERENCE_POLICIES, collectActorTaggedReferences } from './actor-reference.js'
import { dialogueCuesAtNode } from './author-dialogue.js'
import { collectWorldActorReferences, collectWorldBattleDataReferences } from './character.js'
import { visitCommandTargetReferences } from './command-target-reference.js'
import type {
  ActorDef,
  AiAction,
  AiCond,
  AmbienceDef,
  AuthorCondition,
  AuthorItemCore,
  AuthorItemData,
  AuthorSceneDef,
  AuthorScriptLibrary,
  BattleChoreographyAction,
  BattleFieldDef,
  BattleSpriteDef,
  CurrentManifest,
  EnemyDef,
  EnemyHookCommand,
  EnemyHookTransition,
  EnemyOnDefeatedCommand,
  EnemyTeamDef,
  EntryPoint,
  ItemData,
  LevelUpSkill,
  Locale,
  MapIndexV1,
  MigrationDiagnosticsV1,
  PoisonDef,
  RuntimeScriptLibrary,
  SceneDef,
  ScriptChunkV1,
  ScriptIndexV1,
  ShopDef,
  SkillData,
  SpriteDef,
  StampTemplate,
  TilesetDef,
  WorldState,
} from './index.js'
import { acquisitionItemReferencesAtNode } from './item-acquisition.js'
import { collectPoisonDefinitionReferences } from './poison.js'
import {
  collectSkillPoisonReferences,
  isEnemyRuntimeSkillEffect,
  resolveSkillExecution,
} from './skill.js'
import {
  collectBattleSpriteDefinitionReferences,
  collectSpriteActionReferences,
  collectSpriteDefinitionReferences,
  validateEquipBattleSpriteReferences,
} from './sprite-references.js'

/** 一条校验问题。severity: error=会让游戏崩/逻辑错;warn=有降级(如显 id)但不崩。 */
export interface Issue {
  severity: 'error' | 'warn'
  /** 定位:具体数据路径,如 `scenes[0].entities[0].interact`。 */
  where: string
  message: string
}

/** 被校验的内容包(编辑器/loader 各自从工程组装出来的内容切片)。 */
export interface ContentBundle {
  scenes: SceneDef[]
  actors: ActorDef[]
  skills: SkillData[]
  levelUp: Record<string, LevelUpSkill[]>
  /** Current author identities (before or after dialogue resolution), never runtime ScriptRef shells. */
  items: AuthorItemCore[] | AuthorItemData[]
  locale: Locale
  sprites: SpriteDef[]
  /** 当前工程的战斗精灵定义表。 */
  battleSprites: BattleSpriteDef[]
  /** 当前工程的全部真实启动入口；每项拥有独立完整的初始世界。 */
  entryPoints: readonly EntryPoint[]
  /** 切片未提供敌人或敌队时按空表核对。 */
  enemies?: EnemyDef[]
  enemyTeams?: EnemyTeamDef[]
  /** 瓦片集注册表。 */
  tilesets?: TilesetDef[]
  /** 组合模板表；每个局部内容可引用多个稳定 tileset id。 */
  stamps?: StampTemplate[]
  /** 战场定义表。缺省切片没有可引用的战场。 */
  battleFields?: BattleFieldDef[]
  /** 毒定义表沿输入顺序遍历，避免数字键在对象中的排序改变诊断顺序。 */
  poisons?: PoisonDef[]
  /** 氛围表(W6 昼夜;可缺省 = 空 → setAmbience no-op)。 */
  ambiences?: AmbienceDef[]
  /** 店铺表(openShop 货单;可缺省 = 空 → openShop 报店不存在)。 */
  shops?: ShopDef[]
  /** 工程唯一地图发现真值。 */
  mapIndex: MapIndexV1
  /** 可供校验的运行时分片。当前作者正文由场景和共享库提供。 */
  scriptChunks?: Readonly<Record<string, ScriptChunkV1>>
  /** 编辑器提供的共享脚本目录元数据。 */
  scriptIndex?: ScriptIndexV1
  /** 当前作者共享脚本正文；纯运行时调用方可缺省。 */
  sharedScripts?: RuntimeScriptLibrary | AuthorScriptLibrary
  /** 可见存档/运行态；删除保护可选传入，普通工程闭包可缺省。 */
  worlds?: readonly WorldState[]
  /** 迁移工具显式写出的作者待处理 sidecar；空白/纯作者工程缺省为空。 */
  migrationDiagnostics?: MigrationDiagnosticsV1
}

export * from './sprite-references.js'

/** 编辑器被编辑的内容工作副本 = ContentBundle + manifest(EditSession 用)。 */
export type EditorContent = Omit<ContentBundle, 'entryPoints'> & { manifest: CurrentManifest }

/** 角色出厂技能是首次实例化的唯一权威种子，悬空 id 必须在 loader 前硬失败。 */
export function validateActorInitialMagicReferences(
  actors: readonly ActorDef[],
  skills: readonly Pick<SkillData, 'id'>[],
): Issue[] {
  const issues: Issue[] = []
  const skillIds = new Set(skills.map((skill) => skill.id))
  actors.forEach((actor, actorIndex) => {
    actor.battler?.initialMagic.forEach((skillId, skillIndex) => {
      if (skillIds.has(skillId)) return
      issues.push({
        severity: 'error',
        where: `actors[${actorIndex}](${actor.id}).battler.initialMagic[${skillIndex}]`,
        message: `初始仙术 "${skillId}" 不在 skills`,
      })
    })
  })
  return issues
}

/**
 * 启动入口的跨表闭包。current loader 与编辑器保存门共用，所有悬空边都属于
 * 无法可靠创建新世界的硬错误；路径以稳定入口 id 定位，而不是依赖数组顺序。
 */
export function validateEntryPointStartWorldReferences(
  entryPoints: readonly EntryPoint[],
  actors: readonly ActorDef[],
  items: readonly Pick<ItemData, 'id'>[],
  poisons: readonly Pick<PoisonDef, 'id'>[] = [],
): Issue[] {
  const issues: Issue[] = []
  const actorsById = new Map(actors.map((actor) => [actor.id, actor]))
  const itemIds = new Set(items.map((item) => item.id))
  const poisonIds = new Set(poisons.map((poison) => poison.id))

  for (const entryPoint of entryPoints) {
    const world = entryPoint.startWorld
    const prefix = `entryPoints[${entryPoint.id}].startWorld`
    world.party.forEach((actorId, index) => {
      const actor = actorsById.get(actorId)
      if (!actor)
        issues.push({
          severity: 'error',
          where: `${prefix}.party[${index}]`,
          message: `队员 "${actorId}" 不在 actors 表`,
        })
      else if (!actor.battler)
        issues.push({
          severity: 'error',
          where: `${prefix}.party[${index}]`,
          message: `队员 "${actorId}" 无 battler(不可入队)`,
        })
    })
    world.inventory.forEach((inventoryEntry, index) => {
      if (!itemIds.has(inventoryEntry.itemId))
        issues.push({
          severity: 'error',
          where: `${prefix}.inventory[${index}].itemId`,
          message: `物品 "${inventoryEntry.itemId}" 不在 items`,
        })
    })
    for (const actorId of Object.keys(world.seedStats ?? {}))
      if (!actorsById.has(actorId))
        issues.push({
          severity: 'error',
          where: `${prefix}.seedStats[${actorId}]`,
          message: `属性播种角色 "${actorId}" 不在 actors`,
        })
    const partyIds = new Set(world.party)
    for (const [actorId, seed] of Object.entries(world.seedConditions ?? {})) {
      const actor = actorsById.get(actorId)
      if (!actor)
        issues.push({
          severity: 'error',
          where: `${prefix}.seedConditions[${actorId}]`,
          message: `状态播种角色 "${actorId}" 不在 actors`,
        })
      else if (!actor.battler)
        issues.push({
          severity: 'error',
          where: `${prefix}.seedConditions[${actorId}]`,
          message: `状态播种角色 "${actorId}" 无 battler(不可入队)`,
        })
      if (!partyIds.has(actorId))
        issues.push({
          severity: 'error',
          where: `${prefix}.seedConditions[${actorId}]`,
          message: `状态播种角色 "${actorId}" 不在该入口 party`,
        })
      seed.poisonIds?.forEach((poisonId, index) => {
        if (!poisonIds.has(poisonId))
          issues.push({
            severity: 'error',
            where: `${prefix}.seedConditions[${actorId}].poisonIds[${index}]`,
            message: `毒 ${poisonId} 不在 poisons`,
          })
      })
      const effectiveHp = world.seedStats?.[actorId]?.hp ?? actor?.battler?.baseStats.hp
      seed.statuses?.forEach((status, index) => {
        if (
          isCarryableStatusId(status.status) &&
          effectiveHp !== undefined &&
          effectiveHp <= 0 &&
          ACTOR_STATUS_DEFINITIONS[status.status].category === 'good'
        )
          issues.push({
            severity: 'error',
            where: `${prefix}.seedConditions[${actorId}].statuses[${index}].status`,
            message: `当前 HP 为 0 的角色 "${actorId}" 不能播种好状态 ${status.status}`,
          })
      })
    }
  }
  return issues
}

export interface ActorConditionPoisonReference {
  poisonId: number
  where: string
}

/** Inspect one command node only; recursive callers own traversal and canonical owner identity. */
export function actorConditionPoisonReferenceAtNode(
  value: unknown,
  where: string,
): ActorConditionPoisonReference | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  if (record.kind !== 'applyActorCondition' && record.kind !== 'clearActorCondition')
    return undefined
  const condition = record.condition
  if (!condition || typeof condition !== 'object' || Array.isArray(condition)) return undefined
  const typedCondition = condition as Record<string, unknown>
  if (typedCondition.kind !== 'poison' || typeof typedCondition.poisonId !== 'number')
    return undefined
  return { poisonId: typedCondition.poisonId, where: `${where}.condition.poisonId` }
}

export function collectActorConditionPoisonReferences(
  value: unknown,
  where: string,
): ActorConditionPoisonReference[] {
  const references: ActorConditionPoisonReference[] = []
  const visit = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((entry, index) => {
        visit(entry, `${path}[${index}]`)
      })
      return
    }
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    const reference = actorConditionPoisonReferenceAtNode(record, path)
    if (reference) references.push(reference)
    for (const [key, child] of Object.entries(record)) visit(child, `${path}.${key}`)
  }
  visit(value, where)
  return references
}

/** loader 的 author root 与全量主引用门共用，不依赖 ContentBundle 组装。 */
export function validateActorConditionCommandReferences(
  value: unknown,
  actors: readonly ActorDef[],
  poisons: readonly Pick<PoisonDef, 'id'>[],
  where: string,
): Issue[] {
  const issues: Issue[] = []
  const actorsById = new Map(actors.map((actor) => [actor.id, actor]))
  const poisonIds = new Set(poisons.map((poison) => poison.id))
  for (const reference of collectActorTaggedReferences(value, where)) {
    if (reference.kind !== 'command-actor-condition') continue
    const actor = actorsById.get(reference.actorId)
    if (!actor)
      issues.push({
        severity: 'error',
        where: reference.where,
        message: `角色 "${reference.actorId}" 不在 actors`,
      })
    else if (!actor.battler)
      issues.push({
        severity: 'error',
        where: reference.where,
        message: `角色 "${reference.actorId}" 无 battler，不可成为当前队员/后备角色`,
      })
  }
  for (const reference of collectActorConditionPoisonReferences(value, where))
    if (!poisonIds.has(reference.poisonId))
      issues.push({
        severity: 'error',
        where: reference.where,
        message: `毒 ${reference.poisonId} 不在 poisons`,
      })
  return issues
}

/** 跨引用完整性校验:返回所有悬空引用(空数组 = 干净)。 */
export function validateReferences(b: ContentBundle): Issue[] {
  const issues: Issue[] = []

  // id 集合(O(1) 查表)
  const skillsById = new Map(b.skills.map((skill) => [skill.id, skill]))
  const itemIds = new Set(b.items.map((i) => i.id))
  const actorsById = new Map(b.actors.map((actor) => [actor.id, actor]))
  const enemyIds = new Set((b.enemies ?? []).map((e) => e.id))
  const scenesById = new Map(b.scenes.map((scene) => [scene.id, scene]))
  const spritesById = new Map(b.sprites.map((sprite) => [sprite.id, sprite]))
  const battleSpritesById = new Map(b.battleSprites.map((sprite) => [sprite.id, sprite]))
  const localeKeys = new Set(Object.keys(b.locale))
  const mapIds = new Set(b.mapIndex.maps.map((asset) => asset.id))
  const tilesetIds = new Set((b.tilesets ?? []).map((tileset) => tileset.id))
  const poisonIds = new Set((b.poisons ?? []).map((poison) => String(poison.id)))
  const numericPoisonIds = new Set((b.poisons ?? []).map((poison) => poison.id))
  const battleFieldIds = new Set((b.battleFields ?? []).map((field) => field.id))
  const enemyTeamIds = new Set((b.enemyTeams ?? []).map((team) => team.id))
  const shopIds = new Set((b.shops ?? []).map((shop) => shop.id))
  const ambienceIds = new Set((b.ambiences ?? []).map((ambience) => ambience.id))

  const validateBattleField = (fieldId: number, where: string): void => {
    if (!battleFieldIds.has(fieldId))
      issues.push({
        severity: 'error',
        where,
        message: `战场 ${fieldId} 不在 battleFields`,
      })
  }

  const validateBattleActor = (actorId: string, where: string): void => {
    const actor = actorsById.get(actorId)
    if (!actor)
      issues.push({
        severity: 'error',
        where,
        message: `战斗角色 "${actorId}" 不在 actors`,
      })
    else if (!actor.battler)
      issues.push({
        severity: 'error',
        where,
        message: `战斗角色 "${actorId}" 不是可战斗角色`,
      })
  }

  const validateAiCondition = (condition: AiCond, where: string): void => {
    switch (condition.kind) {
      case 'playerInParty':
        validateBattleActor(condition.role, `${where}.role`)
        return
      case 'all':
      case 'any':
        condition.of.forEach((child, index) => {
          validateAiCondition(child, `${where}.of[${index}]`)
        })
        return
      case 'not':
        validateAiCondition(condition.cond, `${where}.cond`)
        return
      default:
        return
    }
  }

  const validateAiAction = (action: AiAction, where: string): void => {
    if (action.kind === 'cast') {
      const skill = skillsById.get(action.skillId)
      if (!skill)
        issues.push({
          severity: 'error',
          where: `${where}.skillId`,
          message: `施法技能 "${action.skillId}" 不在 skills`,
        })
      else {
        const execution = resolveSkillExecution(skill, 'enemy')
        if (execution.prepare.length > 0)
          issues.push({
            severity: 'error',
            where: `${where}.skillId`,
            message: `敌方施法技能 "${action.skillId}" 含 runtime 不支持的 prepare`,
          })
        execution.effects.forEach((effect, effectIndex) => {
          if (!isEnemyRuntimeSkillEffect(effect))
            issues.push({
              severity: 'error',
              where: `${where}.skillId`,
              message: `敌方施法技能 "${action.skillId}" 的有效效果[${effectIndex}] "${effect.kind}" 不受 runtime 支持`,
            })
        })
      }
    }
    if (action.kind === 'transform' && !enemyIds.has(action.enemyId))
      issues.push({
        severity: 'error',
        where: `${where}.enemyId`,
        message: `变身目标 "${action.enemyId}" 不在 enemies`,
      })
    if (action.kind === 'summon' && action.enemyId && !enemyIds.has(action.enemyId))
      issues.push({
        severity: 'error',
        where: `${where}.enemyId`,
        message: `召唤目标 "${action.enemyId}" 不在 enemies`,
      })
  }

  const validateBattleAction = (action: BattleChoreographyAction, where: string): void => {
    if (action.kind === 'applyActorGrowth' || action.kind === 'playActorCastEffect')
      validateBattleActor(action.actor, `${where}.actor`)
  }

  const validateHookCommand = (command: EnemyHookCommand, where: string): void => {
    if (command.kind === 'setFallback') {
      if (command.fallback) validateAiAction(command.fallback.action, `${where}.fallback.action`)
      return
    }
    if (command.kind === 'effect') {
      validateAiAction(command.effect, `${where}.effect`)
      return
    }
    validateBattleAction(command, where)
  }

  const validateHookTransition = (transition: EnemyHookTransition, where: string): void => {
    switch (transition.kind) {
      case 'branch':
        validateAiCondition(transition.cond, `${where}.cond`)
        validateHookTransition(transition.then, `${where}.then`)
        validateHookTransition(transition.else, `${where}.else`)
        return
      case 'random':
        transition.choices.forEach((choice, index) => {
          validateHookTransition(choice.then, `${where}.choices[${index}].then`)
        })
        return
      case 'commandOutcome':
        validateHookTransition(transition.then, `${where}.then`)
        validateHookTransition(transition.else, `${where}.else`)
        return
      default:
        return
    }
  }

  const validateEntityAddress = (
    target: { scene: string; entity: string },
    where: string,
  ): void => {
    const targetScene = scenesById.get(target.scene)
    if (!targetScene) {
      issues.push({
        severity: 'error',
        where: `${where}.scene`,
        message: `场景 "${target.scene}" 不在 scenes`,
      })
      return
    }
    if (!targetScene.entities.some((entity) => entity.id === target.entity))
      issues.push({
        severity: 'error',
        where: `${where}.entity`,
        message: `实体 "${target.scene}/${target.entity}" 不在 scenes`,
      })
  }

  const validateAuthorCondition = (condition: AuthorCondition, where: string): void => {
    switch (condition.kind) {
      case 'hasItem':
      case 'ownsItem':
      case 'itemEquipped':
        if (!itemIds.has(condition.itemId))
          issues.push({
            severity: 'error',
            where: `${where}.itemId`,
            message: `物品 "${condition.itemId}" 不在 items`,
          })
        return
      case 'inParty':
        if (!actorsById.has(condition.actorId))
          issues.push({
            severity: 'error',
            where: `${where}.actorId`,
            message: `角色 "${condition.actorId}" 不在 actors`,
          })
        return
      case 'currentScene':
        if (!scenesById.has(condition.scene))
          issues.push({
            severity: 'error',
            where: `${where}.scene`,
            message: `场景 "${condition.scene}" 不在 scenes`,
          })
        return
      case 'entityState':
      case 'entityInScene':
      case 'facingEntity':
        validateEntityAddress(condition.target, `${where}.target`)
        return
      case 'entitiesNear':
        validateEntityAddress(condition.from, `${where}.from`)
        validateEntityAddress(condition.to, `${where}.to`)
        return
      case 'all':
      case 'any':
        condition.of.forEach((child, index) => {
          validateAuthorCondition(child, `${where}.of[${index}]`)
        })
        return
      case 'not':
        validateAuthorCondition(condition.cond, `${where}.cond`)
        return
      default:
        return
    }
  }

  const validateOnDefeated = (commands: readonly EnemyOnDefeatedCommand[], where: string): void => {
    commands.forEach((command, index) => {
      const commandWhere = `${where}[${index}]`
      if (command.kind === 'giveItem' || command.kind === 'loseItem') {
        if (!itemIds.has(command.itemId))
          issues.push({
            severity: 'error',
            where: `${commandWhere}.itemId`,
            message: `物品 "${command.itemId}" 不在 items`,
          })
        return
      }
      if (command.kind === 'branch') {
        validateAuthorCondition(command.cond, `${commandWhere}.cond`)
        validateOnDefeated(command.then, `${commandWhere}.then`)
        if (command.else) validateOnDefeated(command.else, `${commandWhere}.else`)
      }
    })
  }

  ;(b.stamps ?? []).forEach((stamp, index) => {
    stamp.tilesetRefs.forEach((tilesetId, sourceIndex) => {
      if (!tilesetIds.has(tilesetId))
        issues.push({
          severity: 'error',
          where: `stamps[${index}](${stamp.id}).tilesetRefs[${sourceIndex}]`,
          message: `瓦片集 "${tilesetId}" 不在 tilesets 注册表`,
        })
    })
  })

  // ── scenes ──────────────────────────────────────────────
  b.entryPoints.forEach((entry, index) => {
    if (!scenesById.has(entry.scene))
      issues.push({
        severity: 'error',
        where: `entryPoints[${index}](${entry.id}).scene`,
        message: `场景 "${entry.scene}" 不在 scenes`,
      })
  })
  b.scenes.forEach((scene, si) => {
    if (scene.battleFieldId !== undefined)
      validateBattleField(scene.battleFieldId, `scenes[${si}].battleFieldId`)
    if (!mapIds.has(scene.mapId))
      issues.push({
        severity: 'error',
        where: `scenes[${si}].mapId`,
        message: `地图 "${scene.mapId}" 不在 map index`,
      })
    scene.entities.forEach((e, ei) => {
      const where = `scenes[${si}].entities[${ei}]`
      if (e.hostile?.battleFieldId !== undefined)
        validateBattleField(e.hostile.battleFieldId, `${where}.hostile.battleFieldId`)
      if (e.hostile && !enemyTeamIds.has(e.hostile.enemyTeamId))
        issues.push({
          severity: 'error',
          where: `${where}.hostile.enemyTeamId`,
          message: `敌队 "${e.hostile.enemyTeamId}" 不在 enemyTeams`,
        })
      if (isActorEntity(e)) {
        // actor → actors 表(缺 = error:引擎解析精灵会 throw)
        if (!actorsById.has(e.actor))
          issues.push({
            severity: 'error',
            where: `${where}.actor`,
            message: `角色 "${e.actor}" 不在 actors 表`,
          })
      } // zone:true 无视觉引用,无需校验；prop sprite 由统一语义引用表校验
    })
  })

  // ── canonical/legacy command target leaves ──────────────
  // 一个有界 tagged walker 同时覆盖 scene/map/shop/team/field/ambience 与 EntityAddress；
  // editor adapter 复用相同 leaf 规则并额外附 owner/locator/delete policy。
  const commandTargetRoots: Array<{ value: unknown; where: string }> = [
    ...b.scenes.map((scene, index) => ({ value: scene, where: `scenes[${index}](${scene.id})` })),
    ...b.items.map((item, index) => ({ value: item, where: `items[${index}](${item.id})` })),
    ...Object.entries(b.scriptChunks ?? {}).map(([chunkId, chunk]) => ({
      value: chunk,
      where: `scriptChunks[${JSON.stringify(chunkId)}]`,
    })),
    ...Object.entries(b.sharedScripts ?? {}).map(([scriptId, script]) => ({
      value: script.body,
      where: `sharedScripts[${JSON.stringify(scriptId)}].body`,
    })),
    ...(b.enemies ?? []).map((enemy, index) => ({
      value: enemy,
      where: `enemies[${index}](${enemy.id})`,
    })),
    ...(b.worlds ?? []).map((world, index) => ({ value: world, where: `worlds[${index}]` })),
  ]
  const addTargetIssue = (severity: Issue['severity'], where: string, message: string): void => {
    if (issues.some((issue) => issue.where === where && issue.message === message)) return
    issues.push({ severity, where, message })
  }
  const validateAcquisitionParameters = (value: unknown, where: string): void => {
    if (Array.isArray(value)) {
      value.forEach((child, index) => {
        validateAcquisitionParameters(child, `${where}[${index}]`)
      })
      return
    }
    if (!value || typeof value !== 'object') return
    for (const reference of acquisitionItemReferencesAtNode(value, where))
      if (!itemIds.has(reference.itemId))
        addTargetIssue('error', reference.where, `奖励物品 "${reference.itemId}" 不在 items`)
    for (const site of dialogueCuesAtNode(value)) {
      if (!Array.isArray(site.cue.rows)) continue
      site.cue.rows.forEach((row, index) => {
        if (!row || typeof row !== 'object' || !('reward' in row)) return
        const reward = row.reward
        if (
          !reward ||
          typeof reward !== 'object' ||
          reward.kind !== 'item' ||
          typeof reward.itemName !== 'string'
        )
          return
        if (!localeKeys.has(reward.itemName))
          addTargetIssue(
            'error',
            `${where}.${site.path.join('.')}.rows[${index}].reward.itemName`,
            `奖励物品名 "${reward.itemName}" 不在 locale`,
          )
      })
    }
    for (const [key, child] of Object.entries(value))
      validateAcquisitionParameters(child, `${where}.${key}`)
  }
  for (const root of commandTargetRoots) validateAcquisitionParameters(root.value, root.where)
  for (const root of commandTargetRoots)
    visitCommandTargetReferences(root.value, root.where, (reference) => {
      const target = reference.target
      if (target.kind === 'scene') {
        if (!scenesById.has(target.id))
          addTargetIssue('error', reference.where, `场景 "${target.id}" 不在 scenes`)
        return
      }
      if (target.kind === 'scene-entry') {
        const scene = scenesById.get(target.sceneId)
        if (scene && (!scene.entries || !Object.hasOwn(scene.entries, target.entryId)))
          addTargetIssue(
            'error',
            reference.where,
            `命名落点 "${target.sceneId}/${target.entryId}" 不在 scenes`,
          )
        return
      }
      if (target.kind === 'scene-hook') {
        const scene = scenesById.get(target.sceneId) as AuthorSceneDef | undefined
        const variants = scene?.hooks?.[target.slot]?.variants
        if (scene && (!variants || !Object.hasOwn(variants, target.hookId)))
          addTargetIssue(
            'error',
            reference.where,
            `场景脚本方案 "${target.sceneId}/${target.slot}/${target.hookId}" 不存在`,
          )
        return
      }
      if (target.kind === 'entity') {
        validateEntityAddress({ scene: target.sceneId, entity: target.entityId }, reference.where)
        return
      }
      if (target.kind === 'map') {
        if (!mapIds.has(target.id))
          addTargetIssue('error', reference.where, `地图 "${target.id}" 不在 map index`)
        return
      }
      if (target.kind === 'shop') {
        if (!shopIds.has(target.id))
          addTargetIssue('error', reference.where, `商店 ${target.id} 不在 shops`)
        return
      }
      if (target.kind === 'enemy-team') {
        if (!enemyTeamIds.has(target.id))
          addTargetIssue('error', reference.where, `敌队 "${target.id}" 不在 enemyTeams`)
        return
      }
      if (target.kind === 'battle-field') {
        validateBattleField(target.id, reference.where)
        return
      }
      if (target.kind === 'skill') {
        if (!skillsById.has(target.id))
          addTargetIssue('error', reference.where, `技能 "${target.id}" 不在 skills`)
        return
      }
      if (target.id !== 'day' && !ambienceIds.has(target.id))
        addTargetIssue('warn', reference.where, `氛围 "${target.id}" 不在 ambiences`)
    })

    // ── enemies / enemyTeams ─────────────────────────
  ;(b.enemies ?? []).forEach((e, ei) => {
    const where = `enemies[${ei}](${e.id})`
    for (const [ri, r] of (e.ai.rules ?? []).entries()) {
      if (r.when) validateAiCondition(r.when, `${where}.ai.rules[${ri}].when`)
      validateAiAction(r.do, `${where}.ai.rules[${ri}].do`)
    }
    if (e.ai.fallback) validateAiAction(e.ai.fallback.action, `${where}.ai.fallback.action`)
    for (const [ci, choreography] of (e.choreography ?? []).entries()) {
      const choreographyWhere = `${where}.choreography[${ci}]`
      if (choreography.when) validateAiCondition(choreography.when, `${choreographyWhere}.when`)
      choreography.body.forEach((action, actionIndex) => {
        validateBattleAction(action, `${choreographyWhere}.body[${actionIndex}]`)
      })
    }
    for (const [channel, hook] of Object.entries(e.ai.hooks ?? {})) {
      if (!hook) continue
      const hookWhere = `${where}.ai.hooks.${channel}`
      for (const [stateId, state] of Object.entries(hook.states)) {
        const stateWhere = `${hookWhere}.states[${JSON.stringify(stateId)}]`
        state.body.forEach((command, commandIndex) => {
          validateHookCommand(command, `${stateWhere}.body[${commandIndex}]`)
        })
        validateHookTransition(state.next, `${stateWhere}.next`)
      }
    }
    if (e.onDefeated) validateOnDefeated(e.onDefeated, `${where}.onDefeated`)
    if (e.steal && !itemIds.has(e.steal.itemId))
      issues.push({
        severity: 'warn',
        where: `${where}.steal`,
        message: `可偷物品 "${e.steal.itemId}" 不在 items`,
      })
    if (e.attackEquivItem && !itemIds.has(e.attackEquivItem.itemId))
      issues.push({
        severity: 'error',
        where: `${where}.attackEquivItem.itemId`,
        message: `普攻附带物品 "${e.attackEquivItem.itemId}" 不在 items`,
      })
  })
  const seenEnemyTeams = new Set<string>()
  ;(b.enemyTeams ?? []).forEach((t, ti) => {
    const where = `enemyTeams[${ti}](${t.id})`
    if (seenEnemyTeams.has(t.id))
      issues.push({ severity: 'error', where: `${where}.id`, message: `重复敌队 id "${t.id}"` })
    seenEnemyTeams.add(t.id)
    if (!Array.isArray(t.slots) || t.slots.length > 5) {
      issues.push({
        severity: 'error',
        where: `${where}.slots`,
        message: `敌队槽位数 ${Array.isArray(t.slots) ? t.slots.length : '非数组'} 超上限 5`,
      })
      return
    }
    t.slots.forEach((m, mi) => {
      if (m !== null && !enemyIds.has(m))
        issues.push({
          severity: 'error',
          where: `${where}.slots[${mi}]`,
          message: `敌人 "${m}" 不在 enemies`,
        })
    })
  })

  // ── actors ──────────────────────────────────────────────
  b.actors.forEach((a, ai) => {
    const where = `actors[${ai}](${a.id})`
    // name → locale(缺 = warn:菜单/对话显 id)
    if (!localeKeys.has(a.name))
      issues.push({
        severity: 'warn',
        where: `${where}.name`,
        message: `角色名 id "${a.name}" 不在 locale`,
      })
    const battler = a.battler
    if (battler) {
      // battler.initialEquipment 值 → items(缺 = warn)
      for (const [slot, itemId] of Object.entries(battler.initialEquipment)) {
        if (!itemIds.has(itemId))
          issues.push({
            severity: 'warn',
            where: `${where}.battler.initialEquipment[${slot}]`,
            message: `初始装备 "${itemId}" 不在 items`,
          })
      }
      // E18-1(G2/K2/K3):三字段引用校验。
      // coveredBy → actor 存在且可战斗(error);指向自己 = warn(运行时死者 hp=0 天然不触发)。
      if (battler.coveredBy !== undefined) {
        validateBattleActor(battler.coveredBy, `${where}.battler.coveredBy`)
        if (battler.coveredBy === a.id)
          issues.push({
            severity: 'warn',
            where: `${where}.battler.coveredBy`,
            message: `coveredBy 指向自己（运行时死者 hp=0 不满足援护前置，天然不触发）`,
          })
      }
      // cooperativeMagicSkillId → skills(error:runtime expectDefined fail-loud)。
      if (
        battler.cooperativeMagicSkillId !== undefined &&
        !skillsById.has(battler.cooperativeMagicSkillId)
      )
        issues.push({
          severity: 'error',
          where: `${where}.battler.cooperativeMagicSkillId`,
          message: `合体技 "${battler.cooperativeMagicSkillId}" 不在 skills`,
        })
      // casualty 树:text id(warn);空壳(warn,K4)。
      if (battler.casualty !== undefined) {
        const walkBranch = (branch: import('./actor.js').CasualtyBranch, bw: string): void => {
          branch.lines.forEach((line, li) => {
            if (!localeKeys.has(line.text))
              issues.push({
                severity: 'warn',
                where: `${bw}.lines[${li}].text`,
                message: `文本 id "${line.text}" 不在 locale`,
              })
          })
        }
        for (const slot of ['friendDeath', 'dying'] as const) {
          const script = battler.casualty[slot]
          if (!script) continue
          const sw = `${where}.battler.casualty.${slot}`
          script.gates.forEach((gate, gi) => {
            walkBranch(gate.branch, `${sw}.gates[${gi}].branch`)
          })
          walkBranch(script.fallback, `${sw}.fallback`)
          const branchEmpty = (branch: import('./actor.js').CasualtyBranch): boolean =>
            branch.lines.length === 0 && branch.effects.length === 0
          if (script.gates.length === 0 && branchEmpty(script.fallback))
            issues.push({
              severity: 'warn',
              where: sw,
              message: '伤亡脚本为空壳（gates 空且 fallback 无台词/效果），疑误存',
            })
        }
      }
    }
  })

  // ── SpriteDef 语义边（Actor/Entity/appearance/followers/所有嵌套脚本）──
  for (const reference of collectSpriteDefinitionReferences(b)) {
    if (!spritesById.has(reference.sprite))
      issues.push({
        severity: 'error',
        where: reference.where,
        message: `精灵 "${reference.sprite}" 不在 sprites 注册表`,
      })
  }

  for (const reference of collectSpriteActionReferences(b)) {
    const sprite = spritesById.get(reference.sprite)
    if (!sprite) continue // SpriteDef 缺失已由上一层统一语义边报告。
    if (!Object.hasOwn(sprite.poses ?? {}, reference.action))
      issues.push({
        severity: 'error',
        where: reference.where,
        message: `精灵 "${reference.sprite}" 不存在动作 "${reference.action}"`,
      })
  }

  // ── BattleSpriteDef 语义边（profile 同时做 channel/usage 门禁）──
  for (const reference of collectBattleSpriteDefinitionReferences(b)) {
    if (reference.origin === 'equip') continue
    const definition = battleSpritesById.get(reference.battleSprite)
    if (!definition)
      issues.push({
        severity: 'error',
        where: reference.where,
        message: `战斗精灵 "${reference.battleSprite}" 不在 battleSprites 注册表`,
      })
    else if (definition.profile.kind !== reference.expectedProfile)
      issues.push({
        severity: 'error',
        where: reference.where,
        message: `战斗精灵 "${reference.battleSprite}" profile 期望 ${reference.expectedProfile}，实际 ${definition.profile.kind}`,
      })
  }

  // ── entryPoints[].startWorld ────────────────────────────
  issues.push(
    ...validateEntryPointStartWorldReferences(b.entryPoints, b.actors, b.items, b.poisons ?? []),
  )
  issues.push(...validateActorInitialMagicReferences(b.actors, b.skills))

  // ── items ───────────────────────────────────────────────
  issues.push(...validateEquipBattleSpriteReferences(b.items, b.actors, b.battleSprites))
  b.items.forEach((item, ii) => {
    const where = `items[${ii}](${item.id})`
    const equip = item.equip
    if (equip) {
      // equipableBy → actors(缺 = warn:装备菜单不显示该角色)
      equip.equipableBy.forEach((cid, ei) => {
        if (!actorsById.has(cid))
          issues.push({
            severity: 'warn',
            where: `${where}.equip.equipableBy[${ei}]`,
            message: `可装备角色 "${cid}" 不在 actors`,
          })
      })
      // effects.grantSkill.skillId → skills(缺 = warn)
      equip.effects.forEach((eff, ei) => {
        if (eff.kind === 'grantSkill' && !skillsById.has(eff.skillId))
          issues.push({
            severity: 'warn',
            where: `${where}.equip.effects[${ei}].grantSkill`,
            message: `授技 "${eff.skillId}" 不在 skills`,
          })
      })
    }
    for (const [capability, effects] of [
      ['use', item.use?.effects],
      ['throw', item.throw?.effects],
    ] as const) {
      effects?.forEach((effect, effectIndex) => {
        const effectWhere = `${where}.${capability}.effects[${effectIndex}]`
        if (effect.kind === 'craftRecipe')
          effect.recipes.forEach((recipe, recipeIndex) => {
            for (const [field, entries] of [
              ['ingredients', recipe.ingredients],
              ['products', recipe.products],
            ] as const)
              entries.forEach((entry, entryIndex) => {
                if (!itemIds.has(entry.itemId))
                  issues.push({
                    severity: 'error',
                    where: `${effectWhere}.recipes[${recipeIndex}].${field}[${entryIndex}].itemId`,
                    message: `配方物品 "${entry.itemId}" 不在 items`,
                  })
              })
          })
        if (effect.kind === 'drawFromResourcePool')
          effect.rewards.forEach((reward, rewardIndex) => {
            if (!itemIds.has(reward.itemId))
              issues.push({
                severity: 'error',
                where: `${effectWhere}.rewards[${rewardIndex}].itemId`,
                message: `资源池奖励物品 "${reward.itemId}" 不在 items`,
              })
          })
        if (
          b.poisons !== undefined &&
          (effect.kind === 'applyPoison' || effect.kind === 'curePoison') &&
          effect.poisonId !== undefined &&
          !poisonIds.has(effect.poisonId)
        )
          issues.push({
            severity: 'error',
            where: `${effectWhere}.poisonId`,
            message: `毒 "${effect.poisonId}" 不在 poisons`,
          })
        if (effect.kind === 'runScript') {
          if (!Object.hasOwn(b.sharedScripts ?? {}, effect.script))
            issues.push({
              severity: 'error',
              where: `${effectWhere}.script`,
              message: `共享脚本 "${effect.script}" 不在脚本库`,
            })
        }
      })
    }
  })

  ;(b.migrationDiagnostics?.diagnostics ?? []).forEach((diagnostic, index) => {
    if (!itemIds.has(diagnostic.target.objectId))
      issues.push({
        severity: 'error',
        where: `migrationDiagnostics.diagnostics[${index}].target.objectId`,
        message: `待迁移诊断指向的物品 "${diagnostic.target.objectId}" 不在 items`,
      })
  })

  // ── shops ──────────────────────────────────────────────
  ;(b.shops ?? []).forEach((shop, shopIndex) => {
    shop.items.forEach((itemId, itemIndex) => {
      if (!itemIds.has(itemId))
        issues.push({
          severity: 'error',
          where: `shops[${shopIndex}](${shop.id}).items[${itemIndex}]`,
          message: `商店物品 "${itemId}" 不在 items`,
        })
    })
  })

  // ── skills ──────────────────────────────────────────────
  b.skills.forEach((skill, si) => {
    const where = `skills[${si}](${skill.id})`
    // SkillCost.items[].itemId → items(缺 = warn:施法时扣不到)
    skill.cost?.items?.forEach((entry, ci) => {
      if (!itemIds.has(entry.itemId))
        issues.push({
          severity: 'warn',
          where: `${where}.cost.items[${ci}].itemId`,
          message: `消耗物品 "${entry.itemId}" 不在 items`,
        })
    })
    for (const reference of collectSkillPoisonReferences(skill, where))
      if (!poisonIds.has(reference.poisonId))
        issues.push({
          severity: 'error',
          where: reference.where,
          message: `毒 "${reference.poisonId}" 不在 poisons`,
        })
  })

  for (const reference of collectPoisonDefinitionReferences(b.poisons ?? []))
    if (!numericPoisonIds.has(reference.poisonId))
      issues.push({
        severity: 'error',
        where: reference.where,
        message: `毒 ${reference.poisonId} 不在 poisons`,
      })

  for (const reference of collectWorldBattleDataReferences(b.worlds ?? [])) {
    if (reference.target === 'skill' && !skillsById.has(reference.id))
      issues.push({
        severity: 'error',
        where: reference.where,
        message: `技能 "${reference.id}" 不在 skills`,
      })
    if (reference.target === 'poison' && !poisonIds.has(reference.id))
      issues.push({
        severity: 'error',
        where: reference.where,
        message: `毒 "${reference.id}" 不在 poisons`,
      })
  }
  for (const reference of collectWorldActorReferences(b.worlds ?? []))
    if (!actorsById.has(reference.actorId))
      issues.push({
        severity: ACTOR_REFERENCE_POLICIES[reference.kind].danglingSeverity,
        where: reference.where,
        message: `角色 "${reference.actorId}" 不在 actors`,
      })

  // ── levelUp ─────────────────────────────────────────────
  for (const [cid, list] of Object.entries(b.levelUp)) {
    if (!actorsById.has(cid))
      issues.push({
        severity: ACTOR_REFERENCE_POLICIES['level-up-owner'].danglingSeverity,
        where: `levelUp[${cid}]`,
        message: `升级习得伴随表角色 "${cid}" 不在 actors`,
      })
    list.forEach((lu, li) => {
      if (!skillsById.has(lu.skillId))
        issues.push({
          severity: 'warn',
          where: `levelUp[${cid}][${li}].skillId`,
          message: `升级习得 "${lu.skillId}" 不在 skills`,
        })
    })
  }

  // ── Actor command/condition leaves ─────────────────────
  // 共享 typed 扫描器补齐 setParty / setActorSprite / setActorAppearance 等历史漏口。
  const tagged = [
    ...b.scenes.flatMap((scene, index) =>
      collectActorTaggedReferences(scene, `scenes[${index}](${scene.id})`),
    ),
    ...Object.entries(b.scriptChunks ?? {}).flatMap(([chunkId, chunk]) =>
      Object.entries(chunk.scripts).flatMap(([scriptId, body]) =>
        collectActorTaggedReferences(
          body,
          `scriptChunks[${JSON.stringify(chunkId)}].scripts[${JSON.stringify(scriptId)}]`,
        ),
      ),
    ),
    ...Object.entries(b.sharedScripts ?? {}).flatMap(([scriptId, script]) =>
      collectActorTaggedReferences(script.body, `sharedScripts[${JSON.stringify(scriptId)}].body`),
    ),
    ...b.items.flatMap((item, index) =>
      collectActorTaggedReferences(item, `items[${index}](${item.id})`),
    ),
    ...(b.enemies ?? []).flatMap((enemy, index) =>
      collectActorTaggedReferences(enemy, `enemies[${index}](${enemy.id})`),
    ),
  ]
  const existingActorIssuePaths = new Set(issues.map((issue) => issue.where))
  for (const reference of tagged) {
    if (existingActorIssuePaths.has(reference.where)) continue
    const actor = actorsById.get(reference.actorId)
    if (!actor)
      issues.push({
        severity: ACTOR_REFERENCE_POLICIES[reference.kind].danglingSeverity,
        where: reference.where,
        message: `角色 "${reference.actorId}" 不在 actors`,
      })
    else if (reference.kind === 'command-actor-condition' && !actor.battler)
      issues.push({
        severity: 'error',
        where: reference.where,
        message: `角色 "${reference.actorId}" 无 battler，不可成为当前队员/后备角色`,
      })
    else continue
    existingActorIssuePaths.add(reference.where)
  }

  const conditionRoots: Array<{ value: unknown; where: string }> = [
    ...b.scenes.map((scene, index) => ({ value: scene, where: `scenes[${index}](${scene.id})` })),
    ...b.items.map((item, index) => ({ value: item, where: `items[${index}](${item.id})` })),
    ...Object.entries(b.scriptChunks ?? {}).map(([chunkId, chunk]) => ({
      value: chunk,
      where: `scriptChunks[${JSON.stringify(chunkId)}]`,
    })),
    ...Object.entries(b.sharedScripts ?? {}).map(([scriptId, script]) => ({
      value: script,
      where: `sharedScripts[${JSON.stringify(scriptId)}]`,
    })),
    ...(b.enemies ?? []).map((enemy, index) => ({
      value: enemy,
      where: `enemies[${index}](${enemy.id})`,
    })),
  ]
  for (const root of conditionRoots)
    for (const reference of collectActorConditionPoisonReferences(root.value, root.where))
      if (!numericPoisonIds.has(reference.poisonId))
        issues.push({
          severity: 'error',
          where: reference.where,
          message: `毒 ${reference.poisonId} 不在 poisons`,
        })
  return issues
}
