# TEST-BATTLE-WORKFLOWS-1 r1：Codex独立接收复核

2026-09-23，候选 **16ac8cee**，基点4872b017，生产冻结57dda7ed。结论：**counter，转rework，不接收实现、不合并、不更新基线**。
设计r1保持；本轮问题是未满足已签实现合同，不要求新增产品行为或重签方案。

入口：[任务卡](../ops/tasks/TEST-BATTLE-WORKFLOWS-1-session-flows.md)；[独立见证工具](battle-workflows-review-witnesses.mjs)；[机账](battle-workflows-review-evidence.json)。
GLM回执/机账/源码位于其独立分支`codex/glm-battle-workflows-r1`、工作树`/Users/zhangxu/illegal/type-pal-glm-battle`，未拷贝其不成立的结论覆盖本报告。

## 已核实通过与边界

- 工作树干净，远端与本地候选一致；四个生产目标对57dda7ed逐文件零diff，未发现私有反射/核心mock/视觉操作。
- 本人复跑：6文件31/31、battle相邻19文件264/264、全reforge152文件1409/1409、TC exit0。
- GLM负控工具原命令本人复跑exit0，确实是6组正控+7针，其当前钉名case各一项失败；这不能替代下面的独立反证。
- GLM覆盖config复用官方fast选择/全部生产include，before仅排本批六文件。现有/tmp产物1378→1409，路径集合与每文件四维分母相同；四目标数据吻合，净+7L/+11S/+2F/+15B，其中session只有+14B、core+1B。不因增量小单独counter；但不能用“组合回归”掩盖未执行/未断言的业务。
- **Biome实际exit1：7 errors/4 warnings**，并非回执所称rc0。定向/相邻/TC/全包/格式/负控原日志均在`/tmp/type-pal-battle-intake.eJQVXK/`。
- 候选源文件未改；反证通过临时Vite load替换，仅写/tmp。GLM是测试贡献者，不作为独立第三方自证。

## R1｜fixture没有过现行guard，自己写的“合法门”不能替代生产校验

| 候选锚点 | 直接反证 |
|---|---|
| `catalog.ts:102` attackSkill | `mpCost/target:'enemy'/power/kind`不是当前SkillData；靠`:111 as unknown as SkillData`蒙过TC。正式validateSkills拒绝“缺键cost” |
| `catalog.ts:13` PLAYER_PROFILE | castEffectBase/attackEffectBase=-1；正式validateBattleSprites拒“castEffectBase期望非负整数” |
| `writeback-flows.test.ts:15` wfActor | 缺spriteId等当前字段，强转ActorDef；正式validateActors首先拒“缺键spriteId” |
| `writeback-flows.test.ts:40/:70` `{}` as never物品 | 正式validateItems拒“缺键id”；库存还存在未建定义的id |
| `catalog.ts:114`、`session-driver.ts:86`所谓合法门 | 只检查少数id/HP或instanceof，未调用生产guard；loadedBattleSprite还用空对象帧+强转资源类型，不能说目录/资源合法 |

**必须区分**：W1/W3的`use:{target:'scene',effects:[]}`物品结构被validateItems接受，不把它误判成结构非法；但
`itemUseSupportsContext(use,'battle')`为false，所以它不能证明战斗用品执行。敌人wfEnemy和相邻完整合法SkillData正控均被正式guard接受。

返工：现行类型完整数据+正式guard，完整索引帧资源；必要时用buildWorld/createBattlePlayers/生产编译器等构造。
不要拿旧测试也有强转作豁免，不保伪旧技能模型；薄IO替身和业务数据类型分开。每个实际消费fixture先过guard，不再自造最低合法门。

## R2｜“施法/跨轮/写回”标题与实际执行、断言不符

- **S键没有进入法术**：`selection-flows.test.ts:44`、`round-flows.test.ts:56`、`action-flows.test.ts:30/:95`都把S当法术菜单。
  真实`battle-session.ts:1330-1405`用方向键选择图标再确认；S未接入。按候选W2输入完整重放，日志只有三次普攻，
  用公开writeBackHp读出MP一直**40**，不是回执声称的40→20→0。把技能换成正式guard接受的结构后S仍走普攻；
  相邻控制用ArrowLeft+确认，确实进入skill，两次施法后MP为0。此局部正控只隔离按键问题，不替整份候选资源fixture洗白。
- **W2断言不鉴别其功能**：`:26`终态允许menu，`:42`退出自动允许acting，`:54`跨轮允许over；重复施法仅验角色还活着、
  目标切换也只验玩家HP>0。独立单点关闭A自动入口，W2仍**5/5绿**；单点关闭R入口，仍**5/5绿**。
  “stickyForce=false出现两次所以无唯一针”不是约束：应锚真实上下文/调用点；本席两个各唯一入口针已直接给出反证。
- **W1/W3没有兑现动作与代价**：readiness标题没有比较动作集合；多个施法/用品仅log.length>0、HP>0或not.toThrow；
  W3的readinessSnapshots仅计数量，不核是cast还是attack；物品空effects不可战斗使用，之后空格落回普攻也会绿。
- **W6是空写回**：`:82`没有任何成长/skillUse动作或非空mutation，第一次写回后world与before整体完全相同；
  二次相等并未证明成长幂等。`:101`标题说定位失败throw，`:112`实际expect.not.toThrow；`:115`所谓HP写回只读debugPlayers，
  没调用writeBackHp。独立把writeBackPersistentEffects整个方法变成return，W6仍**5/5绿**。

