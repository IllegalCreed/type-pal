import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { sha256 } from '../browser-journey.mjs'
import { readEvidenceArtifact } from '../evidence-artifact.mjs'
import { assertInputLedger } from '../input-ledger.mjs'
import { gameScene, grid, party, readSources, scenarios } from './scenarios.mjs'

const [scenario, gamePath, reforgePath] = process.argv.slice(2)
const spec = scenarios[scenario]
assert(
  spec && gamePath && reforgePath && process.argv.length === 5,
  'usage: node scripts/e2e/boss-entrances/compare.mjs snake|fox GAME_REPORT REFORGE_REPORT',
)
const source = await readSources(spec)
const roles = party.map(({ role }) => role)
const subtitle = (s) => s?.replace(/[\s"“”]/gu, '') ?? ''
const speaker = (s) => s?.replace(/^spk\./u, '').replace(/∶$/u, '') ?? null
const totalReward = () => [
  source.original.exp + source.summonBonus.exp,
  source.original.cash + source.summonBonus.cash,
]
const mainAction = (action, game) => {
  const kind = game ? (action.type === 'magic' ? 'cast' : action.type) : action.kind
  return {
    kind,
    spell: kind === 'cast' ? String(game ? action.actionId : action.skillId) : null,
    target: ['defend', 'pass'].includes(kind)
      ? null
      : game
        ? action.target === -1
          ? null
          : action.target
        : (action.targetEnemyIdx ?? action.targetPlayerIdx ?? null),
  }
}

function difference(expected, actual, path = []) {
  if (isDeepStrictEqual(expected, actual)) return null
  if (
    expected != null &&
    actual != null &&
    typeof expected === 'object' &&
    typeof actual === 'object'
  ) {
    if (Array.isArray(expected) && Array.isArray(actual) && expected.length !== actual.length)
      return { path: [...path, 'length'], game: expected.length, reforge: actual.length }
    for (const key of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
      const failure = difference(expected[key], actual[key], [...path, key])
      if (failure) return failure
    }
  }
  return { path, game: expected, reforge: actual }
}

function checkDialogue(events, before, after, game) {
  const expected = (commands) =>
    commands
      .filter(({ op, text }) => op === 'showDialog' && !text.endsWith('∶'))
      .map(({ text }) => subtitle(text))
  const painted = (start, end) => {
    const pages = new Map()
    for (const event of events) {
      const box = event.box
      if (
        event.kind !== 'paint' ||
        event.order <= start ||
        event.order >= end ||
        !box?.text ||
        !box.phase.startsWith('waiting')
      )
        continue
      pages.set(JSON.stringify([box.at, box.id, box.page]), box)
    }
    return [...pages.values()].map(({ text, speaker: heading }) => ({
      text,
      speaker: speaker(heading),
    }))
  }
  const [beforeText, afterText] = [source.pre, source.post].map(expected)
  const pre = painted(before.trigger, before.battle)
  const post = painted(after.won, after.control)
  if (game && spec.disk.reward) {
    const notes = events.filter(
      ({ kind, order }) =>
        kind === 'reward-note-drawn' && order > after.won && order < after.control,
    )
    assert.equal(notes.length, 1, 'native victory reward line')
    post.unshift({ text: notes[0].text, speaker: null })
  }
  for (const [pages, texts, label] of [
    [pre, beforeText, 'before battle'],
    [post, afterText, 'after victory'],
  ]) {
    const displayed = subtitle(pages.map(({ text }) => text).join(''))
    assert.equal(displayed, texts.join(''), `native drawn dialogue ${label}`)
  }
  return { pre, post }
}

async function inspect(path, engine) {
  const bytes = await readFile(path)
  const report = JSON.parse(bytes)
  const game = engine === 'game'
  assert.equal(report.engine, engine)
  assert.equal(report.fragment, spec.id)
  assert.deepEqual(report.input, spec)
  assert.equal(report.status, 'passed', report.failure)
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.cleanupErrors ?? [], [])
  assert.equal(report.inputExecution.status, 'passed')
  assertInputLedger(report.actions, { requireReceipts: true })
  for (const [phase, key] of [
    ['approach', 'ArrowUp'],
    ['exit', 'ArrowDown'],
  ])
    assert.deepEqual(
      report.actions.filter((a) => a.phase === phase).map((a) => [a.kind, a.key]),
      [
        ['down', key],
        ['up', key],
      ],
      `one held key for ${phase}`,
    )
  assert.deepEqual(
    report.contexts.map(({ label, initialDatabases }) => [label, initialDatabases]),
    game
      ? [
          ['canonical-boot', []],
          [spec.id, []],
        ]
      : [[spec.id, []]],
  )
  const [run] = report.cases
  const read = async (ref) => {
    const binding = await readEvidenceArtifact(dirname(path), ref)
    assert.equal(binding.binding.status, 'verified')
    return binding.value
  }
  const [saved, raw] = await Promise.all([read(report.save), read(run.raw)])
  if (game) {
    assert.equal(gameScene(spec), saved.gs.wNumScene)
    assert.deepEqual(
      saved.gs.partyMembers,
      party.map(({ roleId }) => roleId),
    )
    assert.equal(run.slotReadback, report.save.sha256)
  } else {
    const readback = await read(run.slotReadback)
    assert.deepEqual(readback.position, {
      sceneId: spec.scene,
      pos: grid(spec.start),
      facing: 'up',
    })
    assert.equal(readback.version, saved.version)
    assert.equal(readback.contentVersion, saved.contentVersion)
    assert.deepEqual(readback.world.party, saved.world.party)
  }
  assert.equal(raw.engine, engine)
  assert.equal(raw.overflow, false)
  assert.deepEqual(raw.errors, [])
  assert.equal(raw.seed, spec.seed)
  const events = raw.events
  assert(events.length > 0)
  assert(
    events.every(
      ({ order, seq, atMs }, i) =>
        seq === i &&
        order === i &&
        Number.isFinite(atMs) &&
        (i === 0 || atMs >= events[i - 1].atMs),
    ),
  )
  const find = (type) => events.filter(({ kind }) => kind === type)
  const once = (type) => {
    const hits = find(type)
    assert.equal(hits.length, 1, `${engine} ${type} event count`)
    return hits[0]
  }
  const trigger = once('trigger')
  assert.deepEqual(
    [trigger.scene, trigger.owner, trigger.position],
    [spec.scene, spec.owner, spec.contact],
  )
  const [approach, departure] = find('move')
  assert.deepEqual(
    find('move').map(({ from, to, facing }) => [from, to, facing]),
    [
      [spec.start, spec.contact, 'up'],
      [spec.contact, spec.start, 'down'],
    ],
  )
  assert(approach.order < trigger.order)
  const script = find('script-op')
  const launch = script.filter((event) => (game ? event.opcode === 7 : event.op === 'startBattle'))
  assert.equal(launch.length, 1)
  if (game) {
    assert.equal(trigger.ip, spec.disk.entry)
    assert.deepEqual([launch[0].ip, launch[0].operands], [spec.disk.battle, [spec.team, 41075, 0]])
    const caller = once('battle-caller')
    assert.deepEqual(
      [caller.enemyTeamId, caller.battleFieldId, caller.isBoss],
      [spec.team, spec.field, true],
    )
  } else {
    assert.deepEqual(launch[0].path, [
      'initial',
      source.canonical.findIndex(({ kind }) => kind === 'startBattle'),
    ])
    assert.equal(once('script-result').arm, 'none')
  }
  const prepared = once('prepared')
  assert.deepEqual(
    [
      game ? prepared.field : once('field').fieldId,
      game ? prepared.music : Number(prepared.music.split('.').at(-1)),
      prepared.boss,
      prepared.auto,
    ],
    [spec.field, spec.music, true, false],
  )
  if (!game) assert.equal(prepared.team, `team-${spec.team}`)
  assert.deepEqual(
    prepared.players.map(({ id, roleId, hp, mp }) => [id ?? roleId, hp, mp]),
    party.map(({ role, hp, mp }) => [role, hp, mp]),
  )
  const actualSlots = game ? prepared.slots : find('action')[0]?.slots
  assert(Array.isArray(actualSlots))
  assert.deepEqual(
    Array.from({ length: 5 }, (_, i) => actualSlots[i]?.id ?? null),
    source.slots,
  )

  const entry = once('entry-complete')
  assert.deepEqual(
    find('entry-band').map(({ band }) => band),
    [0, 1, 2, 3, 4, 5, 6],
  )
  assert(find('entry-band').every(({ pixels }) => pixels.length === 6))
  const music = find('music-start').filter(({ track }) => track === spec.music)
  assert.equal(music.length, 1)
  assert.equal(music[0].context, 'running')
  const menu = once('command-menu-drawn')
  assert(
    prepared.order < entry.order && entry.order < music[0].order && music[0].order < menu.order,
  )
  const commands = find('command').map(({ slot, turn, action }) => ({
    slot,
    turn,
    ...mainAction(action, game),
  }))
  assert.deepEqual(
    commands.filter(({ turn }) => turn === 1).map(({ slot, kind }) => [slot, kind]),
    [
      [0, 'defend'],
      [1, 'defend'],
    ],
  )
  assert(
    commands
      .filter(({ turn }) => turn > 1)
      .every(
        ({ kind, target }) =>
          kind === 'attack' &&
          Number.isInteger(target) &&
          target >= 0 &&
          target < source.slots.length,
      ),
  )
  assert(report.actions.some(({ phase }) => phase === 'battle-select'))

  const actions = find('action').map(({ turn, actor, action, party: members, slots }) => ({
    turn,
    side: game ? (actor.isEnemy ? 'enemy' : 'player') : action.side,
    slot: game ? actor.idx : action.idx,
    ...mainAction(action, game),
    hp: members.map(({ hp }) => hp),
    enemies: Array.from({ length: 5 }, (_, i) => slots[i] ?? null),
  }))
  const enemy = actions.filter(({ side, slot }) => side === 'enemy' && slot === spec.slot)
  const expectedEnemyActions =
    spec.slot === 0 ? Array(6).fill('attack') : ['cast', 'cast', 'pass', 'cast']
  assert.deepEqual(
    enemy.map(({ kind }) => kind),
    expectedEnemyActions,
  )
  if (spec.slot === 1) {
    assert.deepEqual(
      enemy.map(({ spell }) => spell),
      ['316', '303', null, '316'],
    )
    const summon = enemy.find(({ kind }) => kind === 'pass')
    assert.deepEqual(
      summon.enemies.map((slot) => slot.id),
      ['enemy-403', 'enemy-469', 'enemy-403', 'enemy-403', 'enemy-403'],
    )
    assert.equal(summon.enemies.filter(({ id, hp }) => id === 'enemy-403' && hp === 32).length, 4)
    assert(
      actions.some(({ side, slot, kind }) => side === 'enemy' && slot !== 1 && kind === 'attack'),
    )
  }
  assert.deepEqual([actions.at(-1).side, actions.at(-1).kind], ['player', 'attack'])
  assert(actions.at(-1).enemies.every((slot) => slot === null || slot.hp === 0))

  const poses = find('boss-frame').filter(
    ({ slot, active }) => slot === spec.slot && active?.side === 'enemy' && active.slot === slot,
  )
  assert(poses.length > 0, 'boss never actually rendered during its action')
  assert(
    poses.every(
      ({ frame, x, y }) => Number.isInteger(frame) && Number.isInteger(x) && Number.isInteger(y),
    ),
  )
  assert(
    new Set(poses.map(({ x, y }) => `${x},${y}`)).size >= 3,
    'boss action never changed its drawn position',
  )
  const effectSounds = find('sfx-start')
  assert(effectSounds.every(({ context, frames }) => context === 'running' && frames > 0))
  const soundIds = effectSounds.map(({ asset }) => asset)
  if (spec.slot === 0)
    assert.equal(
      soundIds.filter((asset) => asset === source.original.attackSound).length,
      enemy.length,
    )
  else {
    assert(soundIds.includes(source.original.magicSound), 'fox spell sound did not start')
    assert.equal(soundIds.filter((asset) => asset === 212).length, 1, 'fox summon sound count')
  }
  assert.equal(soundIds.filter((asset) => asset === source.original.deathSound).length, 1)

  const won = once('battle-finished')
  assert.equal(won.result, game ? 'won' : 'victory')
  const summary = once('victory-summary-drawn')
  const [exp, cash] = totalReward()
  assert.deepEqual([summary.exp, summary.cash], [exp, cash])
  assert(summary.order < won.order)
  assert.equal(won.cash, cash)
  assert.deepEqual(won.inventory, [], 'story loot must follow the completed battle')
  const control = once('world-control')
  assert.deepEqual(control.position, spec.contact)
  assert(won.order < control.order && control.order < departure.order)
  const last = run.departure.state
  assert.deepEqual(
    [last.scene, last.position, last.ready, last.box, last.battle],
    [spec.scene, spec.start, true, null, null],
  )
  assert.deepEqual([last.cash, last.inventory], [cash, spec.world.inventory])
  assert.deepEqual(
    last.party.map(({ id, exp: gained }) => [id, gained]),
    roles.map((role) => [role, exp]),
  )
  assert.deepEqual(control.inventory, spec.world.inventory)
  assert.equal(run.returned.owner.state ?? spec.disk.owner[2], spec.world.gameState)
  if (game) {
    assert.equal(won.continuation, spec.disk.battle + 1)
    assert.equal(run.returned.owner.triggerMode, spec.world.triggerMode)
    assert.equal(run.returned.owner.resume, spec.slot === 0 ? spec.disk.last + 1 : null)
    assert(script.some(({ ip }) => ip === spec.disk.last))
    if (spec.disk.reward)
      assert.equal(
        script.filter(
          ({ ip, order }) => ip === spec.disk.reward && order > won.order && order < control.order,
        ).length,
        1,
      )
  } else if (spec.slot === 0) {
    const { behavior } = run.returned.owner
    assert.deepEqual(behavior.triggerActivation, {
      kind: 'use',
      value: { on: 'interact', range: 2 },
    })
    assert.deepEqual(behavior.trigger.cursor, {
      behavior: 'default',
      at: { kind: 'stage', stage: 'legacy-002' },
    })
  } else {
    assert.equal(run.returned.owner.hidden, true)
    assert.equal(
      script.filter(
        ({ op, order }) => op === 'giveItem' && order > won.order && order < control.order,
      ).length,
      1,
    )
  }
  const dialogue = checkDialogue(
    events,
    { trigger: trigger.order, battle: launch[0].order },
    { won: won.order, control: control.order },
    game,
  )
  const drops = find('drop-sample')
  assert.deepEqual(
    drops.map(({ slot }) => slot),
    spec.slot === 0 ? [] : game ? [0, 2, 3, 4] : [0, 1, 2, 3],
  )
  assert(
    drops.every(({ id, value }) => id === 'enemy-403' && Math.floor(value * 100) >= 11),
    'summoned bee drop probes must use original failed drop samples',
  )
  const comparable = {
    dialogue: [dialogue.pre, dialogue.post].map((pages) =>
      pages.map(({ text, speaker }) => ({ text: subtitle(text), speaker })),
    ),
    commands,
    actions,
    rng: find('rng').map(({ value }) => value),
    drops: drops.map(({ id, value }) => ({ id, value })),
    sounds: soundIds,
    ending: {
      party: last.party.map(({ weapon, ...member }) => member),
      cash: last.cash,
      inventory: last.inventory,
      music: last.music,
    },
  }
  return {
    engine,
    report: resolve(path),
    reportSha256: sha256(bytes),
    revision: report.revision,
    profile: report.profile,
    raw: run.raw,
    sourceHashes: report.dependencies.hashes,
    warnings: report.warnings,
    dialogue,
    clips: { contactMs: trigger.atMs, returnMs: control.atMs, exitMs: departure.atMs },
    visual: {
      bossFrames: poses.length,
      frameIndexes: [...new Set(poses.map(({ frame }) => frame))],
    },
    comparable,
  }
}

const sides = await Promise.allSettled([inspect(gamePath, 'game'), inspect(reforgePath, 'reforge')])
const failures = sides.flatMap((result, i) =>
  result.status === 'rejected'
    ? [{ engine: i === 0 ? 'game' : 'reforge', error: result.reason.stack }]
    : [],
)
const [game, reforge] = sides.map(({ value }) => value)
if (!failures.length) {
  const comparableGame = game.comparable
  assert.equal(difference(comparableGame, structuredClone(comparableGame)), null)
  const changed = structuredClone(comparableGame)
  changed.ending.music += 1
  assert.deepEqual(difference(comparableGame, changed)?.path, ['ending', 'music'])
  if (game.revision !== reforge.revision)
    failures.push({ path: ['revision'], game: game.revision, reforge: reforge.revision })
  if (game.profile !== reforge.profile)
    failures.push({ path: ['profile'], game: game.profile, reforge: reforge.profile })
  for (const key of Object.keys(comparableGame)) {
    const first = difference(comparableGame[key], reforge.comparable[key], [key])
    if (first) failures.push(first)
  }
  const shared = Object.keys(game.sourceHashes).filter((name) => name in reforge.sourceHashes)
  for (const path of shared)
    if (game.sourceHashes[path] !== reforge.sourceHashes[path])
      failures.push({
        path: ['source', path],
        game: game.sourceHashes[path],
        reforge: reforge.sourceHashes[path],
      })
}
console.log(
  JSON.stringify(
    { status: failures.length ? 'failed' : 'passed', scenario, game, reforge, failures },
    null,
    2,
  ),
)
if (failures.length) process.exitCode = 1
