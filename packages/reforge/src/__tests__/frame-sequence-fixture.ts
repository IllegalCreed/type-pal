import { encodeFrameSequence, validateAssetCatalog } from '@type-pal/content'
import { AssetResolver } from '../asset-resolver.js'
import type { FileSource } from '../file-source.js'
import { sha256Bytes } from '../hash.js'

export const exampleFrameAsset = 'frame-animation.opening'

export function frameGate() {
  let release = () => {}
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

/** Small canonical TPFS: each frame has distinct RGBA, index 1 carries authored timing. */
export async function frameSequenceBytes(colors: readonly number[]): Promise<ArrayBuffer> {
  const bytes = await encodeFrameSequence(
    {
      width: 1,
      height: 1,
      defaultFrameMs: 40,
      frames: colors.map((red, index) => ({
        rgba: Uint8Array.of(red, red + 1, red + 2, 255),
        ...(index === 1 ? { durationMs: 75 } : {}),
      })),
    },
    async (raw) =>
      new Uint8Array(
        await new Response(
          new Blob([Uint8Array.from(raw).buffer])
            .stream()
            .pipeThrough(new CompressionStream('deflate')),
        ).arrayBuffer(),
      ),
  )
  return Uint8Array.from(bytes).buffer
}

export async function listedFrameSequence(bytes: ArrayBuffer, readBytes?: FileSource['readBytes']) {
  const path = 'assets/authored/opening.tpfs'
  const source: FileSource = {
    async readBytes(rel) {
      if (rel !== path) throw new DOMException(rel, 'NotFoundError')
      return readBytes ? readBytes(rel) : bytes.slice(0)
    },
    async readText(rel) {
      throw new DOMException(rel, 'NotFoundError')
    },
    async readJson(rel) {
      throw new DOMException(rel, 'NotFoundError')
    },
    async urlFor(rel) {
      return `https://project.test/${rel}`
    },
  }
  const catalog = validateAssetCatalog({
    version: 1,
    assets: {
      [exampleFrameAsset]: {
        kind: 'frame-animation',
        path,
        mediaType: 'application/vnd.type-pal.frame-sequence',
        bytes: bytes.byteLength,
        sha256: await sha256Bytes(new Uint8Array(bytes)),
        origin: { kind: 'authored' },
      },
    },
  })
  return new AssetResolver('frame-fixture', catalog, {}, source)
}
