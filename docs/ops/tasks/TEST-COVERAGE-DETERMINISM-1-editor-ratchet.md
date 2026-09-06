# TEST-COVERAGE-DETERMINISM-1 - 编辑器覆盖率计数确定性

Status: blocked
Owner: Codex
Reviewer: GLM + Kimi
Phase: ops
Capability: ops（测试门禁，不新增能力格）
Visual Verification Timing: N/A
Revision: r0（仅登记待定位问题，尚无修复方案）

## 目标与范围

定位 editor coverage 少 1 条语句/分支的具体来源，补确定性回归并修根因；不降低精确分数门禁。
2026-09-06 用户要求在 SAVE-PREFLIGHT-1 收口时另卡登记。本卡尚未开始实现，不借此重新打开已完成的存档卡。
blocked 原因是根因/修复层证据不足，不是等待用户选择技术方案；下一步由 Codex 补取证。

范围为测试时序/隔离与 V8 计数路径。若最终指向生产行为，先更新前提、范围与审查方案，不凭抖动猜改 UI。
不改 schema、存档策略、PAL 生成内容、生产源码统计范围或既有基线下限。

## 前提真值门

一句话工程前提：已有日志证明精确计数曾下降，但还不能证明具体哪个分支、为何下降或与存档候选无关。

| 维度 | 已知事实 / 未知项 | 证据 |
|---|---|---|
| Primary source | editor 全部生产 TS/TSX 纳入；受控 maxWorkers=2；汇总前逐文件对账，精确分数比较 | `scripts/coverage/config.mjs:96,175`；`scripts/coverage/run.mjs:234,262,502` |
| 第一阶段 | N/A：不改变游戏行为，不从原版/一阶段机制推导 V8 覆盖率口径 | [覆盖率合同](../../testing/coverage.md)规定七包相同门禁 |
| 当前二阶段 | 历史失败日志少 1 条 statement/branch；具体文件、分支与可重现调度仍 unknown | [Codex 首轮证据边界](../archive/tasks/done/SAVE-PREFLIGHT-1-current-save-restore-preflight.md#已独立确认的通过项与证据边界)；`/tmp/cov2.log`、`/tmp/cov4.log` |
| 本任务目标 | 同一源码/测试范围的执行能以受控条件解释计数，回归稳定触达业务分支 | 正式根因与实现方案待取证；不能靠重试、容差或删范围制造稳定 |

已确认的证据边界：

- 历史失败为 statements `23455/31407`，对照基线 `23456/31407`；branches `18168/27329`，
  对照基线 `18169/27329`。当前基线 editor 对象仍保留较高计数。
- 两份日志是 **609 个生产文件 / 5,783 项测试、Reforge 122 文件 / 961 项**，包含首轮候选，
  没有可核验的旧 SHA + 同次工作树/范围记录；不得把“clean HEAD 10 次”或“约 1/6”当作已独立证实。
- `2c39b1af` 的 Codex 单次严格 fast（5,761 项）通过，editor 源码与其基线没有为过门禁而改动；
  一次通过不证明历史不确定性已修复，也不证明根因与本卡无关。
- 临时日志仅为当时机器上的辅助证据，可能被清理；持久结论已在原卡保留。后续须产出带 SHA、范围摘要、
  命令、退出码和逐文件计数的新证据，不把不存在的临时文件说成仍可复跑。

最强替代解释：测试时序/清理或共享状态、不同执行范围/未提交内容、coverage 映射/聚合问题均可导致差异。
若洁净固定范围下可证明只是历史报告混用，应撤销“同一树抖动”的归因，修回执/证据链而非修改生产代码。
当前关键前提未知，build 不允许；只允许后续只读/隔离诊断，不预先选修复层。

## 上下文锚点与调查边界

- [AGENTS](../../../AGENTS.md)、[READ-FIRST](../../phase2/READ-FIRST.md)、[共享工作树纪律](../agent-workflow.md#共享工作树与-stash)。
- [E-06 回执](../audits/pre-e2e/quality-gate-remediation.md)、[覆盖率合同](../../testing/coverage.md)，
  以及原存档卡两轮返工复核中的严格单次通过记录；不把之前已修的弹窗焦点竞态当作本卡根因。
- `scripts/coverage/config.mjs`、`run.mjs`、`baseline.fast.json`；`packages/editor/vite.config.ts`。
- 比较基线/候选用独立工作树或隔离进程，禁止在共享 main 中 stash/恢复他人内容来做先红。
  重型 check 与 coverage 不并跑；保留每次运行结果，不删除失败回执。

## 待取证与验收条件（不是已批准实现方案）

1. 钉住源码 SHA、Node/provider 版本、工作树状态与生产/测试范围，采集逐文件覆盖率差异，定位少掉的语句与分支。
2. 以真实回调/时钟/任务完成信号稳定复现，区分产品缺陷、测试缺陷与报告模型错误；不得先调超时碰运气。
3. 定位后更新前提/修复方案并取得本卡准入，再补确定性先红后绿回归；不得删业务断言、skip、coverage ignore、
   下调阈值、缩范围或以多数通过替代严格失败。
4. 修复验收先冻结有限复跑计划、每次保留独立证据且任一失败停线；同时通过单次严格 fast 与相关普通门禁。
   复跑只能验证稳定性，不能替代根因解释；基线如需更新必须零下降。

## 推进签字

- build：Codex premise pending / design pending；Kimi premise pending / design pending；GLM premise pending / design pending。
- 独立反证：pending；用户缺签豁免：无；build 准入：blocked（根因待证、无实现方案）。
- done：Codex pending / Kimi pending / GLM pending；done 准入：blocked。

## 交接

- 2026-09-06 Codex：按用户收口要求登记，保存历史差异与归因限制；未修改测试/配置/基线，未执行新调查或修复。
  后续先由 Codex 补确定性证据，不请求重签 SAVE-PREFLIGHT-1。

## 下一位 Agent 提示词

无下一位 Agent 提示词：当前只完成后续事项登记，未安排跨 Agent 交接；后续接手先补取证，禁止开始实现或标记 done。
