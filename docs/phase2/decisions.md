# 第二阶段 · 决策记录（decisions）

> 已拍板的第二阶段架构 / 范围决策。每条 = 决定 + 理由 + 影响。还在讨论的议题见 [design-backlog.md](design-backlog.md)；总纲见 [roadmap.md](roadmap.md)；铁律见 [READ-FIRST.md](READ-FIRST.md)。
> 这是 roadmap §6 预告的 `decisions.md` 本体，滚动累积。
>
> **2026-06-25 重新聚焦**：第二阶段 = **现代化引擎 + 编辑器 + 内容创作**（个人开发者、内容驱动）。MMO 与玩法 / 成长系统设计（原 **D5–D8**）移交 [docs/phase3](../phase3/future-gameplay-and-mmo-backlog.md)，不再占用第二阶段心智。本文只留引擎 / 编辑器 / 内容相关决策。

## D1 · 第二阶段开工：垂直切片先行（2026-06-24）

**决定**：第一阶段（v1.0.0，功能无 todo，剩长尾视觉 / 听验）视为可收尾，第二阶段开工；策略 = roadmap §5「骨架先行 + 垂直切片」，不瀑布。
**理由**：两阶段并行不阻塞（新引擎另起 package、冻结旧 `game`，验收 bug 继续在 game 修）；第二阶段主动拆掉了 sdlpal 真值锚，最大风险是架构空转，垂直切片用「能跑的真实内容」当新标尺。
**影响**：下一步 = 写第一个切片 spec，**不是**先写完整 P1 spec 或先把 P0 schema 定稿。

## D2 · 首个垂直切片边界（2026-06-24，2026-06-25 修订）

**决定**：起 `@type-pal/content` + `@type-pal/reforge`，手写一个最小室内场景，新引擎跑通走路 + 撞墙 + NPC 对话翻页。**不含**编辑器 / 迁移器 / 战斗 / 菜单 / 存档。
**理由**：editor 依赖引擎 + schema 先稳定（roadmap §3 第 4 条「引擎先吃通 schema 再做编辑器」）；迁移器等 schema 被切片验证后再写，免返工。
**影响**：架构红线 ——
- 三层状态分离 / 可实例化零模块单例 / action（原 OpcodeHandler）注册表 / entity 统一模型 + 稳定 id（对照 audit P0-1/3/4/5 切干净）。
- **移动 = 意图 → 纯函数碰撞判定 → 结果**，不直接 mutate 坐标 —— 作为**干净可测的设计**保留；原「为 MMO 碰撞权威留口」的理由已随 D5 移交第三阶段，复杂度按内容实际需要定，不为未来过度设计。
**2026-06-25 修订**：①渲染 API 改为重新评估（见 D4）；②切片应**承载一小段真实 DLC 内容**，而非内容无关的通用房间——避免「为引擎而引擎」的空转。具体内容待定后切片 spec 重写。

## D3 · 地图尺寸可变（2026-06-24）

**决定**：每张地图自带 width/height，不是全局常量。**层次 A**（每图有限矩形网格、尺寸可变）现在做；**层次 B**（超大无缝 / 分块流式）MMO 级，留口不做。
**理由**：原版被 `Tiles[128][64][2]` 焊成恒定 64×128，小场景背满空格；渲染 / 碰撞本就按 width/height 跑，层次 A 近乎白送；编辑器必需。
**影响**：已补进 [p0-content-schema §5](foundation/content-schema.md) + [backlog 议题 4](design-backlog.md)；切片手写场景按真实小尺寸写。

## D4 · 渲染：RGBA + 后处理一等公民；调色板降级为解码资产（2026-06-24；渲染 API 见 D10）

> **2026-06-25**：渲染 API 已定 = **Canvas 2D 起步**（见 D10）。本条其余两点与 API 无关、保留：①palette 只作「把 indexed 美术烘成 RGBA」的解码资产，运行时不靠换盘做效果；②渲染走 **Renderer 接口**、实现可换。

