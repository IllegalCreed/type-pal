import type { FlowCursor, RuntimeScriptFlow } from '@type-pal/content'
import { compileRuntimeScriptFlow } from '../runtime-script-compiler.js'
import { RuntimeScriptRunner, type ScriptRuntimeHost } from '../runtime-script-runner.js'

/** Adjacent explicit waits have the same effect boundary and total duration. */
export function normalizeInteractiveWaits(events: readonly unknown[]): unknown[] {
  const normalized: unknown[] = []
  const waitMs = (event: unknown): number | undefined => {
    if (!Array.isArray(event) || event[0] !== 'command') return undefined
    const command: unknown = event[1]
    if (
      !command ||
      typeof command !== 'object' ||
      !('kind' in command) ||
      command.kind !== 'wait' ||
      !('ms' in command) ||
      typeof command.ms !== 'number'
    )
      return undefined
    return command.ms
  }
  for (const event of events) {
    const ms = waitMs(event),
      previous = waitMs(normalized.at(-1))
    if (ms !== undefined && previous !== undefined)
      normalized[normalized.length - 1] = ['command', { kind: 'wait', ms: previous + ms }]
    else normalized.push(event)
  }
  return normalized
}

/** Current runner only. Golden hashes were captured from baseline 1b3bffb79 before removal. */
export async function interactiveGovernanceTrace(
  flow: RuntimeScriptFlow,
  condition: boolean,
  mask: number,
) {
  const all: unknown[] = []
  let cursor: FlowCursor | undefined
  const answers = [Boolean(mask & 1), Boolean(mask & 2), Boolean(mask & 4)]
  for (let activation = 0; activation < 4; activation++) {
    let answerIndex = 0
    const events: unknown[] = []
    const host: ScriptRuntimeHost = {
      execute(command) {
        events.push(['command', command])
      },
      evalCondition(value) {
        events.push(['condition', value])
        return condition
      },
      async confirm() {
        const answer = answers[answerIndex++ % answers.length]
        if (answer === undefined) throw new Error('missing confirmation trace answer')
        events.push(['confirm', answer])
        return answer
      },
      async startBattle(request) {
        events.push(['battle', request])
        return condition ? 'victory' : 'defeat'
      },
      teleportOut: async () => condition,
      wait: async (ms) => {
        events.push(['wait', ms])
      },
      waitWorldTick: async () => {
        events.push('worldTick')
      },
      yieldMacroTask: async () => {
        events.push('macroTask')
      },
    }
    await new RuntimeScriptRunner(host, new AbortController().signal).runFlow(
      compileRuntimeScriptFlow(flow, {
        timing: 'interactive',
        canonicalContentDigest: 'c'.repeat(64),
      }),
      {
        cursor,
        cursorController: {
          reachSafePoint(next) {
            cursor = next
            return 'continue'
          },
        },
      },
    )
    all.push({
      events: normalizeInteractiveWaits(events),
      cursor: cursor ?? { kind: 'stage', stage: flow.initial },
    })
  }
  return all
}
