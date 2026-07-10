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
  AmbienceDef,
  BattleFieldDef,
  EnemyDef,
  EnemyTeamDef,
  ItemDataMap,
  PoisonDef,
  LevelUpSkill,
  LoadedManifest,
  Locale,
  OwnMap,
  SceneDef,
  SkillDataMap,
  SpriteDef,
  TilesetDef,
} from '@type-pal/content'
import {
  isReuseMap,
  validateTilesets,
  validateActors,
  validateItems,
  validateLocale,
  validateScenes,
  validateSkills,
  validateSprites,
} from '@type-pal/content'
import type { AssetBase } from './assets.js'
import { loadOwnMap } from './assets.js'
import { type FileSource, httpSource } from './file-source.js'

/** 加载完成的工程数据核(纯组装产物,不含 IO 源;assembleProject 返回它)。 */
export interface LoadedProjectCore {
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
  /** 敌人定义(M4;无 enemies.json 时空 {})。 */
  enemiesById: Record<string, EnemyDef>
  /** 敌队表(M4;startBattle team-<n> 查;无时空 {})。 */
  enemyTeamsById: Record<string, EnemyTeamDef>
  /** 战场表(D24 一等 content 域;缺 manifest 声明 = 空数组,main 走 assetBase 遗留回退)。 */
  battleFields: BattleFieldDef[]
  /** 毒表(P2 数据化 DoT;id → PoisonDef;缺 = 空 → 毒无效果)。 */
  poisonsById: Record<number, PoisonDef>
  /** 毒表原序数组(B10 编辑器工作副本;⚠ 勿用 Object.values(poisonsById) 代替 ——
   *  数值键会升序重排(137 跳到 551 前),破坏 round-trip 保序)。 */
  poisons: PoisonDef[]
  /** 氛围表(W6 昼夜;缺 manifest 声明 = 空 → setAmbience no-op)。 */
  ambiences: AmbienceDef[]
  /** tileset 注册表(W7B;缺 manifest 声明 = 空数组,原版借用走路径直通)。 */
  tilesets: TilesetDef[]
  /** 工程资源根 + 子目录(assets.ts load* 用;来自 manifest.assets)。 */
  assetBase: AssetBase
}

/** 运行期工程对象(main.ts / 编辑器消费):数据核 + 读取源(loadSceneDef/素材加载经它)。 */
export interface LoadedProject extends LoadedProjectCore {
  source: FileSource
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
  /** 敌人/敌队(可选,M4;缺 → 空表)。 */
  enemies?: unknown
  enemyTeams?: unknown
  /** 战场表(可选,D24;缺 → 空数组走遗留回退)。 */
  battleFields?: unknown
  /** 毒表(可选,P2;缺 → 空)。 */
  poisons?: unknown
  /** 氛围表(可选,W6;缺 → 空)。 */
  ambiences?: unknown
  /** tileset 注册表(可选,W7B;缺 → 空)。 */
  tilesets?: unknown
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
export function assembleProject(manifest: LoadedManifest, jsons: ContentJsons): LoadedProjectCore {
  const sceneIds = validateSceneIds(jsons.sceneIds)
  const [entryScene] = validateScenes([jsons.entryScene])
  const actors = validateActors(jsons.actors)
  const { skills, levelUp } = validateSkills(jsons.skills)
  const items = validateItems(jsons.items)
  const locale = validateLocale(jsons.locale)
  const sprites = jsons.sprites ? validateSprites(jsons.sprites) : []
  // M4:敌人/敌队轻校验(数组 + id;详校验编辑器期上 zod)
  const enemies = Array.isArray(jsons.enemies) ? (jsons.enemies as EnemyDef[]) : []
  const enemyTeams = Array.isArray(jsons.enemyTeams) ? (jsons.enemyTeams as EnemyTeamDef[]) : []
  const battleFields = Array.isArray(jsons.battleFields)
    ? (jsons.battleFields as BattleFieldDef[])
    : []
  const tilesets = jsons.tilesets ? validateTilesets(jsons.tilesets) : []
  const poisonList = Array.isArray(jsons.poisons) ? (jsons.poisons as PoisonDef[]) : []
  const poisonsById: Record<number, PoisonDef> = {}
  for (const p of poisonList) poisonsById[p.id] = p
  const ambiences = Array.isArray(jsons.ambiences) ? (jsons.ambiences as AmbienceDef[]) : []

  if (!entryScene || entryScene.id !== manifest.entryScene)
    throw new Error(
      `工程 "${manifest.id}": 入口场景不符(期望 "${manifest.entryScene}",得 "${entryScene?.id ?? '(空)'}")`,
    )
  if (!sceneIds.includes(manifest.entryScene))
    throw new Error(
      `工程 "${manifest.id}": 入口场景 "${manifest.entryScene}" 不在 scenes/index.json`,
    )

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
    enemiesById: indexById(enemies),
    enemyTeamsById: indexById(enemyTeams),
    battleFields,
    poisonsById,
    poisons: poisonList,
    ambiences,
    tilesets,
    assetBase: (() => {
      // 素材路径**原样用**:相对(如 "assets/extracted/data" / "assets")的根由 FileSource 提供
      // ——httpSource 的 baseUrl=projects/<id>(dev/种子),fsaSource 是工程夹(本地克隆);
      // 绝对("/extracted…",pal 共享提取源)则 source passthrough。
      // ⚠ 不再在此拼 `projects/<id>/` 前缀:那是 P2 前直连 fetch 的旧约定,统一经 source 后拼了会
      //   双重前缀(dev pal 全绝对故一直没暴露;克隆工程用相对 assets/ 即命中 → 场景渲染 NotFound 根因)。
      const root = a.root
      return {
        root,
        maps: a.maps,
        tilesets: a.tilesets,
        sprites: a.sprites,
        palettes: a.palettes,
        sounds: a.sounds ?? `${root}/sounds`,
        music: a.music ?? `${root}/music`,
        portraits: a.portraits ?? `${root}/portraits`,
        faces: a.faces ?? `${root}/faces`,
        itemIcons: a.itemIcons ?? `${root}/item-icons`,
        ...(a.ui ? { uiOverride: a.ui } : {}),
      }
    })(),
  }
}

