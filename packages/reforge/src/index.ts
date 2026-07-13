/**
 * @type-pal/reforge 包出口(barrel)—— 供 editor(及将来的工具)复用。
 *
 * 只导出 editor 复用所需的:渲染器 / 资产加载 / 工程 loader / 碰撞判定 / 画一帧场景。
 * reforge 内部模块(dialog/menu/save/input 等)不在此导出 —— 那是游戏 shell 专属,编辑器不需要。
 *
 * 见 docs/phase2/editor/editor-design.md §3(渲染复用)。
 */

import type { Camera, CellRect, Renderer, RenderLayerOpts, SpriteDraw } from './render.js'
// 渲染器(D10:Canvas2D blitter + Y 深度遮挡)
import { bakeFrame, Canvas2DRenderer, spriteBlitRect } from './render.js'

export type { Camera, CellRect, Renderer, RenderLayerOpts, SpriteDraw }
export { bakeFrame, Canvas2DRenderer, spriteBlitRect }

import type { AssetBase, LoadedSprite } from './assets.js'
// 资产加载(tilemap/palette/tileset/sprite + gzip 解压)
import {
  compressGzip,
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

export type { AssetBase, LoadedSprite }
export {
  compressGzip,
  decompressGzip,
  loadBattleBg,
  loadBattleSprite,
  loadFireSprite,
  loadOwnMap,
  loadPalette,
  loadSprite,
  loadTilemap,
  loadTilesetByPath,
}

import type { SceneMapAssets } from './scene-map.js'
// 场景地图分流(W7D:旧 Tilemap 复用图 ⊕ OwnMap v1 自有图;引擎 + 编辑器共用)
import { loadSceneMap } from './scene-map.js'

export type { SceneMapAssets }
export { loadSceneMap }

import type { ContentJsons, LoadedProject, LoadedProjectCore } from './loader.js'
// 工程 loader(manifest + content JSON → LoadedProject)
import {
  assembleProject,
  loadAllOwnMaps,
  loadAllScenes,
  loadAllScriptChunks,
  loadProject,
  loadProjectFrom,
  loadSceneDef,
} from './loader.js'

export type { OwnMap, OwnMapLayer, TilesetDef } from '@type-pal/content'
// 地图/调色板类型转出口(编辑器不直依赖 shared/content)
export { isOwnMap, resolveTilesetPath, validateOwnMap, validateTilesets } from '@type-pal/content'
export type { Palette, RleFrame, Tilemap } from '@type-pal/shared'
// RLE 编码/解析转出口(W7B 上传管线;编辑器不直依赖 shared)
export { encodeSpriteChunk, parseSpriteChunk } from '@type-pal/shared'
export { tilesFromChunkBytes } from './assets.js'
// 文件源抽象(内容 + 素材统一「从哪读」;httpSource=dev/种子,fsaSource=本地工程)
export { type FileSource, httpSource } from './file-source.js'
export { fsaSource } from './fsa-source.js'
export type {
  LatticePos,
  OwnMapCollisionEdit,
  OwnMapTileDraw,
  OwnMapTileEdit,
} from './own-map.js'
// 自有地图(W7D):OwnMap v1 构造/编辑 + 错排 lattice 纯逻辑
export {
  buildBlankOwnMap,
  buildOwnMapLayer,
  floodFillOwnMapTiles,
  insertOwnMapLayer,
  isLatticeInside,
  latticeCenter,
  latticeInRect,
  moveOwnMapLayer,
  nextOwnMapLayerId,
  ownMapTilesInView,
  paintOwnMapCollision,
  paintOwnMapTiles,
  pixelToLattice,
  removeOwnMapLayer,
  resizeOwnMap,
  updateOwnMapLayer,
} from './own-map.js'
// 上传素材量化 + 图集网格切片(W7B;编码器在 shared rle-encode)
export { quantizeToRleFrame, sliceAtlasGrid } from './quantize.js'
export type { ContentJsons, LoadedProject, LoadedProjectCore }
export {
  assembleProject,
  loadAllOwnMaps,
  loadAllScenes,
  loadAllScriptChunks,
  loadProject,
  loadProjectFrom,
  loadSceneDef,
}

// 碰撞判定(编辑器画禁入格复用,与游戏同一套 → 不漂移);pixelToTile = W7c 笔刷靶定
import { buildIsBlocked, isBlockedAt, pixelToTile } from './collision.js'

export { buildIsBlocked, isBlockedAt, pixelToTile }

// 「画一帧场景」(editor 复用同一绘制函数画底图)
import { bootGame } from './main.js'
import type { RenderSceneFrameArgs } from './render-scene.js'
import { renderSceneFrame } from './render-scene.js'

export type { RenderSceneFrameArgs }
// 引擎启动函数(编辑器 play 页同源试玩;页面须备 <canvas id="screen">)
export { bootGame, renderSceneFrame }

// 精灵帧下标计算(C0 布局数据化;editor 画布/角色模式走路预览共用,单一真源)
import {
  deriveStepCycle,
  FACING_TO_DIR,
  idleFrameIndex,
  loopFrameIndex,
  walkFrameIndex,
} from './sprite-anim.js'

export { deriveStepCycle, FACING_TO_DIR, idleFrameIndex, loopFrameIndex, walkFrameIndex }

import type { ScriptHost, StepEvent } from './script-runner.js'
// 脚本解释器(编辑器演出预览:注入画布 host 播演出;onStep/gate = 高亮/单步钩子)
import { evalCondition, ScriptRunner } from './script-runner.js'

export type { ResolvedScript, ScriptResolver } from './script-chunk-store.js'
export { MemoryScriptResolver, ScriptChunkStore } from './script-chunk-store.js'
export type { ScriptHost, StepEvent }
export { evalCondition, ScriptRunner }

import type { BgmPlayer } from './audio/bgm.js'
// BGM 播放器(W5:编辑器试听复用;引擎 main.ts 自用同款)
import { createBgmPlayer } from './audio/bgm.js'

export type { BgmPlayer }
export { createBgmPlayer }

import type { PlayRngOptions } from './rng-player.js'
// 过场编排播放运行时(编辑器过场库预览复用;引擎 script-host 自用同款)
import { playRng, rngPaletteId } from './rng-player.js'
import type { PlayVideoOptions } from './video-player.js'
import { playVideo } from './video-player.js'

export type { PlayRngOptions, PlayVideoOptions }
export { playRng, playVideo, rngPaletteId }
