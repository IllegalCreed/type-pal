import {
  type AssetCatalogV1,
  type LocatedAssetReference,
  validateAuthorScenes,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { collectEditorAssetDiagnostics, editorAssetCatalogTitle } from './asset-diagnostics.js'
import { collectCanonicalAssetReferenceEntries } from './project-reference-adapters.js'
import { collectCanonicalScriptCommandVisits, type ScriptEditorState } from './script-editor.js'

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
    expect(editorAssetCatalogTitle({ kind: 'sprite', label: '   ' }, '  赵灵儿  ')).toBe('赵灵儿')
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
    const references: LocatedAssetReference[] = [
      {
        asset: 'music.missing',
        expectedKind: 'music',
        where: 'scenes[0].music',
        site: 'scene:s001:music',
        origin: { kind: 'scene', id: 's001', section: 'music' },
      },
      {
        asset: 'music.wrong',
        expectedKind: 'music',
        where: 'scenes[1].music',
        site: 'scene:s002:music',
        origin: { kind: 'scene', id: 's002', section: 'music' },
      },
    ]

    const diagnostics = collectEditorAssetDiagnostics(catalog, references)

    expect(
      diagnostics.map(({ code, where, assetId, title }) => ({ code, where, assetId, title })),
    ).toEqual([
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

  test('相同显示路径的多条失败引用仍按验证顺序保留各自 owner', () => {
    const references: LocatedAssetReference[] = [
      {
        asset: 'missing.one',
        expectedKind: 'sound',
        where: 'scenes.a.entities.b.entities.c.behaviors.auto.id.flow.stages.stage.body[0].asset',
        site: 'canonical:first',
        origin: { kind: 'scene', id: 'a', section: 'entities' },
      },
      {
        asset: 'missing.two',
        expectedKind: 'music',
        where: 'scenes.a.entities.b.entities.c.behaviors.auto.id.flow.stages.stage.body[0].asset',
        site: 'canonical:second',
        origin: { kind: 'scene', id: 'a.entities.b', section: 'entities' },
      },
    ]

    const diagnostics = collectEditorAssetDiagnostics({ version: 1, assets: {} }, references)
    expect(
      diagnostics.map(({ assetId, expectedKind, origin }) => ({ assetId, expectedKind, origin })),
    ).toEqual([
      {
        assetId: 'missing.one',
        expectedKind: 'sound',
        origin: { kind: 'scene', id: 'a', section: 'entities' },
      },
      {
        assetId: 'missing.two',
        expectedKind: 'music',
        origin: { kind: 'scene', id: 'a.entities.b', section: 'entities' },
      },
    ])
  })

  test('合法但含路径分隔片段的作者 ID 不会让 canonical 资源诊断串 owner', () => {
    const scene = (sceneId: string, entityId: string, asset: string) => ({
      id: sceneId,
      mapId: `map.${sceneId}`,
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' as const },
      entities: [
        {
          id: entityId,
          zone: true,
          pos: { col: 0, row: 0, height: 0 },
          behaviors: {
            auto: {
              id: {
                label: '自动行为',
                order: 0,
                flow: {
                  kind: 'stages' as const,
                  initial: 'stage',
                  stages: [{ id: 'stage', body: [{ kind: 'playSound' as const, asset }] }],
                },
              },
            },
          },
        },
      ],
    })
    const scenes = validateAuthorScenes([
      scene('a', 'b.entities.c', 'missing.one'),
      scene('a.entities.b', 'c', 'missing.two'),
    ])
    const visits = collectCanonicalScriptCommandVisits({
      scenes,
      items: [],
      sharedScripts: {},
    } as ScriptEditorState)
    const references = collectCanonicalAssetReferenceEntries(visits).map((entry) => entry.reference)

    const diagnostics = collectEditorAssetDiagnostics({ version: 1, assets: {} }, references)
    expect(diagnostics.map(({ assetId, origin }) => ({ assetId, origin }))).toEqual([
      {
        assetId: 'missing.one',
        origin: { kind: 'scene', id: 'a', section: 'entities' },
      },
      {
        assetId: 'missing.two',
        origin: { kind: 'scene', id: 'a.entities.b', section: 'entities' },
      },
    ])
  })
})
