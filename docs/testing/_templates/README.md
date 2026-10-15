# 测试文档模板

Status: current
Last reviewed: 2026-10-16
Owner: Codex
Template: governance-index-v1 / 1.0.0

## 目的

从统一 registry 选择测试文档合同，区分模板示例、现行合同、历史报告与真实执行证据。
模板自身不授予 verified，也不能用空字段或未运行步骤发布正式报告。

## 范围

测试专用 7 类与通用 10 类合成 17 类。catalog 使用 JSON；导航 README/index 使用 governance-index，
不因位于 testing 就被自动判为 E2E。历史正文保留原日期/结论/失败；执行 JSON 保留原顶层机器字段。

## 当前状态

注册表与设计补充冻结用于真实 pilot 和后续逐篇迁移；具体完成度由 review/SHA/正文合同投影。
早期仅保存原文的 17 个样本仍为 counter，不算符合性通过。本页不宣布全 testing 或全 docs 已完成。

## 入口与责任

| 类型 | 对应模板与用途 |
|---|---|
| test-catalog | [JSON 模板](test-catalog.json)与[合同说明](test-catalog.md)：机器索引、生命周期、依赖与 publication 范围 |
| test-contract | [合同](test-contract.md)：合法输入、caller、oracle、排重、revision |
| test-domain-report | [域报告](test-domain-report.md)：域内 claim/evidence、结果缺口与质量门 |
| test-e2e-stage | [阶段入口](test-e2e-stage.md)：稳定 ID、前驱、当前边界与证据 |
| test-run-report | [执行报告](test-run-report.md)：执行身份、步骤、结果、产物与历史 |
| test-machine-evidence | [机器证据](test-machine-evidence.json)：原顶层字段与统一 envelope，document-audit 不能变 execution |
| quality-gate | [质量门](quality-gate.md)：命令、原始诊断、接受/拒绝及停止线 |

原三份 starter 仍可查阅：[E2E 阶段页](e2e-stage-README.md)、[E2E 正式报告](e2e-report.md)、
[机器证据](evidence.json)。它们是模板示例；正式采用须满足上述统一 registry 对应合同，不重复计为三种新类型。

域报告与 document-audit 的状态是 catalog 发布状态的投影，必须按唯一 id 配对；默认 execution 回执使用独立执行状态合同。具体版本和词表取统一注册表，发布 current/verified 不能授予本次执行信用。

历史九字段 r10 的 historical-review-payload-v1 在1.4引入并已获固定源/真实 consumer/非作者独立 pilot 接收；原 counter/MISSED/诊断/exit 保持，治理 historical、本轮 false，不补造 schema2/id/status。

机器父版本1.5增加 continuation/intake/command 三种历史集成变体（15/10/22原生键），精确名称与固定33cc源见统一 registry 和冻结 J 设计。原 default 与三个变体保持，既有15份只滚治理版本，0新增迁移/运行。三份固定源 canonical 单篇非作者独立 pilot 均已接收，三配对历史 MD 与其它未读机器对象仍待逐篇治理；原历史 status/verdict/警告/非执行项不改，不能把集成沿用针数当新执行或套 catalog 发布词表。

## 证据与下一步

以[注册表](../../phase-governance/templates/registry.json)和[冻结设计](../../phase-governance/templates/registry-proposal-20261011.md)
为唯一模板事实源；[测试治理](../governance.md)控制公开 catalog、报告/evidence 配对和索引生成。
创建或更新时登记稳定 ID、Owner、原状态、依赖、reviewBy、来源/SHA与当前或明确缺失的执行证据；
运行真实 consumer 和文档门，不能以结构通过取代 runtime/E2E/视觉/coverage。
