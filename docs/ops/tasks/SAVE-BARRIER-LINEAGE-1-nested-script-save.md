# SAVE-BARRIER-LINEAGE-1 - 保存与嵌套脚本活动互等修复

Status: review
Phase: phase2
Capability: B-06/B-07审计修复（不改变能力地图状态）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi / GLM
Visual Verification Owner: Codex
Visual Verification Timing: e2e-deferred
Unavailable Agents: none
Branch: main

Revision: r1，2026-09-16。前提取证基线`aefa5b06e067f81a90273cf245c762a9264cc09a`；
取证时产品与WORLD候选`e13216e7a4439008df38666cbcfec557c8e5a26c`相同。
实现候选：`dff3442daf3b2e43837e67e6944827b928eeb1f4`，对比build准入`11ad25fa`；SHA回填仅文档，不改变候选。
本卡已核自身r1三签并完成实现/自测，进入review；不借用WORLD或四包测试卡的签字/历史豁免。
WORLD仍在review；本卡以未漂移的e13216e7产品候选冻结依赖，不宣布WORLD完成；若相关返工落地，先停下重核依赖。

## 目标与范围

确认框尚未答复时请求保存，随后继续开战或执行场景出口：保存可以等待真实业务结束，
但不能因为其关闭的新活动门禁反过来阻塞自身正在等待的子流程。快照不得包含人为截断的子流程半状态。

- 范围内：当前runtime的开战活动身份、内联场景钩子与持久活动准入、有效lease与lineage关联，以及相应回归。
- 范围外：SAVE8/content20格式、codec/存储/迁移、战斗机制或音画、Q1 dumpSave接线、U-02旧finally待证、默认落点。
- 不改F5可用区域，不支持战斗中任意快存；不取消/延长生产10秒上限，不改成保存脚本调用栈或中途command index。
- 不触GLM四包测试白名单、已有审计探针、第一阶段产品、PAL工程/资产、依赖、统计范围或全局超时。
- 同族两个入口合卡、分别回归；不扩成脚本调度器整体重写。

## 前提真值门

一句话前提：保存只可等待已登记活动到安全边界；被它等待的调用链所必需的子活动不能重新排队等保存结束，
也不能在嵌套调用中途把“因保存暂停”当成正常返回。

| 维度 | 直接证据与结论 |
|---|---|
| 原版 / primary source | 原版数值/剧情机制N/A：本卡不改变开战/传送本身，只修Reforge保存协议。协议一手来源为当前[存档合同](../../phase2/specs/save-system.md)第20行与[脚本调度合同](../../phase2/specs/script-system.md)第132行：只保存FlowCursor，不保存调用栈/等待相位，超时不能提交半成品 |
| 第一阶段 | 该canonical lease/barrier身份机制N/A，第一阶段不是它的实现真源；[世界审计](../audits/pre-e2e/world-lifecycle.md)已将一阶段B-01～03单列。本卡不照搬一阶段F5权限或事件游标语义，不改game |
| 当前第二阶段入口 | main.ts:6478-6488确认框允许F5；:6466战斗分支提前return，所以不声称战斗中可随时保存。:3505-3513出口等待runDetachedScriptChain→runSceneHook；:5154-5170内联复用原signal；:2223与:2638-2653开战/战后脚本保留exact launchSignal |
| 当前B-06 | runtime-script-project.ts:164-168将startBattle委派到retainedHost；父flow在:319/:373/:398登记wrapper host。script-project-core.ts:312-318却用base host的this取lineage；script-activity-lineage.ts:46-62身份不匹配后重新排队。旧B01合同在当前树仍因保存超时业务红，无保存B02对照绿 |
| 当前B-07 | runtime-script-project.ts:338-371不识别父lineage，重新beginSceneHook并等gate；script-world.ts:538-548在pending时拒绝新持久lease。旧B03合同业务红。新[只读诊断](../audits/pre-e2e/save-barrier-lineage-premise.md)进一步证明仅删准入gate会在子stateMachine中途停下，快照缺childEnd而parentEnd已写 |
| 当前正确暂停边界 | script-world.ts:451-468先核epoch再提交cursor，独立root遇保存gate应停止；script-runner-core.ts:254-265在to过渡收到stop后返回。无保存内联对照执行完整；独立root保存对照正确只执行first并留下last游标。不能一概删掉safe-point停止 |
| 本任务目标 | 同一runtime、exact signal、同coordinator且仍持真实活动lease的调用链可完成自身命令；独立根活动继续等gate，嵌套活动完整结束前不能ready。取消、owner epoch失效、scene/session变化仍按现有合同收口 |

代码锚点省略前缀处均为`packages/reforge/src/`，基于上述冻结产品，不冒称完整浏览器/E2E实测。

### 替代解释与证伪

- 最强替代解释：是战斗/出口本身真的耗时，或确认框不允许F5，而不是相互等待。
  反证：main真实按键分支允许；可立即完成的子host仍被gate挡住，超时取消gate后同一链即完成，无保存对照正常。
