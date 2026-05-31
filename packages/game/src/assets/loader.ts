import type {
  BattleField,
  Command,
  Enemy,
  EnemyObject,
  EnemyPosTable,
  EnemyTeam,
  EventFile,
  Item,
  Magic,
  ObjectMagicView,
  ObjectPoisonView,
  Palette,
  LevelUpMagicEntry,
  PlayerRoles,
  SceneEventObject,
  SceneObjects,
  Spell,
  Store,
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
  /**
   * D17a:lpEffectSprite(DATA.MKF chunk 10)全 85 frame —— 物理攻击命中特效 overlay。
   * state.battleAnim.overlay.frameIdx 取帧;缺(加载失败)→ undefined,overlay 不画。
   */
  effectSprite?: SpriteAsset
  /**
   * D17:FIRE.MKF magic sprite 表 —— 法术特效 overlay(kind='magic')。
   * key = chunk index(= magic.effect)。只含被 magics[].effect 引用的 chunk 子集。
   * state.battleAnim.overlays[].spriteChunk 取 chunk,frameIdx 取帧;缺 chunk → overlay 不画。
   */
  magicSprites: Map<number, SpriteAsset>
  /** M3 T29:战斗运行所需表 — dev panel / startBattle 用。 */
  enemies: Enemy[]
  /** M5.B-w2.a:OBJECT_ENEMY 段 153 条(scriptOnReady / scriptOnTurnStart 等 AI hook)。 */
  enemyObjects: EnemyObject[]
  enemyTeams: EnemyTeam[]
  battleFields: BattleField[]
  /** M3.5:ENEMYPOS table(DATA.MKF chunk 13)— per enemy-count layout 真值。 */
  enemyPos: EnemyPosTable
  /**
   * D17a:rgwBattleEffectIndex[10][2] flat(DATA.MKF chunk 11)— player 物理攻击命中特效
   * 帧基号 `[battleSpriteId][1]*3`(fight.c:2055)。
   */
  battleEffectIndex: number[]
  items: Item[]
  spells: Spell[]
  magics: Magic[]
  /** E 类 0x42 SimulateMagic:完整 rgObject 的 magic-union 视图(object-magics.json)。
   *  投掷物 scriptOnThrow 用 0x42 解析 magic object id(可低至 24,不在 spells.json [296..397])。 */
  objectMagics: ObjectMagicView[]
  /** object-poisons.json —— 0x28 apply poison 解析 wEnemyScript。 */
  objectPoisons: ObjectPoisonView[]
  /** 2026-05-29:商店表(DATA.MKF chunk 0)— 买菜单 opcode 0x0026 按 operand[0] 取。 */
  stores: Store[]
  /** M5.6 W0.d:SPRITEUI 71 frame(DATA.MKF chunk 9)— menu box 9-slice 用前 18 个(style 0/1)。 */
  uiSpriteFrames: IndexedImage[]
  /**
   * M5.6 T10b:BALL.MKF 物品图标(audit 第 1 漏洞已修)— 251 chunk → IndexedImage map。
   * key = chunkIndex(对应 OBJECT.item.wBitmap,sdlpal itemmenu.c:201 真值)。
   * InventoryMenu / EquipMenu / 商店 / addItem dialog 用。
   */
  itemIcons: Map<number, IndexedImage>
  /**
   * M5.6 T10d:DATA.MKF chunk 14 LevelUpExp[100] WORD × 100 — sdlpal `global.h::rgLevelUpExp`。
   * 用于 PlayerStatus 显示 RoleNextExp(等级 N 升至 N+1 所需累积经验阈值)。
   */
  levelUpExp: number[]
  /**
   * DATA.MKF chunk 6 LEVELUPMAGIC_ALL — sdlpal `global.h::lprgLevelUpMagic`(20 级 × 5 角色 ×
   * {wLevel,wMagic})。战斗胜利升级时按 `[j][roleIdx].level <= 新等级` 学新法术(battle.c:1300-1321)。
   */
  levelUpMagic: LevelUpMagicEntry[][]
}

