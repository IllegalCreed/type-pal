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
- 范围外：产品源码、旧测试、coverage、运行时/E2E/视觉结论；正文仅在用户批准合同及对应真实pilot后分批迁移。
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


### 2026-10-15 历史卡独立接收、状态合同返工与两份报告

- 根线程全文核原10卡、作者候选及回执，逐卡核具体结论、Status/Owner、原文严格逆回读和source/候选/接收后SHA；独立接收历史卡包A。c86b92d原作者pending回执留作历史，接收后中性治理Owner及中央账另记；不把贡献者自验当独立验收。
- history_cards_a独立审根线程d0fc80e的13篇迁移：语义/原字段/原文保真accept，但提出C1状态合同counter。先追加设计，再冻结domain-report1.1.0与machine-evidence1.2.0：catalog-publication与execution分轴，catalog按唯一id决定发布投影，默认execution拒绝current。16篇仅同步已读合同/版本，menu补缺失publication Status，不计新增迁移。
- C1b真实HTML pre/lazy quote与C1c四空格Status/假H1反例依次暴露解析边界，均保留返工记录。现只读H1后首个独立元数据段并保留语义缩进，四反例拒绝、八篇正例/真实消费者通过；独立Reviewer对冻结范围C1/C1b/C1c签accept，工具/测试/registry精确SHA在本批回执，未改原catalog状态/JSON字段/performed=false。
- 根线程新增脚本卡UI历史回执与finite-intake审计两篇迁移，分别按evidence-receipt/audit-report加历史overlay。原文逐字节逆回读、具体typed章节和历史边界由非作者独立accept；09-28UI、10-03筛选/计数/撤销反控与后继统一封板不可混为当前动态通过。矩阵现16条已登记关系，仍非全量穷尽。
- 累计52/1838基线+4增量、当前1888候选待迁移；603条旧+新ledger不等于603篇迁移，仍有547条governed-legacy。63项文档工具测试、7路由/56正文、check:docs全项、lint4072文件零error/warning/info、diff检查通过。首轮两个本批JSON格式诊断已修正复跑，未降规则。
- main工作树未写入；候选保留build，持续目标active，未合main/推main。没有产品源码、旧测试、coverage改动或新runtime/E2E/视觉结论。最终全量独立复核仍待；下一步继续逐篇处理剩余候选及artifact归属，不能由局部门绿提前done。

### 2026-10-15 分派：历史任务卡包 B

- 基准b08554e61c7818a8e1d23ecdd7636ae78e4a4666；复用已核干净的隔离worktree，切新候选分支codex/docs-history-cards-b，不改根线程/main。Coding Owner为贡献者history_cards_a；根线程为独立接收者。
- build allowed仅为10张已存在归档卡的task-card1.0.0+history overlay语义迁移与单独候选回执。白名单：A4-own-sprite-upload、ARCH-F2-DS-LABELS-1、ARCH-F2-DS-OVERFLOW-1、ARCH-F2-EDITOR-BATTLE-FIELD-COMMANDS-1、ARCH-REFORGE-BATTLE-1-host-lifecycle、ARCH-REFORGE-FRAME-1-clock-and-input、ARCH-REFORGE-MENU-1-session-controller、ARCH-REFORGE-SCENE-1-resources-and-preflight、AUDIT-TEST-QUALITY-1、B10-poison-structured-editor，均在docs/ops/archive/tasks/done/。
- 必须全文读原卡及相关直接来源，再写具体目标/范围/前提证据/验收/状态交接和五节历史overlay；完整原文、Status/Owner/日期/数字/counter/用户裁决保留，不执行旧prompt或恢复退役工作。未知实施/视觉/raw继续unknown，不为模板补造。
- 只允许上述10个Markdown和docs/ops/evidence/DOCS-FULL-TEMPLATE-1/contributor-history-cards-b-20261015.json。禁止写共享registry/reviews/routing/catalog/board/index、产品源码/旧测试/coverage；未独立接收前不计进度、不合main。
- 交付须有逐篇源Git blob/source/after SHA、具体结论/历史冲突与继任范围、完整原文回读、真实检查结果和限制；根线程直接读源/候选/一手证据决定accept/rework并更新中央账。无用户搬运环节。


### 2026-10-15 后续五份机器审计：正文迁移候选

- 根线程全文读menu-session、e2e-contract、e2e-route、e2e-common-issues与legacy-flat-audit五份JSON，直接核18个不同source范围/全文件SHA/anchor；classifier额外全文读。统一machine1.2.0 document-audit envelope保留全部原机器键值、status/candidate/versions/history/performed，五组inverse object及真实paired consumer均通过。
- 明确proposal不晋升、共用合同新增NPC入口检查不冒充runner实现、common-issues JSON的日期级源审计不继承canonical后续10-11重录声明。未全文读的canonical路线/共性报告与三个migration ledger不计迁移/全文审查；不能从配对consumer绿推导它们完成。
- classifier实际以Boolean(movedTo || closeout)决定reviewed；正文源路径主导/filename规则仅作分类。本次把旧359/331/209/122的口径和该自动状态含义写入envelope、逐篇review与第17条guarded矩阵，未重跑生成器，也不继承旧零待审或artifact全量完成信用。
- 当前真实正文迁移投影57/1838基线+4增量、1883候选待迁移；这五篇待包B贡献者完成后的非作者独立复核，不提前宣布整包验收。包B十卡仍独立候选，不计入上述数。
- 五篇源/after SHA和逐篇限制在本批followupMachineAudits；保持build/目标active，无main写入或产品/旧测试/coverage变更。后续继续逐篇/格式合同/附件归属与全量独立审计。
- 本五篇候选静态门：63工具测试、61正文合同、608旧+新内容review条目及完整check:docs零问题；lint4072文件0 error/warning/info、diff检查零诊断。全量最终独立审计仍未完成。


### 2026-10-16 包B独立接收与五份机器审计闭合

- 包B作者候选b8c8fa4fe37621ac9a1461e30945c6073fb4fccb只含白名单10卡+回执，根线程全文核10原文/全部新章节/完整回执，直接全文读取标签、overflow、战场命令、帧与场景五份历史回执，以及此前已核BattleHost/Menu/finite/统一卡。10组source/blob/candidate/header/原文逆回读和task+archive合同通过；cherry-pick为bd135000c。
- 根独立accept仅文档：A4真实FSA仍缺烟测、B10用户观感仍待复验；F2窄拆与A1/A2/A3子段不变成全队列完成。旧warning、首轮失败、普通Error针被拒、mock与真实源加载针、confirm宿主替身及fdad/ad16不同CI候选范围逐项保留。
- 作者候选回执保持原pending身份；canonical治理Owner/交接改成根已接收。另核并同步包A十卡残留候选时态，不改变原产品Status/Owner/quote、不新增迁移数；20/20原文严格逆回读及实际after SHA重新通过，旧source/hash历史保留。
- history_cards_a对根c1c4ba289b44ad060cb4c5f3ab881a5412f229cd五机器JSON作非作者独立accept：全文5原/新JSON、5中央记录/回执，5严格逆对象、18源范围/hash/anchor、5真实consumer/唯一catalog id与scoped model通过；无counter。不核未全文canonical/完整migration ledger、runtime/E2E/视觉/coverage。
- 当前67/1838基线+4增量，1874当前候选待迁移；608旧+新账本条目不等608篇迁移，537条governed-legacy仍未闭合。63文档工具/71正文合同与完整check:docs通过；lint4073文件0 error/warning/info，diff检查通过。未写main、产品源码/旧测试/coverage，目标active、任务build，未全量完成。
- 根线程已全文核读第三阶段剩余README、reference/README、backlog、map-reconstruction四篇与phase2 D32:522–531，尚未迁移/计数。发现旧类型把map规划当index、reference入口当canon，以及current catalog标签与无build规划须区分；下一批按已读语义纠正绑定/状态、保留冻结48e2019锚点与原技术/工期建议的历史范围，不能将其当新实施授权。

### 2026-10-16 第三阶段四篇设计与文档准入

- 非作者只读设计复核agree：两个目录为governance-index/current，backlog为narrative-idea/draft，map-reconstruction为design-spec/draft。使用现有已冻结1.0.0和有效pilot，无新类型/格式变体；Codex为唯一正文Owner，纯文档build allowed，不授予第三阶段产品build。
- README长篇候选与估期转入既有backlog同提交保存并给段落映射，入口只做路由；已拍板版权/地图阶段归属作为约束，旧D6–D8的“决定”、技术尺寸/工期与MMO前提不升级当前实现合同。map保留48e2019快照语义；catalog current→draft只纠正设计成熟度。
- 白名单为四篇正文及对应review/registry/routing/phase catalog/生成索引/跨域矩阵/本卡/专属保留回执/证据导航。原路径与锚点保持或有明确导航映射，不改产品/旧测试/coverage。Reviewer在候选后独立核完整前后文本与语义移动，静态全门另跑。
- 已核现有tracked Markdown中四条入站锚点均指backlog版权段；该标题保留。首次全仓扫描遇未检出reference/sdlpal/AUTHORS.md，随后按现有文件明确重扫，未把缺失子模块当完成/断链修复。现有通用链接门只核文件目标、不覆盖fragment，不能据局部链接绿宣称全库锚点通过；本批另核四篇的实际锚点与后续全量检查范围。

### 2026-10-16 第三阶段四篇独立接收

