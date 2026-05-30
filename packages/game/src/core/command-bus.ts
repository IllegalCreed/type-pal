/**
 * Core → Present 单向命令通道(02 架构 + D15)。
 * M2 同步语义:Core 系统在 tick 内 emit、tick 末 Present 一把 drain。
 * 异步回执机制(complete cmdId)接口留下,M3 转场 / 视频时激活。
 */

import type { DialogBoxStyle } from '@type-pal/shared'

export type PresentCommand =
  | { op: 'showDialogBox'; text: string; style: DialogBoxStyle }
  | { op: 'clearDialogBox' }
  // M3 战斗 UI 命令(T15)
  | { op: 'showBattleMessage'; text: string }
  /**
   * 战斗数字弹幕(HP/MP 变化)。逻辑 target(present 层解析屏幕坐标,杜绝漂移)。
   *
   * sdlpal 真值颜色(`fight.c:602-716 PAL_BattleDisplayStatChange`,sDamage=newHP-oldHP):
   *   - blue   = 掉血(受伤;sDamage<0 → value=oldHP-newHP)  `fight.c:648-651,678-681`
   *   - yellow = 回血(治疗;sDamage>0 → value=newHP-oldHP)  `fight.c:652-655,682-685`
   *   - cyan   = 回 MP(仅上升;`fight.c:706-709`)
   *  (旧注释 'yellow=伤害, blue=治疗' 与真值正好相反 — 已修正。)
   */
  | {
      op: 'showDamageNum'
      target: { kind: 'enemy' | 'player'; idx: number }
      value: number
      color: 'yellow' | 'blue' | 'cyan'
    }
  | { op: 'flashEnemy'; enemyIdx: number; durationMs: number }
  | { op: 'flashPlayer'; playerIdx: number; durationMs: number }
  | { op: 'playEnemyAttack'; enemyIdx: number; targetPlayerIdx: number }
  | { op: 'playPlayerAttack'; playerIdx: number; targetEnemyIdx: number }
  | {
      op: 'playMagicAnim'
      magicId: number
      casterType: 'enemy' | 'player'
      casterIdx: number
      targetType: 'enemy' | 'player'
      targetIdx: number | 'all'
    }
  | { op: 'playEnemyDeath'; enemyIdx: number }
  | { op: 'showBattleUI'; state: 'mainMenu' | 'magicMenu' | 'itemMenu' | 'targetSelect' | 'hidden' }

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
      // TODO(M3): 把异步资源跟 cmdId 关联,完成时调此回调;M2 内同步语义不需要。
    },
  }
}
