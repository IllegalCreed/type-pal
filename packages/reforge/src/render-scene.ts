import type { IsometricMapContent } from '@type-pal/content'
import type { Camera, CellRect, Renderer, RenderLayerOpts, SpriteDraw } from './render.js'

export interface RenderSceneFrameArgs {
  map: IsometricMapContent<number | null>
  room: CellRect
  camera: Camera
  sprites: readonly SpriteDraw[]
  /** 物理 canvas / 逻辑视口 倍率(整数倍 + pixelated 保点阵锐利)。 */
  worldScale: number
  /** 渲染层开关(编辑器;缺省全画)。 */
  layers?: RenderLayerOpts
}

/** 游戏和编辑器供给相机与精灵；这一层负责一帧的画布缩放和点阵采样。 */
export function renderSceneFrame(
  ctx: CanvasRenderingContext2D,
  renderer: Renderer,
  args: RenderSceneFrameArgs,
): void {
  if (renderer.context !== ctx) throw new Error('renderSceneFrame: renderer 与目标 context 不一致')
  const { map, room, camera, sprites, worldScale, layers } = args
  renderer.clear()
  ctx.save()
  try {
    ctx.scale(worldScale, worldScale)
    ctx.imageSmoothingEnabled = false
    renderer.renderScene(map, room, camera, sprites, layers)
  } finally {
    ctx.restore()
  }
}
