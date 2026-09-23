# GLM 覆盖率第二波准备回执 r3（针对 Codex r2 counter cec14f05 C1～C3）

> 2026-09-22 Codex实施接手记录：用户授权接替额度耗尽的GLM，当前Owner以任务卡为准。
> 保留GLM A/B提交6839ea78/816c32ce历史，尚未验收。初次复跑9文件58项绿（reforge44/editor14），
> 但reforge typecheck exit2：类型导入未导出/相对路径错位、GridPos缺height、TrialCatalog不满足正式preview输入等。
> 进一步直读见原A04非法flow/entity及B05不完整catalog被强转洗白，B04悬挂Promise未finally释放，
> “同步观察”实际await outcome；需由Codex修正并做代表反控，不以绿测试自证。
> 日志`/tmp/type-pal-wave2-build-Pq8YxT/takeover-{reforge,editor}.log`与`takeover-reforge-tc.log`。
> 后续实施证据另加实名节，以下GLM准备历史不改写。

## Codex实施回执（2026-09-22；2026-09-23三席同候选accept并收口）

用户因GLM额度耗尽授权Codex接手；保留GLM `6839ea78`/`816c32ce`的A/B历史贡献，
Codex复验并修正A/B、实现C～F。整包与`967b35fb`相比仅原白名单新测试/薄fixture/工具及文档，
25份产品源码对冻结`57dda7ed`逐份零差异；旧测试/全局配置/超时/排除/资产无修改。
Codex从此是实施者，不再把本人自验算成独立接收。2026-09-23同候选27bd8c00三席accept齐：
GLM恢复后以贡献者身份复核（d8b9dfa7），Kimi独立终审（5b44c37d），无counter或缺签豁免。
Codex按用户确认核零漂移后done归档；既有统一门禁及集成f703e49c双CI通过，不重复跑覆盖率。
未达whole-file目标与其它卡欠账保持原归属；下方开发期失败/修正、原GLM准备结论均保留历史。

### 实际交付与去重

25测试文件、9组内fixture、2工具；**163项（A25/B40/C20/D14/E45/F19）**。
分包为reforge49、editor50、content45、migrate19，均来自最终JSON执行清单；机账新增实名
`codexImplementation`保存逐文件计数、25模块/四包覆盖对照，不改v5准备字段。

| 组 | 本次主要断言与归属 |
|---|---|
| A | current编译器→真实ProjectScriptRuntimeHost/runner→共享core；完整派发实参、状态落地、两target提交后一次通知、真实move取消/漂移、后台错误与同期保真；不再用假的coordinator或不合法flow绕guard |
| B | 当前目录/命令/预设、完整实际输入、确认集合/undo-redo；可释放同一底层Promise；readText/readJson冻结源；正式工程load+RLE/gzip/cursor/font/PNG宿主→完整资源准备、前后token/revision变化、源IO失败和已创建位图释放 |
| C | 当前作者树先guard再做预览lowering，逐叶完整参数/条件/共享self/具名状态机；同sprite两实例精确站点；帧IO与完整历史分叉；排序/默认动作的稳定身份 |
| D | 完整loader工程→真实EditSession扫描/proof factory，等coverage的新generation仍拒旧proof；资源metadata换代；canonical会话换代、联合删除来源范围、索引元组、精确引用路径/诊断与实参保真 |
| E | current author/runtime和完整父guard上的单轴拒绝/非空正控；敌方条件/动作/概率/战后域及无pages但有behaviors路径；不截断生产guard、不复活vanish |
| F | 自包含提取表→真实translator，完整字段与来源保真；B11-1四入口/独立36键与source语法；离线ScriptIndex/Chunk审计的UTF8/作者分栏/根域/缺文件。表映射、三域与概率等已有full证明部分按输入解耦登记，非19个新业务机制 |

B05的工程与资源fixture留在reforge包内，使用现有dProjectFiles骨架、真实encoder/gzip/hash和正式loader；
没有更改rootDir或生产构造器。浏览器IO替身仅提供合法BDF/cursor/PNG响应、PNG尺寸与close观察，
不声称像素解码/绘制/观感验收；两PNG字节由独立pngjs做CRC/尺寸检查并逐字节对上仓内num/1、num/2。
没有新增公共依赖，PNG验证工具在Node侧读取migrate已声明的pngjs。

### 同口径覆盖（不是把整文件命中全算本批贡献）

[配置](glm-coverage-wave2-coverage.config.mts)两侧都采用官方testSelection/全生产include。
before仅排除本包25个新测试；四包before测试数与当前7627官方基线对应包逐一相等，
生产集合及四维分母相等。报告`/tmp/type-pal-wave2-coverage-fivq93/<pkg>/{before,after}`，不覆盖官方目录。

