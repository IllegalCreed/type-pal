# 存档系统设计(save-system)

> 第二阶段 Reforge。2026-06-30 brainstorm(Claude + 用户)。**本文件是设计,非实现**——按下方「分期」落地,不现在硬做载荷。先读 [READ-FIRST](../READ-FIRST.md)。

## 目标(用户需求)

把原版「只显一个数字、意义不明」的存档改成现代存档:

- **30 个槽** = 自动 ×1 + 快速 ×1 + 手动 ×28。
- 浏览界面**翻页**,**3 槽/页 → 10 页**(reforge 320×200 逻辑分辨率,×4 放大)。
- 每槽显示:**队伍成员 + 各自等级、地图名、存档时间、当前画面缩略图**。
- **快速存档**:热键存/读(F5/F9),不进界面。
- **自动存档**:编辑器放置的「存档区域」触发器(踩中 + 过冷却 → 写自动槽);冷却时长每触发器单独配。**不在「过场景」自动存**(有些场景一进就放演出脚本,会冲突)。
- **手动槽不可删除,只能覆盖**。

## 核心架构:三块分离存储

浏览界面要一次列 30 槽。若每槽都把整包状态读出再解析 = 又慢又费。故拆三块,各自独立读写:

| 块 | 内容 | 大小 | 何时读 |
|---|---|---|---|
| **metadata** | 浏览界面显示项:槽类型/编号、队伍成员名+等级、地图名、时间 | 小 | 开浏览界面(一次 30 条) |
| **payload** | 全量可还原游戏状态,**带版本号** | 大 | 仅真读某槽时 |
| **thumbnail** | 当前画面 PNG(约 64×40) | 二进制 | 浏览界面渲染槽卡 |

→ 列界面只读 30 条小 metadata + 30 张小图,秒开;不碰大 payload。

## 数据模型

```ts
type SlotKind = 'auto' | 'quick' | 'manual'
type SlotId = 'auto' | 'quick' | `m${string}` // 'm01'..'m28'

interface SaveMeta {        // 显示快照(存档瞬间记下,只为浏览界面)
  slotId: SlotId
  kind: SlotKind
  party: { name: string; level: number }[] // 整队快照(显示用)
  mapName: string                            // 存档时所在场景显示名
  savedAt: number                            // Date.now() epoch ms
}

interface SavePayload {      // 全量还原状态;version 驱动迁移
  version: number            // 现 = 1
  world: WorldState          // 队伍/背包/钱/技能
  position: { sceneId: string; x: number; y: number; facing: Facing }
  // 将来加(留 version 迁移):剧情 flag、已触发事件、游戏内时间… —— 等对应系统建好
}
// thumbnail: Blob (image/png)
```

> 槽 id 稳定(`auto`/`quick`/`m01`..),非下标身份(符合 READ-FIRST)。`metadata.party` 是**显示快照**(存时记的名字/等级);`payload.world` 才是还原源。两者存档瞬间一起写。

## 存储后端:IndexedDB

不用 localStorage(~5MB 上限;30 槽 ×(载荷+图)必超)。IndexedDB:无实际上限、原生存 Blob、可只读 metadata 不碰 payload。

- DB `type-pal-saves`,3 个 object store:`meta` / `payload` / `thumb`,各以 `slotId` 为 key。
- **可测性**:存储层抽成接口 `SaveStore`(异步 put/get),IndexedDB 实现 + 内存实现(测试注入),沿用本项目「注入式 store」范式(对齐 magic/equip/use 的纯函数 + 注入风格)。

```ts
interface SaveStore {
  putSlot(meta: SaveMeta, payload: SavePayload, thumb: Blob): Promise<void> // 覆盖写(含 auto/quick)
  listMeta(): Promise<SaveMeta[]>                 // 浏览界面用(不碰 payload)
  getPayload(slotId: SlotId): Promise<SavePayload | null>
  getThumb(slotId: SlotId): Promise<Blob | null>
}
```

## 三个入口

