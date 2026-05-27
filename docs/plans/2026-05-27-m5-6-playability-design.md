# M5.6 · 基础玩法接通(audit ⚠️ → 实修)Design

> **触发**:M5.5 audit 完工后,用户实测 3 个基础 bug(ESC 开主菜单无反应 / 走地图边缘不切场景 / 调查物品报 `triggerLabel L_38592 不在 labelMap`),根因都指向 audit 把"数据层 ✓,runtime 接入 ✗"的项标成 ⚠️ 过于宽松 — 实际"按键打不开菜单 / 跨 scene 共享 label 没解析 / 自动 trigger zone 漏一路"。M6 大块 follow-up 推迟,先插一道 M5.6 把基础玩法闭合。

**Goal:** 把 audit 标 ⚠️ 但 runtime 实际不工作的项实修到"基础玩法可闭合可玩":主菜单 / 物品菜单 / 装备菜单 / 法术菜单 / 状态 / 存档 / 调查物品 / 走边缘切场景全可用。**不**做 M6 follow-up(audio / palette cycle / levelup / 装备 effect / poison / magic anim / enemy AI bytecode / AVI / sdlpal bug fix)。

**Architecture:** 沿 02 + M5 既有四层架构,不增新分层。W0 在 shell 层加 input router(Cancel/Menu → menu state machine driver),在 present 层补 menu box / 列表 / 文字渲染 真做(对照 [`reference/sdlpal/ui.c`](reference/sdlpal/ui.c) `PAL_CreateBox` 真值)。W1 在 event-system + scene-system 改:label 查表跨 per-scene + shared 两段;tickSceneSystem 加 sdlpal `PAL_GameUpdate` fTrigger 段的自动 trigger zone 分支(`wTriggerMode >= kTriggerTouchNear`)。W2 dev-panel CSS + section 重排 + 加 menu / trigger 单元 manual 入口。

**Tech Stack:** 沿 M5 — TypeScript / Vite / Vitest / Playwright + pixelmatch / pnpm workspace。规格 = `reference/sdlpal/`(PAL_CLASSIC build,D30)。子进程统一 `execFileSync`/`execFile`。dev-panel CSS 用普通 `<style>` 标签注入(不引入 CSS framework / Tailwind,保持零依赖)。

**项目根目录:** `/Users/zhangxu/illegal/type-pal`

**Design 溯源:** M5.5 audit [`docs/plans/2026-05-27-m5-5-sdlpal-audit.md`](docs/plans/2026-05-27-m5-5-sdlpal-audit.md) ⚠️ 反思 + 用户实测 bug 反馈

---

## 全局不变量(沿 M5)

- 不开 branch,直接 commit main
- 公开文件 / commit / 源码不写原游戏名
- commit 不带 Claude / Co-Author trailer
- 不 amend 既有 commit
- L2 baseline PNG 不入 git
- 不破坏既有测试基准:`pnpm -w check` 729+2 skip 至少不退
- sdlpal patch only — 不改 `reference/sdlpal/` 树
- 任何 menu / scene-trigger 修改前先 grep sdlpal 真值(`reference/sdlpal/*.c`)再写实现
- 涉及剧情 / 玩法的修复,先拉对应攻略段到 `reference/walkthrough/`(gitignored)再切片

## 测试 / 验证

- **数据 + log,不靠截图**:加 console.log + ?tp_dump=1 录 jsonl + state-dump 比对
- "vitest 全过" ≠ "功能对" — W0~W2 每 wave 完工必须有**用户 manual checkpoint**:
  - W0 完:ESC 开 InGameMenu hub(sdlpal `input.c:66` `SDLK_ESCAPE → kKeyMenu`),hub 内上下选 → Confirm 进 Inventory/Equip/Status/Magic/SystemMenu 子菜单,Menu(再按 ESC)返回上一级
  - W1 完:scene 1 起步走到 scene 1 出口 → scene 2 切场景成功 + 调查物品不报 label 错
  - W2 完:dev-panel 三大区(scene jump / battle fixture / menu/trigger 单元) 各自整齐 + 字体可读

---

## Scope 边界(in vs out)

### IN — M5.6 修

