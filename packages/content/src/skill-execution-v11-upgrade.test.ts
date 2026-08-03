import { describe, expect, test } from 'vitest'
import { upgradeManifestV10ToV11 } from './skill-execution-v11-upgrade.js'

describe('contentVersion 10 -> 11 R13-6B', () => {
  const manifest = {
    id: 'p',
    name: 'p',
    contentVersion: 10,
    entryScene: 's',
    content: {},
    assets: {},
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    minimumSaveVersion: 8,
  }
  test('只升内容版本，SAVE 版本保持 8', () => {
    const upgraded = upgradeManifestV10ToV11(manifest)
    expect(upgraded).toEqual({ ...manifest, contentVersion: 11, minimumSaveVersion: 8 })
    expect(manifest.contentVersion).toBe(10)
  })
  test('拒绝错误输入或 SAVE 门槛', () => {
    expect(() => upgradeManifestV10ToV11({ ...manifest, contentVersion: 11 })).toThrow(
      /contentVersion 10/,
    )
    expect(() => upgradeManifestV10ToV11({ ...manifest, minimumSaveVersion: 7 })).toThrow(
      /minimumSaveVersion/,
    )
  })
})
