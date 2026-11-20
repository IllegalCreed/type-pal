import { isDeepStrictEqual } from 'node:util'

const fighters = {
  s230: ['e4132', 'e4133', 'e4134', 'e4135', 'e4136', 'e4137'],
  s243: ['e4295', 'e4296', 'e4297', 'e4298', 'e4299'],
}
const villageWalkers = ['e4312', 'e4313', 'e4314', 'e4315']
const villageLookouts = ['e4316', 'e4317', 'e4319', 'e4322', 'e4323', 'e4324']
const villageAnimals = ['e4325', 'e4326', 'e4327', 'e4328']
const directions = ['down', 'left', 'up', 'right']
const continuousWorldScenes = new Set(['s230', 's243', 's244'])

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

function originalAnimalCircuit(commands, { x, y, autoLabel }) {
  const start = Number(autoLabel.slice(2))
  const path = [[x, y]]
  const strides = [
    [-4, 2],
    [-4, -2],
    [4, -2],
    [4, 2],
  ]
  for (let ip = start; ip < commands.length; ip++) {
    const { op, opcode, operands, resetTo } = commands[ip]
    if (op === 'end') {
      if (resetTo === start && isDeepStrictEqual(path.at(-1), path[0])) return path.slice(0, -1)
      break
    }
    const delta =
      strides[opcode - 11] ??
      (opcode === 0x6c
        ? operands.slice(1).map((value) => (value >= 32768 ? value - 65536 : value))
        : null)
    if (delta) path.push(path.at(-1).map((axis, i) => axis + delta[i]))
  }
  throw new Error(`unresolved ambient circuit ${autoLabel}`)
}

function wrongAnimalStep(changes, path) {
  let previous
  let candidates = []
  for (const row of changes) {
    if (!row.pose) {
      previous = undefined
      continue
    }
    const [, position, facing, frame] = row.pose
    const direction = directions.indexOf(facing)
    if (direction < 0 || Math.floor(frame / 2) !== direction) return row
    if (isDeepStrictEqual(previous, position)) continue
    const indices = previous ? candidates.map((i) => (i + 1) % path.length) : path.keys()
    candidates = [...indices].filter((i) => isDeepStrictEqual(path[i], position))
    if (!candidates.length) return row
    previous = position
  }
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
    if (continuousWorldScenes.has(scene)) {
      const dialogue = renders.find((row) => row.dialogue)
      if (dialogue) issue('rain-route-unexpected-dialogue', { actual: location(dialogue) })
      // These visits stay in the world between their entry and exit fades.
      // A submitted blank frame must be checked even when no dialogue is open.
      const showsWorld = ({ view, backdrop }) =>
        view !== null && backdrop?.textured && !backdrop.dark
      const first = renders.findIndex(showsWorld)
      const last = renders.findLastIndex(showsWorld)
      const hidden = renders.slice(first, last + 1).find((render) => !showsWorld(render))
      if (hidden)
        issue('rain-route-interrupted-visible-world', {
          actual: location(hidden, byOrder.get(hidden.view)),
          backdrop: hidden.backdrop,
        })
    }
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
          !directions.includes(facing) ||
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
        ({ pose }) =>
          !isDeepStrictEqual(pose[1], steps[0].pose[1]) ||
          pose[2] !== 'down' ||
          pose[3] > ([597, 598].includes(pose[0]) ? 2 : 3),
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
      for (const actor of villageAnimals) {
        const original = sourceCast.get(actor)
        const wrong = wrongAnimalStep(
          actors[actor],
          originalAnimalCircuit(source.commands, original),
        )
        if (wrong) issue('rain-village-animal-off-route', { actor, actual: wrong })
      }
      const rain = actorChanges(paints, 'e4329')
      const visible = rain.filter(({ pose }) => pose)
      const wrong = visible.find(({ pose, atMs, camera }, i) => {
        if (!i) return !isDeepStrictEqual(pose, [610, [672, 1380], 'down', 2])
        const previous = visible[i - 1]
        const interval = i === 149 ? 200 : 100
        return (
          pose[1][0] !== 672 ||
          pose[1][1] !== previous.pose[1][1] + 2 ||
          pose[3] !== (previous.pose[3] + 1) % 10 ||
          !isDeepStrictEqual(camera, [512, Math.min(1484, pose[1][1] - 192)]) ||
          (i > 1 && Math.abs(atMs - previous.atMs - interval) > 55)
        )
      })
      const absent = rain.find(({ pose }) => !pose)
      if (visible.length !== 178 || wrong || absent)
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
            source.lingerAppearance.native.sprite
        )
      })
      if (wrong)
        issue('altar-party-costume', {
          actor: 'zhao-linger',
          actual: { ...location(wrong.render, wrong.frame), party: wrong.frame.party },
          expectedSprite: source.lingerAppearance.native.sprite,
        })
      const speech = paints.filter(
        ({ frame, render }) => render.dialogue && isDeepStrictEqual(frame.leader, [896, 1248]),
      )
      const expectedParty = [
        ['zhao-linger', [896, 1248], 0],
        ['li-xiaoyao', [924, 1226], 0],
        ['anu', [908, 1234], 0],
      ]
      const moving = speech.find(
        ({ frame }) =>
          !isDeepStrictEqual(
            frame.party
              .toSorted((a, b) => a.slot - b.slot)
              .map(({ id, world, frame }) => [id, world, frame]),
            expectedParty,
          ),
      )
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

