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
 *  - 'Cancel' 仍保留(M5 battle 用作回退键,与 sdlpal kKeyMenu 在菜单 context 等价但 ts 显式分两键)
 */
export type AbstractKey =
  | 'Up' | 'Down' | 'Left' | 'Right'
  | 'Confirm' | 'Cancel' | 'Menu'
  | 'PgUp' | 'PgDn' | 'Home' | 'End'
  | 'Repeat' | 'Auto' | 'Defend'
  | 'UseItem' | 'ThrowItem' | 'Flee' | 'Force' | 'Status'

/** 一帧的输入快照。 */
export interface InputSnapshot {
  /** 当前按住的键(走路用) */
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
   * DM30(2026-06-12 收窄):**仅 scene-fade**(0x93 SceneFade / 0x80 PaletteFade-fUpdateScene)
   * 每步清键(palette.c:314-316/441-446:PAL_ClearKeyState + dir=prevdir=Unknown;input.c:213
   * 按住不放只产生 fRepeat=TRUE 的 KeyDown 不重算 dir)—— 该类 fade 期间按住的方向键在 fade 结束后
   * **不**自动恢复走路,需物理松开重按。其余渐变(0x50/0x51/0x8C/0x4F/自动渐入 = PAL_FadeOut/FadeIn/
   * ColorFade/FadeToRed)C 不清键,**不得**调本方法(2026-06-12 战后吞键回归根因)。实现方:把当前
   * held 方向键加入抑制集(keyup 解除)并清 pressed。可选(测试 stub 可不实现)。
   */
  suppressHeldForFade?(): void
}
