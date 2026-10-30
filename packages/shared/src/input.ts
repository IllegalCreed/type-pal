/**
 * 输入系统的类型契约(D14)。
 * Shell 把物理按键 → AbstractKey;Core 只见抽象按键,与浏览器解耦,可单测 / 录制回放。
 */

/**
 * AbstractKey — 与 sdlpal `input.h:42-62` kKey* 1:1 对应,Shell 把物理键 → 这层抽象。
 *
 * sdlpal 真值:
 *   kKeyMenu=1 / Search=2 / Down=4 / Left=8 / Up=16 / Right=32 / PgUp=64 / PgDn=128
 *   Repeat=256 / Auto=512 / Defend=1024 / UseItem=2048 / ThrowItem=4096
 *   Flee=8192 / Status=16384 / Force=32768 / Home=65536 / End=131072
 *
 * ts 端按字符串枚举:
 *  - 'Confirm' = sdlpal kKeySearch(浏览器键名习惯)
 *  - 'Cancel' 作为取消别名保留；当前物理取消键由 Shell 映射为 'Menu'。
 */
export type AbstractKey =
  | 'Up'
  | 'Down'
  | 'Left'
  | 'Right'
  | 'Confirm'
  | 'Cancel'
  | 'Menu'
  | 'PgUp'
  | 'PgDn'
  | 'Home'
  | 'End'
  | 'Repeat'
  | 'Auto'
  | 'Defend'
  | 'UseItem'
  | 'ThrowItem'
  | 'Flee'
  | 'Force'
  | 'Status'

/** 一帧的输入快照。 */
export interface InputSnapshot {
  /** 本帧按住且可消费的键(走路用；scene-fade 可抑制方向)。 */
  held: ReadonlySet<AbstractKey>
  /** 本 tick 新按下的键(菜单 / 确认用) */
  pressed: ReadonlySet<AbstractKey>
  /** 帧号,便于回放与日志对齐。 */
  frameNum: number
}

/**
 * 输入源抽象 —— 真键盘 / 回放 / 录制 都实现此接口。
 *
 * `frameNum` 由主循环提供。实现者:
 * - 真键盘源应将其原样写入返回的 InputSnapshot.frameNum
 * - 回放源若已存有 snapshot,可直接返回存储的(其 frameNum 以存储值为准),主循环不做校验
 */
export interface InputSource {
  nextSnapshot(frameNum: number): InputSnapshot
  /**
   * 仅 scene-fade(0x93 / 0x80-fUpdateScene)每步清 pressed 与当前方向，保留物理键序。
   * 对照 PAL_SceneFade / PAL_GetCurrDirection / PAL_KeyDown / PAL_KeyUp：渐变结束后，
   * 单纯继续按住不会自动恢复；非repeat方向keydown或方向keyup才重算，恢复其它仍按住方向。
   * repeat/非方向事件不解除抑制。其余纯色表渐变不清键，调用方不得在那些路径调用本方法。
   * 可选端口，回放/录制及测试源可不实现；不改变快照或回放的 ownership。
   */
  suppressHeldForFade?(): void
}
