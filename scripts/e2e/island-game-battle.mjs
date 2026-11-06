import assert from 'node:assert/strict'

const battleSystem = '/packages/game/src/core/battle/battle-system.ts'
const tickStart = `export function tickBattle(gs: GameState, input: InputSnapshot, bus: CommandBus): void {
  const state = gs.battleState
  if (!state) return`
const phaseSwitch = `  switch (state.phase) {
    case 'preBattle':
      tickPreBattle(state)`

// Serialized into the Game battle module by the 007 verification configuration.
function islandBattleVerification(getGlobalCommands, tickMs) {
  const teamByEvent = new Map([
    [206, 16],
    [207, 15],
    [208, 40],
    [209, 17],
  ])
  const observations = new WeakMap()
  let game
  let battleNumber = 0

  function encounter(gs, battle) {
    const resume = gs.postBattleResume
    const event = resume?.currentEventObjectId
    const command = resume && (resume.commands ?? getGlobalCommands())[resume.wonIp - 1]
    const operands = command?.op === 'raw' && command.opcode === 7 ? command.operands : []
    const team = operands[0]
    const soloHero =
      gs.partyMembers.length === 1 &&
      gs.partyMembers[0] === 0 &&
      gs.PlayerRolesRuntime.rgwName[0] === 36

    return {
      entityId: Number.isInteger(event) ? `e${event}` : null,
      teamId: Number.isInteger(team) ? `team-${team}` : null,
      allowed:
        gs.wNumScene === 16 &&
        battle.isBoss === false &&
        soloHero &&
        teamByEvent.has(event) &&
        teamByEvent.get(event) === team &&
        resume.triggerOwnerId === event &&
        operands[1] === 41075 &&
        operands[2] === 41073,
    }
  }

  function hasBattleHold(gs, battle) {
    return Boolean(
      gs.dialogBox ||
        gs.paletteFadeState ||
        battle.battleFade ||
        battle.battleAnim ||
        battle.battleDialogQueue?.length ||
        battle.enemyEscapeAnim ||
        battle.fleeAnim,
    )
  }

  function firstCommandReady(gs, battle) {
    return (
      battle.phase === 'selectAction' &&
      battle.turn === 0 &&
      battle.turnStartDoneForTurn === 0 &&
      battle.selectionStartedForTurn === 0 &&
      battle.uiState === 'selectMove' &&
      battle.menuState === 'main' &&
      battle.selectingPlayerIdx === 0 &&
      battle.pendingActions.size === 0 &&
      !hasBattleHold(gs, battle) &&
      battle.enemies.some((enemy) => !enemy.defeated && enemy.e.health > 0)
    )
  }

  function read() {
    if (globalThis.__islandVerify !== true || game?.mode !== 'battle') return null
    const battle = game.battleState
    const observation = observations.get(battle)
    if (!observation) return null
    const identity = encounter(game, battle)
    const requested = observation.request !== 'available'
    const settlement = battle.settlement
    const screen = settlement?.screens[settlement.index]
    // The native settlement accepts input on the tick after its first displayed frame.
    const confirmable =
      battle.phase === 'won' &&
      screen &&
      settlement.shownMs >= tickMs &&
      !hasBattleHold(game, battle)
    return {
      ...identity,
      ready: identity.allowed && !requested && firstCommandReady(game, battle),
      requested,
      settlement: confirmable ? `${observation.number}:${settlement.index}:${screen.kind}` : null,
    }
  }

  const controller = {
    read,
    request() {
      if (!read()?.ready) return false
      observations.get(game.battleState).request = 'queued'
      return true
    },
  }

  return {
    observe(gs, battle) {
      if (globalThis.__islandVerify !== true) return
      game = gs
      if (!observations.has(battle)) {
        observations.set(battle, { number: ++battleNumber, request: 'available' })
      }
      globalThis.__islandBattle = controller
    },
    apply(gs, battle) {
      if (globalThis.__islandVerify !== true) return
      const observation = observations.get(battle)
      if (observation?.request !== 'queued') return
      // A queued request belongs to this battle and must still match at its next tick.
      observation.request = 'used'
      if (!encounter(gs, battle).allowed || !firstCommandReady(gs, battle)) return
      for (const enemy of battle.enemies) {
        if (!enemy.defeated && enemy.e.health > 0) enemy.e.health = 0
      }
      // The native post-action phase owns death accounting, settlement and the event resume.
      battle.phase = 'postAction'
    },
  }
}

export function islandGameBattlePlugin() {
  return {
    name: 'island-game-battle-verification',
    apply: 'serve',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith(battleSystem)) return null
      const start = code.indexOf(tickStart)
      const dispatch = code.indexOf(phaseSwitch)
      assert(start >= 0 && start === code.lastIndexOf(tickStart), '007 Game tick anchor changed')
      assert(
        dispatch > start && dispatch === code.lastIndexOf(phaseSwitch),
        '007 Game phase dispatch anchor changed',
      )
      return {
        code: code
          .replace(
            tickStart,
            `const __islandBattleVerification = (${islandBattleVerification.toString()})(getGlobalCommands, BATTLE_DT)\n\n${tickStart}\n  __islandBattleVerification.observe(gs, state)`,
          )
          .replace(phaseSwitch, `  __islandBattleVerification.apply(gs, state)\n${phaseSwitch}`),
        map: null,
      }
    },
  }
}
