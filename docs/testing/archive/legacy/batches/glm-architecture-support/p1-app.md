# P1 · App.tsx 所有权与边界取证（ARCH-SUPPORT-GLM-1）

日期 2026-09-25。冻结 SHA `3270473862d1e1574f266b70b65de89ca8b65352`（生产文件与 b11d4bc9 零 diff）。
对象：`packages/editor/src/ui/App.tsx`（实测 `wc -l` = **5170 行**，与卡面一致）及直接 hooks/caller
（`core/editor-history-coordinator.ts`、`core/editor-derived-store.ts`、`ui/app-command-registry.ts`、
`ui/editor-navigation.ts`、`ui/SoundPicker.ts`）。**本报告为静态只读取证；所有"covered"以精确测试标题为准，
无运行证据处一律标 risk/blocked，不以行数判 bug。**

> **r2 返工更正（Codex intake counter 0e751efe，2026-09-25）**
> ① P1-001 撤回原"props 传入且无 stop"前提：derivedStore 实为 App 内 `useMemo(createEditorDerivedStore)`
> 创建（App.tsx:422-425），`start()` 返回 `stop`（editor-derived-store.ts:405-415：置 running=false/
> epoch+1、退订 main/script 两会话、`port.terminate()`、清 inFlight），effect 返回值即清理函数——链路闭环，
> 条目改 covered（本轮执行 derived-store 测试 22/22）。② editor-navigation.test.ts 实为 **17 个 it 测试**
> （r1 误称"0 个 test( 命中、只是 helper 库"——grep 只搜了 `test(` 漏 `it(`），17 条完整标题已入机账 P1-005。
> ③ assertSessions 移入 effect 不再作为"已论证修复"表述（P1-002 降为纯 risk 记录）。④ 资源清单补全量
> useState/useRef 逐行登记（§1.1）。⑤ "state/derived*" 目录指向错误，更正为 core/editor-derived-store.ts。

## 1. 资源清单（谁建 / 谁改 / 谁清）

实测计数（r3 AST 口径，App 作用域 :360-3705）：`useState` **29**、`useRef` **16**、`useEffect` **15 + useLayoutEffect 1**、`addEventListener` 3（beforeunload:402、
popstate:573、keydown:2064，三处均有对称 removeEventListener 清理）、`requestAnimationFrame` 4、
`setTimeout` 1（:2225）、`ResizeObserver` 1（:1610，disconnect 清理）。

| 资源 | 建于 | 修改 | 清理 | 评注 |
|---|---|---|---|---|
| 试玩窗口集合 `trialWindows: Set<TrialHandle>` | App :385 | :645/:676（onClosed 删除） | effect :387-394 卸载时逐个 `trial.close()` + clear | 所有权闭环完整 |
| 试玩 beforeunload 守卫 | effect :396-405 | — | :403 remove | 依赖 `[trialDraft?.changed]`，changed=false 时不挂守卫（预期内） |
| historyCoordinator | props 传入（App 不建） | `useLayoutEffect` :407-417 `connect()`（**App 作用域内唯一的 useLayoutEffect**，r1/r2 曾误归入 useEffect 计数） | `dispose()` 对称 | 所有权在调用方（workspace 组合层），App 只绑定；`assertSessions` :411 在渲染期调用（见 risk-P1-002） |
| derivedStore | **App 内 useMemo 创建**（:422-425 `createEditorDerivedStore({mainSession, scriptSession})`） | effect :426 `start()`：订阅 main/script 两会话 + 启动 worker，**返回 `stop`** | effect 返回值即 `stop`（editor-derived-store.ts:405-415：running=false/epoch+1/退订两会话/`port.terminate()`/清 inFlight） | **r2 更正：闭环完整**（本轮执行其测试 22/22，含 `…stop cancels a queued refresh…`） |
| soundPreview（assetReader） | props 传入 | — | effect :491-495 `disposeSoundPreview(assetReader)` | 闭环完整 |
| 导航 location（URL replaceState） | effect :561-565 | `locationRef` | —（幂等 replace） | localStorage 持久化 :505-514；无清理需求 |
| popstate 监听 | effect :570-576 | — | :574 remove | 闭环完整 |
| 滚动恢复 rAF | effect :578-594 | 三栏 scrollTop | :593 `cancelAnimationFrame` | 闭环完整；DOM 查询限定 `:scope >` 子选择器，无全局越界 |
| ResizeObserver | effect :1610-1618 | bodyWidth state | :1617 `disconnect()` | 闭环完整 |
| ensureMapLoaded 触发 | effect :1660-1666 | — | 无（fire-and-forget + catch 吞错，**仅此调用点**） | 见 risk-P1-003（r2 收窄：不推及整页错误反馈能力） |
| 全局 keydown（保存/撤销/布局快捷键） | effect :1997-2092 | — | :2064-2065 remove | 依赖数组 13 项（scene/selected/placingEntity/drawer.open/…）——见 risk-P1-004 |
| document.title | effect :2094-2096 | — | 无需 | 幂等 |
| 一次性 `setTimeout 0` | 保存流程 :2225 | — | —（宏任务让位 modal） | 注释明确用途；非资源 |

