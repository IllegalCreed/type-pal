import type { SceneEventObject, Tilemap } from '@type-pal/shared'
import { decodePngToIndices, type IndexedImage } from '../assets/png.js'
import { loadAll, SceneAssetsCache, type SceneAssets, type SceneFetcher } from '../assets/loader.js'
import { createCommandBus } from '../core/command-bus.js'
import { createInitialGameState, npcFromEventObject } from '../core/game-state.js'
import { buildLabelMap } from '../core/event-system.js'
import { setSceneContext } from '../core/scene-system.js'
import { KeyboardInputSource } from './input.js'
import { startRafLoop, type LoopContext } from './main-loop.js'
import { createFramebuffer } from '../present/framebuffer.js'
import {
  presentFrame,
  presentBattleFrame,
  flushToCanvas,
  type PresentContext,
} from '../present/present.js'
import { BattlePresent, type BattleAssets } from '../present/battle/present-battle.js'
import type { SpriteAsset } from '../present/battle/draw-battle-sprites.js'
import { setupDevPanel, type BattleFixturesData, type SceneJumpsData } from './dev-panel.js'
import battleFixturesRaw from '../data/battle-fixtures.json' with { type: 'json' }
import sceneJumpsRaw from '../data/scene-jumps.json' with { type: 'json' }

// JSON 静态 import 的 TS 类型推断会把每条 fixture 推成具体 key 集合(eg. fixture-zh1
// 没 "1" → 推 "1": undefined),与 BattleFixturesData 的 Record<string, ...> 不严格匹配。
// 这里显式 cast —— battle-fixtures.json 的 schema 由 BattleFixture 定义,运行时合法。
const battleFixtures = battleFixturesRaw as unknown as BattleFixturesData
// 同模式 cast —— scene-jumps.json schema 由 SceneJump 定义。
const sceneJumps = sceneJumpsRaw as unknown as SceneJumpsData

const SCENE_ID = 1

export function showError(canvas: HTMLCanvasElement, msg: string): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#400'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#f88'
  ctx.font = '10px monospace'
  ctx.fillText(msg, 8, 32)
}

