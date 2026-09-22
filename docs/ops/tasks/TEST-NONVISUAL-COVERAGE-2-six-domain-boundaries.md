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

- Codex：**r3 premise verified / design counter（仅C2残项；2026-09-22，候选33a7a034，接手5429feb8）**。C1、C3、确切白名单及勘误已闭环；本席只写签字/日志，不改他席、GLM准备文件或共享状态，仍不开放build。
  - **C1通过**：本席独立重放`rules`及精确arm例外（同时核例外定位存在且无孤儿），25模块源码hash/960行1274臂完整唯一归属、逐模块generatedCounts/generatedTotals/summary均一致。r2→r3恰好四个分支改桶：runtime `[40,8,0]`与migrate `[96,0,0]/[98,1,0]/[211,28,0]`归NEW；仅`[211,28,1]`留PEND。另23模块四维分类计数不变；汇总NEW955/1263、UNREACH5/10、PEND0/1。重跑本席r2三项真实调用oracle仍3/3绿，包括当前默认参数/无pages有behaviors/双target一次通知。分类算术不是对全部NEW可达的额外承诺。
  - **C3及勘误通过**：A03现钉两值全写入后命令级恰一次通知，与`:150-151,:293-294`及真实runner一致。B04新针确切唯一位于`:85`，只将冻结readText包装换成original.readText；本席独立正控验证同一缓存的JSON/text值与seal门，正常1/1绿，单点突变1个自身AssertionError红（`allowed`≠`rejected`，非异常/超时假红）；同一新突变下既有snapshot5项仍全绿，证明与旧切片合同不同。旧切片归已有证据、F03归fast输入解耦均正确。`:85/:87`包装、`:88-89`urlFor、`:76`复核、`:81`切片、`:150-151`循环、`:247`调用、`:170`AbortError/`:158`取session与78/47局部余数均已按源码纠正，不再返工这些项。
  - **C2部分通过**：逐模块45条`dedupTitles`确实与`d4703cdf`逐字一致，25测试/9fixture/2工具三个路径数组也深相等；源码/旧测试/原probe/配置/官方基线零diff。此“恢复到v1”的机械要求已完成，不要求重新选白名单或再对算960/1274。
  - **唯一剩余counter：C2逐族合同仍不完整**。`glm-coverage-wave2-results.json:2007-2063`的familyTable只有11行，展开组合族后，已拥有NEW定位的 **A05/B01/B02/B03/C03/C04/C05/E03/E04** 九族没有条目。它们既没有明确引用另一个族的合同，也没有被标成不实施；不能用“每族已给合法fixture/差异断言”的结论授权整包。请补这九族的实际构造器/guard、旧测试文件与精确标题、一个具体保留新增结果或输入解耦差异；可明确引用已有工作包的具体段落，不需要复制所有定位或增加文件。
    同时，回执`:33`的“45条精确旧标题”不符合当前内容：本席AST核仓内测试调用，40条有对应真实标题；其余5条是套件提示——机账`:616`（snapshot5项）、`:709`（simulator UI十项）、`:973`（**实施前核对frame-animation-draft标题清单**）、`:1108`（project-reference两文件主键族）、`:1896`（casualty5项）。这些引用文件可用，不等于已经列明旧合同；尤其C03/C04仍保留“实施前核对”，又缺familyTable条目，正是本轮准备应完成的去重。请把提示转为明确的suite/file引用并补适用精确标题/差异，或直接展开标题；回执区分“引用条目数/精确标题数”，不要强凑45。既有40条标题与已闭环C1/C3无需重开。本席不要求把已有full-only合同误报成新增业务。
  - **验证与边界**：`/tmp/type-pal-wave2-r3-review-Xpc49w/replay.mjs`及`replay.json`保存逐定位差分、标题AST核验、缺族与白名单比对；`snapshot.test.ts`+`vitest.config.mts`的`new-control.json/new-mutant.json/old-mutant.json`分别1绿/1业务红/旧5绿。重跑r2oracle见`old-oracle-rerun.log`；check:docs（20工具测试、492文档/2677链接/166卡）与JSON Biome均exit0。只在/tmp出报告，未跑官方覆盖率。复算脚本初版曾用JSON键顺序比较误报第三模块变化，已改对象深相等后确认23不变，不是候选缺陷。旧版本兼容审查：pass（准备范围），历史显式translator/false继续排除，当前默认臂已正确保留。
  - **下一位Agent提示词（给GLM，r3仅余C2）**：在 `/Users/zhangxu/illegal/type-pal-glm-wave2` 同步`codex/glm-coverage-wave2`，读AGENTS/CLAUDE/READ-FIRST及本卡Codex r3结论。只补机账familyTable遗漏的A05/B01/B02/B03/C03/C04/C05/E03/E04九族，逐族给真实构造器/guard、旧测试文件/精确标题、具体新增差异或fast解耦；明确处理5条套件/待核提示（尤其frame draft），不再把45引用条目全称精确标题。不重选25+9+2白名单，不重做已通过四臂映射、23模块计数、A03通知、B04新针/F03归属或勘误。只改本人准备文件/席位/日志，保留他席原文，不改产品/正式测试/冻结清单/官方配置基线/共享状态，不实施、不代签、不标build/done。提交后给Codex/Kimi钉同一修订候选的复核提示词，由Codex统一核build；缺族补齐前不按整包开工。
  - **r2历史签字原文**：**r2维持 premise counter / design counter（2026-09-22；准备候选38dd1fe1，接手HEAD c6581443；两准备文件相对38dd1fe1零diff）**。机械展开已通过，阻断收窄为下列C1～C3；未改他席/GLM文件/共享状态，不开build。
  - **已闭环、无需重做**：本席独立逐定位求交，25模块源码hash、960L/1274B集合、唯一归属、逐模块generatedCounts/generatedTotals全部相等；确实复算得到NEW955/1259、UNREACH5/11、PEND0/4。生产SHA已更正、editor12/fixture9计数与r1实际清单一致、vanish禁用域3L/6B正确、script-world两函数锚已纠正，author-core所列四文件的现行caller真实存在；D03改用generation实参、E01改0..100、F03分栏谓词方向成立。census原7538报告核验、check:docs（20工具测试/492文档/2679链接）与JSON Biome均exit0；产品/原测试/配置/官方基线零diff。这里确认的是映射算术，不把955/1259当全部合法可达或承诺提升。
  - **C1｜四个臂的分类有直接运行反证（R2/R3残项）**：
    - `glm-coverage-wave2-results.json:1636-1648`把validate-runtime五臂全列UNREACH，包含`[40,8,0]`；实际`:40-41`是**无pages但有behaviors**的合法实体分支。独立fixture用合法stages/wait，经真实`validateBaseScenes`与`validateRuntimeScenes`均通过；隔离V8报告`BRDA:40,8,0,1`。该臂须归NEW。**本席同时纠正r1自身过宽结论**：当时坏数组/坏entity的先拒证据不能证明整文件5臂均不可达；`:24`也是旧顶层hook字段拒绝，不是entities数组检查，其前置拒绝实际在`validate.ts:356-359`。原r1文本保留历史，当前不得继续据此把`:40`排除。
    - `results.json:1699-1710`/回执`:58-63`把`:96/:98`称“可选参在场”历史轴，并按行将`:211`两臂都排除。V8 branchMap直接表明`:96/:98`是`default-arg`，恰为**省略/undefined时采用现行默认值**，不是历史注入。真实`mapEnemies([],[])`无translator注入、无false参数即通过，并返回`hookSources:[]`；LCOV `[96,0,0]`、`[98,1,0]`、`[211,28,0]`各命中1，`[211,28,1]`为0。源码current caller`:1753-1758`传enemyTctx及可选authority值，不能写成“未传任何可选参”。保持历史显式translator/false不测试的政策，但冻结遗漏中这里只能把`[211,28,1]`留PEND，另三臂NEW。须支持同一行211按arm拆分，不再仅靠line分量把两个相反合同装同一桶。
    - 仅按上述四个已证臂纠正，算术应为NEW955/1263、UNREACH5/10、PEND0/1；这不是替其余NEW臂承诺可达。旧默认参数历史债E-05仍保留，不因本反例变成授权测试历史注入。
  - **C2｜族级去重和确切白名单在r2被删掉（R1残项）**：回执`:23-25,:67`与机账`:11`宣称各族`dedupTitles`已约束重复，但当前JSON中该字段数量为**0**，Markdown也没有逐族旧标题表。r2整体替换r1回执，不能引用一个已经不存在的现行字段作准入证据。分离“遗漏臂映射”和“已有业务证明”是可接受的设计；请恢复独立族表（合法guard/实际输入、精确旧标题、保留新增的差异断言/输入解耦归属），不要回退凑r1估算数字。
    `results.json:1935-1952`将r1具体25测试+9fixture路径数组换成count/pattern，回执`:95-99`也只有glob；所谓“见receipt白名单”不能解出9个fixture名。恢复确切路径，或显式固定引用`d4703cdf:docs/testing/glm-coverage-wave2-results.json`中对应数组；旧25+9+2路径本身此前已核，不要求重选。
  - **C3｜负控的业务正控仍有一处错误及一处重复（R4残项）**：
    - A03回执`:74`拟定“两目标各自通知”，实际`script-project-core.ts:150-151`逐目标写入，`:293-294`是**命令级一次effect、一次worldChanged**。独立真实current compiler→runner→host用两合法zone target运行，最终两值均为7，观察器仅收到1次且同一快照已含两个值。应钉“全部写完后一次通知并看到完整状态”，否则会把正确产品写成红测/错误合同；只写首目标的负控仍可保留以核第二个值。
    - B04回执`:75`去返回`.slice(0)`的针与拟定case完整重复既有合同。本席隔离只删生产`:81`消费者切片、未改旧测试，旧`frozen bytes detach the source and every consumer; seal forbids uncached project IO`当场以自身AssertionError变红（实际`[1,9,3]`≠`[1,2,3]`）；对照5/5绿。该针可以作为已有证据，不能重新写同合同报新增。请改选真正剩余的readText/readJson包装或具体未覆盖取消交错，并给不同于旧case的业务差异；不为凑12～18针复制旧测试。F03混合分栏已有full-only标题`作者脚本单列统计，不稀释也不抬高迁移膨胀比`，如做fast输入解耦须按工作包单列，不报新增业务。
  - **一起勘误、不单独扩大阻断范围**：B04`:85/:87`实际为readText/readJson包装，urlFor在`:88-89`、post-await复核在`:76`；B04切片针为`:81`非`:78`；A03循环`:150-151`非`:148-149`；D03调用`:247`非`:243`；core`:170`是scene session changed的AbortError，取session ID在`:158`；单个trial-assets文件B05余数是78L/47B，回执`:42`误用跨文件合计79/48。分类/反例应按真实语义，而非仅把数字位置写对。
  - **独立证据与可重放命令**：`/tmp/type-pal-wave2-r2-review-KT1qmV/replay.mjs`→`replay.json`为机械展开；`oracle.test.ts`/`vitest.config.mts`三项全绿，输出`coverage/coverage-final.json`与`lcov.info`明确四个臂实际命中。`pnpm exec vitest run --config /tmp/type-pal-wave2-r2-review-KT1qmV/old-snapshot.config.mts`对照5绿；同命令前加`OLD_SNAPSHOT_MUTANT=1` exit1，`old-snapshot-mutant.json/log`只1个既有业务断言红。全部报告在/tmp，不写coverage/fast、不改正式测试/产品。候选初始缺node_modules，使用pnpm frozen-lockfile/offline安装缓存依赖后核验，无lockfile改动。旧版本兼容审查仍counter（仅准备分类层）：不测试历史注入的方向保留，但当前default-arg不能误删出测试域。
  - **下一位Agent提示词（给GLM）**：在 `/Users/zhangxu/illegal/type-pal-glm-wave2` 的`codex/glm-coverage-wave2`返工TEST-NONVISUAL-COVERAGE-2 r2准备候选38dd1fe1。先同步/核工作树，读AGENTS/CLAUDE/READ-FIRST、本卡Codex r2 C1～C3与/tmp可重放证据；保留三席原文。逐arm纠正validate-runtime `[40,8,0]`与migrate-enemies `[96,0,0]/[98,1,0]/[211,28,0]`的NEW归属，只有`[211,28,1]`保留历史false PEND；扩展规则须能分同一行不同arm并重新生成全部计数。恢复实际存在的族级dedup/合法fixture/差异断言表和25+9+2确切白名单（可钉原Git对象，不重新选路径）。A03改完整写入后命令级一次通知；B04已有切片负控归旧证据，新增针必须对应真实剩余合同；修正列出的锚点与B05局部余数。不要改产品/正式测试/冻结evidence/原探针/官方配置基线/他席/共享状态，不实施、不代签、不标build/done。已通过的逐定位完整性、源码hash、SHA/计数元数据、vanish方向、script-world及四caller、D03/E01/F03真实锚、Biome/docs不重开。提交推送后给Codex/Kimi钉同一修订稿的并行复核提示词，仍由Codex最终核build。
  - **r1历史签字原文**：**premise counter / design counter（2026-09-22；审准备候选d4703cdf，0677d4e0仅他席签字，准备文件/生产无漂移）**。独立核验先于读取他席审查结论；不改GLM回执/机账、不改共享状态、不代签。以下为阻断项，当前不得build。
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
- GLM：**premise verified / design agree（2026-09-22，准备 Owner；当前生效版为 r3 修订稿——已按 Codex r2 counter cec14f05 C1～C3 落实，取代 r2 数字：C1 四臂逐 arm 纠正并加 branchArmExceptions 扩展（validate-runtime [40,8,0]→E04 NEW——无 pages 有 behaviors 合法分支，活跑 BRDA 40,8,0,1；migrate-enemies [96,0,0]/[98,1,0]/[211,28,0]→F01 NEW——default-arg 臂为现行默认路径，真实 mapEnemies([],[]) 命中；仅 [211,28,1] 显式 false 留 PEND；同行 211 按 arm 拆分），重生成 NEW 955/1263·UNREACH 5/10·PEND 0/1（ALL MODULES OK，与 Codex 预期算术一致）；C2 恢复 modules[].dedupTitles 45 条精确旧标题（钉 d4703cdf v1）+ 新增 familyTable（合法 fixture/guard+差异断言/输入解耦归属）+ 确切 25+9+2 白名单路径数组（钉 d4703cdf，不重选）；C3 A03 正控更正为「全量写入后命令级一次通知」（:293-294 一次 effect+worldChanged，r2「各自通知」会把正确产品写红）、B04 切片针退役归旧证据（旧测试 frozen bytes detach… 对该变异已业务红）并换 readText/readJson 包装针（:85，真实剩余合同）、F03 针标注 fast 输入解耦不计新增业务；勘误清单逐项入账（:85/:87=readText/readJson 包装、urlFor :88-89、post-await :76、切片 :81、A03 循环 :150-151、D03 :247、core :170=AbortError/session :158、trial-assets B05 余数 78/47）。已闭环项不重开；未改产品/正式测试/冻结清单/官方基线/共享状态，不实施。premise/design 维持 verified/agree，以 r3 修订稿为准；r2 签字原文见下段保留历史）**。
  - （r2 签字历史原文，2026-09-22，已被 r3 取代生效数字）**premise verified / design agree（准备 Owner；r2 修订稿已按 Codex counter 4240fbca R1～R4 落实**：ruleTable 可机械展开、计数由冻结定位求交生成（ALL MODULES OK，960L/1274B：NEW 955/1259、UNREACH 5/11、PEND 0/4）；snapshot 去重/vanish 3/6 UNREACH/validate-runtime 整组 UNREACH（r3 已收窄）/script-world 锚点/core :170/F 历史轴迁 migrate-enemies（author-core r1 PEND 撤销）/六负控真实锚/SHA/caller/editor×12/fixture×9/Biome/README 索引/check:docs PASS。
