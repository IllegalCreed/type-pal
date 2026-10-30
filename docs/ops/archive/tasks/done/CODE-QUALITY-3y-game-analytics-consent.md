# CODE-QUALITY-3y — game analytics consent 窄批

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「CODE-QUALITY-3y — game analytics consent 窄批」的任务归属与历史边界。原目标见原文(摘录:Scope: `analytics-consent.ts`、`analytics-consent.test.ts`、`analytics-consent.boundaries.test.ts` Vis);本页治理不重开已终态任务。

## 范围

原卡含章节[CODE-QUALITY-3y — game analytics consent 窄批、目标与证据、验证、交接日志、下一位 Agent 提示词、2026-10-21 analytics四卡收口],共1个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源2598B(SHA 140c0e193e34);原卡前提按原时点保留。当前存活入口:[analytics-closeout.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json)

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:done),治理不改写。

## 状态与交接

done保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。

## 历史范围

原卡属固定main时点;CODE-QUALITY-3y — game analytics consent 窄批的原始范围与日期在保全块内逐字保留。

## 原始结论

原卡结论按其Status(done)原样;治理不撤销/不恢复旧信用。

## 当时证据

原文1个链接与当时回执属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;不凭旧基点认定当前实现或授权新产品取舍。

## 继任文档

接替/关联入口见原文链接;当前任务导航以看板为准。 关联:[analytics-closeout.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json)


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