- history_cards_a只读全文核原/新四篇、中央记录、catalog与回执，独立accept，无counter；14个原文块按已声明标题降级和边界空白规范化完整保留，各在目标章节唯一出现，旧记录/引用完整保留。两个目录负责导航，backlog为唯一长篇候选池，map为无build的draft；不能由current入口继承产品实施准入。
- 实际GFM解析与本地slug核37个旧标题、16个出站fragment与4个版权段入链均可达；仅本批范围，不冒称线上点击或全库锚点检查。原48e快照、MMO阶段、版权、旧技术/估期及未来验收边界保留。
- 累计71/1838基线+4增量已迁移，1871当前候选待迁移；新增治理回执仍列增量候选，不静默豁免。63文档工具测试、75正文合同、完整check:docs零问题，lint4074文件零error/warning/info，diff检查零诊断；首轮地图EOF空行被拒并修复，失败记录保留。
- 主树未改、未合main，任务build/目标active。最终全库附件归属、片段链接和独立验收仍待完成，阶段文档迁移不等于产品runtime/E2E/视觉/coverage通过。继续下一批，不需用户搬运或重复批准。

### 2026-10-16 五份架构历史回执准入

- 根线程再次全文读标签/overflow/战场命令/帧会话/场景预检五份回执，并对读已独立接收的配对卡。按实际用途均为指定候选的evidence-receipt1.0.0加五节archive overlay，不将其当当前run contract或新动态执行报告；Codex为唯一写入Owner，文档build allowed。
- 原路径、原文日期/数字/owner/失败/权限和历史中间态完整保留。原ATX标题降两级，其它原文字节保留并可逆回读；保留旧标题身份供入链使用。补具体来源、合法输入、业务oracle、排重、结果与复核边界，不认证旧工具今天可运行、旧raw可恢复或旧warning为零。
- 白名单五篇正文、专属回执及中央review/registry/routing/证据导航/本卡。当前JSON与诊断脚本只登记历史producer/引用关系，未修改机器字段或运行旧测试；所有新增候选仍纳增量分母。非作者候选复核后才能接收本批，不能将作者自验当accept。

### 2026-10-16 五份历史回执独立接收与包C分派

- receipt_review非作者全文读五原文358行、新正文613行、配对卡636行及中央账/完整回执，独立accept。C1指出labels新增“回调保持”超原证据，已收窄为“属性透传保持”，原13行不变；旧候选SHA、counter和复核闭合均留存。
- 五篇仅原ATX标题降两级，逐行严格逆回读通过。25个旧标题、1出站/2入站fragment经实际GFM解析/本地slug可达；7个JSON/工具只登记原producer和引用SHA/保留规则，不授予全文审查或执行信用。跨域矩阵现21行，仍非全库穷尽。
- 当前真实迁移76/1838基线+4增量，1868当前候选仍待迁移；613账本条目不等613份实际迁移。63文档工具测试/80正文合同与完整check:docs零问题、lint4076文件0 error/warning/info、diff0；目标active，任务build，未合main/推main。
- 下一包C：复用已核干净隔离树，分支codex/docs-history-cards-c。贡献者history_cards_a为唯一Coding Owner，根Codex独立接收；八卡内容设计与直接一手证据已由贡献者全文盘点，根按范围/反证/模板核准文档build allowed。八卡全部task-card1.0.0+历史overlay，不新增类型。
- 白名单：docs/ops/archive/tasks/done/ 下A7-0-resource-closure-registry、A7-0A-opening-menu-music-role、A7-1-sfx-asset-closure、A7-2-static-images-engine-chrome、A7-3-cutscene-asset-workbench、A7-3B-battle-sprite-asset-closure、A7-3T-tileset-asset-closure、A7-3W-world-sprite-asset-closure八个.md，另专属contributor-history-cards-c-20261016.json。禁止共享registry/reviews/routing/catalog/board/index、产品/旧测试/coverage写入；未根接收不合main/不计数。
- 包C关键边界：四→五音乐角色公开勘误；SFX中间violations非最终结果；engine chrome归属及用户验收日期；A7-3旧空格跳过accept被C1-C5撤销，不能沿用总审计/旧设计的相反口径；tileset缺168/171与OFL 222pass/1fail/1skip原数字保留；共享sprite组和appearance/layout不同分母分开；battle player0合法且channel独立。旧upgrader/current-only债已由后继收口，不恢复兼容或旧版本build。
- A7-2旧6face/10,392B与68B透明stub结论，后由2026-08-23/24 raw独立字节复核更正为5face/10,324B，盖罗娇全透明占位走通用头像兜底。原文保留，当前有效性指向MIG-PAL-ACTOR-FACE-1与A7-2后继报告，不把旧accept变当前真值。共享audit/design未在本包白名单改写，只记录冲突及继任权威。
- 包C隔离基点由根在本接收提交后fast-forward核同一批八源blob，再执行；原设计盘点67cc95eb作为历史来源。贡献者交逐篇source/blob/after/保真及具体历史缺口，根全文核源/候选/一手证据后决定accept/rework；不以作者自验或数量替代验收。
- E2E-006三份文档已全文预读：原publication rework与后继连续卡顶部固定批次done并存；连续卡只读前160/3510行，不计整卡深审/迁移。boat-journey364行完整及当前版本窄源已读，未实跑；后续需逐篇区分原runtimeExecution=true历史与本次未执行，不得为reviewBy续期或排版伪造动态通过。

### 2026-10-16 006机器模板C2前置提案

- 全文读006 stage17行、report78行、JSON96行、活动006卡85行；boat-journey364行及boat-reforge/版本常量窄源直接读。实际consumer187–340行已读。原JSON document-audit+performed=true不符合现行1.2.0，不能改false或丢原raw使模板绿；先提C2历史执行publication变体、严格Git原对象核验和1.3.0修订，非作者设计复核/冻结前不实现此变体或迁移006正文。
- 提案在templates/registry-proposal-20261011.md末节；不放宽既有document-audit false限制，不新增模板类别，不改产品/旧测试/coverage。Pilot核完整原字段/Git来源/本轮未执行/真实consumer与有效反控；13篇既有machine只版本声明维护，不重计迁移。截止日期与rework不因格式续期或晋升，最终质量门过期会明确失败，不能伪造新实跑。

### 2026-10-16 C2设计冻结与工具/006文档准入

- receipt_review非作者设计agree，独立核定006外部path/commit/blob/SHA pin与固定1838基线一致；C2.1自选后来真Git源、C2.2移除routing绕progress两counter在设计层闭合，反例仍须实际实现验证。machine1.3.0合同按提案冻结用于pilot；Codex为唯一实现Owner，docs工具与006文档build allowed，无产品/旧测试/coverage授权。
- 白名单：templates registry/proposal与说明、docs工具新源码/必要反例测试、model/progress两个入口、006三文档、既有13机器仅版本声明与对应after账、专属pilot回执/中央review/registry/routing/catalog若仅附加审查说明/矩阵/本卡。实际字段保持、真实Git读取和外部pin比对为硬门，未通过不得签pilot accept；不放宽旧default/false门。
- 本次未实跑；006原rework/lastVerified与reviewBy原字段保留。按2026-10-16检查的reviewBy过期属于明确未闭合门，不用静态排版伪造延期。全量done/main推送仍禁止；独立审查后按真实语义与前提处理，不把旧连续批次done等同本轮动态通过。

### 2026-10-16 C2实现counter返工

- 非作者C2.3实际临时Git/CLI反例：后来false→true提交+外部pin/envelope/工作树baseline/review联合变造，原实现progress仍exit0/计1；C2.4 reader把tree当commit；七份conformity保留旧1.1与新1.3同时当前。接受暂停，原68工具全绿不能消除counter。
- Codex按已核原始1838源快照收窄可信根：独立固定baseline commit/blob/SHA写入docs工具，真实Git与当前工作树双向核同，文档pin必须该快照，未来变更根要另独立来源/设计核验；不能从候选改baseline自证。reader严格commit对象，新增实际联合变造CLI与tree/blob/tag拒绝证明，旧false和产品机器字段不放宽。七份conformity当前字段统一1.3、旧值入history。
- 同时已实核006paired consumer零问题，但validateCatalog(today=2026-10-16)明确报reviewBy过期；默认UTC15静态门通过不覆盖此义务。中央task仍build，C2pilot及包C八卡都未独立接收/未计入已接收数。等待非作者针对返工候选实核，后续继续配对MD/日期义务与全量治理。

### 2026-10-16 C2独立接收与下一批状态

- receipt_review针对最终六源码SHA签accept：外部批准pin与固定Git baseline/source、完整原对象保真、真实commit种类、model/progress统一逐篇门、全部compliant/route被删仍核固定baseline、缺Git源的人类/JSON/require-complete分母均1838。C2.3联合变造曾真实CLI伪通过、C2.4 tree误接及七conformity/失败输出counter全部修复并独立闭合，原失败记录保留，不用初轮68绿替代反证。
- 实际006 JSON去envelope与原对象逐字段相等，原performed=true只属旧10-04批次；currentAudit=false。test-machine-evidence1.3.0同类变体pilot通过，不新增模板类别。13份既有机器只声明升版，正文原字段逐字节只改版本；不重复计迁移。固定baseline本身仍待治理，临时守卫不授予永久保留或豁免，其未来control-metadata迁移必须另独立设计保留原绑定/Git可信根。
- 当前77/1838基线+4增量实际迁移，1869当前候选待迁移；68文档工具、81正文合同、614旧+新账本、默认UTC15的check:docs通过；lint4081文件0 error/warning/info、diff0。已实测today=2026-10-16仍拒绝006 reviewBy过期，本项未关闭，不能宣称最终全仓准入。任务build/目标active，未动main/产品源码/旧测试/coverage。
- 包C作者候选7ddc35d65ce9a88f14db3a341dbca0a43003fc53（源33cc2df5），隔离树干净，精确8卡+专属回执。作者200旧标题/176出站fragment/4930行完整逆回读自验并不等独立接收，未合并/未计数。根已全文A7-0源528行、全部新增章节/回执首条与顶层，直接全文音乐报告98行、静态图报告117行、MIG-PAL-ACTOR-FACE-1继任卡389行；其余原卡/回执与总审计/过场设计/retention尚待独立核，不提前accept。
- 下一步继续006两篇Markdown的真实内容迁移与publication日期义务，及包C非作者独立复核；不由旧连续卡done拼出新实跑。无新的用户产品裁决项，不需反复审批或转发。

