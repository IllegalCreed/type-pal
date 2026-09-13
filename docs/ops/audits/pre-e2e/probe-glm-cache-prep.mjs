// node --import tsx docs/ops/audits/pre-e2e/probe-glm-cache-prep.mjs
// GLM pre-e2e-prep r1 · G-C 组（预览缓存身份与重试）只读取证。
// 真实组件模块 + 模块级缓存(react 渲染触发真实 effect)；jsdom 提供 DOM 宿主、
// canvas 2d 为【呈现边界替身】(声明: 不把 stub 输出当视觉事实)；IntersectionObserver
// 替身为立即进入视口。计数读取器为 FileSource 边界。无浏览器/截图。
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
// 呈现边界替身：2d context 全 no-op；createImageData 给可写数据视图。
const fakeCtx = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === 'createImageData')
        return (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) })
      if (prop === 'canvas') return { width: 16, height: 16 }
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
const flush = () => new Promise((resolve) => setTimeout(resolve, 20))
try {
  const react = await import(req.resolve('react'))
  const { createRoot } = await import(req.resolve('react-dom/client'))
  const { buildBlankProject } = await server.ssrLoadModule('/src/core/seed.ts')
  const { toEditorState } = await server.ssrLoadModule('/src/core/project-io.ts')
  const { loadCurrentProjectFrom, loadAllAuthorScenes } = await server.ssrLoadModule(
    '/../reforge/src/project-loader.ts',
  )
  const { createEditorAssetReader } = await server.ssrLoadModule(
    '/src/core/editor-asset-reader.js',
  )
  const SpriteThumbMod = await server.ssrLoadModule('/src/ui/SpriteThumb.tsx')
  const FireMod = await server.ssrLoadModule('/src/ui/FireEffectPreview.tsx')

  const files = await buildBlankProject('glm-cache-prep')
  const get = (rel) => {
    if (!Object.hasOwn(files, rel)) throw new DOMException(rel, 'NotFoundError')
    return files[rel]
  }
  const readCounts = new Map()
  let failSpriteOnce = false
  const source = {
    async readText(rel) {
      const x = get(rel)
      return typeof x === 'string' ? x : JSON.stringify(x)
    },
    async readJson(rel) {
      return JSON.parse(await this.readText(rel))
    },
    async readBytes(rel) {
      readCounts.set(rel, (readCounts.get(rel) ?? 0) + 1)
      if (failSpriteOnce && /sprites\/starter/.test(rel)) {
        failSpriteOnce = false
        throw new Error('注入的一次性读取失败')
      }
      const x = get(rel)
      return x instanceof ArrayBuffer ? x.slice(0) : new TextEncoder().encode(x).buffer
    },
    async urlFor() {
      throw new Error('Memory fixture forbids external URLs')
    },
  }
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const state = toEditorState(project, scenes, {}, {}, [])
  const starter = Object.values(state.assetCatalog.assets).find((r) => r.kind === 'sprite')
  const starterId = Object.keys(state.assetCatalog.assets).find(
    (k) => state.assetCatalog.assets[k] === starter,
  )
  const reader = createEditorAssetReader(source, () => state)
  const host = document.getElementById('host')

  async function mountThumb(revision, asset = starterId) {
    const div = document.createElement('div')
    host.appendChild(div)
    const rootEl = createRoot(div)
    rootEl.render(
      react.createElement(SpriteThumbMod.SpriteThumb, {
        assetBase: project.assetBase,
        assetReader: reader,
        asset,
        revision,
        frameIndex: 0,
        label: 't',
      }),
    )
    await flush()
    rootEl.unmount()
    div.remove()
  }

  // G-C04 同 reader 同 revision 成功请求去重
  readCounts.clear()
  await mountThumb(starter.sha256)
  await mountThumb(starter.sha256)
  const reads = [...readCounts.entries()].filter(([p]) => p === starter.path)[0]?.[1] ?? 0
  record(
    'G-C04',
    reads === 1 ? 'covered' : 'reproduced',
    `同 asset+revision 两次挂载, ${starter.path} 读取次数=${reads}（期望 1: 去重生效,非零亦非每挂必读）`,
  )

  // G-C05 首次失败后同 reader 同 revision 的恢复
  failSpriteOnce = true
  await mountThumb(starter.sha256)
  const readsAfterFail = readCounts.get(starter.path) ?? 0
  await mountThumb(starter.sha256)
  const readsAfterRetry = readCounts.get(starter.path) ?? 0
  record(
    'G-C05',
    readsAfterFail === 1 && readsAfterRetry === 1 ? 'reproduced' : 'covered',
    `首读失败(已注入)后修复再挂载: 失败时读=${readsAfterFail}, 重试后读=${readsAfterRetry}（若保持 1 = null 被缓存、重试被吞; 期望业务上应允许恢复）`,
  )

  // G-C03 同 AssetId 真实换 revision(记录换 sha/路径) → 全链失效重读
  // 注: 仅改 revision 字符串不改记录时,下层 SpriteAssetCache 按记录签名命中(0 读)是正确去重。
  const replacedPath = 'assets/generated/sprites/starter-v2.rle'
  files[replacedPath] = files[starter.path]
  const stateV2 = structuredClone(state)
  const recV2 = stateV2.assetCatalog.assets[starterId]
  recV2.sha256 = 'v2-sha'
  recV2.path = replacedPath
  const readerV2 = createEditorAssetReader(source, () => stateV2)
  readCounts.clear()
  const div = document.createElement('div')
  host.appendChild(div)
  const rootEl = createRoot(div)
  rootEl.render(
    react.createElement(SpriteThumbMod.SpriteThumb, {
      assetBase: project.assetBase,
      assetReader: readerV2,
      asset: starterId,
      revision: 'v2-sha',
      frameIndex: 0,
      label: 't',
    }),
  )
  await flush()
  const newReads = readCounts.get(replacedPath) ?? 0
  const oldReads = readCounts.get(starter.path) ?? 0
  rootEl.unmount()
  div.remove()
  record(
    'G-C03',
    newReads === 1 && oldReads === 0 ? 'covered' : 'reproduced',
    `同 AssetId 记录换 sha/path 后挂载: 新路径读=${newReads} 旧路径读=${oldReads}（期望 1/0: thumb 键含 revision(SpriteThumb.tsx:24) + 下层 SpriteAssetCache 记录签名失效(assets.ts:218-227) 双层正确）`,
  )

  // G-C01/02 FIRE: chunk-only 键忽略工程/读取者
  const fireReads = { a: 0, b: 0 }
  const fireBase = (tag) => ({
    source: {
      async readBytes() {
        fireReads[tag] += 1
        throw new Error(`no fire asset (${tag})`)
      },
      async readText() {
        throw new Error(`no fire asset (${tag})`)
      },
      async readJson() {
        throw new Error(`no fire asset (${tag})`)
      },
    },
    assetResolver: {
      async readRoleText() {
        fireReads[tag] += 1
        throw new Error(`no palette (${tag})`)
      },
    },
  })
  async function mountFire(base) {
    const div = document.createElement('div')
    host.appendChild(div)
    const rootEl = createRoot(div)
    rootEl.render(
      react.createElement(FireMod.FireEffectPreview, {
        assetBase: base,
        anim: { effectSprite: 7 },
        assetReader: reader,
      }),
    )
    await flush()
    rootEl.unmount()
    div.remove()
  }
  const baseA = fireBase('a')
  await mountFire(baseA)
  const aReads1 = fireReads.a
  const baseB = fireBase('b')
  await mountFire(baseB)
  const bReads = fireReads.b
  record(
    'G-C01',
    aReads1 > 0 && bReads === 0 ? 'reproduced' : 'covered',
    `FIRE 同 chunk(#7)不同工程基座: A 读取=${aReads1} 后换 B 挂载, B 读取=${bReads}（B=0 即 chunk-only 键直接复用 A 的缓存结果; 键见 FireEffectPreview.tsx:15-18）`,
  )
  record(
    'G-C02',
    bReads === 0 ? 'reproduced' : 'covered',
    `同 projectId 不同 workspace/reader 场景与 G-C01 同根: 缓存键不含 reader/workspace（${bReads === 0 ? 'B 未被读取,身份被忽略' : 'B 被独立读取'}）`,
  )
  // G-C06 FIRE 失败永久 null: 修复 A 后仍无新读取
  const aReadsBefore = fireReads.a
  await mountFire(baseA)
  const aReadsAfter = fireReads.a
  record(
    'G-C06',
    aReadsBefore > 0 && aReadsAfter === aReadsBefore ? 'reproduced' : 'covered',
    `FIRE 失败后修复基座重挂载: 修复前读=${aReadsBefore}, 修复后读=${aReadsAfter}（不变 = 失败 null 被永久缓存,无重试通道）`,
  )
  // G-C07 组件在途切 B 的迟到结果(源码级)
  record(
    'G-C07',
    'covered',
    '组件层: effect cleanup alive=false 丢弃迟到 setFrames(SpriteThumb.tsx:88-107; FireEffectPreview.tsx:66-75), A 迟到 resolve 不写 B;缓存层按 key 隔离。视图归属由 alive 门与 key 双重限定',
  )
  record(
    'G-C08',
    'risk',
    '替换资源/undo 回旧 revision: SpriteThumb 键含 revision(:24),undo 回旧 SHA 命中旧缓存(正确复用);FIRE 键无 revision 概念,替换 FIRE 源后同 chunk 永远旧帧——与 G-C01 同根,判 risk 归并',
  )
  record(
    'G-C09',
    'risk',
    '缓存容器 census: fireCache=Map<number,…>(FireEffectPreview.tsx:15) 与 thumbCache=Map<string,…>(SpriteThumb.tsx:15) 为模块级强引用,关闭工程/组件不释放(可释放性无实测,不判泄漏);StampPreviewCanvas 用 WeakMap(AssetBase/Reader)(:31-32)可随宿主回收。无实测不宣布泄漏/性能缺陷',
  )
  record(
    'G-C10',
    'risk',
    '与底层 SpriteAssetCache/reader 重复保护: 编辑器三层预览缓存(FIRE/Thumb/Stamp)与 reforge AssetResolver 各自独立,无统一失效层;最小正确层建议=以(资产身份,revision)为键且失败不入缓存,失败可重试;未来回归设计需同 reader 双挂载计数+失败恢复,本探针即雏形',
  )
  console.log('\n=== G-C 观察汇总 ===')
  for (const { id, verdict, detail } of log) console.log(`${id} ${verdict} :: ${detail}`)
} finally {
  globalThis.fetch = oldFetch
  await server.close()
}
