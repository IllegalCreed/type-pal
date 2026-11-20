import type { SpriteLayout } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  actualFrameIndex,
  animFrameIndex,
  deriveStepCycle,
  idleFrameIndex,
  loopFrameIndex,
  settleWalkAnimation,
  walkFrameIndex,
} from './sprite-anim.js'

const d3: SpriteLayout = { kind: 'directional', framesPerDir: 3 }
const d4: SpriteLayout = { kind: 'directional', framesPerDir: 4 }

describe('方向帧与手动动画帧', () => {
  test('deriveStepCycle:3→[0,1,0,2](站/迈左/站/迈右);4→[0,1,2,3]', () => {
    expect(deriveStepCycle(3)).toEqual([0, 1, 0, 2])
    expect(deriveStepCycle(4)).toEqual([0, 1, 2, 3])
  })
  test('settleWalkAnimation:剧情接管后切站立并按原版归整相位', () => {
    expect(
      [0, 1, 2, 3].map((stepFrame) => settleWalkAnimation({ walking: true, stepFrame })),
    ).toEqual([
      { walking: false, stepFrame: 2 },
      { walking: false, stepFrame: 2 },
      { walking: false, stepFrame: 0 },
      { walking: false, stepFrame: 0 },
    ])
  })
  test('idleFrameIndex:directional 按 dir*framesPerDir;static/loop 恒 0', () => {
    expect(idleFrameIndex(d3, 'down')).toBe(0)
    expect(idleFrameIndex(d3, 'left')).toBe(3)
    expect(idleFrameIndex(d3, 'up')).toBe(6)
    expect(idleFrameIndex(d3, 'right')).toBe(9)
    expect(idleFrameIndex(d4, 'left')).toBe(4)
    expect(idleFrameIndex({ kind: 'static' }, 'up')).toBe(0)
    expect(idleFrameIndex({ kind: 'loop', frameCount: 24 }, 'left')).toBe(0)
  })
  test('walkFrameIndex:3 帧步序逐拍 = 与旧 WALK_FRAMES/STEP_CYCLE 硬编码等值', () => {
    // 旧实现:dir*3 + STEP_CYCLE[stepFrame],STEP_CYCLE=[0,1,0,2]
    expect(walkFrameIndex(d3, 'down', 0)).toBe(0)
    expect(walkFrameIndex(d3, 'down', 1)).toBe(1)
    expect(walkFrameIndex(d3, 'down', 2)).toBe(0)
    expect(walkFrameIndex(d3, 'down', 3)).toBe(2)
    expect(walkFrameIndex(d3, 'right', 3)).toBe(9 + 2)
    expect(walkFrameIndex(d3, 'down', 4)).toBe(0) // step 溢出取模
  })
  test('walkFrameIndex:4 帧原始步序;非 directional 同站立', () => {
    expect(walkFrameIndex(d4, 'down', 3)).toBe(3)
    expect(walkFrameIndex({ kind: 'static' }, 'down', 3)).toBe(0)
  })
  test('实际解码帧数收口历史 layout 债，任何越界候选统一回首帧', () => {
    expect(actualFrameIndex(7, 7)).toBe(0)
    expect(actualFrameIndex(-1, 7)).toBe(0)
    expect(idleFrameIndex(d3, 'right', 9)).toBe(0)
    expect(walkFrameIndex(d3, 'right', 3, 10)).toBe(0)
    expect(animFrameIndex(d3, 'up', 1, 5)).toBe(0)
    expect(idleFrameIndex(d3, 'left', 12)).toBe(3)
  })

  test('walking preserves an available frame and falls back for oversized directional layouts', () => {
    const layout: SpriteLayout = { kind: 'directional', framesPerDir: 2 ** 32 }
    expect(walkFrameIndex(layout, 'down', 1, 2)).toBe(1)
    expect(walkFrameIndex(layout, 'right', 1, 2)).toBe(0)
  })

  test.each([1, 2, 4, 5, 7])('已解码 %i 帧时，任一方向和步相都返回可用下标', (frames) => {
    const valid = Array.from({ length: frames }, (_, index) => index)
    for (const facing of ['down', 'left', 'up', 'right'] as const) {
      expect(valid).toContain(idleFrameIndex(d3, facing, frames))
      for (let phase = 0; phase < 8; phase++) {
        expect(valid).toContain(walkFrameIndex(d3, facing, phase, frames))
        expect(valid).toContain(animFrameIndex(d3, facing, phase, frames))
      }
    }
  })

  test('无方向的手动帧沿实际帧带循环，负步相取尾帧', () => {
    expect(animFrameIndex({ kind: 'static' }, 'left', 5, 3)).toBe(2)
    expect(animFrameIndex({ kind: 'static' }, 'up', -1, 3)).toBe(2)
  })
})

describe('环境循环帧', () => {
  const loop4: SpriteLayout = { kind: 'loop', frameCount: 4 }
  test('按壁钟 250ms/帧循环 0..n-1', () => {
    expect(loopFrameIndex(loop4, 0)).toBe(0)
    expect(loopFrameIndex(loop4, 260)).toBe(1)
    expect(loopFrameIndex(loop4, 750)).toBe(3)
    expect(loopFrameIndex(loop4, 1000)).toBe(0) // 回卷
  })
  test('非 loop 布局恒 0;frameCount 0 防除零', () => {
    expect(loopFrameIndex({ kind: 'static' }, 5000)).toBe(0)
    expect(loopFrameIndex({ kind: 'loop', frameCount: 0 }, 5000)).toBe(0)
  })
  test('声明循环帧数大于实际帧数时只在实际帧内循环', () => {
    expect(loopFrameIndex({ kind: 'loop', frameCount: 20 }, 750, 2)).toBe(1)
    expect(loopFrameIndex({ kind: 'loop', frameCount: 20 }, 1000, 2)).toBe(0)
  })
})
