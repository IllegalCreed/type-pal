# TEST-COVERAGE85-KIMI-EXTRACT-MIGRATE-1 交付证据

Owner: Kimi · Branch: `codex/coverage85-kimi-extract-migrate-r1`（dispatch base `76475c01cfbbbd9a8cd52b1cb866d3b21ba6908d`；本候选建于 main 治理提交 `d02278dc0` 之上）
状态: 待 Codex 独立验收（不合 main、不标 done）

> r3 说明：r1 候选被并发 E2E 治理提交污染（`b8c2d0b41`）；r2 重建后 main 于
> `d02278dc0` 落地测试文档治理（新建未登记的 `docs/testing/` 根文件会被门禁拒绝）。
> 本候选基于 `d02278dc0` 重建：只含本卡 12 个新测试文件、任务卡与本证据（已迁入
> `docs/ops/evidence/`）；r2 对白名单外 `docs/testing/README.md` 的修改已撤回；
> pal-extract 剩余 126 边按 source:file:line 逐条列账（下方 U1-U3，非总数）；
> 反控为 vitest load 钩注入（产品磁盘零写入）。

## 交付物

- 12 个新专属测试文件（`*.kimi-r1.test.ts`，91 测试；零 unsafe cast/`@ts-expect-error`/
  skip/timeout 扩大/真实数据写入）。pal-extract 5 件 38 测试，migrate 7 件 53 测试。
- 反控驱动：`docs/ops/evidence/coverage85-kimi-extract-migrate-r1-mutants.mjs`（6 针三态，
  load 钩注入、marker 证明、唯一 fullName 锁、businessRed 纯 AssertionError 校验）。
- 逐条账生成器：`docs/ops/evidence/gen-kimi-r1-ledger.mjs`（126 边 U1-U3 段幂等重生成）。
- 机账：`coverage85-kimi-extract-migrate-r1/evidence.json`；反控机账
  `coverage85-kimi-extract-migrate-r1/mutation-receipt.json`；反控原始 stdout/stderr
  `coverage85-kimi-extract-migrate-r1/*.txt`（control×2 + red/green×6）。

## 度量（fast profile，与官方 runner 同参数同环境变量）

| 指标 | 基线（baseline.fast.json） | 终态 | Δ |
|---|---|---|---|
| **pal-extract branches** | 371/539 (68.83%) | **413/539 (76.62%)** | **+42** |
| pal-extract statements | 957/1492 | 1024/1492 | +67 |
| pal-extract functions | 106/140 | 109/140 | +3 |
| pal-extract lines | 850/1316 | 899/1316 | +49 |
| **migrate branches** | 1503/1787 (84.11%) | **1594/1787 (89.20%)** | **+91** |
| migrate statements | 2146/2592 | 2290/2592 | +144 |
| migrate functions | 362/410 | 379/410 | +17 |
| migrate lines | 1870/2266 | 2007/2266 | +137 |

逐卡面合同文件 branch 闭合（fast lcov 一手测量）：

| 文件 | 基线已覆盖 | 终态已覆盖 | Δ |
|---|---|---|---|
| pal-extract src/events/slice.ts | 62/83 | 81/83 | +19 |
| pal-extract src/events/disasm.ts | 47/54 | 48/54 | +1 |
| pal-extract src/events/roundtrip.ts | 0/4 | 3/4 | +3 |
| pal-extract 散落模块（map/palette/word/bdf/asset-manifest/sprite/parsers×9） | — | — | +19 |
| migrate src/pal-assets.ts | 147/269 | 196/269 | +49 |
| migrate src/migration-merge.ts | 216/241 | 227/241 | +11 |
| migrate src/migration-transaction.ts | 177/184 | 183/184 | +6 |
| migrate src/pal-item-scheme-labels.ts | 68/84 | 83/84 | +15 |
| migrate src/pal-world-sprite-registry.ts | 55/67 | 65/67 | +10 |
| 四个子进程脚本（cli.ts/extract-videos/bake-assets/migrate-content） | 0/150 | 不变 | ledger |

结论：**migrate 89.20% 过 85% 门**；**pal-extract 走 ledger 收口** —— 85%（459 边）在卡面
约束下算术不可达（cli.ts 93 + extract-videos.ts 12 只能经真实数据写入或子进程到达，
覆盖零归因，见 U1/U2），可及边已 100% 闭合：539 − 126 = 413 = 实达数，剩余 126 边
（93+12+21）每条均有一手不可达证明（见下账）。

## admitted 合同账（源锚/caller/合成输入/oracle → 测试文件）

完整逐测试映射见任务卡「合同逐项记录」。域摘要：

- `pal-extract/src/cli.ts:167-702`（公开 CLI 子进程）：ROUND-TRIP FAILED + **exit 2**、
  M.MSG/WORD.DAT 缺失 ENOENT+exit 1、MKF 头过短/首偏移非对齐精确诊断+exit 1、
  OUT 清理与 `videos/` PRESERVE 策略、argv 不消费真值 → `cli-error-exits.kimi-r1.test.ts`。
