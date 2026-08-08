import {
  type AssetId,
  applySetParty,
  buildWorld,
  type CharacterInstance,
  CONTENT_VERSION,
  canonicalScriptTransitionJson,
  collectCommandAssetReferences,
  type EntityDef,
  type EntryPoint,
  type EquipDescribeCtx,
  effectiveGrantedStatuses,
  effectiveRegen,
  effectiveResistances,
  effectiveSkills,
  effectiveStat,
  emptyWorldScriptState,
  emptyWorldScriptStateV5,
  equipGrantsAttackAll,
  type Facing,
  type GridPos,
  grantBattleRewards,
  gridToPixel,
  isIdentityTint,
  legacyPalPortraitAssetId,
  lerpTint,
  lookupText,
  ownedItemCount,
  pixelDeltaToGridDelta,
  pixelToGrid,
  type RuntimeScriptBinding,
  removeOwnedItems,
  resolveAmbienceTint,
  resolveEntitySpriteId,
  type SceneDef,
  type SceneDefV5,
  type SceneEntryPresentation,
  type SceneReveal,
  type SceneSpawn,
  type ScriptStage,
  type SpriteDef,
  sellableItems,
  spriteScreenY,
  stageIndexFor,
  usableItems,
  type WalkSpeed,
  type WorldScriptStateV5,
} from '@type-pal/content'
import type { Palette, RleFrame } from '@type-pal/shared'
import {
  type BattleFieldEntry,
  type LoadedSprite,
  loadBattleBgFull,
  loadBattleFields,
  loadBattleSpriteDefinition,
  loadEffectSprite,
  loadFireSprite,
  loadGlyphs,
  loadSpriteAsset,
  loadStandardPalette,
  SpriteAssetCache,
} from './assets.js'
import { AsyncIntentController, asyncIntentAbortError } from './async-intent.js'
import { BATTLE_MUSIC_TRANSITION_MS, createBgmPlayer } from './audio/bgm.js'
import { SfxPlayer, SfxReadinessCollectionError, SfxReadinessResourceError } from './audio/sfx.js'
import {
  collectBattleBaseSounds,
  collectSceneSoundAssets,
  collectTurnActionSounds,
} from './audio/sfx-readiness.js'
import { curePoisons } from './battle/battle-core.js'
import { getEnemyBasePos, getPlayerBasePos } from './battle/battle-positions.js'
import { BattleSession } from './battle/battle-session.js'
import {
  collectBattleSkillFireChunks,
  prepareBattleSpriteReadiness,
} from './battle/battle-sprite-readiness.js'
import { type BattleSpriteDraw, renderBattleScene } from './battle/present-battle.js'
import { buildSettlementScreens } from './battle/settlement.js'
import { isBlockedAt, sameGrid } from './collision.js'
import { CutsceneController, type CutsceneExecutor } from './cutscene-controller.js'
import { expectDefined } from './defined.js'
import { withWorldPreset } from './dev-preset.js'
import { loadCursorFrames } from './dialog/dialog-assets.js'
import { DialogBox } from './dialog/dialog-box.js'
import { startDialogue } from './dialogue.js'
import {
  applyDitherPaletteTransition,
  buildDitherPalettePlan,
  DITHER_TOTAL_STEPS,
  DitherTransitionController,
} from './dither-transition.js'
import { assertEngineChromeComplete, loadEngineChromeImage } from './engine-chrome/registry.js'
import {
  EntityActionPlayer,
  type EntityActionSeed,
  resolveSpriteActionBinding,
} from './entity-action-player.js'
import {
  closeEquipMenu,
  type EquipMenuState,
  equipApply,
  equipBackToList,
  equipConfirmItem,
  equipMoveCursor,
  openEquipMenu,
} from './equip-menu-state.js'
import { type FadeOwner, SupersedingFadeDriver } from './fade-driver.js'
import {
  computeFollowerPos,
  type FollowerFrozen,
  pushTrail,
  seedFormationTrail,
  type TrailEntry,
} from './follower.js'
import {
  type FrameAnimationFrameSnapshot,
  FrameSequenceReader,
  playFrameAnimation as playFrameAnimationOverlay,
} from './frame-animation-player.js'
import { FrameAnimationPresentationState } from './frame-animation-presentation.js'
import { GameplayClock } from './gameplay-clock.js'
import { Keyboard } from './input.js'
import { executeWorldItemUse } from './item-use-executor.js'
import { commitItemEntityPlacement, planItemEntityPlacement } from './item-use-placement.js'
import { commitLatestPreparedSnapshot } from './latest-snapshot-transaction.js'
import {
  isV5RuntimeScriptRef,
  legacyProjectShellFromV5,
  legacySceneFromV5,
  legacyWorldScriptScratchV5,
  refreshLegacySceneBindingsV5,
} from './legacy-runtime-shell-v5.js'
import { type LoadedProject, loadSceneDef } from './loader.js'
import { type LoadedProjectV5, loadSceneDefV5 } from './loader-v5.js'
import {
  castOutdoorSkill,
  closeMagicMenu,
  type MagicMenuState,
  magicBackFromTarget,
  magicConfirmCaster,
  magicConfirmSpell,
  magicMoveCaster,
  magicMoveCursor,
  magicMoveTarget,
  openMagicMenu,
} from './magic-menu-state.js'
import { drawEquipMenu } from './menu/equip-box.js'
import {
  buildItemUseResultEntries,
  type ItemUseResultEntry,
  itemUseResultText,
} from './menu/item-use-result.js'
import { drawMagicMenu } from './menu/magic-box.js'
import { drawConfirmBox, loadMenuAssets, MenuBox } from './menu/menu-box.js'
import { drawRewardGainLine } from './menu/reward-gain.js'
import { handleRewardGainInput, RewardGainQueue } from './menu/reward-gain-queue.js'
import { drawSaveBrowser } from './menu/save-browser-box.js'
import { drawShop, openShopUi, type ShopUiState, shopInput } from './menu/shop-box.js'
import { drawSystemMenu } from './menu/system-box.js'
import { drawUseMenu } from './menu/use-box.js'
import { back, CLOSED, confirm, type MenuState, moveCursor, openMenu } from './menu-state.js'
import { resolveMove } from './movement.js'
import { runOpeningMenu, runOpeningMenuWithMusic } from './opening-menu.js'
import { Canvas2DRenderer, type CellRect, type SpriteDraw } from './render.js'
import { renderSceneFrame } from './render-scene.js'
import {
  browserConfirm,
  browserConfirmOverwriteNo,
  browserConfirmOverwriteYes,
  browserMoveCursor,
  closeSaveBrowser,
  openSaveBrowser,
  type SaveBrowserState,
} from './save/browser-state.js'
import { normalizePayloadV8, preflightSaveMigration, sha256Bytes } from './save/migration.js'
import {
  buildMeta,
  buildPayload,
  buildPayloadV8,
  captureThumbnail,
  normalizePayload,
  resolveLegacyFollowerSpriteId,
  resolveLegacyPlayerBattleSpriteId,
  resolveRestoredMusic,
} from './save/ops.js'
import { IndexedDbSaveStore, MemorySaveStore, type SaveStore } from './save/store.js'
import {
  ALL_SLOT_IDS,
  type SaveMeta,
  type SavePayload,
  type SavePayloadV8,
  type SlotId,
  type StoredSavePayload,
} from './save/types.js'
import { SceneEntrySession } from './scene-entry-session.js'
import type { SceneMapAssets } from './scene-map.js'
import { loadSceneMap } from './scene-map.js'
import {
  assertSceneSwitchDependenciesCurrent,
  captureSceneSwitchDependencies,
  prepareAndCommitSceneSwitch,
  type SceneSwitchDependencies,
} from './scene-switch-transaction.js'
import { resolveSceneSpawn } from './scene-transition.js'
import { runWithPresentationFinalizer, ScreenHoldTransaction } from './screen-hold-transaction.js'
import { advanceWave, WorldWaveRenderer } from './screen-wave.js'
import type { RuntimeLeafCommandV5 } from './script-compiler-v5.js'
import { ScriptConfirmModalQueue } from './script-confirm-modal.js'
import { executeLegacyScriptHostEffectV5 } from './script-host-adapter-v5.js'
import { ScriptProjectRuntimeV5 } from './script-project-v5.js'
import { type ScriptHost, ScriptRunner } from './script-runner.js'
import {
  actualFrameIndex,
  animFrameIndex,
  idleFrameIndex,
  loopFrameIndex,
  settleWalkAnimation,
  walkFrameIndex,
} from './sprite-anim.js'
import {
  closeSystemMenu,
  openSystemMenu,
  type SystemMenuState,
  systemConfirm,
  systemConfirmYes,
  systemMoveCursor,
  systemSwitchCommit,
  systemToggleConfirm,
} from './system-menu-state.js'
import { renderSpans } from './text/text-render.js'
import {
  closeUseMenu,
  finishUseExecution,
  openUseMenu,
  type UseExecutionRequest,
  type UseMenuState,
  useApply,
  useBackFromTarget,
  useConfirm,
  useMoveCursor,
} from './use-menu-state.js'
import { playVideo as playVideoOverlay } from './video-player.js'

type ScriptBattleOptions = NonNullable<Parameters<ScriptHost['startBattle']>[1]>
type DebugBattleOptions = ScriptBattleOptions & {
  enemyOverride?: string[]
  partyPreset?: {
    party: CharacterInstance[]
    inventory?: { itemId: string; count: number }[]
  }
}

// 切片 1 · 第一步：把真实 map 56（黑水镇民居）整张渲染出来，看清里头几间民居、挑一间。
// 下一步：定裁剪矩形（只取一间）+ 放李逍遥/鬼 + 走路/对话。
const TILE_W = 32
const TILE_H = 16
const _MARGIN = 32

/** 原版角色号 → 模板 id(0x55 学仙术等 legacy op 的 role 操作数;= 原版 PlayerRoles 表序。
 *  ⚠ 3=巫后、4=阿奴(原版名字指针 3/4 对调是名字层面,角色号本身照表序)。 */
const ORIGINAL_ROLE_TEMPLATES = [
  'li-xiaoyao',
  'zhao-linger',
  'lin-yueru',
  'wu-hou',
  'anu',
  'gai-luojiao',
] as const

// 移动手感（port sdlpal）。帧下标计算已数据化 → sprite-anim.ts(读 SpriteDef.layout,C0)。
const STEP_MS = 100 // 探索步进 ~10fps = 仙剑「卡顿感」（不是 60fps 平滑滑行）
// 方向 → 菱形轴单轴步进(D16):走一格只动一个轴。down=右下视野=row+1,up=左上=row-1,
// left=左下=col-1,right=右下=col+1(屏幕位移与原版 WALK_STEP 一致,见 gridToPixel 验证)。
const WALK_STEP: Record<Facing, { dcol: number; drow: number }> = {
  down: { dcol: 0, drow: 1 },
  up: { dcol: 0, drow: -1 },
  left: { dcol: -1, drow: 0 },
  right: { dcol: 1, drow: 0 },
}

function get2dContext(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = c.getContext('2d')
  if (!context) throw new Error('reforge: 2d context 不可用')
  return context
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}

// 画布延迟到 bootGame 取(曾模块级 getElementById → 导入即抓 DOM,无 #screen 的页面
// import 本模块直接炸;拆成可复用启动函数后,编辑器 play 页同源试玩也走 bootGame)。
let canvas!: HTMLCanvasElement
let ctx!: CanvasRenderingContext2D

/**
 * 引擎启动(页面无关的可复用入口):调用方备好 `<canvas id="screen">` + 已加载的工程。
 * 独立 reforge 页(boot.ts)传 loadProject(VITE_PROJECT_ID);编辑器 play 页(同源试玩)
 * 传 FSA/HTTP source 装出的工程 —— 本地工程句柄跨不了源,试玩必须同源,这就是拆出本函数的原因。
 * ⚠ 模块级严禁碰 DOM/location:barrel 导出后,node 测试环境 import 本模块即执行模块级代码。
 */
