# CODE-QUALITY-3y — game analytics consent 窄批

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

原卡目标:逐文件核验隐私同意存储三文件（`analytics-consent.ts` 与主/boundaries 测试）:存储、DNT/GPC 默认拒绝、广播订阅与失败关闭语义;生产 caller 为 install-analytics（安装 UI 与 GA 订阅）及 main.ts（生产启用、异常隔离）。该扩展没有原版机制,不改变游戏行为、存档、schema 或公共接口。

## 范围

三文件;相邻 google-analytics/analytics-consent-ui 用于生命周期与事件 oracle。

## 前提与证据

直接核对:合法输入、异常存储、dispatch 失败、非 CustomEvent、unsubscribe 后零回调和 stored consent 优先级;未发现直接缺陷。历史批:定向 6/6、game 全包 3491 passed/13 skipped（隔离 worktree 缺 `data/extracted/data/enemy-teams.json` 致 dev-panel.test.ts 失败,环境问题未改数据）;`pnpm check` 首次因归档索引未生成失败,生成后 0 issues;ratchet 基线不变（19,789）;protected fast 因 worktree node_modules 运行期间被清理 reforge 阶段失败（环境问题）;ledger 3258 files/232 closed。

## 验收

2026-10-21 analytics 四卡收口:原 consent 三文件接受——持久提交/广播顺序、DNT/GPC 默认和异常边界复用五个既有指定反控;当前同窗生产 caller 核清;BrowserPrivacySignals 已由 installer 复用,存储/事件与 UI/SDK 职责分离。逐文件 A–H 与原件见 [analytics-closeout.json](../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json)。

## 状态与交接

done 保持原历史语义;收口只接受原卡范围及明确支持文件。

## 历史范围

原卡属 2026-10-11 窄批时点;原始记录与交接日志在保全块内逐字保留。

## 原始结论

原卡结论按 Status(done) 原样:未发现直接缺陷。治理不撤销/不恢复旧信用。

## 当时证据

当时回执（6 定向、两项环境失败记录、ledger 3258）属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;当前结论以 analytics-closeout 原件为准。

## 继任文档

CODE-QUALITY-3z/40/41（analytics 同族）与 analytics-closeout 为继任;当前任务导航以看板为准。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2598B / SHA-256 140c0e193e34f71cde03e07d213aa78872b7539ac8bc0a9f13ee783eeb29cc84；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-3y — game analytics consent 窄批

Status: done
Phase: phase1 game
Coding Owner: Codex
Scope: `analytics-consent.ts`、`analytics-consent.test.ts`、`analytics-consent.boundaries.test.ts`
Visual Verification Timing: N/A

## 目标与证据

逐文件核验隐私同意存储、DNT/GPC 默认拒绝、广播订阅与失败关闭语义。生产 caller 为
`install-analytics.ts`（安装 UI 与 GA 订阅）及 `main.ts`（生产启用、异常隔离）；相邻
`google-analytics.ts`、`analytics-consent-ui.ts` 用于生命周期与事件 oracle。该扩展没有原版机制，
不改变游戏行为、存档、schema 或公共接口。

已全文读取三份范围文件、caller、相邻实现及其测试；直接核对合法输入、异常存储、dispatch 失败、
非 CustomEvent、unsubscribe 后零回调和 stored consent 优先级。未发现直接缺陷。

## 验证

- 定向 Vitest：6/6 通过（两文件）。
- 未修改实现或测试；未触碰高风险边界。
- game typecheck：通过。
- game 全包：3491 passed / 13 skipped；因隔离 worktree 缺失 `data/extracted/data/enemy-teams.json`，`dev-panel.test.ts` 失败，未改数据。
- `pnpm check`：文档工具通过后因当前卡归档索引尚未生成而首次失败；生成索引后 `node scripts/docs/check.mjs` 0 issues。
- `pnpm coverage:ratchet`：各包 fast 全部通过，基线保持不变（总 19,789 tests）。
- protected `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`：因 worktree `node_modules` 在运行期间被清理，reforge 阶段失败（环境问题，未改源码）。
- `pnpm lint`：3955 files，0 errors / 0 warnings / 0 infos。
- ledger：3258 files，232 closed / 5 review / 3021 pending。

## 交接日志

2026-10-11 Codex：从最新 `origin/main` 隔离 worktree 逐文件核验；完成定向测试，准备运行官方质量门并更新账本。

## 下一位 Agent 提示词

无下一位 Agent 提示词，等待 Codex 质量门收口；不得扩大范围或标记其它 analytics 文件已验证。

## 2026-10-21 analytics四卡收口

原consent三文件接受。持久提交/广播顺序、DNT/GPC默认和异常边界复用五个既有指定反控；当前同窗生产caller核清。BrowserPrivacySignals已由installer复用，存储/事件与UI/SDK职责分离。

[逐文件A–H、完整原件与集中门](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json)；只读verify-analytics默认不写树/不重跑测试。原卡范围及明确支持文件接受，广域main/实网/E2E不附带关闭。
```
<!-- incremental-original-source:end -->
