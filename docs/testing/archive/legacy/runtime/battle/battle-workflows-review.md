# TEST-BATTLE-WORKFLOWS-1 r1：Codex独立接收复核

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-BATTLE-WORKFLOWS-1 r1 独立接收复核（2026-09-23，候选 16ac8cee、基点 4872b017、生产冻结 57dda7ed）：**counter，转 rework，不接收实现不合并不更新基线**；设计 r1 保持——本轮问题是未满足已签实现合同不要求新增产品行为或重签方案；GLM 回执/机账/源码在其独立分支未拷贝其不成立结论覆盖本报告。

## Scope

- 已核实通过与边界：工作树干净四生产目标零 diff 无私有反射/核心 mock/视觉操作；本席复跑 6 文件 31/31+battle 相邻 19 文件 264/264+全 reforge 152 文件 1,409+TC exit0；GLM 负控工具复跑 exit0（6 正控+7 钉名各一红）不能替代独立反证；覆盖 config 复用官方选择 before 仅排六文件 1,378→1,409 净 +7L/+11S/+2F/+15B（session +14B、core +1B）不因增量小单独 counter 但不能用「组合回归」掩盖未执行/未断言业务；Biome 实际 exit1 7 errors/4 warnings 并非回执所称 rc0。

## Execution and assertions

- **R1 fixture 不过现行 guard**：catalog:102 attackSkill 非 SkillData 靠 as unknown as 蒙过 TC（正式 validateSkills 拒缺键 cost）；:13 PLAYER_PROFILE castEffectBase=-1（validateBattleSprites 拒非负整数）；writeback:15 wfActor 缺 spriteId 强转（validateActors 首拒）；:40/:70 {} as never 物品（validateItems 拒缺键 id）；:114/session-driver:86 所谓合法门只查少数 id/HP 或 instanceof 未调生产 guard；必须区分：W1/W3 use:{target:scene,effects:[]} 物品结构被 validateItems 接受不误判结构非法——但 itemUseSupportsContext(use,battle) 为 false 不能证战斗用品执行；返工=现行类型完整数据+正式 guard+完整索引帧资源；不拿旧测试强转作豁免不保伪旧技能模型
- **R2 标题与实际不符**：S 键没有进入法术：selection:44/round:56/action:30/:95 都把 S 当法术菜单但真实 battle-session:1330-1405 用方向键选图标再确认——按候选输入完整重放日志只有三次普攻 MP 一直 40 非回执称 40→20→0；相邻控制 ArrowLeft+确认两次施法后 MP 0（此正控只隔离按键问题不替整份 fixture 洗白）；W2 断言不鉴别：:26 终态允许 menu/:42 退出允许 acting/:54 跨轮允许 over；单点关 A 自动入口 W2 仍 5/5 绿、关 R 入口仍 5/5 绿（「无唯一针」不是约束应锚真实调用点本席两针已给反证）；W1/W3 没兑现动作与代价（readiness 不比动作集合仅 log.length>0/HP>0/not.toThrow；物品空 effects 空格落回普攻也绿）；W6 空写回（:82 无任何成长动作第一次写回后 world 与 before 完全相同；:101 标题 throw :112 实际 not.toThrow；:115 只读 debugPlayers 没调 writeBackHp；把 writeBackPersistentEffects 变 return W6 仍 5/5 绿）
- **R3 终态与屏障**：terminal:39-50/:75-82/:95-102 用真实 30/50ms Promise.race 允许 pending（败/逃甚至允许 rejected）——独立把 complete() 的 resolveDone 改空操作 victory/defeat/playerFled 三用例全绿尽管永不完成；script:26-54 在断言之后才 gate.resolve 零 finally 任一断言失败遗留挂起 Promise；只看 preparing 标签不等于零提交——独立让 preparing 期间按键偷扣 1MP 不改 phase W4 仍 4/4 绿；W4 构造器未设实际 enemy ready/turnStart hook 只有音效回调；W1/W3 throw/coop 与真实资源一次扣除、W4 取消/迟到和敌钩子、W5 enemyFled/terminated、W6 真实成长都不能以「六组完成」带过；返工=受控 gameplay 时钟+同步 outcome 观察：正确终态精确 resolve 对应 BattleResult 不能把 pending/rejected 放成功集合；证明 300ms 前不结束边界后每屏推进；挂起 IO entered/finally 放行并消费同一 pending 保持最初断言错误
- **R4 白名单/格式/工具**：原卡要求 __tests__/battle-workflows/ 交付位于 src/battle/__tests__/（移回不改白名单迁就落错）；实际 9 代码+2 工具非「11 新增代码+2 工具」；Biome 12 文件 exit1 7 错 4 警（回执「rc0」与候选不符；候选卡顶实际仍 build 非交接所称 review 本席统一转 rework 不改历史自签）；mutants:166 计算转义 esc 却 :177 传原始标题无首尾锚；:212-226 不核确切 title/file/suite/unhandled/MUTATION_HIT——独立执行实际 business/verdict 表达式：异名 AssertionError 与 waitFor timed out 均判 detected；未知针 does-not-exist 竟 exit0 宣称「6 controls+0 mutations passed」实际零测试；回执修复④称 done 后才断言源码实际允许 pending；W6 标题 throw 却 not.toThrow；所称空 diff 命令覆盖整个 battle 目录会列 9 新增文件；覆盖率分清 session +14B 与全包 +15B

