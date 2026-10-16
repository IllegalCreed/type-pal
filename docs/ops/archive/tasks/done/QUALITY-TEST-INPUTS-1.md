# QUALITY-TEST-INPUTS-1 — 两处旧测试输入的确定性与CI可重建性

Status: done
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops 任务卡接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始状态、日期、证据、counter、链接和未决项在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标
- 保留原任务的目标、完成边界、历史结论和用户可见适用范围。

## 范围
- 当前包含：原卡声明的实现/测试/证据范围及其历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据或历史结论。

## 前提与证据
- primary source：固定 source revision `b9901f97a3a09359cbeaed9dde126e6f44b7f229` 与原卡全文。
- 合法输入、caller、证据和 counter：按原文 quote 解释；本次不重跑原执行。
- 事实权：当前 task card、代码、consumer 和新 receipt；历史卡不单独证明当前行为。

## 验收
- 原卡历史验收、失败、blocked、rework 和未执行边界保持原样。
- 本次迁移验收：source/after SHA、quote inverse、模板章节、链接和历史 overlay 通过。
- runtime/E2E/视觉/coverage：本次均未执行，信用为 0。

## 状态与交接
- `status`: done（历史快照）；当前工作不得从 quote 中自动获得 build 授权。
- Owner/provenance：原卡保留于 quote；当前文档治理 owner 为 Codex。
- 下一步：若需重新启用，创建当前 task card，重新核 primary source、合法输入、business oracle 和独立验收。

## 历史范围
- 原始日期、版本、阶段：源文档固定于 `b9901f97a3a09359cbeaed9dde126e6f44b7f229`；本轮为 2026-10-17 R41。
- 归档原因：已关闭任务记录只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论
- `Status: done`；原始任务语义完整保留于下方 quote。

## 当时证据
- 原始命令、产物、SHA、签字、counter、链接和状态保留于 quote。

## 当前有效性
historical。do not promote historical task card to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：需由当前 task card、consumer 和新证据重新复核。

## 继任文档
- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

## 原文保全
固定源 revision `b9901f97a3a09359cbeaed9dde126e6f44b7f229`，source SHA `94e9abeecf99cf52a76db6bc2cb63be7534f548afa9e7203be68ea3cb94ee472`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # QUALITY-TEST-INPUTS-1 — 两处旧测试输入的确定性与CI可重建性
>
> Status: done
> Closed Evidence: main d8a81d4c21a32efa3c140fb5858c83465b01bc5e; GitHub Documentation 37145486289 + Coverage 37145486286 success (2026-10-04); finite regression admission after audit, not historical quota fulfillment.
> Owner: Codex（用户2026-10-03“修吧”明确授权）
> Reviewer: Codex
> Phase: ops / mixed
> Capability: test-quality
> Visual Verification Timing: N/A
>
> ## 前提与有限建议
>
> [实跑与定位原件](../../../../testing/archive/legacy/batches/finite-test-intake-20261003/README.md)；O/P/Q固定83文件未改这两个旧测试。
>
> 1. 第一阶段 `packages/game/src/shell/splash-fallback.glm-next-wave.test.ts`：I06全透明仙鹤用于隔离标题像素，但没有固定 `Math.random`，生产 `splash-fallback.ts:73/231-235` 将九只仙鹤随机放在x300–600。全部在屏外时 `:155` 的opaque=false臂不执行。相同候选/136源/11278分母，strict8279，单包只读诊断8280；LCOV仅 `155,7,1` 从0变3，定位唯一文件成立。
>    建议仅固定合法随机输入，让既有全透明仙鹤可靠进入屏内；不增加case、改标题业务断言、改产品或容忍覆盖回退。
> 2. 第二阶段 `packages/reforge/src/pal-meal-shell.test.ts:133-135` 从真实PAL目录读外部图像。本轮受保护基点1b3bffb7的[GitHub Coverage原件](https://github.com/IllegalCreed/type-pal/actions/runs/37022144308)五旧例均因gitignored `assets/migrated/faces/li-xiaoyao.png` 缺失而失败，不是作者新测试或16历史计数。
>    建议仅使外部图像IO夹具在干净CI可重建，合法完整输入、真实AssetResolver/解码器/脚本照跑；不上传真实资产、不fake业务状态或世界后门、不删/排除用例、不修改真实PAL与迁移管线。原用例明确不以这些IO空白像素当视觉oracle；正式剧情/视觉E2E不变。
>
> 四向前提：primary为上述当前源码/LCOV及GitHub失败原文；第一阶段只固定测试随机输入，不裁决机制；第二阶段只外部IO准备，不决定用户可见行为；目标为测试可重复而非提高/降低质量规则。
> 反证：若出现第二个漂移文件、非合法随机输入、核心业务或像素oracle被mock、需改产品/真实内容，则停止对应项，不扩大白名单。
>
> ## 待用户批准的范围与门
>
> 仅上述两旧test和必要专属typed IO fixture/本卡证据；其它产品/旧测/配置/基线手改/真实数据只读。不能加入ignore、skip、扩timeout、双桥或更换保护SHA。
> 批准后由Codex唯一写入者执行；先定向正反例、至少两次同范围覆盖稳定性及无ignored资产环境验证，再全仓check→官方ratchet→原main受保护strict→GitHub门，才接续O/P/Q main/done/退休。不发给GLM补例，不恢复700/85%无限队列。
>
> 并行主线已升级8efe048610fab7aa4a257a716b91ece30194eba8/content22/SAVE11。本轮报告固定在升级前21/10，不能假定所有83冻结文件仍合法。最新主线只读筛选与排重仍属原收口职责；失效旧合同剔除保留历史，不新增兼容/新例/无限返工。若需要超出这两个旧输入和原新测白名单的实现/产品取舍，再停止举证；新主线改动不得覆盖。本卡尚无build授权。
>
> ## 下一位 Agent 提示词
>
> 2026-10-03 Codex build allowed：用户批准两旧输入窄修，并按最新main有限筛选收口；唯一Owner在隔离 `codex/opq-frozen-integration-r1`，同步8efe0486，不写作者树/真实main。产品/业务断言/规则/排除/timeout不改；新main失效测试保留历史，不新增配额或旧兼容。
>
> 无下一位贡献者提示词；由Codex完成验证和收口，不转作者反复返工。
<!-- original-source-quote:end -->
