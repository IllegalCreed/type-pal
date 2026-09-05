import type {
  AuthorCondition,
  AuthorScriptFlow,
  WorldVariableKindV1,
  WorldVariableRegistryV1,
} from '@type-pal/content'
import type { EditorState } from './edit-session.js'
import type {
  CanonicalScriptCommandVisit,
  CanonicalScriptReference,
  ScriptCommandLocator,
  ScriptCommandOwner,
  ScriptEditorState,
} from './script-editor.js'
import { collectCanonicalScriptCommandVisits } from './script-editor.js'

type AuthorStateTransition = Extract<
  AuthorScriptFlow,
  { kind: 'stateMachine' }
>['machine']['states'][string]['next']

export type WorldVariableAccessV1 = 'read' | 'write'

export interface WorldVariableReferenceV1 {
  id: string
  kind: WorldVariableKindV1
  access: WorldVariableAccessV1
  detail: string
  path: string
  owner: ScriptCommandOwner
  ownerLabel: string
  sourceLabel: string
  /** command-backed occurrences can open exactly; state transition conditions stay static. */
  reference?: CanonicalScriptReference
}

export interface WorldVariableReferenceIndexV1 {
  all: readonly WorldVariableReferenceV1[]
  byId: ReadonlyMap<string, readonly WorldVariableReferenceV1[]>
}

export interface WorldVariableRegistryIssueV1 {
  code: 'undeclared' | 'kind-mismatch' | 'kind-conflict'
  id: string
  message: string
  path: string
}

export function worldVariableScriptStateFromEditorStateV1(
  state: Pick<EditorState, 'scenes' | 'items' | 'sharedScripts'>,
): ScriptEditorState {
  return {
    scenes: state.scenes as unknown as ScriptEditorState['scenes'],
    items: state.items as unknown as ScriptEditorState['items'],
    sharedScripts: (state.sharedScripts ?? {}) as unknown as ScriptEditorState['sharedScripts'],
  }
}

function ownerLabel(state: ScriptEditorState, owner: ScriptCommandOwner): string {
  if (owner.kind === 'shared-script')
    return `可复用脚本 · ${state.sharedScripts[owner.scriptId]?.name ?? owner.scriptId}`
  if (owner.kind === 'item-private-script')
    return `物品 ${owner.itemId} · ${owner.ability === 'use' ? '使用' : '投掷'}脚本`
  if (owner.kind === 'scene-hook')
    return `场景 ${owner.sceneId} · ${owner.slot === 'onEnter' ? '进入场景' : '传送出口'}`
  if (owner.kind === 'entity-hostile-on-lose')
    return `场景 ${owner.sceneId} · 实体 ${owner.entityId} · 战败处理`
  return `场景 ${owner.sceneId} · 实体 ${owner.entityId} · ${owner.channel === 'trigger' ? '交互' : '自动'}脚本`
}

function sourceLabel(owner: ScriptCommandOwner): string {
  if (owner.kind === 'shared-script') return owner.scriptId
  if (owner.kind === 'item-private-script') return `${owner.itemId}/${owner.scriptId}`
  if (owner.kind === 'scene-hook') return `${owner.sceneId}/${owner.slot}/${owner.hookId}`
  if (owner.kind === 'entity-hostile-on-lose') return `${owner.sceneId}/${owner.entityId}/onLose`
  return `${owner.sceneId}/${owner.entityId}/${owner.channel}/${owner.behaviorId}`
}

function isInternalId(id: string): boolean {
  return id.startsWith('sys:')
}

function collectCondition(
  condition: AuthorCondition,
  path: string,
  owner: ScriptCommandOwner,
  state: ScriptEditorState,
  output: WorldVariableReferenceV1[],
  locator?: ScriptCommandLocator,
): void {
  if (condition.kind === 'flag' && !isInternalId(condition.flag))
    output.push({
      id: condition.flag,
      kind: 'flag',
      access: 'read',
      detail: `is ${String(condition.is)}`,
      path,
      owner,
      ownerLabel: ownerLabel(state, owner),
      sourceLabel: sourceLabel(owner),
      ...(locator ? { reference: { kind: 'command', path, locator } } : {}),
    })
  else if (condition.kind === 'var' && !isInternalId(condition.var))
    output.push({
      id: condition.var,
      kind: 'number',
      access: 'read',
      detail: `${condition.op} ${condition.value}`,
      path,
      owner,
      ownerLabel: ownerLabel(state, owner),
      sourceLabel: sourceLabel(owner),
      ...(locator ? { reference: { kind: 'command', path, locator } } : {}),
    })
  else if (condition.kind === 'all' || condition.kind === 'any')
    condition.of.forEach((child, index) => {
      collectCondition(child, `${path}.${condition.kind}[${index}]`, owner, state, output, locator)
    })
  else if (condition.kind === 'not')
    collectCondition(condition.cond, `${path}.not`, owner, state, output, locator)
}

function collectTransition(
  transition: AuthorStateTransition,
  path: string,
  owner: ScriptCommandOwner,
  state: ScriptEditorState,
  output: WorldVariableReferenceV1[],
): void {
  if (transition.kind === 'branch') {
    collectCondition(transition.cond, `${path}.cond`, owner, state, output)
    collectTransition(transition.then, `${path}.then`, owner, state, output)
    collectTransition(transition.else, `${path}.else`, owner, state, output)
  } else if (transition.kind === 'commandOutcome') {
    collectTransition(transition.then, `${path}.then`, owner, state, output)
    collectTransition(transition.else, `${path}.else`, owner, state, output)
  }
}

