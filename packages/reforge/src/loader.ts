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
} from '@type-pal/content'
import {
  validateCharacters,
  validateItems,
  validateLocale,
  validateScenes,
  validateSkills,
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
}

function indexById<T extends { id: string }>(arr: T[]): Record<string, T> {
  const m: Record<string, T> = {}
  for (const x of arr) m[x.id] = x
  return m
}

/** 纯组装核:manifest + 5 个 content JSON → guard → LoadedProject。无 IO,可单测。 */
export function assembleProject(manifest: LoadedManifest, jsons: ContentJsons): LoadedProject {
  const scenes = validateScenes(jsons.scenes)
  const characters = validateCharacters(jsons.characters)
  const { skills, levelUp } = validateSkills(jsons.skills)
  const items = validateItems(jsons.items)
  const locale = validateLocale(jsons.locale)

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
    assetBase: {
      root: `projects/${manifest.id}/${a.root}`,
      maps: a.maps,
      tilesets: a.tilesets,
      sprites: a.sprites,
      palettes: a.palettes,
    },
  }
}

/** IO 壳:fetch manifest + 5 个 content JSON → assembleProject。projectId = 工程文件夹名。 */
export async function loadProject(projectId: string): Promise<LoadedProject> {
  const root = `projects/${projectId}`
  const manifest = (await fetchJson(`${root}/manifest.json`)) as LoadedManifest
  const content = manifest.content
  const [characters, scenes, skills, items, locale] = await Promise.all([
    fetchJson(`${root}/${content.characters}`),
    fetchJson(`${root}/${content.scenes}`),
    fetchJson(`${root}/${content.skills}`),
    fetchJson(`${root}/${content.items}`),
    fetchJson(`${root}/${content.locale}`),
  ])
  return assembleProject(manifest, { characters, scenes, skills, items, locale })
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`loader: fetch ${url} 失败 (${res.status})`)
  return res.json()
}
