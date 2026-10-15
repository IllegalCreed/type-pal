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
