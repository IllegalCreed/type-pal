/**
 * 工程 IO(D-B1 布置模式 · 逻辑层 L3)。
 *
 * 读入(LoadedProject → EditorState)与序列化(EditorState → 可落盘 JSON 文件集)。
 * UI(Claude)照契约调这三个:
 *   - toEditorState:把 loader 读入的工程(by-id Record)翻成编辑器工作副本(数组,对齐 JSON 文件)。
 *   - serializeProject:把工作副本序列化成 {相对路径: JSON 值} 的文件集(含 manifest.json)。
 *   - writeProject:FSA 落盘壳(逐文件创建目录 + 写出);真写留 Claude 浏览器验。
 *
 * round-trip 是命脉:toEditorState → serializeProject 必须还原原 content JSON(by-id Record
 * 经 Object.values 还原数组,保持原序)。测钉死。
 *
 * 见 docs/phase2/editor/editor-b1-logic-plan.md(契约 + L3)。
 */

import {
  formatProjectMapV2,
  type SceneDef,
  type ScriptChunkV1,
  validateAssetCatalog,
  validateMapIndex,
} from '@type-pal/content'
import type { FileSource, LoadedProjectCore, ProjectMapV2 } from '@type-pal/reforge'
import type { EditorState } from './edit-session.js'
import { assertProjectSaveValid } from './project-diagnostics.js'
import { assertScriptProjectValid } from './script-references.js'

/**
 * 只读工程 → 可变工作副本。by-id Record 翻成数组(Object.values,保原数组序);
 * 数组/Record 直传;运行期派生物(entryScene/assetBase)丢弃。
 * 参数取数据核 LoadedProjectCore(不需 IO source;运行期 LoadedProject 是其子类型,照传)。
 */
export function toEditorState(
  project: LoadedProjectCore,
  scenes: SceneDef[],
  projectMaps: Record<string, ProjectMapV2> = {}, // 键 = 稳定 map id；缺席 = 尚未按需加载
  scriptChunks: Record<string, ScriptChunkV1> = {},
): EditorState {
  return {
    // M2a-2:场景懒加载后 LoadedProject 不再带全量 → 编辑器 loadAllScenes 拉齐后传入
    scenes,
    assetCatalog: structuredClone(project.assetCatalog),
    assetBlobs: {},
    maps: projectMaps,
    mapIndex: project.mapIndex,
    // W7B:tileset 注册表(loader 已 guard;缺省空)+ 上传字节暂存(载入时空,只存新上传)
    tilesets: project.tilesets ?? [],
    tilesetBlobs: {},
    scriptIndex: project.scriptIndex,
    scriptChunks,
    // by-id Record → 数组(Object.values 保序:indexById 按原数组序插入)
    actors: Object.values(project.actorsById),
    skills: Object.values(project.skills),
    items: Object.values(project.items),
    sprites: Object.values(project.spritesById),
    // M4c-3:敌人/敌队(by-id → 数组)
    enemies: Object.values(project.enemiesById ?? {}),
    enemyTeams: Object.values(project.enemyTeamsById ?? {}),
    // D24:战场表(数组直传;缺 = 空)
    battleFields: project.battleFields ?? [],
    // B10:毒表(loader 原序数组直传;⚠ 勿用 poisonsById 转 —— 数值键升序重排破坏 round-trip)
    poisons: project.poisons ?? [],
    // W6:氛围表(数组直传;缺 = 空)
    ambiences: project.ambiences ?? [],
    // 商店表(数组直传;缺 = 空)
    shops: project.shops ?? [],
    // Record(非 by-id):直传
    levelUp: project.levelUp,
    locale: project.locale,
    // manifest 透传(内含 startWorld;editor 不另存 startWorld,以 manifest 为准)
    manifest: project.manifest,
    // startWorld:ContentBundle 要求顶层字段,与 manifest.startWorld 同引用
    startWorld: project.manifest.startWorld,
  }
}

/** manifest.content 的键 → 序列化时该文件存什么值。 */
type ContentKey =
  | 'actors'
  | 'tilesets'
  | 'skills'
  | 'items'
  | 'locale'
  | 'sprites'
  | 'enemies'
  | 'enemyTeams'
  | 'battleFields'
  | 'poisons'
  | 'ambiences'
  | 'shops'

/**
 * 工作副本 → {相对路径: JSON 值} 文件集。按 manifest.content 的路径键映射;
 * 外加 manifest.json(整体)。返回纯 JSON 值(可 JSON.stringify)。
 */
