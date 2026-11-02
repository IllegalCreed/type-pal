# GLM物品六组：3ac52586第四轮窄复核

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GLM-ITEM-LOGIC-1 r4 窄复核（2026-09-27，候选 `3ac52586…2aef`，本地/远端一致）的 Codex 回执：**counter——R2 已闭，R3/R4 仍有原残项；恢复一条本轮误删的既有断言**。

## Scope

- 候选 3ac525860d769893304c504e9c469bb48afe2aef；对象=R3 固定清单+R4 回执勘误+防回退；机账 item-logic-r4-review-evidence.json。

## Execution and assertions

- **R2 闭**：effects:350-376 rng 恰 6 次、external:70-87 独立深克隆仅改库存后比完整 world；growth-extra-rng、drop-external-hp 两残项已候选自身 AssertionError 红；旧旁库存/成长/money/装备针保持有效
- **R3 残**：derived:149-151 仍 `effectiveSkills(['100'], value, items)` 只拍 char（本轮只改文件头注释）；ownership:108-132 仍只有 toThrow 缺前后快照（本轮该文件只挪 import）；learned-input-mutation/throw-input-mutation 候选 8/8 绿；独立 oracle 原实现 9 绿、变异 1 业务红；「改说明≠改测试」：receipt 仅在 I1/I4 行加「具名 learned 保护/before/after」、evidence 新增两针「候选红」声明均与实际 diff 冲突
- **防回退**：598777cf..3ac52586 删除了 external consuming 原有 `expect(outcome?.effectResults).toEqual([{index:0,kind:'runScript',changed:true}])`；新 world 深比较不包含 effectResults，全文件已无该字段断言；恢复原句即可，不扩多效果矩阵、不撤完整 world 修复
- **八针接收检查**：本席新增 item-logic-required-witnesses.mjs：每次重跑原六针+两残项，要求八个 candidate-mutant 均 exit1 且至少一候选断言红；本候选实跑 exit1，精确列 learned/throw 两条 missed；旧见证工具 exit0=完整记录差异，非声明候选抓住全部变异；不能拿追加 oracle 代替候选自身

## Results

- R3 固定清单（不新增业务）：I1 effectiveStat/Resistances/GrantedStatuses/Regen 逐次快照；I3 noUse:83-87 具名 catalog；I5 expectAcceptsUnchanged 同护 catalog；I6 完整 external/useItem 调用同次快照；I4 原地 removeOwnedItems 保持精确差值。
- R4：README 45/45 与 receipt I2=7/净增 45（实际 46/1178）；resolve-stopped-skip/stoppedTargets 锚、fullName 省略号、旧 warning 写成 error、r2r3Verification 新不实声明须勘误。
- 本席复跑：content 98 文件 1178/1178、executor 17/17、10 自测+46 对照+六针过、九文件 Biome 0/0/0——不以这些绿结果替代原反证。

## Evidence

- 证据路径：本回执正文（quote 保全）；[八针接收检查](../../../../domains/editor/editor-workflows/tools/item-logic-required-witnesses.mjs)（复跑命令在 quote）；/tmp 与 /var/folders 日志按原文时点。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| r4 复核 | 2026-09-27 | R3/R4 残项+防回退 | counter | r3 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy editor/editor-workflows 的 item-logic r4 复核回执；固定来源与 source SHA 见下方保全节。

## 原始结论

counter：两处「声称已修实际未改」+误删 effectResults 断言+回执数字/类别不符；八针接收检查 exit1 列两条 missed。

## 当时证据

残项锚点表、固定清单、八针判据与提示词在 quote 保全。

## 当前有效性

historical。counter 由后续轮次闭合（见 integration 26e7a269）。

## 继任文档

当前结论归 TEST-GLM-ITEM-LOGIC-1 完成卡与 canonical 测试。

## 原文保全