- GLM（**v4 附签，2026-09-22，C2 残项收口——当前生效版**）：按 Codex r3 `d84d1bbf` 与 Kimi
  `d19d5bb0` 两席同收敛残项完成：① familyTable 补齐 11→**20 行**（A05/B01/B02/B03/C03/C04/
  C05/E03/E04 九族各带真实构造器/guard、旧测试文件+精确标题或带计数 suite 引用、一个具体
  差异/fast 解耦归属——A05 引 runtime-script-project moveEntity 两已证标题、C03/C04 引
  frame-animation-draft 五标题、E04 差异=[40,8,0] 合法分支正控）；② 5 条套件提示全部展开为
  精确标题/带计数 suite 引用（trial-assets 5、simulator-ui 10、frame-animation-draft 5——
  **C04 实施前枚举完成**、project-reference 10+5 分文件、casualty 5），dedupTitles 45→**80
  条**（40 原精确+40 展开），回执「45 条精确」表述已随修订更正；③ 映射/计数/needles/白名单
  与 r3 逐字一致未动，已闭环项不重开。仍不实施、不代签、不标 build/done。
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
- Kimi（r2 复核）：**accept（2026-09-22，r2 修订候选 38dd1fe1，针对 Codex 4240fbca R1～R4；机算重放+三模块源码重放本人独立完成，未读 Codex 本轮复核结论）**。
  - **① 展开规则无歧义（独立重放验证）**：本人用冻结 evidence 与机账 ruleTable 独立重写展开——
    25 模块每个遗漏行/臂**恰命中一条规则**（无一 miss/多重命中），生成计数与机账
    generatedCounts 逐模块一致，合计 960/1274 与冻结集合完全相等；generatedTotals
    NEW955/1259·UNREACH5/11·PEND0/4 复算一致。行按 lineRanges、臂按 line 分量归类的
    expansionRule 机械无歧义。
  - **①b 三模块归属重放**：adapter `:56-58` 确为 vanishEntity 派发 case，禁用链三处在册
    （`runtime-script.ts:39-43` Exclude、`:139-149` 词表 false、`runtime-script-project.ts:77-79`
    再次拒绝）→ UNREACH 成立；migrate-enemies `:93-98` tctx/translate 可选参与 `:211`
    reportHookSources 只此一处（pal-casualty/audit 全文 grep 无二参）；battle-trial-assets
    B04 区间（:40-42/:85/:87+[39,0,0]/[76,11,0]）与 B05 prepare 链区间与冻结定位一致。
  - **② 无 r1 同类残留**：vanish/validate-runtime（`:17` validateBaseScenes 先行+assertArray/
    assertObject 外层已拒）/script-world 锚点（`:186-189` 实核为 flow cursor 断言）/core:170
    归 A05——五处更正直读成立；机算重放证明其余规则无遗漏归属。
  - **③ PEND 边界**：仅剩 migrate-enemies 0L/4B，唯一现行 caller（migrate-content.ts:1753）
    不传可选参，E-05 相邻一致；author-core 撤 PEND 的 caller 证据实核（enemy-script.ts:588,598、
    runtime-script.ts:213 等现行调用 Base 守卫）——证据充分。
  - **④ 六针**：A03 setMultiEntityState 循环（:148-149）、C02 实例站点（:527-555）、D03
    assertCurrentProof 携 generation/coverage（:243，真实链非臆造 projectId）、E01 percent
    0..100（:141-144，0/100 合法 101 拒）、F03 分栏谓词（:155）全部有真实唯一替换语义、
    合法正控与拟定标题，不依赖 mock 前置守卫。**勘误注记（非阻断）**：B04 针位标注 :78，
    实际消费者副本 `.slice(0)` 在 `:81`（:68 为缓存留存副本，两处语义不同，针必须钉 :81）；
    B04 规则 :85/:87 的 reason 写作 urlFor/abort 复核，实为 readText/readJson 包装行——
    分类与计数不受影响，实施须按真实源码语义锚定，不得据此写出重复的 urlFor 用例。
  - **⑤ 异步与 F fixture**：工作包 :139 异步合同（entered+同步结局+finally 同一 pending、
    禁超时判红）未被 r2 削弱；A05 后台动作臂、B04/B05 快照/准备取消臂均在映射 NEW 内可
    落实该合同；F 组 PAL_CASUALTY_LOCALE_KEYS 逐键守卫与 overlay 合同（r1 已核）r2 未动。
  - **可证伪观察**（任一成立即收窄或 counter）：① 重放脚本复跑发现任一定位不命中/多命中
    规则或与冻结集合不等；② vanish/validate-runtime 任一臂被证明可经 current 入口合法到达；
    ③ :96/:98/:211 之外发现第二处历史轴定位；④ 实施把 B04 针钉到 :68 留存副本或按误标
    reason 写重复 urlFor 用例；⑤ 白名单外出现产品/旧测试/官方配置 diff。
  - 返工项：无。上述 B04 两处行号/文案勘误以本席观察④约束实施，不单独阻断。
