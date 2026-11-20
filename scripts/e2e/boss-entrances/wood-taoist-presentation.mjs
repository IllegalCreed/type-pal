import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import {
  compareRenderedDialogue,
  inspectClearedDialogueFrames,
  sourceDialogueGroups,
} from '../rendered-dialogue-comparison.mjs'

export function woodTaoistCommand({ turn, selectingPlayerId, snapshot }, command) {
  if (selectingPlayerId === 'anu' && turn >= 4) {
    return { ...command, kind: 'cast', skillId: '374', targetSide: 'enemy' }
  }
  const recovery = { 7: 'anu', 9: 'li-xiaoyao' }[turn]
  if (selectingPlayerId === 'li-xiaoyao' && recovery) {
    assert(snapshot.players.some(({ id }) => id === recovery))
    return { ...command, kind: 'cast', skillId: '299', targetSide: 'player', targetId: recovery }
  }
  return command
}

export function readWoodTaoistSources(data, commands, spec, object) {
  const { scene, world } = spec
  const owner = data.gameScene.eventObjects.find(({ id }) => `e${id}` === spec.owner)
  const distance = ([col, row]) =>
    Math.abs(16 * (col - row) - owner.x) + 2 * Math.abs(8 * (col + row) - owner.y)
  const range = (owner.triggerMode - 4) * 32 + 16
  assert(distance(spec.start) >= range && distance(spec.contact) < range)
  assert.deepEqual(spec.contact, [spec.start[0] - 1, spec.start[1], spec.start[2]])
  assert.equal(commands[25116].sceneId, 182)
  assert.deepEqual(commands[25117].operands, commands[27200].operands)
  assert.equal(Number(data.gameScene.onEnterLabel.slice(2)), 27200)
  assert.deepEqual(
    [commands[27246].op, commands[27246].itemId, commands[27246].count],
    ['giveItem', Number(world.inventory[0].itemId), 0],
  )
  assert.deepEqual(commands[27554].operands, [1, 0, 0])
  assert.deepEqual(commands[27555].operands, [1, 0, 0])

  for (const [role, spells] of Object.entries(spec.learned)) {
    const member = data.skills.levelUp[role]
    for (const spell of spells)
      assert(member.some(({ skillId, level }) => skillId === spell && level <= 35))
  }
  const summonIPs = [42719, 42722]
  const summons = summonIPs.map((ip) => {
    const { opcode, operands } = commands[ip]
    assert.equal(opcode, 0x9e)
    const [objectIndex, count] = operands
    assert.equal(count, 0, 'one summon per invocation')
    const summon = data.objects.find((entry) => entry.objectIndex === objectIndex)
    const enemy = data.enemies.find(({ id }) => id === summon.enemyId)
    return { ip, id: `enemy-${objectIndex}`, hp: enemy.health, exp: enemy.exp, cash: enemy.cash }
  })
  const cast = (ip) => {
    assert.equal(commands[ip].opcode, 0x67)
    return String(commands[ip].operands[0])
  }
  return {
    walks: sourceWalks(data, commands),
    pages: sourceDialogueGroups(commands, [
      { scene, first: 27204, last: 27237 },
      { scene, first: object.scriptOnTurnStart, last: 42714 },
      { scene, first: 42726, last: 42731, initialSlot: 'top' },
      { scene, first: 27244, last: 27410 },
    ]),
    summons,
    openingSpell: cast(object.scriptOnReady),
    secondPhaseSpell: cast(42730),
    summonBonus: {
      exp: summons.reduce((sum, { exp }) => sum + exp, 0),
      cash: summons.reduce((sum, { cash }) => sum + cash, 0),
    },
    successorActors: data.diskHandoffScene.eventObjects
      .filter(({ id, sState }) => sState > 0 && spec.watched.includes(`e${id}`))
      .map(({ id, x, y, spriteNum, nSpriteFrames, direction, currentFrameNum }) => [
        `e${id}`,
        [spriteNum, [x, y], direction * nSpriteFrames + currentFrameNum],
      ]),
  }
}

