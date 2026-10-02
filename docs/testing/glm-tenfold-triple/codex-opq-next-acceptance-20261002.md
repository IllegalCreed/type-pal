# O/Q 有限包独立验收与 P 索引接收（2026-10-02）

本次实际独立执行，不把作者报告当验收；[机器证据](codex-opq-next-acceptance-20261002.json)、
[完整原始相位与运行记录](codex-opq-next-acceptance-20261002/)保留。三张700原卡仍 partial/rework，
没有 main 集成、official ratchet/protected-fast、done 或正式覆盖率结算。
原始Vitest JSON字节另存`*.vitest.json.raw.txt`；JSON格式视图仅机械格式化，字段值不变，双SHA见证据目录manifest。

| Owner | 固定真实对象 | 结论 |
|---|---|---|
| O | bd1416933259a6c5fa532d05329d1c33499f4fa8 | 310行/23文件/重建和64旧针再判通过；新解析器与点名分类 counter |
| P | d18f9075724df1fc855b539a82effd0cf9de8cef | 本次纯文本哈希索引修订 accept，74/74；仍18/20流程 |
| Q | 4ec6e0676d398815c96f44cb6c4d475cbe6ad771；测试2d6ced2034fd590c777d6a7b1f56d51d52bb4dd9 | 381全包/24定向/五反控结构通过；四双桥与四敌人输入轴 counter |

本地/远端对象均核匹配，三作者树干净，未向作者树写入。冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380、
派发8b3ca062953b17a12178f8d1a9e36657971234b1不变。隔离树位于自有mkdtemp父目录，
所有产品变异仅在Codex Q副本串行采样并精确恢复；不执行作者固定共享/tmp工具。

## O：本批实际接收与精确 counter

原名单310/310唯一行存在，23/23原测试SHA保持，460案例身份不变；产品/测试/配置零改动。
443 overrides+17保留项重建得到最终contracts.json逐字节相同，空condition为0。
旧反控档案本批零改动，再判64/64通过，判据27例和再判4例自测通过；这不是64次产品变异重放。
根lint3233文件完整0/0/0，docs815 Markdown/4290链接/245任务零问题，716源冻结与786路径白名单、diff通过。

**O-NEXT-01**：test-titles.mjs:98-104新增识别`it(`，但p仍按`test(`长度5推进。
真实输入`it("old contract", () => { expect(1).toBe(1) })`解析结果为0，预期1。
这会漏掉旧MKF等it合同；仅修该证据工具并加真实解析自测，不改产品或测试标题。

**O-NEXT-02**：机器证据requiredExclusions中的精确六行不计净新，原测试/64反控保持：

- MKF负索引：旧mkf.boundaries.test.ts:70-73完整fullName末段「索引越界（-1 与 count）：已定义拒绝且消息含 count」，已精确匹配-1+count；新只匹配out of range。
- worldVariables类型：旧world-variable.boundaries.test.ts:58-84「registry/definition 错型、kind 错型、flag 非布尔、number 非有限各自精确路径」及glm-leaf-wave:28-59已证同入口三拒绝轴和合法number域，改bool/文本数值不产生新合同。
- coveredBy自援护：旧validate-refs.test.ts:940-961「E18-1:coveredBy 指向自己 → warn 不 error;互护合法零 issue」更强。新:799只看message.includes，不断言error；不能虚构新error语义。
- wait安全：旧script-command.guard-residual.test.ts:257-280「四个投影辅助函数的现行合同」已断言wait/ms1=safe，ms100不是新守卫，也不是PAL剧情真值证明。
- stageIndex默认/上限：同旧投影测试:265-273已证默认0及两stage溢出5→1；新99→1仅换数字。
- 零哨兵277：pal-assets.glm-o.test.ts:724-731只读取buildBase自造items，未调用任何产品函数；标fixture-self-check，而非生产哨兵新轴。

作者原295上限扣这六行后**最多289，至少411例未完**；不是289行已全部语义accept。
已经额外扣过的resources.herb=0不重复扣，原160旧证/role cross-check/fixture/pending扣列保持。

**O-NEXT-03**：机器证据mixedRowsToSplit只点名四行，不能继续宣称完整新轴：
sound合成happy报告的sounds/emptySounds/数量/record已由pal-assets.test.ts:620-634同入口更强证明，
first binary顺序若确实有独立未证观察才单列混合子轴，不按363→3换数字领新。
队列基础tie、低dex2、无dex2已由battle-formulas.test.ts:147-162证明，不能仅对照enemy-ai.test称旧队列未测。
新增非零idx透传或第一项字段若旧matcher确实没证，只精确登记该子轴；高dex2行不一刀误删。
不要求删除测试、重采旧64、重填其它已交310行或自行再搜411合同；其它语义与下一真实残余清单由Codex继续负责。