## 2. 导航 / 保存 / 历史 / 试玩边界图

- **导航**：`location` state（:431）+ `locationRef` 镜像；URL `replaceState`（:561-565）与
  `localStorage`（navigationStorageKey :500-514）双写；`popstate` 只读 search 反解（:570-576）。
  各模块独立 location 记忆（moduleLocations :438-441）。测试
  `editor-navigation.test.ts`——**r2 更正：实为 17 个 `it` 测试**（r1 误按 `test(` grep 得 0；
  17 条完整标题入机账 P1-005），另有 App.reference-navigation.test.tsx 20 条引用导航用例。
- **保存**：`executeEditorSaveShortcut` 统一入口（app-command-registry.test.ts:24
  `routes Cmd/Ctrl+S through the same save command and always blocks browser save`）；
  保存流程 :2200+ 先 `activity(preparing)` → 宏任务让位 → `serializeEditorSnapshot` →
  `projectGuard.isCurrent(lease)` 逐段失效检查 → journal 式首存资产流（:2231 注释）→
  recoverySnapshot ref 管理**已写未发布 blob 的中断恢复**（:2237-2240）。
- **历史**：`EditorHistoryCoordinator`（core/editor-history-coordinator.ts）`assertSessions` +
  `connect/dispose`；D-01 五条回归（App.leave-guard.test.tsx:261/318/366/391 + 199）覆盖
  菜单/工具栏/键盘同序、编辑中不跨界、失败可见可重试、真实 App 保存失败后 undo 修复。
- **试玩**：`launchBattleTrial` 窗口集合 + onClosed 自删 + 卸载全关（:387-394）；
  quick-trial 草稿保真由 leave-guard.test.tsx:199 覆盖。

## 3. 现有测试去重表（精确标题 → 它确实证明了什么 → 本次差异）