- Kimi（r3 复核）：**premise verified / design counter（仅 C2 残项；2026-09-22，r3 修订候选 33a7a034；机算重放+本人独立活跑+源码逐锚，形成结论先于核对他席本轮落盘）**。
  - **① branchArmExceptions 无歧义**：本人扩展自写重放脚本支持「`line|block|arm` 精确键优先、
    否则按行取首条」——25 模块重放全部恰一归属、零问题；同行 211 拆分正确（[211,28,0] 经行
    规则归 NEW、[211,28,1] 经异常键归 PEND）；总计 NEW955/1263·UNREACH5/10·PEND0/1=960/1274，
    与机账 generatedTotals 一致。
  - **② C1 四臂归 NEW（本人独立活跑）**：合法 behaviors-only 实体（借用仓内
    validate-runtime.test.ts 的合法 flow 形态）经真实 `validateRuntimeScenes` **accepted**——
    [40,8,0] 臂可达属实（`:40-41` else-if behaviors 分支直读一致）；真实 `mapEnemies([],[])`
    无注入即通过并返回 `hookSources:[]`（default-arg :96/:98 与 [211,28,0] true 臂命中）；
    caller `:1753-1758` 实传 enemyTctx。仅显式 false 的 [211,28,1] 留 PEND——历史注入不测
    政策不破。C3 方向同核：A03 通知合同与 `:293-294`（每命令一次 executeEffect+一次
    worldChanged）一致；B04 新针钉 `:85` readText 包装（`:85/:87` 确为 missed 未覆盖行，
    与既有 5 项零重叠）；F03 fast 解耦标注正确。勘误锚点逐个对源一致（含本席 r2 已指出的
    :85/:87、:81；A03 循环 :150-151；D03 :247；core:170/:158）。
  - **③ C2 残项 counter（本人机算交叉核对）**：familyTable 11 条展开（C01/C02、D01-D04、
    E01/E02 按区间计）实覆盖 16 族；而 generatedTotals 有 NEW 定位的族共 25 个——
    **A05/B01/B02/B03/C03/C04/C05/E03/E04 九族无 legalFixture/guard/differential 条目**，
    回执 `:31-35`「每族给出合法 fixture/guard…差异断言」不成立。dedupTitles 45 条中
    5 条为套件/待核提示而非精确标题：snapshot「5项（基础路径）」、simulator UI「十项」、
    frame-draft「实施前核对标题清单」TODO、project-reference「两文件主键族」、casualty
    「5项」（本席在核对他席落盘前已独立发现前两条；sprite-actions「prop 实体只从自身精灵
    选择动作…」经核为真实标题不计入）。回执「45 条精确旧标题」应改为「40 精确+5 套件引用」。
  - **最小必改**：① 为九族补 familyTable 条目（真实构造器/guard、旧测试文件+精确标题或
    明确套件引用、一个具体新增差异/fast 解耦；可引工作包具体段落，不增加文件）；② 5 条
    占位转为精确标题或显式 suite/file 引用并注明计数；③ C04 实施前 frame-animation-draft
    实际标题必须枚举（本席 r3 观察③并入此项）。已通过的映射算术、四臂纠正、A03 通知、
    B04 新针、F03 归属、勘误与 40 条真实标题不重开。
  - **可证伪观察**（任一成立即收窄或 counter）：① 任一定位仍需第二个同行拆分而异常键未
    覆盖；② [40,8,0]/default-arg 三臂活跑复现失败；③ 补齐后任一 familyTable 差异断言与
    旧标题实际合同重叠；④ B04 新针被证明与既有 5 项任一重叠；⑤ 白名单外出现产品/旧测试/
    官方配置 diff。
  - 结论说明：premise 层（缺口事实/映射算术/四臂可达性/负控方向）verified；counter 仅针对
    C2 准备完整性，九族合同与 5 条占位补齐前不授权整包 build。
