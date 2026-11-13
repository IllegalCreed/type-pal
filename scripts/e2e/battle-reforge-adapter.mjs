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
const poisonFields = (entries) => {
  const poisons = [...new Set(entries.map(({ poisonId }) => poisonId))].sort((a, b) => a - b)
  return poisons.length ? { poisons } : {}
}
const clone = (value) => structuredClone(value)

let scenario
let project
let nativeState
let world
let selection
let selectingSlot
let usableMenu
let throwableMenu
let beforeAction
let beforeGuards
let beforeGrowth
let beforeTurn
let beforeClockMs
let beforeRoundPoisons
let incapacitatedSlot
let visualAction
let activeDialogue
let beforeLog = 0
let terminal
let sessionReady = false
let settlementCount = 0
let commandCount = 0
let targetCancels = 0
let seeded
let failure
let running
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
      const statuses = persistent
        ? Object.fromEntries(
            (character.extraStatuses ?? [])
              .filter((entry) => entry.turns > 0)
              .map((entry) => [entry.status, entry.turns]),
          )
        : activeStatuses(player.status)
      // Trial completion retains the same equipment; native grants are separate from durations.
      for (const name of player.grantedStatuses) statuses[name] = 32760
      return {
        id: partyLabel(player),
        slot,
        hp: persistent ? character.hp : player.hp,
        maxHP: persistent ? character.maxHP : player.maxHp,
        mp: persistent ? character.mp : player.mp,
        maxMP: persistent ? character.maxMP : player.maxMp,
        level: character.level,
        exp: character.exp,
        statuses,
        ...(persistent ? {} : poisonFields(player.poisons)),
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
        ...poisonFields(enemy.poisons),
      }
    }),
    inventory: (persistent ? world.inventory : nativeState.inventory)
      .filter((entry) => entry.count > 0)
      .map(({ itemId, count }) => ({ itemId, count })),
    money: world.money,
  }
}

function nativePoisons(state) {
  return [
    ...state.players.flatMap((unit, partySlot) =>
      unit.poisons.map(({ poisonId, tickIndex }) => ({ partySlot, poisonId, tickIndex })),
    ),
    ...state.enemies.flatMap((unit, enemySlot) =>
      (unit?.poisons ?? []).map(({ poisonId, tickIndex }) => ({ enemySlot, poisonId, tickIndex })),
    ),
  ]
}

