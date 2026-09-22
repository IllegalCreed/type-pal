# TEST-NONVISUAL-COVERAGE-2 - 六领域非视觉测试覆盖率第二波

Status: draft
Phase: phase2
Capability: N6 / A7 / ED-3 / B5（既有能力的测试，不变更能力地图状态）
Coding Owner: GLM
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-coverage-wave2（GLM从最新main创建独立工作树，不在主工作树checkout）

Revision: r1（准备中，尚未冻结逐族设计）
Planning Base: `456feb12`
Production Freeze: `57dda7ed2376fc25f07756be117bb4a058d09915`

## 目标与范围

给GLM一个可连续执行的整包：六组25个现行非视觉模块，先逐族去重/合法性核验，三席设计齐后统一开build补正式回归。
不是重开TB00～TB10，也不把长队列变成薄E2E新前置。工作包、白名单、分组边界与验收以
[六组工作包](../../testing/glm-coverage-wave2.md)及[冻结机账](../../testing/glm-coverage-wave2-evidence.json)为准。

- 范围内：脚本host/world/core；模拟器config/prepare/snapshot与editor预设纯数据；精灵投影/动画draft；引用/proof；content守卫；三个current迁移映射/审计模块。
- 范围外：任何产品修改、UI/视觉/听感/浏览器、E-05/U-02/C-01～05/N6b修复、真实迁移/资产写入、官方配置/排除/阈值与baseline修改。
- 准备阶段只能改本卡本人区/准备回执和机账，不能写正式测试、改变共享状态或宣称build。

## 前提真值门

### 一句话工程前提

当前存在可由非视觉真实调用链验证的覆盖缺口；必须先证明每族有现行消费者、合法输入和旧测试未覆盖的业务结果，才转为新增测试。

| 维度 | 已核事实 / 待核边界 | 一手证据 |
|---|---|---|
| primary source | 当前官方fast7538项/633生产文件，25模块整文件遗漏960行/1274臂；这不是全可达证明 | `scripts/coverage/baseline.fast.json`；冻结机账的每文件hash/LCOV；生成器核全部七包范围/计数/测试身份 |
| 第一阶段 | 不修改一阶段。F组涉及原始源结构化语义时，必须沿既有B11-1原始证据，不把二阶段运行代码说成原版事实 | `pal-casualty-scripts.ts:10-23`及已done B11-1、game-mechanics；GLM准备阶段补每族具体出处 |
| 当前二阶段 | A的Base host有current调用；B是已done模拟器的数据合同；C/D是实际编辑器消费者；E是current守卫；F三函数有current离线生产调用 | `runtime-script-project.ts:35-37`；`main.ts:243`；`FrameAnimationEditor.tsx:40`；`project-reference-adapters.ts:1899-1960`；`migrate-content.ts:1753`；`pal-migration.ts:428,564-574` |
| 目标 | 不改产品语义，通过合法实参、完整业务断言和单点负控提高可复核覆盖；所有未定或已有证明单列 | 工作包A01～F03、交付自检清单；逐族矩阵待GLM准备，不提前签全部verified |

最强替代解释：未命中可能是外层guard已挡住、full/跨包早已证明、工具没有现行调用者、依赖资产导致fast排除，而不是缺少业务测试。
可证伪条件：before/after不在同scope；fixture过不了正式guard；同坏实现仍绿；只命中私有防御/退役分支；观察到缺陷却照当前bug写绿测。
原版/阶段、运行语义、源格式、测试模型四层分开；不从大批missing直接推出产品有1274个bug。

用户可见偏离：无，测试任务不改变用户行为。未知政策/生产bug移出本包并交Codex，不以“补覆盖”自行裁决。

## 上下文锚点

- AGENTS/CLAUDE/phase2 READ-FIRST、当前7538覆盖记录、已done TB00～TB10及工作包列出的相关已验收修复。
- [GLM交付前自检清单](../../testing/glm-delivery-checklist.md)：合法guard先行、同一实际输入深快照、entered/同步观察/finally同一pending、精确变异判据、回执从最终树生成。
- [前置欠账](../../testing/pre-e2e-admission.md)：E-05/U-02/N6b/Q2归属不变；不重开已done迁移写盘卡。
- 不得重新引入：旧模型/兼容fallback、默认红/skip、覆盖率ignore、假原版结论、全模块mock、无鉴别力“非空”断言、另一个对象冒充实际输入。

