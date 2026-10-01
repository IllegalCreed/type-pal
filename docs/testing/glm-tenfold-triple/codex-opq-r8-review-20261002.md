# GLM O r8 / P r3.6 / Q r8 独立复核（2026-10-02）

本轮核的是固定候选，不把作者 PARTIAL 回执当整卡 done。三个远端与本地 SHA 已逐一一致，
未写贡献者树，未操作 ZCode/模型/会话，未合 main、未跑官方 ratchet/protected fast、未正式覆盖结算。

| 波 | 固定分支 tip | 本轮结论 |
|---|---|---|
| O | `5cf74bdd1ae3dd47d953b504362c83697cb5fbb0` | counter；共享 judge 误拒正常三态且漏收 collection；三枚已删目标仍在当前有效索引 |
| P | `2ba6c02303d44f136762b81d1255683893e6c5d9` | G03 结果/标题、共同 raw 和退出政策窄项关闭；原卡仍 PARTIAL，不再循环重修这些项 |
| Q | `7e115b4dd2e59f78a2fbbb4beb535c9085ffeab2` | 投影真账/独立坐标/六新目标关闭；NT8 普通产品异常拒收，旧合同和当前账仍需准确扣列 |

[逐针 hash、执行身份、实跑与复用证据](codex-opq-r8-review-20261002.json)为机器账。
完整逐针明细按波分文件：[O](codex-opq-r8-review-20261002-o-counters.json)、
[P](codex-opq-r8-review-20261002-p-counters.json)、[Q](codex-opq-r8-review-20261002-q-counters.json)；
保留全部身份/原始报告hash，不提高格式工具大小限制或排除证据文件。
原派发 `8b3ca062953b17a12178f8d1a9e36657971234b1`、生产冻结
`3ac9a2e2f6aba8a5cc97640c18fef8549d199380`保持；716/716 源冻结与三个白名单仍通过。
O/P/Q 当前 469/67/134 是执行数，不是已独立接受的净新合同数。

## 验证口径

- 新跑 O content **1411/1411**、Q game **2805/2805**及对应 typecheck 零。
- O migrate **704**、shared **154**及 typecheck，复用 r6 已通过报告：
  两个完整包、锁/配置/质量工具/patches 与本候选逐路径 diff 为空。O 合计 **2269**。
- Q Reforge **2150**复用 r6、pal-extract **361**复用上一轮，并对完整包和相同配置依赖核字节不变；
  二者 typecheck 同口径复用。Q 合计 **5316**。不是重新跑三包，也不把存档 hash 复算叫业务变异重跑。
- P 新跑 Editor **3853/3853**（516文件）及 typecheck 零；67条最终定向身份与全包逐条匹配。
- 根 lint 完整 O **3174**、Q **2999**文件均 **0 errors / 0 warnings / 0 infos**；
  P **2804**文件同样完整 **0/0/0**。三树 docs、区间 diff、verifier 实跑均 exit 0，保留完整日志。
- O/P judge 作者自测各 **22/22**；O 自测绿不等于 runner 可用，下面有正常三态误拒的独立反例。
- 全量复算 **132**枚三态存档：O65、P10、Q57；source/rebuilt-mutant/restore hash、
  file×fullName 多重集合、单目标失败文本/退出/状态逐枚核。不冒称重跑全部132枚。
- Q 新独立业务重放 **10**枚、**30**相：NT1/2/3/4/5/6/8 与 S1-RC1/2/5。
  全部 0→1→0且身份/执行数/hash匹配；NT8 为普通产品 Error，按卡拒收。
  临时树最终 tracked diff 为空、worktree registry 前后相同。
- 无新浏览器取证；P 仍18/20，F14/F18未证。旧截图不冒称本轮重拍。
- 旧版本兼容审查：本轮仅测试/专属证据，无产品兼容分支或 upgrader 新增，pass（非产品行为验收）。
- 审查树证据按波分文件后，最终根 lint **2763文件完整0/0/0**、
  docs **833 Markdown / 4431 local links / 249 tasks**零问题，区间diff零。
  初次整份机器JSON超过格式工具1MiB限制的告警已用分文件消除，未改规则/排除项。

