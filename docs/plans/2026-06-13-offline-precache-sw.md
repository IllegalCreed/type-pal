# 离线资源预缓存(Service Worker)Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 启动通过"必要资源"门后即可开始游戏,Service Worker 在后台把全部 ~579MB / ~76,000 个 `/extracted` 资源预缓存进 Cache Storage,canvas 外右上角显示后台进度;此后所有过场/切场景/音乐零冷加载卡顿,且支持离线再玩。

**Architecture:** 手写 Service Worker(`public/sw.js`,根作用域)——① 运行时对 `/extracted/*` 与构建产物 `/assets/*` 做 cache-first;② 收到页面 `postMessage({type:'precache'})` 后按节流并发遍历资源清单、逐个 `cache.put`、可断点续传(已缓存跳过)、定期 `postMessage` 进度。页面侧 `precache-client.ts` 仅在 `import.meta.env.PROD` 注册 SW(dev/e2e 自动关)、申请持久化存储、在 boot 门后触发预缓存并转发进度给 `precache-ui.ts`(固定右上角 DOM 进度条)。资源清单由 pal-extract 生成 `asset-manifest.json`(全文件路径+字节+内容版本),版本变更触发整缓存失效。

**Tech Stack:** TypeScript / Vite v8 / 原生 Service Worker + Cache Storage API / Node fs(提取器清单)/ vitest(jsdom)。

---

## 设计要点 / 约束(实现前必读)

- **`putImageData` 写 320×200 背衬,渲染分辨率固定**——本特性只缓存资源,不改渲染。
- **不能把 579MB 解码进内存**:SW 只 `fetch` + `cache.put`(存压缩字节到磁盘 Cache Storage),运行时命中缓存再由各 loader 解码当前块。
- **规模是请求数不是字节**:~76,000 个文件 → 预缓存循环必须**节流并发**(默认 8)、**可断点续传**(每个先 `cache.match`,命中即跳过)、**分批让出**,否则饿死前台 fetch(切场景/起 BGM)。
- **dev/e2e 必须关 SW**:`import.meta.env.PROD` 门;e2e 走 `E2E=1 vite dev`(非 build)→ PROD=false → 不注册。
- **SW 脚本自更新**:`register('/sw.js', { updateViaCache: 'none' })` 让浏览器不走 HTTP 缓存取 sw.js,绕开 nginx `max-age=604800` 导致 SW 永不更新的坑。
- **版本失效**:`asset-manifest.json.version`(全文件 path:size 的哈希)变更(重跑 `pnpm extract` 后)→ SW 清旧缓存重新预缓存,避免路径不变但内容变的陈旧资源。
- **兜底**:SW 不可用 / 未注册 / 预缓存未覆盖到的资源 → 各 loader 的原 `fetch` 照常按需拉(**绝不比现状差**)。
- **现有 fetch 包装链**([fetch-retry.ts](../../packages/game/src/shell/fetch-retry.ts) + [boot-loading.ts](../../packages/game/src/shell/boot-loading.ts))在 JS 层;SW 在网络层之下,二者天然共存(JS fetch → SW intercept)。

## File Structure

- **Create** `packages/pal-extract/src/resources/asset-manifest.ts` — 纯函数 `buildManifest(entries)` + 目录遍历 `collectAssetEntries(dir)`,产出 `{version, totalBytes, fileCount, files:[{path,size}]}`。
- **Modify** `packages/pal-extract/src/cli.ts` — `main()` 末尾写 `data/extracted/asset-manifest.json`。
- **Create** `packages/game/public/sw.js` — 原生 Service Worker(运行时 cache-first + 消息驱动后台预缓存)。**纯 vanilla JS,不经 vite 打包**,浏览器验证为主。
- **Create** `packages/game/src/shell/precache-client.ts` — SW 注册(PROD 门)+ 持久化申请 + 触发预缓存 + 进度消息转发。
- **Create** `packages/game/src/shell/precache-ui.ts` — 右上角固定 DOM 进度小组件。
- **Modify** `packages/game/src/main.ts` — bootstrap 成功后接入 SW 注册 + 进度 UI。
- **Test** `packages/pal-extract/src/__tests__/asset-manifest.test.ts`、`packages/game/src/shell/precache-client.test.ts`、`packages/game/src/shell/precache-ui.test.ts`。
- **Modify** `scripts/deploy.sh` — 仅加注释/校验(清单随 extracted rsync、sw.js 随 dist 自动带,无需新步骤;补 nginx sw.js 缓存头提示)。

