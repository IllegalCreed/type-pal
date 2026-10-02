# QUALITY-TEST-INPUTS-1 — 两处旧测试输入的确定性与CI可重建性

Status: draft
Owner: Codex（尚未获得本卡实现授权）
Reviewer: Codex
Phase: ops / mixed
Capability: test-quality
Visual Verification Timing: N/A

## 前提与有限建议

[实跑与定位原件](../../testing/glm-tenfold-triple/closure-20261003/retirement.json)；O/P/Q固定83文件未改这两个旧测试。

1. 第一阶段 `packages/game/src/shell/splash-fallback.glm-next-wave.test.ts`：I06全透明仙鹤用于隔离标题像素，但没有固定 `Math.random`，生产 `splash-fallback.ts:73/231-235` 将九只仙鹤随机放在x300–600。全部在屏外时 `:155` 的opaque=false臂不执行。相同候选/136源/11278分母，strict8279，单包只读诊断8280；LCOV仅 `155,7,1` 从0变3，定位唯一文件成立。
   建议仅固定合法随机输入，让既有全透明仙鹤可靠进入屏内；不增加case、改标题业务断言、改产品或容忍覆盖回退。
2. 第二阶段 `packages/reforge/src/pal-meal-shell.test.ts:133-135` 从真实PAL目录读外部图像。当前main的[GitHub Coverage原件](https://github.com/IllegalCreed/type-pal/actions/runs/37022144308)五旧例均因gitignored `assets/migrated/faces/li-xiaoyao.png` 缺失而失败，不是作者新测试或16历史计数。
   建议仅使外部图像IO夹具在干净CI可重建，合法完整输入、真实AssetResolver/解码器/脚本照跑；不上传真实资产、不fake业务状态或世界后门、不删/排除用例、不修改真实PAL与迁移管线。原用例明确不以这些IO空白像素当视觉oracle；正式剧情/视觉E2E不变。

四向前提：primary为上述当前源码/LCOV及GitHub失败原文；第一阶段只固定测试随机输入，不裁决机制；第二阶段只外部IO准备，不决定用户可见行为；目标为测试可重复而非提高/降低质量规则。
反证：若出现第二个漂移文件、非合法随机输入、核心业务或像素oracle被mock、需改产品/真实内容，则停止对应项，不扩大白名单。

## 待用户批准的范围与门

仅上述两旧test和必要专属typed IO fixture/本卡证据；其它产品/旧测/配置/基线手改/真实数据只读。不能加入ignore、skip、扩timeout、双桥或更换保护SHA。
批准后由Codex唯一写入者执行；先定向正反例、至少两次同范围覆盖稳定性及无ignored资产环境验证，再全仓check→官方ratchet→原main受保护strict→GitHub门，才接续O/P/Q main/done/退休。不发给GLM补例，不恢复700/85%无限队列。

## 下一位 Agent 提示词

无下一位贡献者提示词；用户尚未批准本卡build，不得开始两旧测试实现或标done。
