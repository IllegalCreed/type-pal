import { isDeepStrictEqual as same } from 'node:util'

const own = (value, key) => Object.hasOwn(value, key)
const record = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value))
const integer = (value, minimum = 0) => Number.isSafeInteger(value) && value >= minimum
const text = (value) => typeof value === 'string' && value.trim().length > 0

function jsonFact(value, depth = 0, ancestors = new Set()) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (depth > 24 || (!record(value) && !Array.isArray(value)) || ancestors.has(value)) return false
  ancestors.add(value)
  const valid = Array.isArray(value)
    ? Object.keys(value).length === value.length &&
      value.every((entry) => jsonFact(entry, depth + 1, ancestors))
    : Object.values(value).every((entry) => jsonFact(entry, depth + 1, ancestors))
  ancestors.delete(value)
  return valid
}

class BattleTraceViolation extends Error {
  constructor(domain, rule, path, expected, actual) {
    super(`${rule}: ${path}`)
    this.finding = { domain, rule, path, expected, actual }
  }
}

function requireValue(condition, domain, rule, path, expected, actual) {
  if (!condition) throw new BattleTraceViolation(domain, rule, path, expected, actual)
}

function statuses(value, path, domain) {
  requireValue(record(value), domain, 'statuses-present', path, 'active status record', value)
  for (const [name, turns] of Object.entries(value))
    requireValue(
      text(name) && integer(turns, 1),
      domain,
      'active-status',
      path,
      'positive turns',
      value,
    )
}

/** Slots are addresses inside this battle, while ids distinguish declared instances. */
function snapshot(value, path, domain = 'integrity') {
  requireValue(record(value), domain, 'snapshot-present', path, 'snapshot', value)
  requireValue(
    Array.isArray(value.players) && value.players.length >= 1 && value.players.length <= 3,
    domain,
    'players-present',
    `${path}.players`,
    'one to three participating players',
    value.players,
  )
  requireValue(
    Array.isArray(value.enemies) && value.enemies.length === 5,
    domain,
    'enemy-slots-present',
    `${path}.enemies`,
    'five slots including null vacancies',
    value.enemies,
  )
  const ids = new Set()
  for (const [side, entries] of [
    ['players', value.players],
    ['enemies', value.enemies],
  ])
    for (let slot = 0; slot < entries.length; slot++) {
      requireValue(
        own(entries, slot),
        domain,
        'dense-slots',
        `${path}.${side}`,
        'explicit slots',
        entries,
      )
      const unit = entries[slot]
      if (side === 'enemies' && unit === null) continue
      const location = `${path}.${side}[${slot}]`
      requireValue(record(unit), domain, 'unit-present', location, 'unit record', unit)
      requireValue(
        text(unit.id) && !ids.has(unit.id) && unit.slot === slot,
        domain,
        'unit-identity',
        location,
        'unique declared id and original slot',
        unit,
      )
      ids.add(unit.id)
      requireValue(
        integer(unit.maxHP, 1) && integer(unit.hp) && unit.hp <= unit.maxHP,
        domain,
        'unit-health',
        location,
        '0 <= hp <= positive maxHP',
        unit,
      )
      statuses(unit.statuses, `${location}.statuses`, domain)
      if (own(unit, 'poisons'))
        requireValue(
          Array.isArray(unit.poisons) &&
            unit.poisons.length <= 16 &&
            unit.poisons.every((id, i) => integer(id, 1) && (i === 0 || id > unit.poisons[i - 1])),
          domain,
          'active-poisons',
          `${location}.poisons`,
          'sorted unique positive poison IDs',
          unit.poisons,
        )
      if (side === 'players')
        requireValue(
          integer(unit.maxMP) &&
            integer(unit.mp) &&
            unit.mp <= unit.maxMP &&
            integer(unit.level, 1) &&
            integer(unit.exp),
          domain,
          'player-numbers',
          location,
          'MP, maxMP, positive level and experience',
          unit,
        )
      else
        requireValue(
          text(unit.templateId) && unit.alive === unit.hp > 0,
          domain,
          'enemy-state',
          location,
          'template identity and alive flag matching health',
          unit,
        )
    }
  requireValue(
    Array.isArray(value.inventory) && integer(value.money),
    domain,
    'inventory-money-present',
    path,
    'inventory and nonnegative money',
    value,
  )
  const items = new Set()
  for (const item of value.inventory) {
    requireValue(
      record(item) && text(item.itemId) && integer(item.count) && !items.has(item.itemId),
      domain,
      'inventory-entry',
      `${path}.inventory`,
      'unique itemId and nonnegative count',
      item,
    )
    items.add(item.itemId)
  }
}

