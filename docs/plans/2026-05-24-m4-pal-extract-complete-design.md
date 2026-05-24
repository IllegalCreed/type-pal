# M4 · pal-extract 补全 + 资产分层 + 字体真渲染 Design

> 这是 M4 的**设计文档**(brainstorming 产出),只讲"做什么 / 怎么组织 / 怎么验证"。
> 配套的 step-by-step 实施计划由 writing-plans 阶段产出,落在 `docs/plans/2026-05-24-m4-pal-extract-complete.md`。

## 与全局文档的关系

- 实现 `../03-development-plan.md` 的 **M4 · pal-extract 补全** 节(原文 stub 比较粗,本 design 把 4 个 stream 切清楚)。
- 消费 M3.5 Phase 2 产物:scene 切换 + 明雷怪 + L2 视觉基建 + sdlpal `--dump-battle` patch + scene-jumps.json。
- 把 M3.5 完工后留下的 ⚠️ 残留中 **3 项** 顺手修(其余推 M5):
  - a9 contact → battle 端到端 skip → 修在 **P3 T8**(SceneAssets 扩 eventCommands+labelMap + lazy load)
  - palette 跨 scene 不切 → 修在 **P3 T2**(setPalette opcode 真 handler)
  - L2 b* spec 自 self-snapshot 切到 sdlpal real baseline → 修在 **P4 T4**(顺手,L2 baseline 反正要重生)
- 架构 / 决策依据来自 `../02-architecture.md`、`../04-decisions.md`(D11 字体 Unifont / D18 events 按 scene 分文件 / D26 raw skip 兜底 / D27 sprite 分阶段 / D29 双基准 / D33 SceneAssetsCache lazy / D35 测试六层)。
- 参考资料:
  - `reference/sdlpal/global.c::PAL_LoadDefaultGame`(DATA.MKF 全 chunk map 真值)
  - `reference/sdlpal/script.c` / `reference/sdlpal/play.c`(opcode + 场景切换真行为)
  - `reference/sdlpal/text.c` / `reference/sdlpal/font.c`(字体路径真值,verify D11 假设)
  - `reference/sdlpal/io.c`(MKF / 各类 chunk 加载入口)
  - 现 `data/extracted/` 现状(216 个 JSON + 2530 PNG 平铺)

---

## 1. 范围

### 1.1 总目标

M4 结束后,**dev panel 跳全 295 scene 真渲染**(tilemap + 全 NPC + camera);**全 153 enemyTeam + 6 角色**能在战斗里 sprite 全显;**全部 UI 文字真字形可读**(HP/MP / 对话框 / 战斗主菜单 / dev picker);**全数据 chunk 抽完**(为 M5 战斗扩展 / M6 音视频铺地)。

### 1.2 4 个 stream

| Stream | 描述 |
|---|---|
| **(a) 资产分层重构** | 现 `data/extracted/images/` 2530 PNG 平铺,M4 完会爆到几万,先重构目录结构 + 锁路径契约。是 P1。 |
| **(b) 全 chunk 覆盖** | M1-M3.5 用了的:DATA(chunks 1/2/3/4/5/13)/ SSS(1/2/4)/ MAP+GOP(5 slice)/ MGO(26 sprite)/ F(6)/ ABC(全)/ FBP(全)/ PAT(全)。**没动的**:DATA 余下 chunks / STUFF / SAVE / RNG / RGM / BALL / FIRE / SOUNDS metadata。是 P2。 |
| **(c) 全 295 scene 资源** | 现切 5 个(scene 1/14/15/16/17)。扩到全 295 + 跨场景 dedup(tileset 按 mapNum / sprite 全量 union)。是 P3。 |
| **(d) 字体真渲染** | M2 占位 8×16 颜色方块 → Unifont CN 16×16 真字形。M3.5 plan 末发现 #2 早该删的占位,M4 收口。是 P4。 |

### 1.3 4 个 phase 顺序(A:a → b → c → d,数据 → UI 顺承)

**为什么 P1 必须最先**:2530 PNG 改路径还便宜,P3 全 scene 跑完会爆到数万 + P2 加新类别(item icon / ui frame / magic effect / splash)— 此时再分层成本翻倍。

