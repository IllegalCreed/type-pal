import type {
  Command,
  EventFile,
  EventObjectsFile,
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
  getGlobalLabelMap,
  runEnterScript,
  setEndingAnimationHandler,
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
  hydratePlayerRolesRuntime,
  initExpLevelsFromLevels,
  projectRuntimeToBattleRoles,
  npcFromEventObject,
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
import { isWalkable, setSceneContext } from '../core/scene-system.js'
import battleFixturesRaw from '../data/battle-fixtures.json' with { type: 'json' }
import sceneJumpsRaw from '../data/scene-jumps.json' with { type: 'json' }
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
import { battleVictoryTrack, createAudioManager, pickMusicTrack, sfxForBattleEvent } from './audio.js'
import { createSpessaSynthBackend } from './audio-midi.js'
import { playAvi } from './avi-player.js'
import { type BattleFixturesData, type SceneJumpsData, setupDevPanel } from './dev-panel.js'
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
import { playRng } from './rng-player.js'
import { playSplashFallback } from './splash-fallback.js'
import { playTrademarkFallback } from './trademark-fallback.js'

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
    stores,
    words,
  } = assets

  // W3 C1/C2:注入 WORD.DAT 词表(words.json flat[]),getWord(id) 取菜单文案(单一文案源,替代各处硬编码)。
  setWordTable(words)

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
  try {
    const eoRes = await fetch('/extracted/data/event-objects.json')
    if (eoRes.ok) {
      const eoFile = (await eoRes.json()) as EventObjectsFile
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

  const bus = createCommandBus()
  const input = new KeyboardInputSource(window)
  // M6 音频:shell 层 Web Audio。core 发意图(gs.pendingSounds SFX 队列 / gs.wNumMusic BGM),
  //   每帧 onPresent 调 audio.sync 消费。首个 keydown resume AudioContext(浏览器 autoplay policy)。
  const audio = createAudioManager('/extracted')
  // BGM 后端:SpessaSynth 运行时 MIDI 合成(直接播 Musics/{NNN}.mid,开箱即响)。需 public/soundfont.sf3
  //   (user 放一个 GM soundfont;缺失则 BGM 静默 + warn,见 audio-midi.ts)。worklet 已 vendored 到 public/。
  audio.setMusicBackend(createSpessaSynthBackend({
    baseUrl: '/extracted',
    workletUrl: '/spessasynth_processor.min.js',
    soundfontUrl: '/soundfont.sf3',
  }))
  // autoplay 解锁:浏览器要求 AudioContext 在用户手势后 resume。**不能用 { once:true } 只听首个
  //   keydown** —— 若首个手势是鼠标点击(如点 devpanel 触发战斗/BGM)keydown 不触发,ctx 永久挂起
  //   → BGM/SFX 全哑(user 2026-06-03 实测控制台 "AudioContext was not allowed to start")。改:
  //   keydown + pointerdown 都听、**持续触发**(audio.resume 内部 + backend.resume 都有 suspended 守卫,
  //   解锁后重复调是 no-op,不会重启 BGM)。
  const unlockAudio = (): void => audio.resume()
  window.addEventListener('keydown', unlockAudio, { capture: true })
  window.addEventListener('pointerdown', unlockAudio, { capture: true })

  const loopCtx: LoopContext = {
    gs,
    bus,
    input,
    tilemap,
    eventCommands,
    labelMap,
    partyWalkFrames,
    onPresent: (drained) => {
      // suspendRaf 期间:modal 播放器(AVI / trademark / splash / RNG / FBP / 结局动画)**独占** canvas,
      // 自管 fb + flushToCanvas。主循环这里**完全不碰 canvas** —— 否则下面的 flushToCanvas 会用 gs.palette
      // (场景调色板)重刷 fb,跟 modal 播放器的 flush(各自 palette)互抢 → 画面在两套色表间闪烁
      //(2026-05-29 user 从 devpanel 触发开场 DOS 时发现"正常↔偏红"闪烁;开机时 raf 还没起所以不显)。
      if (gs.suspendRaf) return
      // M6 音频:每帧 drain gs.pendingSounds(SFX)+ 轮询有效 BGM(战斗中→wNumBattleMusic looped,
      //   否则→wNumMusic 场景乐;battle.c:728/1849)。suspendRaf(modal)期间跳过。
      const inBattle = gs.battleState !== undefined
      // 系统菜单「音乐」「音效」开关(gs.fMusicEnabled/fSoundEnabled,PAL_SwitchMenu 切)→ AudioManager。
      //   setter 幂等(无变化 no-op),每帧调安全。
      audio.setMusicEnabled(gs.fMusicEnabled ?? true)
      audio.setSfxEnabled(gs.fSoundEnabled ?? true)
      // 战斗胜利曲(battle.c:1030-1032,'won' 结算期 isBoss?2:3 不循环;结算完 battleState 清→场景乐恢复)。
      const victoryTrack = battleVictoryTrack(gs.battleState)
      audio.sync(gs.pendingSounds, {
        track: victoryTrack > 0 ? victoryTrack : pickMusicTrack(inBattle, gs.wNumMusic, gs.wNumBattleMusic),
        loop: victoryTrack > 0 ? false : (inBattle ? true : (gs.musicLoop ?? true)),
      })
      // M6 战斗 SFX:扫本帧 bus 视觉事件 → per-单位声(敌死 deathSound / 敌攻 attackSound /
      //   我攻 role.weaponSound,fight.c/battle.c AUDIO_PlaySound)。explore SFX 走 gs.pendingSounds。
      if (inBattle) {
        for (const { cmd } of drained) {
          // core 已解析好的固定声(出招/暴击 attack.ts、濒死/阵亡 battle-system 等 AUDIO_PlaySound)→ 直接播。
          if (cmd.op === 'playSound') {
            if (cmd.soundId > 0) audio.playSound(cmd.soundId)
            continue
          }
          const s = sfxForBattleEvent(cmd, gs.battleState?.enemies, gs.partyMembers, playerRoles.roles)
          if (s > 0) audio.playSound(s)
        }
      }
      // 按 gs.mode 路由 present:battle → presentBattleFrame(消费 commands 进 floating nums);
      // 否则走 explore/event 路径 presentFrame(commands 由 M2 EventSystem 直接消费 GameState)
      if (!presentBattleFrame(fb, gs, battlePresent, battleAssets, drained)) {
        presentFrame(fb, gs, presentCtx)
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

  // 预载全部可玩角色 overworld sprite(rgwSpriteNum)。sdlpal 在 scene load(kLoadPlayerSprite)
  // 时按当前 party 各角色加载 sprite(res.c:317-333);我们简化为启动时预载全角色,确保任意
  // party 组合(剧情入队 / dev-panel P 强制入队)的 follower 都能用**各自**角色 sprite 渲染,
  // 而非回退到 leader sprite(2026-05-28 user 发现 follower 全显李逍遥的根因)。
  // fire-and-forget:不阻塞首屏;未载完前 follower 暂回退 partyFrames,载完即正确。
  void Promise.all(
    playerRoles.roles
      .map((r) => r.spriteNum)
      .filter((sn) => sn > 0)
      .map((sn) => fetchMissingSprite(sn)),
  )

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
    console.log(
      `[bootstrap.loadSceneCommon] loadScene wNumScene=${newWNumScene} → dump scene/${dumpFileIndex}.json` +
        (opts.fromSavedGame ? ' (from saved game)' : ''),
    )
    // P2#7:async 加载窗口起手设 sceneLoading=true(loadScene opcode 已设过,这里覆盖初始 / skip-intro /
    // loadGame 路径)→ present 保留旧帧(供 fadeScreen backup)。冻到 onEnter 第一个可渲染 yield 才清。
    gs.sceneLoading = true
    const sceneAssets = await sceneAssetsCache.loadScene(dumpFileIndex)
    gs.wNumScene = newWNumScene
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
    } else {
      // C8 load game 路径:存档 JSON.stringify 会断开 gs.npcs 与 gs.allEventObjects 的引用。
      // 从加载回的 gs.allEventObjects 重切当前 scene → 重建引用(状态一致,后续脚本改动持久)。
      // 旧档无 allEventObjects → sliceSceneEventObjects 返 undefined → 保留存档内 gs.npcs。
      const reslice = sliceSceneEventObjects(gs, newWNumScene)
      if (reslice) gs.npcs = reslice
    }
    applySceneAssetsToPresent(sceneAssets)
    await preloadCutsceneSprites(sceneAssets.eventCommands)
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
      commands: eventCommands,
      enemyPos, // D17a:dev 战斗也用真 EnemyPos 表(非 fallback)
      battleEffectIndex, // D17a:dev 战斗命中特效帧基号
      magicSpriteFrameCounts, // D17:dev 战斗 OffMagic 时间线 n
      summonSpriteFrameCounts, // 召唤神逐帧 loop 帧数
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
    console.debug(
      `[bootstrap.startBattleHandler] enemyTeamId=${enemyTeamId} battleFieldId=${battleFieldId}` +
        ` isBoss=${isBoss} before.mode=${gs.mode} partyMembers=${gs.partyMembers.length}`,
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
        // 架构边界:用 runtime 当前属性(等级/HP/MP/攻防 等)投影战斗 roles,使战斗吃上升级后属性
        //   (原直接传 playerRoles 静态 1 级基线)。staticRoles=playerRoles 供不可变字段(精灵/音效/名字)。
        // D14:第 3 参 gs.rgEquipmentEffect → 战斗 stat = effective(base + 装备 + Extra),mirror sdlpal getter。
        playerRoles: projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, playerRoles, gs.rgEquipmentEffect),
        items,
        spells,
        magics,
        objectMagics, // E2:0x42 SimulateMagic 解析 magic object id
        objectPoisons, // 0x28 apply poison
        enemyPos, // D17a:enemy 初始 pos/posOriginal(battle.c:936-939)
        battleEffectIndex, // D17a:player 攻击命中特效帧基号(fight.c:2055)
        magicSpriteFrameCounts, // D17:OffMagic 时间线 n(FIRE.MKF chunk 帧数)
        summonSpriteFrameCounts, // 召唤神逐帧 loop 帧数(F.MKF chunk 帧数)
        levelUpExp: assets.levelUpExp, // D11:战斗胜利升级阈值
        levelUpMagic: assets.levelUpMagic, // D11:升级学新法术
        // P2#5:不再传 per-scene 切片 — startBattle 默认 getGlobalCommands()(战斗脚本是全局 entry)。
        introFadeTicks: INTRO_FADE_TICKS, // D19:生产入场 dither fade-in(present-battle 揭示);单测/dev 不传
      })
      console.debug(
        `[bootstrap.startBattleHandler] after.mode=${gs.mode} battleState=${!!gs.battleState}`,
      )
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
      console.debug(
        `[bootstrap.shopMenuHandler] buy storeNum=${storeNum} items=${shopItems.length}`,
      )
      openMenu(gs, { kind: 'shop-buy', state: createBuyMenu(shopItems) })
    } else {
      openMenu(gs, { kind: 'shop-sell', state: createSellMenu(gs, items) })
    }
  })

  // opcode 0x0034(妖魔转化)用 store[0].rgwItems 索引发物品。注入完整 store 表。
  setStoreTable(stores)

  // 毒 OBJECT 表(0x29 apply-player 取 wPlayerScript / cure-by-level 取真 level)。
  setObjectPoisons(objectPoisons)

  // 特效 C:RNG 动画 handler(opcode 0x37 PlayRNG)。event-system 设 cursor.waiting='rng-play' 后调本 handler;
  //   suspendRaf 期间 present 暂停、playRng 自管 fb 直写 + flushToCanvas;播完 finally 清 suspendRaf + waiting 续跑。
  //   speed→frameDelayMs = 1000/speed(sdlpal PAL_RNGPlay iDelay = 1/iSpeed 秒);palette 用当前工作 palette。
  setRngPlayHandler(({ gs, chunkIdx, startFrame, endFrame, speed }) => {
    gs.suspendRaf = true
    void playRng({
      chunkIdx,
      startFrame,
      endFrame,
      frameDelayMs: 1000 / speed,
      fb,
      canvasCtx: canvasCtx!,
      palette: gs.palette ?? palette,
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
    const curPal = gs.palette ?? palette
    await rng(9, 110, 150, 7, curPal)
    await rng(9, 151, -1, 9, curPal)
    await fadeOutBlocking(fb, ctx, curPal, 1200) // FadeOut(2)
    const pal5 = await pget(5)
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
    await colorFadeBlocking(fb, ctx, pal4, 15, 64 * 70) // ColorFade(7,15)
    const pal0 = await pget(0)
    await rng(11, 0, -1, 7, pal0)
    await fadeOutBlocking(fb, ctx, pal0, 1200) // FadeOut(2)
    const pal8 = await pget(8)
    await rng(10, 0, -1, 6, pal8)
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

    // ── Part B(ending.c:485-511,演职员表卷动 67→59)──
    for (const c of [67, 66, 65, 64, 63, 62, 61, 60, 59]) {
      await scroll(c, pal5b)
    }
    await fadeOutBlocking(fb, ctx, pal5b, 1800) // FadeOut(3)
  }

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
    // M5.6 session 3 修(user 反馈"用物品没反应"):
    // 新游戏起手把 playerRoles.json 静态基线 hydrate 到 gs.PlayerRolesRuntime。
    // 否则 rgwHP/MaxHP/AttackStrength 等都是 0,HP 加减 opcode clamp 失效。
    // sdlpal global.c PAL_NewGame → PAL_LoadDefaultGame 真值等价。
    hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, playerRoles)
    // F1(2026-06-01):sdlpal PAL_LoadDefaultGame(global.c:455-465)hydrate 后把全 8 类经验 wLevel
    //   设为各角色等级(rgwLevel)。此前 ts 新游戏后 Exp.wLevel 全 0,与真值不符。**仅新游戏调**(读档走存档)。
    initExpLevelsFromLevels(gs.Exp, gs.PlayerRolesRuntime.rgwLevel)
    // C5(2026-05-28):hydrate 后 sdlpal PAL_LoadDefaultGame 真值再调 PAL_UpdateEquipments
    // (global.c:1333)— 跨 role × 6 part 跑每件装备 scriptOnEquip 累加 stat 到 rgEquipmentEffect。
    // 否则 effective Atk/Def/Mag 等 stat getter 永远 = base,跟 sdlpal 真值偏差(D14 装备 effect 根因)。
    updateAllEquipments(gs, items)

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
   * 期间 fade out / suspend 等视觉效果留 follow-up(同 startNewGameFromPrimary 简版口径)。
   */
  async function loadGameFromSlot(slot: number): Promise<void> {
    const loadedGs = await Save.loadSlot(slot)
    if (!loadedGs) {
      console.warn(`[bootstrap.loadGame] slot ${slot} 空,load skip`)
      return
    }
    console.log(`[bootstrap.loadGame] slot ${slot} loaded`)
    // 死亡读档判定:读 **Object.assign 之前** 的当前会话态(resumePostBattleScript(lost) 置 gameOverActive=true)。
    //   不读 assign 之后的值 —— Save 走 deepClone(gs) 全量序列化,理论上可能带入存档的 gameOverActive(虽然
    //   实际无法在死亡演出期存档);用 assign 前的会话态作判据,与存档内容彻底解耦,菜单 Load 永为 false。
    // 正常死亡序列跑到 0x4E 读档时,0x4F 已置 gameOverActive=true(且清了 deathHoldActive),故主判据是它;
    //   deathHoldActive 兜底:万一过渡帧 hold 未经 0x4F 就触发读档(防御),也按死亡读档强制黑屏,杜绝战斗帧闪现。
    const isDeathReload = gs.gameOverActive === true || gs.deathHoldActive === true
    // mutate gs in-place(外部持有同 ref;无法替换 ref)
    // 把 loadedGs 全字段拷到 gs(用 Object.assign 浅 + 关键嵌套手动 deepClone)
    Object.assign(gs, loadedGs)
    // 死亡读档:Object.assign 把 palette 从**黑**(0x4E FadeOut 淡完)覆盖回存档的**正常色** → 而 fb 仍残留战斗帧,
    //   sceneLoading 窗口期会用正常色 flush 那帧 → user 报"闪一阵战斗画面"。
    //   修:强制 palette 全黑,使残留帧渲染为黑(不闪);随后 needToFadeIn 从黑淡入新场景
    //   (对齐 sdlpal script.c:1764 PAL_FadeOut(1)→reload 全程黑屏 + PAL_FadeIn,绝不露旧帧)。
    //   **新建 palette 对象**(不原地改 colors):Object.assign 后 gs.palette === loadedGs.palette 同引用,
    //   原地 mutate 会污染读回的存档对象 → 用 spread 断开引用,保留 cycles/nightColors。
    if (isDeathReload && gs.palette) {
      gs.palette = { ...gs.palette, colors: gs.palette.colors.map(() => [0, 0, 0] as [number, number, number]) }
    }
    // sdlpal bCurrentSaveSlot 是 runtime 全局(非 SAVEDGAME)— Object.assign 带入的是存档里那份旧值,
    // 须用本次读的 slot 覆盖(opcode 0x4E load-last-save 据此重载"上次读/存"的槽)。
    gs.currentSaveSlot = slot
    // 关菜单回 explore — loadSceneCommon 完成后 explore tick 接管
    gs.menuStack = []
    gs.mode = 'explore'
    // sdlpal PAL_InitGameData(global.c:953)真值:PAL_LoadGame 后**无条件** PAL_UpdateEquipments()。
    // rgEquipmentEffect 是派生字段(不在 SAVEDGAME_WIN),必须从 rgwEquipment 重算 —— 不信存档里那份
    // (避免存档时 effect 处于脏/旧状态被原样载入;item/script 定义变更后也能自愈)。P1#4(2026-05-29)。
    updateAllEquipments(gs, items)
    gs.iCurEquipPart = -1
    // 重 load scene assets — 走 fromSavedGame 路径,**不**重置 npcs / **不**跑 onEnter。
    // sceneLoading 由 loadSceneCommon 管(起手 true blank fetch 窗口,fromSavedGame 分支立即清渲染)。
    await loadSceneCommon(gs.wNumScene, { fromSavedGame: true })
  }

  setLoadGameHandler(async (slot) => {
    await loadGameFromSlot(slot)
  })

  // opcode 0x4E load-last-save(sdlpal script.c:1765 PAL_ReloadInNextTick(bCurrentSaveSlot))。
  // event-system 已先跑完 fade-out(淡黑)+ 清 cursor;此处只重载槽 + 设 needToFadeIn(对齐
  // PAL_ReloadInNextTick 的 fNeedToFadeIn=TRUE → loaded scene 经 explore auto fade-in 淡入)。
  setLoadLastSaveHandler((slot) => {
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
        gs.mode = 'menu'
      })
      .catch((err: unknown) => {
        console.error('[bootstrap] trademark/splash 失败,直接进 OpeningMenu:', err)
        input.clearPressed()
        gs.menuStack = [{ kind: 'opening', state: createOpeningMenu() }]
        gs.mode = 'menu'
      })
  }

  startRafLoop(loopCtx)
  console.log(
    '[bootstrap] startup ready, SCENE_ID=',
    SCENE_ID,
    'skipIntro=',
    skipIntroBoot,
    'build=',
    buildFlag,
  )
}
