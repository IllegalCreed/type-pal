# QUALITY-TEST-INPUTS-1 — 两处旧测试输入的确定性与CI可重建性

Status: done
Closed Evidence: main d8a81d4c21a32efa3c140fb5858c83465b01bc5e; GitHub Documentation 37145486289 + Coverage 37145486286 success (2026-10-04); finite regression admission after audit, not historical quota fulfillment.
Owner: Codex（用户2026-10-03“修吧”明确授权）
Reviewer: Codex
Phase: ops / mixed
Capability: test-quality
Visual Verification Timing: N/A
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是 OPQ 冻结收口暴露的两处旧测试输入问题的窄修历史记录：第一阶段 I06 全透明仙鹤随机屏外（strict 8280→8279 拒收根因）与第二阶段外部图像 IO 在干净 CI 不可重建；下述定位与门禁均为原卡时点陈述，本次文档治理未重跑。

## 目标

仅修两处旧测试输入的确定性与 CI 可重建性，使受保护 strict 与干净 CI 不再因输入随机性/资产缺失而失败，从而接续 O/P/Q 的 main/done/可恢复退休。

## 范围

- 范围内：第一阶段 packages/game/src/shell/splash-fallback.glm-next-wave.test.ts 仅固定合法随机输入（Math.random），让既有全透明仙鹤可靠进入屏内使 `:155` opaque=false 臂可执行；第二阶段 packages/reforge/src/pal-meal-shell.test.ts:133-135 仅使外部图像 IO 夹具在干净 CI 可重建（合法完整输入、真实 AssetResolver/解码器/脚本照跑）。批准后由 Codex 唯一写入者在隔离 `codex/opq-frozen-integration-r1`（同步 8efe0486）执行。
- 范围外：增加 case、改标题业务断言、改产品、容忍覆盖回退；上传真实资产、fake 业务状态或世界后门、删/排除用例、修改真实 PAL 与迁移管线；ignore、skip、扩 timeout、双桥或更换保护 SHA；其它产品/旧测/配置/基线手改/真实数据（只读）。

## 前提与证据

I06：生产 splash-fallback.ts:73/231-235 将九只仙鹤随机放在 x300–600，全屏外时 `:155` 臂不执行；相同候选/136 源/11278 分母下 strict 8279、单包只读诊断 8280、LCOV 仅 155,7,1 从 0 变 3，定位唯一文件成立。pal-meal：受保护基点 1b3bffb7 的 GitHub Coverage 37022144308 五旧例均因 gitignored `assets/migrated/faces/li-xiaoyao.png` 缺失而失败，不是作者新测试或 16 历史计数。可证伪反例：出现第二个漂移文件、非合法随机输入、核心业务或像素 oracle 被 mock、需改产品/真实内容——停止对应项不扩大白名单。实跑与定位原件见[finite-test-intake 机账](../../../../testing/archive/legacy/batches/finite-test-intake-20261003/README.md)。
- 当前状态：done（历史终态）

## 验收

原卡验收路径：先定向正反例、至少两次同范围覆盖稳定性及无 ignored 资产环境验证，再全仓 check→官方 ratchet→原 main 受保护 strict→GitHub 门，通过才接续 O/P/Q main/done/退休。O/P/Q 固定 83 文件未改这两旧测试。以上为原卡时点安排与结果，本页未复跑。本页迁移验收：source/after SHA、quote 逆回读、模板与历史 overlay 章节、链接通过。

## 状态与交接

原卡明确不发给 GLM 补例、不恢复 700/85% 无限队列；由 Codex 完成验证和收口，不转作者反复返工。S14 本页治理只改写泛化封套，不重开、不改动两旧测试的当前状态。

## 历史范围

2026-10-03 用户“修吧”授权与 Codex build allowed；本轮报告固定在并行 main 升级（8efe0486/content22/SAVE11）前的 21/10 基点，不能假定所有 83 冻结文件仍合法。2026-10-17 R41 泛化封套，2026-10-18 S14 逐篇改写。

## 原始结论

`Status: done`：两旧输入窄修按用户授权收口；后续若需超出该两输入与原新测白名单的实现/产品取舍，按原卡停止举证。原卡全文在下方 quote 保全。

## 当时证据

LCOV 差异与 GitHub Coverage 37022144308 失败原文；[实跑与定位原件](../../../../testing/archive/legacy/batches/finite-test-intake-20261003/README.md)；O/P/Q 三卡与 83 文件并集的关系陈述。本页治理未新增任何执行。

## 当前有效性

historical。两旧输入与 83 冻结并集在后续 main 版本的当前状态由最新机账与 docs/testing/catalog.json 裁决；本页不把当时的定位/修复策略重授为当前授权，不假定 gitignored 资产策略未再变化。

## 继任文档

上游三卡见[TEST-GLM-WAVE-O-1](TEST-GLM-WAVE-O-1-supply-validation-tenfold.md)、[TEST-GLM-WAVE-P-1](TEST-GLM-WAVE-P-1-editor-residual-tenfold.md)、[TEST-GLM-WAVE-Q-1](TEST-GLM-WAVE-Q-1-runtime-residual-tenfold.md)；退役保护账见[QUALITY-OPQ-RETIREMENT-1](QUALITY-OPQ-RETIREMENT-1.md)。

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
