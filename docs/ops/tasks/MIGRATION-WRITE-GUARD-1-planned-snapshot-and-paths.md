# MIGRATION-WRITE-GUARD-1 - 迁移规划快照与二进制路径保护

Status: review
Phase: phase2
Capability: A7
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/migration-write-guard-1

Revision: r1
Production Baseline: `14257da75f4c3c91dd9aae5f37de13a5f1040f8c`
Implementation Candidate: `57dda7ed`

## 目标与范围

关闭审计A-08的“规划复核之后、journal采样之前”陈旧作者快照覆盖窗口，以及A-09资源物化父链符号链接越界。
正常current发布、作者所有权、manifest-last、journal恢复与重放零差异保持。

- 范围内：migrate的规划原始hash传递、提交前拒绝、现行journal.previousHash使用；二进制目标/临时路径的无链接检查与写入阶段复核；正式回归/负控与隔离发布验证。
- 范围外：新内容模型、content21/N6b、SAVE8改版、E-05旧调用面删除、战斗修复、编辑器存储协议、R4/Q1/Q2执行、真实作者数据清理。
- 明确不做：通用多writer分布式锁、宣称任意并发编辑完全安全、对抗同用户恶意进程的OS级无竞态沙箱、基于一次lstat声称绝对安全。
  `packages/migrate/README.md:49`的迁移期间单writer纪律保持。路径检查关闭已证窗口，不夸大为跨进程原子CAS。

## 前提真值门

### 一句话行为

迁移不得把规划之后出现的作者字节重新认作允许覆盖的旧值，也不得沿工程目标路径的符号链接写到工程外。

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| primary source | current发布承诺三方合并保护作者、写前TOCTOU、失败停止；JSON事务已要求目标/暂存不经过链接 | `packages/migrate/README.md:10-20,35-37,49`；`migration-transaction.ts:81-88,110-133` |
| 第一阶段 | N/A：本卡不解释PAL字节/战斗/移动；一阶段raw/extracted仅是只读源，写入保护属于二阶段发布工具 | `packages/migrate/README.md:3-5`；`docs/phase2/reference/phase1-knowledge-harvest.md:436-448`（不把旧历史缺口当当前事实） |
| 当前二阶段A-08 | project snapshot已有原始字节hash；普通写删plan未携带它，事务又在staging时采样当前文件作为previousHash | `migration-project-io.ts:9-12,70-103`；`migration-write-plan.ts:20-46`；`migration-transaction.ts:330-337`；CLI `scripts/migrate-content.mts:107-126` |
| 当前二阶段A-09 | 物化先校catalog/source字节，再以resolve拼目标执行mkdir/临时写/rename，无父链链接拒绝 | `pal-assets.ts:1205-1263`；现有JSON guard不能保护这里 |
| 本任务目标 | 正常发布结果不变；规划旧值/缺席必须精确延续到提交，冲突拒绝；二进制完整路径检查先于首个资源写入并在实际写点复核 | 以下AC01～10；现有E01/E03/E04/E05正控与E02/E06/E07/E08反例分栏 |

代码锚点均相对`packages/migrate/src/`，除明确写全路径者。

### 动态证据与反证

2026-09-21在冻结树复跑未改动的`docs/ops/audits/pre-e2e/probe-glm-next-migration.mjs`：

- observe全12项exit0。E02 `rejected=false/authorPreserved=false`，目标rename已发生；E06/E08外部虚拟字节从`OUTSIDE_ORIGINAL`变`NEW`，E07 deep/race同族成立。
- contract E02与E06分别exit1，错误为候选自身AssertionError（作者保全/路径拒绝），不是缺资产/导入/超时。
- E01正常plan→commit→baseline/journal清理绿；E03 journal之后外部改动已拒绝并保留pending；E04退役删除预条件有效；E05 authored/unchanged/坏源先拒有效。
- E07叶链接rename没有改外部目标，不冒报该变体已破坏外部字节。r1拟对完整二进制目标链统一拒绝链接，与现行JSON路径纪律对齐；不把平台兼容或原版raw来源标签当待删兼容。
- 7文件49项相邻测试绿，并不能覆盖上述两个红反例。具体命令与日志见[准入核对](../../testing/pre-e2e-admission.md)。

最强替代解释：单writer文档约束已禁止并发、POSIX rename替换叶链接而非穿透、JSON恢复guard已有保护。
本席采纳这些边界，但它们不反证**规划后的重新采样**与**父目录穿透**；没有声称当前PAL真实树已有链接或用户数据已受损。
可证伪观察：冻结树E02已拒绝且作者字节/IO保持；E06/deep父链在首个修改前已拒绝；或发现当前生产入口其实传了规划hash/执行了全量路径guard。

四类替代根因排除：

- runtime语义/命令分类：反例只走离线planner/transaction/materializer，不执行运行时命令。
- 原版/一阶段理解：不涉及数值/剧情/格式映射，源字节保持。
- extractor/解码：合法catalog与同源精确bytes/sha正控；不修改生成内容补洞。
- 审计模型：保留真实被测函数，只替换fs边界；E01/E03/E04/E05与E07叶链接控制证明不是“所有IO都判错”。build还须自有mkdtemp原生链接见证。

