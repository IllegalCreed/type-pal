# 03 · 开发计划

## 原则:垂直切片优先

整个游戏太大,不可能一次写完。开发顺序遵循**垂直切片优先**:先用很小的范围把"资源转换 → 加载 → 渲染 → 玩法"整条链路打通,证明架构可行,再横向铺开补全部内容。

`pal-extract` 工具也增量做:先只提取垂直切片需要的那点资源,后面再补全所有 MKF 格式。

## 里程碑

### M0 · 项目骨架与工具链
- 建 pnpm workspace monorepo:`pal-extract` / `game` / `shared` 三个 package(见 D19)。
- TypeScript、Vite、Vitest、Biome 配好。一个本地 `pnpm check` 脚本(类型检查 + 测试)—— 不做 CI。
- 仓库目录结构、README。

### M1 · pal-extract 打通最小链路 ✅(2026-05-23 完成)
- **共享底层**:MKF 归档读取 + **YJ2 解压**(Win9x 版用 YJ2 不是 YJ1)+ RLE 解码。
- **资源管线(切片)**:开局 scene 1 = mapNum 12 的 tilemap(128×64×2 cells)+ 该地图的 323 个 tile bitmaps + 9 个 palette。字库不要(D11)。
- **数据表(全量,顺手吃了原 M4 这条)**:235 items / 102 spells / 153 enemies。注:items / spells / enemies **实际住在 SSS.MKF chunk 2(OBJECT 数组)**,不是 DATA.MKF。
- **事件管线(全量)**:字节码反汇编器(双向 opcode 注册表 ~15 个具名 + raw 兜底)+ 可达性切分(295 scenes + shared.json + objects.json)+ WORD.DAT/`symbols.json` 注释 + **全量 SSS.MKF chunk 4 byte-level round-trip(43503 条指令 ✅)**。
- 产出 `data/extracted/` 在 `.gitignore` 中,由 `pnpm extract` 一次性生成,M2 直接消费。
- 91 个单元 / 集成测试全过,`pnpm check` 绿。
- 详细设计见 [`plans/2026-05-23-m1-pal-extract-design.md`](plans/2026-05-23-m1-pal-extract-design.md);实施过程发现 / 偏离见 [`plans/2026-05-23-m1-pal-extract.md`](plans/2026-05-23-m1-pal-extract.md) 末尾「实施过程发现」。
- **Task 20 sdlpal RLE 对拍 harness 推迟到 M3**(战斗差分本就需要 sdlpal headless 基建,统一做)。

### M2 · 运行时垂直切片(探索)✅(2026-05-23 完成)
- ✅ 资源加载层、表现层最小渲染:scene 1 真实地图 + 真队长 / NPC 精灵
- ✅ 场景系统:走路 + 边界 clamp(碰撞属性 M3 补)+ 相机
- ✅ 事件系统最小集:消费真原版 scene-001.json,onEnter 自动播 + Confirm 推进对话;走到 NPC 前 Confirm 走 trigger 段
- ✅ pal-extract 补:角色 / NPC sprite + scene-1.json + 4 个 setDialogStyle opcode 具名
- ✅ EventSystem 对未具名 raw = no-op skip + console.debug
- 详细设计见 [`plans/2026-05-23-m2-runtime-slice-design.md`](plans/2026-05-23-m2-runtime-slice-design.md);实施过程发现 / 偏离见 [`plans/2026-05-23-m2-runtime-slice.md`](plans/2026-05-23-m2-runtime-slice.md) 末尾「实施过程发现」。
- 180 个 Vitest 单测全过(M1 旧 91 + shared 20 + game 56 + pal-extract 增至 104),`pnpm check` 绿。`pnpm extract` 重跑产物完好(全量 events round-trip 仍逐字节通过,12 个 sprite / 75 帧)。

### M3 · 战斗垂直切片(分两里程碑)

**M3 = Phase 1** ✅(2026-05-24 完成)战斗骨架 + D29 双基准 + 5 actions 全集 + dev 入口;**M3.5 = Phase 2**(scene 切换 + 明雷怪 + 仙灵岛端到端,下一里程碑)。brainstorm 阶段决策依据见 [`plans/2026-05-23-m3-battle-vertical-slice-design.md`](plans/2026-05-23-m3-battle-vertical-slice-design.md);实施过程发现 / 偏离见 [`plans/2026-05-23-m3-battle-vertical-slice.md`](plans/2026-05-23-m3-battle-vertical-slice.md) 末尾「实施过程发现」。

