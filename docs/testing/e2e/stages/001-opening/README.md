# E2E-001 · 开场

Last reviewed: 2026-10-30
Template: test-e2e-stage-v1 / 1.0.0

```yaml
id: e2e-001
status: verified
phase: [phase1, phase2]
engines: [game, reforge]
owner: Codex
lastVerified: 2026-09-28
dependsOn: []
tags: [story, opening, dialogue, checkpoint]
canonicalReport: report.md
```

## 入口与前置

从两引擎各自正常标题和“新的故事”进入开场，不互喂存档；命令为 `pnpm e2e:001`、`pnpm e2e:001:reforge` 或 `pnpm e2e:001:both`。按[总合同](../../contract.md)准备当前 canonical 工程与原版提取资产，具体来源和输入边界在报告。

## 当前结论

catalog 的 verified 与上方 lastVerified 保留原已发布记录的语义。本页此次只做文档迁移，没有新实跑；不能把 2026-09-28 或报告中的 10-07/10-08 结论外推到今天的完整 NPC 验收、capture-ready 或 001–006 连续链。

## 证据与状态

[正式报告](report.md)保存各批候选、存读档、演员/对白断言与历史限制；[机器回执](../../evidence/e2e-001.json)仍为 document-audit，`runtimeExecution.performed` 为 false，不冒充本轮执行。

## 依赖与历史

本阶段无前驱依赖，后续阶段必须使用同引擎且版本合法的真实 checkpoint。状态与适用版本以[测试 catalog](../../../catalog.json)和对应报告 revision 为准；静态迁移不改 lastVerified 或原历史 SHA；旧期限现已退休。下一步由当前 E2E 任务按真实缺口推进，不因本页模板通过重录或追认历史。

## 2026-10-30 发布复核

本次完成001的文档/源码合同复核：[具体范围、原件与可复验回执](../../../../ops/evidence/QUALITY-PENDING-100-3/e2e001-publication-review.json)。七sourceRefs的当前SHA和区间锚点有效；实际作者内容55行对白顺序/正文与原始提取命令一致，64项opening工具及9项catalog测试通过。复核期限明确从10月28日调整为11月29日，沿用本条30天发布复核窗口；相关source/caller/合同变化时须提前复核受影响结论。

只解除本次出版复核到期，不授新的浏览器演出、两引擎checkpoint、视觉或编辑器预览验收。status、lastVerified、原revision/版本和runtimeExecution均保留其历史适用范围；日期不是当前E2E通过标记。006保持原条目，本次未重审或重跑。

## 2026-10-30 版本适用性规则

按[测试治理](../../../governance.md#版本适用性)取消活动 `reviewBy`。上文旧到期／续期只作历史，不再触发复核或重跑。运行 `node scripts/docs/testing-revisions.mjs e2e-001` 对比原候选、content/save版本及已声明源码指纹；记录缺失为unknown，相关边界不同为changed，匹配也不新增执行信用。status、lastVerified、原报告和机器证据保持原范围。
