# E18-1 - 编辑器角色战斗字段（coveredBy / casualty / cooperativeMagic）

Status: draft
Phase: phase2
Capability: E18（编辑器角色战斗字段 coveredBy / casualty / cooperativeMagic）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: GLM（表单/校验覆盖）+ Kimi（异步抽审）
Visual Verification Owner: N/A（表单为编辑器功能，走单测 + 手动）
Unavailable Agents: none
Branch: TBD

## 目标

编辑器 actor 表单支持 B11-1 已落地的三个战斗字段：coveredBy（援护者）、casualty（伤亡脚本）、
cooperativeMagic（合体技），数据/runtime 已就绪，编辑器补齐编辑与校验能力。

## 范围

- 范围内:
  - actor 表单新增 coveredBy（引用 actor id）、casualty（friendDeath/dying 脚本引用）、
    cooperativeMagicSkillId（引用 skill id）编辑。
  - 引用校验（目标存在、kind 匹配）纳入现有 validate。
- 范围外:
  - 战斗数据/runtime 改动（content 与 reforge 已 done）。
  - 战斗字段之外的角色字段。
- 明确不做:
  - 不改 content schema（actor.ts 字段已定）。

## 上下文锚点

- 已拍板决策 / 铁律:
  - B11-1 已落地数据与 runtime；18e 是编辑器补齐（用户确认可开卡）。
  - 编辑器引用一律走稳定 id + 校验（ED 系列纪律）。
- 代码锚点:
  - `packages/content/src/actor.ts:83-92`（coveredBy/casualty/cooperativeMagicSkillId）。
  - `packages/reforge/src/main.ts:2230/2368/2454`（runtime 消费点）。
  - 编辑器 actor 表单（`packages/editor/src/ui/` 对应组件）。
- 已知坑 / 审计文档:
  - B11-1 卡（玩家伤亡脚本）的字段语义；N6 共享脚本引用规则。
- 不得重新引入:
  - 裸字符串引用无校验。
- 相关测试:
  - validate 单测、actor 表单组件测试。

## 验收条件

- 功能:
  - 编辑器可编辑/保存三字段；引用不存在时校验报错。
  - 导出内容与 runtime 消费点兼容（B11-1 场景回归）。
- 测试:
  - 表单单测 + validate 用例；`pnpm check` 全绿。
- 文档:
  - 更新 backlog/能力表 18e 状态。
- 视觉 / 手工验证:
  - 编辑器手动路径（保存/重开/校验提示）。

## 推进签字

### 进入 build 前:设计签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 分歧处理: N/A
- 缺签豁免: N/A
- build 准入结论: blocked

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

待冻结（轻量）。方向：actor 表单三字段 + 引用校验，复用现有字段编辑模式。

### 已知风险

- 风险: 引用语义理解偏差（casualty 脚本作用域）。
- 缓解: 以 B11-1 卡字段语义为准。

### 主审立场

- Reviewer: GLM（表单/校验覆盖）+ Kimi（异步抽审）
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 2026-08-06 开卡（此前用户确认可开，被 D14-1 优先）。
- Kimi: pending
- GLM: pending

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: pending；设计三签前不得开始实现。
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: N/A

## 视觉验证记录(如适用)

- Visual Verification Owner: N/A
- 验证方式: pending
- 结论: pending

## Review: 审查与返工

- Reviewer: GLM + Kimi
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-08-06 Codex: 开卡。content（actor.ts:83-92）与 runtime（main.ts:2230/2368/2454）
  已就绪，编辑器无三字段编辑能力。

## 下一位 Agent 提示词

```text
接手任务: E18-1 编辑器角色战斗字段
任务卡: docs/ops/tasks/E18-1-editor-actor-battle-fields.md
当前状态: draft（build 准入 blocked）
你的角色: GLM 表单/校验覆盖主审；Kimi 异步抽审
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡、content/src/actor.ts:83-92、
  main.ts:2230/2368/2454、B11-1 卡、N6 共享脚本引用规则
已完成: 开卡（数据/runtime 就绪，编辑器缺字段），设计未冻结
请你做: 压测三字段的编辑/校验/引用语义；冻结方案后 agree/counter
不要做: 不得修改实现文件；不得改 content schema
输出要求: 更新设计签字、主审立场、争议处理和下一位提示词
```