| 包 | 测试before→after | 行before→after/总数 | 分支before→after/总数 |
|---|---:|---:|---:|
| reforge | 1329→1378 | 8514→8759/14599 | 5749→5913/11359 |
| editor | 2526→2576 | 23227→23336/28636 | 20030→20147/28338 |
| content | 798→843 | 4584→4687/5185 | 4031→4147/5019 |
| migrate | 397→416 | 3569→3785/6724 | 2940→3115/6436 |

合计净增**673L/761S/84F/572B**，含真实被调依赖的间接命中；直接25目标见机账单列。
content行90.40%、分支82.63%（官方四舍五入口径）；并非全部25文件达到95%行/90%分支，不宣称已穷尽所有可达分支。
第一轮157项对照发现B05整段缺席后，补全6项资源准备链；只补跑受影响reforge after，未逐用例跑全仓。
Codex先前89项已在before侧，GLM准备7538的旧遗漏不能重复计入本包新增。

### 有证据的收窄与未关闭项

- `script-references.ts:110-365`旧扫描器/便捷包装未找到现行caller；当前`project-diagnostics.ts:710`
  用canonical `FromVisits`。本批只测现行入口，不靠旧持久脚本形态补命中；旧入口归E-05审查，未删除产品。
- `script-project-core.ts:361-end`的BaseScriptProjectRuntime未找到current消费者，和仍由current host
  委托的BaseProjectScriptRuntimeHost区分；没有据Base名称删除整模块，也不制造旧runtime实例。
- `script-editor.ts:349`的当前私有脚本visitor只产use owner；不制造throw owner来命中引用快照尾臂。
- 其余未命中保留分母：仍有可补状态/投影组合、前置guard已挡的防御、资源可选域，不能统一叫不可达。
  whole-file目标未达项与计数已交账，下一批按现行消费者继续细分；frame缓存政策/E-05/U-02/N6b/full/Q1/Q2保持原归属。
- D组若干文件覆盖净增0：属于真实业务断言/鉴别力补强，机账如实为0，不报新执行臂。

### 负控、合法性与失败记录

[负控](glm-coverage-wave2-mutants.mjs)：**4个完整新套件正控+17针**通过，
最终树证据`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-wave2-mutants-vxPYv4/summary.json`；日志`mutants-final-tree.log`。
正控163项全执行、零skip/todo；每个负控以正控实测的精确文件/标题选中一个用例，恰1项执行且自身
AssertionError红，字段`filteredByExactName`记录同文件其余名称过滤项，不计实际执行、不修改测试为skip。
每针唯一替换、Vite load实际进入文件见证、25产品hash不变；目标普通Error/混合错误/超时/未执行均拒绝。
全套新测试的绿与每针的红分栏；不把另一用例红当作目标鉴别力。

失败如实保留在`/tmp/type-pal-wave2-build-Pq8YxT/`，不是通过多数重跑放行：

- 接手：58绿但TC exit2；假flow/半catalog强转、错误import/坐标/preview类型均已修。删除一条宿主自检空转与一条越界emptyWorld初始化重复测试。
- Codex开发：A初始页缺失、B技能animation缺失、C loop缺yield/maxIterations，被正式guard拒绝后补完整fixture。
- D初版toEditorState参数次序放错maps/scriptChunks，5项失败；修正到真实地图参数，14项绿。
- F零rate原以为省略fallback；直读`translate-enemy-scripts.ts:53-63`确认非零magic保留chancePercent=0，已按当前合同纠正；未改产品。readonly SourceCmd/optional tilesets TC问题已修。
- B05第一版跨包引用editor造成rootDir失败、node:fs在浏览器TS项目无类型，改为reforge内自包含构造与合法host响应，未动tsconfig；tileset缺category及fixture非空断言Biome两错已修。
- oracle初版session needle有2处，收窄为move错误上下文唯一处；Vitest rejects/resolves包装会输出普通Error，改成捕获真实结果后普通断言，未放宽判据。
- readText坏实现原先先遇未捕获缓存错误/进入等待超时，改捕获读取结果与同步进入见证；补B05后包级坏实现还影响非目标成功链，因此负控收敛到精确目标执行，正控仍全量，混合目标错误仍拒绝。
- 独立worktree缺未跟踪原始/提取/迁移资源：本地链接主树既有只读输入（data/raw、data/extracted、PAL migrated/runtime资产），未修改源字节、不入Git；目录规则不含symlink的两条用本地info/exclude补齐。

