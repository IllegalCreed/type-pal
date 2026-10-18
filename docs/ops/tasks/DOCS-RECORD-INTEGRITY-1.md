# DOCS-RECORD-INTEGRITY-1 — R 波记录可信度撤回与补救

Status: rework
Phase: ops
Capability: documentation evidence integrity
Coding Owner: Codex
Contributor: Codex
Reviewer: 固定58e899bf及23b62e97纠错包获非作者限定接收；全量语义与硬门仍未完成
Branch: codex/docs-audit-rework
Last reviewed: 2026-10-18
Template: task-card-v1 / 1.0.0

## 目标

按用户提交的 GLM 审计撤回 R39–R93 的过度信用，修复生成文本损坏与证据链缺口，保存真实重跑输出。修复记录可信度不等于重授全量语义验收。

## 范围

- 文档、治理 registry/review/catalog、进度与文档质量工具；不改产品源码、旧产品测试、coverage 或 Biome 规则。
- 原回执和历史结论保留；勘误单独记录，不能修改旧 stdout 或伪造当时重跑。
- 本卡是流程回退与修复卡，不追认 a1ac53bbe 的放宽，不代替 1838 逐篇重审。

## 前提真值门

### 一句话行为 / 工程前提

字节保真、章节形状、SHA 和结构校验无法证明逐篇语义深审或非作者身份；已撤回的完成数必须从当前账本与进度移除。

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| primary source | 183ec0bf0 只修改 R65 summary 中 8080→7970；a1ac53bbe 引入 artifact-only 完成捷径 | 两笔 Git diff；本卡配套 integrity-audit.json |
| 第一阶段 | 原文 quote 与最新机制注记必须保护；只修生成封套损坏 | CLAUDE.md；docs/phase1/game-mechanics.md |
| 当前二阶段 | 不把历史设计重授当前实施权 | docs/phase2/READ-FIRST.md；docs/ops/guides/documentation-model.md |
| 本任务目标 | 状态降档、真实重跑、可追溯勘误；不由自验授独立接受 | 用户 2026-10-18 审计及六项返工要求 |

### 反证与替代解释

- 命令可能当时另有重跑，但当前修改提交未保存原始输出，不能凭假设确认；原 accept 信用撤回。
- 处理速度不是唯一判据；具体结论缺乏逐篇来源、反证与审查身份支撑，足以要求降档。后续真实重审可逐篇重授。
- Git 不保存历史 mtime；以 commit/blob 差异扫描 machine receipt，当前 mtime 不作历史真实性证据。
- 仅修当前生成封套；若 quote 原字节变化立即停止该修复。

### 用户可见偏离

- before → after：全量 done/深审全通过 → rework/partial-review-unknown，机械保真单列。
- 用户授权：2026-10-18 明确要求上述降档、补救与重跑；不需要逐批申请。

## 上下文锚点

- AGENTS.md；docs/ops/guides/documentation-model.md；docs/ops/agent-workflow.md。
- scripts/docs/check-content-review.mjs；report-governance-progress.mjs；document-model.mjs。
- docs/ops/tasks/DOCS-FULL-TEMPLATE-1.md；R22/R24/R26/R27/R65/R66 历史回执。
- 不得重新引入：手改命令输出、wrapper=语义、artifactOnly=完成、同主体自验=独立审、未实跑=PASS。

## 验收条件

- R39–R93 与后续收口的受影响路径逐篇列出，registry 与 review 同步降档，1838 cohort 与增量单列；未重读不重授。
- R65 旧记录被明确撤回；Git receipt mutation 全量筛查给出候选和限制；R65/R66 新命令结果完整落盘，包括失败。
- 分号损坏全树扫描/修复；原 quote 字节保持；增加真实回归拦截同类生成损坏。
- R24 虚报 hash/悬空文字、R22 接收链、R38 未使用编号与 R27 原字节/标记解码口径都有明确勘误。
- 静态门零诊断；语义 strict/require-complete 在降档后必须真实失败，不能改工具放行。这是未完成状态，不是通过豁免。
- 非作者复核尚未发生时，本卡及全量卡不 done。

