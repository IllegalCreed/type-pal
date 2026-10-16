# 存档系统设计(save-system)

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: design-spec-v1 / 1.0.0

本页把历史设计正文接入 `design-spec-v1`，并保留 archive overlay。原始日期、方案语义、版本数字、冲突、未知项和链接均通过下方逐行引用保全；本页不授予当前产品、runtime、E2E、视觉或 coverage 信用。

## 问题与目标

- 历史设计问题/目标：顶部保留 SAVE8/content20 当前快照；历史 v1 定三块存储、SaveMeta/Payload、IndexedDB、30 slots/分页、缩略图、版本迁移、错误处理与分期。
- 文档身份：phase2 / archive；原始状态为 `archived`，当前有效性固定为 `historical`。
- 本次目标：让历史设计具备可检索的设计章节和历史边界，不把当时方案改写成当前合同。

## 真值与约束

- 固定源 revision：`45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA：`e345ba95b310253f3e98214abdca1e4e3d40ea2cd2eb6c7f86493ab0992f035c`；原文 188 行、9759 bytes。
- 一手来源/正文锚点：packages/reforge/src/save/types.ts:1-1; packages/reforge/src/save/current-codec.ts:1-1; packages/reforge/src/save/current-save.current-characterization.test.ts:1-1; packages/content/src/character.ts:1-1；标题锚点：4:存档系统设计(save-system), 9:当前实现：SAVE8 / content20（2026-09-05）, 28:# 当前读档边界, 43:# 角色临时状态的 restore 边界, 49:# 实现锚点, 60:历史 v1 设计（字段示例已被 SAVE 8 supersede）, 62:目标(用户需求), 73:核心架构:三块分离存储。
- 当前阶段证据：本批只做文档全文读取、语义分层和字节保全；current contract 必须回读继任规范、当前代码和真实调用域。
- 不可违反的约束：历史状态词只描述原文时点；旧 schema、迁移计划、done/待审标签和演出设想不得单独证明今天的实现。
- 未知与冲突：
- 当前段落已落后于 current SAVE12/content22；历史 v1 的 30 槽/字段、迁移和截图流程不可作为当前合同。
- 保存恢复、临时状态清理和 codec 以 current save spec/source 为唯一 owner。

## 方案

- 原始方案语义：顶部保留 SAVE8/content20 当前快照；历史 v1 定三块存储、SaveMeta/Payload、IndexedDB、30 slots/分页、缩略图、版本迁移、错误处理与分期。
- 本次治理方案：将上述语义拆入问题、真值、方案、边界、验收五个可定位章节；原文不删节，以 quote 作为唯一完整正文保全层。
- 继任关系：
- docs/phase2/specs/save-system.md
- 当前 packages/reforge save codec/loader
- 当前 save/recovery tests
- 明确不做：不执行原文迁移/实现步骤，不恢复 legacy fallback，不把历史计划、Self-Review 或静态审计当作 runtime/E2E/视觉/coverage 结果。

## 边界与风险

- 历史边界：本文可以说明当时为什么设计、如何计划和哪些问题已被识别，不能替代当前 canonical 文档、源码、测试或用户裁决。
- 主要冲突/风险：
- 当前段落已落后于 current SAVE12/content22；历史 v1 的 30 槽/字段、迁移和截图流程不可作为当前合同。
- 保存恢复、临时状态清理和 codec 以 current save spec/source 为唯一 owner。
- 停止线：不得按 SAVE8/v1 示例改存档、运行迁移或宣称存档/E2E 通过；只能引用 current save spec、源码和受保护测试。
- 若重新启用：必须以当前一手来源重新核对 schema、版本、调用方、合法输入和业务 oracle，并建立新的 review record；不得沿用本页日期作准入。

## 验收

- 可执行验证：模板章节完整；原文 quote 去除 `> ` 前缀后与 source UTF-8 字节逐字节相等；source/after SHA 写入 central review、registry、catalog 和 evidence receipt。
- 业务 oracle：历史结论、日期、状态、数字、链接、未知和冲突可定位；任何当前性主张都有继任入口或明确停止线。
- 本次执行范围：只读源、模板迁移、账本同步和静态治理门；runtime、E2E、视觉、coverage 均未运行。
- 复核 Owner 与截止条件：Codex 独立复核本页及三账本；非作者候选验收通过前保持 build/review，不标全量完成。

## 历史范围

- 原始范围：phase2 archive design；固定来源 `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，原始正文 SHA `e345ba95b310253f3e98214abdca1e4e3d40ea2cd2eb6c7f86493ab0992f035c`，原文日期和版本轴以 quote 为准。
- 归档原因：正文混合历史设计、阶段计划和后来附录；继任规范/代码已经承担当前合同，故本页只保留历史证据。

