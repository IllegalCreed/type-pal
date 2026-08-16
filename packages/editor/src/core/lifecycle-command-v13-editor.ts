import {
  type AuthorCommandV14,
  checkAuthorCommandsV14,
  checkSharedScriptLibraryV14,
  type LifecycleCommandV13,
  type SceneDefV14,
  type ScriptFlowV14,
  validateScenesV14,
} from '@type-pal/content'
import type { Command } from './commands.js'
import type { EditorState } from './edit-session.js'
import { collectMissingEntityAddressReferencesV13 } from './entity-address-references-v13.js'

export type LifecycleCommandBodyLocationV13 =
  | { root: 'scenes'; path: readonly (string | number)[] }
  | { root: 'sharedScripts'; path: readonly (string | number)[] }

export interface LifecycleCommandBodyV13 {
  label: string
  location: LifecycleCommandBodyLocationV13
  commands: readonly AuthorCommandV14[]
}

function nestedCommandBodies(
  commands: readonly AuthorCommandV14[],
  path: readonly (string | number)[],
  label: string,
  result: LifecycleCommandBodyV13[],
): void {
  result.push({
    label,
    location: { root: 'scenes', path },
    commands,
  })
  commands.forEach((command, index) => {
    const commandPath = [...path, index]
    if (command.kind === 'branch') {
      nestedCommandBodies(command.then, [...commandPath, 'then'], label + ' / 条件满足', result)
      if (command.else)
        nestedCommandBodies(
          command.else,
          [...commandPath, 'else'],
          label + ' / 条件不满足',
          result,
        )
    } else if (command.kind === 'loop') {
      nestedCommandBodies(command.body, [...commandPath, 'body'], label + ' / 循环', result)
    } else if (command.kind === 'confirm') {
      nestedCommandBodies(command.onNo, [...commandPath, 'onNo'], label + ' / 选择否', result)
    } else if (command.kind === 'startBattle') {
      if (command.onLose)
        nestedCommandBodies(
          command.onLose,
          [...commandPath, 'onLose'],
          label + ' / 战败',
          result,
        )
      if (command.onFlee)
        nestedCommandBodies(
          command.onFlee,
          [...commandPath, 'onFlee'],
          label + ' / 玩家逃跑',
          result,
        )
    } else if (command.kind === 'teleportOut') {
      if (command.onFail)
        nestedCommandBodies(
          command.onFail,
          [...commandPath, 'onFail'],
          label + ' / 传送失败',
          result,
        )
    }
  })
}

function flowBodies(
  flow: ScriptFlowV14,
  path: readonly (string | number)[],
  label: string,
  result: LifecycleCommandBodyV13[],
): void {
  if (flow.kind === 'stages') {
    flow.stages.forEach((stage, index) => {
      if (stage.entry)
        nestedCommandBodies(
          stage.entry.prepare,
          [...path, 'stages', index, 'entry', 'prepare'],
          label + ' / ' + stage.id + ' / 入场',
          result,
        )
      nestedCommandBodies(
        stage.body,
        [...path, 'stages', index, 'body'],
        label + ' / ' + stage.id,
        result,
      )
    })
    return
  }
  for (const [stateId, state] of Object.entries(flow.machine.states)) {
    if (state.entry)
      nestedCommandBodies(
        state.entry.prepare,
        [...path, 'machine', 'states', stateId, 'entry', 'prepare'],
        label + ' / ' + stateId + ' / 入场',
        result,
      )
    nestedCommandBodies(
      state.body,
      [...path, 'machine', 'states', stateId, 'body'],
      label + ' / ' + stateId,
      result,
    )
  }
}

export function collectEntityLifecycleCommandBodiesV13(
  state: EditorState,
  sceneId: string,
  entityId: string,
): LifecycleCommandBodyV13[] {
  if (state.manifest.contentVersion !== 14) return []
  const sceneIndex = state.scenes.findIndex((scene) => scene.id === sceneId)
  if (sceneIndex < 0) return []
  const scene = state.scenes[sceneIndex]!
  const entityIndex = scene.entities.findIndex((entity) => entity.id === entityId)
  if (entityIndex < 0) return []
  const entity = scene.entities[entityIndex] as unknown as SceneDefV14['entities'][number]
  const result: LifecycleCommandBodyV13[] = []
  const base = [sceneIndex, 'entities', entityIndex] as const
  for (const channel of ['trigger', 'auto'] as const) {
    for (const [behaviorId, behavior] of Object.entries(entity.behaviors?.[channel] ?? {}))
      flowBodies(
        behavior.flow,
        [...base, 'behaviors', channel, behaviorId, 'flow'],
        (channel === 'trigger' ? '触发' : '自动') + ' / ' + behavior.label,
        result,
      )
  }
  if (Array.isArray(entity.hostile?.onLose))
    nestedCommandBodies(
      entity.hostile.onLose,
      [...base, 'hostile', 'onLose'],
      '明雷 / 战败',
      result,
    )
  return result
}

function isLifecycleCommand(value: unknown): value is LifecycleCommandV13 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const kind = (value as { kind?: unknown }).kind
  return (
    kind === 'suspendEntity' ||
    kind === 'hideEntity' ||
    kind === 'restoreEntity' ||
    kind === 'removeEntity'
  )
}

function assertLifecycleCommand(value: unknown): asserts value is LifecycleCommandV13 {
  checkAuthorCommandsV14([value], 'lifecycle command')
  if (!isLifecycleCommand(value))
    throw new Error('当前 lifecycle editor 只接受四种 lifecycle leaf')
}

