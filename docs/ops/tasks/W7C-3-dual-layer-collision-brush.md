# W7C-3 - 地图绘制:双层(layer1)+ 碰撞笔刷

Status: build
Owner: Codex
Reviewer: Opus(视觉级复验)
Phase: phase2
Capability: W7c

## 目标
- 地图模式补齐 RPG Maker/Tiled 标配的另两件:上层(layer1)绘制与碰撞笔刷。作者能在自有地图上画叠加装饰、标禁入格;画瓦不再破坏子格的其他位。

## 范围
- 范围内:masked 子格写入(SubTileEdit/paintCells 加 mask);图层切换(下层/上层);上层绘制与擦除;碰撞笔刷(set/clear)+ 碰撞叠加显示开关;undo/redo/保存 round-trip;单测 + 浏览器像素级验证。
- 范围外:图尺寸编辑(W7c-4)、tileset 库与上传(W7b)、高度位编辑(随 W7b tileset 元数据一起)。

## 上下文锚点
- 铁律:`docs/phase2/READ-FIRST.md`;绘制工具照 RPG Maker/Tiled 惯例已获用户授权(2026-07-09「照惯例直接建」),此外的形态选择不自作主张。
- 不得重新引入:调色板/paletteId 概念(已退役,只留盘 0);下标式身份。
- 子格模型(已考证钉死,**勿再考证**):`cell.lower/upper` = 同格两个错排菱形子格(h=0 整格位 / h=1 右下偏半格),不是图层;子格 word 为完整 u32 ——
  - layer0 瓦片 = 位 0-7 + 位 12 作第 9 位(`packages/reforge/src/render.ts:17` tileIdLayer0;与 `encodeTileLayer0` 互逆,有单测);
  - layer1 = 高 16 位同布局但**存储值 = tileId + 1**(0 = 无;`render.ts:20` tileIdLayer1 做 -1);
  - 高度位 = `(d>>8)&0xf`(layer0)与 `(d>>>24)&0xf`(layer1),cover-tile 遮挡用(`render.ts:293`);
  - 障碍 = bit13 / 0x2000(`packages/reforge/src/collision.ts:48`)。
- 设计定向(masked write,RPG Maker 惯例:瓦片与碰撞互不干扰):
  - 画 layer0:mask `0x000010ff`;画 layer1:mask `0x10ff0000`(写入值含 +1 偏移,保高度位);擦 layer1:mask `0xffff0000` 写 0;碰撞笔刷:mask `0x2000` set/clear;高度位一律保留原值。
  - `paintCells` 支持 `(old & ~mask) | (value & mask)`。
  - ⚠ 现状 W7c-1 是整 word 覆盖 —— 本任务必须改为 masked,否则画 layer0 会清掉 layer1+碰撞。
- `PaintTilesCommand`(`packages/editor/src/core/commands.ts`)prev 捕获存整 word、invert 全量还原 —— masked apply + 全量 invert 数学自洽(单 Owner 无并发),redo 安全,prev 逻辑不必改。
- 代码锚点:`packages/reforge/src/own-map.ts`(encodeTileLayer0 / paintCells / SubTileEdit;测试 `own-map.test.ts`);`packages/editor/src/ui/MapMode.tsx`(工具态 / stroke 本地预览 / hover);`packages/editor/src/ui/scene-stage.ts` drawGridBlocked 已支持 blocked 红色叠加(MapMode 现传 false,接开关即可)。
- 交互惯例(已立,勿改):拖一笔 = 一条命令 = 一步撤销;stroke 拖动中本地预览、松手入命令;中/右键平移;选瓦自动入笔刷。

## 验证
- 单测:masked paintCells(掩码语义/边界)、layer1 编码 ±1 往返、碰撞 set/clear、PaintTilesCommand masked apply + invert 精确还原。
- 浏览器(6010 → 地图模式 → 建自有图):画 layer0 后既有 layer1/碰撞位不变;上层画瓦叠加可见;碰撞笔刷红色叠加即时显隐、可擦;undo/redo 像素级;保存序列化含新位。
- 门禁:reforge + editor typecheck/test 全绿;game 2294 不回归。

## 交接
- 2026-07-09 Opus: 发起并起草本卡(锚点含子格 u32 布局考证、masked 写入设计定向、代码锚点)。Evidence: 本卡。Next: User / 定 Owner(Codex 或 Opus)。
- 2026-07-09 User: 定 Owner = Codex(三贤人换手首单;Opus 复验兜底)。Evidence: 用户拍板。Next: Codex / build。
