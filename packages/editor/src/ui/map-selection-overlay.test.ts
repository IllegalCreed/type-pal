import { describe, expect, test } from 'vitest'
import { mapSelectionBoundarySegments } from './map-selection-overlay.js'

function edgeKeys(points: readonly { row: number; col: number }[]): string[] {
  return mapSelectionBoundarySegments(points)
    .map(({ from, to }) => {
      const ends = [`${from.x}:${from.y}`, `${to.x}:${to.y}`].sort()
      return ends.join('|')
    })
    .sort()
}

describe('map selection union boundary', () => {
  test('单格保留完整菱形轮廓', () => {
    expect(edgeKeys([{ row: 0, col: 0 }])).toEqual([
      '-16:0|0:-8',
      '-16:0|0:8',
      '0:-8|16:0',
      '0:8|16:0',
    ])
  })

  test('相邻格抵消共享边，不再逐格描边', () => {
    const edges = edgeKeys([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ])
    expect(edges).toHaveLength(6)
    expect(edges).not.toContain('0:8|16:0')
  })

  test('不连续格各自保留外轮廓，重复坐标不重复描边', () => {
    expect(
      edgeKeys([
        { row: 0, col: 0 },
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]),
    ).toHaveLength(8)
  })
})
