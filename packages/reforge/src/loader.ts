// 工程 loader:运行期 fetch manifest + content JSON → guard 校验 → 组装内存对象。
// assembleProject 是纯核(可单测,喂 fixture JSON);loadProject 是 IO 壳(fetch)。
// main.ts 不再 import 任何具体游戏数据,全靠 loader 注入。
import type {
  CharacterTemplate,
  ItemDataMap,
  LevelUpSkill,
  LoadedManifest,
  Locale,
  SceneDef,
  SkillDataMap,
  SpriteDef,
} from '@type-pal/content'
import {
  validateCharacters,
  validateItems,
  validateLocale,
  validateScenes,
  validateSkills,
  validateSprites,
} from '@type-pal/content'
import type { AssetBase } from './assets.js'

/** 加载完成的工程对象(main.ts 消费)。 */
export interface LoadedProject {
  manifest: LoadedManifest
  scenes: SceneDef[]
  /** 入口场景(entryScene 解析;取不到 assembleProject 已 throw)。 */
  entryScene: SceneDef
  charactersById: Record<string, CharacterTemplate>
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
  characters: unknown
  scenes: unknown
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

/** 纯组装核:manifest + content JSON(5 必 + sprites 可选) → guard → LoadedProject。无 IO,可单测。 */
export function assembleProject(manifest: LoadedManifest, jsons: ContentJsons): LoadedProject {
  const scenes = validateScenes(jsons.scenes)
  const characters = validateCharacters(jsons.characters)
  const { skills, levelUp } = validateSkills(jsons.skills)
  const items = validateItems(jsons.items)
  const locale = validateLocale(jsons.locale)
  const sprites = jsons.sprites ? validateSprites(jsons.sprites) : []

  const entryScene = scenes.find((s) => s.id === manifest.entryScene)
  if (!entryScene)
    throw new Error(`工程 "${manifest.id}": 入口场景 "${manifest.entryScene}" 在 scenes 里找不到`)

  const a = manifest.assets
  return {
    manifest,
    scenes,
    entryScene,
    charactersById: indexById(characters),
    skills: indexById(skills),
    levelUp: levelUp as Record<string, LevelUpSkill[]>,
    items: indexById(items),
    locale,
    spritesById: indexById(sprites),
    assetBase: {
      root: `projects/${manifest.id}/${a.root}`,
      maps: a.maps,
      tilesets: a.tilesets,
      sprites: a.sprites,
      palettes: a.palettes,
    },
  }
}

/** IO 壳:fetch manifest + content JSON(5 必 + sprites 若 manifest 有则取) → assembleProject。projectId = 工程文件夹名。 */
export async function loadProject(projectId: string): Promise<LoadedProject> {
  const root = `projects/${projectId}`
  const manifest = (await fetchJson(`${root}/manifest.json`)) as LoadedManifest
  const content = manifest.content
  const [characters, scenes, skills, items, locale, sprites] = await Promise.all([
    fetchJson(`${root}/${content.characters}`),
    fetchJson(`${root}/${content.scenes}`),
    fetchJson(`${root}/${content.skills}`),
    fetchJson(`${root}/${content.items}`),
    fetchJson(`${root}/${content.locale}`),
    content.sprites ? fetchJson(`${root}/${content.sprites}`) : Promise.resolve(undefined),
  ])
  return assembleProject(manifest, { characters, scenes, skills, items, locale, sprites })
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`loader: fetch ${url} 失败 (${res.status})`)
  return res.json()
}
