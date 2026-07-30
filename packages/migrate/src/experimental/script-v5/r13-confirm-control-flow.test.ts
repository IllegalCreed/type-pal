import type { ScriptFlowV5 } from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import {
  projectR13ConfirmTerminalTransition,
  splitR13ConfirmStageFlow,
} from './r13-confirm-control-flow.js'

describe('R13-4 confirm terminal projection', () => {
  it('commits END, advance, reset and loop without persisting transient states', () => {
    expect(
      projectR13ConfirmTerminalTransition({
        terminal: { kind: 'end' },
        initialState: 'initial',
        currentState: 'initial',
        persistedState: 'initial',
      }),
    ).toEqual({ kind: 'stay' })
    expect(
      projectR13ConfirmTerminalTransition({
        terminal: { kind: 'end' },
        initialState: 'initial',
        currentState: 'decision-001-yes',
        persistedState: 'initial',
      }),
    ).toEqual({ kind: 'restart' })
    expect(
      projectR13ConfirmTerminalTransition({
        terminal: {
          kind: 'advance',
          targetAddress: 200,
          targetState: 'recovered-001',
        },
        initialState: 'initial',
        currentState: 'decision-001-no',
        persistedState: 'initial',
      }),
    ).toEqual({ kind: 'advance', state: 'recovered-001' })
    expect(
      projectR13ConfirmTerminalTransition({
        terminal: { kind: 'reset', targetAddress: 100, targetState: 'initial' },
        initialState: 'initial',
        currentState: 'decision-001-no',
        persistedState: 'initial',
      }),
    ).toEqual({ kind: 'restart' })
    expect(
      projectR13ConfirmTerminalTransition({
        terminal: {
          kind: 'reset',
          targetAddress: 200,
          targetState: 'decision-001',
        },
        initialState: 'initial',
        currentState: 'decision-001',
        persistedState: 'decision-001',
      }),
    ).toEqual({ kind: 'stay' })
    expect(
      projectR13ConfirmTerminalTransition({
        terminal: {
          kind: 'loop',
          targetAddress: 100,
          targetState: 'initial',
          yield: 'worldTick',
        },
        initialState: 'initial',
        currentState: 'cycle',
        persistedState: 'cycle',
      }),
    ).toEqual({ kind: 'to', state: 'initial', yield: 'worldTick' })
  })

  it('fails loudly on incomplete terminal evidence', () => {
    expect(() =>
      projectR13ConfirmTerminalTransition({
        terminal: { kind: 'reset', targetState: 'initial' },
        initialState: 'initial',
        currentState: 'no',
        persistedState: 'initial',
      }),
    ).toThrow(/reset 缺 target/)
    expect(() =>
      projectR13ConfirmTerminalTransition({
        terminal: { kind: 'loop', targetAddress: 1, targetState: 'initial' },
        initialState: 'initial',
        currentState: 'cycle',
        persistedState: 'cycle',
      }),
    ).toThrow(/loop 缺 target/)
  })
})

describe('R13-4 confirm stage splitter', () => {
  const parent: Extract<ScriptFlowV5, { kind: 'stages' }> = {
    kind: 'stages',
    initial: 'initial',
    stages: [
      {
        id: 'initial',
        body: [
          { kind: 'clearDialog' },
          { kind: 'confirm', onNo: [{ kind: 'clearDialog' }] },
          { kind: 'clearDialog' },
          { kind: 'confirm', onNo: [] },
          { kind: 'clearDialog' },
        ],
        next: 'phase-002',
      },
      {
        id: 'phase-002',
        body: [{ kind: 'clearDialog' }],
      },
    ],
  }

  it('recursively splits multiple decisions and commits every transient suffix', () => {
    const first = splitR13ConfirmStageFlow({
      flow: parent,
      label: '测试',
      decisions: [
        {
          stageId: 'initial',
          stageConfirmOrdinal: 0,
          commandId: 'decision-001',
          noBody: [{ kind: 'clearDialog' }],
          noTerminal: {
            kind: 'reset',
            targetAddress: 100,
            targetState: 'initial',
          },
        },
        {
          stageId: 'initial',
          stageConfirmOrdinal: 1,
          commandId: 'decision-002',
          noBody: [],
          noTerminal: {
            kind: 'advance',
            targetAddress: 200,
            targetState: 'phase-002',
          },
        },
      ],
    })
    const second = splitR13ConfirmStageFlow({
      flow: parent,
      label: '测试',
      decisions: [
        {
          stageId: 'initial',
          stageConfirmOrdinal: 0,
          commandId: 'decision-001',
          noBody: [{ kind: 'clearDialog' }],
          noTerminal: {
            kind: 'reset',
            targetAddress: 100,
            targetState: 'initial',
          },
        },
        {
          stageId: 'initial',
          stageConfirmOrdinal: 1,
          commandId: 'decision-002',
          noBody: [],
          noTerminal: {
            kind: 'advance',
            targetAddress: 200,
            targetState: 'phase-002',
          },
        },
      ],
    })

    expect(first).toEqual(second)
    expect(first.flow.machine.states.initial?.next).toEqual({
      kind: 'commandOutcome',
      commandId: 'decision-001',
      command: 'confirm',
      outcome: 'no',
      then: { kind: 'continue', state: 'decision-001-no' },
      else: { kind: 'continue', state: 'decision-002' },
    })
    expect(first.flow.machine.states['decision-001-no']?.next).toEqual({
      kind: 'restart',
    })
    expect(first.flow.machine.states['decision-002-no']?.next).toEqual({
      kind: 'advance',
      state: 'phase-002',
    })
    expect(first.flow.machine.states['decision-002-yes']?.next).toEqual({
      kind: 'advance',
      state: 'phase-002',
    })
    expect(first.evidence).toHaveLength(2)
  })

  it('rejects drifted ordinals, duplicated ids and nested confirms', () => {
    expect(() =>
      splitR13ConfirmStageFlow({
        flow: parent,
        label: '测试',
        decisions: [
          {
            stageId: 'initial',
            stageConfirmOrdinal: 1,
            commandId: 'decision-001',
            noBody: [{ kind: 'clearDialog' }],
            noTerminal: {
              kind: 'reset',
              targetAddress: 100,
              targetState: 'initial',
            },
          },
        ],
      }),
    ).toThrow(/decision 数量|ordinal/)
    expect(() =>
      splitR13ConfirmStageFlow({
        flow: parent,
        label: '测试',
        decisions: [
          {
            stageId: 'initial',
            stageConfirmOrdinal: 0,
            commandId: 'decision-001',
            noBody: [{ kind: 'clearDialog' }],
            noTerminal: {
              kind: 'reset',
              targetAddress: 100,
              targetState: 'initial',
            },
          },
          {
            stageId: 'initial',
            stageConfirmOrdinal: 1,
            commandId: 'decision-001',
            noBody: [],
            noTerminal: {
              kind: 'reset',
              targetAddress: 100,
              targetState: 'initial',
            },
          },
        ],
      }),
    ).toThrow(/重复 command id/)
  })
})
