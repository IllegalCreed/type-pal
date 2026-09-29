/** TEST-GLM-NEW-J-1 J05：sound-migration 旧 PAL 音效号迁移边界的直接合同。
 * 旧证：resolveSoundAsset 只经 mapScenesStatic 0x47 间接被消费
 * （migrate-conversion-isolation.test.ts），`palOptionalSoundAssetId` 全仓零测试。
 * 本文件钉两个公开函数的全部臂：非法号缺省反馈、缺省解析、注入 resolver 胜出。
 * resolver 用 vi.fn 观察真实调用（注入依赖，非被测核心 mock）。纯函数。
 */
import { describe, expect, test, vi } from 'vitest'
import { palOptionalSoundAssetId, resolveSoundAsset } from './sound-migration.js'

describe('palOptionalSoundAssetId：0 或空 chunk 的显式 undefined 边界', () => {
  test('正整数映射 palSoundAssetId；undefined/非整数/≤0 一律 undefined', () => {
    expect(palOptionalSoundAssetId(1)).toBe('sound.pal.001')
    expect(palOptionalSoundAssetId(505)).toBe('sound.pal.505')
    expect(palOptionalSoundAssetId(undefined)).toBeUndefined()
    expect(palOptionalSoundAssetId(0)).toBeUndefined()
    expect(palOptionalSoundAssetId(-3)).toBeUndefined()
    expect(palOptionalSoundAssetId(2.5)).toBeUndefined()
    expect(palOptionalSoundAssetId(Number.NaN)).toBeUndefined()
  })
})

describe('resolveSoundAsset：缺省解析与显式注入 resolver', () => {
  test('无 resolver 走 palSoundAssetId 缺省；非法号不调用注入 resolver', () => {
    const resolver = vi.fn((sound: number) => `sound.lab.${String(sound).padStart(3, '0')}`)
    expect(resolveSoundAsset(undefined, resolver)).toBeUndefined()
    expect(resolveSoundAsset(0, resolver)).toBeUndefined()
    expect(resolveSoundAsset(-7, resolver)).toBeUndefined()
    expect(resolver).not.toHaveBeenCalled()
    expect(resolveSoundAsset(5)).toBe('sound.pal.005')
  })

  test('注入 resolver 以原始音效号被真实调用，其结果（含 undefined）胜出', () => {
    const resolver = vi.fn((sound: number) => (sound === 7 ? undefined : 'sound.lab.override'))
    expect(resolveSoundAsset(9, resolver)).toBe('sound.lab.override')
    expect(resolver).toHaveBeenCalledWith(9)
    expect(resolveSoundAsset(7, resolver)).toBeUndefined()
    expect(resolver).toHaveBeenCalledWith(7)
  })
})
