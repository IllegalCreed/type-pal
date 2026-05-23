/**
 * EventSystem —— event 模式协程式步进器(02 架构 + D15 + 05)。
 * M2 范围:
 *  - loop-until-waitable:单 tick 内连跑非阻塞命令,撞 waitable / end / 越界才返回
 *  - showDialog:设 gs.dialogBox + 进入 waiting='dialog',emit showDialogBox
 *  - waiting=dialog 期间,按下 Confirm 释放、清 dialogBox、ip++ 继续步进
 *  - setDialogStyle*:累积到 gs.currentDialogStyle(供下一条 showDialog 用)
 *  - end:清 eventCursor / dialogBox,mode 切回 explore
 *  - goto:查 labelMap 跳转(目标不存在抛错)
 *  - raw:console.debug 跳过,ip++(M2 兜底:还没具名化的 opcode 不阻塞游戏)
 *  - giveItem / startBattle:M3+ 实现,M2 暂当 skip
 *  - sequence / if / choice:结构化 op,M2 不实现(抛错明示)
 *
 * SINGLE_TICK_LIMIT 兜底死循环(例如 goto 自指 / 死循环 raw 链)。
 */

import type { Command, InputSnapshot } from '@type-pal/shared'
import type { CommandBus } from './command-bus.js'
import type { GameState } from './game-state.js'

const SINGLE_TICK_LIMIT = 256

export function buildLabelMap(commands: Command[]): Record<string, number> {
  const map: Record<string, number> = {}
  commands.forEach((c, i) => {
    if (c.label) map[c.label] = i
  })
  return map
}

export function tickEventSystem(
  gs: GameState,
  input: InputSnapshot,
  bus: CommandBus,
): void {
  const cursor = gs.eventCursor
  if (!cursor) {
    gs.mode = 'explore'
    return
  }

  // 1) waiting 处理:阻塞在对话框,等 Confirm 释放
  if (cursor.waiting === 'dialog') {
    if (input.pressed.has('Confirm')) {
      cursor.waiting = undefined
      gs.dialogBox = undefined
      cursor.ip++
    } else {
      return
    }
  }

  // 2) 循环跑直到撞 waitable / end / 越界 / 超限
  let stepCount = 0
  while (true) {
    if (++stepCount > SINGLE_TICK_LIMIT) {
      throw new Error(
        `event-system: single-tick instruction limit (${SINGLE_TICK_LIMIT}) exceeded at ip=${cursor.ip}`,
      )
    }

    if (cursor.ip < 0 || cursor.ip >= cursor.commands.length) {
      console.warn(`event-system: ip ${cursor.ip} 越界 → 切回 explore`)
      gs.eventCursor = undefined
      gs.dialogBox = undefined
      gs.mode = 'explore'
      return
    }

    const cmd = cursor.commands[cursor.ip]!

    switch (cmd.op) {
      case 'end':
        gs.eventCursor = undefined
        gs.dialogBox = undefined
        gs.mode = 'explore'
        return

      case 'goto': {
        const target = cursor.labelMap[cmd.to]
        if (target === undefined) {
          throw new Error(`event-system: goto label ${cmd.to} 不在 labelMap`)
        }
        cursor.ip = target
        break
      }

      case 'showDialog': {
        gs.dialogBox = { text: cmd.text, style: gs.currentDialogStyle }
        cursor.waiting = 'dialog'
        bus.emit({ op: 'showDialogBox', text: cmd.text, style: gs.currentDialogStyle })
        // ip 停在 showDialog 上,waiting 释放时(上面 cursor.ip++)才推进
        return
      }

      case 'setDialogStyleTop':
        gs.currentDialogStyle = 'top'
        cursor.ip++
        break
      case 'setDialogStyleCenter':
        gs.currentDialogStyle = 'center'
        cursor.ip++
        break
      case 'setDialogStyleBottom':
        gs.currentDialogStyle = 'bottom'
        cursor.ip++
        break
      case 'setDialogStyleNarration':
        gs.currentDialogStyle = 'narration'
        cursor.ip++
        break

      case 'raw':
        console.debug(`event-system: skip raw opcode=${cmd.opcode} ip=${cursor.ip}`, cmd.operands)
        cursor.ip++
        break

      case 'giveItem':
      case 'startBattle':
        console.debug(`event-system: skip M3+ op=${cmd.op} ip=${cursor.ip}`)
        cursor.ip++
        break

      case 'sequence':
      case 'if':
      case 'choice':
        throw new Error(`event-system: 结构化 op ${cmd.op} M2 未实现`)

      default: {
        const _exhaustive: never = cmd
        throw new Error(`event-system: unhandled op ${(_exhaustive as Command).op}`)
      }
    }
  }
}
