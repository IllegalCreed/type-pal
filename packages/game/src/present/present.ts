import type { Palette, Tilemap } from '@type-pal/shared'
import type { BusEntry } from '../core/command-bus.js'
import type { GameState } from '../core/game-state.js'
import type { BattlePresent, BattleAssets } from './battle/present-battle.js'
import { type Framebuffer, SCREEN_W, SCREEN_H } from './framebuffer.js'
import { drawTilemap, addCoverTileEntries, type TileImages, type DrawEntry } from './draw-tilemap.js'
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

const SCREEN_CENTER_X = SCREEN_W >> 1
const SCREEN_CENTER_Y = SCREEN_H >> 1

/**
 * M5 P0.0 System A:1 OUR unit = 1 sdlpal pixel(无缩放)。
 * sdlpal scene.c PAL_SceneDrawSprites 等价:屏幕位 = world pos - viewport + CENTER。
 * X_STEP=16 / Y_STEP=8 是 sdlpal px(半 tile),tile=32×16 sdlpal px。
 */
function pixelToScreen(
  pos: { x: number; y: number },
  camera: { x: number; y: number },
): { sx: number; sy: number } {
  return {
    sx: pos.x - camera.x + SCREEN_CENTER_X,
    sy: pos.y - camera.y + SCREEN_CENTER_Y,
  }
}

export function presentFrame(
  fb: Framebuffer,
  gs: GameState,
  ctx: PresentContext,
): void {
  fb.clear()

  // sdlpal `PAL_MakeScene` (scene.c:480-491) 真实流程:
  //   1a. PAL_MapBlitToSurface(layer 0)— 底层全画
  //   1b. PAL_MapBlitToSurface(layer 1)— **顶层也全画**(cover tile 候选)
  //   2.  PAL_SceneDrawSprites():Y-sort sprites + cover tile entries(重画 layer-1 tile 盖 sprite)
  //
  // P0.b 第一版误以为"layer 1 只在 cover tile 触发时画" — 实际是**两层都全画 + cover tile 重画**。
  // 全画保证物体(椅子/桌子/柱子)无论 sprite 接近与否都完整可见;cover tile 重画用 Y-sort
  // 让 "高 y 的 tile 盖低 y 的 sprite" 真生效(屋顶/柱子顶盖住 sprite 头部)。

  // 1. tilemap layer 0(底层 — 地砖、墙基)
  drawTilemap(fb, ctx.tilemap, ctx.tileImages, gs.camera, 0)

  // 2. tilemap layer 1(顶层 — 桌子 / 椅子 / 柱子 / 屋顶 / 门 — sdlpal scene.c:481 全画)
  drawTilemap(fb, ctx.tilemap, ctx.tileImages, gs.camera, 1)

  // 3. 收集所有精灵 entries(party + NPCs),Y-sort 后逐一绘制。
  //    同时计算每个精灵的 cover tiles(sdlpal PAL_CalcCoverTiles port),
  //    cover tile 是**重画**已被全画过一次的 layer-1 tile,Y-sort 让重画位置
  //    跟 sprite 正确叠加(高 y 的 cover tile 排后 → 重画时盖 sprite)。
  //    参考 sdlpal scene.c:181-362 PAL_SceneDrawSprites。
  const entries: DrawEntry[] = []

  // --- party ---
  const { sx: partySX, sy: partySY } = pixelToScreen(gs.party, gs.camera)
  const direction = FACING_TO_DIRECTION[gs.party.facing]
  const frameIdx = direction * ctx.partyWalkFrames
  const partyFrame = ctx.partyFrames[frameIdx] ?? ctx.partyFrames[0]
  if (partyFrame) {
    // sdlpal scene.c:224-226:party pos.y = party.y - viewport.y + wLayer + 10,iLayer = wLayer + 6
    // wLayer=0 → pos.y = party.y - viewport.y + 10,iLayer = 6。
    // sort key = pos.y = world.y + 10(viewport 相消)。
    // blit_y = pos.y - height - iLayer = world.y + 10 - height - 6 = world.y + 4 - height。
    // 我们 drawSprite(fb, frame, cx, cy) 会在 cy - anchorY 处画顶边。
    // 原版 blit 用 top-left;我们用 anchor 中心底部 → 等价。
    const capturedFrame = partyFrame
    const capturedSX = partySX
    const capturedSY = partySY
    entries.push({
      // sdlpal party sort key: world.y + 10(wLayer=0)
      baseY: gs.party.y + 10,
      draw: (f) => drawSprite(f, capturedFrame, capturedSX, capturedSY),
      id: 'party',
    })
    // cover tiles for party
    addCoverTileEntries(
      entries,
      ctx.tilemap,
      ctx.tileImages,
      gs.party.x,
      gs.party.y + 10,        // sy = party.y + 10,与 party sort key 一致
      capturedFrame.width,
      capturedFrame.height,
      gs.camera,
      'party',
    )
  }

  // --- NPCs ---
  for (const npc of gs.npcs) {
    const sprite = ctx.npcSprites.get(npc.spriteNum)
    if (!sprite) continue
    const { sx, sy } = pixelToScreen(npc, gs.camera)
    // sdlpal scene.c:301-316:y = eo.y - viewport.y + sLayer*8 + 9,iLayer = sLayer*8 + 2。
    // sLayer=0 → sort key(pos.y) = npc.y - viewport.y + 9 → world: npc.y + 9。
    // blit_y = pos.y - height - iLayer = npc.y - vp.y + 9 - height - 2 = npc.y - vp.y + 7 - height。
    // drawSprite(fb, sprite, sx, sy + 7) 等价:sy = npc.y - vp.y + SCREEN_CENTER_Y,
    // cy = sy + 7 = npc.y - vp.y + SCREEN_CENTER_Y + 7。
    const capturedSprite = sprite
    const capturedSX = sx
    const capturedSY = sy
    const capturedNpcId = npc.id
    entries.push({
      // sdlpal NPC sort key: world.y + 9(sLayer=0)
      baseY: npc.y + 9,
      draw: (f) => drawSprite(f, capturedSprite, capturedSX, capturedSY + 7),
      id: `npc-${capturedNpcId}`,
    })
    // cover tiles for NPC
    addCoverTileEntries(
      entries,
      ctx.tilemap,
      ctx.tileImages,
      npc.x,
      npc.y + 9,              // sy = npc.y + 9,与 NPC sort key 一致
      capturedSprite.width,
      capturedSprite.height,
      gs.camera,
      `npc-${capturedNpcId}`,
    )
  }

  // 4. Y-sort(sdlpal scene.c:327-348 bubble sort;我们用 stable Array.sort)。
  //    sort key = baseY 升序。同 baseY 时保稳定顺序(入数组先后)。
  entries.sort((a, b) => a.baseY - b.baseY)

  // 5. 按排序后顺序绘制所有精灵 + cover tile。
  for (const e of entries) e.draw(fb)

  // 6. 对话框(最上层)
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
