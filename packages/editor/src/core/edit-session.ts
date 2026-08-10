/**
 * EditSession + 撤销/重做核(D-B0 第二根地基,最大防返工点)。
 *
 * 持有工程的不可变工作副本;所有改动经 dispatch(Command) —— 统一驱动 undo/redo + 通知。
 * 铁律:命令不得原地 mutate 数据(命令返回新态)。React 经 subscribe + useSyncExternalStore
 * 订阅(B1 接),状态变 → 重渲染。
 *
 * 纯 TS + 无 React → 重度单测。见 docs/phase2/editor/editor-design.md §4。
 */
import type {
  AssetCatalogV1,
  ContentBundle,
  CurrentManifest,
  LoadedManifest,
  MapIndexV1,
  ProjectMap,
  ScriptChunkV1,
  ScriptIndexV1,
  StampTemplateV1,
} from '@type-pal/content'
import type { ManifestV13 } from '@type-pal/content'
import type { Command } from './commands.js'

export type { Command } from './commands.js'
// commands.ts 引 EditorState(type),本文件引 Command(type) —— 仅类型,运行期无环。
export { MoveEntityCommand } from './commands.js'

/** 被编辑的内容工作副本(ContentBundle + manifest)。命令 apply/invert 收/返它(不可变)。 */
export interface EditorState extends ContentBundle {
  manifest: LoadedManifest | CurrentManifest | ManifestV13
  /** W7G 作者态图章模板表；旧工程加载时规范化为空数组。 */
  stamps: StampTemplateV1[]
  /**
   * 自有地图工作副本:键 = map asset 稳定 id。文件路径只从 mapIndex 解析。
   * 编辑器画布读取此实时态；保存时按 MapAssetDefV1.path 序列化。
   */
  maps: Record<string, ProjectMap>
  /** 地图资产发现真值；包含零场景引用地图。 */
  mapIndex: MapIndexV1
  /**
   * 历史名称：尚未 catalog 化的 effect-sprite RLE 上传暂存。
   * tileset、world sprite 与 battle-sprite 已迁到 assetCatalog + assetBlobs，不得再消费此字段。
   */
  tilesetBlobs: Record<string, ArrayBuffer>
  /** 分片脚本工作副本；普通 inline 工程均为空/undefined。 */
  scriptIndex?: ScriptIndexV1
  scriptChunks: Record<string, ScriptChunkV1>
  /** 工程唯一资源注册表；音乐页与运行时共用同一份 AssetId -> path 真值。 */
  assetCatalog: AssetCatalogV1
  /** 本会话新导入/替换的二进制，键为 catalog 中的工程相对 path。 */
  assetBlobs: Record<string, ArrayBuffer>
}

export type MapDocumentStatus =
  | { state: 'unloaded' }
  | { state: 'loading' }
  | { state: 'ready'; dirty: boolean }
  | { state: 'error'; message: string }

export interface EditSessionOptions {
  /** 按稳定 id 读一张 ProjectMap；缺省时只能编辑已注入/新建地图。 */
  loadMap?: (mapId: string) => Promise<ProjectMap>
  /** 仅淘汰从未编辑的干净文档；脏地图和撤销链触及地图永不静默丢弃。 */
  maxLoadedMaps?: number
}

export interface EditSessionTransactionReceipt {
  /** 仅供跨 session coordinator 在同一同步事务失败时调用；不产生 redo 项。 */
  rollback(): void
}

/** 编辑会话:不可变工作副本 + undo/redo 栈 + 订阅 + 脏标记。 */
export class EditSession {
  private state: EditorState
  private past: Command[] = []
  private future: Command[] = []
  /** 有未保存改动(自上次 markSaved 后 dispatch/undo/redo 过)。保存按钮据此亮 ●。 */
  private dirty = false
  private readonly dirtyMapIds = new Set<string>()
  private readonly pinnedMapIds = new Set<string>()
  private readonly loadMap?: (mapId: string) => Promise<ProjectMap>
  private readonly maxLoadedMaps: number
  private readonly mapLoads = new Map<string, Promise<ProjectMap>>()
  private readonly mapErrors = new Map<string, string>()
  /** 每张地图独立、单调递增的内存 revision；含 dispatch / undo / redo / hydrate。 */
  private readonly mapRevisions = new Map<string, number>()
  private mapLru: string[]
  private persistedMapPaths: Set<string>
  private persistedAssetPaths: Set<string>
  /** 每次 notify 自增。useSyncExternalStore 的 snapshot 用它 —— 因为 markSaved/undo 等
   *  「非内容态」变化不改 state 引用,单靠 getState 当 snapshot 会漏掉这些变化不重渲染。 */
  private version = 0
  /** 只在 dispatch/undo/redo 时递增；markSaved/hydrate 不得篡改全局撤销归属。 */
  private historyVersion = 0
  private readonly listeners = new Set<() => void>()