| 测试（文件:行，完整标题） | 确实证明 | 与本包差异 |
|---|---|---|
| app-command-registry.test.ts:10 `keeps menu, toolbar and shortcut views on one handler identity` | 菜单/工具栏/快捷键同 handler 身份 | 静态结构已 covered；本包不重复 |
| app-command-registry.test.ts:24 `routes Cmd/Ctrl+S through the same save command and always blocks browser save` | S 键路由+浏览器保存阻断 | covered |
| app-command-registry.test.ts:96/:115（toggle state 无新 handler / 拒绝重复或缺失 command id） | registry 不变量 | covered |
| App.leave-guard.test.tsx:261 `D-01 toolbar, edit menu and keyboard share exact history order; save/reopen keeps final state` | 历史三入口同序+保存重开终态 | covered |
| App.leave-guard.test.tsx:318 `D-01 history shortcuts do not cross text editing, composition or an open modal` | 编辑中/组合输入/模态不串快捷键 | covered |
| App.leave-guard.test.tsx:366 `D-01 failed undo is visible and retryable without losing the pending operation` | 失败可见可重试 | covered |
| App.leave-guard.test.tsx:391 `D-01 missing private body fails through actual App save before writer IO, then undo repairs and saves` | 真实保存链失败+undo 修复 | covered |
| App.leave-guard.test.tsx:485/:547/:567（clean new / real save commits / committed cleanup warning） | 丢弃一次/双 session 提交/清理警告不冒充失败 | covered |
| App.leave-guard.test.tsx:199 `quick trial detail cannot silently replace edited temporary configuration; cancel keeps it and explicit consent replaces it` | 试玩草稿保真 | covered |
| App.reference-navigation.test.tsx 20+ 条（:427-1104，如 `场景引用会同时切换场景、实体、脚本抽屉和精确指令`、`统一 scene/entity locator 会退出放置模式、展开检查器并验证目标仍存在`、`过期子对象定位保持既有场景焦点，不先清空再报错` 等） | 引用导航/过期目标拒绝/locator 家族 | covered——r4/r5 的引用导航层证据在此层，不重复 |
| design-system/boundary.test.ts:787/1317/1363/1379/1497（App.tsx 列入边界清单） | UI 结构边界（文案/结构正则） | covered；本包只读不改 |

**未覆盖区（本包证据点）**：卸载清理（trial.close / derivedStore 生命周期 / keydown 解绑）没有
任何测试驱动 unmount 路径；:2225 的 `setTimeout 0` 让位序与 :2228 `activity(preparing)` 的先后无回归。

## 4. 证据条目（P1-00x，分类按统一纪律；r2 更正见各条标注）

- **P1-001 covered（r2 撤回原 risk 并更正）** `App.tsx:422-426` + `core/editor-derived-store.ts:394-417`：
  derivedStore 由 App 内 `useMemo(createEditorDerivedStore(...))` 创建（r1 误写"props 传入"）；
  `start()` 订阅 main/script 两会话并启动 worker，**返回 `stop`**；`stop` 置 running=false/epoch+1、
  退订两会话、`port.terminate()`、清 inFlight；effect `useEffect(() => derivedStore.start(), [derivedStore])`
  返回值即清理函数。本轮执行 `editor-derived-store.test.ts` **22/22 通过**（含
  `editor derived worker store stop cancels a queued refresh and ignores late worker events`）。
- **P1-002 risk** `App.tsx:411` `historyCoordinator.assertSessions(session, scriptSession)` 在
  组件体（渲染期）直接调用——契约上是断言（fail-loud），渲染期 throw 会让整树崩而非显示错误
  边界。现有测试只覆盖 happy path。**r2 更正：撤回"建议移入 effect"的修复表述**——是否迁移及
  替代方案未经论证，仅记录现状与失败路径无测试覆盖的事实。
- **P1-003 risk（r2 收窄）** `App.tsx:1660-1666` `ensureMapLoaded(id).catch(() => undefined)`——
  **该调用点**静默吞掉地图加载失败、无就地反馈；不推及整页错误反馈能力（App 其它路径存在可见
  错误 UI，如 V0 截图的渲染失败 banner）。非缺陷复现。
- **P1-004 risk** 全局 keydown effect（:1997-2092）依赖数组 13 项，每次场景/选中/抽屉变化都要
  解绑重绑 window listener；行为正确（清理对称），但重绑频率高——拆分后应把 handler 依赖收进
  ref 以减少 window 级 churn。标 risk（性能/可维护性），无行为变化。