---

### Task 1: 资源清单生成(pal-extract)

**Files:**
- Create: `packages/pal-extract/src/resources/asset-manifest.ts`
- Test: `packages/pal-extract/src/__tests__/asset-manifest.test.ts`
- Modify: `packages/pal-extract/src/cli.ts`(`main()` 末尾)

- [ ] **Step 1: 写失败测试**

```typescript
// packages/pal-extract/src/__tests__/asset-manifest.test.ts
import { describe, expect, it } from 'vitest'
import { buildManifest } from '../resources/asset-manifest.js'

describe('buildManifest', () => {
  it('聚合 files/totalBytes/fileCount,version 对内容稳定、对变化敏感', () => {
    const a = buildManifest([
      { path: 'data/items.json', size: 100 },
      { path: 'images/world/0.png', size: 50 },
    ])
    expect(a.fileCount).toBe(2)
    expect(a.totalBytes).toBe(150)
    expect(a.files[0]).toEqual({ path: 'data/items.json', size: 100 })
    // 同输入(乱序)→ 同 version(内部排序);路径或大小变 → version 变
    const b = buildManifest([
      { path: 'images/world/0.png', size: 50 },
      { path: 'data/items.json', size: 100 },
    ])
    expect(b.version).toBe(a.version)
    const c = buildManifest([
      { path: 'data/items.json', size: 101 },
      { path: 'images/world/0.png', size: 50 },
    ])
    expect(c.version).not.toBe(a.version)
  })

  it('剔除 asset-manifest.json 自身(避免自指)', () => {
    const m = buildManifest([
      { path: 'asset-manifest.json', size: 9 },
      { path: 'data/items.json', size: 100 },
    ])
    expect(m.files.map((f) => f.path)).toEqual(['data/items.json'])
    expect(m.fileCount).toBe(1)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @type-pal/pal-extract exec vitest run src/__tests__/asset-manifest.test.ts`
Expected: FAIL（`buildManifest` 未导出 / 模块不存在）

- [ ] **Step 3: 写实现**

```typescript
// packages/pal-extract/src/resources/asset-manifest.ts
import { createHash } from 'node:crypto'
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

export interface AssetEntry {
  /** 相对 extracted 根的 POSIX 路径(运行时拼成 /extracted/<path>)。 */
  path: string
  size: number
}

export interface AssetManifest {
  version: string
  totalBytes: number
  fileCount: number
  files: AssetEntry[]
}

const SELF = 'asset-manifest.json'

/** 纯函数:把文件项聚合成清单。排除自身;按 path 排序保证 version 稳定。 */
export function buildManifest(entries: AssetEntry[]): AssetManifest {
  const files = entries
    .filter((e) => e.path !== SELF)
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  const hash = createHash('sha256')
  let totalBytes = 0
  for (const f of files) {
    hash.update(`${f.path}:${f.size}\n`)
    totalBytes += f.size
  }
  return { version: hash.digest('hex').slice(0, 16), totalBytes, fileCount: files.length, files }
}

/** 递归遍历 extracted 根,收集所有文件(相对路径 + 字节)。 */
export function collectAssetEntries(rootDir: string): AssetEntry[] {
  const out: AssetEntry[] = []
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      const st = statSync(full)
      if (st.isDirectory()) walk(full)
      else out.push({ path: relative(rootDir, full).split('\\').join('/'), size: st.size })
    }
  }
  walk(rootDir)
  return out
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @type-pal/pal-extract exec vitest run src/__tests__/asset-manifest.test.ts`
Expected: PASS