  constructor(initial: EditorState, options: EditSessionOptions = {}) {
    this.state = initial
    this.loadMap = options.loadMap
    this.maxLoadedMaps = Math.max(1, options.maxLoadedMaps ?? 12)
    this.mapLru = Object.keys(initial.maps)
    this.persistedMapPaths = new Set(initial.mapIndex.maps.map((asset) => asset.path))
    this.persistedAssetPaths = new Set(
      Object.values(initial.assetCatalog.assets).map((asset) => asset.path),
    )
  }

  /** 当前状态(返回引用;调用方不得 mutate —— 要改发 Command)。 */
  getState(): EditorState {
    return this.state
  }

  /** 是否有未保存的改动(保存 UI 据此亮 ●)。 */
  isDirty(): boolean {
    return this.dirty
  }

  /** 标记已保存:清脏标记并通知(保存按钮 ● 要刷新成已保存态)。 */
  markSaved(): void {
    this.dirty = false
    this.dirtyMapIds.clear()
    this.persistedMapPaths = new Set(this.state.mapIndex.maps.map((asset) => asset.path))
    this.persistedAssetPaths = new Set(
      Object.values(this.state.assetCatalog.assets).map((asset) => asset.path),
    )
    this.notify()
  }

  /** 派发命令:apply → 入 past → 清 future → 置脏 → 通知。 */
  dispatch(cmd: Command): boolean {
    const previous = this.state
    const next = cmd.apply(this.state)
    if (next === previous) return false
    this.state = next
    this.trackMapChanges(previous, this.state)
    this.past.push(cmd)
    this.future = []
    this.dirty = true
    this.historyVersion += 1
    this.notify()
    return true
  }

  /**
   * 跨 session 原子操作专用：成功与普通 dispatch 同义；receipt 可精确恢复 dispatch 前
   * state/history/future/dirty。rollback 不是用户 undo，绝不会留下可 redo 的半状态。
   */
  dispatchForTransaction(cmd: Command): EditSessionTransactionReceipt | undefined {
    const before = {
      state: this.state,
      past: [...this.past],
      future: [...this.future],
      dirty: this.dirty,
      dirtyMapIds: new Set(this.dirtyMapIds),
      pinnedMapIds: new Set(this.pinnedMapIds),
      mapRevisions: new Map(this.mapRevisions),
      mapLru: [...this.mapLru],
    }
    if (!this.dispatch(cmd)) return undefined
    let active = true
    return {
      rollback: (): void => {
        if (!active) throw new Error('legacy transaction receipt 已失效')
        if (this.past.at(-1) !== cmd)
          throw new Error(`无法回滚事务：legacy history 顶部不是「${cmd.label}」`)
        active = false
        this.state = before.state
        this.past = before.past
        this.future = before.future
        this.dirty = before.dirty
        this.dirtyMapIds.clear()
        for (const id of before.dirtyMapIds) this.dirtyMapIds.add(id)
        this.pinnedMapIds.clear()
        for (const id of before.pinnedMapIds) this.pinnedMapIds.add(id)
        this.mapRevisions.clear()
        for (const [id, revision] of before.mapRevisions) this.mapRevisions.set(id, revision)
        this.mapLru = before.mapLru
        this.historyVersion += 1
        this.notify()
      },
    }
  }

  isUndoTop(cmd: Command): boolean {
    return this.past.at(-1) === cmd
  }

  isRedoTop(cmd: Command): boolean {
    return this.future.at(-1) === cmd
  }

  /** coordinator 清除已经失去另一半的 redo；不应用命令、不改内容。 */
  discardRedo(cmd: Command): boolean {
    if (!this.isRedoTop(cmd)) return false
    this.future.pop()
    this.historyVersion += 1
    this.notify()
    return true
  }

  /** 撤销:past 栈顶 invert。空栈 noop。 */
  undo(): boolean {
    const cmd = this.past.at(-1)
    if (!cmd) return false
    const previous = this.state
    const next = cmd.invert(this.state)
    this.past.pop()
    this.state = next
    this.trackMapChanges(previous, this.state)
    this.future.push(cmd)
    this.dirty = true
    this.historyVersion += 1
    this.notify()
    return true
  }

  /** 重做:future 栈顶 apply。空栈 noop。 */
  redo(): boolean {
    const cmd = this.future.at(-1)
    if (!cmd) return false
    const previous = this.state
    const next = cmd.apply(this.state)
    this.future.pop()
    this.state = next
    this.trackMapChanges(previous, this.state)
    this.past.push(cmd)
    this.dirty = true
    this.historyVersion += 1
    this.notify()
    return true
  }

  /** 变更版本号(每次 notify 自增);useSyncExternalStore 的 getSnapshot 用它。 */
  getVersion(): number {
    return this.version
  }

  getHistoryVersion(): number {
    return this.historyVersion
  }

