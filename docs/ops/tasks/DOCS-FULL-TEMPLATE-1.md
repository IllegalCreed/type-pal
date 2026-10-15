# DOCS-FULL-TEMPLATE-1 — 全 docs 深度治理与模板化改写

Status: build
Phase: ops
Capability: documentation governance
Coding Owner: Codex
Reviewer: Codex（最终独立复核待完成；本轮接入由同一 Owner 自验）
Branch: codex/docs-full-template-proposal

## 目标
在不覆盖共享工作树改动、不把静态治理冒充运行时验收的前提下，核定 docs 全树的文件归属，冻结可审查的统一模板注册表，再按批次把正文迁移为模板合规并为每篇保留可追溯 review record。

## 范围
- 范围内：docs 物理树分类；Markdown/JSON/HTML 的逐篇语义审查；testing 专用类型；artifact/evidence 归属；registry、cross-phase matrix、review records；模板 pilot 后的分批迁移。
- 范围外：产品源码、旧测试、coverage、运行时/E2E/视觉结论；本轮不批量改写正文。
- 明确不做：不删除历史，不将历史结论升格当前事实，不用路径启发式替代全文阅读，不覆盖主工作树四项改动。

## 前提真值门
### 一句话行为 / 工程前提
模板迁移只改变文档结构与导航，必须保留每份历史/机器证据的原始语义、字段、SHA、状态范围和可证伪边界。

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| primary source | docs 物理树包含 3412 文件；Git tracked 3410；候选 Markdown/JSON/HTML 1837 tracked、1838 visible/physical | `docs/ops/evidence/DOCS-FULL-TEMPLATE-1/inventory.json` |
| 第一阶段 | `CLAUDE.md` 要求 docs、历史结论、真值锚点不可被摘要替代；第一阶段与第二阶段边界分明 | `CLAUDE.md`、`docs/phase1/engineering-notes.md` |
| 当前二阶段 | `READ-FIRST` 要求全新重写、显式边界、历史版本不作为当前兼容合同 | `docs/phase2/READ-FIRST.md` |
| 本任务目标 | 先冻结模板/映射并 pilot，再迁移；JSON 机器字段保留 evidence envelope | 用户本轮指令、`docs/testing/governance.md` |

### 反证与替代解释
- 最强替代解释：3412 是把证据目录中的机器回执、日志、截图旁文件和治理正文混为一个“文档总量”；因此不能把用户给的 2085/1385 直接当作当前树事实。
- 什么观察会推翻当前前提：在同一 HEAD 与同一 ignore 规则下，独立脚本枚举得到 2085/1385 且逐路径可解释；或用户明确指定统计只含某一子集。
- 已排查：当前 registry 生成器只扫五个根，漏掉 `docs/testing`、`docs/README.md`、`phase-governance`，且旧 registry 570 全为 governed-legacy；现有 review SHA 与实际文件未发现漂移（需在主树 dirty delta 合入后重核）。

### 用户可见偏离
- 是否主动偏离已核真值：no（用户已批准统计分母，不改变文档语义）。
- before -> after：原文保持结论/字段/历史范围 → 增加统一 envelope、模板章节、证据与边界字段。
- 代表场景：一份 testing `evidence.json` 必须仍能被机器读取，同时通过 test-machine-evidence 模板登记；历史 E2E report 不能变成 verified current。
- 用户裁决：2026-10-11 已批准 1838 份候选、17 类模板和 pilot。

## 上下文锚点
- 已拍板决策：`AGENTS.md` 当前临时模式；大规模 generated rewrite 走完整卡；testing catalog 是唯一事实源；质量诊断必须零。
- 代码/文档锚点：`docs/phase-governance/templates/README.md`、`docs/testing/governance.md`、`docs/testing/_templates/README.md`、`scripts/docs/classify-governed-documents.mjs`、`scripts/docs/check-content-review.mjs`。
- 已知坑：现有 classifier 是路径启发式且只扫五个根；570 旧条目不能代表全 docs；主树四个文件有未提交改动。
- 不得重新引入：governed-legacy 作为完成状态、历史升格当前、JSON 散文化、静态检查冒充 runtime/E2E/视觉/coverage。
- 证据：`docs/ops/evidence/DOCS-FULL-TEMPLATE-1/inventory.json` 与 `protection.json`。

