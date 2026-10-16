# 菜单系统设计（menu design）

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: design-spec-v1 / 1.0.0

本页把历史设计正文接入 `design-spec-v1`，并保留 archive overlay。原始日期、方案语义、版本数字、冲突、未知项和链接均通过下方逐行引用保全；本页不授予当前产品、runtime、E2E、视觉或 coverage 信用。

## 问题与目标

- 历史设计问题/目标：数据驱动菜单状态机；角色/装备/技能/物品分页与动态布局，复用 D16 高清资产；主循环接线、文件落点和可扩展 tags/category；明确存档/地图/战斗等不做。
- 文档身份：phase2 / archive；原始状态为 `archived`，当前有效性固定为 `historical`。
- 本次目标：让历史设计具备可检索的设计章节和历史边界，不把当时方案改写成当前合同。

## 真值与约束

- 固定源 revision：`45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA：`3737284005b5d570b901210bfd778510504d8d90d510737461ced50d399be69a`；原文 104 行、8488 bytes。
- 一手来源/正文锚点：packages/reforge/src/dialogue.ts:1-1; packages/reforge/src/main.ts:1-1；标题锚点：1:菜单系统设计（menu design）, 9:1. 范围（D17）, 17:2. 数据 schema（§9 角色实例化，**新建于 content**）, 53:3. 架构（菜单状态机 + 主循环集成）, 64:4. UI（复用 D16 高清 + 数据驱动动态布局）, 79:5. 资产, 89:6. 文件落点, 98:7. Self-Review。
- 当前阶段证据：本批只做文档全文读取、语义分层和字节保全；current contract 必须回读继任规范、当前代码和真实调用域。
- 不可违反的约束：历史状态词只描述原文时点；旧 schema、迁移计划、done/待审标签和演出设想不得单独证明今天的实现。
- 未知与冲突：
- 范围和 schema 是 2026-06 历史 demo 设计；不做项与实现步骤不能覆盖后来 menu/editor architecture。
- 文档没有当前浏览器/交互证据，无法证明视觉、可达性或保存行为。

## 方案

- 原始方案语义：数据驱动菜单状态机；角色/装备/技能/物品分页与动态布局，复用 D16 高清资产；主循环接线、文件落点和可扩展 tags/category；明确存档/地图/战斗等不做。
- 本次治理方案：将上述语义拆入问题、真值、方案、边界、验收五个可定位章节；原文不删节，以 quote 作为唯一完整正文保全层。
- 继任关系：
- docs/phase2/specs/editor-design-system.md
- 当前 reforge menu code
- 当前 editor/menu task records
- 明确不做：不执行原文迁移/实现步骤，不恢复 legacy fallback，不把历史计划、Self-Review 或静态审计当作 runtime/E2E/视觉/coverage 结果。

## 边界与风险

- 历史边界：本文可以说明当时为什么设计、如何计划和哪些问题已被识别，不能替代当前 canonical 文档、源码、测试或用户裁决。
- 主要冲突/风险：
- 范围和 schema 是 2026-06 历史 demo 设计；不做项与实现步骤不能覆盖后来 menu/editor architecture。
- 文档没有当前浏览器/交互证据，无法证明视觉、可达性或保存行为。
- 停止线：不得用菜单 archive 作为当前 UI contract 或视觉验收；后继必须读取 current editor design-system/runtime menu code。
- 若重新启用：必须以当前一手来源重新核对 schema、版本、调用方、合法输入和业务 oracle，并建立新的 review record；不得沿用本页日期作准入。

## 验收

- 可执行验证：模板章节完整；原文 quote 去除 `> ` 前缀后与 source UTF-8 字节逐字节相等；source/after SHA 写入 central review、registry、catalog 和 evidence receipt。
- 业务 oracle：历史结论、日期、状态、数字、链接、未知和冲突可定位；任何当前性主张都有继任入口或明确停止线。
- 本次执行范围：只读源、模板迁移、账本同步和静态治理门；runtime、E2E、视觉、coverage 均未运行。
- 复核 Owner 与截止条件：Codex 独立复核本页及三账本；非作者候选验收通过前保持 build/review，不标全量完成。

## 历史范围

- 原始范围：phase2 archive design；固定来源 `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，原始正文 SHA `3737284005b5d570b901210bfd778510504d8d90d510737461ced50d399be69a`，原文日期和版本轴以 quote 为准。
- 归档原因：正文混合历史设计、阶段计划和后来附录；继任规范/代码已经承担当前合同，故本页只保留历史证据。