function semanticAction(index, action) {
  const isEnemy = action.side === 'enemy'
  const player = !isEnemy && nativeState.players[index]
  const { kind } = action
  invariant(
    ['attack', 'item', 'defend', 'cast', 'coop', 'throw', 'pass'].includes(kind),
    `unsupported Reforge action ${kind}`,
  )
  const skillId = action.skillId ?? (kind === 'coop' ? player.cooperativeMagicSkillId : undefined)
  const itemTarget = kind === 'item' ? nativeState.items[action.itemId]?.use?.target : undefined
  const throwTarget = kind === 'throw' ? nativeState.items[action.itemId]?.throw?.target : undefined
  const skillTarget = skillId === undefined ? undefined : nativeState.skills[skillId]?.target
  invariant(kind !== 'coop' || skillId, 'Reforge co-op action lacks its native skill ID')
  const all =
    itemTarget === 'allAllies' ||
    throwTarget === 'allEnemies' ||
    skillTarget === 'allAllies' ||
    skillTarget === 'allEnemies' ||
    (kind === 'attack' && player?.attackAll)
  const allAllies = itemTarget === 'allAllies' || skillTarget === 'allAllies'
  const targetSide = all && ((isEnemy ? !allAllies : allAllies) ? 'player' : 'enemy')
  let targetId = null
  if (kind !== 'defend' && kind !== 'pass' && !all) {
    // A solo party can immediately commit one-ally actions. The core uses the actor as the target.
    const allyTarget = itemTarget ?? skillTarget
    const implicitAllySlot =
      allyTarget === 'self' || (allyTarget === 'oneAlly' && nativeState.players.length === 1)
        ? index
        : undefined
    const allySlot = isEnemy ? action.targetPlayerIdx : (action.targetAllyIdx ?? implicitAllySlot)
    targetId =
      allySlot === undefined
        ? enemyLabel(action.targetEnemyIdx)
        : partyLabel(nativeState.players[allySlot])
  }
  return {
    turn: nativeState.turn,
    actorId: isEnemy ? enemyLabel(index) : partyLabel(player),
    ...(isEnemy ? { actorSide: 'enemy' } : {}),
    kind,
    targetId,
    ...(targetSide ? { targetSide } : {}),
    ...(kind === 'item' || kind === 'throw' ? { itemId: action.itemId } : {}),
    ...(kind === 'cast' || kind === 'coop' ? { skillId } : {}),
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
  observe(state, view, currentSelectingSlot, dialogue) {
    nativeState = state
    selection = view
    selectingSlot = currentSelectingSlot
    activeDialogue = dialogue
  },
  selectionContext(context) {
    usableMenu = context.usableItems.map(({ itemId }) => ({ itemId }))
    throwableMenu = context.throwableItems.map(({ itemId }) => ({ itemId }))
  },
  beginFrame(state, clockMs, animating, selecting) {
    if (!sessionReady || terminal) return
    evidence().beginFrame('reforge:BattleSession.render', {
      clockMs,
      phase: state.phase,
      turn: state.turn,
      selecting,
      animation:
        animating && visualAction
          ? {
              actorId: visualAction.actorId,
              kind: visualAction.kind,
              targetId: visualAction.targetId,
            }
          : null,
    })
  },
  command(playerIndex, action) {
    commandCount++
    evidence().command({
      ...semanticAction(playerIndex, action),
      source: 'BattleCommandSelection:submit:pendingActions.set',
    })
  },
  dialogueConfirm(before, after) {
    if (!before || !sessionReady || terminal) return
    evidence().presentation({
      kind: 'battle-dialogue-confirm',
      source: 'reforge:DialogBox.advance',
      payload: {
        turn: nativeState.turn,
        slot: before.slot,
        before: before.phase,
        after: after?.phase ?? null,
        cue: before.cueIndex,
        page: before.pageIndex,
        nextCue: after?.cueIndex ?? null,
        nextPage: after?.pageIndex ?? null,
      },
    })
  },
  casualtyEffect(state, target, before) {
    if (state !== nativeState || !sessionReady || terminal) return
    const current = { hp: target.hp, attack: target.attackStrength }
    if (!before) return current
    evidence().presentation({
      kind: 'battle-casualty-effect',
      source: 'reforge:completeCasualtyEffects:apply',
      payload: { turn: state.turn, targetId: partyLabel(target), before, after: current },
    })
  },
  targetCancel(playerIndex, side, targetIndex, skillId) {
    if (!sessionReady || terminal) return
    targetCancels++
    evidence().presentation({
      kind: 'target-cancel',
      source:
        side === 'enemy'
          ? 'reforge:BattleCommandSelection.advance:target-to-menu'
          : 'reforge:BattleCommandSelection.advance:target-to-skill',
      payload: {
        turn: nativeState.turn,
        actorId: partyLabel(nativeState.players[playerIndex]),
        targetId:
          side === 'enemy' ? enemyLabel(targetIndex) : partyLabel(nativeState.players[targetIndex]),
        skillId,
        commandCount,
        pending: nativeState.pendingActions.has(playerIndex),
        state: snapshot(),
      },
    })
  },
  beforeStep(state, clockMs) {
    nativeState = state
    beforeTurn = state.turn
    beforeClockMs = clockMs
    beforeAction = snapshot()
    beforeGuards = state.players.map(({ defending }) => defending)
    beforeGrowth = state.players.map(({ hiddenCounts }) => ({ ...hiddenCounts }))
    beforeLog = state.log.length
    beforeRoundPoisons = state.actionQueue.length ? undefined : nativePoisons(state)
    incapacitatedSlot = undefined
  },
  incapacitated(slot) {
    invariant(incapacitatedSlot === undefined, 'two incapacitated actors in one core step')
    incapacitatedSlot = slot
  },
  afterStep(state) {
    nativeState = state
    if (state.turn === beforeTurn + 1) {
      evidence().round({
        turn: beforeTurn,
        clockMs: beforeClockMs,
        before: beforeAction,
        after: snapshot(),
        native: { poisonsBefore: beforeRoundPoisons, poisonsAfter: nativePoisons(state) },
        source: 'BattleSession:stepBattle:round-ended',
      })
      return
    }
    const action = state.lastAction
    if (!action && incapacitatedSlot === undefined) return
    const isEnemy = action?.side === 'enemy'
    const slot = action?.idx ?? incapacitatedSlot
    const guardSlot = isEnemy ? action.targetPlayerIdx : slot
    let inaction = !action ? 'incapacitated' : undefined
    if (action?.kind === 'pass') {
      const unit = (isEnemy ? state.enemies : state.players)[slot]
      const disabled = unit.status.sleep > 0 || unit.status.paralyzed > 0
      const cooperative = !isEnemy && state.coopThisTurn
      invariant(unit.hp > 0 && (disabled || cooperative), 'Q2 Reforge pass lacks a native reason')
      inaction = disabled ? 'incapacitated' : 'cooperative-action'
    }
    const executed = action
      ? semanticAction(slot, action)
      : {
          turn: state.turn,
          actorId: partyLabel(state.players[slot]),
          kind: 'pass',
          targetId: null,
        }
    if (action) visualAction = executed
    evidence().action({
      ...executed,
      before: beforeAction,
      after: snapshot(),
      guard: {
        before: beforeGuards[guardSlot] ?? false,
        after: state.players[guardSlot]?.defending ?? false,
      },
      native: {
        lastAction: action ? JSON.parse(JSON.stringify(action)) : null,
        actionLog: state.log.slice(beforeLog),
        ...(inaction ? { inaction } : {}),
        ...(!isEnemy
          ? {
              growthBefore: beforeGrowth[slot],
              growthAfter: { ...state.players[slot].hiddenCounts },
            }
          : {}),
      },
      source: action
        ? 'BattleSession:stepBattle:before-lastAction-consumption'
        : 'performPlayerAction:incapacitated-return',
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
  read() {
    const selecting = nativeState?.players[selectingSlot]
    const nativeEquipmentStatuses = nativeState?.players.flatMap((player) =>
      player.grantedStatuses.map((name) => ({
        playerId: partyLabel(player),
        name,
        source: 'reforge:BattlePlayerState.grantedStatuses',
      })),
    )
    return {
      engine: 'reforge',
      ready: harness.ready,
      busy: !sessionReady || Boolean(terminal),
      phase: nativeState?.phase,
      turn: nativeState?.turn,
      selection: clone(selection),
      selectingPlayerId: selecting ? partyLabel(selecting) : undefined,
      skillMenu:
        selection?.phase === 'skill' && selecting
          ? {
              cursor: selection.skillIndex,
              items: selecting.skills.map((skillId) => {
                const skill = nativeState.skills[skillId]
                return {
                  skillId,
                  disabled:
                    !skill ||
                    selecting.mp < (skill.cost.mp ?? 0) ||
                    world.money < (skill.cost.money ?? 0),
                }
              }),
            }
          : null,
      ...(selection?.phase === 'item' && selecting
        ? { itemMenu: { cursor: selection.itemIndex, items: usableMenu } }
        : {}),
      ...(selection?.phase === 'throwItem' && selecting
        ? { throwMenu: { cursor: selection.itemIndex, items: throwableMenu } }
        : {}),
      targetCancels,
      ...(nativeEquipmentStatuses?.length ? { nativeEquipmentStatuses } : {}),
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
      canConfirmDialogue: activeDialogue?.phase === 'waiting-input' && !terminal,
      canConfirmSettlement: nativeState?.phase === 'won' && !activeDialogue && !terminal,
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
