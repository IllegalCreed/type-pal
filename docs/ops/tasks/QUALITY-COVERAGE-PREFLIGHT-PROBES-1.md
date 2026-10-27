# QUALITY-COVERAGE-PREFLIGHT-PROBES-1 — 工具预检与原生合并探针

Status: done
Owner: Codex
Reviewer: Codex（单 Agent 自审）
Phase: ops
Capability: quality-tools
Visual Verification Timing: N/A（工具测试与只读预检）
Branch: codex/code-quality-94-102

## 目标

接续[约百文件窗口](QUALITY-PENDING-100-1.md)，逐文件核工具预检与真实 V8/Vitest 探针，不改变覆盖率规则、版本、排除或基线。

## 范围

主体为 `scripts/coverage/full-inputs.mjs`、`config.test.mjs`、`protected-baseline.test.mjs`、`merge-initializers.test.mjs`。fixture九文件先作为完整补读，须另记八维后才能计主体进度。

## 前提真值门

primary 为正式 runner 调用、当前配置、锁定依赖/补丁、Node inspector 的实际调用计数。原生探针的两个 spawnSync 只核退出码，成功子进程 stderr 被吸收；嵌套 Vitest 仅JSON reporter无法证明通过用例日志可见。用诊断注入对照验证子进程退出/信号/诊断所有权及 default+JSON 可见输出；不修改被测合并算法。这是测试质量反控，不冒称产品行为修复的红例先行。游戏机制、UI和存档均 N/A。

## 上下文锚点

[长期八维](../code-quality.md)、[测试验收](../agent-workflow.md#测试质量验收用户-2026-10-03-固化)、[本窗口证据](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/README.md)。基点仍 `123595ac3a651957b36061eacced329369c495e5`。

## 验证

复用第一组同字节136工具回归用于未改合同；改后只补必要探针/相邻验证，保留完整嵌套 stdout/stderr 与原生报告，不靠JSON绿数认证运行诊断。重要未决项保持 review。全仓、官方采集、提交及PR继续等约100主体文件窗口冻结。

## 当前模式推进记录

Codex build allowed：上述四文件逐维审查及测试日志可见性窄修，Owner仅Codex。未改产品、被测合并算法或计量政策；尚未关闭新主体路径。

## 交接

无下一位Agent提示词；Codex在同一隔离树继续，真实原件和逐维结果写回窗口证据。

- 2026-10-26 代码审查收口：本卡4主体文件A–H接受，具体结论/问题/原件见共同review.json。136工具相邻与必要反控成立，统一门仍待约100窗口；Status review表示等集中门，非整文件尚缺维。未提交、未推送或合并。

## 本窗口本地验收收口

2026-10-28（JST）：100主体八维及本地统一门接受；本次提交时远端PR/CI/合并尚待，发布以受保护PR实际结果为准。 20536包测试＋732工具测试全部通过、七包typecheck和whole lint error/warning/info为0；唯一official20,188fast/809src，有限计数调整后原报告ratchet/protected0。文件关闭只来自本卡既有逐文件证据，未扩大到其它pending。见[统一原件与只读复验](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/uniform/README.md)。本卡done指本地审查/整改/验收，远端发布不是预先完成声明。
