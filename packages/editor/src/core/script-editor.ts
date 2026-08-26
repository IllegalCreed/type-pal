import type {
  AuthorItemData,
  AuthorCommand,
  AuthorSceneDef,
  AuthorScriptLibrary,
  EntityAddress,
  FlowCursor,
  AuthorScriptFlow,
  Selection,
  TriggerActivation,
} from '@type-pal/content'
import {
  checkAuthorScriptLibrary,
  validateAuthorItems,
  validateAuthorScenes,
} from '@type-pal/content'
import { getAuthorCommandAt, parseAuthorCommandPath } from './author-command-edit.js'

type AuthorSceneEntityDef = AuthorSceneDef['entities'][number]
type AuthorHostileBehavior = NonNullable<AuthorSceneEntityDef['hostile']>
type AuthorEntityBehavior = NonNullable<
  NonNullable<AuthorSceneEntityDef['behaviors']>['trigger']
>[string]
type AuthorSceneHook = NonNullable<
  NonNullable<NonNullable<AuthorSceneDef['hooks']>['onEnter']>['variants']
>[string]
type AuthorSharedScript = AuthorScriptLibrary[string]
type AuthorStateTransition = Extract<
  AuthorScriptFlow,
  { kind: 'stateMachine' }
>['machine']['states'][string]['next']

export interface ScriptEditorState {
  scenes: AuthorSceneDef[]
  items: AuthorItemData[]
  sharedScripts: AuthorScriptLibrary
}

export interface ScriptEditorAffectedRecords {
  /** Cross-record rewrites (for example a semantic id rename) require a full script refresh. */
  all?: true
  scenes?: readonly string[]
  items?: readonly string[]
  sharedScripts?: readonly string[]
}

export interface ScriptEditorCommand {
  readonly label: string
  readonly affectedRecords: ScriptEditorAffectedRecords
  apply(state: ScriptEditorState): ScriptEditorState
  invert(state: ScriptEditorState): ScriptEditorState
}

