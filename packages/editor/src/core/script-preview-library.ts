/** Editor-only starting positions. These records never enter game content or saves. */
import type { AuthorSceneDef, Facing, GridPos, SceneDef } from '@type-pal/content'
import type { FileSource } from '@type-pal/reforge/author-io'
import type { Command, EditorState } from './edit-session.js'

export const SCRIPT_PREVIEW_PATH = 'editor/script-preview.json'

export interface PreviewEntityState {
  entityId: string
  pos?: GridPos
  facing?: Facing
  hidden?: boolean
  collide?: boolean
  zBias?: number
}

export interface SceneInitialState {
  id: string
  sceneId: string
  name: string
  entities: PreviewEntityState[]
}

export interface ScriptPreviewSchemeEntry {
  sceneId: string
  entityId?: string
  channel: 'onEnter' | 'onTeleport' | 'trigger' | 'auto'
  schemeId: string
}

export interface ScriptPreviewEntry extends ScriptPreviewSchemeEntry {
  stageId: string
}

export interface ScriptPreviewLibrary {
  kind: 'type-pal-script-preview'
  version: 2
  states: SceneInitialState[]
  schemeDefaults: { entry: ScriptPreviewSchemeEntry; stateId: string }[]
  bindings: { entry: ScriptPreviewEntry; stateId: string | null }[]
}

export function emptyScriptPreviewLibrary(): ScriptPreviewLibrary {
  return {
    kind: 'type-pal-script-preview',
    version: 2,
    states: [],
    schemeDefaults: [],
    bindings: [],
  }
}

export function scriptPreviewEntryKey(entry: ScriptPreviewEntry): string {
  return JSON.stringify([
    entry.sceneId,
    entry.entityId ?? null,
    entry.channel,
    entry.schemeId,
    entry.stageId,
  ])
}

export function scriptPreviewSchemeKey(entry: ScriptPreviewSchemeEntry): string {
  return JSON.stringify([entry.sceneId, entry.entityId ?? null, entry.channel, entry.schemeId])
}

function scriptPreviewFlow(entry: ScriptPreviewSchemeEntry, scenes: readonly AuthorSceneDef[]) {
  const scene = scenes.find((candidate) => candidate.id === entry.sceneId)
  return entry.channel === 'auto' || entry.channel === 'trigger'
    ? scene?.entities.find((entity) => entity.id === entry.entityId)?.behaviors?.[entry.channel]?.[
        entry.schemeId
      ]?.flow
    : scene?.hooks?.[entry.channel]?.variants[entry.schemeId]?.flow
}

export function scriptPreviewSchemeExists(
  entry: ScriptPreviewSchemeEntry,
  scenes: readonly AuthorSceneDef[],
): boolean {
  return scriptPreviewFlow(entry, scenes) !== undefined
}

export function scriptPreviewEntryExists(
  entry: ScriptPreviewEntry,
  scenes: readonly AuthorSceneDef[],
): boolean {
  return (
    scriptPreviewFlow(entry, scenes)?.stages.some((stage) => stage.id === entry.stageId) ?? false
  )
}

/** An explicit null blocks inheritance. Invalid IDs stay visible for repair, never fall through. */
export function resolveScriptPreviewBinding(
  library: ScriptPreviewLibrary,
  entry: ScriptPreviewEntry,
): { stateId: string | null; source: 'step' | 'scheme' | 'scene' } {
  const step = library.bindings.find(
    (binding) => scriptPreviewEntryKey(binding.entry) === scriptPreviewEntryKey(entry),
  )
  if (step) return { stateId: step.stateId, source: 'step' }
  const scheme = library.schemeDefaults.find(
    (binding) => scriptPreviewSchemeKey(binding.entry) === scriptPreviewSchemeKey(entry),
  )
  return scheme ? { stateId: scheme.stateId, source: 'scheme' } : { stateId: null, source: 'scene' }
}

