# Grok一阶段非视觉菜单/渲染候选回归

任务：[TEST-GROK-PRESENT-1](../../ops/tasks/TEST-GROK-PRESENT-1-phase1-menu-regressions.md)。
证据冻结 `1763ac58346e9a66edba6198a7c561df1aa57353`。工作树 `/Users/zhangxu/illegal/type-pal-grok-present`，分支 `codex/grok-present-tests-r1`，基点 `16fb1cbfcc0de97655e58224767b716e53510850`。
本包是程序化像素/状态断言，不是截图视觉验收，也不代表正式七包覆盖率已经提高。Grok 只贡献候选测试；正式接入、产品修复和 done 由 Codex 负责。

首包正文 `bd6fad55242285bbeb800ad8da2513e6e6bbeb51`，首包登记 `e180cb56a60750fb995559507ec7d202b81c02f9`，上一轮返工 `5cb98087ed441396aabc7f5fc1a1d0132d75d576`。本轮只修 C1a：快照和 draw 共用同一个具名 `items` 数组。本轮 tip 见收口回复。
分组提交：

| 组 | SHA |
|---|---|
| P01–P02 | `2ad45dd28394635fa3f4c6962ec08f994414b0d9` |
| P03–P04 | `616d922137b539b73270737b6db8522d59837cf6` |
| P05–P06 | `056802223a64e3e2620b4028c65ba5789cacb4b5` |
| P07–P08 | `089b2c76fbc4431d8554460c89e291ed22e8387a` |
| P09–P10 | `bd6fad55242285bbeb800ad8da2513e6e6bbeb51` |

登记 tip 是本 README 提交之后的分支 HEAD，收口回复给出。不合 main、不代签、不标 done。

## 执行登记

JSON 合计 `numTotalTests=25`，`numPassedTests=25`，`numFailedTests=0`，`numPendingTests=0`。其中真实绘制用例 23，快照工具自测 2。工具自测不计入业务覆盖。
命令 cwd 均为 `/Users/zhangxu/illegal/type-pal-grok-present`。候选命令：

```text
env -u NODE_COMPILE_CACHE pnpm exec vitest run --config docs/testing/grok-present-regressions/vitest.config.mts --reporter=json --outputFile=/tmp/grok-present-all.json
```

exit 0。没有 skip、`test.fails`、超时或 retry。