**为什么 P4 字体放末尾**:字体一接入,c1-c6 主菜单 / 对话框 + b3-b4 HP-MP-数字弹幕 + a 组凡有文字 frame 的 L2 baseline 全部要重新 capture;只在末尾重生一次,避免 P3 后 + P4 后两次重生。

**为什么 P2 在 P3 前**:P2 数据表轻,先全;P3 大头(全 295 scene),晚做避免阻塞。P2 中 T3 STUFF.MKF 抽完顺带给 P4 verify "MKF 里到底有没有字模"(D11 假设无,P2 T3 实证)。

### 1.4 M4 scope 边界(reality check)

**M4 结束后能看到**:
- ✅ dev panel scene picker 跳任意 scene → 真 tilemap + camera + 全 NPC 行走 sprite
- ✅ dev panel battle picker 选任意 enemyTeam → 真 ABC sprite + 6 角色 swap leader
- ✅ 字体可读 — HP/MP / 对话框 / 战斗菜单 / dev picker 全部真字形
- ✅ a9 contact → battle 端到端 unskip pass(M3.5 ⚠️ 残留修)
- ✅ palette 跨 scene 真切(M3.5 ⚠️ 残留修)

**M4 结束后还看不到**(留 M5/M6/M7):
- inventory / status / equipment / shop 菜单系统(M5 完整菜单)
- 战斗内技能特效动画(M5 完整战斗)
- 真剧情链(M5)
- 标题画面 / 片头 / 片尾真渲染(M5/M6,M4 只 dump 素材数据)
- BGM / 音效真播放(M6)
- AVI 过场(M6)
- Layer 3 完整流程 E2E(M7)

### 1.5 完成定义

见 §7 完成定义。

---

## 2. 关键不变量

- **D29 流程纪律**:sdlpal 是规格,P3 T7 全 295 scene `--dump-map` 自动化 pixel diff 是 P3 验收;失败 scene 记 KNOWN_DEVIATIONS。
- **D26 raw skip 兜底**:M4 P2 抽新 chunk 不强求所有 opcode 具名;新 chunk 用到的 opcode 若 game runtime 没消费,raw skip 即可。
- **不开 branch,直接 commit main**(memory: solo)
- **README / 公开文件 / 源码注释 不写原游戏名**(版权)
- **commit message 不带 Claude / Co-Author trailer**(memory)
- **L2 baseline PNG 不入 git**(版权,本机生成存 `packages/game/e2e/baselines/`,已在 `.gitignore`)
- 不破坏 M3.5 测试基准:`pnpm -w check` 460+2 skip + `pnpm -F @type-pal/game e2e` 30+1 skip 至少不退(P3 T8 把 1 skip 转成 pass,P4 T4 重生 baseline 后仍 30+1 → 31 pass)
- events round-trip 仍逐字节通过(M4 P2 若新具名 opcode 严格 disasm/recompile 对偶,默认不动)

---

## 3. 组件设计

### 3.1 P1 资产分层重构

#### 目录契约(最终态)