### 2026-10-16 包C独立审查分工

- 作者候选7ddc35d65ce9a88f14db3a341dbca0a43003fc53保持隔离/clean，源33cc2df5未变。非作者receipt_review只读前四卡A7-0/0A/1/2及对应完整回执/一手来源；非作者history_cards_c_tail只读后四卡A7-3/3B/3T/3W及对应完整回执/一手来源。两席可独立读公共来源，不等待或复述另一席结论，也不声称个人读满所有八卡。
- 两席禁止任何仓库写入/旧产品测试/coverage/浏览器，只交逐篇accept/counter、源锚点、严格保真与模板/链接证据。根Codex分别接收真实阅读范围，独立核关键primary/新章节/原对象及统一质量门后才集成写中央账；现仍未cherry-pick、未计迁移数、不合main。无用户转发环节，当前无需额外审批。


### 2026-10-16 006配对Markdown内容迁移候选

- Codex按已批准范围迁移006 stage/report，分别test-e2e-stage1.0.0与test-run-report1.0.0；完整17/78行原文已读。入口保留原H1/YAML/结论，报告原frontmatter/testing-meta不变、完整正文仅标题降两级可严格逆回读。当前state2与旧state3、首句撤信、原两段偏移/朝向未解释冲突、后继固定批次done均明确分域；不删除旧通过/失败或日期。
- 当前仅候选，未写中央template-compliant/未计迁移数，待非作者全文核原/新两篇、原对象保真、实际caller/consumer与模板。机器JSON未改，未运行产品/旧测试/coverage/浏览器，不继承旧动态信用。候选SHA及真实阅读边界在C2专属回执pairedMarkdownCandidate。
- 日期义务设计待独立核：原10-15已过期，候选保持不变。若实际内容/配对证据/状态边界审查足以构成发布复核，可明确记录本次内容结论并将catalog与README的下一次publication reviewBy设10-23；lastVerified10-03、rework、原revision/versions/机器执行字段不变，不把续期当新的E2E。只靠排版不得延期；尚未执行此提案，非作者不认可则保留门失败并记录前提。


### 2026-10-16 包C分段独立接收与根集成

- 非作者receipt_review全文核前四原文2453行/全部新prose/对应回执及最终f19e delta，逐篇accept；history_cards_c_tail全文核后四原文2477行/候选3049行及对应回执/最终delta，逐篇accept。三组counter按原证据修复：WorldState.audio.currentMusic/真实音频链/三轮、team-27是ID与380队普查/mock真实链、严格RLE接受单零尾及无尾且无来源拒绝。原quote不动，counter历史和真实读域留中央新记录。
- 根完整核八卡新章节并逐篇strict Git blob/source/candidate/接收after及4930原行逆回读，直接音乐98/静态117/MIG389与已读A7-0原528；不冒称亲读其余七原卡，按两非作者各自完整原文和primary source实核接收。原作者7ddc/f19e与receipt字节保持历史pending身份，根另记当前接受。接收后只改治理Owner和接受时态，原产品Status/Owner/日期/签字/字节保留。
- cherry-pick为f7ba8bd6e与60c285366；中央8旧结构化记录进入priorReadings，替为具体deep-semantic/task1.0+archive记录并同步routing/afterSHA。共享设计skip旧说法、face后继、音乐角色和OFL失败/修复在矩阵另4关系明确guarded，不假称共享正文已治理或今天实跑。
- 中央614内容review、89正文合同与固定分母progress已实际通过；最终集成全门与只读record复核待本轮补齐。006两MD仍独立候选，不计上述数，原10-15日期未延期；目标active/任务build，未合main/产品源码/旧测试/coverage。


### 2026-10-16 006发布复核与本批质量门

- receipt_review对40bce两MD原/新全文、严格原文保留、配对JSON和实际Reforge caller独立accept；日期提案独立agree，理由是确实完成完整内容/证据/状态/反证复核，继续保守rework，7日后复核publication合理，不要求为日期补录剧情。实施明确catalog+stage reviewBy10-15→10-23，lastVerified10-03/status rework/原revision/content/save/JSON机器字段不动，原today16过期失败留dated history；其它17entry对象未改。
- C2.5复核counter：catalog中央当前记录仍留“10-15不延/只4分类字段/deepEqual不动日期”旧断语，不能靠新增history掩盖。已把当前readMethod/core/oracle/unknown/nextStep/before-after等明确区分10-15原full18与10-16仅006实质复核/17对象保持，原对象和错误草稿字段保留priorReadings/history；待非作者最终delta闭合。机器JSON字节仍95811ae224ea1659dde67c1951449478bd5d9cf3135d7400c6a9543cc858fe03。
- 中央新增两篇stage/report完整语义记录；当前投影87/1838基线+4增量、1952当前候选中1861待迁移，616账本=91compliant+525governed-legacy，不得宣称616篇完成。矩阵25关系仍非全量穷尽，新增控制回执/review仍纳增量候选，没有保留豁免。
- 实际全门：68文档工具0fail/0skip，check:docs1223Markdown/7119本地链接/361任务、91正文合同、testing0、phase/lore184、content616通过。本地today16与paired006均零问题。lint首轮仅旧ops账本JSON格式1error，已格式化复跑4083files/0error/0warning/0info，失败记录保留，未降级规则；diff检查0。中央文字counter最后补核后仍需最终集成门。
- 任务build、目标active，未合main/推main，没有产品源码/旧测试/coverage改动或新runtime/E2E/视觉信用。下一批D仅只读盘点12历史质量卡943行，尚未实现；共享ledger screen-wave“3fail”与原卡/总纲“3pass/1fail”冲突已识别，待具体设计/独立接收而非继承绿数。


### 2026-10-16 本轮独立增量闭合

- history_cards_c_tail对根接收后8条source/candidate/after/metadata/完整逆回读/priorReadings和唯一registry-route签integration accept；后四正文仅治理Owner/接收时态变化。前四语义签仍属于receipt_review，不互相冒领全文阅读。中央旧nextStep移入历史，当前仅指剩余全量工作。
- receipt_review对006最终日期delta和C2.5修正签accept：其它17catalog entry逐对象不变、006只公开reviewBy改变；旧报告和原机器字节严格相等，原过期负控仍能准确失败。冻结两MD/catalog/JSON与其实际受审record SHA记在C2回执；后续仅根接受签收/真实门维护不冒称新record字节也获旧SHA签字。
- C2.5已闭合，10-23是publication下次复核而非动态新通过；rework/lastVerified/原runtime flag/版本不变。静态全门首轮格式1error→修复后零诊断，原失败留回执，最终签收维护后复跑。当前87/1838+4增量已接收，1861候选仍待迁移；525governed-legacy无用户保留豁免，不能提前done。


### 2026-10-16 包D内容设计与文档准入

- 固定只读预审40bce2fb7fb8d19ff99b228063e337e1b3050fa2，history_cards_a全文12卡943行，逐篇根据目标/白名单/准入/收口绑定task-card1.0.0+archive overlay1.0.0，Q3g只读审计也是一次性任务，不改为通用指南。根核范围、具体反证与基点，全文读Q3c/Q3g/Q3k及ledger182/总纲110直接相反计数，实核12源blob与根当前完全相等；纯历史文档无产品build前提变化。
- 唯一Coding Owner为history_cards_a；根Codex独立接收。build allowed仅下列12张docs/ops/archive/tasks/done/CODE-QUALITY-*.md及专属docs/ops/evidence/DOCS-FULL-TEMPLATE-1/contributor-history-cards-d-20261016.json；根本接收提交后复用干净候选worktree，新branch codex/docs-history-cards-d，以该稳定根提交为source并再核12blob与40bce相等。原C分支f19e保留，未独立接收D前不合main/不计数。

| 卡尾名 | 五任务章节必须说明的具体合同 | 五历史章节必须保留的边界 |
|---|---|---|
| 2-shared-codec-boundaries | MKF/RNG合法字节/非法offset-opcode-surface、空chunk及end后尾部、调用方与当轮收口 | 基点65dbeba3f；15raw/2373chunks/1464帧及shared127/game18/extract17为旧轮，不新对拍 |
| 2b-shared-yj2-boundaries | 位流/回引guard、合法重叠/early-EOS零尾、3guard反控、无任意尺寸上限 | 2626段34367608B；131与129两处shared数未解释，保留出处不自选；后继Q3c独立 |
| 3-pal-extract-event-types | slice/annotate纯转换、scene/global BFS/goto及shared归属、45定向/68files415 | 不将移除不可达rule表说成删所有annotation字段；10-04旧全门，不认证当前事件真值 |
| 3b-pal-extract-io-boundaries | SSS/M.MSG截断/对齐/offset、GBK和末offset，WORD/palette宽容不收紧 | 24165/29058低于24166原失败及266fast/417全包分母；10-04与10-05收口分时 |
| 3c-editor-coverage-determinism | 同census292/identity定位Workbench174缺帧分支；仅公开组件回归/单点mutant | 先worker/runner猜测后回归缺口；24165→24166、4682probe非正式门；原Owner不补CodingOwner |
| 3d-pal-extract-png-inputs | encoder尺寸/短pixels或opaque，RGB复制索引/alpha；opaque可省略，不加任意上限 | 9定向/69files419与1044/1507为原指标，等Q3c及后续支持模式门，不从单包泛化全仓 |
| 3f-pal-extract-symbols-input | 五种可选字符串映射、缺文件{}、非法JSON字段显式失败，17定向/421 | 数字事件ID仍真值，名字只注释；不额外要求Record数字键；后继Q3g |
| 3g-pal-extract-cli-io | 总装清理/写盘/异常降级/manifest，只读审计无实现缺陷 | 原声称73–896分段审计属历史，本轮未全文CLI；末旧未build/不得done提示不重新执行 |
| 3h-game-assets-shell | 六文件职责，只有fetch-retry非法retries/backoff窄修、双barrier/负控 | 12files77/game3397/lint3198为旧轮；2962/98与2964/106按清单纠正时点；旧build prompt历史化 |
| 3i-game-dialog-precache-ui | 五文件，只有音量NaN→0，商标skipKeys注释纠正，其余caller合同保留 | 10files68/game3398；DOM状态不等视觉/E2E，不扩大所有数值拒绝 |
| 3j-game-tools-speedrun | 七工具，只有display-scale NaN→100%，6total5pass1fail恢复6/6 | 12files47/game3399；checkpoint坐标仍unknown，原临时raw不存在；不新跑速通 |
| 3k-game-present-primitives | 六primitive，raw[255,65532,0]/WORD与wave<=0；4total3pass1fail恢复4/4 | 13files77/game3400为旧轮；ledger182误写3fail与卡48/60及总纲110相反，明确guarded并由根后继治理共享源；未知视觉坐标保留 |

