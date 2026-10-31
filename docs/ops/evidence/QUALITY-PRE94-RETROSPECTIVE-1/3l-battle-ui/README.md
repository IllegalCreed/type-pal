# CODE3l 战斗 UI 复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

原审计「CODE3l 战斗 UI 复审切片」的主题按原文时点保留(摘录:基点：`e203872e4`；分支：`codex/code-quality-3y`，相对 `origin/main` 为 `0 behind / 196 ahead`。本片完整核)。

## 范围与证据

原报告含章节[CODE3l 战斗 UI 复审切片、逐文件与真值边界、判别力与结论、验证]、0个链接;固定main源1955B(SHA 7373cb0ed8d3)。当前存活入口:无当前仓库内存活链接。

## 发现

原文发现/计数/日期按原时点保留在保全块;本页不重算审计结论。

## 结论

原结论保持原时点;治理不改写审计判定,不撤销旧撤信,不恢复旧完成声明。

## 整改与复核

本治理候选仅覆盖文档角色与保全;整改事实以原文与后继卡为准;候选待Owner接收。


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
