# GLM P r10 独立复核（2026-10-02）

固定本地/远端 `43a281325192645ac775f93428c3ba2f788bdd94`，语义测试锚
`3d0c5d6eb79dda704ce56ccb711a9f7d55e6b19f`；之后
`a3a7c390643ef38bbab3f73974c8f51be2d0d43c`含wave-P证据/文档与P03测试机械格式化，
不是严格docs-only；它之后才仅receipt pin。格式化未改合同/身份，不要求为此重采业务针。
对象真实、树干净，派发/冻结不变，**counter / rework**。
未写贡献者树、未操作ZCode/模型、未main/done/官方覆盖结算。

## 本轮确认关闭的子项

- 实体machine.entry已经移到合法onEnter initial state；不重开这条结构位置修复。
- G13-02确实查询非initial enter-b，核没有initial、恰一command及路径；旧every伪证关闭。
- G13-01改为真实hook变体stages容器完整locator，新容器轴与旧shared-script body区分。
- 旧坏commandPath和旧状态机正文标签已不在执行集；新增prepare整串标签按新轴核，不把同ID历史误算仍测旧合同。
- Toolbar手工抢焦/空act已删除；真实RAF收敛方向正确，三次独立单文件均5/5绿。
  默认等待纪律仍另有未闭项，不能把通过当作扩timeout许可。
- 14枚活跃反控逐枚索引/patch/最终产品原源hash/恢复hash/三态完整身份/指定单AssertionError对应。
  **9组旧证据未变，P02-C08及4枚P03真实重采**；不继续要求重采旧9针或重做22例旧工具。
  新独立重放P02-C08/P03-C11/P03-C15三针9相，全部0→1→0、执行集与hash恢复。
- C13退出活跃索引、不补回旧initial合同的方向接受；不要求为退役针造新标题。

## P-R10-01 fixture仍不能通过公开canonical入口

候选 `handoffCommand()`把from/to都写成 `{kind:'stage',stage:'start'}`。
但`auto2`已是machine-1/idle状态机，合法游标应为
`{kind:'state',machine:'machine-1',state:'idle'}`。

从候选真实helper取得editorState、直接调用公开 `new ScriptEditSession(state)`，拒收：

```text
scenes.s001.hooks.onEnter.variants.enter-a.flow.machine.states.idle.entry.prepare[0].cursorHandoff.cases[0].to: 目标游标不属于目标 behavior
```

一手门：`script-editor.ts:655-668`按来源/目标flow核cursor；入口校验并未放宽。
只在内存诊断副本修entry的to后，下一处item私有脚本的to继续被拒；
shared分支里auto2→talk的from也不属于source flow。
三个handoff全部按talk=stage/start、auto2=state/machine-1/idle对齐后，
同一公开构造器才接受。**未改候选源或产品，只是可证伪诊断副本**。

新增toMatchObject只是复述fixture写入的错误字面值，不证明游标合法。
修全部来源/目标映射，测试expected也采用真实合法cursor；
让共同fixture在返回给测试之前经过公开ScriptEditSession（含作者校验/引用闭包），
其失败必须使测试失败，不能再仅在receipt声称“已过”。
不改产品验证、不强转、不把fixture准入自测计作新的业务合同。
仅重采受P03源/执行集变化影响的4枚，未变旧9/P02-C08保留。

## P-R10-02 新等待仍扩大默认超时

Toolbar测试:114传 `{interval:16,timeout:2000}`。
候选本机Vitest4.1.7的`dist/chunks/test.DNmyFkvJ.js:3361`和`index.d.ts:353`
均明示waitFor默认1000ms。原卡禁止扩默认timeout，receipt“不扩timeout”不属实。
删除扩大的timeout，使用默认可观察RAF/焦点收敛；可以保留合法轮询策略，
不mock业务、不把focus手设到目标、不加忽略。
另一个独占诊断worktree仅去掉timeout2000、其余测试不动，连续三次仍5/5绿。
这不是作者候选修复或接收，只证明无需靠扩大等待窗口完成现有合同；串行全包副本未被此试验改动。
实际RAF稳定行为子项已关闭，剩余只有默认等待纪律与对应重采，不重复旧业务标题/工具返工。

## P-R10-03 当前账和退休原证据仍不一致

78是执行数、17组、14活跃目标、18/20流程；仍为部分交付，不是700/70/50/20完成。
C13七份历史文件从当前树删除，README却说“存档保留”。恢复为明确历史退役证据，
与r9字节一致、不计活跃/新合同配额，不重新执行不存在目标；不要把重新采集伪装成旧原证据。

