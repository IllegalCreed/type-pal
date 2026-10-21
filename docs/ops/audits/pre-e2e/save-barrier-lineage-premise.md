# SAVE-BARRIER-LINEAGE-1 · 保存子链前提与不完整修法反例

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-21
Template: audit-report-v1 / 1.0.0

本页是 SAVE-BARRIER-LINEAGE-1 的只读前提取证：基线 `aefa5b06e067f81a90273cf245c762a9264cc09a`（产品与 WORLD 候选 `e13216e7` 相同），用双状态出口反例排除「只删 begin 的 pending gate」这一不完整修法。后续 r1 已实现并三席终审收口。探针与相邻 3 文件/39 条测试记录在 quote 中保全；本页不授当前实现、runtime、E2E、视觉或 coverage 信用。

## 审计问题

- 要回答的具体问题：B-06/B-07（确认框请求保存→开战/内联出口的 lineage 互等）的正确修法边界——只删 begin 处 pending gate 是否足够，会不会破坏独立根安全点暂停。

## 范围与证据

- 版本/时间范围：2026-09-16；取证基线 `aefa5b06…`；当前 `script-world.ts` SHA-256 `18b30703a2d5748d4fff54f3e3fd6c2f9bd571c00fd03fb16cc6356917bf3e35`。
- 一手来源与命令：probe-save-barrier-family.mjs 双模式（original / admission-only）；旧 probe-glm-next-barrier B01–B06 复跑；相邻 `script-world/script-runner-core/runtime-script-project` 3 文件/39 tests 全绿。
- 边界：confirm 以 entered/deferred 精确控制不用 sleep；诊断 100ms 只缩短已证互等观察，生产默认 10000ms 未改；未跑真实战斗/地图画面。

## 发现

| 同输入场景 | 原产品 | 仅删 begin 的 pending gate（内存单点） |
|---|---|---|
| 未请求保存，内联出口 | first/childEnd/parentEnd 全执行 | 相同（正常对照） |
| confirm 挂起时请求保存，答 yes 后内联出口 | 保存超时、snapshot 0 次；超时解门后全部标志才执行 | 保存成功、snapshot 1 次，但只有 first/parentEnd，childEnd 缺失；子 cursor 已为 last |
| 同内容独立 root hook，confirm 后请求保存 | first 执行、cursor=last、成功快照；childEnd 未执行（独立根安全点暂停） | 相同（对照证明不能全局取消安全点 stop） |
- 单点模式严格验证 needle 唯一且 Vite load 实际命中，磁盘源码前后逐字一致。
- 旧探针复跑：B01/B03 各 exit1（红因为自身子链不得使原保存超时/内联 onTeleport 与原保存互等至超时）；B02/B04/B05/B06 exit0。B06 证据限制（then 只返回 saved）按原文保留，正式 SL-07 必须直接抓实际 snapshot。
- 人工 API 组合反例（延迟 registration finally 使 ready 后旧计数仍放行）不证明生产可达，不增确认 bug 数、不裁决 U-02。

## 结论

- 当前能证明：admission-only 单点修改在「confirm 挂起时请求保存后内联出口」场景丢失 childEnd——只删准入 gate 是不完整修法；独立根安全点暂停必须保留。
- 当前不能证明：生产调用会出现延迟 finally 窗口（U-02 仍待证）；未重跑全部 72 项旧批。

## 整改与复核

- 修复 Owner：SAVE-BARRIER-LINEAGE-1（两入口同族方案）；实现候选 `dff3442d` 已三席终审 accept、43 新增/8 反控、check7,079/严格 fast6,591 通过，2026-09-17 用户要求按齐备终审收口 done。
- 复核条件：实现后老反例翻转应另记，不回改冻结审计预期冒称旧探针一直绿。
- 继任/supersedes：SL-E1～E3 集中 R4/Q1 验证；剧情/保存观感不逐卡重复。

## 历史范围