- `events/slice.ts:30-193`（typed `Command[]` 合成）：具名 fall-through、EO 越界/
  trigger=0/auto>0、end reset 缺 resetTo、globalEntries 越界/去重/end 变体/goto/
  字符串扫描 → `slice.kimi-r1.test.ts`（8）。
- `events/disasm.ts`（合成 8B 指令流 + bytes/sha256 锚）：setPalette case、具名未结构化
  opcode 落 raw 保字节、表外 0x0100、条件跳/随机跳标签、entryIps 双向、合法 round-trip
  → `disasm.kimi-r1.test.ts`（5）；`events/roundtrip.ts` ok/差异精确 →
  `roundtrip.kimi-r1.test.ts`（2）。
- 散落守卫（map/palette/word/bdf/asset-manifest/sprite/enemies/items/rgm/spells/
  stores/battle-fields/data-misc/enemy-teams）→ `misc-guards.kimi-r1.test.ts`（16）。
- `migrate/src/pal-assets.ts:339-955`（mkdtemp 合成 extracted 树；effect/RNG 阶段经
  公开 `loadPalAssets` 实跑）：缺失/重复/路径/hash/bytes/类别分派/可选必需/失败预检
  → `pal-assets-loaders.kimi-r1.test.ts`（23）+ `pal-assets-materialize.kimi-r1.test.ts`（2）。
- `migration-merge.ts:124-380`（三方 JSON 合成）：orderedIds 链式锚定双方向（含 ours
  重排使 `lastInserted.get` 命中）、mergePages 尾短、base 缺失 mode 分派全家
  → `migration-merge.kimi-r1.test.ts`（10）。
- `migration-transaction.ts:108-306`（mkdtemp repo）：journal version/id/previousHash/
  precondition 三态、cleanup 容忍、commit 三守卫 → `migration-transaction.kimi-r1.test.ts`（6）。
- `pal-item-scheme-labels.ts`：walkCommands 容器全家、flowEdges 三方向、节点重复、
  order+id 不唯一 → `pal-item-scheme-labels.kimi-r1.test.ts`（4）。
- `pal-world-sprite-registry.ts`：layoutKey loop±ticks、entity 缺帧回退、tie-break
  三级、同键去重、二次 ensure 幂等 → `pal-world-sprite-registry.kimi-r1.test.ts`（5）。
- `scripts/migrate-content.mts:46-149` 命令面（公开脚本子进程）：--help exit 0、
  未知参数精确诊断+exit 1、`--write --bogus` 同拒绝 → `migrate-content-script.kimi-r1.test.ts`（3）。

## 不可达/防御臂账（一手证明）

### U1 · pal-extract src/cli.ts 93 边（逐条）

组级条件（适用全表）：cli.ts 无导出、import 即执行 `main()`；`REPO_ROOT/RAW/OUT` 由
`import.meta.url` 派生真实仓库常量（cli.ts:73-77）；main 首步清理真实
`data/extracted`（:189-197）并逐阶段写盘。唯一公开入口 `pnpm extract`（tsx 子进程）；
子进程执行零覆盖归因（`coverage85-kimi-extract-migrate-r1/subprocess-coverage-probe.txt`，
non-zero DA/BRDA entries: 0）；进程内 import = 清理+覆写真实 extracted（卡面禁止）；
mkdtemp 副本路径在 coverage.include（`src/**/*.ts`）之外不计入。
组级反例：若未来 vitest v8 归并子进程 NODE_V8_COVERAGE，或 cli.ts 拆出可注入
RAW/OUT 的公开 runner 导出，全表臂即合法可达，本账失效须重测。

