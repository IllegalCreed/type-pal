/**
 * TEST-GLM-CONTENT-GUARDS-3 G1：checkAuthorScriptFlow / checkRuntimeScriptFlow 残差。
 * 去重：author-script-current.boundaries.test.ts（选项门/重复 id/initial 与 next 未命中/
 * 数组门）、author-script-core.test.ts（同步/next 激活/commandOutcome 转移、cadence、
 * 嵌套与跨 state commandOutcome 引用、continue SCC、stage id 与 slot-aware entry）、
 * runtime-script-lifecycle / runtime-script.boundaries 已证基础合法流与本文件不重复的负例；
 * 本文件只补冻结池内的 stages 空表、machine 空 states、machine initial 未命中、
 * 非 initial state entry、未知 flow kind、stages body 数组门、嵌套重复 command id、
 * 非法 yield、commandOutcome command/outcome/kind 三叶、stage entry reveal kind。
 * 纪律：完整合法流先过同一入口；单轴坏输入；完整 message 全等；实际入参深快照。
 */
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

const legalMachine = () => ({
  kind: 'stateMachine',
  machine: {
    id: 'machine',
    label: '状态机',
    cadence: 'transition',
    initial: 'initial',
    states: {
      initial: {
        label: '初始',
        body: [{ kind: 'confirm', id: 'choice', onNo: [] }],
        next: {
          kind: 'commandOutcome',
          commandId: 'choice',
          command: 'confirm',
          outcome: 'no',
          then: { kind: 'to', state: 'initial', yield: 'worldTick' },
          else: { kind: 'continue', state: 'after-confirm' },
        },
      },
      'after-confirm': {
        label: '确认后',
        body: [],
        next: { kind: 'advance', state: 'initial' },
      },
    },
  },
})