export interface ScriptTransactionReceipt {
  /** 仅供跨 session coordinator 的同步失败回滚；不进入 redo。 */
  rollback(): void
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function sameAddress(left: EntityAddress, right: EntityAddress): boolean {
  return left.scene === right.scene && left.entity === right.entity
}

export type SceneHookSlot = 'onEnter' | 'onTeleport'

export type ScriptCommandOwner =
  | {
      kind: 'entity-behavior'
      sceneId: string
      entityId: string
      channel: 'trigger' | 'auto'
      behaviorId: string
    }
  | {
      kind: 'scene-hook'
      sceneId: string
      slot: SceneHookSlot
      hookId: string
    }
  | {
      kind: 'entity-hostile-on-lose'
      sceneId: string
      entityId: string
    }
  | {
      kind: 'item-private-script'
      itemId: string
      ability: 'use' | 'throw'
      scriptId: string
    }
  | { kind: 'shared-script'; scriptId: string }

export type ScriptCommandContainer =
  | { kind: 'step'; stepId: string; section: 'prepare' | 'body' }
  | {
      kind: 'state'
      machineId: string
      stateId: string
      section: 'prepare' | 'body'
    }
  | { kind: 'body' }

export interface ScriptCommandLocator {
  kind: 'command'
  owner: ScriptCommandOwner
  container: ScriptCommandContainer
  /** 相对当前 prepare/body 的 canonical 指令路径，例如 `0/then/1`。 */
  commandPath: string
}

export type ScriptReferenceLocator =
  | ScriptCommandLocator
  | {
      kind: 'entity-page'
      sceneId: string
      entityId: string
      pageId: string
      channel: 'trigger' | 'auto'
    }
  | {
      kind: 'scene-hook-initial'
      sceneId: string
      slot: SceneHookSlot
      hookId: string
    }

function sceneById(state: ScriptEditorState, sceneId: string): AuthorSceneDef {
  const scene = state.scenes.find((candidate) => candidate.id === sceneId)
  if (!scene) throw new Error(`场景不存在 ${sceneId}`)
  return scene
}

function sceneAndEntity(state: ScriptEditorState, target: EntityAddress) {
  const scene = sceneById(state, target.scene)
  const entity = scene.entities.find((candidate) => candidate.id === target.entity)
  if (!entity) throw new Error(`实体不存在 ${target.scene}/${target.entity}`)
  return { scene, entity }
}

function behaviorRegistry(
  state: ScriptEditorState,
  target: EntityAddress,
  channel: 'trigger' | 'auto',
) {
  const { entity } = sceneAndEntity(state, target)
  return entity.behaviors?.[channel]
}

function behavior(
  state: ScriptEditorState,
  target: EntityAddress,
  channel: 'trigger' | 'auto',
  behaviorId: string,
): AuthorEntityBehavior {
  const value = behaviorRegistry(state, target, channel)?.[behaviorId]
  if (!value)
    throw new Error(`behavior 不存在 ${target.scene}/${target.entity}/${channel}/${behaviorId}`)
  return value
}

function checkBehaviorId(id: string): void {
  if (!id.trim()) throw new Error('BehaviorId 不能为空')
  if (id.includes('/') || id.includes('\\') || id.includes('\0'))
    throw new Error(`BehaviorId 非法 ${id}`)
}

function checkHookId(id: string): void {
  if (!id.trim()) throw new Error('HookId 不能为空')
  if (id.includes('/') || id.includes('\\') || id.includes('\0'))
    throw new Error(`HookId 非法 ${id}`)
}

function checkScriptId(id: string): void {
  if (!id.trim()) throw new Error('ScriptId 不能为空')
  if (id.includes('\\') || id.includes('\0') || id.startsWith('/') || id.endsWith('/'))
    throw new Error(`ScriptId 非法 ${id}`)
}

function walkCommands(
  commands: AuthorCommand[],
  visit: (command: AuthorCommand, path: string, locator: ScriptCommandLocator) => void,
  path: string,
  owner: ScriptCommandOwner,
  container: ScriptCommandContainer,
  parentCommandPath: readonly (number | string)[] = [],
): void {
  for (const [index, command] of commands.entries()) {
    const commandPath = `${path}[${index}]`
    const locatorPath = [...parentCommandPath, index]
    visit(command, commandPath, {
      kind: 'command',
      owner,
      container,
      commandPath: locatorPath.join('/'),
    })
    switch (command.kind) {
      case 'branch':
        walkCommands(command.then, visit, `${commandPath}.then`, owner, container, [
          ...locatorPath,
          'then',
        ])
        walkCommands(command.else ?? [], visit, `${commandPath}.else`, owner, container, [
          ...locatorPath,
          'else',
        ])
        break
      case 'loop':
        walkCommands(command.body, visit, `${commandPath}.body`, owner, container, [
          ...locatorPath,
          'body',
        ])
        break
      case 'confirm':
        walkCommands(command.onNo, visit, `${commandPath}.onNo`, owner, container, [
          ...locatorPath,
          'onNo',
        ])
        break
      case 'startBattle':
        walkCommands(command.onLose ?? [], visit, `${commandPath}.onLose`, owner, container, [
          ...locatorPath,
          'onLose',
        ])
        walkCommands(command.onFlee ?? [], visit, `${commandPath}.onFlee`, owner, container, [
          ...locatorPath,
          'onFlee',
        ])
        break
      case 'teleportOut':
        walkCommands(command.onFail ?? [], visit, `${commandPath}.onFail`, owner, container, [
          ...locatorPath,
          'onFail',
        ])
        break
    }
  }
}

function walkFlowCommands(
  flow: AuthorScriptFlow,
  visit: (command: AuthorCommand, path: string, locator: ScriptCommandLocator) => void,
  path: string,
  owner: ScriptCommandOwner,
): void {
  if (flow.kind === 'stages') {
    for (const stage of flow.stages) {
      walkCommands(
        stage.entry?.prepare ?? [],
        visit,
        `${path}.stages.${stage.id}.entry.prepare`,
        owner,
        { kind: 'step', stepId: stage.id, section: 'prepare' },
      )
      walkCommands(stage.body, visit, `${path}.stages.${stage.id}.body`, owner, {
        kind: 'step',
        stepId: stage.id,
        section: 'body',
      })
    }
    return
  }
  for (const [stateId, state] of Object.entries(flow.machine.states)) {
    walkCommands(
      state.entry?.prepare ?? [],
      visit,
      `${path}.machine.states.${stateId}.entry.prepare`,
      owner,
      {
        kind: 'state',
        machineId: flow.machine.id,
        stateId,
        section: 'prepare',
      },
    )
    walkCommands(state.body, visit, `${path}.machine.states.${stateId}.body`, owner, {
      kind: 'state',
      machineId: flow.machine.id,
      stateId,
      section: 'body',
    })
  }
}

export function visitCanonicalScriptCommands(
  state: ScriptEditorState,
  visit: (command: AuthorCommand, path: string, locator: ScriptCommandLocator) => void,
): void {
  for (const scene of state.scenes) {
    for (const entity of scene.entities) {
      for (const channel of ['trigger', 'auto'] as const) {
        for (const [id, value] of Object.entries(entity.behaviors?.[channel] ?? {}))
          walkFlowCommands(
            value.flow,
            visit,
            `scenes.${scene.id}.entities.${entity.id}.behaviors.${channel}.${id}.flow`,
            {
              kind: 'entity-behavior',
              sceneId: scene.id,
              entityId: entity.id,
              channel,
              behaviorId: id,
            },
          )
      }
      if (Array.isArray(entity.hostile?.onLose))
        walkCommands(
          entity.hostile.onLose,
          visit,
          `scenes.${scene.id}.entities.${entity.id}.hostile.onLose`,
          {
            kind: 'entity-hostile-on-lose',
            sceneId: scene.id,
            entityId: entity.id,
          },
          { kind: 'body' },
        )
    }
    for (const slot of ['onEnter', 'onTeleport'] as const) {
      for (const [id, value] of Object.entries(scene.hooks?.[slot]?.variants ?? {}))
        walkFlowCommands(
          value.flow,
          visit,
          `scenes.${scene.id}.hooks.${slot}.variants.${id}.flow`,
          { kind: 'scene-hook', sceneId: scene.id, slot, hookId: id },
        )
    }
  }
  for (const item of state.items) {
    for (const [index, effect] of (item.use?.effects ?? []).entries()) {
      if (effect.kind === 'itemPrivateScript')
        walkCommands(
          effect.script.body,
          visit,
          `items.${item.id}.use.effects[${index}].script.body`,
          {
            kind: 'item-private-script',
            itemId: item.id,
            ability: 'use',
            scriptId: effect.script.id,
          },
          { kind: 'body' },
        )
    }
  }
  for (const [id, script] of Object.entries(state.sharedScripts))
    walkCommands(
      script.body,
      visit,
      `sharedScripts.${id}.body`,
      { kind: 'shared-script', scriptId: id },
      { kind: 'body' },
    )
}

export interface CanonicalScriptCommandVisit {
  command: AuthorCommand
  path: string
  locator: ScriptCommandLocator
}

/** Materialize one canonical command walk so every derived index for a revision can reuse it. */
export function collectCanonicalScriptCommandVisits(
  state: ScriptEditorState,
): CanonicalScriptCommandVisit[] {
  const visits: CanonicalScriptCommandVisit[] = []
  visitCanonicalScriptCommands(state, (command, path, locator) => {
    visits.push({ command, path, locator })
  })
  return visits
}

function mapCommands(
  commands: AuthorCommand[],
  map: (command: AuthorCommand) => AuthorCommand,
): AuthorCommand[] {
  return commands.map((raw) => {
    let command = clone(raw)
    switch (command.kind) {
      case 'branch':
        command = {
          ...command,
          then: mapCommands(command.then, map),
          ...(command.else ? { else: mapCommands(command.else, map) } : {}),
        }
        break
      case 'loop':
        command = { ...command, body: mapCommands(command.body, map) }
        break
      case 'confirm':
        command = { ...command, onNo: mapCommands(command.onNo, map) }
        break
      case 'startBattle':
        command = {
          ...command,
          ...(command.onLose ? { onLose: mapCommands(command.onLose, map) } : {}),
          ...(command.onFlee ? { onFlee: mapCommands(command.onFlee, map) } : {}),
        }
        break
      case 'teleportOut':
        command = {
          ...command,
          ...(command.onFail ? { onFail: mapCommands(command.onFail, map) } : {}),
        }
        break
    }
    return map(command)
  })
}

function mapFlowCommands(
  flow: AuthorScriptFlow,
  map: (command: AuthorCommand) => AuthorCommand,
): AuthorScriptFlow {
  if (flow.kind === 'stages')
    return {
      ...clone(flow),
      stages: flow.stages.map((stage) => ({
        ...clone(stage),
        ...(stage.entry
          ? {
              entry: {
                ...clone(stage.entry),
                prepare: mapCommands(stage.entry.prepare, map),
              },
            }
          : {}),
        body: mapCommands(stage.body, map),
      })),
    }
  return {
    kind: 'stateMachine',
    machine: {
      ...clone(flow.machine),
      states: Object.fromEntries(
        Object.entries(flow.machine.states).map(([id, machineState]) => [
          id,
          {
            ...clone(machineState),
            ...(machineState.entry
              ? {
                  entry: {
                    ...clone(machineState.entry),
                    prepare: mapCommands(machineState.entry.prepare, map),
                  },
                }
              : {}),
            body: mapCommands(machineState.body, map),
          },
        ]),
      ),
    },
  }
}

function mapAllCommands(
  state: ScriptEditorState,
  map: (command: AuthorCommand) => AuthorCommand,
): void {
  for (const scene of state.scenes) {
    for (const entity of scene.entities) {
      for (const channel of ['trigger', 'auto'] as const) {
        const registry = entity.behaviors?.[channel]
        if (!registry) continue
        for (const value of Object.values(registry)) value.flow = mapFlowCommands(value.flow, map)
      }
      if (Array.isArray(entity.hostile?.onLose))
        entity.hostile.onLose = mapCommands(entity.hostile.onLose, map)
    }
    for (const slot of ['onEnter', 'onTeleport'] as const) {
      for (const value of Object.values(scene.hooks?.[slot]?.variants ?? {}))
        value.flow = mapFlowCommands(value.flow, map)
    }
  }
  for (const item of state.items) {
    for (const effect of item.use?.effects ?? [])
      if (effect.kind === 'itemPrivateScript')
        effect.script.body = mapCommands(effect.script.body, map)
  }
  for (const script of Object.values(state.sharedScripts))
    script.body = mapCommands(script.body, map)
}

export type ScriptReference =
  | {
      kind: 'page'
      path: string
      locator: Extract<ScriptReferenceLocator, { kind: 'entity-page' }>
    }
  | { kind: 'command'; path: string; locator: ScriptCommandLocator }

export interface ScriptReferenceIssue {
  severity: 'error'
  path: string
  message: string
}

/**
 * 当前共享脚本引用闭包。`__author-script-runtime` ScriptRef 只是 UI/宿主投影，
 * 不能拿旧 ScriptChunk 校验器判断；真正的作者引用必须在这里按稳定 ScriptId 对 sharedScripts 验证。
 */
export function collectScriptReferenceIssuesFromVisits(
  state: ScriptEditorState,
  visits: readonly CanonicalScriptCommandVisit[],
): ScriptReferenceIssue[] {
  const issues: ScriptReferenceIssue[] = []
  const sharedIds = new Set(Object.keys(state.sharedScripts))
  const check = (scriptId: string, path: string): void => {
    if (!sharedIds.has(scriptId))
      issues.push({
        severity: 'error',
        path,
        message: `共享脚本 "${scriptId}" 不在当前脚本库`,
      })
  }
  for (const item of state.items) {
    for (const [index, effect] of (item.use?.effects ?? []).entries()) {
      if (effect.kind === 'runScript')
        check(effect.script, `items.${item.id}.use.effects[${index}].script`)
    }
  }
  for (const { command, path } of visits) {
    if (command.kind === 'callScript') check(command.script, `${path}.script`)
    if (command.kind !== 'selectEntityBehavior') continue
    const scene = state.scenes.find((candidate) => candidate.id === command.target.scene)
    const entity = scene?.entities.find((candidate) => candidate.id === command.target.entity)
    if (!entity) {
      issues.push({
        severity: 'error',
        path: `${path}.target`,
        message: `实体 "${command.target.scene}/${command.target.entity}" 不存在`,
      })
      continue
    }
    const registry = entity.behaviors?.[command.channel]
    const selected =
      command.selection.kind === 'use' ? registry?.[command.selection.value] : undefined
    if (command.selection.kind === 'use' && !selected)
      issues.push({
        severity: 'error',
        path: `${path}.selection.value`,
        message: `${command.channel} behavior "${command.selection.value}" 不存在`,
      })
    if (!command.cursorHandoff) continue
    const source = registry?.[command.cursorHandoff.fromBehavior]
    if (!source)
      issues.push({
        severity: 'error',
        path: `${path}.cursorHandoff.fromBehavior`,
        message: `${command.channel} 来源 behavior "${command.cursorHandoff.fromBehavior}" 不存在`,
      })
    for (const [index, mapping] of command.cursorHandoff.cases.entries()) {
      if (source && !flowContainsCursor(source.flow, mapping.from))
        issues.push({
          severity: 'error',
          path: `${path}.cursorHandoff.cases[${index}].from`,
          message: '来源游标不属于来源 behavior',
        })
      if (selected && !flowContainsCursor(selected.flow, mapping.to))
        issues.push({
          severity: 'error',
          path: `${path}.cursorHandoff.cases[${index}].to`,
          message: '目标游标不属于目标 behavior',
        })
    }
  }
  return issues
}

export function collectScriptReferenceIssues(state: ScriptEditorState): ScriptReferenceIssue[] {
  return collectScriptReferenceIssuesFromVisits(state, collectCanonicalScriptCommandVisits(state))
}

function flowContainsCursor(flow: AuthorScriptFlow, cursor: FlowCursor): boolean {
  if (flow.kind === 'stages')
    return cursor.kind === 'stage' && flow.stages.some((stage) => stage.id === cursor.stage)
  return (
    cursor.kind === 'state' &&
    cursor.machine === flow.machine.id &&
    Object.hasOwn(flow.machine.states, cursor.state)
  )
}

export function behaviorReferences(
  state: ScriptEditorState,
  target: EntityAddress,
  channel: 'trigger' | 'auto',
  behaviorId: string,
): ScriptReference[] {
  const references: ScriptReference[] = []
  const { entity } = sceneAndEntity(state, target)
  for (const page of entity.pages ?? []) {
    if (page[channel] === behaviorId)
      references.push({
        kind: 'page',
        path: `scenes.${target.scene}.entities.${target.entity}.pages.${page.id}.${channel}`,
        locator: {
          kind: 'entity-page',
          sceneId: target.scene,
          entityId: target.entity,
          pageId: page.id,
          channel,
        },
      })
  }
  visitCanonicalScriptCommands(state, (command, path, locator) => {
    if (
      command.kind !== 'selectEntityBehavior' ||
      !sameAddress(command.target, target) ||
      command.channel !== channel
    )
      return
    const selectionMatches =
      command.selection.kind === 'use' && command.selection.value === behaviorId
    if (selectionMatches) references.push({ kind: 'command', path, locator })
    if (!selectionMatches && command.cursorHandoff?.fromBehavior === behaviorId)
      references.push({
        kind: 'command',
        path: `${path}.cursorHandoff.fromBehavior`,
        locator,
      })
  })
  return references
}

export type SceneHookReference =
  | {
      kind: 'initial'
      path: string
      locator: Extract<ScriptReferenceLocator, { kind: 'scene-hook-initial' }>
    }
  | { kind: 'command'; path: string; locator: ScriptCommandLocator }

export type CanonicalScriptReference = ScriptReference | SceneHookReference

function sceneHook(
  state: ScriptEditorState,
  sceneId: string,
  slot: SceneHookSlot,
  hookId: string,
): AuthorSceneHook {
  const value = sceneById(state, sceneId).hooks?.[slot]?.variants[hookId]
  if (!value) throw new Error(`hook 不存在 ${sceneId}/${slot}/${hookId}`)
  return value
}

export function sceneHookReferences(
  state: ScriptEditorState,
  sceneId: string,
  slot: SceneHookSlot,
  hookId: string,
): SceneHookReference[] {
  const references: SceneHookReference[] = []
  const scene = sceneById(state, sceneId)
  if (scene.hooks?.[slot]?.initial === hookId)
    references.push({
      kind: 'initial',
      path: `scenes.${sceneId}.hooks.${slot}.initial`,
      locator: { kind: 'scene-hook-initial', sceneId, slot, hookId },
    })
  visitCanonicalScriptCommands(state, (command, path, locator) => {
    const selection = command.kind === 'selectSceneHooks' ? command.selection[slot] : undefined
    if (
      command.kind === 'selectSceneHooks' &&
      command.scene === sceneId &&
      selection?.kind === 'use' &&
      selection.value === hookId
    )
      references.push({ kind: 'command', path, locator })
  })
  return references
}

export function canonicalBehaviorReferenceKey(
  target: EntityAddress,
  channel: 'trigger' | 'auto',
  behaviorId: string,
): string {
  return JSON.stringify([target.scene, target.entity, channel, behaviorId])
}

export function canonicalSceneHookReferenceKey(
  sceneId: string,
  slot: SceneHookSlot,
  hookId: string,
): string {
  return JSON.stringify([sceneId, slot, hookId])
}

export interface CanonicalSchemeReferenceIndexes {
  behavior: Map<string, CanonicalScriptReference[]>
  sceneHook: Map<string, CanonicalScriptReference[]>
}

/** Build all behavior/hook reverse references from the shared one-pass command materialization. */
export function buildCanonicalSchemeReferenceIndexesFromVisits(
  state: ScriptEditorState,
  visits: readonly CanonicalScriptCommandVisit[],
): CanonicalSchemeReferenceIndexes {
  const behavior = new Map<string, CanonicalScriptReference[]>()
  const sceneHook = new Map<string, CanonicalScriptReference[]>()
  const push = (
    index: Map<string, CanonicalScriptReference[]>,
    key: string,
    reference: CanonicalScriptReference,
  ): void => {
    index.set(key, [...(index.get(key) ?? []), reference])
  }

  for (const scene of state.scenes) {
    for (const entity of scene.entities) {
      for (const page of entity.pages ?? []) {
        for (const channel of ['trigger', 'auto'] as const) {
          const behaviorId = page[channel]
          if (!behaviorId) continue
          push(
            behavior,
            canonicalBehaviorReferenceKey(
              { scene: scene.id, entity: entity.id },
              channel,
              behaviorId,
            ),
            {
              kind: 'page',
              path: `scenes.${scene.id}.entities.${entity.id}.pages.${page.id}.${channel}`,
              locator: {
                kind: 'entity-page',
                sceneId: scene.id,
                entityId: entity.id,
                pageId: page.id,
                channel,
              },
            },
          )
        }
      }
    }
    for (const slot of ['onEnter', 'onTeleport'] as const) {
      const hookId = scene.hooks?.[slot]?.initial
      if (!hookId) continue
      push(sceneHook, canonicalSceneHookReferenceKey(scene.id, slot, hookId), {
        kind: 'initial',
        path: `scenes.${scene.id}.hooks.${slot}.initial`,
        locator: { kind: 'scene-hook-initial', sceneId: scene.id, slot, hookId },
      })
    }
  }

  for (const { command, path, locator } of visits) {
    if (command.kind === 'selectEntityBehavior') {
      const selectionId = command.selection.kind === 'use' ? command.selection.value : undefined
      if (selectionId)
        push(
          behavior,
          canonicalBehaviorReferenceKey(command.target, command.channel, selectionId),
          { kind: 'command', path, locator },
        )
      const sourceId = command.cursorHandoff?.fromBehavior
      if (sourceId && sourceId !== selectionId)
        push(behavior, canonicalBehaviorReferenceKey(command.target, command.channel, sourceId), {
          kind: 'command',
          path: `${path}.cursorHandoff.fromBehavior`,
          locator,
        })
    }
    if (command.kind !== 'selectSceneHooks') continue
    for (const slot of ['onEnter', 'onTeleport'] as const) {
      const selection = command.selection[slot]
      if (selection?.kind !== 'use') continue
      push(sceneHook, canonicalSceneHookReferenceKey(command.scene, slot, selection.value), {
        kind: 'command',
        path,
        locator,
      })
    }
  }
  return { behavior, sceneHook }
}

const COMMAND_PATH_LABELS: Readonly<Record<string, string>> = {
  then: '条件成立',
  else: '条件不成立',
  body: '循环内容',
  onNo: '选择“否”',
  onLose: '战败后',
  onFlee: '逃跑后',
  onFail: '失败后',
}

function commandPositionLabel(commandPath: string): string {
  return commandPath
    .split('/')
    .map((segment) => {
      const index = Number(segment)
      return Number.isInteger(index)
        ? `第 ${index + 1} 条指令`
        : (COMMAND_PATH_LABELS[segment] ?? segment)
    })
    .join(' / ')
}

function commandOwnerFlow(
  state: ScriptEditorState,
  owner: ScriptCommandOwner,
): AuthorScriptFlow | undefined {
  if (owner.kind === 'entity-behavior')
    return state.scenes
      .find((scene) => scene.id === owner.sceneId)
      ?.entities.find((entity) => entity.id === owner.entityId)?.behaviors?.[owner.channel]?.[
      owner.behaviorId
    ]?.flow
  if (owner.kind === 'scene-hook')
    return state.scenes.find((scene) => scene.id === owner.sceneId)?.hooks?.[owner.slot]?.variants[
      owner.hookId
    ]?.flow
  return undefined
}

function commandLocatorBody(
  state: ScriptEditorState,
  locator: ScriptCommandLocator,
): readonly AuthorCommand[] | undefined {
  const { owner, container } = locator
  if (owner.kind === 'shared-script')
    return container.kind === 'body' ? state.sharedScripts[owner.scriptId]?.body : undefined
  if (owner.kind === 'item-private-script') {
    if (container.kind !== 'body') return undefined
    const item = state.items.find((candidate) => candidate.id === owner.itemId)
    const effect = item?.[owner.ability]?.effects.find(
      (candidate) =>
        candidate.kind === 'itemPrivateScript' && candidate.script.id === owner.scriptId,
    )
    return effect?.kind === 'itemPrivateScript' ? effect.script.body : undefined
  }
  if (owner.kind === 'entity-hostile-on-lose') {
    if (container.kind !== 'body') return undefined
    const hostile = state.scenes
      .find((scene) => scene.id === owner.sceneId)
      ?.entities.find((entity) => entity.id === owner.entityId)?.hostile
    return Array.isArray(hostile?.onLose) ? hostile.onLose : undefined
  }
  const flow = commandOwnerFlow(state, owner)
  if (!flow || container.kind === 'body') return undefined
  if (container.kind === 'step') {
    if (flow.kind !== 'stages') return undefined
    const step = flow.stages.find((candidate) => candidate.id === container.stepId)
    return container.section === 'prepare' ? step?.entry?.prepare : step?.body
  }
  if (flow.kind !== 'stateMachine' || flow.machine.id !== container.machineId) return undefined
  const machineState = flow.machine.states[container.stateId]
  return container.section === 'prepare' ? machineState?.entry?.prepare : machineState?.body
}

export function resolveCanonicalScriptCommand(
  state: ScriptEditorState,
  locator: ScriptCommandLocator,
): AuthorCommand | undefined {
  const body = commandLocatorBody(state, locator)
  if (!body) return undefined
  try {
    return getAuthorCommandAt(body, parseAuthorCommandPath(locator.commandPath))
  } catch {
    return undefined
  }
}

export function canonicalScriptReferenceDestinationExists(
  state: ScriptEditorState,
  reference: CanonicalScriptReference,
): boolean {
  const locator = reference.locator
  if (locator.kind === 'command') return resolveCanonicalScriptCommand(state, locator) !== undefined
  if (locator.kind === 'entity-page')
    return Boolean(
      state.scenes
        .find((scene) => scene.id === locator.sceneId)
        ?.entities.find((entity) => entity.id === locator.entityId)
        ?.pages?.some((page) => page.id === locator.pageId),
    )
  return (
    state.scenes.find((scene) => scene.id === locator.sceneId)?.hooks?.[locator.slot]?.initial ===
    locator.hookId
  )
}

function commandOwnerLabel(state: ScriptEditorState, owner: ScriptCommandOwner): string {
  if (owner.kind === 'entity-behavior') {
    const behavior = state.scenes
      .find((scene) => scene.id === owner.sceneId)
      ?.entities.find((entity) => entity.id === owner.entityId)?.behaviors?.[owner.channel]?.[
      owner.behaviorId
    ]
    return [
      `场景 ${owner.sceneId}`,
      `实体 ${owner.entityId}`,
      `${owner.channel === 'trigger' ? '交互脚本' : '自动行为'}“${behavior?.label ?? owner.behaviorId}”`,
    ].join(' / ')
  }
  if (owner.kind === 'scene-hook') {
    const hook = state.scenes.find((scene) => scene.id === owner.sceneId)?.hooks?.[owner.slot]
      ?.variants[owner.hookId]
    return [
      `场景 ${owner.sceneId}`,
      `${owner.slot === 'onEnter' ? '进场脚本' : '传送出口脚本'}“${hook?.label ?? owner.hookId}”`,
    ].join(' / ')
  }
  if (owner.kind === 'entity-hostile-on-lose')
    return [`场景 ${owner.sceneId}`, `实体 ${owner.entityId}`, '战败后脚本'].join(' / ')
  if (owner.kind === 'item-private-script') {
    const item = state.items.find((candidate) => candidate.id === owner.itemId)
    return [
      `物品“${item?.name ?? owner.itemId}”（${owner.itemId}）`,
      `${owner.ability === 'use' ? '使用' : '投掷'}脚本`,
    ].join(' / ')
  }
  const script = state.sharedScripts[owner.scriptId]
  return `可复用脚本“${script?.name ?? owner.scriptId}”`
}

function commandContainerLabel(
  state: ScriptEditorState,
  locator: ScriptCommandLocator,
): string | undefined {
  const container = locator.container
  if (container.kind === 'body') return undefined
  const flow = commandOwnerFlow(state, locator.owner)
  if (container.kind === 'step') {
    const index =
      flow?.kind === 'stages' ? flow.stages.findIndex((step) => step.id === container.stepId) : -1
    return [
      index >= 0 ? `步骤 ${index + 1}` : `步骤 ${container.stepId}`,
      container.section === 'prepare' ? '画面出现前' : '脚本正文',
    ].join(' / ')
  }
  const machineState =
    flow?.kind === 'stateMachine' && flow.machine.id === container.machineId
      ? flow.machine.states[container.stateId]
      : undefined
  return [
    flow?.kind === 'stateMachine' && flow.machine.id === container.machineId
      ? `连续流程“${flow.machine.label}”`
      : `连续流程 ${container.machineId}`,
    `状态“${machineState?.label ?? container.stateId}”`,
    container.section === 'prepare' ? '画面出现前' : '脚本正文',
  ].join(' / ')
}

export function describeCanonicalScriptReference(
  state: ScriptEditorState,
  reference: CanonicalScriptReference,
): string {
  const locator: ScriptReferenceLocator = reference.locator
  if (locator.kind === 'entity-page') {
    const entity = state.scenes
      .find((scene) => scene.id === locator.sceneId)
      ?.entities.find((candidate) => candidate.id === locator.entityId)
    const page = entity?.pages?.find((candidate) => candidate.id === locator.pageId)
    return [
      `场景 ${locator.sceneId}`,
      `实体 ${locator.entityId}`,
      `页面“${page?.label ?? locator.pageId}”`,
      `使用${locator.channel === 'trigger' ? '交互脚本' : '自动行为'}`,
    ].join(' / ')
  }
  if (locator.kind === 'scene-hook-initial') {
    const hook = state.scenes.find((scene) => scene.id === locator.sceneId)?.hooks?.[locator.slot]
      ?.variants[locator.hookId]
    return [
      `场景 ${locator.sceneId}`,
      `${locator.slot === 'onEnter' ? '进入场景时' : '使用传送道具时'}默认使用“${hook?.label ?? locator.hookId}”`,
    ].join(' / ')
  }

  const container = commandContainerLabel(state, locator)
  const command = resolveCanonicalScriptCommand(state, locator)
  const commandLabel =
    command?.kind === 'selectSceneHooks'
      ? '切换场景脚本方案'
      : command?.kind === 'selectEntityBehavior'
        ? '切换实体脚本方案'
        : undefined
  return [
    commandOwnerLabel(state, locator.owner),
    ...(container ? [container] : []),
    `${commandPositionLabel(locator.commandPath)}${commandLabel ? `「${commandLabel}」` : ''}`,
  ].join(' / ')
}

function validateState(state: ScriptEditorState): void {
  validateAuthorScenes(state.scenes)
  validateAuthorItems(state.items)
  checkAuthorScriptLibrary(state.sharedScripts)
  const issue = collectScriptReferenceIssues(state)[0]
  if (issue) throw new Error(`${issue.path}: ${issue.message}`)
}

abstract class SnapshotCommand implements ScriptEditorCommand {
  private before?: ScriptEditorState
  private after?: ScriptEditorState

