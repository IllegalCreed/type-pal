import type { AbstractKey, InputSnapshot, PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { makeHEnemy, makeHField, makeHRole } from '../../../__tests__/glm-next-wave/H/harness.js'
import { createCommandBus } from '../../command-bus.js'
import { createInitialGameState, hydratePlayerRolesRuntime } from '../../game-state.js'
import { clearBattleRuntimeContext } from '../battle-runtime-context.js'
import { startBattle, tickBattle } from '../battle-system.js'
import { type BuildActionQueueInput, buildActionQueue } from '../turn-queue.js'

interface QueueCase {
  name: string
  input: BuildActionQueueInput
  /** 原C完整13槽排序后,在首个wDexterity=0xffff前的[isEnemy,idx,dex,fIsSecond]。 */
  expected: number[][]
}

// fight.c PAL_BattleStartFrame:填充/SHORT比较交换/0xffff结束。原生C片段回执与静态oracle逐项对照。
const cases: QueueCase[] = [
  {
    name: 'enemy-tie',
    input: {
      enemies: [
        { idx: 0, dex: 30, dualMove: false },
        { idx: 1, dex: 30, dualMove: false },
      ],
      players: [{ idx: 0, dex: 100 }],
    },
    expected: [
      [0, 0, 100, 0],
      [1, 1, 30, 0],
      [1, 0, 30, 0],
    ],
  },
  {
    name: 'mixed-tie',
    input: {
      enemies: [{ idx: 0, dex: 30, dualMove: false }],
      players: [
        { idx: 0, dex: 30 },
        { idx: 1, dex: 100 },
      ],
    },
    expected: [
      [0, 1, 100, 0],
      [0, 0, 30, 0],
      [1, 0, 30, 0],
    ],
  },
  {
    name: 'dual-tie',
    input: {
      enemies: [{ idx: 0, dex: 30, dualMove: true, dex2: 30 }],
      players: [{ idx: 0, dex: 100 }],
    },
    expected: [
      [0, 0, 100, 0],
      [1, 0, 30, 1],
      [1, 0, 30, 0],
    ],
  },
  {
    name: 'signed-partial',
    input: {
      enemies: [
        { idx: 0, dex: 32768, dualMove: false },
        { idx: 1, dex: 32767, dualMove: false },
      ],
      players: [{ idx: 0, dex: 100 }],
    },
    expected: [
      [1, 1, 32767, 0],
      [0, 0, 100, 0],
    ],
  },
  {
    name: 'occupied-sentinel',
    input: {
      enemies: [{ idx: 0, dex: 0xffff, dualMove: false }],
      players: [{ idx: 0, dex: 100 }],
    },
    expected: [[0, 0, 100, 0]],
  },
  {
    name: 'signed-full',
    input: {
      enemies: Array.from({ length: 5 }, (_, idx) => ({
        idx,
        dex: idx === 0 ? 32768 : 0,
        dualMove: true,
        dex2: idx === 0 ? 32768 : 0,
      })),
      players: [
        { idx: 0, dex: 0 },
        { idx: 1, dex: 0 },
        { idx: 2, dex: 0 },
      ],
    },
    expected: [
      [1, 1, 0, 0],
      [1, 1, 0, 1],
      [1, 2, 0, 0],
      [1, 2, 0, 1],
      [1, 3, 0, 0],
      [1, 3, 0, 1],
      [1, 4, 0, 0],
      [1, 4, 0, 1],
      [0, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 2, 0, 0],
      [1, 0, 32768, 1],
      [1, 0, 32768, 0],
    ],
  },
]

describe('SDLPal CLASSIC queue parity', () => {
  it.each(cases)('$name', ({ input, expected }) => {
    const queue = buildActionQueue(input)
    expect(queue.map((q) => [Number(q.isEnemy), q.idx, q.dex, Number(q.fIsSecond)])).toEqual(
      expected,
    )
  })

  it('startBattle / Confirm caller preserves RNG draws and C tie order', () => {
    const gs = createInitialGameState({ x: 160, y: 160, facing: 'right' })
    gs.partyMembers = [0]
    const playerRoles: PlayerRoles = { roles: [makeHRole(0, { dexterity: 100 })] }
    hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, playerRoles)
    const enemies = [
      makeHEnemy({ id: 100, level: 1, dexterity: 9 }), // (1+6)*3+9=30
      makeHEnemy({ id: 101, level: 1, dexterity: 9 }),
    ]
    const bus = createCommandBus()
    const input = (keys: AbstractKey[], frameNum: number): InputSnapshot => ({
      held: new Set<AbstractKey>(),
      pressed: new Set(keys),
      frameNum,
    })
    try {
      startBattle({
        gs,
        enemyTeamId: 0,
        battleFieldId: 0,
        isBoss: false,
        enemies,
        enemyTeams: [{ id: 0, enemies: [100, 101, 0xffff, 0xffff, 0xffff] }],
        battleFields: [makeHField()],
        playerRoles,
        items: [],
        spells: [],
        magics: [],
        objectMagics: [],
        objectPoisons: [],
        objectPlayers: [],
        commands: [{ op: 'end' }],
        rngSeed: 5,
      })
      tickBattle(gs, input([], 0), bus) // preBattle → selectAction
      tickBattle(gs, input([], 1), bus) // 起玩家菜单
      tickBattle(gs, input(['Confirm'], 2), bus) // 普攻 → 选敌
      tickBattle(gs, input(['Confirm'], 3), bus) // 确认 → 构建本轮队列
      const state = gs.battleState
      expect(state?.phase).toBe('performAction')
      expect(state?.actionQueue.map((q) => [Number(q.isEnemy), q.idx, q.dex])).toEqual([
        [0, 0, 94],
        [1, 1, 31],
        [1, 0, 31],
      ])
      // seed5的三次真实抖动为31/31/94;排序不得改变抽样数量或顺序。
      expect(state?.rng.getState()).toBe(1199730148)
    } finally {
      clearBattleRuntimeContext(gs)
      bus.drain()
    }
  })
})