用户可见偏离：不主动改变合法发布；`旧窗口允许覆盖/父链越界 → 明确拒绝并保留冲突证据`。
用户2026-09-21要求推进前置欠账核定与修复；不视为三签豁免或扩大多writer产品支持。

## 上下文锚点

- `AGENTS.md`迁移优先/current-only/三签；`CLAUDE.md`生成真源原则；`docs/phase2/READ-FIRST.md`铁律10/11。
- [A-08/A-09原审计](../audits/pre-e2e/README.md)、[批二复核](../../testing/glm-pre-e2e-boundary-batch-2-report.md)、[当前分流](../../testing/pre-e2e-admission.md)。
- 已done的作者保存恢复不重开；迁移CLI与编辑器Web Locks不是同一互斥域，不声称借现有锁即可阻止跨进程写。
- [current内容发布指南](../../phase2/guides/content-publication.md)、migrate README；保留raw→current唯一producer、已有current journal语义，不新增升级器或旧分支。
- 不得重新引入：规划时未保存hash却提交时猜、缺席默认任意旧值、忽略冲突继续、链接越界后才报闭包错误、测试自己重写业务守卫。

## Draft：r1设计与风险

### A. 规划hash贯穿普通工程写删

1. `buildMigrationTransactionChanges`显式接收**规划使用的**`ProjectMigrationSnapshot`，从其原始`hashes`取期望旧值；缺席以显式null表达，禁止序列化JSON后重算来替代原始字节。
2. 当前JSON project-scope写入/删除必须携带期望旧值。现有退役资源hash保护保留；baseline/manifest各自原约束保持，不把它们误归普通作者文件。
   调整transaction输入类型时分清“未提供”与“期望不存在”，不得留旧project调用者的静默采样fallback。所有调用者/fixture一次适配。
3. 完整变更集的前提在staging首写前检查；构造journal.previousHash时仍使用已携带期望值并再核当前值，不能重新取值变更授权。
   `applyJournal`现有逐项重读/冲突拒绝及目标已经为预期结果时的恢复语义保持。journal v2已有string/null previousHash，本卡不改磁盘版本。
4. 冲突发生于staging前：项目/baseline/manifest/journal零新修改；若已建立合法journal后才冲突，保留pending及原字节，由现有恢复规则拒绝而非自动覆盖。
   暂存失败仅清本事务自有临时物，不清真实作者恢复输入。

### B. 二进制路径保护

1. 在全部资源源字节/所有权预检阶段核每条实际目标路径的工程内规范相对路径及完整父链/叶节点。包含已有正常文件、目录缺席、链接与悬空链接；不得用existsSync=false把悬空链接当不存在。
2. 规范化可信repo根后，检查工程内路径；复用或提取migrate内部窄helper，不引入跨包通用文件框架，不扩为修改第一阶段工具。
3. 首个资源修改前全量拒绝静态坏路径；实际mkdir、临时写、rename前复核相关链，覆盖旧探针中预检后换链的可注入窗口。
   临时路径也受保护，只清本次确定拥有的文件。若中途路径变化，停止后续操作，不能为清理而沿已经变更的父链删除文件。
4. 上述检查不是OS级目录句柄沙箱；任意外部进程在最后check与syscall之间再次换链仍超出保证，单writer操作纪律保持并明确写入回执。
   若审查认为既定保护合同必须包含此级对抗，签counter并给出需扩大到的机制/产品裁决，不偷偷承诺。

### 实施边界与验证写入范围

- 拟改产品白名单：`packages/migrate/src/migration-write-plan.ts`、`migration-transaction.ts`、`pal-assets.ts`、必要的migrate内部路径helper，`packages/migrate/scripts/migrate-content.mts`及相应直接调用者；相邻/新增测试、migrate README与本卡回执。
- 先枚举调用者再钉build白名单；越出上述职责须回卡说明，不趁机做E-05或重写迁移器。
- 发布验证仅在自有临时repo根/当前PAL副本运行真实CLI；相同raw/extracted输入可只读复用，不能写主树`projects/pal`或作者目录。
  本卡不改生成语义，预期current产物与冻结树逐字节一致；若出现内容变化先调查，不以更新黄金文件吞掉差异。

## 验收条件

