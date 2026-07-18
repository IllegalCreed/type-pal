/**
 * seed —— 自包含工程克隆的纯核(P4)。
 * relativizeManifest:pal 种子 manifest 的 legacy /extracted 绝对路径 → 工程内相对
 * assets/extracted，使克隆后的本地工程经 fsaSource 离线可读。
 * enumerateSeedFiles:汇总克隆要拉的**可复制**文件集(内容表 + 场景 + 全部素材);
 * manifest.json 本身走 relativizeManifest 单独写(不在此列)。
 */
import {
  type AssetCatalogV1,
  formatProjectMapV2,
  type LoadedManifest,
  type MapIndexV1,
  type ProjectMapV2,
  type ScriptIndexV1,
} from '@type-pal/content'
import { buildSeedAssets } from './seed-assets.js'

const SEED_W = 12
const SEED_H = 12

/** 起始地图:12×12 单层草地矩形房(错排 lattice 铺满草棋盘);碰撞全 0,越界自动挡边。 */
function buildSeedMap(): ProjectMapV2 {
  const rows = SEED_H * 2
  const tiles: (number | null)[][] = Array.from({ length: rows }, (_, b) =>
    Array.from({ length: SEED_W }, (_, k) => ((b + k) % 2 === 0 ? 0 : 1)),
  )
  const collision = Array.from({ length: rows }, () => Array.from({ length: SEED_W }, () => 0))
  return {
    version: 2,
    width: SEED_W,
    height: SEED_H,
    tilesetId: 'starter',
    layers: [{ id: 'floor', name: '地板', depthMode: 'flat', tiles }],
    collision,
  }
}

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
  return s
}

/**
 * 空白工程骨架(P4「从头做」;W-blank:开箱即玩)。返回 {rel: 值} 文件集(writeProject 落盘;
 * 二进制值 = ArrayBuffer 走 Blob)。**零原版字节** —— 自产合成色盘 + 起始地形瓦片集 + 占位主角:
 * 点新建即出生在一间 12×12 草地房、可走动、被房间边界挡住。作者随后逐一替换占位素材。
 * async:占位素材 .rle 走浏览器 gzip(seed-assets)。
 */
export async function buildBlankProject(name: string): Promise<Record<string, unknown>> {
  const id =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'new-project'
  const { palette, tilesetRle, spriteRle } = await buildSeedAssets()
  // 房间中心 = 菱形轴 ((W+H)/2, (H−W)/2)(方形 → (W,0));落逻辑格中心,不卡边界(gap #7)。
  const entryCol = Math.floor((SEED_W + SEED_H) / 2)
  const entryRow = Math.floor((SEED_H - SEED_W) / 2)
  return {
    'manifest.json': {
      id,
      name: name.trim() || '新工程',
      contentVersion: 3,
      entryScene: 'start',
      content: {
        actors: 'content/actors.json',
        skills: 'content/skills.json',
        items: 'content/items.json',
        locale: 'content/locale.json',
        sprites: 'content/sprites.json',
        tilesets: 'content/tilesets.json',
        stamps: 'content/stamps.json',
        scenes: 'content/scenes/',
        maps: 'content/maps/index.json',
      },
      assets: {
        catalog: 'assets/index.json',
        roles: {},
        legacy: {
          families: ['tileset', 'sprite', 'color-table'],
          root: 'assets',
          tilesets: 'tilesets',
          sprites: 'sprites',
          palettes: 'palettes',
        },
      },
      startWorld: { party: ['hero'], money: 0, learnedSkills: {}, inventory: [] },
    },
    'content/actors.json': [
      {
        id: 'hero',
        name: 'name.hero',
        spriteId: 'hero',
        // 最小战斗档:无 battler 的 actor 不能入队(instantiate throw)。作者按需扩。
        battler: {
          baseStats: {
            level: 1,
            hp: 100,
            maxHP: 100,
            mp: 0,
            maxMP: 0,
            attack: 10,
            defense: 5,
            magicAttack: 5,
            speed: 10,
            luck: 10,
          },
          initialEquipment: {},
          initialMagic: [],
        },
      },
    ],
    'content/sprites.json': [
      {
        id: 'hero',
        spriteNum: 0,
        label: '占位主角',
        layout: { kind: 'directional', framesPerDir: 3 },
      },
    ],
    'content/tilesets.json': [
      { id: 'starter', name: '起始地形', category: 'outdoor', path: 'assets/tilesets/starter.rle' },
    ],
    'content/stamps.json': [],
    'content/skills.json': { skills: [], levelUp: {} },
    'content/items.json': [],
    'content/locale.json': { 'name.hero': '主角' },
    'content/scenes/index.json': ['start'],
    'content/scenes/start.json': {
      id: 'start',
      mapId: 'start',
      entry: { pos: { col: entryCol, row: entryRow, height: 0 }, facing: 'down' },
      entities: [],
    },
    'content/maps/index.json': {
      version: 1,
      maps: [{ id: 'start', name: '起始地图', path: 'content/maps/start.json' }],
    },
    'content/maps/start.json': formatProjectMapV2(buildSeedMap()),
    'assets/index.json': { version: 1, assets: {} },
    'assets/palettes/0.json': palette,
    'assets/tilesets/starter.rle': tilesetRle,
    'assets/sprites/0.rle': spriteRle,
  }
}

