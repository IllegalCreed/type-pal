# DOCS-NATIVE-VITEST-269-1 — S29 原生 Vitest 269篇语义接入

Status: build
Execution: build allowed（用户2026-10-23批准；合同与受控写入由Codex负责，GLM只读补齐269篇证据）
Phase: ops
Capability: native historical document governance
Coding Owner: Codex（通用合同、受控写入与中央接入）
Owner: Codex
Contributor: GLM（获准后的逐篇内容与证据；不写中央账本）
Reviewer: Codex（贡献者交付据证独立验收；Codex实现另交未参与者复验）
Visual Verification Timing: N/A（只处理历史文档）
Branch: codex/docs-s29-native-vitest（Owner）；GLM从ADMISSION固定提交创建codex/docs-s29-glm-native-vitest
Last reviewed: 2026-10-23
Template: task-card-v1 / 1.0.0

> 用户2026-10-23明确批准本卡草案。准入覆盖设计冻结、通用实现、pilot、269篇贡献者包和据证中央接入；不再逐小批申请。GLM本轮仓库只读，正式写入在合同和pilot独立接受之后由Codex执行。

## 目标

在已接受的S28存储基础上，将269篇原生Vitest历史报告按其具体内容、来源、相位和信用边界接入统一原生文档合同。原生字节不改，治理正文复用原有唯一review位置。语义、模板符合、存储发布、历史执行和全量完成分别验收。

## 范围

- 一次269篇包，精确path/source SHA/current logical review/index/proposed phase复用s29-readonly-preflight.json与已接受S26修正稿，不再重复23来源/7格式例外或S25三篇pilot。
- 269篇目前全部partial-review-unknown/needs-migration。8个目标review分布：R85=72、R86=34、R87=71、R88=71、R73=1、R74=1、R75=9、R76=10；不是只写R85。
- S26提议相位：counterexample-red143、baseline-green30、restored-green27、final-replay-green4、green-run53、gate-run-green8、green-with-pending3、timing-probe-green1。这是已核来源的提议，不是本稿新授运行/语义信用。
- 599条中其余330条（含原三pilot）、302原生对象、30例外、原1838绑定与所有原source pin只读。原生JSON不加payload/envelope/sidecar，不删历史字段，不恢复撤回B5/B10等旧信用。
- 代码仅必要scripts/docs原生合同/dispatch、受控review存储更新及新文档工具测试；中央只改精确269的review/registry/routing、必要版本提案/派生artifact与pin、原任务/看板/索引/既有单份日志。产品、旧测试、coverage、共享配置不在授权建议内；若实际证明旧测试必改，列具体最小补丁另行授权。

## 前提真值门

| 维度 | 当前事实 | 直接依据 |
|---|---|---|
| primary source | 269路径均有33cc冻结成员，当前原生SHA与原绑定及S26稿一致；8现行review唯一绑定逐项核对 | S26 execution-manifest + correction/review-index（SHA85648f5c…）；本稿s29-readonly-preflight |
| 第一阶段 | 历史输出可含第一阶段测试，不重授机制/断言有效性或当前运行 | 各原报告与已接受S26读域/继任边界 |
| 当前二阶段 | 同样保留其历史候选、probe/pending/red相位，不恢复退役合同 | READ-FIRST及具体README裁定 |
| 本任务目标 | S28只完成599存储、0语义信用；现行原生validator硬限3pilot/R85，不能直接把269路由换标当通过 | historical-vitest-native.mjs；S28候选3eec25022187311903426ae65daeeb3607bf9d58 |

最强替代解释：相同success/计数/断言名可能属于探针、重放、恢复或已撤回反控；S26程序逐字段核读不等于269次人工全文审阅。源码/来源/相位或继任不明确时只block该篇，不编造全文/执行身份，不从储存或parser通过推导语义accept。

## 上下文锚点