| ID | 必须证明的业务结果 |
|---|---|
| AC01 | 修改/删除/新建三态在规划后变动均拒绝；规划旧hash来自实际原始字节，含格式变化；正常正控成功且输出精确 |
| AC02 | 任一后位文件前提失效时，全量预检保证首个staging前拒绝；project/baseline/manifest/journal及外部新字节完整保留 |
| AC03 | staging读取窗口变化不能被重新采样合法化；journal.previousHash精确为规划值；journal后冲突/重启恢复仍拒绝覆盖 |
| AC04 | 退役资源expected hash、manifest-last及闭包前置条件、无变更/重放幂等/已提交目标恢复均保持，不发明旧版本fallback |
| AC05 | 父链多级/工程根下链接/悬空链接/最终叶链接/临时目标链接矩阵；静态非法目标必须首写前拒绝，完整外部字节及IO轨迹不变 |
| AC06 | 预检后、后续写点前换父链的可控注入被拒；中途已正常写入的内部资源与外部目标分别登记，不声称二进制整批事务回滚 |
| AC07 | authored跳过但验证、unchanged零写、合法源正常物化、重复路径/坏bytes/sha先拒保持；mkdtemp原生symlink正反控，绝不使用真实用户路径 |
| AC08 | 两家族至少各一个单点负控；仅去目标保护，正式新测试以明确业务AssertionError失败，环境错误/未执行/其它测试失败不能代替 |
| AC09 | 定向+相邻+typecheck/Biome、完整check→官方ratchet→保护基线单次strict-fast；不得降低阈值/缩范围或以重复多数通过放行 |
| AC10 | 隔离副本实际current发布、结果与计划/冻结产物核对、独立第二次CLI重放零diff；非托管/作者文件保全；原审计探针零改，三席同候选accept后才done |

视觉：N/A，离线文件安全与字节保全，无UI/演出变化。后续E2E入口为N6b隔离current重迁→正式loader重开→复跑R4同业务断言；本卡不冒充已执行N6b或R4。

## 推进签字

### 进入build前

- Codex：premise verified；设计design agree。直接证据为本卡动态E02/E06业务红、E01/E03/E04/E05正控及上述规划hash/写点源码；可证伪条件见前提节。仅批准本卡窄保护，不宣称任意并发安全。
- Kimi：**premise verified / design agree（2026-09-21，r1，冻结14257da7；锚点本人直读/探针本人复跑，未读 GLM 结论）**。
  - **A-08 窗口直读**：规划快照确有原始字节 hash（`migration-project-io.ts:9-12`），CLI 在
    物化前做 `assertProjectSnapshotCurrent`（`migrate-content.mts:109`）；但
    `buildMigrationTransactionChanges`（`migration-write-plan.ts:20-46`）不携带规划 hash，
    事务 staging 时 `migration-transaction.ts:331` 重新采样当前文件作 previousHash；
    `expectedPreviousHash` 现行只允许删除携带（`:293-295`），`assertPreviousTarget`（`:211-214`）
    比对的是重采样值——":109 复核→物化耗时→staging 重采样"窗口成立。本人复跑：observe E02
    `rejected=false/authorPreserved=false` 且 rename 已发生；contract E02 exit1 为业务
    AssertionError「冲突拒绝或保留都必须不覆盖作者新值、项目零写入」。E01/E03/E04/E05 正控绿
    （E03 证明 journal 后窗口已有守卫，与采样前窗口是两个阶段，分栏属实）。
  - **A-09 父链直读**：`pal-assets.ts:1240-1258` resolve→mkdir→`.tmp-${pid}` 写→rename，
    全程无父链/叶/临时路径链接检查；JSON journal 的 `assertNoSymlinkPath`
    （`migration-transaction.ts:75-81`）不覆盖二进制路径。observe E06/E07(deep/race)/E08
    均复现外部字节 NEW；E07 叶链接 rename 变体外部 ORIGINAL 未动——控制成立，未混报。
    contract E06 exit1 为业务 AssertionError「以明确路径拒绝在任何修改前终止并保留原字节」。
  - **设计同意**：① 规划 hash 显式贯穿、缺席显式 null——journal v2 已有 `string|null`
    previousHash（`migration-transaction.ts:41`），不改磁盘版本属实；"未提供≠期望不存在"
    的类型区分是必要钉（现行 `expectedPreviousHash?` optional 语义必须收紧）；② 全量前提在
    首个 staging 写前检查、journal.previousHash 用携带值再核而非重采样授权、applyJournal
    逐项重读/恢复语义不动——关窗不碰恢复合同；③ 父链/叶/悬空/临时路径全量静态拒绝+写点
    复核，覆盖 E07 race 的预检后换链窗口；中途路径变化即停、不沿已变父链清理；④ 剩余
    check→syscall 竞态如实划出保证外、单 writer 纪律保持——与「明确不做」一致，无夸大；
    ⑤ 白名单窄、隔离发布验证预期逐字节一致、不以更新黄金文件吞差异。
  - **可证伪观察**（任一成立即 counter）：① "未提供"与"期望不存在"混同或残留静默采样
    fallback → AC01/AC03 负控应红；② 直接复用 journal 的 `assertNoSymlinkPath` 而不修
    `existsSync&&lstatSync` 对悬空链接判不存在 → AC05 悬空针漏检；③ 路径检查只做预检一次、
    写点不复核 → E07 race 仍穿透；④ 清理沿已变更父链删文件；⑤ 正常发布产物与冻结树不
    逐字节一致却用更新黄金文件吞掉；⑥ 实施后 E02/E06 contract 仍红或 E01/E03/E04/E05
    正控转红；⑦ 把保护夸大为多 writer/OS 级沙箱承诺。
  - 旧版本兼容审查 pass：journal v2 格式不变、无升级器/兼容分支、current-only 纪律符合。
  - 返工项：无。