## 当前模式推进记录

- Codex build allowed：用户明确授权纠错；单一 Owner、隔离 worktree、限定上述白名单。
- 设计：回退 artifactOnly 的完成捷径；新增证据根只作纠错控制，不承载自授内容信用。
- 本轮自验：只陈述工具实际执行结果；独立验收 pending。
- done 准入：blocked；待语义逐篇重审和非作者复核，不把补救阶段绿灯当作全量完成。

## Draft: 设计与风险

- 原始 receipt byte-stable，当前勘误入口优先于其历史 verdict。当前 ledger 加 superseded claim 定位和 rework，不删除历史。
- 降档由所属 review 批次精确映射；不是假称重新读过全部对象。完整清单见配套 correction-scope.json。
- 113 份生成文本的诊断范围须与修复记录一致；R26/R27 用户报告的 44 与实际路径数差异单列，不凑数。
- 最大风险是为让 check:docs 绿而恢复 content-reviewed；本卡禁止这种做法。

## Build: 实现与自测

进行中。命令和完整输出见 evidence 目录；未执行步骤不写通过。进度投影为继承的剩余信用，不是本卡新认证。

## Review: 审查与返工

- 自验与来源核查由 Codex 进行；本轮没有非作者独立验收。
- 仍待：受影响正文的真实语义重审、artifact 格式合同及真实 consumer 审核。

## 用户验收

用户审计已否决原全量收口；本卡不得覆盖该 counter。

## 交接日志

- 2026-10-18 Codex：保全 main@28fd9013e，核 Git 原始 diff，建立隔离纠错分支。下一步完成降档、损坏修复、证据扫描与真实重跑。

## 下一位 Agent 提示词

本轮下一位为尚未分派的非作者只读Reviewer。按序读AGENTS/文档模型、本卡、十五项裁定和机械观察、原Git receipt与raw、correction-scope及工具delta；只将自己的审查结果写到独立临时产物，root接收后原字节接入。不得改产品/旧测试/coverage或候选实现，不得把本卡自验改写为独立接受。

## 工作区异常与证据保全

2026-10-18：未提交的 managed worktree 在命令执行中消失；未发现可恢复的新 Git snapshot，主树未变。构造脚本从本 chat 工具记录恢复后在新的隔离目录重新执行；消失目录内的 raw capture 不作为留存证据。新的 command receipt 只代表新执行，不补造旧输出。本卡先提交本地检查点，后追加真实执行证据。

## 当前交付与真实自验（2026-10-18）

- 已完成本轮纠错实现：1896条批次绑定降档，113份生成封套修复，artifactOnly完成捷径回退；R22/R24/R27/R38勘误与R65/R66新执行捕获落盘。原quote不改。
- 首个保全的新capture a1622b45-a149-4288-9f17-7799d1236ed9：docs工具128/128、R65/R66 source inverse与after pin 20/20、链接/模板结构/testing/phase-lore/内容结构完整性均通过；lint零诊断、diff通过。严格内容门和全量check:docs因撤回状态失败，require-complete也失败，均保留原始输出，不是统一门通过。
- 进度投影437/1838 baseline +5 incremental，仅为未撤回的继承信用，不是本轮重新认证。原全量卡与catalog拆分卡保持rework。
- JSON历史变动筛查：1805组修改、1784组成功解析、16个候选。R65确认摘要手改；其余15项待原始执行证据核验，不声明全仓清白。Git无历史mtime，因此未伪造生成时间和mtime比对。
- 所有明确nonAuthorReviewer=false的candidate acceptance撤回独立信用；旧reviewer/policy/provenance当前标记被撤回，历史原声明在sourceRevision保留。
- 本卡review，非作者复核、逐篇语义重审及其余候选真实性调查未完成；不得done或把此分支合为全量治理完成。

### R33/R37 原生格式边界补记

另有6份此前获GLM内容层通过的HTML/JSON：不改正文、不撤回具体语义结论，仅将依赖artifactOnly捷径的template-compliant改为needs-migration。content-reviewed保留，待补实际原生格式合同与consumer pilot后才能计迁移完成。逐篇列表见integrity-audit.nativeArtifactCompletionCorrection；不混入R39–R94的1896条语义信用撤回计数。