- 每篇实际五任务章/五历史章、完整原文quote逐字节可逆、原头字段/日期/失败/counter/旧prompt和原标题入口保留；不能只wrapper或模板空壳。新review须具体primary/phase/owner/provenance/合法输入/oracle/排重/状态/历史/源与after SHA/停止线/下一步，作者只自验，根另独立签收。
- 禁止共享registry/reviews/routing/catalog/board/index/ledger/总纲写入，禁止产品/旧测试/coverage/浏览器/E2E。原卡旧raw、测试绿数和已验证词仅属当时，未读生产全文不授当下全文信用；根后续统一维护已识别共享计数冲突，不为模板再跑产品反控。
- 初始独立设计范围通过；贡献者先基点/12blob/脏树保护核准，再实现专属包。交付非作者全文核源/候选/一手关键反证及集成门后才accept；无新用户产品裁决项，不要求转发或重复批准。


- 本轮签收维护后再次完整实跑：pnpm check:docs全部68工具/91正文合同/616review通过，pnpm lint4083files零error/warning/info、diff0；原首次1format失败保留。仅根结果登记不改已签正文SHA；继续包D和剩余全量，最终目标仍active/build。


### 2026-10-16 包E共享来源设计与文档准入

- 固定源bb90428668808368e816bd8e2ddeb5da57e4b166，根全文读五源1293行（98/117/612/354/112）；非作者history_cards_c_tail和receipt_review直接核同一批blob并独立agree内容分类及历史边界。两音乐/静态结果报告→evidence-receipt1.0.0，总审计保audit-report1.0.0，过场设计保design-spec1.0.0，G0 retention从evidence-receipt纠为design-spec1.0.0；均加archive-record1.0.0五节。不新增模板类别/变体，沿用已冻结合同和有效pilot。
- build allowed仅文档；Codex为唯一正文Owner，receipt_review非作者独立验收。白名单：docs/phase2/archive/audits/a7-0-music-resource-closure-report.md、a7-2-static-images-engine-chrome-report.md、a7-resource-closure-audit.md，docs/phase2/archive/designs/cutscene-asset-workbench-design.md，docs/ops/archive/evidence/ARCH-CURRENT-ONLY-1-retention-ledger.md；配套本卡/现有20261016-historical-cards-c.json的E候选与逐篇记录、旧review迁移保留/registry/routing/矩阵。接收后可窄改A7-3卡“共享来源仍待治理”的当下时态和其after账，原quote不动。
- 两receipt具体身份/来源合法输入/oracle/结果/限制：音乐87文件6737214B与四→五角色、81动态战斗槽/1327引用/12unused；静态engine-chrome双归属、旧6face/10392B与raw后继5/10324/absence、原数据/全绿/OFL后继冲突及六缺失截图。当前复核不重新加载原资产、听音或发行合法性认证。
- 总audit五实质章节保留July基线与各批数据/首尾状态、08-30 content19→20/1934/effect56三轴时点、09-03版权替换phase3归属；不把旧legacy欠账恢复为今天待实施。§3.8旧skip PASS被A7-3 C1–C5撤回，且其视频/帧动画“实际清单”误路由music报告，新有效导航纠为A7-3卡，原链接原文留存。static原全绿与A7-3T对58c3150f的OFL失败不能仅推测不同轮次消解；两数及5b7b49c8恢复原文字节后继均明确，不补造一致性。
- 两design具体问题/真值/方案/风险/验收：过场完整帧作者模型与TPFS codec、BGM分层、32帧原型/正式字节和默认不可跳；G0版本轴、disposition/allowlist、PERF-B failed rewind与characterization是原准入，不代表已实施。归档发布状态使用superseded仅表示不能作为当前准入/旧时点断语被后继取代，明确不宣布全部技术设计废弃，也不以“读旧写新codec”恢复产品epoch兼容。
- 原标题入口/完整UTF-8 quote逐字节可逆，全部原日期/结论/历史计数/命令保留。新具体五型章节+五历史章节，全文root新旧/consumer/fragment/状态/证据约束独立核后接收，不把wrapper或substring通过当语义accept。六截图root/main实际均不存在，producer/原caller/关联任务/保留与停止线写清missing-not-recovered，不能补签视觉。
- 四向前提：primary为固定原五blob及A7后继卡明确纠错；phase1 raw解码属旧记录，不重新认证；phase2现行READ-FIRST当前canonical与分层规则；目标仅历史文档真值/导航治理。若直接后继证明skip未被撤回、6face仍属有效raw或G0处置是当前消费者合同，则停受影响正文重核；不由数量/全绿猜真值。原始素材/产品/旧测试/coverage/browser/E2E均禁止新执行或改动。


### 2026-10-16 包E正文候选待独立接收

- 根完成5篇具体模板正文和五节历史wrapper，旧1293行全部保留；五份源blob/source/after与完整inverse实际通过，91旧标题、86出站fragment及tracked入链扫描经实际Marked GFM/本地slug验证零问题（入链数含自链接，不冒称外部86条或全仓fragment已通过）。两设计Status superseded明确只限定当前准入权/旧时点主张、Validity historical，原done/G0不动、不废弃全部技术设计。
- 首轮diff拒绝音乐源第3/4行原MD硬换行双空格，已精确两行转为CommonMark反斜杠硬换行并记录逆映射，严格还原原双空格；其余原文字节不变，不降git门。候选当前5typed+history模型和check.mjs1223/7142/361均零问题；旧中央5条after漂移仍待非作者实际接收后写回，不计迁移/不豁免。
- 源/候选/保留/六截图missing-not-recovered与producer/caller/retention、全部真实读域写入既有20261016-historical-cards-c.json.sharedSourcesCandidate，避免新增平行状态文档。原报告执行candidate未知仍unknown，未新跑产品/旧测试/coverage/浏览器/听音或raw复算。


- 包E增量E3：根在已接收A7-2新增层发现item277与icon0连写为item2770；原卡quote232/314/363及static原131明确item277旧icon=0。receipt_review独立确认仅清晰化文字，不改原文/产品/计数，白名单窄扩该卡新增一处及after账；原受审record进priorReadings，不新增迁移计数。新SHA与最终delta另核。
- 包D实际门前提更正：作者直接核12路径均0/12在旧中央616 registry/review，因此strict616 PASS完全不覆盖D，原设计预期“12SHA漂移”被事实推翻。根接收时应新增12记录/registry/route，不移动不存在的旧记录，也不将旧PASS当D验收。


### 2026-10-16 包E独立接收与共享写回

- receipt_review全文核5源1293行（同blob旧读与本轮新增完整354设计分开记录）和所有新正文/导航/完整候选，逐篇accept。E1把15-transition/927-file PB4 proof误归失败候选，已收窄为失败的是current-v4 rebuild；E2标题截图只有report caller，删去虚构task引用，六图逐张拍摄者/candidate未知且root/main均missing；E3卡item277旧icon0连写清晰化独立accept，0新增迁移。原错误/返工历史保留。
- 五篇template+archive真实consumer、91原标题/86outgoing、本地GFM与原文字节逆回读独立通过；music仅原3/4硬换行双空格↔反斜杠映射且解析HTML一致，不能说纯quote无例外。tracked外部incoming0，原incoming86全是五页自身导航，元数据已明确口径；未在线点击/运行产品。
- 中央5原结构化记录进priorReadings，绑定纠为2receipt/1audit/2design，添加实际deep-semantic/afterSHA/routing。phasecatalog仅4对应phase2 entry同提交同步，旧倒置/错位自动code源范围完整入priorReadings，不冒称今天核了生产源码；其它180entry未改。生成器仅投影视图未改catalog，不授全catalog/生成页全文迁移信用。
- A7-3仅2新章节段落将“共享来源待治理”更新为已独立接收，旧quote不动，原source/after与记录历史均保留。矩阵同关系明确撤回旧skip与证据误路由，同时保留真正过门/原生OS/raw动态缺口guarded；一个重复证据引用已按独立复核删除，history.before不动。
- 真实当前投影92/1838基线+4增量，1952候选中1856待迁移；616账本=96compliant+520governed-legacy，不代表616篇完成。当前strict616/model96/phase184/progress完整性0/diff0；E中央/catalog/矩阵集成定向复核与全门最后补齐，main未写，goalactive/任务build。
- 包D作者fcd4098ddd377a1c2ccc1e48f97dcb4df6e9c143精确12卡+专属回执、非作者history_cards_c_tail已全文943原行/1209新层/2040回执独立逐篇accept；其68作者工具/lint不冒作非作者执行，central0/12确证。本根尚未cherry-pick/未新增中央12行/未计迁移；下一步单独接收，不以旧616PASS代替。