```
data/extracted/
├── data/                                # JSON 数据表(分子目录)
│   ├── enemies.json                     # 顶层数据表 — 平铺保留
│   ├── items.json
│   ├── spells.json
│   ├── magic.json
│   ├── enemy-teams.json
│   ├── battle-fields.json
│   ├── enemy-pos.json
│   ├── player-roles.json
│   ├── battle-bgs.json
│   ├── ... (其余顶层数据表)
│   ├── tilemap/                         # 按 mapNum 索引
│   │   ├── 6.json    # mapNum 6
│   │   ├── 7.json    # mapNum 7
│   │   └── ...
│   ├── scene/                           # 按 sceneId 索引(295 个)
│   │   ├── 1.json
│   │   ├── 14.json
│   │   └── ...
│   ├── sprite/                          # 按 spriteId 索引(MGO 全量 union)
│   │   ├── 2.json
│   │   ├── 13.json
│   │   └── ...
│   ├── battle-sprite/
│   │   ├── enemy/
│   │   │   ├── 1.json
│   │   │   └── ...
│   │   └── player/
│   │       ├── 0.json
│   │       └── ...
│   ├── palette/                         # 按 palette id 索引
│   │   ├── 0.json
│   │   └── ...
│   └── font/                            # P4 (d) 新 — BDF→JSON 预处理产物
│       └── glyphs.json                  # codepoint → 16×16 bitmap
├── events/                              # 沿用 M1(per scene + shared + objects)
│   ├── scene-001.json
│   ├── ...
│   ├── shared.json
│   └── objects.json
├── lookup/                              # 沿用 M1(WORD.DAT / symbols)
└── images/
    ├── battle/
    │   ├── bg/                          # FBP.MKF 全 78 chunk
    │   │   ├── 000.png
    │   │   └── ...
    │   ├── enemy/                       # ABC.MKF 全 153
    │   │   ├── 1/frame-00.png
    │   │   └── ...
    │   └── player/                      # F.MKF 6
    │       ├── 0/frame-00.png
    │       └── ...
    ├── world/
    │   ├── npc/                         # MGO.MKF 全量 union(P3 后数千)
    │   │   ├── 2/frame-00.png           # 主角行走 4 方向
    │   │   ├── 13/frame-00.png          # 张二哥
    │   │   └── ...
    │   └── tileset/                     # MAP+GOP 全 ~120 unique mapNum
    │       ├── map-6/tile-0000.png
    │       ├── map-7/tile-0000.png
    │       └── ...
    ├── item/                            # P2 (b) 新 — 物品 icon
    ├── ui/                              # P2 (b) 新 — 对话框 / 菜单 frame
    │   ├── dialog/
    │   ├── menu/
    │   └── statusbar/
    ├── splash/                          # P2 (b) 新 — 标题 / 片头 / 片尾素材
    └── magic/                           # P2 (b) 新 — 战斗特效 sprite
```

**关键决策**:
- `world/tileset/` 按 mapNum **不**按 sceneId(GOP/MAP chunk 真按 mapNum 索引;295 scene 共用 ~120 map,按 mapNum 自动 dedup)
- `data/` 顶层数据表平铺 + 大量索引型 JSON 分子目录(避免 4000+ 文件平铺)
- `world/npc/` 按 spriteId(MGO chunk 真索引)
- `splash/` P1 建空目录,P2 (b) 真用

#### Touch 点

| 文件 | 改动 |
|---|---|
| `packages/pal-extract/src/cli.ts` | 5 处 `writeBinary(resolve(OUT, 'images', fname), ...)` → 新结构 path |
| `packages/pal-extract/src/cli.ts` | `tilemap-N.json.tilesetFiles[]` 改:消费方现是 `${BASE}/images/${name}`,新结构路径为 `world/tileset/map-{mapNum}/tile-{XXXX}.png`(相对 `images/` 根) |
| `packages/pal-extract/src/cli.ts` | tilemap/scene/sprite/battle-sprite/palette JSON 写入 path 改子目录(`tilemap-N.json` → `tilemap/N.json` 等) |
| `packages/pal-extract/scripts/render-tilemap.ts` | D29 baseline 工具 tile 路径 |
| `packages/pal-extract/src/__tests__/tilemap-baseline.test.ts` | baseline tile path |
| `packages/game/src/shell/bootstrap.ts` | `${BASE}/images/sprite-${id}-frame-...png` → 新结构;`${BASE}/images/${name}` (T17 fetcher) |
| `packages/game/src/assets/loader.ts` | tile / sprite / battle-sprite / battle-bg 4 处 URL → 新结构 |
| `packages/game/src/assets/loader.ts` | JSON fetch path 改子目录 |
| `packages/game/src/shell/dev-panel.ts` | scene-jumps.json verify(应该不依赖 images path 但 grep verify) |
| `packages/game/scripts/` | 若有 baseline diff 脚本依赖路径同步改 |

**验收**:
- `pnpm extract` 重 dump 2530 PNG + 216 JSON → 全新结构
- `pnpm -w check`:L1 460+2 skip 0 diff
- `pnpm -F @type-pal/game e2e`:L2 30+1 skip 0 diff
- `git status` 改动文件清单只有 path 改动,无新增 / 删除资源

### 3.2 P2 全 chunk 覆盖

#### Task 切法