## 2026-10-18 续办：十五项裁定 → 非作者验收 → 语义重审

- 用户继续授权上述顺序；Codex build allowed，当前单一写入Owner仍为root。新白名单：本卡/evidence、派生board/index/registry/review/matrix与scripts/docs/inspect-receipt-candidates.py；不改产品、旧测试runner或coverage。
- 十五项已按固定Git blob逐项裁定，10项变动可解释，C08/C09/C12/C13/C15五个限定scope隔离；不是15次执行通过。C13真实改过既有lint摘要但新执行缺证；C12存在SHA吻合而UTF-8 byte计数字段错误的独立counter。
- 旧“其余15待核”为首轮历史状态，当前清单见receipt-candidate-adjudication-20261018.md及配对观察。原始筛查/receipt/raw不覆写；当前隔离裁定绑定sourceRevision与JSON pointer，不靠文件名推断。
- 新非作者Reviewer尚未分派；只读审查完整纠错候选，须实际核原blob/raw、撤回与保真、工具和失败捕获，独立给counter或限定接收。root自验不代签；完整硬门未过，review与rework不改done、不合main。
- 后续语义队列优先READ-FIRST等准入入口：已发现其被机械历史化与当前AGENTS路由冲突。现在只排期，不在非作者纠错验收前改写或授新语义信用。

## 2026-10-18 非作者纠错验收接入

- 受审候选：`58e899bf000e0d3bbeafb5c4a7ecb478b07ac656`；Reviewer为新分派的`/root/receipt_integrity_independent`，作者为`/root`。这是不同逻辑任务的非作者复核，同属Codex平台，不伪称不同组织或供应商。
- [冻结独立报告](../evidence/DOCS-RECORD-INTEGRITY-1/independent-review-58e899bf-20261018.json)SHA256：`06c482cda4cd56705a72d15e36a763c5ccc62ca609e83a744878000083b6dacf`。原报告和39项证据按原字节保存；临时路径到仓库raw的映射见[接入索引](../evidence/DOCS-RECORD-INTEGRITY-1/independent-intake-58e899bf-20261018.json)。接入本身不制造新执行。
- 结论：限定接收纠错包，无新增阻塞counter；15项裁定核实，10项变动解释、5个限定scope隔离继续。1896条撤回、113份quote保全、6份原生模板完成撤回均独立核实。
- 实跑：128/128文档工具、lint零诊断；损坏识别反控0→指定AssertionError的1→恢复0。strict、check:docs与require-complete均真实exit1；只读树还打印缺本地node_modules的pnpm warning，原输出保留，不能称统一门零诊断。
- `globalHardGatePassed=false`、`fullSemanticAcceptance=false`、`cardDoneAllowed=false`、`mergeToMainAllowed=false`。本卡保持review、父卡rework、main不变。旧“非作者待分派”段落保留为前一快照，不是当前交接状态。
- 当前下一步：按用户已授权顺序进入逐篇语义重审。首先READ-FIRST的当前准入权与历史封套冲突；单篇重审须独立来源、实际before→after与非作者验收，不能批量恢复1896条信用。

## 2026-10-18 新增审计：扩大撤信与回执锚点纠正

