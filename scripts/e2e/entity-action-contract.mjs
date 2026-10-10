import assert from 'node:assert/strict'
import s000 from '../../projects/pal/content/scenes/s000.json' with { type: 'json' }
import s001 from '../../projects/pal/content/scenes/s001.json' with { type: 'json' }
import s002 from '../../projects/pal/content/scenes/s002.json' with { type: 'json' }
import s003 from '../../projects/pal/content/scenes/s003.json' with { type: 'json' }
import s004 from '../../projects/pal/content/scenes/s004.json' with { type: 'json' }
import s005 from '../../projects/pal/content/scenes/s005.json' with { type: 'json' }
import s014 from '../../projects/pal/content/scenes/s014.json' with { type: 'json' }
import sprites from '../../projects/pal/content/sprites.json' with { type: 'json' }

export const canonicalScenes = { s000, s001, s002, s003, s004, s005, s014 }

const boundaries = (action) => {
  const out = [0]
  for (const step of action.steps) out.push(out.at(-1) + step.durationMs)
  return out
}
function atPosition(action, position, finished = false) {
  const ends = boundaries(action),
    index = finished
      ? action.steps.length - 1
      : ends.findIndex((end, i) => i > 0 && position < end) - 1
  assert(index >= 0, 'action timeline position outside definition')
  return { stepIndex: index, elapsedInStepMs: position - ends[index], finished }
}
function initial(action, binding) {
  const ends = boundaries(action),
    total = ends.at(-1),
    intro = ends[action.loopFrom ?? 0]
  const elapsed = binding.startAtMs ?? 0
  const position = binding.loop ? (intro ? 0 : elapsed % total) : Math.min(total, elapsed)
  return {
    ...atPosition(action, position, !binding.loop && position === total),
    pendingLoopStartAtMs: binding.loop && intro ? elapsed : null,
  }
}
function advanced(action, state, dt) {
  assert(!state.finished, 'finished action advanced')
  assert(Number.isFinite(dt) && dt > 0, 'action advance needs positive finite dt')
  const ends = boundaries(action),
    total = ends.at(-1),
    intro = ends[action.loopFrom ?? 0]
  let position = ends[state.stepIndex] + state.elapsedInStepMs + dt,
    pending = state.pendingLoopStartAtMs
  const remaining = state.binding.loop ? 0 : Math.max(0, position - total)
  if (state.binding.loop) {
    if (pending !== null && position >= intro) {
      position = intro + ((position - intro + pending) % (total - intro))
      pending = null
    } else if (position >= total) position = intro + ((position - total) % (total - intro))
  } else position = Math.min(position, total)
  return {
    state: {
      ...state,
      ...atPosition(action, position, !state.binding.loop && position === total),
      pendingLoopStartAtMs: pending,
    },
    remaining,
  }
}
const normalized = (input) => ({
  ...input,
  owner: input.owner ?? null,
  pendingLoopStartAtMs: input.pendingLoopStartAtMs ?? null,
})

