/**
 * @type-pal/reforge 包出口(barrel)—— 供 editor(及将来的工具)复用。
 *
 * 只导出 editor 复用所需的:渲染器 / 资产加载 / 工程 loader / 碰撞判定 / 画一帧场景。
 * reforge 内部模块(dialog/menu/save/input 等)不在此导出 —— 那是游戏 shell 专属,编辑器不需要。
 *
 * 见 docs/phase2/editor/editor-design.md §3(渲染复用)。
 */

import type {
  Camera,
  CellRect,
  Renderer,
  RenderLayerOpts,
  SpriteDraw,
  TilesetFrameRegistry,
} from './render.js'
// 渲染器(D10:Canvas2D blitter + Y 深度遮挡)
import { bakeFrame, Canvas2DRenderer, spriteBlitRect } from './render.js'

export {
  EntityActionPlayer,
  type EntityActionSeed,
  type ResolvedEntityAction,
  resolveSpriteActionBinding,
  resolveSpriteActionPosition,
  type SpriteActionPosition,
} from './entity-action-player.js'
export type { Camera, CellRect, Renderer, RenderLayerOpts, SpriteDraw, TilesetFrameRegistry }
export { bakeFrame, Canvas2DRenderer, spriteBlitRect }

import type {
  AssetBase,
  BattleSpriteAssetReader,
  LoadedBattleSprite,
  LoadedBattleSpriteDefinition,
  LoadedSprite,
  LoadedWorldSprite,
  SpriteAssetReader,
} from './assets.js'
// 资产加载(ProjectMap/工程标准色彩/tileset/sprite + gzip 解压)
import {
  BattleSpriteAssetCache,
  compressGzip,
  decodeBattleSpriteAssetBytes,
  decodeWorldSpriteAssetBytes,
  decompressGzip,
  loadBattleBg,
  loadBattleSpriteAsset,
  loadBattleSpriteDefinition,
  loadFireSprite,
  loadProjectMap,
  loadSpriteAsset,
  loadStandardPalette,
  loadTileset,
  loadTilesetAsset,
  SpriteAssetCache,
} from './assets.js'

export type {
  AssetBase,
  BattleSpriteAssetReader,
  LoadedBattleSprite,
  LoadedBattleSpriteDefinition,
  LoadedSprite,
  LoadedWorldSprite,
  SpriteAssetReader,
}
export {
  BattleSpriteAssetCache,
  compressGzip,
  decodeBattleSpriteAssetBytes,
  decodeWorldSpriteAssetBytes,
  decompressGzip,
  loadBattleBg,
  loadBattleSpriteAsset,
  loadBattleSpriteDefinition,
  loadFireSprite,
  loadProjectMap,
  loadSpriteAsset,
  loadStandardPalette,
  loadTileset,
  loadTilesetAsset,
  SpriteAssetCache,
}

import type { SceneMapAssets } from './scene-map.js'
// 场景地图解析(ProjectMap + tileset 注册表;引擎 + 编辑器共用)
import { loadSceneMap } from './scene-map.js'

export type { SceneMapAssets }
export { loadSceneMap }

import type { ContentJsons, LoadedProject, LoadedProjectCore } from './loader.js'
// 工程 loader(manifest + content JSON → LoadedProject)
import {
  assembleProject,
  loadAllProjectMaps,
  loadAllScenes,
  loadAllScriptChunks,
  loadProject,
  loadProjectFrom,
  loadProjectMapById,
  loadSceneDef,
  loadStampTemplates,
} from './loader.js'

