# QUALITY-LINT-ZERO-TEST-CONTRACT-1 — 零诊断专测输入排重

Status: done
Owner: Codex
Reviewer: Codex（单 Agent 自审）
Phase: ops
Capability: quality-tools
Visual Verification Timing: N/A（Node/Biome工具测试）
Branch: codex/code-quality-94-102

## 目标

继续[百文件窗口](QUALITY-PENDING-100-1.md)，全文核 `scripts/quality/lint-zero.test.mjs` 的真实报告输入、反例原子性与真实Biome进程隔离。

## 范围

仅上述一个完整专测模块；`lint-zero.mjs`、终端namespace、Biome配置与真实CLI作为caller/依赖补读，不增加关闭数，不改规则或判据。

## 前提真值门

实际inspectLintResult消费JSON文本。旧坏计数表的NaN、Infinity、null都先经过JSON.stringify，三者进入被测函数的字节完全相同；不能把它们当三种独立输入。保留null反例、移除两个别名重复，原JSON语法拒绝例仍保留。可用原生Node序列化和旧→新identity映射反证，不需改变任何产品或质量政策。

## 上下文锚点

[长期八维与测试要求](../code-quality.md)、[窗口前组证据](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/README.md)。基点 `123595ac3a651957b36061eacced329369c495e5`；源/依赖版本、原件、逐维结论随同一证据入口记录。

## 验证

先保留旧完整TAP，再验证两退役identity与null的实际输入完全相同，改后运行必要quality-tools相邻回归。运行本专测中的临时小树Biome是实际caller验证，未运行全仓lint/check或coverage。全仓与提交仍等约100主体文件。

## 当前模式推进记录

Codex build allowed：仅明确重复输入的测试排重与逐文件验收，Owner仅Codex。旧合同保留方向逐项记录；重要未知继续review，不靠绿数关闭。

## 交接

无下一位Agent提示词；由Codex完成此模块后继续pal-extract非localization的pending切片。

- 2026-10-26 1主体代码接受；27→25仅两个同JSON别名映射到null，质量工具45绿/0stderr。A–H、身份/原件见共同review.json；统一门/提交留约100窗口，未宣布本窗口集成完成。

## 本窗口本地验收收口

2026-10-28（JST）：100主体八维及本地统一门接受；本次提交时远端PR/CI/合并尚待，发布以受保护PR实际结果为准。 20536包测试＋732工具测试全部通过、七包typecheck和whole lint error/warning/info为0；唯一official20,188fast/809src，有限计数调整后原报告ratchet/protected0。文件关闭只来自本卡既有逐文件证据，未扩大到其它pending。见[统一原件与只读复验](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/uniform/README.md)。本卡done指本地审查/整改/验收，远端发布不是预先完成声明。
