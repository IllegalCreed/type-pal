# CODE-QUALITY-40 — game analytics 安装器窄批

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

原卡目标:逐文件核验可选统计安装薄壳两文件（`install-analytics.ts` 与测试）:options、consent storage、UI/GA 安装和 destroy 生命周期——同一 window/document ownership、enabled 语义、navigator 隐私信号传递、异常隔离和重复/销毁边界;生产 caller 为 `main.ts:1-19`。

## 范围

两文件;不改变游戏状态、存档、schema、输入、公共产品 UI 或正式脚本行为;不把 jsdom 不加载远程脚本冒称真实网络验证。

## 前提与证据

历史批:定向 2/2、game 全包 3519、ratchet 基线不变（19,789）、protected fast 0 项下降、lint 3955 零诊断;账本 3258 files/237 closed/5 review/3016 pending。

## 验收

2026-10-21 analytics 四卡收口:原安装器两文件接受——复用已批准失败撤监听/UI 并向 main 传播原错误的实现;隐私信号复用同结构类型;测试使用自有 Document/SDK 描述符并精确恢复自有键,外部 Owner 探针旧红新绿。逐文件 A–H 与原件见 [analytics-closeout.json](../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json)。

## 状态与交接

done 保持原历史语义;收口只接受原卡范围及明确支持文件。

## 历史范围

原卡属 2026-10-11 前后窄批时点;原始记录在保全块内逐字保留。

## 原始结论

原卡结论按 Status(done) 原样:未发现直接缺陷。治理不撤销/不恢复旧信用。

## 当时证据

当时回执（2 定向、lint 3955 零诊断）属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;当前结论以 analytics-closeout 原件为准。

## 继任文档

CODE-QUALITY-3y/3z/41（analytics 同族）与 analytics-closeout 为继任;当前任务导航以看板为准。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2787B / SHA-256 16e0f423566824f78fd05b1cba46ae7a76b0c7e57081318141000622e8afcb6c；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-40 — game analytics 安装器窄批

Status: done
Phase: phase1 game
Coding Owner: Codex
Scope: `packages/game/src/analytics/install-analytics.ts`、`install-analytics.test.ts`
Visual Verification Timing: N/A（本批只核安装生命周期；consent UI 另批）

## 前提与范围

`installTypePalAnalytics` 是 game 宿主的可选安装薄壳：生产 caller 为 `main.ts:1-19`，将浏览器
window/document/navigator 接到上一批 consent 与 Google Analytics 模块。它不改变游戏状态、存档、
schema、输入、公共产品 UI 或正式脚本行为。本批只核 storage/隐私信号接线、生产开关、销毁顺序、
异常边界和真实 caller，不修改实现。

## 逐文件核验计划

- `install-analytics.ts`：全文读取 options、consent storage、UI/GA 安装和 destroy 生命周期；核同一
  window/document ownership、enabled 语义、navigator 信号传递、异常隔离和重复/销毁边界。
- `install-analytics.test.ts`：全文读取真实公开安装入口、合法宿主输入、DOM/dataLayer oracle、开发开关、
  DNT/GPC 与销毁合同；不把 jsdom 不加载远程脚本冒称真实网络验证。

## 当前证据

已读取实现、测试、`main.ts`、consent/google/UI 相邻 caller；未发现直接缺陷，生产/测试边界保持原样。

## 收口验证

- 定向 Vitest：2/2 通过。
- game typecheck：通过。
- game 全包：311 test files，3519/3519 通过。
- `pnpm check`：docs/content、shared、game、pal-extract、reforge 通过；editor 既有 `number-field-adoption.test.ts` 失败（`command-form-controls.tsx@Num` 实际 37、期望 39），未改 editor 或 coverage 配置。
- `pnpm coverage:ratchet`：通过，基线不变（19,789 tests）。
- protected `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`：通过，0 项下降。
- `pnpm lint`：3955 files，0 errors / 0 warnings / 0 infos。
- `node scripts/quality/code-quality-ledger.mjs`：通过，3258 files，237 closed / 5 review / 3016 pending。
- docs checker/content review 与 `git diff --check`：通过。

## 下一位 Agent 提示词

无下一位 Agent；Codex继续完成本批审计，签字门禁未完成前不得扩大范围或标记 done。

## 2026-10-21 analytics四卡收口

原安装器两文件接受。复用已批准失败撤监听/UI并向main传播原错误的实现；隐私信号复用同结构类型。测试使用自有Document/SDK描述符并精确恢复自有键，外部Owner探针旧红新绿。

[逐文件A–H、完整原件与集中门](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json)；只读verify-analytics默认不写树/不重跑测试。原卡范围及明确支持文件接受，广域main/实网/E2E不附带关闭。
```
<!-- incremental-original-source:end -->
