# TEST-BATTLE-WORKFLOWS-1 r3：Codex独立接收

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-BATTLE-WORKFLOWS-1 r3 独立接收（2026-09-23 取证 09-24 收口，候选 7a2f1608）：**counter，保持 rework**；不改候选语义不集成不跑统计并集不转 Kimi；设计 r1 保持 r2 已关闭的原五反证/结构/路径/Biome 不重开。

## Scope

- 已核通过不再返工：四生产目标零 diff 白名单内；定向 39/39（10/6/6/8/4/5）+相邻 272/272+全 Reforge 1,453/1,453+TC+Biome 12 文件零；r2 四个坏实现现在全部被候选自身断言抓住（成长漏 magicAttack/限次技能不移除/ready 后丢敌行动/HP 硬写 1 各 39 中 1 AssertionError）；finally 失败注入观察三 true（已消费实际返回同一 pending 保留原错误 cancel 比较日志/队员快照）关闭；新投掷/回退重选/hook wait/敌召唤/变身五用例存在计数吻合；去重表 12 标题逐字一致 12 行号准确；C4 fullName/绝对路径/marker/套件 message/后行 timeout/单针控制已修。

## Execution and assertions

- **N1 C1 三残项**：幂等断言退成同对象自比较：writeback:200 p1After=world.party[0] 是引用非快照 :225-228 比较同一对象——删生产唯一 persistentEffectsWritten 幂等门整包 39/39 仍绿固定成长会再次叠加（修法：首次完整预期与奖励后预期各取独立深快照再比较整个 world 不能用会被被测代码一起改动的别名）；非空库存保真仍是空输入：session-driver:153 固定 inventory: [] 用例没再播种——临时在 writeBackPersistentEffects 入口清空 world.inventory 整包仍绿（p2、money=77 是真正非空正控保留；库存须补合法非空哨兵再深比较并更正回执）；HP≥1 钳制公开可达：battle-core:1182-1186 全队无可战斗成员才判负、battle-player-input:23-31 映射整支队伍不剔 HP0、character.ts:330-333 允许 seedStats.hp=0 且 validateStartWorld 接受——本席两人队伍 p1 HP0 p2 HP100 p2 真实击败敌人 done=victory writeBackHp 写 [1,100]；仅把非 lost 钳制 1 改 0 候选 39/39 仍绿同输入 oracle 立即 [0,100]≠[1,100] 业务红——裁定撤回「不可达」补合法多队员胜利（或逃跑）含阵亡成员回归不改 HP 政策
- **N2 C2 hook wait**：script-flows:87-126 400ms 等待窗内仅看尾音未播和攻击日志为空——单点忽略 selectAction 分支的 pumpScriptExecution 返回值（保留 performAction 泵保护）该用例仍 1/1 绿：动作可以提前提交执行被后层屏障挡住故日志为空（只证「未执行」未证「未提交」）；额外公开 readiness 观察器正反对照（不替换 core 不反射）：正常实现累计 144ms 已交给 prepareTurnSounds 的动作无、坏实现 [[0,{kind:attack,targetEnemyIdx:0}]] 而攻击日志都空 phase menu→acting；用公开准备回调/动作快照钉零提交；恢复后也应钉原先吞掉的按键没有留下多余动作
- **N3 C3 去重映射**：已接受：enemyFled/terminated 真实终态、playerFled/defeat 零结算、合击选择准备快照、core/动画/runtime 各层已有断言、召唤/变身会话接线；仍需补/收窄：battle-session:690-722 合击例 prepareTurnSounds 永久挂起只证选择/冻结不证会话继续执行与只付一次代价（core :2728/:2745/:2790 有代价/队友消费/无效降级但手动写 core.pendingActions 不能说成 BattleSession 无效选择）；battle-core:1048-1108 非法投掷直接塞 pendingActions 证明扣库存前拒绝不证 W1 菜单无效选择；terminated 例 :1284-1314 无 buildSettlement 观察器无零奖励断言不能因标题算已证；enemy-hook-runtime:51-83 不计时可抵扣 runtime 推进不能替代 N2 会话等待输入所有权；不是重写旧专项不扩战斗公式只是不能把层内断言换名成另一层完整合同
- **N4 C4 judge**：mutants:171-174 只检查 messages[0] 首行其余消息只查 timeout——同一 failed 测试的 [AssertionError:…, Error: fixture setup failed] 仍判 detected；:165-184 仅排 runStatus=0 不要求 exit1——exit2 或被杀 null 退出码下也判 detected；直接 AST 提取实际 judge 构造输入复算非平行谓词；修法：每一条 failureMessage 都检查业务异常首行 timeout 继续全行扫描；变异成功必须 exit1 signal/异常退出不算 detected；同一真实 judge 增补反例；回执两小勘误一并闭：净增分支机账写 43 实表 session43+core1 应为 44（仅核算术不重测覆盖率）；驱动器头部写每次精灵也过 guard 实际入口只有 enemies/skills/items actors 在 FromWorld（BattleSprite 仍由默认 catalog 检查）不重开 R1 别声称不存在的逐实参 guard

