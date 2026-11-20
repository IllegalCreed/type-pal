import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import {
  inspectClearedDialogueFrames,
  sourceDialogueGroups,
} from '../rendered-dialogue-comparison.mjs'
import { inspectWorldDialogueCoverage } from './world-dialogue-coverage.mjs'

export function readSerialBattles({ spec, commands, body, teams, objects, enemies }) {
  const from = spec.disk.entry
  const through = spec.disk.last
  const original = commands
    .slice(from, through + 1)
    .flatMap(({ opcode, operands }, i) => (opcode === 7 ? [{ ip: from + i, operands }] : []))
  const authored = body.flatMap((command, index) =>
    command.kind === 'startBattle' ? [{ command, path: ['initial', index] }] : [],
  )
  assert.equal(original.length, spec.serial.length, 'original encounter sequence')
  assert.equal(authored.length, original.length, 'authored encounter sequence')
  return original.map(({ ip, operands }, index) => {
    const [team, loss, flee] = operands
    assert.deepEqual([ip, team, loss, flee], [...spec.serial[index], 41075, 0])
    const preceding = commands.slice(from, ip)
    const field = preceding.findLast(({ opcode }) => opcode === 0x4a)?.operands[0]
    const music = preceding.findLast(({ opcode }) => opcode === 0x45)?.operands[0]
    const roles = preceding
      .findLast(({ opcode }) => opcode === 0x75)
      ?.operands.filter((role) => role > 0)
      .map((role) => role - 1)
    assert(Number.isInteger(field) && Number.isInteger(music) && roles?.length)
    const { command, path } = authored[index]
    assert.equal(command.enemyTeamId, `team-${team}`)
    const slots = teams
      .find(({ id }) => id === team)
      .enemyObjectIndexes.map((id) => (id > 0 && id < 65535 ? `enemy-${id}` : null))
    const reward = { exp: 0, cash: 0 }
    for (const slot of slots.filter(Boolean)) {
      const object = objects.find(({ objectIndex }) => `enemy-${objectIndex}` === slot)
      const enemy = enemies.find(({ id }) => id === object.enemyId)
      reward.exp += enemy.exp
      reward.cash += enemy.cash
    }
    return { ip, operands, team, field, music, roles, slots, reward, path }
  })
}

function inspectPalaceMovement(events, contact, launch, game, issues) {
  const stage = events.filter(
    ({ kind, visible, scene, order }) =>
      kind === 'world-drawn' &&
      visible &&
      scene === 's278' &&
      contact.order < order &&
      order < launch.order,
  )
  const plans = [
    ['e4741', 564, 1488, 1048, -4, 2, 4, 'down', 400, 200, 0],
    ['e4748', 38, 1408, 1104, 8, -8, 4, 'up', 100, 300, 0],
    ['e4743', 562, 1232, 1192, 8, -4, 10, 'up', 200, 200, 2],
    ['e4744', 544, 1200, 1176, 8, -4, 10, 'up', 500, 200, 6],
    ['e4745', 544, 1264, 1208, 8, -4, 10, 'up', 400, 200, 0],
  ]
  return plans.map(([id, asset, x, y, dx, dy, count, facing, pause, interval, first]) => {
    const offset = facing === 'up' ? 6 : 0
    const expected = Array.from({ length: count + 1 }, (_, i) => ({
      asset,
      position: [x + i * dx, y + i * dy],
      facing,
      frame: offset + [0, 1, 0, 2][i % 4],
    })).slice(first)
    expected.at(-1).frame = offset
    const poses = []
    for (const view of stage) {
      const actor = view.actors[id]
      if (!actor || (first && actor.position[0] < x + first * dx)) continue
      const last = poses.at(-1)
      if (last && isDeepStrictEqual(last.pose.position, actor.position)) continue
      const { asset, position, facing, frame } = actor
      poses.push({ atMs: view.atMs, order: view.order, pose: { asset, position, facing, frame } })
    }
    const actual = poses.map(({ pose }) => pose)
    if (!isDeepStrictEqual(actual, expected))
      issues.push({ issue: 'palace-foreground-movement', actor: id, actual, expected })
    const timings = poses.slice(1).map(({ atMs }, i) => Math.round(atMs - poses[i].atMs))
    for (const [i, actual] of timings.entries()) {
      const start = !first && i === 0
      const expected = start ? pause : interval
      // The original waits for the matching frame parity before starting these slow walks.
      const candidates =
        game && start && (id === 'e4741' || id === 'e4745')
          ? [expected, expected + 100]
          : [expected]
      if (candidates.every((value) => Math.abs(actual - value) > 75))
        issues.push({
          issue: 'palace-foreground-cadence',
          actor: id,
          step: first + i + 1,
          actual,
          expected: candidates,
        })
    }
    return { id, poses, timings }
  })
}

