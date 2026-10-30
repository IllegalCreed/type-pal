# CODE-QUALITY-42 — game dialog box 窄批

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「CODE-QUALITY-42 — game dialog box 窄批」的任务归属与历史边界。原目标见原文(摘录:Scope: `packages/game/src/present/dialog-box.ts`、`dialog-box.test.ts`、`dialog-box.glm-next-wave.test);本页治理不重开已终态任务。

## 范围

原卡含章节[CODE-QUALITY-42 — game dialog box 窄批、前提与范围、逐文件核验计划、当前证据、收口验证、下一位 Agent 提示词],共0个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源2142B(SHA b9d0c1080023);原卡前提按原时点保留。当前存活入口:无当前仓库内存活链接。

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:done),治理不改写。

## 状态与交接

done保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。

## 历史范围

原卡属固定main时点;CODE-QUALITY-42 — game dialog box 窄批的原始范围与日期在保全块内逐字保留。

## 原始结论

原卡结论按其Status(done)原样;治理不撤销/不恢复旧信用。

## 当时证据

原文0个链接与当时回执属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;不凭旧基点认定当前实现或授权新产品取舍。

## 继任文档

接替/关联入口见原文链接;当前任务导航以看板为准。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2142B / SHA-256 b9d0c1080023240c5c372f39094347e351bc24b8ee95be1743178ecfb4c44bf8；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-42 — game dialog box 窄批

Status: done
Phase: phase1 game
Coding Owner: Codex
Scope: `packages/game/src/present/dialog-box.ts`、`dialog-box.test.ts`、`dialog-box.glm-next-wave.test.ts`
Visual Verification Timing: e2e-deferred（对话演出观感留集中 E2E；本批核绘制/状态合同与像素 oracle）

## 前提与范围

对话框是第一阶段 indexed framebuffer 呈现层；生产 caller 由 event-system/menu/dialog 绘制路径提供，
行为真值来自 `reference/sdlpal/text.c` 与 `uigame.c`。本批只核 dialog box 几何、边框/文字/头像、
分页和状态清理、非法资源降级、测试 oracle 与生命周期；不改变 UI 形态、脚本语义、存档或公共接口。

## 逐文件核验计划

- `dialog-box.ts`：全文读取所有绘制/布局/清理分支，核输入边界、opaque mask、字体/头像资源失败、分页状态
  ownership、framebuffer 写入和真实 caller。
- `dialog-box.test.ts`：全文读取合法 typed 输入、直接 framebuffer/状态 oracle、分页与清理反例，排重现有 pixel 合同。
- `dialog-box.glm-next-wave.test.ts`：全文读取新增边界合同、真实公开 caller、反控判别力与隔离，不以数量/coverage 代替质量。

## 当前证据

已读取三个范围文件及 event-system/present caller、相邻 pixel tests；未发现直接缺陷。

## 收口验证

- 定向 Vitest：82/82 通过；game typecheck：通过。
- game 全包：311 test files，3519/3519 通过。
- `pnpm check`：docs/content、shared、game、pal-extract、reforge 通过；editor 既有 `number-field-adoption.test.ts` 失败（`command-form-controls.tsx@Num` 实际 37、期望 39），未改 editor 或 coverage 配置。
- `pnpm coverage:ratchet`：通过，基线不变（19,798 tests）。
- protected `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`：通过，0 项下降。
- docs/content review、lint-zero、ledger、`git diff --check`：归档后复核通过。

## 下一位 Agent 提示词

无下一位 Agent；Codex继续完成本批审计，未完成准入前不得扩大范围或标记 done。
```
<!-- incremental-original-source:end -->
