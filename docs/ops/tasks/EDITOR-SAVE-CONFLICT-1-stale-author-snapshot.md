# EDITOR-SAVE-CONFLICT-1 - 编辑器旧快照保存冲突保护

Status: review
Phase: phase2
Capability: ops（审计 A-02 修复，不新增能力格）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main
Revision: r1（2026-09-07，实现与自验证完成，待 Kimi/GLM 并行终审；设计不重签）
Evidence Baseline: 50590cb6
Implementation Baseline: 32302e58
Implementation Candidate: 完整实现提交后登记固定 SHA

## 目标与分批

两个编辑窗口打开同一项目后，后保存的旧窗口不能静默抹掉另一窗口已保存的作者内容。
发现冲突时，在任何目标写入/删除前拒绝，保留磁盘新内容与当前窗口未保存修改；不自动合并或强制覆盖。

用户于 2026-09-07 验收 SAVE-ISOLATION-1 并要求继续。依[审计顺序](../audits/pre-e2e/summary.md)，
下一组是作者保存安全；本卡先处理 **A-02**，不是玩家存档、不是整组缺陷实现授权：

1. 本卡：旧作者快照与目标当前内容的冲突检测。
2. 后续 A-03：跨文件部分保存的持久恢复/发布边界，另卡设计，不靠调整写入顺序代替。
3. 后续 A-07 与 D-01：离开项目保护、跨会话撤销顺序分别闭环。

不新增 content/save 版本、磁盘 revision/日志旁车、云协作、跨进程强制文件锁、自动重载、合并编辑器或覆盖按钮。
不改地图懒解析、资源格式、工作区身份/权限、界面布局；不直接修改 PAL 或迁移产物。

## 前提真值门

一句话：现有 workspace 锁串行化写入，但普通作者会话没有绑定其打开时的完整作者文件基线，旧状态仍能在锁内合法覆盖新内容。

