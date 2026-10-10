import { isDeepStrictEqual as same } from 'node:util'
import { checkTransitionTrace, requireTrace } from './trace-refinement.mjs'

// Identity only in the authority domain. These still have motion/persistent/presentation duties.
const authorityIdentity = new Set([
  'animEntity',
  'clearDialog',
  'dialog',
  'faceEntityToParty',
  'giveMoney',
  'giveItem',
  'loseItem',
  'playMusic',
  'stopMusic',
  'playSound',
  'wait',
  'fade',
  'ditherScreen',
  'setActorSprite',
  'setActorAppearance',
  'setParty',
  'setPartyFacing',
  'setEntityFacing',
  'setEntityFrame',
  'setEntityPos',
  'setEntityPosRelParty',
  'selectEntityBehavior',
  'selectEntityPage',
  'selectSceneHooks',
  'setEntityTriggerActivation',
])

/** Expected ownership is separate from the actual mutation fold above. Child runs and
 * scene replacement are verified by their invocation/session contracts, not guessed releases. */
export function authoredOwnership(command, start) {
  const before = start.lifecycle?.authority
  requireTrace(before, 'authority-command-input', 'actual authority snapshot', before, 'unknown')
  const c = command,
    expected = {}
  if (authorityIdentity.has(c.kind) || ['loadScene', 'runEntityTrigger'].includes(c.kind))
    return expected
  const detach = (parent) => {
    for (const [id, owner] of Object.entries(before))
      if (owner.kind === 'mount' && owner.parent === parent) expected[id] = null
  }
  const partyTake = () => {
    if (before.party?.kind === 'mount') detach(before.party.parent)
    expected.party = { kind: 'script' }
  }
  if (['teleportParty', 'moveParty', 'nudgeParty'].includes(c.kind)) {
    partyTake()
    return expected
  }
  if (c.kind === 'releaseEntity' && !c.target) {
    for (const id of Object.keys(before)) expected[id] = null
    return expected
  }
  const target = c.kind === 'chasePlayer' ? start.occurrence.self : c.target
  if (
    [
      'takeEntity',
      'releaseEntity',
      'moveEntity',
      'stepEntity',
      'nudgeEntity',
      'chasePlayer',
      'mountParty',
      'ride',
      'setEntityState',
    ].includes(c.kind)
  ) {
    requireTrace(
      target?.scene && target?.entity,
      'authority-target',
      'entity address',
      target,
      'unknown',
    )
    if (target.scene !== start.scene) return expected
    const id = target.entity
    if (c.kind === 'releaseEntity') expected[id] = null
    else if (c.kind === 'setEntityState') {
      if (c.state <= 0) detach(id)
    } else if (c.kind === 'mountParty' || c.kind === 'ride') {
      requireTrace(
        start.poses?.[id]?.state?.visible === true,
        'mount-target-evidence',
        'visible carrier',
        start.poses?.[id],
        'unknown',
      )
      if (c.kind === 'mountParty' || before.party?.kind !== 'mount' || before.party.parent !== id) {
        expected.party = { kind: 'mount', parent: id, dx: c.dx ?? 0, dy: c.dy ?? 0 }
        for (const rider of c.riders ?? []) {
          requireTrace(
            start.poses?.[rider.target.entity]?.state?.visible === true,
            'mount-rider-evidence',
            'visible rider',
            rider,
            'unknown',
          )
          expected[rider.target.entity] = {
            kind: 'mount',
            parent: id,
            dx: rider.dx ?? 0,
            dy: rider.dy ?? 0,
          }
        }
      }
      if (c.kind === 'ride') expected[id] = { kind: 'script' }
    } else expected[id] = { kind: 'script' }
    return expected
  }
  requireTrace(false, 'unclassified-authority-command', 'audited authority effect', c, 'unknown')
}