**决定**：运行时渲染走 RGBA；昼夜 / 天气 / 淡入淡出 → 后处理 / 整屏合成（而非换盘）。
**理由**：palette-as-state 是 1995 VGA 硬件遗产、audit P1-1 的天花板（无半透明 / blend / 光照）；RGBA + 后处理解锁 [backlog 议题 2 / 3 / 6](design-backlog.md)（时间→光照 / 天气 / 遮挡半透明）。
**影响**：①渲染走 **Renderer 接口**，第一刀实现 = Canvas 2D（见 D10）；②后处理 / 整屏调色作为渲染管线一等公民留位；③原版 palette 轮转类效果（图标闪烁 / 水波 / 红屏）用合成 / 帧动画重做，高级光照留 WebGL 升级后；④indexed→RGBA 解码时机（构建期 vs 运行期）P1 再定。

## D5–D8 · 已移交第三阶段（2026-06-25）

原 **D5**（MMO 碰撞 / 重叠留口）、**D6**（回合制 + 身法策略轴）、**D7**（多难度绑定 AI 强度）、**D8**（仙术熟练度取代属性经验值）= MMO / 战斗 / 成长**玩法系统**设计，对「引擎 + 编辑器 + 内容」的第二阶段过早。**全文移交** [docs/phase3/future-gameplay-and-mmo-backlog.md](../phase3/future-gameplay-and-mmo-backlog.md)，第二阶段不为其留口。
（D 编号保持空缺不复用，便于回溯。）

## D9 · 国际化为必做（2026-06-24）

**决定**：所有面向玩家文本（对话 / 物品名 / 仙术描述 / UI）走**稳定 text id** + locale 查表，第二阶段就做。
**理由**：稳定 id 铁律（[p0 schema §2](foundation/content-schema.md)）天然支持 i18n，零成本留口；仙剑文本量巨大且原版靠 WORD.DAT 字面下标硬编码；晚期做要重构所有文本。
**影响**：见 [backlog 议题 10](design-backlog.md)；P0 schema 文本字段一律是 text id 引用，运行时查表。**注**：先做中文同人，多语言可永远不补，但「文本走 id」这个零成本习惯现在就立。
**2026-06-25 → 06-26 强化**（见 [D11](decisions.md)）：对话正文**也**确认走 text id（原一度倾向「留口、内嵌字面」，作者定第二阶段可能主面向英文用户后作废）；i18n **机制**本次就做、locale 先填 zh，实际译文按需补。

## D10 · 渲染 API：Canvas 2D 起步，Renderer 接口可换（2026-06-25）

**决定**：reforge 渲染先用 **Canvas 2D**（`drawImage` 画瓦片 / 精灵、`fillText` 画文字），藏在 `Renderer` 接口后（画瓦片 / 画精灵 / 画文字等方法）。**WebGL 推迟**到真撞上需求（全游戏级昼夜 / 天气 / 光照，或精灵爆量）那天再换——因走接口，换 = 换一个实现类，不波及上层。细化并取代 [D4](decisions.md) 的「渲染走 GPU / WebGL2」部分。
**理由**：
- 「现代化」在**架构**（解耦 / 数据驱动 / 编辑器友好 / 状态分层），不在渲染 API；Canvas 2D 不影响引擎是否现代。
- WebGL 两大卖点——全屏着色器效果、海量精灵性能——前者单机故事 DLC 多半用不到，后者主要是 MMO 的事（已移交 [第三阶段](../phase3/future-gameplay-and-mmo-backlog.md)），最硬的理由已软。
- 个人开发者、内容驱动：Canvas 2D 到「看得见的结果」最快、在已掌握的地盘（第一阶段就是软件 framebuffer + canvas），把 WebGL 学习成本移出关键路径，降低卡壳与焦虑。
**影响**：
- **唯一纪律**：渲染从第一刀就走 `Renderer` 接口，不让 Canvas 2D 细节泄漏到引擎其它部分——这是日后能局部换 WebGL 的前提。
- 全屏色彩效果（昼夜 / 天气 / 淡入 / 红屏）用整屏 tint / 合成模式实现；高级光照留 WebGL 升级后。
- **诚实的代价**：哪天想让整个游戏有便宜的昼夜 / 天气 / 光照，要么用 Canvas 笨办法、要么那时投入换 WebGL。对单机故事 DLC 是划算的赌注。

## D11 · 对话数据结构化 + i18n 一等公民（2026-06-26）

