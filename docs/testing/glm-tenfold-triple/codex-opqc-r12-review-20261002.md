# O r11-b1 / P r11 / Q r12 / Cursor r4独立复核（2026-10-02）

用户先报告GLM三路返工完成，再追加Cursor完成，本轮固定四路一起复核。
**四张原卡仍counter/rework；有实质关闭项，但都不是整卡done。**
只列当前未闭项，旧工具/typed/等待/已验视觉不重开；Grok此前代码证据accept保留。

| Owner | 固定本地/远端HEAD | 测试/证据锚 | 本轮实际独立测试 |
|---|---|---|---|
| O | `a295f42c09cb8c6272849adb7d86c96beb16040f` | `59cc687ba6723183c5803781d6113dda187ed5cb` | 新migrate702全绿；content1429/shared154整包字节不变，明确复用原独立报告 |
| P | `31995d09260ad7361df9902d692fbe5b86ad347e` | `24ca4de4f007377d3bc9f1bd7692fec0285d0570` | 新定向+相邻121/121，P86身份匹配 |
| Q | `08ddbf064c1c3368cf6f5ee7f54987cff6e3f59d` | `1c752fc20478a6262663e23bf559fa5e6422d3f5` | 新game定向相邻158/158、extract363；未变Reforge2150整包明确复用 |
| Cursor | `e3bcc779d52a8e3ed2a1a9b2ceb3c3fe1e1c3db4` | `967ec2f8e3f7c17c2a191617deaeb09665b65857` | 新定向+相邻728/728，717身份匹配 |

对象真实、作者树均干净。O/P/Q派发`8b3ca062953b17a12178f8d1a9e36657971234b1`，
Cursor派发`0704d3de6d3d2a2099475a42f601b654bba08579`，生产冻结
`3ac9a2e2f6aba8a5cc97640c18fef8549d199380`不变。证据锚之后均仅本波docs/receipt。
本轮**未新跑Editor全包或game全包**；作者全包摘要不替代独立门。已确定semantic/ledger
counter，比例复核不重复耗时重门，也不把定向绿说成完整门绿。
四路typecheck、lint/格式完整error-warning-info=0/0/0、docs/diff/verifier过。
lint文件数O3233/P2826/Q3041/Cursor3272；716全局冻结及Owner交集0通过。

## O：生产caller修正接受，调查现在给出旧正文裁决

merge/transaction及纯核的caller改成生产链/真实公开入口，source有条件行区，
尾增+对侧改字段主标题恢复实际条件；65/63/9摘要纠正，migrate702全包口径关闭。
**不泛签75行全部已完成真账**：其余410空条件/247 token旧锚仍在，未新增执行用例。

### O-R12-01 两枚反控因标题变化而过期

65存档的原源/恢复/重建mutant hash和三相结构都对应，但O02-CC1/O02-CC3存档中的
passed邻居仍是旧标题，当前directed/新全包已经改名，完整file×fullName多重集合不同。
所以当前与最终树对应**63/65**；其它63不重采。不能机械改写旧raw/JSON冒充重跑。
先固定最终诚实标题，再仅重采这两针三相。

新标题括号还说“单侧真重排必冲突由旧:318证”，旧`:318`实际是**双方不同重排**。
Codex只读公开merge探针：合法三场景、ours单侧重排、theirs=base，实际conflicts=[]。
撤回该附加主张，不修产品、不把它立成新机制；不影响已核尾增/改字段正控方向。

### O-R12-02 project-io至少六条existing-proof，不需再等Codex逐行许可

直接读`migration-project-io`旧正文后确认：

| 当前glm-o合同 | 实际旧证明 |
|---|---|
| scene index登记正文并入托管集 | boundaries“合法scene index正控…”完整seed+scene集合；旧test“只发现index明示引用…” |
| scene index坏JSON精确拒绝 | boundaries同例坏JSON段，精确同错误字符串 |
| 托管正文坏JSON拒绝 | glm-next-wave“托管正文坏JSON fail-loud并携带cause…”；更强消息+cause断言 |
| 未改动snapshot默认目标集通过 | boundaries`:98-99`恢复原字节后默认调用not.toThrow |
| Set复制不别名 | boundaries`:82-89`改入参managed后snapshot不变；新toEqual(Set)不证明插入顺序 |
| 非托管过滤managed/excluded | boundaries`:101-111`真实两类排除与精确剩余keys；旧test显式manifest/二进制排除 |

