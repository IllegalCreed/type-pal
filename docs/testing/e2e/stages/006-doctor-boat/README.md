# E2E-006 · 求药与出海

Last reviewed: 2026-10-26
Template: test-e2e-stage-v1 / 1.0.0

```yaml
id: e2e-006
status: rework
phase: [phase1, phase2]
engines: [game, reforge]
owner: Codex
lastVerified: 2026-10-03
reviewBy: 2026-11-02
dependsOn: [e2e-005]
tags: [story, npc, boat, visual, rework]
canonicalReport: report.md
```

## 入口与前置

本阶段从同引擎真实005 saves checkpoint继续。公开入口为`node scripts/e2e/boat-game.mjs --from <game005/report.json>`和`node scripts/e2e/boat-reforge.mjs --from <reforge005/report.json>`；输入为当前content22，Reforge须SAVE12，不能互喂存档或注入场景替代前驱。本轮正常重建001/002/003及004/005 saves，实际执行和未跑范围见[正式报告](report.md)。

## 当前结论

2026-10-26：当前两端006独立路线及95条正文/完整上岛收尾通过；最新离线全比较passed（0项finding），船只专项通过。编辑器初态、命名与正式006checkpoint仍按下列范围待核，整段保持rework。

`lastVerified: 2026-10-03`保留原发布身份；10-26新执行是另有原件的局部补验，不能把原native SAVE11回执改号成SAVE12，也不授capture-ready、下游正式前驱或整段done。

## 证据与状态

[机器回执](../../evidence/e2e-006.json)原顶层字段和历史执行保持逐字节；新增_governance publicationReview20261026只指向新原件和当前结论。旧`currentAudit.runtimeExecutionPerformed=false`仍描述10-18文档核读，不描述10-26新实跑。

本轮实质核读配对报告、catalog、当前caller、共同E2E合同、两端原始trace/关键截图和归档来源，发现原10-11raw在已查活跃树/备份中未恢复，故只重建必要合法前驱与当前006。原10-23截止在10-26已过期，原失败保留；下一次**出版复核**设11-02（或source/准入变化时提前），继续rework，不能把该日期解释为执行结果或自动续期。

## 依赖与历史

唯一前驱`e2e-005`；本轮只运行004/005 saves，不认证其余专项或一镜到底001–006连续演示。完整确认1886/1888/1889/1890、剧情结束和控制返回是路线停止线；不进入岛上后续剧情。

[活动006卡](../../../../ops/tasks/E2E-006-1-inn-doctor-and-boat-to-island.md)负责未闭合义务；[10-11连续卡](../../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md)的历史done保持自己的冻结候选和日期。10-16文档发布复核及10-23旧截止可在base `14e0336fe045d038a29ab773acaa639696d31ea8`读取，不由本轮追溯改写。本轮候选由Codex作者提交，待非作者据证验收；作者自验不能代签。