  abstract readonly label: string
  abstract readonly affectedRecords: ScriptEditorAffectedRecords
  protected abstract transform(state: ScriptEditorState): void

  apply(state: ScriptEditorState): ScriptEditorState {
    if (this.after) return this.after
    this.before = state
    const next = clone(state)
    this.transform(next)
    validateState(next)
    this.after = next
    return next
  }

  invert(_state: ScriptEditorState): ScriptEditorState {
    if (!this.before) throw new Error(`${this.label}: 尚未 apply`)
    return this.before
  }
}

/** 新放置实体同步登记进 current canonical 场景；与主会话 AddEntityCommand 成对提交。 */
export class AddSceneEntityDefinitionCommand extends SnapshotCommand {
  readonly label = '新增 canonical 场景实体'
  get affectedRecords() {
    return { scenes: [this.sceneId] }
  }

  constructor(
    private readonly sceneId: string,
    private readonly entity: AuthorSceneEntityDef,
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    const scene = state.scenes.find((candidate) => candidate.id === this.sceneId)
    if (!scene) throw new Error(`场景不存在 ${this.sceneId}`)
    if (scene.entities.some((candidate) => candidate.id === this.entity.id))
      throw new Error(`实体已存在 ${this.sceneId}/${this.entity.id}`)
    scene.entities.push(clone(this.entity))
  }
}

/** 删除 current canonical 场景实体；与主会话 DeleteEntityCommand 成对提交。 */
export class DeleteSceneEntityDefinitionCommand extends SnapshotCommand {
  readonly label = '删除 canonical 场景实体'
  get affectedRecords() {
    return { scenes: [this.sceneId] }
  }

