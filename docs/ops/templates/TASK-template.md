# TASK-ID - 任务标题

Status: draft
Phase: phase1 | phase2 | ops
Capability: W7 / A4 / B5 / etc.
Coding Owner: Unassigned
Generation Owner: Codex | N/A
Reviewer: Codex（独立验收；可另请专项审查）
Visual Verification Owner: Codex | 受委派视觉贡献者（Codex最终验收） | User | N/A
Visual Verification Timing: dev-functional | e2e-deferred | mixed | N/A
Contributor: Cursor | GLM | Grok | Gemini | Kimi | Codex | TBD
Branch: TBD

> 当前采用 [`AGENTS.md`](../../../AGENTS.md) 的“Codex 分派—贡献者执行—Codex 独立验收”临时模式；下方记录不是固定三贤人签字表。高风险事实门与用户产品裁决仍保留。

## 目标

用一段话写清楚用户可感知或工程上的最终结果。

## 范围

- 范围内:
- 范围外:
- 明确不做:

## 前提真值门

不可逆/高风险、用户可见行为变化、涉及原版/第一阶段机制真值或碰撞/移动语义的任务必填。必须先完成本节,
再写详细方案。决定修复层或用户行为的关键项为 `unknown` 时,任务保持 `blocked`,不得用推断补齐。

### 一句话行为 / 工程前提

-

### 真值矩阵

直接证据必须是 `file:line`、reference 路径或等价一手来源;无证据的 `verified` 无效。确实不适用可写
`N/A（原因）`,不得只写裸 `N/A`。

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | | |
| 第一阶段 | | |
| 当前二阶段 | | |
| 本任务目标 | | |

### 反证与替代解释

- 最强替代解释:
- 什么观察会推翻当前前提:
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类:
  - 原版 / 第一阶段理解:
  - extractor / 地图 / 数据解码:
  - audit / test model:

### 用户可见偏离

- 是否主动偏离已核真值: no | yes | N/A（原因）
- `before -> after` 一句话:
- 代表场景:
- 用户裁决: N/A | pending | YYYY-MM-DD 用户已批准/否决

## 上下文锚点

所有非小改任务必填;无锚点不得进入 `build`。第一阶段任务至少锚定 `CLAUDE.md`、相关 engineering-notes / game-mechanics / 状态表 / 审计或测试;第二阶段任务至少锚定 `docs/phase2/READ-FIRST.md` 和相关设计/审计文档。

- 已拍板决策 / 铁律:
- 代码锚点(`file:line`):
- 已知坑 / 审计文档:
- 不得重新引入:
- 相关测试:

## 验收条件

- 功能:
- 测试:
- 文档:
- 视觉 / 手工验证:
- E2E 用例登记（剧情 / 演出 / 内容观感必填：入口、准备数据、步骤、预期画面/时序、证据路径）:

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单:
- 前提核验: pending | verified（附 `file:line` / reference 与可证伪观察） | counter | N/A（说明）
- 范围、设计和验收条件: pending | agree（证据与风险） | counter
- 高风险用户产品裁决: N/A（理由） | pending | 日期与原话
- build 准入结论: blocked | Codex build allowed

### 进入 done 前：独立验收

- 贡献者交付与自验: pending（SHA、命令、结果；不算独立验收）
- Codex 独立复核: pending | accept（直接证据与质量门） | counter（返工项）
- 用户体验/产品验收: N/A（理由） | pending | 日期与结论
- done 准入结论: blocked | Codex done allowed；固定三贤人签字不再是当前门禁

## Draft: 设计与风险

### 设计结论

写清楚架构选择、数据流、模块边界和不做什么。

### 已知风险

- 风险:
- 缓解:

### 专项审查安排（按需）

Codex 对所有贡献者交付作独立验收；可按难度邀请其它 Agent 做专项审查，但不是固定签字门禁。高风险产品取舍仍交用户。

- Reviewer:
- 结论:
- 必改项:
- 是否建议进入 build: pending

### 证据分歧与用户裁决（按需）

当一手证据冲突、触及不可逆/高风险决策、审查 counter 或用户要求时填写；不要求凑三方意见。

- Codex:
- 贡献者/可选专项审查者:
- 用户拍板:

## 分派与容量记录（如适用）

- 原负责人及改派原因:
- 新贡献者与独占写入范围:
- 交接风险与 Codex 验收方式:

## Build: 实现与自测

- Coding Owner:
- 修改文件:
- 实现摘要:
- 运行命令:
- 浏览器 / 手工检查:
- 跳过的检查及原因:

## 资源生成记录(如适用)

涉及 AI 生图或批量替代资源时必须填写。Generation Owner 固定为 Codex。

- Generation Owner:
- 生成目的 / 替换对象:
- 提示词要点 / 风格约束:
- 输出路径:
- 尺寸 / 格式 / 透明背景 / 调色约束:
- 资源登记位置:
- 验证方式:

## 视觉验证记录(如适用)

- Visual Verification Owner:
- Visual Verification Timing:
- 验证方式:
- 集中 E2E 用例 / 批次:
- 截图 / 像素检查路径:
- 结论:
- 未完成项:

## Review: 审查与返工

- Reviewer:
- 审查结论:
- 必须返工项:
- Accept / rework: pending

## 用户验收

- 用户结论:
- 后续任务:

## 交接日志

按日期追加。每条写清楚:行动者、证据、下一步。

- YYYY-MM-DD Actor: 摘要。Evidence: 链接/测试。Next: actor/state。

## 下一位 Agent 提示词

每次需要用户转交给下一位 Agent 时,由当前 Agent 更新本节,并在最终回复中给出同一段可复制文本。若暂无下一位,写“无,等待用户验收/收口”。

```text
接手任务:
任务卡:
当前状态:
你的角色:
先读:
已完成:
请你做:
不要做:
输出要求:
```
