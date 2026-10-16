# 存档系统 实现计划（「现在能做」阶段）

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: plan-status-v1 / 1.0.0

本页把历史实施计划接入 `plan-status-v1`，并追加 `archive-record-v1` 历史 overlay。原计划的日期、checkbox、执行分工、数字、结果词、未知和链接均在 quote 中保全；本页不授予当前待办、runtime、E2E、视觉或 coverage 信用。

## 目标与时间范围

- 历史目标：存档 TDD 计划：SaveStore 三块存储、30 槽/分页、Memory/IndexedDB、browser-state/ops、缩略图与系统菜单/main 集成，自动存档/剧情进度/多场景留口。
- 原始时间范围：2026-09-06；固定 source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，source SHA `3c4ff91b0b827a8d744f7a2b354b81efec01cc9dfffbd79a6ddeca78a31d216b`。
- 当前时间状态：历史归档；本页只说明当时计划的目的和边界，不续写执行期限。

## 里程碑

- 原始章节/里程碑：Global Constraints；文件结构；Task A〔GLM〕：存储层 `save/types.ts` + `save/store.ts`；Task B〔GLM〕：浏览状态机 `save/browser-state.ts` + 纯函数 `save/ops.ts`；Task C〔Claude〕：缩略图捕获 + 浏览界面 UI + main.ts 集成（我做）；Self-Review。
- 计划步骤、Task 编号、分工和 checkbox 的原始含义均保留在下方 quote；它们不构成今天的 build 准入。
- 本次治理里程碑：完成具体语义分栏、历史 overlay、源/after SHA 和继任入口登记。

## 当前状态

- 当前文档状态：`historical` / `archive`；正文状态信号：1:> **历史文档（2026-09-06 标注）**：本文是已完成的 TDD 计划/设计存档，正文中的执行；2:> 指令、Agent 分工与“当前状态”是当时快照，不是现行待办。实现结果以 capability-map 与；8:> **分工**：**Task A/B = GLM**（存储层 + 状态机 + 纯函数,全可单测、无视觉）；**Task C = Claude**（缩略图捕获 + 浏览界面 UI + 全部 main.ts 集成 + 浏览器验）。；11:**Goal**：落地存档系统的「现在能做」部分——IndexedDB 存储、数据模型（v1 = world+坐标）、浏览界面状态机、缩略图、快速热键、系统菜单 save/load 接入。被卡的（自动存档触发器、剧情进度字段、多场景还原）按 version 留口，不在本期。
- 历史结论：存档系统 实现计划（「现在能做」阶段）：这是 plan-status，当前文档状态为 historical。全文 495 行、7 个标题；摘要/首段为「> **历史文档（2026-09-06 标注）**：本文是已完成的 TDD 计划/设计存档，正文中的执行」。属于历史/归档材料，不能单独证明当前实现。
- 当前能力、实现结果和任务排序必须从继任规范、代码、看板/任务卡和新的独立证据读取。

## 阻塞与决策

- 历史冲突/未决：
- SAVE_VERSION=1、30 槽、world+position 和系统菜单接线是旧设计；当前 SAVE12/content22 spec 取代。
- IndexedDB/browser/thumbnail 任务分工和“浏览器验”不能作为当前存档/E2E 证据。
- 停止线：不得把历史计划、checkbox、Self-Review、done/待审标签或浏览器验收步骤提升为 current contract、runtime/E2E/visual/coverage 证据；SAVE_VERSION=1、30 槽、world+position 和系统菜单接线是旧设计；当前 SAVE12/content22 spec 取代。
- 旧计划中的 done/open/待审/浏览器验收词只保留为日期化证据，不能改写为 current。

## 下一步

- 继任入口：docs/phase2/specs/save-system.md；current reforge save codec/store/browser; persistence tests。
- 若需重新执行：先建立新的 task card，核对当前 primary source、合法输入、版本范围、business oracle、可证伪观察和独立验收；不得直接沿用本页步骤。
- 本次迁移完成后仍需候选独立接收；全量 1838 目标保持 active/build。

## 历史范围

