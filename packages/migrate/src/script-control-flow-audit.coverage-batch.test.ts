import type { Command } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  productComponentAuditForTest,
  productReferenceSitesForTest,
  sourceAddressZeroSitesForTest,
} from './script-control-flow-audit.js'
import type { SourceCmd } from './source-facts.js'

const raw = (opcode: number, operands: [number, number, number]): SourceCmd => ({
  op: 'raw',
  opcode,
  operands,
})

describe('当前脚本审计：原始零目标分类与执行图', () => {
  test('每类零目标单独保留地址和操作数，非零目标不会被误报', () => {
    const commands: SourceCmd[] = [
      raw(0x07, [1, 0, 0]),
      raw(0x6d, [1, 0, 2]),
      raw(0x6d, [1, 2, 0]),
      raw(0x24, [1, 0, 0]),
      raw(0x25, [1, 0, 0]),
      raw(0x1e, [1, 0, 0]),
      raw(0x20, [1, 2, 0]),
      raw(0x5e, [1, 0, 0]),
      raw(0x68, [0, 1, 0]),
      raw(0x91, [0, 1, 0]),
      raw(0x94, [1, 2, 0]),
      raw(0x9c, [1, 0, 0]),
      raw(0x9e, [1, 2, 0]),
    ]
    const before = structuredClone(commands)
    const sites = sourceAddressZeroSitesForTest(commands, [])
    expect(
      sites.map(({ address, opcode, operand, disposition }) => [
        address,
        opcode,
        operand,
        disposition,
      ]),
    ).toEqual([
      [0, 0x07, 1, 'absent-branch'],
      [0, 0x07, 2, 'absent-branch'],
      [1, 0x6d, 1, 'absent-scene-hook'],
      [2, 0x6d, 2, 'absent-scene-hook'],
      [3, 0x24, 1, 'clear-binding'],
      [4, 0x25, 1, 'clear-binding'],
      [5, 0x1e, 1, 'no-failure-branch'],
      [6, 0x20, 2, 'no-failure-branch'],
      [7, 0x5e, 1, 'stop-branch'],
      [8, 0x68, 0, 'stop-branch'],
      [9, 0x91, 0, 'stop-branch'],
      [10, 0x94, 2, 'stop-branch'],
      [11, 0x9c, 1, 'stop-branch'],
      [12, 0x9e, 2, 'stop-branch'],
    ])
    expect(
      sourceAddressZeroSitesForTest(
        commands.map((command) =>
          command.op === 'raw' ? { ...command, operands: [1, 2, 3] } : command,
        ),
        [],
      ),
    ).toEqual([])
    expect(commands).toEqual(before)
  })

  test('两条同步脚本调用构成真正循环；延迟替换不充当同步执行边', () => {
    const ref = (id: string) => ({ chunk: 'shared/c00', id })
    const bodies: Record<string, Command[]> = {
      A: [{ kind: 'callScript', ref: ref('B') }],
      B: [{ kind: 'jumpScript', ref: ref('A') }],
    }
    const before = structuredClone(bodies)
    expect(productReferenceSitesForTest(bodies.A!)).toEqual([
      expect.objectContaining({ kind: 'callScript', targetId: 'B', flow: 'execution' }),
    ])
    expect(productReferenceSitesForTest(bodies.B!)).toEqual([
      expect.objectContaining({ kind: 'jumpScript', targetId: 'A', flow: 'execution' }),
    ])
    expect(productComponentAuditForTest(bodies)).toEqual({ cyclicComponents: 1, cyclicBodies: 2 })
    expect(
      productComponentAuditForTest({
        A: [{ kind: 'setEntityTrigger', entity: 'e1', script: ref('B') }],
        B: bodies.B!,
      }),
    ).toEqual({ cyclicComponents: 0, cyclicBodies: 0 })
    expect(bodies).toEqual(before)
  })
})
