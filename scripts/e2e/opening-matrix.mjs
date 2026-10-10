import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const ids = [
  0, 2, 3, 4, 1318, 1319, 1321, 1323, 1324, 1325, 1327, 1328, 1329, 1330, 1331, 1332, 1334, 1335,
  1336, 1337, 1338, 1339, 1340, 1342, 1344, 1345, 1346, 1348, 1349, 1351, 1352, 1353, 1354, 1355,
  1356, 1358, 1360, 1361, 1362, 1364, 1365, 1366, 1367, 1369, 1371, 1373, 1374, 1375, 1376, 1377,
  1379, 1380, 1381, 1382, 1383,
]
const text = (value) => value.replace(/\s/g, '')
const speakerName = (value) => text(value ?? '').replace(/[：∶:]$/, '')
const uniqueChanges = (values) =>
  values.filter((v, i) => i === 0 || JSON.stringify(v) !== JSON.stringify(values[i - 1]))

/** Frozen 001 source inventory. A new line/cue requires deliberate route-contract review. */
export async function readOpeningContract(root) {
  const hashes = {}
  const read = async (file) => {
    const bytes = await readFile(resolve(root, file))
    hashes[file] = createHash('sha256').update(bytes).digest('hex')
    return JSON.parse(bytes)
  }
  const locale = await read('projects/pal/content/locale.json')
  const actors = await read('projects/pal/content/actors.json')
  const original = (await read('data/extracted/events/all.json')).segments[0].commands
  const cues = []
  for (const scene of ['s000', 's001']) {
    const s = await read(`projects/pal/content/scenes/${scene}.json`)
    const flow = s.hooks.onEnter.variants[s.hooks.onEnter.initial].flow
    assert.equal(flow.kind, 'stages')
    const stage = flow.stages.find((s) => s.id === flow.initial)
    for (const c of stage.body.filter((c) => c.kind === 'dialog')) {
      const identity = c.cue.identity
      const speaker =
        identity.kind === 'actor'
          ? actors.find((a) => a.id === identity.actor)?.name
          : identity.speaker
      cues.push({
        scene,
        speaker: speaker ? (locale[speaker] ?? speaker) : null,
        ids: c.cue.rows.map((r) => r.text),
        texts: c.cue.rows.map((r) => locale[r.text]),
      })
    }
  }
  const rows = cues.flatMap((c) =>
    c.ids.map((id, i) => ({ id, scene: c.scene, text: c.texts[i], speaker: c.speaker })),
  )
  assert.deepEqual(
    rows.map((r) => r.id),
    ids.map((id) => `dlg.${id}`),
    '001 source dialogue inventory changed',
  )
  assert.equal(
    new Set(rows.map((r) => text(r.text))).size,
    rows.length,
    'repeated text needs occurrence-aware route contract',
  )
  for (const row of rows) {
    const source = original.find(
      (c) => c.op === 'showDialog' && c.messageIndex === Number(row.id.slice(4)),
    )
    assert(source, `original line missing ${row.id}`)
    // Only $NN speed and ~NN tail-delay occur in this frozen opening text inventory.
    assert.equal(
      text(source.text.replace(/[$~]\d{2}/g, '')),
      text(row.text),
      `source text differs: ${row.id}`,
    )
  }
  return { hashes, rows, cues, locale }
}

