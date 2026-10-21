# DOCS-NATIVE-JSON-1 — 原生JSON历史证据逐篇治理

Status: build
Execution: build（GLM只读内容交付；原生字节与中央待办保持）
Phase: ops
Capability: native historical evidence governance
Coding Owner: GLM（逐篇语义、来源核实与自验）
Owner: Codex（合同、准入、独立证据验收与中央接入）
Reviewer: Codex（非作者证据验收；作者自验不代签）
Branch: codex/docs-s26-glm-native-json
Last reviewed: 2026-10-21
Template: task-card-v1 / 1.0.0

## 目标

承接[全量父卡](DOCS-FULL-TEMPLATE-1.md)的S26大包，让GLM完成269份原生Vitest历史结果的逐篇内容治理稿，并核清30份来源/格式例外。Codex复核证据后才决定新增路径合同、中央字段及迁移信用；此卡复用长期[文档验收协议](../document-quality.md)，不另造通用规范。

## 范围

- S26内容白名单269件：S21/F01中原13字段形态且SHA匹配33cc冻结绑定的272件，扣除S25三篇pilot。269件逐篇核全部原生字段、断言/失败、实际相位、producer/consumer、历史继任与信用边界，交具体review草稿。
- 来源例外23件：无33cc冻结绑定成员，查真实Git载体、引入/移动/生成链，交来源提案或明确unknown；不自行续pin或套用固定源合同。
- 格式例外7件：4件短摘要、1件含进程信息摘要、2件附distillation；读字段职责与实际consumer，交格式选择与反例提案，不能强补13字段。
- S25三篇仅作只读校准，原生SHA、既有review及pilot接受不重写；不把它们算成新增269件。
- 唯一写入域是`/tmp/s26-glm-evidence/`。仓库内正文、中央review/registry/routing/catalog/matrix、任务卡/看板/索引、模板/规则/共享配置、产品/旧测试/coverage及冻结证据一律只读。不生成新的canonical JSON/sidecar，不改原生格式或把字段搬进payload。

## 前提与证据

### 前提真值门

