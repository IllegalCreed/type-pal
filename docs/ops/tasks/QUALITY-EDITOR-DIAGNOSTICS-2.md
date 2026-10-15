# QUALITY-EDITOR-DIAGNOSTICS-2 — C02 宿主与删除生命周期

Status: review
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

## oracle与精简支持范围（build allowed）

生命周期检查点51efbc1ff已推送。G04-03改为合法未保存blob输入，G04-07精确核真实sha错误与零污染。
G04-04磁盘删除→undo的全部record/blob SHA/目录/真实解码/保存门断言并入G04-05 undo/redo；
3帧与4帧在此删除/撤销路径没有不同分支，二者同为authored未使用磁盘源，不构成独立输入轴。
G04-05另外证明redo重新删除已恢复blob；G04-03保留初始pending-blob域。未知外部重叠不删。
必要支持白名单：scripts/coverage/approved-test-retirements.mjs仅新增本文件精确10→9快照，
其测试仅更新固定账本数量；判据、拒绝测试、扫描/规则不变。官方baseline仅由ratchet生成。

## 作者自验检查点

51efbc1ff生命周期已推送；最终9例0诊断，两个强弱oracle反控有效，精确临时树已移除。
仅作者自验，未冒称独立accept；当前review等集中完整门。0文件关闭，3284/229closed/51review/3004pending。
用户后续明确要求把94、95、97–102已发现问题全部修妥；当前卡属于全仓诊断阻塞，原产品停止线保持。
