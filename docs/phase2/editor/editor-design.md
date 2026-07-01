# 编辑器整体架构设计(第二阶段 · 内容编辑器)

> 第二阶段 Reforge。2026-07-01 头脑风暴(用户 + Claude)+ 两份代码投查(渲染复用 / 数据模型)。
> **本文件 = 整个编辑器的架构设计(防返工用),非某一期实现。** 先读 [READ-FIRST](../READ-FIRST.md);工程地基见 [project-design.md](project-design.md)。
> 状态:设计(待用户审)。分工:核心/地基(非视觉)可交 GLM,壳+模式(canvas 视觉)Claude 做。

## 0. 这是什么 / 不是什么

**是**:一个网页版可视化内容编辑器(独立 vite app,`packages/editor`),把 `projects/<id>/` 的工程 JSON 变成「可视化编辑 → 落盘 → 游戏生效」。中心永远是当前场景画面,侧边切「模式」,每个模式管一类编辑。

**不是**:不是画像素的美术工具(精灵图复用原版,不新画);不是新引擎(渲染**复用** reforge,不重写);MVP 不是全功能(先一个模式跑通闭环)。

## 1. 决策记录(已拍板)

| 决策点 | 选择 | 理由 |
|---|---|---|
| UI 技术栈 | **React**(+ Vite + TS) | 用户拍板;文档/AI 支持最好。canvas 部分与框架无关。 |
| 落盘 | **File System Access API** | 授权一次文件夹直接读写;编辑器保持独立 app(非 dev-only);Chromium 专用(用户即是)。 |
| 渲染 | **复用 reforge**,不重写 | 投查确认 blitter(含遮挡算法)100% 原样可用;重写=双份维护+必然漂移。 |
| 交互模型 | **模式化外壳**(中心画布 + 模式切换 + 随模式变的面板) | 成熟做法(RPG Maker/Tiled/Godot);解掉「拖动歧义」——手势归当前模式管。 |
| 编辑状态 | **command/undo 模型第一天就进** | 最大返工点:后加 undo = 每个模式重写。 |
| `shared` 依赖 | **接受**(编辑器经 reforge 间接依赖冻结的解码类型) | D18 已登记的债;为它先做资产格式大迁移=过度设计。 |

## 2. 包 / 依赖形状

```
editor  (React vite app,新建)
├─ 依赖 content   ← schema + grid 数学 + validate(本就设计成 reforge+editor 共享)
├─ 依赖 reforge   ← 复用渲染器 / assets 加载 / loader(需先给 reforge 补包出口,见 §3)
│   └─(经 reforge 间接拉进 shared 的冻结解码类型 RleFrame/Tilemap/Palette —— 接受的 D18 债)
└─ src/
   ├─ core/     ← 纯 TS,无 React:编辑会话、command/undo 引擎、跨引用校验、工程 I/O(File System Access)
   ├─ render/   ← 画布视口:包 reforge 的 Canvas2DRenderer + 场景绘制 + 编辑器叠加层(网格/选中框/手柄)
   ├─ modes/    ← 每个模式一个插件(见 §5)
   ├─ ui/       ← React 外壳(布局 / 模式切换 / Inspector / 对话框 / 校验面板)
   └─ main.tsx
```

> **边界**:`core/` 是纯逻辑(可单测、无 React、无 DOM),React 只是它的视图——沿用本仓「纯逻辑与视图分离」惯例(如 reforge 的 state 机)。编辑器**不碰 game/pal-extract**;`shared` 只经 reforge 间接、只用冻结解码类型。

## 3. 渲染复用(第一根地基)—— 投查结论

reforge 的渲染是纯 blitter,零游戏状态耦合。复用需三步(都不重写逻辑):

1. **给 reforge 补包出口**:`reforge/package.json` 现无 `exports`/`main`,加上 + 建 `src/index.ts` barrel,导出:`Canvas2DRenderer` + 类型(`Camera`/`CellRect`/`SpriteDraw`)、`assets.ts` 的 loaders(`loadTilemap/Tileset/Sprite/Palette` + `AssetBase`/`LoadedSprite`)、`loader.ts` 的 `loadProject/assembleProject/LoadedProject`。
2. **抽「画一帧场景」函数**:把 `main.ts:288-323`(clear → 定相机 → 组 `SpriteDraw[]` → scale+`renderScene`)抽成 `renderSceneFrame(ctx, renderer, {map, room, camera, sprites})`,reforge 自己的 main 也改调它(去重,单一真源)。
3. **editor 的 vite.config 复制 `serveDir` 中间件**(`/projects`、`/extracted` → 仓库根目录;和 game/reforge 同款,可抽成共享 vite 插件)。

