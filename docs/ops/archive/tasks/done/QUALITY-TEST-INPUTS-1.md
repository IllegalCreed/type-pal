# QUALITY-TEST-INPUTS-1 — 两处旧测试输入的确定性与CI可重建性

Status: done
Closed Evidence: main d8a81d4c21a32efa3c140fb5858c83465b01bc5e; GitHub Documentation 37145486289 + Coverage 37145486286 success (2026-10-04); finite regression admission after audit, not historical quota fulfillment.
Owner: Codex（用户2026-10-03“修吧”明确授权）
Reviewer: Codex
Phase: ops / mixed
Capability: test-quality
Visual Verification Timing: N/A

## 前提与有限建议

[实跑与定位原件](../../../../testing/finite-test-intake-20261003/README.md)；O/P/Q固定83文件未改这两个旧测试。

1. 第一阶段 `packages/game/src/shell/splash-fallback.glm-next-wave.test.ts`：I06全透明仙鹤用于隔离标题像素，但没有固定 `Math.random`，生产 `splash-fallback.ts:73/231-235` 将九只仙鹤随机放在x300–600。全部在屏外时 `:155` 的opaque=false臂不执行。相同候选/136源/11278分母，strict8279，单包只读诊断8280；LCOV仅 `155,7,1` 从0变3，定位唯一文件成立。
   建议仅固定合法随机输入，让既有全透明仙鹤可靠进入屏内；不增加case、改标题业务断言、改产品或容忍覆盖回退。
2. 第二阶段 `packages/reforge/src/pal-meal-shell.test.ts:133-135` 从真实PAL目录读外部图像。本轮受保护基点1b3bffb7的[GitHub Coverage原件](https://github.com/IllegalCreed/type-pal/actions/runs/37022144308)五旧例均因gitignored `assets/migrated/faces/li-xiaoyao.png` 缺失而失败，不是作者新测试或16历史计数。
   建议仅使外部图像IO夹具在干净CI可重建，合法完整输入、真实AssetResolver/解码器/脚本照跑；不上传真实资产、不fake业务状态或世界后门、不删/排除用例、不修改真实PAL与迁移管线。原用例明确不以这些IO空白像素当视觉oracle；正式剧情/视觉E2E不变。

四向前提：primary为上述当前源码/LCOV及GitHub失败原文；第一阶段只固定测试随机输入，不裁决机制；第二阶段只外部IO准备，不决定用户可见行为；目标为测试可重复而非提高/降低质量规则。
反证：若出现第二个漂移文件、非合法随机输入、核心业务或像素oracle被mock、需改产品/真实内容，则停止对应项，不扩大白名单。

## 待用户批准的范围与门

仅上述两旧test和必要专属typed IO fixture/本卡证据；其它产品/旧测/配置/基线手改/真实数据只读。不能加入ignore、skip、扩timeout、双桥或更换保护SHA。
批准后由Codex唯一写入者执行；先定向正反例、至少两次同范围覆盖稳定性及无ignored资产环境验证，再全仓check→官方ratchet→原main受保护strict→GitHub门，才接续O/P/Q main/done/退休。不发给GLM补例，不恢复700/85%无限队列。

并行主线已升级8efe048610fab7aa4a257a716b91ece30194eba8/content22/SAVE11。本轮报告固定在升级前21/10，不能假定所有83冻结文件仍合法。最新主线只读筛选与排重仍属原收口职责；失效旧合同剔除保留历史，不新增兼容/新例/无限返工。若需要超出这两个旧输入和原新测白名单的实现/产品取舍，再停止举证；新主线改动不得覆盖。本卡尚无build授权。

## 下一位 Agent 提示词

2026-10-03 Codex build allowed：用户批准两旧输入窄修，并按最新main有限筛选收口；唯一Owner在隔离 `codex/opq-frozen-integration-r1`，同步8efe0486，不写作者树/真实main。产品/业务断言/规则/排除/timeout不改；新main失效测试保留历史，不新增配额或旧兼容。

无下一位贡献者提示词；由Codex完成验证和收口，不转作者反复返工。
