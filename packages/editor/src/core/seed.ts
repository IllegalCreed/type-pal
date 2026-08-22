/**
 * seed —— 自包含项目克隆的纯核(P4)。
 * relativizeManifest:深拷贝当前 manifest，避免克隆提交过程修改种子对象。
 * enumerateSeedFiles:汇总克隆要拉的**可复制**文件集(内容表 + 场景 + 全部素材);
 * manifest.json 本身走 relativizeManifest 单独写(不在此列)。
 */
import {
  type AssetCatalogV1,
  type AssetRecordV1,
  CONTENT_VERSION,
  type CurrentManifest,
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  formatProjectMap,
  type MapIndexV1,
  type ProjectMap,
} from '@type-pal/content'
import { sha256Hex } from './binary-signature.js'
import { buildSeedAssets } from './seed-assets.js'

const SEED_W = 12
const SEED_H = 12

/** 起始地图:12×12 单层草地矩形房(错排 lattice 铺满草棋盘);碰撞全 0,越界自动挡边。 */
function buildSeedMap(): ProjectMap {
  const rows = SEED_H * 2
  const tiles: (number | null)[][] = Array.from({ length: rows }, (_, b) =>
    Array.from({ length: SEED_W }, (_, k) => ((b + k) % 2 === 0 ? 0 : 1)),
  )
  const collision = Array.from({ length: rows }, () => Array.from({ length: SEED_W }, () => 0))
  return {
    version: 4,
    width: SEED_W,
    height: SEED_H,
    tilesetRefs: ['starter'],
    layers: [
      {
        id: 'floor',
        name: '地板',
        tiles,
        sources: tiles.map((row) => row.map((tileId) => (tileId === null ? null : 0))),
      },
    ],
    collision,
  }
}

/** 一个种子文件:从项目内 src 读 → 写本地 rel。 */
export interface SeedFile {
  rel: string
  src: string
  kind: 'json' | 'binary'
  /** 字节数(素材有;内容 JSON 未知记 0)—— 克隆进度按累计 size / totalBytes。 */
  size: number
  commitPhase: 'binary' | 'content' | 'catalog'
  catalogAsset?: {
    id: string
    kind: string
    bytes: number
    sha256: string
    record: AssetRecordV1
  }
}

