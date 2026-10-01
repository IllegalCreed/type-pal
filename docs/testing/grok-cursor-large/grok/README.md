# Grok render / host large：交付入口

[任务卡](../../../ops/tasks/TEST-GROK-RENDER-HOST-LARGE-1.md) ·
[共同协议](../README.md) · [冻结分配](../targets.json)。

Coding Owner: Grok。作者交付进行中，**不是 review / accept / done**。
派发 BASE `0704d3de6d3d2a2099475a42f601b654bba08579`。
完整候选 SHA 留到末批 `receipt.json`，本文不回填当前 HEAD。

## 累计

| 项 | 已计入 | 目标 | 剩余 |
|---|---:|---:|---:|
| 合法新合同 | 320 | 400 | 80 |
| 组 | 32 | 40 | 8 |
| 有效反控 | 32 | 40 | 8 |

G01 四组都是 `packages/game/src/assets/loader.ts`：G01-A 合法装配、G01-B 边界、G01-C 失败恢复、G01-D 缓存归属与迟到。G01 新合同 40。

G02 四组：G02-A `png.ts` 通道与上下文，G02-B `tileset-blob.ts` 魔数、分块与锚点，G02-C 裸 RLE 与精确状态，G02-D `dialog-assets.ts` 与 `rle-decode.ts` 的图标、头像和 base64。本批新合同 36。诚实新 oracle 用尽后，其余分支记在 `contracts.json` 的 `existingProof`（15 条，含 1 条不可达、1 条宿主 blocked），不计入 76。目标仍是 400/40/40。

G03 四组：G03-A `draw-tilemap.ts` 缺失帧、裁剪与接缝顺序，G03-B `draw-sprite.ts` 奇数宽锚点与跨屏像素，G03-C `follower-pos.ts` 方向偏移与冻结归属，G03-D `follower-render.ts` 缺槽与越界步。本批新合同 33。已经由旧 draw-tilemap、draw-sprite、follower 与 present 的 cover-tile 证明的分支另记 32 条 existing-proof，不计入 109。目标仍是 400/40/40。

G04 四组：G04-A `screen-wave.ts` 第 16 行镜像、波幅边界与相位归属，G04-B `screen-shake.ts` 高度 200 与补帧，G04-C `dither-fade.ts` 相位序与低位减一，G04-D `present.ts` 冻屏顺序、战斗早退、center 调色板与真实画布读回。本批新合同 29。已经由 screen-wave、screen-shake、dither、present、P12 与 framebuffer 证明的分支另记 28 条 existing-proof，不计入 138。目标仍是 400/40/40。

G05 四组：G05-A `dialog-box.ts` 姓名色、行距与揭露像素，G05-B `font.ts` 字宽、字形装载与阴影，G05-C `draw-number.ts` 透明孔、缺帧步进与 nLength 0，G05-D 等键图标、旁白、物品框与头像掩码。本批新合同 43。时序、翻页、旧坐标、默认图标、奇数旁白、开场项 x 和结算中对齐另记 32 条 existing-proof，不计入 181。目标仍是 400/40/40。

G06 四组：G06-A `draw-inventory.ts` 物品框阴影、差额与用物层早退，G06-B 描述行距和 sellable / potion / important 过滤色，G06-C `draw-equip.ts` 一人选人框、灵力预览与现行数量，G06-D `draw-player-status.ts` 真气、五项数值和毒等级 3。本批新合同 48。翻页、已装备色、现行数量 7、攻击预览 23、立绘和 runtime 0 另记 30 条 existing-proof，不计入 229。目标仍是 400/40/40。

G07 四组：G07-A `draw-magic.ts` 一人选人框、说明第二行和信息框真气，G07-B `draw-shop.ts` 列表价读 rightText、预览阴影和售价取整到 0，G07-C `draw-box.ts` 透明孔、单行框节数和列数取最长项，G07-D 开场背景索引 0 与确认框两字标签。本批新合同 47。两人体力、价 123、现有 3、半价 40、九宫格和四字横坐标另记 36 条 existing-proof，开场 `y === undefined` 另记 1 条 unreachable，不计入 276。目标仍是 400/40/40。