| 类别 | audit 来源 | 现状 | 修后 |
|---|---|---|---|
| 大世界菜单输入路由 + box 渲染 | uigame.c 23 函数 ⚠️ | 数据 state machine ✓ runtime ✗ | ESC → InGameMenu hub + 上下 Confirm 进子菜单 + Menu 返回(对照 sdlpal `input.c:66 SDLK_ESCAPE → kKeyMenu`) |
| 战斗 UI 菜单 | uibattle.c 12 函数 ⚠️ | 简版 uiState 字段 | 战斗主菜单 + 物品/法术子菜单 box + 输入路由真做 |
| 物品/法术选择菜单 | itemmenu.c 3 + magicmenu.c 3 ⚠️ | 数据层 ✓ | 渲染 + 输入路由接通 |
| menu box 渲染原语 | ui.c CreateBox / DrawNumber 等 7 函数 ⚠️ | render-text 有 | 边框 / 阴影 / 标题真做 |
| Search/Confirm 触发 | play.c PAL_Search ⚠️ | scene-system 简版 | F/Space Confirm 触发 NPC search,跨 shared label 解析通 |
| 自动 trigger zone | play.c PAL_GameUpdate fTrigger ⚠️ | scene-system 缺一路 | wTriggerMode >= kTriggerTouchNear 自动跑 trigger script,边缘切场景通 |
| shared.json label 解析 | event-system label runtime | 未接入 | runtime label 查表跨 per-scene + shared 两段 |
| dev-panel 整理 | (无 audit) | 408 行 floating 拼接 | section 分组 + CSS 整理 + 加 menu/trigger 单元入口 |

### OUT — 留 M6+ 

- 战斗数值核心:**装备 effect(global.c:1333 PAL_UpdateEquipments + 6 Get* 加成)** / **levelup loop(global.c:2347 + fight.c:3756+ 8 类 wCount stat 加成)** / **poison 系统(rgPoisonStatus[16][6])** → M6 W0 战斗 baseline
- 视觉效果:palette cycle(水/火)/ magic anim(6 PAL_BattleShow*MagicAnim)/ PAL_ApplyWave / PAL_BattleFadeScene → M6 W1
- 音频:AUDIO_* / MIDI_* / MP3_* / OGG_* / OPUS_* / SOUND_* / RNG_* 70+ 函数 → M6 W2(SpessaSynth + Web Audio)
- enemy AI bytecode:B-w2.a 接 wScriptOnReady → runScript → M6 W3
- AVI / ending:M7
- sdlpal 自身 bug(Bug-1 SelectAutoTarget 死循环 / Bug-2 StealFromEnemy 无 dead check):随 M6 战斗修一起 fix

---

## Wave 划分 + 顺序

### W0 · 菜单输入路由层 + box 渲染(blocking M5.6 后续)

**为什么 blocking**:用户最痛的是"按键打不开任何菜单",这是验证 M5.6 通不通的入口;W1/W2 后续依赖 W0 的 menu state machine 真能被键盘驱动。

**任务范围(草拟,详细 task 在 implementation plan 内拆)**:

- shell input.ts 键映射对齐 sdlpal 真值:`Escape → 'Menu'`(原误标 'Cancel')+ `KeyM → 'Menu'`(同 sdlpal `INSERT/ALT/KP_0 → kKeyMenu` 多键映同抽象);删除 'Cancel' 抽象 — 菜单内"返回"复用 'Menu'(sdlpal 真值同键 toggle)。Confirm 抽象(Space/Enter)= sdlpal `kKeySearch`,大世界触发 Search,菜单内确认选项
- shell input router:Menu / 上下方向 / Confirm 在大世界 mode 下路由到 InGameMenu state machine driver;在菜单 mode 下路由到当前 active menu state machine
- core/menu/ menuDriver:消费 InputSnapshot.pressed → menu state machine.next(action) → 写 gs.menu*State
- present/menu/draw-menu.ts:从 gs.menu*State 渲染 box + 列表 + 高亮项 + 标题 + 数字
- ui.c PAL_CreateBox / CreateBoxWithShadow / CreateSingleLineBox 真值 port:边框九宫格 + 阴影
- uigame.c 23 函数对应:OpeningMenu / InGameMenu / SystemMenu / SaveSlotMenu / SelectionMenu / TripleMenu / ConfirmMenu / SwitchMenu / BattleSpeedMenu / ShowCash / InventoryMenu / InGameMagicMenu / PlayerStatus / ItemUseMenu / BuyMenu / SellMenu / EquipItemMenu 等
- uibattle.c 12 函数:BattleUIUpdate / DrawMiscMenu / MiscMenuUpdate / MiscItemSubMenuUpdate / PickAutoMagic / PlayerInfoBox / ShowNum 等
- itemmenu.c PAL_ItemSelectMenu(Init/Update/main)/ magicmenu.c PAL_MagicSelectionMenu(Init/Update/main)真做

