# ED-INPUT-PERF-1 - 编辑器输入提交与全局派生状态性能收口

Status: done（2026-08-26 三方实现验收 accept + 用户体验验收通过）
Phase: phase2
Capability: Editor cross-cutting（不改变 capability-map）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `codex/ed-audio-workbench-1`

## 目标

让编辑器连续字段在输入和确认提交时都保持即时响应：逐字输入只能修改带对象身份的本地草稿，Enter / blur 只产生一条
命令；命令提交后的诊断、项目问题、作者态投影和引用索引不得继续在 React 根 render 中同步深拷贝、重复扫描整个 PAL
工程。状态栏、项目页与引用面板消费同一份带 revision 的派生快照，异步检查不得削弱显式保存门或把失败伪装成“零问题”。

## 范围

- 范围内：
  - 从真实页面 registry 与生产源码生成连续字段 census，找齐 `main EditSession`、`ScriptEditSession` 及一跳
    helper 的 canonical mutation；补齐 Poison、SharedScript、Canonical Script command dialog、Scene / Entity
    Inspector 等旧采用清单漏面。
  - 普通 text / number / textarea 统一使用 keyed `draft -> validate -> commit / cancel -> resync`；脚本指令弹窗
    以整条 command draft 为一次事务，点“完成”提交一次，Escape / 关闭取消，离散选项也归该事务。
  - 非地图命令在 `maps` 与 `mapIndex` identity 均未变化时跳过 map revision / stamp usage 维护；真实地图变化只处理
    identity 改变的地图。
  - 建立每编辑会话唯一、带 `mainRevision + scriptRevision` 的派生快照 store；统一产出 content / project /
    status issues、asset references、entity-address、world-variable 与 script-reference 索引。
  - 状态栏、ProjectWorkbench 与引用 UI 共享同一 revision 的快照；同一 revision 的全局 validator / author
    projection 各最多执行一次，不允许页面私自再 `collectProjectIssues()`。
  - 全量纯诊断进入专用 Worker；主线程只发布最小诊断切片或 record patch。旧 revision 返回必须丢弃；检查中保留上一份
    已知结果并明确标记，Worker 失败必须 fail-closed。
  - 删除 render 内无条件 `mergeEditorProjectionWithCurrentAuthorState()`；扫描器优先消费只读结构共享切片和按 record
    identity 的缓存。仅删除命令等真正需要完整 projection 的动作边界允许惰性构造。
  - 修复每个 entry lookup 都重建 script reference index 的路径；每相关 revision 只建一次索引。
  - 若上述确定性热路径清零后仍不达性能预算，再在本卡 C gate 内拆 App shell / active page selector subscription；
    selector store 不是掩盖重复 scanner 的前置替代品。
- 范围外：
  - 不改 schema、save format、migration、runtime、资源身份或游戏行为。
  - 不改变一次字段编辑一条 undo command、对象切换 resync、IME、Enter / blur 幂等或显式保存的同步权威校验。
  - 不重开已经 done 的 `ED-FIELD-COMMIT-1`、`ED-DS-3`、`ED-SHARED-SCRIPT-UI-1` 或其他旧卡；旧签字只作历史证据。
  - 不把浏览器性能数字写成 jsdom 单测阈值；CI 只用确定性调用次数 / revision / history 断言。
- 明确不做：
  - 不用页面私有 debounce、延迟输入回显、全局保存 debounce 或“先显示零问题”掩盖 CPU 工作。
  - 不仅给 poison / item / project metadata 增加新的特判 cache；依赖域必须系统闭合。
  - 不把 `useDeferredValue`、`startTransition` 或 `requestIdleCallback` 当成搬走 CPU；它们仍在主线程形成长任务。
  - 不在每次 Worker 请求中重新 structured-clone 完整 7.3MB scenes；先初始化最小诊断态，后续按变更 record / slice 发布。

## 前提真值门

### 一句话行为 / 工程前提

当前草稿组件本身已把多数逐字输入留在本地，但一次 Enter / blur 命令会让根 App 同步重复验证、深拷贝和扫描整个
PAL 作者工程；另有未进入旧采用清单的连续字段仍逐字符派发 canonical command，因此“输入结束明显顿一下”是真实的
主线程派生状态架构问题，不是落盘保存或音视频缓存问题。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：二阶段作者工具的输入延迟与派生状态架构没有原版 UI 对照。 | `docs/phase2/READ-FIRST.md:1-8` |
| 第一阶段 | N/A：一阶段不包含 Reforge 编辑器或对应状态订阅模型。 | `docs/phase2/READ-FIRST.md:32-37` |
| 当前二阶段 | `DsDraft*` 的逐字输入只更新 local draft，但 blur / Enter 调用一次 `onCommit`；`EditSession.dispatch` 随即同步 notify，根 `App` 订阅整个 session。根 render 同步跑 status collector、完整 author projection 与 entity references；ProjectWorkbench 又独立跑 project issues。Poison、SharedScript 与 canonical command editor 仍有逐字符 canonical mutation 漏面。 | `packages/editor/src/ui/design-system/controls.tsx:576-669`；`packages/editor/src/core/edit-session.ts:178-190,492-523`；`packages/editor/src/ui/App.tsx:309-335,1029-1030,1340-1372`；`packages/editor/src/ui/ProjectWorkbenchTab.tsx:1332-1348`；`packages/editor/src/ui/PoisonTab.tsx:343-345,436-442`；`packages/editor/src/ui/SharedScriptTab.tsx:306-312`；`packages/editor/src/ui/ScriptEditor.tsx:3161-3179` |
| 本任务目标 | 输入期零 canonical command；提交期只做局部命令和一次通知，所有全局诊断 / 投影 / 引用工作脱离 urgent render，并按 revision 共享、去重、可验证地更新。 | 用户 2026-08-25 明确要求处理每次字段修改后的明显卡顿；本卡性能与正确性验收矩阵。 |

### PAL 基线实测（2026-08-25 Codex / Chromium + Node 热跑）

- 工程规模：294 scenes、5077 entities、701 entries、234 items、1934 assets；scene JSON 约 7.3MB、562949 节点。
- 真实角色“当前体力”字段，四次 warm commit：逐字 / fill 9–54ms；Enter commit 1050–1134ms。
- 单次分段：`collectEditorStatusIssues` 392.8ms；完整 projection 在 React dev StrictMode 两次
  254.8 + 266.0ms；entity reference 两次 16.6 + 14.5ms；React root `actualDuration` 1050.8ms。
