# OPS-0001 - 建立多 Agent 协作工作流

Status: user-acceptance
Phase: ops
Capability: agent workflow
Current Owner: User
Next Actor: Codex
Coding Owner: Codex
Branch: main

## 目标

建立一组仓库内持久文件,让 Codex、Claude Opus、GLM 和用户可以围绕角色分工、任务看板、任务卡、设计共识、单 Owner 编码、审核共识和用户验收协同后续开发。

## 范围

- 范围内:
  - 在 `AGENTS.md` 增加根级多 Agent 协作协议。
  - 在 `docs/ops/` 增加工作流文档。
  - 在 `docs/ops/` 增加共享任务看板。
  - 增加任务卡模板和本启动任务卡。
  - 本批新增协作文档以中文为主。
- 范围外:
  - 不实现下一个产品功能。
  - 不把历史计划全部迁移成任务卡。
  - 不做自动化看板更新。

## 参考资料

- `AGENTS.md`
- `docs/ops/agent-workflow.md`
- `docs/ops/board.md`
- `docs/ops/tasks/TASK-template.md`

## 验收条件

- `AGENTS.md` 说明多 Agent 规则,并指向持久 ops 文档。
- 工作流要求非平凡任务必须经过 Design Consensus Gate 和 Review Consensus Gate。
- 工作流明确只有一个 Coding Owner 能修改实现文件。
- 看板包含 Current Owner、Next Actor、Coding Owner、阻塞项和任务卡链接。
- 模板包含设计共识、实现日志、自验证、审核共识、用户验收和交接日志。
- 新增 ops 文档以中文为主,便于用户直接阅读。

## Design Consensus Gate

### Claude Opus

结论: 未收集。本任务是用户要求立即落地的流程启动例外。

风险: 第一版工作流可能需要 Claude 独立审查后继续收紧。

建议: 下一次大型任务前,先让 Claude 复核本文件组。

Allow implementation: yes, bootstrap exception.

### GLM

结论: 未收集。本任务是用户要求立即落地的流程启动例外。

覆盖范围 / 测试矩阵: 第一个产品任务前,复核模板字段、看板列和交接日志格式。

遗漏项: 自动化和历史任务迁移明确不在本任务范围内。

Allow implementation: yes, bootstrap exception.

### Codex

结论: 先建立最小可用的持久工作流,下一个非平凡任务开始严格执行。

实现边界: 只改文档。

验证计划: 检查新文件和 git 状态。无需代码测试。

Allow implementation: yes.

### 共识结论

- 已达成一致:
  - 设计和审核采用三方共识关卡。
  - 实现阶段采用单一 Coding Owner。
  - 看板必须记录 Current Owner 和 Next Actor。
  - 任务卡作为持久交接日志。
  - 后续新增协作文档优先中文。
- 保留分歧:
  - 暂无。
- 需要用户拍板:
  - 用户是否接受本启动工作流。
- Allow implementation: yes, bootstrap exception.

## 实现日志

- Coding Owner: Codex
- 修改文件:
  - `AGENTS.md`
  - `docs/ops/agent-workflow.md`
  - `docs/ops/board.md`
  - `docs/ops/tasks/README.md`
  - `docs/ops/tasks/TASK-template.md`
  - `docs/ops/tasks/OPS-0001-agent-workflow-bootstrap.md`
  - `docs/README.md`
- 说明:
  - 本任务是在创建流程本身,所以无法完整遵守它正在创建的流程。下一个非平凡任务必须正常走共识关卡。

## 自验证

- 运行命令:
  - `rg --files AGENTS.md docs/ops docs/README.md`
  - `sed -n '1,220p' docs/ops/agent-workflow.md`
  - `sed -n '1,180p' docs/ops/board.md`
  - `git status --short --branch`
- 浏览器 / 手工检查:
  - 不适用。
- 跳过的检查及原因:
  - 本任务只改文档,不需要跑 `pnpm check`。

## Review Consensus Gate

### Codex

实现摘要: 增加根协作协议、工作流、看板、任务模板、任务目录 README 和启动任务卡,并将新增 ops 文档中文化。

验证结果: 新文件存在。git 状态显示 `docs/README.md` 已修改,新增 `AGENTS.md` 和 `docs/ops/`。

已知风险: Claude Opus 和 GLM 还没有独立审核这个启动版本。

Accept / rework: accept for user review.

### Claude Opus

架构审核: pending

风险审核: pending

Accept / rework: pending

### GLM

覆盖审核: pending

测试 / 文档审核: pending

Accept / rework: pending

### 共识结论

- 必须返工项:
  - Codex 暂无。
- 需要用户拍板:
  - 接受、要求修改,或先交给 Claude/GLM 复核后再使用。
- Allow user acceptance: yes, bootstrap exception.

## 用户验收

- 用户结论: pending
- 后续任务:
  - 下一个非平凡项目任务正式使用本工作流,大概率是 phase2 的 W7 编辑器任务。

## 交接日志

- 2026-07-09 Codex: 作为流程启动例外创建第一组工作流文件。Evidence: 上述文档。Next: User / user-acceptance。
- 2026-07-09 Codex: 根据用户要求将新增 ops 文档改为中文优先。Evidence: `docs/ops/` 文件。Next: User / user-acceptance。
