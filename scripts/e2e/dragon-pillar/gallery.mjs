import assert from 'node:assert/strict'
import { gallery } from './contract.mjs'

const pos = ({ x, y, position }) =>
  position
    ? [position.col, position.row, position.height]
    : [(y / 8 + x / 16) / 2, (y / 8 - x / 16) / 2, 0]
const resource = (value) => Number(String(value).replace(/^sprite-/u, ''))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

export function galleryEvidence(interlude, engine) {
  const world = interlude.events.filter(
    (event) =>
      event.kind === 'world-output' &&
      event.scene === 's149' &&
      event.part === 'after-5' &&
      !event.held &&
      !event.cinematic &&
      (engine === 'game' ? event.phase === 'world' : event.opacity < 0.999),
  )
  const firstFullyLit = world.find((row) => (engine === 'game' ? !row.fade : row.opacity <= 0.001))
  assert(firstFullyLit && world.length > 35, `${engine} missing the visible gallery run`)
  const visibleTurns = (rows) =>
    rows.reduce((result, entry) => {
      if (result.at(-1)?.facing !== entry.facing) result.push(entry)
      return result
    }, [])
  const actors = Object.fromEntries(
    gallery.map((id) => {
      const at = (row) => {
        const state = row.cast.find((actor) => actor.id === id)
        const draw = row.draws.find((actor) => actor.id === id && actor.intersects)
        assert(state, `${engine} gallery cast missing ${id}`)
        return {
          tick: row.tick - world[0].tick,
          at: row.at,
          position: pos(state),
          facing: state.facing,
          frame: draw?.frame ?? draw?.index ?? null,
          resource: draw ? resource(draw.sprite) : null,
        }
      }
      const samples = world.map(at),
        fullyLit = at(firstFullyLit),
        visible = samples.filter(({ frame }) => frame !== null)
      assert(visible.length, `${engine} has no onscreen draw for ${id}`)
      const frames = [...new Set(visible.map(({ frame }) => frame))].sort((a, b) => a - b)
      const moves = visibleTurns(visible).map(({ tick, position, facing }) => ({
        tick,
        position,
        facing,
      }))
      return [
        id,
        {
          fullyLit,
          first: visible[0],
          last: visible.at(-1),
          frames,
          moves,
          samples,
          automatic: interlude.events.filter(
            (e) =>
              e.kind === 'auto-op' && e.scene === 's149' && (e.id === id || e.self?.entity === id),
          ).length,
        },
      ]
    }),
  )
  return { actors, firstOutputAt: world[0].at, firstFullTick: firstFullyLit.tick - world[0].tick }
}

export function compareGallery(game, reforge) {
  const findings = []
  for (const id of gallery) {
    const expected = game.actors[id],
      actual = reforge.actors[id]
    const fail = (field, left, right) =>
      findings.push({ type: 'gallery-actor', scene: 's149', id, field, game: left, reforge: right })
    if (actual.automatic)
      fail('foreground-caller', 'one-shot foreground choreography', actual.automatic)
    // Browser render counts vary. Path corners, relative beats and the frames actually shown do not
    // become interchangeable merely because a different command expresses the movement.
    if (
      !same(expected.fullyLit.position, actual.fullyLit.position) ||
      expected.fullyLit.facing !== actual.fullyLit.facing
    )
      fail('first-full-reveal-pose', expected.fullyLit, actual.fullyLit)
    if (!same(expected.frames, actual.frames))
      fail('visible-resource-frames', expected.frames, actual.frames)
    const concise = ({ facing, position }) => ({ facing, position })
    if (
      !same(expected.moves.map(concise), actual.moves.map(concise)) ||
      expected.moves.some(({ tick }, i) => Math.abs(tick - actual.moves[i].tick) > 1)
    )
      fail('visible-route-and-turns', expected.moves, actual.moves)
    if (
      Math.abs(expected.last.tick - actual.last.tick) > 1 ||
      !same(expected.last.position, actual.last.position)
    )
      fail('last-visible-beat', expected.last, actual.last)
  }
  return findings
}
