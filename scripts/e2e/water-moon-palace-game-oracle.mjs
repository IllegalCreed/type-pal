import assert from 'node:assert/strict'

const chestLines = [
  '打开箱子，取得三张观音符',
  '一个空箱子．．',
  '箱子底下发现一柄苗刀',
  '箱子里什么都没有',
]
const pelletPageEndings = [
  '睡上几个时辰就会好起来的',
  '我真不知该如何报答。',
  '你真的以为我是仙女？',
  '你是菩萨娘娘！！',
  '仙女、菩萨的这样叫人家',
  '那～姑娘的芳名是？',
  '我叫赵灵儿～你呢？',
  '敝姓李，名逍遥',
  '喂．．你几岁啦？',
  '我今年十九。',
  '外头有什么新鲜好玩的？',
  '啊．．这．．',
  '都快闷死了。',
  '城里头逛逛庙会',
  '我们来打勾勾！',
  '好！打勾勾，赖皮的是小狗',
]
const waiting = ({ phase }) => phase === 'waiting-page-key' || phase === 'waiting-end-key'
const at = (actual, expected) => actual?.[0] === expected[0] && actual?.[1] === expected[1]

/** Re-evaluate the story from the raw observation instead of trusting runner phase claims. */
export function assertWaterMoonPalaceGameStory(trace) {
  const { events, inputs, resources } = trace
  const begin = (scene, owner) =>
    events.filter(
      (row) =>
        row.scene === scene &&
        row.kind === 'cursor' &&
        row.before === null &&
        row.cursor?.owner === owner,
    )
  const release = (start) => {
    const end = events.find(
      (row) =>
        row.order > start.order && row.sceneVisit === start.sceneVisit && row.kind === 'ready',
    )
    assert(end, `e${start.cursor.owner} did not return control in the same scene visit`)
    return end
  }
  const single = (scene, owner) => {
    const starts = begin(scene, owner)
    assert.equal(starts.length, 1, `expected one actual e${owner} run`)
    return { start: starts[0], end: release(starts[0]) }
  }
  const pages = ({ start, end }) =>
    events
      .filter(
        (row) =>
          row.order > start.order &&
          row.order < end.order &&
          row.kind === 'dialogue' &&
          row.cursor?.owner === start.cursor.owner &&
          row.dialog &&
          waiting(row.dialog),
      )
      .map(({ dialog }) => dialog.text)
  const ready = (scene, position) => {
    const row = events.find(
      (event) => event.kind === 'ready' && event.scene === scene && at(event.position, position),
    )
    assert(row, `Game did not restore control at ${scene} ${position}`)
    return row
  }
  const draw = (id, filter) =>
    events.find(
      (event) => event.kind === 'world-draw' && event.actors[id] && filter(event.actors[id], event),
    )
  const pixels = (event, id) => {
    const entry = resources.find(
      (resource) => resource.order === event?.actors[id]?.frameResourceId,
    )
    assert(entry, `missing native selected pixels for ${id}`)
    return entry
  }
  const start = ready('s016', [1056, 1296])
  const exterior = ready('s019', [288, 1088])
  const interior = ready('s020', [512, 1520])
  assert(start.order < exterior.order && exterior.order < interior.order)
  assert.equal(begin('s016', 211).length, 1)
  assert.equal(begin('s019', 268).length, 1)

  const guide = single('s019', 270)
  assert(exterior.order < guide.start.order && guide.end.order < interior.order)
  assert.deepEqual(pages(guide), [
    '你跟我进去拿药吧。',
    '要．．去见观音娘娘吗？',
    '等她回来就拿不成了。',
  ])
  const guideDeparture = events.find(
    (row) =>
      row.kind === 'actor' &&
      row.id === 'e270' &&
      row.order > guide.start.order &&
      row.order < guide.end.order &&
      row.before?.state === 2 &&
      row.state.state === 0,
  )
  assert(guideDeparture, 'Zhao Ling’er did not complete her exterior departure')
  assert.deepEqual(guideDeparture.state.position, [948, 758])
  assert.equal(guideDeparture.state.facing, 'up')
  const guideWalks = events.filter(
    (row) =>
      row.order > guide.start.order &&
      row.order < guideDeparture.order &&
      row.kind === 'world-draw' &&
      row.actors.e270 &&
      row.actors.e270.position[0] > 864 &&
      row.actors.e270.facing === 'up',
  )
  assert(guideWalks.length >= 2, 'missing actual exterior guiding draws')
  assert(new Set(guideWalks.map((row) => row.actors.e270.frame)).size >= 2)
  for (const row of guideWalks) pixels(row, 'e270')

  const searchInput = (start, after) => {
    const keydown = inputs.findLast(
      (input) => input.type === 'keydown' && input.order < start.order,
    )
    assert(
      keydown && keydown.order > after.order && keydown.key === 'Enter' && !keydown.repeat,
      `missing real search input for e${start.cursor.owner}`,
    )
    return keydown
  }
  const starts = begin('s020', 363)
  assert.equal(starts.length, 4, 'expected four separate Game chest interactions')
  let previousSearch = interior
  const chest = starts.map((start, index) => {
    const visit = { start, end: release(start) }
    const input = searchInput(start, previousSearch)
    const narration = events.find(
      (row) =>
        row.order > start.order &&
        row.order < visit.end.order &&
        row.kind === 'dialogue-draw' &&
        row.slots.some(
          (slot) =>
            slot.cursor?.owner === 363 &&
            slot.slot === 'narration' &&
            slot.text === chestLines[index],
        ),
    )
    assert(narration, `Game did not draw the narration for chest search ${index + 1}`)
    assert.deepEqual(visit.end.counts, { 61: 3, 179: index >= 2 ? 1 : 0, 273: 0 })
    const opened = draw(
      'e363',
      (sprite, event) =>
        event.order > start.order && event.order < visit.end.order && sprite.frame === 1,
    )
    assert(opened, `Game chest attempt ${index + 1} did not draw the open lid`)
    pixels(opened, 'e363')
    previousSearch = visit.end
    return { ...visit, input, narration, opened }
  })
  const closed = draw(
    'e363',
    (sprite, event) =>
      event.order > interior.order && event.order < starts[0].order && sprite.frame === 0,
  )
  assert(closed, 'missing initially closed Game chest draw')
  assert.notDeepEqual(pixels(closed, 'e363').pixels, pixels(chest[0].opened, 'e363').pixels)
  assert(
    !draw('e363', (sprite, event) => event.order > chest[0].opened.order && sprite.frame !== 1),
    'an open chest reverted to a closed draw',
  )

  const water = single('s020', 362)
  const waterInput = searchInput(water.start, chest.at(-1).end)
  assert.deepEqual(pages(water), ['哇．．好清澈的泉水', '只觉得疲痨一扫而空精神饱满'])
  const recoveries = events.filter((row) => row.kind === 'water-recovery')
  assert.equal(recoveries.length, 1, 'the actual healing opcode must execute once')
  const recovery = recoveries[0]
  const command = events.find((row) => row.order === recovery.commandOrder)
  assert(
    command &&
      command.order > water.start.order &&
      command.order < recovery.order &&
      recovery.order < water.end.order,
  )
  assert.equal(command.actor, 362)
  assert.equal(command.channel, 'trigger')
  assert.equal(command.currentEventObjectId, 362)
  assert.deepEqual(recovery.cursor, { owner: command.actor, ip: command.ip })
  assert.equal(command.command.op, 'raw')
  assert.equal(command.command.opcode, 29)
  assert.deepEqual(command.command.operands, [1, 999, 0])
  assert.equal(recovery.source, 'commit:applyRawOpcode')
  assert(recovery.before.length > 0)
  assert.deepEqual(
    recovery.after,
    recovery.before.map(({ role, maxHp, maxMp }) => ({ role, hp: maxHp, maxHp, mp: maxMp, maxMp })),
  )
  assert.deepEqual(water.end.vitals, recovery.after)
  const waterDraw = events.find(
    (row) =>
      row.order > recovery.order &&
      row.order < water.end.order &&
      row.kind === 'dialogue-draw' &&
      row.slots.some(
        (slot) =>
          slot.cursor?.owner === 362 &&
          slot.slot === 'center' &&
          slot.text === '李逍遥饮下一口灵池中的泉水\n只觉得疲痨一扫而空精神饱满',
      ),
  )
  assert(waterDraw, 'missing drawn recovery narration after the actual opcode')

  const pellet = single('s020', 342)
  assert(water.end.order < pellet.start.order)
  assert.deepEqual(pages(pellet), pelletPageEndings)
  assert.deepEqual(pellet.end.position, [1152, 960])
  assert.equal(pellet.end.facing, 'left')
  assert.deepEqual(pellet.end.counts, { 61: 3, 179: 1, 273: 1 })
  assert.deepEqual(begin('s020', 348), [], '010 continued into the separate departure story')
  const openedExit = events.find(
    (row) =>
      row.order > pellet.start.order &&
      row.order < pellet.end.order &&
      row.kind === 'actor' &&
      row.id === 'e348' &&
      row.state.state === 2,
  )
  assert(openedExit, 'the original next-story gate was not armed')
  const lastPelletPage = events.findLast(
    (row) =>
      row.kind === 'dialogue-draw' &&
      row.slots.some(
        (slot) => slot.cursor?.owner === 342 && slot.text.includes(pelletPageEndings.at(-1)),
      ),
  )
  assert(
    lastPelletPage && lastPelletPage.order < pellet.end.order,
    'final dialogue was not drawn before returning control',
  )
  assert.deepEqual(
    events.findLast((row) => row.kind === 'dialogue-draw').slots,
    [],
    'Game left a dialogue slot on the 010 endpoint',
  )
  assert(
    !events.some(
      (row) =>
        row.order > pellet.end.order &&
        row.kind === 'actor' &&
        row.id === 'party' &&
        !at(row.state.position, pellet.end.position),
    ),
    'the player moved after the 010 stop point',
  )

  return {
    start,
    exterior,
    guide: { ...guide, departure: guideDeparture, walkDraws: guideWalks },
    interior,
    chest: { closed, visits: chest },
    water: { ...water, input: waterInput, command, recovery, narration: waterDraw },
    pellet: { ...pellet, lastPage: lastPelletPage, openedExit },
  }
}
