# 系统菜单面板 实现计划(替"系统·开发中"占位)

> **状态**:GLM 初版 → Claude 审核 + 改(2026-06-30)。本文件是**审核修正后的执行版**。
> **分工**:Task A–C(状态机 / UI / 集成)= **GLM**;Task D(浏览器对齐)= **Claude**。
> **依赖**:多级菜单已就位(`menu-state.ts` 主菜单树,`system` 项现 `enabled:false` 占位)。第二阶段 Reforge,先读 [READ-FIRST](../READ-FIRST.md)。

## 审核结论(Claude,已并入正文)

1. **真值核对**:GLM 标的坐标/色值/顺序/流程/原语签名逐条对过一阶段源码,**绝大多数准确**(见「真值锚」)。
2. **1 个真·行为 bug(已改)**:`systemMoveCursor` 原写**钳制**(吸附首/尾),错。系统菜单是 `SelectionMenu`(PAL_ReadMenu 竖列),[`moveSelectionUp/Down` 是**环绕** `(cursor±1+n)%n`](../../../packages/game/src/core/menu/primitives.ts)(primitives.ts:89-99),reforge 主菜单 `moveCursor` 也环绕。GLM 误引了 inventory 多列网格的 `setCursorClamp`(单列竖列不适用)。→ **改环绕**,测试断言跟着改(见 Task A)。
3. **决策 A(否/Esc 去哪)**:**回主菜单 hub**(`menu = back(menu)`),与 status/magic/equip/use 所有面板 Esc 一致;**不**复刻原版「按否反弹回大世界」的 wart(in-game-menu.ts:119-120)。
4. **决策 B(范围)—— save/load 也占位,不本期做实**:能 `JSON.stringify(WorldState)` ≠ 存档系统设计好了。存档已单独出设计 [save-system-design.md](../foundation/save-system-design.md)(30 槽 / 三块分离存储 / IndexedDB / 自动存档=编辑器触发器),**本期 5 项仍全占位**,只落地框架 + 确认框原语;待该设计「现在能做」阶段实现后,save/load 接入替占位。
5. **小修(已并入)**:`systemConfirm` 用 `sel.id` 显式分流(quit→confirm,余 disabled→placeholder);色常量从 menu-box.ts `export` 出来给 system-box import(不再本地第三次重声明);占位提示「下次按键清」(无计时器,确定性);menu-box.ts `renderPanelPlaceholder` 启用后变死码,Task C 注明。

**Goal:** 大世界系统菜单框架:5 项列表(存档/读档/音乐/音效/退出)全占位灰显,退出二次确认(「是」也占位),选占位项弹「未实现」。落地可复用的**确认框原语**,替掉主菜单「系统·开发中」。

**范围(本期 —— 明确的小切片):**
- ✅ 系统菜单框架(5 项)+ 通用确认框 UI 原语 + 退出二次确认流程(走通)+ main.ts 集成。
- ⏸ **5 项全占位**(disabled 灰显,选了弹「未实现」):save/load(存档已设计 [save-system-design](../foundation/save-system-design.md),待实现接入)、music/sound(音频系统未建)。
- ⏸ **退出「是」= 占位**(reforge 无标题屏 → 只提示「未实现」、回 menu 阶段);**否/Esc → 回主菜单 hub**。

> **为什么全占位**:save/load 依赖未**设计**的存档系统(存什么/槽位/版本/剧情进度捕获),music/sound 依赖未建的音频系统,quit 依赖未建的标题屏。本期先把**菜单框架 + 通用确认框组件 + 退出交互**落地,这三块子系统(及存档设计)成熟后回头接真功能(状态机已留 `disabled`/action 接口)。

## 真值锚(一阶段 game 包,sdlpal 1:1 port;均已核实 ✅)

