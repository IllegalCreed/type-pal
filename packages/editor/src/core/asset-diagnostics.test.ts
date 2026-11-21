import {
  collectAssetReferences,
  type LocatedAssetReference,
  validateActors,
  validateAssetCatalog,
  validateAuthorScenes,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { collectEditorAssetDiagnostics, editorAssetCatalogTitle } from './asset-diagnostics.js'
import { collectCanonicalAssetReferenceEntries } from './project-reference-adapters.js'
import { collectCanonicalScriptCommandVisits } from './script-editor.js'

describe('编辑器资源诊断展示', () => {
  test('目录标题对空白标签使用唯一 AssetKind 中文 owner，且不接收 AssetId 回退', () => {
    const cases = [
      ['music', '未命名音乐'],
      ['sound', '未命名音效'],
      ['battle-sprite', '未命名战斗精灵'],
      ['battle-background', '未命名战斗背景'],
      ['portrait', '未命名角色立绘'],
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
    const catalog = validateAssetCatalog({
      version: 1,
      assets: {
        'music.wrong': {
          kind: 'sound',
          path: 'assets/authored/sound/wrong.wav',
          mediaType: 'audio/wav',
          bytes: 1,
          sha256: '1'.repeat(64),
          label: '错误类型资源',
          origin: { kind: 'authored' },
        },
        'sound.unused': {
          kind: 'sound',
          path: 'assets/authored/sound/unused.wav',
          mediaType: 'audio/wav',
          bytes: 1,
          sha256: '2'.repeat(64),
          label: '未使用音效',
          origin: { kind: 'authored' },
        },
      },
    })
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
    expect(diagnostics[1]).toMatchObject({
      assetLabel: '错误类型资源',
      expectedKind: 'music',
      actualKind: 'sound',
      origin: { kind: 'scene', id: 's002', section: 'music' },
    })
    expect(diagnostics.map((issue) => issue.title).join(' ')).not.toMatch(
      /AssetId|unused-asset|assets\[/,
    )
  })

  test('an unlabelled unused sprite still has its kind and id in the title', () => {
    const catalog = validateAssetCatalog({
      version: 1,
      assets: {
        'sprite.idle': {
          kind: 'sprite',
          path: 'assets/authored/sprite/idle.png',
          mediaType: 'image/png',
          bytes: 1,
          sha256: 'a'.repeat(64),
          origin: { kind: 'authored' },
        },
      },
    })
    expect(collectEditorAssetDiagnostics(catalog, [])).toEqual([
      {
        severity: 'warn',
        code: 'unused-asset',
        where: 'assets["sprite.idle"]',
        message: 'AssetId "sprite.idle" 当前未被引用',
        assetId: 'sprite.idle',
        actualKind: 'sprite',
        title: '场景精灵资源 ID “sprite.idle”当前未被使用',
      },
    ])
  })

  test('an actor portrait requires a registered asset, including for constructor', () => {
    const actors = validateActors([
      {
        id: 'a',
        name: 'name.a',
        spriteId: 'sprite.a',
        portraits: { default: 'constructor' },
      },
    ])
    const references = collectAssetReferences({ actors })
    const catalog = validateAssetCatalog({
      version: 1,
      assets: {
        constructor: {
          kind: 'portrait',
          path: 'assets/authored/portrait/a.png',
          mediaType: 'image/png',
          bytes: 1,
          sha256: 'a'.repeat(64),
          origin: { kind: 'authored' },
        },
      },
    })
    expect(collectEditorAssetDiagnostics(catalog, references)).toEqual([])
    expect(collectEditorAssetDiagnostics({ version: 1, assets: {} }, references)).toEqual([
      {
        severity: 'error',
        code: 'missing-asset',
        where: 'actors[0].portraits.default',
        message: 'AssetId "constructor" 不在 catalog',
        assetId: 'constructor',
        expectedKind: 'portrait',
        origin: { kind: 'actor', id: 'a', section: 'portraits' },
        title: '角色立绘资源 ID “constructor”不存在',
      },
    ])
  })

  test('合法但含路径分隔片段的作者 ID 不会让 canonical 资源诊断串 owner', () => {
    const scene = (
      sceneId: string,
      entityId: string,
      kind: 'playMusic' | 'playSound',
      asset: string,
    ) => ({
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
                  stages: [{ id: 'stage', body: [{ kind, asset }] }],
                },
              },
            },
          },
        },
      ],
    })
    const scenes = validateAuthorScenes([
      scene('a', 'b.entities.c', 'playSound', 'missing.one'),
      scene('a.entities.b', 'c', 'playMusic', 'missing.two'),
    ])
    const visits = collectCanonicalScriptCommandVisits({
      scenes,
      items: [],
      sharedScripts: {},
    })
    const references = collectCanonicalAssetReferenceEntries(visits).map((entry) => entry.reference)

    const diagnostics = collectEditorAssetDiagnostics({ version: 1, assets: {} }, references)
    expect(references).toHaveLength(2)
    expect(references[0]?.where).toBe(references[1]?.where)
    expect(
      diagnostics.map(({ code, assetId, expectedKind, origin }) => ({
        code,
        assetId,
        expectedKind,
        origin,
      })),
    ).toEqual([
      {
        code: 'missing-asset',
        assetId: 'missing.one',
        expectedKind: 'sound',
        origin: { kind: 'scene', id: 'a', section: 'entities' },
      },
      {
        code: 'missing-asset',
        assetId: 'missing.two',
        expectedKind: 'music',
        origin: { kind: 'scene', id: 'a.entities.b', section: 'entities' },
      },
    ])
  })
})
