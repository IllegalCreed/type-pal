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
import { parseImportedSave, serializeSave } from '../../tools/save-io.js'
import { createCommandBus } from '../command-bus.js'
import { updateAllEquipments } from '../equip-effect.js'
import {
  createInitialGameState,
  loadDefaultGame,
  projectRuntimeToBattleRoles,
} from '../game-state.js'
import { setObjectPoisons } from '../player-poison-state.js'
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

function prepareBattle({
  party,
  rngSeed,
  enemyTeamId = 1,
  magicSpriteFrameCounts,
}: {
  party: Array<[number, Partial<PlayerRole>]>
  rngSeed: number
  enemyTeamId?: number
  magicSpriteFrameCounts?: Map<number, number>
}) {
  const staticRoles = readFixture<PlayerRoles>('data/player-roles.json')
  for (const [roleId, stats] of party) Object.assign(staticRoles.roles[roleId]!, stats)
  const commands = readFixture<{ segments: { commands: Command[] }[] }>(
    'events/all.json',
  ).segments.flatMap((segment) => segment.commands)
  setGlobalEvents(commands)
  const objectPoisons = readFixture<NonNullable<StartBattleInput['objectPoisons']>>(
    'data/object-poisons.json',
  )
  setObjectPoisons(objectPoisons)
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  loadDefaultGame(gs, staticRoles)
  gs.partyMembers = party.map(([roleId]) => roleId)
  const items = readFixture<StartBattleInput['items']>('data/items.json')
  updateAllEquipments(gs, items)
  const playerRoles = projectRuntimeToBattleRoles(
    gs.PlayerRolesRuntime,
    staticRoles,
    gs.rgEquipmentEffect,
  )
  startBattle({
    gs,
    enemyTeamId,
    battleFieldId: 7,
    isBoss: false,
    playerRoles,
    enemies: readFixture<StartBattleInput['enemies']>('data/enemies.json'),
    enemyTeams: readFixture<StartBattleInput['enemyTeams']>('data/enemy-teams.json'),
    enemyObjects: readFixture<EnemyObject[]>('data/enemy-objects.json'),
    battleFields: readFixture<StartBattleInput['battleFields']>('data/battle-fields.json'),
    items,
    spells: readFixture<StartBattleInput['spells']>('data/spells.json'),
    magics: readFixture<StartBattleInput['magics']>('data/magic.json'),
    objectPlayers: readFixture('data/object-players.json'),
    objectMagics: readFixture('data/object-magics.json'),
    objectPoisons,
    magicSpriteFrameCounts,
    levelUpExp: readFixture<number[]>('data/level-up-exp.json'),
    levelUpMagic: readFixture<StartBattleInput['levelUpMagic']>('data/level-up-magic.json'),
    commands,
    rngSeed,
  })
  const state = gs.battleState
  if (!state) throw new Error('startBattle did not install a battle state')
  const clock = vi.spyOn(performance, 'now').mockImplementation(() => gs.nowMs)
  onTestFinished(() => {
    clearBattleRuntimeContext(gs)
    clock.mockRestore()
  })
  expect(gs.mode).toBe('battle')
  expect(state.players.map((player) => player.roleId)).toEqual(gs.partyMembers)
  return { gs, state, playerRoles, bus: createCommandBus() }
}

type PalBattle = ReturnType<typeof prepareBattle>

function press(env: PalBattle, ...keys: AbstractKey[]) {
  const { gs, bus } = env
  gs.nowMs += 40
  gs.frameNum++
  const input: InputSnapshot = { held: new Set(), pressed: new Set(keys), frameNum: gs.frameNum }
  tickBattle(gs, input, bus)
  // Normal presentation advances this public clock-owned boundary between logic ticks.
  if (gs.battleState?.battleFade) stepDeathFadeRender(gs.battleState, gs.nowMs)
  return bus.drain().map(({ cmd }) => cmd)
}