**Verify(W0 manual checkpoint)**:
- 大世界:ESC → InGameMenu hub 出现 + 上下选 + Confirm 进 SystemMenu / Inventory / Equip / Status / Magic 各子菜单 + 再按 ESC 返回上一级
- 大世界 Confirm 键(Space/Enter,sdlpal `SDLK_RETURN/SPACE → kKeySearch`)→ 触发面前 NPC search
- 战斗:任意 fixture battle,玩家回合菜单(攻击 / 物品 / 法术 / 防御 / 逃) box + 输入路由全可用
- L1:menu state machine 测试已 M5 全过,不退 + 加 input router 单测

### W1 · Search/Confirm 触发 + Trigger zone + shared label 解析(后端 task parallel with W0;UI-验证 task blocks by W0 input router 初版)

**任务范围**:
- event-system:label 查表 fallback per-scene → shared.json(跨 scene 共享 script 段)— 修 `L_38592 不在 labelMap` 这类 warn
- scene-system.tickSceneSystem:补 sdlpal `PAL_GameUpdate` fTrigger 段的 auto trigger zone 分支(wTriggerMode >= kTriggerTouchNear,Manhattan 距离 < (mode-kTriggerTouchNear)*32+16 时自动 PAL_RunTriggerScript)
- scene-system 区分两类 trigger:contact monster(触发战斗)vs trigger zone(跑 enter script,含 loadScene)
- play.c PAL_Search 真值 port:Confirm 键 search 流程含 PAL_SearchTriggerRange 范围 + EventObject script + Item Use script 三段

**Verify(W1 manual checkpoint)**:
- 从 scene 1 起步走到 scene 1 出口 → scene 2 切场景,gs.npcs / labelMap / camera 重置正确
- 调查 NPC 物品 / 道具:不报 `triggerLabel 不在 labelMap` 警告
- 走过去 trigger zone NPC(非战斗 contact),自动跑 enter script → loadScene 或 showDialog 等
- L1:scene-system 新加自动 trigger zone 单测 + label fallback 单测

### W2 · dev-panel 整理 + M5.6 全功能 manual checkpoint + 收口(blocks by W0/W1)

**任务范围**:
- dev-panel CSS(`<style>` 注入)+ section 分组:scene jumps / battle fixtures / menu units / trigger units 四块,各折叠 + 滚动
- dev-panel 加 W0/W1 单元测试入口:每个 menu(InGame/System/Save/Inventory/Equip/Status/Buy/Sell/Magic 等)一键直开,每类 trigger(Touch/Search/Contact)一键模拟
- README 更新 M5.6 完工节点 + 完成度数字(audit ⚠️ → 实 ✓ 的项数)
- manual checkpoint:用户跑通 W0+W1 全部 verify 标 + dev-panel 整齐

**Verify(M5.6 全过)**:
- 729+ vitest 单测 + 31 e2e 不退
- 用户 manual 跑:ESC → InGameMenu hub + 各子菜单(System/Inventory/Equip/Status/Magic) 进出可用 / scene 1→2→1 切场景 / 调查 NPC / 战斗主菜单 + 物品菜单全过
- dev-panel 视觉整齐,三大区分明

---

## 关键风险 + 应对

| 风险 | 应对 |
|---|---|
| menu state machine M5 写时未真测路由,现在接键可能暴露 schema 缺字段 | 接每个 menu 前先 grep `gs.{menu}State` schema + sdlpal 对应函数 reactive field,缺字段补 schema 而非绕开 |
| sdlpal trigger zone 真值含 Manhattan 公式 + iCurEquipPart 等 hidden state | grep `kTriggerTouchNear` 全 case + 拉 walkthrough 验证 scene 1→2 出口 trigger NPC 真值 |
| W0 工作量比想象大(48 函数 + 渲染层) | 分批拆 task 进 implementation plan;若 session 内做不完明说分批,**不一刀切** |
| dev-panel CSS 注入跟生产构建可能冲突 | 沿 M3 既有 `import.meta.env.DEV` gate,生产构建 dead-code-elim;CSS 同一文件内联 |

---

## 完工标准(必须全过才能进 M6)

- W0/W1/W2 各 wave 的 manual checkpoint 全过
- `pnpm -w check` 不退基线(729+2 skip 单测 + 31 e2e)
- 用户跑通完整流程:开新游戏 → scene 1 起步 → 走出 scene 1 → scene 2 → 开主菜单 → 看背包 / 装备 / 状态 / 法术 → 触发战斗 → 战斗主菜单选攻击 → 战斗结束 → 继续探索
- audit 表更新:48 个 UI 函数 + scene-trigger 路径从 ⚠️ → ✓
- README 同步 M5.6 完工节点
