# 菜单系统实现计划（menu plan）

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development 或 executing-plans 逐 Task 实现。Steps 用 checkbox（`- [ ]`）跟踪。
>
> 依据 [design.md](design.md)、[D17](../decisions.md)。长在 [D16](../decisions.md) 地基上（格坐标 / 物理 1280 + `ctx.scale(4)` / 数据驱动 / 阶段隔离）。

**Goal:** reforge 跑通菜单系统——Esc 开主菜单（状态 / 物品 / 武功 / 系统），「队伍状态」子菜单数据驱动显示李逍遥属性 + 装备槽；物品 / 武功 / 系统占位。

**Architecture:** 角色数据 schema 落 content（§9 首次代码化）；reforge 加纯状态机 `menu-state.ts` + UI `menu-box.ts`，主循环三态（menu / dialog / explore）；UI 复用 `renderSpans`/`Keyboard`/`ctx.scale(4)`，状态面板数据驱动动态布局 + 九宫格框（原版 UI box）。

**Tech Stack:** TypeScript、Canvas 2D、vitest；content（数据模型）+ reforge（引擎）。

## Global Constraints

- **新引擎零 lint/type**：`noNonNullAssertion` 是 error，不写 `!`，下标访问用 `?? 兜底`；每 Task 末 `pnpm --filter <pkg> run check` + `pnpm exec biome check` 0/0。
- **阶段隔离（[D18](../decisions.md)）**：角色 schema 放 **content**（reforge 经 `@type-pal/content` 引）；菜单状态机 + UI 在 reforge。不碰第一阶段包。
- **数据驱动布局**：属性 / 装备 / 技能**遍历数据**动态画，不写死坐标 —— 将来加维度自动适配。
- **复用不重造**：文字走 `renderSpans`/`measureSpans`，输入走 `Keyboard`，高清走 `ctx.scale(WORLD_SCALE=4)`（同对话框）。
- **范围**：主菜单框架 + 队伍状态（单人）；物品 / 武功 / 系统**占位**（选中显「未实现」）；存档 / 出门 / 战斗属性 / 换装外观**不做**。
- **绝对值属性**：attack/defense/magicAttack/speed 是绝对值（非原版 modifier）；李逍遥初始值用原版 `player-roles.json` roleId 0：level 1 / hp 150 / mp 100 / attack 33 / magicAttack 20 / defense 32 / speed 28。

---

## File Structure

| 文件 | 包 | 责任 |
|---|---|---|
| `src/character.ts` + `.test.ts` | **content** | 角色 schema（`WorldState`/`CharacterInstance`/`CharacterTemplate`）+ 李逍遥模板 + `instantiate` |
| `src/index.ts` | content | 导出 character |
| `src/menu-state.ts` + `.test.ts` | reforge | 纯状态机（开 / 移标 / 确认 / 返回） |
| `src/menu/menu-box.ts` | reforge | UI 渲染（主菜单九宫格 + 状态面板数据驱动 + 背景） |
| `public/ui/` | reforge | 状态背景 + 装备格资产 |
| `src/main.ts` | reforge | tick 三态集成 + Esc 开菜单 + 构造 WorldState |

---

## Task 1: 角色 schema + 李逍遥模板 + instantiate（content）

**Files:** Create `packages/content/src/character.ts`、`packages/content/src/character.test.ts`；Modify `packages/content/src/index.ts`

**Interfaces:**
- Produces: `WorldState`、`CharacterInstance`、`CharacterTemplate` 类型；`LI_XIAOYAO: CharacterTemplate`；`instantiate(t: CharacterTemplate): CharacterInstance`；`initialWorld(): WorldState`。

- [ ] **Step 1: 写失败测试**（`character.test.ts`）