- 独立 Node 热跑中位数：`validateReferences` 181.7ms；author reference slices 234.8ms；完整 projection
  347.6ms；App 主要同步链 953.6ms；Project page 因重复 collector 达 1356.1ms。
- 对照证据：全量 serialize / write 只在显式 save 路径，且先 yield 让 dialog paint；字段 commit 不落盘。
  代码锚点：`packages/editor/src/ui/App.tsx:1596-1660`、`packages/editor/src/core/project-io.ts:135-140,257-268`。

### 反证与替代解释

- 最强替代解释：浏览器自动化通信、React 开发 StrictMode 或组件树 reconcile 才是卡顿主因，全局 scanner 并非主要成本。
- 什么观察会推翻当前前提：移除自动化通信后提交仍只慢在 locator 往返；或隔离运行 scanner / projection 接近 0ms，
  而无 scanner 的根 render 仍稳定超过 1s。
- 已有观察为何否定替代解释：fill 与 commit 使用同一浏览器通道但相差约 1s；独立 Node 热跑复现 953.6ms 主要同步链；
  分段计时中诊断 + projection 已解释约 914ms。StrictMode 会放大纯 `useMemo` projection，但单次 projection 与
  validator 仍分别为数百毫秒，生产模式也不达 50ms long-task 预算。
- audit 红项如适用，已排查的替代根因：
  - runtime 语义 / 命令分类：不适用；运行时未参与作者字段提交。
  - 原版 / 第一阶段理解：不适用；无对应编辑器。
  - extractor / 地图 / 数据解码：工程规模放大问题但不是错误数据；PAL 294 scenes 是合法 current 项目输入。
  - audit / test model：现有 100 input 测试只证明 `commit=0/1`，未测根 render 或 PAL 提交延迟；必须新增确定性
    调用计数与真实 Chromium 性能证据。

### 用户可见偏离

- 是否主动偏离已核真值：yes。
- `before -> after` 一句话：逐字输入或一次确认会同步触发整项目命令 / 派生扫描并冻结约 1 秒 -> 输入只改本地草稿，
  提交立即回显且主线程不跑全局 scanner，诊断在独立 revision 快照中异步、准确地刷新。
- 代表场景：项目显示名、角色当前体力、毒名称、物品说明、共享脚本说明与 canonical 指令参数。
- 用户裁决：2026-08-25 用户明确要求修复每次字段修改后的明显卡顿。

## 上下文锚点

- 已拍板决策 / 铁律：
  - `ED-FIELD-COMMIT-1:33-34,54-55` 明确：草稿收口后仍不达指标时另开 selector-store / 性能架构卡；不得重开旧卡。
  - 同一 edit cycle 只能产生一条 command / history；IME、Enter+blur、Escape、对象切换、undo/redo 合同不变。
  - 状态 UI 可异步更新，但显式 save 必须继续对 current state 做同步权威校验。
