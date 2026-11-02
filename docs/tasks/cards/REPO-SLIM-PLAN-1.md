# REPO-SLIM-PLAN-1 仓库瘦身总纲

Status: build
Phase: cross-phase
Capability: repository maintenance
Coding Owner: Codex
Reviewer: Codex（贡献者交付独立验收）；thin_indexes（根编写正文与路径消费者复核）
Visual Verification Timing: N/A（本批为文档树与消费工具）
Last reviewed: 2026-11-02
Template: task-card-v1 / 1.0.0

## 目标

让 Agent 从 AGENTS 的工作分类进入对应薄索引，只读必要的现行规则、知识和任务；开发留痕按需追溯。减少重复正文和维护成本，再按证据减少实际文件体积。当前状态、现行规范知识、过程证据各有唯一职责，不以新增账本代替清理。

## 范围

| 对象 | 做法与边界 |
|---|---|
| 根入口与阅读路径 | 只保留 AGENTS 工作根；知识回领域，索引不嵌整份历史或执行流水 |
| ops 拆分 | tasks 管任务，engineering 管跨阶段规则和指南；迁移全部真实消费者 |
| 开发证据、日志、报告 | 核消费者、独有信息、执行身份和恢复来源，才合并、退役或删除 |
| 代码、测试、依赖 | 实证冗余交既有质量治理；本轮不另做全仓代码删减 |
| 资源、生成物、本地缓存 | 按作者真源、生成链与生命周期另开有限批次，不凭大小删除 |
| 分支、worktree、Git对象 | 核归属、合入关系与可恢复来源；原主工作树未提交改动和未知数据保持原状 |

用户已授权目录整理，并要求所有瘦身工作收齐后再提交PR。当前有限范围包含目录/索引整理及下述三组已核执行集副本；资源、未知证据和其它本地空间仍逐对象核定，不凭本卡批量删除。

## 前提与证据