- E集成当前记录返工E4/E5：C3 current successor仍写共享源待根治理，矩阵MD current core/oracle/beforeAfter还写旧14/12/11→12而实际25条。已分别同步精确继任正文、明确既有25导航/Eonly1row与其它24JSONrow实测不变，旧当前对象/字段完整入flatten priorReadings/history；不由新增history掩盖当前矛盾，也不借25数声称本轮重审所有关系。候选5正文与C2/C3正文SHA未因此改变。
- 后续每次共享写回须逐项核当前review的core/oracle/beforeAfter/successor/unresolved/nextStep/provenance与实际正文/范围，不能只刷afterSHA及追加历史；当前数字/待办/版本必须明确旧时点或同步新事实。E4/E5最后定向复核及全门后收本轮，D12仍独立候选不计当前92/1838+4。


### 2026-10-16 包E最终集成接受

- receipt_review最终integration accept，E4 current successor/E5当前矩阵数量与读域以及重复证据排重均独立闭合；5篇/4catalog/其余180entry不变/唯一路由/原文回读/C3两段及矩阵1row边界真实核过。受审维护快照SHA写入E集成回执，后续根签收/门维护不冒称旧SHA等于新record字节。
- 实际完整check:docs：68工具0fail/0skip、1223Markdown/7142links/361tasks、96正文合同、testing0、phase184、review616均通过；lint4083files零error/warning/info、diff0。静态全门不改变原raw/真正过门/原生OS/视觉或OFL历史矛盾的范围。
- 当前92/1838基线+4增量已迁移、1856当前候选待迁移、520governed-legacy无保留豁免；所有未审控制JSON/视图/附件继续计入，不以本批接收代替全量done。root候选分支收本轮，main仍未写，目标active；D12已独立accept待根接入，F12只读1229行设计及0/12旧中央覆盖已完成，未实现/未计数。


### 2026-10-16 包D候选引入与包F文档准入

- 包D非作者12卡逐篇accept后，根核精确13文件白名单并cherry-pick fcd4098为e519d388ac47c266c14680af46cc1b84142b4f63；D原C/D分支保留。根尚未新增D12条中央record/registry/routing及接收Owner时态，不计迁移数；旧strict616/model96通过不覆盖D。下一步根接收943原行/1209新层/2040回执的独立签和完整Git/来源证明，再新增12条并统一实测；不得仅以引入候选当done。
- 包F只读设计：history_cards_a全文12卡1229行并逐篇提具体10章，类型均task-card1.0.0+archive-record1.0.0；不是按目录判型，多为一次性只读审计，不伪造生产修复。根核范围/单Owner/停止线/guarded计数和源，实核12blob与bb904/当前e519完全相等；中央registry/review0/12已被直接确认，不从旧616推断覆盖。
- 文档build allowed：复用干净候选worktree，新branch codex/docs-history-cards-f从本准入稳定提交出发，保留codex/docs-history-cards-d在fcd4098。history_cards_a为唯一F正文Owner，根独立接收（非作者审查后才计）；白名单12张docs/ops/archive/tasks/done/CODE-QUALITY-3*.md如表，另专属contributor-history-cards-f-20261016.json。禁止共享中央账/矩阵/总纲/ledger/canon、产品/旧测试/coverage/browser写入或新执行。

| F卡尾名 | 正文具体合同与历史停止线 |
|---|---|
| l-game-battle-present | 七绘制文件，只读14files179/game3400；坐标/mask/顺序无直接反例不重判，canvas合同不等本轮视觉 |
| m-game-battle-core-contracts | 六helper，SHORT/WORD/status/dualMove/positions/seed；7files128/game3400，mulberry32与SDL LCG差异不擅改 |
| n-game-core-fade-identity-catalog | 四helper仅catalog own-property/null-prototype窄修；自有toString/constructor/__proto__不是禁词；3400→3403原轮，最终pushSHA未知不造 |
| o-game-core-mode-history-poison-search | 四helper审计，5files42/game3403；history/mode/level>=99伪毒/Search阈值与fallback不能凭直觉删除 |
| p-event-opcode-player | 玩家helper范围，7files99/game3403，无实现改；0xFFFF/slot/rolecontext/SHORT/WORD与旧pending段历史化 |
| q-game-scene-system | 原662行/2064主测试审计主张，3files131；首轮timeout与后续绿并列，资源竞争仅旧归因，未回raw不升级为已证根因 |
| r-game-event-system | 原5110行/5973主测试主张，10files370；globalip/asyncowner/resume边界，旧stderr警告不作当前豁免，尾draft提示不重启 |
| s-game-battle-system | 原3139行/4182主测试主张，9files242；start/tick/hold/cleanup与actions/opcodes/settlement边界不混，追加日志不造新时序 |
| t-game-battle-opcodes | dispatch consumed/newIp与target/context边界，10files470/4专属3848行属旧轮；原0x2E>=用户已定不改回>，共享canon1075旧90cap显式guarded |
| u-game-battle-state-runtime | 原3实现1109行、7files55；生产3player/5enemy和nullslots/identity/cleanup合法域保留；旧4tests619/关闭7与明确3新增test/5新增record冲突保留并按排重5条，不伪造执行时序 |
| v-game-battle-actions-basic | 四actions826行/6files154，主actions测试仅相关段不算全文；敌吉运按6月13日用户裁决，旧应照搬敌身法建议不恢复 |
| w-game-battle-settlement-finalization | 两实现313行/4files196；finalization.test已由u关闭，2product+1test仅新增3，与旧2test/4数并列解释；同轮全门沿用不写成本卡新跑，74+1不泛化全部屏幕 |

- 共享guarded责任：u新增5但总纲t/u同写215，统计时点未解释不累加全仓完成；u的4/619与3新增/7与5、w的4与3明确原句/排重依据。根直接核mechanics1065–1084及battle/battle-opcodes.ts661–685：实际rangeInclusive(0,9)>=resistance、0→100%，所以canon1075“同享90cap”与1074/实际caller冲突确立，不仅凭符号猜测；F只登记，不改canon或产品。源code仅窄读，不计整份机制文档/解释器全文审核。
- 每篇具体5任务章/5历史章、原Status/CodingOwner/Reviewer/日期/计数/失败/旧prompt和全部UTF-8可逆原quote、原标题入口保留；不足raw/coverage/timeout日志仍unknown。旧卡声称读过生产或测试全文只作原轮主张，贡献者本轮未读的不得继承新信用。17现有模板pilots/词表不变，无新类型/格式变体或产品裁决；根独立全文/必要直证及集成门后才接受。


### 2026-10-16 包D中央接入候选与真实门

- 根接收history_cards_c_tail固定fcd4098的12篇独立语义accept，实核12源/预审Git blob、source/candidate SHA、完整943行原字节逆回读；根读全部12篇新增实质章节和metadata，原Q3c/Q3g/Q3k195行全文，其它原文全文及2040行专属回执全文信用属于作者与非作者，不冒领根完整读域。12正文只另改新增Governance Owner/接收时态两行，原quote和原字段不变，Q3c只有原Owner而无Coding Owner仍照原样。
- 新增12条中央record/registry/route至628条、108正文合同；原616中0/12已直接确认，不编造旧review或SHA漂移。不可变作者回执fa4a64f885b93c6280f8bde6d2953702afcf403cb096552521d4956d7369a00b保持，当前接收与artifact producer/owner/caller/retention另写20261016-historical-cards-d.json。receipt_review正独立只读核根中央与行政delta，尚未声称其integration accept。
- 矩阵25→28，新增3条：codec合法宽容域、YJ2/wave历史计数冲突、十月coverage后继证据收窄runner猜测；原25JSON对象逐一不变。MD当前review的core/oracle/beforeAfter/unresolved/nextStep/readScope/计数同步，原完整current进flatten priorReadings，不以history掩盖当前矛盾。
- 本根实际check:docs：68工具0fail/0skip、1223Markdown/7190links/361tasks、108正文合同、testing0、phase184、review628全部通过；lint4085文件零error/warning/info、diff0。当前投影104/1838基线+4增量，1954候选中1846待迁移，520governed-legacy仍无保留豁免；D中央独立复核与最终签收维护后再收提交。
- 额外为下一批真实运行quality ledger消费者却exit1：原声明3283，actual3290；原状态229/5/3049/3054，actual229/5/3056/3061。不能把上述docs门通过说成全仓所有质量门已零诊断。实际main与本根inventory逐路径差异仅7份本任务新增docs工具/测试：check-document-model.mjs、document-model.mjs、document-model.test.mjs、frozen-document-source.mjs、git-document-source.mjs、historical-execution-source.test.mjs、report-governance-progress.mjs；均在scripts/docs/。本批尚未修共享账本，下一批完整治理时只纳待核，已闭合229不增加。


### 2026-10-16 包G共享质量来源设计与文档准入

