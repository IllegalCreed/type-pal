import { isDeepStrictEqual } from 'node:util'

const fighters = {
  s230: ['e4132', 'e4133', 'e4134', 'e4135', 'e4136', 'e4137'],
  s243: ['e4295', 'e4296', 'e4297', 'e4298', 'e4299'],
}
const villageWalkers = ['e4312', 'e4313', 'e4314', 'e4315']
const villageLookouts = ['e4316', 'e4317', 'e4319', 'e4322', 'e4323', 'e4324']
const villageAnimals = ['e4325', 'e4326', 'e4327', 'e4328']

function location({ order, atMs, renderId }, frame) {
  return { order, atMs, renderId, view: frame?.order, camera: frame?.camera }
}

function actorChanges(paints, actor) {
  const changes = []
  for (const { frame, render } of paints) {
    const draw = frame.actors[actor]
    const pose = draw ? [draw.asset, draw.position, draw.facing, draw.frame] : null
    if (!isDeepStrictEqual(changes.at(-1)?.pose, pose))
      changes.push({ ...location(render, frame), pose })
  }
  return changes
}

export function inspectRainRouteFrames({ events, hooks, launch, source, issues }) {
  const byOrder = new Map(events.map((event) => [event.order, event]))
  return hooks.map(({ scene, order, atMs, start, stage }, index) => {
    const visit = index + 1
    const end = hooks[index + 1] ?? launch
    const issue = (issue, details) => issues.push({ issue, visit, scene, ...details })
    const renders = events.filter(
      (event) =>
        event.kind === 'world-render' &&
        event.scene === scene &&
        order < event.order &&
        event.order < end.order,
    )
    const hole = renders.find((row, i) => i && row.renderId !== renders[i - 1].renderId + 1)
    if (hole) issue('rain-route-missing-presented-frame', { actual: location(hole) })
    const paints = []
    const sourceCast = new Map(
      source.rainRouteActors[scene].map((actor) => [`e${actor.id}`, actor]),
    )
    for (const render of renders) {
      if (render.view === null) continue
      const frame = byOrder.get(render.view)
      if (
        !frame ||
        frame.kind !== 'world-drawn' ||
        frame.scene !== scene ||
        frame.order >= render.order ||
        !frame.actors ||
        !Array.isArray(frame.party) ||
        !render.backdrop
      ) {
        issue('rain-route-unbound-presented-world', { actual: location(render, frame) })
        break
      }
      if (render.backdrop.dark) continue
      paints.push({ frame, render })
    }
    if (!paints.length) issue('rain-route-missing-visible-world', { at: { order, atMs } })

    const actors = Object.fromEntries([...sourceCast].map(([id]) => [id, actorChanges(paints, id)]))
    const unbound = paints.find(({ frame }) =>
      Object.keys(frame.actors).some((actor) => !sourceCast.has(actor)),
    )
    if (unbound)
      issue('rain-route-actor-without-source', {
        actual: location(unbound.render, unbound.frame),
        actors: Object.keys(unbound.frame.actors).filter((actor) => !sourceCast.has(actor)),
      })
    for (const [actor, original] of sourceCast) {
      const drawn = actors[actor].filter(({ pose }) => pose)
      const wrong = drawn.find(
        ({ pose: [sprite, position, facing, frame] }) =>
          sprite !== original.spriteNum ||
          !position.every(Number.isFinite) ||
          !['down', 'left', 'up', 'right'].includes(facing) ||
          !Number.isInteger(frame) ||
          frame < 0,
      )
      if (wrong)
        issue('rain-route-actor-pose', { actor, actual: wrong, expectedSprite: original.spriteNum })
    }
    for (const actor of fighters[scene] ?? []) {
      const steps = actors[actor].filter(({ pose }) => pose)
      const faded = actors[actor].findLast(({ pose }) => pose === null)
      const duration = (faded?.atMs ?? paints.at(-1)?.render.atMs) - steps.at(-1)?.atMs
      const wrong = steps.find(
        ({ pose }) => !isDeepStrictEqual(pose[1], steps[0].pose[1]) || pose[2] !== 'down',
      )
      if (steps.length < 4 || !Number.isFinite(duration) || duration > 1200 || wrong)
        issue('rain-fighter-action-stopped', {
          actor,
          first: steps[0],
          last: steps.at(-1),
          until: faded,
          transitions: steps.length,
          ...(wrong && { actual: wrong }),
        })
    }
    if (scene === 's244') {
      for (const actor of [...villageWalkers, ...villageLookouts, ...villageAnimals]) {
        const steps = actors[actor].filter(({ pose }) => pose)
        const positions = new Set(steps.map(({ pose }) => String(pose[1])))
        const frames = new Set(steps.map(({ pose }) => pose[3]))
        const moves = !villageLookouts.includes(actor)
        if (frames.size < 2 || (moves && positions.size < 2))
          issue('rain-village-actor-action-missing', {
            actor,
            first: steps[0],
            last: steps.at(-1),
            positions: positions.size,
            frames: frames.size,
          })
      }
      const rain = actorChanges(paints, 'e4329')
      const visible = rain.filter(({ pose }) => pose)
      const wrong = visible.find(({ pose, atMs }, i) => {
        if (!i) return !isDeepStrictEqual(pose, [610, [672, 1380], 'down', 2])
        const previous = visible[i - 1]
        return (
          pose[1][0] !== 672 ||
          pose[1][1] !== previous.pose[1][1] + 2 ||
          pose[3] !== (previous.pose[3] + 1) % 10 ||
          (i > 1 && Math.abs(atMs - previous.atMs - 100) > 55)
        )
      })
      const absent = rain.find(({ pose }) => !pose)
      if (visible.length < 149 || wrong || absent)
        issue('rain-village-effect-desynchronized', {
          actor: 'e4329',
          checked: visible.length,
          actual: wrong ?? absent,
        })
    }
    if (scene === 's231') {
      const wrong = paints.find(({ frame }) => {
        const linger = frame.party.find(({ id }) => id === 'zhao-linger')
        return (
          !linger ||
          (source.spriteChunks.get(linger.spriteId) ?? linger.spriteId) !==
            source.rainAppearance.native.sprite
        )
      })
      if (wrong)
        issue('altar-party-costume', {
          actor: 'zhao-linger',
          actual: { ...location(wrong.render, wrong.frame), party: wrong.frame.party },
          expectedSprite: source.rainAppearance.native.sprite,
        })
      const speech = paints.filter(
        ({ frame, render }) => render.dialogue && isDeepStrictEqual(frame.leader, [896, 1248]),
      )
      const moving = speech.find(({ frame }) => frame.party.some(({ frame }) => frame !== 0))
      if (!speech.length || moving)
        issue('altar-party-not-standing-for-chief', {
          actual: moving && {
            ...location(moving.render, moving.frame),
            party: moving.frame.party,
          },
        })
    }
    return {
      scene,
      visit,
      hook: start ?? stage,
      recorded: renders.length,
      visible: paints.length,
      first: paints[0] && location(paints[0].render, paints[0].frame),
      actors,
    }
  })
}

export function compareRainRouteCast(game, reforge) {
  const issues = []
  for (const { scene, visit, actors } of game) {
    const actual = reforge[visit - 1]
    for (const [actor, track] of Object.entries(actors)) {
      const expected = track.filter(({ pose }) => pose)
      const recorded = actual?.actors[actor]?.filter(({ pose }) => pose) ?? []
      if (Boolean(expected.length) !== Boolean(recorded.length)) {
        issues.push({
          issue: 'rain-route-actor-visibility',
          scene,
          visit,
          actor,
          game: expected[0] ?? null,
          reforge: recorded[0] ?? null,
        })
        continue
      }
      if (
        expected.length &&
        expected.every(({ pose }) => isDeepStrictEqual(pose[1], expected[0].pose[1]))
      ) {
        const displaced = recorded.find(
          ({ pose }) => !isDeepStrictEqual(pose[1], expected[0].pose[1]),
        )
        if (displaced)
          issues.push({
            issue: 'rain-route-actor-displaced',
            scene,
            visit,
            actor,
            game: expected[0],
            reforge: displaced,
          })
      }
    }
  }
  return issues
}