  constructor(
    private readonly sceneId: string,
    private readonly entityId: string,
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    const scene = state.scenes.find((candidate) => candidate.id === this.sceneId)
    if (!scene) throw new Error(`场景不存在 ${this.sceneId}`)
    const index = scene.entities.findIndex((candidate) => candidate.id === this.entityId)
    if (index < 0) throw new Error(`实体不存在 ${this.sceneId}/${this.entityId}`)
    scene.entities.splice(index, 1)
  }
}

export class ScriptEditSession {
  private past: ScriptEditorCommand[] = []
  private future: ScriptEditorCommand[] = []
  private state: ScriptEditorState
  private dirty = false
  private version = 0
  private historyVersion = 0
  private readonly affectedRecordsByVersion = new Map<number, ScriptEditorAffectedRecords>()
  private readonly listeners = new Set<() => void>()

  constructor(state: ScriptEditorState) {
    validateState(state)
    this.state = clone(state)
  }

  getState(): ScriptEditorState {
    return clone(this.state)
  }

  /** Internal immutable snapshot for render/derived-store consumers; callers must never mutate it. */
  getStateSnapshot(): ScriptEditorState {
    return this.state
  }

  isDirty(): boolean {
    return this.dirty
  }

  markSaved(): void {
    this.dirty = false
    this.notify()
  }