- 代码锚点（`file:line`）：
  - `packages/editor/src/ui/App.tsx:309-335,1029-1030,1340-1372,2833-2846`
  - `packages/editor/src/core/project-diagnostics.ts:273-376,531-639`
  - `packages/editor/src/core/editor-asset-references.ts:20-50`
  - `packages/editor/src/core/script-editor-projection.ts:138-181`
  - `packages/editor/src/core/script-references.ts:63-66,299-312`
  - `packages/editor/src/core/edit-session.ts:178-190,492-523`
  - `packages/editor/src/core/script-editor.ts:852-880,923-978`
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:1332-1348`
  - `packages/editor/src/ui/design-system/field-commit-adoption.json`
  - `packages/editor/src/ui/design-system/field-commit-boundary.test.ts`
- 已知坑 / 审计文档：
  - `docs/ops/tasks/ED-FIELD-COMMIT-1-editor-field-draft-commit-boundary.md`
  - 历史提交 `1ba29ce4 fix(editor): remove variable field focus lag` 只给 world-variable metadata 增加 cache 特判，
    证明同根问题存在且页面特判不能闭环。
- 不得重新引入：每字符 canonical command、页面私有 debounce、每页独立 diagnostics、render 内完整 projection、
  旧 revision 覆盖新结果、Worker 失败显示零问题、保存依赖异步快照。
- 相关测试：`design-system/controls.test.tsx`、`field-commit-boundary.test.ts`、`project-diagnostics.test.ts`、
  `editor-asset-references.test.ts`、`edit-session.test.ts`、`script-editor.test.ts`、相关 Tab tests。

## 验收条件

- 功能 / 事务：
  - 真实 registry 连续字段 census 闭合；任何 canonical text / number / textarea 在 100 input 中 main / script
    historyVersion 均不变，blur / Enter 后恰 +1；Enter+blur 仍为一条；IME、Escape、对象切换、undo/redo 正确。
  - canonical command dialog 内多次文本、数字和离散修改只形成一个 local command draft；“完成”一条 history，取消零 history。
  - 非地图命令不读取 stamp placements；地图修改、undo/redo 与 lazy-loaded map 的 revision / usage 语义保持原样。
- 派生快照 / 正确性：
  - 同一 `{mainRevision, scriptRevision}` 最多一次 content validator、一次 author projection、一次 asset / entity /
    world-var / script index；状态栏与 ProjectWorkbench 不再分别 collect。
  - Worker fresh snapshot 与当前同步 `collectEditorStatusIssues + collectProjectIssues` 对同一 fixture deep-equal
    （severity/code/message/path/target、去重与稳定顺序）；覆盖 invalid asset、startWorld、entity、script、world-var。
  - revision N 晚于 N+1 返回时丢弃 N；检查中明确可见；Worker error 保留上次结果并显示失败，不得显示“0 项”。
  - 显式 save 的 current-state validator 不读 Worker snapshot；上述每类 invalid fixture 仍被 save 门拒绝。
- 确定性性能门禁：
  - metadata / name-only commit 的同步阶段对 `validateReferences`、author slices、完整 projection、entity / asset
    scanners 调用均为 0；ProjectWorkbench 额外 collector 调用为 0。
  - script reference index 每 revision 构建一次；31-entry scene 不得构建 31 次。
  - selector subscription 只在 A/B 切片仍不达预算时进入；进入前后都以调用次数和 PAL trace 证明收益，不能凭架构名验收。
- 真实 PAL Chromium（warmup 后每类 20 次，记录原始样本与 p95）：
  - 项目、角色、物品、毒、共享脚本各抽一个连续字段；keypress / input 到下一帧 p95 ≤16ms、0 个 ≥50ms Long Task。
  - metadata commit 到下一帧 p95 ≤16ms、max <50ms；真正改变引用语义的 commit 主线程 max <50ms。
  - 10 次连续编辑期间焦点、窄宽度、滚动、弹层、撤销可操作；项目页与非项目页同一命令同步成本差 <20ms。
  - Worker 在 100ms 内进入“检查中”，PAL fresh snapshot p95 ≤1s 且不阻塞主线程。
- 测试纪律：每切片先跑聚焦测试；最终只跑一次 editor 全量、typecheck、design-system gates，不重复耗时全量。
- 文档：记录 derived snapshot 数据流、revision / stale / fail-closed 合同、worker 最小诊断态、同步保存边界和删除条件。
- 视觉 / 手工验证：默认宽度与 720px、100% / 125% 缩放；检查输入、Tab / blur、弹窗完成 / 取消、状态栏
  “检查中 / 失败 / 最新结果”、项目问题页刷新与 undo/redo 焦点。
- E2E 用例登记：N/A（功能性编辑器界面在 build 期做最小浏览器验证）。

## 推进签字

### 进入 build 前：设计签字

- Codex：
  - premise: **verified（2026-08-25）**。真实 Chromium 4 次 warm commit 为 1050–1134ms；分段 trace 与 PAL
    Node 热跑均把主要成本定位到同步 diagnostics / projection / 重复 project collector，且代码直读证明显式保存不在热路径。
  - design: **agree（2026-08-25）**。先闭合漏采用与无争议 fast path，再建立唯一 revision snapshot + Worker，
    保持保存门同步权威；只有剩余 render 成本仍超预算才进入 selector subscription C gate。
- Kimi：
  - premise: **verified（2026-08-25 独立直读全链，非代理）**。前提“不是保存/缓存，而是 commit 后同步
    重复全扫”逐点成立：①根订阅 `App.tsx:309-335` 对 main/script 两 session 全量订阅；②commit 后根
    render 同步跑 `statusIssueCollector(state, scriptState)`（:1029-1030）——其内部仅在所有切片 identity
    不变时才复用（project-diagnostics.ts:611-627），任一内容编辑换切片即全量重跑 validateReferences +
    script/world-var/entity/project 五路（:531-570）；③render 内完整投影
    `mergeEditorProjectionWithCurrentAuthorState`（App.tsx:1357-1360）+ 全库 entity 引用扫描
    （:1361-1372）；④ProjectWorkbenchTab 再独立 `collectProjectIssues`（:1345-1348）——同一修订的
    重复 collector 实锤；⑤`findSceneEntryReferences` 每次调用重建全项目索引（script-references.ts:
    303-313），App 按 entry 逐个调用（:1347-1356）——31 entry 建 31 次属实；⑥`trackMapChanges` 对
    每次 dispatch 遍历全图 + stamp usage（edit-session.ts:492-523），无 maps/mapIndex identity 短路。
    漏采用面直读属实：PoisonTab 名字逐字符 dispatch（:436-442）、SharedScriptTab 说明 textarea
    逐字符 update（:306-312）、canonical 指令弹窗 onChange 即 commit（ScriptEditor.tsx:3171-3179）。
    最强替代解释（StrictMode/自动化通道为主因）不足：卡内 Node 热跑脱离 React 复现 953.6ms 同步链，
    与代码结构一致；fill 与 commit 同通道差约 1s。revision 键控所需单调计数器两 session 现成
    （edit-session.ts:284-289 version/historyVersion、script-editor.ts:950-955），markSaved 只 notify
    不涨 historyVersion，不污染快照键。
  - design: **agree（2026-08-25，附 KP1-KP4，build 必落钉）**：
    - **KP1（revision 键与失效语义）**：快照键 = `{mainHistoryVersion, scriptHistoryVersion}`（内容事务
      版本），不用 state 引用判等；markSaved/纯通知不得 invalidate；Worker 返回携带双版本，主线程只接收
      当前版本，旧版本丢弃。
    - **KP2（fail-closed 与显式状态联合）**：`checking/current/stale/failed` 联合；Worker error → failed +
      保留上次结果，任何状态不得显示“0 项问题”伪健康；differential 测试须含 worker 抛错用例。
    - **KP3（保存门同步权威）**：显式 save 继续对 current state 跑同步 collector（不读 Worker 快照）；
      测试钉“Worker 快照 stale 时 invalid fixture 仍被 save 拒绝”。
    - **KP4（C gate 退出条件）**：selector subscription 只在 A/B 后 PAL trace 仍 commit max ≥50ms 时
      启用，启用前后各留调用次数 + trace 证据；达预算即停，禁止预支。
- GLM：
  - premise: **verified（2026-08-25，本人一手直读根 render 链 + 漏面 + 保存路径 + 规模，非代理；不依赖 Codex 计时）**：
    1. **"commit 后同步重复全扫"前提在代码层独立坐实**：
       - `App.tsx:1029-1030`——`statusIssues = statusIssueCollector(state, scriptState)` 位于
         **render body、无 useMemo 包裹**：`dispatch→notify→useSyncExternalStore(:311)→根
         重 render→全量 status collector 每次都跑`——链路逐行属实。
       - `App.tsx:1357-1358`——`mergeEditorProjectionWithCurrentAuthorState(scriptState,
         state)` 在 render 内构造（内部 structuredClone，projection.ts:167-171 区域），依赖
         `[scriptState, state]` 每次 dispatch 后都变。
       - `App.tsx:1347-1355`——`entryReferencesById` 对**全部 entries** 逐个
         `findSceneEntryReferences(state, ...)`（本人上一轮 ENTITY 卡审查时已见过同型；
         PAL 701 entries 全量重扫）。
       - `ProjectWorkbenchTab.tsx:1345-1348`——`collectProjectIssues(editorState, currentAuthor)`
         独立 useMemo collector：**与根 statusIssues 是两套不同 collector 分别跑同一 state**
         （重复扫描实锤，非"同一结果的两次消费"）。
    2. **漏采用面三点位逐一实锤**：PoisonTab:438-441 `DsTextInput onChange={e => patch({
       name: e.target.value })}` → :343-344 直接 `session.dispatch(new UpdatePoisonCommand)`
       ——**逐字符 canonical command**；SharedScriptTab:308-311 `DsTextArea onChange →
       update({...})` 同型；ScriptEditor:3171-3179 指令弹窗 `CanonicalCommandForm onChange →
       commit(updateAuthorCommandAt(...))` **每次表单变化整树重建 body + ScriptEditSession
       SnapshotCommand apply 三重 clone**（script-editor.ts SnapshotCommand: apply 内
       `before=clone(state); next=clone(state); transform; validateState(next);
       this.after=clone(next)`——**四次深拷贝 + 全量 validateAuthorScenes/Items**）。
    3. **保存路径不在热路径**：App save(:1596-1660) serialize/write 全部在显式 save 回调内
       await，与字段 commit 无关；本人核 PAL scenes 294 文件 22.9MB（工作树原始字节含缩进）
       ——Codex 报 7.3MB 为 minified 后口径，数量级一致，规模放大成立。
    4. **最强替代解释独立核验**：StrictMode 双跑只放大纯 useMemo（entity refs 两次 16.6+14.5
       即证据——两次结果相近说明纯函数重跑），而 statusIssueCollector **连 useMemo 都没有**，
       StrictMode 与否都全跑；fill vs commit 同通道差 1s 的对照逻辑成立。
  - design: **agree（2026-08-25，附 GPerf1-GPerf3，不阻塞准入）**——A/B/C gate 顺序正确
    （先闭合漏采用与 fast path、再 store+Worker、selector 只作 C gate 兜底）；同步保存门
    保留为 oracle；不重开 FIELD-COMMIT。
  - **必落钉 GPerf1-GPerf3**：
    - **GPerf1（census 与 field-commit-adoption 的关系必须显式）**：本卡的连续字段 census
      必须与 ED-FIELD-COMMIT-1 的 `field-commit-adoption.json` 8 surfaces **同一数据源或
      显式 supersede**——PoisonTab/SharedScriptTab/ScriptEditor 等漏面收编后 adoption JSON
      的 surfaces 列表须同步扩（boundary 测试断言闭合），两套 census 不允许各自漂移。
      command dialog 的"整条 draft 一次提交"是新事务形态，须在 adoption schema 里成为
      显式新类别（非 text/number/textarea 亦非离散白名单）。
    - **GPerf2（differential 的 fixture 覆盖面钉死）**：Worker/sync deep-equal 的 fixture
      矩阵至少含——invalid asset reference、startWorld 数值非法、entity 引用悬空、script
      command 引用缺失、world-variable 未登记引用（五类各至少一正一反）；另加**随机化
      mutation 对照**（同一 base state 随机挑 record 修改→worker 全量 vs sync 全量必须
      deep-equal，跑 ≥20 轮）——防增量 patch 依赖 tuple 漏字段产生假阴性。
    - **GPerf3（确定性计数断言的具体口径）**：metadata commit 同步阶段各 scanner 调用为 0
      的断言对象必须精确到函数名（validateReferences / projectCurrentAuthorReferenceSlices /
      mergeEditorProjectionWithCurrentAuthorState / collectEntityAddressReferences /
      collectProjectIssues / collectEditorAssetReferences）；"script reference index 每
      revision 一次"须以 spy 计数（31-entry scene 场景断言 build 恰 1 次）；CI 不用时间
      阈值。真实 Chromium p95 矩阵作为 build 证据留存但不进 CI。
  - 独立反证审查（至少一位非 Coding Owner 必填）：
    - 审查者：GLM（2026-08-25，见上）。
    - 独立证据锚点：App.tsx:311,1029-1030,1347-1355,1357-1372 / ProjectWorkbenchTab:
      1345-1348 / PoisonTab:343-345,436-442 / SharedScriptTab:306-312 / ScriptEditor:
      3161-3179 / script-editor.ts SnapshotCommand 三重 clone+validateState(:852-854) /
      App.tsx:1596-1660（save 异步）/ PAL 294 scenes 22.9MB 本人实测。
    - 可证伪观察：①若 statusIssueCollector 后续被包进 useMemo 且依赖不变时跳过，本前提
      对它的定性需降级（但 ProjectWorkbench 独立 collector 仍是重复）；②若 SnapshotCommand
      clone 是浅拷贝或 state 不可变共享（实测四次 clone 逐字属实——推翻即停线）；
      ③若 differential fixture 矩阵缺任一 GPerf2 五类，Worker 假阴性风险未被关死。
- counter / 分歧处理：N/A；任一方认为 Worker / incremental patch 会漏诊时留在 draft，先以 differential fixture 收敛。
- 缺签豁免：N/A。
- build 准入结论：**allowed（2026-08-25，Codex + Kimi（KP1-KP4）+ GLM（GPerf1-GPerf3）三签齐）。
  SnapshotCommand 深拷贝链已列入卡内既有风险条（GLM 证据），build 按 A/B/C gate 与量化退出条件执行。**

### 进入 done 前：审查签字

- Codex: **accept（2026-08-25）**。实现按 A/B/C gate 完成；保存门仍同步读取 current state；Worker
  differential / revision race / failed fail-closed、selector、字段事务与确定性 scanner 计数均有测试。
  PAL 五字段 20 次最终实测 input p95 6.8–8.2ms、commit max 8.6–18.2ms、worker p95
  392.1–432.0ms、urgent Long Task 0；typecheck、design gates、production build 通过。
- Kimi: accept（2026-08-26，独立直读 a7109fd4 实现 + 聚焦复跑，非代理）。按委托五项：
  - **Worker ✓**：最小诊断态 `EditorDiagnosticState = EditorState 减 maps/assetBlobs/tilesetBlobs`
    （editor-derived-contract.ts:23-26）；init 一次 + record/slice patch，patch 强制 baseRevision 匹配
    否则显式要求全量初始化（editor-derived-core.ts:81-82）；回复携带双 revision + epoch/jobId。
  - **双 revision 丢旧 ✓**：revision = 两 session historyVersion（editor-derived-store.ts:124-129）；
    receive 只接受 epoch 与 activeJobId 双匹配且 revision 等于当前目标（:385-405）；旧 revision 回复
    触发重发而非落库；`effectiveEditorDerivedStatus`（:56-70）把过期 current/stale/failed 解析为
    stale/checking，旧结果绝不冒充最新。
  - **fail-closed ✓**：worker onerror/onmessageerror/failed 回复均走 `fail()`——terminate worker、
    置 failed 并保留 lastKnown（:263-275,294-301,398-400）；UI 经 EditorDiagnosticsBar 显式
    检查中/诊断失败/stale（EditorDiagnosticsBar.tsx:38,62,80），任何状态不显示“0 项”伪健康。
  - **同步保存门 ✓**：serialize 时现场 `mergeEditorProjectionWithCurrentAuthorState`（App.tsx:1686）
    后 `assertProjectSaveValid` + `assertScriptProjectValid`（project-io.ts:140-142）同步校验 current
    state，不读 derived snapshot。
  - **session cleanup ✓**：derivedStore memo 于 session pair（App.tsx:340-344），pair 替换或卸载时
    effect cleanup 调 `stop()`——退订两 session、terminate worker、epoch+1 使迟到回复失效
    （store :407-427）。
  - 另核 B gate 两项：非地图 fast path 为 maps/mapIndex identity 短路（edit-session.ts:493-494）；
    scene entry 引用索引改为消费快照预建结果（App.tsx:1395-1396），render 内逐 entry 重建路径
    与 status/project collector 直调全部消失（本人 grep 复核）。
  - 聚焦复跑：derived-store/project-diagnostics/session-selector/script-editor/SharedScriptTab/
    PoisonTab/App.reference-navigation/battle-data-references/project-io 9 文件 110/110 全绿；
    全量采纳卡内记录未重复。
- GLM: **accept（2026-08-25 done 前终审，本人一手读码 + focused 独立复跑 + 原始样本核验，非代理；基于实现提交 a7109fd4，97 文件 +9227/-1546）**。按委托四项逐一验证：
  - **① 字段 census 闭合（GPerf1）✓**：adoption JSON 从 8 surfaces 升级为 **25 页 / 30 事务 / kind={field-draft:20, aggregate-draft:10}**（5 页 not-applicable 显式登记）——build 前钉的三个漏面全部收编：PoisonTab（battle/poison 页、DsDraft* 消费）、SharedScriptTab（story/scripts 页）、ScriptEditor 指令弹窗（scene/workspace + story/scripts + item/item 的 productionFiles 均列 ScriptEditor.tsx，aggregate-draft 即弹窗整条 draft 新类别——**GPerf1 要求的"显式新类别"落地**）。boundary 测试同步扩（+441 行）。
  - **② seeded random differential（GPerf2）✓**：`20 seeded random mutations from one base keep patches equal to cold worker and sync`——**固定 seed（0x1 起、+0x6d2b79f5 步进）真随机 record mutation、覆盖 5 lane**（本人读测试体确认非固定轮转；Codex counter 区自检也确认了原版缺陷并已改为真随机）。五类 invalid fixture 逐名核实：invalid asset reference / invalid startWorld seed / dangling entity address / missing canonical shared script + 第五类（world-variable 未登记——`state.manifest.content.worldVariable` 在 stale-save fixture 中出现）——**GPerf2 五类 + 随机 ≥20 轮全落地**；正反双态（`valid`/`matches` 伴随 `invalid`）由 `test.each` 两个循环消费（:681 stale-save 授权 + :785 worker/sync differential 正反对照）。
  - **③ 五类 stale-save ✓**：`keeps the current-state save validator authoritative while the worker snapshot is stale` + `test.each` 五类 `"stale worker cannot authorize save for $name"`——stale worker 结果**不能授权保存**，同步 save validator 仍拒绝全部五类 invalid（含独立缺失 canonical ScriptId oracle，Codex 自检补齐）。
  - **④ scanner 计数 + 性能原始样本（GPerf3）✓**：`runs no global scanner synchronously for a metadata commit`——**六个 spy 精确到函数名**（validateReferences / projectCurrentAuthorReferenceSlices / mergeEditorProjectionWithCurrentAuthorState / collectEntityAddressReferences / collectProjectIssues / collectEditorAssetReferences）+ `for ([name, scanner]) expect(scanner, name).toHaveBeenCalledTimes(0)`——**GPerf3 原钉逐字落地**；31-entry scene `buildCanonicalSceneEntryReferenceIndex` 恰 31 键专项在（script-references.test）；App.tsx 根 render `statusIssueCollector`/`collectEntityAddressReferences`/`mergeEditorProjectionWithCurrentAuthorState` **全部零直调**（本人 rg 复核）、ProjectWorkbenchTab `collectProjectIssues` 零命中——四处同步全扫全部移除。**性能原始样本核验**：evidence 文件 83 行含五字段各 20 次 input/commit/worker 原始数组（20 元素逐一对得上 p95/max 表）；全部 commit max ≤18.2ms、Long Task 0、worker p95 ≤432ms——预算达标且无"只报均值藏长尾"。
  - **focused 独立复跑 ✓**：derived-store + derived-contract 22 tests、field-commit-boundary 4 tests、typecheck 全绿（editor 全量按纪律不重跑，采纳 Codex 145/1122 记录）。
- counter / 返工处理：2026-08-25 Codex 内部终检发现两项自验缺口：原“20 轮”是固定轮转而非随机、保存门
  缺 canonical `ScriptId` 独立 oracle。已改为固定 seed、同一 base 的 20 轮随机 record mutation（覆盖 5 lane），
  并在同步保存门复用 canonical command visits 校验脚本引用；五类 stale-save fixture 与独立缺失 ScriptId 测试已通过。
- 缺签豁免：N/A
- done 准入结论：**allowed / done（2026-08-26）**——Codex + Kimi + GLM 三方实现验收 accept 已齐、
  无 counter；用户确认签字完成并同意按验收结论收口。

## Draft: 设计与风险

### 设计结论

1. **Input transaction layer**：共享 `DsDraft*` 继续持有字段草稿；canonical script command dialog 在弹层边界持有
   整条 command draft。静态门禁从 registry / production source 生成全量面，并追踪一跳 canonical mutation helper，
   搜索框等纯 UI local state 是明确正向例外。
2. **Session fast path**：EditSession 保持现有 command / history / notify 接口；map 与 mapIndex 均 identity unchanged 时
   不进入 map/stamp maintenance。此切片不等待 Worker 架构即可独立验证。
3. **Derived snapshot store**：一个 session pair 只有一个 store；输入为 immutable main/script revision 与变更 record，输出
   versioned diagnostics / reference indexes。App shell 只订阅轻量 main state；status / project / reference consumers 订阅相应
   snapshot selector，禁止 render 内自建全量索引。
4. **Worker boundary**：Worker 初始化只读、无 blob / map bitmap 的最小诊断态；后续发布 slice / record patch。结果必须携带
   双 revision，主线程只接收 current revision；pending / stale / failed 是显式联合状态。同步 collector 保留为测试 oracle 和
   save boundary，不作为每次字段 commit 的 UI 热路径。
5. **Projection / indexing**：scanner 接受 shell + canonical 的结构共享视图；per-record WeakMap cache 以对象 identity 失效；
   entry/entity/script lookup 复用一次构建的索引。完整 merged state 仅在 save 或具体 destructive command 点击边界惰性创建。
6. **Selector C gate**：A（全字段事务）+ B（fast path / derived worker / 去重）完成后先跑 PAL trace；若根 reconcile 本身仍使
   commit max ≥50ms，再拆 shell / active page selector subscription。不得预先用 selector store 掩盖 scanner 重复。

### 已知风险

- 风险：异步诊断短暂滞后，作者误以为项目健康。
  - 缓解：`checking / current / stale / failed` 显式状态；只在 current revision 显示“配置健康”；保存始终同步 fail-loud。
- 风险：Worker 增量 patch 或依赖 tuple 漏掉某字段，产生假阴性。
  - 缓解：全量同步 oracle differential、随机 slice mutation、每类 invalid fixture、revision race 与冷 fresh snapshot 对照。
- 风险：把 7.3MB 全态每次 postMessage 只会把深拷贝从 scanner 换成消息序列化。
  - 缓解：初始化一次最小态，后续发布 record / slice patch；浏览器 trace 单独计主线程 publish 成本。
- 风险：ScriptEditSession 的 SnapshotCommand 仍整态 clone / validate，单次 command dialog commit 仍可能慢。
  - 缓解：先把每字符 N 次降为每弹窗一次；若单次仍超 50ms，按同一卡切片把 command 改为结构共享的 affected-owner
    copy + 领域校验，保留同步 oracle differential，不恢复逐字符提交。
- 风险：任务范围扩大成无止境的 React 重构。
  - 缓解：A/B/C gate 与量化退出条件；C 只有在 A/B 后实测失败时启用，达到预算即停止。

### 主审立场

- Reviewer：Kimi（store / Worker / revision / save boundary）+ GLM（census / differential / 性能矩阵）。
- 结论：Codex agree；Kimi agree（KP1-KP4）；GLM agree（GPerf1-GPerf3）。
- 必改项：KP1 版本键语义、KP2 fail-closed 联合状态、KP3 保存门同步权威、KP4 C gate 量化退出、
  GPerf1 census 与 field-commit-adoption 同源、GPerf2 differential fixture 矩阵 + 随机对照、
  GPerf3 精确到函数名的计数断言。
- 是否建议进入 build：是（三签齐）。

## Build: 实现与自测

- Coding Owner: Codex（唯一实现方）
- 修改文件：
  - `packages/editor/src/core/editor-derived-{contract,core,store,worker}.ts`：统一 revision 快照、Worker
    协议、current / checking / stale / failed 状态与 last-known-result 合同。
  - `packages/editor/src/ui/{App,ConnectedEditorPages,EditorDiagnosticsBar,session-selector}.tsx/ts`：根订阅拆分、
    轻量 selector、共享诊断状态与页面消费；删除 render 内页面私有全量 collector / projection。
  - `packages/editor/src/core/{edit-session,project-diagnostics,script-references,script-editor,...}.ts`：非地图
    fast path、每 revision 索引、结构共享 metadata command、增量依赖与同步 save oracle。
  - `packages/editor/src/ui/{ActorMode,ItemTab,ItemUseEffectEditor,PoisonTab,SharedScriptTab,ScriptEditor,...}`：
    补齐 draft transaction，按真实可见依赖 memo / selector，毒引用 fail-closed 删除门。
  - `packages/editor/src/ui/design-system/field-commit-adoption.json` 与 boundary tests：census 扩到 command
    draft、旧连续字段与明确 local-only 例外，同源防回流。
- 实现摘要：
  1. A gate 补齐连续字段漏采用；canonical command 弹层持有整条 local draft，完成时一条命令，取消零命令。
  2. B gate 让 EditSession 对非地图 command 跳过 map/stamp 维护；全局诊断、投影与引用索引进入唯一
     `{mainHistoryVersion, scriptHistoryVersion}` store + Worker，旧 revision 丢弃，失败保留上一份结果并 fail-closed。
  3. 显式保存继续直接同步验证 current state；异步快照只服务状态栏、项目问题与引用 UI，不能授权保存或破坏性删除。
  4. A/B 后真实 PAL trace 仍显示根订阅与 Item / SharedScript 重型子树超过 50ms，因此按量化条件进入 C gate；
     Connected pages / selectors、目录行与效果树按实际可见语义隔离，未扩大成全站状态框架重写。
  5. 物品说明中间样本由约 402ms 逐层降至 103/58/54ms 后最终 14.6ms；共享脚本说明由约 169ms
     降至 15.2ms。最终统一五字段数据见证据文档。
- 数据流与边界：
  `command -> immutable main/script revision -> record/slice patch -> Worker oracle -> versioned snapshot ->
  selector consumer`；主线程只接受与当前双 revision 一致的结果。`markSaved` 不增加内容 revision；undo/redo
  增加 revision 并使旧结果 stale。Worker 首次只接收诊断所需切片，后续按 identity / affected records patch；
  session pair 替换或 App unmount 时 effect cleanup 同时退订两 session 并 terminate Worker。Worker 失败不清空
  已知问题；显式 save 与 Item/Poison 等破坏性删除只有在 current revision 才开放，动作内仍同步重验。
- 运行命令与结果：
  - `pnpm --filter @type-pal/editor test`：按纪律只跑一次全量；150 个 test files 通过，暴露 2 个过期
    expectation / fixture（adoption 84→86、reference-navigation fixture 缺 party/inventory）。修复后分别以聚焦
    测试验证，不重复跑第二次耗时全量。
  - `vitest ... ItemTab + ItemUseEffectEditor`：23 tests pass；最终 ItemTab 复核 14 tests pass。
  - `vitest ... battle-data-references + project-diagnostics + editor-derived-store + PoisonTab`：首轮 51 tests pass；
    PoisonTab 最终切片 7 tests pass。终检返工后 `editor-derived-store + project-diagnostics`：46 tests pass，
    `project-io`：3 tests pass。
  - `vitest ... script-editor + editor-derived-store + SharedScriptTab`：44 tests pass。
  - `vitest ... session-selector + adoption`：10 tests pass；`App.reference-navigation`：18 tests pass。
  - design-system adoption / boundary / field-commit / controls 聚焦矩阵：80 tests pass；
    `pnpm --filter @type-pal/editor audit:design-system`：86 files，3 个 evidence-bound exceptions，pass。
  - `pnpm --filter @type-pal/editor typecheck`：pass；`pnpm --filter @type-pal/editor build`：467 modules，pass。
- 性能证据：`docs/ops/evidence/ED-INPUT-PERF-1-pal-chromium-2026-08-25.md`（五字段各 20 个原始
  input / commit / worker 样本、Long Task、布局指标）。
- 跳过的检查及原因：未重复跑第二次 editor 全量；第一次全量发现的两个失败文件均已聚焦全文件通过，遵守本卡
  “最终全量只跑一次”纪律。剧情 E2E 不适用。

## 视觉验证记录

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式：in-app Chromium 1280×720 / DPR 2 手工编辑物品说明，blur 后撤销启用并恢复原值；DOM / layout
  metrics 验证滚动 owner。真实 headless Chromium 1024×576 作为 125% 等效视口复核窄宽度。
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径：N/A；本卡以交互与 layout metrics 为判据，详细数值见性能证据文档。
- 结论：默认视口与 125% 等效窄视口均无 body 横向溢出；工作区持有纵向滚动；焦点、blur、undo 可操作；
  状态栏由“检查中”进入当前 186 项诊断，未出现失败伪装零问题。
- 未完成项：无。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论：Codex 自验 accept；内部架构 / UI 只读终检无 blocker。内部 gate 终检提出 GPerf2 随机性与同步
  ScriptId 保存 oracle 两项 blocker，Codex 已返工并聚焦验证；同席复核确认两项闭合、无 blocker；
  GLM accept（2026-08-25，census/differential/stale-save/计数与原始样本核验）；Kimi accept
  （2026-08-26，Worker/双 revision/fail-closed/同步保存门/session cleanup 直读核验 + 聚焦 9 文件
  110/110 复跑，证据见“进入 done 前:审查签字” Kimi 段）。
- 必须返工项：无
- Accept / rework: **accept / done**。

## 用户验收

- 用户结论：2026-08-25 确认原约 1 秒停顿不可接受并要求系统处理；2026-08-26 在三方实现验收签字
  写入任务卡后确认收口，随后明确反馈“通过，效率提高太多了”。用户体验验收通过，无新增返工项。
- 后续任务：本卡无；ED-CATALOG-ROW-IA-1 与 ED-PROJECT-STARTUP-IA-1 继续各走自己的设计门禁。

## 交接日志

- 2026-08-26 User：实际使用后明确验收“通过，效率提高太多了”；本卡保持 done，无返工项。
- 2026-08-26 Codex：核对任务卡中 Codex / Kimi / GLM done 前 accept 均实际写入、无 counter；用户确认
  “签了”。任务转 done，仅提交任务卡与看板状态，不重复运行实现测试。无下一位 Agent 提示词。
- 2026-08-26 Kimi（done 前验收 a7109fd4）：签 **accept**。独立直读 Worker 协议（最小诊断态、init+patch、
  baseRevision 强制）、store（双 revision 丢旧、effective status 解析、epoch/jobId 竞态控制）、fail-closed
  （worker 失败保留 lastKnown、永不伪“0 项”）、同步保存门（serialize 现场 merge + 同步双 assert，不读
  快照）、session cleanup（pair 替换/卸载 stop 退订双 session 并 terminate worker）；另核 fast path
  identity 短路与 scene entry 索引改消费快照。聚焦 9 文件 110/110 复跑全绿；全量采纳卡内记录未重复。
  未修改实现，未代签 GLM，未标 done。三方 accept 已齐，待用户最终验收。

- 2026-08-25 Codex 内部终检：架构 / UI 无 blocker；gate 审查指出固定轮转不满足 seeded random、同步保存门
  未独立拒绝 canonical missing ScriptId。Codex 停止提交，补齐同 base 20 轮随机差分、五类 stale-save 与
  `collectScriptReferenceIssuesFromVisits` 保存门，聚焦 46 + 3、typecheck、build 通过后恢复 review。
- 2026-08-25 Codex：按 A/B/C gate 完成实现、自验和浏览器 / PAL 性能取证；五字段 commit max 8.6–18.2ms，
  urgent Long Task 0，production build 通过。任务转 review，Codex accept；Next: Kimi / GLM 只读验收并分别
  写 accept / counter，签字前不得标 done。
- 2026-08-25 Kimi：独立直读根订阅、status collector、render 内投影、重复 collector、逐 entry 索引重建、
  EditSession map 维护与三个漏采用面；确认 revision 键控所需单调版本两 session 现成；签 premise
  verified + design agree（附 KP1 版本键语义 / KP2 fail-closed 联合 / KP3 保存门同步权威 /
  KP4 C gate 量化退出）。未修改实现。三签齐，准入开放。
- 2026-08-25 Codex：真实 PAL 浏览器与 Node 分段 profiling 完成；证明热路径是重复 diagnostics / projection，
  不是保存或媒体缓存；同时发现 field adoption 漏面。Evidence: 本卡基线实测与代码锚点。Next: Kimi / GLM 独立设计审查，
  签字前不得修改实现文件。
- 2026-08-25 Kimi / GLM：分别完成架构与覆盖独立审查，签入 KP1-KP4、GPerf1-GPerf3，无 counter；三方
  build 准入齐。Evidence: 本卡 build 前签字表。Next: Codex 按 A/B/C gate 单 Owner 实现与验证。

## 下一位 Agent 提示词

无下一位 Agent 提示词：任务已由 Codex / GLM / Kimi 三方验收 accept，用户于 2026-08-26 确认收口，
ED-INPUT-PERF-1 已 done。

### 历史：交 Kimi / GLM review 验收（已完成，保留交接事实）

```text
接手任务：ED-INPUT-PERF-1 编辑器输入提交与全局派生状态性能收口——review 验收
任务卡：docs/ops/tasks/ED-INPUT-PERF-1-editor-input-and-derived-state-latency.md
当前状态：review；Codex build / 自验 accept，done 仅缺 Kimi / GLM accept 与用户最终验收
你的角色：Kimi 审 store / Worker / revision / save / fail-closed；GLM 审 census / differential / 测试矩阵 / 性能证据。
先读：AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本任务卡全文、
  docs/ops/evidence/ED-INPUT-PERF-1-pal-chromium-2026-08-25.md；ED-FIELD-COMMIT-1 只作冻结历史合同。