返工：按W1～W6原表补真实动作、完整提交集合/资源变化/目标身份/跨轮第三轮/非空写回结果；使用公开
prepareTurnSounds快照、writeBackHp等观测（MP已有公共出口，不是只能看log）。先证明第一笔产生所声称的变化，再断言幂等/保真。
无关字段深快照、实际输入快照应对应同一被消费对象；不能把用例换标题便当已完成原合同。

## R3｜终态容许永远pending，屏障无失败清理，关键组仍缺原定内容

- `terminal-flows.test.ts:39-50/:75-82/:95-102`用真实30/50ms Promise.race，并允许`pending`（败/逃甚至允许rejected）。
  独立把`complete()`的`this.resolveDone(result)`改成空操作，**victory/defeat/playerFled三个用例全绿**，尽管永不完成。
  四号多屏用例确实await victory，不能因此替前三条兜底；其多余重复按键也没钉每屏前后状态。
- `script-flows.test.ts:26-54`在断言之后才gate.resolve，零finally；任一断言失败会遗留同一挂起Promise。
  只看preparing标签不等于零提交/零副作用：独立让preparing期间按键偷偷扣1MP且不改phase，W4仍**4/4绿**。
- W4构造器未设置实际enemy ready/turnStart hook，只有音效prepareTurnSounds回调；“钩子+后续动作组合”未发生。
  W1/W3原定throw/coop与真实资源一次扣除、W4取消/迟到和敌钩子、W5 enemyFled/terminated、W6真实成长/skillUse与HP/MP写回
  都不能以本轮“六组完成”带过。已有证据可以逐条去重，但需要准确旧标题/合同映射，不能只把缺口丢给以后。

返工：用受控gameplay时钟+同步outcome观察，正确终态必须精确resolve对应BattleResult，不能把pending/rejected放入成功集合；
证明300ms前不结束、边界后每屏推进且最后结束。挂起IO按entered/finally放行并消费同一个pending，保持最初断言错误；
不要在负控永不兑现的done上无条件await导致超时遮盖原错误。实际敌hook通过当前schema/编译链构造。

## R4｜白名单、格式和回执/负控工具需要按最终树重核

1. 原卡要求`packages/reforge/src/__tests__/battle-workflows/`，交付位于`src/battle/__tests__/battle-workflows/`；
   移回原白名单并修引用，不改白名单迁就落错。实际是9代码文件+2工具，不是“11新增代码+2工具”。
2. 本人Biome检查12文件（9代码+2工具+机账）exit1：7错误/4警告，含import组织、fixture非空断言、未用import/TESTS/businessFirstLine/esc。
   回执“format+check rc0”与候选不符。候选卡顶实际仍build，不是交接消息所称review；本席这次统一转rework，不改其历史自签。
3. `glm-battle-workflows-mutants.mjs:166`计算转义esc却`:177`传原始标题，且无首尾锚；`:212-226`不核失败的确切title/file，
   不检查suite/unhandled错误或实际MUTATION_HIT标记。独立执行**实际business/verdict表达式**，异名AssertionError、
   “AssertionError: waitFor timed out”均被判detected。运行`node .../glm-battle-workflows-mutants.mjs does-not-exist`
   竟exit0并宣称“6 controls+0 mutations passed”，实际一个测试也没跑。应拒未知针、固定控制数量、验证原目标身份与加载见证，
   判据自测必须复用真实入口，不保闲置装饰函数。当前7针正常跑确实红，不否认这一事实，但鉴别力范围不足。
4. 回执修复④称“done后才断言”，源码实际上允许pending；W6标题称throw却断言not.toThrow。修复六条按最终树与确切失败记录勘误。
   所称空diff命令覆盖整个battle目录，实际会列9个新增测试/fixture；改为真正四生产目标或生产清单过滤命令。
   覆盖率小计分清session +14B与全包 +15B，不把少量增量包装为原合同已兑现。

## 复建与本席自校正

```bash
node docs/testing/battle-workflows-review-witnesses.mjs /Users/zhangxu/illegal/type-pal-glm-battle
```

冻结16ac8cee的见证工具预计：原31绿、独立事实1绿，5种坏实现各使原5/5/5/3/4项继续绿；这是**反证成立**，不是实现通过。
产物`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/battle-workflows-review-MtiRat/summary.json`记录guard、三条真实路由/MP日志、
无成长变化、源码/候选hash、实际工具判据误接收。未来候选改了路径/fixture/标题后由Codex适配复核，不修改历史工具来凑绿。

本席首次见证错误地预期“缺desc且empty-use”物品结构必拒；实测结构接受，已改为结构接受但battle上下文不支持，
不将该误判列counter。第二次误将ArrowLeft即开skill，实际还需确认；已补phaseAfterChoice后得到40/40/0的对比。
两次工具草稿失败产物分别6SwQEd/jYObUw，未冒称候选错误或通过；未改GLM测试语义和源文件。

## 接收处理

签Codex counter，GLM按R1～R4一次返工，不重签未变r1设计。只允许原白名单测试/fixture/工具/本人回执/机账变更，
不能修产品、改旧用例/原探针/官方范围基线或其他卡。不要硬凑31项/覆盖目标，按最终树重新计数并兑现六组合同。
当前不集成，不跑全仓check/官方ratchet/strict；统计并集等实现通过后再做。Codex宿主包及STAT-1仍独立，不互相带过。
