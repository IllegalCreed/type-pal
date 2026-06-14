# 生产增强工具面板(Production Tools Panel)Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在**生产构建**里(dev-panel 被 tree-shake 掉、玩家无任何调试入口)提供一个非侵入的"工具/增强"DOM 覆盖层,热键/按钮唤出,含:战斗(队伍/敌人/场地)状态查看、当前场景+地图+主角坐标、分辨率设置、**音量调节(BGM 音量 + 静音,localStorage 持久)**、存档导入导出、历史对话查询。**全部只读 + 玩家便利动作(分辨率/音量/存档),不改任何游戏逻辑/不破坏原版表现。**

**Architecture:** 新建**非 DEV 门**模块 `src/tools/`(与 `src/dev/` 区别:后者 `import.meta.env.DEV` 死代码消除,本面板生产保留)。canvas 之外纯 DOM 覆盖层,热键 `` ` ``(backquote,游戏不消费)或右下角小按钮唤出,分 tab。bootstrap **无条件**注入 `ToolsPanelDeps`(`getGs()` 实时 gs / `Save` api / 显示缩放 controller / 资源访问)。战斗只读函数从 dev-panel 抽到共享 `src/core/inspect/` 供两边复用。历史对话靠在对话提交点 push 进 `gs.dialogHistory` 环形缓冲。

**Tech Stack:** TypeScript / DOM / Vite(注意:本模块**不可**走 `import.meta.env.DEV` 门)/ IndexedDB(存档)/ vitest(jsdom)。

---

## 设计要点(实现前必读)

- **与 dev-panel 的根本区别**:dev-panel 在 `bootstrap` 里 `if (import.meta.env.DEV) setupDevPanel(...)`,生产被 DCE。本面板**无条件 setup**,故必须放 `src/tools/`(不在 `src/dev/`),且**绝不 import 任何 dev-only 模块**(否则把 dev 代码拖进生产包)。
- **只读 + 安全动作**:战斗/场景/对话 tab 纯展示;分辨率(CSS)、存档导入导出是玩家便利。**不提供改 HP/瞬移/启战等会破坏原版进程的能力**(那些留 dev-panel)。
- **不碰 320×200 渲染**:面板是 canvas 外 DOM,零引擎影响,符合"不破坏原版"。
- **gs 实时读取**:面板每次打开/刷新读 `deps.getGs()` 当前快照;战斗 tab 可 `requestAnimationFrame` 轻量轮询刷新(仅面板开启时)。
- **复用 dev-panel 纯读函数**:`readEnemyState`/`readField`/队伍状态/敌抗性现居 `dev-panel.ts`(DEV 门模块)。Task 1 先抽到 `src/core/inspect/battle-inspect.ts`(无门),dev-panel 改 import 之,两边共用,零重复。
- **存档导入导出**:`GameState` 全字段 JSON 可序列化(save/api.ts 注释 + deepClone via JSON)。导出 = 取 slot/实时 gs → `JSON.stringify` → Blob 下载;导入 = `<input type=file>` → `FileReader` → `JSON.parse` → 校验 → `Save.saveSlot`。**导入需基本校验**(版本/必要字段)防坏档。
- **历史对话**:无现成日志。在 `showDialog` 提交点(event-system.ts:1967 等)调 `pushDialogHistory(gs, text)` 入环形缓冲(cap 200),面板倒序展示。纯追加、不影响对话流程。
- **分辨率**:复用 `docs/plans/2026-06-13-canvas-resolution-setting.md` 的 `display-scale.ts`(先落那个 plan 的 Task 1-2),本面板的"分辨率 tab"内嵌其 controller。**二者择一处放控件**:本 plan 落地后,canvas-resolution plan 里"左上角常驻控件"可省,改由本面板承载(在该 plan 标注)。
- **音量**:BGM 主音量。**不依赖 spessasynth 版本音量 API**——在 `audio-midi.ts` 的 `synth.connect(ctx.destination)`(行 83)中间插一个我们自己的 `GainNode`(`synth → masterGain → ctx.destination`),暴露 `setBgmVolume(0..1)` 改 `masterGain.gain.value`;OGG 回退路径(`audio.ts` 的 `a.volume = 0.6`)同乘主音量系数。统一 `src/shell/audio-volume.ts` 持有 master volume(0..1)+ 静音,`localStorage` 持久(`tp-master-volume` / `tp-muted`),启动读回。**纯音量,不碰曲目/时序/混响**(混响关闭逻辑在 audio-midi 既有,勿动)。SFX 当前无独立通道(BGM 为主),先只做 BGM 主音量;若日后拆 SFX 通道再加第二滑块。

## File Structure

- **Create** `src/core/inspect/battle-inspect.ts` — 从 dev-panel 抽出的纯读函数(`readPartyStates`/`readEnemyStates`/`readField`),无 DEV 门。
- **Modify** `src/dev/dev-panel.ts` — 删除本地副本,改 import `src/core/inspect/battle-inspect.ts`(零行为变化)。
- **Create** `src/core/dialog-history.ts` — `pushDialogHistory` + 环形缓冲类型;`gs.dialogHistory` 字段。
- **Modify** `src/core/game-state.ts` — 加 `dialogHistory` 字段 + init。
- **Modify** `src/core/event-system.ts` — 对话提交点调 `pushDialogHistory`。
- **Create** `src/tools/save-io.ts` — `exportSaveToFile` / `parseImportedSave`(纯校验+解析)。
- **Create** `src/shell/audio-volume.ts` — 主音量 controller(`getVolume`/`setVolume`/`isMuted`/`setMuted`,localStorage 持久;调 audio-midi 的 `setBgmVolume` + audio.ts 的 OGG 音量系数)。
- **Modify** `src/shell/audio-midi.ts` — `synth → masterGain(GainNode) → destination`,导出 `setBgmVolume(0..1)`。
- **Modify** `src/shell/audio.ts` — OGG 回退 `a.volume` 乘主音量系数(暴露 `setOggVolumeScale`)。
- **Create** `src/tools/tools-panel.ts` — 面板框架(toggle/tab/挂载)+ 各 tab 渲染。
- **Modify** `src/shell/bootstrap.ts` — 无条件 `setupToolsPanel(deps)`;启动时 `audioVolume` 读回 localStorage 并应用。
- **Test** `src/core/inspect/battle-inspect.test.ts`、`src/core/dialog-history.test.ts`、`src/tools/save-io.test.ts`、`src/shell/audio-volume.test.ts`、`src/tools/tools-panel.test.ts`。

---

### Task 1: 抽出战斗只读函数到共享无门模块

**Files:**
- Create: `src/core/inspect/battle-inspect.ts`
- Test: `src/core/inspect/battle-inspect.test.ts`
- Modify: `src/dev/dev-panel.ts`

- [ ] **Step 1: 写失败测试(对照 dev-panel 现有纯函数语义)**

```typescript
// src/core/inspect/battle-inspect.test.ts
import { describe, expect, it } from 'vitest'
import { readEnemyStates, readField } from './battle-inspect.js'
import type { BattleState } from '../battle/battle-state.js'

