/**
 * EditSession + 撤销/重做核(D-B0 第二根地基,最大防返工点)。
 *
 * 持有项目的不可变工作副本;所有改动经 dispatch(Command) —— 统一驱动 undo/redo + 通知。
 * 铁律:命令不得原地 mutate 数据(命令返回新态)。React 经 subscribe + useSyncExternalStore
 * 订阅(B1 接),状态变 → 重渲染。
 *
 * 纯 TS + 无 React → 重度单测。见 docs/phase2/archive/designs/editor-design.md §4。
 */
import type {
  AssetCatalogV1,
  ContentBundle,
  CurrentManifest,
  MapIndexV1,
  ProjectMap,
  SceneIndexV1,
  ScriptChunkV1,
  ScriptIndexV1,
  StampTemplate,
  WorldVariableRegistryV1,
} from '@type-pal/content'
import type { BattleSimulatorLibrary } from './battle-simulator-library.js'
import type { Command } from './commands.js'
import {
  type HistoryRecord,
  notifyEditorObservers,
  type PreparedHistoryChange,
  type SessionHistoryBinding,
  type SessionHistoryRouter,
} from './editor-history-participant.js'
import {
  buildMapReferenceEdgeBatch,
  extractProjectMapReferenceFacts,
  extractProjectStampReferenceFacts,
  type MapReferenceEdgeBatch,
  type MapReferenceScanFailure,
  type ProjectMapReferenceFacts,
  type ProjectStampReferenceFacts,
} from './map-reference-facts.js'

export type { Command } from './commands.js'
// commands.ts 引 EditorState(type),本文件引 Command(type) —— 仅类型,运行期无环。
export { MoveEntityCommand } from './commands.js'

/** 被编辑的内容工作副本(ContentBundle + manifest)。命令 apply/invert 收/返它(不可变)。 */
export interface EditorState extends Omit<ContentBundle, 'entryPoints'> {
  manifest: CurrentManifest
  /** Editor-only presets; absence means this project has no saved simulator library. */
  battleSimulator?: BattleSimulatorLibrary
  /** 当前项目级作者变量定义；运行时值不在编辑工作副本中混存。 */
  worldVariables?: WorldVariableRegistryV1
  /** W7G 作者态图章模板表；旧项目加载时规范化为空数组。 */
  stamps: StampTemplate[]
  /**
   * 自有地图工作副本:键 = map asset 稳定 id。文件路径只从 mapIndex 解析。
   * 编辑器画布读取此实时态；保存时按 MapAssetDefV1.path 序列化。
   */
  maps: Record<string, ProjectMap>
  /** 地图资产发现真值；包含零场景引用地图。 */
  mapIndex: MapIndexV1
  /** 场景发现、作者显示名与正文路径的唯一真值。 */
  sceneIndex: SceneIndexV1
  /**
   * 历史名称：尚未 catalog 化的 effect-sprite RLE 上传暂存。
   * tileset、world sprite 与 battle-sprite 已迁到 assetCatalog + assetBlobs，不得再消费此字段。
   */
  tilesetBlobs: Record<string, ArrayBuffer>
  /** 内部脚本投影的索引/片段；当前作者项目只保存 canonical sharedScripts，不落盘这些片段。 */
  scriptIndex?: ScriptIndexV1
  scriptChunks: Record<string, ScriptChunkV1>
  /** 项目唯一资源注册表；音乐页与运行时共用同一份 AssetId -> path 真值。 */
  assetCatalog: AssetCatalogV1
  /** 本会话新导入/替换的二进制，键为 catalog 中的项目相对 path。 */
  assetBlobs: Record<string, ArrayBuffer>
}

export type MapDocumentStatus =
  | { state: 'unloaded' }
  | { state: 'loading' }
  | { state: 'ready'; dirty: boolean }
  | { state: 'error'; message: string }

