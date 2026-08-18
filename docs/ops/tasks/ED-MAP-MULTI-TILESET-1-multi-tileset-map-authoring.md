# ED-MAP-MULTI-TILESET-1 - 地图多瓦片集作者模型

Status: build
Phase: phase2
Capability: 地图/组合瓦片来源模型纠偏（schema/save/runtime/editor）
Coding Owner: Codex
Reviewer: Kimi + GLM
Branch: main

## 目标

瓦片集只负责归类同一风格或同一类型的瓦片，不再充当“一张地图唯一绑定的全局皮肤”。作者在地图右侧“瓦片”
Tab 中选择来源瓦片集和具体瓦片；同一地图可同时使用多个瓦片集，已有格子的来源不会因切换当前 palette 而被重解释。
组合模板的视觉成员也必须保留可独立解析的瓦片来源，才能无损放入使用多个瓦片集的地图。

## 范围

- 范围内：ProjectMap、StampTemplate、加载/渲染、编辑 patch/clipboard/stamp、保存/校验/引用扫描、当前工程重迁、
  “瓦片”Tab 的来源选择与 palette。
- 范围外：瓦片二进制格式本身、碰撞语义、图层/高度语义、linked prefab。
- 上游依赖：`ED-STAMP-MAP-MODEL-1` 正在重定组合/地图共享 content、相对高度与 depthMode；两卡必须合并为
  一次 canonical version cut。该卡三签前，本卡即使来源表达已收敛也不得独立进入 build。
- 产品铁律：地图属性不再提供“替换整张地图瓦片集”的单值下拉；切换 palette 只改变后续笔刷来源，不改已有格子。
- 开发期版本纪律：版本切换后删除旧 schema/upgrader/fixture/fallback；历史只由 Git 保存。

## 前提真值门

一句话前提：当前 canonical 模型把所有视觉格子的裸 `tileId` 解释为地图唯一 `tilesetId`，因此无法表达同一地图混用
多个瓦片集；把下拉框从属性移动到瓦片 Tab 只能换位置，不能修复数据语义。

| 维度 | 当前真值 | 一手证据 |
|---|---|---|
| 原版 / primary source | N/A：这是 Reforge 作者数据模型与 UI 产品决策，不裁决原版地图文件机制。 | `docs/phase2/READ-FIRST.md:1-16,38-41`。 |
| 第一阶段 | N/A：本卡不改变第一阶段忠实还原数据；只重构第二阶段 canonical 作者模型。 | `CLAUDE.md:5-13`。 |
| 当前二阶段 | `MapLayerV2.tiles` 只存裸 `number|null`，`ProjectMapBase` 只有一个 `tilesetId`；validator 也只返回该单值。运行时 `loadSceneMap` 只加载这一个 tileset。`StampTemplateV1` 同样只有全局 `tilesetId`，placement 直接拒绝 map/template tileset 不同。现有“换瓦片集”命令明确不重映射裸索引。 | `packages/content/src/project-map.ts:1-23,147-203`；`packages/reforge/src/scene-map.ts:6-22`；`packages/content/src/stamp.ts:29-38,85-127`；`packages/editor/src/core/stamp-placement.ts:145-158`；`packages/editor/src/core/commands.ts:1266-1293`。 |
| 本任务目标 | 同一地图和组合可保留多个稳定瓦片来源；来源选择属于右侧“瓦片”Tab，切换 palette 不改已有内容。 | 用户 2026-08-18 明确指出“瓦片集用于归类统一风格或同类瓦片，并不是一张地图只能绑定一个瓦片集”。 |

### 反证与替代解释

- 最强替代解释 A：把 `tilesetId` 下放到图层即可允许地图多来源；反例是同一视觉层仍无法混用来源，组合成员跨层映射后
  也可能被迫拆层。
- 最强替代解释 B：地图保存 `tilesetIds[]`，裸 tileId 通过数组区间或拼接全局编号解析；反例是注册表重排/增删会让
  已有格子歧义，且各 tileset 的 tileId 命名空间本来独立。
- 当前候选方向：每个非空视觉实例保存稳定 `{ tilesetId, tileId }` 引用；是否以并行 source matrix、对象 cell 或
  canonical palette binding 表表达，须由三方在 build 前按存储体积、patch 复杂度和确定性格式共同拍板。
