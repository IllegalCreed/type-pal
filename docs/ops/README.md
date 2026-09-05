# docs/ops/ — 多 Agent 协作与运维文档

三贤人系统（Codex / Kimi / GLM + 用户）的流程与证据目录。协议本体在根
[`AGENTS.md`](../../AGENTS.md)；工作流细节见 [`agent-workflow.md`](agent-workflow.md)。

| 内容 | 类型 | 说明 |
|---|---|---|
| [`agent-workflow.md`](agent-workflow.md) | current | 工作流：看板/任务卡/签字门禁/文件分工 |
| [`board.md`](board.md) | current | 只保留进行中/阻塞任务的看板（Codex 维护） |
| [`tasks/`](tasks/README.md) | current + historical | 任务卡目录（索引见其 README；关闭卡是历史记录） |
| [`audits/`](audits/README.md) | current + evidence | 审计报告（含 pre-e2e 代码审计总收口） |
| [`evidence/`](evidence/README.md) | evidence | 任务卡引用的截图/测量产物 |
| [`acceptance-checklist.md`](acceptance-checklist.md) | historical | 2026-07 前后的用户验收批次记录，非当前待办 |
| [`kimi-verification-manual.md`](kimi-verification-manual.md) | reference | Kimi 视觉验证操作参考 |
| [`coverage.md`](coverage.md) | current | 覆盖率基线与口径 |

维护规则：本目录不存放产品代码文档；历史批次必须带「历史」标注；新审计先在
`audits/` 建 README 可发现的入口。

## 其他文档

- [documentation.md](documentation.md) — 文档检查规则（Codex 维护）
