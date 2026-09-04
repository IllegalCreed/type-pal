import {
  ACTOR_REFERENCE_POLICIES,
  type AssetReferenceOrigin,
  actorConditionPoisonReferenceAtNode,
  authoredSkillExecutionLayers,
  type CommandSpriteTaggedReference,
  type CommandTargetReference,
  collectActorConditionPoisonReferences,
  collectActorTaggedReferences,
  collectCanonicalActorTaggedReferences,
  collectCanonicalCommandAssetTaggedReferences,
  collectCanonicalCommandTargetReferences,
  collectCommandSpriteTaggedReferences,
  collectCommandTargetReferences,
  collectWorldBattleDataReferences,
  commandSpriteTaggedReferencesAtNode,
  DEFAULT_BATTLE_FIELD_ID,
  isActorEntity,
  type LocatedAssetReference,
} from '@type-pal/content'
import { type ActorReference, collectActorReferences } from './actor-references.js'
import { type BattleDataReference, collectBattleDataReferences } from './battle-data-references.js'
import type { EditorState } from './edit-session.js'
import { collectEditorAssetReferences } from './editor-asset-references.js'
import {
  collectEntityAddressReferences,
  type EntityAddressReference,
  type EntityAddressReferenceLocator,
} from './entity-address-references.js'
import {
  collectCanonicalItemTaggedReferences,
  collectCanonicalItemTransitionTaggedReferences,
  collectItemReferences,
  collectLegacyItemReferences,
  type ItemReference,
} from './item-references.js'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceIndex,
  createProjectReferenceSource,
  defaultProjectReferenceSourceLabel,
  type ProjectReferenceEdgeInput,
  type ProjectReferenceIndex,
  type ProjectReferenceLocator,
  type ProjectReferenceSnapshotV1,
  type ProjectReferenceSource,
  type ProjectReferenceTarget,
} from './project-reference.js'
import type {
  CanonicalSchemeReferenceIndexes,
  CanonicalScriptCommandVisit,
  CanonicalScriptTransitionVisit,
  CanonicalSharedScriptReferenceEntry,
  ScriptCommandOwner,
  ScriptEditorState,
} from './script-editor.js'
import {
  buildCanonicalSchemeReferenceIndexesFromVisits,
  collectCanonicalScriptCommandVisits,
  collectCanonicalScriptTransitionVisits,
  collectCanonicalSharedScriptReferencesFromVisits,
} from './script-editor.js'
import {
  projectCurrentAuthorReferenceSlices,
  scriptEditorStateFromCurrentAuthorSlices,
} from './script-editor-projection.js'
import {
  collectWorldVariableReferencesV1FromVisits,
  type WorldVariableReferenceIndexV1,
  worldVariableScriptStateFromEditorStateV1,
} from './world-variable-references.js'

function scriptOwnerDeletedWith(owner: ScriptCommandOwner): ProjectReferenceTarget[] {
  switch (owner.kind) {
    case 'entity-behavior':
      return [
        {
          kind: 'entity-behavior',
          sceneId: owner.sceneId,
          entityId: owner.entityId,
          channel: owner.channel,
          behaviorId: owner.behaviorId,
        },
        { kind: 'entity', sceneId: owner.sceneId, entityId: owner.entityId },
        { kind: 'scene', id: owner.sceneId },
      ]
    case 'entity-hostile-on-lose':
      return [
        { kind: 'entity', sceneId: owner.sceneId, entityId: owner.entityId },
        { kind: 'scene', id: owner.sceneId },
      ]
    case 'scene-hook':
      return [
        {
          kind: 'scene-hook',
          sceneId: owner.sceneId,
          slot: owner.slot,
          hookId: owner.hookId,
        },
        { kind: 'scene', id: owner.sceneId },
      ]
    case 'item-private-script':
      return [{ kind: 'item', id: owner.itemId }]
    case 'shared-script':
      return [{ kind: 'shared-script', id: owner.scriptId }]
  }
}

function sourceForScriptOwner(
  owner: ScriptCommandOwner,
  _scriptState?: ScriptEditorState,
): ProjectReferenceSource {
  const sourceOwner = { kind: 'script-owner', owner } as const
  return createProjectReferenceSource(
    sourceOwner,
    defaultProjectReferenceSourceLabel(sourceOwner),
    { deletedWith: scriptOwnerDeletedWith(owner) },
  )
}

function runtimeWorldSource(): ProjectReferenceSource {
  return createProjectReferenceSource({ kind: 'runtime-world' }, '运行态/存档')
}

function legacyScriptChunkSource(chunkId: string, scriptId: string): ProjectReferenceSource {
  return createProjectReferenceSource(
    { kind: 'script-chunk', chunkId, scriptId },
    `只读脚本 ${scriptId}（${chunkId}）`,
  )
}

function normalizeCommandTarget(target: CommandTargetReference['target']): ProjectReferenceTarget {
  switch (target.kind) {
    case 'scene':
    case 'map':
    case 'enemy-team':
    case 'ambience':
    case 'skill':
      return target
    case 'shop':
    case 'battle-field':
      return { kind: target.kind, id: String(target.id) }
    case 'scene-entry':
    case 'scene-hook':
    case 'entity':
      return target
  }
}

/** A loadScene with entryId is one composite edge; its parent scene query reuses the same edge id. */
function withoutRedundantLoadSceneParent(
  references: readonly CommandTargetReference[],
): CommandTargetReference[] {
  const entryScenes = new Set(
    references.flatMap((reference) =>
      reference.target.kind === 'scene-entry' ? [reference.target.sceneId] : [],
    ),
  )
  const hookScenes = new Set(
    references.flatMap((reference) =>
      reference.target.kind === 'scene-hook' ? [reference.target.sceneId] : [],
    ),
  )
  return references.filter(
    (reference) =>
      !(
        reference.target.kind === 'scene' &&
        reference.relation === 'load-scene' &&
        entryScenes.has(reference.target.id)
      ) &&
      !(
        reference.target.kind === 'scene' &&
        reference.relation === 'select-scene-hooks' &&
        hookScenes.has(reference.target.id)
      ),
  )
}

function commandReferenceEdge(
  reference: CommandTargetReference,
  source: ProjectReferenceSource,
  locator: ProjectReferenceLocator,
): ProjectReferenceEdgeInput {
  const target = normalizeCommandTarget(reference.target)
  const relation =
    reference.target.kind === 'entity'
      ? ({ kind: 'entity-address' } as const)
      : reference.target.kind === 'battle-field'
        ? ({ kind: 'battle-field-use', use: 'start-battle' } as const)
        : reference.target.kind === 'enemy-team'
          ? ({ kind: 'enemy-team-use', use: 'start-battle' } as const)
          : reference.target.kind === 'ambience'
            ? ({
                kind: 'ambience-use',
                use:
                  reference.relation === 'toggle-day-night' ? 'toggle-day-night' : 'set-ambience',
              } as const)
            : reference.target.kind === 'skill'
              ? ({
                  kind: 'battle-data-use',
                  target: 'skill',
                  use: 'command-learn-skill',
                } as const)
              : ({ kind: 'command-target', use: reference.relation } as const)
  return {
    target,
    source,
    relation,
    where: reference.where,
    locator,
    deletePolicy: locator.kind === 'unavailable' ? 'block' : 'replace-suggest',
  }
}

export function canonicalCommandTargetEdges(
  visits: readonly CanonicalScriptCommandVisit[],
  scriptState?: ScriptEditorState,
): ProjectReferenceEdgeInput[] {
  return visits.flatMap((visit) => {
    const kind = visit.command.kind
    if (
      kind !== 'loadScene' &&
      kind !== 'setSceneMapOverride' &&
      kind !== 'openShop' &&
      kind !== 'startBattle' &&
      kind !== 'setAmbience' &&
      kind !== 'toggleDayNight' &&
      kind !== 'learnSkill' &&
      kind !== 'branch' &&
      kind !== 'loop'
    )
      return []
    const targets = withoutRedundantLoadSceneParent(
      collectCanonicalCommandTargetReferences(visit.command, visit.path),
    ).filter((target) => target.target.kind !== 'entity')
    if (!targets.length) return []
    const reference = {
      kind: 'command' as const,
      path: visit.path,
      locator: visit.locator,
    }
    const source = sourceForScriptOwner(visit.locator.owner, scriptState)
    return targets.map((target) =>
      commandReferenceEdge(target, source, { kind: 'canonical-script', reference }),
    )
  })
}

