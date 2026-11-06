# E2E-007 · 从仙灵岛码头到迷宫入口

Last reviewed: 2026-11-06
Template: test-e2e-stage-v1 / 1.0.0

```yaml
id: e2e-007
status: rework
phase: [phase1, phase2]
engines: [game, reforge]
owner: Codex
lastVerified: 2026-11-06
dependsOn: [e2e-contract]
tags: [story, hostile-encounter, save-restore, editor-preview, visual]
canonicalReport: report.md
evidence: ../../evidence/e2e-007.json
```

## 入口与前置

两端各从本引擎的正式 006 终档恢复。使用 `scripts/e2e/island-entrance.mjs`，通过 `--engine game` 或 `--engine reforge` 选择引擎。Game 使用 SAVE1，Reforge 使用 content22 / SAVE12。实际运行、回读和离线对照命令见[正式报告](report.md)。

## 当前结论

候选 `743be436c70bf3519e1324ec356dafcf0f6d040a` 双轨走完相同的 132 步和三场遭遇，各获 8 点经验，首次到迷宫恢复操控并在新会话读回终档。四只草妖的实绘追逐也通过同路对照。前轮奖励窗观感已通过，当前 28.12 秒同路分屏待作者复看。出版状态为 `rework`，任务裁定见[007 任务卡](../../../../tasks/cards/E2E-007-1-island-entrance-to-maze.md)。

## 证据与状态

[机器回执](../../evidence/e2e-007.json)定位两端运行、存档、比较及分屏收据。[正式报告](report.md#evidence)定位原件与编辑器保存、反查和跨场景播放证据。各脚本实际入口、初态和优化分别由[逐步骤台账](../../cross-stage/script-progress.md)记录。

## 依赖与历史

发布依赖为现行 [E2E 合同](../../contract.md)。真实前驱是[006](../006-doctor-boat/README.md) 的同引擎终档，身份见正式报告。006 既有出版记录仍为 `rework`，其运行前驱与出版依赖分列。008 已实际消费这两份 007 终档，迷宫机关和后续剧情见[008 任务卡](../../../../tasks/cards/E2E-008-1-fairy-island-maze.md)。