function canonicalSnapshot(value) {
  return {
    players: value.players.map(
      ({ id, slot, hp, maxHP, mp, maxMP, level, exp, statuses, poisons }) => ({
        id,
        slot,
        hp,
        maxHP,
        mp,
        maxMP,
        level,
        exp,
        statuses,
        ...(poisons?.length ? { poisons } : {}),
      }),
    ),
    enemies: value.enemies.map((unit) =>
      unit === null
        ? null
        : {
            id: unit.id,
            slot: unit.slot,
            templateId: unit.templateId,
            hp: unit.hp,
            maxHP: unit.maxHP,
            alive: unit.alive,
            statuses: unit.statuses,
            ...(unit.poisons?.length ? { poisons: unit.poisons } : {}),
          },
    ),
    inventory: value.inventory
      .map(({ itemId, count }) => ({ itemId, count }))
      .sort((a, b) => a.itemId.localeCompare(b.itemId)),
    money: value.money,
  }
}

function semantic(event) {
  return {
    turn: event.turn,
    actorId: event.actorId,
    ...(own(event, 'actorSide') ? { actorSide: event.actorSide } : {}),
    kind: event.kind,
    targetId: event.targetId,
    ...(own(event, 'itemId') ? { itemId: event.itemId } : {}),
    ...(own(event, 'skillId') ? { skillId: event.skillId } : {}),
  }
}

function action(value, path, domain, allowPass = false) {
  requireValue(
    record(value) &&
      integer(value.turn) &&
      text(value.actorId) &&
      (['attack', 'item', 'defend', 'cast'].includes(value.kind) ||
        (allowPass && value.kind === 'pass' && !own(value, 'actorSide'))) &&
      (['defend', 'pass'].includes(value.kind) ? value.targetId === null : text(value.targetId)) &&
      (!own(value, 'actorSide') || value.actorSide === 'enemy') &&
      (value.kind !== 'item' || text(value.itemId)) &&
      (value.kind !== 'cast' || text(value.skillId)),
    domain,
    'action-shape',
    path,
    'turn, actor, legal action and target, with itemId or skillId where required',
    value,
  )
}

function round(value, path, domain) {
  requireValue(
    record(value) && integer(value.turn, 1),
    domain,
    'round-shape',
    path,
    'positive completed turn with before and after states',
    value,
  )
  snapshot(value.before, `${path}.before`, domain)
  snapshot(value.after, `${path}.after`, domain)
}

const roundState = ({ turn, before, after }) => ({
  turn,
  before: canonicalSnapshot(before),
  after: canonicalSnapshot(after),
})

function equalBusiness(actual, expected, rule, path) {
  requireValue(same(actual, expected), 'business', rule, path, expected, actual)
}

/** The returned projection deliberately excludes timestamps and native overkill damage. */
export function projectBattleBusinessTrace(trace) {
  return {
    start: canonicalSnapshot(trace.start.state),
    commands: trace.commands.map(semantic),
    actions: trace.actions.map((event) => ({
      ...semantic(event),
      before: canonicalSnapshot(event.before),
      after: canonicalSnapshot(event.after),
    })),
    ...(trace.rounds?.length ? { rounds: trace.rounds.map(roundState) } : {}),
    terminal: {
      result: trace.terminal.result,
      settlementCount: trace.terminal.settlementCount,
      after: canonicalSnapshot(trace.terminal.after),
    },
  }
}