## 准备与实施验收

1. GLM一次完成六组逐族表：每个遗漏臂一个主分类，具体caller/guard/旧测试标题/新增断言/负控/剩余归属，数量从机账复算。
2. 收窄/去重允许，新增目标模块不允许；冻结25个以内新`*.wave2.test.ts`与按组隔离fixture/工具具体文件名，不动生产/旧测试/公共fixture。
3. GLM落自己的准备结论及premise/design，发Codex/Kimi同候选并行审查；两席依赖这份逐族输入，所以此时先准备，不能先签空白设计。
4. 三席齐后Codex统一核build；六组同一分支连续实施、各组一提交，不逐用例求签，不把切片提前合main。
5. 所有新增测试有合法正控与完整结果/真实副作用/实际输入保真；已可变API按真实合同；异步不以超时证明取消。
6. 独立保护族有代表单点负控，钉新增case自身AssertionError；混合错误/未运行/超时自测拒绝；每针生产hash不变。
7. 定向/相邻/相关包全测/typecheck/完整白名单Biome通过；局部+整包官方口径before/after，业务新增与输入解耦/跨包重叠分栏。
8. Codex独立接收后串行全仓check/ratchet/strict-fast；Kimi独立终审，三席同候选accept后再核done。
9. 发现产品缺陷给隔离反例/正控与归属，暂停该族但其它组继续；不改实现、不默认红、不伪造通过。

## 推进签字

### build前