| Task | 内容 | sdlpal 真值参考 |
|---|---|---|
| **T1** | **chunk inventory**:grep `reference/sdlpal/` 全 MKF chunk 引用,生成 `M4_CHUNK_INVENTORY.md`(每 MKF 每 chunk:sdlpal 路径 + 含义 + 已抽/待抽 + dump 策略 typed/raw) | `global.c::PAL_LoadDefaultGame`、`io.c`、`script.c`、`battle.c`、`uigame.c` |
| **T2** | **DATA.MKF 余下 chunks**(6/7/8/9/10/11/12/14/15)+ enemies/items/spells JSON 字段补漏(沿 D28 SHORT/WORD 真值修法) | `global.c::PAL_LoadDefaultGame` + `global.h::tagENEMY / tagOBJECT_ITEM / tagOBJECT_MAGIC` |
| **T3** | **STUFF.MKF 全 chunk 抽** + verify 字模(给 P4 用) | `text.c`、`font.c` |
| **T4** | **SAVE / RNG / RGM / BALL / FIRE / 其他 misc MKF chunk dump**;splash 素材顺手 dump 到 `splash/` 目录 | `io_save.c`、`uibattle.c`(FIRE 法术特效)、`uigame.c`(BALL 魔法球 UI) |
| **T5** | **SOUNDS.MKF metadata** 抽(chunk 数 + 大小 + sound id map);实际 ogg 转换留 M6 | `sound.c` |

#### Schema 严格度(选 B = 已知 typed + 未知 raw + TODO)

- **已知真值**(grep sdlpal 直接对照):typed schema + JSDoc 注释 SHORT/WORD 语义,沿 D28 修法
- **真值需要 spelunking**(含义不明):raw binary 字节 + JSON metadata(chunk index + size + 猜测含义 + `TODO M5/M6 真用时扩 typed`)
- 理由:M4 数据是给 M5/M6/M7 铺地的,M4 game runtime 不消费这些新 chunk;over-engineer schema 风险高(猜错则 M5 改两次)。D26 渐进具名同款哲学。

#### 验收

- `M4_CHUNK_INVENTORY.md` 入 `docs/`,每 MKF 都有覆盖率明细
- 新 chunk dump 出来的 JSON / raw bin 路径合规(走 P1 锁定的目录)
- 已知 typed chunk:每个抽个 spot-check 字段对 sdlpal 真值 verify
- `pnpm -w check` 不破

### 3.3 P3 全 295 scene 资源 dump

#### Task 切法

| Task | 内容 |
|---|---|
| **T1** | **`SceneAssets` 扩 `eventCommands` + `labelMap`** + game runtime `loader.ts` lazy load `events/scene-N.json` 并 build labelMap 注入 SceneAssets。**修 M3.5 ⚠️ #8 a9 端到端 skip**。 |
| **T2** | **`setPalette` opcode 真处理**:game runtime EventSystem 从 raw skip 升级 typed handler(per scene 切换时真换 palette,触发 present 重渲染)。**修 M3.5 ⚠️ palette 跨 scene**。需要 grep sdlpal `script.c` setPalette opcode 真行为。 |
| **T3** | pal-extract: `SLICE_SCENE_IDS = [1,14,15,16,17]` → 全 295 sceneId scope;全 ~120 unique mapNum 都 dump tileset(MAP+GOP,按 mapNum dedup 自然) |
| **T4** | pal-extract: **MGO 全量 union dump**(扫全 295 scene 的 EventObject sprite id + onEnter script 引用的 sprite id,取 union 一次性 dump) |
| **T5** | pal-extract: **全 295 scene-N.json dump**(含 NPC/EO 列表 + `triggerMode` 真值 per D32 + sprite 引用 + mapNum) |
| **T6** | dev panel scene picker 扩 5 → 295 entries(简单 input box 输 sceneId + 显示前 20 候选;按 mapNum 分组可选;复用 M3.5 dev-panel scene-jumps.json infra) |
| **T7** | **全 295 sdlpal `--dump-map N` pixel diff 自动化**:脚本跑 295 轮 `--dump-map` + 295 轮 `render-tilemap.ts` + 295 轮 pixelmatch,生成 pass/fail 报告,失败 scene 进 `KNOWN_DEVIATIONS.md` |
| **T8** | **a9 contact → battle 端到端 spec unskip + pass 验收**(T1 装好 lazy events 后该 spec 应该天然过;若不过追根因) |

