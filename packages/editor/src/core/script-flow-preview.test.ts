import type { AuthorScriptFlow } from '@type-pal/content'
import { expect, test } from 'vitest'
import { previewFlowCursor, previewStepLabel } from './script-flow-preview.js'

const flow: AuthorScriptFlow = {
  kind: 'stages',
  initial: 'first',
  stages: [
    { id: 'first', body: [] },
    { id: 'second', body: [] },
  ],
}

test('selection validates without changing the authored initial step', () => {
  const selected = previewFlowCursor(flow, { kind: 'stage', stage: 'second' })
  expect(selected).toEqual({ kind: 'stage', stage: 'second' })
  expect(previewStepLabel(flow, selected)).toBe('步骤 2')
  expect(flow.initial).toBe('first')
  expect(previewFlowCursor(flow, { kind: 'stage', stage: 'deleted' })).toEqual({
    kind: 'stage',
    stage: 'first',
  })
})

test('completed or absent selection uses the configured initial step', () => {
  expect(previewFlowCursor(flow, { kind: 'completed' })).toEqual({ kind: 'stage', stage: 'first' })
  expect(previewFlowCursor(flow)).toEqual({ kind: 'stage', stage: 'first' })
  expect(previewStepLabel(flow, { kind: 'completed' })).toBe('已完成')
})

test('step titles include purpose while equal names still select different stable IDs', () => {
  const named: AuthorScriptFlow = {
    ...flow,
    stages: flow.stages.map((stage) => ({ ...stage, label: '进房' })),
  }
  const second = previewFlowCursor(named, { kind: 'stage', stage: 'second' })
  expect(second).toEqual({ kind: 'stage', stage: 'second' })
  expect(previewStepLabel(named, second)).toBe('步骤 2 · 进房')
  expect(previewStepLabel(named, { kind: 'stage', stage: 'first' })).toBe('步骤 1 · 进房')
  expect(previewStepLabel(named, { kind: 'stage', stage: 'deleted' })).toBe('步骤 deleted')
})