- **手动**:系统菜单「储存进度」→ 浏览界面**存档模式**(选手动槽写;覆盖已有要确认;auto/quick 显示但不可手动写);「读取进度」→ **读取模式**(任意已存槽可读,含 auto/quick)。同一界面两模式。
- **快速**:F5 存快速槽 / F9 读快速槽,不进界面,各弹 toast;F9 不二次确认(图快)。
- **自动**:编辑器放置「存档区域」触发器,踩中且过冷却 → 写自动槽。冷却时长每触发器单独配。(依赖 trigger 系统。)

## 浏览界面(320×200,3 槽/页,共 10 页)

- 标题(读取/储存进度)+ 页码(第 n/10 页)。
- 槽顺序:**auto、quick 固定最前两位**(占第 1 页头部),其后 m01..m28。
- 槽卡:左缩略图(~64×40)+ 右「队伍成员+等级」「地图名」「时间」;空槽显「空槽」。
- 选中 6 帧闪(0xF9-FE);翻页 ←/→(或 Up/Down 到页缘跨页);Esc 退回系统菜单。
- **存档模式**:auto/quick 卡灰显不可写;选手动槽 → 截图 + 写入;覆盖已有 → 确认框(复用系统菜单 `drawConfirmBox` 原语)。
- **读取模式**:任意已存槽 → 确认 → 加载 payload、还原 world+position、关菜单回大世界;空槽不可选。
- 状态机:翻页/模式/光标/覆盖确认 = 纯函数(镜像 use/equip-menu-state.ts)。

## 缩略图捕获

存档瞬间截游戏画面(**不含 UI/菜单层**)→ 缩到约 64×40 → encode PNG Blob。实现:离屏 canvas `drawImage` 主画面帧 → `toBlob('image/png')`。(截图时机:开存档界面前抓一帧,或保留上一帧主画面。)

## 版本与迁移

`payload.version` 现 = 1。读档:version < 当前 → 跑迁移补字段;version > 当前(更新档存的)或 JSON 损坏 → 当不可读、跳过(不崩)。加字段时升 version + 写迁移函数,旧档不破。

## 错误处理

- 损坏/缺失槽 → metadata 列表跳过或显「空槽」,不崩。
- IndexedDB 不可用(隐私模式等)→ 降级:禁存档 + 提示。
- 配额超限 → 捕获 + 提示(IndexedDB 配额大,罕见)。

## 测试

- **序列化往返**:`SaveStore` 内存实现注入;putSlot → listMeta/getPayload/getThumb 一致;损坏 payload → getPayload 容错返 null。
- **迁移**:旧 version payload → 迁移后字段补齐。
- **浏览界面状态机**:翻页/模式切换/覆盖确认/选空槽 = 纯函数断言。
- **缩略图**:mock `canvas.toBlob`。

## 分期(实现顺序)

**现在可做**(不依赖未建系统):
1. IndexedDB `SaveStore`(+ 内存实现 + 测试)。
2. 数据模型(SaveMeta / SavePayload v1 / 缩略图);**payload v1 只装 demo 现有的 `{ world, position }`**。
3. 浏览界面 + 状态机(3/页 / 翻页 / 两模式 / 覆盖确认 / 不可删)。
4. 快速热键 F5/F9 + toast。
5. 系统菜单 save/load 接入(替 [system-menu-plan](../menu/system-menu-plan.md) 的占位)。

**等系统就位再接**:
- **自动存档触发器** —— 等 **trigger 系统**(编辑器区域触发 + 冷却参数)。
- **payload 里剧情进度**(flag / 已触发事件)—— 等 **flag/剧情系统**;升 version 加字段。
- **多场景还原** —— 等**多场景**;`position.sceneId` 现单场景占位。

## 关联

- 系统菜单(save/load 占位入口,本设计落地后接入):[../menu/system-menu-plan.md](../menu/system-menu-plan.md)
- 覆盖确认复用的确认框原语:system-menu-plan Task B `drawConfirmBox`
- 自动存档触发器依赖的触发/脚本系统:[script-system-design.md](script-system-design.md)

## 开放细节(实现时定,非阻塞)

- 缩略图精确尺寸/压缩(64×40 PNG 是起点)。
- 快速存读热键(F5/F9 为默认,可改/可做成可配)。
- 自动存档冷却默认时长。
- `savedAt` 显示格式(相对/绝对)。