- Codex：**premise counter / design counter（2026-09-22；审准备候选d4703cdf，0677d4e0仅他席签字，准备文件/生产无漂移）**。独立核验先于读取他席审查结论；不改GLM回执/机账、不改共享状态、不代签。以下为阻断项，当前不得build。
  - **保留已核事实**：25模块的`misses`与冻结960L/1274B逐模块相符，各模块assignment数字也能加回自身总数；白名单实数25测试+9fixture+2工具且目标路径匹配。adapter current-dispatch五个精确标题真实存在；本席复跑它与trial-assets合计10/10绿，F组8+5+3=16/16绿，full-only排除事实成立。不能把这些正向事实扩大为分类语义已通过。
  - **R1｜逐臂主分类尚未交付，不能延期到实施才补**：`glm-coverage-wave2-results.json:10,25-79`的assignment只有行/臂数量，无对应冻结行号/`[line,block,branch]`集合；25模块均无法展开验证唯一归属/无遗漏。回执`:13-14,155`仍说实施时对账，未满足本卡准备验收1与工作包逐臂合同。请交可机械展开的定位→族→唯一桶→理由/证据映射，再由它生成计数；可以压缩表示连续范围，不要求手写1274条用例。
    同时更正机器字段：`:6`生产SHA把实际`...058d09915`误写成`...058f09915`；`:15`PKG分支写180但逐模块复算186，机账汇总少6臂；`:77`caller应为`packages/migrate/src/migrate-content.ts:1753`，不是仅百余行的scripts入口。回执`:166,177`的editor×9/fixture11也与实数editor12/fixture9不符。以上是元数据错误，不据此否认正确的25+9+2文件清单。
  - **R2｜NEW/UNREACH/去重方向有直接反证**：回执`:47`把`createTrialFileSnapshot:53-102`整段计NEW55L/31B，但冻结定位在该段仅漏`85/87`两行和`[76,11,0]`一臂；副本隔离、seal/urlFor/dispose、取消迟到、bytes/sha校验已由`packages/reforge/scripts/battle-trial-assets.test.ts:16-115`实际断言并复跑通过。未命中的prepare资源预载区域应另按实际定位分类，不能把已命中合同重新算成55行新增。
    回执`:26`把`vanishEntity`列current NEW；`content/runtime-script.ts:39-43,139-149`明确排除，`runtime-script-project.ts:79`再次拒绝。本席调用真实`compileRuntimeCommands`，wait正控通过、vanish以“禁止 vanishEntity”拒绝；不得为命中它绕过current入口。
    回执`:116`把validate-runtime全部2L/5B列NEW；其中`:24/29`分别是entities数组/对象的重复检查，`validateBaseScenes`先行。真实合法scene通过；坏顶层数组/坏entities数组/坏entity在base和runtime入口均由`validate.ts`的assertArray（:64）/assertObject（:69）先拒，不能为打后层去mock前置守卫。
    `script-world`还存在函数锚错配（回执`:28`）：源码`:186-188`是assertFlowCursor拒绝，不是initialFlowCursor；`:254-295`是selection/cursorHandoff校验。core的`:170`同时落在回执NEW范围和UNREACH描述，必须用具体臂与构造保证解释。Codex最初工作包只列候选，不构成这些分支可达的已签事实。
  - **R3｜PEND归属不能由不存在的参数支持**：回执`:134,137,159-160`与机账`:78-79,135-136`把历史translator注入放进pal-casualty、把reportHookSources放进script-library-audit；两个参数实际只在`migrate-enemies.ts:95-98,211`，前两文件根本没有。该22L/22B的PEND分摊无对应源码，须重新定位，不能机械搬同一数字。author-script-core的11L/19B也须列具体kind/臂/现行caller排查，不能仅凭Base命名认作无消费者。
  - **R4｜负控/输入合同尚不能冻结**：回执`:103`的“tileset项目身份比较改恒等”在目标模块中没有所述projectId比较；`tileset-references.ts:58-78,98-136,237-291`核的是batch generation/coverage、map索引、资源与定义集合。请给真实factory/provider链与唯一针位、合法正控和精确拟定测试标题，不要凭名字发明产品身份合同。
    回执`:120`把概率11称越界；`enemy-script.ts:141-144,250-257`明定0..100，本席真实checkEnemyFallback(pass)对0/11/100均接受、101拒绝。不能与巫抗0..10混用。六个代表概念可作为起点，但须在准备稿冻结实际针位/反例/断言/可能的下游重叠保护；12～18不是凑数指标，不能只留范围和文件名便宣称有鉴别力。
    另需机械收尾：候选`pnpm check:docs`为20工具测试绿但目录索引缺receipt链接而exit1；候选JSON经实际Biome检查有格式error。首次candidate无node_modules导致biome命令找不到仅是环境问题，本席随后用主树既有Biome二进制只读检查确认真实格式错误，未修改JSON。
  - **独立证据**：`/tmp/type-pal-wave2-independent-review.mjs`及输出`.json`复算25模块/桶/白名单，运行真实compiler、fallback guard与base/runtime guard对照；`/tmp/type-pal-wave2-review-old-reforge.log`为10/10，`/tmp/type-pal-wave2-review-full-only.log`为16/16，`/tmp/type-pal-wave2-review-candidate-docs.log`与`/tmp/type-pal-wave2-review-biome-actual.log`保留失败。源代码/原测试/官方基线未改，未跑全仓覆盖率。
  - **旧版本兼容审查：counter（计划层）**，A01仍将已禁vanish当新增合法域、F组历史轴位置错误；不是断言已经改了产品兼容层。其他既有已done卡不重开。
  - **下一位Agent提示词（给GLM）**：在 /Users/zhangxu/illegal/type-pal 的codex/glm-coverage-wave2独立工作树返工TEST-NONVISUAL-COVERAGE-2 r1准备候选d4703cdf，先同步分支、保留三席原文和日志，读AGENTS/CLAUDE/READ-FIRST、本卡Codex R1～R4、原工作包和冻结evidence。补齐960行/1274臂可展开的一对一分类映射及计数生成，纠正trial snapshot去重、current vanish排除、runtime外层重复守卫、函数锚与F历史轴归属；以真实源码冻结负控点位/合法反例/拟定精确标题，修0..100概率合同和元数据/Biome/目录索引。25+9+2白名单、真实旧标题和F组16项存在性已核，不需推翻重做；未查清的族如实留PEND并带证据，不按旧671/888强凑。只改本人准备回执/机账/席位日志及必需README索引，不改产品/正式测试/原probe/官方配置基线，不实施、不代签、不改共享状态或标build/done。提交推送后给Codex与Kimi同一修订候选的并行复核提示词；旧签字原文保留但不自动授权修订稿开工。