function collectFlowTransitions(
  flow: AuthorScriptFlow,
  path: string,
  owner: ScriptCommandOwner,
  state: ScriptEditorState,
  output: WorldVariableReferenceV1[],
): void {
  if (flow.kind !== 'stateMachine') return
  for (const [stateId, machineState] of Object.entries(flow.machine.states))
    collectTransition(
      machineState.next,
      `${path}.machine.states.${stateId}.next`,
      owner,
      state,
      output,
    )
}

function collectAllTransitionConditions(
  state: ScriptEditorState,
  output: WorldVariableReferenceV1[],
): void {
  for (const scene of state.scenes) {
    for (const entity of scene.entities) {
      for (const channel of ['trigger', 'auto'] as const) {
        for (const [behaviorId, behavior] of Object.entries(entity.behaviors?.[channel] ?? {})) {
          const owner: ScriptCommandOwner = {
            kind: 'entity-behavior',
            sceneId: scene.id,
            entityId: entity.id,
            channel,
            behaviorId,
          }
          collectFlowTransitions(
            behavior.flow,
            `scenes.${scene.id}.entities.${entity.id}.behaviors.${channel}.${behaviorId}.flow`,
            owner,
            state,
            output,
          )
        }
      }
    }
    for (const slot of ['onEnter', 'onTeleport'] as const) {
      for (const [hookId, hook] of Object.entries(scene.hooks?.[slot]?.variants ?? {})) {
        const owner: ScriptCommandOwner = {
          kind: 'scene-hook',
          sceneId: scene.id,
          slot,
          hookId,
        }
        collectFlowTransitions(
          hook.flow,
          `scenes.${scene.id}.hooks.${slot}.variants.${hookId}.flow`,
          owner,
          state,
          output,
        )
      }
    }
  }
}

/** canonical collector；迁移 seed、保存门、删除保护与 UI 必须全部消费本函数。 */
export function collectWorldVariableReferencesV1FromVisits(
  state: ScriptEditorState,
  visits: readonly CanonicalScriptCommandVisit[],
): WorldVariableReferenceIndexV1 {
  const all: WorldVariableReferenceV1[] = []
  for (const { command, path, locator } of visits) {
    const base = {
      owner: locator.owner,
      ownerLabel: ownerLabel(state, locator.owner),
      sourceLabel: sourceLabel(locator.owner),
      reference: { kind: 'command', path, locator } as CanonicalScriptReference,
    }
    if (command.kind === 'setFlag' && !isInternalId(command.flag))
      all.push({
        ...base,
        id: command.flag,
        kind: 'flag',
        access: 'write',
        detail: `= ${String(command.value)}`,
        path: `${path}.flag`,
      })
    else if (command.kind === 'setVar' && !isInternalId(command.var))
      all.push({
        ...base,
        id: command.var,
        kind: 'number',
        access: 'write',
        detail: `= ${command.value}`,
        path: `${path}.var`,
      })
    else if (command.kind === 'addVar' && !isInternalId(command.var))
      all.push({
        ...base,
        id: command.var,
        kind: 'number',
        access: 'write',
        detail: `${command.delta >= 0 ? '+' : ''}= ${command.delta}`,
        path: `${path}.var`,
      })
    if (command.kind === 'branch' || command.kind === 'loop')
      collectCondition(command.cond, `${path}.cond`, locator.owner, state, all, locator)
  }
  collectAllTransitionConditions(state, all)
  all.sort((left, right) => left.path.localeCompare(right.path))
  const mutable = new Map<string, WorldVariableReferenceV1[]>()
  for (const reference of all) {
    const entries = mutable.get(reference.id)
    if (entries) entries.push(reference)
    else mutable.set(reference.id, [reference])
  }
  return { all, byId: mutable }
}

export function collectWorldVariableReferencesV1(
  state: ScriptEditorState,
): WorldVariableReferenceIndexV1 {
  return collectWorldVariableReferencesV1FromVisits(
    state,
    collectCanonicalScriptCommandVisits(state),
  )
}

/** 从引用索引生成作者变量登记表；同一 id 跨类型使用时立即停线。 */
export function buildWorldVariableRegistryFromReferencesV1(
  index: WorldVariableReferenceIndexV1,
): WorldVariableRegistryV1 {
  const registry: WorldVariableRegistryV1 = {}
  for (const [id, references] of index.byId) {
    const kinds = new Set(references.map((reference) => reference.kind))
    if (kinds.size !== 1)
      throw new Error(`世界变量 "${id}" 同时按 flag 与 number 使用，无法自动迁移`)
    const kind = references[0]!.kind
    registry[id] =
      kind === 'flag'
        ? { kind, name: id, description: '', initial: false }
        : { kind, name: id, description: '', initial: 0 }
  }
  return registry
}

export function collectWorldVariableRegistryIssuesV1(
  registry: WorldVariableRegistryV1,
  index: WorldVariableReferenceIndexV1,
): WorldVariableRegistryIssueV1[] {
  const issues: WorldVariableRegistryIssueV1[] = []
  for (const [id, references] of index.byId) {
    const kinds = new Set(references.map((reference) => reference.kind))
    if (kinds.size > 1) {
      issues.push({
        code: 'kind-conflict',
        id,
        message: `变量 "${id}" 同时按开关与数值使用`,
        path: references[0]!.path,
      })
      continue
    }
    const definition = registry[id]
    if (!definition) {
      issues.push({
        code: 'undeclared',
        id,
        message: `变量 "${id}" 未在 worldVariables 登记`,
        path: references[0]!.path,
      })
      continue
    }
    const usedKind = references[0]!.kind
    if (definition.kind !== usedKind)
      issues.push({
        code: 'kind-mismatch',
        id,
        message: `变量 "${id}" 定义为 ${definition.kind}，脚本按 ${usedKind} 使用`,
        path: references[0]!.path,
      })
  }
  return issues
}
