/**
 * 跨引用完整性校验(D-B0 校验层地基)。
 *
 * `validate.ts` 只查形状(单表字段在不在);本层查**跨表引用**是否悬空 ——
 * 这是编辑器的核心价值:不让坏数据越积越多。loader 也能用来告警。
 *
 * 尚无稳定可编辑目标的运行时瞬态边跳过；已数据化的物品/毒/脚本等引用必须闭环。
 * 资产记录是否有对应物理文件
 * 不在此校验 —— 那是 loader/资产层的事。
 *
 * 见 docs/phase2/editor/editor-design.md §6。
 */

import { isActorEntity } from './actor.js'
import { ACTOR_STATUS_DEFINITIONS, isCarryableStatusId } from './actor-condition.js'
import { ACTOR_REFERENCE_POLICIES, collectActorTaggedReferences } from './actor-reference.js'
import { visitCommandTargetReferences } from './command-target-reference.js'
import type {
  ActorDef,
  AiAction,
  AiCond,
  AmbienceDef,
  AuthorCondition,
  AuthorSceneDef,
  BattleChoreographyAction,
  BattleFieldDef,
  BattleSpriteDef,
  BattleSpriteProfileKind,
  Command,
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
  ScriptStage,
  ShopDef,
  SkillData,
  SpriteDef,
  StampTemplate,
  TilesetDef,
  WorldState,
} from './index.js'
import {
  authoredSkillExecutionLayers,
  isEnemyRuntimeSkillEffect,
  resolveSkillExecution,
} from './skill.js'

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
  items: ItemData[]
  locale: Locale
  sprites: SpriteDef[]
  /** 战斗精灵定义表；canonical 工程必有，旧升级边界组装 bundle 前先补齐。 */
  battleSprites: BattleSpriteDef[]
  /** 当前工程的全部真实启动入口；每项拥有独立完整的初始世界。 */
  entryPoints: readonly EntryPoint[]
  /** 敌人/敌队(M4c-3 编辑器工作台;旧调用方可缺省 = 空)。 */
  enemies?: EnemyDef[]
  enemyTeams?: EnemyTeamDef[]
  /** tileset 注册表(W7B;可缺省 = 空)。 */
  tilesets?: TilesetDef[]
  /** 组合模板表；每个局部内容可引用多个稳定 tileset id。 */
  stamps?: StampTemplate[]
  /** 战场表(D24 一等 content 域;可缺省 = 空,引擎走 assetBase 遗留回退)。 */
  battleFields?: BattleFieldDef[]
  /** 毒定义表(B10 编辑器结构化;可缺省 = 空。保原文件序 —— 勿经 by-id Record 转,数值键会重排)。 */
  poisons?: PoisonDef[]
  /** 氛围表(W6 昼夜;可缺省 = 空 → setAmbience no-op)。 */
  ambiences?: AmbienceDef[]
  /** 店铺表(openShop 货单;可缺省 = 空 → openShop 报店不存在)。 */
  shops?: ShopDef[]
  /** 工程唯一地图发现真值。 */
  mapIndex: MapIndexV1
  /** 分片脚本正文；编辑器保存门传入后与场景 inline 脚本走同一语义引用扫描。 */
  scriptChunks?: Readonly<Record<string, ScriptChunkV1>>
  /** 作者共享脚本目录；仅登记项与 scene 私有根拥有可编辑的精确命令定位。 */
  scriptIndex?: ScriptIndexV1
  /** 当前作者共享脚本正文；纯运行时调用方可缺省。 */
  sharedScripts?: RuntimeScriptLibrary
  /** 可见存档/运行态；删除保护可选传入，普通工程闭包可缺省。 */
  worlds?: readonly WorldState[]
  /** 迁移工具显式写出的作者待处理 sidecar；空白/纯作者工程缺省为空。 */
  migrationDiagnostics?: MigrationDiagnosticsV1
}

/** 一条 SpriteDef 语义引用；删除保护、保存门和引用面板共用。 */
export interface SpriteDefinitionReference {
  sprite: string
  where: string
  site: string
}