| 组 | 状态 | 精确测试标题/既有证据 | 差异轴与合同 | 命令/cwd/exit |
|---|---|---|---|---|
| P01 物品列表 | candidate-green | `P01 物品列表 P01 非空列表把可用物品名、光标不透明0与透明孔画进真实Framebuffer`；`P01 空列表不画物品名，光标仍停在默认格`；`P01 多于一页后首页物品让出左上格，右移光标换到下一列`；`P01 不可用、可用数量与已装备虚拟条目用不同色和数字` | `createInventoryMenu` + `drawInventoryMenu`。Date.now=0 时选中色 `0xF9`。空列表左上名点保持 style1 填充 `0x22`。22 项 `inventoryPageDown` 后 cursor=21，左上格是「癸」不是「甲」。filter=`usable` 时不可用 `0x1C`、可用数量 5 的青色个位、装备槽追加项 `count=0/inUse=-1` 为 `0xC8`。光标 (0,0) 写不透明索引 0，邻孔保留 `0x22` 且不写出洞里的 `0xEE` | 上列候选命令，exit 0 |
| P02 物品目标 | candidate-green | `P02 物品目标 P02 使用目标数量读gs现行库存而不是开菜单时的快照`；`P02 两人队按队伍顺序显示姓名、当前HP与含装备的攻击`；`P02 noDesc不关闭目标层，只省略物品描述` | `confirmInventoryItem` 进入 use-target。菜单快照 count=4，绘制前把 `gs.inventory` 改成 7；数量点是青色 7 不是 4。队伍 `[4,1]` 首行是「戊」的 HP 12 与攻击 23（runtime 20 + effect 3），不是静态 `attackStrength=1`，也不是 roleId 顺序的「乙」。`scriptDesc=51001` 在 list 画出「诀」；`noDesc` 后该点回到哨兵，目标层 HP 仍在 | 同上，exit 0 |
| P03 装备绘制 | candidate-green | `P03 装备绘制 P03 装备列表里不可装备项是暗色，可装备项保持可选色`；`P03 选人页画出六槽名称、选中图标、数量、预览攻击和背景` | `createEquipMenu`/`confirmEquipItem`/`equipMoveDown`。列表 filter=`equip`：可装备选中 `0xF9`，只可用的「乙」是 `0x18`。选人页六槽名、图标 `0x86`、数量 3、无背景时 (1,1) 为哨兵、有 4×4 背景时为 `0x55`。预览攻击读 getter：role 4 为 23，切到 role 1 为 5。重复绘制不改 gs/catalog/menu | 同上，exit 0 |
| P04 商店 | candidate-green | `P04 商店 P04 买列表、确认层、现有量和金钱用不同哨兵`；`P04 卖overlay画售价的一半，不执行买卖` | `createBuyMenu` + `shopSelectItem` 进入 confirm，默认否。价格 123、现有 3（背包 2 + 装备 1）、金钱 500、图标 `0x82` 分点。`createSellMenu` 后 `drawSellOverlay` 对价格 81 画 40，不画 81 的十位 8；现金与库存不变 | 同上，exit 0 |
| P05 菜单栈转发 | candidate-green | `P05 菜单栈转发 P05 物品、图标和角色经公开菜单栈传到真实下层`；`P05 装备背景只在extra.equipBg传入时写入`；`P05 状态背景和毒数据经extra传到真实状态页`。不改写 `draw-menu.test.ts` 的 hub/system 六例 | `openMenu` 后 `drawMenuStack`。每次 draw 与其前后快照共用同一个具名 `items`。缺 items/icons 时目标名和 `0x84` 不出现；传入后「戊」、物品名 `0xBE` 和图标出现。`equipBg` 只在 extra 传入时写 `0x55`。`objectPoisons` level 1、color 3 的「瘟」写在 (185,58)，色 13 | 同上，exit 0 |
| P06 仙术页 | candidate-green | `P06 仙术页 P06 施法者阶段按队伍顺序画两人不同HP`；`P06 仙术页区分MP够与不够，并画出说明和现行MP`；`P06 翻页后左上格换成后页仙术，目标阶段光标按队员移动`。既有 WIN95 空右侧见下节。字段快照自测另列，不算本组业务用例 | 菜单角色来自 `projectRuntimeToBattleRoles`。静态 `mp=10` 时费用 9 仍可选；runtime MP=8 投影后费用 8 可选、费用 9 为 `0x18`。需求 MP 黄 8，现行 MP 青 8。说明「诀」色 `0x3C`。16 项翻页后左上是「癸」。目标光标从 (75,158) 移到 (153,158) | 同上，exit 0 |
| P07 角色状态 | candidate-green | `P07 角色状态 P07 非空装备、立绘、经验和HP按当前角色画出，绘制不改状态`。毒 row 三例复用，见下节 | 直接 `drawPlayerStatus`。无背景的第一次 draw 也先快照 portraits、levelUpExp、icons 和帧尺寸。队伍 `[4,1]` 先画 role 4：立绘 `0x95`、装备「子」色 `0xBE`、经验 12、下一级 40、等级 6、HP 12 / 最大 80。`playerStatusNext` 之后再拍快照并画 role 1 | 同上，exit 0 |
| P08 结算呈现 | candidate-green | `P08 结算呈现 P08 经验金钱、升级旧新值、隐藏涨点和练成名称可区分` | 四种 screen 各自在 draw 前快照 screen 对象和 UI 帧宽高。经验 12 与金钱 34 的个位不同。升级「戊」旧等级 2 / 新等级 3，攻击 11→22，箭头 `0x47`。词表只放 51=武术 时，隐藏涨点 5 落在右对齐 x=175。练成「雷」色 `0x1B` | 同上，exit 0 |
| P09 背景索引链 | candidate-green | `P09 背景索引链 P09 正负色阶在低半字节边界钳制并保留高半字节`；`P09 小图裁剪保留未覆盖像素，移位索引经toImageData变成RGBA` | 每张背景在 `drawBattleBg` 前快照 width/height/indices。`+1`：`0xA3→0xA4`，`0xAF→0xAF`，`0x00→0x01`，`0xF0→0xF1`。`-1`：`0xA1→0xA0`，`0xA0→0xA0`，`0x05→0x04`，`0x1F→0x1E`。8 宽背景进 6 宽缓冲时，源 (7,0)=`0xAB` 不出现。2×2、shift 0 时索引 0 覆盖哨兵，界外保持 `0x5A`，RGBA 分别为 (8,0,0,255)、(0,9,0,255)、(1,2,3,255) | 同上，exit 0 |
| P10 PNG消费/释放 | candidate-green | `P10 PNG消费与释放 P10 不透明0、透明孔和不同索引经解码后被drawSprite写进Framebuffer`；`P10 解码失败不持有bitmap，getImageData或drawImage失败仍关闭` | 手写 2×2 RGBA PNG → `decodePngToIndices` → `toSpriteImages` → `drawSprite`。索引 `[0,0,12,7]`，opaque `[1,0,1,1]`，帧数组与解码结果同一引用。锚点 (10,20) 上不透明 0 写成 0，透明孔保持 `0x5A`，12 和 7 落在邻点。坏字节不创建 bitmap。同一 PNG 上 `getImageData` / `drawImage` 注入失败后 `bitmap.close` 各调用一次，随后正常解码仍 close | 同上，exit 0 |

