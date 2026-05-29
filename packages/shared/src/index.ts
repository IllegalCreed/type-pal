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

/**
 * 特效 A:fade 进行中的主循环帧率(60fps)。
 *
 * Why:主循环是固定步长累加器,explore/event 默认 10fps(100ms/tick),present 随之 10fps 采样。
 * 但 sdlpal 的 fade(palette.c PAL_FadeOut/FadeIn/ColorFade、video.c VIDEO_FadeScreen)是**自带高频
 * 内循环的阻塞函数**(FadeOut = UTIL_Delay(10)×60 步 ≈ 100fps;dither ≈ 33fps),与 10fps 游戏循环
 * 解耦 → 视觉平滑。我们 10fps 采样 time-based fade → 600ms 只有 ~6 帧 = 明显台阶感。
 * 故 fade 期间(gs.fadeState / gs.paletteFadeState,scene-fade 除外)把循环提到 60fps,present 多采样
 * → 平滑。**duration 不变**(fade 是 time-based,elapsed/totalMs);仅插值帧数变多。
 * scene-fade(0x93 / 0x80 fUpdateScene)保持 10fps:sdlpal PAL_SceneFade 本就 100ms/步且每步
 * PAL_GameUpdate 更新 NPC,10fps 才匹配真值(提速会让淡入期间 NPC 动得过快)。
 */
export const FRAME_MS_FADE = 1000 / 60
