# 工程与工作区生命周期

Status: current
Owner: Codex（规格维护）
Last reviewed: 2026-11-04
Template: design-spec-v1 / 1.0.0

## 问题与目标

规定打开、编辑、保存、另存、复制、试玩和导出的工作区身份与写权限。manifest.id描述内容工程，不等于目录、会话或写权限；同一projectId=pal可有多个目录，必须由独立workspaceId与可信句柄区分。原R33把现行规范机械历史化，本次恢复明确流程，不把旧验收续作本轮产品接受。

## 真值与约束

工程只消费contentVersion 23 / SAVE12 / minimumSaveVersion 12，见[内容规格](content-schema.md)。SAVE12必需sceneRuntime，位置仍在entityPos，正常返回跑onEnter、读档不重跑；这些是运行态，不新增作者方案。HTTP/FSA克隆、保存、ZIP、运行/预览使用AssetResolver/FileSource；不恢复旧版本upgrader、transition或脚本分片。

[WorkspaceContext](../../../packages/editor/src/core/workspace-context.ts)是不可变会话身份；[persistence policy](../../../packages/editor/src/core/workspace-persistence.ts)以模块私有WeakMap持有一次授权及活动mutation；[AuthorDiskBaseline](../../../packages/editor/src/core/author-disk-baseline.ts)保存loader实际读到的字节证据。它们既不是manifest字段，也不是存档/输出差异表，不能用对象展开或重新扫描新磁盘冒充旧会话证据。

## 方案

### 三种模式与目标

| mode | 可持久化目标 | 后续保存与Save As |
|---|---|---|
| pal-development | 可信PAL sentinel与本次HTTP启动关键快照均匹配的明确开发目录 | 只续写已绑定同句柄；Save As是新空目录普通local-project，不复制PAL权 |
| sandbox | ui_samples/评审副本首次只接受空目录，先写受限marker再写内容 | marker的workspace/project身份与同句柄一致；Save As新workspaceId和新sandbox marker |
| local-project | 普通打开；HTTP首存、新建及PAL快照克隆只接受空目录 | 只续写已绑定句柄；Save As到新空目录普通local-project |

顶栏/菜单/Cmd或Ctrl+S统一file.save；newBlankProject/newFromPal/Save As/目录复制/writeProject不能拿裸目录绕过policy。目标capability进入前同步由ready转verifying，工作区锁内复验，受控回调期间mutation有效，成功/失败最终都spent；嵌套sink只使用活动mutation，不复制正式状态。

Save As准备、完整暂存、校验封存、作者提交和recent登记属于同一compound operation。首次发现/首存还持discovery lock，同一物理handle在首写复验和最终登记不得裂成两workspaceId；IDB只有transaction complete算成功，不按request success提前解锁。

目标不得是源自身/子目录；目录选择不是身份或源/目标关系证明。慢速复制/准备结束后、第一次目标create/remove之前再验；先完整收集文件/空目录清单、私有暂存逐文件、夹验源字节/作者基线/保存状态，才作者create。只读沙盒仍保留原目录来源证据，不因未绑定可写权限绕过关系检查；源读取不在目标锁中嵌套申请源锁。

### 本地身份元数据

- `.type-pal/workspace.json` current v1精确六字段kind/version/mode/workspaceId/projectId/source，只能声明更受限sandbox，不凭内容取得PAL权限。
- `.type-pal/pal-development.json` sentinel只证明明确PAL目标，首存仍需可信HTTP指纹。两旁车不进入manifest/content/publication或迁移managed set，不抬contentVersion。
- 整个.type-pal是保留命名空间。当前isWorkspaceIdentityPath还按首段大小写及末尾空格/点归一化防别名；通用序列化/copy/remove不得覆盖，只有受限marker bootstrap/保存恢复元数据能力可写指定位置。
- IDB current v2以workspaceId为主键，是句柄/recent加速层。有效sandbox marker可在清站点或换浏览器后恢复；marker与IDB/manifest/句柄冲突则fail-closed，不降为普通local。旧开发v1 recent清理，不保留双读。