- `content/grid.ts`(`gridToPixel/pixelToGrid/spriteScreenY` + `GridPos`)本就是纯叶子、共享设计,编辑器直接 import 做落点/命中测试。
- **注意缓存**:`Canvas2DRenderer` 按 palette/tileset 缓存烤图,换调色板/换地图须**重建 renderer 实例**(现无 invalidate API)——编辑器换场景/换调色板时照做。

## 4. 编辑会话 + 撤销/重做(第二根、也是最大返工点)

- **`EditSession`**(core,纯 TS):持有工程的**可变工作副本**(scenes/characters/skills/items/locale + manifest)+ 脏文件集 + undo/redo 栈。
- **所有改动 = `Command`**:`{ do(state), undo(state), label }`(或 patch+反 patch)。改任何东西都经 `session.dispatch(cmd)` —— 统一驱动 undo/redo、脏标记、「改完自动重画」。
- **铁律**:模式**不得**直接 mutate 数据,一律发 Command。否则以后加 undo = 全模式重写。
- React 经 `useSyncExternalStore` 订阅 session → 状态变则重渲染(面板 + 画布)。
- 纯 TS + 无 React → **重度单测**(command do/undo 往返、脏标记、栈边界)。这是地基,测厚。

## 5. 模式即插件的外壳(第三根)

```ts
interface EditorMode {
  id: string; label: string; icon?: ...
  onCanvasPointer(ev, ctx): void      // 画布手势 → dispatch command(仅当前模式生效 → 无歧义)
  renderOverlay(ctx, view): void       // 模式专属画布叠加(选中框/手柄/网格)
  Panel: React.FC                      // 侧面板(该模式的 Inspector/工具)
  Toolbar?: React.FC
}
```

- **外壳**管:画布视口(平移/缩放 + 复用渲染器画底图)、当前模式、选中态、command 派发、模式切换 UI、校验面板、保存。
- **模式**只贡献:画布手势含义 + 叠加层 + 侧面板。加模式 = 往注册表加一个,**不动壳**。
- 这正面回答用户的顾虑:要「工具列表」= 模式切换;拖动只在「布置模式」里生效,切到别的模式含义就变,彼此不打架。

## 6. 校验层(第四根)—— 编辑器的核心价值

现 `content/validate.ts` 只查形状。**投查在 demo 数据里当场抓到 2 个悬空引用**:`skills.json` 的 `levelUp` 指向不存在的技能(349/311/…);土灵珠(267)的 `grantSkill` 指向不存在的 336。形状校验放过了它们。

→ 在 **content 加 `validateReferences(project): Issue[]`**(跨引用完整性,是模型知识、引擎 loader 也能用来告警):
- `EntityDef.interact` → 同场景 `Dialogue.id` 存在;
- `DialogueLine.text/.speaker` → `locale` 键存在(否则渲染成生 id);
- `startWorld`/`learnedSkills`/`inventory`/`equipableBy`/`grantSkill.skillId`/`LevelUpSkill.skillId`/`SkillCost.items` → 目标表 id 存在;
- 系统未落地的字段(`poisonId`/`triggerScript`/`teleport.target`)→ 标「未校验/进阶」,不误报。

编辑器加载/编辑/存盘时跑,结果进底部校验面板(可跳转)。**不做这层,编辑器只会把坏数据越积越多**。

## 7. Schema 缺口(第五根)—— 现在在 content 补

投查发现 schema 对「编辑」不完整,这俩是 MVP 阻塞项(不是可选):