#### 关键架构决策

- **MGO union dump**(一次性):不按 scene 切分 chunk;扫全 295 scene EO 取 sprite id 集合 → 一次 dump 到 `images/world/npc/{spriteId}/`。每 scene-N.json 引用 spriteId 数组。
- **tileset by mapNum**:295 scene 共用 ~120 map(per SSS chunk 1 真值),按 mapNum dump 自然 dedup;scene-N.json 内 `mapNum` 字段引用。
- **events lazy load**:沿 D33 SceneAssetsCache lazy 同款思路扩;game runtime 切 scene 时 fetch `events/scene-N.json` + build labelMap → 注入 SceneAssets。
- **295 sdlpal diff 自动化**:延续 D29 双基准纪律 + M3.5 patch `headless-map-dump` 实证可行,跑全集自动化是合理扩展(估 ~十几分钟跑完)。

#### 验收

- `pnpm extract` 产物:全 ~120 tileset + MGO 全量 sprite(~数千)+ 全 295 scene-N.json + events 全 295 scene-NNN.json
- dev panel 跳任意 sceneId(1-295)→ 真 tilemap + 全 NPC sprite 渲染,无 console error
- T7 自动化 diff 报告:期望 ≥ 90% pass(类似 M3.5 baseline 5/5 pass 比例);失败 scene 进 KNOWN_DEVIATIONS 给 M5/M7
- a9 spec unskip → 30+1 → 31 pass(L2)
- palette 跨 scene 真切(肉眼 verify 跳几个 scene palette 不一致)

### 3.4 P4 字体真渲染

#### Task 切法

| Task | 内容 |
|---|---|
| **T1** | consume P2 T3 STUFF.MKF verify 结果:若有字模 → 决策融合还是 Unifont 兜底;若无(per D11 假设) → 100% Unifont。下载 GNU Unifont CN 变体 16×16 BDF 作 build asset(`packages/game/assets/unifont-cn.bdf` 或类似)。 |
| **T2** | **BDF → JSON 预处理**(放 pal-extract):脚本将每 codepoint 转 16×16 bitmap(每 row 2 bytes = 16 bits,共 32 bytes/glyph);输出 `data/extracted/data/font/glyphs.json`(codepoint → bitmap 数组)。pnpm extract 一锅跑。 |
| **T3** | `packages/game/src/present/font.ts` **重写**:删 8×16 色块占位;字符串 → UTF-8 codepoint → glyph 查表 → 16×16 indexed bitmap → blit(palette 前景色)。string measure: CJK 16px / ASCII 8px(或全 16px 等宽,看 D13 帧缓冲 320×200 实际显示)。 |
| **T4** | **L2 baseline 全部重生**:c1-c6 主菜单/对话框 / b3-b4 HP-MP-数字 / a 组凡有文字 frame。+ **顺手 b* spec 切 sdlpal 真 baseline**(自 self-snapshot 切到 `build/sdlpal-baseline/battles/` zh1/zh2)— sdlpal 也用 Unifont,字体一致,diff 应明显下降。 |
| **T5** | dev panel "字体测试" 入口:渲染对话/菜单/数字 sheet,spot-check 常用 GBK 字符显示正确。 |

#### 字体方案决策

**A:Unifont 100%**(per D11)
- 理由:D11 已定 + sdlpal 也用 Unifont(`reference/sdlpal/` 内嵌)+ baseline 链路一致(sdlpal --dump-battle 跟我方都用 Unifont,字形完全对得上)+ OFL license 干净
- 牺牲:跟用户当年 Win98 玩到的"宋体"略不一致(原版字形差异);可接受 — 这是 D11 已经讨论过的 trade-off

**(D11 早已否决:挖 GBK 16×16 字模/混合方案)**

#### BDF→JSON 预处理放 pal-extract 内

- 理由:`pnpm extract` 是数据预处理统一入口;BDF 虽不是 MKF 但语义上是"build-time 数据转换",同源逻辑
- 实施:`packages/pal-extract/src/font/bdf-to-json.ts`,cli.ts 加新 stage,产物到 `data/extracted/data/font/glyphs.json`

#### 验收

