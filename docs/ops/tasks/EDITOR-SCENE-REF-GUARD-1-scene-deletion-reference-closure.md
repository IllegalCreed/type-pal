# EDITOR-SCENE-REF-GUARD-1 - 场景删除前的引用保护补齐

Status: review
Phase: phase2
Capability: ED-3既有引用图正确性 / 审计D-02（不改能力地图）
Coding Owner: Codex
Reviewer: Kimi / GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: codex/editor-scene-ref-guard-r1

Revision: r1，2026-09-18。前提冻结`3bc20273fe88e83da2dcb32f04ea132a0ada60d9`。
用户要求GLM大包与Codex修复双线推进；本卡与[运行时补测卡](TEST-REFORGE-RUNTIME-CONTRACTS-1-runtime-boundaries.md)独立。
当前（2026-09-18）：r1实现与自验完成，Codex accept；待Kimi/GLM独立终审，不重签设计、不标done。
实现候选：`83598cc4e58828ff5ec586c1491da685d564c85c`，对比build准入基线`830db139`；6300223a仅并行卡准入文档。

## 目标与范围

场景仍被其它作者脚本依赖时，在引用列表和删除守卫中一致显示并阻断，不能等删完才在保存时发现悬空。
只处理D-02：selectSceneHooks的inherit/disabled父场景依赖、stateMachine转换条件的currentScene依赖。
覆盖冷删除oracle与暖派生引用快照、真实成对删除、撤销/重做和保存重开；保留use钩子复合边的既有计数语义。

不改schema/content20/SAVE8、content collector公共接口、迁移/生成工程、默认落点、D-06/07、缓存、技能试玩或脚本系统版本。
不重开已done的场景生命周期/历史事务卡，不把额外scene.stages/machine未知字段升级为本卡修复。

## 前提真值门

一句话前提：当前合法作者脚本的三种场景依赖未被editor adapter收进引用图，删除成功后保存正确拒绝悬空。
以下路径省略packages/前缀。

| 维度 | 已核真值与一手证据 |
|---|---|
| 原版 / primary source | 原版创作编辑器N/A。本合同一手真源为当前content/command-target-reference.ts:134/156，currentScene与全部selectSceneHooks均产生scene边；validate-refs.ts:1133缺目标报error |
| 第一阶段 | 无对应创作编辑器，N/A；不涉及原版战斗/地图移动语义，不以旧引擎结构推导修法 |
| 当前二阶段 | editor/project-reference-adapters.ts:215-244白名单漏selectSceneHooks；:1831-1875 snapshot未收transition的scene边。script-editor.ts:918只为use建具体hook边。ScriptEditor.tsx:2531-2577确有继承/禁用作者入口，:1366支持currentScene条件 |
| 当前真实调用 | App.tsx:1707冷provider、:1760-1779暖门+真实成对Delete；project-diagnostics.ts:694/730向同一snapshot传commandVisits/transitionVisits；不是仅审查helper |
| 目标 | 保持content已声明的引用合同：上述三种目标依赖应在删除前出现；无外部引用/仅删除集合内部引用仍可删，删除后保存合法 |

### 本席动态证据（2026-09-18，冻结3bc20273）

原探针零修改，独立复跑均exit0（它们断言未修复现象，不是正确行为门禁）：

```sh
node --import tsx docs/ops/audits/pre-e2e/probe-editor-reference-delete.mjs
node --import tsx docs/ops/audits/pre-e2e/probe-glm-reference-prep.mjs
```

disabled/inherit/transition均blockers=0、真实成对删除成功、随后保存拒“场景target不在scenes”；undo恢复。
use正控blockers=1、删除拒绝、保存合法。第二探针从buildBlankProject经正式loader进入双session，排除了非法主fixture。
相邻project-reference/project-reference-adapters/project-reference-adapters.boundaries/scene-lifecycle共4文件40项绿。
日志`/tmp/type-pal-next-parallel.0bsDcW/reference-{original,prep,adjacent}.log`；命令和原探针均入仓可重建。

最强替代解释与排除：