export function legacyScriptChunkTargetEdges(
  chunks: EditorState['scriptChunks'],
): ProjectReferenceEdgeInput[] {
  return Object.entries(chunks ?? {}).flatMap(([chunkId, chunk]) =>
    Object.entries(chunk.scripts).flatMap(([scriptId, body]) => {
      const source = legacyScriptChunkSource(chunkId, scriptId)
      const locator: ProjectReferenceLocator = {
        kind: 'unavailable',
        reason: '运行时脚本分片只读，没有作者对象可供精确编辑。',
      }
      return withoutRedundantLoadSceneParent(
        collectCommandTargetReferences(
          body,
          `scriptChunks[${JSON.stringify(chunkId)}].scripts[${JSON.stringify(scriptId)}]`,
        ),
      ).map((target) => commandReferenceEdge(target, source, locator))
    }),
  )
}

function battleDataReferenceSource(reference: BattleDataReference): {
  source: ProjectReferenceSource
  locator: ProjectReferenceLocator
} {
  const locator = reference.locator
  if (!locator)
    throw new Error(`战斗数据引用缺少结构化来源：${reference.kind} · ${reference.where}`)
  switch (locator.kind) {
    case 'actor': {
      const object = { kind: 'actor', id: locator.actorId } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'actor', id: locator.actorId },
          `人物 ${locator.actorId}`,
          { deletedWith: [object] },
        ),
        locator: { kind: 'object', object },
      }
    }
    case 'item': {
      const object = { kind: 'item', id: locator.itemId } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'item', id: locator.itemId },
          `物品 ${locator.itemId}`,
          { deletedWith: [object] },
        ),
        locator: { kind: 'object', object },
      }
    }
    case 'skill': {
      const object = { kind: 'skill', id: locator.skillId } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'skill', id: locator.skillId },
          `技能 ${locator.skillId}`,
          { deletedWith: [object] },
        ),
        locator: { kind: 'object', object },
      }
    }
    case 'enemy': {
      const object = { kind: 'enemy', id: locator.enemyId } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'enemy', id: locator.enemyId },
          `敌人 ${locator.enemyId}`,
          { deletedWith: [object] },
        ),
        locator: { kind: 'object', object },
      }
    }
    case 'poison': {
      const object = { kind: 'poison', id: String(locator.poisonId) } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'poison', id: String(locator.poisonId) },
          `毒 ${locator.poisonId}`,
          { deletedWith: [object] },
        ),
        locator: { kind: 'object', object },
      }
    }
    case 'scene': {
      const object = { kind: 'scene', id: locator.sceneId } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'scene', id: locator.sceneId },
          `场景 ${locator.sceneId}`,
          { deletedWith: [object] },
        ),
        locator: { kind: 'object', object },
      }
    }
    case 'shared-script': {
      const object = { kind: 'shared-script', id: locator.scriptId } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'shared-script', id: locator.scriptId },
          `共享脚本 ${locator.scriptId}`,
          { deletedWith: [object] },
        ),
        locator: { kind: 'object', object },
      }
    }
    case 'entry-point': {
      const object = { kind: 'entry-point', id: locator.entryPointId } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'entry-point', id: locator.entryPointId },
          `入口 ${locator.entryPointId}`,
          { deletedWith: [object] },
        ),
        locator: { kind: 'object', object },
      }
    }
    case 'enemy-team': {
      const object = { kind: 'enemy-team', id: locator.enemyTeamId } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'enemy-team', id: locator.enemyTeamId },
          `敌队 ${locator.enemyTeamId}`,
          { deletedWith: [object] },
        ),
        locator: { kind: 'object', object },
      }
    }
  }
}

function battleDataReferenceEdge(reference: BattleDataReference): ProjectReferenceEdgeInput {
  const mapped = battleDataReferenceSource(reference)
  return {
    target: { kind: reference.target, id: reference.targetId },
    source: mapped.source,
    relation: {
      kind: 'battle-data-use',
      target: reference.target,
      use: reference.kind,
    },
    where: reference.where,
    detail:
      reference.label === mapped.source.label
        ? reference.detail
        : `${reference.label} · ${reference.detail}`,
    locator: mapped.locator,
    deletePolicy: 'replace-suggest',
  }
}

function canonicalActorConditionPoisonEdges(
  visits: readonly CanonicalScriptCommandVisit[],
  scriptState: ScriptEditorState,
): ProjectReferenceEdgeInput[] {
  return visits.flatMap((visit) => {
    const reference = actorConditionPoisonReferenceAtNode(visit.command, visit.path)
    if (!reference) return []
    const source = sourceForScriptOwner(visit.locator.owner, scriptState)
    const locator: ProjectReferenceLocator = {
      kind: 'canonical-script',
      reference: { kind: 'command', path: reference.where, locator: visit.locator },
    }
    return [
      {
        target: { kind: 'poison' as const, id: String(reference.poisonId) },
        source,
        relation: {
          kind: 'battle-data-use' as const,
          target: 'poison' as const,
          use: 'command-actor-condition-poison' as const,
        },
        where: reference.where,
        detail: '剧情施毒或指定解毒',
        locator,
        deletePolicy: 'replace-suggest' as const,
      },
    ]
  })
}

function legacyActorConditionPoisonEdges(
  chunks: EditorState['scriptChunks'],
): ProjectReferenceEdgeInput[] {
  return Object.entries(chunks ?? {}).flatMap(([chunkId, chunk]) =>
    Object.entries(chunk.scripts).flatMap(([scriptId, body]) => {
      const where = `scriptChunks[${JSON.stringify(chunkId)}].scripts[${JSON.stringify(scriptId)}]`
      const source = legacyScriptChunkSource(chunkId, scriptId)
      const locator: ProjectReferenceLocator = {
        kind: 'unavailable',
        reason: '运行时脚本分片只读，没有作者对象可供精确编辑。',
      }
      return collectActorConditionPoisonReferences(body, where).map((reference) => ({
        target: { kind: 'poison' as const, id: String(reference.poisonId) },
        source,
        relation: {
          kind: 'battle-data-use' as const,
          target: 'poison' as const,
          use: 'command-actor-condition-poison' as const,
        },
        where: reference.where,
        detail: '剧情施毒或指定解毒',
        locator,
        deletePolicy: 'block' as const,
      }))
    }),
  )
}

function runtimeBattleDataReferenceEdges(
  worlds: EditorState['worlds'],
): ProjectReferenceEdgeInput[] {
  const source = runtimeWorldSource()
  const locator: ProjectReferenceLocator = {
    kind: 'unavailable',
    reason: '运行态存档只读，没有作者对象可供精确编辑。',
  }
  return collectWorldBattleDataReferences(worlds ?? []).map((reference) => ({
    target: { kind: reference.target, id: reference.id },
    source,
    relation: {
      kind: 'battle-data-use',
      target: reference.target,
      use: reference.kind,
    },
    where: reference.where,
    detail:
      reference.kind === 'world-learned-skill'
        ? '运行态已习得技能'
        : reference.kind === 'world-skill-use-count'
          ? '运行态技能终身使用计数'
          : '运行态角色当前中毒',
    locator,
    deletePolicy: 'block',
  }))
}

export function battleDataReferenceEdges(
  state: EditorState,
  visits: readonly CanonicalScriptCommandVisit[],
  scriptState: ScriptEditorState,
): ProjectReferenceEdgeInput[] {
  const coarse = (['skill', 'enemy', 'poison'] as const)
    .flatMap((target) =>
      collectBattleDataReferences(state, target, { includeScriptCommands: false }),
    )
    .filter(
      (reference) =>
        reference.kind !== 'command-actor-condition-poison' || reference.locator?.kind === 'enemy',
    )
    .map(battleDataReferenceEdge)
  return [
    ...coarse,
    ...canonicalActorConditionPoisonEdges(visits, scriptState),
    ...legacyActorConditionPoisonEdges(state.scriptChunks),
    ...runtimeBattleDataReferenceEdges(state.worlds),
  ]
}