- 可证伪观察：若现有 canonical 文件已能让任意两个来源的 tileId 在同一层同一地图无歧义 round-trip，且运行时确实
  同时加载并按格解析两套 frames，则本卡前提被推翻；当前读码未发现该路径。

## 验收条件

- “属性”不再出现全局瓦片集替换；“瓦片”Tab 可搜索/选择来源瓦片集并从其 palette 取瓦片。
- 同一地图同一视觉层至少放置两个不同 tileset 的同号 tileId，保存/重开/undo/redo 后来源和值均不变。
- 切换当前 palette、重排 registry、删除未引用 tileset 均不重解释已有格子；删除被引用来源 fail-loud 并列出引用。
- 组合模板可保留多来源成员并放入多来源地图，不再用全局 tileset mismatch 拒绝；placement 快照语义不变。
- renderer/editor hit-test/preview/clipboard/stamp/selection/resize/serialization/validation/reference scan 全部消费同一 canonical ref。
- 当前工程完成一次版本切换和重迁；同卡删除旧 schema、upgrader、fixture、fallback 与旧 UI 命令。

## 推进签字

### 进入 build 前

- Codex:
  - premise: **verified（2026-08-18）**。一手证据见真值矩阵；单 `tilesetId`、裸 tileId、单资源加载和 stamp mismatch
    四层同时成立，UI 搬家无法修复。
  - design: **agree（2026-08-18，具体表达已落）**。采用 `tiles` 裸 tileId + 同形 `sources` source-index matrix +
    content 级确定性 `tilesetRefs`，遵守 KM1/KM2 与 MT1-MT4；逻辑 patch 可用 per-cell ref，canonical JSON 禁止对象展开。
    Stamp 的最终物理结构不沿用旧 KM3 稀疏 member 假设，转由 `ED-STAMP-MAP-MODEL-1` 重新三签。
- Kimi: **premise verified + 方向性 design agree（2026-08-18，本人一手读码，非代理；附必落钉
  KM1-KM3）**。逐项独立核实与三候选架构比较：
  - **前提 ✓**：单 `tilesetId`（project-map.ts:19，validator :150,:203）、裸 tileId 矩阵（:9）、
    运行时单加载（scene-map.ts:12-22）、placement mismatch 拒绝（stamp-placement.ts:153-157）、
    换绑不重映射（commands.ts:1266-1293 注释自认「索引超出新集 = 渲染空」）——四层实锤，与 GLM
    双向互证；全链无双来源同图 round-trip 路径，可证伪观察核对成立。
  - **三候选架构比较（本席独立结论，与 GLM 数据结论互洽）**：
    - per-cell `{tilesetId,tileId}` 对象：语义最直接，但 GLM 普查（4.0M 非空格 ≈ +109MB）已
      判死刑盘形态；只可作编辑内存态。
    - 纯 palette binding 表（cells 仍裸 tileId）：不解决同图混源——同层两来源同号 tileId 仍
      歧义，单独不成立。
    - **并行 source matrix + 按图稳定 tilesetId 表（推荐）**：`tiles` 裸 tileId 不动，新增同形
      `sources: (index|null)[][]` 指向 map 级 `tilesetRefs: string[]`（确定性排序）。存储
      每格 +2-3B 满足 MT2 预算；tiles/sources lockstep 不变量复用现有 tiles/heights 同款
      validator 模式（project-map.ts:184-190 已是先例）；迁移机械（全部非空格 source=旧
      tilesetId 的唯一下标）；patch/clipboard/stamp 的子区域双矩阵搬运与 heights 同构。
  - **必落钉 KM1-KM3（架构面，任何落地方案必须满足）**：
    - **KM1（存储形态冻结）**：canonical 落盘禁止 per-cell 对象（GLM 109MB 数据）与全局拼接
      编号；默认按「裸 tileId + 同形 source-index 并行矩阵 + 按图确定性 tilesetRefs 表」落地；
      Codex 若选其他形态，须先逐项反驳 MT2 存储预算与 patch 复杂度对照再重签。
    - **KM2（lockstep 与归一化等价）**：`sources[r][c]` 非空当且仅当 `tiles[r][c]` 非空、下标
      越界 fail-loud；tilesetRefs 重排/归一化必须连同矩阵同写且「逐格渲染等价」机检（MT1），
      不允许只重排表不改矩阵的半态落盘。
    - **KM3（stamp/runtime 消费边界）**：`StampTemplateV1` 视觉成员改 per-member `tilesetId`
      （稀疏对象，体积无关），模板全局 tilesetId 的兼容判据退役；placement 快照自含、
      mismatch 拒绝删除；runtime 按 `tilesetRefs` 并集加载、逐格经 source 下标解析，缺失
      来源在 validate 期 fail-loud 而非渲染期静默。
  未改实现文件，未代签 GLM，未标 build/done。
