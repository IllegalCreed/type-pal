import {
  buildWorld,
  type Dialogue,
  effectiveStat,
  type DialogueLine,
  emptyWorldScriptState,
  type EntityDef,
  type Facing,
  type GridPos,
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
  loadGlyphs,
  loadPalette,
  loadSprite,
  loadTilemap,
  loadTileset,
} from './assets.js'
import { getEnemyBasePos, getPlayerBasePos } from './battle/battle-positions.js'
import { BattleSession } from './battle/battle-session.js'
import { type BattleSpriteDraw, renderBattleScene } from './battle/present-battle.js'
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
import { ScriptRunner, type ScriptHost } from './script-runner.js'
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
import { loadMenuAssets, MenuBox } from './menu/menu-box.js'
import { drawSaveBrowser } from './menu/save-browser-box.js'
import { drawSystemMenu } from './menu/system-box.js'
import { drawUseMenu } from './menu/use-box.js'
import { back, CLOSED, confirm, type MenuState, moveCursor, openMenu } from './menu-state.js'
import { resolveMove } from './movement.js'
import { Canvas2DRenderer, type CellRect, type SpriteDraw } from './render.js'
import { renderSceneFrame } from './render-scene.js'
import { idleFrameIndex, walkFrameIndex } from './sprite-anim.js'
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
import {
  closeSystemMenu,
  openSystemMenu,
  type SystemMenuState,
  systemConfirm,
  systemConfirmYes,
  systemMoveCursor,
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
  const portraits = await loadPortraits(portraitChunks).catch((err: unknown) => {
    console.warn('[reforge] portraits 加载失败,降级无头像:', err)
    return new Map<number, HTMLCanvasElement>()
  })

  // ── 场景资产缓存(M2c,设计 §3):map/tileset 按 mapNum LRU(cap16 + protect 当前,
  // 修一阶段按 sceneId 双取坑);palette/sceneDef 小缓存;精灵跨场景累积。──
  const MAP_CACHE_CAP = 16
  const mapCache = new Map<number, { map: Tilemap; tiles: Map<number, RleFrame> }>()
  async function getMapAssets(mapNum: number): Promise<{ map: Tilemap; tiles: Map<number, RleFrame> }> {
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
    const hit = sceneDefCache.get(id)
    if (hit) return hit
    const def = await loadSceneDef(project, id)
    sceneDefCache.set(id, def)
    return def
  }
  const spriteByNum = new Map<number, LoadedSprite>()

  // 调试：?gallery 渲染精灵速查图（确认哪个 spriteNum 是人/物），不进场景。
  if (params.has('gallery')) {
    await renderSpriteGallery(project.assetBase, await getPalette(0))
    return
  }

  // M4b-1：?battle=<field>&enemies=1,2,3 战斗场景预览（不进主循环,验证 loader+摆位+渲染）。
  if (params.has('battle')) {
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
    camera.x = clamp(pp.x - PARTY_OX + cameraOffset.x, viewMinX, Math.max(viewMinX, viewMaxX - VIEW_W))
    camera.y = clamp(pp.y - PARTY_OY + cameraOffset.y, viewMinY, Math.max(viewMinY, viewMaxY - VIEW_H))
  }

  // 精灵解析(C0):实体 → actor/prop → sprites 注册表;玩家 = party[0] 的 ActorDef.spriteId。
  const requireSpriteDef = (spriteId: string | undefined, what: string): SpriteDef => {
    const def = spriteId ? project.spritesById[spriteId] : undefined
    if (!def) throw new Error(`reforge: ${what} 的精灵 "${spriteId ?? '(未解析)'}" 不在 sprites 注册表`)
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
  }

  // 初始场景:?scene=<id> dev 直达(须在 index),否则 manifest 入口
  const sceneParam = params.get('scene')
  const initialSceneId =
    sceneParam && project.sceneIds.includes(sceneParam) ? sceneParam : project.entryScene.id
  await switchScene(initialSceneId)
  const playerSprite = spriteByNum.get(leaderSpriteDef.spriteNum)!
  const dialogBox = new DialogBox(ctx, glyphs, cursorFrames, portraits, project.locale)
  let world = buildWorld(project.manifest.startWorld, project.actorsById)
  world.script ??= emptyWorldScriptState()

  // ══ M3a 脚本运行时(设计 §4:driver Promise + AbortSignal;tick 驱动计时/淡入淡出)══
  let runner: ScriptRunner | null = null
  let scriptAbort: AbortController | null = null
  let pendingOnEnter: string | null = null // loadScene 后待跑的新场景 onEnter(当前脚本收尾后)
  let nowMs = 0 // tick 注入的时间源(driver 计时用)
  const timers: { deadline: number; resolve: () => void }[] = []
  let fadeFx: { dir: 'in' | 'out'; start: number; ms: number; resolve: () => void } | null = null
  let fadeBlack = 0 // 0 透明 → 1 全黑(fade out 后保持,fade in 释放)
  let scriptDialogResolve: (() => void) | null = null
  const entityFrameOverride = new Map<string, number>() // setEntityFrame 演出帧覆盖(切场景清)
  // ── 0x15/0x65 队长演出态(原版 rgParty[].wFrame / rgwSpriteNum;脚本自清,走路时引擎清)──
  let partyGesture: number | null = null // 脚本姿势帧(渲染 = dir*framesPerDir + gesture)
  let leaderSpriteOverride: { def: SpriteDef; frames: typeof playerSprite } | null = null // 0x65 换装
  let activeBattle: BattleSession | null = null // M4b:进行中的战斗(主循环转发 tick/render)
  // ── M3b 走位/动画驱动(tick 推进;abort 全兑现)──
  const SPEED_MS: Record<string, number> = { slow: 200, normal: 130, fast: 100, run: 50 }
  const entityMoves = new Map<string, { to: GridPos; stepMs: number; acc: number; resolve: () => void }>()
  let partyMove: { to: GridPos; stepMs: number; acc: number; resolve: () => void } | null = null
  const entityAnim = new Map<string, number>() // 实体走帧计数(移动/0x87 动画共用)
  // auto 巡逻:每实体独立 runner(主脚本期间暂停;切场景全停)
  const autoAborts = new Map<string, AbortController>()
  let cameraPanFx: { fromX: number; fromY: number; dx: number; dy: number; steps: number; done: number; resolve: () => void } | null = null

  /** 世界脚本状态 → 场景实体(entityState:≤0 隐,≥2 挡路;进场/读档/设态后重放)。 */
  function applyWorldToScene(): void {
    for (const e of scene.entities) {
      const st = world.script?.entityState[e.id]
      if (st === undefined) continue
      e.hidden = st <= 0
      e.collide = st >= 2
    }
  }

  function hostFade(dir: 'in' | 'out', ms: number): Promise<void> {
    return new Promise((resolve) => {
      fadeFx = { dir, start: nowMs, ms, resolve }
    })
  }

  const host: ScriptHost = {
    dialog: (line: DialogueLine) =>
      new Promise((resolve) => {
        dialogBox.open(startDialogue({ id: '__script', lines: [line] }), nowMs)
        scriptDialogResolve = resolve // tick 检测 dialogBox 关闭时兑现
      }),
    clearDialog: () => dialogBox.close(),
    fade: (dir, ms) => hostFade(dir, ms),
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
      const frames = spriteByNum.get(def.spriteNum) ?? (await loadSprite(project.assetBase, def.spriteNum))
      spriteByNum.set(def.spriteNum, frames)
      // 切回本体精灵 = 撤销覆盖(严格等价:override 恒生效,但本体时置 null 让存档/调试态干净)
      leaderSpriteOverride = def.spriteNum === leaderSpriteDef.spriteNum ? null : { def, frames }
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
      world.script!.vars['sys:music'] = id // 槽位记账;播放归音频期
    },
    setBattleMusic: (id) => {
      world.script!.vars['sys:battleMusic'] = id
    },
    setBattleField: (id) => {
      world.script!.vars['sys:battleField'] = id
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
        cameraPanFx = { fromX: cameraOffset.x, fromY: cameraOffset.y, dx, dy, steps: frames, done: 0, resolve }
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
    startBattle: async (team) => {
      const teamDef = project.enemyTeamsById[`team-${team}`]
      const enemyDefs = (teamDef?.members ?? [])
        .map((id) => project.enemiesById[id])
        .filter((e): e is NonNullable<typeof e> => !!e)
      if (enemyDefs.length === 0) {
        showToast(`遇敌 #${team} —— 敌队缺数据,桩胜(M4c)`)
        await host.wait(400)
        return 'win'
      }
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
      }))
      // 资产:战场背景(sys:battleField 记账 → 当前场景 palette 着色)+ 敌我战斗精灵
      const fieldId = world.script?.vars['sys:battleField'] ?? 24
      const [bg, enemySprites, playerSprites] = await Promise.all([
        loadBattleBg(project.assetBase, fieldId, palette).catch(() => undefined),
        Promise.all(enemyDefs.map((e) => loadBattleSprite(project.assetBase, 'enemy', e.spriteNum).catch(() => undefined))),
        Promise.all(
          world.party.map((c) =>
            loadBattleSprite(project.assetBase, 'player', project.actorsById[c.template]?.battler?.battleSpriteNum ?? 0).catch(() => undefined),
          ),
        ),
      ])
      const session = new BattleSession(
        players,
        enemyDefs,
        { bg, palette, glyphs, enemySprites, playerSprites },
        (roleId) => {
          const c = world.party.find((x) => x.id === roleId)
          return c ? lookupText(`name.${c.template}`, project.locale) : roleId
        },
        Math.random,
        // M4c:敌施法查技能表;难度预设(难度分级立项前恒 normal)
        { skills: project.skills, difficulty: 'normal' },
      )
      activeBattle = session
      const result = await session.done
      activeBattle = null
      // 写回战斗结果的 HP/MP(战斗内伤害持久;原版同)
      session.writeBackHp(world.party)
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
      inParty: (actorId) =>
        world.party.some((c) => c.id === actorId || c.template === actorId),
    },
    report: (msg) => {
      if (!import.meta.env.DEV) return
      if (reportedOnce.has(msg)) return // auto 循环会反复撞同一缺口,去重防刷屏
      reportedOnce.add(msg)
      console.warn('[script]', msg)
    },
  }
  const reportedOnce = new Set<string>()

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
      if (Math.abs(mv.to.col - player.pos.col) < 0.26 && Math.abs(mv.to.row - player.pos.row) < 0.26) {
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
    const r = new ScriptRunner(host, world.script!, ac.signal)
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
  function startScript(key: string, stages: readonly ScriptStage[]): void {
    if (runner) return
    scriptAbort = new AbortController()
    const r = new ScriptRunner(host, world.script!, scriptAbort.signal)
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
        if (pendingOnEnter) {
          const sid = pendingOnEnter
          pendingOnEnter = null
          if (scene.id === sid && scene.onEnter) startScript(`s:${sid}`, scene.onEnter)
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
    if (t) startScript(e.id, t.stages)
  }

  const menuAssets = await loadMenuAssets(project.items)
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
    world = p.world
    world.script ??= emptyWorldScriptState() // 旧档缺省 → 空态
    if (p.position.sceneId !== scene.id) {
      // M2c:跨场景读档 = 真 switchScene(带存档坐标落位)
      await switchScene(p.position.sceneId, { pos: p.position.pos, facing: p.position.facing })
    } else {
      player.pos = p.position.pos
      facing = p.position.facing
    }
    applyWorldToScene() // 实体隐现/挡路按存档世界态重放(读档不重跑 onEnter,对齐原版)
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
    const fi = partyGesture != null
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
      ctx.fillStyle = `rgba(0,0,0,${fadeBlack.toFixed(3)})`
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
    isBlockedAt(map, pos) || scene.entities.some((e) => !e.hidden && e.collide === true && sameGrid(pos, e.pos))
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
        if (systemMenu.phase === 'confirm') {
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
            const r = systemConfirm(systemMenu)
            systemMenu = r.state
            if (r.action?.kind === 'placeholder')
              systemPlaceholder = 'menu.not-implemented' // 占位项 → 提示
            else if (r.action?.kind === 'open-save') {
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
  if (scene.onEnter) startScript(`s:${scene.id}`, scene.onEnter)
  requestAnimationFrame(tick)

  console.log(
    '[reforge] room#0 可玩：方向键走（10fps 步进 + 朝向 + 走帧）/ 撞墙，靠近老者按空格搭话',
  )
}

/**
 * M4b-1 战斗场景预览：?battle=<field>&enemies=1,2,3 → 加载背景 + 敌队 + 队员战斗精灵,
 * 摆位渲染一帧。验证 loader + battle-positions + renderBattleScene(不进主循环/回合)。
 */
async function renderBattlePreview(
  project: LoadedProject,
  params: URLSearchParams,
): Promise<void> {
  const WORLD_SCALE = 4
  canvas.width = 320 * WORLD_SCALE
  canvas.height = 200 * WORLD_SCALE
  const palette = await loadPalette(project.assetBase, 0)
  // 真实战斗 field(场景 setBattleField 用 24/12/10/7…;field 2 是主菜单背景,勿用)。
  const field = params.get('battle') && Number(params.get('battle')) > 0 ? Number(params.get('battle')) : 24
  const bg = await loadBattleBg(project.assetBase, field, palette).catch((e: unknown) => {
    console.warn('[battle] bg 加载失败:', e)
    return undefined
  })
  const load = async (kind: 'enemy' | 'player', id: number): Promise<LoadedSprite | undefined> =>
    loadBattleSprite(project.assetBase, kind, id).catch((e: unknown) => {
      console.warn(`[battle] ${kind} 精灵 ${id} 加载失败:`, e)
      return undefined
    })

  const enemyIds = (params.get('enemies') ?? '1,2,3').split(',').map(Number).filter((n) => n >= 0)
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
  console.log(`[reforge] battle preview: field ${field}, ${enemies.length} 敌 / ${players.length} 队员`)
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
