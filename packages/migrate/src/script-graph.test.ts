import { describe, expect, test } from 'vitest'
import { analyzeScriptGraph, extractScriptEdges, makeGlobalScriptRoots } from './script-graph.js'
import type { SourceCmd } from './source-facts.js'

const raw = (opcode: number, operands: number[] = [0, 0, 0]): SourceCmd => ({
  op: 'raw',
  opcode,
  operands,
})
const goto = (to: string): SourceCmd => ({ op: 'goto', to }) as SourceCmd

describe('typed script edge catalog', () => {
  test('覆盖 0x07 双臂、0x6D 双绑定、0xA2 多目标、0x08 恢复点与 auto 0x06 自环', () => {
    const commands: SourceCmd[] = [
      raw(0x07, [1, 6, 7]),
      raw(0x6d, [1, 8, 9]),
      raw(0xa2, [3, 0, 0]),
      raw(0x08),
      raw(0x06, [50, 0, 0]),
      { op: 'end' },
      { op: 'end' },
      { op: 'end' },
      { op: 'end' },
      { op: 'end' },
    ]
    const edges = extractScriptEdges(commands)
    const has = (from: number, to: number, kind: string, reason: string) =>
      edges.some(
        (edge) =>
          edge.from === from && edge.to === to && edge.kind === kind && edge.reason === reason,
      )
    expect(has(0, 6, 'execution', '0x07.lose')).toBe(true)
    expect(has(0, 7, 'execution', '0x07.flee')).toBe(true)
    expect(has(1, 8, 'binding', '0x6d.onEnter')).toBe(true)
    expect(has(1, 9, 'binding', '0x6d.onTeleport')).toBe(true)
    expect([3, 4, 5].every((to) => has(2, to, 'execution', '0xa2.random'))).toBe(true)
    expect(has(3, 4, 'recovery', '0x08.checkpoint')).toBe(true)
    expect(has(4, 4, 'execution', '0x6')).toBe(true)
  })

  test('Tarjan 把 goto A-B 环归同一 SCC', () => {
    const commands: SourceCmd[] = [goto('L_1'), goto('L_0')]
    const graph = analyzeScriptGraph(commands, [{ entry: 0, owner: 's001', kind: 'scene' }])
    expect(graph.componentOf[0]).toBe(graph.componentOf[1])
    expect(graph.owners[0]).toEqual(new Set(['s001']))
    expect(graph.owners[1]).toEqual(new Set(['s001']))
  })

  test('binding 边不把 caller 场景归属传播到目标脚本', () => {
    const commands: SourceCmd[] = [
      { op: 'end' },
      { op: 'end' },
      raw(0x24, [1, 0, 0]),
      { op: 'end' },
    ]
    const graph = analyzeScriptGraph(commands, [{ entry: 2, owner: 's001', kind: 'scene' }])
    expect(
      graph.edges.some((edge) => edge.from === 2 && edge.to === 0 && edge.kind === 'binding'),
    ).toBe(true)
    expect(graph.owners[0]?.size).toBe(0)
  })

  test('物品/法术/敌人/角色入口成为去重后的全局根', () => {
    expect(
      makeGlobalScriptRoots({
        items: [0, 3, 3],
        skills: [4],
        enemies: [5],
        actors: [6],
      }),
    ).toEqual([
      { entry: 3, owner: 'global/items', kind: 'global' },
      { entry: 4, owner: 'global/skills', kind: 'global' },
      { entry: 5, owner: 'global/enemies', kind: 'global' },
      { entry: 6, owner: 'global/actors', kind: 'global' },
    ])
  })
})
