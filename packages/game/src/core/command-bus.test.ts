import { describe, it, expect } from 'vitest'
import { createCommandBus, type PresentCommand } from './command-bus.js'

describe('CommandBus', () => {
  it('emit + drain 顺序', () => {
    const bus = createCommandBus()
    bus.emit({ op: 'showDialogBox', text: 'hi', style: 'center' })
    bus.emit({ op: 'showDialogBox', text: 'bye', style: 'top' })
    const drained = bus.drain()
    expect(drained).toHaveLength(2)
    expect(drained[0]?.cmd.op).toBe('showDialogBox')
  })

  it('drain 后 bus 清空', () => {
    const bus = createCommandBus()
    bus.emit({ op: 'showDialogBox', text: 'a', style: 'top' })
    bus.drain()
    expect(bus.drain()).toEqual([])
  })

  it('emit 返回唯一 cmdId', () => {
    const bus = createCommandBus()
    const id1 = bus.emit({ op: 'clearDialogBox' })
    const id2 = bus.emit({ op: 'clearDialogBox' })
    expect(id1).not.toBe(id2)
  })

  it('complete(cmdId) M2 内 no-op,但不抛错', () => {
    const bus = createCommandBus()
    const id = bus.emit({ op: 'clearDialogBox' })
    expect(() => bus.complete(id)).not.toThrow()
  })

  it('未知 cmdId complete —— 不抛错', () => {
    const bus = createCommandBus()
    expect(() => bus.complete(999999)).not.toThrow()
  })

  it('emit 返回的 cmdId 与 drain 出的 BusEntry.cmdId 配对', () => {
    const bus = createCommandBus()
    const id = bus.emit({ op: 'clearDialogBox' })
    const [entry] = bus.drain()
    expect(entry?.cmdId).toBe(id)
  })
})

describe('Battle PresentCommands', () => {
  it('PresentCommand 联合含 9 战斗命令', () => {
    const cmds: PresentCommand[] = [
      { op: 'showBattleMessage', text: 'hit!' },
      { op: 'showDamageNum', target: { kind: 'enemy', idx: 0 }, value: 25, color: 'blue' },
      { op: 'flashEnemy', enemyIdx: 0, durationMs: 300 },
      { op: 'flashPlayer', playerIdx: 0, durationMs: 300 },
      { op: 'playEnemyAttack', enemyIdx: 0, targetPlayerIdx: 0 },
      { op: 'playPlayerAttack', playerIdx: 0, targetEnemyIdx: 0 },
      { op: 'playMagicAnim', magicId: 12, casterType: 'player', casterIdx: 0, targetType: 'enemy', targetIdx: 0 },
      { op: 'playMagicAnim', magicId: 12, casterType: 'player', casterIdx: 0, targetType: 'enemy', targetIdx: 'all' },
      { op: 'playEnemyDeath', enemyIdx: 0 },
      { op: 'showBattleUI', state: 'mainMenu' },
    ]
    expect(cmds.length).toBeGreaterThan(0)
  })

  it('showDamageNum color 接受 yellow / blue / cyan + 逻辑 target', () => {
    // type-only test:不应 compile 错就 OK。颜色真值(fight.c:602-716):
    //   blue=掉血 / yellow=回血 / cyan=回 MP。
    const blue: PresentCommand = { op: 'showDamageNum', target: { kind: 'enemy', idx: 0 }, value: 25, color: 'blue' }
    const yellow: PresentCommand = { op: 'showDamageNum', target: { kind: 'player', idx: 1 }, value: 30, color: 'yellow' }
    const cyan: PresentCommand = { op: 'showDamageNum', target: { kind: 'player', idx: 2 }, value: 5, color: 'cyan' }
    expect(yellow).toBeDefined()
    expect(blue).toBeDefined()
    expect(cyan).toBeDefined()
  })

  it('showBattleUI state 联合', () => {
    const states: Array<{ op: 'showBattleUI'; state: 'mainMenu' | 'magicMenu' | 'itemMenu' | 'targetSelect' | 'hidden' }> = [
      { op: 'showBattleUI', state: 'mainMenu' },
      { op: 'showBattleUI', state: 'magicMenu' },
      { op: 'showBattleUI', state: 'itemMenu' },
      { op: 'showBattleUI', state: 'targetSelect' },
      { op: 'showBattleUI', state: 'hidden' },
    ]
    expect(states).toHaveLength(5)
  })
})