export const BATTLE_FOUNDATION_LIMITS = Object.freeze([
  'raw-damage-parity',
  'random-draw-allocation-parity',
  'audio-correctness',
  'complete-animation-conformance',
  'world-encounter-and-save-lifecycle',
])

function validateScenario(scenario) {
  requireValue(
    record(scenario) && text(scenario.id) && record(scenario.expected),
    'oracle',
    'scenario-present',
    'scenario',
    'scenario id and independent expected values',
    scenario,
  )
  const expected = scenario.expected
  requireValue(
    record(scenario.random) &&
      text(scenario.random.algorithm) &&
      integer(scenario.random.seed) &&
      scenario.random.seed <= 0xffffffff,
    'oracle',
    'expected-random',
    'scenario.random',
    'algorithm and uint32 seed',
    scenario.random,
  )
  snapshot(expected.start, 'expected.start', 'oracle')
  requireValue(
    Array.isArray(expected.commands) &&
      Array.isArray(expected.actions) &&
      expected.actions.length > 0,
    'oracle',
    'expected-sequence',
    'expected',
    'command and nonempty action lists',
    expected,
  )
  for (const [i, entry] of expected.commands.entries())
    action(entry, `expected.commands[${i}]`, 'oracle')
  const rounds = expected.rounds
  if (rounds !== undefined)
    requireValue(
      Array.isArray(rounds),
      'oracle',
      'expected-rounds',
      'expected.rounds',
      'list',
      rounds,
    )
  let roundIndex = 0
  for (const [i, entry] of expected.actions.entries()) {
    action(entry, `expected.actions[${i}]`, 'oracle', true)
    snapshot(entry.before, `expected.actions[${i}].before`, 'oracle')
    snapshot(entry.after, `expected.actions[${i}].after`, 'oracle')
    const previous = expected.actions[i - 1]
    let preceding = previous?.after ?? expected.start
    if (rounds !== undefined && previous && entry.turn !== previous.turn) {
      const completed = rounds[roundIndex]
      const path = `expected.rounds[${roundIndex++}]`
      round(completed, path, 'oracle')
      requireValue(
        completed.turn === previous.turn &&
          entry.turn === completed.turn + 1 &&
          same(canonicalSnapshot(completed.before), canonicalSnapshot(preceding)),
        'oracle',
        'expected-round-continuity',
        path,
        { turn: previous.turn, before: preceding, nextTurn: previous.turn + 1 },
        { turn: completed.turn, before: completed.before, nextTurn: entry.turn },
      )
      preceding = completed.after
    }
    requireValue(
      same(canonicalSnapshot(entry.before), canonicalSnapshot(preceding)),
      'oracle',
      'expected-action-continuity',
      `expected.actions[${i}].before`,
      preceding,
      entry.before,
    )
  }
  if (rounds !== undefined)
    requireValue(
      rounds.length === roundIndex,
      'oracle',
      'expected-round-count',
      'expected.rounds',
      roundIndex,
      rounds.length,
    )
  requireValue(
    record(expected.terminal) &&
      text(expected.terminal.result) &&
      expected.terminal.settlementCount === 1,
    'oracle',
    'expected-terminal',
    'expected.terminal',
    'terminal result and exactly one settlement',
    expected.terminal,
  )
  snapshot(expected.terminal.after, 'expected.terminal.after', 'oracle')
  return expected
}

