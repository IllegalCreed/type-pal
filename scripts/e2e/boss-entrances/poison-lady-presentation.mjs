import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import { sourceDialogueText } from '../causal-recording-contract.mjs'
import { compareRenderedDialogue } from '../rendered-dialogue-comparison.mjs'

// Source pages preserve the current portrait through 0x8E. The redraw after
// transformation removes it but retains the indented layout until 21773.
const worldPages = [
  ['top', 53, 21698, 21699, 21699],
  ['bottom', 48, 21702, 21703, 21703],
  ['top', 53, 21706, 21707, 21709],
  ['top', 53, 21706, 21711, 21713],
  ['top', 53, 21706, 21715, 21716],
  ['top', 53, 21706, 21718, 21720],
  ['bottom', 48, 21723, 21724, 21724],
  ['top', 53, 21727, 21728, 21729],
  ['top', 53, 21727, 21731, 21733],
  ['bottom', 48, 21736, 21737, 21738],
  ['bottom', 48, 21736, 21740, 21742],
  ['top', 53, 21745, 21746, 21747],
  ['bottom', 48, 21750, 21751, 21751],
  ['top', 53, 21754, 21755, 21758],
  ['top', null, 21766, 21767, 21768, true],
  ['top', null, 21766, 21770, 21771, true],
  ['bottom', null, 21774, 21775, 21775],
  ['bottom', null, 21783, 21784, 21784],
  ['top', null, 21787, 21788, 21789],
]

const battlePages = [
  ['bottom', null, 41534, 41535, 41535],
  ['bottom', null, 41538, 41539, 41539],
  ['bottom', null, 41543, 41544, 41545],
  ['bottom', null, 41549, 41550, 41550],
]

const returnPages = [
  ['top', null, 21810, 21811, 21811],
  ['top', null, 21835, 21836, 21837],
  ['bottom', 3, 21841, 21842, 21842],
  ['top', 37, 21848, 21849, 21852],
  ['bottom', 24, 21855, 21856, 21856],
  ['top', 37, 21859, 21860, 21863],
  ['bottom', 24, 21865, 21866, 21866],
  ['bottom', 3, 21869, 21870, 21870],
  ['top', 37, 21872, 21873, 21874],
]

const signed = (raw) => (raw > 0x7fff ? raw - 0x10000 : raw)

export function readPoisonLadySources(commands, world, successor) {
  const pages = [...worldPages, ...battlePages, ...returnPages].map(
    ([slot, portrait, title, first, last, indented]) => ({
      scene: 's138',
      slot,
      portrait,
      portraitLayout: indented ?? portrait !== null,
      speaker: sourceDialogueText(commands[title].text).replace(/∶$/u, ''),
      rows: commands.slice(first, last + 1).map(({ op, messageIndex, text }, i) => {
        assert.equal(op, 'showDialog')
        return { id: `dlg.${messageIndex}`, ip: first + i, text: sourceDialogueText(text) }
      }),
    }),
  )
  const actor = (id) => world.eventObjects.find((event) => event.id === id)
  const edge = actor(2342)
  const pan = commands[21819]
  const snap = commands[21818]
  const bladeMove = commands[Number(edge.autoLabel.slice(2))]
  assert.deepEqual([snap.opcode, pan.opcode, bladeMove.opcode], [0x7f, 0x7f, 0x7d])
  const [focusX, focusY] = snap.operands
  const [dx, dy, steps] = pan.operands
  const sword = Array.from({ length: steps + 1 }, (_, i) => ({
    camera: [focusX * 32 - 160 + signed(dx) * i, focusY * 16 - 112 + signed(dy) * i],
    position: [
      edge.x + signed(bladeMove.operands[1]) * i,
      edge.y + signed(bladeMove.operands[2]) * i,
    ],
  }))
  const jiu = actor(2343)
  const begin = Number(jiu.autoLabel.slice(2))
  let y = jiu.y
  const descent = commands.slice(begin, 21894).map(({ opcode, operands }) => {
    assert.equal(opcode, 0x7d)
    assert.equal(operands[1], 0)
    y += signed(operands[2])
    return [[jiu.x, y], jiu.nSpriteFrames * jiu.direction]
  })
  // At the original camera, the first four downward steps are above the viewport.
  const visibleLanding = descent.slice(4)
  assert.deepEqual(commands[21895].operands, [41, 74, 1])
  const approach = [4, 3, 5, 3].map((frame, i) => [[jiu.x - 4 * (i + 1), y - 2 * (i + 1)], frame])
  const successorActors = Object.fromEntries(
    successor.eventObjects
      .filter(({ id }) => [2372, 2374, 2375].includes(id))
      .map(({ id, spriteNum, x, y, direction, nSpriteFrames, currentFrameNum }) => [
        `e${id}`,
        [spriteNum, [x, y], nSpriteFrames * direction + currentFrameNum],
      ]),
  )
  return { pages, sword, visibleLanding, approach, successorActors }
}