export function checkAuthoredOwnership(trace) {
  const causes = [...(trace.initialCauses ?? []), ...(trace.causes ?? [])].sort(
    (a, b) => a.order - b.order,
  )
  const commands = (trace.causes ?? []).filter(
    (e) =>
      e.phase === 'command' &&
      e.occurrence?.timing === 'interactive' &&
      e.occurrence.command?.kind === 'leaf',
  )
  const nextBoundary = (start) =>
    causes.find(
      (e) =>
        e.order > start.order &&
        e.runId === start.runId &&
        ['command', 'stage-settled', 'run-ended'].includes(e.phase),
    )
  return checkTransitionTrace(
    {
      id: 'authored-ownership/v1',
      initial: { commands: 0, witnesses: [] },
      transitions: {
        command: (state, { start }) => {
          const c = start.occurrence.command.command,
            expected = authoredOwnership(c, start)
          state.commands++
          if (!Object.keys(expected).length && !(c.kind === 'releaseEntity' && !c.target))
            return state
          const end = nextBoundary(start)
          requireTrace(
            end?.lifecycle?.authority,
            'authority-own-deadline',
            'next own command/settlement snapshot',
            end,
            'unknown',
          )
          requireTrace(
            end.sceneVisit === start.sceneVisit,
            'authority-same-visit',
            start.sceneVisit,
            end.sceneVisit,
            'unknown',
          )
          if (c.kind === 'releaseEntity' && !c.target)
            requireTrace(
              Object.keys(end.lifecycle.authority).length === 0,
              'authored-release-all',
              {},
              end.lifecycle.authority,
            )
          for (const [actor, owner] of Object.entries(expected)) {
            const competing = causes.find(
              (e) =>
                e.phase === 'command' &&
                e.runId !== start.runId &&
                e.order < end.order &&
                (nextBoundary(e)?.order ?? Infinity) > start.order &&
                e.sceneVisit === start.sceneVisit &&
                e.occurrence?.timing === 'interactive' &&
                e.occurrence.command?.kind === 'leaf' &&
                Object.hasOwn(authoredOwnership(e.occurrence.command.command, e), actor),
            )
            requireTrace(
              !competing,
              'authority-competing-command',
              'unambiguous own effect',
              competing?.order,
              'unknown',
            )
            requireTrace(
              same(end.lifecycle.authority[actor] ?? null, owner),
              'authored-ownership-deadline',
              { actor, owner, command: start.order, deadline: end.order },
              end.lifecycle.authority[actor] ?? null,
            )
            state.witnesses.push({ actor, owner, command: start.order, deadline: end.order })
          }
          return state
        },
      },
      accept: (s) =>
        requireTrace(
          s.commands > 0,
          'authority-command-coverage',
          'actual commands',
          s.commands,
          'unknown',
        ),
    },
    commands.map((start) => ({ type: 'command', start })),
  )
}

/** Validate executed mutations and actual activation/gate lifetimes, not command names.
 * Open background work at a story boundary is legal; completion is not fabricated there.
 * The actor's authority map is checkpointed independently by the real host snapshot.
 */
