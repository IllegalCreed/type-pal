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

## 2026-10-18 补审勘误与待核项

交接勘误：dd341e5f3标题“reject shared extraction outputs”不表示首次引入拒绝策略；守卫已由cc8971760（2026-10-17 10:10 +0900）内联实现。dd341e5f3（21:35 +0900）实际是可测性重构：抽出同一lstat/错误传播守卫、增加prepareOutputRoot与直接执行入口判断，并补三条单测；拒绝文案/清理前位置保持。历史提交标题不改写，本卡明确其真实性质。

单一Owner仍Codex。以下三项登记pending，不虚报直接测过，本次不改变资产管线行为：

1. dataRoot本身不存在时，第一个lstat在try之外抛原生ENOENT；CLI统一catch会输出异常并exit1，但尚无友好缺目录信息或隔离直接反例。若要改提示/创建策略，先核真实首次提取调用域，不能把缺data与缺output混同。
2. outputRoot lstat的非ENOENT重抛分支尚无精确单元反控；后续可在自有临时树构造ENOTDIR，核原错误code/对象和无清理副作用，不以权限不稳定的EACCES代替。
3. prepareOutputRoot默认参数没有独立单元oracle；已有cli-error-exits.kimi-r1.test九个真实临时树子进程通过main→prepareOutputRoot()无参接线（源码已核），故不是生产caller完全无覆盖。默认路径推导若要单独认证，须在隔离副本导入，禁止为测试触碰主树data。

output-boundary实现/三专测及252行CLI错误测试已全文重读；911行CLI本轮仅重读常量/入口/清理/异常出口和两历史diff，不重签整CLI。实现/测试字节未改，故不为登记重复跑pal-extract全包/coverage。[证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/supplementary-audit/README.md)；本卡build、CLI rework及helper/test review维持。

## 2026-10-18 补审入口停止线与有限准入

用户最新独立复查要求修三项：视频转码绕过已批准的共享输出拒绝、CLI绝对路径含链接组件时main静默跳过、raw被caller检查的失实注释。沿用本卡既有“拒绝共享输出”裁决与用户本轮明确修复指令，不另造103+卡。Codex单一Coding Owner，同3y分支先推送3w批298136f19，main0behind后接本片。

三实现extract-videos.ts132行、cli.ts911行、output-boundary.ts25行及包脚本/类型/旧边界测试全文已核（本片read-boundaries保留修改前后原字节）。视频main直接复用assertOwnedOutputRoot，guard置于ffmpeg及任何输出IO前，不调用清理、不改转码参数/增量策略/产物格式；只核data与data/extracted已批准节点。CLI直执行判定使用realpathSync解析argv路径，保持import不执行。注释只澄清raw为输入、不在此守卫范围，不补不存在的raw新策略。

build allowed：仅上述三实现及新cli-entrypoint-paths.test.ts，一个明确的输出/入口边界模块切片；先新反例旧实现红，再改产品，再定向/CLI相邻/typecheck，保留完整raw/nativeJSON与隔离临时树精确清理。真实进程运行复制源码，文件/链接/ffmpeg替身/所有输出都属自建临时根；替身仅代外部编码器，不替代输出路径/守卫/进程退出。旧格式/输出guard合同不放宽，未跑真实ffmpeg编码不能宣称编码或全提取验收。whole check/official coverage/protected仍留大任务收尾，不合main。

### 入口补审交付

用户三项均成立：旧视频入口能经data或extracted链接覆盖六mp4，旧CLI绝对路径带目录链接静默exit0，raw确无声明中的独立caller检查。先冻结三旧实现/新测试，再实跑2文件8例：5绿/3指定业务AssertionError，无收集/环境诊断；修复后7文件41绿（5新直接/36相邻）和pal-extract typecheck零诊断。三实现各全文、包脚本/正式IO出口与Node22 fs primary已核，新191行测试全文；新旧运行时名字配对，raw/nativeJSON/hash/源码快照见[本片](../evidence/QUALITY-EXTRACT-OUTPUT-BOUNDARY-1/entrypoint-followup/README.md)。

视频guard在ffmpeg/输出IO前，直接复用现有lstat不清理；argv通过realpath识别main，import无副作用与旧相对路径caller均绿；注释如实限定raw不属输出守卫。未改生成物、转码参数、资源格式、游戏API或schema/save，未引入ignore/断言弱化。CLI rework、视频/helper review维持，新测试review，3319 tracked/251 closed/103 review/2965 pending，0新增closed。原data缺失提示/非ENOENT/默认参数独立反控、视频编码/所有外部失败路径、内部文件链接/并发换链不在此切片验收。最终五docs消费者/lint/ledger看gates；不重复全包/check/official coverage/protected，依用户要求留大任务收尾，不合main。之后回pre94 40/41等未核模块与3w剩余域，94–102/editor继续后置。

## 2026-10-22 三登记缺口的纯测试build allowed

Codex单Owner，白名单output-boundary.test.ts、cli-entrypoint-paths.test.ts及本卡/证据。只补已有待核三轴：data根缺失必须抛原生ENOENT而非误当输出可创建；data为文件导致output lstat的ENOTDIR须原样传播；隔离复制CLI从其它入口import后无参prepareOutputRoot必须检查模块推导的data/extracted链接而非cwd。只使用自有临时树/链接/marker，production helper/CLI/video正文均冻结，保留现有正常/拒绝合同与fixture生命周期。与CLI IO/slice已批准增量合为窗口，重门集中末跑，不修改缺data的提示策略或转码合同。
