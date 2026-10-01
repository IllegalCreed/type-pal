# GLM O / P / Q r9 独立复核（2026-10-02）

三卡均 **counter / rework**，不是整卡完成。静态门通过不替代合法输入、排重和业务证明。
未写贡献者树、未操作 ZCode/模型，未合 main、未 done、未执行官方 ratchet/protected fast、未正式覆盖结算。

| 波 | 固定远端/本地候选 | 测试/工具锚与尾段 |
|---|---|---|
| O | `ad468369015a4ec9c4652f3e24de603f77c42b07` | `ee8df0e80ee63591c9805e30237f05410c972d7e` 后仅 receipt |
| P | `fb735c552282cb6e88e32ba30fbe320f11a31d2b` | `cd68684257296ef98ddf9dba020eaee0eea5548d` 后仅 receipt |
| Q | `3593e8db21a2978c934aba31470f73af79b336f9` | `f28bcf1d34c13abebce38e2fbe69e895f6cc8b41` 后仅 receipt |

派发 `8b3ca062953b17a12178f8d1a9e36657971234b1`、冻结
`3ac9a2e2f6aba8a5cc97640c18fef8549d199380` 不变。三树干净，SHA 都是真实 Git 对象，
远端与本地一致；各在本轮 detached 临时副本独立审核。

## 实跑与证据边界

| 门 | O | P | Q |
|---|---|---|---|
| 新全包实跑 | migrate 704 / content 1439 / shared 154，全绿 | Editor 3864 passed + 1 failed = 3865 | pal-extract 362 全绿 |
| 完整不变包复用 | 无 | 无 | Reforge 2150、game 2805：完整包/依赖 shared/content、配置、锁/patch 字节不变；不是本轮重跑 |
| 新 typecheck | 三包零 | Editor 零 | 三包零 |
| 根 lint/格式 | 3215 文件，完整 0/0/0 | 2825 文件，完整 0/0/0 | 3019 文件，完整 0/0/0 |
| docs / 区间 diff / verifier | 全过，760 白名单路径 | 全过，194 白名单路径 | 全过，661 白名单路径 |
| 最终 directed 身份 | 32 文件 / 497，与全包逐身份和状态对应 | 7 文件 / 79，身份对应，但有 1 状态与全包不一致 | 18 文件 / 135，逐身份和状态对应 |
| 判据自测 | 27 过 | 22 过 | 未新增工具自测要求 |

三树 716 生产冻结源/官方 baseline 与白名单零漂移，Owner overlap 0。
复算 **145** 枚存档（O69/P15/Q61）：原源、重建 mutant、restore hash，完整 file×fullName
多重执行集、三相退出/状态和指定单 AssertionError 对应；这只是结构与执行证据复核，
**不是 145 条合法新合同全部 accept，也不冒称重跑全部变异**。
另新跑 Q-FP1～5 完整 15 相；实际原 runner 重放 O01-CC1 / P03-C11 各三相，
通过且 worktree registry 前后相同、审查副本 tracked diff 为空。
没有新视觉：P 仍18/20，F14/F18未证，旧截图不称本轮重拍。

详见[机器总证据](codex-opq-r9-review-20261002.json)及
[O逐针](codex-opq-r9-review-20261002-o-counters.json)、
[P逐针](codex-opq-r9-review-20261002-p-counters.json)、
[Q逐针](codex-opq-r9-review-20261002-q-counters.json)。完整独立报告/raw 仍保存在
`/private/tmp/codex-q-r9-review.z0JzWO`；贡献者三态原始文件在各固定候选内。
本轮无产品改动/兼容分支新增；旧闭合项不因本次 counter 重开。

## O：正常三态已修；新桥、错账与路径身份仍需修

### O-R9-01 完整执行身份仍被截成末两段

`counter-judge.mjs:24,39-40,117,129-131` 的 suffix2 丢掉 package 和上游目录。
直接用 O01-CC1 的真实单红 JSON，把 migrate 改成 content，
实际 judgePhase **与** sameExecutionIdentity 均接受错误包。
另把 numTotalTests 增1、叶执行集不变，仍接受；顶层执行数未与叶集合闭合。
新七枚 spec 仍用短 title fallback，未钉显式完整 target，不能把旧字段迁移当新针政策。
统一只去临时 checkout 前缀、保留完整 packages/包/子路径；执行数按叶闭合，
当前活跃 spec 全部登记完整目标，补真实不同包/深层路径/计数/同尾标题反例。

正常 passed→failed→passed 不再误拒、collection/runtime/raw/signal 拒收、三针退役已关闭。
O01-CC1 实际 runner 0→1→0通过，清理正确；**不要再重采全部62/69针**。
只改判据/登记且业务源、执行身份不变时，原证据可重判保留；业务源/执行集变化才重采受影响针。

