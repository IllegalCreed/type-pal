import { type AssetKind, validateAssetCatalog } from '@type-pal/content'
import { expect, test } from 'vitest'
import { originalPortrait, pngBytes } from '../core/__tests__/portrait-bytes.js'
import { sha256Hex } from '../core/binary-signature.js'
import { STATIC_IMAGE_KINDS } from '../core/static-image.js'
import { imageAssetLabel, imageAssets } from './ImageAssetPicker.js'

test('the static catalog exposes the four image roles and omits timed media', () => {
  expect(STATIC_IMAGE_KINDS).toEqual(['portrait', 'face', 'item-icon', 'battle-background'])
})

test('picker options use the requested image kind and stable ID order', async () => {
  const bytes = pngBytes(originalPortrait)
  const sha256 = await sha256Hex(bytes)
  const makeRecord = (kind: AssetKind, id: string, label?: string) => ({
    kind,
    path: `assets/authored/${kind}/${id}.png`,
    mediaType: 'image/png',
    bytes: bytes.byteLength,
    sha256,
    ...(label === undefined ? {} : { label }),
    origin: { kind: 'authored' as const },
  })
  const catalog = validateAssetCatalog({
    version: 1,
    assets: {
      'portrait.z': makeRecord('portrait', 'z', '首张'),
      'face.only': makeRecord('face', 'only'),
      'portrait.a': makeRecord('portrait', 'a'),
      'item-icon.only': makeRecord('item-icon', 'only'),
      'battle-background.only': makeRecord('battle-background', 'only'),
    },
  })

  expect(imageAssets(catalog, 'portrait').map(imageAssetLabel)).toEqual([
    'portrait.a',
    '首张 (portrait.z)',
  ])
  expect(imageAssets(catalog, 'face').map(({ id }) => id)).toEqual(['face.only'])
  expect(imageAssets(catalog, 'item-icon').map(({ id }) => id)).toEqual(['item-icon.only'])
  expect(imageAssets(catalog, 'battle-background').map(({ id }) => id)).toEqual([
    'battle-background.only',
  ])
  expect(imageAssets({ version: 1, assets: {} }, 'portrait')).toEqual([])
})
