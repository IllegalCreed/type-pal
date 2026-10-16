# CURSOR-WAVE-2-1 · Codex 二轮独立接收

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision e0ddc80b28ab45394aa560855d51de65ecd568e1；本轮 R80。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- CURSOR-WAVE-2-1 · Codex 二轮独立接收：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

## 当时证据

- 原始命令、输入、caller/oracle、结果、机器字段、SHA、counter、链接和未执行项保留于 quote。

## 当前有效性

historical。历史测试结论必须带日期和 source revision，并由当前 catalog、contract、fresh receipt 重新核定。

## 继任文档

- 当前入口：对应 testing catalog/domain report、contract、paired evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、真实 caller/oracle、排重、独立 review 和静态零诊断。

## 停止线

- 本页不证明 runtime、E2E、视觉、coverage 或当前产品行为；不得以 archive wrapper 替代执行回执。

## 原文保全

固定 source revision `e0ddc80b28ab45394aa560855d51de65ecd568e1`，source SHA `e9554feea1f8effa4a0b919b2754e76a594a4baf025c4cee8e0bb91f9004c0e8`；下方 quote 可逆回原始 UTF-8 字节。
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
