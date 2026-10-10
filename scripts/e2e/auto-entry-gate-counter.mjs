import assert from 'node:assert/strict'
import { parseArgs } from 'node:util'
import { readNpcTrace } from './npc-transition-contract.mjs'
import { storyProofPrefix } from './story-presentation-intent.mjs'

// Historical timing diagnostic only: each engine owns its declared transition duration.
// Game's 600ms palette gate is not a Reforge product requirement. The Reforge fade boundary is
// checked through the real native caller; this script cannot certify it from elapsed time alone.
const { values } = parseArgs({
  options: {
    game: { type: 'string' },
    reforge: { type: 'string' },
    scene: { type: 'string', default: 's004' },
    entities: { type: 'string', default: 'e76,e83,e84' },
  },
})
assert(values.game && values.reforge, 'actual Game and Reforge reports required')
const entities = values.entities
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)
assert(entities.length, 'at least one entity required')

const [gameLoaded, reforgeLoaded] = await Promise.all([
  readNpcTrace(values.game),
  readNpcTrace(values.reforge),
])
const traces = {
  game: storyProofPrefix(gameLoaded.trace, gameLoaded.rawTrace),
  reforge: storyProofPrefix(reforgeLoaded.trace, reforgeLoaded.rawTrace),
}

function firstEntry(trace, engine) {
  const ready = trace.events.find(
    (event) =>
      event.kind === 'scene-lifecycle' && event.phase === 'ready' && event.scene === values.scene,
  )
  assert(ready, `${engine} scene ready missing: ${values.scene}`)
  return { sceneVisit: ready.sceneVisit, ready }
}

const entries = {
  game: firstEntry(traces.game, 'game'),
  reforge: firstEntry(traces.reforge, 'reforge'),
}
const results = []
for (const entity of entities) {
  const gameAuto = traces.game.causes.find(
    (event) =>
      event.phase === 'auto-before' &&
      event.actor === Number(entity.slice(1)) &&
      event.scene === values.scene &&
      event.sceneVisit === entries.game.sceneVisit,
  )
  const reforgeAuto = traces.reforge.causes.find(
    (event) =>
      event.phase === 'run-started' &&
      event.author?.channel === 'auto' &&
      event.author.entity === entity &&
      event.author.scene === values.scene &&
      event.sceneVisit === entries.reforge.sceneVisit,
  )
  assert(gameAuto, `Game auto caller missing: ${entity}`)
  assert(reforgeAuto, `Reforge auto caller missing: ${entity}`)
  const gameDelta = gameAuto.atMs - entries.game.ready.atMs,
    reforgeDelta = reforgeAuto.atMs - entries.reforge.ready.atMs
  assert(
    gameDelta >= 600,
    `primary auto caller preceded its 600ms palette gate: ${entity} (${gameDelta}ms)`,
  )
  results.push({ entity, game: gameDelta, reforge: reforgeDelta })
}

console.log(
  JSON.stringify({
    status: 'diagnostic-entry-timing-only',
    scene: values.scene,
    results,
    note: 'Elapsed time does not prove Reforge fade completion. No product parity or acceptance credit.',
  }),
)