export interface EditSessionOptions {
  /** 按稳定 id + 当前索引路径读一张 ProjectMap；缺省时只能编辑已注入/新建地图。 */
  loadMap?: (mapId: string, path: string) => Promise<ProjectMap>
  /** 仅淘汰从未编辑的干净文档；脏地图和撤销链触及地图永不静默丢弃。 */
  maxLoadedMaps?: number
}

export type CurrentMapReferenceBatchProvider = (state: EditorState) => MapReferenceEdgeBatch

const MAP_REFERENCE_SCAN_CONCURRENCY = 6

/** 编辑会话:不可变工作副本 + undo/redo 栈 + 订阅 + 脏标记。 */
export class EditSession {
  private state: EditorState
  private past: HistoryRecord<Command>[] = []
  private future: HistoryRecord<Command>[] = []
  private historyBinding?: SessionHistoryBinding<Command>
  /** 有未保存改动(自上次 markSaved 后 dispatch/undo/redo 过)。保存按钮据此亮 ●。 */
  private dirty = false
  private dirtyMapIds = new Set<string>()
  private pinnedMapIds = new Set<string>()
  private readonly loadMap?: (mapId: string, path: string) => Promise<ProjectMap>
  private readonly maxLoadedMaps: number
  private readonly mapLoads = new Map<
    string,
    { path: string; mapRevision: number; token: symbol; promise: Promise<ProjectMap> }
  >()
  private readonly mapReads = new Map<
    string,
    { path: string; mapRevision: number; token: symbol; promise: Promise<ProjectMap> }
  >()
  private readonly mapErrors = new Map<
    string,
    { path: string; mapRevision: number; message: string }
  >()
  /** 每张地图独立、单调递增的内存 revision；含 dispatch / undo / redo / hydrate。 */
  private mapRevisions = new Map<string, number>()
  private mapLru: string[]
  private persistedScenePaths: Set<string>
  private persistedMapPaths: Set<string>
  private persistedAssetPaths: Set<string>
  /** 每次 notify 自增。useSyncExternalStore 的 snapshot 用它 —— 因为 markSaved/undo 等
   *  「非内容态」变化不改 state 引用,单靠 getState 当 snapshot 会漏掉这些变化不重渲染。 */
  private version = 0
  /** 只在 dispatch/undo/redo 时递增；markSaved/hydrate 不得篡改全局撤销归属。 */
  private historyVersion = 0
  private readonly listeners = new Set<() => void>()
  /** 地图正文只读事实；与已加载地图/LRU 分离，不把全量正文 hydrate 进 EditorState。 */
  private mapReferenceFacts = new Map<string, ProjectMapReferenceFacts>()
  private mapReferenceFailures = new Map<string, MapReferenceScanFailure>()
  private mapReferenceScanRunning = false
  private mapReferenceScanPromise?: Promise<void>
  private mapReferenceGeneration = 0
  private mapReferenceVersion = 0
  private readonly mapReferenceListeners = new Set<() => void>()
  private stampReferenceFacts = new Map<
    string,
    { stamp: StampTemplate; facts: ProjectStampReferenceFacts }
  >()
  private mapReferenceBatchCache?: MapReferenceEdgeBatch