## 验收条件
- 逐文件 inventory、artifact/evidence 归属和统计口径经用户确认。
- template registry 冻结；每类至少一篇 pilot，原始语义与机器字段可回读。
- 迁移后每篇有 review record、source/after SHA、before→after、状态/owner/provenance、primary source、caller、合法输入、oracle、dedupe、history/supersedes、stop line、next step。
- `pnpm check:docs`、`pnpm lint`、`git diff --check` 零诊断；不宣称未运行的 runtime/E2E/视觉/coverage。

## 当前模式推进记录
- Coding Owner / 隔离工作树 / 修改白名单：Codex；全 docs 与必要的 scripts/docs、Documentation CI；按批次登记实际白名单，禁止产品源码/旧测试/coverage 越界；不得覆盖主树其他 Owner 改动。
- 前提核验：verified（用户 2026-10-11 明确批准当前实际树 1838 份候选作为全量分母；inventory/protection 已记录）。
- 范围、设计和验收条件：agree（用户 2026-10-11 批准 17 类模板、testing 专用类型和 pilot）。
- 高风险用户产品裁决：2026-10-11 用户批准 1838 分母、testing 模板和 pilot；正文迁移仍须保留语义与机器字段。
- build 准入结论：Codex build allowed；仅允许注册表冻结、pilot、绑定基线和分批迁移；每批次需独立 review record，未完成不得标 done。

## Draft: 设计与风险
### 设计结论
先以内容审查冻结 docType/templateId/templateVersion；testing 至少拆分 test-catalog、test-contract、test-domain-report、test-e2e-stage、test-run-report、test-machine-evidence、quality-gate（若现有质量门正文确实存在），再与通用十类模板建立映射。每类先做 pilot，之后分批迁移；机器证据使用 envelope 而非 Markdown 化。

### 已知风险
- 统计范围冲突会导致错误的完成分母；缓解：并列 tracked/visible/physical 清单，按用户裁决固定 1838 份候选。
- 路径分类误判语义；缓解：全文阅读和 pilot 反证，分类器只作候选。
- 共享工作树污染；缓解：隔离 worktree，主树四文件只读保护 hash。
- 链接/索引批量变更破坏；缓解：批次后 check:docs 与悬链扫描。

## 下一位 Agent 提示词
无下一位 Agent 提示词；Codex 继续执行冻结注册表、pilot 和分批迁移，最终仍需独立验收。

## 用户裁决记录

- 2026-10-11：用户批准“全量分母以当前实际树 1838 份候选为准，其他的都批准”。

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件：模板 registry v2、17 个 testing/通用模板合同、1838 条 binding baseline、17 个 pilot source anchors 与可回读候选、任务导航。
- 实现摘要：冻结 `content-document-template-registry-20261011`；Markdown pilot 以 `.md.raw` 证据保存原正文；JSON pilot 以 envelope 保存完整 payload 并完成 deep roundtrip。
- 运行命令：`node scripts/docs/check-content-review.mjs --strict`（PASS，仍只覆盖旧 570 registry）；`pnpm check:docs` 的 docs/tools/check/testing/phase-lore 均 PASS。
- 浏览器 / 手工检查：N/A；本阶段仅静态文档治理。
- 跳过的检查及原因：最终 `check:docs` 在 content-review 阶段因候选分支新增导航文件尚未合并到旧 review ledger，报告 3 个 after SHA drift；不是正文语义通过。`pnpm lint` 尚未运行。

## 2026-10-11 Pilot 原记录（已被 2026-10-15 复核收窄）

- 17/17 模板候选生成，17/17 原文保留检查通过。
- Markdown 候选：源正文作为 byte-preserved body substring 保留；canonical 文件未改写。
- JSON 候选：payload deep roundtrip 保持机器字段；canonical evidence 未改写。
- Pilot 只证明包装结构与字段保留，不证明 runtime、E2E、视觉或 coverage。
- 下一批：先更新完整 registry/review ledger 的新 schema，再按 domain 批次逐篇正文迁移。

## 2026-10-15 指南接入与持续目标