/** Enumerate actual steps so inherited users appear in sharing/deletion explanations. */
export function scriptPreviewSceneEntries(scene: AuthorSceneDef): ScriptPreviewEntry[] {
  const entries: ScriptPreviewEntry[] = []
  for (const entity of scene.entities)
    for (const channel of ['trigger', 'auto'] as const)
      for (const [schemeId, scheme] of Object.entries(entity.behaviors?.[channel] ?? {}))
        for (const stage of scheme.flow.stages)
          entries.push({
            sceneId: scene.id,
            entityId: entity.id,
            channel,
            schemeId,
            stageId: stage.id,
          })
  for (const channel of ['onEnter', 'onTeleport'] as const)
    for (const [schemeId, scheme] of Object.entries(scene.hooks?.[channel]?.variants ?? {}))
      for (const stage of scheme.flow.stages)
        entries.push({ sceneId: scene.id, channel, schemeId, stageId: stage.id })
  return entries
}

export function isScriptPreviewLibraryEmpty(library: ScriptPreviewLibrary): boolean {
  return !library.states.length && !library.bindings.length && !library.schemeDefaults.length
}

/** Remove only references deleted by this author action; loaded invalid data remains repairable. */
export function removeDeletedScriptPreviewReferences(
  library: ScriptPreviewLibrary | undefined,
  before: readonly AuthorSceneDef[],
  after: readonly AuthorSceneDef[],
): ScriptPreviewLibrary | undefined {
  if (!library) return library
  const states = library.states.flatMap((state) => {
    const oldScene = before.find((scene) => scene.id === state.sceneId)
    const nextScene = after.find((scene) => scene.id === state.sceneId)
    if (!oldScene) return [state]
    if (!nextScene) return []
    const entities = state.entities.filter(
      (entry) =>
        !oldScene.entities.some((entity) => entity.id === entry.entityId) ||
        nextScene.entities.some((entity) => entity.id === entry.entityId),
    )
    return [entities.length === state.entities.length ? state : { ...state, entities }]
  })
  const removedStateIds = new Set(
    library.states
      .filter((state) => !states.some((s) => s.id === state.id))
      .map((state) => state.id),
  )
  const bindings = library.bindings.filter(
    (binding) =>
      (binding.stateId === null || !removedStateIds.has(binding.stateId)) &&
      (!scriptPreviewEntryExists(binding.entry, before) ||
        scriptPreviewEntryExists(binding.entry, after)),
  )
  const schemeDefaults = library.schemeDefaults.filter(
    (binding) =>
      !removedStateIds.has(binding.stateId) &&
      (!scriptPreviewSchemeExists(binding.entry, before) ||
        scriptPreviewSchemeExists(binding.entry, after)),
  )
  if (
    states.length === library.states.length &&
    states.every((state, index) => state === library.states[index]) &&
    bindings.length === library.bindings.length &&
    schemeDefaults.length === library.schemeDefaults.length
  )
    return library
  return { ...library, states, bindings, schemeDefaults }
}

function object(value: unknown, keys: readonly string[], where: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${where}: 需要对象`)
  for (const key of Object.keys(value))
    if (!keys.includes(key)) throw new Error(`${where}: 不支持属性 ${key}`)
  return value as Record<string, unknown>
}

function id(value: unknown, where: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${where}: 不能为空`)
  return value
}

function finite(value: unknown, where: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error(`${where}: 需要有限数值`)
  return value
}

