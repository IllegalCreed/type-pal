import {
  actorConditionPoisonReferenceAtNode,
  type CommandTargetReference,
  collectActorConditionPoisonReferences,
  collectCanonicalCommandTargetReferences,
  collectCommandTargetReferences,
  collectWorldBattleDataReferences,
  DEFAULT_BATTLE_FIELD_ID,
} from '@type-pal/content'
import { type BattleDataReference, collectBattleDataReferences } from './battle-data-references.js'
import type { EditorState } from './edit-session.js'
import {
  collectEntityAddressReferences,
  type EntityAddressReference,
  type EntityAddressReferenceLocator,
} from './entity-address-references.js'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceIndex,
  createProjectReferenceSource,
  type ProjectReferenceEdgeInput,
  type ProjectReferenceIndex,
  type ProjectReferenceLocator,
  type ProjectReferenceSnapshotV1,
  type ProjectReferenceSource,
  type ProjectReferenceTarget,
} from './project-reference.js'
import type {
  CanonicalScriptCommandVisit,
  ScriptCommandOwner,
  ScriptEditorState,
} from './script-editor.js'
import { collectCanonicalScriptCommandVisits, describeScriptCommandOwner } from './script-editor.js'
import {
  projectCurrentAuthorReferenceSlices,
  scriptEditorStateFromCurrentAuthorSlices,
} from './script-editor-projection.js'
import { worldVariableScriptStateFromEditorStateV1 } from './world-variable-references.js'

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
  scriptState?: ScriptEditorState,
): ProjectReferenceSource {
  return createProjectReferenceSource(
    { kind: 'script-owner', owner },
    scriptState ? describeScriptCommandOwner(scriptState, owner) : `脚本 ${owner.kind}`,
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
      kind !== 'selectSceneHooks' &&
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
  for (const entry of state.manifest.entryPoints) {
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
  entityAddressReferences: readonly EntityAddressReference[]
}): ProjectReferenceSnapshotV1 {
  return buildProjectReferenceSnapshot(
    [
      ...structuralProjectReferenceEdges(input.state),
      ...canonicalCommandTargetEdges(input.commandVisits, input.scriptState),
      ...legacyScriptChunkTargetEdges(input.state.scriptChunks),
      ...battleDataReferenceEdges(input.state, input.commandVisits, input.scriptState),
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
  const entityAddressReferences = collectEntityAddressReferences(currentAuthorState)
  return createProjectReferenceIndex(
    buildProjectReferenceSnapshotFromProjection({
      state: currentAuthorState,
      scriptState,
      commandVisits,
      entityAddressReferences,
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
