import { isDeepStrictEqual } from 'node:util'

const pixel = ([col, row]) => [16 * (col - row), 8 * (col + row)]

function partyPose(frame, game) {
  return frame?.party
    ?.map(({ id, slot, spriteId, world, frame: spriteFrame }) => ({
      id,
      slot,
      sprite: game ? { 2: 'li-xiaoyao', 7: 'lin-yueru' }[spriteId] : spriteId,
      world,
      frame: spriteFrame,
    }))
    .sort((a, b) => a.slot - b.slot)
}

export function inspectTowerFoxPresentation({
  events,
  spec,
  actor,
  game,
  approach,
  won,
  control,
  returnedOwner,
}) {
  const issues = []
  const check = (condition, rule, actual) => {
    if (!condition) issues.push({ rule, actual })
  }
  const world = events.filter(({ kind, scene }) => kind === 'world-drawn' && scene === spec.scene)
  const entrySource = events.find(({ kind }) => kind === 'entry-source')
  const contact = world.findLast(
    ({ order, visible }) => approach.order < order && order < entrySource?.order && visible,
  )
  const leader = pixel(spec.contact)
  const camera = [leader[0] - 160, leader[1] - 112]
  const contactPose = partyPose(contact, game)
  check(
    isDeepStrictEqual(contact?.leader, leader) &&
      isDeepStrictEqual(contact?.camera, camera) &&
      contact?.actors[spec.owner]?.asset === actor.asset &&
      isDeepStrictEqual(contact.actors[spec.owner].position, actor.position) &&
      contactPose?.length === 2 &&
      contactPose.every(({ frame }) => frame === 1 || frame === 2),
    'battle entry source uses the painted touch landing',
    contact,
  )
  const idle = world
    .filter(
      ({ order, leader, visible, actors }) =>
        order < approach.order &&
        visible &&
        isDeepStrictEqual(leader, pixel(spec.start)) &&
        actors[spec.owner]?.asset === actor.asset &&
        isDeepStrictEqual(actors[spec.owner].position, actor.position),
    )
    .map(({ atMs, actors }) => ({ atMs, frame: actors[spec.owner].frame }))
    .filter(({ frame }, index, rows) => index === 0 || rows[index - 1].frame !== frame)
    .slice(-7)
  const idleIntervals = idle.slice(1).map(({ atMs }, i) => atMs - idle[i].atMs)
  check(
    idle.length === 7 &&
      idleIntervals.every(
        (ms, i) =>
          ms >= 65 && ms <= 135 && idle[i + 1].frame === (idle[i].frame + 1) % actor.frameCount,
      ),
    'original idle animation increments once per world beat',
    { idle, idleIntervals },
  )
  const paint = events.filter(
    ({ kind, order, scene }) =>
      kind === 'victory-return-paint' && won.order < order && scene === spec.scene,
  )
  const dark = paint.find(({ black }) => black)
  const revealed = dark && paint.find(({ order, black }) => order > dark.order && !black)
  const fadeOut = events.find(
    ({ kind, order, ip, op, path }) =>
      kind === 'script-op' &&
      order > won.order &&
      (game ? ip === spec.disk.victory + 1 : op === 'fade' && path?.at(-1) === 2),
  )
  check(
    dark &&
      paint[0] &&
      !paint[0].black &&
      paint.filter(({ order }) => order < dark.order).every(({ world }) => !world) &&
      fadeOut &&
      dark.atMs - fadeOut.atMs >= 460 &&
      dark.atMs - fadeOut.atMs <= 720,
    'victory screen fades completely before the field becomes visible',
    { first: paint[0], dark, fadeOut },
  )
  const revealedWorld = revealed?.world
  const revealedPose = partyPose(revealedWorld, game)
  check(
    revealed?.order < control.order &&
      !revealed.ready &&
      isDeepStrictEqual(revealedWorld?.camera, camera) &&
      isDeepStrictEqual(revealedWorld?.leader, leader) &&
      isDeepStrictEqual(revealedPose, contactPose) &&
      paint
        .filter(({ order, black }) => order >= revealed.order && !black)
        .every(({ world }) => world?.scene === spec.scene && !world.actors[spec.owner]) &&
      control.atMs - revealed.atMs >= 450 &&
      control.atMs - revealed.atMs <= 700,
    'first visible return keeps the touch formation and excludes the defeated actor',
    { revealed, control, contactPose },
  )
  const lifecycle = returnedOwner?.lifecycle
  check(
    game
      ? returnedOwner?.state === -2 &&
          returnedOwner.vanishTime >= 799 &&
          returnedOwner.vanishTime <= 800
      : returnedOwner?.hidden &&
          lifecycle?.phase === 'despawned' &&
          lifecycle.remainingTicks === 800,
    'defeated actor remains hidden for the original respawn window',
    returnedOwner,
  )
  return {
    issues,
    contact: contact && { leader: contact.leader, camera: contact.camera, party: contactPose },
    reveal: revealedWorld && {
      leader: revealedWorld.leader,
      camera: revealedWorld.camera,
      party: revealedPose,
    },
    idleIntervals,
    timings: {
      fromVictoryToDarkMs: dark && dark.atMs - won.atMs,
      fromDarkToRevealMs: revealed && revealed.atMs - dark.atMs,
      fromRevealToControlMs: revealed && control.atMs - revealed.atMs,
    },
  }
}