| source:file:line | 分支条件 | 公开入口 | 不可构造条件 | 反例 |
| --- | --- | --- | --- | --- |
| src/cli.ts:167 | `loadMkfChunk` default `decompress=false` 形参默认臂 | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属模块级 helper段 | 同 L01 组级反例 |
| src/cli.ts:170 | `decompress ? decompressYj2(chunk) : chunk` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属模块级 helper段 | 同 L01 组级反例 |
| src/cli.ts:170 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属模块级 helper段 | 同 L01 组级反例 |
| src/cli.ts:174 | `if (a.byteLength !== b.byteLength) return false`（equalBytes） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属模块级 helper段 | 同 L01 组级反例 |
| src/cli.ts:174 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属模块级 helper段 | 同 L01 组级反例 |
| src/cli.ts:176 | `if (a[i] !== b[i]) return false`（equalBytes） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属模块级 helper段 | 同 L01 组级反例 |
| src/cli.ts:176 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属模块级 helper段 | 同 L01 组级反例 |
| src/cli.ts:189 | `if (!OUT.endsWith(sep + "data" + sep + "extracted")) throw` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属OUT 清理段 | 同 L01 组级反例 |
| src/cli.ts:189 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属OUT 清理段 | 同 L01 组级反例 |
| src/cli.ts:195 | `if (PRESERVE.has(entry)) continue`（videos/ 保留） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属OUT 清理段 | 同 L01 组级反例 |
| src/cli.ts:195 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属OUT 清理段 | 同 L01 组级反例 |
| src/cli.ts:204 | `existsSync(SYMBOLS_PATH) ? JSON.parse(…) : {}` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属共享数据段 | 同 L01 组级反例 |
| src/cli.ts:204 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属共享数据段 | 同 L01 组级反例 |
| src/cli.ts:227 | `if (it.scriptOnUse > 0) globalScriptEntries.push` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:227 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:228 | `if (it.scriptOnEquip > 0) push` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:228 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:229 | `if (it.scriptOnThrow > 0) push` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:229 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:230 | `if (it.scriptDesc > 0) push` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:230 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:233 | `if (sp.scriptOnUse > 0) push` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:233 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:234 | `if (sp.scriptOnSuccess > 0) push` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:234 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:235 | `if (sp.scriptDesc > 0) push` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:235 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:238 | `if (eo.scriptOnTurnStart > 0) push` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:238 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:239 | `if (eo.scriptOnBattleEnd > 0) push` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:239 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:240 | `if (eo.scriptOnReady > 0) push` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:240 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:243 | `if (op.scriptOnFriendDeath > 0) push` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:243 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:244 | `if (op.scriptOnDying > 0) push` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:244 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:249 | `if (sc.scriptOnEnter > 0) entryIps.push` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:249 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:250 | `if (sc.scriptOnTeleport > 0) entryIps.push` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:250 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:253 | `if (eo.triggerScript > 0) entryIps.push` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:253 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:254 | `if (eo.autoScript > 0) entryIps.push` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:254 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属entryIps 收集段 | 同 L01 组级反例 |
| src/cli.ts:264 | `verify.byteLength !== sss.bytecode.byteLength ||`（round-trip 门） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属round-trip 门段 | 同 L01 组级反例 |
| src/cli.ts:264 | `!equalBytes(verify, sss.bytecode)`（同门第二条件） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属round-trip 门段 | 同 L01 组级反例 |
| src/cli.ts:264 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属round-trip 门段 | 同 L01 组级反例 |
| src/cli.ts:264 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属round-trip 门段 | 同 L01 组级反例 |
| src/cli.ts:462 | `if (!portrait) continue`（RGM 空头像 skip） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属RGM.MKF段 | 同 L01 组级反例 |
| src/cli.ts:462 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属RGM.MKF段 | 同 L01 组级反例 |
| src/cli.ts:491 | `if (!icon) continue`（BALL 空图标 skip） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属BALL.MKF段 | 同 L01 组级反例 |
| src/cli.ts:491 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属BALL.MKF段 | 同 L01 组级反例 |
| src/cli.ts:523 | `decompressed.byteLength < 2 ? [] : parseSpriteChunk(…)` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属FIRE.MKF段 | 同 L01 组级反例 |
| src/cli.ts:523 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属FIRE.MKF段 | 同 L01 组级反例 |
| src/cli.ts:524 | `if (frames.length > 0) writeBinary(…)` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属FIRE.MKF段 | 同 L01 组级反例 |
| src/cli.ts:524 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属FIRE.MKF段 | 同 L01 组级反例 |
| src/cli.ts:549 | `if (buf.byteLength === 0) continue`（空音效 skip） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属SOUNDS.MKF段 | 同 L01 组级反例 |
| src/cli.ts:549 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属SOUNDS.MKF段 | 同 L01 组级反例 |
| src/cli.ts:566 | `if (lower.endsWith('.mid'))` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属Musics/段 | 同 L01 组级反例 |
| src/cli.ts:566 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属Musics/段 | 同 L01 组级反例 |
| src/cli.ts:573 | `if (Number.isFinite(num)) midiNums.push(num)` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属Musics/段 | 同 L01 组级反例 |
| src/cli.ts:573 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属Musics/段 | 同 L01 组级反例 |
| src/cli.ts:574 | `else if (lower.endsWith('.ogg'))` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属Musics/段 | 同 L01 组级反例 |
| src/cli.ts:574 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属Musics/段 | 同 L01 组级反例 |
| src/cli.ts:604 | `if (raw.byteLength === 0) continue`（splash 空 chunk） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属splash/FBP段 | 同 L01 组级反例 |
| src/cli.ts:604 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属splash/FBP段 | 同 L01 组级反例 |
| src/cli.ts:611 | `if (pixels.byteLength !== 320 * 200) warn+continue` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属splash/FBP段 | 同 L01 组级反例 |
| src/cli.ts:611 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属splash/FBP段 | 同 L01 组级反例 |
| src/cli.ts:640 | `if (!scene) continue`（uniqueMapNums 收集） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属地图收集段 | 同 L01 组级反例 |
| src/cli.ts:640 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属地图收集段 | 同 L01 组级反例 |
| src/cli.ts:641 | `if (scene.mapNum >= mapChunkCount) warn+continue` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属地图收集段 | 同 L01 组级反例 |
| src/cli.ts:641 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属地图收集段 | 同 L01 组级反例 |
| src/cli.ts:653 | `if (uniqueMapNums.has(m)) continue` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属地图收集段 | 同 L01 组级反例 |
| src/cli.ts:653 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属地图收集段 | 同 L01 组级反例 |
| src/cli.ts:654 | `if (readChunk(mapMkf, m).byteLength > 0) uniqueMapNums.add(m)` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属地图收集段 | 同 L01 组级反例 |
| src/cli.ts:654 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属地图收集段 | 同 L01 组级反例 |
| src/cli.ts:663 | `if (rawMapChunk.byteLength === 0) warn+continue` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属地图收集段 | 同 L01 组级反例 |
| src/cli.ts:663 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属地图收集段 | 同 L01 组级反例 |
| src/cli.ts:702 | `if (!s) continue`（scene dump） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属scene dump段 | 同 L01 组级反例 |
| src/cli.ts:702 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属scene dump段 | 同 L01 组级反例 |
| src/cli.ts:727 | `if (palBuf.byteLength < 768) continue`（非调色板 chunk） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属PAT.MKF段 | 同 L01 组级反例 |
| src/cli.ts:727 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属PAT.MKF段 | 同 L01 组级反例 |
| src/cli.ts:750 | `if (raw.byteLength === 0) continue`（MGO 空 chunk） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属MGO.MKF段 | 同 L01 组级反例 |
| src/cli.ts:750 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属MGO.MKF段 | 同 L01 组级反例 |
| src/cli.ts:797 | `if (raw.byteLength === 0) continue`（F/ABC 空 chunk） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属F/ABC.MKF段 | 同 L01 组级反例 |
| src/cli.ts:797 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属F/ABC.MKF段 | 同 L01 组级反例 |
| src/cli.ts:839 | `if (raw.byteLength === 0) continue`（FBP 背景空 chunk） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属FBP.MKF 背景段 | 同 L01 组级反例 |
| src/cli.ts:839 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属FBP.MKF 背景段 | 同 L01 组级反例 |
| src/cli.ts:847 | `if (pixels.byteLength !== 320 * 200) warn+continue` | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属FBP.MKF 背景段 | 同 L01 组级反例 |
| src/cli.ts:847 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属FBP.MKF 背景段 | 同 L01 组级反例 |
| src/cli.ts:872 | `if (existsSync(BDF_PATH))`（BDF 缺失 warn 臂） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属BDF 字形段 | 同 L01 组级反例 |
| src/cli.ts:872 | 同上（另一方向） | `pnpm extract`（tsx 子进程） | import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属BDF 字形段 | 同 L01 组级反例 |

