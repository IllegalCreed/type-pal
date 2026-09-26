# GLM物品六组：705eb161独立接收

2026-09-27，Codex复核`705eb16151796f4baa8a44a5ed9206337e37a632`，结论 **counter / R1–R4**。
[任务卡](../ops/tasks/TEST-GLM-ITEM-LOGIC-1-world-use-residuals.md) /
[独立见证](item-logic-review-witnesses.mjs) / [本席机账](item-logic-r1-review-evidence.json)。
不合候选，不修改贡献者测试语义，不运行全仓check/coverage；本轮不恢复主动覆盖率扩展。

## 已核通过及边界

- 六新增测试+薄fixture+专属证据+本卡作者块；产品/旧测试/配置/基线零改。
  白名单外仅testing/README一行导航，作者已披露；Codex接收这项机械导航例外，不作为返工。
- 独立复跑作者runner：10判据自测、45项对照、6针恰各一候选AssertionError，源码hash不变。
- 全content98文件1177/1177（含本包45），相邻reforge item-use-executor17/17，content TC通过。
  docs/diff通过。**本批Biome exit1**，不能沿用作者“全部绿”的结论。
- I5 rawItem混外部效果显式登记为非法载体/防御直测，这一分类可接受，不要求硬造合法caller。
- 下方证明的是候选会漏掉回归，不声称这些变异已存在于产品；生产代码始终未改。

## R1｜“合法Actor”使用了敌侧字段，typed fixture前提不成立

`__tests__/glm-item-logic-fixtures.ts:64-93`的heroActor把health/attackStrength/dexterity等敌侧字段
交给validateActors后，直接采信其ActorDef返回类型。当前guard不深查baseStats，故通过并不能证明这些字段正确。
现行`actor.ts:68-81`要求hp/maxHP/mp/maxMP/attack/magicAttack/speed/luck等。
本席真实`instantiate(heroActor())`得到hp/maxHP/attack均undefined；同定义走buildWorld，再经正式
assertCurrentSaveStructure拒绝：`存档 载荷.world.party[0].hp 必须为有限数`。
原控制位置/版本均按当前格式构造，不是存档格式错造成的红。

修订：对象字面量先用`ActorDef`/`satisfies ActorDef`约束，再过guard；hero/world按任务卡使用生产
instantiate/buildWorld构造可消费基线，并保留用例自己的合法覆盖。移除preflight:104的`as never`及
其它无必要类型掩盖。无需引入整个PAL/浏览器/资源加载；map外装备等防御合同可单列，不强制改成正常场景。
这里只修夹具，不授权GLM改validateActors或扩schema；guard深查缺口仅作一手观察。

## R2｜四个业务合同被空哨兵/弱断言掩蔽

| 候选锚点 | 漏检原因 | 单点变异 | 候选结果 | 同输入族独立oracle |
|---|---|---|---|---|
| item.inventory.background.test.ts:149-163 | 声称装备侧入列，但talisman已经在背包，只有去重/排除，没有装备独有正控 | 删除equippedUsable.push | 7/7仍绿 | 空背包+已装备可用品，对照8绿/变异1红 |
| item.ownership.background.test.ts:75-81 | beadRing只有bead库存；beforeOther是undefined，比较undefined=undefined | 实际扣除后丢全部非目标库存 | 8/8仍绿 | 非空potion哨兵，对照9绿/变异1红 |
| item.effects.background.test.ts:346-357 | changed=true可来自消费，exp原本0，level>=1允许完全没升级 | applyLevelGrowth替换为零delta且不改角色 | 10/10仍绿 | 固定rng的真实8项成长，对照11绿/变异1红 |
| item.external.background.test.ts:65-95 | 消费后仅看库存/引用；默认money=0，没有实际非默认host结果保真 | 消费clone的钱被清零 | 6/6仍绿 | money37/resources/skills哨兵，对照7绿/变异1红 |

