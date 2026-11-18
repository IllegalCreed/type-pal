import { isActorEntity } from './actor.js'
import type {
  ActorDef,
  AuthorItemCore,
  AuthorItemData,
  BattleSpriteDef,
  BattleSpriteProfileKind,
  Command,
  ItemData,
  ScriptStage,
} from './index.js'
import { authoredSkillExecutionLayers } from './skill.js'
import type { ContentBundle, Issue } from './validate-refs.js'

/** 一条 SpriteDef 语义引用；删除保护、保存门和引用面板共用。 */
export interface SpriteDefinitionReference {
  sprite: string
  where: string
  site: string
}

/** 一条限定到 SpriteDef 内稳定 ActionId 的复合引用。 */
export interface SpriteActionReference extends SpriteDefinitionReference {
  action: string
}

/** 一条 BattleSpriteDef 语义引用；expectedProfile 同时阻止 player/enemy 同号串线。 */
export interface BattleSpriteDefinitionReference {
  battleSprite: string
  expectedProfile: BattleSpriteProfileKind
  where: string
  site: string
  /** 装备边由更强的角色/equipableBy/profile 联合校验器负责，必须结构化区分。 */
  origin?: 'equip'
}

export type CommandSpriteTaggedReference =
  | { kind: 'world-sprite'; sprite: string; where: string }
  | {
      kind: 'world-sprite-action'
      sprite: string
      action: string
      where: string
      spriteWhere: string
    }
  | {
      kind: 'battle-sprite'
      battleSprite: string
      expectedProfile: 'player-fighter'
      where: string
    }

/** Inspect one tagged command node only; canonical callers own nested command traversal. */
export function commandSpriteTaggedReferencesAtNode(
  value: unknown,
  where: string,
): CommandSpriteTaggedReference[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  const record = value as Record<string, unknown>
  const references: CommandSpriteTaggedReference[] = []
  if (record.kind === 'setActorSprite' && typeof record.sprite === 'string')
    references.push({ kind: 'world-sprite', sprite: record.sprite, where: `${where}.sprite` })
  if (record.kind === 'setActorAppearance') {
    if (typeof record.spriteId === 'string')
      references.push({
        kind: 'world-sprite',
        sprite: record.spriteId,
        where: `${where}.spriteId`,
      })
    if (typeof record.battleSprite === 'string')
      references.push({
        kind: 'battle-sprite',
        battleSprite: record.battleSprite,
        expectedProfile: 'player-fighter',
        where: `${where}.battleSprite`,
      })
  }
  if (record.kind === 'setFollowers' && Array.isArray(record.sprites))
    record.sprites.forEach((sprite, index) => {
      if (typeof sprite === 'string')
        references.push({
          kind: 'world-sprite',
          sprite,
          where: `${where}.sprites[${index}]`,
        })
    })
  if (
    record.kind === 'playEntityAction' &&
    typeof record.sprite === 'string' &&
    typeof record.action === 'string'
  )
    references.push({
      kind: 'world-sprite-action',
      sprite: record.sprite,
      action: record.action,
      where: `${where}.action`,
      spriteWhere: `${where}.sprite`,
    })
  return references
}

/** Legacy/enemy/runtime command tree walker; canonical author scripts use one-node visits instead. */
export function collectCommandSpriteTaggedReferences(
  value: unknown,
  where: string,
): CommandSpriteTaggedReference[] {
  const references: CommandSpriteTaggedReference[] = []
  const visit = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((entry, index) => {
        visit(entry, `${path}[${index}]`)
      })
      return
    }
    if (!node || typeof node !== 'object') return
    references.push(...commandSpriteTaggedReferencesAtNode(node, path))
    for (const [key, child] of Object.entries(node as Record<string, unknown>))
      visit(child, `${path}.${key}`)
  }
  visit(value, where)
  return references
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

export function collectCommandBattleSpriteReferences(
  node: unknown,
  where: string,
  site: string,
  out: BattleSpriteDefinitionReference[],
): void {
  for (const reference of collectCommandSpriteTaggedReferences(node, where))
    if (reference.kind === 'battle-sprite')
      out.push({
        battleSprite: reference.battleSprite,
        expectedProfile: reference.expectedProfile,
        where: reference.where,
        site,
      })
}

/**
 * 递归收集 Actor/Enemy/Equip/Skill/Script/World 对 BattleSpriteDef.id 的全部持久边。
 * battle transient 不落 content；运行时 readiness 以同一 reference 形状追加后再解析。
 */
/** Sprite collectors also inspect migration's transient ItemData before author assembly;
 * unlike validateReferences they never classify item script identities. */
type SpriteReferenceBundle = Omit<ContentBundle, 'items'> & {
  items: (ItemData | AuthorItemCore | AuthorItemData)[]
}