### GLM O 下一步（用户手动选 GLM-5.3 文本）

```text
继续 TEST-GLM-WAVE-O-1，仅闭本次 O-NEXT-01～03 精确合并项，唯一O Owner。原树 /Users/zhangxu/.codex/worktrees/glm-wave-o/type-pal，分支 codex/glm-wave-o-supply-validation-r1，固定 bd1416933259a6c5fa532d05329d1c33499f4fa8。先只读审核根 /Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal 的 O任务卡最新段及 docs/testing/glm-tenfold-triple/codex-opq-next-acceptance-20261002.md/json。310行结构、23测试hash、重建、64再判和静态门已过，不重做整310或旧业务。修 test-titles 的 it( 长度误用5（真实it输入解析0应1），加test/it嵌套与空白引号解析自测，确保原23文件完整身份不变。机器证据 requiredExclusions 精确六行改为五existing-proof+一fixture-self-check：MKF负索引、worldVariables类型、coveredBy自援护、wait安全、stageIndex默认/钳制已由报告列出的旧完整matcher证明；零哨兵277仅读自造fixture无产品调用。撤回自援护error新语义，原resources.herb=0已扣不二扣，净新最多289/缺口至少411。mixedRowsToSplit四行按真实旧全文拆子轴：sound报告计数/record归旧，只有真实未证first-order观察可混合保留；队列基础tie/低dex2/无dex2旧battle-formulas已证，非零idx透传或第一项字段若独立未证只领该子轴，不全新不全删，高dex2不要误删。只改wave-O原证据工具/overrides/ledger/README/receipt，不改任何产品/测试/旧反控原文，不删历史；其余已交310不再返填，不自行找另外411或缩700。重建字节与人工分类一致、64再判/解析自测、最终lint完整0/0/0及docs/diff/verifier，一次提交真实40位SHA推原分支。仅这份有限清单，不main/done/official门/清树；完成后停止作者续做，下一新范围由Codex核定。
```

## Q：实际业务门与五枚独立三态

新14+旧CLI10独立24/24，完整file×fullName×status一致。pal-extract全包63文件381/381，
零pending/todo；候选directed的24条extract案例逐条对应本次实跑，旧147身份/状态全保留、仅加14。
其它两包源/测试/依赖配置相对r19字节无变，2150/2812仅明确复用旧证，不冒称本次新跑；本次三包typecheck重新全零。
根lint3096文件完整0/0/0，docs815 Markdown/4277链接/245任务零问题，716冻结/835白名单与diff过。

第一全包尝试缺副本gitignored原始资产，274叶/4红和4个零叶collection错误均保留，不能说该次绿。
随后从真实工程只读复制raw与extracted/data到独占副本，不运行extract/migrate、不改源码/超时，重跑381全绿。
CLI新14仍完全使用各自mkdtemp合成输入，真实数据只供旧只读测试；不冒称所有业务console为零。

| 针 | 最小产品变异 | 唯一红 fullName | 三态 |
|---|---|---|---|
| GE-EQUIP | 跳过it.scriptOnEquip push | Q-NEXT1-02 item.equip entry | 24绿→23绿1红→24绿 |
| GE-THROW | 跳过it.scriptOnThrow push | Q-NEXT1-03 item.throw entry | 同上 |
| GE-SUCCESS | 跳过sp.scriptOnSuccess push | Q-NEXT1-06 spell.success entry | 同上 |
| GE-BATTLEEND | 跳过eo.scriptOnBattleEnd push | Q-NEXT1-09 enemy.battleEnd entry | 同上；输入合法性暂不接收 |
| GE-FRIENDDEATH | 跳过op.scriptOnFriendDeath push | Q-NEXT1-11 player.friendDeath entry | 同上 |

15相均实际执行，exit0/1/0，无signal/spawn失败，恰一指定业务AssertionError，无collection/runtime红，
完整24身份多重集及源/测试/fixture/配置hash保持。只有cli.ts变异，patch重建SHA与实采一致，
恢复源SHA为424b5513234bdcecc533a240166bd1fbd8159f0825683a1e953aa3dd78624af7。
这些是本批新Codex证据，未改/重采作者旧71；不自动填作者存档配额或冒称整卡accept。

**Q-NEXT-01**：新cli-global-entries.glm-q.test.ts:159-175四处`as unknown as Record<string,number>`违反禁桥。
JSON IO保持unknown，通过实际值守卫收窄（数组、记录、目标存在、数值hook）或直接完整unknown深比较，
不能换成as any/never、另一单断言跳板或补产品接口。all/enemies的未核JSON形状也不要靠断言伪装。

