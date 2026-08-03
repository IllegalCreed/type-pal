import type { Command } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { foldDoorPattern } from './translate-events.js'

describe('R13-6B loadScene source transition', () => {
  test('相邻源 fade 与地址齐全时折叠为 source profile，并删除迁移私有地址', () => {
    const body = [
      {
        kind: 'loadScene',
        scene: 's002',
        __palSourceAddress: 12_345,
      },
      { kind: 'teleportParty', pos: { col: 3, row: 4, height: 0 }, facing: 'left' },
      { kind: 'fade', dir: 'out', ms: 1200 },
    ] as unknown as Command[]
    expect(foldDoorPattern(body)).toEqual([
      {
        kind: 'loadScene',
        scene: 's002',
        pos: { col: 3, row: 4, height: 0 },
        facing: 'left',
        transition: {
          kind: 'source',
          outMs: 1200,
          inMs: 600,
          color: 'black',
          evidenceId: 'pal-load-scene-12345',
        },
      },
    ])
  })

  test('缺源 fade 或缺源地址时保持 modern 默认，不伪造 source profile', () => {
    const noFade = [
      { kind: 'loadScene', scene: 's002', __palSourceAddress: 12_345 },
    ] as unknown as Command[]
    expect(foldDoorPattern(noFade)).toEqual([{ kind: 'loadScene', scene: 's002' }])

    const noAddress: Command[] = [
      { kind: 'loadScene', scene: 's002' },
      { kind: 'fade', dir: 'out', ms: 600 },
    ]
    expect(foldDoorPattern(noAddress)).toEqual([{ kind: 'loadScene', scene: 's002' }])
  })
})