- “禁用钩子不依赖场景”：不依赖某个具体hook，不等于不依赖scene；typed collector及保存校验明确相反。
- “假fixture/未支持语法”：正式loader+UI可编辑域+合法保存正控均成立；未把未知根字段当脚本域。
- “迁移或提取错”：反例为生成的极小空白工程加合法作者脚本，不用PAL；修复层在editor adapter，不改生成产物。
- “删除入口绕过守卫”：真实Coordinator及两Delete命令、App调用相同；use正控确被守卫拒绝。
- “不可恢复数据丢失”：保存仍拒且undo可恢复，维持P2，不夸大为磁盘永久丢失。

可证伪：若typed合同不再包含该依赖、主载荷不被当前loader接受、真实删除已拒或use出现重复计数，则停线收窄。
before→after为“允许删后保存失败→有依赖时直接拒删”，恢复既有安全删除合同，不是新产品选择。

## 设计与实现边界

1. 只在editor引用adapter补齐域；复用content现有typed collector，不另写递归、tag判断或字符串扫sceneId。
2. command域接入selectSceneHooks。具体scene-hook边仍由canonicalSchemeReferenceEdges负责；
   use已有复合边会进入父scene桶，不再叠加同一用途的第二条hook/父边。纯inherit/disabled保留场景边。
   两槽混合use/disabled、多use各真实hook、跨场景/自引用都需计数与删除集合测试，不能只看blockers>0。
3. transition域复用collectCanonicalScriptTransitionVisits（script-editor.ts:371/404）给出的每state.next一次根，
   经collectCommandTargetReferences读取currentScene的scene边（含嵌套转换与all/any/not）。不重复扫描命令body或entity-address域。
4. scene边带真实owner/where/deletePolicy；转换沿用actor/item转换已用的script-owner locator（adapter:667），
   App.tsx:1050-1095已有owner导航。列表显示精确where，点击到所属状态机方案；不冒称已新增条件叶级自动聚焦。
5. 同一个buildProjectReferenceSnapshotFromProjection供冷provider与暖诊断使用，不设第二套UI-only拦截。
   来源deletedWith沿用现有逻辑，自己/同删除集合内部引用不阻断，外部引用必须阻断。
6. 原审计探针保持历史，不为修复后让旧缺陷断言继续绿而改产品；新正确合同回归进入正式fast。

生产默认只允许packages/editor/src/core/project-reference-adapters.ts；确有必要改调用接线须先记录证据，
不得顺带重构App/历史核心/公共模型。正式测试可新增project-reference-scene-guards.test.ts、
scene-reference-deletion-workflow.test.ts及薄test-only fixture；可定点补project-diagnostics.test.ts证明真实暖链。
文档/隔离负控/最小视觉证据归本卡。与GLM的reforge十模块生产冻结面不相交。

实现期测试联动（Codex，2026-09-18）：完整check首次遇PAL引用census断言25188→25189。
直接核projects/pal/content/scenes/s172.json:1435双disabled目标s182，正是本卡补回的一条父场景边。
允许定点更新project-reference.pal.test.ts的两项总数（rows+1/targetEdgeIds+1），并新增该边target/where/owner/locator/policy完整断言；
既有hook293、behavior4459及其它parity/体积断言原样保留。不改PAL数据或其它实现，不因正确修复维持旧漏边计数。

## 验收与验证

- 三反例改为先红后绿；use、无依赖、仅自身/同删除集合依赖为正控。完整断言目标、where、owner、关系、计数及无额外边。
- entity trigger/auto及scene onEnter/onTeleport状态机条件；共享/物品私有命令域的合法selectSceneHooks；
  all/any/not及嵌套transition；非法域不强造，复用当前guard/loader先证明fixture合法。
- 冷provider与真实暖派生管线得相同依赖；改脚本/撤销/重做后旧暖快照不能使冷守卫失效。
- 真双session+Coordinator+两Delete命令：拒删不变且不新增历史；解除外部依赖可删→保存/正式loader重开→undo恢复→redo可重存。
- 至少三条单点负控：漏命令场景边、漏transition接线、错误豁免/重复边之一；正常对照绿、实际新增业务断言红、不得只用TypeError。
- 定向/相邻/tc/Biome，最终串行check→ratchet→受保护单次fast；其它包不得漂移或降阈值。GLM补测集成另排，不并发跑官方门。
- Codex最小功能验证：小测试工程的场景“引用”列表显示三类来源；点击到正确脚本owner；删除阻断可操作，解除后删除/撤销有效。
  不要求GLM浏览器/截图；不要求用户跑技术命令。完整保存重开创作流程仍在R4复验，不以本卡代替E2E。

