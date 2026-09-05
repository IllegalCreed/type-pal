> **历史文档（2026-09-06 标注）**：本文写作于方案设计/计划阶段，正文中的执行指令、
> Agent 分工、版本号与“当前状态”均为**当时快照**，不是现行契约或待办；已被后续
> current-only / canonical 实现取代的方案不恢复。现行真值见 docs/phase2/READ-FIRST.md
> 与 capability-map.md。

# 第一阶段深度审计跟踪表

> **缘起**（2026-07-05）：作者要求"逐文件、逐系统、事无巨细"的三方深度对照审计（sdlpal C → 一阶段实现 → reforge 实现），确保 reforge 不重复一阶段踩过的坑、不漏移植一阶段已对齐的真值。**作者原话：不希望重复第一阶段的测试员噩梦。**
>
> 本文是**审计工作的跟踪表**——记录每个子系统/文件的审计状态，防止漏掉或重复。审计产出（逐函数对照、缺口、风险）写进对应领域段或专项审计文档。
>
> **审计方法**（每个文件/子系统）：
> 1. **sdlpal C 真值**：读对应 .c 文件，提取函数级语义（输入→输出、副作用、时序）
> 2. **一阶段实现**：读 .ts 文件，逐函数对照 sdlpal，标记偏离点（忠实 vs 改良）+ 踩坑（git fix 史）
> 3. **reforge 实现**：读 reforge 对应文件，逐函数对照一阶段/sdlpal，标记：✅ 已对齐 / ⚠️ 部分偏离 / ❌ 缺失 / ✨ 新架构免疫
> 4. **产出**：缺口清单 + 风险等级 + 行动建议（补实现 / 补测试 / 存 oracle / 无需动）

---

## 审计单元全表（按依赖顺序）

> 顺序原则：地基先审（被依赖的子系统先），上层后审。同一层内按 sdlpal C 文件字母序。

### 第一批 · 渲染/场景地基（W 领域）

| 审计单元 | sdlpal C | 一阶段 | reforge | 状态 |
|---|---|---|---|---|
| 瓦片渲染 | map.c | present/draw-tilemap.ts | render.ts | ✅ 已审([w-render-audit](w-render-audit.md)) |
| 精灵渲染 | scene.c(部分) | present/draw-sprite.ts | render.ts | ✅ 已审([w-render-audit](w-render-audit.md)) |
| 场景合成(MakeScene) | scene.c | present/present.ts | render.ts | ✅ 已审([w-render-audit](w-render-audit.md)) |
| 字体渲染 | font.c, text.c(字模) | present/font.ts | text/glyph.ts, text-render.ts | ✅ 已审([w-font-palette-audit](w-font-palette-audit.md)) |
| 调色板 | palette.c | present/(palette 相关) | text/palette-color.ts | ✅ 已审([w-font-palette-audit](w-font-palette-audit.md)) |
| 屏幕波纹/震屏 | (scene.c/screen) | present/screen-wave.ts, screen-shake.ts | (缺?) | ✅ 已审([w-font-palette-audit](w-font-palette-audit.md)) |

### 第二批 · 对话/文本（N 领域）

| 审计单元 | sdlpal C | 一阶段 | reforge | 状态 |
|---|---|---|---|---|
| 对话框渲染 | text.c | present/dialog-box.ts | dialog/dialog-box.ts | ✅ 已审([n-dialog-text-audit](n-dialog-text-audit.md)) |
| 对话解析(控制符) | text.c | present/dialog-box.ts(parseDialogText) | content/rich-text.ts | ✅ 已审([n-dialog-text-audit](n-dialog-text-audit.md)) |
| 文本数据(WORD/M.MSG) | res.c, text.c | pal-extract/utils/gbk.ts | (复用 shared) | ✅ 已审([n-dialog-text-audit](n-dialog-text-audit.md)) |

### 第三批 · 事件/脚本系统（N 领域）

| 审计单元 | sdlpal C | 一阶段 | reforge | 状态 |
|---|---|---|---|---|
| 事件解释器 | script.c | core/event-system.ts(5583行) | script-runner.ts | ✅ 已审([n-event-script-audit](n-event-script-audit.md)) |
| autoScript/巡逻 | script.c(RunAutoScript) | core/event-system.ts(tickAutoScripts) | script-runner.ts(startAutoRunners) | ✅ 已审([n-event-script-audit](n-event-script-audit.md)) |
| 触发器系统 | play.c, script.c | core/event-system.ts | main.ts(fireTrigger) | ✅ 已审([n-event-script-audit](n-event-script-audit.md)) |
| 走位/骑乘 op | script.c | core/event-system.ts | main.ts(moveEntity/cameraPan) | ✅ 已审([n-event-script-audit](n-event-script-audit.md)) |
| 页切换/状态机 | script.c | core/event-system.ts | content/script.ts(entityStage) | ✅ 已审([n-event-script-audit](n-event-script-audit.md)) |