## 原始结论

- 存档系统设计(save-system)：这是 design-spec，当前文档状态为 historical。全文 189 行、19 个标题；摘要/首段为「> **归档快照**：以下完整保留搬迁前的设计和增量记录；不再维护现行合同。」。属于历史/归档材料，不能单独证明当前实现。
- 上述结论只属于其原始日期和适用范围；本页新增的结构化表述不改变原始结论。

## 当时证据

- source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `e345ba95b310253f3e98214abdca1e4e3d40ea2cd2eb6c7f86493ab0992f035c`；全文 188 行 / 9759 bytes。
- 原文标题/章节锚点：4:存档系统设计(save-system), 9:当前实现：SAVE8 / content20（2026-09-05）, 28:# 当前读档边界, 43:# 角色临时状态的 restore 边界, 49:# 实现锚点, 60:历史 v1 设计（字段示例已被 SAVE 8 supersede）, 62:目标(用户需求), 73:核心架构:三块分离存储。完整正文与链接、表格、代码、历史状态词在下方 quote 保留。

## 当前有效性

historical。不得将历史设计字段、迁移步骤、旧版本号、done/待审标签或静态审计结果外推为当前事实。
- 当前不得外推的部分：不得按 SAVE8/v1 示例改存档、运行迁移或宣称存档/E2E 通过；只能引用 current save spec、源码和受保护测试。

## 继任文档

- 当前 canonical / 复核入口：docs/phase2/specs/save-system.md, 当前 packages/reforge save codec/loader, 当前 save/recovery tests。
- supersedes / superseded-by：本页保留旧结构化记录作为历史；当前合同由继任规范、代码和新的独立审查记录决定。
- 重新启用条件：新的 primary source、版本/适用范围、合法输入、business oracle、可证伪观察和独立验收齐备。

## 原文保全