function actorReferenceSource(reference: ActorReference): {
  source: ProjectReferenceSource
  locator: ProjectReferenceLocator
} {
  const locator = reference.locator
  if (!locator) {
    if (reference.kind === 'world-party-template' || reference.kind === 'world-reserve-template')
      return {
        source: runtimeWorldSource(),
        locator: {
          kind: 'unavailable',
          reason: reference.unavailableReason ?? '运行态存档只读，没有作者对象可供精确编辑。',
        },
      }
    if (reference.kind === 'level-up-owner') {
      const id = reference.ownerActorId ?? reference.actorId
      const object = { kind: 'actor', id } as const
      return {
        source: createProjectReferenceSource({ kind: 'actor', id }, `人物 ${id}`, {
          deletedWith: [object],
        }),
        locator: { kind: 'object', object, section: 'battle' },
      }
    }
    throw new Error(`人物引用缺少结构化来源：${reference.kind} · ${reference.where}`)
  }
  switch (locator.kind) {
    case 'scene-entity': {
      const object = {
        kind: 'entity',
        sceneId: locator.sceneId,
        entityId: locator.entityId,
      } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'scene-entity', sceneId: locator.sceneId, entityId: locator.entityId },
          `场景 ${locator.sceneId} · 实体 ${locator.entityId}`,
          { deletedWith: [object, { kind: 'scene', id: locator.sceneId }] },
        ),
        locator: { kind: 'object', object },
      }
    }
    case 'scene':
    case 'shared-script':
      throw new Error(`人物脚本引用未使用 canonical/legacy adapter：${reference.where}`)
    case 'entry-point': {
      if (!locator.entryPointId)
        throw new Error(`人物入口引用缺少稳定 EntryPointId：${reference.where}`)
      const object = { kind: 'entry-point', id: locator.entryPointId } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'entry-point', id: locator.entryPointId },
          `入口 ${locator.entryPointId}`,
          { deletedWith: [object] },
        ),
        locator: { kind: 'object', object },
      }
    }
    case 'actor': {
      const object = { kind: 'actor', id: locator.actorId } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'actor', id: locator.actorId },
          `人物 ${locator.actorId}`,
          { deletedWith: [object] },
        ),
        locator:
          reference.kind === 'actor-covered-by'
            ? { kind: 'object', object, section: 'relationships' }
            : { kind: 'object', object },
      }
    }
    case 'item': {
      const object = { kind: 'item', id: locator.itemId } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'item', id: locator.itemId },
          `物品 ${locator.itemId}`,
          { deletedWith: [object] },
        ),
        locator: { kind: 'object', object },
      }
    }
    case 'enemy': {
      const object = { kind: 'enemy', id: locator.enemyId } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'enemy', id: locator.enemyId },
          `敌人 ${locator.enemyId}`,
          { deletedWith: [object] },
        ),
        locator: { kind: 'object', object },
      }
    }
  }
}

function actorReferenceEdge(reference: ActorReference): ProjectReferenceEdgeInput {
  const mapped = actorReferenceSource(reference)
  return {
    target: { kind: 'actor', id: reference.actorId },
    source: mapped.source,
    relation: { kind: 'actor-use', use: reference.kind },
    where: reference.where,
    detail:
      reference.kind === 'scene-entity-actor' || reference.label === mapped.source.label
        ? reference.detail
        : `${reference.label} · ${reference.detail}`,
    locator: mapped.locator,
    deletePolicy: mapped.locator.kind === 'unavailable' ? 'block' : 'replace-suggest',
  }
}

function canonicalActorReferenceEdges(
  visits: readonly CanonicalScriptCommandVisit[],
  scriptState: ScriptEditorState,
): ProjectReferenceEdgeInput[] {
  return visits.flatMap((visit) => {
    const references = collectCanonicalActorTaggedReferences(visit.command, visit.path)
    if (!references.length) return []
    const source = sourceForScriptOwner(visit.locator.owner, scriptState)
    return references.map((reference) => ({
      target: { kind: 'actor' as const, id: reference.actorId },
      source,
      relation: { kind: 'actor-use' as const, use: reference.kind },
      where: reference.where,
      detail: ACTOR_REFERENCE_POLICIES[reference.kind].label,
      locator: {
        kind: 'canonical-script' as const,
        reference: { kind: 'command' as const, path: reference.where, locator: visit.locator },
      },
      deletePolicy: 'replace-suggest' as const,
    }))
  })
}

function legacyActorReferenceEdges(
  chunks: EditorState['scriptChunks'],
): ProjectReferenceEdgeInput[] {
  return Object.entries(chunks ?? {}).flatMap(([chunkId, chunk]) =>
    Object.entries(chunk.scripts).flatMap(([scriptId, body]) => {
      const source = legacyScriptChunkSource(chunkId, scriptId)
      const locator: ProjectReferenceLocator = {
        kind: 'unavailable',
        reason: '运行时脚本分片只读，没有作者对象可供精确编辑。',
      }
      const where = `scriptChunks[${JSON.stringify(chunkId)}].scripts[${JSON.stringify(scriptId)}]`
      return collectActorTaggedReferences(body, where).map((reference) => ({
        target: { kind: 'actor' as const, id: reference.actorId },
        source,
        relation: { kind: 'actor-use' as const, use: reference.kind },
        where: reference.where,
        detail: ACTOR_REFERENCE_POLICIES[reference.kind].label,
        locator,
        deletePolicy: 'block' as const,
      }))
    }),
  )
}

function canonicalActorTransitionReferenceEdges(
  visits: readonly CanonicalScriptTransitionVisit[],
  scriptState: ScriptEditorState,
): ProjectReferenceEdgeInput[] {
  return visits.flatMap((visit) => {
    const references = collectActorTaggedReferences(visit.transition, visit.path)
    if (!references.length) return []
    const source = sourceForScriptOwner(visit.owner, scriptState)
    return references.map((reference) => ({
      target: { kind: 'actor' as const, id: reference.actorId },
      source,
      relation: { kind: 'actor-use' as const, use: reference.kind },
      where: reference.where,
      detail: ACTOR_REFERENCE_POLICIES[reference.kind].label,
      locator: { kind: 'script-owner' as const, owner: visit.owner },
      deletePolicy: 'replace-suggest' as const,
    }))
  })
}

export function actorReferenceEdges(
  state: EditorState,
  visits: readonly CanonicalScriptCommandVisit[],
  transitionVisits: readonly CanonicalScriptTransitionVisit[],
  scriptState: ScriptEditorState,
): ProjectReferenceEdgeInput[] {
  return [
    ...collectActorReferences(state, { includeScriptCommands: false }).map(actorReferenceEdge),
    ...canonicalActorReferenceEdges(visits, scriptState),
    ...canonicalActorTransitionReferenceEdges(transitionVisits, scriptState),
    ...legacyActorReferenceEdges(state.scriptChunks),
  ]
}

function itemReferenceSource(reference: ItemReference): {
  source: ProjectReferenceSource
  locator: ProjectReferenceLocator
} {
  const locator = reference.locator
  if (!locator) {
    if (reference.source === 'save')
      return {
        source: runtimeWorldSource(),
        locator: {
          kind: 'unavailable',
          reason: reference.unavailableReason ?? '运行态存档只读，没有作者对象可供精确编辑。',
        },
      }
    throw new Error(`物品引用缺少结构化来源：${reference.source} · ${reference.where}`)
  }
  const objectSource = (
    object: ProjectReferenceTarget,
    owner: ProjectReferenceSource['owner'],
    label: string,
    section?: string,
  ): { source: ProjectReferenceSource; locator: ProjectReferenceLocator } => ({
    source: createProjectReferenceSource(owner, label, {
      deletedWith: [object],
      ...(section ? { section } : {}),
    }),
    locator: { kind: 'object', object, ...(section ? { section } : {}) },
  })
  switch (locator.kind) {
    case 'shop':
      return objectSource(
        { kind: 'shop', id: String(locator.shopId) },
        { kind: 'shop', id: String(locator.shopId) },
        `商店 ${locator.shopId}`,
      )
    case 'actor':
      return objectSource(
        { kind: 'actor', id: locator.actorId },
        { kind: 'actor', id: locator.actorId },
        `人物 ${locator.actorId}`,
      )
    case 'skill':
      return objectSource(
        { kind: 'skill', id: locator.skillId },
        { kind: 'skill', id: locator.skillId },
        `技能 ${locator.skillId}`,
      )
    case 'enemy':
      return objectSource(
        { kind: 'enemy', id: locator.enemyId },
        { kind: 'enemy', id: locator.enemyId },
        `敌人 ${locator.enemyId}`,
      )
    case 'poison':
      return objectSource(
        { kind: 'poison', id: String(locator.poisonId) },
        { kind: 'poison', id: String(locator.poisonId) },
        `毒 ${locator.poisonId}`,
      )
    case 'entry-point': {
      if (!locator.entryPointId)
        throw new Error(`物品入口引用缺少稳定 EntryPointId：${reference.where}`)
      return objectSource(
        { kind: 'entry-point', id: locator.entryPointId },
        { kind: 'entry-point', id: locator.entryPointId },
        `入口 ${locator.entryPointId}`,
      )
    }
    case 'item':
      return objectSource(
        { kind: 'item', id: locator.itemId },
        { kind: 'item', id: locator.itemId },
        `物品 ${locator.itemId}`,
      )
    case 'item-crafting':
      return objectSource(
        { kind: 'item', id: locator.itemId },
        { kind: 'item', id: locator.itemId },
        `物品 ${locator.itemId}`,
        'crafting',
      )
    case 'item-spirit-gourd':
      return objectSource(
        { kind: 'item', id: locator.itemId },
        { kind: 'item', id: locator.itemId },
        `物品 ${locator.itemId}`,
        'spirit-gourd',
      )
    case 'script-chunk':
      return {
        source: legacyScriptChunkSource(locator.chunkId, locator.scriptId),
        locator: {
          kind: 'unavailable',
          reason: reference.unavailableReason ?? '运行时脚本分片只读，没有作者对象可供精确编辑。',
        },
      }
    case 'scene-script':
    case 'shared-script':
    case 'canonical-script':
      throw new Error(`物品脚本引用未使用 canonical/legacy adapter：${reference.where}`)
  }
}

