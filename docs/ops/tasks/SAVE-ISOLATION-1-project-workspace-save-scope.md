# SAVE-ISOLATION-1 - 工程与工作区存档隔离

Status: review
Phase: phase2
Capability: X1（审计 A-01 修复，不新增能力格）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main
Revision: r2（2026-09-07，实现与自验证完成，待 Kimi/GLM 并行独立终审；设计不重签）
Evidence Baseline: c09fbfa9
Implementation Baseline: 68d84d68
Implementation Candidate: 526eea00（对比 68d84d68；后续登记提交仅文档）

## 目标与边界

不同工程不能互相覆盖快速、自动、手动存档；存档列表、缩略图、计数与载荷必须使用同一隔离身份。
本卡处理审计 A-01，不重开 X1 历史验收，不合并成整个存档系统重写。
坏载荷预检另见 [SAVE-PREFLIGHT-1](../archive/tasks/done/SAVE-PREFLIGHT-1-current-save-restore-preflight.md)。
2026-09-06 用户在“开发基线与评审沙盒是否各自独立存档，建议独立”的选择后回复“按照你推进的推进”，
按该推荐确认独立策略；不是缺签豁免，也不是其他审计缺陷的整组实现授权。

- 范围内：存储命名空间、运行壳与编辑器全部试玩入口的身份传递、存储事务必要收尾、真实 IndexedDB 读写回归。
- 范围外：编辑器作者文件写盘（A-02/03）、第一阶段存档、云存档、存档 UI 重设计、D-05 技能试放状态策略。
- 不修改 SAVE8/content20 载荷形状、工程 manifest 或迁移产物；不新增旧键双读/双写或静默迁移。
- 不删除用户浏览器数据库；旧开发存档如何退出当前读取域必须在最终方案中明示，不将清库当作实现捷径。

## 前提真值门

### 一句话前提

当前同源两个合法工程的存档 writer 都使用同一个数据库和 slot key；载荷中的 projectId 只防止错读，不能防止覆盖。

