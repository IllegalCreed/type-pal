# E2E-010 · 水月宫取苗刀与紫金丹

Last reviewed: 2026-11-07
Template: test-e2e-stage-v1 / 1.0.0

```yaml
id: e2e-010
status: verified
phase: [phase1, phase2]
engines: [game, reforge]
owner: Codex
lastVerified: 2026-11-07
dependsOn: [e2e-009]
tags: [story, npc, chest, visual]
canonicalReport: report.md
evidence: ../../evidence/e2e-010.json
```

## 入口与前置

Game 从已发布的 Game 009 正式终档接续。Reforge 从当前内容重建的 Reforge 009 正式终档接续。两端从桃花林经宫外进入水月宫，四次调查苗刀箱、饮泉水、完成赵灵儿交药，在宫内恢复操控时存档。[前驱及复验入口](report.md#execution-and-assertions)

## 当前结论

双轨 279 步同路、引路动作、开箱、实际恢复指令、紫金丹对白和宫内终档读回通过。用户确认了该候选 73.20 秒分屏。两处跨场景预览和保存的静态前态已复验。苗刀箱第 2–4 次的单独预览开盖帧仍待核。[正式报告](report.md#results)

## 证据与状态

[机器回执](../../evidence/e2e-010.json)定位原生报告、轨迹、录像指纹、正式终档和归档。脚本审查、优化和各步骤初态在[逐步骤台账](../../cross-stage/script-progress.md)分别跟踪。[010 任务卡](../../../../tasks/cards/E2E-010-1-water-moon-palace.md)

## 依赖与历史

发布依赖为 [009 桃花林采药与池塘初遇](../009-fairy-island-pool/README.md)。两端输入和终档各有字节身份，旧失败与当前执行按各自记录复验。[修订历史](report.md#revision-history)