- **5 项顺序/WORD id**:[in-game-menu.ts:42-46](../../../packages/game/src/core/menu/in-game-menu.ts) `SYSTEM_LABELS`:11 储存进度 / 12 读取进度 / 13 音乐 / 14 音效 / 15 结束游戏。sdlpal `ui.h:66-70`。✅
- **系统 menu box@(40,60)**,项起 **(53,72)**,行距 **18**:[draw-menu.ts](../../../packages/game/src/present/menu/draw-menu.ts) `SYSTEM_MENU_BOX/ITEM_START/LINE_HEIGHT`。box `rows=nItems-1=4`,`cols=menuTextMaxCols`,**style 0**。✅
- **三阶段 phase** `menu|confirm|switch`:in-game-menu.ts:80(switch=音乐/音效开关,本期占位故不进,类型留)。✅
- **确认框**:[draw-confirm.ts:38-46](../../../packages/game/src/present/menu/draw-confirm.ts) —— 左框 **(130,100) len2**=否、右框 **(205,100) len2**=是;左文 **(145,110)** 右文 **(220,110)**;默认左(否)高亮(`nDefault=0`)。✅
- **光标移动**:**环绕**(非钳制)。系统菜单 `SelectionMenu`,[primitives.ts:89-99](../../../packages/game/src/core/menu/primitives.ts) `moveSelectionUp/Down` = `(cursor±1+n)%n`;reforge 主菜单 `moveCursor` 同。✅(⚠ GLM 初版引错锚,已改)
- **回退路径(决策 A)**:quit→否/Esc → **回主菜单 hub**(`menu = back(menu)`)。(原版无论是/否都关整个菜单回大世界,reforge 在平级 panel 模型下不复刻此 wart。)
- **色**:普通 `0x4F`=[199,186,174] / 选中 `0xF9..0xFE`(6 帧闪)/ 占位灰 `0x18`=[166,40,32](选中 `0x1C`=[215,109,93])。reforge 已有([menu-box.ts:150-153](../../../packages/reforge/src/menu/menu-box.ts),本期 export)。✅
- **按键**:DL21 —— `Up|Left`=上一、`Down|Right`=下一;confirm 阶段四方向皆 toggle。✅

## 数据来源(地基/已有,勿再造)

- 菜单树:`menu-state.ts` 的 `MAIN_MENU`,`system` 项现 `enabled:false`(Task C 开)。
- 框/数字原语:[menu-box.ts](../../../packages/reforge/src/menu/menu-box.ts) 已有 `drawSlicedBox`(像素 w/h)/`drawCashBox`(`nLen`)/`drawNumber`/色常量/`renderSpans`。确认框 = 2 个 `drawCashBox` 拼。
- 文案:locale 现只有 `menu.system='系统'`;子项 Task B 加。
- **不引入**存档系统 / 音频系统 / 标题屏(范围外)。`TextId = string`,加 locale 键无需维护联合类型。

## Global Constraints

- **阶段隔离(D18)**:状态机/渲染在 reforge;文案在 content locale。
- **不可变**:状态机纯函数返回新 state(对齐 magic/equip/use-menu-state)。
- **占位明确**:5 项标 `disabled` 灰显,确认弹「未实现」——别让用户以为能用。
- **每 Task**:`pnpm --filter @type-pal/reforge run check` 绿 + `biome check` 0/0(Task B 改 locale 还需 `pnpm --filter @type-pal/content run check`)。
- **范围克制**:不做存档槽菜单、不做开关框真切换(switch 阶段类型留但不进)。

---

## Task A 〔GLM·reforge〕: 系统菜单状态机(纯逻辑,三阶段)

**Files:** Create `packages/reforge/src/system-menu-state.ts` + `system-menu-state.test.ts`。镜像 `use-menu-state.ts` 纯函数范式。

**Produces:** `SystemItemKind`, `SystemMenuItem`, `SystemMenuState`, `SystemAction`, `SYSTEM_ITEMS`, `openSystemMenu`, `closeSystemMenu`, `systemMoveCursor`, `systemConfirm`, `systemToggleConfirm`, `systemConfirmYes`。

- [ ] **Step 1: 写失败测试** —— `system-menu-state.test.ts`

