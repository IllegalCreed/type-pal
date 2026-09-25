# 一阶段画面合成与战斗呈现候选

2026-09-25。Grok 在 `codex/grok-present-composition-r1` 上交的隔离候选，基点是包含任务卡的 `origin/main` `bf4c51c496b9698530616749cdb142e197039b35`。任务卡要求的证据冻结 `077516bb04c27b38865139a67ad64b0c7eb3fd47` 是该提交的祖先。本目录是唯一写入。产品、正式测试、资源、脚本和覆盖率基线没有改。

正式上一包见 [grok-present-integration.md](../grok-present-integration.md)。本包不重测 P01–P10。任务卡：[TEST-GROK-PRESENT-2](../../ops/tasks/TEST-GROK-PRESENT-2-phase1-composition.md)。

首轮候选 `e0d7511e` 被 `9df1d203` counter。本轮只收窄 P15-2、P16-1 和 P15-3。P11–P14 与两条立绘例没有重做。

候选 JSON `numTotalTests=19`，`numPassedTests=19`，`numFailedTests=0`，`numPendingTests=0`。19 项都走真实 `presentFrame`、`BattlePresent.draw`、`drawBattleUI` 或 `drawDialogBox`。其中 1 项标题标明防御输入，不计入正常队伍合同。没有把快照工具自测算进业务覆盖。没有产品失败，因此没有 diagnostics。

像素合同的证据层级是已核一阶段源码（`present.ts`、`present-battle.ts`、`draw-battle-ui.ts`、`dialog-box.ts` 及它们引用的 sdlpal 行号注释），不是新的原版二进制结论。

## P11 大世界分层

旧 `packages/game/src/present/present.test.ts` 已覆盖，本包不改名重测：

- `party.y > npc.y → party 在 NPC 之下方(屏幕)，Y-sort 后 NPC 先绘 / party 后绘`（约 1010 行，spy 顺序）
- `party.y < npc.y → NPC 在 party 之下方，Y-sort 后 party 先绘 / NPC 后绘`（约 1039 行）
- `3 个 NPC 不同 y — Y-sort 正确`（约 1069 行）
- `vanishTime>0 隐藏 NPC`（约 1114 行）
- `非方向性姿势对象 nSpriteFrames=0`（约 1147 行）
- 屏外剔除四条（约 952–975 行，只看 `drawSprite` 是否被调用）
- cover 基本位置、`blit_y` 公式、远离不画（约 1187、1249、1314 行）
- 同文件里的方向帧和跟随偏移

新差异：

- `P11 同屏队首跟随与NPC在sLayer翻转后交换前后，透明孔露出下一层`：三人脚底落在同一屏幕点。`sLayer` 0 时跟随者在最上，不透明 0 写成 0；`sLayer` 1 时屏幕坐标不变，NPC 的不透明点盖上来，孔仍露出跟随者或队首。
- `P11 前景cover盖住后排NPC，前排透明孔见cover色而不见后排`：后排先画 `0x41`，cover 再盖成 7，前排孔看到 7 而不是 `0x41`，前排不透明点盖住 cover，不透明 0 写成 0。

## P12 叠层与补帧

旧例已测菜单调用与否（约 86、96 行）、对话“有像素”（约 134、162 行）、death hold、game over、黑屏、RNG 备份、调色板孤儿和箭头轮转、72 帧 dither。本包不重复这些标题。

新差异：

- `P12 advanceEffects为false时波幅和相位不变，为true时同一行像素改道`：两次 `false` 保持波幅 128，原瓦片卷到 `(210,8)`，只属于这次位移的 `(196,8)` 有色；`true` 后波幅 120，原瓦片到 `(218,8)`，`(230,8)` 进入、`(196,8)` 离开。精灵留在 `(16,20)`。
- `P12 偶数震屏补帧不减计数，再推进后改为上移`：`shakeTime=2` 在 `false` 下保持，精灵下移一行；再推进两次后计数归 0，精灵改为上移。
- `P12 场景0x4F被remap成0x4E，对话框同索引保持0x4F`：场景瓦片变成 `0x4E`，正文点仍是 `0x4F`，色表数值不变。
- `P12 菜单模式盖住左上角，event模式同一菜单栈不盖，对话像素两种模式都在`：同一 `items` 数组和菜单对象。菜单模式 `(2,0)` 是框色，event 模式该点为 0；两种模式都保留世界精灵和对话点。

## P13 战斗命令与提示寿命