各针唯一源码锚点，独立oracle只在加载时追加，同一生产对照为绿；变异错误都是AssertionError，非环境/超时。
修订范围就是上述合同：装备独有正控、非空实际旁对象的深快照、完整成长与RNG次数、消费后完整世界结果。
原地removeOwnedItems核精确变化和所有旁字段，不加“全输入不变”错误约束；不要用beforeOther原引用
比较被同样污染的对象。external纯函数可用合法的“host完成后世界”作为输入，但不得宣称执行了真实外部脚本。

## R3｜纯函数只保护world/char，漏掉其它实参与抛错路径

- I1 effectiveSkills:128-147把`['100']`匿名传入，只对char做快照。独立在复制learned后修改原learned数组，
  返回技能列表仍正确，候选8/8绿；具名实际learned前后快照oracle对照9绿/变异1红。
- I4 worldResourceValue:102-126的抛错用例无调用前快照，toThrow只是子串断言；空key原错前污染money，
  候选8/8仍绿，后续helper拍到的已经是污染状态。独立oracle对照9绿/变异1红。
- 同样的纯读取入口items/ActorDef/poisonDefs也属于实际对象输入，当前大多只包world或char。
  请在原六组里统一审计并用具名tuple/object输入快照，调用前拍、每次调用后立即比；
  不要求新增业务矩阵。故意非法的拒绝输入也应保持原样，使用完整错误message断言。

## R4｜最终提交与回执不一致，需按最终树勘误

- `item-logic-mutants.mjs:27`多余空行令九文件Biome exit1；作者回执称0error/0warning不成立。
- 相邻item.test实际**51项**，不是96；96=51旧+45本包。全包1177与新增45无误。
- runner实际第四针为`resolve-stopped-skip`，删除stoppedTargets门；receipt/evidence却写resolve-target-skip。
- `derived-stat-assign`是派生数值错误，不是输入污染；`external-world-identity`只测引用选择，不证明丢外部内容。
  对应类别按真正变异和红因登记，补全精确file/fullName，不用省略号代替执行身份。
- runtime-script.ts:146是既有**warning/exit0**，不是本批formatter error的原因。
- 清理已撤回的标题/注释：derived文件头仍称空字符串映射，effects头称新增资源池档位分支但无对应新例，
  external单效果例不能宣称多效果顺序；每条按现行guard与实际用例收窄，不为兑现错误声明扩大范围。

## 独立证据与复跑

```sh
env -u NODE_COMPILE_CACHE node docs/testing/item-logic-review-witnesses.mjs /Users/zhangxu/illegal/type-pal-glm-item-logic
```

本席六组×四跑=24次：候选原实现全绿，六变异候选仍全绿；六独立oracle原实现全绿、变异各恰一业务红。
脚本只使用Vite load隔离替换、源/test/fixture hash不变；无覆盖率输出。
原始目录`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-item-logic-review-rgP2fl`。
日志`/tmp/codex-item-logic-r1-{witnesses,mutants,content,adjacent,tc,biome,existing-biome}.log`；
全包新鲜JSON`/tmp/codex-item-logic-r1-content.json`，作者六针重跑目录`type-pal-item-logic-mutants-JFj0Q4`。
下轮Codex将按修订后的标题/fixture适配本人见证，不要求GLM篡改本轮冻结工具来过门。

## 给GLM的窄返工提示词

在codex/glm-item-logic-r1原工作树接收R1–R4。先fetch并读origin/main的本文、机账及本卡，
保留审查原文；不重领新范围、不改产品/旧测试/基线/本席见证。
R1修真正typed ActorDef与当前构造器基线，移除as never，别用宽松guard返回类型洗白敌侧字段。
R2补装备独有正控、非空旁库存深快照、固定RNG完整成长、external消费后非默认世界完整保真。
R3逐一保护实际learned/items/actor/poisonDefs/world等对象输入及抛错路径；原地扣物品保持精确变更合同。
R4按最终树修Biome、51旧+本包的计数、第四针实际stopped门、错误类别/标题/声明。只修已点名合同，不堆例。
各单点变异须候选自身业务红；复跑定向/相邻/content/TC/改动Biome/docs/diff与原反控。
整包提交推送完整SHA；不跑全仓check/coverage，不合main，不标done。作者自验不替代独立接收。