- 任意 scene 进对话 / 战斗 / 主菜单,所有文字真字形可读(不是色块)
- `pnpm -F @type-pal/game e2e` L2 30+1 → 31 pass(P3 T8 unskip + P4 baseline 重生)
- L2 b* spec 跟 sdlpal real baseline diff < 2%(M3.5 末 4.61% / 7.04%,字体一致后菜单 overlay 差异是主因仍存)
- 跳进任意 scene + 触发任意 battle,无字符显示 ▢ tofu(若有 → glyph 缺失补)

---

## 4. 数据流 / 架构跨界

### 4.1 数据流

```
DATA/SSS/STUFF/SAVE/RNG/RGM/BALL/FIRE/SOUNDS/PAT/MAP/GOP/MGO/F/ABC/FBP MKF (raw)
    │
    │ (P2 T1-T5 + P3 T3-T5 抽)
    ↓
data/extracted/
    │   data/                          (JSON 数据表 + 子目录)
    │   images/                        (battle/world/item/ui/splash/magic/)
    │   events/                        (M1 已 dump,P3 T1 game runtime lazy load 改)
    │   lookup/                        (M1)
    │
Unifont CN BDF (build asset)
    │
    │ (P4 T2 BDF→JSON 预处理)
    ↓
data/extracted/data/font/glyphs.json   (codepoint → 16×16 bitmap)

    ↓ (game runtime 加载)

game runtime
    │
    ├── assets/loader.ts               (P1 URL 改新结构 + P3 T1 events lazy + SceneAssets 扩)
    ├── present/font.ts                (P4 T3 重写,真 glyph blit)
    ├── core/event-system.ts           (P3 T2 setPalette typed handler)
    └── shell/dev-panel.ts             (P3 T6 scene picker 295)
```

### 4.2 架构跨界 — 不只 pal-extract

| Phase | pal-extract | game runtime | scripts / tooling |
|---|---|---|---|
| P1 | cli.ts 5 处 path + tilemap-N.json | bootstrap.ts + loader.ts URL × 6 + dev-panel verify | render-tilemap.ts + baseline test |
| P2 | 各 chunk parser 新增 | (无 — schema B 默认 game runtime 不消费) | inventory grep 脚本 |
| P3 | cli.ts SLICE_SCENE_IDS 全 295 + tileset/sprite/scene dump | SceneAssets + loader + EventSystem setPalette + dev panel picker × 295 | sdlpal --dump-map 全 295 自动化脚本 |
| P4 | bdf-to-json.ts 新增 | present/font.ts 重写 | (L2 baseline regen 用现有 helper) |

**M4 不纯 pal-extract**:P3 含 SceneAssets 扩 + EventSystem 改 + dev panel 改;P4 含 present/font.ts 重写。这跟 03 plan "M4 = pal-extract 补全" 主题略 mismatch,但是为达到 user-visible 验收(dev panel 跳全 scene 真渲染 + 文字真字形)必须的。设计上接受。

---

## 5. 测试策略

### 5.1 L1 (`pnpm -w check`)

- M3.5 末 460+2 skip,M4 P3 T8 把 1 skip 转 pass(a9)→ 461+1 skip;新 chunk parser / BDF parser 加单测 ~30 → ~490+1 skip
- P1 末:0 diff(纯 path 改)
- P2 末:T1 inventory + T2-T5 chunk parser 各加 unit test(spot-check sdlpal 真值)
- P3 末:scene-system + loader + EventSystem setPalette 各加测;sdlpal --dump-map diff 自动化报告
- P4 末:bdf-to-json + present/font 单测;glyph 查表 spot-check

### 5.2 L2 (`pnpm -F @type-pal/game e2e`)

- M3.5 末 30+1 skip
- P1 末:0 diff(纯 path 改,baseline 不变)
- P2 末:0 diff(纯数据改,UI 不变)
- P3 末:30+1 → 31 pass(a9 unskip);可能加 1-2 spec(dev panel 跳 random scene 真渲染 spot-check)
- P4 末:**全部含文字 baseline 重生**(c1-c6 主菜单/对话 + b3-b4 HP-MP-数字 + a 组含文字 frame),b* spec 切 sdlpal real baseline source(M3.5 ⚠️ 接合)→ 31 pass + diff 大幅下降

