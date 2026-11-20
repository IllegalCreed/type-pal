import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import {
  inspectClearedDialogueFrames,
  sourceDialogueGroups,
} from '../rendered-dialogue-comparison.mjs'
import { inspectWorldDialogueCoverage } from './world-dialogue-coverage.mjs'

export function inspectBaiyuePresentation({ events, draws, boundaries, source, spec, game }) {
  const { trigger, launch, entry, won, control } = boundaries
  const { scene, disk } = spec
  const { finale, commands, locale } = source
  const issues = []
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
  return { issues, coverage, films, rainPictures }
}