Save As排除旧marker和PAL sentinel后按目标mode建立新身份。ZIP是只读导出，包含身份旁车；产品没有ZIP importer。外部解压后再打开不是产品导入流程，若同sandbox workspaceId已绑定别句柄，须阻断并另存新副本。

### PAL关键快照与作者基线分层

可信HTTP boot在ui_samples投影之前冻结sentinel、manifest、其asset catalog、scene index和可选map index；路径取可信manifest，不听待验目标重定向。对象键排序、数组保序canonicalize后SHA256；HTTP与本地metadata/proof在canonical load前后夹验，慢速校验/复制结束、首create/remove前再验。

已绑定保存必须由recent反查同FSA entry、匹配sentinel与会话上次受控成功后态。后态只从本次实际成功close/remove推导，再比live；失败部分也只有精确等于本次已知部分后态才可推进恢复前提，不能采纳外部混入的live reread。仅预检空目录不授中断续写资格。

AuthorDiskBaseline另捕获loader真正消费的manifest、作者表/共享脚本、SceneIndex/正文和地图原始字节，打开完成前夹验，不必解析hydrate全部地图。资源按已读catalog的bytes/hash与将写/删目标检查，未知现存新路径拒绝。它与prevSnapshot输出增量分开；同workspace锁内进入操作及首次作者写前比对，冲突零目标写、保留未保存修改，不自动重载/合并/强覆盖。重新打开重建App refs，但mount计数不进入workspaceId或存档地址。

普通保存的输出差异基线在会话首次挂载、用户编辑前捕获，首次保存时按同一作者序列化规则求值；不能用点击保存时的已编辑态冒充已保存态。catalog未变的普通保存中，未修改的正文保持磁盘原字节，不因loader规范化、对象键顺序或by-id投影而重写。每次保存同时冻结主/脚本作者态及地图脏状态；干净地图即使已为画布加载，仍使用打开时或上次已保存的原文，只有新增或实际编辑的地图输出当前副本。保存期间的新修改留待下一笔，成功close/remove才推进该笔输出比较态；确切磁盘冲突与恢复证明仍由作者基线和封存计划独立持有。

首次绑定已有PAL开发目录与复制新工程分开：经既有sentinel、关键快照和完整作者基线授权后，按输出差异构建保存计划，不复制未改资产；HTTP作者字节/保存状态夹验及首次目标全部资源的hash、格式校验仍执行，缺失或损坏明确失败，不从HTTP静默修补。普通HTTP/新建工程的空目标首存、PAL克隆和Save As仍完整复制正文及资源。磁盘catalog与目标catalog不一致时，writer仍按既有恢复边界强制刷写catalog及相关内容引用表，再按发布顺序收缩catalog和删除文件；本轮不把它改为仅依赖内存diff。增量不免除整工程引用校验，也不放宽浏览器安全保护。

### 保存恢复、读边界与离开保护

普通保存、空白/HTTP首存、PAL克隆和另存共用持久协调器：完整目标/删除/空目录先暂存并回读，真实浏览器句柄与身份凭据封ready后才发布pending、写作者路径。恢复只重放封存计划，不依赖旧页面回调或重读复制源；清理失败不等于内容未保存。复制原资源不混入编辑差异清单，避免下次误删；UI区分准备保存/正在保存。

本地试玩初装配和ZIP采集持读锁并夹验保存状态，pending/坏状态/读取中换代拒绝，读出口不自动恢复。ZIP只排根.type-pal/save-recovery暂存子树，保留committed状态、旁车和用户文件；不保证已运行试玩未来懒加载永远同代。

新建/打开前统一检查主编辑与脚本两session。取消/保存失败保留原会话及历史；保存后继续与放弃绑定各自点击，后台新改不替换选择，继续打开重新点击启动选夹。另存后原会话若又改，保留原会话并说明副本已保存。新建/打开/保存/另存/导出同步互斥；beforeunload仅请求原生确认，不在卸载时异步保存，强杀及未入session草稿不承诺恢复。A-07不等于D-01全局历史顺序已修。

### 开发快照与试玩地址

