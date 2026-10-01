# Grok render / host large：交付入口

[任务卡](../../../ops/tasks/TEST-GROK-RENDER-HOST-LARGE-1.md) ·
[共同协议](../README.md) · [冻结分配](../targets.json)。

Coding Owner: Grok。作者交付进行中，**不是 review / accept / done**。
派发 BASE `0704d3de6d3d2a2099475a42f601b654bba08579`。
完整候选 SHA 留到末批 `receipt.json`，本文不回填当前 HEAD。

## 累计

| 项 | 已计入 | 目标 | 剩余 |
|---|---:|---:|---:|
| 合法新合同 | 138 | 400 | 262 |
| 组 | 16 | 40 | 24 |
| 有效反控 | 16 | 40 | 24 |

G01 四组都是 `packages/game/src/assets/loader.ts`：G01-A 合法装配、G01-B 边界、G01-C 失败恢复、G01-D 缓存归属与迟到。G01 新合同 40。

G02 四组：G02-A `png.ts` 通道与上下文，G02-B `tileset-blob.ts` 魔数、分块与锚点，G02-C 裸 RLE 与精确状态，G02-D `dialog-assets.ts` 与 `rle-decode.ts` 的图标、头像和 base64。本批新合同 36。诚实新 oracle 用尽后，其余分支记在 `contracts.json` 的 `existingProof`（15 条，含 1 条不可达、1 条宿主 blocked），不计入 76。目标仍是 400/40/40。

G03 四组：G03-A `draw-tilemap.ts` 缺失帧、裁剪与接缝顺序，G03-B `draw-sprite.ts` 奇数宽锚点与跨屏像素，G03-C `follower-pos.ts` 方向偏移与冻结归属，G03-D `follower-render.ts` 缺槽与越界步。本批新合同 33。已经由旧 draw-tilemap、draw-sprite、follower 与 present 的 cover-tile 证明的分支另记 32 条 existing-proof，不计入 109。目标仍是 400/40/40。

G04 四组：G04-A `screen-wave.ts` 第 16 行镜像、波幅边界与相位归属，G04-B `screen-shake.ts` 高度 200 与补帧，G04-C `dither-fade.ts` 相位序与低位减一，G04-D `present.ts` 冻屏顺序、战斗早退、center 调色板与真实画布读回。本批新合同 29。已经由 screen-wave、screen-shake、dither、present、P12 与 framebuffer 证明的分支另记 28 条 existing-proof，不计入 138。目标仍是 400/40/40。

## 本批证据

- [contracts.json](contracts.json)：累计 138 条新合同；G02、G03 与 G04 的 existingProof 不计入
- [directed-vitest.json](directed-vitest.json)：138 条 file × fullName × passed；相邻记在 `adjacent`（G01 的 `loader.test.ts` 7 条，G02 的 png/tileset/dialog/rle 26 条，G03 的 tilemap/sprite/follower 31 条，G04 的 wave/shake/dither/framebuffer/present/P12 85 条）
- [counters.json](counters.json) 与 [反控说明](counters/README.md)：拒收探针加 G01 到 G04 各四枚三态原日志
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

私有 coverage、全包 test、根 lint、docs check、diff check、verifier 留到末批。不合 main，不跑正式 ratchet。
