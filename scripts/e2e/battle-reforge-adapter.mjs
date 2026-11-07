import { createSeedableRng } from '../../packages/game/src/core/rng.ts'
import { runBattleTrial } from '../../packages/reforge/src/battle-trial-host.ts'
import { battleTrialRevision } from '../../packages/reforge/src/battle-trial-prepare.ts'
import { httpSource } from '../../packages/reforge/src/file-source.ts'
import { loadCurrentProjectFrom } from '../../packages/reforge/src/project-loader.ts'
import { assertProjectSaveReadable } from '../../packages/reforge/src/project-save-state.ts'

const invariant = (condition, message) => {
  if (!condition) throw new Error(message)
}
const activeStatuses = (status) =>
  Object.fromEntries(Object.entries(status).filter(([, rounds]) => rounds > 0))
const clone = (value) => structuredClone(value)

let scenario
let project
let nativeState
let world
let selection
let beforeAction
let beforeLog = 0
let terminal
let sessionReady = false
let settlementCount = 0
let commandCount = 0
let seeded
let failure
let running
const presented = new Set()
const controller = new AbortController()

function partyLabel(player) {
  const declared = scenario.party.find((member) => member.actorId === player.actorTemplateId)
  invariant(declared, `undeclared battle player ${player.actorTemplateId}`)
  return declared.id
}
function enemyLabel(slot) {
  const declared = scenario.enemies.find((enemy) => enemy.slot === slot)
  invariant(declared, `undeclared battle enemy slot ${slot}`)
  return declared.id
}

function snapshot(persistent = false) {
  invariant(nativeState && world, 'battle snapshot precedes prepared state')
  return {
    players: nativeState.players.map((player, slot) => {
      const character = world.party.find((member) => member.id === player.roleId)
      invariant(character, `battle player ${player.roleId} lost its world identity`)
      return {
        id: partyLabel(player),
        slot,
        hp: persistent ? character.hp : player.hp,
        maxHP: persistent ? character.maxHP : player.maxHp,
        mp: persistent ? character.mp : player.mp,
        maxMP: persistent ? character.maxMP : player.maxMp,
        level: character.level,
        exp: character.exp,
        statuses: persistent
          ? Object.fromEntries(
              (character.extraStatuses ?? [])
                .filter((entry) => entry.turns > 0)
                .map((entry) => [entry.status, entry.turns]),
            )
          : activeStatuses(player.status),
      }
    }),
    enemies: Array.from({ length: 5 }, (_, slot) => {
      const enemy = nativeState.enemies[slot]
      if (!enemy) return null
      return {
        id: enemyLabel(slot),
        slot,
        templateId: enemy.def.id,
        hp: enemy.hp,
        maxHP: enemy.def.stats.health,
        alive: enemy.hp > 0,
        statuses: activeStatuses(enemy.status),
      }
    }),
    inventory: (persistent ? world.inventory : nativeState.inventory)
      .filter((entry) => entry.count > 0)
      .map(({ itemId, count }) => ({ itemId, count })),
    money: world.money,
  }
}

function semanticAction(playerIndex, action) {
  const player = nativeState.players[playerIndex]
  invariant(player, `action player ${playerIndex} is absent`)
  invariant(
    ['attack', 'item'].includes(action.kind),
    `unsupported foundation action ${action.kind}`,
  )
  const targetId =
    action.kind === 'item'
      ? partyLabel(nativeState.players[action.targetAllyIdx])
      : enemyLabel(action.targetEnemyIdx)
  return {
    turn: nativeState.turn,
    actorId: partyLabel(player),
    kind: action.kind,
    targetId,
    ...(action.kind === 'item' ? { itemId: action.itemId } : {}),
  }
}

