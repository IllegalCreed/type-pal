/**
 * seed —— 自包含工程克隆的纯核(P4)。
 * relativizeManifest:pal 种子 manifest 的 assets 绝对路径(/extracted、/baked)→ 工程内相对
 * (assets/extracted、assets/baked),使克隆后的本地工程经 fsaSource 离线可读。
 * enumerateSeedFiles:汇总克隆要拉的**可复制**文件集(内容表 + 场景 + 全部素材);
 * manifest.json 本身走 relativizeManifest 单独写(不在此列)。
 */
import type { LoadedManifest } from '@type-pal/content'

/** 一个种子文件:从 src 读(种子源 rel;/ 开头=绝对透传)→ 写本地 rel。 */
export interface SeedFile {
  rel: string
  src: string
  kind: 'json' | 'binary'
  /** 字节数(素材有;内容 JSON 未知记 0)—— 克隆进度按累计 size / totalBytes。 */
  size: number
}

export interface FileList {
  files: { path: string; size: number }[]
}

function relPath(s: string): string {
  if (s.startsWith('/extracted')) return s.replace(/^\/extracted/, 'assets/extracted')
  if (s.startsWith('/baked')) return s.replace(/^\/baked/, 'assets/baked')
  return s
}

/**
 * 空白工程骨架(P4;高端「从头做」):最小 manifest + 空内容表 + 一个占位空场景。
 * 返回 {rel: 值} 文件集(writeProject 落盘)。assets 指向工程内相对(空 assets 夹,自产素材待地图模块)。
 * ⚠ 占位场景 map=reuseOriginalMap:0 是**占位**(空白工程无素材)—— 真正可渲染/可玩的空白工程
 * 依赖地图模块提供「空白地图」模型 + 编辑器容忍无地图(§4.2b,decision A gated on 地图模块)。
 */
export function buildBlankProject(name: string): Record<string, unknown> {
  const id =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'new-project'
  return {
    'manifest.json': {
      id,
      name: name.trim() || '新工程',
      contentVersion: 1,
      entryScene: 'start',
      content: {
        actors: 'content/actors.json',
        skills: 'content/skills.json',
        items: 'content/items.json',
        locale: 'content/locale.json',
        scenes: 'content/scenes/',
      },
      assets: {
        root: 'assets/extracted/data',
        maps: 'tilemap',
        tilesets: 'tileset',
        sprites: 'sprite',
        palettes: 'palette',
        sounds: 'assets/extracted/sounds',
        music: 'assets/extracted/music',
        portraits: 'assets/baked/portraits',
        faces: 'assets/baked/ui/face',
        itemIcons: 'assets/baked/ui/items',
      },
      startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    },
    'content/actors.json': [],
    'content/skills.json': { skills: [], levelUp: {} },
    'content/items.json': [],
    'content/locale.json': {},
    'content/scenes/index.json': ['start'],
    'content/scenes/start.json': {
      id: 'start',
      map: { reuseOriginalMap: 0 },
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [],
    },
  }
}

/** assets 各绝对路径字段相对化(子目录/相对值不变)。深拷,不改原对象。 */
export function relativizeManifest(m: LoadedManifest): LoadedManifest {
  const assets = Object.fromEntries(
    Object.entries(m.assets).map(([k, v]) => [k, typeof v === 'string' ? relPath(v) : v]),
  ) as LoadedManifest['assets']
  return { ...structuredClone(m), assets }
}

/** 场景目录(manifest.content.scenes;规整为以 / 结尾)。 */
export function scenesDir(m: LoadedManifest): string {
  const dir = m.content.scenes ?? 'content/scenes/'
  return dir.endsWith('/') ? dir : `${dir}/`
}

/**
 * 克隆要复制的文件集:内容表(manifest.content 各文件,scenes 目录除外)+ scenes index + 每场景
 * + 全部素材(asset-manifest → assets/extracted/;baked-manifest → assets/baked/)。
 */
export function enumerateSeedFiles(
  manifest: LoadedManifest,
  sceneIds: string[],
  assetManifest: FileList,
  bakedManifest: FileList,
): SeedFile[] {
  const out: SeedFile[] = []
  const json = (rel: string): void => {
    out.push({ rel, src: rel, kind: 'json', size: 0 })
  }

  // 内容表(scenes 是目录,跳过)
  for (const [key, val] of Object.entries(manifest.content)) {
    if (key === 'scenes' || typeof val !== 'string') continue
    json(val)
  }
  // 场景 index + 每场景
  const dir = scenesDir(manifest)
  json(`${dir}index.json`)
  for (const id of sceneIds) json(`${dir}${id}.json`)
  // 素材:extracted → assets/extracted/;baked → assets/baked/
  for (const f of assetManifest.files) {
    out.push({ rel: `assets/extracted/${f.path}`, src: `/extracted/${f.path}`, kind: 'binary', size: f.size })
  }
  for (const f of bakedManifest.files) {
    out.push({ rel: `assets/baked/${f.path}`, src: `/baked/${f.path}`, kind: 'binary', size: f.size })
  }
  return out
}
