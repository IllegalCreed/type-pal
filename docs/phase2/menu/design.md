# 菜单系统设计（menu design）

> 状态：设计（2026-06-28）。依据 [D17](../decisions.md)（菜单设计定调）、[D16](../decisions.md)（渲染地基已就位）、[content-schema §9](../foundation/content-schema.md)（角色实例化）。
> 长在 D16 地基上：格坐标 / 物理 1280 + `ctx.scale(4)` / 数据驱动 / 阶段隔离。

## 1. 范围（D17）

- ✅ **做**：主菜单框架（状态 / 物品 / 武功 / 系统四项）+ **队伍状态子菜单**（单人李逍遥）+ **角色 schema**（§9 首次代码化）+ `WorldState` + 资产落位。
- ⏸ **占位**：物品 / 武功 / 系统（选中显「未实现」）。
- ❌ **不做**：存档（数据模型未定型）、走出房间（需编辑器）、战斗属性改造（[phase3 D9](../phase3/future-gameplay-and-mmo-backlog.md)）、换装外观计算。

> 定位（[D12](../decisions.md)）：技术验证——验「角色数据 schema + 菜单状态机 + 数据驱动 UI + 九宫格」跑通即够，不堆完整菜单。

## 2. 数据 schema（§9 角色实例化，**新建于 content**）

content 现在零角色数据，这是 §9 首次代码化。三层态（[§1](../foundation/content-schema.md)）：

```ts
// L1 世界态(跟存档走;现 demo 内存构造)
export interface WorldState {
  party: CharacterInstance[]   // 单人 = [李逍遥]
  // money / worldVars 以后
}

// 角色实例(稳定 id;运行态)
export interface CharacterInstance {
  id: string                   // 稳定实例 id(非下标),如 'li-xiaoyao'
  template: string             // → CharacterTemplate.id
  level: number; exp: number
  hp: number; maxHP: number; mp: number; maxMP: number
  attack: number; defense: number; magicAttack: number; speed: number  // 绝对值(非原版 modifier)
  equipment: Record<string, string>  // slotId → itemId,可扩展槽(装备类型加 = 加 key)
  magic: string[]              // 已学仙术 id("武功"子菜单用)
  tags: string[]               // 留口:种族/门派(phase3 D9/议题16),现空
}

// 角色模板(L2 内容层;初始数据,李逍遥原版初始数值)
export interface CharacterTemplate {
  id: string; name: TextId     // i18n
  baseStats: { level; hp; maxHP; mp; maxMP; attack; defense; magicAttack; speed }
  initialEquipment: Record<string, string>
  initialMagic: string[]
}
```

