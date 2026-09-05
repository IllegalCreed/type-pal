# 工程与工作区生命周期

类型：现行规范（current）。当前产品为 contentVersion 20 / SAVE8；格式与实现以源码常量和校验器为准。
本页维护已确认合同，已知实现缺陷继续由 [代码审计](../../ops/audits/pre-e2e/summary.md) 跟踪。
原设计、旧版本与当时审查完整保留在 [历史快照](../archive/designs/project-lifecycle-design.md)，不作为当前执行入口。

## 开发期 current-only 边界

- 当前唯一产品格式为 `contentVersion: 20` / SAVE 8 / `minimumSaveVersion: 8`（2026-09-05 起含
  SceneIndex；版本号以 `packages/content/src/character.ts` 为准）。loader、editor、runtime
  和 save codec 只消费这一组 canonical 类型，不按版本选择实现。
- 本项目尚未正式上线；旧 content/save upgrader、旧类型、fixture、sidecar、产品升级入口和兼容 fallback
  已删除。历史版本轴只由 Git 和归档快照保存，不能作为新代码的输入契约。
- `manifest.assets` 只含 catalog 与 roles。HTTP/FSA clone、保存、ZIP、运行和预览都经同一
  `AssetResolver/FileSource` 链；effect sprite 已物化为 56 个 catalog 资产，不再读取 extracted。
- 当前迁移命令从真实提取输入直接生成 current publication，执行三方 merge 与闭包验证，manifest 最后提交；
  它不发布 `_transitions/`、`content/migrations/` 或脚本分片。

## 工作区模式与 PAL 开发快照边界（2026-08-20，current）

`manifest.id` 是工程内容身份，不是一个本地目录、编辑会话或写权限的身份。编辑器启动或打开工程时必须生成
不可变 `WorkspaceContext`，并使用独立 `workspaceId` 区分同一个 `projectId=pal` 派生出的不同目录：

| mode | 用途 | 首次持久化 | 后续保存 | Save As 结果 |
|---|---|---|---|---|
| `pal-development` | E2E 期间正式维护 `projects/pal` | 只允许可信 PAL sentinel 与本次 HTTP 启动关键快照指纹都匹配的目录 | 只写已绑定的同一目录句柄 | 新空目录中的普通 `local-project`，不复制 PAL 权限 |
| `sandbox` | `?ui_samples=1`、评审副本 | 只接受空目录；先写受限 marker，再写工程内容 | 同一句柄且 marker 的 workspace/project identity 都匹配 | 新空目录、新 workspaceId、新 sandbox marker |
| `local-project` | 普通打开、空白工程、从 PAL 开发快照克隆 | HTTP 首存、新建和克隆都只接受空目录 | 只写已绑定句柄 | 新空目录中的普通 `local-project` |

所有实际目录 mutation 都只能接收 policy 预检签发的单次 `AuthorizedWorkspaceTarget`，或它在受控回调内
换得的 `AuthorizedWorkspaceMutation`。顶栏、工程菜单和
`Cmd/Ctrl+S` 使用同一个 `file.save` command；`newBlankProject`、`newFromPal`、Save As、目录复制与
`writeProject` 不能持有绕过 policy 的裸写目标。授权 capability 以模块私有 `WeakMap` 绑定对象 identity
与真实目录，不能通过对象展开、替换字段或把任意目录同时冒充“请求/已绑定目录”来伪造；已绑定保存从
IndexedDB 的 workspace 记录反查同一 FSA entry。`AuthorizedWorkspaceTarget` 只能消费一次：进入写操作前
同步变为不可重入状态，在 workspace 级 Web Lock 内重验并换成仅在回调期间有效的 mutation session，最后
无论成功失败都变为 spent。Save As 的“整树复制 → 工程提交 → recent 登记”属于同一个 compound operation；
第二个标签页必须等前一操作完成登记后再重验，不能交错写盘。首次发现目录 / 首存还要持有全局 discovery
lock；同一个物理 FSA handle 在首写复验和最终登记两处都只能对应一个 `workspaceId`，不能因两个标签页同时
打开无 marker 目录而裂变出两套写权限。recent 登记在 PAL 写后快照复验通过后才提交；IndexedDB 只有
transaction `complete` 才算登记成功，request success 不得提前释放锁。
目录选择器只提供用户授权，不构成目标身份的证明。Save As 还必须拒绝源工程自身及其子目录，避免递归
复制目标本身；源 / 目标关系还要在慢速构建或源文件读取结束后的首个目标 mutation 前再次验证，防止准备
期间目录被移动成源目录后代。目录复制会先完整收集源树文件与空目录，再进行首次目标复验和任何 create。

### 非 canonical identity 旁车

- 评审沙盒使用 `.type-pal/workspace.json`。current-only v1 只接受严格字段
  `kind/version/mode/workspaceId/projectId/source`；marker 只能声明更受限的 `sandbox`，永远不能凭目录内容
  获得 `pal-development` 权限。
