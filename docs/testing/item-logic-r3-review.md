# GLM物品六组：598777cf第三轮独立接收

2026-09-27，候选`598777cf30bc9c7537995ba042d341ce5de27a55`（本地/远端一致），Codex **counter**。
[任务卡](../ops/tasks/TEST-GLM-ITEM-LOGIC-1-world-use-residuals.md) /
[上一轮残项](item-logic-r2-review.md) / [机账](item-logic-r3-review-evidence.json)。
本轮未改候选语义，未合候选、不计覆盖；仅把复核与窄返工要求提交主线。

## 已闭合，不重开

- R1当前ActorDef/生产构造器、装备独有正控保持接受；产品/旧测试/配置/基线无候选新增改动。
  `6c66619e..598777cf`共13文件，原已接受testing/README一行导航例外保持。
- R2旁库存：ownership:21-24实际加入potion，:79-87深快照非空哨兵。原drop-unrelated-inventory
  现候选6绿/2业务红；原地扣除合同没有改成全输入不可变。
- R2成长数值：effects:359-368已核8项精确成长、exp/hp；原growth-no-op现9绿/1业务红。
- R2外部money/resources/learnedSkills：external:66-85真实非默认哨兵已落；原drop-external-money
  现5绿/1业务红。下列RNG次数和完整world仍是原R2要求，不能把三个字段等同于全世界保真。
- 独立定向46/46、content98文件1178/1178、相邻executor17/17、content TC零诊断；
  作者10判据自测+46对照+原六针全通过。docs/diff通过；这些绿结果不覆盖下面的漏检/质量错误。

## R2残项：RNG次数与完整外部世界结果还没钉住

| 既有要求 / 候选锚 | 本席唯一源变异 | 候选 | 同调用族独立oracle |
|---|---|---|---|
| effects:347-368 固定rng值，但没记录调用次数 | item:1110在applyLevelGrowth前额外调用一次rng | 10/10仍绿 | 原实现11绿；变异10绿/1 AssertionError，7次不等于6次 |
| external:66-85只比三个新增字段/库存，没比完整world | item:1187消费前把clone的party[0].hp改为0 | 6/6仍绿 | 原实现7绿；变异6绿/1 AssertionError，83被清成0 |

现行`rewards.ts:51-60`一层成长恰调用6次rng；这是读取当前实现/原要求的回归，不新增概率政策。
见[残项见证](item-logic-r3-residual-witnesses.mjs)：复用原工具的唯一加载锚、hash守卫、正控和业务红判据。
修订只需在现有用例记录实际rng计数，并用输入的独立深克隆只改预期库存后比较**完整**outcome.world。
不重写已正确的八项数值、不新加业务矩阵。

## R3仍未落盘：回执说修了，但真实代码仍漏检

- `git diff 1c8b57cb..598777cf -- packages/content/src/item.derived.background.test.ts`为空；
  derived:149-151仍匿名传`['100']`，只拍char。learned-input-mutation候选8/8绿，独立oracle为1业务红。
- ownership:108-132空key/负数/非整数拒绝调用仍没有前后快照，后面再拍world已太晚。
  throw-input-mutation候选8/8绿，独立oracle为1业务红。
- effects:108-110、211-219仍将`poisonDefs()`对象传给产品、却把`poisonDefs`函数交给快照。
  仅levelUp:353-356改成了同一个具名defs；其余三次调用仍需改。函数身份相等不保护实际毒表。
- 原R3要求的其它items/actor/world等真实数据实参仍应逐次核对，不可用“六文件全保护”概括部分调用。
  本轮没有要求扩测试业务域；removeOwnedItems的原地合同继续保持。

两原反证复用[原六针工具](item-logic-r2-review-witnesses.mjs)，未改变异/判据；共24跑，所有正控绿。
本轮四条漏检（两原针+两R2残项针）均有原实现绿/变异业务红的独立oracle，非超时/环境红。

## R4：本批2条硬质量错误，正文/机账仍有已点名的不符

- 本席九文件Biome完整JSON：**2 error /0 warning /0 info /0截断**，都是本轮新增导入排序：
  `item.external.background.test.ts:11-15`与`item.ownership.background.test.ts:12-17`。
  r3交付声称0error不成立；这不是主线既有诊断。主线QUALITY-ZERO-1已完成，不授权GLM越界改共享配置。
- README仍写45行/45对照；receipt:19仍是合计46但I2写7；:46仍1177/净增45；:47-48仍把旧warning写成error。
- receipt:33/36/38仍写输入污染、resolve-target-skip/targetIds门、丢外部变化。
  runner实际是派生数值、stoppedTargets门、引用选择；机账虽改了针ID，:63仍错误写targetIds。
  fullName仍用省略号代替真实身份；derived/effects/external旧头注释的空字符串/资源池越界/多效果宣称尚未收窄。
- 任务卡r3块再次宣称“derived具名learned”“worldResourceValue拒绝快照”“receipt全同步”均已完成，
  与上述实际diff不符。请勘误当前正文与历史不实声明，不要仅在卡尾再追加“已修”。

## 证据与边界

- `/tmp/codex-item-logic-r3-{directed,content,tc,adjacent,mutants,witnesses,residual}.log`；
  定向/content/executor新鲜JSON与Biome完整JSON同前缀。
- 原六针目录`codex-item-logic-review-D5wQOy`，残项两针`codex-item-logic-review-gwM5ra`，
  作者工具`type-pal-item-logic-mutants-fzj9zr`；绝对路径/hash/确切失败身份见机账。
- 没有发现并修产品缺陷：这里证明测试会放过注入的错误，不宣称产品现已包含这些变异。
- 本轮不运行全仓check/coverage、不启动浏览器；接受实现后再统一质量门。GLM不是独立第三方证明。

## 可直接转发给GLM

在codex/glm-item-logic-r1原工作树，针对598777cf只修本报告R2/R3/R4残项；先fetch并读origin/main本文与机账。
已闭合的typed fixture/装备独有/旁库存/八项成长/money三哨兵不重开，不加新业务范围。
R2在原levelUp例钉真实rng恰6次；external消费例比较输入深克隆仅变库存后的完整world。
R3真正落盘具名learned及同一数组快照；每次worldResourceValue拒绝前拍实际world、拒绝后立即比并核完整错误；
effects其余三次poisonDefs调用都先具名实例、同对象传产品与快照；逐次核原六组其它实际数据入参。
R4修两处import排序，改动须0error/0warning/0info；从新鲜JSON和实际runner全文修README/receipt/evidence/卡中
计数、针ID、stoppedTargets锚、精确fullName及过时声明，勘误前两次“已修未落盘”。
复跑原六针见证+新增两针残项见证，四漏检均须候选自身AssertionError红、原实现绿；不得改Codex见证或产品。
按原卡复跑定向/相邻/content/TC/改动Biome/docs/diff/作者反控，逐条对git diff后提交推送完整SHA。
不跑全仓coverage、不合main、不标done、不扩范围。Codex审核通过后负责集成推送，无需Kimi/GLM固定三签。
