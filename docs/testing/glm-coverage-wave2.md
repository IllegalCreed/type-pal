# GLM 第二波非视觉覆盖率整包 · 六组25模块

日期：2026-09-22；规划Owner：Codex；实施Owner：GLM。
任务卡：[TEST-NONVISUAL-COVERAGE-2](../ops/tasks/TEST-NONVISUAL-COVERAGE-2-six-domain-boundaries.md)。
当前阶段：**draft/准备**。GLM现在可连续完成六组逐族核对、合法fixture方案、去重和验收细化；三席设计齐并由Codex核门后才能写正式测试。
不是重领已done的TB00～TB10，也不是给予任意代码修改/先行实施豁免。

## 为什么选这批

当前生产冻结`57dda7ed2376fc25f07756be117bb4a058d09915`；规划起点`456feb12`，两者产品相同。
官方fast **7538项/633生产文件**；全仓行72.74%/分支64.28%。
主工作树的旧报告仍是7502项，不能拿它冒充新基线；本次使用已验证同口径的独立工作树7538报告，逐包四维计数、生产范围、测试身份与官方baseline对齐。
[机器清单](glm-coverage-wave2-evidence.json)列25模块源码hash、四维计数、LCOV未命中行/分支定位及旧测试检索线索；
[生成器](glm-coverage-wave2-census.mjs)只读正式报告，不跑覆盖率、不改正式基线。

| 组 | 方向 | 模块数 | 整文件未命中行 | 整文件未命中分支臂 |
|---|---|---:|---:|---:|
| W2-A | 运行时脚本状态与宿主调用 | 3 | 189 | 246 |
| W2-B | 战斗模拟器配置与启动资源快照 | 6 | 102 | 100 |
| W2-C | 精灵行为投影与帧动画草稿 | 3 | 112 | 210 |
| W2-D | 当前引用图与删除凭据 | 6 | 89 | 159 |
| W2-E | 当前脚本与运行态内容守卫 | 4 | 218 | 305 |
| W2-F | current迁移映射/脚本库审计的无资产输入 | 3 | 250 | 254 |
| 合计 | 六组独立目标 | 25 | 960 | 1274 |

**960/1274是整文件候选缺口，不是保证提升、已证可达族或应写1274个测试。** 未触达/已有跨包证明/现行构造不可达/未定政策必须分开。
任务不要求先达全仓90%/85%才进入薄E2E；没有固定凑数的测试条数。优先补真实调用结果与错误边界。

## 六组范围（全部路径相对仓库根）

### W2-A：运行时脚本状态与宿主调用

目标：`packages/reforge/src/script-host-adapter.ts`、`script-world.ts`、`script-project-core.ts`。
入口锚：`main.ts:243`实际使用adapter；`runtime-script-project.ts:35-37,85-130`实际复用Base host/coordinator，不因Base命名误判为退役。

- A01：当前leaf精确路由；同场景/跨场景/缺self的允许域，显式0/false与缺省区别，optional宿主方法存在/缺席，signal与实参原样传递。
- A02：数组防别名（followers/party等）与实际输入深快照；只核adapter不篡改输入，不能要求本来写world的core不变。
- A03：同步写入→投影通知的状态和次数；合法缺省值、已有值和可选表初始化，失败/取消何时允许已提交结果保留。
- A04：页/行为/hook选择与游标、once/yield/root关系，活动登记/关闭/快照边界；先与world-async/save-lineage已有测试逐条去重。
- A05：后台动作等待/不等待与错误传播，进入见证和原pending收口，不靠睡眠/超时判红。
- 不做：main U-02的新归因、移动/碰撞规则选择、视觉/音频效果、旧runner接口补命中、N6b参数语言。

### W2-B：模拟器配置、临时方案与资源快照

目标：reforge `src/battle-trial-config.ts`、`battle-trial-prepare.ts`、`battle-trial-assets.ts`；editor `src/core/battle-simulator-state.ts`、`battle-simulator-library.ts`、`battle-simulator-commands.ts`。
入口锚：`battle-trial-assets.ts:53-102,105-130`私有快照/prepare；`battle-simulator-state.ts:68-105`临时主题覆写；`battle-simulator-commands.ts:18-38,79-104`历史命令/删除确认集合。