**决定**：对话从「in-band 控制符扁字符串」（`~30`/`$10`/`"`/末尾冒号）改为**结构化 `DialogueLine`**（`speaker`/`text` = 稳定 `TextId`、`speed`/`autoAdvance` = ms）；功能 / 结构控制符**前移到数据生产期**（迁移器 / 编辑器）解析掉，运行时无 `parseDialogText`。对话正文**也走 text id + locale**（强化 [D9](decisions.md)，面向英文用户）；多色强调用 **locale 富文本成对闭合标记**（`<cyan>…</cyan>`），不进结构化字段。**分支**留演出层（choice action，非对话行）、**DSL** 留口不做。详见 [model-design.md](dialogue/model-design.md)。
**理由**：in-band 控制符把「控制信息」和「文本内容」焊死，违铁律 4（架构第一）/ 5（杜绝下标式身份）；解析前移让运行时只消费干净数据，比 GLM spec 的「运行时 port `parseDialogText`」干净一级。i18n 一等公民因第二阶段可能主面向英文用户。DSL（类 Ink/Yarn）与可视化 editor 产出的结构化数据重叠、对个人开发者是过度基础设施；分支本质是演出逻辑、不属对话行（强行塞进对话数据 = 新耦合）。
**影响**：
- 实现**分三刀，先地基**：**① 数据模型 + 状态机**（本次，含最小 locale 查表 + 鬼话迁 zh，单测验收）→ **② 外观继承**（承接 [GLM 外观 spec](dialogue/visual-spec.md)）→ **③ 迁移器**（原版控制符 → 结构化 + locale zh）。
- 承接并修订 [visual-spec.md](dialogue/visual-spec.md)：外观真值整体继承，唯把数据源从「控制符字符串」换成「结构化 + locale 查表」（删 `parseDialogText` 移植那步）。
- 颜色用语义名（`<cyan>` + 渲染层映射 palette），内容 / locale 层不出现魔法数；时长存真实 ms。
- 多语言**机制**本次做、locale 先只填 zh，**实际译文按需补**。

## D12 · demo 定位：技术验证，非 DLC 堆砌（2026-06-27）

**决定**：第二阶段 demo（鬼界民居切片）目标 = **给引擎子系统做技术验证**（地图渲染 / 移动 / 碰撞 / 遮挡 / 对话 / 菜单… 逐个跑通），**不是**把它扩成完整 DLC。借一个 DLC 设想场景当试金石；每个子系统验到「核心跑通 + 架构能对接将来的编辑器 / 迁移器」即够。
**理由**：第二阶段重点 = 引擎 + 编辑器（剧情在其上）。避两坑——为内容而内容（堆成 DLC）、无限完善（一系统磨到完美才肯下一个）。
**影响**：
- 路径顺序：验证引擎子系统（现在）→ 编辑器 → 迁移器（③）→ 一点点加载原版剧情 + 编辑器里改。「加载原版剧情」是**最后**一步，别在心里跑太前。
- 每个切片范围按「验证哪些技术点」切，非「内容需要什么」。**推论**：demo 对话可设计成「覆盖对话系统全部技术点的展示样本」，跑一遍即直观看到完成度（见 ② 范围）。

## D13 · 文本呈现 ≠ 文本归属；不照搬 sdlpal box-style 大杂烩（2026-06-27）

**决定**：分层——「文本怎么画」（字模 / 框 / 打字 / 着色 = 共享底层原语 `text-render`）与「文本谁产生 / 归谁管」（各系统职责）分开。**对话系统只管角色交谈**（NPC 台词 / 心理活动）；其余带文字的东西各归各系统、只复用 `text-render`：物品获得 / 用道具反馈 → 物品 / 技能系统；旁白（一夜之后…）→ 演出系统；死亡「大侠请重新来过」→ 流程系统；**narration / item-box 不属于对话系统**。
**理由**：sdlpal 把对话 / 旁白 / 物品框塞进一个 `box style` 枚举（top/center/bottom/narration/item-box）+ 一套 `drawDialogBox`，是 1995 实现耦合；第一阶段忠实复刻了，但铁律「逻辑可移植、模块结构不照搬」要拆。**按职责归类，非按外形（都是文字）**。
**影响**：
- ② 对话模块分两层：通用 `text-render`（字模 blit / palette→RGBA / 打字 / 着色，不绑对话）+ 对话渲染（姓名 / 翻页 / 框，调用它）。
- 对话系统**无「框样式」要素**（透明，文字直叠画面）；带框 / 覆盖层的文本归各自系统，将来复用 `text-render`。

## D14 · 对话框 = 具名 slot；位置自动定位放创作期（2026-06-27）

