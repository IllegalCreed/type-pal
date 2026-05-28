import type { EventFile, SceneEventObject, Tilemap } from '@type-pal/shared'
import { decodePngToIndices, type IndexedImage } from '../assets/png.js'
import { fetchPalette, loadAll, SceneAssetsCache, type SceneAssets, type SceneFetcher } from '../assets/loader.js'
import { loadDialogAssets } from '../assets/dialog-assets.js'
import { loadGlyphs, renderText } from '../present/font.js'
import { createCommandBus } from '../core/command-bus.js'
import type { Command } from '@type-pal/shared'
import { createInitialGameState, hydratePlayerRolesRuntime, npcFromEventObject } from '../core/game-state.js'
import { updateAllEquipments } from '../core/equip-effect.js'
import {
  buildLabelMap, runEnterScript, setFetchPalette,
  setSceneLoader,
  setSharedEvents, setStartBattleHandler,
} from '../core/event-system.js'
import { setMenuCatalogs, setStartGameHandler } from '../core/menu/menu-driver.js'
import { createOpeningMenu } from '../core/menu/opening-menu.js'
import { playAvi } from './avi-player.js'
import { playSplashFallback } from './splash-fallback.js'
import { playTrademarkFallback } from './trademark-fallback.js'
import { startBattle } from '../core/battle/battle-system.js'
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

// sdlpal 真值:`PAL_LoadDefaultGame` 起手 `wNumScene=1`,`PAL_GameUpdate` 取 `scenes[wNumScene-1]=scenes[0]`
// 即 dump 文件 `scene/0.json`(mapNum=20 黑地图 + onEnterLabel=L_4)— 这才是开场梦境(主角躺地 +
// 罗刹鬼婆声音 + 主角喊话)。L_4 末尾 `loadScene { sceneId: 2 }` 把 wNumScene 设 2 → `scenes[1]`
// 才是客栈(mapNum=12)L_3545 cutscene。
//
// `?skip-intro=1` URL 参数:跳过开场梦境直接进客栈(scene/1.json,inn),并跳过 cutscene 对话 —
// e2e / dev verify 用,正常用户路径仍走 scene 0 → loadScene(2) → scene 1 全流程。
const skipIntroBoot = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).has('skip-intro')
const SCENE_ID = skipIntroBoot ? 1 : 0

/**
 * M5.6 T18 Step 7:`?build=win95`(默认)/ `?build=dos` URL flag。
 * - win95:trademark / splash 走 mp4 视频(playAvi 1/2.avi)— sdlpal `gConfig.fIsWIN95=TRUE`
 *   真值同口径
 * - dos:走 sdlpal DOS fallback 真做(playTrademarkFallback RNG.MKF chunk 6 +
 *   playSplashFallback FBP chunk 3/4 + 仙鹤 + 标题 RLE + palette 渐变 200 行 port)
 * `?skip-intro=1` 优先短路全部(同前)。
 */