- 只修host key不足以修B-07；只放行新hook不足以保证完整性。新探针仅内存替换一次begin gate，同输入出现子尾遗漏。
- runtime/命令语义：stages的next只登记后继，并不在同次调用自动跑；反例使用会继续执行的stateMachine `to`，不是把stages误当循环。
- 原版/一阶段理解：不以原版记忆推断Reforge保存协议；本卡不裁决原版机制。
- 提取/地图/解码：复现使用内存合法flow、无资源I/O，故无生成内容修复依据，不动迁移/PAL。
- 审计/测试模型：原探针B06未返回实际snapshot，`result.script?.…`无法证明快照内容；只复用AbortError、世界标志、后续保存证据，正式回归必须直接断言捕获的快照。
- 可证伪观察：真实父lease仍活跃、exact signal与当前runtime相同的立即结束子链在原树就能保存成功，或主壳实际替换signal/没有内联等待，会推翻相应根因，须重开前提。
- API压力例“lease已close而registration finally未结束”只证明计数不能独立担保live身份，**不是已证生产可达的新漏洞**，不升格U-02。

### 用户可见偏离

主动偏离已核真值：no（修复违反现有保存/脚本合同的互等及不完整修法，不改变正常剧情意图）。
before → after：确认继续后因等待自身子链而保存超时 → 必需子链可继续，全部参与者到达合法边界后才保存；真实长耗时仍按10秒上限失败。
代表场景：确认框F5后确认开战，或确认使用出口命令。没有声称已在PAL发现同样的命令邻接。
用户产品裁决：N/A；若实际方案要求改变F5权限、调用语义或保存格式，停止并另请裁决。

## 上下文锚点

- [AGENTS](../../../AGENTS.md)、[CLAUDE](../../../CLAUDE.md)、[READ-FIRST](../../phase2/READ-FIRST.md)、[工作流](../agent-workflow.md)。
- [世界异步审计B-06/B-07](../audits/pre-e2e/world-lifecycle.md)、[批二回执](../../testing/glm-pre-e2e-boundary-batch-2-report.md)、[本卡取证](../audits/pre-e2e/save-barrier-lineage-premise.md)。
- [WORLD实现卡](WORLD-ASYNC-COMMIT-1-world-async-commit.md)仍在review，其地图commit/预检签名/selector取消保护不得回退。
- [四包测试卡](TEST-FOUNDATION-COVERAGE-1-core-boundaries.md)与本卡产品/测试范围不交叉；GLM为本卡设计/矩阵审查者，不分配视觉。
- 当前`script-activity-lineage.ts:3-6`已定义runtime + exact AbortSignal；不新增content/host公开token，不写入存档。
- `script-world.test.ts:589`及`script-runner-core.test.ts:338`的独立根暂停/所有活动结束规则须原样保留，不能改旧断言迎合修法。
- 当前BaseProjectScriptRuntimeHost仍被current wrapper消费；只在共享内部合同所需处同步，不借此恢复旧版本接口/fixture或开展无关退役。

## Draft：r1设计与风险

### 1. 统一当前host的开战身份

当前wrapper的startBattle以自己的runtime身份进入已有activity包装，调用同一options.startBattle并透传exact signal，
不再绕到另一host对象重做lineage判断。基础host独立路径仍按自身身份工作；禁止全局跳过startBattle活动登记。
无父活动的hostile/dev/物品入口仍创建完整transient lease并等待保存gate，战后onDefeated仍复用原signal。

### 2. lineage绑定真实在途lease，不用计数当准入凭据

- 内部WeakMap由“计数即可信”收敛为runtime/signal对应的lease登记记录；注册/finally成对清理，必须携带所属coordinator及实际lease。
- coordinator以自身active表中的对象身份验证成员资格；constructor/instanceof、布尔标记、同类新对象不能替代此检查。
- 查找lineage时只取仍登记的有效成员；不同runtime、signal、coordinator、已关闭lease不能借用。过期registration残留退为新root，gate关闭则等待/可取消。
- owner epoch变化与lease存活分开：现行合同允许旧invocation跑到安全点，因此不能因为epoch变化就把仍在执行的父命令当成无父链；旧cursor提交仍必须被epoch检查拒绝。
- 这是现有exact-signal合同的加强，不声称能把刻意复用同一signal的任意外部调用按JS调用栈再区分为“独立根”。不引入全局current-root变量。

### 3. 嵌套持久活动窄准入，并保留它的完整调用语义

- runtime在激活hook/behavior时，从内部lineage取得当前有效父lease，交coordinator核验后作为嵌套参与者登记。
  无父lease走原root逻辑；保存ready时不可能凭残留计数新入场。
- 每个持久子活动仍持自己的lease、owner互斥和cursor：不是漏登记、虚报active为空或合并掉持久owner。
- 在创建时标明这次invocation是嵌套调用；只免除“保存gate导致中途stop”，让它完成本来会完成的命令/`to`链，
  到自然stay/restart/返回后关闭lease。它自己的活跃登记保证父方异常关闭也不能使正在执行的子方从barrier消失。
- 继续保留abort、owner epoch失效停止/不提交、场景身份检查及原有节拍；不强跑stages.next，不改runner语法，不把stay变循环。
- 同owner已激活时不得重复进入。有效父链遇busy按现有未激活结果返回，不能又去等待自身家族结束；
  独立root遇保存关闭仍等待、醒后核scene/session再重试，不可把正常排队改成静默丢执行。
- “有父lease可准入”是内部能力，不是公共`allowWhenSaving`/`ignoreBarrier`开关。所有参与者退出后才允许同步snapshot；重复保存、超时/cancel/release语义保持。

### 预计改动与审查面

