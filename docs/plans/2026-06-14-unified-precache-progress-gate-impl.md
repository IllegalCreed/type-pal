# 统一预缓存进度 + 可玩门 + 进入解锁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> 落地设计稿 [2026-06-14-unified-precache-progress-gate.md](./2026-06-14-unified-precache-progress-gate.md)。重构已上线的 [2026-06-13-offline-precache-sw.md](./2026-06-13-offline-precache-sw.md)(6 个运行时文件,**不动提取器**——`asset-manifest.json` 的 `files/totalBytes/version` 已就绪)。

**Goal:** 把"boot 必要资源进度(fetch 计数)"与"进游戏后 SW 全量预缓存进度(右上角 widget)"两段割裂进度,合成**一条 SW 字节进度**(分母 `manifest.totalBytes` ~336MB)+ 一个**显式「进入游戏」可玩门**:越过虚线出按钮、常驻可点,用户自行决定何时进(竞速玩家可等 100%);点进入 = 一次手势同时解锁音视频,开场视频直接播,不再二次 click。

**Architecture:** SW 注册从"boot 门后"提前到 `main.ts` 最早;进度单一来源 = SW `precacheAll` 上报的 `bytes/totalBytes`,从启动到 100% 一条线。`main.ts` 创建 `enterGate: Promise<void>` 与三态进度 UI 控制器,注入 `bootstrap`;bootstrap 在 `soundfontSettled` 后 `onPlayable()`(出按钮)并 `await enterGate`(不再自动进),用户点按钮在 click 同步栈预热 video autoplay → `resolveEnter()` → 继续 trademark/splash + 主循环。SW 预缓存可玩前低并发(2)让路、进入后 `boost` 全速(8)。**PROD 且 SW 可用**才挂门;dev/e2e(`import.meta.env.PROD=false`)、老浏览器、SW 注册失败一律退化为现状(自动进游戏),绝不比现状差。

**Tech Stack:** TypeScript / Vite / 原生 Service Worker + Cache Storage / `<video>` autoplay 解锁 / vitest(jsdom DOM 测试)/ chrome-devtools MCP(prod build 浏览器验证)。

---

## 设计要点 / 约束(实现前必读)

- **解锁的同步栈陷阱**:`video.play()` 需 **transient activation**(手势后短时间内、同 task)。因此 video 预热**必须在按钮 click handler 的同步栈**调用,**不能**放在 `await enterGate` 之后(那是微任务,手势已过期)。`audio.resume()`(`AudioContext.resume`)只需 **sticky activation**(交互过即可),且 bootstrap 已挂 `window pointerdown → audio.resume()`,点按钮自动解锁——无需额外处理。
- **进度单调不回退**:SW `bytes` 天然单调上升;UI 内部再 `_shownPct = max(_shownPct, raw)` clamp 兜底。首访 SW 接管前最早几个请求不计入 → 初期从非 0 起跳(设计稿已接受)。
- **态1 不封顶 99**:竞速玩家要看到真 100%(SW 全缓存完)才进,所以态1 进度必须能到 100%(现状 boot-loading 封 99 的逻辑不适用于 SW 字节进度)。
- **PROD 乐观走 SW UI 路径**:`main.ts` 不 `await` SW ready 才启 bootstrap(会拖慢启动)。乐观建三态 UI + 注册 SW + 立即启 bootstrap;若 `serviceWorker` 不存在或 `register` 抛错 → `onUnavailable` 立即 `resolveEnter()`(门不挡,自动进,进度条停在 0/低位但能玩)。
- **dev/e2e 必须无门无 SW**:`isProd=false` 分支走 `initBootLoading()`(现状 fetch 计数)+ `resolveEnter()` 预先放行,**不**创建三态 UI 的按钮(免空 DOM 干扰 e2e 截图)。
- **不动提取器**:`asset-manifest.json` 已含 `files:[{path,size}]` / `totalBytes`(文件实际字节和 ≈ 传输 ~336MB,非 500MB 磁盘块对齐)/ `version`。本计划只改 6 个运行时文件。

## 接口契约(全程锁定,各 task 引用)

