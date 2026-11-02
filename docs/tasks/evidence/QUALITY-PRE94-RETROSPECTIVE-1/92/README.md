# CODE92工程门与历史证据复审

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 QUALITY-PRE94-RETROSPECTIVE-1 中 CODE92(工程门与历史证据)的复审回执,归 [QUALITY-PRE94-RETROSPECTIVE-1.md](../../../cards/QUALITY-PRE94-RETROSPECTIVE-1.md):当前 8b1213805/main=f98d0ddd8、0behind/137ahead,单 Agent,未改产品/测试/规则/基线;CODE92 当前 partial,0 新增关闭。原件逐字节保全于下方保全块。

## 来源与输入

完整读取原 CODE92 卡、README、affected-files 与 30 行 source-snapshot-comparison 原件;读取当前根 package.json caller 及 coverage/run.mjs 全文 567 行、classifier/测试、scope audit/测试、metrics/测试、config、environment 全文;逐源行数/SHA 与回执 hash 见 [read-and-receipts.json](read-and-receipts.json)。approved-test-retirements、full-inputs 等依赖本片只沿既有锚点,不借此签它们整文件 accept;30 个菜单文件本片只做字节比对,没有冒充源码全文语义复验。primary 为根脚本和真实 coverage CLI:check:fast 执行 typecheck/test,coverage:fast 经 run.mjs;protectedRef 仅从 TYPE_PAL_COVERAGE_BASE_REF 读取并调用 Git 目标 baseline 比较;classifier 只在目标没有 baseline 且没有 coverage config 时允许 bootstrap,已有 config 而缺 baseline 抛错;metrics 用整数分数比较每包与全仓,scope audit 分别报告源码、测试数量/identity 与执行配置变化。

## 断言与业务 oracle

本轮核实:其一,历史失败回执 raw SHA/18252 字节与 exit1 一致,真实失败在保护范围缺 RNG 测试;历史后续回执 SHA/18118 字节与 exit0 一致,731 源/19870 测试、相对当时 baseline 无回退;两原件均没有 act/环境/navigation 诊断命中——这是历史事实,不是当前门通过。其二,原卡 done 段仍写'全仓check后补写',但同一收口 commit f52a10e40 已实际提交 CODE90/gate-check-after-boundary.txt 和 exit0;本轮逐字节核其与该 commit 一致,记录 lint4041、0/0/0;不能从文案未补推出当时没有执行。其三,旧'30/30 源码一致'仅适用于旧快照:本轮重新 git show 各 closureCommit 与当前文件比对为 20 相同/10 变化,明细见 [current-source-comparison.json](current-source-comparison.json);全部 30 项当前 ledger 已为 review,本片不重复撤回或恢复关闭;20 字节相同也不能替代本轮语义/新门。其四,旧 rawCombinedOutput 没有结构化环境对象;单独成功终端输出不能独立分辨普通 fast 与 protected fast,原卡命令与前一失败可支持历史追踪,不能冒充完整环境回执;后续当前真实门必须保存确切命令、环境白名单、ref 解析、baseline SHA、exit/signal 与完整 stdout/stderr。测试质量:classifier 的 bootstrap/compare/fail-closed 三合同;scope 变化/删除/测试减少;metrics 合法计数、聚合、精确回退与跨包不能掩盖等直接 oracle 已读;定向真实 Node 测试 10/10,全部 coverage-tools 相邻 67/67(0fail/0skip/0cancelled),结果见 [tests.json](tests.json) 及 raw.gz——这不是运行官方 ratchet/protected;测试量/包绿不能复签 83-91 的菜单文件。

## 结果

本片无实现变更,TypeScript 门 N/A;全仓 check、官方 ratchet、protected fast 仍待稳定窗口,editor 诊断未清,禁止合 main;没有新增 ignore/exclude/强转或静音,没有改生成物或机制。当前机器 3287/222closed/201review/2864pending,0 新关闭。当前检查点静态门 [gates.md](gates.md):docs、lint-zero(4379 文件 0/0/0)、ledger 与 diff-check 已通过;报告新增后补链并再核 docs;不是新全仓质量门。2026-10-22 工程纠错原合同收口:[closeout.json](closeout.json)(八维/命令与门归属)、[current-source-comparison-20261022.json](current-source-comparison-20261022.json)(30 源码当前 Git 比对)、[verify-closeout.mjs](../3c/verify-closeout.mjs)(只读快检)。本次实际 8 同/22 变,旧 20/10 保留历史;不修改 30 路径状态;固定 31 保护的当前官方单次采集及同报告 strict/protected、全 check 和最终 game 增量真实原件在当前 gate 包,工程记录复用,不声称新跑或推补旧环境。CODE92 按其记录/门纠错范围接受,源码的八维/关闭仍归各卡;未将 30 个字节比对当语义验收。

