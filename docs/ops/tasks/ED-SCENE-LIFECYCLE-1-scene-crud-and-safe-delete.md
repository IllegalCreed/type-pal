# ED-SCENE-LIFECYCLE-1 - 场景生命周期闭环

Status: draft
Phase: phase2
Capability: E1 / Editor scene lifecycle
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main

## 目标

让作者在场景工作区内完成场景的新建、复制、可读命名、安全删除、撤销/重做、保存重开和正式引擎试玩；
删除前由 ED-3 的统一 `ProjectReferenceIndex` 展示入口、脚本及跨场景引用，不再新增场景私有扫描器。

## 范围

- 范围内:
  - 场景目录的新建、复制、作者可读名称编辑与稳定身份展示。
  - 安全删除及引用面板；入口、`loadScene`、`currentScene`、`selectSceneHooks`、实体地址等全部消费
    ED-3 统一边和 deletion scope。
  - main/script 双 session 原子更新、undo/redo、文件删除计划、保存重开。
  - 从选中场景/落点进入正式 Reforge 试玩；磁盘项目明确提示未保存改动不进入试玩。
- 范围外:
  - 不重做地图编辑、场景实体 Inspector、脚本编辑器或 ED-3 引用合同。
  - 不把显示名或数组位置当作稳定引用身份。
- 明确不做:
  - 不自动级联删除被引用场景，不静默改写入口或跨场景脚本。
  - 不保留旧 schema/upgrader/fallback；若必须切换 canonical 版本，按开发期版本纪律原子完成并清理旧版本。

## 前提真值门

### 一句话行为 / 工程前提

当前只有可撤销的新建场景，复制、可读命名、安全删除、跨双 session/磁盘闭环与场景试玩尚未形成同一生命周期；
ED-3 已提供场景入边和结构化定位地基，但不替代本卡的 CRUD 与文件事务。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：原版没有二阶段作者场景 CRUD。正式试玩行为只复用 Reforge 当前入口加载链。 | `packages/reforge/src/project-loader.ts`; `packages/editor/src/core/load-play-project.ts` |
| 第一阶段 | N/A：第一阶段没有 Reforge 编辑器的场景生命周期。 | `docs/phase2/READ-FIRST.md` |
| 当前二阶段 | `AddSceneCommand` 只追加空场景并可 invert；场景目录仍用 prompt 创建和裸 `scene.id` 展示，没有复制/删除/名称命令。 | `packages/editor/src/core/commands.ts:3385`; `packages/editor/src/ui/App.tsx:2429-2460` |
| 本任务目标 | 在 ED-3 current-author index 上补齐七环，不另造 collector；显示名与稳定身份方案须先核是否触发 content canonical 版本切换。 | `docs/ops/tasks/ED-3-project-reference-index.md`；本卡范围 |

### 反证与替代解释

- 最强替代解释: 场景 id 已足够辨识，所谓“重命名”应改稳定 id，而不是新增显示名。
- 什么观察会推翻当前前提: 若所有当前引用、URL、地图/脚本 locator 与工程文件名都可在单事务内可靠重写，
  可以评估真正改 id；否则稳定 id 必须保持不变，只新增作者显示名。该选择未核实前不得 build。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: ED-3 已固定场景入边，仍需本卡复核试玩入口。
  - 原版 / 第一阶段理解: 不适用作者 CRUD。
  - extractor / 地图 / 数据解码: 不据 PAL 数量推导 schema。
  - audit / test model: 必须用 main/script 双 session 与磁盘保存重开反例，不以单一内存数组测试代替。

### 用户可见偏离

- 是否主动偏离已核真值: yes（补齐二阶段编辑器工作流，不改变原版游戏机制）
- `before -> after` 一句话: 只能新建且靠裸 id 管理 -> 可复制、辨识、安全删除、撤销、保存重开并试玩。
- 代表场景: 复制一个带实体、命名落点、hook/behavior 的场景；解除外部引用后删除副本；undo 恢复并保存重开。
- 用户裁决: 2026-09-04 用户已将场景生命周期列为第二阶段必须项；显示名/稳定 id 具体方案 pending。