## Results

- 验证与复建：r3 见证只通过 Vite load 替换候选 11 相关文件前后 hash 一致；工具 0 退出表示取证完成不代表 accept 两公共 oracle 是 Codex 独立用例不计候选 39 项；wait oracle 初稿少一闭合括号产生 0 测试解析错误已修后正控绿/反控 AssertionError 确认不将草稿错误归咎候选；本次未重跑官方门主线 7,826/633 不变。

## Evidence

- 证据路径：本接收正文（quote 保全）；机账/日志根/单针 unknown 复现命令在 quote。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| r3 接收 | 2026-09-23/24 | r2 四反证闭+N1-N4 新反证 | counter（保持 rework） | r2 counter |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy runtime/battle 的 r3 接收回执；固定来源与 source SHA 见下方保全节。

## 原始结论

counter N1 三残项（引用自比较/空库存/HP0 合法胜利 [0,100]≠[1,100] oracle）+N2 未提交≠未执行（readiness 观察器正反）+N3 层内断言换名（合击永久挂起/塞 pendingActions/无结算观察器）+N4 judge messages[0]+exit1 缺失；两小勘误（44 算术/精灵 guard 入口）。

## 当时证据

N1-N4 反证表、readiness 对照表与复建命令在 quote 保全。

## 当前有效性

historical。counter 由 r4/r5 递进闭合。

## 继任文档

当前结论归 TEST-BATTLE-WORKFLOWS-1 完成卡。

## 原文保全