### U2 · pal-extract scripts/extract-videos.ts 12 边（逐条）

组级条件：同 L01 归因；另需 ffmpeg 与真实 `data/raw/{1-6}.avi`，写真实
`data/extracted/videos`（extract-videos.ts:30-45/118-131）；无导出、import 即跑 main。

| source:file:line | 分支条件 | 公开入口 | 不可构造条件 | 反例 |
| --- | --- | --- | --- | --- |
| scripts/extract-videos.ts:52 | `if (!existsSync(rawPath)) throw`（AVI missing） | `pnpm extract:videos`（tsx 子进程） | 需 ffmpeg+真实 avi+写真实 videos/；子进程零归因；import 即于真实仓库执行 | 同 L01 组级反例 |
| scripts/extract-videos.ts:52 | 同上（另一方向） | `pnpm extract:videos`（tsx 子进程） | 需 ffmpeg+真实 avi+写真实 videos/；子进程零归因；import 即于真实仓库执行 | 同 L01 组级反例 |
| scripts/extract-videos.ts:57 | `if (existsSync(mp4Path))`（增量 skip 判定） | `pnpm extract:videos`（tsx 子进程） | 需 ffmpeg+真实 avi+写真实 videos/；子进程零归因；import 即于真实仓库执行 | 同 L01 组级反例 |
| scripts/extract-videos.ts:57 | 同上（另一方向） | `pnpm extract:videos`（tsx 子进程） | 需 ffmpeg+真实 avi+写真实 videos/；子进程零归因；import 即于真实仓库执行 | 同 L01 组级反例 |
| scripts/extract-videos.ts:59 | `mp4Stat.mtimeMs >= rawStat.mtimeMs &&` | `pnpm extract:videos`（tsx 子进程） | 需 ffmpeg+真实 avi+写真实 videos/；子进程零归因；import 即于真实仓库执行 | 同 L01 组级反例 |
| scripts/extract-videos.ts:59 | 同上（另一方向） | `pnpm extract:videos`（tsx 子进程） | 需 ffmpeg+真实 avi+写真实 videos/；子进程零归因；import 即于真实仓库执行 | 同 L01 组级反例 |
| scripts/extract-videos.ts:59 | `mp4Stat.size > 0`（同判定第三条件） | `pnpm extract:videos`（tsx 子进程） | 需 ffmpeg+真实 avi+写真实 videos/；子进程零归因；import 即于真实仓库执行 | 同 L01 组级反例 |
| scripts/extract-videos.ts:59 | 同上（另一方向） | `pnpm extract:videos`（tsx 子进程） | 需 ffmpeg+真实 avi+写真实 videos/；子进程零归因；import 即于真实仓库执行 | 同 L01 组级反例 |
| scripts/extract-videos.ts:93 | `if (mp4Stat.size === 0) throw`（ffmpeg 空输出） | `pnpm extract:videos`（tsx 子进程） | 需 ffmpeg+真实 avi+写真实 videos/；子进程零归因；import 即于真实仓库执行 | 同 L01 组级反例 |
| scripts/extract-videos.ts:93 | 同上（另一方向） | `pnpm extract:videos`（tsx 子进程） | 需 ffmpeg+真实 avi+写真实 videos/；子进程零归因；import 即于真实仓库执行 | 同 L01 组级反例 |
| scripts/extract-videos.ts:116 | `if (r.skipped) … else …`（日志分派） | `pnpm extract:videos`（tsx 子进程） | 需 ffmpeg+真实 avi+写真实 videos/；子进程零归因；import 即于真实仓库执行 | 同 L01 组级反例 |
| scripts/extract-videos.ts:116 | 同上（另一方向） | `pnpm extract:videos`（tsx 子进程） | 需 ffmpeg+真实 avi+写真实 videos/；子进程零归因；import 即于真实仓库执行 | 同 L01 组级反例 |