G08 四组：G08-A `draw-battle-sprites.ts` 染色第二遍、隐身和空槽，G08-B `draw-battle-ui.ts` 合击门槛、确认绿和中毒头像，G08-C `draw-battle-settlement.ts` 缺帧与二字名框长，G08-D `draw-battle-effect.ts` 奇数宽锚点与 `draw-battle-num.ts` 五位右对齐。本批新合同 44。单次染色、Y 序、升级斜杠、偶数宽特效、飘字寿命和背景色阶另记 34 条 existing-proof，不计入 320。目标仍是 400/40/40。

## 本批证据

- [contracts.json](contracts.json)：累计 320 条新合同；G02 到 G08 的 existingProof 不计入
- [directed-vitest.json](directed-vitest.json)：320 条 file × fullName × passed；相邻记在 `adjacent`（G01 的 `loader.test.ts` 7 条，G02 的 png/tileset/dialog/rle 26 条，G03 的 tilemap/sprite/follower 31 条，G04 的 wave/shake/dither/framebuffer/present/P12 85 条，G05 的 dialog/font/draw-number/opening/settlement/P16 108 条，G06 的 inventory/equip/status 23 条，G07 的 magic/shop/box/opening/confirm 39 条，G08 的 battle sprite/ui/settlement/effect/num/bg/present/P15/P08/P09 143 条）
- [counters.json](counters.json) 与 [反控说明](counters/README.md)：拒收探针加 G01 到 G08 各四枚三态原日志
- [defects.md](defects.md)：没有停组的产品缺陷；G02 有一条宿主 blocked
- 专属宿主 `packages/game/src/__tests__/grok-render-r1/legal-host.ts`

## G01 已跑命令

定向与相邻：

`pnpm --filter @type-pal/game exec vitest run src/assets/load-all-assemble.grok-r1.test.ts src/assets/load-all-bounds.grok-r1.test.ts src/assets/load-all-recover.grok-r1.test.ts src/assets/scene-cache.grok-r1.test.ts src/assets/loader.test.ts --reporter=json`

结果：新合同 40 passed，相邻 7 passed，pending 0。

`pnpm --filter @type-pal/game run typecheck` 退出码 0。

反控：`node docs/testing/grok-cursor-large/grok/run-counters.mjs`。探针因 stderr 中的 Unhandled Errors 被拒收。G01 四枚 mutant 退出码 1，各只有一条指定 AssertionError。

## G02 已跑命令

定向与相邻：

`pnpm --filter @type-pal/game exec vitest run src/assets/png-decode.grok-r1.test.ts src/assets/tileset-gzip.grok-r1.test.ts src/assets/tileset-load.grok-r1.test.ts src/assets/dialog-icons.grok-r1.test.ts src/assets/png.test.ts src/assets/png.glm-phase1-leaves.test.ts src/assets/tileset-blob.test.ts src/assets/dialog-assets.glm-phase1-leaves.test.ts src/assets/rle-decode.test.ts --reporter=verbose --reporter=json --outputFile=/tmp/g02-directed.json`

结果：新合同 36 passed，相邻 26 passed，pending 0。

`pnpm --filter @type-pal/game run typecheck` 退出码 0。

反控：`node docs/testing/grok-cursor-large/grok/run-counters.mjs --only=G02-A,G02-B,G02-C,G02-D --skip-probe`。G02-A 与 G02-C 因 `rejects.toThrow` 的失败文本不是 AssertionError 被拒过一次，针改到 `toBeInstanceOf` / `toBe` 后重采。四枚 mutant 退出码 1，各只有一条指定 AssertionError。历史 G01 与探针日志未重写。

## G03 已跑命令

定向与相邻：

`pnpm --filter @type-pal/game exec vitest run src/present/draw-tilemap-pixels.grok-r1.test.ts src/present/draw-sprite-clip.grok-r1.test.ts src/present/follower-pos-axis.grok-r1.test.ts src/present/follower-render-gap.grok-r1.test.ts src/present/draw-tilemap.test.ts src/present/draw-sprite.test.ts src/present/follower-pos.test.ts src/present/follower-render.test.ts --reporter=verbose --reporter=json --outputFile=/tmp/g03-directed.json`

