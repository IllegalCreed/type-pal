import { isDeepStrictEqual as same } from 'node:util'
import { checkTransitionTrace, requireTrace } from './trace-refinement.mjs'

/** Identity and call order only: a finite story contract separately requires its author runs
 * and their terminal outcomes. An ambient invocation may still be live at the story boundary.
 */
export function checkScriptInvocations(trace) {
  const deferred = checkDeferredOwners(trace)
  if (deferred.status !== 'proved') return deferred
  const events = [...(trace.initialCauses ?? []), ...(trace.causes ?? [])]
    .filter((e) => e.engine === 'reforge' && (e.runId != null || e.phase === 'command'))
    .sort((a, b) => a.order - b.order)
  const identity = (e) => ({
    activityId: e.activityId,
    runnerId: e.runnerId,
    parentRunId: e.parentRunId,
    parentOccurrence: e.parentOccurrence,
    callId: e.callId,
  })
  return checkTransitionTrace(
    {
      id: 'actual-script-invocations/v1',
      initial: { runs: {}, calls: {}, activities: {}, commands: 0, order: -1 },
      transitions: {
        receipt: (s, e) => {
          requireTrace(
            Number.isSafeInteger(e.order) && e.order > s.order,
            'invocation-order',
            `>${s.order}`,
            e.order,
          )
          s.order = e.order
          requireTrace(
            Number.isSafeInteger(e.runId) && e.runId > 0,
            'invocation-identity',
            'positive run ID',
            e.runId,
            'unknown',
          )
          if (e.phase === 'run-started') {
            requireTrace(!s.runs[e.runId], 'fresh-invocation', 'new run ID', e.runId)
            for (const key of ['activityId', 'runnerId'])
              requireTrace(
                Number.isSafeInteger(e[key]) && e[key] > 0,
                'invocation-source',
                key,
                e[key],
                'unknown',
              )
            requireTrace(
              !Object.values(s.runs).some((r) => !r.ended && r.identity.runnerId === e.runnerId),
              'runner-exclusive',
              'one live invocation per runner',
              e.runnerId,
            )
            s.activities[e.activityId] ??= []
            const stack = s.activities[e.activityId]
            if (e.parentRunId != null) {
              const parent = s.runs[e.parentRunId],
                call = s.calls[e.callId]
              requireTrace(
                stack.at(-1) === e.parentRunId &&
                  parent &&
                  !parent.ended &&
                  call &&
                  !call.ended &&
                  call.runId === e.parentRunId &&
                  call.occurrence === e.parentOccurrence &&
                  !call.child &&
                  same(call.target, e.self) &&
                  parent.identity.activityId === e.activityId,
                'child-call-lineage',
                'live matching explicit parent call',
                e,
              )
              call.child = e.runId
            } else
              requireTrace(
                stack.length === 0 && e.parentOccurrence === null && e.callId === null,
                'root-call-lineage',
                null,
                identity(e),
              )
            s.runs[e.runId] = {
              identity: identity(e),
              ended: false,
              completedLeaves: [],
              occurrence: null,
              context: { self: e.self, timing: e.timing, scope: e.scope, stage: e.stage },
            }
            stack.push(e.runId)
            return s
          }
          const run = s.runs[e.runId]
          requireTrace(
            run,
            'invocation-start-present',
            'actual run-started receipt',
            e.runId,
            'unknown',
          )
          requireTrace(
            same(run.identity, identity(e)),
            'invocation-stable-identity',
            run.identity,
            identity(e),
          )
          // Deferred presentation can retain the originating occurrence after the runner ends.
          // It cannot execute commands, start calls, settle a stage or end that runner again.
          if (
            [
              'command',
              'leaf-completed',
              'call-started',
              'call-ended',
              'stage-settled',
              'run-ended',
            ].includes(e.phase)
          ) {
            requireTrace(!run.ended, 'invocation-still-live', true, e.phase)
            requireTrace(
              s.activities[e.activityId]?.at(-1) === e.runId,
              'invocation-call-stack',
              s.activities[e.activityId]?.at(-1),
              e.runId,
            )
          }
          if (e.phase === 'command') {
            requireTrace(
              e.occurrence?.command?.kind !== 'callScript' &&
                !e.occurrence?.path?.some(
                  (part) => typeof part === 'string' && part.startsWith('call:'),
                ),
              'invocation-context-domain',
              '001–006 inline commands (shared calls require their own context receipts)',
              e.occurrence,
              'unknown',
            )
            const context = {
              self: e.occurrence?.self,
              timing: e.occurrence?.timing,
              scope: e.occurrence?.scope,
              stage: e.occurrence?.path?.[0],
            }
            requireTrace(
              same(run.context, context),
              'invocation-command-context',
              run.context,
              context,
            )
            run.occurrence = e.occurrence?.id
            run.command = e.occurrence?.command
            s.commands++
          }
          if (e.phase === 'leaf-completed') {
            requireTrace(
              e.source === 'script-runner-core' &&
                run.occurrence === e.occurrence?.id &&
                run.command?.kind === 'leaf' &&
                same(run.command, e.occurrence.command) &&
                !run.completedLeaves.includes(run.occurrence),
              'leaf-completion-identity',
              'exactly one successful completion of the current live leaf',
              { source: e.source, occurrence: e.occurrence?.id, completed: run.completedLeaves },
            )
            run.completedLeaves.push(run.occurrence)
          }
          if (e.phase === 'call-started') {
            requireTrace(
              Number.isSafeInteger(e.bridgeId) &&
                !s.calls[e.bridgeId] &&
                run.occurrence === e.occurrence?.id &&
                run.command?.kind === 'leaf' &&
                run.command.command.kind === 'runEntityTrigger' &&
                same(run.command.command.target, e.target),
              'fresh-call',
              'current parent occurrence',
              e,
            )
            s.calls[e.bridgeId] = { runId: e.runId, occurrence: e.occurrence.id, target: e.target }
          }
          if (e.phase === 'call-ended') {
            const call = s.calls[e.bridgeId]
            requireTrace(
              call &&
                !call.ended &&
                call.runId === e.runId &&
                call.occurrence === e.occurrence?.id &&
                same(call.target, e.target) &&
                (!call.child || s.runs[call.child]?.ended),
              'call-return-order',
              'own call after child ended',
              e,
            )
            call.ended = true
          }
          if (e.phase === 'run-ended') {
            requireTrace(
              !Object.values(s.calls).some((c) => c.runId === e.runId && !c.ended),
              'parent-end-order',
              'all child calls returned',
              e.runId,
            )
            requireTrace(
              run.occurrence === (e.occurrence?.id ?? null),
              'terminal-occurrence',
              run.occurrence,
              e.occurrence?.id,
            )
            run.ended = true
            s.activities[e.activityId].pop()
          }
          return s
        },
      },
      accept: (s) =>
        requireTrace(
          s.commands > 0,
          'invocation-evidence',
          'executed commands',
          s.commands,
          'unknown',
        ),
    },
    events.map((e) => ({ ...e, type: 'receipt' })),
  )
}