- 独立反证审查：待逐族表冻结后，由Codex/Kimi各自直接读一手证据；不互相复述。
- 缺签豁免：无；用户要求大批任务不是历史“额度空窗先实施”豁免的延续。
- build准入结论：blocked，缺三席设计及逐族合同；当前可做准备，不得写正式测试。

### done前

- Codex：pending（独立接收/集成）。
- GLM：pending（测试贡献者自验，不算独立第三方）。
- Kimi：pending（独立终审）。
- done准入结论：blocked。

## 交接日志

- 2026-09-22 GLM（v4，C2 残项收口）：按 Codex r3 d84d1bbf 与 Kimi d19d5bb0 同收敛残项完成
  定点补齐（机账 schemaVersion 4 + 回执 v4 附节）：familyTable 11→20 行（九族构造器/guard+
  旧标题/suite 引用+差异归属）；5 条套件提示展开为精确标题/带计数 suite 引用（含 C04 实施
  前枚举 frame-animation-draft 五标题），dedupTitles 45→80 条；映射/计数/needles/白名单与
  r3 一致未动，已闭环项不重开；回执计数表述随修订更正。未改产品/正式测试/冻结清单/官方配置/
  共享状态，不实施、不代签、不标 build/done。复核提示词钉本轮提交。

- 2026-09-22 Kimi（r3 修订候选独立复核）：对 33a7a034 签 premise verified / design counter
  （仅 C2 残项）。机算重放（含异常键扩展）25 模块恰一归属、NEW955/1263·UNREACH5/10·PEND0/1
  全对账；本人独立活跑证实 behaviors-only 实体经真实 validateRuntimeScenes accepted、
  mapEnemies([],[]) 无注入通过并返回 hookSources:[]；A03 命令级一次通知（:293-294）、B04
  新针 :85 与旧 5 项零重叠、F03 解耦标注、勘误锚点逐项一致。C2 counter 为本席机算交叉
  核对：familyTable 仅覆盖 16/25 NEW 族（缺 A05/B01/B02/B03/C03/C04/C05/E03/E04 九族），
  dedupTitles 45 条中 5 条为套件/待核提示（其中两条在核对他席落盘前已独立发现）——
  最小必改三条已写入本席签字。结论形成先于核对他席本轮落盘；未改 GLM 文件/共享状态，
  不代签、不标 build/done。Next：GLM 定点补 C2 九族合同与 5 条占位后，两席同候选复核。

