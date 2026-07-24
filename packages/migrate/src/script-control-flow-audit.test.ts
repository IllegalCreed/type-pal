import type { Command, ScriptRef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  productComponentAuditForTest,
  productReferenceSitesForTest,
  type SourceEntrySite,
  semanticSourceGraphForTest,
  sourceAddressZeroSitesForTest,
  sourceHookInstallerAddressesForTest,
  sourceSceneHookPatchesForTest,
} from './script-control-flow-audit.js'
import type { SourceCmd } from './source-facts.js'

const raw = (opcode: number, operands: number[] = [0, 0, 0]): SourceCmd => ({
  op: 'raw',
  opcode,
  operands,
})

const root = (
  entry: number,
  channel: 'auto' | 'trigger',
  sourceId = `${channel}:${entry}`,
): SourceEntrySite => ({
  kind: channel === 'auto' ? 'entity-auto' : 'entity-trigger',
  sourceId,
  owner: 's000',
  entry,
  channel,
})

const ref = (id: string): ScriptRef => ({ chunk: 'c00', id })

describe('script control flow semantic source graph', () => {
  test('0x06 的零跳转在 auto 是自环，在 trigger 是结束', () => {
    const commands = [raw(0x06, [50, 0, 0])]
    expect(semanticSourceGraphForTest(commands, [root(0, 'auto')])).toMatchObject({
      nodes: 1,
      edges: { execution: 1, binding: 0, recovery: 0 },
      components: 1,
      cyclicComponents: 1,
      cyclicNodes: 1,
    })
    expect(semanticSourceGraphForTest(commands, [root(0, 'trigger')])).toMatchObject({
      nodes: 1,
      edges: { execution: 0, binding: 0, recovery: 0 },
      components: 1,
      cyclicComponents: 0,
      cyclicNodes: 0,
    })
    expect(sourceAddressZeroSitesForTest(commands, [root(0, 'auto')])).toEqual([
      expect.objectContaining({ address: 0, disposition: 'auto-self-loop', contexts: ['auto'] }),
    ])
    expect(sourceAddressZeroSitesForTest(commands, [root(0, 'trigger')])).toEqual([
      expect.objectContaining({ address: 0, disposition: 'trigger-stop', contexts: ['trigger'] }),
    ])
  })

  test('同一 0x06 地址经 auto/trigger 两种通道进入时明确报告上下文依赖', () => {
    const sites = sourceAddressZeroSitesForTest(
      [raw(0x06, [50, 0, 0])],
      [root(0, 'auto'), root(0, 'trigger')],
    )
    expect(sites).toEqual([
      expect.objectContaining({
        address: 0,
        disposition: 'context-dependent',
        contexts: ['auto', 'trigger'],
      }),
    ])
  })

  test('零地址的清绑定和场景 hook 空槽不会成为 CFG 边', () => {
    const commands: SourceCmd[] = [
      raw(0x24, [1, 0, 0]),
      raw(0x25, [1, 0, 0]),
      raw(0x6d, [1, 0, 0]),
      { op: 'end' },
    ]
    const roots = [root(0, 'trigger'), root(1, 'trigger'), root(2, 'trigger')]
    const graph = semanticSourceGraphForTest(commands, roots)
    const sites = sourceAddressZeroSitesForTest(commands, roots)
    expect(graph.edges.binding).toBe(0)
    expect(sites.filter((site) => site.disposition === 'clear-binding')).toHaveLength(2)
    expect(sites.filter((site) => site.disposition === 'clear-scene-hooks')).toHaveLength(2)
  })

  test('无入口上下文的 0x06 零目标必须标为未知归属，而不是猜 trigger', () => {
    expect(sourceAddressZeroSitesForTest([raw(0x06, [50, 0, 0])], [])).toEqual([
      expect.objectContaining({
        address: 0,
        disposition: 'unowned-context',
        contexts: [],
      }),
    ])
  })

  test('binding 自环不算执行循环', () => {
    const graph = semanticSourceGraphForTest(
      [{ op: 'end' }, raw(0x24, [1, 1, 0]), { op: 'end' }],
      [root(1, 'trigger')],
    )
    expect(graph.edges.binding).toBeGreaterThan(0)
    expect(graph.cyclicComponents).toBe(0)
    expect(graph.cyclicNodes).toBe(0)
  })

  test('0x6D 的场景 0 不会被钳成合法 s000', () => {
    expect(sourceSceneHookPatchesForTest([raw(0x6d, [0, 1, 0])])).toEqual([
      expect.objectContaining({
        address: 0,
        targetScene: 'invalid-scene:0',
        onEnter: 1,
      }),
    ])
  })

  test('0x6D 安装地址只能从调用体自身来源匹配，不能按全源唯一目标猜测', () => {
    const commands = [raw(0x6d, [60, 0, 11870])]
    const targetIds = ['scene/s059/override/on-teleport/L-11870/stage-0']
    expect(
      sourceHookInstallerAddressesForTest(commands, [], 'setSceneOnTeleport', 's059', targetIds),
    ).toEqual([])
    expect(
      sourceHookInstallerAddressesForTest(commands, [0], 'setSceneOnTeleport', 's059', targetIds),
    ).toEqual([0])
  })
})

describe('script control flow product graph', () => {
  test('场景 hook 内的 call 是延迟绑定，不和同步回调拼成伪 SCC', () => {
    const bodies: Record<string, Command[]> = {
      A: [
        {
          kind: 'setSceneOnEnter',
          scene: 's001',
          stages: [{ body: [{ kind: 'callScript', ref: ref('B') }] }],
        },
      ],
      B: [{ kind: 'callScript', ref: ref('A') }],
    }
    expect(productReferenceSitesForTest(bodies.A!)).toEqual([
      expect.objectContaining({
        callerBodyId: 'test',
        kind: 'callScript',
        flow: 'deferred-binding',
        targetId: 'B',
      }),
    ])
    expect(productComponentAuditForTest(bodies)).toEqual({
      cyclicComponents: 0,
      cyclicBodies: 0,
    })
  })

  test('动态实体绑定的自引用也不算同步执行循环', () => {
    const bodies: Record<string, Command[]> = {
      A: [{ kind: 'setEntityAuto', entity: 'e1', script: ref('A') }],
    }
    expect(productReferenceSitesForTest(bodies.A!)[0]).toMatchObject({
      kind: 'setEntityAuto',
      flow: 'deferred-binding',
    })
    expect(productComponentAuditForTest(bodies).cyclicComponents).toBe(0)
  })

  test('动态实体 inline stages 内的调用同样是延迟绑定，不形成当前 tick 假循环', () => {
    const bodies: Record<string, Command[]> = {
      A: [
        {
          kind: 'setEntityTrigger',
          entity: 'e1',
          stages: [{ body: [{ kind: 'callScript', ref: ref('A') }] }],
        },
      ],
    }
    expect(productReferenceSitesForTest(bodies.A!)).toEqual([
      expect.objectContaining({
        kind: 'callScript',
        flow: 'deferred-binding',
        targetId: 'A',
      }),
    ])
    expect(productComponentAuditForTest(bodies)).toEqual({
      cyclicComponents: 0,
      cyclicBodies: 0,
    })
  })
})
