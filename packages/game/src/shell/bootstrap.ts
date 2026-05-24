import type { EventFile, SceneEventObject, Tilemap } from '@type-pal/shared'
import { decodePngToIndices, type IndexedImage } from '../assets/png.js'
import { fetchPalette, loadAll, SceneAssetsCache, type SceneAssets, type SceneFetcher } from '../assets/loader.js'
import { loadGlyphs, renderText } from '../present/font.js'
import { createCommandBus } from '../core/command-bus.js'
import { createInitialGameState, npcFromEventObject } from '../core/game-state.js'
import {
  buildLabelMap, runEnterScript, setFetchPalette,
  setSharedEvents, setStartBattleHandler,
} from '../core/event-system.js'
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
  // M4 P4.T3: loadGlyphs 与 loadAll 并行加载(glyphs.json 7.8MB,不阻塞 tiles/sprites)。
  // glyphs 加载失败则 warn + 继续(所有文字退化为 tofu 占位,不影响游戏可运行性)。
  const [assets, glyphs] = await Promise.all([
    loadAll(SCENE_ID),
    loadGlyphs().catch((err: unknown) => {
      console.warn('[bootstrap] loadGlyphs failed, text will render as tofu:', err)
      return undefined
    }),
  ])

  const {
    tilemap, palette, scene, events, playerRoles, tileImages, characterSprites,
    battleSprites, battleBgs, enemies, enemyTeams, battleFields, enemyPos, items, spells, magics,
  } = assets

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
  gs.npcs = scene.eventObjects.map(npcFromEventObject)

  const segment = events.segments[0]
  if (!segment) throw new Error('events.json 无 segment[0]')
  const eventCommands = segment.commands
  const labelMap = buildLabelMap(eventCommands)

  // onEnter 装载
  // M3.5:dev verify / L2 Playwright 加 ?skip-intro=1 URL flag 跳 onEnter,避免
  // 每次都按 Space 过开场对话(scene 1 是吕奇劫主角剧情)。default 仍跑 onEnter
  // 保持真原版游戏首屏行为。
  //
  // P0.e:
  //  - skip-intro: 直接跑 runEnterScript 同步取得 setPartyPos(跳过对话);party 在正确位置后
  //    保持 explore 模式。
  //  - 正常启动: enter script 里的 setPartyPos(opcode 0x0046) 由 tickEventSystem raw case
  //    applyRawOpcode 真生效 → 对话过完后 party 已在正确位置。
  const skipIntro = new URLSearchParams(window.location.search).has('skip-intro')
  if (scene.onEnterLabel) {
    const ip = labelMap[scene.onEnterLabel]
    if (ip !== undefined) {
      if (skipIntro) {
        // skip-intro: 同步跑 enter script → 只取 setPartyPos/Direction,跳过对话
        runEnterScript(gs, eventCommands, labelMap, ip)
      }
      else {
        // 正常启动:跑完整 enter script(含对话)— tickEventSystem 步进
        gs.eventCursor = { commands: eventCommands, labelMap, ip }
        gs.mode = 'event'
      }
    }
  }

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
  for (const [id, data] of characterSprites) {
    const f = data.frames[0]
    if (!f) continue
    npcSprites.set(id, {
      width: f.width,
      height: f.height,
      indices: f.indices,
      opaque: f.opaque,
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
    partyFrames,
    partyWalkFrames,
    npcSprites,
    glyphs,
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
      npcSprites.set(id, {
        width: first.width,
        height: first.height,
        indices: first.indices,
        opaque: first.opaque,
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
    console.log('[font-test] sheet rendered — check canvas for tofu')
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
    ;(window as unknown as { __game: { gs: typeof gs, assets: typeof assets } }).__game = {
      gs,
      assets,
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

  startRafLoop(loopCtx)
  console.log('[bootstrap] scene', SCENE_ID, 'started')
}
