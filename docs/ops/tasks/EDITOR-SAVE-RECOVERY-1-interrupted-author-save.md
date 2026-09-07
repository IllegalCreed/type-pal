# EDITOR-SAVE-RECOVERY-1 - 编辑器保存中断恢复

Status: rework
Phase: phase2
Capability: ops（审计 A-03，不新增能力格）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main
Revision: r2（2026-09-07，用户批准继续完成本次保存；送独立前提/设计审查）
Evidence Baseline: 041c2fe1
Design Source Baseline: 135d065a（相对 041c2fe1 无产品实现变化）

## 目标与用户裁决

用户要求按既定修复队列继续；本卡承接 A-03，不重开已验收的
[A-02 冲突保护](../archive/tasks/done/EDITOR-SAVE-CONFLICT-1-stale-author-snapshot.md)。
目标是：作者项目保存中断后，重新打开时能够恢复到明确的完整版本，不能把半写状态当作正常项目交给后续编辑。

2026-09-07 用户先问“能做到吗？”，Codex 解释先完整暂存、再更新工程文件及暂存未完成的边界后，
用户明确回复 **“可以补上”**。裁决为 **继续完成本次保存（forward recovery）**，不是回滚到上次版本。

**before → after**：保存中断后新页面可能载入缺新人物定义的半工程 → 新页面先补完已完整暂存的保存，
人物定义及其场景引用一起落定，才进入正常编辑。代表场景：新增人物、设置体力上限 237、放入场景并点保存，
场景写完而人物表未写时页面退出；重开后新人物及 237 均保留。

- 完整目标及恢复凭据就绪之前不覆盖作者文件；此前失败只能保证原有工程未被本次保存覆盖，不能找回未暂存完的编辑。
- 恢复遇到外部修改、记录损坏、身份不符或权限不足时停止，保留恢复数据，不擅自覆盖/回滚。
- 未点击保存的编辑不在恢复保证内；本卡解决页面关闭/浏览器重启后的持久续存，不承诺磁盘损坏、断电下的硬件级事务。
- 用户批准的是产品结果，不是替代 Kimi/GLM 的设计签字，也不是提前验收。2026-09-07 三方 r2 设计签字齐，现进入实现。

“开发期玩家存档可丢弃”的历史授权不适用于作者工程内容，不能据此删除中断保存的作者数据。

## 前提真值门

一句话：A-02 的基线与恢复快照仍在页面内存，逐文件 close 后的部分作者内容会留下跨文件不一致；新页面没有缺失的目标字节。

