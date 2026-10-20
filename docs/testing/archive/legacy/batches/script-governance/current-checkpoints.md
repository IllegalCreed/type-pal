# 统一步骤后的当前检查点

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是统一步骤工程后的当前检查点回执（2026-10-03 本地验收）：二阶段 001-005 已在冻结统一步骤工程中沿真实前驱重新执行、正式保存并读回；当前格式 content22/SAVE11，作者工程整包 hash 10f2c052…93c4；五份报告均 passed，Root 独立重算当前输入/原档/登记 trace/恢复世界 hash 相符。

## Scope

- 当前可用入口：证据根 build/evidence-archive/unified-steps-20261003/e2e/（目录名用运行器 UTC 时间）；五段落目录与终档 SHA256 表（001 8979da1e…/002 8aa6e6c4…/003 4dd2c63b…/004-saves 85dc16ac…/005-saves 71ccb886…）在 quote；重跑命令示例（pnpm e2e:005:reforge --from …report.json --headed）。

## Execution and assertions

- **已验范围**：001 新的故事自然播放视频（视频交接不露旧菜单/房间演出/55 行对白）；002 20 行对白+500 文赏银+三名苗人进房；003 14 行对白+楼梯动作+厨房交代；004 saves 完整端菜赠酒剧情+正式恢复端菜中途与终点；005 saves 40 行对白+唯一 50 文+报信因果+正常移动+后台返程正式保存恢复；Root 目视楼梯终点/端菜读回/村口读回人物与画面亮度正常
- **边界**：这是新格式前驱链回归，不是重做第一阶段、004 取消/错误站位专项或 005 guards 完整观感验收，也不替代后期剧情 E2E；当前没有视频录制；五份报告引擎 errors=0；浏览器原 warning 分别 2/1/1/2/2（清工程资源 404 及 Canvas 读回性能建议），原日志保留不与全仓静态零诊断混为一谈；归档映射/原路径/逐文件 hash 见 archive-map.json
- **历史保留**：上一批 SAVE10 记录（save10-checkpoints-20261002.md）及原档保留为历史，不能手改版本/digest 作为当前前驱；用户 6012 服务和页面继续保留

## Results

- 001-005 沿真实前驱重放五报告 passed（content22/SAVE11 整包 10f2c052…）；引擎 errors=0、warning 口径分列；SAVE10 历史保留。

## Evidence

- 证据路径：本回执正文（quote 保全）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 检查点回归 | 2026-10-03 | 001-005 前驱链重放+Root 重算 | 五报告 passed | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy batches/script-governance 的当前检查点回执；固定来源与 source SHA 见下方保全节。

## 原始结论

001-005 新格式前驱链回归五报告 passed（引擎 errors=0）；SAVE10 历史保留；边界如实（非完整观感/无录制）。

## 当时证据

五段落 SHA 表、已验范围与 warning 口径在 quote 保全。

## 当前有效性

historical。检查点按 2026-10-03 时点；当前以最新 e2e 证据为准。

## 继任文档

当前结论归 e2e stages 报告与后续剧情 E2E。

## 原文保全

固定源 revision `226f8cb90880b74c82f3c39b6e09d949f2a16e7b`，source SHA `8a5d40b301c1012521e3b363543846695169086544e1ad3d6cdfa1f7e70bad5d`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # 统一步骤后的当前检查点
>
> 二阶段001至005已在冻结的统一步骤工程中沿真实前驱重新执行、正式保存并读回。当前格式为content22 / SAVE11；
> 作者工程整包hash为10f2c0528fa2ee4424ae18ab56e6b2f618b830e655bf501ebd5a0698666af93c。
> 五份报告均passed，Root独立重算当前输入、原档、登记trace和恢复世界hash，结果相符。
>
> ## 当前可用入口
>
> 证据根为主工程的`build/evidence-archive/unified-steps-20261003/e2e/`。目录名使用运行器的UTC时间，
> 本地验收日期为2026-10-03。每个目录含原始`report.json`、正式终档及截图，报告正文不重写。
>
> | 段落 | 目录 | 终档SHA256 |
> | --- | --- | --- |
> | 001 | reforge-001-2026-10-02T16-48-27-507Z | 8979da1e895218b0fbf408ac63e181a106f58f1518a24562995693ab06f80ab6 |
> | 002 | reforge-002-2026-10-02T16-51-33-457Z | 8aa6e6c4dead8ddfabe18e2456a04d4a6ef52f615605afb9148c390368ca6a16 |
> | 003 | reforge-003-2026-10-02T16-55-10-776Z | 4dd2c63b6ea70914f5be387a6da2faf3a81e80febe150d4354950840f286a4b9 |
> | 004 saves | reforge-004-saves-2026-10-02T16-57-49-776Z | 85dc16ac85fc994b36dddb5da7d7ac68ec3f4f13ab3e1c935a908962bd66366c |
> | 005 saves | reforge-005-saves-2026-10-02T16-59-38-818Z | 71ccb886bd4b7f85165eaf61cb26ebef3ba9a4c965f5c1c51a0398d342f4a888 |
>
> 例如重跑005：
>
> ```sh
> pnpm e2e:005:reforge --from build/evidence-archive/unified-steps-20261003/e2e/reforge-004-saves-2026-10-02T16-57-49-776Z/report.json --headed
> ```
>
> ## 已验范围
>
> 001从新的故事、自然播放视频开始，验证视频交接不露旧菜单、房间演出与55行对白。
> 002验证20行对白、500文赏银、三名苗人进房；003验证14行对白、楼梯动作和厨房交代。
> 004 saves走完整端菜赠酒剧情并正式恢复端菜中途和终点；005 saves验证40行对白、唯一50文、
> 报信因果、正常移动及后台返程的正式保存恢复。Root目视楼梯终点、端菜读回及村口读回，人物和画面亮度正常。
>
> 这是新格式的前驱链回归，不是重新做第一阶段、004取消/错误站位专项或005 guards的完整观感验收，
> 也不替代后期剧情E2E。当前没有视频录制。
>
> 五份报告的引擎errors为0；浏览器原warning分别2、1、1、2、2，包含清工程资源404及Canvas读回性能建议，
> 原日志保留，不与全仓静态零诊断混为一谈。归档映射、原路径和逐文件hash见证据根上级的`archive-map.json`。
>
> [上一批SAVE10记录](save10-checkpoints-20261002.md)及原档保留为历史，不能手改版本/digest作为当前前驱。
> 用户6012服务和页面继续保留。
>
<!-- original-source-quote:end -->
