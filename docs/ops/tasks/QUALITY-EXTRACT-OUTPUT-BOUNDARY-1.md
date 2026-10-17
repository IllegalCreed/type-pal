# QUALITY-EXTRACT-OUTPUT-BOUNDARY-1 — 提取器共享输出目录清理停止线

Status: build
Owner: Codex
Reviewer: Codex（当前源码与隔离原件自核，不冒充第三方）
Phase: phase1 pal-extract / asset pipeline ownership
Capability: extraction output cleanup boundary
Visual Verification Timing: N/A（CLI文件所有权，无UI变化）

## 已确认事实与停止线

**当前用户裁决（2026-10-16）**：批准方案A“拒绝共享输出”。遇到本仓库data或data/extracted节点为链接时，任何输出创建/清理前立即报错退出；正常自有输出和只读data/raw链接保持原行为。不增加force开关。此裁决解除产品策略待定，C1失败反例、有限build准入与实现均已完成，当前仍待统一门和独立Codex收口；下文未批准表述均是裁决前记录，不作为当前待答问题。

历史基点c2fee5a9e、main=f98d0ddd8仅用于3g反证；当前治理分支已合并最新main，当前唯一写入分支为codex/code-quality-3y。用户要求资产管线风险立即停线开卡，不得直接实现。3g全文读取发现OUT清理仅有字符串suffix guard，随后readdir/rm子项。当前治理树data/extracted实际是指向主树data/extracted的symlink；本任务没有在真实工作树运行提取命令。

[四场景隔离原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3g/output-boundary.json)执行未改CLI的临时副本，输入/输出/所有链接目标均在自建临时目录：OUT根链接或data父链接都能通过guard并删除链接目标的marker，之后因缺SSS退出1；videos保留。对照：普通OUT照常清理，OUT内子项链接仅被unlink、其目标marker保留。不能把根/父链接风险扩张为“rm一定跟随每个子链接”。首次探针因macOS /var别名的校验失败发生在启动CLI前，原件保留，归一化探针自有路径后才得到四次产品观察。

## 四向真值与可证伪前提

| 维度 | 直接证据/边界 |
|---|---|
| Primary | CLI:73–77、184–201；Node fs的lstat/realpath与rm语义见[官方fs参考](https://nodejs.org/api/fs.html)；四个真实子进程及两侧marker字节为本次直接IO证据。 |
| 第一阶段 | CLAUDE提取产物可重生成；用户要求治理树不得覆盖/清理主工作树。可重生成不等于当前工作树拥有另一个树的产物清理权。 |
| 第二阶段 | N/A；不改content/reforge/editor，也不改其资产格式/迁移。 |
| 当前目标 | 已批准并实现“共享输出会被清理 → 清理前拒绝共享”；正常自有OUT仍按原策略保留videos、清理其它旧产物。 |

最强替代解释：共享输出可能是有意工作流，原清理行为并非在所有调用域都错误；因此不擅改产品策略，也不把symlink raw只读输入一并禁止。若四次原件表明根/父链接目标未被删除，本前提被推翻；若存在经批准的共享输出调用方，则须先明确其显式授权方式。

## 可审阅方案A（已批准并实施）

第一阶段命令pnpm extract在任何输出创建/清理前检查本仓库的data与data/extracted这两个输出路径节点；若节点为symlink则明确报错退出，不进入清理/写出。只读data/raw链接继续允许；正常自有OUT以及其内部子项原清理行为保持。不增加force/兼容开关，不改argv接口、资源路径或文件格式。

白名单仅cli.ts清理前guard与cli-error-exits.kimi-r1.test.ts的真实临时树反例；已先以旧实现证两新反例红，再补最小guard，并核OUT根链接、data父链接、普通目录、无目录、子项链接以及真实caller/相邻回归；原普通清理/videos合同保留。非法输出在缺SSS之前即拒绝，目标marker/videos字节必须保留；完整command/cwd/exit/signal/JSON/raw、可重建副本及清理证据齐备。实现与纯注释/重构分提交。

方案B为保留共享输出但另设显式授权流程；这会增加命令接口/工作流设计，用户本次未选择。当前已批准A，C1已记录build allowed，实现只涉及上述白名单；当前仍未宣称整仓或账本文件闭合。

## C1 失败反例与实现准入（2026-10-17）

[C1红回执](../evidence/QUALITY-EXTRACT-OUTPUT-BOUNDARY-1/c1/README.md)在未改生产的临时树上运行现有`cli-error-exits.kimi-r1.test.ts`：原有7例通过，两个共享输出场景各为指定AssertionError，0 pending/运行时诊断；旧实现确实删除共享目标marker。真实caller是根`pnpm extract`→`packages/pal-extract/src/cli.ts`，输出根和data父目录均由模块常量推导，用户已批准方案A。

Codex完成四向真值与直接IO反例核验，单一Coding Owner，build allowed：白名单仅`packages/pal-extract/src/cli.ts`清理前guard、`packages/pal-extract/src/cli-error-exits.kimi-r1.test.ts`两个真实临时树反例和本卡/证据。guard必须在`mkdirSync/清理`前拒绝本仓库data或data/extracted节点为symlink；只读data/raw链接、普通自有OUT、OUT内部子项链接行为保持。错误应在缺SSS前明确报告shared output，不增加force/兼容开关，不改argv、资源格式、生成物或提取流程。

实现后定向9/9通过，pal-extract typecheck与全包72 files/434 tests通过；删除guard的临时变异反控为7绿/2指定AssertionError，源文件finally逐字节恢复。全仓pnpm check通过，lint为4959文件、0/0/0；官方ratchet与protected fast均因shared/pal-extract基线回退失败，未改基线，不因本包绿关闭整文件。

## 未决与交接

下一步记录本批完整文档、账本与质量门回执，提交并推送治理分支；3g其它只读复审与全83卡/94–102/editor范围继续。CLI旧关闭因直接counter保持rework；coverage baseline回退、game/editor运行时诊断未收口，不合main。无下一位Agent提示词，Codex单Agent继续。

## 2026-10-17 当前实现回执

实现白名单已落在 `packages/pal-extract/src/cli.ts`、`packages/pal-extract/src/output-boundary.ts` 与对应 `output-boundary.test.ts`；CLI 入口通过 `prepareOutputRoot` 调用共享所有权守卫，并保持直接执行时的错误退出。方案A行为不变：`data` 或 `data/extracted` 根节点为 symlink 时在任何清理/写出前拒绝；自有目录、缺失 output、`data/raw` 输入链接和 output 内部子项仍保留原边界。没有修改提取格式、生成物、argv、force 开关或公共游戏接口。

直接回归：`output-boundary.test.ts` 与 `cli-error-exits.kimi-r1.test.ts` 为 2 files / 12 tests passed；pal-extract typecheck 通过；`check:docs`、`lint`（4971 files，0/0/0）、ledger 均通过。此批未运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`，因为用户已明确要求把这些昂贵门集中到完整大任务收口；coverage baseline 未纳入本提交。CLI 旧 ledger 关闭仍保持 `rework`，新增实现/合同文件登记为 `review`，本卡继续 `build`，等待大窗口统一门与独立收口。
