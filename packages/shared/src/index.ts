/**
 * 跨包共用的常量与类型。
 */

export * from './events.js'
export * from './resources.js'
export * from './tables.js'
export * from './input.js'

/** 探索 / 菜单 / 事件模式的逻辑帧率(见 D13)。 */
export const FPS_EXPLORE = 10

/** 战斗模式的逻辑帧率(见 D13)。 */
export const FPS_BATTLE = 25

/** 探索一帧的毫秒数 = 1000 / FPS_EXPLORE。 */
export const FRAME_MS_EXPLORE = 1000 / FPS_EXPLORE

/** 战斗一帧的毫秒数 = 1000 / FPS_BATTLE。 */
export const FRAME_MS_BATTLE = 1000 / FPS_BATTLE
