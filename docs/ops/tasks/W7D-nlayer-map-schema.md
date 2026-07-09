# W7D - 自有地图 N 层新格式(schema 级返工,修正 W7a 旧格式地基)

Status: draft
Phase: phase2
Capability: W7(地图模块)
Coding Owner: 待三方设计签字后由用户指定(建议 Codex,Opus 复验)
Generation Owner: N/A
Reviewer: 三方(schema 级必审)
Visual Verification Owner: Opus(渲染对拍)
Unavailable Agents: none
Branch: main

## 目标

自有地图从旧 Tilemap 格式(lower/upper 双层 + u32 位编码 + 障碍焊 bit13)返工为
**N 视觉层 + 独立碰撞层 + 尺寸可变**的新格式,落实 D16「h/lower-upper 不进新地图模型」
与 content-schema §5 的定案;编辑器画的图、引擎跑的图都用新格式。旧格式此后只服务
`reuseOriginalMap`(原版图兼容层,迁移器到来前的既定归宿)。

## 范围

- 范围内:
  - 新 OwnMap schema(content 校验)+ buildBlankOwnMap 改产新格式。
  - reforge 渲染 N 层路径(旧路径原样服务 reuse;两路分流在 loadSceneMap 已有的架构上)。
  - 编辑器 MapMode 适配:层列表(增/删/重排/显隐/选中作画)、绘制工具由 word/mask 换
    (layerIdx, tileId|null)、碰撞笔刷写独立碰撞层;交互骨架(一笔一撤/stroke 预览/
    矩形/填充/hover/瓦片面板)原样保留。
  - 引擎行走碰撞读新碰撞层;建图→多层画→碰撞→存→载→引擎渲染闭环。
- 范围外 / 明确不做:
  - 超大地图分块流式加载(§5 明言只留口不做)。
  - 角色跨层行走的引擎实现(§5:schema 留表达力,引擎是 P1 的活)。
  - tileset per-tile 高度/属性编辑 UI(W7b tileset 库一并做)。
  - 地形枚举语义(碰撞层用 number,0/1 先行,枚举留口)。
  - 原版图迁移器(reuse 兼容层继续服役)。

## 上下文锚点

- 铁律:`docs/phase2/READ-FIRST.md`;`docs/phase2/decisions.md` D16(116-122 行:
  h/lower-upper 是旧引擎遗物,不进新地图模型;collision.ts=旧格式兼容层,pixelToTile
  连同 h 随迁移退役);`docs/phase2/foundation/content-schema.md` §5(69-77 行:
  尺寸可变 + N 视觉层(z 序 + 遮挡语义)+ 独立碰撞/地形层;原版 lower/upper = 2 层特例)。
- 不得重新引入:u32 位编码 / mask / layer1 ±1 偏移 / `h` 作为 API 概念 / paletteId(已退役)。
- 为什么返工:W7a-2 起自有地图误建在旧 Tilemap 形上(W7C-3 用户质疑后 Codex 核查确认,
  Opus 认领架构失误);现窗口最佳 —— 自有地图无任何真实内容,无迁移负担。
- 代码锚点(现状):
  - `packages/reforge/src/own-map.ts`(旧格式纯逻辑,本卡大部分替换;subTilesInRect/
    floodFill 的 lattice 几何可改造复用)
  - `packages/reforge/src/scene-map.ts` + `loader.ts loadAllOwnMaps`(分流架构保留,
    分流判据改按 schema 形状/version)
  - `packages/reforge/src/render.ts`(旧渲染路径不动;新路径新增)
  - `packages/editor/src/ui/MapMode.tsx`(交互骨架保留,位编码消费点替换)
  - `packages/editor/src/core/commands.ts` PaintTilesCommand(命令骨架保留,
    edit 载荷由 {word,mask} 换 {layerIdx, tileId|null} / 碰撞值)
  - 测试:`own-map.test.ts` / `commands.test.ts` 对应重写
- 交互惯例(已立勿改):一笔=一步撤销;stroke 本地预览;中/右键平移;选瓦自动入笔刷;
  绘制工具照 RPG Maker/Tiled 惯例(用户授权)。
- UX 参照:层列表 UI 照 RPG Maker/Tiled 惯例(层选择器 + 显隐眼睛);属新形态延伸,
  形态级分歧再问用户。

## 验收条件

- 功能:新格式建图(缺省一层地板 + 空碰撞)→ 加层/画多层/删层/重排 → 碰撞笔刷 →
  存 → 重开载入 → 编辑器与引擎渲染一致;reuse 场景零回归。
- 测试:schema 校验、lattice 几何往返、层操作与绘制命令 apply/invert、碰撞层读写;
  全仓 pnpm check 绿(game 2294 不回归)。