function advanceTo(env: PalBattle, condition: () => boolean, limit = 100) {
  for (let tick = 0; !condition() && tick < limit; tick++) press(env)
  expect(condition(), 'battle must reach the requested boundary without extra input').toBe(true)
}

/** Drive real input admission; no pendingActions, phase or reward writes in the test. */
function finishBattle(env: PalBattle, selectKey: 'Confirm' | 'Flee'): void {
  const { gs } = env
  for (let frame = 1; frame <= 500 && gs.mode === 'battle'; frame++) {
    const phase = gs.battleState?.phase
    const keys: AbstractKey[] =
      phase === 'selectAction' ? [selectKey] : phase === 'won' ? ['Confirm'] : []
    press(env, ...keys)
  }
  expect(gs.mode, 'battle must finish within the bounded controller run').toBe('explore')
  expect(gs.battleState).toBeUndefined()
  expect(getBattleResources(gs)).toBeUndefined()
}

afterEach(() => {
  setGlobalEvents([])
  setObjectPoisons([])
})

const seasonedLeader = { level: 10, hp: 200, maxHP: 200, mp: 30, maxMP: 30 }
const casualtyLinger = {
  level: 5,
  hp: 24,
  maxHP: 24,
  mp: 100,
  maxMP: 100,
  attackStrength: 0,
  defense: 0,
  dexterity: 0,
}
const casualtyLi = {
  ...casualtyLinger,
  hp: 100,
  maxHP: 150,
  attackStrength: 900,
  defense: 400,
}