/**
 * 空白项目骨架(P4「从头做」;W-blank:开箱即玩)。返回 {rel: 值} 文件集(writeProject 落盘;
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
  const { palette, tilesetRle, spriteRle, battleSpriteRle } = await buildSeedAssets()
  const colorAsset = 'color.project-standard'
  const colorPath = 'assets/generated/colors/project-standard.json'
  const colorBytes = new TextEncoder().encode(`${JSON.stringify(palette, null, 2)}\n`)
  const colorHash = await sha256Hex(colorBytes)
  const tilesetAsset = 'tileset.generated.starter'
  const tilesetPath = 'assets/generated/tilesets/starter.rle'
  const tilesetHash = await sha256Hex(tilesetRle)
  const spriteAsset = 'sprite.generated.starter'
  const spritePath = 'assets/generated/sprites/starter.rle'
  const spriteHash = await sha256Hex(spriteRle)
  const battleSpriteAsset = 'battle-sprite.generated.starter'
  const battleSpritePath = 'assets/generated/battle-sprites/starter.rle'
  const battleSpriteHash = await sha256Hex(battleSpriteRle)
  // 房间中心 = 菱形轴 ((W+H)/2, (H−W)/2)(方形 → (W,0));落逻辑格中心,不卡边界(gap #7)。
  const entryCol = Math.floor((SEED_W + SEED_H) / 2)
  const entryRow = Math.floor((SEED_H - SEED_W) / 2)
  return {
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
          battleSprite: 'starter-fighter',
        },
      },
    ],
    'content/sprites.json': [
      {
        id: 'hero',
        asset: spriteAsset,
        label: '占位主角',
        layout: { kind: 'directional', framesPerDir: 3 },
      },
    ],
    'content/battle-sprites.json': [
      {
        id: 'starter-fighter',
        label: '占位主角战斗形象',
        asset: battleSpriteAsset,
        profile: {
          kind: 'player-fighter',
          frames: {
            idle: 0,
            dying: 1,
            dead: 2,
            defend: 3,
            hurt: 4,
            preMagic: 5,
            magic: 6,
            attackWindup: 7,
            attackRush: 8,
            attackStrike: 9,
          },
          castEffectBase: 15,
          attackEffectBase: 0,
        },
      },
    ],
    'content/tilesets.json': [
      { id: 'starter', name: '起始地形', category: 'outdoor', asset: tilesetAsset },
    ],
    'content/stamps.json': [],
    'content/skills.json': { skills: [], levelUp: {} },
    'content/items.json': [],
    'content/shared-scripts.json': {},
    'content/world-variables.json': {},
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
    'content/maps/start.json': formatProjectMap(buildSeedMap()),
    'assets/index.json': {
      version: 1,
      assets: {
        [colorAsset]: {
          kind: 'color-table',
          path: colorPath,
          mediaType: 'application/json',
          bytes: colorBytes.byteLength,
          sha256: colorHash,
          label: '项目标准色彩',
          origin: { kind: 'generated' },
        },
        [tilesetAsset]: {
          kind: 'tileset',
          path: tilesetPath,
          mediaType: 'application/vnd.type-pal.rle',
          bytes: tilesetRle.byteLength,
          sha256: tilesetHash,
          label: '起始地形',
          origin: { kind: 'generated' },
        },
        [spriteAsset]: {
          kind: 'sprite',
          path: spritePath,
          mediaType: 'application/vnd.type-pal.rle',
          bytes: spriteRle.byteLength,
          sha256: spriteHash,
          label: '占位主角',
          origin: { kind: 'generated' },
        },
        [battleSpriteAsset]: {
          kind: 'battle-sprite',
          path: battleSpritePath,
          mediaType: 'application/vnd.type-pal.rle',
          bytes: battleSpriteRle.byteLength,
          sha256: battleSpriteHash,
          label: '占位主角战斗形象',
          origin: { kind: 'generated' },
        },
      },
    },
    [colorPath]: palette,
    [tilesetPath]: tilesetRle,
    [spritePath]: spriteRle,
    [battleSpritePath]: battleSpriteRle,
    'manifest.json': {
      id,
      name: name.trim() || '新项目',
      contentVersion: CONTENT_VERSION,
      minimumSaveVersion: CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
      defaultEntryId: 'new-game',
      entryPoints: [
        {
          id: 'new-game',
          label: '新的故事',
          scene: 'start',
          startWorld: { party: ['hero'], money: 0, learnedSkills: {}, inventory: [] },
        },
      ],
      content: {
        actors: 'content/actors.json',
        skills: 'content/skills.json',
        items: 'content/items.json',
        locale: 'content/locale.json',
        sprites: 'content/sprites.json',
        battleSprites: 'content/battle-sprites.json',
        tilesets: 'content/tilesets.json',
        stamps: 'content/stamps.json',
        scenes: 'content/scenes/',
        maps: 'content/maps/index.json',
        sharedScripts: 'content/shared-scripts.json',
        worldVariables: 'content/world-variables.json',
      },
      assets: {
        catalog: 'assets/index.json',
        roles: { 'visual.standardColorTable': colorAsset },
      },
    },
  }
}

/** 当前 manifest 深拷；所有路径在进入项目边界前已经是项目相对路径。 */
export function relativizeManifest(m: CurrentManifest): CurrentManifest {
  return structuredClone(m)
}

/** 场景目录(manifest.content.scenes;规整为以 / 结尾)。 */
export function scenesDir(m: CurrentManifest): string {
  const dir = m.content.scenes ?? 'content/scenes/'
  return dir.endsWith('/') ? dir : `${dir}/`
}

/**
 * 克隆要复制的文件集:内容表(manifest.content 各文件,scenes 目录除外)+ scenes index + 每场景
 * + catalog 登记的全部素材。
 */
export function enumerateSeedFiles(
  manifest: CurrentManifest,
  sceneIds: string[],
  mapIndex?: MapIndexV1,
  catalog?: AssetCatalogV1,
): SeedFile[] {
  const out: SeedFile[] = []
  const json = (rel: string): void => {
    out.push({
      rel,
      src: rel,
      kind: 'json',
      size: 0,
      commitPhase: 'content',
    })
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
  // map index 本身已由 manifest.content 循环加入；这里补齐其登记的所有地图 JSON。
  for (const asset of mapIndex?.maps ?? []) json(asset.path)
  for (const [id, record] of Object.entries(catalog?.assets ?? {}))
    out.push({
      rel: record.path,
      src: record.path,
      kind: 'binary',
      size: record.bytes,
      commitPhase: 'binary',
      catalogAsset: {
        id,
        kind: record.kind,
        bytes: record.bytes,
        sha256: record.sha256,
        record,
      },
    })
  out.push({
    rel: manifest.assets.catalog,
    src: manifest.assets.catalog,
    kind: 'json',
    size: 0,
    commitPhase: 'catalog',
  })
  const paths = new Set<string>()
  for (const file of out) {
    if (paths.has(file.rel)) throw new Error(`克隆输出路径重复: ${file.rel}`)
    paths.add(file.rel)
  }
  return out
}
