# PAL 场景与实体脚本逐步骤进度

Status: active
Validity: current
Owner: Codex
Last reviewed: 2026-11-04
Template: plan-status-v1 / 1.0.0

## 目标与时间范围

从2026-11-04起持续记录当前canonical场景`onEnter/onTeleport`与实体`trigger/auto`每个步骤的
脚本核对、预览初态和优化进度。入口身份含场景、实体、通道、方案、步骤；首次、回访、恢复等
实际调用现场用独立context区分。物品私有、共享库、敌人和技能脚本不计入本清单分母。

本页是唯一持久台账，下面唯一命名JSON围栏由[只读查询工具](../../../../scripts/script-governance/progress-report.mjs)
消费；未记录步骤由当前工程自动枚举为未核，不能因未出现于事件中而遗漏。流程和证据要求见
[E2E逐步骤合同](../contract.md#npc与场景脚本的逐步骤进度用户2026-11-04)，本轮接入和初态补齐归
[R4任务卡](../../../tasks/cards/E2E-R4-1-route-and-checkpoint-foundation.md)。历史done和旧执行不自动转为当前步骤完成。

## 里程碑

| 结果 | Owner | 状态 | 证据与接受边界 |
|---|---|---|---|
| 当前步骤全量枚举与三个独立进度轴 | Codex | active | 查询工具按canonical身份读取；结构检查不授脚本或初态完成信用 |
| 001–006逐入口实态与编辑器持久化记录 | Codex | active | 仅将R4实际核对、保存、重开、播放/重置证据追加到事件；未录入的不算已验 |
| 后续片段与脚本优化持续推进 | Codex | planned | 沿逐步骤合同更新，不以片段总状态替代各轴记录 |

## 当前状态

当前机器记录如下。事件按实际记录时间追加，`from`连接该入口/context/轴的上一个记录状态；
查询分别保留记录状态和受源码、依赖、证据、预览变化影响后的待复核状态。本页不另维护手工完成总数。

```json script-progress-ledger
{
  "kind": "type-pal-script-progress",
  "version": 1,
  "project": "pal",
  "scope": "scene-hooks-and-entity-behavior-steps",
  "events": []
}
```

## 阻塞与决策

未核入口、缺失原件、版本漂移或尚未完成的编辑器操作保持各自未完成状态。工具只验证身份、
线性记录和已声明的字节边界，依赖完整性与证据语义由独立核验者裁定。删除或改写旧事件不可接受；
确有旧判断错误时追加纠正事件，并保留其原范围。新增或删除canonical步骤须核稳定身份与去向。

## 下一步

Codex先补录001–006实际完成与待办的逐入口事件，按场景/NPC筛选继续配置和复验；后续每次E2E
或优化同步追加事实。完成标准是相应context的三个轴各有充分、可恢复证据及必要独立验收；
`--check`成功只表示记录自洽和所声明版本匹配，不代表全量脚本已经完成。
