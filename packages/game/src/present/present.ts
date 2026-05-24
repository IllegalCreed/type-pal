import type { Palette, Tilemap } from '@type-pal/shared'
import type { BusEntry } from '../core/command-bus.js'
import type { GameState } from '../core/game-state.js'
import type { BattlePresent, BattleAssets } from './battle/present-battle.js'
import { type Framebuffer, SCREEN_W, SCREEN_H } from './framebuffer.js'
import { drawTilemap, type TileImages } from './draw-tilemap.js'
import { drawSprite, type SpriteImage } from './draw-sprite.js'
import { drawDialogBox } from './draw-dialog-box.js'
import type { GlyphTable } from './font.js'

export interface PresentContext {
  tilemap: Tilemap
  tileImages: TileImages
  /** 队长 sprite 全帧。sdlpal `scene.c:750-755` 站立公式 `wFrame = wDirection * walkFrames`;
   *  WIN95 party sprite 默认 12 帧 = 4 方向 × 3 帧。本字段为完整 frame 数组,
   *  presentFrame 按 `gs.party.facing` + walkFrames 取站立帧。 */
  partyFrames: SpriteImage[]
  /** sdlpal `PlayerRoles.rgwWalkFrames[role]`,默认 3(scene.c:752 `if (i == 0) i = 3`)。 */
  partyWalkFrames: number
  npcSprites: Map<number, SpriteImage>
  /** M4 P4.T3: Unifont glyph table(启动时 loadGlyphs 注入,缺省则所有文字渲染为 tofu)。 */
  glyphs?: GlyphTable
}

/** sdlpal `palcommon.h`:kDirSouth=0 / kDirWest=1 / kDirNorth=2 / kDirEast=3。 */
const FACING_TO_DIRECTION: Record<'down' | 'left' | 'up' | 'right', number> = {
  down: 0, left: 1, up: 2, right: 3,
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
  // 按 sdlpal `scene.c:755` 站立公式 wFrame = wDirection * walkFrames 取帧。
  const direction = FACING_TO_DIRECTION[gs.party.facing]
  const frameIdx = direction * ctx.partyWalkFrames
  const partyFrame = ctx.partyFrames[frameIdx] ?? ctx.partyFrames[0]
  if (partyFrame) drawSprite(fb, partyFrame, sx, sy)

  // 3. tilemap layer 1(顶层 — 门、柜子侧面、柱子;画在精灵之上做遮挡)
  drawTilemap(fb, ctx.tilemap, ctx.tileImages, gs.camera, 1)

  // 4. 对话框(最上层)
  if (gs.dialogBox) {
    drawDialogBox(fb, gs.dialogBox.text, gs.dialogBox.style, ctx.glyphs)
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

/**
 * M3 T28 战斗一帧入口 —— 委托 BattlePresent.draw 装配。
 *
 * 注意:M2 explore / event 一帧由 `presentFrame` 处理(不消费 commands);
 * 战斗一帧需消费 `commands`(showDamageNum 进 floating nums)。
 *
 * @param fb        屏幕 framebuffer
 * @param gs        GameState(必须 gs.mode='battle' && gs.battleState 存在)
 * @param battle    BattlePresent 实例(持有 floating nums 跨帧状态)
 * @param assets    战斗资源(sprites / bgs / 表)
 * @param commands  本帧 bus.drain() 命令列表
 * @returns true 表示画了战斗帧;false 表示 gs 不是 battle 模式或缺 battleState(调用方应回落 presentFrame)
 */
export function presentBattleFrame(
  fb: Framebuffer,
  gs: GameState,
  battle: BattlePresent,
  assets: BattleAssets,
  commands: BusEntry[],
): boolean {
  if (gs.mode !== 'battle' || !gs.battleState) return false
  fb.clear()
  battle.draw(fb, gs, gs.battleState, commands, assets, gs.frameNum)
  return true
}
