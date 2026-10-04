# TESTING-DOC-GOVERNANCE-1 - 测试文档深度治理

Status: build
Phase: ops
Capability: ops / testing-docs
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: e2e-deferred
Contributor: Codex
Branch: codex/testing-doc-governance

> 本卡从 `origin/main` 文档治理提交 `d02278dc0154dd73b5db24388a35c30bb096cc81` 建立隔离 worktree；遵守当前 Codex 分派、贡献者执行、Codex 独立验收模式。只改测试文档、文档工具和本卡，不修改产品源码、旧测试、coverage baseline 或 coverage worktrees。

## 目标

把测试文档从“有入口”推进到可机器核验的内容深度治理：每个 canonical contract/report 都能追到 source file:line、公开 caller、合法输入、业务 oracle、排重结论、当前 SHA/version、evidence 与历史 revision；legacy 平面文件有真实工程域分类账，E2E 阶段名表达剧情用途，历史重复审查通过 archive/supersedes 管理。

## 范围

- 范围内：`docs/testing` catalog、索引、模板、E2E canonical 元数据/evidence、legacy 分类账、代表性迁移/历史合并、runtime owner canonical 深审、`scripts/docs/check-testing.mjs` 及其测试、本治理卡与看板。
- 范围外：`packages/**`、`scripts/e2e/**`、现有旧测试、coverage/ratchet/baseline、用户作者内容、完整 Q1/Q2 视觉验收。
- 明确不做：一次性盲搬 359 个历史文件；删除仍被任务卡/审计引用的原始报告；把源码核读写成实跑；把 E2E 治理转成 coverage 门槛。

## 前提真值门

### 一句话行为 / 工程前提

CI 可以拒绝缺证据、过期依赖、旧链接、未分类 legacy 新增和 claim/evidence 矛盾的测试文档，同时不改变产品运行时。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A（本卡是文档治理，不改变游戏机制） | `AGENTS.md` 阶段纪律与测试质量验收段 |
| 第一阶段 | E2E 报告必须把 game runner 与原始内容锚点写成 sourceRefs；不把文档检查当运行真值 | `docs/testing/e2e/stages/001-opening/report.md:30-52`、`scripts/e2e/game-opening.mjs:1-471` |
| 当前二阶段 | 当前 canonical content/save 为 22/11；旧 SAVE/content 只能作为历史证据 | `packages/content/src/character.ts:168-170`、`docs/phase2/READ-FIRST.md:1-11` |
| 本任务目标 | catalog v2、metadata/evidence 配对、分类账和旧路径门禁全部可由文档工具复算 | `docs/testing/catalog.json`、`scripts/docs/check-testing.mjs` |

### 反证与替代解释

- 最强替代解释：历史平面文件虽多，但可能仍有未登记的唯一当前 caller；直接删除或批量搬迁会断引用。
- 什么观察会推翻当前前提：`rg`/catalog/任务卡发现某 legacy 文件仍被当前 runner 或 canonical 依赖直接消费，或 `check:docs` 发现链接无法恢复。
- audit 红项替代根因：运行时语义/命令分类、第一阶段理解、提取/地图/数据解码、audit/test model 均不在本卡修复层；分类账只登记证据，不把 mismatch 解释成产品缺陷。

### 用户可见偏离

- 是否主动偏离已核真值：no
- `before -> after` 一句话：平面/内部编号导航 -> 按工程域与剧情用途导航，旧结论保留且可追溯。
- 代表场景：`002-inn-e56` -> `002-inn-guests-and-reward`；`e56/s003` 留在 sourceRefs，不改变稳定 `e2e-002`。
- 用户裁决：N/A（文档信息架构与 CI 约束，不改变产品行为）

## 上下文锚点