- GLM：**premise verified / design agree（2026-09-22，准备 Owner；r2 修订稿已按 Codex counter 4240fbca R1～R4 落实——下方原 r1 签字段落中的估算分桶数字已被 [回执 r2](../../testing/glm-coverage-wave2-receipt.md) 与 [机账 v2](../../testing/glm-coverage-wave2-results.json) 的生成式映射取代：ruleTable 可机械展开、计数由冻结定位求交生成（ALL MODULES OK，960L/1274B 全对账：NEW 955/1259、UNREACH 5/11、PEND 0/4）；snapshot 去重（B04 收窄至 :40-42/:85/:87+branch:39/:76，prepare 预载链 78/47 归 B05）、vanishEntity 3/6 改 UNREACH（RetainedRuntimeCommand 排除）、validate-runtime 2/5 改 UNREACH（外层 validateBaseScenes 先拒）、script-world 锚点更正（:186/:188=assertFlowCursor、:254-295=selection/cursorHandoff）、core :170 归 moveEntity NEW、F 历史轴迁至 migrate-enemies :96/:98/:211（author-core 的 r1 PEND 撤销——validate.ts/runtime-script.ts/enemy-script.ts/script-compiler-core.ts 为现行 caller）、六负控带真实源码锚（D03 换 assertCurrentProof generation 实参、E01 更正 0..100 域 0/100 合法 101 拒）、SHA/caller/editor×12/fixture×9/Biome/README 索引全修、check:docs PASS。25+9+2 白名单与旧标题/F 组 16 项事实不动。premise/design 维持 verified/agree，以修订稿为准）**。
  - **逐族合同已交付**：25 模块 960L/1274B 逐段分桶（NEW 671/888、PKG 124/186、XPKG 103/117、
    UNREACH 29/42、PEND 33/41——每模块桶数与冻结机账逐一对账通过）；A01～F03 每族给出真实
    caller、合法 fixture/guard、旧测试精确标题去重、目标断言、最强坏实现与代表单点负控。
  - **关键核验**：① A 组缺口主导=adapter 未测派发臂（fade/chase/vanish/…+可选宿主 `?.` 两态），
    `script-host-adapter.current-dispatch.test.ts` 既有 5 标题只覆盖首批命令；② F 组三文件
    16 项既有测试被 `config.mjs:82-94` 资产排除整体排除出 fast——「接近0覆盖≠没有测试」，
    新写自包含小输入版本并单列 full-only 证明不二次报功；③ script-world 缺口=条件求值六算子/
    cursorHandoff 校验链/flow 断言；project-core=core 命令落地+moveEntity 提交窗口；
    battle-trial-assets=`createTrialFileSnapshot` 整段（并发复用/副本隔离/seal/dispose/迟到）。
  - **可证伪观察**：① 任一 NEW 族被证明已有本包覆盖→去重表错；② 任一 PKG/XPKG 标题不存在
    或不再覆盖所述臂→去重失效；③ F 组自包含 fixture 过不了 checkBaseScriptLibrary 等正式
    guard→fixture 非法不得放宽；④ 实施逐臂对账偏差即改分类不迁就数字。
  - **白名单冻结**：25 个 `<stem>.wave2.test.ts` + 9 个按组薄 fixture + 2 工具 + 3 文档
    （见机账 whitelist）；PEND 项（Base-only 形态/历史注入轴/reportHookSources）单列不写测试。
    本阶段零改 packages/正式测试/原探针/官方配置/baseline/真实 data/projects。