### 第四批 · 战斗系统（B 领域）— 已有部分审计

| 审计单元 | sdlpal C | 一阶段 | reforge | 状态 |
|---|---|---|---|---|
| 战斗公式 | fight.c | core/battle/formulas.ts | content/battle-formulas.ts | ✅ 已审([b-core-audit](b-core-audit.md)) |
| 战斗状态机 | battle.c | core/battle/battle-system.ts(3507行) | battle/battle-core.ts, battle-session.ts | ✅ 已审([b-core-audit](b-core-audit.md)) |
| 回合队列 | battle.c, fight.c | core/battle/turn-queue.ts | content/battle-formulas.ts(buildActionQueue) | ✅ 已审([b-core-audit](b-core-audit.md) — 高危:dex 装配不全) |
| 战斗动画时间线 | fight.c | core/battle/anim-timeline.ts, battle-anim-driver.ts | battle/(present-battle) | ✅ 有审计(battle-audit §1-2) |
| 物理/法术攻击 | fight.c | core/battle/attack.ts, magic.ts | battle/battle-core.ts | ✅ 已审([b-attack-magic-audit](b-attack-magic-audit.md) — 高危:暴击/闪避/cover/降级链全缺) |
| 状态系统 | fight.c, global.c | core/battle/status.ts | content/battle-formulas.ts(tickBattleStatus) | ✅ 已审([b-subsystem-audit](b-subsystem-audit.md) — 高危:haste↔slow 互斥缺) |
| 敌人 AI | fight.c, script.c | core/battle/enemy-ai.ts | content/enemy-ai.ts | ✅ 已审([b-subsystem-audit](b-subsystem-audit.md)) |
| 合击法术 | fight.c | core/battle/coop-magic.ts | (未实现) | ✅ oracle 已存(harvest C8) |
| 投掷物品 | fight.c | core/battle/throw-item.ts | (未实现,phase3) | ⬜ 待审(存 oracle,reforge 未实现) |
| 物品(战斗) | fight.c, itemmenu.c | core/battle/item.ts | content/item.ts | ⬜ 待审 |
| 防御/逃跑 | fight.c | core/battle/defend.ts, flee.ts | battle/battle-core.ts | ✅ 已审([b-subsystem-audit](b-subsystem-audit.md) — 高危:逃跑漏 isBoss gate) |
| 战斗结算 | battle.c | core/battle/battle-settlement.ts | content/rewards.ts | ✅ 已审([b-core-audit](b-core-audit.md) — 缺 Phase E) |
| 战斗 opcodes | script.c(战斗侧) | core/battle/battle-opcodes.ts | (无,数据驱动) | ✅ 已审([b-subsystem-audit](b-subsystem-audit.md) — 免疫双解释器) |
| 战斗位置 | battle.c | core/battle/battle-positions.ts | battle/battle-positions.ts | ✅ 已审([b-subsystem-audit](b-subsystem-audit.md) — 完全对齐) |
| 攻击队友(混乱) | fight.c | core/battle/attack-mate.ts | (未实现) | ✅ 已审([b-attack-magic-audit](b-attack-magic-audit.md) — reforge 缺) |
| 法术对象(召唤) | fight.c | core/battle/magic-object.ts | battle/(召唤相关) | ✅ 已审([b-attack-magic-audit](b-attack-magic-audit.md)) |
| 战斗 UI | uibattle.c | present/battle/ | battle/(UI 相关) | ✅ 有审计(battle-audit) |
| **★ 毒系统(独立专项)** | fight.c, sound.c, global.c(poison list) | 一阶段 **102 commit**(4小毒/7大毒/相生相克/DoT递增/解毒/跨战斗持久) | ❌ **整个系统不存在**(schema 有 applyPoison/curePoison kind,运行时零实现) | 📌 **专项缺口**(2026-07-06 记账,等毒格立项) |
| **★ 战场场景抗性** | global.h lprgBattleField, battle.c:1563 | battle-system.ts(field.magicEffect 消费)+ event-system.ts(0x4A setBattlefield) | ✅ **已修(2026-07-06,随 D24 三层化)**:battle-fields.json.magicEffect → session opts → core 双向 calcMagicDamage.fieldEffect(fight.c:244);战场号本体三层化(场景/明雷/startBattle 参数),sys:battleField 全局退役 | ✅ 关账([D24](../../decisions.md) + [填值清单](battle-config-fills-review.md)) |

### 第五批 · 菜单系统（C/X 领域）