产品限`packages/reforge/src/{script-activity-lineage,script-world,runtime-script-project,script-project-core}.ts`。
新增独立lineage/coordinator/runtime集成测试；必要主壳接线验证用现有真实AST提取方式，不改main产品或复制等价实现。
只在实现形成后补当前规范的嵌套边界说明，不把draft设计预写为已实现合同。
需要超出此面时先说明原因与风险，不自动扩卡；不得覆盖WORLD审查中的非本卡改动。

主要风险：宽泛绕gate会放进新root；只修准入会提前返回；信号混用会认错家族；过期lease会在ready后偷入场；
owner变化误当lease失活又造成互等；子方finally/失败漏释放导致后续保存失效。以下验收逐项钉住，不靠多数通过放行。

## 验收条件

| ID | 必须验证的合同 |
|---|---|
| SL-01 | 当前runtime：confirm挂起→请求保存→确认→立即结束battle→链尾写标志；首次保存成功、snapshot恰一次且包含链尾；未请求保存对照相同 |
| SL-02 | confirm→保存→onTeleport至少两个`to`状态→父链尾；snapshot同时含子first/childEnd和parentEnd，不能用只有一stage的用例遮住提前返回 |
| SL-03 | 同内容独立root在gate关闭后的安全点提交next cursor并停止，next-state副作用尚未发生；新root未入场，release后按原cursor恢复 |
| SL-04 | 同runtime/exact signal、不同signal、不同runtime/coordinator、已close、残留registration、伪造lease逐轴正负控；ready后不新增活动；错位不能越gate |
| SL-05 | 嵌套同owner busy不重入/不互等；不同owner可登记；多层嵌套/并行独立root仍等所有真实lease退出；真实子方挂起不能提前snapshot |
| SL-06 | owner epoch变化不把仍执行的父lease误判失活；旧cursor不覆盖新选择；source scene/session变化后等待中的root不得执行旧场景 |
| SL-07 | abort前/等待gate中/子方异步返回后均无未执行命令副作用；父/子抛错finally收尾；timeout保留、snapshot抛错/thenable拒绝/重复请求边界及同实例后续合法保存可用 |
| SL-08 | canonical开战到真实主壳回调、onDefeated、出口detached内联的exact signal接线可核，不只直调独立helper；无父入口仍受gate约束，基础host现行路径不退化 |

- 新回归先对冻结产品复算应红，再对实现绿；反控至少覆盖host身份、宽泛准入、子方中途stop、live lease核验、finally释放。
  单点替换须唯一命中、业务断言红且原实现同输入绿；报错导入/错fixture/超时噪音不当鉴别力。
- 既有测试不降标，运行reforge定向及typecheck、完整check、官方ratchet后单次严格coverage:fast；和GLM分支集成分开记录，不虚报本卡贡献。
- 数据/schema/原探针/统计范围零diff。快照断言直接读捕获值，不读未返回字段；不为比例造重复用例。

### 集中E2E登记

视觉Owner=Codex，时机=e2e-deferred；目前未跑浏览器、不宣称画面通过。R4/Q1测试工程独立fixture：

- SL-E1：确认框入口，F5后确认，短战斗正式结束；预期继续推进、保存一次、读回含链尾状态。另以真实长战斗验证10秒超时提示和结束后重试。
- SL-E2：确认框F5后执行双状态出口脚本，出口尾标志与父尾标志都出现再保存；读回后按正式游标继续，不丢传送/尾段。
- SL-E3：等待期间取消/切换会话，再触发正常保存；错误可见、输入可继续，旧活动不污染新会话。U-02只记录异常，不借本卡预判根因。
- 执行时证据归`docs/testing/`本卡实现回执（run id、fixture路径、操作、快照与截图路径）；这里只登记入口/预期，未制造不存在的截图。

## 推进签字

### 进入build前

- Codex（2026-09-16）：**premise verified / design agree**。直接读取上表主壳/host/coordinator/runner；
  当前树旧B01/B03分别业务红，B02/B04/B05/B06退出0（B06快照弱断言已明确剔除）；新双状态探针原树互等、仅删gate树提前返回、独立root正控齐。
  live登记窗口只作内部设计压力反例，不判生产新缺陷。详见[取证回执](../audits/pre-e2e/save-barrier-lineage-premise.md)。