  constructor(initial: EditorState, options: EditSessionOptions = {}) {
    this.state = initial
    this.loadMap = options.loadMap
    this.maxLoadedMaps = Math.max(1, options.maxLoadedMaps ?? 12)
    this.mapLru = Object.keys(initial.maps)
    this.persistedScenePaths = new Set(initial.sceneIndex.scenes.map((asset) => asset.path))
    this.persistedMapPaths = new Set(initial.mapIndex.maps.map((asset) => asset.path))
    this.persistedAssetPaths = new Set(
      Object.values(initial.assetCatalog.assets).map((asset) => asset.path),
    )
    const indexedMaps = new Map(initial.mapIndex.maps.map((entry) => [entry.id, entry] as const))
    for (const [mapId, map] of Object.entries(initial.maps)) {
      const asset = indexedMaps.get(mapId)
      if (!asset) continue
      this.mapReferenceFacts.set(
        mapId,
        extractProjectMapReferenceFacts(map, {
          mapId,
          path: asset.path,
          mapRevision: this.getMapRevision(mapId),
        }),
      )
    }
    for (const stamp of initial.stamps ?? []) {
      const facts = extractProjectStampReferenceFacts([stamp])[0]
      if (facts) this.stampReferenceFacts.set(stamp.id, { stamp, facts })
    }
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
    this.persistedScenePaths = new Set(this.state.sceneIndex.scenes.map((asset) => asset.path))
    this.persistedMapPaths = new Set(this.state.mapIndex.maps.map((asset) => asset.path))
    this.persistedAssetPaths = new Set(
      Object.values(this.state.assetCatalog.assets).map((asset) => asset.path),
    )
    this.notify()
  }

  /** 普通派发也必须进入绑定的唯一项目日志。 */
  dispatch(command: Command): boolean {
    if (this.historyBinding) return this.activeHistory().dispatch(command)
    return this.applyStandalone(this.prepareHistoryChange('dispatch', command, Symbol('main')))
  }

  undo(): boolean {
    if (this.historyBinding) return this.activeHistory().undo()
    const record = this.past.at(-1)
    return record
      ? this.applyStandalone(this.prepareHistoryChange('undo', record.command, record.id))
      : false
  }

  redo(): boolean {
    if (this.historyBinding) return this.activeHistory().redo()
    const record = this.future.at(-1)
    return record
      ? this.applyStandalone(this.prepareHistoryChange('redo', record.command, record.id))
      : false
  }

  discardRedo(command: Command): boolean {
    if (this.historyBinding) return this.activeHistory().discardRedo(command)
    if (this.future.at(-1)?.command !== command) return false
    this.future.pop()
    this.historyVersion += 1
    this.notify()
    return true
  }

  /** @internal 原Owner可以重连，不能事后拼接未知顺序的独立栈。 */
  assertCanAttachHistory(owner: object): void {
    if (this.historyBinding) {
      if (this.historyBinding.router.owner !== owner) throw new Error('主会话已绑定其他项目历史')
    } else if (this.past.length || this.future.length) throw new Error('不能接管已有独立主会话历史')
  }

  /** @internal */
  attachHistory(router: SessionHistoryRouter<Command>): void {
    this.assertCanAttachHistory(router.owner)
    this.historyBinding = { router, active: true }
  }

  /** @internal */
  detachHistory(owner: object): void {
    this.assertHistoryOwner(owner)
    this.historyBinding!.active = false
  }

  /** @internal 准备命令与地图元数据；此阶段不改变公开状态或发布通知。 */
  prepareHistoryChange(
    direction: 'dispatch' | 'undo' | 'redo',
    command: Command,
    id: symbol,
    owner?: object,
  ): PreparedHistoryChange | undefined {
    this.assertHistoryOwner(owner)
    const before = this.state
    const version = this.historyVersion
    const record =
      direction === 'dispatch'
        ? { id, command }
        : (direction === 'undo' ? this.past : this.future).at(-1)
    if (!record || record.id !== id || record.command !== command)
      throw new Error('主会话执行索引与项目历史不一致')
    const next = direction === 'undo' ? command.invert(before) : command.apply(before)
    if (direction === 'dispatch' && next === before) return undefined
    const maps = this.prepareMapChanges(before, next, command.mapReferenceStampIds)
    let used = false
    return {
      validate: () => {
        this.assertHistoryOwner(owner)
        if (used || this.state !== before || this.historyVersion !== version)
          throw new Error('主会话历史准备结果已失效')
      },
      commit: () => {
        used = true
        this.state = next
        maps?.commit()
        if (direction === 'undo') {
          this.past.pop()
          this.future.push(record)
        } else {
          if (direction === 'redo') this.future.pop()
          else this.future = []
          this.past.push(record)
        }
        this.dirty = true
        this.historyVersion += 1
      },
      ...(maps
        ? { publishReferences: () => notifyEditorObservers(this.mapReferenceListeners) }
        : {}),
    }
  }

