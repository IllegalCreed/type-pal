import type { AuthorScriptFlow, FlowCursor } from '@type-pal/content'

/** Validate selection synchronously: deleted steps must never leave a stale playback cursor. */
export function previewFlowCursor(flow: AuthorScriptFlow, selected?: FlowCursor): FlowCursor {
  if (flow.kind === 'stages')
    return {
      kind: 'stage',
      stage:
        selected?.kind === 'stage' && flow.stages.some((stage) => stage.id === selected.stage)
          ? selected.stage
          : flow.initial,
    }
  return {
    kind: 'state',
    machine: flow.machine.id,
    state:
      selected?.kind === 'state' &&
      selected.machine === flow.machine.id &&
      Object.hasOwn(flow.machine.states, selected.state)
        ? selected.state
        : flow.machine.initial,
  }
}

export function previewCursorKey(cursor: FlowCursor | undefined): string {
  return JSON.stringify(cursor ?? null)
}

export function previewStepLabel(flow: AuthorScriptFlow, cursor: FlowCursor): string {
  if (cursor.kind === 'stage' && flow.kind === 'stages')
    return `步骤 ${flow.stages.findIndex((stage) => stage.id === cursor.stage) + 1}`
  if (cursor.kind === 'state' && flow.kind === 'stateMachine')
    return flow.machine.states[cursor.state]?.label ?? cursor.state
  return '已完成'
}