**决定**：对话框建模成**具名 slot**（`top` / `bottom`，可扩展），独立面板**可同屏共存**；每句 `DialogueLine` 显式指定 `slot`。**位置「自动 vs 手动」统一在创作期**——「按说话人自动定位」是编辑器 / 迁移器的便利规则（自动填出显式 `slot` 数据），**运行时只忠实渲染数据里的 slot**，不在运行时猜「说话人 → 位置」。
**理由**：原版「上下框共存」只是 framebuffer 不清屏的**副作用**，做成显式 slot 更干净。运行时猜位置 = 隐式魔法（难调试 / 编辑器看不出 / 改不动），违 [D13](decisions.md) / 铁律；自动放创作期 → 手动与自动**统一产出显式数据**，灵活 + 可控 + 可视。
**影响**：
- ② `DialogueLine` 加 `slot?` / `portrait?`；渲染层管理多 slot 各自状态（留显 / 活跃）。
- slot 生命周期：同 slot 翻页覆盖、不同 slot 共存、对话结束清所有；**复杂清屏编排**（任意时点清某 slot、黑屏叠字…）留**演出系统**（[P0 §6](foundation/content-schema.md) timeline action），不塞对话数据。
- 详见 [visual-design.md](dialogue/visual-design.md) §4。


## D15 · 运行时全 RGBA；palette 仅迁移期解码（2026-06-27）

**决定**：第二阶段运行时**彻底无 palette**，美术统一 RGBA。两类来源——① AI 生图天生 RGBA；② 原版 indexed 素材由**第二阶段迁移器**（读 `data/extracted`）烘成 RGBA（indexed + palette → RGBA PNG），属 [P0 §8](foundation/content-schema.md) 迁移器的一步。**`pal-extract`（第一阶段提取器）不动**——它产 indexed + palette 给第一阶段 game，改它会耦合两阶段 + 破坏 game。UI / 对话语义色（字体 / 姓名 / 光标）用**固定 RGBA 常量**，不绑场景 palette。
**理由**：palette 是 1995 VGA 省显存遗产，Canvas2D / AI 彩图无此约束，运行时留着是负担 + 一类坑（UI 色绑场景 palette index → 跨场景不一致；实证:pal1 的 UI index 全成灰、pal2 姓名色 0x8C = 纯黑[0,0,0]）。是 [D4](decisions.md)「palette 降级为解码资产」的彻底化（D4 留的「解码时机 构建期 vs 运行期 P1 再定」→ 此定为**迁移期**）。原版 palette 的运行时变色（昼夜 / 水波 / 受伤红屏）改用后处理 / 整屏合成（D4 已定，不靠换盘）。
**影响**：
- 链路:`pal-extract`(不动) → `data/extracted`(indexed + palette) → 迁移器(烘 RGBA) → `content/assets`(RGBA) → reforge 吃。
- **两块错开**:① UI / 对话语义色 → 固定 RGBA 常量,**现在就能改**(`palette-color.ts` / 头像 / 光标,不依赖迁移器);② 美术资产(sprite / tile / 头像)RGBA 化 → **随迁移器建**(③ / 编辑器附近,不是现在)。
- demo 现状(reforge fetch `data/extracted` 的 indexed + 运行时 palette 解码)是 [D2](decisions.md)「切片复用原版」权宜,留到迁移器那刀转 RGBA。
- **两阶段资产管线解耦**:`pal-extract` 不为第二阶段改动;烘 RGBA 是第二阶段迁移器的活。
- [art-pipeline](foundation/art-pipeline.md) 据此更新(留后)。

## D16 · reforge 渲染地基：逻辑 / 显示分离（格坐标 + UI 高清化）（2026-06-28）

**决定**：reforge 渲染分**逻辑层 / 显示层**两层、彻底解耦。

