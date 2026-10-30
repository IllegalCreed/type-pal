# E2E-001 · 开场

Last reviewed: 2026-10-29
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

catalog 的 verified 与上方 lastVerified 保留原已发布记录的语义。2026-10-29 已重新核读报告、配对JSON、7个源码SHA及行段、双runner/both入口；实际调用原生对白合同得到55行，并回放25项工具合同。reviewBy按这次真实文档续审设为2026-11-28；没有重新运行浏览器剧情、保存/恢复或视觉验收，不能把9-28或10-07/10-08结果外推为今天的完整NPC/capture-ready/连续链通过。

## 证据与状态

[正式报告](report.md)保存各批候选、存读档、演员/对白断言与历史限制；[机器回执](../../evidence/e2e-001.json)仍为 document-audit，`runtimeExecution.performed` 为 false，不冒充本轮执行。

## 依赖与历史

本阶段无前驱依赖，后续阶段必须使用同引擎且版本合法的真实 checkpoint。状态与适用版本以[测试 catalog](../../../catalog.json)和对应报告 revision 为准；原模板迁移未更新审阅期限；本次有证据的文档续审只更新reviewBy和审阅说明，lastVerified、原candidate/版本/运行SHA仍保留。下一步由当前 E2E 任务按真实缺口推进，不因本页模板通过重录或追认历史。
