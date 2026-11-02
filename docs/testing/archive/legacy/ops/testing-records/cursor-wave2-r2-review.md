# CURSOR-WAVE-2-1 · Codex 二轮独立接收

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 CURSOR-WAVE-2-1 二轮接收（2026-09-25，返工候选 0d475c12…18d7 已与主线合流）：W1/W5 accept 并选择性接入；W3/W4 保持窄 counter，整卡仍 rework（W2 已于首轮接入 cbac3ca0）。候选白名单只有三份指南、editor/game/docs 工具测试、专属回执与索引，生产/资产/配置/官方基线零 diff。

## Scope

- W1：shared-script-author-guide.md:35 改为另建脚本后在统一指令树重写正文（不再虚构整段粘贴入口），接入 4bf28bef/00d98974；W5：无效路径/目的地覆盖真实 validateMoves 与 applyRelocation、临时树 finally 清理、重复围栏例撤销按 existing-proof 登记，接入 1c164125/720633ad（main 复跑 docs-tools 37/37+check.mjs+Biome/diff PASS）。

## Execution and assertions

- **W3 反证**：binary-signature.test.ts:1 新增 @ts-nocheck 绕过类型门；:42-64「单点负控」只在测试中另写 sha256HexWholeBuffer 仿写函数再断言它抛 AssertionError，未把变异加载进实际被测模块；最小修正：去掉 @ts-nocheck；隔离 Vite load 只改生产函数一处，同一偏移视图测试变异树 exit1 业务红、原树 exit0、产品 hash 不变；不把自导自演反例放进正式绿套件
- **W4 反证**：fps-overlay.test.ts:102-116 正则提阈值+测试内另写 className 模拟「>=49」；真正 tickFps/渲染模块未在变异下执行（:80,87,98 精确显示值已修保留）；隔离单点阈值 >=49 同一 49/50 正式断言真实业务红；移除或如实标记自写公式演示
- **复跑**：editor 49/49、game 21/21、双包 typecheck、文档定向 24/24 均绿；绿测证明常态运行不证明变异鉴别力；不跑全仓门，待 W3/W4 收敛统一执行

## Results

- Cursor 工作树最终干净，自建依赖软链接已删。

## Evidence

- 证据路径：本回执正文（quote 保全）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 二轮接收 | 2026-09-25 | W1/W5 接入；W3/W4 反证 | 窄 counter，整卡 rework | 首轮 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy ops/testing-records 的 cursor-wave2 二轮接收回执；固定来源与 source SHA 见下方保全节。

## 原始结论

W1 指南纠偏+W5 真实守卫覆盖接入；W3/W4 自导自演负控（仿写函数/正则模拟）不自证变异鉴别力。

## 当时证据

W3/W4 反证表与接入 SHA 在 quote 保全。

## 当前有效性

historical。counter 由三轮接收闭合（整卡 done）。

## 继任文档

当前结论归 CURSOR-WAVE-2-1 后续三轮回执。

## 原文保全

固定源 revision `e0ddc80b28ab45394aa560855d51de65ecd568e1`，source SHA `e9554feea1f8effa4a0b919b2754e76a594a4baf025c4cee8e0bb91f9004c0e8`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # CURSOR-WAVE-2-1 · Codex 二轮独立接收
>
> 2026-09-25；返工候选 `0d475c12ca964e37a15665cecae18d07387f18d7`，已与主线合流。结论：**W1/W5 accept 并选择性接入；W3/W4 保持窄 counter，整卡仍 rework。** W2 已于首轮接入 `cbac3ca0`，本轮未重复提交。Cursor 工作树最终干净，开工时自建的依赖软链接已删；候选白名单只有三份指南、editor/game/docs 工具测试、专属回执与索引，生产实现、资产、配置和官方覆盖基线零 diff。
>
> ## 已接收
>
> - W1：`shared-script-author-guide.md:35` 改为另建脚本后在统一指令树**重写**正文，不再虚构整段粘贴入口；其余六处已证指南纠偏保留。接入 main 为 `4bf28bef`、`00d98974`。
> - W5：新增的无效路径/目的地覆盖真实 `validateMoves` 与 `applyRelocation`，`cursor-security-boundary.test.mjs` 的自建临时树已用 `finally` 清理，重复且标题过大的围栏例撤销、按 existing-proof 登记。接入 main 为 `1c164125`、`720633ad`。本人在 main 复跑 `pnpm test:docs-tools` 37/37、`node scripts/docs/check.mjs` PASS、改动测试 Biome/diff PASS。W5 回执仍记录 W3/W4 候选数字，**不表示那两包已入正式测试**。
>
> ## 仍需 Cursor 定点返工
>
> | 包 | 直接反证 | 最小修正 |
> |---|---|---|
> | W3 | `binary-signature.test.ts:1` 新增 `@ts-nocheck` 绕过 editor 类型门。`:42-64` 所谓“单点负控”只在测试中另写 `sha256HexWholeBuffer`，再主动断言这个仿写函数会抛 AssertionError；没有把变异加载进实际 `binary-signature.ts` 被测模块。生产 `sha256Hex` 在负控段仍未变。 | 去掉 `@ts-nocheck` 并在本仓 typecheck 绿；用隔离 Vite load / 临时构建副本只改生产函数一处，让**同一条新增偏移视图测试**在 mutated module 上 exit1 且业务 AssertionError，原树 exit0，磁盘产品 hash 不变。若测试无需改，负控脚本/命令/日志可放自有临时目录和回执，不把自导自演的反例放进正式绿套件。 |
> | W4 | `fps-overlay.test.ts:102-116` 只用正则从源码提阈值，再在测试里另写 `className` 函数模拟“>=49”，并捕获预期 AssertionError；真正的 `tickFps`/渲染模块没有在变异下执行。`:80,87,98` 的精确显示值断言已修，保留。 | 隔离单点把生产模块阈值加载为 `>=49`，运行同一条 49/50 正式断言得到真实业务红；正常树绿、源 hash 不变。移除或如实标记当前自写公式演示，不能称其为运行态变异证明。 |
>
> 本人在候选工作树临时链接主仓已安装依赖、结束时精确撤链并核工作树干净；独立复跑 editor 49/49、game 21/21、双包 typecheck、文档定向 24/24 均绿。**绿测证明常态运行，不证明上述变异鉴别力。** 不运行全仓 check/ratchet/strict-fast，待 W3/W4 收敛后统一执行一次。不得重开 W1/W2/W5、修改产品源码或降低旧断言。
>
<!-- original-source-quote:end -->
