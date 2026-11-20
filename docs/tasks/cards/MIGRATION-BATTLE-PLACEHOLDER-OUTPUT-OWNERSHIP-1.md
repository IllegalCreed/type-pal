# MIGRATION-BATTLE-PLACEHOLDER-OUTPUT-OWNERSHIP-1 — 占位战斗精灵的输出所有权

Status: draft
Phase: phase2
Owner: Codex
Last reviewed: 2026-11-20
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

确认固定生成目标的维护权和写入边界。两套占位资源的正常产物可复建，目录路径失去所有权时需要明确失败合同。

## 范围

核定 `packages/migrate/scripts/generate-project-battle-placeholders.mts`，及 demo、e2e-own 的对应生成目录和资源目录登记。本次交付为直接取证、风险登记及关闭状态撤回。

## 前提与证据

| 真值层 | 已核事实 |
|---|---|
| 一手实现 | `generate-project-battle-placeholders.mts:27–37` 编码后逐工程创建固定目录，直接写目标，路径所有权由实际文件系统决定。 |
| 第一阶段 | 该工具生成二阶段自建占位素材，原盘和旧引擎没有此输出合同。 |
| 第二阶段 | 两个资产目录表都消费 `assets/generated/battle-sprites/player-fighter.rle`。普通独立目录下原 #72 两份产物的字节验收仍适用。 |
| 本任务 | 实际入口在隔离目录被证实可经目录链接覆盖另一棵树。采用何种拒绝规则、两个输出的失败顺序及是否继续保留此入口需要裁定。 |

反证针对“输出目录始终属于运行的工程树”。复制 #72 的命令原字节到自有临时树，以第二棵自有临时树作为 demo 生成目录链接的目标，原有文件先放独立标记。真实 tsx 命令退出 0，标记从 20 字节变为 107 字节；另一个普通目录也产生 107 字节。用例以链接之外的文件字节为观察。运行源 SHA-256 为 `f3d4bc6555e8240524bad1e28aebdcc60763ea1cbde6a45343e5b33167af6838`。

## 验收

按 [二阶段准入](../../phase2/READ-FIRST.md) 与 [逐文件关闭门](../../engineering/guides/code-quality.md#逐文件关闭门) 核定实际维护入口、拒绝条件及写入顺序。实现准入后，先以正常输出已存在、非法目录或目标路径和第二次写入失败的合法隔离用例观察字节，再修上游并核两工程的正常生成。可选的恢复或替换策略以用户裁决为准。

[执行归档](../evidence/QUALITY-POST-GAME-ACCEPTANCE-AUDIT-1.tar.gz) 内 `placeholder-ownership.json` 保存原命令、输出、退出码与前后摘要。脚本可从 `b3f6104561d77ba270f08a3a7f4535aa63513350` 取回。两棵临时树均由本次审查创建。生产入口和核定范围由 [#72 原验收](QUALITY-MIGRATION-SOURCE-PROJECTIONS-1.md#合并后关闭复核) 对照。

## 状态与交接

Codex 完成前提取证，build 准入待定。后继先核调用者与 E2E Owner，再定输出所有权和失败保持行为。单一 Coding Owner 在准入时登记。