## 限制与复核

下一个有限片回到 CODE1 shared RLE 模块,按真实 caller/primary/测试逐文件复核,94-102/editor 原返工保留;当前模块的文档静态/推送与 main 另按实际回执,94-102 未扩展。未重跑任何命令;历史结论保持原时点;候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4435B / SHA-256 6b48390c77d8538edb658b729a914e1d62fc2c8d8d3c5caf557a6474974ac492；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE92工程门与历史证据复审

归[全83卡复审](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)，当前8b1213805/main=f98d0ddd8、0behind/137ahead，单Agent，未改产品/测试/规则/基线。CODE92当前partial，0新增关闭。

## 原件与源码边界

完整读取原CODE92卡、README、affected-files与30行source-snapshot-comparison原件；读取当前根package.json caller，以及coverage/run.mjs全文567行，classifier/测试、scope audit/测试、metrics/测试、config、environment全文。逐源行数/SHA与回执hash见[读取记录](read-and-receipts.json)。approved-test-retirements、full-inputs等依赖本片只沿既有锚点，不借此签它们整文件accept；30个菜单文件本片只做字节比对，没有冒充源码全文语义复验。

primary为根脚本和真实coverage CLI：check:fast执行typecheck/test，coverage:fast经run.mjs；protectedRef仅从TYPE_PAL_COVERAGE_BASE_REF读取并调用Git目标baseline比较。classifier只在目标没有baseline且没有coverage config时允许bootstrap；已有config而缺baseline抛错。metrics用整数分数比较每包与全仓，scope audit分别报告源码、测试数量/identity与执行配置变化。SDLPal/第一阶段/第二阶段产品机制N/A。

## 本轮核实结果

- 历史失败回执raw SHA/18252字节与exit1一致，真实失败在保护范围缺RNG测试；历史后续回执SHA/18118字节与exit0一致，731源/19870测试、相对当时baseline无回退。两原件均没有act/环境/navigation诊断命中。这是历史事实，不是当前门通过。
- 原卡done段仍写“全仓check后补写”，但同一收口commit f52a10e40已实际提交CODE90/gate-check-after-boundary.txt和exit0。本轮逐字节核其与该commit一致，记录lint4041、0/0/0；不能从文案未补推出当时没有执行。
- 旧“30/30源码一致”仅适用于旧快照。本轮重新git show各closureCommit与当前文件比对为20相同/10变化，明细见[当前比对](current-source-comparison.json)。10项为menu-mode.test、inventory实现及两测试、shop两测试、equip GLM测试、in-game GLM测试、组合item-magic测试、in-game-magic主测试。全部30项当前ledger已为review，本片不重复撤回或恢复关闭；20字节相同也不能替代本轮语义/新门。
- 旧rawCombinedOutput没有结构化环境对象；单独成功终端输出不能独立分辨普通fast与protected fast，原卡命令与前一失败可支持历史追踪，不能冒充完整环境回执。后续当前真实门必须保存确切命令、环境白名单、ref解析、baseline SHA、exit/signal与完整stdout/stderr。原件保持不变，不追溯补造已捕获环境。

## 测试质量与当前门

classifier的bootstrap/compare/fail-closed三合同；scope变化/删除/测试减少；metrics合法计数、聚合、精确回退与跨包不能掩盖等直接oracle已读。定向真实Node测试10/10，全部coverage-tools相邻67/67（0fail/0skip/0cancelled），结果见[tests.json](tests.json)及raw.gz；这不是运行官方ratchet/protected。测试量/包绿不能复签83–91的菜单文件。

本片无实现变更，TypeScript门N/A；全仓check、官方ratchet、protected fast仍待稳定窗口，editor诊断未清，禁止合main。没有新增ignore/exclude/强转或静音，没有改生成物或机制。当前机器3287/222closed/201review/2864pending，0新关闭；下一个有限片回到CODE1 shared RLE模块，按真实caller/primary/测试逐文件复核，94–102/editor原返工保留。

[当前检查点静态门](gates.md)：docs、lint-zero（4379文件0/0/0）、ledger与diff-check已通过；报告新增后补链并再核docs。不是新全仓质量门。

## 2026-10-22 工程纠错原合同收口

[当前八维/命令与门归属](closeout.json)、[30源码当前Git比对](current-source-comparison-20261022.json)、[只读快检](../3c/verify-closeout.mjs)。本次实际8同/22变，旧20/10保留历史；不修改30路径状态。固定31保护的当前官方单次采集及同报告strict/protected、全check和最终game增量真实原件在当前gate包，工程记录复用，不声称新跑或推补旧环境。

CODE92按其记录/门纠错范围接受，源码的八维/关闭仍归各卡；未将30个字节比对当语义验收。当前模块的文档静态/推送与main另按实际回执，94–102未扩展。
```
<!-- incremental-original-source:end -->