## Results

- 复建与本席自校正：冻结见证工具预计原 31 绿+独立事实 1 绿+5 种坏实现各使 5/5/5/3/4 项继续绿（反证成立非实现通过）；本席首次见证误预期「缺 desc 且 empty-use」必拒——实测结构接受已改为结构接受但 battle 上下文不支持不将误判列 counter；第二次误将 ArrowLeft 即开 skill 实际还需确认已补 phaseAfterChoice 得 40/40/0；两次工具草稿失败产物未冒称候选错误或通过。

## Evidence

- 接收处理：签 Codex counter GLM 按 R1-R4 一次返工不重签设计；只允许原白名单变更不能修产品/旧用例/原探针/官方范围基线/其他卡；不硬凑 31 项按最终树重新计数兑现六组合同；当前不集成不跑全仓门；Codex 宿主包及 STAT-1 独立不互相带过。
- 证据路径：本复核正文（quote 保全）；见证工具复现命令/产物路径/日志根在 quote。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| r1 接收 | 2026-09-23 | R1-R4 四类反证+五坏实现 | counter→rework | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy runtime/battle 的 r1 接收回执；固定来源与 source SHA 见下方保全节。

## 原始结论

counter R1-R4：fixture as unknown 蒙 guard/S 键未接法术 MP 恒 40/W2 断言不鉴别（关 A/R 入口仍绿）/W6 空写回（writeBackPersistentEffects 变 return 仍绿）/终态容 pending（resolveDone 空操作全绿）/屏障后 resolve 零 finally/Biome 7 错非 rc0/判据异名与 timeout 误收+未知针 exit0。

## 当时证据

R1-R4 反证表、复建命令与自校正记录在 quote 保全。

## 当前有效性

historical。counter 由 r2-r5 递进闭合。

## 继任文档

当前结论归 TEST-BATTLE-WORKFLOWS-1 完成卡。

## 原文保全

固定源 revision `aebc1cb249a606a5202a7f00247c099dace0b2eb`，source SHA `fd9a80c01edc196f5a287e6e5ec1d017660768085b8af8d21476d38e37df7720`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。

