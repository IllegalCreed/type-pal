# CODE3l 动作规则归属与画面生命周期

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: guide-runbook-v1 / 1.0.0

## 目的

本页是 QUALITY-PRE94-RETROSPECTIVE-1 治理树内 CODE3l「动作规则归属与画面生命周期」窗口的证据索引页。窗口目标：把散在 core/coop/UI 三处的战斗动作规则收敛到 core 叶函数，并核定 BattlePresent 装配器的画面生命周期（入场清屏、跨战缓存、模态暂停）。Codex 单 Owner，分支 codex/code-quality-3y，基点 bd37e6d8，主树只读；复用上窗14份全文读域，只补UI规则归属与真实装配宿主。

## 前置条件

用户2026-10-23（call_4cdcfa14fc0b4101ad44d4f0370bdf12）批准两项修复，范围与修前红见生命周期卡 [GAME-BATTLE-PRESENT-LIFECYCLE-1.md](../../../cards/GAME-BATTLE-PRESENT-LIFECYCLE-1.md)。逐文件八维、读域与未决见 [review.json](review.json)；纯规则提取的只读逐语句证明见 [prove-rules.mjs](prove-rules.mjs)（默认运行只输出、不写文件）。父复审卡为 [QUALITY-PRE94-RETROSPECTIVE-1.md](../../../cards/QUALITY-PRE94-RETROSPECTIVE-1.md)。

## 步骤

本窗实际执行（历史时点，不据此授权新产品执行）：
- 12项读域逐项八维，8项整文件接受（7项新关闭＋present-battle.test.ts 1项旧接受刷新）；battle-system.ts、coop-magic.ts、present.ts 三个广域源与 P13 命令专测仅增量裁定，不升整文件。
- 新增 core 叶：player-condition.ts（三处重复的濒死/健康谓词按逐语句等价合并）、action-availability.ts（UI 副本动作 switch 与 core 全分支一致后收敛，未知数字 action 原返回 true 保持）。
- present-battle.ts 五项修前像素红覆盖入场、跨战消息/飘字与两类缓存；模态状态页保留同一战斗，不能按 mode 退出误清；四个缺资源整帧 oracle 改为装配器清屏后的全零（清屏 ownership 搬移，不弱化断言）。
- 实际浏览器观察：从已渲染客栈画面经 DEV 状态与真实 opcode7→bootstrap handler→BattlePresent，首帧 64,000 索引与进战前一致；三次尝试中前两次（误用测试私有 loadEvent、boot 黑帧）不授信用，原件全留。
- 集中门并发返工：默认10个 Vitest worker 嵌套 CLI Node/tsx 两次全包分别 5/10 超时；同版本以 maxWorkers=2 跑完整 83 文件 510 例通过，仅改 pal-extract 测试配置，timeout 仍 5000ms。
- 统一门：完整 check 20572 包例＋700 工具例、七包 typecheck；唯一官方采集 20143 例/777 源及同报告 ratchet／strict protected 通过；运行与硬静态 0/0/0。stdout 完整比对仅 check 的 PAL 资源测量耗时 500→463ms，四项读取计数一致（详见保全块）。
- 只读验收器 [verify.mjs](verify.mjs) 核当前指纹、完整原件、正式红绿身份与回执；完整附件按原字节分片：[receipts-1.json.gz](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-lifecycle-quality/receipts-1.json.gz)、[receipts-2.json.gz](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-lifecycle-quality/receipts-2.json.gz)、[receipts-3.json.gz](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-lifecycle-quality/receipts-3.json.gz)、[receipts-4.json.gz](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-lifecycle-quality/receipts-4.json.gz)、[receipts-5.json.gz](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-lifecycle-quality/receipts-5.json.gz)；统一门原件 [gates-1.json.gz](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-lifecycle-quality/gates-1.json.gz)。

## 失败处理

修前红、中断/超时、静态失败与首次库存未登记拒绝原件均封存于分片附件，不裁剪、不覆盖成通过；首轮终态卡误留活动看板导致 docs 拒绝已勘误移除；复用 protected 脚本的首份证明文字误留上窗 exit1 已勘误为本窗原始 exit0，两版均保留。浏览器探测前两次失败不授入场信用。

## 完成定义

2026-10-24 CODE3l 规则/生命周期收口：固定83卡 66accept/17partial/0pending；账本 3410tracked/418closed/100review/2892pending（7个新关闭路径见 review.json.closedFiles）。限制与未决：快速换战的普通剧情自然可达性尚未证明；带旧 battleState 的新游戏/读档核心语义不在本窗接受范围；battle-system/coop-magic/present/bootstrap 整文件不新增关闭；P13 整文件保留隐式 pending。本地门通过不等于集成：分支提交/推送/protected PR 与远端全日志以实际 Git 回执为准，94–102 不扩展。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4526B / SHA-256 051f7d65de2c9297ed5e2ddf7ec431efbeb23f55458b3ab49d0caa724ce3a7c8；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3l 动作规则归属与画面生命周期