export async function bootGame(inputProject: LoadedProject | LoadedProjectV5): Promise<void> {
  const canonicalProjectV5 =
    inputProject.manifest.contentVersion === CONTENT_VERSION
      ? (inputProject as LoadedProjectV5)
      : undefined
  let worldScriptV5: WorldScriptStateV5 | undefined
  let project: LoadedProject
  if (canonicalProjectV5) {
    worldScriptV5 = emptyWorldScriptStateV5()
    project = legacyProjectShellFromV5(canonicalProjectV5, worldScriptV5)
  } else project = inputProject as LoadedProject
  const itemEquipDescribeCtx = {
    skillName: (id) => project.skills[id]?.name,
    actorName: (id) => {
      const actor = project.actorsById[id]
      return actor ? lookupText(actor.name, project.locale) : undefined
    },
    battleSpriteName: (id) => project.battleSpritesById[id]?.label,
  } satisfies EquipDescribeCtx
  canvas = document.getElementById('screen') as HTMLCanvasElement
  if (!canvas) throw new Error('bootGame: 页面缺 <canvas id="screen">')
  ctx = get2dContext(canvas)
  assertEngineChromeComplete()
  // 调试:?collision 把障碍格(0x2000)染色盖在画面上,肉眼比对禁入格 vs 视觉墙。
  // D13-1:debugLayers 供 ?debug overlay 动态开关(collision / triggers 触发区叠加层)。
  const debugLayers = {
    collision: new URLSearchParams(location.search).has('collision'),
    triggers: false,
  }
  document.title = `${project.manifest.name} · reforge` // 标题随工程(index.html 只是加载占位)
  const params = new URLSearchParams(location.search)
  const saveNormalizeOptions = {
    legacyPortraitAsset: (legacy: number): AssetId | undefined => {
      const asset = legacyPalPortraitAssetId(legacy)
      return asset && project.assetCatalog.assets[asset]?.kind === 'portrait' ? asset : undefined
    },
    validatePortraitAsset: (asset: AssetId): void => {
      project.assetResolver.record(asset, 'portrait')
    },
    legacyFollowerSpriteId: (legacy: number): string | undefined => {
      return resolveLegacyFollowerSpriteId(project.spritesById, legacy)
    },
    validateFollowerSpriteId: (spriteId: string): void => {
      if (!project.spritesById[spriteId]) throw new Error(`sprites 注册表无 ${spriteId}`)
    },
    legacyPlayerBattleSpriteId: (legacy: number): string | undefined =>
      resolveLegacyPlayerBattleSpriteId(project.battleSpritesById, legacy),
    validatePlayerBattleSpriteId: (definitionId: string): void => {
      const definition = project.battleSpritesById[definitionId]
      if (!definition) throw new Error(`battleSprites 注册表无 ${definitionId}`)
      if (definition.profile.kind !== 'player-fighter')
        throw new Error(`期望 player-fighter，实际 ${definition.profile.kind}`)
    },
  }
  const sfx = new SfxPlayer(project.assetResolver) // 应用级单例(解码缓存跨战斗复用)
  const bgm = createBgmPlayer(project.assetResolver)
  // autoplay 解锁:BGM/SFX 都可能在 boot 时建出 suspended context。每次真实手势都允许重试，
  // 避免首次 resume 被浏览器拒绝后永久静音；播放器内部负责并发去重。
  const resumeAudio = (): void => {
    bgm.resume()
    void sfx.resume().catch((error: unknown) => {
      console.warn('[sfx] AudioContext resume 失败；下一次用户手势将重试', error)
    })
  }
  for (const ev of ['pointerdown', 'keydown'] as const)
    window.addEventListener(ev, resumeAudio, { capture: true })
  // 音乐/音效开关持久(应用级配置 localStorage,不随存档 —— 原版 sdlpal.cfg 同性质)
  const audioPrefs = { music: true, sound: true }
  try {
    const raw = localStorage.getItem('reforge:audio')
    if (raw) {
      const p = JSON.parse(raw) as { music?: boolean; sound?: boolean }
      audioPrefs.music = p.music !== false
      audioPrefs.sound = p.sound !== false
    }
  } catch {
    /* 坏数据 → 默认全开 */
  }
  bgm.setEnabled(audioPrefs.music)
  sfx.setEnabled(audioPrefs.sound)
  // M4d-2:命中特效精灵 + 特效帧基表(跨战斗不变,懒载一次;demo 无此资产 → undefined 跳过 overlay)
  let effectSpriteP: Promise<import('./assets.js').LoadedSprite | undefined> | null = null
  const loadEffectOnce = () => {
    effectSpriteP ??= loadEffectSprite(project.assetBase).catch(() => undefined)
    return effectSpriteP
  }

  // ── 引擎 chrome(跨场景不变)──
  const [glyphs, cursorFrames] = await Promise.all([loadGlyphs(), loadCursorFrames()])
  // 立绘按引用惰性读取；DialogBox 持有这张可变 AssetId 表。
  const portraits = new Map<AssetId, ImageBitmap>()
  // face 只有角色显式声明的少量资源；菜单与战斗同步绘制，启动时一次预载并 fail-loud。
  const faceImages = new Map<AssetId, ImageBitmap>()
  await Promise.all(
    Object.values(project.actorsById).map(async (actor) => {
      if (actor.face) faceImages.set(actor.face, await project.imageCache.load(actor.face, 'face'))
    }),
  )

  // ── 场景资产缓存(M2c,设计 §3):map/tileset 按稳定 mapId LRU(cap16 + protect 当前,
  // 修一阶段按 sceneId 双取坑);palette/sceneDef 小缓存;精灵跨场景累积。──
  const MAP_CACHE_CAP = 16
  // 键 = ProjectMapV2 的稳定 mapId。
  const mapCache = new Map<string, SceneMapAssets>()
  async function getMapAssets(mapId: string): Promise<SceneMapAssets> {
    const hit = mapCache.get(mapId)
    if (hit) {
      mapCache.delete(mapId) // LRU touch(Map 插入序 = LRU 序)
      mapCache.set(mapId, hit)
      return hit
    }
    const entry = await loadSceneMap(project.assetBase, mapId, project.tilesets, project.mapIndex)
    mapCache.set(mapId, entry)
    while (mapCache.size > MAP_CACHE_CAP) {
      const oldest = mapCache.keys().next().value
      if (oldest === undefined || oldest === mapId) break // protect 当前
      mapCache.delete(oldest)
    }
    return entry
  }
  let standardPalettePromise: Promise<Palette> | undefined
  function getStandardPalette(): Promise<Palette> {
    standardPalettePromise ??= loadStandardPalette(project.assetBase)
    return standardPalettePromise
  }
  const sceneDefCache = new Map<string, SceneDef>()
  sceneDefCache.set(project.entryScene.id, project.entryScene)
  const canonicalSceneCacheV5 = new Map<string, SceneDefV5>()
  if (canonicalProjectV5)
    canonicalSceneCacheV5.set(canonicalProjectV5.entryScene.id, canonicalProjectV5.entryScene)
  async function getCanonicalSceneDefV5(id: string): Promise<SceneDefV5> {
    if (!canonicalProjectV5) throw new Error('canonical v5 scene loader 未启用')
    const hit = canonicalSceneCacheV5.get(id)
    if (hit) return hit
    const def = await loadSceneDefV5(canonicalProjectV5, id)
    canonicalSceneCacheV5.set(id, def)
    return def
  }
  async function getSceneDef(id: string): Promise<SceneDef> {
    if (canonicalProjectV5)
      return legacySceneFromV5(
        await getCanonicalSceneDefV5(id),
        worldScriptV5 ?? emptyWorldScriptStateV5(),
      )
    // 缓存存 pristine,取用深拷贝 —— 运行时直接 mutate scene.entities(演出走位/隐藏/改触发),
    // 返回活对象会把污染带进场景重入与同场景读档(X1 核出的真 bug)。跨场景持久一律走
    // world.script(entityState/vars),场景重入 = def 初态 + applyWorldToScene 重放。
    const hit = sceneDefCache.get(id)
    if (hit) return structuredClone(hit)
    const def = await loadSceneDef(project, id)
    sceneDefCache.set(id, def)
    return structuredClone(def)
  }
  /** RLE 索引帧组缓存；AssetId 共享解码，record 签名变化自动失效。 */
  const spriteCache = new SpriteAssetCache(96)

  // 调试：?gallery 渲染精灵速查图（按 SpriteDef/AssetId 确认人物与物件），不进场景。
  if (params.has('gallery')) {
    await renderSpriteGallery(project, await getStandardPalette())
    return
  }

  // M4b-1:?battle-preview=<field>&enemies=1,2,3 战斗**静态摆位**预览(不进主循环)。
  // ⚠ 原参数名 ?battle 已让位给「真战斗直开」(编辑器 ⚔ 试打,main 内处理)。
  if (params.has('battle-preview')) {
    await renderBattlePreview(project, params)
    return
  }

  const WORLD_SCALE = 4 // 逻辑 320×200 → 物理 1280×800;整数倍 + pixelated 保点阵锐利
  const VIEW_W = 320
  const VIEW_H = 200
  const PARTY_OX = 160 // 玩家在屏幕上的落点（PARTYOFFSET，原版 160 / 112）
  const PARTY_OY = 112

  // ── 活动场景态(M2c:boot = switchScene 第一跳,单一代码路)──
  let scene: SceneDef = project.entryScene
  let map!: SceneMapAssets['map']
  let tiles!: Map<number, RleFrame>
  let palette!: Palette
  let renderer!: Canvas2DRenderer
  let waveRenderer: Canvas2DRenderer | null = null
  let room!: CellRect
  let viewMinX = 0
  let viewMinY = 0
  let viewMaxX = 0
  let viewMaxY = 0
  let entitySpriteDefs = new Map<string, SpriteDef>()
  // 首次 switchScene 前建立，boot/重入/读档都由 commitSceneSwitch 原子重建页动作。
  const entityActions = new EntityActionPlayer((_entity, cue) => {
    if (cue.kind === 'sound') sfx.play(cue.asset)
  })
  const player: { pos: GridPos } = { pos: { ...project.entryScene.entry.pos } }
  let facing: Facing = project.entryScene.entry.facing
  // 原版 gs.wLayer：0x6E 第三操作数是逻辑层号，渲染时按 8px/层参与
  // sort/cover；换场景由 sdlpal 真值清零。
  let partyLayer = 0
  let walking = false
  let stepFrame = 0 // 0..3 走帧相位(步进节拍 = advanceMoves 的全局世界拍)
  // ── E7 跟随者定位(party[1..N])──────────────────────────────────────────
  // 队员并进 E6 定位权威:follow(贪吃蛇踩队长走过的格)/ mount(骑乘=父+偏移)/ script(显式站位)。
  // follow 无插值:队长走一步队员各进一步,位置=轨迹历史格+队形偏移(原地转身队员不动)。
  // 骑乘走 mount **不查轨迹** → 无 phase-1「滞后掉队」bug。
  // trail 槽(原版 rgTrail 下标模型):[0]=最新/[1]=上一步/[2]=更早。队长每走一步 unshift。
  let trail: TrailEntry[] = []
  // 跟随者冻结快照(演出/骑乘期位置冻结,防重叠跳变;原版 frozenOffset)
  const followerFrozen: (FollowerFrozen | null)[] = []
  type FollowerAuthority =
    | { kind: 'follow' }
    | { kind: 'mount'; parent: string; dx: number; dy: number; facing?: Facing }
    | { kind: 'script'; pos: GridPos; facing: Facing }
  const followerAuth = new Map<number, FollowerAuthority>() // 队员 idx(1..)→权威;缺省 follow
  const followerPos: ({ pos: GridPos; facing: Facing } | undefined)[] = [] // 派生(idx 0 空=队长)
  // 世界拍状态(声明须早于 switchScene 首调,TDZ):累加器/拍计数/本 rAF 拍数(0/1)
  let worldMoveAcc = 0
  let worldTickNum = 0
  let worldTicksThisFrame = 0
  /** D13-1 帧步进(K5):active=冻结墙钟推进,stepRequested=本帧强制一拍(STEP_MS)。 */
  const frameStepState = { active: false, stepRequested: false }

  const camera = { x: 0, y: 0 }
  // 脚本相机偏移(0x7F 累积;⚠ 一阶段彩依飞走案:走位期间此偏移必须保持,回正才清零,
  // 绝不在跟随时抹掉 —— 见 CLAUDE.md「相机」陷阱)。切场景清零。
  const cameraOffset = { x: 0, y: 0 }
  const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)
  function updateCamera(): void {
    const pp = gridToPixel(player.pos)
    camera.x = clamp(
      pp.x - PARTY_OX + cameraOffset.x,
      viewMinX,
      Math.max(viewMinX, viewMaxX - VIEW_W),
    )
    camera.y = clamp(
      pp.y - PARTY_OY + cameraOffset.y,
      viewMinY,
      Math.max(viewMinY, viewMaxY - VIEW_H),
    )
  }

  // 精灵解析(C0):实体 → actor/prop → sprites 注册表;玩家 = party[0] 的 ActorDef.spriteId。
  const requireSpriteDef = (spriteId: string | undefined, what: string): SpriteDef => {
    const def = spriteId ? project.spritesById[spriteId] : undefined
    if (!def)
      throw new Error(`reforge: ${what} 的精灵 "${spriteId ?? '(未解析)'}" 不在 sprites 注册表`)
    return def
  }
  // 入口点(开局档):?entry=<id> 选一条 → 用它的 startWorld + 场景开局;缺省(无 ?entry / 无菜单)=
  // manifest.entryScene + startWorld(兼容单入口)。存档状态走 startWorld(数据),开场叙事走该场景
  // onEnter(脚本)—— 见 EntryPoint 注。主菜单 UI(照原版标题屏)日后接,现经 ?entry 选。
  const entryPoints: EntryPoint[] = project.manifest.entryPoints ?? [
    { id: 'new-game', label: '开始游戏', scene: project.manifest.entryScene },
  ]
  const entryParam = params.get('entry')
  let bootEntry = entryParam ? entryPoints.find((e) => e.id === entryParam) : undefined
  if (entryParam && !bootEntry) console.warn(`[boot] 入口点 "${entryParam}" 不存在,走默认开局`)
  // 主菜单「读取进度」选定的存档槽:非空 → boot 尾走 doLoad 还原(跳过 onEnter 开场演出)。
  let bootLoadSlot: SlotId | undefined
  // 存档存储 + 菜单 UI 资产提前建(菜单读档界面即用;总加载量与原先一致,仅提前到菜单前)。
  const saveStore: SaveStore =
    typeof indexedDB !== 'undefined' ? new IndexedDbSaveStore() : new MemorySaveStore()
  const defaultPortrait =
    project.actorsById['li-xiaoyao']?.portraits?.default ??
    Object.values(project.actorsById).find((actor) => actor.portraits)?.portraits?.default
  const menuAssets = await loadMenuAssets(project.items, project.imageCache, defaultPortrait)
  const playVideoAsset = async (asset: string | undefined, signal?: AbortSignal): Promise<void> => {
    if (!asset) return
    if (signal?.aborted) throw asyncIntentAbortError(`视频 ${asset} 所属 runner 已取消`)
    const src = await project.assetResolver.urlFor(asset, 'video')
    if (signal?.aborted) throw asyncIntentAbortError(`视频 ${asset} 所属 runner 已取消`)
    await playVideoOverlay({ src, signal })
    if (signal?.aborted) throw asyncIntentAbortError(`视频 ${asset} 所属 runner 已取消`)
  }
  const playVideoSequence = async (
    assets: readonly (string | undefined)[] | undefined,
    signal?: AbortSignal,
  ): Promise<void> => {
    for (const asset of assets ?? []) await playVideoAsset(asset, signal)
  }
  // 主菜单标题屏(?menu;dev 用 ?scene/?entry 直达跳过):照原版 FBP 2(盘0)+ 竖排 entryPoints + 读取进度。
  // 选开局项 → bootEntry(其 startWorld + 场景开局);选读档 → bootLoadSlot。(正式发布可翻默认走菜单,现 ?menu opt-in。)
  if (params.has('menu') && !bootEntry) {
    if (!params.has('skip-startup')) {
      await playVideoSequence([
        project.manifest.assets.roles['video.startupTrademark'],
        project.manifest.assets.roles['video.startupSplash'],
      ])
    }
    const menuBg = await loadEngineChromeImage('opening.default-title')
    const decision = await runOpeningMenuWithMusic(
      bgm,
      project.manifest.assets.roles['audio.openingMenuMusic'],
      () =>
        runOpeningMenu({
          ctx,
          glyphs,
          bg: menuBg,
          worldScale: WORLD_SCALE,
          items: entryPoints.map((e) => ({ id: e.id, label: e.label })),
          locale: project.locale,
          menuAssets,
          saveStore,
        }),
    )
    if (decision.kind === 'load') bootLoadSlot = decision.slotId
    else {
      bootEntry = entryPoints.find((e) => e.id === decision.entryId) ?? bootEntry
      await playVideoAsset(bootEntry?.introVideo)
    }
  }
  // ?party=<id,id,…> dev 覆写开局队伍(验合击等多队员功能;满血在 buildWorld 后统一拉);首位应为世界队长
  const partyParam = params.get('party')
  const baseStartWorld = bootEntry?.startWorld ?? project.manifest.startWorld
  const bootStartWorld = partyParam
    ? {
        ...baseStartWorld,
        party: partyParam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }
    : baseStartWorld
  // world 须先于 switchScene 定义(switchScene 首调在 boot 时读 world.script.mapOverride;
  // 0x99 底图覆写持久层。放此前 = 避免 TDZ)。
  let world = buildWorld(bootStartWorld, project.actorsById)
  if (!world.party[0]) throw new Error('reforge: 开局队伍不能为空')
  const worldMutationIntent = new AsyncIntentController()
  const loadIntent = new AsyncIntentController()
  const sceneSwitchIntent = new AsyncIntentController()
  const scriptMutationIntent = new AsyncIntentController()
  const partyMutationIntent = new AsyncIntentController()
  const actorSpriteMutationIntents = new Map<string, AsyncIntentController>()
  const actorAppearanceMutationIntents = new Map<string, AsyncIntentController>()
  const actorSpriteOverrides = new Map<string, { def: SpriteDef; frames: LoadedSprite }>()
  const assertRunnerActive = (signal: AbortSignal | undefined, message: string): void => {
    if (signal?.aborted) throw asyncIntentAbortError(message)
  }
  const awaitRunner = <T>(
    promise: Promise<T>,
    signal: AbortSignal | undefined,
    message: string,
  ): Promise<T> => {
    if (!signal) return promise
    assertRunnerActive(signal, message)
    return new Promise<T>((resolve, reject) => {
      let settled = false
      const finish = (result: { value: T } | { error: unknown }): void => {
        if (settled) return
        settled = true
        signal.removeEventListener('abort', abort)
        if ('error' in result) reject(result.error)
        else resolve(result.value)
      }
      const abort = (): void => finish({ error: asyncIntentAbortError(message) })
      signal.addEventListener('abort', abort, { once: true })
      if (signal.aborted) abort()
      void promise.then(
        (value) => finish({ value }),
        (error: unknown) => finish({ error }),
      )
    })
  }
  const replaceWorld = (next: typeof world): void => {
    worldMutationIntent.invalidate()
    world = next
  }
  const actorMutationIntent = (
    intents: Map<string, AsyncIntentController>,
    actorId: string,
  ): AsyncIntentController => {
    const current = intents.get(actorId) ?? new AsyncIntentController()
    intents.set(actorId, current)
    return current
  }
  const invalidatePendingScriptMutations = (): void => {
    scriptMutationIntent.invalidate()
    partyMutationIntent.invalidate()
    for (const intent of actorSpriteMutationIntents.values()) intent.invalidate()
    for (const intent of actorAppearanceMutationIntents.values()) intent.invalidate()
  }
  const partySpriteDef = (character: (typeof world.party)[number]): SpriteDef => {
    const override = actorSpriteOverrides.get(character.template)
    if (override) return override.def
    const actor = project.actorsById[character.template]
    return requireSpriteDef(
      character.appearance?.spriteId ?? actor?.spriteId,
      `队员 ${character.template}`,
    )
  }
  const partyVisual = (
    character: (typeof world.party)[number],
  ): { def: SpriteDef; frames: LoadedSprite } | undefined => {
    const override = actorSpriteOverrides.get(character.template)
    if (override) return override
    const def = partySpriteDef(character)
    const frames = spriteCache.get(project.assetResolver, def.asset)
    return frames ? { def, frames } : undefined
  }
  const itemSoundAssets = (itemId: string): string[] => {
    const item = project.items[itemId]
    return [
      item?.use?.sound,
      item?.throw?.sound,
      item?.throw?.presentation?.kind === 'magic'
        ? item.throw.presentation.animation.sound
        : undefined,
    ].filter((asset): asset is string => !!asset)
  }
  const prepareItemSounds = (itemId: string): Promise<void> => sfx.prepare(itemSoundAssets(itemId))
  const prepareSceneSounds = async (def: SceneDef, worldView: typeof world): Promise<void> => {
    const override = worldView.script?.sceneScriptOverrides?.[def.id]
    const soundScene = structuredClone(def)
    const additionalRoots: unknown[] = []
    for (const slot of ['onEnter', 'onTeleport'] as const) {
      if (!override || !Object.hasOwn(override, slot)) continue
      delete soundScene[slot]
      if (override[slot]) additionalRoots.push(override[slot])
    }
    const currentItems = new Map(
      worldView.inventory.flatMap((entry) => {
        const item = project.items[entry.itemId]
        return entry.count > 0 && item ? [[item.id, item] as const] : []
      }),
    )
    for (const item of usableItems(worldView, project.items)) currentItems.set(item.id, item)
    const sounds = await collectSceneSoundAssets({
      scene: soundScene,
      ...(additionalRoots.length ? { additionalRoots } : {}),
      inventoryItems: [...currentItems.values()],
      ...(project.scriptStore ? { resolver: project.scriptStore } : {}),
      spritesById: project.spritesById,
      signal: new AbortController().signal,
    })
    await sfx.prepare(sounds)
  }
  const ditherTransition = new DitherTransitionController<ImageData>()
  const sceneEntrySession = new SceneEntrySession<ImageData>()
  const frameSequenceReader = new FrameSequenceReader(project.assetResolver)
  const frameAnimationPresentation = new FrameAnimationPresentationState()
  let frameAnimationLayerCanvas: HTMLCanvasElement | null = null
  const writeFrameAnimationLayer = (frame: FrameAnimationFrameSnapshot): void => {
    if (!frameAnimationLayerCanvas) frameAnimationLayerCanvas = document.createElement('canvas')
    const layer = frameAnimationLayerCanvas
    layer.width = frame.width
    layer.height = frame.height
    const layerCtx = get2dContext(layer)
    const image = layerCtx.createImageData(frame.width, frame.height)
    image.data.set(frame.rgba)
    layerCtx.putImageData(image, 0, 0)
  }
  /** 帧动画播放器只更新 Cinematic Layer，不直接操作主画布或 DOM 层级。 */
  const presentFrameAnimationFrame = (frame: FrameAnimationFrameSnapshot): void => {
    frameAnimationPresentation.present(frame)
    writeFrameAnimationLayer(frame)
  }
  /** 首段资源加载期间冻结当前完整输出；连续段已有上一张末帧，不再另取世界帧。 */
  const beginFrameAnimationPlayback = (): void => {
    let fallback: FrameAnimationFrameSnapshot | undefined
    if (!frameAnimationPresentation.hasBufferedFrame) {
      const current = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const captured: FrameAnimationFrameSnapshot = {
        width: current.width,
        height: current.height,
        rgba: new Uint8ClampedArray(current.data),
      }
      fallback = captured
      writeFrameAnimationLayer(captured)
    }
    frameAnimationPresentation.beginPlayback(fallback)
  }
  const resetFrameAnimationPresentation = (): void => {
    frameAnimationPresentation.reset()
    frameAnimationLayerCanvas = null
  }
  /** Presentation Pass 2：在 World Layer 之上合成 Cinematic Layer。 */
  const drawCinematicLayer = (): boolean => {
    if (!frameAnimationPresentation.visibleFrame || !frameAnimationLayerCanvas) return false
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(frameAnimationLayerCanvas, 0, 0, canvas.width, canvas.height)
    ctx.restore()
    return true
  }
  let ditherZeroFrameMatchesBackup: boolean | null = null
  let ditherZeroFrameDiffersFromTarget: boolean | null = null
  const ditherDebugState = () => {
    const active = ditherTransition.active
    const zeroFrame = {
      zeroFrameMatchesBackup: ditherZeroFrameMatchesBackup,
      zeroFrameDiffersFromTarget: ditherZeroFrameDiffersFromTarget,
    }
    if (active) {
      const pr =
        active.startedAt === null
          ? 0
          : active.durationMs <= 0
            ? 1
            : Math.max(0, Math.min(1, (performance.now() - active.startedAt) / active.durationMs))
      return {
        active: true,
        pending: false,
        pr,
        step: active.lastStep,
        hasTarget: !!active.target,
        hasPlan: !!active.plan,
        prepareMs: active.prepareMs,
        source: active.source,
        algorithm: 'source-level-target-band',
        ...zeroFrame,
      }
    }
    const entry = sceneEntrySession.active
    return entry?.phase === 'preparing' && entry.reveal.kind === 'dither'
      ? {
          active: false,
          pending: true,
          pr: 0,
          step: -1,
          hasTarget: false,
          targetSceneId: entry.targetSceneId,
          source: 'entry',
          algorithm: 'source-level-target-band',
          ...zeroFrame,
        }
      : {
          active: false,
          pending: false,
          pr: 0,
          step: -1,
          hasTarget: false,
          algorithm: 'source-level-target-band',
          ...zeroFrame,
        }
  }
  const sceneEntryDebugState = () => {
    const active = sceneEntrySession.active
    return active
      ? {
          active: true,
          token: active.token,
          sourceSceneId: active.sourceSceneId,
          targetSceneId: active.targetSceneId,
          phase: active.phase,
          reveal: active.reveal,
          hasSourceFrame: true,
        }
      : { active: false }
  }
  const syncDitherDebugDataset = (): void => {
    if (!import.meta.env.DEV) return
    canvas.dataset.rfScene = scene.id
    canvas.dataset.rfDither = JSON.stringify(ditherDebugState())
    canvas.dataset.rfSceneEntry = JSON.stringify(sceneEntryDebugState())
    canvas.dataset.rfRender = JSON.stringify({
      fadeBlack: fadeDriver.value,
      position: player.pos,
      facing,
      scriptRunning: !!runner,
      dialogActive: dialogBox.active,
      frameAnimationLayerMode: frameAnimationPresentation.mode,
      frameAnimationLayerVisible: frameAnimationPresentation.visibleFrame !== undefined,
    })
  }
  const markSceneLoad = (from: string, to: string, step: string): void => {
    if (import.meta.env.DEV) canvas.dataset.rfSceneLoad = JSON.stringify({ from, to, step })
  }
  // dev ?party:强制的队员拉满 HP/MP,确保 healthy(否则如赵灵儿初始 28/240 = 濒死,合击项灰)
  if (partyParam)
    for (const c of world.party) {
      c.hp = c.maxHP
      c.mp = c.maxMP
    }
  // DEV 调试口(__rfBattle 同款):验收/自动化直读世界态(party HP/MP、money、learnedSkills)
  if (import.meta.env.DEV) {
    Object.defineProperty(window, '__rfWorld', { get: () => world, configurable: true })
    Object.defineProperty(window, '__rfScene', { get: () => scene, configurable: true })
    Object.defineProperty(window, '__rfDither', {
      get: ditherDebugState,
      configurable: true,
    })
    Object.defineProperty(window, '__rfSceneEntry', {
      get: sceneEntryDebugState,
      configurable: true,
    })
  }
  const syncLegacyScriptScratchV5 = (sceneId: string): void => {
    if (!worldScriptV5) return
    world.script = legacyWorldScriptScratchV5(worldScriptV5, sceneId)
  }
  const replaceWorldScriptStateV5 = (next: WorldScriptStateV5): void => {
    if (!worldScriptV5) throw new Error('script v5 world authority 未初始化')
    const target = worldScriptV5 as unknown as Record<string, unknown>
    for (const key of Object.keys(target)) delete target[key]
    Object.assign(target, structuredClone(next))
  }
  if (worldScriptV5) syncLegacyScriptScratchV5(project.entryScene.id)
  else world.script ??= emptyWorldScriptState()

  const runnableStages = (binding: RuntimeScriptBinding): ScriptStage[] =>
    Array.isArray(binding) ? binding : [{ body: [{ kind: 'callScript', ref: binding }] }]

  /** 解析场景脚本三态:字段缺席继承静态槽,null 显式禁用,绑定则覆盖。 */
  const sceneScriptBinding = (
    def: SceneDef,
    slot: 'onEnter' | 'onTeleport',
    worldView: typeof world,
  ): RuntimeScriptBinding | undefined => {
    const override = worldView.script?.sceneScriptOverrides?.[def.id]
    if (override && Object.hasOwn(override, slot)) return override[slot] ?? undefined
    return def[slot]
  }

  /** loadScene 只读取目标活动 stage 的显式 entry；不解析 body、不穿透 ScriptRef。 */
  const bindingSceneEntry = (
    key: string,
    binding: RuntimeScriptBinding | undefined,
    worldView: typeof world,
  ): SceneEntryPresentation | undefined => {
    if (!binding) return undefined
    const stages = runnableStages(binding)
    const stage = stages[stageIndexFor(expectDefined(worldView.script), key, stages)]
    return stage?.entry
  }

  interface SceneSwitchPlan {
    sceneId: string
    def: SceneDef
    assets: SceneMapAssets
    palette: Palette
    renderer: Canvas2DRenderer
    entityDefs: Map<string, SpriteDef>
    pageActions: EntityActionSeed[]
    neededSprites: Set<AssetId>
    spawn: ReturnType<typeof resolveSceneSpawn>
    dependencies: SceneSwitchDependencies
    useActorOverrides: boolean
    onEnterBinding: RuntimeScriptBinding | undefined
    onEnterEntry: SceneEntryPresentation | undefined
  }

  /** 只准备所有可能失败的场景依赖；不得改活动 world/scene/cache 工作集。 */
  async function prepareSceneSwitch(
    sceneId: string,
    worldView: typeof world,
    spawn?: SceneSpawn & { inheritFacing?: Facing },
    useActorOverrides = true,
  ): Promise<SceneSwitchPlan> {
    if (worldScriptV5 && worldView === world) syncLegacyScriptScratchV5(sceneId)
    // 活动 world 会被并行 auto 原地修改；预检必须只读调用瞬间的快照，并在提交前对依赖签名。
    const dependencies = captureSceneSwitchDependencies(
      worldView,
      sceneId,
      actorSpriteOverrides,
      useActorOverrides,
    )
    const preparedWorld = structuredClone(worldView)
    const preparedActorOverrides = useActorOverrides
      ? new Map(actorSpriteOverrides)
      : new Map<string, { def: SpriteDef; frames: LoadedSprite }>()
    const def = await getSceneDef(sceneId)
    // 0x99 底图覆写:按稳定 mapId 换底(麒麟洞岩浆),随存档持久。
    const mapId = preparedWorld.script?.mapOverride?.[sceneId] ?? def.mapId
    const defs = new Map<string, SpriteDef>()
    for (const e of def.entities) {
      // 隐藏实体也登记(M3a:脚本 setEntityState 可显形);zone 无视觉跳过
      const sid = resolveEntitySpriteId(e, project.actorsById)
      if (!sid) continue
      defs.set(e.id, requireSpriteDef(sid, `实体 ${e.id}`))
    }
    const partyDefs = preparedWorld.party.map((character) => {
      const override = useActorOverrides
        ? preparedActorOverrides.get(character.template)
        : undefined
      if (override) return override.def
      const actor = project.actorsById[character.template]
      return requireSpriteDef(
        character.appearance?.spriteId ?? actor?.spriteId,
        `队员 ${character.template}`,
      )
    })
    const extraFollowerDefs = (preparedWorld.script?.followers ?? []).map((spriteId) =>
      requireSpriteDef(spriteId, `编外跟随者 ${spriteId}`),
    )
    const needed = new Set<AssetId>([
      ...[...defs.values()].map((sprite) => sprite.asset),
      ...partyDefs.map((sprite) => sprite.asset),
      ...extraFollowerDefs.map((sprite) => sprite.asset),
    ])
    const neededAssets = [...needed]
    const [assets, pal, loadedSprites] = await Promise.all([
      getMapAssets(mapId),
      getStandardPalette(),
      Promise.all(neededAssets.map((asset) => spriteCache.load(project.assetResolver, asset))),
      // readiness 是场景事务的一部分：脚本首帧只允许同步命中已解码 buffer，绝不迟播。
      prepareSceneSounds(def, preparedWorld),
    ])
    const loadedByAsset = new Map(
      neededAssets.map((asset, index) => [asset, expectDefined(loadedSprites[index])] as const),
    )
    const pageActions: EntityActionSeed[] = []
    for (const entity of def.entities) {
      const binding = entity.pages?.[0]?.animation
      if (!binding) continue
      const sprite = defs.get(entity.id)
      if (!sprite)
        throw new Error(
          `reforge: 场景 ${def.id} 实体 ${entity.id} 声明页动作但没有可解析的大世界精灵`,
        )
      const loaded = loadedByAsset.get(sprite.asset)
      const resolved = resolveSpriteActionBinding(
        sprite,
        binding,
        loaded?.frames.length,
        `reforge: 场景 ${def.id} 实体 ${entity.id} pages[0].animation`,
      )
      pageActions.push({ entity: entity.id, ...resolved })
    }
    const onEnterBinding = sceneScriptBinding(def, 'onEnter', preparedWorld)
    return {
      sceneId,
      def,
      assets,
      palette: pal,
      renderer: new Canvas2DRenderer(ctx, pal, assets.tiles),
      entityDefs: defs,
      pageActions,
      neededSprites: needed,
      spawn: resolveSceneSpawn(sceneId, def, spawn),
      dependencies,
      useActorOverrides,
      onEnterBinding,
      onEnterEntry: bindingSceneEntry(`s:${sceneId}`, onEnterBinding, preparedWorld),
    }
  }

  function assertSceneSwitchPlanCurrent(plan: SceneSwitchPlan, worldView: typeof world): void {
    assertSceneSwitchDependenciesCurrent(
      plan.dependencies,
      captureSceneSwitchDependencies(
        worldView,
        plan.sceneId,
        actorSpriteOverrides,
        plan.useActorOverrides,
      ),
      `切场景 ${plan.sceneId} 的预检依赖已变化`,
    )
  }

  /** 所有 await 已结束后的同步提交点；失败预检不会留下新 world + 旧 scene。 */
  function commitSceneSwitch(
    plan: SceneSwitchPlan,
    worldView: typeof world,
    applySceneMusic = true,
  ): void {
    spriteCache.prune(plan.neededSprites)
    resetFrameAnimationPresentation()
    scene = plan.def
    map = plan.assets.map
    tiles = plan.assets.tiles
    palette = plan.palette
    renderer = plan.renderer
    waveRenderer = null
    entitySpriteDefs = plan.entityDefs
    entityActions.replaceScene(plan.pageActions)
    room = { col: 0, row: 0, cols: map.width, rows: map.height }
    viewMinX = room.col * TILE_W - TILE_W
    viewMinY = room.row * TILE_H - 40
    viewMaxX = (room.col + room.cols) * TILE_W + TILE_W
    viewMaxY = (room.row + room.rows) * TILE_H + 16
    player.pos = plan.spawn.pos
    facing = plan.spawn.facing
    partyLayer = 0
    walking = false
    stepFrame = 0
    // 场景落点等价 0x46:按当前朝向向身后铺满轨迹，队员无需先走一步才显出队形。
    trail = seedFormationTrail(player.pos, facing)
    followerFrozen.length = 0
    followerPos.length = 0
    followerAuth.clear() // 跨场景回 follow(骑乘/站位权威是演出期瞬时态,不跨场景)
    worldMoveAcc = 0 // 世界拍相位随场景重置
    updateCamera()
    // 场景 BGM:字段缺省 = 延续；AssetId = 切曲；null = 显式停曲。
    if (applySceneMusic && plan.def.music !== undefined) {
      worldView.audio ??= {}
      worldView.audio.currentMusic = plan.def.music
      if (plan.def.music === null) bgm.stop()
      else bgm.play(plan.def.music)
    }
  }

  /**
   * 切场景(M2c):先准备全部 map/palette/sprite/sound，再在一个同步点提交。boot 也走此路径。
   */
  async function switchScene(
    sceneId: string,
    spawn?: SceneSpawn & { inheritFacing?: Facing },
    beforeCommit?: () => void,
    useActorOverrides = true,
  ): Promise<void> {
    const sceneToken = sceneSwitchIntent.begin()
    const worldToken = worldMutationIntent.capture()
    const worldView = world
    const plan = await prepareSceneSwitch(sceneId, worldView, spawn, useActorOverrides)
    sceneSwitchIntent.assertCurrent(sceneToken, `切场景 ${sceneId} 已被更新请求取代`)
    worldMutationIntent.assertCurrent(worldToken, `切场景 ${sceneId} 时所属世界已失效`)
    if (world !== worldView) throw asyncIntentAbortError(`切场景 ${sceneId} 时活动世界已替换`)
    assertSceneSwitchPlanCurrent(plan, worldView)
    beforeCommit?.()
    commitSceneSwitch(plan, worldView)
  }

  // 初始场景:?scene=<id> dev 直达(须在 index),否则 manifest 入口。
  // ?pos=col,row(&facing=)覆盖落点 —— X5 跳转预览:编辑器「引擎试玩」跳到事件现场。
  const sceneParam = params.get('scene')
  // 场景优先级:?scene dev 直达 > 选中入口点的场景 > manifest 默认入口。
  const initialSceneId =
    sceneParam && project.sceneIds.includes(sceneParam)
      ? sceneParam
      : bootEntry?.scene && project.sceneIds.includes(bootEntry.scene)
        ? bootEntry.scene
        : project.entryScene.id
  const posParam = params.get('pos')?.split(',').map(Number)
  const spawnPos =
    posParam?.length === 2 && posParam.every(Number.isFinite)
      ? { col: expectDefined(posParam[0]), row: expectDefined(posParam[1]), height: 0 }
      : undefined
  const facingParam = params.get('facing')
  const initialFacing =
    facingParam === 'up' ||
    facingParam === 'down' ||
    facingParam === 'left' ||
    facingParam === 'right'
      ? facingParam
      : undefined
  const initialSpawn: SceneSpawn = spawnPos
    ? { pos: spawnPos, ...(initialFacing ? { facing: initialFacing } : {}) }
    : initialFacing
      ? { facing: initialFacing }
      : {}
  await switchScene(initialSceneId, initialSpawn)
  const dialogBox = new DialogBox(
    ctx,
    glyphs,
    cursorFrames,
    portraits,
    project.locale,
    menuAssets.scroll,
  )

  // ══ M3a 脚本运行时(设计 §4:driver Promise + AbortSignal;tick 驱动计时/淡入淡出)══
  type ActiveScriptRunner = ScriptRunner | { running: boolean }
  let runner: ActiveScriptRunner | null = null
  let scriptRuntimeV5: ScriptProjectRuntimeV5 | null = null
  /** X1 自动存档:本次演出链切过场景 → 整链(含排队 onEnter)收尾后静默写 auto 槽。 */
  let sceneChangedByScript = false
  let scriptAbort: AbortController | null = null
  let itemUseAbort: AbortController | null = null
  // loadScene preflight 已选定的目标 onEnter 绑定；与 entry 契约同批冻结，当前脚本收尾后再跑。
  let pendingOnEnter: { sceneId: string; binding: RuntimeScriptBinding } | null = null
  let nowMs = 0 // tick 注入的时间源(driver 计时用)
  const timers: { deadline: number; settle: (error?: Error) => void }[] = []
  const fadeDriver = new SupersedingFadeDriver(0) // 0 透明 → 1 全黑；新事务连续接管并兑现旧 Promise
  let fadeCurtain: 'black' | 'red' = 'black' // 幕布色(gameOver 渐红;fade-in 结束回黑)
  /** 0x76/ShowFBP 的黑屏保持事务；只存在呈现层，不能进入 WorldState/SAVE。 */
  const screenHold = new ScreenHoldTransaction()
  // 0x35 震屏(script.c:1521 VIDEO_ShakeScreen):世界层渲染 y ±level 交替;到期/0 关自清
  let worldShake: { untilMs: number; level: number } | null = null
  // 0x71 屏波(仙灵岛水面/蛤蟆谷):世界层合成到离屏后逐行左卷;状态在 vars 随存档
  const worldWave = new WorldWaveRenderer()
  let waveCanvas: HTMLCanvasElement | null = null
  function ensureWaveCanvas(): HTMLCanvasElement {
    if (!waveCanvas) waveCanvas = document.createElement('canvas')
    if (waveCanvas.width !== canvas.width || waveCanvas.height !== canvas.height) {
      waveCanvas.width = canvas.width
      waveCanvas.height = canvas.height
    }
    return waveCanvas
  }
  // ── W6 氛围(昼夜):全帧 multiply 滤镜(docs/phase2/ambience-design.md)──
  // world.ambience 是权威(随存档);此处只是显示态:当前乘色 + 300ms 切换过渡。
  // 纯视觉、无输入门、自终止 —— 不属于「需要收尾人的 time-based 状态」。
  const AMBIENCE_FADE_MS = 300
  let ambienceShown = resolveAmbienceTint(world.ambience, project.ambiences)
  let ambienceFx: { from: [number, number, number]; start: number; durMs?: number } | null = null
  /** 世界态氛围变化后瞬时同步显示(读档/新档;不播过渡)。 */
  const syncAmbience = (): void => {
    ambienceShown = resolveAmbienceTint(world.ambience, project.ambiences)
    ambienceFx = null
  }
  /** 帧滤镜:两条出帧路径(大世界 render() 尾 + 战斗分支)都调;恒等色零开销跳过。 */
  const applyAmbienceTint = (): void => {
    if (ambienceFx) {
      const t = (nowMs - ambienceFx.start) / (ambienceFx.durMs ?? AMBIENCE_FADE_MS)
      ambienceShown = lerpTint(
        ambienceFx.from,
        resolveAmbienceTint(world.ambience, project.ambiences),
        t,
      )
      if (t >= 1) ambienceFx = null
    }
    if (isIdentityTint(ambienceShown)) return
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = `rgb(${ambienceShown[0]},${ambienceShown[1]},${ambienceShown[2]})`
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
  }
  let scriptDialogResolve: (() => void) | null = null
  // ~NN 自动收尾时保留最后已呈现帧一拍。若下一条立即 loadScene，它会在重画前取走该帧。
  let preserveClosedDialogFrame = false
  // ── 商店/当铺(openShop 阻塞脚本至关店;UI 态 + 关店 resolve)──
  let shop: { ui: ShopUiState; resolve: () => void } | null = null
  // ── R13-4 脚本二选一：独立于系统菜单业务的中央 FIFO + dedicated held-frame。──
  const scriptConfirmModal = new ScriptConfirmModalQueue<ImageData>()
  const scriptExecutionGateWaiters: {
    signal: AbortSignal
    resolve: () => void
    reject: (error: Error) => void
    abort: () => void
  }[] = []
  const canActivateScriptConfirm = (): boolean =>
    !shop && !menu.active && !rewardGainQueue.active && !activeBattle
  const activateScriptConfirm = (): void => {
    scriptConfirmModal.activateIfPossible(canActivateScriptConfirm(), () =>
      ctx.getImageData(0, 0, canvas.width, canvas.height),
    )
  }
  const resumeScriptExecutionGates = (): void => {
    if (scriptConfirmModal.active) return
    for (const waiter of scriptExecutionGateWaiters.splice(0)) {
      waiter.signal.removeEventListener('abort', waiter.abort)
      waiter.resolve()
    }
  }
  const waitForScriptGameplay = (signal: AbortSignal): Promise<void> | void => {
    if (!scriptConfirmModal.active) return
    return new Promise<void>((resolve, reject) => {
      const waiter = {
        signal,
        resolve,
        reject,
        abort: () => {},
      }
      waiter.abort = () => {
        const index = scriptExecutionGateWaiters.indexOf(waiter)
        if (index >= 0) scriptExecutionGateWaiters.splice(index, 1)
        signal.removeEventListener('abort', waiter.abort)
        reject(asyncIntentAbortError('脚本确认框冻结期间 runner 已取消'))
      }
      scriptExecutionGateWaiters.push(waiter)
      signal.addEventListener('abort', waiter.abort, { once: true })
      if (signal.aborted) waiter.abort()
    })
  }
  const entityFrameOverride = new Map<string, number>() // setEntityFrame 演出帧覆盖(切场景清)
  // ── 0x15/0x65 队伍演出态(原版 rgParty[].wFrame / rgwSpriteNum;脚本自清,走路时引擎清)──
  let partyGesture: number | null = null // 脚本姿势帧(渲染 = dir*framesPerDir + gesture)
  let activeBattle: BattleSession | null = null // M4b:进行中的战斗(主循环转发 tick/render)
  // 会话创建前也有 readiness/图片加载 await；新启动或强停必须让旧启动意图失效。
  const battleLaunchIntent = new AsyncIntentController()
  const reportedBattleReadiness = new Set<string>()
  const reportBattleReadiness = (
    team: number,
    stage: string,
    error: Error,
    fatal: boolean,
  ): void => {
    // 同一坏资源会在 battleBase 与后续每轮 union 中重试；按错误本体去重，不能按 turn 刷屏。
    const key = `${team}:${error.name}:${error.message}`
    if (reportedBattleReadiness.has(key)) return
    reportedBattleReadiness.add(key)
    console.error(`[sfx readiness] team-${team} ${stage}${fatal ? ' fatal' : ' degraded'}`, error)
  }
  let battleFieldsPromise: Promise<Map<number, BattleFieldEntry>> | null = null // 战场表懒载一次
  // ── M3b 走位/动画驱动(abort 全兑现)。**全局 100ms 世界拍**:玩家步进与脚本走位共拍
  //    推进 —— 曾各自累加(玩家 100ms / NPC 130ms)错相,高频渲染把错拍中间帧全画出来,
  //    同屏对走 NPC 呈「退 16 进 8」锯齿(2026-07-05 作者报抖动/速度怪;原版全世界一 tick 同拍)。
  //    速度 = 原版速度码 px/拍(scene.c:887-888 NPCWalkOneStep x±2s,y±1s;本 grid 1 格
  //    = 16/8px → s/8 格/拍)。迁移器 SPEED 表 2/3/4/8 → slow/normal/fast/run 1:1。
  //    ⚠ 曾「半格/SPEED_MS」:0.5 格=8/4px 量子≠原版 6/3px,注释还把半格错标成 16/8px。
  const SPEED_GRID: Record<WalkSpeed, number> = { slow: 2 / 8, normal: 3 / 8, fast: 4 / 8, run: 1 }
  /** 到点 snap 阈(px):任一轴 |offset| < 2·speed 即整体落点(script.c:101 PAL_NPCWalkTo)。 */
  const SPEED_SNAP_PX: Record<WalkSpeed, number> = { slow: 4, normal: 6, fast: 8, run: 16 }
  // (worldMoveAcc/worldTickNum/worldTicksThisFrame 声明在上方 stepFrame 处 —— switchScene TDZ)
  const entityMoves = new Map<
    string,
    {
      to: GridPos
      speed: WalkSpeed
      resolve: () => void
      cancel: (message: string) => void
    }
  >()
  let partyMove: { to: GridPos; speed: WalkSpeed; resolve: () => void } | null = null
  const entityAnim = new Map<string, number>() // 实体走帧计数(移动/0x87 动画共用)
  // auto 巡逻:每实体独立 runner,与主脚本**并行**(2026-07-03 拍板:不复刻对话冻结 NPC);
  // E6a:仅被主脚本接管(authority)的实体其位移暂停,release 恢复。切场景全停。
  const autoAborts = new Map<string, AbortController>()
  let cameraPanFx: {
    fromX: number
    fromY: number
    dx: number
    dy: number
    steps: number
    done: number
    resolve: () => void
  } | null = null

  /** 世界脚本状态 → 场景实体(entityState:≤0 隐,≥2 挡路;entityPos:0x13 绝对定位覆写;
   *  进场/读档/设态后重放)。 */
  function applyWorldToScene(): void {
    syncLegacyScriptScratchV5(scene.id)
    for (const e of scene.entities) {
      const st = world.script?.entityState[e.id]
      if (st !== undefined) {
        e.hidden = st <= 0
        e.collide = st >= 2
      }
      const pos = world.script?.entityPos?.[e.id]
      if (pos) e.pos = { ...pos }
    }
  }

  function hostFade(
    dir: 'in' | 'out',
    ms: number,
    color: 'black' | 'red' = 'black',
    signal?: AbortSignal,
    owner?: FadeOwner,
  ): Promise<void> {
    fadeCurtain = color
    return fadeDriver.begin(dir === 'out' ? 1 : 0, nowMs, ms, signal, owner)
  }

  async function hostHoldScreen(
    color: 'black',
    token: string,
    signal?: AbortSignal,
  ): Promise<void> {
    assertRunnerActive(signal, '黑屏保持所属 runner 已取消')
    const handle = screenHold.begin(token)
    fadeCurtain = color
    try {
      await fadeDriver.begin(1, nowMs, 0, signal, handle.owner)
      assertRunnerActive(signal, '黑屏保持所属 runner 已取消')
    } catch (error) {
      screenHold.cancelOwned(handle)
      throw error
    }
  }

  async function hostRevealScreen(token: string, signal?: AbortSignal): Promise<void> {
    assertRunnerActive(signal, '黑屏恢复所属 runner 已取消')
    screenHold.takeForReveal(token)
    await hostFade('in', 260, 'black', signal)
    assertRunnerActive(signal, '黑屏恢复所属 runner 已取消')
  }

  async function awaitOwnedDither(
    begin: () => Promise<void>,
    signal: AbortSignal | undefined,
    message: string,
  ): Promise<void> {
    const pending = begin()
    const owned = ditherTransition.active
    try {
      await awaitRunner(pending, signal, message)
    } catch (error) {
      if (ditherTransition.active === owned) ditherTransition.cancel()
      throw error
    }
  }

  async function hostSceneEntryReveal(reveal: SceneReveal, signal?: AbortSignal): Promise<void> {
    assertRunnerActive(signal, '场景入场呈现所属 runner 已取消')
    const entry = sceneEntrySession.startReveal(scene.id, reveal)
    // boot、读档直达或 dev ?scene 没有 previous presented frame：prepare 照跑，呈现直接提交。
    if (!entry) return
    try {
      switch (reveal.kind) {
        case 'dither':
          ditherZeroFrameMatchesBackup = null
          ditherZeroFrameDiffersFromTarget = null
          await awaitOwnedDither(
            () => ditherTransition.beginEntry(entry.sourceFrame, reveal.ms),
            signal,
            '场景入场抖动呈现所属 runner 已取消',
          )
          break
        case 'fade':
          // fade-out 已在切换逻辑世界前完成；这里先露出黑幕后的 target，再 fade-in。
          sceneEntrySession.complete(entry.token)
          await hostFade('in', reveal.inMs, 'black', signal)
          break
        case 'cut':
          sceneEntrySession.complete(entry.token)
          break
      }
      assertRunnerActive(signal, '场景入场呈现所属 runner 已取消')
      markSceneLoad(entry.sourceSceneId, entry.targetSceneId, 'done')
    } finally {
      sceneEntrySession.complete(entry.token)
    }
  }

  // ══ E6a 实体定位权威(设计:docs/phase2/foundation/e6-position-authority-design.md)══
  // 缺省不在表 = world(输入/auto/hostile 可写);'script' = 主脚本演出接管。
  // 拍板(2026-07-05):①仅被接管的实体暂停 auto;②位移指令才隐式接管。
  // 不进存档 —— 权威是演出期瞬时态,读档/切场景随脚本收尾清空。mount 形态 E7 落。
  type Authority = { kind: 'script' } | { kind: 'mount'; parent: string; dx: number; dy: number }
  const authority = new Map<string, Authority>()
  const takeByScript = (id: string): void => {
    authority.set(id, { kind: 'script' }) // 覆盖 mount = 隐式 unmount(契约:mount 态脚本写须先卸)
  }

  /**
   * 战斗主体共享同一 intent / frame-step 守卫；DEV preset 只由私有 gateway 包裹。
   * 引用 host.wait/host.report 等闭包,调用时已初始化。
   */
  const startBattleBody = async (
    team: number,
    battleOpts: DebugBattleOptions | undefined,
    runnerSignal: AbortSignal | undefined,
  ): Promise<'win' | 'lose' | 'flee'> => {
    assertRunnerActive(runnerSignal, `team-${team} 战斗所属 runner 已取消`)
    // K5:帧步进作用域不含战斗——任何战斗启动即退出步进模式。
    frameStepState.active = false
    frameStepState.stepRequested = false
    const launchToken = battleLaunchIntent.begin()
    const scriptMutationToken = scriptMutationIntent.capture()
    const launchWorld = world
    // 敌对实体/dev 直开没有 runner；给它们独立的永不取消 signal，绝不借用主脚本 signal。
    const launchSignal = runnerSignal ?? new AbortController().signal
    const assertLaunchCurrent = (): void => {
      assertRunnerActive(launchSignal, `team-${team} 战斗所属 runner 已取消`)
      battleLaunchIntent.assertCurrent(launchToken, `team-${team} 战斗启动意图已失效`)
      scriptMutationIntent.assertCurrent(scriptMutationToken, `team-${team} 战斗启动脚本已失效`)
      if (world !== launchWorld) throw asyncIntentAbortError(`team-${team} 战斗启动所属世界已失效`)
    }
    // D13-1 dev-only enemyOverride:忽略 teamDef.members,按给定敌人定义 id 组敌队。
    const enemyDefs = battleOpts?.enemyOverride
      ? battleOpts.enemyOverride
          .map((id) => project.enemiesById[id])
          .filter((e): e is NonNullable<typeof e> => !!e)
      : (project.enemyTeamsById[`team-${team}`]?.members ?? [])
          .map((id) => project.enemiesById[id])
          .filter((e): e is NonNullable<typeof e> => !!e)
    if (enemyDefs.length === 0) {
      showToast(`遇敌 #${team} —— 敌队缺数据,桩胜(M4c)`)
      await host.wait(400, launchSignal)
      assertLaunchCurrent()
      return 'win'
    }
    const encounterChoreo =
      battleOpts?.choreography ?? enemyDefs.flatMap((enemy) => enemy.choreography ?? [])
    const encounterPortraits = new Set(
      collectCommandAssetReferences(encounterChoreo, 'battle.choreography')
        .filter((reference) => reference.expectedKind === 'portrait')
        .map((reference) => reference.asset),
    )
    await Promise.all(
      [...encounterPortraits].map(async (asset) => {
        if (!portraits.has(asset))
          portraits.set(asset, await project.imageCache.load(asset, 'portrait'))
      }),
    )
    assertLaunchCurrent()
    // 战斗配置解析(无任何持久态):显式参数→场景默认→项目具名角色。
    // 原版 0x4A/0x45 持久全局已退役:特殊战场/曲一次性绑 startBattle,打完自然回落场景默认,
    // 不再有「剧情点覆写 + 随存档」这一档(那全是老全局年代手动清临时战场的产物)。
    const battleTrack =
      battleOpts?.music !== undefined
        ? battleOpts.music
        : scene.battleMusic !== undefined
          ? scene.battleMusic
          : project.assetResolver.assetForRole('audio.defaultBattleMusic')
    let playedVictory = false
    const restoreSceneMusic = (): void => {
      if (battleTrack === undefined && !playedVictory) return
      const persistent = world.audio?.currentMusic
      // D12-1:战斗出/胜利后回场景曲走过渡,消硬切爆音。
      if (persistent === null) bgm.stop(BATTLE_MUSIC_TRANSITION_MS)
      else if (persistent) bgm.play(persistent, true, BATTLE_MUSIC_TRANSITION_MS)
    }
    // 队员战斗态:CharacterInstance + 装备加成(effectiveStat)
    const itemsById = project.items
    // dev:?dualattack / ?attackall 给队长强制连击/全体(验演出;无对应装备的默认档用)
    const devParams = new URLSearchParams(location.search)
    const devDualLeader = devParams.get('dualattack') !== null ? world.party[0]?.id : null
    const devAllLeader = devParams.get('attackall') !== null ? world.party[0]?.id : null
    const players = world.party.map((c) => {
      const res = effectiveResistances(c, itemsById) // 五灵/毒抗 live 派生(红线:建态时算)
      const regen = effectiveRegen(c, itemsById)
      const granted = effectiveGrantedStatuses(c, itemsById)
      return {
        roleId: c.id,
        actorTemplateId: c.template,
        hp: c.hp,
        maxHp: c.maxHP,
        mp: c.mp,
        maxMp: c.maxMP,
        attackStrength: effectiveStat(c, 'attack', itemsById),
        defense: effectiveStat(c, 'defense', itemsById),
        magicStrength: effectiveStat(c, 'magicAttack', itemsById),
        baseDexterity: effectiveStat(c, 'speed', itemsById),
        // 仙术指令 = 已学 ∪ 装备授予(grantSkill 土灵珠/圣灵珠;红线 live 派生不烙)
        skills: effectiveSkills(world.learnedSkills[c.id] ?? [], c, itemsById),
        // 合体技(角色专属;发起合击用。取自 actor 模板 battler)
        ...(project.actorsById[c.template]?.battler?.cooperativeMagicSkillId
          ? {
              cooperativeMagicSkillId: expectDefined(
                expectDefined(project.actorsById[c.template]).battler,
              ).cooperativeMagicSkillId,
            }
          : {}),
        // 守护关系(rgwCoveredBy 具名化):模板 → 在场队友实例 id;守护者不在队 = 无人护
        ...(() => {
          const gt = project.actorsById[c.template]?.battler?.coveredBy
          const g = gt ? world.party.find((x) => x.template === gt) : undefined
          return g ? { coveredBy: g.id } : {}
        })(),
        fleeRate: effectiveStat(c, 'luck', itemsById), // 逃跑判定 str
        elemRes: res.elemRes,
        // 毒抗 = 装备 live 派生 + 大世界大蒜临时 Extra(缩敌附毒门;战后三件套清 extraPoisonRes)
        poisonRes: res.poisonRes + (c.extraPoisonRes ?? 0),
        ...(c.extraPoisonRes ? { itemPoisonResBonus: c.extraPoisonRes } : {}),
        // 大世界带入的毒(自毒食/装备咒;战斗内副本,战后三件套清)
        ...(c.poisons?.length ? { poisons: c.poisons.map((x) => ({ ...x })) } : {}),
        // 大世界护体符/金刚符定时状态(护体等;建态注入 status,战后三件套 ClearAllStatus 清)
        ...(c.extraStatuses?.length
          ? { carriedStatuses: c.extraStatuses.map((x) => ({ ...x })) }
          : {}),
        // 攻击全体(长鞭 attackAll;红线 live 派生;dev 参数强制)
        attackAll: equipGrantsAttackAll(c, itemsById) || devAllLeader === c.id,
        // 每回合回血/回蓝(寿葫芦等 regen 词条;红线 live 派生)
        regenHp: regen.hp,
        regenMp: regen.mp,
        // 装备授予常驻状态(连击 dualAttack 仙女剑;红线 live 派生,建态置入不烙持久)
        grantedStatuses:
          devDualLeader === c.id && !granted.includes('dualAttack')
            ? [...granted, 'dualAttack' as const]
            : granted,
        persistentProgress: {
          level: c.level,
          exp: c.exp,
          maxHP: c.maxHP,
          maxMP: c.maxMP,
          attack: c.attack,
          magicAttack: c.magicAttack,
          defense: c.defense,
          speed: c.speed,
          luck: c.luck,
        },
      }
    })
    const playerSounds = world.party.map(
      (character) => project.actorsById[character.template]?.battler?.sounds,
    )
    const cooperativeSkillIds = world.party.flatMap((character) => {
      const skillId = project.actorsById[character.template]?.battler?.cooperativeMagicSkillId
      return skillId ? [skillId] : []
    })
    const battleBaseSounds = await collectBattleBaseSounds({
      playerSounds,
      cooperativeSkillIds,
      enemyDefs,
      enemiesById: project.enemiesById,
      skills: project.skills,
      itemsById: project.items,
      activePlayerPoisons: players.flatMap((player) => player.poisons ?? []),
      activeEnemyPoisons: [],
      poisonDefs: project.poisonsById,
      roles: project.manifest.assets.roles,
      encounterChoreography: encounterChoreo,
      ...(project.scriptStore ? { resolver: project.scriptStore } : {}),
      signal: launchSignal,
    }).catch((error: unknown) => {
      if (isAbortError(error)) throw error
      throw new SfxReadinessCollectionError(`team-${team} battleBase 音效闭包收集失败`, {
        cause: error,
      })
    })
    assertLaunchCurrent()
    await sfx.prepare(battleBaseSounds).catch((error: unknown) => {
      if (!(error instanceof SfxReadinessResourceError)) throw error
      reportBattleReadiness(team, 'battleBase', error, false)
    })
    assertLaunchCurrent()
    // 视觉第一屏障：基础/装备/持久形象、effective skills、合击及敌 transform/summon BFS
    // 全部在 session 提交前解析。动作期不得迟到写入或再发战斗精灵 IO。
    const battleSpriteReadiness = await prepareBattleSpriteReadiness({
      cache: project.battleSpriteCache,
      reader: project.assetResolver,
      definitionsById: project.battleSpritesById,
      party: world.party,
      actorsById: project.actorsById,
      itemsById: project.items,
      playerSkillIds: players.map((player) => player.skills),
      cooperativeSkillIds,
      skillsById: project.skills,
      enemyDefs,
      enemiesById: project.enemiesById,
    })
    assertLaunchCurrent()
    const fieldId = battleOpts?.fieldId ?? scene.battleFieldId ?? 24
    // 战场常驻波(battle.c:1559 进战斗设 field.screenWave;#18/22/32/35/50 水下/幻境)
    // + 五灵加成(lprgBattleField.rgsMagicEffect,fight.c:244 双向乘入法术伤害)。
    // 数据源:工程 content 战场表(D24 一等域,编辑器管) > assetBase 遗留回退(未收编工程)。
    battleFieldsPromise ??= project.battleFields.length
      ? Promise.resolve(
          new Map(
            project.battleFields.map((f) => [
              Number(f.id),
              {
                screenWave: f.screenWave ?? 0,
                ...(f.magicEffect ? { magicEffect: f.magicEffect } : {}),
                ...(f.background ? { background: f.background } : {}),
              },
            ]),
          ),
        )
      : loadBattleFields(project.assetBase).catch(() => new Map<number, BattleFieldEntry>())
    const fields = await battleFieldsPromise
    assertLaunchCurrent()
    const fieldDef = fields.get(Number(fieldId))
    const fieldWave = fieldDef?.screenWave ?? 0
    const [bgFull, faceList, effectSprite] = await Promise.all([
      fieldDef?.background
        ? loadBattleBgFull(project.assetBase, fieldDef.background, palette)
        : Promise.resolve(undefined),
      Promise.resolve(
        world.party.map((character) => {
          const asset = project.actorsById[character.template]?.face
          return asset ? faceImages.get(asset) : undefined
        }),
      ),
      loadEffectOnce(),
    ])
    assertLaunchCurrent()
    // 本场可能施放的法术 → 预载 fire 特效精灵(玩家已学 + 敌 AI cast 规则;M4d-2b)
    const fireChunks = collectBattleSkillFireChunks({
      playerSkillIds: players.map((player) => player.skills),
      cooperativeSkillIds,
      reachableEnemySkillIds: battleSpriteReadiness.reachableEnemySkillIds,
      skillsById: project.skills,
    })
    for (const e of battleSpriteReadiness.reachableEnemyDefs) {
      // 偷到的物品可在后续回合投掷；与 SFX readiness 的 steal 闭包保持同一可达边界。
      const stolenItem = e.steal ? project.items[e.steal.itemId] : undefined
      const stolenFire =
        stolenItem?.throw?.presentation?.kind === 'magic'
          ? stolenItem.throw.presentation.animation.effectSprite
          : undefined
      if (stolenFire !== undefined && stolenFire >= 0) fireChunks.add(stolenFire)
    }
    // 战斗开始时实际背包中可投掷物品的 FIRE 演出；不扫描全项目，维持工作集边界。
    for (const entry of world.inventory) {
      if (entry.count <= 0) continue
      const item = project.items[entry.itemId]
      const sp =
        item?.throw?.presentation?.kind === 'magic'
          ? item.throw.presentation.animation.effectSprite
          : undefined
      if (sp !== undefined && sp >= 0) fireChunks.add(sp)
    }
    const fireSprites: Record<number, import('./assets.js').LoadedSprite> = {}
    await Promise.all(
      [...fireChunks].map((ch) =>
        loadFireSprite(project.assetBase, ch)
          .then((sp) => {
            fireSprites[ch] = sp
          })
          .catch(() => undefined),
      ),
    )
    assertLaunchCurrent()
    const faces: Record<string, ImageBitmap | undefined> = {}
    world.party.forEach((c, i) => {
      faces[c.id] = faceList[i]
    })
    // 战斗曲与 active session 同一原子提交拍；启动已失效时不得在新场景迟到播放旧曲。
    // D12-1:战斗进出场走过渡(场景曲 fade-out → 战斗曲 fade-in)。
    if (battleTrack === null) bgm.stop(BATTLE_MUSIC_TRANSITION_MS)
    else bgm.play(battleTrack, true, BATTLE_MUSIC_TRANSITION_MS)
    const session = new BattleSession(
      players,
      enemyDefs,
      {
        bg: bgFull?.canvas,
        // 召唤背景染色的索引源(调色板级 nibble 重烤,battle.c:62-80)
        bgIndexed: bgFull ? { indices: bgFull.indices, w: bgFull.w, h: bgFull.h } : undefined,
        palette,
        glyphs,
        battleSprites: battleSpriteReadiness.byDefinitionId,
        playerBaseDefinitionIds: battleSpriteReadiness.playerBaseDefinitionIds,
        ui: menuAssets,
        faces,
        battleIcons: menuAssets.battleIcons,
        sfx,
        effectSprite,
        fireSprites,
        dialogBox, // 战斗内对话 = 大世界同款对话框叠战斗上(一阶段真值)
      },
      (roleId) => {
        const c = world.party.find((x) => x.id === roleId)
        return c ? lookupText(`name.${c.template}`, project.locale) : roleId
      },
      Math.random,
      // M4c:技能/敌人表 + 演出文本;难度预设(难度分级立项前恒 normal)
      {
        skills: project.skills,
        enemiesById: project.enemiesById,
        items: project.items,
        inventory: world.inventory.map((x) => ({ ...x })), // 副本:战斗内扣,战后写回
        difficulty: 'normal',
        auto: battleOpts?.auto,
        boss: battleOpts?.boss,
        locale: project.locale,
        fieldWave,
        fieldEffect: fieldDef?.magicEffect,
        poisonDefs: project.poisonsById,
        money: world.money, // 乾坤一掷/铜钱镖消耗基数(战内 delta 战后统一入账)
        actorsById: project.actorsById, // B11-1 伤亡脚本(actorTemplateId → battler.casualty)
        skillUseCounts: world.skillUseCounts, // 一生限用计数(酒神 9 次;战后经 mutation 回写)
        // 战斗演出来源(二阶段 clean):遭遇专属(startBattle.choreography,boss 战剧情台词)优先;
        // 缺省回落敌种 def.choreography(随机遇敌固有台词 —— 无 scene 遭遇挂点的敌种)。
        // boss/杂兵混的敌种(胖苗)对话迁到 boss startBattle 且从 def 删,故杂兵场回落为空 = 不串戏。
        encounterChoreo,
        // 战斗音效七件套(BattlerSpec.sounds;出招/挥击/吟唱已接,其余随对应演出落地)
        playerSounds,
        soundRoles: project.manifest.assets.roles,
        prepareTurnSounds: async (snapshot) => {
          let turnSounds: ReturnType<typeof collectTurnActionSounds>
          try {
            turnSounds = collectTurnActionSounds({
              pendingActions: snapshot.actions.values(),
              activePlayerPoisons: snapshot.activePlayerPoisons,
              activeEnemyPoisons: snapshot.activeEnemyPoisons,
              skills: project.skills,
              itemsById: project.items,
              poisonDefs: project.poisonsById,
            })
          } catch (error) {
            throw new SfxReadinessCollectionError(
              `team-${team} turn-${snapshot.turn} 音效闭包收集失败`,
              { cause: error },
            )
          }
          // 每轮重触整个 union，保证 LRU 中 battleBase 仍全部驻留，不能只准备增量。
          await sfx.prepare(new Set([...battleBaseSounds, ...turnSounds]))
        },
        reportReadinessError: (error, context) =>
          reportBattleReadiness(team, `turn-${context.turn}`, error, context.fatal),
        playMusic: (asset) => bgm.play(asset),
        stopMusic: () => bgm.stop(),
        worldPartyIdentities: world.party.map(({ id, template }) => ({
          id,
          template,
        })),
        // B7b/B7c 胜利结算(会话 over 阶段调一次):HP 写回 + 入账 + 升级 + 隐藏经验 =
        //   单次授予点,返回结算屏序列(经验金钱→升级→隐藏提升→练成)。原版 Phase A/B/E/D/F。
        buildSettlement: () => {
          assertLaunchCurrent()
          sessionRef.writeBackPersistentEffects(world)
          sessionRef.writeBackHp(world.party) // 先写回战斗末 HP(原版 exp 前)
          const r = sessionRef.rewards()
          if (r.exp > 0) {
            // SDL PAL_BattleWon 在升级计算前按不可逃战标志选择胜利结算曲 002/003；
            // 升级屏没有独立的 AUDIO_PlayMusic 调用，manifest role 保持兼容。
            const victoryRole = battleOpts?.boss
              ? 'audio.bossVictoryMusic'
              : 'audio.normalVictoryMusic'
            // G1/Kimi 裁定:战斗曲→胜利曲接同常量过渡(全链最刺耳一环)。
            bgm.play(
              project.assetResolver.assetForRole(victoryRole),
              false,
              BATTLE_MUSIC_TRANSITION_MS,
            )
            playedVictory = true
          }
          world.money += r.cash
          const rep = grantBattleRewards(
            world.party,
            world.learnedSkills,
            project.actorsById,
            project.levelUp,
            { ...r, hiddenCounts: sessionRef.hiddenCounts() },
            Math.random,
          )
          return buildSettlementScreens(
            rep.exp,
            rep.cash,
            rep.levelUps,
            rep.hiddenUps,
            (cid) => {
              const tpl = world.party.find((c) => c.id === cid)?.template ?? ''
              return lookupText(`name.${tpl}`, project.locale)
            },
            (sid) => project.skills[sid]?.name ?? sid,
          )
        },
      },
    )
    const sessionRef = session
    activeBattle = session
    const abortBattle = (): void => {
      if (activeBattle === session) session.cancel()
    }
    launchSignal.addEventListener('abort', abortBattle, { once: true })
    if (launchSignal.aborted) abortBattle()
    // DEV 调试口(一阶段 __tpgs 先例):验收/自动化直读战斗态(phase/ui/log)
    if (import.meta.env.DEV) (window as { __rfBattle?: unknown }).__rfBattle = session
    let result: 'win' | 'lose' | 'flee'
    try {
      result = await session.done
    } catch (error) {
      // readiness fatal 经可见错误态确认退出后，仍要归还场景工作集与曲目。
      // AbortError 则由读档/切场景流程接管，避免与新场景准备互相覆盖。
      if (!isAbortError(error)) {
        await prepareSceneSounds(scene, world).catch((restoreError: unknown) => {
          console.error('[sfx readiness] fatal 后恢复场景工作集失败', restoreError)
        })
        assertLaunchCurrent()
        restoreSceneMusic()
      }
      throw error
    } finally {
      launchSignal.removeEventListener('abort', abortBattle)
      // 旧会话的异步收尾不得清掉后来启动的新会话。
      if (activeBattle === session) {
        if (import.meta.env.DEV) (window as { __rfBattle?: unknown }).__rfBattle = null
        activeBattle = null
      }
    }
    // done 与读档/切场景可落在相邻 microtask；任何战果写回前再次确认仍属于原世界。
    assertLaunchCurrent()
    session.writeBackPersistentEffects(world)
    // 胜利结算路径已在 buildSettlement 里写回 HP + 入账;其余路径(败/逃/敌逃)此处写回 HP。
    if (result !== 'win' || session.enemyFled()) session.writeBackHp(world.party)
    session.writeBackInventory(world.inventory)
    // 偷窃/金钱技消耗/收妖所得:**无条件**入账(原版 dwCash 即时加减 —— 逃跑也保留;
    // 偷到的物品随 writeBackInventory 一并回世界)
    if (session.moneyDelta() !== 0) world.money = Math.max(0, world.money + session.moneyDelta())
    if (session.collectGained() > 0)
      world.collectValue = (world.collectValue ?? 0) + session.collectGained()
    // 战后「三件套」(battle.c:1822-1830):胜/败/逃无条件。① ClearAllStatus → 清大世界护体符定时状态
    // (extraStatuses);② CurePoisonByLevel(3) → 世界毒态清 ≤severe(无影毒/寄生 incurable 留);
    // ③ RemoveEquipExtra → 清大蒜临时毒抗 Extra(extraPoisonRes;装备本身 Extra 走 live 派生无持久)。
    for (const c of world.party) {
      if (c.extraStatuses?.length) c.extraStatuses = []
      if (c.extraPoisonRes) c.extraPoisonRes = undefined
      if (c.poisons?.length) curePoisons(c, project.poisonsById, 'severe')
    }
    // Phase E 战后脚本：逐槽按 scriptOwnerDef 跑 canonical V5 onDefeated。
    // exact launchSignal 复用父 activity lineage；F5 已关 gate 时不得另开 transient 自锁。
    // 非 abort 错误向外传播，禁止 console.error 后假装战斗成功。
    let hasBattleEndError = false
    let battleEndError: unknown
    try {
      if (result === 'win' && !session.enemyFled()) {
        const runtime = scriptRuntimeV5
        const scripted = session.enemySlotDefs().filter((def) => def.onDefeated?.length)
        if (scripted.length && !runtime)
          throw new Error('enemy onDefeated 需要 canonical script v5 runtime')
        for (const def of scripted) {
          await expectDefined(runtime).runCommands(expectDefined(def.onDefeated), {
            signal: launchSignal,
            timing: 'interactive',
          })
          assertLaunchCurrent()
        }
      }
    } catch (error) {
      if (isAbortError(error)) throw error
      hasBattleEndError = true
      battleEndError = error
    }
    // 战斗 readiness 可能淘汰场景 LRU；恢复当前（也可能被战后脚本切换过的）场景工作集。
    await prepareSceneSounds(scene, world)
    assertLaunchCurrent()
    // 战斗内切过曲(战斗 BGM/胜利小调)→ 回场景曲;lose 进 gameOver 流程不回。
    if (result !== 'lose') restoreSceneMusic()
    if (hasBattleEndError) throw battleEndError
    return result
  }
  // ── D14-2 演出意图协议:presentationOps(执行器) + CutsceneController ──
  // 行为真值 = 原 host 方法体原样搬移;host 方法改为经 controller.run 委托,统一
  // busy()(K1:intent 在途 ∪ runner 活跃)与取消收口(K3:abortScript → cancelAll)。
  const presentationOps: CutsceneExecutor = {
    dialog: async (cue, signal) => {
      assertRunnerActive(signal, '对话所属 runner 已取消')
      const scriptMutationToken = scriptMutationIntent.capture()
      if (cue.portrait && !portraits.has(cue.portrait.asset))
        portraits.set(
          cue.portrait.asset,
          await awaitRunner(
            project.imageCache.load(cue.portrait.asset, 'portrait'),
            signal,
            '对话肖像加载所属 runner 已取消',
          ),
        )
      assertRunnerActive(signal, '对话所属 runner 已取消')
      scriptMutationIntent.assertCurrent(scriptMutationToken, '旧场景对话加载已失效')
      scriptDialogResolve?.()
      scriptDialogResolve = null
      return new Promise((resolve, reject) => {
        let settled = false
        const finish = (error?: Error): void => {
          if (settled) return
          settled = true
          signal.removeEventListener('abort', abort)
          if (error) reject(error)
          else resolve()
        }
        const settleDialog = (): void => finish()
        const abort = (): void => {
          if (scriptDialogResolve === settleDialog) {
            scriptDialogResolve = null
            dialogBox.close()
          }
          finish(asyncIntentAbortError('对话所属 runner 已取消'))
        }
        preserveClosedDialogFrame = false
        frameAnimationPresentation.enterDialogue()
        dialogBox.open(startDialogue({ id: '__script', cues: [cue] }), nowMs)
        scriptDialogResolve = settleDialog // tick 检测 dialogBox 关闭时兑现
        signal.addEventListener('abort', abort, { once: true })
        if (signal.aborted) abort()
      })
    },
    clearDialog: () => {
      preserveClosedDialogFrame = false
      dialogBox.close()
    },
    fade: (dir, ms, color, signal) => hostFade(dir, ms, color, signal),
    cameraPan: (dx, dy, frames, signal) =>
      new Promise((resolve, reject) => {
        assertRunnerActive(signal, '相机移动所属 runner 已取消')
        let settled = false
        // 每帧位移 (dx,dy),共 frames 帧,累积进 cameraOffset(不回正;走位期保留)
        const entry = {
          fromX: cameraOffset.x,
          fromY: cameraOffset.y,
          dx,
          dy,
          steps: frames,
          done: 0,
          resolve: (): void => {
            if (settled) return
            settled = true
            signal.removeEventListener('abort', abort)
            if (cameraPanFx === entry) cameraPanFx = null
            resolve()
          },
        }
        const abort = (): void => {
          if (settled) return
          settled = true
          if (cameraPanFx === entry) cameraPanFx = null
          signal.removeEventListener('abort', abort)
          reject(asyncIntentAbortError('相机移动所属 runner 已取消'))
        }
        cameraPanFx?.resolve()
        cameraPanFx = entry
        signal.addEventListener('abort', abort, { once: true })
        if (signal.aborted) abort()
      }),
    cameraSnap: (to) => {
      if (to) {
        const tp = gridToPixel(to)
        const pp = gridToPixel(player.pos)
        cameraOffset.x = tp.x - pp.x
        cameraOffset.y = tp.y - pp.y
      } else {
        cameraOffset.x = 0
        cameraOffset.y = 0
      }
      updateCamera()
    },
    frameAnimation: async (opts, signal) => {
      assertRunnerActive(signal, `帧动画 ${opts.asset} 所属 runner 已取消`)
      beginFrameAnimationPlayback()
      try {
        await playFrameAnimationOverlay({
          reader: frameSequenceReader,
          asset: opts.asset,
          frameRate: opts.frameRate,
          startFrame: opts.startFrame,
          endFrame: opts.endFrame,
          onFrame: presentFrameAnimationFrame,
          signal,
        })
        assertRunnerActive(signal, `帧动画 ${opts.asset} 所属 runner 已取消`)
      } finally {
        frameAnimationPresentation.finishPlayback()
      }
    },
    video: (asset, signal) => playVideoAsset(asset, signal),
    wait: (ms, signal) =>
      new Promise((resolve, reject) => {
        let settled = false
        const timer = {
          deadline: nowMs + ms,
          settle: (error?: Error): void => {
            if (settled) return
            settled = true
            signal.removeEventListener('abort', abort)
            const index = timers.indexOf(timer)
            if (index >= 0) timers.splice(index, 1)
            if (error) reject(error)
            else resolve()
          },
        }
        const abort = (): void => timer.settle(asyncIntentAbortError('脚本等待所属 runner 已取消'))
        timers.push(timer)
        signal.addEventListener('abort', abort, { once: true })
        if (signal.aborted) abort()
      }),
    resetPresentation: () => {
      // K3 复位语义逐项等价:fade→cancel(0) 回透明 / camera→(0,0) / dialog→close / 动画→reset。
      if (dialogBox.active) dialogBox.close()
      const r = scriptDialogResolve
      scriptDialogResolve = null
      r?.()
      fadeDriver.cancel(0)
      resetFrameAnimationPresentation()
      cameraPanFx?.resolve()
      cameraPanFx = null
      cameraOffset.x = 0
      cameraOffset.y = 0
    },
  }
  const presentation = new CutsceneController(presentationOps, {
    isRunnerActive: () => runner !== null,
  })

  const host: ScriptHost = {
    dialog: async (cue, signal) =>
      presentation.run([{ kind: 'dialog', cue }], signal ?? new AbortController().signal),
    clearDialog: () => {
      void presentation.run([{ kind: 'clearDialog' }], new AbortController().signal)
    },
    fade: (dir, ms, color, signal) =>
      presentation.run([{ kind: 'fade', dir, ms, color }], signal ?? new AbortController().signal),
    revealSceneEntry: hostSceneEntryReveal,
    // ── B8 野外遇敌 ──
    chaseStep: async (entityId, range, speed, floating, signal) => {
      assertRunnerActive(signal, `追逐 ${entityId} 所属 runner 已取消`)
      const e = scene.entities.find((x) => x.id === entityId)
      if (!e || e.hidden) {
        await host.wait(200, signal)
        return
      }
      const dc = player.pos.col - e.pos.col
      const dr = player.pos.row - e.pos.row
      const dist = Math.max(Math.abs(dc), Math.abs(dr))
      if (dist > range) {
        await host.wait(240, signal) // 出程:待机
        return
      }
      if (dist <= 1) {
        assertRunnerActive(signal, `追逐 ${entityId} 所属 runner 已取消`)
        fireTrigger(e) // 撞上玩家 → touch 触发(通常 = 开战);演出/对话中 startScript 防重入自然挡
        await host.wait(320, signal)
        return
      }
      // 逐步逼近:长轴优先一格;floating 无视碰撞(原版 0x4C op2)
      const stepCol = Math.abs(dc) >= Math.abs(dr) ? Math.sign(dc) : 0
      const stepRow = stepCol === 0 ? Math.sign(dr) : 0
      const next = { col: e.pos.col + stepCol, row: e.pos.row + stepRow, height: e.pos.height }
      assertRunnerActive(signal, `追逐 ${entityId} 所属 runner 已取消`)
      if (floating || !isBlockedAt(map, next)) {
        e.pos = next
        e.facing = stepCol !== 0 ? (dc > 0 ? 'right' : 'left') : dr > 0 ? 'down' : 'up'
        entityAnim.set(e.id, (entityAnim.get(e.id) ?? 0) + 1) // 走帧
      }
      await host.wait(Math.max(80, 480 / Math.max(1, speed)), signal) // speed 4≈120ms/步,8≈80ms
    },
    vanishEntity: (entityId, seconds) => {
      const e = scene.entities.find((x) => x.id === entityId)
      if (!e) return
      e.hidden = true
      const atScene = scene
      void (async () => {
        await host.wait(Math.max(200, seconds * 1000))
        if (scene === atScene) e.hidden = false // 重生(临时态;换场景后由场景重载自然恢复)
      })()
    },
    loadLastSave: async (signal) => {
      const metas = await awaitRunner(
        saveStore.listMeta(),
        signal,
        '读取最近存档所属 runner 已取消',
      )
      assertRunnerActive(signal, '读取最近存档所属 runner 已取消')
      const latest = [...metas].sort((a, b) => b.savedAt - a.savedAt)[0]
      if (latest && (await doLoad(latest.slotId, signal))) return
      assertRunnerActive(signal, '读取最近存档所属 runner 已取消')
      location.reload() // 无档:重开
    },
    gameOver: async (signal) => {
      // 原版 GameOver 枢纽(L_41075)一等化:渐红 + 经典文案 + 读最近档
      await hostFade('out', 900, 'red', signal)
      assertRunnerActive(signal, '战败流程所属 runner 已取消')
      await host.dialog({ slot: 'narration', rows: [{ text: 'gameover.1' }] }, signal)
      assertRunnerActive(signal, '战败流程所属 runner 已取消')
      await host.dialog({ slot: 'narration', rows: [{ text: 'gameover.2' }] }, signal)
      assertRunnerActive(signal, '战败流程所属 runner 已取消')
      await host.loadLastSave(signal)
    },
    wait: (ms, signal) =>
      presentation.run([{ kind: 'wait', ms }], signal ?? new AbortController().signal),
    teleportParty: (pos, fc) => {
      player.pos = { ...pos }
      if (fc) facing = fc
      walking = false
      // sdlpal 0x46 除了改队长坐标，还会重填 rgTrail。剧情末尾 setParty 恢复队员时
      // 直接复用这条轨迹；若只改队长，队员会叠在其脚下并被遮住，走一步后才出现。
      trail = seedFormationTrail(player.pos, facing)
      followerFrozen.length = 0
      followerPos.length = 0
      updateCamera()
    },
    loadScene: async (sceneId, spawn, signal, transition) => {
      assertRunnerActive(signal, `脚本切场景 ${sceneId} 的 runner 已取消`)
      const sceneToken = sceneSwitchIntent.begin()
      const visualOwner = {}
      const worldToken = worldMutationIntent.capture()
      const worldView = world
      const inheritedFacing = facing
      const assertRequestCurrent = (): void => {
        assertRunnerActive(signal, `脚本切场景 ${sceneId} 的 runner 已取消`)
        sceneSwitchIntent.assertCurrent(sceneToken, `脚本切场景 ${sceneId} 已被更新请求取代`)
        worldMutationIntent.assertCurrent(worldToken, `脚本切场景 ${sceneId} 的所属世界已失效`)
        if (world !== worldView)
          throw asyncIntentAbortError(`脚本切场景 ${sceneId} 时活动世界已替换`)
      }
      // 只消费“紧随自动对话收尾”的旧帧；其他 entry 从当前 presented canvas 取 source。
      const closedDialogFrame = preserveClosedDialogFrame
        ? ctx.getImageData(0, 0, canvas.width, canvas.height)
        : null
      const fromSceneId = scene.id
      const plan = await prepareAndCommitSceneSwitch({
        prepare: () =>
          prepareSceneSwitch(sceneId, worldView, {
            ...spawn,
            inheritFacing: inheritedFacing,
          }),
        assertCurrent: (prepared) => {
          assertRequestCurrent()
          assertSceneSwitchPlanCurrent(prepared, worldView)
        },
        present: async (prepared) => {
          // 切场景是黑屏事务的统一 finalizer；旧 token 不得把新场景揭示再盖黑。
          screenHold.cancel()
          preserveClosedDialogFrame = false
          markSceneLoad(fromSceneId, sceneId, 'preflight')
          ditherTransition.cancel()
          sceneEntrySession.cancel()
          const entry = prepared.onEnterEntry
          if (entry) {
            // 先关对话状态但不重画；source 仍是来源场景最后一张完整 presented frame。
            dialogBox.close()
            sceneEntrySession.begin(
              fromSceneId,
              sceneId,
              closedDialogFrame ?? ctx.getImageData(0, 0, canvas.width, canvas.height),
              entry.reveal,
            )
            if (entry.reveal.kind === 'fade') {
              markSceneLoad(fromSceneId, sceneId, 'entry-fade-out')
              await hostFade('out', entry.reveal.outMs, 'black', signal, visualOwner)
            } else {
              markSceneLoad(fromSceneId, sceneId, 'entry-hold')
            }
          } else {
            markSceneLoad(fromSceneId, sceneId, 'fade-out')
            await hostFade('out', transition?.outMs ?? 260, 'black', signal, visualOwner)
          }
        },
        commit: (prepared) => {
          markSceneLoad(fromSceneId, sceneId, 'switch')
          stopAutoRunners()
          commitSceneSwitch(prepared, worldView)
        },
        shouldCleanup: () => sceneSwitchIntent.isCurrent(sceneToken) && world === worldView,
        cleanup: () => {
          preserveClosedDialogFrame = false
          ditherTransition.cancelOwned(visualOwner)
          sceneEntrySession.cancel()
          fadeDriver.cancelOwned(visualOwner, 0)
          markSceneLoad(fromSceneId, sceneId, 'error')
        },
      })
      const targetBinding = plan.onEnterBinding
      const entry = plan.onEnterEntry
      markSceneLoad(fromSceneId, sceneId, 'committed')
      applyWorldToScene()
      entityFrameOverride.clear()
      pendingOnEnter = targetBinding ? { sceneId, binding: targetBinding } : null
      sceneChangedByScript = true // X1:演出链全部收尾后写 auto 档
      startAutoRunners()
      if (!entry) {
        markSceneLoad(fromSceneId, sceneId, 'fade-in')
        await hostFade('in', transition?.inMs ?? 260, 'black', signal, visualOwner)
        assertRequestCurrent()
        markSceneLoad(fromSceneId, sceneId, 'done')
      } else {
        markSceneLoad(fromSceneId, sceneId, 'entry-ready')
      }
    },
    ditherScreen: (ms, signal) => {
      assertRunnerActive(signal, '屏幕渐变所属 runner 已取消')
      // 非 entry 的独立 0x73 仍在命令现场 snapshot，不参与场景入场事务。
      dialogBox.close()
      ditherZeroFrameMatchesBackup = null
      ditherZeroFrameDiffersFromTarget = null
      return awaitOwnedDither(
        () =>
          ditherTransition.beginSnapshot(
            () => ctx.getImageData(0, 0, canvas.width, canvas.height),
            ms,
          ),
        signal,
        '屏幕渐变所属 runner 已取消',
      )
    },
    holdScreen: hostHoldScreen,
    revealScreen: hostRevealScreen,
    setPartyFacing: (fc, gesture, member) => {
      // 原版 0x15:wPartyDirection=o[0] + rgParty[o[2]].wFrame=dir*3+o[1] —— 每次都写帧;
      // gesture 缺省(=0 站立帧)即清脚本姿势。member>0 = 跟随者(渲染落地后生效,先忽略)。
      facing = fc
      if (!member) partyGesture = gesture ?? null
    },
    setActorSprite: async (actorId, spriteId, signal) => {
      assertRunnerActive(signal, `0x65 换装 ${actorId} 的 runner 已取消`)
      // 原版 0x65:rgwSpriteNum[role]=sprite,持续到下次显式切换(开场练武/疯跑后脚本自切回)。
      const actor = project.actorsById[actorId]
      if (!actor) throw new Error(`0x65 换装角色 ${actorId} 不在 actors 表`)
      const def = requireSpriteDef(spriteId, `0x65 换装 ${actorId}`)
      const worldToken = worldMutationIntent.capture()
      const scriptMutationToken = scriptMutationIntent.capture()
      const intent = actorMutationIntent(actorSpriteMutationIntents, actorId)
      const actorToken = intent.begin()
      const frames = await awaitRunner(
        spriteCache.load(project.assetResolver, def.asset),
        signal,
        `0x65 换装 ${actorId} 的 runner 已取消`,
      )
      assertRunnerActive(signal, `0x65 换装 ${actorId} 的 runner 已取消`)
      worldMutationIntent.assertCurrent(worldToken, `0x65 换装 ${actorId} 的所属世界已失效`)
      scriptMutationIntent.assertCurrent(scriptMutationToken, `0x65 换装 ${actorId} 的脚本已失效`)
      intent.assertCurrent(actorToken, `0x65 换装 ${actorId} 已被更新请求取代`)
      // 切回角色本体 = 撤销临时覆盖；持久 appearance 仍按其自身优先级生效。
      if (def.id === actor.spriteId) actorSpriteOverrides.delete(actorId)
      else actorSpriteOverrides.set(actorId, { def, frames })
    },
    // 0x1A:持久改角色形象(成年灵儿),写 CharacterInstance.appearance 随存档。按 template 匹配队员;
    // 大世界精灵覆写要预载新精灵帧(队长/跟随者渲染每帧读 appearance.spriteId)。
    setActorAppearance: async (actorTemplate, patch, signal) => {
      assertRunnerActive(signal, `0x1A 换形象 ${actorTemplate} 的 runner 已取消`)
      if (!world.party.some((member) => member.template === actorTemplate)) {
        host.report(`setActorAppearance: ${actorTemplate} 不在队伍`)
        return
      }
      const worldToken = worldMutationIntent.capture()
      const scriptMutationToken = scriptMutationIntent.capture()
      const intent = actorMutationIntent(actorAppearanceMutationIntents, actorTemplate)
      const actorToken = intent.begin()
      const readiness: Promise<unknown>[] = []
      if (patch.spriteId) {
        const def = requireSpriteDef(patch.spriteId, `0x1A 换形象 ${actorTemplate}`)
        readiness.push(spriteCache.load(project.assetResolver, def.asset))
      }
      if (patch.battleSprite) {
        const def = project.battleSpritesById[patch.battleSprite]
        if (!def)
          throw new Error(
            `0x1A 换形象 ${actorTemplate}: BattleSpriteDef "${patch.battleSprite}" 不存在`,
          )
        readiness.push(
          loadBattleSpriteDefinition(
            project.battleSpriteCache,
            project.assetResolver,
            def,
            'player-fighter',
          ),
        )
      }
      await awaitRunner(
        Promise.all(readiness),
        signal,
        `0x1A 换形象 ${actorTemplate} 的 runner 已取消`,
      )
      assertRunnerActive(signal, `0x1A 换形象 ${actorTemplate} 的 runner 已取消`)
      worldMutationIntent.assertCurrent(worldToken, `0x1A 换形象 ${actorTemplate} 的所属世界已失效`)
      scriptMutationIntent.assertCurrent(
        scriptMutationToken,
        `0x1A 换形象 ${actorTemplate} 的脚本已失效`,
      )
      intent.assertCurrent(actorToken, `0x1A 换形象 ${actorTemplate} 已被更新请求取代`)
      const c = world.party.find((member) => member.template === actorTemplate)
      if (!c) throw asyncIntentAbortError(`0x1A 换形象 ${actorTemplate} 时角色已离队`)
      c.appearance = { ...c.appearance, ...patch }
    },
    fleeBattle: () => {
      host.report('fleeBattle: 战斗演出专用命令,大世界上下文忽略')
    },
    setEntityState: () => applyWorldToScene(), // runner 已写 world.script,这里只重放视觉
    // 0x13 实体绝对定位:持久写 entityPos(跨场景 36/54 处,进场重放)+ 本场景活体生效
    setEntityPos: (id, pos) => {
      if (world.script) {
        const e = scene.entities.find((x) => x.id === id)
        const height = e?.pos.height ?? 0
        world.script.entityPos ??= {}
        world.script.entityPos[id] = { col: pos.col, row: pos.row, height }
      }
      applyWorldToScene()
    },
    // 0x12 相对队伍摆位:绝对格 = 队伍当前格 + (dcol,drow);持久/活体同 setEntityPos
    setEntityPosRelParty: (id, dcol, drow) => {
      if (world.script) {
        const e = scene.entities.find((x) => x.id === id)
        const height = e?.pos.height ?? 0
        world.script.entityPos ??= {}
        world.script.entityPos[id] = {
          col: player.pos.col + dcol,
          row: player.pos.row + drow,
          height,
        }
      }
      applyWorldToScene()
    },
    // 0x6F 源状态读取:脚本覆写优先,否则活体推导(隐 0 / 挡路 2 / 可见 1)
    getEntityState: (id) => {
      const st = world.script?.entityState[id]
      if (st !== undefined) return st
      const e = scene.entities.find((x) => x.id === id)
      return e ? (e.hidden ? 0 : e.collide ? 2 : 1) : undefined
    },
    // 0x23 卸装:原版角色号 → 模板 → 实例;卸下退回背包(离队成员在 reserve 照卸)
    unequipRole: (roleIdx, slot) => {
      const tid = ORIGINAL_ROLE_TEMPLATES[roleIdx]
      const inst =
        world.party.find((c) => c.template === tid) ??
        world.reserve?.find((c) => c.template === tid)
      if (!inst) return
      const slots =
        slot === 'all'
          ? Object.keys(inst.equipment)
          : [['head', 'cloak', 'body', 'weapon', 'feet', 'accessory'][slot]].filter(
              (x): x is string => !!x,
            )
      for (const k of slots) {
        const itemId = inst.equipment[k]
        if (!itemId) continue
        delete inst.equipment[k]
        const entry = world.inventory.find((x) => x.itemId === itemId)
        if (entry) entry.count += 1
        else world.inventory.push({ itemId, count: 1 })
      }
    },
    setEntityFacing: (id, fc) => {
      const e = scene.entities.find((x) => x.id === id)
      if (e) e.facing = fc
    },
    setEntityFrame: (id, frame) => entityFrameOverride.set(id, frame),
    playEntityAction: (id, binding, signal) => {
      assertRunnerActive(signal, `实体 ${id} 动作所属 runner 已取消`)
      const entity = scene.entities.find((candidate) => candidate.id === id)
      if (!entity) throw new Error(`playEntityAction: 实体 "${id}" 不在当前场景 ${scene.id}`)
      const sprite = entitySpriteDefs.get(id)
      if (!sprite) throw new Error(`playEntityAction: 实体 "${id}" 没有可解析的大世界精灵`)
      const loaded = spriteCache.get(project.assetResolver, sprite.asset)
      const resolved = resolveSpriteActionBinding(
        sprite,
        binding,
        loaded?.frames.length,
        `playEntityAction: 场景 ${scene.id} 实体 ${id}`,
      )
      // 新动作接管外观时清掉 legacy 定帧；移动中的走帧仍保留并以更高优先级暂停动作。
      entityFrameOverride.delete(id)
      if (!entityMoves.has(id)) entityAnim.delete(id)
      return entityActions.play(id, resolved, signal)
    },
    stopEntityAction: (id, reset) => entityActions.stop(id, reset),
    giveItem: async (itemId, count, signal) => {
      assertRunnerActive(signal, `giveItem(${itemId}) 的 runner 已取消`)
      const targetWorld = world
      const mutationToken = worldMutationIntent.capture()
      const scriptMutationToken = scriptMutationIntent.capture()
      await awaitRunner(prepareItemSounds(itemId), signal, `giveItem(${itemId}) 的 runner 已取消`)
      assertRunnerActive(signal, `giveItem(${itemId}) 的 runner 已取消`)
      worldMutationIntent.assertCurrent(mutationToken, `giveItem(${itemId}) 的所属世界已失效`)
      scriptMutationIntent.assertCurrent(scriptMutationToken, `giveItem(${itemId}) 的脚本已失效`)
      if (world !== targetWorld)
        throw asyncIntentAbortError(`giveItem(${itemId}) 的所属世界已被替换`)
      const entry = targetWorld.inventory.find((x) => x.itemId === itemId)
      if (entry) entry.count += count
      else targetWorld.inventory.push({ itemId, count })
    },
    loseItem: (itemId, count) => {
      removeOwnedItems(world, itemId, count)
    },
    giveMoney: (delta) => {
      world.money = Math.max(0, world.money + delta)
    },
    playSound: (asset) => {
      sfx.play(asset)
    },
    playMusic: (asset) => {
      world.audio ??= {}
      world.audio.currentMusic = asset
      bgm.play(asset)
    },
    stopMusic: () => {
      world.audio ??= {}
      world.audio.currentMusic = null
      bgm.stop()
    },
    // W6 氛围(0x53 昼/0x54 夜):world.ambience 权威(随存档),显示态播 300ms 过渡
    setAmbience: (id) => {
      if (id !== 'day' && !project.ambiences.some((a) => a.id === id)) {
        console.warn(`[reforge] setAmbience: 氛围 "${id}" 不在 ambiences 表,忽略`)
        return
      }
      if ((world.ambience ?? 'day') === id) return
      world.ambience = id
      ambienceFx = { from: ambienceShown, start: nowMs }
    },
    // 0x80 昼夜切换(扬州夜转昼等):day↔night 翻转,fadeMs 渐变
    // (原版 PaletteFade 真值 3200ms;此前 setAmbience 固定 300ms 过快)
    toggleDayNight: (fadeMs) => {
      const next = (world.ambience ?? 'day') === 'day' ? 'night' : 'day'
      if (next !== 'day' && !project.ambiences.some((a) => a.id === next)) return
      world.ambience = next
      ambienceFx = { from: ambienceShown, start: nowMs, durMs: fadeMs }
    },
    // 0x35 震屏:渲染时世界层 y ±level 交替(40ms 相位 = 原版逐帧);time=0 立即关
    shakeScreen: (timeFrames, level) => {
      worldShake = timeFrames > 0 ? { untilMs: nowMs + timeFrames * 40, level } : null
    },
    // 0x1B-1D 全队资源变化:仅活人,clamp；0x1D 缺省 HP/MP 同改。
    increaseHpMp: (amount, pools) => {
      for (const c of world.party) {
        if (c.hp <= 0) continue
        if (pools === 'hp' || pools === 'both') c.hp = Math.max(0, Math.min(c.maxHP, c.hp + amount))
        if (pools === 'mp' || pools === 'both') c.mp = Math.max(0, Math.min(c.maxMP, c.mp + amount))
      }
    },
    // 0x22 全队复活(仅死者):HP = max×tenths/10 + 解重毒 + 清临时状态(0x22 遍历 RemovePlayerStatus)
    revivePartyAll: (tenths) => {
      for (const c of world.party) {
        if (c.hp > 0) continue
        // 一阶段 OP_REVIVE_PLAYER 真值:floor(max×tenths/10),无保底 1
        c.hp = Math.floor((c.maxHP * tenths) / 10)
        curePoisons(c, project.poisonsById, 'severe')
        if (c.extraStatuses?.length) c.extraStatuses = []
      }
    },
    // 0x55 学仙术:原版角色号(0李逍遥…4阿奴)→ actors 表序模板 id;离队成员也照学
    // (原版 PlayerRoles 全局存活);已会不重复。找不到实例 → 记在模板名下(入队时同键)。
    learnSkill: (roleIdx, skillId) => {
      const tid = ORIGINAL_ROLE_TEMPLATES[roleIdx]
      if (!tid || !project.skills[skillId]) return
      const inst =
        world.party.find((c) => c.template === tid) ??
        world.reserve?.find((c) => c.template === tid)
      const actorId = inst?.id ?? tid
      world.learnedSkills[actorId] ??= []
      const list = world.learnedSkills[actorId]
      if (!list.includes(skillId)) list.push(skillId)
    },
    // E6b 显式定位权威(手工演出精细控制;隐式接管见 scriptHost 位移视图)
    takeEntity: (id) => {
      takeByScript(id)
    },
    releaseEntity: (id) => {
      if (id === undefined) authority.clear()
      else authority.delete(id)
    },
    // E7 载具(D20 父动子随;原版 0xA1 聚拢 + 0x3F/44/97 骑乘的 clean 表达)
    // 全员叠筏:队长 + 全部跟随者一起 mount 同偏移(原版 0xA1 全员重叠队首;芦苇漂 1 格共乘)。
    mountParty: (entityId, dx, dy) => {
      authority.set('party', { kind: 'mount', parent: entityId, dx, dy })
      for (let m = 1; m < world.party.length; m++)
        followerAuth.set(m, { kind: 'mount', parent: entityId, dx, dy })
    },
    unmountParty: () => {
      dismountParty()
    },
    // C7 队伍变更(D22 reserve):候选世界完整解析/预载后一次提交，失败或 abort 不留半队伍。
    setParty: async (members, signal) => {
      assertRunnerActive(signal, 'setParty 的 runner 已取消')
      const worldToken = worldMutationIntent.capture()
      const scriptMutationToken = scriptMutationIntent.capture()
      const partyToken = partyMutationIntent.begin()
      const targetWorld = world
      const assertCurrent = (): void => {
        assertRunnerActive(signal, 'setParty 的 runner 已取消')
        worldMutationIntent.assertCurrent(worldToken, 'setParty 的所属世界已失效')
        scriptMutationIntent.assertCurrent(scriptMutationToken, 'setParty 的脚本已失效')
        partyMutationIntent.assertCurrent(partyToken, 'setParty 已被更新请求取代')
        if (world !== targetWorld) throw asyncIntentAbortError('setParty 的所属世界已被替换')
      }
      await commitLatestPreparedSnapshot({
        assertCurrent,
        snapshot: () => structuredClone(targetWorld),
        mutate: (candidate) => {
          applySetParty(candidate, members, project.actorsById)
          if (!candidate.party[0]) throw new Error('setParty: 队伍不能为空')
        },
        requiredResources: (candidate) =>
          candidate.party.map((member) => partySpriteDef(member).asset),
        prepare: (asset) =>
          awaitRunner(
            spriteCache.load(project.assetResolver, asset),
            signal,
            `setParty 预载 ${asset} 时 runner 已取消`,
          ).then(() => undefined),
        commit: (candidate) => {
          targetWorld.party = candidate.party
          targetWorld.reserve = candidate.reserve
          trail = seedFormationTrail(player.pos, facing)
          followerFrozen.length = 0
          followerPos.length = 0
          followerAuth.clear()
          deriveFollowers()
        },
      })
    },
    setFollowers: async (spriteIds, signal) => {
      assertRunnerActive(signal, 'setFollowers 的 runner 已取消')
      const worldToken = worldMutationIntent.capture()
      const scriptMutationToken = scriptMutationIntent.capture()
      const defs = spriteIds.map((spriteId) =>
        requireSpriteDef(spriteId, `0x98 编外跟随者 ${spriteId}`),
      )
      await awaitRunner(
        Promise.all(defs.map((def) => spriteCache.load(project.assetResolver, def.asset))),
        signal,
        'setFollowers 的 runner 已取消',
      )
      assertRunnerActive(signal, 'setFollowers 的 runner 已取消')
      worldMutationIntent.assertCurrent(worldToken, 'setFollowers 的所属世界已失效')
      scriptMutationIntent.assertCurrent(scriptMutationToken, 'setFollowers 的脚本已失效')
    },
    ride: async (entityId, to, speed, signal) => {
      assertRunnerActive(signal, `骑乘 ${entityId} 的 runner 已取消`)
      // 骑行 = 确保全员挂载 + 驱动载具走位(party 每 tick 派生跟随,相机随 render 帧更新)
      const a = authority.get('party')
      if (!(a?.kind === 'mount' && a.parent === entityId)) host.mountParty(entityId, 0, 0)
      takeByScript(entityId) // 载具本身按位移指令语义接管(其 auto 暂停)
      await host.moveEntity(entityId, to, speed, signal)
      assertRunnerActive(signal, `骑乘 ${entityId} 的 runner 已取消`)
    },
    moveEntity: (id, to, speed, signal) =>
      new Promise((resolve, reject) => {
        assertRunnerActive(signal, `实体 ${id} 走位所属 runner 已取消`)
        const e = scene.entities.find((x) => x.id === id)
        if (!e) {
          host.report(`moveEntity: 实体 ${id} 不在场`)
          reject(asyncIntentAbortError(`实体 ${id} 不在场，走位未执行`))
          return
        }
        let settled = false
        const entry = {
          to,
          speed,
          resolve: (): void => {
            if (settled) return
            settled = true
            signal?.removeEventListener('abort', abort)
            if (entityMoves.get(id) === entry) entityMoves.delete(id)
            resolve()
          },
          cancel: (message: string): void => {
            if (settled) return
            settled = true
            signal?.removeEventListener('abort', abort)
            if (entityMoves.get(id) === entry) entityMoves.delete(id)
            reject(asyncIntentAbortError(message))
          },
        }
        const abort = (): void => {
          entry.cancel(`实体 ${id} 走位所属 runner 已取消`)
        }
        // 步进只发生在世界拍上(首步至多等 100ms;曾因预充累加器致短距走位瞬移,2026-07-03)
        entityMoves.get(id)?.cancel(`实体 ${id} 的旧走位已被新走位替换`)
        entityMoves.set(id, entry)
        signal?.addEventListener('abort', abort, { once: true })
        if (signal?.aborted) abort()
      }),
    stepEntity: (id, dir) => {
      const e = scene.entities.find((x) => x.id === id)
      if (!e) return
      e.facing = dir
      const d = WALK_STEP[dir]
      // 原版单步 op(0x0B-0E)= NPCWalkOneStep(speed 2)= 4/2px = 0.25 格(script.c:660;
      // scene.c:887-888)。⚠ 曾 0.5 格且误引 play.c:213(那是追逐 speed8=16/8px)→ 步距 2×。
      e.pos = { ...e.pos, col: e.pos.col + d.dcol * 0.25, row: e.pos.row + d.drow * 0.25 }
      entityAnim.set(id, (entityAnim.get(id) ?? 0) + 1)
    },
    animEntity: (id) => {
      entityAnim.set(id, (entityAnim.get(id) ?? 0) + 1)
    },
    nudgeEntity: (id, dx, dy) => {
      // 增量制(0x6C/0x7D 像素位移):绝对 pixelToGrid 的 round 会把 ±4,±2px 碎步吞成 0
      // (开场锅挥动纹丝不动的根因)——格坐标直接累加小数增量。
      const e = scene.entities.find((x) => x.id === id)
      if (!e) return
      const d = pixelDeltaToGridDelta(dx, dy)
      e.pos = { ...e.pos, col: e.pos.col + d.dcol, row: e.pos.row + d.drow }
    },
    moveParty: (to, speed, signal) =>
      new Promise((resolve, reject) => {
        assertRunnerActive(signal, '队伍走位所属 runner 已取消')
        dismountParty() // 走位即下筏(原版 ride 是 op-scoped,挂载不跨走位;零持久态)
        let settled = false
        const entry = {
          to,
          speed,
          resolve: (): void => {
            if (settled) return
            settled = true
            signal?.removeEventListener('abort', abort)
            if (partyMove === entry) partyMove = null
            resolve()
          },
        }
        const abort = (): void => {
          if (settled) return
          settled = true
          if (partyMove === entry) partyMove = null
          signal?.removeEventListener('abort', abort)
          reject(asyncIntentAbortError('队伍走位所属 runner 已取消'))
        }
        partyMove?.resolve()
        partyMove = entry // 世界拍推进(advanceMoves)
        signal?.addEventListener('abort', abort, { once: true })
        if (signal?.aborted) abort()
      }),
    nudgeParty: (dx, dy, layer) => {
      // 0x6E 第三操作数是覆盖写，不是增量；layer=0 也必须清掉上一段演出的层。
      partyLayer = layer
      const d = pixelDeltaToGridDelta(dx, dy) // 同 nudgeEntity:增量制保碎步小数
      player.pos = { ...player.pos, col: player.pos.col + d.dcol, row: player.pos.row + d.drow }
      partyGesture = null // 原版走位重算 wFrame
      stepFrame = (stepFrame + 1) % 4 // 原版 0x6E 带走姿推进
      updateCamera()
    },
    cameraPan: (dx, dy, frames, signal) =>
      presentation.run(
        [{ kind: 'cameraPan', dx, dy, frames }],
        signal ?? new AbortController().signal,
      ),
    cameraSnap: (to) => {
      void presentation.run(
        [{ kind: 'cameraSnap', ...(to ? { to } : {}) }],
        new AbortController().signal,
      )
    },
    setEntityAuto: (id, binding) => {
      const e = scene.entities.find((x) => x.id === id)
      if (!e) return
      entityActions.stop(id, false)
      const stages = Array.isArray(binding)
        ? binding
        : [{ body: [{ kind: 'callScript' as const, ref: binding }] }]
      e.pages = e.pages?.length ? e.pages : [{}]
      e.pages[0] = { ...e.pages[0], auto: stages.length ? { stages } : undefined }
      restartAutoRunner(e) // 停旧起新(空 stages = 仅停)
    },
    setEntityTrigger: (id, binding) => {
      const e = scene.entities.find((x) => x.id === id)
      if (!e) return
      const stages = Array.isArray(binding)
        ? binding
        : [{ body: [{ kind: 'callScript' as const, ref: binding }] }]
      e.pages = e.pages?.length ? e.pages : [{}]
      const on = e.pages[0]?.trigger?.on ?? 'interact'
      const range = e.pages[0]?.trigger?.range
      e.pages[0] = { ...e.pages[0], trigger: stages.length ? { on, range, stages } : undefined }
    },
    setEntityTriggerMode: (id, on, range) => {
      const e = scene.entities.find((x) => x.id === id)
      if (!e?.pages?.[0]?.trigger) return
      if (!on) {
        e.pages[0] = { ...e.pages[0], trigger: undefined } // 关触发
      } else {
        e.pages[0] = { ...e.pages[0], trigger: { ...e.pages[0].trigger, on, range } }
      }
    },
    startBattle: async (team, battleOpts, runnerSignal) =>
      await startBattleBody(team, battleOpts, runnerSignal),
    openShop: (shopId, mode, signal) => {
      assertRunnerActive(signal, `商店 #${shopId} 所属 runner 已取消`)
      // 买 = 店铺货单;卖 = 背包可卖。店不存在 → 报错即回(脚本继续,不卡死)。
      const list =
        mode === 'buy'
          ? (project.shops.find((x) => x.id === shopId)?.items ?? null)
          : sellableItems(world, project.items)
      if (list === null) {
        host.report(`openShop: 店 #${shopId} 不在 shops 表`)
        return Promise.resolve()
      }
      return new Promise<void>((resolve, reject) => {
        let settled = false
        const entry = {
          ui: openShopUi(mode, [...list]),
          resolve: (): void => {
            if (settled) return
            settled = true
            signal?.removeEventListener('abort', abort)
            if (shop === entry) shop = null
            resolve()
          },
        }
        const abort = (): void => {
          if (settled) return
          settled = true
          if (shop === entry) shop = null
          signal?.removeEventListener('abort', abort)
          reject(asyncIntentAbortError(`商店 #${shopId} 所属 runner 已取消`))
        }
        shop?.resolve()
        shop = entry
        signal?.addEventListener('abort', abort, { once: true })
        if (signal?.aborted) abort()
      })
    },
    // 传送出口(0x38 引路蜂/土灵珠):当前场景有 onTeleport → 内联跑(loadScene 回洞口/城镇),
    // 返回 true;无此槽 → false(调用方走 onFail「引路蜂不灵」)。runner 槽被道具脚本占着 →
    // detached 内联跑(同 Phase E)。0x6D op2 运行时装的出口(赤鬼王血池 s059 打完才装)存
    // sceneScriptOverrides 覆写优先于静态槽;null 显式禁用,不得回退。
    teleportOut: async (signal) => {
      assertRunnerActive(signal, '传送出口所属 runner 已取消')
      if (scriptRuntimeV5) {
        const canonical = canonicalSceneCacheV5.get(scene.id)
        if (!canonical) throw new Error(`script v5 当前场景未缓存: ${scene.id}`)
        const ran = await runDetachedV5ScriptChain(signal, (runtime, runSignal) =>
          runtime.runSceneHook(canonical, 'onTeleport', { signal: runSignal }),
        )
        assertRunnerActive(signal, '传送出口所属 runner 已取消')
        return ran
      }
      const binding = sceneScriptBinding(scene, 'onTeleport', world)
      if (!binding || (Array.isArray(binding) && binding.length === 0)) return false
      if (world.script)
        await runDetachedScriptChain(signal, (child) =>
          child.runStages(`teleport:${scene.id}`, runnableStages(binding)),
        )
      assertRunnerActive(signal, '传送出口所属 runner 已取消')
      return true
    },
    // 演出期 runner 活跃 → 游戏循环吞输入；视频 URL 只经 catalog resolver 获得。
    playVideo: async (asset, signal) =>
      presentation.run([{ kind: 'video', asset }], signal ?? new AbortController().signal),
    // 帧动画逐帧写 Cinematic Layer；
    // World Layer 在下、对话/UI 在上，播放与末帧保持共用同一条合成路径。
    playFrameAnimation: async (asset, opts, signal) =>
      presentation.run(
        [
          {
            kind: 'frameAnimation',
            asset,
            ...(opts?.frameRate !== undefined ? { frameRate: opts.frameRate } : {}),
            ...(opts?.startFrame !== undefined ? { startFrame: opts.startFrame } : {}),
            ...(opts?.endFrame !== undefined ? { endFrame: opts.endFrame } : {}),
          },
        ],
        signal ?? new AbortController().signal,
      ),
    confirm: async (signal) => {
      assertRunnerActive(signal, '确认框所属 runner 已取消')
      const heldFrame = ctx.getImageData(0, 0, canvas.width, canvas.height)
      preserveClosedDialogFrame = false
      const answer = scriptConfirmModal.enqueue(heldFrame, signal ?? new AbortController().signal)
      activateScriptConfirm()
      return answer
    },
    query: {
      hasItem: (itemId, atLeast) =>
        (world.inventory.find((x) => x.itemId === itemId)?.count ?? 0) >= atLeast,
      ownsItem: (itemId, atLeast) => ownedItemCount(world, itemId) >= atLeast,
      money: () => world.money,
      inParty: (actorId) => world.party.some((c) => c.id === actorId || c.template === actorId),
      allFullHp: () => world.party.every((c) => c.hp >= c.maxHP),
      itemEquipped: (itemId, atLeast) =>
        world.party.reduce(
          (n, c) => n + Object.values(c.equipment).filter((v) => v === itemId).length,
          0,
        ) >= atLeast,
      entityInScene: (id) => scene.entities.some((x) => x.id === id),
      facingEntity: (id, range) => {
        const entity = scene.entities.find((candidate) => candidate.id === id)
        if (!entity || entity.hidden) return false
        const step = WALK_STEP[facing]
        const front = {
          col: player.pos.col + step.dcol,
          row: player.pos.row + step.drow,
          height: player.pos.height,
        }
        return gridDist(front, entity.pos) <= Math.max(0, range)
      },
      sceneId: () => scene.id,
    },
    // 0x99 当前场景即时换底图:预载完成后在一个无 await 提交块中同时写运行态与持久 override。
    reloadMap: async (mapId, signal) => {
      assertRunnerActive(signal, `reloadMap(${mapId}) 的 runner 已取消`)
      const scriptMutationToken = scriptMutationIntent.capture()
      const sceneAtRequest = scene
      const worldAtRequest = world
      const scriptAtRequest = expectDefined(world.script)
      const assets = await awaitRunner(
        getMapAssets(mapId),
        signal,
        `reloadMap(${mapId}) 的 runner 已取消`,
      )
      assertRunnerActive(signal, `reloadMap(${mapId}) 的 runner 已取消`)
      scriptMutationIntent.assertCurrent(scriptMutationToken, `reloadMap(${mapId}) 的脚本已失效`)
      if (scene !== sceneAtRequest)
        throw asyncIntentAbortError(`reloadMap(${mapId}) 的所属场景已失效`)
      if (world !== worldAtRequest || world.script !== scriptAtRequest)
        throw asyncIntentAbortError(`reloadMap(${mapId}) 的所属世界已失效`)
      const nextRenderer = new Canvas2DRenderer(ctx, palette, assets.tiles)
      const nextRoom = { col: 0, row: 0, cols: assets.map.width, rows: assets.map.height }
      scriptAtRequest.mapOverride ??= {}
      scriptAtRequest.mapOverride[sceneAtRequest.id] = mapId
      map = assets.map
      tiles = assets.tiles
      renderer = nextRenderer
      waveRenderer = null
      room = nextRoom
    },
    // 0xA0 游戏通关退出 → 回标题屏(复用系统菜单 quit 的 ?menu 干净重启;未存进度弃)
    quitToTitle: async (videos, signal) => {
      assertRunnerActive(signal, '返回标题所属 runner 已取消')
      resetFrameAnimationPresentation()
      await playVideoSequence(videos, signal)
      assertRunnerActive(signal, '返回标题所属 runner 已取消')
      location.href = `${location.pathname}?menu&skip-startup=1`
    },
    report: (msg) => {
      if (!import.meta.env.DEV) return
      if (reportedOnce.has(msg)) return // auto 循环会反复撞同一缺口,去重防刷屏
      reportedOnce.add(msg)
      console.warn('[script]', msg)
    },
  }
  const reportedOnce = new Set<string>()

  /**
   * DEV-only battle gateway. Debug-only overrides stay outside both author commands and
   * the canonical v5 host, while sharing the production launch intent/frame-step guards.
   */
  const startBattleDev = (
    request: {
      team: number
      enemyOverride?: string[]
      partyPreset?: {
        party: CharacterInstance[]
        inventory?: { itemId: string; count: number }[]
      }
      fieldId?: number
    },
    signal: AbortSignal,
  ): Promise<'win' | 'lose' | 'flee'> => {
    const run = (): Promise<'win' | 'lose' | 'flee'> =>
      startBattleBody(
        request.team,
        {
          ...(request.enemyOverride ? { enemyOverride: request.enemyOverride } : {}),
          ...(request.fieldId !== undefined ? { fieldId: request.fieldId } : {}),
        },
        signal,
      )
    return request.partyPreset ? withWorldPreset(world, request.partyPreset, run) : run()
  }

  // ── E6a 权威视图:同一 host 原语,两个调用界面 ──
  // 主脚本视图:位移指令隐式接管目标(决策②:转向/定帧不接管);脚本链收尾统一归还。
  const scriptHost: ScriptHost = {
    ...host,
    moveEntity: (id, to, speed, signal) => {
      takeByScript(id)
      return host.moveEntity(id, to, speed, signal)
    },
    stepEntity: (id, dir) => {
      takeByScript(id)
      host.stepEntity(id, dir)
    },
    nudgeEntity: (id, dx, dy) => {
      takeByScript(id)
      host.nudgeEntity(id, dx, dy)
    },
    chaseStep: (id, range, speed, floating, signal) => {
      takeByScript(id)
      return host.chaseStep(id, range, speed, floating, signal)
    },
  }
  // auto 巡逻视图:目标实体被主脚本接管 → 该指令暂停/跳过(决策①:仅被接管者暂停,
  // 其余 NPC 照常并行 —— 2026-07-03「不复刻对话冻结 NPC」拍板的精确化)。
  const autoHost: ScriptHost = {
    ...host,
    loadScene: async () => {
      throw new Error('auto 脚本禁止 loadScene，请由 trigger/onEnter 切换场景')
    },
    moveEntity: async (id, to, speed, signal) => {
      while (authority.has(id)) await host.wait(150, signal) // 等 release 再走(演出期整段驻留)
      assertRunnerActive(signal, `auto 实体 ${id} 走位所属 runner 已取消`)
      return host.moveEntity(id, to, speed, signal)
    },
    stepEntity: (id, dir) => {
      if (authority.has(id)) return // 半格步:被接管期丢步无感
      host.stepEntity(id, dir)
    },
    nudgeEntity: (id, dx, dy) => {
      if (authority.has(id)) return
      host.nudgeEntity(id, dx, dy)
    },
    chaseStep: async (id, range, speed, floating, signal) => {
      if (authority.has(id)) {
        await host.wait(200, signal)
        return
      }
      return host.chaseStep(id, range, speed, floating, signal)
    },
    takeEntity: (id) => {
      host.report(`auto 脚本不可接管实体(${id});takeEntity 仅主脚本可用`)
    },
    releaseEntity: () => {
      host.report('auto 脚本不可归还权威;releaseEntity 仅主脚本可用')
    },
    mountParty: () => {
      host.report('auto 脚本不可挂载队伍;mountParty 仅主脚本可用')
    },
    unmountParty: () => {
      host.report('auto 脚本不可卸载队伍;unmountParty 仅主脚本可用')
    },
    ride: async (_entityId, _to, _speed, signal) => {
      assertRunnerActive(signal, 'auto 骑乘所属 runner 已取消')
      host.report('auto 脚本不可骑乘;ride 仅主脚本可用')
    },
  }

  const refreshCurrentCanonicalBindingsV5 = (): void => {
    if (!worldScriptV5) return
    const canonical = canonicalSceneCacheV5.get(scene.id)
    if (!canonical) throw new Error(`script v5 当前场景未缓存: ${scene.id}`)
    refreshLegacySceneBindingsV5(scene, canonical, worldScriptV5)
    const pageActions: EntityActionSeed[] = []
    for (const entity of scene.entities) {
      const binding = entity.pages?.[0]?.animation
      if (!binding) continue
      const sprite = entitySpriteDefs.get(entity.id)
      if (!sprite) continue
      const loaded = spriteCache.get(project.assetResolver, sprite.asset)
      const resolved = resolveSpriteActionBinding(
        sprite,
        binding,
        loaded?.frames.length,
        `reforge: 场景 ${scene.id} 实体 ${entity.id} canonical page animation`,
      )
      pageActions.push({ entity: entity.id, ...resolved })
    }
    entityActions.replaceScene(pageActions)
  }

  const refreshRuntimeProjectionV5 = (command: RuntimeLeafCommandV5): void => {
    if (!worldScriptV5) return
    syncLegacyScriptScratchV5(scene.id)
    if (
      command.kind === 'selectEntityBehavior' ||
      command.kind === 'selectEntityPage' ||
      command.kind === 'setEntityTriggerActivation' ||
      command.kind === 'selectSceneHooks'
    )
      refreshCurrentCanonicalBindingsV5()
    if (
      (command.kind === 'selectEntityBehavior' && command.channel === 'auto') ||
      command.kind === 'selectEntityPage'
    ) {
      const target = command.target
      if (target.scene === scene.id) {
        const entity = scene.entities.find((candidate) => candidate.id === target.entity)
        // v5 behavior/page selection may atomically hand off a persisted cursor. Abort the
        // previous runner before it can wake and execute one stale state body; owner epoch
        // remains the final guard against an already-running command committing old state.
        if (entity) restartAutoRunner(entity)
      }
    }
    if (
      command.kind === 'setEntityState' ||
      command.kind === 'setMultiEntityState' ||
      command.kind === 'setEntityPos' ||
      command.kind === 'setEntityPosRelParty'
    )
      applyWorldToScene()
  }

  if (canonicalProjectV5 && worldScriptV5) {
    const transitionDigest = Object.values(canonicalProjectV5.migrationRegistry)[0]?.sidecar.digest
    const runtimeDigest =
      transitionDigest ??
      (await sha256Bytes(
        new TextEncoder().encode(
          canonicalScriptTransitionJson({
            manifest: canonicalProjectV5.manifest,
            items: canonicalProjectV5.items,
            sharedScripts: canonicalProjectV5.sharedScripts,
          }),
        ),
      ))
    scriptRuntimeV5 = new ScriptProjectRuntimeV5(canonicalProjectV5, worldScriptV5, runtimeDigest, {
      executeEffect: (command, context, signal) =>
        executeLegacyScriptHostEffectV5(
          context.timing === 'auto' ? autoHost : scriptHost,
          command,
          context,
          signal,
          { currentSceneId: () => scene.id },
        ),
      worldChanged: (command) => refreshRuntimeProjectionV5(command),
      scene: getCanonicalSceneDefV5,
      currentSceneId: () => scene.id,
      currentSceneSessionId: () =>
        `${scene.id}:${sceneSwitchIntent.capture()}:${worldMutationIntent.capture()}`,
      gate: (signal) => waitForScriptGameplay(signal),
      entityPosRelativeToParty: (target, dcol, drow) => {
        if (target.scene !== scene.id)
          throw new Error(`setEntityPosRelParty 只能操作当前场景: ${target.scene}/${target.entity}`)
        const entity = scene.entities.find((candidate) => candidate.id === target.entity)
        return {
          col: player.pos.col + dcol,
          row: player.pos.row + drow,
          height: entity?.pos.height ?? 0,
        }
      },
      query: {
        hasItem: (itemId, atLeast) =>
          (world.inventory.find((entry) => entry.itemId === itemId)?.count ?? 0) >= atLeast,
        ownsItem: (itemId, atLeast) => ownedItemCount(world, itemId) >= atLeast,
        itemEquipped: (itemId, atLeast) =>
          world.party.reduce(
            (count, character) =>
              count + Object.values(character.equipment).filter((value) => value === itemId).length,
            0,
          ) >= atLeast,
        allFullHp: () => world.party.every((character) => character.hp >= character.maxHP),
        money: () => world.money,
        inParty: (actorId) =>
          world.party.some(
            (character) => character.id === actorId || character.template === actorId,
          ),
        entityInScene: (target) =>
          target.scene === scene.id && scene.entities.some((entity) => entity.id === target.entity),
        facingEntity: (target, range) => {
          if (target.scene !== scene.id) return false
          return host.query.facingEntity(target.entity, range)
        },
      },
      confirm: (signal) => host.confirm(signal),
      startBattle: (request, signal) =>
        host.startBattle(
          request.team,
          {
            auto: request.auto,
            boss: request.boss,
            fieldId: request.fieldId,
            ...(request.music !== undefined ? { music: request.music } : {}),
            ...(request.choreography ? { choreography: [...request.choreography] } : {}),
          },
          signal,
        ),
      teleportOut: (signal) => host.teleportOut(signal),
      revealSceneEntry: (reveal, signal) => hostSceneEntryReveal(reveal, signal),
      wait: (ms, signal) => host.wait(ms, signal),
      waitWorldTick: (signal) => host.wait(STEP_MS, signal),
      yieldMacroTask: (signal) =>
        new Promise<void>((resolve, reject) => {
          const abort = (): void => {
            clearTimeout(timer)
            reject(asyncIntentAbortError('script v5 macro task 已取消'))
          }
          const timer = setTimeout(() => {
            signal.removeEventListener('abort', abort)
            resolve()
          }, 0)
          signal.addEventListener('abort', abort, { once: true })
          if (signal.aborted) abort()
        }),
    })
  }

  /** E7:mount 派生 —— 挂载者位置 = 父实体位置 + 偏移(每 tick,最后跑 = 最高权威)。 */
  function deriveMounts(): void {
    for (const [id, a] of authority) {
      if (a.kind !== 'mount') continue
      const parent = scene.entities.find((e) => e.id === a.parent)
      if (!parent) continue
      const pos = {
        col: parent.pos.col + a.dx,
        row: parent.pos.row + a.dy,
        height: parent.pos.height,
      }
      if (id === 'party') {
        player.pos = pos
        walking = false // 骑乘不迈步(原版 wFrame 冻结)
      } else {
        const e = scene.entities.find((x) => x.id === id)
        if (e) e.pos = pos
      }
    }
  }

  /**
   * E7:下筏(全员卸载 + trail 聚拢重播)。骑乘是 op-scoped 瞬时态:显式 unmountParty、
   * 走位(moveParty)、脚本收尾/强停 都会来这 —— 不存在跨点持久挂载。
   * trail 塌成队长当前格 = 下筏全员叠在队长,走开自然拉出队形(原版 0xA1 聚拢态同感)。
   */
  function dismountParty(): void {
    const a = authority.get('party')
    let mounted = a?.kind === 'mount'
    for (let m = 1; m < world.party.length; m++)
      if (followerAuth.get(m)?.kind === 'mount') mounted = true
    if (!mounted) return
    if (a?.kind === 'mount') authority.delete('party')
    for (let m = 1; m < world.party.length; m++)
      if (followerAuth.get(m)?.kind === 'mount') followerAuth.delete(m)
    trail = [{ pos: { ...player.pos }, dir: facing }]
  }

  /**
   * E7:跟随者定位 —— 1:1 移植原版 follower-pos.ts(trail 下标槽 + facing 偏移 + frozenOffset)。
   * follow=原版 trail[1]+偏移模型 / mount=父+偏移(骑乘) / script=显式持有。
   */
  function deriveFollowers(): void {
    for (let m = 1; m < world.party.length; m++) {
      const a = followerAuth.get(m) ?? { kind: 'follow' as const }
      if (a.kind === 'follow') {
        const r = computeFollowerPos(
          { party: player.pos, trail, walking, frozenOffset: followerFrozen },
          m,
          (col, row) => !isBlocked({ col, row, height: 0 }),
        )
        if (r) {
          followerPos[m] = { pos: r.pos, facing: r.dir }
        } else {
          // trail 塌陷瞬间(刚下筏/进场,只剩 1 槽)→ 叠队长(原版聚拢语义;防 1 帧消失闪烁)
          followerPos[m] = { pos: { ...player.pos }, facing }
        }
      } else if (a.kind === 'mount') {
        const parent = scene.entities.find((e) => e.id === a.parent)
        const base = parent ? parent.pos : player.pos
        followerPos[m] = {
          pos: { col: base.col + a.dx, row: base.row + a.dy, height: base.height },
          facing: a.facing ?? followerPos[m]?.facing ?? facing,
        }
      } else {
        followerPos[m] = { pos: { ...a.pos }, facing: a.facing }
      }
    }
  }

  /**
   * 原版走位单拍推进(script.c:63-105 PAL_NPCWalkTo 像素语义,菱形格域实现):
   * 象限定向 → 任一 px 轴 |offset| < 2·speed 则整体 snap 落点 → 否则沿朝向轴走 s/8 格
   * (= NPCWalkOneStep 的 x±2s,y±1s)。朝向 = **像素轴**象限(⚠ 曾直接套菱形格轴:
   * 纯 row+ 走位算成 right,2026-07-03 用户报李大娘朝向错)。
   */
  function walkTick(
    pos: GridPos,
    to: GridPos,
    speed: WalkSpeed,
  ): { pos: GridPos; facing: Facing; done: boolean } {
    const cur = gridToPixel(pos)
    const tgt = gridToPixel(to)
    const dx = tgt.x - cur.x
    const dy = tgt.y - cur.y
    const facing: Facing = dy < 0 ? (dx < 0 ? 'left' : 'up') : dx < 0 ? 'down' : 'right'
    const snap = SPEED_SNAP_PX[speed]
    if (Math.abs(dx) < snap || Math.abs(dy) < snap) return { pos: { ...to }, facing, done: true }
    const d = WALK_STEP[facing]
    const g = SPEED_GRID[speed]
    return {
      pos: { ...pos, col: pos.col + d.dcol * g, row: pos.row + d.drow * g },
      facing,
      done: false,
    }
  }

  /** M3b:世界拍推进走位驱动(实体 + 队伍;到达即兑现)。 */
  function advanceMoves(dt: number): void {
    // M3c 相机 pan:每步(~16ms)移动 (dx,dy),累积进 cameraOffset;走完兑现(演出 FX,
    // 独立于世界拍保持原速)
    if (cameraPanFx) {
      const fx = cameraPanFx
      const wantSteps = Math.min(fx.steps, fx.done + Math.max(1, Math.round(dt / 16)))
      fx.done = wantSteps
      cameraOffset.x = fx.fromX + fx.dx * fx.done
      cameraOffset.y = fx.fromY + fx.dy * fx.done
      updateCamera()
      if (fx.done >= fx.steps) {
        cameraPanFx = null
        fx.resolve()
      }
    }
    // ── 世界拍(STEP_MS=100ms):至多 1 拍/rAF,真积压丢弃(DM31 永不补帧,防卡顿后瞬移
    //    连跳)。玩家输入步进(tick 输入段)消费同一 worldTicksThisFrame → 全场同拍。──
    worldMoveAcc += dt
    worldTicksThisFrame = 0
    if (worldMoveAcc >= STEP_MS) {
      worldMoveAcc -= STEP_MS
      if (worldMoveAcc > STEP_MS) worldMoveAcc = 0
      worldTicksThisFrame = 1
      worldTickNum++
    }
    if (!worldTicksThisFrame) return
    // ⚠ 设计裁决(2026-07-03 用户):NPC 走位**不与对话系统耦合**。原版"对话等按键期
    // GameUpdate 停 → NPC 冻结"(开场李大娘读对话时停步回头)是旧引擎阻塞怪癖,clean
    // 引擎不复刻;要演出停顿将来在内容层显式编排(wait/暂停指令),不在引擎层感知对话。
    for (const [id, mv] of entityMoves) {
      const e = scene.entities.find((x) => x.id === id)
      if (!e) {
        mv.cancel(`实体 ${id} 已离场，走位未完成`)
        continue
      }
      // 0x11 慢走 = speed2 且隔拍走(script.c:688-698 的 (id&1)^(frameNum&1) 简化为全局隔拍)
      if (mv.speed === 'slow' && worldTickNum % 2 === 0) continue
      const r = walkTick(e.pos, mv.to, mv.speed)
      e.pos = r.pos
      e.facing = r.facing
      // 走位重算帧 = 覆盖 0x16 的演出定帧(一阶段 npcWalkTo 每步写 scriptedFrame 同语义;
      // 不清则 override 恒压制走路帧 → 站立滑行)
      entityFrameOverride.delete(id)
      if (r.done) {
        entityMoves.delete(id)
        entityAnim.delete(id) // 原版到点 wCurrentFrameNum=0(script.c:107-111)→ 回站立帧
        mv.resolve()
      } else {
        entityAnim.set(id, (entityAnim.get(id) ?? 0) + 1)
      }
    }
    if (partyMove) {
      const mv = partyMove
      const r = walkTick(player.pos, mv.to, mv.speed)
      player.pos = r.pos
      facing = r.facing
      if (r.done) {
        partyMove = null
        walking = false
        mv.resolve()
      } else {
        walking = true
        partyGesture = null // 原版走位重算 wFrame
        stepFrame = (stepFrame + 1) % 4
      }
      updateCamera()
    }
  }

  /** M3b:单实体 auto 巡逻/环境动画循环 runner(与主脚本并行,同原版;hidden 挂起)。 */
  function startAutoRunner(e: EntityDef): void {
    const auto = e.pages?.[0]?.auto
    if (!auto?.stages.length || autoAborts.has(e.id)) return
    const ac = new AbortController()
    autoAborts.set(e.id, ac)
    if (scriptRuntimeV5) {
      const runtime = scriptRuntimeV5
      const canonical = canonicalSceneCacheV5.get(scene.id)
      if (!canonical) throw new Error(`script v5 当前场景未缓存: ${scene.id}`)
      void (async () => {
        try {
          while (!ac.signal.aborted) {
            if (e.hidden) {
              await host.wait(120, ac.signal)
              continue
            }
            const ran = await runtime.runEntityBehavior(canonical, e.id, 'auto', {
              signal: ac.signal,
            })
            if (!ran) {
              await host.wait(120, ac.signal)
              continue
            }
            await host.wait(40, ac.signal)
          }
        } catch (error) {
          if (!isAbortError(error)) console.error('[auto:v5]', e.id, error)
        } finally {
          if (autoAborts.get(e.id) === ac) autoAborts.delete(e.id)
        }
      })()
      return
    }
    const stages = auto.stages
    const r = new ScriptRunner(
      autoHost,
      expectDefined(world.script),
      ac.signal,
      Math.random,
      project.scriptStore,
    ) // E6a:auto 视图(被接管实体暂停)
    r.selfId = e.id // chasePlayer/vanishEntity 的 self
    r.paceMs = 100 // 原版 auto 一帧(100ms)一 op(曾 80ms 近似;对齐世界拍减小与走位的错相)
    void (async () => {
      while (!ac.signal.aborted) {
        // auto 与主脚本并行(开场李大娘 setEntityState 显形后边对话边走位);仅 hidden
        // 挂起。设计裁决(2026-07-03 用户):不复刻原版"对话期冻结 NPC"的阻塞怪癖,
        // NPC 移动不感知对话系统。
        if (e.hidden) {
          await host.wait(120)
          continue
        }
        try {
          await r.runStages(`auto:${e.id}`, stages)
        } catch (err) {
          if ((err as DOMException)?.name !== 'AbortError') console.error('[auto]', e.id, err)
          break
        }
        await host.wait(40) // 段间让步(防空体紧转;原版 auto 一帧一段)
      }
    })()
  }
  function startAutoRunners(): void {
    for (const e of scene.entities) startAutoRunner(e)
  }

  // ── B9 敌对行为引擎驱动器(数据化遇敌:零脚本;hostile 字段 = 野怪)──
  //   每 hostile 实体一个游标状态机,tick 里推进:追逐→贴脸开战→胜利消失/重生、战败走 onLose。
  //   原版靠 event object 挂脚本区分野怪,新引擎用数据区分(作者拍板:遇敌是引擎能力)。
  const hostileCd = new Map<string, number>() // 实体 → 追逐节流累计 ms
  let hostileBusy = false // 遇敌处理中(开战/演出),暂停所有 hostile 追逐
  function tickHostiles(dt: number): void {
    // D14-2(K1/K2):呈现占用走 presentation.busy()(intent 在途 ∪ runner 活跃,
    // 等价于原 runner || dialogBox.active)。
    if (hostileBusy || presentation.busy() || menu !== CLOSED || activeBattle) return
    let awarenessMultiplier = 1
    const awareness = world.hostileAwareness
    if (awareness) {
      awareness.remainingMs = Math.max(0, awareness.remainingMs - dt)
      if (awareness.remainingMs <= 0) world.hostileAwareness = undefined
      else awarenessMultiplier = awareness.rangeMultiplier
    }
    for (const e of scene.entities) {
      const h = e.hostile
      if (!h || e.hidden) continue
      const dc = player.pos.col - e.pos.col
      const dr = player.pos.row - e.pos.row
      const dist = Math.max(Math.abs(dc), Math.abs(dr))
      // 贴脸(≤1)→ 开战
      if (dist <= 1) {
        void runHostileEncounter(e, h).catch((error: unknown) => {
          if (!isAbortError(error)) console.error('[battle] hostile encounter', e.id, error)
        })
        return
      }
      const chase = h.chase
      // 感知香只影响引擎明雷追逐；剧情脚本主动 chasePlayer 属于作者演出，不受此全局态污染。
      if (!chase || dist > chase.range * awarenessMultiplier) continue // 原地怪 / 出程:不动
      const cd = (hostileCd.get(e.id) ?? 0) + dt
      const stepMs = Math.max(80, 480 / Math.max(1, chase.speed))
      if (cd < stepMs) {
        hostileCd.set(e.id, cd)
        continue
      }
      hostileCd.set(e.id, 0)
      const stepCol = Math.abs(dc) >= Math.abs(dr) ? Math.sign(dc) : 0
      const stepRow = stepCol === 0 ? Math.sign(dr) : 0
      const next = { col: e.pos.col + stepCol, row: e.pos.row + stepRow, height: e.pos.height }
      if (chase.floating || !isBlockedAt(map, next)) {
        e.pos = next
        e.facing = stepCol !== 0 ? (dc > 0 ? 'right' : 'left') : dr > 0 ? 'down' : 'up'
        entityAnim.set(e.id, (entityAnim.get(e.id) ?? 0) + 1)
      }
    }
  }
  /** 一场野怪遭遇:开战 → 胜利(消失+重生窗)/ 战败(onLose,默认 gameOver)/ 逃跑(回场景)。 */
  async function runHostileEncounter(
    e: EntityDef,
    h: NonNullable<EntityDef['hostile']>,
  ): Promise<void> {
    hostileBusy = true
    try {
      // 明雷怪专属战场(三层解析第二层;缺省走场景覆写/默认)
      const result = scriptRuntimeV5
        ? await scriptRuntimeV5.host.startBattle(
            {
              team: h.team,
              ...(h.battleFieldId !== undefined ? { fieldId: h.battleFieldId } : {}),
            },
            new AbortController().signal,
          )
        : await host.startBattle(
            h.team,
            h.battleFieldId !== undefined ? { fieldId: h.battleFieldId } : undefined,
          )
      if (result === 'win') {
        e.hidden = true // 消失
        if (h.respawnSeconds && h.respawnSeconds > 0) {
          const atScene = scene
          void (async () => {
            await host.wait(expectDefined(h.respawnSeconds) * 1000)
            if (scene === atScene) e.hidden = false // 重生
          })()
        }
      } else if (result === 'lose') {
        if (h.onLose === 'gameOver' || h.onLose === undefined) await host.gameOver()
        else startScript(`hostile:${e.id}`, [{ body: h.onLose }], e.id)
      } // flee:回场景,怪留原地
    } finally {
      hostileBusy = false
    }
  }
  /** 停单实体 auto(0x24 换 autoScript 用:停旧起新)。 */
  function restartAutoRunner(e: EntityDef): void {
    autoAborts.get(e.id)?.abort()
    autoAborts.delete(e.id)
    startAutoRunner(e)
  }
  function stopAutoRunners(): void {
    // AbortSignal 只会在 host Promise 返回后被 runner 检查；先失效 host 的提交 token，
    // 保证旧场景 auto 已经卡进资源 await 时也不能在新场景提交后反写。
    invalidatePendingScriptMutations()
    for (const ac of autoAborts.values()) ac.abort()
    autoAborts.clear()
    for (const [id, mv] of entityMoves) mv.cancel(`切换场景时取消实体 ${id} 的未完成走位`)
    entityMoves.clear()
    entityAnim.clear()
    cameraPanFx?.resolve()
    cameraPanFx = null
    cameraOffset.x = 0
    cameraOffset.y = 0
  }

  /**
   * 在当前主 runner 内调用时作为同步子链执行；从物品菜单独立发起时临时占用全局 runner，
   * 并完整接续目标场景 onEnter。这样外部用途不会留下“已切场景但入场脚本没跑”的半状态。
   */
  async function runDetachedV5ScriptChain<T>(
    signal: AbortSignal | undefined,
    invoke: (runtime: ScriptProjectRuntimeV5, signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const runtime = scriptRuntimeV5
    if (!runtime) throw new Error('script v5 runtime 未初始化')
    const ownsRunnerSlot = runner === null
    const runSignal = signal ?? new AbortController().signal
    const active = { running: true }
    if (ownsRunnerSlot) runner = active
    try {
      const result = await invoke(runtime, runSignal)
      if (!ownsRunnerSlot) return result
      while (pendingOnEnter) {
        const pending = pendingOnEnter
        pendingOnEnter = null
        if (scene.id !== pending.sceneId) {
          sceneEntrySession.cancel()
          continue
        }
        const canonical = canonicalSceneCacheV5.get(pending.sceneId)
        if (!canonical) throw new Error(`script v5 当前场景未缓存: ${pending.sceneId}`)
        await runtime.runSceneHook(canonical, 'onEnter', {
          signal: runSignal,
          runSceneEntry: true,
        })
      }
      return result
    } finally {
      active.running = false
      if (ownsRunnerSlot) {
        if (runner === active) runner = null
        dismountParty()
        authority.clear()
        if (sceneChangedByScript) {
          sceneChangedByScript = false
          void doSave('auto', captureThumbnail(canvas)).catch(() => undefined)
        }
      }
    }
  }

  async function runDetachedScriptChain(
    signal: AbortSignal | undefined,
    invoke: (child: ScriptRunner) => Promise<void>,
  ): Promise<void> {
    const ownsRunnerSlot = runner === null
    const runSignal = signal ?? new AbortController().signal
    let activeChild: ScriptRunner | null = null
    const makeChild = (): ScriptRunner => {
      const child = new ScriptRunner(
        scriptHost,
        expectDefined(world.script),
        runSignal,
        Math.random,
        project.scriptStore,
      )
      activeChild = child
      if (ownsRunnerSlot) runner = child
      return child
    }
    try {
      await invoke(makeChild())
      if (!ownsRunnerSlot) return
      while (pendingOnEnter) {
        const pending = pendingOnEnter
        pendingOnEnter = null
        if (scene.id !== pending.sceneId) {
          sceneEntrySession.cancel()
          continue
        }
        await makeChild().runStages(`s:${pending.sceneId}`, runnableStages(pending.binding), {
          allowSceneEntry: true,
        })
      }
    } finally {
      if (ownsRunnerSlot) {
        if (runner === activeChild) runner = null
        dismountParty()
        authority.clear()
        if (sceneChangedByScript) {
          sceneChangedByScript = false
          void doSave('auto', captureThumbnail(canvas)).catch(() => undefined)
        }
      }
    }
  }

  /** 起一段触发/进场脚本(单脚本槽;收尾后接排队的 onEnter)。 */
  function startScript(key: string, binding: RuntimeScriptBinding, selfId?: string): void {
    if (runner) return
    // 一阶段 DLc / sdlpal play.c:120-148:剧情接管即走非行走姿势更新。
    // touch 触发发生在本次落步之后；若不在这里归位，runner/dialog 会吞掉后续
    // 探索 tick，walking=true 将让队长整段剧情冻结在迈步帧。
    const settledWalk = settleWalkAnimation({ walking, stepFrame })
    walking = settledWalk.walking
    stepFrame = settledWalk.stepFrame
    if (scriptRuntimeV5) {
      const runtime = scriptRuntimeV5
      const canonical = canonicalSceneCacheV5.get(scene.id)
      if (!canonical) throw new Error(`script v5 当前场景未缓存: ${scene.id}`)
      scriptAbort = new AbortController()
      const controller = scriptAbort
      const active = { running: true }
      runner = active
      const execution = key.startsWith('s:')
        ? runtime.runSceneHook(canonical, 'onEnter', {
            signal: controller.signal,
            runSceneEntry: true,
          })
        : key.startsWith('hostile:')
          ? (() => {
              const entityId = key.slice('hostile:'.length)
              const definition = canonical.entities.find((entity) => entity.id === entityId)
              const commands =
                definition?.hostile?.onLose && definition.hostile.onLose !== 'gameOver'
                  ? definition.hostile.onLose
                  : []
              return runtime.runCommands(commands, {
                signal: controller.signal,
                self: { scene: canonical.id, entity: entityId },
              })
            })()
          : runtime.runEntityBehavior(canonical, selfId ?? key, 'trigger', {
              signal: controller.signal,
            })
      void execution
        .catch((error: unknown) => {
          if (!isAbortError(error)) {
            console.error('[script:v5]', key, error)
            showToast(`脚本错误: ${String(error).slice(0, 40)}`)
          }
        })
        .finally(() => {
          active.running = false
          if (runner !== active) return
          runner = null
          scriptAbort = null
          dismountParty()
          authority.clear()
          const finishedSceneId = key.startsWith('s:') ? key.slice(2) : null
          if (
            finishedSceneId === scene.id &&
            sceneEntrySession.active?.targetSceneId === finishedSceneId
          )
            sceneEntrySession.cancel()
          if (pendingOnEnter) {
            const pending = pendingOnEnter
            pendingOnEnter = null
            if (scene.id === pending.sceneId) {
              startScript(`s:${pending.sceneId}`, pending.binding)
              return
            }
            sceneEntrySession.cancel()
          }
          if (sceneChangedByScript) {
            sceneChangedByScript = false
            void doSave('auto', captureThumbnail(canvas)).catch(() => undefined)
          }
        })
      return
    }
    scriptAbort = new AbortController()
    const r = new ScriptRunner(
      scriptHost,
      expectDefined(world.script),
      scriptAbort.signal,
      Math.random,
      project.scriptStore,
    ) // E6a:主脚本视图(位移隐式接管)
    r.selfId = selfId
    runner = r
    void r
      .runStages(key, runnableStages(binding), { allowSceneEntry: key.startsWith('s:') })
      .catch((err: unknown) => {
        if (!isAbortError(err)) {
          console.error('[script]', key, err)
          showToast(`脚本错误: ${String(err).slice(0, 40)}`)
        }
      })
      .finally(() => {
        if (runner !== r) return
        runner = null
        scriptAbort = null
        dismountParty() // E7 兜底收尾人:脚本链结束仍挂载 → 下筏(防跟随者漏挂持久态)
        authority.clear() // E6a:脚本链收尾统一归还(兜底收尾人;续链新段自行重新接管)
        const finishedSceneId = key.startsWith('s:') ? key.slice(2) : null
        if (
          finishedSceneId === scene.id &&
          sceneEntrySession.active?.targetSceneId === finishedSceneId
        )
          sceneEntrySession.cancel()
        if (pendingOnEnter) {
          const pending = pendingOnEnter
          pendingOnEnter = null
          if (scene.id === pending.sceneId) {
            startScript(`s:${pending.sceneId}`, pending.binding)
            return // onEnter 续链;auto 档等整链收尾(下一次 finally)
          }
          sceneEntrySession.cancel()
        }
        if (sceneChangedByScript) {
          // X1 自动存档:演出链(含 onEnter)全部收尾、玩家落地 → 静默写 auto 槽
          sceneChangedByScript = false
          void doSave('auto', captureThumbnail(canvas)).catch(() => undefined)
        }
      })
  }

  /** 强停脚本(读档/dev 切场景):abort 全树 + 兑现悬挂 driver + 清演出态。 */
  function abortScript(): void {
    sceneSwitchIntent.invalidate()
    worldMutationIntent.invalidate()
    invalidatePendingScriptMutations()
    battleLaunchIntent.invalidate()
    activeBattle?.cancel()
    scriptAbort?.abort()
    itemUseAbort?.abort()
    itemUseAbort = null
    runner = null
    scriptAbort = null
    pendingOnEnter = null
    preserveClosedDialogFrame = false
    scriptConfirmModal.cancelAll('脚本会话已替换')
    resumeScriptExecutionGates()
    presentation.cancelAll() // D14-2(K3):呈现收口(fade→透明/camera→(0,0)/dialog→close/动画→reset)
    dismountParty() // E7:强停同样下筏(防跟随者漏挂)
    authority.clear() // E6a:强停演出同样归还全部实体
    for (const t of timers.splice(0)) t.settle()
    screenHold.cancel()
    ditherTransition.cancel()
    sceneEntrySession.cancel()
    entityFrameOverride.clear()
    partyGesture = null // 演出态随脚本终止一并清(dev 强停/读档;正常流脚本自清)
    actorSpriteOverrides.clear()
    partyMove?.resolve()
    partyMove = null
    walking = false
  }

  /** 格距(切比雪夫)。 */
  function gridDist(a: GridPos, b: GridPos): number {
    return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row))
  }

  /** 找最近的触发实体(M3a 单页;hidden 跳过)。 */
  function findTrigger(on: 'interact' | 'touch'): EntityDef | undefined {
    let best: EntityDef | undefined
    let bestD = Number.POSITIVE_INFINITY
    for (const e of scene.entities) {
      if (e.hidden) continue
      const t = e.pages?.[0]?.trigger
      if (!t || t.on !== on) continue
      const range = Math.max(t.range ?? 0, on === 'interact' ? 1 : 0)
      const d = gridDist(player.pos, e.pos)
      if (d <= range && d < bestD) {
        best = e
        bestD = d
      }
    }
    return best
  }

  function fireTrigger(e: EntityDef): void {
    const t = e.pages?.[0]?.trigger
    if (t) startScript(e.id, t.stages, e.id)
  }

  // menuAssets 已在菜单前建(见上);menuBox 复用之。
  // 状态板数据源(P2 补缺):毒行/头像随队员/EXP 阈值查表 —— 缺一不掉功能,只回落旧行为
  const menuBox = new MenuBox(glyphs, project.locale, menuAssets, project.items, {
    poisonsById: project.poisonsById,
    actorsById: project.actorsById,
    imageCache: project.imageCache,
    palette: await getStandardPalette().catch(() => undefined),
  })
  let menu: MenuState = CLOSED
  let magicMenu: MagicMenuState = closeMagicMenu()
  let equipMenu: EquipMenuState = closeEquipMenu()
  let useMenu: UseMenuState = closeUseMenu()
  let itemUsePending = false
  /** D14-3 reward-gain 队列：逐条固定时长，Enter / Space 可只跳当前条；Esc 留给外层菜单。 */
  const rewardGainQueue = new RewardGainQueue()
  let lastUseCursor = 0 // 使用面板光标记忆(原版 iCurInvMenuItem;跨开关恢复)
  let lastMagicCaster = 0 // 仙术施法人光标记忆(原版 uigame.c:674 static w;确认时写,DL22)
  let lastMainCursor = 0 // 主菜单光标记忆(原版 iCurMainMenuItem;确认时写)
  let statusIdx = 0 // 状态板当前查看的队员索引(原版 iCurrent;方向键切人,越界关菜单)
  let systemMenu: SystemMenuState = closeSystemMenu()
  let lastSystemCursor = 0 // 系统菜单光标记忆(原版 iCurSystemMenuItem;跨开关恢复)
  let systemPlaceholder: string | undefined // 占位提示文案 id(选占位项后短暂显示)
  // 存档系统(D-save)：saveStore 已在菜单前建(见上,读档界面复用)；此处续浏览界面态 + 缩略图缓存 + metas 快照。
  let saveBrowser: SaveBrowserState = closeSaveBrowser()
  let lastSaveSlot: SlotId | undefined // 默认槽记忆(原版 bCurrentSaveSlot:存/读过哪槽,下次浏览默认停那)
  let saveMetas: SaveMeta[] = []
  const saveThumbs = new Map<SlotId, ImageBitmap>()
  let saveSnapshotQueue: Promise<void> = Promise.resolve()
  let saveWriteQueue: Promise<void> = Promise.resolve()
  let saveMetasReady: Promise<void> = Promise.resolve()
  let saveMetasInitialized = false
  let committedSavedTimes = 0
  let overwriteYes = false // 覆盖确认框高亮(右=是)
  let lastGameThumb: Blob | undefined // 开菜单时抓的干净游戏帧(菜单内存档的缩略图源)
  let toast: { text: string; until: number } | undefined // 快速存读短提示
  const MAP_NAME = project.manifest.name
  const gameplayClock = new GameplayClock()

  function showToast(text: string): void {
    toast = { text, until: performance.now() + 1500 }
  }

  async function showItemUseResults(
    entries: readonly ItemUseResultEntry[],
    signal: AbortSignal,
  ): Promise<void> {
    await rewardGainQueue.present(entries.map(itemUseResultText), signal)
  }

  const itemUseFailureText = (reason: string | undefined, message: string | undefined): string => {
    if (message) return message
    switch (reason) {
      case 'not-owned':
        return '物品已经不在背包或装备中'
      case 'missing-target':
        return '没有可作用的目标'
      case 'wrong-context':
        return '这个物品不能在大世界使用'
      case 'gate-failed':
        return '没有产生效果'
      case 'missing-materials':
        return '材料不足'
      case 'empty-resource-pool':
        return '当前没有可用资源'
      case 'external-unavailable':
        return '当前场景无法执行这个用途'
      case 'invalid-effect-chain':
        return '物品用途配置不完整'
      default:
        return '现在无法使用这个物品'
    }
  }

  /**
   * 物品用途的唯一异步入口。执行期间暂时收起物品菜单，让剧情对话、商店和切场景
   * 能接管输入；执行结束后再由结构化 outcome 决定恢复原位、重算列表或保持关闭。
   */
  async function dispatchItemUse(request: UseExecutionRequest): Promise<void> {
    if (itemUsePending) return
    itemUsePending = true
    const controller = new AbortController()
    itemUseAbort = controller
    const menuBefore = menu
    const sceneBefore = scene.id
    lastUseCursor = request.state.cursor
    useMenu = closeUseMenu()
    menu = CLOSED
    try {
      let outcome = await executeWorldItemUse({
        world,
        targetCharId: request.targetCharId,
        itemId: request.itemId,
        items: project.items,
        poisonDefs: project.poisonsById,
        host: {
          currentWorld: () => world,
          replaceWorld: (next) => replaceWorld(next),
          runScript: (ref, signal) => {
            if (!scriptRuntimeV5 || !canonicalProjectV5 || !isV5RuntimeScriptRef(ref))
              return runDetachedScriptChain(signal, (child) =>
                child.run([{ kind: 'callScript', ref }]),
              )
            return runDetachedV5ScriptChain(signal, async (runtime, runSignal) => {
              if (ref.id.startsWith('item:')) {
                const [, itemId, scriptId] = ref.id.split(':')
                if (!itemId || scriptId !== 'use')
                  throw new Error(`item private script ref 非法: ${ref.id}`)
                await runtime.runItemPrivateScript(canonicalProjectV5.items, itemId, scriptId, {
                  signal: runSignal,
                })
                return
              }
              await runtime.runSharedScript(ref.id, { signal: runSignal })
            })
          },
          runSceneHook: (_hook, signal) => host.teleportOut(signal),
          placeEntityInFront: async (target, state, signal) => {
            signal?.throwIfAborted()
            const step = WALK_STEP[facing]
            const pos = planItemEntityPlacement({
              target,
              currentSceneId: scene.id,
              entityIds: new Set(scene.entities.map((candidate) => candidate.id)),
              map,
              partyPos: player.pos,
              step,
            })
            // PAL 0x84 calls PAL_CheckObstacle(..., FALSE, 0): only map geometry
            // participates. Other event objects are deliberately ignored here.
            if (!pos) return false
            if (worldScriptV5) {
              commitItemEntityPlacement({ kind: 'v5', value: worldScriptV5 }, target, state, pos)
              syncLegacyScriptScratchV5(target.scene)
            } else {
              const script = expectDefined(world.script)
              commitItemEntityPlacement({ kind: 'legacy', value: script }, target, state, pos)
            }
            applyWorldToScene()
            return true
          },
        },
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      if (outcome.status === 'success') {
        if (scene.id !== sceneBefore) outcome = { ...outcome, menu: 'close' }
        replaceWorld(outcome.world)
        const sound = project.items[request.itemId]?.use?.sound
        if (sound) sfx.play(sound)
        const results = buildItemUseResultEntries(outcome.presentations, project.items)
        if (results.length > 0) await showItemUseResults(results, controller.signal)
      } else {
        const message = itemUseFailureText(outcome.reason, outcome.message)
        showToast(message)
        host.report(`itemUse(${request.itemId}): ${message}`)
      }
      useMenu = finishUseExecution(request, outcome, project.items)
      if (useMenu.active) menu = menuBefore
    } catch (error) {
      if (isAbortError(error)) return
      console.error('[item-use]', request.itemId, error)
      showToast('物品用途执行失败，请检查脚本或配置')
      useMenu = request.state
      menu = menuBefore
    } finally {
      if (itemUseAbort === controller) itemUseAbort = null
      itemUsePending = false
    }
  }

  /** 读 metas + 解码缩略图(开界面/存档后刷新)。 */
  async function refreshSaveMetas(): Promise<void> {
    const nextMetas = await saveStore.listMeta()
    const nextThumbs = new Map<SlotId, ImageBitmap>()
    for (const m of nextMetas) {
      const blob = await saveStore.getThumb(m.slotId)
      if (blob) nextThumbs.set(m.slotId, await createImageBitmap(blob))
    }
    saveMetas = nextMetas
    saveThumbs.clear()
    for (const [slotId, thumb] of nextThumbs) saveThumbs.set(slotId, thumb)
    committedSavedTimes = Math.max(
      committedSavedTimes,
      ...nextMetas.map((meta) => meta.savedTimes ?? 0),
    )
    saveMetasInitialized = true
  }

  function buildCurrentSavePayload(): StoredSavePayload {
    const position = {
      sceneId: scene.id,
      pos: structuredClone(player.pos),
      facing,
    }
    if (worldScriptV5 && canonicalProjectV5) {
      const snapshot = structuredClone(world)
      delete snapshot.script
      return buildPayloadV8(
        {
          ...snapshot,
          script: structuredClone(worldScriptV5),
        },
        position,
        canonicalProjectV5.manifest.id,
      )
    }
    return buildPayload(
      structuredClone(world),
      position,
      project.manifest.id,
      project.manifest.contentVersion,
    )
  }

  function doSave(slotId: SlotId, thumb: Blob | Promise<Blob>): Promise<void> {
    const thumbReady = Promise.resolve(thumb)
    // 写队列可能仍在等待前一笔事务；立刻挂 rejection handler，避免缩略图先失败时冒出
    // unhandledrejection。scheduled 后续仍 await 原 promise，并把失败交还本次调用方。
    void thumbReady.catch(() => undefined)
    const snapshot = saveSnapshotQueue.then(async () => {
      const prepareSnapshot = () => {
        // safe-point barrier 只保护这段同步快照；IndexedDB/缩略图刷新不得阻塞互动脚本激活。
        return structuredClone({
          meta: buildMeta(
            slotId,
            world,
            MAP_NAME,
            (c) => lookupText(`name.${c.template}`, project.locale),
            Date.now(),
          ),
          payload: buildCurrentSavePayload(),
        })
      }
      return scriptRuntimeV5
        ? await scriptRuntimeV5.withSaveBarrier(prepareSnapshot)
        : prepareSnapshot()
    })
    saveSnapshotQueue = snapshot.then(
      () => undefined,
      () => undefined,
    )

    const scheduled = saveWriteQueue.then(async () => {
      const prepared = await snapshot
      await saveMetasReady
      if (!saveMetasInitialized) {
        const persisted = await saveStore.listMeta()
        committedSavedTimes = Math.max(
          committedSavedTimes,
          ...persisted.map((meta) => meta.savedTimes ?? 0),
        )
        saveMetasInitialized = true
      }
      // wSavedTimes 跨槽单调计数；只在三 store 原子事务成功后推进，失败不消费编号。
      const savedTimes = committedSavedTimes + 1
      const meta = { ...prepared.meta, savedTimes }
      const capturedThumb = await thumbReady
      await saveStore.putSlot(meta, prepared.payload, capturedThumb)
      committedSavedTimes = savedTimes
      try {
        await refreshSaveMetas()
      } catch (error) {
        // 三 store 已提交即视为存档成功；浏览缓存失败只降级当前 UI，不反报“存档失败”。
        console.warn('[save] 存档已写入，但浏览缓存刷新失败:', error)
        saveMetas = [...saveMetas.filter((entry) => entry.slotId !== slotId), structuredClone(meta)]
        saveThumbs.delete(slotId)
        try {
          saveThumbs.set(slotId, await createImageBitmap(capturedThumb))
        } catch {
          // 缩略图解码失败不影响 payload/meta 的成功提交。
        }
      }
    })
    // auto/quick/manual 写入保持请求顺序；每个调用方仍收到自己的失败，不让一次失败毒死队尾。
    saveWriteQueue = scheduled.catch(() => undefined)
    return scheduled
  }

  function reportSaveFailure(error: unknown): void {
    console.error('[save] 存档失败:', error)
    showToast('存档失败')
  }

  function payloadBelongsToProject(
    p: Pick<StoredSavePayload, 'projectId'>,
    where: string,
  ): boolean {
    if (p.projectId !== project.manifest.id) {
      console.warn(
        `[save] ${where} 属工程 "${p.projectId}",与当前 "${project.manifest.id}" 不匹配,拒绝读档`,
      )
      return false
    }
    return true
  }

  async function normalizeStoredPayload(
    raw: StoredSavePayload,
    where: string,
    _signal?: AbortSignal,
  ): Promise<StoredSavePayload> {
    if (!canonicalProjectV5) {
      if (raw.version >= 5) throw new Error(`${where}: v4 工程不能读取 SAVE v${raw.version}`)
      return normalizePayload(raw as SavePayload, { ...saveNormalizeOptions, where })
    }
    const resolver = await preflightSaveMigration({
      manifest: canonicalProjectV5.manifest,
      payload: raw,
    })
    return normalizePayloadV8(raw as SavePayloadV8, resolver)
  }

  /** 已归一化 payload 的统一恢复事务；槽读档与 E2E 文件恢复必须共路。 */
  async function restorePayload(
    p: StoredSavePayload,
    token: number,
    where: string,
    signal?: AbortSignal,
  ): Promise<boolean> {
    assertRunnerActive(signal, `${where} 的 runner 已取消`)
    if (!payloadBelongsToProject(p, where)) return false
    // 内容版本温和提示(不拒绝:内容工程迭代是常态,存档格式版本才做硬迁移)
    if (p.contentVersion !== project.manifest.contentVersion) {
      showToast('存档来自旧版内容,如有异常请重开新档')
    }
    let canonicalScriptCandidate: WorldScriptStateV5 | undefined
    const candidate =
      canonicalProjectV5 && p.version === 8
        ? (() => {
            const payload = p as SavePayloadV8
            canonicalScriptCandidate = structuredClone(
              payload.world.script ?? emptyWorldScriptStateV5(),
            )
            const shell = structuredClone(payload.world)
            delete shell.script
            return {
              ...shell,
              script: legacyWorldScriptScratchV5(
                canonicalScriptCandidate,
                payload.position.sceneId,
              ),
            } as typeof world
          })()
        : structuredClone((p as SavePayload).world)
    if (!candidate.party[0]) {
      showToast(`${where}: 存档队伍为空`)
      return false
    }
    if (!canonicalScriptCandidate) candidate.script ??= emptyWorldScriptState()
    // 读档解毒(原版真值:毒/定时状态/装备临时抗性在 GLOBALVARS 不入 SAVEDGAME → 读档即净身;
    // reforge 全量 world 入档,故读回后主动清 runtime-only 三件)
    for (const c of candidate.party) {
      c.poisons = undefined
      c.extraStatuses = undefined
      c.extraPoisonRes = undefined
    }
    // 同场景也走 switchScene:场景实体运行时已被演出污染(位置/触发),读档必须回
    // def 初态再由 applyWorldToScene 重放世界态(X1;getSceneDef 已返回 pristine 拷贝)。
    let plan: SceneSwitchPlan
    try {
      plan = await prepareSceneSwitch(
        p.position.sceneId,
        candidate,
        { pos: p.position.pos, facing: p.position.facing },
        false,
      )
      assertRunnerActive(signal, `${where} 的 runner 已取消`)
      loadIntent.assertCurrent(token, `${where} 已被更新读档请求取代`)
      assertSceneSwitchPlanCurrent(plan, candidate)
    } catch (error) {
      if (isAbortError(error)) {
        if (signal?.aborted) throw error
        return false
      }
      console.warn(`[save] ${where} 场景预检失败:`, error)
      showToast(error instanceof Error ? error.message : '存档场景无法读取')
      return false
    }

    // 从这里开始没有 await：强停旧演出、world 与 scene 在同一个任务中同步提交。
    assertRunnerActive(signal, `${where} 的 runner 已取消`)
    const music = resolveRestoredMusic(candidate.audio?.currentMusic, plan.def.music)
    abortScript()
    stopAutoRunners()
    if (canonicalScriptCandidate) replaceWorldScriptStateV5(canonicalScriptCandidate)
    replaceWorld(candidate)
    commitSceneSwitch(plan, world, false)
    if (canonicalScriptCandidate) {
      syncLegacyScriptScratchV5(scene.id)
      refreshCurrentCanonicalBindingsV5()
    }
    syncAmbience() // W6:读档瞬时还原氛围(夜档回夜;旧档缺省昼),不播过渡
    applyWorldToScene() // 实体隐现/挡路按存档世界态重放(读档不重跑 onEnter,对齐原版)
    world.audio ??= {}
    if (music.currentMusic === undefined) delete world.audio.currentMusic
    else world.audio.currentMusic = music.currentMusic
    if (music.action === 'stop') bgm.stop()
    else bgm.play(expectDefined(music.currentMusic))
    startAutoRunners()
    return true
  }

  async function doLoad(slotId: SlotId, signal?: AbortSignal): Promise<boolean> {
    assertRunnerActive(signal, `存档槽 ${slotId} 的 runner 已取消`)
    const token = loadIntent.begin()
    const raw = await awaitRunner(
      saveStore.getPayload(slotId),
      signal,
      `存档槽 ${slotId} 的 runner 已取消`,
    )
    assertRunnerActive(signal, `存档槽 ${slotId} 的 runner 已取消`)
    if (!loadIntent.isCurrent(token)) return false
    if (!raw) return false
    const where = `存档槽 ${slotId}`
    // 工程身份先于当前工程专属的 portrait/follower 映射，错误必须稳定指向 projectId。
    if (!payloadBelongsToProject(raw, where)) return false
    let p: StoredSavePayload
    try {
      p = await normalizeStoredPayload(raw, where, signal)
    } catch (err) {
      console.warn(`[save] 槽 ${slotId} 归一化拒绝:`, err)
      showToast(err instanceof Error ? err.message : '存档无法读取')
      return false
    }
    return restorePayload(p, token, where, signal)
  }

  async function quickSave(): Promise<void> {
    await doSave('quick', captureThumbnail(canvas))
    showToast('已快速存档')
  }
  async function quickLoad(): Promise<void> {
    showToast((await doLoad('quick')) ? '已读取快速存档' : '无快速存档')
  }

  /** 浏览界面写槽:菜单内 canvas 是菜单画面 → 用开菜单时抓的干净帧;存完刷新浏览显示。 */
  async function browserWrite(slotId: SlotId): Promise<void> {
    const mode = saveBrowser.mode
    const cursor = saveBrowser.cursor
    const thumb = lastGameThumb ?? captureThumbnail(canvas)
    await doSave(slotId, thumb)
    lastSaveSlot = slotId // bCurrentSaveSlot(uigame.c:718 存档选槽即记)
    if (saveBrowser.active) saveBrowser = openSaveBrowser(mode, saveMetas, cursor)
  }
  /** 浏览界面读槽:成功 → 关菜单回大世界。 */
  async function browserLoad(slotId: SlotId): Promise<void> {
    if (await doLoad(slotId)) {
      lastSaveSlot = slotId
      saveBrowser = closeSaveBrowser()
      menu = CLOSED
    }
  }

  function drawFadeCurtain(): void {
    if (fadeDriver.value <= 0.001) return
    ctx.save()
    ctx.fillStyle = `rgba(${fadeCurtain === 'red' ? '150,12,12' : '0,0,0'},${fadeDriver.value.toFixed(3)})`
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
  }

  /**
   * 主呈现栈：World Layer → Cinematic Layer(RNG)→ fade → UI Layer → 输出特效(dither)。
   * RNG 是不透明的中间层，不改写/暂停世界渲染；对话始终由 UI Layer 最后叠加。
   */
  function render(): void {
    const scriptConfirm = scriptConfirmModal.view
    if (scriptConfirm) {
      ctx.putImageData(scriptConfirm.frame, 0, 0)
      ctx.save()
      ctx.scale(WORLD_SCALE, WORLD_SCALE)
      ctx.imageSmoothingEnabled = false
      drawConfirmBox(
        ctx,
        menuAssets.scroll,
        {
          leftText: lookupText('menu.system.no', project.locale),
          rightText: lookupText('menu.system.yes', project.locale),
          rightSelected: scriptConfirm.selectedYes,
        },
        glyphs,
        performance.now(),
      )
      ctx.restore()
      scriptConfirmModal.presented()
      return
    }
    // 对话状态已结束，但持久屏幕的最后文字像素须留给紧随的 loadScene 快照。
    if (preserveClosedDialogFrame) return
    // SceneEntry Prepare 从 preflight 起冻结上一张完整 presented frame。fade-out 也在这张
    // 冻结帧上加幕布；目标世界可在背后切换/准备，直到 reveal 原子提交。
    const heldEntryFrame = sceneEntrySession.heldFrame
    if (heldEntryFrame) {
      ctx.putImageData(heldEntryFrame, 0, 0)
      drawFadeCurtain()
      syncDitherDebugDataset()
      return
    }
    updateCamera() // 相机跟随玩家
    // trail 推进(离开方向语义,拐弯甩尾忠实原版 —— 见 pushTrail 文档)
    pushTrail(trail, player.pos, facing)
    deriveFollowers()
    // 精灵 + 高物瓦片由 renderScene 按投影 Y 统一深度排序（遮挡）；地板自动铺底。
    const sprites: SpriteDraw[] = []
    // 实体站立帧(N 实体;hidden 跳过;zBias 进画序):布局数据化 idleFrameIndex
    for (const e of scene.entities) {
      if (e.hidden) continue
      const def = entitySpriteDefs.get(e.id)
      const sp = def ? spriteCache.get(project.assetResolver, def.asset) : undefined
      // 帧优先级:legacy 定帧 > 移动/legacy anim > 语义动作 > v3 layout.loop > 站立。
      // 动作步骤已经是绝对源帧，不得再叠方向站立基址。
      const anim = entityAnim.get(e.id)
      const hasOv = entityFrameOverride.has(e.id)
      const actionFrame = entityActions.frame(e.id)
      const fi = def
        ? hasOv
          ? actualFrameIndex(
              idleFrameIndex(def.layout, e.facing ?? 'down', sp?.frames.length) +
                (entityFrameOverride.get(e.id) ?? 0),
              sp?.frames.length ?? 0,
            )
          : anim !== undefined
            ? // 0x87/走位共用计数:directional 走步序,static 平推整条帧带(原版语义;
              // 曾只走 walkFrameIndex → static 恒 0,原地动画 NPC 全冻结,作者报)
              animFrameIndex(def.layout, e.facing ?? 'down', anim, sp?.frames.length ?? 1)
            : actionFrame !== undefined
              ? actualFrameIndex(actionFrame, sp?.frames.length ?? 0)
              : def.layout.kind === 'loop'
                ? loopFrameIndex(def.layout, performance.now(), sp?.frames.length ?? 0)
                : idleFrameIndex(def.layout, e.facing ?? 'down', sp?.frames.length)
        : 0
      const f = def ? sp?.frames[fi] : undefined
      if (!sp || !f) continue
      const p = gridToPixel(e.pos)
      // 0x7E 图层覆写:只进深度排序键(+8px/层 = 一阶段 present.ts:540 sLayer×8 真值),
      // 不进落笔位;render 直读持久映射,跨场景/存档天然生效
      const lay = world.script?.entityLayer?.[e.id]
      const effectiveLayer = lay ?? e.zBias ?? 0
      sprites.push({
        frame: f,
        worldX: p.x,
        worldY: spriteScreenY(e.pos), // 含 height 上移(D16)
        // 每帧自锚(sdlpal scene.c 按**当前帧**宽高 blit;一阶段 draw-sprite.ts:16-24 同坑
        // 已修):组锚(首帧)配变尺寸帧组(爬行 193 高 31~73)会溢出几十 px = 演出瞬移感。
        anchorX: Math.floor(f.width / 2),
        anchorY: f.height,
        coverILayer: effectiveLayer * 8 + 2,
        coverSortOffset: effectiveLayer * 8 + 9,
        baseYBias: effectiveLayer,
        // D6-1(K1):actor 实体触发遮挡半透明;prop({sprite} 外观)不触发。
        occlusionTrigger: 'actor' in e,
      })
    }
    // 玩家帧每帧按当前 world.party[0] 解析；0x65 临时换装 > 0x1A 持久形象 > Actor 本体。
    const leader = world.party[0]
    const leaderVisual = leader ? partyVisual(leader) : undefined
    const ld = leaderVisual?.def
    const ls = leaderVisual?.frames
    const fi = ld
      ? partyGesture != null
        ? actualFrameIndex(
            idleFrameIndex(ld.layout, facing, ls?.frames.length) + partyGesture,
            ls?.frames.length ?? 0,
          )
        : walking
          ? walkFrameIndex(ld.layout, facing, stepFrame, ls?.frames.length)
          : idleFrameIndex(ld.layout, facing, ls?.frames.length)
      : 0
    const pf = ls?.frames[fi]
    if (ld && pf) {
      const pp = gridToPixel(player.pos)
      sprites.push({
        frame: pf,
        worldX: pp.x,
        worldY: spriteScreenY(player.pos), // 含 height 上移(D16);地面=0 同 pp.y
        anchorX: Math.floor(pf.width / 2), // 每帧自锚(同上;0x65 换爬行精灵后帧高差巨大)
        anchorY: pf.height,
        sortOffset: 10,
        coverILayer: partyLayer * 8 + 6,
        coverSortOffset: partyLayer * 8 + 10,
        baseYBias: partyLayer,
        occlusionTrigger: true,
      })
    }
    // E7 跟随者(party[1..N]):照队长那套 push sprite;walk/idle 跟队长走态
    for (let m = 1; m < world.party.length; m++) {
      const fp = followerPos[m]
      // C7:按当前 world.party 动态解析精灵；0x65/0x1A 与队长走同一优先级。
      const c = world.party[m]
      const visual = c ? partyVisual(c) : undefined
      const fd = visual?.def
      const fr = visual?.frames
      if (!fp || !fd || !fr) continue
      const ffi = walking
        ? walkFrameIndex(fd.layout, fp.facing, stepFrame, fr.frames.length)
        : idleFrameIndex(fd.layout, fp.facing, fr.frames.length)
      const ff = fr.frames[ffi]
      if (!ff) continue
      const fpp = gridToPixel(fp.pos)
      sprites.push({
        frame: ff,
        worldX: fpp.x,
        worldY: spriteScreenY(fp.pos),
        anchorX: Math.floor(ff.width / 2),
        anchorY: ff.height,
        sortOffset: 10,
        coverILayer: partyLayer * 8 + 6,
        coverSortOffset: partyLayer * 8 + 10,
        // 队长永远遮挡队员(作者定调,骑乘重叠时尤其):同 Y 平局给队员微负深度,
        // 序号越大越靠后;偏置 -0.01×8=-0.08px 只破平局,不扰正常深度排序。
        baseYBias: partyLayer - 0.01 * m,
        occlusionTrigger: true,
      })
    }
    // 0x98 编外跟随者：存档/脚本保存 SpriteDef.id；定义提供各自 AssetId 与 layout。
    const extraFollowers = world.script?.followers ?? []
    for (let k = 0; k < extraFollowers.length; k++) {
      const spriteId = expectDefined(extraFollowers[k])
      const def = project.spritesById[spriteId]
      const fr = def ? spriteCache.get(project.assetResolver, def.asset) : undefined
      const m = world.party.length + k
      const r = computeFollowerPos(
        { party: player.pos, trail, walking, frozenOffset: followerFrozen },
        m,
        (col, row) => !isBlocked({ col, row, height: 0 }),
      )
      const pos = r?.pos ?? player.pos
      const dir = r?.dir ?? facing
      if (!def || !fr) continue
      const ffi = walking
        ? walkFrameIndex(def.layout, dir, stepFrame, fr.frames.length)
        : idleFrameIndex(def.layout, dir, fr.frames.length)
      const ff = fr.frames[ffi]
      if (!ff) continue
      const fpp = gridToPixel(pos)
      sprites.push({
        frame: ff,
        worldX: fpp.x,
        worldY: spriteScreenY(pos),
        anchorX: Math.floor(ff.width / 2),
        anchorY: ff.height,
        sortOffset: 10,
        coverILayer: partyLayer * 8 + 6,
        coverSortOffset: partyLayer * 8 + 10,
        baseYBias: partyLayer - 0.01 * m,
        occlusionTrigger: true,
      })
    }
    // 场景底图:clear + scale + renderScene + restore(抽成 renderSceneFrame,editor 复用同一绘制)。
    // 0x35 震屏:相机 y ±level 交替(40ms 相位;到期自清)
    if (worldShake && nowMs >= worldShake.untilMs) worldShake = null
    const shakeCam = worldShake
      ? {
          x: camera.x,
          y: camera.y + (Math.floor(nowMs / 40) % 2 === 0 ? worldShake.level : -worldShake.level),
        }
      : camera
    // 0x71 屏波：只卷背景层，人物和局部 cover 瓦片在波动完成后静态叠回。
    // 一阶段探索 present 只在 100ms 世界拍推进波相位；rAF 补帧只复用当前相位，
    // 否则 60/120Hz 会把水波加速 6~12 倍。
    const advanceWaveFrame = worldTicksThisFrame > 0
    const waveAmp = world.script ? advanceWave(world.script.vars, advanceWaveFrame) : 0
    if (waveAmp > 0) {
      const wc = ensureWaveCanvas()
      const wctx = get2dContext(wc)
      waveRenderer ??= new Canvas2DRenderer(wctx, palette, tiles)
      renderSceneFrame(wctx, waveRenderer, {
        map,
        room,
        camera: shakeCam,
        sprites: [],
        worldScale: WORLD_SCALE,
        layers: { skipCover: true },
      })
      worldWave.apply(ctx, wc, waveAmp, WORLD_SCALE, advanceWaveFrame)
      // renderSceneFrame 会 clear，静态 pass 必须直接调用 renderer.renderScene，
      // 只跳过 base，不能再套一层 clear，否则会抹掉刚卷好的背景。
      ctx.save()
      ctx.scale(WORLD_SCALE, WORLD_SCALE)
      ctx.imageSmoothingEnabled = false
      renderer.renderScene(map, room, shakeCam, sprites, { skipBase: true })
      ctx.restore()
    } else {
      renderSceneFrame(ctx, renderer, {
        map,
        room,
        camera: shakeCam,
        sprites,
        worldScale: WORLD_SCALE,
      })
    }
    // debug 碰撞叠加层(reforge 自己的 dev 拐杖;非编辑器叠加层)—— 在底图之上、独立变换块。
    if (debugLayers.collision || debugLayers.triggers) {
      ctx.save()
      ctx.scale(WORLD_SCALE, WORLD_SCALE)
      ctx.imageSmoothingEnabled = false
      drawCollisionOverlay()
      ctx.restore()
    }
    // Presentation Pass 2:Cinematic Layer(RNG)。不活动时 World Layer 原样可见。
    const cinematicLayerDrawn = drawCinematicLayer()
    // Presentation Pass 3:fade 遮罩；Presentation Pass 4 的对话/菜单仍在它之上。
    drawFadeCurtain()
    // 商店/当铺(openShop;320 逻辑坐标 ×WORLD_SCALE,同菜单)
    if (shop) {
      ctx.save()
      ctx.scale(WORLD_SCALE, WORLD_SCALE)
      ctx.imageSmoothingEnabled = false
      drawShop(ctx, shop.ui, world, project.items, menuAssets, glyphs, performance.now(), {
        no: lookupText('menu.system.no', project.locale),
        yes: lookupText('menu.system.yes', project.locale),
      })
      ctx.restore()
    }
    // 对话框(UI)同样在 320 逻辑坐标画 + ×WORLD_SCALE 放大:POS 常量、字模 drawImage、
    // 折行 usable 全是 320 系,scale 后统一 ×4 —— 字模点阵整数倍放大锐利、版面比例不变(D16)。
    if (dialogBox.active) {
      ctx.save()
      ctx.scale(WORLD_SCALE, WORLD_SCALE)
      ctx.imageSmoothingEnabled = false
      dialogBox.render(performance.now())
      ctx.restore()
    }
    // 菜单(UI,最上层)同样 320 逻辑坐标 + ×4 高清(D17)
    if (menu.active) {
      ctx.save()
      ctx.scale(WORLD_SCALE, WORLD_SCALE)
      ctx.imageSmoothingEnabled = false
      if (saveBrowser.active) {
        // 存档浏览界面 = 隐藏整个菜单,卷轴横向铺满全宽
        drawSaveBrowser(
          ctx,
          saveBrowser,
          menuAssets,
          glyphs,
          performance.now(),
          project.locale,
          saveThumbs,
          overwriteYes,
        )
      } else if (menu.openPanel === 'magic') {
        drawMagicMenu(ctx, magicMenu, world, menuAssets, glyphs, performance.now(), {
          faceFor: (template) => {
            const asset = project.actorsById[template]?.face
            return asset ? faceImages.get(asset) : undefined
          },
          nameFor: (tpl) => lookupText(`name.${tpl}`, project.locale),
        })
      } else if (menu.openPanel === 'equip') {
        drawEquipMenu(
          ctx,
          equipMenu,
          world,
          menuAssets,
          glyphs,
          performance.now(),
          project.locale,
          project.items,
          itemEquipDescribeCtx,
        )
      } else if (menu.openPanel === 'use') {
        drawUseMenu(
          ctx,
          useMenu,
          world,
          menuAssets,
          glyphs,
          performance.now(),
          project.locale,
          project.items,
          itemEquipDescribeCtx,
        )
      } else {
        // 级联(主菜单常驻;status 全屏分流在 render 内)。系统菜单 = 叠在主菜单级联上的子层。
        menuBox.render(ctx, menu, world, performance.now(), statusIdx)
        if (menu.openPanel === 'system') {
          drawSystemMenu(
            ctx,
            systemMenu,
            menuAssets,
            glyphs,
            performance.now(),
            project.locale,
            systemPlaceholder,
          )
        }
      }
      ctx.restore()
    }
    const rewardGain = rewardGainQueue.current
    if (rewardGain) {
      ctx.save()
      ctx.scale(WORLD_SCALE, WORLD_SCALE)
      ctx.imageSmoothingEnabled = false
      drawRewardGainLine(ctx, menuAssets, glyphs, rewardGain.text, 96)
      ctx.restore()
    }
    // 快速存读短提示(置顶,~1.5s)
    if (toast && performance.now() < toast.until) {
      ctx.save()
      ctx.scale(WORLD_SCALE, WORLD_SCALE)
      ctx.imageSmoothingEnabled = false
      renderSpans(ctx, [{ text: toast.text }], 120, 6, {
        glyphs,
        shadow: true,
        forceRgba: [231, 223, 195],
      })
      ctx.restore()
    }
    // W6 氛围滤镜:一切画完之后全帧 multiply(原版夜盘是全局调色板 —— UI 也染,数据实证)
    // RNG 已按其专用 palette 烘成 RGBA，不再套用大世界 ambience；普通世界/UI 保持原有全帧染色。
    if (!cinematicLayerDrawn) applyAmbienceTint()
    // 0x73 是壳层整屏输出特效，必须放在氛围滤镜之后：backup 来自上一张最终 canvas，
    // target 也取本帧最终 canvas，避免夜景旧像素被重复 multiply。首帧强制 pr=0。
    const dither = ditherTransition.active
    if (dither) {
      let pr = 0
      const isZeroFrame = !dither.target
      if (!dither.target) {
        dither.target = ctx.getImageData(0, 0, canvas.width, canvas.height)
        dither.output = new ImageData(
          dither.backup.data.slice(),
          dither.backup.width,
          dither.backup.height,
        )
        const prepareStartedAt = performance.now()
        dither.plan = buildDitherPalettePlan(
          dither.backup.data,
          dither.target.data,
          palette.colors,
          canvas.width * canvas.height,
        )
        dither.prepareMs = performance.now() - prepareStartedAt
        // 索引计划预计算期间屏幕仍保持 backup；从计算完成后起算，不吞掉首趟错相替换。
        dither.startedAt = performance.now()
      } else {
        pr =
          dither.durationMs <= 0
            ? 1
            : Math.max(
                0,
                Math.min(1, (nowMs - expectDefined(dither.startedAt)) / dither.durationMs),
              )
      }
      const step = Math.floor(pr * DITHER_TOTAL_STEPS)
      if (dither.plan && dither.output && dither.lastStep !== step) {
        applyDitherPaletteTransition(
          dither.backup.data,
          dither.target.data,
          dither.output.data,
          step,
          canvas.width * canvas.height,
          dither.plan,
          { width: canvas.width, pixelScale: WORLD_SCALE },
        )
        dither.lastStep = step
      }
      if (dither.output) ctx.putImageData(dither.output, 0, 0)
      if (import.meta.env.DEV && isZeroFrame) {
        const shown = ctx.getImageData(0, 0, canvas.width, canvas.height).data
        const equals = (a: Uint8ClampedArray, b: Uint8ClampedArray): boolean => {
          if (a.length !== b.length) return false
          for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
          return true
        }
        ditherZeroFrameMatchesBackup = equals(shown, dither.backup.data)
        ditherZeroFrameDiffersFromTarget = !equals(shown, dither.target.data)
      }
      if (pr >= 1) ditherTransition.finish()
    }
    syncDitherDebugDataset()
  }

  /** 调试层（将来可移入编辑器）：iso 菱形网格 + 每站立点 isBlocked(绿走/红禁) + 玩家脚点。 */
  function drawCollisionOverlay(): void {
    ctx.save()
    // iso 菱形网格（h=0 地格，中心 = col*32,row*16）
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    ctx.lineWidth = 1
    for (let r = room.row; r <= room.row + room.rows; r++) {
      for (let c = room.col; c <= room.col + room.cols; c++) {
        const cx = c * TILE_W - camera.x
        const cy = r * TILE_H - camera.y
        ctx.beginPath()
        ctx.moveTo(cx, cy - TILE_H / 2) // 上
        ctx.lineTo(cx + TILE_W / 2, cy) // 右
        ctx.lineTo(cx, cy + TILE_H / 2) // 下
        ctx.lineTo(cx - TILE_W / 2, cy) // 左
        ctx.closePath()
        ctx.stroke()
      }
    }
    // 站立点：isBlocked 判（绿走/红禁），点也正好落在格中心
    for (let r = room.row; r < room.row + room.rows; r++) {
      for (let c = room.col; c < room.col + room.cols; c++) {
        const pts = [
          { x: c * TILE_W, y: r * TILE_H },
          { x: c * TILE_W + TILE_W / 2, y: r * TILE_H + TILE_H / 2 },
        ]
        for (const pt of pts) {
          const g = pixelToGrid(pt.x, pt.y)
          ctx.fillStyle = isBlocked({ col: g.col, row: g.row, height: 0 })
            ? 'rgba(255,40,40,0.95)'
            : 'rgba(50,255,50,0.7)'
          ctx.fillRect(pt.x - camera.x - 1, pt.y - camera.y - 1, 2, 2)
        }
      }
    }
    ctx.fillStyle = '#ffff00' // 玩家脚点
    const ppp = gridToPixel(player.pos)
    ctx.fillRect(ppp.x - camera.x - 2, ppp.y - camera.y - 2, 4, 4)
    // D13-1 触发区叠加层(?debug overlay 开关):实体 trigger 范围框 + 标签;auto 实体标签。
    if (debugLayers.triggers) {
      for (const e of scene.entities) {
        if (e.hidden) continue
        const page = e.pages?.[0]
        const t = page?.trigger
        if (t && 'on' in t && t.on) {
          const range = Math.max(t.range ?? 0, t.on === 'interact' ? 1 : 0)
          const p = gridToPixel(e.pos)
          const size = TILE_W * (range * 2 + 1)
          ctx.strokeStyle = t.on === 'touch' ? 'rgba(255,170,0,0.9)' : 'rgba(0,200,255,0.9)'
          ctx.strokeRect(p.x - camera.x - size / 2, p.y - camera.y - TILE_H, size, size)
          ctx.fillStyle = 'rgba(255,255,255,0.85)'
          ctx.font = '8px monospace'
          ctx.fillText(`${e.id} [${t.on}]`, p.x - camera.x, p.y - camera.y - TILE_H - 2)
        } else if (page?.auto) {
          const p = gridToPixel(e.pos)
          ctx.fillStyle = 'rgba(180,120,255,0.9)'
          ctx.font = '8px monospace'
          ctx.fillText(`${e.id} [auto]`, p.x - camera.x, p.y - camera.y - TILE_H - 2)
        }
      }
    }
    ctx.restore()
  }

  // 移动 + 交互。相机固定（整间屋上屏）。
  // 静态实体碰撞:collide 实体占其 pos 所在格,玩家目标落该格 → 挡。
  // 闭包读 entities 当前 pos(将来移动 NPC 也自然生效;静态阶段 pos 不变)。
  const isBlocked = (pos: GridPos): boolean =>
    isBlockedAt(map, pos) ||
    scene.entities.some((e) => !e.hidden && e.collide === true && sameGrid(pos, e.pos))
  const keyboard = new Keyboard()

  // 调试 / 验证：暴露活动态
  ;(window as unknown as { __reforge?: unknown }).__reforge = {
    player,
    get followerPos() {
      return followerPos // E7 调试:跟随者派生落位(idx 1..)
    },
    // M2c:切场景后 scene/room 会整体重赋 → 必须 getter 活引用(值捕获曾致 dev 传送用错场景坐标)
    get sceneId() {
      return scene.id
    },
    get entities() {
      return scene.entities
    },
    get room() {
      return room
    },
    get dialogue() {
      return dialogBox.active
    },
    get script() {
      return { running: !!runner, world: world.script }
    },
    /** dev:直开一场战斗(M4c 验证/编辑器试打入口)。 */
    startBattle: (team: number) =>
      scriptRuntimeV5
        ? scriptRuntimeV5.host.startBattle({ team }, new AbortController().signal)
        : host.startBattle(team),
    /** dev:按稳定 AssetId 播过场视频。 */
    playVideo: (asset: string) => host.playVideo(asset),
    /** dev:按稳定 AssetId 播帧动画。 */
    playFrameAnimation: (asset: string) => host.playFrameAnimation(asset),
    get battleLog() {
      return activeBattle?.debugLog() ?? []
    },
    /** dev:渲染层诊断(fade 卡黑/战斗态排查)。 */
    get renderDebug() {
      return {
        fadeBlack: fadeDriver.value,
        inBattle: !!activeBattle,
        menuActive: menu.active,
        frameAnimationLayerMode: frameAnimationPresentation.mode,
        frameAnimationLayerVisible: frameAnimationPresentation.visibleFrame !== undefined,
      }
    },
    /** dev:活动战斗队员态快照(护体符/毒携带验证:status.protect / poisons)。无战斗 = []。 */
    get battlePlayers() {
      return activeBattle?.debugPlayers() ?? []
    },
    /** dev:世界态只读观测(B7a 入账验证:money / party exp/level)。 */
    get world() {
      return world
    },
  }

  /** 当前按下的方向键 → 朝向(后按优先:按住一个再按另一个,新方向立即生效;一阶段同语义)。 */
  const ARROW_TO_FACING: Record<string, Facing> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
  }
  const ARROW_KEYS = Object.keys(ARROW_TO_FACING)
  function heldDir(): Facing | null {
    const k = keyboard.lastDownOf(ARROW_KEYS)
    return k ? (ARROW_TO_FACING[k] ?? null) : null
  }

  function tick(t: number): void {
    activateScriptConfirm()
    resumeScriptExecutionGates()
    const gameplayFrozen = scriptConfirmModal.active
    // D13-1 帧步进(K5):active 时冻结墙钟推进(实时时间不积压);stepRequested 时强制一拍。
    const stepActive = frameStepState.active
    const stepRequested = frameStepState.stepRequested
    frameStepState.stepRequested = false
    const clockFrame = gameplayClock.advance(
      t,
      gameplayFrozen || stepActive,
      stepRequested ? STEP_MS : 0,
    )
    const gameplayDt = clockFrame.gameplayDt
    nowMs = clockFrame.gameplayNow
    // ── M3a 脚本 driver 推进(tick 时间源):计时器 → 兑现;淡入淡出 → 进度;对话关 → 兑现 ──
    if (!gameplayFrozen) {
      for (let i = timers.length - 1; i >= 0; i--) {
        if (nowMs >= expectDefined(timers[i]).deadline)
          expectDefined(timers.splice(i, 1)[0]).settle()
      }
      // K5:帧步进作用域不含演出(淡入淡出);stepActive 时跳过。
      if (!stepActive) fadeDriver.advance(nowMs)
    }
    if (!dialogBox.active && scriptDialogResolve) {
      const r = scriptDialogResolve
      scriptDialogResolve = null
      preserveClosedDialogFrame = true
      r()
      // Promise 续执行优先消费；下一条不是 loadScene 时当即失效，不泄漏到后续切场。
      queueMicrotask(() => {
        preserveClosedDialogFrame = false
      })
    }
    // K5:帧步进 = 大世界 gameplay 相位(移动/实体/auto 脚本);entityActions(演出)不单步。
    if (!gameplayFrozen && !stepActive) {
      entityActions.advance(gameplayDt, (id) => {
        const entity = scene.entities.find((candidate) => candidate.id === id)
        return (
          !entity ||
          entity.hidden === true ||
          entityFrameOverride.has(id) ||
          entityMoves.has(id) ||
          entityAnim.has(id)
        )
      })
      advanceMoves(gameplayDt) // M3b 走位驱动(实体巡逻/剧情走位;与输入无关,菜单/对话期照走)
      deriveMounts() // E7:挂载派生最后跑(位置=父+偏移,覆写一切 = 契约最高权威)
      tickHostiles(gameplayDt) // B9 野怪遇敌驱动(数据化;追逐→开战→胜负)
    } else if (stepRequested) {
      advanceMoves(gameplayDt)
      deriveMounts()
      tickHostiles(gameplayDt)
    } else {
      worldTicksThisFrame = 0
    }
    const pressed = keyboard.consumePressed()
    // M4b:战斗接管(大世界暂停;渲染/输入全走 BattleSession)
    if (activeBattle) {
      activeBattle.tick(gameplayDt, pressed, clockFrame.gameplayNow)
      activeBattle.render(ctx, WORLD_SCALE)
      applyAmbienceTint() // 夜里进战斗照染(原版夜战即夜盘)
      requestAnimationFrame(tick)
      return
    }
    const interact = pressed.has(' ') || pressed.has('Enter')
    const esc = pressed.has('Escape')

    // 三态优先级:商店 > 菜单 > 对话 > 探索(用 else if 保证互斥;商店在脚本 openShop
    // await 期间活跃 —— 必须先于「脚本演出中吞输入」分支消费按键)
    if (scriptConfirmModal.active) {
      if (
        pressed.has('ArrowUp') ||
        pressed.has('ArrowDown') ||
        pressed.has('ArrowLeft') ||
        pressed.has('ArrowRight')
      )
        scriptConfirmModal.toggle()
      else if (interact) scriptConfirmModal.submit()
      else if (esc) scriptConfirmModal.submitNo()
      else if (pressed.has('F5')) void quickSave().catch(reportSaveFailure)
    } else if (shop) {
      const r = shopInput(shop.ui, pressed, world, project.items, (next) => {
        replaceWorld(next)
      })
      if (r === 'close') {
        shop.resolve()
        shop = null
      }
    } else if (handleRewardGainInput(rewardGainQueue, pressed)) {
      // 模态层消费整帧输入；advance 只兑现当前条，同一按键不会漏入刚恢复的菜单。
    } else if (menu.active) {
      if (saveBrowser.active) {
        // 存档浏览界面(全屏,优先于菜单输入)
        if (saveBrowser.confirmOverwrite) {
          // 覆盖确认:四方向 toggle 否/是;Enter 确认;Esc=否
          if (
            pressed.has('ArrowUp') ||
            pressed.has('ArrowDown') ||
            pressed.has('ArrowLeft') ||
            pressed.has('ArrowRight')
          ) {
            overwriteYes = !overwriteYes
          } else if (interact) {
            const r = overwriteYes
              ? browserConfirmOverwriteYes(saveBrowser)
              : { state: browserConfirmOverwriteNo(saveBrowser), action: undefined }
            saveBrowser = r.state
            if (r.action?.kind === 'write')
              void browserWrite(r.action.slotId).catch(reportSaveFailure)
            overwriteYes = false
          } else if (esc) {
            saveBrowser = browserConfirmOverwriteNo(saveBrowser)
            overwriteYes = false
          }
        } else {
          if (pressed.has('ArrowUp')) saveBrowser = browserMoveCursor(saveBrowser, 'up')
          if (pressed.has('ArrowDown')) saveBrowser = browserMoveCursor(saveBrowser, 'down')
          if (pressed.has('ArrowLeft')) saveBrowser = browserMoveCursor(saveBrowser, 'left')
          if (pressed.has('ArrowRight')) saveBrowser = browserMoveCursor(saveBrowser, 'right')
          if (interact) {
            const r = browserConfirm(saveBrowser)
            saveBrowser = r.state
            if (r.action?.kind === 'write')
              void browserWrite(r.action.slotId).catch(reportSaveFailure)
            else if (r.action?.kind === 'load') void browserLoad(r.action.slotId)
          }
          if (esc) saveBrowser = closeSaveBrowser() // 回系统菜单(menu 仍 active)
        }
      } else if (menu.openPanel === 'magic') {
        if (magicMenu.phase === 'pick-caster') {
          // 选施法人(uigame.c:686-723):上下循环(可停死人,确认拦);确认记忆光标(DL22 static w)
          if (pressed.has('ArrowUp') || pressed.has('ArrowLeft'))
            magicMenu = magicMoveCaster(magicMenu, world, 'up')
          if (pressed.has('ArrowDown') || pressed.has('ArrowRight'))
            magicMenu = magicMoveCaster(magicMenu, world, 'down')
          if (interact) {
            magicMenu = magicConfirmCaster(magicMenu, world, project.skills)
            if (magicMenu.phase === 'pick-spell') lastMagicCaster = magicMenu.casterIdx
          }
          if (esc) {
            // 退出回 hub(作者拍板的统一 UX,同 system 菜单;不复刻原版 goto out 弹回大世界)
            magicMenu = closeMagicMenu()
            menu = back(menu)
          }
        } else if (magicMenu.phase === 'pick-target') {
          // 选目标(uigame.c:769-861):↑←/↓→ ±1 不 wrap;Enter 施放(fSuccess 才扣 MP,
          // 满血/死人不吃消耗),放完 MP 不够再来一发 → 退回选技能;够则留此连放;Esc 回选技能
          if (pressed.has('ArrowUp') || pressed.has('ArrowLeft'))
            magicMenu = magicMoveTarget(magicMenu, world, 'up')
          if (pressed.has('ArrowDown') || pressed.has('ArrowRight'))
            magicMenu = magicMoveTarget(magicMenu, world, 'down')
          if (interact) {
            const skill = magicMenu.spells[magicMenu.cursor]
            if (skill) {
              castOutdoorSkill(
                world,
                skill,
                magicMenu.casterIdx,
                magicMenu.targetIdx,
                project.poisonsById,
              )
              const c = world.party[magicMenu.casterIdx]
              if (!c || c.mp < (skill.cost.mp ?? 0)) magicMenu = magicBackFromTarget(magicMenu)
            }
          }
          if (esc) magicMenu = magicBackFromTarget(magicMenu)
        } else {
          // 选技能:网格导航;Enter → allAllies 直放留此连放 / 单体进选目标;
          // Esc 退出回 hub(作者拍板统一 UX;原版是 goto out 弹回大世界 + 不回选人框,不复刻)
          if (pressed.has('ArrowUp')) magicMenu = magicMoveCursor(magicMenu, 'up')
          if (pressed.has('ArrowDown')) magicMenu = magicMoveCursor(magicMenu, 'down')
          if (pressed.has('ArrowLeft')) magicMenu = magicMoveCursor(magicMenu, 'left')
          if (pressed.has('ArrowRight')) magicMenu = magicMoveCursor(magicMenu, 'right')
          if (interact) {
            const r = magicConfirmSpell(magicMenu, world)
            if (r?.kind === 'castAll')
              castOutdoorSkill(world, r.skill, magicMenu.casterIdx, 'all', project.poisonsById)
          }
          if (esc) {
            magicMenu = closeMagicMenu()
            menu = back(menu)
          }
        }
      } else if (menu.openPanel === 'equip') {
        if (equipMenu.phase === 'pick-role') {
          // 确认面板:Enter 换上(equipApply 回写 world)/ Esc 回列表
          if (interact) {
            const r = equipApply(equipMenu, world, project.items)
            replaceWorld(r.world)
            equipMenu = r.state
          } else if (esc) {
            equipMenu = equipBackToList(equipMenu, world, project.items)
          }
        } else {
          // list:网格选可装物 + Enter 进确认面板 + Esc 关装备面板
          if (pressed.has('ArrowUp')) equipMenu = equipMoveCursor(equipMenu, 'up')
          if (pressed.has('ArrowDown')) equipMenu = equipMoveCursor(equipMenu, 'down')
          if (pressed.has('ArrowLeft')) equipMenu = equipMoveCursor(equipMenu, 'left')
          if (pressed.has('ArrowRight')) equipMenu = equipMoveCursor(equipMenu, 'right')
          if (interact) equipMenu = equipConfirmItem(equipMenu)
          if (esc) {
            equipMenu = closeEquipMenu()
            menu = back(menu)
          }
        }
      } else if (menu.openPanel === 'use') {
        if (itemUsePending) {
          // 用途脚本/场景钩子正在接管输入；完成后 dispatchItemUse 会恢复或关闭本菜单。
        } else if (useMenu.phase === 'pick-target') {
          // 选目标:Enter 施用(useApply 回写 world)/ Esc 回列表
          if (interact) {
            const request = useApply(useMenu, world, world.party[0]?.id ?? '', project.items)
            if (request) void dispatchItemUse(request)
          } else if (esc) {
            useMenu = useBackFromTarget(useMenu)
          }
        } else {
          // pick-item:网格选可用物 + Enter(单体进选目标 / 脚本类直接执行)+ Esc 关使用面板
          if (pressed.has('ArrowUp')) useMenu = useMoveCursor(useMenu, 'up')
          if (pressed.has('ArrowDown')) useMenu = useMoveCursor(useMenu, 'down')
          if (pressed.has('ArrowLeft')) useMenu = useMoveCursor(useMenu, 'left')
          if (pressed.has('ArrowRight')) useMenu = useMoveCursor(useMenu, 'right')
          if (interact) {
            const result = useConfirm(useMenu, world, project.items)
            if (result.kind === 'execute') void dispatchItemUse(result.request)
            else useMenu = result.state
          }
          if (esc) {
            lastUseCursor = useMenu.cursor // 记忆光标,重开恢复(原版 iCurInvMenuItem)
            useMenu = closeUseMenu()
            menu = back(menu)
          }
        }
      } else if (menu.openPanel === 'status') {
        // 状态板:Up/Left 上一员、Down/Right/Enter 下一员、越界关面板(原版 PAL_PlayerStatus iCurrent)
        if (pressed.has('ArrowUp') || pressed.has('ArrowLeft')) {
          statusIdx -= 1
          if (statusIdx < 0) menu = back(menu)
        } else if (pressed.has('ArrowDown') || pressed.has('ArrowRight') || interact) {
          statusIdx += 1
          if (statusIdx >= world.party.length) menu = back(menu)
        } else if (esc) {
          menu = back(menu)
        }
      } else if (menu.openPanel === 'system') {
        // 系统菜单:menu 阶段网格选 / confirm 阶段确认框;quit-否/Esc → back(menu) 回主菜单 hub
        // (不复刻原版「弹回大世界」;详见 system-menu-plan.md Task C)
        if (systemMenu.phase === 'switch') {
          // 音乐/音效开关子选单:四方向 toggle 关/开;Enter 落定(应用+持久)→ 回 hub;
          // Esc 取消保持当前态 → 回 hub(原版切换/取消后 PAL_SystemMenu 关整菜单,reforge 映射同 quit-否)
          if (
            pressed.has('ArrowUp') ||
            pressed.has('ArrowDown') ||
            pressed.has('ArrowLeft') ||
            pressed.has('ArrowRight')
          ) {
            systemMenu = systemToggleConfirm(systemMenu)
          } else if (interact || esc) {
            lastSystemCursor = systemMenu.cursor
            if (interact) {
              const r = systemSwitchCommit(systemMenu)
              if (r.action?.kind === 'set-music') {
                audioPrefs.music = r.action.on
                bgm.setEnabled(r.action.on)
              } else if (r.action?.kind === 'set-sound') {
                audioPrefs.sound = r.action.on
                sfx.setEnabled(r.action.on)
              }
              try {
                localStorage.setItem('reforge:audio', JSON.stringify(audioPrefs))
              } catch {
                /* 私隐模式等写失败 → 本次会话内仍生效 */
              }
            }
            systemMenu = closeSystemMenu()
            menu = back(menu)
          }
        } else if (systemMenu.phase === 'confirm') {
          // 确认框:四方向 toggle 是/否;Enter 确认;Esc = 否(回 hub)
          if (
            pressed.has('ArrowUp') ||
            pressed.has('ArrowDown') ||
            pressed.has('ArrowLeft') ||
            pressed.has('ArrowRight')
          ) {
            systemMenu = systemToggleConfirm(systemMenu)
          } else if (interact || esc) {
            const wantYes = interact ? systemMenu.confirmYes : false // Esc = 否
            systemMenu = { ...systemMenu, confirmYes: wantYes }
            const r = systemConfirmYes(systemMenu)
            if (r.action?.kind === 'quit') {
              // 退出「是」→ 回标题屏(作者拍板 2026-07-11):导航到 ?menu 干净重启
              // (丢弃 dev 参数;未存进度即弃,原版 quit 同语义 —— 想留进度先存档)
              location.href = `${location.pathname}?menu&skip-startup=1`
            } else {
              lastSystemCursor = systemMenu.cursor
              systemMenu = closeSystemMenu()
              menu = back(menu) // 否/Esc → 回主菜单 hub(非弹回大世界)
            }
          }
        } else {
          // menu 阶段:方向键选;Enter 确认(quit→confirm / 占位→提示);Esc 回 hub
          if (pressed.has('ArrowUp') || pressed.has('ArrowLeft')) {
            systemMenu = systemMoveCursor(systemMenu, 'up')
            systemPlaceholder = undefined
          }
          if (pressed.has('ArrowDown') || pressed.has('ArrowRight')) {
            systemMenu = systemMoveCursor(systemMenu, 'down')
            systemPlaceholder = undefined
          }
          if (interact) {
            const r = systemConfirm(systemMenu, {
              musicOn: audioPrefs.music,
              soundOn: audioPrefs.sound,
            })
            systemMenu = r.state
            // 默认槽(bCurrentSaveSlot):光标停上次存/读的槽;从未操作过 → 0
            const defCursor = lastSaveSlot ? Math.max(0, ALL_SLOT_IDS.indexOf(lastSaveSlot)) : 0
            if (r.action?.kind === 'open-save') {
              saveBrowser = openSaveBrowser('save', saveMetas, defCursor) // 开浏览界面·存模式
              overwriteYes = false
            } else if (r.action?.kind === 'open-load') {
              saveBrowser = openSaveBrowser('load', saveMetas, defCursor) // 开浏览界面·读模式
              overwriteYes = false
            }
          } else if (esc) {
            lastSystemCursor = systemMenu.cursor
            systemMenu = closeSystemMenu()
            menu = back(menu)
          }
        }
      } else {
        // 菜单级联导航(Left=Up / Right=Down,对齐 DL21 kKeyUp|kKeyLeft / kKeyDown|kKeyRight)
        if (pressed.has('ArrowUp') || pressed.has('ArrowLeft')) menu = moveCursor(menu, -1)
        if (pressed.has('ArrowDown') || pressed.has('ArrowRight')) menu = moveCursor(menu, 1)
        if (interact) {
          menu = confirm(menu)
          lastMainCursor = menu.stack[0]?.cursor ?? 0 // 主菜单光标记忆(iCurMainMenuItem)
          const caster = world.party[0]
          // 进面板初始化子态:仙术解析可用 / 装备解析可装
          if (menu.openPanel === 'magic') {
            // 多人队进选施法人(光标 = 上次记忆);单人队直进技能网格(uigame.c:677-681)
            magicMenu = openMagicMenu(world, project.skills, lastMagicCaster)
          } else if (menu.openPanel === 'equip' && caster) {
            equipMenu = openEquipMenu(world, caster.id, project.items)
          } else if (menu.openPanel === 'use') {
            useMenu = openUseMenu(world, project.items, lastUseCursor) // 恢复上次光标(原版 iCurInvMenuItem)
          } else if (menu.openPanel === 'status') {
            statusIdx = 0 // 开状态板从首位队员看起
          } else if (menu.openPanel === 'system') {
            systemMenu = openSystemMenu(lastSystemCursor) // 恢复上次光标(原版 iCurSystemMenuItem)
            systemPlaceholder = undefined
          }
        }
        if (esc) menu = back(menu)
      }
    } else if (dialogBox.active) {
      if (interact) dialogBox.advance(t) // 翻页;翻完 → null(关闭)
    } else if (runner) {
      // 脚本演出中(非对话等待段):吞输入,防移动/开菜单打断演出
    } else {
      if (pressed.has('F5')) {
        void quickSave().catch(reportSaveFailure) // 快速存档(快速槽)
      } else if (pressed.has('F9')) {
        void quickLoad() // 快速读档(快速槽)
      } else if (esc) {
        menu = openMenu(lastMainCursor)
        // 抓当前干净游戏帧(此刻菜单尚未画)→ 菜单内存档的缩略图源
        void captureThumbnail(canvas)
          .then((b) => {
            lastGameThumb = b
          })
          .catch((error: unknown) => {
            console.warn('[save] 菜单缩略图捕获失败:', error)
          })
      } else if (interact) {
        const trig = findTrigger('interact')
        if (trig) fireTrigger(trig)
      }
      if (!menu.active && !dialogBox.active) {
        // dev:[ / ] 循环切场景(M2c 验收拐杖;定位原版场景)
        if (pressed.has('[') || pressed.has(']')) {
          const ids = project.sceneIds
          const cur = ids.indexOf(scene.id)
          const nextId = expectDefined(
            ids[(cur + (pressed.has(']') ? 1 : ids.length - 1)) % ids.length],
          )
          void switchScene(
            nextId,
            undefined,
            () => {
              abortScript()
              stopAutoRunners()
            },
            false,
          )
            .then(() => {
              applyWorldToScene()
              startAutoRunners()
              showToast(`${nextId}(${ids.indexOf(nextId) + 1}/${ids.length})`)
              const onEnter = sceneScriptBinding(scene, 'onEnter', world)
              if (onEnter) startScript(`s:${scene.id}`, onEnter)
            })
            .catch((err: unknown) => showToast(`切场景失败: ${String(err).slice(0, 40)}`))
        }
        const dir = heldDir()
        if (dir) {
          if (dir !== facing) facing = dir // 转向立即生效(位移等下一拍;原版逐拍读输入)
          // 与脚本走位共用世界拍(advanceMoves 产的 worldTicksThisFrame)——玩家/NPC 各自
          // 累加错相曾致同屏对走 NPC 前后拉扯抖动(2026-07-05 作者报);「转向 stepAcc 拉满
          // 立即起步」的旧 hack 会破相位,一并废除(首步至多等 100ms = 原版手感)。
          if (worldTicksThisFrame) {
            // 意图 → 纯函数碰撞 → 结果 + 走帧推进(每拍一步 = 原版 ±16/±8px,play.c:806)
            const next = resolveMove(player.pos, WALK_STEP[dir], isBlocked)
            if (next.col === player.pos.col && next.row === player.pos.row) {
              // 撞禁入(墙/实体):停下、不原地踏步——站立帧 + 复位迈腿相位(同松键停步)
              walking = false
              stepFrame = (stepFrame & 2) ^ 2
            } else {
              player.pos = next
              walking = true
              partyGesture = null // 原版走路每步重算 wFrame(脚本姿势自然失效)
              stepFrame = (stepFrame + 1) % 4
              updateCamera()
              // M3a touch 触发:边沿语义(落步才查),站着不重触发(一阶段 TouchFar 死锁的架构性规避)
              const touched = findTrigger('touch')
              if (touched) fireTrigger(touched)
            }
          }
        } else if (walking) {
          walking = false
          stepFrame = (stepFrame & 2) ^ 2 // 停步复位迈腿相位（scene.c:773-774）
        }
      }
    }

    runWithPresentationFinalizer(render, abortScript)
    requestAnimationFrame(tick)
  }
  saveMetasReady = refreshSaveMetas().catch((error: unknown) => {
    console.warn('[save] 初始存档浏览缓存加载失败:', error)
  }) // 预载已有存档 metas + 缩略图(浏览界面首开即有内容)
  // e2e checkpoint 导出:evaluate 里 `window.__tpE2e.dumpSave()` 取当前世界 SavePayload(JSON)→ 落 e2e-checkpoints/
  if (import.meta.env.DEV) {
    ;(window as unknown as { __tpE2e: unknown }).__tpE2e = {
      dumpSave: buildCurrentSavePayload,
    }
  }
  // ?e2e-load=<save.json url>:从文件恢复 SavePayload(注入 world + 跳场景、跳过 onEnter 演出),秒进碎片起点(复用 doLoad 逻辑)
  const e2eLoadUrl = params.get('e2e-load')
  if (e2eLoadUrl) {
    try {
      const token = loadIntent.begin()
      const raw = (await fetch(e2eLoadUrl).then((r) => r.json())) as StoredSavePayload
      loadIntent.assertCurrent(token, `E2E 存档 ${e2eLoadUrl} 已被更新读档请求取代`)
      const where = `E2E 存档 ${e2eLoadUrl}`
      if (!payloadBelongsToProject(raw, where)) throw new Error(`${where}: projectId 不匹配`)
      const p = await normalizeStoredPayload(raw, where)
      if (!(await restorePayload(p, token, where))) throw new Error(`${where}: 恢复事务失败`)
      const e2eLoadScene = params.get('e2e-load-scene')
      if (import.meta.env.DEV && e2eLoadScene && project.sceneIds.includes(e2eLoadScene)) {
        const e2eLoadPosRaw = params.get('e2e-load-pos')?.split(',').map(Number)
        const e2eLoadPos =
          e2eLoadPosRaw?.length === 2 && e2eLoadPosRaw.every(Number.isFinite)
            ? {
                col: expectDefined(e2eLoadPosRaw[0]),
                row: expectDefined(e2eLoadPosRaw[1]),
                height: 0,
              }
            : undefined
        startScript('__e2e:loadScene', [
          {
            body: [
              e2eLoadPos
                ? { kind: 'loadScene', scene: e2eLoadScene, pos: e2eLoadPos }
                : { kind: 'loadScene', scene: e2eLoadScene },
            ],
          },
        ])
      }
      requestAnimationFrame(tick)
      return
    } catch (err) {
      console.warn('[e2e-load] 恢复失败,落回默认新局:', err)
    }
  }
  // 主菜单「读取进度」开局:doLoad 还原存档世界 + 落存档场景,跳过 onEnter 开场演出 + dev 参数后即入主循环。
  if (bootLoadSlot) {
    if (!(await doLoad(bootLoadSlot))) {
      // 读档失败(槽空/归一化拒/工程不符)→ 落回默认新局:应用世界态 + 跑入口 onEnter。
      applyWorldToScene()
      startAutoRunners()
      const onEnter = sceneScriptBinding(scene, 'onEnter', world)
      if (onEnter) startScript(`s:${scene.id}`, onEnter)
    }
    requestAnimationFrame(tick)
    return
  }
  // M3a boot:应用世界脚本态 + 跑入口场景 onEnter(演出/音乐/战场配置)+ auto 巡逻
  applyWorldToScene()
  startAutoRunners()
  // ?battle=<team 号>:直开一场战斗(编辑器「⚔ 试打」入口;跳过 onEnter 演出。team 号 0-based)
  const battleRaw = params.get('battle')
  // ?skill=<id>:dev 试放(编辑器「⚔ 战斗中试放」)—— 临时授队长该技 + MP 拉满(内存态,不落档)
  const skillParam = params.get('skill')
  if (skillParam && project.skills[skillParam]) {
    const leader = world.party[0]
    if (leader) {
      const cur = world.learnedSkills[leader.id] ?? []
      if (!cur.includes(skillParam)) world.learnedSkills[leader.id] = [...cur, skillParam]
      leader.maxMP = Math.max(leader.maxMP, 999)
      leader.mp = leader.maxMP
    }
  }
  // ?give=<itemId>:dev 塞道具进背包(验投掷/使用;如 ?give=144 食妖虫)
  const giveParam = params.get('give')
  if (giveParam) {
    const ex = world.inventory.find((x) => x.itemId === giveParam)
    if (ex) ex.count += 5
    else world.inventory.push({ itemId: giveParam, count: 5 })
  }
  // ?field=<战场号>:dev 覆写战场(验屏波/换背景;#32 常驻波 128 最猛)—— 直传参数,不落 world
  const fieldParam = params.get('field')
  const battleParam = battleRaw === null ? Number.NaN : Number(battleRaw)
  if (Number.isFinite(battleParam) && battleParam >= 0) {
    // ?battle-scene=<场景>:从该场景脚本取此 team 的 startBattle.choreography(遭遇绑定对话;
    // dev 试打默认不带剧情对话,加此参数验证 boss 遭遇台词)
    const choreoScene = params.get('battle-scene')
    const findChoreo = async (): Promise<
      import('@type-pal/content').BattleChoreography[] | undefined
    > => {
      if (!choreoScene) return undefined
      const def = await getSceneDef(choreoScene).catch(() => undefined)
      let found: import('@type-pal/content').BattleChoreography[] | undefined
      const walk = (o: unknown): void => {
        if (Array.isArray(o)) o.forEach(walk)
        else if (o && typeof o === 'object') {
          const c = o as { kind?: string; team?: number; choreography?: unknown }
          if (c.kind === 'startBattle' && c.team === battleParam && c.choreography)
            found = c.choreography as import('@type-pal/content').BattleChoreography[]
          for (const v of Object.values(o)) walk(v)
        }
      }
      if (def) walk(def)
      return found
    }
    void findChoreo().then((choreography) => {
      const options = {
        ...(fieldParam !== null ? { fieldId: Number(fieldParam) } : {}),
        ...(choreography ? { choreography } : {}),
      }
      const battle = scriptRuntimeV5
        ? scriptRuntimeV5.host.startBattle(
            { team: battleParam, ...options },
            new AbortController().signal,
          )
        : host.startBattle(battleParam, options)
      return battle
        .then((r) => showToast(`试打结束:${r}`))
        .catch((error: unknown) => {
          if (!isAbortError(error)) showToast(`试打失败:${String(error).slice(0, 48)}`)
        })
    })
  } else if (spawnPos) {
    // X5 跳转预览(?pos 落点):dev 跳转意图 = 落地即自由,跳过 onEnter 剧情垫
    //   (同一阶段 dev 跳场景语义;onEnter 的队伍瞬移会劫持落点)。要看进场演出 → 不带 pos。
    showToast(`已跳至 ${scene.id} (${spawnPos.col},${spawnPos.row}) — onEnter 已跳过`)
  } else {
    const onEnter = sceneScriptBinding(scene, 'onEnter', world)
    if (onEnter) startScript(`s:${scene.id}`, onEnter)
  }
  requestAnimationFrame(tick)

  // D13-1:?debug 打开 DEV overlay(K4——动态 import,主包静态链不触及 debug 模块;
  // 生产构建 vite 把 import.meta.env.DEV 换 false + tree-shake 掉本分支)。
  if (import.meta.env.DEV && params.has('debug')) {
    try {
      const { installDebugTools } = await import('./debug-tools.js')
      installDebugTools({
        world: () => world,
        sceneId: () => scene.id,
        scene: () => canonicalSceneCacheV5.get(scene.id),
        canonicalProject: canonicalProjectV5 ?? (project as unknown as LoadedProjectV5),
        runtime: () => scriptRuntimeV5 ?? undefined,
        runnerBusy: () => runner !== null,
        dialogBusy: () => dialogBox.active,
        presentationBusy: () => presentation.busy(),
        runDetached: (signal, invoke) => {
          if (!scriptRuntimeV5)
            return Promise.reject(new Error('非 canonical 工程(无 script v5 runtime)'))
          return runDetachedV5ScriptChain(signal, invoke)
        },
        startBattleDev,
        buildPresetParty: (actorIds, seedStats) =>
          buildWorld(
            { party: actorIds, money: 0, learnedSkills: {}, inventory: [], seedStats },
            project.actorsById,
          ).party,
        setParty: (actorIds) => {
          // ?party 语义(内存态,不落档):覆写 world.party + 满血满蓝。
          const built = buildWorld(
            { party: actorIds, money: 0, learnedSkills: {}, inventory: [], seedStats: {} },
            project.actorsById,
          )
          world.party = built.party
          for (const c of world.party) {
            c.hp = c.maxHP
            c.mp = c.maxMP
          }
        },
        grantSkill: (actorId, skillId) => {
          // ?skill 语义(内存态,不落档):临时授技 + MP 拉满。
          if (!project.skills[skillId]) throw new Error(`技能 ${skillId} 不在技能表`)
          const cur = world.learnedSkills[actorId] ?? []
          if (!cur.includes(skillId)) world.learnedSkills[actorId] = [...cur, skillId]
          const inst = world.party.find((c) => c.id === actorId || c.template === actorId)
          if (inst) {
            inst.maxMP = Math.max(inst.maxMP, 999)
            inst.mp = inst.maxMP
          }
        },
        frameStep: {
          get active() {
            return frameStepState.active
          },
          setActive: (active: boolean) => {
            frameStepState.active = active
            if (!active) frameStepState.stepRequested = false
          },
          requestStep: () => {
            frameStepState.stepRequested = true
          },
          reset: () => {
            frameStepState.active = false
            frameStepState.stepRequested = false
          },
        },
        layers: debugLayers,
        showToast,
      })
    } catch (error) {
      console.warn('[debug-tools] 安装失败:', error)
    }
  }

  console.log(
    '[reforge] room#0 可玩：方向键走（10fps 步进 + 朝向 + 走帧）/ 撞墙，靠近老者按空格搭话',
  )
}