function itemReferenceEdge(reference: ItemReference): ProjectReferenceEdgeInput {
  const mapped = itemReferenceSource(reference)
  return {
    target: { kind: 'item', id: reference.itemId },
    source: mapped.source,
    relation: { kind: 'item-use', access: reference.access },
    where: reference.where,
    detail: reference.detail,
    locator: mapped.locator,
    deletePolicy: mapped.locator.kind === 'unavailable' ? 'block' : 'replace-suggest',
  }
}

function canonicalItemReferenceEdges(
  visits: readonly CanonicalScriptCommandVisit[],
  scriptState: ScriptEditorState,
): ProjectReferenceEdgeInput[] {
  return visits.flatMap((visit) => {
    const references = collectCanonicalItemTaggedReferences(visit.command, visit.path)
    if (!references.length) return []
    const source = sourceForScriptOwner(visit.locator.owner, scriptState)
    return references.map((reference) => ({
      target: { kind: 'item' as const, id: reference.itemId },
      source,
      relation: { kind: 'item-use' as const, access: reference.access },
      where: reference.where,
      detail: reference.detail,
      locator: {
        kind: 'canonical-script' as const,
        reference: { kind: 'command' as const, path: reference.where, locator: visit.locator },
      },
      deletePolicy: 'replace-suggest' as const,
    }))
  })
}

function canonicalItemTransitionReferenceEdges(
  visits: readonly CanonicalScriptTransitionVisit[],
  scriptState: ScriptEditorState,
): ProjectReferenceEdgeInput[] {
  return visits.flatMap((visit) => {
    const references = collectCanonicalItemTransitionTaggedReferences(visit.transition, visit.path)
    if (!references.length) return []
    const source = sourceForScriptOwner(visit.owner, scriptState)
    return references.map((reference) => ({
      target: { kind: 'item' as const, id: reference.itemId },
      source,
      relation: { kind: 'item-use' as const, access: reference.access },
      where: reference.where,
      detail: reference.detail,
      locator: { kind: 'script-owner' as const, owner: visit.owner },
      deletePolicy: 'replace-suggest' as const,
    }))
  })
}

export function itemReferenceEdges(
  state: EditorState,
  commandVisits: readonly CanonicalScriptCommandVisit[],
  transitionVisits: readonly CanonicalScriptTransitionVisit[],
  scriptState: ScriptEditorState,
): ProjectReferenceEdgeInput[] {
  return [
    ...collectItemReferences(state, undefined, {
      includeSceneScripts: false,
      includeLegacyScripts: false,
    }).map(itemReferenceEdge),
    ...canonicalItemReferenceEdges(commandVisits, scriptState),
    ...canonicalItemTransitionReferenceEdges(transitionVisits, scriptState),
    ...collectLegacyItemReferences(state).map(itemReferenceEdge),
  ]
}

function spriteTaggedReferenceEdge(
  reference: CommandSpriteTaggedReference,
  source: ProjectReferenceSource,
  locator: ProjectReferenceLocator,
): ProjectReferenceEdgeInput {
  const common = {
    source,
    where: reference.where,
    locator,
    deletePolicy:
      locator.kind === 'unavailable' ? ('block' as const) : ('replace-suggest' as const),
  }
  switch (reference.kind) {
    case 'world-sprite':
      return {
        ...common,
        target: { kind: 'world-sprite', id: reference.sprite },
        relation: { kind: 'world-sprite-use' },
        detail: '脚本切换世界精灵',
      }
    case 'world-sprite-action':
      return {
        ...common,
        target: {
          kind: 'world-sprite-action',
          spriteId: reference.sprite,
          actionId: reference.action,
        },
        relation: { kind: 'world-sprite-action-use', actionId: reference.action },
        detail: `播放动作 ${reference.action}`,
      }
    case 'battle-sprite':
      return {
        ...common,
        target: { kind: 'battle-sprite', id: reference.battleSprite },
        relation: { kind: 'battle-sprite-use', expectedProfile: reference.expectedProfile },
        detail: '脚本切换战斗精灵',
      }
  }
}

function objectReferenceSource(
  owner: ProjectReferenceSource['owner'],
  label: string,
  deletedWith: readonly ProjectReferenceTarget[],
  section?: string,
): ProjectReferenceSource {
  return createProjectReferenceSource(owner, label, { deletedWith, section })
}

function isCanonicalAssetOrigin(origin: AssetReferenceOrigin): boolean {
  return (
    origin.kind === 'shared-script' ||
    origin.kind === 'scene-hook' ||
    (origin.kind === 'scene' && origin.section === 'entities') ||
    (origin.kind === 'item' && origin.section === 'commands')
  )
}

