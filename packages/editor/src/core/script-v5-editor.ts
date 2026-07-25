import type {
  AuthorCommandV5,
  EntityAddress,
  ItemDataV5,
  NamedEntityBehaviorV5,
  NamedSceneHookV5,
  ProjectMigrationSidecarV1,
  SceneDefV5,
  ScriptFlowV5,
  Selection,
  SharedAuthorScriptV5,
  SharedScriptLibraryV5,
  StateTransitionV5,
} from '@type-pal/content'
import { checkSharedScriptLibraryV5, validateItemsV5, validateScenesV5 } from '@type-pal/content'

export interface ScriptEditorStateV5 {
  scenes: SceneDefV5[]
  items: ItemDataV5[]
  sharedScripts: SharedScriptLibraryV5
  /** 已验签 registry 的 parsed 只读投影；命令不得修改或重签历史兼容账。 */
  migrationSidecars: readonly Readonly<ProjectMigrationSidecarV1>[]
}

export interface ScriptEditorCommandV5 {
  readonly label: string
  apply(state: ScriptEditorStateV5): ScriptEditorStateV5
  invert(state: ScriptEditorStateV5): ScriptEditorStateV5
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function sameAddress(left: EntityAddress, right: EntityAddress): boolean {
  return left.scene === right.scene && left.entity === right.entity
}

export type SceneHookSlotV5 = 'onEnter' | 'onTeleport'

function sceneById(state: ScriptEditorStateV5, sceneId: string): SceneDefV5 {
  const scene = state.scenes.find((candidate) => candidate.id === sceneId)
  if (!scene) throw new Error(`场景不存在 ${sceneId}`)
  return scene
}

function sceneAndEntity(state: ScriptEditorStateV5, target: EntityAddress) {
  const scene = sceneById(state, target.scene)
  const entity = scene.entities.find((candidate) => candidate.id === target.entity)
  if (!entity) throw new Error(`实体不存在 ${target.scene}/${target.entity}`)
  return { scene, entity }
}

function behaviorRegistry(
  state: ScriptEditorStateV5,
  target: EntityAddress,
  channel: 'trigger' | 'auto',
) {
  const { entity } = sceneAndEntity(state, target)
  return entity.behaviors?.[channel]
}

function behavior(
  state: ScriptEditorStateV5,
  target: EntityAddress,
  channel: 'trigger' | 'auto',
  behaviorId: string,
): NamedEntityBehaviorV5 {
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
  commands: AuthorCommandV5[],
  visit: (command: AuthorCommandV5, path: string) => void,
  path: string,
): void {
  for (const [index, command] of commands.entries()) {
    const commandPath = `${path}[${index}]`
    visit(command, commandPath)
    switch (command.kind) {
      case 'branch':
        walkCommands(command.then, visit, `${commandPath}.then`)
        walkCommands(command.else ?? [], visit, `${commandPath}.else`)
        break
      case 'loop':
        walkCommands(command.body, visit, `${commandPath}.body`)
        break
      case 'confirm':
        walkCommands(command.onNo, visit, `${commandPath}.onNo`)
        break
      case 'startBattle':
        walkCommands(command.onLose ?? [], visit, `${commandPath}.onLose`)
        walkCommands(command.onFlee ?? [], visit, `${commandPath}.onFlee`)
        break
      case 'teleportOut':
        walkCommands(command.onFail ?? [], visit, `${commandPath}.onFail`)
        break
    }
  }
}

function walkFlowCommands(
  flow: ScriptFlowV5,
  visit: (command: AuthorCommandV5, path: string) => void,
  path: string,
): void {
  if (flow.kind === 'stages') {
    for (const stage of flow.stages) {
      walkCommands(stage.entry?.prepare ?? [], visit, `${path}.stages.${stage.id}.entry.prepare`)
      walkCommands(stage.body, visit, `${path}.stages.${stage.id}.body`)
    }
    return
  }
  for (const [stateId, state] of Object.entries(flow.machine.states)) {
    walkCommands(
      state.entry?.prepare ?? [],
      visit,
      `${path}.machine.states.${stateId}.entry.prepare`,
    )
    walkCommands(state.body, visit, `${path}.machine.states.${stateId}.body`)
  }
}

function walkStateCommands(
  state: ScriptEditorStateV5,
  visit: (command: AuthorCommandV5, path: string) => void,
): void {
  for (const scene of state.scenes) {
    for (const entity of scene.entities) {
      for (const channel of ['trigger', 'auto'] as const) {
        for (const [id, value] of Object.entries(entity.behaviors?.[channel] ?? {}))
          walkFlowCommands(
            value.flow,
            visit,
            `scenes.${scene.id}.entities.${entity.id}.behaviors.${channel}.${id}.flow`,
          )
      }
    }
    for (const slot of ['onEnter', 'onTeleport'] as const) {
      for (const [id, value] of Object.entries(scene.hooks?.[slot]?.variants ?? {}))
        walkFlowCommands(value.flow, visit, `scenes.${scene.id}.hooks.${slot}.variants.${id}.flow`)
    }
  }
  for (const item of state.items) {
    for (const [index, effect] of (item.use?.effects ?? []).entries()) {
      if (effect.kind === 'itemPrivateScript')
        walkCommands(
          effect.script.body,
          visit,
          `items.${item.id}.use.effects[${index}].script.body`,
        )
    }
    for (const [index, effect] of (item.throw?.effects ?? []).entries()) {
      if (effect.kind === 'itemPrivateScript')
        walkCommands(
          effect.script.body,
          visit,
          `items.${item.id}.throw.effects[${index}].script.body`,
        )
    }
  }
  for (const [id, script] of Object.entries(state.sharedScripts))
    walkCommands(script.body, visit, `sharedScripts.${id}.body`)
}

function mapCommands(
  commands: AuthorCommandV5[],
  map: (command: AuthorCommandV5) => AuthorCommandV5,
): AuthorCommandV5[] {
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
  flow: ScriptFlowV5,
  map: (command: AuthorCommandV5) => AuthorCommandV5,
): ScriptFlowV5 {
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
  state: ScriptEditorStateV5,
  map: (command: AuthorCommandV5) => AuthorCommandV5,
): void {
  for (const scene of state.scenes) {
    for (const entity of scene.entities) {
      for (const channel of ['trigger', 'auto'] as const) {
        const registry = entity.behaviors?.[channel]
        if (!registry) continue
        for (const value of Object.values(registry)) value.flow = mapFlowCommands(value.flow, map)
      }
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
    for (const effect of item.throw?.effects ?? [])
      if (effect.kind === 'itemPrivateScript')
        effect.script.body = mapCommands(effect.script.body, map)
  }
  for (const script of Object.values(state.sharedScripts))
    script.body = mapCommands(script.body, map)
}

export interface ScriptV5Reference {
  kind: 'page' | 'command'
  path: string
}

export interface ScriptV5ReferenceIssue {
  severity: 'error'
  path: string
  message: string
}

/**
 * canonical v5 共享脚本引用闭包。兼容壳里的 `__script-v5-runtime` ScriptRef 只是旧 UI/宿主投影，
 * 不能拿旧 ScriptChunk 校验器判断；真正的作者引用必须在这里按稳定 ScriptId 对 sharedScripts 验证。
 */
export function collectScriptV5ReferenceIssues(
  state: ScriptEditorStateV5,
): ScriptV5ReferenceIssue[] {
  const issues: ScriptV5ReferenceIssue[] = []
  const sharedIds = new Set(Object.keys(state.sharedScripts))
  const check = (scriptId: string, path: string): void => {
    if (!sharedIds.has(scriptId))
      issues.push({
        severity: 'error',
        path,
        message: `共享脚本 "${scriptId}" 不在 canonical v5 脚本库`,
      })
  }
  for (const item of state.items) {
    for (const slot of ['use', 'throw'] as const) {
      for (const [index, effect] of (item[slot]?.effects ?? []).entries()) {
        if (effect.kind === 'runScript')
          check(effect.script, `items.${item.id}.${slot}.effects[${index}].script`)
      }
    }
  }
  walkStateCommands(state, (command, path) => {
    if (command.kind === 'callScript') check(command.script, `${path}.script`)
  })
  return issues
}

export function behaviorReferencesV5(
  state: ScriptEditorStateV5,
  target: EntityAddress,
  channel: 'trigger' | 'auto',
  behaviorId: string,
): ScriptV5Reference[] {
  const references: ScriptV5Reference[] = []
  const { entity } = sceneAndEntity(state, target)
  for (const page of entity.pages ?? []) {
    if (page[channel] === behaviorId)
      references.push({
        kind: 'page',
        path: `scenes.${target.scene}.entities.${target.entity}.pages.${page.id}.${channel}`,
      })
  }
  walkStateCommands(state, (command, path) => {
    if (
      command.kind === 'selectEntityBehavior' &&
      sameAddress(command.target, target) &&
      command.channel === channel &&
      command.selection.kind === 'use' &&
      command.selection.value === behaviorId
    )
      references.push({ kind: 'command', path })
  })
  return references
}

export interface SceneHookV5Reference {
  kind: 'initial' | 'command'
  path: string
}

function sceneHook(
  state: ScriptEditorStateV5,
  sceneId: string,
  slot: SceneHookSlotV5,
  hookId: string,
): NamedSceneHookV5 {
  const value = sceneById(state, sceneId).hooks?.[slot]?.variants[hookId]
  if (!value) throw new Error(`hook 不存在 ${sceneId}/${slot}/${hookId}`)
  return value
}

export function sceneHookReferencesV5(
  state: ScriptEditorStateV5,
  sceneId: string,
  slot: SceneHookSlotV5,
  hookId: string,
): SceneHookV5Reference[] {
  const references: SceneHookV5Reference[] = []
  const scene = sceneById(state, sceneId)
  if (scene.hooks?.[slot]?.initial === hookId)
    references.push({
      kind: 'initial',
      path: `scenes.${sceneId}.hooks.${slot}.initial`,
    })
  walkStateCommands(state, (command, path) => {
    const selection = command.kind === 'selectSceneHooks' ? command.selection[slot] : undefined
    if (
      command.kind === 'selectSceneHooks' &&
      command.scene === sceneId &&
      selection?.kind === 'use' &&
      selection.value === hookId
    )
      references.push({ kind: 'command', path })
  })
  return references
}

function validateState(state: ScriptEditorStateV5): void {
  validateScenesV5(state.scenes)
  validateItemsV5(state.items)
  checkSharedScriptLibraryV5(state.sharedScripts)
  const issue = collectScriptV5ReferenceIssues(state)[0]
  if (issue) throw new Error(`${issue.path}: ${issue.message}`)
}

abstract class SnapshotCommandV5 implements ScriptEditorCommandV5 {
  private before?: ScriptEditorStateV5
  private after?: ScriptEditorStateV5

  abstract readonly label: string
  protected abstract transform(state: ScriptEditorStateV5): void

  apply(state: ScriptEditorStateV5): ScriptEditorStateV5 {
    if (this.after) return clone(this.after)
    this.before = clone(state)
    const next = clone(state)
    this.transform(next)
    validateState(next)
    this.after = clone(next)
    return next
  }

  invert(_state: ScriptEditorStateV5): ScriptEditorStateV5 {
    if (!this.before) throw new Error(`${this.label}: 尚未 apply`)
    return clone(this.before)
  }
}

export class ScriptV5EditSession {
  private past: ScriptEditorCommandV5[] = []
  private future: ScriptEditorCommandV5[] = []
  private state: ScriptEditorStateV5
  private dirty = false
  private version = 0
  private readonly listeners = new Set<() => void>()

  constructor(state: ScriptEditorStateV5) {
    validateState(state)
    this.state = clone(state)
  }

  getState(): ScriptEditorStateV5 {
    return clone(this.state)
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

  dispatch(command: ScriptEditorCommandV5): boolean {
    this.state = command.apply(this.state)
    this.past.push(command)
    this.future = []
    this.dirty = true
    this.notify()
    return true
  }

  undo(): boolean {
    const command = this.past.pop()
    if (!command) return false
    this.state = command.invert(this.state)
    this.future.push(command)
    this.dirty = true
    this.notify()
    return true
  }

  redo(): boolean {
    const command = this.future.pop()
    if (!command) return false
    this.state = command.apply(this.state)
    this.past.push(command)
    this.dirty = true
    this.notify()
    return true
  }

  private notify(): void {
    this.version += 1
    for (const listener of this.listeners) listener()
  }
}

export class AddEntityBehaviorV5Command extends SnapshotCommandV5 {
  readonly label = '新增具名行为'

  constructor(
    private readonly target: EntityAddress,
    private readonly channel: 'trigger' | 'auto',
    private readonly behaviorId: string,
    private readonly value: NamedEntityBehaviorV5,
  ) {
    super()
  }

  protected transform(state: ScriptEditorStateV5): void {
    checkBehaviorId(this.behaviorId)
    const { entity } = sceneAndEntity(state, this.target)
    entity.behaviors ??= {}
    let registry = entity.behaviors[this.channel]
    if (!registry) {
      registry = {}
      entity.behaviors[this.channel] = registry
    }
    if (registry[this.behaviorId]) throw new Error(`BehaviorId 已存在 ${this.behaviorId}`)
    registry[this.behaviorId] = clone(this.value)
  }
}

export class CopyEntityBehaviorV5Command extends SnapshotCommandV5 {
  readonly label = '复制具名行为'

  constructor(
    private readonly target: EntityAddress,
    private readonly channel: 'trigger' | 'auto',
    private readonly sourceId: string,
    private readonly copyId: string,
    private readonly copyLabel?: string,
  ) {
    super()
  }

  protected transform(state: ScriptEditorStateV5): void {
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

export class RenameEntityBehaviorV5Command extends SnapshotCommandV5 {
  readonly label = '重命名具名行为'

  constructor(
    private readonly target: EntityAddress,
    private readonly channel: 'trigger' | 'auto',
    private readonly from: string,
    private readonly to: string,
  ) {
    super()
  }

  protected transform(state: ScriptEditorStateV5): void {
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
    mapAllCommands(state, (command) =>
      command.kind === 'selectEntityBehavior' &&
      sameAddress(command.target, this.target) &&
      command.channel === this.channel &&
      command.selection.kind === 'use' &&
      command.selection.value === this.from
        ? {
            ...command,
            selection: { kind: 'use', value: this.to },
          }
        : command,
    )
  }
}

export class UpdateEntityBehaviorV5Command extends SnapshotCommandV5 {
  readonly label = '编辑具名行为'

  constructor(
    private readonly target: EntityAddress,
    private readonly channel: 'trigger' | 'auto',
    private readonly behaviorId: string,
    private readonly patch: Partial<NamedEntityBehaviorV5>,
  ) {
    super()
  }

  protected transform(state: ScriptEditorStateV5): void {
    const source = behavior(state, this.target, this.channel, this.behaviorId)
    const next = { ...clone(source), ...clone(this.patch) }
    const registry = behaviorRegistry(state, this.target, this.channel)
    if (!registry) throw new Error('behavior registry 缺失')
    registry[this.behaviorId] = next
  }
}

export class DeleteEntityBehaviorV5Command extends SnapshotCommandV5 {
  readonly label = '删除具名行为'

  constructor(
    private readonly target: EntityAddress,
    private readonly channel: 'trigger' | 'auto',
    private readonly behaviorId: string,
  ) {
    super()
  }

  protected transform(state: ScriptEditorStateV5): void {
    behavior(state, this.target, this.channel, this.behaviorId)
    const refs = behaviorReferencesV5(state, this.target, this.channel, this.behaviorId)
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

export class AddSceneHookV5Command extends SnapshotCommandV5 {
  readonly label = '新增场景 Hook'

  constructor(
    private readonly sceneId: string,
    private readonly slot: SceneHookSlotV5,
    private readonly hookId: string,
    private readonly value: NamedSceneHookV5,
  ) {
    super()
  }

  protected transform(state: ScriptEditorStateV5): void {
    checkHookId(this.hookId)
    const scene = sceneById(state, this.sceneId)
    scene.hooks ??= {}
    const existing = scene.hooks[this.slot]
    if (!existing) {
      scene.hooks[this.slot] = {
        initial: this.hookId,
        variants: { [this.hookId]: clone(this.value) },
      }
      return
    }
    if (existing.variants[this.hookId]) throw new Error(`HookId 已存在 ${this.hookId}`)
    existing.variants[this.hookId] = clone(this.value)
  }
}

export class CopySceneHookV5Command extends SnapshotCommandV5 {
  readonly label = '复制场景 Hook'

  constructor(
    private readonly sceneId: string,
    private readonly slot: SceneHookSlotV5,
    private readonly sourceId: string,
    private readonly copyId: string,
    private readonly copyLabel?: string,
  ) {
    super()
  }

  protected transform(state: ScriptEditorStateV5): void {
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

export class RenameSceneHookV5Command extends SnapshotCommandV5 {
  readonly label = '重命名场景 Hook'

  constructor(
    private readonly sceneId: string,
    private readonly slot: SceneHookSlotV5,
    private readonly from: string,
    private readonly to: string,
  ) {
    super()
  }

  protected transform(state: ScriptEditorStateV5): void {
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

export class UpdateSceneHookV5Command extends SnapshotCommandV5 {
  readonly label = '编辑场景 Hook'

  constructor(
    private readonly sceneId: string,
    private readonly slot: SceneHookSlotV5,
    private readonly hookId: string,
    private readonly patch: Partial<NamedSceneHookV5>,
  ) {
    super()
  }

  protected transform(state: ScriptEditorStateV5): void {
    const source = sceneHook(state, this.sceneId, this.slot, this.hookId)
    const next = { ...clone(source), ...clone(this.patch) }
    const variants = sceneById(state, this.sceneId).hooks?.[this.slot]?.variants
    if (!variants) throw new Error('hook registry 缺失')
    variants[this.hookId] = next
  }
}

export class SetSceneHookInitialV5Command extends SnapshotCommandV5 {
  readonly label = '选择场景初始 Hook'

  constructor(
    private readonly sceneId: string,
    private readonly slot: SceneHookSlotV5,
    private readonly hookId: string | undefined,
  ) {
    super()
  }

  protected transform(state: ScriptEditorStateV5): void {
    const channel = sceneById(state, this.sceneId).hooks?.[this.slot]
    if (!channel) throw new Error(`hook 通道不存在 ${this.sceneId}/${this.slot}`)
    if (this.hookId && !channel.variants[this.hookId])
      throw new Error(`hook 不存在 ${this.sceneId}/${this.slot}/${this.hookId}`)
    if (this.hookId) channel.initial = this.hookId
    else delete channel.initial
  }
}

export class DeleteSceneHookV5Command extends SnapshotCommandV5 {
  readonly label = '删除场景 Hook'

  constructor(
    private readonly sceneId: string,
    private readonly slot: SceneHookSlotV5,
    private readonly hookId: string,
  ) {
    super()
  }

  protected transform(state: ScriptEditorStateV5): void {
    sceneHook(state, this.sceneId, this.slot, this.hookId)
    const refs = sceneHookReferencesV5(state, this.sceneId, this.slot, this.hookId)
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

export class SetItemPrivateScriptBodyV5Command extends SnapshotCommandV5 {
  readonly label = '编辑物品私有脚本'

  constructor(
    private readonly itemId: string,
    private readonly use: 'use' | 'throw',
    private readonly effectIndex: number,
    private readonly body: AuthorCommandV5[],
  ) {
    super()
  }

  protected transform(state: ScriptEditorStateV5): void {
    const item = state.items.find((candidate) => candidate.id === this.itemId)
    if (!item) throw new Error(`物品不存在 ${this.itemId}`)
    const effect = item[this.use]?.effects[this.effectIndex]
    if (effect?.kind !== 'itemPrivateScript')
      throw new Error(`${this.itemId}.${this.use}.effects[${this.effectIndex}] 不是物品私有脚本`)
    effect.script.body = clone(this.body)
  }
}

export class AddSharedScriptV5Command extends SnapshotCommandV5 {
  readonly label = '新增共享脚本'

  constructor(
    private readonly scriptId: string,
    private readonly value: SharedAuthorScriptV5,
  ) {
    super()
  }

  protected transform(state: ScriptEditorStateV5): void {
    checkScriptId(this.scriptId)
    if (state.sharedScripts[this.scriptId]) throw new Error(`ScriptId 已存在 ${this.scriptId}`)
    state.sharedScripts[this.scriptId] = clone(this.value)
  }
}

export class UpdateSharedScriptV5Command extends SnapshotCommandV5 {
  readonly label = '编辑共享脚本'

  constructor(
    private readonly scriptId: string,
    private readonly patch: Partial<SharedAuthorScriptV5>,
  ) {
    super()
  }

  protected transform(state: ScriptEditorStateV5): void {
    const source = state.sharedScripts[this.scriptId]
    if (!source) throw new Error(`共享脚本不存在 ${this.scriptId}`)
    state.sharedScripts[this.scriptId] = { ...clone(source), ...clone(this.patch) }
  }
}

export class DeleteSharedScriptV5Command extends SnapshotCommandV5 {
  readonly label = '删除共享脚本'

  constructor(private readonly scriptId: string) {
    super()
  }

  protected transform(state: ScriptEditorStateV5): void {
    if (!state.sharedScripts[this.scriptId]) throw new Error(`共享脚本不存在 ${this.scriptId}`)
    delete state.sharedScripts[this.scriptId]
  }
}

export class SetEntityPageBehaviorV5Command extends SnapshotCommandV5 {
  readonly label = '选择实体页行为'

  constructor(
    private readonly target: EntityAddress,
    private readonly pageId: string,
    private readonly channel: 'trigger' | 'auto',
    private readonly behaviorId: string | undefined,
  ) {
    super()
  }

  protected transform(state: ScriptEditorStateV5): void {
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

export type SelectionPresentationV5 = {
  tone: 'inherit' | 'disabled' | 'use'
  label: string
}

export function presentSelectionV5<T>(
  selection: Selection<T>,
  valueLabel: (value: T) => string,
): SelectionPresentationV5 {
  if (selection.kind === 'inherit') return { tone: 'inherit', label: '继承静态定义' }
  if (selection.kind === 'disabled') return { tone: 'disabled', label: '显式禁用' }
  return { tone: 'use', label: `使用：${valueLabel(selection.value)}` }
}

export function stateTransitionExecutionLabelV5(
  transition: StateTransitionV5,
): '同步继续' | '下次激活' | '让步后同次继续' | '条件分派' {
  if (transition.kind === 'branch' || transition.kind === 'commandOutcome') return '条件分派'
  if (transition.kind === 'continue') return '同步继续'
  if (transition.kind === 'to') return '让步后同次继续'
  return '下次激活'
}
