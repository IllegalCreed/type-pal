# Kimi 战斗精灵真实工作流治理

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 QUALITY-EDITOR-DIAGNOSTICS-4(Kimi 战斗精灵真实工作流治理)的证据目录页,任务卡见 [QUALITY-EDITOR-DIAGNOSTICS-4.md](../../tasks/QUALITY-EDITOR-DIAGNOSTICS-4.md)。任务范围两份测试源码:BattleSpriteLibrary.kimi-workflows.test.tsx(K01 六例,先完整保留)与 battle-sprite-fixtures.ts(仅头注明确允许编辑器测试复用,不改实现);Codex 单一 Owner。当前 build,完整门与独立验收未完成,0 关闭;旧十二组历史 accept 不追溯改写。

## 来源与输入

基线 baseline.json(6/6 但 398 条 unwrappedAct)→ lifecycle.json(复用 C02 真实宿主/IO 等待/撤销/提交,去重复 Harness 与轮询内点击、空 Promise 后 6/6、0skip/0 诊断)→ precision.json(oracle 修正后 6/6、0 诊断;六例名称/数量未变,身份见 identity-proof.json,读取边界见 read-boundaries.json)。反控:oracle-proof.json(三枚生产 mutant)与清理后独立核验 oracle-rebuild.json。相邻 adjacent.json(11 文件 90 例 0skip/0 诊断);支持门 support-gates.json(editor typecheck+coverage 工具 65/65)与 checkpoint-gates.json(docs/lint/ledger)。

## 断言与业务 oracle

文档事实核对(currentExecution=false):关键判据是新旧判别力对照——旧六例(6b0b961)在 isInteger→isFinite 与复用 AssetId 漂移两枚 mutant 下仍全绿(且自带 398 act),新六例(a5822f36)在整数守卫放宽、AssetId 漂移、缩帧 repairs 清空三枚 mutant 下各恰一指定 AssertionError(拖放/追加帧/删帧例分别红);三次红与恢复 6 绿均 0 诊断,临时工作区清理后从生产字节独立重构 mutant 并核 raw/runner SHA,工作树生产文件未改。空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

治理结果=证据保全完整、反控链可独立复验;不产生新执行结果。本片仅检查点:完整 check/ratchet/protected 未在本候选运行(support-gates/checkpoint-gates 明文 not run/pending),稳定资源工作流窗口联合实测与严格统一诊断门未通过的结论在 [window-review.md](../QUALITY-EDITOR-FORM-FIXTURES-1/window-review.md);0 关闭、不合 main,不拿上一候选的全门给本片盖章。

## 限制与复核

未重跑任何命令;未知跨文件重复、宿主历史 pending 导航及故障清理 fault injection 仍待核,不关闭文件。历史结论保持原时点;候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1817B / SHA-256 2c08a0a0fc60add5fbc21bef350e77a22712c46e4064a160533666ba0aca5a6c；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# Kimi 战斗精灵真实工作流治理

任务：[QUALITY-EDITOR-DIAGNOSTICS-4](../../tasks/QUALITY-EDITOR-DIAGNOSTICS-4.md)。
两份测试源码，Codex单一Owner；六例先完整保留，真实完成信号、合法输入、oracle与重复分别核。
当前build，完整门与独立验收未完成，0关闭。旧十二组历史accept不追溯改写。

检查点：基线完整6例398条act；复用C02真实宿主/IO等待/撤销/提交，去重复Harness与轮询内点击、空Promise，6例0skip/0诊断。夹具仅头注明确允许编辑器测试复用，不改实现。

oracle修正：不再覆盖prepare的asset/record来“证明复用”；直接断言真实返回并原样dispatch。DnD在既有用例加1.5，区分isInteger与isFinite；替换帧明确证明期望像素不同于原帧。完成信号之后的可同步断言直接执行，避免轮询遮住错误。六例名称/数量未变，未退役。

隔离三枚反控：整数守卫放宽、复用AssetId漂移，旧六例仍全绿而现六例各恰一指定AssertionError；缩帧repairs清空后现删除例恰一AssertionError。每次完整跑六例，0skip；新例的三次红与恢复6绿均0诊断。临时工作区清理后独立split重构mutant并核raw/runner字节SHA，见oracle-rebuild.json。工作树生产文件未改。

相邻11文件90例0skip/0诊断，editor typecheck与coverage工具65/65通过。仅检查点，完整check/ratchet/protected待稳定资源工作流窗口共跑；不拿上一候选的全门给本片盖章。未知跨文件重复、宿主历史pending导航及故障清理仍待核；不关闭文件。

稳定窗口已实测，严格统一诊断门仍未通过；见[联合原始计数与边界](../QUALITY-EDITOR-FORM-FIXTURES-1/window-review.md)。本片留review，0关闭、不合main。
```
<!-- incremental-original-source:end -->