- GLM:
  - premise: **verified（2026-08-18，本人一手读码 + PAL 全量普查，非代理）**。四层前提逐一实锤：
    1. **单绑定 + 裸索引**：`MapLayerV2.tiles: (number|null)[][]`（project-map.ts:9）+ 单
       `tilesetId`（:19，validator :150/:203，序列化 :356）。
    2. **运行时单加载**：`loadSceneMap` 经 `resolveTilesetAsset(map.tilesetId,…)` 只加载一个
       tileset（reforge scene-map.ts:6-22）。
    3. **组合全局 tileset**：StampTemplateV1 单 `tilesetId`（stamp.ts）。
    4. **placement mismatch 拒绝 + 换绑不重映射**：`map.tilesetId !== template.tilesetId` →
       'tileset-mismatch' issue（stamp-placement.ts:153-157）；SetProjectMapTilesetCommand 注释
       自认"换绑不重映射瓦片索引…索引超出新集 = 渲染空"（commands.ts:1266-）。
    可证伪观察核对：全链无两来源同图无歧义 round-trip 路径——前提成立。
  - **PAL 数据普查（本人 node 实测，三候选取舍的数据输入）**：223 地图 / 446 图层 /
    7,307,264 格 / **3,996,116 非空格**；地图级 tilesetId 去重 223（现模型每图恰一源）。
    **存储推论：per-cell `{tilesetId,tileId}` 对象作 canonical 序列化格式 ≈ +109MB JSON 膨胀**
    （4.0M 非空格 × ~28B），另有 RLE/确定性序列化复杂度——候选 A 作编辑内存态可行、作落盘
    格式在 PAL 规模不可接受，除非紧凑编码。
  - design: **agree（方向性，2026-08-18）**——同意"稳定来源解析 + 切 palette 不重解释 + 来源
    选择归'瓦片'Tab"的产品铁律与验收条件；具体 canonical 表达（per-cell ref / 并行 source
    matrix / palette binding）按卡文属三方 build 前共同拍板，GLM 数据席意见：**并行 source
    matrix + 按图稳定 palette 表（tilesetId 键控、保存时确定性排序）在存储/迁移/patch 三维
    均优**，per-cell 对象仅可作内存态。附必落钉 MT1-MT4（任何候选都必须满足）。Codex 落具体
    design 后 GLM 对该 design 的 agree 以 MT1-MT4 被包含为准，不重复全审。
  - **必落钉 MT1-MT4（数据迁移/引用扫描/测试矩阵）：**
    - **MT1（迁移 census 基线 + 不变式）**：223/446/4.0M 为迁移基线写卡；不变式 = 迁移后每图
      来源解析与旧 `(map.tilesetId, tileId)` **逐格渲染等价**、二跑幂等 changed=0、0 悬空
      来源引用；重迁后 census 数字与 maps 目录字节对比写 Build 记录。
    - **MT2（存储预算显式化）**：canonical 序列化必须带存储预算（参照普查：非空格来源增量
      应在每格 +2-3 字节量级而非对象展开）；迁移前后 maps 目录体积对比入卡，膨胀超预算须
      回到表达层重议。
    - **MT3（引用扫描多源化）**：瓦片集引用/移除扫描（TilesetTab 引用面 + blocking）升级为
      多来源：同图多源使用计数、删除被任一格引用的来源 fail-loud 且引用可跳转到具体层/格，
      与"删未引用来源不重解释"配对测试。
    - **MT4（判别用例矩阵）**：核心判别 = **同图同层两个来源的同号 tileId** round-trip 逐格
      不变（现模型必歧义）；palette 切换/registry 重排/删未引用/删被引用四态不重解释；stamp
      多源成员放多源图不再 mismatch 且快照语义不变；undo/redo 对称；迁移 census 断言。