```typescript
// precache-client.ts
export interface PrecacheProgress { done: number; total: number; bytes: number; totalBytes: number }
export interface RegisterPrecacheOpts {
  isProd: boolean
  onProgress: (p: PrecacheProgress) => void
  onDone?: () => void
  onReady?: () => void        // SW 已 active 接管
  onUnavailable?: () => void   // 无 SW 能力 / 注册抛错 → 调用方自动放行门
}
export async function registerPrecache(opts: RegisterPrecacheOpts): Promise<void>
export function boostPrecache(): void   // 用户进入后:通知 SW 提并发全速

// precache-ui.ts
export interface PrecacheProgress 复用 client 的
export interface UnifiedProgressUi {
  setProgress(cachedBytes: number, totalBytes: number): void  // 态1 大条 / 态3 小条通用
  markPlayable(onEnter: () => void): void                     // 态1→态2:出「进入游戏」按钮(onEnter 在 click 同步栈)
  enterGame(): void                                           // 态2→态3:覆盖层 → 右上角半透明
  done(): void                                                // 态3:到 100% 淡出
  fail(msg: string): void                                     // 错误态(覆盖层在则改显错误)
}
export function createUnifiedProgressUi(opts?: { playableFraction?: number }): UnifiedProgressUi
export function createPrecacheWidget(): PrecacheWidget        // 保留(态3 内部复用其视觉)

// bootstrap.ts
export interface BootstrapDeps {
  onPlayable?: () => void      // soundfontSettled 后调:必要资源就绪(PROD 出按钮;dev no-op)
  enterGate?: Promise<void>    // bootstrap await 它(dev 预先 resolved → 不阻塞)
}
export async function bootstrap(canvas: HTMLCanvasElement, deps?: BootstrapDeps): Promise<void>

// avi-player.ts(新增导出)
export function warmUpVideoAutoplay(src?: string): void       // click 同步栈:muted play 一次解锁本 session video autoplay
```

## File Structure

- **Modify** `packages/game/src/shell/precache-ui.ts` — 新增 `createUnifiedProgressUi`(三态:`#boot-loading` 大条+虚线+按钮 → 右上角 widget);保留 `createPrecacheWidget`。
- **Modify** `packages/game/index.html` — `#boot-loading` 内加虚线 `#boot-loading-mark` + 按钮容器 `#boot-loading-enter`(默认隐藏)+ 对应 CSS。
- **Modify** `packages/game/src/shell/precache-client.ts` — `onReady`/`onUnavailable` 回调 + `boostPrecache()`(模块级,持 active worker)。
- **Modify** `packages/game/public/sw.js` — 让路:`INITIAL_CONCURRENCY=2` 起步,`precache-boost` 消息 spawn 到 `BOOST_CONCURRENCY=8`。
- **Modify** `packages/game/src/shell/bootstrap.ts` — `BootstrapDeps` 参数;`soundfontSettled` 后 `onPlayable()` + `await enterGate`(替换"直接 showTrademark")。
- **Modify** `packages/game/src/shell/avi-player.ts` — 新增 `warmUpVideoAutoplay`。
- **Modify** `packages/game/src/main.ts` — 协调:最早注册 SW + 建三态 UI + `enterGate` + 进入 onEnter(预热 video + enterGame + boost + resolve)+ fallback 分支。
- **Test** `precache-ui.test.ts`(扩展三态)、`precache-client.test.ts`(扩展 onReady/onUnavailable/boost)。

---

### Task 1: 三态进度 UI 控制器(precache-ui.ts)

**Files:**
- Modify: `packages/game/src/shell/precache-ui.ts`
- Test: `packages/game/src/shell/precache-ui.test.ts`

> 依赖 index.html 的 `#boot-loading`/`#boot-loading-fill`/`#boot-loading-status`/`#boot-loading-enter`(Task 2 加按钮容器,但测试用 jsdom 手搭 DOM,Task 1 可独立 TDD)。

- [ ] **Step 1: 写失败测试**(追加到 `precache-ui.test.ts`)

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createUnifiedProgressUi } from './precache-ui.js'

function mountBootLoading(): void {
  document.body.innerHTML = `
    <div id="boot-loading">
      <div id="boot-loading-bar"><div id="boot-loading-fill"></div><div id="boot-loading-mark"></div></div>
      <div id="boot-loading-status"></div>
      <div id="boot-loading-enter" hidden><button id="boot-loading-enter-btn"></button></div>
    </div>`
}