### U3 · pal-extract 类型防御/无生产者/政策未定 21 边（逐条）

| source:file:line | 分支条件 | 公开入口 | 不可构造条件 | 反例 |
| --- | --- | --- | --- | --- |
| src/events/annotate.ts:43 | `s.spell?.[String(id)]`（symbols 优先臂） | annotate()（导出；caller=cli.ts:270） | RULES 的 spellId 无任何 Command 变体携带（shared/events.ts union 枚举），唯一 caller 只喂 disasm 产物，无生产者 | 若 disasm 未来产出带 spellId 的具名命令，本臂即合法可测，本行失效 |
| src/events/annotate.ts:43 | `?? wordAt(w.spells, id, SPELL_OBJ_START)`（word 回退臂） | annotate()（同上） | 同上无生产者 | 同上 |
| src/events/annotate.ts:48 | `s.person?.[String(id)]`（symbols 优先臂） | annotate()（同上） | personId 无生产者（同上游枚举） | 同上（personId 具名化时） |
| src/events/annotate.ts:48 | `?? wordAt(w.persons, id, PERSON_OBJ_START)`（word 回退臂） | annotate()（同上） | 同上无生产者 | 同上 |
| src/events/annotate.ts:53 | `s.enemy?.[String(id)]`（symbols 优先臂） | annotate()（同上） | enemyId 无生产者（同上游枚举） | 同上（enemyId 具名化时） |
| src/events/annotate.ts:53 | `?? wordAt(w.enemies, id, ENEMY_OBJ_START)`（word 回退臂） | annotate()（同上） | 同上无生产者 | 同上 |
| src/events/disasm.ts:225 | `operands[0] ?? 0`（emitRawFallback） | disasm()（导出；caller=cli.ts:260、roundtrip.ts:26） | emitRawFallback 的唯一调用点 emitCommand 恒传定长三元组 [o0,o1,o2]（noUncheckedIndexedAccess 类型防御） | 若 emitCommand 改传变长 operands（无当前 caller 形状），本臂可测 |
| src/events/disasm.ts:225 | `operands[1] ?? 0`（同上） | disasm()（同上） | 同上定长三元组 | 同上 |
| src/events/disasm.ts:225 | `operands[2] ?? 0`（同上） | disasm()（同上） | 同上定长三元组 | 同上 |
| src/events/disasm.ts:235 | `found === undefined`（findOpcodeByName `||` 左臂） | disasm()（同上） | 能走到这里的 verb 在 opcodeTable 均单映射（startBattle/waitFrames/setObjectXY/setScriptEntry/setObjectState/playMusic/playSfx/ifItemLess 枚举），循环一次即出，左臂恒真 | 若某 verb 在表内挂多 opcode 且走 raw 回退（当前仅 end/goto 系多挂且均有专属 case），本臂可测 |
| src/events/disasm.ts:235 | `n < found`（`||` 右臂） | disasm()（同上） | 同上：单映射使右臂永不求值 | 同上 |
| src/events/disasm.ts:238 | `found ?? 0` | disasm()（同上） | verb 必在表内（def 来自同一 opcodeTable），found 恒有值 | 若 opcodeTable 与 emitCommand case 失配（def.name 不在表），本臂可测——即产品 bug，无合法输入 |
| src/events/recompile.ts:34 | `c.resetTo ?? 0` | recompile()（导出；caller=cli.ts:263、roundtrip.ts:27） | 真实 caller（disasm 产物）reset 时恒带 resetTo；R04/R05 评审明确缺省默认政策未定、不为无消费行为钉绿测 | 若上游评审改定缺省政策且有真实消费者，本臂须补绿测，本行失效 |
| src/events/recompile.ts:35 | `c.idleFrames ?? 0` | recompile()（同上） | 同上（reset 时恒带 idleFrames） | 同上 |
| src/events/recompile.ts:41 | `labels.get(c.to) ?? 0`（dangling label 写 0） | recompile()（同上） | disasm 的 goto 目标若出界则 pass-2 不打标，但 R04/R05 已裁决缺 label 政策未定、不为该默认钉合同 | 同上 |
| src/events/recompile.ts:42 | `c.frameDelay ?? 0` | recompile()（同上） | disasm emitGoto 恒产 frameDelay，真实 caller 无缺失形状 | 同上 |
| src/events/slice.ts:35 | `(c.operands[0] ?? 0)`（0xA2 随机跳） | sliceByScene()（导出；caller=cli.ts:271） | RawCommand.operands 为定长三元组类型，typed/真实 disasm 输入不可缺元素 | 若 RawCommand 类型放宽为变长数组（schema 变更），本臂可测 |
| src/events/slice.ts:193 | `(sceneCount[i] ?? 0) > 1`（shared predicate） | sliceByScene()（同上） | sceneCount 由 commands.map 构建、与 commands 同长，collectAndRewrite 的 i 恒 < commands.length | 若 collectAndRewrite 改为越界回调（无当前调用形状），本臂可测 |
| src/events/roundtrip.ts:29 | `if (back.byteLength !== sss.bytecode.byteLength)` | roundtripCheck()（导出；fast 排除的 roundtrip.test.ts 与本卡 roundtrip.kimi-r1 为 caller） | disasm 每 8B 恒产 1 命令、recompile 每命令恒产 8B，byteLength 结构相等 | 若 disasm 改为非 1:1 产命令（设计变更），本臂可测 |
| src/resources/scene.ts:52 | `if (!scene) continue`（dumpAllEventObjects） | dumpAllEventObjects()（导出；caller=cli.ts:713） | 循环上界为 scenes.length 且数组 dense（parseSss 固定 8B 记录产出），越界无源 | 若 scenes 来源改为稀疏/ragged 输入（无当前 caller 形状），本臂可测 |
| src/resources/parsers/player-roles.ts:211 | `if (cursor !== PLAYER_ROLES_BYTES) throw` | parsePlayerRoles()（导出；caller=cli.ts:346） | 入函数先验 900B 长度，cursor 全程固定步进（PLAYER_FIELD_SIZE 常量），终值恒等 | 若字段序/步进改动而 sizeof 断言未同步（产品 bug），本臂可测——无合法输入 |

