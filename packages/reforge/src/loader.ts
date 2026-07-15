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
  AssetCatalogV1,
  BattleFieldDef,
  EnemyDef,
  EnemyTeamDef,
  ItemDataMap,
  LevelUpSkill,
  LoadedManifest,
  Locale,
  MapIndexV1,
  PoisonDef,
  ProjectMapV2,
  SceneDef,
  ScriptChunkV1,
  ScriptIndexV1,
  ShopDef,
  SkillDataMap,
  SpriteDef,
  TilesetDef,
} from '@type-pal/content'
import {
  checkScriptIndex,
  mapAssetById,
  upgradeLegacyDialogues,
  validateActors,
  validateAssetCatalog,
  validateItems,
  validateLocale,
  validateManifestAssetConfigV3,
  validateMapIndex,
  validateScenesForContentVersion,
  validateSkills,
  validateSprites,
  validateTilesets,
} from '@type-pal/content'
import { AssetResolver } from './asset-resolver.js'
import type { AssetBase } from './assets.js'
import { loadProjectMap } from './assets.js'
import {
  type FileSource,
  httpSource,
  type LegacyAssetAdapter,
  projectRelativeLegacyAdapter,
} from './file-source.js'
import { ScriptChunkStore } from './script-chunk-store.js'

/** 加载完成的工程数据核(纯组装产物,不含 IO 源;assembleProject 返回它)。 */
export interface LoadedProjectCore {
  manifest: LoadedManifest
  /** 工程根相对路径(fetch 场景/资源用),如 "projects/demo"。 */
  projectRoot: string
  /** 场景 id 清单(content/scenes/index.json)。 */
  sceneIds: string[]
  /** 入口场景(已载入;其余场景 loadSceneDef 按需)。 */
  entryScene: SceneDef
  /** 地图库元数据；运行时只加载此索引，不预载地图正文。 */
  mapIndex: MapIndexV1
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
  /** 店铺表(openShop 货单;缺 = 空 → openShop 报店不存在)。 */
  shops: ShopDef[]
  /** tileset 注册表；地图只按稳定 id 引用。 */
  tilesets: TilesetDef[]
  /** 工程资源根 + 子目录(assets.ts load* 用;来自 manifest.assets)。 */
  assetBase: AssetBase
  /** 唯一物理资产注册表；运行时引用不得从 AssetId 猜路径。 */
  assetCatalog: AssetCatalogV1
  /** 可选分片脚本索引；不含 Command[]。 */
  scriptIndex?: ScriptIndexV1
}