function visibilityChanges(track) {
  return track
    .map(({ pose }) => Boolean(pose))
    .filter((shown, i, values) => shown !== values[i - 1])
}

function travelChanges(track) {
  return track.filter(
    ({ pose }, index) => !isDeepStrictEqual(pose?.[1], track[index - 1]?.pose?.[1]),
  )
}

export function compareRainRouteCast(game, reforge) {
  const issues = []
  for (const { scene, visit, actors } of game) {
    const actual = reforge[visit - 1]
    for (const [actor, track] of Object.entries(actors)) {
      const expected = track.filter(({ pose }) => pose)
      const recorded = actual?.actors[actor]?.filter(({ pose }) => pose) ?? []
      const actualTrack = actual?.actors[actor] ?? []
      if (
        Boolean(expected.length) !== Boolean(recorded.length) ||
        (['s227', 's230', 's243', 's245'].includes(scene) &&
          !isDeepStrictEqual(visibilityChanges(track), visibilityChanges(actualTrack)))
      ) {
        issues.push({
          issue: 'rain-route-actor-visibility',
          scene,
          visit,
          actor,
          game: { first: expected[0], visibility: visibilityChanges(track) },
          reforge: { first: recorded[0], visibility: visibilityChanges(actualTrack) },
        })
        continue
      }
      const needsExactTrack =
        (scene === 's244' && villageWalkers.includes(actor)) || scene === 's227'
      if (needsExactTrack) {
        // The last villager makes ambient turns once she has finished walking.
        // 0x11 alternatively starts on either world-tick parity in the original.
        const staggeredWalk = actor === 'e4315'
        const original = staggeredWalk ? travelChanges(expected) : expected
        const candidate = staggeredWalk ? travelChanges(recorded) : recorded
        const withCamera = scene === 's244' && !staggeredWalk
        const firstDifference = original.findIndex(
          (row, i) =>
            !isDeepStrictEqual(row.pose, candidate[i]?.pose) ||
            (withCamera && !isDeepStrictEqual(row.camera, candidate[i]?.camera)),
        )
        if (firstDifference !== -1 || original.length !== candidate.length) {
          const at =
            firstDifference === -1 ? Math.min(original.length, candidate.length) : firstDifference
          issues.push({
            issue: 'rain-route-different-scripted-pose',
            scene,
            visit,
            actor,
            game: original[at] ?? null,
            reforge: candidate[at] ?? null,
          })
        }
      }
      if (
        expected.length &&
        expected.every(({ pose }) => isDeepStrictEqual(pose[1], expected[0].pose[1]))
      ) {
        const fixedPose = expected.length === 1
        const displaced = recorded.find(
          ({ pose }) =>
            !isDeepStrictEqual(
              fixedPose ? pose : pose[1],
              fixedPose ? expected[0].pose : expected[0].pose[1],
            ),
        )
        if (displaced)
          issues.push({
            issue: fixedPose ? 'rain-route-wrong-static-pose' : 'rain-route-actor-displaced',
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
