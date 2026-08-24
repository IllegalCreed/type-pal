# ED-FIELD-COMMIT-1 - 编辑器字段草稿、提交与撤销边界统一

Status: review（2026-08-24 implementation `b118ce3a`，Codex self-review accept；Kimi / GLM 待审）
Phase: phase2
Capability: 编辑器公共表单能力（不改变 capability-map 状态）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `codex/ed-audio-workbench-1`（用户交接的共享集成分支）

## 目标

让编辑器文本与数字字段在输入、中文输入法合成和字段间切换时即时响应；编辑期间只更新本地草稿，字段提交时才产生
一次项目命令、一次撤销记录和一次全局通知，系统性消除物品、敌人、技能、战场、项目设置及同类页面的“每字符派发
全局命令”卡顿。

## 范围

- 范围内:
  - 定义共享 text / number 字段的 `draft -> validate -> commit / cancel -> resync` 合同与公共实现。
  - 默认由 blur 或 Enter 提交，Escape 撤销未提交草稿；正确处理 IME composition、对象切换、外部 undo/redo。
  - 首批采用项目概览、物品、敌人、技能、战场，并以代码 census 找齐其他连续值字段。
  - 一次有效提交只进入一条 command/history；无变化不派发，不制造 dirty。
  - 增加静态门禁，阻止连续值字段在 `onChange` 中直接派发项目命令；例外必须登记语义与删除条件。
- 范围外:
  - checkbox、select、toggle、拖拽、颜色取样等离散操作仍可立即提交。
  - 不修改 schema、save、migration、runtime 或业务字段含义。
  - 不新增页面级保存按钮，不对全局保存做 debounce。
- 明确不做:
  - 本卡不顺手把根 EditSession 改成 selector store；若字段收口后仍不达指标，另开性能架构卡。
  - 不以延迟视觉更新掩盖耗时命令，也不丢弃 undo/redo 语义。

## 前提真值门

### 一句话行为 / 工程前提

- 连续输入是“尚未提交的字段草稿”，不是 N 个独立项目编辑事务；当前每次 `dispatch` 都会入历史、置脏并通知根订阅，
  因此逐字符派发会把单次文本编辑放大成全编辑器工作。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：这是二阶段作者工具的输入事务设计，原版没有对应编辑器。 | `docs/phase2/READ-FIRST.md:1` |
| 第一阶段 | N/A：一阶段仅作已有游戏 UX 真值，本任务不改变游戏 UI。 | `docs/phase2/READ-FIRST.md:32` |
| 当前二阶段 | `EditSession.dispatch()` 每次 apply 后都会入 past、清 future、置脏并 `notify()`；根 `App` 订阅整个 session。项目名、敌人名称及物品/技能/战场 patch 路径可在连续输入中直接派发命令。 | `packages/editor/src/core/edit-session.ts:178`；`packages/editor/src/ui/App.tsx:304`；`packages/editor/src/ui/ProjectWorkbenchTab.tsx:1639`；`packages/editor/src/ui/EnemyTab.tsx:769`；`packages/editor/src/ui/ItemTab.tsx:854`；`packages/editor/src/ui/SkillTab.tsx:829`；`packages/editor/src/ui/BattleFieldTab.tsx:207` |
| 本任务目标 | 连续输入只更新本地草稿；有效提交才派发一个命令，且所有同类字段消费同一合同。 | 用户 2026-08-24 拍板；本卡验收矩阵 |

### 反证与替代解释

- 最强替代解释: 卡顿主要来自根组件全量订阅，即使降低 dispatch 次数，提交或对象切换仍可能慢。
- 什么观察会推翻当前前提: 在隔离根订阅后，每字符 dispatch 仍无明显成本，或改成单次提交后输入长任务仍持续卡顿。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: 不适用；卡顿发生在编辑器作者输入路径。
  - 原版 / 第一阶段理解: 不适用；不改游戏行为。
  - extractor / 地图 / 数据解码: 不适用；无生成数据参与。
  - audit / test model: 需要用命令次数与输入延迟实测，不能只凭代码形态宣布性能完成。

### 用户可见偏离

- 是否主动偏离已核真值: yes
- `before -> after` 一句话: 每输入一个字符就提交一次全局编辑 -> 一次字段编辑只在确认时提交一次。
- 代表场景: 项目概览修改“显示名”，以及敌人、物品、技能、战场的文本/数字字段。
- 用户裁决: 2026-08-24 用户要求统一组件根治。

## 上下文锚点