- Kimi：**premise verified / design agree（2026-09-16，r1，取证基线 aefa5b06、产品 e13216e7；全部证据本人直读/复跑，未读 GLM 结论）**。
  - **B-06 直读**：`runtime-script-project.ts:164-168` wrapper 把 startBattle 委派给 retainedHost；
    父 flow 以 **wrapper host** 登记 lineage（:319/:373/:398），而 base host 的 startBattle
    （`script-project-core.ts:312-318`）以**自身 this** 取 lineage——
    `script-activity-lineage.ts:46-62` 按 runtimeKey+signal 查不到即当新 root 排队等 gate，
    而保存正等父链结束——互等成立。
  - **B-07 直读**：`runtime-script-project.ts:338-371` runSceneHook 不认父 lineage，
    `beginSceneHook` 遇 `script-world.ts:535-548` pending 拒发新 lease、外层等 gate——
    内联出口子链与保存互等成立。
  - **正确暂停边界直读**：`script-world.ts:451-468` reachSafePoint 先核 epoch 再提交 cursor、
    gate 关则 finish+stop——独立 root 的安全点停止是既有正确合同，设计保留它而非一概放行。
  - **主壳链直读**：`main.ts:6478-6488` 确认框允许 F5、`:6466` 战斗分支提前 return（不声称
    战斗中可存）；`:3505-3513` teleportOut→runDetachedScriptChain→runSceneHook 内联；
    `:5154-5170` 战后 onDefeated 复用 exact launchSignal（注释已识同族风险）；
    `:2638-2653` runDetachedScriptChain `signal ?? 新 controller`——exact signal 链属实。
  - **本人复跑**：probe-save-barrier-family 两模式 exit 0——original 互等（`saved:false`、
    `snapshots:0`，超时解门后 childEnd/parentEnd 才执行）；admission-only 单点仅删 begin gate：
    保存虽成功但快照缺 childEnd、子 cursor 已到 last——**仅删准入门禁会提前保存不完整状态**，
    卡面反例成立；独立 root 对照正确停在安全点。原探针 B01/B03 业务红、B02/B04/B05/B06 绿
    与卡面一致；旧 B06 快照弱断言限制已知。
  - **设计同意**：D1 统一开战身份（wrapper 以自身 runtime 身份进既有 activity、透传 exact
    signal，不绕到另一 host 重做 lineage，无父入口仍完整 transient lease+等 gate）；D2 lineage
    收敛为 runtime/signal 的 lease 登记、coordinator 按 active 表对象身份核验成员、残留退化
    为新 root 等/可取消、owner epoch 与 lease 存活分离——正面回答「计数当准入凭据」反例
    （人工窗口 enteredAfterReady 不得在生产可达）；D3 嵌套参与者凭真实在途父 lease 窄准入、
    各自 lease/owner 互斥/cursor 保持、只免除保存 gate 中途 stop、到自然 stay/restart/返回收尾、
    同 owner busy 不重入、独立 root 仍等 gate 醒后核 scene/session、无公共 allowWhenSaving
    开关、全部参与者退出后才 snapshot。SL-01～08 覆盖双状态子尾完整/身份轴/epoch/异常收尾/
    主壳真实接线；先红后绿与单点负控要求明确；范围限四个 reforge 文件，无格式/公开 token/
    用户行为变化；WORLD 卡依赖（其 review 中改动不得回退、build 前须确认其最终基线）已声明。
  - **可证伪观察**（任一反例即 counter 或收窄）：① 当前树上「真实父 lease 活跃+exact signal+
    同 runtime 且立即结束的子链」本可保存成功 → 前提倒（本人复跑否定）；② 实现后独立 root
    在 gate 关闭期入场或不停安全点 → 宽泛绕 gate；③ 嵌套准入但 to 链提前返回（childEnd 缺席）
    → admission-only 反例复发；④ 准入凭据仍可由计数/残留登记通过（active 表身份核验缺席）；
    ⑤ owner epoch 变化把仍在执行的父 lease 误判失活（互等复发）或旧 cursor 覆盖新选择；
    ⑥ 快照发生在全部参与者退出之前；⑦ 实现需要新公共 token/格式版本/改变 F5 权限或调用语义
    → 越界。WORLD 终审若产生相关返工，本卡 build 前须重核其最终产品基线（卡面已列，本席背书）。
  - 返工项：无。