```ts
import { describe, expect, test } from 'vitest'
import { instantiate, LI_XIAOYAO, initialWorld } from './character.js'

describe('角色 schema', () => {
  test('instantiate 模板 → 实例(初始值拷贝)', () => {
    const inst = instantiate(LI_XIAOYAO)
    expect(inst.id).toBe('li-xiaoyao')
    expect(inst.level).toBe(1)
    expect(inst.hp).toBe(150)
    expect(inst.maxHP).toBe(150)
    expect(inst.mp).toBe(100)
    expect(inst.attack).toBe(33)
    expect(inst.defense).toBe(32)
    expect(inst.magicAttack).toBe(20)
    expect(inst.speed).toBe(28)
    expect(inst.exp).toBe(0)
    expect(inst.equipment).toEqual({})
    expect(inst.magic).toEqual([])
    expect(inst.tags).toEqual([])
  })
  test('initialWorld = 单人队伍(李逍遥实例)', () => {
    const w = initialWorld()
    expect(w.party).toHaveLength(1)
    expect(w.party[0]?.id).toBe('li-xiaoyao')
  })
  test('instantiate 每次独立(不共享引用)', () => {
    const a = instantiate(LI_XIAOYAO)
    const b = instantiate(LI_XIAOYAO)
    a.hp = 1
    expect(b.hp).toBe(150) // 不串
  })
})
```

- [ ] **Step 2: 跑失败**

Run: `pnpm --filter @type-pal/content exec vitest run src/character.test.ts`
Expected: FAIL（character.ts 不存在）

- [ ] **Step 3: 实现 `character.ts`**

```ts
import type { TextId } from './index.js'

/** L1 世界态(跟存档走;现 demo 内存构造)。 */
export interface WorldState {
  party: CharacterInstance[]
}

/** 角色实例(稳定 id;运行态)。绝对值属性,非原版 modifier。 */
export interface CharacterInstance {
  id: string
  template: string
  level: number
  exp: number
  hp: number
  maxHP: number
  mp: number
  maxMP: number
  attack: number
  defense: number
  magicAttack: number
  speed: number
  equipment: Record<string, string> // slotId → itemId(可扩展槽)
  magic: string[] // 仙术 id
  tags: string[] // 留口:种族/门派(phase3),现空
}

/** 角色模板(L2 内容层;初始数据)。 */
export interface CharacterTemplate {
  id: string
  name: TextId
  baseStats: {
    level: number
    hp: number
    maxHP: number
    mp: number
    maxMP: number
    attack: number
    defense: number
    magicAttack: number
    speed: number
  }
  initialEquipment: Record<string, string>
  initialMagic: string[]
}

/** 李逍遥(原版 player-roles.json roleId 0 初始值;attack 等用绝对值)。 */
export const LI_XIAOYAO: CharacterTemplate = {
  id: 'li-xiaoyao',
  name: 'name.li-xiaoyao',
  baseStats: {
    level: 1,
    hp: 150,
    maxHP: 150,
    mp: 100,
    maxMP: 100,
    attack: 33,
    defense: 32,
    magicAttack: 20,
    speed: 28,
  },
  initialEquipment: {},
  initialMagic: [],
}

/** 模板 → 实例(深拷贝初始值,exp=0,tags 空)。 */
export function instantiate(t: CharacterTemplate): CharacterInstance {
  return {
    id: t.id,
    template: t.id,
    ...t.baseStats,
    exp: 0,
    equipment: { ...t.initialEquipment },
    magic: [...t.initialMagic],
    tags: [],
  }
}

/** demo 世界态:单人李逍遥。 */
export function initialWorld(): WorldState {
  return { party: [instantiate(LI_XIAOYAO)] }
}
```

- [ ] **Step 4: index.ts 导出 + 测试通过 + check**