### O-R9-02 新增文件又引入六处强转

`ambience-skill.glm-o.test.ts:54,66,79,93,94`：animation / 整体 SkillData 断言及三处 as never；
`rewards-lifecycle.glm-o.test.ts:90`：索引输入 as never。
四个 as never 明确越过 typed fixture 门，另两处能直接声明真实类型，不能靠 typecheck 绿豁免。
用 SkillData/SkillAnimation/SkillEffect 和真实引用索引入参直构，不改旧测试/产品/规则。
原七桥/两 oracle 等旧修复保留，不要求重做。

### O-R9-03 多断言生成器仍串邻例、截断答案、用 token 代排重

本次 contracts 的“非 day id” oracle 串入下一例 isIdentityTint；“非整数结果”串入
下一个 skill 用例 resolved.effects，数组答案还被截成 `[120)` / `[51)`。
source/caller 仍是整文件 import 符号串，而不是条件/生产调用链；旧锚还是 token 最近标题。
`ambience.test.ts:16-45` 已直接覆盖缺/未知/空表与自定义 day、night命中、恒等判定、
t上下界夹取与线性插值；新文件对应 **四整例** 同条件同答案，只换名字/数值，不计新。
“非整数四舍五入”另例有真实 .5→51/52/53 轴，旧中点实际都是整数，**不在这四例删重内**。
先按真实旧 fullName/断言行人工核新增28例，再修整账生成边界，不能只说0模板。

497执行不等于496合法净新；仅已确认四重复就使净新上限 **≤492、缺口≥208**，
还有 fixture/其它合同待复核，不是最终验收数。69存档/67执行目标的结构证据对应，
但不能全称新合同反控。700/60组保留，不为已退役目标重造针、不自行缩围。

## P：有真实增量，但 canonical fixture 和一条全包红未闭合

### P-R9-01 正控 fixture 不能进入 canonical editor

`script-editor.p03.glm-p.test.ts:46-56,117-121` 在实体 behavior 的 stateMachine.idle 上设 entry。
公开 `new ScriptEditSession(editorState())` 独立拒绝：
`scenes[0].entities[0].behaviors.trigger.auto2.flow.machine.states.idle.entry: 只允许 onEnter initial state`。
一手门 `author-script-core.ts:984-986`；“typed”不等于符合 canonical caller。
把 entry.prepare 新轴放到合法 onEnter initial state，完整核 handoff 源/目标 cursor，
fixture 通过真实作者校验和引用闭包；不放宽产品验证、不用双桥/私有后门。

### P-R9-02 一伪证、两明确旧证明，不得算12净新

G13-02 仍 initial=enter-a 且查 enter-a；公开 helper实际只返回 initial 引用。
`refs.every(initial||command)`对**空数组也 true**，没有构造非 initial，更未断言命令存在/initial缺席。
G13-04 坏 commandPath→undefined 已由 `script-editor.test.ts:444-503` 直接证明；
G14-04 状态机正文标签已由同旧例 :488-490 精确整串断言，当前四个 toContain 更弱。
两例登记 existing-proof，不拆标题/换字符再计新；G13-02改成真实条件与精确引用集。
G12-03 的旧测 :334-368 **已有只读 cursorHandoff 后缀断言**，不是“旧测仅重写”；
若保留必须证明新合法 onEnter-entry 容器/locator 轴，不靠只读换名。
G13-01 的旧 hook 测试 :871-904 已验 initial+command 两类完整 locator；
当前新命令只 isDefined，不能据此自称两类 locator 新证明，逐条件排重/补实际未证 locator。
账中“同上”、首初态 oracle 与缺条件行同步修，已修G03真实业务 oracle保留。

### P-R9-03 全包键盘移焦红是未完成门，不是资产缺失

完整 Editor **3864 passed + 1 failed**，红于 Toolbar.glm-p :123；
随后同文件默认门三次均 **4 passed + 1 failed**，分别红于 :117/:119/:123。
产品 `IsometricEditorToolbar.tsx:74` 的 focusOption 用 requestAnimationFrame，
测试 key 只 await act，手工抢焦/空 act 不等待真实帧完成；不能把当下焦点当已稳定。
用正常宿主帧/可观察焦点等待收敛后断言，不强设目标焦点代验、不扩timeout/mock业务/改产品。
这是旧批准用例的新独立门失败，仅重开它的稳定执行项，不撤销G03已收窄业务标题/旧工具结论。

