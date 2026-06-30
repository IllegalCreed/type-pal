import {
  buildWorld,
  type Dialogue,
  type EntityDef,
  type Facing,
  type GridPos,
  gridToPixel,
  lookupText,
  pixelToGrid,
  spriteScreenY,
} from '@type-pal/content'
import type { Palette } from '@type-pal/shared'
import {
  type AssetBase,
  type LoadedSprite,
  loadGlyphs,
  loadPalette,
  loadSprite,
  loadTilemap,
  loadTileset,
} from './assets.js'
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
import { type LoadedProject, loadProject } from './loader.js'
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
import { Canvas2DRenderer, type SpriteDraw } from './render.js'
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

// 大世界精灵帧 + 移动手感（port sdlpal）。4 方向 × 3 帧；4 向移动 = 等距对角世界位移。
const WALK_FRAMES = 3
const FACING_TO_DIR: Record<Facing, number> = { down: 0, left: 1, up: 2, right: 3 }
const STEP_CYCLE = [0, 1, 0, 2] // iStepFrameLeader（scene.c:663）：站 / 迈左 / 站 / 迈右
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

/** 取数组首元素,空则抛——让类型非空(闭包内可用,替代 entities[0]! 断言)。 */
function requireFirst<T>(arr: readonly T[], what: string): T {
  const v = arr[0]
  if (!v) throw new Error(`reforge: ${what}`)
  return v
}

const canvas = document.getElementById('screen') as HTMLCanvasElement
const ctx = get2dContext(canvas)

// 调色板编号由 scene 进入脚本 setPalette 决定，demo 未跑脚本 → 先试 0；颜色不对再换号。
const PALETTE_ID = Number(new URLSearchParams(location.search).get('pal') ?? 0)

// 调试：?collision 把障碍格(0x2000)染色盖在画面上，肉眼比对禁入格 vs 视觉墙。
const DEBUG_COLLISION = new URLSearchParams(location.search).has('collision')

