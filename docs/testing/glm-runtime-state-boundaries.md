# GLM运行时状态与作者元数据 · 六组补测工作包

任务：[TEST-RUNTIME-STATE-BOUNDARIES-1](../ops/tasks/TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md)，r1/review，统一候选44b9b763。
当前进展（2026-09-21）：用户授权Codex接手350da702的D6窄返工；250814f7已补真实finally/失败路径自证，并按当前物品身份适配B7。**56项**、原8针/4fixture/22跑及统一check7988/strict7497通过，原counter已消除，待两席终审。
见[补正记录](tb00-tb01-completion.md)与[复核历史](runtime-state-review.md)。下面GLM回执按原候选保留，旧55项和冻结期覆盖不作为当前树最新数字；不重开既有合同，不代签done。
原包生产冻结：`e58834f6389a40ffe9f187e6a8051f552e964d79`；当前接入基点952a45bd，产品零改。GLM保留原测试贡献，Codex负责本轮补正/集成/自验，Kimi独立终审，GLM对新候选复核。
与[独立技能试放卡](../ops/archive/tasks/done/EDITOR-SKILL-TRIAL-1-isolated-battle.md)分开；不是继续修改已done的运行时十模块包。
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

## GLM实施回执（候选自验原文；数字及闭环声明以本页当前Codex复核为准）

r1 返工完成（2026-09-19 第二轮，GLM；对应[counter R1～R4](runtime-state-review.md)，
原候选 23eb63d2 回执保留在该树）。分支 `codex/glm-runtime-state-boundaries-r1`（worktree
`/Users/zhangxu/illegal/type-pal-glm-runtime-state`），在 counter e22041a0 之上 rebase 后追加
返工提交；模拟器设计文档/看板行原样保留；产品对冻结 e58834f6 零漂移。
最终树 **11 个新测试文件共 55 项**（Vitest JSON 逐文件：6+4+5+5+9+9+4+4+2+2+5）。
定向 55/55 绿；reforge 全包 125 文件/1235 项、content 全包 57 文件/685 项 exit0；
两包 tc rc=0；**16 文件 Biome rc=0（逐文件核验）**。

**返工要点**：R1——fixture 合法化：onTeleport 非 initial 状态移除 entry（守卫：entry 只允许
onEnter initial state），legalItems 拆为 ext（外部脚本唯一效果）/priv（私有脚本）/bare 三合法
物品、throw 用合法 fixedDamage 效果；新增 assertSceneFixtureLegal/assertItemsFixtureLegal
守卫自证并在 B4/B7 消费前调用；dither 虚构 source 轴移除（合法失配轴=ms/kind）。R2——D6 以
真实进入见证重建（sequence 永不完成 gate + inflate entered waitFor，结局观察器同步挂接——
外层在底层放行前即 AbortError；迟到完成不提交帧）；D4 双 asset + 同 id 真实换字节；D5 以
2 帧容器×3 asset 的精确解码计数见证命中/淘汰。R3——compiler after 逐组合精确（auto/perCommand=
[wait100]、其余 []）；嵌套别名试验（mutate 编译产物 branch/cond/payload 后实际输入库不变）；
once-sound 带真实 cue 的非空正控 + 越尾不重播实证；E4 播种后实际 world 深快照 + 再确认复验；
castAll 比完整技能对象；B7 嵌套 throw/use 别名试验；B6 换用真实 page 动画差分。R4——
Biome 逐行 suppression/导入修复，全部计数从最终树 Vitest JSON 重生，覆盖小计更正
（reforge 九目标行 497→533/564、分支 392→444/533；content 全包分母 5016 明示）。