  /** @internal */
  prepareHistoryDiscard(owner: object): PreparedHistoryChange | undefined {
    this.assertHistoryOwner(owner)
    if (!this.future.length) return undefined
    const version = this.historyVersion
    return {
      validate: () => {
        this.assertHistoryOwner(owner)
        if (this.historyVersion !== version) throw new Error('主会话redo已变化')
      },
      commit: () => {
        this.future = []
        this.historyVersion += 1
      },
    }
  }

  /** @internal */
  isHistoryRedoCommand(command: Command, owner: object): boolean {
    this.assertHistoryOwner(owner)
    return this.future.at(-1)?.command === command
  }

  /** @internal */
  advanceHistoryNotification(owner: object): void {
    this.assertHistoryOwner(owner)
    this.version += 1
  }
  /** @internal */
  publishHistoryNotification(owner: object): void {
    this.assertHistoryOwner(owner)
    notifyEditorObservers(this.listeners)
  }

  private activeHistory(): SessionHistoryRouter<Command> {
    if (!this.historyBinding?.active) throw new Error('项目历史已断开，不能继续编辑主会话')
    return this.historyBinding.router
  }

  private assertHistoryOwner(owner?: object): void {
    if (this.historyBinding) {
      if (!this.historyBinding.active || this.historyBinding.router.owner !== owner)
        throw new Error('无效的主会话历史Owner')
    } else if (owner !== undefined) throw new Error('主会话历史尚未绑定')
  }

