# W7D - 自有地图 N 层新格式(schema 级返工,修正 W7a 旧格式地基)

Status: done
Phase: phase2
Capability: W7(地图模块)
Coding Owner: Codex(用户指定,2026-07-10)
Generation Owner: N/A
Reviewer: 三方(schema 级必审)
Visual Verification Owner: Codex 已自验;Opus 负责 review 对拍
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
    (layerId, tileId|null)、碰撞笔刷写独立碰撞层;交互骨架(一笔一撤/stroke 预览/
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
  连同 h 随迁移退役);`docs/phase2/archive/designs/content-schema.md` §5(69-77 行:
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
    edit 载荷由 {word,mask} 换 {layerId, tileId|null} / 碰撞值)
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

- Codex: **accept**(2026-07-10;Coding Owner 自审通过;实现 `cd1ab67a`,全仓门禁与 6012 浏览器证据见 Build 段)
- Opus: **accept**(2026-07-10;主审通过 —— 架构/代码审 + 门禁独立重跑 + 6010 视觉复验与旧/新遮挡对拍全过,证据见 Review「Opus 主审」;3 条非阻塞小项随卡记录,不构成返工)
- GLM: **accept**（2026-07-10）。按覆盖清单/测试矩阵/文档/旧概念退役四角度审查，全部通过：
  - **覆盖补充 1 闭环**：碰撞聚合四态测试落地（`collision.test.ts:94`——空空/A/B/双阻精确覆盖；"任一子格非 0 即阻挡"定案）。
  - **覆盖补充 2 闭环**：occlude 层 null 不产渲染/cover（`own-map.test.ts:109`——null 跳过 + 隐藏层也不产项）。
  - **风险提醒闭环**：D2 已完成，旧概念（encodeTileLayer*/MASK/SubTileEdit/subTilesInRect/floodFillSubTiles/paintCells）全仓零残留；MapMode 无 h/lower/upper/word/mask。旧 pixelToTile 仅留 collision.ts 服务 reuse（Opus 非阻塞①已记）。
  - **文档同步**：content-schema §5 标「OwnMap v1 已落地」（:71）；capability-map W7 引擎✅编辑器⚠️（缺 W7b）；engineering-notes 补「旧格式仅剩 reuse」。
  - **门禁**：content 130 / reforge 245 / editor 91 / game 2294 全绿，tc 0。
  - Opus 3 条非阻塞小项不构成返工。
