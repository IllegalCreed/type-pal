# CODE-QUALITY-41 — game analytics consent UI 窄批

Status: done
Phase: phase1 game
Coding Owner: Codex
Scope: `packages/game/src/analytics/analytics-consent-ui.ts`、`analytics-consent-ui.test.ts`
Visual Verification Timing: dev-functional（现有 DOM UI 形态与可达性；不改变布局取舍）

## 前提与范围

这是可选访问统计的现有 DOM 提示层，由 `install-analytics.ts:29-36` 安装，使用
`analytics-consent.ts` 的存储/广播接口。它不改变游戏状态、存档、schema、输入或正式 UI 形态；
本批只核全文实现、按钮/焦点/销毁生命周期、存储失败策略、隐私信号文案与真实测试 oracle。

## 逐文件核验计划

- `analytics-consent-ui.ts`：全文核对现有面板/偏好按钮结构、ARIA、定位样式、show/hide 状态、合法选择、
  storage/eventTarget ownership、重复安装与 destroy 清理；不自作主张改 UI 形态。
- `analytics-consent-ui.test.ts`：全文核对公开 mount caller、DOM 合法输入、布局/焦点/按钮与失败存储 oracle；
  jsdom 断言不冒称真实浏览器截图，必要的最小功能 UI 证据另记。

## 当前证据

已读取实现、测试、`install-analytics.ts`、consent caller、`main.ts`；未发现直接缺陷。

## 收口验证

- 定向 Vitest：3/3 通过；game typecheck：通过。
- 开发期功能 UI：`http://localhost:6005/` 的 AX 树实际显示“可选访问统计”面板、隐私政策链接、拒绝/允许按钮；截图核对加载画布，控制台仅有预期 autoplay 警告。未改变 UI 形态。
- game 全包：311 test files，3519/3519 通过。
- `pnpm check`：docs/content、shared、game、pal-extract、reforge 通过；editor 既有 `number-field-adoption.test.ts` 失败（`command-form-controls.tsx@Num` 实际 37、期望 39），未改 editor 或 coverage 配置。
- `pnpm coverage:ratchet`：通过并按主线新增测试更新官方 fast baseline；总 19,798 tests，提升 9 项、范围变化 4 项。
- protected `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`：通过，0 项下降。
- `pnpm lint`、docs/content review、ledger、`git diff --check`：归档后复核通过。

## 下一位 Agent 提示词

无下一位 Agent；Codex继续完成本批审计，未完成准入前不得扩大范围或标记 done。

## 2026-10-21 analytics四卡收口

原UI两文件接受。实现字节未改；补真hidden/偏好切换与已存在焦点，两个旧3绿→新2绿1指定业务红，外部Owner探针恢复。真实浏览器拒绝/重开/允许/再重开/清理通过；旧图片附件缺失明示，当前截图已看。

[逐文件A–H、完整原件与集中门](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json)；只读verify-analytics默认不写树/不重跑测试。原卡范围及明确支持文件接受，广域main/实网/E2E不附带关闭。