#### M3 Phase 1(战斗系统骨架)✅ 2026-05-24
- **第一刀:D29 双基准基建** —— ① sdlpal headless map dumper(`--dump-map N --out FILE` patch + 重编),与 `scripts/render-tilemap.ts` 像素 diff 锁定 tilemap;② **`scripts/build-sdlpal-classic.sh`** patch `common.h` 加 `#define PAL_CLASSIC 1` 编出 `build/sdlpal-classic/`(忠实原版战斗);③ headless battle harness(classic build,喂 fixture 队伍 + 敌队 + RNG seed → dump 每回合 JSON),供 M3 战斗系统逐回合差分对拍。见新 D30。
- **数据 schema 大改(战斗完整版)**:Enemy 扩 30+ 字段(D28 signed + 元素抗等)+ 新增 Item / Spell / EnemyTeam / BattleField / PlayerRoles schema 提取;字段对照 sdlpal `global.h`。
- **PARTY_LEADER 真查**(M2 遗债):从 DATA.MKF chunk 3 PLAYERROLES 真解析,删硬编码 spriteNum=2。
- **PAL_CLASSIC 战斗骨架**:turn-queue 按 dexterity 每轮重排 / select-action → perform-action phase / 公式从 `fight.c` port(`calcBaseDamage` / `calcPhysicalAttackDamage` / `calcMagicDamage`,SHORT 语义保留)。
- **5 actions 全集**:attack / defend / magic / item / flee。**magic / item 效果复用 EventSystem 跑 `wScriptOnUse` 脚本**(M2 已建,战斗 mode 加 ctx);战斗用 opcode 按需具名(D26 raw skip 兜底)。
- **战斗 UI 最小版**:战场背景 + 队员 / 敌方 sprite + 主菜单 + magic / item 二级菜单 + 目标光标 + HP/MP 数字 + 伤害弹幕。`BATTLE_FPS=25` 切帧率。
- **Dev panel**:`import.meta.env.DEV` gate 的 DOM 浮层,快捷键 B 调战斗(选 enemyTeam / battleField / 队伍预设),F1 dump GameState。
- **完成定义** ✅:dev 入口能稳定跑 5 actions,won / lost / fleed 都通,exp 入账;D29 双基准对拍绿(tilemap 像素一致 + 5 个 battle fixture 中 3 个严格 PASS / 2 个 known deviation skip 见 plan 末「实施过程发现」)。

#### M3.5 Phase 2(scene 切换 + 明雷怪 + dev 跳仙灵岛 + L2 一次性补齐 · 下一里程碑)

**关键简化(D34)**:真剧情链 scope 爆,M3.5 不做真剧情;用 dev panel 加 "跳 scene" 快捷键直接 jump 到仙灵岛入口,然后真实走 1-2 scene + 撞草妖 + 真战斗。

**主体 6 项功能**:
- F1 **战斗 UI input wire**(修 M3 phase 1 limitation,Up/Down/Confirm 真菜单推进)
- F2 **scene 切换链路**(`loadScene` + `SceneAssetsCache` lazy,D33)
- F3 **明雷怪机制**(`triggerMode=contact` 自动 runScript,D32)
- F4 **scene 切换 opcode**(只 `loadScene` 1 个,其他 raw skip)
- F5 **仙灵岛码头 + 仙灵岛入口资源 dump**(2 个 scene tilemap/palette/sprite + scene-NN.json 含 triggerMode)
- F6 **dev panel "跳 scene" shortcut**

**测试六层分类(D35)**:
- **L1a-d** Vitest(`pnpm check`):L1a 纯单元 / L1b 模块集成 / L1c Headless 集成 / L1d 数据 round-trip
- **L2 Playwright 视觉 E2E**(`pnpm e2e`,**用户关注**)
- **L3 完整流程 E2E**(推 M7)

