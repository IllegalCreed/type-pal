# OPS-0001 - 建立三贤人系统协作工作流

Status: done
Phase: ops
Capability: agent workflow
Coding Owner: Codex
Generation Owner: Codex
Reviewer: GLM + Opus + Codex
Visual Verification Owner: N/A
Unavailable Agents: none
Branch: main

## 目标

建立一组仓库内持久文件,形成“三贤人系统”:让 Codex、Claude Opus、GLM 和用户围绕角色分工、轻量看板、任务卡、单 Owner 编码、按需审查、额度代班、资源生成和用户验收协同后续开发。

## 范围

- 范围内:
  - `AGENTS.md` 多 Agent 根协议。
  - `docs/ops/agent-workflow.md` 工作流。
  - `docs/ops/board.md` 当前进行中/阻塞看板。
  - 完整任务卡模板和轻量任务卡模板。
  - Codex 唯一 Generation Owner 规则。
  - 订阅额度耗尽时的代班和补审规则。
- 所有非小改任务的上下文锚点要求。
- 范围外:
  - 不实现下一个产品功能。
  - 不迁移历史计划。
  - 不做自动化看板更新。

## 验收条件

- 工作流使用 `draft -> build -> review -> done` 四态。
- 本协作机制正式命名为“三贤人系统”。
- 全流程只保留给不可逆/高风险任务。
- 常规迭代和小改可由 Coding Owner 自测后收口,并在提交说明或最终回复写清验证。
- 看板只保留“进行中”和“阻塞”,并保留 `负责人/下一步` 一列。
- 所有非小改任务必须包含上下文锚点;无锚点不得进入 `build`。
- `AGENTS.md` 不复制 `CLAUDE.md` 的工程经验,只保留多 Agent 协议和指针。
- Codex 是唯一 AI 生图 / 替代资源 Generation Owner。
- Codex 额度耗尽时,编码/验证/git 收口可由 Opus 全量代班;仅 AI 生图暂停等待。
- 视觉验证能力和失败时的补验责任写清。

## Draft: 设计与风险

### 设计结论

最终采用:

```txt
draft -> build -> review -> done
特殊状态: blocked / rework / cancelled
```

全流程只用于不可逆/高风险任务: schema/save/migration/asset pipeline、跨包公共接口、新能力格、capability-map 状态变化、关键公式/存档/资源管线等。

常规迭代走 Coding Owner 自测 + 提交说明写清验证;可事后异步抽审。

### 已知风险

- 风险: 流程过轻可能漏高风险任务。
  - 缓解: 明确三方必审触发条件;拿不准按高一档处理。
- 风险: 非小改任务上下文不足导致重复踩坑。
  - 缓解: 所有非小改任务卡必填上下文锚点;第一阶段锚定 `CLAUDE.md`、engineering-notes、game-mechanics、状态表/审计/测试;第二阶段锚定 `READ-FIRST` 和相关设计/审计文档。
- 风险: 视觉任务验证能力随当前工具可用性变化。
  - 缓解: 任务卡显式记录视觉验证责任人和未完成项。

### 三方共识记录

#### GLM

- 认可文档驱动交接、单 Coding Owner、关键节点审查。
- 提议将 9 态流程精简为 4 态。
- 提议两方默认 + 第三方按需。
- 提议小改跳过全流程。
- 提议看板精简。
- 提议不中途换 Coding Owner。

#### Codex

- agree: 4 态状态机。
- agree: 小改跳过全流程。
- agree: 中途不换 Coding Owner。
- partial agree: 两方默认 + 第三方按需,但必须写明三方必审触发条件。
- partial agree: 看板精简,但保留 `负责人/下一步` 一列;用户已拍板保留。
- self-report: Codex 可用 dev server、Playwright/浏览器工具、截图/像素检查和 `view_image` 做视觉验证;若工具/资产/服务不可用,必须显式标记未完成并交给 Opus 或用户补验。

#### Opus

- agree: 4 态状态机、单 Coding Owner、任务卡持久交接、两方默认/三方按需、额度代班显式记录、Codex 唯一 Generation Owner、生成资源避开原版受保护表达。
- 必改一: 代班规则事实错误。Claude Code CLI 可完整本地执行、测试、浏览器验证、git 收口;Codex 额度耗尽时不应编码全停。改为 Opus 可全量代班编码/验证/收口,GLM 可代写由 Opus 落地;仅 AI 生图暂停等待。
- 必改二: 第二阶段任务卡必须带上下文锚点。READ-FIRST、UX 真值、palette 退役、地图子格模型、命令系统等需要写入锚点;无锚点不得 build。
- 必改三: 非平凡门槛收窄。全流程只给不可逆决策;常规编辑器/UX/渲染迭代自测收口 + 异步抽审。
- 必改四: 看板只留进行中 + 阻塞;AGENTS 去重,只保留多 Agent 协议和指针。
- 必改五: Codex 自报视觉验证能力,影响分工表。
- 建议: 增加 10 行轻量任务卡模板。