## 原始结论

- 菜单系统设计（menu design）：这是 design-spec，当前文档状态为 historical。全文 105 行、8 个标题；摘要/首段为「> **历史设计/计划**：本页保存当时的接口、分工和实施步骤，不作为今天的待办或准入。」。属于历史/归档材料，不能单独证明当前实现。
- 上述结论只属于其原始日期和适用范围；本页新增的结构化表述不改变原始结论。

## 当时证据

- source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `3737284005b5d570b901210bfd778510504d8d90d510737461ced50d399be69a`；全文 104 行 / 8488 bytes。
- 原文标题/章节锚点：1:菜单系统设计（menu design）, 9:1. 范围（D17）, 17:2. 数据 schema（§9 角色实例化，**新建于 content**）, 53:3. 架构（菜单状态机 + 主循环集成）, 64:4. UI（复用 D16 高清 + 数据驱动动态布局）, 79:5. 资产, 89:6. 文件落点, 98:7. Self-Review。完整正文与链接、表格、代码、历史状态词在下方 quote 保留。

## 当前有效性

historical。不得将历史设计字段、迁移步骤、旧版本号、done/待审标签或静态审计结果外推为当前事实。
- 当前不得外推的部分：不得用菜单 archive 作为当前 UI contract 或视觉验收；后继必须读取 current editor design-system/runtime menu code。

## 继任文档

- 当前 canonical / 复核入口：docs/phase2/specs/editor-design-system.md, 当前 reforge menu code, 当前 editor/menu task records。
- supersedes / superseded-by：本页保留旧结构化记录作为历史；当前合同由继任规范、代码和新的独立审查记录决定。
- 重新启用条件：新的 primary source、版本/适用范围、合法输入、business oracle、可证伪观察和独立验收齐备。

## 原文保全