- **逻辑层**（存储 / 游戏逻辑 / 碰撞 / 触发 / 寻路 / 存档 / 编辑器）：实体位置 = **格坐标 `GridPos = { col: number; row: number; height: number }`**（非像素）。`col`/`row` = **菱形轴**（沿菱形两条斜边设轴，非屏幕像素轴）：菱形网格是旋转 45° 的正交网格，走一格 = **单轴 ±1**（只动 col 或只动 row，绝不对角），任意整数 `(col,row)` 都是合法落脚点；`height` = 垂直高度轴，**必填、地面实体写 0**，与平面 col/row 正交（逻辑/碰撞/影子都在地面 `(col,row)`，height 只把 sprite 显示位置沿屏幕正上方移）。GridPos 是实体位置的真值类型——玩家、NPC、entry、编辑器摆点都存它。精灵是三维空间里的东西（平面格子 + 离地高度），`height` 让飞行 / 楼层 / 高台站立的位置可表达，并直接对接渲染遮挡（[render.ts:232](../../packages/reforge/src/render.ts) 瓦片 baseY 已 key 在 `iTileHeight` 上，精灵接入即正确遮挡）。
  - ⚠ **不要**用屏幕像素轴 `(col=x/16, row=y/8)` 当坐标——菱形格是斜的、屏幕 x/y 是正的，硬塞会让走一格变成对角（col/row 同时变）且半数坐标非法。正解 = 菱形自己的斜边当轴：`gridToPixel(col,row) = (16(col−row), 8(col+row))`。详见 [render-foundation-plan.md](foundation/render-foundation-plan.md)。
- **显示层**（渲染）：格 → 像素（直接定位）；**移动显示 = 格到格步进、保持原版卡顿感（~10fps 步进），不做平滑插帧** —— 作者明确喜欢卡顿感，插帧留后续可选、非必做。文字渲染走 wall-clock（[typewriter.ts](../../packages/reforge/src/text/typewriter.ts) 按 `performance.now` 算），与移动 10fps tick 本就是**两套独立时钟**，互不拉扯。

### 关于 `h` / lower-upper（旧引擎遗物，**不进坐标、不进新地图模型**）

旧引擎 tile 数据把「2 视觉层 + 障碍 bit」焊进一个 word，`cell.lower`/`cell.upper` 二分、碰撞靠 `h∈{0,1}` 二选一查障碍（[collision.ts](../../packages/reforge/src/collision.ts) `pixelToTile`）。这是 **[backlog 议题 4](design-backlog.md) 要淘汰的「仅 2 视觉层」硬编码遗迹**——新地图模型是 **N 视觉层 + 独立碰撞 / 地形层**（[p0 schema §5](foundation/content-schema.md)），障碍单独一层，没有 lower/upper 二分。

- 故 `h` **不进 `GridPos`**（它不是空间轴，是 `pixelToTile` 从像素解出「查哪个通道」的中间量），**也不进新地图 schema**。
- 它的归宿 = [collision.ts](../../packages/reforge/src/collision.ts) 这个**旧格式兼容层**的内部细节：只要 reforge 还读 `data/extracted` 的旧 `Tilemap`，`pixelToTile` 就得继续用；等迁移器把图翻成「N 层 + 独立碰撞层」新格式，整个 `pixelToTile` 连同 `h` 一起退役。
- 一句话：`h` 是「新引擎还兼容旧地图格式多久」的问题，**不是实体坐标该不该带的问题**。

### 物理 1280：UI-HD（近期）vs 世界-HD（远期）—— 两件事分开

物理分辨率提到 **1280×800（4x）**、逻辑保持 **320×200**。两个不同时点、不同性质的需求：

| | 时点 | 驱动 | 做法 | 要 logical-size manifest 吗 |
|---|---|---|---|---|
| **UI / 文字 HD**（对话 / 菜单） | **近期（本决策要做）** | **信息密度**：320 下 CJK 16px 已是下限，想加密只能缩小，但 320 物理放不下更小却清晰的字 → 必须升物理分辨率 | UI 元素按物理精度真高清渲染（非「320 整体放大」低清）；**点阵字模沿用**（整数倍放大 = 锐利，不糊） | 否 |
| **世界资产 HD**（瓦片 / 精灵） | **远期** | 替换原版素材 | ×4 整数倍——提取器导出放大版即可，感官一致、**零渲染逻辑改动** | 否（整数倍放大，当前无需） |

- **UI（对话 / 菜单）与世界走同一套逻辑 / 显示分离机制**，不分两套：UI 元素（文字 / 边框 / 装备格 / 头像）按物理精度真高清渲染（作者明确：UI 也要相同升级、非独立低清）。
- **字模不换源、沿用点阵**：原 16px Unifont 点阵 ×4 整数倍放大 = 64px **锐利点阵字**（nearest-neighbor，每个原像素变 4×4 实色块），观感与原版一致——**整数倍放大点阵不糊**。信息密度问题靠物理分辨率提升 + 字模按更小逻辑尺寸排版解决，不需要换字模源。
- 「素材 manifest 增 logical-size 字段」**不是本决策必做项**——当前 ×4 整数倍放大即可；logical-size 抽象等真有「非整数倍 / per-asset 异分辨率」需求（即世界 HD 真正落地）时再上，现在加是用不到的过度抽象。

