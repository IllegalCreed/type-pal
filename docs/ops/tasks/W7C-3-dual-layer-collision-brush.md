# W7C-3 - 地图绘制:双层(layer1)+ 碰撞笔刷

Status: review
Owner: Codex
Reviewer: Opus(视觉级复验)
Phase: phase2
Capability: W7c

## 目标
- 地图模式补齐 RPG Maker/Tiled 标配的另两件:上层(layer1)绘制与碰撞笔刷。作者能在自有地图上画叠加装饰、标禁入格;画瓦不再破坏子格的其他位。

### 范围澄清 / 用户质疑

- 2026-07-09 User: 项目初始目标是支持无限/任意数量图层,为什么这里只做上层和下层?
- Codex 核查:用户记忆正确。`docs/phase2/decisions.md` D16 和 `docs/phase2/foundation/content-schema.md` §5 明确写新地图模型应是 **N 个视觉层 + 独立碰撞 / 地形层**;旧 `cell.lower/upper` + word 位域只是旧 Tilemap 兼容层。
- 本任务当前实现只能定位为“旧 Tilemap 兼容层上的过渡补丁”:让现有自有地图编辑不再互相清位,并临时补齐旧格式 layer1/碰撞笔刷。它**不能**代表最终 W7 地图 schema,也**不能**替代任意数量图层的设计与实现。
- 因存在范围偏差,本任务不得作为“多层/无限图层已完成”收口;是否接受它作为临时兼容切片、还是要求返工为 N 层 schema,需要用户和三方签字裁决。

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

## 推进签字

### 进入 build 前:设计签字

- Codex: agree(事后补签;流程偏差见下)
- Opus: agree(起草本卡并给出 masked write 设计定向)
- GLM: pending
- counter / 分歧处理: 当前无已记录 counter。
- 缺签豁免: N/A
- build 准入结论: **流程偏差**。本任务在 GLM 签字未齐时已由 Codex 开始实现;后续同类任务不得以 `Status: build` 或“接手”替代三方签字。

### 进入 done 前:审查签字

- Codex: accept(自测与浏览器像素验证已记录在 Build 段)
- Opus: accept **仅限「旧 Tilemap 兼容切片」定位**(实现质量复验通过,见 Review 段;但经核实 D16「h/lower-upper 不进新地图模型」与 content-schema §5「N 视觉层 + 独立碰撞层」,本任务的双层/位编码是明文待淘汰的旧格式 —— 不得作为 W7「任意图层」的完成验收;若用户裁决按新格式返工设计,本签字改 counter 并支持返工)
- GLM: **accept**（仅作为旧 Tilemap 双层兼容切片）。测试矩阵 14 条覆盖充分（masked write 互不干扰 / layer1 ±1 往返 / 碰撞 set·clear / floodFill mask 连通 / invert 整 word 还原），无遗漏关键路径。切片边界清晰（:14-17 标注兼容切片，不得作 N 图层完成收口）；capability-map W7 仍标 ❌ 与切片定性一致；旧格式 encode/mask/pixelToTile 退役归 W7D（:121-122 已标）。限制：accept 仅限兼容切片定性，N 层新格式验收归 W7D。
- counter / 返工处理: 当前无必须返工项。
- 缺签豁免: N/A（三方签字已齐）
- done 准入结论: **done allowed**（Codex accept + Opus accept + GLM accept，三方签字齐）。

### 流程偏差记录

- 2026-07-09 Codex: 误把任务卡 `Status: build` 和用户“接手”理解为 build 准入,未先确认三方设计签字即开始实现。修正规则: 非小改/已开卡任务必须先查“推进签字”,签字不齐不得改实现文件。

## Build: 实现与自测
- Coding Owner: Codex
- 修改文件:
  - `packages/reforge/src/own-map.ts` / `own-map.test.ts` / `index.ts`
  - `packages/editor/src/core/commands.ts` / `commands.test.ts`
  - `packages/editor/src/ui/MapMode.tsx`
  - `docs/ops/board.md` / 本任务卡
