# GLM运行时状态与作者元数据 · 六组补测工作包

任务：[TEST-RUNTIME-STATE-BOUNDARIES-1](../ops/tasks/TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md)，r1/draft。
生产冻结：`e58834f6389a40ffe9f187e6a8051f552e964d79`。GLM负责非视觉测试，Codex负责独立接收/集成，Kimi终审。
与[独立技能试放卡](../ops/tasks/EDITOR-SKILL-TRIAL-1-isolated-battle.md)分开；不是继续修改已done的运行时十模块包。
一次完成六组，39个待核用例族；不是39条或某个固定数量的新测试承诺。已有有效断言直接复用登记，未知合同隔离，不凑覆盖率。

## 派发时事实（Codex独立核定）

官方fast7049项/617生产文件。下表来自当前官方报告，主Agent已复算且直读目标源码/调用；内部只读盘点不冒充外部席位签字。
L/B为行/分支命中数。合计576/657行、475/639臂；164个未命中臂不等于164个bug，也不保证都可合法构造。

| 组 | 模块（相对packages） | L | B | 真实调用锚点 |
|---|---|---:|---:|---|
| A | content/src/world-variable.ts | 47/51 | 35/44 | content/src/character.ts:337；reforge/src/project-loader.ts:285附近 |
| A | content/src/migration-diagnostic.ts | 32/42 | 48/62 | reforge/src/project-loader.ts:281-285；migrate/src/pal-current-publication.ts:351 |
| B | reforge/src/runtime-script-compiler.ts | 19/20 | 6/9 | editor/core/playback.ts:423/437；reforge/runtime-script-project.ts:332/394/420 |
| B | reforge/src/runtime-project-view.ts | 67/71 | 65/83 | reforge/main.ts:364/477/719/3736；scene-switch-transaction.ts:53 |
| C | reforge/src/entity-action-player.ts | 150/175 | 136/183 | reforge/main.ts:522；editor/playback动作预演 |
| D | reforge/src/frame-animation-player.ts | 97/114 | 47/67 | reforge/main.ts:794/2768；editor/ui/FrameAnimationEditor.tsx:185 |
| E | reforge/src/magic-menu-state.ts | 65/81 | 65/97 | reforge/main.ts:6552-6592/6762，仅导航/确认域 |
| E | reforge/src/system-menu-state.ts | 28/28 | 33/41 | reforge/main.ts:6709/6723/6731，仅返回action |
| F | reforge/src/scene-entry-session.ts | 21/23 | 16/21 | reforge/main.ts:793/1677/2925 |
| F | reforge/src/screen-hold-transaction.ts | 16/16 | 6/8 | reforge/main.ts:1257/1642/1655 |
| F | reforge/src/menu/reward-gain-queue.ts | 34/36 | 18/24 | reforge/main.ts:5416/5448/6503 |

Codex已复跑既有content两文件10项、Reforge九文件80项（含runtime-script-project，覆盖编译器相邻入口）全部绿。
日志`/tmp/type-pal-next-state-{content,reforge}.log`。没有新增正式测试，没有改生产或官方基线。

## 唯一新增测试白名单

```text
packages/content/src/world-variable.boundaries.test.ts
packages/content/src/migration-diagnostic.boundaries.test.ts
packages/reforge/src/runtime-script-compiler.boundaries.test.ts
packages/reforge/src/runtime-project-view.boundaries.test.ts
packages/reforge/src/entity-action-player.boundaries.test.ts
packages/reforge/src/frame-animation-player.boundaries.test.ts
packages/reforge/src/magic-menu-state.boundaries.test.ts
packages/reforge/src/system-menu-state.boundaries.test.ts
packages/reforge/src/scene-entry-session.boundaries.test.ts
packages/reforge/src/screen-hold-transaction.boundaries.test.ts
packages/reforge/src/menu/reward-gain-queue.boundaries.test.ts
```

另允许两包各一个薄fixture：`src/__tests__/glm-state-boundary-fixtures.ts`；
`docs/testing/glm-runtime-state-mutants.mjs`、`glm-runtime-state.config.mts`、`glm-runtime-state-evidence.json`；
本工作包GLM回执、本人卡签字/日志及必要索引登记。开始前确认路径未占用，不覆盖同名成果。
独立worktree建议`/Users/zhangxu/illegal/type-pal-glm-runtime-state`，分支`codex/glm-runtime-state-boundaries-r1`。
不在主worktree切分支，不恢复stash，不提交gitignored资产。

## A · 作者变量与诊断（A1–A7）

旧测试去重：world-variable.test.ts:9/40/58；migration-diagnostic.test.ts:24/29。

