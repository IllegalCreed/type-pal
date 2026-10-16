# GLM 守卫第三批：6b371144 定点接收

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 3dc90ad8f6dde5a7ddcafc6b749b61dd53152751；本轮 R78。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- GLM 守卫第三批：6b371144 定点接收：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

## 当时证据

- 原始命令、输入、caller/oracle、结果、机器字段、SHA、counter、链接和未执行项保留于 quote。

## 当前有效性

historical。历史测试结论必须带日期和 source revision，并由当前 catalog、contract、fresh receipt 重新核定。

## 继任文档

- 当前入口：对应 testing catalog/domain report、contract、paired evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、真实 caller/oracle、排重、独立 review 和静态零诊断。

## 停止线

- 本页不证明 runtime、E2E、视觉、coverage 或当前产品行为；不得以 archive wrapper 替代执行回执。

## 原文保全

固定 source revision `3dc90ad8f6dde5a7ddcafc6b749b61dd53152751`，source SHA `c4eade862fa7d2aa5d568c7e8dbdd535fe8b814a6707961d0dc8972a86cc209f`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # GLM 守卫第三批：6b371144 定点接收
>
> 历史counter已于2026-09-27在6a114727闭合；当前结论见[接收与集成](../../quality/quality-gates/guard-wave3-integration.md)。
>
> 2026-09-26，Codex独立复核候选`6b371144e5a96a2996c73932d04f664ebbb8a8b7`。
> **counter，仅R2的一处匿名对象输入保真仍未闭合；不合候选，不跑全仓覆盖。**
> [任务卡](../../../../../ops/archive/tasks/done/TEST-GLM-CONTENT-GUARDS-3-script-and-records.md) /
> [上一轮](../../quality/quality-gates/guard-wave3-r2-review.md) / [独立见证](../../../../domains/quality/quality-gates/tools/guard-wave3-r3-review-witnesses.mjs) /
> [本席机账](guard-wave3-r3-review-evidence.json)。本文替代上一轮的活动阻断清单，历史证据保留。
>
> ## 已通过，不再返工
>
> - 白名单成立：八新测试、一个薄fixture、专属证据、本卡作者块；四生产目标与scripts对8add8c66零diff。
> - R1三个表已补真实同kind合法正控。独立移除gate上限条件、改成无条件拒绝后，原39/39绿变为38绿/1候选AssertionError红。
>   这次候选自身已能辨别合法gate错误拒绝，不需要额外oracle补救。
> - R2上一轮点名badTransition、badFade、badWipe与emptyStages均有实际快照。
>   敌transition抛原错前改kind的同一针：7/7对照绿，变异6绿/1候选AssertionError，原反证闭合。
> - G3重复坏wipe自比较用例已删除，实际各组9/8/11/21/7/6/9/39=110，runner TOTAL/机账总数一致。
> - 本席复跑原八针，各恰一目标AssertionError；110对照及10判据自测通过。
>   全content **92文件1132/1132**、TC、改动Biome（3处已有字面量针warning、零error）、docs/diff通过。
>   `/tmp/codex-guard-wave3-r3-{mutants,content,tc,biome}.log`，新鲜JSON为`/tmp/codex-guard-wave3-r3-content.json`。
>
> ## 唯一代码残项 R2：onDefeated 的匿名对象
>
> `packages/content/src/enemy-hook.guard-residual.test.ts:178-181`仍直接调用
> `checkEnemyOnDefeatedCommands({}, 'defeated')`。对象未具名、没有调用前/后比较，不能证明拒绝不污染输入。
> 对八文件63处直接expectExactError回调做AST枚举，此处是唯一直接传对象/数组字面量的拒绝调用。
> 这属于上一轮“全部对象/数组拒绝调用”要求，不是扩大覆盖池或新增产品政策。
>
> 独立只改`enemy-script.ts:371`的拒绝门：非数组且为对象时，先给实际value加
> `__codex_mutation: true`，随后仍抛完全相同的原错误。候选 **7/7仍绿**。
> 隔离追加具名同一`{}`的真实深快照oracle：原实现8/8绿，变异7绿/1 AssertionError红，
> 错误实际显示多出该属性。不是超时/环境红；每对照与变异都钉唯一加载锚点，生产/候选hash不变。
> 原始JSON与日志目录：`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-glm-residual-r2-j0bW2K`。
>
> 使用上一轮runner同一判据，在Vite隔离加载层复算，不改仓内实现或候选：
>
> ```sh
> env -u NODE_COMPILE_CACHE node docs/testing/domains/quality/quality-gates/tools/guard-wave3-r3-review-witnesses.mjs /Users/zhangxu/illegal/type-pal-glm-content-guards-wave2
> ```
>
> 该脚本钉本候选的“漏检”事实；下轮Codex只需将该针期望从绿改为候选业务红、去掉额外oracle后重验。
> 这不是当前产品实际存在污染缺陷的声明，只是测试不能抓住此类回归。
>
> ## 随手勘误（不另开阻断，不重做矩阵）
>
> 作者receipt:42仍写“未新造fixture”，但实际已新增`glm-guard-residual-fixtures.ts`，机账newFiles正确。
> receipt顶部111/1133是上轮数据，当前110/1132已在末节正确；明确标历史即可。
> 机账item-status-dup的onlyFailed仍是旧测试标题，当前runner里的新标题运行已正确；只同步文字。
> 另少数投掷正负例有可选字段缺席差异，合法正控本身确实执行通过，不作为新的返工项。
>
> ## 可直接转交GLM
>
> ```text
> 在 codex/glm-content-guards-wave3 原工作树，仅闭最后一处R2。
> 先 fetch origin，读 origin/main:docs/testing/archive/legacy/content/quality-gates/guard-wave3-r3-review.md。
> enemy-hook.guard-residual.test.ts:178-181 的 {} 改成具名实际输入，调用前独立快照，
> 精确原错误断言后立即比同一实参，或复用现有expectRejectUnchanged。
> enemy-script.ts:371 抛原错前给value加属性的单点变异必须由候选自身AssertionError抓住。
> R1和已闭R2不重做；不改产品/Codex见证/基线，不新增大矩阵。顺手同步回执fixture与旧标题勘误。
> 这次只需定向110、G5变异正负对照、TC/Biome/docs/diff；已通过八针不必重复跑，也不跑全仓覆盖。
> 提交推送最终SHA，Codex复验通过后直接集成；不合main、不标done。
> ```
>
<!-- original-source-quote:end -->