- B01：合法config与拒绝矩阵的剩余组合；我方1～3、第四人拒绝、敌方固定五槽，继承/显式空技能与装备、HP/MP/音乐配置严格沿已签合同。
- B02：preset/inline/本场overrides的解析优先级、缺引用的完整issues与定位，主题应用不改原预设或提高MP。
- B03：命令no-op/未apply即invert/应用后undo/redo，实际输入与输出别名；依赖方案确认集合过期必须拒绝，不能只测错误字符串。
- B04：快照首次读/并发复用/返回副本、catalog bytes/hash各自校验、seal后的已缓存读取与未缓存拒绝、dispose/取消/迟到返回不得恢复读权限。
- B05：合法准备成功、版本/保存状态token漂移、资源失败与清理。只做代码层IO/状态，不实例化真实浏览器或做Canvas/听感断言。
- 去重入口：`battle-simulator-library.test.ts`、`battle-simulator-persistence.test.ts`、`scripts/battle-simulator-ui.test.tsx`及`battle-simulator-*mutants.mjs`；已有36/启动链证据不能换文件名重复报功。
- 不做：增加模拟器入口、改保存隔离、frame通用缓存invalidate政策、BGM initP重试政策、Q2 maxPool/战斗缺陷修复。

### W2-C：精灵行为投影与帧动画草稿

目标：editor `src/core/world-sprite-behavior.ts`、`frame-animation-draft.ts`、`sprite-actions.ts`。
入口锚：`WorldSpriteLibrary.tsx:18-25`、`FrameAnimationEditor.tsx:40`、`SpriteActionEditor.tsx:21`消费这些纯数据辅助。

- C01：current canonical脚本到预览状态/行为说明的投影，手工/auto/shared调用、自引用/递归防环、缺引用与目标筛选；输出精确的ID、域和路径，不以非空数组证明正确。
- C02：同资源多实例、多动作与不同self分开，不串预览；依赖闭包排序/去重及源状态深保真。
- C03：pixels/asset两来源、真实reader延迟/拒绝/维度和字节长度；明确duration缺省/覆写、索引上下界、合法非整数时长（若当前合同允许），不发明新范围。
- C04：插入/替换/复制/多删除/移动/选择续接，actual draft历史分支与redo清理；失败保留整个输入，正控验证完整输出。
- C05：动作顺序、下一ID与default target；像素算法仅可断言数值/字节，不能评价颜色、截图、布局或动画观感。
- 先与已有world-sprite-behavior/frame-animation-draft测试及TB03/TB06去重；不能为触发分支修改生产路径或绕过构造器。

### W2-D：引用图与删除凭据剩余边界

目标：editor `src/core/project-reference.ts`、`project-reference-adapters.ts`、`tileset-references.ts`、`script-references.ts`、`battle-data-references.ts`、`world-variable-references.ts`。
入口锚：`project-reference-adapters.ts:1899-1960`当前provider/deletion impact；`tileset-references.ts:98-156,237-300`真实proof工厂/拒绝；`script-references.ts:110,359`当前诊断/准入。

- D01：各owner/target稳定键与locator、非空引用集合、去重/排序；同显示名不同ID不得合并。
- D02：当前adapter各域（脚本、人物、物品、敌队、资源、变量、结构性引用）的遗漏臂；disabled/inherit/transition按已修D-02合同，不重造旧缺陷。
- D03：tile/stamp真实凭据生成、同一项目但状态改变、换项目/换对象后的拒绝，合法控制成功；不伪造品牌/私有token。
- D04：定义存在/缺席与未知目标完整诊断；read/index路径只读、不丢用户外部对象，不把防御性分支当生产可达。
- D05：实际cache/provider输入换代的命中/失效可见结果，不断言实现私有容器，不改缓存政策。
- 必须逐条对照TEST-EDITOR-LOGIC-COVERAGE-1、SCENE-REF-GUARD、ITEM-AUTHORING、TB07以及既有跨包case；本批只认扣除重叠后的新增族。

### W2-E：当前脚本/运行态守卫

目标：content `src/enemy-script.ts`、`author-script-core.ts`、`runtime-scene.ts`、`validate-runtime.ts`。
入口锚：`runtime-scene.ts:68-121`严格策略与chase检查；`validate-runtime.ts:13-45`同树空间+脚本校验；`author-script-core.ts`为current author/runtime的共同底层，不把其全部Base形态直接当作者输入。