/** assets 各绝对路径字段相对化(子目录/相对值不变)。深拷,不改原对象。 */
export function relativizeManifest(m: LoadedManifest): LoadedManifest {
  const legacy = m.assets.legacy
    ? (Object.fromEntries(
        Object.entries(m.assets.legacy).map(([key, value]) => [
          key,
          typeof value === 'string' ? relPath(value) : structuredClone(value),
        ]),
      ) as NonNullable<LoadedManifest['assets']['legacy']>)
    : undefined
  const assets: LoadedManifest['assets'] = {
    ...structuredClone(m.assets),
    ...(legacy ? { legacy } : {}),
  }
  return { ...structuredClone(m), assets }
}

/** 场景目录(manifest.content.scenes;规整为以 / 结尾)。 */
export function scenesDir(m: LoadedManifest): string {
  const dir = m.content.scenes ?? 'content/scenes/'
  return dir.endsWith('/') ? dir : `${dir}/`
}

export function scriptsDir(m: LoadedManifest): string | undefined {
  const dir = m.content.scripts
  if (!dir) return undefined
  return dir.endsWith('/') ? dir : `${dir}/`
}

/**
 * 克隆要复制的文件集:内容表(manifest.content 各文件,scenes 目录除外)+ scenes index + 每场景
 * + 全部素材(catalog 精确闭包 + 尚未迁移族的 asset-manifest → assets/extracted/)。
 */
export function enumerateSeedFiles(
  manifest: LoadedManifest,
  sceneIds: string[],
  assetManifest: FileList,
  scriptIndex?: ScriptIndexV1,
  mapIndex?: MapIndexV1,
  catalog?: AssetCatalogV1,
): SeedFile[] {
  const out: SeedFile[] = []
  const json = (rel: string): void => {
    out.push({ rel, src: rel, kind: 'json', size: 0 })
  }

  // 内容表(scenes 是目录,跳过)
  for (const [key, val] of Object.entries(manifest.content)) {
    if (key === 'scenes' || key === 'scripts' || typeof val !== 'string') continue
    json(val)
  }
  // 场景 index + 每场景
  const dir = scenesDir(manifest)
  json(`${dir}index.json`)
  for (const id of sceneIds) json(`${dir}${id}.json`)
  const scriptDir = scriptsDir(manifest)
  if (scriptDir && scriptIndex) {
    json(`${scriptDir}index.json`)
    for (const meta of Object.values(scriptIndex.chunks)) json(`${scriptDir}${meta.path}`)
  }
  // map index 本身已由 manifest.content 循环加入；这里补齐其登记的所有地图 JSON。
  for (const asset of mapIndex?.maps ?? []) json(asset.path)
  json(manifest.assets.catalog)
  for (const record of Object.values(catalog?.assets ?? {}))
    out.push({ rel: record.path, src: record.path, kind: 'binary', size: record.bytes })
  // 尚未 catalog 化的 legacy 素材仍从 extracted 复制；四类静态图只来自上面的 catalog records。
  for (const f of assetManifest.files) {
    out.push({
      rel: `assets/extracted/${f.path}`,
      src: `/extracted/${f.path}`,
      kind: 'binary',
      size: f.size,
    })
  }
  return out
}
