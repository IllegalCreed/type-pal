import type { Palette, Tilemap } from '@type-pal/shared'
import type { GameState } from '../core/game-state.js'
import { type Framebuffer, SCREEN_W, SCREEN_H } from './framebuffer.js'
import { drawTilemap, type TileImages } from './draw-tilemap.js'
import { drawSprite, type SpriteImage } from './draw-sprite.js'
import { drawDialogBox } from './draw-dialog-box.js'

export interface PresentContext {
  tilemap: Tilemap
  tileImages: TileImages
  partySprite: SpriteImage
  npcSprites: Map<number, SpriteImage>
}

const TILE_W = 32
const ROW_Y_STEP = 16 // sdlpal map.c:398 — 每 row 步进 16 px

const SCREEN_CENTER_X = SCREEN_W >> 1
const SCREEN_CENTER_Y = SCREEN_H >> 1

function cellToScreen(
  cell: { col: number; row: number },
  camera: { col: number; row: number },
): { sx: number; sy: number } {
  const cellPxX = cell.col * TILE_W
  const cellPxY = cell.row * ROW_Y_STEP
  const camPxX = camera.col * TILE_W
  const camPxY = camera.row * ROW_Y_STEP
  return {
    sx: cellPxX - camPxX + SCREEN_CENTER_X,
    sy: cellPxY - camPxY + SCREEN_CENTER_Y,
  }
}

export function presentFrame(
  fb: Framebuffer,
  gs: GameState,
  ctx: PresentContext,
): void {
  fb.clear()

  // 1. tilemap layer 0(底层 — 地砖、墙基)
  drawTilemap(fb, ctx.tilemap, ctx.tileImages, gs.camera, 0)

  // 2. NPCs + 队长精灵
  for (const npc of gs.npcs) {
    const sprite = ctx.npcSprites.get(npc.spriteNum)
    if (!sprite) continue
    const { sx, sy } = cellToScreen(npc, gs.camera)
    drawSprite(fb, sprite, sx, sy)
  }
  const { sx, sy } = cellToScreen(gs.party, gs.camera)
  drawSprite(fb, ctx.partySprite, sx, sy)

  // 3. tilemap layer 1(顶层 — 门、柜子侧面、柱子;画在精灵之上做遮挡)
  drawTilemap(fb, ctx.tilemap, ctx.tileImages, gs.camera, 1)

  // 4. 对话框(最上层)
  if (gs.dialogBox) {
    drawDialogBox(fb, gs.dialogBox.text, gs.dialogBox.style)
  }
}

export function flushToCanvas(
  fb: Framebuffer,
  ctx2d: CanvasRenderingContext2D,
  palette: Palette,
): void {
  const img = fb.toImageData(palette)
  ctx2d.putImageData(img, 0, 0)
}
