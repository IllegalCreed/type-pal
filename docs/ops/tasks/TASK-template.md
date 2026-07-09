# TASK-ID - 任务标题

Status: draft
Phase: phase1 | phase2 | ops
Capability: W7 / A4 / B5 / etc.
Coding Owner: Unassigned
Generation Owner: Codex | N/A
Reviewer: Opus | GLM | both | TBD
Visual Verification Owner: Codex | Opus | User | N/A
Unavailable Agents: none | Codex | Opus | GLM | multiple
Branch: TBD

## 目标

用一段话写清楚用户可感知或工程上的最终结果。

## 范围

- 范围内:
- 范围外:
- 明确不做:

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

## 推进签字

签字是阶段门禁。所有非小改任务必须集齐三方签字才能推进;缺签只能由用户明确豁免。`Status` 字段不能替代签字。

### 进入 build 前:设计签字

- Codex: pending | agree | counter
- Opus: pending | agree | counter
- GLM: pending | agree | counter
- counter / 分歧处理:
- 缺签豁免: N/A | 用户已批准(写明缺席方、原因、代班方、是否需补签)
- build 准入结论: blocked | build allowed

### 进入 done 前:审查签字

- Codex: pending | accept | counter
- Opus: pending | accept | counter
- GLM: pending | accept | counter
- counter / 返工处理:
- 缺签豁免: N/A | 用户已批准(写明缺席方、原因、代班方、是否需补签)
- done 准入结论: blocked | done allowed

## Draft: 设计与风险

### 设计结论

写清楚架构选择、数据流、模块边界和不做什么。

### 已知风险

- 风险:
- 缓解:

### 主审立场

按任务性质选择一个默认主审方。架构/schema/跨包/视觉高风险优先 Opus;覆盖/数据/文档优先 GLM。主审立场不替代“推进签字”。

- Reviewer:
- 结论:
- 必改项:
- 是否建议进入 build: pending

### 三方争议记录(按需)

仅在 schema/save/migration/asset pipeline、新能力格、跨包公共接口、capability-map 状态变化、签字 counter、用户要求或 Coding Owner 自评高风险时填写。

- Codex:
- Opus:
- GLM:
- 用户拍板:

## 额度 / 代班记录(如适用)

某个或多个订阅账号额度耗尽时填写。

- 缺席 Agent:
- 缺席原因:
- 代班 Agent:
- 代班范围:
- 风险:
- 是否需要补审:
- 用户裁决:

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
- 验证方式:
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