```ts
import { describe, expect, test } from 'vitest'
import {
  closeSystemMenu,
  openSystemMenu,
  systemConfirm,
  systemConfirmYes,
  systemMoveCursor,
  systemToggleConfirm,
} from './system-menu-state.js'

describe('系统菜单状态机', () => {
  test('openSystemMenu:5 项全占位 disabled;cursor 0', () => {
    const s = openSystemMenu()
    expect(s.active).toBe(true)
    expect(s.phase).toBe('menu')
    expect(s.items.map((i) => i.id)).toEqual(['save', 'load', 'music', 'sound', 'quit'])
    expect(s.items.every((i) => i.disabled)).toBe(true) // 本期 5 项全占位
    expect(s.cursor).toBe(0)
  })
  test('systemMoveCursor:menu 阶段环绕(非钳制;对齐 primitives.moveSelection)', () => {
    const s = openSystemMenu()
    expect(systemMoveCursor(s, 'down').cursor).toBe(1)
    expect(systemMoveCursor(s, 'right').cursor).toBe(1) // Right=Down
    expect(systemMoveCursor({ ...s, cursor: 4 }, 'down').cursor).toBe(0) // 末项下 → 绕回首
    expect(systemMoveCursor(s, 'up').cursor).toBe(4) // 首项上 → 绕到末
    expect(systemMoveCursor(s, 'left').cursor).toBe(4) // Left=Up
  })
  test('systemConfirm:占位项 → placeholder(留 menu);quit → 进 confirm', () => {
    const s = openSystemMenu()
    const ph = systemConfirm(s) // cursor0=save(占位)
    expect(ph.action).toEqual({ kind: 'placeholder', id: 'save' })
    expect(ph.state.phase).toBe('menu')
    const q = systemConfirm({ ...s, cursor: 4 }) // quit
    expect(q.state.phase).toBe('confirm')
    expect(q.state.confirmYes).toBe(false) // 默认否
    expect(q.action).toBeUndefined()
  })
  test('confirm 阶段:四方向 toggle;是→quit action(回 menu);否→关(active false)', () => {
    const s = systemConfirm({ ...openSystemMenu(), cursor: 4 }).state // 进 confirm
    expect(systemToggleConfirm(s).confirmYes).toBe(true) // 否→是
    const yes = systemConfirmYes({ ...s, confirmYes: true })
    expect(yes.action).toEqual({ kind: 'quit' })
    expect(yes.state.phase).toBe('menu') // 是(占位)→ 回 menu
    const no = systemConfirmYes({ ...s, confirmYes: false })
    expect(no.state.active).toBe(false) // 否 → 关(main.ts back 回 hub)
  })
  test('cursor 跨调用记忆(原版 iCurSystemMenuItem);越界 clamp', () => {
    expect(openSystemMenu(3).cursor).toBe(3)
    expect(openSystemMenu(99).cursor).toBe(4)
  })
  test('closeSystemMenu:active false', () => {
    expect(closeSystemMenu().active).toBe(false)
  })
})
```

- [ ] **Step 2: 跑确认失败** — `pnpm --filter @type-pal/reforge exec vitest run src/system-menu-state.test.ts` → FAIL(模块不存在)

- [ ] **Step 3: 写 `system-menu-state.ts`**

