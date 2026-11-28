// @vitest-environment jsdom
import { validateAssetCatalog } from '@type-pal/content'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  installBrowserHardwarePorts,
  pngFileOf,
  pngRgba,
  solidRgba,
} from '../__tests__/cursor-asset-r1/image-ports.js'
import { stubNodeTestHost } from '../__tests__/cursor-asset-r1/kit.js'
import { nextAuthoredImageId, prepareAuthoredImage } from './image-import.js'

beforeEach(async () => {
  await stubNodeTestHost()
  installBrowserHardwarePorts()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('direct imports retain the PNG and preserve independent catalog identities by kind', async () => {
  const payload = pngRgba(2, 3, solidRgba(2, 3, [32, 48, 64, 255]))
  const file = pngFileOf('Artwork.PNG', payload)
  const portrait = await prepareAuthoredImage(file, 'portrait')
  const face = await prepareAuthoredImage(file, 'face', undefined, '头像')
  const item = await prepareAuthoredImage(file, 'item-icon')

  for (const prepared of [portrait, face, item]) {
    expect([prepared.width, prepared.height]).toEqual([2, 3])
    expect(new Uint8Array(prepared.sourceBytes)).toEqual(payload)
    expect(new Uint8Array(prepared.bytes)).toEqual(payload)
    expect(prepared.effectPreviewBytes).toBeUndefined()
    expect(prepared.hash).toBe(portrait.hash)
    expect(prepared.record).toMatchObject({
      path: `assets/authored/${prepared.record.kind}/${portrait.hash}.png`,
      sha256: portrait.hash,
      bytes: payload.byteLength,
      origin: { kind: 'authored', ref: 'Artwork.PNG' },
    })
  }
  expect([portrait.record.label, face.record.label, item.record.label]).toEqual([
    'Artwork',
    '头像',
    'Artwork',
  ])
})

test('the next imported ID skips occupied entries in its kind and fills the first hole', async () => {
  const file = pngFileOf('new.png', pngRgba(1, 1, Uint8Array.of(1, 2, 3, 255)))
  const portrait = await prepareAuthoredImage(file, 'portrait')
  const hashPrefix = portrait.hash.slice(0, 16)
  const occupied = `portrait.authored.${hashPrefix}`
  const catalog = validateAssetCatalog({
    version: 1,
    assets: { [occupied]: portrait.record, [`${occupied}-3`]: portrait.record },
  })

  expect(nextAuthoredImageId(catalog, 'portrait', portrait.hash)).toBe(`${occupied}-2`)
  expect(nextAuthoredImageId(catalog, 'face', portrait.hash)).toBe(`face.authored.${hashPrefix}`)
  const full = validateAssetCatalog({
    ...catalog,
    assets: { ...catalog.assets, [`${occupied}-2`]: portrait.record },
  })
  expect(nextAuthoredImageId(full, 'portrait', portrait.hash)).toBe(`${occupied}-4`)
})