- **P1-005 covered（r3 按 AST 重做）** 盘点为 **useState 29 / useRef 16 / useEffect 15 + useLayoutEffect 1**（§4.1）；去重表为**完整标题清单**：editor-navigation 17 条 it + app-command-registry 4 条 + App.leave-guard 8 条（全文见 evidence.json P1-005.tests 与 §3 表）；design-system/boundary.test.ts 5 处 App.tsx 引用按文件计数登记（口径：已读断言 vs 文件计数）。
- **P1-006 N/A** `setTimeout` :2225 用途注释明确（modal top-layer 让位），无资源泄漏；无新证据。

## 4.1 全量 state/ref/effect 登记（r3 按 AST 实测重做；行号为调用/声明行）

**口径**：TypeScript AST 限定 `export function App` 作用域（:360-3705）；全文件另有 4 个 useState 属
其它组件（:3765 filter/:4010 activeId/:4107 spriteViewerOpen/:4807 inspectorTab），分开口径不计入本表。

- **useState 29**：:382 [trialDraft]、:383 [trialSubject]、:384 [trialLeave]、:430 [location]、
  :434 [moduleLocations]、:499 [workspaceNotice]、:593 [selected]、:594 [sceneLifecycleIntent]、
  :597 [placingEntity]、:598 [scriptChannel]、:599 [selectedBehavior]、:600 [selectedPage]、
  :602 [canvasLayers]、:611 [placeSceneId]、:618 [placeMode]、:619 [placeActorId]、
  :620 [placeSpriteId]、:621 [placeZoneRanges]、:632 [saveErr]、:633 [saveActivity]、
  :711 [drawer]、:729 [sharedScriptFocus]、:734 [entityPageFocus]、:740 [canonicalReferenceFocus]、
  :744 [canonicalOwnerFocus]、:748 [itemPrivateScriptFocus]、:755 [entityHostileFocus]、
  :761 [canonicalPageFocus]、:1558 [bodyWidth]。
  （r2 曾误写"24 个 + saveConfirm/saveProgress 等四 state"——该四者不存在，实际是 saveCommandRef
  与派生变量；r3 以 AST 重做并核读写/清理归属。）
- **useRef 16**：:385 trialWindows、:386 trialMounted、:428 bodyRef、:429 storedNavigationRef、
  :433 locationRef、:437 moduleLocationsRef、:438 scrollPositionsRef、:595 createSceneButtonRef、
  :596 sceneOutlineRowRef、:625 dirHandleRef、:627 saveAttemptDirRef、:629 snapshotRef、
  :630 authorBaselineRef、:631 firstSaveAuthorRef、:635 saveCommandRef、:724 preciseFocusRevisionRef。
- **useEffect 15**：:387（试玩窗口关闭）、:396（试玩 beforeunload）、:426（derivedStore start/stop）、
  :491（soundPreview dispose）、:561（URL replaceState）、:570（popstate）、:578（滚动恢复 rAF）、
  :686（placeSceneId 跟随）、:1610（ResizeObserver）、:1660（ensureMapLoaded）、:1741/:1746
  （脚本页焦点重置）、:1758（canonical/entity 页焦点消费）、:1997（全局 keydown）、:2083（document.title）。
- **useLayoutEffect 1**：:407（historyCoordinator connect/dispose——r1/r2 误归入 useEffect 计数）。

读写/清理归属对照见 §1 表（each effect 的清理函数核对保留在表内）。

## 5. 最小可拆单元建议（供实施批次参考，非本包执行）

按所有权耦合度从低到高：① document.title effect（零耦合）→ ② 滚动恢复/ResizeObserver
（bodyRef 局部）→ ③ 导航 location/URL/localStorage（自洽簇，测试已有 reference-navigation 层）
→ ④ 保存流程（lease/recoverySnapshot/journal，风险最高，最后拆）。每步以 leave-guard +
reference-navigation + app-command-registry 三个测试文件作回归门。

## 6. 未证风险

- ~~derivedStore 实例语义~~（r2 已以 22/22 测试执行与源码链路闭合，撤回）。
- unmount 清理路径无运行时证据（静态读出对称清理，未见泄漏实证）。
- assertSessions 渲染期失败路径无测试覆盖（P1-002）。