- 已拍板决策 / 铁律：`AGENTS.md` 测试质量验收与当前协作模式；`docs/phase2/READ-FIRST.md` 版本/内容边界；`docs/testing/governance.md` 生命周期与历史保全。
- 代码锚点(`file:line`)：`scripts/docs/check-testing.mjs` catalog/legacy 检查；`scripts/docs/generate-testing-index.mjs` 四维索引；`packages/content/src/character.ts:168-170` 当前版本。
- 已知坑 / 审计文档：`docs/testing/finite-test-intake-20261003/audit-report.md`；`docs/testing/e2e/stages/006-doctor-boat/report.md:20-26` 缺失两阶段日志；`docs/testing/archive/architecture-regression-lab-history.md` 历史 counter 合并边界。
- 不得重新引入：Agent 名称进入 canonical 路径；内部 e56/s003 作为阶段名；把 receipt-only/source-read 当实跑；为保 coverage 堆重复文档；静默改写旧 hash/结论。
- 相关测试：`scripts/docs/check-testing.test.mjs`、`scripts/docs/check.test.mjs`、`pnpm test:docs-tools`。

## 验收条件

- 功能：catalog schema v2 可核验字段；9 个 canonical contract/report 全有 metadata + evidence；E2E-002 语义路径与所有活跃链接更新；359 项 legacy 全有分类账；历史架构审查有 archive/supersedes 关系。
- 测试：检查 sourceRefs 行号存在、公开 caller/合法输入/oracle/排重不为空、claim/evidence 一致、依赖仅指向 current/verified、reviewBy、孤儿阶段、legacy 新增、Agent 路径污染和旧链接。
- 文档：`docs/testing/governance.md`、模板、catalog、索引、README、迁移计划和本卡互相链接。
- 视觉 / 手工验证：N/A；本批不做剧情浏览器巡检。E2E-006 的视觉/关键 NPC 未闭合仍保持 rework。
- E2E 用例登记：现有 E2E 报告的入口/输入/断言/证据路径只做 metadata 审计；剧情集中实跑延后至代码冻结后的专门批次。

## 迁移批次与停止线

1. 机器清点：记录 363 根文件、359 legacy entries、9 catalog entries，并生成域/模块/功能分类账。
2. 代表性 canonical：补 9 个 metadata/evidence 对，修正 E2E-002 业务语义目录，更新迁移 SHA 与旧链接。
3. 历史合并：将架构实验 r2–r10 物理迁入 `archive/architecture-regression-lab/`，原始文件 SHA 与 retired manifest 保留；不把局部窄证据升级为整包 verified。
4. runtime 深审：将 ActiveScene、BattleHost、BattleSession owners、World runtime 四组 report/evidence 迁入 `domains/runtime/`，逐组核当前 caller、合法输入、oracle、排重、实现 SHA 与未执行边界。
5. 全量治理账：新增 `legacy-flat-audit.md/json`，把 359 项的 domain/module/capability/sourceSha/inventory、20 项迁移和 339 项保留理由纳入 canonical 索引。
6. CI 约束：扩展 checker、索引、模板、测试和迁移脚本，跑 docs 工具和 `pnpm check:docs`。

停止线：发现当前 caller 未登记、sourceRef 无法核实、删除会丢失唯一历史 SHA、产品/旧测试/coverage diff、或 E2E-006 缺失证据被误标 verified 时，停止迁移并保持 legacy/rework，写入未决问题。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单：Codex；`/Users/zhangxu/.codex/worktrees/testing-doc-governance/type-pal`；仅本卡列出的 docs/scripts/docs 文件。
- 前提核验：verified。直接证据见上方矩阵；可证伪观察为 `check:docs` 链接/孤儿/版本检查失败或源码 diff 越界。
- 范围、设计和验收条件：agree。文档 schema 与检查器扩展可回滚，不改变运行时。
- 高风险用户产品裁决：N/A（文档治理）
- build 准入结论：Codex build allowed

### 进入 done 前：独立验收

- 贡献者交付与自验：pending（本卡由 Codex 实施；候选 SHA、命令与结果待收口）
- Codex 独立复核：pending
- 用户体验/产品验收：N/A（纯文档与工具）
- done 准入结论：blocked，等待 Codex 独立验收与用户接收候选分支；不合 main、不标 done

