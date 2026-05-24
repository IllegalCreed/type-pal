/**
 * 双向 opcode 注册表 —— 目标游戏 1998 Win9x 字节码脚本系统。
 *
 * 每条指令 8 字节: u16 LE opcode + 3 × u16 LE 操作数。
 * 完整语义: reference/sdlpal/script.c 大 switch。
 *
 * ~15 个 M2 切片需要的 opcode 具名; 其余 raw 占位,字节层面照常透传。
 */

export type FieldKind =
  | 'value'
  | 'label'
  | 'message'
  | 'object'
  | 'scene'
  | 'item'
  | 'spell'
  | 'enemy'
  | 'person'
  | 'sprite'

export interface OpcodeDef {
  /** Verb 名称。未具名为 'raw'。 */
  name: string
  /** 3 个操作数定义,顺序固定。 */
  fields: [
    { name: string; kind: FieldKind },
    { name: string; kind: FieldKind },
    { name: string; kind: FieldKind },
  ]
  /** true = 已有真实 verb(disasm 输出具名 Command)。 */
  named: boolean
  /** end 子语义: true = 推进触发器条目至下一行 (0x0001) */
  endAdvance?: boolean
  /** end 子语义: true = 重置触发器条目至指定地址 (0x0002) */
  endReset?: boolean
}

const VALUE: { name: string; kind: FieldKind } = { name: '_unused', kind: 'value' }

/**
 * 所有 ~97 个 opcode。~15 个具名(附字段详情),其余 raw 占位。
 * 完整语义请查阅 reference/sdlpal/script.c 大 switch。
 */
