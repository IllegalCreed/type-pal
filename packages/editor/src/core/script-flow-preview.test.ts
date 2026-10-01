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

test('machine identity and deleted states fall back synchronously', () => {
  const machine: AuthorScriptFlow = {
    kind: 'stateMachine',
    machine: {
      id: 'current',
      label: '对话',
      initial: 'first',
      states: {
        first: { label: '首次', body: [], next: { kind: 'stay' } },
        repeat: { label: '复读', body: [], next: { kind: 'stay' } },
      },
    },
  }
  const repeat = { kind: 'state', machine: 'current', state: 'repeat' } as const
  expect(previewFlowCursor(machine, repeat)).toEqual(repeat)
  expect(previewStepLabel(machine, repeat)).toBe('复读')
  expect(previewFlowCursor(machine, { ...repeat, machine: 'previous' })).toEqual({
    kind: 'state',
    machine: 'current',
    state: 'first',
  })
  expect(previewFlowCursor(machine, { ...repeat, state: 'missing' })).toEqual({
    kind: 'state',
    machine: 'current',
    state: 'first',
  })
})
