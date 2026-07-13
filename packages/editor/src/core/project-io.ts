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
import type { LoadedProjectCore } from '@type-pal/reforge'
import type { MusicDef, SceneDef, ScriptChunkV1 } from '@type-pal/content'
import type { OwnMap } from '@type-pal/reforge'
import type { EditorState } from './edit-session.js'

/**
 * 只读工程 → 可变工作副本。by-id Record 翻成数组(Object.values,保原数组序);
 * 数组/Record 直传;运行期派生物(entryScene/assetBase)丢弃。
 * 参数取数据核 LoadedProjectCore(不需 IO source;运行期 LoadedProject 是其子类型,照传)。
 */
export function toEditorState(
  project: LoadedProjectCore,
  scenes: SceneDef[],
  music: MusicDef[] = [], // W5:音乐库(manifest.content.music 声明才有;缺省空)
  ownMaps: Record<string, OwnMap> = {}, // W7D:自有地图 v1(own 场景引用;pal 无 → {})
  scriptChunks: Record<string, ScriptChunkV1> = {},
): EditorState {
  return {
    // M2a-2:场景懒加载后 LoadedProject 不再带全量 → 编辑器 loadAllScenes 拉齐后传入
    scenes,
    music,
    // W7:自有地图工作副本(键 = ownMap 相对路径);渲染读实时态,保存序列化回文件
    maps: ownMaps,
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
  | 'music'
  | 'battleFields'
  | 'poisons'
  | 'ambiences'
  | 'shops'

/**
 * 工作副本 → {相对路径: JSON 值} 文件集。按 manifest.content 的路径键映射;
 * 外加 manifest.json(整体)。返回纯 JSON 值(可 JSON.stringify)。
 */
export function serializeProject(state: EditorState): Record<string, unknown> {
  const files: Record<string, unknown> = {}
  const content = state.manifest.content

  // M2a-2:scenes 走 per-scene 目录(index.json + <id>.json);其余表域单文件。
  const dir = (content.scenes ?? 'content/scenes/').replace(/\/?$/, '/')
  files[`${dir}index.json`] = state.scenes.map((s) => s.id)
  for (const s of state.scenes) files[`${dir}${s.id}.json`] = s
  // W7 自有地图:键即工程内相对路径,直接产出为文件(own 场景引用即索引,无单独 maps index)。
  // 场景 revert 回复用 → maps 丢掉该键 → diffFiles 检测 prev 有 next 无 → 落盘删除,不留孤儿。
  for (const [rel, map] of Object.entries(state.maps)) files[rel] = map
  // W7B 上传 tileset 字节:键即资产相对路径(ArrayBuffer → writeFile 走 Blob,diff 记 bin: 占位)
  for (const [rel, buf] of Object.entries(state.tilesetBlobs)) files[rel] = buf
  // M3 分片脚本目录:index 只存元数据，chunk 路径严格跟 index，禁止重组时丢文件。
  if (content.scripts && state.scriptIndex) {
    const scriptDir = content.scripts.replace(/\/?$/, '/')
    files[`${scriptDir}index.json`] = state.scriptIndex
    for (const [id, meta] of Object.entries(state.scriptIndex.chunks)) {
      const chunk = state.scriptChunks[id]
      if (!chunk) throw new Error(`serializeProject: 缺脚本 chunk "${id}"`)
      files[`${scriptDir}${meta.path}`] = chunk
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
    music: state.music ?? [],
    battleFields: state.battleFields ?? [],
    tilesets: state.tilesets ?? [],
    poisons: state.poisons ?? [],
    ambiences: state.ambiences ?? [],
    shops: state.shops ?? [],
  }

  // 只产出 manifest.content 里**声明了路径**的文件(sprites 缺则不产出 sprites.json)。
  for (const key of Object.keys(byKey) as ContentKey[]) {
    const rel = content[key]
    if (rel !== undefined) files[rel] = byKey[key]
  }

  // manifest.json:整体还原(state.manifest 自带 startWorld,无需重组)。
  files['manifest.json'] = state.manifest

  return files
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
  opts?: { prevSnapshot?: Map<string, string> },
): Promise<Map<string, string>> {
  const prev = opts?.prevSnapshot
  const { write, remove } = prev
    ? diffFiles(prev, files)
    : { write: Object.keys(files), remove: [] as string[] }
  for (const rel of write) await writeFile(dir, rel, files[rel])
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
  const snapshot = new Map<string, string>()
  for (const [rel, value] of Object.entries(files)) {
    snapshot.set(rel, value instanceof ArrayBuffer ? ` bin:${value.byteLength}` : serializeOne(value))
  }
  return snapshot
}