## O：不再接受“唯一 judge 自测绿＝runner 全闭合”

### O-R8-01 三相判据存在确定性误拒/漏收

`counter-judge.mjs:33-49`的 sameExecutionIdentity 在身份比较后强求各例状态完全相同；
`run-counter.mjs`却拿它比较 control↔injected 和 injected↔restored。
正常目标恰应 passed→failed→passed，因此任何有效完整三态到这里都会抛状态漂移。
作者 selftest 把这条正常变化写成拒收例，再以两份相同红状态作正控，未测试正常完整生命周期。

直接 import 实际唯一模块，拿 O01-CC1 已成立的原始 JSON 重放，
两次 identity 调用分别拒收 passed→failed / failed→passed。
另外实际 runner 在独立临时副本上跑 O01-CC1，exit1：
旧 spec.title 是“方案 label 漂移被永久门禁拒绝”，实际目标全文末尾有“（名称漂移）”，
新 endsWith 政策在变异相错误拒收；finally 清理无遗留本次树。
**不能以恢复 title.includes 解决**：用显式完整目标 file/fullName，兼容登记迁移不改变业务答案，
只去掉临时 worktree 前缀、保留完整包/路径。

同一模块在正确完整目标的单红 JSON 叠加
`numRuntimeErrorTestSuites=1`和另一空断言 failed suite 时仍接受：
只 flatten 叶而没有 collection/runtime 总门。真实 unhandled raw 反例现已拒收，
此子项关闭；唯一导入、正常 exit -1/2/signal/spawn 拒收也保留。
补整段合法三态正控 + collection/runtime/身份反例；状态按各相政策判，非跨相强求相同。

### O-R8-02 三枚针目标已删除，退役，不要求重采不存在合同

O08-CC8（无背包件）、O08-CC9（equipableBy 不符）、O09-CC13（空键/collectValue缺省）
目标已从 item-equip 文件删除；三相仍旧9例，最终文件只3例。
**62/65 存档对应最终执行集；剩余三枚只保留历史，不计当前 valid**。
当前62有效存档对应60不同目标，数量仍大于50；无需为了数字重造已证旧合同。
其它62存档本轮未变，hash/patch/执行身份对应，不重采。

### O-R8-03 合同账仍不是逐条件真账

旧六合同删重方向关闭；但 contracts469行仍靠首断言/token最近旧标题。
239行用“token<4→无此旧断言组合”推新；这不是源码条件或断言排重证明。
实际如第2条 oracle 是 `expect(result.conflicts.map(({ type, path }) => ({ ).toContainEqual({)`；
“maps index 并集合并”只有 conflicts=[]，遗漏真正顺序结果
`migration-merge.glm-o.test.ts:115-117`；“单侧重复id invalid-identity”
所引旧 `migration-merge.test.ts:102-110`其实是 add-add，需说明旧未证的具体条件差。
别再整表运行同类 token/首断言生成器；分域人工校验可观察 matcher和值及旧断言条件。

新增显式 resources.herb=0 与旧 `item.ownership.background.test.ts:122-127`的 herb=7
走 `item.ts:796-799`同已定义安全数值读取/输入不变合同，无新业务条件或失败释放轴；
换7为0不能新增计数。保留作 cross-check可以，但不计净新。
469因此最多468净新候选（其它未逐项 accept），缺口至少232。
README仍同时写231/234、194旧门未直接标历史；修最终数，历史另节保留。
工具候选锚 d88a4ef9 与后续只 docs 区间属实，不再开旧空 SHA 项。

## P：窄项通过，转回原卡增量；不继续反复返工判据

G03三条 oracle 现在指提交尺寸、Escape关闭回焦、Home/End/Arrow焦点。
新标题撤回未测 Space，最终定向身份同步；源与执行集改变的C08已重采。
共同 raw 判断由 positive/mutated/restored同用；clean接真实未处理异常 raw 的政策反例拒收；
mutant exit2拒收，正常业务exit1接受。22实际自测通过。
全部10枚 index/patch/源/重建变异/三相业务断言/执行身份对应，10不同目标；
相对上一固定候选本轮10份三态组均有更新。此前 finally、mutant身份、
真实异常和docs目录修复继续关闭。

