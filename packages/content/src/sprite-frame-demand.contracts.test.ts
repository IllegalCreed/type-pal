/**
 * TEST-CONTENT-CONTRACTS-1 D1/D2：sprite 定义帧需求纯计算（sprite.ts:83-113）。
 * 需求量=声明覆盖量，不是实际资源帧数（合同）；static/directional/loop 与 poses 叠加、
 * 完整索引集合、最大索引+1、不改原输入。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import type { SpriteDef } from './sprite.js'
import { spriteDefinitionFrameDemand, spriteDefinitionFrameIndices } from './sprite.js'

const sprite = (layout: SpriteDef['layout'], poses?: SpriteDef['poses']): SpriteDef =>
  ({
    id: 's',
    asset: 'sprite.x',
    layout,
    ...(poses === undefined ? {} : { poses }),
  }) as SpriteDef

describe('D1 spriteDefinitionFrameDemand · 布局与 poses 叠加', () => {
  test('static=1；directional=framesPerDir×4；loop=frameCount', () => {
    expect(spriteDefinitionFrameDemand(sprite({ kind: 'static' }))).toBe(1)
    expect(spriteDefinitionFrameDemand(sprite({ kind: 'directional', framesPerDir: 3 }))).toBe(12)
    expect(spriteDefinitionFrameDemand(sprite({ kind: 'loop', frameCount: 7 }))).toBe(7)
  })
  test('poses 高帧号叠加取最大；需求量不是实际帧数（合同）', () => {
    const withPoses = sprite(
      { kind: 'static' },
      {
        walk: { label: '走', steps: [{ frame: 5, durationMs: 100 }] },
        jump: { label: '跳', steps: [{ frame: 9, durationMs: 100 }] },
      },
    )
    expect(spriteDefinitionFrameDemand(withPoses)).toBe(10) // max(1, 9+1)
    expect(
      spriteDefinitionFrameDemand(
        sprite(
          { kind: 'loop', frameCount: 3 },
          {
            act: { label: 'A', steps: [{ frame: 1, durationMs: 50 }] },
          },
        ),
      ),
    ).toBe(3) // 布局 3 > pose 2
  })
  test('Indices 完整集合：布局区间 ∪ pose 帧；去重', () => {
    const indices = spriteDefinitionFrameIndices(
      sprite(
        { kind: 'directional', framesPerDir: 1 },
        {
          walk: { label: '走', steps: [{ frame: 4, durationMs: 100 }] },
        },
      ),
    )
    expect([...indices].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]) // 4 向 + pose 帧 4
    const dedup = spriteDefinitionFrameIndices(
      sprite(
        { kind: 'loop', frameCount: 2 },
        {
          a: {
            label: 'A',
            steps: [
              { frame: 1, durationMs: 1 },
              { frame: 0, durationMs: 1 },
            ],
          },
        },
      ),
    )
    expect([...dedup].sort((a, b) => a - b)).toEqual([0, 1]) // 重复帧号不重复计数
  })
  test('不改原输入（深快照不变）', () => {
    const value = sprite(
      { kind: 'directional', framesPerDir: 2 },
      {
        walk: { label: '走', steps: [{ frame: 11, durationMs: 100 }] },
      },
    )
    const before = deepSnapshot(value)
    spriteDefinitionFrameDemand(value)
    spriteDefinitionFrameIndices(value)
    expect(value).toEqual(before)
  })
})