function assetReferenceLocation(
  origin: AssetReferenceOrigin,
  projectId: string,
): { source: ProjectReferenceSource; locator: ProjectReferenceLocator } {
  switch (origin.kind) {
    case 'manifest-role':
      return {
        source: createProjectReferenceSource(
          { kind: 'project-part', id: `asset-role:${origin.role}` },
          `项目资源角色 ${origin.role}`,
        ),
        locator: {
          kind: 'object',
          object: { kind: 'project', id: projectId },
          section: 'startup',
        },
      }
    case 'entry-point': {
      const target = { kind: 'entry-point', id: origin.id } as const
      return {
        source: objectReferenceSource(
          { kind: 'entry-point', id: origin.id },
          `入口 ${origin.id}`,
          [target],
          'intro-video',
        ),
        locator: { kind: 'object', object: target },
      }
    }
    case 'scene': {
      const target = { kind: 'scene', id: origin.id } as const
      return {
        source: objectReferenceSource(
          { kind: 'scene', id: origin.id },
          `场景 ${origin.id}`,
          [target],
          origin.section,
        ),
        locator: { kind: 'object', object: target, section: origin.section },
      }
    }
    case 'scene-hook':
      throw new Error('canonical scene hook 资源引用必须由 command visit 建边')
    case 'script-chunk':
      return {
        source: legacyScriptChunkSource(origin.chunkId, origin.scriptId),
        locator: {
          kind: 'unavailable',
          reason: '运行时脚本分片只读，没有作者对象可供精确编辑。',
        },
      }
    case 'shared-script':
      throw new Error('canonical shared script 资源引用必须由 command visit 建边')
    case 'actor': {
      const target = { kind: 'actor', id: origin.id } as const
      return {
        source: objectReferenceSource(
          { kind: 'actor', id: origin.id },
          `人物 ${origin.id}`,
          [target],
          origin.section,
        ),
        locator: {
          kind: 'object',
          object: target,
          section: origin.section === 'sounds' ? 'battle' : 'appearance',
        },
      }
    }
    case 'enemy': {
      const target = { kind: 'enemy', id: origin.id } as const
      return {
        source: objectReferenceSource(
          { kind: 'enemy', id: origin.id },
          `敌人 ${origin.id}`,
          [target],
          origin.section,
        ),
        locator: { kind: 'object', object: target },
      }
    }
    case 'item': {
      const target = { kind: 'item', id: origin.id } as const
      return {
        source: objectReferenceSource(
          { kind: 'item', id: origin.id },
          `物品 ${origin.id}`,
          [target],
          origin.section,
        ),
        locator: { kind: 'object', object: target },
      }
    }
    case 'skill': {
      const target = { kind: 'skill', id: origin.id } as const
      const section = `${origin.side}:${origin.section}`
      return {
        source: objectReferenceSource(
          { kind: 'skill', id: origin.id },
          `技能 ${origin.id}`,
          [target],
          section,
        ),
        locator: { kind: 'object', object: target },
      }
    }
    case 'battle-field': {
      const target = { kind: 'battle-field', id: origin.id } as const
      return {
        source: objectReferenceSource(
          { kind: 'battle-field', id: origin.id },
          `战场 ${origin.id}`,
          [target],
          'background',
        ),
        locator: { kind: 'object', object: target },
      }
    }
    case 'tileset': {
      const target = { kind: 'tileset', id: origin.id } as const
      return {
        source: objectReferenceSource(
          { kind: 'tileset', id: origin.id },
          `瓦片集 ${origin.id}`,
          [target],
          'asset',
        ),
        locator: { kind: 'object', object: target },
      }
    }
    case 'world-sprite': {
      const target = { kind: 'world-sprite', id: origin.id } as const
      return {
        source: objectReferenceSource(
          { kind: 'world-sprite', id: origin.id },
          `世界精灵 ${origin.id}`,
          [target],
          'asset',
        ),
        locator: { kind: 'object', object: target },
      }
    }
    case 'world-sprite-action': {
      const action = {
        kind: 'world-sprite-action',
        spriteId: origin.spriteId,
        actionId: origin.actionId,
      } as const
      const definition = { kind: 'world-sprite', id: origin.spriteId } as const
      return {
        source: objectReferenceSource(
          {
            kind: 'world-sprite-action',
            spriteId: origin.spriteId,
            actionId: origin.actionId,
          },
          `世界精灵 ${origin.spriteId} · 动作 ${origin.actionId}`,
          [action, definition],
        ),
        locator: { kind: 'object', object: action },
      }
    }
    case 'battle-sprite': {
      const target = { kind: 'battle-sprite', id: origin.id } as const
      return {
        source: objectReferenceSource(
          { kind: 'battle-sprite', id: origin.id },
          `战斗精灵 ${origin.id}`,
          [target],
          'asset',
        ),
        locator: { kind: 'object', object: target },
      }
    }
    case 'runtime-world':
      return {
        source: runtimeWorldSource(),
        locator: {
          kind: 'unavailable',
          reason: '运行态存档只读，没有作者对象可供精确编辑。',
        },
      }
  }
}

function assetReferenceEdge(
  reference: LocatedAssetReference,
  location: { source: ProjectReferenceSource; locator: ProjectReferenceLocator },
): ProjectReferenceEdgeInput {
  return {
    target: { kind: 'asset', id: reference.asset },
    source: location.source,
    relation: { kind: 'asset-use', expectedKind: reference.expectedKind },
    where: reference.where,
    locator: location.locator,
    deletePolicy: location.locator.kind === 'unavailable' ? 'block' : 'replace-suggest',
  }
}

export interface CanonicalAssetReferenceEntry {
  visit: CanonicalScriptCommandVisit
  reference: LocatedAssetReference
}

function canonicalAssetOrigin(owner: ScriptCommandOwner): AssetReferenceOrigin {
  switch (owner.kind) {
    case 'shared-script':
      return { kind: 'shared-script', id: owner.scriptId }
    case 'scene-hook':
      return {
        kind: 'scene-hook',
        sceneId: owner.sceneId,
        slot: owner.slot,
        hookId: owner.hookId,
      }
    case 'item-private-script':
      return { kind: 'item', id: owner.itemId, section: 'commands' }
    case 'entity-behavior':
    case 'entity-hostile-on-lose':
      return { kind: 'scene', id: owner.sceneId, section: 'entities' }
  }
}

function canonicalAssetSite(owner: ScriptCommandOwner): string {
  switch (owner.kind) {
    case 'shared-script':
      return `sharedScript:${owner.scriptId}`
    case 'scene-hook':
      return `scene:${owner.sceneId}:hook:${owner.slot}:${owner.hookId}`
    case 'item-private-script':
      return `item:${owner.itemId}`
    case 'entity-behavior':
    case 'entity-hostile-on-lose':
      return `scene:${owner.sceneId}:entities`
  }
}

export function collectCanonicalAssetReferenceEntries(
  visits: readonly CanonicalScriptCommandVisit[],
): CanonicalAssetReferenceEntry[] {
  return visits.flatMap((visit) =>
    collectCanonicalCommandAssetTaggedReferences(visit.command, visit.path).map((reference) => ({
      visit,
      reference: {
        ...reference,
        site: canonicalAssetSite(visit.locator.owner),
        origin: canonicalAssetOrigin(visit.locator.owner),
      },
    })),
  )
}

function canonicalAssetReferenceEdges(
  entries: readonly CanonicalAssetReferenceEntry[],
  scriptState: ScriptEditorState,
): ProjectReferenceEdgeInput[] {
  return entries.map(({ visit, reference }) => {
    const source = sourceForScriptOwner(visit.locator.owner, scriptState)
    return {
      target: { kind: 'asset' as const, id: reference.asset },
      source,
      relation: { kind: 'asset-use' as const, expectedKind: reference.expectedKind },
      where: reference.where,
      locator: {
        kind: 'canonical-script' as const,
        reference: { kind: 'command' as const, path: reference.where, locator: visit.locator },
      },
      deletePolicy: 'replace-suggest' as const,
    }
  })
}

export function assetReferenceEdges(
  state: EditorState,
  references: readonly LocatedAssetReference[],
  canonicalReferences: readonly CanonicalAssetReferenceEntry[],
  scriptState: ScriptEditorState,
): ProjectReferenceEdgeInput[] {
  const structural = references.flatMap((reference) => {
    const origin = reference.origin
    if (isCanonicalAssetOrigin(origin)) return []
    return [assetReferenceEdge(reference, assetReferenceLocation(origin, state.manifest.id))]
  })
  return [...structural, ...canonicalAssetReferenceEdges(canonicalReferences, scriptState)]
}

export function worldVariableReferenceEdges(
  references: WorldVariableReferenceIndexV1,
  scriptState: ScriptEditorState,
): ProjectReferenceEdgeInput[] {
  return references.all.map((reference) => {
    const source = sourceForScriptOwner(reference.owner, scriptState)
    return {
      target: { kind: 'world-variable' as const, id: reference.id },
      source,
      relation: {
        kind: 'world-variable' as const,
        variableKind: reference.kind,
        access: reference.access,
      },
      where: reference.path,
      detail: reference.detail,
      locator:
        reference.reference?.kind === 'command'
          ? { kind: 'canonical-script' as const, reference: reference.reference }
          : { kind: 'script-owner' as const, owner: reference.owner },
      deletePolicy: 'replace-suggest' as const,
    }
  })
}

function canonicalSchemeReferenceLocation(
  reference: import('./script-editor.js').CanonicalScriptReference,
  scriptState: ScriptEditorState,
): { source: ProjectReferenceSource; locator: ProjectReferenceLocator } {
  if (reference.kind === 'command')
    return {
      source: sourceForScriptOwner(reference.locator.owner, scriptState),
      locator: { kind: 'canonical-script', reference },
    }
  if (reference.kind === 'page') {
    const entity = {
      kind: 'entity' as const,
      sceneId: reference.locator.sceneId,
      entityId: reference.locator.entityId,
    }
    return {
      source: objectReferenceSource(
        {
          kind: 'scene-page',
          sceneId: reference.locator.sceneId,
          entityId: reference.locator.entityId,
          pageId: reference.locator.pageId,
        },
        `场景 ${reference.locator.sceneId} · 实体 ${reference.locator.entityId} · 页面 ${reference.locator.pageId}`,
        [entity, { kind: 'scene', id: reference.locator.sceneId }],
        reference.locator.channel,
      ),
      locator: {
        kind: 'scene-page',
        sceneId: reference.locator.sceneId,
        entityId: reference.locator.entityId,
        pageId: reference.locator.pageId,
        channel: reference.locator.channel,
      },
    }
  }
  return {
    source: objectReferenceSource(
      { kind: 'scene', id: reference.locator.sceneId },
      `场景 ${reference.locator.sceneId}`,
      [{ kind: 'scene', id: reference.locator.sceneId }],
      `hook-initial:${reference.locator.slot}`,
    ),
    locator: {
      kind: 'scene-hook-initial',
      sceneId: reference.locator.sceneId,
      slot: reference.locator.slot,
      hookId: reference.locator.hookId,
    },
  }
}