**理由**：reforge 现在**反着来** —— `player.pos` 存像素（[content/index.ts](../../packages/content/src/index.ts)、[main.ts:110](../../packages/reforge/src/main.ts)）、`render.ts TILE_W=32` 绑死素材像素、`drawImage` 按素材原尺寸画。硬伤：① 实体位置存像素 → 逻辑层（碰撞 / 触发 / 编辑器 / 存档）被迫按像素算，格语义丢失；② UI 锁死 320 → 文字信息密度封顶。格坐标让实体位置回归格语义（碰撞 / 触发 / 编辑器按格简单、`height` 一等支持三维）；物理分辨率升 1280 解信息密度封顶。是最底层地基，后置 = 大面积返工（坐标 + 全 UI 坐标），必须先于菜单及一切 UI。

**影响（范围拆两半，不绑死一刀）**：
- **D16 核心 = 世界坐标格化（必做）**：`render.ts` / `movement.ts` / `collision.ts` / `main.ts` 的**实体坐标**改逻辑格 `GridPos`；移动、碰撞随之改。`h`/lower-upper 维持现状（旧格式兼容层，不动）。
- **D16 连带 = UI 坐标高清化（可单独后做、不绑死同刀）**：dialog-box 现 320 像素布局常量（[dialog-box.ts:20](../../packages/reforge/src/dialog/dialog-box.ts) `POS`）迁到「逻辑坐标 × 倍率」——它是 UI 叠层、不参与世界移动 / 碰撞，故可与世界坐标重构**解耦、单独落地**。先做世界坐标格化，UI 坐标高清化随后（同一机制、不同刀）。
- **菜单及后续所有 UI / 美术 / 编辑器长在此地基上**；菜单（[D17](decisions.md)）暂搁待此落地。
- 实施计划见 [foundation/render-foundation-plan.md](foundation/render-foundation-plan.md)。

## D17 · 菜单系统设计（暂搁，依赖 D16）（2026-06-28）

**决定**：菜单设计定调，但**实现暂搁、待 [D16](decisions.md) 渲染地基落地**（菜单直接长在格坐标 + 高清地基上，不返工）。设计要点：
- **数据 schema（§9 角色实例化首次代码化）**：`WorldState`(L1 世界态) 持 `party: CharacterInstance[]`（单人 = 李逍遥）；`CharacterInstance`（稳定 id）= level / exp / hp / mp / 攻防法速（**绝对值**，非原版 modifier）/ equipment（可扩展槽）/ magic；`CharacterTemplate`(L2) = 名字 TextId + 初始数据（**数值借原版快照**）。**砍** §9 换装外观计算（留装备字段、不算外观）。属性 / 抗性 / 技能用**可扩展集合**、skill 带 `category`、角色留 `tags` —— 为 [phase3 D9 / 议题16](../phase3/future-gameplay-and-mmo-backlog.md) 留**形状**、不填内容。
- **UI**：数据驱动**动态布局**（属性 / 装备 / 技能遍历数据排版，加维度自动适配、不返工）；弹出框走**九宫格可拉伸**，全屏状态面板用固定背景图（原版风）。
- **范围**：主菜单四项框架（状态 / 物品 / 武功 / 系统）+ 仅「队伍状态」能用；物品 / 武功 / 系统占位。**存档**（数据模型未定型）、**走出房间**（需编辑器）、**战斗属性改造**（phase3 D9）均后置。

**理由**：菜单是"落地第二阶段最核心数据地基（角色 / 世界态 schema）"的抓手（roadmap §3.3）；但它依赖 D16（格坐标 + 高清 UI），故**设计先定、实现待地基**。数据驱动动态布局 + schema 留扩展口 = 将来加战斗维度 / 提分辨率都不返工。

**影响**：
- 待 D16 落地后，菜单走 brainstorm → spec → plan → 实现；角色 / 世界态 schema 届时首次代码化（[content-schema §9](foundation/content-schema.md)）。
- 美术资产：状态背景 + 装备格素材（作者已 AI 生图、选原版风），随 D16 素材管线落位。