```ts
// 系统菜单状态机(纯逻辑;非视觉)。三阶段 menu/confirm(switch 留接口本期不进)。
// 交互对齐一阶段 game in-game-menu.ts(PAL_SystemMenu)。
// 范围:5 项框架 + 退出确认;save/load/music/sound 占位(disabled,确认弹 placeholder);quit「是」占位。
import type { TextId } from '@type-pal/content'

export type SystemItemKind = 'save' | 'load' | 'music' | 'sound' | 'quit'

export interface SystemMenuItem {
  id: SystemItemKind
  label: TextId
  disabled?: boolean // 本期 5 项皆占位 → true(子系统/存档设计就位后逐项开)
}

/** 5 项(对齐 sdlpal ui.h SYSMENU_LABEL_* 顺序);本期全占位。 */
export const SYSTEM_ITEMS: SystemMenuItem[] = [
  { id: 'save', label: 'menu.system.save', disabled: true }, // 占位:存档系统未设计
  { id: 'load', label: 'menu.system.load', disabled: true }, // 占位:存档系统未设计
  { id: 'music', label: 'menu.system.music', disabled: true }, // 占位:音频系统未建
  { id: 'sound', label: 'menu.system.sound', disabled: true }, // 占位:音频系统未建
  { id: 'quit', label: 'menu.system.quit', disabled: true }, // 占位:无标题屏(确认流程走通,「是」弹未实现)
]

export interface SystemMenuState {
  active: boolean
  phase: 'menu' | 'confirm' // 'switch' 留口,本期不进(music/sound 占位)
  items: SystemMenuItem[]
  cursor: number
  confirmYes: boolean // confirm 阶段:是(true)/否(false),默认否(原版 nDefault=0)
}

export type SystemAction = { kind: 'quit' } | { kind: 'placeholder'; id: SystemItemKind }

/** openSystemMenu:initialCursor 恢复上次光标(原版 iCurSystemMenuItem);越界 clamp。 */
export function openSystemMenu(initialCursor = 0): SystemMenuState {
  const n = SYSTEM_ITEMS.length
  const cursor = n === 0 ? 0 : Math.min(Math.max(0, initialCursor), n - 1)
  return { active: true, phase: 'menu', items: SYSTEM_ITEMS, cursor, confirmYes: false }
}

export function closeSystemMenu(): SystemMenuState {
  return { active: false, phase: 'menu', items: [], cursor: 0, confirmYes: false }
}

/** menu 阶段导航:↑↓=±1(Left=Up/Right=Down,DL21);**环绕**(对齐一阶段 primitives.moveSelection `%n`,非钳制)。
 *  占位项可停(原版 PAL_ReadMenu 光标可停 disabled,0x1C 色),确认时返 placeholder。 */
export function systemMoveCursor(
  s: SystemMenuState,
  dir: 'up' | 'down' | 'left' | 'right',
): SystemMenuState {
  if (s.phase !== 'menu') return s
  const n = s.items.length
  if (n === 0) return s
  const delta = dir === 'up' || dir === 'left' ? -1 : 1
  return { ...s, cursor: (s.cursor + delta + n) % n } // 环绕
}

/** menu 阶段确认:用 id 显式分流。quit → 进 confirm;其余(本期全 disabled)→ placeholder。 */
export function systemConfirm(s: SystemMenuState): { state: SystemMenuState; action?: SystemAction } {
  if (s.phase !== 'menu') return { state: s }
  const sel = s.items[s.cursor]
  if (!sel) return { state: s }
  if (sel.id === 'quit') return { state: { ...s, phase: 'confirm', confirmYes: false } } // → confirm
  return { state: s, action: { kind: 'placeholder', id: sel.id } } // 占位 → 留 menu + 弹提示
}

/** confirm 阶段四方向 toggle 是/否(原版 PAL_SelectionMenu 两框)。 */
export function systemToggleConfirm(s: SystemMenuState): SystemMenuState {
  if (s.phase !== 'confirm') return s
  return { ...s, confirmYes: !s.confirmYes }
}

/** confirm 确认:是 → quit action(本期占位,回 menu 阶段);否 → 关(main.ts back 回 hub,决策 A)。 */
export function systemConfirmYes(s: SystemMenuState): { state: SystemMenuState; action?: SystemAction } {
  if (s.phase !== 'confirm') return { state: s }
  if (s.confirmYes) return { state: { ...s, phase: 'menu', confirmYes: false }, action: { kind: 'quit' } }
  return { state: closeSystemMenu() } // 否 → 关菜单信号
}
```

- [ ] **Step 4: 测试 + check + biome** 绿/0
- [ ] **Step 5: commit** — `feat(reforge): 系统菜单状态机(三阶段 menu/confirm + 退出确认,光标环绕)`

---

## Task B 〔GLM·reforge+content〕: 确认框原语 + 系统菜单渲染 + locale 文案

