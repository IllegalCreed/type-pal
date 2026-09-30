# Wave-L 疑似产品缺陷报告：世界精灵自动脚本深链预览显示不存在的帧 #0

- 发现者：GLM L（TEST-GLM-WAVE-L-1，2026-09-30）
- 状态：**停对应组上报，不写测试冻结该行为，不改产品**（卡面纪律）
- 影响面：`packages/editor/src/core/world-sprite-behavior.ts` 的公开 API
  `describeSpriteReferenceBehavior`（大世界精灵库「引用/自动脚本行为预览」的用户可见文案与帧序）

## 现象（最短复现）

合法 typed 夹具：场景 s001 实体 e001（sprite=sprite.candle，static 布局）挂一页 auto 行为，
唯一 stage 的 body 只有一个 `callScript → scene/s001/link-1`；chunk 里 `link-k` 依次
`callScript → link-(k+1)`，最深的 `link-N` 执行 `setEntityFrame e001 #1`、`#2`。
除嵌套深度外，15/16/17 层三条脚本**语义完全相同**。

`describeSpriteReferenceBehavior(state, reference, definition, 16)` 实测：

| 嵌套层数 | label | detail | preview |
|---|---|---|---|
| 15 | 自动脚本切帧 | 检测到 #1 → #2；速度与分支以脚本为准 | cycle [ #1, #2 ] |
| 16 | 自动脚本切帧 | 检测到 #1 → #2；速度与分支以脚本为准 | cycle [ #1, #2 ] |
| 17 | 自动脚本切帧 | **检测到 #0**；速度与分支以脚本为准 | **cycle [ #0 ]** |

#0 **不在脚本任何命令中**（脚本只写 #1、#2）。行为在 16→17 层之间非连续跳变，
且跳变后展示的是一个脚本里不存在的帧。

## 根因定位（读码，未改）

两条扫描链叠加：

1. `collectDeterministicStagePreview`（:696）对每个 stage 以 `depth=0` 调
   `collectDeterministicAutoFrames`，其递归 `callScript` 每层 +1，`:602` 守卫
   `depth > 16 → 'uncertain'`。17 层链在扫描器 1 处按设计保守回退（undefined）。
2. `:1052` 回退链 `collectDeterministicStagePreview ?? collectSafeScriptProjection`
   → `collectSafeScriptProjection`（:996）→ `sampleChanceStageGraph`（:928）。
   采样器自带另一套深度上限 `MAX_VISUAL_CALL_DEPTH = 16`（:778，`runVisualSampleBody:887`
   达到即抛 `VisualScriptBudgetExhausted`）。`sampleChanceStageGraph` 捕获该异常后
   `bounded = true; break`（:966-969），随后 `:974`：

   ```ts
   if (!context.steps.length) pushVisibleSampleFrame(context)
   ```

   在**零步骤**时补一帧默认帧（`implicitAnimationStep=0` → `actualFrameIndex(0,16)` = #0，
   驻留 DEFAULT_PREVIEW_HOLD_MS=200）。单 variant 路径（:1024-1030）把它包装成
   `cycle [ { frame: 0, holdMs: 200 } ]`，`describeSpriteReferenceBehavior` 的单 variant
   分支生成 detail「检测到 #0…」——variant.note 里的「此示例在安全预算处截断」披露
   **在单 variant 路径被丢弃**（:1024-1030 未拼接 note）。

## 建议裁决点（交 Codex）

1. 深度预算中止后的「补默认帧」是否应该存在：空步骤时返回 undefined（保守回退为
   「自动行为脚本」不可预览）似乎更符合「不伪装帧序」的既有设计原则（旧测
   「无法解释的分支保守回退」「可证脚本缺实际帧数不伪装 cycle」同型）。
2. 若保留截断示例，单 variant 的 detail 应拼接 variant.note 的截断披露。

## 复现实测脚本

探针曾临时写入工作树并已删除（`probe-depth.glm-probe.test.ts` /
`probe2.glm-probe.test.ts`，未进任何提交）；上表三行输出为探针 console 实录摘录。
夹具形状与 `world-sprite-behavior.test.ts` 既有 `state()/behavior()` 同构（合法 typed 输入，
无 any/双强转夹具参与断言）。