export type {
  IsometricMapContent,
  IsometricMapLayer,
  ProjectMap,
  ProjectMapAuthoringV1,
  StampPlacementGridPointV1,
  StampPlacementGroupV1,
  StampPlacementVisualSlotV1,
  StampTemplate,
  TilesetDef,
} from '@type-pal/content'
// 地图/调色板类型转出口(编辑器不直依赖 shared/content)
export {
  isProjectMap,
  mapInstanceHeight,
  mapInstanceTilesetId,
  resolveTilesetAsset,
  validateProjectMap,
  validateStampTemplates,
  validateTilesets,
} from '@type-pal/content'
export type { Palette, RleFrame } from '@type-pal/shared'
// RLE 编码/解析转出口(W7B 上传管线;编辑器不直依赖 shared)
export { encodeSpriteChunk, parseSpriteChunk, parseSpriteChunkStrict } from '@type-pal/shared'
export { AssetResolver } from './asset-resolver.js'
export { tilesFromChunkBytes } from './assets.js'
export {
  type BattleResult,
  battleResultHasVictoryRewards,
  battleResultRunsOnFlee,
  battleResultRunsOnLose,
  isBattleResult,
  type LegacyBattleResult,
  normalizeLegacyBattleResult,
} from './battle/battle-result.js'
export {
  advanceEntityLifecycleWorldStep,
  applyEntityLifecycleMutation,
  deriveEntityLifecycleGates,
  type EntityLifecycleWorldStepContext,
  type EntityLifecycleWorldStepResult,
  footAnchorOutsideReappearRect,
  restoreAwaitingExitIfOutside,
  tickEntityLifecycles,
} from './entity-lifecycle.js'
export {
  applyWorldEntityLifecycleCommandV13,
  commitEntityLifecycleCommandV13,
  commitWorldEntityLifecycleCommandV13,
  type EntityLifecycleCommandCommitV13,
  type RuntimeLifecycleCommandV13,
  reduceEntityLifecycleCommandV13,
  type WorldEntityLifecycleCommandCommitV13,
} from './entity-lifecycle-command.js'
// 文件源抽象(内容 + 素材统一「从哪读」;httpSource=dev/种子,fsaSource=本地工程)
export { type FileSource, httpSource } from './file-source.js'
export { fsaSource } from './fsa-source.js'
export {
  isV5RuntimeScriptRef,
  legacyItemsFromV5,
  legacyProjectShellFromV5,
  legacySceneFromV5,
  v5RuntimeScriptRef,
} from './legacy-runtime-shell-v5.js'
export type {
  ContentJsonsV5,
  LoadedProjectV5,
  LoadedProjectV5Core,
} from './loader-v5.js'
export {
  assembleProjectV5,
  loadAllProjectMapsV5,
  loadAllScenesV5,
  loadProjectV5,
  loadProjectV5From,
  loadSceneDefV5,
  loadStampTemplatesV5,
} from './loader-v5.js'
export type { ContentJsonsV13, LoadedProjectV13, LoadedProjectV13Core } from './loader-v13.js'
export {
  assembleProjectV13,
  loadAllProjectMapsV13,
  loadAllScenesV13,
  loadProjectV13,
  loadProjectV13From,
  loadSceneDefV13,
  loadStampTemplatesV13,
} from './loader-v13.js'
export type {
  ContentJsonsV14,
  LoadedProjectAuthorContentV14,
  LoadedProjectV14,
  LoadedProjectV14Core,
} from './loader-v14.js'
export {
  assembleProjectV14,
  loadAllAuthorScenesV14,
  loadAllProjectMapsV14,
  loadAllScenesV14,
  loadAuthorSceneDefV14,
  loadProjectV14,
  loadProjectV14From,
  loadSceneDefV14,
  loadStampTemplatesV14,
} from './loader-v14.js'
export type { LoadedProjectV16 } from './loader-v16.js'
export {
  loadAllAuthorScenesV16,
  loadAllProjectMapsV16,
  loadAllScenesV16,
  loadProjectV16,
  loadProjectV16From,
  loadSceneDefV16,
  loadStampTemplatesV16,
} from './loader-v16.js'
export type {
  LatticePos,
  ProjectMapCollisionEdit,
  ProjectMapTileDraw,
  ProjectMapTileEdit,
} from './project-map.js'
// 工程地图(ProjectMap):构造/编辑 + 错排 lattice 纯逻辑
export {
  buildBlankProjectMap,
  buildProjectMapLayer,
  floodFillProjectMapTiles,
  insertProjectMapLayer,
  isLatticeInside,
  latticeCenter,
  latticeInMapRect,
  latticeInRect,
  moveProjectMapLayer,
  nextProjectMapLayerId,
  paintProjectMapCollision,
  paintProjectMapTiles,
  pixelToLattice,
  projectMapStampPlacements,
  projectMapTileBlitRect,
  projectMapTilesInView,
  removeProjectMapLayer,
  resizeProjectMap,
  updateProjectMapLayer,
  withProjectMapStampPlacements,
} from './project-map.js'
// 上传素材量化 + 图集网格切片(W7B;编码器在 shared rle-encode)
export { quantizeToRleFrame, sliceAtlasGrid } from './quantize.js'
export type { ContentJsons, LoadedProject, LoadedProjectCore }
export {
  assembleProject,
  loadAllProjectMaps,
  loadAllScenes,
  loadAllScriptChunks,
  loadProject,
  loadProjectFrom,
  loadProjectMapById,
  loadSceneDef,
  loadStampTemplates,
}

