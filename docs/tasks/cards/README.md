# 任务卡

Status: current
Last reviewed: 2026-11-02
Owner: Codex
Template: governance-index-v1 / 1.0.0

## 目的

接手任务时从这里找到原卡，以目标、前提、范围、实施和交接继续工作；聊天只作辅助。

## 范围

本目录保存任务卡与生成索引；[既有归档](../archive/task-history.md)保持稳定路径。新任务不因done自动搬家，确需迁移时须有显式映射、source SHA和全入链更新。

## 当前状态

卡顶部`Status:`是唯一任务状态源，正文旧build/review/交接不覆盖终态。[现行工作流](../../engineering/guides/agent-workflow.md)规定Codex准入、隔离实施和独立验收；历史签字、counter和用户裁决仍按原范围解释。

## 入口与责任

| 要做什么 | 下一跳 |
|---|---|
| 按状态或ID找原卡 | [生成任务索引](index.md) |
| 查长期代码、文档、瘦身与测试工作 | [长期质量治理](../board.md#长期质量治理) |
| 查当前E2E、编辑器与内容工作 | [第二阶段功能开发](../board.md#第二阶段功能开发) |
| 查后续方向与阶段归属 | [第三阶段储备](../board.md#第三阶段储备) |
| 建卡、核前提或交接 | [工作流](../../engineering/guides/agent-workflow.md)、[任务模板](../templates/README.md) |

看板维护分工与依赖，卡维护准入与执行事实，生成索引负责检索。未合入候选须标固定提交和范围；后继证据闭合旧问题时先核证据写回原卡，不凭旧导航重做，也不凭逐文件或全仓门批量关闭整卡。

### 建卡与身份

沿用`<领域>-<编号或能力格>-简短标题.md`，例如`W7C-map-paint.md`、`A4-asset-import.md`。新ID先查索引、Git引用与活动worktree，避免碰撞，不重编号既有任务。

非小改或跨Owner/会话先建卡。前提与`build allowed`按[工作流准入](../../engineering/guides/agent-workflow.md#1-进入-build-前核前提)执行；高风险使用完整卡。schema/save/migration/资产、公共接口、新能力格/capability-map、关键公式、机制/移动/碰撞、大规模generated rewrite、主动行为变化不得用lite，发现风险立即升级；内部任务的N/A须说明不涉及的行为、数据或修复层。

活动或阻塞任务进入看板。早期终态卡的中文状态由检查器精确名单读取，不为统一工具改写；done/cancelled不因接手追溯重开，仍活动的高风险卡在下一次迁移前补齐前提门。

## 证据与下一步

维护Owner同提交写回卡、生成索引、看板及相关review/SHA；交接内容按[工作流](../../engineering/guides/agent-workflow.md#5-写回与交接)。关闭卡中的下一位指令不是当前授权，断链先追溯Git，不恢复退役实现。

上级：[任务与长期工作](../README.md)。需要追溯整理前的完整建卡说明时读取[固定Git原件](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/tasks/README.md)。