#### Codex 对 Opus 审查逐条回应

- 必改一: agree。已改 Codex 额度耗尽代班口径:Opus 可全量代班编码/验证/git 收口;GLM 可代写草案;仅 AI 生图暂停等待。
- 必改二: agree。已先按 Opus 要求加入第二阶段上下文锚点,后按 GLM 阻塞项扩展为所有非小改任务必填,并写明无锚点不得进入 `build`。
- 必改三: agree。已把全流程触发范围收窄到不可逆/高风险任务;常规迭代可自测收口并异步抽审。
- 必改四: agree。已砍看板候选/完成区;AGENTS 已去重为多 Agent 协议 + 指针。
- 必改五: agree with caveat。Codex 能做浏览器截图/读图/像素验证,但受当前会话工具、资产和服务可用性约束;不可用时必须显式标记并指定 Opus 或用户补验。
- 建议: agree。已新增 `TASK-lite-template.md`。

#### Opus 复审(2026-07-09 修订版)

- 结论: **accept**。五项必改全部落实且无偏差;上下文锚点节把四个关键锚点(UX 真值 / 调色板退役 / 地图子格模型 / 命令系统不可变模式)固化为示例,超出要求;视觉验证自报带诚实约束(不可用须标记 + 指定补验人),采信。
- 非阻塞小项(不影响定稿,Codex 下轮顺手): ① lite 模板 `Status` 行标注可选值 `build | review | done`;② lite 卡补 `Capability` 字段;③ AGENTS.md 的锚点/视觉验证两段与 workflow 为摘要级重复,可保留,但改规则须同步两处。
- 对本卡记录的核对: Opus 立场转述准确,无歪曲。

#### 用户拍板

- 看板保留一个轻量责任列:`负责人/下一步`。
- 后续资源生成只能由 Codex 执行,因为只有 Codex 当前具备生图能力。
- 某个或多个订阅账号额度耗尽时,由剩余 Agent 代班,代班过程必须记录。
- 协作机制命名为“三贤人系统”;三方一致后定稿。

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件:
  - `AGENTS.md`
  - `docs/ops/agent-workflow.md`
  - `docs/ops/board.md`
  - `docs/ops/tasks/README.md`
  - `docs/ops/templates/TASK-template.md`
  - `docs/ops/templates/TASK-lite-template.md`
  - `docs/ops/archive/tasks/done/OPS-0001-agent-workflow-bootstrap.md`
  - `docs/README.md`
- 实现摘要:
  - 创建并中文化多 Agent 协作工作流。
  - 按 GLM 提案精简为 4 态。
  - 按用户裁决保留 `负责人/下一步` 一列。
  - 增加 Codex 唯一 Generation Owner 规则。
  - 增加额度耗尽代班和补审规则。
  - 按 Opus 审查收窄全流程触发范围、补上下文锚点、AGENTS 去重、看板砍区、补轻量模板。
- 运行命令:
  - `git diff --check`
- 浏览器 / 手工检查:
  - 不适用。
- 跳过的检查及原因:
  - 本任务只改文档,不需要跑 `pnpm check`。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: 不适用
- 代班 Agent: 不适用
- 代班范围: 不适用
- 风险: 暂无
- 是否需要补审: 需要 GLM 对 Opus 审后版本再确认。
- 用户裁决: 三方一致后由用户最终拍板定稿。

## Review: 审查与返工

- Reviewer: GLM
- 审查结论: **accept**（一个阻塞项补上即定稿 + 两处建议 + 三条非阻塞小项）
- 必须返工项: 1 条（见下）
- Accept / rework: **accept with one mandatory addendum**

### GLM 覆盖确认（2026-07-09）

按用户指定三个重点审查：任务分级三档边界、上下文锚点必填项、代班表遗漏场景。

**重点 1：任务分级三档边界**——基本清晰。一处歧义：「不改变用户可感知行为」（小改）vs「普通 bug 修」（常规迭代）。bug 修改变可感知行为（从错到对），按定义走常规迭代是对的，但措辞易误读成 bug 修走小改直通。建议补注解：「不改变用户可感知行为」指无行为变化（纯重构/文档/注释）；行为修正类 bug 走常规迭代。**非阻塞。**

