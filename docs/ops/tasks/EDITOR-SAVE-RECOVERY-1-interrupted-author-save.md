# EDITOR-SAVE-RECOVERY-1 - 编辑器保存中断恢复

Status: build
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

无下一位 Agent 提示词：本卡继续由 Codex 实现，当前不交终审、不请求重复设计签字。

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

当前由 Codex 按已签 r2 实现与自验证；以下设计提示词为历史记录，无需重复转发/重签。实现候选冻结后再给两席终审提示词。

### 给 Kimi（与 GLM 并行）

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