<!-- original-source-quote:start -->
> # TEST-BATTLE-WORKFLOWS-1 r1：Codex独立接收复核
>
> 2026-09-23，候选 **16ac8cee**，基点4872b017，生产冻结57dda7ed。结论：**counter，转rework，不接收实现、不合并、不更新基线**。
> 设计r1保持；本轮问题是未满足已签实现合同，不要求新增产品行为或重签方案。
>
> 入口：[任务卡](../../../../../ops/archive/tasks/done/TEST-BATTLE-WORKFLOWS-1-session-flows.md)；[独立见证工具](../../unresolved-tools/battle-workflows-review-witnesses.mjs)；[机账](battle-workflows-review-evidence.json)。
> GLM回执/机账/源码位于其独立分支`codex/glm-battle-workflows-r1`、工作树`/Users/zhangxu/illegal/type-pal-glm-battle`，未拷贝其不成立的结论覆盖本报告。
>
> ## 已核实通过与边界
>
> - 工作树干净，远端与本地候选一致；四个生产目标对57dda7ed逐文件零diff，未发现私有反射/核心mock/视觉操作。
> - 本人复跑：6文件31/31、battle相邻19文件264/264、全reforge152文件1409/1409、TC exit0。
> - GLM负控工具原命令本人复跑exit0，确实是6组正控+7针，其当前钉名case各一项失败；这不能替代下面的独立反证。
> - GLM覆盖config复用官方fast选择/全部生产include，before仅排本批六文件。现有/tmp产物1378→1409，路径集合与每文件四维分母相同；四目标数据吻合，净+7L/+11S/+2F/+15B，其中session只有+14B、core+1B。不因增量小单独counter；但不能用“组合回归”掩盖未执行/未断言的业务。
> - **Biome实际exit1：7 errors/4 warnings**，并非回执所称rc0。定向/相邻/TC/全包/格式/负控原日志均在`/tmp/type-pal-battle-intake.eJQVXK/`。
> - 候选源文件未改；反证通过临时Vite load替换，仅写/tmp。GLM是测试贡献者，不作为独立第三方自证。
>
> ## R1｜fixture没有过现行guard，自己写的“合法门”不能替代生产校验
>
> | 候选锚点 | 直接反证 |
> |---|---|
> | `catalog.ts:102` attackSkill | `mpCost/target:'enemy'/power/kind`不是当前SkillData；靠`:111 as unknown as SkillData`蒙过TC。正式validateSkills拒绝“缺键cost” |
> | `catalog.ts:13` PLAYER_PROFILE | castEffectBase/attackEffectBase=-1；正式validateBattleSprites拒“castEffectBase期望非负整数” |
> | `writeback-flows.test.ts:15` wfActor | 缺spriteId等当前字段，强转ActorDef；正式validateActors首先拒“缺键spriteId” |
> | `writeback-flows.test.ts:40/:70` `{}` as never物品 | 正式validateItems拒“缺键id”；库存还存在未建定义的id |
> | `catalog.ts:114`、`session-driver.ts:86`所谓合法门 | 只检查少数id/HP或instanceof，未调用生产guard；loadedBattleSprite还用空对象帧+强转资源类型，不能说目录/资源合法 |
>
> **必须区分**：W1/W3的`use:{target:'scene',effects:[]}`物品结构被validateItems接受，不把它误判成结构非法；但
> `itemUseSupportsContext(use,'battle')`为false，所以它不能证明战斗用品执行。敌人wfEnemy和相邻完整合法SkillData正控均被正式guard接受。
>
> 返工：现行类型完整数据+正式guard，完整索引帧资源；必要时用buildWorld/createBattlePlayers/生产编译器等构造。
> 不要拿旧测试也有强转作豁免，不保伪旧技能模型；薄IO替身和业务数据类型分开。每个实际消费fixture先过guard，不再自造最低合法门。
>
> ## R2｜“施法/跨轮/写回”标题与实际执行、断言不符
>
> - **S键没有进入法术**：`selection-flows.test.ts:44`、`round-flows.test.ts:56`、`action-flows.test.ts:30/:95`都把S当法术菜单。
>   真实`battle-session.ts:1330-1405`用方向键选择图标再确认；S未接入。按候选W2输入完整重放，日志只有三次普攻，
>   用公开writeBackHp读出MP一直**40**，不是回执声称的40→20→0。把技能换成正式guard接受的结构后S仍走普攻；
>   相邻控制用ArrowLeft+确认，确实进入skill，两次施法后MP为0。此局部正控只隔离按键问题，不替整份候选资源fixture洗白。
> - **W2断言不鉴别其功能**：`:26`终态允许menu，`:42`退出自动允许acting，`:54`跨轮允许over；重复施法仅验角色还活着、
>   目标切换也只验玩家HP>0。独立单点关闭A自动入口，W2仍**5/5绿**；单点关闭R入口，仍**5/5绿**。
>   “stickyForce=false出现两次所以无唯一针”不是约束：应锚真实上下文/调用点；本席两个各唯一入口针已直接给出反证。
> - **W1/W3没有兑现动作与代价**：readiness标题没有比较动作集合；多个施法/用品仅log.length>0、HP>0或not.toThrow；
>   W3的readinessSnapshots仅计数量，不核是cast还是attack；物品空effects不可战斗使用，之后空格落回普攻也会绿。
> - **W6是空写回**：`:82`没有任何成长/skillUse动作或非空mutation，第一次写回后world与before整体完全相同；
>   二次相等并未证明成长幂等。`:101`标题说定位失败throw，`:112`实际expect.not.toThrow；`:115`所谓HP写回只读debugPlayers，
>   没调用writeBackHp。独立把writeBackPersistentEffects整个方法变成return，W6仍**5/5绿**。
>
> 返工：按W1～W6原表补真实动作、完整提交集合/资源变化/目标身份/跨轮第三轮/非空写回结果；使用公开
> prepareTurnSounds快照、writeBackHp等观测（MP已有公共出口，不是只能看log）。先证明第一笔产生所声称的变化，再断言幂等/保真。
> 无关字段深快照、实际输入快照应对应同一被消费对象；不能把用例换标题便当已完成原合同。
>
> ## R3｜终态容许永远pending，屏障无失败清理，关键组仍缺原定内容
>
> - `terminal-flows.test.ts:39-50/:75-82/:95-102`用真实30/50ms Promise.race，并允许`pending`（败/逃甚至允许rejected）。
>   独立把`complete()`的`this.resolveDone(result)`改成空操作，**victory/defeat/playerFled三个用例全绿**，尽管永不完成。
>   四号多屏用例确实await victory，不能因此替前三条兜底；其多余重复按键也没钉每屏前后状态。
> - `script-flows.test.ts:26-54`在断言之后才gate.resolve，零finally；任一断言失败会遗留同一挂起Promise。
>   只看preparing标签不等于零提交/零副作用：独立让preparing期间按键偷偷扣1MP且不改phase，W4仍**4/4绿**。
> - W4构造器未设置实际enemy ready/turnStart hook，只有音效prepareTurnSounds回调；“钩子+后续动作组合”未发生。
>   W1/W3原定throw/coop与真实资源一次扣除、W4取消/迟到和敌钩子、W5 enemyFled/terminated、W6真实成长/skillUse与HP/MP写回
>   都不能以本轮“六组完成”带过。已有证据可以逐条去重，但需要准确旧标题/合同映射，不能只把缺口丢给以后。
>
> 返工：用受控gameplay时钟+同步outcome观察，正确终态必须精确resolve对应BattleResult，不能把pending/rejected放入成功集合；
> 证明300ms前不结束、边界后每屏推进且最后结束。挂起IO按entered/finally放行并消费同一个pending，保持最初断言错误；
> 不要在负控永不兑现的done上无条件await导致超时遮盖原错误。实际敌hook通过当前schema/编译链构造。
>
> ## R4｜白名单、格式和回执/负控工具需要按最终树重核
>
> 1. 原卡要求`packages/reforge/src/__tests__/battle-workflows/`，交付位于`src/battle/__tests__/battle-workflows/`；
>    移回原白名单并修引用，不改白名单迁就落错。实际是9代码文件+2工具，不是“11新增代码+2工具”。
> 2. 本人Biome检查12文件（9代码+2工具+机账）exit1：7错误/4警告，含import组织、fixture非空断言、未用import/TESTS/businessFirstLine/esc。
>    回执“format+check rc0”与候选不符。候选卡顶实际仍build，不是交接消息所称review；本席这次统一转rework，不改其历史自签。
> 3. `glm-battle-workflows-mutants.mjs:166`计算转义esc却`:177`传原始标题，且无首尾锚；`:212-226`不核失败的确切title/file，
>    不检查suite/unhandled错误或实际MUTATION_HIT标记。独立执行**实际business/verdict表达式**，异名AssertionError、
>    “AssertionError: waitFor timed out”均被判detected。运行`node .../glm-battle-workflows-mutants.mjs does-not-exist`
>    竟exit0并宣称“6 controls+0 mutations passed”，实际一个测试也没跑。应拒未知针、固定控制数量、验证原目标身份与加载见证，
>    判据自测必须复用真实入口，不保闲置装饰函数。当前7针正常跑确实红，不否认这一事实，但鉴别力范围不足。
> 4. 回执修复④称“done后才断言”，源码实际上允许pending；W6标题称throw却断言not.toThrow。修复六条按最终树与确切失败记录勘误。
>    所称空diff命令覆盖整个battle目录，实际会列9个新增测试/fixture；改为真正四生产目标或生产清单过滤命令。
>    覆盖率小计分清session +14B与全包 +15B，不把少量增量包装为原合同已兑现。
>
> ## 复建与本席自校正
>
> ```bash
> node docs/testing/archive/legacy/unresolved-tools/battle-workflows-review-witnesses.mjs /Users/zhangxu/illegal/type-pal-glm-battle
> ```
>
> 冻结16ac8cee的见证工具预计：原31绿、独立事实1绿，5种坏实现各使原5/5/5/3/4项继续绿；这是**反证成立**，不是实现通过。
> 产物`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/battle-workflows-review-MtiRat/summary.json`记录guard、三条真实路由/MP日志、
> 无成长变化、源码/候选hash、实际工具判据误接收。未来候选改了路径/fixture/标题后由Codex适配复核，不修改历史工具来凑绿。
>
> 本席首次见证错误地预期“缺desc且empty-use”物品结构必拒；实测结构接受，已改为结构接受但battle上下文不支持，
> 不将该误判列counter。第二次误将ArrowLeft即开skill，实际还需确认；已补phaseAfterChoice后得到40/40/0的对比。
> 两次工具草稿失败产物分别6SwQEd/jYObUw，未冒称候选错误或通过；未改GLM测试语义和源文件。
>
> ## 接收处理
>
> 签Codex counter，GLM按R1～R4一次返工，不重签未变r1设计。只允许原白名单测试/fixture/工具/本人回执/机账变更，
> 不能修产品、改旧用例/原探针/官方范围基线或其他卡。不要硬凑31项/覆盖目标，按最终树重新计数并兑现六组合同。
> 当前不集成，不跑全仓check/官方ratchet/strict；统计并集等实现通过后再做。Codex宿主包及STAT-1仍独立，不互相带过。
>
<!-- original-source-quote:end -->