- 文档:content-schema §5 标注「已落地」;capability-map W7 状态更新;
  engineering-notes 补「旧格式仅剩 reuse 兼容层」条目。
- 视觉/手工:同一内容旧新渲染对拍(遮挡/深度序不劣化);6010 全流程实测。

## 推进签字

### 进入 build 前:设计签字

- Codex: agree(2026-07-09;实现可行,验证方案可执行,分期切法合理;见 Draft「Codex 设计签字说明」)
- Opus: agree(起草本卡;设计结论见 Draft)
- GLM: **agree**。候选 A 与 D16 / content-schema §5 完全对齐（N 视觉层数组序=z 序 / 独立碰撞层正交 / 尺寸可变 / tileId 无上限无偏移 / occlude 对齐 upper 语义 / 错排 lattice 紧凑数组与 collision.ts+render.ts 同源）。附 2 条覆盖补充（非 counter，build 时补）+ 1 条风险提醒：
  - **覆盖补充 1（build 前定）**：碰撞层 `[2*height]×[width]` 是子格维度，但引擎行走碰撞（isBlocked）当前读逻辑格 `map.height`。逻辑格碰撞判定 = 该格两个子格碰撞值的聚合规则（任一阻挡即阻挡？还是两个都阻挡？）候选 A 未写，build 前须定，测试矩阵须覆盖。
  - **覆盖补充 2（build 前定）**：occlude 层 `null` 格（无瓦）的 cover-tile 深度表处理——应跳过（不遮挡，对齐旧 upper=0 语义）。测试须覆盖"occlude 层 null 格不产 cover tile"。
  - **风险提醒**：分期 D1→D2 之间编辑器旧格式绘制路径仍在（W7C-3 刚 accept），D1 切新格式后编辑器未改前可能误用旧格式画图。建议 D1 收尾加"旧格式编辑器路径禁用/标灰"守卫。
- counter / 分歧处理: 当前无 counter。
- 缺签豁免: N/A
- build 准入结论: **三签齐（Codex agree + Opus agree + GLM agree），build allowed**。由用户指定 Coding Owner 进 build。

### 进入 done 前:审查签字

- Codex: pending
- Opus: pending
- GLM: pending
- counter / 返工处理:
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论(Opus 初稿,供三方签字审)

**Schema(候选 A,Opus 推荐)**:

```jsonc
{
  "version": 1,
  "width": 24, "height": 24,          // 格数(菱形格,基与旧 cells 同)
  "tileset": "tileset/20.rle",
  "layers": [                          // 数组序 = z 序(下→上);id 稳定、可重排
    { "id": "floor", "name": "地板", "occlude": false,
      "tiles": [ /* [2*height] 行 × [width] 列,元素 tileId | null */ ] }
  ],
  "collision": [ /* [2*height] × [width],number:0 通行 / 1 阻挡(>1 留地形枚举口) */ ]
}
```

- **网格 = 错排菱形 lattice 的紧凑数组**:行 b ∈ [0,2H)、列 k ∈ [0,W),子格中心 =
  `(32k + 16(b&1), 8b)`。错排是等距菱形密铺的几何本质(保留),旧格式的债是位编码与
  2 层上限(废除)—— **h 不再是 API 概念,只是行奇偶**;零存储浪费(每行恰 W 个有效点)。
- `null` = 无瓦;tileId 为普通数字,无 512 上限、无 ±1 偏移、无 mask。
- **碰撞独立层**同维度,与视觉层正交(D16/§5 的「算三层」)。
- **遮挡**:`layer.occlude`(原版 upper 语义,该层瓦进 cover-tile 深度表);per-tile
  高度属瓦片固有属性 → 归 W7b tileset 元数据,本卡渲染以缺省高度 1 计。
- **渲染**:reforge 新增 N 层渲染路径(逐层按数组序画;occlude 层入深度表),
  旧路径零改动服务 reuse;分流点 = loadSceneMap(判据:新格式带 version/layers)。
- **编辑器**:MapMode 左栏上部加层列表(选中层作画/眼睛显隐/加删重排),下部瓦片面板
  不变;PaintTilesCommand 载荷换 {layerIdx, tileId|null} 与碰撞写;undo 语义(一笔
  一撤、prev 全量还原)不变。
- **兼容**:无存量自有地图 → 直接切换,不写迁移;W7C-3 的旧格式绘制路径(encode/mask/
  MAX_LAYER0 等)随本卡退役,pixelToTile 退回 collision.ts 兼容层仅服务 reuse。
- **分期**(一卡三期,期间不换 Owner):D1 schema+校验+渲染(建图可渲染);
  D2 编辑器层 UI + 绘制适配;D3 碰撞层 + 引擎行走验证 + 文档收尾。

