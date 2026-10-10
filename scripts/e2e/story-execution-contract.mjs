import { isDeepStrictEqual as same } from 'node:util'
import { verifyInnTriggerTerminal } from './inn-timing-intent.mjs'
import { verifyFiniteScriptRuns } from './script-execution-contract.mjs'
import { authoredTerminalCursor } from './script-terminal-intent.mjs'
import { storyExecutionSpecifications } from './story-execution-specs.mjs'
import { checkTransitionTrace, requireTrace, TraceObligation } from './trace-refinement.mjs'

/** Required scenario runs are independent of what happened to be recorded. The
 * specialised timing checkers still prove ready-frame/draw and takeover timing.
 */
export function checkStoryExecutions(
  trace,
  fragment,
  specifications = storyExecutionSpecifications(fragment),
) {
  const events = trace.causes ?? []
  const lineage = [...(trace.initialCauses ?? []), ...events]
  return checkTransitionTrace(
    {
      id: 'required-story-executions/v1',
      initial: { executions: [] },
      transitions: {
        required: (state, { spec }) => {
          requireTrace(
            events.some((e) => e.phase === 'run-started' && e.author),
            'author-binding-evidence',
            'actual author-bound invocation starts',
            null,
            'unknown',
          )
          let binding
          try {
            ;[binding] = verifyFiniteScriptRuns(events, [spec])
          } catch (error) {
            requireTrace(false, 'required-author-execution', spec.name, String(error))
          }
          const { runId, command, stage } = binding
          const ends = events.filter((e) => e.phase === 'run-ended' && e.runId === runId)
          requireTrace(ends.length === 1, 'required-run-ended', spec.name, ends.length, 'unknown')
          const end = ends[0]
          requireTrace(end.order > command.order, 'run-end-after-body', command.order, end.order)
          requireTrace(
            same(end.occurrence, command.occurrence),
            'run-end-last-command',
            command.occurrence,
            end.occurrence,
          )
          if (spec.terminal === 'scene-transition') {
            requireTrace(
              typeof end.resolved === 'boolean',
              'run-result-evidence',
              'actual runFlow outcome',
              end.resolved,
              'unknown',
            )
            requireTrace(
              end.resolved || end.aborted === true,
              'scene-transition-failed',
              'resolved or cancelled by observed scene switch',
              { resolved: end.resolved, aborted: end.aborted },
            )
            const leaf = command.occurrence.command.command
            requireTrace(leaf?.kind === 'loadScene', 'scene-exit-author', 'loadScene', leaf)
            const boundaries = [...(trace.initialEvents ?? []), ...(trace.events ?? [])]
              .filter(
                (e) =>
                  e.order > command.order && e.order < end.order && e.kind === 'scene-lifecycle',
              )
              .sort((a, b) => a.order - b.order)
            const materialized = boundaries.find((e) => e.phase === 'materialized')
            const ready = boundaries.find((e) => e.phase === 'ready')
            requireTrace(
              materialized && ready,
              'required-scene-transition',
              leaf.scene,
              { materialized, ready },
              'unknown',
            )
            const competitors = lineage.filter(
              (e) =>
                e.phase === 'command' &&
                e.runId !== runId &&
                e.order < materialized.order &&
                e.occurrence?.command?.command?.kind === 'loadScene' &&
                !lineage.some(
                  (end) =>
                    end.phase === 'run-ended' && end.runId === e.runId && end.order < command.order,
                ),
            )
            requireTrace(
              !competitors.length,
              'scene-transition-owner',
              'one live authored scene switch',
              competitors.map((e) => e.order),
              'unknown',
            )
            requireTrace(
              materialized.scene === leaf.scene &&
                ready.scene === leaf.scene &&
                materialized.sceneVisit === ready.sceneVisit &&
                ready.sceneVisit !== command.sceneVisit &&
                materialized.order < ready.order,
              'scene-transition-target',
              { scene: leaf.scene, afterVisit: command.sceneVisit },
              { materialized, ready },
            )
          } else {
            requireTrace(
              typeof end.resolved === 'boolean',
              'run-result-evidence',
              'actual runFlow outcome',
              end.resolved,
              'unknown',
            )
            requireTrace(end.resolved && !end.aborted, 'successful-story-run', spec.name, {
              resolved: end.resolved,
              aborted: end.aborted,
            })
            const settlements = events.filter(
              (e) => e.phase === 'stage-settled' && e.runId === runId,
            )
            requireTrace(
              settlements.length === 1,
              'required-stage-settlement',
              spec.name,
              settlements.length,
              'unknown',
            )
            const settled = settlements[0]
            let decision = 'continue'
            if (spec.terminal === 'inn-trigger-replacement') {
              try {
                decision = verifyInnTriggerTerminal(trace).decision
              } catch (error) {
                if (error instanceof TraceObligation) throw error
                requireTrace(false, 'terminal-replacement-evidence', spec.name, String(error))
              }
            }
            requireTrace(
              command.order < settled.order &&
                settled.order < end.order &&
                same(settled.occurrence, command.occurrence) &&
                same(settled.cursor, authoredTerminalCursor(stage)) &&
                settled.decision === decision,
              'authored-stage-settlement',
              {
                cursor: authoredTerminalCursor(stage),
                decision,
              },
              { cursor: settled.cursor, decision: settled.decision, order: settled.order },
            )
          }
          state.executions.push({
            name: spec.name,
            runId,
            commands: binding.commands,
            first: binding.occurrences[0].order,
            last: command.order,
            end: end.order,
          })
          return state
        },
      },
      accept: () => {},
    },
    specifications.map((spec) => ({ type: 'required', spec })),
  )
}