/** 一条限定到 SpriteDef 内稳定 ActionId 的复合引用。 */
export interface SpriteActionReference extends SpriteDefinitionReference {
  action: string
  /** 可编辑来源的精确定位；只读兼容来源允许缺省，UI 不得猜跳转目标。 */
  locator?: SpriteActionReferenceLocator
}

export type SpriteActionReferenceLocator =
  | {
      kind: 'page-animation'
      sceneId: string
      entityId: string
      pageIndex: number
    }
  | {
      kind: 'scene-command'
      sceneId: string
      sourceKey: '__onEnter__' | '__onTeleport__' | `${string}:trigger` | `${string}:auto`
      entityId?: string
      pageIndex?: number
      /** ScriptTree 路径，例如 `0/1/then/0`。 */
      path: string
    }
  | {
      kind: 'script-command'
      scriptId: string
      /** 共享/内部脚本以虚拟 stage 0 开头，例如 `0/2/onNo/0`。 */
      path: string
    }

/** 一条 BattleSpriteDef 语义引用；expectedProfile 同时阻止 player/enemy 同号串线。 */
export interface BattleSpriteDefinitionReference {
  battleSprite: string
  expectedProfile: BattleSpriteProfileKind
  where: string
  site: string
}

/**
 * 装备战斗形象的跨表闭包。canonical loader 与编辑器保存门也直接调用，避免只在诊断面板
 * 报错、却仍让坏映射进入运行时或落盘。
 */
export function validateEquipBattleSpriteReferences(
  items: readonly Pick<ItemData, 'id' | 'equip'>[],
  actors: readonly ActorDef[],
  battleSprites: readonly BattleSpriteDef[],
): Issue[] {
  const issues: Issue[] = []
  const actorsById = new Map(actors.map((actor) => [actor.id, actor]))
  const battleSpritesById = new Map(battleSprites.map((sprite) => [sprite.id, sprite]))
  items.forEach((item, itemIndex) => {
    const equip = item.equip
    if (!equip) return
    equip.effects.forEach((effect, effectIndex) => {
      if (effect.kind !== 'battleSprite') return
      for (const [actorId, battleSprite] of Object.entries(effect.byActor)) {
        const where = `items[${itemIndex}](${item.id}).equip.effects[${effectIndex}].byActor.${actorId}`
        const actor = actorsById.get(actorId)
        if (!actor)
          issues.push({
            severity: 'error',
            where,
            message: `战斗形象覆写角色 "${actorId}" 不在 actors`,
          })
        else if (!actor.battler)
          issues.push({
            severity: 'error',
            where,
            message: `战斗形象覆写角色 "${actorId}" 不是可战斗角色`,
          })
        if (!equip.equipableBy.includes(actorId))
          issues.push({
            severity: 'error',
            where,
            message: `战斗形象覆写角色 "${actorId}" 不在本物品 equipableBy`,
          })
        const definition = battleSpritesById.get(battleSprite)
        if (!definition)
          issues.push({
            severity: 'error',
            where,
            message: `战斗精灵 "${battleSprite}" 不在 battleSprites 注册表`,
          })
        else if (definition.profile.kind !== 'player-fighter')
          issues.push({
            severity: 'error',
            where,
            message: `战斗精灵 "${battleSprite}" profile 期望 player-fighter，实际 ${definition.profile.kind}`,
          })
      }
    })
  })
  return issues
}

function collectCommandBattleSpriteReferences(
  node: unknown,
  where: string,
  site: string,
  out: BattleSpriteDefinitionReference[],
): void {
  if (Array.isArray(node)) {
    node.forEach((value, index) => {
      collectCommandBattleSpriteReferences(value, `${where}[${index}]`, site, out)
    })
    return
  }
  if (!node || typeof node !== 'object') return
  const record = node as Record<string, unknown>
  if (record.kind === 'setActorAppearance' && typeof record.battleSprite === 'string')
    out.push({
      battleSprite: record.battleSprite,
      expectedProfile: 'player-fighter',
      where: `${where}.battleSprite`,
      site,
    })
  for (const [key, value] of Object.entries(record))
    collectCommandBattleSpriteReferences(value, `${where}.${key}`, site, out)
}