- GLM：**premise verified / design agree（2026-09-21，冻结 14257da7；源码锚点与探针均为本人当日复跑/直读，未读 Kimi 结论。披露：`probe-glm-next-migration.mjs` 为本人原探针贡献，本签以冻结树复跑+一手源码为据，不以旧回执代替）**。
  - **A-08 根因直读**：`ProjectMigrationSnapshot.hashes`（`migration-project-io.ts:9-12`）已有原始字节哈希，但 `migration-write-plan.ts:36-45` 普通 write/delete 变更**不携带期望旧值**（仅退役项 :54-60 带 expectedPreviousHash）；`migration-transaction.ts:331` staging 时 `existsSync(target) ? sha256(readFileSync(target)) : null` **重采样当前文件**为 previousHash；CLI `migrate-content.mts:109-121` 先 `assertProjectSnapshotCurrent` 但其与 staging 采样之间的作者改动即被重新合法化（=E02 窗口）；snapshot hashes 从未进入写授权。
  - **A-09 根因直读**：`pal-assets.ts:1241-1263` `resolve→mkdirSync(recursive)→临时写→renameSync` 全链**零链接检查**；`existsSync(destination)` 跟随链接——悬空链接被当“不存在”写穿。JSON 侧 `assertNoSymlinkPath`（`migration-transaction.ts:73-80` 逐级 lstat）仅护 journal 操作/staging；E08 同帧对照 JSON 拒绝而二进制照写。
  - **探针冻结树当日复跑**：observe 12 条 exit0＝8 covered/4 reproduced（E02/E06/E07/E08）；E02 `rejected=false/authorPreserved=false/rename 已发生`、E06/E08 外部 `OUTSIDE_ORIGINAL→NEW`；E07 三变体 `self(叶链接)→ORIGINAL`（正确控制）、`deep/race→NEW`——叶链接原子替换与父链穿透结果不同未混报。contract E02 exit1＝AssertionError「冲突拒绝或保留都必须不覆盖作者新值、项目零写入」、E06 exit1＝AssertionError「物化必须以明确路径拒绝在任何修改前终止并保留原字节」——候选业务红非环境失败。
  - **49 相邻复跑绿＋缺口核实**：7 文件 49/49 本人复跑；标题扫描证实现有覆盖=E01/E03/E04/E05 语义（journal 恢复/坏 journal/退役 hash/提交窗拒绝/authored 接管/预检先于首写/重复路径），**无任何用例钉**规划 hash 贯穿（AC01-03）、二进制路径链接矩阵（AC05）、预检后换链注入（AC06）、两家族负控（AC08）。
  - **design agree**：A 案缺席显式 null、禁序列化重算、无静默采样 fallback、journal v2 磁盘不改、staging 前冲突零新修改、合法 journal 后冲突走既有恢复拒绝——与 `applyJournal`/`assertPreviousTarget`（:210-215）正交；B 案全量静态预检先于首资源写、各写点（mkdir/临时写/rename）复核、临时路径同护、悬空链接不当不存在、中途变化即停不沿变更链清理——正中本人读出的两处写点缺陷；「check→syscall 仍有窗口、非 OS 级沙箱、单 writer 纪律保持」诚实边界与 README:49 一致。
  - **调用面 census**：两函数生产调用者**各仅 CLI 一处**（migrate-content.mts:110/:116），A.2「所有调用者一次适配」范围完整。
  - **可证伪观察**：① 存在第三处生产调用方或依赖静默采样的真实 caller→A.2 范围错（census 为空）；② 冻结树 E02 contract 绿→前提倒（实跑红）；③ 实施后 AC05 把悬空叶链接按“不存在”放行→B.1 违反；④ 隔离副本二次发布与冻结产物有字节差→AC10 先调查不得改黄金文件。
  - **旧版本兼容审查**：pass——journal v2 磁盘版本/语义不改（previousHash 已 string|null）；无升级器/旧格式 fallback/保留前缀；退役 expectedSha256 与 baseline/manifest 原约束保留；E-05 不在本卡偷跑；叶链接统一拒绝是对齐既有 JSON 纪律的收紧而非兼容分支；单 writer 纪律文档化不扩为多 writer 承诺。返工项：无。
- 独立反证审查：**已满足**——Kimi `996bb55f` 与 GLM 本席均独立直读源码并复跑探针，各自给出锚点与可证伪观察，互不复述。
- 缺签豁免：无。
- build准入结论：**build allowed（2026-09-21 Codex核定）**。Codex r1、Kimi `996bb55f`、GLM `91833db5`分别premise verified/design agree，独立直接证据与可证伪观察齐，无counter/缺签豁免；生产相对14257da7零diff。用户确认“签了”，本席统一推进build，不改他席结论。