- 原始范围：phase2 archive plan；日期/版本：2026-09-06；固定来源 `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，原文 494 行 / 24154 bytes。
- 归档原因：计划包含当时的执行分工、接口、checkbox 和验收步骤，当前合同已经由后继规范/代码承接。

## 原始结论

- 存档系统 实现计划（「现在能做」阶段）：这是 plan-status，当前文档状态为 historical。全文 495 行、7 个标题；摘要/首段为「> **历史文档（2026-09-06 标注）**：本文是已完成的 TDD 计划/设计存档，正文中的执行」。属于历史/归档材料，不能单独证明当前实现。
- 保留原始结论的历史适用范围；新增章节不把计划结果提升为当前实现。

## 当时证据

- source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `3c4ff91b0b827a8d744f7a2b354b81efec01cc9dfffbd79a6ddeca78a31d216b`；标题锚点：5:存档系统 实现计划（「现在能做」阶段）, 17:Global Constraints, 27:文件结构, 46:Task A〔GLM〕：存储层 `save/types.ts` + `save/store.ts`, 240:Task B〔GLM〕：浏览状态机 `save/browser-state.ts` + 纯函数 `save/ops.ts`, 460:Task C〔Claude〕：缩略图捕获 + 浏览界面 UI + main.ts 集成（我做）, 487:Self-Review。
- 原始链接、代码、表格、checkbox 与状态词在下方逐行 quote 保留；本轮未运行计划中的 runtime/E2E/视觉/coverage。

## 当前有效性

historical。当前不把计划步骤、Self-Review、done/open 标签、浏览器 gate 或历史数字视为现行契约或执行证据。
- 当前不得外推：不得把历史计划、checkbox、Self-Review、done/待审标签或浏览器验收步骤提升为 current contract、runtime/E2E/visual/coverage 证据；SAVE_VERSION=1、30 槽、world+position 和系统菜单接线是旧设计；当前 SAVE12/content22 spec 取代。

## 继任文档

- current canonical / 复核入口：docs/phase2/specs/save-system.md；current reforge save codec/store/browser; persistence tests。
- supersedes / superseded-by：本页替换旧的 governed-legacy 结构展示，但不替换原始历史语义；当前事实由继任规范/代码和独立 review 决定。
- 重新启用条件：新的源版本、适用范围、合法输入、oracle、可证伪观察和独立接收。

## 原文保全

固定源 SHA `3c4ff91b0b827a8d744f7a2b354b81efec01cc9dfffbd79a6ddeca78a31d216b`；以下只增加 quote 前缀，逆回读必须得到相同 UTF-8 字节。
<!-- original-source-quote:start -->
> > **历史文档（2026-09-06 标注）**：本文是已完成的 TDD 计划/设计存档，正文中的执行
> > 指令、Agent 分工与“当前状态”是当时快照，不是现行待办。实现结果以 capability-map 与
> > 对应任务卡为准。
>
> # 存档系统 实现计划（「现在能做」阶段）
>
> > **For agentic workers**：逐 Task TDD（失败测试→跑→实现→跑→提交）。第二阶段 Reforge，先读 [READ-FIRST](../../READ-FIRST.md) + 设计 [save-system-design.md](../designs/save-system-design.md)。
> > **分工**：**Task A/B = GLM**（存储层 + 状态机 + 纯函数,全可单测、无视觉）；**Task C = Claude**（缩略图捕获 + 浏览界面 UI + 全部 main.ts 集成 + 浏览器验）。
> > GLM 只做 A/B,做完即停,交回我审 + 我做 C。
>
> **Goal**：落地存档系统的「现在能做」部分——IndexedDB 存储、数据模型（v1 = world+坐标）、浏览界面状态机、缩略图、快速热键、系统菜单 save/load 接入。被卡的（自动存档触发器、剧情进度字段、多场景还原）按 version 留口，不在本期。
>
> **Architecture**：三块分离存储（meta/payload/thumb）+ 注入式 `SaveStore`（IndexedDB 实现 + 内存实现可测）+ 纯函数浏览状态机（镜像 use/system-menu-state）。payload 带 `version`，v1 只装 `{ world, position }`。
>
> **Tech Stack**：TypeScript、IndexedDB（原生,无新依赖）、vitest。
>
> ## Global Constraints
>
> - **阶段隔离（D18）**：存储/状态机/UI 在 reforge；`WorldState`/`Facing` 形状在 content（import）。
> - **不可变**：状态机纯函数返回新 state。
> - **无新依赖**：不引 `fake-indexeddb`。`MemorySaveStore`（含全部可测逻辑）单测；`IndexedDbSaveStore` 是薄适配器，浏览器验（Task C）。
> - **纯函数不调 `Date.now()`**：时间戳由调用方注入（`now` 参数），便于测试。
> - **测试里 Blob**：`new Blob(['x'])`；`structuredClone` 在 vitest(Node18+) 可用。
> - **每 Task**：`pnpm --filter @type-pal/reforge run check` 绿 + `biome check <改动文件>` 0/0。
> - **别碰** `packages/game`（第一阶段）。
>
> ## 文件结构
>
> ```
> packages/reforge/src/save/
>   types.ts            # SlotId/SlotKind/SaveMeta/SavePayload + 常量(ALL_SLOT_IDS/SLOTS_PER_PAGE/SAVE_VERSION) — Task A
>   store.ts            # SaveStore 接口 + MemorySaveStore + IndexedDbSaveStore — Task A
>   store.test.ts       # MemorySaveStore 往返/容错 — Task A
>   browser-state.ts    # 浏览界面纯状态机(翻页/两模式/覆盖确认) — Task B
>   browser-state.test.ts
>   ops.ts              # buildMeta/buildPayload(纯) — Task B  (captureThumbnail 在 Task C)
>   ops.test.ts
> packages/reforge/src/menu/
>   save-browser-box.ts # drawSaveBrowser(槽卡/缩略图/翻页/覆盖确认框) — Task C(Claude)
> packages/reforge/src/main.ts            # 热键 + 系统菜单接入 + 编排 + render — Task C(Claude)
> packages/reforge/src/system-menu-state.ts # save/load 启用 + systemConfirm 分流 — Task C(Claude)
> ```
>
> ---
>
> ## Task A〔GLM〕：存储层 `save/types.ts` + `save/store.ts`
>
> **Files**：Create `packages/reforge/src/save/types.ts`、`save/store.ts`、`save/store.test.ts`。
>
> **Produces**：`SlotKind`/`SlotId`/`SaveMeta`/`SavePayload`、`ALL_SLOT_IDS`/`SLOTS_PER_PAGE`/`TOTAL_PAGES`/`SAVE_VERSION`/`slotKind`、`SaveStore`/`MemorySaveStore`/`IndexedDbSaveStore`。
>
> - [ ] **Step 1：写 `types.ts`**
>
> ```ts
> import type { Facing, WorldState } from '@type-pal/content'
>
> export type SlotKind = 'auto' | 'quick' | 'manual'
> export type SlotId = string // 'auto' | 'quick' | 'm01'..'m28'
>
> export const MANUAL_SLOT_COUNT = 28
> export const SLOTS_PER_PAGE = 3
> export const SAVE_VERSION = 1
>
> /** 全部槽 id（固定序）：自动、快速最前，其后 m01..m28（共 30，3/页 → 10 页）。 */
> export const ALL_SLOT_IDS: SlotId[] = [
>   'auto',
>   'quick',
>   ...Array.from({ length: MANUAL_SLOT_COUNT }, (_, i) => `m${String(i + 1).padStart(2, '0')}`),
> ]
>
> export const TOTAL_PAGES = Math.ceil(ALL_SLOT_IDS.length / SLOTS_PER_PAGE)
>
> export function slotKind(id: SlotId): SlotKind {
>   return id === 'auto' ? 'auto' : id === 'quick' ? 'quick' : 'manual'
> }
>
> /** 显示快照（浏览界面用，不含全量状态）。 */
> export interface SaveMeta {
>   slotId: SlotId
>   kind: SlotKind
>   party: { name: string; level: number }[]
>   mapName: string
>   savedAt: number // Date.now() epoch ms（调用方注入）
> }
>
> /** 全量还原状态；version 驱动迁移。本期 v1 = world + 坐标。 */
> export interface SavePayload {
>   version: number
>   world: WorldState
>   position: { sceneId: string; x: number; y: number; facing: Facing }
> }
> ```
>
> - [ ] **Step 2：写失败测试 `store.test.ts`**
>
> ```ts
> import { describe, expect, test } from 'vitest'
> import { initialWorld } from '@type-pal/content'
> import { MemorySaveStore } from './store.js'
> import { SAVE_VERSION, type SaveMeta, type SavePayload } from './types.js'
>
> function meta(slotId: string): SaveMeta {
>   return { slotId, kind: 'manual', party: [{ name: '李逍遥', level: 1 }], mapName: '鬼界·民居', savedAt: 123 }
> }
> function payload(): SavePayload {
>   return { version: SAVE_VERSION, world: initialWorld(), position: { sceneId: 's', x: 1, y: 2, facing: 'down' } }
> }
>
> describe('MemorySaveStore', () => {
>   test('putSlot → listMeta/getPayload/getThumb 往返', async () => {
>     const s = new MemorySaveStore()
>     expect(await s.listMeta()).toEqual([])
>     await s.putSlot(meta('m01'), payload(), new Blob(['png']))
>     expect((await s.listMeta()).map((m) => m.slotId)).toEqual(['m01'])
>     expect((await s.getPayload('m01'))?.world).toEqual(initialWorld())
>     expect(await s.getThumb('m01')).toBeInstanceOf(Blob)
>   })
>   test('缺失槽 → null', async () => {
>     const s = new MemorySaveStore()
>     expect(await s.getPayload('m99')).toBe(null)
>     expect(await s.getThumb('m99')).toBe(null)
>   })
>   test('覆盖写：同槽 putSlot 二次 → listMeta 仍 1 条、payload 更新', async () => {
>     const s = new MemorySaveStore()
>     await s.putSlot(meta('m01'), payload(), new Blob(['a']))
>     const p2 = payload(); p2.position.x = 99
>     await s.putSlot(meta('m01'), p2, new Blob(['b']))
>     expect(await s.listMeta()).toHaveLength(1)
>     expect((await s.getPayload('m01'))?.position.x).toBe(99)
>   })
> })
> ```
>
> - [ ] **Step 3：跑确认失败** → `pnpm --filter @type-pal/reforge exec vitest run src/save/store.test.ts` → FAIL（模块不存在）
>
> - [ ] **Step 4：写 `store.ts`**
>
> ```ts
> import type { SaveMeta, SavePayload, SlotId } from './types.js'
>
> /** 存档存储抽象（注入式）。三块分离：meta(浏览) / payload(还原) / thumb(图)。 */
> export interface SaveStore {
>   putSlot(meta: SaveMeta, payload: SavePayload, thumb: Blob): Promise<void> // 覆盖写
>   listMeta(): Promise<SaveMeta[]> // 浏览界面（不碰 payload）
>   getPayload(slotId: SlotId): Promise<SavePayload | null>
>   getThumb(slotId: SlotId): Promise<Blob | null>
> }
>
> /** 内存实现（测试 / 无 IndexedDB 降级）。深拷贝防外部突变。 */
> export class MemorySaveStore implements SaveStore {
>   private readonly meta = new Map<SlotId, SaveMeta>()
>   private readonly payload = new Map<SlotId, SavePayload>()
>   private readonly thumb = new Map<SlotId, Blob>()
>
>   async putSlot(meta: SaveMeta, payload: SavePayload, thumb: Blob): Promise<void> {
>     this.meta.set(meta.slotId, structuredClone(meta))
>     this.payload.set(meta.slotId, structuredClone(payload))
>     this.thumb.set(meta.slotId, thumb)
>   }
>   async listMeta(): Promise<SaveMeta[]> {
>     return [...this.meta.values()].map((m) => structuredClone(m))
>   }
>   async getPayload(slotId: SlotId): Promise<SavePayload | null> {
>     const p = this.payload.get(slotId)
>     return p ? structuredClone(p) : null
>   }
>   async getThumb(slotId: SlotId): Promise<Blob | null> {
>     return this.thumb.get(slotId) ?? null
>   }
> }
>
> const DB_NAME = 'type-pal-saves'
> const DB_VERSION = 1
> const STORES = ['meta', 'payload', 'thumb'] as const
>
> /** IndexedDB 实现（浏览器；薄适配器。IDB 用结构化克隆存对象/Blob，无需 JSON）。 */
> export class IndexedDbSaveStore implements SaveStore {
>   private dbPromise: Promise<IDBDatabase> | null = null
>
>   private open(): Promise<IDBDatabase> {
>     if (!this.dbPromise) {
>       this.dbPromise = new Promise((resolve, reject) => {
>         const req = indexedDB.open(DB_NAME, DB_VERSION)
>         req.onupgradeneeded = () => {
>           const db = req.result
>           for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s)
>         }
>         req.onsuccess = () => resolve(req.result)
>         req.onerror = () => reject(req.error)
>       })
>     }
>     return this.dbPromise
>   }
>
>   async putSlot(meta: SaveMeta, payload: SavePayload, thumb: Blob): Promise<void> {
>     const db = await this.open()
>     await new Promise<void>((resolve, reject) => {
>       const t = db.transaction(STORES, 'readwrite') // 三 store 一事务，原子
>       t.objectStore('meta').put(meta, meta.slotId)
>       t.objectStore('payload').put(payload, meta.slotId)
>       t.objectStore('thumb').put(thumb, meta.slotId)
>       t.oncomplete = () => resolve()
>       t.onerror = () => reject(t.error)
>     })
>   }
>
>   private get<T>(store: string, key: SlotId): Promise<T | null> {
>     return this.open().then(
>       (db) =>
>         new Promise((resolve, reject) => {
>           const req = db.transaction(store, 'readonly').objectStore(store).get(key)
>           req.onsuccess = () => resolve((req.result as T) ?? null)
>           req.onerror = () => reject(req.error)
>         }),
>     )
>   }
>
>   async listMeta(): Promise<SaveMeta[]> {
>     const db = await this.open()
>     return new Promise((resolve, reject) => {
>       const req = db.transaction('meta', 'readonly').objectStore('meta').getAll()
>       req.onsuccess = () => resolve(req.result as SaveMeta[])
>       req.onerror = () => reject(req.error)
>     })
>   }
>   getPayload(slotId: SlotId): Promise<SavePayload | null> {
>     return this.get<SavePayload>('payload', slotId)
>   }
>   getThumb(slotId: SlotId): Promise<Blob | null> {
>     return this.get<Blob>('thumb', slotId)
>   }
> }
> ```
>
> - [ ] **Step 5：测试 + check + biome** 绿/0
> - [ ] **Step 6：commit** — `feat(reforge): 存档存储层(SaveStore + Memory/IndexedDB,三块分离)`
>
> ---
>
> ## Task B〔GLM〕：浏览状态机 `save/browser-state.ts` + 纯函数 `save/ops.ts`
>
> **Files**：Create `save/browser-state.ts` + `browser-state.test.ts`、`save/ops.ts` + `ops.test.ts`。
>
> **Produces**：`SaveBrowserMode`/`SaveBrowserState`/`SaveBrowserAction`、`openSaveBrowser`/`closeSaveBrowser`/`metasToList`/`pageOf`/`browserMoveCursor`/`browserConfirm`/`browserConfirmOverwriteYes`/`browserConfirmOverwriteNo`；`buildMeta`/`buildPayload`。
>
> - [ ] **Step 1：写失败测试 `browser-state.test.ts`**
>
> ```ts
> import { describe, expect, test } from 'vitest'
> import {
>   browserConfirm,
>   browserConfirmOverwriteNo,
>   browserConfirmOverwriteYes,
>   browserMoveCursor,
>   closeSaveBrowser,
>   openSaveBrowser,
> } from './browser-state.js'
> import { ALL_SLOT_IDS, type SaveMeta } from './types.js'
>
> const m01: SaveMeta = { slotId: 'm01', kind: 'manual', party: [], mapName: 'x', savedAt: 1 }
> const autoMeta: SaveMeta = { slotId: 'auto', kind: 'auto', party: [], mapName: 'x', savedAt: 1 }
>
> describe('save 浏览状态机', () => {
>   test('open：30 槽元数据对齐 ALL_SLOT_IDS；cursor clamp', () => {
>     const s = openSaveBrowser('load', [m01], 0)
>     expect(s.active).toBe(true)
>     expect(s.metas).toHaveLength(ALL_SLOT_IDS.length)
>     expect(s.metas[ALL_SLOT_IDS.indexOf('m01')]?.slotId).toBe('m01')
>     expect(s.metas[0]).toBe(null) // auto 空
>     expect(openSaveBrowser('load', [], 999).cursor).toBe(ALL_SLOT_IDS.length - 1) // clamp
>   })
>   test('move：↑↓ ±1、←→ ±3，clamp 不 wrap', () => {
>     const s = openSaveBrowser('save', [])
>     expect(browserMoveCursor(s, 'down').cursor).toBe(1)
>     expect(browserMoveCursor(s, 'right').cursor).toBe(3) // ±整页
>     expect(browserMoveCursor(s, 'up').cursor).toBe(0) // 顶 clamp
>     expect(browserMoveCursor({ ...s, cursor: ALL_SLOT_IDS.length - 1 }, 'down').cursor).toBe(ALL_SLOT_IDS.length - 1)
>   })
>   test('confirm·save：空手动槽→write；已存手动槽→覆盖确认；auto/quick→no-op', () => {
>     const empty = openSaveBrowser('save', []) // cursor0=auto
>     expect(browserConfirm(empty).action).toBeUndefined() // auto 不可手动写
>     const onM01 = { ...empty, cursor: ALL_SLOT_IDS.indexOf('m01') }
>     expect(browserConfirm(onM01).action).toEqual({ kind: 'write', slotId: 'm01' }) // 空→写
>     const filled = openSaveBrowser('save', [m01])
>     const onFilled = { ...filled, cursor: ALL_SLOT_IDS.indexOf('m01') }
>     const r = browserConfirm(onFilled)
>     expect(r.action).toBeUndefined()
>     expect(r.state.confirmOverwrite).toBe(true) // 已存→覆盖确认
>   })
>   test('confirm·load：已存槽→load(含 auto/quick)；空槽→no-op', () => {
>     const s = openSaveBrowser('load', [m01, autoMeta])
>     expect(browserConfirm({ ...s, cursor: ALL_SLOT_IDS.indexOf('m01') }).action).toEqual({ kind: 'load', slotId: 'm01' })
>     expect(browserConfirm({ ...s, cursor: 0 }).action).toEqual({ kind: 'load', slotId: 'auto' }) // auto 可读
>     const noAuto = openSaveBrowser('load', [m01])
>     expect(browserConfirm({ ...noAuto, cursor: 0 }).action).toBeUndefined() // 空槽不可读
>   })
>   test('覆盖确认：是→write；否→退确认', () => {
>     const s = { ...openSaveBrowser('save', [m01]), cursor: ALL_SLOT_IDS.indexOf('m01'), confirmOverwrite: true }
>     expect(browserConfirmOverwriteYes(s).action).toEqual({ kind: 'write', slotId: 'm01' })
>     expect(browserConfirmOverwriteNo(s).confirmOverwrite).toBe(false)
>     expect(browserMoveCursor(s, 'down').cursor).toBe(s.cursor) // 覆盖确认期不移动
>   })
>   test('close：active false', () => {
>     expect(closeSaveBrowser().active).toBe(false)
>   })
> })
> ```
>
> - [ ] **Step 2：跑确认失败** → FAIL
>
> - [ ] **Step 3：写 `browser-state.ts`**
>
> ```ts
> import { ALL_SLOT_IDS, type SaveMeta, type SlotId, SLOTS_PER_PAGE, slotKind } from './types.js'
>
> export type SaveBrowserMode = 'save' | 'load'
>
> export interface SaveBrowserState {
>   active: boolean
>   mode: SaveBrowserMode
>   cursor: number // 绝对索引 0..ALL_SLOT_IDS.length-1（page = floor(cursor/SLOTS_PER_PAGE)）
>   metas: (SaveMeta | null)[] // 与 ALL_SLOT_IDS 同序同长；null=空槽
>   confirmOverwrite: boolean // save 模式选了已存手动槽 → 覆盖确认
> }
>
> /** caller 执行：write=截图+putSlot；load=getPayload+应用。 */
> export type SaveBrowserAction = { kind: 'write'; slotId: SlotId } | { kind: 'load'; slotId: SlotId }
>
> export function metasToList(metas: SaveMeta[]): (SaveMeta | null)[] {
>   const byId = new Map(metas.map((m) => [m.slotId, m]))
>   return ALL_SLOT_IDS.map((id) => byId.get(id) ?? null)
> }
>
> export function openSaveBrowser(mode: SaveBrowserMode, metas: SaveMeta[], initialCursor = 0): SaveBrowserState {
>   const n = ALL_SLOT_IDS.length
>   return {
>     active: true,
>     mode,
>     cursor: Math.min(Math.max(0, initialCursor), n - 1),
>     metas: metasToList(metas),
>     confirmOverwrite: false,
>   }
> }
>
> export function closeSaveBrowser(): SaveBrowserState {
>   return { active: false, mode: 'save', cursor: 0, metas: [], confirmOverwrite: false }
> }
>
> export function pageOf(cursor: number): number {
>   return Math.floor(cursor / SLOTS_PER_PAGE)
> }
>
> /** 导航：↑↓ ±1（全列表线性）、←→ ±整页（同行跨页）；clamp 不 wrap。覆盖确认期不动。 */
> export function browserMoveCursor(
>   s: SaveBrowserState,
>   dir: 'up' | 'down' | 'left' | 'right',
> ): SaveBrowserState {
>   if (!s.active || s.confirmOverwrite) return s
>   const n = ALL_SLOT_IDS.length
>   const delta = dir === 'up' ? -1 : dir === 'down' ? 1 : dir === 'left' ? -SLOTS_PER_PAGE : SLOTS_PER_PAGE
>   return { ...s, cursor: Math.min(Math.max(0, s.cursor + delta), n - 1) }
> }
>
> /** 确认：save —— 空手动槽→write；已存手动槽→覆盖确认；auto/quick→no-op。
>  *  load —— 已存槽(含 auto/quick)→load；空槽→no-op。 */
> export function browserConfirm(s: SaveBrowserState): { state: SaveBrowserState; action?: SaveBrowserAction } {
>   if (!s.active || s.confirmOverwrite) return { state: s }
>   const slotId = ALL_SLOT_IDS[s.cursor]
>   if (!slotId) return { state: s }
>   const meta = s.metas[s.cursor] ?? null
>   if (s.mode === 'save') {
>     if (slotKind(slotId) !== 'manual') return { state: s } // auto/quick 不可手动写
>     if (meta) return { state: { ...s, confirmOverwrite: true } } // 已存 → 覆盖确认
>     return { state: s, action: { kind: 'write', slotId } } // 空 → 写
>   }
>   if (!meta) return { state: s } // load 空槽不可读
>   return { state: s, action: { kind: 'load', slotId } }
> }
>
> export function browserConfirmOverwriteYes(s: SaveBrowserState): {
>   state: SaveBrowserState
>   action?: SaveBrowserAction
> } {
>   if (!s.confirmOverwrite) return { state: s }
>   const slotId = ALL_SLOT_IDS[s.cursor]
>   return { state: { ...s, confirmOverwrite: false }, action: slotId ? { kind: 'write', slotId } : undefined }
> }
>
> export function browserConfirmOverwriteNo(s: SaveBrowserState): SaveBrowserState {
>   return s.confirmOverwrite ? { ...s, confirmOverwrite: false } : s
> }
> ```
>
> - [ ] **Step 4：写失败测试 `ops.test.ts`**
>
> ```ts
> import { describe, expect, test } from 'vitest'
> import { initialWorld } from '@type-pal/content'
> import { buildMeta, buildPayload } from './ops.js'
> import { SAVE_VERSION } from './types.js'
>
> describe('save ops（纯）', () => {
>   test('buildMeta：队伍名+等级快照、kind、注入 now', () => {
>     const w = initialWorld()
>     const m = buildMeta('m01', w, '鬼界·民居', (c) => `名:${c.template}`, 999)
>     expect(m).toEqual({
>       slotId: 'm01',
>       kind: 'manual',
>       party: w.party.map((c) => ({ name: `名:${c.template}`, level: c.level })),
>       mapName: '鬼界·民居',
>       savedAt: 999,
>     })
>   })
>   test('buildPayload：version=SAVE_VERSION + world + position', () => {
>     const w = initialWorld()
>     const p = buildPayload(w, { sceneId: 's', x: 1, y: 2, facing: 'down' })
>     expect(p.version).toBe(SAVE_VERSION)
>     expect(p.world).toBe(w)
>     expect(p.position).toEqual({ sceneId: 's', x: 1, y: 2, facing: 'down' })
>   })
> })
> ```
>
> - [ ] **Step 5：写 `ops.ts`**
>
> ```ts
> import type { CharacterInstance, Facing, WorldState } from '@type-pal/content'
> import { SAVE_VERSION, type SaveMeta, type SavePayload, type SlotId, slotKind } from './types.js'
>
> /** 队伍显示快照：名字(已解析,nameOf 注入)+ 等级。now 注入(Date.now())。 */
> export function buildMeta(
>   slotId: SlotId,
>   world: WorldState,
>   mapName: string,
>   nameOf: (c: CharacterInstance) => string,
>   now: number,
> ): SaveMeta {
>   return {
>     slotId,
>     kind: slotKind(slotId),
>     party: world.party.map((c) => ({ name: nameOf(c), level: c.level })),
>     mapName,
>     savedAt: now,
>   }
> }
>
> export function buildPayload(
>   world: WorldState,
>   position: { sceneId: string; x: number; y: number; facing: Facing },
> ): SavePayload {
>   return { version: SAVE_VERSION, world, position }
> }
> ```
>
> - [ ] **Step 6：测试 + check + biome** 绿/0
> - [ ] **Step 7：commit** — `feat(reforge): 存档浏览状态机(翻页/两模式/覆盖确认) + 纯 build 函数`
>
> ---
>
> ## Task C〔Claude〕：缩略图捕获 + 浏览界面 UI + main.ts 集成（我做）
>
> > 重前端视觉活 + main.ts 集成,Claude 执行（GLM 勿动）。此处列结构与接口,实现时按截图迭代。
>
> **Consumes**：Task A 的 `SaveStore`/`IndexedDbSaveStore`/`MemorySaveStore`/`SaveMeta`/`SavePayload`/`ALL_SLOT_IDS`/`TOTAL_PAGES`/`SLOTS_PER_PAGE`/`slotKind`；Task B 的 `SaveBrowserState`/动作函数/`buildMeta`/`buildPayload`/`pageOf`。
>
> - [ ] **C1 缩略图捕获** `save/ops.ts` 追加（canvas,Claude）：
>   - `captureThumbnail(source: HTMLCanvasElement, w=64, h=40): Promise<Blob>` —— 离屏 canvas `drawImage(source,0,0,w,h)` → `toBlob('image/png')`。截**主画面帧**（UI 层之前）。
> - [ ] **C2 浏览界面 UI** `menu/save-browser-box.ts`：`drawSaveBrowser(ctx, state, assets, glyphs, now, locale, thumbs)`：
>   - 320×200：标题（读取/储存进度）+ 页码（第 `pageOf(cursor)+1`/`TOTAL_PAGES` 页）。
>   - 当前页 3 槽卡（`SLOTS_PER_PAGE`）：左缩略图（Blob→ImageBitmap，main.ts 持缓存 `thumbs: Map<SlotId,ImageBitmap>`）+ 右「队伍名+等级」「地图名」「时间」；空槽显「空槽」；auto/quick 卡头标「自动」「快速」。
>   - 选中槽 6 帧闪；save 模式 auto/quick 卡灰显（不可写）。
>   - `confirmOverwrite` → 叠覆盖确认框（复用 `drawConfirmBox`，文案「覆盖？否/是」）。
> - [ ] **C3 系统菜单接入** `system-menu-state.ts`：save/load 去 `disabled`；`systemConfirm` 改为按 id 分流——`save`→action `open-save`、`load`→action `open-load`、`quit`→confirm、`music`/`sound`(disabled)→placeholder。（⚠ 现有 `systemConfirm` 是「非 disabled→confirm」,启用 save/load 后必须改,否则 save/load 误进退出确认。）
> - [ ] **C4 main.ts 集成**：
>   - 模块态：`let saveStore: SaveStore`（`IndexedDbSaveStore`，不可用则 `MemorySaveStore` 降级）、`let saveBrowser = closeSaveBrowser()`、`const thumbs = new Map<SlotId, ImageBitmap>()`、`let saveMetas: SaveMeta[] = []`。启动 `listMeta()` 预载 + 解码缩略图。
>   - **快速热键**：`F5`→`quickSave`（doSave 到 `quick` 槽 + toast「已快速存档」）、`F9`→`quickLoad`（getPayload('quick')→应用 + toast / 无档 toast）。
>   - **系统菜单**：`open-save`→`saveBrowser = openSaveBrowser('save', saveMetas)`；`open-load`→`openSaveBrowser('load', saveMetas)`。
>   - **浏览输入**：方向 `browserMoveCursor`；Enter `browserConfirm`（write→doSave、load→doLoad+应用）；覆盖确认期 Enter/方向走 `browserConfirmOverwriteYes/No`；Esc 关浏览（回系统菜单）。
>   - **render**：`saveBrowser.active` → `drawSaveBrowser(...)`（全屏面板,替换式,符合「全屏面板不留一级主菜单」）。
>   - **编排** `doSave(slotId)`：`thumb=await captureThumbnail(canvas)`；`meta=buildMeta(slotId, world, mapName, c=>lookupText(\`name.${c.template}\`, zhLocale), Date.now())`；`payload=buildPayload(world, position)`；`await saveStore.putSlot(...)`；刷新 `saveMetas`+`thumbs`。`doLoad(slotId)`：`p=await saveStore.getPayload(slotId)`；`world=p.world`；按 `p.position` 重置玩家坐标/朝向；关菜单回大世界。
>   - `mapName`/`position.sceneId`：现单场景,常量（如 `'guijie-minju'` / 显示名「鬼界·民居」）。
> - [ ] **C5 浏览器验**（5183）：F5 存→F9 读往返；系统菜单 储存→浏览(存模式,选空槽存/已存覆盖确认)、读取→浏览(读模式,读回)；翻页；缩略图显示；auto/quick 头两位、save 模式灰显。验毕杀 server。
> - [ ] **C6 提交**（Claude；按你「让提交才提交」的习惯，做完报你再推）。
>
> ---
>
> ## Self-Review
>
> 1. **范围克制**：只做「现在能做」——存储/数据模型 v1/状态机/UI/热键/接入；不做自动存档触发器、剧情字段、多场景（version 留口）。✅
> 2. **分工纯净**：GLM 的 A/B 全是可单测纯模块（存储抽象 + 状态机 + 纯 build），零视觉、不碰 main.ts；视觉/集成全在 Claude 的 C。✅
> 3. **类型一致**：A 的 `SaveMeta`/`SavePayload`/`ALL_SLOT_IDS`/`slotKind` → B 的状态机/ops → C 的 UI/集成，签名贯通。✅
> 4. **镜像既有范式**：状态机纯函数 + action 分流（对齐 use/system-menu-state）；注入式 store（对齐之前设想的 KVStore 注入）；clamp 导航（对齐网格菜单）。✅
> 5. **易错点钉死**：无新依赖（Memory 单测 + IDB 浏览器验）；纯函数注入 now；测试用 `new Blob`；**启用 save/load 必须同步改 `systemConfirm` 分流**（否则误进退出确认）；全屏面板替换式（不留一级主菜单,符合上次决策）。✅
> 6. **留口不堵死**：payload `version`；`SavePayload.position.sceneId` 为多场景留；auto 槽写入路径(doSave 到 'auto')为将来触发器留。✅
<!-- original-source-quote:end -->
