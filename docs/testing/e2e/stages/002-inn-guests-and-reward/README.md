# E2E-002 · 客栈住客与赏银

Status: verified
Owner: Codex
Last reviewed: 2026-10-16
Template: test-e2e-stage-v1 / 1.0.0

本页是 e2e-002 的稳定入口。`verified`、原 lastVerified/reviewBy 只投影 catalog 的出版记录；本次日期仅指静态文档核读。候选正文由 history_cards_a 编写，待非作者接收；本轮没有重新执行游戏或更新测试状态。

## 入口与前置

依赖同引擎真实、passed 的 001 结束 checkpoint：正式恢复后正常经过 s001/e3 门及 s003 默认入口，再靠近首个 e56。公开 caller 为 `pnpm e2e:002`、`:reforge`、`:both`，入口分别调用同一 `runInnJourney` 的对应引擎；这里列来源，不授执行许可。禁止旧 SAVE9/10 档升级冒当前前驱、错引擎、capture 或跳场景替代路线；当前已核窄源码要求 Reforge content22/SAVE12，不把旧报告的 content21/SAVE9、SAVE10 或 d022 的22/11改写为当前实跑。

## 当前结论

查看[正式报告的分轮结果](report.md#results)：002 的20行正文、一次500赏银、三人进房及正式恢复分别有原批证据，首轮观测失败和门恢复失败也保留。10月8日旧35/35反例及局部离线0finding不能覆盖后来发现的完整链漏针；完整执行链/基础设施收口信用已撤。10月11日新固定批次另取连续任务卡结论，不倒签旧轮。

10月1日“只当前受控主角透视、用户体验pending、未集成”的反馈段已由10月2日队伍局部透视/NPC普通遮挡技术收口继任；不恢复旧产品选择、不补用户逐项体验签名。这里的出版verified不代用户观感、capture、完整Q1/Q2或006的既有rework。

## 证据与状态

原元数据与正式报告入口逐字节保留如下；Owner Codex 是原登记责任，旧日期不因治理续期。

```yaml
id: e2e-002
status: verified
phase: [phase1, phase2]
engines: [game, reforge]
owner: Codex
lastVerified: 2026-10-02
reviewBy: 2026-11-02
dependsOn: [e2e-001]
tags: [story, inn, dialogue, script-governance, checkpoint]
canonicalReport: report.md
```

正式报告：[report.md](report.md)。内部 `s003/e56` 仅作为 `sourceRefs` 和稳定实体 ID；历史 SAVE/旧 revision 只作历史证据，不自动成为当前前驱。

配对机器证据为[002 evidence](../../evidence/e2e-002.json)：原16键 `document-audit`、source-backed、runtimeExecution.performed=false、artifacts=[]，只记原 d022/content22/SAVE11 的来源/出版审计。本轮不改其字段或 sourceRefs，也不把它称为一次执行回执。

业务核对范围：20行 TextId25..53（下一激活的dlg54排除）；谢赏50之后、提示51之前实际0→500且仅一次；三苗人起步→接管暂停→释放续走→入房隐藏/替身可见；控制恢复、结束档与fresh context持久世界/Canvas。原raw、截图、trace和存档目前字节/可用性、存储Owner及保留保证未在本包核验，原指针由报告留史。

## 依赖与历史

`dependsOn=e2e-001`，002结束于首次20行/一次赏银、三人进房和控制/保存恢复，后继[003厨房](../003-kitchen/README.md)另核；不能以终点或重复计数替代中途编排。20行、三人和一次奖励不是多个新执行；旧57/56/71工具、10648/10655/10658包测试、35/35反例均按各轮排重，不加总为本次测试。

后继事实权：[反馈卡10月2日收口](../../../../ops/archive/tasks/done/E2E-002-FEEDBACK-1-player-occlusion-and-held-input.md#2026-10-02清账收口当前结论)、[连续卡10月8日撤信](../../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md#2026-10-08-前批结果历史完整执行链结论被上述反例推翻)与[10月11日新批次](../../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md#2026-10-11-最终重录与headed验收accept)。更新必须回到本路径和原配对资料，不能另造平行报告；完整原16行可由回执span拼接或固定5a Git blob恢复。下一步是本两篇canonical pilot的独立全文接收；未接收不计迁移，不启动旧runner/原始资源或下一段。
