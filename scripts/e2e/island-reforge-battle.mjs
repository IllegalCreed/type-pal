import assert from 'node:assert/strict'

const runtimeId = 'virtual:island-reforge-battle'
const resolvedRuntimeId = `\0${runtimeId}`

// Vite evaluates this closure in the 007 page. Signals and sessions never leave it.
function createBattleProtocol() {
  const verify = globalThis.__islandVerify === true
  const hostiles = new WeakMap()
  const encounters = new Map([
    ['e206', ['team-16', 'enemy-499', 'enemy-499']],
    ['e207', ['team-15', 'enemy-499']],
    ['e208', ['team-40', 'enemy-499', 'enemy-530']],
    ['e209', ['team-17', 'enemy-499', 'enemy-530', 'enemy-499']],
  ])
  let serial = 0
  let active = null

  function isAllowed(battle) {
    if (!battle?.admitted || battle.signal.aborted || !battle.hostile.isCurrent()) return false
    const party = battle.hostile.readParty()
    if (party.length !== 1 || party[0]?.template !== 'li-xiaoyao') return false
    try {
      battle.assertCurrent()
      return true
    } catch {
      return false
    }
  }

  if (verify) {
    globalThis.__islandBattle = Object.freeze({
      read() {
        if (!active) return null
        const allowed = isAllowed(active)
        const screen = active.session.islandSettlementScreen()
        return {
          entityId: active.hostile?.entityId ?? null,
          teamId: active.teamId,
          allowed,
          ready: allowed && !active.requested && active.isReady?.() === true,
          requested: active.requested,
          settlement: screen === null ? null : `${active.serial}:${screen}`,
        }
      },
      request(...args) {
        if (args.length || !isAllowed(active) || active.requested || active.isReady?.() !== true)
          return false
        active.requested = true
        return true
      },
    })
  }

  return {
    trackHostile(signal, hostile) {
      if (verify) hostiles.set(signal, hostile)
    },
    trackBattle(session, signal, teamId, options, assertCurrent) {
      if (!verify) return
      const hostile = hostiles.get(signal)
      hostiles.delete(signal)
      const [expectedTeam, ...expectedSlots] = encounters.get(hostile?.entityId) ?? []
      const slots = session.enemySlotDefs()
      const admitted =
        hostile?.sceneId === 's015' &&
        hostile.teamId === teamId &&
        expectedTeam === teamId &&
        !options?.auto &&
        !options?.boss &&
        !options?.choreography?.length &&
        slots.length === expectedSlots.length &&
        slots.every((enemy, index) => enemy.id === expectedSlots[index])
      active = {
        serial: ++serial,
        session,
        signal,
        teamId,
        hostile,
        admitted,
        assertCurrent,
        isReady: null,
        requested: false,
        resolved: false,
      }
    },
    releaseBattle(session) {
      if (active?.session === session) active = null
    },
    offerVictory(session, isReady, resolve) {
      if (active?.session !== session || !isAllowed(active)) return false
      active.isReady = isReady
      if (!active.requested || active.resolved || !isReady()) return false
      active.resolved = true
      resolve()
      return true
    },
  }
}

function uniqueIndex(code, anchor) {
  const index = code.indexOf(anchor)
  assert(
    index >= 0 && code.indexOf(anchor, index + anchor.length) === -1,
    `007 Reforge battle source anchor changed: ${anchor}`,
  )
  return index
}

function insertAfter(code, anchor, insertion) {
  const end = uniqueIndex(code, anchor) + anchor.length
  return code.slice(0, end) + insertion + code.slice(end)
}

function instrumentHostile(code) {
  const anchor = '    const encounterSignal = new AbortController().signal\n'
  return (
    `import { trackHostile } from '${runtimeId}'\n` +
    insertAfter(
      code,
      anchor,
      `
    const islandEncounterScene = activeScene.scene
    const islandEncounterWorld = world
    trackHostile(encounterSignal, {
      sceneId: islandEncounterScene.id,
      entityId: e.id,
      teamId: h.enemyTeamId,
      isCurrent: () => hostileBusy && activeScene.scene === islandEncounterScene &&
        world === islandEncounterWorld,
      readParty: () => islandEncounterWorld.party,
    })
`,
    )
  )
}

