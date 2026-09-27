# A 包四行账 — content

作者自验，不能替代 Codex 独立验收。生产源 hash 与冻结表一致。R1/R2 已按首轮接收改写。

| ID | 公开入口 | 合法输入 / guard | 旧测试精确标题 | 本包 | 差异断言 | 反控 |
|---|---|---|---|---|---|---|
| A01 | `encodeFrameSequenceSync` + `deflateSync` → `parseFrameSequence` → `decodeFrameSequenceFrame` + `inflateSync` | 1×1 RGBA，正式 zlib deflate | `version 错拒绝；reserved 非零拒绝`（只翻 `[6]`） | 新增 `encode→parse→decode：deflate 正帧可还原，保留位 [5] 与 [7] 各自拒绝` | 解压 RGBA=`[1,2,3,255]`；`codec=deflate-rgba8-xor-v1`；`rawBytes=4`；`[5]`/`[7]` 各自 `TPFS.reserved` | `a01-reserved-bytes`：三字节 OR → 只查 `[6]` |
| A02 | `getScriptBody` / `checkScriptLibrary` | 无。包内无现行 `getScriptBody` 调用者；错桶会被 `checkScriptLibrary` fail-loud | `完整校验拒绝有元数据无 body 和作者 body 放错 chunk` | **撤回**原错桶测试与针。分类：无当前消费者 / 非法输入 | — | 改由 A03 占第二针 |
| A03 | `validateStampTemplates` | 合法 2×1 模板 | `null 与显式 0 碰撞不同…不得越界`（行越界） | 新增 `anchor 仅 col 越界拒绝；同模板 row 合法空格锚通过` | `col=2` 抛锚点超出；`{row:1,col:1}` 通过 | `a03-anchor-col-overflow`：去掉 `col` 越界臂 |
| A04 | `itemUseEffectSupportsContext` | `{kind:applyStatus,status:puppet\|protect}` | C8 `21 种 effect × world/battle/throw…`（protect） | 新增 `applyStatus(puppet) 仅 battle；protect 双上下文仍真；输入不变` | puppet world=false / battle=true | 本包不占用负控名额 |

## 命令（R1–R3 后）

- 定向：`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/content exec vitest run src/frame-sequence.cursor-boundaries.test.ts src/stamp.cursor-boundaries.test.ts src/item.cursor-boundaries.test.ts` → 3 files / 3 tests，exit 0
- 反控：`env -u NODE_COMPILE_CACHE node docs/testing/cursor-pure-wave/tools/module-mutants.mjs` → `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/cursor-pure-wave-mutants-PmDfNF`，六针 `ok`，hash 未变
- typecheck：`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/content exec tsc --noEmit -p tsconfig.json` → exit 0
- Biome：改动文件 0 error/warning/info