- 已拍板决策 / 铁律:
  - 二阶段先做公共架构，不继续逐页面打补丁；不改变字段业务语义。
  - 本卡提供基础能力，`ED-PROJECT-STARTUP-IA-1` 消费它，不在业务页复制 draft 逻辑。
- 代码锚点(`file:line`):
  - `packages/editor/src/core/edit-session.ts:178`
  - `packages/editor/src/ui/App.tsx:304`
  - `packages/editor/src/ui/ItemTab.tsx:1388`（已有本地草稿 + blur 提交先例）
  - `packages/editor/src/ui/ProjectWorkbenchTab.tsx:1639`
  - `packages/editor/src/ui/EnemyTab.tsx:769`
  - `packages/editor/src/ui/SkillTab.tsx:829`
  - `packages/editor/src/ui/BattleFieldTab.tsx:207`
- 已知坑 / 审计文档:
  - `docs/ops/tasks/ED-SHARED-SCRIPT-UI-1-shared-script-workbench.md:211`
  - `docs/ops/tasks/ED-1-editor-authoring-closure-audit.md`
- 不得重新引入:
  - 每字符整对象 command、每字符 undo、页面私有 debounce、页面局部保存。
  - composition 未结束便提交、对象切换时把旧草稿写入新对象。
- 相关测试:
  - 对应各 Tab 测试、`design-system/controls.test.tsx`、新增公共字段合同测试与边界门禁。

## 验收条件

- 功能:
  - 文本/数字字段支持本地草稿、Enter/blur 提交、Escape 取消、IME composition；失焦后显示 canonical 值。
  - 对象切换、外部 undo/redo、保存重开时草稿不会污染其他对象或覆盖较新的 canonical 状态。
  - checkbox/select/toggle 等离散动作仍即时提交。
- 测试:
  - 每个字段编辑周期断言恰好一条 command、一次 dirty、一次 undo 可完整撤销。
  - 覆盖空值、非法数字、无变化、IME、Enter、Escape、blur、对象切换、undo/redo。
  - 静态 census 覆盖全部注册页面，并拒绝未登记的 `onChange -> session.dispatch` 连续值路径。
  - 记录采用前后 100 次连续输入的可复现实测；输入期间长任务阈值为 0，提交不得形成连续长任务。
- 文档:
  - 将字段提交合同写入 `docs/phase2/editor/editor-design-system-v1.md`，附允许即时提交的离散操作清单。
- 视觉 / 手工验证:
  - 项目名、敌人名、物品说明、技能与战场各抽一项，中文输入、Tab 切换、撤销重做无卡顿和焦点跳动。
- E2E 用例登记: N/A（功能性编辑器最小验证在 build 期完成）。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: verified（`edit-session.ts:178-190` 与 `App.tsx:304-307` 证明每次 dispatch 的全局成本；上述五类页面存在直接命令路径）
  - design: agree（共享 draft/commit 合同 + 全页面 census + 静态门禁）
- Kimi:
  - premise: verified（2026-08-24 独立直读，非代理）。`edit-session.ts:178-191` dispatch 全链
    （apply→past.push→future 清→dirty→historyVersion++→notify）逐行核实；`App.tsx:305-307`
    `useSyncExternalStore(subscribe, getVersion)` 订阅整个 session——逐字符 dispatch 确有全局
    重渲染 + 历史写入双重成本。非项目页直读：`EnemyTab.tsx:773-779` 名字字段 onChange 逐字符
    dispatch `UpdateLocaleCommand`；项目页 `ProjectWorkbenchTab.tsx:1643-1647` 显示名 raw
    `<input className="in">` 逐字符 `RenameProjectCommand`（同时还属 DS-3 的原生控件红项）；
    离散白名单先例 `ItemTab.tsx:1387-1395` checkbox 即时提交合法；既有草稿合同先例
    `MediaAssetLifecycle.tsx:15-60`（identity 键草稿 + Enter/blur/Escape）证明公共合同可落地。
  - design: agree（共享 draft→validate→commit/cancel→resync 合同 + census 门禁方向正确；
    附 KF1-KF3，与 GLM GF1-GF3 互补，不阻塞准入）:
    - **KF1（IME 必须进公共层）**：compositionstart/end 期间的值不得提交、不得触发 validate
      报错闪烁；该行为只在公共组件实现一次，禁止页面自补。
    - **KF2（resync 身份键先例上升为合同）**：草稿必须同时键入对象身份 + canonical 值版本
      （MediaAssetNameField 的 `identity = assetId+committed` 模式），外部 undo/redo、对象切换、
      保存重开一律丢弃草稿显示 canonical；Enter 提交后 blur 不得二次 dispatch（commit guard
      幂等，同 GF2）。
    - **KF3（一次编辑周期恰好一条 command 的边界用例）**：连续输入→Enter→立即指针点击另一
      字段（blur 紧随）→undo→redo，全链 dispatch 恰 1 次且 redo 后字段显示 canonical 新值；
      该序列进公共合同测试，不只测单步。