- GLM：**premise verified / design agree（2026-09-16，r1，取证基线 aefa5b06、产品 e13216e7；全部证据本人直读/复跑，未读 Kimi 结论；批二 B01-B06 探针为本席原始材料，本席为独立重核，不以历史材料自证）**。
  - **B-06 身份错位直读**：`runtime-script-project.ts:164-168` wrapper startBattle 委派 `this.retainedHost`；base host
    `script-project-core.ts:312-318` 用 `withScriptActivityLineage(this, …)` 以 **base host 对象**为 key 查 lineage；
    而父 flow 在 wrapper 侧以 **`this.host`** 登记（:319/:373/:398）——`script-activity-lineage.ts:18-20/52` WeakMap
    按 runtimeKey+signal 查不到 → `:54-59` beginActivity → gateClosed 等待，保存正等父链——互等成立。
  - **B-07 直读**：`runtime-script-project.ts:346` runSceneHook 先 `beginSceneHook` 再在 :373 才登记 lineage；
    `script-world.ts:531` begin 遇 `this.pending`（保存 barrier 关闭）返回 undefined → :351-364 等待 gate——
    内联 onTeleport 子链与保存互等成立。
  - **正确暂停边界直读**：`script-world.ts:451-466` reachSafePoint 先 epoch 校验、commit(clone(cursor))、
    gateClosed → finish+stop——独立根安全点停止是既有正确合同，设计保留而非一概放行，正确。
  - **主壳 exact signal 链直读**：`main.ts:6478-6488` 确认框态 F5→quickSave；:6466 activeBattle 提前 return
    （不声称战斗中可存）；:3505-3513 teleportOut→runDetachedScriptChain→runSceneHook 内联；
    :5161 `runSignal = signal ?? new AbortController().signal`；:2650 onDefeated `runCommands(…, {signal: launchSignal})`。
    存档合同 `save-system.md:23-24`/`script-system.md:136-137`：只存 FlowCursor、不存调用栈/等待相位、
    超时不提交半成品——目标行为与一手合同一致。
  - **本人复跑（工作树 90d2b877，产品=e13216e7）**：probe-save-barrier-family 两模式 exit0——original 互等
    （保存超时、快照 0 次、超时解门后全部标志才执行）；admission-only 单点命中 1 次、保存成功但快照
    {first, parentEnd} 缺 childEnd、子 cursor 已到 last——「仅删准入」不完整修法反例成立；独立根对照
    first 执行、cursor=last、childEnd 未执行（安全点暂停正确）。旧探针 B01/B03 各 exit1 且红因分别为
    「confirm继续后的自身子链不得使原保存超时」「内联onTeleport不得与原保存互等至超时」（业务红非环境错）；
    B02/B04/B05/B06 exit0。**B06 弱断言本人核实**：`probe-glm-next-barrier.mjs:434-437` `result.script?.flags?.…
    ?? undefined` 在 script 缺席时空真——不能作快照内容证据，正式 SL-07 必须直接抓实际 snapshot（卡面 :130 已钉）。
    内部 API 残留窗口（enteredAfterReady）本人复跑同样出现，同意仅作设计压力反例、不升格生产缺陷/不重开 U-02。
  - **SL-01～08 矩阵审查**：非空正控（SL-01 未请求保存对照）、身份六轴+伪造 lease（SL-04）、双状态 to 子尾完整
    （SL-02 专门堵 admission-only 复发）、独立根停点与 ready 后不入场（SL-03）、busy/多层/并行（SL-05）、
    epoch 与 lease 存活分离+旧 cursor 拒绝+场景会话重核（SL-06）、取消/错误/超时/重复/后续保存（SL-07）、
    主壳真实接线（SL-08）——与两根因和风险表逐条对应，无以用例数替代合同的空洞。**非阻断建议**：
    负控清单（:127 五项）可补第六项「epoch 校验单点负控」——SL-06 有正向合同，去掉 epoch 检查的 mutant
    应使旧 cursor 覆盖新选择的断言红，钉住 D2 的 epoch/lease 分离不被实现遗漏。
  - **设计同意**：D1 wrapper 以自身 runtime 身份进既有 activity、透传 exact signal（消除 base-host this 错位）；
    D2 lineage 收敛为真实 lease 登记+coordinator active 表对象身份核验+残留退化新 root+epoch 与存活分离；
    D3 嵌套窄准入（真实在途父 lease+coordinator 核验）、各自 lease/owner/cursor 保持、只免除保存 gate 中途
    stop、自然收尾、同 owner busy 不重入、独立 root 仍等 gate、无公共开关、全员退出才 snapshot——
    与本人直读的互等成因和 admission-only 反例逐点对应。范围限四文件、无新公共 token/版本/格式、
    不动 F5 权限与 10 秒上限，未越界。
  - **可证伪观察**（任一反例即 counter 或收窄）：① 当前树上「真实父 lease 活跃+exact signal+同 runtime+
    立即结束子链」可保存成功 → 前提倒（本人复跑否定）；② 实现后独立 root 在 gate 关闭期入场或不停安全点 →
    宽泛绕 gate（SL-03）；③ 嵌套准入但 to 链提前返回缺 childEnd → admission-only 复发（SL-02）；④ 准入凭据
    仍可由计数/残留登记通过 → active 表身份核验缺席（SL-04）；⑤ owner epoch 变化把仍在执行的父 lease 误判
    失活（互等复发）或旧 cursor 覆盖新选择（SL-06）；⑥ 快照发生在全部参与者退出之前（SL-05/07）；
    ⑦ 实现需要新公共 token/格式版本/改变 F5 权限或调用语义 → 越界。⑧ WORLD 终审若返工四个共同文件，
    本卡 build 前须在新产品基线重跑 premise 探针与旧 B01/B03 红因（卡面已列，本席背书）。
  - 返工项：无（上述 epoch 负控为非阻断建议）。
- 独立非Owner证据：Kimi 90d2b877与GLM 9f8b030c均直接核主壳/host/lease/runner并独立复跑，见各自原文；GLM既有材料贡献已披露。
- counter：无；缺签豁免：无。
- build准入：**build allowed（2026-09-16，Codex核三签齐，8126f5c0相对e13216e7的packages/scripts零diff；不重签r1）**。

### 进入done前

- Codex：**accept（2026-09-17，实现者自验证）**。产品4文件、43项新增回归；修前2红/1正常对照、修后43/43，
  连相邻8文件127项、Reforge typecheck、8单点反控、完整check7079项与受保护strict fast6591项均通过，617生产文件零移除。
  六包基线对象不变，全部旧测试identity保持；真实main AST接线已验，视觉/磁盘保存读回按SL-E1～3集中延期。
  失败记录和覆盖分子分母见[实现回执](../../testing/save-barrier-lineage.md)，不把GLM四包返工计入本卡，不宣布WORLD已done。