// 碰撞判定(编辑器画禁入格复用,与游戏同一套 → 不漂移)
import { buildIsBlocked, isBlockedAt, sameGrid, sameLatticeCell } from './collision.js'

export { buildIsBlocked, isBlockedAt, sameGrid, sameLatticeCell }

// 「画一帧场景」(editor 复用同一绘制函数画底图)
import { bootGame } from './main.js'
import type { RenderSceneFrameArgs } from './render-scene.js'
import { renderSceneFrame } from './render-scene.js'

export type { RenderSceneFrameArgs }
// 引擎启动函数(编辑器 play 页同源试玩;页面须备 <canvas id="screen">)
export { bootGame, renderSceneFrame }

// 精灵帧下标计算(C0 布局数据化;editor 画布/角色模式走路预览共用,单一真源)
import {
  actualFrameIndex,
  deriveStepCycle,
  FACING_TO_DIR,
  idleFrameIndex,
  loopFrameIndex,
  walkFrameIndex,
} from './sprite-anim.js'

export {
  actualFrameIndex,
  deriveStepCycle,
  FACING_TO_DIR,
  idleFrameIndex,
  loopFrameIndex,
  walkFrameIndex,
}

import type { ScriptHost, StepEvent } from './script-runner.js'
// 脚本解释器(编辑器演出预览:注入画布 host 播演出;onStep/gate = 高亮/单步钩子)
import { evalCondition, ScriptRunner } from './script-runner.js'

export * from './item-use-executor.js'
export type { ResolvedScript, ScriptResolver } from './script-chunk-store.js'
export { MemoryScriptResolver, ScriptChunkStore } from './script-chunk-store.js'
export * from './script-compiler-v5.js'
export * from './script-compiler-v13.js'
export * from './script-host-adapter-v5.js'
export * from './script-project-v5.js'
export * from './script-project-v13.js'
export * from './script-runner-v5.js'
export * from './script-runner-v13.js'
export * from './script-world-v5.js'
export type { ScriptHost, StepEvent }
export { evalCondition, ScriptRunner }

import type { AudioAssetReader, BgmPlayer } from './audio/bgm.js'
// BGM 播放器(W5:编辑器试听复用;引擎 main.ts 自用同款)
import { createBgmPlayer } from './audio/bgm.js'

export type {
  SfxAssetReader,
  SfxAudioAdapter,
  SfxPlaybackSource,
} from './audio/sfx.js'
export {
  SFX_DECODE_BUDGET,
  SfxPlayer,
  SfxReadinessBudgetError,
  SfxReadinessCollectionError,
  SfxReadinessFatalError,
  SfxReadinessResourceError,
} from './audio/sfx.js'
export type {
  BattleBaseSoundInput,
  PoisonSoundSide,
  TurnActionSoundInput,
} from './audio/sfx-readiness.js'
export {
  collectBattleBaseSounds,
  collectSceneSoundAssets,
  collectScriptSoundAssets,
  collectTurnActionSounds,
} from './audio/sfx-readiness.js'
export type { AudioAssetReader, BgmPlayer }
export { createBgmPlayer }

import type {
  FrameAnimationFrameSnapshot,
  FrameSequenceAssetReader,
  PlayFrameAnimationOptions,
} from './frame-animation-player.js'
// 过场编排播放运行时与 TPFS 随机读取器。
import { FrameSequenceReader, playFrameAnimation } from './frame-animation-player.js'
import type { PlayVideoOptions } from './video-player.js'
import { playVideo } from './video-player.js'

export type {
  FrameAnimationFrameSnapshot,
  FrameSequenceAssetReader,
  PlayFrameAnimationOptions,
  PlayVideoOptions,
}
export { FrameSequenceReader, playFrameAnimation, playVideo }
