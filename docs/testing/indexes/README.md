# 测试文档多维索引

Status: current
Owner: Codex（新增索引治理维护职责）
Last reviewed: 2026-10-16
Template: governance-index-v1 / 1.0.0

## 目的

从不同检索维度找到已登记的测试文档，再回其 canonical 报告与证据核结论。本目录只负责导航，不复制报告业务结论或维护第二份状态账。

## 范围

本入口人工维护九份自动视图：稳定 E2E 阶段、生命周期状态、标签、出版 Owner、工程域、模块/功能、适用阶段、引擎与 legacy 来源。各页从实际输入计算自己的范围；多值成员关系和旧来源行数不是新增测试或执行次数。

业务事实源是 [catalog.json](../catalog.json) 与 [legacy-flat-classification.json](../legacy-flat-classification.json)；本页不复制它们的登记行，不为目录外未知材料补造归属。

## 当前状态

current 仅表示导航职责有效；catalog 行的 current/proposal/rework/verified、旧分类账 reviewed、历史执行与本轮深审分别按各自来源阅读。导航有效不使返工项转绿，不把路线建议变成实施承诺。

原入口没有文档级 Owner 或审查日期；上方是新增治理维护责任。2026-10-16 只记录本次索引规则、来源与导航语义审查，没有重验所有下游报告、旧工具或 raw。重生成不会续期日期，也不签收变化后的正文。

## 入口与责任

以下页面由 `node scripts/docs/generate-testing-index.mjs` 生成，不能手工编辑：

- [按阶段/专项](by-stage.md)
- [按生命周期状态](by-status.md)
- [按标签](by-tag.md)
- [按 Owner](by-owner.md)
- [按工程域](by-domain.md)
- [按模块/功能](by-module.md)
- [按阶段](by-phase.md)
- [按执行引擎](by-engine.md)
- [Legacy 全量域分类账](legacy-by-domain.md)

Agent 检索顺序：先读 `catalog.json`，再打开条目的 `index`，最后按 `canonical` 和证据链接读取报告。

Codex 维护本人工入口和 producer 规则；[公开生成器](../../../scripts/docs/generate-testing-index.mjs)只写上述九页，不写本 README。catalog 维护稳定 ID、出版状态与证据配对，分类账维护旧原路径/迁移落点；各报告负责 caller、合法输入、oracle 与执行范围。Owner 分组不能充当独立审查签名。

## 证据与下一步

[L 冻结设计](../../phase-governance/reviews/20261016-testing-index-design.md)明确五章、原链接/标题、源 Git 保真及真实 writer/consumer 合同。本次替换同路径导航版式，不 supersede 下游报告或历史结论。

先在对应事实源解释变更，再重生成九视图并运行文档门；只有真实审查后才能更新 review。缺来源、投影成员不一致、断链或重生成丢章节时停止接收，不能刷日期/SHA 解决。分类账的旧 reviewed 不证明本轮全量深审；静态导航也不授 runtime/E2E/视觉/coverage 通过。
