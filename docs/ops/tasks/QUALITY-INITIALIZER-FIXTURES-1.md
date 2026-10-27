# QUALITY-INITIALIZER-FIXTURES-1 — 原生初始化器探针的九个 fixture

Status: done
Owner: Codex
Reviewer: Codex（单 Agent 自审）
Phase: ops
Capability: quality-tools
Visual Verification Timing: N/A（隔离原生/Vitest探针）
Branch: codex/code-quality-94-102

## 目标

在[约百文件窗口](QUALITY-PENDING-100-1.md)逐文件核初始化器探针 fixture 的合法性、独立 oracle、重复必要性和隔离，避免把fixture的形式重复误删，或用覆盖率证明自身。

## 范围

`scripts/coverage/fixtures/initializers/` 下九文件：capture.mjs、native-subject.mjs、subject.ts、两call文件、四import文件。这是一个明确模块切片，原生采集器、被测形状与node/jsdom多文件探针共同验收；不改合并补丁、包配置或baseline。

## 前提真值门

Native call ledger 与 V8 inspector ranges 相互独立；实际Vitest include明确选四个import文件，并在另一轮加两个call文件。成对同形import文件用于复现跨文件合并，node/client环境分别采集；不是靠改名重复增加产品测试数。fixture计数仅作探针合同，不充当游戏业务覆盖。

## 上下文锚点

[探针宿主卡](QUALITY-COVERAGE-PREFLIGHT-PROBES-1.md)、[八维与测试规范](../code-quality.md)、[共同证据入口](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/README.md)。已完整读九文件与父测试，子进程只写自己临时树，inspector finally断开，parent after清理。

## 验证

未修改fixture，复用同字节真实probe-directed执行及原生计数/oracle；状态不由fixture短小或包绿推定。逐文件A–H写入共同review.json；原始Node TAP保留，临时子报告未另存则明确披露。统一check/覆盖率/提交按约100主体文件窗口执行。

## 当前模式推进记录

Codex build allowed：限九fixture完整审查；无产品实现修改。未知项与必要更改独立记录，未定重要问题不得关闭。

## 交接

无下一位Agent提示词。由Codex同树完成逐文件判断并计入窗口，不能只因父测试通过而计九文件完成。

- 2026-10-26 代码审查收口：本卡9主体文件A–H接受，具体结论/问题/原件见共同review.json。136工具相邻与必要反控成立，统一门仍待约100窗口；Status review表示等集中门，非整文件尚缺维。未提交、未推送或合并。

## 本窗口本地验收收口

2026-10-28（JST）：100主体八维及本地统一门接受；本次提交时远端PR/CI/合并尚待，发布以受保护PR实际结果为准。 20536包测试＋732工具测试全部通过、七包typecheck和whole lint error/warning/info为0；唯一official20,188fast/809src，有限计数调整后原报告ratchet/protected0。文件关闭只来自本卡既有逐文件证据，未扩大到其它pending。见[统一原件与只读复验](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/uniform/README.md)。本卡done指本地审查/整改/验收，远端发布不是预先完成声明。