### 已知风险

- 风险:N 层深度排序与旧 cover-tile 语义不等价 → 视觉回归。
  缓解:同内容新旧渲染对拍;occlude 层复用现有 baseY 深度表机制,缺省高度 1。
- 风险:三画布(Scene/Preview/Map)与引擎四个消费点都吃 ownMap,漏改点。
  缓解:分流收口在 loadSceneMap/liveMap 单点;typecheck 扫全;验收含 reuse 回归。
- 风险:层列表 UI 是新形态延伸。
  缓解:照 RPG Maker/Tiled 惯例(用户已授权惯例路线);形态分歧再问用户。

### Codex 设计签字说明(2026-07-09)

结论:**agree**。

- 实现可行性:现有 `loadSceneMap`/`loadAllOwnMaps` 已经把 reuse 与 own 地图加载集中到单点,适合改为旧 `Tilemap` 与新 `OwnMap` union 分流;`EditSession` + Command apply/invert 也适合把旧 `{word,mask}` 载荷替换成 N 层编辑载荷。
- 工作量判断:这是 schema 级返工,不能当 W7C 小修做。D1/D2/D3 分期合理,其中 D1 必须先完成类型与渲染分流,让 TS 把漏改消费点暴露出来;D2 再接编辑器 UI/命令;D3 收碰撞、引擎行走验证和文档。
- 验证方案:单测覆盖 schema guard、lattice 几何、层操作、绘制命令 apply/invert、碰撞层;浏览器 6010 覆盖建图→多层绘制→碰撞→保存序列化→重载→引擎/编辑器渲染一致;reuse 场景必须回归,避免旧图兼容层被误伤。
- 实现约束:编辑命令内部应优先以稳定 `layer.id` 定位图层,不要把裸 `layerIdx` 作为长期身份;重排/删除命令负责捕获旧层与旧索引用于 undo。数组下标只作为当前 z 序和渲染顺序。
- 实现约束:把 lattice 行列与像素/格坐标转换集中成 helper,禁止把旧 `h` 或 `cell.lower/upper` 概念重新暴露给新 schema/API。
- 实现约束:OwnMap 校验需钉住 `layers.length >= 1`、每层 `tiles` 尺寸为 `2*height × width`、`collision` 同维度、layer id 唯一;无效数据应在加载/编辑入口早失败。

### 审查方立场

- 主审:三方(schema 级)。
- 是否建议进入 build: 待 GLM 设计签字(Codex agree,Opus agree)。

## 交接日志

- 2026-07-09 Opus: 认领 W7a 旧格式地基失误,起草本卡(schema 候选 A + 分期 + 风险);
  用户授权「按最合理方式」→ 本卡立项。Evidence: 本卡 + W7C-3 交接日志。Next: Codex + GLM / 设计签字。
- 2026-07-09 Codex: 设计签字 agree。实现可行,分期合理;补充稳定 layer.id、lattice helper、OwnMap 校验等实现约束。Evidence: 推进签字与 Codex 设计签字说明。Next: GLM / 覆盖审查设计签字。

## 下一位 Agent 提示词

```text
接手任务: W7D - 自有地图 N 层新格式(schema 级返工)
任务卡: docs/ops/tasks/W7D-nlayer-map-schema.md
当前状态: draft(build 准入 blocked,Opus agree + Codex agree,待 GLM 签字)
你的角色: GLM 设计签字(覆盖清单/测试矩阵/schema 数据风险/文档遗漏)
先读: AGENTS.md 三贤人协议;本卡全部(尤其「上下文锚点」「Draft 设计结论」);
  docs/phase2/decisions.md D16;docs/phase2/foundation/content-schema.md §5。
已完成: Opus 起草 schema 候选 A(错排 lattice 紧凑数组 + N 层 + 独立碰撞层)、
  分期方案、风险清单;Codex 已从实现可行性/验证方案/工作量角度签 agree,并补充 layer.id、lattice helper、OwnMap 校验等实现约束;W7C-3 已定性为旧格式兼容切片(另卡)。
请你做: 审本卡设计结论与风险,输出 agree 或 counter + 理由;counter 请附替代方案
  (尤其若你认为网格表达/遮挡语义/分期切法应改)。
不要做: 不要开始实现(build 准入签字未齐);不要重新引入 u32 位编码/mask/h API/
  paletteId;不要重新考证子格几何(错排 lattice 已钉死)。
输出要求: 签字写回本卡「进入 build 前:设计签字」你的行(agree / counter + 理由);
  由用户转达或有文件权限的一方代录。三签齐后用户指定 Coding Owner 进 build。
```