旧 `present-battle.test.ts` 已测单次伤害写入（约 315 行）、坐标（约 329 行）、跨帧上移过期（约 365 行）、非伤害命令跳过（约 392 行）、`clearFloatingNums`（约 416 行）、结算“有写入”（约 637–669 行）、对话“framebuffer 差异”（约 597 行）。

新差异：

- `P13 后一条战斗消息替换前一条，对话盖住消息且到期后数字仍在上移`：同帧两条消息只留后一条。对话在上时该点是 `0x4F`，去掉对话后是消息色 15。frame 2 消息消失，伤害个位从 y=10 移到 y=8。`clearFloatingNums` 后该点回到背景。
- `P13 结算框盖住消息点，演出结束后该点回到消息色`：结算 index 在屏内时 `(83,60)` 是框点 `0xB1`；index 越过屏数后回到消息色；清空后是背景。

## P14 战斗渐变与补帧

旧例已测战斗调色板 ramp 改 `gs.palette.colors`（约 209 行）、`frame.shake`（约 233 行）、战场屏波不卷精灵（约 281 行）。不重测 `draw-battle-bg` 纯色阶和 `draw-battle-sprites` 的死亡淡出纯函数。入场切换和召唤 crossfade 没有旧的起点/中段/终点像素例。

新差异：

- `P14 入场切换起点中段终点可区分，重复中段不变且伤害数字在切换之后`：`step/total` 为 0、3、6。起点全是入场前的 `0x13`；中段 `(0,0)` 已换战斗背景、`(162,10)` 仍是旧画面；重复中段不变；终点两点都是背景。伤害个位三次都是黄 7。`introFade.step` 不被绘制改写。
- `P14 召唤crossfade高位立即换低位逐步逼近，重复终点不重开`：上一帧 `0x13`，本帧 `0x5A`。step 0 只有相位 0 变成 `0x53`；step 6 为 `0x54` / `0x53`；step 42 为 `0x5A` / `0x59`。再画一次不回到起点。公开 `fadeStep` 仍是 42。
- `P14 战斗补帧不推进屏波，精灵像素留在原位`：`advanceEffects=false` 两次，波幅保持 128，背景点在 `(210,8)`，一人精灵在 `(240,169)`。`true` 后波幅 120，背景点改到 `(218,8)`，精灵不动。

## P15 战斗 UI

旧 `draw-battle-ui.test.ts` 大量是“有写入 / 不抛”。已有 L8 区域计数（约 397 行）、物品说明和图标（约 460 行）、状态字（约 663 行）、缺角色“不抛”（约 710 行，且 `uiState=hidden`）。使用和投掷在源码里走同一个 `drawItemSelectGrid`，没有可区分像素，本包不另造一条。多于 3 人的布局不作为产品新需求来测。

新差异：

- `P15 一人二人三人的当前行动箭头和HP个位落在各自锚点`：箭头分别在 `(232,96)`、`(248,78)`、`(262,72)`。HP 个位只出现在实际人数对应的 `(135,170)`、`(212,170)`、`(289,170)`。
- `P15 预填禁用菜单按需求9与8着色，运行时MP数字是8不是静态10`：`disabled` 和 `rightText` 由测试预填。需求 9 选中为 `0x1C`、黄个位 9；需求 8 选中为 `0xF9`、黄个位 8。青色现行数字读 `rgwMP` 的 8，不读静态 `role.mp` 的 10。MP 不足如何建成 disabled 已由 `packages/game/src/core/battle/__tests__/battle-system.test.ts` 的 `建表:MP 不足 → disabled 灰项(magicmenu.c:347-352)` 覆盖，本链不重复那个结论。
- `P15 正常单人队的物品数量2画青字，数量1不画`：队伍只有已定义的 role 0，物品目录里有 id 1。菜单 `rightText` 为 `×2` 时 `(102,17)` 是青 2，改成 `×1` 后该点为 0。
- `P15 防御输入:未定义的roleId不画HP，已定义角色仍画`：roleId 99 不是可组队输入。已定义角色的 HP 个位仍是黄 1，99 所在槽为 0。
- `P15 单人合击图标更暗，两人健康时合击图标较亮`：`(54,155)` 从 `0x12` 变成 `0x02`。选中的攻击图标两次都是 `0x06`。

## P16 对话框绘制

`dialog-box.test.ts` 的解析、打字、翻页和确认是状态机，本包不复制。已有绘制例包括空框、一字、阴影、五风格不抛、物品框坐标、立绘位置、缩进和等键图标。