describe('PAL resource-backed battle flows', () => {
  it('确认攻击灯笼后胜利，入账经验1与金钱3并释放战斗资源', () => {
    const env = prepareBattle({
      party: [[0, { ...seasonedLeader, attackStrength: 100, defense: 50, dexterity: 50 }]],
      rngSeed: 42,
    })
    expect(env.state.enemies.map((enemy) => [enemy.e.id, enemy.objectId])).toEqual([[2, 399]])
    finishBattle(env, 'Confirm')
    expect(env.state.phase).toBe('won')
    expect(env.gs.Exp.rgPrimaryExp[0]?.wExp).toBe(1)
    expect(env.gs.dwCash).toBe(3)
    expect(env.gs.PlayerRolesRuntime.rgwHP[0]).toBeGreaterThan(0)
  })

  it('逃跑输入完成离场，不发放经验或金钱', () => {
    const env = prepareBattle({
      party: [[0, { ...seasonedLeader, fleeRate: 9999, dexterity: 100 }]],
      rngSeed: 7,
    })
    expect(env.gs.PlayerRolesRuntime.rgwFleeRate[0]).toBe(9999)
    finishBattle(env, 'Flee')
    expect(env.state.phase).toBe('fleed')
    expect(env.gs.Exp.rgPrimaryExp[0]?.wExp).toBe(0)
    expect(env.gs.dwCash).toBe(0)
    expect(env.gs.PlayerRolesRuntime.rgwHP[0]).toBeGreaterThan(0)
  })

  it('lets the actual casualty scripts wait at home, clear their timed lines and heal after narration', () => {
    const env = prepareBattle({
      party: [
        [1, casualtyLinger],
        [0, casualtyLi],
      ],
      rngSeed: 6,
    })
    const { gs, state, playerRoles } = env
    const linger = playerRoles.roles[1]!
    const li = playerRoles.roles[0]!
    const sprite = state.players[0]!
    press(env)
    press(env, 'Defend')
    press(env, 'Defend')
    advanceTo(env, () => linger.hp === 3 && !state.battleAnim)
    expect([sprite.currentFrame, sprite.pos]).toEqual([1, sprite.posOriginal])
    const returned = gs.nowMs
    const pending = parseImportedSave(serializeSave(gs)).battleState
    expect(pending?.actionFollowup).toEqual({
      waitTicks: 10,
      casualtyScript: { roleId: 1, kind: 'scriptOnDying' },
    })
    advanceTo(env, () => gs.dialogBox?.portraitIcon === 2, 12)
    expect(gs.nowMs - returned).toBe(400)
    expect(gs.dialogBox?.currentLineText).toBe('灵儿～你还好吧？')
    advanceTo(env, () => state.turn === 1 && state.uiState === 'selectMove')

    press(env, 'Defend')
    press(env, 'Up', 'Confirm')
    if (!state.pendingActions.has(1)) press(env, 'Confirm')
    expect(state.pendingActions.get(1)?.type).toBe('attack')
    advanceTo(env, () => linger.hp === 0 && !state.battleAnim)
    expect([sprite.currentFrame, sprite.pos]).toEqual([2, sprite.posOriginal])
    const died = gs.nowMs
    advanceTo(env, () => gs.dialogBox?.portraitIcon === 5, 12)
    expect(gs.nowMs - died).toBe(400)
    expect(gs.dialogBox?.currentLineText?.trim()).toBe('啊～！')
    const attackBefore = li.attackStrength
    advanceTo(env, () => gs.dialogBox?.charsRevealed === gs.dialogBox?.currentLineText?.length)
    const fullLine = gs.nowMs
    advanceTo(env, () => gs.dialogBox?.style === 'narration', 24)
    expect(gs.nowMs - fullLine).toBeGreaterThanOrEqual(680)
    expect(gs.nowMs - fullLine).toBeLessThanOrEqual(720)
    expect(gs.dialogBox?.currentLineText).toBe('李逍遥怒火燃烧，体力恢复')
    expect([li.hp, li.attackStrength]).toEqual([100, attackBefore])
    const narrationSave = serializeSave(gs)
    expect(
      parseImportedSave(narrationSave).battleState?.actionFollowup?.friendDeathEffects,
    ).toEqual({
      roleId: 0,
      commands: [
        { opcode: 0x1b, operands: [0, 9999, 0] },
        { opcode: 0x30, operands: [17, 5, 0] },
      ],
    })
    expect(() => parseImportedSave(narrationSave.replace('"opcode":27', '"opcode":137'))).toThrow(
      /battleState/,
    )
    for (let tick = 0; tick < 34; tick++) {
      expect(press(env).some((command) => command.op === 'showDamageNum')).toBe(false)
      expect([li.hp, li.attackStrength]).toEqual([100, attackBefore])
    }
    expect(press(env).some((command) => command.op === 'showDamageNum')).toBe(false)
    expect(gs.dialogBox).toBeUndefined()
    expect(li.hp).toBe(150)
    expect(li.attackStrength).toBeGreaterThan(attackBefore)
    advanceTo(env, () => state.phase === 'won')
  })

  it('runs actual bloodworm poison feedback and recovery without player casualty cues', () => {
    const env = prepareBattle({
      party: [
        [1, { ...casualtyLinger, hp: 19, maxHP: 50, defense: 250, dexterity: 900 }],
        [0, { ...casualtyLi, hp: 150, dexterity: 500 }],
      ],
      enemyTeamId: 115,
      rngSeed: 50,
    })
    const { gs, state, playerRoles } = env
    const linger = playerRoles.roles[1]!
    const sprite = state.players[0]!
    press(env)
    for (const [before, after, holdFrame, restFrame, allyBefore, allyAfter] of [
      [11, 4, 3, 1, 150, 150],
      [4, 0, 1, 2, 142, 135],
    ] as const) {
      advanceTo(env, () => state.uiState === 'selectMove')
      press(env, 'Defend')
      press(env, 'Defend')
      advanceTo(env, () => state.phase === 'postAction')
      expect(linger.hp).toBe(before)
      expect(sprite.currentFrame).toBe(holdFrame)
      expect(playerRoles.roles[0]?.hp).toBe(allyBefore)
      expect(Object.values(gs.rgPoisonStatus).some((poison) => poison.wPoisonID === 551)).toBe(true)
      const commands = press(env)
      expect(linger.hp).toBe(after)
      expect(playerRoles.roles[0]?.hp).toBe(allyAfter)
      expect([sprite.currentFrame, sprite.pos]).toEqual([holdFrame, sprite.posOriginal])
      expect(commands.filter(({ op }) => op === 'playSound')).toEqual([])
      expect(commands.filter(({ op }) => op === 'showDamageNum')).toEqual([
        {
          op: 'showDamageNum',
          target: { kind: 'player', idx: 0 },
          value: before - after,
          color: 'blue',
        },
        ...(allyBefore === allyAfter
          ? []
          : [{ op: 'showDamageNum', target: { kind: 'player', idx: 1 }, value: 7, color: 'blue' }]),
      ])
      expect(state.battleDialogQueue ?? []).toEqual([])
      for (let tick = 0; tick < 8; tick++) {
        expect(sprite.currentFrame).toBe(holdFrame)
        expect(press(env, 'Confirm')).toEqual([])
        expect(state.uiState).toBe('wait')
      }
      expect(sprite.currentFrame).toBe(restFrame)
    }
    press(env)
    expect(state.selectingPlayerIdx).toBe(1)
    expect(gs.dialogBox).toBeUndefined()
  })

  it.each([
    { label: 'death', hp: 24, maxHP: 60, after: 0, damage: 24, rest: 2, sound: 23 },
    { label: 'dying', hp: 85, maxHP: 150, after: 27, damage: 58, rest: 1, sound: 19 },
  ])('orders the actual Thunder Spell $label cue around the hit and return', (outcome) => {
    const effects = readFixture<{ chunks: Array<{ chunkIndex: number; frameCount: number }> }>(
      'data/fire-sprites.json',
    )
    const env = prepareBattle({
      party: [
        [0, { ...casualtyLi, hp: outcome.hp, maxHP: outcome.maxHP, defense: 0 }],
        [4, { ...casualtyLi, hp: 150, attackStrength: 2200, defense: 700, dexterity: 1 }],
      ],
      enemyTeamId: 186,
      rngSeed: 6,
      magicSpriteFrameCounts: new Map(effects.chunks.map((c) => [c.chunkIndex, c.frameCount])),
    })
    const { state, playerRoles } = env
    const sprite = state.players[0]!
    const home = sprite.posOriginal!
    const motion: Array<[number, number, number | undefined]> = []
    const cues: string[] = []
    press(env)
    press(env, 'Defend')
    press(env, 'Up', 'Confirm')
    if (!state.pendingActions.has(1)) press(env, 'Confirm')
    for (let tick = 0; tick < 100; tick++) {
      for (const command of press(env)) {
        if (command.op === 'playSound' && command.soundId === outcome.sound) cues.push('casualty')
        if (command.op === 'showDamageNum' && command.target.kind === 'player') {
          expect(command).toMatchObject({
            value: outcome.damage,
            color: 'blue',
            target: { idx: 0 },
          })
          cues.push('damage')
        }
      }
      if (sprite.currentFrame === 4) {
        motion.push([sprite.pos!.x - home.x, sprite.pos!.y - home.y, sprite.iColorShift])
      }
      if (motion.length > 0 && sprite.currentFrame === outcome.rest) break
    }
    expect(cues).toEqual(outcome.rest === 2 ? ['casualty', 'damage'] : ['damage', 'casualty'])
    // The sixth draw is the caster's own one-frame return while the target still holds the last pose.
    expect(motion).toEqual([
      [0, 0, 6],
      [4, 2, 6],
      [6, 3, 6],
      [7, 3, 0],
      [7, 3, 0],
      [7, 3, 0],
    ])
    expect(sprite.pos).toEqual(home)
    expect(playerRoles.roles[0]?.hp).toBe(outcome.after)
    expect(state.battleAnim).toBeUndefined()
    const actionIndex = state.currentActionIndex
    for (let tick = 0; tick < 8; tick++) {
      expect(press(env).filter((c) => c.op === 'playSound' || c.op === 'showDamageNum')).toEqual([])
      expect(state.currentActionIndex).toBe(actionIndex)
    }
    advanceTo(env, () => state.phase === 'won')
  })
})
