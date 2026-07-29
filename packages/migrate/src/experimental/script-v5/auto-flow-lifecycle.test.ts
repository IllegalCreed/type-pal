import { describe, expect, test } from 'vitest'
import type { SourceCmd } from '../../source-facts.js'
import { AutoFlowLifecycleIndex } from './auto-flow-lifecycle.js'

function classify(commands: SourceCmd[]) {
  return new AutoFlowLifecycleIndex([{ op: 'end' }, ...commands]).classify(1)
}

describe('R13-1 auto flow lifecycle source oracle', () => {
  test('plain end parks in a terminal lifecycle', () => {
    expect(
      classify([{ op: 'raw', opcode: 0x14, operands: [1, 0, 0] }, { op: 'end' }]),
    ).toMatchObject({
      kind: 'terminal',
      shape: 'terminal',
      bottomComponents: [[2]],
    })
  })

  test('reset0 has no false fallthrough and remains a closed repeat', () => {
    expect(
      classify([{ op: 'end', reset: true, resetTo: 1 } as SourceCmd, { op: 'end' }]),
    ).toMatchObject({
      kind: 'repeat',
      shape: 'repeat-root',
      recurrentComponents: [[1]],
    })
  })

  test('delayed goto includes its count-expiry fallthrough', () => {
    expect(
      classify([{ op: 'goto', to: 'L_1', frameDelay: 2 } as SourceCmd, { op: 'end' }]),
    ).toMatchObject({
      kind: 'terminal',
      bottomComponents: [[2]],
    })
  })

  test('call and dynamic binding targets do not leak into the caller auto context', () => {
    const call = classify([
      { op: 'raw', opcode: 0x04, operands: [3, 6, 0] },
      { op: 'end' },
      { op: 'goto', to: 'L_3' } as SourceCmd,
    ])
    expect(call).toMatchObject({ kind: 'terminal', reachableAddresses: [1, 2] })

    const binding = classify([
      { op: 'raw', opcode: 0x24, operands: [6, 3, 0] },
      { op: 'end' },
      { op: 'goto', to: 'L_3' } as SourceCmd,
    ])
    expect(binding).toMatchObject({ kind: 'terminal', reachableAddresses: [1, 2] })
  })

  test('prefix and recurrent tail are distinguished from a root repeat', () => {
    expect(
      classify([
        { op: 'raw', opcode: 0x14, operands: [1, 0, 0] },
        { op: 'goto', to: 'L_3' } as SourceCmd,
        { op: 'goto', to: 'L_3' } as SourceCmd,
      ]),
    ).toMatchObject({
      kind: 'repeat',
      shape: 'prefix-tail',
      recurrentComponents: [[3]],
    })
  })

  test('idle reset stays open for R13-2', () => {
    expect(
      classify([{ op: 'end', reset: true, resetTo: 1, idleFrames: 3 } as SourceCmd, { op: 'end' }]),
    ).toMatchObject({
      kind: 'idle-gate',
      shape: 'idle-gate',
      idleGateAddresses: [1],
    })
  })
})