新差异：

- `P16 旁白数字走黄色精灵，缺UI帧时不画框并把数字当字形`：有 UI 帧时框点 `(148,40)` 为 `0x44`，`3` 在 `(176,54)` 为黄 3。不传 UI 帧时框点和黄精灵位置保持哨兵，`甲` 仍在 `(160,50)`，数字 `3` 的字形点在 `(176,50)` 写成 0，右边一像素仍是哨兵。
- `P16 立绘不透明0盖住底色，透明孔保留底色，缺立绘资源仍画正文`：直接 `drawDialogBox`。不透明 0 把哨兵写成 0，孔保持哨兵。`portraitIcon=99` 且图库没有该帧时立绘点保持哨兵，姓名 `0x8C` 和正文 `0x4F` 仍在。
- `P16 presentFrame里立绘透明孔露出地块，不透明0写成0，姓名和正文颜色不同`：同一状态走 `presentFrame`。孔露出地块 `0x41`，不透明 0 写成 0。缺资源后两点都回到地块，姓名和正文仍在。

## 单点反控

`node docs/testing/grok-phase1-composition-r1/mutants.mjs`，cwd 为工作树根，exit 0。每针先跑该文件绿对照（exit 0），再只替换一个加载点。磁盘 SHA-256 前后相同。红跑恰有 1 个失败，标题就是下表，消息含 `AssertionError`。

| 调用链 | 文件 | SHA-256 | 红标题与断言 |
|---|---|---|---|
| `presentFrame` | `packages/game/src/present/present.ts` | `823ea86b27eb13771feb9ba6d1059b674a66c32b6cb685f08c0f472d77cd389e` | 场景 remap 被改成不替换。`expected 79 to be 78`（`0x4F` 没有变成 `0x4E`） |
| `BattlePresent.draw` | `packages/game/src/present/battle/present-battle.ts` | `7ca203c4de814c295b4e70ca414e3d62b31e22da1af980a52119bd83590fae2e` | 入场切换不再保留旧像素。`expected 20 to be 19`（背景 `0x14`，不是入场前 `0x13`） |
| `drawBattleUI` | `packages/game/src/present/battle/draw-battle-ui.ts` | `fee830027b4d8428e4f4bff98a2f4f4a905c3b98d163642ab088710962aa868f` | 现行 MP 被固定成 0。`expected 112 to be 120`（青 0，不是青 8） |
| `drawDialogBox` | `packages/game/src/present/dialog-box.ts` | `637acc9c9b9af81dfd5c3a0219f7e6eed4b4579778cc774218ebcee1e715dc3e` | 旁白数字不再走黄精灵。`expected 90 to be 179`（哨兵 `0x5A`，不是黄 3） |
| `drawDialogBox` | 同上 | 同上 | 无 UI 帧时跳过数字字形。`expected 90 to be +0`（`(176,50)` 仍是哨兵，数字 `3` 没画出来） |

## 验证

- 候选：`env -u NODE_COMPILE_CACHE pnpm exec vitest run --config docs/testing/grok-phase1-composition-r1/vitest.config.mts --reporter=json --outputFile=/tmp/grok-composition-all.json`。exit 0。19/19。
- 类型：`pnpm exec tsc -p docs/testing/grok-phase1-composition-r1/tsconfig.json --noEmit --pretty false`。exit 0。
- 格式：`pnpm exec biome check docs/testing/grok-phase1-composition-r1`。exit 0。
- 文档：`node scripts/docs/check.mjs` exit 1。唯一问题是 `docs/testing/README.md:1`「子目录未进入导航：docs/testing/grok-phase1-composition-r1」。父导航在写入白名单之外，本包没有改它。
- 相邻：cwd `packages/game`，`env -u NODE_COMPILE_CACHE pnpm exec vitest run --maxWorkers=1 --reporter=json --outputFile=/tmp/grok-composition-adjacent.json`，文件为 `src/present/present.test.ts`、`src/present/dialog-box.test.ts`、`src/present/battle/__tests__/present-battle.test.ts`、`src/present/battle/__tests__/draw-battle-ui.test.ts`。exit 0。177/177。
- 未跑全仓 `pnpm check`、官方 coverage ratchet / strict-fast / full，也未跑浏览器剧情 E2E。

机器账是同目录的 `ledger.json` 和 `mutant-report.json`。本轮 tip 见收口回复。不合 main，不标 done。
