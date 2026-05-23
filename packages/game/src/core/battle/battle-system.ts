/**
 * Battle mode tick —— T22 真实现(phase 状态机:select / perform / post-action / won / lost / fleed)。
 *
 * T14 占位 stub:不做任何事,仅让 mode.ts 的 case 'battle' 通过 typecheck。
 * 真实现在 T22 落地,届时本文件会展开为 phase 路由。
 */

import type { InputSnapshot } from '@type-pal/shared'
import type { CommandBus } from '../command-bus.js'
import type { GameState } from '../game-state.js'

export function tickBattle(_gs: GameState, _input: InputSnapshot, _bus: CommandBus): void {
  // T22 实装:phase 路由 + select / perform / post-action / won / lost / fleed。
  // T14 范围:no-op stub。
}
