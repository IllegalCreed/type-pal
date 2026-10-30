# C2 装备脚本负输入诊断回执

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「C2 装备脚本负输入诊断回执」的治理候选页;证据原件即下方逐字节保全的固定main源(2188B,SHA a1da34918dc9)。

## 来源与输入

来源为固定Git载体,非本次运行;原0个链接处置见作者review的linkDisposition。当前存活入口:无当前仓库内存活链接。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


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
