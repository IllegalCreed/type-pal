import assert from 'node:assert/strict'

export function reforgeStateKey(state) {
  const r = state.runtime
  return JSON.stringify({
    boot: state.boot,
    video: state.video,
    runtime: r
      ? {
          projectId: r.projectId,
          sceneId: r.sceneId,
          dialogue: r.dialogue,
          scriptRunning: r.scriptRunning,
          presentationBusy: r.presentationBusy,
          menuActive: r.menuActive,
          battleActive: r.battleActive,
          fading: r.fadeBlack !== 0,
          ditherActive: r.ditherActive,
        }
      : null,
  })
}

export function reforgeRoomReady(state) {
  return (
    !!state &&
    state.sceneId === 's001' &&
    !state.dialogue &&
    !state.scriptRunning &&
    !state.presentationBusy &&
    !state.menuActive &&
    !state.battleActive &&
    state.fadeBlack === 0 &&
    !state.ditherActive
  )
}
export function reforgeStoryAction(state) {
  if (!state) return 'wait'
  assert.equal(state.projectId, 'pal')
  assert(['s000', 's001'].includes(state.sceneId), `unexpected scene ${state.sceneId}`)
  assert(!state.battleActive && !state.menuActive, 'unexpected battle/menu in 001')
  if (state.dialogue) {
    assert(
      ['typing', 'waiting-input', 'auto-advance'].includes(state.dialogue.phase),
      'unknown dialogue phase',
    )
    return state.dialogue.phase === 'waiting-input' ? 'confirm' : 'wait'
  }
  return reforgeRoomReady(state) ? 'finish' : 'wait'
}
export function assertReforgeOpening(report, introPath) {
  assert(
    report.videos.some((v) => v.path === introPath && v.kind === 'ended'),
    'entry video did not end naturally',
  )
  for (const [sceneId, textId, text] of [
    ['s000', 'dlg.2', '作恶多端的罗煞鬼婆'],
    ['s001', 'dlg.1373', '真没意思'],
    ['s001', 'dlg.1383', '现在被发现就惨了'],
  ]) {
    assert(
      report.events.some(
        (e) =>
          e.state.runtime?.sceneId === sceneId &&
          e.state.runtime.dialogue?.phase !== 'typing' &&
          e.state.runtime.dialogue?.pageTextIds.includes(textId) &&
          e.state.runtime.dialogue.pageText.replace(/\s/g, '').includes(text),
      ),
      `missing ${sceneId}/${textId}`,
    )
  }
}

/** SAVE10 explicitly defaults the use-count container and clears transient actor conditions on load. */
export function openingSaveView(payload) {
  assert.equal(payload.version, 10)
  assert.equal(payload.contentVersion, 21)
  assert.equal(payload.projectId, 'pal')
  const value = structuredClone(payload)
  value.world.skillUseCounts ??= {}
  for (const actor of [...value.world.party, ...(value.world.reserve ?? [])]) {
    assert(
      !actor.poisons?.length && !actor.extraStatuses?.length && actor.extraPoisonRes === undefined,
      '001 unexpectedly carries actor conditions; do not silently erase them from comparison',
    )
    delete actor.poisons
    delete actor.extraStatuses
    delete actor.extraPoisonRes
  }
  return value
}