export function canonicalSchemeReferenceEdges(
  indexes: CanonicalSchemeReferenceIndexes,
  scriptState: ScriptEditorState,
): ProjectReferenceEdgeInput[] {
  const behaviorEdges = indexes.behaviorEntries.map((entry) => {
    const location = canonicalSchemeReferenceLocation(entry.reference, scriptState)
    return {
      target: {
        kind: 'entity-behavior' as const,
        sceneId: entry.target.scene,
        entityId: entry.target.entity,
        channel: entry.channel,
        behaviorId: entry.behaviorId,
      },
      source: location.source,
      relation: { kind: 'behavior-reference' as const, use: entry.use },
      where: entry.reference.path,
      locator: location.locator,
      deletePolicy: 'replace-suggest' as const,
    }
  })
  const hookEdges = indexes.sceneHookEntries.map((entry) => {
    const location = canonicalSchemeReferenceLocation(entry.reference, scriptState)
    return {
      target: {
        kind: 'scene-hook' as const,
        sceneId: entry.sceneId,
        slot: entry.slot,
        hookId: entry.hookId,
      },
      source: location.source,
      relation: { kind: 'scene-hook-reference' as const, use: entry.use },
      where: entry.reference.path,
      locator: location.locator,
      deletePolicy: 'replace-suggest' as const,
    }
  })
  return [...behaviorEdges, ...hookEdges]
}

export function sharedScriptReferenceEdges(
  references: readonly CanonicalSharedScriptReferenceEntry[],
  scriptState: ScriptEditorState,
): ProjectReferenceEdgeInput[] {
  return references.map((reference) => {
    const target = { kind: 'shared-script' as const, id: reference.scriptId }
    if (!('reference' in reference)) {
      const item = { kind: 'item' as const, id: reference.source.itemId }
      return {
        target,
        source: objectReferenceSource(
          { kind: 'item', id: reference.source.itemId },
          `物品 ${reference.source.itemId}`,
          [item],
          'use-script',
        ),
        relation: {
          kind: 'script-reference' as const,
          use: reference.use,
          explicitSelf: reference.explicitSelf,
        },
        where: reference.path,
        locator: { kind: 'object' as const, object: item },
        deletePolicy: 'replace-suggest' as const,
      }
    }
    return {
      target,
      source: sourceForScriptOwner(reference.source.owner, scriptState),
      relation: {
        kind: 'script-reference' as const,
        use: reference.use,
        explicitSelf: reference.explicitSelf,
      },
      where: reference.path,
      locator: { kind: 'canonical-script' as const, reference: reference.reference },
      deletePolicy: 'replace-suggest' as const,
    }
  })
}

function structuralSpriteReferenceEdges(state: EditorState): ProjectReferenceEdgeInput[] {
  const edges: ProjectReferenceEdgeInput[] = []
  for (const [actorIndex, actor] of (state.actors ?? []).entries()) {
    const actorTarget = { kind: 'actor', id: actor.id } as const
    const source = objectReferenceSource({ kind: 'actor', id: actor.id }, `人物 ${actor.id}`, [
      actorTarget,
    ])
    edges.push({
      target: { kind: 'world-sprite', id: actor.spriteId },
      source,
      relation: { kind: 'world-sprite-use' },
      where: `actors[${actorIndex}](${actor.id}).spriteId`,
      detail: '人物默认世界精灵',
      locator: { kind: 'object', object: actorTarget, section: 'appearance' },
      deletePolicy: 'replace-suggest',
    })
    if (actor.battler?.battleSprite)
      edges.push({
        target: { kind: 'battle-sprite', id: actor.battler.battleSprite },
        source,
        relation: { kind: 'battle-sprite-use', expectedProfile: 'player-fighter' },
        where: `actors[${actorIndex}](${actor.id}).battler.battleSprite`,
        detail: '人物默认战斗精灵',
        locator: { kind: 'object', object: actorTarget, section: 'battle' },
        deletePolicy: 'replace-suggest',
      })
  }
  for (const [sceneIndex, scene] of state.scenes.entries()) {
    const sceneTarget = { kind: 'scene', id: scene.id } as const
    for (const [entityIndex, entity] of scene.entities.entries()) {
      const entityTarget = { kind: 'entity', sceneId: scene.id, entityId: entity.id } as const
      const entitySource = objectReferenceSource(
        { kind: 'scene-entity', sceneId: scene.id, entityId: entity.id },
        `场景 ${scene.id} · 实体 ${entity.id}`,
        [entityTarget, sceneTarget],
      )
      if (!isActorEntity(entity) && 'sprite' in entity)
        edges.push({
          target: { kind: 'world-sprite', id: entity.sprite },
          source: entitySource,
          relation: { kind: 'world-sprite-use' },
          where: `scenes[${sceneIndex}].entities[${entityIndex}].sprite`,
          detail: '场景实体世界精灵',
          locator: { kind: 'object', object: entityTarget },
          deletePolicy: 'replace-suggest',
        })
      for (const [pageIndex, page] of (entity.pages ?? []).entries()) {
        if (!page.animation) continue
        const pageId = (page as { id?: string }).id
        const source = pageId
          ? objectReferenceSource(
              {
                kind: 'scene-page',
                sceneId: scene.id,
                entityId: entity.id,
                pageId,
              },
              `场景 ${scene.id} · 实体 ${entity.id} · 页面 ${pageId}`,
              [entityTarget, sceneTarget],
            )
          : entitySource
        const locator: ProjectReferenceLocator = pageId
          ? { kind: 'scene-page', sceneId: scene.id, entityId: entity.id, pageId }
          : { kind: 'object', object: entityTarget }
        edges.push({
          target: {
            kind: 'world-sprite-action',
            spriteId: page.animation.sprite,
            actionId: page.animation.action,
          },
          source,
          relation: { kind: 'world-sprite-action-use', actionId: page.animation.action },
          where: `scenes[${sceneIndex}].entities[${entityIndex}].pages[${pageIndex}].animation.action`,
          detail: '实体页面默认动作',
          locator,
          deletePolicy: 'replace-suggest',
        })
      }
    }
  }
  for (const [enemyIndex, enemy] of (state.enemies ?? []).entries()) {
    const target = { kind: 'enemy', id: enemy.id } as const
    const source = objectReferenceSource({ kind: 'enemy', id: enemy.id }, `敌人 ${enemy.id}`, [
      target,
    ])
    edges.push({
      target: { kind: 'battle-sprite', id: enemy.battleSprite },
      source,
      relation: { kind: 'battle-sprite-use', expectedProfile: 'enemy' },
      where: `enemies[${enemyIndex}](${enemy.id}).battleSprite`,
      detail: '敌人战斗精灵',
      locator: { kind: 'object', object: target },
      deletePolicy: 'replace-suggest',
    })
    const commandReferences = [
      ...collectCommandSpriteTaggedReferences(
        enemy.choreography,
        `enemies[${enemyIndex}](${enemy.id}).choreography`,
      ),
      ...collectCommandSpriteTaggedReferences(
        enemy.onDefeated,
        `enemies[${enemyIndex}](${enemy.id}).onDefeated`,
      ),
    ]
    for (const reference of commandReferences)
      edges.push(spriteTaggedReferenceEdge(reference, source, { kind: 'object', object: target }))
  }
  for (const [itemIndex, item] of (state.items ?? []).entries()) {
    const target = { kind: 'item', id: item.id } as const
    const source = objectReferenceSource({ kind: 'item', id: item.id }, `物品 ${item.id}`, [target])
    item.equip?.effects.forEach((effect, effectIndex) => {
      if (effect.kind !== 'battleSprite') return
      for (const [actorId, battleSprite] of Object.entries(effect.byActor))
        edges.push({
          target: { kind: 'battle-sprite', id: battleSprite },
          source,
          relation: { kind: 'battle-sprite-use', expectedProfile: 'player-fighter' },
          where: `items[${itemIndex}](${item.id}).equip.effects[${effectIndex}].byActor.${actorId}`,
          detail: `装备战斗形象覆写 · ${actorId}`,
          locator: { kind: 'object', object: target },
          deletePolicy: 'replace-suggest',
        })
    })
  }
  for (const [skillIndex, skill] of (state.skills ?? []).entries()) {
    const target = { kind: 'skill', id: skill.id } as const
    const source = objectReferenceSource({ kind: 'skill', id: skill.id }, `技能 ${skill.id}`, [
      target,
    ])
    for (const layer of authoredSkillExecutionLayers(skill))
      (layer.effects ?? []).forEach((effect, effectIndex) => {
        if (effect.kind !== 'summon' && effect.kind !== 'trance') return
        const layerPath = layer.side === 'base' ? 'effects' : `execution.${layer.side}.effects`
        edges.push({
          target: { kind: 'battle-sprite', id: effect.battleSprite },
          source,
          relation: {
            kind: 'battle-sprite-use',
            expectedProfile: effect.kind === 'summon' ? 'summon' : 'player-fighter',
          },
          where: `skills[${skillIndex}](${skill.id}).${layerPath}[${effectIndex}].battleSprite`,
          detail: effect.kind === 'summon' ? '召唤战斗精灵' : '变身战斗精灵',
          locator: { kind: 'object', object: target },
          deletePolicy: 'replace-suggest',
        })
      })
  }
  const runtimeSource = runtimeWorldSource()
  const runtimeLocator = {
    kind: 'unavailable',
    reason: '运行态存档只读，没有作者对象可供精确编辑。',
  } as const
  state.worlds?.forEach((world, worldIndex) => {
    for (const collection of ['party', 'reserve'] as const)
      (world[collection] ?? []).forEach((character, characterIndex) => {
        if (character.appearance?.spriteId)
          edges.push({
            target: { kind: 'world-sprite', id: character.appearance.spriteId },
            source: runtimeSource,
            relation: { kind: 'world-sprite-use' },
            where: `worlds[${worldIndex}].${collection}[${characterIndex}].appearance.spriteId`,
            detail: '运行态角色世界精灵覆写',
            locator: runtimeLocator,
            deletePolicy: 'block',
          })
        if (character.appearance?.battleSprite)
          edges.push({
            target: { kind: 'battle-sprite', id: character.appearance.battleSprite },
            source: runtimeSource,
            relation: { kind: 'battle-sprite-use', expectedProfile: 'player-fighter' },
            where: `worlds[${worldIndex}].${collection}[${characterIndex}].appearance.battleSprite`,
            detail: '运行态角色战斗精灵覆写',
            locator: runtimeLocator,
            deletePolicy: 'block',
          })
      })
    world.script?.followers?.forEach((sprite, index) => {
      edges.push({
        target: { kind: 'world-sprite', id: sprite },
        source: runtimeSource,
        relation: { kind: 'world-sprite-use' },
        where: `worlds[${worldIndex}].script.followers[${index}]`,
        detail: '运行态编外跟随精灵',
        locator: runtimeLocator,
        deletePolicy: 'block',
      })
    })
  })
  return edges
}

