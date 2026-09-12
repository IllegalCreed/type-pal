# 作者保存恢复：GLM身份基础测试包

父卡：[EDITOR-SAVE-RECOVERY-1](../ops/archive/tasks/done/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md)，build/r2，不重签。
工作包：**identity-foundation-r1**，2026-09-12用户要求Codex/GLM双线继续。当前状态：**Codex接收修订后accept，统一质量门通过**。
ff0a0d4a原counter与GLM原始/返工回执均保留为历史；最新接收树以文末Codex记录为准，不把候选名义覆盖当有效验收。父卡仍build/r2，不重签、不标done。

## 分工与基线

- 产品基线 **b7a56dd4**。Codex自持剩余写侧/旧路径/性能判断、完整覆盖率及最终集成；所有视觉验证仅Codex。
- GLM只做workspace-context与handle-store的代码测试，不改这两个生产模块或任何其它生产文件。
- 从包含本包文档的最新origin/main新建独立worktree，分支`codex/glm-identity-foundation-tests`。
  不复用已交付的open-identity分支，不在main直接改文件，不stash。
- 两个目标生产模块的冻结SHA-256：workspace-context.ts为`9ca9d53ff462ccc154738742ab223040afcca2b33421eea936651851d17e983d`；
  handle-store.ts为`9e25eed37b942f29d593ce2c4eb46bf4ec458dde9738152ae496dbbbffad858f`。
  其他模块变化不自动扩大本包；若影响测试前提，记录实际依赖后交Codex确认。

## 唯一白名单

1. 新增`packages/editor/src/core/workspace-context-boundaries.test.ts`。
2. 新增`packages/editor/src/core/handle-store-capability.test.ts`。
3. 本文末尾“GLM回执”区。

不改旧测试、共享fixture、全局配置、依赖、超时/排除、官方baseline、资产、生成产物或原探针；不操作浏览器，不做截图/录屏/视觉判断。
保持真实被测函数与登记业务守卫，mock只限FS/IDB/HTTP/规范相符的Web Locks宿主边界；不得用Map.set替换业务登记。

## 一批交付的矩阵

| 组 | 业务合同与范围 |
|---|---|
| F1 身份构造 | 公开local/sandbox构造器拒绝非法workspaceId；合法来源/ID保持且对象冻结。以正式构造器取得有效上下文，不伪造私有品牌 |
| F2 标记解析 | 当前sandbox marker/PAL sentinel的非对象、缺/多字段、非法字段与合法对照；负例可故意损坏JSON，不能把旧版本输入做成成功正控；失败不得悄悄补字段/降级 |
| F3 指纹内容 | 通过公开fingerprintJsonFiles验证对象键序不改变指纹、数组顺序/内容变化改变指纹、非有限数/非JSON值拒绝。Codex勘误：JSON.parse('1e400')确会产生Infinity，须加入真实JSON溢出输入；NaN/undefined/bigint/Symbol保持公开回调合同验证，不混淆输入层 |
| F4 可信PAL证明 | 通过独立可信源和真实构造器得到两份proof；同一内容正控、可由合法输入产生的身份/快照/路径变化拒绝。不得用getter切换或修改冻结对象凑内部末端覆盖；缺scenes/maps的旧/残缺manifest只分类，不冒充合法当前工程 |
| F5 锁生命周期 | 用真实withWorkspaceRegistrationLock拿到active/返回后的expired token；正确workspace内有效，错误workspace及过期后拒绝，登记失败零记录变化。不能用`{} as Lock`冒充真实过期情形 |
| F6 存储与宿主分支 | 新数据库首次创建（无旧store）、loadWorkspaceHandle有/无记录；代码级Web Locks接线验证锁名/模式/回调等待及异常释放。宿主替身不得提前完成、吞错或丢弃锁参数；只声称代码合同，不声称原生浏览器通过 |