- E01：敌方choreography/onDefeated/hook严格域与嵌套结构、可选缺席/未知字段；用不同非空分支验证不串域，不测战斗执行效果。
- E02：author/current runtime命令选项与边界，嵌套branch/confirm/onLose/onFlee等准确路径，显式false/0不误退默认。
- E03：合法runtime hostile三胜利策略/两逃跑策略、ticks/追逐参数边界、错误精确定位与输入保真。
- E04：先过合法完整父树，再一轴改坏；如果外层validateBaseScenes已经拦截，应列重叠保护，不截断生产guard来硬打后层。
- 去重TEST-CONTENT-CONTRACTS-1/TEST-CONTENT-RESIDUAL-1、runtime-state包。当前schema允许而运行时有缺陷的合法组合不能被测试改写成“应该拒绝”。

### W2-F：当前迁移映射与审计的自包含输入

目标：migrate `src/migrate-enemies.ts`、`pal-casualty-scripts.ts`、`script-library-audit.ts`。
现行调用一手锚：`migrate-content.ts:1753`→mapEnemies，`pal-migration.ts:428`→applyPalCasualtyOverlays，`:564-574`→auditScriptLibrary/assert。
三份既有测试被官方fast的资产文件排除清单整体排除（`scripts/coverage/config.mjs:82-94`）；**接近0覆盖不代表没有测试**。

- F01：current调用的敌人数据/稳定ID/五槽映射、悬空源、精确统计与负音效语义。使用真实当前translator或能证明属于窄IO边界的宿主，不能mock整个语义转换。
- F02：伤亡脚本结构化翻译的概率门顺序/台词风格/locale/支持指令、未知或漂移fail-closed；输出过当前Actor/casualty守卫。
  overlay四入口与36 locale键是专用原始数据合同，最小fixture仍须完整满足，不用“理应通过”的缺键输入。
- F03：脚本库审计的migrated/authored分栏、UTF8字节、依赖闭包、world/enemy不同根域、重复/缺引用/超界issue、完整排序结果和纯输入。
  ScriptIndex/Chunk仅在现行PAL离线桥内使用，禁止重新带回editor/runtime产品持久模型。
- 正常小型自包含输入放新文件，旧PAL测试不移动/删除/拆到fast。不改官方排除；分别记“新业务边界”与“已有业务脱离真实资源进入fast”，不得二次报功。
- 禁测历史translator注入、`reportHookSources=false`、旧profile/legacy输出等无现行caller轴；先核是否属E-05退役候选，不能为百分比续命。
- 原版来源语义先查`pal-casualty-scripts.ts:10-23`、已done B11-1真值与raw提取源；schema/场景/公式存在疑点即分类待证，不发明新原版结论。
- 不跑extract、migration CLI写盘，不动真实data/projects、迁移基线或已done MIGRATION-WRITE-GUARD-1。

## 已主动排除

- `main.ts`/App/绘图/音画/原生浏览器、Playwright/截图；这部分归Codex，GLM不做多模态验收。
- C-01～05、U-02、E-05、N6b的修复或未定行为；game第一阶段机制修复也不混入。
- `sound-reference-audit.ts`、`auditPalScriptControlFlow`等本轮未确认现行生产调用者的高缺口，不按0覆盖直接排测试；不据此直接判死代码或授权删除。
- 刚收口的迁移写盘保护36项不重复补；不新增配置排除、coverage ignore、skip/test.fails或改阈值。

## 现在交给GLM的第一段工作（可立即做，仍是draft）

一次完成六组，不每组问“继续吗”。在独立`codex/glm-coverage-wave2`工作树，基于最新main（目前456feb12）准备：

1. 对25模块的所有遗漏定位逐臂分类：新增候选/已有本包证明/已有跨包或full证明/现行构造不可达或重叠守卫/待裁决或无消费者。每臂一个主分类，补族ID和源码锚点。
2. 把上述A01～F03细化成不重复业务族，列合法正控构造器/guard、真实caller、旧测试**精确标题**、目标结果、最强坏实现和单点负控。
3. `docs/testing/glm-coverage-wave2-receipt.md`写准备回执，`glm-coverage-wave2-results.json`写机账；不要改Codex冻结evidence或census来迁就数字。
4. 冻结实施文件清单与各组验收条件，签自己的premise/design；有未定政策先剔出明确归属，不默默固化当前bug。
5. 给Codex、Kimi两份**同一准备候选**的并行设计审查提示词；他们需核你产生的逐族合同，因此当前先准备，而不是让两席先签空白矩阵。