export async function bootstrap(canvas: HTMLCanvasElement): Promise<void> {
  const assets = await loadAll(SCENE_ID)

  const {
    tilemap, palette, scene, events, playerRoles, tileImages, characterSprites,
    battleSprites, battleBgs, enemies, enemyTeams, battleFields, items, spells, magics,
  } = assets

  // 队长精灵号 —— 从 player-roles.json (DATA.MKF chunk 3 真解) 取真值。
  // M3 T9 之前 M2 硬编码 = 2,现在改读 PlayerRoles.roles[0].spriteNum(实测 = 2);
  // 多人队伍切换留 M5。
  const leader = playerRoles.roles[0]
  if (!leader) throw new Error('bootstrap: playerRoles.roles[0] missing')
  const partyLeaderSpriteId = leader.spriteNum

  // party 起始位置 —— 真原版起始由 onEnter 脚本 setPartyPos opcode 设;M2 raw skip 后不自动设。
  // 实施时若 dev 验证位置不对,改这两个数字。
  const PARTY_START = { col: 32, row: 24, facing: 'down' as const }
  const gs = createInitialGameState(PARTY_START)
  gs.npcs = scene.eventObjects.map(npcFromEventObject)

  const segment = events.segments[0]
  if (!segment) throw new Error('events.json 无 segment[0]')
  const eventCommands = segment.commands
  const labelMap = buildLabelMap(eventCommands)

  // onEnter 装载
  // M3.5:dev verify / L2 Playwright 加 ?skip-intro=1 URL flag 跳 onEnter,避免
  // 每次都按 Space 过开场对话(scene 1 是吕奇劫主角剧情)。default 仍跑 onEnter
  // 保持真原版游戏首屏行为。
  const skipIntro = new URLSearchParams(window.location.search).has('skip-intro')
  if (scene.onEnterLabel && !skipIntro) {
    const ip = labelMap[scene.onEnterLabel]
    if (ip !== undefined) {
      gs.eventCursor = { commands: eventCommands, labelMap, ip }
      gs.mode = 'event'
    }
  }

  // sprite 装配
  const partyData = characterSprites.get(partyLeaderSpriteId)
  if (!partyData) throw new Error(`队长 sprite (id ${partyLeaderSpriteId}) 加载失败`)
  const partyFirst = partyData.frames[0]
  if (!partyFirst) throw new Error('队长 sprite 无 frame[0]')
  const partySprite = {
    width: partyFirst.width,
    height: partyFirst.height,
    indices: partyFirst.indices,
    anchorX: partyData.anchorX,
    anchorY: partyData.anchorY,
  }
  const npcSprites = new Map<number, typeof partySprite>()
  for (const [id, data] of characterSprites) {
    const f = data.frames[0]
    if (!f) continue
    npcSprites.set(id, {
      width: f.width,
      height: f.height,
      indices: f.indices,
      anchorX: data.anchorX,
      anchorY: data.anchorY,
    })
  }

  const fb = createFramebuffer()
  const canvasCtx = canvas.getContext('2d')
  if (!canvasCtx) throw new Error('canvas 2d context 不可用')

  // T17:per-scene tileImages 路由 —— 不动 SceneAssets schema,closure only。
  // 首屏 scene 的 tile bitmap 进 by-sceneId map;dev jump 时 sceneFetcher 内补 fetch
  // 新 scene 的 tile PNG(cache hit 跳过),applySceneAssetsToPresent mutate currentSceneId,
  // presentCtx.tileImages.get 自动路由到对应 scene 的 map。
  const tileImagesBySceneId = new Map<number, Map<number, IndexedImage>>()
  tileImagesBySceneId.set(SCENE_ID, tileImages)
  let currentSceneId = SCENE_ID

  const presentCtx: PresentContext = {
    tilemap,
    tileImages: { get: (i) => tileImagesBySceneId.get(currentSceneId)?.get(i) },
    partySprite,
    npcSprites,
  }

  // M3 T28/T29:战斗一帧装配 —— BattlePresent 持有 floating nums 跨帧状态;
  // BattleAssets 注入资源表(sprites/bgs/items/spells/playerRoles)。
  const battlePresent = new BattlePresent()
  const battleAssets: BattleAssets = {
    battleSprites,
    battleBgs,
    playerRoles,
    spells,
    items,
  }

  const bus = createCommandBus()
  const input = new KeyboardInputSource(window)

  const loopCtx: LoopContext = {
    gs,
    bus,
    input,
    tilemap,
    eventCommands,
    labelMap,
    onPresent: (drained) => {
      // 按 gs.mode 路由 present:battle → presentBattleFrame(消费 commands 进 floating nums);
      // 否则走 explore/event 路径 presentFrame(commands 由 M2 EventSystem 直接消费 GameState)
      if (!presentBattleFrame(fb, gs, battlePresent, battleAssets, drained)) {
        presentFrame(fb, gs, presentCtx)
      }
      flushToCanvas(fb, canvasCtx, palette)
    },
  }

  // M3.5 T17:per-scene lazy fetcher(D33)。dev jump 时按需 fetch 新 scene 的
  // scene-N.json + tilemap-N.json + 新 scene NPC sprite(missing 才补 fetch)+
  // 新 scene tile PNG(cache miss 才 fetch,写进 tileImagesBySceneId)。
  // 简版接合点(palette 留 M5):
  //  - palette:跨 scene 切真色板要 setPalette opcode runtime 触发,留 M5;此处用首屏 palette。
  //    新 scene 渲染时仍用首屏 palette,visual color 可能不对(已知)。
  //  - npcSprites:**真有跨 scene 差异**(scene 1 有 11 个 sprite,scene 16 有 7 个不同 sprite)。
  //    closure 持的 `npcSprites` 是 SpriteImage(带 anchor)装好的;新 scene 缺的 sprite,
  //    在 sceneFetcher 里按需 fetch sprite-N.json + 各 frame PNG,塞回 closure 的 npcSprites。
  //  - tile PNG:loader.loadAll 只 fetch 首屏 scene 的 tilesetFiles。sceneFetcher 内
  //    fetchSceneTileImages 复刻同模式,写进 by-sceneId map(cache,首屏 / 已 fetch 跳过)。
  const BASE = '/extracted'

  async function fetchMissingSprite(id: number): Promise<void> {
    if (npcSprites.has(id)) return
    try {
      const metaRes = await fetch(`${BASE}/data/sprite-${id}.json`)
      if (!metaRes.ok) throw new Error(`sprite-${id}.json fetch failed (${metaRes.status})`)
      const meta = (await metaRes.json()) as {
        spriteId: number
        frames: { index: number; width: number; height: number }[]
      }
      const frames = await Promise.all(
        meta.frames.map(async (f) => {
          const r = await fetch(
            `${BASE}/images/sprite-${id}-frame-${f.index.toString().padStart(2, '0')}.png`,
          )
          if (!r.ok) throw new Error(`sprite-${id}-frame-${f.index} png fetch failed (${r.status})`)
          return decodePngToIndices(await r.blob())
        }),
      )
      const first = frames[0]
      if (!first) return
      npcSprites.set(id, {
        width: first.width,
        height: first.height,
        indices: first.indices,
        anchorX: Math.floor(first.width / 2),
        anchorY: first.height,
      })
    }
    catch (err) {
      console.warn(`[bootstrap] scene-jump sprite ${id} fetch failed, skip:`, err)
    }
  }

  // 按需补 fetch 新 scene 的 tile PNG → 写进 tileImagesBySceneId(同 sceneId cache hit 跳过)。
  // 复用 loader.loadAll 同模式:tilesetFiles 列表 → 每张 PNG fetch + decode → regex 取 tile id。
  async function fetchSceneTileImages(
    sceneId: number,
    tilemapJson: Tilemap & { tilesetFiles?: string[] },
  ): Promise<void> {
    if (tileImagesBySceneId.has(sceneId)) return
    const tileFiles = tilemapJson.tilesetFiles ?? []
    const tilePngs = await Promise.all(
      tileFiles.map(async (name) => {
        const r = await fetch(`${BASE}/images/${name}`)
        if (!r.ok) throw new Error(`tile png fetch failed: ${name} (${r.status})`)
        return decodePngToIndices(await r.blob())
      }),
    )
    const map = new Map<number, IndexedImage>()
    tileFiles.forEach((name, i) => {
      const m = /tile-scene-\d+-(\d+)\.png/.exec(name)
      if (m) map.set(Number(m[1]), tilePngs[i]!)
    })
    tileImagesBySceneId.set(sceneId, map)
  }

  const sceneFetcher: SceneFetcher = async (sceneId: number): Promise<SceneAssets> => {
    const [sceneJson, tilemapJson] = await Promise.all([
      fetch(`${BASE}/data/scene-${sceneId}.json`).then((r) => {
        if (!r.ok) throw new Error(`scene-${sceneId}.json fetch failed (${r.status})`)
        return r.json() as Promise<{ eventObjects: SceneEventObject[] }>
      }),
      fetch(`${BASE}/data/tilemap-${sceneId}.json`).then((r) => {
        if (!r.ok) throw new Error(`tilemap-${sceneId}.json fetch failed (${r.status})`)
        return r.json() as Promise<Tilemap & { tilesetFiles?: string[] }>
      }),
    ])

    // 新 scene NPC sprite 补 fetch(已有的跳过)。fetch 之后写进 closure 的 npcSprites,
    // applySceneAssetsToPresent 里 presentCtx.npcSprites 是同一个引用,无需二次 mutate。
    const newSpriteIds = new Set<number>()
    for (const eo of sceneJson.eventObjects) {
      if (eo.spriteNum > 0) newSpriteIds.add(eo.spriteNum)
    }
    // tile PNG 与 sprite 并行 fetch — tileImages 切换在 applySceneAssetsToPresent
    // 通过 currentSceneId 路由(写进 closure 的 tileImagesBySceneId)。
    await Promise.all([
      ...[...newSpriteIds].map((id) => fetchMissingSprite(id)),
      fetchSceneTileImages(sceneId, tilemapJson),
    ])

    // SceneAssets.npcSprites 当前没人消费(loadScene 只 mutate gs;present 走 closure 的
    // npcSprites)。M3.5 简版传空 map,接口形式上满足即可;M5 把 sprite 数据装这里,
    // present 切到从 sceneAssets 取。
    return {
      sceneId,
      tilemap: tilemapJson,
      palette,
      eventObjects: sceneJson.eventObjects,
      npcSprites: new Map<number, SpriteAsset>(),
    }
  }
  const sceneAssetsCache = new SceneAssetsCache(sceneFetcher)

  /**
   * T17 重做核心:scene 切换后同步 presentCtx + scene-system 的 tilemap 引用。
   * 不调这个,loadScene 改了 gs.npcs/party/camera 但 canvas 仍画首屏 tilemap。
   *
   * 1. presentCtx.tilemap = 新 tilemap(下一帧 drawTilemap 取新 cells)
   * 2. currentSceneId 切到新 scene:presentCtx.tileImages.get 自动路由到对应 scene 的
   *    tile bitmap map(sceneFetcher 已 fetch 进 tileImagesBySceneId)。
   * 3. setSceneContext 重置:scene-system tick 用新 tilemap.width/height 做 walkability + camera clamp
   * 4. npcSprites:closure 同一引用,sceneFetcher 里已补 fetch missing sprite,无需再动
   * 5. palette / eventCommands:首屏保留(留 M5)
   */
  function applySceneAssetsToPresent(sceneAssets: SceneAssets): void {
    presentCtx.tilemap = sceneAssets.tilemap
    currentSceneId = sceneAssets.sceneId
    setSceneContext({
      tilemap: sceneAssets.tilemap,
      eventCommands,
      labelMap,
    })
  }

  // M3 T29:dev panel(仅 DEV;生产构建 dead-code)。快捷键 B 弹 fixture picker → 启战。
  // M3.5 T16:加 sceneJumps,picker 内多一段 scene jump 列表(T17 接真 loadScene)。
  // T17 重做:onSceneChanged callback 注入 — dev jump 后 dev-panel 回调它,
  //          bootstrap 在回调里 mutate presentCtx 让 canvas 重画。
  setupDevPanel({
    gs,
    fixtures: battleFixtures,
    sceneJumps,
    sceneAssetsCache,
    onSceneChanged: applySceneAssetsToPresent,
    resources: {
      enemies, enemyTeams, battleFields,
      playerRoles, items, spells, magics,
      commands: eventCommands,
    },
  })

  startRafLoop(loopCtx)
  console.log('[bootstrap] scene', SCENE_ID, 'started')
}