export function serializeProject(
  state: EditorState,
  opts?: { mapCopies?: Readonly<Record<string, string>> },
): Record<string, unknown> {
  // G2：入口场景/入口点本地不变式必须在任一路径落盘前 fail-loud。
  // 缺省 entryPoints 仍由 runtime/UI 合成兼容入口，不会被这里物化。
  assertProjectSaveValid(state)
  if (state.scriptIndex || Object.keys(state.scriptChunks).length) {
    const diagnostics = assertScriptProjectValid(state)
    if (diagnostics.warnings.length)
      console.warn(`[scripts] 保存前检查警告:\n${diagnostics.warnings.join('\n')}`)
  }
  const files: Record<string, unknown> = {}
  const fileOwners = new Map<string, string>()
  const addFile = (rel: string, value: unknown, owner: string): void => {
    const previous = fileOwners.get(rel)
    if (previous)
      throw new Error(`serializeProject: 输出路径冲突 "${rel}"（${previous} / ${owner}）`)
    fileOwners.set(rel, owner)
    files[rel] = value
  }
  const content = state.manifest.content

  // M2a-2:scenes 走 per-scene 目录(index.json + <id>.json);其余表域单文件。
  const dir = (content.scenes ?? 'content/scenes/').replace(/\/?$/, '/')
  addFile(
    `${dir}index.json`,
    state.scenes.map((s) => s.id),
    '场景索引',
  )
  for (const s of state.scenes) addFile(`${dir}${s.id}.json`, s, `场景 ${s.id}`)
  const mapIndex = validateMapIndex(state.mapIndex)
  const mapIndexRel = content.maps
  if (mapIndexRel) {
    if (state.manifest.contentVersion < 2)
      throw new Error('serializeProject: 声明 map index 的工程 contentVersion 必须 >= 2')
    addFile(mapIndexRel, mapIndex, '地图索引')
    const indexedIds = new Set<string>()
    for (const asset of mapIndex.maps) {
      if (asset.path === mapIndexRel)
        throw new Error(`serializeProject: 地图资产 "${asset.id}" 覆盖 map index 文件`)
      indexedIds.add(asset.id)
      const map = state.maps[asset.id]
      if (map) addFile(asset.path, formatProjectMapV2(map), `地图 ${asset.id}`)
      else {
        const copy = opts?.mapCopies?.[asset.path]
        if (copy !== undefined) addFile(asset.path, copy, `地图 ${asset.id} copy-through`)
      }
    }
    const orphanIds = Object.keys(state.maps).filter((id) => !indexedIds.has(id))
    if (orphanIds.length)
      throw new Error(`serializeProject: maps 存在未登记资产: ${orphanIds.join(', ')}`)
  } else throw new Error('serializeProject: 工程缺 manifest.content.maps')
  // W7B 上传 tileset 字节:键即资产相对路径(ArrayBuffer → writeFile 走 Blob,diff 记 bin: 占位)
  for (const [rel, buf] of Object.entries(state.tilesetBlobs))
    addFile(rel, buf, `瓦片集上传 ${rel}`)
  // M3 分片脚本目录:index 只存元数据，chunk 路径严格跟 index，禁止重组时丢文件。
  if (content.scripts && state.scriptIndex) {
    const scriptDir = content.scripts.replace(/\/?$/, '/')
    addFile(`${scriptDir}index.json`, state.scriptIndex, '脚本索引')
    for (const [id, meta] of Object.entries(state.scriptIndex.chunks)) {
      const chunk = state.scriptChunks[id]
      if (!chunk) throw new Error(`serializeProject: 缺脚本 chunk "${id}"`)
      addFile(`${scriptDir}${meta.path}`, chunk, `脚本 chunk ${id}`)
    }
  }
  // 各 content 文件:按 manifest 声明的路径键映射到对应值。
  const byKey: Record<ContentKey, unknown> = {
    actors: state.actors,
    skills: { skills: state.skills, levelUp: state.levelUp },
    items: state.items,
    locale: state.locale,
    sprites: state.sprites,
    enemies: state.enemies ?? [],
    enemyTeams: state.enemyTeams ?? [],
    battleFields: state.battleFields ?? [],
    tilesets: state.tilesets ?? [],
    poisons: state.poisons ?? [],
    ambiences: state.ambiences ?? [],
    shops: state.shops ?? [],
  }

  // 只产出 manifest.content 里**声明了路径**的文件(sprites 缺则不产出 sprites.json)。
  for (const key of Object.keys(byKey) as ContentKey[]) {
    const rel = content[key]
    if (rel !== undefined) addFile(rel, byKey[key], `内容表 ${key}`)
  }

  addFile(state.manifest.assets.catalog, validateAssetCatalog(state.assetCatalog), '资源注册表')
  for (const [rel, bytes] of Object.entries(state.assetBlobs))
    addFile(rel, bytes, `资源二进制 ${rel}`)

  // manifest.json:整体还原(state.manifest 自带 startWorld,无需重组)。
  addFile('manifest.json', state.manifest, '工程清单')

  return files
}

