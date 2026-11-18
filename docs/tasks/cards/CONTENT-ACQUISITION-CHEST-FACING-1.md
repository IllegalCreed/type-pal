# CONTENT-ACQUISITION-CHEST-FACING-1 — 宝箱打开方向的作者字段校验

Status: draft
Phase: phase2
Owner: Codex
Coding Owner: 未分配
Last reviewed: 2026-11-19
Template: task-card-v1 / 1.0.0
Visual Verification Timing: e2e-deferred

## 目标

核清第二阶段宝箱方向的作者输入与展开时的方向值。在作者校验边界确认格式准入，待独立裁决后再修改实现。

## 范围

只记录作者场景中宝箱开启动作的方向字段与展开边界。

## 前提与证据

[宝箱参数检查](../../../packages/content/src/item-acquisition.ts)先把 `opening.facing` 转成字符串进行枚举比对，但保留原输入。合法字符串 `"down"` 通过作者场景校验，只替换为 JSON 数组 `["down"]` 也被放行。现行四方向约定来自[作者取物合同](../../phase2/specs/script-system.md)和 `Facing` 载体类型。当前投影将原值传给 `setEntityFacing`。普通工程有无这种输入、加载和视觉后果尚未证明。

### 一手调用与原件

现行作者场景入口和[编辑器取物流程](../../../packages/editor/src/ui/ItemAcquisitionEditor.tsx)共享该 guard。完整合法场景和实际错误期望见[执行归档](../evidence/QUALITY-CONTENT-REFERENCES-1-execution.tar.gz)内 `continuation/acquisition-contracts/acquisition-direction-confirmed-red/`，同一 fixture 只有数组输入失败，字符串通过。早期两次错误导入单独保留透明记录。

## 验收

待准入后用同一合法场景核数组拒绝及准确位置、四种方向的保留值，并由展开入口确认标量方向进入 `setEntityFacing`。

## 状态与交接

`item-acquisition.ts` 保持 review。下一位 Owner 先核合法项目载体与现有方向失败路径，再确定相同机制是否影响其它作者枚举。存档、演出、资源命名和既有取物工作流无新验收；此卡尚未获得产品 build 准入。