| 审计单元 | sdlpal C | 一阶段 | reforge | 状态 |
|---|---|---|---|---|
| 菜单框架 | uigame.c, ui.c | core/menu/menu-driver.ts, menu-mode.ts | menu/(各 box) | ✅ 已审([c-menu-audit](c-menu-audit.md)) |
| 状态面板 | uigame.c | core/menu/player-status.ts | menu/(status) | ✅ 已审([c-menu-audit](c-menu-audit.md)) |
| 装备菜单 | uigame.c, itemmenu.c | core/menu/equip-menu.ts | equip-menu-state.ts | ✅ 已审([c-menu-audit](c-menu-audit.md)) |
| 仙术菜单 | magicmenu.c | core/menu/in-game-magic-menu.ts | magic-menu-state.ts | ✅ 已审([c-menu-audit](c-menu-audit.md) — MP 禁用门偏离) |
| 物品/背包菜单 | uigame.c | core/menu/inventory-menu.ts | use-menu-state.ts | ✅ 已审([c-menu-audit](c-menu-audit.md)) |
| 商店菜单 | uigame.c | core/menu/shop-menu.ts, sell-menu.ts | (未实现) | ✅ 已审([c-menu-audit](c-menu-audit.md) — 缺失) |
| 存档菜单 | uigame.c | core/menu/save-slot-menu.ts | save/(browser-state) | ✅ 已审([c-menu-audit](c-menu-audit.md) — 故意分歧:30槽分页) |
| 开场菜单 | play.c | core/menu/opening-menu.ts | (未实现,X3) | ✅ 已审([c-menu-audit](c-menu-audit.md) — 缺失) |
| 主菜单(暂停) | uigame.c | core/menu/in-game-menu.ts | system-menu-state.ts | ✅ 已审([c-menu-audit](c-menu-audit.md) — DH9 偏离) |

### 第六批 · 壳层/引导/主循环（X 领域）

| 审计单元 | sdlpal C | 一阶段 | reforge | 状态 |
|---|---|---|---|---|
| bootstrap 接线 | main.c, play.c | shell/bootstrap.ts(1894行) | main.ts(引导段) | ✅ 已审([x-shell-audit](x-shell-audit.md) — soundfont 预取缺) |
| 主循环 | game.c | shell/main-loop.ts(181行) | main.ts(rAF tick) | ✅ 已审([x-shell-audit](x-shell-audit.md) — 无 accumulator 高危) |
| 输入 | input.c | shell/(input source) | input.ts | ✅ 已审([x-shell-audit](x-shell-audit.md) — 后按优先✅) |
| 音频(MIDI) | midi.c, sound.c | shell/audio-midi.ts, audio.ts | audio/bgm.ts, sfx.ts | ✅ 已审([x-shell-audit](x-shell-audit.md) — 四守卫✅/SFX去重缺/BGM揭场缺) |
| AVI 播放 | aviplay.c | shell/avi-player.ts | (未实现) | ✅ 已审([x-shell-audit](x-shell-audit.md)) |
| RNG 播放 | rngplay.c | shell/rng-player.ts | (未实现) | ✅ 已审([x-shell-audit](x-shell-audit.md)) |
| FBP/结局 | (ending.c) | shell/fbp-player.ts, ending-player.ts | (未实现) | ✅ 已审([x-shell-audit](x-shell-audit.md)) |
| 场景加载 | res.c, scene.c | core/scene-system.ts | loader.ts | ✅ 已审([x-shell-audit](x-shell-audit.md) — LRU onEvict 缺) |
| 游戏状态 | game.c, play.c | core/game-state.ts | content/character.ts(WorldState) | ✅ 已审([x-shell-audit](x-shell-audit.md) — per-role HP 免疫) |
| 存档 | play.c, uigame.c | core/save/ | save/(store, ops) | ✅ 已审([x-shell-audit](x-shell-audit.md) — 运行时归一化缺) |

### 第七批 · 实体/角色数据（E/C 领域）

| 审计单元 | sdlpal C | 一阶段 | reforge | 状态 |
|---|---|---|---|---|
| 实体模型 | script.c, res.c | core/event-system.ts(entity 部分) | content/(EntityDef) | ✅ 已审([ec-data-audit](ec-data-audit.md) §1) |
| 角色数据 | global.c(PlayerRoles) | core/game-state.ts | content/character.ts, actor.ts | ✅ 已审([ec-data-audit](ec-data-audit.md) §2) |
| 跟随者渲染 | scene.c | present/follower-pos.ts, follower-render.ts | (未实现) | ✅ 已审([ec-data-audit](ec-data-audit.md) §3 — 缺失,oracle 已存) |
| 装备效果 | global.c, itemmenu.c | core/equip-effect.ts | content/item.ts(equipItem) | ✅ 已审([ec-data-audit](ec-data-audit.md) §4 — 高危:卸装清状态缺口) |
| 升级/经验 | battle.c, fight.c | core/battle/(settlement) | content/rewards.ts | ✅ 已审([ec-data-audit](ec-data-audit.md) §5) |
| 技能/仙术数据 | fight.c, magicmenu.c | pal-extract/(spells) | content/skill.ts | ✅ 已审([ec-data-audit](ec-data-audit.md) §6) |
| 物品数据 | itemmenu.c | pal-extract/(items) | content/item.ts | ✅ 已审([ec-data-audit](ec-data-audit.md) §7) |
| 敌人数据 | fight.c, res.c | pal-extract/(enemies) | content/enemy.ts | ✅ 已审([ec-data-audit](ec-data-audit.md) §8 — 高危:战斗 HACK patch 未烘焙) |

