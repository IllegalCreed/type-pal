# TESTING-DOC-LAYOUT-1 - 测试文档根目录结构收口

Status: done
Phase: ops
Capability: ops / testing-docs
Coding Owner: Codex
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Contributor: Codex
Branch: codex/testing-doc-layout-cleanup

## 目标

将测试文档目录从“治理账完整但根目录仍平铺”收口为可维护的信息架构：根目录只保留明确入口，所有 legacy 工具归入真实工程域 tools，所有 Agent/批次目录进入历史归档；保留 SHA、公开入口和相对导入语义，不把移动当成 runtime 通过。

## 严格验收标准

- `docs/testing` 根目录非白名单条目为 0；不得再出现按 Agent、批次或旧能力命名的平铺文件/目录。
- 122 个工具全部有 domain/module/capability、source SHA、after SHA、imports/cwd/runner/temporary-tree/cleanup、caller、合法输入、business oracle、dedupe、history/supersedes、截止日和本卡关联。
- 所有相对 import、Markdown 链接、公开 runner 与旧路径引用可解析；迁移前后 SHA 记录一致且无 payload 漂移。
- `legacy-flat.json`、classification、catalog、indexes、历史归档和布局迁移计划一致，不能静默删除。
- `pnpm check:docs`、`pnpm lint`（error/warning/info 全 0）、`git diff --check` 通过；diff 不得触及 `packages/`、`scripts/e2e/`、旧测试或 coverage。

## 范围与停止线

只改 `docs/testing/**`、`scripts/docs/**`、本卡与看板。若某工具存在无法解析的真实 caller、相对 import、临时目录或不可判定的 runner，不得猜测；保留原文件并在布局计划中记录阻塞、截止日和下一步，不得标记 done。

## 验收记录

- 进入 build：Codex 已确认当前 main 根目录仍有 122 个平铺工具和 50 个以上 Agent/批次目录；旧 full-closeout 只完成历史账和文档归档，不满足本卡结构标准。
- Review：accept；根目录白名单、652 项 after SHA、静态 import、docs 门和 lint 均通过。
- 用户验收：接受结构收口；根目录不再保留平铺 Agent/批次材料。

## 下一位 Agent 提示词

无下一位 Agent；本卡由 Codex 独立实施、验证、合并和推送。