function cloneRoot(
  state: EditorState,
  location: LifecycleCommandBodyLocationV13,
): unknown {
  if (location.root === 'scenes') return structuredClone(state.scenes)
  if (!state.sharedScripts)
    throw new Error('当前 lifecycle editor: sharedScripts 工作副本缺失')
  return structuredClone(state.sharedScripts)
}

function commandBodyAt(root: unknown, path: readonly (string | number)[]): unknown[] {
  let current = root
  for (const segment of path) {
    if (typeof segment === 'number') {
      if (!Array.isArray(current) || current[segment] === undefined)
        throw new Error('当前 lifecycle editor: command body path 数组段不存在')
      current = current[segment]
      continue
    }
    if (!current || typeof current !== 'object' || Array.isArray(current))
      throw new Error('当前 lifecycle editor: command body path 对象段不存在')
    if (!Object.hasOwn(current, segment))
      throw new Error('当前 lifecycle editor: command body path 字段不存在 ' + segment)
    current = (current as Record<string, unknown>)[segment]
  }
  if (!Array.isArray(current))
    throw new Error('当前 lifecycle editor: location 未指向 command[]')
  return current
}

function withValidatedRoot(
  state: EditorState,
  location: LifecycleCommandBodyLocationV13,
  root: unknown,
): EditorState {
  if (state.manifest.contentVersion !== 14)
    throw new Error('当前 lifecycle editor 只允许修改 content14 工程')
  const next: EditorState =
    location.root === 'scenes'
      ? { ...state, scenes: root as EditorState['scenes'] }
      : {
          ...state,
          sharedScripts: root as NonNullable<EditorState['sharedScripts']>,
        }
  validateScenesV14(next.scenes)
  if (next.sharedScripts) checkSharedScriptLibraryV14(next.sharedScripts)
  const missing = collectMissingEntityAddressReferencesV13(next)[0]
  if (missing)
    throw new Error(
      '当前 lifecycle editor: ' +
        missing.path +
        ' 指向未知实体 ' +
        missing.sceneId +
        '/' +
        missing.entityId,
    )
  return next
}

function sameCommand(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

abstract class LifecycleEditCommandV13 implements Command {
  abstract readonly label: string
  abstract apply(state: EditorState): EditorState
  abstract invert(state: EditorState): EditorState

  constructor(
    protected readonly location: LifecycleCommandBodyLocationV13,
    protected readonly index: number,
  ) {
    if (!Number.isSafeInteger(index) || index < 0)
      throw new Error('当前 lifecycle editor: index 期望非负安全整数')
  }

  protected mutate(
    state: EditorState,
    edit: (body: unknown[]) => void,
  ): EditorState {
    if (state.manifest.contentVersion !== 14)
      throw new Error('当前 lifecycle editor 只允许修改 content14 工程')
    const root = cloneRoot(state, this.location)
    const body = commandBodyAt(root, this.location.path)
    edit(body)
    return withValidatedRoot(state, this.location, root)
  }
}

export class InsertLifecycleCommandV13 extends LifecycleEditCommandV13 {
  readonly label = '插入实体生命周期命令'
  private readonly command: LifecycleCommandV13

  constructor(
    location: LifecycleCommandBodyLocationV13,
    index: number,
    command: LifecycleCommandV13,
  ) {
    super(location, index)
    assertLifecycleCommand(command)
    this.command = structuredClone(command)
  }

  apply(state: EditorState): EditorState {
    return this.mutate(state, (body) => {
      if (this.index > body.length)
        throw new Error('当前 lifecycle editor: insert index 越界')
      body.splice(this.index, 0, structuredClone(this.command))
    })
  }

  invert(state: EditorState): EditorState {
    return this.mutate(state, (body) => {
      if (!sameCommand(body[this.index], this.command))
        throw new Error('当前 lifecycle editor: undo insert 目标漂移')
      body.splice(this.index, 1)
    })
  }
}

export class UpdateLifecycleCommandV13 extends LifecycleEditCommandV13 {
  readonly label = '修改实体生命周期命令'
  private readonly command: LifecycleCommandV13
  private previous: LifecycleCommandV13 | undefined

  constructor(
    location: LifecycleCommandBodyLocationV13,
    index: number,
    command: LifecycleCommandV13,
  ) {
    super(location, index)
    assertLifecycleCommand(command)
    this.command = structuredClone(command)
  }

  apply(state: EditorState): EditorState {
    return this.mutate(state, (body) => {
      const current = body[this.index]
      assertLifecycleCommand(current)
      if (!this.previous) this.previous = structuredClone(current)
      body[this.index] = structuredClone(this.command)
    })
  }

  invert(state: EditorState): EditorState {
    if (!this.previous) return state
    return this.mutate(state, (body) => {
      if (!sameCommand(body[this.index], this.command))
        throw new Error('当前 lifecycle editor: undo update 目标漂移')
      body[this.index] = structuredClone(this.previous)
    })
  }
}

export class DeleteLifecycleCommandV13 extends LifecycleEditCommandV13 {
  readonly label = '删除实体生命周期命令'
  private removed: LifecycleCommandV13 | undefined

  apply(state: EditorState): EditorState {
    return this.mutate(state, (body) => {
      const current = body[this.index]
      assertLifecycleCommand(current)
      if (!this.removed) this.removed = structuredClone(current)
      else if (!sameCommand(current, this.removed))
        throw new Error('当前 lifecycle editor: redo delete 目标漂移')
      body.splice(this.index, 1)
    })
  }

  invert(state: EditorState): EditorState {
    if (!this.removed) return state
    return this.mutate(state, (body) => {
      if (this.index > body.length)
        throw new Error('当前 lifecycle editor: undo delete index 越界')
      body.splice(this.index, 0, structuredClone(this.removed))
    })
  }
}