/** 运行期工程对象(main.ts / 编辑器消费):数据核 + 读取源(loadSceneDef/素材加载经它)。 */
export interface LoadedProject extends LoadedProjectCore {
  source: FileSource
  assetResolver: AssetResolver
  scriptStore?: ScriptChunkStore
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
  /** 店铺表(可选;缺 → 空)。 */
  shops?: unknown
  /** tileset 注册表(可选,W7B;缺 → 空)。 */
  tilesets?: unknown
  /** 必需地图索引。 */
  maps: unknown
  scripts?: unknown
  assetCatalog: unknown
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

function normalizeLoadedScene(
  manifest: LoadedManifest,
  json: unknown,
  mapIndex: MapIndexV1,
): SceneDef {
  const upgraded = upgradeLegacyDialogues(json).value
  const [input] = validateScenesForContentVersion([upgraded], manifest.contentVersion)
  if (!input) throw new Error(`工程 "${manifest.id}": 场景为空`)
  const scene = input
  if (!mapAssetById(mapIndex, scene.mapId))
    throw new Error(
      `场景 "${scene.id}": mapId "${scene.mapId}" 不在 ${manifest.content.maps ?? 'map index'}`,
    )
  return scene
}

/** 纯组装核:manifest + content JSON → guard → LoadedProject。无 IO,可单测。 */
export function assembleProject(
  manifest: LoadedManifest,
  jsons: ContentJsons,
  legacyIo?: LegacyAssetAdapter,
): LoadedProjectCore {
  const sceneIds = validateSceneIds(jsons.sceneIds)
  if (manifest.contentVersion !== 3)
    throw new Error(`工程 "${manifest.id}": 仅支持 contentVersion 3，请先迁移`)
  const assetCatalog = validateAssetCatalog(jsons.assetCatalog)
  validateManifestAssetConfigV3(manifest.assets, assetCatalog)
  if (!manifest.content.maps) throw new Error(`工程 "${manifest.id}": manifest 缺地图索引路径`)
  const mapIndex = validateMapIndex(jsons.maps)
  const entryScene = normalizeLoadedScene(manifest, jsons.entryScene, mapIndex)
  const actors = validateActors(jsons.actors)
  const { skills, levelUp } = validateSkills(jsons.skills)
  const items = validateItems(jsons.items)
  // 旧作者工程可能把多行保存在一个 locale 值里；加载边界保留为单 row 软换行。
  // 新生成内容与迁移写盘仍走 validateLocale 默认严格模式，禁止新建这种形态。
  const locale = validateLocale(jsons.locale, { allowLegacySoftWrap: true })
  const sprites = jsons.sprites ? validateSprites(jsons.sprites) : []
  // M4:敌人/敌队轻校验(数组 + id;详校验编辑器期上 zod)
  const enemies = Array.isArray(jsons.enemies) ? (jsons.enemies as EnemyDef[]) : []
  const enemyTeams = Array.isArray(jsons.enemyTeams) ? (jsons.enemyTeams as EnemyTeamDef[]) : []
  const battleFields = Array.isArray(jsons.battleFields)
    ? (jsons.battleFields as BattleFieldDef[])
    : []
  if (!jsons.tilesets) throw new Error(`工程 "${manifest.id}": manifest 缺 tilesets 注册表`)
  const tilesets = validateTilesets(jsons.tilesets)
  const poisonList = Array.isArray(jsons.poisons) ? (jsons.poisons as PoisonDef[]) : []
  const poisonsById: Record<number, PoisonDef> = {}
  for (const p of poisonList) poisonsById[p.id] = p
  const ambiences = Array.isArray(jsons.ambiences) ? (jsons.ambiences as AmbienceDef[]) : []
  const shops = Array.isArray(jsons.shops) ? (jsons.shops as ShopDef[]) : []
  const scriptIndex =
    jsons.scripts === undefined
      ? undefined
      : (() => {
          checkScriptIndex(jsons.scripts)
          return jsons.scripts
        })()

  if (!entryScene || entryScene.id !== manifest.entryScene)
    throw new Error(
      `工程 "${manifest.id}": 入口场景不符(期望 "${manifest.entryScene}",得 "${entryScene?.id ?? '(空)'}")`,
    )
  if (!sceneIds.includes(manifest.entryScene))
    throw new Error(
      `工程 "${manifest.id}": 入口场景 "${manifest.entryScene}" 不在 scenes/index.json`,
    )

  const a = manifest.assets.legacy
  const unavailableLegacy: LegacyAssetAdapter = {
    readText: async (path) => {
      throw new Error(`assembleProject 纯核无 legacy IO:${path}`)
    },
    readJson: async (path) => {
      throw new Error(`assembleProject 纯核无 legacy IO:${path}`)
    },
    readBytes: async (path) => {
      throw new Error(`assembleProject 纯核无 legacy IO:${path}`)
    },
    urlFor: async (path) => {
      throw new Error(`assembleProject 纯核无 legacy IO:${path}`)
    },
  }
  const root = a?.root ?? 'assets'
  return {
    manifest,
    projectRoot: `projects/${manifest.id}`,
    sceneIds,
    entryScene,
    mapIndex,
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
    shops,
    tilesets,
    scriptIndex,
    assetCatalog,
    assetBase: {
      root,
      tilesets: a?.tilesets ?? 'tilesets',
      sprites: a?.sprites ?? 'sprites',
      palettes: a?.palettes ?? 'palettes',
      sounds: a?.sounds ?? `${root}/sounds`,
      portraits: a?.portraits ?? `${root}/portraits`,
      faces: a?.faces ?? `${root}/faces`,
      itemIcons: a?.itemIcons ?? `${root}/item-icons`,
      ...(a?.ui ? { uiOverride: a.ui } : {}),
      io: legacyIo ?? unavailableLegacy,
    },
  }
}

/** 场景目录相对路径(manifest.content.scenes;规整为以 / 结尾)。 */
function scenesDir(manifest: LoadedManifest): string {
  const dir = manifest.content.scenes ?? 'content/scenes/'
  return dir.endsWith('/') ? dir : `${dir}/`
}

function scriptsDir(manifest: LoadedManifest): string | undefined {
  const raw = manifest.content.scripts
  if (!raw) return undefined
  return raw.endsWith('/') ? raw : `${raw}/`
}

/** 真加载核:经 FileSource 读 manifest + 表域 + 场景 index + 入口场景 → assembleProject + 挂 source。 */
export async function loadProjectFrom(source: FileSource): Promise<LoadedProject> {
  const manifest = await source.readJson<LoadedManifest>('manifest.json')
  if (manifest.contentVersion !== 3)
    throw new Error(`工程 "${manifest.id}": 仅支持 contentVersion 3，请先迁移`)
  validateManifestAssetConfigV3(manifest.assets)
  const content = manifest.content
  const dir = scenesDir(manifest)
  const scriptDir = scriptsDir(manifest)
  const [
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
    shops,
    tilesets,
    mapIndexJson,
    scripts,
    assetCatalog,
  ] = await Promise.all([
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
    content.shops ? source.readJson(content.shops) : Promise.resolve(undefined),
    content.tilesets ? source.readJson(content.tilesets) : Promise.resolve(undefined),
    content.maps ? source.readJson(content.maps) : Promise.resolve(undefined),
    scriptDir ? source.readJson(`${scriptDir}index.json`) : Promise.resolve(undefined),
    source.readJson(manifest.assets.catalog),
  ])
  const core = assembleProject(
    manifest,
    {
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
      shops,
      tilesets,
      maps: mapIndexJson,
      scripts,
      assetCatalog,
    },
    source.legacy ?? projectRelativeLegacyAdapter(source),
  )
  const assetResolver = new AssetResolver(
    manifest.id,
    core.assetCatalog,
    manifest.assets.roles,
    source,
  )
  return {
    ...core,
    source,
    assetResolver,
    ...(scriptDir && core.scriptIndex
      ? { scriptStore: new ScriptChunkStore(source, scriptDir, core.scriptIndex) }
      : {}),
  }
}

/** IO 壳:projectId → httpSource('projects/<id>') → loadProjectFrom。签名不变(dev/引擎入口)。 */
export async function loadProject(projectId: string): Promise<LoadedProject> {
  return loadProjectFrom(httpSource(`projects/${projectId}`))
}

/** 按需载单场景(引擎 switchScene / 编辑器切场景用)。 */
export async function loadSceneDef(project: LoadedProject, sceneId: string): Promise<SceneDef> {
  const json = await project.source.readJson(`${scenesDir(project.manifest)}${sceneId}.json`)
  const scene = normalizeLoadedScene(project.manifest, json, project.mapIndex)
  if (!scene || scene.id !== sceneId)
    throw new Error(`loadSceneDef: 场景文件 id 不符(期望 "${sceneId}",得 "${scene?.id ?? '(空)'}")`)
  return scene
}

/** 编辑器全量路径:按 index 顺序拉全部场景。 */
export async function loadAllScenes(project: LoadedProject): Promise<SceneDef[]> {
  const scenes: SceneDef[] = []
  for (const id of project.sceneIds) scenes.push(await loadSceneDef(project, id))
  return scenes
}

/** 编辑器 round-trip 路径：显式读取全部 chunk；游戏运行时绝不调用。 */
export async function loadAllScriptChunks(
  project: LoadedProject,
): Promise<Record<string, ScriptChunkV1>> {
  const index = project.scriptIndex
  const dir = scriptsDir(project.manifest)
  if (!index || !dir) return {}
  const entries = await Promise.all(
    Object.entries(index.chunks).map(async ([id, meta]) => {
      const raw = await project.source.readJson<unknown>(`${dir}${meta.path}`)
      const chunk = upgradeLegacyDialogues(raw).value as ScriptChunkV1
      if (
        chunk.version !== 1 ||
        chunk.id !== id ||
        typeof chunk.scripts !== 'object' ||
        chunk.scripts === null
      )
        throw new Error(`loadAllScriptChunks: chunk "${id}" 形状或 id 不符`)
      return [id, chunk] as const
    }),
  )
  return Object.fromEntries(entries)
}

/**
 * 显式全量载入 map index 中的所有地图，包括零场景引用资产。
 * 键 = 稳定 map id；运行时不会调用此函数，仍按场景懒加载。
 */
export async function loadAllProjectMaps(
  project: LoadedProject,
  _scenes: SceneDef[] = [],
): Promise<Record<string, ProjectMapV2>> {
  const out: Record<string, ProjectMapV2> = {}
  await Promise.all(
    project.mapIndex.maps.map(async (asset) => {
      out[asset.id] = await loadProjectMap(project.assetBase, asset.path)
    }),
  )
  return out
}

/** 按稳定 id 懒加载一张地图。 */
export async function loadProjectMapById(
  project: LoadedProject,
  mapId: string,
): Promise<ProjectMapV2> {
  const asset = mapAssetById(project.mapIndex, mapId)
  if (!asset) throw new Error(`loadProjectMapById: mapId "${mapId}" 不在 map index`)
  return loadProjectMap(project.assetBase, asset.path)
}