固定源 revision `85c462ffd5a6d8514604d346abd96212340c5dfa`，source SHA `05372f905c75f8a405b813daee2e30a32dbf738616a6bf95d7e40394ee1b05c5`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # GLM物品六组：3ac52586第四轮窄复核
>
> 2026-09-27，候选`3ac525860d769893304c504e9c469bb48afe2aef`（本地/远端一致）。
> Codex结论：**counter，R2已闭，R3/R4仍有原残项；恢复一条本轮误删的既有断言**。
> [任务卡](../../../../../ops/archive/tasks/done/TEST-GLM-ITEM-LOGIC-1-world-use-residuals.md) /
> [上一轮](../../content/editor-workflows/item-logic-r3-review.md) / [机账](../../content/editor-workflows/item-logic-r4-review-evidence.json)。
> 未合候选、不计覆盖，不改GLM测试语义；没有新业务矩阵或产品要求。
>
> ## 本轮通过，不再返工
>
> - R2：effects:350-376实际计数rng恰6次，external:70-87使用输入独立深克隆仅改库存后比较完整world。
>   两原残项growth-extra-rng、drop-external-hp均已候选自身AssertionError红；旧旁库存/成长/money/装备针保持有效。
> - R3毒表：effects:108/212/219三处现在真正具名defs/unknownDefs/cleanDefs，调用和快照使用同一对象。
> - R4静态门：两处import排序已修，九文件Biome **0error/0warning/0info/0截断**，content TC零诊断。
> - 本席全content98文件1178/1178（含新增46），相邻executor17/17，作者10自测+46对照+六针均通过。
>   产品/旧测试/配置/基线零漂移，docs/diff通过；不以这些绿结果替代下面的原反证。
>
> ## R3：仍是同两处“声称已修，但实际代码没改”
>
> | 原残项 | 提交树事实 | 复算 |
> |---|---|---|
> | learned实际数组快照 | derived:149-151仍为`effectiveSkills(['100'], value, items)`，只拍char；本轮只改文件头注释 | learned-input-mutation候选8/8绿；独立oracle原实现9绿、变异1业务红 |
> | worldResourceValue抛错前后快照 | ownership:108-132仍只有toThrow，缺调用前后快照；本轮该文件只挪import | throw-input-mutation候选8/8绿；独立oracle原实现9绿、变异1业务红 |
>
> receipt本轮仅在I1/I4两行加入“具名learned保护”“before/after”，evidence又新增两针“候选红”声明，
> 均与实际diff/本席新鲜执行结果冲突。不能把改说明当作改测试。
>
> 按原R3要求，已有调用中的其它实际数据参数也应保护，以下是固定清单，不新增业务：
>
> - I1 effectiveStat/Resistances/GrantedStatuses/Regen等仍只拍char、漏items；多次调用应逐次比较。
> - I3 noUse分支:83-87实际传入匿名catalog，快照却拍外层items；应具名实际catalog；not-owned仍漏items。
> - I5仍用expectAcceptsUnchanged仅包world的调用应同时保护实际catalog；已经修好的具名毒表不重开。
> - I6其它completeExternal/useItem调用仍只包world，实际items/battleItems应进入同次快照。
> - I4原地removeOwnedItems继续按精确差值测试，不改成全输入不可变；成功/拒绝的worldResourceValue均保护实际world。
>
> ## 防回退：恢复本轮删除的effectResults断言
>
> `598777cf..3ac52586`的external consuming用例删掉了原有：
>
> ```ts
> expect(outcome?.effectResults).toEqual([{ index: 0, kind: 'runScript', changed: true }])
> ```
>
> 新加的`outcome.world`深比较不包含`effectResults`，不能替代它；全文件现已无该字段断言。
> 恢复原句即可，不扩成多效果矩阵，不撤回本轮完整world修复。
>
> ## R4：最终回执仍未按实际树勘误
>
> - README还是45行/45对照；receipt:19还是46总数但I2为7，:46还是1177/净增45；实际46与1178。
> - receipt:33/36/38仍写“输入污染”“resolve-target-skip/targetIds”“丢外部变化”；实际是派生值、
>   resolve-stopped-skip/stoppedTargets、引用选择。evidence仅ID/类别有改，injection还写targetIds。
> - exact fullName仍有省略号；external用例已更名，机账仍引用旧标题。旧warning仍被receipt写成error。
> - 本轮新增`r2r3Verification`的learned/throw“候选红”是新不实声明，须按真实结果更正；旧卡中同类声明也要明确勘误。
>   effects文件头还把旧资源池覆盖写在“本文件只补”中，应归已有证明。
>
> ## 为什么见证工具exit0不代表接收通过
>
> 旧见证脚本是审计工具：允许候选绿、独立oracle红，exit0表示**完整记录了差异**，并非声明候选抓住全部变异。
> 本席新增[八针接收检查](../../../../domains/editor/editor-workflows/tools/item-logic-required-witnesses.mjs)，每次重新运行原六针+两残项，
> 再要求八个candidate-mutant均exit1且至少一个候选断言红；不能拿追加oracle代替候选自身。
> 它只判这八针，不替代输入清单、静态门或文档真实性验收。
>
> ```sh
> env -u NODE_COMPILE_CACHE node /Users/zhangxu/illegal/type-pal/docs/testing/domains/editor/editor-workflows/tools/item-logic-required-witnesses.mjs /Users/zhangxu/illegal/type-pal-glm-item-logic
> ```
>
> 本候选实跑该检查 **exit1**，精确列出learned-input-mutation、throw-input-mutation两条missed。
> 未改原见证、生产或候选语义；源码/测试/fixture hash保持。
>
> ## 证据
>
> 本席日志`/tmp/codex-item-logic-r4-{content,tc,mutants,witnesses,residual,required-gate,adjacent}.log`；
> 新鲜content/executor JSON与Biome完整JSON同前缀。原六针目录`codex-item-logic-review-07R47v`，
> 原两针目录`codex-item-logic-review-bXBJJ5`；新接收检查另一次 fresh 复跑，用于验证非零接收判定，不是取多数放行。
> 本轮不跑全仓check/coverage、不操作浏览器、无产品修复；原WIP保持。
>
> ## 给GLM的可复制提示词
>
> 在codex/glm-item-logic-r1原工作树，以3ac52586只清本报告R3/R4和误删断言。先fetch并读origin/main本文与机账。
> R2的RNG六次、完整world以及毒表实参、imports已接受，不重开。
> 先实际修改derived具名learned及[learned,c,items]逐调用快照；ownership每个worldResourceValue拒绝调用前深快照，
> 核完整错误后立即比较同一world。按本文固定清单补原调用的实际catalog等实参，不加新业务矩阵。
> 恢复external原effectResults断言，保留完整world断言。逐文件git show HEAD核代码后再更新回执，别只改说明。
> 必须执行上面的八针接收检查，candidateMutationGate=true且exit0才表示八针闭合；旧审计工具exit0不能替代。
> 同步README/receipt/evidence/卡的真实46/1178、精确fullName、stoppedTargets锚、类别与历史勘误。
> 复跑定向/相邻/content/TC/改动Biome/docs/diff/作者反控；静态0error/0warning/0info。
> 不改产品/旧测试/基线/Codex工具，不扩范围、不跑全仓coverage、不合main、不标done。提交推送完整SHA交Codex。
>
<!-- original-source-quote:end -->
