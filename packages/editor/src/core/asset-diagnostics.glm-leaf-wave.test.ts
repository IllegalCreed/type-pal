import type { AssetCatalogV1, AssetRecordV1, LocatedAssetReference } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { concat, fourCc, u32Be } from './__tests__/glm-import-codec-fixtures.js'
import {
  collectEditorAssetDiagnostics,
  EDITOR_ASSET_KIND_LABELS,
  editorAssetCatalogTitle,
} from './asset-diagnostics.js'
import { mp4HasAudioTrack } from './video-metadata.js'

function record(kind: AssetRecordV1['kind'], id: string, label?: string): AssetRecordV1 {
  return {
    kind,
    path: `assets/runtime/${id}.bin`,
    mediaType: 'application/octet-stream',
    bytes: 4,
    sha256: `sha-${id}`,
    ...(label ? { label } : {}),
    origin: { kind: 'authored' },
  }
}

function reference(
  asset: string,
  expectedKind: AssetRecordV1['kind'],
  where: string,
): LocatedAssetReference {
  return {
    asset,
    expectedKind,
    where,
    site: `site:${where}`,
    origin: { kind: 'scene', id: 's001', section: 'music' },
  }
}

describe('EDITOR_ASSET_KIND_LABELS / editorAssetCatalogTitle 剩余合同', () => {
  test('kind label table covers every entry and title resolution prefers label then fallback', () => {
    expect(Object.keys(EDITOR_ASSET_KIND_LABELS)).toContain('frame-animation')
    expect(EDITOR_ASSET_KIND_LABELS['battle-background']).toBe('战斗背景')

    expect(editorAssetCatalogTitle({ kind: 'music', label: '主题曲 ' })).toBe('主题曲')
    expect(editorAssetCatalogTitle({ kind: 'sound', label: '  ' }, '备用名')).toBe('备用名')
    expect(editorAssetCatalogTitle({ kind: 'portrait', label: undefined })).toBe('未命名角色立绘')
    expect(editorAssetCatalogTitle({ kind: 'frame-animation', label: '' })).toBe('未命名帧动画')
  })
})

describe('collectEditorAssetDiagnostics 剩余合同', () => {
  test('unused assets attach identity via the catalog where-map without references', () => {
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: {
        'sound.idle': record('sound', 'sound.idle', '闲置音效'),
        'sprite.idle': record('sprite', 'sprite.idle'),
      },
    }
    const diagnostics = collectEditorAssetDiagnostics(catalog, [])
    const byId = new Map(diagnostics.map((entry) => [entry.assetId, entry]))
    const soundIdle = byId.get('sound.idle')
    const spriteIdle = byId.get('sprite.idle')
    expect(soundIdle?.title).toBe('闲置音效（ID：sound.idle）当前未被使用')
    expect(spriteIdle?.title).toBe('场景精灵资源 ID “sprite.idle”当前未被使用')
    expect(spriteIdle?.code).toBe('unused-asset')
  })

  test('kind mismatch reports expected vs actual kinds with reference origin attached', () => {
    const catalog: AssetCatalogV1 = {
      version: 1,
      assets: { 'music.swapped': record('sound', 'music.swapped', '被占用的音效') },
    }
    const diagnostics = collectEditorAssetDiagnostics(catalog, [
      reference('music.swapped', 'music', 'scenes[3].music'),
    ])
    expect(diagnostics).toHaveLength(1)
    const mismatch = diagnostics[0]!
    expect(mismatch).toMatchObject({
      code: 'kind-mismatch',
      assetId: 'music.swapped',
      assetLabel: '被占用的音效',
      expectedKind: 'music',
      actualKind: 'sound',
      origin: { kind: 'scene', id: 's001', section: 'music' },
    })
    expect(mismatch.title).toBe('被占用的音效（ID：music.swapped）的类型应为“音乐”，实际为“音效”')
  })

  test('missing references without a catalog record fall back to the expected-kind noun', () => {
    const diagnostics = collectEditorAssetDiagnostics({ version: 1, assets: {} }, [
      reference('portrait.gone', 'portrait', 'actors[0].portrait'),
    ])
    const missing = diagnostics[0]!
    expect(missing).toMatchObject({
      code: 'missing-asset',
      assetId: 'portrait.gone',
      expectedKind: 'portrait',
    })
    expect(missing.title).toBe('角色立绘资源 ID “portrait.gone”不存在')
  })
})

function box(type: string, content: Uint8Array): Uint8Array {
  const head = new Uint8Array(8)
  const view = new DataView(head.buffer)
  view.setUint32(0, content.byteLength + 8)
  for (let index = 0; index < 4; index += 1) head[4 + index] = type.charCodeAt(index)
  return concat([head, content])
}

function trackWithHandler(handler: string): Uint8Array {
  const hdlr = box('hdlr', concat([u32Be(0), fourCc('vide'), fourCc(handler), new Uint8Array(12)]))
  return concat([box('ftyp', fourCc('isom')), box('moov', box('trak', hdlr))])
}

describe('mp4HasAudioTrack 剩余合同', () => {
  test('nested container chains and the meta +4 offset still reach soun handlers', () => {
    // meta 容器内 4 字节 version/flags 后接 hdlr soun。
    const withMeta = concat([
      box('ftyp', fourCc('isom')),
      box(
        'moov',
        box(
          'udta',
          box(
            'meta',
            concat([
              new Uint8Array(4),
              box('hdlr', concat([u32Be(0), fourCc('vide'), fourCc('soun'), new Uint8Array(12)])),
            ]),
          ),
        ),
      ),
    ])
    expect(mp4HasAudioTrack(withMeta)).toBe(true)
  })

  test('an unknown top-level box type terminates scanning without audio', () => {
    const unknownFirst = concat([
      box('ftyp', fourCc('isom')),
      box('free', new Uint8Array(8)),
      trackWithHandler('soun'),
    ])
    expect(mp4HasAudioTrack(unknownFirst)).toBe(true)

    const zeroSizeTail = concat([
      box('ftyp', fourCc('isom')),
      (() => {
        const head = new Uint8Array(8)
        const view = new DataView(head.buffer)
        view.setUint32(0, 0)
        for (let index = 0; index < 4; index += 1) head[4 + index] = 'moov'.charCodeAt(index)
        return concat([
          head,
          box(
            'trak',
            box('hdlr', concat([u32Be(0), fourCc('vide'), fourCc('soun'), new Uint8Array(12)])),
          ),
        ])
      })(),
    ])
    expect(mp4HasAudioTrack(zeroSizeTail)).toBe(true)
  })

  test('hdlr with soun in both prefix and handler only counts the handler slot', () => {
    // handler 域为 vide，但前置 pre-defined 字节恰好是 soun → 仍不算音轨。
    const tricky = box(
      'hdlr',
      concat([u32Be(0), fourCc('soun'), fourCc('vide'), new Uint8Array(12)]),
    )
    expect(
      mp4HasAudioTrack(concat([box('ftyp', fourCc('isom')), box('moov', box('trak', tricky))])),
    ).toBe(false)
  })
})