- [ ] **Step 5: 接入 cli.ts(main 末尾写清单)**

在 [packages/pal-extract/src/cli.ts](../../packages/pal-extract/src/cli.ts) 顶部 import:

```typescript
import { buildManifest, collectAssetEntries } from './resources/asset-manifest.js'
```

在 `main()` 的**最后一步**(所有其它 writeJson 之后,`OUT` 已写满)追加:

```typescript
  // 全资源清单(Service Worker 离线预缓存用)。须在所有产出写完后扫盘,排除自身。
  const manifest = buildManifest(collectAssetEntries(OUT))
  writeJson(resolve(OUT, 'asset-manifest.json'), manifest)
  console.log(`[extract] asset-manifest.json: ${manifest.fileCount} files, ` +
    `${(manifest.totalBytes / 1024 / 1024).toFixed(0)}MB, version=${manifest.version}`)
```

- [ ] **Step 6: 重跑提取生成清单 + 验证**

Run: `pnpm extract && head -c 200 data/extracted/asset-manifest.json`
Expected: 看到 `{"version":"…","totalBytes":…,"fileCount":7xxxx,"files":[…`

- [ ] **Step 7: Commit**

```bash
git add packages/pal-extract/src/resources/asset-manifest.ts packages/pal-extract/src/__tests__/asset-manifest.test.ts packages/pal-extract/src/cli.ts
git commit -m "feat(extract): 生成 asset-manifest.json(全资源清单,SW 预缓存用)"
```

---

### Task 2: Service Worker — 运行时 cache-first + 激活清理

**Files:**
- Create: `packages/game/public/sw.js`

> SW 在 SW 全局上下文运行,vitest 无该环境,**本任务靠 prod build + 浏览器验证**(Task 8);此处只产出文件。

- [ ] **Step 1: 写 sw.js 骨架(缓存名/路由/激活清理)**

```javascript
// packages/game/public/sw.js — 原生 Service Worker(离线资源预缓存)。
// vanilla JS,不经 vite 打包;register 时 updateViaCache:'none' 保证本文件改动即时生效。
/* eslint-disable no-restricted-globals */
const CACHE_PREFIX = 'type-pal-'
let CACHE_NAME = `${CACHE_PREFIX}bootstrap` // 真正名字在拿到 manifest.version 后定(setCacheVersion)
const MANIFEST_URL = '/extracted/asset-manifest.json'

self.addEventListener('install', () => {
  self.skipWaiting() // 新 SW 立即接管(配合 clients.claim)
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

/** 只缓存同源 GET 的静态资源:/extracted/* 与构建产物 /assets/*。 */
function shouldCache(url) {
  if (url.origin !== self.location.origin) return false
  return url.pathname.startsWith('/extracted/') || url.pathname.startsWith('/assets/')
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (!shouldCache(url)) return // 导航/index.html/其它 → 走默认网络(SW 可自更新)
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const hit = await cache.match(req)
      if (hit) return hit
      const res = await fetch(req)
      if (res.ok) cache.put(req, res.clone())
      return res
    }),
  )
})
```

- [ ] **Step 2: 浏览器手测骨架(占位,完整验证在 Task 8)**

(暂不可独立验证;Task 4 接好注册后,Task 8 统一在 prod build 验证 SW 注册 + 二次访问命中缓存。)

- [ ] **Step 3: Commit**

```bash
git add packages/game/public/sw.js
git commit -m "feat(sw): Service Worker 骨架——/extracted 与 /assets 运行时 cache-first"
```

---

### Task 3: Service Worker — 消息驱动后台预缓存(节流/续传/进度/版本失效)

**Files:**
- Modify: `packages/game/public/sw.js`

- [ ] **Step 1: 追加预缓存逻辑**

在 sw.js 末尾追加:

```javascript
// ── 后台预缓存:页面 postMessage({type:'precache'}) 触发 ──
const CONCURRENCY = 8 // 节流并发,防饿死前台 fetch
let precaching = false

async function setCacheVersion() {
  const res = await fetch(MANIFEST_URL, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`manifest ${res.status}`)
  const manifest = await res.json()
  CACHE_NAME = `${CACHE_PREFIX}${manifest.version}`
  // 版本失效:删掉所有非当前版本的旧缓存
  const keys = await caches.keys()
  await Promise.all(
    keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map((k) => caches.delete(k)),
  )
  return manifest
}

function post(msg) {
  return self.clients.matchAll().then((cs) => cs.forEach((c) => c.postMessage(msg)))
}

async function precacheAll() {
  if (precaching) return
  precaching = true
  try {
    const manifest = await setCacheVersion()
    const cache = await caches.open(CACHE_NAME)
    const files = manifest.files
    const total = files.length
    let done = 0
    let bytes = 0
    let lastPost = 0
    const urls = files.map((f) => ({ url: `/extracted/${f.path}`, size: f.size }))
    let cursor = 0
    async function worker() {
      while (cursor < urls.length) {
        const { url, size } = urls[cursor++]
        try {
          // 续传:已缓存跳过
          if (!(await cache.match(url))) {
            const res = await fetch(url, { cache: 'no-cache' })
            if (res.ok) await cache.put(url, res.clone())
          }
          bytes += size
        } catch {
          // 单文件失败不致命:运行时按需 fetch 兜底
        }
        done++
        const now = Date.now()
        if (now - lastPost > 200 || done === total) {
          lastPost = now
          post({ type: 'precache-progress', done, total, bytes, totalBytes: manifest.totalBytes })
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    post({ type: 'precache-done', total, totalBytes: manifest.totalBytes })
  } catch (err) {
    post({ type: 'precache-error', message: String(err) })
  } finally {
    precaching = false
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'precache') void precacheAll()
})
```

> 注:`Date.now()` 在 SW 里可用(这是 SW 脚本,不是 workflow 脚本)。续传靠 `cache.match` 跳过——重载/中断后再触发会从未缓存项继续。

- [ ] **Step 2: Commit**

```bash
git add packages/game/public/sw.js
git commit -m "feat(sw): 消息驱动后台预缓存——节流并发/断点续传/进度/版本失效"
```

---

### Task 4: 页面侧 SW 客户端(注册 / 持久化 / 触发 / 进度)

**Files:**
- Create: `packages/game/src/shell/precache-client.ts`
- Test: `packages/game/src/shell/precache-client.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// packages/game/src/shell/precache-client.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerPrecache } from './precache-client.js'

function mockSW() {
  const sw = {
    register: vi.fn().mockResolvedValue({}),
    ready: Promise.resolve({ active: { postMessage: vi.fn() } }),
    controller: { postMessage: vi.fn() },
    addEventListener: vi.fn(),
  }
  Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true })
  return sw
}

afterEach(() => { vi.restoreAllMocks() })

describe('registerPrecache', () => {
  it('PROD=false(dev/e2e)→ 不注册', async () => {
    const sw = mockSW()
    await registerPrecache({ isProd: false, onProgress: () => {} })
    expect(sw.register).not.toHaveBeenCalled()
  })

  it('PROD=true → 以 updateViaCache:none 注册 /sw.js', async () => {
    const sw = mockSW()
    await registerPrecache({ isProd: true, onProgress: () => {} })
    expect(sw.register).toHaveBeenCalledWith('/sw.js', { updateViaCache: 'none' })
  })

  it('无 serviceWorker 能力 → 安全 no-op', async () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true })
    await expect(registerPrecache({ isProd: true, onProgress: () => {} })).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/shell/precache-client.test.ts`
Expected: FAIL（`registerPrecache` 不存在）

- [ ] **Step 3: 写实现**