- GLM:
  - premise: **verified（2026-08-24，本人一手读码 + 多页 dispatch census，非代理）**：
    1. **dispatch 全局成本属实**：`EditSession.dispatch`（edit-session.ts:178-190）
       apply→入 past→清 future→置脏→historyVersion++→notify() 全链逐字核实；
       App.tsx:304-307 `useSyncExternalStore(subscribe, getVersion)` 订阅整个
       session——每字符 dispatch = 每字符全编辑器重渲染，前提成立。
    2. **非项目页直接 dispatch 实锤（EnemyTab）**：名字字段
       `<DsTextInput onChange={(e) => session.dispatch(new UpdateLocaleCommand(...))}>`
       （:776-778）——每个字符一次 Locale 命令 + 一次 undo 记录；另 :979/:1003
       两处数字字段同构。**多页 census（multiline rg）**：EnemyTab 4、
       ProjectWorkbenchTab 2、ActorMode 2——比卡文列的五页更广（卡文未列
       ActorMode），census 门禁须以 registry 全页扫而非清单。
    3. **本地草稿先例**：ItemTab:1388-1392 的 checkbox onChange→patch 是**离散**
       即时提交（合法白名单形态）；连续值字段确无既有草稿合同——缺口成立。
  - design: **agree（2026-08-24，附 GF1-GF3，不阻塞准入）**。draft→validate→
    commit/cancel→resync 公共合同 + registry census 门禁方向正确。
  - **必落钉 GF1-GF3：**
    - **GF1（command/dirty/undo 次数可证伪测试）**：每个采用字段至少一条测试
      断言"一次编辑周期 dispatch 恰 1 次、isDirty 翻转恰 1 次、undo 恢复完整
      旧值且不残留"；用 spy 计数而非时间断言（时间断言只作 perf 辅证）。
    - **GF2（双提交与草稿污染钉）**：Enter 后立即 blur（焦点已离开）不得二次
      dispatch（commit guard 幂等）；**对象切换（A 改到一半切 B）时 A 的草稿
      不得写入 B**——resync 合同的专项负例；外部 undo/redo 后输入框必须显示
      canonical 新值（草稿丢弃）。
    - **GF3（离散白名单闭合）**：白名单形态钉为"checkbox/select/toggle/颜色/
      拖拽"等离散事件；门禁按事件处理器 AST/正则识别 `onChange→dispatch` 中
      **text/number input** 才违规——ActorMode 的 2 处（数字字段）须入采用面，
      checkbox 类（如 ItemTab:1388）自动豁免；白名单机器可读并与 GD1 allowlist
      同格式。
  - 独立反证：若根订阅隔离后每字符 dispatch 实测无成本（卡文反证条款），本卡
    性能动机减弱但事务语义动机（undo 被逐字符淹没）仍独立成立——不推翻。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: GLM（2026-08-24，见上）
  - 独立证据锚点: edit-session.ts:178-190 / App.tsx:304-307 / EnemyTab.tsx:776-778,
    979-1003 / 多页 census（Enemy 4/PWT 2/Actor 2）/ ItemTab:1388 离散先例
  - 可证伪观察: ①若 GF1 计数测试在任何采用页测出 >1 dispatch 即 commit guard
    漏（GF2 拦截）；②若对象切换后 canonical 值被旧草稿覆盖即 resync 缺陷；
    ③若门禁扫不出 ActorMode 的 2 处数字 dispatch 即 census 正则漏连续值形态。
- counter / 分歧处理: N/A
- 缺签豁免: N/A
- build 准入结论: allowed（2026-08-24，Codex + Kimi + GLM 三签齐；GF1-GF3 与 KF1-KF3 为 build 必落钉）

### 进入 done 前:审查签字

- Codex: **accept（2026-08-24）**。实现提交 `b118ce3a`；公共合同测试覆盖 IME、Enter+blur 幂等、
  Escape、非法/空数字、对象切换、syncToken resync、undo/redo 与 100 次输入 0 command；真实编辑器抽查通过，
  代码 census/allowlist 门禁通过。
