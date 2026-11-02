# C2 装备脚本负输入诊断回执

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是game运行时诊断任务[QUALITY-GAME-RUNTIME-DIAGNOSTICS-1.md](../../../cards/QUALITY-GAME-RUNTIME-DIAGNOSTICS-1.md)C2切片(装备脚本负输入)的证据回执页;原件为同目录JSON回执,原文本逐字节保全于下方保全块。切片只处理game初始17块stderr中两个同域测试:e2-equipment-effects.test.ts与e4-run-equip-script.test.ts。Codex完整读取两测试、equip-effect.ts、equipment-state.ts、stats-test-fixtures.ts并对照相邻equipment-state.glm-next-wave.test.ts、equip-effect.test.ts、event-system.ts真实入口。

## 来源与输入

两个警告分别来自合法负输入:未知equipment row 999与未注册L_99999。writeEquipmentEffectField与runEquipScriptSync的fail-safe warning是业务oracle,保留生产日志;测试用vi.spyOn(console,'warn')在自身生命周期内捕获并精确断言,finally恢复spy,共享console.warn无全局静音。[red.json](red.json):同一生产源(SHA 97bebc1b)配两份未改测试(从基点恢复),8/8通过但输出2个stderr warning block——直接证明退出码0与诊断清零是两个独立合同。[green.json](green.json):实现显式oracle后的两份测试,8/8通过、0 pending、0 stderr block;sourceSha256与red完全相同,唯一变化是测试oracle,不改生产实现、公共接口、状态ownership、资源或schema/save。

## 断言与业务 oracle

定向两文件8/8、0 stderr;game typecheck通过;相邻装备/跨模块6文件66 tests通过、0 stderr。[full-game.json](full-game.json):完整game包321 files/3612 tests通过、exit0,但仍有15块stderr——两个装备warning block已消失,剩余15块头部清单(avi-player、rng-window、event-system、scene-system、precache-client、magic-script、battle-system、mode等)逐一列名且明示not yet semantically accepted。

## 结果

两份测试文件在账本登记为review,本批未改成已验证;不关闭生产文件,剩余15块stderr与editor运行时诊断仍待逐文件核验。相邻装备测试与game typecheck通过是本批收口前置;全仓pnpm check过,official ratchet与protected fast被shared/pal-extract基线回退拒绝(coverage tools 75/75),coverage baseline不修改。

## 限制与复核

未重跑任何命令;完整raw与Vitest JSON runner按原文存于gzip回执(不在本固定源树内)。第一阶段机制、公共接口、schema/save、资源或用户可见行为风险立即停线另卡。本页为治理候选正文重写,候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2188B / SHA-256 a1da34918dc976d75ed1426d1e3d8ad6b669df36f37b31d023f9c86c01854bda；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# C2 装备脚本负输入诊断回执

本切片只处理 game 初始 17 块 stderr 中两个同域测试：

- `packages/game/src/core/__tests__/stats/e2-equipment-effects.test.ts`
- `packages/game/src/core/__tests__/stats/e4-run-equip-script.test.ts`

Codex 完整读取两测试、`packages/game/src/core/equip-effect.ts`、`packages/game/src/core/equipment-state.ts`、`packages/game/src/core/__tests__/stats/stats-test-fixtures.ts`，并对照相邻 `equipment-state.glm-next-wave.test.ts`、`equip-effect.test.ts`、`event-system.ts` 的真实入口。两个警告分别来自合法负输入：未知 equipment row 999 与未注册 `L_99999`。`writeEquipmentEffectField` 和 `runEquipScriptSync` 的 fail-safe warning 是业务 oracle，保留生产日志；测试在自身生命周期内捕获并精确断言，finally 恢复 spy。

## Before / after

`red.json` 使用当前生产源配合两份未改测试（从本批基点恢复），两文件 8/8 通过但输出 2 个 `stderr |` warning block；这证明退出码 0 与诊断清零是两个独立合同。完整 raw 与 Vitest JSON runner 保存在 gzip 回执中。

`green.json` 使用实现后的两份测试，8/8 通过、0 pending、0 stderr block；唯一变化是测试 oracle，不改生产实现、公共接口、状态 ownership、资源或 schema/save。共享 `console.warn` 没有全局静音，未知 row/label 的精确消息仍被断言。

定向两文件运行：8/8 通过、0 stderr；game typecheck 通过；相邻装备/跨模块 6 文件 66 tests 通过、0 stderr。两份文件在账本中登记为 `review`，本批没有把测试文件改成 `已验证`，因为剩余 game 诊断和统一 coverage 门仍未收口。

## 本批质量边界

本批未关闭生产文件；只把两测试留在当前诊断切片，剩余 15 块 stderr 与 editor 运行时诊断仍待逐文件核验。相邻装备测试和 game typecheck 必须通过后才可记录本批收口；全仓 `pnpm check`、official ratchet、protected fast 在稳定窗口集中执行，coverage baseline 不修改。发现第一阶段机制、公共接口、schema/save、资源或用户可见行为风险时立即停线另卡。
```
<!-- incremental-original-source:end -->