1. **A1** ID128/129、name80/81、description500/501长度边界；合法上界与超界只差一轴，小数/负数/false仍合法。
2. **A2** registry/root/definition错型、kind错型、flag非boolean、number非有限值，钉准确错误路径及原输入不变。
3. **A3** 空description合法、空name非法，ID与文本各按自身规则；不把sys命名空间规则套给普通文本。
4. **A4** 两次初始化与registry双向独立：修改一个结果不污染另一结果/作者定义；与已有fresh引用断言去重。
5. **A5** diagnostic root/version/diagnostics容器及成员错型；主fixture先过现行守卫，反例只坏目标轴。
6. **A6** target domain/objectId/label与source kind/address各自路径；address0合法、负数/小数拒绝。
7. **A7** 五category×三capability支持域，返回同一输入对象；已有值复用，不发明拒绝所有额外字段的exactKeys政策。

局部V1容器与legacy-script来源标签仍是当前合同，不是应删除的旧版本兼容。

## B · 当前编译与只读投影（B1–B7）

旧测试：runtime-script-project.test.ts:105/150/263；runtime-project-view.test.ts:96/118/165/180。
只经current validator入口，不用unchecked/base编译器绕门。script-compiler-core可读，不是新增目标模块。

1. **B1** RuntimeSharedScriptResolver同id的auto/interactive×perCommand/transition缓存隔离，核完整after/元数据，不只对象不等。
2. **B2** 缺脚本/非法digest与两独立resolver同id不同正文；不要求构造后任意改library会自动失效。
3. **B3** 当前合法命令/flow编译后修改产物不污染真正传入的条件/地址/entry；深快照同一输入，不比另一份fixture。
4. **B4** page/trigger/auto/hook从有→无→有刷新：字段精确删除/恢复，保留活体位置/方向/显隐/碰撞；canonical不变。
5. **B5** stages/stateMachine hook游标选择entry，投影为对应reveal、空prepare/空body，不复活可执行正文投影。
6. **B6** captureRuntimeSceneBehaviorDependencies实体换序稳定；相关page/behavior/activation/animation变化有差，无关场景不误报。
7. **B7** items use/throw与scratch可选分支完整值/双向别名；shared/private正常稳定引用。D-07共享ID前缀歧义已有登记，遇到只追加证据，不固化错误/改产品。

## C · 实体动作播放器纯状态（C1–C6）

旧entity-action-player.test.ts:41–231已覆盖位置、变长步骤、独立相位、intro、基础轨冻结、幂等、stop、abort、清场；不要改名复制。

1. **C1** 真实resolveSpriteActionBinding守卫：frameCount/实际帧范围/duration/loopFrom轴；合法SpriteDef先验证。
   不把非法ResolvedEntityAction直接塞入play绕前置，再发明它的事务原子保证；发现实际入口缺陷隔离上报。
2. **C2** 单次动作startAtMs越尾：promise兑现、override不悬挂、历史cue不补发。
3. **C3** 无基础轨覆盖的自然结束/stop/clearEntity三条收尾；再次advance不重复cue/兑现。
4. **C4** 活动override期间setBase删除/替换，结束后恢复正确的新基础轨，不接回旧轨。
5. **C5** 旧signal在覆盖接管/stop之后abort，不能删新override；核实际监听add/remove与deferred顺序。
6. **C6** exact boundary/半步startAtMs、dt=0/非法dt；帧号及完整cue轨迹。已测轴登记已有，不做像素/观感判断。

## D · 帧动画读取与取消（D1–D7）

旧frame-animation-player.test.ts:59/77/106/127/144/162/181已涵盖基本缓存/LRU/闭区间/失败/跳过/abort。
用合法TPFS与真实parser/block decoder，位图只断言字节和提交轨迹，不用浏览器/截图。

1. **D1** 容器首读失败→同reader修复→成功，读次数及实际内容；拒绝Promise不能永久缓存。
2. **D2** block inflate首败→同reader重试，inflight回零，合法字节真实decode，不只spy被调用。
3. **D3** frameLimit正整数、frameIndex负/非整数/上界；0/末帧正控，不能被坏fixture提前拦住。
4. **D4** 已完成后的invalidate(asset)只清指定项、invalidate()全清，再读同id新字节。**进行中invalidate回填政策未定，禁止默认绿固化。**
5. **D5** 小frameLimit跨block/asset的LRU，核被淘汰者和命中更新，不只size上界。
6. **D6** sequence/frame/wait三个await处分别abort：对外及时拒绝、迟到不onFrame、原异常与监听释放。
   不要求取消没有signal参数的底层Promise；观察外层生命周期，不用固定sleep代替进入见证。