export function checkAutomaticLifecycle(trace) {
  const records = [...(trace.initialCauses ?? []), ...(trace.causes ?? [])]
    .filter((event) => event.engine === 'reforge')
    // Cache input and candidate action preparation precede live scene commit.
    // Their source identities are checked by restore/action contracts; any old
    // lifecycle attached there is not a new observation of the active session.
    .filter(
      (event) =>
        !['runtime-loaded', 'action-preparing'].includes(event.phase) &&
        !(event.phase === 'action-track' && event.origin?.kind === 'restored'),
    )
    .sort((a, b) => a.order - b.order)
  return checkTransitionTrace(
    {
      id: 'automatic-lifecycle/v1',
      initial: {
        authority: null,
        epochs: null,
        activations: {},
        gates: {},
        commits: 0,
        commands: 0,
        sessionEpoch: null,
        lastActivations: [],
      },
      transitions: {
        cause: (s, e) => {
          const l = e.lifecycle
          requireTrace(
            l?.authority && l?.epochs && Array.isArray(l.activations) && Array.isArray(l.restored),
            'actual-lifecycle-snapshot',
            'authority/epochs/activations/restored',
            l,
            'unknown',
          )
          const epoch = Number(l.sceneSession?.split(':').at(-1))
          requireTrace(
            Number.isSafeInteger(epoch) && epoch > 0,
            'scene-session-identity',
            'positive session epoch',
            l.sceneSession,
            'unknown',
          )
          if (s.sessionEpoch === null)
            s.sessionEpoch = e.phase === 'session-invalidated' ? epoch - 1 : epoch
          if (e.phase === 'session-invalidated') {
            requireTrace(
              e.epoch === s.sessionEpoch + 1 && epoch === e.epoch,
              'session-invalidation',
              s.sessionEpoch + 1,
              { receipt: e.epoch, snapshot: epoch },
            )
            s.sessionEpoch = e.epoch
          }
          requireTrace(
            epoch === s.sessionEpoch,
            'session-transition-observed',
            s.sessionEpoch,
            epoch,
          )
          s.lastActivations = l.activations
          if (s.authority === null) {
            s.authority = structuredClone(l.authority)
            s.epochs = structuredClone(l.epochs)
            if (e.phase === 'authority-changed') {
              if (e.before === null) delete s.authority[e.actor]
              else s.authority[e.actor] = e.before
              s.epochs[e.actor] = e.epochBefore
            }
            // A recording may start after an activation was created. It must retain an earlier
            // start receipt to prove that activation rather than synthesizing one from a snapshot.
          }
          if (e.phase === 'authority-changed') {
            requireTrace(
              e.source === 'motion-runtime-coordinator',
              'authority-producer',
              'motion-runtime-coordinator',
              e.source,
              'unknown',
            )
            requireTrace(
              same(s.authority[e.actor] ?? null, e.before),
              'authority-before',
              s.authority[e.actor] ?? null,
              e.before,
            )
            requireTrace(
              e.epochBefore === (s.epochs[e.actor] ?? 0) && e.epochAfter === e.epochBefore + 1,
              'authority-epoch',
              { before: s.epochs[e.actor] ?? 0, after: (s.epochs[e.actor] ?? 0) + 1 },
              { before: e.epochBefore, after: e.epochAfter },
            )
            if (e.after === null) delete s.authority[e.actor]
            else s.authority[e.actor] = e.after
            s.epochs[e.actor] = e.epochAfter
            s.commits++
          }
          if (
            ['command', 'run-started', 'run-ended', 'stage-settled', 'authority-changed'].includes(
              e.phase,
            )
          ) {
            requireTrace(
              same(s.authority, l.authority) && same(s.epochs, l.epochs),
              'authority-mutations-complete',
              { authority: s.authority, epochs: s.epochs },
              { authority: l.authority, epochs: l.epochs },
            )
          }
          if (e.phase === 'auto-started') {
            requireTrace(
              Number.isSafeInteger(e.activationId) && !s.activations[e.activationId],
              'fresh-activation',
              'new signal identity',
              e.activationId,
            )
            const actual = l.activations.find((a) => a.activityId === e.activationId)
            requireTrace(
              actual &&
                !actual.aborted &&
                actual.entity === e.entity &&
                actual.epoch === e.epoch &&
                actual.sceneSession === e.sceneSession,
              'activation-registration',
              { entity: e.entity, epoch: e.epoch, sceneSession: e.sceneSession },
              actual,
            )
            s.activations[e.activationId] = {
              entity: e.entity,
              epoch: e.epoch,
              sceneSession: e.sceneSession,
              aborted: false,
              ended: false,
            }
          }
          if (['auto-aborted', 'auto-error', 'auto-ended'].includes(e.phase)) {
            const a = s.activations[e.activationId]
            requireTrace(
              a &&
                !a.ended &&
                a.entity === e.entity &&
                a.epoch === e.epoch &&
                a.sceneSession === e.sceneSession,
              'activation-lifetime',
              'observed live activation',
              e,
              'unknown',
            )
            if (e.phase === 'auto-aborted') {
              requireTrace(!a.aborted, 'single-abort', false, a.aborted)
              a.aborted = true
            }
            if (e.phase === 'auto-ended') {
              requireTrace(a.aborted === e.aborted, 'abort-observed', e.aborted, a.aborted)
              requireTrace(
                !e.error || e.error.aborted,
                'automatic-completed-without-error',
                null,
                e.error,
              )
              a.ended = true
            }
          }
          if (e.phase === 'gate-wait') {
            requireTrace(
              Number.isSafeInteger(e.gateId) && !s.gates[e.gateId],
              'fresh-gate',
              'new waiter',
              e.gateId,
            )
            s.gates[e.gateId] = {
              activity: e.signalActivityId,
              run: e.runId,
              occurrence: e.occurrence,
              order: e.order,
              settled: false,
            }
          }
          if (['gate-ready', 'gate-rejected'].includes(e.phase)) {
            const g = s.gates[e.gateId]
            requireTrace(
              g &&
                !g.settled &&
                g.activity === e.signalActivityId &&
                g.run === e.runId &&
                same(g.occurrence, e.occurrence),
              'gate-settlement-owner',
              'same pending waiter and registered owner',
              e,
            )
            g.settled = true
          }
          if (e.phase === 'command') {
            s.commands++
            const o = e.occurrence
            if (o?.timing === 'auto') {
              const a = s.activations[e.activityId],
                actual = l.activations.find((x) => x.activityId === e.activityId)
              requireTrace(
                a &&
                  !a.aborted &&
                  !a.ended &&
                  actual &&
                  !actual.aborted &&
                  a.entity === o.self?.entity &&
                  a.sceneSession === l.sceneSession &&
                  actual.epoch === a.epoch &&
                  actual.sceneSession === a.sceneSession,
                'live-automatic-owner',
                'live activation in current scene session',
                { owner: a, actual, self: o.self, sceneSession: l.sceneSession },
                'unknown',
              )
              requireTrace(
                o.self.scene === e.scene && l.scene === e.scene,
                'automatic-scene',
                e.scene,
                { self: o.self, actual: l.scene },
              )
              requireTrace(
                l.authority[o.self.entity]?.kind !== 'script',
                'taken-owner-cannot-dispatch',
                'not script-owned',
                l.authority[o.self.entity],
              )
            }
            for (const gate of Object.values(s.gates))
              requireTrace(
                gate.settled || gate.run !== e.runId || gate.occurrence?.id === o?.id,
                'gate-before-next-command',
                'settled waiter',
                { gate, command: e.order },
              )
          }
          return s
        },
      },
      accept: (s) => {
        requireTrace(
          s.commands > 0,
          'lifecycle-evidence',
          'observed commands',
          s.commands,
          'unknown',
        )
        for (const [id, a] of Object.entries(s.activations)) {
          const actual = s.lastActivations.find((x) => x.activityId === Number(id))
          requireTrace(
            a.ended ? !actual : actual && !a.aborted && !actual.aborted,
            'activation-end-observed',
            'ended or still live at the boundary',
            { id, recorded: a, actual },
            'unknown',
          )
        }
        for (const a of s.lastActivations)
          requireTrace(
            s.activations[a.activityId] && !s.activations[a.activityId].ended,
            'activation-start-observed',
            'observed live activation',
            a,
            'unknown',
          )
      },
    },
    records.map((e) => ({ ...e, type: 'cause' })),
  )
}