结果：新合同 33 passed，相邻 31 passed，pending 0。8 个文件合计 64 passed。

`pnpm --filter @type-pal/game run typecheck` 退出码 0。

反控：`node docs/testing/grok-cursor-large/grok/run-counters.mjs --only=G03-A,G03-B,G03-C,G03-D --skip-probe`。四枚 mutant 退出码 1，各只有一条指定 AssertionError。历史 G01、G02 与探针日志未重写。

## G04 已跑命令

定向与相邻：

`pnpm --filter @type-pal/game exec vitest run src/present/screen-wave-mirror.grok-r1.test.ts src/present/screen-shake-bounds.grok-r1.test.ts src/present/dither-fade-nibble.grok-r1.test.ts src/present/present-hold.grok-r1.test.ts src/present/screen-wave.test.ts src/present/screen-wave.glm-phase1-leaves.test.ts src/present/screen-shake.test.ts src/present/dither-fade.test.ts src/present/framebuffer.test.ts src/present/framebuffer.glm-phase1-leaves.test.ts src/present/present.test.ts src/present/__tests__/grok-composition/p12-overlays.test.ts --reporter=verbose --reporter=json --outputFile=/tmp/g04-directed.json`

结果：新合同 29 passed，相邻 85 passed，pending 0。12 个文件合计 114 passed。G04-D08 从真实 2D canvas 读回 (4,6) 的 RGBA `[10,20,30,255]`。

`pnpm --filter @type-pal/game run typecheck` 退出码 0。

反控：`node docs/testing/grok-cursor-large/grok/run-counters.mjs --only=G04-A,G04-B,G04-C,G04-D --skip-probe`。四枚 mutant 退出码 1，各只有一条指定 AssertionError。历史 G01、G02、G03 与探针日志未重写。

## G05 已跑命令

定向与相邻：

`pnpm --filter @type-pal/game exec vitest run src/present/dialog-box-pixels.grok-r1.test.ts src/present/font-width.grok-r1.test.ts src/present/draw-number-slots.grok-r1.test.ts src/present/dialog-box-chrome.grok-r1.test.ts src/present/dialog-box.test.ts src/present/dialog-box.glm-next-wave.test.ts src/present/font.glm-phase1-leaves.test.ts src/present/draw-number.test.ts src/present/__tests__/grok-composition/p16-dialog.test.ts src/present/menu/draw-opening-menu.test.ts src/present/battle/draw-battle-settlement.glm-phase1-leaves.test.ts --reporter=verbose --reporter=json --outputFile=/tmp/g05-directed.json`

结果：新合同 43 passed，相邻 108 passed，pending 0。11 个文件合计 151 passed。G05-A11 从真实 2D canvas 读回 (12,8) 的 RGBA `[1,2,140,255]`。

`pnpm --filter @type-pal/game run typecheck` 退出码 0。

反控：`node docs/testing/grok-cursor-large/grok/run-counters.mjs --only=G05-A,G05-B,G05-C,G05-D --skip-probe`。四枚 mutant 退出码 1，各只有一条指定 AssertionError。历史 G01 到 G04 与探针日志未重写。

## G06 已跑命令

定向与相邻：

`pnpm --filter @type-pal/game exec vitest run src/present/menu/inventory-list-pixels.grok-r1.test.ts src/present/menu/inventory-desc-filter.grok-r1.test.ts src/present/menu/equip-role-pixels.grok-r1.test.ts src/present/menu/status-vitals-pixels.grok-r1.test.ts src/present/__tests__/grok-present/p01-inventory-list.test.ts src/present/__tests__/grok-present/p02-inventory-target.test.ts src/present/__tests__/grok-present/p03-equip.test.ts src/present/__tests__/grok-present/p07-status.test.ts src/present/menu/draw-inventory.glm-phase1-leaves.test.ts src/present/menu/draw-equip.glm-phase1-leaves.test.ts src/present/menu/draw-player-status.test.ts src/present/menu/draw-player-status.glm-phase1-leaves.test.ts --reporter=verbose --reporter=json --outputFile=/tmp/g06-directed.json`

