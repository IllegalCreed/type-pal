import type {
  Command,
  EventFile,
  EventObjectsFile,
  Palette,
  PlayerRoles,
  SceneEventObject,
  Tilemap,
} from '@type-pal/shared'
import { loadDialogAssets } from '../assets/dialog-assets.js'
import {
  fetchPalette,
  loadAll,
  type SceneAssets,
  SceneAssetsCache,
  type SceneFetcher,
} from '../assets/loader.js'
import { decodePngToIndices, type IndexedImage } from '../assets/png.js'
import { startBattle, INTRO_FADE_TICKS } from '../core/battle/battle-system.js'
import { createCommandBus } from '../core/command-bus.js'
import { updateAllEquipments } from '../core/equip-effect.js'
import {
  buildLabelMap,
  getGlobalCommands,
  getGlobalLabelMap,
  runEnterScript,
  setEndingAnimationHandler,
  setEnemyObjectsTable,
  setFetchPalette,
  setGlobalEvents,
  setObjectPoisons,
  setLoadLastSaveHandler,
  setMapReloader,
  setObstacleChecker,
  setQuitHandler,
  setRngPlayHandler,
  setSceneLoader,
  setScrollFbpHandler,
  setShopMenuHandler,
  setShowFbpHandler,
  setStartBattleHandler,
  setStoreTable,
} from '../core/event-system.js'
import {
  createInitialGameState,
  createInitialPlayerStatus,
  type GameState,
  hydrateNpcStaticDefaults,
  setSpriteFrameCountProvider,
  getOverworldSpriteNum,
  loadDefaultGame,
  normalizePlayerRolesRuntime,
  projectRuntimeToBattleRoles,
  npcFromEventObject,
  resetSceneRuntimeForNewGame,
  sliceSceneEventObjects,
} from '../core/game-state.js'
import {
  setLoadGameHandler,
  setMenuCatalogs,
  setStartGameHandler,
  setSystemQuitHandler,
} from '../core/menu/menu-driver.js'
import { openMenu } from '../core/menu/menu-mode.js'
import { setWordTable } from '../core/word-lookup.js'
import { createOpeningMenu } from '../core/menu/opening-menu.js'
import { createBuyMenu } from '../core/menu/shop-menu.js'
import { createSellMenu } from '../core/menu/sell-menu.js'
import { makeWorkingPalette } from '../core/palette-fade.js'
import { Save } from '../core/save/api.js'
import { isWalkable, setCurrentMapNum, setSceneContext } from '../core/scene-system.js'
import battleFixturesRaw from '../dev/fixtures/battle-fixtures.json' with { type: 'json' }
import sceneJumpsRaw from '../dev/fixtures/scene-jumps.json' with { type: 'json' }
import sceneNamesRaw from '../dev/fixtures/scene-names.json' with { type: 'json' }
import type { SpriteAsset } from '../present/battle/draw-battle-sprites.js'
import { type BattleAssets, BattlePresent } from '../present/battle/present-battle.js'
import { toSpriteImages } from '../present/draw-sprite.js'
import { loadGlyphs, renderText } from '../present/font.js'
import { createFramebuffer } from '../present/framebuffer.js'
import {
  applyDialogIconPaletteShift,
  flushToCanvas,
  type PresentContext,
  presentBattleFrame,
  presentFrame,
} from '../present/present.js'
import { battleVictoryTrack, createAudioManager, pickMusicTrack, setOggVolumeScale, setSfxVolume, sfxForBattleEvent, type AudioManager } from './audio.js'
import { createSpessaSynthBackend, setBgmVolume } from './audio-midi.js'
import { createAudioVolumeController } from './audio-volume.js'
import { createDisplayScaleController } from '../tools/display-scale.js'
import { setupQuickSave } from '../tools/quick-save.js'
import { setupToolsPanel } from '../tools/tools-panel.js'
import { playAvi } from './avi-player.js'
import {
  type BattleFixturesData,
  type SceneJumpsData,
  type SceneNamesData,
  setupDevPanel,
} from '../dev/dev-panel.js'
import { drawTilemap } from '../present/draw-tilemap.js'
import {
  colorFadeBlocking,
  fadeInBlocking,
  fadeOutBlocking,
  playEndingAnimation,
  waitForKey,
} from './ending-player.js'
import { scrollFbp, showFbp } from './fbp-player.js'
import { KeyboardInputSource } from './input.js'
import { type LoopContext, startRafLoop } from './main-loop.js'
import { finishBootLoading, setBootLoadingNote } from './boot-loading.js'
import { pausePrecache, resumePrecache } from './precache-client.js'
import { playRng } from './rng-player.js'
import { playSplashFallback } from './splash-fallback.js'
import { playTrademarkFallback } from './trademark-fallback.js'

// JSON 静态 import 的 TS 类型推断会把每条 fixture 推成具体 key 集合(eg. fixture-zh1
// 没 "1" → 推 "1": undefined),与 BattleFixturesData 的 Record<string, ...> 不严格匹配。
// 这里显式 cast —— dev/fixtures/battle-fixtures.json 的 schema 由 BattleFixture 定义,运行时合法。
const battleFixtures = battleFixturesRaw as unknown as BattleFixturesData
// 同模式 cast —— scene-jumps.json schema 由 SceneJump 定义。
const sceneJumps = sceneJumpsRaw as unknown as SceneJumpsData
// dev 场景名表(scene-names.json,人工补全;`_doc` 字段 runtime 忽略)。
const sceneNames = sceneNamesRaw as unknown as SceneNamesData

// sdlpal 真值:`PAL_LoadDefaultGame` 起手 `wNumScene=1`,`PAL_GameUpdate` 取 `scenes[wNumScene-1]=scenes[0]`
// 即 dump 文件 `scene/0.json`(mapNum=20 黑地图 + onEnterLabel=L_4)— 这才是开场梦境(主角躺地 +
// 罗刹鬼婆声音 + 主角喊话)。L_4 末尾 `loadScene { sceneId: 2 }` 把 wNumScene 设 2 → `scenes[1]`
// 才是客栈(mapNum=12)L_3545 cutscene。
//
// `?skip-intro=1` URL 参数:跳过开场梦境直接进客栈(scene/1.json,inn),并跳过 cutscene 对话 —
// e2e / dev verify 用,正常用户路径仍走 scene 0 → loadScene(2) → scene 1 全流程。
const skipIntroBoot =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('skip-intro')
const SCENE_ID = skipIntroBoot ? 1 : 0

/**
 * M5.6 T18 Step 7:`?build=win95`(默认)/ `?build=dos` URL flag。
 * - win95:trademark / splash 走 mp4 视频(playAvi 1/2.avi)— sdlpal `gConfig.fIsWIN95=TRUE`
 *   真值同口径
 * - dos:走 sdlpal DOS fallback 真做(playTrademarkFallback RNG.MKF chunk 6 +
 *   playSplashFallback FBP chunk 3/4 + 仙鹤 + 标题 RLE + palette 渐变 200 行 port)
 * `?skip-intro=1` 优先短路全部(同前)。
 */
const buildFlag: 'win95' | 'dos' =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('build') === 'dos'
    ? 'dos'
    : 'win95'

export function cloneScreenPalette(src: Palette): Palette {
  return { ...src, colors: src.colors.map(([r, g, b]) => [r, g, b]) }
}

export function makeBlackScreenPalette(src: Palette): Palette {
  return { ...src, colors: src.colors.map(() => [0, 0, 0] as [number, number, number]) }
}

export function syncShellAudio(
  audio: AudioManager,
  gs: GameState,
  drained: ReadonlyArray<{ cmd: { op: string; soundId?: number; enemyIdx?: number; playerIdx?: number } }>,
  playerRoles: PlayerRoles,
): void {
  const inBattle = gs.battleState !== undefined
  // 系统菜单「音乐」「音效」开关(gs.fMusicEnabled/fSoundEnabled,PAL_SwitchMenu 切)→ AudioManager。
  //   setter 幂等(无变化 no-op),每帧调安全。
  audio.setMusicEnabled(gs.fMusicEnabled ?? true)
  audio.setSfxEnabled(gs.fSoundEnabled ?? true)
  // 战斗胜利曲(battle.c:1030-1032,'won' 结算期 isBoss?2:3 不循环;结算完 battleState 清→场景乐恢复)。
  const victoryTrack = battleVictoryTrack(gs.battleState)
  const battleIntroActive = gs.battleState?.introFade !== undefined // DM29:揭场未完 → 静默
  audio.sync(gs.pendingSounds, {
    track: victoryTrack > 0 ? victoryTrack : pickMusicTrack(inBattle, gs.wNumMusic, gs.wNumBattleMusic, battleIntroActive),
    loop: victoryTrack > 0 ? false : (inBattle ? true : (gs.musicLoop ?? true)),
  })
  // M6 战斗 SFX:扫本帧 bus 视觉事件 → per-单位声(敌死 deathSound / 敌攻 attackSound /
  //   我攻 role.weaponSound,fight.c/battle.c AUDIO_PlaySound)。explore SFX 走 gs.pendingSounds。
  if (inBattle) {
    for (const { cmd } of drained) {
      // core 已解析好的固定声(出招/暴击 attack.ts、濒死/阵亡 battle-system 等 AUDIO_PlaySound)→ 直接播。
      if (cmd.op === 'playSound') {
        if ((cmd.soundId ?? 0) > 0) audio.playSound(cmd.soundId ?? 0)
        continue
      }
      const s = sfxForBattleEvent(cmd, gs.battleState?.enemies, gs.partyMembers, playerRoles.roles)
      if (s > 0) audio.playSound(s)
    }
  }
}

export function showError(canvas: HTMLCanvasElement, msg: string): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#400'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#f88'
  ctx.font = '10px monospace'
  ctx.fillText(msg, 8, 32)
}

export interface BootstrapDeps {
  /** soundfontSettled 后调:必要资源就绪(PROD 出「进入游戏」按钮;dev/无门 no-op)。 */
  onPlayable?: () => void
  /** bootstrap await 它:用户点进入 / 自动放行后 resolve(dev 预先 resolved → 不阻塞)。 */
  enterGate?: Promise<void>
}

