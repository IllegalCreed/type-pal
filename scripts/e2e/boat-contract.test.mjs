import assert from 'node:assert/strict'
import test from 'node:test'
import { assertBoatReport, BOAT_DIALOGUE_ROWS, boatArguments } from './boat-contract.mjs'

function completedReport() {
  return {
    fragment: '006',
    engine: 'reforge',
    kind: 'verify',
    status: 'passed',
    core: { status: 'passed', rows: BOAT_DIALOGUE_ROWS.map((id) => `dlg.${id}`) },
    route: { status: 'passed' },
    checks: {
      room: 'passed',
      doctor: 'passed',
      boat: 'passed',
      island: 'passed',
      'island-arrival': 'passed',
    },
    endWorld: {
      position: { sceneId: 's014', pos: { col: 74, row: 27, height: 0 } },
      arrivalDialogue: [],
      controlReturned: true,
    },
    boatMotion: {
      samples: 3,
      partyBoatRelative: 'constant-through-ride',
      relativeOffset: [-2, -4],
      companionOffset: [-2, 2.25],
      rideFacings: ['up'],
    },
  }
}

test('006 input options cannot silently discard an unsupported action, conflicting mode or duplicate predecessor', () => {
  assert.deepEqual(boatArguments(['--from', '/tmp/005.json']), {
    headless: true,
    from: '/tmp/005.json',
  })
  assert.equal(boatArguments(['--headed', '--from', '/tmp/005.json']).headless, false)
  for (const args of [
    [],
    ['--from'],
    ['--from', '--headed'],
    ['--from', 'x', '--from', 'y'],
    ['--from', 'x', '--headed', '--headless'],
    ['--from', 'x', '--headed', '--headed'],
    ['--from', 'x', '--capture'],
    ['--from', 'x', '--case', 'story'],
  ])
    assert.throws(() => boatArguments(args))
})

test('006 cannot pass at island arrival while its dialogue or script still owns control', () => {
  assertBoatReport(completedReport())
  const unfinished = completedReport()
  unfinished.endWorld.arrivalDialogue = ['dlg.1886']
  assert.throws(() => assertBoatReport(unfinished), /arrival dialogue/)
  const running = completedReport()
  running.endWorld.controlReturned = false
  assert.throws(() => assertBoatReport(running), /control/)
  const missing = completedReport()
  delete missing.endWorld.controlReturned
  assert.throws(() => assertBoatReport(missing), /control/)
})

test('006 requires the full island closing dialogue and its completed phase', () => {
  const missing = completedReport()
  delete missing.checks['island-arrival']
  assert.throws(() => assertBoatReport(missing), /island-arrival/)
  const truncated = completedReport()
  truncated.core.rows = truncated.core.rows.filter((id) => id !== 'dlg.1890')
  assert.throws(() => assertBoatReport(truncated))
})