receipt.sourceSha256 另有三个静态摘要未同步（editor-asset-io、Toolbar与counter.mjs，
实际/登记值见机器账）；不是三态业务源hash错，不要求重跑10针。
下个增量更新receipt时从最终字节重算，避免继续把旧摘要当当前候选。

**P-R36-01 的 G03 业务结果/诚实标题子项、P-R36-02 判据子项 accept**，
不再重采未变10针或重做已关闭工具。逐条件旧锚仍纳入原卡真账待办
（例如G03-01仍“MapMode.test.ts 700”，不是完整旧 fullName/断言锚）。
原卡仍67/700、14/70组、10/50目标，剩余633/56组/40目标；
P03–P10尚未做，不能把窄返工收据叫整卡完成。
F14/F18仍待单独视觉阶段，不让代码模型代看图。

## Q：六新增目标成立；不要为第七枚多余针继续绕圈

Q-R7-01 的 C104～111 实际 blob 已是 pickAutoMagic公开投影/真实输入条件/具体返回值，
不再库存模板，关闭。typed slot、signed-negative不复制、learnedSpells未授权不测保留。
S1首例只保留非空毒残留清零、objectId 440→419两条未证轴，可接受；
两死槽部分复用也保留。旧room0例 C114 已诚实登记 existing-proof，**不计新合同**。

底锚 expected 已改为固定160/80、100/60，不再调用产品helper，关闭自适应oracle项。
旧 `battle-opcodes.test.ts:1460-1479`使用注入ENEMY_POS表；新例缺enemyPos走
`battle-positions.ts:54-64,86-92`已存在fallback，不是换roster顺序重算旧证明。
原版 `reference/sdlpal/battle.c:936-942`证表取值+yPosOffset；
固定fallback常量本身是当前实现约定，不应误称sdlpal硬编码g_rgEnemyPos新机制。

新增 NT1～6为六个此前不同执行目标，未改final测试/拆标题/重用同一目标；
独立完整三态重放通过，可接受这六针数量与业务证据。
全57源/重建hash/三相身份对应；45旧针证据未变、5受影响S1更新+7新。
**56枚满足单业务断言红，50不同执行目标**。
NT8变异直接让 collectReachableEnemyDefs抛
`Error: 敌人 "root" summon 目标 "ghost" 不存在`，
在 expect之前崩出，并非 AssertionError/rejects断言；meta“targetAssertionError”标VALID错误。
它还与Q05-RC3同目标，退役索引即可，无需为冗余针另改答案或补产品。
S1-RC4对应C114旧room0 cross-check，历史反控保留但不得作为新合同目标配额。
若按新增合法合同目标统计，目前最多49，后续合法余族补至少一新目标即可；
“50执行身份”与“50净新合同目标”分列，不反复重打其它未变针。

Q-R8-01剩余为 NT8退役、C114扣列及账同步：
directed134执行中C114不计新，净新上限133，缺口至少567；
receipt仍newCases134，ledger“r7当前”还129/45/17、571/5；
README旧“下一批capture”不应再作当前续派。历史数可留，当前章明确覆盖。
C115分类仍“needs independent oracle 待改”，与已修源码冲突，正常更新即可。
game2805已核，末次候选receipt game门仍待回填；新lint实际2999，不用2971历史数称本次门。
原700/50组保留；没有新机制/产品准入，D-Q01-1仍另行draft。

## 用户手动交接与模型

以下均**代码阶段**：用户发送前在各原会话手动选 **GLM-5.3**。
只有用户切模型，不在提示词要求GLM自主切换，不恢复Codex UI操作。
P F14/F18视觉另阶段：用户届时手动选 **GLM-5.3-Flash**再派视觉，不混入本轮代码。

### 下一位GLM O提示词

