// @vitest-environment node
/** Extracted PAL tables through battle input, actions and finalization; controller-level integration. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type {
  AbstractKey,
  Command,
  EnemyObject,
  InputSnapshot,
  PlayerRole,
  PlayerRoles,
} from '@type-pal/shared'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { createCommandBus } from '../command-bus.js'
import { createInitialGameState, loadDefaultGame } from '../game-state.js'
import { setGlobalEvents } from '../script-catalog.js'
import { clearBattleRuntimeContext, getBattleResources } from './battle-runtime-context.js'
import {
  type StartBattleInput,
  startBattle,
  stepDeathFadeRender,
  tickBattle,
} from './battle-system.js'

const resourceRoot = new URL('../../../../../data/extracted/', import.meta.url)

/** Read required producer fixtures; missing files or invalid JSON throw. */
function readFixture<T>(path: string): T {
  return JSON.parse(readFileSync(fileURLToPath(new URL(path, resourceRoot)), 'utf8'))
}

function prepareBattle(options: { roleOverrides: Partial<PlayerRole>; rngSeed: number }) {
  const playerRoles = readFixture<PlayerRoles>('data/player-roles.json')
  const leader = playerRoles.roles[0]
  if (!leader) throw new Error('PAL battle fixture requires role 0')
  Object.assign(leader, {
    level: 10,
    hp: 200,
    maxHP: 200,
    mp: 30,
    maxMP: 30,
    ...options.roleOverrides,
  })
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  loadDefaultGame(gs, playerRoles)
  const commands = readFixture<{ segments: { commands: Command[] }[] }>(
    'events/all.json',
  ).segments.flatMap((segment) => segment.commands)
  setGlobalEvents(commands)
  startBattle({
    gs,
    enemyTeamId: 1,
    battleFieldId: 0,
    isBoss: false,
    playerRoles,
    enemies: readFixture<StartBattleInput['enemies']>('data/enemies.json'),
    enemyTeams: readFixture<StartBattleInput['enemyTeams']>('data/enemy-teams.json'),
    enemyObjects: readFixture<EnemyObject[]>('data/enemy-objects.json'),
    battleFields: readFixture<StartBattleInput['battleFields']>('data/battle-fields.json'),
    items: readFixture<StartBattleInput['items']>('data/items.json'),
    spells: readFixture<StartBattleInput['spells']>('data/spells.json'),
    magics: readFixture<StartBattleInput['magics']>('data/magic.json'),
    levelUpExp: readFixture<number[]>('data/level-up-exp.json'),
    levelUpMagic: readFixture<StartBattleInput['levelUpMagic']>('data/level-up-magic.json'),
    commands,
    rngSeed: options.rngSeed,
  })
  const state = gs.battleState
  if (!state) throw new Error('startBattle did not install a battle state')
  const clock = vi.spyOn(performance, 'now').mockImplementation(() => gs.nowMs)
  onTestFinished(() => {
    clearBattleRuntimeContext(gs)
    clock.mockRestore()
  })
  expect(gs.mode).toBe('battle')
  expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(200)
  expect(gs.PlayerRolesRuntime.rgwLevel[0]).toBe(10)
  expect(state.players.map((player) => player.roleId)).toEqual([0])
  expect(state.enemies.map((enemy) => [enemy.e.id, enemy.objectId])).toEqual([[2, 399]])
  return { gs, state, bus: createCommandBus() }
}

/** Drive real input admission; no pendingActions, phase or reward writes in the test. */
function finishBattle(env: ReturnType<typeof prepareBattle>, selectKey: 'Confirm' | 'Flee'): void {
  const { gs, bus } = env
  for (let frame = 1; frame <= 500 && gs.mode === 'battle'; frame++) {
    gs.nowMs = frame * 40
    gs.frameNum = frame
    const phase = gs.battleState?.phase
    const keys: AbstractKey[] =
      phase === 'selectAction' ? [selectKey] : phase === 'won' ? ['Confirm'] : []
    const input: InputSnapshot = { held: new Set(), pressed: new Set(keys), frameNum: frame }
    tickBattle(gs, input, bus)
    // Normal presentation advances this public clock-owned boundary between logic ticks.
    if (gs.battleState?.battleFade) stepDeathFadeRender(gs.battleState, gs.nowMs)
    bus.drain()
  }
  expect(gs.mode, 'battle must finish within the bounded controller run').toBe('explore')
  expect(gs.battleState).toBeUndefined()
  expect(getBattleResources(gs)).toBeUndefined()
}

afterEach(() => setGlobalEvents([]))

describe('PAL resource-backed battle flows', () => {
  it('确认攻击灯笼后胜利，入账经验1与金钱3并释放战斗资源', () => {
    const env = prepareBattle({
      roleOverrides: { attackStrength: 100, defense: 50, dexterity: 50 },
      rngSeed: 42,
    })
    finishBattle(env, 'Confirm')
    expect(env.state.phase).toBe('won')
    expect(env.gs.Exp.rgPrimaryExp[0]?.wExp).toBe(1)
    expect(env.gs.dwCash).toBe(3)
    expect(env.gs.PlayerRolesRuntime.rgwHP[0]).toBeGreaterThan(0)
  })

  it('逃跑输入完成离场，不发放经验或金钱', () => {
    const env = prepareBattle({ roleOverrides: { fleeRate: 9999, dexterity: 100 }, rngSeed: 7 })
    expect(env.gs.PlayerRolesRuntime.rgwFleeRate[0]).toBe(9999)
    finishBattle(env, 'Flee')
    expect(env.state.phase).toBe('fleed')
    expect(env.gs.Exp.rgPrimaryExp[0]?.wExp).toBe(0)
    expect(env.gs.dwCash).toBe(0)
    expect(env.gs.PlayerRolesRuntime.rgwHP[0]).toBeGreaterThan(0)
  })
})
