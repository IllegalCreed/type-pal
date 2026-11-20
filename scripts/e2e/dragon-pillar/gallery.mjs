import assert from 'node:assert/strict'
import { gallery } from './contract.mjs'

const pos = ({ x, y, position }) =>
  position
    ? [position.col, position.row, position.height]
    : [(y / 8 + x / 16) / 2, (y / 8 - x / 16) / 2, 0]
const resource = (value) => Number(String(value).replace(/^sprite-/u, ''))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const actualFrame = (draw) => draw.frame ?? draw.index
const beatMs = 100

export function galleryEvidence(interlude, engine) {
  const game = engine === 'game'
  const world = interlude.events.filter(
    (event) =>
      event.kind === 'world-output' &&
      event.scene === 's149' &&
      event.part === 'after-5' &&
      !event.held &&
      !event.cinematic &&
      (game ? event.phase === 'world' : event.opacity < 1),
  )
  const firstFullyLit = world.find((row) =>
    game ? !row.fade || (row.fade.total === 800 && row.fade.progress === 1) : row.opacity === 0,
  )
  assert(firstFullyLit && world.length > 35, `${engine} missing the visible gallery run`)
  const startAt = world[0].at
  const actors = Object.fromEntries(
    gallery.map((id) => {
      const states = []
      const lowerCrop = []
      let fullyLit
      for (const row of world) {
        const actor = row.cast.find((candidate) => candidate.id === id)
        assert(actor, `${engine} gallery cast missing ${id}`)
        const pose = { position: pos(actor), facing: actor.facing }
        const atMs = row.at - startAt
        const draw = row.draws.find((candidate) => candidate.id === id && candidate.intersects)
        if (!same(states.at(-1)?.pose, pose))
          states.push({
            pose,
            atMs,
            frames: [],
            fadingOut: game && row.script?.ip === 24901 ? (row.fade?.progress ?? null) : null,
          })
        if (row === firstFullyLit) fullyLit = { ...pose, atMs }
        if (!draw) continue
        // Game culls NPCs using blitY + 4. Preserve excluded bottom-edge draws as facts, but compare
        // the shared display region. This is neither a world-coordinate tolerance nor a cast filter.
        if (draw.y + 4 >= 200) {
          if (
            !lowerCrop.some(
              (entry) => same(entry.position, pose.position) && entry.frame === actualFrame(draw),
            )
          )
            lowerCrop.push({
              atMs,
              position: pose.position,
              frame: actualFrame(draw),
              blit: [draw.x, draw.y, draw.width, draw.height],
            })
        } else {
          const sourceFrame = [resource(draw.sprite), actualFrame(draw)]
          if (!same(states.at(-1).frames.at(-1), sourceFrame))
            states.at(-1).frames.push(sourceFrame)
        }
      }
      assert(
        states.some(({ frames }) => frames.length),
        `${engine} has no onscreen draw for ${id}`,
      )
      const foreground = interlude.events.filter(
        (e) =>
          e.kind === 'foreground' &&
          e.scene === 's149' &&
          e.after === 'after-5' &&
          e.path?.includes('tracks') &&
          e.target?.entity === id &&
          e.op === 'nudgeEntity',
      )
      const automatic = interlude.events.filter(
        (e) => e.kind === 'auto-op' && e.scene === 's149' && (e.id === id || e.self?.entity === id),
      )
      return [
        id,
        { states, fullyLit, lowerCrop, foreground: foreground.length, automatic: automatic.length },
      ]
    }),
  )
  return { actors, firstOutputAt: startAt, firstFullyLitAt: firstFullyLit.at }
}

export function compareGallery(game, reforge) {
  const findings = []
  const edgeDifferences = []
  for (const id of gallery) {
    const expected = game.actors[id]
    const actual = reforge.actors[id]
    const fail = (field, game, reforge) =>
      findings.push({ type: 'gallery-actor', scene: 's149', id, field, game, reforge })
    if (actual.automatic || !actual.foreground)
      fail('foreground-caller', 'one-shot foreground choreography', {
        foreground: actual.foreground,
        automatic: actual.automatic,
      })
    const { atMs: expectedRevealAt, ...expectedReveal } = expected.fullyLit
    const { atMs: actualRevealAt, ...actualReveal } = actual.fullyLit
    if (!same(expectedReveal, actualReveal) || Math.abs(expectedRevealAt - actualRevealAt) > beatMs)
      fail('first-full-reveal-pose', expected.fullyLit, actual.fullyLit)

    const expectedStates = expected.states
    const actualStates = actual.states
    const length = Math.min(expectedStates.length, actualStates.length)
    const route = expectedStates
      .slice(0, length)
      .findIndex(({ pose }, index) => !same(pose, actualStates[index].pose))
    const timing = expectedStates
      .slice(0, length)
      .findIndex(({ atMs }, index) => Math.abs(atMs - actualStates[index].atMs) > beatMs)
    const draw = expectedStates
      .slice(0, length)
      .findIndex(({ frames }, index) => !same(frames, actualStates[index].frames))
    for (const [field, index] of [
      ['ordered-positions-and-facing', route],
      ['movement-timing', timing],
      ['rendered-frame-order-at-pose', draw],
    ])
      if (index >= 0) fail(field, expectedStates[index], actualStates[index])
    const tail = expectedStates.slice(length)
    // SDL's final world update can run as its last two palette levels are presented; Reforge's
    // foreground cue clock stops all eight tracks under black. No extra non-dark movement qualifies.
    if (
      actualStates.length > expectedStates.length ||
      tail.length > 2 ||
      tail.some(({ fadingOut }) => fadingOut === null || fadingOut < 31 / 32)
    )
      fail('unpaired-visible-tail', tail, actualStates.slice(length))
    if (tail.length || actual.lowerCrop.length)
      edgeDifferences.push({ id, terminalPaletteSteps: tail, lowerViewportRows: actual.lowerCrop })
  }
  return { findings, edgeDifferences }
}