```text
继续TEST-GLM-WAVE-O-1，唯一O Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-o/type-pal、分支codex/glm-wave-o-supply-validation-r1，固定5cf74bdd1ae3dd47d953b504362c83697cb5fbb0。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/glm-tenfold-triple/codex-opq-r8-review-20261002.md/json及原卡最新段。只补O-R8-01～03：正常0→1→0身份相同但目标状态应变化，修唯一judge的跨相状态误拒、spec短title误拒，完整目标/完整包路径与collection/runtime拒收；用真实存档及整段合法生命周期正控自测。O08-CC8/9、O09-CC13目标已删，保留历史并退役，不重采或重造；剩余62存档60目标不变保留。旧删重/typed/raw未处理异常/exit拒收与清理已闭合不重做。分域人工真账替代token最近标题与首断言生成器；明确matcher和值、源条件/caller、旧fullName断言锚。资源7→0同条件cross-check不计新，同步净新上限468/缺口至少232、691路径和历史数。然后持续原合法余族，700/60组/50不同合同目标不缩，CLI仅mkdtemp。派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，仅原O新测/fixture/wave-O白名单；产品/旧测/配置/baseline/真实数据/P/Q/共享文档只读。每批定向相邻/typecheck，最终静态0/0/0、全包/docs/diff/verifier后阶段推送完整SHA；不合main、不done、不官方门、不清树。
```

### 下一位GLM P代码提示词

```text
继续TEST-GLM-WAVE-P-1，唯一P Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-p-editor-residual/type-pal、分支codex/glm-wave-p-editor-residual-r1，固定2ba6c02303d44f136762b81d1255683893e6c5d9。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/glm-tenfold-triple/codex-opq-r8-review-20261002.md/json及原卡最新段。G03结果/诚实标题、三相共同raw/exit1政策窄项关闭，10业务针/索引/最终执行集对应；不重做这些工具或未变针。继续原P02合法残余与P03～P10，不再仅交窄返工回执；每域先逐条件核旧fullName和断言行，业务oracle完整matcher和值，补真账而非首初态断言。700例/70组/50不同合同目标不缩，当前67/14组/10针仍部分；避让grok-cursor-large/targets.json中Cursor74保留源的新增主合同。派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，仅原P新测/fixture/wave-P；产品/旧测/配置/baseline/真实数据/O/Q/共享文档只读。此为代码阶段，不启动浏览器或代读F14/F18；20流程目标保留另交视觉。每批定向相邻/typecheck，阶段提交推送，末批Editor全包/静态0/0/0/docs/diff/verifier与完整SHA；不合main、不done、不官方门、不清树。
```

### 下一位GLM Q代码提示词

```text
继续TEST-GLM-WAVE-Q-1，唯一Q Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-q/type-pal、分支codex/glm-wave-q-runtime-residual-r1，固定7e115b4dd2e59f78a2fbbb4beb535c9085ffeab2。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/glm-tenfold-triple/codex-opq-r8-review-20261002.md/json及原卡最新段。投影真账、S1非空毒/对象身份、固定fallback oracle、NT1～6六新目标已关闭，不重做；56存档满足业务单断言红，50执行目标不等于50净新合同目标。NT8普通产品Error非AssertionError，退役保留历史，无需换针；C114room0已证旧合同不计新，S1-RC4历史针不计新配额。同步134执行/净新上限133/缺口至少567、ledger当前口径、C115已修分类/game2805/lint2999与三态来源45旧未变+5S1更新+7新增；后续合法余族至少补一真正新合同目标，不拆标题凑数。继续Q07/Q08 typed已核生命周期与Q10 mkdtemp合成CLI，700/50组不缩；避让Grok46保留源新增主合同。game/pal-extract与Reforge阶段分开，派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，仅原Q新测/fixture/wave-Q；产品/旧测/配置/baseline/真实数据/O/P/共享文档只读，D-Q01-1 draft不夹修，不测learnedSpells/capture误设行、不走PAL剧情/E2E002/世界后门。每批定向相邻/typecheck阶段推送，末批全包/静态0/0/0/docs/diff/verifier和完整SHA；不合main、不done、不官方门、不清树。
```