## Draft: 设计与风险

### 设计结论

catalog v2 只保存稳定索引和小型合同元数据；完整执行数据仍在 report/evidence。分类账登记所有 legacy 的域、模块、功能、provenance、源 SHA 和 disposition。检查器读取 canonical metadata，验证 evidence 配对和 sourceRefs 行号，并对依赖/孤儿/旧链接/Agent 路径/claim evidence 做硬门。

### 已知风险

- 风险：历史文件数量很大，规则过严可能把仍有引用的历史材料误判孤儿。
- 缓解：只对 catalog canonical/E2E stage/evidence 做硬配对；legacy 仍由 manifest + classification ledger 保留，物理删除需要后续批次单独核验。

## Build: 实现与自测

- Coding Owner：Codex
- 修改文件：`docs/testing/**`、`docs/ops/board.md`、相关旧链接与本卡、`scripts/docs/check-testing.mjs` 及测试。
- 实现摘要：待最终收口填写。
- 运行命令：`node scripts/docs/classify-testing-legacy.mjs`、`node scripts/docs/generate-testing-index.mjs`、`pnpm check:testing-docs`、`pnpm test:docs-tools`、`pnpm check:docs`、`pnpm lint`。
- 浏览器 / 手工检查：N/A。
- 跳过的检查及原因：coverage/full E2E/产品包测试按用户范围排除；本卡不改变其输入。

## Review: 审查与返工

- Reviewer：Codex
- 审查结论：pending
- 必须返工项：pending
- Accept / rework：pending

## 用户验收

- 用户结论：pending（等待候选回执；用户已要求设定目标并完成治理）
- 后续任务：E2E-006 当前两阶段 NPC/视觉日志另按原任务卡处理，不由本卡关闭。

## 交接日志

- 2026-10-04 Codex：从指定 `d02278dc` 建立隔离分支；完成机器清点、分类脚本/359 项 ledger、catalog v2、9 对 front matter + metadata/evidence、E2E-002 语义改名、架构历史合并索引。Evidence: `docs/testing/legacy-flat-classification.json`、`docs/testing/e2e/evidence/`、实现提交 `e5fe2b80f7b62f16a5fac4fc4747510996d6ad55`。验证：`pnpm check:docs`（41 docs-tool tests，docs/testing PASS 0 issues）、`pnpm lint`（3149 files，0/0/0）、`git diff --check` 通过。
- 2026-10-04 Codex 深度批次：真实迁移 20 个 report/evidence：12 个架构实验原文迁入 `archive/architecture-regression-lab/`，8 个 runtime owner 文档迁入 `domains/runtime/`；`legacy-flat.json.retired`、迁移计划和分类账保留源 SHA。新增当前 caller/source line/oracle/排重审计；E2E evidence 改为明确 source-backed/document-audit，006 修正为 `boat-reforge.mjs` 且保留 rework。新增 `legacy-flat-audit.md/json` 全量总账，并扩展按工程域/模块/阶段/引擎/legacy 的索引。验证：`pnpm check:docs`（907 Markdown/5175 links，48 docs-tool tests，0 issues）、`pnpm check:testing-docs`（0 issues）、`pnpm lint`（3158 files，0/0/0）、`git diff --check` 通过。Evidence: `docs/testing/archive/migrations/testing-domains-20261004.json`、`docs/testing/domains/`、`docs/testing/domains/ops/testing-governance/`。
- Next: Codex 独立验收；保持 build，不合 main、不标 done。
- 2026-10-04 final hardening：`3a4f970d3` 完成迁移/canonical/domain batch，`953d96272` 完成 evidence/source hash/claim、catalog schema、冻结 census、孤儿/依赖/循环和 48 项 docs-tool gate；当前候选以本卡所在分支最新提交为准。

## 下一位 Agent 提示词

无下一位 Agent 提示词；当前模式由 Codex 独立复核和收口，等待候选分支验收。