interface UiSpriteManifest {
  chunkIndex: number
  sdlpalName: string
  frameCount: number
  frames: Array<{ index: number; width: number; height: number }>
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
  const scene = await fetchJson<SceneObjects & { mapNum: number }>(
    `${BASE}/data/scene/${sceneId}.json`,
  )
  const [
    tilemap,
    palette,
    events,
    playerRoles,
    enemies,
    enemyObjects,
    enemyTeams,
    battleFields,
    enemyPos,
    battleEffectIndex,
    items,
    spells,
    magics,
    objectMagics,
    objectPoisons,
    levelUpExp,
    levelUpMagic,
    stores,
  ] = await Promise.all([
    fetchJson<Tilemap & { tilesetFiles?: string[] }>(`${BASE}/data/tilemap/${scene.mapNum}.json`),
    fetchJson<Palette>(`${BASE}/data/palette/0.json`),
    fetchJson<EventFile>(`${BASE}/events/scene-${padded}.json`),
    fetchJson<PlayerRoles>(`${BASE}/data/player-roles.json`),
    fetchJson<Enemy[]>(`${BASE}/data/enemies.json`),
    fetchJson<EnemyObject[]>(`${BASE}/data/enemy-objects.json`),
    fetchJson<EnemyTeam[]>(`${BASE}/data/enemy-teams.json`),
    fetchJson<BattleField[]>(`${BASE}/data/battle-fields.json`),
    fetchJson<EnemyPosTable>(`${BASE}/data/enemy-pos.json`),
    fetchJson<number[]>(`${BASE}/data/battle-effect-index.json`),
    fetchJson<Item[]>(`${BASE}/data/items.json`),
    fetchJson<Spell[]>(`${BASE}/data/spells.json`),
    fetchJson<Magic[]>(`${BASE}/data/magic.json`),
    fetchJson<ObjectMagicView[]>(`${BASE}/data/object-magics.json`),
    fetchJson<ObjectPoisonView[]>(`${BASE}/data/object-poisons.json`),
    fetchJson<number[]>(`${BASE}/data/level-up-exp.json`),
    fetchJson<LevelUpMagicEntry[][]>(`${BASE}/data/level-up-magic.json`),
    fetchJson<Store[]>(`${BASE}/data/stores.json`),
  ])