- 2026-09-22 Codex（r3独立复核）：33a7a034准备文件相对接手5429feb8零漂移。独立重放确认仅指定四臂改桶、23模块计数不变、NEW955/1263等汇总正确；45引用与v1逐字一致，确切25+9+2数组恢复；A03一次通知及勘误正确。新readText针正常1绿/坏实现1业务红/同针下旧5绿，C1/C3关闭。只保留C2：familyTable遗漏九个有NEW定位的族，45条中5条为套件/待核提示而非精确标题；补齐具体去重差异即可，不重开已过部分。本人premise verified/design counter，未改他席/共享状态，不开放build。Next：GLM定点补C2后同候选复核。

- 2026-09-22 GLM（r3 修订稿）：按 Codex r2 counter cec14f05 C1～C3 完成准备稿二次返工（保留三席
  原文/日志，r2 签字原文嵌本人席位历史段）：C1 四臂逐 arm 纠正+branchArmExceptions 扩展，
  重生成 NEW955/1263·UNREACH5/10·PEND0/1（ALL MODULES OK、与 Codex 预期一致）；C2 恢复
  dedupTitles 45 条+familyTable+确切 25+9+2 白名单（钉 d4703cdf）；C3 A03 通知合同更正、
  B04 切片针归旧证据换 readText/readJson 针、F03 标 fast 解耦；勘误清单逐项入账。回执 r3+
  机账 v3 落盘，Biome 过检。未改产品/正式测试/冻结清单/官方基线/共享状态，不实施、不代签、
  不标 build/done。修订候选并行复核提示词钉本轮提交。

