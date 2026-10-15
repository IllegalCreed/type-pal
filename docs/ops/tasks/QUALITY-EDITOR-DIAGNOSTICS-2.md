# QUALITY-EDITOR-DIAGNOSTICS-2 — C02 宿主与删除生命周期

Status: build
Owner: Codex
Reviewer: Codex（作者自验，不冒称独立验收）
Phase: phase2
Capability: editor test lifecycle correctness
Visual Verification Timing: N/A（仅测试调度、oracle 与注释，不改产品）

## 准入与独占范围

用户2026-10-15明确要求继续BattleSpriteLibrary C02；单一Coding Owner=Codex。
已fetch最新origin/main=f98d0ddd8，隔离分支codex/quality-menu-accept-94-95，0behind/30ahead。
主工作树和GLM工作树只读。机器3284/229closed/48review/3007pending。

本片仅三文件：

- `packages/editor/src/__tests__/cursor-asset-r1/battle-sprite-harness.tsx`
- `packages/editor/src/__tests__/cursor-asset-r1/battle-sprite-ui.ts`
- `packages/editor/src/ui/BattleSpriteLibrary.c02-g04.cursor-r1.test.tsx`

三份均已全文读取；生产BattleSpriteLibrary.tsx1793行、BattleSpriteInlinePreview.tsx全文、
typed battle-sprite-fixtures、reader、kit已读；cache/色表、session/命令按调用段核验，不据此关闭依赖文件。
不修改生产、schema/save、资产管线或UI；新发现高风险另卡，不借测试授权实现。

## 前提与反证

| 方向 | 证据与目标 |
|---|---|
| Primary | React官方[act](https://react.dev/reference/react/act)：等待真实渲染/交互/异步更新，保持环境检查启用。 |
| 第一阶段 | N/A；二阶段编辑器测试，无游戏机制改变。 |
| 第二阶段 | BattleSpriteInlinePreview.tsx:184-238，私有BattleSpriteAssetCache.load与色表Promise.all后回传proof；BattleSpriteLibrary.tsx:698-731真实删除校验/dispatch/受控焦点。 |
| 目标 | 只观察实际cache调用返回的Promise，不替换核心、不另造decode；实际异步删除提交在act域内等待，DOM完成后断言。 |

最强替代解释：删除后的焦点effect/重绑，而非首次挂载，占主要告警。先只修宿主做消融，再修驱动与G04等待。
若等待实际资源不减少挂载告警，撤回该根因解释；若oracle mutant仍绿，不记有效判别力。
定制source可能有意挂起；默认保留其pending语义，显式等待由caller控制。spy仅透传观察，卸载/失败须恢复。
Codex：premise verified / design agree，build allowed，仅上述白名单。

## 验收与交接

保留原定向原件；逐合同审G04十例与相邻G05/registry，未证重复不删。
定向与相邻回归、editor typecheck后提交推送检查点；稳定模块窗口集中跑check、官方ratchet、protected fast、lint-zero、ledger。
error/warning/info或React/jsdom真实诊断非零不合main；不按全绿增加closed。
证据入口：[本片](../evidence/QUALITY-EDITOR-DIAGNOSTICS-2/README.md)。
无下一位Agent提示词，Codex继续本片。