- 实现摘要:
  - `SubTileEdit` 增加可选 `mask`;`paintCells` 改为 `(old & ~mask) | (word & mask)`,缺省仍兼容整 word 覆盖。
  - 新增 layer1 编码与掩码常量;`floodFillSubTiles` 支持按 mask 判断连通区。
  - `PaintTilesCommand` 的 undo 旧值记录改为不带 mask,确保 invert 全 word 精确还原。
  - 地图模式增加下层/上层切换、layer1 绘制/擦除、碰撞标记/清除、碰撞叠加开关;笔刷/矩形/填充/预览统一走 masked edit。
  - 地图工具栏改为专用 `map-toolbar` 工具组布局;空间不足时自动换行,画布随工具栏高度下移。
- 运行命令:
  - `pnpm --filter @type-pal/reforge test`
  - `pnpm --filter @type-pal/editor test`
  - `pnpm --filter @type-pal/reforge typecheck`
  - `pnpm --filter @type-pal/editor typecheck`
  - `pnpm --filter @type-pal/game test`(120 files / 2294 tests)
  - `pnpm check`
- 浏览器 / 手工检查:
  - 6010 已有 editor dev server;用系统 Chrome + Playwright 打开 `http://[::1]:6010/`。
  - 流程:地图模式 → 新建自有地图 → 同一子格 `(12,11,h0)` 画下层 #1 → 画上层 #2 → 标记碰撞 → undo/redo 碰撞 → 下层重画 #3 → 清除碰撞。
  - 结果:重画后 word = `204803`,解码为 layer0 #3 + layer1 #2 + collision bit;浏览器内 `serializeProject` 输出同一 word。
  - 像素证据:`/private/tmp/w7c3-blank.png`, `/private/tmp/w7c3-lower.png`, `/private/tmp/w7c3-upper.png`, `/private/tmp/w7c3-collision-set.png`, `/private/tmp/w7c3-undo-collision.png`, `/private/tmp/w7c3-redo-collision.png`, `/private/tmp/w7c3-lower-repaint.png`, `/private/tmp/w7c3-collision-clear.png`。
  - Canvas hash / 红色像素:blank `400979840/0`;lower `194243175/0`;upper `3715762858/0`;collision `2841328405/7`;undo collision `3715762858/0`;redo collision `2841328405/7`;clear `3715762858/0`。
  - 工具栏换行检查:1440×920 视口中心区宽 `904px`,工具栏高 `61px`,工具组 `2` 行,canvasTop = toolbarBottom = `101`,截图 `/private/tmp/w7c3-toolbar-wrap-1440.png`。
- 跳过的检查及原因:
  - 未点击真实 FSA 保存落盘,避免把验证用 `content/maps/s000.json` 写入工程;改用浏览器内同一 session 的 `serializeProject` 文件集验证保存序列化包含新位。

## Review: 审查与返工
- Reviewer: Opus(视觉级复验)
- 审查结论: **accept**。独立复验全部通过:
  - 代码审:masked write 按卡定向精确落地(掩码常量/±1 偏移/`>>>0` 无符号处理全对);PaintTilesCommand prev 显式不带 mask → invert 整 word 精确还原 ✓;floodFill 按 mask 判连通是合理的超范围增强;UI 的 word/mask 组合(下层/上层/擦除/碰撞 set·clear)逐条核对无误。
  - 门禁独立重跑:reforge 246 / editor 89 / game 2294 全绿,tc 0。
  - 浏览器数据级复验(React fiber 读 state,比像素计数更硬):同一子格 画#2→叠上层#5→标碰撞→重画#3 后 word = `0x00062003`(layer0=3 + layer1=6 + bit13 三层共存)——masked 核心成立;undo×5 全撤(含建图)→ redo×5 逐笔重放终态与原态逐字节一致;碰撞清除 `0x62003→0x60003` 只清 bit13。console 零错。
  - 像素计数在红叠加混色下有噪音(-120 假信号),复验方法以数据级为准 —— 记入方法论。
- 复验发现项(非 Codex 引入): 碰撞叠加把界外恒阻挡画成边缘红圈(空白图看似全边被标),W7c-1 视口余量遗留;Opus 已作为独立小改修复 scene-stage.ts(blocked 只画图内子格),空白图红像素 50599→0、真标记 297 正常。
- 必须返工项: 无。
- Accept / rework: **accept**