- ops/audits/pre-e2e 历史审计层；日期：2026-09-16；固定 source revision `348620bf3c68aa77a7ef7e1abef9b8eda08530d9`，source SHA `c6b7a6b3a8be99b5c07d2bb98277fffeca61a9bedb7ba9f9c8b22514063340a8`；本轮 S20 全文核读真源后重写封套，quote 与分层逆回规则不变。

## 原始结论

- 取证原文（双模式探针设计、三场景对照表、内部生命周期压力反例、旧证据复跑与限制、修复准入与未做）完整保留于下方 quote；「本次无产品修改」为 2026-09-16 时点陈述。

## 当时证据

- GLM 既有批二原材料及 Codex 接收修正贡献见 quote 内批二回执链接；本次新探针由 Codex 编写自验，不代表他席签字。
- 临时日志目录 `type-pal-save-barrier-draft.JTwkGI/`（family/B01–B06/adjacent）为可重建证据，不是交付依赖。

## 当前有效性

historical。r1 实现与收口事实由对应实施记录持有；本页只保留前提时点。

## 继任文档

- SAVE-BARRIER-LINEAGE-1 已完成卡与实施记录（quote 内链接）拥有修复结论的事实权。

## 原文保全

- 固定 source revision `348620bf3c68aa77a7ef7e1abef9b8eda08530d9`，source SHA `c6b7a6b3a8be99b5c07d2bb98277fffeca61a9bedb7ba9f9c8b22514063340a8`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。