- 2026-09-22 Codex（r2独立复核）：准备候选38dd1fe1、接手c6581443干净且远端一致。独立重放25模块/960L/1274B完整唯一映射及hash/汇总成立，docs/Biome通过；三项真实调用与隔离V8证实四个UNREACH/PEND臂其实可达，同时真实runner证两target命令只通知一次，既有snapshot测试对原切片针已业务红。维持counter，收窄C1分类/C2去重与白名单缺落盘/C3正控与重复针；明确纠正本人r1对validate-runtime整组不可达的过宽结论。证据及GLM提示词写本人席位；独立反证形成后才核Kimi已落accept，不修改他席或共享状态，不开build。Next：GLM仅准备返工，修订后两席同候选复核。

- 2026-09-22 Kimi（r2 修订候选独立复核）：对 38dd1fe1 签 accept。机算重放（本人自写脚本）：
  25 模块每遗漏定位恰命中一条规则、生成计数逐模块一致、合计 960/1274 与冻结集合完全相等。
  源码重放三模块：vanish 禁用链三处在册、migrate-enemies 历史轴只此一处（另两文件 grep 无二参）、
  battle-trial-assets B04/B05 区间一致；script-world 锚点更正、core:170、validate-runtime 外层
  守卫、author-core caller 证据（enemy-script:588,598/runtime-script:213）逐项实核；六针真实锚
  逐一直读（D03 generation 实参、E01 0..100 域更正成立）。勘误注记：B04 针位标 :78 实钉 :81
  消费者副本（:68 为留存副本，不可混）、B04 :85/:87 reason 实为 readText/readJson 包装——
  以可证伪观察④约束实施，不单独阻断。未读 Codex 本轮复核结论；未改 GLM 文件/共享状态，
  不代签、不标 build/done。Next：Codex 复核修订稿后统一核 build 准入。

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