## Build：准入与白名单

- 独立工作树：`/Users/zhangxu/.codex/worktrees/migration-write-guard/type-pal`，仅Codex写实现。
- 生产：`migration-write-plan.ts`、`migration-transaction.ts`、`pal-assets.ts`、必要的内部路径helper及CLI `scripts/migrate-content.mts`。
- 调用面：两个生产入口均仅CLI；既有测试调用位于`migration-write-plan{,.boundaries}.test.ts`和`migration-transaction{,.boundaries}.test.ts`，仅适配强制输入合同、保留原业务断言。
- 新增规划hash/路径/恢复回归与专用fixture/负控工具；migrate README、本卡及测试回执；官方baseline仅由最终ratchet生成。
- 不改原审计probe。其旧签名在新必填合同下失配时不算修复证据；用适配后的独立真实链回归和负控证明，保留原树红因。
- 发布实验仅自有隔离副本；真实`projects/pal`、原始资源、其它工作树和作者恢复数据不写。

### 进入done前

- Codex：**accept（2026-09-21，实现者自验，候选57dda7ed；不是独立第三方审查）**。规划原始hash由CLI:119传入write-plan:34-43，project mandatory/null在transaction:299-312校验，staging:336再核且previousHash用携带值；路径helper逐级lstat含悬空/叶，pal-assets全量/各写点检查、独占临时文件与inode归属清理。36新回归、migrate515项、1对照+5单点负控、隔离两次真实CLI发布均通过；完整check8029、官方ratchet与保护14257da7的普通CI彩色环境单次strict7538通过。原48个migrate fast测试身份/计数与另六包完整基线对象保持，原探针零diff。旧兼容审查pass，journal v2/content20/SAVE8不变；边界、失败记录、命令及证据见[实施回执](../../testing/migration-write-guard.md)。
- Kimi：**accept（2026-09-21，候选57dda7ed对比14257da7；锚点本人直读/主树与隔离工具复跑，未读 GLM 本轮结论）**。
  - **规划 hash/null 贯穿**：`migration-write-plan.ts:24,34-41` 必填 `projectSnapshot`，
    `plannedHash` 从原始 `hashes` 取值、未纳入快照或 files/hash 一致性破损即 throw、缺席显式
    null；`TransactionChange` 判别联合（project 必带 `string|null`，baseline/manifest `?: never`）
    使旧 project 调用者无静默 fallback 可表达；运行期 `Object.hasOwn` 复核
    （`migration-transaction.ts:299-306`）。CLI 传规划时真实快照（`migrate-content.mts`）。
  - **提交与恢复**：commit 规范化循环对每个 change 先做链接检查+`assertPlannedTarget`
    （全量前提先于首个 staging 写）；staging 每项再核且 project 的 journal.previousHash=携带的
    规划值（`:336-341`），不再重采样；`assertPreviousTarget`/applyJournal 恢复语义不变，
    因 previousHash 现为规划值，journal 后冲突继续拒绝覆盖。staging 中途失败留下未发布
    临时物、不冒充恢复授权的边界如实披露。
  - **路径检查**：`migration-path.ts:13-22` realpath 可信根+规范相对路径拒绝（绝对/反斜杠/
    空段/dot/dotdot）+逐级 `lstatSync(throwIfNoEntry:false)`——悬空链接可见，注释明言
    existsSync 不得先行（设计期第②条可证伪观察被正面满足）；JSON journal 检查复用同 helper，
    旧 existsSync 门缝同步关闭。
  - **临时文件归属**：随机 UUID 名+`openSync(temp,'wx')` 独占创建（不删/不复用他人临时文件）、
    fstat 记录 owned inode、rename 前后再核路径、清理仅限同 dev/ino 且路径仍安全，父链变更时
    保留原错误不沿新链清理（`pal-assets.ts:1268-1294`）。
  - **本席复跑**：36 新回归 36/36 绿（migration-path 9/write-guard 13/pal-assets-paths 14）；
    mutants 1 对照绿+5 针全 detected（resample/late-preflight/no-path-guard/no-pre-mkdir-check/
    cleanup-foreign-inode）；隔离 publish 工具本人复跑 exit0——第一遍 writes=1/物化 1/事务 3/
    内部 replay 零差异，第二遍独立 CLI 全零，回执 2474 工程+315 baseline 恢复冻结字节；
    未运行主树迁移写盘。check8029/ratchet/strict7538 与远端 #286 采信 Codex 已落证据。
  - **范围与基线**：产品 5 文件、旧测试 4 文件仅薄适配（plannedChanges fixture 用真实磁盘
    快照，断言保留）；baseline 7502→7538（+36）、632→633（+1 路径 helper），另六包对象不变，
    原审计探针零 diff。
  - **旧版本兼容审查（单列）：pass**——journal v2 磁盘格式不变（previousHash 语义收紧为规划值，
    非格式变更）；无 upgrader/旧签名 fallback/保留前缀；E-05 不借卡偷跑；单 writer/非 OS 沙箱/
    check→syscall 残余窗口的诚实边界保持。
  - 返工项：无。
