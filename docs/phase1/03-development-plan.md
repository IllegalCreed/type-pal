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

#### M3.5 Phase 2(scene 切换 + 明雷怪 + dev 跳仙灵岛 + L2 一次性补齐)✅ 2026-05-24

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

详细设计 / 决策依据见 [`plans/2026-05-24-m3-5-scene-encounter-design.md`](plans/2026-05-24-m3-5-scene-encounter-design.md)。实际 40 task 全 done(主体 17 + Playwright setup 3 + L2 23 spec 拆 17 task + 验收 3),plus 多个独立 fix commit(draw-tilemap ±1 fence + RLE opaque mask + sdlpal --dump-battle + PLAYER/ENEMY POSITIONS 真值)。**真原版 sdlpal `--dump-battle` patch 是 M3.5 新工具**(类似 D29 `--dump-map`,给 L2 battle baseline 提供真原版基准而非 self-snapshot)。L2 实施过程发现归 [`plans/2026-05-24-m3-5-scene-encounter.md`](plans/2026-05-24-m3-5-scene-encounter.md) 末尾。

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

### M4 · pal-extract 补全 + 资产分层 + 字体真渲染 ✅(2026-05-24 完工)

23 task / 4 phase 全完工。L1: 501+2 skip / L2: 31 pass / 0 skip。

