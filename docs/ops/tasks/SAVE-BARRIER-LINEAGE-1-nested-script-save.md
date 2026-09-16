# SAVE-BARRIER-LINEAGE-1 - 保存与嵌套脚本活动互等修复

Status: draft
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
产品与WORLD候选`e13216e7a4439008df38666cbcfec557c8e5a26c`相同。
本卡目前只有只读诊断与方案；**未开始实现，不借用WORLD或四包测试卡的设计签字/历史豁免**。
WORLD仍在review；本卡build前须确认其最终产品基线，若发生相关返工先重核依赖。

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
- Kimi：premise pending / design pending；独立primary-source与可证伪观察待本人填写。
- GLM：premise pending / design pending；独立合同/矩阵/诊断鉴别力待本人填写。
- 独立非Owner证据：pending，不以Codex自证替代。
- counter：当前无他席结论；缺签豁免：无。
- build准入：**blocked（待三席设计齐且WORLD相关基线稳定；卡状态仍draft）**。

### 进入done前

- Codex：pending。
- Kimi：pending。
- GLM：pending。
- 缺签豁免：无；done准入：blocked。未请求用户重复手工复审同一技术证据。

## Build / Review / 用户验收

未开始实现；没有新正式测试或覆盖率提升声明。主审Kimi，GLM提供独立矩阵/边界核对，不分配视觉。
本次只读取证不是实现accept，用户验收pending。

## 交接日志

- 2026-09-16 Codex：用户已转发WORLD/四包工作包并要求继续。避开并行实现区，重核B-06/B-07；
  新增只读双状态诊断，两个模式均符合预期，3文件39项相邻测试绿，未改任何产品/原探针。
  同族方案收敛为本r1 draft，待Kimi/GLM各自设计审查；不重签其它卡、不因旧豁免自行进入build。
- 2026-09-16 Codex：准备期间main收到GLM世界补审5cee883d、四包三席设计及Coding Owner准入648b4086；
  已核相对取证基线产品/脚本零diff，保留他席落盘原文，只同步看板/索引。不用其它卡签字推进本卡。
- 2026-09-16 Codex：文档门首次因四包卡并行变为build而看板/索引未同步报两项；按真实签字状态更新后，
  docs 425篇/2094链接/145卡零问题，文档工具20/20、probe Biome与diff-check通过。不把文档检查说成全仓产品check。

## 下一位Agent提示词

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