固定源 SHA `e345ba95b310253f3e98214abdca1e4e3d40ea2cd2eb6c7f86493ab0992f035c`；以下 quote 只增加 Markdown blockquote 前缀，逆回读必须得到相同 UTF-8 字节。
<!-- original-source-quote:start -->
> > **归档快照**：以下完整保留搬迁前的设计和增量记录；不再维护现行合同。
> > 当前规范见 [当前存档合同](../../specs/save-system.md)。旧状态、版本与签字按当时语境阅读。
>
> # 存档系统设计(save-system)
>
> > 第二阶段 Reforge。下方 2026-06-30 v1 文本保留为历史设计；当前实现契约以本节和源码为准。
> > 先读 [READ-FIRST](../../READ-FIRST.md)。
>
> ## 当前实现：SAVE8 / content20（2026-09-05）
>
> `SAVE_VERSION` 与工程 `contentVersion` 是两个独立版本轴。正式上线前只支持当前 canonical，
> 当前写出的唯一 payload 为：
>
> ```ts
> interface CurrentSavePayload {
>   version: 8
>   projectId: string
>   contentVersion: 20
>   world: WorldState
>   position: { sceneId: string; pos: GridPos; facing: Facing }
> }
> ```
>
> `world.script` 由当前无版本领域模型 `WorldScriptState` 承载。它使用复合实体地址和
> Page/Behavior/Hook 选择，保存 `FlowCursor`，不保存匿名 command index、调用栈或 wait 中间相位。
> 存档请求通过 flow safe-point barrier 后才拍快照；超时不提交半成品。
>
> ### 当前读档边界
>
> 1. `preflightCurrentSave` 只接受 `SAVE8/content20`；`normalizeCurrentSave` 校验后返回隔离副本。
> 2. 非当前 SAVE、非 content20、项目 id 不匹配或非法 `minimumSaveVersion` 都 fail-loud；不读
>    sidecar、不尝试升级、不提供产品迁移入口。
> 3. PAL 与其他开发期工程重新生成 current 数据；开发期旧存档重新开档。历史实现由 Git 保存。
>
> `manifest.minimumSaveVersion` 当前必须为 8。
>
> | payload `version` | payload `contentVersion` | content20 项目结果 |
> |---:|---:|---|
> | 8 | 20 | current codec；校验并克隆返回 |
> | 1..7 / 9+ | 任意 | 拒绝：不是当前 SAVE envelope |
> | 8 | 非 20 | 拒绝：不是当前 content epoch |
>
> ### 角色临时状态的 restore 边界
>
> `CharacterInstance.poisons`、`extraStatuses`、`extraPoisonRes` 可存在于运行中的世界快照，但恢复存档时
> 必须对 party 与 reserve 全部清除，包含 `incurable` 毒；入口 `StartWorld.seedConditions` 也不得在读档时
> 重新消费。该边界不同于战斗结束：战后只清定时状态、临时毒抗和 `common/severe` 毒，`incurable` 保留。
>
> ### 实现锚点
>
> - `packages/reforge/src/save/types.ts`：`SAVE_VERSION = 8` 与唯一 `CurrentSavePayload`。
> - `packages/reforge/src/save/current-codec.ts`：current-only preflight/normalize、边界拒绝与隔离克隆。
> - `packages/reforge/src/save/current-save.current-characterization.test.ts`：当前 round-trip 和非当前
>   fail-loud 回归。
> - `packages/content/src/character.ts`：`CONTENT_VERSION = 20`、
>   `CURRENT_PROJECT_MINIMUM_SAVE_VERSION = 8`。
>
> ---
>
> ## 历史 v1 设计（字段示例已被 SAVE 8 supersede）
>
> ## 目标(用户需求)
>
> 把原版「只显一个数字、意义不明」的存档改成现代存档:
>
> - **30 个槽** = 自动 ×1 + 快速 ×1 + 手动 ×28。
> - 浏览界面**翻页**,**3 槽/页 → 10 页**(reforge 320×200 逻辑分辨率,×4 放大)。
> - 每槽显示:**队伍成员 + 各自等级、地图名、存档时间、当前画面缩略图**。
> - **快速存档**:热键存/读(F5/F9),不进界面。
> - **自动存档**:编辑器放置的「存档区域」触发器(踩中 + 过冷却 → 写自动槽);冷却时长每触发器单独配。**不在「过场景」自动存**(有些场景一进就放演出脚本,会冲突)。
> - **手动槽不可删除,只能覆盖**。
>
> ## 核心架构:三块分离存储
>
> 浏览界面要一次列 30 槽。若每槽都把整包状态读出再解析 = 又慢又费。故拆三块,各自独立读写:
>
> | 块 | 内容 | 大小 | 何时读 |
> |---|---|---|---|
> | **metadata** | 浏览界面显示项:槽类型/编号、队伍成员名+等级、地图名、时间 | 小 | 开浏览界面(一次 30 条) |
> | **payload** | 全量可还原游戏状态,**带版本号** | 大 | 仅真读某槽时 |
> | **thumbnail** | 当前画面 PNG(约 64×40) | 二进制 | 浏览界面渲染槽卡 |
>
> → 列界面只读 30 条小 metadata + 30 张小图,秒开;不碰大 payload。
>
> ## 数据模型
>
> ```ts
> type SlotKind = 'auto' | 'quick' | 'manual'
> type SlotId = 'auto' | 'quick' | `m${string}` // 'm01'..'m28'
>
> interface SaveMeta {        // 显示快照(存档瞬间记下,只为浏览界面)
>   slotId: SlotId
>   kind: SlotKind
>   party: { name: string; level: number }[] // 整队快照(显示用)
>   mapName: string                            // 存档时所在场景显示名
>   savedAt: number                            // Date.now() epoch ms
> }
>
> interface SavePayload {      // 全量还原状态;version 驱动迁移
>   version: number            // 现 = 1
>   world: WorldState          // 队伍/背包/钱/技能
>   position: { sceneId: string; x: number; y: number; facing: Facing }
>   // 将来加(留 version 迁移):剧情 flag、已触发事件、游戏内时间… —— 等对应系统建好
> }
> // thumbnail: Blob (image/png)
> ```
>
> > 槽 id 稳定(`auto`/`quick`/`m01`..),非下标身份(符合 READ-FIRST)。`metadata.party` 是**显示快照**(存时记的名字/等级);`payload.world` 才是还原源。两者存档瞬间一起写。
>
> ## 存储后端:IndexedDB
>
> 不用 localStorage(~5MB 上限;30 槽 ×(载荷+图)必超)。IndexedDB:无实际上限、原生存 Blob、可只读 metadata 不碰 payload。
>
> - DB `type-pal-saves`,3 个 object store:`meta` / `payload` / `thumb`,各以 `slotId` 为 key。
> - **可测性**:存储层抽成接口 `SaveStore`(异步 put/get),IndexedDB 实现 + 内存实现(测试注入),沿用本项目「注入式 store」范式(对齐 magic/equip/use 的纯函数 + 注入风格)。
>
> ```ts
> interface SaveStore {
>   putSlot(meta: SaveMeta, payload: SavePayload, thumb: Blob): Promise<void> // 覆盖写(含 auto/quick)
>   listMeta(): Promise<SaveMeta[]>                 // 浏览界面用(不碰 payload)
>   getPayload(slotId: SlotId): Promise<SavePayload | null>
>   getThumb(slotId: SlotId): Promise<Blob | null>
> }
> ```
>
> ## 三个入口
>
> - **手动**:系统菜单「储存进度」→ 浏览界面**存档模式**(选手动槽写;覆盖已有要确认;auto/quick 显示但不可手动写);「读取进度」→ **读取模式**(任意已存槽可读,含 auto/quick)。同一界面两模式。
> - **快速**:F5 存快速槽 / F9 读快速槽,不进界面,各弹 toast;F9 不二次确认(图快)。
> - **自动**:编辑器放置「存档区域」触发器,踩中且过冷却 → 写自动槽。冷却时长每触发器单独配。(依赖 trigger 系统。)
>
> ## 浏览界面(320×200,3 槽/页,共 10 页)
>
> - 标题(读取/储存进度)+ 页码(第 n/10 页)。
> - 槽顺序:**auto、quick 固定最前两位**(占第 1 页头部),其后 m01..m28。
> - 槽卡:左缩略图(~64×40)+ 右「队伍成员+等级」「地图名」「时间」;空槽显「空槽」。
> - 选中 6 帧闪(0xF9-FE);翻页 ←/→(或 Up/Down 到页缘跨页);Esc 退回系统菜单。
> - **存档模式**:auto/quick 卡灰显不可写;选手动槽 → 截图 + 写入;覆盖已有 → 确认框(复用系统菜单 `drawConfirmBox` 原语)。
> - **读取模式**:任意已存槽 → 确认 → 加载 payload、还原 world+position、关菜单回大世界;空槽不可选。
> - 状态机:翻页/模式/光标/覆盖确认 = 纯函数(镜像 use/equip-menu-state.ts)。
>
> ## 缩略图捕获
>
> 存档瞬间截游戏画面(**不含 UI/菜单层**)→ 缩到约 64×40 → encode PNG Blob。实现:离屏 canvas `drawImage` 主画面帧 → `toBlob('image/png')`。(截图时机:开存档界面前抓一帧,或保留上一帧主画面。)
>
> ## 版本与迁移
>
> `payload.version` 现 = 1。读档:version < 当前 → 跑迁移补字段;version > 当前(更新档存的)或 JSON 损坏 → 当不可读、跳过(不崩)。加字段时升 version + 写迁移函数,旧档不破。
>
> ## 错误处理
>
> - 损坏/缺失槽 → metadata 列表跳过或显「空槽」,不崩。
> - IndexedDB 不可用(隐私模式等)→ 降级:禁存档 + 提示。
> - 配额超限 → 捕获 + 提示(IndexedDB 配额大,罕见)。
>
> ## 测试
>
> - **序列化往返**:`SaveStore` 内存实现注入;putSlot → listMeta/getPayload/getThumb 一致;损坏 payload → getPayload 容错返 null。
> - **迁移**:旧 version payload → 迁移后字段补齐。
> - **浏览界面状态机**:翻页/模式切换/覆盖确认/选空槽 = 纯函数断言。
> - **缩略图**:mock `canvas.toBlob`。
>
> ## 分期(实现顺序)
>
> **现在可做**(不依赖未建系统):
> 1. IndexedDB `SaveStore`(+ 内存实现 + 测试)。
> 2. 数据模型(SaveMeta / SavePayload v1 / 缩略图);**payload v1 只装 demo 现有的 `{ world, position }`**。
> 3. 浏览界面 + 状态机(3/页 / 翻页 / 两模式 / 覆盖确认 / 不可删)。
> 4. 快速热键 F5/F9 + toast。
> 5. 系统菜单 save/load 接入(替 [system-menu-plan](../plans/system-menu-plan.md) 的占位)。
>
> **等系统就位再接**:
> - **自动存档触发器** —— 等 **trigger 系统**(编辑器区域触发 + 冷却参数)。
> - **payload 里剧情进度**(flag / 已触发事件)—— 等 **flag/剧情系统**;升 version 加字段。
> - **多场景还原** —— 等**多场景**;`position.sceneId` 现单场景占位。
>
> ## 关联
>
> - 系统菜单(save/load 占位入口,本设计落地后接入):[../menu/system-menu-plan.md](../plans/system-menu-plan.md)
> - 覆盖确认复用的确认框原语:system-menu-plan Task B `drawConfirmBox`
> - 自动存档触发器依赖的触发/脚本系统:[script-system-design.md](script-system-design.md)
>
> ## 开放细节(实现时定,非阻塞)
>
> - 缩略图精确尺寸/压缩(64×40 PNG 是起点)。
> - 快速存读热键(F5/F9 为默认,可改/可做成可配)。
> - 自动存档冷却默认时长。
> - `savedAt` 显示格式(相对/绝对)。
<!-- original-source-quote:end -->
