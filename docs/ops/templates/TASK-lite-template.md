# TASK-ID - 任务标题

Status: draft
Owner: Codex | 受委派贡献者
Reviewer: Codex（独立验收）
Phase: phase1 | phase2 | ops
Capability: W7 / A4 / ops / etc.
Visual Verification Timing: dev-functional | e2e-deferred | mixed | N/A

状态取值：draft / build / review / done / blocked / rework / cancelled；按 [`AGENTS.md`](../../../AGENTS.md) 当前临时模式，Codex 核准入与独立验收，不要求固定三贤人签字。

## 目标
-

## 范围
-

## 前提真值门

行为/机制任务必填;纯内部任务可整节写 `N/A（具体原因）`。若涉及原版/第一阶段机制真值、碰撞/移动语义、
migration/schema/save/asset pipeline、大规模 generated rewrite 或主动改变既有用户行为,不得继续使用 lite,
必须升级完整任务卡。

- 一句话行为 / 工程前提:
- 真值来源: （必填 `file:line`、reference 路径或等价一手证据；裸 `verified` 无效）
- 当前 `before` -> 目标 `after`:
- 最强替代解释 / 什么观察会推翻前提:
- 是否主动偏离已核真值: no | yes（用户裁决） | N/A（原因）

## 上下文锚点
-

## 验证
-
- 剧情 / 演出视觉如适用：登记集中 E2E 入口、步骤、预期和证据路径；开发期不重复走剧情。

## 当前模式推进记录
- Codex 范围/前提核验: pending（直接证据与反证） | verified | counter
- 受委派 Coding Owner / 隔离分支: pending
- build 准入: blocked | Codex build allowed（附范围和验收条件）
- 贡献者交付/自验: pending（候选 SHA、命令、结果）
- Codex 独立验收: pending | accept（证据） | counter（返工锚点）
- 用户产品裁决/体验验收: N/A（原因） | pending | 结论与日期
- done 准入: blocked | Codex done allowed；历史三方签字如适用只按历史记录，不是当前门禁

## 交接
- YYYY-MM-DD Actor: 摘要。Evidence: 链接/测试。Next: actor/state。

## 下一位 Agent 提示词
```text
接手任务:
任务卡:
当前状态:
你的角色:
先读:
请你做:
不要做:
输出要求:
```