| 维度 | 已核事实 | 一手证据 |
|---|---|---|
| Primary source | FSA createWritable 的提交边界是单文件 close；不是多文件/目录事务。Web Locks 只协调共享存储域的合作调用者，不能持久保存重试所需数据。 | [File System §2.3.2](https://fs.spec.whatwg.org/#api-filesystemfilehandle-createwritable)、[Web Locks §1/2.3](https://w3c.github.io/web-locks/#modes-and-scheduling)（2026-09-07 直读） |
| 第一阶段 | N/A：旧 game 的玩家槽位不是多文件作者工程，不能直接照用它的存档恢复模型。 | CLAUDE.md Architecture；[harvest X9](../../phase2/reference/phase1-knowledge-harvest.md#x9-存档版本化迁移--读档归一化)仅作分责参考 |
| 当前写入 | 写入顺序是资源/catalog 暂时超集、内容文件、manifest、catalog 收缩、删除；各文件分别 close，未提交的后续文件没有持久化的目标副本。 | `packages/editor/src/core/project-io.ts:399-550`；`workspace-persistence.ts:229-289` |
| 当前恢复证据 | snapshotRef、AuthorDiskBaseline/预期后态在内存；原页可在部分预期一致时重试，但不能替新页面找回没写出的新人物定义。 | `App.tsx:572,2117-2138`；`author-disk-baseline.ts:16,162-224`；本卡新探针 |
| 当前打开/消费 | openLocalProject 正常载入当前文件，没有未完成保存识别/持久恢复入口；同源试玩直接用 FSA loader，ZIP 直接收集磁盘文件。 | `open-local.ts:36-77`；`load-play-project.ts:9-15`；`export-zip.ts:83-99` |
| 本任务目标 | 重新打开时先处理保存中断，再构建正常作者会话；完整暂存后继续完成本次保存，冲突停止。 | 2026-09-07 用户“可以补上”裁决；下方当前 API 复现 |
| 持久凭据边界 | IndexedDB request success 不是 transaction complete；strict 是持久性提示，不是整个工程的断电原子性。 | [IndexedDB §2.7](https://w3c.github.io/IndexedDB/#transaction-lifetime)、`:540-555` durability；`handle-store.ts:46-65` 已等待 complete/abort |
| HTTP 缺文件边界 | 当前 dev 中不存在的恢复状态 JSON 路径返回 200 HTML，不可用任意异常吞掉当“没有恢复记录”。 | `editor/vite.config.ts:43-60` 缺文件 next；2026-09-07 对现有 6010 的只读 curl：`/projects/pal/.type-pal/save-state.json` → 200、text/html、编辑器首页 |

### 当前 API 的独立复现

旧 `probe-editor-persistence.mjs` 已不匹配 A-02 新增的必填 authorBaseline，不能把其参数错误当 A-03 证据。
原文件保留未改，新增[当前保存恢复探针](../audits/pre-e2e/probe-editor-save-recovery.mjs)。

运行：`node --import tsx docs/ops/audits/pre-e2e/probe-editor-save-recovery.mjs`，exit 0，最终观察：

- 以真实 buildBlankProject → 首存授权/writeProject → openLocalProject → toEditorState 构造 current 项目。
  新人物 `a03-new-npc` 的合法字段 `battler.baseStats.maxHP=237`，场景用真实 createCanonicalPlacedEntity 引用它；
  完整目标先通过真实 serializeProjectWithMapCopies，再注入 actors.json close 前失败。
- 已完成 5 次 close（包含未改内容的重写，不等于 5 个业务变化）；场景 actor 已为新 ID，磁盘人物表仍只有 hero。
- 新开一次实际 loader：打开成功，但新会话人物表没有新定义；再次序列化报
  `保存前内容引用校验失败：角色 "a03-new-npc" 不在 actors 表`。
- 正向控制：原页面保留 intended/recoverySnapshot/authorBaseline 时，使用同一正式 writer 重试成功；
  再次打开/序列化通过，人物体力上限仍为 237。证明不是永久不可修复，也不是 A-02 阻止了一切重试。
- 目录、IDB 为内存边界，网络和目录选择器被拒；Vite middleware-only、ws=false、临时 cacheDir，未监听端口。
  不把“新 loader 不复用旧快照”冒称实机关闭进程/断电测试；真实跨页验证留在实现期。
- 相邻保存基线：`author-save-conflict/project-io/workspace-persistence/open-local/open-actions/clone/fsa-copy`
  **7 文件/86 项通过**。没有修改正式测试或产品源码，不把既有测试绿当作 A-03 已修复。

### 替代解释与可证伪观察

- “是坏输入”不成立：注入失败前完整目标通过现行序列化/引用校验。
- “A-02 已经解决”不成立：它保留原页精确部分态，未持久保存这次完整目标；当前 API 复现仍得到半状态。
- “manifest 最后写即可”不成立：旧 manifest 仍指向已被原地替换的场景正文，人物表可仍为旧态。
- “交换人物/场景写入顺序即可”只能改变暴露窗口，不能建立任意新增/删除/循环引用的整体恢复边界。
- runtime/命令分类：复现不运行游戏或剧情；问题在作者文件提交。
- 原版理解：旧游戏没有对应创作编辑器，不借原版缺少故障模型为当前行为辩护。
- 提取/解码：自产 blank 内容复现，非 PAL 迁移或图像解码错误。
- 审计模型：真实 loader、序列化、授权和 writer；桩只表示单文件 close 的边界。actor 新字段按当前 battler 类型设置，
  不用未定义字段证明用户内容丢失。
- 可推翻观察：当前另有持久的完整目标/旧版本及开档恢复路径，新会话能在不依赖旧页面对象的情况下恢复完整项目。
  现行调用域未发现该路径，当前探针结果相反。

## 设计红线

1. 恢复信息必须先于对应作者文件覆盖具备可验证的持久性；不能只增加另一个页面 ref/WeakMap。
2. 恢复来源不可信：磁盘恢复记录不能仅凭自称 workspaceId/mode 获得 PAL 或通用写权限。需核真实目录、原身份、
   记录完整性与受限路径；所有写删必须来自已核恢复计划，不提供任意回调/路径绕过 policy。
3. 成功、处理中断、恢复再次中断、结果已完整但清理失败必须分清；重复打开/恢复应幂等，不能误报保存成功或把成功内容当失败清掉。
4. 不收编外部新变化：恢复前与逐步推进都必须校验可接受的旧/目标/已知中间态；无法证明时停止，不清空项目或盲目重采盘。
5. catalog 的暂时超集、新建文件可能存在的空占位、删除、manifest 变更都要进入故障矩阵，不能只测单个 JSON 正向保存。
6. 读入口不能静默消费半状态：重点审 openLocalProject/finishOpen、同源本地试玩、另存源复制、ZIP；HTTP/独立运行壳的
   暴露窗口也要明确处理或明确限定，不能把“写入互斥”冒称所有读取具有原子快照。
7. 保留 A-02 基线/增量分责、PAL proof、沙盒身份和缺权限拒绝。不为恢复开放 `.type-pal` 的通用写/删；
   若需要专用恢复元数据写入口，应在本卡显式设计。新私有准备写入与“零作者文件覆盖”须区分，不能暗改既有错误反馈含义。
8. 已绑定保存、首次保存、克隆/另存新目标的完整性与首次身份登记时机分别列清，
   不把一条已绑定保存通过当作所有新建路径闭环。
9. 不擅增 content/SAVE 版本，不复活旧兼容链，不抢占 N6b 已规划的 content21。跨版本真实作者恢复输入不能借“开发档可弃”删除，
   版本切换前未完成保存的处理约束需要明确。
10. 清理仅限已验证的本次恢复记录/暂存路径，保留其他用户文件；失败时保留可恢复数据及可操作说明。

已查看 Node 迁移事务的提交/重放片段（`packages/migrate/src/migration-transaction.ts:225-265,334-361`）：
其依赖 renameSync/fsync 与仓库路径校验，只能提供思路，不能直接当成浏览器 FSA 的可用事务实现；本卡不改迁移器。
本卡不把整个工程搬进世代目录，不引入历史版本/快照库，不提供任意事务回调。以下是送审设计，三席齐前不得实现。

## r2 详细方案（送审）

### 1. 范围与分层

同一套持久保存协调器覆盖普通已绑定保存、HTTP/空白首次保存、从 PAL 克隆和 Save As 的完整目标。
不把每次 writeFile 当独立可恢复保存，也不能先复制半棵源树，再只保护最后的 writeProject。

| 层 | 职责 | 禁止 |
|---|---|---|
| editor 计划/暂存 | 现行序列化与闭包校验；冻结目标字节、顺序、删除及来源证据；大资源逐文件暂存 | 页面 ref、未读完的 File 句柄、未来 HTTP 请求充当持久目标副本 |
| editor persistence policy | 现有授权、身份、锁、A-02 基线；签发本次计划专用的暂存/恢复能力 | 从磁盘 JSON 自称的 mode/PAL proof 签发通用写能力 |
| editor 恢复执行器 | 校验已授权的持久凭据，按原计划续写；处理再次中断、登记、清理 | 重跑旧闭包、接收任意写回调、恢复时重新序列化缺失人物的半工程 |
| reforge 只读状态门 | 固定路径的严格状态解析；打开/启动夹验，不提供任何恢复写权限 | runtime 依赖 editor、玩家试玩自动改作者目录 |

不改 content20/SAVE8、游戏存档、迁移器或 PAL 产物。允许 reforge 新增只读公共导出，不给 FileSource 加可选的
“支持恢复/忽略故障”开关。私有协议只认新定义的当前版本；不是 canonical schema 版本切换。

### 2. 两类持久信息：目录内字节 + 原浏览器的可信凭据

- 目录内 `.type-pal/save-recovery/<operationId>/plan.json` 和 `blobs/<sha256>`：不可变计划与实际目标字节。
  plan 包含协议版本、contentVersion、operationId、工程/工作区身份描述、初始作者哈希表、触及资源的旧哈希、
  有序写/删/建空目录操作、最终预期哈希表、受控 identity 引导步骤。每个 payload 带精确 bytes/hash；
  JSON 使用正式 writer 的最终 UTF-8 字节，不在恢复时再次 stringify。未变化的作者文件只记录基线，不复制全工程资源。
- 固定 `.type-pal/save-state.json` 是读门：严格 `kind/version/operationId/phase/planHash`，phase 为 pending 或 committed。
  无文件表示没有该协议的保存记录；committed 记录保留，operationId 每次更换，不能清掉后导致两次读取都“无记录”的 ABA。
  状态记录只提供拒绝/可读信号，**不是恢复权限**；错误 JSON、未知版本、空文件均拒绝，不视为 missing。
- 新建独立 IndexedDB `type-pal-editor-save-recovery`（current v1）保存 operation 凭据：真实目录 handle、原授权身份、
  原 sentinel/marker 证据、planHash、原会话私有 nonce、状态/执行游标与上一 committed operationId。
  仅 policy 内部在原始合法授权下写入；比较目录用 isSameEntry，不用目录名/projectId/opId 相等替代。
  不升级/清空现有 `type-pal-editor` v2 的句柄表，不改变既有 workspaceId 或玩家存档作用域。
- 凭据写入等待 IDB transaction complete，使用 strict durability hint；request success、内存 promise 已启动都不算就绪。
  FSA 暂存须全部 close、回读校验 plan 与每个 payload 后，才能把凭据封为 ready。索引/哈希不是目标字节本身。
- 新 target 在创建专用暂存目录前就留 staging 凭据与本次路径清单，便于证明“仅私有准备、尚无作者写入”。
  身份初检与整套目标计划先通过；慢速暂存后、第一次作者 create/remove 前仍重验 A-02 与身份。
  原有 assertDirectoryEmpty 不能泛化为“忽略所有 .type-pal”；仅本次能力证明的 staging 文件及沙盒引导 marker 可例外。
- 换浏览器/清站点数据后，目录内目标字节仍保留，但缺可信凭据的 pending **不自动重放**，提示回到原浏览器/保留目录。
  不提供“信任此文件并强制恢复”按钮。正常 committed 工程仍可按现有规则跨浏览器打开；自动续存的边界是原站点/浏览器资料。
  staged 目录不是备份系统，空间不足或文件不可读时零作者覆盖并明确失败。

信任模型：工程目录及其 JSON 不可信，同源产品代码签发的 IDB 凭据是授权记录；所有凭据字段仍做结构/一致性校验。
本卡不声称防御已控制同源脚本/整个浏览器资料的攻击者。不得仅因磁盘有合法形状的 planHash 就自动生成缺失凭据。

### 3. 提交与恢复状态机

`staging → ready → pending/applying → data-complete → committed → cleanup`

1. **staging**：冻结完整目标并逐文件暂存。所有作者文件保持原状，旧 committed 读门不变。
   失败/中止只保留本次可识别暂存；重新打开可以读旧完整工程。首次新建此时没有完整工程，明确提示尚未完成暂存，
   不把缺 manifest 的目录装成项目。原页仍有完整输入时可重新准备；新页不假装已保存缺失字节，须重新发起创建。
   未 sealed 的计划绝不恢复到作者路径；清理仅本次已核数据，不能为了再次要求“空目录”就删除未知残留。
2. **ready**：全部字节与凭据封存、最后一次整基线/身份检查通过，先 close 并回读 pending 读门，才可碰作者路径。
   ready 后、pending 前退出：新页凭同 handle 的可信 ready 凭据和未变基线安装 pending 后继续；其他浏览器若读旧版本，
   原凭据以后恢复仍须检测其修改。pending 创建失败留下空占位，只在可信凭据及完整旧基线匹配时修复此固定私有路径。
3. **applying**：继续现行资源 → catalog 超集 → 内容 → manifest → catalog 收缩 → 删除的有序计划。
   每个操作前，先持久记录“即将执行第 k 步”；落盘成功后检查实际目标 hash，再持久推进已完成游标。
   同一路径多次写入（catalog）记录为不同步骤，各自的 before 是上一步推导的值，不笼统允许任意 old/new 混搭。
4. **重启重放**：持有发现锁/同 W 锁，验证凭据、目录/身份、planHash、所有 payload 与当前完整预期前缀。
   已完成前缀必须匹配；未发出的步骤仍为相应 before；唯一 in-flight 步骤可以是 before 或该步 after，识别后续行。
   “已不存在”只对原计划中的 remove 成立；新文件空占位只对已持久 issued、before=missing 的那一步成立，
   不推广成“空文件随便覆盖”。文件/目录类型冲突、别名碰撞、未知内容、越序状态均停线。
5. **data-complete**：所有最终文件、删除、A-02 后态及 PAL 预期都验证成功，持久记录内容已完整。
   再完成所需 recent 登记、close committed 读门、标记凭据 committed，才向正常调用者报告保存完成。
   recent 已登记但 committed 门未 close 时，磁盘内容确已完整；“最近项目”仍必须经过恢复门，不能跳过它。
   登记/状态记录失败的重试只补剩余收口，不把完整内容退回、也不重放已完成操作。
6. **committed/cleanup**：committed 门已确认属于本次 operation 后，只允许收口/清理，不再以旧 after 表覆盖后来的编辑。
   清理故障是“内容已保存，恢复临时文件待清理”，不是内容保存失败；以类型化结果区分，App 不误清新编辑的 dirty。
   若 committed close 已成功而 IDB 收口失败，下次仅终结凭据；清理只能在提交已证实后开始。
   删除只限本次精确、已核 hash 的 payload/plan，目录仅做非递归空目录删除；遇未知文件/变化保留并提示。
  凭据保留最新已完成 operation 的轻量防重放信息，不留无限历史字节，不提供回退旧版本功能。

完整性验证不用产品 loader 的 public skipPending 开关：sealed 前对最终计划的只读视图复用正式 current loader/作者闭包校验；
落盘后验证相同目标 bytes/hash 与未改基线。正常 finishOpen 的真实磁盘 loader 放在 committed 门之后，且只复用已有锁，
不在 pending 期间伪造可读状态。因实现缺陷导致 sealed 视图/真实 loader 不一致应作为阻断，不吞错声称完成。

持续校验：恢复第一次作者写入前重验全受控基线；每一步前后核该路径与身份/凭据，最终再核全后态。
同源写入用同一锁串行；对 OS/其他浏览器的非合作写入，仍是检测与拒绝，不承诺 FSA 没有提供的原子 CAS。
未触及、未入作者闭包的用户文件不写不删；检测到冲突后已经成功的本次步骤留作 pending，保留完整目标供后续处理。

### 4. 权限与锁的具体落点

- 正常写入仍从 AuthorizedWorkspaceTarget 开始；内部新增仅绑定冻结计划的 recovery permit，不能暴露任意目标目录写接口。
  通用 writeFile/copy/remove 继续拒绝整个 .type-pal。沙盒 marker 引导与恢复元数据使用各自固定路径专用能力，
  不把 PAL sentinel 加入可恢复写/删表。身份文件已有值不符立即拒绝，不用 journal 自称值覆盖它。
- 未标记目录的首次 staging 凭据参与 isSameEntry 发现，阻止另一个窗口为同一目录另铸 W；首次记录不冒充“最近成功工程”。
  统一锁序仍是 discovery → workspace；已绑定操作只持 W 时不反向获取 discovery。
  内部 finishOpen/验证复用有私有品牌的 active session，不递归申请不可重入 Web Lock，也不靠布尔 skipGuard 绕过。
- 恢复入口在 finishOpen 的 metadata/PAL proof/manifest 载入之前，因为这些文件此时可能正是合法部分态。
  恢复身份来自同 handle 的原授权凭据，不来自半文件反推；只获准重放原计划，不给恢复页永久 PAL 能力。
  PAL 恢复使用原授权时受控 proof 路径及原 sentinel、已签的逐步预期；完成后正常打开仍重新核可信 HTTP proof，
  若当前 HTTP 基线另有变化则拒绝装配新会话。不能用 fresh HTTP 的半状态抹掉原证据，也不能借恢复绕过后续普通授权。
- forceSandbox 检视 PAL/local 源目录不能触发源目录恢复写入，pending 时提示从普通“打开项目”处理；
  已有相符 sandbox marker 的原沙盒可按其可信凭据恢复。仅 runtime/试玩/导出调用没有重放能力。
- 原页面再次点保存：仅当持有该原会话 nonce/基线，先完成自己的 pending，再按已验证后态推进本页快照/基线，
  重新计算这次点击的新 diff；中途新增的编辑继续保留，只有对应捕获 state/version 的成功保存才能 markSaved。
  另一旧窗口点保存不能恢复他人的 pending 后顺便收编成自己的基线；它仍拒写，须显式重新打开。
  取消目录选择保持 AbortError 静默；真正 IO 中断必须可见，不能一律作为“用户取消”吞掉。

### 5. 各写/读入口的闭环

| 入口 | 本卡处理 |
|---|---|
| App 普通保存/HTTP 首存/新建空白 | 一个点击对应一个完整 sealed 计划；原页 retry 与新页打开均走同一恢复执行器；新目标直到内容完整才可 recent 登记 |
| cloneFromPal | 先完整枚举并逐文件下载/验证到私有 staging，最后 sealed 再写 canonical；不把 207MB 全收进一个内存对象，不在网络尚未读完时开始作者写入 |
| Save As | 源复制清单 + 当前编辑覆盖 + 删除先合成一个最终计划；私有 identity/recovery 不复制，新目标独立 W；保留现有禁止目标为源/子目录及首写前复验 |
| 本地打开/最近项目 | 先识别/恢复，再走真实 loader、authorBaseline 与身份装配。首次失败目录尚未在 recent 时，用已有“打开项目”选原目录即可；没有 manifest 也先检查恢复 |
| 同源本地试玩 | 同 W 读取锁内检查门并装配初始项目；pending 拒绝并指向编辑器完成保存，不自行恢复 |
| Save As 源 | 采用乐观一致读取：源读门前后相同且可读、源作者基线与实际复制字节夹验，完整暂存源字节及编辑覆盖之后才 sealed；不嵌套持源 W 锁。源变化则零目标作者写入；目标提交前仍检查源/目标关系 |
| ZIP | 同源只读锁内收集并夹验源读门，pending 拒绝；导出不触发恢复，文件收集失败不发下载 |
| HTTP dev/运行壳/克隆源 | 初始加载前后读固定状态门，pending/非法/operationId 改变均拒绝，绝不恢复磁盘；只把真实 NotFound 当没有状态文件 |

HTTP 门实证揭示 dev 服务器会把缺失 JSON 落到 SPA 首页；本卡限定修 editor/reforge dev+preview 的该固定元数据路由：
存在时正确 JSON/no-store，不存在返回真实 404，不将 200 HTML 识别成“旧工程”。HTTP FileSource 对 404 提供可识别错误，
FSA 使用 NotFoundError；500/403/AbortError/坏 JSON 不吞掉。恢复状态读取不使用过期缓存。
普通静态部署同样须正确返回缺资源 404；完整初始 loader 返回前夹验，不靠一个启动前单次判断覆盖长载入。

**读一致性范围明确限定为打开/启动/复制/导出这次操作**：保留 committed operationId 用于夹验 ABA。
本卡不把已经运行的试玩页改为完整工程版本快照，也不保证外部实时发布时已返回 HTTP 图片 URL 与未来懒加载永远来自同一代。
已运行试玩继续编辑后的实时热同步、跨服务器/CDN 原子发布属于另外的发布/运行合同，不以本卡通过宣称解决。
标准 A1/A8 包必须从完成保存的目录产出，不发布 pending；源站自行过滤状态文件或绕过 loader 不在本卡保证内。

ZIP 原有“原样收集”仅新增排除临时 save-recovery 子树（含清理失败残留），不删除磁盘文件、不过滤既有 sandbox/PAL identity；
保留 committed 状态门供普通解压后读取。pending/损坏门不导出正常可玩 ZIP，也不以“导出”规避恢复冲突。

### 6. 反馈、版本与实施边界

- 复用 ProjectPicker 的 busy/progress/error、App 的保存活动与错误区，不新增工作台、图标、按钮尺寸或弹窗布局。
  准备/应用分别显示“准备保存…”/“正在保存…”；重开恢复显示“正在完成上次保存…”。
  冲突反馈包含文件路径并说明“已停止恢复，未继续覆盖；恢复数据仍保留”；权限不足引导现有重新选择/连接操作。
  本卡不是 A-07 离开保护，不自动为了恢复而关闭有未保存编辑的会话。
- current-only：plan 封存 contentVersion 与私有协议版本，仅相符版本可重放；未知/旧版本阻断且保留字节，
  不自动删作者恢复输入。N6b content21 切换前须明确排空未完成作者保存或另行裁决真实输入，不能借旧开发玩家档授权清它们。
- 实施面预期：editor core 新增小型 plan/journal/recovery 模块，改 project-io、workspace-persistence、author-disk-baseline、
  open-actions/open-local、clone/fsa-copy、load-play-project/export-zip 与 App/ProjectPicker 反馈接线；
  reforge 的只读状态协议/HTTP 错误/loader 入口及导出；两包 Vite 固定路由；对应测试、coverage baseline 和现行生命周期规范。
  不改公共内容类型、玩家 save、迁移器、生成项目、旧审计探针、全局超时/排除。若要越出此面，先更新卡并核是否触发重签。
- 不选的替代方案：仅 IDB 存目标（清站点数据即丢唯一副本）；仅磁盘 JSON 自授权（复制/伪造提权）；
  全工程世代目录（扩大内容布局/资源解析）；只改 manifest-last 或写入顺序（既有反例不消失）。

## 验收条件与故障矩阵

以下是待实现的验收条件，不是已跑结果。编号固定供两席逐项签证；测试数字从最终提交树实跑生成，不预填预计通过数。

| 编号 | 必须证伪的风险 / 业务断言 |
|---|---|
| SR-01 | 真实新人物＋场景引用故障，新页面全新模块/对象、仅用持久目录/IDB恢复；237与引用保持，可继续编辑、保存、试玩。旧实现先红 |
| SR-02 | staging 各 payload/plan/IDB complete 失败、最后基线漂移，均零作者 create/close/remove；私有 staging IO 单独计数，原文件逐字节不变 |
| SR-03 | 参数化每一步 issued 前后、create 空占位、write/close 前后、游标提交、catalog 两次写、manifest、remove；新页恢复与再中断幂等，未 issued 的空/新文件拒绝 |
| SR-04 | 全体 payload 校验前不写作者文件；坏 hash/缺 blob/重复路径/路径穿越/保留空间/大小写别名/文件目录冲突均阻断，原证据与无关文件保留 |
| SR-05 | 复制 journal 到另目录、伪造 workspace/PAL、IDB 缺失/错误 handle、过期 operation/非法游标/换 sentinel/forceSandbox均不能获得重放权限；不把“任意同源恶意改库”列为可防御威胁 |
| SR-06 | 外部改已完成/未完成/不写的作者文件、将未来一步提前写成目标；第一次恢复和后续步骤的拒绝边界可测，不收编 live reread |
| SR-07 | 数据完整但 recent/fence/IDB/cleanup 各失败与重启；不得回滚、重复写或误删新内容，已 committed 后清理失败仍显示已保存+待清理 |
| SR-08 | 普通/PAL/sandbox，绑定/首存/blank/clone/Save As；初次 manifest 缺席也能先恢复；两页首写同 handle 不裂 W；源移动入目标关系再次拒绝 |
| SR-09 | 原页 own retry 后新增编辑保留、基线/diff正确；另一旧窗口不能趁恢复重置基线；markSaved 与捕获 state/version一致；旧 A-02 行为回归不删断言 |
| SR-10 | open/recent/local trial/Save As/ZIP/HTTP 每一消费入口；pending 拒绝、夹验期间完整提交也拒绝旧读取（ABA）；真实 404 与200 HTML/403/500/AbortError区分 |
| SR-11 | 同 W recovery/save/open 竞态；discovery→W 锁顺序；内部 finishOpen 不死锁；Save As 不嵌套源 W 锁但完整复制字节/源作者基线/状态门核验不能省略 |
| SR-12 | committed ZIP 排除临时恢复数据，保留原 identity；unknown/private-version/contentVersion 不重放不丢数据；旧探针与产品版本均零 diff |

确定性测试需要在异步阶段内部 gate/entered，不用睡眠猜时间；负控制至少独立移除 ready 门、一个前缀校验、handle 校验，
对应真实调用链必须红，不能只测手写模拟状态机。大量 close 矩阵使用内存 FSA；IDB 测试必须覆盖 request success 后 abort。
正式浏览器另跑原生句柄/IDB/Web Locks 的跨页重开，不能把内存 fixture 的“新对象”叫作真实崩溃。

质量门：定向测试与 editor/reforge typecheck、完整 pnpm check、单次严格 coverage:fast；新核心逻辑以行/函数≥95%、
分支≥90%为目标，纯计划/状态判定尽量100%分支。若未达明确列缺口，不改 exclusions/超时或下调既有 ratchet。
大克隆测暂存峰值/耗时和磁盘临时占用，单文件流转，不以把207MB全缓存在内存换取测试绿。
同时记录小增量与 PAL 首存的 before/after 耗时，特别关注逐步 strict IDB 提交成本；未实测不能宣称“几乎没有性能影响”。

最小 dev-functional 由 Codex 在隔离目录/浏览器资料执行：新增人物及引用 → 保存到指定 close 后关闭页面 → 新页选原目录 →
恢复后看到人物与237 → 编辑/保存成功；再取一例外部修改看到拒绝且可重新选择，不覆盖外部文本。使用实际保存/打开链，
故障注入仅测试边界，不修改用户工程。首存/克隆/PAL 权限差异由正式集成与最小真实句柄验证补证，不重复剧情巡检。
R4 登记同一跨页恢复链与恢复后本地试玩，无玩家战斗/剧情新要求。实现前视觉证据仍 pending，不需要用户现在制造坏工程。

### 延续的验收要求

- 定向先红后绿：合法新人物＋场景引用跨文件保存故障；新会话不依赖旧 ref，按已选目标恢复后可打开/继续编辑/保存。
- 故障矩阵：准备记录失败、各 close 前/后、catalog 两次写入、manifest、删除、提交标志、清理；恢复自身再中断；
  缺记录/坏哈希/错误目录/外部修改/权限丢失须拒绝且不损坏额外文件。
- A-02 旧窗口拒写、同 W 重开、首存恢复证据保持；不能降覆盖率或改旧探针凑绿。
- 原生浏览器专用目录做最小功能，普通/沙盒/PAL 权限边界分别核；不操作用户真实工程制造故障。
- 完整 R4 另登记跨页/重开/试玩链，未执行不得写成完成；不重复剧情观感巡检。

## 推进签字

### build 前

- Codex：**premise verified / design agree（r2，2026-09-07）**。再次直读 writer、policy、handle-store、author baseline、
  open/clone/Save As/ZIP、两类 loader/HTTP source；重跑当前 API 探针仍复现半状态、原页重试正控保留237，
  相邻7文件86项通过。直读 FSA/IDB/Web Locks 规范；现有6010缺恢复JSON实际返回200HTML，已纳入只读门路由设计。
  可证伪观察仍为：无旧页面对象的新会话已有完整目标和正式恢复链即可推翻缺口判断；现树探针相反。
  设计选择完整目标先封存、可信 handle 凭据、受限前缀重放与读门，明确同源/非原子CAS/运行中懒加载边界；
  不是物理断电事务、不是旧版本兼容。实现高风险由 Codex 持有；仍须两席独立核恢复权限与完整入口，不能凭本席推进。
- 独立非 Owner 前提复核：Kimi（a88f3056）与 GLM（63649751）均独立直读/复跑当前 API 探针与相邻86项，证据及可证伪观察见各席。
- 缺签豁免：无；build 准入：**build allowed（Codex 2026-09-07 核定）**。r2 三方 premise verified/design agree、无 counter；评审提交仅改本卡，产品相对c19fc50c零diff。Coding Owner仍为Codex。

#### Kimi build 前席位

- premise：**verified（2026-09-07，r2，产品源码基线 135d065a；全部证据本人直读/复跑，未读 GLM 结论）**。
  - **当前 API 探针本人复跑**（exit 0）：`freshOpen: succeeded`（新 loader 对半状态照常打开）、
    `freshSessionLostNewActorDefinition: true`、再序列化报 `角色 "a03-new-npc" 不在 actors 表`；
    正向控制 `originalSessionRetryValid: true`、`restoredMaxHP: 237`——A-02 只保留原页精确部分态，
    新页确无持久完整目标，缺口属实；「A-02 已解决」「坏输入」两个替代解释均被实测否定。
  - **写入顺序直读**：`project-io.ts:455-550` 资源/catalog 超集→内容→manifest→catalog 收缩→删除
    逐文件分别 close，未 close 的后续文件无持久目标副本；`workspace-persistence.ts:229-289`
    内存预期后态。前提行与源码一致。
  - **读入口直读**：`open-local.ts:36-77` 正常载入无中断识别；`load-play-project.ts:9-15`
    fsaSource 直接喂 loader；`export-zip.ts:83-99` 直接收集磁盘文件——半状态今日被静默消费，
    设计 §5 的入口表是必要的非装饰。
  - **规范与边界直读**：`handle-store.ts:40-53` 既有 tx 已等 transaction.oncomplete 并处理
    abort（IDB 纪律先例）；`editor/vite.config.ts:43-60` 缺文件 `next()` 落 SPA 首页——
    HTTP 缺失 JSON 返回 200 HTML 的前提属实，设计限定修固定元数据路由为真 404 是正确最小面；
    FSA 单文件 close 提交/Web Locks 合作锁语义与卡面引用一致。
  - **相邻基线复跑**：author-save-conflict/project-io/open-local/open-actions/
    workspace-persistence/clone/fsa-copy **7 文件/86 项全绿**，与探针反例并存——不冒充已修复。
- design：**agree（r2，2026-09-07）**。用户已批准前滚，不重问方向。逐项核十红线：
  ① ready 门要求 FSA 全部 close+回读且 IDB transaction complete（strict 仅提示）后才封存——
  恢复信息先于作者覆盖具备可验证持久性；② 磁盘 plan 只负结构/哈希证据，授权来自同 handle
  isSameEntry+原身份+planHash+nonce 的 IDB 凭据，磁盘自称不能提权，威胁模型声明不含同源
  恶意脚本；③ staging/ready/pending/applying/data-complete/committed/cleanup 六态及
  issued-before-execute、游标 after-close 推进，再中断幂等；④ 每步前后核该路径、最终全后态、
  外部混入拒收编（沿用 A-02 纪律）；⑤ catalog 双写记为不同步骤、空占位仅限 before=missing
  的已 issued 步、remove 仅限计划内——故障矩阵面完整；⑥ 读门（`.type-pal/save-state.json`
  严格解析、operationId 夹验 ABA、仅真实 NotFound 当无记录）覆盖打开/试玩/Save As 源/ZIP/
  HTTP 壳，运行中懒加载与跨服务器发布明确限定不承诺；⑦ `.type-pal` 通用写删仍拒，恢复元数据
  与沙盒 marker 走各自固定路径专用能力，PAL sentinel 不入可恢复写删表；⑧ 绑定/首存/克隆/
  Save As 整笔计划分层登记时机分列；⑨ plan 封存 contentVersion+私有协议版本，content21
  切换前须排空，不抢版本；⑩ 清理限本次已核 payload/plan、非递归空目录、未知文件保留。
  锁序 discovery→workspace 不反向、内部 finishOpen 用私有品牌 session 不重入 Web Lock；
  原页 retry 凭 nonce/基线先完成自己 pending 再推进，另一旧窗口仍拒写不收编——旧窗口与
  读取边界闭合。SR-01～12 与负控制（ready 门/前缀校验/handle 校验移除必红）可执行。
- 直接证据/可证伪观察：上列源码锚点外，任一反例即 counter：① 新会话不依赖旧页面对象即可
  经现有正式链恢复完整项目 → 前提倒（探针否定）；② sealed 前存在任何作者路径 create/close/
  remove（SR-02 私有 IO 单独计数应证零）；③ 缺 IDB 凭据/换 handle/换 sentinel 仍获重放；
  ④ 某一步 issued 后中断重放产生重复写或越序；⑤ HTTP 200 HTML 被当无记录或旧工程；
  ⑥ committed 后清理失败被误报内容未保存或误删新编辑 dirty；⑦ Save As 源在复制期间变化
  仍完成目标写入；⑧ 恢复用 fresh HTTP 半状态抹掉 PAL 原证据。
- 返工项：无。非阻断备注：逐步 strict IDB 提交与大克隆暂存的成本声明必须以 build 期实测为准
  （矩阵已要求 before/after 计时）；跨浏览器缺凭据 pending 仅提示不自动重放属用户可见边界，
  文案在 build 期随最小功能验证一并核对。

#### GLM build 前席位

- premise：**verified（2026-09-07，r2；全部证据本人直读/亲跑，未读取 Kimi 席结论——其签字于本人
  审查中途落地，本人仅确认席位位置）**。
  - **当前 API 探针本人复跑** exit 0：真实链（buildBlankProject→首存授权/writeProject→openLocalProject
    →toEditorState→真实 createCanonicalPlacedEntity→serializeProjectWithMapCopies 全目标先过校验，
    仅 actors close 前注错）产出 partial：场景 actor=`a03-new-npc`、磁盘 actors 表仅 `hero`、
    completedCloses 含已写文件；**新开真实 loader 打开成功但 `freshSessionLostNewActorDefinition=true`**
    （再序列化报"角色 a03-new-npc 不在 actors 表"）；正控 `originalSessionRetryValid=true`、
    `restoredMaxHP=237`——A-02 恢复证据只在原页内存，新会话无路径，A-03 缺口成立。
  - **前提行源码直读**：writeProject 写序=资源二进制→catalog 暂时超集→内容→manifest（注释明言
    引用表最后落定）→catalog 收缩→remove，逐文件 close（project-io.ts 本席读段与卡面 :399-550
    一致）；handle-store:46-65 IDB 已等 oncomplete/onerror/**onabort**；open-local 直接
    loadCurrentProjectFrom 无恢复识别；load-play-project:9-15 与 export-zip:83-99 均直接消费磁盘
    无门；App:572/2117-2138 recoverySnapshot/snapshotRef 仅 ref；author-disk-baseline:162+
    expected 后态仅内存 Map。
  - **HTTP 缺文件行为双证**：editor vite.config:43-60 statSync 失败即 next()→SPA 兜底（源码机制）；
    本人只读 curl 现行 6010 `/projects/pal/.type-pal/save-state.json` → **200 text/html** ✓。
  - 相邻 7 文件 **86 项本树复跑全绿**——与探针半状态并存，不构成已修复证据。旧探针因 A-02 新必填
    authorBaseline 不匹配当前 API（新探针 `"api":"current authorBaseline required"`），参数错误不作
    A-03 证据 ✓ 卡面口径正确。
  - 可推翻观察核验：若现行调用域已有"新会话凭持久数据恢复完整项目"路径即可推翻缺口——探针结果相反。
- design：**agree（r2）**。SR-01～12 逐项对表（本人逐条核设计机制↔故障能否被发现）：
  - SR-01/02：sealed 计划先于一切作者 IO（staging 全部 close+回读校验+IDB complete 才 ready；
    ready 前零作者 create/close/remove），恢复执行器重放冻结字节、禁止重跑闭包/重序列化半工程 ✓。
  - SR-03/04：逐步 issued 游标持久先于执行、in-flight 步 before/after 二态、空占位仅限已 issued
    before=missing、remove 唯一合法"已不存在"；payload 全量校验先于首写，穿越/别名/类型冲突停线 ✓。
  - SR-05/06：IDB 凭据=授权记录（isSameEntry 非名等）、目录 JSON 不可信、恢复 permit 只绑冻结计划；
    前缀校验天然拒绝"未来步提前写成目标"，不收编 live reread ✓。
  - SR-07/12：typed 结果区分 committed/待清理；清理仅限已核 hash 的本次 payload/plan、非递归空目录；
    ZIP 排除 save-recovery 子树、保留 committed 门与 identity；私有版本 current-only 不自动删 ✓。
  - SR-08/09：新目标 staging 凭据参与 isSameEntry 发现防另铸 W；原页 retry 须原 nonce/基线、
    中途编辑保留；另一旧窗口不能借恢复收编基线 ✓。
  - SR-10/11：六读入口逐个有门（open/recent/试玩/Save As 源/ZIP/HTTP），committed operationId
    夹验 ABA；HTTP 固定路由真 404 vs 200 HTML 区分；discovery→W 锁序、内部 finishOpen 私有品牌
    active session 防死锁、Save As 不嵌套源锁但乐观一致读取补偿 ✓。
  - 红线 1-10 逐条与设计条款对得上；A-02 分责/PAL proof/.type-pal 通用拒绝均保持；不越 content 版本。
  可证伪观察（实现期逐条可验）：(1) 若任一写入口（普通/首存/blank/clone/Save As）存在"计划未
  sealed 即触作者路径"的路径，SR-02 失败；(2) 若重放遇到"未来步已写成目标"仍继续，前缀校验失效；
  (3) 若 ZIP/试玩/HTTP 任一入口吞掉 pending 或 200 HTML，SR-10 失败；(4) 若原页 retry 或另一窗口
  借恢复重置基线/清 dirty，SR-09 失败；(5) 若清理删除非本次已核 hash 的文件，SR-12/红线 10 失败；
  (6) 大 clone 暂存峰值/磁盘 2× 占用须按质量门实测登记，未实测不得宣称无影响。
  非阻断备注：(a) `.type-pal/save-recovery` 位于工程目录内，暂存期磁盘占用≈目标增量 2×，设计已
  列"空间不足零覆盖失败"与成本实测要求，属诚实边界；(b) 6010 只读 curl 与源码机制双证一致，实现期
  固定路由改造（存在→JSON/no-store、缺失→真 404）需覆盖 editor 与 reforge 两侧 dev+preview。
  返工项：无。

### done 前

- Codex：pending。
- Kimi：pending。
- GLM：pending。
- done 准入：blocked；尚未完成整条恢复链及实现终审/用户验收。

## build 执行进度（2026-09-07，非验收候选）

### 第一部分（de9255a1，历史实现回执）

已核三方 r2 设计签名（Kimi a88f3056、GLM 63649751），没有 counter、缺签或产品前提变化。
当前落地第一部分：恢复记录/计划/前缀的严格校验与 IDB 存储基础，以及实际 current loader 的只读状态门。

- `reforge/src/project-save-state.ts` 严格区分 missing/pending/committed/invalid，拒绝未知字段、坏JSON和200HTML；
  `loadCurrentProjectFrom` 在实际初始装配前后夹验，pending在任何manifest/作者表读取前拒绝，完整提交期间的epoch变化同样拒绝。
- `httpSource` 将真实404转为明确NotFoundError，恢复状态使用no-store，403/500/AbortError保持失败；
  editor/reforge两侧dev+preview的固定状态路由在ENOENT时返404，目录类型/权限/IO错误返500，现有6010只读GET已证404/no-store。
- `editor/core/author-save-plan.ts` 校验current版本/身份组合/受限路径/跨平台别名/父目录与步骤顺序，按前缀推导文件/目录预期。
  `author-save-prefix.ts` 只调和唯一issued步骤，拒绝未来步被提前写入、无issued的空占位、未知状态和不完整观测。
- `author-save-store.ts` 是独立IDB存储适配器与凭据结构校验；complete才成功，request success后abort仍失败；
  ready凭据必须有相匹配的完整计划签名，已提交/已清理凭据不能因临时文件缺席回滚作者内容。
  **这些editor基础模块尚未接入保存writer；普通保存目前不会使用它们创建恢复记录或自动重放。存储函数本身不授予作者写权限。**
- 没有修改save版本/content版本、当前PAL产物、A-02 writer/policy、App视觉布局或原审计探针，也没有执行真实作者目录写入/故障注入。

本轮检查事实：

- HTTP缺文件回归在修改前1红（旧Error不区分NotFound），修改后通过；原6项HTTP断言保留。
- 新editor基础/路由定向4文件117项；reforge读取边界定向3文件44项（含既有测试），均通过。
- 首次完整check发现4个PAL测试源的缺文件异常契约不匹配，另有1处新提示误用“工程”；
  只修测试适配器的NotFound语义及新提示术语，业务断言/静态门禁零删改。定向5文件65项复跑通过后再次完整check。
- 修正后完整 `pnpm check`：**549测试文件/6,498项全部通过**；各包typecheck通过，lint仍为既有50warnings/11infos、0errors。
  docs工具20/20、coverage工具17/17另计，不混入上述Vitest项数。
- `pnpm coverage:ratchet` 在不降既有比例的前提下登记4个新增生产模块与测试（提升16项/范围变化8项）；
  随后的**单次严格 `pnpm coverage:fast` 通过**：615生产文件/6,012项测试，editor为217文件/1,774项。
  两次editor精确计数一致：statements 23,916/31,764、branches 18,508/27,621、functions 5,985/8,082、lines 21,614/27,729；
  没有off-by-one复现，也没有以多数通过放行。provider/exclusions/全局超时/旧测试身份均未缩窄。
- 新基础模块逐文件覆盖：plan行/函数100%、分支86/87（98.85%）；prefix、store、reforge只读状态门的行/函数/分支均100%。
  这只证明已写基础逻辑的测试覆盖，不能替代尚未接入的SR-01跨页恢复/写权限/成本与功能验收。
- 只读门测试已覆盖真实loader调用；路由测试执行两份实际serveDir函数的AST提取代码，不是手写中间件副本。
  IDB单测是事件边界模型，不能当作原生句柄structured clone、跨页恢复或断电证据。

后续仍由Codex按同一r2连续实现，无需重新设计签字：

1. 连接原始policy授权、完整目标目录暂存和封存校验；持久凭据不可直接凭目录JSON补建。
2. 受控执行器与issued/完成游标、data-complete/committed/清理故障闭环；接入原页own retry及新页打开，保护A-02/dirty归属。
3. 首存/clone/Save As整笔计划及其源读取一致性、ZIP/试玩锁与完整打开消费域，不能把目前初始loader门当所有入口已完成。
4. SR-01～12正式故障矩阵、ready/前缀/handle负控制、原生隔离浏览器跨页/权限验证及成本实测；完成后才冻结候选送终审。

本卡仍为build，A-03尚未标修复；当前没有需要用户手工验收或再次拍板的项目。

### 第二部分：目录暂存与恢复内核（本轮；尚未接入顶层入口）

新增 `author-save-journal.ts`：原始active mutation校验 → 私有目录逐文件暂存 → 冻结计划/完整目标验证 →
ready凭据 → pending标志 → 按issued/完成游标写入 → data-complete/已有policy收口 → committed标志 → 仅清理本次已核文件。
回读精确标志可识别“close实际成功但确认失败”；元数据坏形状、错误绑定、越序状态及外部作者变更均拒绝重放。
私有恢复凭据显式带current contentVersion，不重放跨内容版本的准备记录，不新增upgrader。

`workspace-persistence` 增加只面向真实active mutation的保存证据/固定私有文件许可和任务生命周期跟踪：
首存空目录检查只允许本次已核的私有准备文件，不忽略整个.type-pal；已开始的journal任务即使调用者漏await，
也必须结束后才释放原目录锁。原有PAL预期/作者基线/登记收口复用并集中，完成后拒绝追加作者写入。
FSA内存fixture补齐空目录删除和文件/目录类型冲突语义，没有改变原有业务断言。

验证事实：

- journal定向 **44项** 通过：首存（含manifest尚不存在）、普通增量、沙盒、catalog双写、删除中断、
  close前/后失败、IDB各阶段失败、元数据/字节损坏、错误绑定、复制目录、外部修改、清理失败及未await任务的锁生命周期。
- 三份独立负控制只在临时Vite加载钩子中变更一个位置，不stash、不改仓库源码：去掉封存视图验证 → 非法目标被保存；
  去掉恢复准入的完整前缀核对 → 外部locale已变仍先写3个作者文件；去掉已登记句柄核对 → 错误绑定仍被重放。
  三者各自exit1，正常实现对应3项对照绿。临时配置 `/tmp/type-pal-save-recovery.hUrhFF/mutant.config.mjs`。
- 原生浏览器内核验证已实跑：专用Chromium资料 + 原生OPFS/FSA/IndexedDB/Web Locks，初次完整保存后新增人物/实体，
  在actors的真实close前注错；随后**关闭并重新启动浏览器**，不复用旧页面对象，从持久句柄/恢复记录重放。
  最终人物体力上限237、场景actor引用同时保留，项目重新载入/序列化通过，pending→committed，清理无警告。
  最终operationId `27730427-867e-4902-bfa5-a078f6ac418f`；
  回执 `/tmp/type-pal-save-recovery.hUrhFF/native-result.json`，脚本同目录 `native.mjs`。
- 首次在6010手动导入模块时遇到热更新后同文件不同URL形成两份WeakMap，权限门正确拒绝；未放宽品牌校验。
  改用自建6011冷实例/独立cache，后续成功；补生命周期/标志确认及身份检查后用新浏览器资料最终复验。
  自建6011已停止，未重启/清理用户6010或用户浏览器资料。
- 原生验证是**后端API + OPFS**，不是OS目录选择器、不是按钮链验收、不是断电事务；PAL新内核路径与大克隆成本仍待补。
- 完整 `pnpm check` **550文件/6,545项** 通过（editor 202文件/1,977项；game 123文件/2,307项）；
  typecheck通过，lint仍为既有50warnings/11infos、0errors。初次ratchet遇到game计时波动，修正和后续覆盖率回执见下。

**本轮没有将新内核接到 App 的保存按钮、普通writeProject、finishOpen自动调用、clone/Save As、ZIP/试玩的全部入口。**
现有writer/打开函数代码未改，测试显式调用内核；不能把这份API证据宣传成用户已能自动恢复。
下一步按同一r2接入这些入口，并完成own retry/dirty归属、各模式和发布闭包检查，再补剩余覆盖率和UI最小验收。
恢复的内容语义由必填只读封存验证器校验；生产接入时必须接现行完整校验（含资源bytes/hash/格式），不能传空验证器。
当前无新产品裁决/设计重签要求，不交终审、不标done。

### 2026-09-07 验证中发现的一阶段测试时钟缺口（单文件测试修补）

本轮ratchet被未修改的game包阻断：statements 11,379（基线11,387）、branches 7,480（7,487）、
functions 1,302（1,303）、lines 10,255（10,262），测试仍为2,250项。按同一fast配置独立只跑game，
精确计数恢复基线；这不是多数通过放行，已用两份逐文件coverage/LCOV定位全部差值只来自
`packages/game/src/tools/tools-panel.ts:1004-1012` 的250ms真实setInterval及其battleSig调用。
`tools-panel.test.ts` 没有受控时间或轮询断言，beforeEach只清DOM，计时回调是否赶上用例结束取决于耗时。

按用户既有“小需求免三签、补充测试提升覆盖率”要求，同Owner同会话作一项单文件测试修补：
只调整 `packages/game/src/tools/tools-panel.test.ts`，控制并清理用例时钟、补真实setupToolsPanel轮询断言；
不修改一阶段产品源码、原版机制、全局配置/超时/排除，不调整已有断言去迁就失败。
这是验证范围新增的一项测试设施修正，不改变r2恢复前提/用户行为/架构，三方设计签字不重开。
取证保留在 `/tmp/type-pal-save-recovery.hUrhFF/game-failed-summary.json`、`game-failed.lcov` 与 `game-comparison/`。

修正后单文件15项通过；隔离加载中仅让真实轮询回调立即return，新轮询回归即exit1（250ms后DOM未刷新），
正常对照通过。按原fast配置独立game复算为statements11,389、branches7,498、functions1,308、lines10,263，
均高于原基线；随后完整ratchet中game精确计数相同，测试2,251项。没有更改tools-panel.ts或game配置/超时。

### 本轮覆盖率回执与剩余验证

修正时钟问题后 `pnpm coverage:ratchet` 通过，生产范围616文件、fast测试6,059项，基线只升不降（12项提升/6项范围变化）。
editor精确计数：statements24,333/32,212，branches18,799/27,948，functions6,045/8,142，lines21,995/28,129；
当前journal单文件行323/335（96.41%）、函数49/49（100%）、分支213/248（85.88%）。
**journal分支尚未达到本卡90%目标，必须随剩余入口/模式/错误路径回归继续补齐；不能以全仓ratchet通过代替本卡达标。**
随后单次严格 `pnpm coverage:fast` 已通过：616生产文件/6,059项测试，全部精确指标与新基线一致。
game四项计数与修正后的独立复算/ratchet一致；editor为218生产文件/1,820项，计数同上，没有多数重试放行。
doc检查400 Markdown/1,812本地链接/140卡、20项doc工具测试与git diff --check通过；本卡仍非review候选。

### GLM 并行测试分工（2026-09-07，用户要求）

用户要求“让glm做一些事情吧”。沿用本卡已签 r2，不新开产品方案、不重签；这是 build 期测试协作，
不是整卡终审。**Codex 仍是唯一生产实现 Coding Owner**，负责保存/打开等入口、缺陷修复和最终集成；
GLM 在独立 worktree 为已提交的恢复内核补故障测试，不修改生产文件。

- 固定产品基线：`672827ac`；本次分工登记仅改文档。GLM 从包含本分工的提交建立独立
  `codex/glm-save-recovery-tests` 分支/worktree，不切换共享主工作树。若该分支已存在先核用途，不能强制覆盖。
  工作期间不混入 Codex 尚在开发的入口改动；交回后由 Codex 将测试适配、复核并集成到最新生产树。
- 允许修改：`packages/editor/src/core/author-save-journal.test.ts` 追加用例，以及必要的**测试文件内**
  辅助函数/边界故障钩子；本卡“GLM 并行测试回执”与“GLM 并行测试交接日志”。既有44项测试身份、
  业务断言保留；不得复制整份测试充数，不改共享fixture或通过mock替换journal/policy/loader的被测逻辑。
- 首先独立对照 SR-02～07/08/11/12 与实际源码和覆盖报告，列出未覆盖分支及业务风险。
  优先补尚缺的权限/身份变化、暂存/重放期间再次中断、提交后仅清理边界；已覆盖项不重复堆例，
  未接入口、own retry、PAL完整入口等依赖明确保留给Codex，不能凭内核测试勾完整SR条目。
- 冻结基线journal全editor-fast计数为行323/335、函数49/49、分支213/248（85.88%）。目标保持
  行/函数≥95%、分支≥90%；先按相同测试选择复算，再报新增后实值和缺口。若发现真实缺陷，交最小反例，
  不弱化断言或自行修生产代码来赶比例；达标也不代表整卡通过。
- 使用生产调用链和真实校验，注错限FSA/IDB/权限边界，异步使用entered/deferred而非固定睡眠。
  至少两项新增关键断言独立做单点突变负控制；保存准确替换diff、正常绿/突变红的退出码与业务失败原因。
  测试本就绿可以是补覆盖，但不能虚报“缺陷先红”；不能把无关异常当防护有效。
- GLM只跑定向测试、editor typecheck及独立editor-fast口径覆盖；临时配置/报告/cache均在自己的临时目录，
  不写共享coverage输出。不得改版本、旧审计探针、依赖、超时、排除或coverage baseline；不运行全仓ratchet。
  完整check、全仓覆盖基线登记和单次严格fast由Codex集成后串行执行，不能两席争写报告或基线。
- 发现阻断立即在本席记录 `counter` 和 `file:line`、最小复现及受影响SR，交Codex停线处理；没有阻断则
  交“测试补齐完成，待Codex复核”，不提前签整卡done席位accept，不标review/done，不代签。
  GLM参与实现的测试须由Codex独立复核，后续终审须披露测试贡献，不能作为独立第三方自证。

#### GLM 并行测试回执

接收说明（Codex，2026-09-07）：以下原样保留分支 `925a89aa` 的 GLM 回执，不代改他席结论。
本轮独立复核结论为**测试贡献 counter、暂不集成**，详见紧随其后的 Codex 席位；
回执的“差2”应为“差3”，future-step 测试和 M1 负控制亦需下述限定返工。


**2026-09-07 GLM（并行测试分工完成，待 Codex 复核）。分支 `codex/glm-save-recovery-tests`**
（独立 worktree `type-pal-glmt`，基于分工提交 `cd4ce646`，产品基线 `672827ac` 零触碰）。

**白名单 diff**：仅 `packages/editor/src/core/author-save-journal.test.ts` **+307**（44 项既有测试
与断言逐字保留）；无生产代码、共享 fixture、版本、配置、baseline、依赖或原审计探针改动。

**新增 16 项故障回归（44→60，全绿），风险→测试→SR 映射：**

| 风险（未覆盖分支） | 测试 | SR |
|---|---|---|
| 目录被另绑其他 workspace 后凭旧凭据重放 | recovery refuses a directory that has since been rebound to another workspace | SR-05/08 |
| 同 workspaceId 登记漂移到其他工程身份 | recovery refuses when the receipt workspace record drifted | SR-05 |
| 重放中外部改库换凭据 | a foreign change to the durable receipt mid-replay stops the save | SR-05/06 |
| 伪造 committed 标记被未执行计划采纳 | a forged committed marker cannot be adopted | SR-05/07 |
| 评审模式恢复本地工程 | forceSandbox never recovers a local project… | SR-05/08 |
| committed 凭据+伪造 pending 标记 | committed operation with a forged pending marker refuses cleanup-only reopen | SR-07/10 |
| committed 凭据+异代磁盘状态令牌 | committed receipt with a foreign on-disk state token blocks the next save | SR-10 |
| 步骤 IO 后、游标持久化前崩溃（磁盘领先） | a crash between a step IO and its cursor commit resumes exactly from the durable prefix | SR-03 |
| 两处不同步骤连续中断后幂等续存 | replay survives two successive interruptions | SR-03 |
| ready 后未发布即退出 | exiting after the plan is sealed but before any publish | SR-03/10 |
| 未来步目标被提前写成他值仍拒绝 | a future step pre-written to its target value stops replay | SR-06 |
| 我方 close 后外部立即篡改 | a foreign edit landing right after our step close fails post-write verification | SR-06 |
| committed 重开仅清理、精确哈希、未知文件保留 | a committed reopen is cleanup-only and removes exactly its own verified staging | SR-07/12 |
| 部分清理已删一个 blob 后续清 | cleanup resumes past staging files already removed | SR-07 |
| 已消费 token 二次 commit | a consumed prepared token cannot commit a second time | SR-11 |
| 未完成凭据上叠新保存 | a new save cannot stack over an unfinished durable receipt | SR-02/07 |

**覆盖（同一选择 author-save-journal.test.ts，独立报告 /tmp/glm-sr-workspace/cov-*，未写共享输出）：**
基线复算与冻结一致（行 323/335、函数 49/49、分支 213/248=85.89%）；新增后 **行 328/335（97.91%✓）、
函数 49/49（100%✓）、分支 221/248（89.11%）**。分支距 90% 目标差 2 项，剩余未覆盖为深层注错/
入口集成分支：非 missing 读错误重抛（:100）、凭据 handle 与目录不符（:178）、plan 未封散
（:199）、伪造 plan 操作号（:241）、封存视图读已删路径（:261）、仅盘 pending 分支（:312）、
staging 同路径异值冲突（:387）、写后回读差异（:391）、mkdir 未知父目录（:398）、data-complete
游标不一致（:437）、publish 写失败/验失败区分（:466）、异种状态令牌（:484 arm1）、已完成步
applied 三元非 write 臂（:511）、重放中状态翻转（:517）、execute 清理告警臂（:568）、
committed 清理状态检查（:646）、PAL 登记策略（:721）——多数依赖 remove/mkdir 计划、PAL 完整
入口或 FSA 深层注错，按分工保留给 Codex 入口集成测试，不以堆例凑数。

**负控制（单点突变，隔离 config /tmp/glm-sr-mutant{1,2}.config.mts，未动共享树）：**
- M1：仅移除 assertBinding 的「恢复目录已属于另一个工作区」守卫 → rebind 测试 **exit 1 红**；
  完整实现同过滤绿。
- M2：仅移除 stateForReplay 的「未经完成的保存不能采用 committed 状态」守卫 → forged committed
  测试 **exit 1 红**，失败原因精确为"promise resolved committed instead of rejecting"（伪造标记被
  采纳即防护失效）；完整实现绿。
- 附带观察：future-step 与 post-close 篡改两项在单点移除 per-step 观察检查或 post-write 校验后
  仍绿——前缀对账存在多层冗余防护（逐步观察+写后校验+终局全前缀 reconcile），非缺陷。

**验证**：60/60 全绿三轮；editor typecheck exit 0；biome 检查该文件零诊断。未跑全仓 check/ratchet
（按分工由 Codex 集成后统一执行）。

**未解决项/缺陷**：无生产缺陷 counter；分支覆盖差 2 项到目标已如实列缺口。本回执不签整卡 accept、
不标 review/done；测试贡献将在终审披露，由 Codex 独立复核。

#### Codex 并行测试接收复核（925a89aa，2026-09-07）

**counter：仅测试证据与回执返工，不是生产方案返工。** 主树接手/同步后仍为cd4ce646，
相对产品基线672827ac没有新增生产改动。r2设计签字保持有效、不重签；本卡暂为rework，
整卡done三席仍pending。未将候选测试合入main，未更新coverage baseline；GLM原始回执/日志已按原提交落回本卡。

独立核对白名单：候选仅测试文件+本卡；测试文件前30,032字节与cd4ce646完全相同，
追加307行、16个test调用，既有44项身份/断言未改；生产/共享fixture/版本/配置/探针零diff。
本人在候选worktree复跑60/60绿、editor typecheck exit0、单文件biome零诊断。
另用自建临时配置独立复算同一定向口径：行328/335（97.91%）、函数49/49（100%）、
语句362/379（95.51%）、分支221/248（89.11%）。这是journal定向报告，**不是全editor-fast或全仓覆盖已通过**。

逐项业务核对（行号均指候选 `packages/editor/src/core/author-save-journal.test.ts`）：

| 新用例 / 锚点 | 独立结论与SR边界 |
|---|---|
| 换workspace登记 :754 | SR-05/08错误身份拒绝方向正确；M1受旧注错干扰，按R2返工 |
| 同ID工程身份漂移 :774 | SR-05精确错误+零作者IO有效；同样撤销初始注错以隔离恢复阶段 |
| 重放期间凭据变更 :792 | 钉住持久化时发现凭据变化；manifest为本fixture最后一步，空removes不能额外证明“后续任意写删均停止” |
| close后游标前中断 :808 | SR-03已有close不重复、新人物/237/引用恢复有效；不是原生浏览器退出证据 |
| 两次不同步骤中断 :828 | SR-03续写及actors仅close一次有效 |
| ready未执行 :849 | SR-03无pending门仍从可信ready继续；是显式内核调用，不是普通打开入口已接通 |
| 伪造committed :869 | SR-05/07拒绝未执行计划有效；M2独立复跑为真实业务反例 |
| forceSandbox两态 :898 | SR-05/08 pending源拒写、committed local返回null有效；不替代PAL入口 |
| committed仅清理 :915 | SR-07/12无作者IO、作者字节保留、未知文件不删、已核blob清理有效 |
| future-step :942 | **R1：测试声称的前提错误，不能作为SR-06未来步骤目标态证据** |
| close后立即篡改 :955 | SR-06最终拒绝/未提交有效；单独移除即时检查仍绿仅说明该用例不能定位某一具体检查点，不当独立负控制 |
| committed配pending门 :966 | SR-07状态不符拒绝/零作者IO有效；非SR-10所有消费入口完成 |
| 部分blob已清理 :986 | SR-07清理缺席文件幂等有效 |
| 凭据与异代门冲突 :1007 | SR-10状态令牌一致性拒绝有效；不是夹验ABA完整覆盖 |
| 已消费token :1026 | 能力生命周期二次调用拒绝有效；不是SR-11锁竞态完整验证 |
| pending上叠保存 :1047 | 与既有pending拒绝有重叠，新增拒绝后显式恢复正控有效 |

**R1（阻断测试接收）——未来步骤与当前issued步骤不能混用。** :944调用stopAtActors，
:949却往actors写入任意字符串`pre-written by another tool`，既不是未来步骤，也不是该步骤目标字节。
本人仅在隔离加载中读实际plan/receipt，得到`completed=4, issued=true, steps[4].path=content/actors.json`。
再仅把该测试注入值换成原intended actors精确字节、生产零改，恢复正确返回committed，原“应拒绝”断言反而红。
这符合r2允许唯一issued步骤处于before/after的规则，不是生产缺陷，不能修改实现去拒绝合法after态。
返工：改成真正尚未issued的未来步骤，保证该路径目标与before不同、注入合法精确目标字节；
断言恢复在任何新作者IO前拒绝、外部字节及恢复数据保留，并修正名称/注释/SR映射。不要用任意坏JSON冒充目标态。

**R2（阻断负控制接收）——先撤销初始停存故障，再测身份保护。** :757后没有清除beforeClose。
本人原样复跑M1确实exit1，但实际原因是`expected 另一个工作区 / received stop actors`，
不是回执所说的干净“错误身份被恢复成功”业务反例。它能提示走到了后续IO，但不满足本轮隔离负控制的证据要求。
本人在临时加载中先撤销该故障：正常防护下同用例绿；再只移除同一rebind守卫，
确实返回committed而使拒绝断言exit1。请把这一最小测试准备修正落盘，同类身份漂移用例也清初始注错；
原M1 guard删除范围不扩大，回执写实测失败原因。M2原样复跑：只删committed阶段守卫后返回committed，exit1，接受此证据。

**R3（回执纠错，不要求本轮凑覆盖）**：达到90%至少需`ceil(248×0.9)=224`，
221还差3；223/248只有89.919%。分支缺口应以实际报告中的位置/条件为准逐条登记，
不能统称“都依赖入口集成”（例如:100的非missing读错重抛就是内核故障边界；原回执data-complete的:437也非实际:501）。
保持当前统计范围，剩余场景按业务需要随后处理，不为达标堆例或给不可达状态加测试专用入口。

诊断配置与独立覆盖报告：`/tmp/codex-glm-sr-review.a0DpXN/review.config.mts`、同目录`coverage/`。
配置模式`rebind-clear`/`rebind-clear-mutant`与`future-actual-target`仅内存替换；GLM两份原临时配置也已直读并原样复跑。
没有修改两工作树的产品/测试，未操作真实作者目录、未重复浏览器巡检。
因上述counter，按用户要求先退回卡内测试返工，暂不执行集成后的完整check/ratchet/严格fast，不能先更新基线再补证据。
GLM测试贡献由本席独立复核且须在最终终审披露，不充当独立第三方自证。

## 交接日志

- 2026-09-07 Codex：同步 041c2fe1 洁净树，复核 A-02 后的 A-03。新增内存当前 API 探针，旧探针/产品/正式测试未动；
  新 loader 丢失待写人物定义、原页重试可修复，定位为持久恢复缺口。相邻 86 项通过。
  已向用户询问恢复本次修改或回到上次完整保存；未把预选选项当回答。暂停详细方案与实现，产品目标确认后再给 Kimi/GLM 并行设计提示词。
  当前 API 探针最终 exit 0；文档工具 20/20、400 Markdown/1,812 本地链接/140 卡检查与 git diff --check 通过。
  packages/scripts/锁文件与原探针零改动；本轮未跑完整 check/coverage，也未声明任何恢复实现已经完成。

### 2026-09-07 Codex · r2 产品裁决及送审

用户在了解暂存/恢复边界后明确“可以补上”，采用继续完成本次保存。同步135d065a、洁净树接手；
产品前提未改，但 r1 没有详细设计签字，本轮 r2 开始征集两席设计签名，不是要求用户重签。
复核现行 lifecycle/harvest/协议与源码，新增上述详细设计、SR-01～12、入口和信任边界；
原探针 exit0、相邻86项通过。对现有6010只读GET确认缺路径200HTML，未重启/清缓存/改用户服务。
本轮只改5份文档；文档工具20/20、400 Markdown/1,812本地链接/140卡检查、git diff --check通过。
packages/scripts/锁文件及两份原审计探针零diff；没有跑完整check/coverage，也没有实现期浏览器验收声明。
Kimi/GLM同r2并行读取证据，各写各席；两席齐后由Codex统一核门禁。

### Kimi · r2 交接日志

2026-09-07：完成 r2 独立前提/设计审查，签 premise verified + design agree，无返工项。
复跑 probe-editor-save-recovery：新 loader 吞半状态、人物定义丢失、原页重试正控 237 保留，
缺口与正控同时成立；直读写入顺序（project-io:455-550 逐文件 close）、读入口
（open-local/load-play-project/export-zip 无中断识别）、IDB 纪律先例（handle-store:40-53）、
HTTP 200 HTML 前提（vite.config.ts:43-60）；相邻 7 文件/86 项复跑全绿。
按十红线逐条核对方案：ready 门 FSA+IDB 双封存、磁盘不可自授权（handle 凭据+nonce+planHash）、
六态幂等、catalog 双写分步、读门 ABA/真 404、`.type-pal` 专用能力、锁序不重入、
旧窗口拒收编、版本排空、清理限定——八条可证伪观察与两条非阻断备注（成本实测、跨浏览器
缺凭据边界文案）写入本席。未改实现/他席/共享结论/状态，未读 GLM 结论。
Next：GLM 并行签字；两席齐后 Codex 统一核门禁放行 build。

### GLM · r2 交接日志

- 2026-09-07 GLM：完成 r2 独立前提/设计审查（数据/矩阵/范围席），签 premise verified + design
  agree，无返工项。当前 API 探针本人复跑 exit 0（半状态、新会话丢新人物定义、原页正控 237）；
  前提行源码逐点直读（写序/IDB onabort/四个读入口无门/recoverySnapshot 仅内存）；HTTP 缺文件
  以源码机制 + 6010 只读 curl 双证 200 HTML；相邻 86 项本树复跑绿。SR-01～12 逐项对表设计机制，
  六条可证伪观察与两条非阻断备注写入席位。Kimi 签字中途落地，未读其内容。仅更新本席与日志；
  未改实现/共享结论/任务状态，不标 build/done。Next：三签齐后 Codex 核门禁放行 build。

## 下一位 Agent 提示词

当前GLM测试候选925a89aa接收复核为counter，按下列返工提示词先修测试证据；r2设计无需重签。
此前分工/设计提示词均保留为历史，完整候选冻结后另给两席终审提示词。

### 给 GLM（当前：925a89aa测试贡献限定返工）

```text
在 /Users/zhangxu/illegal/type-pal 接手 EDITOR-SAVE-RECOVERY-1 的GLM测试返工。
任务卡 docs/ops/tasks/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md，当前rework；r2设计签字有效，不重签。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、主分支最新本卡“Codex并行测试接收复核”的R1/R2/R3。
仍在原独立worktree、codex/glm-save-recovery-tests上修925a89aa，不切换共享main、不stash，不改生产代码。

R1：future-step用例实际completed=4、issued=true、当前路径actors，注入任意字符串，不能证明未来步骤目标态拒绝。
改为真正尚未issued、before与after不同的未来路径，写入计划精确合法目标字节；断言首个新作者IO前拒绝，
外部字节/恢复数据保留。当前issued精确after态可恢复是正确实现，不得改生产逻辑使其拒绝。
R2：身份rebind/漂移用例初次停存后先撤销beforeClose注错。原M1红于“收到stop actors而非另一个工作区”；
清掉旧注错后只删原rebind守卫，须得到真正错误恢复/写入的业务反例。正常对照绿，M2已有证据保持有效。
R3：221/248达90%差3，不是2；按实际报告校对未覆盖条件和file:line，区分内核故障与入口集成，不要求这次凑到90%。

只改已授权测试文件的新用例/必要测试内辅助及自己的回执日志；既有44项身份断言、产品/fixture/配置/baseline/探针不动。
参考Codex隔离证据 /tmp/codex-glm-sr-review.a0DpXN/review.config.mts，可独立重建，不照抄结论当实跑。
复跑定向、两份负控制与正常对照、editor typecheck和独立同口径覆盖；回执从实际提交树生成，修正旧证据口径。
无需提前跑全仓check/ratchet，交Codex复核通过后统一集成及执行。
保留其他席位及其counter原文，只更新自己的回执/日志；同步最新主分支文档时不混入生产变动，冲突不交用户搬运。
提交推送本分支，给Codex返工commit及复核提示词，不改任务状态、不代签、不标done。
```

### 给 GLM（历史：首轮并行补故障测试）

```text
在 /Users/zhangxu/illegal/type-pal 协作 EDITOR-SAVE-RECOVERY-1。
任务卡 docs/ops/tasks/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md，状态build、r2三签有效，不重签。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡设计红线/SR矩阵/“GLM并行测试分工”及最新日志。
先同步分支、检查工作树；在独立worktree和codex/glm-save-recovery-tests分支工作，基于包含本次分工的文档提交，
开始时核packages/scripts相对672827ac零diff。不要切换/覆盖共享主工作树，不用stash还原代码。

你负责实际补测试，Codex仍唯一修改生产实现。只允许在author-save-journal.test.ts追加用例及必要测试内辅助，
保留既有44项身份/断言，不改共享fixture、产品、配置、baseline、版本或原审计探针。
独立读取journal/policy/plan/prefix/store与现有测试，对照SR-02～07/08/11/12和未覆盖分支补故障路径。
用真实被测调用链，只在FSA/IDB/权限边界注错；断言停止点、作者字节/恢复数据保留、提交后不重放等业务结果。
异步用entered/deferred，不用睡眠；至少两项新增关键用例做“准确移除一处防护即红”的隔离突变负控制。
若现有生产代码有错，保留最小反例与file:line交Codex，不弱化断言、不代修生产代码。

跑定向、editor typecheck及独立editor-fast口径覆盖，临时配置/cache/报告写独立临时目录。
原journal全editor-fast行323/335、函数49/49、分支213/248=85.88%；目标行/函数≥95%、分支≥90%，
先复算同口径再报实值，不能拿缩窄分母/忽略分支凑数。全仓check/ratchet/严格fast由Codex集成后统一跑。
不得把内核覆盖当未接好的保存/打开按钮链、own retry或全部SR验收完成，不重复原生浏览器巡检。

从实际提交树生成测试名/数量、覆盖分子分母、白名单diff、正常/突变退出码和剩余缺口，
直接写本卡“GLM并行测试回执”和你自己的“GLM并行测试交接日志”，不改他席/状态/整卡accept。
有阻断签counter；否则写“测试补齐完成，待Codex复核”。提交推送自己的分支，给出commit和Codex复核提示词；
由Codex独立审查测试贡献、复跑负控制、处理真实缺陷并集成，不标done，不让用户搬运审查正文。
```

### GLM · 并行分工交接日志

2026-09-07：独立 worktree `type-pal-glmt`、分支 `codex/glm-save-recovery-tests`（基于 cd4ce646）
完成 16 项内核故障回归（身份/权限变化、重放再中断、提交后清理边界），44 项既有测试原样保留，
60/60 全绿、typecheck 0、biome 干净。覆盖行 97.91%/函数 100%/分支 89.11%（差 2 到目标，
缺口逐条列入回执，保留给 Codex 入口集成）。负控制 M1（rebind 守卫）/M2（committed 阶段守卫）
单点移除均使对应新测试 exit 1 红，业务失败原因精确。未改生产/fixture/配置/baseline/探针；
无生产缺陷 counter。详见「GLM 并行测试回执」。分支已推送，交 Codex 复核适配与集成；本席不签
整卡 accept、不标 build/done。

### Codex · 并行分工交接日志

2026-09-07：用户要求分配GLM工作，已同步main/672827ac洁净树，核本卡r2三签与当前内核覆盖缺口。
安排GLM独立worktree补内核故障回归，Codex继续入口实现；生产实现权限不转交，测试贡献将独立复核。
本次只登记分工/提示词及同步看板，不宣称测试已新增或A-03已修复，不提前进入review/done。
文档工具20/20、400 Markdown/1,812本地链接/140卡检查及git diff --check通过；packages/scripts零diff。

### GLM 并行测试交接日志

待GLM填写本人实跑与交回Codex的证据；保留他席及共享状态。

### Codex · 925a89aa接收复核交接日志

2026-09-07：独立核两文件白名单/既有测试字节前缀、候选60项/typecheck/biome与覆盖分子分母，
原M1/M2各exit1；进一步隔离证明R1当前issued after态应允许、R2去初始故障后可得到真实误恢复反例。
测试贡献counter、R1/R2限定返工，R3纠正回执算术/锚点；r2设计保持，不转Kimi，不代修生产迎合错误测试。
仅将GLM原始回执/日志和本席证据落回main文档；候选测试、coverage baseline未集成，完整质量门待返工复核后执行。
同步rework看板与生成索引后，文档工具20/20、400 Markdown/1,812本地链接/140卡检查及git diff --check通过。

### 给 Kimi（已完成，历史保留）

在 /Users/zhangxu/illegal/type-pal 审查 EDITOR-SAVE-RECOVERY-1 的 r2 设计，任务卡
docs/ops/tasks/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md，状态 draft，产品源码基线135d065a。
先同步分支并检查工作树，读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡、现行 project-lifecycle 规范及卡内锚点。
用户已批准“完整暂存后，中断则继续完成这次保存；外部冲突停止”，不要再问前滚/回滚产品选择。
请先独立读一手源码/规范并复跑 node --import tsx docs/ops/audits/pre-e2e/probe-editor-save-recovery.mjs，
不要读取或复述GLM席结论。重点压力测试目录内目标字节+原浏览器handle凭据、ready/issued/committed跨FSA与IDB间隙、
PAL/sandbox权限、原页retry与另一旧窗口、锁序、所有写入口及HTTP读门范围；HTTP缺失JSON目前会200HTML，不能吞错。
分别签有直接证据和可证伪观察的 premise verified/counter、design agree/counter，列阻断及可实施修订；
不改实现、不标build/done。仅写本卡“Kimi build前席位”和“Kimi r2交接日志”，不改GLM/共享结论/状态。
提交前同步并保留另一席落盘，提交推送；竞态自行rebase/retry，不让用户搬审查正文。完成后交Codex统一核定。

### 给 GLM（已完成，历史保留）

在 /Users/zhangxu/illegal/type-pal 审查 EDITOR-SAVE-RECOVERY-1 的 r2 设计，任务卡
docs/ops/tasks/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md，状态 draft，产品源码基线135d065a。
先同步分支并检查工作树，读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡、现行 project-lifecycle 规范及卡内锚点。
用户已批准“完整暂存后，中断则继续完成这次保存；外部冲突停止”，不要再问前滚/回滚产品选择。
请先独立读一手源码/规范并复跑 node --import tsx docs/ops/audits/pre-e2e/probe-editor-save-recovery.mjs，
不要读取或复述Kimi席结论。重点核SR-01～12逐项能否发现真实故障：每步close/IDB abort、空占位/删除/catalog超集、
完整封存前零作者IO、首次/clone/Save As整笔计划、各读入口和HTTP200HTML、dirty归属、清理/版本边界及证据数字口径。
分别签有直接证据和可证伪观察的 premise verified/counter、design agree/counter；不能把单测框架设想或多数通过当证据。
不改实现、不标build/done。仅写本卡“GLM build前席位”和“GLM r2交接日志”，不改Kimi/共享结论/状态。
提交前同步并保留另一席落盘，提交推送；竞态自行rebase/retry，不让用户搬审查正文。完成后交Codex统一核定。
