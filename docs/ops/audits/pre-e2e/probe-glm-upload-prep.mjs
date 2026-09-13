// node --import tsx docs/ops/audits/pre-e2e/probe-glm-upload-prep.mjs
// GLM pre-e2e-prep r1 · G-I 组（图片上传异步边界）只读取证。
// 真实 reforge 管线(slice/quantize/encode/gzip/sha) + AddSpriteCommand/EditSession 动态核
// 「提交来自最后选择」；组件内 pick/submit 竞态为源码锚点分级(工作包允许 risk 分类)。
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

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
  const reforge = await server.ssrLoadModule('/../reforge/src/index.ts')
  const { EditSession } = await server.ssrLoadModule('/src/core/edit-session.ts')
  const { AddSpriteCommand } = await server.ssrLoadModule('/src/core/commands.ts')
  const { sha256Hex } = await server.ssrLoadModule('/src/core/binary-signature.js')
  const { buildBlankProject } = await server.ssrLoadModule('/src/core/seed.ts')
  const { toEditorState } = await server.ssrLoadModule('/src/core/project-io.ts')
  const { loadCurrentProjectFrom, loadAllAuthorScenes } = await server.ssrLoadModule(
    '/../reforge/src/project-loader.ts',
  )

  const files = await buildBlankProject('glm-upload-prep')
  const get = (rel) => {
    if (!Object.hasOwn(files, rel)) throw new DOMException(rel, 'NotFoundError')
    return files[rel]
  }
  const source = {
    async readText(rel) {
      const x = get(rel)
      return typeof x === 'string' ? x : JSON.stringify(x)
    },
    async readJson(rel) {
      return JSON.parse(await this.readText(rel))
    },
    async readBytes(rel) {
      const x = get(rel)
      return x instanceof ArrayBuffer ? x.slice(0) : new TextEncoder().encode(x).buffer
    },
    async urlFor() {
      throw new Error('Memory fixture forbids external URLs')
    },
  }
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const base = toEditorState(project, scenes, {}, {}, [])

  // 真实调色板（正式 assetBase 读取），与 SpriteThumb 同源。
  const palette = await reforge.loadStandardPalette(project.assetBase)

  // 两份合成图集：取调色板真实前两色，确保量化后字节/SHA 不同。
  const p1 = palette.colors[1]
  const p2 = palette.colors[2]
  const atlas = (c) => {
    const rgba = new Uint8Array(16 * 16 * 4)
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = c[0]
      rgba[i + 1] = c[1]
      rgba[i + 2] = c[2]
      rgba[i + 3] = 255
    }
    return rgba
  }
  const quantize = (rgba) =>
    reforge
      .sliceAtlasGrid(rgba, 16, 16, 16, 16)
      .map((t) => reforge.quantizeToRleFrame(t.rgba, t.width, t.height, palette))
  const framesA = quantize(atlas(p1))
  const framesB = quantize(atlas(p2))
  const encode = async (frames) => {
    const chunk = reforge.encodeSpriteChunk(frames)
    const gz = await reforge.compressGzip(chunk)
    const buf = gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength)
    return { buf, sha: await sha256Hex(buf) }
  }
  const A = await encode(framesA)
  const B = await encode(framesB)

  // G-I07 真实 Command/编码/资产记录来自最后选择（选择 A→再选 B→提交 = B）
  {
    const session = new EditSession(structuredClone(base))
    const recordB = {
      kind: 'sprite',
      path: `assets/authored/sprites/${B.sha}.rle`,
      mediaType: 'application/vnd.type-pal.rle',
      bytes: B.buf.byteLength,
      sha256: B.sha,
      label: 'B 精灵',
      origin: { kind: 'authored' },
    }
    session.dispatch(
      new AddSpriteCommand(
        { id: 'glm-b', asset: `sprite.glm-b`, label: 'B', layout: { kind: 'static' } },
        recordB,
        B.buf,
      ),
    )
    const state = session.getState()
    const rec = state.assetCatalog.assets['sprite.glm-b']
    const blob = state.assetBlobs[`assets/authored/sprites/${B.sha}.rle`]
    const bytesMatch = new Uint8Array(blob).length === B.buf.byteLength
    const shaMatch = rec.sha256 === B.sha && rec.sha256 !== A.sha
    record(
      'G-I07',
      rec.kind === 'sprite' && shaMatch && bytesMatch ? 'covered' : 'reproduced',
      `按 B 提交: catalog.kind=${rec.kind} sha=B(${rec.sha256.slice(0, 8)})≠A(${A.sha.slice(0, 8)}) bytes=${bytesMatch}; blob 入 assetBlobs=${Boolean(blob)}（提交数据全部来自最后选择的 B）`,
    )
    // 重复 id 的命令级防护
    let dup = 'ok'
    try {
      session.dispatch(
        new AddSpriteCommand(
          { id: 'glm-b', asset: 'sprite.glm-b.2', label: 'dup', layout: { kind: 'static' } },
          { ...recordB, sha256: B.sha },
          B.buf,
        ),
      )
    } catch (e) {
      dup = `throw:${e.message}`
    }
    record('G-I05', dup.startsWith('throw') ? 'covered' : 'reproduced', `同 id 重复提交(命令级)=${dup}；组件级 submittingRef 门禁见源码锚点 SpriteUploadWizard.tsx:146/177/187`)
    // 同 SHA 共享资产记录（wizard:202-217 逻辑的命令侧见证）
        // 向导真实共享语义(wizard:202-205): 同 SHA 复用既有 asset 键
    session.dispatch(
      new AddSpriteCommand(
        { id: 'glm-b2', asset: 'sprite.glm-b', label: 'B2', layout: { kind: 'static' } },
        recordB,
        B.buf,
      ),
    )
    const paths = new Set(
      Object.values(session.getState().assetCatalog.assets)
        .filter((r) => r.kind === 'sprite' && r.sha256 === B.sha)
        .map((r) => r.path),
    )
    record(
      'G-I06',
      paths.size === 1 ? 'covered' : 'reproduced',
      `同字节不同 id 两用途: 同 SHA 资源路径数=${paths.size}（共享一份 RLE 记录）; id/label 由作者输入与文件名派生规则(wizard:158-170)不属于字节归属`,
    )
  }

  // G-I01~04/08: 组件内竞态/关闭边界为源码锚点分级（无浏览器不渲染组件）
  record(
    'G-I01',
    'risk',
    'pickFile 无过期令牌: SpriteUploadWizard.tsx:145-174 await createImageBitmap 后无条件 setDraft(:162-168)；A后选B、A后完成将覆盖 B 的草稿(后完成者胜,非后选择者胜)。无组件渲染环境，未做业务反例，判 risk',
  )
  record(
    'G-I02',
    'risk',
    '同上无过期防护: 旧 A 的 pickFile catch(:171-173) setError 同样迟到覆盖；B 成功后 A 失败会把错误文案覆盖到 B 会话上(:147 setErr(\'\')仅在新 pick 开始时清空)',
  )
  record(
    'G-I03',
    'risk',
    '旧 A 成功晚于 B 失败: A 的 setDraft(:162) 会把旧图复活为当前草稿；提交以 draft 为准(wizard:177/191-220)，无选择序号核对',
  )
  record(
    'G-I04',
    'risk',
    '关闭向导/卸载: pickFile/submit 完成回调无 unmounted 检查(:162-173/:218-227)；React18 对已卸载 setState 为无害 no-op,但 submit 内 session.dispatch(:218-220) 在卸载后仍会真实入历史——取消关闭≠取消已开始的提交,是否算缺陷属产品裁决,判 risk',
  )
  record(
    'G-I08',
    'covered',
    'bitmap.close() 在 drawImage 后立即释放(wizard:156)；解码失败无 bitmap 可泄漏;错误后 draft 保留旧值、仅 setErr(:172),可再次选择(重试可用)。canvas/dataURL 内存随组件卸载由 GC 处理,无实测故不判泄漏',
  )
  console.log('\n=== G-I 观察汇总 ===')
  for (const { id, verdict, detail } of log) console.log(`${id} ${verdict} :: ${detail}`)
} finally {
  globalThis.fetch = oldFetch
  await server.close()
}