function array(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${where}: 需要数组`)
  return value
}

function unique(values: readonly string[], where: string): void {
  if (new Set(values).size !== values.length) throw new Error(`${where}: ID重复`)
}

function parseSchemeEntry(e: Record<string, unknown>): ScriptPreviewSchemeEntry {
  const channel = e.channel
  if (
    channel !== 'onEnter' &&
    channel !== 'onTeleport' &&
    channel !== 'trigger' &&
    channel !== 'auto'
  )
    throw new Error('entry.channel: 无效脚本通道')
  if ((channel === 'trigger' || channel === 'auto') !== Object.hasOwn(e, 'entityId'))
    throw new Error('entry.entityId: 仅实体脚本必须指定实体')
  return {
    sceneId: id(e.sceneId, 'entry.sceneId'),
    channel,
    schemeId: id(e.schemeId, 'entry.schemeId'),
    ...(Object.hasOwn(e, 'entityId') ? { entityId: id(e.entityId, 'entry.entityId') } : {}),
  }
}

export function parseScriptPreviewLibrary(value: unknown): ScriptPreviewLibrary {
  const v = object(
    value,
    ['kind', 'version', 'states', 'schemeDefaults', 'bindings'],
    SCRIPT_PREVIEW_PATH,
  )
  if (v.kind !== 'type-pal-script-preview' || v.version !== 2)
    throw new Error(`${SCRIPT_PREVIEW_PATH}: 仅支持当前 type-pal-script-preview version 2`)
  const states = array(v.states, 'states').map((raw): SceneInitialState => {
    const s = object(raw, ['id', 'sceneId', 'name', 'entities'], '初始状态方案')
    const entities = array(s.entities, 'entities').map((rawEntity): PreviewEntityState => {
      const e = object(
        rawEntity,
        ['entityId', 'pos', 'facing', 'hidden', 'collide', 'zBias'],
        '实体状态',
      )
      const result: PreviewEntityState = { entityId: id(e.entityId, 'entityId') }
      if (Object.hasOwn(e, 'pos')) {
        const p = object(e.pos, ['col', 'row', 'height'], 'pos')
        result.pos = {
          col: finite(p.col, 'col'),
          row: finite(p.row, 'row'),
          height: finite(p.height, 'height'),
        }
      }
      if (Object.hasOwn(e, 'facing')) {
        if (e.facing !== 'up' && e.facing !== 'down' && e.facing !== 'left' && e.facing !== 'right')
          throw new Error('facing: 无效朝向')
        result.facing = e.facing
      }
      for (const key of ['hidden', 'collide'] as const) {
        if (!Object.hasOwn(e, key)) continue
        if (typeof e[key] !== 'boolean') throw new Error(`${key}: 需要布尔值`)
        result[key] = e[key]
      }
      if (Object.hasOwn(e, 'zBias')) result.zBias = finite(e.zBias, 'zBias')
      return result
    })
    unique(
      entities.map((e) => e.entityId),
      'entities',
    )
    return {
      id: id(s.id, 'state.id'),
      sceneId: id(s.sceneId, 'sceneId'),
      name: id(s.name, 'name'),
      entities,
    }
  })
  unique(
    states.map((s) => s.id),
    'states',
  )
  const bindings = array(v.bindings, 'bindings').map((raw) => {
    const b = object(raw, ['entry', 'stateId'], 'binding')
    const e = object(b.entry, ['sceneId', 'entityId', 'channel', 'schemeId', 'stageId'], 'entry')
    const entry: ScriptPreviewEntry = {
      ...parseSchemeEntry(e),
      stageId: id(e.stageId, 'entry.stageId'),
    }
    return { entry, stateId: b.stateId === null ? null : id(b.stateId, 'binding.stateId') }
  })
  unique(
    bindings.map((b) => scriptPreviewEntryKey(b.entry)),
    'bindings',
  )
  const schemeDefaults = array(v.schemeDefaults, 'schemeDefaults').map((raw) => {
    const b = object(raw, ['entry', 'stateId'], 'schemeDefault')
    const e = object(b.entry, ['sceneId', 'entityId', 'channel', 'schemeId'], 'schemeDefault.entry')
    return { entry: parseSchemeEntry(e), stateId: id(b.stateId, 'schemeDefault.stateId') }
  })
  unique(
    schemeDefaults.map((binding) => scriptPreviewSchemeKey(binding.entry)),
    'schemeDefaults',
  )
  return { kind: 'type-pal-script-preview', version: 2, states, bindings, schemeDefaults }
}

export function assertScriptPreviewPathAvailable(
  project: Pick<EditorState, 'manifest' | 'sceneIndex' | 'mapIndex' | 'assetCatalog'>,
): void {
  const paths = [
    project.manifest.assets.catalog,
    ...Object.entries(project.manifest.content).flatMap(([key, path]) =>
      typeof path === 'string'
        ? [key === 'scenes' ? `${path.replace(/\/?$/, '/')}index.json` : path]
        : [],
    ),
    ...project.sceneIndex.scenes.map((s) => s.path),
    ...project.mapIndex.maps.map((m) => m.path),
    ...Object.values(project.assetCatalog.assets).map((a) => a.path),
  ]
  for (const path of paths) {
    const key = path.toLowerCase()
    if (
      key === SCRIPT_PREVIEW_PATH ||
      key.startsWith(`${SCRIPT_PREVIEW_PATH}/`) ||
      SCRIPT_PREVIEW_PATH.startsWith(`${key}/`)
    )
      throw new Error(`初始状态保留路径冲突：${SCRIPT_PREVIEW_PATH} 与 ${path}`)
  }
}

export async function loadScriptPreviewDocument(
  source: FileSource,
): Promise<{ library: ScriptPreviewLibrary; bytes: ArrayBuffer } | undefined> {
  let bytes: ArrayBuffer
  try {
    bytes = await source.readBytes(SCRIPT_PREVIEW_PATH)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return undefined
    throw new Error(`无法读取 ${SCRIPT_PREVIEW_PATH}`, { cause: error })
  }
  try {
    return {
      library: parseScriptPreviewLibrary(
        JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)),
      ),
      bytes,
    }
  } catch (error) {
    throw new Error(
      `${SCRIPT_PREVIEW_PATH}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    )
  }
}