/**
 * M4b-1 战斗场景预览:?battle-preview=<field>&enemies=1,2,3 → 加载背景 + 敌队 + 队员战斗精灵,
 * 摆位渲染一帧。验证 loader + battle-positions + renderBattleScene(不进主循环/回合)。
 */
async function renderBattlePreview(project: LoadedProject, params: URLSearchParams): Promise<void> {
  const WORLD_SCALE = 4
  canvas.width = 320 * WORLD_SCALE
  canvas.height = 200 * WORLD_SCALE
  const palette = await loadStandardPalette(project.assetBase)
  // 真实战斗 field(场景 setBattleField 用 24/12/10/7…;field 2 是主菜单背景,勿用)。
  const field =
    params.get('battle-preview') && Number(params.get('battle-preview')) > 0
      ? Number(params.get('battle-preview'))
      : 24
  const fieldDef = project.battleFields.find((candidate) => Number(candidate.id) === field)
  const bg = fieldDef?.background
    ? await loadBattleBgFull(project.assetBase, fieldDef.background, palette).then(
        (loaded) => loaded.canvas,
      )
    : undefined
  const enemyIds = (params.get('enemies') ?? Object.keys(project.enemiesById).slice(0, 3).join(','))
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  const enemies: BattleSpriteDraw[] = []
  for (const [i, enemyId] of enemyIds.entries()) {
    const enemy = project.enemiesById[enemyId]
    const definitionId = enemy?.battleSprite ?? enemyId
    const definition = project.battleSpritesById[definitionId]
    if (!definition) throw new Error(`battle preview 敌人/战斗精灵定义 "${enemyId}" 不存在`)
    const loaded = await loadBattleSpriteDefinition(
      project.battleSpriteCache,
      project.assetResolver,
      definition,
      'enemy',
    )
    if (loaded.definition.profile.kind !== 'enemy') throw new Error('enemy preview profile 漂移')
    const pos = getEnemyBasePos(enemyIds.length, i, enemy?.yPosOffset ?? 0) ?? { x: 160, y: 80 }
    enemies.push({
      sprite: loaded.sprite,
      x: pos.x,
      y: pos.y,
      frame: loaded.definition.profile.idle.start,
    })
  }

  const party = project.manifest.startWorld.party.slice(0, 3)
  const players: BattleSpriteDraw[] = []
  for (const [i, aid] of party.entries()) {
    const definitionId = project.actorsById[aid]?.battler?.battleSprite
    if (!definitionId) throw new Error(`battle preview 队员 "${aid}" 没有 battleSprite`)
    const definition = project.battleSpritesById[definitionId]
    if (!definition) throw new Error(`battle preview 战斗精灵定义 "${definitionId}" 不存在`)
    const loaded = await loadBattleSpriteDefinition(
      project.battleSpriteCache,
      project.assetResolver,
      definition,
      'player-fighter',
    )
    if (loaded.definition.profile.kind !== 'player-fighter')
      throw new Error('player preview profile 漂移')
    const pos = getPlayerBasePos(party.length, i) ?? { x: 240, y: 170 }
    players.push({
      sprite: loaded.sprite,
      x: pos.x,
      y: pos.y,
      frame: loaded.definition.profile.frames.idle,
    })
  }

  renderBattleScene(ctx, { bg, enemies, players, palette }, WORLD_SCALE)
  console.log(
    `[reforge] battle preview: field ${field}, ${enemies.length} 敌 / ${players.length} 队员`,
  )
}

