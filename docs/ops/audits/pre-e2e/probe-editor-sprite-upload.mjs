// node --import tsx docs/ops/audits/pre-e2e/probe-editor-sprite-upload.mjs
// Original wizard callbacks; only image decode/canvas/React setters are memory boundaries.
// Actual quantization/RLE/gzip/hash/AddSpriteCommand/EditSession; no user files written.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import ts from 'typescript'

const root = new URL('../../../../', import.meta.url)
const req = createRequire(new URL('packages/editor/package.json', root))
const { createServer } = await import(req.resolve('vite'))
assert.equal(typeof globalThis.indexedDB, 'undefined')
const oldFetch = globalThis.fetch
globalThis.fetch = () => {
  throw new Error('Editor audit forbids network access')
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
  const { AddSpriteCommand } = await server.ssrLoadModule('/src/core/commands.ts')
  const { EditSession } = await server.ssrLoadModule('/src/core/edit-session.ts')
  const { sha256Hex } = await server.ssrLoadModule('/src/core/binary-signature.ts')
  const { parseSpriteChunkStrict } = await server.ssrLoadModule('/../shared/src/rle.ts')
  const raw = readFileSync(new URL('packages/editor/src/ui/SpriteUploadWizard.tsx', root), 'utf8')
  const ast = ts.createSourceFile(
    'wizard.tsx',
    raw,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const found = new Map()
  function scan(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      ['pickFile', 'submit', 'grid', 'quantized'].includes(node.name.text)
    ) {
      const name = node.name.text
      assert(!found.has(name))
      found.set(
        name,
        name === 'grid' || name === 'quantized'
          ? `const compute${name} = ${node.initializer.arguments[0].getText(ast)};`
          : `const ${node.getText(ast)};`,
      )
    }
    ts.forEachChild(node, scan)
  }
  scan(ast)
  assert.equal(found.size, 4)
  const js = ts.transpileModule([...found.values()].join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText
  const factory = new Function(
    'env',
    `with(env) { ${js}; return {pickFile, submit, computegrid, computequantized}; }`,
  )
  const deferred = () => {
    let resolve
    const promise = new Promise((yes) => {
      resolve = yes
    })
    return { promise, resolve }
  }
  const bitmap = (width, color) => ({
    width,
    height: 1,
    rgba: Uint8ClampedArray.from(Array.from({ length: width }, () => [color, 0, 0, 255]).flat()),
    close() {},
  })
  for (const completionOrder of [
    ['a', 'b'],
    ['b', 'a'],
  ]) {
    const gates = { a: deferred(), b: deferred() }
    const session = new EditSession({
      sprites: [],
      assetCatalog: { version: 1, assets: {} },
      assetBlobs: {},
      maps: {},
      mapIndex: { version: 1, maps: [] },
      sceneIndex: { version: 1, scenes: [] },
      scenes: [],
      stamps: [],
    })
    const done = []
    const env = {
      ...lib,
      AddSpriteCommand,
      sha256Hex,
      session,
      sprites: [],
      draft: null,
      newId: '',
      newLabel: '',
      kind: 'static',
      sourceCols: 1,
      sourceRows: 1,
      framesPerDir: 3,
      actionRows: 0,
      frameCount: 4,
      submittingRef: { current: false },
      palette: { colors: Array.from({ length: 256 }, (_, i) => [i, 0, 0]), cycles: [] },
      createImageBitmap: (file) => gates[file.name[0]].promise,
      document: {
        createElement: () => {
          const canvas = {
            width: 0,
            height: 0,
            image: null,
            getContext: () => ({
              drawImage: (image) => {
                canvas.image = image
              },
              getImageData: () => ({ data: canvas.image.rgba }),
            }),
            toDataURL: () => 'data:memory',
          }
          return canvas
        },
      },
      setErr: (value) => {
        env.error = value
      },
      setDraft: (value) => {
        env.draft = value
      },
      setNewId: (value) => {
        env.newId = typeof value === 'function' ? value(env.newId) : value
      },
      setNewLabel: (value) => {
        env.newLabel = typeof value === 'function' ? value(env.newLabel) : value
      },
      setSubmitting: (value) => {
        env.submitting = value
      },
      onDone: (id) => done.push(id),
    }
    const api = factory(env)
    Object.defineProperty(env, 'grid', { get: () => api.computegrid() })
    Object.defineProperty(env, 'quantized', { get: () => api.computequantized() })
    const pending = { a: api.pickFile({ name: 'a.png' }), b: api.pickFile({ name: 'b.png' }) }
    const snapshots = []
    for (const name of completionOrder) {
      gates[name].resolve(bitmap(name === 'a' ? 1 : 2, name === 'a' ? 100 : 200))
      await pending[name]
      snapshots.push({
        completed: name,
        file: env.draft.fileName,
        id: env.newId,
        width: env.draft.imgW,
      })
    }
    assert.equal(env.draft.fileName, `${completionOrder.at(-1)}.png`)
    await api.submit()
    assert.equal(env.error, '')
    assert.equal(done[0], completionOrder[0])
    assert.equal(session.getState().sprites.length, 1)
    const created = session.getState().sprites[0]
    const record = session.getState().assetCatalog.assets[created.asset]
    const bytes = gunzipSync(session.getState().assetBlobs[record.path])
    const decoded = parseSpriteChunkStrict(bytes)
    assert.equal(decoded[0].width, completionOrder.at(-1) === 'a' ? 1 : 2)
    assert.equal(decoded[0].pixels[0], completionOrder.at(-1) === 'a' ? 100 : 200)
    console.log(
      'D-upload',
      JSON.stringify({
        completionOrder,
        selectedLast: 'b.png',
        snapshots,
        created,
        history: session.getHistoryVersion(),
        decodedFirstWidth: decoded[0].width,
        decodedFirstPixel: decoded[0].pixels[0],
        wrongImageImported: decoded[0].width !== 2,
      }),
    )
  }
} finally {
  await server.close()
  globalThis.fetch = oldFetch
}
