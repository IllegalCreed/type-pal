import type {
  BattleField,
  Command,
  Enemy,
  EnemyPosTable,
  EnemyTeam,
  EventFile,
  Item,
  Magic,
  Palette,
  PlayerRoles,
  SceneEventObject,
  SceneObjects,
  Spell,
  Tilemap,
} from '@type-pal/shared'
import type { BattleBgAsset } from '../present/battle/draw-battle-bg.js'
import type { SpriteAsset } from '../present/battle/draw-battle-sprites.js'
import { decodePngToIndices, type IndexedImage } from './png.js'

const BASE = '/extracted'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`assets: fetch ${url} failed (${res.status})`)
  }
  return (await res.json()) as T
}

async function fetchPng(url: string): Promise<IndexedImage> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`assets: fetch ${url} failed (${res.status})`)
  const blob = await res.blob()
  return decodePngToIndices(blob)
}

export interface LoadedAssets {
  tilemap: Tilemap & { tilesetFiles?: string[] }
  palette: Palette
  scene: SceneObjects
  events: EventFile
  playerRoles: PlayerRoles
  tileImages: Map<number, IndexedImage>
  characterSprites: Map<number, { frames: IndexedImage[]; anchorX: number; anchorY: number }>
  /** M3 T25:战斗精灵 — key = `${kind}-${id}`(kind = 'player' | 'enemy')。 */
  battleSprites: Map<string, SpriteAsset>
  /** M3 T25:战斗背景 — key = FBP chunk id(= BattleField.id)。 */
  battleBgs: Map<number, BattleBgAsset>
  /** M3 T29:战斗运行所需表 — dev panel / startBattle 用。 */
  enemies: Enemy[]
  enemyTeams: EnemyTeam[]
  battleFields: BattleField[]
  /** M3.5:ENEMYPOS table(DATA.MKF chunk 13)— per enemy-count layout 真值。 */
  enemyPos: EnemyPosTable
  items: Item[]
  spells: Spell[]
  magics: Magic[]
}

interface BattleSpriteManifestEntry {
  index: number
  width: number
  height: number
}
interface BattleSpriteMeta {
  battleSpriteId: number
  kind: 'player' | 'enemy'
  frames: BattleSpriteManifestEntry[]
}
interface BattleSpritesManifest {
  sprites: Array<{ kind: 'player' | 'enemy'; id: number }>
}
interface BattleBgsManifest {
  count: number
  ids: number[]
}