/** 调试速查：按 catalog 的 sprite AssetId 浏览全部一等资源，不猜编号或物理路径。 */
async function renderSpriteGallery(project: LoadedProject, palette: Palette): Promise<void> {
  const COLS = 8
  const CELL = 80
  const assets = Object.entries(project.assetCatalog.assets)
    .filter(([, record]) => record.kind === 'sprite')
    .sort(([left], [right]) => left.localeCompare(right))
  canvas.width = COLS * CELL
  canvas.height = Math.max(CELL, Math.ceil(assets.length / COLS) * CELL)
  const renderer = new Canvas2DRenderer(ctx, palette, new Map())
  renderer.clear()
  for (const [index, [asset, record]] of assets.entries()) {
    let sp: LoadedSprite | undefined
    try {
      sp = await loadSpriteAsset(project.assetResolver, asset)
    } catch {
      sp = undefined
    }
    const col = index % COLS
    const rowI = Math.floor(index / COLS)
    ctx.fillStyle = '#7a9'
    ctx.font = '10px monospace'
    ctx.fillText(asset, col * CELL + 4, rowI * CELL + 12, CELL - 8)
    ctx.fillText(record.label ?? '', col * CELL + 4, rowI * CELL + 23, CELL - 8)
    const f = sp?.frames[0]
    if (sp && f)
      renderer.drawSprite(
        f,
        col * CELL + CELL / 2,
        rowI * CELL + CELL - 14,
        sp.anchorX,
        sp.anchorY,
        { x: 0, y: 0 },
      )
  }
  console.log(`[reforge] sprite gallery ${assets.length} catalog assets rendered`)
}

// 页面入口壳(loadProject + bootGame + 错误画屏)在 boot.ts —— 本模块只导出可复用启动函数。
