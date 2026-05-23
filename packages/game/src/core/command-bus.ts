/**
 * Core → Present 单向命令通道(02 架构 + D15)。
 * M2 同步语义:Core 系统在 tick 内 emit、tick 末 Present 一把 drain。
 * 异步回执机制(complete cmdId)接口留下,M3 转场 / 视频时激活。
 */

import type { DialogBoxStyle } from '@type-pal/shared'

export type PresentCommand =
  | { op: 'showDialogBox'; text: string; style: DialogBoxStyle }
  | { op: 'clearDialogBox' }

export interface BusEntry {
  cmdId: number
  cmd: PresentCommand
}

export interface CommandBus {
  emit(cmd: PresentCommand): number
  drain(): BusEntry[]
  complete(cmdId: number): void
}

export function createCommandBus(): CommandBus {
  let queue: BusEntry[] = []
  let nextId = 1

  return {
    emit(cmd) {
      const cmdId = nextId++
      queue.push({ cmdId, cmd })
      return cmdId
    },
    drain() {
      const out = queue
      queue = []
      return out
    },
    complete(_cmdId) {
      // M2 内 no-op;M3 转场 / 视频时把异步资源跟 cmdId 关联,完成时调 complete。
    },
  }
}
