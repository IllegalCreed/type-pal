# DOC-GOV-1 - 文档审计整改与自动检查

Status: build
Owner: Codex（检查脚本、集成与终审）
Contributor: GLM（文档整改）
Phase: ops
Capability: ops
Visual Verification Timing: N/A

## 授权与范围

2026-09-06 用户批准按“文档整改 → 审计缺陷修复与补测 → R4 薄基线 → N6b → 完整 E2E”推进；
随后明确要求利用 GLM 额度并行工作，由 Codex 在其完成后审核。本卡按本轮授权由 GLM 整改文档、
Codex 编写检查工具并终审，不另请 Kimi 签纯文档维护。没有授权改产品行为、schema、存档或迁移管线。

依据 [DOC-AUDIT-1](../audits/documentation-2026-09-06.md) 的 DOC-01 至 DOC-09，落实批次 A/B/C，
批次 D 只记录未来文档存放规则。本卡与后续高风险修复卡分开；代码审计问题不在本卡冒充已修复。

## 上下文锚点与前提

- 用户本轮授权：GLM 并行整改，Codex 审核；不要求用户搬运审查正文。
- [AGENTS](../../../AGENTS.md)、[工作流](../agent-workflow.md)、[第二阶段铁律](../../phase2/READ-FIRST.md)。
- [文档审计](../audits/documentation-2026-09-06.md)：首轮取证已完成，整改未实施。
- [代码审计总收口](../audits/pre-e2e/summary.md)：A–E 首轮取证完成，产品缺陷尚未修复。
- [当前源码版本](../../../packages/content/src/character.ts)：CONTENT_VERSION 与 CURRENT_PROJECT_MINIMUM_SAVE_VERSION；
  [当前工程](../../../projects/pal/manifest.json) 为对应实物证据。
- [路线图](../../phase2/roadmap.md)：R4 content20 薄基线 → N6b content21 → 完整 E2E，不能漏掉薄基线。
- [覆盖率](../coverage.md)：已建立真实基线，最终百分比不阻塞薄 E2E，覆盖率不替代业务断言。

前提门：产品行为/原版机制 N/A，本卡只修文档叙述与仓库检查；不重新裁决任何机制或能力状态。
工程前提已核实：源码 content20 / SAVE8，而审计列出的现行指南仍有 content19；
阶段总入口含旧待办。若源码/当前产品证明某段实际为历史记录，应保留原文并标明历史，不能全局替换版本。

## 文件所有权（避免并行覆盖）

GLM 可修改：

- 根 `CLAUDE.md`、`README.md`；`docs/`、`packages/*/README.md`、`projects/*/README.md`、
  `projects/pal/e2e-checkpoints/README.md`、`reference/README.md`、`data/raw/README.md` 中的 Markdown。
- 只做审计整改与必要索引：更新 current 内容、修链接、追加 historical/superseded 边界；现有任务卡仅修
  链接/裸路径和追加顶部历史说明，绝不改历史签字、状态或当时审查结论。
- `docs/ops/tasks/README.md` 的维护说明由 GLM 更新；独立的 `docs/ops/tasks/index.md` 由 Codex 的工具生成。
- 本卡只允许修改“GLM 整改回执”和自己的交接日志。

Codex 独占：

- 所有非 Markdown 实现/配置，尤其 `scripts/docs/`、`package.json`、`.github/workflows/`。
- `docs/ops/documentation.md`（检查规则）、`docs/ops/tasks/index.md`（生成索引）、`docs/ops/board.md`。
- 本卡共享范围、状态、Codex 验证与收口。

只读保留：`AGENTS.md` 协议；`docs/ops/audits/documentation-2026-09-06.md` 和
`docs/ops/audits/pre-e2e/` 原审计证据；`reference/sdlpal/` vendored 文档。
`agent-workflow.md` 只补文档职责/索引链接，不修改准入、三签和分工规则。
`capability-map.md` 不改能力状态；队列若需同步，只链接路线图，不重新拍板能力格。

## 验收条件

