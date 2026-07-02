import { describe, expect, test } from 'vitest'
import { deriveStepCycle, idleFrameIndex, walkFrameIndex } from './sprite-anim.js'
import type { SpriteLayout } from '@type-pal/content'

const d3: SpriteLayout = { kind: 'directional', framesPerDir: 3 }
const d4: SpriteLayout = { kind: 'directional', framesPerDir: 4 }

describe('sprite-anim(帧布局数据化;语义 = 原版通式 dir*framesPerDir+frame)', () => {
  test('deriveStepCycle:3→[0,1,0,2](站/迈左/站/迈右);4→[0,1,2,3]', () => {
    expect(deriveStepCycle(3)).toEqual([0, 1, 0, 2])
    expect(deriveStepCycle(4)).toEqual([0, 1, 2, 3])
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
})
