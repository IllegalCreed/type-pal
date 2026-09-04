import {
  ACTOR_REFERENCE_POLICIES,
  type ActorReferenceKind,
  collectActorTaggedReferences,
  collectDialoguePortraitReferences,
  collectWorldActorReferences,
  type DialoguePortraitReference,
  type StartWorld,
} from '@type-pal/content'
import type { EditorState } from './edit-session.js'

export type ActorReferenceLocator =
  | { kind: 'scene-entity'; sceneId: string; entityId: string }
  | { kind: 'scene'; sceneId: string }
  | { kind: 'shared-script'; scriptId: string }
  | { kind: 'entry-point'; entryPointId?: string }
  | { kind: 'actor'; actorId: string }
  | { kind: 'item'; itemId: string }
  | { kind: 'enemy'; enemyId: string }

export interface ActorReference {
  actorId: string
  kind: ActorReferenceKind
  label: string
  where: string
  detail: string
  locator?: ActorReferenceLocator
  unavailableReason?: string
  /** 引用属于被删 Actor 本身时，会与 owner 一起删除，不形成自删除死锁。 */
  ownerActorId?: string
}

interface ScanContext {
  label: string
  locator?: ActorReferenceLocator
  unavailableReason?: string
}

function add(
  out: ActorReference[],
  actorId: unknown,
  kind: ActorReferenceKind,
  where: string,
  context: ScanContext,
  detail?: string,
  ownerActorId?: string,
): void {
  if (typeof actorId !== 'string' || actorId.length === 0) return
  out.push({
    actorId,
    kind,
    label: context.label,
    where,
    detail: detail ?? ACTOR_REFERENCE_POLICIES[kind].label,
    locator: context.locator,
    unavailableReason: context.unavailableReason,
    ownerActorId,
  })
}

/**
 * 递归扫描 command / condition / enemy choreography。只识别明确 kind，绝不把普通
 * `{ actor: string }` 猜成命令；场景实体的 actor 边由独立 typed 分支收集。
 */
function scanActorTaggedNodes(
  value: unknown,
  where: string,
  context: ScanContext,
  out: ActorReference[],
): void {
  for (const reference of collectActorTaggedReferences(value, where))
    add(out, reference.actorId, reference.kind, reference.where, context)
}

function scanStartWorld(
  world: StartWorld,
  prefix: string,
  context: ScanContext,
  out: ActorReference[],
): void {
  world.party.forEach((actorId, index) => {
    add(out, actorId, 'entry-point-party', `${prefix}.party[${index}]`, context)
  })
  for (const actorId of Object.keys(world.seedStats ?? {}))
    add(out, actorId, 'entry-point-seed-stats', `${prefix}.seedStats.${actorId}`, context)
  for (const actorId of Object.keys(world.seedConditions ?? {}))
    add(out, actorId, 'entry-point-seed-condition', `${prefix}.seedConditions.${actorId}`, context)
}