function validateRecording(trace, scenario) {
  requireValue(
    record(trace) &&
      trace.schemaVersion === 1 &&
      trace.kind === 'battle-foundation-trace' &&
      ['game', 'reforge'].includes(trace.engine) &&
      text(trace.runId) &&
      trace.scenarioId === scenario.id,
    'integrity',
    'trace-identity',
    'trace',
    'versioned battle run matching scenario',
    trace,
  )
  requireValue(
    record(trace.random) &&
      text(trace.random.algorithm) &&
      integer(trace.random.seed) &&
      trace.random.seed <= 0xffffffff,
    'integrity',
    'random-configuration',
    'random',
    'algorithm and uint32 seed',
    trace.random,
  )
  requireValue(
    same(trace.random, scenario.random),
    'business',
    'random-input',
    'random',
    scenario.random,
    trace.random,
  )
  requireValue(
    Array.isArray(trace.errors) && trace.errors.length === 0 && trace.overflow === false,
    'integrity',
    'collector-integrity',
    'trace',
    'no collector error or overflow',
    { errors: trace.errors, overflow: trace.overflow },
  )
  requireValue(
    record(trace.start) && record(trace.terminal),
    'integrity',
    'start-terminal-present',
    'trace',
    'start and terminal receipts',
    { start: trace.start, terminal: trace.terminal },
  )
  snapshot(trace.start.state, 'start.state')
  snapshot(trace.terminal.after, 'terminal.after')
  const traceLists = ['commands', 'actions', 'randomDraws', 'presentations']
  if (own(trace, 'rounds')) traceLists.push('rounds')
  for (const key of traceLists)
    requireValue(
      Array.isArray(trace[key]) && trace[key].length <= 16000,
      'integrity',
      'trace-list',
      key,
      'bounded evidence list',
      trace[key],
    )
  requireValue(
    trace.randomDraws.length > 0,
    'integrity',
    'random-evidence-present',
    'randomDraws',
    'actual random calls',
    trace.randomDraws,
  )
  for (const [i, entry] of trace.commands.entries()) action(entry, `commands[${i}]`, 'integrity')
  for (const [i, entry] of trace.actions.entries()) {
    action(entry, `actions[${i}]`, 'integrity', true)
    snapshot(entry.before, `actions[${i}].before`)
    snapshot(entry.after, `actions[${i}].after`)
  }
  const rounds = trace.rounds ?? []
  for (const [i, entry] of rounds.entries()) {
    const path = `rounds[${i}]`
    round(entry, path, 'integrity')
    requireValue(
      record(entry.native) &&
        Array.isArray(entry.native.poisonsBefore) &&
        Array.isArray(entry.native.poisonsAfter),
      'integrity',
      'round-native-poisons',
      `${path}.native`,
      'native before and after poison slots',
      entry.native,
    )
  }
  for (const [i, entry] of trace.randomDraws.entries())
    requireValue(
      record(entry) &&
        entry.index === i &&
        Number.isFinite(entry.value) &&
        entry.value >= 0 &&
        entry.value < 1,
      'integrity',
      'random-draw',
      `randomDraws[${i}]`,
      'contiguous index and value in [0,1)',
      entry,
    )
  for (const [i, entry] of trace.presentations.entries())
    requireValue(
      record(entry) && text(entry.kind),
      'integrity',
      'presentation-shape',
      `presentations[${i}]`,
      'classified fact receipt',
      entry,
    )
  const resources = trace.resources ?? []
  requireValue(
    Array.isArray(resources) && resources.length <= 4096,
    'integrity',
    'resource-list',
    'resources',
    'bounded shared-recorder resource list',
    resources,
  )
  for (const [i, entry] of resources.entries()) {
    const count = entry?.width * entry?.height
    requireValue(
      record(entry) &&
        entry.kind === 'sprite-frame' &&
        integer(entry.width, 1) &&
        integer(entry.height, 1) &&
        integer(count, 1) &&
        Array.isArray(entry.pixels) &&
        Array.isArray(entry.opaque) &&
        entry.pixels.length === count &&
        entry.opaque.length === count &&
        [...entry.pixels, ...entry.opaque].every((byte) => integer(byte) && byte <= 255),
      'integrity',
      'resource-frame',
      `resources[${i}]`,
      'complete decoded frame bytes',
      entry,
    )
  }
  for (const [name, entries] of [
    ['commands', trace.commands],
    ['actions', trace.actions],
    ['rounds', rounds],
    ['randomDraws', trace.randomDraws],
    ['presentations', trace.presentations],
    ['resources', resources],
  ])
    for (const [i, entry] of entries.entries())
      requireValue(
        entry.seq === i && (i === 0 || entry.order > entries[i - 1].order),
        'integrity',
        'list-sequence',
        `${name}[${i}]`,
        'contiguous sequence and increasing evidence order',
        entry,
      )
  requireValue(
    text(trace.terminal.result) && integer(trace.terminal.settlementCount),
    'integrity',
    'terminal-shape',
    'terminal',
    'result and settlement count',
    trace.terminal,
  )
  const all = [
    trace.start,
    ...trace.commands,
    ...trace.actions,
    ...rounds,
    ...trace.randomDraws,
    ...trace.presentations,
    ...resources,
    trace.terminal,
  ].sort((a, b) => a.order - b.order)
  const resourceSet = new Set(resources)
  for (const [i, entry] of all.entries())
    requireValue(
      record(entry) &&
        entry.order === i &&
        Number.isFinite(entry.atMs) &&
        entry.atMs >= 0 &&
        entry.engine === trace.engine &&
        entry.scenarioId === trace.scenarioId &&
        entry.runId === trace.runId &&
        (resourceSet.has(entry) || text(entry.source)) &&
        (i === 0 || entry.atMs >= all[i - 1].atMs),
      'integrity',
      'evidence-order',
      `events[${i}]`,
      'complete monotonically timed global order and source',
      entry,
    )
  for (const [i, entry] of all.entries())
    requireValue(
      jsonFact(entry),
      'integrity',
      'serializable-fact',
      `events[${i}]`,
      'detached finite JSON facts',
      entry,
    )
  requireValue(
    trace.terminal.order === all.length - 1 &&
      [...trace.commands, ...trace.actions, ...rounds, ...trace.presentations].every(
        (entry) => entry.order > trace.start.order,
      ),
    'integrity',
    'sealed-boundary',
    'trace',
    'actions after start, terminal last',
    trace.terminal,
  )
}