Codex单Owner，同一3y，基点bd37e6d8；主树只读。复用上窗14份全文读域，只补UI规则归属与真实装配宿主。当前有限窗口已接受，发布状态以分支/PR后继回执为准。

[12项读域逐项八维、caller/primary与未决](review.json)；[纯规则提取的只读逐语句证明](prove-rules.mjs)。默认运行 `node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-lifecycle-quality/prove-rules.mjs` 只输出、不写文件。规则提取与获准画面修复分提交。

用户已批准两项修复，范围与正式修前红见[生命周期卡](../../../tasks/GAME-BATTLE-PRESENT-LIFECYCLE-1.md)。五项实际像素红覆盖入场、跨战消息/飘字和两类缓存；模态状态页保留同一战斗，不能按mode退出误清。旧reset例本来就提供数字帧，去clear反控原本能单红，保持用例；本次仅迁移方法名。四个缺资源整帧oracle改为装配器清屏后的全零，对应宿主清屏ownership搬移，不弱化断言。

实际浏览器从已渲染的客栈画面，经现有DEV状态与真实opcode7→bootstrap handler→BattlePresent，首帧64,000索引与进入前全部一致、随后逐步换入战场。仅局部接线/像素观察，不是自然剧情路线或整段战斗E2E。首次探测误用测试私有loadEvent失败；第二次尚在boot黑帧，不能授入场信用；第三次等待真实非黑世界帧后通过，原件全留。浏览器上下文与专用6175服务均已关闭。

[父复审卡](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)。完整原件、只读快速验收、统一门与最终账本计数在本窗冻结收尾写回；不扩94–102。

[默认只读验收器](verify.mjs)核当前指纹、完整原件、正式红绿身份和实际CI/浏览器回执；不重跑覆盖率，不以机械核对替代八维语义结论。附件收尾后运行。

[完整定向、修前失败、静态失败、main CI原件与浏览器附件之一](receipts-1.json.gz)、[之二](receipts-2.json.gz)按原字节封存；压缩包内有命令、exit、stderr、完整原生JSON及各次失败尝试，不裁剪成摘要。

集中门并发返工：默认10个Vitest worker再嵌套CLI Node/tsx进程，两次全包分别5/10超时；同版本以2worker跑完整83文件510例通过。仅新增pal-extract测试配置maxWorkers=2，timeout仍5000ms，测试/断言/选择和覆盖规则不变；默认全check已复验通过，官方采集也使用同一配置。

2026-10-24 CODE3l规则/生命周期收口：12项读域，8项整文件接受（7新关闭、1旧接受刷新），3个广域源与P13专测仅增量不升级。3l原七源合同接受，固定66accept/17partial/0pending；3410tracked/418closed/100review/2892pending。定向255、相邻1148；完整check 20572包例+700工具例、七包typecheck；唯一官方采集20143例/777源及同报告ratchet/strict protected通过，运行与硬静态0/0/0。规则提取与两项用户批准画面修复分提交；CLI并发上限2保留5秒与全部用例。修前/中断/超时/静态失败原件保留，不覆盖成通过。远端CI/合并另核，不扩94–102。

P13此前仅为context，本次两处reset迁移不升整文件；仅present-battle主测刷新既有接受。全仓账本7个新关闭路径见review.json.closedFiles。all-cards.md的3j滞后投影同步既有JSON接受，不再计算一次。后续仅从其余17张pre94 partial核Owner/最新main，不扩94–102。

统一门完整原件见gateReceiptParts所列附件；前两次默认并发失败、首次库存未登记拒绝及精确政策拒绝（如有）均保留。

统一门附件：[gates-1.json.gz](gates-1.json.gz)。

stdout完整比对仅check的PAL资源测量耗时500→463ms，四项读取计数完全一致；原字符串与源码锚见stdout-review.json。复用protected脚本的首份证明文字误留上窗exit1，已勘误为本窗原始exit0，生成的执行代码逐字节不变，两个版本均保留。

完整附件分片索引：[receipts-1.json.gz](receipts-1.json.gz)、[receipts-2.json.gz](receipts-2.json.gz)、[receipts-3.json.gz](receipts-3.json.gz)、[receipts-4.json.gz](receipts-4.json.gz)、[receipts-5.json.gz](receipts-5.json.gz)。单份完整官方摘要超过1MiB，按原字节分片，验收器先校验片段再重组核整件SHA；不删减原件。首轮终态卡仍留活动看板导致docs拒绝，已从活动行移除，卡/索引/父任务仍保留。
```
<!-- incremental-original-source:end -->