export async function bootstrap(canvas: HTMLCanvasElement, deps?: BootstrapDeps): Promise<void> {
  // soundfont 是启动期最大单体(当前 TimGM6mb ~6MB;曾是 32MB GeneralUser GS),提前到 boot
  // 阶段与其余资源并行下载(main.ts 已包 fetch → 计入 loading 进度),数据到手才放行视频/菜单
  // (下方 await soundfontSettled)。不等它的话覆盖层收掉后它仍在后台占满带宽(生产
  // pal.illegalscreed.cn 实测 ~440KB/s,32MB 时代要 ~74s):3.mp4 流卡顿、loadScene 黑屏拉长、
  // BGM 等到 AVI 中途才响(2026-06-12 user 报)。失败不挡启动:audio-midi 回退自取,最终 BGM 静默 + warn。
  const soundfontData = fetch('/soundfont.sf3').then((r) => {
    if (!r.ok) throw new Error(`soundfont HTTP ${r.status}`)
    return r.arrayBuffer()
  })
  const soundfontSettled = soundfontData.then(() => {}, () => {})
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
    objectPlayers,
    stores,
    words,
  } = assets

  // W3 C1/C2:注入 WORD.DAT 词表(words.json flat[]),getWord(id) 取菜单文案(单一文案源,替代各处硬编码)。
  setWordTable(words)

  // M5.6 W0.b:注入大世界 menu catalogs(items / spells / playerRoles),
  // menu-driver 内 dispatchInGameMenu 在 Confirm 时调 createInventoryMenu / createInGameMagicMenu 等需要。
  setMenuCatalogs({ items, spells, magics, playerRoles })

  // 队伍 sprite 兜底帧 —— 启动时用 role0,后续 presentFrame 会按 gs.partyMembers[0] 的
  // runtime rgwSpriteNum 切到实际队长。role0 只作为旧资源兜底。
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
  // 特效 A(2026-05-29):种子调色板。
  //   gs.palette = 可变工作副本(makeWorkingPalette 深拷 colors;fade 引擎每帧原地 ramp 它,不污染源)。
  //   gs.basePalette = pristine 场景色(fade target / snapshot 参照;始终与 gs.palette 不同对象)。
  // 与旧行为等价:flushToCanvas 之前用 `gs.palette ?? palette`,现 gs.palette 已是 palette 深拷 → 同色。
  gs.palette = makeWorkingPalette(palette)
  gs.basePalette = palette

  const segment = events.segments[0]
  if (!segment) throw new Error('events.json 无 segment[0]')
  const eventCommands = segment.commands
  const labelMap = buildLabelMap(eventCommands)

  // scene-level commands + label map(autoScript runner 用)
  gs.sceneCommands = eventCommands
  gs.sceneLabelMap = labelMap

  // 忠实 sdlpal lprgEventObject:一次性加载全局 event object 表 → gs.allEventObjects + 区间。
  // gs.npcs = 当前 scene 切片(引用全局元素 → 脚本改动持久,重进保留:李大娘走了不复现)。
  // H1:保存初始 raw 表 — 通关后重开新游戏时 resetSceneRuntimeForNewGame 据此重建(断开上一局脚本改动)。
  let initialEventObjects: SceneEventObject[] = []
  try {
    const eoRes = await fetch('/extracted/data/event-objects.json')
    if (eoRes.ok) {
      const eoFile = (await eoRes.json()) as EventObjectsFile
      initialEventObjects = eoFile.eventObjects
      // 全局数组建表时不传 labelMap(autoCursor 留切片时按各 scene labelMap 延迟解)。
      gs.allEventObjects = eoFile.eventObjects.map((eo) => npcFromEventObject(eo))
      gs.sceneEventRanges = eoFile.sceneRanges
    } else {
      console.warn(
        `[bootstrap] event-objects.json fetch failed (${eoRes.status}),NPC 状态退化为非持久`,
      )
    }
  } catch (err) {
    console.warn('[bootstrap] event-objects.json 加载失败,NPC 状态退化为非持久:', err)
  }
  // 切当前 scene 视图;全局表缺失则兜底从 scene dump 建(传 labelMap 立即解 autoCursor)。
  gs.npcs =
    sliceSceneEventObjects(gs, gs.wNumScene) ??
    scene.eventObjects.map((eo) => npcFromEventObject(eo, labelMap))
  hydrateNpcStaticDefaults(gs.npcs, scene.eventObjects)

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
  // 逐帧 anchor(sdlpal scene.c:224/358 PAL_RLEGetWidth/Height 用当前帧)— 见 toSpriteImages。
  const partyFrames = toSpriteImages(partyData.frames)
  // playerRoles.rgwWalkFrames[role]:M4 简版 fallback 3(sdlpal `scene.c:752 if (i == 0) i = 3`)。
  // M5 真做时按 PlayerRoles[leaderRole].walkFrames 取。
  const partyWalkFrames = 3
  type NpcSprite = (typeof partyFrames)[number]
  const npcSprites = new Map<number, NpcSprite>()
  // Sync.2 fix3 pose:per-spriteId 全帧数组,opcode 0x0014/0x0016/0x000F 写 npc.scriptedFrame 用。
  const npcSpriteFrames = new Map<number, NpcSprite[]>()
  for (const [id, data] of characterSprites) {
    const allFrames: NpcSprite[] = toSpriteImages(data.frames)
    npcSpriteFrames.set(id, allFrames)
    if (allFrames[0]) npcSprites.set(id, allFrames[0])
  }

  // sdlpal res.c:295-298:kLoadScene 时把"装载好的精灵总帧数"回填进 EventObject.nSpriteFramesAuto
  // (PAL_NPCWalkOneStep 对 nSpriteFrames==0 的对象用它取模推帧 — 血池冒泡/血柱等氛围动画)。
  // 注入查询器后,hydrateNpcStaticDefaults(三条装载路径都会调)即可回填;初始 scene 的 gs.npcs
  // 在 map 装配前已建好 → 这里补跑一次(幂等,scene dump 与 gs.npcs 都在闭包内)。
  setSpriteFrameCountProvider((spriteNum) => npcSpriteFrames.get(spriteNum)?.length)
  hydrateNpcStaticDefaults(gs.npcs, scene.eventObjects)

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
    // C6:PlayerStatus 毒 row(uigame.c:1245-1253)— object-poisons.json id→{level,color}。
    objectPoisons: new Map(objectPoisons.map((p) => [p.id, { level: p.level, color: p.color }])),
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
    uiSpriteFrames: assets.uiSpriteFrames, // D17b:伤害数字弹幕用 UI sprite 数字帧
    itemIcons: assets.itemIcons, // itemmenu.c:战斗使用/投掷菜单选中物品的 BALL 图标
    effectSprite: assets.effectSprite, // D17a:物理攻击命中特效 overlay sprite(chunk 10)
    magicSprites: assets.magicSprites, // D17:法术 FIRE.MKF sprite overlay(chunk = magic.effect)
    dialogAssets, // 战斗内对话(scriptOnReady/scriptOnTurnStart showDialog)复用大世界 portrait/icon 渲染
    // 毒头像染色表(PAL_PlayerInfoBox 中毒/死亡 mono 重染,uibattle.c:114-162)。
    objectPoisons: new Map(objectPoisons.map((p) => [p.id, { level: p.level, color: p.color }])),
  }

  // D17:FIRE.MKF magic sprite 帧数 Map(chunk → frameCount)— performMagic OffMagic 时间线取 n。
  const magicSpriteFrameCounts = new Map<number, number>()
  for (const [chunk, sprite] of assets.magicSprites) {
    magicSpriteFrameCounts.set(chunk, sprite.frames.length)
  }

  // 召唤神精灵帧数 Map(F.MKF chunk = magic.special+10 → frameCount)— performMagic 召唤动画取逐帧 loop 帧数。
  //   召唤神精灵存于 battleSprites 'player-{chunk}'(F.MKF dump-all,chunk 10..18 = 9 个召唤神)。
  const summonSpriteFrameCounts = new Map<number, number>()
  for (const [key, sprite] of battleSprites) {
    const m = /^player-(\d+)$/.exec(key)
    if (m) summonSpriteFrameCounts.set(Number(m[1]), sprite.frames.length)
  }

  // M8:敌方混乱攻击火花 Y 需 PAL_RLEGetHeight(frame0)(fight.c:4614),从预载 ABC.MKF frame0 取。
  const enemySpriteFrameHeights = new Map<number, number>()
  for (const [key, sprite] of battleSprites) {
    const m = /^enemy-(\d+)$/.exec(key)
    const first = sprite.frames[0]
    if (m && first) enemySpriteFrameHeights.set(Number(m[1]), first.height)
  }

  const bus = createCommandBus()
  const input = new KeyboardInputSource(window)
  // M6 音频:shell 层 Web Audio。core 发意图(gs.pendingSounds SFX 队列 / gs.wNumMusic BGM),
  //   每帧 onPresent 调 audio.sync 消费。首个 keydown resume AudioContext(浏览器 autoplay policy)。
  const audio = createAudioManager('/extracted')
  // BGM 后端:SpessaSynth 运行时 MIDI 合成(直接播 Musics/{NNN}.mid,开箱即响)。
  //   public/soundfont.sf3 已随仓库提供;缺失则 BGM 静默 + warn,见 audio-midi.ts。worklet 已 vendored 到 public/。
  audio.setMusicBackend(createSpessaSynthBackend({
    baseUrl: '/extracted',
    workletUrl: '/spessasynth_processor.min.js',
    soundfontUrl: '/soundfont.sf3',
    soundfontData, // bootstrap 顶部预取(boot 进度条覆盖),init 不再二次 fetch 32MB
  }))
  // autoplay 解锁:浏览器要求 AudioContext 在用户手势后 resume。**不能用 { once:true } 只听首个
  //   keydown** —— 若首个手势是鼠标点击(如点 devpanel 触发战斗/BGM)keydown 不触发,ctx 永久挂起
  //   → BGM/SFX 全哑(user 2026-06-03 实测控制台 "AudioContext was not allowed to start")。改:
  //   keydown + pointerdown 都听、**持续触发**(audio.resume 内部 + backend.resume 都有 suspended 守卫,
  //   解锁后重复调是 no-op,不会重启 BGM)。
  const unlockAudio = (): void => audio.resume()
  window.addEventListener('keydown', unlockAudio, { capture: true })
  window.addEventListener('pointerdown', unlockAudio, { capture: true })

  // SW 预缓存让路:跟踪 suspendRaf 变化(下方 onPresent 据此 pause/resume 预缓存)。
  let _lastSuspendForPrecache = false
  const loopCtx: LoopContext = {
    gs,
    bus,
    input,
    tilemap,
    eventCommands,
    labelMap,
    partyWalkFrames,
    onPresent: (drained, ticked) => {
      // 音频同步必须在 suspendRaf gate 前跑:山神庙传剑等 modal CG/RNG 播放期间仍会有脚本
      // 设置 BGM/SFX。只暂停 canvas present,不能暂停 audio drain,否则声音会等 CG 结束后才一起触发。
      syncShellAudio(audio, gs, drained, playerRoles)
      // SW 预缓存让路:modal(开场视频/CG/RNG/FBP/结局动画 suspendRaf)独占期间暂停预缓存,不抢视频
      // Range 请求 / 用户输入的带宽 IO(否则点击「进入游戏」/ 空格跳过视频后延迟很大,2026-06-15)。
      // dev 无 SW → pause/resume no-op。加载页(虚线后)raf 未起,此处不跑 → SW 全速,竞速可等满。
      const suspendForPrecache = !!gs.suspendRaf
      if (suspendForPrecache !== _lastSuspendForPrecache) {
        _lastSuspendForPrecache = suspendForPrecache
        if (suspendForPrecache) pausePrecache()
        else resumePrecache()
      }
      // suspendRaf 期间:modal 播放器(AVI / trademark / splash / RNG / FBP / 结局动画)**独占** canvas,
      // 自管 fb + flushToCanvas。主循环这里**完全不碰 canvas** —— 否则下面的 flushToCanvas 会用 gs.palette
      // (场景调色板)重刷 fb,跟 modal 播放器的 flush(各自 palette)互抢 → 画面在两套色表间闪烁
      //(2026-05-29 user 从 devpanel 触发开场 DOS 时发现"正常↔偏红"闪烁;开机时 raf 还没起所以不显)。
      if (gs.suspendRaf) return
      // 按 gs.mode 路由 present:battle → presentBattleFrame(消费 commands 进 floating nums);
      // 否则走 explore/event 路径 presentFrame(commands 由 M2 EventSystem 直接消费 GameState)
      if (!presentBattleFrame(fb, gs, battlePresent, battleAssets, drained, ticked)) {
        presentFrame(fb, gs, presentCtx, ticked)
      }
      // M4 P3.T2: gs.palette 由 setPalette opcode handler 异步写入;优先用它,否则 fallback 到初始 palette。
      // dialog 等键时,applyDialogIconPaletteShift 套瞬态 palette 轮转(sdlpal text.c:1408-1426 箭头闪烁)。
      flushToCanvas(fb, canvasCtx, applyDialogIconPaletteShift(gs, gs.palette ?? palette))
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
      if (!frames[0]) return
      // Sync.2 fix3 pose:存全帧 + frame 0。逐帧 anchor(爬行 chunk193 各帧高度 31~73 不等,
      // 必须每帧用自身高度,否则高帧脚底下溢 = 密道攀爬偏下 bug)— 见 toSpriteImages。
      const allFrames: NpcSprite[] = toSpriteImages(frames)
      npcSpriteFrames.set(id, allFrames)
      npcSprites.set(id, allFrames[0]!)
    } catch (err) {
      console.warn(`[bootstrap] scene-jump sprite ${id} fetch failed, skip:`, err)
    }
  }

  async function ensurePlayerSpritesLoaded(): Promise<void> {
    const ids = new Set<number>()
    for (const roleId of gs.partyMembers) {
      const spriteId = getOverworldSpriteNum(gs, roleId, playerRoles)
      if (spriteId && spriteId > 0 && !npcSpriteFrames.has(spriteId)) ids.add(spriteId)
    }
    if (ids.size > 0) await Promise.all([...ids].map((id) => fetchMissingSprite(id)))
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
      return r.json() as Promise<{
        mapNum: number
        eventObjects: SceneEventObject[]
        onEnterLabel?: string
        onTeleportLabel?: string
      }>
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
      mapNum: sceneJson.mapNum, // 场景名按 mapNum 命名(tools/map-names) + scene-system.getCurrentMapNum
      tilemap: tilemapJson,
      palette,
      eventObjects: sceneJson.eventObjects,
      npcSprites: new Map<number, SpriteAsset>(),
      eventCommands,
      labelMap: sceneLabelMap,
      // P0.e: 透传 wScriptOnEnter label → loadScene 跑 enter script 设 party 起点
      onEnterLabel: sceneJson.onEnterLabel,
      // 0x38 归隐脱出:透传 wScriptOnTeleport label → loadSceneCommon 解析缓存 gs.sceneOnTeleportEntry
      onTeleportLabel: sceneJson.onTeleportLabel,
    }
  }
  // LRU 上限:保留最近 N 个 scene 的资源(SceneAssets 元数据 + 联动的解码 tile 位图)。
  // 全 223 scene 的 tile 位图解码后常驻可达 ~100MB(每 scene ~450 tile × ~1KB);保留最近 16 个
  //(≈ 来回横跳的活动范围)平衡内存与重访 re-fetch 成本。淘汰联动:onEvict 同步释放
  // tileImagesBySceneId 对应条目 —— 必须一致,否则 SceneAssets 命中会跳过 sceneFetcher 内的
  // fetchSceneTileImages → tileImages 缺失 → 黑屏无 tile。protect=currentSceneId 保证正在渲染的
  // 场景即使在 LRU 端也永不被淘汰。
  const MAX_SCENE_CACHE = 16
  const sceneAssetsCache = new SceneAssetsCache(sceneFetcher, {
    maxEntries: MAX_SCENE_CACHE,
    onEvict: (sceneId) => {
      tileImagesBySceneId.delete(sceneId)
    },
    protect: () => currentSceneId,
  })

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

  // ── dev 场景缩略图(setupDevPanel.renderSceneThumbnail)─────────────────────────
  // 把整张 map tilemap(≤64×128 → ~2080×2080 px)渲染到离屏大 framebuffer,再降采样成 96px PNG dataURL。
  // **按 mapNum 缓存**(同 map 多场景共享缩略图);解码的 tile 位图渲染完即弃(只留 dataURL),不写
  // gameplay 的 tileImagesBySceneId / sceneAssetsCache(LRU 16),避免污染正在玩的场景缓存。
  // 并发限 2 + 同 map dedup —— 防 IntersectionObserver 一次滚入多卡片时 N×数百 tile PNG 同时 fetch。
  const THUMB_TILE_W = 32
  const THUMB_TILE_H = 16
  const THUMB_OUT_W = 96
  const thumbCache = new Map<string, string>() // `${mapNum}_${outW}` → dataURL(仅缓存成功)
  const thumbInflight = new Map<string, Promise<string | null>>()
  let thumbActive = 0
  const thumbWaiters: (() => void)[] = []
  const THUMB_CONCURRENCY = 2
  const acquireThumb = async (): Promise<void> => {
    if (thumbActive < THUMB_CONCURRENCY) {
      thumbActive++
      return
    }
    await new Promise<void>((res) => thumbWaiters.push(res)) // 槽位由 release 转移,不再自增
  }
  const releaseThumb = (): void => {
    const w = thumbWaiters.shift()
    if (w) w()
    else thumbActive--
  }

  async function renderMapThumbnail(
    mapNum: number,
    paletteOverride?: Palette,
    outW: number = THUMB_OUT_W,
  ): Promise<string | null> {
    const tilemapJson = await fetch(`${BASE}/data/tilemap/${mapNum}.json`).then((r) => {
      if (!r.ok) throw new Error(`tilemap-${mapNum}.json fetch failed (${r.status})`)
      return r.json() as Promise<Tilemap & { tilesetFiles?: string[] }>
    })
    // tile PNG 解码 → 本地 transient Map(渲染后即弃)。复用 gameplay 同模式 regex 取 tile id。
    const tileImgs = new Map<number, IndexedImage>()
    await Promise.all(
      (tilemapJson.tilesetFiles ?? []).map(async (name) => {
        const r = await fetch(`${BASE}/images/${name}`)
        if (!r.ok) return
        const m = /tile-(\d+)\.png$/.exec(name)
        if (m) tileImgs.set(Number(m[1]), await decodePngToIndices(await r.blob()))
      }),
    )
    // 整张 map 渲染:留小边距(fence/sub-row 落在 -16/-8),camera 偏移让左上 tile 进画。
    const bufW = (tilemapJson.width + 1) * THUMB_TILE_W
    const bufH = (tilemapJson.height + 2) * THUMB_TILE_H
    const tfb = createFramebuffer(bufW, bufH)
    const camera = { x: -THUMB_TILE_W / 2, y: -THUMB_TILE_H }
    const tiles = { get: (i: number): IndexedImage | undefined => tileImgs.get(i) }
    drawTilemap(tfb, tilemapJson, tiles, camera, 0)
    drawTilemap(tfb, tilemapJson, tiles, camera, 1)
    // 大 canvas(putImageData 全分辨率)→ 降采样小 canvas → dataURL。用首屏 palette(与 dev jump 渲染同源)。
    const full = document.createElement('canvas')
    full.width = bufW
    full.height = bufH
    const fctx = full.getContext('2d')
    if (!fctx) return null
    fctx.putImageData(tfb.toImageData(paletteOverride ?? palette), 0, 0)
    const scale = outW / bufW
    const thumb = document.createElement('canvas')
    thumb.width = outW
    thumb.height = Math.max(1, Math.round(bufH * scale))
    const tctx = thumb.getContext('2d')
    if (!tctx) return null
    tctx.imageSmoothingEnabled = true
    tctx.imageSmoothingQuality = 'high'
    tctx.drawImage(full, 0, 0, thumb.width, thumb.height)
    return thumb.toDataURL('image/png')
  }

  const renderSceneThumbnail = async (
    sceneId: number,
    mapNum?: number,
    outW: number = THUMB_OUT_W, // dev picker 用默认 96;小地图传 256(高清)
  ): Promise<string | null> => {
    let map = mapNum
    if (map === undefined) {
      // scene-jumps 多数带 mapNum;缺则 fetch scene json 拿。
      const sj = await fetch(`${BASE}/data/scene/${sceneId}.json`)
        .then((r) => (r.ok ? (r.json() as Promise<{ mapNum: number }>) : null))
        .catch(() => null)
      map = sj?.mapNum
    }
    if (map === undefined) return null
    const cacheKey = `${map}_${outW}` // 不同分辨率分开缓存(dev 96 / 小地图 256 不串)
    const cached = thumbCache.get(cacheKey)
    if (cached) return cached
    const inflight = thumbInflight.get(cacheKey)
    if (inflight) return inflight
    const mapNumResolved = map
    const p = (async (): Promise<string | null> => {
      await acquireThumb()
      try {
        const url = await renderMapThumbnail(mapNumResolved, undefined, outW)
        if (url) thumbCache.set(cacheKey, url)
        return url
      } catch (e) {
        console.warn(`[dev-panel] 缩略图渲染失败 map ${mapNumResolved}:`, e)
        return null
      } finally {
        releaseThumb()
        thumbInflight.delete(cacheKey)
      }
    })()
    thumbInflight.set(cacheKey, p)
    return p
  }

  // 扫新 scene eventCommands 的 setPlayerSprite(opcode 0x65)预 fetch cutscene sprite group。
  async function preloadCutsceneSprites(commands: Command[]): Promise<void> {
    const ids = new Set<number>()
    for (const cmd of commands) {
      if (cmd.op === 'raw' && cmd.opcode === 0x0065) {
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
  /**
   * 公共 scene reload helper。
   * - opcode 0x59 loadScene 走 `fromSavedGame=false`:重置 npcs(从 scene dump)+ 跑 onEnter
   * - C8 SystemMenu Load 走 `fromSavedGame=true`:**保留** SAVEDGAME 内 npcs / mode / eventCursor,
   *   只 fetch scene assets + apply present(不跑 onEnter,玩家保存时未必在 onEnter)
   */
  async function loadSceneCommon(
    newWNumScene: number,
    opts: { fromSavedGame: boolean } = { fromSavedGame: false },
  ): Promise<void> {
    const dumpFileIndex = newWNumScene - 1
    // P2#7:async 加载窗口起手设 sceneLoading=true(loadScene opcode 已设过,这里覆盖初始 / skip-intro /
    // loadGame 路径)→ present 保留旧帧(供 fadeScreen backup)。冻到 onEnter 第一个可渲染 yield 才清。
    gs.sceneLoading = true
    const sceneAssets = await sceneAssetsCache.loadScene(dumpFileIndex)
    gs.wNumScene = newWNumScene
    setCurrentMapNum(sceneAssets.mapNum) // 同步当前 mapNum:小地图底图 / 地图名 / 历史对话按 map 分组都读它(此前仅 scene-system.loadScene 设,opcode/读档路径漏设→停 0 梦境)
    // DM25:res.c:236-240 `if (fEnteringScene) { wScreenWave = 0; sWaveProgression = 0; }` ——
    //   换场景(传送/0x59)即清屏波,上一场景的 0x71 常驻波不跨场景。读档(fromSavedGame)路径
    //   C 中 fEnteringScene=FALSE 不清(波从存档恢复),与此分支一致。
    if (!opts.fromSavedGame) {
      gs.wScreenWave = 0
      gs.sWaveProgression = 0
    }
    gs.gameOverActive = false // 死亡读档 → 新场景加载 → 清 game-over 演出标记(present 恢复正常渲染)
    gs.deathHoldActive = false // 同清过渡帧 hold(残留会冻住新场景渲染)
    // 0x38 归隐脱出:缓存当前场景 base onTeleport 全局 entry(onTeleportLabel L_<n>→n;无则 0)。
    //   sdlpal g.rgScene[wNumScene-1].wScriptOnTeleport;0x6D op2 override 优先。
    gs.sceneOnTeleportEntry = sceneAssets.onTeleportLabel
      ? (getGlobalLabelMap()[sceneAssets.onTeleportLabel] ?? 0)
      : 0
    // 新 scene 的 commands + labelMap 写入 gs(autoScript runner 用)
    gs.sceneCommands = sceneAssets.eventCommands
    gs.sceneLabelMap = sceneAssets.labelMap
    // 特效 A(2026-05-29):更新 basePalette = 场景调色板(fade target 参照;0x51 FadeIn / 0x93 SceneFade /
    //   0x8C ColorFade / 0x4F FadeToRed 据此算目标色)。pristine 引用,fade 不动它(gs.palette 才是工作副本)。
    //   gs.palette(屏幕)不在此重置 —— 仍由 onEnter 的 0x8B setPalette / fade opcode 管理(避免改既有行为)。
    gs.basePalette = sceneAssets.palette
    // opcode 0x6D 设的 onEnter 全局 override → 解析为本 scene local ip,写入 sceneOnEnterIp(消耗 override)。
    // override===0(清)→ -1 哨兵(下方 onEnter setup 视作"无 onEnter")。
    const oeOverride = gs.sceneOnEnterOverride?.[newWNumScene]
    if (oeOverride !== undefined) {
      delete gs.sceneOnEnterOverride![newWNumScene]
      // 0x6D override(operands[1])是绝对 script entry 号 = 全局数组下标(L_<n>→n 恒等,见 jumpToGlobalIp
      // event-system.ts:2220)。**直接用**,不查 `L_<n>` label —— 仅被 0x6D 引用的 entry(如香兰报信
      // cutscene entry 903)在反汇编里没打 label,查表必 →undefined→ -1 → onEnter 漏触发
      // (bug:码头对话讲传说 NPC 设 0x6D[5,903,0],重进 scene5 香兰应报"李大娘病了",旧码 L_903 不存在 → 不触发)。
      gs.sceneOnEnterIp[newWNumScene] = oeOverride === 0 ? -1 : oeOverride
    }
    if (!opts.fromSavedGame) {
      // 忠实全局 event object 数组(sdlpal lprgEventObject):gs.npcs = 当前 scene 切片
      //(引用 gs.allEventObjects 元素 → 脚本改动持久,重进保留)。
      // gs.sceneLabelMap 已在上面设为新 scene → 切片内 autoCursor 延迟解析用对的 labelMap。
      // 全局表缺失则兜底从 scene dump 建(退化为非持久)。
      gs.npcs =
        sliceSceneEventObjects(gs, newWNumScene) ??
        sceneAssets.eventObjects.map((eo) => npcFromEventObject(eo, sceneAssets.labelMap))
      hydrateNpcStaticDefaults(gs.npcs, sceneAssets.eventObjects)
    } else {
      // C8 load game 路径:存档 JSON.stringify 会断开 gs.npcs 与 gs.allEventObjects 的引用。
      // 从加载回的 gs.allEventObjects 重切当前 scene → 重建引用(状态一致,后续脚本改动持久)。
      // 旧档无 allEventObjects → sliceSceneEventObjects 返 undefined → 保留存档内 gs.npcs。
      const reslice = sliceSceneEventObjects(gs, newWNumScene)
      if (reslice) gs.npcs = reslice
      hydrateNpcStaticDefaults(gs.npcs, sceneAssets.eventObjects)
    }
    applySceneAssetsToPresent(sceneAssets)
    await preloadCutsceneSprites(sceneAssets.eventCommands)
    await ensurePlayerSpritesLoaded()
    // P2#7:**不**在此清 sceneLoading(那样 onEnter 的 setPartyPos 还没跑,camera 在旧坐标 → 渲染
    // 出"其他地方坐标的场景"再跳。保持冻到 onEnter 的第一个可渲染 yield:fadeScreen(event-system 清)/
    // showDialog(event-system 清,content-no-fade 场景)/ onEnter-end(幂等清)。setPartyPos 是非等待
    // opcode,在那之前跑完 → camera 已对。no-onEnter 场景(下方 else)立即清。
    if (!opts.fromSavedGame) {
      // 正常 loadScene:跑 onEnter。入口优先级(sdlpal play.c:64 真值):
      //   sceneOnEnterIp(持久化:上次跑完存回 / 0x6D override 解析后,-1=无 onEnter)> onEnterLabel。
      // 重进已播过的 cutscene scene → 入口已被推进到 0x00 stop → 不重播(开场只播一次)。
      const persistedIp = gs.sceneOnEnterIp[newWNumScene] // P2#5:已是全局 ip
      const labelIp = sceneAssets.onEnterLabel
        ? getGlobalLabelMap()[sceneAssets.onEnterLabel] // P2#5:onEnterLabel = L_<global> → 全局 ip
        : undefined
      const ip = persistedIp ?? labelIp
      if (ip !== undefined && ip >= 0) {
        // ip === -1 = 0x6D 清的"无 onEnter"
        gs.eventCursor = {
          ip, // P2#5:全局 ip,默认读全局数组(不内嵌 commands/labelMap)
          onEnterSceneId: newWNumScene,
          onEnterStartIp: ip,
        }
        gs.mode = 'event'
        // P2#7:onEnter 冻屏中跑(setPartyPos 等定位 opcode),到第一个可渲染 yield 才清 sceneLoading 解冻:
        // fade-first onEnter → fadeScreen 清(camera 已对,present 从冻屏旧帧拷 backup 渐变到新场景);
        // content-no-fade onEnter → showDialog 清(对话正常显示,scene 14 修复)。
      } else {
        // 无 onEnter script(door 切换):无 fadeScreen/dialog 来解冻 → 立即清 sceneLoading 渲染新场景。
        gs.eventCursor = undefined
        gs.mode = 'explore'
        gs.sceneLoading = false
      }
    } else {
      // fromSavedGame:无 onEnter,assets 已应用 → 立即清渲染(SAVEDGAME 已恢复 party/mode)。
      gs.sceneLoading = false
    }
    // fromSavedGame:**不**跑 onEnter — SAVEDGAME 内 gs.mode / gs.eventCursor 已恢复
  }

  setSceneLoader(async (newWNumScene: number) => {
    await loadSceneCommon(newWNumScene, { fromSavedGame: false })
  })

  // opcode 0x99(changeMap)op0==0xFFFF:map-only 重载当前场景 tilemap(不重跑 onEnter / 不重置 npcs)。
  // 删当前 scene 的 tile cache 强制重 fetch(同 sceneId 不同 mapNum)→ 换 presentCtx.tilemap + scene-system。
  setMapReloader(async (mapNum: number) => {
    const tilemapJson = await fetch(`${BASE}/data/tilemap/${mapNum}.json`).then((r) => {
      if (!r.ok) throw new Error(`tilemap-${mapNum}.json fetch failed (${r.status})`)
      return r.json() as Promise<Tilemap & { tilesetFiles?: string[] }>
    })
    tileImagesBySceneId.delete(currentSceneId) // 强制重 fetch(fetchSceneTileImages 有 cache)
    await fetchSceneTileImages(currentSceneId, tilemapJson)
    presentCtx.tilemap = tilemapJson
    setSceneContext({
      tilemap: tilemapJson,
      eventCommands: gs.sceneCommands ?? [],
      labelMap: gs.sceneLabelMap ?? {},
    })
  })

  // opcode 0x4C MonsterChasePlayer 障碍检测注入(port sdlpal PAL_CheckObstacle)。
  //   checkObjects=TRUE  → tilemap + 当前 scene event objects(排除自身 selfId)
  //   checkObjects=FALSE → 只查 tilemap(传空 npcs 数组)
  // isWalkable 返 TRUE=可走;PAL_CheckObstacle 返 TRUE=被阻挡 → 取反。
  setObstacleChecker(
    (x, y, checkObjects, selfId) =>
      !isWalkable(presentCtx.tilemap, x, y, checkObjects ? gs.npcs : [], selfId),
  )

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
    // dev 场景名表(scene-names.json,人工补全)+ 场景缩略图渲染器(整 map → 96px dataURL,按 mapNum 缓存)。
    sceneNames,
    renderSceneThumbnail,
    // 队伍 tab 头像 + 物品作弊图标:RGM 头像帧(by role.avatar)/ BALL 物品图标(by item.bitmap)+ 主调色板上色。
    portraitFrames: dialogAssets.portraitFrames,
    itemIcons: assets.itemIcons,
    // 自定义战斗 / boss 入口敌人缩略图:战斗精灵 Map(key enemy-{id} / player-{chunk})。
    battleSprites,
    palette,
    sceneAssetsCache,
    onSceneChanged: applySceneAssetsToPresent,
    onFontTest,
    // devpanel 看开场/结局 AVI 双版:WIN95 走 mp4(1/2=开场,3=新游戏,4/5/6=结局)。
    //   传数组 → 顺序播(结局 WIN95 = 4→5→6,对应 PAL_EndingScreen AVI 序)。suspendRaf 包,播完恢复。
    playVideo: (mp4s) => {
      const list = Array.isArray(mp4s) ? mp4s : [mp4s]
      gs.suspendRaf = true
      void (async () => {
        for (const m of list) await playAvi({ src: `${BASE}/videos/${m}` })
      })()
        .catch((err) => {
          console.warn(`[dev] playVideo failed:`, err)
        })
        .finally(() => {
          gs.suspendRaf = false
        })
    },
    // 开场 DOS 版(trademark RNG chunk 6 + splash 卷轴):任何 build 下都能跑(资产已加载)。
    playDosOpening: () => {
      gs.suspendRaf = true
      void playDosOpening()
        .catch((err) => {
          console.warn('[dev] playDosOpening failed:', err)
        })
        .finally(() => {
          gs.suspendRaf = false
        })
    },
    // 结局 DOS 全片(PAL_EndingScreen DOS 编排:RNG + FadeOut/In + ShowFBP + ScrollFBP + ColorFade + EndingAnim)。
    playDosEnding: () => {
      gs.suspendRaf = true
      void playDosEnding()
        .catch((err) => {
          console.warn('[dev] playDosEnding failed:', err)
        })
        .finally(() => {
          gs.suspendRaf = false
        })
    },
    resources: {
      enemies,
      enemyObjects, // 对话:dev 战斗 enemy scriptOnReady/scriptOnTurnStart(boss 嘲讽)
      enemyTeams,
      battleFields,
      playerRoles,
      levelUpExp: assets.levelUpExp, // D11:dev 战斗胜利升级阈值
      levelUpMagic: assets.levelUpMagic, // D11:dev 战斗升级学法术
      items,
      spells,
      magics,
      objectMagics,
      objectPoisons,
      objectPlayers,
      commands: eventCommands,
      enemyPos, // D17a:dev 战斗也用真 EnemyPos 表(非 fallback)
      battleEffectIndex, // D17a:dev 战斗命中特效帧基号
      magicSpriteFrameCounts, // D17:dev 战斗 OffMagic 时间线 n
      summonSpriteFrameCounts, // 召唤神逐帧 loop 帧数
    },
  })

  // ── 生产工具面板 + 快存快读 + 音量/分辨率(非 DEV 门,生产保留;玩家便利,只读 + 安全动作)──
  const audioVolume = createAudioVolumeController({
    applyVolume: (v) => {
      setBgmVolume(v)
      setOggVolumeScale(v)
    },
  })
  // 音效(SFX)独立音量(sounds/*.wav);自己的 localStorage 键。
  const sfxVolume = createAudioVolumeController({
    applyVolume: setSfxVolume,
    keyVol: 'tp-sfx-volume',
    keyMute: 'tp-sfx-muted',
  })
  const displayScale = createDisplayScaleController(canvas)
  setupToolsPanel({
    getGs: () => gs,
    getResources: () => ({ playerRoles, objectPoisons, items, levelUpExp: assets.levelUpExp }),
    displayScale,
    audioVolume,
    sfxVolume,
    saveSlot: (slot, g) => Save.saveSlot(slot, g),
    // 小地图底图:复用 renderSceneThumbnail,出 640px 高清(= minimap BASE_PX;各缩放档皆降采样=清晰)。
    //   "地图发黑" 真因是 getCurrentMapNum stale 停在 map 0 梦境(已修),非 palette。
    getMapThumbnail: (mapNum) => renderSceneThumbnail(0, mapNum, 640),
  })
  setupQuickSave({
    getGs: () => gs,
    saveSlot: (slot, g) => Save.saveSlot(slot, g),
    loadSlotIntoGame: async (slot) => {
      const loaded = await Save.loadSlot(slot)
      if (!loaded) return false
      await loadGameFromSlot(slot)
      return true
    },
  })

  // M3.5 T19:dev gate 暴露 GameState + assets 供 L2 Playwright helper 用 page.evaluate 探针。
  // 生产构建 dead-code(Vite tree-shake import.meta.env.DEV 分支)。
  // 用 dev-panel.ts 同模式 cast(避免依赖 vite/client triple-slash 类型)。
  if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
    ;(
      window as unknown as {
        __game: { gs: typeof gs; assets: typeof assets; presentCtx: typeof presentCtx }
      }
    ).__game = {
      gs,
      assets,
      presentCtx, // Sync.2 fix10:暴露 npcSpriteFrames 供 e2e verify cutscene sprite 加载
    }
  }

  // M4 P3.T2:注入 fetchPalette(类同 setSceneContext);event-system setPalette handler 用它
  // 异步拉取新调色板 → 写入 gs.palette → 渲染层下一帧 flushToCanvas 消费。
  setFetchPalette(fetchPalette)

  // P2#5(2026-05-29 单一全局脚本数组):events/all.json(= sdlpal 单一 lprgScriptEntry,L_<n>→n 恒等)
  // 是**唯一**脚本来源 — 所有 cursor 以全局 ip 索引它。必须在任何脚本(onEnter/trigger/skip-intro)跑前
  // **await 就绪**(不再 fire-and-forget,否则首个 onEnter 撞空数组)。per-scene / shared 切片已废弃。
  {
    const allRes = await fetch(`${BASE}/events/all.json`)
    if (!allRes.ok)
      throw new Error(`[bootstrap] all.json fetch failed (${allRes.status}) — 脚本系统无法运行`)
    const allJson = (await allRes.json()) as EventFile
    const allCommands = allJson.segments.flatMap((seg) => seg.commands)
    setGlobalEvents(allCommands)
    console.log(
      `[bootstrap] global script array loaded:${allCommands.length} commands(单一全局脚本数组)`,
    )
  }

  // P0.e: 注入 startBattle handler — opcode 7 (raw#7 / op:startBattle) 用。
  // 战斗资源闭包持引用,event-system 不污染 import battle/。
  // sdlpal play.c PAL_StartBattle 取 gpGlobals->wNumBattleField 作 battleFieldId,
  // 该字段由 wScriptOnEnter opcode 0x4A setBattlefield 写入(P0.e 新接)。
  setStartBattleHandler(({ gs, enemyTeamId, isBoss }) => {
    const battleFieldId = gs.wNumBattleField ?? 0
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
        // 架构边界:用 runtime 当前属性(等级/HP/MP/攻防 等)投影战斗 roles,使战斗吃上升级后属性
        //   (原直接传 playerRoles 静态 1 级基线)。staticRoles=playerRoles 供不可变字段(精灵/音效/名字)。
        // D14:第 3 参 gs.rgEquipmentEffect → 战斗 stat = effective(base + 装备 + Extra),mirror sdlpal getter。
        playerRoles: projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, playerRoles, gs.rgEquipmentEffect),
        items,
        spells,
        magics,
        objectMagics, // E2:0x42 SimulateMagic 解析 magic object id
        objectPoisons, // 0x28 apply poison
        objectPlayers, // OBJECT_PLAYER:队友死亡 / 濒死脚本
        enemyPos, // D17a:enemy 初始 pos/posOriginal(battle.c:936-939)
        battleEffectIndex, // D17a:player 攻击命中特效帧基号(fight.c:2055)
        magicSpriteFrameCounts, // D17:OffMagic 时间线 n(FIRE.MKF chunk 帧数)
        summonSpriteFrameCounts, // 召唤神逐帧 loop 帧数(F.MKF chunk 帧数)
        enemySpriteFrameHeights, // M8:enemy frame0 height(PAL_RLEGetHeight)
        levelUpExp: assets.levelUpExp, // D11:战斗胜利升级阈值
        levelUpMagic: assets.levelUpMagic, // D11:升级学新法术
        // P2#5:不再传 per-scene 切片 — startBattle 默认 getGlobalCommands()(战斗脚本是全局 entry)。
        introFadeTicks: INTRO_FADE_TICKS, // D19:生产入场 dither fade-in(present-battle 揭示);单测/dev 不传
      })
    } catch (e) {
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

  // 商店买 / 卖菜单(opcode 0x0026 PAL_BuyMenu / 0x0027 PAL_SellMenu)。event-system 不能 import
  // menu 层,故 bootstrap 注入 handler:开对应 menu(buy 用 store[storeNum] 解析出 Item[])。
  // cursor.waiting='shop' 由 event-system 设;菜单关 → menu-mode resume 切 mode='event' 续跑脚本。
  setShopMenuHandler(({ gs, mode, storeNum }) => {
    if (mode === 'buy') {
      const store = stores[storeNum]
      const shopItems = (store?.items ?? [])
        .map((objId) => items.find((it) => it.id === objId))
        .filter((it): it is (typeof items)[number] => it != null)
      openMenu(gs, { kind: 'shop-buy', state: createBuyMenu(shopItems) })
    } else {
      openMenu(gs, { kind: 'shop-sell', state: createSellMenu(gs, items) })
    }
  })

  // opcode 0x0034(妖魔转化)用 store[0].rgwItems 索引发物品。注入完整 store 表。
  setStoreTable(stores)

  // 毒 OBJECT 表(0x29 apply-player 取 wPlayerScript / cure-by-level 取真 level)。
  setObjectPoisons(objectPoisons)

  // 静态敌人 OBJECT 表(0x90 SetObjectScript 新建 gs.rgObject overlay 时按 OBJECT_ENEMY 布局播种,
  //   battleEnd/ready/抗性不被零填充冲掉;startBattle 开战读 overlay → 刀手/胖苗对话 show-once 跨战斗)。
  setEnemyObjectsTable(enemyObjects)

  // 特效 C:RNG 动画 handler(opcode 0x37 PlayRNG)。event-system 设 cursor.waiting='rng-play' 后调本 handler;
  //   suspendRaf 期间 present 暂停、playRng 自管 fb 直写 + flushToCanvas;播完 finally 清 suspendRaf + waiting 续跑。
  //   speed→frameDelayMs = 1000/speed(sdlpal PAL_RNGPlay iDelay = 1/iSpeed 秒);palette 用当前工作 palette。
  setRngPlayHandler(({ gs, chunkIdx, startFrame, endFrame, speed, fadeIn }) => {
    gs.suspendRaf = true
    void playRng({
      chunkIdx,
      startFrame,
      endFrame,
      frameDelayMs: 1000 / speed,
      initialFadeInMs: fadeIn ? 600 : undefined,
      fb,
      canvasCtx: canvasCtx!,
      palette: gs.palette ?? palette,
      // sdlpal PAL_RNGPlay 每帧 VIDEO_UpdateScreen:0x35 震屏对视频施加 + 递减。
      //   suspendRaf 期间 presentFrame 不跑,不接则计数冻结、震屏泄漏进下一场景(血池演出狂抖)。
      shakeState: gs,
    })
      .catch((err) => {
        console.warn('[bootstrap.rngPlayHandler] playRng failed:', err)
      })
      .finally(() => {
        gs.suspendRaf = false
        if (gs.eventCursor?.waiting === 'rng-play') gs.eventCursor.waiting = undefined
      })
  })

  // 特效 B:FBP 全屏图 handler(opcode 0x76 ShowFBP)。chunk 已提取为 battleBgs(FBP.MKF 全 dump);
  //   有图 → showFbp 真显(DOS 路径 + 可选 dither fade-in);无图(in-game 0xFFFF)→ 全黑(sdlpal 同)。
  //   suspendRaf 期间 showFbp 自管 fb + flushToCanvas;完成 finally 清 suspendRaf + waiting 续跑。
  setShowFbpHandler(({ gs, chunkIdx, fade }) => {
    gs.suspendRaf = true
    const bg = battleBgs.get(chunkIdx)
    void showFbp({
      fbpIndices: bg?.indices ?? new Uint8Array(320 * 200),
      fade,
      chunkNum: chunkIdx,
      isWin95: buildFlag === 'win95',
      fb,
      canvasCtx: canvasCtx!,
      palette: gs.palette ?? palette,
    })
      .catch((err) => {
        console.warn('[bootstrap.showFbpHandler] showFbp failed:', err)
      })
      .finally(() => {
        gs.suspendRaf = false
        if (gs.eventCursor?.waiting === 'show-fbp') gs.eventCursor.waiting = undefined
      })
  })

  // 特效 B:FBP 滚动卷入 handler(opcode 0xA4 ScrollFBP)。同 showFbp 模式,fScrollDown=TRUE(0xA4 真值)。
  setScrollFbpHandler(({ gs, chunkIdx, speed }) => {
    gs.suspendRaf = true
    const bg = battleBgs.get(chunkIdx)
    void scrollFbp({
      fbpIndices: bg?.indices ?? new Uint8Array(320 * 200),
      speed,
      fScrollDown: true,
      fb,
      canvasCtx: canvasCtx!,
      palette: gs.palette ?? palette,
    })
      .catch((err) => {
        console.warn('[bootstrap.scrollFbpHandler] scrollFbp failed:', err)
      })
      .finally(() => {
        gs.suspendRaf = false
        if (gs.eventCursor?.waiting === 'scroll-fbp') gs.eventCursor.waiting = undefined
      })
  })

  // 结局动画 handler(opcode 0x96 PAL_EndingAnimation)。fetch FBP 61/62(battleBgs)+ MGO 571/572 妖兽/女孩
  //   sprite(非预载,按需 fetch sprite/{id}.json + 帧 PNG)→ 跑 400 帧 cutscene。modal,suspendRaf。
  const fetchMgoSprite = async (id: number): Promise<IndexedImage[]> => {
    const meta = await fetch(`${BASE}/data/sprite/${id}.json`).then((r) => {
      if (!r.ok) throw new Error(`sprite ${id}.json ${r.status}`)
      return r.json() as Promise<{ frames: { index: number }[] }>
    })
    return Promise.all(
      meta.frames.map((f) =>
        fetch(`${BASE}/images/world/npc/${id}/frame-${String(f.index).padStart(2, '0')}.png`)
          .then((r) => r.blob())
          .then(decodePngToIndices),
      ),
    )
  }
  setEndingAnimationHandler(({ gs }) => {
    gs.suspendRaf = true
    void (async () => {
      const [beast, girl] = await Promise.all([
        fetchMgoSprite(571).catch(() => [] as IndexedImage[]),
        fetchMgoSprite(572).catch(() => [] as IndexedImage[]),
      ])
      await playEndingAnimation({
        upperIndices: battleBgs.get(61)?.indices ?? new Uint8Array(320 * 200),
        lowerIndices: battleBgs.get(62)?.indices ?? new Uint8Array(320 * 200),
        beastFrames: beast,
        girlFrames: girl,
        fb,
        canvasCtx: canvasCtx!,
        palette: gs.palette ?? palette,
      })
    })()
      .catch((err) => {
        console.warn('[bootstrap.endingAnimationHandler] failed:', err)
      })
      .finally(() => {
        gs.suspendRaf = false
        if (gs.eventCursor?.waiting === 'ending-anim') gs.eventCursor.waiting = undefined
      })
  })

  /**
   * 结局 DOS 全片编排(port sdlpal ending.c:396-512 PAL_EndingScreen 的 DOS fallback 分支)。
   * 一个 suspendRaf 闭包顺序跑全部视觉 beat(RNG/FadeOut-In/ShowFBP/ScrollFBP/ColorFade/EndingAnimation),
   * fade 用阻塞 palette-scale(全程 suspendRaf,不能走 present 驱动)。caller 包 suspendRaf + finally。
   * iCurPlayingRNG=9(追真值:游戏 0xA0 结局前 ip 35576 setRNG chunk 9)。
   * **未做(非视觉/已记)**:音乐(M6 音频系统)、ShowFBP(76) 的 MGO effectSprite 0x27b 叠加(Phase 留)、
   *   WaitForKey(原版等键,这里连续观看用短延时)。
   */
  async function playDosEnding(): Promise<void> {
    const ctx = canvasCtx!
    const BLACK = new Uint8Array(320 * 200)
    const bg = (n: number): Uint8Array => battleBgs.get(n)?.indices ?? BLACK
    const pget = (n: number): Promise<typeof palette> => fetchPalette(n).catch(() => palette)
    const fbp = (
      chunk: number,
      fade: number,
      pal: typeof palette,
      fx?: IndexedImage[],
    ): Promise<void> =>
      showFbp({
        fbpIndices: bg(chunk),
        fade,
        chunkNum: chunk,
        isWin95: false,
        fb,
        canvasCtx: ctx,
        palette: pal,
        effectSpriteFrames: fx,
      })
    const scroll = (chunk: number, pal: typeof palette, fx?: IndexedImage[]): Promise<void> =>
      scrollFbp({
        fbpIndices: bg(chunk),
        speed: 0xf,
        fScrollDown: true,
        fb,
        canvasCtx: ctx,
        palette: pal,
        effectSpriteFrames: fx,
      })
    const rng = (
      chunkIdx: number,
      startFrame: number,
      endFrame: number,
      speed: number,
      pal: typeof palette,
    ): Promise<void> =>
      playRng({
        chunkIdx,
        startFrame,
        endFrame,
        frameDelayMs: 1000 / speed,
        fb,
        canvasCtx: ctx,
        palette: pal,
      })

    // ── Part A(ending.c:420-483)──
    // DL28:各段配乐(ending.c:424/430/448/496 AUDIO_PlayMusic;经 wNumMusic+sync 轮询)。
    const setMus = (n: number): void => {
      gs.wNumMusic = n
      syncShellAudio(audio, gs, [], playerRoles)
    }
    const curPal = gs.palette ?? palette
    setMus(0x1a) // 哭戏段(ending.c:424)
    await rng(9, 110, 150, 7, curPal)
    await rng(9, 151, -1, 9, curPal)
    await fadeOutBlocking(fb, ctx, curPal, 1200) // FadeOut(2)
    const pal5 = await pget(5)
    setMus(0x19) // ending.c:430
    await fbp(75, 0, pal5)
    await fadeInBlocking(fb, ctx, pal5, 600) // FadeIn(5,1)
    await scroll(74, pal5)
    await fadeOutBlocking(fb, ctx, pal5, 600) // FadeOut(1)
    const pal4 = await pget(4)
    const [beast, girl] = await Promise.all([
      fetchMgoSprite(571).catch(() => [] as IndexedImage[]),
      fetchMgoSprite(572).catch(() => [] as IndexedImage[]),
    ])
    await playEndingAnimation({
      upperIndices: bg(61),
      lowerIndices: bg(62),
      beastFrames: beast,
      girlFrames: girl,
      fb,
      canvasCtx: ctx,
      palette: pal4,
    })
    setMus(0) // ending.c:443 停乐(fade 2s;MIDI 后端忠实硬停)
    await colorFadeBlocking(fb, ctx, pal4, 15, 64 * 70) // ColorFade(7,15)
    const pal0 = await pget(0)
    setMus(0x11) // ending.c:448
    await rng(11, 0, -1, 7, pal0)
    await fadeOutBlocking(fb, ctx, pal0, 1200) // FadeOut(2)
    const pal8 = await pget(8)
    // DL28:fNeedToFadeIn(ending.c:459)→ RNG 首帧 600ms 淡入(rng-player initialFadeInMs)。
    await playRng({ chunkIdx: 10, startFrame: 0, endFrame: -1, frameDelayMs: 1000 / 6, fb, canvasCtx: ctx, palette: pal8, initialFadeInMs: 600 })
    await fbp(77, 10, pal8) // EndingSetEffectSprite(0) → 无叠加
    // EndingSetEffectSprite(0x27b=635):76/73/72/71/68@7 全 sticky 叠这只 21 帧 MGO 精灵(ending.c:467-475)
    const fx635 = await fetchMgoSprite(635).catch(() => [] as IndexedImage[])
    await fbp(76, 7, pal8, fx635)
    const pal5b = await pget(5)
    await fbp(73, 7, pal5b, fx635)
    await scroll(72, pal5b, fx635)
    await fbp(71, 7, pal5b, fx635)
    await fbp(68, 7, pal5b, fx635)
    await fbp(68, 6, pal5b) // EndingSetEffectSprite(0) → 无叠加(ending.c:477)
    await waitForKey() // sdlpal PAL_WaitForKey(0):等玩家按键再放演职员表(ending.c:480)
    setMus(0) // ending.c:481 停乐

    // ── Part B(ending.c:485-511,演职员表卷动 67→59)──
    setMus(9) // ending.c:496 演职员表曲
    for (const c of [67, 66, 65, 64, 63, 62, 61, 60, 59]) {
      await scroll(c, pal5b)
    }
    setMus(0) // ending.c:509 停乐
    await fadeOutBlocking(fb, ctx, pal5b, 1800) // FadeOut(3)
  }

  // Sync.2 fix4+:扫 setPlayerSprite(opcode 0x65)的 sprite id,预 fetch。
  //   操作:operand[0]=roleId, operand[1]=spriteId;任何队员都可能被剧情换形象。
  // present.ts 渲染时按当前 roleId 的 runtime rgwSpriteNum → ctx.npcSpriteFrames.get(spriteId);
  //   若未预 fetch → 取不到 override 帧 → role0 兜底画成默认(可见)精灵,不会消失。
  // **扫全局 all.json(getGlobalCommands),非仅首屏 scene(2026-06-08 林家堡 bug)**:
  //   李逍遥变蛇逃跑过场走出后 `0x65[0,232]` 把队首换成**1×1 空精灵 232(隐身)**让他消失,loadScene 前
  //   再 `0x65[0,2]` 换回。这段在全局脚本里,旧码只扫首屏 eventCommands → 232 漏载 → 李逍遥不消失(user 报)。
  const cutsceneSpriteIds = new Set<number>()
  for (const cmd of getGlobalCommands()) {
    if (cmd.op === 'raw' && cmd.opcode === 0x0065) {
      const spriteId = cmd.operands[1] ?? 0
      if (spriteId > 0 && !npcSpriteFrames.has(spriteId)) {
        cutsceneSpriteIds.add(spriteId)
      }
    }
  }
  if (cutsceneSpriteIds.size > 0) {
    console.log(`[bootstrap] preloading ${cutsceneSpriteIds.size} cutscene party sprite(s):`, [
      ...cutsceneSpriteIds,
    ])
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
    // H1(2026-06-07 sdlpal 差异审查):对齐 PAL_LoadDefaultGame(global.c:434-465)— 重置玩家进度
    //   字段(金钱/背包/毒/队伍/trail/采集值/昼夜/层/跟随/追击/调色板/音乐/战速)+ hydrate
    //   PlayerRoles 基线到 gs.PlayerRolesRuntime + 设 8 类经验 wLevel = 各角色等级。
    //   通关 / 系统菜单退出回标题后再开新游戏时,returnToTitle 只重置 cursor/menu/mode,gs 仍带
    //   上一局脏数据 —— loadDefaultGame 清掉它,否则满背包 / 满金钱 / 满经验开局(回归测试见 game-state.test.ts)。
    loadDefaultGame(gs, playerRoles)
    // C5(2026-05-28):PAL_LoadDefaultGame 真值随后调 PAL_UpdateEquipments(global.c:1333)— 跨
    //   role × 6 part 跑每件装备 scriptOnEquip 累加 stat 到 rgEquipmentEffect,否则 effective
    //   Atk/Def/Mag 等 stat getter 永远 = base(D14 装备 effect 根因)。
    updateAllEquipments(gs, items)
    // H1 续(2026-06-07):scene 运行时复位到 primary。通关 / 系统菜单退出回标题后再开新游戏时,gs 仍带
    //   上一局的 wNumScene / npcs / allEventObjects / scene flag —— 对齐启动顶层(250-288)复位,否则
    //   onEnter 在脏场景号上跑、NPC 错乱、对象状态(李大娘走了 / 宝箱开了)残留、清掉的 onEnter 停点让开场不重播。
    //   首次启动时 gs 本就干净 → 以下复位全部幂等。
    resetSceneRuntimeForNewGame(gs, initialEventObjects)
    // 先回到稳定探索态;正常序章下方会再切 event,skip-intro 同步跑完 enter script 后则保持 explore。
    gs.mode = 'explore'
    gs.wNumScene = SCENE_ID + 1
    setCurrentMapNum(scene.mapNum) // 同步当前 mapNum(小地图底图/地图名/对话按 map 分组);new-game/skip-intro 此路径此前漏设 → 停 0 梦境
    gs.sceneCommands = eventCommands
    gs.sceneLabelMap = labelMap
    gs.basePalette = palette
    gs.npcs =
      sliceSceneEventObjects(gs, gs.wNumScene) ??
      scene.eventObjects.map((eo) => npcFromEventObject(eo, labelMap))
    hydrateNpcStaticDefaults(gs.npcs, scene.eventObjects)
    // 渲染路由复位到 primary scene(等价 applySceneAssetsToPresent;scene 闭包是 SceneObjects 无
    //   tilemap/palette,故用 loadAll 顶层 primary tilemap)。
    presentCtx.tilemap = tilemap
    currentSceneId = SCENE_ID
    setSceneContext({ tilemap, eventCommands, labelMap })
    // 结局 / 死亡演出可能把工作 palette 留在黑色、红色或其他场景色;新游戏从 primary palette 重建。
    gs.palette = makeWorkingPalette(palette)

    if (scene.onEnterLabel) {
      const ip = getGlobalLabelMap()[scene.onEnterLabel] // P2#5:onEnterLabel = L_<global> → 全局 ip
      if (ip !== undefined) {
        if (skipIntroBoot) {
          // skip-intro: 同步跑 enter script,只取 setPartyPos/Direction,跳过对话(scene 1 客栈)。
          // 传 sceneId(gs.wNumScene)→ 跑完持久化 onEnter 停点,重进 scene 不重播开场
          // (否则从大厅进客栈时 onEnter 重放传说 + setPartyPos 把人拉回起点,覆盖门的落点)。
          const overrideIp = gs.sceneOnEnterIp[gs.wNumScene]
          runEnterScript(gs, undefined, undefined, overrideIp ?? ip, gs.wNumScene) // P2#5:默认全局数组
        } else {
          // 正常启动:跑完整 onEnter script(scene 0 梦境对话)— tickEventSystem 步进。
          // 打 onEnter tag → 'end' 持久化停点,scene 0 也不重播(同 loadScene 路径)。
          const overrideIp = gs.sceneOnEnterIp[gs.wNumScene]
          const startIp = overrideIp ?? ip
          gs.eventCursor = {
            ip: startIp, // P2#5:全局 ip,默认读全局数组
            onEnterSceneId: gs.wNumScene,
            onEnterStartIp: startIp,
          }
          gs.mode = 'event'
        }
      }
    }
    // 清 OpeningMenu(若有);startNewGameFromPrimary 由 OpeningMenu 触发时 menuStack 非空
    gs.menuStack = []
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
    } finally {
      // 3.mp4 是 <video> 浮层,suspendRaf 期间 canvas 底下残留的是 OpeningMenu 那一帧(菜单是 AVI 前
      // 最后 flush 的)。video 一移除到下一 raf 画梦境之间会露出旧菜单 → 闪一帧(user 2026-06-02 报)。
      // 恢复渲染前先把 canvas 清成黑:过渡变 菜单→[3.mp4]→黑→梦境,无菜单残帧。
      //   对齐 sdlpal:PAL_PlayAVI 结束屏幕本就黑屏,随后 PAL_MakeScene 淡入(黑过渡忠实)。
      fb.clear()
      flushToCanvas(fb, canvasCtx!, gs.palette ?? palette)
      gs.suspendRaf = false
    }
  }

  /**
   * C8(2026-05-29):大世界 SystemMenu Load + OpeningMenu Load 共享 — sdlpal
   * `PAL_ReloadInNextTick`(global.c:888)真值:fEnteringScene + fNeedToFadeIn +
   * SetLoadFlags(GlobalData | Scene | PlayerSprite),下一 tick 主循环 reload。
   *
   * ts 端整套:Save.loadSlot → gs 字段全替换 → sceneLoader callback 重 load 当前 scene。
   * Object.assign 后到新 scene assets ready 前,canvas 必须保持黑屏:否则旧 framebuffer 会被存档 palette
   * 先重染一帧(白天读夜档会先变夜;死亡读档会露战斗帧),再进入目标场景。
   */
  async function loadGameFromSlot(slot: number): Promise<void> {
    // DM26/DLg:读档起手停乐(uigame.c:608 `AUDIO_PlayMusic(0,FALSE,1)`)。Object.assign 恢复
    //   存档 wNumMusic 后,曲号必经 0→N 变化 → AudioManager 必从头重播(= res.c:223 先停后播
    //   必从头;旧"同曲号续播"一并修)。
    gs.wNumMusic = 0
    syncShellAudio(audio, gs, [], playerRoles)
    const loadedGs = await Save.loadSlot(slot)
    if (!loadedGs) {
      console.warn(`[bootstrap.loadGame] slot ${slot} 空,load skip`)
      return
    }
    console.log(`[bootstrap.loadGame] slot ${slot} loaded`)
    // mutate gs in-place(外部持有同 ref;无法替换 ref)
    // 把 loadedGs 全字段拷到 gs(用 Object.assign 浅 + 关键嵌套手动 deepClone)
    Object.assign(gs, loadedGs)
    // 读档归一化:旧 schema 存档(2026-06-07 起加 rgwAvatar/rgwWalkFrames 等新 runtime 字段)经
    //   Object.assign 整体替换了 createInitialGameState 建好的完整 runtime → 缺字段时 ESC 开菜单
    //   投影 projectRuntimeToBattleRoles 读 undefined[0] 崩。以默认模板补齐缺失键(保留存档已有数据)。
    gs.PlayerRolesRuntime = normalizePlayerRolesRuntime(gs.PlayerRolesRuntime)
    for (const role of playerRoles.roles) {
      if (!gs.PlayerRolesRuntime.rgwSpriteNum[role.id]) {
        gs.PlayerRolesRuntime.rgwSpriteNum[role.id] = role.spriteNum
      }
    }
    if (gs.partyLeaderSpriteId !== undefined) {
      gs.PlayerRolesRuntime.rgwSpriteNum[0] = gs.partyLeaderSpriteId
    }
    // 读档 transition guard:存档 palette 要留给目标场景,但加载窗口只能刷黑屏。
    //   普通读档:避免旧场景先套目标档昼夜 palette(白天读夜档会瞬间变夜)。
    //   死亡读档:避免 0x4E FadeOut 后 Object.assign 把黑 palette 覆成存档色,露出残留战斗帧。
    //   **新建 palette 对象**:Object.assign 后 gs.palette === loadedGs.palette 同引用,不得原地改 colors。
    const restoredPalette = cloneScreenPalette(gs.palette ?? gs.basePalette ?? palette)
    gs.sceneLoading = true
    gs.paletteFadeState = undefined
    gs.palette = makeBlackScreenPalette(restoredPalette)
    fb.clear()
    flushToCanvas(fb, canvasCtx!, gs.palette)
    // sdlpal bCurrentSaveSlot 是 runtime 全局(非 SAVEDGAME)— Object.assign 带入的是存档里那份旧值,
    // 须用本次读的 slot 覆盖(opcode 0x4E load-last-save 据此重载"上次读/存"的槽)。
    gs.currentSaveSlot = slot
    // 关菜单回 explore — loadSceneCommon 完成后 explore tick 接管
    gs.menuStack = []
    gs.mode = 'explore'
    // M6(2026-06-07 sdlpal 审查):PAL_InitGameData(global.c:951)在 PAL_LoadGame 后、UpdateEquipments
    //   前 memset rgPlayerStatus —— 存档里那份非装备持久状态(大世界 0x2D 上的护身 / 勇气 / 加速等)丢弃,
    //   装备授予的状态由下方 updateAllEquipments 重建。否则读档后这些状态跨存档残留。
    gs.rgPlayerStatus = createInitialPlayerStatus()
    // DH7:PAL_LoadGame_Common(global.c:630)读回后无条件 memset rgPoisonStatus —— 毒虽被保存
    //   (global.c:772)但**读档即解毒**(原版机制,玩家惯用读档清毒)。否则带毒存档读回毒残留
    //   (头像染色/每回合掉血/减速持续)。
    gs.rgPoisonStatus = {}
    // sdlpal PAL_InitGameData(global.c:953)真值:PAL_LoadGame 后**无条件** PAL_UpdateEquipments()。
    // rgEquipmentEffect 是派生字段(不在 SAVEDGAME_WIN),必须从 rgwEquipment 重算 —— 不信存档里那份
    // (避免存档时 effect 处于脏/旧状态被原样载入;item/script 定义变更后也能自愈)。P1#4(2026-05-29)。
    updateAllEquipments(gs, items)
    gs.iCurEquipPart = -1
    // L6/L7:PAL_InitGameData(global.c:948)/PAL_LoadGame_Common(global.c:611)读档后无条件复位 ——
    //   iCurInvMenuItem(物品菜单光标)与 sWaveProgression(屏幕波动增量)均不在 SAVEDGAME_WIN,恒归 0。
    //   存档经 structuredClone 带进旧值、Object.assign 灌回 → 此处强制清(对齐 C 不持久化语义)。
    gs.iCurInvMenuItem = 0
    gs.sWaveProgression = 0
    // 重 load scene assets — 走 fromSavedGame 路径,**不**重置 npcs / **不**跑 onEnter。
    // sceneLoading 在读档 transition guard 已置 true;loadSceneCommon 完成后恢复目标存档 palette 绘制新场景。
    await loadSceneCommon(gs.wNumScene, { fromSavedGame: true })
    gs.palette = restoredPalette
    // DM26:PAL_ReloadInNextTick(global.c:910)无条件 fNeedToFadeIn=TRUE → 进场 1s 淡入
    //   (scene.c:503-507)。此前仅 0x4E 死亡读档设,系统菜单读档画面硬切。
    gs.needToFadeIn = true
  }

  setLoadGameHandler(async (slot) => {
    await loadGameFromSlot(slot)
  })

  // opcode 0x4E load-last-save(sdlpal script.c:1765 PAL_ReloadInNextTick(bCurrentSaveSlot))。
  // event-system 已先跑完 fade-out(淡黑)+ 清 cursor;此处只重载槽 + 设 needToFadeIn(对齐
  // PAL_ReloadInNextTick 的 fNeedToFadeIn=TRUE → loaded scene 经 explore auto fade-in 淡入)。
  setLoadLastSaveHandler((slot) => {
    // PAL_InitGameData(0)不读存档,而是 PAL_LoadDefaultGame。新游戏尚未保存就死亡时,
    // currentSaveSlot=0 必须重建默认游戏;Save.loadSlot(0)只会返回空,会把死亡态留在黑屏下。
    if (slot === 0) {
      startNewGameFromPrimary()
      gs.needToFadeIn = true
      return
    }
    void loadGameFromSlot(slot)
      .then(() => {
        gs.needToFadeIn = true
      })
      .catch((err: unknown) => {
        console.error('[bootstrap.loadLastSave] failed:', err)
      })
  })

  /** 回标题(opcode 0xA0 quit / 结局后)— 复用 OpeningMenu 启动路径(同 showTrademarkAndSplash 末尾)。 */
  function returnToTitle(): void {
    gs.eventCursor = undefined
    gs.menuStack = [{ kind: 'opening', state: createOpeningMenu() }]
    gs.mode = 'menu'
    // DM28:主菜单曲 4(RIX_NUM_OPENINGMENU,uigame.c:114);选项确定后被新游戏/读档路径覆盖
    //   (= uigame.c:157-158 确定后停乐)。
    gs.wNumMusic = 4
    syncShellAudio(audio, gs, [], playerRoles)
  }

  // C2-quit:系统菜单 QUIT → ConfirmMenu 选「是」(sdlpal PAL_QuitGame PAL_Shutdown(0))。浏览器映射为回标题。
  //   **不**复用下方 0xA0 setQuitHandler(那含 WIN95 结局 mp4 播放,语义不同):系统菜单退出不放任何结局动画。
  setSystemQuitHandler(returnToTitle)

  // opcode 0xA0 quit(sdlpal script.c:2988-2996)。用户决策:跳过 PAL_AdditionalCredits(SDLPAL 引擎
  // GNU GPL 版权页,非游戏内容)→ 回标题。WIN95 → 播结局 mp4(4/5/6,对应 PAL_EndingScreen AVI 序)→ 回标题;
  // DOS → 结局已由 scene-281 前序 opcode(FBP/ScrollFBP/ColorFade/EndingAnimation 等)跑完 → 直接回标题。
  setQuitHandler(() => {
    if (buildFlag === 'win95') {
      gs.suspendRaf = true
      void (async () => {
        for (const m of ['4.mp4', '5.mp4', '6.mp4']) await playAvi({ src: `${BASE}/videos/${m}` })
      })()
        .catch((err: unknown) => {
          console.warn('[bootstrap.quit] 结局 mp4 播放失败:', err)
        })
        .finally(() => {
          gs.suspendRaf = false
          returnToTitle()
        })
    } else {
      returnToTitle()
    }
  })

  setStartGameHandler(async (choice) => {
    if (choice.kind === 'new-game') {
      // sdlpal uigame.c:157-162 真值:OpeningMenu 选定后先停乐(AUDIO_PlayMusic(0,FALSE,1))
      // 再 PAL_PlayAVI("3.avi")。兼修慢网根因之一:32MB soundfont 未就绪时主菜单曲挂在
      // audio-midi `last` 等补播,stop 把它取消 —— 否则 soundfont 在 AVI 中途 ready,
      // 主菜单曲突然混进视频声轨(2026-06-12 user 报"快播完了主菜单音乐才出来")。
      // 新游戏的场景曲随后由 loadDefaultGame 重置 wNumMusic → sync 0→N 正常起播。
      gs.wNumMusic = 0
      syncShellAudio(audio, gs, [], playerRoles)
      await playOpeningAvi()
      startNewGameFromPrimary()
    } else {
      // C8(2026-05-29):OpeningMenu 选 load-game → 复用 loadGameFromSlot 真做
      await loadGameFromSlot(choice.slot)
    }
  })

  /**
   * Step 7:Trademark + Splash 启动序列 — sdlpal main.c:545-546 真值。
   * `?build=win95`:playAvi(1/2)— mp4 视频(WIN95 build path,我们默认)
   * `?build=dos`:playTrademarkFallback + playSplashFallback — RNG + 卷轴动画
   *
   * suspendRaf 包 try/finally,modal 期间 canvas render 暂停。
   */
  // DOS 开场 fallback(trademark RNG chunk 6 + splash 卷轴)抽成独立闭包 —— showTrademarkAndSplash 的
  // dos 分支 + devpanel "开场 DOS" 按钮共用(资产 battleBgs/characterSprites/palette 在任何 build 都已加载,
  // 故 win95 build 下 devpanel 也能跑 DOS 版)。不管 suspendRaf(caller 包)。
  async function playDosOpening(): Promise<void> {
    // sdlpal main.c:199-203 DOS Trademark fallback / main.c:223-456 DOS Splash fallback
    // palette 3:trademark / palette 1:splash(sdlpal PAL_SetPalette / PAL_GetPalette 真值)
    // DM28:splash 起手播标题曲 5(NUM_RIX_TITLE,main.c:46/:293;蝶恋),退出停乐(main.c:449-455)。
    //   经 gs.wNumMusic + audio.sync(suspendRaf 只停 present,逻辑 tick 持续轮询)。
    gs.wNumMusic = 5
    syncShellAudio(audio, gs, [], playerRoles)
    const palette3 = await fetchPalette(3).catch(() => palette)
    await playTrademarkFallback({
      fb,
      canvasCtx: canvasCtx!,
      palette: palette3,
    })
    const palette1 = await fetchPalette(1).catch(() => palette)
    // M15(2026-06-07 sdlpal 审查):DOS splash 用 FBP chunk 0x26/0x27,非 WIN95 的 3/4
    //   (sdlpal main.c:42-43 BITMAPNUM_SPLASH_UP/DOWN = fIsWIN95 ? 0x03/0x04 : 0x26/0x27)。
    const fbpUp = assets.battleBgs.get(0x26)
    const fbpDown = assets.battleBgs.get(0x27)
    const craneSprite = characterSprites.get(73)
    const titleSprite = characterSprites.get(71)
    if (!fbpUp || !fbpDown || !craneSprite || !titleSprite || titleSprite.frames.length === 0) {
      console.warn('[bootstrap] DOS splash 资产缺失,跳过 splash fallback')
      return
    }
    await playSplashFallback({
      fb,
      canvasCtx: canvasCtx!,
      palette: palette1,
      // BattleBgAsset(无 opaque)→ wrap 成 IndexedImage(全 opaque)
      bitmapUp: { ...fbpUp, opaque: new Uint8Array(fbpUp.width * fbpUp.height).fill(1) },
      bitmapDown: { ...fbpDown, opaque: new Uint8Array(fbpDown.width * fbpDown.height).fill(1) },
      craneSprite: {
        frames: craneSprite.frames.map((f) => ({
          width: f.width,
          height: f.height,
          indices: f.indices,
          opaque: f.opaque,
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

  async function showTrademarkAndSplash(): Promise<void> {
    gs.suspendRaf = true
    try {
      if (buildFlag === 'win95') {
        // sdlpal main.c:197 PAL_PlayAVI("1.avi") / main.c:237 PAL_PlayAVI("2.avi")
        await playAvi({ src: '/extracted/videos/1.mp4' })
        await playAvi({ src: '/extracted/videos/2.mp4' })
      } else {
        await playDosOpening()
      }
    } finally {
      gs.suspendRaf = false
    }
  }

  // soundfont 收尾等待:其余 boot 资源(~3200 个请求)完成后,慢网下进度计数会停在最后一格
  // 等这单个大文件请求 —— 注明在等什么;到手(或失败)即清。必须在视频/菜单发起**之前**等,
  // 否则 1.mp4 在 loading 覆盖层底下开播。(大小不写死:音色库可换,2026-06-12 已从 32MB
  // GeneralUser GS 换 6MB TimGM6mb,见 public/soundfont-LICENSE.txt)
  setBootLoadingNote('音色库')
  await soundfontSettled
  setBootLoadingNote('')

  // ── 可玩门(2026-06-14)──:必要资源就绪 → 通知 UI 出「进入游戏」按钮,await 用户点(或自动放行)。
  // 不再自动进游戏。dev/e2e / SW 不可用:enterGate 已预先 resolved、onPlayable no-op → 立即通过(现状)。
  // audio 解锁:点按钮的 pointerdown 已被上方 window 监听器触发 audio.resume();await 后补一次幂等保险。
  // video 解锁:由 main.ts 的 onEnter 在 click 同步栈 warmUpVideoAutoplay()(transient activation 要求)。
  deps?.onPlayable?.()
  if (deps?.enterGate) await deps.enterGate
  audio.resume()

  if (skipIntroBoot) {
    // ?skip-intro=1 → 跳 trademark + splash + OpeningMenu 直接走 SCENE_ID(=1)新游戏
    startNewGameFromPrimary()
  } else {
    // 默认:trademark → splash → OpeningMenu
    // 注:await 不阻塞 startRafLoop(后者立即调,raf 已暂停 via suspendRaf)
    void showTrademarkAndSplash()
      .then(() => {
        // sdlpal ui.c:473 PAL_ReadMenu 每轮先 PAL_ClearKeyState 再读输入 —— 进 OpeningMenu 前清掉跳过
        // splash 的残留 Space('Confirm'),否则菜单首帧即被误确认开新游戏。覆盖 DOS fallback 分支
        // (playDosOpening 不经 avi-player 的 stopImmediatePropagation)。
        input.clearPressed()
        gs.menuStack = [{ kind: 'opening', state: createOpeningMenu() }]
        gs.wNumMusic = 4 // DM28:主菜单曲(uigame.c:114)
        syncShellAudio(audio, gs, [], playerRoles)
        gs.mode = 'menu'
      })
      .catch((err: unknown) => {
        console.error('[bootstrap] trademark/splash 失败,直接进 OpeningMenu:', err)
        input.clearPressed()
        gs.menuStack = [{ kind: 'opening', state: createOpeningMenu() }]
        gs.wNumMusic = 4 // DM28:主菜单曲(uigame.c:114)
        syncShellAudio(audio, gs, [], playerRoles)
        gs.mode = 'menu'
      })
  }

  startRafLoop(loopCtx)
  // DEV-only:暴露 GameState 引用给 console / 自动化调试(配合 dev-panel 坐标传送排查卡死)。
  if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
    ;(window as unknown as Record<string, unknown>).__tpgs = gs
  }
  // 首帧可见(trademark/splash/OpeningMenu 或 skip-intro 场景)→ 启动 loading 覆盖层淡出
  finishBootLoading()
  console.log(
    '[bootstrap] startup ready, SCENE_ID=',
    SCENE_ID,
    'skipIntro=',
    skipIntroBoot,
    'build=',
    buildFlag,
  )
}
