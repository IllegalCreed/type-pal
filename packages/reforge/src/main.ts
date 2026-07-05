import {
  buildWorld,
  type Dialogue,
  type DialogueLine,
  type EntityDef,
  effectiveStat,
  emptyWorldScriptState,
  type Facing,
  type GridPos,
  grantBattleRewards,
  gridToPixel,
  lookupText,
  pixelDeltaToGridDelta,
  pixelToGrid,
  resolveEntitySpriteId,
  type SceneDef,
  type ScriptStage,
  type SpriteDef,
  spriteScreenY,
} from '@type-pal/content'
import type { Palette, RleFrame, Tilemap } from '@type-pal/shared'
import {
  type AssetBase,
  type LoadedSprite,
  loadBattleBg,
  loadBattleSprite,
  loadEffectSprite,
  loadFireSprite,
  loadGlyphs,
  loadPalette,
  loadSprite,
  loadTilemap,
  loadTileset,
} from './assets.js'
import { createBgmPlayer } from './audio/bgm.js'
import { SfxPlayer } from './audio/sfx.js'
import { getEnemyBasePos, getPlayerBasePos } from './battle/battle-positions.js'
import { BattleSession } from './battle/battle-session.js'
import { type BattleSpriteDraw, renderBattleScene } from './battle/present-battle.js'
import { buildSettlementScreens } from './battle/settlement.js'
import { isBlockedAt, sameGrid } from './collision.js'
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
  closeMagicMenu,
  type MagicMenuState,
  magicBackFromTarget,
  magicConfirmSpell,
  magicMoveCursor,
  openMagicMenu,
  resolveOutdoorSkills,
} from './magic-menu-state.js'
import { drawEquipMenu } from './menu/equip-box.js'
import { drawMagicMenu } from './menu/magic-box.js'
import { loadMenuAssets, loadPng, MenuBox } from './menu/menu-box.js'
import { drawSaveBrowser } from './menu/save-browser-box.js'
import { drawSystemMenu } from './menu/system-box.js'
import { drawUseMenu } from './menu/use-box.js'
import { back, CLOSED, confirm, type MenuState, moveCursor, openMenu } from './menu-state.js'
import { resolveMove } from './movement.js'
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
import { buildMeta, buildPayload, captureThumbnail } from './save/ops.js'
import { IndexedDbSaveStore, MemorySaveStore, type SaveStore } from './save/store.js'
import type { SaveMeta, SlotId } from './save/types.js'
import { type ScriptHost, ScriptRunner } from './script-runner.js'
import { idleFrameIndex, loopFrameIndex, walkFrameIndex } from './sprite-anim.js'
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

const canvas = document.getElementById('screen') as HTMLCanvasElement
const ctx = get2dContext(canvas)

// 调试：?collision 把障碍格(0x2000)染色盖在画面上，肉眼比对禁入格 vs 视觉墙。
const DEBUG_COLLISION = new URLSearchParams(location.search).has('collision')

