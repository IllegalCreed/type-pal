# 多 Agent 任务卡

任务卡是多 Agent 工作的持久交接记录。当前按 [`AGENTS.md`](../../../AGENTS.md) 的临时委派模式执行：Codex 分派、贡献者实施、Codex 独立验收；历史三贤人签字保留，但不是新任务的固定门禁。

本目录只放活动任务与总索引。不可逆/高风险任务使用完整模板，常规任务按既定流程选择是否开卡。
终态卡归入 [历史任务](../archive/tasks/README.md)，模板在 [templates](../templates/README.md)。

新建任务时:

1. 不可逆/高风险任务复制 [`TASK-template.md`](../templates/TASK-template.md)。
2. 中等任务复制 [`TASK-lite-template.md`](../templates/TASK-lite-template.md)。
3. 先完成“前提真值门”,再写详细方案。高风险/用户可见行为任务必须对照原版/primary source、第一阶段、
   当前二阶段和目标,逐项附 `file:line` 或一手证据;关键前提未知时保持 `blocked`。
4. 如任务正在进行或阻塞,在 [`../board.md`](../board.md) 增加一行。
5. 记录 Codex 对前提、范围、单一 Coding Owner 和验收方式的准入判断；高风险任务仍要一手证据、可证伪观察与必要的用户产品裁决。贡献者自验后由 Codex 独立复核并决定返工/集成，不再等待固定三方签字。
6. 跨 Agent 交接时,当前 Agent 必须在任务卡和最终回复中给出“下一位 Agent 提示词”,方便用户直接复制给下一位。
7. 按 `draft -> build -> review -> done` 推进，必要时记录 `blocked` 或 `rework`。`Status` 不替代前提证据、质量门或用户裁决；旧卡 `pending` 的 Kimi/GLM 席位本身不再阻止 Codex 按当前模式推进。

## 前提真值门与模板升级

- full 卡适用于 schema/save/migration/asset pipeline、跨包公共接口、新能力格、capability-map 变化、
  关键公式/资源管线,以及涉及原版/第一阶段机制真值或碰撞/移动语义的任务。
- lite 卡只适用于中等且前提简单的任务。若发现需要批量 generated rewrite、主动改变既有用户行为,或必须依赖
  原版/第一阶段机制真值决定修复层,立即升级 full 卡,不得在 lite 卡中缩写掉真值矩阵。
- 纯内部重构或 ops 任务可以在前提门写 `N/A`,但必须解释为什么不影响用户行为、schema、数据或修复层;
  高风险和用户可见任务不得写无理由 `N/A`。
- 大量 audit 红项只证明 mismatch。进入 migration/schema/generated rewrite 前,任务卡必须排查 runtime 语义、
  原版/第一阶段理解、提取/地图/数据解码和 audit/test model 四类替代根因。
- 用户指出前提冲突时立即停线;核心前提改变后旧签字失效,更新矩阵并重新签字。只有主动偏离已核真值时才用
  一句话 `before -> after` 请用户作产品裁决,事实考证不得转嫁用户。
- 过渡规则:已 `done/cancelled` 的历史任务不追溯重开;现有 `draft/build/review` 高风险任务在下一次状态迁移前
  补齐前提门;新任务立即使用新版模板。

任务卡命名建议:

```txt
<领域>-<编号或能力格>-简短标题.md
```

例子:

- `W7C-map-paint.md`
- `A4-asset-import.md`
- `OPS-0001-agent-workflow-bootstrap.md`

任务卡是持久交接日志。聊天总结可以辅助,但下一个 Agent 应该能只靠任务卡和链接文件继续工作。

## 目录状态与阅读须知（2026-09-06 增）

- **活动任务只以 [`../board.md`](../board.md) 为准**——本目录不做活动/终态的手工二次索引。
- `done` / `cancelled` 卡已移入历史任务目录：它们是**历史交接记录**，
  卡内的「当前状态 build/review」「下一位 Agent 提示词」「pending 签字」等文字是**写作当时
  的快照**，顶部 `Status:` 行覆盖正文局部状态——局部搜索命中旧状态时以顶部终态为准。
- 5 张早期终态卡保留原来的 `> **状态**：` 标签；检查器按确切文件名单识别它们，
  不为统一工具格式改写历史。新任务使用模板的 `Status:` 字段。
- 生成的机器索引见 [`index.md`](index.md)（由检查工具维护）。
- 关闭卡的签字、审查结论与用户裁决**不追溯改写**；引用断链的目标已被删除时，以
  `git log -- <path>` 追溯历史版本，不恢复旧实现。