- Kimi：pending。
- GLM：**accept（2026-09-17 实现复核；独立矩阵/边界席位，非第三方终审，不替代 Kimi）**。
  - **贡献披露**：批二 B01-B06 barrier 探针/机器账为本席原始材料，本卡前提曾引用；r1 实现、43 项正式回归与
    8 针反控均为 Codex 工作。本轮为独立重核，不以历史探针自证。
  - **实现直读（dff3442d 对比 11ad25fa，产品恰 4 文件）**：D1——`runtime-script-project.ts:168-171` wrapper
    startBattle 改 `withScriptActivityLineage(this, this.coordinator, signal, …)` 直调 `options.startBattle`，
    键=wrapper 自身，与父 flow 登记键 `this.host`（=wrapper）一致，B-06 身份错位消除；base host
    `script-project-core.ts:313-319` 保持 `this`（=base host），与 base 侧 flow 登记同键，两条调用面各自一致。
    D2——`script-activity-lineage.ts` Registration={coordinator,lease}；`registeredScriptActivityLease` 逐条核
    `coordinator 相同 && coordinator.hasActiveLease(lease)`（`script-world.ts:683-686` active 表对象身份），
    残留 finally 待清登记不再作准入；`withRegisteredScriptActivityLineage` 入口要求活跃 lease、finally 精确删
    本条登记。D3——`script-world.ts:533-543` begin 接受 parent 并验活（失效即抛），pending 时仅
    `!parent || pending.ready` 拒绝；`FlowActivationLease` 增 nested 标记（:446），reachSafePoint 仅对非嵌套
    在 gate 关闭时 finish+stop（:460-465）——嵌套子链完成调用方命令而非把保存暂停当正常返回；epoch 检查先于
    commit 且嵌套不豁免（:451-456）。runEntityBehavior/runSceneHook 两侧（wrapper+base core）先取真实父
    lease 再 begin，等待循环 `!parent` 才排队，醒后 scene/session 复验保留。
  - **SL-01～08 逐项核（43=18/22/3 实际断言面）**：SL-01/02（runtime-save-lineage:20-79 确认保存→battle/exit
    →快照恰一次且含 tail；exit 含 first/childEnd/parentEnd 双状态尾）；SL-03（:53-89 独立根停在 checkpoint、
    cursor=last、释放后续跑补 childEnd）；SL-04（lineage:19-107 身份三轴逐轴+closed-lease-pending-finally
    不得入场/不得冒名替代+重叠登记乱序收尾）；SL-05（:111-127 同 owner busy 返回不互等；:129-157 transient→
    entity→hook 三层嵌套全尾后才保存；:207-231 父先关子/孙仍 pending+多根阻塞 ready）；SL-06（lineage:269-289
    epoch bump 后 lineage 仍活但 stale cursor 拒提交——commit 零调用；save-lineage:186-204 排队根醒后
    scene/session 变化四轴拒绝执行）；SL-07（:225-247 取消后**实际快照**（await 值）无尾+后续保存可用；
    :249-262 预取消拒绝；:264-280 子失败双 lease 释放可重试；:282-304 真实 10s 超时+恢复；:306-332 重复保存/
    快照抛错/异步快照拒绝/重试——快照断言全部直接读捕获值，无旧 B06 optional 空真形态）；SL-08
    （save-lineage.chain:37-142 真 main AST 提取 startBattle/teleportOut/onDefeated victory 分支/
    runDetachedScriptChain，`expect(signal).toBe(f.signal)` 逐点，快照含 defeated+parentEnd，runner 槽保持；
    :144-159 无父 host 开战仍等 gate）。基础 host 三入口家族成员保持（runtime-save-lineage:334-384）。
  - **本人复跑（2026-09-17，工作树 a652d5c6，产品=候选零漂移）**：定向 8 文件 **127/127** exit0；
    `tsc --noEmit` rc0；`node docs/testing/save-lineage-mutants.mjs` **1 对照 exit0 + 8 针全 exit1 业务红**
    （wrapper-key/wide-admission/premature-child-stop/stale-registration/exception-lease-leak/
    stale-epoch-write/forged-parent/key-not-identity）。质量门重跑：`pnpm check` rc0（1334 文件 0 errors/
    48 warnings/11 infos）；`TYPE_PAL_COVERAGE_BASE_REF=11ad25fa pnpm coverage:fast` rc0——**6591 项/617
    生产文件**，reforge 行 7848/14117、分支 5252/11041，与回执逐数一致。
  - **基线对账（独立 diff 核）**：baseline.fast.json 相对 11ad25fa 六包条目逐字相同（shared/content/
    pal-extract/migrate/game/editor 全等）；reforge 仅 +3 测试文件（本卡三件）、0 移除、计数 1070→1113（+43）；
    总和 6548→6591。旧 identity 无一变化，无 scope removal。
  - **范围/冻结核**：产品恰 script-activity-lineage/script-world/runtime-script-project/script-project-core
    四文件；main/runner/content/codec/原探针零改；SAVE8/content20、F5 区域与 10 秒上限不变；无新公共 token/
    版本分支/fallback（旧 lineage 签名直接替换）。与四包测试返工（codex/glm-foundation-coverage-r1）完全分开。
  - **剩余风险**：SL-E1～E3 视觉/磁盘保存读回集中 R4/Q1 未执行（卡已登记）；exact signal 家族合同不保证
    刻意共用同 signal 的外部调用按 JS 调用栈区分（回执已声明，非本卡缺陷）。均不构成本席阻断。
- 缺签豁免：无；done准入：blocked（待 Kimi 终审）。未请求用户重复手工复审同一技术证据。

## Build / Review / 用户验收

Codex实现与自验证完成，候选dff3442daf3b2e43837e67e6944827b928eeb1f4；主审Kimi、GLM独立复核矩阵，当前两席实现审查pending，不分配视觉。
产品/测试/质量门与失败记录见[实现回执](../../testing/save-barrier-lineage.md)。用户验收pending，不标done。