```typescript
// packages/game/src/shell/precache-client.ts
/**
 * 离线预缓存客户端:仅生产注册 Service Worker,申请持久化存储,在 boot 门后触发后台预缓存,
 * 把 SW 的进度消息转给回调(driver:precache-ui)。dev/e2e(PROD=false)与无 SW 能力时安全 no-op。
 */
export interface PrecacheProgress {
  done: number
  total: number
  bytes: number
  totalBytes: number
}

export interface RegisterPrecacheOpts {
  isProd: boolean
  onProgress: (p: PrecacheProgress) => void
  onDone?: () => void
}

export async function registerPrecache(opts: RegisterPrecacheOpts): Promise<void> {
  if (!opts.isProd) return // dev/e2e 不挂 SW
  const swc = (navigator as Navigator).serviceWorker as ServiceWorkerContainer | undefined
  if (!swc) return // 浏览器无 SW(老环境)→ 兜底走按需 fetch

  // updateViaCache:'none' → 浏览器不用 HTTP 缓存取 sw.js,绕开 nginx 长缓存导致 SW 不更新
  await swc.register('/sw.js', { updateViaCache: 'none' })

  swc.addEventListener('message', (e: MessageEvent) => {
    const d = e.data as { type?: string } & PrecacheProgress
    if (d?.type === 'precache-progress') opts.onProgress(d)
    else if (d?.type === 'precache-done') opts.onDone?.()
  })

  // 持久化存储:避免 579MB 被浏览器配额回收(best-effort,失败不影响)
  try {
    await navigator.storage?.persist?.()
  } catch {
    /* ignore */
  }

  // 等 SW 接管后触发后台预缓存(controller 可能首访为空 → 用 ready.active)
  const reg = await swc.ready
  reg.active?.postMessage({ type: 'precache' })
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/shell/precache-client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/game/src/shell/precache-client.ts packages/game/src/shell/precache-client.test.ts
git commit -m "feat(shell): 预缓存客户端——PROD 门注册 SW + 持久化 + 触发 + 进度转发"
```

---

### Task 5: 右上角进度小组件(DOM)

**Files:**
- Create: `packages/game/src/shell/precache-ui.ts`
- Test: `packages/game/src/shell/precache-ui.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// packages/game/src/shell/precache-ui.test.ts
import { describe, expect, it } from 'vitest'
import { createPrecacheWidget } from './precache-ui.js'

describe('createPrecacheWidget', () => {
  it('挂到 document.body,update 写百分比与 MB,done 后移除', () => {
    const w = createPrecacheWidget()
    const el = document.getElementById('precache-widget')
    expect(el).not.toBeNull()
    w.update({ done: 50, total: 100, bytes: 5 * 1024 * 1024, totalBytes: 10 * 1024 * 1024 })
    expect(el!.textContent).toContain('50%')
    expect(el!.textContent).toContain('5/10MB')
    w.done()
    expect(document.getElementById('precache-widget')).toBeNull()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/shell/precache-ui.test.ts`
Expected: FAIL（`createPrecacheWidget` 不存在）

- [ ] **Step 3: 写实现**

