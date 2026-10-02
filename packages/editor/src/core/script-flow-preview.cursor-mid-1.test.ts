import type { AuthorScriptFlow } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { previewCursorKey, previewFlowCursor, previewStepLabel } from './script-flow-preview.js'

const stages: AuthorScriptFlow = {
  kind: 'stages',
  initial: 'first',
  stages: [
    { id: 'first', body: [] },
    { id: 'second', body: [] },
    { id: 'third', label: '收尾', body: [] },
  ],
}

const machine: AuthorScriptFlow = {
  kind: 'stateMachine',
  machine: {
    id: 'talk',
    label: '对话',
    initial: 'idle',
    states: {
      idle: { label: '', body: [], next: { kind: 'stay' } },
      named: { label: '命名态', body: [], next: { kind: 'stay' } },
    },
  },
}

describe('C1 cursor-mid-1 选中游标与标题域', () => {
  test('C1-01 previewCursorKey(undefined) 与 JSON null 字面量等价', () => {
    expect(previewCursorKey(undefined)).toBe('null')
    expect(previewCursorKey(undefined)).toBe(JSON.stringify(null))
  })

  test('C1-02 两个稳定 stage id 产出不同 JSON key，且不等于 null', () => {
    const first = previewFlowCursor(stages, { kind: 'stage', stage: 'first' })
    const second = previewFlowCursor(stages, { kind: 'stage', stage: 'second' })
    expect(previewCursorKey(first)).toBe(JSON.stringify({ kind: 'stage', stage: 'first' }))
    expect(previewCursorKey(second)).toBe(JSON.stringify({ kind: 'stage', stage: 'second' }))
    expect(previewCursorKey(first)).not.toBe(previewCursorKey(second))
    expect(previewCursorKey(first)).not.toBe('null')
  })

  test('C1-03 previewFlowCursor 省略 selected 时同步落到 authored initial', () => {
    expect(previewFlowCursor(stages)).toEqual({ kind: 'stage', stage: 'first' })
    expect(previewFlowCursor(machine)).toEqual({
      kind: 'state',
      machine: 'talk',
      state: 'idle',
    })
  })

  test('C1-04 无 label 的 stage 标题仅步骤序号，不含间隔点', () => {
    const unlabeled = previewFlowCursor(stages, { kind: 'stage', stage: 'second' })
    expect(previewStepLabel(stages, unlabeled)).toBe('步骤 2')
    expect(previewStepLabel(stages, unlabeled)).not.toContain('·')
  })

  test('C1-05 带 label 的 stage 标题拼接用途，稳定 id 不变', () => {
    const third = previewFlowCursor(stages, { kind: 'stage', stage: 'third' })
    expect(third).toEqual({ kind: 'stage', stage: 'third' })
    expect(previewStepLabel(stages, third)).toBe('步骤 3 · 收尾')
  })

  test('C1-06 种类不匹配时标题为已完成，不回退伪造 stage 文案', () => {
    expect(previewStepLabel(machine, { kind: 'stage', stage: 'first' })).toBe('已完成')
    expect(previewStepLabel(stages, { kind: 'state', machine: 'talk', state: 'idle' })).toBe(
      '已完成',
    )
  })

  test('C1-07 state 空 label 保留空串（typed 必有 label；?? 不回退 id）', () => {
    const idle = previewFlowCursor(machine, {
      kind: 'state',
      machine: 'talk',
      state: 'idle',
    })
    expect(previewStepLabel(machine, idle)).toBe('')
    expect(previewStepLabel(machine, idle)).not.toBe('idle')
    const named = previewFlowCursor(machine, {
      kind: 'state',
      machine: 'talk',
      state: 'named',
    })
    expect(previewStepLabel(machine, named)).toBe('命名态')
  })
})
