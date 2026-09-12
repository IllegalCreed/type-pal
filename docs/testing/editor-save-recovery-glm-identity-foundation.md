# 作者保存恢复：GLM身份基础测试包

父卡：[EDITOR-SAVE-RECOVERY-1](../ops/tasks/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md)，build/r2，不重签。
工作包：**identity-foundation-r1**，2026-09-12用户要求Codex/GLM双线继续。状态：已准备，待用户转交GLM；不代表已开工。

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
| F3 指纹内容 | 通过公开fingerprintJsonFiles验证对象键序不改变指纹、数组顺序/内容变化改变指纹、非有限数/非JSON值拒绝。清楚区分公开readJson回调给坏JS值与真实磁盘JSON，不伪称JSON.parse能生成Infinity/undefined |
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

