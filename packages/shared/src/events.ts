/**
 * events.json schema(见 docs/05-events-schema.md)。
 * M1 提供 ~10 个 M2 切片要用的具名 Command + raw 兜底 + 结构化子集(D17,新内容手写用)。
 */

export interface RawCommand {
  op: 'raw'
  opcode: number
  operands: [number, number, number]
  label?: string
}

export interface EndCommand {
  op: 'end'
  advance?: boolean
  reset?: boolean
  label?: string
}

export interface GotoCommand {
  op: 'goto'
  to: string                // 跳转目标标签名;跨文件用 "shared#L_X" / "objects#L_X"
  frameDelay?: number
  label?: string
}

export interface ShowDialogCommand {
  op: 'showDialog'
  /** 对话框样式;由 0x003B-0x003E 设置,disasm 不产出此字段 */
  box?: 'top' | 'center' | 'bottom' | 'narration'
  text: string              // 内联自 M.MSG
  label?: string
}

export interface GiveItemCommand {
  op: 'giveItem'
  itemId: number
  count: number
  _item?: string
  label?: string
}

export interface StartBattleCommand {
  op: 'startBattle'
  enemyTeamId: number
  _enemyTeam?: string
  label?: string
}

// 结构化子集(D17)—— 反汇编器不产出,新内容手写用
export interface SequenceCommand {
  op: 'sequence'
  steps: Command[]
  label?: string
}

export interface IfCommand {
  op: 'if'
  cond: Command
  then: Command[]
  else?: Command[]
  label?: string
}

export interface ChoiceCommand {
  op: 'choice'
  prompt: string
  options: { text: string; then: Command[] }[]
  label?: string
}

export type Command =
  | RawCommand
  | EndCommand
  | GotoCommand
  | ShowDialogCommand
  | GiveItemCommand
  | StartBattleCommand
  | SequenceCommand
  | IfCommand
  | ChoiceCommand

export interface EventFile {
  /** 场景号;只有 scene-NNN.json 有,shared.json / objects.json 不带 */
  scene?: number
  segments: EventSegment[]
}

export interface EventSegment {
  /**
   * 段名 —— 描述这段从哪入口可达:
   *   "scene-NNN.onEnter" / "object-MM.trigger" / "object-MM.auto" …
   */
  name: string
  commands: Command[]
}
