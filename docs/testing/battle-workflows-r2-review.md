# TEST-BATTLE-WORKFLOWS-1 r2：Codex独立接收

2026-09-23。实现候选 **b7ba48bb**，远端tip bf158a63仅多一份交接提示；四生产目标对57dda7ed零diff。
结论：**counter，保持rework，不集成、不跑统计并集，不转Kimi**。原r1设计不重签。

[任务卡](../ops/archive/tasks/done/TEST-BATTLE-WORKFLOWS-1-session-flows.md)、[r1原反证](battle-workflows-review.md)、
[r2复建见证](battle-workflows-r2-witnesses.mjs)、[机账](battle-workflows-r2-evidence.json)。
GLM回执和实现者自签仍属于贡献者声明，不能代独立审查。

## 本轮已实证修复，不重开

- fixture目录已迁至`packages/reforge/src/__tests__/battle-workflows/`；9代码+2工具，34项按
  W1～W6为8/6/6/5/4/5。候选、GLM原工作树和本席隔离复核树均干净；本席未改候选语义或源文件。
- 不只跑默认guard样本：在实际构造BattleSession前包入正式skills/items/enemies/battleSprites守卫，
  对实际wfActorDef返回值包入validateActors，**35次会话+5次角色构造全部通过**，仍34/34绿。
  包含ready/turnStart hook修改后的enemy和限次技能。r1伪旧技能/Actor缺字段/负帧索引/空对象帧问题已修。
- ArrowLeft真实施法40→20、R重复40→20→0与耗尽后降级、A真实推进、库存消费、非空成长/skillUse，
  已不再是r1的S普攻/空写回。victory/defeat/playerFled精确resolve，不再把pending算成功。
- 原五针全部转为候选自身AssertionError：关A 1红、关R 2红、持久写回空操作2红、前三终态永不resolve
  3红、preparing偷扣MP 1红。不能把这些已经解决的点再算未修。
- 本席复跑：**34/34、相邻267/267、全Reforge1412/1412、TC exit0、Biome12文件零诊断**。
  原GLM工具6正控+9针exit0；9针本次均真实加载并有钉名业务红。未知针exit1与首行timeout拒绝已修。
- 未跑覆盖率；GLM的1378→1412为其冻结分支口径，不与主线7826或宿主增量直接相加。

## C1｜W6还没有验证完整写回结果（原R2残项）

| 候选锚点 | 独立单点反证 |
|---|---|
| `writeback-flows.test.ts:100-108/:136-140`有8个成长字段，只按预期检查5个 | 唯一fixedCharacterGrowth分支漏写`magicAttack`，**整包34/34仍绿**；delta中的灵力2、身法1、吉运1未完整对账 |
| `:149-168`限次技能只验计数1 | 禁止`mutation.removed`删除learnedSkills，**整包34/34仍绿**；达到lifetimeLimit后技能仍留在world而未被此包发现 |
| `:78-96`标题“HP终值”，实际只验减少且≥1 | writeBackHp硬写HP=1，**W6仍5/5绿**。该用例没有结束战斗，亦未制造HP0后胜/逃，不能声称验证“胜/逃至少1”边界 |

成长第二次写回和afterFirst相等只证幂等，不能替代第一次结果按完整预期正确。
世界/未参战实例没有非空完整保真正控，奖励后再次写回保持的原合同也未对账。
同类标题/断言错位还见`selection-flows.test.ts:26-42`：“敌HP真实下降”实际读取的是玩家被反击后的HP；
不把这句话当作敌目标/伤害结果已验证。

返工：比较完整预期world/角色，预期从操作前实际输入快照+业务变化构造，不能把第一次错误结果当金标准；
成长8字段、限次计数与技能移除、HP/MP精确结果、非目标保真/奖励后保留一次补齐或给准确既有证明。
保留已修的非空变更/幂等，不需要重做A/R/ArrowLeft。

## C2｜ready后续动作与失败清理仍是假证明（原R3残项）

`script-flows.test.ts:53-56`把任意包含ready-hook与“攻击”的日志当作敌人已行动。
但玩家攻击该敌人的日志也符合。临时只在生产`:1591`激活ready后移走该敌actionQueue entry，
保留ready音与玩家攻击，**整包34/34仍绿**。这没有证明“hook结束后同一敌正常行动”。

`script-flows.test.ts:126-128/:184-186`确实在finally放行gate，此点已修；但没有保存、await实际
prepareTurnSounds返回的pending，与文件头第5行“放行并消费”不符。
本席在已进入屏障后注入一个独立AssertionError，在候选测试体拒绝出口观察**原callback Promise**：
`originalFailure=true, settledAtBodyExit=false`；由观察器额外消费后才`settledAfterObserverConsumes=true`。
观察器不替换该Promise、不改生产算法，并最终重抛原错误。这证明缺的是原pending收口，不宣称gate未放行。

返工：ready前后采用明确行动者/目标/顺序和实际HP变化，不以名字子串冒充行动归属；
保存真正返回的prepare Promise，在finally放行同一gate后消费它，失败注入自证保留原错误且清理已完成。
不要改为等待可能永不完成的battle.done；取消后的业务状态/日志也应核完整不变，不能仅看phase名字。

