/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R25（reforge/project-map.ts 窄入口）。
 * 去重账：project-map.test/cursor-boundaries 已覆盖 build/flood/resize/insert/stamp 等大轴。
 * 本文件只做未占用合同：nextProjectMapLayerId 最小空位序（含空洞跳补）。
 */
import { describe, expect, test } from 'vitest'
import { buildBlankProjectMap, nextProjectMapLayerId } from './project-map.js'

describe('R25 nextProjectMapLayerId', () => {
  test('仅 floor 层 → layer-1；已有 layer-1/2 → layer-3', () => {
    const map = buildBlankProjectMap(2, 2, 'ts-a')
    expect(map.layers.map((l) => l.id)).toEqual(['floor'])
    expect(nextProjectMapLayerId(map)).toBe('layer-1')
    const full = structuredClone(map)
    full.layers[0]!.id = 'layer-1'
    full.layers.push({ ...structuredClone(map.layers[0]!), id: 'layer-2' })
    expect(nextProjectMapLayerId(full)).toBe('layer-3')
  })

  test('id 序列有空洞（layer-2 缺席，layer-1 已占）→ 回填最小空位 layer-2', () => {
    const map = buildBlankProjectMap(1, 1, 'ts-a')
    map.layers[0]!.id = 'layer-1'
    map.layers.push({ ...structuredClone(map.layers[0]!), id: 'layer-3' })
    expect(nextProjectMapLayerId(map)).toBe('layer-2') // 空洞回填
  })
})