export function assertOpeningMatrix(matrix, engine, contract) {
  assert(matrix && !matrix.overflow, 'missing/overflow opening matrix')
  assert.deepEqual(matrix.errors, [], 'opening matrix is incomplete')
  assert(matrix.actors.length > 0 && matrix.actors.length <= 2400)
  const lastStates = new Map()
  for (const [seq, e] of matrix.actors.entries()) {
    assert.equal(e.seq, seq, 'actor event sequence gap')
    assert(Number.isInteger(e.sample) && e.sample > 0, 'missing coherent snapshot identity')
    if (seq) assert(e.sample >= matrix.actors[seq - 1].sample, 'snapshot order regressed')
    if (e.kind === 'actor') {
      const key = `${e.sceneVisit}/${e.scene}/${e.id}`
      assert.deepEqual(e.before, lastStates.get(key) ?? null, 'actor state change was lost')
      if (e.before && JSON.stringify(e.before.position) !== JSON.stringify(e.state.position))
        assert(e.source.startsWith('commit:'), 'sample is not a committed move')
      lastStates.set(key, e.state)
    } else assert.equal(e.kind, 'scene')
  }
  assert.deepEqual(
    uniqueChanges(matrix.actors.filter((e) => e.kind === 'scene').map((e) => e.scene)),
    ['s000', 's001'],
    'unexpected scene transition',
  )
  assert(Array.isArray(matrix.worldRenders), 'missing current world render observations')
  const timeline = [
    matrix.actors,
    matrix.lifecycle ?? [],
    matrix.renders,
    matrix.controls,
    matrix.pages,
    matrix.worldRenders,
    matrix.causes ?? [],
    matrix.resources ?? [],
  ]
    .flat()
    .sort((a, b) => a.order - b.order)
  for (const [i, event] of timeline.entries()) {
    assert.equal(event.order, i, 'opening observation order gap')
    assert(Number.isFinite(event.atMs), 'opening observation missing clock')
    if (i) assert(event.atMs >= timeline[i - 1].atMs, 'opening observation clock regressed')
  }
  for (const [i, event] of matrix.worldRenders.entries())
    assert.equal(event.seq, i, 'opening world render gap')
  for (const [seq, e] of matrix.pages.entries()) {
    assert.equal(e.seq, seq, 'page event sequence gap')
    assert.equal(e.engine, engine, 'wrong rendered-page engine')
  }
  let pageCount
  if (engine === 'game') {
    const actual = [],
      seen = new Set()
    for (const e of matrix.pages)
      for (const line of e.page.lines) {
        const normalized = text(line)
        if (!normalized) continue
        const key = `${e.scene}/${normalized}`
        const expected = contract.rows.find(
          (r) => r.scene === e.scene && text(r.text) === normalized,
        )
        assert(expected, `unexpected rendered line ${key}`)
        assert.equal(
          speakerName(e.page.title),
          speakerName(expected.speaker),
          'rendered speaker differs',
        )
        if (!seen.has(key)) {
          seen.add(key)
          actual.push(key)
        }
      }
    assert.deepEqual(
      actual,
      contract.rows.map((r) => `${r.scene}/${text(r.text)}`),
      '001 rendered dialogue rows differ',
    )
    pageCount = matrix.pages.length // Fully drawn row/page changes, not the engine's page count.
  } else {
    assert.equal(engine, 'reforge')
    const groups = new Map()
    for (const e of matrix.pages) {
      assert.notEqual(e.page.phase, 'typing', 'unrendered page cannot prove dialogue')
      const key = `${e.scene}/${e.page.rowTextIds.join(',')}`
      let group = groups.get(key)
      if (!group) {
        group = new Map()
        groups.set(key, group)
      }
      const old = group.get(e.page.pageIndex)
      if (old)
        assert.equal(text(old.pageText), text(e.page.pageText), 'page text changed after display')
      group.set(e.page.pageIndex, e.page)
    }
    assert.deepEqual(
      [...groups.keys()],
      contract.cues.map((c) => `${c.scene}/${c.ids.join(',')}`),
      '001 cue order differs',
    )
    pageCount = 0
    for (const cue of contract.cues) {
      const pages = [...groups.get(`${cue.scene}/${cue.ids.join(',')}`).values()]
      for (const p of pages)
        assert.equal(
          speakerName(contract.locale[p.speaker] ?? p.speaker),
          speakerName(cue.speaker),
          'rendered speaker differs',
        )
      assert.deepEqual(
        pages.map((p) => p.pageIndex),
        Array.from({ length: pages[0].pageCount }, (_, i) => i),
        'missing rendered page',
      )
      assert.deepEqual(
        [...new Set(pages.flatMap((p) => p.pageTextIds))],
        cue.ids,
        'missing displayed text IDs',
      )
      assert.equal(
        text(pages.map((p) => p.pageText).join('')),
        text(cue.texts.join('')),
        'rendered page text differs',
      )
      pageCount += pages.length
    }
  }
  const actors = assertOpeningActors(matrix, engine)
  return {
    status: 'passed',
    rows: contract.rows.length,
    cues: contract.cues.length,
    renderedPageChanges: pageCount,
    sourceHashes: contract.hashes,
    actors,
  }
}

