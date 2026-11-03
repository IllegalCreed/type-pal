# CODE3l 结算、精灵、UI与装配器质量返工

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 QUALITY-PRE94-RETROSPECTIVE-1 治理树内 CODE3l「结算、精灵、UI与装配器质量返工」四切片（结算/精灵/UI/装配器）有限收口的证据页。Owner: Codex（单 Agent），同一 codex/code-quality-3y，基点 402128e6d，主树只读，94–102 不扩展。逐文件八维、读域、caller／primary、未决与门状态见 [review.json](review.json)；复用14份已保存且基点指纹吻合的全文读域，只补当前UI专测和具体缺口。

## 来源与输入

旧 idle 闭式算法无生产 caller，随六例专测退役；去掉无关帧号/敌方坐标实参与私有全体箭头死分支；结算和UI同合同左上 opaque 绘制提取为 blitUiFrame；染色／背景采样／fade保持各自Owner；源码修改不改变可见行为、存档或公共包接口。17个定向文件共187例中三个主测退役26个弱／重复或无产品合同例，旧→新逐身份见[contracts.json](contracts.json)。

## 断言与业务 oracle

- 测试补真实交叠、透明内点、非零idle竞争、倒下姿态、完整裁剪平面、MP八行字段、实际宿主精灵／数字／结算接线；五枚最终反控（y-sort-omitted、shift-mask、wait-arrow、settlement-mp、host-sprites）均完整文件单条 AssertionError，旧测试漏报、源恢复，首版失败原件保留。
- 相邻82文件664例与 game typecheck 完成，stdout显式default reporter、stderr为空；本地集中门完成：check 20563包例+700工具例零诊断。
- 覆盖率首次完整采集 exit1 按旧比率拒绝（正文日志无诊断）；第一次同报告策略重放又因未显式确认3条计数退役而拒绝；按既有参数确认26例退役后原 runner 同一报告 ratchet 更新基准，随后不带退役绕过参数的 protected fast 复核原 main 与三份精确身份/文件指纹 exit0。未重复采集、未改比较器或排除规则。完整日志见[receipts.json.gz](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-present-quality/receipts.json.gz)及[gates.json.gz](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-present-quality/gates.json.gz)，两包只按体积拆分，原件字节与失败记录不变。

## 结果

2026-10-23 CODE3l四片有限收口：14文件八维，12项接受（新关闭精灵源与共享blit，6项旧测试重审恢复），draw-battle-ui.ts 与 present-battle.ts 两源仍 review；固定65accept／18partial不变，3405tracked／411closed／102review／2892pending（本窗newClosed=2、恢复旧关闭6）。合并后main的Documentation39646829459／Coverage39646829440全日志零诊断、覆盖20160例／774源、annotations0。本窗提交与发布状态另按实际Git记录。

## 限制与复核

装配器真实入场清屏／跨战斗缓存生命周期仍review（presentBattleFrame先clear与intro快照之间、跨战斗清理未核实；clearFloatingNums仅直接测试caller）；UI与core的有效动作判定重复（isActionValidForDraw重复core私有规则）作为结构待核，未伪称全3l接受。drawNumber非有限上游可达性仍归旧卡，本窗不发明非法夹具。默认只读快检 `node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-present-quality/verify.mjs` 核绑定、完整附件、原生结果和反控身份，不联网或重跑覆盖率；设计结论仍依赖逐文件审查。父任务：[QUALITY-PRE94-RETROSPECTIVE-1.md](../../../cards/QUALITY-PRE94-RETROSPECTIVE-1.md)。本治理候选不重开任务、不重跑执行、不授新信用。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3184B / SHA-256 b928fd5e5a135d804f4c894a897855f2aaf579a5704dad9bf3e75c53dcff85f7；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3l 结算、精灵、UI与装配器质量返工

Owner: Codex（单 Agent）。同一 `codex/code-quality-3y`，基点402128e6d；主树只读，94–102不扩展。

[逐文件八维、读域、caller／primary、未决与门状态](review.json)。复用14份已保存且基点指纹吻合的全文读域；只补当前UI专测和具体缺口。四个相关切片代码冻结后集中大门，不逐文件重跑全仓／coverage。

旧idle算法没有生产caller，随六例专测退役；去掉无关帧号／敌方坐标实参与私有全体箭头死分支。结算和UI同合同左上opaque绘制提取为blitUiFrame；染色／背景采样／fade保持各自Owner。源码修改不改变可见行为、存档或公共包接口。

测试补真实交叠、透明内点、非零idle竞争、倒下姿态、完整裁剪平面、MP八行字段、实际宿主精灵／数字／结算接线；17个定向文件共187例，其中三个主测退役26个弱／重复或无产品合同例，旧→新逐身份见[合同映射](contracts.json)。五枚最终反控均完整文件单条AssertionError，旧测试漏报，源恢复；首版失败原件同时保留。

已完成相邻82文件664例与game typecheck，stdout显式default reporter，stderr为空；本地集中门已完成（明细见下）。合并后main的Documentation39946829459／Coverage39946829440全日志零诊断，覆盖20160例／774源，annotations0。本窗提交与发布状态另按实际Git记录。

默认只读快检：`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-present-quality/verify.mjs`。它核绑定、完整附件、原生结果和反控身份，不联网或重跑覆盖率；设计结论仍依赖上面的具体审查。完整日志见[定向与反控原件](receipts.json.gz)及[集中门原件](gates.json.gz)。两包只按体积拆分，原件字节与失败记录不变。

装配器真实入场清屏／跨战斗缓存生命周期仍review；UI与core的有效动作判定重复作为结构待核，未伪称全3l接受。父任务：[QUALITY-PRE94-RETROSPECTIVE-1](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)。

2026-10-23 CODE3l四片有限收口：14文件八维，12项接受（新关闭精灵源与共享blit，6项旧测试重审恢复），UI规则重复与装配器生命周期仍review；固定65accept／18partial不变。3405tracked／411closed／102review／2892pending。相邻82文件664例，全check20563包例+700工具例、game typecheck；唯一官方采集20134例／775源，按用户授权精确重算game branches/functions并登记26例退役，同报告ratchet／严格protected通过。运行与静态零诊断，原始拒绝／错误断言原件保留；本地有限窗完成，远端检查与合并另核。

覆盖率首次完整采集exit1按旧比例拒绝，正文日志无诊断；第一次同报告策略重放另因未显式确认3条计数退役而拒绝。原件全部保留。按既有参数确认已核26例退役后，原runner同一报告ratchet更新基准；随后不带退役绕过参数的protected fast复核原main与三份精确身份/文件指纹，exit0。未重复采集、未改比较器或排除规则。
```
<!-- incremental-original-source:end -->
