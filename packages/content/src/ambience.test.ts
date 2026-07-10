import { describe, expect, test } from 'vitest'
import {
  AMBIENCE_IDENTITY,
  type AmbienceDef,
  isIdentityTint,
  lerpTint,
  resolveAmbienceTint,
} from './ambience.js'

const DEFS: AmbienceDef[] = [
  { id: 'day', name: '白天', tint: [255, 255, 255] },
  { id: 'night', name: '夜晚', tint: [117, 229, 255] }, // 原版夜盘拟合(R×0.458/G×0.899/B×1.0)
]

describe('resolveAmbienceTint(氛围 id → 乘色)', () => {
  test('night → 拟合夜色;day → 恒等', () => {
    expect(resolveAmbienceTint('night', DEFS)).toEqual([117, 229, 255])
    expect(resolveAmbienceTint('day', DEFS)).toEqual([255, 255, 255])
  })
  test('缺 id / 未知 id / 空表 → 恒等兜底(工程没带氛围表时零影响)', () => {
    expect(resolveAmbienceTint(undefined, DEFS)).toEqual(AMBIENCE_IDENTITY)
    expect(resolveAmbienceTint('bloodmoon', DEFS)).toEqual(AMBIENCE_IDENTITY)
    expect(resolveAmbienceTint('night', [])).toEqual(AMBIENCE_IDENTITY)
  })
  test('工程可覆写 day(自定义白天色调)', () => {
    const warm: AmbienceDef[] = [{ id: 'day', name: '暖阳', tint: [255, 244, 230] }]
    expect(resolveAmbienceTint('day', warm)).toEqual([255, 244, 230])
    expect(resolveAmbienceTint(undefined, warm)).toEqual(AMBIENCE_IDENTITY) // 缺省仍恒等
  })
})

describe('isIdentityTint / lerpTint', () => {
  test('恒等判定:全通道 ≥254 视为不染(免全屏合成)', () => {
    expect(isIdentityTint([255, 255, 255])).toBe(true)
    expect(isIdentityTint([254, 254, 255])).toBe(true)
    expect(isIdentityTint([117, 229, 255])).toBe(false)
  })
  test('lerp:t=0 起点 / t=1 终点 / 中点四舍五入 / 越界夹取', () => {
    expect(lerpTint([255, 255, 255], [117, 229, 255], 0)).toEqual([255, 255, 255])
    expect(lerpTint([255, 255, 255], [117, 229, 255], 1)).toEqual([117, 229, 255])
    expect(lerpTint([255, 255, 255], [117, 229, 255], 0.5)).toEqual([186, 242, 255])
    expect(lerpTint([255, 255, 255], [117, 229, 255], 2)).toEqual([117, 229, 255])
    expect(lerpTint([255, 255, 255], [117, 229, 255], -1)).toEqual([255, 255, 255])
  })
})