文档治理等待条件已闭合：[母卡](DOCS-FULL-TEMPLATE-1.md)为 done，[PR38](https://github.com/IllegalCreed/type-pal/pull/38)与[PR39](https://github.com/IllegalCreed/type-pal/pull/39)均已合入。基点为 `159cd0e2f8753536800ba4635e896020a897fddc`；PR39候选与合并主线 tree 都是 `d5eebe0c6213b4e7542fa0138a40943110f6b0d1`，documentation / fast-coverage 必需检查成功。本批复用这一固定树的治理接受，不重开旧工作树的待办统计。

原主工作树仍在 `02a67c5aa639d43813511a552d44a1c4e5a99b78`，72个已跟踪改动中64个与新主线相交、22个涉及治理JSON。正文逐项语义接续；旧登记不覆盖新主线的分片 registry、114逻辑review owner及历史接受。未跟踪的 `data/en/dos_files/`、`win_files/`、`readme.txt`、`sdlpal.exe` 不动。

第一、二阶段行为真值矩阵在本批 N/A：不改产品行为、schema/save或资源。新增文档位置合同和工具路径需单独核真实caller、反控与静态门。最强替代解释是“冗余材料仍是唯一执行或恢复原件”；发现此类消费者就保留并退出删除清单。

## 目录与阅读设计

| 目录 | 唯一职责 |
|---|---|
| tasks | 日常开发与长期任务的目标、计划、准入、状态、验收；看板、卡片、模板及按需追溯的审计/证据/历史 |
| engineering | 跨阶段开发流程、质量、环境和文档维护；规范与指南一致放 guides |
| phase1 / phase2 / phase3 | 各阶段当前产品状态、规范、架构、指南、知识及有效规划；第三阶段候选不等于准入 |
| testing | 跨阶段测试合同、catalog、报告与配对证据 |
| lore | 世界观、人物、剧情、版本和创作；区分已定约束、来源待核与创意候选 |

`AGENTS → 命中分支的薄索引 → 所需规范/知识与具体任务 → 必要证据`。不同工作类型可以组合，未命中兄弟目录不读。索引只放职责、选读条件、下一跳和必要边界；状态不在多个表手工复制。phase-governance 机器存储暂留原位，从 engineering 进入；逻辑归属不要求本批再移动受保护的历史存储。

## 执行顺序

### 首批：根入口、目录拆分与薄索引

Codex / `build allowed`，分支 `codex/repository-docs-slimming`，固定上述主线基点。

| 原位置（docs/ops 下） | 当前目标 |
|---|---|
| README、board | docs/tasks 的同名文件 |
| tasks | docs/tasks/cards |
| templates、audits、evidence | docs/tasks 下的同名分支 |
| archive/tasks/done、cancelled | docs/tasks/archive/done、cancelled |
| archive/tasks/README | docs/tasks/archive/task-history.md |
| archive/protocols | docs/engineering/archive/protocols |
| 其余 archive | docs/tasks/archive |
| agent-workflow、code-quality、document-quality | docs/engineering/guides 下的同名文件 |
| guides/README | docs/engineering/README.md |
| 其余 guides | docs/engineering/guides |

Owner与白名单：根Codex负责物理迁移、总集成、现行目录职责和scripts/docs之外路径消费者；thin_indexes负责旧入口/知识/流程/模板正文接续，继而独立核根编写的有限正文与消费者；inventory负责phase2/lore/phase3/testing/治理入口及文档检查指南；governance_migration独占scripts/docs的位置合同、检查器和定向反控。共享隔离树按文件单写，贡献者停止写入后才搬文件。

1. 衔接新主线与旧改动：AGENTS单根，CLAUDE有用知识回phase1和包说明；保留新文档质量协议。现行规范、知识和状态随功能同提交更新写进[开发流程](../../engineering/guides/agent-workflow.md#功能变更同步现行文档与知识用户-2026-11-02-固化)及模板，无影响须有具体理由。
2. 按映射移动并接消费者：链接、生成器、CI、机器读取和输出路径一起核；原生证据字节不改，历史来源路径与当前物理位置分开。只改链接须由确定性变换证明；正文变化逐篇独立接受，旧review不重签。
3. 精简默认入口：移除README、READ-FIRST和质量规则中的重复历史全文，用固定Git原件按需恢复；纠正治理已done而入口仍rework的冲突。当前合同与历史不靠改标签混同，未实跑的产品范围不宣称已验。
4. 核AGENTS每类路由及组合任务：工作类型→必要规则→领域知识/任务→按需证据；代表路径不要求先读全量卡表、review或raw。检查11类操作/领域路由，保留阶段和授权边界。
5. 稳定窗口运行文档、工具及静态门；按实际结果独立裁定并走受保护PR。移动量与净减重、导航正文缩减分别统计。

### 第二批：已核执行集副本去重

在固定主线 `159cd0e…` 重新逐份核了三组 counterproof-raw 执行输出：20份绿色TSV与不可变counterproof JSON的各相位descriptor、SHA/bytes和Git原件一致。它们不是输入夹具；每次执行身份独立。Codex按该有限范围记 `build allowed`，先MT1四副本试点实读通过，再扩MHB1/BCS1。

| 原任务 | 同内容份数 | 每份字节 | 最多可退副本 |
|---|---:|---:|---:|
| TEST-GLM-REFORGE-MOTION-TRANSITION-1 | 5 | 1,696,096 | 4 |
| TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1 | 7 | 1,645,857 | 6 |
| TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1 | 8 | 1,627,159 | 7 |

已实际移除17份重复工作树载体，毛减少28,049,639字节（约26.75MiB）；各组保留一份baseline内容。净变化须扣除本次合同、恢复工具、测试和唯一证据归档。相同副本在Git中原本共用blob，因此不能声称Git历史也减少同等体积。

20个绿色相位的原JSON、3/5/6个红相位执行集和console、源文件四态哈希均保留；原回执只有整体generatedAt，不补造各相位时间。17条别名分别绑定旧逻辑路径、不可变receipt及descriptor pointer、固定Git blob、SHA/bytes和同组baseline；非白名单缺失不回退。独立反控14项通过；实际17路径均已恢复固定Git字节，公开CLI的MT1恢复输出1,696,096字节与原blob完全一致。

第二批单写Owner：根Codex负责有限别名合同、恢复入口、实际退副本与集成；inventory负责三个producer及共享输出helper/测试；thin_indexes独立核根代码与17条关系，根Codex独立核producer交付。产品逻辑、原红绿判据和不可变JSON均不在修改白名单。

### 附件去重与恢复

本次有限位置/别名由[位置合同](../../phase-governance/document-locations.json)记录，`scripts/docs/document-location-admission.mjs`钉住Owner实际接受的合同。原registry、review和历史JSON不重签、不改路径字段。保留内容缺失、变字节/模式、错误pointer/跨组、旧副本重现或未声明删除均拒绝；读取结束再核一次。

```sh
node scripts/docs/read-retained-artifact.mjs docs/tasks/evidence/TEST-GLM-REFORGE-MOTION-TRANSITION-1/counterproof-raw/final-replay.identity.tsv
```

默认输出原逻辑身份、保留位置、固定源和descriptor；加`--cat`输出已核原字节，可恢复到仓库外的新文件。不能把恢复文件重新放回已退副本位置，也不运行旧反控来重建历史。

三个producer通过共享输出工具整改上游：每个相位仍实际执行；相同TSV按内容hash只写一份，各相位回执独立。`--output-dir`只接受新/空目录，原输出不可覆盖；原红/绿判据与11×3自测段字节不变。真实FS/三个CLI前置及Git中文/空格/双向rename测试17项通过，未重跑产品变异。原失败、复验及独立接收已汇入[唯一验证归档](../evidence/REPO-SLIM-PLAN-1-validation.tar.gz)；归档内manifest把原来源名映射到去重内容，命令、候选、时间和限制按原记录读取。

### 当前账本与过程留痕

[代码质量账本](../audits/code-quality-file-ledger.md)保留唯一846行live表，329,591字节逐字节不变；只将历史日志、35条非live追加记录和双份历史全文移出默认阅读，按固定Git恢复。迁移后候选541,352→333,119字节，减少208,233字节；当前清单3,634，846 closed／0 review／2,788 pending，11个新增工具路径只增加pending。旧counter不因文件退役或历史分层自动结案。

### 后续：状态、历史与资源

- 原看板只列活动分工；原卡未完、待行政收口、被替代与待产品裁决逐项对账，不批量把review改done。
- 当前能力、测试和代码质量继续消费原能力图、catalog与账本，不新建“最新总状态表”。
- 历史退出默认阅读后，再核是否退出工作树；无引用、久、重复或大都不单独证明可删。
- 大资源、基线、生成物、本地缓存和工作副本按完整闭包另做。修产生冗余的上游，让新执行复用已有内容而保留独立回执；未知归属不清理。

## 验收

- **身份与恢复**：固定源提交、旧新路径、原生字节及历史review保持；代表原件实际从Git恢复核hash。旧日期、失败、撤信与未闭合counter不改写。
- **消费者**：当前本地链接、目录索引、生成任务表、真实读写工具、机器登记及CI闭合；冻结引用仍指当时版本，无静默fallback。
- **阅读成本**：单AGENTS根，按需组合11类路由；tasks/engineering/阶段/testing/lore职责明确，默认入口不嵌全量历史。比较同一组导航文件的行数与字节，不把少读必要规则当收益。
- **净收益**：从固定Git树统计普通文件数与字节，扣除新增合同和代码；移动不算删除或释放。工作树、Git对象、本地缓存分别统计。
- **质量门**：`pnpm check:docs`、受影响工具回归、`pnpm lint`、`git diff --check`，硬门error/warning/info零；稳定候选通过受保护PR必需CI后集成。无忽略、降规则或自动hash刷新。
- **事实范围**：本批不授runtime/E2E/视觉、覆盖率或资源重建信用；后续触及相应范围按独立合同验证。

## 状态与交接

目录拆分、11类AGENTS路由、下层薄索引、当前账本分层与17份执行集副本去重已完成本地验收；旧主工作树保持原状。`CLAUDE.md`与`docs/ops`均已退役，AGENTS是唯一工作根。本卡保持build以承接长期后续对象；未创建PR、未推送或合入main，按用户要求等全部瘦身工作收齐后再提交。

完整`pnpm check:docs`已通过：422项工具测试，导航、模型、测试文档、184篇阶段剧情、严格内容与进度均无诊断或待迁项；质量工具45项和lint的6,693文件零error/warning/info通过。输出工具17项、覆盖率工具158项、E2E工具411项、脚本治理22项及七包typecheck按各实际候选复用，相关代码/输入未再改变。中间失败保留原件：旧路径、缺恢复输入、账本计数、import排序及无效intake先读取过大Git差异均已分别修复复验，不改旧失败结论；不授产品变异、浏览器或远端CI信用。

净变化按固定159cd源树对比当前可检出的普通文件，移动不算删除，不计Git历史或忽略缓存：29,184→29,182文件，967,524,405→939681534字节，净减少27842871字节。已计入362,058字节的唯一验证归档（166来源、163独立内容）和新增工具/合同。相同18个导航入口加新工程指南索引由150,663→45,093字节，约减70.1%；另有按需证据全表8,219字节，不默认读取。

本轮为文档门恢复的8份忽略E2E原件在验证后移除，共146,068,324字节；这是本轮临时拷贝清理，不计上述仓库净减量。原持久归档SHA保持，复验前按[恢复指引](../../engineering/guides/documentation.md)还原；只恢复留存字节，不补造执行信用。

剩余代码、资源、未知证据与其它本地空间是长期后续对象，未核消费者前不删，不将其统计为已完成。后续状态、历史或资源工作继续按本纲的有限准入与证据闭包推进。
