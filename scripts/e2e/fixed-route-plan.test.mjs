import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { installCommittedRoutePlayback } from './committed-route.mjs'
import { executeFixedRoute, fixedRoutePlan } from './fixed-route-plan.mjs'
import { innCausalObserverScript } from './inn-observer.mjs'
import { assertInputLedger } from './input-ledger.mjs'

test('fixed journey binds actual input ledger, event route and independent completion without rewriting its plan', async () => {
  for (const fault of [null, 'missing-recorded-commit', 'wrong-story-end']) {
    const host = vm.createContext({
      structuredClone,
      performance,
      TextEncoder,
      setTimeout,
      clearTimeout,
    })
    vm.runInContext(innCausalObserverScript(), host)
    vm.runInContext(`(${installCommittedRoutePlayback.toString()})()`, host)
    let pos = [3, 4, 0]
    const point = () =>
      host.__innPoint('commit:player.input', {
        scene: 's003',
        actors: { party: { position: pos, facing: 'left' } },
        roomActors: [],
        routeReady: true,
        routeDialogue: false,
        control: true,
        money: 0,
      })
    point()
    const plan = fixedRoutePlan('reforge', {
      id: 'test:fixed',
      scene: 's003',
      start: [3, 4],
      holds: [['ArrowLeft', 2]],
      completion: { scene: 's003', position: [1, 4], mode: 'ready' },
    })
    const original = structuredClone(plan),
      calls = [],
      report = { actions: [], route: { inputs: [], legs: [] } }
    const run = () =>
      executeFixedRoute({
        page: {
          evaluate: (fn, arg) =>
            new Function('window', 'arg', `return (${fn.toString()})(arg)`)(host, arg),
          keyboard: {
            down: async (key) => {
              calls.push(['down', key])
              for (const col of [2, 1]) {
                pos = [col, 4, 0]
                point()
              }
            },
            up: async (key) => {
              calls.push(['up', key])
            },
          },
        },
        engine: 'reforge',
        plan,
        scene: 's003',
        id: 0,
        phase: 'walk',
        report,
        snapshot: async () => ({
          scene: 's003',
          position: pos,
          ready: fault !== 'wrong-story-end',
        }),
        evidence: async () => {
          const trace = host.__readInnEvidence()
          if (fault === 'missing-recorded-commit')
            trace.events = trace.events.filter((event) => event.state?.position?.[0] !== 2)
          return trace
        },
        ready: (s) => s.ready,
        finished: (s) => s.ready,
      })
    if (fault)
      await assert.rejects(
        run,
        fault === 'wrong-story-end' ? /independent story condition/ : /differ from fixed plan/,
      )
    else {
      await run()
      assertInputLedger(report.actions, { requireReceipts: true })
      assert.deepEqual(report.route.legs[0].replay.completion, plan.completion)
      assert.equal(report.actions[0].scope, 'story')
      assert.equal(report.actions[0].routeId, 0)
    }
    assert.deepEqual(calls, [
      ['down', 'ArrowLeft'],
      ['up', 'ArrowLeft'],
    ])
    assert.deepEqual(plan, original, 'observations cannot rewrite the expected route')
    assert.equal(report.route.legs.length, fault ? 0 : 1)
  }
})