- 固定设计源83750d8425709257a609c1b9f62b8c6686d53987；根全文读code-quality-governance.md234行、code-quality-file-ledger.md273行、pre-e2e/coverage-determinism.md98行，共605行。ledger初次输出截断后补读140–181确保全行实际读取。已全文读真实消费者scripts/quality/code-quality-ledger.mjs，直接执行真实inventory并与main逐路径核7新增；没有继承234条代码语义审查信用。非作者后续还须全文来源/候选/实际消费者独立accept。
- 绑定沿用冻结17模板：总纲是路线/有限批次状态，plan-status-v1/1.0.0；账本是带机器表的责任/证据索引，governance-index-v1/1.0.0；九月确定性调查保原audit-report-v1/1.0.0。三篇均有archive-record1.0.0五节限定原时点，当前路线/索引仅导航，不把旧生产核验变成本轮新代码深审。不新增模板类型或格式变体。
- 文档build allowed：Codex唯一正文Owner，receipt_review非作者独立验收；仅3共享MD及本卡、现有D中央记录追加G候选/来源保真与逐篇接入，必要旧review/registry/routing/矩阵同步。不得修改quality parser/inventory、产品源码、旧测试、coverage、生成物或运行browser/E2E。G原source/blob与D后根稳定提交再核相同，D中央受审期间不改其record。

| 文档 | 正文具体大纲与停止线 |
|---|---|
| code-quality-governance.md | 五plan章节明确2026-10-04基点/模块职责/机器清单/P0–P3/各有限批次与未完成；当前入口转现行工作流、逐批卡与账本，历史2962/2964/2966/3058及Q2末YJ2待核与前面done并列分时点，不挑旧数当今天状态；Q3t/u同215且u新增5的未知不补时序 |
| code-quality-file-ledger.md | 五index章节明确唯一机器summary/表、真实caller和记录身份；原237显式文件记录的path/category/status逐一保持，归并原末3待核行到唯一连续表不增加闭合数；真实7新增只使summary3290/229/5/3056/3061，保旧3283完整snapshot。Q3k唯一证据摘要3fail按原卡/总纲明确3passed/1failed纠正，原错句仍可回读，不重跑反控或改status |
| pre-e2e/coverage-determinism.md | 五audit章节保九月reorder合法无scrollOwners帧guard、23→24回归/独立mutant、hold/flush唯一statement/branch与七叶值变化；六次绿不是概率证明，没逐文件raw不追认早期1/6归因，未fullcoverage/浏览器。与十月Workbench174分支属两次不同调查，不合并或授今天测试质量 |

- 机器兼容设计先实际内存pilot：consumer的visibleLines只排raw fence，tracked匹配会抓quote内旧summary，故ledger不能简单全文quote。完整旧ledger放唯一~~~~text原文字节snapshot（源无同围栏，严格inverse），live唯一summary/table保字段，内存auditCodeQualityLedger对真实3290 inventory issues0、229closed/5review/3056pending；所有原行字段保持，0源码语义信用。该原型未写项目正文、不替代真实迁移后consumer。其它两源用完整quote及原标题live入口，原日期/结论/失败/命令保真。
- 若snapshot导致重复summary/table、任一path/category/status改变、原已审数上升、probe变正式门或Sept/Oct事件被合一，立即counter/rework，不为模板降低门。所有缺失/tmp/raw按实际检查标missing/unknown，producer/owner/caller/retention有来源才填，不补造新执行者或阶段产品裁决。


### 2026-10-16 包D中央独立接收

- receipt_review对根12条current record/12新层/两行政行、943原行逆回读、元数据/唯一registry-route、矩阵原25不变/新增3guarded及当前MD review逐项签accept，无新增counter；独立实际strict628/model108/docs1223-7190-361/progress完整性0/diff0。其未冒领tail原卡全文与2040回执全文，实际受审维护快照SHA记D集成receipt；后续根签收/门维护单列，不说新record字节等于原快照。
- 本批104/1838基线+4增量已接收，1954候选/1846pending，520governed-legacy仍未迁移。额外quality ledger3283→3290计数失败继续open，不由D文档accept豁免；G已完成605行源阅读/真实consumer内存pilot设计，正文尚未迁移。
- F77b687560cc7ec600faa7bc240483af47c10f991已获history_cards_c_tail全1229源/1332新层/2146回执独立12/12语义accept，166heading/140outgoing/0external inbound成立，当前尚未引入root中央/未计数。H13只读预审进行中，实际10旧ARCH已有governed记录、3CODE卡缺席，不能类推0/13或先实施。目标active，main未写，不标全量done。


### 2026-10-16 包F中央候选与包G设计复核

- F77b6875精确13文件白名单/source根字节一致后，引入为8c2480f4deef64481bafb49bf449772ac594f9a0。根实核12源/预审/候选/完整1229原行逆回读，读全12新增实质层与关键receipt字段；全原文/1332新层/2146回执独立全文语义签属于tail，不冒领根全读。仅新Governance Owner和接收时态两行政行另变，原quote/metadata保持。
- 新增12条current records/registry/routes至640条/120正文合同；F原0/12，作者旧616及根旧628过门均不覆盖F。新增矩阵3条使28→31，原28对象不变；current MD review全部当前字段同步、旧完整current入flatten priorReadings。receipt9181e045b166c868e95bb0134e77a20fc380fe9594e736cc2733da174ebdce92不可变。中央接入正由receipt_review独立核，不先写其accept。
- 当前真实投影116/1838基线+4增量，1956候选/1836pending，520governed-legacy。根temp intake复制工具先编译错误、后原D receipt路径被SHA断言拒绝，均在写F中央前改正；原候选与回执没被覆盖，历史留F集成记录，不降门或绕过断言。D的四条missing raw结论不复制给F；F raw可用性本轮未审仍unknown。
- G非作者tail全文独立读605来源行、ledger142/inventory216行，agree既定plan-status(active)/governance-index(current)/audit-report(historical)及archive1.0方案。独立反证：普通quote重复汇总失败，fenced旧snapshot+live唯一表实调consumer零问题；旧parser只消费234条，原末3待核在空行后未消费，迁移明确归并为live待核，不增闭合数。7新增待核分别为5tool/2test，当前质量账本3290差额依旧open，尚未写正文或修门。
- 根又全文读inventory216行，确认实际过滤所有tracked packages/或scripts/下代码扩展及JSON；七包名单只做domain标记，原scope字符串与总纲“只扫描七包”是近似陈述，G新说明须按真实filter纠正，旧原文保留。不得因机器清单每条默认待核而重置ledger已登记状态；不得把静态productionCallers当完整运行图。


### 2026-10-16 包H十三卡内容设计与文档准入

- 固定预审83750d8425709257a609c1b9f62b8c6686d53987，history_cards_a全文13卡4338行；根核每篇具体设计、白名单、停止线、中央10既有/3缺席和源。13blob/字节与F77及根当前相同，源manifest按path\0blob\0SHA256换行摘要c5774d16f19cc56bd5a125a3f11325589c60c794e72dd0bf9bb767c9ca394f1c。10ARCH现为governed-legacy且source=after实际原SHA，3QUALITY无中央条目；没有预设漂移或虚构0/13。
- 文档build allowed：history_cards_a为唯一正文Owner；根Codex独立接收，非作者必须全文源/候选/原quote与必要primary另验。待F中央稳定提交后，从该明确根提交复用干净候选worktree开codex/docs-history-cards-h，保留F77分支与C/D分支；再核13blob与预审相同后才写。白名单仅下表13张docs/ops/archive/tasks/done/卡及contributor-history-cards-h-20261016.json专属回执（位于本任务evidence目录），不得共享中央/矩阵/总纲/ledger/canon、产品/旧测试/coverage/browser写入。
- 全部依实际一次性目标/范围/准入/验收/交接绑定task-card-v1/1.0.0+archive-record-v1/1.0.0，不因路径直接判型，无新模板/变体。每篇五任务章/五历史章、原H1/身份/日期/签字/失败/counter/旧prompt及完整UTF8逐字节可逆quote；ENTRY-ACTOR原中文blockquote metadata原样保留，治理元数据另列，不能将引用状态重命名为当前build。原标题live入口/真实GFM片段/无孤儿/全字段review与SHA由根接收时统一更新。