- 用户明确要求：参考其 `agent-doc-architecture` 指南进一步治理；随后要求设定目标，按指南完成全量治理。已建立持续 active 目标，无额外 token 预算。
- 指南锚点：`IllegalCreed/agent-doc-architecture@169fc3d04f86ededf567e2b9d0417497ed7ef775`，四篇正文与 SKILL/references 已读；[项目适配](../guides/documentation-model.md)保留本项目状态机、测试排重裁决和零诊断要求。
- 同步 main：候选合并 `f98d0ddd89ebdee7b04502ee35de26ee82c6d246`，解决 board 冲突时保留实体状态 review、回合测试 rework 及本卡 build；没有改主工作树。
- 前提重新核定：1838 是 2026-10-11 固定必审 cohort，后续新增/变化另记。旧 570 ledger 不能覆盖全量，也不能作为模板迁移证明。
- Codex build allowed：入口/模型/写回检查及有效 pilot；同类 pilot 未通过前不得批量迁移。
- [旧 pilot 复核](../evidence/DOCS-FULL-TEMPLATE-1/pilot-assessment-20261015.json)：17 个回读样本均不算模板迁移验收。JSON 搬进 payload 也没有证明既有 consumer 可读；`.md.raw` 不构成链接修复。旧结果保留历史，accepted pilot 回到 0。
- 已实改：docs 总入口、治理入口、模板入口；新增项目文档模型；AGENTS 加 7 条操作路由，CLAUDE 先转发；修正文档维护当前看板链接与稳定路径规则。
- 新增结构门：操作行必须真实存在、必读链接有目标；迁移正文检查真实章节，代码样例和空标题不算。JSON 的必填字段保持顶层，不因 envelope 绕过 consumer。
- 验证与审查记录：本轮为 Owner 自验；无 runtime/E2E/视觉/coverage 新通过结论。最终独立复核、全量门及 main 集成仍未完成。
- 下一步：更新逐篇 review/SHA 与增量 inventory；以真实短文分别完成模板 pilot，再按职责批次全文迁移。全量完成前不标 done，不把入口接入当作全部交付。

### 2026-10-15 本批验证与后续锚点

- 54 项 docs tooling 回归通过；docs 链接/索引、testing、phase/lore 以及 content review 全部零问题。本轮 ledger 是旧范围加四篇实际改写的 574 条，不是全量验收。
- 新结构门通过 7 条操作路由和 4 篇正文合同；无效 wrapper、代码围栏中的假路由、缺目标和 JSON payload 包装反例均被拒绝。
- 全仓 lint 零 error/warning/info（4056 个已核文件），`git diff --check` 通过。过大 inventory 分成 9 片，3412 条逐项回读相等，不改规则、不加 ignore。
- 1838 基线全部仍在；本次增量快照见 `delta-inventory-20261015.json`，23 份基线 hash 已变、新增 88 份候选（快照写入前）。它们分别待核，不从旧账继承 reviewed。
- 有效 pilot：当前治理入口的 governance-index 与新项目模型的 guide-runbook 已有实际内容/结构检查和全文 review；其余类型仍待选真实代表、核 consumer 与历史边界。旧 17 个保真样本的 counter 不因结构门绿而闭合。
- 下一批具体入口：先核 `docs/ops/agent-workflow.md` 与根入口的历史协议分层、目录 README 的事实权；再分别核 testing catalog/contract/stage/report/machine evidence 与 HTML 的实际 consumer。未读文件不得由批量脚本填写内容结论。
- 持续目标保持 active，任务保持 build；原 1838 全量与增量尚未完成，未推 main，最终独立验收待实施完成后执行。


### 2026-10-15 第二批：现行协作与真实 pilot