const buildFlag: 'win95' | 'dos' = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('build') === 'dos'
  ? 'dos' : 'win95'

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
  // M4 P4.T3: loadGlyphs 与 loadAll 并行加载(glyphs.json 7.8MB,不阻塞 tiles/sprites)。
  // glyphs 加载失败则 warn + 继续(所有文字退化为 tofu 占位,不影响游戏可运行性)。
  // M5 Sync.2: dialog 资产(portrait RGM 92 + DATA chunk 12 icon sprite group)并行加载。
  const [assets, glyphs, dialogAssets] = await Promise.all([
    loadAll(SCENE_ID),
    loadGlyphs().catch((err: unknown) => {
      console.warn('[bootstrap] loadGlyphs failed, text will render as tofu:', err)
      return undefined
    }),
    loadDialogAssets(),
  ])

  const {
    tilemap, palette, scene, events, playerRoles, tileImages, characterSprites,
    battleSprites, battleBgs, enemies, enemyObjects, enemyTeams, battleFields, enemyPos, items, spells, magics,
  } = assets

  // M5.6 W0.b:注入大世界 menu catalogs(items / spells / playerRoles),
  // menu-driver 内 dispatchInGameMenu 在 Confirm 时调 createInventoryMenu / createInGameMagicMenu 等需要。
  setMenuCatalogs({ items, spells, magics, playerRoles })

  // 队长精灵号 —— 从 player-roles.json (DATA.MKF chunk 3 真解) 取真值。
  // M3 T9 之前 M2 硬编码 = 2,现在改读 PlayerRoles.roles[0].spriteNum(实测 = 2);
  // 多人队伍切换留 M5。
  const leader = playerRoles.roles[0]
  if (!leader) throw new Error('bootstrap: playerRoles.roles[0] missing')
  const partyLeaderSpriteId = leader.spriteNum

  // P0.e: party 起始位置改由首屏 scene wScriptOnEnter 脚本设(setPartyPos opcode 真生效)。
  // 初始值 (0,0,down) 只是占位;loadScene / runEnterScript 会覆盖到真实原版位置。
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' as const })
  // sdlpal global.c::PAL_NewGame 真值:wMaxPartyMemberIndex=0 + rgParty[0].wPlayerRole=0(主角)。
  // 不设 partyMembers 则撞怪进战斗 createBattleState 构 0 player → 立刻 phase='lost' 闪退。
  gs.partyMembers = [0]
  // sdlpal wNumScene 是 1-based,scenes[wNumScene-1] 才是真 scene。dump 文件 scene/N.json 对应
  // scenes[N](0-based),所以 wNumScene = SCENE_ID + 1。loadScene opcode 真做时(callback)会写新值。
  gs.wNumScene = SCENE_ID + 1

  const segment = events.segments[0]
  if (!segment) throw new Error('events.json 无 segment[0]')
  const eventCommands = segment.commands
  const labelMap = buildLabelMap(eventCommands)

  // scene-level commands + label map(autoScript runner 用)
  gs.sceneCommands = eventCommands
  gs.sceneLabelMap = labelMap
  // 传 labelMap → NPC autoLabel resolve 成 autoCursor.ip
  gs.npcs = scene.eventObjects.map((eo) => npcFromEventObject(eo, labelMap))

  // M5.6 T17:onEnter 启动改由 startNewGameFromPrimary helper 触发,
  // OpeningMenu 选 new-game / ?skip-intro=1 路径都调它。
  // (helper 定义在下面 setStartGameHandler 之前;此处仅保留注释占位。)
  // skipIntro 行为见 ?skip-intro=1 路径分支(SCENE_ID=1 + runEnterScript 同步只取 setPartyPos)。
  // 正常启动:OpeningMenu 选 new-game → playOpeningAvi() stub → startNewGameFromPrimary 装载完整
  // onEnter(对话由 tickEventSystem 步进)。

  // sprite 装配 — sdlpal `scene.c:750-755`:站立帧 = wDirection * walkFrames,
  // WIN95 party sprite 默认 12 帧 = 4 方向 × 3 帧(walkFrames 默认 3)。
  // 这里把所有 frame 都装成 SpriteImage 数组,presentFrame 按 facing 取站立帧。
  const partyData = characterSprites.get(partyLeaderSpriteId)
  if (!partyData) throw new Error(`队长 sprite (id ${partyLeaderSpriteId}) 加载失败`)
  if (partyData.frames.length === 0) throw new Error('队长 sprite 无 frame')
  const partyFrames = partyData.frames.map((f) => ({
    width: f.width,
    height: f.height,
    indices: f.indices,
    opaque: f.opaque,
    anchorX: partyData.anchorX,
    anchorY: partyData.anchorY,
  }))
  // playerRoles.rgwWalkFrames[role]:M4 简版 fallback 3(sdlpal `scene.c:752 if (i == 0) i = 3`)。
  // M5 真做时按 PlayerRoles[leaderRole].walkFrames 取。
  const partyWalkFrames = 3
  type NpcSprite = (typeof partyFrames)[number]
  const npcSprites = new Map<number, NpcSprite>()
  // Sync.2 fix3 pose:per-spriteId 全帧数组,opcode 0x0014/0x0016/0x000F 写 npc.scriptedFrame 用。
  const npcSpriteFrames = new Map<number, NpcSprite[]>()
  for (const [id, data] of characterSprites) {
    const allFrames: NpcSprite[] = data.frames.map((f) => ({
      width: f.width,
      height: f.height,
      indices: f.indices,
      opaque: f.opaque,
      anchorX: data.anchorX,
      anchorY: data.anchorY,
    }))
    npcSpriteFrames.set(id, allFrames)
    if (allFrames[0]) npcSprites.set(id, allFrames[0])
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
    partyFrames,
    partyWalkFrames,
    npcSprites,
    npcSpriteFrames,
    glyphs,
    dialogAssets,
    uiSpriteFrames: assets.uiSpriteFrames,
    // M5.6 T17:OpeningMenu 背景 — sdlpal `MAINMENU_BACKGROUND_FBPNUM (fIsWIN95?2:60)`,
    // 我们 WIN95 data 走 chunk 2;M4 P2.T4 已 dump 进 battleBgs map(key=2)。
    openingMenuBg: assets.battleBgs.get(2),
    // M5.6 T10b:BALL 物品图标(audit 第 1 漏洞已修)— InventoryMenu / Equip / 商店用。
    itemIcons: assets.itemIcons,
    items: assets.items,
    // M5.6 T10d:PlayerStatus 全屏背景 — sdlpal `STATUS_BACKGROUND_FBPNUM = 0`(ui.h:83)。
    // FBP chunk 0 → battleBgs.get(0)(M4 P2.T4 已 dump)。
    statusBg: assets.battleBgs.get(0),
    // PlayerStatus 渲染读 stat / equipment / avatar(rgwAvatar→portrait chunk index)。
    playerRoles: assets.playerRoles,
    // PlayerStatus 显示 RoleNextExp 用 LevelUpExp[level] 阈值(DATA.MKF chunk 14)。
    levelUpExp: assets.levelUpExp,
    // C5(2026-05-28):EquipItemMenu 全屏背景 — sdlpal `EQUIPMENU_BACKGROUND_FBPNUM = 1`(ui.h:118)。
    equipBg: assets.battleBgs.get(1),
    // C7(2026-05-29):InGameMagicMenu 渲染需 spells / magics catalog。
    spells: assets.spells,
    magics: assets.magics,
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
    enemyPos,
    glyphs,
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
    partyWalkFrames,
    onPresent: (drained) => {
      // 按 gs.mode 路由 present:battle → presentBattleFrame(消费 commands 进 floating nums);
      // 否则走 explore/event 路径 presentFrame(commands 由 M2 EventSystem 直接消费 GameState)
      if (!presentBattleFrame(fb, gs, battlePresent, battleAssets, drained)) {
        presentFrame(fb, gs, presentCtx)
      }
      // M4 P3.T2: gs.palette 由 setPalette opcode handler 异步写入;优先用它,否则 fallback 到初始 palette。
      flushToCanvas(fb, canvasCtx, gs.palette ?? palette)
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
      const metaRes = await fetch(`${BASE}/data/sprite/${id}.json`)
      if (!metaRes.ok) throw new Error(`sprite-${id}.json fetch failed (${metaRes.status})`)
      const meta = (await metaRes.json()) as {
        spriteId: number
        frames: { index: number; width: number; height: number }[]
      }
      const frames = await Promise.all(
        meta.frames.map(async (f) => {
          const r = await fetch(
            `${BASE}/images/world/npc/${id}/frame-${f.index.toString().padStart(2, '0')}.png`,
          )
          if (!r.ok) throw new Error(`sprite-${id}-frame-${f.index} png fetch failed (${r.status})`)
          return decodePngToIndices(await r.blob())
        }),
      )
      const first = frames[0]
      if (!first) return
      const anchorX = Math.floor(first.width / 2)
      const anchorY = first.height
      // Sync.2 fix3 pose:存全帧 + frame 0
      const allFrames: NpcSprite[] = frames.map((f) => ({
        width: f.width,
        height: f.height,
        indices: f.indices,
        opaque: f.opaque,
        anchorX,
        anchorY,
      }))
      npcSpriteFrames.set(id, allFrames)
      npcSprites.set(id, allFrames[0]!)
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
      const tileNumPattern = /tile-(\d+)\.png$/
      const m = tileNumPattern.exec(name)
      if (m) map.set(Number(m[1]), tilePngs[i]!)
    })
    tileImagesBySceneId.set(sceneId, map)
  }

  const sceneFetcher: SceneFetcher = async (sceneId: number): Promise<SceneAssets> => {
    const padded = sceneId.toString().padStart(3, '0')
    // M4 P3.T3: scene→mapNum→tilemap 链:先 fetch scene JSON 拿到 mapNum,再 fetch tilemap by mapNum。
    const sceneJson = await fetch(`${BASE}/data/scene/${sceneId}.json`).then((r) => {
      if (!r.ok) throw new Error(`scene-${sceneId}.json fetch failed (${r.status})`)
      return r.json() as Promise<{ mapNum: number; eventObjects: SceneEventObject[]; onEnterLabel?: string }>
    })
    const [tilemapJson, eventsJson] = await Promise.all([
      fetch(`${BASE}/data/tilemap/${sceneJson.mapNum}.json`).then((r) => {
        if (!r.ok) throw new Error(`tilemap-${sceneJson.mapNum}.json fetch failed (${r.status})`)
        return r.json() as Promise<Tilemap & { tilesetFiles?: string[] }>
      }),
      // P3.T1: per-scene events(lazy load,修 M3.5 ⚠️ a9 #8)
      fetch(`${BASE}/events/scene-${padded}.json`).then((r) => {
        if (!r.ok) throw new Error(`events/scene-${padded}.json fetch failed (${r.status})`)
        return r.json() as Promise<EventFile>
      }),
    ])

    // P3.T1: 把所有 segment 的 commands 展平成单数组,保持与 buildLabelMap 的约定一致。
    const eventCommands = eventsJson.segments.flatMap((seg) => seg.commands)
    const sceneLabelMap = buildLabelMap(eventCommands)

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
      eventCommands,
      labelMap: sceneLabelMap,
      // P0.e: 透传 wScriptOnEnter label → loadScene 跑 enter script 设 party 起点
      onEnterLabel: sceneJson.onEnterLabel,
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
    // P3.T1: 使用新 scene 的 eventCommands / labelMap,
    // 修 M3.5 ⚠️ a9 #8:loadScene 已 setSceneContext,此处同步覆写保持一致。
    setSceneContext({
      tilemap: sceneAssets.tilemap,
      eventCommands: sceneAssets.eventCommands,
      labelMap: sceneAssets.labelMap,
    })
  }

  // 扫新 scene eventCommands 的 setPlayerSprite(opcode 0x65)预 fetch 主角 cutscene sprite group。
  async function preloadCutsceneSprites(commands: Command[]): Promise<void> {
    const ids = new Set<number>()
    for (const cmd of commands) {
      if (cmd.op === 'raw' && cmd.opcode === 0x0065 && (cmd.operands[0] ?? 0) === 0) {
        const spriteId = cmd.operands[1] ?? 0
        if (spriteId > 0 && !npcSpriteFrames.has(spriteId)) ids.add(spriteId)
      }
    }
    if (ids.size > 0) {
      console.log(`[bootstrap] preloading ${ids.size} cutscene party sprite(s):`, [...ids])
      await Promise.all([...ids].map((id) => fetchMissingSprite(id)))
    }
  }

  // loadScene opcode (0x0059) callback:fetch 新 scene assets → 重置 gs.npcs + setSceneContext +
  // applySceneAssetsToPresent + 预 fetch 新 scene cutscene sprites + 写 gs.eventCursor 到新 scene
  // onEnterLabel ip → 释放 waiting='scene-load'。
  // 注:cmd.sceneId 是 sdlpal wNumScene 值(1-based,scenes[wNumScene-1] 才是真 scene),
  //     我们 dump 文件 scene/N.json 是 0-based(对应 scenes[N]),所以 dumpFileIndex = wNumScene - 1。
  setSceneLoader(async (newWNumScene: number) => {
    const dumpFileIndex = newWNumScene - 1
    console.log(`[bootstrap.sceneLoader] loadScene wNumScene=${newWNumScene} → dump scene/${dumpFileIndex}.json`)
    const sceneAssets = await sceneAssetsCache.loadScene(dumpFileIndex)
    gs.wNumScene = newWNumScene
    // 新 scene 的 commands + labelMap 写入 gs(autoScript runner 用)
    gs.sceneCommands = sceneAssets.eventCommands
    gs.sceneLabelMap = sceneAssets.labelMap
    // 传 labelMap → 新 scene NPC autoLabel 解 ip
    gs.npcs = sceneAssets.eventObjects.map((eo) => npcFromEventObject(eo, sceneAssets.labelMap))
    // sdlpal scene 切换时 dialog **不**自动清 — sdlpal `PAL_LoadResources` 只重置场景资源,
    // 文字框留待后续 opcode(0x05 ClearDialog / 0x73 fadeScreen 内部 / setDialogStyleX)清。
    // 这是 sdlpal "渐变跟着 dialog 一起 fade" 真值机制:
    //   scene 切换后下条 fadeScreen → VIDEO_BackupScreen 拷当前屏(含 dialog) → 在 backup
    //   到 current 之间渐变 → 视觉上 dialog 跟着 fade 渐变出。
    applySceneAssetsToPresent(sceneAssets)
    // sdlpal `fEnteringScene = TRUE` 真值:`PAL_StartFrame` 早期 return → 屏幕冻结直到
    // 下条 fadeScreen 启动。我们 port:present.ts 见此 flag 跳过 render,fb 保留上一帧
    // (dream + dialog)→ fadeScreen 启动 backupPixels = 冻结画面 → 渐变 dream → inn。
    gs.fEnteringScene = true
    await preloadCutsceneSprites(sceneAssets.eventCommands)
    if (sceneAssets.onEnterLabel) {
      const ip = sceneAssets.labelMap[sceneAssets.onEnterLabel]
      if (ip !== undefined) {
        gs.eventCursor = {
          commands: sceneAssets.eventCommands,
          labelMap: sceneAssets.labelMap,
          ip,
        }
        gs.mode = 'event'
      }
      else {
        gs.eventCursor = undefined
        gs.mode = 'explore'
      }
    }
    else {
      gs.eventCursor = undefined
      gs.mode = 'explore'
    }
  })

  // M3 T29:dev panel(仅 DEV;生产构建 dead-code)。快捷键 B 弹 fixture picker → 启战。
  // M3.5 T16:加 sceneJumps,picker 内多一段 scene jump 列表(T17 接真 loadScene)。
  // T17 重做:onSceneChanged callback 注入 — dev jump 后 dev-panel 回调它,
  //          bootstrap 在回调里 mutate presentCtx 让 canvas 重画。
  // P4.T5: Font Test closure — 清 fb → renderText 渲染中英文混合 sheet → flushToCanvas。
  // 通用安全字符串:不含角色名/地名/具体物品名(版权)。
  // palette index 15:原版 BMP 调色板第 15 项通常为高亮白/淡色,足够文字可见。
  const FONT_TEST_LINES = [
    '0123456789 ABCDEFGHIJKLMNOP',
    'QRSTUVWXYZ abcdefghijklmnop',
    'qrstuvwxyz !@#$%^&*()-=+[]',
    '主菜单 物品 法术 装备 状态',
    '攻击 防御 法术 道具 逃跑',
    '生命 法力 等级 经验 金币',
    '回合 行动 防御 攻击 治疗',
  ]
  function onFontTest(): void {
    fb.clear()
    if (!glyphs) {
      console.warn('[font-test] glyphs 未加载,无法渲染 sheet')
      return
    }
    let y = 8
    for (const line of FONT_TEST_LINES) {
      renderText(fb, line, 4, y, 15, glyphs)
      y += 20
    }
    flushToCanvas(fb, canvasCtx!, gs.palette ?? palette)
    console.log('[font-test] sheet rendered — 按任意键退出 font test 恢复 raf loop')
    // M5.6 UX hotfix:user 怒怼'font test 一帧就没了' — 修法 suspendRaf=true 防下一帧覆盖,
    // 任意 keydown 退出 resume(once listener)。
    gs.suspendRaf = true
    const exitOnce = (): void => {
      gs.suspendRaf = false
      window.removeEventListener('keydown', exitOnce, true)
    }
    window.addEventListener('keydown', exitOnce, true)
  }

  setupDevPanel({
    gs,
    fixtures: battleFixtures,
    sceneJumps,
    sceneAssetsCache,
    onSceneChanged: applySceneAssetsToPresent,
    onFontTest,
    resources: {
      enemies, enemyTeams, battleFields,
      playerRoles, items, spells, magics,
      commands: eventCommands,
    },
  })

  // M3.5 T19:dev gate 暴露 GameState + assets 供 L2 Playwright helper 用 page.evaluate 探针。
  // 生产构建 dead-code(Vite tree-shake import.meta.env.DEV 分支)。
  // 用 dev-panel.ts 同模式 cast(避免依赖 vite/client triple-slash 类型)。
  if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
    ;(window as unknown as {
      __game: { gs: typeof gs, assets: typeof assets, presentCtx: typeof presentCtx }
    }).__game = {
      gs,
      assets,
      presentCtx,  // Sync.2 fix10:暴露 npcSpriteFrames 供 e2e verify cutscene sprite 加载
    }
  }

  // M4 P3.T2:注入 fetchPalette(类同 setSceneContext);event-system setPalette handler 用它
  // 异步拉取新调色板 → 写入 gs.palette → 渲染层下一帧 flushToCanvas 消费。
  setFetchPalette(fetchPalette)

  // P0.e: 加载 events/shared.json 一次 + 注入 event-system → tickEventSystem 解 "shared#L_xxx" 跨 scene goto。
  // 失败:warn + 继续(scene 内 goto 不撞 shared# 时不影响游戏可运行性)。
  try {
    const sharedRes = await fetch(`${BASE}/events/shared.json`)
    if (!sharedRes.ok) throw new Error(`shared.json fetch failed (${sharedRes.status})`)
    const sharedJson = (await sharedRes.json()) as EventFile
    const sharedCommands = sharedJson.segments.flatMap((seg) => seg.commands)
    const sharedLabelMap = buildLabelMap(sharedCommands)
    setSharedEvents(sharedCommands, sharedLabelMap)
    console.log(`[bootstrap] shared events loaded:${sharedCommands.length} commands,${Object.keys(sharedLabelMap).length} labels`)
  }
  catch (err) {
    console.warn('[bootstrap] shared.json 加载失败,goto shared#L_xxx 跨 scene 跳转将抛错:', err)
  }

  // P0.e: 注入 startBattle handler — opcode 7 (raw#7 / op:startBattle) 用。
  // 战斗资源闭包持引用,event-system 不污染 import battle/。
  // sdlpal play.c PAL_StartBattle 取 gpGlobals->wNumBattleField 作 battleFieldId,
  // 该字段由 wScriptOnEnter opcode 0x4A setBattlefield 写入(P0.e 新接)。
  setStartBattleHandler(({ gs, enemyTeamId, isBoss }) => {
    const battleFieldId = gs.wNumBattleField ?? 0
    console.debug(
      `[bootstrap.startBattleHandler] enemyTeamId=${enemyTeamId} battleFieldId=${battleFieldId}`
      + ` isBoss=${isBoss} before.mode=${gs.mode} partyMembers=${gs.partyMembers.length}`,
    )
    try {
      startBattle({
        gs,
        enemyTeamId,
        battleFieldId,
        isBoss,
        enemies,
        enemyObjects,
        enemyTeams,
        battleFields,
        playerRoles,
        items,
        spells,
        magics,
        commands: eventCommands,
      })
      console.debug(
        `[bootstrap.startBattleHandler] after.mode=${gs.mode} battleState=${!!gs.battleState}`,
      )
    }
    catch (e) {
      console.error('[bootstrap.startBattleHandler] startBattle FAILED:', e)
      throw e
    }
    // dev gate:e2e observability。battle 可能瞬间 finalize 回 explore(空 partyMembers
    // 或资源缺失场景),mode 轮询 miss 不到 → 维持一个累积计数器供 a9 等 spec 断言"曾进过"。
    if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
      const w = window as unknown as {
        __battleStartCount?: number
        __lastBattleEnemyTeam?: number
        __lastBattleFieldId?: number
      }
      w.__battleStartCount = (w.__battleStartCount ?? 0) + 1
      w.__lastBattleEnemyTeam = enemyTeamId
      w.__lastBattleFieldId = battleFieldId
    }
  })

  // Sync.2 fix4:扫 eventCommands 找 setPlayerSprite(opcode 0x65)的 sprite id,预 fetch。
  //   操作:operand[0]=playerIdx, operand[1]=spriteId。playerIdx=0 即主角,需在 npcSpriteFrames 内。
  // present.ts 渲染时优先用 gs.partyLeaderSpriteId(由 opcode 写入)→ ctx.npcSpriteFrames.get(spriteId)。
  // 若未预 fetch,渲染会 fallback 到 ctx.partyFrames(bootstrap 默认 sprite)— pose 切不生效。
  const cutsceneSpriteIds = new Set<number>()
  for (const cmd of eventCommands) {
    if (cmd.op === 'raw' && cmd.opcode === 0x0065 && (cmd.operands[0] ?? 0) === 0) {
      const spriteId = cmd.operands[1] ?? 0
      if (spriteId > 0 && !npcSpriteFrames.has(spriteId)) {
        cutsceneSpriteIds.add(spriteId)
      }
    }
  }
  if (cutsceneSpriteIds.size > 0) {
    console.log(`[bootstrap] preloading ${cutsceneSpriteIds.size} cutscene party sprite(s):`, [...cutsceneSpriteIds])
    await Promise.all([...cutsceneSpriteIds].map((id) => fetchMissingSprite(id)))
  }

  // ── M5.6 T17:启动路由 — OpeningMenu vs ?skip-intro ──────────────────────
  // sdlpal main.c:545-546 真值:`PAL_TrademarkScreen → PAL_SplashScreen → PAL_OpeningMenu`,
  // OpeningMenu 选 new-game 返回 0 → `PAL_PlayAVI("3.avi")` → loop 进 scene。
  //
  // ts 端:T18/T19 trademark + splash + 3.avi 留后续 task;T17 只接 OpeningMenu 本体 + AVI hook stub。
  //
  // ?skip-intro=1 URL flag(M3.5 commit a9a87ac)— 之前跳 scene 0 梦境直接 scene 1,
  // T17 扩为同时跳过 OpeningMenu(dev / e2e 用)。

  /** 用 primary scene(SCENE_ID)资产真正"开始"游戏 — 装 events + 跑 onEnter。 */
  function startNewGameFromPrimary(): void {
    // M5.6 session 3 修(user 反馈"用物品没反应"):
    // 新游戏起手把 playerRoles.json 静态基线 hydrate 到 gs.PlayerRolesRuntime。
    // 否则 rgwHP/MaxHP/AttackStrength 等都是 0,HP 加减 opcode clamp 失效。
    // sdlpal global.c PAL_NewGame → PAL_LoadDefaultGame 真值等价。
    hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, playerRoles)
    // C5(2026-05-28):hydrate 后 sdlpal PAL_LoadDefaultGame 真值再调 PAL_UpdateEquipments
    // (global.c:1333)— 跨 role × 6 part 跑每件装备 scriptOnEquip 累加 stat 到 rgEquipmentEffect。
    // 否则 effective Atk/Def/Mag 等 stat getter 永远 = base,跟 sdlpal 真值偏差(D14 装备 effect 根因)。
    updateAllEquipments(gs, items)

    if (scene.onEnterLabel) {
      const ip = labelMap[scene.onEnterLabel]
      if (ip !== undefined) {
        if (skipIntroBoot) {
          // skip-intro: 同步跑 enter script,只取 setPartyPos/Direction,跳过对话(scene 1 客栈)
          runEnterScript(gs, eventCommands, labelMap, ip)
        }
        else {
          // 正常启动:跑完整 onEnter script(scene 0 梦境对话)— tickEventSystem 步进
          gs.eventCursor = { commands: eventCommands, labelMap, ip }
          gs.mode = 'event'
        }
      }
    }
    // 清 OpeningMenu(若有);startNewGameFromPrimary 由 OpeningMenu 触发时 menuStack 非空
    gs.menuStack = []
    if (gs.mode === 'menu') gs.mode = 'explore'
  }

  /**
   * M5.6 T19 Step 8:OpeningMenu 选 new-game 后播 3.avi。
   * sdlpal uigame.c:162 `PAL_PlayAVI("3.avi")` 真值:
   *   if (wItemSelected == 0) PAL_PlayAVI("3.avi");
   *   return (INT)wItemSelected;
   *
   * `?build=win95`:走 mp4 视频(我们默认)
   * `?build=dos`:DOS 数据没 3.avi 替代,直接 return(sdlpal main.c 同口径,
   *   PAL_PlayAVI 失败时 return 0 不走 fallback)
   */
  async function playOpeningAvi(): Promise<void> {
    if (buildFlag === 'dos') {
      console.log('[bootstrap] DOS build:3.avi 无 fallback,直接进 scene')
      return
    }
    gs.suspendRaf = true
    try {
      await playAvi({ src: '/extracted/videos/3.mp4' })
    }
    finally {
      gs.suspendRaf = false
    }
  }

  setStartGameHandler(async (choice) => {
    if (choice.kind === 'new-game') {
      await playOpeningAvi()
      startNewGameFromPrimary()
    }
    else {
      // load-game stub — sdlpal global.c:731 PAL_LoadGame_WIN(slot)真做 .RPG 解,留 M6+
      console.log(`[bootstrap] TODO M6:load-game slot=${choice.slot}`)
      // 暂走 primary scene(让游戏可继续 dev / e2e)
      startNewGameFromPrimary()
    }
  })

  /**
   * Step 7:Trademark + Splash 启动序列 — sdlpal main.c:545-546 真值。
   * `?build=win95`:playAvi(1/2)— mp4 视频(WIN95 build path,我们默认)
   * `?build=dos`:playTrademarkFallback + playSplashFallback — RNG + 卷轴动画
   *
   * suspendRaf 包 try/finally,modal 期间 canvas render 暂停。
   */
  async function showTrademarkAndSplash(): Promise<void> {
    gs.suspendRaf = true
    try {
      if (buildFlag === 'win95') {
        // sdlpal main.c:197 PAL_PlayAVI("1.avi") / main.c:237 PAL_PlayAVI("2.avi")
        await playAvi({ src: '/extracted/videos/1.mp4' })
        await playAvi({ src: '/extracted/videos/2.mp4' })
      }
      else {
        // sdlpal main.c:199-203 DOS Trademark fallback / main.c:223-456 DOS Splash fallback
        // palette 3:trademark / palette 1:splash(sdlpal PAL_SetPalette / PAL_GetPalette 真值)
        const palette3 = await fetchPalette(3).catch(() => palette)
        await playTrademarkFallback({
          fb,
          canvasCtx: canvasCtx!,
          palette: palette3,
        })
        const palette1 = await fetchPalette(1).catch(() => palette)
        const fbpUp = assets.battleBgs.get(3)
        const fbpDown = assets.battleBgs.get(4)
        const craneSprite = characterSprites.get(73)
        const titleSprite = characterSprites.get(71)
        if (!fbpUp || !fbpDown || !craneSprite || !titleSprite || titleSprite.frames.length === 0) {
          console.warn('[bootstrap] DOS splash 资产缺失,跳过 splash fallback')
        }
        else {
          await playSplashFallback({
            fb,
            canvasCtx: canvasCtx!,
            palette: palette1,
            // BattleBgAsset(无 opaque)→ wrap 成 IndexedImage(全 opaque)
            bitmapUp: { ...fbpUp, opaque: new Uint8Array(fbpUp.width * fbpUp.height).fill(1) },
            bitmapDown: { ...fbpDown, opaque: new Uint8Array(fbpDown.width * fbpDown.height).fill(1) },
            craneSprite: {
              frames: craneSprite.frames.map((f) => ({
                width: f.width, height: f.height,
                indices: f.indices, opaque: f.opaque,
              })),
              anchorX: craneSprite.anchorX,
              anchorY: craneSprite.anchorY,
            },
            titleFrame: {
              width: titleSprite.frames[0]!.width,
              height: titleSprite.frames[0]!.height,
              indices: titleSprite.frames[0]!.indices,
              opaque: titleSprite.frames[0]!.opaque,
            },
          })
        }
      }
    }
    finally {
      gs.suspendRaf = false
    }
  }

  if (skipIntroBoot) {
    // ?skip-intro=1 → 跳 trademark + splash + OpeningMenu 直接走 SCENE_ID(=1)新游戏
    startNewGameFromPrimary()
  }
  else {
    // 默认:trademark → splash → OpeningMenu
    // 注:await 不阻塞 startRafLoop(后者立即调,raf 已暂停 via suspendRaf)
    void showTrademarkAndSplash().then(() => {
      gs.menuStack = [{ kind: 'opening', state: createOpeningMenu() }]
      gs.mode = 'menu'
    }).catch((err: unknown) => {
      console.error('[bootstrap] trademark/splash 失败,直接进 OpeningMenu:', err)
      gs.menuStack = [{ kind: 'opening', state: createOpeningMenu() }]
      gs.mode = 'menu'
    })
  }

  startRafLoop(loopCtx)
  console.log('[bootstrap] startup ready, SCENE_ID=', SCENE_ID, 'skipIntro=', skipIntroBoot, 'build=', buildFlag)
}