按 candidate-green / existing-proof / reproduced-defect / pending-contract / blocked-environment 分栏。本包没有 reproduced-defect、pending-contract 或 blocked-environment。上表 23 条是真实 draw。快照工具自测另计，不称为新增业务覆盖。

### 快照工具自测（2）

| 标题 | 证明 |
|---|---|
| `P06 仙术页 P06 输入快照能发现位图宽度、法术名、背景、毒和升级表变化` | 改宽高、法术名、背景、毒、升级表后同一实参快照不等；改回后相等 |
| `P05 菜单栈转发 P05 同一items数组增删或重排会使输入快照失败` | 对快照所用的同一个 `items` 做 push、reverse、pop，三次快照都不等。不拿另一份等值数组充数 |

### existing-proof（复用，不换名复制）

- `packages/game/src/present/menu/draw-menu.test.ts`：`menuStack 空 → 不画`、`In-Game hub → 主菜单 box 在 sdlpal 真值 (3, 37) + cash 框在 (0, 0)`、`System menu → box 在 sdlpal 真值 (40, 60)`、`C2-quit:system phase=confirm → 叠确认框(130,100)/(205,100);menu 阶段不画`、`两层栈(in-game + system) → 都画 + cash 框在 in-game 时画`、`uiSpriteFrames 不足 → drawSingleLineBox 先抛 frame 44-46 missing`。P05 只补 extra 转发。
- `packages/game/src/present/menu/draw-magic.test.ts`：`pick-spell 画选中仙术 scriptDesc 说明(magicmenu.c:191)` 统计任意 `0x3C` 像素；`L8:pick-spell 用 WIN95 布局 —— MP 在左侧,右侧 MP 区(215~265)无 slash/MP sprite` 用 index 15 计数证明右侧为空、左侧有数字块。P06 用可区分字形和青色个位 8，不重开这块布局。
- `packages/game/src/present/menu/draw-player-status.test.ts`：`level<=3 → 毒名画在 (185,58),色 = wColor+10`、`level>3(高级/装备毒哨兵)→ 不画`、`wPoisonID=0(无毒槽)→ 不画`。这三例是 renderText spy。P07 不复制。P05 只证明 extra 里的 level 1 毒能到达真实像素。
- `packages/game/src/present/battle/__tests__/draw-battle-settlement.test.ts`：`仙剑常量 maxName=3 / maxProp=1 → 191`、`公式 = 183 + (maxName + maxProp - 3) * 8`。`present-battle.test.ts` 的结算四例只断言有像素写入。P08 断言具体数字和名称色。
- `packages/game/src/present/battle/__tests__/draw-battle-bg.test.ts`：`整面 320×200 写入 framebuffer`、`索引 0 也照画(背景不透明)`、`小于屏的素材不越界 / 不抛错`。`framebuffer.test.ts` 的 `toImageData(palette) —— 索引 → RGBA` 覆盖手写像素。P09 补色阶和「背景输出再进 toImageData」。
- `packages/game/src/assets/png.test.ts`：`从 Blob 解出索引数组(取 R 通道)` 只覆盖两个不透明像素。`draw-sprite.test.ts`：`每帧 anchorY = 自身高度,anchorX = 自身宽度/2(非整组钉死 frame0)`（31/63/41/54/56/65/73 七帧）和 `脚底对齐:任意高度帧在 drawSprite(cy) 处底边都落在同一行(sdlpal PAL_RLEGetHeight 逐帧)`。P10 不复制这组爬行锚点，只在解码帧上确认 2×2 的 anchor 后检查消费像素和 close。

## 首次小样与fixture自证

P01 非空正控与 P02 实时数量先跑通，再写余组。自检时两项都是真实 `drawInventoryMenu`，exit 0。