  /** 图章 ghost / 变换预览的失效键；保存状态变化不会误增。 */
  getMapRevision(mapId: string): number {
    return this.mapRevisions.get(mapId) ?? 0
  }

  /**
   * 以预览时的 map revision 原子派发，封住 pointer preview → click 之间的过期提交窗口。
   * Command 自身仍应校验地图引用，形成双重 fail-loud 防线。
   */
  dispatchAtMapRevision(mapId: string, expectedRevision: number, cmd: Command): boolean {
    const actualRevision = this.getMapRevision(mapId)
    if (actualRevision !== expectedRevision)
      throw new Error(
        `地图 "${mapId}" 已变化（预览 revision ${expectedRevision}，当前 ${actualRevision}）；请重新预览。`,
      )
    return this.dispatch(cmd)
  }

  canUndo(): boolean {
    return this.past.length > 0
  }

  canRedo(): boolean {
    return this.future.length > 0
  }

  getMapDocumentStatus(mapId: string): MapDocumentStatus {
    if (this.state.maps[mapId]) return { state: 'ready', dirty: this.dirtyMapIds.has(mapId) }
    const error = this.mapErrors.get(mapId)
    if (error) return { state: 'error', message: error }
    return this.mapLoads.has(mapId) ? { state: 'loading' } : { state: 'unloaded' }
  }

  /** 按需 hydrate 不是作者操作：不入 undo、不置脏，并去重并发读。 */
  async ensureMapLoaded(mapId: string): Promise<ProjectMap> {
    const ready = this.state.maps[mapId]
    if (ready) {
      this.touchMap(mapId)
      return ready
    }
    const pending = this.mapLoads.get(mapId)
    if (pending) return pending
    if (!this.state.mapIndex.maps.some((asset) => asset.id === mapId))
      throw new Error(`地图 "${mapId}" 不在 map index`)
    if (!this.loadMap) throw new Error(`未配置地图加载器，无法打开 "${mapId}"`)

    this.mapErrors.delete(mapId)
    const promise = this.loadMap(mapId)
      .then((map) => {
        if (this.state.mapIndex.maps.some((asset) => asset.id === mapId)) {
          this.state = { ...this.state, maps: { ...this.state.maps, [mapId]: map } }
          this.bumpMapRevision(mapId)
          this.touchMap(mapId)
          this.evictCleanMaps(mapId)
        }
        this.mapLoads.delete(mapId)
        this.notify()
        return map
      })
      .catch((error: unknown) => {
        this.mapLoads.delete(mapId)
        const message = error instanceof Error ? error.message : String(error)
        this.mapErrors.set(mapId, message)
        this.notify()
        throw error
      })
    this.mapLoads.set(mapId, promise)
    this.notify()
    return promise
  }

  /** 原目录中曾存在、但当前索引已删除的 map 文件；首次增量保存也能精确删除。 */
  getDeletedMapPaths(): string[] {
    const current = new Set(this.state.mapIndex.maps.map((asset) => asset.path))
    return [...this.persistedMapPaths].filter((path) => !current.has(path))
  }

  /** 打开时存在、当前 catalog 已不再引用的资产文件；保存时精确删除。 */
  getDeletedAssetPaths(): string[] {
    const current = new Set(
      Object.values(this.state.assetCatalog.assets).map((asset) => asset.path),
    )
    return [...this.persistedAssetPaths].filter((path) => !current.has(path))
  }

  private trackMapChanges(before: EditorState, after: EditorState): void {
    const ids = new Set([...Object.keys(before.maps), ...Object.keys(after.maps)])
    for (const id of ids) {
      if (before.maps[id] === after.maps[id]) continue
      this.bumpMapRevision(id)
      this.dirtyMapIds.add(id)
      this.pinnedMapIds.add(id)
      this.touchMap(id)
    }
  }

  private touchMap(mapId: string): void {
    this.mapLru = [...this.mapLru.filter((id) => id !== mapId), mapId]
  }

  private bumpMapRevision(mapId: string): void {
    this.mapRevisions.set(mapId, this.getMapRevision(mapId) + 1)
  }

  private evictCleanMaps(protectedId: string): void {
    let loaded = Object.keys(this.state.maps).length
    if (loaded <= this.maxLoadedMaps) return
    const maps = { ...this.state.maps }
    for (const id of this.mapLru) {
      if (loaded <= this.maxLoadedMaps) break
      if (id === protectedId || this.pinnedMapIds.has(id) || this.dirtyMapIds.has(id)) continue
      if (!maps[id]) continue
      delete maps[id]
      loaded--
    }
    this.mapLru = this.mapLru.filter((id) => maps[id] !== undefined)
    this.state = { ...this.state, maps }
  }

  /** 订阅状态变化(React 用 useSyncExternalStore);返回退订。 */
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private notify(): void {
    this.version++
    for (const fn of this.listeners) fn()
  }
}