/** 场景目录相对路径(manifest.content.scenes;规整为以 / 结尾)。 */
function scenesDir(manifest: LoadedManifest): string {
  const dir = manifest.content.scenes ?? 'content/scenes/'
  return dir.endsWith('/') ? dir : `${dir}/`
}

/** 真加载核:经 FileSource 读 manifest + 表域 + 场景 index + 入口场景 → assembleProject + 挂 source。 */
export async function loadProjectFrom(source: FileSource): Promise<LoadedProject> {
  const manifest = await source.readJson<LoadedManifest>('manifest.json')
  const content = manifest.content
  const dir = scenesDir(manifest)
  const [actors, sceneIds, entryScene, skills, items, locale, sprites, enemies, enemyTeams, battleFields, poisons, ambiences, tilesets] =
    await Promise.all([
      source.readJson(content.actors as string),
      source.readJson(`${dir}index.json`),
      source.readJson(`${dir}${manifest.entryScene}.json`),
      source.readJson(content.skills as string),
      source.readJson(content.items as string),
      source.readJson(content.locale as string),
      content.sprites ? source.readJson(content.sprites) : Promise.resolve(undefined),
      content.enemies ? source.readJson(content.enemies) : Promise.resolve(undefined),
      content.enemyTeams ? source.readJson(content.enemyTeams) : Promise.resolve(undefined),
      content.battleFields ? source.readJson(content.battleFields) : Promise.resolve(undefined),
      content.poisons ? source.readJson(content.poisons) : Promise.resolve(undefined),
      content.ambiences ? source.readJson(content.ambiences) : Promise.resolve(undefined),
      content.tilesets ? source.readJson(content.tilesets) : Promise.resolve(undefined),
    ])
  const core = assembleProject(manifest, {
    actors,
    sceneIds,
    entryScene,
    skills,
    items,
    locale,
    sprites,
    enemies,
    enemyTeams,
    battleFields,
    poisons,
    ambiences,
    tilesets,
  })
  // source 注入 assetBase(P2:素材加载经它;assembleProject 纯核不碰 IO,故在壳注入)
  return { ...core, assetBase: { ...core.assetBase, source }, source }
}

/** IO 壳:projectId → httpSource('projects/<id>') → loadProjectFrom。签名不变(dev/引擎入口)。 */
export async function loadProject(projectId: string): Promise<LoadedProject> {
  return loadProjectFrom(httpSource(`projects/${projectId}`))
}

/** 按需载单场景(引擎 switchScene / 编辑器切场景用)。 */
export async function loadSceneDef(project: LoadedProject, sceneId: string): Promise<SceneDef> {
  const json = await project.source.readJson(`${scenesDir(project.manifest)}${sceneId}.json`)
  const [scene] = validateScenes([json])
  if (!scene || scene.id !== sceneId)
    throw new Error(`loadSceneDef: 场景文件 id 不符(期望 "${sceneId}",得 "${scene?.id ?? '(空)'}")`)
  return scene
}

/** 编辑器全量路径:按 index 顺序拉全部场景。 */
export async function loadAllScenes(project: LoadedProject): Promise<SceneDef[]> {
  return Promise.all(project.sceneIds.map((id) => loadSceneDef(project, id)))
}

/**
 * 编辑器:载入所有 own 场景引用的自有地图(content/maps/<id>.json)。
 * 键 = scene.map.ownMap(工程内相对路径)→ OwnMap v1,供编辑器实时渲染 + round-trip
 * (own 场景引用即索引,无需单独 maps 索引)。复用原版地图的场景跳过。pal 无 own 场景 → {}。
 */
export async function loadAllOwnMaps(
  project: LoadedProject,
  scenes: SceneDef[],
): Promise<Record<string, OwnMap>> {
  const out: Record<string, OwnMap> = {}
  await Promise.all(
    scenes.map(async (s) => {
      if (isReuseMap(s.map)) return
      out[s.map.ownMap] = await loadOwnMap(project.assetBase, s.map.ownMap)
    }),
  )
  return out
}