- GLM：**accept（2026-09-21，同候选 57dda7ed 对比 14257da7；未读 Kimi 终审。披露：本人是原诊断探针 probe-glm-next-migration.mjs 及 A-08/A-09 诊断材料贡献者，本签以当前树独立源码/复跑为据——原探针零 diff，其旧签名失配按记录不作为通过证据）**。
  本席独立复跑与直读证据：
  - **36 新测试复跑 36/36**（migration-path 9 + migration-write-guard 13 + pal-assets-paths 14）；
    **mutants 复跑 rc=0**：1 对照绿 + 5 针全 detected（resample/late-preflight/no-path-guard/
    no-pre-mkdir-check/cleanup-foreign-inode）——正中规划重采样/后位预检/路径检查/mkdir 前复核/
    外来 inode 清理五个保护面。
  - **隔离发布工具本人复跑 rc=0**（仅自有 tmp）：第一遍 exit0 managed=537/writes=1/
    transaction-changes=3、内部 replay 零差异；第二遍独立 CLI 进程 exit0 writes=0/deletes=0/
    conflicts=0/transaction-changes=0——幂等成立；回执核 2474 工程文件+315 baseline 恢复冻结字节。
  - **A-08 实现直读**：`buildMigrationTransactionChanges` 新增必填 `projectSnapshot`（类型级无
    optional）；`plannedHash` 从原始 `hashes` 取值、缺席显式 null、未纳入快照或 files/hash 一致性
    破损即 throw；`TransactionChange` 判别联合——project 必带 `expectedPreviousHash: string|null`、
    baseline/manifest `?: never`，**无静默采样 fallback 可表达**；commit 前 `assertNoSymlinkPath`
    （复用新 helper）+ 全量 `assertPlannedTarget`，staging 每操作再核且 project 的
    journal.previousHash=**携带的规划值**（非重采样）。
  - **A-09 实现直读**：`migration-path.ts` realpath 可信根+逐级 lstat（注释明言 existsSync 不得
    先行——悬空链接可见）；pal-assets 预检含每条 catalog 路径+随机 UUID 临时路径；写点
    `openSync(temp,'wx')` 独占（注释明言不复用他人临时文件）、fstat 记录 owned inode、rename 前后
    均再核临时/目标路径、成功后 owned 清空——清理仅限原 inode 且路径仍安全；夹具为自有 mkdtemp
    原生 symlink+outside 哨兵。
  - **基线/probe 完整性**：migrate fastTests fileEntries **旧 48 条身份+计数逐一相同**、恰加 3
    新文件（361→397/48→51 文件）；另六包 baseline 对象逐对象相同；原探针 diff 零行。四个旧测试
    文件仅适配输入（薄 fixture/null/实际旧 hash），标题与业务断言保持（identityDigest 不变佐证）。
  - **旧版本兼容审查（单列）：pass**——project 输入收紧后全部调用方一次适配（生产仅 CLI 一处
    传入快照）；无旧签名 fallback/升级器/保留前缀；journal v2 磁盘格式不变（previousHash 语义从
    “staging 采样值”收紧为“规划值”，是授权语义修复非格式变更）；E-05 不偷跑；单 writer/非 OS
    沙箱/check→syscall 窗口的诚实边界在 helper 注释与回执中明示。
  - **可证伪观察**：① 任何 project 变更能不带规划值通过 commit（含测试内构造）→判别联合被绕过；
    ② 二遍发布出现非零 writes/deletes→幂等破；③ 悬空叶链接被按“不存在”放行→helper lstat 顺序
    违规。均未出现。
  - 统一 check8029/ratchet/strict7538 为 Codex 已落日志证据，本席不并发重跑。无 counter。
- done准入结论：**blocked（缺 Kimi 同候选实现accept；GLM 已签，不标done）**。

## Review：交付与保留边界

- 实现候选57dda7ed；产品5文件（含新路径helper和CLI），旧测试4文件只适配必填输入，新增3测试文件36项、2薄fixture、3诊断工具；官方基线由ratchet更新。
- 本地全仓与发布证据在[回执](../../testing/migration-write-guard.md)。无主树工程写入、无原审计probe修改；snapshot/planned input来源可从真实测试和CLI复算。
- 真实发布用自有PAL副本和一个结构合法旧WAV强制写入，第一遍1资产/3事务变更，第二遍0；2474工程/315 baseline文件逐字节恢复冻结值。既有asset-warnings182未清，不声称全资源告警为零。
- 最后check→syscall的恶意并发不保证；仍单writer。二进制不是整批回滚；staging途中冲突可保留未发布临时文件，不把它当恢复授权、不沿换链清理。
- 无UI/视觉变更；E-05/U-02/N6b/Q2及第一阶段欠账均未借此关闭。远端检查以推送同headSha的Actions为准，不拿本地结果代替。

## 交接日志