/**
 * 递归收集 Actor/Enemy/Equip/Skill/Script/World 对 BattleSpriteDef.id 的全部持久边。
 * battle transient 不落 content；运行时 readiness 以同一 reference 形状追加后再解析。
 */
export function collectBattleSpriteDefinitionReferences(
  source: Pick<
    ContentBundle,
    'actors' | 'enemies' | 'items' | 'skills' | 'scenes' | 'scriptChunks' | 'worlds'
  >,
): BattleSpriteDefinitionReference[] {
  const references: BattleSpriteDefinitionReference[] = []
  source.actors.forEach((actor, index) => {
    const battleSprite = actor.battler?.battleSprite
    if (battleSprite)
      references.push({
        battleSprite,
        expectedProfile: 'player-fighter',
        where: `actors[${index}](${actor.id}).battler.battleSprite`,
        site: `actor:${actor.id}:battler`,
      })
  })
  source.enemies?.forEach((enemy, index) => {
    references.push({
      battleSprite: enemy.battleSprite,
      expectedProfile: 'enemy',
      where: `enemies[${index}](${enemy.id}).battleSprite`,
      site: `enemy:${enemy.id}:battleSprite`,
    })
    collectCommandBattleSpriteReferences(
      enemy.choreography,
      `enemies[${index}](${enemy.id}).choreography`,
      `enemy:${enemy.id}:choreography`,
      references,
    )
    collectCommandBattleSpriteReferences(
      enemy.onDefeated,
      `enemies[${index}](${enemy.id}).onDefeated`,
      `enemy:${enemy.id}:onDefeated`,
      references,
    )
  })
  source.items.forEach((item, itemIndex) => {
    item.equip?.effects.forEach((effect, effectIndex) => {
      if (effect.kind === 'battleSprite')
        for (const [actorId, battleSprite] of Object.entries(effect.byActor))
          references.push({
            battleSprite,
            expectedProfile: 'player-fighter',
            where: `items[${itemIndex}](${item.id}).equip.effects[${effectIndex}].byActor.${actorId}`,
            site: `item:${item.id}:equip:${actorId}`,
          })
    })
  })
  source.skills.forEach((skill, skillIndex) => {
    for (const layer of authoredSkillExecutionLayers(skill))
      (layer.effects ?? []).forEach((effect, effectIndex) => {
        const layerPath = layer.side === 'base' ? 'effects' : `execution.${layer.side}.effects`
        if (effect.kind === 'summon')
          references.push({
            battleSprite: effect.battleSprite,
            expectedProfile: 'summon',
            where: `skills[${skillIndex}](${skill.id}).${layerPath}[${effectIndex}].battleSprite`,
            site:
              layer.side === 'base'
                ? `skill:${skill.id}:effects`
                : `skill:${skill.id}:execution:${layer.side}:effects`,
          })
        if (effect.kind === 'trance')
          references.push({
            battleSprite: effect.battleSprite,
            expectedProfile: 'player-fighter',
            where: `skills[${skillIndex}](${skill.id}).${layerPath}[${effectIndex}].battleSprite`,
            site:
              layer.side === 'base'
                ? `skill:${skill.id}:effects`
                : `skill:${skill.id}:execution:${layer.side}:effects`,
          })
      })
  })
  source.scenes.forEach((scene, sceneIndex) => {
    collectCommandBattleSpriteReferences(
      scene,
      `scenes[${sceneIndex}]`,
      `scene:${scene.id}`,
      references,
    )
  })
  for (const [chunkId, chunk] of Object.entries(source.scriptChunks ?? {})) {
    for (const [scriptId, body] of Object.entries(chunk.scripts))
      collectCommandBattleSpriteReferences(
        body,
        `scriptChunks[${JSON.stringify(chunkId)}].scripts[${JSON.stringify(scriptId)}]`,
        `script:${chunkId}:${scriptId}`,
        references,
      )
  }
  source.worlds?.forEach((world, worldIndex) => {
    for (const collection of ['party', 'reserve'] as const) {
      ;(world[collection] ?? []).forEach((character, characterIndex) => {
        const battleSprite = character.appearance?.battleSprite
        if (battleSprite)
          references.push({
            battleSprite,
            expectedProfile: 'player-fighter',
            where: `worlds[${worldIndex}].${collection}[${characterIndex}].appearance.battleSprite`,
            site: `world:${worldIndex}:character:${character.id}:appearance`,
          })
      })
    }
  })
  return references
}