**Q-NEXT-02**：独立直接运行最终纯fixture和公开parser：DATA敌chunk=70B，解析enemyIds=[0]；
OBJECT398.enemyId=1，referencedEnemyExists=false，见机器inputProof和原始q-input-proof.json。
parsers/enemies.ts:52-54/:89-93、tables.test.ts:607-609与reference/sdlpal/fight.c:516都证明直接索引，
「1-based」不是减一映射。#08/09/10/14四例都引用不存在的id1，enemies.length=1不足以证明合法。
在新fixture内造index0 placeholder+真实index1记录或等价合法引用，assert所引id确实落表且字段一致；
旧工厂/三个旧CLI零改动，不发明产品变换。四例合法性未接收，结构净新上限暂≤156、至少544未完。
修复后Codex按最终hash重新采本五针（仍为五个目标，历史尝试保留不叠加），作者不修或执行旧/tmp工具。

### GLM Q 下一步（用户手动选 GLM-5.3 文本）

```text
继续 TEST-GLM-WAVE-Q-1，仅闭 Q-NEXT-01/02 一次合并修复，唯一Q Owner。原树 /Users/zhangxu/.codex/worktrees/glm-wave-q/type-pal，分支 codex/glm-wave-q-runtime-residual-r1，固定HEAD 4ec6e0676d398815c96f44cb6c4d475cbe6ad771、测试2d6ced2034fd590c777d6a7b1f56d51d52bb4dd9。先只读审核根 /Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal 的Q卡最新段和 docs/testing/glm-tenfold-triple/codex-opq-next-acceptance-20261002.md/json。Codex已独跑381全包/24定向、三typecheck、静态零，并实际采五代表产品针15相，完整24身份/指定单AssertionError/0-1-0/恢复hash结构有效；不用你修工具或重采旧71。只修新两个文件及本批wave-Q证据：readHookTables四个as unknown as Record双桥全删，JSON IO保留unknown并真实guard数组/记录/目标存在/数字hook，或直接完整unknown深比较，all/enemies形状也不靠断言跳板；禁止as any/never、ignore、新接口、扩timeout或核心mock。新fixture DATA敌chunk只有70B→id0，却OBJECT.enemyId=1；公开parseEnemies直接id=index，sdlpal fight.c:516也直接索引不减1，#08/09/10/14目前引用越界。仅新fixture建立index0 placeholder+完整index1敌记录（或等价合法轴），用产物确切id/字段断言引用存在，不能只改长度答案或改旧cli-pipeline工厂。保持14精确fullName、其它10合法输入/全部data/all/shared/scene/stdout oracle、三个旧CLI与旧71字节不变；本轮不扩新合同、不续泛化700。修后新14+旧10、相邻parser/slice、extract末批全包/typecheck及最终lint0/0/0/docs/diff/verifier，准确区分161执行与四未接收轴/最终候选账，一次提交真实40位SHA推原分支。五新针由Codex在最终源/hash重采，作者只保留本次反控待Codex状态，不执行旧共享/tmp生产器、伪报五针或修改旧档案。派发/冻结不变，产品/旧测/配置/真实数据/其它Owner/共享文档只读，D-Q01-1不夹修；不main/done/official门/清树。交这份完整有限清单后停止作者续做，下一新范围由Codex核定。
```

## P：文本索引接受，不扩大视觉结论

固定d18f9075724df1fc855b539a82effd0cf9de8cef只改四份专属文本证据。
74/74跟踪PNG与74项当前索引逐个SHA256匹配，无漏项/多项；旧66项索引逐值原样留superseded。
原PNG、产品/测试/工具/反控零改动，browser-evidence内实际相位/console/result不变，
flows F14/F18相位/console/result不变，只同步截图映射，旧attempt映射原文保留。
根lint2854文件完整0/0/0，docs818 Markdown/4285链接/245任务零问题，716冻结/251白名单与diff过。
本次索引维护accept，不重新拍图或全测；102测试/19活跃针旧验收保留，不是整卡done。
F14保存/重新打开仍host-blocked，F18固定旧P的导航遮挡仍未证完整可达，18/20保持。
没有当前main UI复现/修复主张，不准作者修产品，也不再次派视觉点击。
**无下一位GLM P提示词；无需用户再转P，后续范围与宿主/当前UI核查由Codex承担。**

Vitest技能用于完整执行多重集、断言与收集错误的区分；pnpm技能用于冻结依赖、所属包门禁。
官方coverage未跑，不把上述净新上限或作者百分比当main分支覆盖率。