**Files:** Modify `packages/reforge/src/menu/menu-box.ts`(`export` 色常量 + 加 `drawConfirmBox`);Create `packages/reforge/src/menu/system-box.ts`;Modify `packages/content/src/locale.ts`。

- [ ] **Step 1: locale 加文案** —— `packages/content/src/locale.ts`(在 `menu.system='系统'` 后):

```ts
  'menu.system.save': '储存进度',
  'menu.system.load': '读取进度',
  'menu.system.music': '音乐',
  'menu.system.sound': '音效',
  'menu.system.quit': '结束游戏',
  'menu.system.yes': '是',
  'menu.system.no': '否',
  'menu.system.not-implemented': '未实现',
```

- [ ] **Step 2: menu-box.ts —— `export` 色常量 + 加 `drawConfirmBox`**

先把现有色常量 `export`(system-box 直接 import,别再本地抄;magic-box.ts 暂保留本地副本,后续可一并 import):

```ts
// menu-box.ts:150-153 改为 export
export const COLOR_NORMAL = [199, 186, 174] as const
export const COLOR_DISABLED = [166, 40, 32] as const
export const COLOR_DISABLED_SEL = [215, 109, 93] as const
export const SELECTED_COLORS = [ /* …现有 6 帧值不变… */ ] as const
```

再加通用确认框原语(照 [draw-confirm.ts:38-46](../../../packages/game/src/present/menu/draw-confirm.ts);`drawCashBox`/`renderSpans`/`GlyphTable`/色常量均 menu-box 内已有):

```ts
/** 确认框:左框(130,100)len2 + 右框(205,100)len2 + 文字(145/220,110)。rightSelected=右项高亮。
 *  对齐一阶段 draw-confirm.ts(PAL_SelectionMenu 两框)。320 逻辑坐标,调用方已 ctx.scale。 */
export function drawConfirmBox(
  ctx: CanvasRenderingContext2D,
  cashBox: { left?: ImageBitmap; mid?: ImageBitmap; right?: ImageBitmap },
  opts: { leftText: string; rightText: string; rightSelected: boolean },
  glyphs: GlyphTable,
  now: number,
): void {
  const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_NORMAL
  drawCashBox(ctx, cashBox, 130, 100, 2)
  drawCashBox(ctx, cashBox, 205, 100, 2)
  renderSpans(ctx, [{ text: opts.leftText }], 145, 110, {
    glyphs, shadow: true, forceRgba: opts.rightSelected ? COLOR_NORMAL : blink, // 左高亮=非右选中
  })
  renderSpans(ctx, [{ text: opts.rightText }], 220, 110, {
    glyphs, shadow: true, forceRgba: opts.rightSelected ? blink : COLOR_NORMAL,
  })
}
```

- [ ] **Step 3: 写 `system-box.ts`** —— `drawSystemMenu(ctx, state, assets, glyphs, now, locale, message?)`:

```ts
// 系统菜单 Canvas UI(D17)。坐标对齐一阶段 draw-menu.ts(PAL_SystemMenu)+ draw-confirm.ts。
// 320 逻辑坐标,调用方已 ctx.scale(WORLD_SCALE)。
import { type Locale, lookupText, type TextId } from '@type-pal/content'
import type { SystemMenuState } from '../system-menu-state.js'
import type { GlyphTable } from '../text/glyph.js'
import { renderSpans } from '../text/text-render.js'
import {
  COLOR_DISABLED,
  COLOR_DISABLED_SEL,
  COLOR_NORMAL,
  drawConfirmBox,
  drawSlicedBox,
  type MenuAssets,
  SELECTED_COLORS,
} from './menu-box.js'

const SYS_BOX = { x: 40, y: 60 } // draw-menu.ts 真值
const SYS_ITEM_X = 53
const SYS_ITEM_Y0 = 72
const SYS_ITEM_DY = 18

export function drawSystemMenu(
  ctx: CanvasRenderingContext2D,
  state: SystemMenuState,
  assets: MenuAssets,
  glyphs: GlyphTable,
  now: number,
  locale: Locale,
  message?: TextId, // 瞬时提示(未实现);main.ts 持态,下次按键清
): void {
  if (!state.active) return
  const blink = SELECTED_COLORS[Math.floor(now / 100) % SELECTED_COLORS.length] ?? COLOR_NORMAL

  // ① 系统 box@(40,60) + 5 项(53,72+i*18)
  drawSlicedBox(ctx, assets.box, SYS_BOX.x, SYS_BOX.y, 84, 18 * state.items.length + 22)
  state.items.forEach((it, i) => {
    const y = SYS_ITEM_Y0 + i * SYS_ITEM_DY
    const selected = i === state.cursor && state.phase === 'menu'
    const color = it.disabled
      ? selected ? COLOR_DISABLED_SEL : COLOR_DISABLED
      : selected ? blink : COLOR_NORMAL
    renderSpans(ctx, [{ text: lookupText(it.label, locale) }], SYS_ITEM_X, y, {
      glyphs, shadow: true, forceRgba: color,
    })
  })

  // ② confirm 阶段(quit):叠 否/是 确认框
  if (state.phase === 'confirm') {
    drawConfirmBox(ctx, assets.cashBox, {
      leftText: lookupText('menu.system.no', locale),
      rightText: lookupText('menu.system.yes', locale),
      rightSelected: state.confirmYes,
    }, glyphs, now)
  }

  // ③ 瞬时提示(未实现)
  if (message) {
    renderSpans(ctx, [{ text: lookupText(message, locale) }], 130, 84, {
      glyphs, shadow: true, forceRgba: COLOR_DISABLED,
    })
  }
}
```
> ⚠ box 宽 `84` / 提示位 `(130,84)` 是估算;Claude 浏览器对齐(Task D)按截图调。坐标/色值是真值,box 宽/提示位是渲染细节。

- [ ] **Step 4: check + biome**(content + reforge 都跑)绿/0
- [ ] **Step 5: commit** — `feat(reforge): 系统菜单 UI + 通用确认框原语(对齐一阶段 PAL_SystemMenu/ConfirmMenu)`

---

## Task C 〔GLM·reforge〕: 集成(main.ts + menu-state.ts)

**Files:** Modify `packages/reforge/src/menu-state.ts`(system 项启用);`packages/reforge/src/main.ts`(输入分流 + render 分发 + cursor 记忆 + 提示态)。

- [ ] **Step 1: menu-state.ts** —— [menu-state.ts:27](../../../packages/reforge/src/menu-state.ts) 删 `enabled: false`:
```ts
  { id: 'system', label: 'menu.system', panel: 'system' },
```

- [ ] **Step 2: main.ts 模块级态**(跟 `lastUseCursor` 同处,[main.ts:163](../../../packages/reforge/src/main.ts) 附近):
```ts
  let systemMenu = closeSystemMenu()
  let lastSystemCursor = 0 // 系统菜单光标记忆(原版 iCurSystemMenuItem)
  let systemMessage: TextId | undefined // 瞬时提示(下次按键清,无计时器)
```
import:`drawSystemMenu`(menu/system-box.js)、`closeSystemMenu/openSystemMenu/systemConfirm/systemConfirmYes/systemMoveCursor/systemToggleConfirm`(system-menu-state.js)、`TextId`(@type-pal/content)。

- [ ] **Step 3: main.ts render 分发**(在 [main.ts:226](../../../packages/reforge/src/main.ts) `use` 分支后、`else menuBox.render` 前):
```ts
      } else if (menu.openPanel === 'system') {
        drawSystemMenu(ctx, systemMenu, menuAssets, glyphs, performance.now(), zhLocale, systemMessage)
```

