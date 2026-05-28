/**
 * sdlpal itemmenu.c:267-284 WIN95 path:跑 item.wScriptDesc chain 取所有描述行。
 *
 * 每条 sdlpal opcode 0xFFFF entry 是一行描述(script.c:3607-3637 真值);
 * pal-extract 反编译时已把 0xFFFF + message id 转 inline `showDialog` op 带 text,
 * 所以本 fn 只需遍历 commands 收集 showDialog text 即可。
 *
 * 木剑 scriptDesc=40133 chain 真值:
 *   raw 0xA7 noop(label L_40133)
 *   showDialog "用木材雕刻的剑，小孩玩具。"
 *   showDialog "武术+2 身法+3"
 *   end
 *
 * 用于 drawInventoryMenu 描述区(底部 71, 151+i*16,DESCTEXT_COLOR 0x3C)。
 */

import { getSharedCommands, getSharedLabelMap } from '../event-system.js'

/** SAFETY:scriptDesc 实测最长 3-4 行,32 是宽松上限防死循环。 */
const MAX_DESC_LINES_LOOKAHEAD = 32

export function getScriptDescLines(scriptDesc: number): string[] {
  if (scriptDesc === 0) return []
  const labelMap = getSharedLabelMap()
  const ip = labelMap[`L_${scriptDesc}`]
  if (ip === undefined) return []
  const cmds = getSharedCommands()
  const lines: string[] = []
  for (let i = ip; i < cmds.length && i < ip + MAX_DESC_LINES_LOOKAHEAD; i++) {
    const cmd = cmds[i]!
    if (cmd.op === 'end') break
    if (cmd.op === 'showDialog') {
      lines.push(cmd.text)
    }
    // raw 0xA7 noop / 其它 op 跳过
  }
  return lines
}