/**
 * 另存为/打包边界：已加载地图用当前工作副本，未加载地图从源文件按原文本复制。
 * copy-through 不 JSON.parse，因此不会为了保存把全部地图对象常驻内存。
 */
export async function serializeProjectWithMapCopies(
  state: EditorState,
  source: FileSource,
): Promise<Record<string, unknown>> {
  const mapCopies: Record<string, string> = {}
  await Promise.all(
    state.mapIndex.maps.map(async (asset) => {
      if (!state.maps[asset.id]) mapCopies[asset.path] = await source.readText(asset.path)
    }),
  )
  return serializeProject(state, { mapCopies })
}

/** 序列化单文件为落盘字符串(与 writeProject 写盘同规格,便于快照比对)。字符串值原样。 */
function serializeOne(value: unknown): string {
  return typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`
}

/**
 * 增量-diff(纯核,可测):next 中内容与快照不同 → write;快照有而 next 无 → remove。
 * 快照 = Map<rel, 上次落盘字符串>;二进制在快照记占位标记,内容不比对(素材罕改)。
 */
export function diffFiles(
  prev: Map<string, string>,
  next: Record<string, unknown>,
): { write: string[]; remove: string[] } {
  const write: string[] = []
  for (const [rel, value] of Object.entries(next)) {
    const cur = value instanceof ArrayBuffer ? ` bin:${value.byteLength}` : serializeOne(value)
    if (prev.get(rel) !== cur) write.push(rel)
  }
  const remove = [...prev.keys()].filter((rel) => !(rel in next))
  return { write, remove }
}

/** 写单文件到 dir(逐段建目录;ArrayBuffer 写 Blob,其余序列化)。克隆流式逐文件复用。 */
export async function writeFile(
  dir: FileSystemDirectoryHandle,
  rel: string,
  value: unknown,
): Promise<void> {
  const segs = rel.split('/')
  const fileName = segs.pop()!
  let d = dir
  for (const seg of segs) d = await d.getDirectoryHandle(seg, { create: true })
  const fh = await d.getFileHandle(fileName, { create: true })
  const w = await fh.createWritable()
  await w.write(value instanceof ArrayBuffer ? new Blob([value]) : serializeOne(value))
  await w.close()
}

/**
 * FSA 落盘壳(增量 + 二进制):按 diffFiles 只写变化、删已删,返回新快照。
 * rel 逐段 getDirectoryHandle({create:true});二进制值(ArrayBuffer)写 Blob,其余序列化。
 * 无 prevSnapshot(首存)= 全写。真写留浏览器实测(需 FSA 授权 UI)。
 */
export async function writeProject(
  dir: FileSystemDirectoryHandle,
  files: Record<string, unknown>,
  opts?: {
    prevSnapshot?: Map<string, string>
    removePaths?: readonly string[]
    onProgress?: (progress: { completed: number; total: number }) => void
  },
): Promise<Map<string, string>> {
  const prev = opts?.prevSnapshot
  const { write, remove: diffRemove } = prev
    ? diffFiles(prev, files)
    : { write: Object.keys(files), remove: [] as string[] }
  const remove = [...new Set([...diffRemove, ...(opts?.removePaths ?? [])])].filter(
    (rel) => !(rel in files),
  )
  const encoder = new TextEncoder()
  const byteLength = (value: unknown): number =>
    value instanceof ArrayBuffer ? value.byteLength : encoder.encode(serializeOne(value)).byteLength
  const sizes = new Map(write.map((rel) => [rel, byteLength(files[rel])]))
  const total = [...sizes.values()].reduce((sum, size) => sum + size, 0)
  let completed = 0
  opts?.onProgress?.({ completed, total })
  for (const rel of write) {
    await writeFile(dir, rel, files[rel])
    completed += sizes.get(rel) ?? 0
    // 100% 只在删除也落定后报告；避免 manifest close 后、函数返回前 UI 先宣告完成。
    if (completed < total) opts?.onProgress?.({ completed, total })
  }
  for (const rel of remove) {
    const segs = rel.split('/')
    const fileName = segs.pop()!
    let d = dir
    try {
      for (const seg of segs) d = await d.getDirectoryHandle(seg)
      await d.removeEntry(fileName)
    } catch {
      /* 已不在 = 目标态达成,忽略 */
    }
  }
  opts?.onProgress?.({ completed: total, total })
  const snapshot = new Map<string, string>()
  for (const [rel, value] of Object.entries(files)) {
    snapshot.set(
      rel,
      value instanceof ArrayBuffer ? ` bin:${value.byteLength}` : serializeOne(value),
    )
  }
  return snapshot
}