export const opcodeTable: Record<number, OpcodeDef> = {
  // ── 控制流 ──────────────────────────────────────────────────────────────

  // 0x0000: Stop running (script.c:3204)
  0: { name: 'end', fields: [VALUE, VALUE, VALUE], named: true },

  // 0x0001: Stop + advance entry to next line (script.c:3211)
  1: { name: 'end', fields: [VALUE, VALUE, VALUE], named: true, endAdvance: true },

  // 0x0002: Stop + reset entry to operand[0] address (script.c:3219)
  2: {
    name: 'end',
    fields: [{ name: 'resetTo', kind: 'label' }, { name: 'idleFrames', kind: 'value' }, VALUE],
    named: true,
    endReset: true,
  },

  // 0x0003: Unconditional jump (script.c:3239)
  3: {
    name: 'goto',
    fields: [{ name: 'to', kind: 'label' }, { name: 'frameDelay', kind: 'value' }, VALUE],
    named: true,
  },

  // 0x0007: Start battle (script.c:3314)
  7: {
    name: 'startBattle',
    fields: [
      { name: 'enemyId', kind: 'enemy' },
      { name: 'onLost', kind: 'label' },
      { name: 'onFled', kind: 'label' },
    ],
    named: true,
  },

  // 0x0009: Wait for specified number of frames (script.c:3343)
  9: {
    name: 'waitFrames',
    fields: [
      { name: 'frames', kind: 'value' },
      { name: 'updateGame', kind: 'value' },
      { name: 'updateGestures', kind: 'value' },
    ],
    named: true,
  },

  // ── 事件对象 ────────────────────────────────────────────────────────────

  // 0x0013: Set position of event object (script.c:716)
  19: {
    name: 'setObjectXY',
    fields: [
      { name: 'objectId', kind: 'object' },
      { name: 'x', kind: 'value' },
      { name: 'y', kind: 'value' },
    ],
    named: true,
  },

  // 0x0025: Set trigger script entry for an event object (script.c:1147)
  37: {
    name: 'setScriptEntry',
    fields: [{ name: 'objectId', kind: 'object' }, { name: 'scriptEntry', kind: 'label' }, VALUE],
    named: true,
  },

  // 0x0049: Set the state of event object (script.c:1711)
  73: {
    name: 'setObjectState',
    fields: [{ name: 'objectId', kind: 'object' }, { name: 'state', kind: 'value' }, VALUE],
    named: true,
  },

  // ── 音频 ────────────────────────────────────────────────────────────────

  // 0x0043: Set background music (script.c:1642)
  67: {
    name: 'playMusic',
    fields: [{ name: 'musicId', kind: 'value' }, { name: 'loopMode', kind: 'value' }, VALUE],
    named: true,
  },

  // 0x0047: Play sound effect (script.c:1704)
  71: {
    name: 'playSfx',
    fields: [{ name: 'soundId', kind: 'value' }, VALUE, VALUE],
    named: true,
  },

  // ── 道具 / 场景 ─────────────────────────────────────────────────────────

  // 0x001F: Add item to inventory (script.c:970)
  31: {
    name: 'giveItem',
    fields: [{ name: 'itemId', kind: 'item' }, { name: 'count', kind: 'value' }, VALUE],
    named: true,
  },

  // 0x0058: Jump if item count < threshold (script.c:1859)
  88: {
    name: 'ifItemLess',
    fields: [
      { name: 'itemId', kind: 'item' },
      { name: 'threshold', kind: 'value' },
      { name: 'to', kind: 'label' },
    ],
    named: true,
  },

  // 0x0059: Change to specified scene (script.c:1870) —— sceneId = operand[0]
  // M3.5(D34/B 路线)真消费:disasm 出具名 LoadSceneCommand,EventSystem handler 是 stub
  // (no-op skip + console.debug);真 scene 切换由 dev panel 直调 loadScene() 函数。
  // M5 真做剧情链时升级 handler 为可等待命令。
  89: {
    name: 'loadScene',
    fields: [{ name: 'sceneId', kind: 'scene' }, VALUE, VALUE],
    named: true,
  },

  // ── 对话框样式(M2 新具名,D26) ─────────────────────────────────────────
  // 实际语义按 sdlpal script.c:3389+ 的 case 顺序;注意"top/center"在 0x003B 与
  // 0x003C 上的指代,跟 M2 plan 字面映射相反 —— 实施时以 script.c 为准。
  //
  // 0x003B → kDialogCenter (script.c:3389) —— 屏幕中部对话
  0x003b: {
    name: 'setDialogStyleCenter',
    fields: [VALUE, VALUE, VALUE],
    named: true,
  },
  // 0x003C → kDialogUpper (script.c:3399) —— 屏幕上部对话(playingRNG 等参数)
  0x003c: {
    name: 'setDialogStyleTop',
    fields: [VALUE, VALUE, VALUE],
    named: true,
  },
  // 0x003D → kDialogLower (script.c:3409) —— 屏幕下部对话
  0x003d: {
    name: 'setDialogStyleBottom',
    fields: [VALUE, VALUE, VALUE],
    named: true,
  },
  // 0x003E → kDialogCenterWindow (script.c:3419) —— 屏幕中部窗口式叙述
  0x003e: {
    name: 'setDialogStyleNarration',
    fields: [VALUE, VALUE, VALUE],
    named: true,
  },

  // ── 对话 ────────────────────────────────────────────────────────────────

  // 0xFFFF: Print dialog text (script.c:3438)
  65535: {
    name: 'showDialog',
    fields: [{ name: 'messageIndex', kind: 'message' }, VALUE, VALUE],
    named: true,
  },
}

/** 将 0x0000..0x00A6 中尚未具名的 opcode 填充为 raw 占位。 */
function fillUnnamedOpcodes(): void {
  for (let op = 0x0000; op <= 0x00a6; op++) {
    if (opcodeTable[op]) continue
    opcodeTable[op] = {
      name: 'raw',
      fields: [
        { name: 'op0', kind: 'value' },
        { name: 'op1', kind: 'value' },
        { name: 'op2', kind: 'value' },
      ],
      named: false,
    }
  }
}
fillUnnamedOpcodes()

// 建立 verb → opcode 的反向索引(仅取每个 verb 最低的 opcode 编号)
const verbToOpcode = new Map<string, number>()
for (const [opStr, def] of Object.entries(opcodeTable)) {
  if (def.named && def.name !== 'raw') {
    if (!verbToOpcode.has(def.name)) {
      verbToOpcode.set(def.name, Number(opStr))
    }
  }
}

/**
 * 根据 opcode 数值返回 verb 名称。
 * 未知 opcode 返回 'raw'。
 */
export function lookupVerb(opcode: number): string {
  return opcodeTable[opcode]?.name ?? 'raw'
}

/**
 * 根据 verb 名称返回对应的 opcode 数值。
 * 未知 verb 抛出错误。
 */
export function lookupOpcode(verb: string): number {
  const op = verbToOpcode.get(verb)
  if (op === undefined) throw new Error(`unknown verb: ${verb}`)
  return op
}