固定源 revision `aebc1cb249a606a5202a7f00247c099dace0b2eb`，source SHA `521732ee9bdce953a51985c98abb5771da987a40b80ea8055ae2f725ebd23b9e`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-BATTLE-WORKFLOWS-1 r3：Codex独立接收
>
> 2026-09-23取证、2026-09-24收口，候选 **7a2f1608**。结论：**counter，保持rework**；不改候选语义，不集成、不跑统计并集、不转Kimi。
> 设计r1保持，r2已关闭的原五反证/结构/路径/Biome不重开。
>
> 入口：[任务卡](../../../../../ops/archive/tasks/done/TEST-BATTLE-WORKFLOWS-1-session-flows.md)、[r2反证](battle-workflows-r2-review.md)、
> [r3独立见证](../../unresolved-tools/battle-workflows-r3-witnesses.mjs)、[机账](battle-workflows-r3-evidence.json)。
> 本席复用已脱离旧分支的`/Users/zhangxu/illegal/type-pal-battle-review`，核干净后切到候选detached HEAD，
> 没有恢复已清理分支；GLM原工作树未修改。
>
> ## 已核通过，不再返工
>
> - 四生产目标对57dda7ed零diff，原r1/r2见证零diff，现行提交白名单内。
> - 定向**39/39**（10/6/6/8/4/5）、相邻**272/272**、全Reforge**1453/1453**、TC exit0、Biome12文件零诊断。
>   GLM工具**6正控+10针**exit0；单针模式真实1正控+1针，未知针exit1。
> - r2四个坏实现现在全部被候选自身断言抓住：成长漏magicAttack、限次技能不移除、ready后丢敌行动各使
>   39项中1项AssertionError；HP硬写1使W6中1项AssertionError。首次成长8字段、技能移除、行首行动者确有改进。
> - finally失败注入观察：`originalFailure=true, settledAtBodyExit=true, settledAfterObserverConsumes=true`。
>   已消费实际返回的同一个pending并保留原错误；cancel也比较日志/队员快照。此点关闭，不再追r2同一问题。
> - 新投掷、回退重选、hook wait、敌召唤/变身五个用例确实存在，五个增量和39项计数吻合。
> - 去重表12个标题全部与仓内标题逐字一致，12个行号也准确；不再以“没给精确标题”counter。
> - C4的fullName锚定、绝对路径相等、本针marker、套件message/后行timeout拒绝、单针控制数已修。
>   直接执行候选真实judge，旧错suite/错文件/他针marker/套件错误/后行timeout反例均invalid。
>
> ## N1｜C1仍有三个明确残项
>
> ### 1. 幂等断言退成同一对象自比较
>
> `writeback-flows.test.ts:200`的`p1After = world.party[0]`是引用，不是快照；`:225-228`第二次写回后
> `expect(world.party[0]).toEqual(p1After)`在比较同一个对象。删除生产唯一
> `if (this.persistentEffectsWritten) return`后，**整包39/39仍绿**，固定成长实际会再次叠加。
>
> 首次8字段正确与exp/money奖励保留的改进有效，但不能据此说第二次成长不重复。
> 修法：首次完整预期/奖励后的预期各取独立深快照，再比较整个world，不能用会被被测代码一起改动的别名。
>
> ### 2. “非空库存保真”仍是空输入
>
> `writeback-flows.test.ts:173`及回执说money/库存非空；`session-driver.ts:153`实际固定`inventory: []`，
> 用例没有再播种库存。临时在writeBackPersistentEffects入口清空world.inventory，**整包39/39仍绿**。
> p2、money=77是真正非空正控，此部分保留；库存须补合法非空哨兵再深比较，并更正现有回执。
>
> ### 3. HP≥1钳制公开可达，“HP0即判负”域论证不成立
>
> 生产`battle-core.ts:1182-1186`是**全队无可战斗成员才判负**；`battle-player-input.ts:23-31`映射整支队伍，
> 没有剔除HP0队员。`character.ts:330-333`允许合法seedStats.hp=0；正式validateStartWorld也接受该输入。
>
> 本席用候选合法factory与公开tick复建：两人队伍，p1初始HP0、p2初始HP100；p2真实击败敌人，done=**victory**；
> 公开debugPlayers仍为`[0,100]`，writeBackHp真实写成`[1,100]`。
> 仅把非lost钳制1改成0，候选**39/39仍绿**，本席同输入oracle立即以`[0,100]≠[1,100]`业务红。
> 没有写私有state或制造非法party。
>
> 裁定：撤回“不可达”，补一个合法多队员胜利（或逃跑）包含阵亡成员的回归；不改当前产品HP政策。
>
> ## N2｜C2新hook wait例只证明“未执行”，未证明“未提交”
>
> `script-flows.test.ts:87-126`在400ms等待窗口内仅看尾音未播和攻击日志为空。
> 单点忽略selectAction分支的pumpScriptExecution返回值（生产`:1290`附近、由紧邻nextSelecting唯一定位），
> 保留performAction的泵保护，**该新wait用例仍1/1绿**：动作可以提前提交，执行被后层屏障挡住，故日志为空。
>
> 额外公开readiness观察器正反对照（不替换core/不反射内部状态）：
>
> | 累计144ms，hook等待400ms | 正常实现 | 同单点坏实现 |
> |---|---|---|
> | 已交给prepareTurnSounds的动作 | 无 | `[[0,{kind:'attack',targetEnemyIdx:0}]]` |
> | 攻击日志 | 空 | 空 |
> | phase | menu | acting |
>
> 正常oracle通过，坏实现oracle由“应无提交、实际1笔”AssertionError检出。用公开准备回调/动作快照钉零提交；
> 恢复后也应钉原先吞掉的按键没有留下多余动作。ready行动者、cancel、finally通过项不重开。
>
> ## N3｜C3去重标题真实，但证明范围仍需对齐
>
> 已经接受的去重：enemyFled/terminated的真实终态、playerFled/defeat的零结算、合击选择的准备快照，
> 以及core/动画/runtime各自层内的已有断言。召唤/变身的新会话接线也接受，不要求重复这些测试。
>
> 仍需补/收窄的映射：
>
> - `battle-session.test.ts:690-722`合击例将prepareTurnSounds永久挂起，只证明选择/冻结动作；不证明
>   会话继续执行合击、只付一次代价。core层`:2728/:2745/:2790`分别有代价/队友消费/无效降级，但不能
>   将手动写core.pendingActions的例子说成BattleSession的无效选择。原W1/W3中剩余的会话闭环须补证。
> - `battle-core.test.ts:1048-1059/:1064-1108`非法投掷例直接向core.pendingActions塞动作，证明扣库存前拒绝，
>   不证明W1菜单无效选择。保留core证明，补会话层或给真正相同调用域的旧证据。
> - `battle-session.test.ts:1284-1314`terminated例确实驱动并检查终态，但没有传buildSettlement观察器，
>   没有零奖励断言；不能因标题有“无奖励”就把该子合同算作已证。enemyFled例`:1405-1426`同样主要证终态与
>   closure排净。若机账要合并声称所有非胜利零奖励，应补精确现有断言或非空结算观察器。
> - `enemy-hook-runtime.test.ts:51-83`验证wait动作输出和cursor提交，不计时；它可以抵扣runtime推进，
>   不能替代N2的会话等待输入所有权。
>
> 本项不是要求重写旧专项，也不扩战斗公式；只是不能把层内断言换名成另一层的完整合同。
>
> ## N4｜C4真实judge仍误收同项混错与异常退出
>
> `glm-battle-workflows-mutants.mjs:171-174`只检查`messages[0]`的首行，其余消息只查timeout，
> 故同一个failed测试的`['AssertionError: …','Error: fixture setup failed']`仍被判**detected**。
> `:165-184`仅排runStatus=0，不要求exit1；相同报告在exit2或被杀的null退出码下也判**detected**。
>
> 这些是直接AST提取**实际judge函数**构造输入复算，不是重写一个平行谓词；正控detected，旧五类错配均invalid。
> 不否定当前10针真实业务红，但“混错完整拒绝”的工具合同尚未满足。
>
> 修法：每一条failureMessage都检查业务异常首行，timeout继续全行扫描；变异成功必须exit1，signal/异常退出
> 不能算detected；同一真实judge增补上述反例。已修fullName/file/marker/单针计数不重开。
>
> 回执另两处小勘误与此轮一起闭：
>
> - 净增分支机账写43，但其表是session43+core1，应为44。本席仅核算术，不重测覆盖率。
> - 驱动器头部写每次精灵也过guard，实际入口只有enemies/skills/items，actors在FromWorld中；
>   BattleSprite仍由默认catalog样本检查。当前数据结构合法已确认，不重开R1；别声称不存在的逐实参guard。
>
> ## 验证与复建
>
> ```bash
> node docs/testing/archive/legacy/unresolved-tools/battle-workflows-r3-witnesses.mjs /Users/zhangxu/illegal/type-pal-battle-review
> ```
>
> 冻结r1/r2工具零改；r3新工具只通过Vite load替换，候选11个相关文件前后hash一致。
> 工具0退出表示取证完成，不代表候选accept。两个公共oracle都是Codex独立用例，不计入候选39项。
> failure-cleanup-observer中的AssertionError是本席故意注入，正确观察到候选已清理/保留原错，不作为失败项。
>
> 基础日志`/tmp/type-pal-battle-r3-{targeted,adjacent,typecheck,full,biome,mutants,single-needle,unknown}.log`；
> GLM全工具产物`bw1-mutants-04JCSf/`、单针`bw1-mutants-7rM95O/`（系统临时目录）。独立见证最终目录见机账。
> 本席wait oracle初稿少一个闭合括号，产生0测试解析错误（`battle-workflows-r3-review-GDgOtq`），
> 已修后以正控绿/反控AssertionError确认，不将草稿错误归咎候选。
>
> 本次没有重跑官方check/ratchet/strict或任何覆盖率并集；主线7826/633不变。
> 保持rework，只追N1～N4；已修四反证及其它关闭项不重开。无Kimi交接，GLM修后再接收。
> 旧版本兼容审查：pass（产品零改、当前合法业务模型；不等于测试实现accept）。
>
<!-- original-source-quote:end -->
