# SAVE-BARRIER-LINEAGE-1 · 保存子链前提与不完整修法反例

2026-09-16，Codex。取证基线`aefa5b06e067f81a90273cf245c762a9264cc09a`，产品与WORLD候选`e13216e7`相同。
本文保留只读诊断/方案时点，不是正式回归或E2E。后续r1已实现、三席终审并收口，任务入口：[已完成卡与证据](../../archive/tasks/done/SAVE-BARRIER-LINEAGE-1-nested-script-save.md)。
GLM既有批二原材料及Codex接收修正贡献见[批二回执](../../../testing/glm-pre-e2e-boundary-batch-2-report.md)；本次新探针由Codex编写自验，不代表他席签字。

## 本次新增证据

[probe-save-barrier-family.mjs](probe-save-barrier-family.mjs)加载真实ScriptProjectRuntime、FlowRuntimeCoordinator及compiler/runner，
宿主边界仅用内存confirm/teleportOut。confirm以entered/deferred精确控制，不依靠固定sleep猜执行点。
场景出口使用两个状态：first写标志后以`to/macroTask`到last，last写childEnd；父command列表随后写parentEnd。
没有把stages.next错误当成同次调用自动续跑，也没有运行真实战斗/地图画面。

```sh
node --import tsx docs/ops/audits/pre-e2e/probe-save-barrier-family.mjs --mode=original
node --import tsx docs/ops/audits/pre-e2e/probe-save-barrier-family.mjs --mode=admission-only
```

两模式exit0表示**诊断观察与明确断言相符**，不表示产品已正确：

| 同输入场景 | 原产品 | 仅删begin的pending gate（内存单点） |
|---|---|---|
| 未请求保存，内联出口 | first/childEnd/parentEnd全执行 | 相同，正常对照 |
| confirm挂起时请求保存，答yes后内联出口 | 保存超时、snapshot 0次；超时解门后全部标志才执行 | 保存成功、snapshot 1次，但只有first/parentEnd，childEnd缺失；子cursor已为last |
| 同内容独立root hook，confirm后请求保存 | first执行，cursor=last，成功快照；childEnd未执行，符合独立根安全点暂停 | 相同，对照证明不能全局取消安全点stop |

单点模式严格验证needle唯一且Vite load实际命中，磁盘源码前后逐字一致。
当前`script-world.ts` SHA-256：`18b30703a2d5748d4fff54f3e3fd6c2f9bd571c00fd03fb16cc6356917bf3e35`。
全局fetch禁止网络且finally恢复，server关闭；未写项目/资产/存档，不声称Vite内部绝无缓存I/O。
world只承载script运行最小字段，不是通过current-save codec的完整合法存档，snapshot是直接克隆的脚本状态。
诊断100ms只缩短已证互等的观察，生产默认10000ms未改；独立根/无保存正控同轮执行。

## 内部生命周期压力反例（限定范围）

original模式另外构造：持久lease已在barrier安全点close，但人为延迟registration的finally；barrier.ready后，
旧计数仍让同runtime/signal的withScriptActivityLineage进入body（enteredAfterReady=true）。
这是**人工API组合**，没有证明生产调用会出现该窗口，不增加确认bug数、不裁决U-02。
仅说明新设计不能以“WeakMap里还有计数”担保实际lease仍在coordinator.active表，也不能把它当成ready后准入凭证。

## 旧证据复跑与限制

旧[probe-glm-next-barrier.mjs](probe-glm-next-barrier.mjs)保持零diff，当前树分别执行：

```sh
node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-barrier.mjs --mode=contract --case B01
node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-barrier.mjs --mode=contract --case B02
node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-barrier.mjs --mode=contract --case B03
node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-barrier.mjs --mode=contract --case B04
node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-barrier.mjs --mode=contract --case B05
node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-barrier.mjs --mode=contract --case B06
```

- B01/B03各exit1，红因分别为“confirm继续后的自身子链不得使原保存超时”和“内联onTeleport不得与原保存互等至超时”，不是模块/fixture错。
- B02无保存正常链、B04结束对照、B05真实挂起超时后重试、B06取消收尾均exit0。
- **B06证据限制**：saving的then只返回saved，不返回script；旧`result.script?.flags?.…`断言不是快照内容证据。
  仍可使用真实AbortError、世界链尾未写、后续保存可用断言；正式SL-07必须直接抓实际snapshot，不能原样搬此弱断言。
- 没有重跑全部72项，也不执行与本卡无关的旧B11/B12主壳导出探针；来源总表不因本卡改成“全批重新验证”。

相邻现有测试原样执行：

```sh
cd packages/reforge
node ../../node_modules/vitest/vitest.mjs run src/script-world.test.ts src/script-runner-core.test.ts src/runtime-script-project.test.ts --no-file-parallelism
```

结果3 files / 39 tests全绿；它们保护独立root暂停等原合同，未覆盖本卡两条反例。新probe Biome复查0问题。
文档门首次因并行的四包卡已推进build但索引仍draft报两项；同步真实状态后零问题，文档工具20/20、diff-check通过。
临时日志目录`/tmp/type-pal-save-barrier-draft.JTwkGI/`：`family-{original,admission-only}.log`、`B01-contract.log`～`B06-contract.log`、`adjacent.log`。
临时日志不是交付依赖，以上脚本/命令可重建证据；实现后老反例翻转应另记，不回改冻结审计预期冒称旧probe一直绿。

## 修复准入与未做

本卡把两个入口合成同族方案，仍需Kimi/GLM独立前提/设计签字；WORLD历史GLM豁免不适用。
本次无产品修改、正式测试新增、覆盖率更新、全仓check/ratchet、浏览器或用户存档验证。
开发期完成代码时序回归，剧情/保存观感随本卡SL-E1～E3集中R4/Q1验证。