receipt仍r3.5/review旧路径、67定向、lint2804与旧三态来源；
README还有67/10、40针缺口、P03未开工和“本轮合同未变”。
真实本轮来源是9旧未变+5受影响更新，退休C13另列；14目标后反控缺口36，不是40。
sourceSha256九项实际均对应，**不要重开这个已修摘要子项**。

P03合同账仍含“同上”、G12-03 oracle仅isDefined、G14字段截在操作数而无matcher/完整expected，
G13-01 axis仍旧initial+command。按最终合法条件/真实locator及完整标签结果更新，
不把此条件修复扩成整仓重写；原卡其它逐条件真账与剩余合法余族继续。
计数净新上限78/缺口至少622仅是结构上限，P03合法性未闭前不能宣称11新合同已accept。

## 独立验证与边界

最终不可变串行Editor全包 **3863 passed + 1 failed = 3864**；78定向身份与状态全部对应。
红例为未改动的 `BattleSpriteLibrary.glm-m.test.tsx:170`（M05待机草稿）：
期待应用按钮disabled=false，实际true。与P r9相比产品、该旧测试及glm-m fixture均无变化；
上次Cursor独立全包中同旧例passed。默认单文件复核结果另见机器记录，不覆盖这次完整门失败。
该旧测/产品不在P写白名单，**不要求GLM越界修改**，由Codex集中定位/收全仓门；
P候选的合法性/等待纪律counter独立成立，不因旧测结果忽略它们。

新typecheck零、旧唯一judge自测22/22、根lint2821文件完整0/0/0，
docs816 Markdown/4285链接零问题、派发区间diff零，
716生产冻结/Owner overlap0/187白名单路径通过。
最终78身份与全包结果对照、独立串行全包及逐针细项见
[机器证据](codex-p-r10-review-20261002.json)。
初次全包与本轮反控重放使用同一审查副本，有短时变异重叠：
**主动中止并弃用该次试跑（exit143），不作为任何验收证据**。
反控全部恢复、tracked diff空后另跑不可变串行全包，以新报告为准。
没有新视觉；F14/F18继续未证，已关闭18流程不重拍。
旧版本兼容审查：pass，本次仅测试/证据，无产品兼容代码新增。
完整新原始JSON/raw保存在 `/private/tmp/codex-p-r10-review.PYFL5L`。

## 下一位 GLM P 提示词

代码阶段请用户发送前手动选择 **GLM-5.3**；只有用户切模型。
F14/F18另交视觉阶段时用户手动选GLM-5.3-Flash，不混入这段代码任务。

```text
继续TEST-GLM-WAVE-P-1，唯一P Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-p-editor-residual/type-pal、原分支codex/glm-wave-p-editor-residual-r1，固定43a281325192645ac775f93428c3ba2f788bdd94。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/glm-tenfold-triple/codex-p-r10-review-20261002.md/json及原卡最新段。只闭P-R10-01～03：onEnter entry位置已合法，但三处handoff仍把auto2状态机当stage；talk合法cursor是stage/start，auto2是state/machine-1/idle，入口/item的to与shared的from都须对齐，expected核真实合法映射，共同fixture返回前实际经过公开ScriptEditSession/引用闭包，失败不能绕过，不把准入测试算新业务合同。Toolbar删timeout2000扩张，默认waitFor可观察RAF收敛；手设focus/空act已删除、三次5/5、真实业务方向关闭不重开。C13退役方向保留，恢复明确历史原证据并与r9字节一致，不计活跃、不补旧目标新针；同步78执行/17组/14目标/18流程、9旧三态未变+P02-C08和4P03更新、定向/实际lint/完整SHA与docs-only锚，修67/10/40/P03未开工等旧摘要。P03账按最终源条件/合法cursor/真实容器locator和完整matcher+expected更新，去同上/仅isDefined/截操作数；旧两重复删除和新prepare标签方向保留。源/执行集改动仅重采受影响4P03与Toolbar所属针，不重采未变旧9或重做22判据。然后持续原P02残余/P03～P10合法余族，不再把窄返工当整卡完成；700/70组/50不同合法目标/20流程不缩，F14/F18另阶段视觉。派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，避让Cursor74新合同源；仅原P新测/fixture/wave-P，产品/旧测/配置/baseline/真实数据/O/Q/其它队列/共享文档只读。每批定向相邻/typecheck阶段推送，末批Editor全包/静态0/0/0/docs/diff/verifier及真实完整SHA/准确剩余账。不合main、不done、不官方ratchet/protected、不清原树。
```