async function main(): Promise<void> {
  // 工程化:运行期加载工程(vite define 注入 VITE_PROJECT_ID;缺省 demo)。
  const PROJECT_ID = import.meta.env.VITE_PROJECT_ID ?? 'demo'
  const project: LoadedProject = await loadProject(PROJECT_ID)
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
  const portraitChunks = await fetch('/extracted/data/portraits.json')
    .then((r) => (r.ok ? (r.json() as Promise<{ portraits: { chunkIndex: number }[] }>) : null))
    .then((m) => m?.portraits.map((p) => p.chunkIndex) ?? [1, 2])
    .catch(() => [1, 2])
  const portraits = await loadPortraits(portraitChunks, project.assetBase.portraits).catch(
    (err: unknown) => {
      console.warn('[reforge] portraits 加载失败,降级无头像:', err)
      return new Map<number, HTMLCanvasElement>()
    },
  )

  // ── 场景资产缓存(M2c,设计 §3):map/tileset 按 mapNum LRU(cap16 + protect 当前,
  // 修一阶段按 sceneId 双取坑);palette/sceneDef 小缓存;精灵跨场景累积。──
  const MAP_CACHE_CAP = 16
  const mapCache = new Map<number, { map: Tilemap; tiles: Map<number, RleFrame> }>()
  async function getMapAssets(
    mapNum: number,
  ): Promise<{ map: Tilemap; tiles: Map<number, RleFrame> }> {
    const hit = mapCache.get(mapNum)
    if (hit) {
      mapCache.delete(mapNum) // LRU touch(Map 插入序 = LRU 序)
      mapCache.set(mapNum, hit)
      return hit
    }
    const [m, t] = await Promise.all([
      loadTilemap(project.assetBase, mapNum),
      loadTileset(project.assetBase, mapNum),
    ])
    const entry = { map: m, tiles: t }
    mapCache.set(mapNum, entry)
    while (mapCache.size > MAP_CACHE_CAP) {
      const oldest = mapCache.keys().next().value
      if (oldest === undefined || oldest === mapNum) break // protect 当前
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
  let map!: Tilemap
  let tiles!: Map<number, RleFrame>
  let palette!: Palette
  let renderer!: Canvas2DRenderer
  let room!: CellRect
  let viewMinX = 0
  let viewMinY = 0
  let viewMaxX = 0
  let viewMaxY = 0
  let entitySpriteDefs = new Map<string, SpriteDef>()
  const player: { pos: GridPos } = { pos: { ...project.entryScene.entry.pos } }
  let facing: Facing = project.entryScene.entry.facing
  let walking = false
  let stepFrame = 0 // 0..3 走帧相位
  let stepAcc = 0 // 步进累加器（ms）

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
  const leaderId = project.manifest.startWorld.party[0]
  const leaderActor = leaderId ? project.actorsById[leaderId] : undefined
  if (!leaderActor) throw new Error(`reforge: 队长 "${leaderId ?? '(空)'}" 不在 actors 表`)
  const leaderSpriteDef = requireSpriteDef(leaderActor.spriteId, `队长 ${leaderActor.id}`)

  /**
   * 切场景(M2c):取场景定义 → 换图/调色板 → 重建渲染器(烤图缓存随 palette 走)→
   * 补载缺失精灵(spriteByNum 跨场景累积)→ 落位(spawn.pos > 命名入口 > 场景缺省)→ 相机重夹。
   * 全部资产就绪后才原子提交,避免半态渲染。boot 也走此函数(单一代码路)。
   */
  async function switchScene(
    sceneId: string,
    spawn?: { entry?: string; pos?: GridPos; facing?: Facing },
  ): Promise<void> {
    const def = await getSceneDef(sceneId)
    const assets = await getMapAssets(def.map.reuseOriginalMap)
    const pal = await getPalette(Number(params.get('pal') ?? def.paletteId ?? 0))
    const defs = new Map<string, SpriteDef>()
    for (const e of def.entities) {
      // 隐藏实体也登记(M3a:脚本 setEntityState 可显形);zone 无视觉跳过
      const sid = resolveEntitySpriteId(e, project.actorsById)
      if (!sid) continue
      defs.set(e.id, requireSpriteDef(sid, `实体 ${e.id}`))
    }
    const missing = [
      ...new Set([leaderSpriteDef.spriteNum, ...[...defs.values()].map((d) => d.spriteNum)]),
    ].filter((n) => !spriteByNum.has(n))
    await Promise.all(
      missing.map(async (n) => {
        spriteByNum.set(n, await loadSprite(project.assetBase, n))
      }),
    )
    // 原子提交
    scene = def
    map = assets.map
    tiles = assets.tiles
    palette = pal
    renderer = new Canvas2DRenderer(ctx, palette, tiles)
    entitySpriteDefs = defs
    room = def.map.room ?? { col: 0, row: 0, cols: map.width, rows: map.height }
    viewMinX = room.col * TILE_W - TILE_W
    viewMinY = room.row * TILE_H - 40
    viewMaxX = (room.col + room.cols) * TILE_W + TILE_W
    viewMaxY = (room.row + room.rows) * TILE_H + 16
    const entryDef = spawn?.entry ? def.entries?.[spawn.entry] : undefined
    player.pos = { ...(spawn?.pos ?? entryDef?.pos ?? def.entry.pos) }
    facing = spawn?.facing ?? entryDef?.facing ?? def.entry.facing
    walking = false
    stepFrame = 0
    stepAcc = 0
    updateCamera()
    // W5 场景 BGM 槽:缺省 = 延续上一曲(忠实原版);0 = 停曲。同曲不重启由播放器保证。
    if (def.musicId != null) bgm.play(def.musicId)
  }

  // 初始场景:?scene=<id> dev 直达(须在 index),否则 manifest 入口。
  // ?pos=col,row(&facing=)覆盖落点 —— X5 跳转预览:编辑器「引擎试玩」跳到事件现场。
  const sceneParam = params.get('scene')
  const initialSceneId =
    sceneParam && project.sceneIds.includes(sceneParam) ? sceneParam : project.entryScene.id
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
  const dialogBox = new DialogBox(ctx, glyphs, cursorFrames, portraits, project.locale)
  let world = buildWorld(project.manifest.startWorld, project.actorsById)
  world.script ??= emptyWorldScriptState()

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
  let scriptDialogResolve: (() => void) | null = null
  const entityFrameOverride = new Map<string, number>() // setEntityFrame 演出帧覆盖(切场景清)
  // ── 0x15/0x65 队长演出态(原版 rgParty[].wFrame / rgwSpriteNum;脚本自清,走路时引擎清)──
  let partyGesture: number | null = null // 脚本姿势帧(渲染 = dir*framesPerDir + gesture)
  let leaderSpriteOverride: { def: SpriteDef; frames: typeof playerSprite } | null = null // 0x65 换装
  let activeBattle: BattleSession | null = null // M4b:进行中的战斗(主循环转发 tick/render)
  // ── M3b 走位/动画驱动(tick 推进;abort 全兑现)──
  const SPEED_MS: Record<string, number> = { slow: 200, normal: 130, fast: 100, run: 50 }
  const entityMoves = new Map<
    string,
    { to: GridPos; stepMs: number; acc: number; resolve: () => void }
  >()
  let partyMove: { to: GridPos; stepMs: number; acc: number; resolve: () => void } | null = null
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

  /** 世界脚本状态 → 场景实体(entityState:≤0 隐,≥2 挡路;进场/读档/设态后重放)。 */
  function applyWorldToScene(): void {
    for (const e of scene.entities) {
      const st = world.script?.entityState[e.id]
      if (st === undefined) continue
      e.hidden = st <= 0
      e.collide = st >= 2
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
  const authority = new Map<string, { kind: 'script' }>()
  const takeByScript = (id: string): void => {
    authority.set(id, { kind: 'script' })
  }

  const host: ScriptHost = {
    dialog: (line: DialogueLine) =>
      new Promise((resolve) => {
        dialogBox.open(startDialogue({ id: '__script', lines: [line] }), nowMs)
        scriptDialogResolve = resolve // tick 检测 dialogBox 关闭时兑现
      }),
    clearDialog: () => dialogBox.close(),
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
      await hostFade('out', 260)
      stopAutoRunners()
      await switchScene(sceneId, { pos, facing: fc })
      applyWorldToScene()
      entityFrameOverride.clear()
      pendingOnEnter = sceneId // 新场景 onEnter 排队(当前脚本收尾后跑,不嵌套)
      sceneChangedByScript = true // X1:演出链全部收尾后写 auto 档
      startAutoRunners()
      await hostFade('in', 260)
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
        spriteByNum.get(def.spriteNum) ?? (await loadSprite(project.assetBase, def.spriteNum))
      spriteByNum.set(def.spriteNum, frames)
      // 切回本体精灵 = 撤销覆盖(严格等价:override 恒生效,但本体时置 null 让存档/调试态干净)
      leaderSpriteOverride = def.spriteNum === leaderSpriteDef.spriteNum ? null : { def, frames }
    },
    fleeBattle: () => {
      host.report('fleeBattle: 战斗演出专用命令,大世界上下文忽略')
    },
    setEntityState: () => applyWorldToScene(), // runner 已写 world.script,这里只重放视觉
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
    setBattleMusic: (id) => {
      world.script!.vars['sys:battleMusic'] = id
    },
    setBattleField: (id) => {
      world.script!.vars['sys:battleField'] = id
    },
    // E6b 显式定位权威(手工演出精细控制;隐式接管见 scriptHost 位移视图)
    takeEntity: (id) => {
      takeByScript(id)
    },
    releaseEntity: (id) => {
      if (id === undefined) authority.clear()
      else authority.delete(id)
    },
    moveEntity: (id, to, speed) =>
      new Promise((resolve) => {
        const e = scene.entities.find((x) => x.id === id)
        if (!e) {
          host.report(`moveEntity: 实体 ${id} 不在场`)
          resolve()
          return
        }
        // acc 从 0 起:曾预充满 stepMs → 首步零延迟,1-2 步的短距走位在相邻帧内瞬完
        // = 瞬移(开场李逍遥两条 partyWalk 到密道口,2026-07-03 用户报;实体同防)
        entityMoves.get(id)?.resolve() // E6a 顺手修:同实体新走位覆盖旧 entry 时兑现旧 Promise(防悬挂卡死调用方)
        entityMoves.set(id, { to, stepMs: SPEED_MS[speed] ?? 130, acc: 0, resolve })
      }),
    stepEntity: (id, dir) => {
      const e = scene.entities.find((x) => x.id === id)
      if (!e) return
      e.facing = dir
      const d = WALK_STEP[dir]
      // 原版 NPC 步长 = 16/8px = 半格(play.c:213;玩家整格是 reforge 自己的手感设计)
      e.pos = { ...e.pos, col: e.pos.col + d.dcol * 0.5, row: e.pos.row + d.drow * 0.5 }
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
        partyMove = { to, stepMs: SPEED_MS[speed] ?? 130, acc: 0, resolve } // acc 同上从 0 起
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
    setEntityAuto: (id, stages) => {
      const e = scene.entities.find((x) => x.id === id)
      if (!e) return
      e.pages = e.pages?.length ? e.pages : [{}]
      e.pages[0] = { ...e.pages[0], auto: stages.length ? { stages } : undefined }
      restartAutoRunner(e) // 停旧起新(空 stages = 仅停)
    },
    setEntityTrigger: (id, stages) => {
      const e = scene.entities.find((x) => x.id === id)
      if (!e) return
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
      // 战斗 BGM(sys:battleMusic 记账,setBattleMusic op 烤自原版脚本):有值即切(0=停,忠实);
      // 未记账(迁移期脚本未跑到)不切 —— 场景曲延续,不突兀。
      const battleTrack = world.script?.vars['sys:battleMusic']
      if (typeof battleTrack === 'number') bgm.play(battleTrack)
      let playedVictory = false
      // 队员战斗态:CharacterInstance + 装备加成(effectiveStat)
      const itemsById = project.items
      const players = world.party.map((c) => ({
        roleId: c.id,
        hp: c.hp,
        maxHp: c.maxHP,
        mp: c.mp,
        maxMp: c.maxMP,
        attackStrength: effectiveStat(c, 'attack', itemsById),
        defense: effectiveStat(c, 'defense', itemsById),
        magicStrength: effectiveStat(c, 'magicAttack', itemsById),
        baseDexterity: effectiveStat(c, 'speed', itemsById),
        skills: world.learnedSkills[c.id] ?? [], // M4b-3:仙术指令数据源
        fleeRate: effectiveStat(c, 'luck', itemsById), // 逃跑判定 str
      }))
      // 资产:战场背景(sys:battleField 记账 → 当前场景 palette 着色)+ 敌我战斗精灵 + 队员小头像
      const fieldId = world.script?.vars['sys:battleField'] ?? 24
      const [bg, enemySprites, playerSprites, faceList, battleIcons, effectSprite, effectIndex] =
        await Promise.all([
          loadBattleBg(project.assetBase, fieldId, palette).catch(() => undefined),
          Promise.all(
            enemyDefs.map((e) =>
              loadBattleSprite(project.assetBase, 'enemy', e.spriteNum).catch(() => undefined),
            ),
          ),
          Promise.all(
            world.party.map((c) =>
              loadBattleSprite(
                project.assetBase,
                'player',
                project.actorsById[c.template]?.battler?.battleSpriteNum ?? 0,
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
        const sn = project.actorsById[c.template]?.battler?.battleSpriteNum ?? 0
        const v = effectIndex?.[sn * 2 + 1]
        return v === undefined ? -1 : v * 3
      })
      const playerCastBase = world.party.map((c) => {
        const sn = project.actorsById[c.template]?.battler?.battleSpriteNum ?? 0
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
          bg,
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
          locale: project.locale,
          playerEffectBase,
          playerCastBase,
          // B7b/B7c 胜利结算(会话 over 阶段调一次):HP 写回 + 入账 + 升级 + 隐藏经验 =
          //   单次授予点,返回结算屏序列(经验金钱→升级→隐藏提升→练成)。原版 Phase A/B/E/D/F。
          buildSettlement: () => {
            sessionRef.writeBackHp(world.party) // 先写回战斗末 HP(原版 exp 前)
            const r = sessionRef.rewards()
            if (r.exp > 0) {
              bgm.play(3, false) // 胜利小调,不循环(一阶段 battleVictoryTrack;boss 曲 2 待 boss 立项)
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
      const result = await session.done
      activeBattle = null
      // 胜利结算路径已在 buildSettlement 里写回 HP + 入账;其余路径(败/逃/敌逃)此处写回 HP。
      if (result !== 'win' || session.enemyFled()) session.writeBackHp(world.party)
      session.writeBackInventory(world.inventory)
      // 战斗内切过曲(战斗 BGM/胜利小调)→ 回场景曲;lose 进 gameOver 流程不回。
      if (result !== 'lose' && (typeof battleTrack === 'number' || playedVictory)) {
        const m = world.script?.vars['sys:music']
        bgm.play(typeof m === 'number' ? m : (scene.musicId ?? 0))
      }
      return result
    },
    openShop: (shop, mode) => {
      showToast(`商店 #${shop}(${mode === 'buy' ? '买' : '卖'})—— M3c 落地`)
      host.report(`openShop ${shop} ${mode} 未实现`)
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
  }

  /** M3b:tick 推进走位驱动(实体 + 队伍;到达即兑现)。 */
  function advanceMoves(dt: number): void {
    // M3c 相机 pan:每步(~16ms)移动 (dx,dy),累积进 cameraOffset;走完兑现
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
      mv.acc += dt
      while (mv.acc >= mv.stepMs) {
        mv.acc -= mv.stepMs
        const dcol = mv.to.col - e.pos.col
        const drow = mv.to.row - e.pos.row
        if (Math.abs(dcol) < 0.26 && Math.abs(drow) < 0.26) break
        // 半格步长(原版 16/8px);对角同步走(原版逐轴双步近似)
        const dc = Math.abs(dcol) >= 0.26 ? Math.sign(dcol) * 0.5 : 0
        const dr = Math.abs(drow) >= 0.26 ? Math.sign(drow) * 0.5 : 0
        e.pos = { ...e.pos, col: e.pos.col + dc, row: e.pos.row + dr }
        // 朝向 = 原版象限规则(PAL_NPCWalkTo/一阶段 npcWalkTo:event-system.ts:5199-5205),
        // 作用在**像素轴**目标差(dx=16(Δcol−Δrow), dy=8(Δcol+Δrow))。⚠ 曾直接套在
        // 菱形格轴上:纯 row+ 走位(像素朝下)算成 right(2026-07-03 用户报李大娘朝向错)。
        const dpx = dcol - drow // 16 倍缩放不影响符号
        const dpy = dcol + drow
        e.facing = dpy < 0 ? (dpx < 0 ? 'left' : 'up') : dpx < 0 ? 'down' : 'right'
        // 走位重算帧 = 覆盖 0x16 的演出定帧(一阶段 npcWalkTo 每步写 scriptedFrame 同语义;
        // 不清则 override 恒压制走路帧 → 站立滑行)
        entityFrameOverride.delete(id)
        entityAnim.set(id, (entityAnim.get(id) ?? 0) + 1)
      }
      if (Math.abs(mv.to.col - e.pos.col) < 0.26 && Math.abs(mv.to.row - e.pos.row) < 0.26) {
        e.pos = { ...mv.to }
        entityMoves.delete(id)
        mv.resolve()
      }
    }
    if (partyMove) {
      const mv = partyMove
      mv.acc += dt
      while (mv.acc >= mv.stepMs) {
        mv.acc -= mv.stepMs
        const dcol = mv.to.col - player.pos.col
        const drow = mv.to.row - player.pos.row
        if (Math.abs(dcol) < 0.26 && Math.abs(drow) < 0.26) break
        // 半格步长(同 moveEntity;曾整格步 → 短距 partyWalk 一两帧跳完 = 瞬移)
        const dc = Math.abs(dcol) >= 0.26 ? Math.sign(dcol) * 0.5 : 0
        const dr = Math.abs(drow) >= 0.26 ? Math.sign(drow) * 0.5 : 0
        player.pos = { ...player.pos, col: player.pos.col + dc, row: player.pos.row + dr }
        // 同上:像素轴象限(曾错套格轴)
        const dpx = dc - dr
        const dpy = dc + dr
        facing = dpy < 0 ? (dpx < 0 ? 'left' : 'up') : dpx < 0 ? 'down' : 'right'
        walking = true
        partyGesture = null // 原版走位重算 wFrame
        stepFrame = (stepFrame + 1) % 4
        updateCamera()
      }
      if (
        Math.abs(mv.to.col - player.pos.col) < 0.26 &&
        Math.abs(mv.to.row - player.pos.row) < 0.26
      ) {
        player.pos = { ...mv.to }
        partyMove = null
        walking = false
        updateCamera()
        mv.resolve()
      }
    }
  }

  /** M3b:单实体 auto 巡逻/环境动画循环 runner(与主脚本并行,同原版;hidden 挂起)。 */
  function startAutoRunner(e: EntityDef): void {
    const auto = e.pages?.[0]?.auto
    if (!auto?.stages.length || autoAborts.has(e.id)) return
    const stages = auto.stages
    const ac = new AbortController()
    autoAborts.set(e.id, ac)
    const r = new ScriptRunner(autoHost, world.script!, ac.signal) // E6a:auto 视图(被接管实体暂停)
    r.selfId = e.id // chasePlayer/vanishEntity 的 self
    r.paceMs = 80 // 原版 auto 一帧一 op 的节拍近似(一阶段同语义)
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
      const result = await host.startBattle(h.team)
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
    const r = new ScriptRunner(scriptHost, world.script!, scriptAbort.signal) // E6a:主脚本视图(位移隐式接管)
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
        authority.clear() // E6a:脚本链收尾统一归还(兜底收尾人;续链新段自行重新接管)
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
    if (dialogBox.active) dialogBox.close()
    const r = scriptDialogResolve
    scriptDialogResolve = null
    r?.()
    authority.clear() // E6a:强停演出同样归还全部实体
    for (const t of timers.splice(0)) t.resolve()
    fadeFx?.resolve()
    fadeFx = null
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

  const menuAssets = await loadMenuAssets(project.items, project.assetBase)
  const menuBox = new MenuBox(glyphs, project.locale, menuAssets, project.items)
  let menu: MenuState = CLOSED
  let magicMenu: MagicMenuState = closeMagicMenu()
  let equipMenu: EquipMenuState = closeEquipMenu()
  let useMenu: UseMenuState = closeUseMenu()
  let lastUseCursor = 0 // 使用面板光标记忆(原版 iCurInvMenuItem;跨开关恢复)
  let statusIdx = 0 // 状态板当前查看的队员索引(原版 iCurrent;方向键切人,越界关菜单)
  let systemMenu: SystemMenuState = closeSystemMenu()
  let lastSystemCursor = 0 // 系统菜单光标记忆(原版 iCurSystemMenuItem;跨开关恢复)
  let systemPlaceholder: string | undefined // 占位提示文案 id(选占位项后短暂显示)
  // 存档系统(D-save)：IndexedDB(无则内存降级)；浏览界面态 + 缩略图缓存 + metas 快照。
  const saveStore: SaveStore =
    typeof indexedDB !== 'undefined' ? new IndexedDbSaveStore() : new MemorySaveStore()
  let saveBrowser: SaveBrowserState = closeSaveBrowser()
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
    const meta = buildMeta(
      slotId,
      world,
      MAP_NAME,
      (c) => lookupText(`name.${c.template}`, project.locale),
      Date.now(),
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
    const p = await saveStore.getPayload(slotId)
    if (!p) return false
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
    if (saveBrowser.active) saveBrowser = openSaveBrowser(mode, saveMetas, cursor)
  }
  /** 浏览界面读槽:成功 → 关菜单回大世界。 */
  async function browserLoad(slotId: SlotId): Promise<void> {
    if (await doLoad(slotId)) {
      saveBrowser = closeSaveBrowser()
      menu = CLOSED
    }
  }

  function render(): void {
    updateCamera() // 相机跟随玩家
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
              ? walkFrameIndex(def.layout, e.facing ?? 'down', anim)
              : idleFrameIndex(def.layout, e.facing ?? 'down')
        : 0
      const f = def ? (sp?.frames[fi] ?? sp?.frames[0]) : undefined
      if (!sp || !f) continue
      const p = gridToPixel(e.pos)
      sprites.push({
        frame: f,
        worldX: p.x,
        worldY: spriteScreenY(e.pos), // 含 height 上移(D16)
        // 每帧自锚(sdlpal scene.c 按**当前帧**宽高 blit;一阶段 draw-sprite.ts:16-24 同坑
        // 已修):组锚(首帧)配变尺寸帧组(爬行 193 高 31~73)会溢出几十 px = 演出瞬移感。
        anchorX: Math.floor(f.width / 2),
        anchorY: f.height,
        baseYBias: e.zBias,
      })
    }
    // 玩家帧:脚本姿势(0x15 gesture,原版 wFrame=dir*3+gesture)优先;否则 walk/idle
    // 走 sprite-anim。精灵本体可被 0x65 换装覆盖(练武/疯跑)。
    const ld = leaderSpriteOverride?.def ?? leaderSpriteDef
    const ls = leaderSpriteOverride?.frames ?? playerSprite
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
    // 场景底图:clear + scale + renderScene + restore(抽成 renderSceneFrame,editor 复用同一绘制)。
    renderSceneFrame(ctx, renderer, { map, room, camera, sprites, worldScale: WORLD_SCALE })
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
        drawMagicMenu(ctx, magicMenu, world, menuAssets, glyphs, performance.now())
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
    get battleLog() {
      return activeBattle?.debugLog() ?? []
    },
    /** dev:世界态只读观测(B7a 入账验证:money / party exp/level)。 */
    get world() {
      return world
    },
  }

  function dialogueById(id: string): Dialogue | undefined {
    return scene.dialogues.find((d) => d.id === id)
  }

  /** 玩家附近、可交互的实体（取首个有 interact 且在像素范围内的）。 */
  function nearbyInteractable(): EntityDef | undefined {
    const pp = gridToPixel(player.pos)
    return scene.entities.find((e) => {
      if (!e.interact || e.hidden) return false
      const ep = gridToPixel(e.pos)
      const ex = ep.x - pp.x
      const ey = ep.y - pp.y
      return ex * ex + ey * ey <= INTERACT_RANGE * INTERACT_RANGE
    })
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
      r()
    }
    advanceMoves(dt) // M3b 走位驱动(实体巡逻/剧情走位;与输入无关,菜单/对话期照走)
    tickHostiles(dt) // B9 野怪遇敌驱动(数据化;追逐→开战→胜负)
    const pressed = keyboard.consumePressed()
    // M4b:战斗接管(大世界暂停;渲染/输入全走 BattleSession)
    if (activeBattle) {
      activeBattle.tick(dt, pressed)
      activeBattle.render(ctx, WORLD_SCALE)
      requestAnimationFrame(tick)
      return
    }
    const interact = pressed.has(' ') || pressed.has('Enter')
    const esc = pressed.has('Escape')

    // 三态优先级:菜单 > 对话 > 探索(用 else if 保证互斥)
    if (menu.active) {
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
        if (magicMenu.phase === 'pick-target') {
          // 选目标阶段:红箭头出;Enter 施法完成 / Esc 取消 → 都回选技能
          if (interact || esc) magicMenu = magicBackFromTarget(magicMenu)
        } else {
          // 选技能阶段:网格导航 + Enter → 进选目标;Esc 关仙术面板
          if (pressed.has('ArrowUp')) magicMenu = magicMoveCursor(magicMenu, 'up')
          if (pressed.has('ArrowDown')) magicMenu = magicMoveCursor(magicMenu, 'down')
          if (pressed.has('ArrowLeft')) magicMenu = magicMoveCursor(magicMenu, 'left')
          if (pressed.has('ArrowRight')) magicMenu = magicMoveCursor(magicMenu, 'right')
          if (interact) magicMenu = magicConfirmSpell(magicMenu)
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
            const r = useApply(useMenu, world, world.party[0]?.id ?? '', project.items)
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
            const r = useConfirm(useMenu, world, project.items)
            if (r.kind === 'direct') world = r.world // 脚本/全体类:已直接执行,回写 world
            useMenu = r.state
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
              // 退出(本期占位:无标题屏)→ 留菜单层显「未实现」(关面板的话提示就看不到)
              systemPlaceholder = 'menu.not-implemented'
              systemMenu = { ...systemMenu, phase: 'menu', confirmYes: false }
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
            if (r.action?.kind === 'open-save') {
              saveBrowser = openSaveBrowser('save', saveMetas) // 开浏览界面·存模式
              overwriteYes = false
            } else if (r.action?.kind === 'open-load') {
              saveBrowser = openSaveBrowser('load', saveMetas) // 开浏览界面·读模式
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
          const caster = world.party[0]
          // 进面板初始化子态:仙术解析可用 / 装备解析可装
          if (menu.openPanel === 'magic') {
            magicMenu = openMagicMenu(
              caster ? resolveOutdoorSkills(world, caster.id, project.skills) : [],
            )
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
        menu = openMenu()
        // 抓当前干净游戏帧(此刻菜单尚未画)→ 菜单内存档的缩略图源
        void captureThumbnail(canvas).then((b) => {
          lastGameThumb = b
        })
      } else if (interact) {
        const trig = findTrigger('interact')
        if (trig) {
          fireTrigger(trig) // M3a:迁移触发脚本优先
        } else {
          const ent = nearbyInteractable()
          const dlg = ent?.interact ? dialogueById(ent.interact) : undefined
          if (dlg) dialogBox.open(startDialogue(dlg), t) // demo 旧路:对话 id
        }
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
          if (dir !== facing) {
            facing = dir // 转向：换方向时立刻能起步（stepAcc 拉满）
            stepAcc = STEP_MS
          }
          stepAcc += dt
          // 每 STEP_MS 走一步（~10fps 步进 = 卡顿感）：意图 → 纯函数碰撞 → 结果 + 走帧推进
          while (stepAcc >= STEP_MS) {
            stepAcc -= STEP_MS
            const next = resolveMove(player.pos, WALK_STEP[dir], isBlocked)
            if (next.col === player.pos.col && next.row === player.pos.row) {
              // 撞禁入(墙/实体):停下、不原地踏步——站立帧 + 复位迈腿相位 + 清累加(同松键停步)
              walking = false
              stepFrame = (stepFrame & 2) ^ 2
              stepAcc = 0
              break
            }
            player.pos = next
            walking = true
            partyGesture = null // 原版走路每步重算 wFrame(脚本姿势自然失效)
            stepFrame = (stepFrame + 1) % 4
            // M3a touch 触发:边沿语义(落步才查),站着不重触发(一阶段 TouchFar 死锁的架构性规避)
            const touched = findTrigger('touch')
            if (touched) {
              fireTrigger(touched)
              break
            }
          }
        } else if (walking) {
          walking = false
          stepFrame = (stepFrame & 2) ^ 2 // 停步复位迈腿相位（scene.c:773-774）
          stepAcc = 0
        }
      }
    }

    render()
    requestAnimationFrame(tick)
  }
  void refreshSaveMetas() // 预载已有存档 metas + 缩略图(浏览界面首开即有内容)
  // M3a boot:应用世界脚本态 + 跑入口场景 onEnter(演出/音乐/战场配置)+ auto 巡逻
  applyWorldToScene()
  startAutoRunners()
  // ?battle=<team 号>:直开一场战斗(编辑器「⚔ 试打」入口;跳过 onEnter 演出。team 号 0-based)
  const battleRaw = params.get('battle')
  const battleParam = battleRaw === null ? Number.NaN : Number(battleRaw)
  if (Number.isFinite(battleParam) && battleParam >= 0) {
    void host.startBattle(battleParam).then((r) => showToast(`试打结束:${r}`))
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

main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e)
  ctx.fillStyle = '#200'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#f55'
  ctx.font = '12px monospace'
  ctx.fillText(`reforge ERR: ${msg}`, 10, 24)
  console.error('[reforge]', e)
})