- 完整核读并分层根 AGENTS 与工作流：L0 为 45 行，现行 workflow 约 100 行，旧全文保存在两个带 source SHA/Git blob 的 archive-record；相对链接重算，引用逐行可回读。
- 实改 ops 总入口、任务说明、模板说明与历史入口。任务 README 的原 task-card 误分类纠正为 governance-index，所有当前看板入口指向实际 board，不再指历史快照。
- E2E-001 stage 补四个必填章节；report 保留全部原段落与标题锚，按 Scope/执行/结果/证据/history 分组。没有改原 YAML、testing-meta、catalog 状态、lastVerified、candidate/version 或原执行结论。
- 已先写设计补充再引入 test-machine-evidence 1.1.0 的 document-audit-v2 变体：原 document-audit 顶层对象全部不变，只增 governance envelope；actual paired consumer 零问题，performed 仍 false。拒绝把 source audit 变 execution、错 variant 或 payload 包装的反控已加入 docs tooling。
- 55 项 docs tools 回归、全部文档检查和 15 篇已迁移正文合同通过；旧 17 个回读样本仍为 counter。有效类型为 governance-index、guide-runbook、archive-record、test-e2e-stage、test-run-report、test-machine-evidence；其余类型必须先做真实 pilot。
- 进度命令：`node scripts/docs/report-governance-progress.mjs`。它只从实际 review、after SHA 和正文合同投影，不生成内容结论。最终必须另跑 `--require-complete`，当前预期仍非零，不能用局部 check 绿色宣布全量完成。
- 下一批：选择真实 task-card、audit/evidence、design/plan/reference/narrative 和 testing contract/domain/quality/canonical catalog 代表，按正文判断类型并验证 consumer；之后再扩大同类迁移。
- 本批检查：check:docs 的 55 项 tooling、全部链接/索引/testing/阶段与 580 条已登记 review 通过；lint 核 4062 文件，零 error/warning/info。新增引用快照在 staged diff 检查发现空行尾随空格，初次提交未被失败阻止；本地补丁立刻修正并更新回执/历史，必须复跑后才记最终 diff 通过。全量完成门仍因 1919 份当前候选待迁移而拒绝，未合 main。
- 追加发现并修源：全分支 diff 还发现旧候选模板空 bullet 尾空格及任务索引 EOF 空行；按实际差异修正，不放宽规则。核检查器时发现它仍强制 done/cancelled 移目录，与指南的稳定路径冲突；改为允许终态卡原地保留，但归档目录必须与终态匹配，活动卡仍不得放历史区，终态仍不得留看板；追加新工具回归，不改既有测试。
- 修正后的最终结果：56 项 docs tooling 与全部 check:docs 通过；lint 4062 文件零 error/warning/info；`git diff main --check` 对整个候选分支通过。此前本地 diff 失败保留历史说明，不改写成初次通过；未合 main，持续目标仍 active。

### 2026-10-15 第三批 pilot 设计与范围

- 本批实际核读：E2 旧巡逻轻量卡、2026-09-24 worktree 清理审计、onEnter 数据面探针、SAVE12 现行规范、2026-05-30 opcode 剩余计划、DLC 创意池、第三阶段美术参考、Reforge menu-session 域报告；逐篇迁移，不按旧 classifier 的路径类型授权。
- 历史 task-card/audit/plan/reference 同时承担原类型结构与 archive wrapper 五项合同：历史范围、原始结论、当时证据、当前有效性、继任文档。它是附加历史约束，不新增第 18 类、不减少各自必填章节。
- 当前 SAVE12 规范先核 types.ts、current-codec.ts 与 character.ts 的 12/22 常量；其余原恢复/续跑合同保留源码与原任务证据，不新增运行时通过。艺术参考旧模型/API、法律断语只保留为历史输入，不作为本次已核的当前事实；onEnter 探针的无 goto/BFS 下界保持显式。
- 最强反例：若重排丢原段落/日期/数字、让历史 done/测试数变成当前验收，或把 lower bound 变全库结论，则 pilot rework。历史 overlay 与真实 consumer 要同时检查。
- 已完成 8 篇代表及跨阶段矩阵正文迁移与逐篇 review；当前累计基线 20/1838、增量 4，14/17 类模板有实际 pilot。1912 份当前候选仍待完成；旧 ledger 583 条只表示既有审阅范围，不能代替全量模板迁移。
- 校验：58 项 docs tooling、7 条路由/24 篇正文合同、全部链接/testing/阶段/content-review 通过；lint 4064 文件零 error/warning/info；全分支 diff 检查通过。初次 lint 的 helper 命名及一个 review JSON 格式诊断已修正后复跑，未放宽规则。
- 修复阶段索引生成器：只从权威 catalog 投影，不再按路径重授状态或改写 catalog；新增反例验证历史/草案状态不会因路径名被升格。
- 尚缺 test-catalog、test-contract、quality-gate 三类有效 pilot，下一批先核实际正文和消费者。没有运行或新增 runtime/E2E/视觉/coverage 结论；未合 main，任务和持续目标保持 active/build。

### 2026-10-15 第四批 pilot 设计与停止线

