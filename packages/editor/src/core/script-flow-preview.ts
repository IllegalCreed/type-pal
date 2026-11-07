import { type AuthorScriptFlow, acquisitionPreviewStages, type FlowCursor } from '@type-pal/content'

export function authorFlowPreviewStages(
  flow: AuthorScriptFlow,
): readonly { id: string; label?: string }[] {
  return flow.kind === 'acquisition' ? acquisitionPreviewStages(flow) : flow.stages
}

export function authorFlowInitial(flow: AuthorScriptFlow): string {
  return flow.kind === 'acquisition' ? flow.stages.available.id : flow.initial
}

/** Validate selection synchronously: deleted steps must never leave a stale playback cursor. */
export function previewFlowCursor(flow: AuthorScriptFlow, selected?: FlowCursor): FlowCursor {
  return {
    kind: 'stage',
    stage:
      selected?.kind === 'stage' &&
      authorFlowPreviewStages(flow).some((stage) => stage.id === selected.stage)
        ? selected.stage
        : authorFlowInitial(flow),
  }
}

export function previewCursorKey(cursor: FlowCursor | undefined): string {
  return JSON.stringify(cursor ?? null)
}

export function previewStepLabel(flow: AuthorScriptFlow, cursor: FlowCursor): string {
  if (cursor.kind === 'stage') {
    const stages = authorFlowPreviewStages(flow)
    const index = stages.findIndex((stage) => stage.id === cursor.stage)
    const stage = stages[index]
    if (!stage) return `步骤 ${cursor.stage}`
    return `步骤 ${index + 1}${stage.label ? ` · ${stage.label}` : ''}`
  }
  return '已完成'
}
