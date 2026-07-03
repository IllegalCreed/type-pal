/**
 * @type-pal/reforge 包出口(barrel)—— 供 editor(及将来的工具)复用。
 *
 * 只导出 editor 复用所需的:渲染器 / 资产加载 / 工程 loader / 碰撞判定 / 画一帧场景。
 * reforge 内部模块(dialog/menu/save/input 等)不在此导出 —— 那是游戏 shell 专属,编辑器不需要。
 *
 * 见 docs/phase2/editor/editor-design.md §3(渲染复用)。
 */

// 渲染器(D10:Canvas2D blitter + Y 深度遮挡)
import { bakeFrame, Canvas2DRenderer } from './render.js'
import type { Camera, CellRect, Renderer, SpriteDraw } from './render.js'
export { bakeFrame, Canvas2DRenderer }
export type { Camera, CellRect, Renderer, SpriteDraw }

// 资产加载(tilemap/palette/tileset/sprite + gzip 解压)
import {
  decompressGzip,
  loadBattleBg,
  loadBattleSprite,
  loadPalette,
  loadSprite,
  loadTilemap,
  loadTileset,
} from './assets.js'
import type { AssetBase, LoadedSprite } from './assets.js'
export { decompressGzip, loadBattleBg, loadBattleSprite, loadPalette, loadSprite, loadTilemap, loadTileset }
export type { AssetBase, LoadedSprite }

// 工程 loader(manifest + content JSON → LoadedProject)
import { assembleProject, loadAllScenes, loadProject, loadSceneDef } from './loader.js'
import type { ContentJsons, LoadedProject } from './loader.js'
export { assembleProject, loadAllScenes, loadProject, loadSceneDef }
export type { ContentJsons, LoadedProject }

// 碰撞判定(编辑器画禁入格复用,与游戏同一套 → 不漂移)
import { isBlockedAt } from './collision.js'
export { isBlockedAt }

// 「画一帧场景」(editor 复用同一绘制函数画底图)
import { renderSceneFrame } from './render-scene.js'
import type { RenderSceneFrameArgs } from './render-scene.js'
export { renderSceneFrame }
export type { RenderSceneFrameArgs }

// 精灵帧下标计算(C0 布局数据化;editor 画布/角色模式走路预览共用,单一真源)
import { deriveStepCycle, FACING_TO_DIR, idleFrameIndex, walkFrameIndex } from './sprite-anim.js'
export { deriveStepCycle, FACING_TO_DIR, idleFrameIndex, walkFrameIndex }
