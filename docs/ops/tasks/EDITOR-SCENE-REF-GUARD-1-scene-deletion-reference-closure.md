# EDITOR-SCENE-REF-GUARD-1 - 场景删除前的引用保护补齐

Status: draft
Phase: phase2
Capability: ED-3既有引用图正确性 / 审计D-02（不改能力地图）
Coding Owner: Codex
Reviewer: Kimi / GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: codex/editor-scene-ref-guard-r1（设计通过后使用）

Revision: r1，2026-09-18。前提冻结`3bc20273fe88e83da2dcb32f04ea132a0ada60d9`。
用户要求GLM大包与Codex修复双线推进；本卡与[运行时补测卡](TEST-REFORGE-RUNTIME-CONTRACTS-1-runtime-boundaries.md)独立。
当前只读复现/方案完成，未修改产品或正式测试；新范围设计三签尚未齐，不能开始build。

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

## 推进签字

### build前（r1）

- Codex：**premise verified / design agree（2026-09-18）**。本人直读上列collector/adapter/冷暖consumer/删除命令入口，
  独立重跑两个原probe及40项相邻测试，三类漏边与use正控一致。确认是adapter域漏接、非迁移/未知字段/永久丢失。
  最强反证及去重/locator边界见上，设计保持现有公共合同与UI形态；待两席直接取证后实施。
- Kimi：pending（独立前提证据与design agree/counter）。
- GLM：pending（独立矩阵、冷暖/去重/fixture核对及premise/design）。
- build准入：未开放；本卡三席同r1齐且无counter后由Codex核定，不复用其它卡签字或豁免。

### done前

- Codex：pending。
- Kimi：pending。
- GLM：pending。
- done准入：未开放。

## 交接日志

- 2026-09-18 Codex：按用户双线要求选定D-02；最新主线复现并核40相邻，编写r1前提/方案/验收。仅文档，无实现。
  内部Codex只读分工另盘点GLM测试候选，不作为外席签字；本卡前提与设计由主Owner独立核。

## 下一位Agent提示词

两段完整可复制提示词统一见[并行测试卡交接区](TEST-REFORGE-RUNTIME-CONTRACTS-1-runtime-boundaries.md#下一位agent提示词)，同钉两卡r1与冻结3bc20273。
GLM与Kimi本阶段可并行审本卡及TEST-REFORGE-RUNTIME-CONTRACTS-1；各自不读/复述另一席结论。
先读AGENTS/CLAUDE/READ-FIRST、两卡及各一手锚点。本卡直接复跑上述scene probe，核目标域/真实调用/去重/定位/删除集合。
各席仅写本人premise verified（直接证据和可证伪观察）及design agree或counter、本人日志，提交前同步并推送。
不改状态/他席、不开始本卡实现、不标done；签齐由Codex推进。另一测试卡签齐后由GLM核准入并连续执行整包。