- PAL 开发目录使用 `.type-pal/pal-development.json` sentinel。它只证明目录被明确登记为 PAL 开发目标；
  首存仍要同时校验本次启动冻结的关键快照指纹。
- 两个旁车都不进入 manifest/content schema、migration managed set 或 publication。它们属于本地工作区
  元数据；因此不抬 `contentVersion`，也不产生历史 upgrader。
- 整个 `.type-pal` 命名空间都是通用工程写入/删除的保留空间；匹配时按大小写不敏感文件系统归一化首段，
  防止 `.TYPE-PAL` 等别名覆盖旁车。只有 persistence policy 内部的受限 marker bootstrap capability 可以
  创建 sandbox marker，工程序列化、目录复制和 removePaths 都不能覆盖或删除旁车。目录 copy sink 会
  无条件排除该命名空间，不把安全性留给调用方可选参数。
- IndexedDB current v2 以 `workspaceId` 为主键，只是句柄与 recent 加速层。有效 sandbox marker 在清站点
  数据或换浏览器后仍可恢复沙盒身份；marker 与 IDB/manifest/目录句柄冲突时 fail-closed，不能降级为普通
  local 工程。开发期 v1 recent 直接清理，不保留双读兼容债。

Save As 复制目录时必须排除旧 marker 与 PAL sentinel，再按目标 mode 写新 identity。ZIP 导出是只读操作，
会按原目录字节包含旁车；产品当前没有 ZIP importer。所谓 round-trip 仅指外部解压后再打开目录，若复制的
sandbox workspaceId 已绑定另一句柄，必须阻断并要求另存为新评审副本。

### PAL 目标证明

PAL 开发上下文在任何 `ui_samples` 内存投影之前，从可信 HTTP boot source 冻结：

1. PAL sentinel；
2. `manifest.json`；
3. 可信 manifest 指向的 asset catalog；
4. scenes index；
5. maps index（若存在）。

每个 JSON 先 canonicalize（对象键排序、数组保持顺序），再 SHA-256；路径来自可信 boot manifest，不能由待验
目标 manifest 重定向。HTTP PAL 与所选本地 PAL 的 metadata / 受控 proof 都必须在 canonical load 前后
分别一致；任一侧在载入期间变化即拒绝装配会话，防止旧内存获得新目标能力。目录选择结束后做一次只读检查，
并在资源校验、diff、磁盘 catalog 或慢速复制源文件读取都结束之后、首个目标 create/remove 前由 mutation
session 再重验，以关闭准备阶段的 TOCTOU 窗口。任一 marker/文件缺失、JSON 非法、identity 或指纹不符都
拒绝写入。首次成功绑定后，后续增量保存同时要求 recent 反查同一句柄、相符 sentinel，以及与本会话上一次
成功打开/保存后推进的受控指纹一致；外部迁移或另一标签页改变关键快照时，旧会话下一笔写入 fail-closed。
推进值不能在操作结束后直接采纳一次 live reread，而必须由本次编辑器实际成功 close 的受控 JSON 推导预期
post fingerprint，再与落盘实值精确比较。若操作中断，只在 live 受控快照与本次已成功 close 的部分预期完全
相等时推进恢复前提；混入任何外部漂移都不收编。普通 local 首存也只有在本会话至少成功 close 一个文件后，
才允许对同一 handle 续写；仅选择 / 预检过空目录不会获得“中断续存”资格。

这是一组受控关键快照，不声称等价于工程全部 canonical 文件逐字节相等；它的目的，是在浏览器不暴露绝对
路径的前提下同时要求“明确 PAL 开发目录身份”和“本次启动关键索引未漂移”。

### 开发快照不是稳定用户种子

当前 `projects/pal` 是会随 E2E 继续修订的 **PAL 开发快照**。启动页的“从 PAL 克隆”只创建普通本地工程，
不会复制 PAL sentinel 或继承开发写权限，并必须明确提示快照尚未稳定。稳定用户种子只能由未来独立的内容冻结、
验证和 promotion/build 配置显式产出；仅因为 `projects/pal` 存在、当前迁移零差异或某次 E2E 通过，都不能自动
把它宣传成稳定种子。

本地试玩 URL 使用 `workspaceId` 定位句柄、`projectId` 只描述内容/HTTP dev fallback。携带 workspace 的本地
试玩若句柄丢失必须 fail-loud，不能因同名 `projectId=pal` 静默打开仓库 PAL；record.projectId、URL project
与载入后 manifest.id 三者必须一致。没有已绑定句柄的会话不得生成虚假的 workspace play 参数，只能显式
走 HTTP fallback。`?ui_samples=1` 经“打开/最近工程”加载 PAL/local 工程时，只向编辑器暴露新的未绑定
sandbox context，不登记/继承源目录的 PAL 或 local 写权限；打开已有有效 sandbox marker 的目录时可以恢复
并继续绑定该沙盒，保证评审副本可保存、关闭和重开。启动屏的“新建空白工程 / 从 PAL 开发快照创建”本身
选择全新空目录，按写入矩阵直接产出普通 local project，不再先建 local 后二次降格成未绑定 sandbox。
