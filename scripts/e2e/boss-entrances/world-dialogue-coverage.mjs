import { isDeepStrictEqual } from 'node:util'
import { compareRenderedDialogue } from '../rendered-dialogue-comparison.mjs'

const text = (lines) => lines.join('').replace(/\s/gu, '')
const hasDialogue = (slots) =>
  slots.some(({ portrait, speaker, lines }) => portrait || speaker || text(lines))

function cueFrames(draws, row) {
  const full = text(row.rows.map(({ text: line }) => line))
  const start = draws.findIndex(({ atMs }) => atMs === row.firstComplete?.atMs)
  if (start < 0) return null
  const end = draws.findIndex(
    ({ slots }, index) => index > start && !slots.some((slot) => text(slot.lines) === full),
  )
  return {
    from: draws[start],
    until: draws[end],
  }
}

function castAt(frame, actors) {
  const [left, top] = frame.camera
  return Object.fromEntries(
    actors.map((id) => {
      const actor = frame.actors[id]
      if (!actor) return [id, null]
      const [x, y, w, h] = actor.rect
      if (x + w <= left || y + h <= top || x >= left + 320 || y >= top + 200) return [id, null]
      return [id, [actor.asset, actor.position, actor.facing, actor.frame]]
    }),
  )
}

function readCues(proof, draws, world, actors, frames) {
  return (proof.checked ?? []).map((row) => {
    const time = cueFrames(draws, row)
    const views = []
    if (time && actors.length) {
      const { from, until } = time
      const painted = frames.length
        ? frames.filter(
            ({ renderId }) => renderId >= from.renderId && renderId < (until?.renderId ?? Infinity),
          )
        : [
            world.findLast(({ atMs }) => atMs <= from.atMs),
            ...world.filter(({ atMs }) => atMs > from.atMs && atMs < (until?.atMs ?? Infinity)),
          ]
      for (const frame of painted) {
        if (!frame) continue
        const cast = castAt(frame, actors)
        const view = { leader: frame.leader, camera: frame.camera, cast }
        if (!isDeepStrictEqual(view, views.at(-1)?.view))
          views.push({
            order: frame.order,
            atMs: frame.atMs,
            ...(frame.renderId !== undefined && { renderId: frame.renderId }),
            view,
          })
      }
    }
    return {
      cue: row.rows[0].id,
      source: row.rows.map(({ ip }) => ip),
      firstComplete: row.firstComplete,
      views,
    }
  })
}

function dialogueSpans(draws, endAtMs) {
  const spans = []
  let start
  for (const draw of draws) {
    if (hasDialogue(draw.slots)) start ??= draw.atMs
    else if (start !== undefined) {
      spans.push({ startAtMs: start, endAtMs: draw.atMs })
      start = undefined
    }
  }
  if (start !== undefined) spans.push({ startAtMs: start, endAtMs })
  return spans
}

function inspectWorldFrames(frames, world, draws, end) {
  const spans = dialogueSpans(draws, end)

  const issues = []
  if (!frames.length)
    return { issues: [{ issue: 'missing-continuous-world-frames' }], spans, checkedFrames: 0 }
  const gap = frames.find((frame, i) => i > 0 && frame.renderId !== frames[i - 1].renderId + 1)
  if (gap) issues.push({ issue: 'missing-submitted-world-frame', at: gap })
  const views = new Map(world.map((frame) => [frame.order, frame]))
  const dialogue = frames.filter((frame) => frame.dialogue)
  if (!dialogue.length) issues.push({ issue: 'missing-dialogue-on-submitted-world-frames' })
  for (const span of spans) {
    if (!dialogue.some(({ atMs }) => atMs >= span.startAtMs && atMs < span.endAtMs))
      issues.push({ issue: 'missing-native-dialogue-span', ...span })
  }
  const frameIds = new Set(dialogue.map(({ renderId }) => renderId))
  const missingDraw = draws.find(
    ({ renderId, slots }) => hasDialogue(slots) && !frameIds.has(renderId),
  )
  if (missingDraw) issues.push({ issue: 'unbound-dialogue-draw', at: missingDraw })
  const firstBad = dialogue.find(({ backdrop, view }) => !backdrop || !views.has(view))
  if (firstBad) issues.push({ issue: 'missing-painted-dialogue-background', at: firstBad })
  const hidden = dialogue.find(({ backdrop }) => backdrop && (backdrop.dark || !backdrop.textured))
  if (hidden) issues.push({ issue: 'dialogue-background-hidden', at: hidden })
  const renderedSpans = []
  let previous
  for (const frame of frames) {
    if (frame.dialogue) {
      if (!previous?.dialogue)
        renderedSpans.push({ startAtMs: frame.atMs, endAtMs: frame.atMs + 1 })
      else renderedSpans.at(-1).endAtMs = frame.atMs + 1
    }
    previous = frame
  }
  return { issues, spans: renderedSpans, checkedFrames: dialogue.length }
}

/** Source cue groups are the denominator. Independent world draws bind the visible poses. */
export function inspectWorldDialogueCoverage({
  phase,
  scene,
  start,
  end,
  expected,
  actors = [],
  events,
  draws,
  locale,
  background,
}) {
  const inWindow = (row) => row.scene === scene && row.atMs >= start && row.atMs < end
  const dialogue = draws.filter(inWindow)
  const carriesView = (event) => event.kind === 'world-drawn' && event.scene === scene
  const entering =
    background && events.findLast((event) => carriesView(event) && event.atMs < start)
  const world = events.filter((event) => carriesView(event) && inWindow(event))
  if (entering) world.unshift(entering)
  const proof = compareRenderedDialogue(dialogue, expected, locale)
  const issues = [...proof.findings]
  const frames = background
    ? events.filter((event) => event.kind === 'world-render' && inWindow(event))
    : []
  const byOrder = new Map(world.map((frame) => [frame.order, frame]))
  const visibleFrames = frames.flatMap(({ view, backdrop, renderId, atMs, dialogue }) => {
    const drawing = byOrder.get(view)
    return dialogue && drawing && backdrop?.textured && !backdrop.dark
      ? [{ ...drawing, renderId, atMs }]
      : []
  })
  const cues = readCues(
    proof,
    dialogue,
    world.filter(({ visible }) => visible),
    actors,
    visibleFrames,
  )
  for (const cue of cues)
    if (actors.length && cue.firstComplete && !cue.views.length)
      issues.push({ issue: 'missing-key-actor-draw', cue: cue.cue })
  let backdrop
  if (background) {
    backdrop = inspectWorldFrames(frames, world, dialogue, end)
    issues.push(...backdrop.issues)
  }
  return {
    phase,
    scene,
    expectedPages: expected.length,
    cues,
    backdrop,
    issues: issues.map((issue) => ({ phase, scene, ...issue })),
  }
}

export function compareWorldDialogueCast(game, reforge) {
  const issues = []
  for (const [index, expected] of game.cues.entries()) {
    const actual = reforge.cues[index]
    if (!expected.views.length || !actual?.views.length) continue
    if (
      !isDeepStrictEqual(
        expected.views.map(({ view }) => view),
        actual.views.map(({ view }) => view),
      )
    )
      issues.push({
        phase: game.phase,
        scene: game.scene,
        issue: 'different-drawn-dialogue-formation',
        cue: expected.cue,
        expected: expected.views,
        actual: actual.views,
      })
  }
  return issues
}
