/**
 * TEST-GLM-NEW-G-1 G02：battle-command-selection 残差（纯状态机；battle-session 是唯一
 * 生产消费者）。旧证（battle-command-selection.test.ts / .residual / W1 会话流）已证
 * 主菜单四向、目标格、合击、R/F/A、LIFO 回退与杂项往返；本文件只补旧题未覆盖的臂：
 *   1) 技能网格竖向 ±3 导航与 Math.max/Math.min 钳制（battle-command-selection.ts:246-247）；
 *   2) 主菜单 E 直进 item 后 Escape 落 miscSub（:279），再 Esc 回 misc → menu（:229/:212）；
 *   3) 队友目标 Escape 按 pendingItemId 退回 item（:324-333）；
 *   4) 零活敌进入敌方目标阶段：confirm/Esc 均 no-op 零提交（:352-353）。
 */
import type { ItemData, SkillData } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import {
  BattleCommandSelection,
  type BattleCommandSelectionContext,
  type BattleCommandSelectionPort,
} from './battle-command-selection.js'
import type { BattleAction } from './battle-core.js'

const skill = (id: string, target: SkillData['target'] = 'oneEnemy'): SkillData => ({
  id,
  name: id,
  desc: '',
  cost: {},
  usableOutsideBattle: false,
  target,
  effects: [],
  animation: { effectSprite: 0 },
})

const item = (id: string, target: NonNullable<ItemData['use']>['target']): ItemData => ({
  id,
  name: id,
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: false,
  use: { target, consuming: true, effects: [] },
})

function context(
  overrides: Partial<BattleCommandSelectionContext> = {},
): BattleCommandSelectionContext {
  return {
    playerIndex: 0,
    player: { skills: [], mp: 100, silenced: false, healthy: true },
    playerCount: 2,
    healthyPlayerCount: 2,
    aliveEnemyIndices: [2, 4],
    usableItems: [],
    throwableItems: [],
    skills: {},
    items: {},
    money: 100,
    ...overrides,
  }
}

function recordingPort(): {
  port: BattleCommandSelectionPort
  submissions: Array<{ playerIndex: number; action: BattleAction }>
  retract: ReturnType<typeof vi.fn<(playerIndex: number) => void>>
  consume: ReturnType<typeof vi.fn<(casterIndex: number) => void>>
} {
  const submissions: Array<{ playerIndex: number; action: BattleAction }> = []
  const retract = vi.fn<(playerIndex: number) => void>()
  const consume = vi.fn<(casterIndex: number) => void>()
  return {
    submissions,
    retract,
    consume,
    port: {
      submit: (playerIndex, action) => submissions.push({ playerIndex, action }),
      retract,
      consumeOthersForCoop: consume,
    },
  }
}