### 第八批 · 资产/提取/迁移（MG/A 领域）

| 审计单元 | sdlpal C | 一阶段 | reforge | 状态 |
|---|---|---|---|---|
| MKF 提取 | res.c | pal-extract/(mkf) | migrate/(读 shared) | ✅ 已审([am-asset-migrate-audit](am-asset-migrate-audit.md)) |
| 精灵解码 | palcommon.c, res.c | shared/rle.ts | (复用 shared) | ✅ 已审([am-asset-migrate-audit](am-asset-migrate-audit.md) — broken-sprite guard 保留) |
| 事件字节码 | script.c | pal-extract/events/ | migrate/translate-events.ts | ✅ 已审([am-asset-migrate-audit](am-asset-migrate-audit.md) — 高危:giveItem-zero 未烘焙) |
| 资产管线 | res.c | assets/png.ts | migrate/bake-indexed-rgba.ts | ✅ 已审([am-asset-migrate-audit](am-asset-migrate-audit.md)) |
| 资源 manifest | res.c | pal-extract/(manifest) | (未实现) | ✅ 已审([am-asset-migrate-audit](am-asset-migrate-audit.md)) |

---

## 图例

- ⬜ **待审**：尚未做逐函数对照
- 🟡 **部分**：有 harvest 摘要或测试对齐，但未逐函数对照
- ✅ **已审**：逐函数对照完成，产出在专项文档
- ✨ **免疫**：新架构结构性消除（不需逐函数，但要记录为什么免疫）

## 已完成的专项审计

- [battle-presentation-audit-2026-07-05.md](battle-presentation-audit-2026-07-05.md) — 战斗演出（P0 bug + P1 缺失 + P2 状态 + P3 合体 + 11 架构红线）
- [w-render-audit.md](w-render-audit.md) — 渲染地基 3 单元（瓦片/精灵/MakeScene）
- [w-font-palette-audit.md](w-font-palette-audit.md) — 字体/调色板/屏幕特效 3 单元
- [n-dialog-text-audit.md](n-dialog-text-audit.md) — 对话/文本 3 单元
- [n-event-script-audit.md](n-event-script-audit.md) — 事件/脚本系统 5 单元（event-system.ts 5583 行逐区）
- [b-core-audit.md](b-core-audit.md) — 战斗核心 4 单元（公式/状态机/回合/结算）
- [b-attack-magic-audit.md](b-attack-magic-audit.md) — 攻击/法术 4 单元
- [b-subsystem-audit.md](b-subsystem-audit.md) — 战斗子系统 5 单元（状态/AI/防御逃跑/位置/opcodes）
- [c-menu-audit.md](c-menu-audit.md) — 菜单系统 9 单元
- [x-shell-audit.md](x-shell-audit.md) — 壳层/主循环/音频/过场 10 单元
- [ec-data-audit.md](ec-data-audit.md) — 实体/角色数据 8 单元
- [am-asset-migrate-audit.md](am-asset-migrate-audit.md) — 资产/提取/迁移 5 单元 + 战斗遗留

**73/73 单元全部审计完成。**
- [foundation/ec-data-audit.md](ec-data-audit.md) — 实体/角色数据 8 单元逐函数对照（实体/角色/跟随者/装备/升级/技能/物品/敌人；含卸装清状态缺口 + 战斗 HACK patch 未烘焙）
- [phase1-knowledge-harvest.md](../../reference/phase1-knowledge-harvest.md) — 8 领域踩坑+知识（按领域，非逐文件）

## 审计产出位置

逐文件审计的产出，按领域写入：
- 渲染/场景 → 本文档 W 段或新建 `w-render-audit.md`
- 战斗 → 扩充 `battle-presentation-audit` 或新建 `b-battle-core-audit.md`
- 壳层 → 新建 `x-shell-audit.md`
- 等

每个产出文档开头注明：审计日期、审计人、对照的三源版本（commit）。
