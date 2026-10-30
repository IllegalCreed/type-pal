/**
 * 跨包共用的常量与类型。
 */

export * from './events.js'
export * from './input.js'
export * from './localization.js'
export * from './mkf.js'
export * from './resources.js'
export * from './rle.js'
export * from './rle-encode.js'
export * from './rng.js'
export * from './tables.js'
export * from './yj2.js'

/** 探索 / 菜单 / 事件模式的逻辑帧率(见 D13)。 */
export const FPS_EXPLORE = 10

/** 战斗模式的逻辑帧率(见 D13)。 */
export const FPS_BATTLE = 25

/** 探索一帧的毫秒数 = 1000 / FPS_EXPLORE。 */
export const FRAME_MS_EXPLORE = 1000 / FPS_EXPLORE

/** 战斗一帧的毫秒数 = 1000 / FPS_BATTLE。 */
export const FRAME_MS_BATTLE = 1000 / FPS_BATTLE

/**
 * 【已废弃,当前无 caller】旧设计(D13)的 fade 提频常量:fade 期间把主循环提到 60fps。
 * 该设计已于 2026-05-30 替换——副作用是 fade 期间每 tick 推进的逻辑(走步/打字/
 * frame-wait)被一起加速 6×。现实现:逻辑 tick 固定 FRAME_MS_EXPLORE/_BATTLE,
 * fade 平滑由 startRafLoop 在 fade 进行中每 rAF 帧 present 实现(见 game
 * main-loop.ts `logicIntervalMs` 的旧设计注释)。该常量不参与现行运行时调度。
 */
export const FRAME_MS_FADE = 1000 / 60
