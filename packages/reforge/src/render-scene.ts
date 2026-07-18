/**
 * 「画一帧场景」—— 从 main.ts 抽出的纯绘制函数(D-B0 第一根地基)。
 *
 * 只搬「绘制那截」:clear → save → scale(worldScale) → 关平滑 → renderScene → restore。
 * **不搬**相机计算 / 精灵组装(那是调用方的事:游戏走 walk-cycle,编辑器走 idle 帧)。
 * **不含** debug 叠加层(如 reforge 的 drawCollisionOverlay)—— 那是调用方各自的副作用,
 *   留在各自的 render() 里用独立 save/scale/restore 包裹,保持本函数纯净(编辑器复用时不被污染)。
 *
 * editor 复用同一函数画底图 → 单一真源、零渲染逻辑漂移。
 */
import type { ProjectMap } from '@type-pal/content'
import type { Camera, CellRect, Renderer, SpriteDraw } from './render.js'

export interface RenderSceneFrameArgs {
  map: ProjectMap
  room: CellRect
  camera: Camera
  sprites: readonly SpriteDraw[]
  /** 物理 canvas / 逻辑视口 倍率(整数倍 + pixelated 保点阵锐利)。 */
  worldScale: number
  /** 渲染层开关(编辑器;缺省全画)。 */
  layers?: import('./render.js').RenderLayerOpts
}

/**
 * clear → save → scale(worldScale) → renderScene(map,room,camera,sprites) → restore。
 * 委托给 renderer 的 clear/renderScene;ctx 变换由本函数管。
 */
export function renderSceneFrame(
  ctx: CanvasRenderingContext2D,
  renderer: Renderer,
  args: RenderSceneFrameArgs,
): void {
  if (renderer.context !== ctx) throw new Error('renderSceneFrame: renderer 与目标 context 不一致')
  const { map, room, camera, sprites, worldScale, layers } = args
  renderer.clear()
  ctx.save()
  ctx.scale(worldScale, worldScale)
  ctx.imageSmoothingEnabled = false // 最近邻,点阵/瓦片整数倍放大不糊
  renderer.renderScene(map, room, camera, sprites, layers)
  ctx.restore()
}