<!-- original-source-quote:start -->
> # SAVE-BARRIER-LINEAGE-1 · 保存子链前提与不完整修法反例
>
> 2026-09-16，Codex。取证基线`aefa5b06e067f81a90273cf245c762a9264cc09a`，产品与WORLD候选`e13216e7`相同。
> 本文保留只读诊断/方案时点，不是正式回归或E2E。后续r1已实现、三席终审并收口，任务入口：[已完成卡与证据](../../archive/tasks/done/SAVE-BARRIER-LINEAGE-1-nested-script-save.md)。
> GLM既有批二原材料及Codex接收修正贡献见[批二回执](../../../testing/archive/legacy/e2e/route-and-checkpoint/glm-pre-e2e-boundary-batch-2-report.md)；本次新探针由Codex编写自验，不代表他席签字。
>
> ## 本次新增证据
>
> [probe-save-barrier-family.mjs](tools/probe-save-barrier-family.mjs)加载真实ScriptProjectRuntime、FlowRuntimeCoordinator及compiler/runner，
> 宿主边界仅用内存confirm/teleportOut。confirm以entered/deferred精确控制，不依靠固定sleep猜执行点。
> 场景出口使用两个状态：first写标志后以`to/macroTask`到last，last写childEnd；父command列表随后写parentEnd。
> 没有把stages.next错误当成同次调用自动续跑，也没有运行真实战斗/地图画面。
>
> ```sh
> node --import tsx docs/ops/audits/pre-e2e/tools/probe-save-barrier-family.mjs --mode=original
> node --import tsx docs/ops/audits/pre-e2e/tools/probe-save-barrier-family.mjs --mode=admission-only
> ```
>
> 两模式exit0表示**诊断观察与明确断言相符**，不表示产品已正确：
>
> | 同输入场景 | 原产品 | 仅删begin的pending gate（内存单点） |
> |---|---|---|
> | 未请求保存，内联出口 | first/childEnd/parentEnd全执行 | 相同，正常对照 |
> | confirm挂起时请求保存，答yes后内联出口 | 保存超时、snapshot 0次；超时解门后全部标志才执行 | 保存成功、snapshot 1次，但只有first/parentEnd，childEnd缺失；子cursor已为last |
> | 同内容独立root hook，confirm后请求保存 | first执行，cursor=last，成功快照；childEnd未执行，符合独立根安全点暂停 | 相同，对照证明不能全局取消安全点stop |
>
> 单点模式严格验证needle唯一且Vite load实际命中，磁盘源码前后逐字一致。
> 当前`script-world.ts` SHA-256：`18b30703a2d5748d4fff54f3e3fd6c2f9bd571c00fd03fb16cc6356917bf3e35`。
> 全局fetch禁止网络且finally恢复，server关闭；未写项目/资产/存档，不声称Vite内部绝无缓存I/O。
> world只承载script运行最小字段，不是通过current-save codec的完整合法存档，snapshot是直接克隆的脚本状态。
> 诊断100ms只缩短已证互等的观察，生产默认10000ms未改；独立根/无保存正控同轮执行。
>
> ## 内部生命周期压力反例（限定范围）
>
> original模式另外构造：持久lease已在barrier安全点close，但人为延迟registration的finally；barrier.ready后，
> 旧计数仍让同runtime/signal的withScriptActivityLineage进入body（enteredAfterReady=true）。
> 这是**人工API组合**，没有证明生产调用会出现该窗口，不增加确认bug数、不裁决U-02。
> 仅说明新设计不能以“WeakMap里还有计数”担保实际lease仍在coordinator.active表，也不能把它当成ready后准入凭证。
>
> ## 旧证据复跑与限制
>
> 旧[probe-glm-next-barrier.mjs](tools/probe-glm-next-barrier.mjs)保持零diff，当前树分别执行：
>
> ```sh
> node --import tsx docs/ops/audits/pre-e2e/tools/probe-glm-next-barrier.mjs --mode=contract --case B01
> node --import tsx docs/ops/audits/pre-e2e/tools/probe-glm-next-barrier.mjs --mode=contract --case B02
> node --import tsx docs/ops/audits/pre-e2e/tools/probe-glm-next-barrier.mjs --mode=contract --case B03
> node --import tsx docs/ops/audits/pre-e2e/tools/probe-glm-next-barrier.mjs --mode=contract --case B04
> node --import tsx docs/ops/audits/pre-e2e/tools/probe-glm-next-barrier.mjs --mode=contract --case B05
> node --import tsx docs/ops/audits/pre-e2e/tools/probe-glm-next-barrier.mjs --mode=contract --case B06
> ```
>
> - B01/B03各exit1，红因分别为“confirm继续后的自身子链不得使原保存超时”和“内联onTeleport不得与原保存互等至超时”，不是模块/fixture错。
> - B02无保存正常链、B04结束对照、B05真实挂起超时后重试、B06取消收尾均exit0。
> - **B06证据限制**：saving的then只返回saved，不返回script；旧`result.script?.flags?.…`断言不是快照内容证据。
>   仍可使用真实AbortError、世界链尾未写、后续保存可用断言；正式SL-07必须直接抓实际snapshot，不能原样搬此弱断言。
> - 没有重跑全部72项，也不执行与本卡无关的旧B11/B12主壳导出探针；来源总表不因本卡改成“全批重新验证”。
>
> 相邻现有测试原样执行：
>
> ```sh
> cd packages/reforge
> node ../../node_modules/vitest/vitest.mjs run src/script-world.test.ts src/script-runner-core.test.ts src/runtime-script-project.test.ts --no-file-parallelism
> ```
>
> 结果3 files / 39 tests全绿；它们保护独立root暂停等原合同，未覆盖本卡两条反例。新probe Biome复查0问题。
> 文档门首次因并行的四包卡已推进build但索引仍draft报两项；同步真实状态后零问题，文档工具20/20、diff-check通过。
> 临时日志目录`/tmp/type-pal-save-barrier-draft.JTwkGI/`：`family-{original,admission-only}.log`、`B01-contract.log`～`B06-contract.log`、`adjacent.log`。
> 临时日志不是交付依赖，以上脚本/命令可重建证据；实现后老反例翻转应另记，不回改冻结审计预期冒称旧probe一直绿。
>
> ## 修复准入与未做
>
> 本卡把两个入口合成同族方案，仍需Kimi/GLM独立前提/设计签字；WORLD历史GLM豁免不适用。
> 本次无产品修改、正式测试新增、覆盖率更新、全仓check/ratchet、浏览器或用户存档验证。
> 开发期完成代码时序回归，剧情/保存观感随本卡SL-E1～E3集中R4/Q1验证。

<!-- original-source-quote:end -->