复跑整包：

```sh
node docs/testing/glm-coverage-wave2-mutants.mjs
WAVE2_COVERAGE_PACKAGE=reforge WAVE2_COVERAGE_PHASE=before WAVE2_COVERAGE_DIR=/tmp/type-pal-wave2-coverage-fivq93 pnpm exec vitest run --config docs/testing/glm-coverage-wave2-coverage.config.mts
WAVE2_COVERAGE_PACKAGE=reforge WAVE2_COVERAGE_PHASE=after WAVE2_COVERAGE_DIR=/tmp/type-pal-wave2-coverage-fivq93 pnpm exec vitest run --config docs/testing/glm-coverage-wave2-coverage.config.mts
```

PACKAGE可改editor/content/migrate；输出目录可换新mktemp。只重跑一针可设`WAVE2_MUTANT=<id>`。
四包TC、新代码/工具Biome、四包fast对照通过。统一串行门禁：`pnpm check` exit0、七包**8281项**；
`pnpm coverage:ratchet` exit0；`TYPE_PAL_COVERAGE_BASE_REF=967b35fb pnpm coverage:fast`**单次exit0**，
**7790项/633生产文件**，与新基线逐维完全一致（提升0/下降0）。日志为同目录`check-final.log`、
`ratchet-final.log`、`strict-final.log`，未取多数通过、未改排除/超时。
全仓check当次47既有warning/7info，其中1项为本工具字符串风格提示，已等价修正；最终本包37代码/JSON文件Biome无诊断，未冒称原次仅6info。
四包对照分子与官方基线完全相同；shared/pal-extract/game完整基线对象及全部633生产清单/分母未变。
全仓行**73.80%（51967/70420）**、语句71.76%（57731/80452）、函数72.78%（10854/14914）、
分支**65.41%（41307/63149）**；不宣称远端CI或full/Q1/Q2通过。
旧版本兼容审查pass：未加兼容层，F的ScriptIndex/Chunk只在现行离线迁移审计边界使用，未进入产品持久模型。

任务卡：[TEST-NONVISUAL-COVERAGE-2](../ops/archive/tasks/done/TEST-NONVISUAL-COVERAGE-2-six-domain-boundaries.md)（draft/r1）。
生产冻结 `57dda7ed2376fc25f07756be117bb4a058d09915`；分支 `codex/glm-coverage-wave2`。
本版在 r2 生成式映射基础上落实 C1～C3；三席原文与日志保留。机账
[glm-coverage-wave2-results.json](glm-coverage-wave2-results.json)（schemaVersion 3）。

## C1｜四臂逐 arm 纠正（扩展规则支持同行拆 arm）

机账 `expansionRule` 增加 **branchArmExceptions**：分支定位先查 `"line|block|arm"` 精确键，
否则按行取首条命中规则——同一行 211 的两个相反合同不再挤同一桶。重新生成全部计数
（展开验证 ALL MODULES OK，960L/1274B 全对账）：

| 生成桶 | r2 | r3 |
|---|---|---|
| NEW | 955/1259 | **955/1263** |
| UNREACH | 5/11 | **5/10** |
| PEND | 0/4 | **0/1** |

- **validate-runtime `[40,8,0]` → E04 NEW**：`:40-41` 是无 pages 但有 behaviors 的**合法实体分支**
  （Codex 合法 fixture 经真实 validateBaseScenes+validateRuntimeScenes 通过、BRDA 40,8,0,1）。
  r1/r2 整文件 UNREACH 过宽，一并更正锚点语义：`:24` 是旧顶层 hook 字段拒绝（前置
  validate.ts:356-359）、`:29` 是 entities 重复对象检查——两行四臂维持 UNREACH，`[40,8,0]` 归 NEW。
- **migrate-enemies `[96,0,0]/[98,1,0]/[211,28,0]` → F01 NEW**：`:96/:98` 是 **default-arg 臂**
  （省略时采现行默认值，非历史注入；真实 `mapEnemies([],[])` 无注入即命中三臂）；`[211,28,0]`
  为 true 臂（现行默认路径，caller `:1753-1758` 实传 enemyTctx）。**仅 `[211,28,1]`（显式
  false）保留 PEND**——历史轴不测政策不变，E-05 不因此变成授权。
- 该四臂纠正后 NEW 955/1263、UNREACH 5/10、PEND 0/1，与 Codex 预期算术一致；不为其余 NEW 臂
  承诺可达。

## C2｜恢复族级去重与确切白名单（不再引用已删字段）