export async function loadAll(sceneId: number): Promise<LoadedAssets> {
  const padded = sceneId.toString().padStart(3, '0')
  // M4 P3.T3: scene→mapNum→tilemap 链:先 fetch scene JSON 拿到 mapNum,再 fetch tilemap by mapNum。
  const scene = await fetchJson<SceneObjects & { mapNum: number }>(`${BASE}/data/scene/${sceneId}.json`)
  const [
    tilemap, palette, events, playerRoles,
    enemies, enemyTeams, battleFields, enemyPos, items, spells, magics,
  ] = await Promise.all([
    fetchJson<Tilemap & { tilesetFiles?: string[] }>(`${BASE}/data/tilemap/${scene.mapNum}.json`),
    fetchJson<Palette>(`${BASE}/data/palette/0.json`),
    fetchJson<EventFile>(`${BASE}/events/scene-${padded}.json`),
    fetchJson<PlayerRoles>(`${BASE}/data/player-roles.json`),
    fetchJson<Enemy[]>(`${BASE}/data/enemies.json`),
    fetchJson<EnemyTeam[]>(`${BASE}/data/enemy-teams.json`),
    fetchJson<BattleField[]>(`${BASE}/data/battle-fields.json`),
    fetchJson<EnemyPosTable>(`${BASE}/data/enemy-pos.json`),
    fetchJson<Item[]>(`${BASE}/data/items.json`),
    fetchJson<Spell[]>(`${BASE}/data/spells.json`),
    fetchJson<Magic[]>(`${BASE}/data/magic.json`),
  ])

  // P1: tilesetFiles[] 内现在是 `world/tileset/map-{mapNum}/tile-{XXXX}.png` 格式,
  // ${BASE}/images/${name} 仍能拼对(name 含子目录路径)。
  const tileFiles = tilemap.tilesetFiles ?? []
  const tilePngs = await Promise.all(
    tileFiles.map((name) => fetchPng(`${BASE}/images/${name}`)),
  )
  const tileImages = new Map<number, IndexedImage>()
  tileFiles.forEach((name, i) => {
    const m = /tile-(\d+)\.png$/.exec(name)
    if (m) tileImages.set(Number(m[1]), tilePngs[i]!)
  })

  // 队长精灵 —— 真解析自 player-roles.json (DATA.MKF chunk 3, PLAYERROLES.rgwSpriteNum[0])。
  // M2 切片硬编码 = 2 已删,改读真值;多人队伍切换留 M5。
  const leader = playerRoles.roles[0]
  if (!leader) throw new Error('assets: player-roles.json roles[0] missing')
  const spriteIds = new Set<number>([leader.spriteNum])
  for (const eo of scene.eventObjects) {
    if (eo.spriteNum > 0) spriteIds.add(eo.spriteNum)
  }
  const characterSprites = new Map<
    number,
    { frames: IndexedImage[]; anchorX: number; anchorY: number }
  >()
  await Promise.all(
    [...spriteIds].map(async (id) => {
      try {
        const meta = await fetchJson<{
          spriteId: number
          frames: { index: number; width: number; height: number }[]
        }>(`${BASE}/data/sprite/${id}.json`)
        const frames = await Promise.all(
          meta.frames.map((f) =>
            fetchPng(
              `${BASE}/images/world/npc/${id}/frame-${f.index.toString().padStart(2, '0')}.png`,
            ),
          ),
        )
        const first = frames[0]
        characterSprites.set(id, {
          frames,
          anchorX: first ? Math.floor(first.width / 2) : 0,
          anchorY: first ? first.height : 0,
        })
      }
      catch (err) {
        console.warn(`assets: sprite ${id} load failed, skip:`, err)
      }
    }),
  )

  // ── 战斗资源(M3 T25) ──────────────────────────────────────────
  // 走 manifest:
  //   - battle-sprites.json:列出 (kind, id) 集合,逐条加 battle-sprite-*.json + PNG
  //   - battle-bgs.json:列出有效 FBP chunk id 集合,逐条加 battle-bg-NNN.png
  // 失败的 entry warn + skip(不抛错,T28 整合时再修)。
  const [battleSpritesManifest, battleBgsManifest] = await Promise.all([
    fetchJson<BattleSpritesManifest>(`${BASE}/data/battle-sprites.json`).catch(
      (err: unknown) => {
        console.warn('assets: battle-sprites.json 缺失,跳过战斗精灵:', err)
        return { sprites: [] }
      },
    ),
    fetchJson<BattleBgsManifest>(`${BASE}/data/battle-bgs.json`).catch(
      (err: unknown) => {
        console.warn('assets: battle-bgs.json 缺失,跳过战斗背景:', err)
        return { count: 0, ids: [] }
      },
    ),
  ])

  const battleSprites = new Map<string, SpriteAsset>()
  await Promise.all(
    battleSpritesManifest.sprites.map(async (entry) => {
      try {
        const meta = await fetchJson<BattleSpriteMeta>(
          `${BASE}/data/battle-sprite/${entry.kind}/${entry.id}.json`,
        )
        const frames = await Promise.all(
          meta.frames.map((f) =>
            fetchPng(
              `${BASE}/images/battle/${entry.kind}/${entry.id}/frame-${f.index
                .toString()
                .padStart(2, '0')}.png`,
            ),
          ),
        )
        battleSprites.set(`${entry.kind}-${entry.id}`, {
          frames: frames.map((f) => ({
            width: f.width,
            height: f.height,
            indices: f.indices,
            opaque: f.opaque,
          })),
        })
      }
      catch (err) {
        console.warn(
          `assets: battle sprite ${entry.kind}-${entry.id} load failed, skip:`,
          err,
        )
      }
    }),
  )

  const battleBgs = new Map<number, BattleBgAsset>()
  await Promise.all(
    battleBgsManifest.ids.map(async (id) => {
      try {
        const png = await fetchPng(
          `${BASE}/images/battle/bg/${id.toString().padStart(3, '0')}.png`,
        )
        battleBgs.set(id, {
          width: png.width,
          height: png.height,
          indices: png.indices,
        })
      }
      catch (err) {
        console.warn(`assets: battle bg ${id} load failed, skip:`, err)
      }
    }),
  )

  return {
    tilemap,
    palette,
    scene,
    events,
    playerRoles,
    tileImages,
    characterSprites,
    battleSprites,
    battleBgs,
    enemies,
    enemyTeams,
    battleFields,
    enemyPos,
    items,
    spells,
    magics,
  }
}

/**
 * 按调色板编号 fetch palette JSON(M4 P3.T2 setPalette opcode runtime)。
 * URL: /extracted/data/palette/{id}.json —— 与 loadAll 内 palette/0.json 路径同模式。
 */
export async function fetchPalette(id: number): Promise<Palette> {
  return fetchJson<Palette>(`${BASE}/data/palette/${id}.json`)
}

// ── Scene 资源 lazy 加载缓存(M3.5 / D33) ─────────────────────────────

export interface SceneAssets {
  sceneId: number
  tilemap: Tilemap
  palette: Palette
  eventObjects: SceneEventObject[]
  npcSprites: Map<number, SpriteAsset>
  /** P3.T1: per-scene event bytecode commands(lazy load from events/scene-NNN.json). */
  eventCommands: Command[]
  /** P3.T1: label string → command index map(for loadEventFromNpc goto lookup). */
  labelMap: Record<string, number>
}

export type SceneFetcher = (sceneId: number) => Promise<SceneAssets>

/**
 * Scene 资源 lazy 加载缓存(D33)。
 *
 * M3.5 简版不做 LRU eviction(只 2-3 scene 切换,< 10MB 可接受);
 * M5 全场景时加 LRU。
 *
 * 真 SceneFetcher 实现(从 `/extracted/data/scene-N.json` + tilemap-N.json +
 * palette + sprites 各 PNG fetch)写在 bootstrap.ts(T16+ 用),不在 loader.ts。
 * loader.ts 只管 cache 本身。
 */
export class SceneAssetsCache {
  private readonly cache = new Map<number, SceneAssets>()

  constructor(private readonly fetcher: SceneFetcher) {}

  async loadScene(sceneId: number): Promise<SceneAssets> {
    let cached = this.cache.get(sceneId)
    if (!cached) {
      cached = await this.fetcher(sceneId)
      this.cache.set(sceneId, cached)
    }
    return cached
  }
}
