import { describe, expect, test } from 'vitest'
import { classifyP3ReferenceShape, inheritedContextDisposition } from './p3-control-flow.js'

function site(
  callerBodyId: string,
  path: string,
  kind: 'callScript' | 'jumpScript' | 'setEntityAuto' | 'setEntityTrigger',
  flow: 'execution' | 'deferred-binding',
) {
  return { callerBodyId, path, kind, flow }
}

describe('N3 P3 control-flow classification', () => {
  test('只把唯一 jump 和同 caller 条件臂 join 结构化', () => {
    expect(
      classifyP3ReferenceShape([site('scene/root', '/0/then/0', 'jumpScript', 'execution')]),
    ).toBe('tail-inline')
    expect(
      classifyP3ReferenceShape([
        site('scene/root', '/0/then/0', 'jumpScript', 'execution'),
        site('scene/root', '/1/onNo/0', 'jumpScript', 'execution'),
      ]),
    ).toBe('branch-switch-join')
    expect(
      classifyP3ReferenceShape([
        site('scene/root-a', '/0/then/0', 'jumpScript', 'execution'),
        site('scene/root-b', '/0/then/0', 'jumpScript', 'execution'),
      ]),
    ).toBe('deferred-multi-owner-join')
    expect(
      classifyP3ReferenceShape([
        site('scene/root', '/0', 'jumpScript', 'execution'),
        site('scene/root', '/1', 'jumpScript', 'execution'),
      ]),
    ).toBe('deferred-multi-owner-join')
  })

  test('call、绑定和混合入口保持各自语义域', () => {
    expect(classifyP3ReferenceShape([site('scene/root', '/0', 'callScript', 'execution')])).toBe(
      'deferred-call-owner',
    )
    expect(
      classifyP3ReferenceShape([
        site('scene/root', '/0', 'setEntityAuto', 'deferred-binding'),
        site('scene/root', '/1', 'setEntityTrigger', 'deferred-binding'),
      ]),
    ).toBe('deferred-entity-binding-owner')
    expect(
      classifyP3ReferenceShape([
        site('scene/root', '/0/then/0', 'jumpScript', 'execution'),
        site('scene/root', '/1', 'setEntityAuto', 'deferred-binding'),
      ]),
    ).toBe('deferred-mixed-flow-binding')
  })

  test('RNG 与 pendingAuto 只接受无消费者或先定义后消费', () => {
    const raw = (opcode: number) => ({ op: 'raw', opcode, operands: [] })
    expect(inheritedContextDisposition([], [])).toEqual({
      rng: { firstRelevantOpcode: 'none', inheritedConsumer: false },
      pendingBattleAuto: { firstRelevantOpcode: 'none', inheritedConsumer: false },
    })
    expect(
      inheritedContextDisposition([raw(0x36), raw(0x37), raw(0x8a), raw(0x07)], [0, 1, 2, 3]),
    ).toEqual({
      rng: { firstRelevantOpcode: 'set-before-use', inheritedConsumer: false },
      pendingBattleAuto: {
        firstRelevantOpcode: 'set-before-use',
        inheritedConsumer: false,
      },
    })
    expect(inheritedContextDisposition([raw(0x37), raw(0x07)], [0, 1])).toEqual({
      rng: { firstRelevantOpcode: 'none', inheritedConsumer: true },
      pendingBattleAuto: { firstRelevantOpcode: 'none', inheritedConsumer: true },
    })
  })
})
