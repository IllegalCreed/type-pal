# E2E-006 · 求药与出海

Last reviewed: 2026-10-27
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

10-27两端95正文/完整上岛收尾、零finding全比较、正式006终档与新上下文读回均有passed原件；12入口/11状态已真实另存、File/Open重开并逐一播放重置，23处用途label补齐。技术产物与边界见[正式报告](report.md)。

状态仍rework：作者不代签非作者/用户视觉；lastVerified10-03、reviewBy11-02不变，本次不再延期。静态NPC初态不等于玩家/cursor/authority全现场恢复，不扩大连续、后续剧情或coverage信用。

## 证据与状态

[当前回执](../../evidence/e2e-006-current.json)绑定新执行；[历史回执](../../evidence/e2e-006.json)整个文件字节不变，catalog完整SHA/原状态/原候选与新回执supersedes反向配对。原10-18文档audit false和旧SAVE11身份不刷新。短片、终档SHA、重开与失败原件由正式报告唯一定位，不复制进度账本。

## 依赖与历史

唯一前驱`e2e-005`；本轮只运行004/005 saves，不认证其余专项或一镜到底001–006连续演示。完整确认1886/1888/1889/1890、剧情结束和控制返回是路线停止线；不进入岛上后续剧情。

[活动006卡](../../../../ops/tasks/E2E-006-1-inn-doctor-and-boat-to-island.md)负责未闭合义务；[10-11连续卡](../../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md)的历史done保持自己的冻结候选和日期。10-16文档发布复核及10-23旧截止可在base `14e0336fe045d038a29ab773acaa639696d31ea8`读取，不由本轮追溯改写。本轮候选由Codex作者提交，待非作者据证验收；作者自验不能代签。