### U4-U15 · migrate 侧（原 U9-U20 重编号）

| # | 源锚 | 判定 | 一手证据 |
|---|---|---|---|
| U4 | migrate scripts/bake-assets.mts 25 边 | 无导出、顶层即读写 import.meta.url 派生真实仓库（写真实 reforge engine-chrome + 冻结基线校验）；唯一公开入口 `pnpm bake`（tsx 子进程→U1 同款零归因）；进程内 import=真实写入。 | bake-assets.mts:13-16/69-197。 |
| U5 | migrate scripts/migrate-content.mts 20 边 | dry-run 只读但只能经子进程到达（零归因）；进程内 import 以真实 repo 跑 publication 且 dry-run 末尾 `process.exit(0)` 杀 fork worker；--write 写真实 projects/pal。命令面已由子进程合同测试钉住。 | migrate-content.mts:35/104-107/109-162。 |
| U6 | migrate migration-merge.ts:124add-add臂/137-139/184-200/242/257/292/326（14） | 逐条：base 缺失且单侧缺失被 118/119 same() 吸收；mergeObject 调用点已保证三侧对象；primitiveIdentityMaps 的 primitive 形参全调用点恒 false；anchor 命中⇒rootAnchor 同区间必命中；flatMap 假臂被 orderedIds live() 过滤；稀疏数组 some() 跳过洞、显式 undefined 需 MigrationJson 不允许的 present+undefined。 | migration-merge.kimi-r1.test.ts 头注逐条 + migration-merge.ts:111-134/167-200/209-245/288-295/325-329。 |
| U7 | migrate migration-transaction.ts:198（1） | 两个 manifest 操作不可构造：manifest scope 钉死固定目标、其它 scope 禁止该目标、重复目标先行拒绝（:120/:296）。 | migration-transaction.ts:82-102/120/193-206/296。 |
| U8 | migrate pal-item-scheme-labels.ts:314（1） | roots 只来自 args.items 自身 id 的 visitRoot，grouped 键必是 itemsById 成员。 | pal-item-scheme-labels.ts:250-282/309-314。 |
| U9 | migrate pal-world-sprite-registry.ts:92/109（2） | overlay 冻结常量无重复（产品不变量）；sceneLayout 只在有场景证据时求值，[0] 恒在。 | pal-world-sprite-registry.ts:89-93/96-109；pal-world-sprite-layouts.ts:116。 |
| U10 | migrate pal-assets.ts:339/412/533/1059（5） | PNG.sync.read 恒产出 w*h*4 data；face/role 冻结常量闭包；parseSpriteChunkStrict 对 declaredCount<=0 先抛「sprite chunk 不含帧」。 | shared/rle.ts:189-195 源码。 |
| U11 | migrate pal-assets.ts:530/546/559-564/705hit/707hit/716hit（13） | effect/RNG 阶段在 loadPalAssets 全链上游（frameAnimations 需合法 YJ2 压缩 RNG 帧使 decode 出帧）通过后方可到达；唯一合法 YJ2 Huffman 编码器是 pal-extract 专属 fixture（src/__tests__/glm-q/yj2-encoder.ts，有 r10 回引 bug 史），migrate 跨包引用越界、自造压缩流非法；真实数据路径由 full profile 覆盖。 | 探针实跑：frameAnimations 全零帧 manifest 在 encodeFrameSequenceSync 边界抛「TPFS.encode.frames: 期望非空数组」（raw 存证于本目录 control-migrate.stdout.txt 相邻证据）；yj2-encoder.ts:1-18 头注。 |
| U12 | migrate pal-assets.ts:793（1） | shared parseWorldSpriteChunk 对全 sentinel 输入先抛「sprite chunk legacy 尾槽前不含有效帧」。 | 一手实探：gzip([01 00 00 00]) 合成输入实抛该文案（本测试开发期实跑记录）。 |
| U13 | migrate pal-assets.ts:819hit/821-829/940hit/941-955（22） | 字节/帧数/坏尾/digest 等值断言是真实数据冻结常量，合成输入不可构造等值；可达漂移臂 :819/:940 已覆盖。 | pal-assets.ts:819-833/940-959 冻结常量表。 |
| U14 | migrate pal-assets.ts:1050-1101（26） | tileset/catalog/roles 段被 world/battle 冻结哨兵（:825/:955）阻断合成到达；真实数据路径由 full profile 覆盖。 | pal-assets.ts:1049-1102 调用序。 |
| U15 | migrate pal-assets.ts:1148/1253（2） | 退役路径越界：validateAssetCatalog ownedPrefix+validateProjectRelativePath 先行拒绝全部触发形态；write-loop `!target`：precheck 循环先行拒绝缺失目标。 | content/asset.ts:111-124/152-161；pal-assets.ts:1224-1240→1251-1253。 |

