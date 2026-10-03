# DOC-TESTING-ARCH-1 — 测试文档分级索引与生命周期治理

Status: done
Closed Evidence: `codex/docs-testing-architecture-r1`（待合入 main 后由 CI 复核）
Owner: Codex
Reviewer: Codex
Phase: ops
Capability: documentation / testing governance

## 用户目标

测试文档同时服务人类和 Agent：E2E 阶段报告可从单一入口定位，文档按专项/阶段/报告/证据分层，
并通过机器索引、生命周期、过期日期和链接门持续淘汰错误或过时材料。

## 本次交付

- `docs/testing/e2e/` 成为 E2E canonical 树：001–006 各有 `NNN-slug/README.md` 与固定 `report.md`；
  合同、路线方案和跨阶段问题族分开存放。
- `docs/testing/catalog.json` 作为稳定 ID、状态、阶段、引擎、Owner、canonical、依赖、标签和 reviewBy 的机器事实源。
- `docs/testing/indexes/` 生成按阶段、状态、标签、Owner 的多维索引；不得手工维护生成页。
- `_templates/` 固定阶段页、正式报告、机器 evidence 结构；`governance.md` 固定命名、状态、迁移和收口流程。
- `legacy-flat.json` 登记当前历史平面文件并设置迁移复核日期；新建未登记的 `docs/testing/` 根文件会被门禁拒绝。
- `scripts/docs/check-testing.mjs` + 测试接入 `pnpm check:docs`，检查 catalog、路径、依赖、reviewBy、阶段页元数据、
  生成索引和 legacy 平面清单；原有 `scripts/docs/check.mjs` 继续检查所有 Markdown 链接与任务索引。
- 旧 `e2e-001.md` 等路径已通过带 SHA 的 relocation plan 迁移，Git 历史保留，外部引用全部更新。

## 验证

- `node --test scripts/docs/*.test.mjs`：39/39 passed。
- `node scripts/docs/check.mjs`：877 Markdown / 4654 local links / 0 issues。
- `pnpm check:testing-docs`：PASS。
- `git diff --check`：PASS。

无下一位贡献者提示词；后续只按治理规则迁移 legacy 平面文档，不再新增根目录散落文件。