- 实际全文读取 E2E 跨阶段合同及 E-06 质量修复回执。前者按问题/合法输入/caller-oracle/排重限制/revision 重排，保留 testing-meta、原 YAML、全部用户裁决和历史执行范围；原“当前 SAVE10/content21”等旧状态必须显式标历史，不能覆盖当前 SAVE12 源常量或替代正式片段报告。
- E-06 使用 quality-gate 五节及历史 overlay。原 240/50/13 → 0/50/11、6176 测、5691 fast 测与 CI 结论完整保留；2026-09-27 后零诊断规则另列，历史成功不成为现行放行。引用原文保留为历史技术判断，不重新认证旧外链或既有代码例外。
- test-catalog 当前 registry 的 markdown 格式与实际 JSON catalog consumer 不匹配，属于待修合同，不计有效 pilot。须先补 canonical JSON 结构/envelope 设计并冻结版本，完整核读全部 entries，验证原字段 deep equality 和真实 consumer 后才计入完成；本批不因路径/标题自动赋审阅结论。

### 2026-10-15 第四、五批 pilot 收口

- 实际完成 E2E 跨阶段合同、E-06 历史质量门、JSON catalog、testing 模板入口四篇新增迁移，模板根入口同步当前 JSON 合同。累计基线 **24/1838**、增量 **4**，当前 **1913** 候选待迁移；586 条旧+新 review 不能当作全量模板完成数。
- 17/17 类已有真实 canonical pilot，registry 由 frozen-for-pilot 转 frozen-for-migration；test-catalog 1.1.0、test-machine-evidence 1.1.0，其他1.0.0。新增 HTML/JSON 格式变体仍须先写设计并核真实 consumer，不因类型已有 pilot 自动支持所有格式。
- Catalog 18 条/全部字段全文已读，3 份配对报告与实际 caller 核对发现四个分类字段错误：两个 editor engines、D1 phase/engines；旧值有留痕，可逆恢复后完整对象 deep-equal。candidate/revision/versions/status/lastVerified/reviewBy 均不变，三种真实消费者零问题。
- E2E 合同原九章、全部用户裁决、YAML 与 testing-meta 完整保留；旧 SAVE10/content21 状态就地历史化。E-06 的 0/50/11、首次失败与 CI 补查按原结论保留，不能作为当前零诊断通过。
- 本批 60 项 docs tooling、7 路由/28 篇正文合同及完整文档门通过；lint 4069 文件零 error/warning/info。没有新 runtime/E2E/视觉/coverage 结果，没有修改产品/旧测试/coverage；未合 main，目标继续 active，卡保持 build。
- 下一批已全文读的入口：editor command-form-families、editor map-workspace-sessions、phase1 dependency-ownership 三份域报告；尚未改写/计数。继续逐篇审阅和 machine envelope/HTML consumer，治理基础设施的自引用 SHA 需采用无环外部回执/Git 对象定位，不能伪造自哈希或给新增元数据静默豁免。

| 类型 | 有效 pilot canonical（均有 review/SHA/合同校验） |
|---|---|
| governance-index | docs/README.md |
| task-card | docs/ops/archive/tasks/done/E2-patrol-templates.md（history overlay） |
| guide-runbook | docs/ops/guides/documentation-model.md |
| audit-report | docs/ops/archive/audits/worktree-retirement-2026-09-24.md（history overlay） |
| evidence-receipt | docs/ops/evidence/TEST-GLM-GAME-EVENT-STATE-OPCODES-1/onenter-walk-reachability.md |
| design-spec | docs/phase2/specs/save-system.md |
| plan-status | docs/phase1/plans/2026-05-30-opcode-2-remaining.md（history overlay） |
| reference-canon | docs/phase3/reference/art-pipeline.md（history overlay） |
| narrative-idea | docs/lore/dlc-ideas.md |
| archive-record | docs/ops/archive/protocols/three-sages-20261015.md |
| test-catalog | docs/testing/catalog.json |
| test-contract | docs/testing/e2e/contract.md |
| test-domain-report | docs/testing/domains/runtime/menu/menu-session/report.md |
| test-e2e-stage | docs/testing/e2e/stages/001-opening/README.md |
| test-run-report | docs/testing/e2e/stages/001-opening/report.md |
| test-machine-evidence | docs/testing/e2e/evidence/e2e-001.json（document-audit-v2） |
| quality-gate | docs/ops/audits/pre-e2e/quality-gate-remediation.md（history overlay） |

### 2026-10-15 首个同类型后续批次：三个域报告