## 交接日志

- 2026-09-17 GLM：完成实现复核，done前席位签 accept（证据锚点见上节）。独立复跑定向 127/127、typecheck rc0、
  8 针反控全业务红；check 7079（0 errors）与 BASE_REF=11ad25fa 单次严格 fast 6591/617 重跑 rc0 且数字与回执一致；
  独立 diff 核六包基线逐字不变、reforge 仅 +3 文件 +43 无移除。43 项断言逐条读面（快照全为实际捕获值）；
  批二 B01-B06 原始材料贡献披露。仅改本席与日志，不改产品/基线/他席/状态，未读 Kimi 结论；done 准入仍
  blocked 待 Kimi 终审。
- 2026-09-17 Codex：完成四文件修复与43项真实调用链/lease回归；先红后绿、8单点负控、check7079与ratchet/单次受保护fast6591均通过。
  转review，候选冻结待两席独立实现审查；无schema/save/migration/主壳产品修改，无scope移除；SL-E1～3由Codex在R4/Q1集中验证。
- 2026-09-17 Codex：实现候选dff3442d已提交，回填最终SHA与同候选两席终审提示词；产品/测试/基线不再变动，不重签设计、不代签、不标done。

- 2026-09-16 Codex：用户告知另一任务已签，核main干净、Kimi/GLM本卡r1有效签字齐且无counter；相关产品仍为e13216e7，核定build准入。
  Codex独占四文件实现，先补B-06/B-07真实调用链回归，吸收GLM的epoch反控建议；不合入正在返工的四包测试、不改其产品冻结。

- 2026-09-16 GLM：完成 r1 独立合同/矩阵审查，签 premise verified + design agree，无返工项（附一条非阻断
  epoch 单点负控建议）。直读 B-06 wrapper/base-host lineage key 错位、B-07 beginSceneHook 先于 lineage 的
  pending 拒绝、reachSafePoint 安全点合同、主壳 F5/出口/onDefeated exact signal 链与两份 spec 合同；
  复跑 family 探针两模式与旧 B01-B06（红因/控制范围逐项核）。批二 B01-B06 探针为本席原始材料已披露；
  B06 弱断言（optional-chain 空真）本人定位至 probe-glm-next-barrier.mjs:434-437。未改产品/测试/基线/他席/
  Status，未读 Kimi 结论。Next：三签齐后 Codex 核门禁与 WORLD 基线稳定性再放行 build。
- 2026-09-16 Kimi：完成 r1 独立前提/设计审查，签 premise verified + design agree，无返工项。
  直读 B-06 lineage 身份错位（wrapper 登记 vs base host this 查询）、B-07 beginSceneHook 不认父链、
  script-world.ts:451-468 安全点正确暂停、主壳 F5/出口/onDefeated exact signal 链；复跑
  probe-save-barrier-family 两模式（original 互等快照 0 次、admission-only 缺 childEnd）与旧
  B01/B03 业务红、B02/B04/B05/B06 绿。七条可证伪观察写入本席；WORLD 终审相关返工须先重核
  本卡依赖（卡面已列）。未改产品/测试/基线/他席/Status，未读 GLM 结论。Next：GLM 并行签字；
  三席齐后 Codex 核门禁放行 build。
- 2026-09-16 Codex：用户已转发WORLD/四包工作包并要求继续。避开并行实现区，重核B-06/B-07；
  新增只读双状态诊断，两个模式均符合预期，3文件39项相邻测试绿，未改任何产品/原探针。
  同族方案收敛为本r1 draft，待Kimi/GLM各自设计审查；不重签其它卡、不因旧豁免自行进入build。
- 2026-09-16 Codex：准备期间main收到GLM世界补审5cee883d、四包三席设计及Coding Owner准入648b4086；
  已核相对取证基线产品/脚本零diff，保留他席落盘原文，只同步看板/索引。不用其它卡签字推进本卡。
- 2026-09-16 Codex：文档门首次因四包卡并行变为build而看板/索引未同步报两项；按真实签字状态更新后，
  docs 425篇/2094链接/145卡零问题，文档工具20/20、probe Biome与diff-check通过。不把文档检查说成全仓产品check。

## 下一位Agent提示词

### 当前：r1实现终审（两席并行；下方设计提示词保留历史）

实现候选dff3442daf3b2e43837e67e6944827b928eeb1f4；对比build准入11ad25fa。两席各读一手代码/测试，不读取或复述另一席实现结论。

#### Kimi实现审查

```text
在 /Users/zhangxu/illegal/type-pal 终审 SAVE-BARRIER-LINEAGE-1 r1，任务卡 docs/ops/tasks/SAVE-BARRIER-LINEAGE-1-nested-script-save.md，状态review；候选dff3442daf3b2e43837e67e6944827b928eeb1f4，对比11ad25fa。设计不重签。
先同步并查工作树，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡、docs/testing/save-barrier-lineage.md。按候选冻结树独立核四文件：wrapper开战身份、真实lease/active对象身份、嵌套to完整执行、独立root等待/安全点、同owner busy、epoch与lease存活分离、错误/取消清理；无公共token、版本/F5/10秒行为扩张。WORLD依赖e13216e7的实现块不得回退，本卡不代其终审。
复跑3个新测试文件43项及相邻；node docs/testing/save-lineage-mutants.mjs应为43项正常对照绿+8针业务红。核check7079、受保护strict fast6591/617及旧identity/六包零漂移；主壳AST执行边界和未跑浏览器/磁盘E2E如实保留，不复跑剧情观感。
只在自己的实现席位签accept或带file:line和反例的counter，独立证据/可证伪观察、旧版本兼容审查和本人日志直接落卡提交推送。不得代签、改他席/产品/状态或标done；不读/复述GLM结论，交Codex统一核准入。
```