export function assertOpeningActors(matrix, engine) {
  const events = matrix.actors.filter((e) => e.kind === 'actor' && e.scene === 's001')
  const rows = (id) => events.filter((e) => e.id === id)
  for (const id of ['party', 'e3', 'e8', 'e10', 'e11']) assert(rows(id).length > 0, `missing ${id}`)
  const standin = rows('e11'),
    aunt = rows('e10'),
    prop = rows('e8'),
    party = rows('party')
  assert.deepEqual(
    uniqueChanges(standin.map((e) => e.state.frame ?? 0)),
    [0, 1, 2, 3, 0],
    'bedside pose sequence',
  )
  assert.deepEqual(
    uniqueChanges(standin.map((e) => e.state.visible)),
    [true, false],
    'bedside stand-in must disappear',
  )
  assert.deepEqual(
    uniqueChanges(aunt.map((e) => e.state.visible)),
    [false, true, false],
    'walking aunt lifecycle',
  )
  assert(
    standin.find((e) => !e.state.visible).sample <= aunt.find((e) => e.state.visible).sample,
    'stand-in replacement order',
  )
  assert.deepEqual(
    uniqueChanges(rows('e3').map((e) => e.state.visible)),
    [false, true],
    'room exit must activate',
  )
  const moves = (list) =>
    list.filter(
      (e) => e.before && JSON.stringify(e.before.position) !== JSON.stringify(e.state.position),
    )
  const propMoves = moves(prop)
  assert.equal(propMoves.length, 8, 'prop must move out four steps and return four steps')
  const delta = engine === 'game' ? [4, 2] : [0.25, 0, 0]
  for (const [i, e] of propMoves.entries()) {
    assert(e.source.startsWith('commit:'), 'prop move missing commit hook')
    assert.deepEqual(
      e.state.position.map((v, j) => v - e.before.position[j]),
      delta.map((v) => (i < 4 || v === 0 ? v : -v)),
      'prop excursion differs',
    )
  }
  assert.deepEqual(propMoves.at(-1).state.position, prop[0].state.position, 'prop fails to return')
  assert(
    propMoves[0].seq > aunt.findLast((e) => !e.state.visible).seq,
    'secret passage action before aunt leaves',
  )
  const partySprites = uniqueChanges(party.map((e) => e.state.sprite))
  for (const sprite of engine === 'game'
    ? [193, 627, 2]
    : ['sprite-193', 'sprite-627', 'li-xiaoyao'])
    assert(partySprites.includes(sprite), `missing party presentation ${sprite}`)
  assert.equal(
    partySprites.at(-1),
    engine === 'game' ? 2 : 'li-xiaoyao',
    'party must restore normal appearance',
  )
  assert(moves(party).length > 0, 'party never moves after waking')
  assert.equal(party.at(-1).state.facing, 'down', 'party final direction')
  return {
    watch: ['party', 'e3', 'e8', 'e10', 'e11'],
    standinFrames: [0, 1, 2, 3, 0],
    propMoves: propMoves.length,
    partySprites,
    partyMoves: moves(party).length,
    auntMoves: moves(aunt).length,
    semanticOrder: [
      'bedside-gestures',
      'standin-to-walking-aunt',
      'aunt-leaves',
      'prop-out-and-back',
      'party-normal',
      'control',
    ],
  }
}
