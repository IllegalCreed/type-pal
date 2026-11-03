# 完整任务卡模板

Status: current
Validity: current
Owner: Codex
Last reviewed: 2026-11-03
Template: reference-canon-v1 / 1.0.0

## 适用范围

这是`task-card-v1`的模板说明，本页自身使用reference-canon，不新增类型。完整卡保留前提真值矩阵、反证/用户偏离、上下文、build/done独立准入、设计风险、实施、资源/视觉记录和交接提示词。

本页说明与原卡骨架分开；完整卡和lite都属于task-card，按[AGENTS](../../../AGENTS.md)选择风险相符的变体，不能以lite减免前提门。

## 一手来源

下方是随现行入口维护的可复制骨架。历史来源为[固定Git原模板](https://github.com/IllegalCreed/type-pal/blob/3ed87f734df357799c4d9a44205781d3deba5c14/docs/ops/templates/TASK-template.md)：blob `807bf63fcf1d24b4c6a1c5ba1b2d5c2a51f148dc`，5997B，SHA-256 `522b6ce91da966a1df951eafc00f4631abbb0804b594d24c386d29a1797ec07d`；这些身份只描述历史原件。当前骨架已修正阶段入口和规范链接，不再与该原件逐字节相同。[固定迁移前整页](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/templates/TASK-template.md)保留此前治理说明和原骨架。

[统一注册表](../../phase-governance/templates/registry.json)决定实际版本、章节、词表与变体，[文档交付与验收](../../engineering/guides/document-quality.md)决定交付验收；本页不改这些合同。[模板入口](../../phase-governance/templates/README.md)提供统一选择入口。

## 当前真值

源结构：目标；范围；前提真值门；上下文锚点；验收条件；当前模式推进记录；Draft: 设计与风险；分派与容量记录（如适用）；Build: 实现与自测；资源生成记录(如适用)；视觉验证记录(如适用)；Review: 审查与返工；用户验收；交接日志；下一位 Agent 提示词。

Coding Owner、Generation Owner与Visual Owner职责分开；高风险关键unknown保持blocked，固定三贤人退休不豁免事实门或用户产品裁决。

## 代码任务的现行质量扩展

本节承接 main `72db417255d8ca4227522420e9185ef468462aa7` 的质量提示。建立代码任务时，将本节记录项填入新卡验收部分，不预填通过；固定历史原件按上述Git来源追溯。

代码任务按[长期工程质量规范](../../engineering/guides/code-quality.md)填写；非代码任务说明适用范围。下列为记录提示，不预填通过，不改变既有任务状态机。

### 代码质量与低成本复验

- 受审文件/实际全文读域、生产caller、公共出口、相邻类型与生命周期：
- 逐文件八维结论及具体依据（N/A须解释；可链接同一份完整审查表）：
  - A正确性与边界；B注释质量；C高内聚低耦合；D可复用：
  - E测试质量；F可读性；G简洁性；H可测试性：
- [命名与组织](../../engineering/guides/code-quality.md#文件与目录的语义组织硬性要求)：文件/目录/符号的模块与功能语义；拆合依据；旧职责与测试合同去向（不得按作者、模型或任务编号划分代码）：
- 必改项、可改善结构、未知/保留项及阻断性；模块/路径/测试合同迁移映射：
- 基点/候选Git身份，相关caller/依赖/测试/工具指纹与证据失效条件：
- 快速只读复验命令及预期、不能自动验证的语义；必要定向命令及完整原件入口：
- 实际结果/诊断计数/未跑项与理由；全仓check/官方coverage/protected的大窗口安排：
- Codex证据验收：接收的claim/贡献者原件、实际核过的差异/命令、定向抽核及触发原因；默认不重复全文。审查完整/整改完成/可集成分别判定：

## 现行文档与知识同步

建立或修改任务时，将以下记录项填入新卡验收部分，按[功能变更写回流程](../../engineering/guides/agent-workflow.md#功能变更同步现行文档与知识用户-2026-11-02-固化)执行：

- 受影响的现行规范、指南、知识及状态路径，和实现同提交更新的要点：
- 没有文档影响时的具体理由；Codex 对照实现、入口与例子核实的结论：
- 非代码产物按[公共收口流程](../../engineering/guides/agent-workflow.md#任务产物收口用户-2026-11-02-固化)记录归宿、数量或净变化、退出条件与必要验证；暂存对象的 Owner、到期日期或复核触发及处置；无产物的具体说明：

第一阶段上下文从[阶段索引](../../phase1/README.md)选择相关知识与一手证据。

## 未知与冲突

空字段、示例ID/命令/日期是待填输入，不是结果。Status current只指模板说明；正式使用须按实际任务和现行合同替换占位。来源或许可未知时停受影响项，不填假通过；本轮未审全部使用者文档、未跑产品或历史执行。

## 使用边界

以可复制骨架为起点，填写真实标题、身份、范围与证据，以及上方文档、知识与产物收口记录；代码任务还须填写现行质量扩展，不把说明或占位当作结果。作者自验、非作者接受和中央接入分开；旧机械artifactOnly不授完成；本次修订须由 Codex 独立验收并接入当前治理记录。结构通过不授runtime/E2E/视觉/coverage，全量硬门未过不合main、不done。

## 可复制骨架

复制以下fence内的Markdown，按实际任务填写占位并补齐上方适用记录；fence之外是模板说明。骨架更新按现行文档合同审查，历史原件从固定Git恢复。

````markdown
# TASK-ID - 任务标题

Status: draft
Phase: phase1 | phase2 | phase3 | cross-phase
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

所有非小改任务必填；无锚点不得进入 `build`。第一阶段从 `docs/phase1/README.md` 选择相关机制、工程知识、原任务、审计或测试；引用历史状态表时标明冻结日期。第二阶段任务至少锚定 `docs/phase2/READ-FIRST.md` 和相关设计、审计文档。

- 已拍板决策 / 铁律:
- 代码锚点(`file:line`):
- 已知坑 / 审计文档:
- 不得重新引入:
- 相关测试:

## 验收条件

文档任务引用[通用文档验收协议](../../engineering/guides/document-quality.md#文档交付与证据验收协议)，本卡只填适用版本、本批范围/例外、候选与证据入口、实际裁定；不复制长期规则，也不预填通过。

测试任务另核[测试质量验收](../../engineering/guides/agent-workflow.md#测试质量验收用户-2026-10-03-固化)：原子业务合同、合法typed输入、真实caller/oracle、逐轴排重、高判别力反控和隔离；不得仅以通过率/数量/覆盖率accept。

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

````