  private applyStandalone(prepared: PreparedHistoryChange | undefined): boolean {
    if (!prepared) return false
    prepared.validate()
    prepared.commit()
    this.version += 1
    prepared.publishReferences?.()
    notifyEditorObservers(this.listeners)
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

  getMapReferenceVersion(): number {
    return this.mapReferenceVersion
  }

  subscribeMapReferences(fn: () => void): () => void {
    this.mapReferenceListeners.add(fn)
    return () => {
      this.mapReferenceListeners.delete(fn)
    }
  }

  getMapReferenceBatch(): MapReferenceEdgeBatch {
    if (this.mapReferenceBatchCache) return this.mapReferenceBatchCache
    const facts: ProjectMapReferenceFacts[] = []
    const failures: MapReferenceScanFailure[] = []
    let currentMapLoadRunning = false
    for (const asset of this.state.mapIndex.maps) {
      const revision = this.getMapRevision(asset.id)
      const pending = this.mapLoads.get(asset.id)
      if (pending?.path === asset.path && pending.mapRevision === revision) {
        currentMapLoadRunning = true
        continue
      }
      const fact = this.mapReferenceFacts.get(asset.id)
      if (fact && fact.path === asset.path && fact.mapRevision === revision) {
        facts.push(fact)
        continue
      }
      const failure = this.mapReferenceFailures.get(asset.id)
      if (failure && failure.path === asset.path && failure.mapRevision === revision)
        failures.push(failure)
    }
    this.mapReferenceBatchCache = buildMapReferenceEdgeBatch({
      generation: this.mapReferenceGeneration,
      running: this.mapReferenceScanRunning || currentMapLoadRunning,
      mapIndex: this.state.mapIndex,
      facts,
      failures,
      stampFacts: (this.state.stamps ?? []).flatMap((stamp) => {
        const record = this.stampReferenceFacts.get(stamp.id)
        return record?.stamp === stamp ? [record.facts] : []
      }),
      stampTotal: (this.state.stamps ?? []).length,
    })
    return this.mapReferenceBatchCache
  }

  /** 破坏性命令的同步 current provider；非本会话 state 一律拒绝。 */
  getCurrentMapReferenceBatch(state: EditorState): MapReferenceEdgeBatch {
    if (state !== this.state) throw new Error('地图引用许可不属于当前编辑会话。')
    return this.getMapReferenceBatch()
  }

  /**
   * 补齐当前 mapIndex 的轻量事实。未加载地图只走 path-bound loader，不 hydrate、不碰 LRU/history。
   * 扫描期间索引或 revision 变化时丢弃迟到结果，并继续循环直到覆盖最新索引。
   */
  async ensureMapReferencesIndexed(
    options: { retryFailures?: boolean } = {},
  ): Promise<MapReferenceEdgeBatch> {
    let retryFailures = options.retryFailures === true
    while (true) {
      if (this.mapReferenceScanPromise) {
        await this.mapReferenceScanPromise
        continue
      }
      this.repairStampReferenceFacts()
      this.pruneMapReferenceFacts()
      const targets = this.state.mapIndex.maps.filter((asset) => {
        const revision = this.getMapRevision(asset.id)
        const pending = this.mapLoads.get(asset.id)
        if (pending?.path === asset.path && pending.mapRevision === revision) return true
        const fact = this.mapReferenceFacts.get(asset.id)
        if (fact?.path === asset.path && fact.mapRevision === revision) return false
        const failure = this.mapReferenceFailures.get(asset.id)
        return !(!retryFailures && failure?.path === asset.path && failure.mapRevision === revision)
      })
      if (!targets.length) return this.getMapReferenceBatch()
      if (retryFailures) for (const target of targets) this.mapReferenceFailures.delete(target.id)
      retryFailures = false

      const captured = targets.map((asset) => ({
        mapId: asset.id,
        path: asset.path,
        mapRevision: this.getMapRevision(asset.id),
      }))
      this.mapReferenceScanRunning = true
      this.emitMapReferenceUpdate()
      const run = async (): Promise<void> => {
        let nextIndex = 0
        let completed = 0
        const processTarget = async (target: (typeof captured)[number]): Promise<void> => {
          if (!this.mapReferenceTargetIsCurrent(target)) return
          try {
            const loaded = this.state.maps[target.mapId]
            const pending = this.mapLoads.get(target.mapId)
            const map =
              loaded ??
              (pending?.path === target.path && pending?.mapRevision === target.mapRevision
                ? await pending.promise
                : await this.readMapForReferences(target.mapId, target.path, target.mapRevision))
            if (!this.mapReferenceTargetIsCurrent(target)) return
            const currentMap = this.state.maps[target.mapId] ?? map
            this.mapReferenceFacts.set(
              target.mapId,
              extractProjectMapReferenceFacts(currentMap, target),
            )
            this.mapReferenceFailures.delete(target.mapId)
            this.bumpMapReferenceGeneration()
          } catch (cause) {
            if (!this.mapReferenceTargetIsCurrent(target)) return
            const currentMap = this.state.maps[target.mapId]
            if (currentMap) {
              this.mapReferenceFacts.set(
                target.mapId,
                extractProjectMapReferenceFacts(currentMap, target),
              )
              this.mapReferenceFailures.delete(target.mapId)
            } else {
              this.mapReferenceFacts.delete(target.mapId)
              this.mapReferenceFailures.set(target.mapId, {
                ...target,
                message: cause instanceof Error ? cause.message : String(cause),
              })
            }
            this.bumpMapReferenceGeneration()
          }
        }
        const worker = async (): Promise<void> => {
          while (true) {
            const index = nextIndex++
            const target = captured[index]
            if (!target) return
            await processTarget(target)
            completed++
            if (completed % 8 === 0) this.emitMapReferenceUpdate()
          }
        }
        await Promise.all(
          Array.from({ length: Math.min(MAP_REFERENCE_SCAN_CONCURRENCY, captured.length) }, () =>
            worker(),
          ),
        )
      }
      const promise = run().finally(() => {
        this.mapReferenceScanRunning = false
        this.mapReferenceScanPromise = undefined
        this.emitMapReferenceUpdate()
      })
      this.mapReferenceScanPromise = promise
      await promise
    }
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
    return this.historyBinding?.router.canUndo() ?? this.past.length > 0
  }

  canRedo(): boolean {
    return this.historyBinding?.router.canRedo() ?? this.future.length > 0
  }

  getMapDocumentStatus(mapId: string): MapDocumentStatus {
    if (this.state.maps[mapId]) return { state: 'ready', dirty: this.dirtyMapIds.has(mapId) }
    const path = this.state.mapIndex.maps.find((entry) => entry.id === mapId)?.path
    const error = this.mapErrors.get(mapId)
    if (error && error.path === path && error.mapRevision === this.getMapRevision(mapId))
      return { state: 'error', message: error.message }
    const pending = this.mapLoads.get(mapId)
    return pending?.path === path && pending?.mapRevision === this.getMapRevision(mapId)
      ? { state: 'loading' }
      : { state: 'unloaded' }
  }

  /** 按需 hydrate 不是作者操作：不入 undo、不置脏，并去重并发读。 */
  async ensureMapLoaded(mapId: string): Promise<ProjectMap> {
    const ready = this.state.maps[mapId]
    if (ready) {
      this.touchMap(mapId)
      return ready
    }
    const asset = this.state.mapIndex.maps.find((entry) => entry.id === mapId)
    if (!asset) throw new Error(`地图 "${mapId}" 不在 map index`)
    const loadRevision = this.getMapRevision(mapId)
    const pending = this.mapLoads.get(mapId)
    if (pending?.path === asset.path && pending.mapRevision === loadRevision) return pending.promise
    if (!this.loadMap) throw new Error(`未配置地图加载器，无法打开 "${mapId}"`)

    this.mapErrors.delete(mapId)
    const path = asset.path
    const token = Symbol(`map-load:${mapId}`)
    const promise = this.readMapSource(mapId, path, loadRevision)
      .then((map) => {
        const current = this.state.mapIndex.maps.find((entry) => entry.id === mapId)
        const active = this.mapLoads.get(mapId)
        if (
          active?.token !== token ||
          current?.path !== path ||
          this.getMapRevision(mapId) !== loadRevision
        )
          throw new Error(`地图 "${mapId}" 已变化；已丢弃旧读取结果。`)
        this.state = { ...this.state, maps: { ...this.state.maps, [mapId]: map } }
        this.bumpMapRevision(mapId)
        this.updateMapReferenceFact(mapId, map)
        this.emitMapReferenceUpdate()
        this.touchMap(mapId)
        this.evictCleanMaps(mapId)
        if (this.mapLoads.get(mapId)?.token === token) this.mapLoads.delete(mapId)
        this.notify()
        return map
      })
      .catch((error: unknown) => {
        const active = this.mapLoads.get(mapId)
        const current = this.state.mapIndex.maps.find((entry) => entry.id === mapId)
        const identityCurrent =
          current?.path === path && this.getMapRevision(mapId) === loadRevision
        if (active?.token === token) {
          this.mapLoads.delete(mapId)
          if (identityCurrent) {
            const message = error instanceof Error ? error.message : String(error)
            this.mapErrors.set(mapId, { path, mapRevision: loadRevision, message })
            this.mapReferenceFacts.delete(mapId)
            this.mapReferenceFailures.set(mapId, {
              mapId,
              path,
              mapRevision: loadRevision,
              message,
            })
            this.bumpMapReferenceGeneration()
          }
          if (identityCurrent) this.emitMapReferenceUpdate()
        }
        if (active?.token === token) this.notify()
        throw error
      })
    this.mapLoads.set(mapId, { path, mapRevision: loadRevision, token, promise })
    this.emitMapReferenceUpdate()
    this.notify()
    return promise
  }

  /** 原目录中曾存在、但当前索引已删除的 map 文件；首次增量保存也能精确删除。 */
  getDeletedScenePaths(): string[] {
    const current = new Set(this.state.sceneIndex.scenes.map((asset) => asset.path))
    return [...this.persistedScenePaths].filter((path) => !current.has(path))
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

  /** 只复制轻量元数据，不复制地图/资源正文；所有可能失败的提取发生在发布前。 */
  private prepareMapChanges(
    before: EditorState,
    after: EditorState,
    stampIds?: readonly string[],
  ): { commit(): void } | undefined {
    if (
      before.maps === after.maps &&
      before.mapIndex === after.mapIndex &&
      before.stamps === after.stamps
    )
      return
    const dirty = new Set(this.dirtyMapIds)
    const pinned = new Set(this.pinnedMapIds)
    const revisions = new Map(this.mapRevisions)
    const facts = new Map(this.mapReferenceFacts)
    const failures = new Map(this.mapReferenceFailures)
    const stamps = new Map(this.stampReferenceFacts)
    let lru = [...this.mapLru]
    let generation = this.mapReferenceGeneration
    const beforeAssets = new Map(before.mapIndex.maps.map((entry) => [entry.id, entry] as const))
    const afterAssets = new Map(after.mapIndex.maps.map((entry) => [entry.id, entry] as const))
    const ids = new Set([
      ...Object.keys(before.maps),
      ...Object.keys(after.maps),
      ...beforeAssets.keys(),
      ...afterAssets.keys(),
    ])
    let changed = before.stamps !== after.stamps || before.mapIndex !== after.mapIndex
    for (const id of ids) {
      const mapChanged = before.maps[id] !== after.maps[id]
      const indexChanged = beforeAssets.get(id)?.path !== afterAssets.get(id)?.path
      if (!mapChanged && !indexChanged) continue
      revisions.set(id, (revisions.get(id) ?? 0) + 1)
      const removedFact = facts.delete(id)
      const removedFailure = failures.delete(id)
      if (removedFact || removedFailure) generation++
      if (mapChanged) {
        dirty.add(id)
        pinned.add(id)
        lru = [...lru.filter((candidate) => candidate !== id), id]
      }
      changed = true
    }
    if (before.stamps !== after.stamps) {
      const currentStamps = after.stamps ?? []
      const affected = stampIds ? new Set(stampIds) : undefined
      if (!affected) stamps.clear()
      else {
        const currentIds = new Set(currentStamps.map((stamp) => stamp.id))
        for (const id of stamps.keys()) if (!currentIds.has(id)) stamps.delete(id)
      }
      for (const stamp of currentStamps) {
        if (affected && !affected.has(stamp.id) && stamps.has(stamp.id)) continue
        const fact = extractProjectStampReferenceFacts([stamp])[0]
        if (fact) stamps.set(stamp.id, { stamp, facts: fact })
      }
      generation++
    }
    if (before.mapIndex !== after.mapIndex) generation++
    if (!changed) return
    return {
      commit: () => {
        this.dirtyMapIds = dirty
        this.pinnedMapIds = pinned
        this.mapRevisions = revisions
        this.mapReferenceFacts = facts
        this.mapReferenceFailures = failures
        this.stampReferenceFacts = stamps
        this.mapLru = lru
        this.mapReferenceGeneration = generation
        this.mapReferenceBatchCache = undefined
        this.mapReferenceVersion++
      },
    }
  }

  private mapReferenceTargetIsCurrent(target: {
    mapId: string
    path: string
    mapRevision: number
  }): boolean {
    const asset = this.state.mapIndex.maps.find((entry) => entry.id === target.mapId)
    return asset?.path === target.path && this.getMapRevision(target.mapId) === target.mapRevision
  }

  private pruneMapReferenceFacts(): void {
    const current = new Map(
      this.state.mapIndex.maps.map((entry) => [
        entry.id,
        { path: entry.path, revision: this.getMapRevision(entry.id) },
      ]),
    )
    let changed = false
    for (const [mapId, fact] of this.mapReferenceFacts) {
      const expected = current.get(mapId)
      if (expected?.path === fact.path && expected.revision === fact.mapRevision) continue
      this.mapReferenceFacts.delete(mapId)
      changed = true
    }
    for (const [mapId, failure] of this.mapReferenceFailures) {
      const expected = current.get(mapId)
      if (expected?.path === failure.path && expected.revision === failure.mapRevision) continue
      this.mapReferenceFailures.delete(mapId)
      changed = true
    }
    if (changed) {
      this.bumpMapReferenceGeneration()
      this.emitMapReferenceUpdate()
    }
  }

  private invalidateMapReferenceFact(mapId: string): void {
    const removedFact = this.mapReferenceFacts.delete(mapId)
    const removedFailure = this.mapReferenceFailures.delete(mapId)
    const changed = removedFact || removedFailure
    if (changed) this.bumpMapReferenceGeneration()
  }

  private updateMapReferenceFact(mapId: string, map: ProjectMap): void {
    const asset = this.state.mapIndex.maps.find((entry) => entry.id === mapId)
    if (!asset) {
      this.invalidateMapReferenceFact(mapId)
      return
    }
    this.mapReferenceFacts.set(
      mapId,
      extractProjectMapReferenceFacts(map, {
        mapId,
        path: asset.path,
        mapRevision: this.getMapRevision(mapId),
      }),
    )
    this.mapReferenceFailures.delete(mapId)
    this.bumpMapReferenceGeneration()
  }

  private repairStampReferenceFacts(): void {
    const currentStamps = this.state.stamps ?? []
    const currentIds = new Set(currentStamps.map((stamp) => stamp.id))
    let changed = false
    for (const id of [...this.stampReferenceFacts.keys()])
      if (!currentIds.has(id)) {
        this.stampReferenceFacts.delete(id)
        changed = true
      }
    for (const stamp of currentStamps) {
      if (this.stampReferenceFacts.get(stamp.id)?.stamp === stamp) continue
      const facts = extractProjectStampReferenceFacts([stamp])[0]
      if (facts) this.stampReferenceFacts.set(stamp.id, { stamp, facts })
      changed = true
    }
    if (changed) {
      this.bumpMapReferenceGeneration()
      this.emitMapReferenceUpdate()
    }
  }

  private emitMapReferenceUpdate(): void {
    this.mapReferenceBatchCache = undefined
    this.mapReferenceVersion++
    notifyEditorObservers(this.mapReferenceListeners)
  }

  private bumpMapReferenceGeneration(): void {
    this.mapReferenceGeneration++
    this.mapReferenceBatchCache = undefined
  }

  private async readMapForReferences(
    mapId: string,
    path: string,
    mapRevision: number,
  ): Promise<ProjectMap> {
    return this.readMapSource(mapId, path, mapRevision)
  }

  private readMapSource(mapId: string, path: string, mapRevision: number): Promise<ProjectMap> {
    const current = this.mapReads.get(mapId)
    if (current?.path === path && current.mapRevision === mapRevision) return current.promise
    const loader = this.loadMap
    if (!loader) return Promise.reject(new Error(`未配置地图加载器，无法读取 "${mapId}"`))
    const token = Symbol(`map-read:${mapId}`)
    const promise = Promise.resolve()
      .then(() => loader(mapId, path))
      .then(
        (map) => {
          if (this.mapReads.get(mapId)?.token === token) this.mapReads.delete(mapId)
          return map
        },
        (cause: unknown) => {
          if (this.mapReads.get(mapId)?.token === token) this.mapReads.delete(mapId)
          throw cause
        },
      )
    this.mapReads.set(mapId, { path, mapRevision, token, promise })
    return promise
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
    notifyEditorObservers(this.listeners)
  }
}
