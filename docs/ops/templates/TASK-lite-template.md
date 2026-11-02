# Ops轻量任务卡模板源

Status: current
Validity: current
Owner: Codex
Last reviewed: 2026-10-24
Template: reference-canon-v1 / 1.0.0

## 适用范围

这是`task-card-v1`的模板说明，本页自身使用reference-canon，不新增类型。轻量卡压缩上下文和交接，但仍写直接证据/反证、独占Owner、build准入、贡献者自验、Codex独立验收与用户裁决。

本页说明与原卡骨架分开；完整卡和lite都属于task-card，按[AGENTS](../../../AGENTS.md)选择风险相符的变体，不能以lite减免前提门。

## 一手来源

下方源块是基点`3ed87f734df357799c4d9a44205781d3deba5c14`的完整原内容：blob `ffb37d41bbd994dab7ebae4895396a75c5d42f0e`，SHA-256 `350e61f286e276d6749af07c1af2ec4e351cdd7ecf7f8249a785262b79e58b87`，2552B，本轮逐行核读。旧source pin `ba60e9dccc2833b30be349213b86593260f4f66c` / `6fb14bb214b3f7f07cbf49e760c38aa7635a3c5370827a5b3641ece040e00fd4`仅复核身份，不冒称原执行或原深审已重认证。

[统一注册表](../../phase-governance/templates/registry.json)决定实际版本、章节、词表与变体，[文档交付与验收](../document-quality.md)决定交付验收；本页不改这些合同。[模板入口](../../phase-governance/templates/README.md)提供统一选择入口。

## 当前真值

源结构：目标；范围；前提真值门；上下文锚点；验证；当前模式推进记录；交接；下一位 Agent 提示词。

涉及机制/碰撞、schema/save/migration/资产管线、大量生成改写或主动改变用户行为，必须升级完整卡；lite不是绕高风险门或第二种模板类型。

## 代码任务的现行质量扩展

本节接入 main `72db417255d8ca4227522420e9185ef468462aa7` 的质量提示。下方保全骨架仍是其注明基点的原件；建立代码任务时，将本节记录项填入新卡验收部分，不改写历史源块，也不预填通过。

代码任务按[长期工程质量规范](../code-quality.md)填写；非代码任务说明适用范围。下列为记录提示，不预填通过，不改变既有任务状态机。

### 代码质量与低成本复验

- 受审文件/实际全文读域、生产caller、公共出口、相邻类型与生命周期：
- 逐文件八维结论及具体依据（N/A须解释；可链接同一份完整审查表）：
  - A正确性与边界；B注释质量；C高内聚低耦合；D可复用：
  - E测试质量；F可读性；G简洁性；H可测试性：
- [命名与组织](../code-quality.md#文件与目录的语义组织硬性要求)：文件/目录/符号的模块与功能语义；拆合依据；旧职责与测试合同去向（不得按作者、模型或任务编号划分代码）：
- 必改项、可改善结构、未知/保留项及阻断性；模块/路径/测试合同迁移映射：
- 基点/候选Git身份，相关caller/依赖/测试/工具指纹与证据失效条件：
- 快速只读复验命令及预期、不能自动验证的语义；必要定向命令及完整原件入口：
- 实际结果/诊断计数/未跑项与理由；全仓check/官方coverage/protected的大窗口安排：
- Codex证据验收：接收的claim/贡献者原件、实际核过的差异/命令、定向抽核及触发原因；默认不重复全文。审查完整/整改完成/可集成分别判定：

## 未知与冲突

空字段、示例ID/命令/日期是待填输入，不是结果。Status current只指模板说明；正式使用须按实际任务和现行合同替换占位，保全块中的旧版本不作当前断言。来源或许可未知时停受影响项，不填假通过；本轮未审全部使用者文档、未跑产品或历史执行。

## 使用边界

以源块作为历史骨架起点，另填真实标题、身份、范围与证据；代码任务同时填写上方现行质量扩展，不把说明或历史占位当作结果。作者自验、非作者接受和中央接入分开；旧机械artifactOnly不授完成，本篇partial/needs待独立验收与显式路由/标志处置。结构通过不授runtime/E2E/视觉/coverage，全量硬门未过不合main、不done。

## 原有源内容

保全块的外层fence之外不属于骨架。按记录前缀/后缀提取即可逐字节等基点原文，不trim、替换或升级字段；嵌套YAML/testing-meta/代码保持原样。

<!-- template-source-example:start -->
````markdown
# TASK-ID - 任务标题

Status: draft
Owner: Codex | 受委派贡献者
Reviewer: Codex（独立验收）
Phase: phase1 | phase2 | ops
Capability: W7 / A4 / ops / etc.
Visual Verification Timing: dev-functional | e2e-deferred | mixed | N/A

状态取值：draft / build / review / done / blocked / rework / cancelled；按 [`AGENTS.md`](../../../AGENTS.md) 当前临时模式，Codex 核准入与独立验收，不要求固定三贤人签字。

## 目标
-

## 范围
-

## 前提真值门

行为/机制任务必填;纯内部任务可整节写 `N/A（具体原因）`。若涉及原版/第一阶段机制真值、碰撞/移动语义、
migration/schema/save/asset pipeline、大规模 generated rewrite 或主动改变既有用户行为,不得继续使用 lite,
必须升级完整任务卡。

- 一句话行为 / 工程前提:
- 真值来源: （必填 `file:line`、reference 路径或等价一手证据；裸 `verified` 无效）
- 当前 `before` -> 目标 `after`:
- 最强替代解释 / 什么观察会推翻前提:
- 是否主动偏离已核真值: no | yes（用户裁决） | N/A（原因）

## 上下文锚点
-

## 验证

文档任务引用[通用文档验收协议](../document-quality.md#文档交付与证据验收协议)，本卡只填适用版本、本批范围/例外、候选与证据入口、实际裁定；不复制长期规则，也不预填通过。

测试任务须填写[测试质量验收](../agent-workflow.md)：逐合同原子性/判别力、合法typed输入、真实caller/oracle、旧断言排重、有效反控与隔离；不以全绿或例数独立accept，精简后重算基准。
-
- 剧情 / 演出视觉如适用：登记集中 E2E 入口、步骤、预期和证据路径；开发期不重复走剧情。

## 当前模式推进记录
- Codex 范围/前提核验: pending（直接证据与反证） | verified | counter
- 受委派 Coding Owner / 隔离分支: pending
- build 准入: blocked | Codex build allowed（附范围和验收条件）
- 贡献者交付/自验: pending（候选 SHA、命令、结果）
- Codex 独立验收: pending | accept（证据） | counter（返工锚点）
- 用户产品裁决/体验验收: N/A（原因） | pending | 结论与日期
- done 准入: blocked | Codex done allowed；历史三方签字如适用只按历史记录，不是当前门禁

## 交接
- YYYY-MM-DD Actor: 摘要。Evidence: 链接/测试。Next: actor/state。

## 下一位 Agent 提示词
```text
接手任务:
任务卡:
当前状态:
你的角色:
先读:
请你做:
不要做:
输出要求:
```

````
<!-- template-source-example:end -->
