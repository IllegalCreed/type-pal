import assert from 'node:assert/strict'
import test from 'node:test'
import { installCommittedRoutePlayback, replayCommittedRoute } from './committed-route.mjs'
import { continuousStoryActions } from './continuous-story.mjs'
import { innInputPlan } from './inn-input-plan.mjs'
import {
  assertInputLedger,
  createRecordedHold,
  pressRecordedKey,
  withRecordedInputSession,
  withRecordedKey,
} from './input-ledger.mjs'

test('real key executor retains down/up outcomes and releases partial down/up failures without admitting success', async () => {
  for (const fault of [null, 'down', 'up', 'record-up']) {
    const actions = [],
      calls = []
    let held = false,
      failed = false
    const keyboard = {
      down: async (key) => {
        held = true
        calls.push(['down', key])
        if (fault === 'down') throw new Error('partial down')
      },
      up: async (key) => {
        calls.push(['up', key])
        if (fault === 'up' && !failed) {
          failed = true
          throw new Error('partial up')
        }
        held = false
      },
    }
    if (fault === 'record-up') {
      await assert.rejects(
        withRecordedKey({
          keyboard,
          key: 'Escape',
          onInput: (a) => {
            if (a.kind === 'up') throw new Error('record limit')
          },
        }),
      )
    } else {
      const run = pressRecordedKey({
        keyboard,
        action: { key: 'Escape', scope: 'story' },
        record: (a) => actions.push(a),
      })
      if (fault) {
        await assert.rejects(run)
        assert.throws(() => assertInputLedger(actions, { requireReceipts: true }), /not completed/)
      } else {
        await run
        assertInputLedger(actions, { requireReceipts: true })
        assert.deepEqual(
          continuousStoryActions({ actions }).map((a) => a.key),
          ['Escape'],
        )
        const wrong = structuredClone(actions)
        for (const edge of wrong[0].execution.dispatches) edge.key = 'Enter'
        assert.throws(() => assertInputLedger(wrong, { requireReceipts: true }), /key mismatch/)
      }
      assert.equal(
        actions[0].execution.dispatches[0].execution.status,
        fault === 'down' ? 'failed' : 'completed',
      )
    }
    assert.equal(held, false)
    assert.equal(calls.filter(([kind]) => kind === 'down').length, 1)
    assert(calls.some(([kind]) => kind === 'up'))
  }
})

test('scope trimming rejects malformed, failed and cross-boundary holds; ordinary menu press is retained', () => {
  const pair = [
    { kind: 'down', key: 'ArrowLeft', scope: 'story' },
    { kind: 'up', key: 'ArrowLeft', scope: 'story' },
  ]
  for (const actions of [
    [pair[0]],
    [pair[1]],
    [pair[0], { ...pair[1], scope: 'boundary' }],
    [
      { ...pair[0], fragment: '003' },
      { ...pair[1], fragment: '004' },
    ],
    [
      { ...pair[0], context: 'story' },
      { ...pair[1], context: 'restore' },
    ],
    [{ key: 'Escape', scope: 'boundry' }],
    [{ key: 'Escape', kind: 'typo' }],
    [{ key: 'Escape', execution: { status: 'failed' } }],
  ])
    assert.throws(() => continuousStoryActions({ actions }))
  assert.deepEqual(
    continuousStoryActions({
      actions: [
        { kind: 'press', key: 'Escape', scope: 'story' },
        { key: 'Escape', scope: 'boundary' },
        ...pair,
      ],
    }).map((a) => a.key),
    ['Escape', 'ArrowLeft', 'ArrowLeft'],
  )
})

