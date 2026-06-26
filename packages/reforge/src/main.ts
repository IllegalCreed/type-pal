import {
  type Dialogue,
  type DialogueLine,
  type EntityDef,
  type Facing,
  guijieMinjuScene,
  lookupText,
  zhLocale,
} from '@type-pal/content'
import type { Palette } from '@type-pal/shared'
import { type LoadedSprite, loadPalette, loadSprite, loadTilemap, loadTileset } from './assets.js'
import { buildIsBlocked } from './collision.js'
import { advancePage, type DialogueState, pageLines, startDialogue } from './dialogue.js'
import { Keyboard } from './input.js'
import { resolveMove } from './movement.js'
import { Canvas2DRenderer, type SpriteDraw } from './render.js'

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
// 方向 → 世界步进（scene-system X_STEP=16 / Y_STEP=8，等距对角）
const WALK_STEP: Record<Facing, { dx: number; dy: number }> = {
  down: { dx: -16, dy: 8 },
  up: { dx: 16, dy: -8 },
  left: { dx: -16, dy: -8 },
  right: { dx: 16, dy: 8 },
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

const mapNum = guijieMinjuScene.map.reuseOriginalMap // 56

// 调色板编号由 scene 进入脚本 setPalette 决定，demo 未跑脚本 → 先试 0；颜色不对再换号。
const PALETTE_ID = Number(new URLSearchParams(location.search).get('pal') ?? 0)

// 调试：?collision 把障碍格(0x2000)染色盖在画面上，肉眼比对禁入格 vs 视觉墙。
const DEBUG_COLLISION = new URLSearchParams(location.search).has('collision')

async function main(): Promise<void> {
  const [map, tiles, palette] = await Promise.all([
    loadTilemap(mapNum),
    loadTileset(mapNum),
    loadPalette(PALETTE_ID),
  ])

  // 调试：?gallery 渲染精灵速查图（确认哪个 spriteNum 是人/物），不进场景。
  if (new URLSearchParams(location.search).has('gallery')) {
    await renderSpriteGallery(palette)
    return
  }

  // 切片：只取 room#0。视口 320×200（原版分辨率）；相机跟随玩家、夹在房间范围内。
  const room = guijieMinjuScene.map.room
  const VIEW_W = 320
  const VIEW_H = 200
  const PARTY_OX = 160 // 玩家在屏幕上的落点（PARTYOFFSET，原版 160 / 112）
  const PARTY_OY = 112
  canvas.width = VIEW_W
  canvas.height = VIEW_H
  // 房间世界包围盒（上方多留容高家具）
  const roomMinX = room.col * TILE_W - TILE_W
  const roomMinY = room.row * TILE_H - 40
  const roomMaxX = (room.col + room.cols) * TILE_W + TILE_W
  const roomMaxY = (room.row + room.rows) * TILE_H + 16

  const renderer = new Canvas2DRenderer(ctx, palette, tiles)
  const camera = { x: 0, y: 0 }
  const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)
  function updateCamera(): void {
    camera.x = clamp(player.pos.x - PARTY_OX, roomMinX, Math.max(roomMinX, roomMaxX - VIEW_W))
    camera.y = clamp(player.pos.y - PARTY_OY, roomMinY, Math.max(roomMinY, roomMaxY - VIEW_H))
  }

  // 精灵：李逍遥 = 原版 spriteNum 2；鬼 = 占位 sprite 16（原版一老者，比箱子像样；鬼气化留后续 polish）。
  const [playerSprite, ghostSprite] = await Promise.all([loadSprite(2), loadSprite(16)])
  const ghost = requireFirst(guijieMinjuScene.entities, '场景缺少鬼实体')
  const player = { pos: { ...guijieMinjuScene.entry.pos } }
  let activeDialogue: DialogueState | null = null
  let facing: Facing = guijieMinjuScene.entry.facing
  let walking = false
  let stepFrame = 0 // 0..3 走帧相位
  let stepAcc = 0 // 步进累加器（ms）
  let lastT = 0

  function render(): void {
    renderer.clear()
    updateCamera() // 相机跟随玩家
    // 精灵 + 高物瓦片由 renderScene 按投影 Y 统一深度排序（遮挡）；地板自动铺底。
    const sprites: SpriteDraw[] = []
    const gf = ghostSprite.frames[0]
    if (gf) {
      sprites.push({
        frame: gf,
        worldX: ghost.pos.x,
        worldY: ghost.pos.y,
        anchorX: ghostSprite.anchorX,
        anchorY: ghostSprite.anchorY,
      })
    }
    const dir = FACING_TO_DIR[facing]
    const fi = walking ? dir * WALK_FRAMES + (STEP_CYCLE[stepFrame] ?? 0) : dir * WALK_FRAMES
    const pf = playerSprite.frames[fi] ?? playerSprite.frames[0]
    if (pf) {
      sprites.push({
        frame: pf,
        worldX: player.pos.x,
        worldY: player.pos.y,
        anchorX: playerSprite.anchorX,
        anchorY: playerSprite.anchorY,
      })
    }
    renderer.renderScene(map, room, camera, sprites)
    if (DEBUG_COLLISION) drawCollisionOverlay()
    if (activeDialogue) drawDialogueBox(pageLines(activeDialogue))
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
          ctx.fillStyle = isBlocked(pt.x, pt.y) ? 'rgba(255,40,40,0.95)' : 'rgba(50,255,50,0.7)'
          ctx.fillRect(pt.x - camera.x - 1, pt.y - camera.y - 1, 2, 2)
        }
      }
    }
    ctx.fillStyle = '#ffff00' // 玩家脚点
    ctx.fillRect(player.pos.x - camera.x - 2, player.pos.y - camera.y - 2, 4, 4)
    ctx.restore()
  }

  // 移动 + 交互。相机固定（整间屋上屏）。
  const isBlocked = buildIsBlocked(map)
  const keyboard = new Keyboard()
  const INTERACT_RANGE = 48 // 像素：靠近实体即可交互

  // 调试 / 验证：暴露活动态
  ;(window as unknown as { __reforge?: unknown }).__reforge = {
    player,
    ghost,
    room,
    get dialogue() {
      return activeDialogue
    },
  }

  function dialogueById(id: string): Dialogue | undefined {
    return guijieMinjuScene.dialogues.find((d) => d.id === id)
  }

  /** 玩家附近、可交互的实体（取首个有 interact 且在范围内的）。 */
  function nearbyInteractable(): EntityDef | undefined {
    return guijieMinjuScene.entities.find((e) => {
      if (!e.interact) return false
      const ex = e.pos.x - player.pos.x
      const ey = e.pos.y - player.pos.y
      return ex * ex + ey * ey <= INTERACT_RANGE * INTERACT_RANGE
    })
  }

  function drawDialogueBox(lines: DialogueLine[]): void {
    if (lines.length === 0) return
    const W = canvas.width
    const H = canvas.height
    const boxH = 60
    const top = H - boxH - 6
    ctx.save()
    ctx.globalAlpha = 0.86
    ctx.fillStyle = '#1a120b'
    ctx.fillRect(6, top, W - 12, boxH)
    ctx.globalAlpha = 1
    ctx.strokeStyle = '#d8b365'
    ctx.strokeRect(6, top, W - 12, boxH)
    // 继续提示：右上角小字
    ctx.fillStyle = '#7a6a4a'
    ctx.font = '8px monospace'
    ctx.fillText('[空格] 继续', W - 62, top + 12)
    // 逐行：speaker(姓名牌简版) + 正文,都经 locale 查表。着色 / 字模 / 打字留 ②。
    let ty = top + 26
    for (const line of lines) {
      if (line.speaker) {
        ctx.fillStyle = '#d8b365'
        ctx.font = '13px "Songti SC","SimSun",serif'
        ctx.fillText(`${lookupText(line.speaker, zhLocale)}：`, 14, ty)
        ty += 19
      }
      ctx.fillStyle = '#f0e0b0'
      ctx.font = '13px "Songti SC","SimSun",serif'
      ctx.fillText(lookupText(line.text, zhLocale), 14, ty)
      ty += 19
    }
    ctx.restore()
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

    if (activeDialogue) {
      if (interact) activeDialogue = advancePage(activeDialogue) // 翻页;翻完 → null(关闭)
    } else {
      if (interact) {
        const ent = nearbyInteractable()
        const dlg = ent?.interact ? dialogueById(ent.interact) : undefined
        if (dlg) activeDialogue = startDialogue(dlg)
      }
      if (!activeDialogue) {
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
            player.pos = resolveMove(player.pos, WALK_STEP[dir], isBlocked)
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
  requestAnimationFrame(tick)

  console.log(
    '[reforge] room#0 可玩：方向键走（10fps 步进 + 朝向 + 走帧）/ 撞墙，靠近老者按空格搭话',
  )
}

/** 调试速查：把 spriteNum 0..47 的第 0 帧排成网格 + 标号，肉眼分辨人 / 物。 */
async function renderSpriteGallery(palette: Palette): Promise<void> {
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
      sp = await loadSprite(id)
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