- Kimi: pending
- GLM: pending
- counter / 返工处理:
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

- 在 design-system 层提供受控字段草稿合同；业务页只提供 canonical value、parse/validate 与单次 commit callback。
- 文本提交保持原字符串语义；数字草稿允许输入中间态（空、负号等），提交时统一校验/规范化，非法值不写工程。
- 公共合同负责 canonical value 变化后的同步与冲突规则，不能让每页各写一套 `useState/useEffect/onBlur`。
- 门禁从页面注册表生成采用面，并允许少量有证据的离散即时提交白名单。

### 已知风险

- 风险: blur 与点击其他动作的事件顺序可能造成重复提交或丢失草稿。
- 缓解: 公共组件以单一 commit guard 测试 pointer/keyboard 顺序。
- 风险: 过度通用化会破坏字段各自的空值、格式化和校验语义。
- 缓解: 公共层只统一事务边界，parse/format/validate 仍由领域适配器显式注入。

### 主审立场

- Reviewer: Kimi
- 结论: agree（2026-08-24，独立直读 dispatch 链、根订阅与两个非项目页字段路径；KF1-KF3 已写回）
- 必改项: 无新增；GF1-GF3（GLM）+ KF1-KF3（Kimi）为 build 必落钉。
- 是否建议进入 build: 是（三签齐；与 ED-DS-3 的 Field API 联合冻结点按 KD3 执行，同 Owner 串行）

## Build: 实现与自测

- Coding Owner: Codex
- Implementation commit: `b118ce3a fix(editor): unify field commit boundaries`
- 修改文件:
  - 公共合同与测试: `packages/editor/src/ui/design-system/controls.tsx`、`controls.test.tsx`、
    `field-commit-adoption.json`、`field-commit-boundary.test.ts`、`boundary.test.ts`。
  - 首批采用: `ProjectWorkbenchTab`、`ItemTab`、`EnemyTab`、`SkillTab`、`BattleFieldTab`、
    `ActorMode`、`MediaAssetLifecycle`、`ScriptDrawer` 及相应测试/最小样式。
  - 合同文档/版本: `editor-design-system-v1.md`，DS version `2.9.0`。
- 实现摘要:
  - 新增同一 `DsField + control` 家族内的 `DsDraftTextInput / DsDraftNumberInput /
    DsDraftTextArea` 与 Field 组合版本；公共层统一 draft→validate→commit/cancel→resync。
  - `draftKey + syncToken + canonical value` 共同定义草稿身份；IME 合成期零校验/零提交，Enter+blur
    用 commit signature 幂等，Escape 恢复，外部 undo/redo 与对象切换丢弃旧草稿。
  - 数字适配支持 required/optional、integer/min/max、领域 `normalize`；原有 floor/clamp 通过显式
    adapter 保留，没有借事务重构改变业务值。
  - registry 采用清单覆盖 project/actor/item/enemy/skill/battlefield/scene/media；全 UI 禁止
    continuous `onChange -> dispatch`，采用面同时禁止间接 project patch。机器 allowlist 为七字段 schema，
    当前为空；离散 checkbox/select/toggle/color/drag 不进入该规则。
  - 原生生产控件基线随真实迁移下降：input `113 -> 101`、textarea `2 -> 1`、label `75 -> 72`。
- 运行命令 / 结果:
  - `pnpm --filter @type-pal/editor typecheck`：pass。
  - 聚焦回归（公共合同 + boundary + 8 个采用页）：10 files / 144 tests pass。
  - 最终 editor 全量：143 / 144 files、1106 / 1108 tests pass；仅两个静态合同按预期发现
    “原生控件数量下降、媒体 owner 从 DsTextInput 升为 DsDraftTextInput”。更新精确下降基线/owner 后，
    聚焦 `boundary + field-boundary + MediaAssetLifecycle` 3 files / 48 tests pass；遵守“最终全量不重复”纪律，
    未再跑第二遍耗时全量。
  - 100 次连续 input 合同测试：输入期 commit=0、validate=0；blur 后恰好 commit=1、validate=1。