| H卡名（.md） | 具体正文合同与历史停止线 |
|---|---|
| ARCH-ACTOR-CONDITION-SEED-1-entry-and-story-actor-conditions | 两condition作者链/三carrier/8可携状态、puppet排除、入口seed与剧情必中毒；战后仅参战者severe与restore全员清分开；content19/8a51a2b2/replay537、39error18warning6info与超时返工历史化，08-31done不等本轮动态 |
| ARCH-CONTINUATION-1-remaining-queue | 原剩11项+A1/A2=13批，八项集成、各owner；固定f884e07c/26479604/a2485e7d与9573/9081/728/109针不同轴；62warning6info/chunk原记录保留，不关full/Q1/Q2/剧情E2E或全仓质量 |
| ARCH-CURRENT-ONLY-1-development-current-only-consolidation | G0–G5 canonical准入、产品epoch/局部格式/源标签/平台轴、RA1删除；content16/SAVE8、170处69文件→0、294场景223地图1935资产与de234143删5sidecar；4/208 replay warning保留，不机械删所有V5/V1/legacy或恢复已退役表示 |
| ARCH-ENTRY-ACTOR-SEED-1-entry-actor-initial-state | 角色基线与入口稀疏当前值唯一owner，删除learnedSkills双写，undefined首次seed/空数组/离归/读档不重播，原子setParty；content18/0558819e/replay537/技能345；原296诊断及SFX72/74大于64失败不抹，旧blocked/保留候选由冻结合同取代 |
| ARCH-ENTRYPOINT-CANONICAL-1-explicit-startup-entry-model | 稳定defaultEntryId与真实独立入口快照/存档解耦；默认/query/menu/intro/scene/复制删除undo引用；content17/SAVE8/ff5e3a96/467处88文件/GE1–4；有效?scene跳?menu是已披露组合行为收敛，不写全组合零行为差异，SFXexit1和describe债保留 |
| ARCH-F2-CURSOR-BATCH-1-domain-modules | 24组/32模块、119/50出口139/78声明、正文/DOM/ARIA/采样身份不变；Cursor实现Codex接收；首轮d0684e78counter与fc09645e/R1–3/24针保留，原5warning不叫零诊断；720裁切/隐藏命中区未证 |
| ARCH-F2-CURSOR-BATCH-2-remaining-commands | 9组13模块，90声明119出口62绑定，正式seed→loader合法fixture与实际judge/5针/undo；6952ffee产品/2022acc3候选/96e9d3c1集成分开；55warning6info与16新增测试无新增覆盖行分支保留，不靠旁路judge掩counter |
| ARCH-PAL-SUPPLY-1-author-publication-and-import-retirement | 作者检查/窄供应/完整转换退役r1–r7与各owner、四伤亡两提示/作者正文权/537冻结oracle/事务/Node边界；r5供应被r6用户退役替代、r7最终收口，97删除144路径与1031−490−9−85+3=450按当时；不恢复原脚本生成或删整个migrate，不把会recover journal的dry-run叫绝对只读 |
| ARCH-REGRESSION-LAB-GLM-1-twelve-packs | 8回归+4视觉准备，隔离候选与正式接入、合法caller/oracle/排重/反控；32→37→42候选、37+4=41正式、75账、G06-11/E2十三项分母分开；旧warning/截图误标/焦点separator泛化撤回保留，原生zoom/boot三态/旧options未证 |
| ARCH-SUPPORT-GLM-1-eight-audit-packages | 八只读准备包，38唯一ID/7节点15runtime边/22hash/17图，Codex收材料不授产品build；09-25接收与10-02清账分时；原明确17临时原图全失、004用户肯定不扩所有卡，hash不证明今天在盘，P5那条边不可凭总数放过 |
| CODE-QUALITY-1-governance | 有限Q1RLE/Q1bcensus：generic0/0x80合法framing与strict零长拒绝不同，合法pixel/opaque/坏帧skip；7fde00ce与22666→22663为旧oracle；原一律零进度风险被同卡172重核收窄，raw全扫未知，首批done不关全仓 |
| CODE-QUALITY-3x-game-battle-progression | 306实现/139与340专属测试属原审查，活人gate/池顺序RNG/主升级cap与隐藏无cap/回满/技能去重；只关1product+2test=3，4files205相邻不算4新增；226/5/2735→229/5/2732按旧时点，不代G修当前汇总 |
| CODE-QUALITY-6a-ledger-integrity | 记录唯一性/inventory对账/真实runner，只读工具与37项/9反例；2966/226/5/2735是旧口径，Q3u/w排重与Q3t误替Q3s背景保留；semantic review still required，不把机器PASS自动标代码已验证 |

- 实际补读完整来源：4集成/完成回执182行、PERF-B交接119行、READ-FIRST/architecture-debt；condition/startup仅列明窄段，actor-condition-lifecycle45行全文、startup-entry63全文、shared/rle1–225、ledger消费者142全文；其它产品/旧tests/raw/tmp/screenshots本轮未核，不借历史全读声称今天全读。entry/card原16→17→18→19/SAVE8和旧central.minimumSaveVersion11保留其时点，当前版本必须独立真源，不能抄旧数字或以lineCount多EOF空行造SHA漂移。
- 任何旧非零诊断被改零、r5被重升当前、候选计数当正式数量、旧截图缺失被抹掉、组合query语义被称全程不变、机器完整性替代码深审，均counter/rework。作者只交候选和真实source/after/producer/保留证明，未根独立接受不计迁移/不合main。整体goal active，G/H准入只属文档，不授产品build或运行。


### 2026-10-16 包F最终中央接收与下一批稳定交接

- receipt_review对F12条current record/12实质新层、两行根delta、原1229行逆回读/身份/数字/唯一registry-route和28原矩阵对象不变+3guarded签accept，无新增counter。独立实跑strict640/model120/docs1223-7247-361/progress完整性0/diff0，未冒领tail1229原/1332新/2146回执全文信用。精确受审维护SHA存F集成记录，后续根签收新字节另列。
- 根实际全check:docs68工具0fail0skip、1223MD/7247links/361tasks、120正文合同、testing0、phase184、review640全部通过；lint4087文件零error/warning/info，diff0。签收维护后再同门实测；仅本文档范围通过，qualityledger库存3283/3290漂移仍open、等待G真实修复，不标统一质量门或全量done。
- 当前116/1838基线+4增量已接收，1956候选中1836pending，520governed-legacy无保留豁免；新增控制JSON/快照与产物仍计后继治理，main仍f98d0ddd未改，目标active。F候选原branch77保留，H13设计/4338源manifest和10旧+3新中央前提已由根实际复核相同。待本签收稳定提交后把明确SHA发history_cards_a开H隔离branch；tail在并行独立全文预审H，未对尚无候选预签accept。
- G范围窄补：3共享源实际独立接受后，可将已接收Q3k新增历史说明中“ledger摘要仍待根治理”的当前时态改为已纠正live摘要并保原错句snapshot，限新增层相关段落与after/current review/matrix同步、原quote不动、0新增迁移信用。其它历史guarded计数/缺raw不因此闭合。G正文尚未写；后继仍需真实machine consumer/逐行状态与source/after/原snapshot保真检查，不能只用内存pilot过门。


### 2026-10-16 包G三正文接受与中央候选

- receipt_review全文605源、三新实质层与候选回执、358机器consumer/inventory及197探针/config源码，逐篇accept无内容counter；原605行完整逆回读、19旧GFM标题/16outgoing/0external、真实ledger3290/229/5/3056/3061和docs1223/7273/361、diff均零问题。原两项库存FAIL和普通quote反例保留，不假称从未失败；五临时证据引用真实全missing，不运行producer或重验raw。三精确bodySHA及45cf候选DJSON受审SHA另存G集成，后续根维护不冒用旧字节签名。
- 原237表tuple保持，236旧整行不变，仅Q3k evidence误述纠为3passed1failed并保旧273行snapshot；原234消费/末3pending归并与新7pending构成唯一244行live表，不增closed229/review5。inventory真实filter、九月reorder与十月Workbench、YJ2末旧残句及t/u215未知均有具体正文，不借模板简化历史。
- 根新增gov/ledger2中央记录、迁移旧coverage1并保完整旧current：registry642/model123，coverage唯一afterSHA漂移随真实接收写回清零，不豁免；实际progress119/1838基线+4增量，1956候选/1833pending，519governed-legacy无保留豁免。G原作者候选snapshot原样保留，接受与后继gate另列。
- Q3k只四个新增历史/当前来源段落同步为live摘要已纠、原误述snapshot/raw缺口保留，原quote/身份/日期不动，0新迁移信用；current core/oracle/beforeAfter/successor/unresolved/nextStep/provenance与afterSHA全部同步，原完整current flatten prior。矩阵31→32，新增1记录完整性边界、修2来源关系，其余29对象不变；MD current review也同步真实计数/读域。中央及窄delta正由receipt_review独立复核，未先签其integration accept。
- 当前D/F回执中原库存失败保留原exit1/declared/actual并追加G已修current resolution；只闭合7库存漂移，不声称全仓代码语义完成。原“open等待G”不能作为当前状态继续误导，根仅同步这两个行政resolution块、不改F12正文/记录条目。H14文件作者候选在独立树准备，原环境WARN经offline frozen安装已清，strict10旧SHA漂移如实待根接入，不授H计数。main未写，goal active。


### 2026-10-16 包G最终独立接收

- receipt_review对三正文和根2新+1旧中央/四段Q3k窄同步/32矩阵/两行政resolution逐项最终accept。G1反例“234产品”实际129product+92test+13tool已改234条原记录，两个history.before移除新增空history后精确等于22ee旧row，counter独立闭合；原错误与修正留G集成，不以新history掩盖current错误。其它29row、旧ops05其它entry、D其它11entry/F全部条目不变，candidate可精确重建已签45cf旧快照。
- 独立实际strict642/model123/ledger3290-229-5-3056-3061/docs1223-7273-361/progress完整性0/diff0；根全check:docs68工具0fail0skip、testing0/phase184/review642，lint4087文件零error/warning/info。受审维护SHA写G集成，后续根签收维护独立复跑，不说新record字节等于原签。只关闭库存/记录与共享摘要错误，不授234条记录重审、runtime或全量质量完成。
- 当前119/1838基线+4增量已迁移，1956候选/1833pending、519governed-legacy无保留豁免；main未写，goal active。本G源三篇及Q3k0信用更正收本根隔离分支，H852a982作者14文件已冻结、非作者正全文验收；I14份testing历史lab材料仅只读预审，不实施/不计数。

### 2026-10-16 H十三卡语义接收与中央接入复核

