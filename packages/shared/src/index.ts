/**
 * 跨包共用的常量与类型。
 *
 * M0 占位:只导出引擎计时常量(对应 04-decisions.md 的 D13)。
 * M1+ 会补:events.json schema 类型、数据表类型、资源清单类型。
 */

/** 探索 / 菜单 / 事件模式的逻辑帧率(见 D13)。 */
export const FPS_EXPLORE = 10

/** 战斗模式的逻辑帧率(见 D13)。 */
export const FPS_BATTLE = 25

/** 探索一帧的毫秒数 = 1000 / FPS_EXPLORE。 */
export const FRAME_MS_EXPLORE = 1000 / FPS_EXPLORE

/** 战斗一帧的毫秒数 = 1000 / FPS_BATTLE。 */
export const FRAME_MS_BATTLE = 1000 / FPS_BATTLE