  // P1: tilesetFiles[] 内现在是 `world/tileset/map-{mapNum}/tile-{XXXX}.png` 格式,
  // ${BASE}/images/${name} 仍能拼对(name 含子目录路径)。
  const tileFiles = tilemap.tilesetFiles ?? []
  const tilePngs = await Promise.all(tileFiles.map((name) => fetchPng(`${BASE}/images/${name}`)))
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
  // M5.6 T18 Step 7:splash fallback (DOS build) 用 MGO chunk 71/73
  //   - 71 = SPRITENUM_SPLASH_TITLE(sdlpal main.c:44 0x47)— 标题 RLE
  //   - 73 = SPRITENUM_SPLASH_CRANE(main.c:45 0x49)— 仙鹤 sprite group 8 帧
  // 不大(~50KB),启动一次性 fetch,无论 ?build flag 都加载(WIN95 build mp4 fallback
  // 失败时也能切到 dos 路径)。
  spriteIds.add(71)
  spriteIds.add(73)
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
      } catch (err) {
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
    fetchJson<BattleSpritesManifest>(`${BASE}/data/battle-sprites.json`).catch((err: unknown) => {
      console.warn('assets: battle-sprites.json 缺失,跳过战斗精灵:', err)
      return { sprites: [] }
    }),
    fetchJson<BattleBgsManifest>(`${BASE}/data/battle-bgs.json`).catch((err: unknown) => {
      console.warn('assets: battle-bgs.json 缺失,跳过战斗背景:', err)
      return { count: 0, ids: [] }
    }),
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
      } catch (err) {
        console.warn(`assets: battle sprite ${entry.kind}-${entry.id} load failed, skip:`, err)
      }
    }),
  )

  const battleBgs = new Map<number, BattleBgAsset>()
  await Promise.all(
    battleBgsManifest.ids.map(async (id) => {
      try {
        const png = await fetchPng(`${BASE}/images/battle/bg/${id.toString().padStart(3, '0')}.png`)
        battleBgs.set(id, {
          width: png.width,
          height: png.height,
          indices: png.indices,
        })
      } catch (err) {
        console.warn(`assets: battle bg ${id} load failed, skip:`, err)
      }
    }),
  )

  // ── D17a:lpEffectSprite(DATA.MKF chunk 10)加载 —— 物理攻击命中特效 overlay ───
  let effectSprite: SpriteAsset | undefined
  try {
    const meta = await fetchJson<{
      frameCount: number
      frames: Array<{ index: number; width: number; height: number }>
    }>(`${BASE}/data/magic-sprite/effect.json`)
    const frames = await Promise.all(
      meta.frames.map((f) =>
        fetchPng(`${BASE}/images/magic/frame-${f.index.toString().padStart(2, '0')}.png`).catch(
          (err: unknown) => {
            console.warn(`assets: effect sprite frame ${f.index} load failed:`, err)
            return undefined
          },
        ),
      ),
    )
    effectSprite = {
      frames: frames.map((f) =>
        f
          ? { width: f.width, height: f.height, indices: f.indices, opaque: f.opaque }
          : // 缺帧占位 1×1 透明(保 frameIdx 与 chunk 对齐)
            { width: 1, height: 1, indices: new Uint8Array(1), opaque: new Uint8Array(1) },
      ),
    }
  } catch (err) {
    console.warn('assets: magic-sprite/effect.json 缺失,战斗命中特效 overlay 将不画:', err)
  }

  // ── D17:FIRE.MKF magic sprite 加载 —— 法术特效 overlay(kind='magic') ─────────
  //   fire-sprites.json = { chunkCount, chunks:[{chunkIndex, frameCount, frames:[{index,width,height}]}] }
  //   帧 PNG: images/magic/fire-NN/frame-MM.png(NN/MM 两位补零)。
  //   只加载被 magics[].effect 引用的 chunk 子集(去重)避免全量 55 chunk fetch 慢;
  //   每 chunk key = chunkIndex(= magic.effect)。容错:缺帧占位 1×1 透明。
  const magicSprites = new Map<number, SpriteAsset>()
  try {
    const fireMeta = await fetchJson<{
      chunkCount: number
      chunks: Array<{
        chunkIndex: number
        frameCount: number
        frames: Array<{ index: number; width: number; height: number }>
      }>
    }>(`${BASE}/data/fire-sprites.json`)
    // 被 magics 引用的 effect chunk 去重(magic.effect=0 也是合法 chunk index)。
    const usedEffects = new Set<number>(magics.map((m) => m.effect))
    const chunksToLoad = fireMeta.chunks.filter(
      (c) => usedEffects.has(c.chunkIndex) && c.frameCount > 0,
    )
    await Promise.all(
      chunksToLoad.map(async (chunk) => {
        try {
          const nn = chunk.chunkIndex.toString().padStart(2, '0')
          const frames = await Promise.all(
            chunk.frames.map((f) =>
              fetchPng(
                `${BASE}/images/magic/fire-${nn}/frame-${f.index.toString().padStart(2, '0')}.png`,
              ).catch((err: unknown) => {
                console.warn(`assets: magic sprite fire-${nn} frame ${f.index} load failed:`, err)
                return undefined
              }),
            ),
          )
          magicSprites.set(chunk.chunkIndex, {
            frames: frames.map((f) =>
              f
                ? { width: f.width, height: f.height, indices: f.indices, opaque: f.opaque }
                : // 缺帧占位 1×1 透明(保 frameIdx 与 chunk 对齐)
                  { width: 1, height: 1, indices: new Uint8Array(1), opaque: new Uint8Array(1) },
            ),
          })
        } catch (err) {
          console.warn(`assets: magic sprite chunk ${chunk.chunkIndex} load failed, skip:`, err)
        }
      }),
    )
  } catch (err) {
    console.warn('assets: fire-sprites.json 缺失,法术特效 overlay 将不画:', err)
  }

  // ── M5.6 W0.d:SPRITEUI 加载(menu box 9-slice 用前 18 frame) ─────────────
  const uiSpriteFrames: IndexedImage[] = []
  try {
    const meta = await fetchJson<UiSpriteManifest>(`${BASE}/data/ui-sprite/spriteui.json`)
    const frames = await Promise.all(
      meta.frames.map((f) =>
        fetchPng(`${BASE}/images/ui/frame-${f.index.toString().padStart(2, '0')}.png`).catch(
          (err: unknown) => {
            console.warn(`assets: ui-sprite frame ${f.index} load failed:`, err)
            return undefined
          },
        ),
      ),
    )
    for (const f of frames) {
      if (f) uiSpriteFrames.push(f)
    }
  } catch (err) {
    console.warn('assets: ui-sprite/spriteui.json 缺失,menu box 渲染将抛 frame missing:', err)
  }

  // ── M5.6 T10b:BALL.MKF 物品图标加载 ────────────────────────────────────────
  // 索引 manifest = items-icons.json(pal-extract BALL RLE decode 输出),
  // 按 chunkIndex 映射到 IndexedImage,InventoryMenu / EquipMenu / 商店 / addItem 用。
  const itemIcons = new Map<number, IndexedImage>()
  try {
    const manifest = await fetchJson<{
      count: number
      icons: Array<{ chunkIndex: number; width: number; height: number }>
    }>(`${BASE}/data/items-icons.json`)
    await Promise.all(
      manifest.icons.map(async (icon) => {
        try {
          const png = await fetchPng(
            `${BASE}/images/items/${icon.chunkIndex.toString().padStart(3, '0')}.png`,
          )
          itemIcons.set(icon.chunkIndex, png)
        } catch (err) {
          console.warn(`assets: item icon ${icon.chunkIndex} load failed, skip:`, err)
        }
      }),
    )
  } catch (err) {
    console.warn('assets: items-icons.json 缺失,InventoryMenu 物品图标不显示:', err)
  }

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
    effectSprite,
    magicSprites,
    enemies,
    enemyObjects,
    enemyTeams,
    battleFields,
    enemyPos,
    battleEffectIndex,
    items,
    spells,
    magics,
    objectMagics,
    objectPoisons,
    stores,
    uiSpriteFrames,
    itemIcons,
    levelUpExp,
    levelUpMagic,
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
  /**
   * P0.e: scene 进入即跑的脚本入口 label(对应 sdlpal SCENE.wScriptOnEnter)。
   * undefined = 该 scene 无 enter script(135 scenes without onEnterLabel)。
   * loadScene 不传 partyStart 时自动跑 wScriptOnEnter 段设 party 位置。
   */
  onEnterLabel?: string
  /**
   * 归隐脱出脚本入口 label(对应 sdlpal SCENE.wScriptOnTeleport)。
   * undefined = 该 scene 无 teleport script(城镇/野外大多;dungeon 如 scene 41/163/226 有)。
   * opcode 0x38 teleportOut 据此跑 PAL_RunTriggerScript(归隐符/瞬移)。
   */
  onTeleportLabel?: string
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
