# EDITOR-SAVE-CONFLICT-1 - 编辑器旧快照保存冲突保护

Status: draft
Phase: phase2
Capability: ops（审计 A-02 修复，不新增能力格）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main
Revision: r1（2026-09-07，前提取证与设计候选；未实现）
Evidence Baseline: 50590cb6

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

## 推进签字

### 进入 build 前

- Codex：**premise verified / design agree（2026-09-07，r1 候选）**。直读上述链路与 Web Locks/FSA 一手规范，
  复跑原探针 A-02/A-03 和相邻 51 项。支持先做冲突基线而不造目录事务；可证伪观察为基线采样晚于旧态、
  新增/删路径漏守卫、部分写推进收编外部值、未加载资源误删、PAL 权限回退中的任一项。两席未签前不实现。
- Kimi：pending（独立前提/架构与失败边界）。
- GLM：pending（独立数据路径/矩阵与范围）。
- 独立前提反证：待 Kimi/GLM 至少一席直接读取并给出自己的证据/反例。
- 缺签豁免：无；build 准入：blocked（仅三签未齐，任务处于 draft）。

### 进入 done 前

- Codex：pending。
- Kimi：pending。
- GLM：pending。
- done 准入：blocked；实现、正式回归和最小功能尚未开始。

## 交接日志

- 2026-09-07 Codex：前卡已按用户验收归档（50590cb6），开始下一组只读根因与方案；复现 A-02/A-03、相邻 51 项绿。
  拆出本 r1，仅作者冲突检测；中断恢复/离开/撤销另续。没有改产品、原探针或当前内容，未创建恢复旁车。
  Kimi/GLM 并行审本 revision，各自只写自己的签字/日志并提交推送，不变更他席或状态。
  文档工具 20/20 与全仓文档/任务索引检查通过（399 Markdown、139 卡），git diff --check 通过；
  相对 50590cb6 的 packages/scripts/锁文件零改动。未重跑完整 check/coverage，因为本轮未改变实现或覆盖率基线。

## 下一位 Agent 提示词

### Kimi（与 GLM 并行）

```text
在 /Users/zhangxu/illegal/type-pal 审 EDITOR-SAVE-CONFLICT-1。任务卡 docs/ops/tasks/EDITOR-SAVE-CONFLICT-1-stale-author-snapshot.md，draft/r1，产品基线 50590cb6。先同步分支、检查工作树，读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡及链接的现行生命周期/地图懒解析合同。
独立核 A-02 原探针及真实打开/保存/锁链，重点压力测试：如何证明基线对应 loader 的旧输入而非后来磁盘；覆盖作者文件集与懒地图/资源写删；基线和 prevSnapshot 分责；锁内首写前校验；部分写预期推进不得收编他方值；PAL 原权限不能退化。A-03 跨文件持久恢复、A-07 离开保护、D-01 撤销不在本卡。不要读取或复述 GLM 签字，不用方案内部自洽代替独立前提证据。
输出本人 premise verified + design agree（独立证据与可证伪观察），或带 file:line 的 counter/需收窄项，直接写本人席位/日志并提交推送。提交前同步保留他席，不改产品、他席、任务状态，不开始实现、不标 done。若方案关键项仍无法核实则明确 counter，不用泛泛建议放行。
```

### GLM（与 Kimi 并行）

```text
在 /Users/zhangxu/illegal/type-pal 审 EDITOR-SAVE-CONFLICT-1。任务卡 docs/ops/tasks/EDITOR-SAVE-CONFLICT-1-stale-author-snapshot.md，draft/r1，产品基线 50590cb6。先同步分支、检查工作树，读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡与链接规范/审计。独立读取源码和复现，不读取或复述 Kimi 签字。
核作者基线路径是否涵盖当前 manifest/canonical 表、共享脚本、SceneIndex/正文、MapIndex/懒地图、待写删资源与新增碰撞；不得把完整基线当 diff/remove Map。枚举 local/sandbox/PAL、打开/最近/HTTP首存/同页失败重试/另存新目标的传递，核失败保 dirty、首写零变更、成功/部分推进不采纳 live 真值、锁作用域及不合作外部写者的承诺边界。相邻定向4文件51项绿不是 A-02 修复证据；原 probe-editor-persistence 可复现 A-02/A-03，后者另卡。
在本人席位写 premise verified + design agree（独立证据/反例）或 file:line counter/遗漏矩阵，更新本人日志并提交推送。只写自己的签字/日志，不改他席/状态/产品，不开始实现、不标 done；同步保留并行改动，不让用户搬运审查正文。
```
