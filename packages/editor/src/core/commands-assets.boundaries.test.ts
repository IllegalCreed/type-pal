/**
 * TEST-EDITOR-LOGIC-COVERAGE-1 A6：资源标签/本地化数据更新命令边界（commands.ts:2617-2807）。
 * 既有 asset-reference-commands.test.ts 已覆盖资源引用主体；本文件补：
 * UpdateLocale 同值 no-op/缺键行为、UpdateAssetLabel/不存在的目标与 invert 恢复。
 */
import { describe, expect, test } from 'vitest'
import { baseState, deepSnapshot } from './__tests__/glm-editor-logic-fixtures.js'
import { UpdateAssetLabelCommand, UpdateLocaleCommand } from './commands.js'
import type { EditorState } from './edit-session.js'

function state(): EditorState {
  return baseState({
    locale: { 'name.hero': '李逍遥', 'name.other': '其他人' },
    assetCatalog: {
      version: 1,
      assets: {
        'sprite.hero': {
          kind: 'sprite',
          path: 'assets/sprites/hero.png',
          mediaType: 'image/png',
          bytes: 3,
          sha256: 'a'.repeat(64),
          origin: { kind: 'generated' },
          label: '主角精灵',
        } as EditorState['assetCatalog']['assets'][string],
      },
    },
  })
}

describe('UpdateLocaleCommand · 边界', () => {
  test('更新既有键可 invert；同值内容不变；新键新增后 invert 移除（现行合同）', () => {
    const s0 = state()
    const command = new UpdateLocaleCommand('name.hero', '逍遥')
    const s1 = command.apply(s0)
    expect(s1.locale['name.hero']).toBe('逍遥')
    expect(s1.locale['name.other']).toBe('其他人') // 未触键
    const s2 = command.invert(s1)
    expect(s2.locale['name.hero']).toBe('李逍遥')
    // 同值：内容不变（apply 建新对象但 locale 内容与原一致）
    const same = new UpdateLocaleCommand('name.other', '其他人').apply(s0)
    expect(same.locale).toEqual(s0.locale)
    // 新键新增后 invert 移除（had=false 分支）
    const added = new UpdateLocaleCommand('name.new', '新键')
    const s3 = added.apply(s0)
    expect(s3.locale['name.new']).toBe('新键')
    const s4 = added.invert(s3)
    expect(s4.locale).not.toHaveProperty('name.new')
    expect(s4.locale['name.hero']).toBe('李逍遥') // 其它键保持
  })
})

describe('UpdateAssetLabelCommand · 边界', () => {
  test('更新存在资产标签并 invert；缺目标与同名 no-op（现行合同）', () => {
    const s0 = state()
    const before = deepSnapshot(s0)
    expect(() => new UpdateAssetLabelCommand('sprite.ghost', '新标签').apply(s0)).not.toThrow()
    expect(new UpdateAssetLabelCommand('sprite.ghost', '新标签').apply(s0)).toBe(s0)
    const same = new UpdateAssetLabelCommand('sprite.hero', '主角精灵').apply(s0)
    expect(same.assetCatalog.assets['sprite.hero']!.label).toBe('主角精灵') // 同值：内容不变（apply 仍建新对象）
    const command = new UpdateAssetLabelCommand('sprite.hero', '新标签')
    const s1 = command.apply(s0)
    expect(s1.assetCatalog.assets['sprite.hero']!.label).toBe('新标签')
    const s2 = command.invert(s1)
    expect(s2.assetCatalog.assets['sprite.hero']!.label).toBe('主角精灵')
    expect(s2.locale).toEqual(before.locale) // 未触域
  })
})