- H作者候选`852a982882dd2f1d956463e9ccef7b72bbd4c0cc`保持冻结，以`d797120bab009e86a53b71f28aef9196ccb6c0ff`导入根隔离树；14文件白名单为13历史卡及专属回执。源`22eead43a6c825e1345feb92441e09d340d22c18`的4338行与预审83750一致，13项source/blob/SHA manifest为`c5774d16f19cc56bd5a125a3f11325589c60c794e72dd0bf9bb767c9ca394f1c`。
- 非作者history_cards_c_tail完整原文此前已读，本轮完整1756新层及2824回执已读，13/13语义accept无counter；263原标题、240出链fragment、0外部入链及原metadata/quote逆变换成立。必要primary读域与本人实跑范围写入[H中央接入记录](../../phase-governance/reviews/20261016-historical-cards-h.json)，不把作者68工具/lint4088冒领成非作者执行。
- 根实际核13篇实质新段/原metadata、逐篇receipt结论/oracle/排重/counter/继任/停止线及全部字节接入；未冒领4338原文或整2824回执的根全文语义阅读。十三篇只窄改新增Governance Owner与状态交接一段，原正文与原元数据字节不变；作者回执SHA`8f7543c1e85fb5db1539e6a17fc27357190ce98aad98517761ebd724704b959b`保持immutable pending历史快照，当前接受另记中央记录。
- 真实旧覆盖为10 ARCH旧governed-legacy、3 CODE缺席；十条完整旧review保留后替换，三条新增，不以十处已知after漂移冒充正文通过。中央现645项、136正文合同；132/1838基线+4增量、1822当前候选pending、509 governed-legacy仍无保留豁免。机器投影只说明已登记迁移，不代表全量最终验收。
- 矩阵32→35只新增三条已读关系：角色基线/入口/condition维护权、current-only版本轴/PAL作者供应退役、准备包/正式接入计数与责任；原32对象不变，导航及当前review各字段同步，原32读域留历史，不冒领全35来源本轮重审。
- H原非零诊断、SFX失败、zoom/boot/options、17图丢失的10-02原结论与未新查盘范围均保留。G已完成的inventory记录修正另分时点，不给H新增closed或代码质量信用；材料accept不授产品build，旧prompt不恢复执行。
- 根model136/strict645零问题，progress完整性0；根中央接入delta待receipt_review非作者独立验收，全门尚待本接入实际运行。第一次把无`--json`的人读进度输出交JSON parser曾失败，只是临时读取命令，随后按真实CLI格式核清；没有改工具或治理结论。main未写，goal active，不标全量done。

#### H1中央身份字段反证与修正

- receipt_review直接核13原header后提出counter：F2后批原只有`Owner: Cursor`，CONTINUATION原为`Coding / Integration Owner: Codex`；根归一化把原Owner/Coding Owner互相镜像，不能称原字段存在。
- 根逐篇直接回读13固定源header；当前`originalIdentity`与`producerReferences.originalIdentity`改为原字段名/值/行/原行文本及缺席名单，`derivedResponsibleOwner`单独标derived和sourceField。原`Review / Integration Owner`、`Reviewer / Integration Owner`、中文负责人/参与审查、Contribution Owner不再折成伪原字段。初次根归因留各篇history，作者receipt和13正文完全不动；待非作者定点复核后闭合H1。
- 首次根全门实跑为68工具/0fail/0skip、docs1223MD/7327links/361tasks/content22 SAVE12、model136/7routes/0issues、testing0、phase184、strict645；lint4089文件0error/0warning/0info，diff0。该轮早于H1元数据修正，不借其证明之后字节；最终签收后重新运行本接入门。

#### H独立接入接受

- receipt_review对根接入明确accept，H1经13源header逐字段复核闭合，无剩余counter。实际受审中央维护八文件的SHA快照完整留H.integration；后续本签收/门追加字节另标为root维护，不伪称非作者已签后来哈希。
- 非作者实际strict645/model136/docs1223-7327-361/ledger3290-229-5-3056-3061/progress/diff均0问题；原32矩阵对象不动，3新增guarded与35导航一致。非作者13实质层/中央字段/来源身份/集成读域不等于tail的4338源/2824回执全文语义读域；两者分别记录。
- 本接收仅13历史文档，原runtime/旧测/coverage/浏览器未执行；main仍干净f98d0ddd，目标active，全量尚未完成。
- H签收后根全门实际通过：68工具/0fail/0skip、docs1223/7327/361/content22 SAVE12、model136/7routes/0issues、testing0、phase184、strict645；lint4089文件零error/warning/info，diff0。原各次失败/身份归因counter保留历史；最终门写入仅元数据并复跑，不改变13正文after或独立受审快照。

### 2026-10-16 I包设计冻结与分段文档准入

- 根与非作者history_cards_c_tail各自全文读I14份496行（13MD429+JSON67），贡献者亦全文已读。14固定源在33cc/22ee/H852/根777d逐字节相等，中央registry/review/catalog实际0/14；旧classifier成员reviewed不能继承深审。下表是全文语义判断后的明确绑定，不是目录classifier授权。
- 最终238行机器提案SHA`bae8b334330e0007863091ccf317c5e7a32a9481c9b9edbfc7b3453a02235f34`获非作者独立设计agree；根已写入[模板提案](../../phase-governance/templates/registry-proposal-20261011.md#2026-10-16-i历史lab-review机器合同14设计冻结)，冻结machine1.4新九字段变体用于单篇pilot，仍17类。实际registry现1.3，须根I0实施原子版本滚动/反例验证后切换；设计签字不等实施或I14接受。
- I0文档build allowed：根Codex唯一Owner，只可动模板registry/提案/默认machine示例、既有14机器envelope版本及相应3review/registry、必要本任务新增docs工具测试与真实inventory pending归属、本卡及必要现行模板入口review；不改生产consumer逻辑/固定baseline/旧变体/产品/旧测试/coverage。新工具只验证文档真源与进度，非运行时数量。receipt_review独立接收I0。
- I13MD文档build allowed：history_cards_a唯一正文Owner，非作者tail独立全文候选复核、根接收；复用H干净隔离worktree，从本准入稳定根提交新建codex/docs-testing-lab-history-i，保留H852/C/D/F分支。仅下表13MD及专属contributor-testing-lab-history-i-20261016.json候选回执；禁止共享中央/矩阵/catalog/模板/产品/旧测/coverage写入。十四项blob再核相等；不能在主树执行历史prompt/命令。
- JSON第14项暂不准写：必须等根I0稳定commit明确通知，再同步该commit配置并复核未变原JSON和13源；届时仅加_governance且原九字段全对象深等，候选/根/非作者实际consumer都通过后才接收，不把13MD候选先当14完成。原source四向边界与原raw/截图未知保留。
- 逐篇必填大纲：两索引目的/范围/状态/入口责任/证据下一步；十审计问题/范围证据/发现/结论/整改复核；completion证据身份/输入/断言oracle/结果/限制复核。13篇另具体写历史范围/原始结论/当时证据/当前有效性/继任；完整原文可逆quote，52原标题/现19Markdown链接及新旧fragment真实核验。原无Owner/发布日期不补造。
- 最强反例：r10整批counter不能因后来的completion倒写，原G08 exit0绿例不满足五针真judge；r9窄accept不等正式接入，r10主卡build不退回旧draft。原warning/类型失败/误归因/没有进入caller/原临时目录污染保留。历史版本/兼容入口不恢复当前承诺，未证zoom/boot/布局/options不由模板关闭。

| 固定源路径 | 原行 | 绑定 | 内容判断/停止线 |
|---|---:|---|---|
| docs/testing/archive/architecture-regression-lab/README.md | 18 | governance-index1.0 + archive1.0 | 同包十轮导航，不重复产品事实 |
| docs/testing/archive/architecture-regression-lab/architecture-regression-lab-codex-r10-evidence.json | 67 | test-machine-evidence1.4 / historical-review-payload-v1（先等I0） | counter/MISSED原九字段，禁止伪造publication |
| docs/testing/archive/architecture-regression-lab/architecture-regression-lab-codex-r10-review.md | 43 | audit-report1.0 + archive1.0 | 各轮实际candidate/反证/窄accept，保留先后 |
| docs/testing/archive/architecture-regression-lab/architecture-regression-lab-codex-r2-review.md | 29 | audit-report1.0 + archive1.0 | 各轮实际candidate/反证/窄accept，保留先后 |
| docs/testing/archive/architecture-regression-lab/architecture-regression-lab-codex-r3-review.md | 29 | audit-report1.0 + archive1.0 | 各轮实际candidate/反证/窄accept，保留先后 |
| docs/testing/archive/architecture-regression-lab/architecture-regression-lab-codex-r4-review.md | 34 | audit-report1.0 + archive1.0 | 各轮实际candidate/反证/窄accept，保留先后 |
| docs/testing/archive/architecture-regression-lab/architecture-regression-lab-codex-r5-review.md | 36 | audit-report1.0 + archive1.0 | 各轮实际candidate/反证/窄accept，保留先后 |
| docs/testing/archive/architecture-regression-lab/architecture-regression-lab-codex-r6-review.md | 29 | audit-report1.0 + archive1.0 | 各轮实际candidate/反证/窄accept，保留先后 |
| docs/testing/archive/architecture-regression-lab/architecture-regression-lab-codex-r7-review.md | 32 | audit-report1.0 + archive1.0 | 各轮实际candidate/反证/窄accept，保留先后 |
| docs/testing/archive/architecture-regression-lab/architecture-regression-lab-codex-r8-review.md | 27 | audit-report1.0 + archive1.0 | 各轮实际candidate/反证/窄accept，保留先后 |
| docs/testing/archive/architecture-regression-lab/architecture-regression-lab-codex-r9-review.md | 23 | audit-report1.0 + archive1.0 | 各轮实际candidate/反证/窄accept，保留先后 |
| docs/testing/archive/architecture-regression-lab/architecture-regression-lab-codex-review.md | 44 | audit-report1.0 + archive1.0 | 各轮实际candidate/反证/窄accept，保留先后 |
| docs/testing/archive/architecture-regression-lab/architecture-regression-lab-completion.md | 48 | evidence-receipt1.0 + archive1.0 | 42候选/41正式/75账与代表视觉分别保留 |
| docs/testing/archive/architecture-regression-lab-history.md | 37 | governance-index1.0 + archive1.0 | 同包十轮导航，不重复产品事实 |

- 本表14项path-NUL-blob-NUL-SHA256-LF有序manifest SHA256：`16324c3d4a7747fcdf42ae685d814e88a9775ec536da7ab6a6525764666d72f5`。迁移源先以本准入稳定commit为准，原blob与777d/22ee/33cc逐项相同，不自行刷新原迁移清单历史SHA。
- 当前全量仍132/1838+4，I未计迁移。main干净f98d0ddd未写；goal active，全量完成与最终main集成仍待。无用户转交提示词，由Codex内部协调；贡献者不得自标done或写中央accept。