- counter / 返工处理: 当前无 counter。
- 缺签豁免: N/A
- done 准入结论: **done allowed**（三方签字齐。待用户最终验收。）

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
  不变;PaintTilesCommand 载荷换 {layerId, tileId|null} 与碰撞写;undo 语义(一笔
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

### Build 实施定案(2026-07-10)

- Coding Owner:Codex;按 D1(schema/加载/渲染)→ D2(命令/N 层 UI)→ D3(碰撞/闭环/文档)连续推进,期间不换 Owner。
- 碰撞聚合:引擎按逻辑格判定时,该格对应的两个错排子格**任一值非 0 即阻挡**。这是保守规则,避免半格障碍被角色穿过;测试覆盖仅第一子格、仅第二子格、两者均阻挡、两者均为空。
- 遮挡空格:`occlude: true` 的视觉层中 `null` 表示无瓦片,必须直接跳过,不产生 cover-tile/深度表项。
- 分期守卫:D1 与 D2 不作为可交付中间态;若开发被迫停在 D1,编辑器遇到 OwnMap v1 必须禁用旧 `word/mask/h` 绘制路径。D2 完成后旧自有地图绘制 API 整体退役,旧 Tilemap 路径只服务 `reuseOriginalMap`。

### 审查方立场

- 主审:三方(schema 级)。
- 是否建议进入 build: 三方 agree,用户已指定 Codex 接手。

## Build:实现与自验证

- 实现提交:`cd1ab67a feat(reforge): 落地 OwnMap v1 N 层地图`。
- D1:新增 `@type-pal/content` OwnMap v1 类型/加载 guard;校验版本、正尺寸、至少一层、
  `2H×W` 矩阵、唯一稳定 layer id、tile/collision 非负整数。`loadSceneMap` 汇成旧
  `Tilemap | OwnMap`,Canvas2DRenderer 新增 N 层与 `occlude` 深度重绘路径;旧路径保留给 reuse。
- D2:编辑器工作副本切为 `Record<string, OwnMap>`;绘制命令改用稳定 `layer.id`;新增视觉层
  增/删/重排/改名/遮挡属性与独立碰撞命令,全部 apply/invert;MapMode 落地图层列表、显隐、
  选层作画,瓦片编号不再受旧 9 位上限。窄窗口 toolbar 保持自动换行。
- D3:引擎 `isBlockedAt` 对逻辑格执行“两子格任一非 0 即阻挡”;像素叠加精确读命中子格;
  `occlude` 的 `null` 由纯渲染计划直接跳过。`serializeProject → loadOwnMap` 集成测试覆盖
  存储后重开数据闭环;content-schema/decisions/capability-map/engineering-notes 已同步。
- 自动验证:`pnpm check` 最终通过。计数:shared 103、content 130、migrate 73、
  pal-extract 251、reforge 245、game 2294、editor 91,全部 typecheck + test 绿。
- 浏览器验证:6010 已被现有服务占用,故在全新 `http://localhost:6012/` 实测。完成复用图载入→
  新建 24×24 OwnMap→新增/改名/显隐/遮挡/重排图层→前景与地板分别绘瓦→碰撞标记→
  撤销/重做→切回 SceneCanvas 共享渲染;画布非空且两层瓦片、红碰撞格、进场角色均可见。
- 响应式验证:900×700 视口 toolbar 分为两行(`rowTops=[44,78]`),toolbar 底部与 viewport
  顶部同为 132px,`document.scrollWidth === innerWidth === 900`,无重叠/横向溢出。
- 浏览器日志:实现完成后重启 6012 并用全新标签检查,该次启动无新增 warning/error。
- 未在用户目录触发原生 FSA 写盘(避免弹授权或误写文件);以 `serializeProject → loadOwnMap`
  集成测试覆盖同一数据闭环。Opus review 可按需用临时目录补真实 FSA 手工复验。

## Review:审查与返工

- Codex 自审:accept。实现满足设计约束,旧 `word/mask/h/lower/upper` 已退出自有地图 API;
  旧 `pixelToTile` 仅留 reuse 兼容碰撞路径。
- Opus 主审(2026-07-10):**accept**。独立复验全过:
  - **旧概念退出**:全仓扫描 encodeTileLayer*/[LAYER0|LAYER1|COLLISION]_MASK/SubTileEdit/subTilesInRect/floodFillSubTiles/paintCells 零残留;
    MapMode 无 h/lower/upper/word/mask;`loadOwnMap` 加载边界过完整 `validateOwnMap`(assets.ts:73-75)。
  - **代码审**:schema guard 齐(重复 id/尺寸/负值/空层全拒);五个层命令(Paint×2/Add/Remove/Move/Update)
    均「首次 apply 捕获 + invert 精确还原」,Move 往返恒等、Remove 插回原 index;paintOwnMapTiles 按
    layerId 分组不可变写、界外忽略;pixelToLattice/latticeCenter 几何与旧四分法同源(单测往返钉住)。
  - **碰撞双入口语义正确**:像素入口(buildIsBlocked)单子格 → 服务编辑器红叠加(所画即所见);
    逻辑格入口(isBlockedAt)两子格任一非 0 聚合 → 引擎行走全部消费此入口(main.ts:616/1486/1980),
    聚合四态(空空/A/B/双阻)collision.test.ts:94 精确覆盖 —— GLM 覆盖补充 1 落地。
  - **occlude null**:ownMapTilesInView 源头跳过 null(永不产出),own-map.test.ts:109 钉住
    「null 不产渲染/cover 项 + 隐藏层不产项」—— GLM 覆盖补充 2 落地。
  - **渲染几何对拍**:N 层 blit 公式(centerX-HALF_W, centerY-SUBROW)与旧路径 lower/upper blit
    逐像素等价(偶行=旧 lower、奇行=旧 upper);occlude 深度基线 centerY+15 与旧 cover(+7+8)同源;
    layerIndex/1000 稳定同格层序;「先铺后深度重绘」忠实沿用旧机制。
  - **门禁独立重跑**:content 130 / reforge 245 / editor 91 / game 2294 全绿,四包 tc 0。
  - **6010 视觉复验**:reuse 回归(s000 map20 + s001 map12 六民居墙/家具/NPC 深度序与历史逐像素一致);
    新格式全流程(建图→层列表加层/改名/occlude 开关→双层绘制→碰撞标记→undo/redo);fiber 数据级验证
    (v1、lattice 48×24、floor tileId=2 直存 9 瓦、layer-1 occlude=true 5 瓦、碰撞 2→undo 0→redo 2);
    SceneCanvas 共享渲染(own 图两层瓦+进场点人形+金环)+ 220% 遮挡对拍(人形盖身后瓦、
    前景石块正确前置于人形衣摆)。console 零错(仅 favicon 404)。
  - **FSA 评估**:不需补真实 FSA 落盘 —— serialize→validateOwnMap 集成测试已覆盖格式 round-trip;
    FSA 写盘是 P3 已验证的格式无关层,补测边际价值≈0。
- Opus 非阻塞小项(记录,不构成返工):
  ① `packages/reforge/src/index.ts:77-79` 仍导出 `pixelToTile` 且注释写「W7c 笔刷靶定」——
    编辑器已不用,死出口 + 过时注释,建议收进 collision 内部或改注释(可交 GLM 文档轮或下卡顺手)。
  ② 碰撞「视觉≠行为」观察:编辑器红叠加为子格粒度、引擎聚合为逻辑格 —— 作者画半格红可能误以为
    另半格可走。聚合是定案的保守规则,非缺陷;建议后续在碰撞工具提示里写明「行走按整格聚合」。
  ③ renderOwnMap 的 occlude 瓦全量入深度表(旧路径按精灵包围盒筛)——24×24 无感;
    大图性能属分块留口范围,不在本卡。
- GLM(2026-07-10,用户转达):**accept**。覆盖清单/测试矩阵/文档同步/旧概念退役完整性通过;其设计签字所提聚合四态与 occlude null 两条覆盖补充确认落地。
- review 期间不得标记 done;任一 counter 转 rework。

## 交接日志

- 2026-07-09 Opus: 认领 W7a 旧格式地基失误,起草本卡(schema 候选 A + 分期 + 风险);
  用户授权「按最合理方式」→ 本卡立项。Evidence: 本卡 + W7C-3 交接日志。Next: Codex + GLM / 设计签字。
- 2026-07-09 Codex: 设计签字 agree。实现可行,分期合理;补充稳定 layer.id、lattice helper、OwnMap 校验等实现约束。Evidence: 推进签字与 Codex 设计签字说明。Next: GLM / 覆盖审查设计签字。
- 2026-07-09 GLM:设计签字 agree;补充逻辑格碰撞聚合、`occlude` 空格测试与 D1→D2 旧编辑路径风险。Evidence:推进签字 GLM 行。Next:用户指定 Coding Owner。
- 2026-07-10 User:指定 Codex 为 Coding Owner。
- 2026-07-10 Codex:接手 build;碰撞聚合定为“两子格任一非 0 即阻挡”,`occlude` 的 `null` 不入遮挡表,D1/D2 不对外形成可编辑半成品。Next:完成 D1→D3 并自验证后转 review。
- 2026-07-10 Codex:完成 D1→D3,提交 `cd1ab67a`;全仓 `pnpm check`、6012 多层/碰撞/撤销/SceneCanvas 与窄视口验证通过,状态转 review,Codex 签 accept。Next:Opus / 架构代码审查 + 视觉对拍。
- 2026-07-10 Opus:主审 accept(代码审 + 门禁独立重跑 + 6010 旧/新遮挡对拍 + fiber 数据级复验;
  GLM 两条覆盖补充确认落地;3 条非阻塞小项记录在 Review 段;FSA 补测评估为不需要)。
  Evidence: Review「Opus 主审」段。Next: GLM / done 审查签字(用卡尾提示词)。
- 2026-07-10 GLM:done 审查签字 accept(用户转达)。三签齐,done allowed。Next: User / 最终验收。
- 2026-07-10 User:验收通过,授权收口;W7D 状态 done。地图模块地基自此为 OwnMap v1(N 层 + 独立碰撞),旧 Tilemap 仅服务 reuseOriginalMap。Evidence: 用户转达「glm通过了」+ 收口授权惯例。Next: 无(任务关闭;后续 W7b tileset 库 / W7c-4 尺寸编辑另立卡)。

## 下一位 Agent 提示词

无下一位 Agent 提示词 —— 三签齐 + 用户验收通过,任务已收口(2026-07-10)。