- 返工 C1：`cloneInputs` 记录 IndexedImage 的 width/height/indices/opaque，以及当次传入的 spells、magics、portraits、equipBg/statusBg/battleBg、poisons、levelUpExp、screen、解码 bitmap。
- 返工 C1a：P05 的物品、装备和空目录，以及抽查到的 P01、P02、P04 卖列表、P07 装备目录，快照和 draw 指向同一个具名 `items`。P04 买列表原本已是同一个 `items`。
- 返工 C2：P05 三次首轮 draw 和 P07 无背景首轮 draw 都在调用前取快照，返回后立即比较。`playerStatusNext`、翻页和 confirm 放在对应快照之前。
- 返工 C3：P06 用 `projectRuntimeToBattleRoles`。静态 mp=10 时费用 9 可选；投影 runtime 8 后费用 8 可选、费用 9 禁用。画面现行 MP 仍是青色 8。
- 字形每个字只有一个手写点，数字精灵只在 (0,0) 点亮。黄 `0xB0+d`、蓝 `0xD0+d`、青 `0x70+d`，和菜单色、哨兵 `0x5A`、框填充 `0x11/0x22` 分开。
- 输入用 `createInitialGameState`、公开菜单工厂和 confirm。角色 id 在 0..5，队伍 1 或 2 人。没有 `as unknown as` 或 `ts-nocheck`。
- 期望点由字形点位和 `PAL_DrawNumber` 的 6 像素步进手算，不把生产输出烤成快照，也不把 `renderText` 再跑一遍当 oracle。
- 绘制前 `structuredClone` gs/menu/catalog/帧字节，绘制后深比。confirm 造成的状态变化发生在快照之前。
- `Date.now` 固定为 0，`finally` 恢复。`setWordTable([])` 与 `setGlobalEvents([])` 在 `afterEach` 恢复。物品目标槽和施法者光标用公开 cancel / `rememberMagicCasterCursor(0)` 拨回。
- 本机 canvas 对 A=0 的像素会把 R 读成 0。P10 因此用 opaque 掩码区分透明孔；不透明索引 0 仍写成 0，孔保持哨兵。

## 关键反控（最多三组）

`node docs/testing/grok-present-regressions/mutants.mjs`，cwd 同上，exit 0。每针先跑未改源的绿对照（exit 0），再在 Vitest `transform` 里替换一处加载文本。磁盘源文件前后 SHA-256 相同：

| 文件 | SHA-256 |
|---|---|
| `packages/game/src/present/menu/draw-inventory.ts` | `5eddb467417c86a6ad632f197a287ddc2995f613d7a0e0c8afe175af49668f03` |
| `packages/game/src/present/menu/draw-menu.ts` | `10c96d95b287c9b5c94ffa65a283cf8d6ab7dab2a6a2b138ef678ae87154c09c` |
| `packages/game/src/assets/png.ts` | `4954c8f732085b29f94904caf21a0b43a40aba9437aedcd0ab34d34a1286c2d5` |

| 针 | 单点差异 | 命中 | 结果 |
|---|---|---|---|
| P02 | 使用目标数量从 `gs.inventory` 改读 `state.inventory` | `tests/p02-inventory-target.test.ts` > `P02 物品目标 P02 使用目标数量读gs现行库存而不是开菜单时的快照`，`p02-inventory-target.test.ts:83` | exit 1，`AssertionError: expected 116 to be 119`（青色 4，不是现行 7） |
| P05 | inventory 分支 `itemIcons: extra?.itemIcons` 改成 `undefined` | `tests/p05-menu-stack.test.ts` > `P05 菜单栈转发 P05 物品、图标和角色经公开菜单栈传到真实下层`，`p05-menu-stack.test.ts:72` | exit 1，`AssertionError: expected 90 to be 132`（哨兵 `0x5A`，图标 `0x84` 没到） |
| P10 | `bitmap.close()` 改成 `void bitmap` | `tests/p10-indexed-png.test.ts` > `P10 PNG消费与释放 P10 解码失败不持有bitmap，getImageData或drawImage失败仍关闭`，`p10-indexed-png.test.ts:99` | exit 1，`AssertionError: expected +0 to be 1`（getImageData 失败后 close 次数为 0） |

三针都是候选自己的业务断言变红。没有用 0 执行、错标题、TypeError 或超时充数。

## 最终回执与边界

- Node `v22.23.2`，pnpm `10.29.2`，Vitest `4.1.7`。`pnpm install --frozen-lockfile` 在该工作树执行，没有改锁文件，没有把 main 的 `node_modules` 整目录链过来。
- 候选 `tsc -p docs/testing/grok-present-regressions/tsconfig.json --noEmit` exit 0。
- `pnpm exec biome check docs/testing/grok-present-regressions` exit 0。
- 相邻六文件 `draw-menu.test.ts`、`draw-magic.test.ts`、`draw-player-status.test.ts`、`draw-battle-bg.test.ts`、`png.test.ts`、`draw-sprite.test.ts`：JSON `21 passed / 0 failed`，exit 0。命令在 `packages/game` 下，`env -u NODE_COMPILE_CACHE pnpm exec vitest run --maxWorkers=1` 加上这六个路径。
- 未跑全仓 `pnpm check`、官方 coverage/ratchet/strict、迁移、提取或浏览器。不报覆盖率增量。
- `git diff 16fb1cbf..正文` 只有 `docs/testing/grok-present-regressions/**`。产品、旧测试、资产、官方配置和覆盖率基线无 diff。
- 没有发现需要单独留档的产品失败。`diagnostics/` 未建。