- counter / 分歧处理: 无未解决 counter；旧稀疏 member 前提已由共享 content 方案取代。
- build 准入结论: **allowed（2026-08-19）——本卡三方来源模型签字齐，且上游
  ED-STAMP-MAP-MODEL-1 已完成共享 content/相对高度/depthMode 的重新三签；两卡由同一 Coding Owner
  合并执行一次 canonical version cut。**

### 进入 done 前

- Codex: pending
- Kimi: pending
- GLM: pending
- done 准入结论: blocked

## 交接日志

- 2026-08-18 User: 纠正瓦片集产品语义；瓦片集是来源分类，同一地图可使用多个，来源选择应位于“瓦片”Tab。
  Next: Codex 核验现模型并开高风险纠偏卡。
- 2026-08-18 Codex: 核验当前 map/stamp/loader/placement/command 均为单瓦片集假设，签 premise verified；
  因 schema/save/runtime/迁移受影响，保持 draft，未改多瓦片集实现。Next: Kimi/GLM 独立设计审查。
- 2026-08-18 GLM（数据迁移/引用扫描/测试矩阵）: 审查完成，签 **premise verified + 方向性
  design agree（附 MT1-MT4）**。四层前提实锤（单绑定裸索引/单加载/组合全局源/mismatch 拒绝 +
  换绑不重映射）。**PAL 普查：223 图/446 层/4.0M 非空格——per-cell 对象序列化 ≈ +109MB 膨胀**，
  数据席意见倾向并行 source matrix + 按图稳定 palette 表；MT1-MT4 为任何候选的硬门（迁移逐格
  渲染等价/存储预算/引用扫描多源化/同号 tileId 判别用例）。Codex 落具体 design 后按钉包含性
  生效。未改实现文件，未代签 Kimi，未标 build/done。
- 2026-08-18 Kimi（架构/schema/runtime/patch）: 审查完成，签 **premise verified + 方向性
  design agree（附 KM1-KM3）**。四层前提与 GLM 双向互证；三候选独立比较：per-cell 对象被
  109MB 数据判死（仅可内存态）、纯 palette 表不解决同层混源歧义、**并行 source-index 矩阵 +
  按图确定性 tilesetRefs 表为推荐形态**（+2-3B/格满足 MT2，lockstep 复用 tiles/heights
  validator 先例，迁移机械）。KM1 存储形态冻结、KM2 lockstep/归一化逐格等价机检、KM3 stamp
  per-member 来源 + runtime 并集加载/validate 期 fail-loud。未改实现文件，未代签 GLM，未标
  build/done。Next: Codex 按推荐形态（或逐项反驳后的替代）落具体 design 并补 design 签字。
- 2026-08-18 Codex：接受紧凑 source-index matrix 并补 design agree；用户随后要求先重定组合为共享局部地图
  content 与相对高度，因此本卡依赖 ED-STAMP-MAP-MODEL-1，合并为一次 canonical version cut。

## 下一位 Agent 提示词

```text
接手 ED-MAP-MULTI-TILESET-1 地图多瓦片集作者模型。
任务卡：docs/ops/tasks/ED-MAP-MULTI-TILESET-1-multi-tileset-map-authoring.md
当前状态：draft / build blocked；Codex 只签 premise，design 与 Kimi/GLM 签字未齐；不得开始实现。
先读：AGENTS.md、docs/phase2/READ-FIRST.md、本卡全文、packages/content/src/project-map.ts、stamp.ts、
packages/reforge/src/scene-map.ts、render.ts、packages/editor/src/core/stamp-placement.ts、commands.ts、
packages/editor/src/ui/MapMode.tsx 的属性/瓦片面板与 scene-stage.ts。
用户铁律：瓦片集是风格/类型来源分类；一张地图可同时使用多个；来源选择在“瓦片”Tab，切换 palette 不改已有格子。
请独立核验 premise，并比较 per-cell ref、并行 source matrix、palette binding 三种 canonical 表达；必须覆盖确定性格式、
存储体积、渲染查找、patch/clipboard/stamp、引用删除、当前工程重迁与旧版本同卡删除。
输出：premise verified/counter + design agree/counter，直接证据行号、最强反证、必改钉和测试矩阵。不得改实现文件。
```