describe('createUnifiedProgressUi', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('态1 setProgress 写大条宽度与字节文本,单调不回退', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.setProgress(168 * 1024 * 1024, 336 * 1024 * 1024) // 50%
    const fill = document.getElementById('boot-loading-fill')!
    expect(fill.style.width).toBe('50%')
    expect(document.getElementById('boot-loading-status')!.textContent).toContain('168/336MB')
    ui.setProgress(84 * 1024 * 1024, 336 * 1024 * 1024)  // 回退到 25% → 不回退
    expect(fill.style.width).toBe('50%')
  })

  it('markPlayable 显示按钮,click 同步触发 onEnter', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    const onEnter = vi.fn()
    ui.markPlayable(onEnter)
    const box = document.getElementById('boot-loading-enter')!
    expect(box.hasAttribute('hidden')).toBe(false)
    document.getElementById('boot-loading-enter-btn')!.dispatchEvent(new MouseEvent('click'))
    expect(onEnter).toHaveBeenCalledOnce()
  })

  it('enterGame 移除覆盖层并建右上角 widget,之后 setProgress 走 widget', () => {
    mountBootLoading()
    const ui = createUnifiedProgressUi()
    ui.enterGame()
    expect(document.getElementById('boot-loading')).toBeNull()
    expect(document.getElementById('precache-widget')).not.toBeNull()
    ui.setProgress(336 * 1024 * 1024, 336 * 1024 * 1024)
    expect(document.getElementById('precache-widget')!.textContent).toContain('100%')
    ui.done()
    // done 后 widget 进入淡出(0.6s 后移除,这里只断言 opacity 归零)
    expect((document.getElementById('precache-widget') as HTMLElement).style.opacity).toBe('0')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/shell/precache-ui.test.ts`
Expected: FAIL（`createUnifiedProgressUi` 未导出）

- [ ] **Step 3: 实现 createUnifiedProgressUi**(在 `precache-ui.ts` 追加;保留现有 `createPrecacheWidget`)

```typescript
/**
 * 三态统一进度控制器(2026-06-14):
 *  态1 加载页:#boot-loading 大条按 SW 字节进度涨 + 虚线标可玩点。
 *  态2 可玩:markPlayable 显示「进入游戏」按钮(常驻,onEnter 在 click 同步栈调用)。
 *  态3 游戏内:enterGame 移除覆盖层 + 建右上角半透明 widget,继续到 100% 后 done 淡出。
 * 单调不回退:内部 _shownPct = max,clamp 0..100。无 #boot-loading 节点(测试/SSR 缺)安全降级。
 */
export function createUnifiedProgressUi(opts?: { playableFraction?: number }): UnifiedProgressUi {
  const byId = (id: string): HTMLElement | null =>
    typeof document === 'undefined' ? null : document.getElementById(id)
  const mb = (b: number): string => (b / 1024 / 1024).toFixed(0)

  // 虚线位置:必要资源预估占比(默认 12%;真实可玩以 onPlayable 信号为准,虚线仅作预期提示)。
  const mark = byId('boot-loading-mark')
  if (mark) mark.style.left = `${Math.round((opts?.playableFraction ?? 0.12) * 100)}%`

  let shownPct = 0
  let entered = false
  let widget: PrecacheWidget | null = null

  function paintOverlay(cachedBytes: number, totalBytes: number): void {
    const pct = totalBytes > 0 ? (cachedBytes / totalBytes) * 100 : 0
    shownPct = Math.min(100, Math.max(shownPct, pct))
    const fill = byId('boot-loading-fill')
    if (fill) fill.style.width = `${shownPct}%`
    const status = byId('boot-loading-status')
    if (status) status.textContent = `已缓存 ${mb(cachedBytes)}/${mb(totalBytes)}MB (${Math.floor(shownPct)}%)`
  }

  return {
    setProgress(cachedBytes, totalBytes) {
      if (entered) widget?.update({ done: 0, total: 0, bytes: cachedBytes, totalBytes })
      else paintOverlay(cachedBytes, totalBytes)
    },
    markPlayable(onEnter) {
      const box = byId('boot-loading-enter')
      const btn = byId('boot-loading-enter-btn')
      if (!box || !btn) { onEnter(); return } // 无按钮容器(降级)→ 直接放行
      box.removeAttribute('hidden')
      btn.addEventListener('click', () => onEnter(), { once: true })
    },
    enterGame() {
      if (entered) return
      entered = true
      const root = byId('boot-loading')
      if (root) {
        root.classList.add('boot-loading-done')
        setTimeout(() => root.remove(), 600)
      }
      widget = createPrecacheWidget() // 复用现右上角视觉
    },
    done() {
      widget?.done()
    },
    fail(msg) {
      const root = byId('boot-loading')
      if (!root || entered) return
      root.classList.add('boot-loading-error')
      const status = byId('boot-loading-status')
      if (status) status.textContent = `启动失败:${msg}`
    },
  }
}
```

> 注:`createPrecacheWidget().update(p)` 现签名取 `p.bytes/p.totalBytes`(`done/total` 仅用于百分比——但 widget 内 `pct` 用 `done/total`;态3 我们只有字节)。**Step 3b 调整 widget 百分比改用字节**(见下),保持态3 百分比 = `bytes/totalBytes`。

- [ ] **Step 3b: 让 `createPrecacheWidget` 百分比走字节**(态3 只有字节进度)

把 `precache-ui.ts` 现有 `createPrecacheWidget` 的 `update` 改为按字节算百分比:

```typescript
    update(p) {
      const pct = p.totalBytes > 0 ? Math.floor((p.bytes / p.totalBytes) * 100) : 0
      text.textContent = `后台缓存资源 ${pct}% (${mb(p.bytes)}/${mb(p.totalBytes)}MB)`
      fill.style.width = `${pct}%`
    },
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/shell/precache-ui.test.ts`
Expected: PASS（含原有 + 3 个新用例)

- [ ] **Step 5: Commit**

```bash
git add packages/game/src/shell/precache-ui.ts packages/game/src/shell/precache-ui.test.ts
git commit -m "feat(shell): 三态统一进度 UI 控制器(加载页大条+虚线+按钮 → 右上角)"
```

---

### Task 2: 加载页骨架升级(index.html 虚线 + 按钮)

**Files:**
- Modify: `packages/game/index.html`

- [ ] **Step 1: `#boot-loading-bar` 内加虚线,box 内加按钮容器**

把 [packages/game/index.html](../../packages/game/index.html) 的 `<div id="boot-loading-bar">…</div>` 与其后 status/hint 段改为:

```html
        <div id="boot-loading-bar">
          <div id="boot-loading-fill"></div>
          <div id="boot-loading-mark"></div>
        </div>
        <div id="boot-loading-status">正在加载…</div>
        <div id="boot-loading-enter" hidden>
          <button id="boot-loading-enter-btn" type="button">▶ 进入游戏</button>
        </div>
        <div class="boot-loading-hint">越过虚线即可进入;竞速玩家可等满 100%(进游戏后零网络卡顿)</div>
```

- [ ] **Step 2: 补 CSS**(加到 `<style>` 内 `#boot-loading-status` 规则附近)

```css
      #boot-loading-bar { position: relative; }
      #boot-loading-mark {
        position: absolute; top: -2px; bottom: -2px; left: 12%; width: 0;
        border-left: 2px dashed #d8b365; opacity: 0.7;
      }
      #boot-loading-enter { margin-top: 18px; }
      #boot-loading-enter-btn {
        font-family: "Songti SC", "SimSun", serif; font-size: 16px; letter-spacing: 4px;
        color: #f0e0b0; background: linear-gradient(180deg, #8a2a2a, #5a1414);
        border: 1px solid #d8b365; border-radius: 4px; padding: 8px 28px; cursor: pointer;
        box-shadow: 0 0 16px rgba(160, 30, 30, 0.6); transition: transform 0.1s ease;
      }
      #boot-loading-enter-btn:hover { transform: scale(1.05); }
      #boot-loading-enter-btn:active { transform: scale(0.97); }
```

- [ ] **Step 3: typecheck（index.html 无测试,确认不破坏构建)**

Run: `pnpm --filter @type-pal/game run typecheck`
Expected: PASS（HTML 改动不影响 tsc;真实视觉验证在 Task 8)