### 5.3 D29 真规格基准

- P3 T7:全 295 scene sdlpal `--dump-map N` 自动化 pixel diff;失败 scene 进 `KNOWN_DEVIATIONS.md`
- P4 T4:L2 b* baseline 自 self-snapshot 切到 sdlpal `--dump-battle` real baseline,延续 M3.5 sdlpal patch 价值

### 5.4 L3 (推 M7)

- 不在 M4 范围。M4 后 dev panel 跳全 scene 是 dev-only 路径,不是真剧情链。

---

## 6. 风险 / 未决问题

### 6.1 P2 T1 chunk inventory 工作量未知

- 14 个 MKF,M1-M3.5 用了 8 个,剩 6 个;每 MKF 5-20 个 chunk,grep sdlpal 含义需要时间
- 估 inventory 本身 1-2 天(单 task);后续 T2-T5 dump 按 inventory 切

### 6.2 STUFF.MKF 字模 verify(P2 T3 / P4 T1)

- D11 假设原版无字模(DOS HZK16 / Win98 系统宋体);**未验证**
- 若 STUFF.MKF 内有字模(比如 sdlpal 自己内嵌 Unifont 是后改的,原版可能有其他字模)→ P4 T1 决策点(用原版字模 / 用 Unifont / 混合)
- 风险:若原版字模存在但 cover 字符不全(老 GBK 子集),需要 fallback Unifont — 增加 P4 复杂度

### 6.3 全 295 scene dump 数据量

- 估算:120 tileset × 几百 tile = ~30k PNG;MGO 数千 sprite × 几帧 = ~10k PNG;tilemap-N × 120 + scene-N × 295 + sprite-N × 数千 = ~5k JSON
- 共约 **40-50k PNG + 5k JSON** 在 `data/extracted/`(gitignored)
- 单次 `pnpm extract` 时间从现 < 1 分钟 → 估 5-10 分钟;接受

### 6.4 P3 T7 自动化 diff 可能不全 pass

- M3.5 5/5 scene pass 是切片场景;全 295 可能有 corner case(某些 scene 用 P3 没覆盖的特殊 tile 渲染路径,或 SSS chunk 1 真值有 anomaly)
- 缓解:失败 scene 进 KNOWN_DEVIATIONS,不阻塞 M4 完工;M5/M7 跟进根因

### 6.5 BDF→JSON glyph 数量

