# CONTENT-ACQUISITION-CHEST-FACING-1 — 宝箱打开方向的作者字段校验

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
Last reviewed: 2026-11-19
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 本次准入

**build allowed**。Codex 准入，单一 Coding Owner。仅按现行 Facing 枚举拒绝非字符串宝箱方向，用同形合法场景和展开为 setEntityFacing 的实际值验证。范围为 item-acquisition.ts 及作者／展开专测。

## 目标

核清第二阶段宝箱方向的作者输入与展开时的方向值。落实作者入口现行方向值域，并验证展开过程保留合法方向。

## 范围

只记录作者场景中宝箱开启动作的方向字段与展开边界。

## 前提与证据

修复前，[宝箱参数检查](../../../packages/content/src/item-acquisition.ts)先把 `opening.facing` 转成字符串进行枚举比对，但保留原输入。合法字符串 `"down"` 通过作者场景校验，只替换为 JSON 数组 `["down"]` 也被放行。现行四方向约定来自[作者取物合同](../../phase2/specs/script-system.md)和 `Facing` 载体类型。当前投影将原值传给 `setEntityFacing`。普通工程有无这种输入、加载和视觉后果尚未证明。

### 一手调用与原件

现行作者场景入口和[编辑器取物流程](../../../packages/editor/src/ui/ItemAcquisitionEditor.tsx)共享该 guard。完整合法场景和实际错误期望见[执行归档](../evidence/QUALITY-CONTENT-REFERENCES-1-execution.tar.gz)内 `continuation/acquisition-contracts/acquisition-direction-confirmed-red/`，同一 fixture 只有数组输入失败，字符串通过。早期两次错误导入单独保留透明记录。

## 本次修复

作者取物校验要求方向为四个字符串之一。已确认的真实作者场景还保留展开到 setEntityFacing 的标量方向。在此变更范围内，非法数组在现行字段边界被定位。

| 文件 | A 正确性 | B 注释 | C 职责 | D 复用 | E 测试 | F 可读性 | G 简洁 | H 可测试 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| item-acquisition.ts | 形状拒绝与 Facing 类型一致，合法场景展开精确值 | 取物所有权由原合同与类型解释，紧凑 guard 自述 | 作者入口拥有格式校验，展开器保留合法值 | 沿用统一触发流程和展开测试 | 同形完整场景仅替换方向为数组得到精确业务错误，合法方向和展开仍通过 | 字段类型与四方向明确 | 去掉转字符串这一隐式中间步骤 | 同一合法场景和正式入口可复验，无环境依赖 |

## 验收

归档中 content-red 保留数组误放行的失败，content-after-diagnostic-path 保留明确字段错误与原有合法展开。现行脚本规格已要求四方向，新验证落实其既有合同。画面实跑由对应活动 E2E 路线持有。

## 状态与交接

集中门已通过，实际命令和零诊断回执见后继归档。本次只验作者输入与展开，Visual Verification Timing 为 N/A。

[本次执行归档](../evidence/QUALITY-CONTENT-REFERENCES-1-review-closeout.tar.gz)固定实际命令、候选文件、失败与通过。