async function main(): Promise<void> {
  // 工程化:运行期加载工程(vite define 注入 VITE_PROJECT_ID;缺省 guijie-dlc)。
  const PROJECT_ID = import.meta.env.VITE_PROJECT_ID ?? 'guijie-dlc'
  const project: LoadedProject = await loadProject(PROJECT_ID)
  const scene = project.entryScene // 入口场景(= 旧 scene)
  const mapNum = scene.map.reuseOriginalMap
  const [map, tiles, palette, glyphs, cursorFrames] = await Promise.all([
    loadTilemap(project.assetBase, mapNum),
    loadTileset(project.assetBase, mapNum),
    loadPalette(project.assetBase, PALETTE_ID),
    loadGlyphs(),
    loadCursorFrames().catch((err: unknown) => {
      console.warn('[reforge] cursor icons 加载失败,降级无光标:', err)
      return []
    }),
  ])
  // portraits 已是预烘 RGBA PNG(@type-pal/migrate bake-assets),不再需 palette 着色
  const portraits = await loadPortraits([1, 2]).catch((err: unknown) => {
    console.warn('[reforge] portraits 加载失败,降级无头像:', err)
    return new Map<number, HTMLCanvasElement>()
  })

  // 调试：?gallery 渲染精灵速查图（确认哪个 spriteNum 是人/物），不进场景。
  if (new URLSearchParams(location.search).has('gallery')) {
    await renderSpriteGallery(project.assetBase, palette)
    return
  }

  // 切片：只取 room#0。逻辑视口 320×200;物理 canvas 1280×800(4x),世界渲染 ×4 放大(D16)。
  const room = scene.map.room
  const WORLD_SCALE = 4 // 逻辑 320×200 → 物理 1280×800;整数倍 + pixelated 保点阵锐利
  const VIEW_W = 320
  const VIEW_H = 200
  const PARTY_OX = 160 // 玩家在屏幕上的落点（PARTYOFFSET，原版 160 / 112）
  const PARTY_OY = 112
  // 房间世界包围盒（上方多留容高家具）
  const roomMinX = room.col * TILE_W - TILE_W
  const roomMinY = room.row * TILE_H - 40
  const roomMaxX = (room.col + room.cols) * TILE_W + TILE_W
  const roomMaxY = (room.row + room.rows) * TILE_H + 16

  const renderer = new Canvas2DRenderer(ctx, palette, tiles)
  const camera = { x: 0, y: 0 }
  const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)
  function updateCamera(): void {
    const pp = gridToPixel(player.pos)
    camera.x = clamp(pp.x - PARTY_OX, roomMinX, Math.max(roomMinX, roomMaxX - VIEW_W))
    camera.y = clamp(pp.y - PARTY_OY, roomMinY, Math.max(roomMinY, roomMaxY - VIEW_H))
  }

  // 精灵：李逍遥 = 原版 spriteNum 2；鬼 = 占位 sprite 16（原版一老者，比箱子像样；鬼气化留后续 polish）。
  const [playerSprite, ghostSprite] = await Promise.all([
    loadSprite(project.assetBase, 2),
    loadSprite(project.assetBase, 16),
  ])
  const ghost = requireFirst(scene.entities, '场景缺少鬼实体')
  const player: { pos: GridPos } = { pos: { ...scene.entry.pos } }
  const dialogBox = new DialogBox(ctx, glyphs, cursorFrames, portraits, project.locale)
  let world = buildWorld(project.manifest.startWorld, project.charactersById)
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
  const SCENE_ID = project.manifest.entryScene
  const MAP_NAME = project.manifest.name
  let facing: Facing = scene.entry.facing
  let walking = false
  let stepFrame = 0 // 0..3 走帧相位
  let stepAcc = 0 // 步进累加器（ms）
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
      { sceneId: SCENE_ID, pos: player.pos, facing },
      project.manifest.id,
      project.manifest.contentVersion,
    )
    await saveStore.putSlot(meta, payload, thumb)
    await refreshSaveMetas()
  }

  async function doLoad(slotId: SlotId): Promise<boolean> {
    const p = await saveStore.getPayload(slotId)
    if (!p) return false
    // 存档绑工程:projectId 不匹配(把 A 工程存档读进 B 工程)→ 拒绝,防世界态错乱。
    if (p.projectId !== project.manifest.id) {
      console.warn(
        `[save] 槽 ${slotId} 属工程 "${p.projectId}",与当前 "${project.manifest.id}" 不匹配,拒绝读档`,
      )
      return false
    }
    world = p.world
    player.pos = p.position.pos
    facing = p.position.facing
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
    renderer.clear()
    updateCamera() // 相机跟随玩家
    // 精灵 + 高物瓦片由 renderScene 按投影 Y 统一深度排序（遮挡）；地板自动铺底。
    const sprites: SpriteDraw[] = []
    const gf = ghostSprite.frames[0]
    if (gf) {
      const gp = gridToPixel(ghost.pos)
      sprites.push({
        frame: gf,
        worldX: gp.x,
        worldY: spriteScreenY(ghost.pos), // 含 height 上移(D16);地面=0 同 gp.y
        anchorX: ghostSprite.anchorX,
        anchorY: ghostSprite.anchorY,
      })
    }
    const dir = FACING_TO_DIR[facing]
    const fi = walking ? dir * WALK_FRAMES + (STEP_CYCLE[stepFrame] ?? 0) : dir * WALK_FRAMES
    const pf = playerSprite.frames[fi] ?? playerSprite.frames[0]
    if (pf) {
      const pp = gridToPixel(player.pos)
      sprites.push({
        frame: pf,
        worldX: pp.x,
        worldY: spriteScreenY(player.pos), // 含 height 上移(D16);地面=0 同 pp.y
        anchorX: playerSprite.anchorX,
        anchorY: playerSprite.anchorY,
      })
    }
    // 世界 + debug 在 320 逻辑坐标画,整体 ×WORLD_SCALE 放大到物理 canvas(D16)。
    ctx.save()
    ctx.scale(WORLD_SCALE, WORLD_SCALE)
    ctx.imageSmoothingEnabled = false // 最近邻,点阵/瓦片整数倍放大不糊
    renderer.renderScene(map, room, camera, sprites)
    if (DEBUG_COLLISION) drawCollisionOverlay()
    ctx.restore()
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
    isBlockedAt(map, pos) || scene.entities.some((e) => e.collide === true && sameGrid(pos, e.pos))
  const keyboard = new Keyboard()
  const INTERACT_RANGE = 48 // 像素：靠近实体即可交互

  // 调试 / 验证：暴露活动态
  ;(window as unknown as { __reforge?: unknown }).__reforge = {
    player,
    ghost,
    room,
    get dialogue() {
      return dialogBox.active
    },
  }

  function dialogueById(id: string): Dialogue | undefined {
    return scene.dialogues.find((d) => d.id === id)
  }

  /** 玩家附近、可交互的实体（取首个有 interact 且在像素范围内的）。 */
  function nearbyInteractable(): EntityDef | undefined {
    const pp = gridToPixel(player.pos)
    return scene.entities.find((e) => {
      if (!e.interact) return false
      const ep = gridToPixel(e.pos)
      const ex = ep.x - pp.x
      const ey = ep.y - pp.y
      return ex * ex + ey * ey <= INTERACT_RANGE * INTERACT_RANGE
    })
  }

  /** 当前按下的方向键 → 朝向（优先级 上 > 下 > 左 > 右，4 向单选）。 */
  function heldDir(): Facing | null {
    if (keyboard.isDown('ArrowUp')) return 'up'
    if (keyboard.isDown('ArrowDown')) return 'down'
    if (keyboard.isDown('ArrowLeft')) return 'left'
    if (keyboard.isDown('ArrowRight')) return 'right'
    return null
  }

  function tick(t: number): void {
    const dt = lastT ? Math.min(t - lastT, 100) : 0 // 钳制 dt 防后台切回爆步
    lastT = t
    const pressed = keyboard.consumePressed()
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
        const ent = nearbyInteractable()
        const dlg = ent?.interact ? dialogueById(ent.interact) : undefined
        if (dlg) dialogBox.open(startDialogue(dlg), t) // 分页由 DialogBox 按显示行算
      }
      if (!menu.active && !dialogBox.active) {
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
            stepFrame = (stepFrame + 1) % 4
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
  requestAnimationFrame(tick)

  console.log(
    '[reforge] room#0 可玩：方向键走（10fps 步进 + 朝向 + 走帧）/ 撞墙，靠近老者按空格搭话',
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