**L2 一次性补齐 23 case**(M1-M3.5 所有功能点视觉资产):
- a 组场景 / 探索(9):tilemap 渲染 / 队长 sprite / NPC sprite / 走路 / 边界 / NPC 阻挡 / 相机 / scene 切换(M3.5)/ 明雷遇怪(M3.5)
- b 组战斗(7):战斗背景 / 双方 sprite / HP-MP / 数字弹幕 / won / lost-fleed / dev 触发
- c 组菜单(6):对话框 4 style / 战斗主菜单 / 战斗法术菜单 / 战斗物品菜单 / 战斗目标光标 / dev picker
- f 组 dev 工具(1):F1 dump GameState

详细设计 / 决策依据见 [`plans/2026-05-24-m3-5-scene-encounter-design.md`](plans/2026-05-24-m3-5-scene-encounter-design.md)。预计 ~38 task(主体 12-15 + L2 23 + Playwright setup ~3)。

#### 未来 L2 大类(M3.5 不做,design 标)

- **菜单扩展**(M5):标题画面 / 大世界菜单 / inventory / 装备 / 状态 / 商店
- **视频**(M6):AVI 过场 / 片头 / 片尾
- **音频**(M6):BGM(MIDI 合成)/ 音效 / 战斗声音
- **探索 sub-genre**(M5):拾取道具 / 开箱 / 触发机关

#### 不在 M3 范围(推 M5 完整战斗)
- scripted enemy AI(`wScriptOnTurnStart` / `wScriptOnReady`)
- 五行属性 battle field 加成完整效果
- 协力法术 / 觉醒 / 升级时 8 类属性 EXP 子项细分
- 完整 status effects(M3 只识别 sleep / paralyzed / confused 三种最简)
- Summon / Trance / 装备 / 物品投掷 / 商店

### M4 · pal-extract 补全
- 覆盖剩余 MKF 格式(M1 未碰到的:F / MGO / PAT / SOUNDS 中的非切片部分等)。
- 全场景资源提取(剩余地图、剩余精灵、剩余调色板)。
- 全数据表(物品 / 法术 / 怪物等全量)。
- 注:**反汇编器骨架与全量 events round-trip 已在 M1 完成**(D22);剩余 ~80 个 opcode 的具名工作 M3 战斗 / M5 菜单等里程碑按玩法增量补,M4 兜底。

### M5 · 系统补全
- 完整战斗:五行相克、法术、战斗道具、敌方 AI、逃跑、奖励结算。
- 菜单系统全套:背包、法术、装备、状态、商店。
- 存档 / 读档(IndexedDB)。

### M6 · 体验补全
- 音频接入:CD 音轨(`TRACK*.ogg`)直接用;BGM(`.mid`)运行时 SpessaSynth 合成;音效从 `SOUNDS.MKF` 解包后接入。
- AVI 过场转 mp4/webm 并接入。
- 转场特效、调色板循环动画(水 / 火)。
- 结局流程。

### M7 · 通关验证与打磨
- 从头到尾能通关。
- 对照原版 / sdlpal 校验忠实度(数值、剧情、触发)。
- 打磨手感、性能。

## 第二阶段(本次范围之外)

忠实移植完成后,才考虑扩展能力:现代脚本 API、内容编辑器、新场景 / 剧情 / 玩法等。架构已为此留好空间,但不在当前计划内。

## 实现细节备注

- **音频管线**(已按实际数据核对,见 `04-decisions.md` 数据核对结论):Win9x 版无 RIX,**不需要 OPL 渲染器**。
  - AVI(msmpeg4v3 + mp3)→ ffmpeg 直接转 mp4/webm。
  - CD 音轨 8 个 `.ogg`(Vorbis)→ 原样使用。
  - BGM 86 个 `.mid` → 不预转换,原样进资源,运行时用 SpessaSynth 合成(见 D10),另配一个 SF3 音色库。
  - 音效在 `SOUNDS.MKF` 内 → `pal-extract` 解包后再转 ogg。属实现细节,到 M6 再处理。
- **测试基建**:测试策略见 `06-testing.md`。round-trip 验证随 events 转写器一起在 **M1** 做完(D22);sdlpal RLE 对拍 harness 也在 M1 起最小版;`.RPG` 解析、dev 调试面板、输入录制 / 回放 在 M2–M3 按需逐步搭。
- 每个里程碑进入实现前,应单独写一份实现计划(plan),再编码。
