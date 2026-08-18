# ED-MAP-MULTI-TILESET-1 - 地图多瓦片集作者模型

Status: draft
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
  - design: pending。需先在 per-cell ref / 并行 source matrix / palette binding 中给出确定性存储与迁移对照。
- Kimi: pending（架构/schema/runtime/编辑 patch 独立审查）。
- GLM: pending（数据迁移、引用扫描、测试矩阵独立审查）。
- counter / 分歧处理: pending
- build 准入结论: **blocked——核心 schema 方案与三方 premise/design 未齐，不得修改实现。**

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