```typescript
// packages/game/src/shell/precache-ui.ts
/** 右上角固定进度小组件:显示后台资源预缓存进度,完成后淡出移除。canvas 之外的纯 DOM。 */
import type { PrecacheProgress } from './precache-client.js'

export interface PrecacheWidget {
  update: (p: PrecacheProgress) => void
  done: () => void
}

export function createPrecacheWidget(): PrecacheWidget {
  if (typeof document === 'undefined') {
    return { update: () => {}, done: () => {} } // SSR/无 DOM 安全
  }
  const el = document.createElement('div')
  el.id = 'precache-widget'
  el.style.cssText = [
    'position:fixed', 'top:8px', 'right:8px', 'z-index:20',
    'background:rgba(17,17,17,0.82)', 'color:#9a8a6a', 'font:11px/1.4 monospace',
    'padding:6px 10px', 'border:1px solid #553322', 'border-radius:4px',
    'pointer-events:none', 'user-select:none', 'transition:opacity 0.6s ease',
  ].join(';')
  const text = document.createElement('div')
  const bar = document.createElement('div')
  bar.style.cssText = 'height:4px;margin-top:4px;background:#2a1515;border-radius:2px;overflow:hidden'
  const fill = document.createElement('div')
  fill.style.cssText = 'height:100%;width:0%;background:linear-gradient(90deg,#8a2a2a,#d8b365)'
  bar.appendChild(fill)
  el.append(text, bar)
  document.body.appendChild(el)

  const mb = (b: number): string => (b / 1024 / 1024).toFixed(0)
  return {
    update(p) {
      const pct = p.total > 0 ? Math.floor((p.done / p.total) * 100) : 0
      text.textContent = `后台缓存资源 ${pct}% (${mb(p.bytes)}/${mb(p.totalBytes)}MB)`
      fill.style.width = `${pct}%`
    },
    done() {
      el.style.opacity = '0'
      setTimeout(() => el.remove(), 600)
    },
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/shell/precache-ui.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/game/src/shell/precache-ui.ts packages/game/src/shell/precache-ui.test.ts
git commit -m "feat(shell): 右上角后台预缓存进度小组件"
```

---

### Task 6: 接入 main.ts(boot 门后启动预缓存 + UI)

**Files:**
- Modify: `packages/game/src/main.ts`

- [ ] **Step 1: 接线(bootstrap resolve 后启动)**

把 [packages/game/src/main.ts](../../packages/game/src/main.ts) 的 `void bootstrap(...)` 块改为:

```typescript
    void bootstrap(canvas)
      .then(() => {
        // boot 门已过(主循环已起、首帧可见)→ 后台预缓存全部资源,进度走右上角小组件。
        // 仅生产:dev/e2e(import.meta.env.PROD=false)内部 no-op。
        const widget = createPrecacheWidget()
        void registerPrecache({
          isProd: import.meta.env.PROD,
          onProgress: (p) => widget.update(p),
          onDone: () => widget.done(),
        })
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('bootstrap failed:', err)
        failBootLoading(msg)
        showError(canvas, msg)
      })
```

顶部补 import:

```typescript
import { registerPrecache } from './shell/precache-client.js'
import { createPrecacheWidget } from './shell/precache-ui.js'
```

- [ ] **Step 2: typecheck + 全量 check**

Run: `pnpm --filter @type-pal/game run typecheck && pnpm check`
Expected: PASS（含新 3 个测试文件)

- [ ] **Step 3: Commit**

```bash
git add packages/game/src/main.ts
git commit -m "feat(shell): boot 门后启动后台预缓存 + 进度组件(仅生产)"
```

---

### Task 7: 部署链路与 nginx 提示

**Files:**
- Modify: `scripts/deploy.sh`(仅注释/校验)

- [ ] **Step 1: 确认清单与 sw.js 自动随现有目标部署**

- `asset-manifest.json` 在 `data/extracted/` 下 → `deploy.sh data`(rsync extracted)自动带上。
- `public/sw.js` → `vite build` 拷进 `dist/sw.js` → `deploy.sh app`(tar dist)自动带上,服务于 `/sw.js`(根作用域 ✓)。
- 改了提取器 → 须 `pnpm extract` 后 `deploy.sh all`(data 同步新清单 + app 带新 sw.js/bundle)。

- [ ] **Step 2: 在 deploy.sh 顶部注释块补一行说明**

在 [scripts/deploy.sh](../../scripts/deploy.sh) 的用法注释里补:

```bash
#   注:Service Worker(dist/sw.js,register updateViaCache:'none')自更新,无需 nginx 特殊配置;
#       asset-manifest.json 随 data 目标同步。若重跑过 pnpm extract,务必用 all(data 同步新清单)。
```

- [ ] **Step 3: (服务器侧,人工)确认 sw.js 可达**