export function collectBattleSpriteDefinitionReferences(
  source: Pick<
    SpriteReferenceBundle,
    | 'actors'
    | 'enemies'
    | 'items'
    | 'skills'
    | 'scenes'
    | 'scriptChunks'
    | 'sharedScripts'
    | 'worlds'
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
            origin: 'equip',
          })
    })
    collectCommandBattleSpriteReferences(
      item,
      `items[${itemIndex}](${item.id})`,
      `item:${item.id}`,
      references,
    )
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
  for (const [scriptId, script] of Object.entries(source.sharedScripts ?? {}))
    collectCommandBattleSpriteReferences(
      script.body,
      `sharedScripts[${JSON.stringify(scriptId)}].body`,
      `sharedScript:${scriptId}`,
      references,
    )
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

export function collectCommandSpriteReferences(
  node: unknown,
  where: string,
  site: string,
  out: SpriteDefinitionReference[],
): void {
  for (const reference of collectCommandSpriteTaggedReferences(node, where)) {
    if (reference.kind === 'world-sprite')
      out.push({ sprite: reference.sprite, where: reference.where, site })
    if (reference.kind === 'world-sprite-action')
      out.push({ sprite: reference.sprite, where: reference.spriteWhere, site })
  }
}

export function collectUnlocatedCommandSpriteActionReferences(
  node: unknown,
  where: string,
  site: string,
  out: SpriteActionReference[],
): void {
  for (const reference of collectCommandSpriteTaggedReferences(node, where))
    if (reference.kind === 'world-sprite-action')
      out.push({
        sprite: reference.sprite,
        action: reference.action,
        where: reference.where,
        site,
      })
}

function commandArms(command: Command): Array<[string, readonly Command[] | undefined]> {
  switch (command.kind) {
    case 'branch':
      return [
        ['then', command.then],
        ['else', command.else],
      ]
    case 'confirm':
      return [
        ['onYes', command.onYes],
        ['onNo', command.onNo],
      ]
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
  site: string,
  out: SpriteActionReference[],
): void {
  body.forEach((command, index) => {
    const commandWhere = `${where}[${index}]`
    for (const reference of commandSpriteTaggedReferencesAtNode(command, commandWhere))
      if (reference.kind === 'world-sprite-action')
        out.push({
          sprite: reference.sprite,
          action: reference.action,
          where: reference.where,
          site,
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
      collectActionCommandBody(nested, `${commandWhere}.${arm}`, site, out)
    }
  })
}

function collectActionStages(
  stages: readonly ScriptStage[] | undefined,
  where: string,
  site: string,
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
        site,
        out,
      )
    collectActionCommandBody(stage.body, `${where}[${stageIndex}].body`, site, out)
  })
}

/** 收集场景页默认绑定和全部嵌套脚本中的 `(sprite, action)` 复合引用。 */
export function collectSpriteActionReferences(
  source: Pick<
    SpriteReferenceBundle,
    'scenes' | 'items' | 'scriptChunks' | 'scriptIndex' | 'sharedScripts' | 'enemies' | 'worlds'
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
          })
        if (page.trigger)
          collectActionStages(
            page.trigger.stages,
            `scenes[${sceneIndex}].entities[${entityIndex}].pages[${pageIndex}].trigger.stages`,
            `scene:${scene.id}:entity:${entity.id}:page:${pageIndex}:trigger`,
            references,
          )
        if (page.auto)
          collectActionStages(
            page.auto.stages,
            `scenes[${sceneIndex}].entities[${entityIndex}].pages[${pageIndex}].auto.stages`,
            `scene:${scene.id}:entity:${entity.id}:page:${pageIndex}:auto`,
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
        references,
      )
    if (scene.onTeleport)
      collectActionStages(
        scene.onTeleport,
        `scenes[${sceneIndex}].onTeleport`,
        `scene:${scene.id}:onTeleport`,
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
  source.items.forEach((item, index) => {
    collectUnlocatedCommandSpriteActionReferences(
      item,
      `items[${index}](${item.id})`,
      `item:${item.id}`,
      references,
    )
  })
  for (const [chunkId, chunk] of Object.entries(source.scriptChunks ?? {}))
    for (const [scriptId, body] of Object.entries(chunk.scripts)) {
      const where = `scriptChunks[${JSON.stringify(chunkId)}].scripts[${JSON.stringify(scriptId)}]`
      const site = `script:${chunkId}:${scriptId}`
      collectActionCommandBody(body, where, site, references)
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
  source: Pick<
    SpriteReferenceBundle,
    'actors' | 'scenes' | 'items' | 'scriptChunks' | 'sharedScripts' | 'enemies' | 'worlds'
  >,
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
  source.items.forEach((item, itemIndex) => {
    collectCommandSpriteReferences(
      item,
      `items[${itemIndex}](${item.id})`,
      `item:${item.id}`,
      references,
    )
  })
  for (const [scriptId, script] of Object.entries(source.sharedScripts ?? {}))
    collectCommandSpriteReferences(
      script.body,
      `sharedScripts[${JSON.stringify(scriptId)}].body`,
      `sharedScript:${scriptId}`,
      references,
    )
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