function canonicalSpriteReferenceEdges(
  visits: readonly CanonicalScriptCommandVisit[],
  scriptState: ScriptEditorState,
): ProjectReferenceEdgeInput[] {
  return visits.flatMap((visit) => {
    const references = commandSpriteTaggedReferencesAtNode(visit.command, visit.path)
    if (!references.length) return []
    const source = sourceForScriptOwner(visit.locator.owner, scriptState)
    return references.map((reference) =>
      spriteTaggedReferenceEdge(reference, source, {
        kind: 'canonical-script',
        reference: { kind: 'command', path: reference.where, locator: visit.locator },
      }),
    )
  })
}

function legacySpriteReferenceEdges(
  chunks: EditorState['scriptChunks'],
): ProjectReferenceEdgeInput[] {
  return Object.entries(chunks ?? {}).flatMap(([chunkId, chunk]) =>
    Object.entries(chunk.scripts).flatMap(([scriptId, body]) => {
      const source = legacyScriptChunkSource(chunkId, scriptId)
      const locator: ProjectReferenceLocator = {
        kind: 'unavailable',
        reason: '运行时脚本分片只读，没有作者对象可供精确编辑。',
      }
      return collectCommandSpriteTaggedReferences(
        body,
        `scriptChunks[${JSON.stringify(chunkId)}].scripts[${JSON.stringify(scriptId)}]`,
      ).map((reference) => spriteTaggedReferenceEdge(reference, source, locator))
    }),
  )
}

export function spriteReferenceEdges(
  state: EditorState,
  commandVisits: readonly CanonicalScriptCommandVisit[],
  scriptState: ScriptEditorState,
): ProjectReferenceEdgeInput[] {
  return [
    ...structuralSpriteReferenceEdges(state),
    ...canonicalSpriteReferenceEdges(commandVisits, scriptState),
    ...legacySpriteReferenceEdges(state.scriptChunks),
  ]
}

function entitySource(locator: EntityAddressReferenceLocator): {
  source: ProjectReferenceSource
  locator: ProjectReferenceLocator
} {
  switch (locator.kind) {
    case 'scene': {
      const target = { kind: 'scene', id: locator.sceneId } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'scene', id: locator.sceneId },
          `场景 ${locator.sceneId}`,
          { deletedWith: [target] },
        ),
        locator: { kind: 'object', object: target },
      }
    }
    case 'scene-entity': {
      const entity = {
        kind: 'entity',
        sceneId: locator.sceneId,
        entityId: locator.entityId,
      } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'scene-entity', sceneId: locator.sceneId, entityId: locator.entityId },
          `场景 ${locator.sceneId} · 实体 ${locator.entityId}`,
          { deletedWith: [entity, { kind: 'scene', id: locator.sceneId }] },
        ),
        locator: { kind: 'object', object: entity },
      }
    }
    case 'shared-script': {
      const target = { kind: 'shared-script', id: locator.scriptId } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'shared-script', id: locator.scriptId },
          `共享脚本 ${locator.scriptId}`,
          { deletedWith: [target] },
        ),
        locator: { kind: 'object', object: target },
      }
    }
    case 'item': {
      const target = { kind: 'item', id: locator.itemId } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'item', id: locator.itemId },
          `物品 ${locator.itemId}`,
          {
            deletedWith: [target],
          },
        ),
        locator: { kind: 'object', object: target },
      }
    }
    case 'enemy': {
      const target = { kind: 'enemy', id: locator.enemyId } as const
      return {
        source: createProjectReferenceSource(
          { kind: 'enemy', id: locator.enemyId },
          `敌人 ${locator.enemyId}`,
          { deletedWith: [target] },
        ),
        locator: { kind: 'object', object: target },
      }
    }
    case 'world':
      return {
        source: runtimeWorldSource(),
        locator: {
          kind: 'unavailable',
          reason: '世界配置当前没有可编辑的精确内容页。',
        },
      }
  }
}

export function entityAddressReferenceEdges(
  references: readonly EntityAddressReference[],
): ProjectReferenceEdgeInput[] {
  const sources = new Map<
    string,
    { source: ProjectReferenceSource; locator: ProjectReferenceLocator }
  >()
  const relation = { kind: 'entity-address' } as const
  return references
    .filter(
      (reference) =>
        !(
          reference.locator.kind === 'scene-entity' &&
          reference.locator.sceneId === reference.sceneId &&
          reference.locator.entityId === reference.entityId
        ),
    )
    .map((reference) => {
      const locatorIdentity = JSON.stringify(reference.locator)
      let mapped = sources.get(locatorIdentity)
      if (!mapped) {
        mapped = entitySource(reference.locator)
        sources.set(locatorIdentity, mapped)
      }
      return {
        target: {
          kind: 'entity',
          sceneId: reference.sceneId,
          entityId: reference.entityId,
        },
        source: mapped.source,
        relation,
        where: reference.path,
        locator: mapped.locator,
        deletePolicy: mapped.locator.kind === 'unavailable' ? 'block' : 'replace-suggest',
      }
    })
}