1. **精灵解析**:`EntityDef.sprite`("ghost")**无解析表**,引擎自己写死 2/16([main.ts:180-183](../../../packages/reforge/src/main.ts#L180))。
   → 加**精灵注册表**(新 content 文件 `sprites.json`,进 manifest.content):`{ id, spriteNum, label }[]`。`EntityDef.sprite` 引用其 id;引擎 loader 据此解析(修掉硬编码);编辑器精灵选择器按 `label` 显示 + 渲染 `.rle` 预览(复用现 `?gallery` 调试逻辑)。
2. **场景调色板**:`SceneDef` **无调色板字段**,现靠 `?pal=` URL 兜([main.ts:123-124](../../../packages/reforge/src/main.ts#L123))。
   → 加 `SceneDef.paletteId: number`(默认 0 向后兼容)。引擎读它(去掉 URL hack);编辑器场景面板改它。

> 顺带修引擎潜伏坑。另记一个待修:菜单取角色名用 `` `name.${template}` `` 拼键而非读 `CharacterTemplate.name`([main.ts:235](../../../packages/reforge/src/main.ts#L235) 等 4 处)——编辑器数据模式要么钉死 `name === "name."+id` 不变式,要么先把这 4 处改成读 `.name`。

## 8. 坐标系(已知复杂点,非新地基)

同一场景里**两套坐标**:`SceneDef.map.room` = 老矩形瓦片格(32×16);`EntityDef.pos`/`entry.pos` = 菱形轴 `GridPos`(col/row/height,经 `gridToPixel`)。编辑器的画布渲染(复用 reforge)已正确处理两者;**命中测试/点击落点**要:实体放置用 `pixelToGrid`(菱形),房间裁剪框用瓦片格——`render/` 层同时管两套。`grid.ts` 提供菱形数学。

## 9. 落盘 + 回读闭环

- **File System Access**:开工程时请求 `projects/<id>/` 目录句柄(句柄存 IndexedDB 便于再授权)。保存时按脏文件集只写变的 JSON。
- **闭环**:编辑器画布**已实时显示场景**(复用渲染器)→ 保存写盘 → 游戏(reforge dev,另一标签页)刷新 → loader 重取 JSON → 看到变化。
- **实跑预览**留后期(嵌 reforge 在编辑器内跑);MVP 用「另开标签页刷新」够。

## 10. 模式集 & 分期

**模式全集**:布置(实体/进场点/地图·调色板引用)· 事件对话(对话 + locale 双写)· 数据表(角色/技能/物品)· 地图(刷瓦片,最重)。

**分期**(每期一份 writing-plans 实现计划):

- **B0 · 地基就位**(多为非视觉 → 可 GLM):§3 reforge 补出口 + 抽 `renderSceneFrame`;§7 两个 schema 缺口(sprites 注册表 + scene 调色板)+ §6 `validateReferences`(都在 content,TDD);editor app 脚手架(React+Vite+serveDir);§4 EditSession + command/undo 核(纯 TS,TDD)。
- **B1 · 布置模式 MVP**(canvas 视觉 → Claude):外壳(画布视口 + 复用渲染 + 叠加层)+ 布置模式(选中/拖动/改属性/增删实体 + 改进场点)+ Inspector + File System Access 保存 + 校验面板。**验收**:可视化改 demo 场景 → 存 → 游戏刷新看到变化;undo/redo 通;控制台 0 报错;Claude 浏览器实测。
- **B2+**:事件对话模式 → 数据表模式 → 地图模式。每期只往壳加模式,不返工。

## 11. UI 布局(React 外壳)

- 顶栏:工程名 · 保存(脏标记)· undo/redo。
- 左:模式切换(图标列)。
- 中:画布视口(平移/缩放;复用渲染器画场景 + 模式叠加层)。
- 右:Inspector(当前模式的面板,如实体属性表单)。
- 底:校验问题面板(可跳转)。

> 具体像素级布局(哪块多宽、面板长什么样)开 B1 前单独出 mockup 与用户逐版对齐(新 UI 惯例)。

## 12. 测试策略

- **core**(EditSession/command/undo/校验/工程 I/O)= 纯 TS,vitest 重度单测(地基,测厚)。
- **renderSceneFrame**(reforge)= 抽出后加 smoke/回归测。
- **render/ + React UI** = 轻单测 + Claude 浏览器实测(+ 后期 Playwright e2e)。

## 13. 待定 / 后期(不阻塞)

- 打包发布编辑器(File System Access 生产可用,但工程发现机制同引擎选单一起做)。
- 嵌 reforge 实跑预览(MVP 用刷新标签页)。
- 地图模式的瓦片调色板 UI(最重,最后)。
- zod 替换手写 guard(同引擎 §9 待定)。
- Firefox/Safari 降级(拖拽/导出 zip)——现只保 Chromium。

## 14. Self-Review

1. **防返工五根地基全立**:渲染复用 / command-undo / 模式插件壳 / 校验层 / schema 补口——每一根都是「做错要推翻」的点,现在定死。✅
2. **投查落地**:渲染可复用(补出口+抽函数)、schema 两缺口、2 个悬空引用样本,全进设计。✅
3. **范围克制**:MVP = 单模式,但压满五根地基;其余模式只往壳加。✅
4. **分工清晰**:B0 非视觉可 GLM,B1 视觉 Claude;core 纯 TS 可测。✅
5. **决策成文**:React / File System Access / 复用 reforge / 接受 shared 债——都有理由。✅
6. **未过度设计**:不做美术工具、不重写引擎、不先解 D18 大迁移、不先做实跑预览/打包发布。✅