- **绝对值**，不学原版 signed modifier（clean rewrite，直观）。
- **砍 §9 换装外观计算**：留 `equipment` 字段（装备 id），不实现「装备 → 角色外观」渲染。
- **可扩展口**（[作者洞察](../decisions.md#d17)）：`equipment`/`tags` 是集合、属性核心字段先固定（attack/defense/magicAttack/speed），将来抗性 = 加字段（如 `resistances: Record<string,number>`）；技能 schema 留 `category`（武技/术法/辅助，phase3 议题16）。**形状留扩展、内容不填**。

## 3. 架构（菜单状态机 + 主循环集成）

- **`menu-state.ts`（reforge，纯状态机）**：`MenuState { activeMenu: 'main' | 'status' | null; cursor: number }`，纯函数推进（开 / 选 / 确认 / 返回），不碰 DOM、可单测——同 [`dialogue.ts`](../../../packages/reforge/src/dialogue.ts) 示范、呼应 [议题14](../design-backlog.md) 子系统隔离。
- **主循环集成**（[main.ts](../../../packages/reforge/src/main.ts) tick，三态优先级）：
  ```
  if (menu.active)      { 菜单输入(↑↓选 / 确认 / Esc 返回) }
  else if (dialogBox.active) { 对话翻页 }
  else                  { 探索(走 / 交互);按 Esc 开主菜单 }
  ```
- **数据源**：菜单读 `WorldState.party` 渲染（demo 内存构造一个李逍遥实例 = 模板初始数据）。

## 4. UI（复用 D16 高清 + 数据驱动动态布局）

- **复用**：`renderSpans`/`measureSpans`（字模 / 多色 / 阴影）、`Keyboard`（↑↓ 选 / 确认 / 返回）、`ctx.scale(WORLD_SCALE=4)`（同对话框,UI 物理 1280 高清）。
- **主菜单（弹出小框）**：**九宫格框** + 项列表（状态 / 物品 / 武功 / 系统）+ 光标;物品 / 武功 / 系统选中显「未实现」。
- **状态子菜单（全屏面板）**：固定背景图（`status-bg-pal0`,原版风）+ **数据驱动动态布局**——遍历角色「属性列表 / 装备槽 / 技能」逐项动态画(不写死坐标);装备格用单素材按槽位数重复画。**加属性 / 抗性 / 装备类型 = 数据多一条、UI 自动多一行,不返工**(作者洞察)。
- **框 UI = 统一「可切片框」原语**（作者：新引擎 UI 尺寸可调是可预期需求，**全部要可拉伸**，不写死整图）：
  - **原语 `drawSlicedBox(img, grid, x, y, w, h)`**：按**切片网格**切素材（`drawImage` **source rect，不动素材文件**）—— 四角固定、边单轴拉、中心双轴拉。参数化网格覆盖所有框：
    - **九宫格 3×3** = 黄框（菜单）/ 红框（列表）：原版 `PAL_CreateBox` 的 `gpSpriteUI` 9-frame（`iStyle×9` 切黄/红，本就按行列拉伸）。已提取 `data/extracted/images/ui/`。
    - **横卷轴 3×1** = 金钱（左头 + 中段横拉 + 右头）。
    - **纵卷轴 1×3** = 道具（上头 + 中段纵拉 + 下头）。
    - 原版卷轴是整图 sprite（如 `SPRITENUM_ITEMBOX=70`）**没切** → 用 source rect **代码切**（切片边界 = 卷轴头装饰宽，看图定），不重画素材。
  - **大阴影** = 原版 `PAL_CreateBoxWithShadow` 的 shadow offset（代码画偏移投影，**不在图里**）→ `drawSlicedBox` 内先画偏移 + 半透明黑。
  - 全部走 D16 `ctx.scale(4)` ×4 整数放大，保原版像素观感。**零重画、零 GPT**（GPT 重绘高清属将来全套 AI 美术管线 [D15](../decisions.md)）。
  - **⚠ D17 只实现「黄框 3×3」+ 状态背景**；红框 / 金钱 / 道具卷轴留物品 / 武功 / 系统菜单 —— **用同一 `drawSlicedBox`，只加切片网格参数**（这就是统一原语的价值：新框零新代码）。

## 5. 资产

| 资产 | 来源 | 落位 |
|---|---|---|
| 状态背景 | 作者 AI 生图 `status-bg-pal0-clean-320x200.png`（选原版风） | `packages/reforge/public/ui/` |
| 装备格 | `equipment-slot-pal-filled-64x64.png` | `packages/reforge/public/ui/` |
| 九宫格框 | 原版 UI box 9-frame（`data/extracted/images/ui/`，plan 核对哪 9 个） | reforge fetch（同 extracted），×4 整数放大 |

> 现为 demo 直接放 reforge public（同 portraits 权宜）；将来内容工程化随美术管线归位（[D15](../decisions.md)）。

## 6. 文件落点

| 文件 | 包 | 内容 |
|---|---|---|
| `character.ts` | **content** | `CharacterInstance` / `CharacterTemplate` / `WorldState`（§9 schema，新建） |
| `menu-state.ts` + test | reforge | 纯状态机 |
| `menu/menu-box.ts` | reforge | UI 渲染（九宫格 + 数据驱动 + 状态背景） |
| `main.ts` | reforge | tick 三态集成 + 开菜单键 |

## 7. Self-Review

1. **覆盖**：schema(§2)→ 状态机(§3)→ UI(§4)→ 资产(§5)→ 落点(§6)。范围框架+状态、其余占位（§1）。✅
2. **依赖方向**：角色 schema 在 content（reforge import），同 GridPos；菜单状态机 + UI 在 reforge。阶段隔离不违（[D18](../decisions.md)）。✅
3. **可扩展不返工**：数据驱动布局 + schema 留扩展口（equipment/tags/属性字段/skill category）—— 将来加战斗维度 / 提分辨率都不返工（D16 高清已在，分辨率也不返工）。✅
4. **范围不蔓延**：存档 / 出门 / 战斗属性 / 换装明确划出（§1）；占位项不实现逻辑。✅
5. **务实偏离**：canvas 渲染靠浏览器验收（同对话 / palette）；九宫格素材 plan 定（可代码画占位）；数值借原版快照（非自创平衡）。✅