- **`modules[].dedupTitles` 全量恢复**（45 条引用——其中 40 条精确旧标题 + 5 条套件提示，
  逐字取自 `d4703cdf` v1 机账；**v4 已把 5 条提示全部展开为精确标题/带计数的 suite 引用**，
  现共 80 条：trial-assets 5、simulator-ui 10、frame-animation-draft 5（C04 实施前枚举完成）、
  project-reference 10+5 分文件、casualty 5——见下方 v4 节）；新增
  **`familyTable`**：每族给出合法 fixture/guard、实际输入、保留新增的差异断言/输入解耦归属——
  遗漏臂映射与已有业务证明两轴分离，互不折算，不回退凑 r1 估算数字。
- **确切白名单恢复**：`whitelist.testFiles`（25 条完整路径，reforge 6/editor 12/content 4/
  migrate 3）、`fixtures`（9 条 `coverage-wave2/<group>-*.ts`）、`tools`（2 条）——数组逐字钉自
  `d4703cdf:docs/testing/glm-coverage-wave2-results.json`，路径不变、不重选。

## C3｜负控正控更正与去重

| 族 | 真实针位 | 合法正控（更正后） | 反例 | 拟定标题 |
|---|---|---|---|---|
| A03 | `script-project-core.ts:150-151`（循环，r2 误写 :148-149）multi 循环 → 只写首 target | 双合法 zone target **全部写入终值正确**，且观察者收到**命令级恰一次通知**、该次快照已含两值（`:293-294` 一次 effect+一次 worldChanged；r2「各自通知」会把正确产品写成红测） | 单次通知中第二值缺失 | `setMultiEntityState 逐 target 全量写入后命令级一次通知` |
| B04（替换） | `battle-trial-assets.ts:85` readText 包装 `new TextDecoder().decode(await readBytes(path))` → `original.readText(path)` 直读绕过冻结缓存 | readText/readJson 取数经同一冻结缓存：seal 后未缓存路径经 readText 同样拒绝、已缓存返回与 readBytes 一致字节 | 直读后 seal 未拦截 | `readText/readJson 经冻结源取数：seal 后未缓存读取同样拒绝` |
| C02 | `world-sprite-behavior.ts:527-555` 站点收集合并同资源 | 同资源两实体引用产出两独立站点 | 合并为单站点 | `同资源多实例生成独立站点，不共享预览对象` |
| D03 | `tileset-references.ts:247`（调用点，r2 误写 :243）`assertCurrentProof(... proof.generation ...)` → 传 `batch.generation` 自比较 | 新鲜 proof 通过预检 | 陈旧 generation 被接受 | `陈旧 generation 的移除 proof 必须拒绝` |
| E01 | `enemy-script.ts:141-144` `percent()` 上界删除 | 0 与 100 合法（0..100 域） | 101 被接受 | `chancePercent 边界 0/100 合法、101 拒绝` |
| F03 | `script-library-audit.ts:155` 分栏谓词反转 | 混合库分栏正确——**fast 输入解耦**（full-only「作者脚本单列统计，不稀释也不抬高迁移膨胀比」已证，不计新增业务） | 两条进错栏 | `migrated/authored 分栏按 index.library 精确归属（fast 解耦）` |

- **B04 旧切片针退役归旧证据**：r2 的去 `.slice(0)` 针与既有合同完全重复——Codex 隔离验证只删
  生产 `:81` 消费端切片时，旧测试 `frozen bytes detach the source and every consumer; seal
  forbids uncached project IO` 当场业务红（对照 5/5 绿）。该针登记为已有负控证据，不重写同合同
  报新增；新针改 readText/readJson 包装（真实剩余合同，差异明确）。
- F03 混合分栏针按工作包"已有业务脱离真实资源进入 fast"单列，不报新增业务。

## 一起勘误（按 Codex 清单逐项落入机账 reason/needle）

B04 `:85/:87` 实为 **readText/readJson 包装**（urlFor 在 `:88-89`、post-await 复核在 `:76`、
消费端切片在 `:81`）；A03 循环 `:150-151`；D03 调用 `:247`；core `:170` 是 scene-session-changed
AbortError（session id 取值在 `:158`）；trial-assets 单文件 B05 余数 **78L/47B**（r2 误用跨文件
合计 79/48）。

## 映射与计数（r3 生成）

机账 `ruleTable`（`modules[].rules`）+ `branchArmExceptions` 可机械展开；`generatedTotals`/
`modules[].generatedCounts` 由规则与冻结定位求交生成（ALL MODULES OK）。臂级桶
NEW 955/1263、UNREACH 5/10（vanish 3/6 + validate-runtime 2/4）、PEND 0/1（`[211,28,1]`）。
各模块生成计数与 r2 差异仅 validate-runtime（NEW 0/1+UNREACH 2/4）与 migrate-enemies
（NEW 43/63+PEND 0/1），其余 23 模块不变。

