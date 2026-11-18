# CONTENT-SPRITE-FRAME-BOUNDARY-1 — 精灵声明与实际帧容量

Status: draft
Phase: phase2
Owner: Codex
Coding Owner: 未分配
Reviewer: Codex
Last reviewed: 2026-11-18
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

精灵的声明范围和实际资源帧数由各自所有者提供。容量不符合要求时应返回可定位的错误。大世界已有声明超过实帧数时允许收敛旧差异，战斗精灵当前要求实际帧完整。

## 范围

记录内容帧需求、帧枚举和编辑器容量比较的风险。大世界与战斗精灵各按自身布局核实。

## 前提与证据

编辑器的 `UpdateBattleSpriteDefinitionCommand` 使用真实解码出的十帧测试资源。超出容量的敌人 profile 符合现行结构条件，应用时应走已有“需要多少帧，实际有多少帧”的错误。实际收到了 JavaScript `RangeError`。帧需求内先构造全部帧索引，再将集合展开为函数参数，容量比较还未执行。

大世界的更新命令会枚举旧、新声明的全部帧来核对增量。当前 guard 允许正整数方向帧数，枚举开销跟声明量走。此项是独立的资源边界候选。普通工程及历史旧差异的上界尚未核定，本卡不声称已复现其运行故障。

### 调用与原件

- [战斗精灵命令](../../../packages/editor/src/core/battle-sprite-commands.ts#L22)通过定义 guard，持实际解码证明校验声明容量。
- [战斗加载 readiness](../../../packages/reforge/src/assets.ts#L401)逐槽读取真实帧。[大世界编辑器](../../../packages/editor/src/core/sprite-commands.ts#L146)比较前后缺失帧的集合。
- [执行归档](../evidence/QUALITY-CONTENT-REFERENCES-1-execution.tar.gz)的 `battle-sprite-demand-red` 是唯一失败原件，`battle-sprite-demand.fixture.txt` 保留真实编辑命令的反例。

## 验收

待准入后用真实已解码资源核容量超限时的业务错误、等于容量的正控及大世界既有差异处理。修复阶段需核合法上界和运行读取。

## 状态与交接

内容扇出与帧数边界待裁定，`battle-sprite.ts` 与 `sprite.ts` 维持 review。下次准入先分别核需求值、索引枚举、旧差异保全与运行时检测是否需要同一措施，并记录范围上界和格式兼容。当前只有注释与共用布局计数的等价整理。