test('a held key keeps partial failure identity and a single bounded release result', async () => {
  for (const permanent of [false, true]) {
    const actions = []
    let downCalls = 0,
      upCalls = 0
    const hold = createRecordedHold({
      key: 'ArrowRight',
      onInput: (a) => actions.push(a),
      keyboard: {
        down: async () => {
          downCalls++
          throw new Error('partial down')
        },
        up: async () => {
          if (++upCalls === 1 || permanent) throw new Error('partial up')
        },
      },
    })
    await assert.rejects(hold.down(), /partial down/)
    await assert.rejects(hold.down(), /duplicate/)
    const release = hold.up()
    assert.equal(hold.up(), release)
    await assert.rejects(release)
    await assert.rejects(hold.up())
    assert.equal(downCalls, 1)
    assert.equal(upCalls, 2)
    assert.equal(hold.held, permanent)
    assert.deepEqual(
      actions.map((a) => a.execution.status),
      ['failed', 'failed', permanent ? 'failed' : 'completed'],
    )
    assert.throws(() => assertInputLedger(actions, { requireReceipts: true }), /not completed/)
  }
})

test('continuous input session records actual edges and cleans up when its caller fails', async () => {
  for (const fault of [null, 'down', 'caller']) {
    const actions = [],
      calls = []
    const run = withRecordedInputSession({
      keyboard: {
        down: async (key) => {
          calls.push(['down', key])
          if (fault === 'down') throw new Error('down failure')
        },
        up: async (key) => {
          calls.push(['up', key])
        },
      },
      record: (action) => actions.push(action),
      body: async (execute) => {
        const owner = { key: 'ArrowLeft', fragment: '005', scope: 'story' }
        await execute({ ...owner, kind: 'down', execution: { status: 'old' } })
        if (fault === 'caller') throw new Error('snapshot failure')
        await execute({ ...owner, kind: 'up' })
        await execute({ key: 'Escape', fragment: '005', scope: 'story' })
      },
    })
    if (fault) await assert.rejects(run, /failure/)
    else await run
    assert.deepEqual(calls.slice(0, 2), [
      ['down', 'ArrowLeft'],
      ['up', 'ArrowLeft'],
    ])
    assert.equal(actions.length, fault ? 2 : 3)
    if (fault === 'down') assert.throws(() => assertInputLedger(actions, { requireReceipts: true }))
    else assertInputLedger(actions, { requireReceipts: true })
    if (!fault) assert.equal(actions[2].execution.dispatches[0].kind, 'down')
  }
})

test('fixed 002 executor consumes the entire exact position sequence in one hold per straight leg; facing is not movement', async () => {
  for (const engine of ['game', 'reforge']) {
    const host = {},
      actions = []
    new Function('globalThis', `(${installCommittedRoutePlayback.toString()})()`)(host)
    const observe = (source, scene, position, ready, dialogue = false) =>
      host.__routeObserve(source, {
        scene,
        actors: { party: { position } },
        routeReady: ready,
        routeDialogue: dialogue,
      })
    const page = {
      evaluate: (fn, arg) =>
        new Function('window', 'arg', `return (${fn.toString()})(arg)`)(host, arg),
    }
    for (const id of [0, 1]) {
      const route = innInputPlan(engine, id)
      observe('commit:scene-ready', route.steps[0].scene, route.steps[0].from, true)
      page.keyboard = {
        down: async (key) => {
          assert.equal(key, id === 0 ? 'ArrowDown' : 'ArrowLeft')
          observe('commit:player.facing', route.steps[0].scene, route.steps[0].from, true)
          // Deliver all commits before Node can poll, including a transient final cell.
          for (const step of route.steps) observe(step.source, step.scene, step.to, true)
          observe(
            'commit:scene-ready',
            route.completion.scene,
            route.completion.position,
            id === 0,
            id === 1,
          )
        },
        up: async () => {},
      }
      await replayCommittedRoute({ page, route, onInput: (a) => actions.push(a) })
    }
    assertInputLedger(actions, { requireReceipts: true })
    assert.deepEqual(
      actions.map((a) => [a.kind, a.key]),
      [
        ['down', 'ArrowDown'],
        ['up', 'ArrowDown'],
        ['down', 'ArrowLeft'],
        ['up', 'ArrowLeft'],
      ],
    )
  }
})