describe('G1 author/runtime script flow 残差', () => {
  test('stages 与 stateMachine 完整合法流经两入口通过且输入保真', () => {
    expectAcceptsUnchanged((value) => checkAuthorScriptFlow(value, 'flow'), legalStages())
    expectAcceptsUnchanged((value) => checkAuthorScriptFlow(value, 'flow'), legalMachine())
    expectAcceptsUnchanged((value) => checkRuntimeScriptFlow(value, 'flow'), legalStages())
  })

  test('stages 空数组拒绝且路径精确', () => {
    const bad = { ...legalStages(), stages: [] }
    const before = deepSnapshot(bad)
    expectExactError(() => checkAuthorScriptFlow(bad, 'flow'), 'flow.stages: 期望非空数组')
    expect(bad).toEqual(before)
  })

  test('machine states 空对象与 initial 未命中拒绝', () => {
    const badStates = deepSnapshot(legalMachine()) as Record<string, unknown>
    ;(badStates.machine as Record<string, unknown>).states = {}
    const before = deepSnapshot(badStates)
    expectExactError(
      () => checkAuthorScriptFlow(badStates, 'flow'),
      'flow.machine.states: 不能为空',
    )
    expect(badStates).toEqual(before)
    const badInitial = deepSnapshot(legalMachine()) as Record<string, unknown>
    ;(badInitial.machine as Record<string, unknown>).initial = 'ghost'
    const initialBefore = deepSnapshot(badInitial)
    expectExactError(
      () => checkAuthorScriptFlow(badInitial, 'flow'),
      'flow.machine.initial: 未命中 state ghost',
    )
    expect(badInitial).toEqual(initialBefore)
  })

  test('非 initial machine state 携带 entry 拒绝；开 allowSceneEntry 后 initial state 合法 entry 通过', () => {
    const withEntry = (stateId: string, entry: unknown) => {
      const flow = deepSnapshot(legalMachine()) as Record<string, unknown>
      const machine = flow.machine as Record<string, unknown>
      const states = machine.states as Record<string, unknown>
      states[stateId] = { label: '附加', body: [], next: { kind: 'stay' }, entry }
      return flow
    }
    const legalEntry = { prepare: [], reveal: { kind: 'fade' } }
    expectAcceptsUnchanged(
      (value) => checkAuthorScriptFlow(value, 'flow', { allowSceneEntry: true }),
      withEntry('initial', legalEntry),
    )
    const badNonInitial = withEntry('second', legalEntry)
    const before = deepSnapshot(badNonInitial)
    expectExactError(
      () => checkAuthorScriptFlow(badNonInitial, 'flow', { allowSceneEntry: true }),
      'flow.machine.states.second.entry: 只允许 onEnter initial state',
    )
    expect(badNonInitial).toEqual(before)
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

  test('machine state body 嵌套重复 confirm id 拒绝', () => {
    const flow = deepSnapshot(legalMachine()) as Record<string, unknown>
    const machine = flow.machine as Record<string, unknown>
    const states = machine.states as Record<string, unknown>
    const initial = states.initial as Record<string, unknown>
    initial.body = [
      { kind: 'confirm', id: 'choice', onNo: [{ kind: 'confirm', id: 'choice', onNo: [] }] },
    ]
    const before = deepSnapshot(flow)
    expectExactError(
      () => checkAuthorScriptFlow(flow, 'flow'),
      'flow.machine.states.initial.body[0].onNo[0].id: 同一 state 内重复 CommandId choice',
    )
    expect(flow).toEqual(before)
  })

  test('next.yield 非法值与未知 next kind 拒绝', () => {
    const flow = deepSnapshot(legalMachine()) as Record<string, unknown>
    const machine = flow.machine as Record<string, unknown>
    const states = machine.states as Record<string, unknown>
    const initial = states.initial as Record<string, unknown>
    const next = initial.next as Record<string, unknown>
    next.then = { kind: 'to', state: 'initial', yield: 'frame' }
    const before = deepSnapshot(flow)
    expectExactError(
      () => checkAuthorScriptFlow(flow, 'flow'),
      'flow.machine.states.initial.next.then.yield: 期望 macroTask|worldTick',
    )
    expect(flow).toEqual(before)
    next.then = { kind: 'goto' }
    const flowBefore = deepSnapshot(flow)
    expectExactError(
      () => checkAuthorScriptFlow(flow, 'flow'),
      'flow.machine.states.initial.next.then.kind: 期望 stay|restart|continue|advance|to|branch|commandOutcome',
    )
    expect(flow).toEqual(flowBefore)
  })

  test('commandOutcome 的 command 叶与 outcome 叶拒绝', () => {
    const flow = deepSnapshot(legalMachine()) as Record<string, unknown>
    const machine = flow.machine as Record<string, unknown>
    const states = machine.states as Record<string, unknown>
    const initial = states.initial as Record<string, unknown>
    const next = initial.next as Record<string, unknown>
    next.command = 'branch'
    const before = deepSnapshot(flow)
    expectExactError(
      () => checkAuthorScriptFlow(flow, 'flow'),
      'flow.machine.states.initial.next.command: 期望 confirm',
    )
    expect(flow).toEqual(before)
    next.command = 'confirm'
    next.outcome = 'yes'
    const flowBefore = deepSnapshot(flow)
    expectExactError(
      () => checkAuthorScriptFlow(flow, 'flow'),
      'flow.machine.states.initial.next.outcome: confirm 期望 no',
    )
    expect(flow).toEqual(flowBefore)
  })

  test('未知 flow kind 与 stage entry reveal kind 拒绝', () => {
    expectAcceptsUnchanged((value) => checkRuntimeScriptFlow(value, 'flow'), legalStages())
    const badKind = { kind: 'other' }
    const kindBefore = deepSnapshot(badKind)
    expectExactError(
      () => checkAuthorScriptFlow(badKind, 'flow'),
      'flow.kind: 期望 stages|stateMachine',
    )
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