- [ ] **Step 4: Commit**

```bash
git add packages/game/index.html
git commit -m "feat(shell): 加载页骨架加可玩虚线 + 进入游戏按钮容器(默认隐藏)"
```

---

### Task 3: 预缓存客户端 early-register + ready/unavailable + boost(precache-client.ts)

**Files:**
- Modify: `packages/game/src/shell/precache-client.ts`
- Test: `packages/game/src/shell/precache-client.test.ts`

- [ ] **Step 1: 写失败测试**(追加用例)

```typescript
it('PROD + SW → onReady 在 ready 后触发,boostPrecache 向 active worker 发 precache-boost', async () => {
  const post = vi.fn()
  const sw = {
    register: vi.fn().mockResolvedValue({}),
    ready: Promise.resolve({ active: { postMessage: post } }),
    addEventListener: vi.fn(),
  }
  Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true })
  const onReady = vi.fn()
  await registerPrecache({ isProd: true, onProgress: () => {}, onReady })
  expect(onReady).toHaveBeenCalledOnce()
  expect(post).toHaveBeenCalledWith({ type: 'precache' })
  boostPrecache()
  expect(post).toHaveBeenCalledWith({ type: 'precache-boost' })
})

it('无 SW 能力 → onUnavailable 触发', async () => {
  Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true })
  const onUnavailable = vi.fn()
  await registerPrecache({ isProd: true, onProgress: () => {}, onUnavailable })
  expect(onUnavailable).toHaveBeenCalledOnce()
})

it('register 抛错 → onUnavailable 触发(不抛)', async () => {
  const sw = { register: vi.fn().mockRejectedValue(new Error('boom')), addEventListener: vi.fn() }
  Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true })
  const onUnavailable = vi.fn()
  await expect(registerPrecache({ isProd: true, onProgress: () => {}, onUnavailable })).resolves.toBeUndefined()
  expect(onUnavailable).toHaveBeenCalledOnce()
})
```

需要导入 `boostPrecache`:把测试顶部 import 改为 `import { boostPrecache, registerPrecache } from './precache-client.js'`。

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/shell/precache-client.test.ts`
Expected: FAIL（`onReady`/`onUnavailable`/`boostPrecache` 未实现)

- [ ] **Step 3: 实现**(重写 `precache-client.ts` 的接口与函数体)

```typescript
export interface RegisterPrecacheOpts {
  isProd: boolean
  onProgress: (p: PrecacheProgress) => void
  onDone?: () => void
  onReady?: () => void
  onUnavailable?: () => void
}

// boost 用:registerPrecache 内把 ready.active 存这里,进入后 boostPrecache() 发消息提并发。
let _activeWorker: ServiceWorker | null = null

export function boostPrecache(): void {
  _activeWorker?.postMessage({ type: 'precache-boost' })
}

