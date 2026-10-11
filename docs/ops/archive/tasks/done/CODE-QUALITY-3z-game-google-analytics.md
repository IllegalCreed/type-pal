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