这些不能换文件名/输入数字重算新合同，按existing-proof扣列或删重。485执行扣原herb
cross-check再扣六条，**净新结构上限≤478、缺口至少222**，仍待全域排重。
mixed轴保留真正未证部分并准确收窄，不因此一刀切删整个project-io域。
scripts/chunks发现/拒绝在旧boundaries已明确退役排除，不能未经当前canonical caller
证明重新记作当前新合同；保留历史，不恢复产品兼容。

作者receipt仍将remoteFinalCandidate写成41位
`5bb92b72cc5edb0ae4f668d6f6163312417fa935b`；真实已锁HEAD见表。
随正常批次用rev-parse/cat-file同步即可，不再只交pin修订轮。
按裁决继续project-io/write-plan/plan真账及其它合法深域，不能把“上下文不足/待裁决调查”当整卡完成。

## P：新增8例fixture都未通过公开准入

### P-R12-01 新P03b重建合法输入与真实空源

Codex直接编译候选未改helper，再真实调用公开ScriptEditSession：

- npc：缺initialPage，报`scenes[0].entities[0].initialPage: 期望非空字符串`。
- hostile：只有e2却选择s001/e1，onLose与shared都悬空。
- zone/empty：仍有shared库selection到不存在的e1。

四种共同factory状态都拒收，新增8例当前不得计入合法新交付；单纯TS通过不代替作者校验/引用闭包。
已有P03合法cursor/准入修复不回退，问题仅本次新P03b。
“无任何引用来源”例的state其实有1个shared命令：真实visits生成behavior索引size1；
作者手传[]得到0，证明的是丢失输入，不是真空来源。用合法空shared/空scene或真实无引用命令，
并消费真实collect结果，不手工删走访来造空。

诊断修复副本已证明可行：npc加initialPage、hostile补合法e1同行、zone/empty清悬空shared，
四种公开准入都通过；这仅是**内存诊断副本，不冒称候选已修**。common helper返回前真实准入，
无需改生产接口/类型或造新机制。

### P-R12-02 新oracle/真账仍虚，旧完整oracle有回退