- 2026-09-21 Kimi（独立终审）：候选57dda7ed对比14257da7，签 done 前 accept（单列旧兼容 pass）。
  独立直读：规划 hash 必填贯穿（write-plan plannedHash 未纳入快照/缺 hash 即 throw、缺席显式
  null；TransactionChange 判别联合使旧 project 调用者无静默 fallback）；commit 全量预检先于
  首个 staging 写、staging 每项再核、project 的 journal.previousHash=携带规划值；migration-path
  逐级 lstat 见悬空链接（existsSync 不先行），JSON journal 检查复用同 helper；物化预检含临时
  路径、wx 独占临时+fstat inode 归属清理、父链变更保留原错误。本席复跑：36 新回归绿、mutants
  1对照+5针 detected、隔离 publish 两遍 exit0（首遍 writes=1/物化1，第二遍全零，2474+315
  文件恢复冻结字节）；未运行主树迁移写盘。check8029/ratchet/strict7538/远端#286 采信 Codex。
  编辑事故自报：落盘时一度误删 GLM 席位头行，已即刻原样恢复，最终 diff 仅替换本人 pending 行。
  未读 GLM 本轮结论，不改产品/他席/状态，不标 done。Next：Codex 核 done 门。

- 2026-09-21 GLM（实现复核）：对候选 57dda7ed 签 done 前 accept（证据见本席，披露原诊断材料
  贡献者身份）：36 新测试与 mutants（1 对照+5 针）与隔离发布双跑均本人复跑绿；A-08 判别联合
  必带规划值/staging 再核/journal 保留规划值、A-09 逐级 lstat/wx 独占临时/inode 归属清理均
  一手直读；旧 48 身份计数不变、六包基线对象相同、原探针零 diff；旧兼容审查单列 pass。
  未读 Kimi 终审、未并发重跑官方覆盖率、未改产品/状态，不代签、不标 done。

- 2026-09-21 Codex（实现交付）：独立工作树完成57dda7ed；49旧相邻合同适配后保持，新增36项；包515、全仓8029、ratchet/strict7538、五针负控及两次隔离真实发布通过。签本人实施自验accept，推进review，准备Kimi/GLM并行同候选终审；不代签、不标done。首次路径夹具/临时发布缺soundfont等验证失败已在回执如实登记并修正，未降低任何门禁。

- 2026-09-21 Codex（build开门）：用户确认签字后同步main并核工作树干净；Kimi996bb55f/GLM91833db5同r1签字及无counter成立，生产对14257da7零漂移。统一核定build allowed，创建独立工作树与codex分支，开始先红后绿实现；未代签、未标done。

- 2026-09-21 GLM（r1 前提/矩阵独立审查）：签 premise verified / design agree（证据见本席）。
  探针（本人原贡献，已披露）冻结树当日复跑：observe 12=8 covered/4 reproduced，contract
  E02/E06 均 exit1 业务 AssertionError；A-08/A-09 两处写点根因一手直读（write-plan :36-45
  不带旧值、transaction :331 staging 重采样、pal-assets :1241-1263 零链接检查+existsSync
  悬空陷阱）；49 相邻复跑绿且缺口与 AC01-10 对上；两函数生产调用者各仅 CLI 一处；旧兼容
  审查 pass（journal v2 不改、无 fallback、E-05 不偷跑）。未读 Kimi 结论、未实现、未改
  状态/基线，不标 done。

- 2026-09-21 Kimi（r1 独立设计审查）：签 premise verified / design agree，无返工项。直读 A-08
  窗口（snapshot hashes 存在且 CLI :109 先核，但 write-plan 不携带、transaction:331 staging 重采样、
  expectedPreviousHash 现行仅删除可带、assertPreviousTarget 只核重采样值）与 A-09 物化写点
  （pal-assets:1240-1258 无父链/叶/临时链接检查，JSON journal guard 不覆盖）。复跑：observe
  12 条 exit0（E02/E06/E07/E08  reproduced，E07 叶变体控制成立）；contract E02/E06 各 exit1
  且为业务 AssertionError（作者保全/路径拒绝），非环境错误。七条可证伪观察入席（含悬空链接
  不得直接复用 journal 的 existsSync&&lstatSync 式检查、E07 race 写点复核、不夸大沙箱）。
  旧版本兼容 pass。未读 GLM 结论；未改产品/测试/他席/状态，不标 build/done。
  Next：三席齐后 Codex 核 build 准入。

- 2026-09-21 Codex：用户要求继续核定E2E前置欠账。同步main/工作树干净，冻结14257da7；现行迁移observe12/两条contract业务红，49相邻和17检查点测试通过；U-02仅risk。建立本卡r1，尚未修改生产/测试/基线/真实工程，准备两席并行设计审查。

## 设计阶段历史提示词（已完成，不重复领取）

### 给Kimi（与GLM并行）

