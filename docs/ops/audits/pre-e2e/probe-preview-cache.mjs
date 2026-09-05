// node --import tsx docs/ops/audits/pre-e2e/probe-preview-cache.mjs
// Original preview cache/functions, real resolver/RLE/bake, memory source and Canvas boundary.
// Assertions describe the unfixed baseline, not desired caching behavior.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import ts from 'typescript'

const root = new URL('../../../../', import.meta.url)
const req = createRequire(new URL('packages/editor/package.json', root))
const { createServer } = await import(req.resolve('vite'))
assert.equal(typeof globalThis.indexedDB, 'undefined')
const oldFetch = globalThis.fetch,
  oldDocument = globalThis.document
globalThis.fetch = () => {
  throw new Error('Preview audit forbids network access')
}
globalThis.document = {
  createElement: () => {
    const canvas = {
      width: 0,
      height: 0,
      rgba: null,
      getContext: () => ({
        createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: (image) => {
          canvas.rgba = Uint8ClampedArray.from(image.data)
        },
      }),
    }
    return canvas
  },
}
const server = await createServer({
  root: fileURLToPath(new URL('packages/editor/', root)),
  configFile: false,
  server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
})
try {
  const lib = await server.ssrLoadModule('/../reforge/src/index.ts')
  const { loadEditorSprite } = await server.ssrLoadModule('/src/core/sprite-assets.ts')
  const { AssetResolver } = await server.ssrLoadModule('/../reforge/src/asset-resolver.ts')
  const { palMagicEffectSpriteAssetId } = await server.ssrLoadModule('/../content/src/asset.ts')
  function extract(path, names) {
    const ast = ts.createSourceFile(
      path,
      readFileSync(new URL(path, root), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    const selected = ast.statements.filter(
      (node) =>
        (node.name && names.includes(node.name.text)) ||
        (ts.isVariableStatement(node) &&
          node.declarationList.declarations.some((d) => names.includes(d.name.getText(ast)))),
    )
    assert.equal(selected.length, names.length)
    const js = ts.transpileModule(selected.map((n) => n.getText(ast)).join('\n'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
    }).outputText
    return new Function('env', `with(env) { ${js}; return {${names.join(',')}}; }`)({
      ...lib,
      loadEditorSprite,
    })
  }
  const fire = extract('packages/editor/src/ui/FireEffectPreview.tsx', ['fireCache', 'loadFrames'])
  const thumb = extract('packages/editor/src/ui/SpriteThumb.tsx', ['thumbCache', 'loadThumb'])
  const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
  const palette = JSON.stringify({
    colors: Array.from({ length: 256 }, (_, i) => [i, i, i]),
    cycles: [],
  })
  function fixture(projectId, pixel) {
    const bytes = gzipSync(
      lib.encodeSpriteChunk([
        { width: 1, height: 1, pixels: new Uint8Array([pixel]), opaque: new Uint8Array([1]) },
      ]),
    )
    const state = { reads: 0, fail: false }
    const catalog = {
      version: 1,
      assets: {
        color: {
          kind: 'color-table',
          path: 'assets/generated/color.json',
          mediaType: 'application/json',
          bytes: Buffer.byteLength(palette),
          sha256: hash(palette),
          origin: { kind: 'generated' },
        },
      },
    }
    for (const [id, kind] of [
      ['sprite', 'sprite'],
      [palMagicEffectSpriteAssetId(7), 'effect-sprite'],
    ])
      catalog.assets[id] = {
        kind,
        path: `assets/generated/${id}.rle`,
        mediaType: 'application/vnd.type-pal.rle',
        bytes: bytes.length,
        sha256: hash(bytes),
        origin: { kind: 'generated' },
      }
    const source = {
      readText: async (path) => {
        assert.equal(path, 'assets/generated/color.json')
        return palette
      },
      readBytes: async (path) => {
        state.reads++
        if (state.fail) throw new Error('Temporary read failure')
        assert(path.endsWith('.rle'))
        return Uint8Array.from(bytes).buffer
      },
      readJson: async () => {
        throw new Error('Unexpected JSON read')
      },
      urlFor: async () => {
        throw new Error('No external URLs')
      },
    }
    const resolver = new AssetResolver(
      projectId,
      catalog,
      { 'visual.standardColorTable': 'color' },
      source,
    )
    return { state, resolver, base: { source, assetResolver: resolver } }
  }
  const a = fixture('project-a', 10),
    b = fixture('project-b', 20)
  const fa = await fire.loadFrames(a.base, 7),
    fb = await fire.loadFrames(b.base, 7)
  const bPreviewReads = b.state.reads
  const directB = await lib.loadFireSprite(b.base, 7)
  assert.equal(bPreviewReads, 0)
  assert.equal(fa, fb)
  assert.equal(fb[0].rgba[0], 10)
  assert.equal(directB.frames[0].pixels[0], 20)
  console.log(
    'E-fire-cache',
    JSON.stringify({
      aPixel: fa[0].rgba[0],
      bPreviewPixel: fb[0].rgba[0],
      bActualPixel: directB.frames[0].pixels[0],
      sameFrameArray: fa === fb,
      bPreviewReads,
    }),
  )
  const retry = fixture('recoverable', 30)
  const revision = retry.resolver.record('sprite').sha256
  retry.state.fail = true
  assert.equal(await thumb.loadThumb(retry.base, retry.resolver, 'sprite', revision, 0), null)
  retry.state.fail = false
  assert.equal(await thumb.loadThumb(retry.base, retry.resolver, 'sprite', revision, 0), null)
  const reads = retry.state.reads
  const recovered = await loadEditorSprite(retry.resolver, 'sprite')
  const finalPreview = await thumb.loadThumb(retry.base, retry.resolver, 'sprite', revision, 0)
  assert.equal(reads, 1)
  assert.equal(recovered.frames[0].pixels[0], 30)
  assert.equal(finalPreview, null)
  console.log(
    'E-thumb-retry',
    JSON.stringify({
      previewAttemptsBeforeDirectRecovery: 2,
      reads,
      directRecoveryPixel: recovered.frames[0].pixels[0],
      finalPreview,
    }),
  )
} finally {
  await server.close()
  globalThis.fetch = oldFetch
  if (oldDocument === undefined) delete globalThis.document
  else globalThis.document = oldDocument
}
