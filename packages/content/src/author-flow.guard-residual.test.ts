import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import { expectAcceptsUnchanged, expectExactError } from './__tests__/guard-leaf-fixtures.js'
import { checkAuthorScriptFlow } from './author-script.js'
import { checkRuntimeScriptFlow } from './runtime-script.js'

const legalStages = () => ({
  kind: 'stages',
  initial: 'start',
  stages: [{ id: 'start', body: [] }],
})

describe('G1 author/runtime script flow 残差', () => {
  test('普通步骤经作者与运行时两入口通过且输入保真', () => {
    expectAcceptsUnchanged((value) => checkAuthorScriptFlow(value, 'flow'), legalStages())
    expectAcceptsUnchanged((value) => checkRuntimeScriptFlow(value, 'flow'), legalStages())
  })

  test('stages 空数组拒绝且路径精确', () => {
    const bad = { ...legalStages(), stages: [] }
    const before = deepSnapshot(bad)
    expectExactError(() => checkAuthorScriptFlow(bad, 'flow'), 'flow.stages: 期望非空数组')
    expect(bad).toEqual(before)
  })

  test.each([
    [
      'stages body 非数组',
      { ...legalStages(), stages: [{ id: 'start', body: 42 }] },
      'flow.stages[0].body: 期望 BaseAuthorCommand[]',
    ],
  ] as const)('%s拒绝', (_label, bad, error) => {
    expectAcceptsUnchanged((value) => checkAuthorScriptFlow(value, 'flow'), legalStages())
    const before = deepSnapshot(bad)
    expectExactError(() => checkAuthorScriptFlow(bad, 'flow'), error)
    expect(bad).toEqual(before)
  })

  test('未知 flow kind 与 stage entry reveal kind 拒绝', () => {
    expectAcceptsUnchanged((value) => checkRuntimeScriptFlow(value, 'flow'), legalStages())
    const badKind = { kind: 'other' }
    const kindBefore = deepSnapshot(badKind)
    expectExactError(() => checkAuthorScriptFlow(badKind, 'flow'), 'flow.kind: 期望 stages')
    expect(badKind).toEqual(kindBefore)
    const badReveal = {
      kind: 'stages',
      initial: 'start',
      stages: [{ id: 'start', body: [], entry: { prepare: [], reveal: { kind: 'wipe' } } }],
    }
    const revealBefore = deepSnapshot(badReveal)
    expectExactError(
      () => checkAuthorScriptFlow(badReveal, 'flow', { allowSceneEntry: true }),
      'flow.stages[0].entry.reveal.kind: 期望 dither|fade|cut',
    )
    expect(badReveal).toEqual(revealBefore)
  })
})
