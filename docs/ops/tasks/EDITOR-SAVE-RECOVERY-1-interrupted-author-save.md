# EDITOR-SAVE-RECOVERY-1 - 编辑器保存中断恢复

Status: blocked
Phase: phase2
Capability: ops（审计 A-03，不新增能力格）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main
Revision: r1（2026-09-07，前提复核完成，待用户选择恢复目标后定案）
Evidence Baseline: 041c2fe1

## 当前阻塞与目标

用户要求按既定修复队列继续；本卡承接 A-03，不重开已验收的
[A-02 冲突保护](../archive/tasks/done/EDITOR-SAVE-CONFLICT-1-stale-author-snapshot.md)。
目标是：作者项目保存中断后，重新打开时能够恢复到明确的完整版本，不能把半写状态当作正常项目交给后续编辑。

当前关键产品选择尚未回答（已向用户提问，不把预选选项当批准）：

| 选择 | 恢复结果 | 对实现的影响 |
|---|---|---|
| **继续完成本次保存（Codex 推荐）** | 恢复这次已点击“保存”的完整修改；新人物及其场景引用一起落定 | 必须持久保留本次目标字节/删除意图，并可校验地重复完成 |
| 回到上次完整保存 | 放弃本次尚未完整提交的变化，恢复上一完整版本 | 必须保留旧字节；第一次保存没有旧版本时需另定明确结果 |

两种选择都要求检测外部修改，遇到冲突/损坏/身份不符时停止并保留证据，不能强制覆盖。
这是用户可见结果的选择，不让用户决定内部存储技术。**选择未定前不冻结详细方案、不开始实现、不请求设计签字。**
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
| 本任务目标 | 重新打开时先处理保存中断，再构建正常作者会话；恢复的完整版本按用户上述选择确定。 | A-03 台账 + 下方当前 API 复现；具体恢复目标 pending |

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

## 方案共同约束（不是已签实现方案）

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
8. 已绑定保存、首次保存、克隆/另存新目标的完整性与首次身份登记时机分别列清。用户选择恢复目标后再决定同卡覆盖范围，
   不把一条已绑定保存通过当作所有新建路径闭环。
9. 不擅增 content/SAVE 版本，不复活旧兼容链，不抢占 N6b 已规划的 content21。跨版本真实作者恢复输入不能借“开发档可弃”删除，
   版本切换前未完成保存的处理约束需要明确。
10. 清理仅限已验证的本次恢复记录/暂存路径，保留其他用户文件；失败时保留可恢复数据及可操作说明。

已查看 Node 迁移事务的提交/重放片段（`packages/migrate/src/migration-transaction.ts:225-265,334-361`）：
其依赖 renameSync/fsync 与仓库路径校验，只能提供思路，不能直接当成浏览器 FSA 的可用事务实现；本卡不改迁移器。
当前不预设把整个工程搬进“世代目录”，也不预设仅靠浏览器缓存保存唯一恢复副本；存储布局/信任凭证要在产品目标明确后定案。

## 后续验收框架

- 定向先红后绿：合法新人物＋场景引用跨文件保存故障；新会话不依赖旧 ref，按已选目标恢复后可打开/继续编辑/保存。
- 故障矩阵：准备记录失败、各 close 前/后、catalog 两次写入、manifest、删除、提交标志、清理；恢复自身再中断；
  缺记录/坏哈希/错误目录/外部修改/权限丢失须拒绝且不损坏额外文件。
- A-02 旧窗口拒写、同 W 重开、首存恢复证据保持；不能降覆盖率或改旧探针凑绿。
- 原生浏览器专用目录做最小功能，普通/沙盒/PAL 权限边界分别核；不操作用户真实工程制造故障。
- 完整 R4 另登记跨页/重开/试玩链，未执行不得写成完成；不重复剧情观感巡检。

## 推进签字

### build 前

- Codex：**premise verified（2026-09-07）**。直读当前 writer/open/author-baseline 与规范，当前 API 探针复现半状态，原页重试正控成立。
  design：pending（恢复目标待用户决定，详细方案尚未冻结）。
- Kimi：pending。
- GLM：pending。
- 独立非 Owner 前提复核：待后续两席直接取证。
- 缺签豁免：无；build 准入：blocked。不得因用户要求继续或任一旧任务签字而实现本卡。

### done 前

- Codex：pending。
- Kimi：pending。
- GLM：pending。
- done 准入：blocked；尚未实现。

## 交接日志

- 2026-09-07 Codex：同步 041c2fe1 洁净树，复核 A-02 后的 A-03。新增内存当前 API 探针，旧探针/产品/正式测试未动；
  新 loader 丢失待写人物定义、原页重试可修复，定位为持久恢复缺口。相邻 86 项通过。
  已向用户询问恢复本次修改或回到上次完整保存；未把预选选项当回答。暂停详细方案与实现，产品目标确认后再给 Kimi/GLM 并行设计提示词。
  当前 API 探针最终 exit 0；文档工具 20/20、400 Markdown/1,812 本地链接/140 卡检查与 git diff --check 通过。
  packages/scripts/锁文件与原探针零改动；本轮未跑完整 check/coverage，也未声明任何恢复实现已经完成。

## 下一位 Agent 提示词

无下一位 Agent 提示词，等待用户确认恢复目标。确认后由 Codex 完成同一任务卡的设计，再同时给出 Kimi/GLM 的独立前提/设计审查提示词；
当前不要求两席为未定目标签字，不标 build/done。
