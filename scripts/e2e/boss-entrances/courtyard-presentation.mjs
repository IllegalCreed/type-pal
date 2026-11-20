import { isDeepStrictEqual } from 'node:util'
import {
  inspectClearedDialogueFrames,
  sourceDialogueGroups,
} from '../rendered-dialogue-comparison.mjs'
import { inspectWorldDialogueCoverage } from './world-dialogue-coverage.mjs'

const pose = ({ asset, position, facing, frame }) => [asset, position, facing, frame]
const cast = (actors) =>
  Object.fromEntries(Object.entries(actors).map(([id, row]) => [id, pose(row)]))

export function inspectCourtyardPresentation({ events, draws, boundaries, source, spec }) {
  const { trigger, launch, entry, won, control } = boundaries
  const { scene, disk, owner } = spec
  const coverage = inspectWorldDialogueCoverage({
    phase: 'courtyard-entrance',
    scene,
    start: trigger.atMs,
    end: launch.atMs,
    expected: sourceDialogueGroups(source.commands, [
      { scene, first: disk.entry, last: disk.battle - 1 },
    ]),
    actors: [owner, ...spec.watched],
    events,
    draws,
    locale: source.locale,
    background: true,
  })

  const issues = []
  const firstCaption = coverage.cues[0]?.firstComplete?.atMs ?? launch.atMs
  const world = events.filter(({ kind }) => kind === 'world-drawn')
  const byOrder = new Map(world.map((row) => [row.order, row]))
  const stages = []
  for (const receipt of events) {
    if (
      receipt.kind !== 'world-render' ||
      receipt.scene !== scene ||
      receipt.atMs < firstCaption ||
      receipt.order >= launch.order ||
      receipt.view === null
    )
      continue
    const drawing = byOrder.get(receipt.view)
    if (!drawing?.visible || !receipt.backdrop?.textured || receipt.backdrop.dark) {
      issues.push({ issue: 'courtyard-unbound-render', order: receipt.order })
      continue
    }
    const actors = cast(drawing.actors)
    if (!isDeepStrictEqual(stages.at(-1)?.actors, actors))
      stages.push({ atMs: drawing.atMs, order: receipt.order, actors })
  }

  // 14676–14682 direct the three turns with a native redraw between them.
  const expected = ['up', 'down', 'left', 'up'].map((facing) => [
    349,
    [544, 304],
    facing,
    { down: 0, left: 3, up: 6 }[facing],
  ])
  expected.push(null)
  const actual = stages.map(({ actors }) => actors[owner] ?? null)
  if (!isDeepStrictEqual(actual, expected))
    issues.push({ issue: 'courtyard-missing-drawn-turn', actual, expected })
  const guards = {
    e1694: [347, [528, 280], 'right', 9],
    e1695: [347, [480, 304], 'right', 9],
  }
  const disguise = { e1693: [350, [544, 304], 'right', 9] }
  for (const [index, { actors, order, atMs }] of stages.entries()) {
    const formation =
      index === expected.length - 1
        ? { ...guards, ...disguise }
        : { ...guards, [owner]: expected[index] }
    if (!isDeepStrictEqual(actors, formation))
      issues.push({ issue: 'courtyard-drawn-cast', order, actual: actors, expected: formation })
    if (index >= 2 && Math.abs(atMs - stages[index - 1].atMs - 100) > 45)
      issues.push({ issue: 'courtyard-turn-clock', order, interval: atMs - stages[index - 1].atMs })
  }

  const battleFrames = events.filter(({ kind }) => kind === 'entry-band')
  const cleared = inspectClearedDialogueFrames(draws, [...battleFrames, entry], scene)
  if (cleared.issue)
    issues.push({ issue: 'courtyard-entered-battle-with-dialogue', actual: cleared.issue })
  const stale = world.find(
    ({ order, scene: id, visible }) =>
      id === scene && visible && won.order < order && order < control.order,
  )
  if (stale) issues.push({ issue: 'courtyard-visible-after-victory', order: stale.order })

  const arrival = world.find(
    ({ order, scene: id, visible }) =>
      id === spec.world.handoff.scene && visible && won.order < order,
  )
  const newFrame = arrival && {
    leader: arrival.leader,
    camera: arrival.camera,
    actors: cast(arrival.actors),
    party: arrival.party?.map(({ id, spriteId, world, facing, frame }) => [
      id,
      typeof spriteId === 'number' ? spriteId : source.spriteChunks.get(spriteId),
      world,
      facing,
      frame,
    ]),
  }
  if (!newFrame?.party?.length || arrival.order >= control.order)
    issues.push({ issue: 'courtyard-unbound-first-successor-cast', actual: newFrame })
  const sound = events.find(
    ({ kind, asset, order }) => kind === 'sfx-start' && asset === 213 && won.order < order,
  )
  if (!sound || Math.abs(sound.atMs - control.atMs) > 150)
    issues.push({ issue: 'courtyard-arrival-sound', actual: sound?.atMs ?? null })

  return {
    coverage: [coverage],
    issues,
    stages,
    clearedFrames: cleared.checked,
    arrivalSoundMs: sound && sound.atMs - control.atMs,
    comparable: { turns: stages.map(({ actors }) => actors), newFrame },
  }
}