1. DOC-01 至 DOC-09 各有处置、证据和剩余项；真实 current 版本与历史版本明确分界。
2. 现行入口不再宣称编辑器是空壳、不再使用旧阶段路径或“为 MMO 留口”作二阶段约束。
3. 含 Markdown 的项目文档目录有索引，关闭任务可发现且历史提示不再作为当前任务入口。
4. 不移动/删除历史文档，不改签字与已批准产品决策；失效源码引用指向 Git 历史，不恢复旧实现。
5. 无依赖 `check:docs` 检查本地链接、目录索引、任务元数据/看板、选定现行合同版本。
   vendored/环境产物仅接受逐项带理由例外，不能忽略整个项目文档目录。
6. Codex 复核 GLM diff，实际运行检查及必要反例测试；产品代码和内容 JSON 零改动。

## 推进记录

- Codex：工程前提 verified（审计对照源码版本与入口内容）；design agree。普通文档治理，无产品行为变更。
- 用户流程授权：本轮指定 GLM 整改 + Codex 终审，按此两席推进；未代签 Kimi/GLM。
- GLM：整改 pending。
- Codex：终审 pending；检查工具 pending。完成前不标 done。

## GLM 整改回执

待 GLM 写入：修改清单、DOC-01～09 对应处置、一手复核位置、验证、无法确认/留待 Codex 项、提交 hash。

## Codex 验证与终审

检查器已经可运行：`node scripts/docs/check.mjs`（或 `pnpm check:docs`）；JSON 报告加 `--json`。
本卡仍在整改期，全仓检查报错是待处理清单，不是已通过。根 check/CI 在清零并终审后接入。
GLM 可直接用当前工作树工具核对，代码围栏/行内代码不计链接；`数组[下标](注释)` 若被 Markdown
解释成真实链接，请只加代码标记修正呈现。主题 README 应链接其目录全部直接 Markdown；
任务索引由 Codex 生成，GLM 只需在 tasks/README.md 链接 `index.md`。

现行版本检查限定合同段：若重写了段标题/分界，请在回执说明，由 Codex 同步检查配置。
Codex 已完成工具自验证：`pnpm test:docs-tools` 11/11 通过；`pnpm exec biome check scripts/docs package.json`
通过；定向 `git diff --check` 通过。生成索引已逐卡读取顶部状态，没有把正文历史状态计作活动任务。
全仓文档仍有整改项，未接入根 check/CI；待 GLM 交付后完成全仓清零检查与文档实质终审。

## 交接日志

- 2026-09-06 Codex：按用户指定划分文件所有权；GLM 负责文档，Codex 同步建设自动检查工具。
- 2026-09-06 Codex：交付无新增依赖的文档检查器、生成任务索引和维护规则；反例测试 11/11。
  GLM 可用 `pnpm check:docs` 查看实时整改项，完成后由 Codex 终审并接入 CI。只提交 Codex 负责文件，
  保留 GLM 工作树改动。

## 下一位 Agent 提示词（GLM，可直接转发）

```text
请在 /Users/zhangxu/illegal/type-pal 接手 DOC-GOV-1 的 GLM 文档整改。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、docs/ops/tasks/DOC-GOV-1-documentation-cleanup.md、docs/ops/audits/documentation-2026-09-06.md。
用户本轮明确指定你并行整改、Codex 做完后终审；请直接执行卡中 GLM 范围，不再索取三签。
落实 DOC-01 至 DOC-09 的文档部分：逐段核源码纠正现行版本/状态/入口；修断链；给主题目录和历史计划补索引与边界；补决策 outcome/superseded-by 导航。保持历史任务签字、终态和审计原文，不机械替换历史版本，不移动文件，不改产品代码和能力状态。
严格遵守卡中的文件所有权；scripts/docs、package.json、工作流配置、docs/ops/documentation.md、docs/ops/board.md、docs/ops/tasks/index.md 由 Codex 处理，勿碰。
在本卡“GLM 整改回执”和自己的交接日志写处置与验证，直接提交推送，只提交你负责的文件，保留其他人的未提交改动。不得标 done，交 Codex 复核；不要让用户复制审查正文。发现真实冲突记录具体文件/证据，不擅改产品决定。
```