function mkBattle(over: Partial<BattleState> = {}): BattleState {
  // 最小 battleState:1 敌、field
  return {
    enemies: [{ e: { id: 100, _name: 'E', health: 42 } as never, defeated: false } as never],
    field: { id: 7, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } } as never,
    ...(over as object),
  } as BattleState
}

describe('battle-inspect', () => {
  it('readEnemyStates:读出活敌当前血量', () => {
    const r = readEnemyStates(mkBattle())
    expect(r[0]!.health).toBe(42)
    expect(r[0]!.defeated).toBe(false)
  })
  it('readField:读出当前 field id', () => {
    expect(readField(mkBattle()).id).toBe(7)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/core/inspect/battle-inspect.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 把 dev-panel.ts 的纯读函数原样剪切到 battle-inspect.ts 并导出**

打开 [dev-panel.ts](../../packages/game/src/dev/dev-panel.ts),把 `readEnemyState`(行 227 附近)、`readField`(行 256)、队伍状态读出(行 320)、敌抗性(行 369)这几个**纯函数连同类型**移到新文件 `src/core/inspect/battle-inspect.ts`,导出。函数体**一字不改**(只换文件 + export)。统一命名:`readPartyStates` / `readEnemyStates` / `readField`(复数,内部聚合)。

```typescript
// src/core/inspect/battle-inspect.ts —— 战斗只读快照(dev-panel 与生产工具面板共用,无 DEV 门)
import type { BattleState } from '../battle/battle-state.js'
// ……(从 dev-panel 移来的 EnemyStateView / FieldView / PartyStateView 类型 + 读函数,函数体不变)
export interface EnemyStateView { idx: number; name: string; health: number; defeated: boolean /* …原字段 */ }
export function readEnemyStates(state: BattleState): EnemyStateView[] { /* 原 readEnemyState 逻辑 */ }
export interface FieldView { id: number /* …原字段 */ }
export function readField(state: BattleState): FieldView { /* 原 readField 逻辑 */ }
// readPartyStates 同理(原队伍状态读出)
```

> 实施时**照搬** dev-panel 现有实现,勿重写;此处签名为占位,真字段以 dev-panel 现状为准。

- [ ] **Step 4: dev-panel 改 import 共享模块,删本地副本**

dev-panel.ts 顶部 `import { readEnemyStates, readField, readPartyStates } from '../core/inspect/battle-inspect.js'`,删除原本地定义,调用点改用导入名。

- [ ] **Step 5: 跑测试 + 全 check 确认零行为变化**

Run: `pnpm --filter @type-pal/game exec vitest run src/core/inspect/battle-inspect.test.ts && pnpm --filter @type-pal/game run typecheck`
Expected: PASS（dev-panel 仍编译、行为不变)

- [ ] **Step 6: Commit**

```bash
git add packages/game/src/core/inspect/battle-inspect.ts packages/game/src/core/inspect/battle-inspect.test.ts packages/game/src/dev/dev-panel.ts
git commit -m "refactor(inspect): 战斗只读函数抽到无门共享模块(dev-panel + 生产面板复用)"
```

---

### Task 2: 历史对话缓冲(捕获)

**Files:**
- Create: `src/core/dialog-history.ts`
- Test: `src/core/dialog-history.test.ts`
- Modify: `src/core/game-state.ts`、`src/core/event-system.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// src/core/dialog-history.test.ts
import { describe, expect, it } from 'vitest'
import { pushDialogHistory, DIALOG_HISTORY_CAP } from './dialog-history.js'

describe('dialog-history', () => {
  it('push 追加;空/纯空白跳过', () => {
    const h: string[] = []
    pushDialogHistory(h, '你好')
    pushDialogHistory(h, '   ')
    pushDialogHistory(h, '')
    expect(h).toEqual(['你好'])
  })
  it('环形缓冲:超过 CAP 丢最旧', () => {
    const h: string[] = []
    for (let i = 0; i < DIALOG_HISTORY_CAP + 5; i++) pushDialogHistory(h, `line${i}`)
    expect(h.length).toBe(DIALOG_HISTORY_CAP)
    expect(h[0]).toBe('line5') // 最旧 5 条被丢
    expect(h[h.length - 1]).toBe(`line${DIALOG_HISTORY_CAP + 4}`)
  })
  it('连续重复行去重(同一行被多 tick re-commit 不重复入)', () => {
    const h: string[] = []
    pushDialogHistory(h, '重复')
    pushDialogHistory(h, '重复')
    expect(h).toEqual(['重复'])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/core/dialog-history.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 写实现**

```typescript
// src/core/dialog-history.ts —— 历史对话环形缓冲(生产工具面板「历史对话」用)。纯追加,不影响对话流程。
export const DIALOG_HISTORY_CAP = 200

/** 追加一行对话到历史;空/纯空白跳过;与末行相同跳过(防同一行多 tick re-commit 重复);超 CAP 丢最旧。 */
export function pushDialogHistory(history: string[], text: string): void {
  const t = text.trim()
  if (!t) return
  if (history[history.length - 1] === t) return
  history.push(t)
  if (history.length > DIALOG_HISTORY_CAP) history.splice(0, history.length - DIALOG_HISTORY_CAP)
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/core/dialog-history.test.ts`
Expected: PASS

- [ ] **Step 5: gs 加字段 + 对话提交点捕获**

[game-state.ts](../../packages/game/src/core/game-state.ts):接口加 `dialogHistory: string[]`,`createInitialGameState` 里 `dialogHistory: []`(注:历史是会话态,**不需要**入存档;若 deepClone 进存档无害,亦可在 Save 序列化前剔除,本 plan 先留默认)。

[event-system.ts](../../packages/game/src/core/event-system.ts):在 showDialog 真正提交文本处(`gs.dialogBox = startDialogLine(cmd.text, {...})`,行 1967 附近)前后加:
```typescript
import { pushDialogHistory } from './dialog-history.js'
// …提交对话行时:
pushDialogHistory(gs.dialogHistory, cmd.text)
```
(若有多个提交点 / 标题行,统一在 `startDialogLine` 调用处旁捕获;空标题行由 push 的空白跳过兜底。)

- [ ] **Step 6: 全 check**

Run: `pnpm check`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/game/src/core/dialog-history.ts packages/game/src/core/dialog-history.test.ts packages/game/src/core/game-state.ts packages/game/src/core/event-system.ts
git commit -m "feat(core): 历史对话环形缓冲 + 对话提交点捕获(生产面板用)"
```

---

### Task 3: 存档导入导出(纯逻辑)

**Files:**
- Create: `src/tools/save-io.ts`
- Test: `src/tools/save-io.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// src/tools/save-io.test.ts
import { describe, expect, it } from 'vitest'
import { serializeSave, parseImportedSave } from './save-io.js'

describe('save-io', () => {
  it('serializeSave:gs → 带版本头的 JSON 字符串', () => {
    const json = serializeSave({ wNumScene: 5, dwCash: 100 } as never)
    const obj = JSON.parse(json)
    expect(obj.format).toBe('type-pal-save')
    expect(obj.version).toBe(1)
    expect(obj.gs.wNumScene).toBe(5)
  })
  it('parseImportedSave:合法 → 返回 gs;格式错 → 抛', () => {
    const json = serializeSave({ wNumScene: 9, partyMembers: [0] } as never)
    expect(parseImportedSave(json).wNumScene).toBe(9)
    expect(() => parseImportedSave('{}')).toThrow(/格式/)
    expect(() => parseImportedSave('not json')).toThrow()
    expect(() => parseImportedSave(JSON.stringify({ format: 'x' }))).toThrow(/格式/)
  })
  it('parseImportedSave:缺必要字段(partyMembers)→ 抛', () => {
    const bad = JSON.stringify({ format: 'type-pal-save', version: 1, gs: { wNumScene: 1 } })
    expect(() => parseImportedSave(bad)).toThrow(/字段/)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/save-io.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 写实现**

```typescript
// src/tools/save-io.ts —— 存档导入导出(纯序列化/校验;DOM 下载/读文件在 tools-panel 调)。
import type { GameState } from '../core/game-state.js'

const FORMAT = 'type-pal-save'
const VERSION = 1

export function serializeSave(gs: GameState): string {
  return JSON.stringify({ format: FORMAT, version: VERSION, savedAt: 0, gs })
}

/** 解析导入文件文本 → GameState;格式/字段不合法抛错(带中文原因)。savedAt 由 caller 用导入时刻覆盖。 */
export function parseImportedSave(text: string): GameState {
  let obj: { format?: string; version?: number; gs?: unknown }
  try {
    obj = JSON.parse(text)
  } catch {
    throw new Error('存档文件不是合法 JSON')
  }
  if (obj?.format !== FORMAT) throw new Error('存档格式不符(format 头缺失/错误)')
  const gs = obj.gs as Partial<GameState> | undefined
  if (!gs || !Array.isArray(gs.partyMembers) || typeof gs.wNumScene !== 'number') {
    throw new Error('存档缺必要字段(partyMembers / wNumScene)')
  }
  return gs as GameState
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/save-io.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/game/src/tools/save-io.ts packages/game/src/tools/save-io.test.ts
git commit -m "feat(tools): 存档导入导出序列化/校验(纯逻辑)"
```

---

### Task 4: 工具面板框架(prod 可用 + toggle + tab)

**Files:**
- Create: `src/tools/tools-panel.ts`
- Test: `src/tools/tools-panel.test.ts`

- [ ] **Step 1: 写失败测试(框架:挂载、热键 toggle、tab 切换)**

```typescript
// src/tools/tools-panel.test.ts
import { describe, expect, it, vi } from 'vitest'
import { setupToolsPanel, type ToolsPanelDeps } from './tools-panel.js'

function mkDeps(over: Partial<ToolsPanelDeps> = {}): ToolsPanelDeps {
  return {
    getGs: () => ({ mode: 'explore', wNumScene: 1, party: { x: 16, y: 8, facing: 'down' }, partyMembers: [0], dialogHistory: [] }) as never,
    save: { listSlots: async () => [], loadSlot: async () => null, saveSlot: async () => {} } as never,
    displayScale: { getMode: () => 'fit', setMode: () => {}, toggleFullscreen: () => {} },
    audioVolume: { getVolume: () => 0.8, setVolume: () => {}, isMuted: () => false, setMuted: () => {} },
    ...over,
  }
}

describe('tools-panel', () => {
  it('setup 挂一个隐藏的根节点 + 右下角唤出按钮', () => {
    setupToolsPanel(mkDeps())
    expect(document.getElementById('tp-tools-launcher')).not.toBeNull()
    const root = document.getElementById('tp-tools-panel')
    expect(root).not.toBeNull()
    expect(root!.hidden).toBe(true) // 默认隐藏
  })
  it('热键 ` 切换显隐', () => {
    setupToolsPanel(mkDeps())
    const root = document.getElementById('tp-tools-panel')!
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '`' }))
    expect(root.hidden).toBe(false)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '`' }))
    expect(root.hidden).toBe(true)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/tools-panel.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 写框架实现(toggle/tab,tab 内容 Task 5-6 填)**

```typescript
// src/tools/tools-panel.ts —— 生产增强工具面板(canvas 外 DOM,非 DEV 门;只读 + 玩家便利动作)。
import type { GameState } from '../core/game-state.js'
import type { Save as SaveApi } from '../core/save/api.js'
import type { DisplayScaleController } from '../shell/display-scale.js' // 来自 canvas-resolution plan
import type { AudioVolumeController } from '../shell/audio-volume.js'

export interface ToolsPanelDeps {
  getGs: () => GameState
  save: typeof SaveApi
  displayScale: DisplayScaleController
  audioVolume: AudioVolumeController
}

type TabKey = 'battle' | 'scene' | 'display' | 'audio' | 'save' | 'dialog'

export function setupToolsPanel(deps: ToolsPanelDeps): void {
  if (typeof document === 'undefined') return
  if (document.getElementById('tp-tools-panel')) return // 幂等

  const root = document.createElement('div')
  root.id = 'tp-tools-panel'
  root.hidden = true
  root.style.cssText = [
    'position:fixed', 'top:5%', 'right:5%', 'width:380px', 'max-height:88vh', 'overflow:auto',
    'z-index:30', 'background:rgba(20,18,16,0.96)', 'color:#d8c8a8', 'border:1px solid #6a4',
    'border-radius:6px', 'font:12px/1.5 monospace', 'padding:10px',
  ].join(';')

  const tabbar = document.createElement('div')
  tabbar.style.cssText = 'display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap'
  const body = document.createElement('div')
  const TABS: Array<[TabKey, string]> = [
    ['battle', '战斗状态'], ['scene', '场景/坐标'], ['display', '分辨率'], ['audio', '音量'], ['save', '存档'], ['dialog', '历史对话'],
  ]
  let active: TabKey = 'scene'
  const render = (): void => {
    body.innerHTML = ''
    // Task 5 各 renderXxxTab(body, deps) 按 active 分派(含 Task 6 的 renderAudioTab);此处先占位
    body.textContent = `[${active}] tab —— 内容见 Task 5`
  }
  for (const [key, label] of TABS) {
    const b = document.createElement('button')
    b.textContent = label
    b.style.cssText = 'background:#2a2620;color:#d8c8a8;border:1px solid #6a4;cursor:pointer;padding:2px 6px'
    b.addEventListener('click', () => { active = key; render() })
    tabbar.appendChild(b)
  }
  root.append(tabbar, body)
  document.body.appendChild(root)

  const launcher = document.createElement('button')
  launcher.id = 'tp-tools-launcher'
  launcher.textContent = '🛠'
  launcher.title = '工具面板(`)'
  launcher.style.cssText = [
    'position:fixed', 'bottom:8px', 'right:8px', 'z-index:29', 'width:30px', 'height:30px',
    'background:rgba(20,18,16,0.7)', 'color:#d8c8a8', 'border:1px solid #6a4', 'border-radius:6px',
    'cursor:pointer', 'opacity:0.5',
  ].join(';')

  const toggle = (): void => {
    root.hidden = !root.hidden
    if (!root.hidden) render()
  }
  launcher.addEventListener('click', toggle)
  window.addEventListener('keydown', (e) => {
    if (e.key === '`') { e.preventDefault(); toggle() } // backquote;游戏输入不消费此键
  })
  document.body.appendChild(launcher)
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/tools-panel.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/game/src/tools/tools-panel.ts packages/game/src/tools/tools-panel.test.ts
git commit -m "feat(tools): 生产工具面板框架(热键/按钮 toggle + tab)"
```

---

### Task 5: 各 tab 内容(战斗 / 场景坐标 / 分辨率 / 存档 / 历史对话)

**Files:**
- Modify: `src/tools/tools-panel.ts`
- Test: `src/tools/tools-panel.test.ts`(追加)

> tab 渲染主要是 DOM 拼装 + 读 deps;可测的逻辑(场景坐标格式化、存档列表)写单测,纯 DOM 细节靠 Task 8 浏览器眼校。

- [ ] **Step 1: 追加失败测试(场景 tab 显示场景号+主角坐标;历史对话倒序)**

```typescript
// 追加到 tools-panel.test.ts
it('场景 tab:显示 wNumScene + 主角世界坐标 + 朝向', () => {
  setupToolsPanel(mkDeps({
    getGs: () => ({ mode: 'explore', wNumScene: 17, party: { x: 512, y: 256, facing: 'right' }, partyMembers: [0], dialogHistory: [] }) as never,
  }))
  ;(document.getElementById('tp-tools-panel') as HTMLElement).hidden = false
  window.dispatchEvent(new KeyboardEvent('keydown', { key: '`' })) // 开
  // 切到场景 tab
  ;[...document.querySelectorAll('#tp-tools-panel button')].find((b) => b.textContent === '场景/坐标')!.dispatchEvent(new Event('click'))
  const txt = document.getElementById('tp-tools-panel')!.textContent ?? ''
  expect(txt).toContain('17')   // 场景号
  expect(txt).toContain('512')  // x
  expect(txt).toContain('256')  // y
})

it('历史对话 tab:倒序显示最近若干行', () => {
  setupToolsPanel(mkDeps({
    getGs: () => ({ mode: 'explore', wNumScene: 1, party: { x: 0, y: 0, facing: 'down' }, partyMembers: [0], dialogHistory: ['第一句', '第二句', '第三句'] }) as never,
  }))
  window.dispatchEvent(new KeyboardEvent('keydown', { key: '`' }))
  ;[...document.querySelectorAll('#tp-tools-panel button')].find((b) => b.textContent === '历史对话')!.dispatchEvent(new Event('click'))
  const items = [...document.querySelectorAll('#tp-tools-panel .tp-dialog-line')].map((e) => e.textContent)
  expect(items[0]).toContain('第三句') // 倒序:最新在上
  expect(items[2]).toContain('第一句')
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/tools-panel.test.ts -t "场景 tab"`
Expected: FAIL（render 占位,无场景号/坐标）

- [ ] **Step 3: 实现各 tab render(替换 Task 4 的占位 render)**

把 Task 4 的 `render` 占位替换为按 `active` 分派,并实现各 tab:

```typescript
import { readEnemyStates, readField, readPartyStates } from '../core/inspect/battle-inspect.js'
import { serializeSave, parseImportedSave } from './save-io.js'
// …render():
const render = (): void => {
  body.innerHTML = ''
  const gs = deps.getGs()
  if (active === 'scene') renderSceneTab(body, gs)
  else if (active === 'battle') renderBattleTab(body, gs)
  else if (active === 'display') renderDisplayTab(body, deps.displayScale)
  else if (active === 'audio') renderAudioTab(body, deps.audioVolume)
  else if (active === 'save') renderSaveTab(body, deps)
  else if (active === 'dialog') renderDialogTab(body, gs)
}

function row(parent: HTMLElement, label: string, value: string): void {
  const d = document.createElement('div')
  d.textContent = `${label}: ${value}`
  parent.appendChild(d)
}

function renderSceneTab(parent: HTMLElement, gs: GameState): void {
  row(parent, '模式', String(gs.mode))
  row(parent, '场景 wNumScene', String(gs.wNumScene))
  row(parent, '地图 mapNum', String((gs as { wNumMap?: number }).wNumMap ?? '—'))
  row(parent, '主角世界坐标', `x=${gs.party.x}  y=${gs.party.y}`)
  row(parent, '朝向', String(gs.party.facing))
  row(parent, '队伍', gs.partyMembers.join(', '))
  // 地图缩略图(可选):若 deps 注入 renderSceneThumb(mapNum) 则贴 <img>;无则省。
}

function renderBattleTab(parent: HTMLElement, gs: GameState): void {
  if (gs.mode !== 'battle' || !gs.battleState) { parent.textContent = '(非战斗中)'; return }
  const st = gs.battleState
  const h3 = (t: string) => { const e = document.createElement('div'); e.style.cssText = 'color:#9c8;margin-top:6px'; e.textContent = t; parent.appendChild(e) }
  h3('队伍状态'); for (const p of readPartyStates(st)) row(parent, p.name, `HP ${p.hp}/${p.maxHp} MP ${p.mp}`)
  h3('敌人状态'); for (const e of readEnemyStates(st)) row(parent, e.name, e.defeated ? '已倒' : `HP ${e.health}`)
  h3('场地'); const f = readField(st); row(parent, 'field', String(f.id))
}

function renderDisplayTab(parent: HTMLElement, ctrl: DisplayScaleController): void {
  // 复用 canvas-resolution plan 的 mountDisplayScaleControl 思路:档位下拉 + 全屏按钮(此处内联简版)
  const sel = document.createElement('select')
  for (const [v, l] of [['fit', '适应窗口'], ['2', '2×'], ['3', '3×'], ['4', '4×'], ['5', '5×'], ['6', '6×']] as const) {
    const o = document.createElement('option'); o.value = v; o.textContent = l; sel.appendChild(o)
  }
  sel.value = String(ctrl.getMode())
  sel.addEventListener('change', () => ctrl.setMode(sel.value === 'fit' ? 'fit' : Number(sel.value)))
  const fs = document.createElement('button'); fs.textContent = '全屏'; fs.addEventListener('click', () => ctrl.toggleFullscreen())
  parent.append('显示缩放: ', sel, ' ', fs)
}

function renderAudioTab(parent: HTMLElement, ctrl: AudioVolumeController): void {
  // BGM 主音量滑块(0~100%)+ 静音 toggle。改动即时生效 + 写 localStorage(controller 内部持久)。
  const label = document.createElement('span')
  const slider = document.createElement('input')
  slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.step = '1'
  slider.value = String(Math.round(ctrl.getVolume() * 100))
  slider.className = 'tp-audio-volume'
  const syncLabel = () => { label.textContent = `BGM 音量: ${slider.value}%` }
  syncLabel()
  slider.addEventListener('input', () => { ctrl.setVolume(Number(slider.value) / 100); syncLabel() })

  const mute = document.createElement('button')
  mute.className = 'tp-audio-mute'
  const syncMute = () => { mute.textContent = ctrl.isMuted() ? '🔇 已静音' : '🔊 静音' }
  syncMute()
  mute.addEventListener('click', () => { ctrl.setMuted(!ctrl.isMuted()); syncMute() })

  parent.append(label, document.createElement('br'), slider, ' ', mute)
}

function renderDialogTab(parent: HTMLElement, gs: GameState): void {
  if (!gs.dialogHistory.length) { parent.textContent = '(暂无历史对话)'; return }
  for (let i = gs.dialogHistory.length - 1; i >= 0; i--) { // 倒序:最新在上
    const d = document.createElement('div'); d.className = 'tp-dialog-line'
    d.style.cssText = 'border-bottom:1px solid #443;padding:2px 0'
    d.textContent = gs.dialogHistory[i]!
    parent.appendChild(d)
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/tools/tools-panel.test.ts`
Expected: PASS

- [ ] **Step 5: 存档 tab(导入导出 DOM 动作)**

```typescript
function renderSaveTab(parent: HTMLElement, deps: ToolsPanelDeps): void {
  const exportBtn = document.createElement('button')
  exportBtn.textContent = '导出当前进度'
  exportBtn.addEventListener('click', () => {
    const json = serializeSave(deps.getGs())
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `type-pal-save-${deps.getGs().wNumScene}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  })
  const importInput = document.createElement('input')
  importInput.type = 'file'; importInput.accept = '.json,application/json'
  const status = document.createElement('div')
  importInput.addEventListener('change', () => {
    const file = importInput.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const gs = parseImportedSave(String(reader.result))
        await deps.save.saveSlot(1, gs) // 导入到 slot 1(或弹 slot 选择;简版固定 1)
        status.textContent = '✓ 已导入到存档位 1,可在游戏读档菜单载入'
      } catch (err) {
        status.textContent = `✗ 导入失败:${err instanceof Error ? err.message : String(err)}`
      }
    }
    reader.readAsText(file)
  })
  parent.append(exportBtn, document.createElement('br'), '导入存档文件: ', importInput, status)
}
```

(此段 DOM 动作靠 Task 8 浏览器眼校;`serializeSave`/`parseImportedSave` 已在 Task 3 单测覆盖。)

- [ ] **Step 6: Commit**

```bash
git add packages/game/src/tools/tools-panel.ts packages/game/src/tools/tools-panel.test.ts
git commit -m "feat(tools): 工具面板各 tab——战斗/场景坐标/分辨率/存档导入导出/历史对话"
```

---

### Task 6: 音量调节(BGM 主音量 + 静音 + 持久化)

**Files:**
- Create: `src/shell/audio-volume.ts`
- Test: `src/shell/audio-volume.test.ts`
- Modify: `src/shell/audio-midi.ts`、`src/shell/audio.ts`

- [ ] **Step 1: 写失败测试(0..1 钳制、静音、localStorage 持久、启动读回)**

```typescript
// src/shell/audio-volume.test.ts
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { createAudioVolumeController } from './audio-volume.js'

describe('audio-volume', () => {
  beforeEach(() => localStorage.clear())
  it('setVolume 钳制 0..1,调 applyVolume,写 localStorage', () => {
    const sink = vi.fn()
    const c = createAudioVolumeController({ applyVolume: sink })
    c.setVolume(1.5); expect(c.getVolume()).toBe(1); expect(sink).toHaveBeenLastCalledWith(1)
    c.setVolume(-1); expect(c.getVolume()).toBe(0)
    c.setVolume(0.5); expect(localStorage.getItem('tp-master-volume')).toBe('0.5')
  })
  it('静音:applyVolume 收 0,取消静音恢复音量值;持久 tp-muted', () => {
    const sink = vi.fn()
    const c = createAudioVolumeController({ applyVolume: sink })
    c.setVolume(0.8)
    c.setMuted(true); expect(c.isMuted()).toBe(true); expect(sink).toHaveBeenLastCalledWith(0)
    expect(localStorage.getItem('tp-muted')).toBe('1')
    c.setMuted(false); expect(sink).toHaveBeenLastCalledWith(0.8)
  })
  it('启动读回 localStorage(音量 + 静音)并即时应用', () => {
    localStorage.setItem('tp-master-volume', '0.3'); localStorage.setItem('tp-muted', '1')
    const sink = vi.fn()
    const c = createAudioVolumeController({ applyVolume: sink })
    expect(c.getVolume()).toBe(0.3); expect(c.isMuted()).toBe(true)
    expect(sink).toHaveBeenLastCalledWith(0) // 静音 → 0
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @type-pal/game exec vitest run src/shell/audio-volume.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 写 controller**

```typescript
// src/shell/audio-volume.ts —— BGM 主音量 controller(0..1 + 静音,localStorage 持久)。
//   applyVolume(effective) 由 bootstrap 注入:把有效音量(静音时 0)推给 audio-midi.setBgmVolume + audio.ts OGG 系数。
const KEY_VOL = 'tp-master-volume'
const KEY_MUTE = 'tp-muted'

export interface AudioVolumeController {
  getVolume(): number
  setVolume(v: number): void
  isMuted(): boolean
  setMuted(m: boolean): void
}

function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v }

export function createAudioVolumeController(opts: { applyVolume: (effective: number) => void }): AudioVolumeController {
  let volume = clamp01(Number(localStorage.getItem(KEY_VOL) ?? '0.8') || 0)
  let muted = localStorage.getItem(KEY_MUTE) === '1'
  const apply = (): void => opts.applyVolume(muted ? 0 : volume)
  apply() // 启动即应用读回值
  return {
    getVolume: () => volume,
    setVolume(v) { volume = clamp01(v); localStorage.setItem(KEY_VOL, String(volume)); apply() },
    isMuted: () => muted,
    setMuted(m) { muted = m; localStorage.setItem(KEY_MUTE, m ? '1' : '0'); apply() },
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @type-pal/game exec vitest run src/shell/audio-volume.test.ts`
Expected: PASS

- [ ] **Step 5: audio-midi 插 masterGain + 暴露 setBgmVolume**

[audio-midi.ts](../../packages/game/src/shell/audio-midi.ts):把 `synth.connect(ctx.destination)`(行 83)改为经我们自己的 GainNode,**不依赖 spessasynth 音量 API**:
```typescript
// 模块级(供 setBgmVolume 改);ctx 建好即可创建
let masterGain: GainNode | undefined
// …synth 就绪处:
masterGain = ctx.createGain()
masterGain.gain.value = pendingBgmVolume ?? 1 // 若 setBgmVolume 在 ready 前被调,用暂存值
masterGain.connect(ctx.destination)
synth.connect(masterGain) // synth → masterGain → destination(替换原 synth.connect(ctx.destination))
```
导出(ready 前调用先暂存):
```typescript
let pendingBgmVolume: number | undefined
export function setBgmVolume(v: number): void {
  pendingBgmVolume = v
  if (masterGain) masterGain.gain.value = v
}
```

- [ ] **Step 6: audio.ts OGG 回退乘音量系数**

[audio.ts](../../packages/game/src/shell/audio.ts):模块级 `let oggScale = 1`;`a.volume = 0.6`(行 163)改 `a.volume = 0.6 * oggScale`;暴露:
```typescript
export function setOggVolumeScale(s: number): void {
  oggScale = s
  if (cur) cur.volume = 0.6 * s // 当前播放即时刷新
}
```
(`cur` 是 audio.ts 现有的当前播放 HTMLAudioElement 引用。)

- [ ] **Step 7: 全 check**

Run: `pnpm check`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add packages/game/src/shell/audio-volume.ts packages/game/src/shell/audio-volume.test.ts packages/game/src/shell/audio-midi.ts packages/game/src/shell/audio.ts
git commit -m "feat(audio): BGM 主音量 controller(GainNode + OGG 系数,静音,localStorage 持久)"
```

---

### Task 7: bootstrap 无条件接入(生产可用)

**Files:**
- Modify: `src/shell/bootstrap.ts`

- [ ] **Step 1: 接线**

在 [bootstrap.ts](../../packages/game/src/shell/bootstrap.ts) 启动 rAF 主循环后(`gs`、`Save`、display-scale controller 均就绪),**无条件**调:

```typescript
import { setupToolsPanel } from '../tools/tools-panel.js'
import { Save } from '../core/save/api.js'
import { createAudioVolumeController } from './audio-volume.js'
import { setBgmVolume } from './audio-midi.js'
import { setOggVolumeScale } from './audio.js'
// 主音量 controller:applyVolume 把有效音量(静音时 0)推给 MIDI masterGain + OGG 系数;构造时即读回
//   localStorage 并应用(开局就是上次设定的音量)。
const audioVolume = createAudioVolumeController({
  applyVolume: (v) => { setBgmVolume(v); setOggVolumeScale(v) },
})
// …(在 setupDevPanel 那段附近,但不带 import.meta.env.DEV 门)
setupToolsPanel({
  getGs: () => gs,
  save: Save,
  displayScale: scaleCtrl, // 来自 canvas-resolution plan 的 initDisplayScale 返回值
  audioVolume,
})
```

> 注:`scaleCtrl` 依赖 canvas-resolution plan 已落地。若该 plan 未做,先做其 Task 1-2(display-scale.ts),或本 plan 临时内联一个最简 controller。

- [ ] **Step 2: 确认生产构建保留(关键:不被 DCE)**

Run: `pnpm --filter @type-pal/game run build && grep -c "tp-tools-panel" packages/game/dist/assets/*.js`
Expected: ≥ 1（面板代码在生产包里,**未**被 tree-shake)。

- [ ] **Step 3: 全 check**

Run: `pnpm check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/game/src/shell/bootstrap.ts
git commit -m "feat(shell): 生产无条件挂载工具面板(setupToolsPanel)"
```

---

### Task 8: 浏览器端到端验证

**Files:** 无(验证任务)

- [ ] **Step 1: prod 构建起服**

Run: `pnpm --filter @type-pal/game run build && pnpm --filter @type-pal/game exec vite preview --port 4173`

- [ ] **Step 2: chrome-devtools MCP 验证(生产模式,dev-panel 应不存在、工具面板应存在)**

- 开 `http://localhost:4173`,确认右下角 🛠 按钮在;按 `` ` `` 唤出面板。
- DevTools Console 确认**无** dev-panel(`document.querySelector('.tp-dev-panel')` 为 null)。
- 场景 tab:走两步,坐标实时变;场景号正确。
- 战斗 tab:进一场战斗(正常游戏触发),看队伍/敌人/场地状态正确。
- 分辨率 tab:切档位,canvas 即时缩放(同 canvas-resolution plan)。
- 音量 tab:拖滑块,BGM 即时变大/变小;静音按钮即时静音/恢复;刷新页面后音量/静音保持(localStorage)。
- 历史对话 tab:触发几段对话后,倒序列出。
- 存档 tab:导出 → 得到 JSON 文件;改个进度后导入该文件 → 读档菜单载入回到导出时进度。

- [ ] **Step 3: 部署**

Run: `bash scripts/deploy.sh app`,生产站重复 Step 2 关键项确认。

---

## Self-Review

- **Spec 覆盖**:战斗队伍/敌人/场地状态(Task 1+5 battle tab)✓;修改分辨率(Task 5 display tab,复用 resolution plan)✓;**音量调节(Task 6 audio-volume controller + Task 5 audio tab:BGM 主音量滑块 + 静音 + localStorage 持久)✓**;当前场景地图+主角位置(Task 5 scene tab)✓;存档导入导出(Task 3+5 save tab)✓;历史对话查询(Task 2 捕获 + Task 5 dialog tab)✓;"类 dev-panel 但生产保留 + 不破坏原版"(Task 4 框架在 src/tools 无门 + 只读/便利动作,Task 7 无条件挂载,Task 7.Step2 验证不被 DCE)✓。
- **占位扫描**:Task 1 的 battle-inspect 函数体标注"照搬 dev-panel 现状"(签名占位)——实施时以 dev-panel 真实字段为准,不算逻辑占位;其余步骤均给完整代码。
- **类型一致**:`ToolsPanelDeps.{getGs,save,displayScale,audioVolume}` 在 Task 4 定义、Task 5 各 render 与 Task 7 接线一致;`DisplayScaleController` 来自 canvas-resolution plan(依赖声明);`AudioVolumeController.{getVolume,setVolume,isMuted,setMuted}` Task 6 定义、Task 5 renderAudioTab 与 Task 7 接线一致;`readEnemyStates/readField/readPartyStates` 命名 Task 1 定 Task 5 用一致;`serializeSave/parseImportedSave`、`pushDialogHistory/DIALOG_HISTORY_CAP`、`createAudioVolumeController/setBgmVolume/setOggVolumeScale` 跨任务一致。
- **依赖**:分辨率 tab 依赖 `docs/plans/2026-06-13-canvas-resolution-setting.md` 的 `display-scale.ts`(先落其 Task 1-2);两 plan 的分辨率控件择一承载(本面板承载 → 该 plan 的常驻控件可省,需在该 plan 标注)。音量(Task 6)无外部 plan 依赖,但改 audio-midi/audio——须保留其既有逻辑(混响关闭、OGG 回退、autoplay 解锁),只加 GainNode/系数。
- **不破坏原版**:面板纯 canvas 外 DOM、只读 + CSS 缩放 + 音量(GainNode/element volume)+ 存档文件 IO + 对话日志,**不写游戏逻辑状态**(改 HP/瞬移/启战等破坏性能力仍仅 dev-panel)。音量只在输出级缩放,不动曲目/时序。

## Execution Handoff

**Plan complete and saved to `docs/plans/2026-06-13-prod-tools-panel.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — 每 task 派新 subagent、task 间复查。
**2. Inline Execution** — 本会话内按 executing-plans 批量执行 + 检查点。

**Which approach?**