准备完成≠正式测试开工。没有三席设计与Codex的build allowed，不得改packages或实现测试/负控。

## 三签后六组连续实施（一次开门，不逐用例签）

- 同一父卡、同一独立分支，A→F各一组提交，最后统一整包候选。可报告中期进度，但不把未验收切片合main；这算一个待接收包，不制造六个并行未审大分支。
- Coding Owner=GLM；Codex做产品缺陷/其它独立工作，Kimi做审查。若主线改变目标/调用域，只暂停受影响组，请Codex裁定适配，不把未审产品合进GLM分支。
- 生产/旧测试/公共fixture/全局配置/lockfile/资产/官方baseline全部零改。仅新增本清单模块相邻的`<stem>.wave2.test.ts`（具体25个上限见机账目标）与按组隔离的`packages/<pkg>/src/__tests__/coverage-wave2/<group>-*.ts`薄fixture。
- 诊断白名单：`docs/testing/glm-coverage-wave2-mutants.mjs`、`glm-coverage-wave2-coverage.config.mts`、准备阶段冻结的必要组内工具；所有输出在各自`/tmp`，不覆盖`coverage/fast`。
- 文档仅本卡GLM席位/日志、receipt/results。Codex维护共用状态/看板/索引；不代签、不标done。
- 不预设用例数来凑规模；已证可达且合同明确的目标族尽可能100%分支，整文件95%行/函数、90%分支是方向而非放宽合同的理由；无法达到逐族交账。
- 发现真实产品缺陷：保留隔离反例与合法对照，交Codex；其它组继续。不往正式套件塞默认红/skip来宣称完成，不擅改产品使测试绿。

## 验收与交付

必须执行[GLM交付前自检清单](glm-delivery-checklist.md)。特别禁止整模块mock、另一对象的快照、自比较、只看length非零、假caller“取消”、用超时当业务红。
异步：entered + 同步结局观察 + finally释放同一个底层并消费原Promise；真实可变API按可变合同断言。

每组按独立保护族选择代表负控（建议全包12～18针，具体随准备表冻结，不机械凑“一模块一针”）；
每针唯一注入点、钉新增测试精确标题failed、该case自身AssertionError首行，混合Error/超时/未执行判据自测必须拒绝；产品hash不变。
已有负控可作去重证据，不能把别的套件红当本包鉴别力。

GLM交付前：各组定向/相邻、涉及包全测、typecheck、所有新增文件含JSON/mjs/mts的Biome；每次失败记录候选/命令/exit/根因/修正。
局部25模块和涉及包整包均用**官方testSelection**做before/after（只移除本包新测试），相同生产/分母/排除，对照均exit0；
分清新增业务、已有业务输入解耦、跨包重叠、待证，不能把当前整文件命中全记为本包贡献。

Codex接收整包后才串行跑全仓check→官方ratchet→受保护单次strict-fast；GLM不抢跑全仓覆盖率、不改baseline。
交付提示词必须有最终SHA、精确文件/用例数、每组增量、全部负控日志、合法fixture自证、失败记录及剩余项归属。
GLM是测试贡献者，不作为自身测试的独立第三方；Codex独立复核，Kimi同候选终审，再由Codex核done。

## 冻结清单复算

```sh
node docs/testing/glm-coverage-wave2-census.mjs --reports /Users/zhangxu/.codex/worktrees/migration-write-guard/type-pal/coverage/fast --check
```

也可提供该报告的原样副本路径；`--check`同时核登记的原报告摘要。不同工作树重新运行产生的绝对路径会改变摘要，须由Codex另核语义并登记新快照，不能把不同报告冒充本次原报告；工具拒绝旧7502报告。
JSON中的`testHints`仅文件名/import检索提示，不能代替barrel/间接调用与跨包的人工去重。
LCOV `[line,block,branch]`是冻结源码定位，不是稳定业务ID；改生产后必须重新核定，不靠删校验让旧账通过。

本次规划验证：同口径清单`--check`通过、旧主树7502报告以`stale or mismatched report totals`拒绝；
脚本与JSON的Biome通过，文档门20项及全仓链接/索引检查通过。产品、旧测试、官方baseline零diff，没有把规划算成新增覆盖。
工具初版直接比较report与baseline整个fastTests对象，因report额外带完整identities而误拒；已改为逐项比较baseline全部字段（含身份/执行digest），不是删除统计或身份核验。
