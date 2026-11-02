# 菜单与编辑命令十六组：Codex独立接收

Status: historical
Owner: Codex（文档治理；不代签原执行——原执行为 Codex 席位，本页只接模板）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GLM-STATE-COMMANDS-1（菜单与编辑命令十六组，A34/B32/C35/D25=126 项）的 Codex 统一集成验收回执：GLM 分支 `codex/glm-state-commands-r1`（返工 `1b57aa1c`、登记 `90400f17`）以 `main@5921cb34` 受保护基线合并后在 `2a41d168` 执行统一验收。

## Scope

- 候选：`2a41d168`（受保护基线 `5921cb34` 合并）；对象=16 个目标生产源（SHA-256 逐项等于冻结账）、四批测试 A34/B32/C35/D25；完成卡见 [TEST-GLM-STATE-COMMANDS-1](../../../../../tasks/archive/done/TEST-GLM-STATE-COMMANDS-1-sixteen-leaf-modules.md)。

## Execution and assertions

| step | legal input | caller | machine assertion | business oracle |
|---|---|---|---|---|
| R1–R4 复核 | A 批四行 ledger/三针；B/C/D 业务正例 | 正式 loader + `assertProjectSaveValid` | 新增测试/fixture/工具 Biome 0；有意缺表防御轴分离 | 最终回执 126 项与树一致 |
| 定向复跑 | Reforge/editor 定向 | vitest | Reforge 34/34、editor 92/92；四批绿对照+12 单点负控全部通过 | 钉名业务红判据；两包 typecheck 零诊断 |
| 统一门 | 完整 check→官方 ratchet→保护 `5921cb34` 单次严格 fast | pnpm | 9,959 全仓项 exit0；严格 lint 2,296 文件 0 错误/警告/信息；fast 9,467 项/728 生产文件 exit0 | 官方全仓分支 46,393/63,321→46,550/63,321（73.51%）：Reforge +28、editor +129，共 +157B |

## Results

- 产品实现、旧测试、资产、配置未因 GLM 贡献更改；作者自验不作独立证明。
- GLM 贡献与 Codex 自己的 UI 补测 +192B 分开披露，不用局部口径相加成新基线；其余六包 baseline 对象不变。
- 本批纯同步测试：视觉/E2E/full/Q1/Q2 没有通过声明；本机日志清单见任务卡最终节。

## Evidence

- 证据路径：本回执正文（quote 保全）；[首轮反证](codex-intake-review.md)、[分包工作包](README.md)。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 统一接收 | 原文时点（集成批） | r1→r4 返工后在 `2a41d168` 统一验收 | 独立接收（三门 exit0） | 首轮反证 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

- legacy batches/glm-state-commands 的 Codex 统一集成验收回执；固定来源与 source SHA 见下方保全节。

## 原始结论

- 126 项四批全绿+12 负控、三门 exit0、覆盖 +157B 至 73.51%（GLM/Codex 增量分开披露）；纯同步测试不声明视觉/E2E。

## 当时证据

- 候选/基线 SHA、复跑数字与覆盖口径在 quote 保全。

## 当前有效性

- historical。接收仅指当时集成；当前状态以现行 catalog 与官方门为准。

## 继任文档

- 当前结论归 docs/testing catalog 与 canonical 报告。

## 原文保全

固定源 revision `1cfd3cdbe7a13898672dfe5ae89b6a60e0f18c31`，source SHA `b8d0b21b772184d3bd61949fe010067f4e295d7134690c31121d394a0a9c9b58`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # 菜单与编辑命令十六组：Codex独立接收
>
> [完成卡](../../../../../ops/archive/tasks/done/TEST-GLM-STATE-COMMANDS-1-sixteen-leaf-modules.md) /
> [GLM分包工作包](README.md) / [首轮反证](codex-intake-review.md)。
>
> GLM贡献者分支 `codex/glm-state-commands-r1`：返工实施提交 `1b57aa1c`、登记
> `90400f17`。Codex以`main@5921cb34`作为受保护基线合并后在`2a41d168`执行统一验收；
> 产品实现、旧测试、资产、配置未因GLM贡献更改。16个目标生产源SHA-256逐项等于冻结账。
>
> R1–R4复核：A批四行ledger/三针已落；所有新增测试/fixture/工具Biome0；B/C/D
> 业务正例先过正式loader及`assertProjectSaveValid`，有意缺表防御轴分离；最终回执
> A34/B32/C35/D25=126项与树一致。作者自验不作独立证明，本席定向复跑Reforge34/34、
> editor92/92；四批绿对照+12单点负控全部通过钉名业务红判据，两包TC零诊断。
>
> 统一顺序完整check→官方ratchet→保护`5921cb34`的单次严格fast：
> **9,959全仓项；严格lint 2,296文件0错误/警告/信息；fast 9,467项/728生产文件**，
> 三门均exit0。官方全仓分支从46,393/63,321升至**46,550/63,321（73.51%）**：
> 本批Reforge+28、editor+129，共+157B；其余六包baseline对象不变。
> GLM贡献与Codex自己的UI补测+192B分开披露，不用局部口径相加成新基线。
>
> 本批纯同步测试，视觉/E2E/full/Q1/Q2没有通过声明。见任务卡最终节的本机日志清单。
>
<!-- original-source-quote:end -->