export function inspectWoodTaoist(
  events,
  draws,
  { trigger, launch, entry, menu, won, control },
  keys,
  game,
  source,
  spec,
) {
  const {
    scene,
    world: { handoff },
  } = spec
  const { pages, successorActors, walks } = source.wood
  const world = events.filter(({ kind, visible }) => kind === 'world-drawn' && visible)
  const field = world.filter((draw) => draw.scene === scene)
  const successor = world.filter((draw) => draw.scene === handoff.scene)
  const dialogue = compareRenderedDialogue(
    draws.filter(
      (draw) => draw.scene === scene && draw.atMs >= trigger.atMs && draw.atMs < control.atMs,
    ),
    pages,
    source.locale,
  )
  const issues = [...dialogue.findings]
  const check = (rule, actual, expected) => {
    if (!isDeepStrictEqual(actual, expected)) issues.push({ rule, actual, expected })
  }

  const initial = field.find(({ order }) => order < trigger.order)
  const partyPoses = ({ party = [] }) =>
    party
      .toSorted((a, b) => a.slot - b.slot)
      .map(({ id, world, frame, spriteId }) => [
        id,
        world,
        frame,
        typeof spriteId === 'string' ? source.spriteChunks.get(spriteId) : spriteId,
      ])
  check('native checkpoint mounts both correct visible sprites', initial && partyPoses(initial), [
    ['li-xiaoyao', [784, 1688], 3, 2],
    ['anu', [800, 1696], 3, 5],
  ])
  const cast = (draw) =>
    Object.entries(draw.actors)
      .map(([id, { asset, position, frame }]) => [id, [asset, position, frame]])
      .toSorted()
  check(
    'native checkpoint draws the Taoist and elder in their source positions',
    initial && cast(initial),
    [
      ['e2978', [108, [688, 1656], 1]],
      ['e2980', [596, [640, 1632], 3]],
    ],
  )

  const approach = field.filter(
    ({ order, leader: [x] }) => trigger.order < order && order < launch.order && x < 768,
  )
  check(
    'the scripted party approaches both original walking destinations',
    approach
      .map(({ leader }) => leader)
      .filter((point, i, list) => !isDeepStrictEqual(point, list[i - 1])),
    game
      ? [
          [760, 1684],
          [744, 1684],
          [736, 1680],
        ]
      : [
          [760, 1684],
          [752, 1688],
          [744, 1684],
          [736, 1680],
        ],
  )
  const cleared = inspectClearedDialogueFrames(
    draws,
    approach.filter(({ leader: [x] }) => x > 736),
    scene,
  )
  if (cleared.issue)
    issues.push({
      rule: 'old dialogue clears before the scripted approach paints',
      ...cleared.issue,
    })

  const battleFirst = events.find(({ kind, band }) => kind === 'entry-band' && band === 6)
  const entryClear = inspectClearedDialogueFrames(
    draws,
    [battleFirst, entry].filter(Boolean),
    scene,
  )
  if (entryClear.issue)
    issues.push({
      rule: 'world dialogue clears in the first complete battle image',
      ...entryClear.issue,
    })

  const first = successor[0]
  check(
    'first visible village image uses the source camera and solo costume',
    first && [first.leader, first.camera, partyPoses(first)],
    [[1040, 1288], [880, 1176], [['li-xiaoyao', [1040, 1288], 3, 2]]],
  )
  check(
    'all nine village actors on the first visible village image',
    first && cast(first),
    successorActors.toSorted(),
  )
  const firstVillageText = draws.find(
    ({ scene, slots }) => scene === handoff.scene && slots.some(({ lines }) => lines.some(Boolean)),
  )
  const villageReveal = successor.filter(
    ({ atMs }) => !firstVillageText || atMs < firstVillageText.atMs,
  )
  for (const draw of villageReveal) {
    check(
      'village camera and actors remain in place through reveal',
      [draw.leader, draw.camera, partyPoses(draw), cast(draw)],
      [[1040, 1288], [880, 1176], [['li-xiaoyao', [1040, 1288], 3, 2]], successorActors.toSorted()],
    )
  }
  const music = events.find(
    ({ kind, order, track, context }) =>
      kind === 'music-start' &&
      order > won.order &&
      track === source.successorTrack &&
      context === 'running',
  )
  check(
    'village score is playing by the first reveal',
    !!music && music.order < control.order,
    true,
  )

  for (const [phase, count] of [
    ['before-dialogue', 8],
    ['after-dialogue', 27],
  ]) {
    check(
      `physical confirmation ledger for ${phase}`,
      keys.filter((key) => key.phase === phase).map(({ kind, key }) => [kind, key]),
      Array.from({ length: count }, () => ['press', game ? 'Space' : 'Enter']),
    )
  }
  const turnSix = events.find(
    ({ kind, turn, action }) =>
      kind === 'action' &&
      turn === 6 &&
      String(action?.skillId ?? action?.actionId) === source.wood.secondPhaseSpell,
  )
  const complete = dialogue.checked?.map(({ firstComplete }) => firstComplete?.atMs)
  check(
    'the battle dialogue is complete before the menu and the phase change before its spell',
    !!complete &&
      complete.slice(6, 8).every((atMs) => entry.atMs <= atMs && atMs < menu.atMs) &&
      menu.atMs < complete[8] &&
      complete[8] < turnSix?.atMs,
    true,
  )

  const performerWalks = checkPerformerWalks(field, won, walks, check)
  return {
    issues,
    dialogue,
    firstDraw: first,
    music,
    approach,
    villageReveal,
    cleared,
    entryClear,
    performerWalks,
  }
}