**第三轮返工（收窄 counter 8ca74aac 三残项，2026-09-19）**：
1. F1——`source:'held' as never` 断言实际删除；F1 标题/注释同步为 ms/kind 失配轴；本回执该项声明与提交树一致。
2. D6——结局观察改为**独立同步变量**（回调更新 observer.outcome，断言只读观察值，不 await 可能
   永不 settle 的 outcome Promise）；entered 后 abort、tick 排空拒绝传播即同步断言 AbortError；
   frame 用例 finally 放行 inflate 并核迟到零提交；sequence 用例 finally 消费收口 Promise；
   旧"永不释放 gate + 另一次播放声称迟到读取无提交"断言随重写移除（D 组 8→9 项，逐文件计数同步）。
3. E4——每个确认分支（toTarget / castAll / MP 不足 / MP 恰好足够）在**调用前**对实际 world 取深
   快照、调用后立即比较；删除未使用 `_wBefore` 与 `deepSnapshot(w)` 自比较；菜单 state 原地可变
   合同保持。负控钉名标题随用例标题同步（E4/F1 pins 已更新）。

### 39 族逐项账（新增=本包用例标题；已有=锚点；待证/防御附归属）

**A · world-variable / migration-diagnostic（10 项）**
- A1 新增：`ID 128/129、name 80/81、description 500/501 各自恰好越界即拒；上界全绿`、`小数/负数/false 仍是合法 initial（数值与布尔各按自身域）`。
- A2 新增：`registry/definition 错型、kind 错型、flag 非布尔、number 非有限各自精确路径`、`验证拒绝不修改原输入（同一对象深快照在最后消费后比较）`。
- A3 新增：`空 description 合法、空 name 非法；sys: 只约束 ID 不约束 name/description`。
- A4 新增：`两次初始化互不污染；改结果不污染作者定义；改定义不污染已产出的运行值`（与 :58 fresh 引用断言去重：彼验 fresh 引用分离，本例钉双向写隔离）。
- A5 新增：`合法基线先证明可过守卫，再按轴改坏 root/version/diagnostics 容器`、`验证拒绝不修改原输入（深快照同一对象）`。
- A6 新增：`target domain/objectId/label 与 source kind/label/address 各自精确路径`（address 0 正控=合法基线）。
- A7 新增：`五 category × 三 capability 全组合合法；返回同一输入对象；额外字段不拒（无 exactKeys）`（15 组合 + 前向字段）。

**B · runtime-script-compiler / runtime-project-view（9 项）**
- B1 新增（返工后）：`auto/interactive × perCommand/transition 四键互不复用；元数据与产物逐项精确`（每 leaf 的 after 按组合精确：auto/perCommand=[{wait,100}]、其余 []）。
- B2 新增：`缺 id 精确拒绝；非法 digest 拒绝；两独立 resolver 同 id 各自正文`。
- B3 新增（返工后）：`命令数组编译后逐值不变（深快照同一输入对象）`、`共享脚本库经 resolver 编译后原库逐值不变（库对象就是实际传入对象）`（+改产物 after/payload 后库不变）、`编译产物修改后嵌套 cue/参数仍与实际输入隔离（cond/entry 别名试验）`（branch/cond 深入改写）。
- B4 新增：`字段精确删除/恢复；活体位置保留；hook 投影保持；canonical 输入不变`（与 :96 刷新例去重：彼验单次切换保位，本例钉三态往返+canonical 深快照）。
- B5 新增（返工后）：`stages 游标命中对应 stage 的 entry；stateMachine 游标命中对应 state；正文一律空`——onEnter initial 的 cut entry 直证 + 非 initial 状态（守卫下无 entry）空 body + onEnter 游标切 second（无 entry stage）空 body；入场呈现只在 onEnter initial（Codex 复核勘误后按现行守卫收窄）。
- B6 新增：`实体换序输出稳定（按 id 排序）；相关变化有差、无关场景不误报`。
- B7 新增（返工后）：`外部脚本/私有脚本/throw 完整投影；裸物品无 use/throw；输入与嵌套别名隔离`（外部/私有拆分各唯一效果；嵌套 throw/use 改投影不写回输入）、`scratch 可选分支缺席与在场：flags/vars/entityState 深拷贝不别名`。D-07 未在 fixture 复现（私有前缀稳定），不另立缺陷。

