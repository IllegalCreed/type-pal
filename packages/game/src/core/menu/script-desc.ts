/**
 * Read display lines for item and spell menus from the shared script catalogue.
 * Supported Win descriptions are linear showDialog/0xA7/end chains; this is not
 * PAL_RunAutoScript (SDLPal itemmenu.c) and does not execute arbitrary opcodes.
 * Translated groups may have a different line count while retaining the source resume IP.
 */

import { resolveMessageGroup } from '../../localization/messages.js'
import { getGlobalCommands, getGlobalLabelMap } from '../script-catalog.js'

/** Bound source-instruction scanning for a missing terminator; not a limit on translated rows. */
const MAX_DESCRIPTION_INSTRUCTIONS = 32

export function getScriptDescLines(scriptDesc: number): string[] {
  if (scriptDesc === 0) return []
  const labelMap = getGlobalLabelMap()
  const ip = labelMap[`L_${scriptDesc}`]
  if (ip === undefined) return []
  const cmds = getGlobalCommands()
  const lines: string[] = []
  for (let i = ip; i < cmds.length && i < ip + MAX_DESCRIPTION_INSTRUCTIONS; i++) {
    const cmd = cmds[i]!
    if (cmd.op === 'end') break
    if (cmd.op === 'showDialog') {
      const group = resolveMessageGroup(cmds, i)
      if (group?.lines) {
        lines.push(...group.lines.filter((line) => line !== null))
        i = group.resumeIp - 1
      } else lines.push(cmd.text)
    }
  }
  return lines
}