7. **D7** 非目标key不吞，目标key消费，frame在途skip不补迟到帧；onFrame/wait抛错也清监听。

## E · 菜单状态（E1–E6）

仅magic-menu-state.ts:29–145与system-menu-state.ts导航/请求域；**不调用castOutdoorSkill，不碰治疗/毒/战斗公式**。
旧magic-menu-state.test.ts:56–152、system-menu-state.test.ts:12–78需先逐项去重。

1. **E1** learnedSkills混合缺id、非outdoor与合法技能，精确顺序/过滤；world/skills定义不变。
2. **E2** 通过真实导航进入不同phase，再调其他phase操作，核完整no-op合同。
3. **E3** 施法人缺席/死亡、无技能、缺选中技能的guard，同输入正控；不靠NaN/随便改私有状态造指标。
4. **E4** castAll/toTarget完整返回、缺省MP成本/恰好足够/targetIdx重置。**magicConfirmSpell按当前合同原地改菜单state，不一概要求state不可变**；world/技能定义不可被改。
5. **E5** system四方向/记忆cursor边界/非menu确认不重复action；空态经close入口产生。
6. **E6** music/sound显式on/off与audio缺席默认，确认/取消完整state/action；save/load仅核返回请求，不做存储IO。

magic文件覆盖数字含排除的施放结算区，不能承诺本包把整文件补到某个比例。

## F · 呈现事务与提示队列（F1–F6）

旧scene-entry-session.test.ts:11–56、screen-hold-transaction.test.ts:5–37、reward-gain-queue.test.ts:9–72。

1. **F1** fade out/in与dither ms/source分别失配，cut正控；错误后当前session保持。source只用合法union值。
2. **F2** prepare→reveal→cancel的heldFrame/active；同场景同配置二次begin仍隔离token，旧complete不能清新事务。
3. **F3** ScreenHold同token文字的新owner；旧owner取消不影响新事务，当前owner能清；空token拒绝保留活动态。
4. **F4** finalizer正常返回原值且零调用；失败一次收口/原Error身份（失败主干已有，去重）。
5. **F5** 活动请求期间二次present拒绝而首序列仍可完成；空列表、预abort非空列表不残留timer/active。
6. **F6** advance/timeout/abort竞争单次兑现、旧timer不清下一条；current视图不泄漏内部文本；inactive输入不吞。
   微任务间隙的跨序列并发如无已核合同，先取证分类；不得用本实现结构倒推“正确行为”。

## 执行与接收纪律

- build前三席同r1签齐后由Coding Owner核准入，连续六组、逐组commit，不逐组重新签。另卡未签不阻止本卡独立开工。
- fixture先过当前validator/loader；坏输入仅坏一轴，有对应合法正控。typed walker/解析器用产品实现，不手抄算法。
- 每组至少2条（整包至少12条）有执行证据的单点负控：正常同输入绿、新增精确标题failed且AssertionError业务红；
  混合TypeError/timeout/unhandled/未执行必须拒绝，判据本身正反自测。只打印module-load marker不算运行见证。
- 相同实际输入快照在最后消费之后比较；期望原地修改的API按合同写断言，别强造通用不变性。
- 异步用entered/deferred/真实完成信号，fake timers只控制时钟；恢复globals/listeners，拒绝必须被消费。
- 新缺陷不改产品、不test.fails/skip藏红、不把错误期望固化绿色：隔离诊断+正反控+当前caller+归属；其余独立组继续。
- 39族账逐行有真实caller、旧测试全名、新断言/合法性/反控/新增或已有/待证或防御/缺陷归属；不是要求全部新增。
- 定向+相邻+两包全测、tc、所有新增TS/MJS/MTS/JSON的Biome；最终计数从实际提交树生成，失败尝试如实登记。
- 同树before只排11新文件、after加入；覆盖config直接import官方coveragePackages/testSelection/coverageExcludes。
  每包并集与11模块局部分栏，输出专属/tmp。**GLM不跑全仓check/官方ratchet/strict-fast**，Codex接收后统一串行。
- 产品、旧测试、统计范围/阈值/依赖/锁文件、原审计探针/基线、PAL工程/资产零改；不碰main/boot/SkillTab/play接线/独立试放实现面。
- 不复活旧ScriptChunkStore/MemoryScriptResolver/旧script-library调用，不做save/barrier、战斗数值、UI、截图/听感或第三阶段功能。

## GLM实施回执（待填写）

pending。没有正式新增测试，设计未齐不得开始实现；完成后交Codex独立复核，不直接转Kimi、不标done。
