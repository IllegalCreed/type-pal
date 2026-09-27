# A 包四行账 — content

作者自验，不能替代 Codex 独立验收。生产源 hash 与冻结表一致。

| ID | 公开入口 | 合法输入 / guard | 旧测试精确标题 | 本包 | 差异断言 | 反控 |
|---|---|---|---|---|---|---|
| A01 | `parseFrameSequence` / `encodeFrameSequenceSync` | 生产 identity 编码器 1×1 RGBA | `version 错拒绝；reserved 非零拒绝`（只翻 `[6]`） | 新增 `encode→parse：保留位 [5] 与 [7] 各自拒绝，未改字节仍可 parse` | 原字节可 parse；`[5]`/`[7]` 各自 `TPFS.reserved`；payload `rawBytes=4` | `a01-reserved-bytes`：三字节 OR → 只查 `[6]` |
| A02 | `getScriptBody` | `shared:2` 手工合法 index/chunks；body 放在非 derived chunk | `完整校验拒绝…作者 body 放错 chunk`（check 臂） | 新增 `getScriptBody：derived chunk 未命中时回退实际 owner，不改 chunks` | 回退 `wait 7`；sibling 仍 3；缺 id `undefined`；输入不变 | `a02-script-body-fallback`：`if (direct)` → `if (derived)` |
| A03 | `validateStampTemplates` | 合法 2×1 模板 | `null 与显式 0 碰撞不同…不得越界`（行越界） | 新增 `anchor 仅 col 越界拒绝；同模板 row 合法空格锚通过` | `col=2` 抛锚点超出；`{row:1,col:1}` 通过 | 本包不占用负控名额 |
| A04 | `itemUseEffectSupportsContext` | `{kind:applyStatus,status:puppet\|protect}` | C8 `21 种 effect × world/battle/throw…`（protect） | 新增 `applyStatus(puppet) 仅 battle；protect 双上下文仍真；输入不变` | puppet world=false / battle=true | 本包不占用负控名额 |

## 命令

- 定向：`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/content exec vitest run src/frame-sequence.cursor-boundaries.test.ts src/script-library.cursor-boundaries.test.ts src/stamp.cursor-boundaries.test.ts src/item.cursor-boundaries.test.ts` → 4 files / 4 tests，exit 0
- 反控：`env -u NODE_COMPILE_CACHE node docs/testing/cursor-pure-wave/tools/module-mutants.mjs`（当时仅 A 两针）→ `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/cursor-pure-wave-mutants-m0ZR62`，`allOk`，hash 未变
- typecheck / Biome 见提交前同树输出
