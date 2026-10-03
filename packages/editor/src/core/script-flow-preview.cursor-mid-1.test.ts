import type { AuthorScriptFlow } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { previewCursorKey, previewFlowCursor } from './script-flow-preview.js'

const stages: AuthorScriptFlow = {
  kind: 'stages',
  initial: 'first',
  stages: [
    { id: 'first', body: [] },
    { id: 'second', body: [] },
    { id: 'third', label: '收尾', body: [] },
  ],
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
  })
})