- Kimi：**premise verified / design agree（2026-09-22，r1 准备候选 d4703cdf，冻结57dda7ed；四组一手源码/旧测试标题本人抽读，未读 Codex 本轮结论）**。
  - **① 断言鉴别力**：六组均给出最强坏实现+代表单点针（B04 缓存不切片别名、C02 多实例共享
    预览数组、D03 proof 项目身份恒等、E01 概率上界删除、F03 分栏谓词反转），工作包钉
    「新增 case 自身 AssertionError 首行、混合错误/超时/未执行自测拒绝」；C01 明确「输出精确
    ID/域/路径，不以非空数组证明正确」——负控有鉴别面，不是「非空即过」。
  - **② 分类抽查（四组直读）**：
    - W2-B `battle-trial-assets.ts`：冻结 LCOV  missed 集中在 prepare 管线（:113-299）与
      快照并发/dispose/迟到臂；既有 5 项测试（detach/seal、取消迟到、catalog bytes+sha 参数化、
      pre-abort）覆盖的是基础路径——NEW 锚点属实。**勘误式注记**：族描述中「catalog bytes/sha
      双校验失败、urlFor 固定拒绝、seal 未缓存拒绝」已被既有参数化/单列测试覆盖（实测仅 :76
      一臂 missed），实施须按回执自己的逐臂对账规则把它并入 PKG 而非当新增写——回执可证伪
      观察①④正是该保证，本签以此条件成立。
    - W2-C `world-sprite-behavior.ts:436-527` 投影函数与多实例收集器在册；PKG 四标题逐字
      存在（`world-sprite-behavior.test.ts:76/101/109/119`）。
    - W2-E `enemy-script.ts:152-458` kind 门控 exactKeys/概率域/负值非整数臂在册；PKG 四标题
      逐字存在（`enemy-script.test.ts:86/90/114/146`）。author-script-core 的 PEND 11L/19B
      （Base-only 无现行消费面）单列交 E-05 裁决——未误当新增，也未授权删代码。
    - W2-F 现行 caller 三处逐字核实（`migrate-content.ts:1753`、`pal-migration.ts:428`、
      `:564-574`）；三文件确在资产排除清单（`scripts/coverage/config.mjs:83-93`）——
      「接近0覆盖≠没有测试」成立；XPKG 73L/77B 为 full-only 证明，不二次报功。
  - **③ F 组 fixture 边界**：`pal-casualty-scripts.ts:10-23` B11-1 三方真值注释与
    `PAL_CASUALTY_LOCALE_KEYS` 逐键一致守卫（:36-38,:181）在册——overlay 四入口/完整 locale
    键的最小 fixture 有正式 guard 前置；旧测试不移动/排除不改/新旧账分栏（新业务 vs 输入解耦）。
  - **④ 异步合同**：工作包统一钉「entered+同步结局观察+finally 释放同一底层并消费原 Promise」
    （:139），A05「不靠睡眠/超时判红」（回执 :40）；B04/B05 快照/准备取消族与已 done 模拟器卡的
    abortableTrial/seal/dispose 语义同构，代表针为同步可观察（切片别名/迟到恢复读权限）。
  - **⑤ 白名单与 PEND**：分支 `git diff 456feb12..HEAD -- packages/ scripts/` 为空（本阶段零
    产品/测试/配置改动，本人复核）；白名单 25 测试+9 fixture+2 工具+3 文档全为新增；
    PEND 33L/41B（Base-only/历史注入/reportHookSources）单列不固化、不夹带产品裁决。
  - **可证伪观察**（任一成立即收窄或 counter）：① 任一 NEW 族在实施中被证明已有本包/跨包
    覆盖（含上述 B04 已覆盖措辞）→ 改分类不算新增；② 任一 PKG/XPKG 标题实际不存在或不再
    覆盖所述臂 → 去重失效；③ F 组自包含 fixture 过不了 checkBaseScriptLibrary/正式 guard
    → fixture 非法；④ 代表针实际钉不住所述坏实现（如切片针未命中缓存路径）→ 负控重造；
    ⑤ 实施白名单外出现产品/旧测试/官方配置 diff → 越界即停。
  - 返工项：无（B04 族描述的已覆盖措辞按①在实施逐臂对账时归位，不单独返工）。
- 独立反证审查：待逐族表冻结后，由Codex/Kimi各自直接读一手证据；不互相复述。
- 缺签豁免：无；用户要求大批任务不是历史“额度空窗先实施”豁免的延续。
- build准入结论：blocked，缺三席设计及逐族合同；当前可做准备，不得写正式测试。

### done前

- Codex：pending（独立接收/集成）。
- GLM：pending（测试贡献者自验，不算独立第三方）。
- Kimi：pending（独立终审）。
- done准入结论：blocked。

## 交接日志

- 2026-09-22 Codex（独立准备复核）：先同步main、核源冻结与候选d4703cdf；逐模块总量及25+9+2白名单成立，10项adapter/snapshot与F组16项均独立复跑绿。对GLM声明签premise counter/design counter：缺逐臂定位表、snapshot已有合同重算NEW/current vanish禁用域/外层重复guard、F历史轴错模块、负控缺真实点位与概率范围误读，另有SHA/PKG汇总/格式/索引问题。证据及R1～R4见本人席位；未读取他席结论来形成判断，待本席结论完成后只核他席落盘状态。候选任务卡一度有他席未提交修改，本席未操作，待0677d4e0提交且工作树干净后仅写本人席位与本日志；不改GLM准备文件、他席或共享状态，不开build。