**重点 2：上下文锚点必填项**——**已补**。GLM 指出锚点要求只写了"第二阶段任务"，第一阶段任务（packages/game / pal-extract）无锚点要求。但第一阶段有 CLAUDE.md 忠实还原铁律 + engineering-notes 432 fix + 73 单元审计 + harvest + game-mechanics，这些都是"动格前必读"的锚点。Codex 已将要求扩为"所有非小改任务",并补充第一阶段锚点至少包括 `CLAUDE.md`、相关 `engineering-notes`、`game-mechanics`、状态表/审计/测试。

**重点 3：代班表**——4 种缺席组合全覆盖，无遗漏场景。补一条隐性风险：Codex 缺席时 Opus 代班编码，但项目上下文全在 Codex 会话里，代班方上下文重建成本没在代班表体现。建议补「代班方接手前必读任务卡 + 相关审计/设计文档 + READ-FIRST；上下文重建成本计入排期」。**非阻塞。**

**非阻塞小项（Codex 下轮顺手）**：
1. lite 模板缺 `Capability` 字段（Opus 复审已提，确认仍缺）。
2. lite 模板 Status 行没标可选值 `build | review | done`（Opus 复审已提，确认仍缺）。
3. 标题/命名一致（三贤人系统），无矛盾。

**结论**：五项必改全部落实、Opus 立场转述准确无歪曲、模板完整。**accept**。阻塞项（第一阶段锚点）已补,其余建议非阻塞可下轮顺手。

## 用户验收

- 用户结论: 已按 GLM 最后一条阻塞项补齐;OPS-0001 定稿。
- 后续任务: 无 —— 全部非阻塞项已于 2026-07-09 由 Opus 按用户授权落地(措辞注解、代班必读锚点、lite 模板补齐、锚点换手/同会话歧义钉死)。

## 交接日志

- 2026-07-09 Codex: 创建第一组工作流文件。Evidence: `AGENTS.md`, `docs/ops/`。Next: User / review。
- 2026-07-09 Codex: 根据用户要求将新增 ops 文档改为中文优先。Evidence: `docs/ops/` 文件。Next: User / review。
- 2026-07-09 GLM: 提出精简方案。Evidence: 用户粘贴的 GLM 提案。Next: Codex / stance。
- 2026-07-09 Codex: 给出立场,建议看板保留 `负责人/下一步` 一列。Evidence: 对话回复。Next: User / decision。
- 2026-07-09 User: 拍板“保留一个”。Evidence: 用户消息。Next: Codex / docs update。
- 2026-07-09 User: 补充资源生成只能由 Codex 胜任。Evidence: 用户消息。Next: Codex / docs update。
- 2026-07-09 User: 补充账号额度耗尽时需由剩余 Agent 代班。Evidence: 用户消息。Next: Codex / docs update。
- 2026-07-09 Opus: 提出五项必改和一项建议。Evidence: 用户转达 Opus 审查立场。Next: Codex / docs update。
- 2026-07-09 Codex: agree Opus 五项必改和轻量模板建议,并写回文档。Evidence: 本任务卡。Next: GLM / review。
- 2026-07-09 User: 将整套协作机制命名为“三贤人系统”。Evidence: 用户消息。Next: Codex / docs update。
- 2026-07-09 Opus: 复审修订版,accept(五必改全落实;3 条非阻塞小项见三方共识记录)。Evidence: 本任务卡「Opus 复审」节。Next: GLM / review。
- 2026-07-09 GLM: 覆盖确认 accept,要求把上下文锚点从第二阶段扩到所有非小改任务。Evidence: 用户转达 GLM 确认。Next: Codex / docs update。
- 2026-07-09 Codex: 已补所有非小改任务上下文锚点,OPS-0001 定稿。Evidence: `AGENTS.md`, `docs/ops/agent-workflow.md`, `TASK-template.md`。Next: User / commit or continue。
- 2026-07-09 Opus: 终审确认 GLM 阻塞项已真实落进三处规则文件、无回归,维持 accept;指出锚点扩展与任务分级间一处执行歧义(常规迭代是否必须建卡),建议定稿后一句话钉死(见用户转达)。Evidence: 三文件锚点段核对。Next: User / decide。
- 2026-07-09 User: 授权 Opus 直接落地歧义修正与全部非阻塞项。Evidence: 用户消息「你直接改吧」。Next: Opus / edit。
- 2026-07-09 Opus: 落地完成 —— 锚点载体按换手区分(同会话自持 / 换手须 lite 卡+锚点,AGENTS+workflow 两处同步);小改措辞注解(纯重构/文档/注释;行为修正 bug 属常规迭代);代班方接手必读锚点 + 上下文重建成本计入排期;lite 模板补 Status 可选值 + Capability。Evidence: `AGENTS.md`、`docs/ops/agent-workflow.md`、`TASK-lite-template.md`。Next: User / 收口提交。