migrate 非卡面文件 86 边（pal-authored-overlays/pal-casualty-scripts/project-map-converter/
pal-item-message-source/pal-store-boundary/pal-current-publication/pal-world-sprite-layouts/
migration-project-io/pal-world-sprite-semantic-alias/migration-plan/migration-write-plan/
project-map-audit/bake-indexed-rgba/migration-baseline/pal-content-supply）不在本卡合同点
清单，按越界不取原则留待对应 wave/卡。

## 反控（6 针三态；驱动 `coverage85-kimi-extract-migrate-r1-mutants.mjs`，load 钩注入、磁盘产品零写入）

机账：`coverage85-kimi-extract-migrate-r1/mutation-receipt.json`；原始 stdout/stderr：
`coverage85-kimi-extract-migrate-r1/{control-*,m*-red,m*-green}.{stdout,stderr}.txt`。
统一 env：`NODE_DISABLE_COMPILE_CACHE=1`、`NODE_COMPILE_CACHE` 删除
（scripts/coverage/environment.mjs `preciseCoverageEnvironment`）；spawnError 全 null、
signal 全 null；每针 command/cwd 见机账（`pnpm exec vitest run --config <mkdtemp>/…config.mjs`，
cwd=对应包根）。

| # | 注入点 | 执行身份（file × fullName） | 唯一 AssertionError | 三态 sha256（original→mutant→restored） | red/green exit |
|---|---|---|---|---|---|
| M1 | pal-extract events/slice.ts `Math.max(n, 2)`→`Math.max(n, 1)` | slice.kimi-r1.test.ts × `…globalEntries BFS 残余分支 end advance：global BFS 收 i+1 续行` | `expected [] to deeply equal [ { op: 'end', advance: true }, …(1) ]` | `6cb5a4f08c26…`→`4712f303ae8c…`→`6cb5a4f08c26…` | 1 / 0 |
| M2 | pal-extract events/recompile.ts advance opcode `0x0001`→`0x0000` | roundtrip.kimi-r1.test.ts × `…合成输入 合法事件 round-trip：ok=true 且尺寸相等（合成 bytes/hash 锚）` | `expected { ok: false, originalSize: 16, …(4) } to deeply equal { ok: true, originalSize: 16, …(1) }` | `70a5ac15d498…`→`2e15d91649eb…`→`70a5ac15d498…` | 1 / 0 |
| M3 | pal-extract events/roundtrip.ts `!==`→`===` | roundtrip.kimi-r1.test.ts × `…合成输入 内容不一致：ok=false 报告首个差异 offset/instruction/opcode` | `expected { ok: false, originalSize: 16, …(4) } to deeply equal { ok: false, originalSize: 16, …(4) }`（firstDiffOffset 4→0） | `06e63ab10477…`→`c558be5516dc…`→`06e63ab10477…` | 1 / 0 |
| M4 | migrate migration-transaction.ts 删除 `candidate.version !== 2 \|\|` 子句 | migration-transaction.kimi-r1.test.ts × `…journal 校验残余分支 version≠2 与 id 非 16-hex 均拒绝（不恢复、不清理）` | `expected [Function] to throw an error` | `f22787611d1e…`→`21bbd17811b3…`→`f22787611d1e…` | 1 / 0 |
| M5 | migrate migration-merge.ts `'delete-modify' : 'add-add'` 互换 | migration-merge.kimi-r1.test.ts × `…orderedIds 链式锚定 ours 全改 + theirs 删中段：后段插入锚定前段插入（?? candidate 回退方向）` | `expected [ [ '/@string:x', 'add-add' ], …(3) ] to deeply equal [ …(4) ]` | `e1d3a877f72e…`→`d41462e07869…`→`e1d3a877f72e…` | 1 / 0 |
| M6 | migrate pal-assets.ts gzip 魔数 `\|\|`→`&&` | pal-assets-loaders.kimi-r1.test.ts × `…loadPalWorldSprites 残余守卫 sprite 1 非 gzip 精确拒绝（首字节合法、次字节非法的单轴输入）` | `expected [Function] to throw error including 'PAL 大世界精灵 1 必须是 gzip RLE' but got 'incorrect header check'` | `131b101ef065…`→`351d18cf0802…`→`131b101ef065…` | 1 / 0 |