const evidence = () => {
  invariant(globalThis.__battleEvidence, 'factual battle observer was not installed')
  return globalThis.__battleEvidence
}
const harness = {
  engine: 'reforge',
  ready: false,
  async launch(input) {
    invariant(harness.ready && !scenario, 'one configured battle per fresh browser page')
    invariant(input && Array.isArray(input.party) && Array.isArray(input.enemies), 'missing setup')
    scenario = clone(input)
    seeded = createSeedableRng(scenario.seed)
    const sourceToken = await assertProjectSaveReadable(project.source)
    const revision = await battleTrialRevision(project)
    running = runBattleTrial(project, scenario.reforge.config, {
      signal: controller.signal,
      sourceToken,
      revision,
      onRestart: () => {
        throw new Error('foundation runs require a fresh page')
      },
    })
      .then(() => {
        invariant(
          terminal,
          `trial host ended without a battle result: ${document.querySelector('[role="alert"]')?.textContent ?? document.querySelector('[role="status"]')?.textContent}`,
        )
      })
      .catch((error) => {
        failure = String(error)
        evidence().fail(error)
        throw error
      })
    // The host owns its asynchronous resource preparation; callers observe readiness through read().
    void running.catch(() => {})
  },
  random() {
    invariant(seeded, 'battle RNG used before the declared fixture was launched')
    const value = seeded.next()
    evidence().random(value, 'createBattleTrialSession:rng:mulberry32.next')
    return value
  },
  prepared(prepared) {
    invariant(scenario && !world, 'duplicate or unconfigured trial preparation')
    world = prepared.world
  },
  constructed(state, view) {
    nativeState = state
    selection = view
    sessionReady = true
    evidence().start(snapshot(), 'BattleSession:constructor:committed')
  },
  observe(state, view) {
    nativeState = state
    selection = view
  },
  command(playerIndex, action) {
    commandCount++
    evidence().command({
      ...semanticAction(playerIndex, action),
      source: 'BattleCommandSelection:submit:pendingActions.set',
    })
  },
  beforeStep(state) {
    nativeState = state
    beforeAction = snapshot()
    beforeLog = state.log.length
  },
  afterStep(state) {
    nativeState = state
    const action = state.lastAction
    if (!action) return
    invariant(action.side === 'player', `unexpected foundation enemy action ${action.kind}`)
    evidence().action({
      ...semanticAction(action.idx, action),
      before: beforeAction,
      after: snapshot(),
      native: { lastAction: clone(action), actionLog: state.log.slice(beforeLog) },
      source: 'BattleSession:stepBattle:before-lastAction-consumption',
    })
  },
  settled() {
    settlementCount++
  },
  finish(result, committedWorld) {
    invariant(committedWorld === world && !terminal, 'unexpected or repeated trial world commit')
    terminal = { result, settlementCount, after: snapshot(true) }
    evidence().terminal({ ...terminal, source: 'finishBattleWorldState:trial:committed' })
  },
  presentation(kind, source, payload) {
    const identity = `${kind}:${JSON.stringify(payload)}`
    if (kind === 'render-call' && presented.has(identity)) return
    presented.add(identity)
    if (sessionReady && !terminal)
      evidence().presentation({ kind, source, payload: clone(payload) })
  },
  read() {
    return {
      engine: 'reforge',
      ready: harness.ready,
      busy: !sessionReady || Boolean(terminal),
      phase: nativeState?.phase,
      turn: nativeState?.turn,
      selection: clone(selection),
      selectingPlayerId: nativeState
        ? nativeState.players
            .filter((player) => player.hp > 0)
            .map((player) => ({ player, index: nativeState.players.indexOf(player) }))
            .filter(({ index }) => !nativeState.pendingActions.has(index))
            .map(({ player }) => partyLabel(player))[0]
        : undefined,
      commands: commandCount,
      nativePlayers: nativeState
        ? nativeState.players.map((player, slot) => {
            const character = world.party.find((member) => member.id === player.roleId)
            return {
              id: partyLabel(player),
              slot,
              equipment: ['head', 'cloak', 'body', 'weapon', 'feet', 'accessory'].map((key) =>
                Number(character.equipment[key] ?? 0),
              ),
              attackStrength: player.attackStrength,
              defense: player.defense,
              magicStrength: player.magicStrength,
              dexterity: player.baseDexterity,
              fleeRate: player.fleeRate,
              attackAll: Number(Boolean(player.attackAll)),
            }
          })
        : [],
      snapshot: nativeState ? snapshot() : undefined,
      terminal: clone(terminal),
      failure,
      canConfirmSettlement: nativeState?.phase === 'won' && !terminal,
    }
  },
}
globalThis.__battleHarness = harness

try {
  const source = httpSource('/projects/pal')
  await assertProjectSaveReadable(source)
  project = await loadCurrentProjectFrom(source)
  invariant(project.manifest.id === 'pal', 'foundation loader returned another project')
  harness.ready = true
} catch (error) {
  failure = String(error)
  evidence().fail(error)
  throw error
}

window.addEventListener('pagehide', () => controller.abort(), { once: true })
