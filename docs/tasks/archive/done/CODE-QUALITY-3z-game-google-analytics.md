# CODE-QUALITY-3z — game Google Analytics page-view 窄批

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

原卡目标:逐文件核验 game 宿主可选隐私统计扩展三文件（`google-analytics.ts` 与主/boundaries 测试）:measurement ID 合法性、UTM 白名单/长度、游戏参数剔除、gtag/dataLayer ownership、脚本失败重试、同意撤回、页面去重、异常传播与 unsubscribe 清理;生产 caller 是 `install-analytics.ts:28-54` 与 `main.ts:1-19`,同意来源由 analytics-consent 提供。无原版机制,不改变游戏状态/存档/schema/输入/UI。

## 范围

三文件;不扩大到 consent UI 或安装器;保持现有 page-view 语义与失败关闭策略。

## 前提与证据

历史批:定向 Vitest 12/12、game 全包 3500 passed/7 skipped、`pnpm check`（editor 既有 number-field-adoption 失败未改统计配置）、ratchet 首次受 Reforge 5 个 covered 项波动失败原样重跑通过、protected fast 0 项下降、lint 3955 零诊断;账本 3258 files/232→235 closed。

## 验收

2026-10-21 analytics 四卡收口:原 GA 三文件及测试专用宿主、批准的安装失败专测共五文件接受——原十个 consent/GA 反控与五先红后绿按实际版本复用;私有 disable 键类型收窄,无广域 Record 强转,发射 JS 保持;不附带真实 Google 网络/多 property 或跨 realm 承诺。逐文件 A–H、完整原件与集中门见 [analytics-closeout.json](../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json);只读 verify-analytics 默认不写树/不重跑测试。

## 状态与交接

done 保持原历史语义;2026-10-21 收口只接受原卡范围及明确支持文件,广域 main/实网/E2E 不附带关闭。

## 历史范围

原卡属 2026-10-11 前后窄批时点;原始记录在保全块内逐字保留。

## 原始结论

原卡结论按 Status(done) 原样:未发现直接缺陷。治理不撤销/不恢复旧信用。

## 当时证据

当时回执（12 定向、ratchet 波动重跑、lint 3955）属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;当前结论以 analytics-closeout 原件为准。

## 继任文档

CODE-QUALITY-3y（consent）、40（安装器）、41（consent UI）与 analytics-closeout 为同族继任;当前任务导航以看板为准。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3259B / SHA-256 12761354b47d29f649af35f3ece225c3991744df8bdf32a957c043a4bfba30d6；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-3z — game Google Analytics page-view 窄批

Status: done
Phase: phase1 game
Coding Owner: Codex
Scope: `packages/game/src/analytics/google-analytics.ts`、`google-analytics.test.ts`、`google-analytics.boundaries.test.ts`
Visual Verification Timing: N/A

## 前提与范围

这是 game 宿主的可选隐私统计扩展，没有原版机制，不改变游戏状态、存档、schema、输入或 UI 形态。
生产 caller 是 `install-analytics.ts:28-54`，启动 caller 是 `main.ts:1-19`；同意来源由上一批
`analytics-consent.ts` 提供。范围只覆盖 page-view URL 清洗、GA 初始化/脚本生命周期、同意切换、
页面订阅和失败隔离，不扩大到 consent UI 或安装器。

## 逐文件核验计划

- `google-analytics.ts`：全文核对 measurement ID 合法性、UTM 白名单/长度、游戏参数剔除、gtag/dataLayer
  ownership、脚本失败重试、同意撤回、页面去重、异常传播和 unsubscribe 清理。
- `google-analytics.test.ts`：全文核对真实 `startGoogleAnalytics` caller、合法页面输入、page-view oracle、
  URL 反例、脚本失败与 gtag 队列形态。
- `google-analytics.boundaries.test.ts`：全文核对 ID/UTM 边界、无 page subscriber 的合法安装、同意重授、
  disable flag 和宿主网络隔离；不以测试数量替代合同判别力。

## 当前证据

已读取上述三文件、`install-analytics.ts`、`main.ts`、consent caller/UI 相邻实现；定向 Vitest 12/12
通过，未发现直接缺陷。

## 收口验证

- game typecheck：通过。
- game 全包：309 test files，3500 passed、7 skipped。
- `pnpm check`：content/docs、shared、game、pal-extract、reforge 通过；editor 的既有 `number-field-adoption.test.ts` 失败（`command-form-controls.tsx@Num` 实际 37、期望 39），未改 editor 或统计配置。
- `pnpm coverage:ratchet`：首次受 Reforge 5 个 covered 项波动影响失败；原样重跑通过，基线不变（19,789 tests）。
- protected `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`：通过，0 项下降。
- `pnpm lint`：3955 files，0 errors / 0 warnings / 0 infos。
- `node scripts/quality/code-quality-ledger.mjs`：通过，3258 files，232 closed / 5 review / 3021 pending（本卡账本更新后应为 235 / 5 / 3018）。
- `git diff --check`：通过。

## 验收与边界

保持现有 page-view 语义与失败关闭策略；若发现用户可见行为、公共接口或隐私政策取舍变化，立即停线并转高风险/用户裁决。

## 下一位 Agent 提示词

无下一位 Agent；Codex继续完成本批审计与质量门，不扩大文件白名单。

## 2026-10-21 analytics四卡收口

原GA三文件及测试专用宿主、批准的安装失败专测共五文件接受。原十个consent/GA反控与五先红后绿按实际版本复用；私有disable键类型收窄，无广域Record强转，发射JS保持；不附带真实Google网络/多property或跨realm承诺。

[逐文件A–H、完整原件与集中门](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json)；只读verify-analytics默认不写树/不重跑测试。原卡范围及明确支持文件接受，广域main/实网/E2E不附带关闭。
```
<!-- incremental-original-source:end -->