**C · entity-action-player（9 项）**
- C1 新增：`精灵不匹配/动作缺失/空 steps/非正时长/loopFrom 越界/实际帧数门各自精确拒绝`（+fixture 过 validateSprites 合法性自证；帧数门 actualFrameCount 负/非整数/越界三轴）。
- C2 新增（返工后）：`play 兑现、覆盖不悬挂、历史 cue 不补发`（startAtMs 越尾 once；once-sound 带真实 cue 从头两步按序发出 + 越尾零重播双证）。
- C3 新增：`自然结束：deferred 兑现一次，后续 advance 不重复 cue/兑现`、`stop(false)：waiter 兑现、覆盖清除；clearEntity：同样收尾`。
- C4 新增：`覆盖结束后恢复到新基础轨，不接回旧轨`（含 intro 段相位语义与 stop(reset) 重建）。
- C5 新增：`新请求接管后旧 signal abort：新覆盖存活并完成；stop 后迟到 abort 无副作用`（循环覆盖 stop 收尾；旧 waiter 被兑现非 abort）。
- C6 新增：`精确边界/半步 startAtMs 的帧号；dt=0 no-op；非法 dt 拒绝`、`完整 cue 轨迹按步序一次发出（walk：step0 与 step2 的 sound）`。

**D · frame-animation-player（9 项）**
- D1 新增：`失败 Promise 不永久缓存；同 reader 重试真正读取并解码出实际字节`。
- D2 新增：`inflight 回零后同 block 重读成功；合法字节真实 decode`。
- D3 新增：`frameLimit 非正/非整数拒绝；帧索引负/非整数/上界拒绝；0/末帧正控`。
- D4 新增（返工后）：`invalidate(a) 只清 a 保留 b；invalidate() 全清；同 id 换字节后读到新内容`（双 asset + 真实换字节）——**进行中 invalidate 回填政策未定：本例只测已完成态的清除，不默认绿固化在途行为**（待证交 Codex）。
- D5 新增（返工后）：`命中刷新触点：最近命中者存活、被淘汰者重解码；解码计数精确`（2 帧容器×3 asset，解码计数 2/2/3/3/4 逐步见证）。
- D6 新增（返工后）：`sequence 在途 abort：及时拒绝；迟到读取不 onFrame`、`frame 在途 abort：进入 inflate 后取消仍及时拒绝、迟到帧不提交`（entered 见证 + 同步结局观察器：底层未放行时外层已 AbortError）、`wait 在途 abort：第一帧已提交、等待期 abort → 不进第二帧`。
- D7 新增：`非目标 key 不吞；目标 key 消费并结束；onFrame 抛错也清监听`（首 wait 门控确保监听注册见证；错误身份保持）。

**E · magic/system-menu（8 项）**
- E1 新增：`缺 id 与非 outdoor 剔除、保留序 = 作者声明序；world/skills 定义不变`。
- E2 新增：`经真实导航进 pick-spell：caster 导航不动；进 pick-target：网格导航不动、返回恢复`（+pick-caster 上的全 no-op）。
- E3 新增：`死人确认不动（同输入正控：活人进入 pick-spell）；空列表确认 null`。
- E4 新增（第三轮后）：`castAll 完整返回选中技能；toTarget 后 targetIdx 重置；MP 恰好足够通过、不足 null；各分支实际 world 快照不变`（每分支调用前快照/调用后比较——含 castAll 全体直放；castAll 比完整技能对象；magicConfirmSpell 原地改菜单 state 按合同直证；E 组全程未调用 castOutdoorSkill）。
- E5 新增：`left/up 同为 -1、right/down 同为 +1；首尾环绕`、`openSystemMenu 记忆恢复与越界 clamp`、`非 menu 阶段确认不重复 action（confirm/switch 上 systemConfirm no-op）`。
- E6 新增：`显式 on/off 落定完整 state/action；audio 缺席默认 true；save/load 只核返回请求`（save/load 无存储 IO；quit 是/否完整路径）。