## 上下文锚点

- 已拍板决策 / 铁律: `AGENTS.md`; `docs/phase2/READ-FIRST.md`; current-only、破坏性动作同步验真。
- 代码锚点(`file:line`):
  - `packages/editor/src/core/commands.ts:3385`
  - `packages/editor/src/ui/App.tsx:2429-2460`
  - `packages/editor/src/core/project-reference-adapters.ts`
  - `packages/editor/src/core/workspace-persistence.ts`
  - `packages/editor/src/core/load-play-project.ts`
- 已知坑 / 审计文档: `docs/phase2/editor/editor-authoring-closure-audit-2026-07-13.md`; ED-3 的
  current-author/shell 分裂、stale fail-closed 与 deletion scope 约束。
- 不得重新引入: `where` 字符串解析、页面私有引用扫描、数组下标身份、自动 cascade、旧版本兼容分支。
- 相关测试: `commands.test.ts`, `App.reference-navigation.test.tsx`, `workspace-persistence.test.ts`,
  `project-reference*.test.ts`。

## 验收条件

- 功能:
  - 新建/复制/命名/删除均通过 Command；跨 main/script 与文件删除为一个可恢复事务。
  - 复制保留业务内容并生成新的稳定 scene id；scene 内局部 id 是保留还是重写，须由前提门按作用域与内部
    引用真值决定并保持闭包，不能机械生成或复制外部引用。
  - 删除前展示 ED-3 的完整外部引用；任一 current/checking/stale/failed/缺 index 状态均不得授权删除。
  - 删除、undo、redo 后目录、URL、当前选择与脚本 session 一致；默认入口不得悬空。
  - 保存重开后新增、复制、名称、删除文件结果一致；正式试玩从选中入口加载磁盘真值。
- 测试:
  - 命令与 UI 覆盖 create/copy/name/delete/cancel、self scope、跨场景引用、entry point、canonical script、
    provider failure、TOCTOU、undo/redo 与保存重开。
  - editor typecheck、相关聚焦、最终 editor 全量、production build、design-system gate。
- 文档: 更新 editor design、roadmap、capability-map 与本卡证据；不提前把 E1 标为完整，直到七环闭合。
- 视觉 / 手工验证: 空工程、普通场景、被引用场景三态；1280/720；引用点击与确认焦点回归。
- E2E 用例登记: 新建工程 → 新建/复制场景 → 添加最小落点/实体/脚本 → 保存 → 重开 → 试玩 → 删除副本。

## 推进签字

### 进入 build 前:设计签字

- Codex: premise pending | design pending
- Kimi: premise pending | design pending
- GLM: premise pending | design pending
- 独立反证审查: pending
- counter / 分歧处理: pending
- 缺签豁免: N/A
- build 准入结论: blocked

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: pending
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

pending。先核“显示名字段还是稳定 id 重写”、复制时的内部稳定身份策略、main/script 双 session 和文件事务边界；
引用查询、定位与删除策略必须直接消费 ED-3，不扩第二套图。

### 已知风险

- 风险: 名称方案可能触发 content canonical 版本切换；复制/删除横跨两 session 与多个场景文件。
- 缓解: 前提真值门先做 schema/引用/文件名 census；破坏动作使用同步 current oracle 和可恢复写事务。

### 主审立场

- Reviewer: Kimi（架构/事务）+ GLM（覆盖/测试）
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

## 视觉验证记录

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: pending
- 集中 E2E 用例 / 批次: 编辑器综合工作流前置子链
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: 商店生命周期；R4 薄 E2E。

## 交接日志

- 2026-09-05 Codex: ED-3 收口时建立后续正式卡，只固定范围、地基和验收边界；未做前提/设计签字，
  不授权 build。ED-3 已于同日完成三方/用户验收。Next: 等用户确认开始后启动本卡前提真值门。

## 下一位 Agent 提示词

无下一位 Agent 提示词；ED-3 已完成，本卡尚未启动，等待用户确认开始。