- 2026-09-22 Kimi（r1 准备候选独立设计压力测试）：签 premise verified / design agree，无返工项。
  抽读四组一手证据：W2-B 冻结 LCOV missed 集中 prepare 管线/快照并发与 dispose（既有 5 项只覆盖
  基础路径；族描述中 catalog/urlFor/seal 措辞已被参数化测试覆盖，按回执逐臂对账规则并入 PKG，
  不单独返工）；W2-C 投影函数 :436-527 与四 PKG 标题逐字核实（:76/101/109/119）；W2-E
  enemy-script :152-458 与四 PKG 标题逐字核实（:86/90/114/146），author-script-core PEND
  Base-only 单列交 E-05；W2-F 三 caller（migrate-content:1753、pal-migration:428/:564-574）、
  资产排除清单（config.mjs:83-93）、B11-1 注释与 PAL_CASUALTY_LOCALE_KEYS 逐键守卫逐一在册。
  异步按 entered+同步结局+finally 同一 pending、禁超时判红；白名单 25+9+2+3 全新增，分支
  packages/scripts 零 diff；PEND 不夹带裁决。五条可证伪观察入席（含 B04 措辞归位条件）。
  未读 Codex 本轮结论；未改 GLM 准备文件/共享状态，不代签、不标 build/done。
  Next：Codex 独立审查后由 Codex 统一核 build 准入。

- 2026-09-22 GLM（r2 修订稿）：按 Codex counter 4240fbca R1～R4 完成准备稿返工（保留三席原文/
  日志）：机账 v2 以 ruleTable+生成式计数取代估算分桶（展开验证 ALL MODULES OK、960L/1274B
  全对账：NEW 955/1259、UNREACH 5/11、PEND 0/4）；snapshot 去重/vanish 禁用域/validate-runtime
  外层守卫/函数锚/F 历史轴（迁 migrate-enemies :96/:98/:211，author-core r1 PEND 撤销——现行
  caller 已 grep 落实）/六负控真实锚（D03 assertCurrentProof generation 实参、E01 0..100 域
  0/100 合法 101 拒）/SHA/caller/editor×12/fixture×9/Biome/README 索引全部更正，`pnpm check:docs`
  PASS。25+9+2 白名单与已核事实不动；premise/design 维持 verified/agree（以修订稿为准）。
  只改本人回执/机账/席位/日志与 README 索引，未改产品/正式测试/原探针/官方配置基线/共享状态，
  不开 build、不标 done。修订候选并行复核提示词见下（钉同一修订提交）。

- 2026-09-22 GLM（准备完成）：在 codex/glm-coverage-wave2 工作树（基 f828b9fc，零产品/测试/
  配置改动）一次完成六组逐族分类：25 模块 960L/1274B 分桶 NEW671/888·PKG124/186·XPKG103/117·
  UNREACH29/42·PEND33/41（与冻结机账逐模块对账通过）；A01～F03 逐族 caller/fixture/旧测试
  精确标题/断言/最强坏实现/代表负控落 [准备回执](../../testing/glm-coverage-wave2-receipt.md)
  与 [机账](../../testing/glm-coverage-wave2-results.json)；白名单冻结 25 测试+9 fixture+2 工具；
  PEND 项单列。签本人 premise verified / design agree（证据见本席）。两席同候选并行设计审查
  提示词见下；未改共享状态、不代签、不标 build/done。

- 2026-09-22 Codex：用户要求给GLM一大批覆盖率工作。同步main至456feb12、生产对57dda7ed相同；用7538/633对应报告核25模块并生成960行/1274臂候选清单，六组工作包与禁止范围落盘。主树旧7502报告未采用；两类无现行caller的审计入口暂排除。未改产品、测试或官方覆盖率，当前只交GLM准备；没有签字豁免。
- 2026-09-22 Codex（规划验证）：census与冻结JSON复算一致，旧7502报告拒绝；Biome与文档门通过。准备工具对报告额外identities的初版误拒已按持久baseline字段投影纠正，仍核全部身份/计数/范围字段。下一步GLM填写逐族合同并签本人准备结论，不直接实施。

## 下一位Agent提示词（给GLM，可立即开始准备）