**F · scene-entry / screen-hold / reward-gain（9 项）**
- F1 新增：`fade out/in 与 dither ms/source 分别失配即拒；cut 正控；错误后当前 session 保持`。
- F2 新增：`同场景同配置二次 begin 产生新 token；旧 token complete 不能清新事务`（+heldFrame preparing-only 语义）。
- F3 新增：`旧 owner 取消不影响新事务；当前 owner 能清；空 token 拒绝保留活动态`（同 token 文字新 owner 对象分立）。
- F4 新增：`正常返回原值且 finalizer 零调用；失败先收口再抛原错误（身份保持）`（与 :37 失败主干去重：本例补正常路径零调用与顺序直证）。
- F5 新增：`活动序列期间二次 present 拒绝；首序列仍可完成（advance 驱动，不用时钟）`、`空列表直接完成、预 abort 拒绝：均无 timer/active 残留`。
- F6 新增：`advance 与 timeout 竞争：单次兑现、旧 timer 不清下一条；abort 同样单次`、`abort 与 timeout 竞争单次兑现；current 视图不泄漏内部 signal`、`输入语义：Enter/空格消费并推进；Escape 不吞交还外层；其它键消费不推进；inactive 不吞`。微任务间隙跨序列并发：present 重入门+advance 单结算已核，未发现未定合同需固化。

### 负控与覆盖（最终树复跑）

- 负控 `node docs/testing/glm-runtime-state-mutants.mjs` rc=0：判据 AST 自测（good 通过/混合坏日志拒绝）+ 6 对照 exit0 + **16 变异针** exit1（六组各 ≥2，A4/C2/E2/F2）；每针 MUTATION_HIT + AssertionError + 钉名新增测试实际 failed（Vitest JSON 执行见证）；被触产品文件批前后 sha256 不变。
- Codex 六见证复跑：`node docs/testing/runtime-state-review-witnesses.mjs /Users/zhangxu/illegal/type-pal-glm-runtime-state`
  rc=0——六对照绿；compiler-after-loss / frame-await-cancel-bypass / invalidate-keeps-old-container /
  lru-hit-does-not-touch / expired-action-replays-cues / magic-confirm-mutates-world 六针全部
  **detected**，且 candidateFailures 列出的是返工后新增断言的精确标题（候选自己的业务红，非仅 oracle 红）；
  fixture 四检查（author-scene/runtime-scene/author-items/runtime-library）全 accepted。
- 覆盖对照（可复制；config 物理绝对路径；SB1_PKG 分包）：
  ```bash
  SB1_PKG=reforge SB1_MODE=before SB1_OUT=/tmp/sb1-cov-reforge-before pnpm --filter @type-pal/reforge exec vitest run --coverage --maxWorkers 1 --passWithNoTests --config /Users/zhangxu/illegal/type-pal-glm-runtime-state/docs/testing/glm-runtime-state.config.mts
  SB1_PKG=reforge SB1_MODE=after  SB1_OUT=/tmp/sb1-cov-reforge-after  pnpm --filter @type-pal/reforge exec vitest run --coverage --maxWorkers 1 --passWithNoTests --config /Users/zhangxu/illegal/type-pal-glm-runtime-state/docs/testing/glm-runtime-state.config.mts
  # content 同法（SB1_PKG=content）
  ```
  11 模块局部（最终树）：content 行 79→91/93、分支 83→101/106；reforge 行 497→533/564、分支 392→444/533。
  全包并集：content 行 4458→4470/5183、分支 3798→3816/5016；reforge 行 7927→7963/14118、分支 5329→5382/11041。
  机器账 `docs/testing/glm-runtime-state-evidence.json`（16 文件 Biome 干净）。
- 未发现新产品缺陷；frame 在途 invalidate 回填政策记待证交 Codex。全仓 check/官方 ratchet/
  strict-fast 留 Codex。GLM 为测试贡献者，未接收不转 Kimi 终审、不标 done。