## 交接
- 2026-07-09 Opus: 发起并起草本卡(锚点含子格 u32 布局考证、masked 写入设计定向、代码锚点)。Evidence: 本卡。Next: User / 定 Owner(Codex 或 Opus)。
- 2026-07-09 User: 定 Owner = Codex(三贤人换手首单;Opus 复验兜底)。Evidence: 用户拍板。Next: Codex / build。
- 2026-07-09 Codex: build 完成,状态转 review。Evidence: Build 段命令与 6010 浏览器像素验证记录。Next: Opus / review。
- 2026-07-09 Opus: 复验 accept(代码审 + 门禁独立重跑 + 数据级浏览器复验);顺手修复复验发现的 W7c-1 边缘红圈遗留(scene-stage.ts,独立小改)。Evidence: Review 段。Next: User / 验收,Codex 或 Opus 收口提交。
- 2026-07-09 Codex: 补入三贤人推进签字门禁后,本任务因 GLM 未签仍保持 review,不得 done/收口。Evidence: 推进签字段。Next: GLM / 覆盖审查补签,或 User / 缺签豁免。
- 2026-07-09 User: 质疑 W7C-3 只做双层,与项目初始“无限/任意图层”目标不符。Codex 核查 docs/phase2/decisions.md D16 与 content-schema §5 后确认:最终模型应为 N 视觉层 + 独立碰撞/地形层;本任务只可视为旧 Tilemap 兼容切片。Evidence: 范围澄清段。Next: User + GLM / 裁决是否接受临时切片或要求返工设计。
- 2026-07-09 Opus: 复核 D16/§5 后**认领架构失误**:W7a-2 起把自有地图建在旧 Tilemap 格式上、W7c 沿旧格式位编码深挖,且未把该格式选择作为架构决策上报 —— collision.ts 头注释明写「新代码勿直接调像素接口」,起草本卡时仍导出 pixelToTile 给编辑器。用户质疑成立。架构建议:接受本任务为兼容切片(实现质量已复验),另立「自有地图 N 层新格式」schema 级完整任务卡(三方设计签字)返工地基;返工窗口最佳 —— 自有地图尚无真实内容,交互骨架(工具态/stroke/undo/矩形/填充/面板)格式无关可全保留,报废仅位编码层(encode/mask/pixelToTile 子格依赖),新格式每层即瓦片数组、比位魔法更简。Evidence: decisions.md:116-122、content-schema.md:69-77。Next: User / 裁决切片定性 + 是否立返工卡。

## 下一位 Agent 提示词

```text
接手任务: W7C-3 - 地图绘制:双层(layer1)+ 碰撞笔刷
任务卡: docs/ops/tasks/W7C-3-dual-layer-collision-brush.md
当前状态: review。Codex 已完成 build 与自测,Opus 已完成复验 accept;三贤人签字门禁补入后,GLM 的 done 审查签字仍是 pending,所以不得标记 done 或最终收口。
你的角色: GLM 覆盖审查 / done 前补签。
先读: AGENTS.md 的三贤人协议;本任务卡的“范围澄清 / 用户质疑”“上下文锚点”“验证”“推进签字”“Build”“Review”段;docs/phase2/decisions.md D16;docs/phase2/foundation/content-schema.md §5。子格模型已考证钉死,勿再考证。
已完成: masked write、layer1 绘制/擦除、碰撞笔刷/叠加、undo/redo、序列化验证已由 Codex 实现并记录;Opus 已做代码审、门禁复跑和浏览器数据级复验并 accept。
请你做: 从覆盖清单、测试矩阵、文档遗漏、数据/schema 风险角度审查本任务是否可进入 done;特别判断“旧 Tilemap 双层兼容切片”是否可以临时验收,以及它与最终 N 图层 schema 的边界是否已写清。若认可,给出 GLM: accept 的理由和“仅作为临时兼容切片”的限制;若不认可,给出 counter、必须返工项和需要用户拍板的问题。
不要做: 不要改实现文件;不要把任务标记 done;不要重新引入 paletteId/调色板概念;不要重新考证 cell.lower/upper 子格模型。
输出要求: 明确输出 agree/accept 或 counter + 理由;若 accept,请说明任务卡“进入 done 前:审查签字”的 GLM 行可改为 accept,done 准入结论是否可改为 done allowed。
```
- 2026-07-09 User(授权 Opus 代拟): 裁决 W7C-3 按兼容切片定性验收;N 层返工立 W7D 卡;done 仍待 GLM 补签(不豁免)。Evidence: 用户「按照你觉得最合理的方式来」。Next: GLM / 补签(用卡内提示词)。