- 用户新增三遍审计指出，原R39起点不足。原固定58e899bf纠错接受及1896条原scope保持原字节与限定历史范围；本卡回到rework，新增补救不借旧接受续授。Codex build allowed，单一Coding Owner为root；只改本卡/父卡/看板和生成索引、既有integrity审计控制、明确受影响review/registry/matrix/receipt及N3保全说明，不改产品、旧产品测试、coverage、规则或依赖。
- R22–R36窗口机械复现189份Markdown另3HTML，152条模板式旧结论：R23的9条完整读取行数/字节数变体及143条标题/类型/状态/行标题数模板。152与旧1896无交集；READ-FIRST已有真实S01非作者后继，必须保留。逐条核完现绑定后仅撤回仍无真实新证据的信用，不批量降掉合格后继，也不把另37条或3HTML自动重授。
- 候选锚点逐份核实际首次回执blob、sourceRevision、迁移review首加提交和目标after SHA；不为凑50/53修改未知项。原receipt先原字节保全，candidateHead纠正与本次查证独立记录；修锚不冒充旧命令重跑，不恢复独立/执行信用。六个复制counter和R88–R91互斥摘要另作明确无效裁定，原数值/输出不抹除。
- R93九份design的真源SHA与overlay复合体口径逐份核Git，保留原声明并纠正当前字段或注明范围；禁止以无差别hash刷新代替查证。
- R27实测五篇289处行尾U+2420已有可见编码声明；15篇直接逆回、5篇仅按声明解码后全字节等真源。它们不属于先前113份封套插分号修复的已清范围，不删除原始空白、不把编码相等冒称直接字节相等。R53 N3的一处行尾标记可解码等真源，但缺可见声明及记录仍称直接exact；只修说明/保全口径，quote和历史执行不动，另作非作者核验。
- DOCS-CATALOG-SPLIT-1当前已rework；原done/自验冒称独立已撤回，本次补清历史准入块，不补造十六分钟前不存在的原始回执。缺原始执行与新非作者验收仍待补，现有实现和184条守恒成果保留。
- 三篇历史任务导航S13只读提案a6ea67c7已封存，尚未授body build；先完成本次记录层纠错与非作者验收。S12固定正文/中央接受、配对JSON既有限定审查及其C09执行隔离分别保留；全量硬门未过，不合main、不推main、不done。


## 2026-10-18 扩大纠错的固定候选非作者限定接收

- 不同逻辑任务 `/root/s11_design_rework` 独立复核 root 实施的 `23b62e9772a85096ba10ebf5971ebe066d7ff632`，报告 SHA `dae53bb2ee5caa3139751a9594ba39d986e7d359824da74edd490f573960996a`，结论为 `limited-accept-record-correction-only`，无新增 blocking counter。同属 Codex 平台；其原 d17 字符事实报告与本次 fresh 检查分开，不冒称异供应商或作者自验。
- 151 个现旧绑定仅撤两状态字段，S01 与全部 12 条语义后继/180 保护文件不变；70 回执的 68 个可证头、R65 双锚与 R92/R93 unknown、六错位 counter 和四旧 gate 组的撤信、九设计真源与 N3/R27 编码范围、118 显式 pin/114 根/2431 唯一 binding 零漂均在限定范围核实。原 1896 scope/六分片不改，并集 2048 当前 10 已合格/2038 待审不是本轮深审数。
- Reviewer 实跑完整 181/181，fail/skip/cancel/todo 全 0；lint 4511 文件 error/warning/info 全 0，导航 1301/8246/364、model 7/1264（结构）、testing、phase/lore 184 及完整 diff 通过。strict 的 4254 项仅 2124 partial 与 2130 模板待迁移；require-complete 为 295/1838 基线 +6 增量、2130 待审，真实 exit 1。完整 check:docs 仍失败，旧运行未获补真。
- 原报告、实际 23 命令和首轮 harness 错误保原字节；91 成员加 manifest 共 92 原件，外 seal 另列。运输入口为 `docs/ops/evidence/DOCS-REGISTRY-SPLIT-1/raw/central-sessions/expanded-record-correction-nonauthor-fixed-23b/transport.json.gz`；精确双 SHA/范围写入既有 integrity-audit 的 expandedAudit20261018.independentAcceptance。
- 本卡与父卡持续 rework；全量语义/模板、五既有执行隔离和四组旧数字真实性、目录拆分独立执行缺口仍保留。main/done/global 皆 false；本行政接入或任何后继 build 不在固定 23b 报告预授范围。
- 用户指定后续由 Codex 主导通用机制、复杂判断、派发和非作者验收，GLM 做明确范围的逐篇正文与重复劳动；用户手动转发提示词，尚无 GLM 实际执行。具体首包准入独立记录在父卡，不从本限定接受扩大授权。