describe('G02 battle-command-selection 残差', () => {
  test('技能网格竖向 ±3 导航：上边界钳 0、下边界钳尾（非 wrap）', () => {
    const selection = new BattleCommandSelection()
    const recorded = recordingPort()
    const ids = ['s0', 's1', 's2', 's3', 's4']
    const current = context({
      player: {
        skills: ids,
        mp: 100,
        silenced: false,
        healthy: true,
      },
      skills: Object.fromEntries(ids.map((id) => [id, skill(id)])),
    })
    selection.advance(current, new Set(['ArrowLeft', ' ']), recorded.port)
    expect(selection.phase).toBe('skill')
    expect(selection.view.skillIndex).toBe(0)
    selection.advance(current, new Set(['ArrowDown']), recorded.port)
    expect(selection.view.skillIndex).toBe(3) // +3 行跳
    selection.advance(current, new Set(['ArrowDown']), recorded.port)
    expect(selection.view.skillIndex).toBe(4) // 尾部钳制（min(4, 6)）
    selection.advance(current, new Set(['ArrowDown']), recorded.port)
    expect(selection.view.skillIndex).toBe(4) // 不 wrap
    selection.advance(current, new Set(['ArrowUp']), recorded.port)
    expect(selection.view.skillIndex).toBe(1) // −3 行跳
    selection.advance(current, new Set(['ArrowUp']), recorded.port)
    expect(selection.view.skillIndex).toBe(0) // 首位钳制（max(0, −2)）
    selection.advance(current, new Set(['ArrowUp']), recorded.port)
    expect(selection.view.skillIndex).toBe(0) // 不 wrap
    expect(recorded.submissions).toEqual([])
  })

  test('主菜单 E 直进 item 后 Escape 落 miscSub（未到访），再 Esc 经 misc 回主菜单', () => {
    const selection = new BattleCommandSelection()
    const recorded = recordingPort()
    const tonic = item('tonic', 'oneAlly')
    const current = context({
      usableItems: [{ itemId: 'tonic', count: 2 }],
      items: { tonic },
    })
    selection.advance(current, new Set(['e', 'E']), recorded.port)
    expect(selection.phase).toBe('item')
    // 直入口的 Escape 惯性落在 miscSub（:279），不崩、不误提交。
    selection.advance(current, new Set(['Escape']), recorded.port)
    expect(selection.phase).toBe('miscSub')
    expect(selection.view.miscSubIndex).toBe(0)
    expect(recorded.submissions).toEqual([])
    // miscSub Escape 回 misc，misc Escape 回主菜单。
    selection.advance(current, new Set(['Escape']), recorded.port)
    expect(selection.phase).toBe('misc')
    selection.advance(current, new Set(['Escape']), recorded.port)
    expect(selection.phase).toBe('menu')
    expect(recorded.submissions).toEqual([])
  })

  test('队友目标 Escape 按 pendingItemId 退回 item；再确认按队友槽提交物品', () => {
    const selection = new BattleCommandSelection()
    const recorded = recordingPort()
    const tonic = item('tonic', 'oneAlly')
    const current = context({
      usableItems: [{ itemId: 'tonic', count: 2 }],
      items: { tonic },
    })
    selection.advance(current, new Set(['e', 'E']), recorded.port)
    expect(selection.phase).toBe('item')
    selection.advance(current, new Set([' ']), recorded.port) // oneAlly 用品 → 队友目标格
    expect(selection.phase).toBe('target')
    expect(selection.view.targetSide).toBe('ally')
    expect(selection.view.targetIndex).toBe(0)
    selection.advance(current, new Set(['ArrowRight']), recorded.port)
    expect(selection.view.targetIndex).toBe(1)
    // Escape 精确退回 item（pendingItemId 分支 :326-328），非 skill。
    selection.advance(current, new Set(['Escape']), recorded.port)
    expect(selection.phase).toBe('item')
    expect(recorded.submissions).toEqual([])
    // 重入并提交：目标槽位从 self(0) 重新开始。
    selection.advance(current, new Set([' ']), recorded.port)
    selection.advance(current, new Set(['Enter']), recorded.port)
    expect(recorded.submissions).toEqual([
      { playerIndex: 0, action: { kind: 'item', itemId: 'tonic', targetAllyIdx: 0 } },
    ])
    expect(selection.phase).toBe('menu')
  })

  test('零活敌进入敌方目标阶段：confirm 与 Escape 均 no-op，零提交零崩溃', () => {
    const selection = new BattleCommandSelection()
    const recorded = recordingPort()
    const dead = context({ aliveEnemyIndices: [] })
    // mainActionValidity[0] 恒真 → 主菜单确认即可进入敌方目标格（现行公开门）。
    selection.advance(dead, new Set([' ']), recorded.port)
    expect(selection.phase).toBe('target')
    selection.advance(dead, new Set(['ArrowLeft', 'ArrowRight']), recorded.port)
    selection.advance(dead, new Set(['Escape']), recorded.port)
    expect(selection.phase).toBe('target') // 无活敌臂不迁移
    selection.advance(dead, new Set(['Enter']), recorded.port)
    expect(selection.phase).toBe('target')
    expect(recorded.submissions).toEqual([])
    expect(recorded.retract).not.toHaveBeenCalled()
    expect(recorded.consume).not.toHaveBeenCalled()
  })
})