| 维度 | 真值 | 直接证据 |
|---|---|---|
| Primary source | Web Locks 协调同存储域内合作调用者对同名资源的互斥，不比较应用快照；FSA writable 的提交边界是单文件 close，不是目录级事务。 | [Web Locks §1/2.3](https://w3c.github.io/web-locks/#modes-and-scheduling)、[File System §2.3.2](https://fs.spec.whatwg.org/#api-filesystemfilehandle-createwritable)（2026-09-07 直读） |
| 第一阶段 | N/A：game 是单游戏运行壳，无多窗口作者项目编辑器，不从它的玩家存档推导作者文件保存策略。 | CLAUDE.md Architecture；[harvest X9](../../phase2/reference/phase1-knowledge-harvest.md#x9-存档版本化迁移--读档归一化)只作存档领域分责参考 |
| 当前打开/保存 | App snapshotRef 初始 null，首次保存传空 Map；writeProject 以其作增量/部分写记账，不比较打开时原内容与磁盘。 | `packages/editor/src/ui/App.tsx:567,2104-2113`；`core/project-io.ts:398-426,465-482` |
| 当前锁/权限 | 普通 local/sandbox 只核句柄/marker/identity；PAL 已有受控关键 JSON 指纹，不等价全部作者正文。真正首变更还会复验。 | `core/workspace-persistence.ts:177-249,315-326,457-483,613-620`；[现行生命周期](../../phase2/specs/project-lifecycle.md#pal-目标证明) |
| 当前载入一致性 | finishOpen 只对 metadata 与 PAL 关键 proof 做前后夹验；一般内容源是可再次读取当前磁盘的 fsaSource。不能加载旧状态后才重新采一份新基线。 | `core/open-actions.ts:66-137`；`packages/reforge/src/fsa-source.ts:36-69` |
| 本任务目标 | 从真实读取的作者输入建立会话基线；保存在相同 workspace 锁中比较后再写，过期即零写入拒绝。 | A-02 反例与下方验收矩阵 |

### 当前树复现（Codex，2026-09-07）

原样运行 `node --import tsx docs/ops/audits/pre-e2e/probe-editor-persistence.mjs`，exit 0：

- A-02：A 用真实 UpdateLocaleCommand 保存 `Saved by A`；B 从旧态用 RenameProjectCommand 保存，
  磁盘 locale 变回 `主角`，manifest.name=`Edited by B`。不是两个同时写才触发，A 完全结束后 B 再写也成立。
- A-03 同脚本复现：actors.json close 失败，scene.actor=`new-npc` 但 actors 只有 hero；重开成功、再保存拒绝悬空引用。
  本卡只把它作为不越界承诺的证据，不称本卡能修好跨文件发布。
- 探针调用真实 loader、Command、序列化、writeProject 和授权 policy；目录/IDB 是内存边界，拒绝网络/真实目录选择，
  不等于已执行两个真实浏览器窗口或断电测试。原探针未改；Vite 仅作原有模块加载，未修改产品配置。
- 定向 `pnpm --filter @type-pal/editor exec vitest run src/core/project-io.test.ts src/core/open-local.test.ts src/core/open-actions.test.ts src/core/workspace-persistence.test.ts --no-file-parallelism`：**4 文件/51 项通过**。
  既有测试绿与 A-02 反例并存，不能用它声称冲突已被保护。

### 替代解释与可证伪观察

- 最强替代解释：已持有 Web Lock，所以不会丢更新。上述顺序保存反例直接推翻；互斥不是旧状态检测。
- 另一解释：仅初始化 prevSnapshot 就能修。它至多减少第一次全写；两个窗口修改同一文件仍会覆盖，且该 Map 会在半写后变化，不能兼任不可变打开基线。
- runtime/分类：纯编辑器作者保存链复现，未运行游戏/脚本解释器。
- 原版理解：没有原版多人创作工具语义；保持“不静默丢作者修改”的既有保存目的，不另造原版真值。
- 提取/解码：空白 current 项目可复现，与 PAL 迁移/地图解码无关。
- 审计模型：真实 save sink 选择写路径，桩只实现 close 后替换文件；正式回归仍须补实际 App/finishOpen 调用链和原生浏览器验证。
- 推翻本前提的观察：原树真实打开基线已被完整传入写锁、B 以旧输入保存时在任何 create/close/remove 前拒绝且 A 原值保留。

### 用户可见变化

`before -> after`：旧窗口点保存可能静默覆盖 → 提示目标已变更、拒绝本次写入，当前修改保持未保存。
代表为 A 改角色名称并保存、B 改项目名称后保存。属于已证实数据保护 bug 的修复，不要求反复裁决是否允许丢更新。
不增加自动合并/强制覆盖等新产品选择；继续与保存中断恢复分卡。

## r1 设计候选

### 1. 作者文件基线与增量记账分离

- 在 editor core 增加只读 `AuthorDiskBaseline`（内部合同名称），绑定工作区/目录身份和作者输入路径的内容签名；
  不把它塞入 manifest、玩家 SavePayload、全局 localStorage 或 handle-store schema。
- 集合包含当前 manifest、catalog、manifest 登记的作者表/共享脚本、SceneIndex 及其场景正文、MapIndex 及地图原始正文。
  路径来自已读 current manifest/index 与现有序列化合同，不手写固定的 PAL 路径表。
  以 blank/含全类表/PAL 的序列化输出对账路径覆盖，防止“人物有保护，商店/脚本漏掉”。
- 从 **loader 实际消费的读取结果** 记录签名并在打开完成前验证一致，不能在旧内存构建完成后直接采纳一次当前磁盘。
  可用 editor 私有 FileSource 包装记录 readText/readJson/readBytes；不改 reforge 公共 FileSource 或 loader 版本。
  重复读取同一路径发现内容变化、载入前后已读集合不一致则拒绝打开/登记，不把旧态与新基线拼装。
- 未加载地图只读原始字节取签名，不为取基线 JSON.parse 全部地图，也不放入编辑地图/LRU/撤销栈。
  默认不遍历或 hash 全部音视频二进制；已登记资源的内容约束来自已读 catalog，只有即将写/删的资源路径检查实际 bytes/hash。
  未登记的新目标路径要求不存在；已存在但无法证明归属的文件不能被新资源覆盖。`.type-pal` 仍由原 policy 禁写。
- 内容签名使用实际读取字节的完整 SHA-256/长度，不用 mtime、文件大小相同或对象引用充当内容版本。
  不把这份范围较广的基线直接送给 diffFiles：否则未加载资源不在下一文件集时会被误删。
  现有 prevSnapshot 继续负责输出增量与当前页部分写记账，二者职责明确。

### 2. 传递至唯一保存入口，锁内首写前比较

- 本地打开/最近项目的基线经 Opened → main.tsx Booted → App 显式传递；绑定目标的普通保存不得缺基线后退为空 Map。
  新建/克隆/另存为目标仍先走空目录与身份门；完成自己的写入后建立目标基线，不能把源工作区基线移给新目标。
- 未绑定 HTTP/PAL 会话需记录源作者读取基线；PAL 首次选原目录时叠加现有 sentinel/proof 检查，
  不从待写目标补采“正确答案”。新 local/sandbox 的空目标没有旧作者内容，按空目录证明起步；
  同一目标中断重试沿本次已完成写入证明，不借 resumesInterruptedAttempt 跳过外部漂移检查。
- `authorizeBoundWorkspaceTarget`/mutation 内加入作者基线验证；在锁内进入时与真正首个 create/remove 前均检查，
  保持现有 discovery→workspace 锁顺序、一次性 token、nested mutation 复用，不嵌套重入同名非重入锁。
- 比较全作者基线，并检查本次新增/写入/删除目标的原状态；任何缺失、替换或额外目标碰撞先拒绝。
  不能只查本次用户改动的那张表：旧内存还可能据其他表的旧引用/索引生成新输出。
- 冲突抛清晰中文错误，经现有 saveErr 展示；不 markSaved、不替换会话/基线、不重新载入、不强制覆盖。
  文案需明确“项目文件已在其他位置修改；本次未写入，当前修改仍保留”，不误称旧页面已经刷新或合并。

### 3. 自己的成功/部分写入不冒充外部新基线

- 预期后态只由本次成功 close/remove 的受管值推导，包括 catalog 暂时超集与最终收缩；不能以操作后重新扫盘的结果直接覆盖预期。
- 完整成功后比对实际与预期再推进作者基线；dirty 仍按保存开始的两会话 state/version 判断，不误清保存中产生的新修改。
- 中断时保留未保存状态；只有实际与“旧基线 + 本次已证实成功的写/删”完全一致时，允许当前页带该前提重试。
  混入他方变更或不能证实的 close 结果时拒绝推进前提，保留原错误。A-03 的跨刷新持久恢复不在本卡承诺内。
- PAL 原关键 proof 与新作者冲突基线是叠加关系，不删除或扩大 PAL 写权限。workspaceId、目录绑定和玩家存档隔离不变。

### 风险边界

- Web Locks 只能协调同浏览器存储域的合作窗口；不声称锁住其他浏览器、OS 编辑器或同步盘。
  保存前已存在的外部变化必须检测；不合作工具恰在比较后写入无法由 FSA 原子 CAS 保证，后验发现即报错，不当成功。
- 无 navigator.locks 的既有同进程测试 fallback 不冒称跨窗口锁。若需改变浏览器支持范围/强制禁写，先报告，不默加产品限制。
- 另存为源树跨时点复制/跨文件发布属于 A-03 及后续源一致性核验；本卡不把“另存为”宣传为冲突后自动合并或完备恢复方案。
- 读取成本按受管作者字节量测量并登记，不全量解码地图/扫描用户无关目录。正式精确 baseline 表现不得由降低覆盖率/跳过故障测试换取。

## 文件面与上下文

- 预计：editor core 新作者基线模块及测试；open-local/open-actions、project-io、workspace-persistence；main.tsx/App 身份/基线接线及相邻测试。
  只在必要处扩展 editor 内部参数，生产 CSS、runtime/content/迁移/工程文件不在白名单。
- [READ-FIRST](../../phase2/READ-FIRST.md) 4/5/8/10/11；[生命周期](../../phase2/specs/project-lifecycle.md) 权限/首存/锁顺序与 PAL proof；
  [编辑器架构](../../phase2/specs/editor-architecture.md#单一新版地图库与场景绑定w7f2026-07-14)地图懒解析；
  [A-02/A-03](../audits/pre-e2e/README.md#a-02--锁只串行不识别另一编辑器的旧快照)、[D-01](../audits/pre-e2e/editor-workflows.md#d-01--跨会话撤销没有统一的时间顺序)。
- 关键代码：`project-io.ts:304-332`（diff/remove 不能消费全磁盘集合）、`open-actions.ts:66-137,185-218`（打开与另存）、
  `workspace-persistence.ts:177-249,275-288,315-326`（锁/成功 close/首写）、`handle-store.ts:74-117`（锁域）。

## 验收矩阵

| 场景 | 必须证明 |
|---|---|
| 两窗口依次保存 | A 的角色/脚本/商店/场景等任一作者修改已落盘，B 用旧态改同文件或不同文件均零目标写入拒绝；B dirty 保留 |
| 同时请求保存 | 按真实合作锁串行，只有仍持正确基线的 writer 可写；不是通过延时“碰巧不重叠” |
| 打开时漂移 | loader 消费旧字节后目标改变，不能创建配新基线的旧会话；recent/成功打开不提前登记 |
| 首次绑定/后续保存 | local/sandbox/PAL 各有正确来源；身份不相符、基线缺失不降级，取消 picker 零写入 |
| 懒地图与新增资源 | 未 hydrate 地图变化可检测但不解析全图；同长度不同内容检测；新增路径已有无关文件拒绝；无误删未加载资源 |
| 自己保存/重试 | 成功后下一次可保存；close/remove 各注入失败，原页重试与部分预期相符时可继续，混入外部变化则不收编 |
| 取消/错误/dirty | 无成功提示或 markSaved；原页状态可用；保存中后台产生新 state/version 时不误清 dirty |
| 相邻合同 | 空目标首存、克隆/另存目标身份、PAL 权限、同 W 存档空间、现行 schema/原探针均保持 |

验证：真实打开→两 EditSession/ScriptEditSession→Command→正式保存回归先红后绿；覆盖首写计数/磁盘字节/dirty，
不只测一个比较函数。独立移除比较 guard 必须红。定向→typecheck→完整 check→ratchet（只升不降）→单次严格 fast 串行。
开发期以新 Chrome context/专用当前测试项目做原生 FSA 两页最小功能：A 保存、B 冲突、磁盘 A 保留且 B 可操作。
不使用用户真实项目制造冲突；完整新建→编辑→保存→重开→试玩和中断恢复扩展登记 R4，未跑不称完成。

## Build 实现与验证回执（Codex，2026-09-07）

实现比较基线 `32302e58`；产品源码仅 editor 内部，未改 content20/SAVE8、玩家存档、生成工程、迁移器或 CSS。
本节是 Coding Owner 自测，不替代两席独立终审；完整 R4 与 A-03/A-07/D-01 仍未实施。

### 实现与设计钉落实

- 新 `core/author-disk-baseline.ts`：opaque 基线/私有 WeakMap；FileSource 的实际字节读取签名与打开结束夹验；
  地图只读原始字节，catalog 资源默认不取正文。受管读集合从真实 loader 获得并与序列化输出对账，不另列固定 PAL 文件表。
- `open-local` 返回 authorBaseline；`finishOpen` 在 identity 异步检查后再验证，主入口 HTTP/PAL 同样包装源，
  在 ui_samples 作者投影前固定基线；Opened → Booted → App 必填接线。普通绑定保存第三参数必填，无缺省空基线退路。
- `workspace-persistence` 叠加作者检查，不替换原身份/PAL proof：锁内进入、真正首个 create/remove 前比较；
  新目标用空基线，PAL 首存缺 HTTP 作者基线即拒绝；同上下文/同目录重复首存授权复用既有恢复证据。
- `project-io` 先提交完整 write/remove 预检集合；每个 writeFile 先冻结实际写入值，成功 close 后才记录精确签名；
  成功或可证明的部分后态与磁盘一致才推进，外部混入不采纳。整个作者基线没有进入 diffFiles/prevSnapshot。
- `clone.ts`/`fsa-copy.ts` 只补完整目标路径预检与 await 写入回执，属已有首存/复制 sink 闭合，不重写克隆或资源格式。
  二进制流式逐文件计算签名，不把整批媒体 Blob 留到操作末尾；后续普通作者保存不重新 hash 全部资源。
- 同 W 重开补 Root 的临时 mount 计数，确保新会话拿新 refs/基线；该计数不进入 workspaceId、最近项目、导航键或玩家存档空间。
  既有主/脚本 dirty 的 state/version 检查保持；冲突只写现有 saveErr，界面布局/组件样式未改。
- GLM 提醒的旧 script index/chunks 经源码核实：current loader 明确拒绝 `manifest.content.scripts`
  （`packages/reforge/src/project-loader.ts:187-188`）。正式回归钉住该拒绝，未为已禁止输入复活读取器/类型升级链；
  原序列化残留不在本卡扩大清理，当前合法作者文件集合才是对账对象。

### 证据与计数

临时证据根目录 `/tmp/type-pal-editor-conflict.LYKwVY/`；日志/脚本/截图不提交，正式回归与此回执入库。

| 验证 | 实际结果 |
|---|---|
| 最初根因回归 | 新测试在修前真实打开/作者保存链上 2 项均红：同文件与不同文件的旧窗口保存均错误成功；实现后绿 |
| 定向最终树 | `author-save-conflict` 25 项 + project-io/open-local/open-actions/workspace-persistence/clone/fsa-copy，7 文件 **86 项** exit 0；`target-final.log` |
| PAL 对账 | `author-disk-baseline.pal.test.ts` **1 项**通过；538 条实际作者路径与现行序列化输出完全一致，editor.maps 仍空，FileSource 媒体正文读取为 0；`pal-census.log` |
| 调用链回归 | 正式测试从 AST 原样执行 App 的 refs/序列化/save 及 Root/onOpened；只注入 UI setters/picker/React 壳，真实 Session/Command/合并/loader/授权/写盘逻辑保持；覆盖 dirty、首存、取消与同 W 重开 |
| 单点负控制 | `/tmp/type-pal-editor-conflict.LYKwVY/mutant.config.mts` 仅在隔离 load hook 移除 verifySignatures 的一处比较/throw；最终 25 项树聚焦 4 项全部红，完整实现同 4 项全绿，21 项因过滤未跑；`mutant-final.log`/`control-final.log`。未 stash/回退共享树 |
| 首存恢复反例 | 第二个未消费授权曾替换为新的空恢复基线；单独回归先红（`first-auth-red.log`），复用同目标证据后连相邻 31 项共 55 项绿（`first-auth-green.log`，此时矩阵 24 项）；随后新增 remove 中断行达最终 25 项 |
| 最终类型/完整检查 | `pnpm check` exit 0：**544 Vitest 文件 / 6,353 项**；lint 0 errors、50 warnings/11 infos；`check-final.log` |
| ratchet | exit 0，8 项指标提升、4 项范围变化，未降低任何包指标；611 个生产文件 / 5,867 项 fast；`ratchet.log` |
| 单次严格 fast | ratchet 后一次 `pnpm coverage:fast` exit 0，611 文件/5,867 项，所有精确计数与新基线一致；`coverage-fast.log` |

新增 fast 25 项、PAL 1 项，不把 AST 与普通完整 check 冒称浏览器覆盖率或 full coverage。
author-disk-baseline 行 89/93（95.69%）、语句 95/99（95.95%）、函数 24/25（96%）、分支 55/61（90.16%）；
剩余分支不冒称覆盖，未加 ignore/排除/超时或修改全局配置。
`tested-source-hashes.json` 记录最终验证的 17 个源码/测试文件；提交前核同一文件哈希，防止回执与候选不一致。

相邻旧测试只补必填基线与可读的 FSA 字节夹具，原断言保持。policy 测试按 fixture context **只捕获一次**并复用，
不是每次保存前重新采盘；真正打开期间/旧会话反例另由新真实链测试覆盖。旧只写不读的 clone mock 补 getFile，
不为让旧 mock 通过而把生产后验去掉。原审计探针零 diff；其旧 JS 调用缺新的必填基线，故不能把它修后退出码单独当修复证据。

首次完整检查因新增 PAL 测试的 Node 类型导入与计数字段重名失败（`check-1.log`）；改用编辑器现有 raw glob 夹具合同与
明确字段名后通过，未扩大 tsconfig/types、未改依赖。`check-2.log` 是增补最终两个边界前的通过记录，最终以 `check-final.log` 为准。

### PAL 规模成本（非冷启动性能承诺）

- PAL 原始读取记录含 **77,804,991 bytes / 538 条路径**；包含打开后复验的 FileSource 共 1,077 次读取、
  **155,606,634 bytes**，没有媒体正文读取。
- 正式 PAL 用例为预载 raw JSON 文件源：记录阶段约 568ms；只反映该测试环境的读取/签名/装配成本。
- `pal-disk-cost.mjs` 另用真实磁盘 Node FileSource 驱动同一 loader + observe/finish，实测约 **537ms**，
  路径/字节量相同、resourceBodyReads=[]（`pal-disk-cost.json`）。这是 Node 磁盘结果，**不是浏览器 FSA 时延**。
  不全量解码地图、不 hash 音视频、不据一次时点测量承诺所有机器性能。

### 最小浏览器功能与视觉

`browser.mjs`/`browser-result.json`/`browser.log`，独立 Chrome context、原生 OPFS 目录与 IDB/权限/合作 Web Locks，
两页均从真实“最近项目”打开同一个合法 blank 项目；正式“重命名项目”与“保存”执行生产 App 链。

- A 保存 `Saved by A`；B 保存 `Unsaved B` 被拒；对比该项目 **20 个文件的 SHA-256** 和 manifest，磁盘完全不变。
  B 仍可重命名/尝试保存且维持未保存状态，没有偷偷清 dirty 或自动刷新。
- B 经真实“文件→打开项目”重开同 W（仅 picker 返回专用 OPFS handle，不启动 OS 选择器），再保存
  `Saved after reopen` 成功；证明 mount 基线不沿用旧会话。最终 errors=[]。
- 本人亲看 `conflict-visible.png` 与 `reopened-save.png`：错误前缀与保留修改提示完整可读、保存/未保存状态正确，场景画布可用。
  不冒称 OS 文件夹选择弹窗、真实用户目录故障或完整 R4 已验；未触碰用户 PAL/浏览器档案。
- 原 6010 服务遇既有依赖缓存错误（react-dom 缺导出 t）；未清缓存/重启它。改在规划内 6011 使用临时配置/cacheDir；
  第二次脚本曾误等 aria-busy='false'（实际完成时移除属性），已据 App 源码/截图只修临时等待，最终完整验证 exit 0。
  失败分别保留 `browser-6010.log`/`browser-wait-fix.log`，不写成产品缺陷或多数通过。自起服务 PID 11788 已停止；原 6010 保留。

### 保持项与后续

旧版本兼容审查：pass（无新增旧格式/升级器/fallback）。content/reforge/game/migrate/projects、pnpm-lock、原探针与
coverage 配置零 diff；不替本卡复核尚未修复的所有审计项。
A-03 持久恢复、A-07 离开保护、D-01 撤销、Q1 dumpSave 误接及完整 R4 仍按台账独立推进。

## 推进签字

### 进入 build 前

- Codex：**premise verified / design agree（2026-09-07，r1 候选）**。直读上述链路与 Web Locks/FSA 一手规范，
  复跑原探针 A-02/A-03 和相邻 51 项。支持先做冲突基线而不造目录事务；可证伪观察为基线采样晚于旧态、
  新增/删路径漏守卫、部分写推进收编外部值、未加载资源误删、PAL 权限回退中的任一项。两席未签前不实现。
- Kimi：**premise verified / design agree（2026-09-07，r1，基线 50590cb6；全部证据本人直读/复跑，未读 GLM 签字）**。
  - **保存链直读**：`App.tsx:567` snapshotRef 初始 null；`:2104-2113` 首存传空 Map、prev 兼作
    落盘日志（按成功 close 逐条推进）；`project-io.ts:398-426` 无 prev 全写/有 prev 增量；
    `:304-332` diffFiles 的 remove = prev 有而 next 无——**全量基线若喂给 diffFiles 必误删未加载
    资源**，设计警告在源码中成立；prev 半写即变、不能兼任不可变打开基线（「仅初始化 prevSnapshot」
    替代解释据此排除）。
  - **打开链直读**：`open-actions.ts:66-137` finishOpen 只对 workspace metadata 与 PAL proof 做
    前后夹验；一般内容由 `fsa-source.ts:36-69` 每次调用重读当前磁盘——普通作者会话确无绑定
    打开时完整内容基线。`saveProjectAs`（:185-218）空目录门+源树拷贝+写后 finishOpen 直读在案。
  - **锁链直读**：`workspace-persistence.ts:177-249` 双 verify + Web Lock 内串行；
    `handle-store.ts:74-117` `navigator.locks` `type-pal-workspace:${id}` exclusive +
    非窗口尾链 fallback（不冒称跨窗口）；`project-io.ts:344/525`、`fsa-copy.ts:65`
    **beginAuthorizedWorkspaceMutation 锁内首写前复验钩子已存在**（现为 identity/policy 校验），
    设计把作者基线验证叠加进同一钩子是正确层、不需新锁；PAL 期望指纹/部分推进纪律
    （:255-330）已存在，设计沿用而非削弱。
  - **A-02 本人复跑**：exit 0——A 存 `Saved by A`、B 旧态写回 `主角` 且 manifest.name=
    `Edited by B`；A 完全结束后 B 再写亦成立（互斥≠旧态检测）。A-03 同探针复现，明确另卡，
    不混入本卡承诺。
  - **相邻基线复跑**：project-io/open-local/open-actions/workspace-persistence **4 文件/51 项
    全绿**，与反例并存——不冒充冲突已被保护。
  - **设计同意**：基线从 loader 实际消费的读取记录签名（editor 私有 FileSource 包装，不改公共
    接口），重复读漂移/前后集合不一致拒绝打开——对应真实打开输入而非事后采样；集合以已读
    manifest/index 推导（登记作者表/共享脚本/SceneIndex/正文/MapIndex/地图原始字节），序列化
    输出对账防漏；懒地图只读原始字节取签名不 hydrate；资源二进制默认不全量 hash、写/删目标
    才查实际 bytes、新增路径须不存在；与 prevSnapshot 分责、不喂 diffFiles；锁内进入与首个
    create/remove 前均检、nested mutation 复用不重入；部分写预期后态只由本次证实成功的写/删
    推导、实际==预期才推进、外部混入拒收编；PAL proof 叠加不削弱；玩家存档隔离/工作区身份/
    界面/地图懒解析/资源格式均不动；A-03/A-07/D-01 明确另卡，无合并/覆盖/旁车/新版本。
  - **可证伪观察**（任一反例即 counter）：① 原树基线已完整入锁且 B 在首写前被拒 → 前提倒
    （探针否定）；② 基线采样晚于旧内存构建（打开期漂移漏检）；③ 基线集合以序列化对账发现
    漏路径（商店/脚本/场景/地图任一类）；④ 全量基线被 diffFiles remove 消费致未加载资源误删；
    ⑤ 部分写后按重扫盘推进、收编外部新值；⑥ PAL 首绑定从待写目标补采 proof 或削弱指纹链；
    ⑦ 移除比较 guard 的隔离负控制仍绿；⑧ 新增路径已有无关文件仍被覆盖。
  - 返工项：无。非阻断备注：打开期作者文本+地图原始字节读取成本须按设计登记测量（PAL 规模），
    设计已限定不 hash 音视频二进制；成本数据在 build 期回执核对。
- GLM：**premise verified / design agree（2026-09-07，r1，独立数据路径/矩阵/范围审查；证据全部本人
  直读/亲跑，未读取 Kimi 签字内容——其签字于本人审查中途落地，本人仅确认席位位置）**。
  独立证据：
  - **A-02 本人复跑**：`probe-editor-persistence.mjs` exit 0——A 保存 `Saved by A` 后 B 以旧态顺序保存，
    磁盘 locale 变回 `主角`、manifest.name=`Edited by B`。**顺序保存即成立，与并发无关**——
    锁只串行化写入、不识别旧快照的前提由反例直接证实。A-03 同脚本输出（悬空引用重开成功）
    仅作边界证据，本卡不承诺修复。相邻 4 文件 **51 项本人复跑全绿**——绿测试与可复现丢更新并存，
    不能当保护已存在的证明 ✓。
  - **现状无基线直读**：App.tsx:567 `snapshotRef` 初始 null、:2104-2113 首存 `?? new Map()` 传空；
    project-io.ts diffFiles（:304-332）`remove = [...prev.keys()].filter(rel => !(rel in next))`
    ——**若把全量磁盘基线当 prev 喂给 diffFiles，每个未加载且不在下一文件集的资源都会被删**。
    设计明令基线与 prevSnapshot 分责、基线不进 diff/remove，此判断经 remove 语义直读证实为必要
    而非风格偏好。
  - **基线采集时机正确性直读**：reforge fsa-source.ts:36-69 的 readText/readJson/readBytes
    **每次调用都读当前磁盘、无读缓存**（仅 urlFor blob 缓存）——加载完成后重新采盘会采到“新答案”
    而非 loader 实际消费的旧输入；设计用 editor 私有 FileSource 包装记录实际读取 + 打开完成前
    一致性验证 + 重复读取变化拒绝，是与此语义匹配的正确机制。finishOpen（open-actions:66-137）
    现仅夹验 metadata 与 PAL proof，无一般内容夹验 ✓ 卡行准确。
  - **锁内挂载点直读**：withAuthorizedWorkspaceMutation（:177-200）同步相位门 + 注册锁 +
    verify→prepare→verify；beginAuthorizedWorkspaceMutation（:315-326）首写前复验；
    recordAuthorizedWorkspaceWriteCompleted（:275-288）逐写记录且 **palExpectedValues 只覆盖
    PAL 受控 JSON 路径**——“PAL 指纹不等价全部作者正文”经直读证实。设计要求的“锁内进入时 +
    真正首个 create/remove 前”双检查点均已有结构可挂载。assertBoundWorkspaceIdentity
    （:457-483）现只核 identity/metadata/模式，无内容基线 ✓。
  - **作者文件集独立枚举（本人从 serializeProject 输出侧数出 8 类）**：①场景正文（SceneIndex 路径）
    ②SceneIndex ③MapIndex ④地图正文（已加载 format / 未加载 copy-through 字节 / 瓦片集上传
    ArrayBuffer）⑤脚本 index + chunks ⑥manifest 登记内容表 ⑦共享脚本 ⑧catalog 登记资源二进制 +
    资源注册表 + manifest。设计基线集合逐项对照：manifest/catalog/作者表/共享脚本/SceneIndex+正文/
    MapIndex+地图原始正文均点名 ✓；**脚本 index+chunks 未逐字点名**（属 manifest 登记作者内容），
    瓦片集上传类同——设计自带 blank/全表/PAL 序列化输出对账是补此缺口的执行机制，本席将其列为
    可证伪观察而非 counter。资源二进制不全量 hash、只对将写/删资源查 bytes + 新路径碰撞规则，
    成本/范围取舍合理。
  - **入口传递枚举**：本地打开/最近（finishOpen→Opened→Booted→App）、绑定保存
    （authorizeBoundWorkspaceTarget→withAuthorizedWorkspaceMutation）、首存 HTTP/PAL/sandbox
    （authorizeFirstSaveTarget + resumesInterruptedAttempt）、另存（saveProjectAs:185-218 空目录门 +
    源树拷贝 + 目标 finishOpen）——设计对每条路径的基线来源/不缺省降级/不移植源基线的规则与
    现有结构一一对应；saveProjectAs 先 copyDirRecursive 再 writeProject，“完成自己的写入后建立
    目标基线”与该结构一致。
  design agree：只读 AuthorDiskBaseline 不入 manifest/payload/handle-store（无 schema 污染）；
  从 loader 实际消费读取记录签名（非采后重读）；全基线比较 + 新增/写/删目标原状态检查（不止
  用户改动表——旧内存可据其他旧表生成新输出）；预期后态只由本次受管写/删推导、dirty 按
  state/version 判定；PAL proof 叠加不扩权；诚实边界（合作锁、比较后 TOCTOU 不冒称 CAS、
  A-03 另卡）。
  可证伪观察：(1) 若基线集合漏掉本席枚举 8 类中任一（尤其脚本 index/chunks、瓦片集上传）而
  blank/全表/PAL 对账仍通过，则对账机制失效，counter；(2) 若基线流入 diffFiles prev/remove
  记账致未加载资源被删，“无误删”行失败；(3) 若基线取自加载后重读而非包装记录，同打开时刻的
  外部变化被静默吸收，“打开时漂移”行失败；(4) 若部分写推进采纳操作后扫盘真值，外部变化被收编，
  “自己保存/重试”行失败；(5) prevSnapshot 仅初始化的替代方案不解决同文件覆盖且半写后自变，
  卡内已正确拒绝。
  非阻断备注：修复后原探针 A-02 断言（旧态保存成功）将失败——探针是修前历史证据，按先例
  不改探针凑绿，正确性回归由正式测试承担。
- 独立前提反证：Kimi/GLM 均已独立读取实际打开/保存/锁链、复跑 A-02 与相邻测试，证据见各席。
- 缺签豁免：无；build 准入：**allowed（Codex，2026-09-07）**。接手 b5420ae5 与 origin/main 同步，
  工作树干净，三席同 r1 premise verified/design agree，无 counter。保持单一 Coding Owner，不把非阻断观察改成新 schema/资源加载能力。

### 进入 done 前

- Codex：**accept（2026-09-07，Coding Owner 实现者自测，非独立审查）**。实际打开/作者保存回归 25 项、
  相邻定向合计 86 项和 PAL 对账通过；完整 check 544 文件/6,353 项与单次严格 fast 611 文件/5,867 项绿；
  精确比较守卫负控制 4 红、完整实现对照 4 绿；真实 Chrome 双页/原生 OPFS/正式 App 保存及同 W 重开验证通过。
  原源码签字前提保持，兼容审查 pass；源文件哈希与回执核定后提交，不代签两席。任一 reviewer 发现遗漏仍可 counter。
- Kimi：pending。
- GLM：pending。
- done 准入：blocked（待两席独立终审与最终验收）；不将已签设计当作实现验收。

## 交接日志

- 2026-09-07 Codex（实现 → review）：已完成 r1，定向/真实链/PAL 文件集/首存恢复边界/完整 check/ratchet/严格 fast
  均有实际证据；原生浏览器双页保全 20 文件、冲突可见且当前修改保留、同 W 重新打开可保存。只读成本测量已登记。
  首存重复授权、同 W App refs 生命周期在实现期钉住；旧脚本分片仍禁止，不复活其输入。同步规范、审计进度、E2E 与覆盖率文档。
  交 Kimi/GLM 并行审同一候选，各写本人席位/日志并提交推送；不重签 r1、不改其他任务、不标 done。
- 2026-09-07 Codex（build 准入）：用户确认“签了”，同步 b5420ae5，核两席签字和文件面后放行。
  先补真实打开/保存回归，再实现作者基线与锁内首写校验；基线/增量快照分责，原探针不改。
  GLM 文件集观察与 Kimi 成本测量纳入验证；不扩 A-03/07/D-01，不提前标 done。
- 2026-09-07 GLM：完成 r1 独立数据路径/矩阵/范围审查，签 premise verified + design agree，无返工项。
  A-02 顺序保存反例本人复跑（exit 0）+ 相邻 51 项绿并存；snapshotRef/diffFiles remove 语义/
  fsaSource 无读缓存/锁内双检查点挂载结构/finishOpen 夹验范围逐点直读；serializeProject 输出侧
  独立枚举 8 类作者文件并与基线集合逐项对照（脚本 index/chunks 与瓦片集上传列可证伪观察）；
  四条入口传递路径与 saveProjectAs 结构核对。五条可证伪观察与探针历史证据备注写入签字块。
  Kimi 签字中途落地，未读其内容。仅更新本人席位与日志；未改产品/他席/任务状态，不开始 build、
  不标 done。Next：三签齐后 Codex 放行 build。
- 2026-09-07 Kimi：完成 r1 独立前提/架构审查，签 premise verified + design agree，无返工项。
  直读保存链（App:567/2104-2113、project-io:304-332/398-426）、打开链（open-actions:66-137、
  fsa-source:36-69、saveProjectAs:185-218）、锁链（workspace-persistence:177-249/315-326、
  handle-store:74-117）——锁内首写前复验钩子 beginAuthorizedWorkspaceMutation 已存在
  （project-io:344/525、fsa-copy:65），设计叠加作者基线验证于同一钩子、不重入锁；PAL 指纹/
  部分推进纪律沿用。复跑 probe-editor-persistence：A-02 顺序覆盖成立（exit 0），A-03 另卡；
  复跑相邻 4 文件/51 项全绿（不冒充已保护）。八条可证伪观察与一条成本测量备注已写入签字块。
  未改产品/他席/状态，未读 GLM 签字。Next：GLM 并行签字；两席齐后 Codex 放行 build。
- 2026-09-07 Codex：前卡已按用户验收归档（50590cb6），开始下一组只读根因与方案；复现 A-02/A-03、相邻 51 项绿。
  拆出本 r1，仅作者冲突检测；中断恢复/离开/撤销另续。没有改产品、原探针或当前内容，未创建恢复旁车。
  Kimi/GLM 并行审本 revision，各自只写自己的签字/日志并提交推送，不变更他席或状态。
  文档工具 20/20 与全仓文档/任务索引检查通过（399 Markdown、139 卡），git diff --check 通过；
  相对 50590cb6 的 packages/scripts/锁文件零改动。未重跑完整 check/coverage，因为本轮未改变实现或覆盖率基线。

## 下一位 Agent 提示词

### Kimi：实现终审（当前，与 GLM 并行）

```text
在 /Users/zhangxu/illegal/type-pal 终审 EDITOR-SAVE-CONFLICT-1。
任务卡 docs/ops/tasks/EDITOR-SAVE-CONFLICT-1-stale-author-snapshot.md，review/r1；候选取卡头 Implementation Candidate，对比 32302e58。r1 设计不重签。
先同步、检查工作树，读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡已签设计/实现回执/最新交接，以及 project-lifecycle 现行规范。不读取或复述 GLM 本轮结论。
独立审真实读取基线而非事后采盘、锁内进入/首写双检查、增量与基线分责、实际 close/remove 后态与中断重试、重复首存授权、同 W Root 重开 refs、PAL 原 proof 不退化、克隆/复制 sink 的完整目标预检。current loader 禁止 content.scripts，不能为旧分片恢复支持。资源写删与新增路径碰撞须有证据，A-03/07/D-01 仍在范围外。
复跑定向 7 文件/86 项、PAL 对账1项、editor typecheck/完整 check（6353）与单次严格 fast（611文件/5867项），重型不并跑、不取多数。独立重建负控制：仅删 author-disk-baseline.ts verifySignatures 的一处比较/throw，聚焦4项应全红、完整对照4绿；临时 config/日志在 /tmp/type-pal-editor-conflict.LYKwVY/。原审计探针不改，其旧必填参数缺失不是独立修复证明。
读原生双页 browser-result.json 与两张截图，先复用已验证证据，只补不确定项；真实 OPFS/FSA/正式 App 保存、20 文件哈希保全、同 W 手动重开再保存已验，非 OS 选择器或完整 R4。核 PAL538路径/77,804,991字节及Node磁盘成本的声明边界。
将本人 accept 或 file:line counter/证据/返工项直接写本人 done 前席位与日志并提交推送；落盘前同步保留他席。不得改实现、他席、任务状态或标 done，不代签；两席落卡后由 Codex 汇总。
```

### GLM：数据/矩阵/范围终审（当前，与 Kimi 并行）

```text
在 /Users/zhangxu/illegal/type-pal 终审 EDITOR-SAVE-CONFLICT-1。
任务卡 docs/ops/tasks/EDITOR-SAVE-CONFLICT-1-stale-author-snapshot.md，review/r1；候选取卡头 Implementation Candidate，对比 32302e58。r1 设计不重签。
先同步、检查工作树，读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡设计/实现回执/最新日志与 coverage 文档。不读取或复述 Kimi 本轮结论，数字从候选树独立生成。
枚举作者路径与所有入口：loader 字节→基线→Opened/Booted/App→授权→实际写删；既有 prevSnapshot 不得被全量基线替换。核空/绑定/PAL首存、重复未消费授权、close/remove失败、外部漂移不收编、dirty保持、同 W 重开新实例及媒体按需hash。设计中提及的旧script分片已被current loader禁止，正式测试应钉拒绝而不是复活它。
复跑定向86项、PAL1项、完整check6353与单次严格fast611文件/5867项；核新增25 fast+1 PAL、538作者路径、资源正文读取0；基线模块分支55/61、行89/93，不冒称100%。独立核一处比较guard负控制4红/完整4绿、首次授权恢复反例先红后绿，临时证据 /tmp/type-pal-editor-conflict.LYKwVY/ 可自行重建。重型串行、不重试取多数、不修改原探针/配置/阈值。
核白名单：产品只editor内部，无runtime/content/迁移/工程/CSS/锁文件变化；基线仅ratchet。阅读双页原生OPFS/FSA与截图证据（20文件哈希保护、B仍可编辑、同W重开后成功），非OS选择器/完整E2E；核成本数字来自Node FileSource而非浏览器时延。
将本人 accept 或 file:line counter/遗漏矩阵/证据直接写本人 done 前席位与日志并提交推送；同步保留他席，不改实现、他席、状态、不标done、不代签。Codex待两席落卡后统一收口，用户不搬运审查正文。
```

### Kimi：设计审查（已完成，历史保留）

```text
在 /Users/zhangxu/illegal/type-pal 审 EDITOR-SAVE-CONFLICT-1。任务卡 docs/ops/tasks/EDITOR-SAVE-CONFLICT-1-stale-author-snapshot.md，draft/r1，产品基线 50590cb6。先同步分支、检查工作树，读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡及链接的现行生命周期/地图懒解析合同。
独立核 A-02 原探针及真实打开/保存/锁链，重点压力测试：如何证明基线对应 loader 的旧输入而非后来磁盘；覆盖作者文件集与懒地图/资源写删；基线和 prevSnapshot 分责；锁内首写前校验；部分写预期推进不得收编他方值；PAL 原权限不能退化。A-03 跨文件持久恢复、A-07 离开保护、D-01 撤销不在本卡。不要读取或复述 GLM 签字，不用方案内部自洽代替独立前提证据。
输出本人 premise verified + design agree（独立证据与可证伪观察），或带 file:line 的 counter/需收窄项，直接写本人席位/日志并提交推送。提交前同步保留他席，不改产品、他席、任务状态，不开始实现、不标 done。若方案关键项仍无法核实则明确 counter，不用泛泛建议放行。
```

### GLM（已完成，历史保留）

```text
在 /Users/zhangxu/illegal/type-pal 审 EDITOR-SAVE-CONFLICT-1。任务卡 docs/ops/tasks/EDITOR-SAVE-CONFLICT-1-stale-author-snapshot.md，draft/r1，产品基线 50590cb6。先同步分支、检查工作树，读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡与链接规范/审计。独立读取源码和复现，不读取或复述 Kimi 签字。
核作者基线路径是否涵盖当前 manifest/canonical 表、共享脚本、SceneIndex/正文、MapIndex/懒地图、待写删资源与新增碰撞；不得把完整基线当 diff/remove Map。枚举 local/sandbox/PAL、打开/最近/HTTP首存/同页失败重试/另存新目标的传递，核失败保 dirty、首写零变更、成功/部分推进不采纳 live 真值、锁作用域及不合作外部写者的承诺边界。相邻定向4文件51项绿不是 A-02 修复证据；原 probe-editor-persistence 可复现 A-02/A-03，后者另卡。
在本人席位写 premise verified + design agree（独立证据/反例）或 file:line counter/遗漏矩阵，更新本人日志并提交推送。只写自己的签字/日志，不改他席/状态/产品，不开始实现、不标 done；同步保留并行改动，不让用户搬运审查正文。
```