- [ ] **Step 4: main.ts 输入分流** —— 把 [main.ts:404-406](../../../packages/reforge/src/main.ts) 现「system 占位 Esc 关」整段替换为:
```ts
      } else if (menu.openPanel === 'system') {
        if (pressed.size > 0) systemMessage = undefined // 任意按键先清上次提示(确定性,无计时器)
        if (systemMenu.phase === 'menu') {
          if (pressed.has('ArrowUp') || pressed.has('ArrowLeft')) systemMenu = systemMoveCursor(systemMenu, 'up')
          else if (pressed.has('ArrowDown') || pressed.has('ArrowRight')) systemMenu = systemMoveCursor(systemMenu, 'down')
          else if (interact) {
            const r = systemConfirm(systemMenu)
            systemMenu = r.state
            if (r.action?.kind === 'placeholder') systemMessage = 'menu.system.not-implemented'
            // quit → 已进 confirm(无 action)
          } else if (esc) { lastSystemCursor = systemMenu.cursor; systemMenu = closeSystemMenu(); menu = back(menu) }
          lastSystemCursor = systemMenu.cursor // 记忆光标
        } else { // confirm(quit)
          if (pressed.has('ArrowUp') || pressed.has('ArrowDown') || pressed.has('ArrowLeft') || pressed.has('ArrowRight'))
            systemMenu = systemToggleConfirm(systemMenu)
          else if (interact) {
            const r = systemConfirmYes(systemMenu)
            systemMenu = r.state
            if (r.action?.kind === 'quit') systemMessage = 'menu.system.not-implemented' // 是=占位(无标题屏)
            else { menu = back(menu) } // 否 → 回主菜单 hub(决策 A)
          } else if (esc) { systemMenu = closeSystemMenu(); menu = back(menu) } // Esc=否 → 回 hub
        }
```

- [ ] **Step 5: main.ts 进面板初始化** —— 在 [main.ts:421-423](../../../packages/reforge/src/main.ts) status 分支后加:
```ts
          } else if (menu.openPanel === 'system') {
            systemMenu = openSystemMenu(lastSystemCursor) // 恢复上次光标
          }
```

- [ ] **Step 6: 死码注明** —— menu-box.ts `renderPanelPlaceholder` 现已无 panel 触发(各 panel 均有专分支);其上方加注 `// 当前无触发;留作未来新增 panel 兜底`。不删。

- [ ] **Step 7: 全包 check + biome + 全仓 check**
  - `pnpm --filter @type-pal/content run check`(locale)+ `pnpm --filter @type-pal/reforge run check` → 绿
  - `pnpm --filter @type-pal/reforge exec biome check src/` → 0/0
  - `pnpm check`(全仓)→ 没打穿其它包
- [ ] **Step 8: commit** — `feat(reforge): 系统菜单集成(主菜单 system 启用 + 退出确认回 hub)`

---

## Task D 〔Claude〕: 浏览器对齐

`dev`(端口避开用户 5173,用 5183)→ Esc → 系统,核:
- 5 项全灰显;选中项 6 帧闪(选中灰=0x1C);光标**环绕**(末项↓回首)。
- 选任一占位项 → 弹「未实现」,下次按键清。
- 选**结束游戏** → 否/是 确认框(默认「否」高亮);否/Esc → 回主菜单 hub(决策 A);是 → 弹「未实现」回 menu。
- box 宽/提示位置/确认框坐标对截图微调。验毕**杀 dev server**(别占端口)。

---

## Self-Review

1. **真值对齐**:5 项顺序/box(40,60)项起(53,72)行距18/确认框(130/205,100)len2 文字(145/220,110)/**光标环绕**(已修 GLM 钳制 bug)/色值——全标 game 包出处并核实。✅
2. **决策落地**:否/Esc → 回 hub(A);5 项全占位、存档不预先做实(B)。✅
3. **范围克制 + 占位明确**:框架 + 确认框原语做实;5 项灰显「未实现」;不建存档/音频/标题屏。✅
4. **接地基/已有**:复用 menu-state 树、menu-box 原语 + 色常量(本期 export 收敛)、locale;不造新基础设施。✅
5. **镜像其它菜单范式**:纯函数状态机(不可变)、cursor 跨调用记忆、提示态「下次按键清」无计时器。✅
6. **留接口不堵死**:switch 阶段类型留(音频接);quit action 留(标题屏接 returnToTitle);各项 `disabled` 标记 + placeholder action(存档系统设计就位后逐项开)。✅