  getVersion(): number {
    return this.version
  }

  getHistoryVersion(): number {
    return this.historyVersion
  }

  getAffectedRecordsSince(historyVersion: number): ScriptEditorAffectedRecords {
    if (historyVersion >= this.historyVersion) return {}
    const scenes = new Set<string>()
    const items = new Set<string>()
    const sharedScripts = new Set<string>()
    for (let version = historyVersion + 1; version <= this.historyVersion; version += 1) {
      const affected = this.affectedRecordsByVersion.get(version)
      if (!affected) return { all: true }
      if (affected.all) return { all: true }
      for (const id of affected.scenes ?? []) scenes.add(id)
      for (const id of affected.items ?? []) items.add(id)
      for (const id of affected.sharedScripts ?? []) sharedScripts.add(id)
    }
    return {
      ...(scenes.size ? { scenes: [...scenes] } : {}),
      ...(items.size ? { items: [...items] } : {}),
      ...(sharedScripts.size ? { sharedScripts: [...sharedScripts] } : {}),
    }
  }

  canUndo(): boolean {
    return this.past.length > 0
  }

  canRedo(): boolean {
    return this.future.length > 0
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  dispatch(command: ScriptEditorCommand): boolean {
    this.state = command.apply(this.state)
    this.past.push(command)
    this.future = []
    this.dirty = true
    this.historyVersion += 1
    this.affectedRecordsByVersion.set(this.historyVersion, command.affectedRecords)
    this.notify()
    return true
  }

  dispatchForTransaction(command: ScriptEditorCommand): ScriptTransactionReceipt {
    const before = {
      state: this.state,
      past: [...this.past],
      future: [...this.future],
      dirty: this.dirty,
    }
    this.dispatch(command)
    let active = true
    return {
      rollback: (): void => {
        if (!active) throw new Error('script transaction receipt 已失效')
        if (this.past.at(-1) !== command)
          throw new Error(`无法回滚事务：script history 顶部不是「${command.label}」`)
        active = false
        this.state = before.state
        this.past = before.past
        this.future = before.future
        this.dirty = before.dirty
        this.historyVersion += 1
        this.affectedRecordsByVersion.set(this.historyVersion, command.affectedRecords)
        this.notify()
      },
    }
  }

  isUndoTop(command: ScriptEditorCommand): boolean {
    return this.past.at(-1) === command
  }

  isRedoTop(command: ScriptEditorCommand): boolean {
    return this.future.at(-1) === command
  }

  discardRedo(command: ScriptEditorCommand): boolean {
    if (!this.isRedoTop(command)) return false
    this.future.pop()
    this.historyVersion += 1
    this.affectedRecordsByVersion.set(this.historyVersion, {})
    this.notify()
    return true
  }

  undo(): boolean {
    const command = this.past.pop()
    if (!command) return false
    this.state = command.invert(this.state)
    this.future.push(command)
    this.dirty = true
    this.historyVersion += 1
    this.affectedRecordsByVersion.set(this.historyVersion, command.affectedRecords)
    this.notify()
    return true
  }

  redo(): boolean {
    const command = this.future.pop()
    if (!command) return false
    this.state = command.apply(this.state)
    this.past.push(command)
    this.dirty = true
    this.historyVersion += 1
    this.affectedRecordsByVersion.set(this.historyVersion, command.affectedRecords)
    this.notify()
    return true
  }

  private notify(): void {
    this.version += 1
    for (const listener of this.listeners) listener()
  }
}

export class AddEntityBehaviorCommand extends SnapshotCommand {
  readonly label = '新增具名行为'
  get affectedRecords() {
    return { scenes: [this.target.scene] }
  }