/** 作者外部位置 + levelUp 伴随表 + 可选运行态位置的唯一编辑器 collector。 */
export function collectActorReferences(
  state: EditorState,
  options: { includeScriptCommands?: boolean } = {},
): ActorReference[] {
  const out: ActorReference[] = []
  const includeScriptCommands = options.includeScriptCommands !== false

  ;(state.scenes ?? []).forEach((scene, sceneIndex) => {
    const sceneWhere = `scenes[${sceneIndex}](${scene.id})`
    scene.entities.forEach((entity, entityIndex) => {
      if ('actor' in entity)
        add(
          out,
          entity.actor,
          'scene-entity-actor',
          `${sceneWhere}.entities[${entityIndex}](${entity.id}).actor`,
          {
            label: `场景 ${scene.id} / 实体 ${entity.id}`,
            locator: { kind: 'scene-entity', sceneId: scene.id, entityId: entity.id },
          },
          '人物预制实例',
        )
    })
    if (includeScriptCommands)
      scanActorTaggedNodes(
        scene,
        sceneWhere,
        { label: `场景 ${scene.id}`, locator: { kind: 'scene', sceneId: scene.id } },
        out,
      )
  })

  ;(state.manifest.entryPoints ?? []).forEach((entry, entryIndex) => {
    scanStartWorld(
      entry.startWorld,
      `manifest.entryPoints[${entryIndex}](${entry.id}).startWorld`,
      { label: `入口 ${entry.label}`, locator: { kind: 'entry-point', entryPointId: entry.id } },
      out,
    )
  })

  ;(state.actors ?? []).forEach((actor, actorIndex) => {
    if (actor.battler?.coveredBy)
      add(
        out,
        actor.battler.coveredBy,
        'actor-covered-by',
        `actors[${actorIndex}](${actor.id}).battler.coveredBy`,
        { label: `人物 ${actor.id}`, locator: { kind: 'actor', actorId: actor.id } },
        '援护者',
        actor.id,
      )
  })

  ;(state.items ?? []).forEach((item, itemIndex) => {
    const context: ScanContext = {
      label: `物品 ${item.name}`,
      locator: { kind: 'item', itemId: item.id },
    }
    item.equip?.equipableBy.forEach((actorId, actorIndex) => {
      add(
        out,
        actorId,
        'item-equipable-by',
        `items[${itemIndex}](${item.id}).equip.equipableBy[${actorIndex}]`,
        context,
      )
    })
    item.equip?.effects.forEach((effect, effectIndex) => {
      if (effect.kind !== 'battleSprite') return
      for (const actorId of Object.keys(effect.byActor))
        add(
          out,
          actorId,
          'item-battle-sprite-by-actor',
          `items[${itemIndex}](${item.id}).equip.effects[${effectIndex}].byActor.${actorId}`,
          context,
        )
    })
    if (includeScriptCommands)
      scanActorTaggedNodes(item, `items[${itemIndex}](${item.id})`, context, out)
  })

  if (includeScriptCommands) {
    for (const [chunkId, chunk] of Object.entries(state.scriptChunks ?? {}))
      for (const [scriptId, body] of Object.entries(chunk.scripts))
        scanActorTaggedNodes(
          body,
          `scriptChunks[${JSON.stringify(chunkId)}].scripts[${JSON.stringify(scriptId)}]`,
          { label: `脚本 ${scriptId}`, locator: { kind: 'shared-script', scriptId } },
          out,
        )

    if (state.sharedScripts)
      for (const [scriptId, script] of Object.entries(state.sharedScripts))
        scanActorTaggedNodes(
          script.body,
          `sharedScripts.${scriptId}.body`,
          { label: `共享脚本 ${script.name}`, locator: { kind: 'shared-script', scriptId } },
          out,
        )
  }

  ;(state.enemies ?? []).forEach((enemy, enemyIndex) => {
    scanActorTaggedNodes(
      enemy,
      `enemies[${enemyIndex}](${enemy.id})`,
      { label: `敌人 ${enemy.id}`, locator: { kind: 'enemy', enemyId: enemy.id } },
      out,
    )
  })

  for (const actorId of Object.keys(state.levelUp ?? {}))
    add(
      out,
      actorId,
      'level-up-owner',
      `levelUp.${actorId}`,
      { label: `人物 ${actorId} 的升级习得` },
      '随人物复制/删除的伴随数据',
      actorId,
    )

  for (const reference of collectWorldActorReferences(state.worlds ?? []))
    add(out, reference.actorId, reference.kind, reference.where, {
      label: '运行态/存档',
      unavailableReason: '运行态存档只读，没有作者对象可供跳转。',
    })

  return out
}

export function actorReferenceBlocksDeletion(reference: ActorReference): boolean {
  const ownership = ACTOR_REFERENCE_POLICIES[reference.kind].ownership
  return ownership !== 'companion' && reference.ownerActorId !== reference.actorId
}

export interface EditorDialoguePortraitReference extends DialoguePortraitReference {
  label: string
  locator?: ActorReferenceLocator
}

/** scene/item/shared/enemy 四个当前 command surface 的人物立绘引用。 */
export function collectEditorDialoguePortraitReferences(
  state: EditorState,
): EditorDialoguePortraitReference[] {
  const out: EditorDialoguePortraitReference[] = []
  const append = (
    value: unknown,
    where: string,
    label: string,
    locator?: ActorReferenceLocator,
  ): void => {
    for (const reference of collectDialoguePortraitReferences(value, where))
      out.push({ ...reference, label, locator })
  }
  state.scenes.forEach((scene, index) => {
    append(scene, `scenes[${index}](${scene.id})`, `场景 ${scene.id}`, {
      kind: 'scene',
      sceneId: scene.id,
    })
  })
  state.items.forEach((item, index) => {
    append(item, `items[${index}](${item.id})`, `物品 ${item.name}`, {
      kind: 'item',
      itemId: item.id,
    })
  })
  if (state.sharedScripts)
    for (const [scriptId, script] of Object.entries(state.sharedScripts))
      append(script, `sharedScripts.${scriptId}`, `共享脚本 ${script.name}`, {
        kind: 'shared-script',
        scriptId,
      })
  for (const [chunkId, chunk] of Object.entries(state.scriptChunks ?? {}))
    for (const [scriptId, body] of Object.entries(chunk.scripts))
      append(
        body,
        `scriptChunks[${JSON.stringify(chunkId)}].scripts[${JSON.stringify(scriptId)}]`,
        `脚本 ${scriptId}`,
        { kind: 'shared-script', scriptId },
      )
  ;(state.enemies ?? []).forEach((enemy, index) => {
    append(enemy, `enemies[${index}](${enemy.id})`, `敌人 ${enemy.id}`, {
      kind: 'enemy',
      enemyId: enemy.id,
    })
  })
  return out
}