export function structuralProjectReferenceEdges(
  state: Pick<EditorState, 'manifest' | 'scenes' | 'worlds'>,
): ProjectReferenceEdgeInput[] {
  const edges: ProjectReferenceEdgeInput[] = []
  edges.push({
    target: { kind: 'battle-field', id: String(DEFAULT_BATTLE_FIELD_ID) },
    source: createProjectReferenceSource(
      { kind: 'project-part', id: 'default-battle-field' },
      `项目默认战场 #${DEFAULT_BATTLE_FIELD_ID}`,
    ),
    relation: { kind: 'battle-field-use', use: 'project-default' },
    where: 'project.defaultBattleFieldId',
    locator: { kind: 'unavailable', reason: '项目默认战场是当前运行约定，没有独立编辑字段。' },
    deletePolicy: 'block',
  })
  for (const entry of state.manifest.entryPoints ?? []) {
    const entryTarget = { kind: 'entry-point', id: entry.id } as const
    edges.push({
      target: { kind: 'scene', id: entry.scene },
      source: createProjectReferenceSource(
        { kind: 'entry-point', id: entry.id },
        `入口 ${entry.label}`,
        { section: 'scene', deletedWith: [entryTarget] },
      ),
      relation: { kind: 'entry-point-scene' },
      where: `manifest.entryPoints.${entry.id}.scene`,
      locator: { kind: 'object', object: entryTarget },
      deletePolicy: 'replace-suggest',
    })
  }
  for (const scene of state.scenes) {
    const sceneTarget = { kind: 'scene', id: scene.id } as const
    edges.push({
      target: { kind: 'map', id: scene.mapId },
      source: createProjectReferenceSource({ kind: 'scene', id: scene.id }, `场景 ${scene.id}`, {
        section: 'map',
        deletedWith: [sceneTarget],
      }),
      relation: { kind: 'scene-map' },
      where: `scenes.${scene.id}.mapId`,
      locator: { kind: 'object', object: sceneTarget, section: 'map' },
      deletePolicy: 'replace-suggest',
    })
    if (scene.battleFieldId !== undefined)
      edges.push({
        target: { kind: 'battle-field', id: String(scene.battleFieldId) },
        source: createProjectReferenceSource({ kind: 'scene', id: scene.id }, `场景 ${scene.id}`, {
          section: 'battle-field',
          deletedWith: [sceneTarget],
        }),
        relation: { kind: 'battle-field-use', use: 'scene-default' },
        where: `scenes.${scene.id}.battleFieldId`,
        locator: { kind: 'object', object: sceneTarget, section: 'battle-field' },
        deletePolicy: 'replace-suggest',
      })
    for (const entity of scene.entities) {
      if (!entity.hostile) continue
      const entityTarget = { kind: 'entity', sceneId: scene.id, entityId: entity.id } as const
      const source = createProjectReferenceSource(
        { kind: 'scene-entity', sceneId: scene.id, entityId: entity.id },
        `场景 ${scene.id} · 实体 ${entity.id}`,
        { deletedWith: [entityTarget, sceneTarget] },
      )
      const locator = { kind: 'object', object: entityTarget } as const
      edges.push({
        target: { kind: 'enemy-team', id: entity.hostile.enemyTeamId },
        source,
        relation: { kind: 'enemy-team-use', use: 'hostile' },
        where: `scenes.${scene.id}.entities.${entity.id}.hostile.enemyTeamId`,
        locator,
        deletePolicy: 'replace-suggest',
      })
      if (entity.hostile.battleFieldId !== undefined)
        edges.push({
          target: { kind: 'battle-field', id: String(entity.hostile.battleFieldId) },
          source,
          relation: { kind: 'battle-field-use', use: 'hostile' },
          where: `scenes.${scene.id}.entities.${entity.id}.hostile.battleFieldId`,
          locator,
          deletePolicy: 'replace-suggest',
        })
    }
  }
  state.worlds?.forEach((world, index) => {
    if (!world.ambience) return
    edges.push({
      target: { kind: 'ambience', id: world.ambience },
      source: runtimeWorldSource(),
      relation: { kind: 'ambience-use', use: 'world-state' },
      where: `worlds[${index}].ambience`,
      locator: { kind: 'unavailable', reason: '运行态存档只读，没有作者对象可供精确编辑。' },
      deletePolicy: 'block',
    })
  })
  return edges
}

export function buildProjectReferenceSnapshotFromProjection(input: {
  state: EditorState
  scriptState: ScriptEditorState
  commandVisits: readonly CanonicalScriptCommandVisit[]
  transitionVisits: readonly CanonicalScriptTransitionVisit[]
  entityAddressReferences: readonly EntityAddressReference[]
  assetReferences: readonly LocatedAssetReference[]
  canonicalAssetReferences: readonly CanonicalAssetReferenceEntry[]
  worldVariableReferences: WorldVariableReferenceIndexV1
  canonicalSchemeReferences: CanonicalSchemeReferenceIndexes
  sharedScriptReferences: readonly CanonicalSharedScriptReferenceEntry[]
}): ProjectReferenceSnapshotV1 {
  return buildProjectReferenceSnapshot(
    [
      ...structuralProjectReferenceEdges(input.state),
      ...canonicalCommandTargetEdges(input.commandVisits, input.scriptState),
      ...legacyScriptChunkTargetEdges(input.state.scriptChunks),
      ...battleDataReferenceEdges(input.state, input.commandVisits, input.scriptState),
      ...actorReferenceEdges(
        input.state,
        input.commandVisits,
        input.transitionVisits,
        input.scriptState,
      ),
      ...itemReferenceEdges(
        input.state,
        input.commandVisits,
        input.transitionVisits,
        input.scriptState,
      ),
      ...spriteReferenceEdges(input.state, input.commandVisits, input.scriptState),
      ...assetReferenceEdges(
        input.state,
        input.assetReferences,
        input.canonicalAssetReferences,
        input.scriptState,
      ),
      ...worldVariableReferenceEdges(input.worldVariableReferences, input.scriptState),
      ...canonicalSchemeReferenceEdges(input.canonicalSchemeReferences, input.scriptState),
      ...sharedScriptReferenceEdges(input.sharedScriptReferences, input.scriptState),
      ...entityAddressReferenceEdges(input.entityAddressReferences),
    ],
    { assumeUnique: true },
  )
}

/** Synchronous current-author oracle for save and destructive command boundaries. */
export function collectCurrentProjectReferenceIndex(
  state: EditorState,
  canonical?: ScriptEditorState,
): ProjectReferenceIndex {
  const author = canonical ? projectCurrentAuthorReferenceSlices(canonical, state) : state
  const currentAuthorState: EditorState = {
    ...state,
    scenes: author.scenes as EditorState['scenes'],
    items: author.items as EditorState['items'],
    sharedScripts: author.sharedScripts as EditorState['sharedScripts'],
  }
  const scriptState = canonical
    ? scriptEditorStateFromCurrentAuthorSlices(canonical, author)
    : worldVariableScriptStateFromEditorStateV1(currentAuthorState)
  const commandVisits = collectCanonicalScriptCommandVisits(scriptState)
  const transitionVisits = collectCanonicalScriptTransitionVisits(scriptState)
  const entityAddressReferences = collectEntityAddressReferences(currentAuthorState)
  const assetReferences = collectEditorAssetReferences(currentAuthorState, undefined, {
    includeCanonicalAuthorCommands: false,
  })
  const canonicalAssetReferences = collectCanonicalAssetReferenceEntries(commandVisits)
  const worldVariableReferences = collectWorldVariableReferencesV1FromVisits(
    scriptState,
    commandVisits,
  )
  const canonicalSchemeReferences = buildCanonicalSchemeReferenceIndexesFromVisits(
    scriptState,
    commandVisits,
  )
  const sharedScriptReferences = collectCanonicalSharedScriptReferencesFromVisits(
    scriptState,
    commandVisits,
  )
  return createProjectReferenceIndex(
    buildProjectReferenceSnapshotFromProjection({
      state: currentAuthorState,
      scriptState,
      commandVisits,
      transitionVisits,
      entityAddressReferences,
      assetReferences,
      canonicalAssetReferences,
      worldVariableReferences,
      canonicalSchemeReferences,
      sharedScriptReferences,
    }),
  )
}

export type CurrentProjectReferenceIndexProvider = (state: EditorState) => ProjectReferenceIndex

export function createCurrentProjectReferenceIndexProvider(
  getCanonical: () => ScriptEditorState,
): CurrentProjectReferenceIndexProvider {
  return (state) => collectCurrentProjectReferenceIndex(state, getCanonical())
}

export function collectCurrentProjectDeletionImpact(
  provider: CurrentProjectReferenceIndexProvider,
  state: EditorState,
  target: ProjectReferenceTarget,
  deletedTargets: readonly ProjectReferenceTarget[] = [target],
) {
  const index = provider(state)
  return index.deletionImpact(target, index.deletionScopeFor(deletedTargets))
}
