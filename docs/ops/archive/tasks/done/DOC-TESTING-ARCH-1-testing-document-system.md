# DOC-TESTING-ARCH-1 — 测试文档分级索引与生命周期治理

Status: done
Closed Evidence: `codex/docs-testing-architecture-r1`（待合入 main 后由 CI 复核）
Owner: Codex
Reviewer: Codex
Phase: ops
Capability: documentation / testing governance
Last reviewed: 2026-10-15
Governance Owner: Codex（历史卡包 A 文档治理）
Template: task-card-v1 / 1.0.0

## 目标

保留测试文档面向人类和 Agent 的分级索引与生命周期治理任务：单一 E2E canonical 入口、机器 catalog、过期复核和链接门共同限制错误/过时材料常驻。

## 范围

原交付覆盖 E2E 001–006 的 README/report 固定路径、合同/路线/跨阶段分层、catalog 多维索引、三份 starter、legacy-flat 清单及 check-testing 接入。它是文档基础设施任务；不代表 001–006 剧情或测试已全部 verified。

## 前提与证据

卡中用户目标要求人类与 Agent 共享可定位来源；catalog 才是稳定 ID、状态、依赖等机器事实源，indexes 是生成投影。原卡 Closed Evidence 仍写候选分支待合 main/CI，未给合并 SHA 或 CI run；该字段的待复核缺口不能由顶部 done 自动补齐。

最强替代解释是“创建路径/模板=报告已验”；该解释与报告/evidence/状态分离的[现行测试治理](../../../../testing/governance.md)冲突，不能采用。

## 验收

保留原记录的 docs tools 39/39、877 Markdown/4654 local links/0 issues、check:testing-docs PASS 和 diff PASS；这些是原任务运行坐标，没有执行日期或 raw 路径。relocation plan 应保留源 SHA 并更新外部引用，Git 留历史；本轮不从旧“全部引用更新”推广为今天全量无断链。

## 状态与交接

顶部 Status: done、Owner/Reviewer Codex 和原 Closed Evidence 不变。候选分支待 main/CI 的旧字段保留为未提供最终凭据的历史缺口，不凭文档迁移补写 success。无下一位贡献者提示词；根线程只独立接收本卡模板迁移并写回中央账。

## 历史范围

原测试文档架构任务；原卡没有日历日期，39 项工具和 001–006 分层属于当时范围。后来的17类统一模板不追溯成该卡原交付，原三份starter仍按历史描述。

## 当时证据

完整原卡包含候选分支 `codex/docs-testing-architecture-r1`、工具命令、39/39 与链接数。未提供正式合并 commit/CI run、每个 relocation 的原始SHA或 raw日志；本次不伪造执行身份。

## 当前有效性

historical。catalog/生成索引/正式报告配对的职责由现行治理持续承接；原卡数字和“路径已迁移”只证明当时任务陈述，不能覆盖当前1838+增量治理或当前runtime。

## 继任文档

现行来源是[测试治理](../../../../testing/governance.md)、[catalog](../../../../testing/catalog.json)和[统一模板注册表](../../../../phase-governance/templates/README.md)。本轮全量工作的状态在[DOCS-FULL-TEMPLATE-1](../../../tasks/DOCS-FULL-TEMPLATE-1.md)，不是本历史卡的done。

## 原始结论

以下完整原卡只按原始时点解释。原字节可从 Git blob `485da5a3081c9c4d94e7457b20f31ee1cca78357` 回读；新增正文没有替代原历史判断。

> # DOC-TESTING-ARCH-1 — 测试文档分级索引与生命周期治理
>
> Status: done
> Closed Evidence: `codex/docs-testing-architecture-r1`（待合入 main 后由 CI 复核）
> Owner: Codex
> Reviewer: Codex
> Phase: ops
> Capability: documentation / testing governance
>
> ## 用户目标
>
> 测试文档同时服务人类和 Agent：E2E 阶段报告可从单一入口定位，文档按专项/阶段/报告/证据分层，
> 并通过机器索引、生命周期、过期日期和链接门持续淘汰错误或过时材料。
>
> ## 本次交付
>
> - `docs/testing/e2e/` 成为 E2E canonical 树：001–006 各有 `NNN-slug/README.md` 与固定 `report.md`；
>   合同、路线方案和跨阶段问题族分开存放。
> - `docs/testing/catalog.json` 作为稳定 ID、状态、阶段、引擎、Owner、canonical、依赖、标签和 reviewBy 的机器事实源。
> - `docs/testing/indexes/` 生成按阶段、状态、标签、Owner 的多维索引；不得手工维护生成页。
> - `_templates/` 固定阶段页、正式报告、机器 evidence 结构；`governance.md` 固定命名、状态、迁移和收口流程。
> - `legacy-flat.json` 登记当前历史平面文件并设置迁移复核日期；新建未登记的 `docs/testing/` 根文件会被门禁拒绝。
> - `scripts/docs/check-testing.mjs` + 测试接入 `pnpm check:docs`，检查 catalog、路径、依赖、reviewBy、阶段页元数据、
>   生成索引和 legacy 平面清单；原有 `scripts/docs/check.mjs` 继续检查所有 Markdown 链接与任务索引。
> - 旧 `e2e-001.md` 等路径已通过带 SHA 的 relocation plan 迁移，Git 历史保留，外部引用全部更新。
>
> ## 验证
>
> - `node --test scripts/docs/*.test.mjs`：39/39 passed。
> - `node scripts/docs/check.mjs`：877 Markdown / 4654 local links / 0 issues。
> - `pnpm check:testing-docs`：PASS。
> - `git diff --check`：PASS。
>
> 无下一位贡献者提示词；后续只按治理规则迁移 legacy 平面文档，不再新增根目录散落文件。