- Unifont CN 16×16 cover BMP 全集(~6 万 codepoint)→ glyphs.json 可能很大(几十 MB JSON)
- 缓解:只 dump 实际用到的字符集(grep events/* + WORD.DAT + symbols.json 收集字符全集,通常 < 5000 unique CJK + ASCII)
- 或:用紧凑二进制格式而非 JSON

### 6.6 dev panel scene picker UX(295 entries)

- 简单 input box 输 sceneId 可行,但 295 个 scene 用户不知道 sceneId 含义
- 缓解:T6 加按 mapNum 分组 + scene-jumps.json 已有 scene label 显示前 N 候选;实施时 spec 简单 UX(input box + 列表过滤)

---

## 7. 完成定义

### 7.1 M4 验收清单

- [ ] **P1 资产分层重构**
  - [ ] `pnpm extract` 重 dump 2530 PNG + 216 JSON → 新结构(per §3.1 目录契约)
  - [ ] L1 460+2 skip 不破;L2 30+1 skip 0 diff
- [ ] **P2 全 chunk 覆盖**
  - [ ] `M4_CHUNK_INVENTORY.md` 入 `docs/`,14 个 MKF 全覆盖率明细
  - [ ] DATA.MKF 余下 chunks + STUFF / SAVE / RNG / RGM / BALL / FIRE / SOUNDS metadata 全 dump
  - [ ] enemies / items / spells JSON 字段补漏(D28 修法)
  - [ ] splash 素材 dump 到 `splash/`(若 MKF 内有)
  - [ ] schema B:已知 typed + 未知 raw + TODO 注释
- [ ] **P3 全 295 scene 资源 dump**
  - [ ] pal-extract 全 295 scene-N.json + 全 ~120 tileset + MGO 全量 union
  - [ ] SceneAssets 扩 eventCommands + labelMap;lazy load events/scene-N.json
  - [ ] setPalette opcode 真 handler(palette 跨 scene 真切)
  - [ ] dev panel scene picker 扩 295 entries(input + 列表过滤)
  - [ ] 全 295 sdlpal --dump-map 自动化 diff;pass / fail 报告 + KNOWN_DEVIATIONS.md
  - [ ] a9 contact → battle 端到端 spec unskip + pass
- [ ] **P4 字体真渲染**
  - [ ] Unifont CN 16×16 BDF ship 作 build asset
  - [ ] BDF→JSON 预处理脚本(pal-extract);pnpm extract 一锅
  - [ ] `present/font.ts` 重写,真 glyph blit
  - [ ] L2 baseline 全部重生(含文字 frame)
  - [ ] b* spec 切 sdlpal real baseline source(M3.5 ⚠️ 接合)
  - [ ] dev panel 字体测试入口
- [ ] **整体**
  - [ ] `pnpm -w check` 全过(估 ~490 + 1 skip)
  - [ ] `pnpm -F @type-pal/game e2e` 全过(估 31 pass)
  - [ ] dev panel 跳任意 scene + 触发任意 battle,文字真字形可读
  - [ ] README + 03 development-plan.md 同步 M4 完工
  - [ ] 实施过程发现归档(沿 M3 / M3.5 plan 末尾「实施过程发现」格式)

### 7.2 准备 M5 / M6 / M7

M4 完工后:
- **M5 系统补全**:菜单系统全套(主菜单 / inventory / status / equipment / shop)+ 完整战斗(技能特效动画 / 五行 / 觉醒 / 合体)+ 存档读档 + 真剧情链(scene 1 真 onEnter → 仙灵岛 → ...)
  - **M5 可用 M4 产物**:全 chunk 数据 + 全 scene 资源 + 字体真渲染 + a9 lazy events infra
- **M6 体验补全**:BGM(`.mid` + SpessaSynth)+ 音效(SOUNDS.MKF ogg)+ AVI 过场 + 调色板循环
  - **M6 可用 M4 产物**:SOUNDS.MKF metadata + RGM/MIDI 引用 metadata + 标题/片头 splash 素材
- **M7 通关验证**:Layer 3 完整流程 E2E + sdlpal 全 295 scene diff baseline 已存

---

## 8. 不在 M4 范围(明确推后)

- inventory / status / equipment / shop 菜单系统 → **M5**
- 战斗内技能特效动画(magic effect sprite 渲染到战斗) → **M5**
- 真剧情链(scene 1 onEnter 真跑 → 出客栈 → 大地图 → 码头 → 仙灵岛) → **M5**
- 标题画面 / 片头 / 片尾 runtime 渲染 → **M5 / M6**
- BGM / 音效真播放 → **M6**
- AVI 过场转码 + 播放 → **M6**
- Layer 3 完整流程 E2E → **M7**
- M3.5 ⚠️ fixture-end SIGABRT → **M5**(可能要补 player overrides 模拟 fixture player data)
- M3.5 ⚠️ 4-5 player PLAYER_POSITIONS 续表 → **M5**(sdlpal 真值只到 3 人,4-5 人推 educated guess)
- ~80 个 opcode 完整具名(D26 raw skip 兜底,按玩法增量) → **M5 菜单 / M6 / M7**

---

## 9. brainstorm 决策溯源(2026-05-24)

| Q | 决策 |
|---|---|
| Q1 字体归 M4? | ✅ 含 (d) 字体真渲染 |
| Q2 4 stream 顺序? | A:a → b → c → d(数据 → UI 顺承)|
| Q3 scope 边界? | 保持当前:数据全 dump + 字体接入;菜单系统/特效动画留 M5 |
| Q4 4 phase 大框架 OK? | OK |
| Q5 tileset 按 mapNum + data 分子目录 + splash M4? | 三条全 OK |
| Q6 P2 task T1→T5 + schema B? | OK |
| Q7 P3 game runtime 改归 P3 + T7 全 295 自动化? | 两条全 OK |
| Q8 P4 task + 字体 A Unifont + BDF→JSON pal-extract? | 三条全 OK |
| Q9 完整 design OK? | OK,写 doc |

design 阶段无遗留待定问题。
