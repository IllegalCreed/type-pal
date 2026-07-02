// 工程 loader:运行期 fetch manifest + content JSON → guard 校验 → 组装内存对象。
// assembleProject 是纯核(可单测,喂 fixture JSON);loadProject 是 IO 壳(fetch)。
// main.ts 不再 import 任何具体游戏数据,全靠 loader 注入。
//
// M2a-2 · per-scene 布局:manifest.content.scenes 指向**目录**(如 "content/scenes/"),
// 内含 index.json(场景 id 清单)+ <id>.json(单场景)。
// **双路径**:引擎 loadProject 只取 index + 入口场景(懒加载,后续 loadSceneDef 按需);
// 编辑器 loadAllScenes 一次拉全量。见 scene-model-m2-design §2。
import type {
  ActorDef,
  ItemDataMap,
  LevelUpSkill,
  LoadedManifest,
  Locale,
  SceneDef,
  SkillDataMap,
  SpriteDef,
} from '@type-pal/content'
import {
  validateActors,
  validateItems,
  validateLocale,
  validateScenes,
  validateSkills,
  validateSprites,
} from '@type-pal/content'
import type { AssetBase } from './assets.js'

/** 加载完成的工程对象(main.ts 消费)。场景为懒加载:仅 sceneIds 清单 + 已载入的入口场景。 */
export interface LoadedProject {
  manifest: LoadedManifest
  /** 工程根相对路径(fetch 场景/资源用),如 "projects/demo"。 */
  projectRoot: string
  /** 场景 id 清单(content/scenes/index.json)。 */
  sceneIds: string[]
  /** 入口场景(已载入;其余场景 loadSceneDef 按需)。 */
  entryScene: SceneDef
  actorsById: Record<string, ActorDef>
  skills: SkillDataMap
  levelUp: Record<string, LevelUpSkill[]>
  items: ItemDataMap
  locale: Locale
  /** 精灵注册表(EntityDef.sprite 语义 id → SpriteDef);无 sprites.json 时为空 {}。 */
  spritesById: Record<string, SpriteDef>
  /** 工程资源根 + 子目录(assets.ts load* 用;来自 manifest.assets)。 */
  assetBase: AssetBase
}

/** content JSON 输入(assembleProject 的纯参,便于单测喂 fixture)。 */
export interface ContentJsons {
  actors: unknown
  /** 场景 id 清单(content/scenes/index.json 的内容)。 */
  sceneIds: unknown
  /** 入口场景 JSON(content/scenes/<manifest.entryScene>.json 的内容)。 */
  entryScene: unknown
  skills: unknown
  items: unknown
  locale: unknown
  /** 精灵注册表(可选:缺 → spritesById 为空 {};向后兼容不传 sprites 的旧测)。 */
  sprites?: unknown
}

function indexById<T extends { id: string }>(arr: T[]): Record<string, T> {
  const m: Record<string, T> = {}
  for (const x of arr) m[x.id] = x
  return m
}

/** index.json 形状校验:string[]。 */
function validateSceneIds(json: unknown): string[] {
  if (!Array.isArray(json) || json.some((x) => typeof x !== 'string'))
    throw new Error('scenes/index.json: 期望 string[]')
  return json as string[]
}

/** 纯组装核:manifest + content JSON → guard → LoadedProject。无 IO,可单测。 */
export function assembleProject(manifest: LoadedManifest, jsons: ContentJsons): LoadedProject {
  const sceneIds = validateSceneIds(jsons.sceneIds)
  const [entryScene] = validateScenes([jsons.entryScene])
  const actors = validateActors(jsons.actors)
  const { skills, levelUp } = validateSkills(jsons.skills)
  const items = validateItems(jsons.items)
  const locale = validateLocale(jsons.locale)
  const sprites = jsons.sprites ? validateSprites(jsons.sprites) : []

  if (!entryScene || entryScene.id !== manifest.entryScene)
    throw new Error(
      `工程 "${manifest.id}": 入口场景不符(期望 "${manifest.entryScene}",得 "${entryScene?.id ?? '(空)'}")`,
    )
  if (!sceneIds.includes(manifest.entryScene))
    throw new Error(`工程 "${manifest.id}": 入口场景 "${manifest.entryScene}" 不在 scenes/index.json`)

  const a = manifest.assets
  return {
    manifest,
    projectRoot: `projects/${manifest.id}`,
    sceneIds,
    entryScene,
    actorsById: indexById(actors),
    skills: indexById(skills),
    levelUp: levelUp as Record<string, LevelUpSkill[]>,
    items: indexById(items),
    locale,
    spritesById: indexById(sprites),
    assetBase: {
      // root 以 "/" 开头 = 应用绝对路径(如 "/extracted/data",pal 共享提取源,免拷 221 张图进仓);
      // 否则 = 工程自包含相对路径(demo)。
      root: a.root.startsWith('/') ? a.root : `projects/${manifest.id}/${a.root}`,
      maps: a.maps,
      tilesets: a.tilesets,
      sprites: a.sprites,
      palettes: a.palettes,
    },
  }
}

/** 场景目录相对路径(manifest.content.scenes;规整为以 / 结尾)。 */
function scenesDir(manifest: LoadedManifest): string {
  const dir = manifest.content.scenes ?? 'content/scenes/'
  return dir.endsWith('/') ? dir : `${dir}/`
}

/** IO 壳:fetch manifest + 表域 + 场景 index + 入口场景 → assembleProject。projectId = 工程文件夹名。 */
export async function loadProject(projectId: string): Promise<LoadedProject> {
  const root = `projects/${projectId}`
  const manifest = (await fetchJson(`${root}/manifest.json`)) as LoadedManifest
  const content = manifest.content
  const dir = scenesDir(manifest)
  const [actors, sceneIds, entryScene, skills, items, locale, sprites] = await Promise.all([
    fetchJson(`${root}/${content.actors}`),
    fetchJson(`${root}/${dir}index.json`),
    fetchJson(`${root}/${dir}${manifest.entryScene}.json`),
    fetchJson(`${root}/${content.skills}`),
    fetchJson(`${root}/${content.items}`),
    fetchJson(`${root}/${content.locale}`),
    content.sprites ? fetchJson(`${root}/${content.sprites}`) : Promise.resolve(undefined),
  ])
  return assembleProject(manifest, { actors, sceneIds, entryScene, skills, items, locale, sprites })
}

/** 按需载单场景(引擎 switchScene / 编辑器切场景用)。 */
export async function loadSceneDef(project: LoadedProject, sceneId: string): Promise<SceneDef> {
  const json = await fetchJson(`${project.projectRoot}/${scenesDir(project.manifest)}${sceneId}.json`)
  const [scene] = validateScenes([json])
  if (!scene || scene.id !== sceneId)
    throw new Error(`loadSceneDef: 场景文件 id 不符(期望 "${sceneId}",得 "${scene?.id ?? '(空)'}")`)
  return scene
}

/** 编辑器全量路径:按 index 顺序拉全部场景。 */
export async function loadAllScenes(project: LoadedProject): Promise<SceneDef[]> {
  return Promise.all(project.sceneIds.map((id) => loadSceneDef(project, id)))
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`loader: fetch ${url} 失败 (${res.status})`)
  return res.json()
}
