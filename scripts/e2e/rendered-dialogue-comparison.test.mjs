import assert from 'node:assert/strict'
import test from 'node:test'
import { compareRenderedDialogue, sourceDialogueGroups } from './rendered-dialogue-comparison.mjs'

const scene = 's002'
const source = [
  { op: 'setDialogStyleTop', arg0: 10 },
  { op: 'showDialog', text: '李逍遥∶' },
  { op: 'showDialog', messageIndex: 628, text: '我明明．．明明．．．' },
  { op: 'raw', opcode: 5 },
  { op: 'showDialog', messageIndex: 629, text: '"李逍遥从昨天出发到仙灵岛"' },
  { op: 'showDialog', messageIndex: 630, text: '"至拿药回来的记忆全失去了"' },
  { op: 'raw', opcode: 5 },
]
const expected = sourceDialogueGroups(source, [{ scene, first: 0, last: 6 }])
const visible = (i, overrides) => {
  const { rows, slot, speaker, portrait, portraitLayout } = expected[i]
  return {
    scene,
    atMs: i * 1000 + 80,
    slots: [
      {
        slot,
        speaker,
        portrait,
        portraitLayout,
        lines: rows.map(({ text }) => text),
        ids: rows.map(({ id }) => id),
        ...overrides,
      },
    ],
  }
}

test('a redraw clears the displayed speaker and portrait and keeps the source slot', () => {
  assert.deepEqual(
    expected.map(({ slot, speaker, portrait }) => [slot, speaker, portrait]),
    [
      ['top', '李逍遥', 10],
      ['top', null, null],
    ],
  )
  assert.equal(compareRenderedDialogue([visible(0), visible(1)], expected).status, 'passed')
  const wrong = visible(1, { speaker: '李逍遥', portrait: 10 })
  const proof = compareRenderedDialogue([visible(0), wrong, visible(1)], expected)
  assert.equal(proof.status, 'rejected')
  assert.deepEqual(
    proof.findings.map(({ issue }) => issue),
    ['wrong-drawn-dialogue-identity'],
  )
  assert.equal(proof.findings[0].rows[0].id, 'dlg.629')
})

test('missing text, a relocated slot and a changed body independently fail', () => {
  for (const [draws, issue] of [
    [[visible(0)], 'missing-complete-dialogue-draw'],
    [[visible(0), visible(1, { slot: 'bottom' })], 'wrong-drawn-dialogue-identity'],
    [[visible(0), visible(1, { portraitLayout: false })], 'wrong-drawn-dialogue-identity'],
    [[visible(0), visible(1, { lines: ['记忆没有失去'] })], 'unexpected-drawn-dialogue'],
  ]) {
    const result = compareRenderedDialogue(draws, expected)
    assert.equal(result.status, 'rejected')
    assert.equal(result.findings[0].issue, issue)
  }
})

test('an absent field cannot stand for a drawn box without a title or portrait', () => {
  for (const field of ['speaker', 'portrait', 'portraitLayout']) {
    const incomplete = visible(1)
    delete incomplete.slots[0][field]
    const result = compareRenderedDialogue([visible(0), incomplete, visible(1)], expected)
    assert.equal(result.status, 'rejected')
    assert.equal(result.findings[0].issue, 'incomplete-drawn-dialogue-record')
    assert.deepEqual(result.findings[0].missing, [field])
  }
})
