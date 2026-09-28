import assert from 'node:assert/strict'
import test from 'node:test'
import { assertOpeningMatrix } from './opening-matrix.mjs'
import { installOpeningMatrix } from './opening-matrix-observer.mjs'

function collector() {
  const host = {}
  new Function('globalThis', `(${installOpeningMatrix.toString()})()`)(host)
  return host
}
function fixture(engine) {
  const h = collector(),
    pos = engine === 'game' ? [0, 0] : [0, 0, 0]
  const state = (visible = true, sprite = null) => ({
    position: [...pos],
    facing: 'down',
    visible,
    sprite,
    frame: 0,
  })
  const party = state(true, engine === 'game' ? 193 : 'sprite-193')
  h.__openingMatrixPoint('commit:setup', { scene: 's000', actors: { party } })
  const actors = { party, e3: state(false), e8: state(), e10: state(false), e11: state() }
  const point = () => h.__openingMatrixPoint('commit:fixture', { scene: 's001', actors })
  point()
  for (const frame of [1, 2, 3, 0]) {
    actors.e11.frame = frame
    point()
  }
  actors.e11.visible = false
  actors.e10.visible = true
  point() // atomic/co-observed replacement
  actors.e10.position[0]++
  point()
  actors.e10.visible = false
  actors.e3.visible = true
  point()
  for (let i = 0; i < 8; i++) {
    const delta = engine === 'game' ? [4, 2] : [0.25, 0, 0]
    actors.e8.position = actors.e8.position.map((v, j) => v + (i < 4 ? delta[j] : -delta[j]))
    point()
  }
  party.sprite = engine === 'game' ? 627 : 'sprite-627'
  point()
  party.sprite = engine === 'game' ? 2 : 'li-xiaoyao'
  party.position[0]++
  point()
  const contract = {
    hashes: {},
    locale: { name: '甲' },
    cues: [
      { scene: 's000', ids: ['d0'], texts: ['梦境'], speaker: null },
      { scene: 's001', ids: ['d1', 'd2'], texts: ['正文一', '正文二'], speaker: '甲' },
    ],
  }
  contract.rows = contract.cues.flatMap((c) =>
    c.ids.map((id, i) => ({ id, scene: c.scene, text: c.texts[i], speaker: c.speaker })),
  )
  if (engine === 'game') {
    h.__openingMatrixPage(engine, 's000', { lines: ['梦境'], title: null })
    h.__openingMatrixPage(engine, 's001', { lines: ['正文一'], title: '甲∶' })
    h.__openingMatrixPage(engine, 's001', { lines: ['正文一', '正文二'], title: '甲∶' })
  } else
    for (const c of contract.cues)
      c.ids.forEach((id, i) => {
        h.__openingMatrixPage(engine, c.scene, {
          phase: 'waiting-input',
          rowTextIds: c.ids,
          pageTextIds: [id],
          pageText: c.texts[i],
          pageIndex: i,
          pageCount: c.ids.length,
          speaker: c.speaker ? 'name' : null,
        })
      })
  return { matrix: h.__readOpeningMatrix(), contract }
}

for (const engine of ['game', 'reforge']) {
  test(`${engine}: full rows, speakers, atomic replacement and out/back movement pass`, () => {
    const { matrix, contract } = fixture(engine)
    assert.equal(assertOpeningMatrix(matrix, engine, contract).rows, 3)
  })
  test(`${engine}: missing body text fails even if requested IDs remain`, () => {
    const { matrix, contract } = fixture(engine)
    if (engine === 'game') matrix.pages.at(-1).page.lines = ['正文一']
    else matrix.pages.at(-1).page.pageText = ''
    assert.throws(
      () => assertOpeningMatrix(matrix, engine, contract),
      /rows differ|page text differs/,
    )
  })
  test(`${engine}: wrong speaker, dropped actor event and later stand-in hide fail`, () => {
    const { matrix, contract } = fixture(engine)
    const speaker = structuredClone(matrix)
    if (engine === 'game') speaker.pages[1].page.title = '乙∶'
    else speaker.pages[1].page.speaker = '乙'
    assert.throws(() => assertOpeningMatrix(speaker, engine, contract), /speaker differs/)
    const dropped = structuredClone(matrix)
    const index = dropped.actors.findIndex((e) => e.id === 'e11' && e.state.frame === 2)
    dropped.actors.splice(index, 1)
    dropped.actors.forEach((e, i) => {
      e.seq = i
    })
    assert.throws(() => assertOpeningMatrix(dropped, engine, contract), /state change was lost/)
    const delayed = structuredClone(matrix)
    const hidden = delayed.actors.find((e) => e.id === 'e11' && !e.state.visible)
    hidden.sample++
    assert.throws(
      () => assertOpeningMatrix(delayed, engine, contract),
      /snapshot order regressed|replacement order/,
    )
  })
}

test('collector is sparse, detached, bounded, and flags unobserved movement', () => {
  const h = collector(),
    state = { scene: 's001', actors: { party: { position: [0, 0], visible: true } } }
  for (let i = 0; i < 10; i++) h.__openingMatrixPoint('render:world', state)
  assert.equal(h.__readOpeningMatrix().actors.length, 2)
  state.actors.party.position = [1, 0]
  h.__openingMatrixPoint('render:world', state)
  assert.match(h.__readOpeningMatrix().errors[0], /unobserved matrix move/)
  const copy = h.__readOpeningMatrix()
  copy.actors.length = 0
  assert.equal(h.__readOpeningMatrix().actors.length, 3)
  for (let i = 0; i < 605; i++) h.__openingMatrixPage('game', 's001', { lines: [String(i)] })
  assert.equal(h.__readOpeningMatrix().pages.length, 600)
  assert.equal(h.__readOpeningMatrix().overflow, true)
})