79为执行数；一伪证+两明确重复使净新上限 **≤76、缺口≥624**，合法fixture/其它新增轴仍待核。
17/70组、15存档/15执行目标、18/20流程都是部分，不能收done。
新5针结构三态对应且 C11实际runner通过，但合法正控未闭前不宣称五条新合同全accept。
旧10针/22判据自测保留；fixture/删重影响新文件仅重采相关新5针，Toolbar改动仅重采其旧针。
README当前79却仍67/10绿、40针缺口、P03未开工，receipt旧工具/测试锚和摘要同步区分历史。

## Q：NT8退役关闭；新增管线不是合法正控

### Q-R9-01 MAP/PAT 合成输入依赖非法字节，不接收 C134

`cli-isolated.glm-q.test.ts:228-241,254,450-472` 的 68B“零流”并非合法65536B MAP压缩数据。
提取器实际 re-export shared/yj2；只读仪表副本与原 decoder 输出SHA逐字一致，独立测得：
首个回引在 dst=1 指向 **-4032**，3776次无效回引读；512bit后输入越界，
总 **78874次越界bit读**；内部产出65560（超过声明24），无终止符命中。
删成只有4B header仍得同一65536B输出/hash，证明“成功”来自 undefined经位运算/Uint8Array归零。
primary `reference/sdlpal/yj1.c:387-434` 是真实位流/已产出数据回引、pos=0xfff终止；
不能把当前宽松decoder的越界容忍当格式真值，或继续多填零/固定lower130。

PAT生成768个通道中 **576个>63**，index1=[1,2,254]不是6bit数据。
`resources/palette.ts:4-18`/primary palette.c:79-81：6bit域0..63。
合法 [1,2,63] 同样应为 [4,8,255]，无需固化254的溢出结果。
MAP/GOP的mapNum1对齐、FBP五个目录槽、mkdtemp隔离与exit0/done执行本身成立；
MGO/F/ABC空、FBP空/零长、无BDF只是跳过路径，不泛称非空图形管线被证明。
修成有真实位流/合法回引/正确终止的自包含YJ2 fixture与0..63色板；不改生产decoder/真实数据。

### Q-R9-02 FP2/3实际红在exit，不是声明的tileset/sprite业务轴

五针新重放均 5→5→5执行、0→1→0退出、恰一指定 AssertionError、hash恢复。
但 FP2空 GOP 经 parseMap→parseSpriteChunk DataView越界退出1，**不是非空MAP扫描跳过GOP**；
FP3 ABC新增零长解压块也在parseSpriteChunk越界退出1，**不是合法sprite数量0→1**。
独立真实CLI子进程 stdout/stderr/栈已保留；它们命中的断言均为 exitCode=0。
合法替代：未引用MAP0非空→空可测试scan跳过（不是空GOP）；ABC使用合法YJ2 sprite可触达数量断言。
若选择边界拒绝合同，须如实登记并断言其精确拒绝，不冒称合法正向资源。
修正正控/针轴后仅重采受影响的 **5旧Q10+5FP**，其它51组业务三态不动。

### Q-R9-03 五轴同一目标，55/54错误

FP1～5都是同一 file×fullName；不是五个新目标。索引本身 distinctTargets=51，
README/receipt/quotaNotes却55/54，counterEvidence仍57/50旧数。
正确结构分列：**61存档 / 51不同执行目标 / 净新合同目标上限50**（扣C114/S1-RC4）。
新C134合法性修好后这一真新目标就能补上原49→50，**不要求再造四个标题**。
当前未接收C134：135执行/净新结构上限134；合法性调整后可计上限 **133、缺口≥567**，
当前可认新增合同目标上限49。不是正式净增结算；原700/50组仍未闭。
三态来源按真实差分：**51组业务JSON/raw未变（S1-RC4只补quota元注）+5Q10重采+5FP新增**；
NT8所有历史原证据保留、退出索引，关闭该旧项。旧 typed slot/投影链/默认timeout/NT1～6不重开。
D-Q01-1产品draft另行准入；本轮不夹修宽松YJ2，也不走剧情/世界后门。

## 用户手动交接

三路均是代码阶段，发送前请用户手动选 **GLM-5.3**。只有用户切模型；不恢复Codex UI投递。
P F14/F18留独立视觉阶段，届时用户手动选 **GLM-5.3-Flash**，不让本轮代码模型代看图。
下面提示词同时覆盖旧续派；先修列明项，再持续原卡合法残余，不再只交“窄返工完成”冒称整卡完成。

### 下一位 GLM O 提示词