export async function loadScriptPreviewLibrary(
  source: FileSource,
): Promise<ScriptPreviewLibrary | undefined> {
  return (await loadScriptPreviewDocument(source))?.library
}

export function scriptPreviewRemovalPaths(library: ScriptPreviewLibrary | undefined): string[] {
  return !library || isScriptPreviewLibraryEmpty(library) ? [SCRIPT_PREVIEW_PATH] : []
}

/** Detached projection for rendering/execution only. Never pass this result to a project command. */
export function applySceneInitialState<
  T extends { id: string; entities: readonly Pick<SceneDef['entities'][number], 'id' | 'pos'>[] },
>(scene: T, state: SceneInitialState | undefined): T {
  if (!state) return scene
  if (state.sceneId !== scene.id) throw new Error(`初始状态“${state.name}”不属于当前场景`)
  for (const entry of state.entities) {
    const entity = scene.entities.find((e) => e.id === entry.entityId)
    if (!entity) throw new Error(`初始状态“${state.name}”引用已不存在的实体 ${entry.entityId}`)
    if ('zone' in entity && entry.facing !== undefined)
      throw new Error(`触发区 ${entry.entityId} 不能设置朝向`)
  }
  return {
    ...scene,
    entities: scene.entities.map((entity) => {
      const entry = state.entities.find((e) => e.entityId === entity.id)
      if (!entry) return entity
      const { entityId: _id, ...properties } = entry
      return { ...entity, ...properties, pos: { ...(entry.pos ?? entity.pos) } }
    }),
  }
}

export class SetScriptPreviewLibraryCommand implements Command {
  readonly label = '编辑预览初始状态'
  private before?: ScriptPreviewLibrary
  private captured = false
  private readonly next: ScriptPreviewLibrary | undefined
  constructor(value: ScriptPreviewLibrary) {
    const parsed = parseScriptPreviewLibrary(value)
    this.next = isScriptPreviewLibraryEmpty(parsed) ? undefined : parsed
  }
  apply(state: EditorState): EditorState {
    if (JSON.stringify(state.scriptPreview) === JSON.stringify(this.next)) return state
    if (!this.captured) {
      this.before = structuredClone(state.scriptPreview)
      this.captured = true
    }
    return this.replace(state, this.next)
  }
  invert(state: EditorState): EditorState {
    if (!this.captured) throw new Error('初始状态命令尚未执行')
    return this.replace(state, this.before)
  }
  private replace(state: EditorState, value: ScriptPreviewLibrary | undefined): EditorState {
    const next = { ...state }
    if (value) next.scriptPreview = structuredClone(value)
    else delete next.scriptPreview
    return next
  }
}