function collectCommandSpriteReferences(
  node: unknown,
  where: string,
  site: string,
  out: SpriteDefinitionReference[],
): void {
  if (Array.isArray(node)) {
    node.forEach((value, index) => {
      collectCommandSpriteReferences(value, `${where}[${index}]`, site, out)
    })
    return
  }
  if (!node || typeof node !== 'object') return
  const record = node as Record<string, unknown>
  if (record.kind === 'setActorSprite' && typeof record.sprite === 'string')
    out.push({ sprite: record.sprite, where: `${where}.sprite`, site })
  if (record.kind === 'setActorAppearance' && typeof record.spriteId === 'string')
    out.push({ sprite: record.spriteId, where: `${where}.spriteId`, site })
  if (record.kind === 'setFollowers' && Array.isArray(record.sprites)) {
    record.sprites.forEach((sprite, index) => {
      if (typeof sprite === 'string')
        out.push({ sprite, where: `${where}.sprites[${index}]`, site })
    })
  }
  if (record.kind === 'playEntityAction' && typeof record.sprite === 'string')
    out.push({ sprite: record.sprite, where: `${where}.sprite`, site })
  for (const [key, value] of Object.entries(record))
    collectCommandSpriteReferences(value, `${where}.${key}`, site, out)
}

function collectUnlocatedCommandSpriteActionReferences(
  node: unknown,
  where: string,
  site: string,
  out: SpriteActionReference[],
): void {
  if (Array.isArray(node)) {
    node.forEach((value, index) => {
      collectUnlocatedCommandSpriteActionReferences(value, `${where}[${index}]`, site, out)
    })
    return
  }
  if (!node || typeof node !== 'object') return
  const record = node as Record<string, unknown>
  if (
    record.kind === 'playEntityAction' &&
    typeof record.sprite === 'string' &&
    typeof record.action === 'string'
  )
    out.push({
      sprite: record.sprite,
      action: record.action,
      where: `${where}.action`,
      site,
    })
  for (const [key, value] of Object.entries(record))
    collectUnlocatedCommandSpriteActionReferences(value, `${where}.${key}`, site, out)
}

function commandArms(command: Command): Array<[string, readonly Command[] | undefined]> {
  switch (command.kind) {
    case 'branch':
      return [
        ['then', command.then],
        ['else', command.else],
      ]
    case 'confirm':
      return [['onNo', command.onNo]]
    case 'startBattle':
      return [
        ['onLose', command.onLose],
        ['onFlee', command.onFlee],
      ]
    case 'teleportOut':
      return [['onFail', command.onFail]]
    default:
      return []
  }
}

type ActionLocatorFactory = (path: string) => SpriteActionReferenceLocator

function inlineBindingStages(command: Command): readonly ScriptStage[] | undefined {
  switch (command.kind) {
    case 'setEntityAuto':
    case 'setEntityTrigger':
    case 'setSceneOnEnter':
    case 'setSceneOnTeleport':
      return command.stages
    default:
      return undefined
  }
}

function collectActionCommandBody(
  body: readonly Command[],
  where: string,
  pathPrefix: string,
  site: string,
  locator: ActionLocatorFactory,
  out: SpriteActionReference[],
): void {
  body.forEach((command, index) => {
    const path = `${pathPrefix}/${index}`
    const commandWhere = `${where}[${index}]`
    if (command.kind === 'playEntityAction')
      out.push({
        sprite: command.sprite,
        action: command.action,
        where: `${commandWhere}.action`,
        site,
        locator: locator(path),
      })
    const inlineStages = inlineBindingStages(command)
    if (inlineStages)
      collectUnlocatedCommandSpriteActionReferences(
        inlineStages,
        `${commandWhere}.stages`,
        site,
        out,
      )
    for (const [arm, nested] of commandArms(command)) {
      if (!nested?.length) continue
      collectActionCommandBody(
        nested,
        `${commandWhere}.${arm}`,
        `${path}/${arm}`,
        site,
        locator,
        out,
      )
    }
  })
}

