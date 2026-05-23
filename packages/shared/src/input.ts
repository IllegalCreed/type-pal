/**
 * 输入系统的类型契约(D14)。
 * Shell 把物理按键 → AbstractKey;Core 只见抽象按键,与浏览器解耦,可单测 / 录制回放。
 */

export type AbstractKey =
  | 'Up' | 'Down' | 'Left' | 'Right'
  | 'Confirm' | 'Cancel' | 'Menu'

/** 一帧的输入快照。 */
export interface InputSnapshot {
  /** 当前按住的键(走路用) */
  held: ReadonlySet<AbstractKey>
  /** 本 tick 新按下的键(菜单 / 确认用) */
  pressed: ReadonlySet<AbstractKey>
  /** 帧号,便于回放与日志对齐。 */
  frameNum: number
}

/** 输入源抽象 —— 真键盘 / 回放 / 录制 都实现此接口。 */
export interface InputSource {
  nextSnapshot(frameNum: number): InputSnapshot
}