- 协议document-delivery-acceptance/1.0.0；AGENTS、docs/ops/document-quality.md、documentation-model、testing/governance。
- 原始源33cc2df50c7279d2750ddad4fcf6c373b7b2bda3；S28 flat历史载体8cbf0dafba1a8a96914a322719dfeca1e5d58873；S28发布候选3eec25022187311903426ae65daeeb3607bf9d58；本卡范围基底35e3bf2e2c3f8234e8a0e03fa3a8d644466eb941。
- S26修正稿四分片及Owner amendments（207项计数/2项裁决锚）只按已核差异复用，不能遗失Owner补充或照搬旧撤回结论。
- historical-vitest-native.mjs 当前只有3固定path/phase且current-review固定R85；prepareReviewStorageGroup只接受冻结flat原字节。因此S29需显式的cohort合同/跨8review受控delta写入，不得通过伪造原source、刷新SHA、把薄manifest变回flat或运行旧enrich/refresh救急。

## 验收条件

- 先冻结269准入tuple（path/source/phase/review）与变体版本；原3pilot及父合同不滚动改版。新合同共享原生校验能力，拒未准入路径/联合换标/source drift/重复键/坏UTF8/虚构当前执行。
- 首先pilot覆盖真实红（含多失败完整集合）、green-with-pending、timing-probe及常规绿/恢复/重放不同边界；可复用原三pilot的已核合同，但不能用它们替代新增相位验收。pilot不过，不推进其同类正式批量接入。
- 269逐篇有具体结论、真实读域、合法治理输入、完整结果/失败/pending集合、producer/consumer/继任与撤回、native witness和版本/限制；已可靠字段/共享上下文直接复用，补失效或不足部分，未知blocked。
- 受控更新只改批准269行的明确字段和必要history；其余330条完整JSON/顺序/历史不变。原生302/source pin全保全；新generation发布含旧物理片显式退出/保全映射、全输入快照、lock/recovery/并发拒绝、组读回和幂等，不留未知/孤片；无需固定仍19片，每片≤512KiB。
- 每篇状态与信用只在有足够内容证据和独立接受后提升；未过篇继续partial/needs或blocked，不为减少2384诊断批量授reviewed/template-compliant。runtimeExecutionPerformed/historicClaimsReexecuted双false。
- 必要文档工具/真实consumer/模板/pin/全量清单/索引/lint/diff均有有效原件，零error/warning/info；全量剩余红保持红，不合main、不推送、不标父卡done。

## 当前模式推进记录

- 用户批准：2026-10-23「批准」，对应已展示的S29草案全范围；不是S28接受自动扩权。
- Codex build allowed：通用合同与受控更新设计/实现/pilot；GLM在固定候选只读复用S26稿及Owner补丁，完善269篇语义和差异证据。中央正式发布须新合同、pilot和受控writer具备有效非作者接受证据，不把本条准入记作accept。
- 白名单和保全源：`/tmp/type-pal-S29-GLM-native-vitest-269/execution-manifest.json`，SHA-256 `4206abb998623996a6fd0a1cebea8913678f1fc2b29fbf9be09a4579500f8db5`。269个准入tuple、330个只读entry指纹、302个原生SHA、8manifest+19片和6份已接受S26输入均冻结；实际准入提交另由ADMISSION实取绑定，不手填猜测HEAD。
- 本卡新增1份增量调度文档，独立列为partial-review-unknown/needs-migration；1838原分母、1151迁移及3retired不变。严格待办的增量是本卡review与migration两项，不是新发现两篇旧正文问题。
- done准入：blocked。0篇新语义/模板/迁移/运行信用；父卡与DOCS-NATIVE-JSON-1保持rework，不合main、不推送。

## Draft：设计与风险

### S29 设计冻结 1.0.0