function collectActionStages(
  stages: readonly ScriptStage[] | undefined,
  where: string,
  site: string,
  locator: ActionLocatorFactory,
  out: SpriteActionReference[],
): void {
  // Canonical pages bind a behavior id string instead of embedding `{ stages }`.
  // Those flows are scanned below from `behaviors`; the renderer projection path
  // must not treat a behavior id as an inline stage list.
  if (!Array.isArray(stages)) return
  stages.forEach((stage, stageIndex) => {
    if (stage.entry?.prepare.length)
      collectActionCommandBody(
        stage.entry.prepare,
        `${where}[${stageIndex}].entry.prepare`,
        `${stageIndex}/entry/prepare`,
        site,
        locator,
        out,
      )
    collectActionCommandBody(
      stage.body,
      `${where}[${stageIndex}].body`,
      `${stageIndex}`,
      site,
      locator,
      out,
    )
  })
}

/** 收集场景页默认绑定和全部嵌套脚本中的 `(sprite, action)` 复合引用。 */
export function collectSpriteActionReferences(
  source: Pick<
    ContentBundle,
    'scenes' | 'scriptChunks' | 'scriptIndex' | 'sharedScripts' | 'enemies' | 'worlds'
  >,
): SpriteActionReference[] {
  const references: SpriteActionReference[] = []
  source.scenes.forEach((scene, sceneIndex) => {
    scene.entities.forEach((entity, entityIndex) => {
      entity.pages?.forEach((page, pageIndex) => {
        if (page.animation)
          references.push({
            sprite: page.animation.sprite,
            action: page.animation.action,
            where: `scenes[${sceneIndex}].entities[${entityIndex}].pages[${pageIndex}].animation.action`,
            site: `scene:${scene.id}:entity:${entity.id}:page:${pageIndex}`,
            locator: {
              kind: 'page-animation',
              sceneId: scene.id,
              entityId: entity.id,
              pageIndex,
            },
          })
        if (page.trigger)
          collectActionStages(
            page.trigger.stages,
            `scenes[${sceneIndex}].entities[${entityIndex}].pages[${pageIndex}].trigger.stages`,
            `scene:${scene.id}:entity:${entity.id}:page:${pageIndex}:trigger`,
            (path) => ({
              kind: 'scene-command',
              sceneId: scene.id,
              sourceKey: `${entity.id}:trigger`,
              entityId: entity.id,
              pageIndex,
              path,
            }),
            references,
          )
        if (page.auto)
          collectActionStages(
            page.auto.stages,
            `scenes[${sceneIndex}].entities[${entityIndex}].pages[${pageIndex}].auto.stages`,
            `scene:${scene.id}:entity:${entity.id}:page:${pageIndex}:auto`,
            (path) => ({
              kind: 'scene-command',
              sceneId: scene.id,
              sourceKey: `${entity.id}:auto`,
              entityId: entity.id,
              pageIndex,
              path,
            }),
            references,
          )
      })
      const canonicalBehaviors = (entity as unknown as { behaviors?: unknown }).behaviors
      if (canonicalBehaviors)
        collectUnlocatedCommandSpriteActionReferences(
          canonicalBehaviors,
          `scenes[${sceneIndex}].entities[${entityIndex}].behaviors`,
          `scene:${scene.id}:entity:${entity.id}:behaviors`,
          references,
        )
    })
    if (scene.onEnter)
      collectActionStages(
        scene.onEnter,
        `scenes[${sceneIndex}].onEnter`,
        `scene:${scene.id}:onEnter`,
        (path) => ({
          kind: 'scene-command',
          sceneId: scene.id,
          sourceKey: '__onEnter__',
          path,
        }),
        references,
      )
    if (scene.onTeleport)
      collectActionStages(
        scene.onTeleport,
        `scenes[${sceneIndex}].onTeleport`,
        `scene:${scene.id}:onTeleport`,
        (path) => ({
          kind: 'scene-command',
          sceneId: scene.id,
          sourceKey: '__onTeleport__',
          path,
        }),
        references,
      )
    const canonicalHooks = (scene as unknown as { hooks?: unknown }).hooks
    if (canonicalHooks)
      collectUnlocatedCommandSpriteActionReferences(
        canonicalHooks,
        `scenes[${sceneIndex}].hooks`,
        `scene:${scene.id}:hooks`,
        references,
      )
  })
  for (const [scriptId, script] of Object.entries(source.sharedScripts ?? {}))
    collectUnlocatedCommandSpriteActionReferences(
      script.body,
      `sharedScripts[${JSON.stringify(scriptId)}].body`,
      `sharedScript:${scriptId}`,
      references,
    )
  for (const [chunkId, chunk] of Object.entries(source.scriptChunks ?? {}))
    for (const [scriptId, body] of Object.entries(chunk.scripts)) {
      const where = `scriptChunks[${JSON.stringify(chunkId)}].scripts[${JSON.stringify(scriptId)}]`
      const site = `script:${chunkId}:${scriptId}`
      if (scriptId.startsWith('scene/') || source.scriptIndex?.library?.[scriptId])
        collectActionCommandBody(
          body,
          where,
          '0',
          site,
          (path) => ({ kind: 'script-command', scriptId, path }),
          references,
        )
      else collectUnlocatedCommandSpriteActionReferences(body, where, site, references)
    }
  source.enemies?.forEach((enemy, index) => {
    collectUnlocatedCommandSpriteActionReferences(
      enemy.choreography,
      `enemies[${index}](${enemy.id}).choreography`,
      `enemy:${enemy.id}:choreography`,
      references,
    )
    collectUnlocatedCommandSpriteActionReferences(
      enemy.onDefeated,
      `enemies[${index}](${enemy.id}).onDefeated`,
      `enemy:${enemy.id}:onDefeated`,
      references,
    )
  })
  return references
}

