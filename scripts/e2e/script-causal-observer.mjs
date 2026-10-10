/** Read-only causal receipts shared by story collectors; caller owns the single event order. */
export function createScriptCausalObserver({ append, context, snapshotGame, fail, scenes }) {
  const causes = [],
    ownerIds = new WeakMap(),
    steps = new Map(),
    waits = new WeakMap(),
    pendingIO = new WeakMap(),
    runners = new WeakMap(),
    activeSignals = new WeakMap(),
    calls = new WeakMap(),
    signalAliases = new WeakMap(),
    authorSources = new WeakMap(),
    runnerBindings = new WeakMap(),
    autoLifetimes = new WeakMap(),
    gateWaits = new WeakMap(),
    waitHandles = new WeakMap(),
    runtimeSnapshots = new WeakMap(),
    restoredWaitOrigins = new WeakMap(),
    capturedWaitOrigins = new WeakMap(),
    runtimeLoads = new WeakMap(),
    actionTracks = new WeakMap(),
    actionSelections = new WeakMap(),
    actionGateInputs = new Map(),
    motionSlots = new WeakMap(),
    partySlots = new WeakMap()
  const presentationEffects = new WeakMap()
  let nextOwner = 0,
    nextOccurrence = 0,
    nextWait = 0,
    nextIO = 0,
    nextCall = 0,
    nextFrame = 0,
    nextSnapshot = 0,
    nextLoad = 0,
    nextActionTrack = 0,
    nextActionAdvance = 0,
    nextActionFrame = 0,
    nextMotionSlot = 0,
    nextAutoBatch = 0,
    nextAutoCall = 0,
    gameAutoBatch = null,
    gameAutoCall = null,
    currentActionPreparation = null,
    causalSnapshotDepth = 0,
    causalClock = null,
    dialogOwner = null,
    dialogClearCaller = null,
    observedWorld = null,
    observedLifecycle = null
  globalThis.__openingCauseWorld = (world) => {
    observedWorld = world
  }
  const snapshotReforge = () => {
    observedWorld = null
    causalSnapshotDepth++
    try {
      globalThis.__openingCauseSnapshot?.()
    } finally {
      causalSnapshotDepth--
    }
    const lifecycle = globalThis.__openingCauseLifecycleSnapshot?.()
    observedLifecycle = lifecycle
      ? {
          ...lifecycle,
          activations: lifecycle.activations.map(({ signal, ...a }) => ({
            ...a,
            activityId: ownerId(signal),
            aborted: signal.aborted,
          })),
          restored: lifecycle.restored.map(({ signal, ...a }) => ({
            ...a,
            activityId: ownerId(signal),
            aborted: signal.aborted,
          })),
        }
      : null
  }
  const gamePages = new WeakMap(),
    reforgePages = new Map(),
    presentationOwners = new Map()
  let pageId = 0,
    dialogueInstance = 0
  const gamePageId = (dialogue) => {
    if (!dialogue) return null
    if (!Array.isArray(dialogue.shownLines)) throw new Error('missing native dialogue body')
    if (!gamePages.has(dialogue.shownLines)) gamePages.set(dialogue.shownLines, ++pageId)
    return gamePages.get(dialogue.shownLines)
  }
  const reforgePage = (page) => {
    if (!page) return null
    if (!dialogueInstance) throw new Error('dialogue page without observed open')
    const key = JSON.stringify([dialogueInstance, page.slot, page.cueIndex, page.pageIndex])
    if (!reforgePages.has(key)) reforgePages.set(key, ++pageId)
    return { ...page, instance: reforgePages.get(key), dialogueInstance }
  }
  const ownerId = (owner) => {
    if (!owner || typeof owner !== 'object') return null
    if (!ownerIds.has(owner)) ownerIds.set(owner, ++nextOwner)
    return ownerIds.get(owner)
  }
  const cause = (engine, phase, data, owner, scope = 'scene') => {
    const { scene, sceneVisit, tick, poses } = context()
    if (scope === 'scene' && !scenes.includes(scene)) return
    const runId = engine === 'game' ? ownerId(owner) : (owner?.runId ?? null)
    append(
      causes,
      {
        kind: 'cause',
        engine,
        phase,
        scene,
        sceneVisit,
        tick,
        atMs: performance.now(),
        clock: causalClock,
        runId,
        occurrence: engine === 'game' ? (steps.get(runId) ?? null) : (owner?.occurrence ?? null),
        ...(engine === 'reforge'
          ? {
              lifecycle: observedLifecycle,
              activityId: owner?.activityId ?? null,
              runnerId: owner?.runnerId ?? null,
              parentRunId: owner?.parentRunId ?? null,
              parentOccurrence: owner?.parentOccurrence ?? null,
              callId: owner?.callId ?? null,
            }
          : {}),
        poses,
        ...(engine === 'reforge' &&
        [
          'command',
          'leaf-completed',
          'run-started',
          'stage-settled',
          'run-ended',
          'move-commit',
          'move-end',
        ].includes(phase)
          ? { world: observedWorld, worldSource: observedWorld ? 'observe:causal' : null }
          : {}),
        ...data,
      },
      200_000,
    )
  }
  const binding = (invocation) =>
    invocation && { ...invocation.identity, occurrence: invocation.occurrence }
  const signalBinding = (signal) =>
    signal && (signalAliases.get(signal) ?? binding(activeSignals.get(signal)))
  const forRunner = (runner) => {
    const invocation = runners.get(runner)
    if (!invocation) throw new Error('causal receipt without active runner invocation')
    return invocation
  }
  globalThis.__openingCauseLifecycle = (phase, data) => {
    snapshotReforge()
    cause('reforge', phase, data)
  }
  globalThis.__openingCauseAuthority = (data) => {
    snapshotReforge()
    cause('reforge', 'authority-changed', { ...data, source: 'motion-runtime-coordinator' })
  }
  globalThis.__openingCauseAuto = (phase, signal, data) => {
    if (phase === 'auto-started') {
      if (autoLifetimes.has(signal)) throw new Error('automatic activation registered twice')
      const receipt = { ...data, activationId: ownerId(signal), aborted: false, error: null }
      const abort = () => {
        try {
          receipt.aborted = true
          snapshotReforge()
          cause('reforge', 'auto-aborted', receipt)
        } catch (error) {
          fail(error)
        }
      }
      autoLifetimes.set(signal, { receipt, abort })
      signal.addEventListener('abort', abort, { once: true })
    }
    const lifetime = autoLifetimes.get(signal)
    if (!lifetime) throw new Error('automatic lifecycle without activation start')
    if (phase === 'auto-error') lifetime.receipt.error = data
    snapshotReforge()
    cause('reforge', phase, lifetime.receipt)
    if (phase === 'auto-ended') {
      signal.removeEventListener('abort', lifetime.abort)
      autoLifetimes.delete(signal)
    }
  }
  globalThis.__openingCauseGate = (phase, check, signal, data = {}) => {
    if (phase === 'gate-wait') {
      if (gateWaits.has(check)) throw new Error('wake gate waiter registered twice')
      gateWaits.set(check, {
        gateId: ++nextWait,
        owner: signalBinding(signal),
        signalActivityId: ownerId(signal),
      })
    }
    const receipt = gateWaits.get(check)
    if (!receipt) throw new Error('wake gate settlement without registration')
    snapshotReforge()
    cause(
      'reforge',
      phase,
      { ...data, gateId: receipt.gateId, signalActivityId: receipt.signalActivityId },
      receipt.owner,
    )
    if (phase !== 'gate-wait') gateWaits.delete(check)
  }
  globalThis.__openingCauseAuthorSource = (commands, source) =>
    authorSources.set(commands, structuredClone(source))
  globalThis.__openingCauseCommandRoot = (commands) =>
    authorSources.get(commands) ?? { kind: 'commands' }
  globalThis.__openingCauseBinding = (runner, source) =>
    runnerBindings.set(runner, structuredClone(source))
  globalThis.__openingCauseRun = (runner, signal, data) => {
    if (runners.has(runner)) throw new Error('overlapping runFlow on the same runner')
    if (signalAliases.has(signal))
      throw new Error('unsupported invocation on an effect-only child signal')
    const parent = activeSignals.get(signal)
    const call = calls.get(signal)
    if (parent) {
      if (
        call?.parent !== parent ||
        call.target.scene !== data.self?.scene ||
        call.target.entity !== data.self?.entity
      )
        throw new Error('unsupported shared signal caller: no matching observed invocation bridge')
    }
    const invocation = {
      identity: {
        runId: ownerId({}),
        activityId: ownerId(signal),
        runnerId: ownerId(runner),
        parentRunId: parent?.identity.runId ?? null,
        parentOccurrence: parent?.occurrence?.id ?? null,
        callId: parent ? call.callId : null,
      },
      occurrence: null,
      signal,
      parent,
    }
    runners.set(runner, invocation)
    activeSignals.set(signal, invocation)
    snapshotReforge()
    cause(
      'reforge',
      'run-started',
      { ...data, author: runnerBindings.get(runner) ?? null },
      binding(invocation),
    )
  }
  globalThis.__openingCauseCallStart = (signal, target) => {
    const parent = activeSignals.get(signal)
    if (!parent) throw new Error('entity invocation bridge without an observed parent')
    const command = parent.occurrence?.command
    if (
      command?.kind !== 'leaf' ||
      command.command.kind !== 'runEntityTrigger' ||
      command.command.target.scene !== target.scene ||
      command.command.target.entity !== target.entity
    )
      throw new Error('entity invocation bridge does not match its parent occurrence')
    const call = {
      callId: ++nextCall,
      target,
      parent,
      previous: calls.get(signal),
      owner: binding(parent),
    }
    calls.set(signal, call)
    cause('reforge', 'call-started', { bridgeId: call.callId, target }, call.owner)
    return call
  }
  globalThis.__openingCauseCallEnd = (signal, call) => {
    if (!call || calls.get(signal) !== call || activeSignals.get(signal) !== call.parent)
      throw new Error('entity invocation bridge ended out of order')
    cause('reforge', 'call-ended', { bridgeId: call.callId, target: call.target }, call.owner)
    if (call.previous) calls.set(signal, call.previous)
    else calls.delete(signal)
  }
  globalThis.__openingCauseInherit = (parent, child) => {
    const owner = signalBinding(parent)
    if (owner) signalAliases.set(child, owner)
  }
  globalThis.__openingCauseDetach = (child) => signalAliases.delete(child)
  globalThis.__openingCauseGame = (gs, phase, cursor, data) => {
    try {
      if (phase === 'auto-batch-start') {
        if (gameAutoBatch !== null) throw new Error('nested automatic batch')
        gameAutoBatch = ++nextAutoBatch
      }
      if (phase === 'auto-before') {
        if (gameAutoCall !== null || gameAutoBatch === null)
          throw new Error('automatic call outside unique batch')
        gameAutoCall = ++nextAutoCall
      }
      if (phase.startsWith('auto-') || data.channel === 'auto')
        data = { ...data, batchId: gameAutoBatch, autoCallId: gameAutoCall }
      // A dialogue's phase must not replace the causal event's own discriminator.
      if (Object.hasOwn(data, 'phase')) {
        const { phase: dialogPhase, ...rest } = data
        data = { ...rest, dialogPhase }
      }
      snapshotGame(gs, 'observe:causal')
      if (phase === 'clock')
        causalClock = {
          engine: 'game',
          frameId: data.frameId,
          now: data.now,
          atMs: performance.now(),
          autoEligible: data.autoEligible,
        }
      const runId = ownerId(cursor)
      if (phase === 'command')
        steps.set(runId, { id: ++nextOccurrence, ip: data.ip, command: data.command })
      if (gs.dialogBox && cursor) {
        const key = `game:${gamePageId(gs.dialogBox)}`
        if (!presentationOwners.has(key))
          presentationOwners.set(key, { runId, occurrence: steps.get(runId) ?? null })
      }
      if (phase === 'wait-start') {
        const waitId = ++nextWait
        waits.set(cursor, waitId)
        data = { ...data, waitId }
      }
      if (phase === 'wait-end') {
        data = { ...data, waitId: waits.get(cursor) ?? null }
        waits.delete(cursor)
      }
      cause(
        'game',
        phase,
        {
          ...data,
          dialogue: gs.dialogBox
            ? {
                instance: gamePageId(gs.dialogBox),
                phase: gs.dialogBox.phase,
                text: gs.dialogBox.currentLineText,
                lines: gs.dialogBox.shownLines,
                chars: gs.dialogBox.charsRevealed,
              }
            : null,
        },
        cursor,
      )
      if (phase === 'auto-step') gameAutoCall = null
      if (phase === 'auto-batch-end') {
        gameAutoBatch = null
        gameAutoCall = null
      }
    } catch (error) {
      fail(error)
    }
  }
  globalThis.__openingCauseFrame = (data) => {
    snapshotReforge()
    causalClock = {
      engine: 'reforge',
      frameId: ++nextFrame,
      now: data.now,
      realNow: data.realNow,
      frozen: data.frozen,
      stepping: data.stepping,
      requested: data.requested,
    }
    cause('reforge', 'clock', data)
  }
  globalThis.__openingCauseStep = (runner, data) => {
    const invocation = forRunner(runner)
    snapshotReforge()
    invocation.occurrence = { id: ++nextOccurrence, ...data }
    if (data.command?.kind === 'leaf' && data.command.command.kind === 'dialog')
      dialogOwner = binding(invocation)
    cause('reforge', 'command', {}, binding(invocation))
  }
  globalThis.__openingCauseCadence = (data) => {
    snapshotReforge()
    cause('reforge', 'cadence', {
      ...data,
      entityLifecycles: observedWorld?.entityLifecycles ?? {},
    })
  }
  globalThis.__openingCauseSettled = (runner, data) => {
    snapshotReforge()
    cause('reforge', 'stage-settled', data, binding(forRunner(runner)))
  }
  globalThis.__openingCauseLeafCompleted = (runner) => {
    const invocation = forRunner(runner)
    if (invocation.occurrence?.command?.kind !== 'leaf')
      throw new Error('leaf completion without its actual dispatched leaf')
    snapshotReforge()
    cause('reforge', 'leaf-completed', { source: 'script-runner-core' }, binding(invocation))
  }
  globalThis.__openingCauseEnded = (runner, data) => {
    const invocation = forRunner(runner)
    snapshotReforge()
    cause('reforge', 'run-ended', data, binding(invocation))
    if (activeSignals.get(invocation.signal) !== invocation)
      throw new Error('runner ended before its observed child invocation')
    if (invocation.parent) activeSignals.set(invocation.signal, invocation.parent)
    else activeSignals.delete(invocation.signal)
    runners.delete(runner)
  }
  globalThis.__openingCauseTimer = (phase, timer, signal, data) => {
    snapshotReforge()
    if (phase === 'wait-start')
      waits.set(timer, { waitId: ++nextWait, owner: signalBinding(signal) })
    const receipt = waits.get(timer)
    cause('reforge', phase, { ...data, waitId: receipt?.waitId ?? null }, receipt?.owner)
    // A completed timer's public handle may still be captured with remainingMs=0.
    // Weak identity survives settlement without keeping the timer alive.
  }
  globalThis.__openingCauseWaitHandle = (handle, timer) => {
    const receipt = waits.get(timer)
    if (!receipt) throw new Error('runtime wait handle without actual registration')
    waitHandles.set(handle, receipt)
  }
  globalThis.__openingCauseWaitRemaining = (timer, data) => {
    const receipt = waits.get(timer)
    if (!receipt) throw new Error('runtime remaining read without actual timer')
    cause('reforge', 'wait-remaining', { ...data, waitId: receipt.waitId }, receipt.owner)
    receipt.remaining = structuredClone(data)
  }
  const runtimeSnapshotId = (saved) => {
    if (!runtimeSnapshots.has(saved)) runtimeSnapshots.set(saved, ++nextSnapshot)
    return runtimeSnapshots.get(saved)
  }
  globalThis.__openingCauseRuntimeWaitCapture = (saved, entity, handle, restored, value) => {
    const live = handle && waitHandles.get(handle),
      prior = restored && restoredWaitOrigins.get(restored)
    if (handle && !live) throw new Error('capture uses unknown wait handle')
    if (restored && !prior) throw new Error('capture uses unknown restored wait')
    if (!capturedWaitOrigins.has(saved)) capturedWaitOrigins.set(saved, {})
    capturedWaitOrigins.get(saved)[entity] = {
      value: value ?? null,
      origin: handle
        ? live.immediateId
          ? { kind: 'immediate', immediateId: live.immediateId }
          : { kind: 'timer', waitId: live.waitId, remaining: live.remaining ?? null }
        : prior
          ? { kind: 'restored', ...prior }
          : null,
    }
  }
  globalThis.__openingCauseRuntimeCapture = (saved, data) => {
    snapshotReforge()
    cause('reforge', 'runtime-captured', {
      ...data,
      snapshotId: runtimeSnapshotId(saved),
      saved,
      waits: capturedWaitOrigins.get(saved) ?? {},
      source: 'captureSceneRuntime',
    })
  }
  globalThis.__openingCauseRuntimeStore = (destination, scene, saved) => {
    if (!runtimeSnapshots.has(saved)) throw new Error('runtime store without capture/load identity')
    cause('reforge', 'runtime-stored', {
      destination,
      scene,
      snapshotId: runtimeSnapshotId(saved),
      saved,
    })
  }
  globalThis.__openingCauseRuntimeSave = (scenes, activeScene) => {
    globalThis.__openingCauseRuntimeStore('save', activeScene, scenes[activeScene])
    cause('reforge', 'runtime-save-assembled', { activeScene, scenes })
  }
  globalThis.__openingCauseRuntimeSavePayload = (payload, scenes) =>
    cause('reforge', 'runtime-save-payload', { scenes, output: payload.sceneRuntime })
  globalThis.__openingCauseRuntimeLoad = (scenes, payload) => {
    const loadId = ++nextLoad
    runtimeLoads.set(payload, loadId)
    // Loading replaces the whole cache before commitSceneSwitch. Its identity
    // must survive even when the old/bootstrap scene is outside the story.
    for (const [scene, saved] of Object.entries(scenes))
      cause(
        'reforge',
        'runtime-loaded',
        {
          loadId,
          scene,
          snapshotId: runtimeSnapshotId(saved),
          inputSnapshotId: runtimeSnapshots.get(payload.sceneRuntime[scene]) ?? null,
          saved,
          input: payload.sceneRuntime[scene],
        },
        undefined,
        'world',
      )
  }
  globalThis.__openingCauseRuntimeLoadId = (payload) => {
    const id = runtimeLoads.get(payload)
    if (!id) throw new Error('restore input has no committed load identity')
    return id
  }
  globalThis.__openingCauseRuntimeProjection = (phase, saved, data) => {
    if (saved && !runtimeSnapshots.has(saved))
      throw new Error('runtime projection without stored snapshot identity')
    snapshotReforge()
    cause('reforge', `runtime-projection-${phase}`, {
      ...data,
      snapshotId: saved ? runtimeSnapshotId(saved) : null,
      ...(phase === 'start'
        ? { world: observedWorld, worldSource: observedWorld ? 'observe:causal' : null }
        : {}),
    })
  }
  globalThis.__openingCauseRuntimeRestoreWait = (saved, entity, restored) => {
    const origin = { snapshotId: runtimeSnapshotId(saved), entity }
    restoredWaitOrigins.set(restored, origin)
    cause('reforge', 'runtime-wait-restored', { ...origin, value: restored })
  }
  globalThis.__openingCauseRuntimeConsume = (signal, resumed, handle, data) => {
    const origin = resumed && restoredWaitOrigins.get(resumed)
    if (data.remainingMs === 0 && !waitHandles.has(handle))
      waitHandles.set(handle, { immediateId: ++nextWait })
    const timer = waitHandles.get(handle)
    if (resumed && !origin) throw new Error('runtime wait consumed without projected origin')
    if (data.remainingMs !== 0 && !timer)
      throw new Error('runtime wait consumed without actual timer')
    snapshotReforge()
    cause(
      'reforge',
      'runtime-wait-consumed',
      {
        ...data,
        origin: origin ?? null,
        waitId: timer?.waitId ?? null,
        immediateId: timer?.immediateId ?? null,
        resumed: resumed ?? null,
      },
      signalBinding(signal),
    )
  }
  const actionState = (track) => ({
    binding: track.binding,
    source: track.source,
    awaited: track.awaited,
    owner: track.owner ?? null,
    stepIndex: track.stepIndex,
    elapsedInStepMs: track.elapsedInStepMs,
    finished: track.finished,
    pendingLoopStartAtMs: track.pendingLoopStartAtMs ?? null,
  })
  const actionTrackId = (track) => {
    const id = actionTracks.get(track)
    if (!id) throw new Error('action timeline without observed creation/restore')
    return id
  }
  globalThis.__openingCauseActionPrepare = (phase, saved, data, receipt) => {
    if (phase === 'start') {
      if (currentActionPreparation) throw new Error('overlapping action preparations')
      receipt = { snapshotId: runtimeSnapshotId(saved), ...data }
      currentActionPreparation = receipt
      cause(
        'reforge',
        'action-preparing',
        { ...receipt, saved, poses: undefined },
        undefined,
        'world',
      )
    } else {
      if (currentActionPreparation !== receipt)
        throw new Error('action preparation identity mismatch')
      currentActionPreparation = null
    }
    return receipt
  }
  globalThis.__openingCauseActionPreparation = () => currentActionPreparation
  const installedActions = (entities) =>
    [...entities].map(([entity, tracks]) => ({
      entity,
      base: tracks.base
        ? { trackId: actionTrackId(tracks.base), state: actionState(tracks.base) }
        : null,
      override: tracks.override
        ? { trackId: actionTrackId(tracks.override), state: actionState(tracks.override) }
        : null,
    }))
  globalThis.__openingCauseActionInstall = (player, entities, reason, data) => {
    snapshotReforge()
    const { scene } = context()
    cause('reforge', 'action-installed', {
      playerId: ownerId(player),
      reason,
      ...data,
      installed: installedActions(entities),
      pageState: observedWorld?.script?.behaviors?.entities
        ? (observedWorld.script.behaviors.entities[scene] ?? {})
        : null,
      poses: undefined,
    })
  }
  globalThis.__openingCauseActionFrame = (phase, player, entities, data, receipt) => {
    if (phase === 'start') {
      if (!entities.size) return null
      receipt = { actionFrameId: ++nextActionFrame, playerId: ownerId(player) }
    } else if (!receipt) return null
    cause('reforge', `action-frame-${phase}`, {
      ...receipt,
      ...data,
      installed: installedActions(entities),
      poses: undefined,
    })
    return receipt
  }
  globalThis.__openingCauseActionTrack = (track, origin) => {
    if (actionTracks.has(track)) throw new Error('action track identity reused')
    const trackId = ++nextActionTrack
    actionTracks.set(track, trackId)
    snapshotReforge()
    cause(
      'reforge',
      'action-track',
      {
        trackId,
        origin: {
          ...origin,
          ...(origin.kind === 'restored' ? { preparation: currentActionPreparation } : {}),
        },
        ...(currentActionPreparation ? { scene: currentActionPreparation.scene } : {}),
        state: actionState(track),
        definition: track.action,
        poses: undefined,
      },
      undefined,
      currentActionPreparation ? 'world' : 'scene',
    )
  }
  globalThis.__openingCauseActionGateInputs = (data) =>
    actionGateInputs.set(data.entity, structuredClone(data))
  globalThis.__openingCauseActionGate = (track, data) => {
    const inputs = actionGateInputs.get(data.entity) ?? null
    actionGateInputs.delete(data.entity)
    cause('reforge', 'action-gate', {
      ...data,
      inputs,
      trackId: actionTrackId(track),
      poses: undefined,
    })
  }
  globalThis.__openingCauseActionAdvance = (phase, track, data, receipt) => {
    if (phase === 'start')
      receipt = { advanceId: ++nextActionAdvance, trackId: actionTrackId(track) }
    if (!receipt || receipt.trackId !== actionTrackId(track))
      throw new Error('action advance identity mismatch')
    cause('reforge', `action-advance-${phase}`, {
      ...data,
      ...receipt,
      state: actionState(track),
      poses: undefined,
    })
    return receipt
  }
  globalThis.__openingCauseActionSelection = (player, entity, track, slot) => {
    // Evidence snapshots query frame() too; those diagnostic reads are not a presentation caller.
    if (causalSnapshotDepth) return
    if (!actionSelections.has(player)) actionSelections.set(player, new Map())
    const selections = actionSelections.get(player),
      trackId = track ? actionTrackId(track) : null
    const selected = { trackId, slot: track ? slot : null },
      key = JSON.stringify(selected)
    if (selections.get(entity) === key) return
    selections.set(entity, key)
    cause('reforge', 'action-selected', { entity, ...selected, poses: undefined })
  }
  globalThis.__openingCauseIO = (signal, phase, io, receipt) => {
    snapshotReforge()
    if (phase === 'io-start') {
      if (pendingIO.has(signal)) throw new Error('overlapping portrait IO on the same signal')
      receipt = { ioId: ++nextIO, io, owner: signalBinding(signal) }
      pendingIO.set(signal, receipt)
    }
    if (!receipt || pendingIO.get(signal) !== receipt)
      throw new Error('unbound portrait IO receipt')
    cause('reforge', phase, { io: receipt.io, ioId: receipt.ioId }, receipt.owner)
    if (phase === 'io-end') pendingIO.delete(signal)
    return receipt
  }
  globalThis.__openingCauseIOBind = (signal) => signal && pendingIO.get(signal)
  globalThis.__openingCauseWorkIO = (phase, signal, receipt) => {
    if (phase === 'start') receipt = { workId: ++nextIO, owner: signalBinding(signal) }
    if (!receipt?.owner) return null
    snapshotReforge()
    cause(
      'reforge',
      `work-io-${phase}`,
      { workId: receipt.workId, aborted: signal.aborted },
      receipt.owner,
    )
    return receipt
  }
  globalThis.__openingCausePartyMotion = (phase, slot, signal, data = {}) => {
    if (phase === 'registered') {
      if (partySlots.has(slot)) throw new Error('party motion registered twice')
      partySlots.set(slot, { slotId: ++nextMotionSlot, owner: signalBinding(signal) })
    }
    const receipt = partySlots.get(slot)
    if (!receipt?.owner) throw new Error('party motion lacks actual owning invocation')
    snapshotReforge()
    cause('reforge', `party-motion-${phase}`, { slotId: receipt.slotId, ...data }, receipt.owner)
  }
  globalThis.__openingCausePresentationStart = (driver, effect, signal, data) => {
    const owner = signalBinding(signal)
    presentationEffects.delete(driver)
    if (
      owner?.occurrence?.command?.command?.kind !== data.kind &&
      !(owner?.occurrence?.command?.command?.kind === 'loadScene' && data.kind === 'fade')
    )
      return
    const receipt = { owner, effectId: ownerId(effect), data }
    presentationEffects.set(driver, receipt)
    presentationEffects.set(effect, receipt)
    snapshotReforge()
    cause(
      'reforge',
      'presentation-start',
      { effectId: receipt.effectId, presentation: data },
      owner,
    )
  }
  globalThis.__openingCausePresentationDraw = (effect, data) => {
    const receipt = presentationEffects.get(effect)
    if (!receipt || receipt.ended) return
    const key = JSON.stringify(
      receipt.data.kind === 'fade' ? [data.value, data.style, data.alpha, data.color] : [data.step],
    )
    if (key === receipt.lastOutput) return
    receipt.lastOutput = key
    snapshotReforge()
    cause(
      'reforge',
      'presentation-draw',
      { effectId: receipt.effectId, presentation: data },
      receipt.owner,
    )
  }
  globalThis.__openingCausePresentationEnd = (effect, data) => {
    const receipt = effect && presentationEffects.get(effect)
    if (!receipt) return
    receipt.ended = true
    snapshotReforge()
    cause(
      'reforge',
      'presentation-end',
      { effectId: receipt.effectId, presentation: data },
      receipt.owner,
    )
  }
  globalThis.__openingCauseMove = (phase, signal, command, receipt, data = {}) => {
    if (phase === 'move-start') receipt = { owner: signalBinding(signal), command }
    if (!receipt?.owner || receipt.command !== command)
      throw new Error('unbound actual move transaction')
    snapshotReforge()
    cause(
      'reforge',
      phase,
      { ...data, moveCommand: command, source: 'script-project-core' },
      receipt.owner,
    )
    return receipt
  }
  globalThis.__openingCauseMotionSlot = (phase, slot, input, data) => {
    const describe = (value) =>
      Object.fromEntries(
        [
          'kind',
          'source',
          'to',
          'speed',
          'dir',
          'commandEpoch',
          'sceneSessionId',
          'activationOwnerId',
          'activationEpoch',
          'authorityEpochAtEnqueue',
          'slowRestPending',
          'slowCadence',
          'preserveFacing',
        ]
          .filter((key) => value[key] !== undefined)
          .map((key) => [key, value[key]]),
      )
    if (phase === 'registered') {
      if (motionSlots.has(slot)) throw new Error('motion slot registered twice')
      motionSlots.set(slot, {
        slotId: ++nextMotionSlot,
        owner: signalBinding(input.signal),
        entity: input.id,
        slot: structuredClone(describe(slot)),
      })
    }
    const receipt = slot
      ? motionSlots.get(slot)
      : { slotId: null, owner: signalBinding(input.signal), entity: input.id, slot: null }
    if (!receipt) throw new Error('motion slot transition without registration')
    snapshotReforge()
    cause(
      'reforge',
      `motion-slot-${phase}`,
      {
        ...data,
        slotId: receipt.slotId,
        entity: receipt.entity,
        slot: receipt.slot,
        current: slot ? describe(slot) : null,
        input: {
          scene: input.sceneId,
          dir: input.dir ?? null,
          to: input.to ?? null,
          speed: input.speed ?? null,
          slowCadence: input.slowCadence ?? null,
          preserveFacing: input.preserveFacing ?? null,
          activation: input.activation ?? null,
        },
      },
      receipt.owner,
    )
  }
  globalThis.__openingCauseIOWake = (receipt) => {
    if (receipt) {
      snapshotReforge()
      cause('reforge', 'io-wake', { io: receipt.io, ioId: receipt.ioId }, receipt.owner)
    }
  }
  globalThis.__openingCauseDialog = (source, before, after, beforeSlots, afterSlots, lifetime) => {
    const observedBefore = reforgePage(before)
    if (source === 'open') dialogueInstance++
    const observedAfter = reforgePage(after)
    if (source === 'open' && afterSlots)
      for (const slot of afterSlots)
        if (!presentationOwners.has(`reforge:${slot.presentationId}`))
          presentationOwners.set(`reforge:${slot.presentationId}`, dialogOwner)
    if (
      source !== 'open' &&
      source !== 'advance' &&
      JSON.stringify(observedBefore) === JSON.stringify(observedAfter) &&
      JSON.stringify(beforeSlots) === JSON.stringify(afterSlots)
    )
      return
    snapshotReforge()
    cause(
      'reforge',
      'dialogue',
      {
        source,
        dialoguePresentationVersion: 1,
        before: observedBefore,
        after: observedAfter,
        beforeSlots,
        afterSlots,
        lifetime,
      },
      dialogOwner,
    )
  }
  globalThis.__openingCauseDialogueDraw = (engine, value, assets) => {
    const renderId = context().renderId ?? null
    let slots
    if (engine === 'reforge') {
      snapshotReforge()
      slots = value.map((slot) => {
        const owner = presentationOwners.get(`reforge:${slot.presentationId}`)
        if (!owner) throw new Error('rendered dialogue slot without its opening caller')
        if (slot.visibleText === null) throw new Error('dialogue slot has no successful draw')
        return { ...slot, owner }
      })
    } else if (engine === 'game') {
      snapshotGame(value, 'observe:causal')
      slots = [
        { box: value.dialogBoxKept, active: false },
        { box: value.dialogBox, active: true },
      ].flatMap(({ box, active }) => {
        if (!box) return []
        const instance = gamePageId(box)
        const key = `game:${instance}`
        if (!presentationOwners.has(key)) {
          const runId = ownerId(value.eventCursor)
          presentationOwners.set(key, { runId, occurrence: steps.get(runId) ?? null })
        }
        if (box.style === 'item-box')
          return [
            {
              slot: box.style,
              instance,
              active,
              itemBox: box.itemBox,
              owner: presentationOwners.get(key),
            },
          ]
        if (!box.shownLines.length && box.currentLineText === null && box.titleText === undefined)
          return []
        const narration = box.style === 'narration'
        const text = narration
          ? (box.currentLineText ?? box.shownLines[0] ?? '')
          : [
              ...box.shownLines,
              ...(box.currentLineText !== null && box.charsRevealed > 0
                ? [box.currentLineText.slice(0, box.charsRevealed)]
                : []),
            ].join('\n')
        if (narration && !text) return []
        return [
          {
            slot: box.style,
            instance,
            active,
            phase: box.phase,
            visibleText: text,
            speaker: box.titleText ?? null,
            portraitIcon:
              !narration && assets?.portraitFrames?.has(box.portraitIcon) ? box.portraitIcon : null,
            owner: presentationOwners.get(key),
          },
        ]
      })
    } else throw new Error('unknown dialogue draw engine')
    cause(engine, 'dialogue-presentation', { source: 'draw', renderId, slots }, null)
  }
  globalThis.__openingCauseDialogClearContext = (phase, signal, receipt, role) => {
    if (phase === 'start') {
      if (!['host-adapter', 'presentation'].includes(role))
        throw new Error('unknown dialogue clear caller role')
      const owner =
        signalBinding(signal) ??
        (role === 'presentation' && dialogClearCaller?.role === 'host-adapter'
          ? dialogClearCaller.owner
          : null)
      receipt = { previous: dialogClearCaller, owner, role }
      if (!receipt.owner) throw new Error('dialogue clear intent without actual runner caller')
      dialogClearCaller = receipt
      return receipt
    }
    if (dialogClearCaller !== receipt) throw new Error('dialogue clear caller context mismatch')
    dialogClearCaller = receipt.previous
  }
  globalThis.__openingCauseDialogClear = (source, signal) => {
    snapshotReforge()
    const owner = source === 'clearDialog' ? dialogClearCaller?.owner : signalBinding(signal)
    if (source === 'clearDialog' && !owner)
      throw new Error('dialogue clear command without actual presentation caller')
    cause(
      'reforge',
      'dialogue-clear-request',
      { source, signalActivityId: ownerId(signal), callerRole: dialogClearCaller?.role ?? null },
      owner,
    )
  }
  // Diagnostic failures invalidate evidence, never interrupt the game's own execution.
  for (const suffix of [
    'Frame',
    'Run',
    'CallStart',
    'CallEnd',
    'AuthorSource',
    'CommandRoot',
    'Binding',
    'Inherit',
    'Detach',
    'Step',
    'Cadence',
    'Settled',
    'LeafCompleted',
    'Ended',
    'Timer',
    'IO',
    'IOBind',
    'WorkIO',
    'PartyMotion',
    'IOWake',
    'Move',
    'MotionSlot',
    'PresentationStart',
    'PresentationDraw',
    'PresentationEnd',
    'Dialog',
    'DialogueDraw',
    'DialogClear',
    'DialogClearContext',
    'Authority',
    'Lifecycle',
    'Auto',
    'Gate',
    'WaitHandle',
    'WaitRemaining',
    'RuntimeWaitCapture',
    'RuntimeCapture',
    'RuntimeStore',
    'RuntimeSave',
    'RuntimeSavePayload',
    'RuntimeLoad',
    'RuntimeLoadId',
    'RuntimeProjection',
    'RuntimeRestoreWait',
    'RuntimeConsume',
    'ActionTrack',
    'ActionGate',
    'ActionGateInputs',
    'ActionAdvance',
    'ActionSelection',
    'ActionPrepare',
    'ActionPreparation',
    'ActionInstall',
    'ActionFrame',
  ]) {
    const name = `__openingCause${suffix}`,
      callback = globalThis[name]
    globalThis[name] = (...args) => {
      try {
        return callback(...args)
      } catch (error) {
        fail(error)
      }
    }
  }
  return { clock: () => causalClock, read: () => causes, gamePageId, reforgePage }
}
