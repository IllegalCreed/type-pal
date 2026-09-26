/**
 * ARCH-REGRESSION-LAB-GLM-1 · V03/V04 隔离内存宿主（自有 origin lab-v4，vite dev）。
 *
 * 用法：node docs/testing/glm-architecture-regression-lab/tools/v03-v04-host.mjs <port> <ttlSeconds>
 * 启动前先跑 fixture 生成器（tools/fixture/fixture-gen.config.mts）产出
 * /tmp/type-pal-glm-lab-r2/v4-fixture/**，然后以 VITE_PROJECT_ID=lab-v4 注入本进程。
 *
 * 本宿主在产品 vite.config 之上叠加一个 lab 前置中间件（enforce:'pre' 的 connect 层，
 * 只拦 /projects/lab-v4/*，不触磁盘 serveDir）：
 *   - 工程文件全部来自内存（自有隔离 origin；不读不写用户项目/主线 projects/*）；
 *   - 故障注入（__lab__ 控制端点，浏览器应用自身从不调用）：
 *     GET /__lab__/arm?rel=<工程相对路径>&mode=500|delay&once=1&ms=2500  一次性失败 / 受控迟到
 *     GET /__lab__/disarm                                                解除全部注入
 *     GET /__lab__/state                                                 查看注入与请求台账
 *     GET /__lab__/replace?rel=<工程相对路径>&from=__lab__/icon-blue-v2.png
 *                                                        内存源内替换字节（revision 刷新用）
 *   - 每条 /projects/lab-v4 请求记入台账（rel/status/耗时），证据可复核。
 */

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const labRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// Codex may replay the same owned fixture against an isolated integration candidate.
const repoRoot = resolve(process.env.LAB_REPO_ROOT ?? resolve(labRoot, '../../..'))
const fixtureDir = process.env.LAB_V4_DIR ?? '/tmp/type-pal-glm-lab-r2/v4-fixture'
const port = Number(process.argv[2] ?? 6014)
const ttlSeconds = Number(process.argv[3] ?? 1800)

const editorRequire = createRequire(resolve(repoRoot, 'packages/editor/package.json'))
const vite = editorRequire('vite')

// ── 内存工程存储 ──
const store = new Map() // rel -> Uint8Array
let fileCount = 0
for (const rel of walk(fixtureDir)) {
  if (rel.startsWith('__lab__/') && rel !== '__lab__/icon-blue-v2.png') continue // 生成器账目不进工程
  store.set(rel, new Uint8Array(readFileSync(join(fixtureDir, rel))))
  fileCount++
}
if (!store.has('manifest.json'))
  throw new Error(`fixture missing manifest.json under ${fixtureDir}`)
const replacementSource = store.get('__lab__/icon-blue-v2.png')
if (!replacementSource)
  throw new Error('fixture missing __lab__/icon-blue-v2.png replacement source')
store.delete('__lab__/icon-blue-v2.png') // 只作替换源，不作为工程文件暴露
fileCount--

function walk(dir, base = '') {
  const { readdirSync } = editorRequire('node:fs')
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name
    if (entry.isDirectory()) out.push(...walk(join(dir, entry.name), rel))
    else out.push(rel)
  }
  return out
}

// ── 注入状态与请求台账 ──
const faults = new Map() // rel -> {mode, once, ms, armed}
const requestLog = []

const PREFIX = '/projects/lab-v4/'
const MIME = new Map([
  ['json', 'application/json'],
  ['png', 'image/png'],
  ['rle', 'application/vnd.type-pal.rle'],
])

function labMiddleware(req, res, next) {
  const url = req.url ?? ''
  if (url.startsWith('/__lab__/')) {
    const control = new URL(url, 'http://localhost')
    if (control.pathname === '/__lab__/arm') {
      const rel = control.searchParams.get('rel')
      const mode = control.searchParams.get('mode') ?? '500'
      const once = control.searchParams.get('once') !== '0'
      const ms = Number(control.searchParams.get('ms') ?? 2500)
      if (!rel || !store.has(rel)) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: `unknown rel: ${rel}` }))
        return
      }
      faults.set(rel, { mode, once, ms })
      res.end(JSON.stringify({ armed: rel, mode, once, ms }))
      return
    }
    if (control.pathname === '/__lab__/disarm') {
      faults.clear()
      res.end(JSON.stringify({ armed: [] }))
      return
    }
    if (control.pathname === '/__lab__/state') {
      res.end(JSON.stringify({ faults: [...faults.keys()], requests: requestLog.slice(-40) }))
      return
    }
    if (control.pathname === '/__lab__/replace') {
      const rel = control.searchParams.get('rel')
      if (!rel || !store.has(rel)) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: `unknown rel: ${rel}` }))
        return
      }
      store.set(rel, new Uint8Array(replacementSource))
      res.end(JSON.stringify({ replaced: rel, bytes: replacementSource.byteLength }))
      return
    }
    res.statusCode = 404
    res.end()
    return
  }
  if (!url.startsWith(PREFIX)) {
    next()
    return
  }
  const rel = decodeURIComponent(url.slice(PREFIX.length).split('?')[0])
  const started = Date.now()
  const finish = (status) => {
    requestLog.push({ rel, status, ms: Date.now() - started })
    if (requestLog.length > 400) requestLog.shift()
  }
  const bytes = store.get(rel)
  const fault = faults.get(rel)
  const applyFault = () => {
    if (!fault) return false
    if (fault.mode === '500') {
      if (fault.once) faults.delete(rel)
      finish(500)
      res.statusCode = 500
      res.setHeader('Content-Type', 'text/plain')
      res.end('LAB_V3_FAULT_500')
      return true
    }
    // delay：先按注入时长挂起，到点后放行真实字节
    const ms = fault.ms
    if (fault.once) faults.delete(rel)
    setTimeout(() => {
      if (!bytes) {
        finish(404)
        res.statusCode = 404
        res.end()
        return
      }
      finish(200)
      res.setHeader(
        'Content-Type',
        MIME.get(rel.split('.').pop() ?? '') ?? 'application/octet-stream',
      )
      res.end(Buffer.from(bytes))
    }, ms)
    return true
  }
  if (applyFault()) return
  if (!bytes) {
    finish(404)
    res.statusCode = 404
    res.end()
    return
  }
  finish(200)
  res.setHeader('Content-Type', MIME.get(rel.split('.').pop() ?? '') ?? 'application/octet-stream')
  res.setHeader('Cache-Control', 'no-store')
  res.end(Buffer.from(bytes))
}

const server = await vite.createServer({
  configFile: resolve(repoRoot, 'packages/editor/vite.config.ts'),
  root: resolve(repoRoot, 'packages/editor'),
  plugins: [
    {
      name: 'lab-v03-v04-memory-origin',
      enforce: 'pre',
      configureServer(devServer) {
        devServer.middlewares.use(labMiddleware)
      },
    },
  ],
  server: { host: '127.0.0.1', port, strictPort: true },
})
await server.listen()
console.log(
  `lab v03/v04 host ready on http://localhost:${port}/ (project lab-v4, ${fileCount} files; ttl ${ttlSeconds}s)`,
)
setTimeout(() => {
  console.log('lab host ttl reached, shutting down')
  void server.close().then(() => process.exit(0))
}, ttlSeconds * 1000)
