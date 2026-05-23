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
  /** 仅 reset=true 时有效:重置后跳转到的指令下标(原 operand[0]) */
  resetTo?: number
  /** 仅 reset=true 时有效:重置前等待帧数(原 operand[1]) */
  idleFrames?: number
  label?: string
}

export interface GotoCommand {
  op: 'goto'
  to: string // 跳转目标标签名;跨文件用 "shared#L_X" / "objects#L_X"
  frameDelay?: number
  label?: string
}

/** 对话框样式 —— 由前置 opcode 0x003B-0x003E 设置(M2 新具名,见 D26)。
 *  注:M2 设计文档原把此类型归在 resources.ts,但因被 SetDialogStyleCommand
 *  + ShowDialogCommand.box 直接使用,实施时提前放在 events.ts。Task 2 实施
 *  resources.ts 时无需重复定义。
 */
export type DialogBoxStyle = 'top' | 'center' | 'bottom' | 'narration'

export interface ShowDialogCommand {
  op: 'showDialog'
  /** 对话框样式;由 0x003B-0x003E 设置,disasm 不产出此字段 */
  box?: DialogBoxStyle
  /** M.MSG 中的消息下标(原 operand[0]),round-trip 必须原样写回 */
  messageIndex: number
  /** 内联自 M.MSG 的可读文本;仅供人工阅读,recompile 不使用 */
  text: string
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

/**
 * 对话框样式 setter —— 实际语义按 sdlpal script.c:3389+ 的 PAL_StartDialog 调用:
 *   0x003B kDialogCenter      → setDialogStyleCenter
 *     operand[0]=messageIndex(BYTE), operand[2]=playingRNG 标志
 *   0x003C kDialogUpper       → setDialogStyleTop
 *     operand[0]=objectId, operand[1]=messageIndex(BYTE), operand[2]=playingRNG
 *   0x003D kDialogLower       → setDialogStyleBottom
 *     operand[0]=objectId, operand[1]=messageIndex(BYTE), operand[2]=playingRNG
 *   0x003E kDialogCenterWindow → setDialogStyleNarration
 *     operand[0]=messageIndex(BYTE)
 *
 * M2 运行时只用 box style 自身,operand 保留是为字节级 round-trip。
 * 运行时若需要,从 arg0/arg1/arg2 解读真实语义。
 */
export interface SetDialogStyleTopCommand {
  op: 'setDialogStyleTop'
  arg0?: number
  arg1?: number
  arg2?: number
  label?: string
}

export interface SetDialogStyleCenterCommand {
  op: 'setDialogStyleCenter'
  arg0?: number
  arg1?: number
  arg2?: number
  label?: string
}

export interface SetDialogStyleBottomCommand {
  op: 'setDialogStyleBottom'
  arg0?: number
  arg1?: number
  arg2?: number
  label?: string
}

export interface SetDialogStyleNarrationCommand {
  op: 'setDialogStyleNarration'
  arg0?: number
  arg1?: number
  arg2?: number
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
  | SetDialogStyleTopCommand
  | SetDialogStyleCenterCommand
  | SetDialogStyleBottomCommand
  | SetDialogStyleNarrationCommand
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