- **P1 资产分层**(4 task):`data/extracted/` 按 battle/world/item/ui/splash/magic/font 分层。2530 PNG + 216 JSON 全 path 迁。
- **P2 全 chunk 覆盖**(5 task):14 MKF inventory + DATA chunks 6/11/14 typed + DATA 9/10 sprite → images/ui+magic + RNG/RGM/BALL/FIRE raw + SOUNDS metadata + splash 2 PNG。STUFF/SAVE 不存在 confirm D11。
- **P3 全 295 scene 资源**(8 task):222 unique mapNum tileset / 540 MGO sprite union / 全 294 scene-N.json / sdlpal --dump-map 99.7% diff pass / a9 端到端 unskip + pass(M3.5 ⚠️ #8 修)/ setPalette opcode handler(M3.5 ⚠️ palette 跨 scene 修)。
- **P4 字体真渲染**(5 task):Unifont 9MB BDF ship + 57083 glyphs.json + present/font.ts 17 调用点真 glyph blit + L2 baseline 全重生 + b* spec 切 sdlpal real baseline(diff 1-4%,M3.5 ⚠️ 接合)。

设计 / 决策依据见 [`plans/2026-05-24-m4-pal-extract-complete-design.md`](plans/2026-05-24-m4-pal-extract-complete-design.md)。实施过程发现 / 偏离见 [`plans/2026-05-24-m4-pal-extract-complete.md`](plans/2026-05-24-m4-pal-extract-complete.md) 末尾「实施过程发现」。

### M5 · 系统补全(2026-05-27 完工)
- **P0 探索物理**(7 task):pixel 坐标 / 菱形碰撞 / Y-sort 遮挡 / 4 帧走动 / 队友 trail / wScriptOnEnter 真跑 + verify
- **Sync GameState/DialogBox**(3 task):全字段冻结(SAVEDGAME_WIN 倒推)+ DialogBox 真做(typing/portrait/key icon/多页)+ verify
- **完整战斗**(13 task):五行公式 / 9 类 status / status apply tick / scripted enemy AI(runScript scriptOnReady + 5 battle opcode)/ exp 8 子项 / cash 真 schema / 5 个 action stub(summon/trance/throw-item/equip-battle/coop-magic)+ 收口
- **菜单 11 task**:4 个底层 primitive(Selection/Confirm/Triple/Switch)+ ItemSelectMenu/MagicSelectionMenu + InventoryMenu/EquipMenu/InGameMagicMenu state machine + PlayerStatus 3 页 + InGameMenu/SystemMenu + Shop(buy/sell)+ OpeningMenu + 收口
- **存档**(5 task):Save API(saveSlot/loadSlot/listSlots/deleteSlot)+ IndexedDB driver + slot meta(partyLevel/cash/sceneId)+ dev panel save/load/list/clear + 收口
- **交互**(7 task):EventObject 16 字段全 dump / cell-trigger / chest opcode 4 个 + 机关 opcode 3 个 + walkOneStepDir 4 个 + 三路径串通 + 收口
- **sdlpal dump 对齐工具链**:`tp_dump_state.c`(每帧 party/npcs/viewport JSON)+ `headless-battle-post-dump.patch`(战后 8 类 exp/9 status/cash)+ ts e2e 端 `?tp_dump=1` 1:1 字段对齐
- **camera 真值改造**:引入 sdlpal partyoffset(160, 112)— gs.camera 改为 viewport 语义(屏幕左上 world 坐标),render 公式 `screen = world - camera`,跨 ~15 处文件改

P2 收口:dev panel 集成 5 个 unit 入口(Battle / Scene Jump / Font Test / Dialog Style Test / Save Slots)。L2 baseline 25-30 张 + manual checklist 8 项留各功能渲染层接入后 follow-up。

设计 / 决策依据见 [`plans/2026-05-25-m5-systems-complete-design.md`](plans/2026-05-25-m5-systems-complete-design.md);实施 task plan 见 [`plans/2026-05-25-m5-systems-complete.md`](plans/2026-05-25-m5-systems-complete.md)。

### M5.5 · sdlpal 全源审计(user 要求)
- 对 sdlpal 所有 C 源逐文件 / 逐函数核对细节,与 ts port 1:1 比对,记 deviation report。
- 已知遗留 follow-up(渲染层接入相关):B-w3.b magic 特效动画(FIRE/RGM/RNG sprite sheet)/ M-w1.a~3.b 菜单渲染层 + 输入路由集成 / B-w2.b/B-w3.a 4+1 action handler 真做 / B-w1.c levelup loop(while dwExp >= rgLevelUpExp[level])。

### M6 · 体验补全 ✅(2026-05-28 起,体验层已整体落地)
- 音频接入:CD 音轨(`TRACK*.ogg`)直接用;BGM(`.mid`)运行时 SpessaSynth 合成;音效从 `SOUNDS.MKF` 解包后接入。
- AVI 过场转 mp4/webm 并接入。
- 转场特效、调色板循环动画(水 / 火)。
- 结局流程。

> **M6 之后(2026-05-31 起)进入逐子系统差异审计期**:不再按里程碑铺新功能,而是逐功能 / 逐 opcode / 逐内容对 sdlpal 源 1:1 核对 + 逐条修复。**当前实现状态不看本计划,以状态表为准** —— [`feature-status.md`](status/feature-status.md) / [`opcode-status.md`](status/opcode-status.md) / [`resource-status.md`](status/resource-status.md) 三表 + [`item-status.md`](status/item-status.md) / [`magic-status.md`](status/magic-status.md) / [`cutscene-status.md`](status/cutscene-status.md) / [`game-mechanics.md`](game-mechanics.md);系统性差异审计见 [`plans/2026-06-07-sdlpal-diff-audit.md`](plans/2026-06-07-sdlpal-diff-audit.md)。下方 **M6.5 / M7 尚未开始**,为未来计划。

### M6.5 · 资源剥离 + 代码保护(部署前置)

把项目从"本地全开 demo"切到"可对外部署"形态。两块独立工作。

#### A. 资源包外部分发

- vite build 排除 `packages/game/public/extracted/`,部署包仅含 JS/HTML/CSS(几 MB)
- `data/extracted/` 打 zip(125M;可选 PNG → WebP 无损 ~70M),通过**非公开渠道**分发(网盘私链 / 需先证明拥有原版)。README 与公开页面不提"下载资源包"
- 抽 `AssetLoader` 层(packages/game 内),所有 `fetch('/extracted/...')` 收口:
  - dev: 走 fetch(vite serve `public/extracted/` symlink)
  - prod: 走 IndexedDB Blob → `URL.createObjectURL` 喂 `<img>`,JSON 走 `blob.text().then(JSON.parse)`
- 浏览器端首次导入流程:
  - `<input type="file" accept=".zip">` 上传
  - `fflate` 解压(比 JSZip 快 3-5×,体积更小)
  - 写 IndexedDB(key = 路径,value = Blob)
  - zip 内带 `manifest.json`(版本号 + 文件 hash),启动时对比 IDB 决定是否需要重新导入
- 浏览器兼容: 首版 Chrome / Edge;Firefox / Safari 兜底 `<input webkitdirectory>` 一次性读目录
- 版权边界: zip 内仍是原作者美术资产,渠道隐蔽性 ≠ 法律免责;参考 ROM 社区实务,不做公开宣传

#### B. 关键代码后端化(轻量 Node)

威胁模型: 挡掉"扒站重挂广告"的懒人(~90%);专业逆向不在防御范围内(他们去看 sdlpal C 源更省事)。

后端只放**低频高价值**逻辑,不放高频(战斗动画 tick / UI 状态)。

- **粒度 1(M6.5 起点 · 推荐)— RNG seed 后端发**
  - 战斗 / 宝箱 / 跑路等关键节点的 PalRand seed 后端发;sdlpal RNG 是标准 LCG(`seed * 1103515245 + 12345 & 0x7fff`,从 `reference/sdlpal/uigame.c` 真值),前端复用算法
  - Stateless `POST /api/rng/battle` 返回 seed batch
  - 盗站后果: 前端跑得起来但数值跟原版对不上(伤害浮动错、宝箱错),玩家立刻发现
  - QPS: 每场战斗 1 次,Cloudflare Workers / Vercel Edge 免费 tier 永久够
- **粒度 2(可选升级)— 核心数值公式后端跑**
  - `POST /api/calc/battle-turn` 提交整轮 action,后端按 sdlpal 公式算完返回结果列表
  - 批量化避免每 action 一次 RTT
  - 门槛更高但实现成本也更高,M7 通关验证后若发现粒度 1 不够再升

- **存档签名**: IDB 存档前后端签一次,启动时校验,防直接编辑本地存档。极小 QPS
- **架构**:
  - Hono / Fastify on Node,或 Cloudflare Workers / Vercel Edge
  - 首次进入发 session token,后续请求带 token + rate limit 防爬
  - 后端代码**独立私有 repo**;前端 build 时只 inline endpoint URL
- **不做**:
  - 用户登录 / license key(破单机体验)
  - 服务器跑整场战斗(延迟敏感 + QPS 太高)
  - 实时反作弊(单机游戏没作弊对象)

#### 进入条件
- M5 + M6 完成,核心数值公式对照 sdlpal 真值已稳定
- A 与 B 可并行;A 先行不影响游戏跑通,B 先做粒度 1 + 存档签名跑通链路

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