## C3｜原六组合同仍有缺口，不能用“组合剩余以后补”带过（原R2/R3）

六文件和r2机账没有给以下已签项新增实现或准确旧标题去重：

- W1/W3：throw/coop有效与无效选择、上一位回退后重选的真实提交/一次代价；变身/召唤接线。
- W4：真正敌hook等待/选择后恢复；现有ready/turnStart仅即时playSound，音效prepare屏障不等于敌hook等待。
- W5：`enemyFled`、`terminated`（公开cancel的AbortError不等于BattleResult.terminated）；非胜利零奖励
  与各屏边界/最终完成的承诺需逐条对账。当前多屏用例最后调用finish最多额外确认40次，也不能证明第三次确认就是最后一次。
- W6：C1所列完整输出/非目标与奖励后保留。

不要求重复现有证明；允许引用**确切旧测试标题+源码位置+该合同实际断言**去重。若当前确不可达则给调用域反证，
交Codex裁定；不能自行把r1已经签入的内容改成无归属后续。本项是原counter中的未闭合项，不是新扩范围。

## C4｜判据和回执还不是所声称的精确合同（原R1/R4）

`glm-battle-workflows-mutants.mjs:175`仍把未转义、未锚定的leaf交给-t；`:198`用路径后缀、`:202`用标题后缀，
`:203`只认任意MUTATION_HIT字样，没有本针身份；`:215-227`不核套件/运行时附加错误。
`:124-130`只排失败首行的timeout。

本席通过TS AST取出**实际使用的所有谓词与verdict表达式**执行，未另写替代判据：

| 构造报告输入 | 实际判定 |
|---|---|
| 正确case自身AssertionError正控 | detected |
| 不同suite、相同leaf后缀 | **detected** |
| 无关项目的同后缀文件 | **detected** |
| MUTATION_HIT属于另一针 | **detected** |
| 同时有候选断言与套件普通Error | **detected** |
| 首行waitFor timeout | invalid（已修） |
| 首行断言、后续行明确Test timed out | **detected** |

这是判据抗误判测试，不是声称本次9针实际发生了这些错配。当前9针的真实业务红照样采信。
已修未知针exit1；但仅选一个合法针时`:250`仍固定宣称6controls，未实际执行这6组。

回执还需两处勘误：

1. “每个文件首组运行guard”不实：只有selection的第一例调用默认样本合法门，其他五文件没有。
   默认样本不是实际消费变体。将守卫放到实际fixture出口/会话入口（包含后改hook与演员数据），不堆重复guard例。
   本席插入守卫40次全部接受，**不把此缺口歪说成当前数据非法**。
2. `controlled-io.ts:20/:28/:34`仍有3处as unknown。它们是声音/字库/调色板外部IO替身，不是旧R1的
   业务数据强转，按原卡可保留；但机账“无as-unknown强转”必须收窄为业务fixture无绕guard强转。

返工：用正控实际拿到的唯一fullName+规范物理绝对路径固定目标，转义并锚定-t；逐针核marker身份，
拒未运行/多执行/套件与运行时混错/timeout，真实总判据加反例自测；汇总只报告实际跑过的控制数。
按最终树写回执，不要再次宣称R1～R4全闭而只更新部分实现。

## 复建与验证记录

```bash
node docs/testing/battle-workflows-r2-witnesses.mjs /Users/zhangxu/illegal/type-pal-battle-review
```

本席隔离工作树锚b7ba48bb，GLM原树仍bf158a63且干净。旧r1见证文件零diff，r2新增独立工具，候选文件
在每次运行后hash不变。工具的0退出表示取证成功，**不是r2被accept**；结果含旧5针检出和新4针存活。
finally观察中的故障是本席注入，明确标注而不冒充候选无故失败。

基础验证日志：`/tmp/type-pal-battle-r2-{targeted,adjacent,typecheck,full,biome,mutants,unknown}.log`，
定向JSON为`/tmp/type-pal-battle-r2-targeted.json`。GLM9针产物为系统临时目录`bw1-mutants-TFipGS/`。
最终独立见证目录见机账，含每针唯一替换config、实际load marker、JSON断言和candidate hash。
本轮没有跑官方check/ratchet/strict或覆盖率并集，主线基线仍7826/633。

## 接收决定

Codex对r2 **counter**，只追C1～C4残项；已修的五反证、结构合法性、路径/Biome、未知针不重开。
不改候选语义、不代签、不导入GLM业务文件、不标done、不发Kimi提示词。GLM按原卡返工后再接收。
旧兼容审查：生产零改、伪旧业务模型已去除，pass；这不代替测试断言及工具纪律验收。

前两卡TEST-COVERAGE-TRUTH-1与TEST-RUNTIME-SHELL-COVERAGE-1已另以a13a66f7核定done（同候选b6286df0，
Kimi aa436d9f/GLM326e4906同候选accept，远端CI绿），不互相借签或重开。