  constructor(
    private readonly target: EntityAddress,
    private readonly channel: 'trigger' | 'auto',
    private readonly behaviorId: string,
    private readonly value: AuthorEntityBehavior,
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    checkBehaviorId(this.behaviorId)
    const { entity } = sceneAndEntity(state, this.target)
    entity.behaviors ??= {}
    let registry = entity.behaviors[this.channel]
    if (!registry) {
      registry = {}
      entity.behaviors[this.channel] = registry
    }
    if (registry[this.behaviorId]) throw new Error(`BehaviorId 已存在 ${this.behaviorId}`)
    registry[this.behaviorId] = {
      ...clone(this.value),
      order: Math.max(-1, ...Object.values(registry).map((candidate) => candidate.order)) + 1,
    }
  }
}

export class ReorderEntityBehaviorSchemesCommand extends SnapshotCommand {
  readonly label = '调整具名行为顺序'
  get affectedRecords() {
    return { scenes: [this.target.scene] }
  }

  constructor(
    private readonly target: EntityAddress,
    private readonly channel: 'trigger' | 'auto',
    private readonly orderedIds: readonly string[],
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    const registry = behaviorRegistry(state, this.target, this.channel)
    if (!registry) throw new Error('behavior registry 缺失')
    const currentIds = Object.keys(registry)
    const ordered = new Set(this.orderedIds)
    if (
      ordered.size !== this.orderedIds.length ||
      this.orderedIds.length !== currentIds.length ||
      currentIds.some((id) => !ordered.has(id))
    )
      throw new Error('具名行为顺序必须是当前 registry 的精确排列')
    this.orderedIds.forEach((id, order) => {
      registry[id]!.order = order
    })
  }
}

export class CopyEntityBehaviorCommand extends SnapshotCommand {
  readonly label = '复制具名行为'
  get affectedRecords() {
    return { scenes: [this.target.scene] }
  }

  constructor(
    private readonly target: EntityAddress,
    private readonly channel: 'trigger' | 'auto',
    private readonly sourceId: string,
    private readonly copyId: string,
    private readonly copyLabel?: string,
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    checkBehaviorId(this.copyId)
    const source = behavior(state, this.target, this.channel, this.sourceId)
    const { entity } = sceneAndEntity(state, this.target)
    const registry = entity.behaviors?.[this.channel]
    if (!registry) throw new Error('behavior registry 缺失')
    if (registry[this.copyId]) throw new Error(`BehaviorId 已存在 ${this.copyId}`)
    registry[this.copyId] = {
      ...clone(source),
      label: this.copyLabel ?? `${source.label} 副本`,
      order: Math.max(-1, ...Object.values(registry).map((candidate) => candidate.order)) + 1,
    }
  }
}

export class RenameEntityBehaviorCommand extends SnapshotCommand {
  readonly label = '重命名具名行为'
  readonly affectedRecords = { all: true } as const

  constructor(
    private readonly target: EntityAddress,
    private readonly channel: 'trigger' | 'auto',
    private readonly from: string,
    private readonly to: string,
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    checkBehaviorId(this.to)
    const { entity } = sceneAndEntity(state, this.target)
    const registry = entity.behaviors?.[this.channel]
    const source = registry?.[this.from]
    if (!registry || !source) throw new Error(`behavior 不存在 ${this.from}`)
    if (registry[this.to]) throw new Error(`BehaviorId 已存在 ${this.to}`)
    delete registry[this.from]
    registry[this.to] = source
    for (const page of entity.pages ?? [])
      if (page[this.channel] === this.from) page[this.channel] = this.to
    mapAllCommands(state, (command) => {
      if (
        command.kind !== 'selectEntityBehavior' ||
        !sameAddress(command.target, this.target) ||
        command.channel !== this.channel
      )
        return command
      const rewritesSelection =
        command.selection.kind === 'use' && command.selection.value === this.from
      const rewritesHandoff = command.cursorHandoff?.fromBehavior === this.from
      if (!rewritesSelection && !rewritesHandoff) return command
      return {
        ...command,
        ...(rewritesSelection ? { selection: { kind: 'use' as const, value: this.to } } : {}),
        ...(rewritesHandoff
          ? {
              cursorHandoff: {
                ...command.cursorHandoff!,
                fromBehavior: this.to,
              },
            }
          : {}),
      }
    })
  }
}

export class UpdateEntityBehaviorCommand extends SnapshotCommand {
  readonly label = '编辑具名行为'
  get affectedRecords() {
    return { scenes: [this.target.scene] }
  }

  constructor(
    private readonly target: EntityAddress,
    private readonly channel: 'trigger' | 'auto',
    private readonly behaviorId: string,
    private readonly patch: Partial<AuthorEntityBehavior>,
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    const source = behavior(state, this.target, this.channel, this.behaviorId)
    const next = { ...clone(source), ...clone(this.patch) }
    const registry = behaviorRegistry(state, this.target, this.channel)
    if (!registry) throw new Error('behavior registry 缺失')
    registry[this.behaviorId] = next
  }
}

export class DeleteEntityBehaviorCommand extends SnapshotCommand {
  readonly label = '删除具名行为'
  get affectedRecords() {
    return { scenes: [this.target.scene] }
  }

  constructor(
    private readonly target: EntityAddress,
    private readonly channel: 'trigger' | 'auto',
    private readonly behaviorId: string,
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    behavior(state, this.target, this.channel, this.behaviorId)
    const refs = behaviorReferences(state, this.target, this.channel, this.behaviorId)
    if (refs.length)
      throw new Error(
        `behavior ${this.behaviorId} 仍有 ${refs.length} 个引用: ${refs
          .slice(0, 3)
          .map((reference) => reference.path)
          .join(', ')}`,
      )
    const registry = behaviorRegistry(state, this.target, this.channel)
    if (!registry) throw new Error('behavior registry 缺失')
    delete registry[this.behaviorId]
  }
}

export class AddSceneHookCommand extends SnapshotCommand {
  readonly label = '新增场景 Hook'
  get affectedRecords() {
    return { scenes: [this.sceneId] }
  }

  constructor(
    private readonly sceneId: string,
    private readonly slot: SceneHookSlot,
    private readonly hookId: string,
    private readonly value: AuthorSceneHook,
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    checkHookId(this.hookId)
    const scene = sceneById(state, this.sceneId)
    scene.hooks ??= {}
    const existing = scene.hooks[this.slot]
    if (!existing) {
      scene.hooks[this.slot] = {
        initial: this.hookId,
        variants: { [this.hookId]: { ...clone(this.value), order: 0 } },
      }
      return
    }
    if (existing.variants[this.hookId]) throw new Error(`HookId 已存在 ${this.hookId}`)
    existing.variants[this.hookId] = {
      ...clone(this.value),
      order:
        Math.max(-1, ...Object.values(existing.variants).map((candidate) => candidate.order)) + 1,
    }
  }
}

export class ReorderSceneHookVariantsCommand extends SnapshotCommand {
  readonly label = '调整场景 Hook 顺序'
  get affectedRecords() {
    return { scenes: [this.sceneId] }
  }