export function inspectSerialBattles({
  spec,
  source,
  party,
  events,
  draws,
  trigger,
  control,
  game,
  action,
}) {
  const issues = []
  const check = (stage, rule, actual, expected) => {
    if (!isDeepStrictEqual(actual, expected)) issues.push({ stage, rule, actual, expected })
  }
  const launches = events.filter(
    (row) => row.kind === 'script-op' && (game ? row.opcode === 7 : row.op === 'startBattle'),
  )
  assert.equal(launches.length, source.serial.length, 'native launches in one foreground')
  const finishes = events.filter(({ kind }) => kind === 'battle-finished')
  assert.equal(finishes.length, launches.length, 'each native launch reaches its outcome')
  const movements = inspectPalaceMovement(events, trigger, launches[0], game, issues)
  const battles = source.serial.map((facts, i) => {
    const stage = i + 1
    const from = launches[i]
    const to = finishes[i]
    assert(from.order < to.order && to.order < (launches[i + 1] ?? control).order)
    check(
      stage,
      'launch came from the original foreground command',
      game ? [from.ip, from.operands] : from.path,
      game ? [facts.ip, facts.operands] : facts.path,
    )
    const rows = events.filter(({ order }) => from.order < order && order <= to.order)
    const one = (kind) => {
      const matching = rows.filter((row) => row.kind === kind)
      assert.equal(matching.length, 1, `encounter ${stage} ${kind}`)
      return matching[0]
    }
    const loaded = one('prepared')
    const field = game ? one('battle-caller').battleFieldId : one('field').fieldId
    check(stage, 'original battle scene, including the inherited field', field, facts.field)
    check(
      stage,
      'native encounter team',
      game ? one('battle-caller').enemyTeamId : loaded.team,
      game ? facts.team : `team-${facts.team}`,
    )
    check(stage, 'actual boss option', loaded.boss, true)
    const members = loaded.players.map(({ id, roleId, hp, mp }) => [id ?? roleId, hp, mp])
    check(
      stage,
      'original active party',
      members.map(([role]) => role),
      facts.roles.map((id) => party.find(({ roleId }) => roleId === id).role),
    )
    const firstAction = rows.find(({ kind }) => kind === 'action')
    const slots = Array.from(
      { length: 5 },
      (_, slot) => (game ? loaded.slots : firstAction?.slots)?.[slot]?.id ?? null,
    )
    check(stage, 'native opening enemy slots', slots, facts.slots)
    const entry = one('entry-complete')
    const menu = one('command-menu-drawn')
    const bands = rows.filter(({ kind }) => kind === 'entry-band')
    check(
      stage,
      'all seven transition bands rendered',
      bands.map(({ band }) => band),
      [0, 1, 2, 3, 4, 5, 6],
    )
    check(
      stage,
      'cleared dialogue on the transition bands and first full battle frame',
      inspectClearedDialogueFrames(draws, [...bands, entry], spec.scene).issue,
      null,
    )
    const audible = rows.find(
      ({ kind, track, context }) =>
        kind === 'music-start' && track === facts.music && context === 'running',
    )
    assert(
      firstAction &&
        audible &&
        entry.order < audible.order &&
        audible.order < firstAction.order &&
        entry.order < menu.order &&
        menu.order < firstAction.order,
      `encounter ${stage} visible input and music boundaries`,
    )
    const commands = rows
      .filter(({ kind }) => kind === 'command')
      .map(({ slot, turn, action: selected }) => ({ slot, turn, ...action(selected, game) }))
    check(
      stage,
      'first round uses an actual defense for all active slots',
      commands.filter(({ turn }) => turn === 1).map(({ slot, kind }) => [slot, kind]),
      facts.roles.map((_, slot) => [slot, 'defend']),
    )
    assert(commands.some(({ turn, kind }) => turn > 1 && kind === 'attack'))
    const outcome = game ? 'won' : 'victory'
    check(stage, 'actual victory', to.result, outcome)
    const { exp, cash } = one('victory-summary-drawn')
    check(stage, 'drawn victory reward', { exp, cash }, facts.reward)
    return {
      team: facts.team,
      field,
      music: audible.track,
      members,
      slots,
      commands,
      reward: { exp, cash },
    }
  })
  const coverage = [trigger, ...finishes].map((start, i) => {
    const end = launches[i] ?? control
    return inspectWorldDialogueCoverage({
      phase: ['palace-guards', 'palace-tree', 'palace-return'][i],
      scene: spec.scene,
      start: start.atMs,
      end: end.atMs,
      expected: sourceDialogueGroups(source.commands, [
        {
          scene: spec.scene,
          first: i === 0 ? spec.disk.entry : source.serial[i - 1].ip + 1,
          last: (source.serial[i]?.ip ?? spec.disk.last + 1) - 1,
        },
      ]),
      actors: spec.watched,
      events,
      draws,
      locale: source.locale,
      background: true,
    })
  })
  return { issues, battles, coverage, movements }
}