/** A valid command identity alone cannot prove which command registered this particular
 * timer/IO. A later receipt must keep the entire start binding, even after that run ends.
 */
export function checkDeferredOwners(trace) {
  const events = [...(trace.initialCauses ?? []), ...(trace.causes ?? [])]
    .filter((e) => e.engine === 'reforge' && /^(wait|io)-/.test(e.phase))
    .sort((a, b) => a.order - b.order)
  return checkTransitionTrace(
    {
      id: 'deferred-registration-owners/v1',
      initial: { tokens: {} },
      transitions: {
        receipt: (s, e) => {
          const family = e.phase.startsWith('wait-') ? 'wait' : 'io',
            id = family === 'wait' ? e.waitId : e.ioId,
            key = `${family}/${id}`,
            owner = {
              runId: e.runId,
              activityId: e.activityId,
              runnerId: e.runnerId,
              parentRunId: e.parentRunId,
              parentOccurrence: e.parentOccurrence,
              callId: e.callId,
              occurrence: e.occurrence,
            }
          requireTrace(
            Number.isSafeInteger(id) && id > 0,
            'deferred-token',
            'actual registration ID',
            id,
            'unknown',
          )
          if (e.phase === `${family}-start`) {
            requireTrace(!s.tokens[key], 'fresh-deferred-token', 'new registration', key)
            s.tokens[key] = { owner, ended: false, io: e.io ?? null }
          } else {
            const token = s.tokens[key]
            requireTrace(
              token,
              'deferred-start-present',
              'preceding actual registration',
              key,
              'unknown',
            )
            requireTrace(
              (!token.ended ||
                (e.phase === 'wait-remaining' && e.settled === true && e.remainingMs === 0)) &&
                same(token.owner, owner) &&
                same(token.io, e.io ?? null),
              'deferred-owner-stable',
              token,
              { owner, io: e.io ?? null },
            )
            if (e.phase === `${family}-end`) token.ended = true
          }
          return s
        },
      },
      accept: () => {},
    },
    events.map((e) => ({ ...e, type: 'receipt' })),
  )
}