已完成：A/B/C gate、唯一 derived store + Worker、selector pages、字段 census、非地图 fast path、
  item/poison/shared hotspots、同步 save 与破坏性动作重验。五字段各 20 次：input p95 6.8–8.2ms、
  commit max 8.6–18.2ms、worker p95 392.1–432.0ms、urgent Long Task 0；typecheck/design gates/build 通过。
请验收：
1. Kimi 独立检查双 historyVersion、旧结果丢弃、failed 保留 last-known 且不显示 0、save 直接同步 current state；
   检查 selector/Connected pages 没有造成旧 session 串线或丢 unsubscribe。
2. GLM 独立检查 field adoption 同源、五类 differential + ≥20 随机 mutation、GPerf3 scanner 计数、
   五类 stale-worker 状态下同步 save 拒绝、canonical missing ScriptId 保存 oracle、poison 引用 owner/self-edge
   与 stale/failed 删除 fail-closed；核对证据中的 20 个原始样本与阈值。
3. 两方共同抽查 command dialog 取消零 history、Enter+blur 一条 history、Item/Shared metadata fast path
   不把 body/schema/save/migration/runtime 偷带进来。
输出：把本人直接证据与 accept / counter 写进“进入 done 前：审查签字”和 Review；counter 必须列精确返工项。
不要做：不得修改实现文件、不得重跑第二次 editor 全量、不得代签另一席、不得标 done；三方 accept 后交用户验收。
```

### 历史：build 前合并设计审查提示词（已完成，保留交接事实）

```text
接手任务：ED-INPUT-PERF-1 编辑器输入提交与全局派生状态性能收口——build 前合并设计审查
任务卡：docs/ops/tasks/ED-INPUT-PERF-1-editor-input-and-derived-state-latency.md
当前状态：draft / build blocked；Codex premise verified + design agree，Kimi / GLM pending
你的角色：Kimi 审 store/Worker/revision/fail-closed/save boundary；GLM 审全 registry 字段 census、重复 scanner、
worker/sync differential 与真实 PAL 性能矩阵。两方都必须独立直读一手代码，不能只复述 Codex 结论。
先读：AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本任务卡、
docs/ops/tasks/ED-FIELD-COMMIT-1-editor-field-draft-commit-boundary.md；再读任务卡列出的 App、diagnostics、projection、
EditSession、ScriptEditSession、Poison/SharedScript/ScriptEditor 与 field gate 锚点。
已完成：Codex 只读 profiling；PAL warm commit 1050–1134ms，分段与 Node 热跑已写入卡；未改任何实现文件。
请你做：核验“不是保存/缓存，而是 commit 后同步重复全扫”的前提；检查最强替代解释；逐项审 A/B/C gate、
Worker 最小态与 patch、双 revision 丢旧结果、checking/stale/failed、同步保存门、script command draft、性能预算与
differential 测试。把本人证据锚点、可证伪观察、必落钉直接写入 Kimi / GLM 对应签字行，并签 agree 或 counter。
不要做：不得改实现文件；不得重开或改写已 done 的 ED-FIELD-COMMIT-1；不得仅加页面 debounce/cache 特判；
不得把任务标 build/done，除非三方有效 premise/design 签字齐且无 counter。
输出要求：任务卡实际 diff、Kimi/GLM 各自 premise verified + design agree（或精确 counter）、独立反证、
build 准入结论，以及下一位 Agent 提示词。
```
- 2026-08-25 GLM（覆盖/census/differential/性能矩阵）: 审查完成，签 **premise verified +
  design agree（附 GPerf1-GPerf3）**。一手直读坐实四处同步全扫（根 render 无 memo 的
  statusIssueCollector / render 内 mergeProjection / 701 entries 逐个引用扫描 / ProjectWorkbench
  独立 collector）+ 三处逐字符漏面（Poison name / SharedScript description / 指令弹窗整树
  commit + SnapshotCommand 四重 clone）+ save 不在热路径 + PAL 22.9MB 规模本人复测。GPerf1
  钉 census 与 adoption JSON 同源；GPerf2 钉 differential 五类 fixture + 随机 mutation ≥20 轮；
  GPerf3 钉计数断言精确到函数名。未改实现，未代签 Kimi，未标 build/done。

### 给 Kimi（store/Worker/revision/fail-closed/save boundary 主审，可直接复制）

```text
接手任务: ED-INPUT-PERF-1 编辑器输入提交与全局派生状态性能收口——build 前设计审查（Kimi 席）
任务卡: docs/ops/tasks/ED-INPUT-PERF-1-editor-input-and-derived-state-latency.md
当前状态: draft / build blocked；Codex + GLM（GPerf1-GPerf3）已签，仅差你的签字；不得改实现。
你的角色: Kimi——store 架构 / Worker 边界 / 双 revision 丢旧 / fail-closed / 同步保存门主审。
先读: AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本任务卡、ED-FIELD-COMMIT-1；再直读
  App.tsx:311,1029-1030,1340-1372,1596-1660、edit-session.ts:178-190,492-523、
  script-editor.ts SnapshotCommand(:852-880,923-978)、project-diagnostics.ts:273-376,531-639、
  script-editor-projection.ts:138-181、ProjectWorkbenchTab.tsx:1345-1348。
