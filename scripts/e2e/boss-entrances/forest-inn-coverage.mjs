import assert from 'node:assert/strict'
import { sourceDialogueGroups } from '../rendered-dialogue-comparison.mjs'
import { inspectWorldDialogueCoverage } from './world-dialogue-coverage.mjs'

export function readForestInnCoverage(commands, spec, originalInn) {
  const { scene, disk, sceneRoute } = spec
  const inn = sceneRoute.visits[0]
  const grouped = (id, ...windows) =>
    sourceDialogueGroups(
      commands,
      windows.map((window) => ({ scene: id, ...window })),
    )
  assert.deepEqual([commands[inn.start].op, commands[inn.start].messageIndex], ['showDialog', 5863])
  assert.deepEqual([commands[16798].opcode, commands[16798].operands], [0x24, [2057, 16784, 0]])
  assert.deepEqual([commands[16856].opcode, commands[16856].operands], [0x09, [5, 0, 0]])
  assert.equal(commands[17008].opcode, 5)

  const innActors = new Set([inn.owner])
  for (const { opcode, operands } of commands.slice(inn.start, 16934)) {
    if (![0x16, 0x24, 0x49].includes(opcode) || (opcode === 0x49 && operands[1] === 0)) continue
    const id = operands[0] - 1
    if (originalInn.eventObjects.some((actor) => actor.id === id && actor.spriteNum))
      innActors.add(`e${id}`)
  }
  return {
    innScene: inn.scene,
    innActors: [...innActors],
    seating: [
      { actor: inn.owner, start: 16779, finish: 16779, steps: 16 },
      { actor: 'e2056', start: 16784, finish: 16785, steps: 22 },
    ].map((track) => {
      const actor = originalInn.eventObjects.find(({ id }) => `e${id}` === track.actor)
      const {
        opcode,
        operands: [x, y, half],
      } = commands[track.finish]
      assert([0x10, 0x11].includes(opcode))
      return {
        ...track,
        origin: [actor.x, actor.y],
        destination: [x * 32 + half * 16, y * 16 + half * 8],
      }
    }),
    inn: grouped(inn.scene, { first: inn.start, last: inn.leave - 2, initialSlot: 'top' }),
    ambush: grouped(scene, {
      first: sceneRoute.return.start,
      last: disk.battle - 1,
      initialSlot: 'top',
    }),
    aftermath: grouped(scene, {
      first: disk.battle + 1,
      last: spec.world.handoff.select,
      initialSlot: 'top',
    }),
    return: grouped(
      inn.scene,
      { first: spec.world.handoff.start, last: 17008, initialSlot: 'top' },
      { first: 17009, last: 17013, initialSlot: 'top' },
    ),
  }
}

export function inspectForestInnCoverage({ events, draws, source, facts, bounds, entries }) {
  const [, inn, ambush, returned] = entries
  const { launch, won } = bounds
  const until = events.findLast(({ kind }) => kind === 'world-control')?.atMs ?? events.at(-1)?.atMs
  const inspect = (phase, scene, start, end, actors, background) =>
    inspectWorldDialogueCoverage({
      phase,
      scene,
      start,
      end,
      expected: facts[phase],
      actors,
      background,
      events,
      draws,
      locale: source.locale,
    })
  const visit = inspect('inn', facts.innScene, inn?.atMs, ambush?.atMs, facts.innActors, true)
  const first = visit.cues.find(({ cue }) => cue === 'dlg.5863')
  const seated = visit.cues.find(({ cue }) => cue === 'dlg.5865')
  visit.seating = facts.seating.map(({ actor, origin, destination, steps, start, finish }) => {
    const positions = []
    for (const event of events) {
      if (
        event.kind !== 'world-drawn' ||
        event.scene !== facts.innScene ||
        event.atMs < first?.firstComplete?.atMs ||
        event.atMs >= seated?.firstComplete?.atMs
      )
        continue
      const pose = event.actors[actor]
      if (
        !pose ||
        pose.position.join() === origin.join() ||
        pose.position.join() === positions.at(-1)?.position.join()
      )
        continue
      positions.push({
        order: event.order,
        position: pose.position,
        asset: pose.asset,
        ...(pose.position.join() !== destination.join() && {
          facing: pose.facing,
          frame: pose.frame,
        }),
      })
    }
    if (positions.length !== steps || positions.at(-1)?.position.join() !== destination.join())
      visit.issues.push({
        issue: 'incomplete-seating-walk',
        actor,
        start,
        finish,
        steps,
        destination,
        positions,
      })
    return { actor, positions }
  })
  return [
    visit,
    inspect('ambush', ambush?.scene, ambush?.atMs, launch.atMs),
    inspect('aftermath', ambush?.scene, won.atMs, returned?.atMs),
    inspect('return', facts.innScene, returned?.atMs, until),
  ]
}