function instrumentHost(code) {
  const bound = insertAfter(
    code,
    '    this.#active = session\n',
    '    trackBattle(session, signal, team, options, assertCurrent)\n',
  )
  return (
    `import { trackBattle, releaseBattle } from '${runtimeId}'\n` +
    insertAfter(bound, '        this.#active = null\n', '        releaseBattle(session)\n')
  )
}

function instrumentCore(code) {
  const start = uniqueIndex(code, '      // B7a 战果累计:本步新死敌')
  const end = uniqueIndex(
    code,
    '\n      return\n    }\n    default:\n      return // won/lost/fled = 终态',
  )
  assert(start < end, '007 Reforge action outcome anchors changed order')
  const outcome = code
    .slice(start, end)
    .split('\n')
    .map((line) => line.slice(4))
    .join('\n')
  // Both the ordinary action and the isolated request call the same native outcome body.
  return (
    code.slice(0, start) +
    '      recordIslandActionOutcome(s)' +
    code.slice(end) +
    `
function recordIslandActionOutcome(s: BattleState): void {
${outcome}
}

export function resolveIslandVictory(s: BattleState): void {
  if (globalThis.__islandVerify !== true) throw new Error('007 Reforge verify is inactive')
  for (const enemy of s.enemies) if (enemy) enemy.hp = 0
  recordIslandActionOutcome(s)
}
`
  )
}

function instrumentSession(code) {
  const anchor = '      if (this.pumpScriptExecution(dtMs, pressed)) return\n'
  const select = `${anchor}      const sel = this.nextSelecting()`
  const index = uniqueIndex(code, select) + anchor.length
  const request = `
      if (offerVictory(
        this,
        () => !this.closed && this.readiness.phase === 'idle' && s.phase === 'selectAction' &&
          s.turn === 1 && !s.enemyFled && s.lastAction === null && s.pendingActions.size === 0 &&
          s.players.length === 1 && s.players[0]?.roleId === 'li-xiaoyao' &&
          s.enemies.every((enemy) => !enemy || (enemy.hp > 0 && !enemy.rewardCounted)),
        () => resolveIslandVictory(s),
      )) return
`
  const tick = code.slice(0, index) + request + code.slice(index)
  return (
    `import { resolveIslandVictory } from './battle-core.js'
import { offerVictory } from '${runtimeId}'
` +
    insertAfter(
      tick,
      'export class BattleSession {\n',
      `
  islandSettlementScreen(): number | null {
    if (this.closed || this.sessionUi !== 'over') return null
    return this.settlementPresentation.islandConfirmableIndex
  }
`,
    )
  )
}

function instrumentSettlement(code) {
  const confirmGate = 'this.elapsedMs >= SETTLEMENT_CONFIRM_MIN_MS'
  uniqueIndex(code, confirmGate)
  return insertAfter(
    code,
    'export class BattleSettlementPresentation {\n',
    `
  get islandConfirmableIndex(): number | null {
    return this.currentScreen && ${confirmGate} ? this.screenIndex : null
  }
`,
  )
}

const sources = new Map([
  ['main.ts', instrumentHostile],
  ['battle/battle-host.ts', instrumentHost],
  ['battle/battle-core.ts', instrumentCore],
  ['battle/battle-session.ts', instrumentSession],
  ['battle/battle-settlement-presentation.ts', instrumentSettlement],
])

export function islandReforgeBattlePlugin() {
  return {
    name: 'island-reforge-battle',
    apply: 'serve',
    enforce: 'pre',
    resolveId(id) {
      return id === runtimeId ? resolvedRuntimeId : null
    },
    load(id) {
      if (id !== resolvedRuntimeId) return null
      return `export const { trackHostile, trackBattle, releaseBattle, offerVictory } =
        (${createBattleProtocol.toString()})();`
    },
    transform(code, id) {
      for (const [file, instrument] of sources) {
        if (id.endsWith(`/packages/reforge/src/${file}`))
          return { code: instrument(code), map: null }
      }
      return null
    },
  }
}