- 已继续完成 editor command-form-families、editor map-workspace-sessions、phase1 dependency-ownership；原四节全文、YAML、testing-meta、candidate/历史版本和全部旧结论保留，新增具体 claim matrix、合法输入、阶段与 quality scope。
- 阶段分别为 phase2/editor、phase2/editor、phase1/game，不从统一 publication 元数据的 content/SAVE 轴推导一阶段行为或旧档兼容。原“remain legacy”按原审计日期读取，工具当前位置/清理状态须逐项另核。
- 三份实际 paired consumer 均零问题，保留回执纳入现有 catalog pilot receipt；没有为了计数创建平行报告。累计 **27/1838 基线 + 4 增量**，17/17 类型、31 篇实际正文合同；当前仍有 **1910** 候选未完成，旧 ledger 589 条不代表589篇迁移。
- 60 项工具测试、完整 check:docs 与本批静态门通过；动态、视觉、旧反控和 coverage 未运行。下一批核这三份 paired evidence 的全部JSON字段，再做独立 envelope/consumer/历史边界迁移；不能从报告模板通过自动授予其证据 reviewed。

### 2026-10-15 分派：历史任务卡包 A

- 依据 AGENTS 当前临时模式与 agent-workflow 的隔离交付规则，Codex 分派一位贡献者并在接收时直接核原文、差异与静态门；不恢复固定席位或三签。
- 基础候选：`85a419afa17793e13b9700b7064bd8d818d57118`。贡献者只写下列10份归档卡和单独交付回执；不写共享 registry/routing/board/catalog/任务索引、不合 main。
- 白名单：TEST-GROK-BOOT-RESOURCES-MEDIUM-1、TEST-GROK-RENDER-HOST-LARGE-1、TEST-CURSOR-ASSET-UI-LARGE-1、A5-project-export-zip、TEST-KIMI-SCRIPT-LIFECYCLE-MEDIUM-2、TEST-CURSOR-SCRIPT-PREVIEW-MEDIUM-1、TEST-KIMI-CURRENT-CONTINUATION-MEDIUM-1、DOC-TESTING-ARCH-1-testing-document-system、EDITOR-SCRIPT-CARD-UI-1-step-selection、TESTING-DOC-LAYOUT-1-clean-root，均位于 docs/ops/archive/tasks/done/。
- 前提/准入：已批准 task-card 1.0.0 及历史 overlay 有有效 pilot，允许逐篇真实阅读后迁移；原 Owner/状态/日期/数字/counter/用户决定保持原义。历史 build/测试/清理措辞不授权当前产品动作；文档静态迁移可 build allowed，内容关键冲突则该卡保持候选/返工。
- 独立接收与中央 review/registry/SHA 写回仅由本线程 Codex 操作；未接受前不计入全量完成数。根线程同时负责三份机器证据，文件互不重叠。

### 2026-10-15 域报告/证据与历史收口：本线程实施

- 已全文核读并迁移7份配对document-audit JSON、4份runtime域报告、有限接收历史导航及TEST-FROZEN-CLOSE-1统一卡，共13篇。JSON移除envelope后全部原字段/value保持，performed=false与缺raw/artifacts不变；7组真实paired consumer零问题。
- 直接读取各report所指sourceRef范围，修正6处正文旧行号（ActiveScene/camera、BattleHost/finishWorld、WorldMotionRuntime），原映射/Git blob留在回执。发现readiness测试37–60包含as unknown as BattleState，明确为测试质量待审，未越权修改旧测试或宣称accept。
- 跨域矩阵现登记14条关系，新增source出版与测试质量准入的guarded边界、6处已解释导航更正；registered rows不是全docs穷尽。旧E-06行的表格空行亦修正，未改变历史计数。
- 贡献者疑似finite README断链经根线程实际路径解析反证为有效，未错误改链接；该短入口现已治理成具体archive记录。统一有限收口卡保存19204/18795、原用户裁决/输入/退休/CI范围，不重开旧清理。
- 当前累计40/1838基线+4增量；60项工具测试、44篇正文合同、全部check:docs与lint4071文件零error/warning/info通过。首次统一卡误用“验收条件”标题被结构门拒绝，改为冻结合同“验收”后复跑通过；未降规则。
- 历史卡包A已由贡献者提交c86b92dffd8d66bfdc0541f03d6e2150d7bb04cc，尚待本线程完成独立接收/中央账写回，不提前计数。主树未写入，未合main；持续目标active，任务build。
