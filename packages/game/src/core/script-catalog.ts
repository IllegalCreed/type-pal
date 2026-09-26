/** 第一阶段共享脚本目录；只保存命令和标签，不依赖任何执行器。 */
import type { Command } from '@type-pal/shared'
import type { GameState } from './game-state.js'

// P2#5(2026-05-29):旧 shared.json 切片(_sharedCommands/setSharedEvents/getShared*)已删 —
// shared 只是全局数组的一个切片,塌缩进单一全局数组后 goto `shared#L_xxx` 由 resolveLabelIp 剥前缀
// 经全局 labelMap 解析(见 'goto' case)。

// ── 全局脚本数组(对应 sdlpal 单一 lprgScriptEntry)─────────────────────────────
// per-scene + shared 切片是优化,但跨 scene 设的脚本指针(0x24/0x25 把 A scene 对象的
// trigger/autoScript 设到只切进 B scene 的脚本)会在 A scene 解析失败。全局数组兜底:
// commands[i] = 全局 script entry i(events/all.json,annotated 未切片全量),label = L_<i>。
let _globalCommands: Command[] = []
let _globalLabelMap: Record<string, number> = {}

/**
 * 原版「扬州宝物屋」giveItem 归零 bug 补丁(tp 层修,user 2026-06-13 报开箱「?0」)。
 *
 * 3 个箱脚本提示「获得X」但 `giveItem itemId=0`(原版 SSS 数据 bug;提取器忠实保留,sdlpal
 * `AddItemToInventory(0)→FALSE` 也给空)。真道具确存在,只是提示 MSG 写了错字,故按**前一句
 * showDialog 的 messageIndex**(MSG.DAT 下标,稳定)把 giveItem(0) 补回真 id:
 *   12256「获得九节鞭」→ 九截鞭 164(武器) / 12347「获得紫青玉蓉膏」→ 紫菁玉蓉膏 103
 *   12408「获得腐尸肉」→ 尸腐肉 116
 * 提取器保持忠实(disasm↔recompile roundtrip 不变),修在 setGlobalEvents 加载后的运行时数据上。
 * 偏离原版(原版此处给空)= 跟原版后期/修复版应给的真道具,属 tp 层有意修正。
 */
const GIVEITEM_ZERO_FIXUP: Record<number, number> = {
  12256: 164, // 「获得九节鞭」(MSG 错字)→ 九截鞭
  12347: 103, // 「获得紫青玉蓉膏」→ 紫菁玉蓉膏
  12408: 116, // 「获得腐尸肉」→ 尸腐肉
}

export function patchGiveItemZeroBugs(commands: Command[]): void {
  for (let i = 1; i < commands.length; i++) {
    const c = commands[i]
    if (c?.op !== 'giveItem' || c.itemId !== 0) continue
    const prev = commands[i - 1]
    if (prev?.op !== 'showDialog') continue
    const fix = GIVEITEM_ZERO_FIXUP[prev.messageIndex]
    if (fix !== undefined) c.itemId = fix
  }
}

/** bootstrap 注入 events/all.json 的全量命令;labelMap 由带 label 的命令建(L_<i> → i)。 */
export function setGlobalEvents(commands: Command[]): void {
  patchGiveItemZeroBugs(commands) // tp 层:修原版宝物屋 giveItem 归零 bug(见函数注释)
  _globalCommands = commands
  const map: Record<string, number> = {}
  for (let i = 0; i < commands.length; i++) {
    const lbl = commands[i]?.label
    if (lbl) map[lbl] = i
  }
  _globalLabelMap = map
}

export function getGlobalCommands(): Command[] {
  return _globalCommands
}

export function getGlobalLabelMap(): Record<string, number> {
  return _globalLabelMap
}

/**
 * P2#5(2026-05-29 单一全局脚本数组):cursor 的命令数组 / labelMap。
 * 生产 cursor 不带 commands/labelMap → 默认读单一全局数组(_globalCommands/_globalLabelMap,
 * = sdlpal 单一 lprgScriptEntry)。单测可传自带数组当 override。
 */
export function getCmds(cursor: { commands?: Command[] }): Command[] {
  return cursor.commands ?? _globalCommands
}
export function getLabels(cursor: { labelMap?: Record<string, number> }): Record<string, number> {
  return cursor.labelMap ?? _globalLabelMap
}

/** goto/call/reset 目标 label(可能带 `shared#` 前缀)→ ip(经 cursor labelMap,默认全局)。 */
export function resolveLabelIp(
  cursor: { labelMap?: Record<string, number> },
  to: string,
): number | undefined {
  const label = to.startsWith('shared#') ? to.slice('shared#'.length) : to
  return getLabels(cursor)[label]
}

/**
 * 脚本 label → 全局 ip。P2#5 后塌缩成单一全局数组查找(all.json 的 L_<n> → n 恒等,0 违例)。
 * 返回 ip(全局下标);commands/labelMap 省略 → caller 建的 cursor 默认读全局数组(不再内嵌 → 不膨胀存档)。
 * 保留 gs 参数 + 可选 commands/labelMap 返回字段,兼容旧 caller 的解构(得 undefined → 默认全局)。
 */
export function resolveScriptLabel(
  gs: GameState,
  label: string,
): { commands?: Command[]; labelMap?: Record<string, number>; ip: number } | null {
  void gs
  const ip = _globalLabelMap[label]
  return ip !== undefined ? { ip } : null
}