/** Canonical action definitions + observed time/gate inputs, independent of displayed frames. */
export function verifyEntityActionTimelines(
  trace,
  definitions = sprites,
  scenes = canonicalScenes,
) {
  const tracks = new Map(),
    gates = new Map(),
    advances = new Map(),
    selections = new Map(),
    outputs = [],
    frames = []
  let installed = new Map(),
    expectedFrame = false,
    actualFrame = null,
    completedFrame = false
  const installations = []
  const expectedBindings = (event) => {
    const scene = scenes[event.scene]
    assert(scene && event.pageState, 'action canonical scene/page state missing')
    return new Map(
      scene.entities.flatMap((entity) => {
        const page = entity.pages?.find(
          (page) => page.id === (event.pageState[entity.id]?.page ?? entity.initialPage),
        )
        return page?.animation ? [[entity.id, page.animation]] : []
      }),
    )
  }
  const checkInstalledState = (list) => {
    assert.deepEqual(
      list.map((e) => [e.entity, e.base?.trackId ?? null, e.override?.trackId ?? null]),
      [...installed].map(([id, e]) => [id, e.base?.trackId ?? null, e.override?.trackId ?? null]),
      'action frame installed identity differs',
    )
    for (const entry of list) {
      assert.equal(entry.override, null, 'this story contract admits page/base actions only')
      if (entry.base)
        assert.deepEqual(
          entry.base.state,
          tracks.get(entry.base.trackId)?.state,
          'action installed phase differs from proven timeline',
        )
    }
  }
  const closeFrame = () => {
    assert(!actualFrame, 'action frame end missing')
    assert(!expectedFrame || completedFrame, 'installed page actions lost entire gameplay frame')
    for (const gate of gates.values()) assert(gate.paused, 'eligible action failed to advance')
    gates.clear()
  }
  let previousNow = 0,
    previousReal = 0,
    frameDt = null,
    frameId = null,
    carry = null
  const timeline = [
    ...(trace.causes ?? []),
    ...(trace.worldRenders ?? []).map((event) => ({
      ...event,
      engine: 'reforge',
      phase: 'proof:world-render',
    })),
  ].sort((a, b) => a.order - b.order)
  for (const event of timeline) {
    if (event.engine !== 'reforge') continue
    if (event.phase === 'proof:world-render') {
      const scene = scenes[event.scene]
      if (scene?.entities.some((entity) => entity.pages?.some((page) => page.animation))) {
        const origin = installations.findLast(
          (entry) => entry.scene === event.scene && entry.sceneVisit === event.sceneVisit,
        )
        assert(origin, 'rendered scene missing page-action installation evidence')
        const expected = expectedBindings(origin)
        assert.deepEqual(
          [...installed.keys()].sort(),
          [...expected.keys()].sort(),
          'world draw lost canonical page actions',
        )
        for (const [entity, binding] of expected)
          assert.deepEqual(
            tracks.get(installed.get(entity).base.trackId).state.binding,
            binding,
            'world draw uses wrong page action',
          )
      }
      frames.push({
        order: event.order,
        scene: event.scene,
        sceneVisit: event.sceneVisit,
        frames: Object.fromEntries(
          [...installed].map(([entity, entry]) => {
            const track = tracks.get(entry.base.trackId)
            return [entity, track.definition.steps[track.state.stepIndex].frame]
          }),
        ),
      })
    }
    if (event.phase === 'clock') {
      closeFrame()
      assert.equal(event.requested, false, 'debug-requested action clock is outside story playback')
      assert(Number.isFinite(event.realNow), 'action clock lacks real timestamp')
      const first = previousReal === 0,
        realDt = first ? 0 : Math.min(Math.max(0, event.realNow - previousReal), 100)
      frameDt = event.frozen || event.stepping ? 0 : realDt
      assert.equal(
        event.now,
        first ? event.realNow : previousNow + frameDt,
        'action gameplay clock differs from real clock and freeze gate',
      )
      previousReal = event.realNow
      previousNow = event.now
      frameId = event.clock.frameId
      carry = null
      expectedFrame = installed.size > 0 && !event.frozen && !event.stepping
      completedFrame = false
    }
    if (event.phase === 'action-track') {
      assert(!tracks.has(event.trackId), 'action track identity reused')
      const definition = definitions.find((sprite) => sprite.id === event.state.binding.sprite)
        ?.poses?.[event.state.binding.action]
      assert(definition, 'action definition missing from canonical sprite')
      assert.deepEqual(
        event.definition,
        definition,
        'runtime action definition differs from canonical',
      )
      if (event.origin.kind === 'created') {
        assert.deepEqual(
          event.state.binding,
          event.origin.resolved.binding,
          'action binding changed during creation',
        )
        assert.deepEqual(
          event.origin.resolved.action,
          definition,
          'action creation resolves wrong definition',
        )
        assert.deepEqual(
          event.state,
          {
            binding: event.origin.resolved.binding,
            source: event.origin.source,
            awaited: event.origin.awaited,
            owner: null,
            ...initial(definition, event.state.binding),
          },
          'action initial phase differs',
        )
      } else {
        assert.equal(event.origin.kind, 'restored', 'unknown action origin')
        assert.deepEqual(
          event.state,
          normalized(event.origin.input),
          'action restore changed input phase',
        )
        const preparation = event.origin.preparation
        assert(preparation, 'action restoration has no actual preparation identity')
        const preparing = (trace.causes ?? []).find(
          (e) =>
            e.phase === 'action-preparing' &&
            e.snapshotId === preparation.snapshotId &&
            e.order < event.order,
        )
        assert(
          preparing && preparing.scene === preparation.scene,
          'action restoration lacks earlier preparation',
        )
        const captured = (trace.causes ?? []).find(
          (e) =>
            e.phase === 'runtime-captured' &&
            e.snapshotId === preparation.snapshotId &&
            e.order < preparing.order,
        )
        const loaded = (trace.causes ?? []).find(
          (e) =>
            e.phase === 'runtime-loaded' &&
            e.scene === preparation.scene &&
            ((e.inputSnapshotId === preparation.snapshotId && e.order > preparing.order) ||
              (e.snapshotId === preparation.snapshotId && e.order < preparing.order)),
        )
        const input =
          loaded &&
          (trace.restoreCommits ?? []).find((e) => e.loadId === loaded.loadId)?.inputPayload
            ?.sceneRuntime?.[preparation.scene]
        const saved = captured?.saved ?? input
        assert(saved, 'action restore source is not earlier capture or identity-bound load input')
        if (JSON.stringify(preparing.saved) !== JSON.stringify(saved)) {
          const mutations = (trace.causes ?? []).filter((candidate) => {
            const command = candidate.occurrence?.command?.command,
              target = command?.target
            return (
              candidate.phase === 'command' &&
              candidate.order > (captured?.order ?? -Infinity) &&
              candidate.order < preparing.order &&
              target?.scene === preparation.scene &&
              [
                'setEntityPos',
                'selectEntityBehavior',
                'selectEntityPage',
                'hideEntity',
                'removeEntity',
              ].includes(command.kind)
            )
          })
          assert(
            mutations.length,
            'action preparation changed source snapshot without a scene mutation',
          )
          const targets = new Set(
            mutations.map((mutation) => mutation.occurrence.command.command.target.entity),
          )
          const changed = new Set(
            [
              ...new Set([
                ...Object.keys(preparing.saved.automatic ?? {}),
                ...Object.keys(saved.automatic ?? {}),
              ]),
              ...(preparing.saved.actions ?? []).map((entry) => entry.entity),
              ...(saved.actions ?? []).map((entry) => entry.entity),
              ...new Set([
                ...Object.keys(preparing.saved.entities ?? {}),
                ...Object.keys(saved.entities ?? {}),
              ]),
            ].filter(
              (entity) =>
                JSON.stringify(preparing.saved.automatic?.[entity]) !==
                  JSON.stringify(saved.automatic?.[entity]) ||
                JSON.stringify(preparing.saved.entities?.[entity]) !==
                  JSON.stringify(saved.entities?.[entity]) ||
                JSON.stringify(
                  preparing.saved.actions?.find((entry) => entry.entity === entity),
                ) !== JSON.stringify(saved.actions?.find((entry) => entry.entity === entity)),
            ),
          )
          for (const entity of changed)
            assert(targets.has(entity), `action preparation changed unowned entity ${entity}`)
        }
        assert(
          saved.actions?.some(
            (e) =>
              e.entity === event.origin.entity &&
              JSON.stringify(e[event.origin.slot]) === JSON.stringify(event.origin.input),
          ),
          'action restoration lacks captured/input phase',
        )
      }
      tracks.set(event.trackId, { definition, state: structuredClone(event.state) })
    }
    if (event.phase === 'action-installed') {
      const next = new Map(event.installed.map((entry) => [entry.entity, entry]))
      assert.equal(next.size, event.installed.length, 'action installed duplicate entity')
      for (const entry of next.values()) {
        assert.equal(entry.override, null, 'this story contract admits page/base actions only')
        assert(entry.base && tracks.has(entry.base.trackId), 'installed base lacks actual creation')
        assert.equal(entry.base.state.source, 'automatic', 'page base must use automatic ownership')
        assert.equal(entry.base.state.awaited, false, 'page base cannot be awaited by a runner')
        assert.equal(
          entry.base.state.owner,
          null,
          'page base cannot have an automatic behavior owner',
        )
        assert.deepEqual(
          entry.base.state,
          tracks.get(entry.base.trackId).state,
          'installed base changed phase',
        )
      }
      if (['syncBases', 'replaceScene', 'restored'].includes(event.reason)) {
        const expected = expectedBindings(event)
        assert.deepEqual(
          [...next.keys()].sort(),
          [...expected.keys()].sort(),
          'page action install census differs',
        )
        for (const [entity, entry] of next) {
          assert.deepEqual(
            entry.base.state.binding,
            expected.get(entity),
            'entity page action binding differs',
          )
          if (
            event.reason === 'syncBases' &&
            installed.get(entity)?.base &&
            JSON.stringify(installed.get(entity).base.state.binding) ===
              JSON.stringify(expected.get(entity))
          )
            assert.equal(
              entry.base.trackId,
              installed.get(entity).base.trackId,
              'unchanged page action restarted',
            )
        }
      } else if (event.reason === 'clearScene')
        assert.equal(next.size, 0, 'scene action clear incomplete')
      else {
        assert.equal(event.reason, 'clearEntity', 'unclassified action installation')
        const previous = new Map(installed)
        previous.delete(event.entity)
        assert.deepEqual(
          [...next.keys()],
          [...previous.keys()],
          'entity clear changed unrelated actions',
        )
      }
      installed = next
      installations.push(event)
    }
    if (event.phase === 'action-frame-start') {
      assert(!actualFrame && !completedFrame, 'duplicate action advance for gameplay frame')
      assert.equal(event.dtMs, frameDt, 'action frame input does not match gameplay dt')
      checkInstalledState(event.installed)
      actualFrame = {
        event,
        required: new Set(
          event.dtMs > 0
            ? event.installed
                .filter((e) => e.base && !e.base.state.finished)
                .map((e) => e.base.trackId)
            : [],
        ),
      }
    }
    if (event.phase === 'action-frame-end') {
      assert(
        actualFrame && actualFrame.event.actionFrameId === event.actionFrameId,
        'action frame end identity differs',
      )
      assert.equal(event.failed, false, 'action frame failed')
      assert.equal(actualFrame.required.size, 0, 'action frame lost eligible/paused base')
      checkInstalledState(event.installed)
      actualFrame = null
      completedFrame = true
    }
    if (event.phase === 'action-gate') {
      const track = tracks.get(event.trackId),
        input = event.inputs
      assert(track && input, 'action gate lacks track or actual gate inputs')
      assert(
        actualFrame?.required.has(event.trackId),
        'action gate outside installed frame obligations',
      )
      actualFrame.required.delete(event.trackId)
      assert.equal(input.entity, event.entity, 'action gate targets wrong entity')
      assert.equal(input.source, track.state.source, 'action gate uses wrong source')
      assert.equal(input.owner, track.state.owner, 'action gate uses wrong owner')
      assert.equal(event.dtMs, frameDt, 'action gate dt differs from actual gameplay clock')
      assert.equal(
        event.paused,
        input.battle ||
          !input.present ||
          !input.visible ||
          input.fixed ||
          input.gait ||
          input.explicit ||
          (input.source === 'automatic' && (input.held || input.ownerHeld)),
        'action pause differs from eligibility inputs',
      )
      gates.set(event.trackId, event)
    }
    if (event.phase === 'action-advance-start') {
      const track = tracks.get(event.trackId),
        gate = gates.get(event.trackId)
      assert(track && gate && !gate.paused, 'action advanced without unpaused gate')
      assert.equal(gate.clock.frameId, frameId, 'action advance uses stale gate')
      assert.equal(event.entity, gate.entity, 'action advance changed target')
      assert.equal(
        event.dtMs,
        carry?.entity === event.entity ? carry.remaining : frameDt,
        'action advance lost/exceeded time',
      )
      assert.deepEqual(event.state, track.state, 'action advance lost preceding phase')
      assert(!advances.has(event.advanceId), 'action advance identity reused')
      advances.set(event.advanceId, {
        event,
        expected: advanced(track.definition, track.state, event.dtMs),
      })
      gates.delete(event.trackId)
    }
    if (event.phase === 'action-advance-end') {
      const receipt = advances.get(event.advanceId)
      assert(receipt && !receipt.ended, 'action advance completion missing/duplicated')
      assert.equal(event.trackId, receipt.event.trackId, 'action advance completed another track')
      assert.equal(event.dtMs, receipt.event.dtMs, 'action advance changed duration')
      assert.equal(event.failed, false, 'action advancement threw')
      assert.deepEqual(
        event.state,
        receipt.expected.state,
        'action phase does not follow exact elapsed time',
      )
      tracks.get(event.trackId).state = structuredClone(event.state)
      carry = receipt.expected.remaining
        ? { entity: event.entity, remaining: receipt.expected.remaining }
        : null
      receipt.ended = true
      outputs.push({
        order: event.order,
        trackId: event.trackId,
        entity: event.entity,
        state: event.state,
      })
    }
    if (event.phase === 'action-selected') {
      assert(
        event.trackId === null || tracks.has(event.trackId),
        'action selected before observed origin',
      )
      assert.equal(
        event.trackId,
        installed.get(event.entity)?.base?.trackId ?? null,
        'selected action is not installed on this entity',
      )
      assert(
        event.trackId === null ? event.slot === null : ['base', 'override'].includes(event.slot),
        'unknown action selection slot',
      )
      selections.set(`${event.sceneVisit}/${event.scene}/${event.entity}`, event)
      outputs.push(event)
    }
  }
  closeFrame()
  for (const render of trace.worldRenders ?? []) {
    const scene = scenes[render.scene]
    if (scene?.entities.some((entity) => entity.pages?.some((page) => page.animation)))
      assert(
        installations.some(
          (event) =>
            event.scene === render.scene &&
            event.sceneVisit === render.sceneVisit &&
            event.order < render.order &&
            ['replaceScene', 'syncBases', 'restored'].includes(event.reason),
        ),
        'rendered scene missing page-action installation evidence',
      )
  }
  assert(
    [...advances.values()].every((e) => e.ended),
    'action advance end evidence missing',
  )
  for (const gate of gates.values()) assert(gate.paused, 'eligible action failed to advance')
  return { tracks, outputs, selections, frames }
}