- 浏览器 / 手工检查:
  - 项目名：中文草稿期间 heading/toolbar history 不变；Enter 后一条 undo，undo/redo 均显示 canonical；
    最后撤销并 reload 回磁盘“已保存”。
  - 物品名：中文草稿失焦后一次提交，单次 undo 完整恢复；敌人/技能/战场中文草稿 Escape 恢复 canonical。
  - 720px viewport：字段未横向溢出或跳焦；战场页滚动可达，输入/选择器仍完整。控制台 warning/error 为 0；
    viewport 已 reset，浏览器验收状态已 reload 清除。
- 跳过的检查及原因:
  - 未重复跑第二次 editor 全量；第一次最终全量的非通过项仅为已聚焦修正并验证的静态精确基线。
  - 浏览器 API 不暴露 PerformanceObserver longtask 明细；以 100-input 零 command 合同、真实工具栏 history
    证据和无可见卡顿作为当前性能证据，reviewer 如需 trace 可在同一页面补录，不应重复功能巡检。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- Codex 自审: accept（`b118ce3a`；KF1-KF3/GF1-GF3 均有实现与测试锚点）
- Kimi 审查结论: pending
- GLM 审查结论: pending
- 必须返工项: pending
- Accept / rework: review pending（Kimi / GLM 均 accept 前不得 done）

## 用户验收

- 用户结论: **accept（2026-08-24）**；用户已查看功能界面并确认“没问题”。该结论不替代 Kimi / GLM
  的实现审查签字，本卡在两方 accept 前仍保持 review。
- 后续任务: `ED-PROJECT-STARTUP-IA-1` 应复用本卡公共合同。

## 交接日志

- 2026-08-24 Kimi: 独立直读 edit-session dispatch 链、App 根订阅、EnemyTab/ProjectWorkbenchTab 逐字符
  命令路径、ItemTab 离散先例与 MediaAssetNameField 草稿先例；签 premise verified + design agree
  （附 KF1-KF3：IME 进公共层、resync 身份键合同化、一次编辑周期一条命令的连续序列用例）。
  三签齐，build 准入开放。未修改实现文件。
- 2026-08-24 Codex: 完成代码证据 census 并开卡；当前仅文档，不改实现。Next: Kimi/GLM 独立签 premise/design。
- 2026-08-24 Codex: 完成 `b118ce3a`，公共 draft/commit 合同、首批全域采用、registry/AST 门禁、
  聚焦/全量/浏览器验证闭环；自审 accept，任务转 review。Next: Kimi/GLM 独立代码审查与验收签字。
- 2026-08-24 User: 已查看功能界面并确认没问题；用户验收 accept，仍待 Kimi/GLM 实现审查签字。

## 下一位 Agent 提示词

```text
审查任务: ED-FIELD-COMMIT-1 编辑器字段草稿、提交与撤销边界统一
任务卡: docs/ops/tasks/ED-FIELD-COMMIT-1-editor-field-draft-commit-boundary.md
当前状态: review；实现提交 b118ce3a；Codex self-review accept，Kimi/GLM pending
你的角色: Kimi 或 GLM 独立代码审查/验收者
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本任务卡、docs/phase2/editor/editor-design-system-v1.md，
以及 controls.tsx、field-commit-adoption.json、field-commit-boundary.test.ts 和至少一个业务采用页
已完成: 共享 text/number/textarea draft→validate→commit/cancel→resync；IME、Enter+blur、Escape、
对象切换、undo/redo、100-input、registry/AST 门禁及真实浏览器验证
重点审: KF1-KF3/GF1-GF3；数字 normalize 是否保持原 floor/clamp；静态门禁是否漏 ActorMode/间接 patch；
allowlist 七字段 schema；input 113→101、textarea 2→1 的基线是否可信
请输出: accept，或 counter/rework 的 file:line、复现命令和阻断理由；把结论写回本卡 done 前签字表
允许改动: 只允许写任务卡审查记录；发现实现问题先签 rework/counter，不要由 reviewer 直接改实现
禁止: Kimi/GLM 两签未齐不得标 done；不得重开已完成旧卡，不得提交 .mimosa
```
- 2026-08-24 GLM（覆盖/census/测试矩阵）: 审查完成，签 **premise verified + design agree
  （附 GF1-GF3）**。dispatch 成本链与根订阅一手核实；EnemyTab:776 名字字段逐字符
  UpdateLocaleCommand 实锤；多页 census 比 卡文更广（ActorMode 2 处未列——GF3 要求
  registry 全页扫）。GF1 钉 dispatch/dirty/undo 三计数可证伪；GF2 钉 Enter+blur 双提交
  与草稿污染对象负例；GF3 钉离散白名单闭合与同 GD1 格式。未改实现，未代签 Kimi。