/** 递归收集 Actor/Entity/appearance/followers 与所有 inline/chunk 命令中的 SpriteDef.id 边。 */
export function collectSpriteDefinitionReferences(
  source: Pick<ContentBundle, 'actors' | 'scenes' | 'scriptChunks' | 'enemies' | 'worlds'>,
): SpriteDefinitionReference[] {
  const references: SpriteDefinitionReference[] = []
  source.actors.forEach((actor, index) => {
    references.push({
      sprite: actor.spriteId,
      where: `actors[${index}](${actor.id}).spriteId`,
      site: `actor:${actor.id}`,
    })
  })
  source.scenes.forEach((scene, sceneIndex) => {
    scene.entities.forEach((entity, entityIndex) => {
      if (!isActorEntity(entity) && 'sprite' in entity)
        references.push({
          sprite: entity.sprite,
          where: `scenes[${sceneIndex}].entities[${entityIndex}].sprite`,
          site: `scene:${scene.id}:entity:${entity.id}`,
        })
      entity.pages?.forEach((page, pageIndex) => {
        if (!page.animation) return
        references.push({
          sprite: page.animation.sprite,
          where: `scenes[${sceneIndex}].entities[${entityIndex}].pages[${pageIndex}].animation.sprite`,
          site: `scene:${scene.id}:entity:${entity.id}:page:${pageIndex}:animation`,
        })
      })
    })
    collectCommandSpriteReferences(scene, `scenes[${sceneIndex}]`, `scene:${scene.id}`, references)
  })
  for (const [chunkId, chunk] of Object.entries(source.scriptChunks ?? {})) {
    for (const [scriptId, body] of Object.entries(chunk.scripts))
      collectCommandSpriteReferences(
        body,
        `scriptChunks[${JSON.stringify(chunkId)}].scripts[${JSON.stringify(scriptId)}]`,
        `script:${chunkId}:${scriptId}`,
        references,
      )
  }
  source.enemies?.forEach((enemy, index) => {
    collectCommandSpriteReferences(
      enemy.choreography,
      `enemies[${index}](${enemy.id}).choreography`,
      `enemy:${enemy.id}:choreography`,
      references,
    )
    collectCommandSpriteReferences(
      enemy.onDefeated,
      `enemies[${index}](${enemy.id}).onDefeated`,
      `enemy:${enemy.id}:onDefeated`,
      references,
    )
  })
  source.worlds?.forEach((world, worldIndex) => {
    for (const collection of ['party', 'reserve'] as const) {
      ;(world[collection] ?? []).forEach((character, characterIndex) => {
        const sprite = character.appearance?.spriteId
        if (sprite)
          references.push({
            sprite,
            where: `worlds[${worldIndex}].${collection}[${characterIndex}].appearance.spriteId`,
            site: `world:${worldIndex}:character:${character.id}:appearance`,
          })
      })
    }
    world.script?.followers?.forEach((sprite, index) => {
      references.push({
        sprite,
        where: `worlds[${worldIndex}].script.followers[${index}]`,
        site: `world:${worldIndex}:followers`,
      })
    })
  })
  return references
}

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
  const actorIds = new Set(actors.map((actor) => actor.id))
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
      if (!actorIds.has(actorId))
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
    if (record.kind === 'applyActorCondition' || record.kind === 'clearActorCondition') {
      const condition = record.condition
      if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
        const typedCondition = condition as Record<string, unknown>
        if (typedCondition.kind === 'poison' && typeof typedCondition.poisonId === 'number')
          references.push({
            poisonId: typedCondition.poisonId,
            where: `${path}.condition.poisonId`,
          })
      }
    }
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
  const skillIds = new Set(b.skills.map((s) => s.id))
  const skillsById = new Map(b.skills.map((skill) => [skill.id, skill]))
  const itemIds = new Set(b.items.map((i) => i.id))
  const actorIds = new Set(b.actors.map((a) => a.id))
  const actorsById = Object.fromEntries(b.actors.map((a) => [a.id, a]))
  const enemyIds = new Set((b.enemies ?? []).map((e) => e.id))
  const scenesById = new Map(b.scenes.map((scene) => [scene.id, scene]))
  const spriteIds = new Set(b.sprites.map((s) => s.id))
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
    const actor = actorsById[actorId]
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
        if (!actorIds.has(condition.actorId))
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
        if (!actorIds.has(e.actor))
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
        if (scene && !scene.entries?.[target.entryId])
          addTargetIssue(
            'error',
            reference.where,
            `命名落点 "${target.sceneId}/${target.entryId}" 不在 scenes`,
          )
        return
      }
      if (target.kind === 'scene-hook') {
        const scene = scenesById.get(target.sceneId) as AuthorSceneDef | undefined
        if (scene && !scene.hooks?.[target.slot]?.variants[target.hookId])
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
      if (target.id !== 'day' && !ambienceIds.has(target.id))
        addTargetIssue('warn', reference.where, `氛围 "${target.id}" 不在 ambiences`)
    })

    // ── enemies / enemyTeams(M4c-3)────────────────────────
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
        !skillIds.has(battler.cooperativeMagicSkillId)
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
    if (!spriteIds.has(reference.sprite))
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
    if (reference.site.startsWith('item:')) continue
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
        if (!actorIds.has(cid))
          issues.push({
            severity: 'warn',
            where: `${where}.equip.equipableBy[${ei}]`,
            message: `可装备角色 "${cid}" 不在 actors`,
          })
      })
      // effects.grantSkill.skillId → skills(缺 = warn)
      equip.effects.forEach((eff, ei) => {
        if (eff.kind === 'grantSkill' && !skillIds.has(eff.skillId))
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
          const chunk = b.scriptChunks?.[effect.script.chunk]
          if (!chunk?.scripts[effect.script.id])
            issues.push({
              severity: 'error',
              where: `${effectWhere}.script`,
              message: `共享脚本 "${effect.script.id}" 不在脚本库`,
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
  })

  // ── levelUp ─────────────────────────────────────────────
  for (const [cid, list] of Object.entries(b.levelUp)) {
    if (!actorIds.has(cid))
      issues.push({
        severity: ACTOR_REFERENCE_POLICIES['level-up-owner'].danglingSeverity,
        where: `levelUp[${cid}]`,
        message: `升级习得伴随表角色 "${cid}" 不在 actors`,
      })
    list.forEach((lu, li) => {
      if (!skillIds.has(lu.skillId))
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
    const actor = actorsById[reference.actorId]
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