export function inspectPoisonLadyPresentation({ events, draws, boundaries, source }) {
  const { trigger, launch, won, control } = boundaries
  const issues = []
  const check = (rule, actual, expected) => {
    if (!isDeepStrictEqual(actual, expected)) issues.push({ rule, actual, expected })
  }
  const dialogue = compareRenderedDialogue(
    draws.filter(
      ({ scene, atMs }) => scene === 's138' && atMs >= trigger.atMs && atMs < control.atMs,
    ),
    source.poisonLady.pages,
    source.locale,
  )
  issues.push(...dialogue.findings)
  const world = events.filter(({ kind, visible }) => kind === 'world-drawn' && visible)
  const inScene = world.filter(({ scene, order }) => scene === 's138' && order > won.order)
  const tracks = events.filter(({ kind, order }) => kind === 'music-start' && order > trigger.order)
  check(
    'scene, battle and return music are heard in order',
    tracks.map(({ track }) => track),
    [34, 38, 21, 7],
  )
  check(
    'successor music starts before its first visible draw',
    tracks.at(-1)?.order < control.order,
    true,
  )
  check(
    'first visible successor pose',
    control.party?.map(({ id, frame, world }) => [id, frame, world]),
    [['li-xiaoyao', 9, [1344, 1328]]],
  )
  check(
    'three story actors on the first visible successor frame',
    Object.fromEntries(
      Object.entries(control.actors).map(([id, pose]) => [
        id,
        [pose.asset, pose.position, pose.frame],
      ]),
    ),
    source.poisonLady.successorActors,
  )

  const sword = inScene
    .filter(({ actors }) => actors.e2342)
    .map(({ atMs, camera, actors }) => ({ atMs, camera, position: actors.e2342.position }))
  check(
    'blade and camera advance together',
    sword.map(({ atMs: _time, ...pose }) => pose),
    source.poisonLady.sword,
  )
  check('blade holds each camera view for a world beat', onBeat(sword, 100), true)
  const speechPage = source.poisonLady.pages.find(({ rows }) => rows[0].id === 'dlg.8087')
  const firstSpeech = draws.find(
    ({ scene, atMs, slots }) =>
      scene === 's138' &&
      atMs > won.atMs &&
      slots.some(
        ({ speaker, slot }) =>
          slot === speechPage.slot &&
          (source.locale[speaker] ?? speaker)?.replace(/∶$/u, '') === speechPage.speaker,
      ),
  )
  const approach = []
  for (const { atMs, actors, camera } of inScene) {
    if (atMs >= (firstSpeech?.atMs ?? control.atMs)) break
    const actor = actors.e2343
    if (!actor || actor.rect[1] + actor.rect[3] <= camera[1]) continue
    const { frame, position } = actor
    const pose = [position, frame]
    if (!isDeepStrictEqual(approach.at(-1)?.pose, pose)) approach.push({ atMs, pose })
  }
  const { visibleLanding, approach: expectedSteps } = source.poisonLady
  check(
    'Jiu Jianxian descent and walk finish before his first line',
    approach.map(({ pose }) => pose),
    [...visibleLanding, ...expectedSteps],
  )
  check(
    'each visible descent step uses one world beat',
    onBeat(approach.slice(0, visibleLanding.length), 100),
    true,
  )
  check(
    'each visible approach step uses two world beats',
    onBeat(approach.slice(visibleLanding.length), 200),
    true,
  )
  const cleared = inScene.find(
    ({ atMs, actors }) => atMs > (approach.at(-1)?.atMs ?? Infinity) && !actors.e2338,
  )
  check(
    'the spider disappears only after the approach and before the first line',
    Boolean(cleared && cleared.atMs < firstSpeech?.atMs),
    true,
  )
  const effects = events.filter(
    ({ kind, order }) => kind === 'sfx-start' && order > won.order && order < control.order,
  )
  check(
    'two audible blade-impact cues',
    effects.map(({ asset }) => asset),
    [95, 269],
  )
  const impactInterval = effects[1]?.atMs - effects[0]?.atMs
  check(
    'eight world beats between the two impacts',
    impactInterval >= 740 && impactInterval <= 870,
    true,
  )
  const beforeBattle = world.filter(({ order }) => order > trigger.order && order < launch.order)
  const spider = beforeBattle.filter(({ actors }) => actors.e2338).map(({ actors }) => actors.e2338)
  const advancing = []
  for (const { position, frame } of spider) {
    if (position[0] <= 1264) continue
    const pose = [position, frame]
    if (!isDeepStrictEqual(pose, advancing.at(-1))) advancing.push(pose)
  }
  check('three spider steps and standing pose before battle', advancing, [
    [[1280, 1200], 1],
    [[1296, 1208], 0],
    [[1312, 1216], 1],
    [[1312, 1216], 0],
  ])
  return { issues, dialogue, sword, approach, impactInterval }
}

function onBeat(events, ms) {
  return (
    events.length > 1 &&
    events.slice(1).every(({ atMs }, i) => Math.abs(atMs - events[i].atMs - ms) <= 45)
  )
}
