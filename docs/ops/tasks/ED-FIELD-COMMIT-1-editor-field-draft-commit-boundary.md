# ED-FIELD-COMMIT-1 - 编辑器字段草稿、提交与撤销边界统一

Status: draft
Phase: phase2
Capability: 编辑器公共表单能力（不改变 capability-map 状态）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `codex/ed-field-commit-1`

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
  - premise: pending
  - design: pending
- GLM:
  - premise: pending
  - design: pending
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: pending
  - 独立证据锚点: pending
  - 可证伪观察: pending
- counter / 分歧处理: N/A
- 缺签豁免: N/A
- build 准入结论: blocked

### 进入 done 前:审查签字

- Codex: pending
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
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: `ED-PROJECT-STARTUP-IA-1` 应复用本卡公共合同。

## 交接日志

- 2026-08-24 Codex: 完成代码证据 census 并开卡；当前仅文档，不改实现。Next: Kimi/GLM 独立签 premise/design。

## 下一位 Agent 提示词

```text
接手任务: ED-FIELD-COMMIT-1 编辑器字段草稿、提交与撤销边界统一
任务卡: docs/ops/tasks/ED-FIELD-COMMIT-1-editor-field-draft-commit-boundary.md
当前状态: draft；Codex 已签 premise/design，build 仍 blocked
你的角色: Kimi 或 GLM 设计审查者
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本任务卡、ED-SHARED-SCRIPT-UI-1 与字段/Session 代码锚点
已完成: 已确认每次 dispatch 的全局通知成本，并列出项目/物品/敌人/技能/战场采用面
请你做: 独立核证至少一个非项目页输入路径，给出可证伪观察，审共享 draft/commit API、IME/undo/census 门禁并在卡内签字
不要做: 不得修改实现文件；三方签字未齐不得标 build 或 done
输出要求: premise verified/counter、design agree/counter、直接证据、必改项
```