| 决策 | 冻结口径 | 反例与停止线 |
|---|---|---|
| 原生合同 | 复用historical-vitest-native-v1自有1.0.0及current-review；父合同1.5.0和原三pilot全字段/相位保持。新增路径仅限准入tuple，生产实现未发布前仍属提案 | 未准入路径、来源或相位与冻结清单不符、联合换标必须拒；不能从同一条可变review推导其期望相位 |
| 唯一事实源 | 治理正文仍写原8个逻辑review唯一行；routing只表达已批准绑定，不另建中央sidecar、第二套review或原生对象副本 | 同路径多份正文、整片旧稿再复制、把immutable报告移到payload均拒 |
| 贡献者交付 | native-vitest-review-delta/1.0.0：引用已接受S26原行与Owner补丁，输出逐篇reuseDecision、必要patch及机器结果完整集合；不重复输出不变字段 | parser读域不称人工全文；不足的语义/历史边界定点补读，未知block该篇；不重授旧执行 |
| 源与历史 | 原生302及599中非目标330条全JSON/键序/位置/历史保全；269修改有原行canonical SHA和字段白名单 | 不能刷新sourceSha256伪装新事实，不能覆盖撤回裁决，原source pin不动 |
| 受控写入 | review-record-semantic-delta/1.0.0；沿用storage/1.0.0，当前manifest、全部旧片、9条pin依赖及批准delta实字节组成快照。先冻结并核差异，再在锁中staging→读回→新generation→manifest→R92→R94→全组/全inventory读回→释放 | 无锁写、旧flat假设、少保护旧片、非目标行差异或并发漂移拒；失败保留锁/staging/recovery供Owner定向恢复 |
| 旧物理generation | 新片格式化后≤512KiB；旧片仅在全部新manifest/pin可验证后从活跃inventory退出，逐路径源SHA/目标/保留Git/退出原因由本次受控发布计划承载 | 不留孤片/未知目录，不复制成永久raw；Git源可恢复，发布未闭不释放锁，不靠ignore或上调maxSize |
| 信用分层 | 来源/保全、内容证据接受、合同符合、当前运行分别记账；贡献者ready并非content-reviewed | 每类真实pilot未过，其同类不得中央批接入；历史统计不手改成新回执；新严格待办按实算 |

现有三pilot/R85 validator和S28初次flat writer都不具备上述269发布能力。Codex先补必要通用能力，所有新实现保持作者nonAuthorReviewer=false并交未参与者据证复验；不能把设计冻结当成实现验收。

### Pilot 与贡献者分工

八相位各选真实代表，另覆盖多失败完整集合、三份pending全集和B5/B10撤回边界。GLM在只读交付包中先核pilot，内部发现缺口只停受影响篇/类，继续无关类，最终一次集中交付。Codex定向核原件与风险后决定接受；不默认把269篇重新全文做一遍。小修由Codex完成，实质来源/产品冲突按停止线。

## Build：实现与自测

Owner已创建隔离候选分支并冻结准入包；生产合同、受控writer和269正式发布尚未实施。当前只注册本卡和调度，源8/19片/599条及302原生全只读。新合同与writer的实际文件白名单、测试结果和候选由后继实施如实补录。准入阶段已真实运行完整232项（0失败/0跳过）、导航1304篇/10187链接/366任务、model1272合同、testing与phase门，均零issue；lint4544文件零E/W/I。check:docs仍exit1，仅严格2386项：1196篇，1190审阅待办+1196迁移待办、交集1190；比2384多的两项只来自本卡，原269尚未扣减。原件进入既有单份压缩日志，不能据此称全门通过。

## Review：审查与返工

pending。贡献者逐篇交付由Codex据证独立验收；Codex通用实现由未参与者按具体风险复核。原件按时点保存，精确退回单篇缺口，小问题由Codex处理；不循环重做全部269。

## 用户验收

用户产品判断N/A（不改可感知行为）。本卡build allowed已获明确批准；不包含新产品取舍、不可逆main操作或未授权旧测试改动。

## 交接日志

- 2026-10-23 Codex：用户批准已展示S29草案，Owner创建新分支、注册本卡、冻结269 tuple与330/302保全、差异交付及受控generation设计。S26四分片和Owner209项补丁直接复用，不复制原生或重写历史信用。GLM只读一次269包与Codex通用实现分工，源码/合同发布不由GLM越界代做。
- 已知准入工具首红：prepare-v1将相对manifest的shard路径误作相对仓库，ENOENT发生在只读取样；按loader既有相对路径规则修正后27个物理输入均实取。原工具/说明保留在同次日志，无仓库载体写入或语义事故。

## 下一位Agent提示词

GLM读取本卡、document-quality/1.0.0、准入execution-manifest和ADMISSION，按INSTRUCTIONS从实际准入提交创建新分支；仓库零写入，唯一交付目录/tmp/s29-glm-native-vitest-269。复用S26修正稿+Owner补丁，先做风险pilot再内部完成269条差异包与真实回执，集中交付，不逐批请示。Codex负责新合同/受控writer及后继中央发布；本次贡献者不跑181/整仓/产品/E2E/coverage，不合main、不推送、不标done。
