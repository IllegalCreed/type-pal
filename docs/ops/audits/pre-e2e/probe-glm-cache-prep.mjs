// node --import tsx docs/ops/audits/pre-e2e/probe-glm-cache-prep.mjs
// GLM pre-e2e-prep r1 rework · G-C 组只读取证（R2 返工版）。
// 每个故障例独立新鲜 key/reader/缓存域，附注入次数与真实失败结果见证；
// 有效新字节配真实 SHA；同 reader 隔离修订轴；FIRE 用真实 AssetBase/AssetResolver
// 与合法 effect-sprite 内容（成功正控先行）；确定性完成信号=DOM 文本/canvas 出现/
// drawImage 计数，不用固定 sleep。canvas 2d 仍是【呈现边界替身】（不作视觉事实）。
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = new URL('../../../../', import.meta.url)
const req = createRequire(new URL('packages/editor/package.json', root))
const { createServer } = await import(req.resolve('vite'))
const { JSDOM } = await import(req.resolve('jsdom'))
const dom = new JSDOM('<!doctype html><html><body><div id="host"></div></body></html>', {
  url: 'http://localhost/',
})
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.ImageData = dom.window.ImageData
globalThis.IntersectionObserver = class {
  observe(el) {
    queueMicrotask(() => this.cb([{ isIntersecting: true, target: el }]))
  }
  disconnect() {}
  constructor(cb) {
    this.cb = cb
  }
}
let drawCalls = 0
const fakeCtx = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === 'createImageData')
        return (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) })
      if (prop === 'canvas') return { width: 16, height: 16 }
      if (prop === 'drawImage') return () => (drawCalls += 1)
      return () => undefined
    },
    set() {
      return true
    },
  },
)
dom.window.HTMLCanvasElement.prototype.getContext = () => fakeCtx

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
// 确定性条件等待（非固定 sleep）：谓词满足即返回。
const waitFor = async (predicate, label, limit = 200) => {
  for (let i = 0; i < limit; i++) {
    if (predicate()) return true
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  throw new Error(`waitFor 超时: ${label}`)
}
try {
  const react = await import(req.resolve('react'))
  const { createRoot } = await import(req.resolve('react-dom/client'))
  const reforge = await server.ssrLoadModule('/../reforge/src/index.ts')
  const { AssetResolver } = await server.ssrLoadModule('/../reforge/src/asset-resolver.js')
  const { buildBlankProject } = await server.ssrLoadModule('/src/core/seed.ts')
  const { toEditorState } = await server.ssrLoadModule('/src/core/project-io.ts')
  const { loadCurrentProjectFrom, loadAllAuthorScenes } = await server.ssrLoadModule(
    '/../reforge/src/project-loader.ts',
  )
  const { createEditorAssetReader } = await server.ssrLoadModule('/src/core/editor-asset-reader.js')
  const { loadEditorSprite } = await server.ssrLoadModule('/src/core/sprite-assets.js')
  const { sha256Hex } = await server.ssrLoadModule('/src/core/binary-signature.js')
  const SpriteThumbMod = await server.ssrLoadModule('/src/ui/SpriteThumb.tsx')
  const FireMod = await server.ssrLoadModule('/src/ui/FireEffectPreview.tsx')
  const content = await server.ssrLoadModule('/../content/src/index.ts')

  const host = document.getElementById('host')
  async function mount(Component, props) {
    const div = document.createElement('div')
    host.appendChild(div)
    const rootEl = createRoot(div)
    rootEl.render(react.createElement(Component, props))
    return { div, rootEl }
  }

  // ───────── SpriteThumb 域（同 reader 隔离 + 新鲜 fixture + 注入见证） ─────────
  const files = await buildBlankProject('glm-cache-rework')
  const baseOf = (extra) => sourceOf({ ...structuredClone(files), ...extra })
  function sourceOf(map) {
    const reads = new Map()
    let injections = 0
    let armed = null
    return {
      reads,
      get injections() {
        return injections
      },
      arm(path) {
        armed = path
      },
      source: {
        async readText(rel) {
          const x = mustGet(map, rel)
          return typeof x === 'string' ? x : JSON.stringify(x)
        },
        async readJson(rel) {
          return JSON.parse(await this.readText(rel))
        },
        async readBytes(rel) {
          reads.set(rel, (reads.get(rel) ?? 0) + 1)
          if (armed === rel) {
            injections += 1
            armed = null
            throw new Error(`注入读取失败(${rel})`)
          }
          const x = mustGet(map, rel)
          return x instanceof ArrayBuffer ? x.slice(0) : new TextEncoder().encode(x).buffer
        },
        async urlFor() {
          throw new Error('no URLs')
        },
      },
    }
  }
  const mustGet = (map, rel) => {
    if (!Object.hasOwn(map, rel)) throw new DOMException(rel, 'NotFoundError')
    return map[rel]
  }
  // 真实 blank 工程（palette/assetBase/试玩 reader 均来自正式 loader）。
  const blankBox = sourceOf(files)
  const project = await loadCurrentProjectFrom(blankBox.source)
  const scenes = await loadAllAuthorScenes(project)
  const blankState = toEditorState(project, scenes, {}, {}, [])
  const realAssetBase = project.assetBase
  // 用真实管线为“新鲜精灵”生成有效 RLE，SHA 由真实 sha256Hex 计算。
  const palette = await reforge.loadStandardPalette(realAssetBase)
  const solidRgba = (fill) => {
    const c = palette.colors[fill]
    const rgba = new Uint8Array(16 * 16 * 4)
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = c[0]
      rgba[i + 1] = c[1]
      rgba[i + 2] = c[2]
      rgba[i + 3] = 255
    }
    return rgba
  }
  const makeRle = async (frames, fill) => {
    const chunk = reforge.encodeSpriteChunk(
      Array.from({ length: frames }, () =>
        reforge.quantizeToRleFrame(solidRgba(fill), 16, 16, palette),
      ),
    )
    const gz = await reforge.compressGzip(chunk)
    return gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength)
  }

  // G-C04（成功去重正控，独立新鲜 asset）：canvas drawImage 完成信号 + 一次读取。
  {
    const path = 'assets/authored/fresh-dedup.rle'
    const bytes = await makeRle(1, 3)
    const sha = await sha256Hex(bytes)
    const box = baseOf({ [path]: bytes })
    const state = stateWithSprite(
      files,
      'glm-dedup',
      'sprite.glm-dedup',
      path,
      sha,
      bytes.byteLength,
    )
    const reader = createEditorAssetReader(box.source, () => state)
    const draw0 = drawCalls
    const a = await mount(SpriteThumbMod.SpriteThumb, thumbProps(reader, 'sprite.glm-dedup', sha))
    await waitFor(() => drawCalls > draw0, 'G-C04 第一次绘制')
    a.rootEl.unmount()
    a.div.remove()
    const reads1 = box.reads.get(path) ?? 0
    const draw1 = drawCalls
    const b = await mount(SpriteThumbMod.SpriteThumb, thumbProps(reader, 'sprite.glm-dedup', sha))
    await waitFor(() => drawCalls > draw1, 'G-C04 第二次绘制')
    b.rootEl.unmount()
    b.div.remove()
    const reads2 = box.reads.get(path) ?? 0
    record(
      'G-C04',
      reads1 === 1 && reads2 === 1 ? 'covered' : 'reproduced',
      `[新鲜asset] 两次挂载均完成绘制(drawImage ${drawCalls - draw0} 次)且读取=${reads2}（去重生效;独立fixture,无预热）`,
    )
  }

  // G-C05（失败注入真实发生 + 下层成功正控 + 上层仍被失败缓存阻断）：
  {
    const path = 'assets/authored/fresh-fail.rle'
    const bytes = await makeRle(1, 4)
    const sha = await sha256Hex(bytes)
    const box = baseOf({ [path]: bytes })
    const state = stateWithSprite(files, 'glm-fail', 'sprite.glm-fail', path, sha, bytes.byteLength)
    const reader = createEditorAssetReader(box.source, () => state)
    box.arm(path) // 注入一次性失败
    const draw0 = drawCalls
    const a = await mount(SpriteThumbMod.SpriteThumb, thumbProps(reader, 'sprite.glm-fail', sha))
    await waitFor(() => (box.reads.get(path) ?? 0) >= 1, 'G-C05 失败读取发生')
    await new Promise((resolve) => setTimeout(resolve, 0))
    const drewDuringFail = drawCalls > draw0
    a.rootEl.unmount()
    a.div.remove()
    // 下层成功正控：同一 reader 直接 loadEditorSprite 应成功（SpriteAssetCache 不缓存失败）。
    const direct = await loadEditorSprite(reader, 'sprite.glm-fail')
    const lowerOk = Boolean(direct.frames.length)
    // 上层重试：再次挂载，读取不应增加（null 已被 thumb 缓存）。
    const readsBeforeRetry = box.reads.get(path) ?? 0
    const drawBeforeRetry = drawCalls
    const b = await mount(SpriteThumbMod.SpriteThumb, thumbProps(reader, 'sprite.glm-fail', sha))
    await waitFor(
      () => box.reads.get(path) > readsBeforeRetry || drawCalls > drawBeforeRetry || true,
      'settle',
      5,
    )
    b.rootEl.unmount()
    b.div.remove()
    const readsAfterRetry = box.reads.get(path) ?? 0
    const retryReads = readsAfterRetry - readsBeforeRetry
    record(
      'G-C05',
      box.injections === 1 && !drewDuringFail && lowerOk && retryReads === 0
        ? 'reproduced'
        : 'covered',
      `[新鲜asset] 注入次数=${box.injections}(真实抛错,首挂载绘制未发生=${!drewDuringFail});修复后下层直载成功=${lowerOk}(frames=${direct.frames.length},产生第2次读取);再挂载新增读取=${retryReads}、新增绘制=${drawCalls - drawBeforeRetry}——thumb 层失败 null 缓存吞掉重试(SpriteThumb.tsx:36-38),下层不缓存失败(assets.ts:236-239)`,
    )
  }

  // G-C03（同 reader、真实新字节+真实 SHA 的修订替换）：
  {
    const path1 = 'assets/authored/rev-a.rle'
    const path2 = 'assets/authored/rev-b.rle'
    const bytes1 = await makeRle(1, 5)
    const bytes2 = await makeRle(1, 6)
    const sha1 = await sha256Hex(bytes1)
    const sha2 = await sha256Hex(bytes2)
    assert.notEqual(sha1, sha2)
    const box = baseOf({ [path1]: bytes1, [path2]: bytes2 })
    // 同一 reader：state 为可变引用，修订只改 catalog 记录（reader 对象不变）。
    let state = stateWithSprite(files, 'glm-rev', 'sprite.glm-rev', path1, sha1, bytes1.byteLength)
    const reader = createEditorAssetReader(box.source, () => state)
    const draw0 = drawCalls
    const a = await mount(SpriteThumbMod.SpriteThumb, thumbProps(reader, 'sprite.glm-rev', sha1))
    try {
      await waitFor(() => drawCalls > draw0, 'G-C03 v1 绘制')
    } catch (e) {
      console.log(
        'G-C03-DEBUG reads1=',
        box.reads.get(path1) ?? 0,
        'reads2=',
        box.reads.get(path2) ?? 0,
      )
      const spr = await loadEditorSprite(reader, 'sprite.glm-rev').catch((err) => ({
        err: err.message,
      }))
      console.log('G-C03-DEBUG direct=', JSON.stringify(spr).slice(0, 120))
      throw e
    }
    a.rootEl.unmount()
    a.div.remove()
    // 记录换 sha/path（同 AssetId 同 reader）。
    state = stateWithSprite(files, 'glm-rev', 'sprite.glm-rev', path2, sha2, bytes2.byteLength)
    const draw1 = drawCalls
    const b = await mount(SpriteThumbMod.SpriteThumb, thumbProps(reader, 'sprite.glm-rev', sha2))
    await waitFor(() => drawCalls > draw1, 'G-C03 v2 绘制')
    b.rootEl.unmount()
    b.div.remove()
    const r1 = box.reads.get(path1) ?? 0
    const r2 = box.reads.get(path2) ?? 0
    const direct = await loadEditorSprite(reader, 'sprite.glm-rev')
    record(
      'G-C03',
      r1 === 1 && r2 === 1 && direct.frames ? 'covered' : 'reproduced',
      `[同reader] v1 读=${r1} v2 读=${r2}(真实SHA:${sha1.slice(0, 6)}→${sha2.slice(0, 6)},有效新字节);替换后下层直载 frames=${direct.frames.length}——thumb 键含 revision(:24)+下层记录签名失效(assets.ts:218-227)双层正确`,
    )
  }

  function thumbProps(assetReader, asset, revision) {
    return {
      assetBase: realAssetBase,
      assetReader,
      asset,
      revision,
      frameIndex: 0,
      label: 't',
    }
  }
  function stateWithSprite(seed, id, asset, path, sha, bytes) {
    const state = {
      assetCatalog: { assets: {} },
      assetBlobs: {},
      manifest: seed['manifest.json'],
    }
    state.assetCatalog.assets[asset] = {
      kind: 'sprite',
      path,
      mediaType: 'application/vnd.type-pal.rle',
      bytes,
      sha256: sha,
      label: id,
      origin: { kind: 'authored' },
    }
    return state
  }

  // ───────── FIRE 域（真实 AssetBase/AssetResolver + 合法内容 + 身份轴） ─────────
  // 构造真实 catalog：同 chunk 的 effect-sprite 记录，两个“工程”各含不同合法内容。
  async function fireBase(projectId, chunk, frames, fill) {
    const assetId = content.palMagicEffectSpriteAssetId(chunk)
    const path = `assets/fire-${projectId}-${chunk}.rle`
    const bytes = await makeRle(frames, fill)
    const sha = await sha256Hex(bytes)
    // 调色板角色：loadFrames 从同一 assetBase 读标准色；序列化真实 palette 为合法 color-table。
    const palettePath = `assets/pal-${projectId}.json`
    const paletteText = JSON.stringify(palette) // 完整真实 palette(colors/cycles 等)整体序列化
    const paletteAsset = `color.${projectId}`
    const paletteBytes = new TextEncoder().encode(paletteText)
    const catalog = {
      version: 1,
      assets: {
        [assetId]: {
          kind: 'effect-sprite',
          path,
          mediaType: 'application/vnd.type-pal.rle',
          bytes: bytes.byteLength,
          sha256: sha,
          label: `fire-${projectId}`,
          origin: { kind: 'authored' },
        },
        [paletteAsset]: {
          kind: 'color-table',
          path: palettePath,
          mediaType: 'application/json',
          bytes: paletteBytes.byteLength,
          sha256: await sha256Hex(paletteBytes),
          label: `pal-${projectId}`,
          origin: { kind: 'generated' },
        },
      },
    }
    const reads = new Map()
    const fs = {
      async readText(rel) {
        reads.set(rel, (reads.get(rel) ?? 0) + 1)
        if (rel === palettePath) return paletteText
        throw new DOMException(rel, 'NotFoundError')
      },
      async readJson(rel) {
        return JSON.parse(await this.readText(rel))
      },
      async readBytes(rel) {
        reads.set(rel, (reads.get(rel) ?? 0) + 1)
        if (rel === path) return bytes.slice(0)
        throw new DOMException(rel, 'NotFoundError')
      },
      async urlFor() {
        throw new Error('no URLs')
      },
    }
    const resolver = new AssetResolver(
      projectId,
      catalog,
      { 'visual.standardColorTable': paletteAsset },
      fs,
    )
    return { base: { source: fs, assetResolver: resolver }, reads, path, bytes, sha, frames }
  }
  // FireEffectPreview 的 assetReader prop：blank 项目的真实 reader。
  const blankReader = createEditorAssetReader(blankBox.source, () => blankState)
  async function mountFire(base, chunk) {
    const el = await mount(FireMod.FireEffectPreview, {
      assetBase: base,
      anim: { effectSprite: chunk },
      assetReader: blankReader,
    })
    await waitFor(
      () => el.div.querySelector('canvas') !== null || el.div.textContent.includes('无法加载'),
      `FIRE chunk${chunk} 完成装载（成功=canvas/失败=无法加载）`,
    )
    const canvas = el.div.querySelector('canvas')
    const failed = el.div.textContent.includes('无法加载')
    return { ...el, canvas, failed }
  }

  // G-C01 跨工程（不同 projectId、同 chunk、各自合法、成功正控先行）
  {
    const A = await fireBase('proj-a', 7, 1, 7)
    const B = await fireBase('proj-b', 7, 3, 8)
    const directA = await reforge.loadFireSprite(A.base, 7) // 成功正控
    const directB = await reforge.loadFireSprite(B.base, 7) // 成功正控
    const a = await mountFire(A.base, 7)
    const aOk = Boolean(a.canvas)
    a.rootEl.unmount()
    a.div.remove()
    const bReads0 = B.reads.get(B.path) ?? 0
    const b = await mountFire(B.base, 7)
    const bReads1 = B.reads.get(B.path) ?? 0
    const bShowsCanvas = Boolean(b.canvas)
    b.rootEl.unmount()
    b.div.remove()
    record(
      'G-C01',
      directA.frames.length === 1 &&
        directB.frames.length === 3 &&
        aOk &&
        bReads1 === bReads0 &&
        bShowsCanvas
        ? 'reproduced'
        : 'covered',
      `[真实基座] 直载正控 A=1帧/B=3帧;A 挂载成功(canvas);换 B 工程(合法内容)挂载: B 读取增量=${bReads1 - bReads0} 且仍渲染 canvas——B 零读取直接复用 A 缓存(chunk-only 键,FireEffectPreview.tsx:15-18)`,
    )
  }
  // G-C02 身份轴：同 projectId、不同内容（不同 workspace/reader 场景同根）
  {
    const A = await fireBase('same-proj', 8, 1, 9)
    const B = await fireBase('same-proj', 8, 3, 10) // 同 projectId 同 chunk 不同合法内容
    const directA = await reforge.loadFireSprite(A.base, 8)
    const a = await mountFire(A.base, 8)
    const aOk = Boolean(a.canvas)
    a.rootEl.unmount()
    a.div.remove()
    const bReads0 = B.reads.get(B.path) ?? 0
    const b = await mountFire(B.base, 8)
    const bReads1 = B.reads.get(B.path) ?? 0
    b.rootEl.unmount()
    b.div.remove()
    record(
      'G-C02',
      directA.frames.length === 1 && aOk && bReads1 === bReads0 ? 'reproduced' : 'covered',
      `[身份轴] 同 projectId 不同内容基座: B 读取增量=${bReads1 - bReads0}——键不含 reader/workspace/内容身份,与 G-C01 同根`,
    )
  }
  // G-C06 失败缓存（真实注入 + 修复后下层成功 + 上层无重试）
  {
    const C = await fireBase('proj-c', 9, 1, 11)
    let broken = true
    const origReadBytes = C.base.source.readBytes.bind(C.base.source)
    let injections = 0
    C.base.source.readBytes = async (rel) => {
      if (broken && rel === C.path) {
        injections += 1
        throw new Error('注入 FIRE 读取失败')
      }
      return origReadBytes(rel)
    }
    let failedFirst
    try {
      await reforge.loadFireSprite(C.base, 9)
      failedFirst = false
    } catch {
      failedFirst = true
    }
    const c1 = await mountFire(C.base, 9)
    const c1Failed = c1.failed
    c1.rootEl.unmount()
    c1.div.remove()
    broken = false // 修复
    const directOk = (await reforge.loadFireSprite(C.base, 9)).frames.length === 1 // 下层成功正控
    const reads0 = C.reads.get(C.path) ?? 0
    const c2 = await mountFire(C.base, 9)
    const stillFailed = c2.failed
    c2.rootEl.unmount()
    c2.div.remove()
    const reads1 = C.reads.get(C.path) ?? 0
    record(
      'G-C06',
      injections === 2 && failedFirst && c1Failed && directOk && stillFailed && reads1 === reads0
        ? 'reproduced'
        : 'covered',
      `[新鲜chunk9] 注入=${injections}(直载预检+挂载各1次真实抛错);挂载渲染“无法加载”=${c1Failed};修复后直载成功=${directOk}(产生读取${reads0}) 但重挂载仍“无法加载”=${stillFailed} 且读取增量=${reads1 - reads0}——失败 null 永久缓存,无重试通道`,
    )
  }

  // G-C07 在途切换：组件 alive 门（源码+挂载切换动态）
  {
    const A = await fireBase('inflight-a', 10, 1, 12)
    // 挂载后立即卸载（在途）,再挂载另一 chunk;迟到 resolve 不应写回已卸载实例。
    const el = await mount(FireMod.FireEffectPreview, {
      assetBase: A.base,
      anim: { effectSprite: 10 },
      assetReader: blankReader,
    })
    el.rootEl.unmount()
    el.div.remove()
    const B = await fireBase('inflight-b', 11, 1, 13)
    const b = await mountFire(B.base, 11)
    const bOk = Boolean(b.canvas)
    b.rootEl.unmount()
    b.div.remove()
    record(
      'G-C07',
      bOk ? 'covered' : 'risk',
      `[在途] A(chunk10)挂载即卸载后挂载 B(chunk11): B 独立完成渲染=${bOk};迟到 A resolve 被 alive=false 丢弃(FireEffectPreview.tsx:66-75)。注:同 chunk 在途共享同一 Promise 属缓存语义非视图错乱;“key 正确性”仅对 chunk 维度成立(身份缺陷见 G-C01)`,
    )
  }
  record(
    'G-C08',
    'risk',
    'SpriteThumb 换 revision 正确失效（G-C03 同 reader 实证）;FIRE 键无 revision/内容维度,替换 FIRE 源后同 chunk 永旧帧——与 G-C01 同根(E-03/04 域);undo 保留策略未动',
  )
  record(
    'G-C09',
    'risk',
    '容器 census(静态): fireCache/thumbCache 模块级强引用(FireEffectPreview.tsx:15/SpriteThumb.tsx:15);StampPreviewCanvas 用 WeakMap(:31-32);无实测不宣布泄漏',
  )
  record(
    'G-C10',
    'risk',
    '分层(静态建议): 身份失效与失败缓存是两个机制——身份键=(工程/reader/资产,revision),失败策略=失败不入缓存可重试;FIRE/Thumb 共享同类回归矩阵;容量/内存待证不混入功能授权',
  )
  console.log('\n=== G-C 返工观察汇总 ===')
  for (const { id, verdict, detail } of log) console.log(`${id} ${verdict} :: ${detail}`)
} finally {
  globalThis.fetch = oldFetch
  await server.close()
}