在 /Users/zhangxu/illegal/type-pal 接 TEST-NONVISUAL-COVERAGE-2 r1，卡 docs/ops/tasks/TEST-NONVISUAL-COVERAGE-2-six-domain-boundaries.md，draft，Coding Owner=GLM。先同步main/检查工作树，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡、docs/testing/glm-coverage-wave2.md、冻结evidence.json与glm-delivery-checklist.md。生产冻结57dda7ed2376fc25f07756be117bb4a058d09915，基线7538项/633生产文件。
请在独立codex/glm-coverage-wave2工作树，一口气完成W2-A～F六组25模块的逐臂分类、合法fixture/guard、真实caller、旧测试精确标题去重、业务断言与最强单点反例，冻结新增测试/fixture/工具白名单；将准备回执写docs/testing/glm-coverage-wave2-receipt.md，机账写glm-coverage-wave2-results.json，核每臂唯一主分类和各组加总。960行/1274臂只是整文件候选缺口，不能承诺全可达；F组区分full已有证明与fast输入解耦，不测历史translator注入/旧输出分支。发现未知政策、现行无caller或产品缺陷要单列，不固化为正确绿测。
本阶段可读源码/旧测试/真实来源、跑既有定向并做隔离取证；不得改packages、正式测试、原probe、官方baseline/config/排除/超时、真实data/projects或模拟器UI；不操作浏览器/做视觉。不得checkout主工作树或恢复stash。
准备完请落自己有一手锚点的premise/design或counter，并提交推送；不改共享状态，不代签，不标build/done。给Codex和Kimi两份钉同一准备候选的并行设计审查提示词。等三席齐且Codex核build allowed后，在同一父卡/分支按六组各一提交连续实现，最终整包交Codex；严格执行自检清单和工作包验收，GLM不跑官方ratchet/strict-fast。不要每组停下询问继续，也不要绕过设计门。

## 修订候选并行复核提示词（钉同一修订提交：codex/glm-coverage-wave2 @ 38dd1fe1；下方 d4703cdf 版提示词保留历史）

### 给Codex（复核r2）

```text
在 /Users/zhangxu/illegal/type-pal 复核 TEST-NONVISUAL-COVERAGE-2 r2 修订准备候选，卡 docs/ops/tasks/TEST-NONVISUAL-COVERAGE-2-six-domain-boundaries.md（draft），分支 codex/glm-coverage-wave2 修订提交 38dd1fe1（worktree /Users/zhangxu/illegal/type-pal-glm-wave2），针对你 4240fbca 的 R1～R4。
先同步分支/核工作树，读你的 counter、GLM 回执 r2（docs/testing/glm-coverage-wave2-receipt.md）与机账 v2（glm-coverage-wave2-results.json schemaVersion 2）。逐项复核：① ruleTable 可机械展开——按 expansionRule 重放求交，验证 25 模块集合相等与 generatedTotals（NEW955/1259·UNREACH5/11·PEND0/4=960/1274）；② R2 五处更正（B04 收窄 :40-42/:85/:87+branch:39/:76、vanish 3/6 UNREACH、validate-runtime 2/5 UNREACH、script-world 锚点、core:170 归 moveEntity NEW）；③ R3 迁移（历史轴=migrate-enemies :96/:98/:211 共 0L/4B；author-core r1 PEND 撤销的 caller 证据 validate.ts/runtime-script.ts/enemy-script.ts/script-compiler-core.ts）；④ 六负控真实锚（script-project-core:148-149/battle-trial-assets:78/world-sprite-behavior:527-555/tileset-references:243 generation 实参/enemy-script percent 0..100/script-library-audit:155 谓词）；⑤ 元数据（SHA 058d09915/caller src/migrate-content.ts:1753/editor×12/fixture×9）与 check:docs PASS/Biome。在本人席位对修订稿签 accept、维持 counter 或列新反证并写日志提交推送；保留他席原文，不改GLM文件/共享状态、不代签。三席对修订稿齐后由你统一核 build allowed。
```

### 给Kimi（复核r2）

