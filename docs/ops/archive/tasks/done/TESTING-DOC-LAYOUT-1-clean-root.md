# TESTING-DOC-LAYOUT-1 - 测试文档根目录结构收口

Status: done
Phase: ops
Capability: ops / testing-docs
Coding Owner: Codex
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Contributor: Codex
Branch: codex/testing-doc-layout-cleanup
Last reviewed: 2026-10-15
Governance Owner: Codex（历史卡包 A 文档治理）
Template: task-card-v1 / 1.0.0

## 目标

保留“治理账完整但测试根仍平铺”到结构收口的任务：根仅保留白名单入口，122个工具归真实工程域tools，Agent/批次材料归历史区；移动不转换为runtime成功。

## 范围

原白名单是 docs/testing/**、scripts/docs/**、任务卡和看板；产品源码、scripts/e2e、旧测试与coverage排除。迁移必须保持source/after SHA、相对import、cwd、runner和临时树清理语义，未知caller/runner不能猜。此次仅改该卡与贡献包回执，不重跑迁移或动中央清单。

## 前提与证据

原卡认为旧full-closeout只完成账和归档，尚有122个平铺工具与50多个Agent/批次目录；[历史布局计划](../../../../testing/archive/migrations/testing-layout-closeout-20261004.json)的头部summary记录172根条目、652文件、122工具与530批次历史。该头部核读不能证明652项逐项无问题。

最强反例是目录表面干净但工具import/cwd失效、runner不可达或清理越界；原停止线要求保留文件、记录阻塞/截止日/下一步，不能因移动或旧accept掩盖。

## 验收

原严格标准要求根非白名单0、122工具具备域/能力/输入/oracle/去重/保留和清理字段、652项after SHA一致，以及docs/lint/diff零问题。原Review为accept并记录用户接受结构收口；原卡没有附具体命令raw路径或最终commit。本轮保留该结论，不把它当当前全部附件归属/runner验证完成。

## 状态与交接

原顶部 Status: done、Coding Owner: Codex、Reviewer: Codex（独立验收）、Contributor与Branch均保持；原卡没有单列Owner，治理字段不伪造历史Owner。无下一位产品Agent提示词；文档候选交根线程独立验收后写中央review，不重做清理或代表用户作新的删除裁决。

## 历史范围

2026-10-04布局收口计划及对应历史任务；原卡未写具体完成日期，计划文件日期只定位该份布局证据。122/652/50+均属于当时清点，不当当前文件总量或本轮1838基线迁移数。

## 当时证据

原卡记录build时122工具/50+目录、Review accept及用户接受。布局计划包含逐文件source/after、caller/import/cwd/temporary/cleanup/retention字段；本轮只核头部与一个示例解释结构，没有逐项核读652条或执行这些工具。

## 当前有效性

historical。保留当时布局接收与用户裁决；当前附件归属、悬空链接、相对import与全量SHA仍须由本轮全量治理逐项复核，不继承旧652项accept。根结构变更不能冒充runtime/E2E/coverage通过。

## 继任文档

追溯用[历史布局计划](../../../../testing/archive/migrations/testing-layout-closeout-20261004.json)；现行维护由[测试治理](../../../../testing/governance.md)和[项目文档模型](../../../guides/documentation-model.md)承接。全量1838+增量的进度归[DOCS-FULL-TEMPLATE-1](../../../tasks/DOCS-FULL-TEMPLATE-1.md)，不借本卡done提前关闭。

## 原始结论

以下完整原卡只按原始时点解释。原字节可从 Git blob `23fff034a1946d5a57d66958a8d587574fb1582b` 回读；新增正文没有替代原历史判断。

> # TESTING-DOC-LAYOUT-1 - 测试文档根目录结构收口
>
> Status: done
> Phase: ops
> Capability: ops / testing-docs
> Coding Owner: Codex
> Reviewer: Codex（独立验收）
> Visual Verification Owner: N/A
> Contributor: Codex
> Branch: codex/testing-doc-layout-cleanup
>
> ## 目标
>
> 将测试文档目录从“治理账完整但根目录仍平铺”收口为可维护的信息架构：根目录只保留明确入口，所有 legacy 工具归入真实工程域 tools，所有 Agent/批次目录进入历史归档；保留 SHA、公开入口和相对导入语义，不把移动当成 runtime 通过。
>
> ## 严格验收标准
>
> - `docs/testing` 根目录非白名单条目为 0；不得再出现按 Agent、批次或旧能力命名的平铺文件/目录。
> - 122 个工具全部有 domain/module/capability、source SHA、after SHA、imports/cwd/runner/temporary-tree/cleanup、caller、合法输入、business oracle、dedupe、history/supersedes、截止日和本卡关联。
> - 所有相对 import、Markdown 链接、公开 runner 与旧路径引用可解析；迁移前后 SHA 记录一致且无 payload 漂移。
> - `legacy-flat.json`、classification、catalog、indexes、历史归档和布局迁移计划一致，不能静默删除。
> - `pnpm check:docs`、`pnpm lint`（error/warning/info 全 0）、`git diff --check` 通过；diff 不得触及 `packages/`、`scripts/e2e/`、旧测试或 coverage。
>
> ## 范围与停止线
>
> 只改 `docs/testing/**`、`scripts/docs/**`、本卡与看板。若某工具存在无法解析的真实 caller、相对 import、临时目录或不可判定的 runner，不得猜测；保留原文件并在布局计划中记录阻塞、截止日和下一步，不得标记 done。
>
> ## 验收记录
>
> - 进入 build：Codex 已确认当前 main 根目录仍有 122 个平铺工具和 50 个以上 Agent/批次目录；旧 full-closeout 只完成历史账和文档归档，不满足本卡结构标准。
> - Review：accept；根目录白名单、652 项 after SHA、静态 import、docs 门和 lint 均通过。
> - 用户验收：接受结构收口；根目录不再保留平铺 Agent/批次材料。
>
> ## 下一位 Agent 提示词
>
> 无下一位 Agent；本卡由 Codex 独立实施、验证、合并和推送。