结果：新合同 48 passed，相邻 23 passed，pending 0。12 个文件合计 71 passed。G06-A12 从真实 2D canvas 读回 (0,140) 的 RGBA `[110,7,14,255]`。

`pnpm --filter @type-pal/game run typecheck` 退出码 0。

反控：`node docs/testing/grok-cursor-large/grok/run-counters.mjs --only=G06-A,G06-B,G06-C,G06-D --skip-probe`。四枚 mutant 退出码 1，各只有一条指定 AssertionError。历史 G01 到 G05 与探针日志未重写。

## G07 已跑命令

定向与相邻：

`pnpm --filter @type-pal/game exec vitest run src/present/menu/magic-menu-pixels.grok-r1.test.ts src/present/menu/shop-preview-pixels.grok-r1.test.ts src/present/menu/box-shadow-pixels.grok-r1.test.ts src/present/menu/opening-confirm-pixels.grok-r1.test.ts src/present/menu/draw-magic.test.ts src/present/menu/draw-magic.glm-phase1-leaves.test.ts src/present/__tests__/grok-present/p06-magic.test.ts src/present/menu/draw-shop.glm-phase1-leaves.test.ts src/present/__tests__/grok-present/p04-shop.test.ts src/present/menu/draw-box.test.ts src/present/menu/draw-box.glm-phase1-leaves.test.ts src/present/menu/draw-opening-menu.test.ts src/present/menu/draw-opening-menu.glm-phase1-leaves.test.ts src/present/menu/draw-confirm.glm-phase1-leaves.test.ts --reporter=verbose --reporter=json --outputFile=/tmp/g07-directed.json`

结果：新合同 47 passed，相邻 39 passed，pending 0。14 个文件合计 86 passed。G07-B13 从真实 2D canvas 读回 (40,8) 的 RGBA `[40,18,70,255]`。

`pnpm --filter @type-pal/game run typecheck` 退出码 0。

反控：`node docs/testing/grok-cursor-large/grok/run-counters.mjs --only=G07-A,G07-B,G07-C,G07-D --skip-probe`。四枚 mutant 退出码 1，各只有一条指定 AssertionError。历史 G01 到 G06 与探针日志未重写。

## G08 已跑命令

定向与相邻：

`pnpm --filter @type-pal/game exec vitest run src/present/battle/battle-sprite-pixels.grok-r1.test.ts src/present/battle/battle-ui-pixels.grok-r1.test.ts src/present/battle/battle-settlement-pixels.grok-r1.test.ts src/present/battle/battle-effect-num-pixels.grok-r1.test.ts src/present/battle/__tests__/draw-battle-sprites.test.ts src/present/battle/draw-battle-sprites.glm-phase1-leaves.test.ts src/present/battle/__tests__/draw-battle-ui.test.ts src/present/battle/draw-battle-ui.glm-phase1-leaves.test.ts src/present/__tests__/grok-composition/p15-battle-ui.test.ts src/present/battle/__tests__/draw-battle-settlement.test.ts src/present/battle/draw-battle-settlement.glm-phase1-leaves.test.ts src/present/__tests__/grok-present/p08-settlement.test.ts src/present/battle/__tests__/draw-battle-effect.test.ts src/present/battle/__tests__/draw-battle-num.test.ts src/present/battle/__tests__/draw-battle-bg.test.ts src/present/__tests__/grok-present/p09-background.test.ts src/present/battle/__tests__/present-battle.test.ts --reporter=verbose --reporter=json --outputFile=/tmp/g08-directed.json`

结果：新合同 44 passed，相邻 143 passed，pending 0。17 个文件合计 187 passed。G08-D07 从真实 2D canvas 读回 (161,89) 的 RGBA `[45,9,18,255]`，缓冲仍是 45。

`pnpm --filter @type-pal/game run typecheck` 退出码 0。

反控：`node docs/testing/grok-cursor-large/grok/run-counters.mjs --only=G08-A,G08-B,G08-C,G08-D --skip-probe`。四枚 mutant 退出码 1，各只有一条指定 AssertionError。历史 G01 到 G07 与探针日志未重写。

私有 coverage、全包 test、根 lint、docs check、diff check、verifier 留到末批。不合 main，不跑正式 ratchet。
