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
import type { MusicDef, SceneDef } from '@type-pal/content'
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
): EditorState {
  return {
    // M2a-2:场景懒加载后 LoadedProject 不再带全量 → 编辑器 loadAllScenes 拉齐后传入
    scenes,
    music,
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
  | 'skills'
  | 'items'
  | 'locale'
  | 'sprites'
  | 'enemies'
  | 'enemyTeams'
  | 'music'
  | 'battleFields'

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

/**
 * FSA 落盘壳:把 serializeProject 的文件集逐个写到 dir。
 * rel 路径按 '/' 分段,逐段 getDirectoryHandle({create:true});末段 getFileHandle + createWritable。
 * 真写留 Claude 浏览器实测(需 FSA 授权 UI;本函数是纯 IO 壳,无需单测)。
 */
export async function writeProject(
  dir: FileSystemDirectoryHandle,
  files: Record<string, unknown>,
): Promise<void> {
  for (const [rel, value] of Object.entries(files)) {
    const segs = rel.split('/')
    // 末段是文件名;前几段是目录(逐段创建)。
    const fileName = segs.pop()!
    let d = dir
    for (const seg of segs) {
      d = await d.getDirectoryHandle(seg, { create: true })
    }
    const fh = await d.getFileHandle(fileName, { create: true })
    const w = await fh.createWritable()
    await w.write(`${JSON.stringify(value, null, 2)}\n`)
    await w.close()
  }
}