## 上下文与禁止回退

[READ-FIRST](../../phase2/READ-FIRST.md)、[D-02审计](../audits/pre-e2e/editor-workflows.md#d-02--引用图遗漏部分场景依赖)、
[GLM取证包已接收结果](../../testing/glm-pre-e2e-prep-report.md)、[内容补测接收](../../testing/content-contracts-review.md)。
当前引用图/保存守卫/历史事务已存在，不能降低保存校验来让删除变绿，不能改成无条件禁止删场景，不能引入旧schema兼容。

## Build与验证

实现基线830db139；生产仅project-reference-adapters.ts，复用现有typed collector补命令父场景边与转换条件边。
两个新正式测试文件22项，薄fixture由真实seed/loader装配；PAL旧census仅联动两项+1并钉真实s172→s182新增边。
定向+相邻108项与editor tc通过，一对照/三变异业务负控通过；最终树串行check7442、ratchet与受保护单次strict-fast6954/617全部exit0。
过程失败/订正、验证边界、重建命令详见[实施回执](../../testing/scene-reference-guard.md)，不把早期坏fixture当产品反例。
Codex实际浏览器已核三条引用可见/可定位/阻断，解除后删除与撤销、引用数逐次恢复；
真实App与worker，内存隔离工程，1280×720截图记录于本会话浏览器工具；[可重建入口](../../testing/scene-reference-guard-visual.mjs)。
没有改用户/PAL文件，无视觉任务交给GLM/Kimi；完整Root/OS保存重开仍归R4，不冒称E2E已完成。

## 推进签字

### build前（r1）

- Codex：**premise verified / design agree（2026-09-18）**。本人直读上列collector/adapter/冷暖consumer/删除命令入口，
  独立重跑两个原probe及40项相邻测试，三类漏边与use正控一致。确认是adapter域漏接、非迁移/未知字段/永久丢失。
  最强反证及去重/locator边界见上，设计保持现有公共合同与UI形态；待两席直接取证后实施。
- Kimi：**premise verified / design agree（2026-09-18，r1，冻结 3bc20273；全部证据本人直读/复跑，未读 GLM 结论——其签字于本人核查完成后落盘，仅确认席位位置）**。
  - **三类漏边直读**：`command-target-reference.ts:134/156` currentScene 条件与 selectSceneHooks
    均产生 scene 边（content 合同已含）；`project-reference-adapters.ts:215-244`
    `canonicalCommandTargetEdges` 的 kind 白名单**无 selectSceneHooks**——collector 产出的边在
    adapter 被丢；`script-editor.ts:918` 仅 use 建具体 hook 边（inherit/disabled 无边）；
    transitionVisits 进 snapshot 但转换条件的 scene 边未收。ScriptEditor.tsx:2531/1366 继承/禁用
    与 currentScene 条件作者入口真实存在。
  - **本人复跑**：probe-editor-reference-delete exit 0——disabled/inherit/transition 三族
    blockers=0、真实成对删除成功、随后保存拒「场景 target 不在 scenes」、undo 恢复；use 正控
    blockers=1、删除拒绝、保存合法。probe-glm-reference-prep exit 0：删除集合内部豁免机制
    （G-R08/09）可复用、use locator 稳定；G-R05/06/07 的 risk 如实分栏（嵌套条件矩阵未逐一
    动态核、根字段主张撤回、暖链 UI 消费证据待采集）——不冒充全证。相邻 4 文件/40 项绿。
  - **真实调用域直读**：App.tsx:1707 冷 provider/:1760-1779 暖门+成对 Delete、
    project-diagnostics.ts:694/730 同一 snapshot 传 commandVisits/transitionVisits——修复层确在
    editor adapter，非迁移/未知字段/loader 缺陷。
  - **设计同意**：只补 adapter 域、复用 content 现有 typed collector（不写第二套递归/字符串
    扫描）；use 复合边进父 scene 桶不叠加第二条、纯 inherit/disabled 保留场景边（既有计数语义
    保持）；transition 经 collectCanonicalScriptTransitionVisits 每 state.next 一根 +
    collectCommandTargetReferences 读 currentScene 边（含嵌套/all/any/not），不重复扫 body/
    entity 域；边带真实 owner/where/deletePolicy，转换沿用 script-owner locator；冷暖共用同一
    snapshot 构建器；删除集合内部豁免沿用现有逻辑；原探针保持历史不改产品。范围确停 D-02，
    不重开已 done 卡、不升级未知字段、不降保存校验。
  - **可证伪观察**（任一反例即收窄或 counter）：① typed 合同不再含这三类依赖或主载荷不被
    当前 loader 接受 → 前提倒（本人复跑否定）；② 修复后 use 出现重复计数/额外边 → 去重破；
    ③ inherit/disabled 或 transition 条件漏边仍在删除守卫缺席 → 接线未闭合；④ 冷 provider 与
    暖派生得不同依赖集 → 双链不一致；⑤ 仅自身/同集合内部引用被误阻断或外部引用漏阻断 →
    豁免错；⑥ 实现改动超出 adapter+新测试面（App/历史核心/公共模型被顺手重构）→ 越界。
  - 返工项：无。非阻断备注：G-R05 嵌套条件矩阵的动态覆盖须在正式回归中落实（验收已列
    all/any/not+嵌套 transition）；G-R07 暖链 UI 消费证据按验收「冷暖相同依赖」闭环。
- GLM：**premise verified / design agree（2026-09-18，r1，冻结 3bc20273；本席只审前提与矩阵，锚点本人直读，未读 Kimi 席位）**。
  - **typed 合同直读**：content/command-target-reference.ts:134 `currentScene`→`condition-current-scene`
    场景边、:156 `selectSceneHooks`→`select-scene-hooks` 场景边均在现行 typed collector；validate-refs.ts:1133
    currentScene 缺目标报 error——"content 已声明该依赖、editor adapter 漏收"的前提成立。
  - **漏边锚点直读**：editor/project-reference-adapters.ts:215-244 `canonicalCommandTargetEdges` 白名单
    （loadScene/setSceneMapOverride/openShop/startBattle/setAmbience/toggleDayNight/learnSkill/branch/loop）
    确无 selectSceneHooks；:1831-1875 `buildProjectReferenceSnapshotFromProjection` 拿到 transitionVisits
    只喂 actor/item 边，无 transition→scene 域——两类漏接与卡面一致。
  - **动态复现**：本人独立复跑两原 probe 均 exit0——disabled/inherit/transition blockers=0、删除成功、
    保存拒『场景 "target" 不在 scenes』、undo 恢复；use 正控 blockers=1 删除拒、保存合法。第二探针
    G-R06 已撤回根级字段主张、G-R05 嵌套矩阵与 G-R07 暖链消费证据未采集——与卡面"不扩大范围"口径一致。
  - **真实调用/相邻**：App.tsx:1707 冷 provider、:1760-1779 真实成对 Delete（blockers 非零即 throw）；
    project-diagnostics.ts:694/730 双 visits 进同一 snapshot builder；本人复跑 4 个相邻测试文件 40/40 绿。
  - **design agree**：只补 adapter 域、复用 content typed collector 不另写递归、冷/暖共用同一
    snapshotFromProjection、use 复合边不叠第二边、删除集合内部豁免保持——修复层选择与漏边根因匹配；
    生产默认只动 project-reference-adapters.ts 的边界合理。**验收侧非阻断提示**：G-R05（all/any/not
    嵌套转换矩阵）与 G-R07（暖链 UI 消费证据）在验收时应逐项闭环，不只看 blockers>0。
  - **可证伪观察**：①typed collector 若不再产出该 scene 边→前提失效停线；②修复后 use 出现重复
    hook/父边计数→设计 2 违反；③删除集合内部引用被外部豁免替代→设计 5 违反；④为让旧探针绿而改
    探针/降保存校验→禁止回退条款违反。
  - 返工项：无。
- build准入：**build allowed（Codex，2026-09-18，接手948e0328）**。本卡三席同r1、冻结3bc20273，独立前提证据齐、无counter；
  用户确认“签了”。仅开放本卡adapter/测试/文档/功能验证范围，不复用或扩大其它卡授权。

### done前

- Codex：**accept（2026-09-18，r1，Coding Owner实现者自验；候选83598cc4，对比830db139）**。
  - 生产只改adapter；22项新回归覆盖六命令owner、四转换owner、all/any/not/嵌套转换、use去重、自引用/删除集合，
    真实冷provider与derived store/worker init/patch、拒删无历史副作用、解除后删/序列化正式重开/undo/redo闭环。
  - PAL真树新增边精确为s172双disabled→s182，rows25189/targetEdgeIds28090，原hook293/behavior4459及其它parity断言不变；未改PAL数据。
  - 正常对照22绿、三条单点坏实现均指定新业务断言红，函数内执行marker+JSON见证，污染日志判据拒绝；产品hash不变。
    早期fixture/locator/负控标题订正与PAL census失败均如实记回执，不掩盖或冒充最终证据。
  - 定向连相邻108、tc/Biome；最终串行check7442→ratchet→受保护单次fast6954全部通过。其它六包基线对象/旧测试身份/源清单不变。
  - Codex真实App/worker最小功能验证通过：三引用显示与阻断、正文精确/转换owner定位、表单解除依赖后删除、撤销恢复与引用数恢复。
    测试仅内存工程；无用户/PAL目录写入、无OS保存/E2E冒称。视觉不交GLM/Kimi重复。
  - 旧版本兼容审查pass：无旧版本分支/upgrader/fallback变动；未改content/SAVE/迁移或GLM冻结面。
- Kimi：**accept（2026-09-18，r1 独立终审，候选 `83598cc4` 对比 `830db139`；设计不重签；未读 GLM 本轮结论）**。
  接手 HEAD `a6725f5e` 与 origin/main 一致、工作树干净；候选后产品/脚本/锁文件零漂移。
  - **单 adapter 补边**：`project-reference-adapters.ts:223` 白名单接入 selectSceneHooks——
    collector 产出的 scene 边不再被丢；`:236-239` 同步排除 scene-hook 目标（具体 hook 边仍归
    canonicalSchemeReferenceEdges，use 复合边进父 scene 桶，不叠加第二条）；新增
    `canonicalTransitionSceneEdges`（:252-268）每个 state.next 一根、经现有递归 collector 只转
    scene 目标、script-owner locator 复用；接入共享 `buildProjectReferenceSnapshotFromProjection`
    （冷暖同源）。生产仅此一个文件（diff 实测）。
  - **PAL 新增一边直读**：project-reference.pal.test.ts 补 s172 双 disabled→s182 的完整边断言
    （target/where/owner/locator/deletePolicy 逐项钉住）；rows 25188→25189、hook 293/behavior
    4459 原断言不变——正确修复的 census 联动，非抖动。
  - **本人复跑**：定向+相邻 **8 文件/108/108** 绿（含新 22 项：六个 command owner、混合/双 use
    去重、四类状态机 owner 下 all/any/not/嵌套 transition、删除集合豁免、暖派生与冷一致、
    真实删除→serializer→loader 重开→undo/redo）；editor typecheck exit 0（抽查）；
    入仓 `scene-reference-guard-mutants.mjs`：**对照绿 + 3 针全业务红**（漏 selectSceneHooks
    准入/漏 transition 接线/重复 use-hook 边），判据拒 TypeError/超时且含混合错误自测，
    产品 SHA 不变。
  - **质量门交叉核**：check-release editor 2,503（总 7,442）；受保护 strict TOTAL
    **617 文件/6,954 项**；基线 diff 实测 editor 2295→2344（新增测试），仅 editor 包级
    digest 变化、旧 218 文件 identity 逐项不变、零移除零降阈。
  - **视觉复用**：Codex dev-functional 验证（三类阻断显示、正文/转换定位、解除后删除、撤销
    恢复计数）在案，本席不重复浏览器流程；完整保存重开创作链归 R4。
  - **旧版本兼容审查：pass**——无版本分支/upgrader/fallback；原审计探针零修改（断言缺陷
    存在的历史预期不改成凑绿）。
  返工项：无。本 accept 不代签、不授权 done；D-06/D-07、G-R06 等剩余归属不关闭。
- GLM：pending。
- done准入：未开放，待两席独立终审；本席不代签、不标done。

## 交接日志

- 2026-09-18 GLM（r1 覆盖/回归终审）：签 accept，无 counter。独立复跑 mutants（1 对照+3 针全符合、
  钉名 AssertionError 业务红、函数内 marker、产品 hash 不变）、8 文件 108 定向、editor typecheck；
  直读生产 diff/fixture/22 断言/PAL s172→s182 工程数据/基线结构化 diff（仅 editor 节、旧身份
  0 改 0 删、六包逐字节不变、6932+22=6954 自洽）。未读 Kimi 结论、未改实现/他席/状态。
  Next：两席 accept 齐，Codex 统一核定 done。
- 2026-09-18 Kimi（r1 独立终审）：同步 `a6725f5e`、工作树干净后核 `830db139 → 83598cc4`。
  直读 adapter 三处（白名单接入 selectSceneHooks、scene-hook 目标排除去重、
  canonicalTransitionSceneEdges 递归域）与共享 snapshot 接线；PAL 新增一边（s172→s182 完整
  断言、rows +1、其余计数不变）。复跑定向+相邻 108/108、typecheck、入仓 3 针负控全业务红+
  对照绿；交叉核 check 7,442、strict 617/6,954、旧 identity 零移除。视觉复用 Codex 证据。
  旧版本兼容 pass；原探针不改。签 accept，无返工项；未改实现/他席/状态，未读 GLM 结论。
  Next：GLM 并行终审落卡后，Codex 统一核定 done。
- 2026-09-18 Codex：完成r1单adapter修复、22新回归、PAL一条真实补边的census联动及三针隔离负控。
  最小真实App视觉/交互闭环通过；最终check7442/ratchet/受保护单次fast6954绿，候选83598cc4。沿用同r1设计，推进review，给两席并行终审。
  同步GLM6300223a准入文档、协调其顶部状态/看板为build，但未合入其任何新测试或生产改动；所有签字原文保留。
- 2026-09-18 Codex：同步948e0328、工作树干净，核GLM eba8b810与Kimi b2603c41均同r1设计同意且无counter，登记build。
  实施先钉三反例与use去重/集合豁免/冷暖同源，再修adapter；原探针不改。GLM运行时补测由其按独立卡核准入，本卡不触其冻结面。
- 2026-09-18 Kimi：完成 r1 独立前提/设计审查，签 premise verified + design agree，无返工项。
  直读 command-target-reference.ts:134/156 typed 合同、adapters:215-244 白名单漏 selectSceneHooks、
  script-editor.ts:918 仅 use 建边、冷暖 snapshot 链与 App 删除入口；复跑两原探针（三漏边 blockers=0+
  保存拒+undo 恢复、use 正控拒绝）与相邻 40 项绿；G-R05/06/07 风险分栏核实。六条可证伪观察
  写入本席；范围确停 D-02 不重开已 done 卡。未改实现/他席/状态，未读 GLM 结论。
  Next：三签齐后 Codex 核定 build 准入并实施；dev-functional 视觉归 Codex。
- 2026-09-18 GLM：完成前提/矩阵审查，签 premise verified + design agree，无返工项。直读
  command-target-reference/validate-refs typed 合同与 adapters 白名单/snapshot 漏接；独立复跑两
  原 probe（三漏边+use 正控+保存拒+undo 一致）与 4 文件 40 相邻绿。未读 Kimi 结论；未改任何
  实现。Next：三席齐且无 counter 后 Codex 核定 build 并实施修复。
- 2026-09-18 Codex：按用户双线要求选定D-02；最新主线复现并核40相邻，编写r1前提/方案/验收。仅文档，无实现。
  内部Codex只读分工另盘点GLM测试候选，不作为外席签字；本卡前提与设计由主Owner独立核。

## 下一位Agent提示词

### Kimi · r1独立终审（与GLM并行）

```text
在 /Users/zhangxu/illegal/type-pal 独立终审 EDITOR-SCENE-REF-GUARD-1 r1。
卡：docs/ops/tasks/EDITOR-SCENE-REF-GUARD-1-scene-deletion-reference-closure.md，review；候选83598cc4e58828ff5ec586c1491da685d564c85c，对比830db139。设计不重签。
先同步检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡和docs/testing/scene-reference-guard.md，独立读取源码与测试，不读取或复述GLM结论。
核唯一生产adapter是否完整补inherit/disabled与transition scene边，复用typed collector且不重复body/entity域；use复合边保持计数、内部删除集合豁免正确；where/owner/locator/deletePolicy与冷暖消费一致，不新增公共模型或降低保存守卫。
核22项正式回归的当前合法fixture、六command owner/四transition owner、嵌套条件、真实worker init/patch及删→序列化完整正文/资产保留→正式重开→undo/redo。PAL原例只补s172双disabled→s182一条边（25189/28090），其它parity及体积断言保留。
复跑卡内定向与node docs/testing/scene-reference-guard-mutants.mjs（控制22绿、3单点变异指定新测试业务红、运行态marker与JSON见证）。核check7442、ratchet和TYPE_PAL_COVERAGE_BASE_REF=830db139 pnpm coverage:fast单次6954/617证据；旧测试身份与其它六包基线不变。日志/tmp/type-pal-scene-ref-build.CyLL0V/。原审计probe是历史缺陷断言，不作修复后绿门。
Codex已做最小真实App/worker功能验证，复用回执，不重复浏览器；Root/OS保存与完整E2E未宣称完成。
只写本人终审accept或counter（file:line/复现/返工项）及本人日志，提交前同步保留他席并提交推送；不得改实现、其它席位或状态，不代签、不标done。无阻断交Codex核收口。
```

### GLM · r1覆盖/回归终审（与Kimi并行）

```text
在 /Users/zhangxu/illegal/type-pal 独立终审 EDITOR-SCENE-REF-GUARD-1 r1。
卡：docs/ops/tasks/EDITOR-SCENE-REF-GUARD-1-scene-deletion-reference-closure.md，review；同候选83598cc4e58828ff5ec586c1491da685d564c85c，对比830db139。设计不重签，本卡与运行时五组补测独立。
先同步检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡和docs/testing/scene-reference-guard.md；直接核证据，不读取或复述Kimi结论。
重点对账22回归：fixture先过真实loader/保存校验；每种漏边、use去重、all/any/not/嵌套转换、六command/四transition来源、内部豁免、拒删零历史变化、真实冷暖worker与保存文件集重开都有业务断言。检查完整正文/资产字节/删除路径，而非仅ID或计数。
复跑node docs/testing/scene-reference-guard-mutants.mjs（1控制+3变异，22项每次真实执行，指定新增标题AssertionError红，函数内marker，混合宿主错误拒绝、hash不变）；按需108定向相邻、PAL单例/tc/Biome。核PAL新增恰s172→s182一边，rows25189/targetEdgeIds28090，其它旧断言原样；check7442与单次受保护fast6954/617、其它六包基线/旧测试身份不变。过程失败已分栏，不把早期坏fixture或旧census失败当最终证据。
不做浏览器/截图/视觉复验，使用Codex已落最小功能回执；不操作工程数据，不自行跑ratchet改基线。你的运行时测试包继续独立推进，不把其未接收测试混入本卡。
只写本人accept或counter（file:line/复现/返工项）和本人日志，同步保留他席后提交推送。不得改产品、测试、他席或状态，不代签、不标done。
```

### 历史设计提示（已完成，不重签）

两段完整可复制提示词统一见[并行测试卡交接区](TEST-REFORGE-RUNTIME-CONTRACTS-1-runtime-boundaries.md#下一位agent提示词)，同钉两卡r1与冻结3bc20273。
GLM与Kimi本阶段可并行审本卡及TEST-REFORGE-RUNTIME-CONTRACTS-1；各自不读/复述另一席结论。
先读AGENTS/CLAUDE/READ-FIRST、两卡及各一手锚点。本卡直接复跑上述scene probe，核目标域/真实调用/去重/定位/删除集合。
各席仅写本人premise verified（直接证据和可证伪观察）及design agree或counter、本人日志，提交前同步并推送。
不改状态/他席、不开始本卡实现、不标done；签齐由Codex推进。另一测试卡签齐后由GLM核准入并连续执行整包。
