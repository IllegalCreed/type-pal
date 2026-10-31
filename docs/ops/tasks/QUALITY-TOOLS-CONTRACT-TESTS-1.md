# QUALITY-TOOLS-CONTRACT-TESTS-1 — 覆盖率工具专测的合同与判别力

Status: done
Owner: Codex
Reviewer: Codex（单 Agent 自审，不冒称第三方验收）
Phase: ops
Capability: quality-tools
Visual Verification Timing: N/A（Node 工具测试，不改产品）
Branch: codex/code-quality-94-102

## 目标

继续全仓代码治理，核四个尚未登记关闭的工具测试文件的八维质量。关注合法 fixture、精确失败 oracle、统计与范围审计、真实子进程诊断及临时资源隔离；不以增加测试数或覆盖率作为目标。

## 范围

- `scripts/coverage/{metrics,inventory,environment,full-inputs}.test.mjs`；每组两文件，累计相关切片。
- 相邻实现、正式 run.mjs 调用、批准表消费者只核合同，不重开既有逐文件接受。
- 同一治理 worktree；主树、其它活动 Owner、生成物、产品代码、coverage 规则/基线均不写。

## 前提真值门

工程前提：现有 metrics 非法输入反例同时缺少其它 metric，目标 covered>total 校验被删除也可能继续抛错；inventory 只断言 changes 数量不足以识别错报。实际全文、caller 与单点反控核定问题，不先推定产品错误。

真值为 Node assert/test 的真实运行、run.mjs 收集/compare/protected/full 输入调用及叶函数合同。SDLPal、游戏行为、存档、canonical 版本更改均 N/A：本卡只完善 ops 专测，不改变这些合同。若发现必须改变验收规则或产品取舍，单项暂停并另核。

## 上下文锚点

[长期八维质量](../code-quality.md)、[工作流与测试验收](../agent-workflow.md)、[测试治理](../../testing/governance.md)、[本卡唯一证据](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/README.md)。基点 `123595ac3a651957b36061eacced329369c495e5`，597 closed／0 review／2865 pending。

## 验证

逐文件 A–H、旧→新合同、实际读域及 source/caller 指纹在本卡证据索引。先固定原测试与完整 TAP，再补强明确缺口；指定反控必须是业务 AssertionError，临时复制树恢复与清理可核。

本卡仅运行定向与 coverage-tools 相邻回归、必要静态/docs/lint；ops mjs 不属于包级 TS 输入，不伪称新增 typecheck。累计相关任务后才冻结全仓/官方 coverage/protected；未执行不写 passed，不为四个小测试文件启动昂贵采集或新 PR。

## 当前模式推进记录

- 2026-10-26 Codex build allowed：四白名单测试完整审查及行为不变的测试整改；唯一 Coding Owner 为 Codex；基点与 origin/main 同点，工作树干净，未调用子 Agent。
- 当前实现未改；审查、整改、集中门与发布分开。未冻结证据前不升级任何 pending。
- 用户2026-10-26更新节奏：本卡是[约百文件窗口](QUALITY-PENDING-100-1.md)第一子批；约100个主体文件后再跑重门与提交，本卡不单独开PR。四实现只作为依赖补读，不凑进主体数。

## 交接

- 实际下一步：完成计数/范围两专测，再核环境/输入两专测，集中保存原件与逐文件结论。无下一位 Agent 提示词；Codex 继续同一分支。

- 2026-10-26 代码审查收口：本卡4主体文件A–H接受，具体结论/问题/原件见共同review.json。136工具相邻与必要反控成立，统一门仍待约100窗口；Status review表示等集中门，非整文件尚缺维。未提交、未推送或合并。

## 本窗口本地验收收口

2026-10-28（JST）：100主体八维及本地统一门接受；本次提交时远端PR/CI/合并尚待，发布以受保护PR实际结果为准。 20536包测试＋732工具测试全部通过、七包typecheck和whole lint error/warning/info为0；唯一official20,188fast/809src，有限计数调整后原报告ratchet/protected0。文件关闭只来自本卡既有逐文件证据，未扩大到其它pending。见[统一原件与只读复验](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/uniform/README.md)。本卡done指本地审查/整改/验收，远端发布不是预先完成声明。
