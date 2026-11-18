import type { ItemData, SkillData } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import {
  BattleCommandSelection,
  type BattleCommandSelectionContext,
  type BattleCommandSelectionPort,
} from './battle-command-selection.js'
import selectionSource from './battle-command-selection.ts?raw'
import type { BattleAction } from './battle-core.js'
import battleSessionSource from './battle-session.ts?raw'

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
    selectablePlayerIndices: [0, 1],
    aliveEnemyIndices: [2, 4],
    usableItems: [],
    throwableItems: [],
    skills: {},
    items: {},
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

describe('BattleCommandSelection', () => {
  test('keeps invalid main directions on attack and synchronously commits the selected enemy', () => {
    const selection = new BattleCommandSelection()
    const recorded = recordingPort()
    const silenced = context({
      player: { skills: ['spell'], mp: 100, silenced: true, healthy: true },
      skills: { spell: skill('spell') },
    })

    selection.advance(silenced, new Set(['ArrowLeft', 'Enter']), recorded.port)
    expect(selection.phase).toBe('target')
    expect(selection.view.menuIndex).toBe(0)
    selection.advance(silenced, new Set(['ArrowRight', 'Enter']), recorded.port)

    expect(recorded.submissions).toEqual([
      { playerIndex: 0, action: { kind: 'attack', targetEnemyIdx: 4 } },
    ])
    expect(selection.phase).toBe('menu')
  })

  test.each([
    { key: 'd', action: { kind: 'defend' as const } },
    { key: 'Q', action: { kind: 'flee' as const } },
  ])('$key submits its direct command and returns to main', ({ key, action }) => {
    const selection = new BattleCommandSelection()
    const recorded = recordingPort()
    selection.advance(
      context({ playerCount: 1, healthyPlayerCount: 1, selectablePlayerIndices: [0] }),
      new Set([key]),
      recorded.port,
    )
    expect(recorded.submissions).toEqual([{ playerIndex: 0, action }])
    expect(selection.phase).toBe('menu')
  })

  test.each([
    ['shortcut', ['Q']],
    ['misc menu', ['ArrowDown', 'Enter', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter']],
  ])('replaces an earlier ally command when choosing party escape via %s', (_entry, inputs) => {
    const selection = new BattleCommandSelection()
    const recorded = recordingPort()
    const liveParty = { playerCount: 3, selectablePlayerIndices: [0, 2] }
    selection.advance(context(liveParty), new Set(['d']), recorded.port)
    const leader = context({ ...liveParty, playerIndex: 2 })
    for (const key of inputs) selection.advance(leader, new Set([key]), recorded.port)
    expect(recorded.submissions).toEqual([
      { playerIndex: 0, action: { kind: 'defend' } },
      { playerIndex: 0, action: { kind: 'flee' } },
      { playerIndex: 2, action: { kind: 'flee' } },
    ])
    expect(selection.phase).toBe('menu')
  })

  test('routes an enemy skill through grid selection and retargets before commit', () => {
    const selection = new BattleCommandSelection()
    const recorded = recordingPort()
    const strike = skill('strike')
    const current = context({
      player: { skills: [strike.id], mp: 100, silenced: false, healthy: true },
      skills: { [strike.id]: strike },
    })

    selection.advance(current, new Set(['ArrowLeft', 'Enter']), recorded.port)
    expect(selection.phase).toBe('skill')
    selection.advance(current, new Set(['Enter']), recorded.port)
    expect(selection.view).toMatchObject({ phase: 'target', targetSide: 'enemy' })
    selection.advance(current, new Set(['ArrowRight', 'Enter']), recorded.port)

    expect(recorded.submissions).toEqual([
      {
        playerIndex: 0,
        action: { kind: 'cast', skillId: strike.id, targetEnemyIdx: 4 },
      },
    ])
  })

  test('misc auto attack reuses a living selected enemy and preserves a group weapon', () => {
    const selection = new BattleCommandSelection()
    const recorded = recordingPort()
    const first = context()
    selection.advance(first, new Set(['Enter']), recorded.port)
    selection.advance(first, new Set(['ArrowRight', 'Enter']), recorded.port)

    const second = context({ playerIndex: 1 })
    selection.advance(second, new Set(['ArrowDown', 'Enter']), recorded.port)
    selection.advance(second, new Set(['Enter']), recorded.port)
    selection.advance(second, new Set(), recorded.port)
    expect(recorded.submissions).toEqual([
      { playerIndex: 0, action: { kind: 'attack', targetEnemyIdx: 4 } },
      { playerIndex: 1, action: { kind: 'attack', targetEnemyIdx: 4 } },
    ])
    expect(selection.isAutoAttacking).toBe(true)

    selection.beginRound()
    const group = context({ player: { ...first.player, attackAll: true } })
    selection.advance(group, new Set(), recorded.port)
    expect(recorded.submissions.at(-1)).toEqual({
      playerIndex: 0,
      action: { kind: 'attack', targetEnemyIdx: -1 },
    })
  })

  test('misc status pages through the party without submitting or retracting a command', () => {
    const selection = new BattleCommandSelection()
    const recorded = recordingPort()
    const second = context({ playerIndex: 1 })
    selection.advance(second, new Set(['ArrowDown', 'Enter']), recorded.port)
    selection.advance(second, new Set(['ArrowUp', 'Enter']), recorded.port)
    expect(selection.phase).toBe('status')

    selection.advance(second, new Set(['Enter']), recorded.port)
    selection.advance(second, new Set(['Enter']), recorded.port)
    expect(selection.view).toMatchObject({ phase: 'menu', menuIndex: 3 })
    expect(recorded.submissions).toEqual([])
    expect(recorded.retract).not.toHaveBeenCalled()

    selection.advance(second, new Set(['ArrowUp', 'Enter']), recorded.port)
    selection.advance(second, new Set(['Enter']), recorded.port)
    expect(recorded.submissions).toEqual([
      { playerIndex: 1, action: { kind: 'attack', targetEnemyIdx: 2 } },
    ])
  })

  test('routes a one-ally item through the ally cursor including dead-slot-capable indices', () => {
    const selection = new BattleCommandSelection()
    const recorded = recordingPort()
    const herb = item('herb', 'oneAlly')
    const current = context({
      playerIndex: 1,
      playerCount: 3,
      usableItems: [{ itemId: herb.id, count: 1 }],
      items: { [herb.id]: herb },
    })

    selection.advance(current, new Set(['E']), recorded.port)
    expect(selection.phase).toBe('item')
    selection.advance(current, new Set(['Enter']), recorded.port)
    expect(selection.view).toMatchObject({ phase: 'target', targetSide: 'ally', targetIndex: 1 })
    selection.advance(current, new Set(['ArrowRight', 'Enter']), recorded.port)

    expect(recorded.submissions).toEqual([
      {
        playerIndex: 1,
        action: { kind: 'item', itemId: herb.id, targetAllyIdx: 2 },
      },
    ])
  })

  test('all-enemy coop commits once and asks the host for synchronous teammate placeholders', () => {
    const selection = new BattleCommandSelection()
    const recorded = recordingPort()
    const coop = skill('coop', 'allEnemies')
    const current = context({
      player: {
        skills: [],
        mp: 100,
        silenced: false,
        healthy: true,
        cooperativeMagicSkillId: coop.id,
      },
      skills: { [coop.id]: coop },
    })

    selection.advance(current, new Set(['ArrowRight', 'Enter']), recorded.port)
    expect(recorded.submissions).toEqual([{ playerIndex: 0, action: { kind: 'coop' } }])
    expect(recorded.consume).toHaveBeenCalledWith(0)
  })

  test('F is round-sticky, A survives beginRound, and Escape cancels the active shortcut', () => {
    const force = new BattleCommandSelection()
    const forced = recordingPort()
    force.advance(context({ playerIndex: 0 }), new Set(['f']), forced.port)
    force.advance(context({ playerIndex: 1 }), new Set(), forced.port)
    expect(forced.submissions.map(({ playerIndex }) => playerIndex)).toEqual([0, 1])
    force.beginRound()
    force.advance(context({ playerIndex: 0 }), new Set(), forced.port)
    expect(forced.submissions).toHaveLength(2)

    const automatic = new BattleCommandSelection()
    const auto = recordingPort()
    automatic.advance(context({ playerIndex: 0 }), new Set(['a']), auto.port)
    automatic.beginRound()
    automatic.advance(context({ playerIndex: 0 }), new Set(), auto.port)
    expect(auto.submissions).toHaveLength(2)
    automatic.advance(context({ playerIndex: 1 }), new Set(['Escape']), auto.port)
    automatic.advance(context({ playerIndex: 1 }), new Set(), auto.port)
    expect(auto.submissions).toHaveLength(2)
  })

  test('R retains the prior action but repairs a dead enemy target from the current sample', () => {
    const selection = new BattleCommandSelection()
    const recorded = recordingPort()
    const first = context({ aliveEnemyIndices: [2] })
    selection.advance(first, new Set(['Enter']), recorded.port)
    selection.advance(first, new Set(['Enter']), recorded.port)
    selection.beginRound()

    selection.advance(context({ aliveEnemyIndices: [4, 6] }), new Set(['r']), recorded.port)
    expect(recorded.submissions.at(-1)).toEqual({
      playerIndex: 0,
      action: { kind: 'attack', targetEnemyIdx: 4 },
    })
  })

  test('Escape retracts the most recently submitted player in LIFO order', () => {
    const selection = new BattleCommandSelection()
    const recorded = recordingPort()
    selection.advance(context({ playerIndex: 0 }), new Set(['d']), recorded.port)
    selection.advance(context({ playerIndex: 1 }), new Set(['d']), recorded.port)
    selection.advance(context({ playerIndex: 2 }), new Set(['Escape']), recorded.port)
    expect(recorded.retract).toHaveBeenCalledOnce()
    expect(recorded.retract).toHaveBeenCalledWith(1)
  })

  test('合击点名队友，取消不消费回合，确认只提交选中的队友槽', () => {
    const selection = new BattleCommandSelection()
    const recorded = recordingPort()
    const support = context({
      player: {
        skills: [],
        mp: 1,
        silenced: false,
        healthy: true,
        cooperativeMagicSkillId: 'heal',
      },
      skills: { heal: { ...skill('heal', 'oneAlly'), cost: { mp: 120 } } },
    })

    selection.advance(support, new Set(['ArrowRight', 'Enter']), recorded.port)
    expect(selection.view).toMatchObject({ phase: 'target', targetSide: 'ally', targetIndex: 0 })
    selection.advance(support, new Set(['Escape']), recorded.port)
    expect(selection.phase).toBe('menu')
    expect(recorded.submissions).toEqual([])
    expect(recorded.consume).not.toHaveBeenCalled()

    selection.advance(support, new Set(['Enter']), recorded.port)
    selection.advance(support, new Set(['ArrowRight', 'Enter']), recorded.port)
    expect(recorded.submissions).toEqual([
      { playerIndex: 0, action: { kind: 'coop', targetAllyIdx: 1 } },
    ])
    expect(recorded.consume.mock.calls).toEqual([[0]])
  })

  test.each(['self', 'allAllies'] as const)('合击 %s 无须进入目标选择', (target) => {
    const selection = new BattleCommandSelection()
    const recorded = recordingPort()
    const support = context({
      player: {
        skills: [],
        mp: 1,
        silenced: false,
        healthy: true,
        cooperativeMagicSkillId: 'heal',
      },
      skills: { heal: skill('heal', target) },
    })
    selection.advance(support, new Set(['ArrowRight', 'Enter']), recorded.port)
    expect(recorded.submissions).toEqual([{ playerIndex: 0, action: { kind: 'coop' } }])
    expect(recorded.consume.mock.calls).toEqual([[0]])
    expect(selection.phase).toBe('menu')
  })
})

describe('BattleCommandSelection ownership boundary', () => {
  test('owns command transients and receives only the selection projection plus three commit ports', () => {
    for (const field of [
      'currentPhase',
      'menuIndex',
      'pendingSkillId',
      'targetIndex',
      'autoAttack',
      'stickyForce',
      'stickyRepeat',
      'lastActions',
      'submitOrder',
    ])
      expect(selectionSource).toMatch(new RegExp(`private(?: readonly)? ${field}`))
    expect(selectionSource).not.toContain('BattleState')
    expect(selectionSource).not.toContain("from './battle-session")
    expect(selectionSource).toContain('submit(playerIndex: number, action: BattleAction): void')
    expect(selectionSource).toContain('retract(playerIndex: number): void')
    expect(selectionSource).toContain('consumeOthersForCoop(casterIndex: number): void')

    for (const stale of [
      'private menuIdx',
      'private pendingSkillId',
      'private fAuto',
      'private stickyForce',
      'private lastActs',
      'private submitOrder',
    ])
      expect(battleSessionSource).not.toContain(stale)
    expect(battleSessionSource.match(/new BattleCommandSelection\(/g)).toHaveLength(1)
    expect(battleSessionSource).toContain('this.selection.advance(context, pressed, {')
  })
})