在 /Users/zhangxu/illegal/type-pal 审 MIGRATION-WRITE-GUARD-1 r1 设计，卡 docs/ops/tasks/MIGRATION-WRITE-GUARD-1-planned-snapshot-and-paths.md，状态draft，生产冻结14257da75f4c3c91dd9aae5f37de13a5f1040f8c。先同步main、检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡与docs/testing/pre-e2e-admission.md。独立读planner→原始snapshot hash→write-plan→journal/recover及materializer实际写点，不读取或复述GLM结论。重点审：规划缺席null/缺字段区别、全量前提与journal恢复、父链/悬空/临时路径、check到syscall的剩余竞态及单writer边界；本卡不做多writer原子锁、不改journal版本或内容语义。复跑冻结探针E01/E02/E03/E06（observe；E02/E06 contract预期AssertionError红），必要时仅在自有mkdtemp补只读/隔离反证。输出有file:line和可证伪观察的premise verified/counter、design agree/counter及旧版本兼容审查；只写本人签字/证据/日志并提交推送，保留GLM并行改动，不改共享状态、不开始实现、不标done。发现产品裁决缺口明确指出，不替用户扩大范围。

### 给GLM（与Kimi并行）

在 /Users/zhangxu/illegal/type-pal 审 MIGRATION-WRITE-GUARD-1 r1 前提与验收矩阵，卡 docs/ops/tasks/MIGRATION-WRITE-GUARD-1-planned-snapshot-and-paths.md，状态draft，生产冻结14257da75f4c3c91dd9aae5f37de13a5f1040f8c。先同步main、检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡与docs/testing/pre-e2e-admission.md。独立读实际代码与探针，不读取或复述Kimi结论。复跑 node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-migration.mjs --mode=observe --case all，再分别contract E02/E06核红因；核49相邻用例现有覆盖与AC01～10缺口、实际原始字节hash/缺席/晚位冲突/零副作用、叶链接与父链不同结果、静态全量拒绝与途中停止边界、负控鉴别力和隔离发布幂等方案。GLM原探针贡献要披露，不能仅以自己的旧回执代替独立当前源码证据。输出有file:line和可证伪观察的premise verified/counter、design agree/counter及旧版本兼容审查；只写本人签字/证据/日志并提交推送，保留Kimi并行改动，不改共享状态、不开始实现、不标done。无浏览器/视觉任务。

## 下一位Agent提示词（同候选并行实现终审）

### 给Kimi

在 /Users/zhangxu/illegal/type-pal 终审 MIGRATION-WRITE-GUARD-1 r1，任务卡 docs/ops/tasks/MIGRATION-WRITE-GUARD-1-planned-snapshot-and-paths.md，状态review，实现候选57dda7ed，对比生产14257da7；设计不重签。先同步main/check工作树，读AGENTS/CLAUDE/READ-FIRST、本卡AC01～10及docs/testing/migration-write-guard.md。独立审CLI规划原始hash/null→write-plan→transaction前检/staging/journal恢复，及路径helper→物化预检/各写点/独占临时文件/inode清理；不要读取或复述GLM终审。复跑三新测试36项与相邻，node docs/testing/migration-write-guard-mutants.mjs应1对照绿+5业务红；需要复核发布时用node docs/testing/migration-write-guard-publish.mjs，仅写自有tmp，不跑真实主树迁移CLI。核旧签名无fallback、journal格式不变、原probe零diff、未夸大check→syscall/单writer/整批回滚。原探针旧签名不兼容不算修复证据。全仓check8029/ratchet/strict7538采信已落日志，不并发重跑全仓覆盖率。输出本人同候选accept或带file:line与复现的counter，以及旧版本兼容审查；只改本人席位/证据/日志并提交推送，保留另一席改动，不改产品、不改状态、不代签、不标done。无视觉任务。

### 给GLM

在 /Users/zhangxu/illegal/type-pal 复核 MIGRATION-WRITE-GUARD-1 r1实现与矩阵，任务卡 docs/ops/tasks/MIGRATION-WRITE-GUARD-1-planned-snapshot-and-paths.md，状态review，实现候选57dda7ed，对比生产14257da7；设计不重签。先同步main/check工作树，读AGENTS/CLAUDE/READ-FIRST、本卡AC01～10及docs/testing/migration-write-guard.md，不读取或复述Kimi终审。逐项核36新测试的合法正控、原始字节来源/缺席/后位冲突/实际IO/原生链接与清理归属、四旧测试文件只适配输入、五单点负控鉴别力和两次真实CLI发布回执；复跑三新文件及node docs/testing/migration-write-guard-mutants.mjs（1对照绿+5精确业务红），发布复算仅可用隔离publish工具。核migrate fast361→397、原48文件身份计数不变、其他六包基线对象不变；不要补跑/并发改官方ratchet或strict。原probe冻结不改，旧签名异常不能当缺陷已修。披露你是旧诊断材料贡献者，以当前独立源码/测试为据；给本人同候选accept或有复现的counter及旧兼容审查。只改本人席位/证据/日志并提交推送，保留另一席改动，不改产品/状态、不代签、不标done。无视觉任务。