G16“同键按序追加”只断言length>=2和some(command)，没有顺序oracle；标题use:command
也不是产品字段，实际use为select-behavior。诚实收窄或断言真实完整顺序与use，不改产品枚举。
shared owner/body旧`script-editor.test.ts:871-890`已整串toEqual，G15-04须逐条件对照；
“无旧直测”不替代读取消费该collector的旧断言。
账仍多“同fixture/测试调用”；G15-01停在toContain(，G16只isDefined/长度，
且旧P01-G08-02、P01-G08-04等从完整字符串回退为toThrow(、toEqual([，
P03-G14-04又停在toBe(。不能仅把前缀改“完整断言”就认为完整。
保留旧核定值，完整matcher+expected及所有必要业务oracle必须来自最终代码。

86执行不等于86已接收合法新例；新增8当前不接收，**合法性结构上限≤78、缺口至少622**。
14活跃针三态与最终源仍对应、原证据未变；C13仍明确退役历史，不重判失效、不重采。
18/20视觉/F14-F18未完、36反控目标缺口及原700/70组不缩；其它合法余族继续。

## Q：描述修订关闭，新音频批仍不合法/重复

FP3索引axis和尾标8+6注释已纠正，literal-only已核合法流、旧slot/投影/CLI/61针不重开。
66三态结构/hash/指定单红都匹配，61原组业务原证据未变+5新；**结构有效不等于合法净新**。

### Q-R12-01 两个fizzle例用越界脚本+mock造失败

实际commands只有1条end，却scriptOnUse=42；vi.fn直接把gs.fScriptSuccess置false。
即使产品接口注释允许unit mock，也不构成本卡允许mock业务核或非法script entry的许可。
Codex换真实runScript并保留原输入：明确warn“ip42越界”，fScriptSuccess仍true，
playMagicAnim数量1，不是标题所说合法fizzle。

无需扩产品或跑剧情：已独立验证合法合成`[end, raw0x41, end]`、entry1、真实runScript：
无warning、fScriptSuccess=false、动画0、sound9→pendingSounds[9]，sound0→无队列。
用这个公开路径/等价合法脚本修两例，spy只能call-through，不直接手置失败旗子。
随后只重采受影响的新FZ针；旧61不动。

### Q-R12-02 另两个enemy例已经旧直接证明

- 新“敌方无gs脚本照跑/动画”只检查called与some动画；旧actions.test
  “敌人cast→不扣MP+仍emit+仍runScript”`:1859-1894`无gs、精确单动画及callback次数/ctx，更强直证。
- 新“未建链敌施法音47即时回落”已由M6旧`:1297-1342`的enemy.cast音62+效果音55完整数组直证；
  sound值换47、effect音变0不是不同条件。旧例注释已明确未建链路径。

这两例转existing-proof/删重，相关FZ3/FZ4/FZ5保留历史不计新目标。
文件头说数字缓冲残余，但本文件没有数字oracle，撤回未交主张，不发明机制。
140执行/66存档/56执行目标为实数；新增4当前未接收，**合法性结构上限仍≤135、缺口≥565**。
原50有效目标数量已经足，别再为了补针重复旧合同；继续合法Q07/Q08生命周期/Q10隔离CLI与真账。
D-Q01-1继续独立产品draft，无learnedSpells/capture误设轴/剧情/世界后门。

## Cursor：精确kind针关闭，替代排序针仍旧证明

### CURSOR-R4-01 真账未闭，但承认的四旧项不重开

四重复已分类existing-proof、CTR-C05-08转cross-check、分片/完整oracle抽取有改善。
但717行仍**663 oldMatcher none**；433个humanVerified标志不是433条人工独立接受。
enrich-batch-human实际上只匹配共享字符串就设humanVerified=true，保留原new分类。
source片段例如C02-G06-07仍是onViewChange等props类型，不是过滤条件；
410行production字段含harness，不能拿“(harness)”当真实生产caller。
保存工具候选与人工确认的区别，继续逐条件旧正文/源码/caller/oracle真账，不只又交“工具完成”。

### CURSOR-R4-02 精确关系感度accept；CTR-C05-09转旧cross-check

CTR-C08-34改为保持非空但rewrite关系kind。Codex独立旧9+新10：19例18绿、
恰新kind断言1红，旧长度例绿；恢复32控制组全绿、两生产源逐字节HEAD。
**这个未闭精确kind轴现在关闭**，不重复要求其再补针/重拍视觉。

但CTR-C05-09目标C05-G01-02“order0与缺省不同”仍是
`sprite-actions.wave2.test.ts:38-49`“missing orders sort last…”完整数组旧证，原fixture有
order0的action与缺省order的action-2/z。把缺省MAX改0，独立13例中新例+该旧例共2紅，
不是新业务条件。不同label/输入数字不令该守卫变新。
该例与针转existing-proof/cross-check；53执行目标扣四已证旧目标，**净新目标上限≤49，至少缺1**。
717减十四旧证明，**净新结构上限≤703**，还不是700已验收，按完整排重真差额再补例。
53三态结构/hash/patch对应，51旧业务原证据不应全重采；仅源/执行集真变重采受影响针。
已验12流程与23图保持，本轮未重拍或接管浏览器，旧可归属性能提示不冒称console零。

## 收口纪律与证据

[总机器证据](codex-opqc-r12-review-20261002.json)、
[O逐针](codex-opqc-r12-review-20261002-O-counters.json)、
[P活跃/历史逐针](codex-opqc-r12-review-20261002-P-counters.json)、
[Q结构/合法性逐针](codex-opqc-r12-review-20261002-Q-counters.json)、
[Cursor结构/净新逐针](codex-opqc-r12-review-20261002-C-counters.json)。
raw/JSON在`/private/tmp/codex-opq-r12-review.MSN84q`；审查独占detached树，
Cursor诊断变异串行且已逐字节恢复，不与门并发、不写贡献者或真实主工程。
旧版本兼容审查：本轮无产品兼容新增；O历史chunks不作为当前净新，未授权恢复产品兼容。
未UI/会话/模型操作，未main/done/官方ratchet/protected/正式并集覆盖结算，不宣称85%。
只给受影响新组返工；其它原卡合法余族按批连续推进，缺前提仅停受影响组，不全卡等用户搬运。

## 下一位提示词（最终回复同步直接给出，覆盖旧交接）

GLM三份为代码阶段，用户发送前手动选**GLM-5.3**；P余下真实视觉另阶段手动选Flash。

### GLM O

```text
继续TEST-GLM-WAVE-O-1，唯一O Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-o/type-pal、分支codex/glm-wave-o-supply-validation-r1，固定a295f42c09cb8c6272849adb7d86c96beb16040f。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-O-1-supply-validation-tenfold.md最新段及docs/testing/glm-tenfold-triple/codex-opqc-r12-review-20261002.md/json。当前rework：生产caller/条件行与尾增改字段核心标题接受，不重做旧工具。O-R12-01先固定最终诚实标题，撤回“单侧真重排必冲突”未证附言，再仅重采O02-CC1/CC3三相，当前passed邻居fullName过期；其它63原针保留，不改旧日志冒充重跑。O-R12-02按报告六条project-io旧正文裁决直接existing-proof扣列/删重，不再只交调查或等Codex逐行许可；原序Set标题无顺序oracle，chunks退役域不复活。当前485执行/净新上限478/缺口至少222，410空条件/247token真账及原700/60组未完。receipt41位remoteFinalCandidate用真实Git对象同步，随正常续批处理。连续project-io/write-plan/plan逐合同真账与其他批准深域，真实源条件/caller/合法输入/旧完整fullName断言/精确oracle，低于700按真实差额补，不换数字凑数。仅原O新测/fixture/wave-O可写，生产/旧测/配置/baseline/真实数据/其它Owner/共享文档只读；派发冻结不变，CLI只mkdtemp。每批定向相邻/typecheck、推送后继续；源/执行集变仅受影响针重采，末批三包全测/静态0/0/0/docs/diff/verifier/真实完整SHA和未完账。不合main、不done、不官方门、不清原树。
```

### GLM P

```text
继续TEST-GLM-WAVE-P-1，唯一P Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-p-editor-residual/type-pal、分支codex/glm-wave-p-editor-residual-r1，固定31995d09260ad7361df9902d692fbe5b86ad347e。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-P-1-editor-residual-tenfold.md最新段及docs/testing/glm-tenfold-triple/codex-opqc-r12-review-20261002.md/json。当前rework，仅新P03b输入/真oracle：npc缺initialPage，hostile/zone/empty共享库引用不存在e1，公开ScriptEditSession四factory全拒；补合法同行e1和initialPage，zone/empty去悬空shared，helper真实公开准入，诊断副本已经证明四种可合法构造，不补产品字段/不强转绕过。空来源例用真实空state/shared与真实collect结果，不手传[]掩盖实际非空visits。G16按序标题须真实顺序oracle，use实际select-behavior不是command；G15共享owner/body等对照旧完整locator排重。账恢复完整matcher+expected，旧toThrow/toEqual字段不得被首行抽取回退，P03G14-04也补到完整toBe值；保留旧人工核定值，不仅改“完整断言”前缀。86执行新增8当前未接收，合法上限仍78/至少622例缺口，原700/70组/50目标/20流程不缩。旧合法cursor/默认等待/C13历史及14有效针不重开，18流程保留，F14/F18另视觉阶段。修后连续原P02-P10合法余族/真实账，避让Cursor74源；仅原P新测/fixture/wave-P可写，生产/旧测/配置/baseline/真实数据/其它Owner/共享文档只读，派发冻结不变。每批定向相邻/typecheck推送后继续，仅源/执行集变重采受影响针，末批Editor全包/静态0/0/0/docs/diff/verifier/真实SHA与准确未完账。不合main、不done、不官方门、不清树。
```

### GLM Q

```text
继续TEST-GLM-WAVE-Q-1，唯一Q Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-q/type-pal、分支codex/glm-wave-q-runtime-residual-r1，固定08ddbf064c1c3368cf6f5ee7f54987cff6e3f59d。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-Q-1-runtime-residual-tenfold.md最新段及docs/testing/glm-tenfold-triple/codex-opqc-r12-review-20261002.md/json。当前rework只修新音频批：commands仅1条end却ip42/10，mock手置fScriptSuccess不能当合法fizzle。采用真实runScript和合法最小[end,raw0x41,end]/entry1或等价公开脚本；独立实跑已证明无warning、失败旗false/动画0/sound9入队、sound0无队列，不mock业务核、不直接手置旗。另两个enemy no-gs脚本/动画与即时施法音旧actions已有更强直证，existing-proof扣列/删重及相应FZ退役历史保留；不换47/62数字凑新。撤回未交数字缓冲主张。旧61三态/slot/投影/literal-CLI/描述修订已关闭，不重采；仅受新文件/执行集变化的FZ针重采或退役。当前140执行新增4未接收，合法上限仍135/缺口≥565，原50反控数量已足，不继续为凑针重复旧合同。连续Q07/Q08合法typed生命周期/Q10 mkdtemp合成CLI和完整条件/caller/旧断言/oracle账，700/50组不缩，避让Grok46源；game/extract与Reforge分阶段，D-Q01-1不夹修、不learnedSpells/capture误设/剧情/世界后门。仅原Q新测/fixture/wave-Q可写，生产/旧测/配置/baseline/真实数据/其它Owner/共享文档只读，派发冻结不变。每批定向相邻/typecheck阶段推送后继续，末批三包全测/静态0/0/0/docs/diff/verifier/真实完整SHA与未完账。不合main、不done、不官方门、不清原树。
```

### Cursor

```text
继续TEST-CURSOR-ASSET-UI-LARGE-1，唯一Cursor Owner，原树/Users/zhangxu/.codex/worktrees/cursor-asset-ui-large/type-pal、分支codex/cursor-asset-ui-large-r1，固定e3bcc779d52a8e3ed2a1a9b2ceb3c3fe1e1c3db4。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-CURSOR-ASSET-UI-LARGE-1.md最新段及docs/testing/glm-tenfold-triple/codex-opqc-r12-review-20261002.md/json。当前rework：四旧分类/旧C05-08 cross-check/完整oracle改进及C08-34精确kind针已独立关闭（旧9绿，仅新kind红），不重做、不重拍12流程。只闭CURSOR-R4-01～02：663旧matcher none仍待逐条件真账，433 humanVerified标志来自工具共享字符串不等于人工确认，props类型不是实际条件、harness不是生产caller；连续C01-C10读源码/caller/合法输入/旧完整blob fullName matcher/不同axis/精确oracle，保留真实人工值，不只交生成器。新增CTR-C05-09的order0/缺省排序已由sprite-actions.wave2完整数组证明，同patch旧新2红；C05-G01-02及针改existing-proof/cross-check，再补至少1真正不同合法目标，不换数字/拆标题。53执行目标扣四旧cross-check净新上限49，717减十四旧证上限703仍待全量排重，低于700再按真实差额补；原700/70组/50合法新目标/12流程不缩。保留53结构有效原证据，仅源/最终执行集变重采受影响针；74源Owner/派发冻结不变，仅原editor新测/专属fixture/cursor证据可写，产品/旧测/配置/baseline/真实数据/GLM/Grok/共享文档只读。每批定向相邻/typecheck阶段推送后继续，末批Editor全包/静态0/0/0/docs/diff/verifier与真实完整SHA/准确未完账。不合main、不done、不官方门、不清原树或共享临时树。
```
