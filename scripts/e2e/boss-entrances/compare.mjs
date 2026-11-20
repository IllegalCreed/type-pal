import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { sha256 } from '../browser-journey.mjs'
import { sourceDialogueText } from '../causal-recording-contract.mjs'
import { readEvidenceArtifact } from '../evidence-artifact.mjs'
import { assertInputLedger } from '../input-ledger.mjs'
import { inspectClearedDialogueFrames } from '../rendered-dialogue-comparison.mjs'
import { checkWorldDialoguePixels, decodeWorldDialoguePixels } from '../world-dialogue-pixels.mjs'
import { inspectPhoenixPresentation } from './compare-phoenix-presentation.mjs'
import { inspectFireQilin } from './fire-qilin-presentation.mjs'
import { inspectForestInnCoverage, readForestInnCoverage } from './forest-inn-coverage.mjs'
import { inspectGaiLuojiaoPresentation } from './gai-luojiao-presentation.mjs'
import { inspectGoldenToadPresentation } from './golden-toad-presentation.mjs'
import {
  inspectLinTiannanPresentation,
  readLinTiannanPresentation,
} from './lin-tiannan-presentation.mjs'
import { inspectPoisonLadyPresentation } from './poison-lady-presentation.mjs'
import { inspectRingOpening } from './ring-opening-presentation.mjs'
import {
  battleOperands,
  battlePartyFor,
  departingPosition,
  entranceSteps,
  gameScene,
  grid,
  initialTrack,
  isBossBattle,
  json,
  observesForeground,
  partyFor,
  readSources,
  returnedPosition,
  returnTrack,
  scenarios,
} from './scenarios.mjs'
import { inspectStoneElderAutoPresentation } from './stone-elder-auto-presentation.mjs'
import { inspectStoneElderPresentation } from './stone-elder-presentation.mjs'
import { inspectTowerFoxPresentation } from './tower-fox-presentation.mjs'
import { inspectTowerMingPresentation } from './tower-ming-presentation.mjs'
import { inspectWoodTaoist } from './wood-taoist-presentation.mjs'
import { compareWorldDialogueCast } from './world-dialogue-coverage.mjs'
import { inspectOutsidePresentation } from './yueru-outside-presentation.mjs'

const [scenario, gamePath, reforgePath] = process.argv.slice(2)
const spec = scenarios[scenario]
assert(
  spec && gamePath && reforgePath && process.argv.length === 5,
  'usage: node scripts/e2e/boss-entrances/compare.mjs SCENARIO GAME_REPORT REFORGE_REPORT',
)
const source = await readSources(spec)
const linTiannanFacts =
  spec.id === 'shangshu-lin-tiannan'
    ? readLinTiannanPresentation(
        (await json('data/extracted/events/all.json')).segments.flatMap(({ commands }) => commands),
        spec,
      )
    : undefined
const automatic = source.automatic
const forestInn =
  scenario === 'stone-elder-auto'
    ? readForestInnCoverage(
        (await json('data/extracted/events/all.json')).segments.flatMap(({ commands }) => commands),
        spec,
        await json('data/extracted/data/scene/110.json'),
      )
    : undefined