#### GLM实现审查

```text
在 /Users/zhangxu/illegal/type-pal 复核 SAVE-BARRIER-LINEAGE-1 r1实现，任务卡 docs/ops/tasks/SAVE-BARRIER-LINEAGE-1-nested-script-save.md，状态review；候选dff3442daf3b2e43837e67e6944827b928eeb1f4，对比11ad25fa。设计不重签，与四包测试返工分开提交。
先同步并查工作树，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡和docs/testing/save-barrier-lineage.md。独立按SL-01～08核43项（18/22/3）的实际断言、snapshot不是optional空真、三类身份/过期lease、busy/多层/epoch/取消/失败/超时/重复保存、真实main接线。你参与过批二原始材料须披露；新43项及实现由Codex完成，不用历史探针自证。
复跑定向及node docs/testing/save-lineage-mutants.mjs（1正常对照+8针业务红）；核check7079、官方ratchet和TYPE_PAL_COVERAGE_BASE_REF=11ad25fa的单次严格fast6591/617、全部旧identity保留及六包基线不变。不混入你的四包返工分支、不动官方基线/统计范围，不做浏览器或视觉；SL-E1～3按集中E2E未执行登记。
只在自己的实现席位签accept或带file:line的counter，直接写独立证据、旧版本兼容检查与本人日志并提交推送。不读/复述Kimi结论、不代签/改状态/标done；Codex统一集成与收口。
```

### 历史：r1设计转交（已完成，不再执行）

两席同一r1/取证基线独立并行，不读取或复述另一席结论；各自提交推送自己的签字和日志，不改任务状态。
可在已收到的当前审查工作之后处理，不中断GLM四包测试。Codex统一核门禁，三签不齐不得改实现。

### Kimi

```text
在 /Users/zhangxu/illegal/type-pal 审 SAVE-BARRIER-LINEAGE-1 r1 设计，任务卡 docs/ops/tasks/SAVE-BARRIER-LINEAGE-1-nested-script-save.md，状态draft；取证基线aefa5b06e067f81a90273cf245c762a9264cc09a，产品为e13216e7a4439008df38666cbcfec557c8e5a26c。
接手先同步分支并查工作树，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡与 docs/ops/audits/pre-e2e/save-barrier-lineage-premise.md；不重审WORLD/四包卡的已签设计。
独立读main真实F5/开战/出口链、runtime wrapper与base host、script-activity-lineage及coordinator/runner。重点压力测试：exact signal+真实live lease的窄准入、嵌套to链不得被gate提前截断、独立root仍停安全点、owner epoch与lease存活分离、busy同owner/ready后过期登记/异常收尾。
可复跑新probe的original/admission-only模式；后者只是单点不完整修法反例，不是修复。API残留窗口不是生产可达缺陷，U-02/dumpSave不在范围。检查r1是否需新公开token、版本或改变用户行为；有则counter，不凭自洽放行。
只写你自己的premise verified/design agree（附独立一手锚点和可证伪观察）或counter及明确返工，追加本人日志，提交推送；不同意不能改别人签字。产品/正式测试/基线零修改，不标build/done，不代签，不读取或复述GLM结论。WORLD终审若有相关返工须标本卡依赖，不用旧快照掩盖。
```

### GLM

```text
在 /Users/zhangxu/illegal/type-pal 审 SAVE-BARRIER-LINEAGE-1 r1 设计，任务卡 docs/ops/tasks/SAVE-BARRIER-LINEAGE-1-nested-script-save.md，状态draft；取证基线aefa5b06e067f81a90273cf245c762a9264cc09a，产品为e13216e7a4439008df38666cbcfec557c8e5a26c。
本项是短的独立合同/矩阵审查，排在已收到的审查之后，可与四包工作分开提交；不改四包白名单或中断其已准入测试。先同步分支，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡与 docs/ops/audits/pre-e2e/save-barrier-lineage-premise.md。
独立核B-06 host身份错位/B-07新hook排队，直接读主壳exact signal链和保存合同，复跑新probe两模式并核旧B01/B03红因、B02/B04/B05/B06控制范围；注意旧B06没有返回snapshot，不能把optional字段断言算快照证明。
审SL-01～08：非空正控、真实lease/不同身份/过期登记、双状态to子尾完整、独立root停点、busy与epoch、取消/错误/超时重试、快照恰一次；提出最小正式回归和单点反控缺口，不以用例数量替代合同。admission-only只是反证，人工API残留窗口不升级生产漏洞。
仅在本卡GLM席位签有一手证据的premise verified/design agree或counter，附可证伪观察和本人日志，提交推送；不读/复述Kimi结论，不代签、不改状态、不开始本卡实现/正式测试/统计基线、不做浏览器或视觉。Codex统一集成与准入；新卡没有缺签豁免。
```