`index.ts` 末尾加：`export * from './character.js'`
Run: `pnpm --filter @type-pal/content exec vitest run src/character.test.ts` → PASS
Run: `pnpm --filter @type-pal/content run check` → 绿

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/character.ts packages/content/src/character.test.ts packages/content/src/index.ts
git commit -m "feat(content): 角色 schema §9 首次代码化 — WorldState/CharacterInstance/Template + 李逍遥模板(D17)"
```

---

## Task 2: 菜单纯状态机（reforge）

**Files:** Create `packages/reforge/src/menu-state.ts`、`menu-state.test.ts`

**Interfaces:**
- Produces: `MenuId = 'main' | 'status' | 'item' | 'magic' | 'system'`；`MenuState`；`openMenu()`、`closeMenu()`、`moveCursor(s, delta)`、`confirm(s)`、`back(s)`。纯函数（返回新 state），不碰 DOM。
- `MAIN_ITEMS: { id: MenuId; label: TextId; enabled: boolean }[]`（状态 enabled，其余占位 false）。

- [ ] **Step 1: 写失败测试**（`menu-state.test.ts`）

```ts
import { describe, expect, test } from 'vitest'
import { openMenu, moveCursor, confirm, back, MAIN_ITEMS } from './menu-state.js'

describe('菜单状态机', () => {
  test('开菜单 = main + cursor 0', () => {
    const s = openMenu()
    expect(s.active).toBe(true)
    expect(s.menu).toBe('main')
    expect(s.cursor).toBe(0)
  })
  test('moveCursor 环绕(上下选)', () => {
    let s = openMenu()
    s = moveCursor(s, -1) // 上:0 → 末项(环绕)
    expect(s.cursor).toBe(MAIN_ITEMS.length - 1)
    s = moveCursor(s, 1) // 下:回 0
    expect(s.cursor).toBe(0)
  })
  test('确认「状态」(enabled) → 进 status 子菜单', () => {
    let s = openMenu() // cursor 0 = 状态(MAIN_ITEMS[0])
    s = confirm(s)
    expect(s.menu).toBe('status')
  })
  test('确认占位项(disabled) → 不进、停留 main', () => {
    let s = openMenu()
    const itemIdx = MAIN_ITEMS.findIndex((m) => !m.enabled)
    s = { ...s, cursor: itemIdx }
    s = confirm(s)
    expect(s.menu).toBe('main') // 占位不进
  })
  test('子菜单 back → 回 main;main back → 关菜单', () => {
    let s = confirm(openMenu()) // → status
    s = back(s)
    expect(s.menu).toBe('main')
    s = back(s)
    expect(s.active).toBe(false) // 关
  })
})
```

- [ ] **Step 2: 跑失败**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/menu-state.test.ts` → FAIL

- [ ] **Step 3: 实现 `menu-state.ts`**

```ts
import type { TextId } from '@type-pal/content'

export type MenuId = 'main' | 'status' | 'item' | 'magic' | 'system'

export interface MenuState {
  active: boolean
  menu: MenuId
  cursor: number
}

/** 主菜单四项;仅「状态」enabled,其余占位(D17 范围)。 */
export const MAIN_ITEMS: { id: MenuId; label: TextId; enabled: boolean }[] = [
  { id: 'status', label: 'menu.status', enabled: true },
  { id: 'item', label: 'menu.item', enabled: false },
  { id: 'magic', label: 'menu.magic', enabled: false },
  { id: 'system', label: 'menu.system', enabled: false },
]

export const CLOSED: MenuState = { active: false, menu: 'main', cursor: 0 }

export function openMenu(): MenuState {
  return { active: true, menu: 'main', cursor: 0 }
}
export function closeMenu(): MenuState {
  return CLOSED
}
/** 环绕移动(仅 main 列表;子菜单暂无列表导航)。 */
export function moveCursor(s: MenuState, delta: number): MenuState {
  if (s.menu !== 'main') return s
  const n = MAIN_ITEMS.length
  return { ...s, cursor: (s.cursor + delta + n) % n }
}
/** 确认:main 选 enabled 项进子菜单(占位项不动);子菜单暂无动作。 */
export function confirm(s: MenuState): MenuState {
  if (s.menu !== 'main') return s
  const item = MAIN_ITEMS[s.cursor]
  if (!item || !item.enabled) return s
  return { ...s, menu: item.id, cursor: 0 }
}
/** 返回:子菜单 → main;main → 关。 */
export function back(s: MenuState): MenuState {
  if (s.menu !== 'main') return { ...s, menu: 'main', cursor: 0 }
  return CLOSED
}
```