  constructor(
    private readonly sceneId: string,
    private readonly slot: SceneHookSlot,
    private readonly orderedIds: readonly string[],
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    const variants = sceneById(state, this.sceneId).hooks?.[this.slot]?.variants
    if (!variants) throw new Error('hook registry 缺失')
    const currentIds = Object.keys(variants)
    const ordered = new Set(this.orderedIds)
    if (
      ordered.size !== this.orderedIds.length ||
      this.orderedIds.length !== currentIds.length ||
      currentIds.some((id) => !ordered.has(id))
    )
      throw new Error('场景 Hook 顺序必须是当前 registry 的精确排列')
    this.orderedIds.forEach((id, order) => {
      variants[id]!.order = order
    })
  }
}

export class CopySceneHookCommand extends SnapshotCommand {
  readonly label = '复制场景 Hook'
  get affectedRecords() {
    return { scenes: [this.sceneId] }
  }

  constructor(
    private readonly sceneId: string,
    private readonly slot: SceneHookSlot,
    private readonly sourceId: string,
    private readonly copyId: string,
    private readonly copyLabel?: string,
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    checkHookId(this.copyId)
    const source = sceneHook(state, this.sceneId, this.slot, this.sourceId)
    const variants = sceneById(state, this.sceneId).hooks?.[this.slot]?.variants
    if (!variants) throw new Error('hook registry 缺失')
    if (variants[this.copyId]) throw new Error(`HookId 已存在 ${this.copyId}`)
    variants[this.copyId] = {
      ...clone(source),
      label: this.copyLabel ?? `${source.label} 副本`,
      order: Math.max(-1, ...Object.values(variants).map((candidate) => candidate.order)) + 1,
    }
  }
}

export class RenameSceneHookCommand extends SnapshotCommand {
  readonly label = '重命名场景 Hook'
  readonly affectedRecords = { all: true } as const

  constructor(
    private readonly sceneId: string,
    private readonly slot: SceneHookSlot,
    private readonly from: string,
    private readonly to: string,
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    checkHookId(this.to)
    const scene = sceneById(state, this.sceneId)
    const channel = scene.hooks?.[this.slot]
    const source = channel?.variants[this.from]
    if (!channel || !source) throw new Error(`hook 不存在 ${this.from}`)
    if (channel.variants[this.to]) throw new Error(`HookId 已存在 ${this.to}`)
    delete channel.variants[this.from]
    channel.variants[this.to] = source
    if (channel.initial === this.from) channel.initial = this.to
    mapAllCommands(state, (command) => {
      if (command.kind !== 'selectSceneHooks' || command.scene !== this.sceneId) return command
      const selection = command.selection[this.slot]
      if (selection?.kind !== 'use' || selection.value !== this.from) return command
      return {
        ...command,
        selection: {
          ...command.selection,
          [this.slot]: { kind: 'use', value: this.to },
        },
      }
    })
  }
}

export class UpdateSceneHookCommand extends SnapshotCommand {
  readonly label = '编辑场景 Hook'
  get affectedRecords() {
    return { scenes: [this.sceneId] }
  }

  constructor(
    private readonly sceneId: string,
    private readonly slot: SceneHookSlot,
    private readonly hookId: string,
    private readonly patch: Partial<AuthorSceneHook>,
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    const source = sceneHook(state, this.sceneId, this.slot, this.hookId)
    const next = { ...clone(source), ...clone(this.patch) }
    const variants = sceneById(state, this.sceneId).hooks?.[this.slot]?.variants
    if (!variants) throw new Error('hook registry 缺失')
    variants[this.hookId] = next
  }
}

/** 方案详情弹窗的一次保存：名称与默认状态共用一个撤销单元。 */
export class SaveSceneHookDetailsCommand extends SnapshotCommand {
  readonly label = '保存场景脚本方案详情'
  get affectedRecords() {
    return { scenes: [this.sceneId] }
  }

  constructor(
    private readonly sceneId: string,
    private readonly slot: SceneHookSlot,
    private readonly hookId: string,
    private readonly schemeLabel: string,
    private readonly isDefault: boolean,
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    const scene = sceneById(state, this.sceneId)
    const channel = scene.hooks?.[this.slot]
    const source = channel?.variants[this.hookId]
    if (!channel || !source)
      throw new Error(`hook 不存在 ${this.sceneId}/${this.slot}/${this.hookId}`)
    source.label = this.schemeLabel
    if (this.isDefault) channel.initial = this.hookId
    else if (channel.initial === this.hookId) delete channel.initial
  }
}

export class SetSceneHookInitialCommand extends SnapshotCommand {
  readonly label = '选择场景初始 Hook'
  get affectedRecords() {
    return { scenes: [this.sceneId] }
  }

  constructor(
    private readonly sceneId: string,
    private readonly slot: SceneHookSlot,
    private readonly hookId: string | undefined,
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    const channel = sceneById(state, this.sceneId).hooks?.[this.slot]
    if (!channel) throw new Error(`hook 通道不存在 ${this.sceneId}/${this.slot}`)
    if (this.hookId && !channel.variants[this.hookId])
      throw new Error(`hook 不存在 ${this.sceneId}/${this.slot}/${this.hookId}`)
    if (this.hookId) channel.initial = this.hookId
    else delete channel.initial
  }
}

export class DeleteSceneHookCommand extends SnapshotCommand {
  readonly label = '删除场景 Hook'
  get affectedRecords() {
    return { scenes: [this.sceneId] }
  }

  constructor(
    private readonly sceneId: string,
    private readonly slot: SceneHookSlot,
    private readonly hookId: string,
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    sceneHook(state, this.sceneId, this.slot, this.hookId)
    const refs = sceneHookReferences(state, this.sceneId, this.slot, this.hookId)
    if (refs.length)
      throw new Error(
        `hook ${this.hookId} 仍有 ${refs.length} 个引用: ${refs
          .slice(0, 3)
          .map((reference) => reference.path)
          .join(', ')}`,
      )
    const scene = sceneById(state, this.sceneId)
    const channel = scene.hooks?.[this.slot]
    if (!channel) throw new Error('hook registry 缺失')
    delete channel.variants[this.hookId]
    if (Object.keys(channel.variants).length === 0) {
      delete scene.hooks?.[this.slot]
      if (scene.hooks && Object.keys(scene.hooks).length === 0) delete scene.hooks
    }
  }
}

export class SetItemPrivateScriptBodyCommand extends SnapshotCommand {
  readonly label = '编辑物品私有脚本'
  get affectedRecords() {
    return { items: [this.itemId] }
  }

  constructor(
    private readonly itemId: string,
    private readonly use: 'use' | 'throw',
    private readonly effectIndex: number,
    private readonly body: AuthorCommand[],
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    const item = state.items.find((candidate) => candidate.id === this.itemId)
    if (!item) throw new Error(`物品不存在 ${this.itemId}`)
    const effect = item[this.use]?.effects[this.effectIndex]
    if (effect?.kind !== 'itemPrivateScript')
      throw new Error(`${this.itemId}.${this.use}.effects[${this.effectIndex}] 不是物品私有脚本`)
    effect.script.body = clone(this.body)
  }
}

/** ED-5J:新建物品私有脚本(use 槽内联正文,归当前物品拥有;不动共享库)。 */
export class AddItemPrivateScriptCommand extends SnapshotCommand {
  readonly label = '新建物品私有脚本'
  get affectedRecords() {
    return { items: [this.itemId] }
  }