固定源 SHA `3737284005b5d570b901210bfd778510504d8d90d510737461ced50d399be69a`；以下 quote 只增加 Markdown blockquote 前缀，逆回读必须得到相同 UTF-8 字节。
<!-- original-source-quote:start -->
> # 菜单系统设计（menu design）
>
> > **历史设计/计划**：本页保存当时的接口、分工和实施步骤，不作为今天的待办或准入。
> > 当前能力见 [能力地图](../../capability-map.md)，实际工作从 [看板](../../../ops/archive/board-history/board-20261004.md) 进入。
>
> > 状态：设计（2026-06-28）。依据 [D17](../../decisions.md)（菜单设计定调）、[D16](../../decisions.md)（渲染地基已就位）、[content-schema §9](content-schema.md)（角色实例化）。
> > 长在 D16 地基上：格坐标 / 物理 1280 + `ctx.scale(4)` / 数据驱动 / 阶段隔离。
>
> ## 1. 范围（D17）
>
> - ✅ **做**：主菜单框架（状态 / 物品 / 武功 / 系统四项）+ **队伍状态子菜单**（单人李逍遥）+ **角色 schema**（§9 首次代码化）+ `WorldState` + 资产落位。
> - ⏸ **占位**：物品 / 武功 / 系统（选中显「未实现」）。
> - ❌ **不做**：存档（数据模型未定型）、走出房间（需编辑器）、战斗属性改造（[phase3 D9](../../../phase3/backlog.md)）、换装外观计算。
>
> > 定位（[D12](../../decisions.md)）：技术验证——验「角色数据 schema + 菜单状态机 + 数据驱动 UI + 九宫格」跑通即够，不堆完整菜单。
>
> ## 2. 数据 schema（§9 角色实例化，**新建于 content**）
>
> content 现在零角色数据，这是 §9 首次代码化。三层态（[§1](content-schema.md)）：
>
> ```ts
> // L1 世界态(跟存档走;现 demo 内存构造)
> export interface WorldState {
>   party: CharacterInstance[]   // 单人 = [李逍遥]
>   // money / worldVars 以后
> }
>
> // 角色实例(稳定 id;运行态)
> export interface CharacterInstance {
>   id: string                   // 稳定实例 id(非下标),如 'li-xiaoyao'
>   template: string             // → CharacterTemplate.id
>   level: number; exp: number
>   hp: number; maxHP: number; mp: number; maxMP: number
>   attack: number; defense: number; magicAttack: number; speed: number  // 绝对值(非原版 modifier)
>   equipment: Record<string, string>  // slotId → itemId,可扩展槽(装备类型加 = 加 key)
>   magic: string[]              // 已学仙术 id("武功"子菜单用)
>   tags: string[]               // 留口:种族/门派(phase3 D9/议题16),现空
> }
>
> // 角色模板(L2 内容层;初始数据,李逍遥原版初始数值)
> export interface CharacterTemplate {
>   id: string; name: TextId     // i18n
>   baseStats: { level; hp; maxHP; mp; maxMP; attack; defense; magicAttack; speed }
>   initialEquipment: Record<string, string>
>   initialMagic: string[]
> }
> ```
>
> - **绝对值**，不学原版 signed modifier（clean rewrite，直观）。
> - **砍 §9 换装外观计算**：留 `equipment` 字段（装备 id），不实现「装备 → 角色外观」渲染。
> - **可扩展口**（[作者洞察](../../decisions.md#d17--菜单系统设计暂搁依赖-d162026-06-28)）：`equipment`/`tags` 是集合、属性核心字段先固定（attack/defense/magicAttack/speed），将来抗性 = 加字段（如 `resistances: Record<string,number>`）；技能 schema 留 `category`（武技/术法/辅助，phase3 议题16）。**形状留扩展、内容不填**。
>
> ## 3. 架构（菜单状态机 + 主循环集成）
>
> - **`menu-state.ts`（reforge，纯状态机）**：`MenuState { activeMenu: 'main' | 'status' | null; cursor: number }`，纯函数推进（开 / 选 / 确认 / 返回），不碰 DOM、可单测——同 [`dialogue.ts`](../../../../packages/reforge/src/dialogue.ts) 示范、呼应 [议题14](../../design-backlog.md) 子系统隔离。
> - **主循环集成**（[main.ts](../../../../packages/reforge/src/main.ts) tick，三态优先级）：
>   ```
>   if (menu.active)      { 菜单输入(↑↓选 / 确认 / Esc 返回) }
>   else if (dialogBox.active) { 对话翻页 }
>   else                  { 探索(走 / 交互);按 Esc 开主菜单 }
>   ```
> - **数据源**：菜单读 `WorldState.party` 渲染（demo 内存构造一个李逍遥实例 = 模板初始数据）。
>
> ## 4. UI（复用 D16 高清 + 数据驱动动态布局）
>
> - **复用**：`renderSpans`/`measureSpans`（字模 / 多色 / 阴影）、`Keyboard`（↑↓ 选 / 确认 / 返回）、`ctx.scale(WORLD_SCALE=4)`（同对话框,UI 物理 1280 高清）。
> - **主菜单（弹出小框）**：**九宫格框** + 项列表（状态 / 物品 / 武功 / 系统）+ 光标;物品 / 武功 / 系统选中显「未实现」。
> - **状态子菜单（全屏面板）**：固定背景图（`status-bg-pal0`,原版风）+ **数据驱动动态布局**——遍历角色「属性列表 / 装备槽 / 技能」逐项动态画(不写死坐标);装备格用单素材按槽位数重复画。**加属性 / 抗性 / 装备类型 = 数据多一条、UI 自动多一行,不返工**(作者洞察)。
> - **框 UI = 统一「可切片框」原语**（作者：新引擎 UI 尺寸可调是可预期需求，**全部要可拉伸**，不写死整图）：
>   - **原语 `drawSlicedBox(img, edges, x, y, w, h)`**，`edges = {left, right, top, bottom}` = **四边固定厚度**（切割线距各边的像素）：四角按厚度固定、四边各拉一向、中心双向拉（`drawImage` **source rect，不动素材文件**）。比「切几行几列」更本质 —— **某边厚度 = 0 就自动退化**，一个原语覆盖所有框：
>     - **黄框 / 红框** = 四边都有厚度（九宫格）：原版 `gpSpriteUI` 本就是 **9 个独立 frame**（`i*3+j+iStyle*9`，黄框 frame 0–8 / 红框 9–17，sdlpal `ui.c:175`），直接喂 9 帧按 `edges` 拼 + 拉。
>     - **纵卷轴（道具，宽高都可变）** = 四边都有厚度 = 也走九宫格（上下 = 轴头高、左右 = 侧边宽）。⚠ 改自原 1×3：作者指出道具面板宽度也可能变（多列图标），只纵拉不够。
>     - **横卷轴（金钱，只宽变、高不变）** = 上下厚度 `0` → 只横拉（左头 + 中段横拉 + 右头）。
>     - 卷轴原版是整图 sprite（如 `SPRITENUM_ITEMBOX=70`）**没切** → `edges` 厚度（轴头宽 / 高）拿实际图量，source rect 代码切、不重画素材。
>   - **大阴影** = 原版 `PAL_CreateBoxWithShadow` 的 shadow offset（代码画偏移投影，**不在图里**）→ `drawSlicedBox` 内先画偏移 + 半透明黑。
>   - 全部走 D16 `ctx.scale(4)` ×4 整数放大，保原版像素观感。**零重画、零 GPT**（GPT 重绘高清属将来全套 AI 美术管线 [D15](../../decisions.md)）。
>   - **⚠ D17 只实现「黄框 3×3」+ 状态背景**；红框 / 金钱 / 道具卷轴留物品 / 武功 / 系统菜单 —— **用同一 `drawSlicedBox`，只加切片网格参数**（这就是统一原语的价值：新框零新代码）。
>
> ## 5. 资产
>
> | 资产 | 来源 | 落位 |
> |---|---|---|
> | 状态背景 | 作者 AI 生图 `status-bg-pal0-clean-320x200.png`（选原版风） | `packages/reforge/public/ui/` |
> | 装备格 | `equipment-slot-pal-filled-64x64.png` | `packages/reforge/public/ui/` |
> | 九宫格框 | 原版 UI box 9-frame（`data/extracted/images/ui/`，plan 核对哪 9 个） | reforge fetch（同 extracted），×4 整数放大 |
>
> > 现为 demo 直接放 reforge public（同 portraits 权宜）；将来内容工程化随美术管线归位（[D15](../../decisions.md)）。
>
> ## 6. 文件落点
>
> | 文件 | 包 | 内容 |
> |---|---|---|
> | `character.ts` | **content** | `CharacterInstance` / `CharacterTemplate` / `WorldState`（§9 schema，新建） |
> | `menu-state.ts` + test | reforge | 纯状态机 |
> | `menu/menu-box.ts` | reforge | UI 渲染（九宫格 + 数据驱动 + 状态背景） |
> | `main.ts` | reforge | tick 三态集成 + 开菜单键 |
>
> ## 7. Self-Review
>
> 1. **覆盖**：schema(§2)→ 状态机(§3)→ UI(§4)→ 资产(§5)→ 落点(§6)。范围框架+状态、其余占位（§1）。✅
> 2. **依赖方向**：角色 schema 在 content（reforge import），同 GridPos；菜单状态机 + UI 在 reforge。阶段隔离不违（[D18](../../decisions.md)）。✅
> 3. **可扩展不返工**：数据驱动布局 + schema 留扩展口（equipment/tags/属性字段/skill category）—— 将来加战斗维度 / 提分辨率都不返工（D16 高清已在，分辨率也不返工）。✅
> 4. **范围不蔓延**：存档 / 出门 / 战斗属性 / 换装明确划出（§1）；占位项不实现逻辑。✅
> 5. **务实偏离**：canvas 渲染靠浏览器验收（同对话 / palette）；九宫格素材 plan 定（可代码画占位）；数值借原版快照（非自创平衡）。✅
<!-- original-source-quote:end -->
