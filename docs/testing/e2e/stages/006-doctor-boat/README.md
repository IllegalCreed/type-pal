# E2E-006 · 求药与出海

Last reviewed: 2026-10-16
Template: test-e2e-stage-v1 / 1.0.0

```yaml
id: e2e-006
status: rework
phase: [phase1, phase2]
engines: [game, reforge]
owner: Codex
lastVerified: 2026-10-03
reviewBy: 2026-10-23
dependsOn: [e2e-005]
tags: [story, npc, boat, visual, rework]
canonicalReport: report.md
```

## 入口与前置

本阶段从同引擎真实 005 saves checkpoint 继续。Reforge 公开入口为 `node scripts/e2e/boat-reforge.mjs`；第一阶段历史报告记录入口为 `node scripts/e2e/boat-game.mjs`，本次没有执行两条路线。输入须为当前 canonical content22/SAVE12、正常交互/移动至船边，不能互喂两引擎存档或以注入场景代替前驱。具体断言和来源见[正式报告](report.md)。

## 当前结论

正式报告：[report.md](report.md)。当前 Reforge 路线可达，但第一阶段 NPC 对照、船段视觉和命名清单未闭合，
不得作为下游 capture 或完整通关前驱。

上段沿用原发布结论，状态以[测试 catalog](../../../catalog.json)的 `e2e-006` 为准：`rework`，`lastVerified: 2026-10-03`。旧实跑、10-07 撤回首句停止点信用，以及后继连续卡的固定批次收口须分别阅读；本轮文档核读没有产生当前双轨、视觉或 capture-ready 信用。

## 证据与状态

[机器回执](../../evidence/e2e-006.json)保留历史 `runtimeExecution.performed=true`、原 SHA/content22/SAVE11 和 raw 路径，`_governance.currentAudit.runtimeExecutionPerformed=false` 只描述本轮未执行。不能把旧机器标志理解为今天实跑，不能把静态模板通过当成剧情或视觉验收。

停止线是完整确认岛口 `dlg.1886/1888/1889/1890`、进场剧情结束且控制返回；不进入水月宫、破阵或岛上后续。缺当前两阶段关键 NPC、船体/人物锚点或视觉闭合时保留 rework。原 `reviewBy: 2026-10-15` 在本地2026-10-16实测过期；完整原/新正文、配对证据、状态与反证经非作者实质发布复核后，明确将下一次发布复核设为2026-10-23。该续期不改 lastVerified/rework，不补签动态通过，原过期失败留入 catalog history。

## 依赖与历史

唯一前驱是 `e2e-005`；同引擎真实 checkpoint 的版本与 SHA 由 caller 校验。原元数据、日期、owner 和结论保留；本页仍是稳定阶段入口，不另建返工副本。

[活动 006 卡](../../../../ops/tasks/E2E-006-1-inn-doctor-and-boat-to-island.md)保存原 rework；[连续批次卡](../../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md)顶部的后继 done 有自己的冻结候选、日期和证据范围。本轮只直接读其前 160 行，不能据此宣布整卡深审或把该批次结论移植为本页当前实跑。

本次文档迁移已由非作者receipt_review独立accept、根Codex接收；下一次publication复核为10-23。对应E2E任务仍按实际证据处理动态缺口，本页不重新授权产品实现或为续期重录剧情。
