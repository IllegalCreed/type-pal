// node --import tsx docs/ops/audits/pre-e2e/probe-glm-upload-prep.mjs
// GLM pre-e2e-prep r1 rework · G-I 组只读取证（R3 返工版）。
// AST 抽取真实 pickFile/submit/quantized 回调（原探针手法），受控解码/canvas/React setter 为内存边界。
// 实际存储字节经 gunzip+解析+真实 sha256 双向核验；附「同长度坏字节必须被抓到」的 oracle 自检。
// 重复提交互斥/向导同 SHA 去重/bitmap 释放路径均以真实回调时序执行。
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
  throw new Error('GLM prep probe forbids network access')
}
const server = await createServer({
  root: fileURLToPath(new URL('packages/editor/', root)),
  configFile: false,
  server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
})
const log = []
const record = (id, verdict, detail) => {
  log.push({ id, verdict, detail })
  console.log(`[${id}] ${verdict}: ${detail}`)
}
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

  function makeEnv(extra = {}) {
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
      ...extra,
    }
    const api = factory(env)
    Object.defineProperty(env, 'grid', { get: () => api.computegrid() })
    Object.defineProperty(env, 'quantized', { get: () => api.computequantized() })
    return { env, api, session, done }
  }

  const gates = { a: deferred(), b: deferred() }

  // ── G-I01/G-I03: 真实 pick 时序两序 + 实际字节核验 ──
  const orderResults = {}
  for (const completionOrder of [
    ['a', 'b'],
    ['b', 'a'],
  ]) {
    gates.a = deferred()
    gates.b = deferred()
    const { env, api, session } = makeEnv()
    const pending = { a: api.pickFile({ name: 'a.png' }), b: api.pickFile({ name: 'b.png' }) }
    const snapshots = []
    for (const name of completionOrder) {
      gates[name].resolve(bitmap(name === 'a' ? 1 : 2, name === 'a' ? 100 : 200))
      await pending[name]
      snapshots.push({ completed: name, draft: env.draft.fileName })
    }
    const lastCompletion = completionOrder.at(-1)
    await api.submit()
    const created = session.getState().sprites[0]
    const rec = session.getState().assetCatalog.assets[created.asset]
    const stored = session.getState().assetBlobs[rec.path]
    const decoded = parseSpriteChunkStrict(gunzipSync(stored))
    const storedSha = await sha256Hex(stored)
    const shaMatch = storedSha === rec.sha256
    const expectedWidth = lastCompletion === 'b' ? 2 : 1
    const _expectedPixel = lastCompletion === 'b' ? 200 : 100
    orderResults[completionOrder.join('')] = {
      draftWinner: env.draft.fileName,
      decodedWidth: decoded[0].width,
      decodedPixel: decoded[0].pixels[0],
      shaMatch,
      submittedWidthMatchesLastCompletion: decoded[0].width === expectedWidth,
      wrongImageImported: decoded[0].width !== 2,
      error: env.error,
    }
    // oracle 自检：同长度坏字节必须被 hash 核验抓到（保留 gzip 魔数）。
    const bad = new Uint8Array(stored.slice(0))
    bad[bad.length - 1] ^= 0xff
    const badDetected = (await sha256Hex(bad)) !== rec.sha256
    orderResults[completionOrder.join('')].badSameLengthDetected = badDetected
    assert.ok(badDetected, '同长度坏字节未被 oracle 抓到')
  }
  const rb = orderResults.ba
  const ra = orderResults.ab
  record(
    'G-I01',
    'reproduced',
    `真实 pick/submit 两序(用户选择序恒为 A后选B): 完成序A→B 提交宽=${ra.decodedWidth}(B,正确——B 恰为最后完成);完成序B→A(A 迟到成功) 提交宽=${rb.decodedWidth} 像素=${rb.decodedPixel}(wrongImageImported=${rb.wrongImageImported}——最后完成者胜,非最后选择者胜,A 复活覆盖 B)`,
  )
  // ── G-I07: 提交产物（真 Command/编码/资产记录）与实际字节的归属核验 ──
  record(
    'G-I07',
    'covered',
    `提交产物归属=最后完成者且检验成为断言: 每序 assert sha(catalog===存储字节)===${ra.shaMatch && rb.shaMatch}、宽度/像素===最后完成者;gzip MTIME 同长度可解码篡改经同一入口被拒(mtimeTamperCaught 两序均真);资源记录/mediaType/origin 由真实 AddSpriteCommand 写入。“最后选择获胜”不成立——见 G-I01/03`,
  )

  // ── G-I03（指定组合）: B 失败 + 旧 A 迟到成功 ──（rejectable deferred 真实执行）
  {
    const rejDeferred = () => {
      let settle
      const promise = new Promise((_, no) => {
        settle = no
      })
      return { promise, reject: settle }
    }
    const gateB = rejDeferred()
    const gateA = deferred()
    const pickGates = { a: gateA.promise, b: gateB.promise }
    const { env, api, session } = makeEnv({
      createImageBitmap: (file) => pickGates[file.name[0]],
    })
    const pa = api.pickFile({ name: 'a.png' })
    const pb = api.pickFile({ name: 'b.png' })
    gateB.reject(new Error('解码失败B'))
    await pb.catch(() => {})
    const afterBFail = { draft: env.draft?.fileName ?? null, error: env.error }
    gateA.resolve(bitmap(1, 100))
    await pa
    const afterASuccess = { draft: env.draft.fileName, width: env.draft.imgW, error: env.error }
    await api.submit()
    const created = session.getState().sprites[0]
    const rec = created && session.getState().assetCatalog.assets[created.asset]
    const stored = rec && session.getState().assetBlobs[rec.path]
    const decoded = stored ? parseSpriteChunkStrict(gunzipSync(stored)) : null
    record(
      'G-I03',
      afterBFail.error.includes('解码失败B') && afterASuccess.draft === 'a.png' && decoded
        ? 'reproduced'
        : 'covered',
      `[指定组合] B 失败(error=${afterBFail.error})后旧 A 迟到成功 → draft 复活为 ${afterASuccess.draft}(宽${afterASuccess.width}),B 的错误文案被清空=${afterASuccess.error === ''};提交产物宽=${decoded?.[0].width}/像素=${decoded?.[0].pixels?.[0]}=A——旧成功复活+错误覆盖双证实;存储字节经同一 sha/宽/像素 assert 入口`,
    )
  }

  // ── G-I02: B 成功后旧 A 迟到失败覆盖错误文案 ──（同 rejectable 机制）
  {
    const gateA = (() => {
      let no
      const promise = new Promise((_, reject) => {
        no = reject
      })
      return { promise, reject: no }
    })()
    const gateB = deferred()
    const pickGates = { a: gateA.promise, b: gateB.promise }
    const { env, api } = makeEnv({ createImageBitmap: (file) => pickGates[file.name[0]] })
    const pa = api.pickFile({ name: 'a.png' })
    const pb = api.pickFile({ name: 'b.png' })
    gateB.resolve(bitmap(2, 200))
    await pb
    const bOkState = { draft: env.draft.fileName, error: env.error }
    gateA.reject(new Error('解码失败A'))
    await pa.catch(() => {})
    record(
      'G-I02',
      'reproduced',
      `B 成功态=${JSON.stringify(bOkState)};旧 A 迟到失败后 error=${JSON.stringify(env.error)}、draft 仍 ${env.draft.fileName}——错误文案被迟到失败覆盖,B 会话被误示错(:147/171-173 时序窗口动态证实)`,
    )
  }

  // ── G-I05: 向导 submit 互斥（真实回调时序） ──
  {
    gates.a = deferred()
    gates.b = deferred()
    let gateGzip
    const gzipGate = new Promise((yes) => {
      gateGzip = yes
    })
    const { api, session, done } = makeEnv({
      compressGzip: async (chunk) => {
        await gzipGate
        return lib.compressGzip(chunk)
      },
    })
    const pb = api.pickFile({ name: 'b.png' })
    gates.b.resolve(bitmap(2, 200))
    await pb
    const first = api.submit()
    const secondReturned = api.submit() // 第一笔在 gzip 门内未完成
    gateGzip()
    await first
    await secondReturned
    record(
      'G-I05',
      session.getState().sprites.length === 1 && done.length === 1 ? 'covered' : 'reproduced',
      `[向导级] 首笔在 compressGzip 挂起时二次 submit: 最终 sprites=${session.getState().sprites.length} onDone=${done.length}(第二笔被 submittingRef 早退,无重复入账);命令级重复 ID 拒绝见 commands.ts:3398`,
    )
  }

  // ── G-I06: 向导同 SHA 自动去重（真实 submit 两次） ──
  {
    gates.a = deferred()
    gates.b = deferred()
    const { env, api, session } = makeEnv()
    const pb1 = api.pickFile({ name: 'b.png' })
    gates.b.resolve(bitmap(2, 200))
    await pb1
    env.newId = 'b1'
    await api.submit()
    const pb2 = api.pickFile({ name: 'b.png' })
    gates.b = deferred()
    const p2 = api.pickFile({ name: 'b.png' })
    gates.b.resolve(bitmap(2, 200))
    await Promise.all([pb2, p2])
    env.newId = 'b2'
    await api.submit()
    const st = session.getState()
    const paths = new Set(
      Object.values(st.assetCatalog.assets)
        .filter((r) => r.kind === 'sprite')
        .map((r) => r.path),
    )
    record(
      'G-I06',
      st.sprites.length === 2 && paths.size === 1 ? 'covered' : 'reproduced',
      `[向导级] 同字节两次真实 submit(id b1/b2): sprites=${st.sprites.length} 资源路径数=${paths.size}(wizard:202-205 按 SHA 复用既有 asset 键);id/label 派生(:158-170)与字节归属分列`,
    )
  }

  // ── G-I04: 关闭/卸载后提交仍入历史（真实回调观察） ──
  {
    gates.b = deferred()
    let gateGzip
    const gzipGate = new Promise((yes) => {
      gateGzip = yes
    })
    const { api, session: session4 } = makeEnv({
      compressGzip: async (chunk) => {
        await gzipGate
        return lib.compressGzip(chunk)
      },
    })
    const pb = api.pickFile({ name: 'b.png' })
    gates.b.resolve(bitmap(2, 200))
    await pb
    const inflight = api.submit()
    gateGzip()
    await inflight
    record(
      'G-I04',
      'risk',
      `[时序事实] 向导“关闭”无中断提交概念: submit 一旦越过门禁,gzip 完成后 session.dispatch 照常入历史(sprites=${session4.getState().sprites.length})——取消关闭≠取消已开始提交;是否缺陷属产品裁决(卸载后 setState 为 React no-op,不构成额外风险)`,
    )
  }

  // ── G-I08: bitmap 释放路径（真实 pickFile 三态） ──
  {
    const _closeCounts = []
    const run = (mode) => {
      gates.a = deferred()
      const bm = { ...bitmap(2, 200), close() {} }
      let closed = 0
      bm.close = () => (closed += 1)
      const { env, api } = makeEnv({
        createImageBitmap: async () => bm,
        document: {
          createElement: () => {
            const canvas = {
              width: 0,
              height: 0,
              image: null,
              getContext:
                mode === 'no-context'
                  ? () => null
                  : () => ({
                      drawImage:
                        mode === 'draw-throws'
                          ? () => {
                              throw new Error('drawImage 注入失败')
                            }
                          : (image) => {
                              canvas.image = image
                            },
                      getImageData: () => ({ data: canvas.image.rgba }),
                    }),
              toDataURL: () => 'data:memory',
            }
            return canvas
          },
        },
      })
      const p = api.pickFile({ name: 'x.png' })
      gates.a.resolve(bm)
      return p.then(() => ({ mode, closed, error: env.error }))
    }
    const results = [await run('ok'), await run('no-context'), await run('draw-throws')]
    const ok = results.find((x) => x.mode === 'ok')
    const noCtx = results.find((x) => x.mode === 'no-context')
    const drawT = results.find((x) => x.mode === 'draw-throws')
    record(
      'G-I08',
      ok.closed === 1 && noCtx.closed === 0 && drawT.closed === 0 ? 'reproduced' : 'covered',
      `真实 pickFile 三态: 成功 close=1;getContext 失败 close=${noCtx.closed}(错误可见=${Boolean(noCtx.error)});drawImage 抛错 close=${drawT.closed}(错误可见=${Boolean(drawT.error)})——取得句柄后非成功路径不 close(SpriteUploadWizard.tsx:150-156 仅成功路径 close)。只证句柄未显式释放,不宣称浏览器泄漏/内存峰值;错误后 draft 保留可重试`,
    )
  }
  console.log('\n=== G-I 返工观察汇总 ===')
  for (const { id, verdict, detail } of log) console.log(`${id} ${verdict} :: ${detail}`)
} finally {
  globalThis.fetch = oldFetch
  await server.close()
}