function assertBusinessConformance(trace, expected) {
  const actual = projectBattleBusinessTrace(trace)
  equalBusiness(actual.start, canonicalSnapshot(expected.start), 'initial-state', 'start')
  equalBusiness(actual.commands.length, expected.commands.length, 'command-count', 'commands')
  for (const [i, entry] of actual.commands.entries())
    equalBusiness(entry, semantic(expected.commands[i]), 'command-semantic', `commands[${i}]`)
  equalBusiness(actual.actions.length, expected.actions.length, 'action-count', 'actions')
  for (const [i, entry] of actual.actions.entries()) {
    equalBusiness(
      semantic(entry),
      semantic(expected.actions[i]),
      'action-semantic',
      `actions[${i}]`,
    )
    equalBusiness(
      entry.before,
      canonicalSnapshot(expected.actions[i].before),
      'action-before',
      `actions[${i}].before`,
    )
    equalBusiness(
      entry.after,
      canonicalSnapshot(expected.actions[i].after),
      'action-after',
      `actions[${i}].after`,
    )
    if (expected.actions[i].guard)
      equalBusiness(
        trace.actions[i].guard,
        expected.actions[i].guard,
        'guard-state',
        `actions[${i}]`,
      )
  }
  if (expected.rounds !== undefined) {
    const rounds = trace.rounds ?? []
    equalBusiness(rounds.length, expected.rounds.length, 'round-count', 'rounds')
    for (const [i, entry] of rounds.entries()) {
      const path = `rounds[${i}]`
      const wanted = roundState(expected.rounds[i])
      const observed = roundState(entry)
      equalBusiness(observed.turn, wanted.turn, 'round-turn', `${path}.turn`)
      equalBusiness(observed.before, wanted.before, 'round-before', `${path}.before`)
      equalBusiness(observed.after, wanted.after, 'round-after', `${path}.after`)
      const prior = trace.actions.findLast(({ turn }) => turn === entry.turn)
      const next = trace.actions.find(({ turn }) => turn === entry.turn + 1)
      requireValue(
        prior?.order < entry.order &&
          entry.order < next?.order &&
          trace.commands.every(({ turn, order }) => turn !== entry.turn + 1 || order > entry.order),
        'integrity',
        'round-order',
        path,
        'round end between the previous turn action and next turn input or action',
        entry.order,
      )
    }
  }
  equalBusiness(
    actual.terminal,
    {
      result: expected.terminal.result,
      settlementCount: expected.terminal.settlementCount,
      after: canonicalSnapshot(expected.terminal.after),
    },
    'terminal-state',
    'terminal',
  )
  const submitted = new Set()
  for (const [i, entry] of trace.actions.entries()) {
    if (entry.actorSide === 'enemy') {
      requireValue(
        entry.before.enemies.some((enemy) => enemy?.id === entry.actorId && enemy.alive),
        'integrity',
        'enemy-action-producer',
        `actions[${i}]`,
        'one living enemy acting autonomously',
        entry,
      )
      continue
    }
    if (entry.kind === 'pass') {
      const actor = entry.before.players.find(({ id }) => id === entry.actorId)
      requireValue(
        entry.native?.inaction === 'incapacitated' &&
          actor?.hp > 0 &&
          (actor.statuses.sleep > 0 || actor.statuses.paralyzed > 0) &&
          !trace.commands.some(
            ({ actorId, turn }) => actorId === entry.actorId && turn === entry.turn,
          ),
        'integrity',
        'incapacitated-action-producer',
        `actions[${i}]`,
        'native inaction of a living incapacitated player with no command this turn',
        entry,
      )
      continue
    }
    const index = trace.commands.findIndex(
      (command, commandIndex) =>
        !submitted.has(commandIndex) &&
        command.order < entry.order &&
        same(semantic(command), semantic(entry)),
    )
    requireValue(
      index >= 0,
      'integrity',
      'action-submission',
      `actions[${i}]`,
      'one earlier matching committed command',
      entry,
    )
    submitted.add(index)
  }

  const planned = expected.commands
    .map((command, index) => ({ command, index }))
    .filter(({ command }) => command.cancelTargetId)
  const cancelled = trace.presentations.filter(({ kind }) => kind === 'target-cancel')
  equalBusiness(cancelled.length, planned.length, 'target-cancel-count', 'presentations')
  for (const [i, { command, index }] of planned.entries()) {
    const event = cancelled[i]
    const path = `target-cancel[${i}]`
    const { state, ...facts } = event.payload ?? {}
    equalBusiness(
      facts,
      {
        turn: command.turn,
        actorId: command.actorId,
        targetId: command.cancelTargetId,
        skillId: command.skillId,
        commandCount: index,
        pending: false,
      },
      'target-cancel',
      path,
    )
    const execution = expected.actions.find((entry) => same(semantic(entry), semantic(command)))
    snapshot(state, path)
    equalBusiness(
      canonicalSnapshot(state),
      canonicalSnapshot(execution.before),
      'target-cancel-state',
      path,
    )
    requireValue(
      event.order < trace.commands[index].order &&
        (index === 0 || event.order > trace.commands[index - 1].order),
      'integrity',
      'target-cancel-order',
      path,
      'native target cancellation between the previous and replacement commits',
      event.order,
    )
  }
}

/** Validate actual facts and a complete independent oracle; missing fields never become zeros. */
export function validateBattleTrace(trace, scenario) {
  const base = { kind: 'battle-trace-verdict', scenarioId: scenario?.id, engine: trace?.engine }
  try {
    const expected = validateScenario(scenario)
    validateRecording(trace, scenario)
    assertBusinessConformance(trace, expected)
    return {
      ...base,
      status: 'passed',
      findings: [],
      checked: {
        commands: trace.commands.length,
        actions: trace.actions.length,
        ...(trace.rounds?.length ? { rounds: trace.rounds.length } : {}),
        randomDraws: trace.randomDraws.length,
        presentations: trace.presentations.length,
      },
      notAccepted: [...BATTLE_FOUNDATION_LIMITS],
    }
  } catch (error) {
    if (!(error instanceof BattleTraceViolation)) throw error
    return {
      ...base,
      status: 'rejected',
      findings: [error.finding],
      notAccepted: [...BATTLE_FOUNDATION_LIMITS],
    }
  }
}