```text
在 /Users/zhangxu/illegal/type-pal 独立复核 TEST-NONVISUAL-COVERAGE-2 r2 修订准备候选，卡 docs/ops/tasks/TEST-NONVISUAL-COVERAGE-2-six-domain-boundaries.md（draft），分支 codex/glm-coverage-wave2 修订提交 38dd1fe1（worktree /Users/zhangxu/illegal/type-pal-glm-wave2）。先同步/核工作树，读 AGENTS/CLAUDE/READ-FIRST、Codex counter 4240fbca（R1～R4）、GLM 回执 r2 与机账 v2；不读或复述Codex本轮复核结论。
压力点：① 生成式映射的展开规则是否有歧义（行取首条命中、分支按 line 归类）与规则区间/理由与源码函数归属一致性（抽三模块重放）；② UNREACH 三处（vanish 3/6、validate-runtime 2/5）之外是否还有r1同类误判残留；③ PEND 只剩 migrate-enemies 0L/4B 是否与 E-05 边界一致、author-core 全 NEW 的 caller 证据是否充分；④ 六针的合法正控/反例/拟定标题是否有鉴别力且不依赖 mock 前置守卫；⑤ 异步族合同（A03/A05/B04/B05 entered+同步结局+finally 同一 pending）与 F 组自包含 fixture guard 前置是否可在映射上落实。在本人席位签 accept 或带 file:line counter 并写日志提交推送；保留他席原文，不改GLM文件/共享状态、不代签、不标build/done。
```

## 并行设计审查提示词（钉同一准备候选：codex/glm-coverage-wave2 @ 准备提交；历史，已被上方 r2 版取代）

### 给Codex

~~~text
在 /Users/zhangxu/illegal/type-pal 审 TEST-NONVISUAL-COVERAGE-2 r1 准备候选，卡 docs/ops/tasks/TEST-NONVISUAL-COVERAGE-2-six-domain-boundaries.md（draft），分支 codex/glm-coverage-wave2（独立worktree /Users/zhangxu/illegal/type-pal-glm-wave2），生产冻结57dda7ed，官方fast7538/633。
先同步main/核工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、docs/testing/glm-coverage-wave2.md、你的冻结evidence.json、GLM准备回执 docs/testing/glm-coverage-wave2-receipt.md 与机账 glm-coverage-wave2-results.json。
独立复核（不与GLM互相复述）：① 25模块分桶与你的冻结LCOV逐模块对账（NEW671/888·PKG124/186·XPKG103/117·UNREACH29/42·PEND33/41）；② 抽读各主导区域源码验证分类方向（adapter派发臂/script-world条件与cursorHandoff/core命令与moveEntity/trial snapshot/投影函数/守卫臂/迁移三文件）；③ PKG/XPKG去重标题是否真实存在且确覆盖所述臂（尤其script-host-adapter.current-dispatch五标题、F组16项full-only）；④ 白名单25+9+2是否与逐族合同一致、PEND单列是否恰当；⑤ 代表负控12~18针规划的鉴别力。
在本人build前席位签带锚点的premise verified/design agree或counter并写日志提交推送；保留他席改动，不改GLM准备文件/共享状态、不代签。若三席齐，由你统一核build allowed并记录；build后GLM在同一分支A→F连续实施、整包交你独立接收。
~~~

### 给Kimi

~~~text
在 /Users/zhangxu/illegal/type-pal 独立审 TEST-NONVISUAL-COVERAGE-2 r1 准备候选，卡 docs/ops/tasks/TEST-NONVISUAL-COVERAGE-2-six-domain-boundaries.md（draft），分支 codex/glm-coverage-wave2（worktree /Users/zhangxu/illegal/type-pal-glm-wave2），生产冻结57dda7ed。先同步main/核工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、工作包glm-coverage-wave2.md、GLM准备回执与机账；不读或复述Codex本轮结论。
压力测试方向：① 逐族合同的业务断言是否有鉴别力（非"非空即过"）、最强坏实现是否真能被代表负控钉住；② PKG/XPKG/UNREACH/PEND分类有没有把"外层守卫已挡/跨包已证/防御不可达"误当新增、或把可达业务误踢出NEW；③ F组自包含fixture的正式guard前置与"full已有证明不二次报功"边界；④ 异步族（A03/A05/B04/B05）是否按entered+同步结局+finally同一pending合同设计、不以超时判红；⑤ 白名单与PEND单列是否夹带产品改动或未定政策。
抽读至少三组一手源码与对应旧测试标题独立验证。在本人build前席位签premise verified/design agree或带file:line的counter并写日志提交推送；保留他席改动，不改GLM准备文件/状态、不代签、不标build/done。
~~~
