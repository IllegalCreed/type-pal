import type { AssetCatalogV1, AssetReference } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  collectEditorAssetDiagnostics,
  editorAssetCatalogTitle,
} from './asset-diagnostics.js'

describe('编辑器资源诊断展示', () => {
  test('目录标题对空白标签使用唯一 AssetKind 中文 owner，且不接收 AssetId 回退', () => {
    const cases = [
      ['music', '未命名音乐'],
      ['sound', '未命名音效'],
      ['battle-sprite', '未命名战斗精灵'],
      ['video', '未命名视频'],
      ['frame-animation', '未命名帧动画'],
      ['face', '未命名战斗头像'],
      ['sprite', '未命名场景精灵'],
    ] as const
    for (const [kind, expected] of cases) {
      expect(editorAssetCatalogTitle({ kind })).toBe(expected)
      expect(editorAssetCatalogTitle({ kind, label: '   ' })).toBe(expected)
    }
    expect(editorAssetCatalogTitle({ kind: 'music', label: '  片尾曲  ' })).toBe('片尾曲')
    expect(editorAssetCatalogTitle({ kind: 'sprite', label: '   ' }, '  赵灵儿  ')).toBe(
      '赵灵儿',
    )
  })

  test('保留机器 code/where，并用结构化资源字段生成不重复的中文标题', () => {
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: {
        'music.wrong': {
          kind: 'sound',
          path: 'assets/sound/wrong.wav',
          mediaType: 'audio/wav',
          bytes: 1,
          sha256: '1'.repeat(64),
          label: '错误类型资源',
          origin: { kind: 'authored' },
        },
        'sound.unused': {
          kind: 'sound',
          path: 'assets/sound/unused.wav',
          mediaType: 'audio/wav',
          bytes: 1,
          sha256: '2'.repeat(64),
          label: '未使用音效',
          origin: { kind: 'authored' },
        },
      },
    }
    const references: AssetReference[] = [
      {
        asset: 'music.missing',
        expectedKind: 'music',
        where: 'scenes[0].music',
        site: 'scene:s001:music',
      },
      {
        asset: 'music.wrong',
        expectedKind: 'music',
        where: 'scenes[1].music',
        site: 'scene:s002:music',
      },
    ]

    const diagnostics = collectEditorAssetDiagnostics(catalog, references)

    expect(diagnostics.map(({ code, where, assetId, title }) => ({ code, where, assetId, title })))
      .toEqual([
        {
          code: 'missing-asset',
          where: 'scenes[0].music',
          assetId: 'music.missing',
          title: '音乐资源 ID “music.missing”不存在',
        },
        {
          code: 'kind-mismatch',
          where: 'scenes[1].music',
          assetId: 'music.wrong',
          title: '错误类型资源（ID：music.wrong）的类型应为“音乐”，实际为“音效”',
        },
        {
          code: 'unused-asset',
          where: 'assets["sound.unused"]',
          assetId: 'sound.unused',
          title: '未使用音效（ID：sound.unused）当前未被使用',
        },
      ])
    expect(diagnostics.map((issue) => issue.title).join(' ')).not.toMatch(
      /AssetId|unused-asset|assets\[/,
    )
  })
})