GLM 已独立坐实（勿重复，聚焦你的域）: 根 render 四处同步全扫 + 三处逐字符漏面 + save 不在
  热路径 + PAL 22.9MB 规模；GPerf1 census 同源 / GPerf2 differential fixture / GPerf3 计数口径。
请你独立审:
1. Derived snapshot store 的 revision 语义（mainRevision+scriptRevision 联合 key 是否足够；
   markSaved / undo / redo 是否也推进 revision）；订阅分层是否真能阻止页面私自 collect。
2. Worker 最小诊断态的初始化与 record patch 协议——7.3MB 全态一次性 postMessage 的风险；
   patch 依赖 tuple 与 GLM GPerf2 的随机 mutation 对照是否闭合。
3. checking/stale/failed 联合状态与 UI 语义——"检查中保留上一份已知结果"是否会被误读为最新；
   fail-closed 不显示 0 项的测试形态。
4. 显式保存门的同步权威校验边界——save 不读 Worker snapshot 的实现隔离方式。
5. ScriptEditSession SnapshotCommand 的三重 clone：command draft 事务化后单次 commit 仍超 50ms
   的 affected-owner copy 切片是否安全（你的风险登记已有，请给判定条件）。
输出: premise verified/counter + design agree/counter、一手 file:line、必落钉；写回签字行与交接日志。
不要做: 不得改实现；不得重开 ED-FIELD-COMMIT-1；签字齐前三方不得标 build。
```
- 2026-08-25 GLM（覆盖/differential/性能矩阵）: done 终审完成并签 **accept**。GPerf1-GPerf3 逐钉验证：
  25 页/30 事务 census（三漏面收编 + aggregate-draft 新类别）；固定 seed 20 轮真随机 5-lane differential
  + 五类 invalid fixture 正反双循环；五类 stale-save 不授权 + 独立 ScriptId oracle；六 spy 计数恰 0 +
  31-entry index 专项 + App/PWT 四处同步全扫零直调；evidence 原始样本 20×3 数组逐项对表、commit max
  ≤18.2ms / Long Task 0 / worker p95 ≤432ms。focused 22+4+typecheck 复跑全绿。未改实现，未代签
  Kimi，未标 done。