projects/pal是仍随E2E修订的开发快照，PAL克隆只创建local工程，不复制sentinel或开发写权。稳定用户种子须未来独立冻结/验证/promotion，不由工程存在、迁移零diff或单段E2E自动认证。

本地play URL用workspaceId定位句柄，projectId只描述内容/明确HTTP fallback；带workspace而句柄丢失须fail-loud，record.projectId/URL project/manifest.id一致，不静默打开同名仓库PAL。未绑定会话不得伪造workspace play参数。ui_samples打开PAL/local只暴露新未绑定sandbox；已有有效sandbox marker才恢复绑定。启动屏新建空白/PAL快照创建按矩阵直接选空目录生成local，不先local再二次降级。

## 边界与风险

这不是文件夹级事务，不锁其他浏览器/OS写入，检查后非合作写不保证原子CAS；PAL关键proof也不等全工程字节相等。规则与实现缺口分开，原[冲突保护卡](../../tasks/archive/done/EDITOR-SAVE-CONFLICT-1-stale-author-snapshot.md)、[恢复卡](../../tasks/archive/done/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md)和[A-07回执](../../testing/archive/legacy/editor/editor-workflows/editor-leave-guard.md)只承载当时范围。

2026-10-24核context/marker/关键proof、单次mutation和作者读源baseline切片，未完整审所有FSA/IDB/恢复/ZIP/UI分支，未选真实目录或写用户数据。2026-11-04增量保存修复范围与独立实页结果由[当前任务卡](../../tasks/cards/E2E-R4-1-route-and-checkpoint-foundation.md#2026-11-04-基线收尾与逐脚本复核准入)维护；减少无关写入不等于已经证明某次Safe Browsing拦截的原因或解决。遇新事实冲突先停相关claim，不由文档改产品、放宽policy或恢复旧compat。

## 验收

静态oracle是project/workspace/target/baseline四身份不混、关键守卫与公开来源对应、原quote与源SHA可逆、导航和模板有效。运行oracle应覆盖真实同句柄续存、伪造/重入/冲突/中断恢复、Save As源后代、IDB complete及读锁换代等合法和反例；2026-10-24文档审计未执行，旧三席/用户验收不代签后继实跑。增量保存另核首笔侧车变化不触碰未改正文/资产、干净地图加载与新增/修改地图、保存途中继续编辑、完整另存重开及PAL首次资源/来源失败，具体执行身份与限制归当前任务原件。

本篇等待未参与者据实际diff/读域/保全接受；作者不自行恢复content-reviewed/template-compliant，硬门未过不合main、不标done。

## 历史范围

R33登记2026-08-20，原稿另含09-07冲突保护、09-13恢复/离开保护和SAVE12补充；固定0d5311075b4f5e67362d1953a138d678c0a4aa42，不能把登记日当全篇失效日。

## 原始结论

manifest.id不是工作区写权，三mode矩阵、一次capability、关键proof/作者baseline分轴及开发快照边界原已明确；机械历史化不撤销它们。旧R33行数式接受被撤回，旧SAVE11摘要不决定当前版本。

## 当时证据

原cd3de679、A-03/A-07三席与用户验收、保存/性能/E2E剩余项保留在quote和原卡。本次没有重跑或把它们标为当前执行通过，也不恢复固定三签。

## 当前有效性

适用当前产品合同：contentVersion 23 / SAVE12 / minimumSaveVersion 12。

工程生命周期规范current，history overlay只保存原结论与日期；静态核读不足以证明所有目录写入/恢复及当前UI完全合规。

## 继任文档

[内容格式](content-schema.md)、[作者脚本](script-system.md)、[存档](save-system.md)各有唯一职责；[原设计快照](../archive/designs/project-lifecycle-design.md)只查历史，当前缺陷回[审计汇总](../../tasks/audits/pre-e2e/summary.md)与获准任务。

## 原文保全

固定原源revision `0d5311075b4f5e67362d1953a138d678c0a4aa42`及source SHA见唯一review记录。marker至EOF对本批基点逐字节保持；逆回只剥每行 `> ` / 空行裸 `>`，精确排除end marker前恰一个未引用分隔LF后等固定原源，不trim或全局替换。原稿中的current说明原合同，旧执行仍只按其日期读取。
<!-- original-source-quote:start -->
> # 工程与工作区生命周期
>
> 类型：现行规范（current）。当前产品为 contentVersion 22 / SAVE12；格式与实现以源码常量和校验器为准。
> 本页维护已确认合同，已知实现缺陷继续由 [代码审计](../../ops/audits/pre-e2e/summary.md) 跟踪。
> 原设计、旧版本与当时审查完整保留在 [历史快照](../archive/designs/project-lifecycle-design.md)，不作为当前执行入口。
>
> ## 开发期 current-only 边界
>
> - 当前唯一产品格式为 `contentVersion: 22` / SAVE12 / `minimumSaveVersion: 12`（2026-09-05 起含
>   SceneIndex；版本号以 `packages/content/src/character.ts` 为准）。loader、editor、runtime
>   和 save codec 只消费这一组 canonical 类型，不按版本选择实现。
> - 本项目尚未正式上线；旧 content/save upgrader、旧类型、fixture、sidecar、产品升级入口和兼容 fallback
>   已删除。历史版本轴只由 Git 和归档快照保存，不能作为新代码的输入契约。
> - SAVE12必需`sceneRuntime`，与`world.script.entityPos`同步保存NPC现场及自动续跑进度；正常离场暂停、
>   返回恢复后仍运行当前`onEnter`，读档则不重跑`onEnter`。这是引擎运行态，不新增作者状态方案或剧情阶段；
>   详见[当前存档合同](save-system.md)。旧E2E档必须正常重跑生成，旧回执保留其原版本与结论。
> - `manifest.assets` 只含 catalog 与 roles。HTTP/FSA clone、保存、ZIP、运行和预览都经同一
>   `AssetResolver/FileSource` 链；effect sprite 已物化为 56 个 catalog 资产，不再读取 extracted。
> - 当前迁移命令从真实提取输入直接生成 current publication，执行三方 merge 与闭包验证，manifest 最后提交；
>   它不发布 `_transitions/`、`content/migrations/` 或脚本分片。
>
> ## 工作区模式与 PAL 开发快照边界（2026-08-20，current）
>
> `manifest.id` 是工程内容身份，不是一个本地目录、编辑会话或写权限的身份。编辑器启动或打开工程时必须生成
> 不可变 `WorkspaceContext`，并使用独立 `workspaceId` 区分同一个 `projectId=pal` 派生出的不同目录：
>
> | mode | 用途 | 首次持久化 | 后续保存 | Save As 结果 |
> |---|---|---|---|---|
> | `pal-development` | E2E 期间正式维护 `projects/pal` | 只允许可信 PAL sentinel 与本次 HTTP 启动关键快照指纹都匹配的目录 | 只写已绑定的同一目录句柄 | 新空目录中的普通 `local-project`，不复制 PAL 权限 |
> | `sandbox` | `?ui_samples=1`、评审副本 | 只接受空目录；先写受限 marker，再写工程内容 | 同一句柄且 marker 的 workspace/project identity 都匹配 | 新空目录、新 workspaceId、新 sandbox marker |
> | `local-project` | 普通打开、空白工程、从 PAL 开发快照克隆 | HTTP 首存、新建和克隆都只接受空目录 | 只写已绑定句柄 | 新空目录中的普通 `local-project` |
>
> 所有实际目录 mutation 都只能接收 policy 预检签发的单次 `AuthorizedWorkspaceTarget`，或它在受控回调内
> 换得的 `AuthorizedWorkspaceMutation`。顶栏、工程菜单和
> `Cmd/Ctrl+S` 使用同一个 `file.save` command；`newBlankProject`、`newFromPal`、Save As、目录复制与
> `writeProject` 不能持有绕过 policy 的裸写目标。授权 capability 以模块私有 `WeakMap` 绑定对象 identity
> 与真实目录，不能通过对象展开、替换字段或把任意目录同时冒充“请求/已绑定目录”来伪造；已绑定保存从
> IndexedDB 的 workspace 记录反查同一 FSA entry。`AuthorizedWorkspaceTarget` 只能消费一次：进入写操作前
> 同步变为不可重入状态，在 workspace 级 Web Lock 内重验并换成仅在回调期间有效的 mutation session，最后
> 无论成功失败都变为 spent。Save As 的“整笔暂存 → 校验封存 → 工程提交 → recent 登记”属于同一个 compound operation；
> 第二个标签页必须等前一操作完成登记后再重验，不能交错写盘。首次发现目录 / 首存还要持有全局 discovery
> lock；同一个物理 FSA handle 在首写复验和最终登记两处都只能对应一个 `workspaceId`，不能因两个标签页同时
> 打开无 marker 目录而裂变出两套写权限。recent 登记在 PAL 写后快照复验通过后才提交；IndexedDB 只有
> transaction `complete` 才算登记成功，request success 不得提前释放锁。
> 目录选择器只提供用户授权，不构成目标身份的证明。Save As 还必须拒绝源工程自身及其子目录，避免递归
> 复制目标本身；源 / 目标关系还要在慢速构建或源文件读取结束后的首个目标 mutation 前再次验证，防止准备
> 期间目录被移动成源目录后代。目录复制先完整收集文件/空目录清单，逐文件写入私有暂存，
> 源字节、源作者基线与保存状态夹验通过后才封存，再进行首次作者目标复验和作者 create。
> 源读取不在目标锁内嵌套申请源工作区锁。只读沙盒检视也保留原始目录的只读来源证据，
> 不能因没有可写绑定而绕过“禁止目标为源的子目录”的检查。
>
> ### 非 canonical identity 旁车
>
> - 评审沙盒使用 `.type-pal/workspace.json`。current-only v1 只接受严格字段
>   `kind/version/mode/workspaceId/projectId/source`；marker 只能声明更受限的 `sandbox`，永远不能凭目录内容
>   获得 `pal-development` 权限。
> - PAL 开发目录使用 `.type-pal/pal-development.json` sentinel。它只证明目录被明确登记为 PAL 开发目标；
>   首存仍要同时校验本次启动冻结的关键快照指纹。
> - 两个旁车都不进入 manifest/content schema、migration managed set 或 publication。它们属于本地工作区
>   元数据；因此不抬 `contentVersion`，也不产生历史 upgrader。
> - 整个 `.type-pal` 命名空间都是通用工程写入/删除的保留空间；匹配时按大小写不敏感文件系统归一化首段，
>   防止 `.TYPE-PAL` 等别名覆盖旁车。只有 persistence policy 内部的受限 marker bootstrap capability 可以
>   创建 sandbox marker，工程序列化、目录复制和 removePaths 都不能覆盖或删除旁车。目录 copy sink 会
>   无条件排除该命名空间，不把安全性留给调用方可选参数。保存协调器另有受限的恢复元数据能力，
>   只用于固定保存状态文件与本次 operation 的已核暂存文件，不向通用写接口开放该命名空间。
> - IndexedDB current v2 以 `workspaceId` 为主键，只是句柄与 recent 加速层。有效 sandbox marker 在清站点
>   数据或换浏览器后仍可恢复沙盒身份；marker 与 IDB/manifest/目录句柄冲突时 fail-closed，不能降级为普通
>   local 工程。开发期 v1 recent 直接清理，不保留双读兼容债。
>
> Save As 复制目录时必须排除旧 marker 与 PAL sentinel，再按目标 mode 写新 identity。ZIP 导出是只读操作，
> 会按原目录字节包含旁车；产品当前没有 ZIP importer。所谓 round-trip 仅指外部解压后再打开目录，若复制的
> sandbox workspaceId 已绑定另一句柄，必须阻断并要求另存为新评审副本。
>
> ### PAL 目标证明
>
> PAL 开发上下文在任何 `ui_samples` 内存投影之前，从可信 HTTP boot source 冻结：
>
> 1. PAL sentinel；
> 2. `manifest.json`；
> 3. 可信 manifest 指向的 asset catalog；
> 4. scenes index；
> 5. maps index（若存在）。
>
> 每个 JSON 先 canonicalize（对象键排序、数组保持顺序），再 SHA-256；路径来自可信 boot manifest，不能由待验
> 目标 manifest 重定向。HTTP PAL 与所选本地 PAL 的 metadata / 受控 proof 都必须在 canonical load 前后
> 分别一致；任一侧在载入期间变化即拒绝装配会话，防止旧内存获得新目标能力。目录选择结束后做一次只读检查，
> 并在资源校验、diff、磁盘 catalog 或慢速复制源文件读取都结束之后、首个目标 create/remove 前由 mutation
> session 再重验，以关闭准备阶段的 TOCTOU 窗口。任一 marker/文件缺失、JSON 非法、identity 或指纹不符都
> 拒绝写入。首次成功绑定后，后续增量保存同时要求 recent 反查同一句柄、相符 sentinel，以及与本会话上一次
> 成功打开/保存后推进的受控指纹一致；外部迁移或另一标签页改变关键快照时，旧会话下一笔写入 fail-closed。
> 推进值不能在操作结束后直接采纳一次 live reread，而必须由本次编辑器实际成功 close 的受控 JSON 推导预期
> post fingerprint，再与落盘实值精确比较。若操作中断，只在 live 受控快照与本次已成功 close 的部分预期完全
> 相等时推进恢复前提；混入任何外部漂移都不收编。普通 local 首存的持久续写必须持有原浏览器可信凭据与
> 完整封存目标；ready 阶段尚无作者 close 也可以恢复。仅选择 / 预检过空目录不会获得“中断续存”资格，
> 未完整暂存的输入也不能被新页面当作完整保存重放。
>
> 这是一组受控关键快照，不声称等价于工程全部 canonical 文件逐字节相等；它的目的，是在浏览器不暴露绝对
> 路径的前提下同时要求“明确 PAL 开发目录身份”和“本次启动关键索引未漂移”。
>
> ### 作者文件冲突保护（EDITOR-SAVE-CONFLICT-1，2026-09-07 已验收）
>
> 实现与验收状态见[任务卡](../../ops/archive/tasks/done/EDITOR-SAVE-CONFLICT-1-stale-author-snapshot.md)。
> 作者会话持有独立 `AuthorDiskBaseline`，不与用于输出增量/删除的 `prevSnapshot` 混用：
>
> - 本地和 HTTP 编辑器载入由私有 FileSource 包装记录实际读取字节的 SHA-256/长度；打开完成前夹验，
>   再经 Opened/Booted 传入 App。基线不是载入旧内存后重扫磁盘得到的新答案。
> - 现行作者表/共享脚本、SceneIndex/正文、MapIndex/地图原始字节均纳入；不全量解析或 hydrate 地图。
>   媒体资源不默认全量读取；即将写/删的资源按已读 catalog 的完整 bytes/hash 检查，新路径已有未知文件则拒绝。
>   当前 loader 仍拒绝 `content.scripts`，不会为基线采集复活旧脚本分片入口。
> - 身份 policy 验证之外，在同一 workspace 锁内进入操作及真正首个 create/remove 前比较作者基线；
>   冲突时零目标写入并通过现有错误区反馈，保留当前未保存修改，不自动重载、合并或强制覆盖。
> - 新 local/sandbox 空目标用空基线起步；PAL 首次写入原目录必须提供 HTTP 载入时的作者基线并保留原 proof。
>   后态只由本次已证实成功的 close/remove 推导；实际与完整预期一致后才推进，不能采纳外部混入的磁盘变化。
>   同一首存上下文/目录的重复授权复用已有恢复基线，不让未消费的授权抹掉此前记录。
> - 重新打开同一工作区会创建新的 App 实例以重建会话 refs；该 mount 计数不进入 workspaceId、导航键或玩家存档地址。
>
> 本机制不是文件夹级事务，也不锁住其他浏览器/OS 工具；比较后发生的非合作写入不能承诺原子 CAS。
> 跨刷新持久恢复与部分发布修复已按下节 A-03 验收；离开保护见下节 A-07，撤销顺序仍按 D-01 跟踪。
>
> ### 保存中断恢复与复制读边界（A-03，2026-09-13 已验收）
>
> 实施/测试见[EDITOR-SAVE-RECOVERY-1](../../ops/archive/tasks/done/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md)，
> 候选 cd3de679 已三席终审及用户验收通过；性能与集中 E2E 剩余边界见[收口记录](../../testing/archive/legacy/editor/save-and-recovery/editor-save-recovery-closeout.md)。
> 普通保存、空白/HTTP 首存、PAL 克隆与另存为共用同一持久协调器：完整目标字节、删除和空目录
> 先落私有暂存并回读校验，原浏览器的真实句柄/身份凭据封为 ready 后，才能发布 pending 并写作者路径。
> 清理失败与内容未保存分开反馈；恢复只重放已封存计划，不依赖旧页面回调或再次访问复制源。
> 另存为将源复制与当前编辑覆盖、删除合成一份计划；复制的原始素材不进入编辑差异清单，避免下一次保存误删。
> HTTP 首存/PAL 克隆的资源逐文件流转，复制准备和落盘进度分别显示“准备保存／正在保存”。
>
> 本地试玩初始装配与 ZIP 采集持目录读锁并夹验保存状态；pending、坏状态、读取期间换代拒绝，读出口不自动恢复。
> ZIP 仅排除根 `.type-pal/save-recovery` 暂存子树，保留 committed 状态、原身份旁车和其他用户文件。
> 这些约束覆盖本次打开/复制/导出，不保证已经运行的试玩与将来的懒加载永久来自同一个版本，也不是文件系统原子 CAS。
>
> ### 未保存修改的离开保护（A-07，2026-09-13 已收口）
>
> [A-07 验证](../../testing/archive/legacy/editor/editor-workflows/editor-leave-guard.md)已三席终审，用户授权收口。新建/打开前统一检查主编辑与脚本两份session；
> 有未保存修改时选择取消、明确放弃或先保存。取消/失败保留原会话与历史，异步完成后重验当前请求和修改版本。
> “已保存后继续”与“放弃修改”绑定各自点击选择，不能因后台新修改而互相解释；继续打开必须重新点击启动选夹。
> 另存为后若原会话又有新修改，保留原会话并告知副本已保存，不丢弃这些新修改。新建/打开/保存/另存/导出统一同步互斥。
> beforeunload请求浏览器原生确认，不在卸载事件内启动异步保存；强杀与未提交到session的领域草稿不作恢复承诺。
> 本机制不改A-02/A-03保存协议，也不表示D-01全局历史顺序已修复。
>
> ### 开发快照不是稳定用户种子
>
> 当前 `projects/pal` 是会随 E2E 继续修订的 **PAL 开发快照**。启动页的“从 PAL 克隆”只创建普通本地工程，
> 不会复制 PAL sentinel 或继承开发写权限，并必须明确提示快照尚未稳定。稳定用户种子只能由未来独立的内容冻结、
> 验证和 promotion/build 配置显式产出；仅因为 `projects/pal` 存在、当前迁移零差异或某次 E2E 通过，都不能自动
> 把它宣传成稳定种子。
>
> 本地试玩 URL 使用 `workspaceId` 定位句柄、`projectId` 只描述内容/HTTP dev fallback。携带 workspace 的本地
> 试玩若句柄丢失必须 fail-loud，不能因同名 `projectId=pal` 静默打开仓库 PAL；record.projectId、URL project
> 与载入后 manifest.id 三者必须一致。没有已绑定句柄的会话不得生成虚假的 workspace play 参数，只能显式
> 走 HTTP fallback。`?ui_samples=1` 经“打开/最近工程”加载 PAL/local 工程时，只向编辑器暴露新的未绑定
> sandbox context，不登记/继承源目录的 PAL 或 local 写权限；打开已有有效 sandbox marker 的目录时可以恢复
> 并继续绑定该沙盒，保证评审副本可保存、关闭和重开。启动屏的“新建空白工程 / 从 PAL 开发快照创建”本身
> 选择全新空目录，按写入矩阵直接产出普通 local project，不再先建 local 后二次降格成未绑定 sandbox。

<!-- original-source-quote:end -->