- [ ] **Step 4: 测试通过 + check**

Run: `pnpm --filter @type-pal/reforge exec vitest run src/menu-state.test.ts` → PASS
Run: `pnpm --filter @type-pal/reforge run check` → 绿

- [ ] **Step 5: Commit**

```bash
git add packages/reforge/src/menu-state.ts packages/reforge/src/menu-state.test.ts
git commit -m "feat(reforge): 菜单纯状态机 — 开/移标/确认/返回 + 主菜单四项(状态 enabled,余占位)(D17)"
```

---

## Task 3: 资产落位（状态背景 + 装备格 + 核对九宫格 box）

**Files:** Create `packages/reforge/public/ui/`（拷资产）

> 无单测；产出 = 资产文件就位 + 人眼/命令确认。

- [ ] **Step 1: 拷状态背景 + 装备格到 reforge public/ui/**

```bash
mkdir -p packages/reforge/public/ui
cp "/Users/zhangxu/Documents/New project/status-bg-pal0-clean-320x200.png" packages/reforge/public/ui/status-bg.png
cp "/Users/zhangxu/Documents/New project/equipment-slot-pal-filled-64x64.png" packages/reforge/public/ui/equip-slot.png
```
Expected: `ls packages/reforge/public/ui/` → `status-bg.png  equip-slot.png`

- [ ] **Step 2: 核对原版 UI box 的 9-frame（九宫格）**

读 `reference/sdlpal/ui.c` 的 `PAL_CreateBoxWithShadow`：`rglpBorderBitmap[i][j] = PAL_SpriteGetFrame(gpSpriteUI, i*3+j + iStyle*9)`（i,j ∈ 0..2 = 3×3）。即 box style 0 = `gpSpriteUI` frame 0–8。对应 `data/extracted/images/ui/frame-00.png … frame-08.png`。
- 用人眼开 `data/extracted/images/ui/frame-00.png`..`frame-08.png` 确认是 box 的角/边/中（若 UI sprite 顺序非此，按 sdlpal `i*3+j` 公式 + 实际图核对正确的 9 个 frame 编号，记进 menu-box.ts 注释）。
- reforge 经 `/extracted/images/ui/frame-0X.png` fetch（已有 symlink，无需拷）。

- [ ] **Step 3: Commit**

```bash
git add packages/reforge/public/ui
git commit -m "chore(reforge): 菜单资产落位 — 状态背景 + 装备格(原版风,作者 AI 出);九宫格用原版 UI box frame(D17)"
```

---

## Task 4: 菜单 UI（menu-box.ts）

**Files:** Create `packages/reforge/src/menu/menu-box.ts`

**Interfaces:**
- Consumes: `MenuState`（Task 2）、`WorldState`（content）、`renderSpans`/`measureSpans`（text-render）、`GlyphTable`。
- Produces: `class MenuBox { render(ctx, state: MenuState, world: WorldState): void }`（在 320 逻辑坐标画，调用方 `ctx.scale(4)` 已设）。

> Canvas 渲染靠浏览器验收（同 ② / palette 务实偏离）。本 Task 给结构 + 关键画法；像素级布局浏览器调。

- [ ] **Step 1: 实现 MenuBox 骨架 + 九宫格框 + 主菜单**

`menu/menu-box.ts`：
- 加载九宫格 9-frame（fetch `/extracted/images/ui/frame-0X.png`，decode；Task 3 核对的编号）+ 状态背景（`/ui/status-bg.png`）+ 装备格（`/ui/equip-slot.png`），用 `createImageBitmap` → canvas（同 dialog-assets loadPortraits）。
- `drawSlicedBox(ctx, img, grid, x, y, w, h)` —— **统一可切片框原语**（九宫格 / 卷轴共用，[design §4](../menu/design.md)）：① 先画**大阴影**（整框 `drawImage` 偏移 +6px + `globalAlpha` 半透明黑，仿原版 `PAL_CreateBoxWithShadow` 的 shadow offset，**阴影代码画、不切素材**）；② 按 `grid`（如 `{cols:3,rows:3}`）切 **source rect**：四角固定、边单轴拉、中心双轴拉（`drawImage` 带 source rect + 目标宽高）= 任意尺寸框。
  - D17 用它画**黄框**：`grid 3×3`，img = 原版 `gpSpriteUI` 黄框 9-frame（Task 3 核对的 frame，可拼成一张或传 9 帧数组）。
  - 卷轴（金钱 `3×1` / 道具 `1×3`）D17 不做，但**同原语、只换 `grid` 参数**（物品 / 系统菜单时零新代码接入）—— 这就是统一原语的价值。
- 主菜单：`drawNineBox` 一个小框 + 遍历 `MAIN_ITEMS` 用 `renderSpans` 画项（enabled 用 default 色、disabled 用暗色）；`state.cursor` 项前画光标（复用对话光标 or ▶ 字符）。
- 320 逻辑坐标（调用方 ctx.scale(4) 放大）。

- [ ] **Step 2: 实现状态子菜单（数据驱动动态布局）**

`state.menu === 'status'` 时：
- 画状态背景 `status-bg.png`（全屏 320×200，`drawImage` 铺满逻辑屏）。
- 取 `world.party[0]`（李逍遥）。**遍历**「属性显示列表」动态画（不写死每行 y）：
  ```ts
  const stats: [TextId, number][] = [
    ['stat.level', c.level], ['stat.hp', c.hp /* /maxHP */], ['stat.mp', c.mp],
    ['stat.attack', c.attack], ['stat.defense', c.defense],
    ['stat.magicAttack', c.magicAttack], ['stat.speed', c.speed],
  ]
  let y = STAT_Y0
  for (const [labelId, val] of stats) {
    renderSpans(ctx, [{ text: `${lookupText(labelId, zhLocale)} ${val}` }], STAT_X, y, { glyphs, shadow: true })
    y += STAT_LINE_H // 加属性 = 列表多一条,自动多一行
  }
  ```
- 装备槽：遍历 `EQUIP_SLOTS`（如 `['weapon','head','body','feet','accessory','amulet']`）逐个画 `equip-slot.png` + 槽内装备名（`c.equipment[slot]` 有则查名、空则空槽）。也是遍历、加槽自动适配。

- [ ] **Step 3: 浏览器验收**

Run: `pnpm --filter @type-pal/reforge run dev`；Esc 开菜单（Task 5 接好后）。
- [ ] 主菜单九宫格框 + 四项（状态亮 / 其余暗）+ 光标
- [ ] 选「状态」→ 状态面板:背景图 + 李逍遥属性(等级1/HP150/MP100/攻33/防32/灵20/速28)+ 装备槽(空)
- [ ] ×4 高清(字 / 框 / 背景锐利)、占位项选中显「未实现」(或灰不可选)

- [ ] **Step 4: Commit**

```bash
git add packages/reforge/src/menu/menu-box.ts packages/reforge/public/ui
git commit -m "feat(reforge): 菜单 UI — 九宫格框 + 主菜单 + 状态面板数据驱动动态布局(D17)"
```

---

## Task 5: main 集成（Esc 开菜单 + 三态 + WorldState）

**Files:** Modify `packages/reforge/src/main.ts`

**Interfaces:**
- Consumes: `openMenu`/`moveCursor`/`confirm`/`back`/`MenuState`/`CLOSED`（Task 2）、`MenuBox`（Task 4）、`initialWorld`（content）。

- [ ] **Step 1: 构造 WorldState + MenuBox + menu state**

main.ts：
- `import { initialWorld } from '@type-pal/content'`；`import { CLOSED, openMenu, moveCursor, confirm, back } from './menu-state.js'`；`import { MenuBox } from './menu/menu-box.js'`。
- `const world = initialWorld()`；`const menuBox = new MenuBox(glyphs)`（构造内 await 加载九宫格/背景/装备格，或 main 预加载传入）；`let menu = CLOSED`。

- [ ] **Step 2: tick 三态集成**

`tick` 顶部输入分发改三态（菜单优先）：
```ts
const pressed = keyboard.consumePressed()
const interact = pressed.has(' ') || pressed.has('Enter')
const esc = pressed.has('Escape')
if (menu.active) {
  if (pressed.has('ArrowUp')) menu = moveCursor(menu, -1)
  if (pressed.has('ArrowDown')) menu = moveCursor(menu, 1)
  if (interact) menu = confirm(menu)
  if (esc) menu = back(menu)
} else if (dialogBox.active) {
  if (interact) dialogBox.advance(t)
} else {
  if (esc) menu = openMenu()        // 探索时 Esc 开菜单
  else if (interact) { /* 既有交互 */ }
  else { /* 既有移动 */ }
}
```
> 注意：菜单 active 时**不跑**移动 / 对话；用 `else if` 保证三态互斥。

- [ ] **Step 3: render 加菜单层（在最上,×4）**

`render()` 末尾（对话框之后）：
```ts
if (menu.active) {
  ctx.save()
  ctx.scale(WORLD_SCALE, WORLD_SCALE) // 同对话框,UI 高清
  menuBox.render(ctx, menu, world)
  ctx.restore()
}
```

- [ ] **Step 4: check + 浏览器全验**

Run: `pnpm --filter @type-pal/reforge run check` → 绿；`pnpm exec biome check packages/reforge/src` → 0/0
Run: dev：
- [ ] 探索按 Esc → 开主菜单；菜单内 ↑↓ 选、空格确认、Esc 逐层退（status→main→关）
- [ ] 「状态」显李逍遥属性 + 装备槽；物品/武功/系统占位
- [ ] 菜单开时玩家**不动**、对话**不触发**（三态互斥）；关菜单后探索正常
- [ ] ×4 高清

- [ ] **Step 5: Commit**

```bash
git add packages/reforge/src/main.ts
git commit -m "feat(reforge): main 集成菜单 — Esc 开/三态互斥(menu/dialog/explore)+ WorldState(D17 菜单落地)"
```

---

## Self-Review（计划作者自查，已过）

1. **覆盖 design**：schema(T1)→ 状态机(T2)→ 资产(T3)→ UI 九宫格+数据驱动(T4)→ 集成 Esc+三态(T5)。范围框架+状态、其余占位（每 Task 体现）。✅
2. **无占位符**：schema/状态机 complete code + 李逍遥实测初始值；UI/集成给结构 + 关键画法 + 浏览器验收点（canvas 务实偏离，同 ②/palette）；九宫格 frame 编号 Task3 核对。✅
3. **类型一致**：`MenuState`/`MenuId`/`MAIN_ITEMS`（T2 定义→T5 用）、`WorldState`/`CharacterInstance`/`instantiate`/`initialWorld`（T1 定义→T4/T5 用）、`MenuBox.render(ctx,state,world)`（T4 定义→T5 用）。链路对齐。✅
4. **阶段隔离**：角色 schema 在 content、菜单在 reforge（D18）；复用 renderSpans/Keyboard/ctx.scale，不重造。✅
5. **数据驱动**：T4 属性/装备遍历列表动态画，加维度不返工。✅