部署后:`curl -sI https://pal.illegalscreed.cn/sw.js | head -3` → 期望 `200` 且 `content-type` 为 JS。
(SW 自更新已由 `updateViaCache:'none'` 保证,nginx 长缓存不影响;无需改 nginx。)

- [ ] **Step 4: Commit**

```bash
git add scripts/deploy.sh
git commit -m "docs(deploy): 注明 SW/asset-manifest 部署随 app/data 目标自动带"
```

---

### Task 8: 生产构建端到端验证(浏览器)

**Files:** 无(验证任务)

- [ ] **Step 1: 本地 prod 构建并起静态服**

Run:
```bash
pnpm --filter @type-pal/game run build
pnpm --filter @type-pal/game exec vite preview --port 4173
```
(vite preview 是生产构建 → `import.meta.env.PROD=true` → SW 会注册。)

- [ ] **Step 2: 用 chrome-devtools MCP 打开并验证 SW + 预缓存**

- 打开 `http://localhost:4173`,等 boot 门过(进开场菜单)。
- DevTools Application → Service Workers:确认 `/sw.js` 已 activated。
- 右上角出现"后台缓存资源 N%"小组件,百分比上涨。
- Application → Cache Storage:出现 `type-pal-<version>` 缓存,条目数随进度增长。
- 等组件消失(done),Cache Storage 条目数 ≈ `fileCount`。

- [ ] **Step 3: 验证二次访问 / 离线命中缓存**

- 刷新页面 → Network 面板 `/extracted/*` 显示 `(ServiceWorker)` 来源、瞬时。
- DevTools → Network 勾 Offline → 触发一段过场(RNG)→ 正常播放(命中缓存)。
- 触发序章 RNG → 不再有冷加载停顿。

- [ ] **Step 4: 验证 dev/e2e 不挂 SW**

Run: `pnpm --filter @type-pal/game run dev`(5173)→ DevTools Application → Service Workers 应**无** type-pal SW(PROD=false)。
Run: `pnpm --filter @type-pal/game run e2e` → 全绿(SW 不干扰)。

- [ ] **Step 5: 部署**

Run: `pnpm extract && bash scripts/deploy.sh all`
然后浏览器开 `https://pal.illegalscreed.cn`,重复 Step 2-3 在生产确认(注意:首次部署后用户旧缓存版本会被新 version 失效并重新预缓存)。

---

## Self-Review

- **Spec 覆盖**:必要门后可玩(沿用现有 boot 门,Task 6 在 `.then()` 启动)✓;后台加载全部 579MB(Task 1 清单 + Task 3 预缓存)✓;canvas 外固定进度(Task 5 右上角)✓;Service Worker 全量+离线(Task 2/3)✓;不爆内存(SW 只 fetch+put,Task 3)✓;dev/e2e 关(Task 4 PROD 门)✓;版本失效(Task 3 setCacheVersion)✓;兜底(shouldCache 之外/SW 不可用 → 原 fetch)✓。
- **占位扫描**:无 TBD/TODO;每个代码步给了完整代码。
- **类型一致**:`PrecacheProgress`(client 定义,ui import)字段 `done/total/bytes/totalBytes` 全程一致;SW postMessage 的 `precache-progress` 负载字段与之对齐;`registerPrecache` 选项 `isProd/onProgress/onDone` 与 main.ts 调用一致;`createPrecacheWidget().update/done` 与 main.ts 一致。
- **已知后续(非本plan)**:① 76k 小文件请求开销大,未来可把 world 图块打包成少量归档(改资源管线 + loader)大幅降请求数;② 移动端/计费网络可加"暂停预缓存"开关。

## Execution Handoff

**Plan complete and saved to `docs/plans/2026-06-13-offline-precache-sw.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — 每个 task 派新 subagent、task 间复查。
**2. Inline Execution** — 本会话内按 executing-plans 批量执行 + 检查点。

**Which approach?**