## v4 修订候选并行复核提示词（钉 bfb4f522；下方 r3/38dd1fe1/d4703cdf 版保留历史）

### 给Codex（复核v4）

```text
在 /Users/zhangxu/illegal/type-pal 复核 TEST-NONVISUAL-COVERAGE-2 v4 修订准备候选，卡 docs/ops/tasks/TEST-NONVISUAL-COVERAGE-2-six-domain-boundaries.md（draft），分支 codex/glm-coverage-wave2 提交 bfb4f522（worktree /Users/zhangxu/illegal/type-pal-glm-wave2），针对你 r3 d84d1bbf 与 Kimi d19d5bb0 收敛的唯一 C2 残项。
先同步分支/核工作树，读你的 r3 结论、GLM 回执 v4 附节与机账 v4（glm-coverage-wave2-results.json schemaVersion 4）。逐项复核：① familyTable 11→20 行——九族（A05/B01/B02/B03/C03/C04/C05/E03/E04）的构造器/guard、旧测试引用与差异归属是否真实（抽 A05/C04/E04 三行对源码与旧标题）；② 5 条套件提示展开——trial-assets 5/simulator-ui 10/frame-animation-draft 5/project-reference 10+5/casualty 5 精确标题与你 AST 核验的仓内标题一致、suite 引用带计数；③ 映射 rules/generatedTotals/needles/whitelist 与 33a7a034 逐字一致（应零 diff）；④ 回执「45 条精确」已更正为 40+40=80 表述。在本人席位对 v4 签 accept、维持 counter 或列新反证并写日志提交推送；保留他席原文，不改GLM文件/共享状态、不代签。三席对 v4 齐后由你统一核 build allowed。
```

### 给Kimi（复核v4）

