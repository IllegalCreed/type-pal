import {
  applySetParty,
  buildWorld,
  type Dialogue,
  type DialogueLine,
  type EntityDef,
  type EntryPoint,
  effectiveGrantedStatuses,
  effectiveRegen,
  effectiveResistances,
  effectiveSkills,
  effectiveStat,
  emptyWorldScriptState,
  equipGrantsAttackAll,
  type Facing,
  type GridPos,
  grantBattleRewards,
  gridToPixel,
  isIdentityTint,
  lerpTint,
  lookupText,
  isOwnMap,
  mapRoom,
  pixelDeltaToGridDelta,
  pixelToGrid,
  resolveAmbienceTint,
  resolveEntitySpriteId,
  sellableItems,
  stageIndexFor,
  type SceneDef,
  type SceneMap,
  sceneMapKey,
  tileHeightsOf,
  type ScriptStage,
  type SpriteDef,
  spriteScreenY,
  type WalkSpeed,
  isReuseMap,
} from '@type-pal/content'
import type { Palette, RleFrame } from '@type-pal/shared'
import { computeFollowerPos, type FollowerFrozen, pushTrail, type TrailEntry } from './follower.js'
import {
  type AssetBase,
  type BattleFieldEntry,
  type LoadedSprite,
  loadBattleBg,
  loadBattleBgFull,
  loadBattleFields,
  loadBattleSprite,
  loadEffectSprite,
  loadFireSprite,
  loadGlyphs,
  loadPalette,
  loadSprite,
} from './assets.js'
import { loadSceneMap } from './scene-map.js'
import type { SceneMapAssets } from './scene-map.js'
import { createBgmPlayer } from './audio/bgm.js'
import { SfxPlayer } from './audio/sfx.js'
import { getEnemyBasePos, getPlayerBasePos } from './battle/battle-positions.js'
import { curePoisons } from './battle/battle-core.js'
import { BattleSession } from './battle/battle-session.js'
import { type BattleSpriteDraw, renderBattleScene } from './battle/present-battle.js'
import { buildSettlementScreens } from './battle/settlement.js'
import { isBlockedAt, sameGrid } from './collision.js'
import { advanceWave, WorldWaveRenderer } from './screen-wave.js'
import { loadCursorFrames, loadPortraits } from './dialog/dialog-assets.js'
import { DialogBox } from './dialog/dialog-box.js'
import { startDialogue } from './dialogue.js'
import {
  closeEquipMenu,
  type EquipMenuState,
  equipApply,
  equipBackToList,
  equipConfirmItem,
  equipMoveCursor,
  openEquipMenu,
} from './equip-menu-state.js'
import { Keyboard } from './input.js'
import { type LoadedProject, loadProject, loadSceneDef } from './loader.js'
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
import { drawShop, openShopUi, type ShopUiState, shopInput } from './menu/shop-box.js'
import { drawMagicMenu } from './menu/magic-box.js'
import { loadMenuAssets, loadPng, MenuBox } from './menu/menu-box.js'
import { drawSaveBrowser } from './menu/save-browser-box.js'
import { drawSystemMenu } from './menu/system-box.js'
import { drawUseMenu } from './menu/use-box.js'
import {
  back,
  CLOSED,
  confirm,
  type MenuState,
  moveCursor,
  openMenu,
} from './menu-state.js'
import { resolveMove } from './movement.js'
import { Canvas2DRenderer, type CellRect, type SpriteDraw } from './render.js'
import { renderSceneFrame } from './render-scene.js'
import { resolveSceneFacing } from './scene-transition.js'
import {
  applyDitherPaletteTransition,
  buildDitherPalettePlan,
  DITHER_TOTAL_STEPS,
  DitherTransitionController,
  hasEarlyDitherScreen,
} from './dither-transition.js'
import { runOpeningMenu } from './opening-menu.js'
import { playRng as playRngOverlay, rngPaletteId } from './rng-player.js'
import { playVideo as playVideoOverlay } from './video-player.js'
import {
  browserConfirm,
  browserConfirmOverwriteNo,
  browserConfirmOverwriteYes,
  browserMoveCursor,
  closeSaveBrowser,
  openSaveBrowser,
  type SaveBrowserState,
} from './save/browser-state.js'
import { buildMeta, buildPayload, captureThumbnail, normalizePayload } from './save/ops.js'
import { IndexedDbSaveStore, MemorySaveStore, type SaveStore } from './save/store.js'
import { ALL_SLOT_IDS, type SaveMeta, type SavePayload, type SlotId } from './save/types.js'
import { type ScriptHost, ScriptRunner } from './script-runner.js'
import { animFrameIndex, idleFrameIndex, loopFrameIndex, walkFrameIndex } from './sprite-anim.js'
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
  openUseMenu,
  type UseMenuState,
  useApply,
  useBackFromTarget,
  useConfirm,
  useMoveCursor,
} from './use-menu-state.js'

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
export async function bootGame(project: LoadedProject): Promise<void> {
  canvas = document.getElementById('screen') as HTMLCanvasElement
  if (!canvas) throw new Error('bootGame: 页面缺 <canvas id="screen">')
  ctx = get2dContext(canvas)
  // 调试:?collision 把障碍格(0x2000)染色盖在画面上,肉眼比对禁入格 vs 视觉墙。
  const DEBUG_COLLISION = new URLSearchParams(location.search).has('collision')
  document.title = `${project.manifest.name} · reforge` // 标题随工程(index.html 只是加载占位)
  const params = new URLSearchParams(location.search)
  const sfx = new SfxPlayer(project.assetBase.sounds) // 应用级单例(解码缓存跨战斗复用)
  const bgm = createBgmPlayer(project.assetBase.music) // W5/X2:场景 BGM(懒初始化,首曲才拉 soundfont)
  // autoplay 解锁:BGM 随 boot 场景起播,彼时多半无手势 → ctx suspended;首个手势补播。
  // (sfx 不用:它惰性建 ctx,首次 play 必在按键手势内。)
  for (const ev of ['pointerdown', 'keydown'] as const)
    window.addEventListener(ev, () => bgm.resume(), { once: true, capture: true })
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
  let effectIndexP: Promise<number[] | null> | null = null
  const loadEffectIndexOnce = () => {
    effectIndexP ??= fetch(`${project.assetBase.root}/battle-effect-index.json`)
      .then((r) => (r.ok ? (r.json() as Promise<number[]>) : null))
      .catch(() => null)
    return effectIndexP
  }

  // ── 引擎 chrome(跨场景不变)──
  const [glyphs, cursorFrames] = await Promise.all([
    loadGlyphs(),
    loadCursorFrames().catch((err: unknown) => {
      console.warn('[reforge] cursor icons 加载失败,降级无光标:', err)
      return []
    }),
  ])
  // portraits 已是预烘 RGBA PNG(@type-pal/migrate bake-assets),不再需 palette 着色。
  // 全立绘一次载(对话样式 op 的 arg0 遍布全剧情;manifest 报有效块,缺块 loader 自跳)。
  // ⚠ 仅当 manifest 声明了 portraits 才预载:自有工程(空白/Reforge 原创)无原版立绘,
  //    否则会朝不存在的 portraits 目录刷满 91 条「加载失败」warn(E2E-1 gap #6)。
  const portraits = project.manifest.assets.portraits
    ? await (async (): Promise<Map<number, HTMLCanvasElement>> => {
        const portraitChunks = await fetch('/extracted/data/portraits.json')
          .then((r) => (r.ok ? (r.json() as Promise<{ portraits: { chunkIndex: number }[] }>) : null))
          .then((m) => m?.portraits.map((p) => p.chunkIndex) ?? [1, 2])
          .catch(() => [1, 2])
        return loadPortraits(portraitChunks, project.assetBase.portraits).catch((err: unknown) => {
          console.warn('[reforge] portraits 加载失败,降级无头像:', err)
          return new Map<number, HTMLCanvasElement>()
        })
      })()
    : new Map<number, HTMLCanvasElement>()

  // ── 场景资产缓存(M2c,设计 §3):map/tileset 按 mapNum LRU(cap16 + protect 当前,
  // 修一阶段按 sceneId 双取坑);palette/sceneDef 小缓存;精灵跨场景累积。──
  const MAP_CACHE_CAP = 16
  // 键 = sceneMapKey(复用 `r:<号>` / 自有 `o:<路径>`)—— 自有地图无 mapNum,需稳定字符串键(W7a-4)。
  const mapCache = new Map<string, SceneMapAssets>()
  async function getMapAssets(sceneMap: SceneMap): Promise<SceneMapAssets> {
    const key = sceneMapKey(sceneMap)
    const hit = mapCache.get(key)
    if (hit) {
      mapCache.delete(key) // LRU touch(Map 插入序 = LRU 序)
      mapCache.set(key, hit)
      return hit
    }
    const entry = await loadSceneMap(project.assetBase, sceneMap, project.tilesets)
    mapCache.set(key, entry)
    while (mapCache.size > MAP_CACHE_CAP) {
      const oldest = mapCache.keys().next().value
      if (oldest === undefined || oldest === key) break // protect 当前
      mapCache.delete(oldest)
    }
    return entry
  }
  const paletteCache = new Map<number, Palette>()
  async function getPalette(id: number): Promise<Palette> {
    const hit = paletteCache.get(id)
    if (hit) return hit
    const p = await loadPalette(project.assetBase, id)
    paletteCache.set(id, p)
    return p
  }
  const sceneDefCache = new Map<string, SceneDef>()
  sceneDefCache.set(project.entryScene.id, project.entryScene)
  async function getSceneDef(id: string): Promise<SceneDef> {
    // 缓存存 pristine,取用深拷贝 —— 运行时直接 mutate scene.entities(演出走位/隐藏/改触发),
    // 返回活对象会把污染带进场景重入与同场景读档(X1 核出的真 bug)。跨场景持久一律走
    // world.script(entityState/vars),场景重入 = def 初态 + applyWorldToScene 重放。
    const hit = sceneDefCache.get(id)
    if (hit) return structuredClone(hit)
    const def = await loadSceneDef(project, id)
    sceneDefCache.set(id, def)
    return structuredClone(def)
  }
  /** 精灵缓存 cap(RLE 索引帧组,非烤 RGBA;切场景时 protect 本场景所需后淘汰最旧)。 */
  const SPRITE_CACHE_CAP = 96
  const spriteByNum = new Map<number, LoadedSprite>()

  // 调试：?gallery 渲染精灵速查图（确认哪个 spriteNum 是人/物），不进场景。
  if (params.has('gallery')) {
    await renderSpriteGallery(project.assetBase, await getPalette(0))
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
  let room!: CellRect
  /** own 图 per-tile 遮挡格高(切场景时按绑定 tileset 元数据算;reuse/无元数据 = undefined)。 */
  let ownTileHeights: ReadonlyMap<number, number> | undefined
  let viewMinX = 0
  let viewMinY = 0
  let viewMaxX = 0
  let viewMaxY = 0
  let entitySpriteDefs = new Map<string, SpriteDef>()
  const player: { pos: GridPos } = { pos: { ...project.entryScene.entry.pos } }
  let facing: Facing = project.entryScene.entry.facing
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
  const menuAssets = await loadMenuAssets(project.items, project.assetBase)
  // 主菜单标题屏(?menu;dev 用 ?scene/?entry 直达跳过):照原版 FBP 2(盘0)+ 竖排 entryPoints + 读取进度。
  // 选开局项 → bootEntry(其 startWorld + 场景开局);选读档 → bootLoadSlot。(正式发布可翻默认走菜单,现 ?menu opt-in。)
  if (params.has('menu') && !bootEntry) {
    const menuBg = await loadBattleBg(project.assetBase, 2, await getPalette(0)).catch(() => undefined)
    if (menuBg) {
      const decision = await runOpeningMenu({
        ctx,
        glyphs,
        bg: menuBg,
        worldScale: WORLD_SCALE,
        items: entryPoints.map((e) => ({ id: e.id, label: e.label })),
        locale: project.locale,
        menuAssets,
        saveStore,
      })
      if (decision.kind === 'load') bootLoadSlot = decision.slotId
      else bootEntry = entryPoints.find((e) => e.id === decision.entryId) ?? bootEntry
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
  const leaderId = bootStartWorld.party[0]
  const leaderActor = leaderId ? project.actorsById[leaderId] : undefined
  if (!leaderActor) throw new Error(`reforge: 队长 "${leaderId ?? '(空)'}" 不在 actors 表`)
  const leaderSpriteDef = requireSpriteDef(leaderActor.spriteId, `队长 ${leaderActor.id}`)
  // E7 跟随者精灵(party[1..N]):boot 期从模板解析,与队长同源。缺 actor/精灵 → null(渲染跳过)。
  const followerSpriteDefs = bootStartWorld.party.slice(1).map((id) => {
    const a = project.actorsById[id]
    return a ? requireSpriteDef(a.spriteId, `队员 ${a.id}`) : null
  })
  // C7:队伍精灵号单一真值集(切场景 LRU needed 并集;setParty 动态增补,防新队员被淘汰)
  const partySpriteNums = new Set<number>([
    leaderSpriteDef.spriteNum,
    ...followerSpriteDefs.flatMap((d) => (d ? [d.spriteNum] : [])),
  ])

  // world 须先于 switchScene 定义(switchScene 首调在 boot 时读 world.script.mapOverride;
  // 0x99 底图覆写持久层。放此前 = 避免 TDZ)。
  let world = buildWorld(bootStartWorld, project.actorsById)
  const ditherTransition = new DitherTransitionController<ImageData>()
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
    const targetSceneId = ditherTransition.pendingTargetSceneId
    return targetSceneId
      ? {
          active: false,
          pending: true,
          pr: 0,
          step: -1,
          hasTarget: false,
          targetSceneId,
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
  const syncDitherDebugDataset = (): void => {
    if (!import.meta.env.DEV) return
    canvas.dataset.rfScene = scene.id
    canvas.dataset.rfDither = JSON.stringify(ditherDebugState())
    canvas.dataset.rfRender = JSON.stringify({
      fadeBlack,
      position: player.pos,
      facing,
      scriptRunning: !!runner,
      dialogActive: dialogBox.active,
    })
  }
  const markSceneLoad = (from: string, to: string, step: string): void => {
    if (import.meta.env.DEV) canvas.dataset.rfSceneLoad = JSON.stringify({ from, to, step })
  }
  // dev ?party:强制的队员拉满 HP/MP,确保 healthy(否则如赵灵儿初始 28/240 = 濒死,合击项灰)
  if (partyParam) for (const c of world.party) { c.hp = c.maxHP; c.mp = c.maxMP }
  // DEV 调试口(__rfBattle 同款):验收/自动化直读世界态(party HP/MP、money、learnedSkills)
  if (import.meta.env.DEV) {
    Object.defineProperty(window, '__rfWorld', { get: () => world, configurable: true })
    Object.defineProperty(window, '__rfScene', { get: () => scene, configurable: true })
    Object.defineProperty(window, '__rfDither', {
      get: ditherDebugState,
      configurable: true,
    })
  }
  world.script ??= emptyWorldScriptState()

  /**
   * 切场景(M2c):取场景定义 → 换图/调色板 → 重建渲染器(烤图缓存随 palette 走)→
   * 补载缺失精灵(spriteByNum 跨场景累积)→ 落位(spawn.pos > 命名入口 > 场景缺省)→ 相机重夹。
   * 全部资产就绪后才原子提交,避免半态渲染。boot 也走此函数(单一代码路)。
   */
  async function switchScene(
    sceneId: string,
    spawn?: { entry?: string; pos?: GridPos; facing?: Facing; inheritFacing?: Facing },
  ): Promise<void> {
    const def = await getSceneDef(sceneId)
    // 0x99 底图覆写:原版图按 override mapNum 换底(麒麟洞岩浆;自有地图不受 override)
    const ovMap = world.script?.mapOverride?.[sceneId]
    const mapRef =
      ovMap !== undefined && isReuseMap(def.map)
        ? { ...def.map, reuseOriginalMap: ovMap }
        : def.map
    const assets = await getMapAssets(mapRef) // 复用原版 ⊕ 自有地图,分流内建于 loadSceneMap
    const pal = await getPalette(Number(params.get('pal') ?? 0)) // 只留盘 0(W7a-3);?pal= 仅 dev 调试兜底
    const defs = new Map<string, SpriteDef>()
    for (const e of def.entities) {
      // 隐藏实体也登记(M3a:脚本 setEntityState 可显形);zone 无视觉跳过
      const sid = resolveEntitySpriteId(e, project.actorsById)
      if (!sid) continue
      defs.set(e.id, requireSpriteDef(sid, `实体 ${e.id}`))
    }
    const needed = new Set([
      ...partySpriteNums, // E7/C7 队伍精灵(含 setParty 中途入队者)一并加载/保护
      ...[...defs.values()].map((d) => d.spriteNum),
    ])
    // A4 自有上传精灵按 def.path 加载(num→path;同号多 def 时任取 —— path 只有上传条目有)
    const pathByNum = new Map<number, string>()
    for (const d of Object.values(project.spritesById)) if (d.path) pathByNum.set(d.spriteNum, d.path)
    const missing = [...needed].filter((n) => !spriteByNum.has(n))
    await Promise.all(
      missing.map(async (n) => {
        spriteByNum.set(n, await loadSprite(project.assetBase, n, pathByNum.get(n)))
      }),
    )
    // 精灵 LRU(GLM x-shell G8.2:曾无界累积):recency touch 本场景所需 → 超 cap 淘汰
    // 非本场景精灵(protect needed,宁超 cap;唯一活查询是实体渲染,needed 全覆盖——
    // playerSprite/leaderSpriteOverride 均自持引用,淘汰只删表项不影响已捕获者)。
    for (const n of needed) {
      const s = spriteByNum.get(n)
      if (s) {
        spriteByNum.delete(n)
        spriteByNum.set(n, s) // Map 插入序 = LRU 序
      }
    }
    if (spriteByNum.size > SPRITE_CACHE_CAP) {
      for (const k of [...spriteByNum.keys()]) {
        if (spriteByNum.size <= SPRITE_CACHE_CAP) break
        if (!needed.has(k)) spriteByNum.delete(k)
      }
    }
    // 原子提交
    scene = def
    map = assets.map
    tiles = assets.tiles
    ownTileHeights = isOwnMap(assets.map)
      ? tileHeightsOf(project.tilesets, assets.map.tileset)
      : undefined
    palette = pal
    renderer = new Canvas2DRenderer(ctx, palette, tiles)
    entitySpriteDefs = defs
    room = mapRoom(def.map) ?? { col: 0, row: 0, cols: map.width, rows: map.height }
    viewMinX = room.col * TILE_W - TILE_W
    viewMinY = room.row * TILE_H - 40
    viewMaxX = (room.col + room.cols) * TILE_W + TILE_W
    viewMaxY = (room.row + room.rows) * TILE_H + 16
    const entryDef = spawn?.entry ? def.entries?.[spawn.entry] : undefined
    player.pos = { ...(spawn?.pos ?? entryDef?.pos ?? def.entry.pos) }
    facing = resolveSceneFacing(
      spawn?.facing,
      spawn?.inheritFacing,
      entryDef?.facing ?? def.entry.facing,
    )
    walking = false
    stepFrame = 0
    // trail 清零:全队聚拢队长(原版 rgTrail 全 = 队首坐标)
    trail = [{ pos: { ...player.pos }, dir: facing }]
    followerFrozen.length = 0
    followerAuth.clear() // 跨场景回 follow(骑乘/站位权威是演出期瞬时态,不跨场景)
    worldMoveAcc = 0 // 世界拍相位随场景重置
    updateCamera()
    // W5 场景 BGM 槽:缺省 = 延续上一曲(忠实原版);0 = 停曲。同曲不重启由播放器保证。
    if (def.musicId != null) bgm.play(def.musicId)
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
      ? { col: posParam[0]!, row: posParam[1]!, height: 0 }
      : undefined
  const facingParam = params.get('facing')
  await switchScene(initialSceneId, {
    ...(spawnPos ? { pos: spawnPos } : {}),
    ...(facingParam === 'up' ||
    facingParam === 'down' ||
    facingParam === 'left' ||
    facingParam === 'right'
      ? { facing: facingParam }
      : {}),
  })
  const playerSprite = spriteByNum.get(leaderSpriteDef.spriteNum)!
  const dialogBox = new DialogBox(
    ctx,
    glyphs,
    cursorFrames,
    portraits,
    project.locale,
    menuAssets.scroll,
  )

  // ══ M3a 脚本运行时(设计 §4:driver Promise + AbortSignal;tick 驱动计时/淡入淡出)══
  let runner: ScriptRunner | null = null
  /** X1 自动存档:本次演出链切过场景 → 整链(含排队 onEnter)收尾后静默写 auto 槽。 */
  let sceneChangedByScript = false
  let scriptAbort: AbortController | null = null
  let pendingOnEnter: string | null = null // loadScene 后待跑的新场景 onEnter(当前脚本收尾后)
  let nowMs = 0 // tick 注入的时间源(driver 计时用)
  const timers: { deadline: number; resolve: () => void }[] = []
  let fadeFx: { dir: 'in' | 'out'; start: number; ms: number; resolve: () => void } | null = null
  let fadeBlack = 0 // 0 透明 → 1 全黑(fade out 后保持,fade in 释放)
  let fadeCurtain: 'black' | 'red' = 'black' // 幕布色(gameOver 渐红;fade-in 结束回黑)
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
      ambienceShown = lerpTint(ambienceFx.from, resolveAmbienceTint(world.ambience, project.ambiences), t)
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
  const entityFrameOverride = new Map<string, number>() // setEntityFrame 演出帧覆盖(切场景清)
  // ── 0x15/0x65 队长演出态(原版 rgParty[].wFrame / rgwSpriteNum;脚本自清,走路时引擎清)──
  let partyGesture: number | null = null // 脚本姿势帧(渲染 = dir*framesPerDir + gesture)
  let leaderSpriteOverride: { def: SpriteDef; frames: typeof playerSprite } | null = null // 0x65 换装
  let activeBattle: BattleSession | null = null // M4b:进行中的战斗(主循环转发 tick/render)
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
  const entityMoves = new Map<string, { to: GridPos; speed: WalkSpeed; resolve: () => void }>()
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
  ): Promise<void> {
    fadeCurtain = color
    return new Promise((resolve) => {
      fadeFx = { dir, start: nowMs, ms, resolve }
    })
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

  const host: ScriptHost = {
    dialog: (line: DialogueLine) =>
      new Promise((resolve) => {
        preserveClosedDialogFrame = false
        dialogBox.open(startDialogue({ id: '__script', lines: [line] }), nowMs)
        scriptDialogResolve = resolve // tick 检测 dialogBox 关闭时兑现
      }),
    clearDialog: () => {
      preserveClosedDialogFrame = false
      dialogBox.close()
    },
    fade: (dir, ms, color) => hostFade(dir, ms, color),
    // ── B8 野外遇敌 ──
    chaseStep: async (entityId, range, speed, floating) => {
      const e = scene.entities.find((x) => x.id === entityId)
      if (!e || e.hidden) {
        await host.wait(200)
        return
      }
      const dc = player.pos.col - e.pos.col
      const dr = player.pos.row - e.pos.row
      const dist = Math.max(Math.abs(dc), Math.abs(dr))
      if (dist > range) {
        await host.wait(240) // 出程:待机
        return
      }
      if (dist <= 1) {
        fireTrigger(e) // 撞上玩家 → touch 触发(通常 = 开战);演出/对话中 startScript 防重入自然挡
        await host.wait(320)
        return
      }
      // 逐步逼近:长轴优先一格;floating 无视碰撞(原版 0x4C op2)
      const stepCol = Math.abs(dc) >= Math.abs(dr) ? Math.sign(dc) : 0
      const stepRow = stepCol === 0 ? Math.sign(dr) : 0
      const next = { col: e.pos.col + stepCol, row: e.pos.row + stepRow, height: e.pos.height }
      if (floating || !isBlockedAt(map, next)) {
        e.pos = next
        e.facing = stepCol !== 0 ? (dc > 0 ? 'right' : 'left') : dr > 0 ? 'down' : 'up'
        entityAnim.set(e.id, (entityAnim.get(e.id) ?? 0) + 1) // 走帧
      }
      await host.wait(Math.max(80, 480 / Math.max(1, speed))) // speed 4≈120ms/步,8≈80ms
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
    loadLastSave: async () => {
      const metas = await saveStore.listMeta()
      const latest = [...metas].sort((a, b) => b.savedAt - a.savedAt)[0]
      if (!latest || !(await doLoad(latest.slotId))) location.reload() // 无档:重开
    },
    gameOver: async () => {
      // 原版 GameOver 枢纽(L_41075)一等化:渐红 + 经典文案 + 读最近档
      await hostFade('out', 900, 'red')
      await host.dialog({ slot: 'narration', text: 'gameover.1' })
      await host.dialog({ slot: 'narration', text: 'gameover.2' })
      await host.loadLastSave()
    },
    wait: (ms) =>
      new Promise((resolve) => {
        timers.push({ deadline: nowMs + ms, resolve })
      }),
    teleportParty: (pos, fc) => {
      player.pos = { ...pos }
      if (fc) facing = fc
      walking = false
      updateCamera()
    },
    loadScene: async (sceneId, pos, fc) => {
      // 只消费“紧随自动对话收尾”的旧帧；其他 loadScene 继续现场快照。
      const closedDialogFrame = preserveClosedDialogFrame
        ? ctx.getImageData(0, 0, canvas.width, canvas.height)
        : null
      preserveClosedDialogFrame = false
      const fromSceneId = scene.id
      markSceneLoad(fromSceneId, sceneId, 'preflight')
      ditherTransition.cancel()
      const targetDef = await getSceneDef(sceneId)
      const targetStages = targetDef.onEnter
      const targetStage = targetStages?.[
        stageIndexFor(world.script!, `s:${sceneId}`, targetStages)
      ]
      const handoffToDither = hasEarlyDitherScreen(targetStage)
      markSceneLoad(fromSceneId, sceneId, handoffToDither ? 'handoff' : 'fade-out')
      if (handoffToDither) {
        // M2:先关对话状态、但不强制重画；canvas 仍是旧场景最后已呈现帧。
        dialogBox.close()
        ditherZeroFrameMatchesBackup = null
        ditherZeroFrameDiffersFromTarget = null
        ditherTransition.arm(
          sceneId,
          closedDialogFrame ?? ctx.getImageData(0, 0, canvas.width, canvas.height),
        )
      } else {
        await hostFade('out', 260)
      }
      markSceneLoad(fromSceneId, sceneId, 'switch')
      stopAutoRunners()
      try {
        await switchScene(sceneId, { pos, facing: fc, inheritFacing: facing })
      } catch (error) {
        ditherTransition.cancel()
        markSceneLoad(fromSceneId, sceneId, 'error')
        throw error
      }
      markSceneLoad(fromSceneId, sceneId, 'committed')
      applyWorldToScene()
      entityFrameOverride.clear()
      pendingOnEnter = sceneId // 新场景 onEnter 排队(当前脚本收尾后跑,不嵌套)
      sceneChangedByScript = true // X1:演出链全部收尾后写 auto 档
      startAutoRunners()
      if (!handoffToDither) {
        markSceneLoad(fromSceneId, sceneId, 'fade-in')
        await hostFade('in', 260)
      }
      markSceneLoad(fromSceneId, sceneId, 'done')
    },
    ditherScreen: (ms) => {
      // 独立 0x73 与交接路径都先关闭 dialog 状态；只有无匹配 handoff 时 snapshot 才会执行。
      dialogBox.close()
      ditherZeroFrameMatchesBackup = null
      ditherZeroFrameDiffersFromTarget = null
      return ditherTransition.begin(
        scene.id,
        () => ctx.getImageData(0, 0, canvas.width, canvas.height),
        ms,
      )
    },
    setPartyFacing: (fc, gesture, member) => {
      // 原版 0x15:wPartyDirection=o[0] + rgParty[o[2]].wFrame=dir*3+o[1] —— 每次都写帧;
      // gesture 缺省(=0 站立帧)即清脚本姿势。member>0 = 跟随者(渲染落地后生效,先忽略)。
      facing = fc
      if (!member) partyGesture = gesture ?? null
    },
    setActorSprite: async (actorId, spriteId) => {
      // 原版 0x65:rgwSpriteNum[role]=sprite,持续到下次显式切换(开场练武/疯跑后脚本自切回)。
      // 现阶段队伍渲染只有队长;非队长角色的换装先记报告(跟随者渲染落地后接)。
      if (actorId !== leaderActor.id) {
        host.report(`setActorSprite: 非队长 ${actorId} 暂不渲染`)
        return
      }
      const def = requireSpriteDef(spriteId, `0x65 换装 ${actorId}`)
      const frames =
        spriteByNum.get(def.spriteNum) ?? (await loadSprite(project.assetBase, def.spriteNum, def.path))
      spriteByNum.set(def.spriteNum, frames)
      // 切回本体精灵 = 撤销覆盖(严格等价:override 恒生效,但本体时置 null 让存档/调试态干净)
      leaderSpriteOverride = def.spriteNum === leaderSpriteDef.spriteNum ? null : { def, frames }
    },
    // 0x1A:持久改角色形象(成年灵儿),写 CharacterInstance.appearance 随存档。按 template 匹配队员;
    // 大世界精灵覆写要预载新精灵帧(队长/跟随者渲染每帧读 appearance.spriteId)。
    setActorAppearance: async (actorTemplate, patch) => {
      const c = world.party.find((m) => m.template === actorTemplate)
      if (!c) {
        host.report(`setActorAppearance: ${actorTemplate} 不在队伍`)
        return
      }
      c.appearance = { ...c.appearance, ...patch }
      if (patch.spriteId) {
        const def = requireSpriteDef(patch.spriteId, `0x1A 换形象 ${actorTemplate}`)
        if (!spriteByNum.has(def.spriteNum))
          spriteByNum.set(def.spriteNum, await loadSprite(project.assetBase, def.spriteNum, def.path))
      }
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
        ;(world.script.entityPos ??= {})[id] = { col: pos.col, row: pos.row, height }
      }
      applyWorldToScene()
    },
    // 0x12 相对队伍摆位:绝对格 = 队伍当前格 + (dcol,drow);持久/活体同 setEntityPos
    setEntityPosRelParty: (id, dcol, drow) => {
      if (world.script) {
        const e = scene.entities.find((x) => x.id === id)
        const height = e?.pos.height ?? 0
        ;(world.script.entityPos ??= {})[id] = {
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
    giveItem: (itemId, count) => {
      const entry = world.inventory.find((x) => x.itemId === itemId)
      if (entry) entry.count += count
      else world.inventory.push({ itemId, count })
    },
    loseItem: (itemId, count) => {
      const entry = world.inventory.find((x) => x.itemId === itemId)
      if (!entry) return
      entry.count -= count
      if (entry.count <= 0) world.inventory.splice(world.inventory.indexOf(entry), 1)
    },
    giveMoney: (delta) => {
      world.money = Math.max(0, world.money + delta)
    },
    playSound: () => {}, // 音频系统未落地(音频期);静默
    playMusic: (id) => {
      world.script!.vars['sys:music'] = id // 记账(存档恢复用)
      bgm.play(id) // 0 = 停曲(原版语义)
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
    // 0x1D 全队增血蓝(客栈/温泉 9999 全满):HP/MP 同加 amount(sdlpal op1 双用),仅活人,clamp
    increaseHpMp: (amount) => {
      for (const c of world.party) {
        if (c.hp <= 0) continue
        c.hp = Math.max(0, Math.min(c.maxHP, c.hp + amount))
        c.mp = Math.max(0, Math.min(c.maxMP, c.mp + amount))
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
      const list = (world.learnedSkills[inst?.id ?? tid] ??= [])
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
    // C7 队伍变更(D22 reserve):搬实例不丢状态;新队员精灵懒加载 + 计入 LRU 保护
    setParty: (members) => {
      applySetParty(world, members, project.actorsById)
      for (const c of world.party) {
        const a = project.actorsById[c.template]
        const def = a ? project.spritesById[a.spriteId] : undefined
        if (!def) continue
        partySpriteNums.add(def.spriteNum)
        if (!spriteByNum.has(def.spriteNum)) {
          void loadSprite(project.assetBase, def.spriteNum, def.path).then((sp) => {
            spriteByNum.set(def.spriteNum, sp)
          })
        }
      }
    },
    ride: async (entityId, to, speed) => {
      // 骑行 = 确保全员挂载 + 驱动载具走位(party 每 tick 派生跟随,相机随 render 帧更新)
      const a = authority.get('party')
      if (!(a?.kind === 'mount' && a.parent === entityId)) host.mountParty(entityId, 0, 0)
      takeByScript(entityId) // 载具本身按位移指令语义接管(其 auto 暂停)
      await host.moveEntity(entityId, to, speed)
    },
    moveEntity: (id, to, speed) =>
      new Promise((resolve) => {
        const e = scene.entities.find((x) => x.id === id)
        if (!e) {
          host.report(`moveEntity: 实体 ${id} 不在场`)
          resolve()
          return
        }
        // 步进只发生在世界拍上(首步至多等 100ms;曾因预充累加器致短距走位瞬移,2026-07-03)
        entityMoves.get(id)?.resolve() // E6a 顺手修:同实体新走位覆盖旧 entry 时兑现旧 Promise(防悬挂卡死调用方)
        entityMoves.set(id, { to, speed, resolve })
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
    moveParty: (to, speed) =>
      new Promise((resolve) => {
        dismountParty() // 走位即下筏(原版 ride 是 op-scoped,挂载不跨走位;零持久态)
        partyMove = { to, speed, resolve } // 世界拍推进(advanceMoves)
      }),
    nudgeParty: (dx, dy) => {
      const d = pixelDeltaToGridDelta(dx, dy) // 同 nudgeEntity:增量制保碎步小数
      player.pos = { ...player.pos, col: player.pos.col + d.dcol, row: player.pos.row + d.drow }
      partyGesture = null // 原版走位重算 wFrame
      stepFrame = (stepFrame + 1) % 4 // 原版 0x6E 带走姿推进
      updateCamera()
    },
    cameraPan: (dx, dy, frames) =>
      new Promise((resolve) => {
        // 每帧位移 (dx,dy),共 frames 帧,累积进 cameraOffset(不回正;走位期保留)
        cameraPanFx = {
          fromX: cameraOffset.x,
          fromY: cameraOffset.y,
          dx,
          dy,
          steps: frames,
          done: 0,
          resolve,
        }
      }),
    cameraSnap: (to) => {
      if (to) {
        // 绝对:相机跳到目标格居中,换算成相对玩家的偏移量持有(玩家世界坐标不变)
        const tp = gridToPixel(to)
        const pp = gridToPixel(player.pos)
        cameraOffset.x = tp.x - pp.x
        cameraOffset.y = tp.y - pp.y
      } else {
        cameraOffset.x = 0 // 回正:跟随玩家
        cameraOffset.y = 0
      }
      updateCamera()
    },
    setEntityAuto: (id, binding) => {
      const e = scene.entities.find((x) => x.id === id)
      if (!e) return
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
    startBattle: async (team, battleOpts) => {
      const teamDef = project.enemyTeamsById[`team-${team}`]
      const enemyDefs = (teamDef?.members ?? [])
        .map((id) => project.enemiesById[id])
        .filter((e): e is NonNullable<typeof e> => !!e)
      if (enemyDefs.length === 0) {
        showToast(`遇敌 #${team} —— 敌队缺数据,桩胜(M4c)`)
        await host.wait(400)
        return 'win'
      }
      // 战斗配置解析(无任何持久态):显式参数(剧情战 startBattle.fieldId/musicId、明雷
      // hostile.battleFieldId)→ 场景默认(SceneDef.battleFieldId/battleMusicId)→ 项目默认。
      // 原版 0x4A/0x45 持久全局已退役:特殊战场/曲一次性绑 startBattle,打完自然回落场景默认,
      // 不再有「剧情点覆写 + 随存档」这一档(那全是老全局年代手动清临时战场的产物)。
      // 战斗乐:0 = 停曲(忠实原版);项目默认 37 = 原版新档 wNumBattleMusic@2.RPG:0x10
      // (⚠ 不是 3——3 是普通胜利曲,battle.c:1032)
      const battleTrack = battleOpts?.musicId ?? scene.battleMusicId ?? 37
      bgm.play(battleTrack)
      let playedVictory = false
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
                cooperativeMagicSkillId:
                  project.actorsById[c.template]!.battler!.cooperativeMagicSkillId,
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
          // 大世界带入的毒(自毒食/装备咒;战斗内副本,战后三件套清)
          ...(c.poisons?.length ? { poisons: c.poisons.map((x) => ({ ...x })) } : {}),
          // 大世界护体符/金刚符定时状态(护体等;建态注入 status,战后三件套 ClearAllStatus 清)
          ...(c.extraStatuses?.length ? { carriedStatuses: c.extraStatuses.map((x) => ({ ...x })) } : {}),
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
        }
      })
      // 资产:战场背景(sys:battleField 记账 → 当前场景 palette 着色)+ 敌我战斗精灵 + 队员小头像
      // B5 召唤:扫队伍已学技能的 summon godId,预载神将精灵(F.MKF player 通道 chunk godId+10)
      const summonGodIds = new Set<number>()
      for (const c of world.party)
        for (const sid of world.learnedSkills[c.id] ?? []) {
          for (const eff of project.skills[sid]?.effects ?? [])
            if (eff.kind === 'summon') summonGodIds.add(eff.godId)
        }
      const fieldId = battleOpts?.fieldId ?? scene.battleFieldId ?? 24
      // 战场常驻波(battle.c:1559 进战斗设 field.screenWave;#18/22/32/35/50 水下/幻境)
      // + 五灵加成(lprgBattleField.rgsMagicEffect,fight.c:244 双向乘入法术伤害)。
      // 数据源:工程 content 战场表(D24 一等域,编辑器管) > assetBase 遗留回退(未收编工程)。
      const fields = await (battleFieldsPromise ??= project.battleFields.length
        ? Promise.resolve(
            new Map(
              project.battleFields.map((f) => [
                Number(f.id),
                {
                  screenWave: f.screenWave ?? 0,
                  ...(f.magicEffect ? { magicEffect: f.magicEffect } : {}),
                  ...(f.bg ? { bg: f.bg } : {}),
                },
              ]),
            ),
          )
        : loadBattleFields(project.assetBase).catch(() => new Map<number, BattleFieldEntry>()))
      const fieldDef = fields.get(Number(fieldId))
      const fieldWave = fieldDef?.screenWave ?? 0
      const [bgFull, summonSprites, enemySprites, playerSprites, faceList, battleIcons, effectSprite, effectIndex] =
        await Promise.all([
          loadBattleBgFull(project.assetBase, Number(fieldId), palette, fieldDef?.bg).catch(
            () => undefined,
          ),
          Promise.all(
            [...summonGodIds].map(async (g) =>
              [g, await loadBattleSprite(project.assetBase, 'player', g + 10).catch(() => undefined)] as const,
            ),
          ).then((entries) =>
            Object.fromEntries(entries.filter((e): e is [number, LoadedSprite] => !!e[1])),
          ),
          Promise.all(
            enemyDefs.map((e) =>
              loadBattleSprite(project.assetBase, 'enemy', e.spriteNum, e.spritePath).catch(() => undefined),
            ),
          ),
          Promise.all(
            world.party.map((c) =>
              loadBattleSprite(
                project.assetBase,
                'player',
                // 0x1A 战斗精灵覆写优先(成年灵儿 appearance.battleSprite);缺 = 模板
                c.appearance?.battleSprite ??
                  project.actorsById[c.template]?.battler?.battleSpriteNum ??
                  0,
                // 覆写走原版号 → 无自有 path(loadBattleSprite 回落原版 F.MKF 提取图)
                c.appearance?.battleSprite !== undefined
                  ? undefined
                  : project.actorsById[c.template]?.battler?.battleSpritePath,
              ).catch(() => undefined),
            ),
          ),
          Promise.all(
            world.party.map((c) => loadPng(`${project.assetBase.faces}/${c.template}.png`)),
          ),
          Promise.all(
            ['attack', 'magic', 'coop', 'misc'].map((n) => loadPng(`/ui/battle/icon-${n}.png`)),
          ),
          loadEffectOnce(),
          loadEffectIndexOnce(),
        ])
      // 各队员命中/施法前摇特效帧基(fight.c:2055 攻击 [1]*3;2387 施法 [0]*10+15;表缺 → −1)
      const playerEffectBase = world.party.map((c) => {
        const sn =
          c.appearance?.battleSprite ?? project.actorsById[c.template]?.battler?.battleSpriteNum ?? 0
        const v = effectIndex?.[sn * 2 + 1]
        return v === undefined ? -1 : v * 3
      })
      const playerCastBase = world.party.map((c) => {
        const sn =
          c.appearance?.battleSprite ?? project.actorsById[c.template]?.battler?.battleSpriteNum ?? 0
        const v = effectIndex?.[sn * 2]
        return v === undefined ? -1 : v * 10 + 15
      })
      // 本场可能施放的法术 → 预载 fire 特效精灵(玩家已学 + 敌 AI cast 规则;M4d-2b)
      const fireChunks = new Set<number>()
      for (const c of world.party) {
        for (const sid of world.learnedSkills[c.id] ?? []) {
          const sp = project.skills[sid]?.animation.effectSprite
          if (sp !== undefined && sp >= 0) fireChunks.add(sp)
        }
        // 合体技 fire 特效:coop 走 cooperativeMagicSkillId(不在 learnedSkills),漏载 → 合击无技能动画
        const coopId = project.actorsById[c.template]?.battler?.cooperativeMagicSkillId
        const coopSp = coopId ? project.skills[coopId]?.animation.effectSprite : undefined
        if (coopSp !== undefined && coopSp >= 0) fireChunks.add(coopSp)
      }
      for (const e of enemyDefs) {
        for (const r of e.ai.rules ?? []) {
          if (r.do.kind === 'cast') {
            const sp = project.skills[r.do.skillId]?.animation.effectSprite
            if (sp !== undefined && sp >= 0) fireChunks.add(sp)
          }
        }
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
      const faces: Record<string, ImageBitmap | undefined> = {}
      world.party.forEach((c, i) => {
        faces[c.id] = faceList[i]
      })
      const session = new BattleSession(
        players,
        enemyDefs,
        {
          bg: bgFull?.canvas,
          // 召唤背景染色的索引源(调色板级 nibble 重烤,battle.c:62-80)
          bgIndexed: bgFull
            ? { indices: bgFull.indices, w: bgFull.w, h: bgFull.h }
            : undefined,
          palette,
          glyphs,
          enemySprites,
          playerSprites,
          ui: menuAssets,
          faces,
          battleIcons,
          sfx,
          effectSprite,
          fireSprites,
          summonSprites,
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
          playerEffectBase,
          playerCastBase,
          fieldWave,
          fieldEffect: fieldDef?.magicEffect,
          poisonDefs: project.poisonsById,
          money: world.money, // 乾坤一掷/铜钱镖消耗基数(战内 delta 战后统一入账)
          // 战斗演出来源(二阶段 clean):遭遇专属(startBattle.choreography,boss 战剧情台词)优先;
          // 缺省回落敌种 def.choreography(随机遇敌固有台词 —— 无 scene 遭遇挂点的敌种)。
          // boss/杂兵混的敌种(胖苗)对话迁到 boss startBattle 且从 def 删,故杂兵场回落为空 = 不串戏。
          encounterChoreo:
            battleOpts?.choreography ?? enemyDefs.flatMap((e) => e.choreography ?? []),
          // 战斗音效七件套(BattlerSpec.sounds;出招/挥击/吟唱已接,其余随对应演出落地)
          playerSounds: world.party.map((c) => project.actorsById[c.template]?.battler?.sounds),
          // 变身换形/异种召唤的中场精灵重载(原版 PAL_LoadBattleSprites)
          loadEnemySprite: (def) =>
            loadBattleSprite(project.assetBase, 'enemy', def.spriteNum, def.spritePath).catch(
              () => undefined,
            ),
          // B7b/B7c 胜利结算(会话 over 阶段调一次):HP 写回 + 入账 + 升级 + 隐藏经验 =
          //   单次授予点,返回结算屏序列(经验金钱→升级→隐藏提升→练成)。原版 Phase A/B/E/D/F。
          buildSettlement: () => {
            sessionRef.writeBackHp(world.party) // 先写回战斗末 HP(原版 exp 前)
            const r = sessionRef.rewards()
            if (r.exp > 0) {
              // 胜利曲:首领战 2 / 普通 3,不循环(battle.c:1032)
              bgm.play(battleOpts?.boss ? 2 : 3, false)
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
      // DEV 调试口(一阶段 __tpgs 先例):验收/自动化直读战斗态(phase/ui/log)
      if (import.meta.env.DEV) (window as { __rfBattle?: unknown }).__rfBattle = session
      const result = await session.done
      if (import.meta.env.DEV) (window as { __rfBattle?: unknown }).__rfBattle = null
      activeBattle = null
      // 胜利结算路径已在 buildSettlement 里写回 HP + 入账;其余路径(败/逃/敌逃)此处写回 HP。
      if (result !== 'win' || session.enemyFled()) session.writeBackHp(world.party)
      session.writeBackInventory(world.inventory)
      // 偷窃/金钱技消耗/收妖所得:**无条件**入账(原版 dwCash 即时加减 —— 逃跑也保留;
      // 偷到的物品随 writeBackInventory 一并回世界)
      if (session.moneyDelta() !== 0)
        world.money = Math.max(0, world.money + session.moneyDelta())
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
      // Phase E 战后脚本(battle.c:1334-1337):胜利后逐敌槽跑 scriptOnBattleEnd(→ onDefeated,
      // 掉落对话/剧情旗标);返回值不回写(原版同)。触发战斗的脚本 runner 正悬挂在 startBattle
      // 上占着全局 runner 槽 → 独立 runner 内联跑(外层在等本函数返回,无并行);共享 scriptAbort
      // (dev 强停/读档连带中止)。敌整场逃离(0x69)不跑(无奖励语义,同 rewards)。
      if (result === 'win' && !session.enemyFled() && world.script) {
        for (const def of session.enemySlotDefs()) {
          if (!def.onDefeated?.length) continue
          const r = new ScriptRunner(
            scriptHost,
            world.script,
            (scriptAbort ?? new AbortController()).signal,
            Math.random,
            project.scriptStore,
          )
          await r
            .runStages(`battle-end:${def.id}`, [{ body: def.onDefeated }])
            .catch((err: unknown) => {
              if (!(err instanceof DOMException && err.name === 'AbortError'))
                console.error('[script] onDefeated', def.id, err)
            })
        }
      }
      // 战斗内切过曲(战斗 BGM/胜利小调)→ 回场景曲;lose 进 gameOver 流程不回。
      if (result !== 'lose' && (typeof battleTrack === 'number' || playedVictory)) {
        const m = world.script?.vars['sys:music']
        bgm.play(typeof m === 'number' ? m : (scene.musicId ?? 0))
      }
      return result
    },
    openShop: (shopId, mode) => {
      // 买 = 店铺货单;卖 = 背包可卖。店不存在 → 报错即回(脚本继续,不卡死)。
      const list =
        mode === 'buy'
          ? (project.shops.find((x) => x.id === shopId)?.items ?? null)
          : sellableItems(world, project.items)
      if (list === null) {
        host.report(`openShop: 店 #${shopId} 不在 shops 表`)
        return Promise.resolve()
      }
      return new Promise<void>((resolve) => {
        shop = { ui: openShopUi(mode, [...list]), resolve }
      })
    },
    // 传送出口(0x38 引路蜂/土灵珠):当前场景有 onTeleport → 内联跑(loadScene 回洞口/城镇),
    // 返回 true;无此槽 → false(调用方走 onFail「引路蜂不灵」)。runner 槽被道具脚本占着 →
    // detached 内联跑(同 Phase E)。0x6D op2 运行时装的出口(赤鬼王血池 s059 打完才装)存
    // world.onTeleport 覆写,优先于静态 scene.onTeleport —— 否则血池封闭无出口=死锁卡关。
    teleportOut: async () => {
      const stages = world.script?.onTeleport?.[scene.id] ?? scene.onTeleport
      if (!stages || (Array.isArray(stages) && stages.length === 0)) return false
      if (world.script) {
        const r = new ScriptRunner(
          scriptHost,
          world.script,
          (scriptAbort ?? new AbortController()).signal,
          Math.random,
          project.scriptStore,
        )
        const runnable = Array.isArray(stages)
          ? stages
          : [{ body: [{ kind: 'callScript' as const, ref: stages }] }]
        await r.runStages(`teleport:${scene.id}`, runnable).catch((err: unknown) => {
          if (!(err instanceof DOMException && err.name === 'AbortError'))
            console.error('[script] teleportOut', scene.id, err)
        })
      }
      return true
    },
    // 过场编排:播 mp4(videos/{id}.mp4;reforge dev/preview 中间件把 /extracted/* 映射到 data/extracted)。
    // 演出期 runner 活跃 → 游戏循环吞输入,视频 overlay 盖住画布;加载失败 video-player 内部静默 resolve。
    playVideo: (videoId) => playVideoOverlay({ src: `/extracted/videos/${videoId}.mp4` }),
    // 过场编排:播 RNG 序列图(speed=iSpeed 帧率)。正确调色盘引擎内 RNG_PALETTE 定死(不暴露);
    // 全屏 canvas overlay,加载失败静默。
    playRng: async (chunkIdx, opts) => {
      const palette = await getPalette(rngPaletteId(chunkIdx)).catch(() => undefined)
      if (!palette) return
      await playRngOverlay({
        chunkIdx,
        palette,
        frameDelayMs: opts?.speed ? Math.round(1000 / opts.speed) : 40,
        startFrame: opts?.startFrame,
        endFrame: opts?.endFrame,
      })
    },
    confirm: async () => {
      host.report('confirm 是/否框未实现(暂按"是")')
      return true
    },
    query: {
      hasItem: (itemId, atLeast) =>
        (world.inventory.find((x) => x.itemId === itemId)?.count ?? 0) >= atLeast,
      money: () => world.money,
      inParty: (actorId) => world.party.some((c) => c.id === actorId || c.template === actorId),
      allFullHp: () => world.party.every((c) => c.hp >= c.maxHP),
      itemEquipped: (itemId, atLeast) =>
        world.party.reduce(
          (n, c) => n + Object.values(c.equipment).filter((v) => v === itemId).length,
          0,
        ) >= atLeast,
      entityInScene: (id) => scene.entities.some((x) => x.id === id),
      sceneId: () => scene.id,
    },
    // 0x99 当前场景即时换底图:只换 map 资产(map/tiles/renderer),不动实体/坐标/room
    reloadMap: async (mapNum) => {
      const assets = await getMapAssets({ reuseOriginalMap: mapNum })
      map = assets.map
      tiles = assets.tiles
      renderer = new Canvas2DRenderer(ctx, palette, tiles)
    },
    // 0xA0 游戏通关退出 → 回标题屏(复用系统菜单 quit 的 ?menu 干净重启;未存进度弃)
    quitToTitle: () => {
      location.href = `${location.pathname}?menu`
    },
    report: (msg) => {
      if (!import.meta.env.DEV) return
      if (reportedOnce.has(msg)) return // auto 循环会反复撞同一缺口,去重防刷屏
      reportedOnce.add(msg)
      console.warn('[script]', msg)
    },
  }
  const reportedOnce = new Set<string>()

  // ── E6a 权威视图:同一 host 原语,两个调用界面 ──
  // 主脚本视图:位移指令隐式接管目标(决策②:转向/定帧不接管);脚本链收尾统一归还。
  const scriptHost: ScriptHost = {
    ...host,
    moveEntity: (id, to, speed) => {
      takeByScript(id)
      return host.moveEntity(id, to, speed)
    },
    stepEntity: (id, dir) => {
      takeByScript(id)
      host.stepEntity(id, dir)
    },
    nudgeEntity: (id, dx, dy) => {
      takeByScript(id)
      host.nudgeEntity(id, dx, dy)
    },
    chaseStep: (id, range, speed, floating) => {
      takeByScript(id)
      return host.chaseStep(id, range, speed, floating)
    },
  }
  // auto 巡逻视图:目标实体被主脚本接管 → 该指令暂停/跳过(决策①:仅被接管者暂停,
  // 其余 NPC 照常并行 —— 2026-07-03「不复刻对话冻结 NPC」拍板的精确化)。
  const autoHost: ScriptHost = {
    ...host,
    moveEntity: async (id, to, speed) => {
      while (authority.has(id)) await host.wait(150) // 等 release 再走(演出期整段驻留)
      return host.moveEntity(id, to, speed)
    },
    stepEntity: (id, dir) => {
      if (authority.has(id)) return // 半格步:被接管期丢步无感
      host.stepEntity(id, dir)
    },
    nudgeEntity: (id, dx, dy) => {
      if (authority.has(id)) return
      host.nudgeEntity(id, dx, dy)
    },
    chaseStep: async (id, range, speed, floating) => {
      if (authority.has(id)) {
        await host.wait(200)
        return
      }
      return host.chaseStep(id, range, speed, floating)
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
    ride: async () => {
      host.report('auto 脚本不可骑乘;ride 仅主脚本可用')
    },
  }

  /** E7:mount 派生 —— 挂载者位置 = 父实体位置 + 偏移(每 tick,最后跑 = 最高权威)。 */
  function deriveMounts(): void {
    for (const [id, a] of authority) {
      if (a.kind !== 'mount') continue
      const parent = scene.entities.find((e) => e.id === a.parent)
      if (!parent) continue
      const pos = { col: parent.pos.col + a.dx, row: parent.pos.row + a.dy, height: parent.pos.height }
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
        entityMoves.delete(id)
        mv.resolve()
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
    const stages = auto.stages
    const ac = new AbortController()
    autoAborts.set(e.id, ac)
    const r = new ScriptRunner(autoHost, world.script!, ac.signal, Math.random, project.scriptStore) // E6a:auto 视图(被接管实体暂停)
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
    if (hostileBusy || runner || dialogBox.active || menu !== CLOSED || activeBattle) return
    for (const e of scene.entities) {
      const h = e.hostile
      if (!h || e.hidden) continue
      const dc = player.pos.col - e.pos.col
      const dr = player.pos.row - e.pos.row
      const dist = Math.max(Math.abs(dc), Math.abs(dr))
      // 贴脸(≤1)→ 开战
      if (dist <= 1) {
        void runHostileEncounter(e, h)
        return
      }
      const chase = h.chase
      if (!chase || dist > chase.range) continue // 原地怪 / 出程:不动
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
      const result = await host.startBattle(
        h.team,
        h.battleFieldId !== undefined ? { fieldId: h.battleFieldId } : undefined,
      )
      if (result === 'win') {
        e.hidden = true // 消失
        if (h.respawnSeconds && h.respawnSeconds > 0) {
          const atScene = scene
          void (async () => {
            await host.wait(h.respawnSeconds! * 1000)
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
    for (const ac of autoAborts.values()) ac.abort()
    autoAborts.clear()
    for (const [, mv] of entityMoves) mv.resolve()
    entityMoves.clear()
    entityAnim.clear()
    cameraPanFx?.resolve()
    cameraPanFx = null
    cameraOffset.x = 0
    cameraOffset.y = 0
  }

  /** 起一段触发/进场脚本(单脚本槽;收尾后接排队的 onEnter)。 */
  function startScript(key: string, stages: readonly ScriptStage[], selfId?: string): void {
    if (runner) return
    scriptAbort = new AbortController()
    const r = new ScriptRunner(scriptHost, world.script!, scriptAbort.signal, Math.random, project.scriptStore) // E6a:主脚本视图(位移隐式接管)
    r.selfId = selfId
    runner = r
    void r
      .runStages(key, stages)
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
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
        if (finishedSceneId === scene.id) ditherTransition.clearPendingFor(finishedSceneId)
        if (pendingOnEnter) {
          const sid = pendingOnEnter
          pendingOnEnter = null
          if (scene.id === sid && scene.onEnter) {
            startScript(`s:${sid}`, scene.onEnter)
            return // onEnter 续链;auto 档等整链收尾(下一次 finally)
          }
        }
        if (sceneChangedByScript) {
          // X1 自动存档:演出链(含 onEnter)全部收尾、玩家落地 → 静默写 auto 槽
          sceneChangedByScript = false
          void captureThumbnail(canvas)
            .then((b) => doSave('auto', b))
            .catch(() => undefined)
        }
      })
  }

  /** 强停脚本(读档/dev 切场景):abort 全树 + 兑现悬挂 driver + 清演出态。 */
  function abortScript(): void {
    scriptAbort?.abort()
    runner = null
    scriptAbort = null
    pendingOnEnter = null
    preserveClosedDialogFrame = false
    if (dialogBox.active) dialogBox.close()
    const r = scriptDialogResolve
    scriptDialogResolve = null
    r?.()
    dismountParty() // E7:强停同样下筏(防跟随者漏挂)
    authority.clear() // E6a:强停演出同样归还全部实体
    for (const t of timers.splice(0)) t.resolve()
    fadeFx?.resolve()
    fadeFx = null
    ditherTransition.cancel()
    fadeBlack = 0
    entityFrameOverride.clear()
    partyGesture = null // 演出态随脚本终止一并清(dev 强停/读档;正常流脚本自清)
    leaderSpriteOverride = null
    partyMove?.resolve()
    partyMove = null
    walking = false
    cameraPanFx?.resolve()
    cameraPanFx = null
    cameraOffset.x = 0
    cameraOffset.y = 0
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
    portraitsDir: project.assetBase.portraits,
    palette: await getPalette(0).catch(() => undefined),
  })
  let menu: MenuState = CLOSED
  let magicMenu: MagicMenuState = closeMagicMenu()
  let equipMenu: EquipMenuState = closeEquipMenu()
  let useMenu: UseMenuState = closeUseMenu()
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
  let overwriteYes = false // 覆盖确认框高亮(右=是)
  let lastGameThumb: Blob | undefined // 开菜单时抓的干净游戏帧(菜单内存档的缩略图源)
  let toast: { text: string; until: number } | undefined // 快速存读短提示
  const MAP_NAME = project.manifest.name
  let lastT = 0

  function showToast(text: string): void {
    toast = { text, until: performance.now() + 1500 }
  }

  /** 读 metas + 解码缩略图(开界面/存档后刷新)。 */
  async function refreshSaveMetas(): Promise<void> {
    saveMetas = await saveStore.listMeta()
    saveThumbs.clear()
    for (const m of saveMetas) {
      const blob = await saveStore.getThumb(m.slotId)
      if (blob) saveThumbs.set(m.slotId, await createImageBitmap(blob))
    }
  }

  async function doSave(slotId: SlotId, thumb: Blob): Promise<void> {
    // wSavedTimes 跨槽计数器(uigame.c:578-598:max(全部槽)+1;saveMetas 是槽表快照)
    const savedTimes = saveMetas.reduce((m, x) => Math.max(m, x.savedTimes ?? 0), 0) + 1
    const meta = buildMeta(
      slotId,
      world,
      MAP_NAME,
      (c) => lookupText(`name.${c.template}`, project.locale),
      Date.now(),
      savedTimes,
    )
    const payload = buildPayload(
      world,
      { sceneId: scene.id, pos: player.pos, facing },
      project.manifest.id,
      project.manifest.contentVersion,
    )
    await saveStore.putSlot(meta, payload, thumb)
    await refreshSaveMetas()
  }

  async function doLoad(slotId: SlotId): Promise<boolean> {
    const raw = await saveStore.getPayload(slotId)
    if (!raw) return false
    let p: SavePayload
    try {
      p = normalizePayload(raw) // 运行时归一化:版本闸 + 结构补默认(G10.1)
    } catch (err) {
      console.warn(`[save] 槽 ${slotId} 归一化拒绝:`, err)
      showToast('存档格式过新,无法读取')
      return false
    }
    abortScript() // 演出中读档:全树取消 + 清演出态
    stopAutoRunners()
    // 存档绑工程:projectId 不匹配(把 A 工程存档读进 B 工程)→ 拒绝,防世界态错乱。
    if (p.projectId !== project.manifest.id) {
      console.warn(
        `[save] 槽 ${slotId} 属工程 "${p.projectId}",与当前 "${project.manifest.id}" 不匹配,拒绝读档`,
      )
      return false
    }
    // 内容版本温和提示(不拒绝:内容工程迭代是常态,存档格式版本才做硬迁移)
    if (p.contentVersion !== project.manifest.contentVersion) {
      showToast('存档来自旧版内容,如有异常请重开新档')
    }
    world = p.world
    world.script ??= emptyWorldScriptState() // 旧档缺省 → 空态
    // 读档解毒(原版真值:毒/定时状态/装备临时抗性在 GLOBALVARS 不入 SAVEDGAME → 读档即净身;
    // reforge 全量 world 入档,故读回后主动清 runtime-only 三件)
    for (const c of world.party) {
      c.poisons = undefined
      c.extraStatuses = undefined
      c.extraPoisonRes = undefined
    }
    syncAmbience() // W6:读档瞬时还原氛围(夜档回夜;旧档缺省昼),不播过渡
    // 同场景也走 switchScene:场景实体运行时已被演出污染(位置/触发),读档必须回
    // def 初态再由 applyWorldToScene 重放世界态(X1;getSceneDef 已返回 pristine 拷贝)。
    await switchScene(p.position.sceneId, { pos: p.position.pos, facing: p.position.facing })
    applyWorldToScene() // 实体隐现/挡路按存档世界态重放(读档不重跑 onEnter,对齐原版)
    // 存档时脚本曲(sys:music 记账)覆盖场景槽曲;同曲不重启,无记账则保持场景曲。
    const savedMusic = world.script.vars['sys:music']
    if (typeof savedMusic === 'number') bgm.play(savedMusic)
    startAutoRunners()
    return true
  }

  async function quickSave(): Promise<void> {
    await doSave('quick', await captureThumbnail(canvas))
    showToast('已快速存档')
  }
  async function quickLoad(): Promise<void> {
    showToast((await doLoad('quick')) ? '已读取快速存档' : '无快速存档')
  }

  /** 浏览界面写槽:菜单内 canvas 是菜单画面 → 用开菜单时抓的干净帧;存完刷新浏览显示。 */
  async function browserWrite(slotId: SlotId): Promise<void> {
    const mode = saveBrowser.mode
    const cursor = saveBrowser.cursor
    const thumb = lastGameThumb ?? (await captureThumbnail(canvas))
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

  function render(): void {
    // 对话状态已结束，但持久屏幕的最后文字像素须留给紧随的 loadScene 快照。
    if (preserveClosedDialogFrame) return
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
      const sp = def ? spriteByNum.get(def.spriteNum) : undefined
      // 帧下标:演出帧覆盖(0x14/0x0F,含 0)优先且恒走 站立+override;
      // 否则移动/动画中走走路帧(anim 计数);否则站立帧
      const anim = entityAnim.get(e.id)
      const hasOv = entityFrameOverride.has(e.id)
      const fi = def
        ? hasOv
          ? idleFrameIndex(def.layout, e.facing ?? 'down') + (entityFrameOverride.get(e.id) ?? 0)
          : def.layout.kind === 'loop'
            ? loopFrameIndex(def.layout, performance.now()) // E5:火把/流水自循环
            : anim !== undefined
              ? // 0x87/走位共用计数:directional 走步序,static 平推整条帧带(原版语义;
                // 曾只走 walkFrameIndex → static 恒 0,原地动画 NPC 全冻结,作者报)
                animFrameIndex(def.layout, e.facing ?? 'down', anim, sp?.frames.length ?? 1)
              : idleFrameIndex(def.layout, e.facing ?? 'down')
        : 0
      const f = def ? (sp?.frames[fi] ?? sp?.frames[0]) : undefined
      if (!sp || !f) continue
      const p = gridToPixel(e.pos)
      // 0x7E 图层覆写:只进深度排序键(+8px/层 = 一阶段 present.ts:540 sLayer×8 真值),
      // 不进落笔位;render 直读持久映射,跨场景/存档天然生效
      const lay = world.script?.entityLayer?.[e.id]
      sprites.push({
        frame: f,
        worldX: p.x,
        worldY: spriteScreenY(e.pos), // 含 height 上移(D16)
        // 每帧自锚(sdlpal scene.c 按**当前帧**宽高 blit;一阶段 draw-sprite.ts:16-24 同坑
        // 已修):组锚(首帧)配变尺寸帧组(爬行 193 高 31~73)会溢出几十 px = 演出瞬移感。
        anchorX: Math.floor(f.width / 2),
        anchorY: f.height,
        baseYBias: lay ? (e.zBias ?? 0) + lay * 8 : e.zBias,
      })
    }
    // 玩家帧:脚本姿势(0x15 gesture,原版 wFrame=dir*3+gesture)优先;否则 walk/idle
    // 走 sprite-anim。精灵本体覆盖优先级:0x65 临时换装(练武/疯跑,内存态)> 0x1A 持久形象
    //（成年灵儿当队长;appearance.spriteId 随存档,帧 host 已预载)> 本体。
    const leaderAppSprite = world.party[0]?.appearance?.spriteId
    const leaderAppDef =
      leaderAppSprite && leaderAppSprite !== leaderActor?.spriteId
        ? project.spritesById[leaderAppSprite]
        : undefined
    const leaderAppFrames = leaderAppDef ? spriteByNum.get(leaderAppDef.spriteNum) : undefined
    const ld = leaderSpriteOverride?.def ?? leaderAppDef ?? leaderSpriteDef
    const ls = leaderSpriteOverride?.frames ?? leaderAppFrames ?? playerSprite
    const fi =
      partyGesture != null
        ? idleFrameIndex(ld.layout, facing) + partyGesture
        : walking
          ? walkFrameIndex(ld.layout, facing, stepFrame)
          : idleFrameIndex(ld.layout, facing)
    const pf = ls.frames[fi] ?? ls.frames[0]
    if (pf) {
      const pp = gridToPixel(player.pos)
      sprites.push({
        frame: pf,
        worldX: pp.x,
        worldY: spriteScreenY(player.pos), // 含 height 上移(D16);地面=0 同 pp.y
        anchorX: Math.floor(pf.width / 2), // 每帧自锚(同上;0x65 换爬行精灵后帧高差巨大)
        anchorY: pf.height,
      })
    }
    // E7 跟随者(party[1..N]):照队长那套 push sprite;walk/idle 跟队长走态
    for (let m = 1; m < world.party.length; m++) {
      const fp = followerPos[m]
      // C7:按当前 world.party 动态解析精灵(setParty 即时生效;帧未载到先跳过,懒加载补上)。
      // 0x1A 形象覆写优先(成年灵儿 appearance.spriteId;host 已预载其帧)。
      const c = world.party[m]
      const actor = c ? project.actorsById[c.template] : undefined
      const spriteId = c?.appearance?.spriteId ?? actor?.spriteId
      const fd = spriteId ? project.spritesById[spriteId] : undefined
      const fr = fd ? spriteByNum.get(fd.spriteNum) : undefined
      if (!fp || !fd || !fr) continue
      const ffi = walking
        ? walkFrameIndex(fd.layout, fp.facing, stepFrame)
        : idleFrameIndex(fd.layout, fp.facing)
      const ff = fr.frames[ffi] ?? fr.frames[0]
      if (!ff) continue
      const fpp = gridToPixel(fp.pos)
      sprites.push({
        frame: ff,
        worldX: fpp.x,
        worldY: spriteScreenY(fp.pos),
        anchorX: Math.floor(ff.width / 2),
        anchorY: ff.height,
        // 队长永远遮挡队员(作者定调,骑乘重叠时尤其):同 Y 平局给队员微负深度,
        // 序号越大越靠后;偏置 -0.01×8=-0.08px 只破平局,不扰正常深度排序。
        baseYBias: -0.01 * m,
      })
    }
    // 0x98 编外跟随者(script.c:2709 nFollower):精灵号直用(s102 书生 82/83),
    // 排队员之后按 trail 再深一档跟走;精灵未载(书生本就是场景实体,通常已载)跳过
    const extraFollowers = world.script?.followers ?? []
    for (let k = 0; k < extraFollowers.length; k++) {
      const chunk = extraFollowers[k]!
      const fr = spriteByNum.get(chunk)
      const m = world.party.length + k
      const r = computeFollowerPos(
        { party: player.pos, trail, walking, frozenOffset: followerFrozen },
        m,
        (col, row) => !isBlocked({ col, row, height: 0 }),
      )
      const pos = r?.pos ?? player.pos
      const dir = r?.dir ?? facing
      if (!fr) continue
      // 布局按四向行走图惯例(原版 MGO 跟随者即此;帧不够时 walkFrameIndex 回落首帧)
      const layout = { kind: 'directional' as const, framesPerDir: 3 }
      const ffi = walking ? walkFrameIndex(layout, dir, stepFrame) : idleFrameIndex(layout, dir)
      const ff = fr.frames[ffi] ?? fr.frames[0]
      if (!ff) continue
      const fpp = gridToPixel(pos)
      sprites.push({
        frame: ff,
        worldX: fpp.x,
        worldY: spriteScreenY(pos),
        anchorX: Math.floor(ff.width / 2),
        anchorY: ff.height,
        baseYBias: -0.01 * m,
      })
    }
    // 场景底图:clear + scale + renderScene + restore(抽成 renderSceneFrame,editor 复用同一绘制)。
    // 0x35 震屏:相机 y ±level 交替(40ms 相位;到期自清)
    if (worldShake && nowMs >= worldShake.untilMs) worldShake = null
    const shakeCam = worldShake
      ? { x: camera.x, y: camera.y + (Math.floor(nowMs / 40) % 2 === 0 ? worldShake.level : -worldShake.level) }
      : camera
    // 0x71 屏波:活跃时世界层先合成到离屏,再逐行左卷到主画布(一阶段 applyScreenWave
    // 的 canvas 行卷版;波幅每帧自累加,==0/≥256 自灭 —— advanceWave 原地改 vars 随存档)
    const waveAmp = world.script ? advanceWave(world.script.vars) : 0
    if (waveAmp > 0) {
      const wc = ensureWaveCanvas()
      const wctx = get2dContext(wc)
      renderSceneFrame(wctx, renderer, { map, room, camera: shakeCam, sprites, worldScale: WORLD_SCALE, layers: ownTileHeights ? { ownTileHeights } : undefined })
      worldWave.apply(ctx, wc, waveAmp, WORLD_SCALE)
    } else {
      renderSceneFrame(ctx, renderer, { map, room, camera: shakeCam, sprites, worldScale: WORLD_SCALE, layers: ownTileHeights ? { ownTileHeights } : undefined })
    }
    // debug 碰撞叠加层(reforge 自己的 dev 拐杖;非编辑器叠加层)—— 在底图之上、独立变换块。
    if (DEBUG_COLLISION) {
      ctx.save()
      ctx.scale(WORLD_SCALE, WORLD_SCALE)
      ctx.imageSmoothingEnabled = false
      drawCollisionOverlay()
      ctx.restore()
    }
    // M3a fade 遮罩(脚本淡入淡出;盖世界层,对话/菜单在其上)
    if (fadeBlack > 0.001) {
      ctx.save()
      ctx.fillStyle = `rgba(${fadeCurtain === 'red' ? '150,12,12' : '0,0,0'},${fadeBlack.toFixed(3)})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.restore()
    }
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
          facesDir: project.assetBase.faces,
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
          (sid) => project.skills[sid]?.name,
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
          (sid) => project.skills[sid]?.name,
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
    applyAmbienceTint()
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
            : Math.max(0, Math.min(1, (nowMs - dither.startedAt!) / dither.durationMs))
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
    } else {
      const pendingBackup = ditherTransition.pendingBackupFor(scene.id)
      if (pendingBackup) ctx.putImageData(pendingBackup, 0, 0)
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
    ctx.restore()
  }

  // 移动 + 交互。相机固定（整间屋上屏）。
  // 静态实体碰撞:collide 实体占其 pos 所在格,玩家目标落该格 → 挡。
  // 闭包读 entities 当前 pos(将来移动 NPC 也自然生效;静态阶段 pos 不变)。
  const isBlocked = (pos: GridPos): boolean =>
    isBlockedAt(map, pos) ||
    scene.entities.some((e) => !e.hidden && e.collide === true && sameGrid(pos, e.pos))
  const keyboard = new Keyboard()
  const INTERACT_RANGE = 48 // 像素：靠近实体即可交互

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
    startBattle: (team: number) => host.startBattle(team),
    /** dev:播过场视频(过场编排验证;videos/{id}.mp4,1=开场)。 */
    playVideo: (videoId: number) => host.playVideo(videoId),
    /** dev:播 RNG 序列图(过场编排验证;chunkIdx,正确调色盘引擎内定)。 */
    playRng: (chunkIdx: number) => host.playRng(chunkIdx),
    get battleLog() {
      return activeBattle?.debugLog() ?? []
    },
    /** dev:渲染层诊断(fade 卡黑/战斗态排查)。 */
    get renderDebug() {
      return { fadeBlack, inBattle: !!activeBattle, menuActive: menu.active }
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
    const dt = lastT ? Math.min(t - lastT, 100) : 0 // 钳制 dt 防后台切回爆步
    lastT = t
    nowMs = t
    // ── M3a 脚本 driver 推进(tick 时间源):计时器 → 兑现;淡入淡出 → 进度;对话关 → 兑现 ──
    for (let i = timers.length - 1; i >= 0; i--) {
      if (t >= timers[i]!.deadline) timers.splice(i, 1)[0]!.resolve()
    }
    if (fadeFx) {
      const pr = fadeFx.ms <= 0 ? 1 : Math.min(1, (t - fadeFx.start) / fadeFx.ms)
      fadeBlack = fadeFx.dir === 'out' ? pr : 1 - pr
      if (pr >= 1) {
        const f = fadeFx
        fadeFx = null
        f.resolve()
      }
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
    advanceMoves(dt) // M3b 走位驱动(实体巡逻/剧情走位;与输入无关,菜单/对话期照走)
    deriveMounts() // E7:挂载派生最后跑(位置=父+偏移,覆写一切 = 契约最高权威)
    tickHostiles(dt) // B9 野怪遇敌驱动(数据化;追逐→开战→胜负)
    const pressed = keyboard.consumePressed()
    // M4b:战斗接管(大世界暂停;渲染/输入全走 BattleSession)
    if (activeBattle) {
      activeBattle.tick(dt, pressed)
      activeBattle.render(ctx, WORLD_SCALE)
      applyAmbienceTint() // 夜里进战斗照染(原版夜战即夜盘)
      requestAnimationFrame(tick)
      return
    }
    const interact = pressed.has(' ') || pressed.has('Enter')
    const esc = pressed.has('Escape')

    // 三态优先级:商店 > 菜单 > 对话 > 探索(用 else if 保证互斥;商店在脚本 openShop
    // await 期间活跃 —— 必须先于「脚本演出中吞输入」分支消费按键)
    if (shop) {
      const r = shopInput(shop.ui, pressed, world, project.items, (next) => {
        world = next
      })
      if (r === 'close') {
        shop.resolve()
        shop = null
      }
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
            if (r.action?.kind === 'write') void browserWrite(r.action.slotId)
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
            if (r.action?.kind === 'write') void browserWrite(r.action.slotId)
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
              castOutdoorSkill(world, skill, magicMenu.casterIdx, magicMenu.targetIdx, project.poisonsById)
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
            world = r.world
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
        if (useMenu.phase === 'pick-target') {
          // 选目标:Enter 施用(useApply 回写 world)/ Esc 回列表
          if (interact) {
            const r = useApply(useMenu, world, world.party[0]?.id ?? '', project.items, project.poisonsById)
            world = r.world
            useMenu = r.state
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
            const r = useConfirm(useMenu, world, project.items, project.poisonsById)
            if (r.kind === 'teleportOut') {
              // 引路蜂/土灵珠:当前场景有 onTeleport → 消耗道具、关菜单回大世界、跑出口;
              // 无出口 = 「引路蜂不灵」(不消耗、留菜单)。同步查 onTeleport 决定,避开 world 异步竞态。
              // world.onTeleport 覆写(0x6D op2 运行时装,如血池 s059 打完)优先于静态槽。
              const teleportScript = world.script?.onTeleport?.[scene.id] ?? scene.onTeleport
              if (teleportScript && (!Array.isArray(teleportScript) || teleportScript.length > 0)) {
                if (project.items[r.itemId]?.use?.consuming) host.loseItem(r.itemId, 1) // 引路蜂消耗;土灵珠宝珠不消耗
                lastUseCursor = useMenu.cursor
                useMenu = closeUseMenu()
                menu = CLOSED
                void host.teleportOut()
              } else {
                host.report('引路蜂不灵(当前场景无传送出口)')
              }
            } else {
              if (r.kind === 'direct') world = r.world // 脚本/全体类:已直接执行,回写 world
              useMenu = r.state
            }
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
              location.href = `${location.pathname}?menu`
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
        void quickSave() // 快速存档(快速槽)
      } else if (pressed.has('F9')) {
        void quickLoad() // 快速读档(快速槽)
      } else if (esc) {
        menu = openMenu(lastMainCursor)
        // 抓当前干净游戏帧(此刻菜单尚未画)→ 菜单内存档的缩略图源
        void captureThumbnail(canvas).then((b) => {
          lastGameThumb = b
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
          const nextId = ids[(cur + (pressed.has(']') ? 1 : ids.length - 1)) % ids.length]!
          abortScript()
          stopAutoRunners()
          void switchScene(nextId)
            .then(() => {
              applyWorldToScene()
              startAutoRunners()
              showToast(`${nextId}(${ids.indexOf(nextId) + 1}/${ids.length})`)
              if (scene.onEnter) startScript(`s:${scene.id}`, scene.onEnter)
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

    render()
    requestAnimationFrame(tick)
  }
  void refreshSaveMetas() // 预载已有存档 metas + 缩略图(浏览界面首开即有内容)
  // e2e checkpoint 导出:evaluate 里 `window.__tpE2e.dumpSave()` 取当前世界 SavePayload(JSON)→ 落 e2e-checkpoints/
  if (import.meta.env.DEV) {
    ;(window as unknown as { __tpE2e: unknown }).__tpE2e = {
      dumpSave: () =>
        buildPayload(
          world,
          { sceneId: scene.id, pos: player.pos, facing },
          project.manifest.id,
          project.manifest.contentVersion,
        ),
    }
  }
  // ?e2e-load=<save.json url>:从文件恢复 SavePayload(注入 world + 跳场景、跳过 onEnter 演出),秒进碎片起点(复用 doLoad 逻辑)
  const e2eLoadUrl = params.get('e2e-load')
  if (e2eLoadUrl) {
    try {
      const p = normalizePayload(await fetch(e2eLoadUrl).then((r) => r.json()))
      world = p.world
      world.script ??= emptyWorldScriptState()
      for (const c of world.party) {
        c.poisons = undefined
        c.extraStatuses = undefined
        c.extraPoisonRes = undefined
      }
      syncAmbience()
      await switchScene(p.position.sceneId, { pos: p.position.pos, facing: p.position.facing })
      applyWorldToScene()
      const savedMusic = world.script.vars['sys:music']
      if (typeof savedMusic === 'number') bgm.play(savedMusic)
      startAutoRunners()
      const e2eLoadScene = params.get('e2e-load-scene')
      if (import.meta.env.DEV && e2eLoadScene && project.sceneIds.includes(e2eLoadScene)) {
        const e2eLoadPosRaw = params.get('e2e-load-pos')?.split(',').map(Number)
        const e2eLoadPos =
          e2eLoadPosRaw?.length === 2 && e2eLoadPosRaw.every(Number.isFinite)
            ? { col: e2eLoadPosRaw[0]!, row: e2eLoadPosRaw[1]!, height: 0 }
            : undefined
        startScript('__e2e:loadScene', [
          {
            body: [
              {
                kind: 'loadScene',
                scene: e2eLoadScene,
                ...(e2eLoadPos ? { pos: e2eLoadPos } : {}),
              },
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
      if (scene.onEnter) startScript(`s:${scene.id}`, scene.onEnter)
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
    void findChoreo().then((choreography) =>
      host
        .startBattle(battleParam, {
          ...(fieldParam !== null ? { fieldId: Number(fieldParam) } : {}),
          ...(choreography ? { choreography } : {}),
        })
        .then((r) => showToast(`试打结束:${r}`)),
    )
  } else if (spawnPos) {
    // X5 跳转预览(?pos 落点):dev 跳转意图 = 落地即自由,跳过 onEnter 剧情垫
    //   (同一阶段 dev 跳场景语义;onEnter 的队伍瞬移会劫持落点)。要看进场演出 → 不带 pos。
    showToast(`已跳至 ${scene.id} (${spawnPos.col},${spawnPos.row}) — onEnter 已跳过`)
  } else if (scene.onEnter) startScript(`s:${scene.id}`, scene.onEnter)
  requestAnimationFrame(tick)

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
  const palette = await loadPalette(project.assetBase, 0)
  // 真实战斗 field(场景 setBattleField 用 24/12/10/7…;field 2 是主菜单背景,勿用)。
  const field =
    params.get('battle-preview') && Number(params.get('battle-preview')) > 0
      ? Number(params.get('battle-preview'))
      : 24
  const bg = await loadBattleBg(project.assetBase, field, palette).catch((e: unknown) => {
    console.warn('[battle] bg 加载失败:', e)
    return undefined
  })
  const load = async (kind: 'enemy' | 'player', id: number): Promise<LoadedSprite | undefined> =>
    loadBattleSprite(project.assetBase, kind, id).catch((e: unknown) => {
      console.warn(`[battle] ${kind} 精灵 ${id} 加载失败:`, e)
      return undefined
    })

  const enemyIds = (params.get('enemies') ?? '1,2,3')
    .split(',')
    .map(Number)
    .filter((n) => n >= 0)
  const enemies: BattleSpriteDraw[] = []
  for (const [i, id] of enemyIds.entries()) {
    const sprite = await load('enemy', id)
    const pos = getEnemyBasePos(enemyIds.length, i) ?? { x: 160, y: 80 }
    if (sprite) enemies.push({ sprite, x: pos.x, y: pos.y, frame: 0 })
  }

  const party = project.manifest.startWorld.party.slice(0, 3)
  const players: BattleSpriteDraw[] = []
  for (const [i, aid] of party.entries()) {
    const bsn = project.actorsById[aid]?.battler?.battleSpriteNum ?? 0
    const sprite = await load('player', bsn)
    const pos = getPlayerBasePos(party.length, i) ?? { x: 240, y: 170 }
    if (sprite) players.push({ sprite, x: pos.x, y: pos.y, frame: 0 })
  }

  renderBattleScene(ctx, { bg, enemies, players, palette }, WORLD_SCALE)
  console.log(
    `[reforge] battle preview: field ${field}, ${enemies.length} 敌 / ${players.length} 队员`,
  )
}

/** 调试速查：把 spriteNum 0..47 的第 0 帧排成网格 + 标号，肉眼分辨人 / 物。 */
async function renderSpriteGallery(assetBase: AssetBase, palette: Palette): Promise<void> {
  const COLS = 8
  const CELL = 80
  const MAX = 47
  canvas.width = COLS * CELL
  canvas.height = (Math.floor(MAX / COLS) + 1) * CELL
  const renderer = new Canvas2DRenderer(ctx, palette, new Map())
  renderer.clear()
  for (let id = 0; id <= MAX; id++) {
    let sp: LoadedSprite | undefined
    try {
      sp = await loadSprite(assetBase, id)
    } catch {
      sp = undefined
    }
    const col = id % COLS
    const rowI = Math.floor(id / COLS)
    ctx.fillStyle = '#7a9'
    ctx.font = '10px monospace'
    ctx.fillText(String(id), col * CELL + 4, rowI * CELL + 12)
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
  console.log('[reforge] sprite gallery 0..47 rendered')
}

// 页面入口壳(loadProject + bootGame + 错误画屏)在 boot.ts —— 本模块只导出可复用启动函数。
