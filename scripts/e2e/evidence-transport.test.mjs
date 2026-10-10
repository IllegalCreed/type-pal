import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { installErrandObserver } from './errand-observer.mjs'
import { createEvidenceRecorder } from './evidence-recorder.mjs'
import { readEvidenceArchive } from './evidence-transport.mjs'
import { installMealObserver } from './meal-observer.mjs'
import { createSnapshotGraph } from './snapshot-graph.mjs'

test('route/status projections never read archive providers; JSON transport preserves the complete persisted archive', async () => {
  for (const [install, name] of [
    [installMealObserver, 'Meal'],
    [installErrandObserver, 'Errand'],
  ]) {
    let causalReads = 0,
      resourceReads = 0
    const context = vm.createContext({
      performance,
      TextEncoder,
      structuredClone,
      addEventListener() {},
      readResource: () => resourceReads++,
      causal: () => ({
        clock: () => null,
        read: () => {
          causalReads++
          return [{ phase: 'retained', ...(name === 'Errand' ? { snapshotRefs: {} } : {}) }]
        },
      }),
    })
    vm.runInContext(
      `(${install.toString()})(causal, (options) => {
      const recorder = (${createEvidenceRecorder.toString()})(options)
      const resources = recorder.resources
      recorder.resources = () => { readResource(); return resources() }
      return recorder
    }, ${createSnapshotGraph})`,
      context,
    )
    const state = {
      scene: 's001',
      actors: { party: { position: [3, 4, 0], facing: 'down', visible: true } },
      money: 500,
      inventory: [],
      persistent: {},
      hooks: {},
      control: true,
    }
    context[`__${name.toLowerCase()}Point`]('commit:player.input', state)
    state.actors.party.position = [3, 5, 0]
    context[`__${name.toLowerCase()}Point`]('commit:player.input', state)
    context.__e2eRecordSpriteFrame({ width: 1, height: 1, pixels: [7], opaque: [1] })
    const route = context[`__read${name}RouteEvidence`]()
    assert.equal(route.events.length, 2)
    assert.equal(route.overflow, false)
    assert.deepEqual(route.errors, [])
    if (name === 'Errand') {
      const status = context.__readErrandStatus()
      assert.equal(status.final.money, 500)
      assert.equal(status.saveCaptures, 0)
      assert.equal(status.saveCompletions, 0)
    }
    assert.equal(causalReads, 0)
    assert.equal(resourceReads, 0)
    route.events[1].state.position[1] = -1
    const wire = []
    const page = {
      evaluate(fn, arg) {
        context.window = context
        context.arg = arg
        const value = vm.runInContext(`(${fn.toString()})(arg)`, context)
        assert.equal(
          typeof value,
          'string',
          'archive must not cross RPC as a recursively materialized object',
        )
        wire.push(value)
        return value
      },
    }
    const reader = `__read${name}Evidence`
    const archive = await readEvidenceArchive(page, reader)
    assert.equal(causalReads, 1)
    assert.equal(resourceReads, 1)
    assert.deepEqual(archive.causes, [{ phase: 'retained' }])
    assert.deepEqual(archive.resources[0].pixels, [7])
    assert.equal(
      archive.events.filter((e) => e.kind === 'actor' && e.id === 'party')[1].state.position[1],
      5,
    )
    assert.equal(wire[0], JSON.stringify(context[reader]()))
    await assert.rejects(readEvidenceArchive(page, '__missing'), /missing evidence reader/)
  }
})