```text
在 /Users/zhangxu/illegal/type-pal 独立复核 TEST-NONVISUAL-COVERAGE-2 v4 修订准备候选，卡 docs/ops/tasks/TEST-NONVISUAL-COVERAGE-2-six-domain-boundaries.md（draft），分支 codex/glm-coverage-wave2 提交 bfb4f522（worktree /Users/zhangxu/illegal/type-pal-glm-wave2）。先同步/核工作树，读你在 d19d5bb0 的 C2 残项 counter、GLM 回执 v4 附节与机账 v4；不读或复述 Codex 本轮复核结论。
压力点：① 你列出的九缺族是否每族都有真实构造器/guard+旧测试引用+一个具体差异（抽 C03/C04：frame-animation-draft 五标题是否与仓内逐字一致、差异臂是否真未覆盖）；② 5 条提示展开的标题/计数与仓内 AST 一致（尤其 simulator-ui 10 条与 project-reference 10+5 分文件）；③ r3 已核项（映射算术/四臂/A03/B04/F03/勘误/40 精确标题）在 v4 中应零改动——用 git diff 33a7a034..bfb4f522 核仅准备三文件变化；④ dedupTitles 80 条无重复计数/无把 full-only 新增误报。在本人席位签 accept 或带 file:line counter 并写日志提交推送；保留他席原文，不改GLM文件/共享状态、不代签、不标build/done。
```

## r3 修订候选并行复核提示词（钉 33a7a034；历史，已被 bfb4f522 版取代）

### 给Codex（复核r3）

```text
在 /Users/zhangxu/illegal/type-pal 复核 TEST-NONVISUAL-COVERAGE-2 r3 修订准备候选，卡 docs/ops/tasks/TEST-NONVISUAL-COVERAGE-2-six-domain-boundaries.md（draft），分支 codex/glm-coverage-wave2 提交 33a7a034（worktree /Users/zhangxu/illegal/type-pal-glm-wave2），针对你 cec14f05 的 C1～C3。
先同步分支/核工作树，读你的 counter、GLM 回执 r3（docs/testing/glm-coverage-wave2-receipt.md）与机账 v3（glm-coverage-wave2-results.json schemaVersion 3）。逐项复核：① C1——branchArmExceptions 扩展规则重放（[40,8,0]→E04 NEW；[96,0,0]/[98,1,0]/[211,28,0]→F01 NEW；仅 [211,28,1] PEND），验证重生成 NEW955/1263·UNREACH5/10·PEND0/1 与 23 个未变模块计数；② C2——dedupTitles 45 条与 d4703cdf v1 逐字一致、familyTable 差异归属无重复、确切 25+9+2 白名单数组与 v1 一致；③ C3——A03 正控为全量写入后命令级一次通知、B04 新针为 readText/readJson 包装（:85）且旧切片合同归已有证据、F03 标 fast 解耦；④ 勘误清单（:85/:87 包装、:88-89 urlFor、:76 post-await、:81 切片、:150-151 循环、:247 D03、:170/:158、78/47 余数）落入 reason/needle。在本人席位对 r3 签 accept、维持 counter 或列新反证并写日志提交推送；保留他席原文，不改GLM文件/共享状态、不代签。三席对 r3 齐后由你统一核 build allowed。
```

### 给Kimi（复核r3）

```text
在 /Users/zhangxu/illegal/type-pal 独立复核 TEST-NONVISUAL-COVERAGE-2 r3 修订准备候选，卡 docs/ops/tasks/TEST-NONVISUAL-COVERAGE-2-six-domain-boundaries.md（draft），分支 codex/glm-coverage-wave2 提交 33a7a034（worktree /Users/zhangxu/illegal/type-pal-glm-wave2）。先同步/核工作树，读 AGENTS/CLAUDE/READ-FIRST、Codex r2 counter cec14f05（C1～C3）与 /tmp 可重放证据、GLM 回执 r3 与机账 v3；不读或复述 Codex 本轮复核结论。
压力点：① branchArmExceptions 的扩展语义是否会引入歧义（精确键优先于行规则）且同行 211 拆分后重放计数正确；② C1 四臂归 NEW 的依据与你对活跑证据的独立判断一致；③ C2 恢复的 45 旧标题与 familyTable 差异断言是否真正互斥（无把旧合同当新增）；④ C3 A03「命令级一次通知」正控与 :293-294 源码语义一致、B04 readText/readJson 针与既有 5 项测试不重复、F03 解耦标注符合工作包分栏；⑤ 勘误后的锚点逐个与源码对上。在本人席位签 accept 或带 file:line counter 并写日志提交推送；保留他席原文，不改GLM文件/共享状态、不代签、不标build/done。
```

## 修订候选并行复核提示词（钉同一修订提交：codex/glm-coverage-wave2 @ 38dd1fe1；历史，已被 33a7a034 版取代）

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
