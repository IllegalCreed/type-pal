import type { AuthorScriptFlow } from './author-script.js'

type StageFlow = Extract<AuthorScriptFlow, { kind: 'stages' }>

/** Author ASTs contain only plain JSON objects/arrays; do not require a browser clone API. */
function cloneAuthorValue<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  const copy = Object.assign(Array.isArray(value) ? [] : {}, value)
  for (const key in copy) copy[key] = cloneAuthorValue(copy[key])
  return copy
}

/** Explicit author edit only: never normalize a loader, runtime cursor, or unknown timing policy. */
export function organizeFlowAsStages(flow: AuthorScriptFlow): StageFlow | undefined {
  if (flow.kind !== 'stateMachine' || flow.machine.cadence !== undefined) return undefined
  const { machine } = flow
  const entries = Object.entries(machine.states)
  if (!Object.hasOwn(machine.states, machine.initial)) return undefined
  for (const [, state] of entries) {
    const { next } = state
    if (next.kind === 'advance') {
      if (!Object.hasOwn(machine.states, next.state)) return undefined
    } else if (next.kind !== 'stay' && next.kind !== 'restart' && next.kind !== 'complete') {
      return undefined
    }
  }

  // Display the initial reachable chain first; an object's insertion order is not execution order.
  const ordered = new Map<string, (typeof entries)[number][1]>()
  let current = machine.initial
  while (!ordered.has(current)) {
    const state = machine.states[current]
    if (!state) return undefined
    ordered.set(current, state)
    const next = state.next
    if (next.kind === 'advance') current = next.state
    else if (next.kind === 'restart') current = machine.initial
    else break
  }
  for (const [id, state] of entries) ordered.set(id, state)

  return {
    kind: 'stages',
    initial: machine.initial,
    stages: [...ordered].map(([id, state]) => {
      const { next } = state
      return {
        id,
        ...(state.entry === undefined ? {} : { entry: cloneAuthorValue(state.entry) }),
        body: cloneAuthorValue(state.body),
        ...(next.kind === 'advance'
          ? { next: next.state }
          : next.kind === 'restart'
            ? { next: machine.initial }
            : next.kind === 'complete'
              ? { next: { kind: 'complete' as const } }
              : {}),
      }
    }),
  }
}