const scriptedStop = source.tian ?? source.scriptedStop ?? automatic
const scriptedDefeat = spec.world.outcome === 'lost'
const earnsRewards = !scriptedStop && !scriptedDefeat
const party = partyFor(spec)
const battleParty = battlePartyFor(spec)
const entrance = spec.entrance
const revisit = spec.revisit
const contactScene = spec.sceneRoute?.checkpoint ?? spec.scene
const checkpointScene = entrance?.scene ?? contactScene
const handoff = spec.world.handoff
const scriptedReturn = spec.world.scriptedReturn
const leavesByScript = Boolean(handoff || scriptedReturn)
const fieldMusic = initialTrack(spec)
const returnMusic = returnTrack(spec)
const returnedAt = returnedPosition(spec)
const departureAt = departingPosition(spec)
const approachKey = spec.approach ?? 'ArrowUp'
const exitKey = spec.world.exit ?? 'ArrowDown'
const facing = (key) => key.slice('Arrow'.length).toLowerCase()
const roles = battleParty.map(({ role }) => role)
const subtitle = (s) => s?.replace(/[\s"“”]/gu, '') ?? ''
const speaker = (s) => s?.replace(/^spk\./u, '').replace(/∶$/u, '') ?? null
const totalReward = () => [
  source.nativeEnemies.reduce((sum, enemy) => sum + enemy.exp, source.summonBonus.exp),
  source.nativeEnemies.reduce((sum, enemy) => sum + enemy.cash, source.summonBonus.cash),
]
const mainAction = (action, game) => {
  const kind = game ? (action.type === 'magic' ? 'cast' : action.type) : action.kind
  return {
    kind,
    spell: kind === 'cast' ? String(game ? action.actionId : action.skillId) : null,
    target: ['defend', 'pass'].includes(kind)
      ? null
      : game
        ? action.target === -1
          ? null
          : action.target
        : (action.targetEnemyIdx ??
          action.targetAllyIdx ??
          action.targetPlayerIdx ??
          (spec.recovery && kind === 'cast' && action.skillId === spec.recovery.skill ? 0 : null)),
  }
}

function difference(expected, actual, path = []) {
  if (isDeepStrictEqual(expected, actual)) return null
  if (
    expected != null &&
    actual != null &&
    typeof expected === 'object' &&
    typeof actual === 'object'
  ) {
    if (Array.isArray(expected) && Array.isArray(actual) && expected.length !== actual.length)
      return { path: [...path, 'length'], game: expected.length, reforge: actual.length }
    for (const key of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
      const failure = difference(expected[key], actual[key], [...path, key])
      if (failure) return failure
    }
  }
  return { path, game: expected, reforge: actual }
}

function checkDialogue(events, before, after, game) {
  const expected = (commands) =>
    commands
      .filter(({ op, text }) => op === 'showDialog' && !text.endsWith('∶'))
      .map(({ text }) => subtitle(text))
  const painted = (start, end) => {
    const pages = new Map()
    for (const event of events) {
      const box = event.box
      if (
        event.kind !== 'paint' ||
        event.order <= start ||
        event.order >= end ||
        !box?.text ||
        (!box.phase.startsWith('waiting') && box.phase !== 'auto-advance')
      )
        continue
      pages.set(JSON.stringify([box.at, box.id, box.page]), box)
    }
    return [...pages.values()].map(({ text, speaker: heading }) => ({
      text,
      speaker: speaker(heading),
    }))
  }
  const [beforeText, afterText] = [source.pre, source.post].map(expected)
  const pre = painted(before.trigger, before.battle)
  const post = painted(after.won, after.control)
  if (game && spec.disk.reward) {
    const notes = events.filter(
      ({ kind, order }) =>
        kind === 'reward-note-drawn' && order > after.won && order < after.control,
    )
    assert.equal(notes.length, 1, 'native victory reward line')
    post.unshift({ text: notes[0].text, speaker: null })
  }
  for (const [pages, texts, label] of [
    [pre, beforeText, 'before battle'],
    [post, afterText, 'after victory'],
  ]) {
    const displayed = subtitle(pages.map(({ text }) => text).join(''))
    assert.equal(displayed, texts.join(''), `native drawn dialogue ${label}`)
  }
  return { pre, post }
}

function expectedDialoguePages(commands, initialSlot) {
  const pages = []
  let slot = initialSlot
  let portrait = null
  let name = null
  let lines = []
  const finish = () => {
    if (lines.length) pages.push({ slot, portrait, speaker: name, lines })
    lines = []
  }
  for (const command of commands) {
    if (command.op.startsWith('setDialogStyle')) {
      finish()
      slot = command.op.slice('setDialogStyle'.length).toLowerCase()
      portrait = command.arg0 || null
      name = null
    } else if (command.op === 'showDialog') {
      if (command.text.endsWith('∶')) {
        finish()
        name = speaker(command.text)
      } else lines.push(subtitle(command.text.replace(/~\d+$/u, '')))
    } else finish()
  }
  finish()
  return pages
}

function checkTianPresentation(
  events,
  draws,
  { trigger, launch, entry, menu, won, control },
  game,
) {
  const issues = []
  const check = (rule, expected, actual) => {
    if (!isDeepStrictEqual(expected, actual)) issues.push({ rule, expected, actual })
  }
  const first = (kind) => events.find((event) => event.kind === kind)
  const choices = events.filter(({ kind }) => kind === 'jar-choice-drawn')
  const black = first('jar-black-drawn')
  const reveal = first('jar-reveal-drawn')
  const returned = first('tian-first-return-drawn')
  check(
    'default No and deliberate Yes',
    [false, true],
    choices.map(({ yes }) => yes),
  )
  const route = [trigger, ...choices, black, reveal, launch, won, returned, control]
  check(
    'opening, fully covered map, entry and first return order',
    true,
    route.every((event, i) => event && (!i || route[i - 1]?.order < event.order)),
  )
  const [col, row] = returnedAt
  const leader = [16 * (col - row), 8 * (col + row)]
  const camera = [leader[0] - 160, leader[1] - 112]
  const y = game ? 4 : 7
  const party = [
    ['li-xiaoyao', game ? 2 : 'li-xiaoyao', 3, leader, [160, 112 + y]],
    ['lin-yueru', game ? 7 : 'lin-yueru', 0, [leader[0] + 16, leader[1] - 8], [176, 104 + y]],
  ]
  for (const [phase, frame] of [
    ['jar revealed', reveal],
    ['first return', returned],
  ]) {
    check(
      `${phase} scene, world position and camera`,
      [spec.scene, leader, camera],
      [frame?.scene, frame?.leader, frame?.camera],
    )
    check(
      `${phase} actual party sprites, frames and foot positions`,
      party,
      frame?.party
        ?.toSorted((a, b) => a.slot - b.slot)
        .map(({ id, spriteId, frame, world, foot }) => [id, spriteId, frame, world, foot]),
    )
    for (const [id, actor, facing, expectedFrame] of [
      ['e2432', source.tian.target, 'right', 9],
      ['e2433', source.tian.jar, 'down', 1],
    ]) {
      const actual = frame?.actors?.[id]
      check(
        `${phase} drawn ${id}`,
        [actor.asset, actor.position, facing, expectedFrame],
        actual && [actual.asset, actual.position, actual.facing, actual.frame],
      )
    }
  }
  const revival = events.filter(
    ({ kind, ip, op }) =>
      kind === 'script-op' && (game ? ip === source.tian.revive.ip : op === 'revivePartyAll'),
  )
  check(
    'one scripted revival before the first field draw',
    true,
    revival.length === 1 && won.order < revival[0].order && revival[0].order < returned?.order,
  )
  const fallenHp = won.party.map(({ hp }) => hp)
  const revivedHp = won.party.map(({ maxHP }, i) => {
    const hp = [0, 336][i]
    return hp === 0 ? Math.trunc((maxHP * source.tian.revive.tenths) / 10) : hp
  })
  const firstPaint = events.find(
    ({ kind, surface, order }) => kind === 'paint' && surface === 'world' && order > won.order,
  )
  check('terminal half-revival sees the actual casualty', [0, 336], fallenHp)
  check(
    'half-revival reaches the first drawn field and world control',
    [revivedHp, revivedHp],
    [firstPaint?.party.map(({ hp }) => hp), control.party.map(({ hp }) => hp)],
  )
  const finalField = events.find(
    ({ kind, order, actors }) =>
      kind === 'world-drawn' &&
      order > (returned?.order ?? won.order) &&
      actors.e2433?.frame === 1 &&
      !actors.e2432,
  )
  check('Tian disappears on the map while the open jar stays visible', true, Boolean(finalField))

  const lastAction = events.findLast(({ kind }) => kind === 'action')
  const pageState = ({ slot, speaker: name, portrait, portraitLayout, lines }) => ({
    slot,
    speaker: speaker(name),
    portrait,
    portraitLayout,
    lines: lines.map(subtitle).filter(Boolean),
  })
  const dialogue = [
    [
      'opening',
      source.pre,
      trigger,
      events.find(({ kind, band }) => kind === 'entry-band' && band === 1),
      'top',
    ],
    ['battle challenge', source.tian.hookIntro, entry, menu],
    ['battle termination', source.tian.hookEnd, lastAction, won],
    ['returned field', source.post, won, control],
  ].map(([phase, commands, from, until, initialSlot]) => {
    let at = from.atMs
    let earlier = []
    let group = []
    const pages = []
    const flush = () => {
      for (const page of expectedDialoguePages(group, initialSlot)) {
        const center = page.slot === 'center'
        const caption = {
          ...page,
          portraitLayout: page.portrait !== null,
          ...(center &&
            page.speaker && {
              speaker: null,
              lines: [`${page.speaker}∶`, ...page.lines],
            }),
        }
        earlier = [...earlier.filter(({ slot }) => slot !== page.slot), caption]
        pages.push(earlier)
      }
      group = []
      earlier = []
    }
    for (const command of commands) {
      if ([0x05, 0x0a].includes(command.opcode)) flush()
      else
        group.push(
          command.op === 'showDialog'
            ? { ...command, text: sourceDialogueText(command.text) }
            : command,
        )
    }
    flush()
    return {
      phase,
      pages: pages.map((expected, i) => {
        const witness = draws.find(
          ({ scene, atMs, slots }) =>
            scene === spec.scene &&
            atMs >= at &&
            atMs < until.atMs &&
            slots.length === expected.length &&
            expected.every((page) =>
              slots.some((slot) => isDeepStrictEqual(pageState(slot), page)),
            ),
        )
        if (witness) at = witness.atMs
        else issues.push({ rule: `${phase} draw ${i + 1} and retained slots`, expected })
        return { slots: expected, atMs: witness?.atMs }
      }),
    }
  })
  const lastWorldPage = dialogue[0].pages.at(-1).slots[0]
  const battleHandoff = events.find(
    ({ kind, atMs, surface, box }) =>
      kind === 'paint' &&
      surface === 'battle' &&
      atMs >= entry.atMs &&
      atMs < dialogue[1].pages[0].atMs &&
      box?.phase.startsWith('waiting') &&
      speaker(box.speaker) === lastWorldPage.speaker &&
      subtitle(box.text) === lastWorldPage.lines.join(''),
  )
  check(
    'the last field page is acknowledged after the native entry reveal',
    true,
    Boolean(battleHandoff),
  )
  return { issues, choices, black, reveal, returned, revival, dialogue, finalField, battleHandoff }
}

function checkOutsideDialogue(draws, { trigger, launch, menu, won, control }) {
  const pairs = [
    { from: trigger, to: launch, commands: source.pre },
    { from: launch, to: menu, commands: source.turnStart },
    { from: won, to: control, commands: source.post },
  ]
  return pairs.flatMap(({ from, to, commands }) => {
    let lastAt = from.atMs
    const candidates = draws
      .filter(({ atMs, scene }) => scene === spec.scene && atMs >= lastAt && atMs < to.atMs)
      .flatMap(({ atMs, slots }) => slots.map((slot) => ({ ...slot, atMs })))
    return expectedDialoguePages(commands).map((page) => {
      const drawn = candidates.find(
        (slot) =>
          slot.atMs >= lastAt &&
          slot.slot === page.slot &&
          slot.portrait === page.portrait &&
          slot.portraitLayout === (page.portrait !== null) &&
          speaker(slot.speaker) === page.speaker &&
          isDeepStrictEqual(slot.lines.map(subtitle), page.lines),
      )
      assert(drawn, `missing draw of original dialogue ${JSON.stringify(page)}`)
      lastAt = drawn.atMs
      return { ...page, atMs: lastAt }
    })
  })
}

function expectedInnDialogue() {
  const phases = []
  const group = []
  let visible = {}
  const flush = () => {
    for (const { lines, ...page } of expectedDialoguePages(group)) {
      for (let row = 0; row < lines.length; row += 4) {
        visible = {
          ...visible,
          [page.slot]: { ...page, portraitLayout: true, lines: lines.slice(row, row + 4) },
        }
        phases.push(['top', 'bottom'].flatMap((slot) => (visible[slot] ? [visible[slot]] : [])))
      }
    }
    group.length = 0
    visible = {}
    phases.push([])
  }
  for (const command of source.turnStart) {
    if (command.opcode === 0x05) flush()
    else group.push(command)
  }
  flush()
  return phases
}

function checkInnPresentation(
  { events, resources },
  draws,
  { entered, trigger, entry, menu, control },
) {
  const issues = []
  const check = (rule, expected, actual) => {
    const issue = difference(expected, actual)
    if (issue) issues.push({ rule, ...issue })
  }
  const phases = expectedInnDialogue()
  const fullPages = []
  let retainedGap
  let index = 0
  for (const { atMs, scene, slots } of draws) {
    if (scene !== spec.scene || atMs < entry.atMs || atMs > menu.atMs) continue
    const actual = slots
      .map(({ speaker: name, lines, slot, portrait, portraitLayout }) => ({
        slot,
        portrait,
        portraitLayout,
        speaker: speaker(name),
        lines: lines.map(subtitle).filter(Boolean),
      }))
      .sort((a, b) => (a.slot === b.slot ? 0 : a.slot === 'top' ? -1 : 1))
    const expected = phases[index]
    if (isDeepStrictEqual(expected, actual)) {
      if (actual.length) fullPages.push({ atMs, slots: actual })
      index += 1
      continue
    }
    const previous = phases[index - 1]
    if (isDeepStrictEqual(previous, actual)) continue
    const retained = expected?.find((page) =>
      previous?.some((visible) => isDeepStrictEqual(visible, page)),
    )
    if (retained && !retainedGap && !actual.some((page) => isDeepStrictEqual(page, retained))) {
      retainedGap = {
        rule: 'retained inn dialogue slot disappeared',
        phase: index + 1,
        atMs,
        retained,
        actual,
      }
    }
    if (!actual.length) continue
    const printsExpected = actual.every(({ lines, ...style }) =>
      expected?.some(
        ({ lines: text, ...page }) =>
          isDeepStrictEqual(style, page) && lines.every((line, row) => text[row]?.startsWith(line)),
      ),
    )
    if (!printsExpected && !issues.length)
      issues.push({ rule: 'unexpected inn dialogue draw', phase: index + 1, expected, actual })
  }
  check(
    'inn battle dialogue completed every page and clear before the command menu',
    phases.length,
    index,
  )
  if (retainedGap) issues.push(retainedGap)

  const [start, duplicate] = events.filter(({ kind }) => kind === 'entrance-drawn')
  assert(start && !duplicate, 'one first visible inn entrance')
  assert.equal(start.scene, spec.scene)
  assert(entered.order < start.order && start.order < trigger.order)
  assert(
    events.some(({ kind, order }) => kind === 'world-drawn' && order === start.order - 1),
    'the entrance receipt must bind to an actual draw',
  )
  const formation = (frame) =>
    frame && {
      leader: frame.leader,
      camera: frame.camera,
      actors: Object.fromEntries(
        Object.entries(frame.actors).map(([id, { asset, position, facing, frame }]) => [
          id,
          { asset, position, facing, frame },
        ]),
      ),
    }
  check('inn actors on the first visible entrance draw', source.inn.start, formation(start))
  check('inn actors on the script return first draw', source.inn.returned, formation(control))
  check(
    'the departed Taoist stays absent throughout the later inn visit',
    [],
    events
      .filter(
        ({ kind, scene, actors }) => kind === 'world-drawn' && scene === spec.scene && actors.e62,
      )
      .map(({ atMs, actors }) => ({ atMs, actor: actors.e62 })),
  )
  const chaseFrames = events.filter(
    ({ kind, order }) => kind === 'world-drawn' && order > start.order && order < trigger.order,
  )
  const chase =
    spec.owner === 'e59'
      ? undefined
      : Object.fromEntries(
          Object.entries(source.inn.chase).map(([id, { stride, step }]) => {
            const original = source.inn.start.actors[id]
            const frames = chaseFrames.map(({ order, atMs, leader, actors }) => ({
              order,
              atMs,
              leader,
              actor: actors[id] ?? null,
            }))
            const moves = []
            let previous = original.position
            for (const sample of frames) {
              if (!sample.actor || isDeepStrictEqual(sample.actor.position, previous)) continue
              moves.push(sample)
              previous = sample.actor.position
            }
            // Every approach starts with two unobstructed chases. The door entry and the
            // half-step rule come from 0x46 and 0x4c. A later collision can change the path.
            const expected = [1, 2].map((index) => ({
              position: original.position.map((value, axis) => value + index * step[axis]),
              facing: original.facing,
              frame: original.frame + (index % 2),
            }))
            const first = moves.slice(0, expected.length)
            check(`inn chase ${id} drew two consecutive steps`, expected.length, first.length)
            check(
              `inn chase ${id} stride and gait`,
              expected,
              expected.map((_, index) => {
                const actor = first[index]?.actor
                return (
                  actor && {
                    position: actor.position,
                    facing: actor.facing,
                    frame: actor.frame,
                  }
                )
              }),
            )
            if (first.length === 2) {
              const intervalMs = first[1].atMs - first[0].atMs
              // The 100 ms world tick is observed at draw time, up to two display frames later.
              if (intervalMs < 70 || intervalMs > 135)
                issues.push({ rule: `inn chase ${id} world cadence`, actual: intervalMs })
            }
            return [id, { stride, step, frames }]
          }),
        )
  const byOrder = new Map(resources.map((resource) => [resource.order, resource]))
  const drawnSprites = (frame) =>
    frame &&
    Object.fromEntries(
      Object.entries(frame.actors).map(([id, { rect, resource }]) => {
        const { width, height, pixels, opaque } = byOrder.get(resource)
        return [id, { rect, rgba: sha256(JSON.stringify([width, height, pixels, opaque])) }]
      }),
    )
  return {
    issues,
    fullPages,
    start,
    chase,
    returned: control,
    actorPixels: [start, control].map(drawnSprites),
  }
}

function checkTombPresentation({ events, resources }, draws, { trigger, launch, won, control }) {
  const original = source.tomb
  const issues = []
  const check = (rule, expected, actual) => {
    const issue = difference(expected, actual)
    if (issue) issues.push({ rule, ...issue })
  }
  const world = events.filter(({ kind }) => kind === 'world-drawn')
  if (source.preludePartyLayer !== undefined) {
    const drawn = world.filter(
      ({ scene, order }) => scene === spec.scene && trigger.order < order && order < control.order,
    )
    check(
      'actual party layer in the restored blood pool',
      [source.preludePartyLayer],
      [...new Set(drawn.map(({ partyLayer }) => partyLayer))],
    )
  }
  const firstSpeech = draws.find(
    ({ scene, atMs, slots }) =>
      scene === spec.scene && atMs > trigger.atMs && atMs < launch.atMs && slots.length > 0,
  )
  assert(firstSpeech, 'the speech after the boss reveal was not rendered')
  const rise = []
  for (const frame of world) {
    if (frame.order <= trigger.order || frame.atMs > firstSpeech.atMs) continue
    const actor = frame.actors[original.actor]
    if (actor && actor.frame !== rise.at(-1)?.frame) rise.push({ ...actor, atMs: frame.atMs })
  }
  if (handoff && rise[0]?.frame !== 0) {
    const previous = world.findLast(
      ({ order, scene, actors }) =>
        order < trigger.order && scene === spec.scene && actors[original.actor],
    )
    if (previous) rise.unshift({ ...previous.actors[original.actor], atMs: previous.atMs })
  }
  check(
    'all reveal frames painted before speech',
    original.poses,
    rise.map(({ frame }) => frame),
  )
  for (const pose of rise)
    check(
      'revealing actor feet and sprite',
      [original.position, original.asset],
      [pose.position, pose.asset],
    )
  const stopMusic =
    handoff &&
    events.find(
      ({ kind, order }) => kind === 'music-stop' && order > trigger.order && order < launch.order,
    )
  if (handoff) assert(stopMusic, 'music stops before the coffin begins to open')
  const intervals = rise.slice(1).map(({ atMs }, index) => {
    const previous = rise[index].atMs
    return atMs - (stopMusic && index === 0 ? Math.max(stopMusic.atMs, previous) : previous)
  })
  for (const [index, actual] of intervals.entries()) {
    const expected = original.intervals[index]
    if (Math.abs(actual - expected) > 50)
      issues.push({ rule: 'drawn boss reveal cadence', step: index + 1, expected, actual })
  }
  const visibleBeforeSpeech = rise.length > 0 ? firstSpeech.atMs - rise[0].atMs : 0
  if (
    (!handoff && Math.abs(visibleBeforeSpeech - original.beforeTalkMs) > 100) ||
    (handoff &&
      firstSpeech.atMs - (rise.at(-1)?.atMs ?? firstSpeech.atMs) < original.beforeTalkMs - 50)
  )
    issues.push({ rule: 'speech must follow the full reveal', actual: visibleBeforeSpeech })

  const arrival = []
  if (original.arrival) {
    const lead = control.party?.map(({ id, spriteId, frame, world }) => ({
      id,
      sprite: typeof spriteId === 'number' ? spriteId : source.spriteChunks.get(spriteId),
      frame,
      world,
    }))
    check(
      'first visible handoff costume and party',
      [{ id: 'li-xiaoyao', ...original.arrival, world: control.leader }],
      lead,
    )
    const successorFrames = world.filter(
      ({ scene, order, atMs }) =>
        scene === handoff.scene && order >= control.order - 1 && atMs <= control.atMs + 2350,
    )
    for (const [actor, { asset, position, frame, facing: direction, turns }] of Object.entries(
      original.arrivalActors,
    )) {
      check(
        `returned actor ${actor} remains in the visible cast`,
        [],
        successorFrames
          .filter((sample) => sample.visible && !sample.actors[actor])
          .map(({ order }) => order),
      )
      const poses = []
      for (const sample of successorFrames) {
        const draw = sample.actors[actor]
        if (!draw) continue
        const { atMs } = sample
        const pose = {
          asset: draw.asset,
          position: draw.position,
          frame: draw.frame,
          facing: draw.facing,
        }
        if (isDeepStrictEqual(poses.at(-1)?.pose, pose)) continue
        poses.push({ atMs, pose, resource: draw.resource, rect: draw.rect })
      }
      const expected = [{ ms: 0, frame, facing: direction }, ...turns]
      check(
        `returned actor ${actor} pose sequence`,
        expected.map(({ frame, facing }) => ({ asset, position, frame, facing })),
        poses.map(({ pose }) => pose),
      )
      for (const [index, { atMs }] of poses.entries()) {
        const actual = atMs - control.atMs
        if (expected[index] && Math.abs(actual - expected[index].ms) > 65)
          issues.push({
            rule: `returned actor ${actor} turn time`,
            step: index,
            expected: expected[index].ms,
            actual,
          })
      }
      arrival.push({ actor, poses })
    }
    const falseReturn = world.find(
      ({ order, scene, colors, visible }) =>
        scene === spec.scene &&
        won.order < order &&
        order < control.order &&
        (visible ?? colors.some(([r, g, b]) => r || g || b)),
    )
    if (falseReturn)
      issues.push({ rule: 'source scene flashed before the direct handoff', actual: falseReturn })
    const music = events.find(
      ({ kind, track, context, order }) =>
        kind === 'music-start' &&
        track === source.successorTrack &&
        context === 'running' &&
        won.order < order,
    )
    assert(music, 'authored handoff music reached the audio output')
  }

  let rewardMs
  if (original.reward) {
    const visible = ({ slots }) =>
      slots.some(({ slot, lines }) => slot === 'narration' && lines.join('') === original.reward)
    const note = draws.find((draw) => draw.atMs > won.atMs && visible(draw))
    const cleared = note && draws.find((draw) => draw.atMs > note.atMs && !visible(draw))
    assert(note && cleared, 'earned item notice must be visibly shown and cleared')
    rewardMs = cleared.atMs - note.atMs
    if (Math.abs(rewardMs - 1400) > 45)
      issues.push({ rule: 'earth bead notice dwell', actual: rewardMs })
  }
  let quake
  if (original.quake) {
    const { frames, level, steps, stepMs } = original.quake
    const finalFrames = events.filter(
      ({ kind, scene, order }) =>
        kind === 'scene-composite' &&
        scene === spec.scene &&
        order > won.order &&
        order < control.order,
    )
    quake = finalFrames.filter(({ ditherStep }) => ditherStep !== undefined)
    check(
      'all dither steps reached the final screen',
      Array.from({ length: steps + 1 }, (_, step) => step),
      [...new Set(quake.map(({ ditherStep }) => ditherStep))],
    )
    check(
      'reward panel cleared before the dither snapshot',
      true,
      quake[0]?.ditherStep === 0 && quake[0].notePlatePixels < 64,
    )
    const start = quake[0]?.atMs
    for (const { atMs, ditherStep, shift, black } of quake) {
      const countdown = frames - ditherStep + 1
      const expected = ditherStep > 0 && countdown > 0 ? (countdown % 2 ? -level : level) : 0
      check(`composited quake step ${ditherStep}`, [expected, expected !== 0], [shift, black])
      if (Math.abs(atMs - start - ditherStep * stepMs) > 75)
        issues.push({ rule: 'dither output cadence', step: ditherStep, actual: atMs - start })
    }
    if (frames === steps) {
      const trailing = finalFrames.filter(
        ({ order, shift }) => order > (quake.at(-1)?.order ?? won.order) && shift !== 0,
      )
      check('no quake bleeds into the following dialogue', [], trailing)
    }
  }
  const dialogue = [
    [source.pre, trigger, launch],
    [source.post, won, control],
  ].flatMap(([commands, from, until]) => {
    let at = from.atMs
    const presented = draws.filter(
      ({ scene, atMs }) => scene === spec.scene && atMs >= at && atMs < until.atMs,
    )
    const pages = expectedDialoguePages(commands).flatMap(({ lines, ...heading }) => {
      const result = []
      for (let i = 0; i < lines.length; i += 4)
        result.push({ ...heading, lines: lines.slice(i, i + 4) })
      return result
    })
    return pages.map((page) => {
      const witness = presented.find(
        ({ atMs, slots }) =>
          atMs >= at &&
          slots.some(
            ({ portrait, slot, portraitLayout, speaker: heading, lines }) =>
              portrait === page.portrait &&
              slot === page.slot &&
              speaker(heading) === page.speaker &&
              portraitLayout === (page.portrait !== null) &&
              isDeepStrictEqual(lines.map(subtitle), page.lines),
          ),
      )
      if (!witness)
        issues.push({ rule: 'rendered dialogue page, portrait, speaker and slot', expected: page })
      else at = witness.atMs
      return { ...page, atMs: witness?.atMs }
    })
  })
  const rawSprites = new Map(resources.map((item) => [item.order, item]))
  const paintDigest = (resource) => {
    const { width, height, pixels, opaque } = rawSprites.get(resource)
    return sha256(JSON.stringify([width, height, pixels, opaque]))
  }
  const pixels = rise.map(({ resource }) => paintDigest(resource))
  const arrivalPixels = arrival.map(({ actor, poses }) => ({
    actor,
    draws: poses.map(({ resource, rect }) => ({ rect, pixels: paintDigest(resource) })),
  }))
  return {
    issues,
    rise,
    intervals,
    firstSpeech,
    arrival,
    arrivalPixels,
    rewardMs,
    quake,
    dialogue,
    pixels,
  }
}

function checkRingPresentation(
  events,
  draws,
  { trigger, launch, entry, menu, won, control },
  game,
) {
  const expected = source.ring
  const window = (event) => event.atMs > entry.atMs && event.atMs < menu.atMs
  const audible = (event) => event.context === 'running'
  const dialogue = draws
    .filter((draw) => window(draw) && draw.scene === spec.scene && draw.slots.length > 0)
    .map(({ atMs, slots }) => ({
      atMs,
      slots: slots.map(({ slot, speaker: name, portrait, portraitLayout, lines }) => ({
        slot,
        speaker: speaker(name),
        portrait,
        portraitLayout,
        lines: lines.map(subtitle).filter(Boolean),
      })),
    }))
  const pages = expectedDialoguePages(source.turnStart).map((page) => ({
    ...page,
    portraitLayout: true,
  }))
  assert.equal(pages.length, 6, 'six original battle pages')
  const full = pages.map((page, i) => {
    const slots = i === 4 ? [page, pages[3]] : [page]
    const draw = dialogue.find(
      ({ slots: actual }) =>
        actual.length === slots.length &&
        slots.every((slot) => actual.some((candidate) => isDeepStrictEqual(candidate, slot))),
    )
    assert(draw, `missing ring battle page ${i + 1} with all intended portraits`)
    return draw
  })
  assert(
    full.every(({ atMs }, i) => i === 0 || full[i - 1].atMs < atMs),
    'ring page order',
  )

  const stop = events.find(
    (event) =>
      window(event) &&
      event.kind === (game ? 'music-stop' : 'music-fade-out') &&
      event.track === spec.music &&
      audible(event),
  )
  assert(stop, 'native battle track stops or starts fading at the script cue')
  if (!game) assert.equal(stop.ms, expected.fadeMs, 'authored battle fade duration')
  assert(full[4].atMs < stop.atMs && stop.atMs < full[5].atMs, 'music stop between the two pages')
  const effects = events.filter(
    (event) => window(event) && event.kind === 'sfx-start' && event.asset === expected.cue,
  )
  assert.equal(effects.length, 1, 'ring challenge sound plays once')
  const [sound] = effects
  assert(audible(sound) && sound.atMs > full[5].atMs, 'sound follows the final timed line')
  assert(dialogue.at(-1).atMs < sound.atMs, 'battle dialogue is cleared before the sound')
  const restart = events.find(
    (event) =>
      event.kind === 'music-start' && event.track === expected.restartTrack && window(event),
  )
  assert(restart && audible(restart), 'native duel music starts before player selection')
  const waitMs = restart.atMs - sound.atMs
  assert(
    Math.abs(waitMs - expected.waitMs) < 100,
    `ring duel music after source wait (${waitMs}ms, expected ${expected.waitMs}ms)`,
  )

  const frames = events.filter(({ kind }) => kind === 'world-drawn')
  const visible = ({ colors }) => colors.some(([r, g, b]) => r || g || b)
  const moves = []
  for (const frame of frames) {
    if (frame.order <= trigger.order || frame.order >= launch.order) continue
    const actor = frame.actors.e548
    if (!actor || isDeepStrictEqual(moves.at(-1)?.position, actor.position)) continue
    moves.push({ atMs: frame.atMs, camera: frame.camera, ...actor })
  }
  assert.deepEqual(
    moves.map(({ position }) => position),
    expected.movements,
    'Yueru actual movement',
  )
  assert(
    moves.every(({ frame, asset }) => Number.isInteger(frame) && asset === expected.yueruSprite),
    'Yueru uses the actual movement sprite',
  )
  let nextStep = 1
  const movementIntervals = expected.movementBeats.map(({ count, intervalMs }, i) => {
    const run = moves.slice(nextStep, nextStep + count)
    nextStep += count
    const intervals = run.slice(1).map(({ atMs }, index) => atMs - run[index].atMs)
    assert(
      intervals.every((elapsed) => Math.abs(elapsed - intervalMs) <= 50),
      `ring movement ${i + 1} cadence: ${JSON.stringify(intervals)}ms`,
    )
    return intervals
  })
  const returned = frames.find(
    (frame) => frame.order > won.order && frame.scene === spec.scene && visible(frame),
  )
  assert(returned && returned.order < control.order, 'actual first visible ring return')
  assert.deepEqual(
    [returned.leader, returned.camera],
    [expected.leader, expected.camera],
    'ring return at the source party position and camera anchor',
  )
  assert.deepEqual(
    [returned.actors.e547 ?? null, returned.actors.e548?.position, returned.actors.e551?.position],
    [null, expected.movements.at(-1), expected.patriarch],
    'ring winner and Lin family actors at the actual first visible return',
  )
  const successorMusic = events.find(
    (event) =>
      event.kind === 'music-start' &&
      event.track === expected.successorTrack &&
      event.order > returned.order,
  )
  assert(
    successorMusic && audible(successorMusic) && successorMusic.order < control.order,
    'Lin family music starts before the first visible frame',
  )
  for (const frame of frames.filter((frame) => frame.scene === control.scene && visible(frame))) {
    assert.deepEqual(
      [frame.camera, frame.leader],
      [control.camera, control.leader],
      'successor geometry throughout the recorded entrance',
    )
  }
  return { full, stop, sound, restart, waitMs, moves, movementIntervals, returned, successorMusic }
}

function checkThiefForeground(events, draws, { trigger, launch, won, control }, game) {
  const issues = []
  const expect = (condition, rule, actual) => {
    if (!condition) issues.push({ rule, actual })
  }
  const worldFrames = events.filter(({ kind }) => kind === 'world-drawn')
  const pre = worldFrames.filter(({ order }) => order >= trigger.order && order < launch.order)
  const post = worldFrames.filter(
    ({ order, atMs }) => order > won.order && atMs <= control.atMs + 34,
  )
  const initial = pre.find(({ ambience, changing }) => ambience === 'night' && !changing)
  const day = post.find(({ ambience, changing }) => ambience === 'day' && !changing)
  const palette = events.find(
    (event) =>
      event.order > won.order && (game ? event.ip === 13843 : event.op === 'toggleDayNight'),
  )
  const expectedPages = [
    {
      slot: 'top',
      speaker: null,
      portrait: null,
      lines: source.pre.slice(2, 3).map((row) => row.text),
    },
    {
      slot: 'bottom',
      speaker: '女飞贼',
      portrait: 41,
      lines: source.post
        .filter(({ messageIndex }) => [4608, 4609].includes(messageIndex))
        .map((row) => row.text),
    },
    {
      slot: 'bottom',
      speaker: '林月如',
      portrait: 22,
      lines: source.post.filter(({ messageIndex }) => messageIndex === 4611).map((row) => row.text),
    },
  ]
  const painted = expectedPages.map((page, index) => {
    const opening = index === 0
    const start = opening ? trigger.atMs : won.atMs
    const end = opening ? launch.atMs : control.atMs
    const frames = draws.filter(
      ({ atMs, scene, slots }) =>
        scene === spec.scene &&
        atMs >= start &&
        atMs <= end &&
        slots.some(
          ({ speaker: heading, lines }) => speaker(heading) === page.speaker && lines.length > 0,
        ),
    )
    const full = frames.find(({ slots }) =>
      slots.some(({ lines }) => isDeepStrictEqual(lines.map(subtitle), page.lines.map(subtitle))),
    )
    const first = frames[0]
    const slot = full?.slots.find(({ speaker: heading }) => speaker(heading) === page.speaker)
    const actual = slot && {
      slot: slot.slot,
      speaker: speaker(slot.speaker),
      portrait: slot.portrait,
      lines: slot.lines,
      portraitLayout: slot.portraitLayout,
    }
    expect(
      actual &&
        isDeepStrictEqual(
          { ...actual, lines: actual.lines.map(subtitle) },
          { ...page, lines: page.lines.map(subtitle), portraitLayout: page.portrait !== null },
        ),
      `rendered dialogue ${index + 1}`,
      actual ?? null,
    )
    return { firstMs: first?.atMs ?? null, full: actual ?? null }
  })
  expect(initial, 'settled night frame before entering battle', pre[0] ?? null)
  expect(
    post[0]?.ambience === 'night' && !post[0].changing,
    'first world frame still at night',
    post[0] ?? null,
  )
  for (const [rule, frame] of [
    ['contact', initial],
    ['world return', post[0]],
  ]) {
    if (!frame) {
      expect(false, `${rule} frame present`, null)
      continue
    }
    expect(
      isDeepStrictEqual(frame.camera, [1088, 144]) && isDeepStrictEqual(frame.leader, [1248, 256]),
      `${rule} first camera and leader`,
      frame,
    )
    const thief = frame.actors[spec.owner]
    const standIn = frame.actors.e1630
    expect(
      thief?.asset === 350 &&
        thief.frame === 3 &&
        thief.facing === 'left' &&
        isDeepStrictEqual(thief.position, [1296, 280]),
      `${rule} thief pose`,
      thief ?? null,
    )
    expect(
      standIn?.asset === 380 && isDeepStrictEqual(standIn.position, [1312, 272]),
      `${rule} second actor draw`,
      standIn ?? null,
    )
  }
  const paletteMs = day && palette ? day.atMs - palette.atMs : null
  expect(
    paletteMs !== null && paletteMs >= 775 && paletteMs <= 1050,
    '800 ms palette transition',
    paletteMs,
  )
  expect(
    day && painted[1].firstMs !== null && painted[1].firstMs >= day.atMs - 20,
    'dawn finishes before the first rendered line',
    { dayMs: day?.atMs, firstLineMs: painted[1].firstMs },
  )
  const colorWeight = (frame) => frame?.colors.reduce((total, [r, g, b]) => total + r + g + b, 0)
  expect(
    initial && day && colorWeight(initial) > 0 && colorWeight(day) > colorWeight(initial),
    'visible brightening at the unchanged camera',
    { night: colorWeight(initial), day: colorWeight(day) },
  )

  const jump = events.filter(
    ({ kind, asset, order }) =>
      kind === 'sfx-start' && asset === 45 && order > won.order && order < control.order,
  )
  expect(jump.length === 1, 'one actual jump sound', jump)
  const thiefDraws = post.filter(({ actors }) => actors[spec.owner])
  const firstStep = thiefDraws.find(({ actors }) => actors[spec.owner].position[1] === 288)
  const lastJump = thiefDraws.find(({ actors }) => actors[spec.owner].position[1] === 452)
  const hidden =
    lastJump && post.find(({ actors, order }) => order > lastJump.order && !actors[spec.owner])
  expect(
    hidden && painted[2].firstMs !== null && hidden.atMs < painted[2].firstMs,
    'thief finishes escape before Lin Yueru speaks',
    { hiddenMs: hidden?.atMs, firstLineMs: painted[2].firstMs },
  )
  const positions = []
  if (firstStep && lastJump) {
    for (const { actors, leader, order } of thiefDraws) {
      if (order < firstStep.order || order > lastJump.order) continue
      const pose = actors[spec.owner]
      const frame = [pose.position, pose.frame, pose.facing, leader]
      if (!isDeepStrictEqual(frame, positions.at(-1))) positions.push(frame)
    }
  }
  const afterJump = [
    [20, 8],
    [16, 8],
    [12, 8],
    [8, 10],
    [4, 12],
    [0, 14],
    [0, 16],
  ]
  const sources = []
  let [x, y] = [1104, 376]
  for (const [dx, dy] of afterJump) {
    x -= dx
    y += dy
    sources.push([[x, y], 13, 'down'])
  }
  const jumps = positions.map((frame) => frame.slice(0, 3)).filter(([[, y]]) => y > 376)
  expect(isDeepStrictEqual(jumps, sources), 'all seven drawn leap positions', jumps)
  const leaderRoute = [
    [55, -23, 0],
    [56, -23, 0],
    [57, -23, 0],
    ...Array.from({ length: 11 }, (_, step) => [58, -22 + step, 0]),
  ]
  const paints = events.filter(({ kind, surface }) => kind === 'paint' && surface === 'world')
  function formationAt(frame, reason) {
    const party = frame?.geometry?.party
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((member) => ({
        role: member.id,
        position: member.world,
        frame: member.frame,
        sprite:
          typeof member.spriteId === 'string'
            ? source.spriteChunks.get(member.spriteId)
            : member.spriteId,
      }))
    expect(
      party?.length === 2 &&
        party.every(({ frame, sprite }) => Number.isInteger(frame) && Number.isInteger(sprite)),
      reason,
      { position: frame?.position, party },
    )
    return party ?? null
  }
  const arrival = paints.find(({ order }) => order > trigger.order && order < launch.order)
  const contactFormation = formationAt(arrival, 'both party sprites on the first contact frame')
  const afterVictory = paints.filter(({ order }) => order > won.order && order < control.order)
  const formations = leaderRoute.map((position) =>
    formationAt(
      afterVictory.find((entry) => isDeepStrictEqual(entry.position, position)),
      'both party sprites at the actual route footstep',
    ),
  )
  return {
    issues,
    paletteMs,
    painted,
    positions,
    formations,
    contactFormation,
    jumpMs: jump[0]?.atMs,
    hiddenMs: hidden?.atMs,
  }
}

function checkSpiderForeground(events, trigger, cue, launch) {
  const paint = events.filter(
    ({ kind, order, surface }) =>
      kind === 'paint' && surface === 'world' && order > trigger.order && order < launch.order,
  )
  const warning = paint.find(
    ({ box }) => box?.text === '月如～小心！' && box.phase.startsWith('waiting'),
  )
  assert(warning && warning.order < cue.order, 'the warning was painted before 182 started')
  const [col, row, height] = spec.contact
  const movement = [0.5, 1, 1.5, 2].map((delta) => {
    const frame = paint.find(
      (event) =>
        event.order > cue.order && isDeepStrictEqual(event.position, [col + delta, row, height]),
    )
    assert(frame, `missing painted spider nudge ${delta} cells from contact`)
    return frame
  })
  const speech = paint.find(
    ({ box, order }) => order > movement.at(-1).order && speaker(box?.speaker) === '黑蜘蛛',
  )
  assert(speech, 'missing the spider dialogue after the fourth nudge')
  const observed = [cue, ...movement, speech]
  assert(observed.slice(1).every((event, i) => event.order > observed[i].order))
  const intervals = observed.slice(1).map((event, i) => event.atMs - observed[i].atMs)
  const expected = [400, 100, 100, 100, 200]
  const samplingTolerance = [90, 44, 44, 44, 60]
  for (const [i, duration] of intervals.entries()) {
    assert(
      Math.abs(duration - expected[i]) <= samplingTolerance[i],
      `Black Spider foreground beat ${i + 1}: ${duration.toFixed(1)} ms, original ${expected[i]} ms`,
    )
  }
  const spiderPosition = ({ actors }) =>
    actors.find(({ id, state }) => id === 'e2347' && state === 1)?.position
  const spiderSteps = []
  for (const frame of paint) {
    if (frame.order <= cue.order || frame.order > speech.order) continue
    const position = spiderPosition(frame)
    if (position && !isDeepStrictEqual(spiderSteps.at(-1)?.position, position))
      spiderSteps.push({ atMs: frame.atMs, position })
  }
  const originalSpiderPath = [
    [61.125, 25.125, 0],
    [61.375, 25.375, 0],
    [61.875, 25.875, 0],
    [62.625, 26.625, 0],
    [63.625, 27.625, 0],
    [64.75, 28.75, 0],
    [65.875, 29.875, 0],
    [67, 31, 0],
  ]
  assert.deepEqual(
    movement.map(spiderPosition),
    originalSpiderPath.slice(3, 7),
    'Black Spider pose drawn in the same frame as each party nudge',
  )
  assert.deepEqual(
    spiderSteps.map(({ position }) => position),
    originalSpiderPath,
  )
  assert.deepEqual(spiderPosition(speech), originalSpiderPath.at(-1))
  const firstSpiderStep = spiderSteps[0].atMs - cue.atMs
  assert(
    Math.abs(firstSpiderStep - 100) <= 50,
    `Black Spider starts moving after the first world tick: ${firstSpiderStep.toFixed(1)} ms`,
  )
  return {
    intervalsMs: intervals,
    soundAtMs: cue.atMs,
    spiderSteps,
    movement: movement.map((frame) => ({
      atMs: frame.atMs,
      position: frame.position,
      spiderPosition: spiderPosition(frame),
    })),
    speechAtMs: speech.atMs,
    speechSpiderPosition: spiderPosition(speech),
  }
}

async function inspect(path, engine) {
  const bytes = await readFile(path)
  const report = JSON.parse(bytes)
  const game = engine === 'game'
  assert.equal(report.engine, engine)
  assert.equal(report.fragment, spec.id)
  assert.deepEqual(report.input, spec)
  assert.equal(report.status, 'passed', report.failure)
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.cleanupErrors ?? [], [])
  assert.equal(report.inputExecution.status, 'passed')
  assertInputLedger(report.actions, { requireReceipts: true })
  const steps = entranceSteps(spec)
  const revisitRoutes = source.toad
    ? [
        ['revisit-enter', spec.scene, source.toad.steps.into],
        ['revisit-leave', revisit.scene, source.toad.steps.out],
        ['revisit-cave', spec.scene, source.toad.steps.approach],
      ]
    : []
  const routeInputs = [
    ['approach', [approachKey]],
    ...(leavesByScript ? [] : [['exit', [exitKey]]]),
    ...(entrance
      ? [
          ['entrance', [entrance.key]],
          ['inn-walk', steps.map(({ key }) => key)],
        ]
      : []),
    ...revisitRoutes.map(([phase, , moves]) => [phase, moves.map(({ key }) => key)]),
  ]
  if (spec.interact)
    assert.deepEqual(
      report.actions
        .filter(({ phase }) => phase === 'interact')
        .map(({ kind, key }) => [kind, key]),
      [['press', game ? 'Space' : 'Enter']],
      'one physical interaction after the approach step',
    )
  if (source.tian) {
    const keys = {
      interact: game ? 'Space' : 'Enter',
      'open-jar-highlight': 'ArrowRight',
      'open-jar-confirm': game ? 'Space' : 'Enter',
    }
    for (const [phase, key] of Object.entries(keys))
      assert.deepEqual(
        report.actions.filter((action) => action.phase === phase).map((action) => action.key),
        [key],
        `one physical press for ${phase}`,
      )
  }
  for (const [phase, keys] of routeInputs)
    assert.deepEqual(
      report.actions.filter((a) => a.phase === phase).map((a) => [a.kind, a.key]),
      keys.flatMap((key) => [
        ['down', key],
        ['up', key],
      ]),
      `physical held keys for ${phase}`,
    )
  if (revisit) {
    const confirm = game ? 'Space' : 'Enter'
    for (const [phase, scene] of [
      ['revisit-dialogue', revisit.scene],
      ['before-dialogue', spec.scene],
    ]) {
      const pages = source.toad.pages.filter((page) => page.scene === scene)
      assert.deepEqual(
        report.actions.filter((a) => a.phase === phase).map((a) => [a.kind, a.key]),
        pages.map(() => ['press', confirm]),
        `one physical confirmation per painted page for ${phase}`,
      )
    }
  }
  assert.deepEqual(
    report.contexts.map(({ label, initialDatabases }) => [label, initialDatabases]),
    game
      ? [
          ['canonical-boot', []],
          [spec.id, []],
        ]
      : [[spec.id, []]],
  )
  const [run] = report.cases
  const read = async (ref) => {
    const binding = await readEvidenceArtifact(dirname(path), ref)
    assert.equal(binding.binding.status, 'verified')
    return binding.value
  }
  const [saved, raw] = await Promise.all([read(report.save), read(run.raw)])
  if (game) {
    assert.equal(gameScene({ scene: checkpointScene }), saved.gs.wNumScene)
    assert.deepEqual(
      saved.gs.partyMembers,
      party.map(({ roleId }) => roleId),
    )
    assert.equal(run.slotReadback, report.save.sha256)
    if (source.inn) assert.equal(saved.gs.allEventObjects.find(({ id }) => id === 62)?.sState, 0)
    if (spec.accessory)
      assert.equal(saved.gs.PlayerRolesRuntime.rgwEquipment[5][0], Number(spec.accessory))
    if (revisit) {
      assert.equal(saved.gs.sceneOnEnterIp[gameScene({ scene: revisit.scene })], revisit.hookIp)
      assert.equal(saved.gs.allEventObjects.find(({ id }) => id === 1846)?.sState, 0)
    }
  } else {
    const readback = await read(run.slotReadback)
    assert.deepEqual(readback.position, {
      sceneId: checkpointScene,
      pos: grid(entrance?.start ?? revisit?.checkpoint ?? spec.start),
      facing: facing(entrance?.key ?? source.toad?.steps.into[0].key ?? approachKey),
    })
    assert.equal(readback.version, saved.version)
    assert.equal(readback.contentVersion, saved.contentVersion)
    assert.deepEqual(readback.world.party, saved.world.party)
    if (source.inn) assert.equal(readback.world.script.entityState[spec.scene]?.e62, 0)
    if (spec.accessory) assert.equal(readback.world.party[0].equipment.accessory, spec.accessory)
    if (revisit) {
      assert.deepEqual(readback.world.script.behaviors.scenes[revisit.scene]?.onEnter, {
        selection: { kind: 'use', value: revisit.hook },
      })
      assert.equal(readback.world.script.entityState[revisit.scene]?.e1846, 0)
    }
  }
  if (spec.sceneRoute?.predecessor) {
    const [visit] = spec.sceneRoute.visits
    if (game) assert.equal(saved.gs.sceneOnEnterIp[gameScene(visit)], visit.start)
    else {
      const readback = await read(run.slotReadback)
      assert.deepEqual(readback.world.script.behaviors.scenes[visit.scene]?.onEnter, {
        selection: { kind: 'use', value: visit.variant },
      })
    }
  }
  assert.equal(raw.engine, engine)
  assert.equal(raw.overflow, false)
  assert.deepEqual(raw.errors, [])
  assert.equal(raw.seed, spec.seed)
  const events = raw.events
  assert(events.length > 0)
  const resources = raw.resources ?? []
  if (observesForeground(spec)) {
    assert(resources.length > 0, 'actual decoded sprites')
    const orders = new Set(resources.map(({ order }) => order))
    for (const { kind, seq, width, height, pixels, opaque } of resources) {
      assert.equal(kind, 'sprite-frame')
      assert.equal(resources[seq]?.pixels, pixels)
      assert(
        width > 0 &&
          height > 0 &&
          pixels.length === width * height &&
          opaque.length === pixels.length,
      )
    }
    for (const { actors } of events.filter(({ kind }) => kind === 'world-drawn'))
      assert(
        Object.values(actors).every(({ resource }) => orders.has(resource)),
        'missing draw receipt',
      )
  }
  assert(
    events.every(({ seq }, i) => seq === i),
    'truncated event stream',
  )
  const nativeOrder = [...events, ...resources].sort((left, right) => left.order - right.order)
  assert(
    nativeOrder.every(
      ({ order, atMs }, i) =>
        order === i && Number.isFinite(atMs) && (i === 0 || atMs >= nativeOrder[i - 1].atMs),
    ),
    'unbound or out-of-order native evidence',
  )
  const find = (type) => events.filter(({ kind }) => kind === type)
  const once = (type) => {
    const hits = find(type)
    assert.equal(hits.length, 1, `${engine} ${type} event count`)
    return hits[0]
  }
  const trigger = once('trigger')
  const entered = entrance ? once('entrance-trigger') : undefined
  if (entrance) {
    const doorStep = once('entrance-move')
    assert.deepEqual(
      [doorStep.from, doorStep.to, doorStep.facing],
      [entrance.start, entrance.contact, facing(entrance.key)],
    )
    assert.deepEqual(
      [entered.scene, entered.owner, entered.position],
      [entrance.scene, entrance.owner, entrance.contact],
    )
    if (game) assert.equal(entered.ip, entrance.ip)
    assert(doorStep.order < entered.order && entered.order < trigger.order)
  }
  assert.deepEqual(
    [trigger.scene, trigger.owner, trigger.position],
    [contactScene, spec.owner, spec.contact],
  )
  const moves = events.filter(({ kind }) => kind === 'move' || (revisit && kind === 'route-move'))
  const [approach, departure] = moves.slice(
    steps.length + revisitRoutes.reduce((count, [, , entries]) => count + entries.length, 0),
  )
  assert.deepEqual(
    moves.map(({ from, to, facing }) => [from, to, facing]),
    [
      ...steps.map(({ from, to, key }) => [from, to, facing(key)]),
      ...revisitRoutes.flatMap(([, , entries]) =>
        entries.map(({ from, to, key }) => [from, to, facing(key)]),
      ),
      [spec.start, spec.contact, facing(approachKey)],
      ...(leavesByScript ? [] : [[returnedAt, departureAt, facing(exitKey)]]),
    ],
  )
  if (revisit)
    assert.deepEqual(
      moves.map(({ scene }) => scene),
      [
        ...revisitRoutes.flatMap(([, scene, entries]) => entries.map(() => scene)),
        spec.scene,
        spec.scene,
      ],
      'revisit moves are bound to the actual visited scenes',
    )
  assert(approach.order < trigger.order)
  const script = find('script-op')
  const launch = script.filter((event) => (game ? event.opcode === 7 : event.op === 'startBattle'))
  assert.equal(launch.length, 1)
  if (game) {
    assert.equal(trigger.ip, spec.disk.entry)
    assert.deepEqual([launch[0].ip, launch[0].operands], [spec.disk.battle, battleOperands(spec)])
    const caller = once('battle-caller')
    assert.deepEqual(
      [caller.enemyTeamId, caller.battleFieldId, caller.isBoss],
      [spec.team, spec.field, isBossBattle(spec)],
    )
  } else {
    assert.deepEqual(launch[0].path, [
      'initial',
      source.route?.launchPathIndex ??
        source.canonical.findIndex(({ kind }) => kind === 'startBattle'),
    ])
    if (!handoff) assert.equal(once('script-result').arm, scriptedDefeat ? 'onLose' : 'none')
  }
  const prepared = once('prepared')
  assert.deepEqual(
    [
      game ? prepared.field : once('field').fieldId,
      game ? prepared.music : Number(prepared.music.split('.').at(-1)),
      prepared.boss,
      prepared.auto,
    ],
    [spec.field, spec.music, isBossBattle(spec), Boolean(automatic)],
  )
  if (!game) assert.equal(prepared.team, `team-${spec.team}`)
  const preparedParty = prepared.players.map(({ id, roleId, hp, mp }) => [id ?? roleId, hp, mp])
  if (automatic) {
    assert.deepEqual(preparedParty, automatic.presentation.players)
  } else {
    assert.deepEqual(
      preparedParty,
      battleParty.map(({ role, hp, mp }) => [role, hp, mp]),
    )
  }
  const actualSlots = game ? prepared.slots : find('action')[0]?.slots
  assert(Array.isArray(actualSlots))
  assert.deepEqual(
    Array.from({ length: 5 }, (_, i) => actualSlots[i]?.id ?? null),
    source.slots,
  )

  const entry = once('entry-complete')
  const won = once('battle-finished')
  assert.deepEqual(
    find('entry-band').map(({ band }) => band),
    [0, 1, 2, 3, 4, 5, 6],
  )
  assert(find('entry-band').every(({ pixels }) => pixels.length === 6))
  const music = find('music-start').filter(
    ({ track, order }) =>
      track === spec.music && order > trigger.order && (!automatic || order < won.order),
  )
  const fieldTracks = find('music-start').filter(
    ({ track, context }) => track === fieldMusic && context === 'running',
  )
  assert(
    fieldTracks.some(({ order }) => order < trigger.order),
    'original field music started before contact',
  )
  assert.equal(music.length, 1)
  assert.equal(music[0].context, 'running')
  const menu = automatic ? undefined : once('command-menu-drawn')
  assert(prepared.order < entry.order, 'prepared before the native reveal')
  if (menu) assert(entry.order < menu.order, 'menu after the native reveal')
  else assert.deepEqual(find('command-menu-drawn'), [], 'automatic battle has no command menu')
  assert(
    entry.order < music[0].order && music[0].order < find('action')[0]?.order,
    'battle music audible after reveal and before the first executed combat action',
  )
  const commands = find('command').map(({ slot, turn, action }) => ({
    slot,
    turn,
    ...mainAction(action, game),
  }))
  if (!automatic)
    assert.deepEqual(
      commands.filter(({ turn }) => turn === 1).map(({ slot, kind }) => [slot, kind]),
      battleParty.map((_, slot) => [slot, 'defend']),
    )
  const battleKeys = report.actions.filter(({ phase }) => phase === 'battle-select')
  const dialogueInputs = automatic
    ? report.actions.filter(({ phase }) => ['before-dialogue', 'after-dialogue'].includes(phase))
    : []
  if (automatic) {
    assert.deepEqual(battleKeys, [], 'no manual commands in the original automatic battle')
    assert(
      dialogueInputs.length &&
        dialogueInputs.every(
          ({ kind, key }) => kind === 'press' && key === (game ? 'Space' : 'Enter'),
        ),
      'the story only receives physical advance keys at its dialogue prompts',
    )
  } else if (scriptedStop) {
    const expected = Array.from({ length: scriptedStop.turns }, (_, i) =>
      battleParty.map((_, slot) => ({
        slot,
        turn: i + 1,
        kind: 'defend',
        spell: null,
        target: null,
      })),
    ).flat()
    assert.deepEqual(commands, expected, 'each round before the scripted stop uses real guards')
    assert.deepEqual(
      battleKeys.map(({ key }) => key),
      expected.map(() => 'KeyD'),
    )
  } else {
    assert(
      commands
        .filter(({ turn }) => turn > 1)
        .every(
          ({ turn, kind, spell, target }) =>
            (kind === 'attack' ||
              (source.wood && kind === 'cast') ||
              (turn === spec.recovery?.turn && kind === 'cast' && spell === spec.recovery.skill)) &&
            Number.isInteger(target) &&
            target >= 0 &&
            target < source.slots.length,
        ),
    )
    assert(battleKeys.length > 0)
  }

  if (spec.recovery) {
    assert.deepEqual(
      commands.filter(({ kind }) => kind === 'cast'),
      [{ slot: 0, turn: spec.recovery.turn, kind: 'cast', spell: spec.recovery.skill, target: 0 }],
      'one self-heal submitted before the endangered round',
    )
  }

  const actions = find('action').map(({ turn, actor, action, party: members, slots }) => ({
    turn,
    side: game ? (actor.isEnemy ? 'enemy' : 'player') : action.side,
    slot: game ? actor.idx : action.idx,
    ...mainAction(action, game),
    hp: members.map(({ hp }) => hp),
    ...(automatic && { mp: members.map(({ mp }) => mp) }),
    enemies: Array.from({ length: 5 }, (_, i) => slots[i] ?? null),
  }))
  const enemy = actions.filter(({ side, slot }) => side === 'enemy' && slot === spec.slot)
  if (source.gai && spec.accessory) {
    assert.equal(commands.find(({ kind }) => kind === 'attack')?.target, 1)
    const poison = actions.flatMap(({ side, spell, hp }, i) =>
      side === 'enemy' && ['371', '376'].includes(spell)
        ? [{ spell, hp, previous: actions[i - 1].hp }]
        : [],
    )
    assert.deepEqual([...new Set(poison.map(({ spell }) => spell))].toSorted(), ['371', '376'])
    assert(
      poison.every(({ hp, previous }) => isDeepStrictEqual(hp, previous)),
      'the visible poison spells were resisted',
    )
  }
  if (source.wood) {
    const opening = source.wood.openingSpell
    assert.deepEqual(
      enemy.slice(0, 6).map(({ turn, kind, spell }) => [turn, kind, spell]),
      [
        [1, 'cast', opening],
        [2, 'cast', opening],
        [3, 'pass', null],
        [4, 'pass', null],
        [5, 'pass', null],
        [6, 'cast', source.wood.secondPhaseSpell],
      ],
      'both summon rounds and the changed spell actually occur',
    )
    for (const [index, turn] of [3, 4].entries()) {
      const { id, hp } = source.wood.summons[index]
      const actionIndex = actions.findIndex((action) => enemy[index + 2] === action)
      assert(actionIndex > 0)
      const { enemies: after } = actions[actionIndex]
      const { enemies: before } = actions[actionIndex - 1]
      const newSlot = after.findIndex(
        (unit, slot) => unit?.id === id && unit.hp === hp && !isDeepStrictEqual(unit, before[slot]),
      )
      assert(newSlot >= 0, `summoned actor actually enters during round ${turn}`)
      const nextSummon = index === 0 ? actions.indexOf(enemy[3]) : undefined
      const acts = actions
        .slice(actionIndex + 1, nextSummon)
        .some(
          ({ side, slot, enemies }) =>
            side === 'enemy' && slot === newSlot && enemies[slot]?.id === id,
        )
      assert.equal(
        acts,
        index === 1,
        `the first summon is defeated and the second acts after round ${turn}`,
      )
    }
    for (const { slot, turn, kind, spell, target } of commands.filter(({ turn }) => turn > 1)) {
      if (slot === 1 && turn >= 4) assert.deepEqual([kind, spell], ['cast', '374'])
      else if (slot === 0 && [7, 9].includes(turn))
        assert.deepEqual([kind, spell, target], ['cast', '299', turn === 7 ? 1 : 0])
      else assert.equal(kind, 'attack')
    }
  }
  if (source.toad)
    assert.deepEqual(
      enemy.slice(0, 3).map(({ kind, spell }) => [kind, spell]),
      source.toad.openingSpells,
      'the boss passes then casts the original spell twice',
    )
  const expectedEnemyActions = {
    45: Array(6).fill('attack'),
    44: ['cast', 'cast', 'pass', 'cast'],
    43: ['cast', 'cast', 'cast', 'attack'],
    29: ['cast', 'pass', 'cast'],
    21: ['cast', 'cast'],
  }[spec.team]
  if (expectedEnemyActions)
    assert.deepEqual(
      enemy.map(({ kind }) => kind),
      expectedEnemyActions,
    )
  if (source.original.dualMove)
    assert.equal(
      enemy.filter(({ turn }) => turn === 1).length,
      2,
      'the initial turn includes both boss actions',
    )
  if (spec.team === 21) assert(enemy.every(({ spell }) => spell === String(source.original.magic)))
  if (spec.team === 29)
    assert.deepEqual(
      enemy.map(({ spell }) => spell),
      ['381', null, '343'],
    )
  if (spec.team === 43) {
    assert.deepEqual(
      enemy.filter(({ kind }) => kind === 'cast').map(({ spell }) => spell),
      ['317', '317', '317'],
    )
    const nudges = script.filter(({ op, ip }) =>
      game ? [21678, 21680, 21682, 21684].includes(ip) : op === 'nudgeParty',
    )
    assert.equal(nudges.length, 4, 'four actual pre-battle nudge commands')
    assert(nudges.every(({ order }) => order < launch[0].order))
    assert(
      events.some(
        (e) =>
          e.kind === 'paint' &&
          e.order < launch[0].order &&
          e.actors.some(({ id, state }) => id === 'e2347' && state === 1),
      ),
    )
  }
  if (spec.team === 44) {
    assert.deepEqual(
      enemy.map(({ spell }) => spell),
      ['316', '303', null, '316'],
    )
    const summon = enemy.find(({ kind }) => kind === 'pass')
    assert.deepEqual(
      summon.enemies.map((slot) => slot.id),
      ['enemy-403', 'enemy-469', 'enemy-403', 'enemy-403', 'enemy-403'],
    )
    assert.equal(summon.enemies.filter(({ id, hp }) => id === 'enemy-403' && hp === 32).length, 4)
    assert(
      actions.some(({ side, slot, kind }) => side === 'enemy' && slot !== 1 && kind === 'attack'),
    )
  }
  if (source.summoning) {
    const summoned = enemy.find(({ kind }) => kind === 'pass')
    const { id, count, hp } = source.summoning
    assert(summoned, 'boss actually used the first summoning command')
    assert.deepEqual(
      summoned.enemies.flatMap((slot, index) => (slot?.id === id ? [{ index, hp: slot.hp }] : [])),
      [0, 2].slice(0, count).map((index) => ({ index, hp })),
    )
    assert(
      [0, 2].every((slot) =>
        actions.some(
          (action) =>
            action.side === 'enemy' && action.slot === slot && action.turn > summoned.turn,
        ),
      ),
      'both summoned slots take actual actions',
    )
  }
  if (automatic) {
    assert.deepEqual(
      enemy.map(({ turn, spell }) => [turn, spell]),
      automatic.spells.map((spell, index) => [index + 1, spell]),
    )
    assert.equal(actions.at(-1)?.turn, automatic.turns)
    assert(actions.at(-1).enemies[spec.slot]?.hp > 0, 'the script stops a living boss')
  } else if (scriptedStop) {
    assert.deepEqual(
      enemy.map(({ spell }) => spell),
      scriptedStop.spells,
    )
    assert.equal(actions.length, scriptedStop.turns * (battleParty.length + 1))
    assert.equal(actions.at(-1), enemy.at(-1))
    assert.equal(enemy.at(-1).turn, scriptedStop.turns)
    assert.equal(enemy.at(-1).enemies[spec.slot].hp, source.original.health)
  } else if (scriptedDefeat) {
    if (source.stoneElder)
      assert.deepEqual(
        actions.map(({ turn, side, slot, kind, spell }) => [turn, side, slot, kind, spell ?? null]),
        [
          [1, 'player', 0, 'defend', null],
          [1, 'player', 2, 'defend', null],
          [1, 'player', 1, 'defend', null],
          [1, 'enemy', spec.slot, 'cast', String(source.original.magic)],
        ],
        'three native defenses and the boss opening blast',
      )
    assert.equal(actions.at(-1).side, 'enemy')
    assert(
      actions.at(-1).hp.every((hp) => hp === 0),
      'real enemy damage defeated the party',
    )
    assert(actions.at(-1).enemies.every((slot) => slot === null || slot.hp > 0))
  } else {
    assert.equal(actions.at(-1).side, 'player')
    assert((source.wood ? ['attack', 'cast'] : ['attack']).includes(actions.at(-1).kind))
    assert(actions.at(-1).enemies.every((slot) => slot === null || slot.hp === 0))
  }

  const poses = find('boss-frame').filter(
    ({ slot, active }) => slot === spec.slot && active?.side === 'enemy' && active.slot === slot,
  )
  assert(poses.length > 0, 'boss never actually rendered during its action')
  assert(
    poses.every(
      ({ frame, x, y }) => Number.isInteger(frame) && Number.isInteger(x) && Number.isInteger(y),
    ),
  )
  assert(
    new Set(poses.map(({ x, y }) => `${x},${y}`)).size >= 3,
    'boss action never changed its drawn position',
  )
  const effectSounds = find('sfx-start')
  assert(effectSounds.every(({ context, frames }) => context === 'running' && frames > 0))
  const battleSounds = effectSounds.filter(
    ({ order }) => !observesForeground(spec) || (order > prepared.order && order < won.order),
  )
  const soundIds = battleSounds.map(({ asset }) => asset)
  let comparableSounds = soundIds
  let spiderForeground
  if (spec.team === 45)
    assert.equal(
      soundIds.filter((asset) => asset === source.original.attackSound).length,
      enemy.length,
    )
  else if (spec.team === 44) {
    assert(soundIds.includes(source.original.magicSound), 'fox spell sound did not start')
    assert.equal(soundIds.filter((asset) => asset === 212).length, 1, 'fox summon sound count')
  } else if (source.stoneElder) {
    // Three casualty sounds start together. The decoder can return them in a different order.
    comparableSounds = [soundIds[0], ...soundIds.slice(1).toSorted((a, b) => a - b)]
    assert.deepEqual(comparableSounds, [Math.abs(source.original.magicSound), 23, 24, 25])
    const cries = battleSounds.slice(1).map(({ atMs }) => atMs)
    assert(Math.max(...cries) - Math.min(...cries) < 1000 / 60, 'casualty sounds are simultaneous')
  } else if (spec.team === 43) {
    assert.equal(soundIds.filter((asset) => asset === 182).length, 1)
    assert.equal(soundIds.filter((asset) => asset === 502).length, 1)
    assert.equal(soundIds.filter((asset) => asset === 503).length, 3)
    const worldCue = effectSounds.find(({ asset }) => asset === 182)
    assert(trigger.order < worldCue.order && worldCue.order < launch[0].order)
    spiderForeground = checkSpiderForeground(events, trigger, worldCue, launch[0])
  }
  assert.equal(
    soundIds.filter((asset) => asset === source.original.deathSound).length,
    Number(earnsRewards),
  )

  const expectedResult = scriptedStop
    ? 'terminated'
    : scriptedDefeat
      ? game
        ? 'lost'
        : 'defeat'
      : game
        ? 'won'
        : 'victory'
  assert.equal(won.result, expectedResult)
  if (scriptedDefeat) {
    assert(won.party.every(({ hp }) => hp === 0))
    assert(once('terminal-hold-eligible').order < won.order)
    assert.equal(find('load-last-save').length, 0)
  }
  const [exp, cash] = earnsRewards ? totalReward() : [0, 0]
  let summary
  if (!earnsRewards) {
    assert.deepEqual(
      [
        ...find('victory-summary-drawn'),
        ...find('settlement'),
        ...find('ordinary-game-over-drawn'),
      ],
      [],
    )
  } else {
    summary = once('victory-summary-drawn')
    assert.deepEqual([summary.exp, summary.cash], [exp, cash])
    assert(summary.order < won.order)
  }
  assert.equal(won.cash, cash)
  const rewardInventory = source.route?.ming?.reward ?? spec.world.inventory
  const completionStock = automatic
    ? [
        { itemId: '138', count: 9 },
        { itemId: '148', count: 9 },
      ]
    : game && (spec.disk.defeated || source.route)
      ? rewardInventory
      : []
  assert.deepEqual(
    won.inventory,
    completionStock,
    'hook inventory at the engine-specific battle completion boundary',
  )
  const control = once(
    handoff ? 'successor-drawn' : scriptedReturn ? 'scripted-return-drawn' : 'world-control',
  )
  const last = leavesByScript ? run.returned.state : run.departure.state
  assert(won.order < control.order)
  if (handoff) {
    assert.equal(control.scene, handoff.scene)
    assert.deepEqual(last.position, handoff.finalPosition ?? handoff.position)
    const [col, row] = handoff.position
    const x = 16 * (col - row)
    const y = 8 * (col + row)
    assert.deepEqual(control.leader, [x, y], 'first visible successor feet')
    if (!handoff.fieldPosition)
      assert.deepEqual(control.camera, [x - 160, y - 112], 'first visible successor camera')
    const landed = events.find(
      ({ kind, order }) =>
        kind === 'world-drawn' && order === control.order - (source.route ? 2 : 1),
    )
    assert.equal(landed?.scene, handoff.scene, 'successor receipt must bind to an actual draw')
    assert.deepEqual([last.scene, last.battle], [handoff.scene, null])
    const load = script.find(
      ({ op, ip, order }) =>
        order > won.order &&
        order < control.order &&
        (game ? ip === handoff.ip : op === 'loadScene'),
    )
    assert(load, 'missing actual authored scene handoff')
  } else if (scriptedReturn) {
    const [col, row] = returnedAt
    const leader = [16 * (col - row), 8 * (col + row)]
    const camera = [leader[0] - 160, leader[1] - 112]
    assert.deepEqual(
      [control.scene, control.leader, control.camera],
      [spec.scene, leader, camera],
      'first visible scripted return on the source camera and feet',
    )
    assert.deepEqual([last.scene, last.position, last.battle], [spec.scene, returnedAt, null])
    assert(!last.ready, 'the return script still owns control')
    const returned = events.find(
      ({ kind, order }) => kind === 'world-drawn' && order === control.order - 1,
    )
    assert(
      returned && returned.scene === spec.scene,
      'the return receipt binds an actual field draw',
    )
    assert(
      script.some(
        ({ op, ip, order }) =>
          won.order < order &&
          order < control.order &&
          (game ? ip === scriptedReturn.position : op === 'teleportParty'),
      ),
      'author relocation must commit before the first visible return',
    )
  } else {
    assert.deepEqual(control.position, returnedAt)
    assert(control.order < departure.order)
    assert.deepEqual(
      [last.scene, last.position, last.ready, last.box, last.battle],
      [spec.scene, departureAt, true, null, null],
    )
    assert.deepEqual(control.inventory, spec.world.inventory)
  }
  assert.deepEqual([last.cash, last.inventory], [cash, rewardInventory])
  assert.deepEqual(
    last.party.map(({ id, exp: gained }) => [id, gained]),
    [
      ...(scriptedReturn?.members ?? handoff?.members ?? spec.world.members ?? roles).map(
        (role) => [role, exp],
      ),
      ...(spec.world.join ? [[spec.world.join.role, 0]] : []),
    ],
  )
  assert.deepEqual(
    won.party.map(({ id, exp: gained }) => [id, gained]),
    roles.map((role) => [role, exp]),
  )
  if (!handoff) {
    assert(
      find('music-start').some(
        ({ order, track, context }) =>
          order > won.order && track === returnMusic && context === 'running',
      ),
      'original field music after battle',
    )
    assert.equal(last.music, returnMusic)
  }
  if (
    !leavesByScript &&
    contactScene === spec.scene &&
    scenario !== 'thief' &&
    (!source.tower || game)
  )
    assert.equal(run.returned.owner.state ?? spec.disk.owner[2], spec.world.gameState)
  if (game) {
    assert.equal(won.continuation, spec.disk.battle + 1)
    if (!leavesByScript && contactScene === spec.scene) {
      assert.equal(run.returned.owner.triggerMode, spec.world.triggerMode)
      assert.equal(
        run.returned.owner.resume,
        source.tian?.resume.ip ?? (spec.team === 45 ? spec.disk.last + 1 : null),
      )
      assert(script.some(({ ip }) => ip === spec.disk.last))
    }
    if (spec.disk.reward)
      assert.equal(
        script.filter(
          ({ ip, order }) => ip === spec.disk.reward && order > won.order && order < control.order,
        ).length,
        1,
      )
  } else if (source.tian) {
    assert.equal(run.returned.owner.hidden, false)
    assert.deepEqual(run.returned.owner.behavior.trigger.cursor, {
      behavior: 'default',
      at: { kind: 'stage', stage: source.tian.resume.stage },
    })
  } else if (spec.team === 45) {
    const { behavior } = run.returned.owner
    assert.deepEqual(behavior.triggerActivation, {
      kind: 'use',
      value: { on: 'interact', range: 2 },
    })
    assert.deepEqual(behavior.trigger.cursor, {
      behavior: 'default',
      at: { kind: 'stage', stage: 'legacy-002' },
    })
  } else {
    if (!leavesByScript && contactScene === spec.scene && scenario !== 'thief')
      assert.equal(run.returned.owner.hidden, true)
    if (spec.disk.reward)
      assert.equal(
        script.filter(
          ({ op, order }) => op === 'giveItem' && order > won.order && order < control.order,
        ).length,
        1,
      )
  }
  if (spec.disk.defeated) {
    const begun = once('defeated-script-start')
    const granted = once('defeated-script-end')
    const notice = once('defeated-note-drawn')
    const defeated = spec.disk.defeated.enemy ?? spec.enemy
    assert.deepEqual([begun.id, granted.id], [defeated, defeated])
    assert.deepEqual(granted.inventory, spec.world.inventory)
    assert.equal(subtitle(notice.text), subtitle(source.defeatedNote))
    assert(
      summary.order < begun.order && begun.order < notice.order && notice.order < control.order,
    )
    assert(game ? granted.order < won.order : won.order < begun.order)
  }
  if (source.tian) {
    assert.deepEqual(
      run.returned.gate,
      game
        ? 'L_23297'
        : {
            selection: { kind: 'use', value: source.tian.gateVariant },
          },
    )
    assert.equal(run.returned.state.actors.find(({ id }) => id === 'e2432').state, 0)
  }
  const dialogue =
    source.tian ||
    source.route ||
    source.poisonLady ||
    source.stoneElder ||
    source.toad ||
    source.gai ||
    source.wood ||
    source.phoenix ||
    source.qilin
      ? undefined
      : checkDialogue(
          events,
          { trigger: trigger.order, battle: launch[0].order },
          { won: won.order, control: control.order },
          game,
        )
  const boundaries = { entered, trigger, launch: launch[0], prepared, entry, menu, won, control }
  const renderedDialogue = observesForeground(spec) ? await read(run.renderedDialogue) : null
  const linTiannan = linTiannanFacts
    ? inspectLinTiannanPresentation({
        events,
        draws: renderedDialogue,
        boundaries,
        source,
        spec,
        game,
        facts: linTiannanFacts,
      })
    : undefined
  const gai = source.gai
    ? inspectGaiLuojiaoPresentation({
        events,
        draws: renderedDialogue,
        boundaries,
        source,
        spec,
        run,
      })
    : undefined
  const wood = source.wood
    ? inspectWoodTaoist(events, renderedDialogue, boundaries, report.actions, game, source, spec)
    : undefined
  const phoenix = source.phoenix
    ? inspectPhoenixPresentation({
        events,
        draws: renderedDialogue,
        bounds: boundaries,
        source,
        spec,
        game,
      })
    : undefined
  const qilin = source.qilin
    ? inspectFireQilin({
        events,
        draws: renderedDialogue,
        bounds: { ...boundaries, departure },
        source,
        spec,
        timeOrigin: raw.timeOrigin,
        actions: report.actions,
        game,
      })
    : undefined
  const goldenToad = source.toad
    ? inspectGoldenToadPresentation({
        events,
        draws: renderedDialogue,
        boundaries,
        source,
        spec,
        game,
        run,
      })
    : undefined
  if (gai) {
    const [before, after] = [false, true].map(
      (returning) =>
        source.gai.pages.filter(({ phase }) => (phase === 'return') === returning).length,
    )
    for (const [phase, count] of [
      ['before-dialogue', before],
      ['after-dialogue', after],
    ]) {
      const actual = report.actions
        .filter((action) => action.phase === phase)
        .map(({ kind, key }) => [kind, key])
      const expected = Array.from({ length: count }, () => ['press', game ? 'Space' : 'Enter'])
      if (!isDeepStrictEqual(actual, expected))
        gai.issues.push({ rule: `exact original dialogue confirms for ${phase}`, actual, expected })
    }
  }
  const poisonLady = source.poisonLady
    ? inspectPoisonLadyPresentation({ events, draws: renderedDialogue, boundaries, source })
    : undefined
  const stoneElder = source.stoneElder
    ? inspectStoneElderPresentation({ events, draws: renderedDialogue, boundaries, source, game })
    : undefined
  const stoneElderAuto = automatic
    ? inspectStoneElderAutoPresentation({
        events,
        draws: renderedDialogue,
        bounds: boundaries,
        source,
        spec,
        game,
      })
    : undefined
  const foregroundCoverage = forestInn
    ? inspectForestInnCoverage({
        events,
        draws: renderedDialogue,
        source,
        facts: forestInn,
        bounds: boundaries,
        entries: stoneElderAuto.firstEntries,
      })
    : linTiannan?.coverage
  if (foregroundCoverage && report.profile === 'capture') {
    const recording = resolve(dirname(path), 'story.webm')
    assert.equal(sha256(await readFile(recording)), report.media.native.sha256)
    const frames = await decodeWorldDialoguePixels(recording)
    for (const phase of foregroundCoverage.filter(({ backdrop }) => backdrop)) {
      const origin = report.media.browser.startedAt
      phase.pixels = phase.backdrop.spans.map(({ startAtMs, endAtMs }) =>
        checkWorldDialoguePixels(frames, {
          start: (startAtMs - origin) / 1000,
          end: (endAtMs - origin) / 1000,
          minLitFraction: 0.2,
        }),
      )
      const bad = phase.pixels.find(({ status }) => status !== 'passed')
      if (bad)
        phase.issues.push({
          issue: 'recorded-dialogue-background-failed',
          phase: phase.phase,
          ...bad,
        })
    }
  }
  const ming = source.route?.ming
    ? inspectTowerMingPresentation({
        events,
        draws: renderedDialogue,
        boundaries,
        source,
        spec,
        game,
      })
    : undefined
  const foreground =
    scenario === 'thief'
      ? checkThiefForeground(events, renderedDialogue, boundaries, game)
      : undefined
  const outside =
    scenario === 'yueru-outside'
      ? {
          ...inspectOutsidePresentation(raw, source, boundaries),
          dialogue: checkOutsideDialogue(renderedDialogue, boundaries),
        }
      : undefined
  const ring = source.ring
    ? checkRingPresentation(events, renderedDialogue, boundaries, game)
    : undefined
  if (ring)
    ring.opening = inspectRingOpening({
      events,
      draws: renderedDialogue,
      trigger,
      launch: launch[0],
      expected: source.ring.opening,
      locale: source.locale,
    })
  const inn = source.inn ? checkInnPresentation(raw, renderedDialogue, boundaries) : undefined
  const tomb = source.tomb ? checkTombPresentation(raw, renderedDialogue, boundaries) : undefined
  if (tomb) {
    // The first six bands still contain pixels from the outgoing world frame.
    const activeFrames = events.filter(
      ({ kind, order, band, surface, active }) =>
        order > launch[0].order &&
        order < won.order &&
        ((kind === 'entry-band' && band === 6) ||
          kind === 'entry-complete' ||
          kind === 'command-menu-drawn' ||
          (kind === 'boss-frame' && order > entry.order && active) ||
          (kind === 'paint' && order > entry.order && surface === 'battle')),
    )
    const cleared = inspectClearedDialogueFrames(renderedDialogue, activeFrames, spec.scene)
    tomb.clearedDialogue = cleared
    if (cleared.issue)
      tomb.issues.push({
        rule: 'world dialogue clears on the first fully revealed battle frame',
        ...cleared.issue,
      })
  }
  const tian = source.tian
    ? checkTianPresentation(events, renderedDialogue, boundaries, game)
    : undefined
  if (tian) {
    const phaseKeys = (phase) => report.actions.filter((action) => action.phase === phase)
    const before = phaseKeys('before-dialogue')
    const counts = [
      before.filter(({ atMs }) => atMs - raw.timeOrigin < launch[0].atMs).length,
      before.length,
      phaseKeys('after-dialogue').length,
    ]
    if (!isDeepStrictEqual(counts, [3, 7, 15]))
      tian.issues.push({
        rule: 'original physical dialogue confirms',
        expected: [3, 7, 15],
        actual: counts,
      })
  }
  const tower = source.tower
    ? inspectTowerFoxPresentation({
        events,
        spec,
        actor: source.tower,
        game,
        approach,
        won,
        control,
        returnedOwner: run.returned.owner,
      })
    : undefined
  if (
    foreground &&
    ((run.returned.owner.state ?? spec.disk.owner[2]) !== spec.world.gameState ||
      (!game && !run.returned.owner.hidden))
  )
    foreground.issues.push({
      rule: 'thief hidden when control returns',
      actual: run.returned.owner,
    })
  const drops = find('drop-sample')
  assert.deepEqual(
    drops.map(({ slot }) => slot),
    spec.team === 44 ? (game ? [0, 2, 3, 4] : [0, 1, 2, 3]) : [],
  )
  assert(
    drops.every(({ id, value }) => id === 'enemy-403' && Math.floor(value * 100) >= 11),
    'summoned bee drop probes must use original failed drop samples',
  )
  const comparable = {
    ...(dialogue && {
      dialogue: [dialogue.pre, dialogue.post].map((pages) =>
        pages.map(({ text, speaker }) => ({ text: subtitle(text), speaker })),
      ),
    }),
    ...(automatic && {
      dialogueInputs: dialogueInputs.map(({ phase }) => phase),
      terminalParty: won.party.map(({ id, hp, mp }) => [id, hp, mp]),
    }),
    commands,
    actions,
    rng: find('rng').map(({ value }) => value),
    drops: drops.map(({ id, value }) => ({ id, value })),
    sounds: comparableSounds,
    ...(foreground
      ? {
          contactFormation: foreground.contactFormation,
          visibleChase: foreground.positions,
          formation: foreground.formations,
        }
      : {}),
    ...(outside
      ? {
          contactFormation: outside.contact,
          beforeBattleFormation: outside.beforeBattle,
          returnFormation: outside.return,
        }
      : {}),
    ...(ring
      ? {
          ringMovement: ring.moves.map(({ position, facing, frame, camera }) => ({
            position,
            facing,
            frame,
            camera,
          })),
        }
      : {}),
    ...(linTiannan && { linTiannan: linTiannan.comparable }),
    ...(inn ? { actorPixels: inn.actorPixels } : {}),
    ...(tomb ? { revealPixels: tomb.pixels, arrivalPixels: tomb.arrivalPixels } : {}),
    ...(tower?.contact && {
      towerFormation: {
        leader: tower.contact.leader,
        camera: tower.contact.camera,
        // An equivalent stationary save can enter on either leg of the original walk cycle.
        party: tower.contact.party?.map(({ frame, ...pose }) => pose),
      },
    }),
    ending: {
      party: last.party.map(({ weapon, ...member }) => member),
      cash: last.cash,
      inventory: last.inventory,
      music: last.music,
    },
  }
  return {
    engine,
    report: resolve(path),
    reportSha256: sha256(bytes),
    revision: report.revision,
    profile: report.profile,
    raw: run.raw,
    sourceHashes: report.dependencies.hashes,
    warnings: report.warnings,
    dialogue,
    foreground,
    outside,
    ring,
    inn,
    tomb,
    tower,
    ming,
    poisonLady,
    stoneElder,
    stoneElderAuto,
    foregroundCoverage,
    linTiannan,
    goldenToad,
    gai,
    wood,
    phoenix,
    qilin,
    tian,
    spiderForeground,
    clips: {
      contactMs: entered?.atMs ?? trigger.atMs,
      returnMs: ring?.returned.atMs ?? control.atMs,
      exitMs: departure?.atMs ?? control.atMs,
      ...(source.toad && { revisitMs: moves[0].atMs }),
    },
    audioTiming: {
      cueAfterRevealMs: music[0].atMs - entry.atMs,
      cueAfterMenuMs: menu ? music[0].atMs - menu.atMs : null,
    },
    visual: {
      bossFrames: poses.length,
      frameIndexes: [...new Set(poses.map(({ frame }) => frame))],
    },
    comparable,
  }
}

const sides = await Promise.allSettled([inspect(gamePath, 'game'), inspect(reforgePath, 'reforge')])
const failures = sides.flatMap((result, i) =>
  result.status === 'rejected'
    ? [{ engine: i === 0 ? 'game' : 'reforge', error: result.reason.stack }]
    : [],
)
const [game, reforge] = sides.map(({ value }) => value)
if (!failures.length) {
  for (const result of [game, reforge]) {
    for (const issue of [
      ...(result.foreground?.issues ?? []),
      ...(result.outside?.issues ?? []),
      ...(result.inn?.issues ?? []),
      ...(result.tomb?.issues ?? []),
      ...(result.tower?.issues ?? []),
      ...(result.tian?.issues ?? []),
      ...(result.ming?.issues ?? []),
      ...(result.poisonLady?.issues ?? []),
      ...(result.stoneElder?.issues ?? []),
      ...(result.stoneElderAuto?.issues ?? []),
      ...(result.foregroundCoverage?.flatMap(({ issues }) => issues) ?? []),
      ...(result.linTiannan?.issues ?? []),
      ...(result.goldenToad?.issues ?? []),
      ...(result.gai?.issues ?? []),
      ...(result.wood?.issues ?? []),
      ...(result.phoenix?.issues ?? []),
      ...(result.qilin?.issues ?? []),
      ...(result.ring?.opening.issues ?? []),
    ])
      failures.push({ engine: result.engine, ...issue })
  }
  if (game.foregroundCoverage) {
    for (const [index, original] of game.foregroundCoverage.entries())
      failures.push(...compareWorldDialogueCast(original, reforge.foregroundCoverage[index]))
  }
  if (forestInn) {
    const track = ({ actor, positions }) => [actor, positions.map(({ order, ...pose }) => pose)]
    const choreography = difference(
      game.foregroundCoverage[0].seating.map(track),
      reforge.foregroundCoverage[0].seating.map(track),
      ['inn', 'seating'],
    )
    if (choreography) failures.push(choreography)
  }
  if (game.phoenix) {
    const mismatch = difference(game.phoenix.cast, reforge.phoenix.cast, ['phoenix', 'cast'])
    if (mismatch) failures.push(mismatch)
  }
  const comparableGame = game.comparable
  assert.equal(difference(comparableGame, structuredClone(comparableGame)), null)
  const changed = structuredClone(comparableGame)
  changed.ending.music += 1
  assert.deepEqual(difference(comparableGame, changed)?.path, ['ending', 'music'])
  if (game.revision !== reforge.revision)
    failures.push({ path: ['revision'], game: game.revision, reforge: reforge.revision })
  if (game.profile !== reforge.profile)
    failures.push({ path: ['profile'], game: game.profile, reforge: reforge.profile })
  for (const key of Object.keys(comparableGame)) {
    const first = difference(comparableGame[key], reforge.comparable[key], [key])
    if (first) failures.push(first)
  }
  const shared = Object.keys(game.sourceHashes).filter((name) => name in reforge.sourceHashes)
  for (const path of shared)
    if (game.sourceHashes[path] !== reforge.sourceHashes[path])
      failures.push({
        path: ['source', path],
        game: game.sourceHashes[path],
        reforge: reforge.sourceHashes[path],
      })
}
console.log(
  JSON.stringify(
    {
      kind: 'world-boss-entrance',
      status: failures.length ? 'failed' : 'passed',
      scenario,
      game,
      reforge,
      failures,
    },
    null,
    2,
  ),
)
if (failures.length) process.exitCode = 1
