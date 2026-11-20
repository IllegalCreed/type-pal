import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import {
  inspectClearedDialogueFrames,
  sourceDialogueGroups,
} from '../rendered-dialogue-comparison.mjs'
import { inspectWorldDialogueCoverage } from './world-dialogue-coverage.mjs'

function inspectPalaceCast(events, trigger, launch, spec, source, issues) {
  const draws = new Map(
    events.filter(({ kind }) => kind === 'world-drawn').map((row) => [row.order, row]),
  )
  const actorIds = source.finale.roster.map(({ id }) => `e${id}`)
  const views = events.flatMap((event) => {
    if (
      event.kind !== 'world-render' ||
      event.scene !== spec.scene ||
      event.view === null ||
      event.order <= trigger.order ||
      event.order >= launch.order
    )
      return []
    const view = draws.get(event.view)
    if (!view || !event.backdrop || !Array.isArray(view.party)) {
      issues.push({ issue: 'baiyue-unbound-world-render', order: event.order })
      return []
    }
    const unexpected = Object.keys(view.actors).filter((id) => !actorIds.includes(id))
    if (unexpected.length)
      issues.push({ issue: 'baiyue-unbound-world-actor', order: event.order, ids: unexpected })
    return event.backdrop.dark ? [] : [view]
  })
  assert(views.length > 0, 'baiyue prelude actually presented')
  const changes = (read) => {
    const steps = []
    for (const view of views) {
      const value = read(view)
      if (!steps.length || !isDeepStrictEqual(value, steps.at(-1).value))
        steps.push({ atMs: view.atMs, order: view.order, value })
    }
    return steps
  }

  const party = changes(({ party, camera }) => [
    party.map(({ id, spriteId, world, frame }) => [
      id,
      typeof spriteId === 'number' ? spriteId : source.spriteChunks.get(spriteId),
      world,
      frame,
    ]),
    camera,
  ])
  // The physical contact frame may still be presented before the foreground's first world beat.
  const first = party.findIndex(
    ({ value: [members] }) => !isDeepStrictEqual(members[0]?.[2], [1120, 1376]),
  )
  const route = party.slice(first < 0 ? party.length : first)
  const expected = [
    [1136, 1368, 6],
    [1136, 1360, 8],
    [1120, 1360, 2],
    [1104, 1368, 0],
  ].map(([x, y, frame]) => [[['li-xiaoyao', 2, [x, y], frame]], [x - 160, y - 112]])
  if (
    !isDeepStrictEqual(
      route.map(({ value }) => value),
      expected,
    )
  )
    issues.push({ issue: 'baiyue-party-opening-track', actual: route, expected })
  for (const [i, row] of route.slice(1).entries())
    if (Math.abs(row.atMs - route[i].atMs - 100) > 55)
      issues.push({
        issue: 'baiyue-party-opening-clock',
        order: row.order,
        interval: row.atMs - route[i].atMs,
      })

  const actors = actorIds.map((id) => [
    id,
    changes(({ actors }) => {
      const pose = actors[id]
      return pose ? [pose.asset, pose.position, pose.facing, pose.frame] : null
    }),
  ])
  return { receipts: views.length, party, actors }
}

export function inspectBaiyuePresentation({ events, draws, boundaries, source, spec, game }) {
  const { trigger, launch, entry, won, control } = boundaries
  const { scene, disk } = spec
  const { finale, commands, locale } = source
  const issues = []
  const palace = inspectPalaceCast(events, trigger, launch, spec, source, issues)
  const check = (issue, actual, expected) => {
    if (!isDeepStrictEqual(actual, expected)) issues.push({ issue, actual, expected })
  }
  const actors = finale.roster.map(({ id }) => `e${id}`)
  const coverage = [
    ['palace-entrance', trigger, launch, disk.entry, disk.battle - 1, true],
    ['ending-film-dialogue', won, control, disk.battle + 1, finale.ip - 1, false],
  ].map(([phase, start, end, first, last, background]) =>
    inspectWorldDialogueCoverage({
      phase,
      scene,
      start: start.atMs,
      end: end.atMs,
      expected: sourceDialogueGroups(commands, [{ scene, first, last }]),
      actors: background ? actors : [],
      events,
      draws,
      locale,
      background,
    }),
  )
  const bands = events.filter(({ kind }) => kind === 'entry-band')
  check(
    'baiyue-entered-battle-with-dialogue',
    inspectClearedDialogueFrames(draws, [...bands, entry], scene).issue,
    null,
  )

  const opening = events.findLast(
    ({ kind, order, visible }) => kind === 'world-drawn' && visible && order < trigger.order,
  )
  const { id, x, y, spriteNum } = finale.roster[0]
  const activated = opening?.actors?.[`e${id}`]
  check('baiyue-predecessor-actor', activated && [activated.asset, activated.position], [
    spriteNum,
    [x, y],
  ])

  const plays = finale.films.map(({ ip, index }) => {
    const row = events.find(
      ({ kind, op, ip: address, path }) =>
        kind === 'script-op' &&
        (game
          ? address === ip
          : op === 'playFrameAnimation' && isDeepStrictEqual(path, ['initial', index])),
    )
    assert(row && row.order > won.order && row.order < control.order, `ending film at ${ip}`)
    return row
  })
  const rainPictures = []
  const films = finale.films.map(({ start, end, ip }, index) => {
    const play = plays[index]
    const next = plays[index + 1] ?? control
    const stage = events.filter(
      ({ kind, order }) => kind === 'rain-draw' && play.order < order && order < next.order,
    )
    const shown = stage.filter(({ asset, matte }) => asset === 9 && matte <= 0.05)
    const frames = shown.flatMap(({ frame }, n) => (shown[n - 1]?.frame === frame ? [] : [frame]))
    const expected = Array.from({ length: end - start + 1 }, (_, i) => start + i)
    if (!isDeepStrictEqual(frames, expected))
      issues.push({ issue: 'baiyue-film-frame-sequence', ip, actual: frames, expected })
    const last = shown.at(-1)
    const bad = stage.find(
      ({ order, asset, matte }) => order >= shown[0]?.order && asset !== 9 && matte < 1,
    )
    if (bad)
      issues.push({ issue: 'baiyue-world-flashed-between-film-and-dialogue', ip, actual: bad })
    if (!game) {
      const dialogue = stage.filter(({ caption }) => caption)
      if (!dialogue.length || dialogue.some(({ asset, frame }) => asset !== 9 || frame !== end))
        issues.push({ issue: 'baiyue-film-not-held-under-dialogue', ip, actual: dialogue[0] })
    }
    if (shown[0] && last) {
      rainPictures.push({
        id: `baiyue-film-${index + 1}`,
        startAtMs: shown[0].atMs + 20,
        endAtMs: Math.min(last.atMs + 95, next.atMs - 25),
        sample: 'picture',
        minLitFraction: 0.04,
      })
    }
    return { ip, frames, first: shown[0], last }
  })
  return { issues, coverage, palace, films, rainPictures }
}
