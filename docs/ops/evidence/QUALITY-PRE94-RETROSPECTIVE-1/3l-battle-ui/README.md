# CODE3l 战斗 UI 复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: audit-report-v1 / 1.0.0

## 审计问题

CODE-QUALITY-3l的draw-battle-ui.ts(825行)完整复审切片(基点e203872e4,0 behind/196 ahead):逐段读取全部门控与绘制分支——对话/逃跑/自动战斗早退、InfoBox/头像毒色、主图标合法性、目标箭头、misc/magic/item网格、MP/数量/说明文本、CLASSIC全体目标过渡。

## 范围与证据

完整读取主测试(719行)、leaves测试(139行)与像素宿主测试(477行),覆盖真实framebuffer sentinel、状态门、party-slot poison key、MP/数量/说明、箭头锚点、禁用色、法术/物品分页、阴影和缺frame降级;按范围读present-battle.ts UI caller(300-330)、player-poison-state.ts全139行party-slot mapper,以及uibattle.c五段/magicmenu.c/itemmenu.c primary区间。

## 发现

实现与uibattle.c CLASSIC分支一致:对话/逃跑/自动战斗不画UI,selectTargetEnemy不画主图标且由sprite层高亮,selectTargetPlayer用箭头,PlayerAll/EnemyAll不画多余箭头;信息框只在真实selection turn出现;头像毒色按统一party-slot mapper扫16槽并忽略level大于3,死亡强制mono;合击健康阈值、沉默/傀儡、MP/数量/说明布局、物品框阴影与资源缺失fallback均有直接oracle。未发现可证伪实现缺陷,未改UI形态或公共接口。共享drawNumber正Infinity风险仍在3k ledger review,本片无新增非有限数字到达生产路径证据;3l七文件至此均有局部逐文件证据,但整卡统一门与完整装配器不宣称通过。

## 结论

定向3 files/51 tests passed、game typecheck passed、无stderr;按用户成本约束未运行coverage/official ratchet/protected fast/全仓check;3l整卡仍partial。

## 整改与复核

未重跑;无浏览器视觉/E2E。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1955B / SHA-256 7373cb0ed8d3c661d7b2a71b13c59b953f6c7f9f41ad21e994a85d9808c886f6；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3l 战斗 UI 复审切片

基点：`e203872e4`；分支：`codex/code-quality-3y`，相对 `origin/main` 为 `0 behind / 196 ahead`。本片完整核 `draw-battle-ui.ts` 和三份直接测试；按范围读取 `present-battle.ts` UI caller、`player-poison-state.ts` party-slot mapper，以及 `uibattle.c`、`magicmenu.c`、`itemmenu.c` primary。3l 整卡仍 `partial`。

## 逐文件与真值边界

逐段读取 UI 实现的所有门控和绘制分支：对话/逃跑/自动战斗早退、InfoBox/头像毒色、主图标合法性、目标箭头、misc/magic/item 网格、MP/数量/说明文本、CLASSIC 全体目标过渡。完整读取主测试、leaves 测试和像素宿主测试；它们覆盖真实 framebuffer sentinel、状态门、party-slot poison key、MP/数量/说明、箭头锚点、禁用色、法术/物品分页、阴影和缺 frame 降级。

## 判别力与结论

实现与 `uibattle.c` 的 CLASSIC 分支一致：对话/逃跑/自动战斗不画 UI，selectTargetEnemy 不画主图标且由 sprite 层高亮，selectTargetPlayer 使用箭头，PlayerAll/EnemyAll 不画多余箭头；信息框只在真实 selection turn 出现。头像毒色按统一 party-slot mapper 扫 16 槽并忽略 level>3，死亡强制 mono；合击健康阈值、沉默/傀儡、MP/数量/说明布局、物品框阴影和资源缺失 fallback 均有直接 oracle。未发现可证伪的实现缺陷，也没有改变 UI 形态或公共接口。

共享 `drawNumber` 正 Infinity 风险仍在 3k ledger 作为 review；本片没有新增非有限数字到达生产路径的证据。3l 七文件当前均有局部逐文件证据，但整卡统一门与完整装配器仍不宣称通过。

## 验证

定向 `3 files / 51 tests passed`，`pnpm --filter @type-pal/game typecheck` passed，无测试 stderr。按用户成本约束，本片未运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`；3l 整卡仍 partial。

```
<!-- incremental-original-source:end -->