  constructor(
    private readonly itemId: string,
    private readonly scriptLabel: string,
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    const item = state.items.find((candidate) => candidate.id === this.itemId)
    if (!item) throw new Error(`物品不存在 ${this.itemId}`)
    const use = item.use ?? { target: 'scene' as const, consuming: true, effects: [] }
    use.effects ??= []
    const duplicate = use.effects.some(
      (effect) => effect.kind === 'itemPrivateScript' && effect.script.id === 'use',
    )
    if (duplicate) throw new Error(`${this.itemId}.use 已有私有脚本(每件物品至多一条)`)
    use.effects.push({
      kind: 'itemPrivateScript',
      script: { id: 'use', label: this.scriptLabel, body: [] },
    })
    item.use = use
  }
}

export class SetEntityHostileOnLoseCommand extends SnapshotCommand {
  readonly label = '编辑战败后脚本'
  get affectedRecords() {
    return { scenes: [this.target.scene] }
  }

  constructor(
    private readonly target: EntityAddress,
    private readonly onLose: AuthorHostileBehavior['onLose'],
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    const { entity } = sceneAndEntity(state, this.target)
    if (!entity.hostile)
      throw new Error(`实体不是敌对实体 ${this.target.scene}/${this.target.entity}`)
    if (this.onLose === undefined) delete entity.hostile.onLose
    else entity.hostile.onLose = clone(this.onLose)
  }
}

export class AddSharedScriptCommand extends SnapshotCommand {
  readonly label = '新增共享脚本'
  get affectedRecords() {
    return { sharedScripts: [this.scriptId] }
  }

  constructor(
    private readonly scriptId: string,
    private readonly value: AuthorSharedScript,
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    checkScriptId(this.scriptId)
    if (state.sharedScripts[this.scriptId]) throw new Error(`ScriptId 已存在 ${this.scriptId}`)
    state.sharedScripts[this.scriptId] = clone(this.value)
  }
}

export class UpdateSharedScriptCommand extends SnapshotCommand {
  readonly label = '编辑共享脚本'
  get affectedRecords() {
    return { sharedScripts: [this.scriptId] }
  }

  constructor(
    private readonly scriptId: string,
    private readonly patch: Partial<AuthorSharedScript>,
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    const source = state.sharedScripts[this.scriptId]
    if (!source) throw new Error(`共享脚本不存在 ${this.scriptId}`)
    state.sharedScripts[this.scriptId] = { ...clone(source), ...clone(this.patch) }
  }
}

export type SharedScriptMetadataPatch = Partial<
  Pick<AuthorSharedScript, 'name' | 'description' | 'self'>
>

const SHARED_SCRIPT_METADATA_KEYS = new Set(['name', 'description', 'self'])

function validateSharedScriptMetadataPatch(patch: SharedScriptMetadataPatch): void {
  for (const key of Object.keys(patch))
    if (!SHARED_SCRIPT_METADATA_KEYS.has(key)) throw new Error(`共享脚本元数据不允许修改 ${key}`)
  if ('name' in patch && (typeof patch.name !== 'string' || !patch.name.trim()))
    throw new Error('共享脚本显示名不能为空')
  if (
    'description' in patch &&
    patch.description !== undefined &&
    typeof patch.description !== 'string'
  )
    throw new Error('共享脚本说明必须是 string 或 undefined')
  if (
    'self' in patch &&
    patch.self !== 'none' &&
    patch.self !== 'optional' &&
    patch.self !== 'required'
  )
    throw new Error('共享脚本 self 契约必须是 none|optional|required')
}

/** Metadata-only fast path: scalar fields cannot invalidate command/reference structure. */
export class UpdateSharedScriptMetadataCommand implements ScriptEditorCommand {
  readonly label = '编辑共享脚本元数据'
  private before?: ScriptEditorState
  private after?: ScriptEditorState
  private readonly patch: SharedScriptMetadataPatch

  get affectedRecords() {
    return { sharedScripts: [this.scriptId] }
  }

  constructor(
    private readonly scriptId: string,
    patch: SharedScriptMetadataPatch,
  ) {
    validateSharedScriptMetadataPatch(patch)
    this.patch = { ...patch }
  }

  apply(state: ScriptEditorState): ScriptEditorState {
    if (this.after) return this.after
    const source = state.sharedScripts[this.scriptId]
    if (!source) throw new Error(`共享脚本不存在 ${this.scriptId}`)
    this.before = state
    this.after = {
      ...state,
      sharedScripts: {
        ...state.sharedScripts,
        [this.scriptId]: { ...source, ...this.patch },
      },
    }
    return this.after
  }

  invert(_state: ScriptEditorState): ScriptEditorState {
    if (!this.before) throw new Error(`${this.label}: 尚未 apply`)
    return this.before
  }
}

export class DeleteSharedScriptCommand extends SnapshotCommand {
  readonly label = '删除共享脚本'
  get affectedRecords() {
    return { sharedScripts: [this.scriptId] }
  }

  constructor(private readonly scriptId: string) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    if (!state.sharedScripts[this.scriptId]) throw new Error(`共享脚本不存在 ${this.scriptId}`)
    delete state.sharedScripts[this.scriptId]
  }
}

export class SetEntityPageBehaviorCommand extends SnapshotCommand {
  readonly label = '选择实体页行为'
  get affectedRecords() {
    return { scenes: [this.target.scene] }
  }

  constructor(
    private readonly target: EntityAddress,
    private readonly pageId: string,
    private readonly channel: 'trigger' | 'auto',
    private readonly behaviorId: string | undefined,
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    const { entity } = sceneAndEntity(state, this.target)
    const page = entity.pages?.find((candidate) => candidate.id === this.pageId)
    if (!page)
      throw new Error(`实体页不存在 ${this.target.scene}/${this.target.entity}/${this.pageId}`)
    if (this.behaviorId !== undefined && !entity.behaviors?.[this.channel]?.[this.behaviorId])
      throw new Error(
        `${this.channel} behavior 不存在 ${this.target.scene}/${this.target.entity}/${this.behaviorId}`,
      )
    if (this.behaviorId === undefined) delete page[this.channel]
    else page[this.channel] = this.behaviorId
  }
}

/** 当前 canonical 实体页的静态触发方式；与行为槽分离，修改后由同一脚本会话撤销/保存。 */
export class SetEntityPageTriggerActivationCommand extends SnapshotCommand {
  readonly label = '编辑实体页触发方式'
  get affectedRecords() {
    return { scenes: [this.target.scene] }
  }

  constructor(
    private readonly target: EntityAddress,
    private readonly pageId: string,
    private readonly activation: TriggerActivation | undefined,
  ) {
    super()
  }

  protected transform(state: ScriptEditorState): void {
    const { entity } = sceneAndEntity(state, this.target)
    const page = entity.pages?.find((candidate) => candidate.id === this.pageId)
    if (!page)
      throw new Error(`实体页不存在 ${this.target.scene}/${this.target.entity}/${this.pageId}`)
    if (this.activation === undefined) delete page.triggerActivation
    else page.triggerActivation = clone(this.activation)
  }
}

export type SelectionPresentation = {
  tone: 'inherit' | 'disabled' | 'use'
  label: string
}

export function presentSelection<T>(
  selection: Selection<T>,
  valueLabel: (value: T) => string,
): SelectionPresentation {
  if (selection.kind === 'inherit') return { tone: 'inherit', label: '继承静态定义' }
  if (selection.kind === 'disabled') return { tone: 'disabled', label: '显式禁用' }
  return { tone: 'use', label: `使用：${valueLabel(selection.value)}` }
}

export function stateTransitionExecutionLabel(
  transition: AuthorStateTransition,
): '同步继续' | '下次激活' | '让步后同次继续' | '条件分派' {
  if (transition.kind === 'branch' || transition.kind === 'commandOutcome') return '条件分派'
  if (transition.kind === 'continue') return '同步继续'
  if (transition.kind === 'to') return '让步后同次继续'
  return '下次激活'
}