```text
继续TEST-GLM-WAVE-O-1，唯一O Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-o/type-pal、原分支codex/glm-wave-o-supply-validation-r1，固定ad468369015a4ec9c4652f3e24de603f77c42b07。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/glm-tenfold-triple/codex-opq-r9-review-20261002.md/json与原卡最新段。只闭O-R9-01～03：judge去临时根但保留完整包/子路径与fullName、多重集合及顶层叶计数闭合；新活跃spec登记完整target，补异包/异深路径/同尾标题/假执行数拒收。正常0→1→0、collection/runtime/raw、三针退役已闭，不重做69针；判据/登记变且业务源身份不变可重判保留。新增ambience-skill/rewards-lifecycle六处强转改真实typed直构；四条已证ambience重复登记existing-proof不计新，非整数rounding新轴保留；逐新增28合同核旧fullName/断言行/源条件与生产caller，修串邻例与截数组oracle，整账不得靠token。497执行净新上限不超过492、缺口至少208并待进一步合法性扣列；继续原合法余族，700/60组不缩。派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，仅原O新测/fixture/wave-O；产品/旧测/配置/baseline/真实数据/P/Q/共享文档只读。变动源或执行集仅重采受影响针，每批定向相邻/typecheck阶段推送，末批全包/静态0/0/0/docs/diff/verifier，回执钉真实完整SHA和剩余账。不合main、不done、不官方门、不清树。
```

### 下一位 GLM P 提示词

```text
继续TEST-GLM-WAVE-P-1，唯一P Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-p-editor-residual/type-pal、原分支codex/glm-wave-p-editor-residual-r1，固定fb735c552282cb6e88e32ba30fbe320f11a31d2b。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/glm-tenfold-triple/codex-opq-r9-review-20261002.md/json及原卡最新段。闭P-R9-01～03：P03 fixture实体machine.entry非法，改合法onEnter initial state并核handoff源/目标cursor，公开作者校验/引用闭包须过；G13-02真实非initial+精确非空命令/无initial，去every伪证；G13-04坏路径和G14-04正文标签旧测已直证，existing-proof不计新；G12-03已有旧只读后缀证据，保留须独证合法entry容器/locator新轴，G13-01对照旧完整locator排重。Toolbar默认门全包及单文件3次实红，用真实RAF/可观察焦点收敛等待而非抢焦/空act，不扩timeout、不改产品。旧10针/22自测/G03收窄标题及业务oracle保留，仅P03受影响新5针与Toolbar所属针需重采。同步79执行净新上限≤76/缺口≥624、17组/15存档/18流程与当前锚/历史口径，继续P02残余/P03～P10，不整族缩围。派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，避让Cursor74新合同保留源；仅原P新测/fixture/wave-P，产品/旧测/配置/baseline/真实数据/O/Q/共享文档只读。此为代码阶段，F14/F18另阶段视觉不代看图；每批定向相邻/typecheck阶段推送，末批Editor全包/静态0/0/0/docs/diff/verifier与完整SHA。700/70组/50目标/20流程不缩；不合main、不done、不官方门、不清树。
```

### 下一位 GLM Q 提示词

```text
继续TEST-GLM-WAVE-Q-1，唯一Q Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-q/type-pal、原分支codex/glm-wave-q-runtime-residual-r1，固定3593e8db21a2978c934aba31470f73af79b336f9、测试f28bcf1d34c13abebce38e2fbe69e895f6cc8b41。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/glm-tenfold-triple/codex-opq-r9-review-20261002.md/json及原卡最新段。闭Q-R9-01～03：68B零流靠EOF/负回引归零不是合法YJ2，构造真实自包含位流/合法已产出回引/正确终止的65536B MAP，别加更多零或改生产decoder；PAT通道0..63，合法[1,2,63]仍应[4,8,255]，MAP/GOP/FBP对齐并保持mkdtemp隔离。FP2/3当前只是RangeError→exit1，非声明tileset/sprite数轴，改合法未引用MAP空块/合法YJ2 sprite等真轴或如实边界拒绝合同；五针同一个file×fullName，61/51/净新目标上限50，不是55/54，修好这一新目标就够补旧49→50，不另拆四标题。当前135执行/结构净新上限134但C134未接收，合法性上限133/缺口至少567；更新receipt旧57/50、三态真实51未变+5Q10重采+5FP新增与旧S1仅quota注记。正控源/执行集变动仅重采5旧Q10+5FP，其它未变51业务证据保留；NT8退役/C114扣配额、旧slot/投影/默认timeout/NT1～6关闭不重做。然后持续Q07/Q08 typed生命周期和Q10合法CLI余族，700/50组不缩，避让Grok46保留源。派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，仅原Q新测/fixture/wave-Q；产品/旧测/配置/baseline/真实数据/O/P/共享文档只读；D-Q01-1 draft不夹修，不learnedSpells/capture/剧情/世界后门。每批定向相邻/typecheck阶段推送，末批三包/静态0/0/0/docs/diff/verifier与真实完整SHA。不合main、不done、不官方门、不清树。
```