function sourceWalks(data, commands) {
  const actor = (id) => data.gameScene.eventObjects.find((entry) => entry.id === id)
  const start = (id) => [actor(id).x, actor(id).y]
  const target = (ip, opcode) => {
    assert.equal(commands[ip].opcode, opcode)
    const [x, y, h] = commands[ip].operands
    return [32 * x + 16 * h, 16 * y + 8 * h]
  }
  const walk = (from, to, step, interval) => {
    const dx = Math.sign(to[0] - from[0]) * step * 2
    const dy = Math.sign(to[1] - from[1]) * step
    const poses = []
    let [x, y] = from
    while (Math.abs(x - to[0]) >= step * 2 && Math.abs(y - to[1]) >= step * 2) {
      x += dx
      y += dy
      const stride = [1, 0, 2, 0][poses.length % 4]
      poses.push({ position: [x, y], frame: 3 + stride })
    }
    poses.push({ position: to, frame: 3 })
    return { interval, poses }
  }

  const tao = start(2981)
  const taoStop = target(27677, 0x10)
  const song = start(2982)
  const songStops = [27414, 27416, 27419, 27421].map((ip) => target(ip, ip === 27416 ? 0x10 : 0x11))
  const [toVillage, besideTao, besideElder, away] = songStops
  const [, dx, dy] = commands[27423].operands
  assert.equal(commands[27423].opcode, 0x7d)
  assert.deepEqual(commands[27426].operands, commands[27423].operands)
  return {
    e2981: {
      start: tao,
      legs: [
        walk(tao, taoStop, 3, 100),
        {
          interval: 100,
          poses: [27299, 27301].map((ip, index) => {
            assert.equal(commands[ip].opcode, 0x6c)
            const [, x, y] = commands[ip].operands
            return {
              position: [taoStop[0] + (index + 1) * x, taoStop[1] + (index + 1) * y],
              frame: index ? 9 : 10,
            }
          }),
        },
      ],
    },
    e2982: {
      start: song,
      legs: [
        walk(song, toVillage, 2, 200),
        walk(toVillage, besideTao, 3, 100),
        walk(besideTao, besideElder, 2, 200),
        walk(besideElder, away, 2, 200),
        {
          interval: 300,
          poses: Array.from({ length: 7 }, (_, index) => ({
            position: [away[0] + (index + 1) * dx, away[1] + (index + 1) * dy],
            frame: 3,
          })),
        },
      ],
    },
  }
}

function checkPerformerWalks(frames, won, walks, check) {
  return Object.fromEntries(
    Object.entries(walks).map(([id, { start, legs }]) => {
      let previous
      const retained = frames.flatMap(({ order, atMs, actors }) => {
        const actor = actors[id]
        if (order <= won.order || !actor || isDeepStrictEqual(previous, actor.position)) return []
        previous = actor.position
        return [{ atMs, position: actor.position, frame: actor.frame }]
      })
      check(`${id} first filmed position`, retained[0]?.position, start)
      check(
        `${id} follows every source footstep with the correct sprite frame`,
        retained.slice(1).map(({ position, frame }) => ({ position, frame })),
        legs.flatMap(({ poses }) => poses),
      )
      let index = 1
      for (const { interval, poses } of legs) {
        const times = retained.slice(index, index + poses.length).map(({ atMs }) => atMs)
        const intervals = times.slice(1).map((time, i) => Math.round(time - times[i]))
        check(
          `${id} takes the source beat on each step of its route at step ${index}`,
          intervals.length === poses.length - 1 &&
            intervals.every((ms) => Math.abs(ms - interval) <= 50),
          true,
        )
        index += poses.length
      }
      return [id, retained]
    }),
  )
}