export async function registerPrecache(opts: RegisterPrecacheOpts): Promise<void> {
  if (!opts.isProd) return
  const swc = (navigator as Navigator).serviceWorker as ServiceWorkerContainer | undefined
  if (!swc) { opts.onUnavailable?.(); return }

  try {
    await swc.register('/sw.js', { updateViaCache: 'none' })
  } catch (err) {
    console.warn('[precache] SW register failed, fallback to on-demand fetch:', err)
    opts.onUnavailable?.()
    return
  }

  swc.addEventListener('message', (e: MessageEvent) => {
    const d = e.data as { type?: string } & PrecacheProgress
    if (d?.type === 'precache-progress') opts.onProgress(d)
    else if (d?.type === 'precache-done') opts.onDone?.()
  })

  try { await navigator.storage?.persist?.() } catch { /* ignore */ }

  const reg = await swc.ready
  _activeWorker = reg.active ?? null
  opts.onReady?.()
  reg.active?.postMessage({ type: 'precache' }) // 低并发起步(让路);进入后 boostPrecache 提速
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/shell/precache-client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/game/src/shell/precache-client.ts packages/game/src/shell/precache-client.test.ts
git commit -m "feat(shell): 预缓存客户端 onReady/onUnavailable 回调 + boostPrecache"
```

---

### Task 4: SW 让路——低并发起步 + boost 提速(sw.js)

**Files:**
- Modify: `packages/game/public/sw.js`

> 纯 SW 上下文,vitest 无环境;本任务靠 Task 8 prod build 浏览器验证。

- [ ] **Step 1: 并发参数化 + boost 消息**

把 `sw.js` 的 `const CONCURRENCY = 8` 改为:

```javascript
// 让路:可玩前低并发不抢 boot 必要资源带宽;用户进入后 precache-boost 提到全速。
const INITIAL_CONCURRENCY = 2
const BOOST_CONCURRENCY = 8
let boosted = false
let spawnMore = null // precacheAll 运行期暴露:boost 时 spawn 额外 worker 到 BOOST
```

- [ ] **Step 2: `precacheAll` 改 worker 池可增长**

把 `precacheAll` 内从 `const urls = …` 到 `await Promise.all(Array.from(...))` 一段替换为:

```javascript
    const urls = files.map((f) => ({ url: `/extracted/${f.path}`, size: f.size }))
    let cursor = 0
    async function worker() {
      while (cursor < urls.length) {
        const { url, size } = urls[cursor++]
        try {
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
    // 可增长的 worker 池:boost 时 spawn 额外 worker(共享 cursor,从当前位置续);
    // while(length 变化) 重复 Promise.all 等到 boost 后新加的 worker 也结束。
    const pool = []
    const addWorkers = (n) => { for (let i = 0; i < n; i++) pool.push(worker()) }
    spawnMore = () => addWorkers(BOOST_CONCURRENCY - pool.length)
    addWorkers(boosted ? BOOST_CONCURRENCY : INITIAL_CONCURRENCY)
    let prevLen = -1
    while (pool.length !== prevLen) {
      prevLen = pool.length
      await Promise.all(pool)
    }
    spawnMore = null
```

- [ ] **Step 3: message handler 加 boost 分支**

把 `sw.js` 末尾 message 监听改为:

```javascript
self.addEventListener('message', (event) => {
  if (!event.data) return
  if (event.data.type === 'precache') void precacheAll()
  else if (event.data.type === 'precache-boost') {
    boosted = true
    if (spawnMore) spawnMore() // 已在跑 → 立即补 worker;未跑 → 下次 precacheAll 直接全速
  }
})
```

- [ ] **Step 4: Commit**

```bash
git add packages/game/public/sw.js
git commit -m "feat(sw): 预缓存让路——可玩前低并发 2,进入后 boost 到 8"
```

---

### Task 5: video autoplay 预热(avi-player.ts)

**Files:**
- Modify: `packages/game/src/shell/avi-player.ts`

- [ ] **Step 1: 新增 `warmUpVideoAutoplay`**(追加到 `avi-player.ts` 末尾)

```typescript
/**
 * 2026-06-14:在用户手势(「进入游戏」click)的**同步栈**调用,muted play 一个 <video> 解锁本
 * session 的 video autoplay —— 之后开场 1.mp4 的 play() 不再被浏览器拒,不弹"点击屏幕开始"。
 * video.play() 需 transient activation(手势后短时内、同 task),故必须在 click handler 同步调用,
 * 不能放到 await 之后。muted 才允许无声 autoplay;成功后立即 pause 丢弃。失败静默(playAvi 仍有
 * click overlay 兜底,最坏退回现状)。默认用即将播放的 1.mp4 预热。
 */
export function warmUpVideoAutoplay(src = '/extracted/videos/1.mp4'): void {
  if (typeof document === 'undefined') return
  try {
    const v = document.createElement('video')
    v.src = src
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'
    void v
      .play()
      .then(() => { v.pause(); v.remove() })
      .catch(() => { v.remove() })
  } catch {
    /* ignore */
  }
}
```

- [ ] **Step 2: typecheck**

Run: `pnpm --filter @type-pal/game run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/game/src/shell/avi-player.ts
git commit -m "feat(shell): warmUpVideoAutoplay——进入手势同步栈解锁 video autoplay"
```

---

### Task 6: bootstrap 可玩门(soundfontSettled 后 onPlayable + await enterGate)

**Files:**
- Modify: `packages/game/src/shell/bootstrap.ts`

- [ ] **Step 1: 导出 `BootstrapDeps`,改 `bootstrap` 签名**

把 `export async function bootstrap(canvas: HTMLCanvasElement): Promise<void> {` 改为:

```typescript
export interface BootstrapDeps {
  /** soundfontSettled 后调:必要资源就绪(PROD 出「进入游戏」按钮;dev/无门 no-op)。 */
  onPlayable?: () => void
  /** bootstrap await 它:用户点进入 / 自动放行后 resolve(dev 预先 resolved → 不阻塞)。 */
  enterGate?: Promise<void>
}

export async function bootstrap(canvas: HTMLCanvasElement, deps?: BootstrapDeps): Promise<void> {
```

- [ ] **Step 2: 在 `await soundfontSettled` 后插入可玩门**

把 bootstrap 末尾的:

```typescript
  setBootLoadingNote('音色库')
  await soundfontSettled
  setBootLoadingNote('')

  if (skipIntroBoot) {
```

改为:

```typescript
  setBootLoadingNote('音色库')
  await soundfontSettled
  setBootLoadingNote('')

  // ── 可玩门(2026-06-14)──:必要资源就绪 → 通知 UI 出「进入游戏」按钮,await 用户点(或自动放行)。
  // 不再自动进游戏。dev/e2e / SW 不可用:enterGate 已预先 resolved,onPlayable no-op → 立即通过(现状)。
  // audio 解锁:点按钮的 pointerdown 已由上方 window 监听器触发 audio.resume();此处 await 后补一次幂等保险。
  // video 解锁:由 main.ts 的 onEnter 在 click 同步栈 warmUpVideoAutoplay()(transient activation 要求)。
  deps?.onPlayable?.()
  if (deps?.enterGate) await deps.enterGate
  audio.resume()

  if (skipIntroBoot) {
```

- [ ] **Step 3: typecheck + 全量 check**

Run: `pnpm --filter @type-pal/game run typecheck && pnpm check`
Expected: PASS（bootstrap 旧调用 `bootstrap(canvas)` 仍合法——`deps` 可选;现有测试不破)

- [ ] **Step 4: Commit**

```bash
git add packages/game/src/shell/bootstrap.ts
git commit -m "feat(shell): bootstrap 可玩门——soundfont 后 await enterGate,不再自动进游戏"
```

---

### Task 7: main.ts 协调接线(最早注册 SW + 三态 UI + 门 + fallback)

**Files:**
- Modify: `packages/game/src/main.ts`

- [ ] **Step 1: 重写 main.ts 主体**

把 [packages/game/src/main.ts](../../packages/game/src/main.ts) 的 `if (typeof document !== 'undefined') { … }` 块整体替换为:

```typescript
import { bootstrap, showError } from './shell/bootstrap.js'
import { warmUpVideoAutoplay } from './shell/avi-player.js'
import { failBootLoading, initBootLoading } from './shell/boot-loading.js'
import { boostPrecache, registerPrecache } from './shell/precache-client.js'
import { createUnifiedProgressUi } from './shell/precache-ui.js'
import { installFetchRetry } from './shell/fetch-retry.js'

if (typeof document !== 'undefined') {
  const canvas = document.getElementById('screen')
  if (canvas instanceof HTMLCanvasElement) {
    installFetchRetry() // GET 网络层重试兜底,必须先于任何 fetch

    const isProd = (import.meta as unknown as { env?: { PROD?: boolean } }).env?.PROD === true

    // 可玩门:enterGate resolve 来源二选一——用户点「进入游戏」/ 自动放行(dev·e2e·SW 不可用)。
    let resolveEnter!: () => void
    const enterGate = new Promise<void>((r) => { resolveEnter = r })

    if (isProd && 'serviceWorker' in navigator) {
      // ── PROD + 有 SW 能力:统一三态进度 + 显式门(乐观;register 失败再退回自动放行)──
      const ui = createUnifiedProgressUi()
      let entered = false
      const enter = (): void => {
        if (entered) return
        entered = true
        warmUpVideoAutoplay() // ← click 同步栈:解锁 video autoplay
        ui.enterGame()        // 覆盖层 → 右上角半透明
        boostPrecache()       // 预缓存提速全速
        resolveEnter()        // 放行 bootstrap
      }
      void registerPrecache({
        isProd,
        onProgress: (p) => ui.setProgress(p.bytes, p.totalBytes),
        onDone: () => ui.done(),
        onUnavailable: () => resolveEnter(), // SW 注册失败 → 门不挡(进度停低位但能玩)
      })
      void bootstrap(canvas, {
        onPlayable: () => ui.markPlayable(enter), // 必要资源就绪 → 出按钮(常驻)
        enterGate,
      })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err)
          console.error('bootstrap failed:', err)
          ui.fail(msg)
          showError(canvas, msg)
        })
    } else {
      // ── dev/e2e(PROD=false)/ 老浏览器无 SW:退化为现状——fetch 计数进度 + 自动进游戏 ──
      initBootLoading()
      resolveEnter() // 无门:enterGate 预先放行
      void bootstrap(canvas, { enterGate })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err)
          console.error('bootstrap failed:', err)
          failBootLoading(msg)
          showError(canvas, msg)
        })
    }
  }
}
```

> 说明:dev 分支不传 `onPlayable` → bootstrap 内 `deps?.onPlayable?.()` no-op;`enterGate` 已 resolved → `await` 不阻塞;`initBootLoading()` 现状 fetch 计数照旧。PROD 分支**不**调 `initBootLoading()`(不包 fetch),进度全由 SW 字节驱动写进 `#boot-loading`。

- [ ] **Step 2: typecheck + 全量 check**

Run: `pnpm --filter @type-pal/game run typecheck && pnpm check`
Expected: PASS（全部既有 + 新测试)

- [ ] **Step 3: lint**

Run: `pnpm lint`
Expected: 无新增错误(import 顺序若报,`pnpm format` 修)

- [ ] **Step 4: Commit**

```bash
git add packages/game/src/main.ts
git commit -m "feat(shell): main 协调——最早注册 SW + 三态进度 + 可玩门 + 进入解锁/boost"
```

---

### Task 8: 生产构建端到端验证(浏览器)

**Files:** 无(验证任务)。用 chrome-devtools MCP。

> 参考 memory [sw-local-verify-cert-pitfall]:vite preview 自签证书会阻 SW register;**用 `http://localhost` 服务 dist**(非 https preview)。真离线要**停 server**(emulate Offline 对 SW 无效)。

- [ ] **Step 1: prod build + http 静态服 dist**

```bash
pnpm --filter @type-pal/game run build
pnpm --filter @type-pal/game exec vite preview --port 4173 --host localhost
```
若 preview 走 https 阻 SW,改用:`npx http-server packages/game/dist -p 4173`(纯 http)。

- [ ] **Step 2: 验证统一进度 + 可玩门 + 进入解锁**

打开 `http://localhost:4173`:
- 加载页一条大进度条从低位上涨,12% 处有虚线,文本"已缓存 x/336MB (N%)"。
- 必要资源就绪 → 冒出「▶ 进入游戏」按钮,**常驻**(进度条继续涨)。
- 点按钮 → 开场 1.mp4/2.mp4 **直接播放**,**不**弹"点击屏幕开始"。
- 进游戏后覆盖层 → 右上角半透明小进度条,继续到 100% 后淡出。
- Application → Service Workers:`/sw.js` activated;Cache Storage `type-pal-<version>` 条目随进度增长。

- [ ] **Step 3: 验证竞速路径(零网络)**

重开 `http://localhost:4173`(或清缓存首访)→ **等进度条到 100% 再点进入** → 进游戏后切场景/触发过场/起 BGM,Network 面板 `/extracted/*` 全部 `(ServiceWorker)` 来源、**无网络请求**。停 server(真离线)再玩一段过场仍正常。

- [ ] **Step 4: 验证让路效果**

清缓存首访,DevTools Network 限速(Fast 3G)→ 观察"可玩点"(按钮出现)到达时间:预缓存低并发不应明显拖慢按钮出现。点进入后 Cache Storage 增速明显加快(boost 生效)。

- [ ] **Step 5: 验证 dev/e2e 退化为现状**

```bash
pnpm --filter @type-pal/game run dev   # 5173:Application → Service Workers 应无 type-pal SW;无「进入游戏」按钮;自动进游戏
pnpm --filter @type-pal/game run e2e   # 全绿(无门、无 SW 干扰)
```

- [ ] **Step 6: 部署**(用户确认后)

```bash
bash scripts/deploy.sh app   # 仅运行时代码改动,无需 pnpm extract(manifest 未变);若 nginx 缓存旧 index.html 需硬刷(memory: prod-deploy-stale-index-cache)
```

---

## Self-Review

**Spec 覆盖**(对设计稿验收标准逐条):
- 一条进度条 0→虚线→100%,单一数据源不回退 ✓(Task 1 `setProgress` clamp + Task 7 SW 字节单一来源)。
- 越过虚线出「进入游戏」按钮并常驻 ✓(Task 1 `markPlayable` + Task 2 按钮容器 + Task 6 `onPlayable`)。
- 点进入开场视频直接播,不再二次 click ✓(Task 5 `warmUpVideoAutoplay` 在 Task 7 `enter` 的 click 同步栈)。
- 进游戏后转右上角半透明,到 100% 淡出 ✓(Task 1 `enterGame`/`done`)。
- 竞速零网络 ✓(SW cache-first 已上线;Task 8 Step 3 验证)。
- SW 不可用退化为现状可进游戏 ✓(Task 3 `onUnavailable` + Task 7 fallback 分支 `resolveEnter`)。
- dev/e2e gate 掉整套 ✓(Task 7 `isProd` 分支)。

**让路 / 进入解锁 / 让路提速**:可玩前低并发 2 → 进入 boost 8 ✓(Task 4 + Task 3 `boostPrecache` + Task 7 `enter`)。

**占位扫描**:无 TBD/TODO;每个代码步给完整代码。

**类型一致**:`PrecacheProgress{done,total,bytes,totalBytes}` 全程一致;`createPrecacheWidget().update(p)` 态3 改按 `bytes/totalBytes` 算百分比(Task 1 Step 3b)与 `setProgress(cachedBytes,totalBytes)` 对齐;`BootstrapDeps{onPlayable,enterGate}` 在 bootstrap(Task 6)与 main(Task 7)一致;`registerPrecache` 选项 `onReady/onUnavailable` 与 main 调用一致;`boostPrecache`/`warmUpVideoAutoplay` 签名跨 Task 3/5/7 一致。

**风险 / 浏览器侧不确定性**(执行中重点验证):
- video 预热能否真消除二次 click——Task 8 Step 2 实测;若个别浏览器仍拒,playAvi 的 click overlay 兜底(不比现状差)。
- 让路并发值(2/8)与虚线常量(12%)是体感参数,Task 8 实测后可微调(非阻塞)。
- PROD 下 `#boot-loading` 进度由 SW 字节驱动、不再包 fetch:确认首访 SW 未 claim 前的最早请求不计入只是"初期从非 0 起跳",不影响单调。

## Execution Handoff

文件高度耦合(main ↔ bootstrap ↔ ui ↔ client ↔ sw 五方握手,顺序依赖),**不适合并行 subagent**。采用 **Inline Execution**(superpowers:executing-plans),Task 1→7 顺序实现、每 Task 后 `pnpm check` 检查点,Task 8 浏览器统一验证。

---

## 落地记录(2026-06-14 执行完成)

8 个 commit 全部落地,`pnpm check` 绿(game 2050 + pal-extract 250)。

**计划外细化**
- Task 7 加 `gateReleased` 守卫:消除"SW 注册失败 `onUnavailable` 自动放行"与"`onPlayable` 出按钮"的竞态——放行后不再出按钮。

**Task 8 prod build 浏览器实测(chrome-devtools)逐一暴露并修复 4 处缺陷**(commit 11d1809),其中 2 处是上一版离线预缓存就埋着、被竞速路径首次踩出的:
1. **sw.js `waitUntil` 保活**:`precacheAll` 无 `waitUntil` → SW ~30s idle 被浏览器终止,预缓存停在 76% 永不到 100%(竞速玩家等满 100% 永远等不到)。改 `event.waitUntil(precacheAll())`,实测跑到 `precache-done`(321MB)。
2. **sw.js fetch handler `caches.match(req)` 跨 cache**:SW 重启后顶层 `CACHE_NAME` 重置回 `type-pal-bootstrap`、只在它里找全 miss → 退化直连打网络(破坏竞速零网络)。改跨 cache 匹配;**停 server 真离线**实测资源全命中。
3. **precache-ui 三态健壮性**:竞速玩家等满 100% 才进入时 `enterGame` 建的 widget 永不更新(空白框)→ `doneReceived` 标志(进入前已 done 不建框)+ `lastBytes` 初始化(消除空白瞬间);`precache-client` 同步让 `precache-error` 也触发 `onDone` 收尾 UI。
4. **boot-loading `render` guard**(修正本计划"boot-loading 不用改"的误判):PROD 下 bootstrap 的 `setBootLoadingNote` → `render` 抢写 `#boot-loading-status`,与统一进度"已缓存 x/336MB"互盖闪烁 → `render` 仅在 `initBootLoading` 激活(`_origFetch` 非空)时驱动。

**验证结论**
- **PROD 全流程实测通过**:SW activated、进度不闪(8 采样)、虚线 12%、按钮常驻、点进入视频**直接播**(无二次 click)、覆盖层→右上角 widget 三态、`waitUntil` 跑到 100% `done`、**真离线零网络全命中**。
- **dev 退化手动验证正常**:`E2E=1 vite dev` 下 mode 立即 `explore`、无 SW、无门、无按钮、boot-loading 正常移除。
- **e2e visual baseline 失败(a2 等)经 `checkout` 改动前对比确认为预存在**:改动前后 pixel diff 完全相同(`Received: 60050`),与本重构无关(`pnpm check` 不含 e2e,长期未跑暴露的旧 baseline 漂移)。
