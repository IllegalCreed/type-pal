# DOCS-FULL-TEMPLATE-1 — 全 docs 深度治理与模板化改写

Status: build
Phase: ops
Capability: documentation governance
Coding Owner: Codex
Reviewer: Codex（独立验收）
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
- Coding Owner / 隔离工作树 / 修改白名单：Codex；仅本任务卡、proposal、inventory、registry 设计证据；不得覆盖主树 dirty 文件。
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

## Pilot 结果

- 17/17 模板候选生成，17/17 原文保留检查通过。
- Markdown 候选：源正文作为 byte-preserved body substring 保留；canonical 文件未改写。
- JSON 候选：payload deep roundtrip 保持机器字段；canonical evidence 未改写。
- Pilot 只证明包装结构与字段保留，不证明 runtime、E2E、视觉或 coverage。
- 下一批：先更新完整 registry/review ledger 的新 schema，再按 domain 批次逐篇正文迁移。
