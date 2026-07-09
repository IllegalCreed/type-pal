/**
 * @type-pal/reforge 包出口(barrel)—— 供 editor(及将来的工具)复用。
 *
 * 只导出 editor 复用所需的:渲染器 / 资产加载 / 工程 loader / 碰撞判定 / 画一帧场景。
 * reforge 内部模块(dialog/menu/save/input 等)不在此导出 —— 那是游戏 shell 专属,编辑器不需要。
 *
 * 见 docs/phase2/editor/editor-design.md §3(渲染复用)。
 */

// 渲染器(D10:Canvas2D blitter + Y 深度遮挡)
import { bakeFrame, Canvas2DRenderer, spriteBlitRect } from './render.js'
import type { Camera, CellRect, Renderer, RenderLayerOpts, SpriteDraw } from './render.js'
export { bakeFrame, Canvas2DRenderer, spriteBlitRect }
export type { Camera, CellRect, Renderer, RenderLayerOpts, SpriteDraw }

// 资产加载(tilemap/palette/tileset/sprite + gzip 解压)
import {
  decompressGzip,
  loadBattleBg,
  loadBattleSprite,
  loadFireSprite,
  loadOwnMap,
  loadPalette,
  loadSprite,
  loadTilemap,
  loadTilesetByPath,
} from './assets.js'
import type { AssetBase, LoadedSprite } from './assets.js'
export { decompressGzip, loadBattleBg, loadBattleSprite, loadFireSprite, loadOwnMap, loadPalette, loadSprite, loadTilemap, loadTilesetByPath }
export type { AssetBase, LoadedSprite }

// 场景地图分流(W7a-4:复用原版 ⊕ 自有地图 → 同形 {map, tiles};引擎 + 编辑器共用)
import { loadSceneMap } from './scene-map.js'
import type { SceneMapAssets } from './scene-map.js'
export { loadSceneMap }
export type { SceneMapAssets }

// 工程 loader(manifest + content JSON → LoadedProject)
import { assembleProject, loadAllOwnMaps, loadAllScenes, loadProject, loadProjectFrom, loadSceneDef } from './loader.js'
import type { ContentJsons, LoadedProject, LoadedProjectCore } from './loader.js'
export { assembleProject, loadAllOwnMaps, loadAllScenes, loadProject, loadProjectFrom, loadSceneDef }
export type { ContentJsons, LoadedProject, LoadedProjectCore }

// 文件源抽象(内容 + 素材统一「从哪读」;httpSource=dev/种子,fsaSource=本地工程)
export { type FileSource, httpSource } from './file-source.js'
export { fsaSource } from './fsa-source.js'

// 自有地图(W7):Tilemap 形的作者地图构造/编辑 + 绘制纯逻辑(W7c:笔刷/矩形/填充)
export {
  buildBlankOwnMap,
  COLLISION_MASK,
  encodeTileLayer0,
  encodeTileLayer1,
  floodFillSubTiles,
  LAYER0_TILE_MASK,
  LAYER1_CLEAR_MASK,
  LAYER1_TILE_MASK,
  MAX_LAYER0_TILE,
  MAX_LAYER1_TILE,
  paintCells,
  subTilesInRect,
} from './own-map.js'
export type { SubTileEdit, SubTilePos } from './own-map.js'
// Tilemap/Palette 类型转出口(编辑器不直依赖 shared;自有地图工作副本 + tile 面板用)
export type { Palette, Tilemap } from '@type-pal/shared'

// 碰撞判定(编辑器画禁入格复用,与游戏同一套 → 不漂移);pixelToTile = W7c 笔刷靶定
import { buildIsBlocked, isBlockedAt, pixelToTile } from './collision.js'
export { buildIsBlocked, isBlockedAt, pixelToTile }

// 「画一帧场景」(editor 复用同一绘制函数画底图)
import { renderSceneFrame } from './render-scene.js'
import type { RenderSceneFrameArgs } from './render-scene.js'
export { renderSceneFrame }
export type { RenderSceneFrameArgs }

// 精灵帧下标计算(C0 布局数据化;editor 画布/角色模式走路预览共用,单一真源)
import { deriveStepCycle, FACING_TO_DIR, idleFrameIndex, walkFrameIndex } from './sprite-anim.js'
export { deriveStepCycle, FACING_TO_DIR, idleFrameIndex, walkFrameIndex }

// 脚本解释器(编辑器演出预览:注入画布 host 播演出;onStep/gate = 高亮/单步钩子)
import { evalCondition, ScriptRunner } from './script-runner.js'
import type { ScriptHost, StepEvent } from './script-runner.js'
export { evalCondition, ScriptRunner }
export type { ScriptHost, StepEvent }

// BGM 播放器(W5:编辑器试听复用;引擎 main.ts 自用同款)
import { createBgmPlayer } from './audio/bgm.js'
import type { BgmPlayer } from './audio/bgm.js'
export { createBgmPlayer }
export type { BgmPlayer }

// 过场编排播放运行时(编辑器过场库预览复用;引擎 script-host 自用同款)
import { playRng, rngPaletteId } from './rng-player.js'
import type { PlayRngOptions } from './rng-player.js'
import { playVideo } from './video-player.js'
import type { PlayVideoOptions } from './video-player.js'
export { playRng, playVideo, rngPaletteId }
export type { PlayRngOptions, PlayVideoOptions }
