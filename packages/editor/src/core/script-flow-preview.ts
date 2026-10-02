import type { AuthorScriptFlow, FlowCursor } from '@type-pal/content'

/** Validate selection synchronously: deleted steps must never leave a stale playback cursor. */
export function previewFlowCursor(flow: AuthorScriptFlow, selected?: FlowCursor): FlowCursor {
  return {
    kind: 'stage',
    stage:
      selected?.kind === 'stage' && flow.stages.some((stage) => stage.id === selected.stage)
        ? selected.stage
        : flow.initial,
  }
}

export function previewCursorKey(cursor: FlowCursor | undefined): string {
  return JSON.stringify(cursor ?? null)
}

export function previewStepLabel(flow: AuthorScriptFlow, cursor: FlowCursor): string {
  if (cursor.kind === 'stage') {
    const index = flow.stages.findIndex((stage) => stage.id === cursor.stage)
    const stage = flow.stages[index]
    if (!stage) return `步骤 ${cursor.stage}`
    return `步骤 ${index + 1}${stage.label ? ` · ${stage.label}` : ''}`
  }
  return '已完成'
}