- 判别力注解：M6 的 r1 输入双字节同坏无法分 `||`/`&&`，已把在测合同强化为单轴
  （首字节合法、次字节非法）后重取证——在测合同判别力因此提升（测试少而精口径）。
- 注入真实性：每针 marker 文件断言 `{id, target}` 写入（load 钩确实执行）；恢复 =
  磁盘文件从未被改写，逐针 sha256 对账 + 全部运行后六产品文件 hash 集合相等。

## 验证（干净 worktree，git worktree add 于本候选 HEAD 实跑）

- 定向：pal-extract 5 文件 38/38 绿、migrate 7 文件 53/53 绿（干净 worktree 实跑）。
- 全量 fast 同参覆盖：pal-extract 264/264 绿 exit 0、migrate 654/654 绿 exit 0。
- typecheck：`pnpm --filter @type-pal/pal-extract run typecheck` 与 migrate 各 exit 0。
- lint：`pnpm lint` PASS — 3154 files，0 errors / 0 warnings / 0 infos。
- docs：`pnpm check:docs` PASS + `testing docs` PASS（各 0 issues）。
- 反控：`node docs/ops/evidence/coverage85-kimi-extract-migrate-r1-mutants.mjs` 6/6 detected。
- mkdtemp 清理：本卡全部前缀（kimi-r1-cli-/mgtx-/palassets-/palmat-/mutants-）残留 0；
  afterAll/afterEach/finally 只清本次目录；证据全部在 tracked 路径（非 ignored）。
- 产品零改动：`git diff codex/coverage-85-dispatch-r1 -- packages/**/!(kimi-r1.test)*`
  为空；六枚反控目标文件 sha256 与原始一致。
- 工作区注记：检出期存在并发非卡改动（content/editor/reforge/projects/scripts/e2e），
  不在本卡 diff 内、未提交、不影响 migrate/pal-extract 覆盖口径（不在其 include 范围）。
