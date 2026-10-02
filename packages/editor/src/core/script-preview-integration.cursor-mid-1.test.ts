import type { AuthorScriptFlow } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  flowOf,
  move,
  other,
  pos,
  preview,
  scene,
  target,
} from './__tests__/cursor-preview-mid-1/fixtures.js'
import { previewFlowCursor, previewStepLabel } from './script-flow-preview.js'
import { collectScriptMovementPreview } from './script-movement-preview.js'

describe('C8 cursor-mid-1 纯函数组合', () => {
  test('C8-01 选中 stage B 且 self 指向 guest 时只展开 B 内 guest 轨', () => {
    const flow: AuthorScriptFlow = {
      kind: 'stages',
      initial: 'a',
      stages: [
        { id: 'a', body: [move(20)], next: 'b' },
        { id: 'b', body: [move(11, other), move(12, other)] },
      ],
    }
    const cursor = previewFlowCursor(flow, { kind: 'stage', stage: 'b' })
    const result = collectScriptMovementPreview({
      scene,
      flow,
      cursor,
      self: other,
    })
    expect(previewStepLabel(flow, cursor)).toBe('步骤 2')
    expect(result.tracks).toHaveLength(1)
    expect(result.tracks[0]?.target).toEqual({ kind: 'entity', address: other })
    expect(
      result.tracks[0]?.segments.map((segment) => [
        segment.from.pos.col,
        segment.to.pos.col,
        segment.conditional,
      ]),
    ).toEqual([
      [9, 11, false],
      [11, 12, false],
    ])
    expect(result.tracks[0]?.nodes.some((node) => node.pos.col === 20)).toBe(false)
  })

  test('C8-02 prepare-only：sceneEntry true 仅 prepare；false 时空轨', () => {
    const flow: AuthorScriptFlow = {
      kind: 'stages',
      initial: 'door',
      stages: [
        {
          id: 'door',
          entry: {
            prepare: [{ kind: 'setEntityPos', target, pos: pos(3) }, move(5)],
            reveal: { kind: 'cut' },
          },
          body: [],
        },
      ],
    }
    const withPrep = collectScriptMovementPreview({
      scene,
      flow,
      cursor: { kind: 'stage', stage: 'door' },
      sceneEntry: true,
    })
    const without = collectScriptMovementPreview({
      scene,
      flow,
      cursor: { kind: 'stage', stage: 'door' },
      sceneEntry: false,
    })
    expect(
      withPrep.tracks[0]?.segments.map((segment) => [segment.from.pos.col, segment.to.pos.col]),
    ).toEqual([[3, 5]])
    expect(withPrep.tracks[0]?.nodes.find((node) => node.pos.col === 3)?.kind).toBe('teleport')
    expect(without.tracks).toEqual([])
  })

  test('C8-03 stateMachine 游标标题与轨迹同一次组合读出', () => {
    const flow: AuthorScriptFlow = {
      kind: 'stateMachine',
      machine: {
        id: 'talk',
        label: '对话',
        initial: 'first',
        states: {
          first: { label: '首次', body: [move(20)], next: { kind: 'stay' } },
          repeat: { label: '复读', body: [move(6), move(7)], next: { kind: 'stay' } },
        },
      },
    }
    const cursor = previewFlowCursor(flow, {
      kind: 'state',
      machine: 'talk',
      state: 'repeat',
    })
    expect(previewStepLabel(flow, cursor)).toBe('复读')
    const result = collectScriptMovementPreview({ scene, flow, cursor, self: target })
    expect(
      result.tracks[0]?.segments.map((segment) => [
        segment.from.pos.col,
        segment.to.pos.col,
        segment.conditional,
      ]),
    ).toEqual([
      [1, 6, false],
      [6, 7, false],
    ])
    expect(result.tracks[0]?.nodes.some((node) => node.pos.col === 20)).toBe(false)
  })

  test('C8-04 两次 collect 不同 cursor 不突变 flow/scene，且轨迹仅随 cursor 变', () => {
    const flow: AuthorScriptFlow = {
      kind: 'stages',
      initial: 'one',
      stages: [
        { id: 'one', body: [move(2)], next: 'two' },
        { id: 'two', body: [move(8)] },
      ],
    }
    const before = structuredClone({ flow, scene })
    const first = collectScriptMovementPreview({
      scene,
      flow,
      cursor: { kind: 'stage', stage: 'one' },
      self: target,
    })
    const second = collectScriptMovementPreview({
      scene,
      flow,
      cursor: { kind: 'stage', stage: 'two' },
      self: target,
    })
    expect(first.tracks[0]?.nodes.at(-1)?.pos.col).toBe(2)
    expect(second.tracks[0]?.nodes.at(-1)?.pos.col).toBe(8)
    expect(first).not.toEqual(second)
    expect({ flow, scene }).toEqual(before)
    expect(preview([move(2)]).tracks[0]?.nodes.at(-1)?.pos.col).toBe(2)
    expect(flowOf([move(2)]).kind).toBe('stages')
  })
})