| 维度 | 真值 | 一手证据 |
|---|---|---|
| 原版 / primary source | 原版单游戏槽位不能决定编辑器多工程身份。IndexedDB 对象仓库中同键记录唯一，put 的正常覆盖由键决定，不检查应用载荷 projectId。 | [IndexedDB §2.2](https://w3c.github.io/IndexedDB/#object-store-concept)、[§6.1](https://w3c.github.io/IndexedDB/#object-store-storage-operation) |
| 第一阶段 | 单游戏使用 `type-pal/save-slots` 和数字槽；它没有现代编辑器工作区身份，不能直接照搬。 | `packages/game/src/core/save/indexed-db.ts:16`、`:64`；`packages/game/src/core/save/api.ts:14` |
| 当前二阶段 | 固定 `type-pal-saves`、三 store 均以 slotId 写入；main 无参数创建 Store。 | `packages/reforge/src/save/store.ts:34`、`:60`；`packages/reforge/src/main.ts:584` |
| 当前试玩身份 | 按本地 workspaceId 查记录并核对 projectId、解析目录句柄后，只把 project 传给 bootGame；该身份尚未传给 SaveStore，URL UUID/record.workspaceId 的额外一致性检查不能冒称当前已有 | `packages/editor/src/play.ts:33`、`:45`、`:53`；`packages/editor/src/core/handle-store.ts:7`；`packages/editor/src/core/play-workspace.ts:3` |
| 未绑定目录的编辑会话 | App 仅在 dirHandle 存在时传 workspace 到 URL；未绑定 PAL/沙盒走显式 HTTP，但其 WorkspaceContext 已有 identity；直接以是否有句柄选存档空间会割裂首存前后进度 | `packages/editor/src/ui/App.tsx:574-576`、`:1740`；`packages/editor/src/main.tsx:75-92`；`workspace-context.ts:107,227` |
| 身份连续性 | PAL HTTP 基线取可信 sentinel 的 UUID；沙盒首存写既有 marker；正常本地重开由 marker/句柄绑定找回 identity，不由试玩页新造 UUID | `workspace-context.ts:134,238`；`workspace-persistence.ts:720-751`；`handle-store.ts:121-144,184` |
| 本任务目标 | 不同工程、同工程的不同工作区均隔离；同工作区从 HTTP 预览到绑定目录及保存重开连续使用自己的空间 | 用户上述明确选择；本卡 r2 映射与反例矩阵 |

### 直接复现（2026-09-06）

运行 `node --import tsx docs/ops/audits/pre-e2e/probe-save-boundaries.mjs`：
A 先写 quick，B 后写 quick；两个真实 IndexedDbSaveStore 都打开 `type-pal-saves@1`，
meta/payload/thumb 都写 `quick`；A 读出的 projectId 从 A 变为 B，随后 A 的 preflight 拒绝 B。
探针只替换 IndexedDB 外围为内存边界，并在启动时拒绝既有真实 IndexedDB；没有写用户数据库。
探针附带的 A-04/05/06 第一阶段观察不属于本卡修复范围。

r2 在 `c09fbfa9` 复跑原探针：A-01 再次输出两个 `type-pal-saves@1`、六次同 quick 键写入，
`oldAOverwritten=true / AReadNowRejected=true`。随后脚本在已修复的 B-04/U-01 旧假设处抛
`CurrentSaveStructureError`，全脚本 exit 1；**只确认已完成的 A-01 观察，不把该退出码说成全探针通过**。
原探针与所有产品/配置未改，没有碰用户真实 IndexedDB。

### 反证与替代解释

- 最强替代解释：projectId 校验已经隔离存档；不同端口自然隔离。前者只防错读，后者确实成立但不覆盖编辑器同源试玩。
- 可证伪观察：若真实同源、相同 slot 的 A/B 写入采用不同存储地址且 A 的载荷/元数据/缩略图保持不变，则 A-01 前提失效。
- runtime 分类：根因位于存储键与入口身份传递，不是 scene、entry 或 script 分类。
- 原版理解：原版/一阶段单游戏不定义现代多工程共用策略，不以原版槽位数推导命名空间。
- 提取/解码：用两个内存构造的合法工程即可复现，与 PAL 提取或迁移无关。
- 审计模型：键由真实 store 选择，桩只执行按数据库/store/key 寻址；仍须 build 期以真实浏览器 IDB 复验。

### 用户裁决（2026-09-06 已确认）

采用：**同一工程的不同工作区各自保存试玩进度；同一工作区重开仍使用自己的存档。**
代表：PAL 开发基线和 `ui_samples` 评审沙盒即使 manifest.id 都为 pal，也互不覆盖。
未保存会话已有 UUID 时沿用该 UUID；保存为工作区时保持既有身份。不为试玩另造随机 ID。
未保存且没有持久身份的会话在刷新后本来就不是同一已保存工作区；不新增持久化侧车/身份注册系统。

`before -> after`：同源共用槽 → 独立运行按工程隔离，编辑器试玩按工程 + 当前工作区隔离。
这是用户对上一条推荐的明确继续指令，不从先前异步选项的预选状态推导批准。
产品阻塞解除，进入 draft；下方 r2 方案须经三席前提/设计签字后才允许实现。

补充裁决（用户，2026-09-06，r2 评审过程中）：

- 现有开发存档没有需要保留的进度，**可以全部作废，不做迁移、恢复或旧档兼容**；新隔离空间可以从空档开始。
  沿 r2 保持旧未分区库不读不迁，无需另做清库功能；本次没有实际删除数据库。
- 主要目标是**发布后玩家游玩不同工程时，正常保存不会覆盖其他工程进度**。按工程 ID 选择存储读写空间，
  并校验归属；不是只在覆盖发生后拒绝读取。开发试玩再加既有工作区 ID，维持已确认的副本隔离。
- 发布工程 ID 应代表稳定作品身份；不同工程使用不同 ID，不以显示名或每次发布的版本号作身份。
  不在本卡扩展全局 ID 分配系统、重命名工程或跨源/跨账户存档服务。
- “开发旧档可废弃”**不适用于未来正式用户存档**，也不是删除其他应用/一阶段数据的授权；正式发布后的
  格式兼容政策另定。该补充确认 r2 已有边界，不改变存储方案，不重开正在进行的设计签字。

## r2 方案：身份、入口、存储三处闭合

### 1. SaveScope 是运行入口参数，不是存档格式字段

- 新增 `packages/reforge/src/save/scope.ts` 的只读判别联合：
  `{ kind: 'project', projectId }` 与 `{ kind: 'workspace', projectId, workspaceId }`；所有 id 非空白字符串，
  拒绝空白但不修改有效值（与现有 manifest 非空白合同一致）；不 trim/lowercase/截断，
  不用数组位置、目录显示名、场景编号作身份。
  验证器只接受对应 variant 的字段；不能把夹带 workspaceId 的 project 分支或未知 kind 静默归到共享空间。
- `bootGame(project, saveScope)` 的第二参数必传，经 `index.ts` 导出其类型。入口验证 scope 与
  `project.manifest.id` 一致，且存储实例创建前完成；无默认共享 scope，不让漏接调用静默成功。
  boot 只接收已解析参数，不自行解析编辑器 URL/读取 handle-store/猜 workspace。
- Store 构造器必传 scope，立即校验并拷贝其标量、固定数据库名，不保留可被调用方后续修改的身份对象。
  putSlot 也检查 payload.projectId 与绑定工程一致；完整载荷合法性仍归现有 preflight，不复制第二套世界校验器。
- 不改 CurrentSavePayload/SaveMeta、SAVE8/content20、30 槽布局或同工程多个 entry 的存档浏览规则。

### 2. 内容来源与存档归属分开传递

编辑器 `core/play-url.ts` 建立必填 `EditorPlayIdentity { projectId, workspaceId, source: 'http' | 'local' }`，
替换只有 optional workspace 的 URL 构造合同。App 从当前 WorkspaceContext 提供 workspaceId；
是否有绑定句柄仅选择 source，不决定存档 identity。所有试玩链接统一经该 helper 生成。

| 入口 | 读工程方式 | 传给 bootGame 的 SaveScope |
|---|---|---|
| 独立 reforge boot.ts | 当前 loadRunnableProject | project + 已加载 manifest.id |
| 编辑器本地试玩 `project=P&workspace=W` | resolvePlayWorkspaceRecord → 权限 → FSA loader，既有 identity 校验保持 | workspace + 已加载 manifest.id + record.workspaceId |
| 编辑器未绑定目录的试玩 `project=P&save-workspace=W` | 既有显式 HTTP loader，不假装有 FSA handle | workspace + 已加载 manifest.id + 当前 WorkspaceContext 的 W |
| 手工显式 HTTP `project=P`（无两种 workspace 参数） | 既有 HTTP dev 路径 | project + 已加载 manifest.id |

- `workspace` 仍**只代表本地内容句柄**，无效/丢失必须拒绝，不回退同名 HTTP；`save-workspace`
  只选择存档空间，不授予文件读取权，不查不存在的目录句柄。两键互斥，任一空值/重复/非法值拒绝，
  `project` 缺失/重复也拒绝；不能把 `workspace=` 当“没有 workspace”。
- 编辑器 URL 构造/解析复用 `workspace-context.ts` 的 `isWorkspaceId`，不再写第二份 UUID 正则。
  本地 record 必须与请求的 workspaceId、projectId 一致，实际加载 manifest 继续校验；失败在存储创建前收口。
  无新注册表/侧车文件；SaveScope 在引擎中只把工作区 id 当不透明字符串，不反向依赖 editor 包。
- W 在未绑定 HTTP → 首存绑定 FSA → 重开全过程不变，因此数据库空间不变；另存/复制是否换 W
  沿既有 workspace-persistence/handle-store 合同，不在本卡重定义或静默修复复制身份冲突。
- 这不是安全 ACL：同源代码本来能访问 IndexedDB。URL 参数是显式运行上下文，不能据此宣称跨用户鉴权。
- 覆盖 App 场景试玩、PreviewCanvas、敌人/敌队、技能、商店；以及 DataMode、SceneScriptWorkspace、
  ScriptDrawer 的中间 props。为试玩增加/传递专用 playIdentity，不全局替换 workspaceId：
  **DataMode:424 的预览缓存 projectKey、编辑器导航存储等非试玩用途不借机改动**。
- 不改变当前“试玩只读已保存/HTTP 内容”的规则、未保存提示或内容刷新策略。场景/pos/facing/entry/battle/skill
  参数原样保留，不顺手修 D-04 技能固定入口或裁决 D-05 临时状态保存策略。
- `shop-trial.ts` 的参数白名单只补允许 `save-workspace` 这一身份元信息；独立试买仍在 bootGame
  创建 SaveStore/世界前分流，继续零存档读写，不因新增参数实例化存储或放开 scene/battle 等原禁用参数。

### 3. 每个 scope 一个数据库，三块同域

- 新库名由固定有序元组生成：`type-pal-saves:` + `JSON.stringify(['project', P])` 或
  `JSON.stringify(['workspace', P, W])`。不用分隔符裸拼/哈希截断，避免 id 含分隔符时碰撞。
  DB_VERSION 仍为 1，meta/payload/thumb 三个 store 及其 slotId 键不变；listMeta/getPayload/getThumb/putSlot
  全部访问构造时绑定的库，不靠 UI 过滤别人存档掩盖共用 writer。
- 同工程不同 entry/scene/战斗入口不分库；同工作区普通试玩/试打/试放不再另分空间，D-05 的临时状态
  是否禁存/隔离仍另行裁决。内容版本、页面地址、随机会话号不进入 namespace。
  同一浏览器存储域内，project scope 与 workspace scope 也互不覆盖；跨源不承诺共享。
  库名身份与事务边界依据 [IndexedDB database](https://w3c.github.io/IndexedDB/#database-concept)
  与 [transaction](https://w3c.github.io/IndexedDB/#transaction-concept) 合同。
- `savedTimes` 及缩略图/菜单快照继续由同一个绑定 Store 的 listMeta 派生，主菜单、F9、自动/手动保存
  均复用它；不新增独立全局计数器或每个入口各造存储。
- 保持三 store 单事务、成功以 oncomplete 为界；补 onabort 拒绝（当前 store.ts:66–67 仅有 complete/error），
  请求入队同步抛错时中止事务，不能部分成功或永远 pending。meta/payload 的克隆准备与工程绑定检查先于写入，
  防止输入在 open 等待期间变化；Memory 实现也先完成克隆/校验再改 Map。
  这只是薄 Store 写入合同，不建立跨数据库事务、提交后通用回滚、自动重试或任意磁盘故障恢复框架。
- 无 IndexedDB 的既有 Memory 降级保留，但也必传 scope/校验工程；内存实例不承诺跨刷新持久，
  不新增全局跨 scope 缓存。IndexedDB 报错不偷偷改走 Memory 伪装保存成功。
- 旧未分区库 `type-pal-saves` **物理保留，但不自动读取、分配或搬入新 scope**；其记录无法证明原工作区。
  不删库、不加旧键 fallback/双读/双写、不升级存档格式。当前版本 checkpoint 仍可经已有 e2e-load
  显式恢复，之后保存进入本次 scope；不是自动旧库迁移，也不承诺新增导入 UI。

## 实施边界与验证工具

Coding Owner 保持 Codex。可在一张卡内先闭合 scope/Store，再接齐入口，最终按一个候选审查；
不让多位 Owner 并行改实现。GLM 负责独立矩阵/范围审查，Kimi 负责架构与边界审查。

- runtime 文件面：新增 save/scope.ts 及测试，store.ts/测试、main.ts、boot.ts、index.ts、shop-trial.ts/测试；
  现有 Memory 构造及 bootGame 的测试调用同步显式传 scope，不改无关业务断言。
- editor 文件面：core/play-url.ts、play-workspace.ts、play.ts；App、DataMode、SceneScriptWorkspace、
  ScriptDrawer、PreviewCanvas、EnemyTab、EnemyTeamTab、SkillTab、ShopTab 的纯身份接线及相应测试。
  不改组件样式/尺寸/布局、工作区 marker/handle DB schema、内容加载器版本或作者保存算法。
- 测试工具：拟在 reforge **devDependencies** 精确加入 `fake-indexeddb@6.2.5`（含类型，当前 Node 22 满足
  其 >=18 要求；[包清单](https://raw.githubusercontent.com/dumbmatter/fakeIndexedDB/master/package.json)）。
  只用独立 IDBFactory 注入 Store，每例隔离；不全局 import auto，不作为产品 polyfill 或真实浏览器替身。
  package.json/pnpm-lock 仅此依赖，覆盖率基线只经 ratchet 自动提高，不手填/降指标/缩范围。
- 开发期必须另做一次隔离浏览器真实 IDB 最小验证；Node 模拟库只用于确定性单元测试，不宣称等价所有浏览器行为。
  不新增整套浏览器 coverage/通关 runner，不写用户实际槽，不为本卡重复走剧情。

范围外问题若暴露先登记，不借白名单扩成编辑器生命周期或整组存档改造；新关键前提不成立即停线修订。

## 上下文锚点

- [READ-FIRST](../../phase2/READ-FIRST.md) 第 5/8/9/11 条；不使用数组下标身份、不擅改存档界面、不复活旧兼容链。
- [一阶段知识收获 X9](../../phase2/reference/phase1-knowledge-harvest.md#x9-存档版本化迁移--读档归一化)：作为历史经验，不把其中旧“已完成”代替本轮证据。
- [数据安全审计 A-01](../audits/pre-e2e/README.md#a-01--不同项目的快速自动存档会互相覆盖)。
- `packages/reforge/src/save/types.ts:10`：auto/quick/m01..m28 与 30 槽 UI 合同保持。
- `packages/reforge/src/boot.ts:9`、`packages/editor/src/play.ts:33`：独立壳与本地试玩入口须分别覆盖。
- `packages/editor/src/core/workspace-context.ts:95`、`packages/editor/src/core/handle-store.ts:156`：复用已存在的持久工作区身份，不另造临时 ID。
- `packages/reforge/src/save/store.test.ts:40`：现有主要测试仅覆盖 MemorySaveStore，不能作为 IDB 隔离证明。

## 验收矩阵（r2；设计已签，以下为实现终审合同）

| 情况 | 必须验证 |
|---|---|
| A/B 工程同源同槽 | 各自 payload、meta、thumb、列表与存档次数不串；quick/auto/m01 覆盖，并检查其余槽列表仍为既有 30 槽合同 |
| 同工程同工作区重开 | 重新实例化 Store / 同浏览器域刷新后读回原值，稳定身份不因页签/运行编号变化 |
| 同工程不同工作区 | PAL 基线/沙盒 W1/W2 任意交错保存不互相覆盖；三块与 savedTimes 各自正确 |
| 同 W、HTTP → FSA 首存绑定 | URL 读取路由可变，存档 tuple/库名不变，绑定前保存的测试进度仍在 |
| 未绑定目录的沙盒 | URL 带自己的 save-workspace，不误用 PAL 基线空间；不谎称未保存内容已进入试玩 |
| 所有试玩链接 | 场景、PreviewCanvas、敌人/敌队、技能、商店及中间 props 均传当前 playIdentity；不漏一条旧 optional 构造 |
| 同工程多入口 | 不按 entryId/sceneId 分库，不破坏主线/DLC 同工程存档浏览合同 |
| project scope 与 workspace scope | 同 P 仍不相撞；分隔符/Unicode id 序列编码唯一，scope 入参被外部改动也不改变已绑定地址 |
| 非法/缺失工作区 | 非法/空/重复/互斥参数、记录缺失/错 W/错 P、实际 manifest 不一致均失败；不打开存档库、不退 HTTP；无 workspace 的明确 HTTP 入口仍可用 |
| Store/boot 工程不匹配 | scope 与 project、payload 不一致在副作用前拒绝，已有三个 store 与旧活动态不被覆盖 |
| 部分写失败/事务 abort | 成功只在 complete；abort/error/同步克隆或入队异常拒绝且不半写，原好槽保留；不创建通用回滚框架 |
| Memory 与 IDB 不可用 | Memory 深拷贝/绑定工程，明确非持久；IDB 写错不能假成功或静默切内存 |
| 独立试买 | 新身份参数可解析，仍不创建 SaveStore/不写任何存档，其他原禁用参数仍拒绝 |
| 旧未分区开发键 | 预置旧库后新 scope 初始为空，旧库三块原值保留；不静默回读、搬迁或清库 |
| 已有 SAVE-PREFLIGHT-1 / checkpoint | 坏档仍拒绝且旧状态可用，合法当前同工程快照可显式恢复；保存写进选定 scope，不需要 payload 新增 workspace 字段 |

要求新的 scope/key 纯函数尽量 100% 分支，真实 store 与入口接线有独立回归；全仓覆盖率只升不降。
功能性最小浏览器验证由 Codex 用专用测试 origin/数据库执行，不破坏现有用户存档。
多工程 checkpoint 与刷新恢复登记到 R4/Q1；不要求用户运行故障注入或技术对账。

验证顺序：scope/URL/Store 单元与真实调用链反例先红后绿 → editor/reforge typecheck → 完整 check →
单次严格 fast（新增范围由 ratchet 先比较旧基线、零下降才更新）→ 更新后严格验证 → 隔离浏览器最小功能。
重型检查不并跑，不取多数；每次留候选 SHA、范围、命令/退出码与失败栈。IDB 原子性以真实事务测试与浏览器
对照证明，不用自己手写一个“保证成功”的 Map 代替。新增模拟库只是可重复单元工具，不替代 dev-functional。

最小功能：同一隔离浏览器 origin 打开 P/W1、P/W2 及 Q，分别保存可区分进度；回到各页用正式读取入口核
位置/金额/槽元信息/缩略图与计数，刷新重开仍各自正确；验证同 W 从 HTTP 到本地来源的地址连续性与坏身份可见拒绝。
只用专用工程/存储，视觉无变化的正常画面不重复截图；R4/Q1 扩展为可执行连续链，不能以 toast 代替状态断言。

## 推进签字

### 进入 build 前

- Codex：**premise verified / design agree（2026-09-06，r2）**。
  直接读 `store.ts:34/44/60` 与 W3C database/object-store/transaction 合同，复跑 A-01 同库同键覆盖；
  直接读 `App.tsx:576`、play.ts、WorkspaceContext/handle-store 与全部六类 URL 消费，确认未绑定目录也
  有身份且不能据 source 改 namespace；用户已选择各工作区独立。支持显式 SaveScope/无碰撞库名、
  读取来源与存档身份分责、必填 UI 接线、旧库留存不自动归属及 r2 矩阵。未把模拟库或历史 U-01 退出当实际浏览器通过。
  可证伪观察：同 P/W 首存前后名字变化、遗漏任一试玩 URL、错误身份仍触发 Store、三块/计数跨域、
  旧键自动回读或独立试买创建存储——任一反例即 counter，不能以保存后再拒读冒充隔离。
- Kimi：**r2 premise verified / design agree（2026-09-06，基线 c09fbfa9；全部证据本人直读/复跑，未读 GLM 签字）**。
  - **同库同键缺陷**：直读 `store.ts:34`（固定 `type-pal-saves`）、`:60-65`（三 store 一事务按 slotId 写、
    仅 oncomplete/onerror **无 onabort**——事务收尾缺口属实）、`main.ts:586`（无参构造、IDB/Memory
    二选一）；全仓唯一生产构造点、唯一库名出现处（grep 实证）。本人复跑 probe-save-boundaries：
    两个真实 IndexedDbSaveStore 均开 `type-pal-saves@1`、六次同 `quick` 键写、
    `oldAOverwritten=true / AReadNowRejected=true`——A-01 成立；脚本随后在已修 B-04 旧假设处
    抛 CurrentSaveStructureError，与卡面一致，不当作全探针通过。
  - **身份连续性**：PAL 基线 workspaceId 取自可信 sentinel（workspace-context.ts
    createPalDevelopmentWorkspaceContext）；沙盒由 `sandboxMarkerFor` 首存写 marker；
    重开经 workspace-persistence.ts:720-751 按 record/marker/句柄 isSameEntry 绑定找回既有
    identity，不新造 UUID；handle-store 主键 workspaceId、冲突登记拒绝。同 W 从 HTTP 到 FSA
    全过程 identity 不变 → per-scope 库名不变，方案 2 的连续性主张成立。
  - **未绑定会话割裂**：`App.tsx:576` 仅 dirHandle 存在才发 workspace 参数；`main.tsx:75-92`
    每个会话都有 WorkspaceContext（PAL sentinel/沙盒/本地）。身份存在但未传递——前提第 41 行
    「以句柄有无选存档空间会割裂首存前后进度」属实，r2 用 `save-workspace` 参数闭合是正确层。
  - **入口完备性**：bootGame 调用方恰为 boot.ts:11 + play.ts:36/48（grep 全仓）；
    六个试玩链接点（App:1740、PreviewCanvas:441、EnemyTab:912、EnemyTeamTab:416、
    SkillTab:1120、ShopTab:184）全部经同一 `playProjectQuery`——helper 换合同后可穷举核查，
    入口表无漏项。`play-workspace.ts:3` record 校验与 manifest 身份断言直读在案。
  - **独立试买**：`main.ts:350-354` 在 SaveStore 创建（:586）前分流；shop-trial.ts 全文零
    SaveStore/indexedDB 引用；参数白名单当前为 project/workspace/shop-trial/money——方案
    只补 `save-workspace` 身份元信息即可，零存档合同保持。
  - **旧库边界**：`type-pal-saves` 字面量仅 store.ts:34 一处；物理保留+不自动读/迁/清、
    显式 e2e-load 退出路径与铁律 11（无双读双写/兼容 fallback）一致；旧共享档从新 scope
    不可读是方案明示的用户可见后果，dev 期且用户已批方向，可接受。
  - **基线复跑**：reforge 保存/试买 4 文件 17 项、editor 试玩/句柄 4 文件 13 项、
    workspace-persistence/open-actions 2 文件 42 项 = 10 文件/72 项本人实跑全绿；
    store.test.ts 零 IndexedDbSaveStore 引用（IDB 隔离确无既有证明）。
  - **设计同意**：SaveScope 判别联合（非空白不修剪、拒绝夹带/未知 kind）、bootGame 必传且
    存储创建前校验、Store 绑定标量拷贝、putSlot 查 payload.projectId——层次正确无下标身份；
    `JSON.stringify` 有序元组库名对任意分隔符/Unicode id 无碰撞（元数+前缀+转义）；
    workspace/save-workspace 互斥与严格拒绝、isWorkspaceId 复用、内容来源与存档归属分责；
    per-scope DB 同版本三 store、savedTimes 由绑定 Store listMeta 自然按域计数；
    onabort 拒绝+入队同步异常中止+克隆/绑定先于写入（薄写合同，不建通用回滚）；
    DataMode:424 预览缓存 projectKey 排除合理（非存档用途）；fake-indexeddb 仅 dev 依赖、
    单例注入、真实浏览器最小补验——不冒充等价浏览器行为。边界无过度扩张，无漏项。
  - **可证伪观察**（任一反例即 counter）：① 同源同槽 A/B 写入不同地址且 A 三块完好 → 前提倒；
    ② 任一试玩 URL 缺身份或未绑定会话落 project scope → 接线漏项；③ 同 W 首存前后库名变化 →
    连续性断；④ abort 注入下 promise 仍 pending/半写 → 事务收尾未闭合；⑤ 试买带 save-workspace
    实例化任何存储 → 零存档破；⑥ 任何新代码读/迁/分配旧库记录 → 边界破（库名字面量 grep 应仍唯一）；
    ⑦ savedTimes 不经绑定 Store listMeta 派生 → 跨域泄漏。
  - 返工项：无。非阻断备注：savedTimes 由共享全局变为按 scope 计数是隔离的固有预期后果，
    验收矩阵已覆盖；build 期浏览器最小验证须含同 W HTTP→FSA 库名恒等断言。
- GLM：**premise verified / design agree（2026-09-06，r2，独立数据/矩阵审查；全部证据本人直读/亲跑，
  未读取 Kimi 签字内容——其签字于本人审查中途落地，本人仅确认席位位置）**。
  独立证据：
  - **A-01 本人复跑**（洁净树 `c09fbfa9`+方案提交）：探针输出两个 `type-pal-saves@1`、六次同
    `quick` 键三 store 写入、`oldAOverwritten=true / AReadNowRejected=true`；脚本随后在已修
    B-04/U-01 旧假设处 exit 1（CurrentSaveStructureError）——只计 A-01 已输出观察，不称全探针通过。
  - **store.ts 直读**：`DB_NAME='type-pal-saves'` 固定（:34）、三 store 均以 slotId 为键、构造无
    scope；putSlot 仅 `oncomplete/onerror`（**无 onabort**，方案补强为真实缺口非冗余）；Memory 有
    克隆但无工程/scope 绑定；`savedTimes` 由 `saveStore.listMeta()` 派生 + 三 store 原子事务成功后
    单调推进（main.ts:5612-5625）——计数隔离随 store 绑定自动成立，无需全局计数器。
  - **入口链直读**：main.ts:586 Store 无参创建；boot.ts 独立壳 `bootGame(await loadRunnableProject(...))`
    单参数；play.ts `!workspaceId` 把**空 `workspace=` 当无 workspace 走 HTTP**（方案明令修复的现状确认）、
    无重复/互斥参数检查；`resolvePlayWorkspaceRecord` 校验记录存在 + projectId 一致 + manifest 二次校验；
    parseShopTrialParameters 白名单 `project/workspace/shop-trial/money`，未知键即抛——
    `save-workspace` 未加白前试买链接会**响亮失败**（不会静默丢身份），shop-trial.ts 改动必须与
    链接改动同候选落地（方案已如此安排）；runShopTrial 在 bootGame 最前分流返回（main.ts:349-355），
    早于 Store 创建——独立试买零存档读写保持。
  - **试玩链接全量枚举（本席独立 grep + 逐点直读）**：`play.html` 构造恰 7 处——App:1740（场景+spawn）、
    PreviewCanvas:441（+pos）、EnemyTab:912、EnemyTeamTab:416、SkillTab:1120、ShopTab:184（+shop-trial/
    money）+ 共享 helper play-url.ts；中间 props 载体恰为 DataMode（→Enemy/EnemyTeam/Skill/Shop 及
    :424 预览缓存 projectKey）、SceneScriptWorkspace（:224-225）、ScriptDrawer（:1089-1090）。与方案
    editor 文件面 12 文件**一一对应，未发现清单外构造点，也未发现清单内遗漏**。DataMode:424
    `${manifest.id}:${workspaceId??''}` 预览缓存键为非试玩用途，方案明令不动 ✓。
  - **身份连续性直读**：App:575 `dirHandleRef.current ? workspaceId : undefined`（未绑定会话当前
    无存档身份——A-01 未绑定分支根因）；workspace-context isWorkspaceId=UUID 正则（:70）、PAL 基线
    sentinel.workspaceId（:238）、沙盒 marker；handle-store 登记锁 + 一句柄一身份 + 记录一致性
    （:121-144）；workspace-persistence :720-751 重开经 marker/句柄找回 identity、不新造 UUID；
    main.tsx:75-92 PAL sentinel/ui_samples 沙盒上下文在未绑定期已有 identity。方案"未绑定→首存绑定→
    重开 W 不变"与源码一致。
  - **真值矩阵其余行**：一阶段 game `DB_NAME='type-pal'` + 数字槽 1..5（api.ts:14 MAX_SAVE_SLOTS=5）、
    无工作区身份 ✓；reforge types.ts ALL_SLOT_IDS auto/quick/m01..m28 30 槽合同 ✓ 不改；
    fake-indexeddb 当前 0 处于 pnpm-lock（未安装，与"仅列入待审方案"相符）。
  design agree：SaveScope 为运行入口参数而非载荷字段（保 SAVE8/content20 零变化）；库名
  `JSON.stringify(['project',P]) / ['workspace',P,W]` 元组编码对分隔符/Unicode 唯一；内容来源
  （workspace=）与存档身份（save-workspace=）分责 + 互斥/空/重复拒绝；旧库物理保留不读不迁
  （符合 READ-FIRST 11 开发期不背兼容）；Memory/IDB 事务收尾补强；测试依赖仅 devDependencies +
  真实浏览器 dev-functional 补验。
  可证伪观察：(1) 若存在本席枚举之外的 play.html 构造点或某链接漏传 playIdentity，"所有试玩链接"
  行失败；(2) 若出现 shop-trial 白名单与链接改动分离的中间提交，未绑定试买将响亮失败——review 时
  核候选单提交闭合；(3) 若 savedTimes 实现引入任何跨 store 全局计数，计数隔离行失败（当前派生
  机制已按 store 隔离）；(4) 若同 W 从 HTTP 到 FSA 首存绑定后库名元组变化，连续性行失败；
  (5) 若 `workspace=` 空值仍落入任一内容路径而非拒绝，互斥行失败。
  非阻断备注：(a) 一阶段证据行的"`type-pal/save-slots`"措辞把 DB 名（'type-pal'，indexed-db.ts:16）
  与 store 命名混写，行结论（单游戏/数字槽/无工作区身份）本身经本人核实无误；(b) per-scope 每库
  一档会使源内 DB 数量随工作区增长，受浏览器逐源配额/清除策略影响（如 Safari ITP），属开发期
  预期非本卡范围；(c) boot.ts 独立壳在方案入口表有行、矩阵未单列，与"A/B 工程同源同槽"同机制，可接受。
- 独立反证审查：Kimi / GLM 均已直读规范、实际 Store/所有入口与身份连续性源码，并复跑 A-01；证据见各自席位。
- 缺签豁免：无。
- build 准入结论：**allowed（Codex，2026-09-06）**。用户确认“签了”后，同步 `dd940563`、工作树干净，
  核 `96cbf574` / `ce2a2ef3` 两席 r2 均 premise verified + design agree，无 counter；用户旧开发档可弃的
  补充未改变 r2 方案。Codex 为唯一 Coding Owner，按已签文件面开始实现，不代签、不提前标 done。
  非阻断措辞澄清：每 scope 一库、每库仍为既有 30 槽，并非“每库一档”；不改既有槽位合同。

### 进入 done 前

- Codex：**accept（2026-09-07，Coding Owner 实现者自测，非独立终审）**。
  按 r2 接齐所有六类试玩 URL 与独立运行壳；Store 绑定不可变身份、三块同库、克隆准备/abort/错误拒绝，
  无格式/界面变化。定向 reforge 141 项、editor 110 项；完整 check 542 文件/6,327 项通过；
  ratchet 先比较旧基线后仅提升，随后一次严格 fast 610 个生产文件/5,842 项精确通过。
  最终 18 项隔离测试只替换成基线 Store 源码时 14 红/4 绿，完整实现 18 绿；无共享树回退。
  隔离 Chrome 的正式 F5/F9、HTTP→真实 FSA handle、刷新及三块/计数验证通过，边界与日志见下。
  原探针、SAVE8/content20、DataMode 非试玩缓存键和产品样式零改动；Q1 导出钩子既有误接仅另登缺陷。
  若两席发现遗漏入口、身份割裂、半写/悬挂或证据不符，仍须 counter/rework，不能以本席自测替代审查。
- Kimi：**accept（2026-09-07，独立终审候选 `526eea00` 对比 `68d84d68`；r2 不重签；未读 GLM 本轮结论）**。
  接手 HEAD `a032c764` 与 origin/main 一致，候选后产品/脚本/锁文件零漂移。
  - **身份传递**：`scope.ts:11-28` 判别联合精确字段集（Reflect.ownKeys 拒绝夹带/未知 kind）、
    非空白不改写、冻结快照；`main.ts` bootGame 必传第二参且 `assertSaveScopeProject` 为首语句
    （副作用前）；`boot.ts` 以已加载 manifest.id 显式 project scope；`play.ts` local→校验后
    record 的 workspace scope、http→save-workspace 有则 workspace 无则 project，错句柄 fail loud
    不退 HTTP；`play-url.ts` 必填 EditorPlayIdentity + 重复/互斥/空值/非法拒绝（空 `workspace=`
    走 isWorkspaceId 拒绝）；App 恒取 WorkspaceContext 身份、句柄只选 source；六个链接点全部
    经校验后的 `playProjectQuery(playIdentity)`（grep 实测恰好 6 处）；`play-workspace.ts` 补
    record.workspaceId 一致性；DataMode 预览缓存 projectKey 表达式零 diff（边界外未动）。
  - **事务原子性**：`store.ts` prepareSlot 克隆+工程归属先于异步 open；oncomplete 才成功、
    onerror 保留 request.error、**onabort 拒绝**、同步入队异常 abort 且保原错误；IDB 失败不切
    Memory 假成功。18 项隔离测试直读为真实语义证据：末请求 success 后 abort 且零 request error、
    下一事件轮前 settle（非 pending）；真实 ConstraintError 全滚回；abort 后同步抛保原错误；
    VersionError 无版本 fallback；readonly 三读拒绝；旧库三块原值不动且新 scope 读不到。
  - **HTTP→FSA 连续性与浏览器证据**：browser-result.json 实测 pal/W1=111(次数2)、W2=222、
    scope-q=333、独立壳 pal project=444 互不串；真实 OPFS handle 注册 + granted，
    save-workspace=W1 → workspace=W1 后 F9 读回 111/同位置、再存 112 次数 3；
    **IDB 库名集合**实证旧 `type-pal-saves` 与四个 JSON 元组 scoped 库并存、绑定前后不分裂；
    legacy 999/99 原值保留；errors=[]。本人亲看 missing-workspace.png：错误可见可操作、
    未建错误库。证据边界如实（非 OS 目录选择器/非完整 Q1），不重复浏览器流程。
  - **范围保持**：diff 仅白名单文件；SAVE8/content20、content/migrate/game/projects、原探针、
    coverage 全局配置零 diff；UI diff 仅参数/类型/接线无样式变化；lock 仅 fake-indexeddb@6.2.5
    （engines>=18）；试买两种 scope 真实 boot 均断言不建世界/Store、scope 错配在任何工作前拒绝。
  - **负控制与门禁**：Codex 日志实证基线 store.ts 负控制 14 红/4 绿、完整实现 18 绿；本人实跑
    reforge 9 文件/141、editor 12 文件/110 全绿，两包 typecheck exit 0；完整 check（542 文件/
    6,327）与严格 fast（610 文件/5,842）复用其新鲜日志并核对计数一致。
  返工项：无。本 accept 不代签、不授权 done、不覆盖 dumpSave 另登缺陷与 R4/Q1 集中验证。
- GLM：pending。
- done 准入结论：blocked。

## 实现 / 视觉 / 验收

### 设计期基线（历史）

以下记录为实现前证据，不是当前实现结果：
早期 r1 的 38 项既有测试记录保留；r2 新鲜基线为 reforge 保存/独立试买 4 文件 / 17 项、
editor 试玩/句柄 4 文件 / 13 项、workspace-persistence/open-actions 2 文件 / 42 项通过，
合计 **10 文件 / 72 项**，不代表 A-01 已修复。测试命令为：

```sh
pnpm --filter @type-pal/reforge exec vitest run src/save/store.test.ts src/save/ops.test.ts src/save/browser-state.test.ts src/shop-trial.test.ts
pnpm --filter @type-pal/editor exec vitest run src/core/play-workspace.test.ts src/core/play-url.test.ts src/core/load-play-project.test.ts src/core/handle-store.test.ts
pnpm --filter @type-pal/editor exec vitest run src/core/workspace-persistence.test.ts src/core/open-actions.test.ts
```

首次 editor 过滤参数还包含不存在的 `workspace-context.test.ts`，Vitest 未匹配它；上述计数只含实际四文件，
不把未执行文件算通过。既有上下文/标记/句柄身份测试实际在 workspace-persistence/open-actions 中补跑。
当时新测试依赖未安装、生产/配置/锁文件未改，仅做证据复核、产品裁决登记与方案。

### r2 实现回执（Codex，2026-09-07）

实现候选 `526eea00`，基线 `68d84d68`，46 文件（含测试/基线/文档）。按已签 r2 一次提交完整实现与试买白名单，
不产生“链接已变、试买尚未接受”的中间候选；后续候选 SHA 登记仅文档，packages/ scripts/ 锁文件零 diff。
无 Agent 缺席/额度代班；本次进入 review，不代签 Kimi/GLM、不标 done、不声称用户已验收。

- `save/scope.ts`：精确 variant 字段、非空白但不改写 ID、冻结拷贝、工程归属断言及带 tag 的 JSON 元组库名。
  `main.ts` 只改必传 scope/启动校验和唯一 Store 构造，`boot.ts` 以已加载 manifest.id 显式提供 project scope。
- `save/store.ts`：构造时固定身份；meta/payload 在异步 open 前克隆并验归属；三 store 单事务，complete 才成功，
  abort/error 均拒绝，入队同步失败 abort。IDB 请求错误冒泡早于 transaction.error 赋值时保留 request.error，
  不吞 ConstraintError；失败不切 Memory。Memory 先克隆后写，仍按实例非持久。
- `play-url.ts`/`play.ts`/`play-workspace.ts`：HTTP 内容与工作区存档身份分离，空/重复/冲突/错记录拒绝；
  本地句柄/加载 manifest 继续核对，不回退 HTTP。App 始终取既有 WorkspaceContext ID，绑定目录只改变 source。
  App/PreviewCanvas/EnemyTab/EnemyTeamTab/SkillTab/ShopTab 六处 helper 调用与三个中间 props 逐一接齐；
  ConnectedEditorPages 自动 spread 继承新合同，无需改其实现。DataMode 的非试玩 `projectKey` 表达式原样保留。
- UI diff 仅参数/类型/身份接线与对应测试 fixture、预期 URL；无 CSS、组件大小/布局改动。shop-trial 只加
  save-workspace 白名单，project/workspace 两种 scope 的真实 boot 分流测试均证明不创建世界/Store。
- `fake-indexeddb@6.2.5` 精确 devDependency，每例独立 IDBFactory；无 auto/polyfill/全局产品配置。
  安装工具曾顺带更新无关 spessasynth_core，已还原该锁文件漂移并 frozen install；最终 lock 仅 9 行此依赖新增。
- SAVE8/content20、content/迁移/工程/一阶段、原审计探针及 coverage 全局配置零 diff；旧 type-pal-saves
  物理保留而不读不迁不删。原探针仍表达修前接口/假设，不修改它来制造 post-fix 绿色。

### 实际验证与反例

证据根目录 `/tmp/type-pal-save-isolation.4QCe6g/`（本机临时日志/脚本/图片，未提交；回执与回归源码入库）。

| 验证 | 实际结果 / 证据 |
|---|---|
| 最终 Store 负控制 | `store-baseline.config.mts` 仅在 load hook 读取 `git show 68d84d68:packages/reforge/src/save/store.ts`，其余最终测试/源码不变；`store-before-final18.log` exit 1，14 failed/4 passed；完整实现 `store-control-final18.log` exit 0，18 passed |
| reforge 定向 | `pnpm --filter @type-pal/reforge exec vitest run src/save src/shop-trial.test.ts`，9 文件/141 项，exit 0；`reforge-targeted-final.log` |
| editor 定向 | 12 文件/110 项，exit 0；`editor-targeted.log`，精确文件清单见下 |
| 类型与完整检查 | editor/reforge typecheck 通过；`pnpm check` exit 0，542 Vitest 文件/6,327 项，lint 0 errors、50 warnings/11 infos；`check-final.log` |
| 覆盖率 | `pnpm coverage:ratchet` exit 0，提升 12 项/范围变动 6 项/零下降；随后单次 `pnpm coverage:fast` exit 0，610 个生产文件/5,842 项，精确计数与新基线一致；`ratchet.log`、`coverage-fast.log` |
| 原范围保持 | `git diff 68d84d68 -- packages/content packages/migrate packages/game projects docs/ops/audits/pre-e2e/probe* scripts/coverage/config.mjs` 零；无 timeout/排除/ignore 调整 |

editor 定向 12 文件实际为 play-url、play-workspace、play.ts、ConnectedEditorPages、DataMode.item-alchemy、
EnemyTab、EnemyTeamTab、PreviewCanvas、SceneScriptWorkspace、ScriptDrawer、ShopTab、SkillTab；
App.reference-navigation 在完整 check/fast 中验证，不把它重复计入定向 110 项。

原先 13 项 Store 用例负控制为 11 红/2 绿；后补真实 open/readonly/request/default-factory 错误后是上表最终 18 项。
abort 回归在最后一个 thumb 请求 success 后才 abort，并断言零 request error，避免 onerror 掩盖缺 onabort；
await abort 后与下一事件轮比较可证 Promise 不再 pending。用真实 provider 的三块回滚断言，不手写成功 Map。
最初完整 check 有两处失败：App 旧 URL 预期未带身份、play-url 文案使用“工程”违反既有“项目”规则；
均修真实期望/文案后才通过，原失败 `check.log` 保留。没有以重试/多数绿处理 editor 确定性门禁。

新增用例净增 80（reforge 49、editor 31）。scope 分支 29/29、play-url 29/29、play-workspace 11/11，
行/语句/函数均 100%；store 行/语句/函数 100%、分支 15/16；play.ts 行/语句/函数 100%、分支 11/14，
不冒称余下错误展示分支已覆盖。完整 fast 精确计数见[覆盖率登记](../../testing/coverage.md#save-isolation-1-增量基线2026-09-07实现候选待终审)。
普通 check 包含 PAL 测试，但本次未跑 full coverage；最小浏览器验证也不计入 fast 百分比。

### 最小功能 / 视觉验证

`browser.mjs` / `browser.log` / `browser-result.json`：复用既有 localhost:6010 服务，独立 Chrome 新 context，
路由只在该 context 提供当前 blank 测试工程；未改磁盘 PAL 内容、用户浏览器或原 dev server。
真正执行 play.ts/standalone boot.ts、F5/F9、IndexedDB；仅以开发观察钩子设可区分测试金额，以真实方向键移动。

- P=pal/W1：111、quick 次数 2、位置 10/0/0；pal/W2：222、次数 1；Q=scope-q：333；
  独立运行 pal project scope：444。各次交错保存后三块内容/缩略图 hash/次数不串，F9 恢复自己的状态，W2 刷新仍 222。
- 同 context 创建真实 OPFS directory handle，写当前测试工程与既有沙盒 marker，经真实 handle-store 注册 W1，
  权限 granted；从 `save-workspace=W1` 转 `workspace=W1`，真实 FSA loader 后 F9 读回 111/同位置，
  再 F5 保存 112、次数 3；绑定前后游戏数据库名集合相同，其余空间快照不变。
  **这验证原生 FSA handle/OPFS，不冒称测了操作系统目录选择弹窗或用户磁盘目录首次保存全链。**
- 旧库 sentinel 金额 999/次数 99 保持原值；缺失工作区显示可操作错误且不新建错误 save DB；pageerror 空。
- 本人实际看过 `local-workspace-restored.png` 与 `missing-workspace.png`：读档短提示完整、缺句柄错误可见；
  未改变界面样式、不重复做剧情观感验证。浏览器/context 已关闭，未删除用户数据库。

完整 R4/Q1（含 auto/手动菜单及 checkpoint 连续链）仍按[登记](../../testing/e2e.md#已登记的多项目工作区存档回归save-isolation-1)待跑。
期间发现既有 Q1 `dumpSave` 误接有参 builder，已在[审计追加](../audits/pre-e2e/summary.md#审计后实现期追加2026-09-07)
登记独立证据；本卡不修改该钩子、不把合法 builder 或正常 F5 误报成 Q1 导出已闭环。

## 交接日志

- 2026-09-07 Kimi（独立终审）：同步 `a032c764`、工作树干净后核 `68d84d68 → 526eea00`。
  直读 scope/store/main/boot/play-url/play-workspace/play.ts/App 与六链接点、隔离测试 18 项；
  复跑 reforge 141 + editor 110 + 两包 typecheck 全绿；交叉核 Codex 负控制（基线 14 红/4 绿、
  实现 18 绿）、完整 check 6,327、严格 fast 5,842；读浏览器证据 browser-result.json
  （四空间互不串、HTTP→OPFS/FSA 同 W 连续、库名集合、legacy 999/99、errors=[]）并亲看
  missing-workspace.png。签 accept，无返工项；身份传递/事务原子性/连续性/范围保持逐项闭环。
  未改实现/他席/任务状态，未读 GLM 本轮结论。Next：GLM 并行终审落卡后，Codex 统一核定 done。
- 2026-09-07 Codex（实现 → review）：r2 已签合同实现完毕；定向、完整 check、ratchet 与单次严格 fast 通过，
  最终 Store 负控制 14 红/4 绿、实现 18 绿；原生 IDB/FSA 最小浏览器证据完成。本人签实现者自测 accept，
  Kimi/GLM 终审 pending。同步看板/索引/覆盖率/E2E 与审计进度；Q1 dumpSave 误接仅另登，不扩张本卡。
  文档工具 20/20、全仓文档链接/状态检查与 git diff --check 通过；提交前 fetch 确认 main 未分叉。
  下一阶段两席独立读取同候选，各写本人签字/日志并提交推送；不重签 r2、不改他席/状态、不标 done。
- 2026-09-06 Codex（build 准入）：用户确认三席签字后核定 r2 allowed，draft → build，同步看板/索引。
  接手 `dd940563` 洁净同步树；两席独立证据成立、无返工项。先实现 scope/Store，再接齐全部试玩 URL，
  完整候选中保持试买参数与入口同步；无存档格式/UI 变更，不迁移或删除旧库。实现与全部验证仍由本人完成。
- 2026-09-06 Codex（用户裁决补充）：记录旧开发档可全部作废、无需迁移恢复兼容，以及发布后以工程 ID
  隔离读写保护玩家进度的主要目标。开发试玩仍附加工作区身份；未删除数据库，未修改产品或 r2 方案，
  不撤销已有签字、不要求重新审签，不将开发期许可延伸到正式用户存档。
- 2026-09-06 GLM：完成 r2 独立数据/矩阵审查，签 premise verified + design agree，无返工项。
  A-01 本人复跑（只计已输出观察，其后 B-04 旧假设 exit 1 不算全探针通过）；store/入口/身份链/试买
  分流逐点直读；试玩链接全量枚举恰 7 构造点 + 3 中间载体，与方案 12 文件面一一对应、无清单外/遗漏；
  savedTimes 派生机制直读确认按 store 隔离。五条可证伪观察与三条非阻断备注（一阶段措辞、per-scope
  DB 配额、boot.ts 矩阵未单列）写入签字块。Kimi 签字中途落地，未读其内容。仅更新本人席位与日志；
  未改实现/他席/任务状态，不标 build/done。Next：三签齐后 Codex 放行 build（实现 Owner Codex）。
- 2026-09-06 Kimi：完成 r2 独立前提/架构审查，签 premise verified + design agree，无返工项。
  直读 store.ts:34/60-65（同库同键+无 onabort）、main.ts:350-354/586（试买先于存储分流、无参构造）、
  App.tsx:576、main.tsx:75-92、workspace-context/workspace-persistence/handle-store 身份连续性、
  play.ts/play-workspace/play-url 与六个试玩链接点（全经同一 helper，bootGame 调用方恰三处——
  grep 全仓实证入口表无漏）；复跑 probe-save-boundaries 确认 A-01（B-04 旧假设处抛错与卡面一致，
  不称全探针通过）；复跑 r2 基线 10 文件/72 项全绿、store.test.ts 仅 Memory。七条可证伪观察
  与一条非阻断备注（savedTimes 按 scope 计数为固有后果）已写入本人签字块。
  未改实现/他席/任务状态，未读 GLM 签字。Next：GLM 并行签字；两席齐后 Codex 放行 build。
- 2026-09-06 Codex：用户按上一条推荐确认各工作区独立；r1 产品阻塞解除，更新为 r2 draft。
  同步至 `c09fbfa9` 洁净树，重读真实存储/所有试玩入口/既有工作区身份，补 HTTP→FSA 身份连续性边界，
  复跑 A-01 确认仍覆盖（原完整探针随后在已修 B-04 旧假设处 exit 1，非全探针通过）。形成显式 scope、
  URL 接线与 per-scope DB 方案，签本人 r2，未实施或代签。后继 Kimi/GLM 可并行审同一 r2，直接写各自席位并提交推送。
  现有相关测试 10 文件 / 72 项、文档工具 20/20、文档链接/状态检查与 git diff --check 通过；
  packages/ scripts/ pnpm-lock.yaml 零 diff，fake-indexeddb 只查元数据并列入待审方案，未安装。
- 2026-09-06 Codex：复读 current-only 与工作区身份合同，复跑 A-01 内存边界反例；提出同工程不同工作区的产品选择。

## 下一位 Agent 提示词

### Codex：汇总核定 done（当前有效，待 GLM 落卡后执行）

```text
在 /Users/zhangxu/illegal/type-pal 汇总 SAVE-ISOLATION-1 收口，任务卡 docs/ops/tasks/SAVE-ISOLATION-1-project-workspace-save-scope.md，review，终审候选 526eea00（HEAD 侧无产品变化）；r2 不重签。
先同步并检查工作树，读本卡 done 前三席签字与最新交接日志。现状：Codex（实现者自测）与 Kimi（独立终审）已 accept；GLM 数据/矩阵终审落卡后，请统一核定：三席钉同一候选 526eea00、无 counter/返工项/缺签豁免，将任务推进 done 并同步看板/索引。
收口时按登记保留后续事项：R4/Q1 多工程/工作区 checkpoint 连续链仍待集中 E2E 批次执行；Q1 dumpSave 误接已另登独立缺陷卡，不属本卡；旧开发档物理保留不读不迁的边界与发布后以工程 ID 隔离保护玩家进度的目标已在卡内，不向正式兼容扩张。
不得代签任何一席、不把本收口扩张到其他审计缺陷的整组授权。
```

### Kimi：r2 实现终审（已完成，历史保留）

```text
在 /Users/zhangxu/illegal/type-pal 终审 SAVE-ISOLATION-1，任务卡 docs/ops/tasks/SAVE-ISOLATION-1-project-workspace-save-scope.md，状态 review，r2 不重签；候选 526eea00，对比 68d84d68。
先同步分支并检查工作树，读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡 r2 已签方案/用户裁决/实现回执与最新交接日志、harvest X9。不要读取或复述 GLM 本轮终审结论。
独立审架构与实现：SaveScope 精确字段/不可变绑定、bootGame 必传且副作用前校验、project/workspace 元组编码；三 store complete/abort/error/同步入队异常及克隆原子性；无 IDB 错误转内存成功；六类 URL/中间 props/独立壳接齐；HTTP save-workspace 与本地 workspace 分责，错句柄身份不退 HTTP，首存来源切换同 W 不分裂；独立试买仍零存档。核旧库不读不迁不删、SAVE8/content20/UI/DataMode 非试玩缓存键/原探针零变化。
复跑定向 save+shop-trial 141、editor 定向 110（卡内清单）、相关 typecheck、完整 check（Codex 6327）及单次严格 fast（610 个生产文件/5842）；不并跑重型检查、不取多数。按需独立重建隔离负控制：只把 store.ts 换成 git show 68d84d68 的加载内容，最终 18 项为 14 红/4 绿，当前 18 绿；特别核最后 thumb success 后 abort 且零 request error，不能只靠 pending request 的 onerror。不得 stash 回退共享树。
真实浏览器证据在 /tmp/type-pal-save-isolation.4QCe6g/browser.mjs、browser-result.json 及两张截图，Codex 已验正式 F5/F9、同源多空间/刷新、HTTP→原生 OPFS/FSA handle 同身份。先读证据，只为不确定项补最小验证，不重复完整视觉流程；没有测 OS 目录选择器或完整 Q1。既有 dumpSave 误接仅另登，不在本卡顺手修。
结论 accept 或带 file:line/直接证据的 counter 写入本人 done 前席位与本人交接日志，提交推送；提交前同步并保留他席，只改自己的签字/日志，不改实现、他席、任务状态、不标 done。两席落卡后由 Codex 统一核定；用户不用搬运审查正文。
```

### GLM：r2 数据/测试矩阵终审（可与 Kimi 并行）

```text
在 /Users/zhangxu/illegal/type-pal 终审 SAVE-ISOLATION-1，任务卡 docs/ops/tasks/SAVE-ISOLATION-1-project-workspace-save-scope.md，状态 review，r2 不重签；候选 526eea00，对比 68d84d68。
先同步分支并检查工作树，读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡已签 r2/用户裁决/实现回执与最新交接日志，以及 docs/testing/coverage.md。不要读取或复述 Kimi 本轮终审结论。Coding Owner Codex，本轮你只做独立数据/矩阵/范围终审。
从候选树独立枚举生产 diff、六类 URL 与中间 props，逐项核矩阵：P/W/特殊字符/调用方突变、scope/项目错配副作用前拒绝、空重复互斥参数/错记录/错 manifest、HTTP→FSA 同 W、三块/列表/次数同域、30 槽/多 entry 保持、克隆失败/同步错误/真实 abort 回滚、Memory 非持久、旧库不读不迁不删、独立试买零存档。核 fake-indexeddb@6.2.5 仅 dev、lock 仅该依赖、配置/超时/排除/原探针/格式/UI 与非试玩缓存键不变。
复跑 scope/store/入口定向与完整 check、单次严格 fast；重型检查不并跑，不取多数。核新增净 80（reforge 49/editor 31）、fast 610 文件/5842 项，scope 与 URL 分支 29/29、store 15/16；回执数字从实际候选树生成。负控制仅隔离加载基线 store.ts：最终 18 项 14 红/4 绿，完整实现 18 绿；核 abort 真正不发 request error、失败不半写，不能用测试注释代替红证据。临时 config/日志 /tmp/type-pal-save-isolation.4QCe6g/，可自行重建，不 stash 共享树。
阅读 browser.mjs/browser-result.json/截图证据，核原生 IDB/F5/F9、多项目/工作区/独立壳、刷新与 HTTP→OPFS/FSA 绑定连续性的证明范围；不把测试 handle 当 OS 目录选择或全链 E2E。Q1 dumpSave 既有误接已另登，原调用未改，不因此代修范围外产品。
将 accept 或 file:line counter/证据/返工项直接写入本人 done 前席位和本人日志并提交推送；落盘前同步保留他席，只写自己，不改实现、他席、任务状态、不标 done。两席都落卡后 Codex 统一收口，用户不用复制审查正文。
```