## GLM r3 结论（修订稿）

- **premise verified / design agree 维持**：C1～C3 全部落实——四臂按 arm 纠正并重生成计数
  （与 Codex 预期算术一致）；族级去重（45 旧标题）+ familyTable + 确切 25+9+2 白名单恢复；
  A03 通知合同更正、B04 换真实剩余针、F03 标输入解耦；勘误清单逐项入账。
- **可证伪观察**：① 任一 branchArmExceptions 外的定位仍需同行拆分→扩展规则不足；②
  `[40,8,0]`/default-arg 三臂的活跑复现失败→C1 依据错；③ readText 针在既有 5 项测试下已有
  覆盖→C3 新针仍重复；④ familyTable 任一差异断言与旧标题实际合同重叠→去重表错。
- 已闭环项（逐定位完整性/源码 hash/元数据/vanish/script-world 锚/四 caller/D03·E01·F03 锚/
  Biome/docs）不重开；本版后仍不改产品/正式测试/冻结清单/官方基线/共享状态，不实施、不代签、
  不标 build/done。

## v4 附节：C2 残项收口（Codex r3 d84d1bbf + Kimi d19d5bb0 同收敛残项）

- **familyTable 补齐 11→20 行**：新增 A05/B01/B02/B03/C03/C04/C05/E03/E04 九族，每族给出
  真实构造器/guard、旧测试文件+精确标题（或带计数的 suite 引用）与一个具体保留新增差异/
  fast 解耦归属（机账 `familyTable`）。要点：A05 **已证范围仅「当前 host 转交 moveEntity
  提交控制的正常路径」一条**（`retained moveEntity forwards the endpoint commit control…`
  ——一次 commit、零 abort）；v4 曾写「moveEntity 提交窗口两臂已证」**已撤回**（据 Codex
  AST 复核：第二条 `abort before commit writes nothing; abort after commit prevents the
  next leaf` 的实际命令是 hideEntity/removeEntity 生命周期取消，无 moveEntity，不能证明
  `script-project-core.ts:157-184` 的移动取消/会话漂移）——**移动提交前/后取消与会话漂移
  保持原 A05 NEW 范围未证待补**；宿主等待方法体与 shared resolver 臂的新增方向保留；
  C03/C04 引 frame-animation-draft
  五精确标题，差异=IO 边界/时长合同与历史分支臂；E04 差异=[40,8,0] 无 pages 有 behaviors
  合法分支正控。
- **5 条套件提示全部展开**（机账 `dedupTitles` 现 80 条=40 原精确+40 展开）：trial-assets
  5 精确标题；simulator-ui 10 精确标题（suite 前缀+计数）；frame-animation-draft 5 精确标题
  （**C04 实施前枚举完成**：「以结构共享完成完整帧编辑和撤销重做」「一次重排历史让
  active/anchor 跟随来源帧，且 undo/redo 对称」「拒绝尺寸错误、重复 id 和删除全部帧」「保存
  和重开后每张完整帧逐像素一致」「按最近色或误差扩散量化完整 RGBA 帧并保留 alpha」）；
  project-reference 10+5 分文件标题；casualty 5 精确标题。
- 已闭环项不重开（映射算术/四臂纠正/A03 通知合同/B04 新针/F03 归属/勘误/40 条真实标题）；
  映射、计数、needles、白名单与 r3 完全一致未动。

## v5 附节：A05 归因更正（Codex v4 counter 29b1a56b 唯一残项）

- 撤回「moveEntity 提交窗口两臂已证」：第一条真实测试只执行 **moveEntity 正常端点提交**
  （一次 commit、零 abort）；第二条完整标题为 `abort before commit writes nothing; abort
  after commit prevents the next leaf`（v4 表中漏末尾 `leaf` 已补齐），其实际命令为
  **hideEntity/removeEntity 生命周期取消，无 moveEntity**——不冒充移动提交窗证明。
- 已证范围收窄为「当前 host 转交 move 提交控制的正常路径」；生命周期取消证据单列。
  **真实未证**的移动提交前/后取消、会话漂移（`script-project-core.ts:157-184`）保持原
  A05 NEW 冻结定位待补；宿主等待/shared resolver 新增方向不变。
- 其余 19 行 familyTable、80 条标题/套件计数、映射、六针、白名单与 v4 逐字一致；不重算覆盖率。
