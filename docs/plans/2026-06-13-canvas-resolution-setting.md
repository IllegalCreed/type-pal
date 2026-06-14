# 游戏分辨率(canvas 显示尺寸)设置 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让玩家自选 canvas 显示大小(2×–6× 整数缩放 / 适应窗口 / 全屏),解决大屏上固定 960×600 可见区域过小的问题;选择持久化,下次自动套用。

**Architecture:** 渲染层**完全不动**——内部 framebuffer 恒 320×200(`putImageData` 写背衬),"分辨率"只改 canvas 的 **CSS 显示尺寸**(配 `image-rendering:pixelated` 保持像素锐利)。新增 `display-scale.ts`(计算/套用缩放 + localStorage 持久化 + 窗口 resize 重算 + 全屏切换)与 `display-scale-ui.ts`(canvas 外左上角一个紧凑控件)。游戏纯键盘、无鼠标坐标 → **无需任何坐标重映射**,零引擎风险。

**Tech Stack:** TypeScript / DOM CSS / Fullscreen API / localStorage / vitest(jsdom)。

---

## 设计要点(实现前必读)

- **不是提升渲染分辨率**:原版就是 320×200,这里只是把同一画面在屏幕上**放大显示**(整数倍最锐利)。文案/UI 须说清,避免用户误以为会变高清。
- **整数倍最佳**:320×200 = 8:5。整数缩放(2×=640×400 … 6×=1920×1200)像素均匀锐利;"适应窗口" = 取能放进视口的**最大整数倍**(仍锐利,非铺满)。
- **持久化只存 `number | 'fit'`**:全屏是一次性手势动作(浏览器禁止无手势自动全屏),不进持久化;退出全屏回落到持久化的缩放档。
- **居中letterbox 已现成**:index.html body 是 `display:grid; place-items:center; background:#111` → canvas 自动居中、四周黑边,全屏/非整除留边天然处理。
- **resize 重算**:仅 `fit` 模式或全屏中需监听 `resize`/`fullscreenchange` 重算;固定整数档不随窗口变。

## File Structure

- **Create** `packages/game/src/shell/display-scale.ts` — 缩放核心:`computeIntegerFit` / `applyScale` / `load|saveScalePref` / `initDisplayScale`(返回 controller)/ `toggleFullscreen`。
- **Create** `packages/game/src/shell/display-scale-ui.ts` — 左上角控件(下拉档位 + 全屏按钮),调 controller。
- **Modify** `packages/game/index.html` — canvas CSS 去掉硬编码 `width:960px;height:600px`(改由 JS 设;保留 `image-rendering:pixelated` 与一个 3× 的兜底)。
- **Modify** `packages/game/src/main.ts` — 取到 canvas 后 `initDisplayScale`,boot 后挂控件。
- **Test** `packages/game/src/shell/display-scale.test.ts`。

---

### Task 1: 缩放核心(计算 + 套用 + 持久化)

**Files:**
- Create: `packages/game/src/shell/display-scale.ts`
- Test: `packages/game/src/shell/display-scale.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// packages/game/src/shell/display-scale.test.ts
import { describe, expect, it } from 'vitest'
import { applyScale, computeIntegerFit, loadScalePref, saveScalePref } from './display-scale.js'

function fakeStorage(): Storage {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    length: 0,
  } as Storage
}

describe('display-scale', () => {
  it('computeIntegerFit:取能放进视口的最大整数倍(8:5),下限 1', () => {
    expect(computeIntegerFit(1920, 1080)).toBe(5) // min(floor(1920/320)=6, floor(1080/200)=5)
    expect(computeIntegerFit(960, 600)).toBe(3)
    expect(computeIntegerFit(100, 100)).toBe(1) // 太小也保底 1×
  })

  it('load/save:默认 fit;存数字与 fit 都能回读;脏值回落 fit', () => {
    const s = fakeStorage()
    expect(loadScalePref(s)).toBe('fit')
    saveScalePref(4, s)
    expect(loadScalePref(s)).toBe(4)
    saveScalePref('fit', s)
    expect(loadScalePref(s)).toBe('fit')
    s.setItem('tp-display-scale', 'garbage')
    expect(loadScalePref(s)).toBe('fit')
  })

  it('applyScale:数字档直接乘;fit 用视口算;写 canvas.style 像素尺寸', () => {
    const c = document.createElement('canvas')
    applyScale(c, 4, 9999, 9999)
    expect(c.style.width).toBe('1280px') // 320*4
    expect(c.style.height).toBe('800px') // 200*4
    applyScale(c, 'fit', 1920, 1080)
    expect(c.style.width).toBe('1600px') // 320*5
    expect(c.style.height).toBe('1000px') // 200*5
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/shell/display-scale.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 写实现**

```typescript
// packages/game/src/shell/display-scale.ts
/**
 * canvas 显示缩放:内部渲染恒 320×200,这里只改 CSS 显示尺寸(image-rendering:pixelated 保锐利)。
 * 模式:整数倍 number(2..6) | 'fit'(放进视口的最大整数倍)。全屏是独立一次性动作,不入持久化。
 */