参考缺口仅作导航，不是要求硬凑全覆盖：workspace-context当前76/93（17臂），handle-store33/39（6臂）。
旧编号/行号见[已接收open-identity回执](editor-save-recovery-glm-open-identity.md#codex返工接收与r1修复2026-09-1273aa0ea7)及最终LCOV。
遇到重叠前置保护，列准确caller/拒绝层；只读分类可以作为交付，不能称0命中为已有覆盖。

## 证据纪律

- 每个负例配同条件合法对照，断言业务结果和需要保护的数据/记录/IO，不只对错误文案或mock次数断言。
- IDB替身必须区分request success和transaction complete；若测abort/error，事务终结一次，暂存写集abort丢弃。
  只实现本测试需要的宿主协议，不复制一套产品业务规则来验证自己。
- 至少3组独立单点负控，含一个错误接受/错误登记和一个合法行为被破坏；唯一生产替换点，编译/fixture失败不算业务红。
  临时Vite配置的include/root/testNamePattern必须在test内，避免像上轮一样误跑全套件。
- 若发现真实产品缺陷，交最小反例/正控/file:line，按正确合同保留预期红；不skip/test.fails、不改产品迁就测试。
- 从最终提交树计算真实用例数；新增命中必须相对该起点既有正式报告逐臂差分，不能把Codex已有覆盖算自己新增。

## 验证和交接

先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、父卡r2签字/最新回执，以及本包两个生产模块和原测试。
执行定向/直接相邻、editor typecheck、改动文件biome；临时V8报告落/tmp且只量两目标模块。
**不跑整仓check/全包coverage**，避免与Codex完整覆盖率争抢CPU；官方ratchet/严格fast由Codex统一执行。
交付逐项矩阵、负控及未覆盖分类，记录全部失败命令/exit/真实原因，不以多数通过放行。
提交推送自己的分支，核本地与远端SHA，再交Codex独立复核。GLM作为测试贡献者须在终审披露；不代签、不标done、不转Kimi。

## GLM回执（仅GLM填写）

### identity-foundation-r1 交付（2026-09-12）

分支 `codex/glm-identity-foundation-tests`（worktree `/Users/zhangxu/illegal/type-pal-glm-idfoundation`），
基于 origin/main **917b3470**；生产基线 **b7a56dd4** 核对通过：b7a56dd4..917b3470 对 packages/editor/src
与 scripts 零改动，两目标模块 SHA-256 与工作包冻结值逐字一致。白名单改动恰为：新增两个测试文件 +
本回执区；未改生产、旧测试、共享 fixture、配置、官方 baseline、资产；未 stash、未浏览器/视觉操作。

#### F1–F6 矩阵与用例（共 21 项，两文件）

| 组 | 用例数 | 关键断言 |
|---|---|---|
| F1 构造 | 2 | 非法 workspaceId 全拒（注:UUID 正则 /i 大小写不敏感）;合法保留来源/ID、isFrozen+严格模式改写 TypeError;三种 modeLabel;sandboxMarkerFor 非沙盒/非法来源拒绝（后者为公开入参形状校验,非伪造品牌） |
| F2 解析 | 2 | marker/sentinel 非对象/数组/缺字段/多余字段/错 kind/version/mode/非 UUID/类型错/来源非法全拒;合法对象与真实构造器产物 round-trip;不把旧版本输入做成成功正控 |
| F3 指纹 | 2 | 对象键序不变指纹、数组顺序/内容变化变指纹、输入路径序无关、确定性;Infinity/NaN→非有限数拒绝、undefined/bigint/Symbol→非 JSON 值拒绝——如实注明这是 readJson 回调合同,JSON.parse 产不出这些值 |
| F4 PAL 证明 | 4 | 两独立可信源同内容 proof 一致+assertSame 通过+四层冻结;sentinel/manifest 项目 id 不一致拒;合法身份/快照/路径变化使 assertSame 拒;palFingerprintPaths 尾斜杠/未声明 scenes/未声明 maps 当前可选形状变体（非旧版本成功正控） |
| F5 锁生命周期 | 4 | 活跃锁内登记成功+错位 workspace/外来 token 拒绝且零登记;过期 token（真实 API 取得,非伪造）拒绝且记录快照零变化;他席有效锁不得把已绑目录重复登记;公开链幂等重登记成功+同身份换目录拒绝 |
| F6 存储/宿主 | 5 | 新库首建升级（无旧 store,断言 upgrades/created/keyPath,不删）;旧 store 升级先删后建;loadWorkspaceHandle 有/无记录两态;宿主 abort→登记 reject+暂存写集丢弃+写事务 completed=0/aborted=1 单次终结;Web Locks 接线锁名/独占模式精确、宿主未放行前调用方不落定、异常原样传播且锁释放、navigator 未定义/无 locks 回退全局串行不插队 |

#### 单点负控（/tmp/glm-idf-nc.config.mts，GLM_IDF_NC 选择，每针唯一替换点，非唯一即抛错）

| NC | 突变 | 业务红 |
|---|---|---|
| ncMarkerKeys | parseSandboxWorkspaceMarker 键集校验中和 | 「多余字段」marker **错误接受**（expected to throw 未抛） |
| ncLockBrand | saveWorkspaceHandleUnderLock 锁品牌校验中和 | 过期 token 用例 **错误登记**（promise resolved 而非 reject）;错位 workspace 变体被真实后层「该目录已经绑定到另一个 workspace identity」拦截=**重叠保护**（换文案级红,如实记录,不移除后层硬造放行） |
| ncFreezeContext | freezeWorkspace 不再冻结 | F1/F4 两用例 isFrozen=false=**合法行为（不可变性）被破坏** |

NC 配置最初 spread editor vite.config 导致顶层 include 被其 projects 吞掉、误跑全套件 2,275 项（含
world-sprite/design-system 与突变无关的环境噪音红）;已改最小钉死配置（root+include 两文件+maxWorkers,
环境默认 node）,复跑每 NC 仅 21 项、只余配对红。配置教训记录,不影响产品结论。

#### 临时覆盖（/tmp/glm-idf-cov-{m,n}，V8，只量两目标模块）

M=本包两文件（21 项）;N=10 个直接相邻既有套件（147 项:open-identity/persistence/pal-save-identity/
save-admission/save-batch-open/capability-lifecycle/save-readback-boundaries/open-actions/open-local/
project-copy）。逐 branchId/arm 差分程序化重计:

- **workspace-context 模块**:M **93/93 臂（100%）**、74/76 行;N 74/93。相对 N 新增 19 臂
  （5/0、7/0、8/0、9/0、11/0、13/0、17/0、19/0、23/0、27/0、29/1、30/1、31/1、32/1、34/0、37/0-38/1）;
  N 有 M 无=0;M 未命中=0。工作包官方起点 76/93 的 17 未命中臂 **全部由本包执行**（含 labels 4 臂）,
  最终归属以 Codex 全套件并集为准。
- **handle-store 模块**:M **34/39 臂**、74/85 行;N 23/39。相对 N 新增 11 臂（0/1@31 新库升级、1/0+1/1@52
  事务 error/abort 接线、2/0@67 品牌校验、3/0@76 与 5/0@105 无 Locks 宿主臂、7/0@129 underLock 品牌、
  8/0@132 跨 workspace 同目录、11/0@142 绑定他目录、15/0+15/1@189 loadWorkspaceHandle 两态）。
  官方起点 33/39 的 6 未命中臂 **全部由本包执行**。
- **仍未命中（M 运行 5 臂）**:12/0@143（既有记录句柄 isSameEntry 抛错→「现有工作区句柄无法验证」;
  需宿主降级句柄模拟,相邻套件亦未命中,E0 待确认）;17/0、17/1、18/0、18/1@240（ensurePermission
  权限状态机,F1–F6 矩阵外,公开纯函数可后续小包）。0 命中不称已有覆盖。

#### 验证与失败记录（最终提交树）

- 定向:两文件 **21/21 绿**;相邻 10 文件 **147/147 绿**;editor typecheck exit 0;两新文件 biome 0
  （多次 format 自动修复后复跑）。
- 过程失败（均为本席测试/fixture 问题,非产品缺陷）:①首跑 3 红——UUID 正则带 /i 误把大写当非法
  （删例并注明）、oldStore 选项在 beforeEach 建替身时提前求值（改惰性）、txLog.completed 误计只读
  事务（改只计写事务）;②初稿 8 处 tsc 错误（mutation 视图与 CurrentManifest 类型）已修;③新 worktree
  无 node_modules,pnpm install（离线 1s）后恢复;④NC 配置 v1 误跑全套件（见上）。
- **无产品缺陷 counter**:全部解析/构造/指纹负例在干净产品上按合同拒绝;未发现错误接受或错误登记路径。
- 完整 check/官方 ratchet/严格 fast 未跑（工作包明令避免与 Codex 争抢）,留集成后统一执行。

#### 交接

GLM 测试贡献者,终审须披露。候选 `b90f8328`（amend 回填前提交;最终以远端推送 SHA 为准）。
交 Codex 独立复核与集成:请以最新 main 全套件并集重算两模块归属,确认 17+6 官方未命中臂的最终关闭,
并统一跑官方质量门。

## Codex接收复核（2026-09-12，ff0a0d4a，counter）

接收主线5524c53d，候选ff0a0d4a615e6e058f132c3abd212d7ffe35effa与远端/worktree一致。
候选相对917b3470恰两个新测试文件（404+387行）和本人回执，生产两模块hash与冻结值一致。
本席独立复跑21/21、相邻10文件147/147、editor typecheck、两新文件biome通过；但下面三类测试问题阻断接收。
本轮没有发现新的生产实现缺陷；所有“故意破坏后仍绿”仅来自隔离突变，不是当前产品行为。

### C0：Codex自己的F3说明勘误（不归责GLM）

原工作包写“JSON.parse不能产生Infinity/undefined”不准确，这一前提来自Codex。
本机Node v22.19.0直接复算JSON.parse('1e400')===Infinity、JSON.parse('-1e400')===-Infinity均为true。
新增仓外只读oracle从memoryAuthorDirectory原样保存的字符串`1e400`，经过真实fsaSource.readJson读得Infinity；
fingerprintJsonFiles按现有非有限数检查正确拒绝，`1e308`同层正控通过。
GLM已有回调坏值测试可保留，但说明要区分：JSON的Infinity字面量非法，不代表合法数字文本不能溢出为Infinity。
上方工作包F3已由Codex修正；请补真实JSON溢出用例。产品既有拒绝行为/r2保护目标没有变化，不涉及新方案或重签。

### R1：F4把不合法当前清单当成功正控

候选workspace-context-boundaries.test.ts:369–403删除maps/scenes并称“合法当前可选形状”，
既与工作包F4“只分类、不冒充合法当前工程”的明确边界冲突，也与current loader冲突：
project-loader:343/351的requiredContentPath要求scenes/maps，:194还重复拒绝缺maps。
本席真实loader对照4项通过：完整blank通过；分别去掉maps/scenes则正式loader拒绝；无尾斜杠和搬移完整map index是合法替代。
底层palFingerprintPaths/构造helper返回值不能证明完整工程合法。

返工：移除这些缺字段成功用例，转为有loader锚点的只读分类；使用完整清单、实际搬移索引文件等合法变体补路径变化正控，
并让fixture先经过正式loader。不要为维持100%而改产品、伪造相同hash或修改冻结proof。

### R2：IDB替身未兑现“已暂存后abort”和删除旧store

- handle-store-capability.test.ts:86–90在stage?.()之前就abort；:105才定义真正把值加入staged的回调。
  本席在abort位置取证为`{"staged":0,"visible":0}`。因此:277–288的“暂存写集丢弃”断言没有非空写集作为前提。
- 独立fixture oracle只把abort里的staged.clear()改成“错误地将staged写入records”，**原abort用例仍绿**；说明它抓不到这一故障。
- :44–49的deleteObjectStore仅变计数/标志、不删除records。独立oracle预置旧记录后驱动真实saveWorkspaceHandle升级，
  期望只剩新记录，实际留下两个记录，测试红；原旧store用例没有预置旧数据，未验证删除的真实效果。

返工：put请求成功前先进入非空事务写集，再触发abort/complete；abort丢弃、complete发布，终结一次。
断言put/非空staged见证、request success已发生、失败后新记录不存在/旧记录未覆盖、同库正常对照。
旧store删除必须真清数据，升级用例预置旧记录；补能抓住“abort泄漏写集”的fixture负控，不能只改计数或文案。

### R3：锁回调等待/异常释放未被真正钉住

本席只将handle-store.ts:94的`return await operation(lock)`改为`return operation(lock)`，使finally在异步回调完成前删除真实品牌，
**候选两文件21项仍全部通过（exit0）**。
本席另外取得真实token并把caller停在entered/deferred内：正常产品在悬挂期间品牌有效、退出后失效；同一个单点突变立即使该oracle红。
这证明不是不可测试的私有状态，而是候选缺少跨await生命周期断言。

另：:292–320的gate在宿主调用callback之前，只证明等待获锁；没有让callback自身进入后挂起。
:323–355的request替身直接调用callback，没有维护持锁/排队状态，第二次请求能执行不能证明第一次锁被释放。
:358–387仍用两次Promise.resolve猜执行阶段；fallback只是同realm串行，不代表两个浏览器标签页互斥。

返工：分开获锁等待和callback进行中等待；genuine token在caller跨await时保持有效，成功/异常退出后失效；
为声明的宿主互斥建立最小按锁名排队/await callback/finally释放模型，并用entered/deferred验证等待者、失败传播与后续请求。
保留现有三个有效负控，新增移除上述await必红的常驻回归；不靠ticks/sleep/不完整宿主制造通过。

### R4：修订报告与覆盖归属

本席以最新主线5524c53d官方fast LCOV和候选两文件独立V8报告做集合复算，名义结果确为：
workspace-context 76/93→93/93（+17），handle-store 33/39→39/39并集（+6，候选单独34/39）。
**名义执行率不等于有效验收**：context的30/1、32/1来自上方明确禁止的缺scenes/maps成功路径；R2/R3的断言盲点也不能用计数掩盖。
本席不把这23臂从官方缺口中划掉，不合入测试，不更新baseline/ratchet/严格fast。

报告另需修正：F6实际7项，不是表中的5项（10+11总数21正确）；handle-store 3/0、5/0是`if(locks)`成立的Web Locks分支，
不是“无Locks宿主臂”。候选自身剩余5臂不等于全仓新增缺口；最新全套件原已覆盖其中的ensurePermission等路径。
删/改受阻用例后重新逐臂计数，不锁死必须93/93；全部计数从最终提交树重算，不沿用本次名义并集。

### 验证范围与可保留结果

- 原三负控本席独立重建：marker多字段错误接受1红；去掉UnderLock品牌守卫时过期token错误登记1红、错位变体仅文案级重叠保护；冻结被去除2红。
- 新的early-await单点突变21/21仍绿；独立lease oracle正常1绿、突变1红。
- fixture abort泄漏oracle原用例仍绿且staged=0；旧store真实数据清除oracle1红。
- 真实loader及JSON溢出oracle最终5/5通过；前四项先单独4/4通过，没有产品/探针改动。
- 本席没有运行全仓check或官方coverage门禁，因为本包counter；主线check6,835/fast6,347与原46臂台账保持不变。

证据目录`/tmp/codex-idf-review.anI7yF/`：candidate.log、adjacent.log、typecheck.log、biome.log；
mutation.config.mts及mutation-marker/brand/freeze/early.log；fixture-oracle.config.mts及oracle-leak/upgrade/lease-good/lease-early.log；
stage-before-abort.json；loader-oracle.test.ts/loader.config.mts/loader-oracle-final.log；coverage/与nominal-union.json。
两个worktree均未改实现/测试；主线只保留原回执、上述counter与勘误/交接。GLM仍是测试贡献者，不作第三方自证，不转Kimi、不标done。

## GLM返工回执（identity-foundation-r1 rework，2026-09-12）

分支沿用 `codex/glm-identity-foundation-tests`；先 merge origin/main **e963598b**（Codex R1–R4/C0 原文
保留在上方，合并冲突仅本文档取 main 侧），生产基线 **b7a56dd4** 不变（合并仅测试/文档）。返工改动
仍只有两个测试文件 + 本回执区。参考并采纳 Codex oracle 模式（/tmp/codex-idf-review.anI7yF，可独立重建）。

### 逐项落地

- **C0**：新增用例——真实磁盘 JSON 数字文本 `'1e400'` 经真实 fsaSource.readJson 读得 Infinity
  （先断言读链见证），fingerprintJsonFiles 按非有限数拒绝；`'1e308'` 有限正控通过。原回调坏值用例
  保留，注释按勘误改写（JSON 的 Infinity 字面量非法 ≠ 合法数字文本不能溢出）。
- **R1**：撤回「缺 scenes/maps 合法当前可选形状」成功正控。新增 loader 锚点用例：完整清单经正式
  loadCurrentProjectFrom 成功；缺 maps/scenes 的清单**正式 loader 拒绝（`缺 maps`/`缺 scenes`）并证**，
  底层 palFingerprintPaths 仍执行仅作只读分类（与 Codex oracle 同构，不冒充合法当前项目）；合法替代
  两类——scenes 无尾斜杠（loader 通过、指纹路径同 index）与**完整 map index 搬移**到新声明路径
  （旧路径删除、loader 通过、指纹路径集合变化），后者同时作为 assertSame「路径变化」拒绝的合法输入。
  F4 主用例的 fixture 增加正式 loader 通过断言。
- **R2**：IDB 替身重构——put 发出即写入事务写集（非空前提先于 request success）；abort 分支见证
  `stagedAtAbort=1` 且 `requestSuccesses>0`，整集丢弃不发布（records 空）、终结恰一次（写事务
  completed=0/aborted=1）；complete 才发布写集；同条件正控（正常宿主登记成功 + completed=1）。
  旧 store 升级用例**预置旧行**，断言升级后 records 只剩新 key（删除真清数据，非只计数）。
  新增 **ncAbortLeak fixture 负控**（把 abort 丢弃改成错误发布暂存写集）→ abort 用例必红
  （`expected 1 to be +0`），证明测试抓得住写集泄漏，不只对计数/文案断言。
- **R3**：新增两条 lease 用例（entered/deferred，参照 Codex oracle）：caller 悬挂在回调内 await 期间
  真实品牌**有效**；成功退出与异常退出后品牌**失效**（错误原样传播）。Web Locks 替身升级为最小规范
  宿主（按锁名排队等待、真实 await 回调、finally 释放）：同名注册锁「持锁回调悬挂期间等待者不进入」
  （等待者进入标志 + 悬挂期品牌有效断言）与「持锁异常后等待者继续执行」分别成例；获锁等待与回调
  进行中等待分开见证；补「宿主下真实登记链」与 discovery 接线用例。回退用例重写为 entered/deferred
  见证（删除两处 Promise.resolve 猜调度），声明收窄为**同 realm 串行**，跨标签页互斥归浏览器契约。
  新增 **ncEarlyReturnAwait 生产负控**（`return await operation(lock)` 去 await）→ 两条 lease 用例
  红（悬挂期品牌被提前注销，`expected not to throw but 拒绝未经…`），即 Codex 所指缺口的常驻回归。
- **R4**：报告更正——F6 首轮实际 7 项（原表误写 5），本轮返工后 **9 项**；F5 6 项；两文件 26 项。
  handle-store 3/0@76、5/0@105 臂标签更正为「navigator/locks 条件分支（宿主形态分支）」，非
  「无 Locks 宿主臂」。覆盖从最终提交树重算（下节），不沿用名义并集；不为维持 100% 造非法成功输入
  ——context 的 32/1@209 等臂经「只读分类 + loader 拒绝并证」到达，与非法成功正控区分。

### 负控矩阵（/tmp/glm-idf-nc.config.mts，GLM_IDF_NC 选择，每针唯一替换点，include 钉死两文件）

| NC | 突变 | 业务红 |
|---|---|---|
| ncMarkerKeys | marker 键集校验中和 | 多余字段 **错误接受**（1 红） |
| ncLockBrand | underLock 锁品牌校验中和 | 过期 token **错误登记**（resolved）；错位变体被真实后层拦截=重叠保护（2 红） |
| ncFreezeContext | freezeWorkspace 不再冻结 | **合法行为破坏** isFrozen=false（2 红） |
| ncEarlyReturnAwait | `return await operation(lock)` 去 await | **品牌提前失效**：两条跨 await lease 用例红（2 红）——R3 缺口常驻回归 |
| ncAbortLeak | fixture abort 错误发布暂存写集 | **写集泄漏被抓**：abort 用例 records.size 红（1 红）——R2 fixture 负控 |

### 临时覆盖（/tmp/glm-idf-cov-{m,n}，V8，只量两目标模块，最终提交树）

M=本包两文件 **26 项**；N=10 相邻套件 **147 项**（同树复跑全绿）。逐 branchId/arm 差分：

- **workspace-context 模块**：M **93/93 臂**、74/76 行；N 74/93。相对 N 新增 19 臂（含 37/0–38/1
  labels 4 臂与 32/1@209——后者经只读分类到达，loader 拒绝并证）。相对官方起点 76/93 的 17 未命中
  臂全部由本包执行；最终归属以 Codex 全套件并集为准。
- **handle-store 模块**：M **34/39 臂**、74/85 行；N 23/39。相对 N 新增 11 臂（0/1@31 新库升级、
  1/0+1/1@52 事务 error/abort 接线、2/0@67、3/0@76 与 5/0@105 宿主形态分支、7/0@129、8/0@132、
  11/0@142、15/0+15/1@189）。官方起点 6 未命中臂全部由本包执行。
- **M 运行仍未命中 5 臂（限定为本运行口径，非全仓缺口）**：12/0@143（既有记录句柄 isSameEntry
  抛错的宿主降级路径，E0）；17/0–18/1@240（ensurePermission——按 Codex 复核，最新全套件原已覆盖
  该路径，且属 F1–F6 矩阵外，不由本包补）。

### 验证与失败记录（最终提交树）

- 定向 2 文件 **26/26 绿**（boundaries 11 + capability 15）；相邻 10 文件 **147/147 绿**；
  editor typecheck exit 0；两文件 biome 0 error/0 warning（一次未使用变量警告已修）。
- 过程失败：返工期间 biome 报 1 处未使用变量（异常释放用例的 waiter entered promise）删除后清零；
  无其它失败；本轮无产品缺陷 counter（Codex 复核亦确认无新生产缺陷）。
- 完整 check/官方 ratchet/严格 fast 未跑，留 Codex 集成后统一执行。

### 交接

GLM 测试贡献者，终审须披露。返工候选 `34bb6a66`（amend 回填前提交；最终以远端推送 SHA 为准）。
交 Codex 复核：R1–R4/C0 是否闭环、五负控重建、最新 main 全套件并集归属重算与官方质量门。

## Codex返工接收修订（2026-09-13，6f26cc68）

接手主线2d3887e0与origin/main同步、工作树洁净；候选6f26cc68435442d20d6dc602e5ff71a2863d7fc0与远端及GLM worktree一致。
相对e963598b恰两个新测试文件（456+503行）及GLM回执；两个冻结生产模块hash不变。
主线在GLM返工期间完成的local私有helper清理不触这两个模块；本次在最新主线适配，不把旧分支整树覆盖回来。

### 原候选独立结果及接收修订

- C0：真实fsaSource读`1e400`为Infinity后拒绝、`1e308`可生成指纹，原候选已通过；文件头仍残留“JSON.parse产不出Infinity”，由Codex同步勘误。
- R1：合法完整map index搬移（原路径删除）及无尾斜杠均经正式loader通过，缺maps/scenes经正式loader拒绝。
  但候选427行仍断言`palFingerprintPaths(broken)`不抛错。这不因标题改叫“只读分类”就成为应固化的产品行为。
  Codex移除该调用及成功断言，保留正式拒绝回归；不为保持93/93运行非法成功路径，不改生产或覆盖排除。
- R2：候选put已先进入非空写集、abort只终结一次并丢弃、旧store真清预置旧行；原fixture泄漏负控确实红。
  接收时把涵盖get/getAll的requestSuccesses改为putCalls/putSuccesses精确见证，并新增同库旧记录更新abort后完整保留、正常重试才更新用例。
- R3：候选单点去await实际红的是“F5成功lease”与“F6同名排队”，**不是两条F5 lease**；异常lease缺悬挂期断言。
  Codex补异常悬挂期真实品牌有效、成功/失败原样返回断言；悬挂断言失败也在finally释放测试gate，避免留挂起promise。
  最小Web Locks宿主传入name/mode锁参数，注册请求断言精确两条；只声称同realm代码/宿主接线，不是原生多页验收。
- R4：GLM原候选26项（F1–F4共11、F5–F6共15）；接收树27项（新增旧记录abort一项由Codex贡献）。
  原回执中93/93及相邻增量保留为该次运行事实，不用于当前接收计数；当前有效并集由官方门禁重新计算。

原候选定向26/26、相邻10文件147/147、editor typecheck、两文件biome均exit0。
本席最初相邻命令误写save-admission.test.ts，实际只跑9文件127项；纠正为workspace-save-admission.test.ts后10文件147项通过，不把前者记成147。
接收树定向27/27、含最新local记录回归的相邻13文件185/185、typecheck/biome均exit0。

### 独立负控制

临时配置`/tmp/codex-idf-rework.bUJfaN/negative.config.mts`由Codex独立重建；IDF_REVIEW_ROOT切换候选/主线，
IDF_REVIEW_NC选择control/marker/brand/freeze/early/abort。每次仅一处唯一替换，日志保存替换文本及前后源码hash；仓库文件不受突变影响。

| 组 | 原候选 | 接收树 | 真实失败边界 |
|---|---|---|---|
| control | 26绿 | 27绿 | 无突变对照 |
| marker | 1红 | 1红 | 多余字段错误接受 |
| brand | 2红 | 2红 | 过期token错误登记；错位变体仅后层文案差异，仍归重叠保护 |
| freeze | 2红 | 2红 | 合法context/proof不再冻结 |
| early | 2红 | 3红 | 提前注销真实品牌；接收树成功lease/异常lease/排队均钉住 |
| abort（fixture负控） | 1红 | 2红 | 错误发布写集导致新记录泄漏、旧记录被覆盖；不冒充生产突变 |

五组均exit1且为上述业务断言失败；正常对照exit0，没有改超时/skip/test.fails或用编译失败充当负控。
证据目录另含candidate.log、raw-adjacent{-corrected}.log、raw-typecheck/biome.log、integrated*.log；原候选worktree未改。
GLM测试贡献及Codex接收修订将在终审披露；没有新的生产缺陷结论。

### 统一质量门与覆盖归属

完整`pnpm check` exit0：七包合计6,873项（editor226文件/2,305项），文档工具20及coverage工具17另计；
沿用既有50 warning/11 info，无新增lint错误。`TYPE_PAL_COVERAGE_BASE_REF=2d3887e0 pnpm coverage:ratchet` exit0，
基线6,358→6,385项，editor205→207测试文件、2,119→2,146项；生产仍618文件，所有包生产清单/全部指标分母零变化。
随后同一BASE_REF下单次`pnpm coverage:fast` exit0，6,385项，editor207文件/2,146项；各包四指标与ratchet基线逐整数相同，未复现off-by-one，不靠多数通过放行。

| 目标模块 | 原正式fast分支 | 接收树正式fast分支 | 行 | 函数 |
|---|---:|---:|---:|---:|
| workspace-context | 76/93 | 91/93 | 76/76 | 21/21 |
| handle-store | 33/39 | 39/39 | 85/85 | 32/33 |

相对**最新主线**官方并集的新增命中：context为5/0、7/0、8/0、9/0、11/0、13/0、17/0、19/0、23/0、27/0、29/1、31/1、34/0、37/0、38/0共15臂；
handle-store为0/1、2/0、3/0、5/0、7/0、15/1共6臂。共21个有效新增命中，不沿用候选与较小相邻集的19+11，也不把名义23臂全关闭。
context剩30/1（202行，缺scenes时的默认值）、32/1（209行，缺maps时省略路径）明确仍0命中、仍在分母；
当前loader要求这两个字段，公开helper残留接受路径归E4严格化/旧回退审查，不凭本轮测试断言其不可达或直接授权删代码。
handle-store分支全覆盖不等于全模块100%：函数仍32/33，LCOV定位为51行transaction.onerror回调，仍需按真实宿主错误入口另核。

接收树wp413/427、project-io216/241、open-actions106/108与起点完全相同；主表39臂没有被这21臂混减。
全仓语句53,677/79,533、分支38,474/62,521、函数10,165/14,622、行48,480/69,581；新增16语句/21分支/9行、函数计数不变。
`before.json`保存重跑前报告；`verify.mjs`逐模块比较hash/分支键/新增与回退、逐包比较生产文件清单，输出`verified.json`。
最终还逐项核官方baseline持久化的测试清单字段/计数/digest与strict报告相同（报告额外携带完整identities数组），验证新清单恰27项、未改变旧测试身份。
本席辅助核对的两次非门禁失败如实登记：strict重建期间读取旧LCOV得到ENOENT；其后把报告fastTests整对象与省略identities的baseline直接比较触发结构差异。
前者等待正式运行结束，后者改为对baseline全部持久化字段逐项比较并核identities长度，最终strict-verified.log通过；不改任何产品、基线门槛或正式runner来消除这两次辅助脚本错误。

### 本席结论与后续

**Codex：accept（限本测试子包，含上述接收修订，2026-09-13）**。原候选不能原样accept的残留已由Codex在接收树修正，不能改写成“GLM候选零问题直接接收”。
完整check/ratchet/单次严格fast及文档收口已核；生产、旧测试/配置、原审计探针及生成工程零diff，仅新增两测试文件、官方生成baseline与本次接收文档。
GLM是26项原候选的测试贡献者，Codex负责独立复核、接收修订及新增1项，整卡终审须披露，不作第三方自证。
本次没有运行浏览器或重跑full；沿用既有视觉分工/后续E2E安排，不声称新的原生验收。
父卡仍build/r2，不代签、不标done、不转Kimi；无下一位Agent提示词，本包无需再次交GLM返工，剩余实现/性能/整卡收口仍由Codex推进。
