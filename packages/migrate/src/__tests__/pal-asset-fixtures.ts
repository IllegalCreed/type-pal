import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { type AssetCatalogV1, type AssetRecordV1, validateAssetCatalog } from '@type-pal/content'
import { PNG } from 'pngjs'
import { afterEach, expect } from 'vitest'
import {
  loadPalSoundAssets,
  loadPalStaticImages,
  type PalBinaryAssetSource,
} from '../pal-assets.js'

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})
export function tempRepo() {
  const repo = mkdtempSync(resolve(tmpdir(), 'codex-pal-assets-'))
  roots.push(repo)
  return repo
}
export const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
export function put(repo: string, path: string, bytes: string | Uint8Array) {
  const full = resolve(repo, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, bytes)
  return full
}
export const json = (repo: string, path: string, value: unknown) =>
  put(repo, path, JSON.stringify(value))
export function diskTree(repo: string): Record<string, string> {
  const tree: Record<string, string> = {}
  function walk(path: string) {
    for (const entry of readdirSync(resolve(repo, path), { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const next = path ? `${path}/${entry.name}` : entry.name
      tree[next] = entry.isDirectory() ? 'directory' : digest(readFileSync(resolve(repo, next)))
      if (entry.isDirectory()) walk(next)
    }
  }
  walk('')
  return tree
}
export function readOnly<T>(repo: string, action: () => T): T {
  const before = diskTree(repo)
  try {
    return action()
  } finally {
    expect(diskTree(repo)).toEqual(before)
  }
}
export function png(width = 2, height = 1, pixels?: readonly number[]) {
  const image = new PNG({ width, height })
  for (let i = 0; i < width * height; i++) image.data.set([5, 5, 5, 255], i * 4)
  if (pixels) image.data.set(pixels)
  return PNG.sync.write(image)
}
/** A real PCM mono 8-bit 8kHz WAV, not just a forged RIFF prefix. */
export function wave() {
  const bytes = Buffer.alloc(48)
  bytes.write('RIFF', 0)
  bytes.writeUInt32LE(40, 4)
  bytes.write('WAVEfmt ', 8)
  bytes.writeUInt32LE(16, 16)
  bytes.writeUInt16LE(1, 20)
  bytes.writeUInt16LE(1, 22)
  bytes.writeUInt32LE(8000, 24)
  bytes.writeUInt32LE(8000, 28)
  bytes.writeUInt16LE(1, 32)
  bytes.writeUInt16LE(8, 34)
  bytes.write('data', 36)
  bytes.writeUInt32LE(4, 40)
  bytes.set([0, 127, 255, 128], 44)
  return bytes
}
export const soundMetadataPath = 'data/extracted/data/sounds-metadata.json'
export const manifestPath = 'data/extracted/asset-manifest.json'
export function soundFixture() {
  const repo = tempRepo()
  const bytes = wave()
  const metadata = {
    chunkCount: 505,
    chunks: Array.from({ length: 505 }, (_, index) => ({
      index,
      size: index === 1 || index === 45 ? bytes.length : 0,
      isEmpty: index !== 1 && index !== 45,
    })),
  }
  const manifest = {
    files: [
      { path: 'sounds/1.wav', size: bytes.length },
      { path: 'sounds/45.wav', size: bytes.length },
      { path: 'images/ignored.png', size: 7 },
    ],
  }
  const save = () => {
    json(repo, soundMetadataPath, metadata)
    json(repo, manifestPath, manifest)
  }
  save()
  put(repo, 'data/extracted/sounds/1.wav', bytes)
  put(repo, 'data/extracted/sounds/45.wav', bytes)
  return {
    repo,
    bytes,
    metadata,
    manifest,
    save,
    run: () => readOnly(repo, () => loadPalSoundAssets(repo)),
  }
}
export const palettePath = 'data/extracted/data/palette/0.json'
export const portraitsPath = 'data/extracted/data/portraits.json'
export const itemsPath = 'data/extracted/data/items.json'
/** Accepted extracted format, deliberately synthetic contents; not a PAL original-data census. */
export function staticFixture() {
  const repo = tempRepo()
  const palette = { colors: Array.from({ length: 256 }, (_, i) => [i, 255 - i, (i * 3) % 256]) }
  const image = png(2, 1, [5, 5, 5, 255, 17, 17, 17, 0])
  const background = png(320, 200)
  json(repo, palettePath, palette)
  json(repo, portraitsPath, { count: 88 })
  for (let n = 1; n <= 88; n++)
    put(repo, `data/extracted/images/portraits/${String(n).padStart(2, '0')}.png`, image)
  for (let n = 48; n <= 52; n++) put(repo, `data/extracted/images/ui/frame-${n}.png`, image)
  const items = [
    ...Array.from({ length: 233 }, (_, i) => ({ id: i + 1, bitmap: i + 1 })),
    { id: 277, bitmap: 0 },
  ]
  json(repo, itemsPath, items)
  for (let n = 1; n <= 233; n++)
    put(repo, `data/extracted/images/items/${String(n).padStart(3, '0')}.png`, image)
  for (let n = 6; n <= 57; n++)
    put(repo, `data/extracted/images/battle/bg/${String(n).padStart(3, '0')}.png`, background)
  return {
    repo,
    palette,
    items,
    image,
    background,
    run: () => readOnly(repo, () => loadPalStaticImages(repo)),
  }
}
export function sourceBytes(source: PalBinaryAssetSource) {
  return source.sourcePath === undefined
    ? Buffer.from(source.bytes)
    : readFileSync(source.sourcePath)
}
export function assertSources(sources: readonly PalBinaryAssetSource[]) {
  const catalog: AssetCatalogV1 = {
    version: 1,
    assets: Object.fromEntries(sources.map((s) => [s.id, s.record])),
  }
  expect(validateAssetCatalog(catalog)).toBe(catalog)
  for (const source of sources) {
    const bytes = sourceBytes(source)
    expect(source.record.bytes).toBe(bytes.length)
    expect(source.record.sha256).toBe(digest(bytes))
  }
}
export function imageRecord(
  path: string,
  bytes: Uint8Array,
  origin: AssetRecordV1['origin'] = { kind: 'legacy-migrated', ref: 'images/input.png' },
): AssetRecordV1 {
  return {
    kind: 'portrait',
    path,
    mediaType: 'image/png',
    bytes: bytes.length,
    sha256: digest(bytes),
    origin,
  }
}
export function ownedFixture() {
  const repo = tempRepo()
  const bytes = Uint8Array.from(png())
  const sources: PalBinaryAssetSource[] = ['a', 'b'].map((id) => ({
    id,
    bytes: bytes.slice(),
    record: imageRecord(`assets/migrated/${id}.png`, bytes),
  }))
  const catalog: AssetCatalogV1 = {
    version: 1,
    assets: Object.fromEntries(sources.map((s) => [s.id, structuredClone(s.record)])),
  }
  validateAssetCatalog(catalog)
  put(repo, 'projects/pal/keep.txt', 'nonempty unmanaged sentinel')
  return { repo, sources, catalog, bytes }
}