const BASE_W = 320
const BASE_H = 200
const STORE_KEY = 'tp-display-scale'

export type ScaleMode = number | 'fit'

function store(s?: Storage): Storage | null {
  if (s) return s
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null // 隐私模式/禁用 → 不持久化,内存默认
  }
}

/** 能放进 vw×vh 的最大整数倍(8:5),下限 1。 */
export function computeIntegerFit(vw: number, vh: number): number {
  return Math.max(1, Math.min(Math.floor(vw / BASE_W), Math.floor(vh / BASE_H)))
}

export function loadScalePref(s?: Storage): ScaleMode {
  const raw = store(s)?.getItem(STORE_KEY)
  if (raw === 'fit') return 'fit'
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : 'fit'
}

export function saveScalePref(mode: ScaleMode, s?: Storage): void {
  store(s)?.setItem(STORE_KEY, String(mode))
}

/** 把模式解析成整数缩放倍率(fit 用视口算)。 */
export function resolveScale(mode: ScaleMode, vw: number, vh: number): number {
  return mode === 'fit' ? computeIntegerFit(vw, vh) : mode
}

/** 套用到 canvas 的 CSS 尺寸。vw/vh 默认读 window(测试可注入)。 */
export function applyScale(
  canvas: HTMLCanvasElement,
  mode: ScaleMode,
  vw: number = typeof window !== 'undefined' ? window.innerWidth : BASE_W * 3,
  vh: number = typeof window !== 'undefined' ? window.innerHeight : BASE_H * 3,
): void {
  const scale = resolveScale(mode, vw, vh)
  canvas.style.width = `${BASE_W * scale}px`
  canvas.style.height = `${BASE_H * scale}px`
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/shell/display-scale.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/game/src/shell/display-scale.ts packages/game/src/shell/display-scale.test.ts
git commit -m "feat(shell): canvas 显示缩放核心(整数倍/fit + localStorage 持久化)"
```

---

### Task 2: 控制器 + 全屏 + resize 重算

**Files:**
- Modify: `packages/game/src/shell/display-scale.ts`
- Test: `packages/game/src/shell/display-scale.test.ts`(追加)

- [ ] **Step 1: 追加失败测试**

```typescript
// 追加到 display-scale.test.ts
import { initDisplayScale } from './display-scale.js'

describe('initDisplayScale 控制器', () => {
  it('setMode 持久化 + 重套;getMode 回读', () => {
    const s = fakeStorage()
    const c = document.createElement('canvas')
    const ctrl = initDisplayScale(c, s)
    expect(ctrl.getMode()).toBe('fit') // 默认
    ctrl.setMode(2)
    expect(ctrl.getMode()).toBe(2)
    expect(c.style.width).toBe('640px') // 320*2
    expect(loadScalePref(s)).toBe(2) // 已持久化
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/shell/display-scale.test.ts -t "控制器"`
Expected: FAIL（`initDisplayScale` 不存在）

- [ ] **Step 3: 追加实现**

在 display-scale.ts 末尾追加:

```typescript
export interface DisplayScaleController {
  getMode: () => ScaleMode
  setMode: (mode: ScaleMode) => void
  toggleFullscreen: () => void
}

/** 全屏切换:对 documentElement 进退全屏(canvas 由 body grid 居中letterbox)。 */
export function toggleFullscreen(): void {
  if (typeof document === 'undefined') return
  if (document.fullscreenElement) void document.exitFullscreen?.()
  else void document.documentElement.requestFullscreen?.()
}

/**
 * 初始化:载入持久化档 → 套用 → 监听 resize/fullscreenchange(fit 或全屏中重算)。
 * 返回控制器供 UI 调。
 */
export function initDisplayScale(canvas: HTMLCanvasElement, s?: Storage): DisplayScaleController {
  let mode: ScaleMode = loadScalePref(s)
  const reapply = (): void => applyScale(canvas, mode)
  reapply()
  if (typeof window !== 'undefined') {
    // fit 跟随窗口;固定整数档全屏中也按屏幕重算成 fit 显示(退出再回档位)
    window.addEventListener('resize', () => {
      if (mode === 'fit' || document.fullscreenElement) applyScale(canvas, document.fullscreenElement ? 'fit' : mode)
    })
    document.addEventListener('fullscreenchange', () => {
      applyScale(canvas, document.fullscreenElement ? 'fit' : mode)
    })
  }
  return {
    getMode: () => mode,
    setMode: (m) => {
      mode = m
      saveScalePref(m, s)
      reapply()
    },
    toggleFullscreen,
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/shell/display-scale.test.ts`
Expected: PASS（全部）

- [ ] **Step 5: Commit**

```bash
git add packages/game/src/shell/display-scale.ts packages/game/src/shell/display-scale.test.ts
git commit -m "feat(shell): 显示缩放控制器 + 全屏切换 + resize 重算"
```

---

### Task 3: 左上角控件 UI

**Files:**
- Create: `packages/game/src/shell/display-scale-ui.ts`
- Test: `packages/game/src/shell/display-scale-ui.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// packages/game/src/shell/display-scale-ui.test.ts
import { describe, expect, it, vi } from 'vitest'
import { mountDisplayScaleControl } from './display-scale-ui.js'

describe('mountDisplayScaleControl', () => {
  it('挂下拉 + 全屏按钮;选档调 setMode;点全屏调 toggleFullscreen', () => {
    const ctrl = { getMode: () => 'fit' as const, setMode: vi.fn(), toggleFullscreen: vi.fn() }
    mountDisplayScaleControl(ctrl)
    const sel = document.getElementById('display-scale-select') as HTMLSelectElement
    const btn = document.getElementById('display-scale-fs') as HTMLButtonElement
    expect(sel).not.toBeNull()
    expect(btn).not.toBeNull()
    sel.value = '4'
    sel.dispatchEvent(new Event('change'))
    expect(ctrl.setMode).toHaveBeenCalledWith(4)
    sel.value = 'fit'
    sel.dispatchEvent(new Event('change'))
    expect(ctrl.setMode).toHaveBeenCalledWith('fit')
    btn.dispatchEvent(new Event('click'))
    expect(ctrl.toggleFullscreen).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/shell/display-scale-ui.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 写实现**

```typescript
// packages/game/src/shell/display-scale-ui.ts
/** 左上角紧凑控件:档位下拉(2×–6×/适应窗口)+ 全屏按钮。canvas 外纯 DOM。 */
import type { DisplayScaleController, ScaleMode } from './display-scale.js'

export function mountDisplayScaleControl(ctrl: DisplayScaleController): void {
  if (typeof document === 'undefined') return
  if (document.getElementById('display-scale-control')) return // 幂等

  const box = document.createElement('div')
  box.id = 'display-scale-control'
  box.style.cssText = [
    'position:fixed', 'top:8px', 'left:8px', 'z-index:20',
    'display:flex', 'gap:4px', 'align-items:center',
    'background:rgba(17,17,17,0.7)', 'padding:4px 6px', 'border:1px solid #553322',
    'border-radius:4px', 'font:11px monospace', 'color:#9a8a6a', 'opacity:0.55',
    'transition:opacity 0.2s',
  ].join(';')
  box.addEventListener('mouseenter', () => (box.style.opacity = '1'))
  box.addEventListener('mouseleave', () => (box.style.opacity = '0.55'))

  const sel = document.createElement('select')
  sel.id = 'display-scale-select'
  sel.style.cssText = 'background:#1a1212;color:#d8b365;border:1px solid #553322;font:11px monospace'
  const opts: Array<[string, string]> = [
    ['fit', '适应窗口'], ['2', '2×'], ['3', '3×'], ['4', '4×'], ['5', '5×'], ['6', '6×'],
  ]
  for (const [val, label] of opts) {
    const o = document.createElement('option')
    o.value = val
    o.textContent = label
    sel.appendChild(o)
  }
  sel.value = String(ctrl.getMode())
  sel.addEventListener('change', () => {
    const v = sel.value
    const mode: ScaleMode = v === 'fit' ? 'fit' : Number(v)
    ctrl.setMode(mode)
  })

  const fs = document.createElement('button')
  fs.id = 'display-scale-fs'
  fs.textContent = '⛶'
  fs.title = '全屏'
  fs.style.cssText = 'background:#1a1212;color:#d8b365;border:1px solid #553322;cursor:pointer;font:11px monospace'
  fs.addEventListener('click', () => ctrl.toggleFullscreen())

  box.append(sel, fs)
  document.body.appendChild(box)
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/shell/display-scale-ui.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/game/src/shell/display-scale-ui.ts packages/game/src/shell/display-scale-ui.test.ts
git commit -m "feat(shell): 左上角分辨率档位控件 + 全屏按钮"
```

---

### Task 4: 接入 main.ts 与 index.html

**Files:**
- Modify: `packages/game/index.html`
- Modify: `packages/game/src/main.ts`

- [ ] **Step 1: index.html 去掉硬编码尺寸**

把 [packages/game/index.html](../../packages/game/index.html) 的:

```css
      canvas { image-rendering: pixelated; width: 960px; height: 600px; }
```

改为(保留 3× 兜底,JS 起来后即被 initDisplayScale 覆盖):

```css
      /* 显示尺寸由 display-scale.ts(initDisplayScale)按持久化档/适应窗口设;此处仅 JS 未就绪时的兜底 3×。 */
      canvas { image-rendering: pixelated; width: 960px; height: 600px; }
```

(注:仅加注释说明;数值保留作兜底。)

- [ ] **Step 2: main.ts 接线**

在 [packages/game/src/main.ts](../../packages/game/src/main.ts) 取到 canvas 后、`bootstrap` 之前初始化缩放(让首帧就用对尺寸);控件在 boot 后挂(避免遮加载层):

```typescript
    installFetchRetry()
    initBootLoading()
    const scaleCtrl = initDisplayScale(canvas) // 按持久化档/适应窗口设 canvas 显示尺寸
    void bootstrap(canvas)
      .then(() => {
        mountDisplayScaleControl(scaleCtrl) // boot 后挂左上角档位控件
        // …(若已含 Task 6 预缓存接线则并存)
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
import { initDisplayScale } from './shell/display-scale.js'
import { mountDisplayScaleControl } from './shell/display-scale-ui.js'
```

- [ ] **Step 3: 全量 check**

Run: `pnpm check`
Expected: PASS（含新增测试）

- [ ] **Step 4: Commit**

```bash
git add packages/game/index.html packages/game/src/main.ts
git commit -m "feat(shell): 接入显示缩放——首帧按持久化档,boot 后挂档位控件"
```

---

### Task 5: 浏览器验证

**Files:** 无(验证任务)

- [ ] **Step 1: dev 起服手测**

Run: `pnpm --filter @type-pal/game run dev`
- 左上角出现档位控件(悬停变亮)。
- 切 2×/4×/6× → canvas 即时变大/变小,像素锐利(无模糊)。
- 切"适应窗口" → 充满到最大整数倍;改浏览器窗口大小 → 自动重算。
- 点 ⛶ → 进全屏,画面居中放大、四周黑边;Esc 退出回到原档位。
- 刷新页面 → 上次所选档位自动套用(localStorage 生效)。

- [ ] **Step 2: 确认 e2e 不受影响**

Run: `pnpm --filter @type-pal/game run e2e`
Expected: 全绿(e2e 断言基于 320×200 内部坐标/像素,不受 CSS 显示尺寸影响;若个别用例显式断言 canvas.style 尺寸需同步更新——预期无)。

---

## Self-Review

- **Spec 覆盖**:可设分辨率/canvas 大小(Task 1 档位 + Task 3 控件)✓;大屏可见区域可调大(2×–6× + 适应窗口 + 全屏,Task 1/2)✓;持久化(localStorage,Task 1)✓。
- **占位扫描**:无 TBD;每步给完整代码。
- **类型一致**:`ScaleMode = number|'fit'` 全程一致;`DisplayScaleController.{getMode,setMode,toggleFullscreen}` 在 Task 2 定义、Task 3 UI 与 Task 4 main 一致使用;`applyScale(canvas, mode, vw?, vh?)` 签名一致。
- **零引擎风险**:渲染恒 320×200,仅改 CSS 显示尺寸;游戏纯键盘 → 无坐标重映射。
- **待你拍板的设计点**:① 改分辨率的入口用"左上角常驻 DOM 控件"(本plan)——也可改成键盘快捷键(Ctrl +/-、F 全屏)或塞进某个游戏内菜单;② 全屏用"最大整数倍(锐利,留黑边)"——也可做"分数铺满(填满但像素略不均)"。两点都易调,确认后再实现。

## Execution Handoff

**Plan complete and saved to `docs/plans/2026-06-13-canvas-resolution-setting.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — 每 task 派新 subagent、task 间复查。
**2. Inline Execution** — 本会话内按 executing-plans 批量执行 + 检查点。

**Which approach?**