| 维度 | 当前事实与边界 | 直接依据 |
|---|---|---|
| primary source | 固定33cc绑定保持1838项；本批269件当前字节匹配绑定，当前/33cc Git树实际blob身份相同。结构与身份不证明语义已读。 | [冻结绑定](../evidence/DOCS-FULL-TEMPLATE-1/binding-baseline.json)、S26 execution-manifest |
| 第一阶段 | 本卡只解释历史输出；不重授原机制/测试有效性，不改第一阶段源码。 | [阶段入口](../../../CLAUDE.md)、各原卡/回执的实际时点 |
| 当前二阶段 | 原生日志可能记录旧editor/reforge候选；原始success与失败只属其候选，不恢复退役测试或授当前运行信用。 | [READ-FIRST](../../phase2/READ-FIRST.md)、各原生文件与后继文档 |
| 本卡目标 | 已校准的原生格式保留原字节，具体治理内容复用唯一review；贡献者写稿，Codex核证据并处理通用合同。 | [S25设计](../../phase-governance/templates/registry-proposal-20261011.md#2026-10-21-s25原生vitest历史输出合同)、[当前流程](../agent-workflow.md) |

最强替代解释：相同字段形态可能分别属于原始绿、变异红、恢复、重放或污染探针；相同fullName或success值不能认定重复/通过。若原源、phase/caller、字段角色或后继信用冲突，仅停受影响件，列counter及解除条件，继续无关件。23份无绑定不等于不存在Git原件，也不表示可以从候选自动认证历史来源。

### 固定交接身份

- 载体基点：`4469e2e8434f736df2ce39cdc2863f0822fa7fa8`。派发候选为本卡提交后的Owner准入提交，完整HEAD由转发提示词与真实命令提供；不把载体/原源当已验候选。
- 来源根：`33cc2df50c7279d2750ddad4fcf6c373b7b2bda3`。现有S25实现仍只准三篇；269件交付是内容提案，不声称当前model已经接入269条路由。
- 授权包：`/tmp/type-pal-S26-GLM-native-json/execution-manifest.json`，SHA-256 `2a221f1d96184df9213061f0d6acffb33c9287c6c91b635f643ba3cbe83c2fe9`。269/23/7逐篇path、before SHA/字节、实际carrier blob、已知source、原唯一review位置均在该包；不另复制原对象。此清单在父卡既有单份压缩日志S26交接段保全，可按SHA恢复。
- 使用既有隔离工作树`/Users/zhangxu/.codex/worktrees/docs-archive-navigation/type-pal`，新分支`codex/docs-s26-glm-native-json`；旧S21分支保留。HEAD/status与清单不符先停，不reset/stash/覆盖；node_modules软链保留不提交。

## 验收

- 协议版本为document-delivery-acceptance/1.0.0。GLM作者nonAuthorReviewer=false；Codex据实作独立裁定，普通项不重复全文治理，高风险或矛盾定向展开。
- 269件逐篇有ready或blocked结果，包含具体coreConclusion、实际readDomain、原生witness指针/原文/含义、真实相位及依据、来源/字段角色/合法治理输入/oracle、排重、继任/撤信、停止线/下一步与before→after。不能只写标题、类型、状态、行数或数值换名模板；parser不能生成语义结论。
- 7/23例外交付30条独立分析，未知不补造。不得为了固定合同改文件、伪造schema2/id/执行字段、把运行结果放进legal input、把未跑项作为oracle或从success推导exit/零warning。
- 固定原生字节、source/blob/候选身份均实取。每条至少两处可核原生锚；失败/跳过/collection/污染反控/恢复均如实解释。相同输入的既有语义可复用，但必须记录来源及本篇新增相位/差异的实际读域，不虚报第二次全文。
- 逐篇稿按小于512KiB分片，唯一review-index管理269条；exception-records管理30条。旧canonical记录通过固定Git/path引用，不复制整张旧表；不自嵌hash、不重复保存原始JSON内容。
- 自验使用授权包`verify.mjs`核全部来源/只读、稿件集合/原文锚/字段与身份；真实命令回执含argv/cwd/UTC起止/exit/signal/完整输出及工具/输入指纹。全包结束后集中回交，不逐批请示。
- 本批仓库只读，不重复跑已有效的208工具/整仓门、产品/E2E/视觉/coverage或旧反控。当前model的1271合同不代表269件已接入；中央合同适配和必要组合门由Codex负责。父卡硬验收未过不合main、不推main、不标done。

## 当前模式推进记录

### Codex准入

- 用户已明确Codex主导通用设计、GLM承担逐篇和重复工作、Codex据证验收。此前将“这部分你来做”外推到批量执行的判断收回；S24/S25是Codex写合同才请GLM非作者审，不改变后续大包职责。
- Codex build allowed：GLM按固定清单进行269件内容草稿＋30件例外分析，内部自行分段，最终一次交付；仅`/tmp/s26-glm-evidence/`可写。未知只block受影响件，不代签不越界。
- 这不是批量恢复reviewed/template-compliant的授权。S24/S25原三件各自状态及两项来源unknown不变；原源/路由/模板/中央记录的新增或改动须Codex核准后实施。
- 本卡新增一份调度文档，因此注册计数单列增加1，pending诊断增加2；不是原1194件新增缺陷，也不改变1838分母。不为每个内部小批再建卡/ledger。

### 独立接收与停止线

- GLM逐篇稿/自验：pending；候选仓库身份预计保持准入HEAD，无内容提交并非缺失，因为原生字节不可改写。
- Codex证据验收：pending；充分支持的单篇可保留，counter只退受影响claim；系统性失真才扩大复核。
- done准入：blocked。用户体验验收N/A（不改产品行为）；本卡不授任何旧运行、当前产品/E2E/视觉/coverage信用。

## 设计与风险

GLM读原生文件及其实际上下文，将历史观察和当前适用性写成可核稿件；Codex接收后复用既有record位置处理准确delta，不再让贡献者修改共享账本。269件原生合同复用S25基础；新增路径/相位/当前review关联仍须由Owner实现并验证，30件例外不混进该合同。提供的机械工具只验身份、集合与原文锚，不认证阅读深度或业务正确性。

## 状态与交接

- 当前Owner：GLM执行稿件与自验，Codex维护准入和中央接入。未交付前不宣称269已审/已迁移。
- 稳定交接入口为授权包中的`INSTRUCTIONS.md`和本卡；进度保存在证据目录review-index/已落盘分片，不依赖聊天记忆。工具/清单hash及原件必须可核；指纹全由程序实取。
- 下一步：用户将下方提示词一次转交GLM；其内部8–20件一段，无需每段往返。中断续办先核候选/输入指纹和实际分片，再继续pending集合；每回合给自含续办或最终Codex回信。

## 下一位Agent提示词

```text
你是type-pal的GLM贡献者，执行DOCS-NATIVE-JSON-1 / S26一次性大包。
先读 /tmp/type-pal-S26-GLM-native-json/INSTRUCTIONS.md、AGENTS.md、docs/ops/document-quality.md、docs/ops/tasks/DOCS-NATIVE-JSON-1.md。
按转发提示词中的完整准入HEAD核分支/工作树；execution-manifest.json SHA应为2a221f1d96184df9213061f0d6acffb33c9287c6c91b635f643ba3cbe83c2fe9。
269件逐篇内容稿＋23来源/7格式例外分析，唯一写入/tmp/s26-glm-evidence；仓库及三篇pilot只读。
逐篇具体结论、实际读域、可核原文锚与历史边界；内部自行分段并一次回交。用verify.mjs自验并留真实回执，不改中央或原生字节，不伪造执行/阅读，不合main、不推送、不标done。
```
