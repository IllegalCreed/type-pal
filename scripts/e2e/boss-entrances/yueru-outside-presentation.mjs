import { isDeepStrictEqual } from 'node:util'

export function inspectOutsidePresentation(
  { engine, events },
  source,
  { trigger, launch, won, control },
) {
  const issues = []
  const equal = (rule, actual, expected) => {
    if (!isDeepStrictEqual(actual, expected)) issues.push({ rule, actual, expected })
  }
  const visible = (frame) =>
    frame.kind === 'world-drawn' &&
    frame.colors.some(([red, green, blue]) => Math.max(red, green, blue) > 0)
  const drawn = events.filter(visible)
  const before = drawn.filter(({ order }) => order > trigger.order && order < launch.order)
  const after = drawn.filter(({ order }) => order > won.order && order < control.order)
  const phases = Array.from({ length: 6 }, (_, step) => [
    [912 + (step + 1) * 4, 1032 - (step + 1) * 2],
    [7, 6, 8, 6][step % 4],
    'up',
  ])
  equal(
    'Lin Yueru approaches in six distinct drawings',
    moved(before, 'e397', [912, 1032]).map(({ pose }) => pose),
    phases,
  )

  const first = after[0]
  equal(
    'first post-victory camera and leader',
    [first?.camera, first?.leader],
    [
      [768, 912],
      [928, 1024],
    ],
  )
  const exit = {}
  for (const actor of source.outsideActors) {
    const { id, asset, position, frame, facing } = actor
    const pose = first?.actors[id]
    equal(
      `${id} in the first world drawing after victory`,
      [pose?.asset, pose?.position, pose?.frame, pose?.facing],
      [asset, position, frame, facing],
    )
    if (actor.stationary) {
      equal(
        `${id} keeps its bound pose during the return sequence`,
        after.every(({ actors }) =>
          isDeepStrictEqual([actors[id]?.position, actors[id]?.frame], [position, frame]),
        ),
        true,
      )
      continue
    }
    const expected = Array.from({ length: 16 }, (_, step) => {
      const dx = 4 * Math.min(step + 1, 4) + 8 * Math.max(step - 3, 0)
      return [[position[0] + dx, position[1] + dx / 2], [10, 9, 11, 9][step % 4], 'right']
    })
    const steps = moved(after, id, position)
    // In Game the final automatic step and hide commit in the same world tick.
    const visibleSteps = engine === 'game' ? expected.slice(0, -1) : expected
    equal(
      `${id} plays the full visible departure`,
      steps.map(({ pose }) => pose),
      visibleSteps,
    )
    equal(`${id} is hidden after the exit`, after.at(-1)?.actors[id], undefined)
    const lastPaint = events.findLast(
      ({ kind, surface, order }) =>
        kind === 'paint' && surface === 'world' && order > won.order && order < control.order,
    )
    const terminal = lastPaint?.actors.find((actor) => actor.id === id)
    const [x, y] = expected.at(-1)[0]
    const finalCell = [(x / 16 + y / 8) / 2, (y / 8 - x / 16) / 2, 0]
    equal(
      `${id} commits the sixteenth step before leaving`,
      [terminal?.position, terminal?.state],
      [finalCell, 0],
    )
    const movingMs = steps.at(-1)?.atMs - steps[0]?.atMs
    equal(
      `${id} takes one world beat for each visible step`,
      Math.abs(movingMs - 100 * (visibleSteps.length - 1)) <= 120,
      true,
    )
    exit[id] = { movingMs, finalCell, steps }
  }
  const partyAt = (from, until, last = false) => {
    const paints = events.filter(
      ({ kind, surface, geometry, order }) =>
        kind === 'paint' && surface === 'world' && geometry && order > from && order < until,
    )
    const geometry = (last ? paints.at(-1) : paints[0])?.geometry
    return (
      geometry && {
        camera: geometry.camera,
        party: [...geometry.party]
          .sort((a, b) => a.slot - b.slot)
          .map(({ id, slot, spriteId, frame, world }) => [
            id,
            slot,
            typeof spriteId === 'string' ? source.spriteChunks.get(spriteId) : spriteId,
            frame,
            world,
          ]),
      }
    )
  }
  return {
    issues,
    movement: exit,
    contact: partyAt(trigger.order, launch.order),
    beforeBattle: partyAt(trigger.order, launch.order, true),
    return: partyAt(won.order, control.order),
  }
}

function moved(frames, id, start) {
  const changes = []
  let last = start
  for (const { actors, atMs } of frames) {
    const actor = actors[id]
    if (!actor || isDeepStrictEqual(actor.position, last)) continue
    last = actor.position
    changes.push({ atMs, pose: [actor.position, actor.frame, actor.facing] })
  }
  return changes
}
