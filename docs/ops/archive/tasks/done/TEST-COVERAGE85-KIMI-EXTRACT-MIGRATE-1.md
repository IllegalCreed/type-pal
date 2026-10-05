# TEST-COVERAGE85-KIMI-EXTRACT-MIGRATE-1 — extract/migrate pipeline branch-contract closure

Status: done
Owner: Kimi
Reviewer: Codex
Base: `76475c01cfbbbd9a8cd52b1cb866d3b21ba6908d`
Branch: `codex/coverage85-kimi-extract-migrate-r1`
Capability: test-quality / coverage branch closure

## Codex build allowed

当前 fast 基线 pal-extract 为 statements `957/1492`、branches `371/539`（68.83%），migrate
为 statements `2146/2592`、branches `1503/1787`（84.11%）。优先闭合真实 CLI/解析/写计划
合同；达到各自 85% 约需 pal-extract 88、migrate 16 个既有 branch edges。不得把数字当测试
例数或反控配额，也不得为覆盖率重写迁移产物、真实数据或产品 schema。

## 独占范围与明确合同点

只允许写 `packages/pal-extract`、`packages/migrate` 的新专属测试、`mkdtemp` 合成输入、
必要证据；不得改产品、旧测试、共享配置、baseline、`projects/pal` 真实数据或其它卡目录。

- `packages/pal-extract/src/cli.ts:167-702`：命令分类、参数缺失/非法、输入文件不存在或
  格式错误、输出目录/覆盖策略、成功退出与错误退出；必须通过公开 CLI 子进程或公开 runner，
  每个失败断言精确到诊断/exit code，不能只断言 throw。
- `src/events/slice.ts:30-193`、`events/disasm.ts`、`events/annotate.ts`、`events/recompile.ts`：
  空事件、边界 offset/length、未知 opcode、截断/损坏 payload、round-trip 合法事件；用合成
  二进制并保留原始 bytes/hash，不能触碰真实游戏数据。
- `packages/migrate/src/pal-assets.ts:339-955`：资产清单缺失/重复、路径归一化、hash/bytes
  校验、资源类别分派、可选/必需资产和失败回滚；断言真实 resolver/plan 输出，不 mock 核心
  asset pipeline。
- `src/migration-merge.ts:124-380`、`src/migration-transaction.ts:108-306`、
  `scripts/bake-assets.mts:40-191`、`scripts/migrate-content.mts:46-149`、
  `src/pal-item-scheme-labels.ts`/`pal-world-sprite-registry.ts`：事务 apply/rollback、冲突
  合并、dry-run 与写入隔离、标签/registry 合法与拒绝路径；所有写入只能进本次 mkdtemp，
  `finally` 清理本次目录，不得全局 prune 或修改真实项目。

如某脚本 branch 只能由未公开宿主条件到达，必须给出源码条件、公开入口调查和 blocked/unreachable
证明；不能用 process.env 私有开关、静态跳转或业务核心 mock 制造覆盖。

## 验收交付

合同逐项记录源锚、caller、合法合成输入、输出/错误 oracle、旧 fullName 排重和 file hash。
反控按真实变异点逐项提供原始/变异/恢复三态、唯一指定业务红、执行身份、exit code 和最终 hash；
拒收零执行、只查 exit、额外 collection/runtime 错、pending/skip、未处理 signal/spawn 失败。
禁止 `as unknown as`、`@ts-expect-error`、ignore/skip、扩大 timeout、真实数据写入或降低规则。

回执必须包含 fresh Vitest/CLI JSON、branch delta、mkdtemp 清理证明、unreachable ledger，以及
定向/相邻测试、typecheck、lint、docs/diff。只有两个 package 的真实分支合同达到 85% 或剩余
边有一手不可达证明，才交 Codex 独立验收；不得合 main/标 done。

## Kimi r3 交付回执（2026-10-04，main 文档治理基线重建候选）

> r3 说明：r1 候选（`c513d05b3`+`92249835e`）被并发 E2E 治理提交污染（`b8c2d0b41`）；
> r2 重建后，main 于 `d02278dc0` 落地测试文档治理（新建未登记的 `docs/testing/` 根
> 文件会被门禁拒绝）。本候选基于 `d02278dc0` 重建：只含本卡 12 个新测试文件、本
> 任务卡与本卡专属证据（已迁入 `docs/ops/evidence/`）；r2 对白名单外
> `docs/testing/README.md` 的修改已撤回；pal-extract 剩余 126 边在证据文档按
> source:file:line 逐条列账（非总数）。反控为 vitest load 钩注入（产品磁盘零写入）。
> r1/r2 的度量与合同记录经核对无变化，见下。

### 总结论

- **migrate 达标**：branches `1503/1787 (84.11%) → 1594/1787 (89.20%)`，**+91**，过 85% 门；
  statements `2146/2592 → 2290/2592`；functions `→ 379/410`；lines `→ 2007/2266`。
  卡面四组合同全部落测，剩余 193 边按 unreachable ledger 记账（卡面合同文件 107 +
  非卡面文件 86，非卡面文件属其它 wave/卡范围，见末节）。
- **pal-extract 走 ledger 收口**：branches `371/539 (68.83%) → 413/539 (76.62%)`，**+42**；
  statements `957/1492 → 1024/1492`。85%（459 边）在卡面约束下算术不可达：cli.ts 93 边 +
  extract-videos.ts 12 边只能经真实数据写入或子进程到达（覆盖零归因，一手证明见
  ledger L01/L02）。**可及边已 100% 闭合**：539 − 126（cli 93 + videos 12 + 类型防御/
  无生产者/政策 21）= 413 = 实达数，剩余 126 边全部有一手不可达证明（L01-L03）。
- 新测试 **91 例全绿、0 pending/skip、0 额外 collection/runtime 错**（pal-extract 38 +
  migrate 53；本分支实跑记录见 `docs/ops/evidence/coverage85-kimi-extract-migrate-r1/README.md`
  验证节与同目 `evidence.json`）。

### 质量门（fresh，2026-10-04 干净 worktree（git worktree add，HEAD=r3 候选）实跑）

- `pnpm --filter @type-pal/pal-extract run typecheck`：exit 0。
- `pnpm --filter @type-pal/migrate run typecheck`：exit 0。
- 定向 Vitest：pal-extract 5 文件 38/38 绿、migrate 7 文件 53/53 绿。
- `pnpm lint`：`PASS — 3154 files; 0 errors / 0 warnings / 0 infos; complete report`。
- `pnpm check:docs`：`docs: PASS (0 issues)` + `testing docs: PASS (0 issues)`。
- `git diff --check`：PASS（暂存集全量）。
- fast 覆盖实跑（`scripts/coverage/run.mjs` 同参数、同环境变量，仅换输出目录）：
  pal-extract 264/264 exit 0、migrate 654/654 exit 0（数值见上方总结论；同目
  `evidence.json` 记录四指标前后对照）。
- 反控：`node docs/ops/evidence/coverage85-kimi-extract-migrate-r1/mutants.mjs` 6/6 detected。
- mkdtemp 清理：本卡全部前缀（`kimi-r1-cli-/mgtx-/palassets-/palmat-/mutants-`）
  残留 0；`finally/afterEach` 只清本次目录，无全局 prune。`glm-q-cli-ge-*` 残留为
  2026-10-02 glm-q 套件既有遗留（stat 时间戳），与本卡无关，不代清。
- 证据（全部 tracked，非 ignored 路径）：
  `docs/ops/evidence/coverage85-kimi-extract-migrate-r1/README.md`（主证据）、
  `docs/ops/evidence/coverage85-kimi-extract-migrate-r1/evidence.json`（机账）、
  `docs/ops/evidence/coverage85-kimi-extract-migrate-r1/mutation-receipt.json`（反控机账）、
  `docs/ops/evidence/coverage85-kimi-extract-migrate-r1/*.txt`（反控原始 stdout/stderr）、
  `docs/ops/evidence/coverage85-kimi-extract-migrate-r1/mutants.mjs`（反控驱动）、
  `docs/ops/evidence/coverage85-kimi-extract-migrate-r1/gen-ledger.mjs`（126 边逐条账生成器，幂等可复跑）。

### Branch delta（fast lcov 一手测量，base=本分支开工点）

| 文件 | before | after | Δ |
|---|---|---|---|
| pal-extract src/events/slice.ts | 62/83 | 81/83 | +19 |
| pal-extract src/events/disasm.ts | 47/54 | 48/54 | +1 |
| pal-extract src/events/roundtrip.ts | 0/4 | 3/4 | +3 |
| pal-extract 散落（map/palette/word/bdf/asset-manifest/sprite/parsers×9） | — | — | +19 |
| pal-extract cli.ts / annotate / recompile / extract-videos | 0·22·44·0 | 不变 | ledger |
| migrate src/pal-assets.ts | 147/269 | 196/269 | +49 |
| migrate src/migration-merge.ts | 216/241 | 227/241 | +11 |
| migrate src/migration-transaction.ts | 177/184 | 183/184 | +6 |
| migrate src/pal-item-scheme-labels.ts | 68/84 | 83/84 | +15 |
| migrate src/pal-world-sprite-registry.ts | 55/67 | 65/67 | +10 |
| migrate bake-assets.mts / migrate-content.mts | 0/45 | 不变 | ledger |

### 合同逐项记录

**C1 · pal-extract cli.ts:167-702（行为合同经公开 CLI 子进程；分支覆盖走 ledger L01）**

- 源锚/caller：`src/cli.ts`（`pnpm extract` = `tsx src/cli.ts`；无 argv 消费、无子命令）。
- 合成输入/oracle/fullName（`cli-error-exits.kimi-r1.test.ts`，sha256 `ba89a0c8…`，
  mkdtemp 临时树复制只读 src+symlink node_modules，同 glm-q 隔离法）：
  - ROUND-TRIP FAILED → stderr 精确文案 + **exit 2**（setPalette 非 0 尾 operand 使
    recompile 写 0 ≠ 原始字节；另证 events 产物不落盘）：
    `KIMI-R1 CLI：ROUND-TRIP FAILED 精确诊断 + exit 2`。
  - M.MSG 缺失 / WORD.DAT 缺失 → ENOENT + exit 1（两条 fullName 同名前缀）。
  - SSS.MKF 头过短 → `MKF: buffer too small for header` + exit 1；首偏移非 4 对齐 →
    `MKF: first offset 6 not multiple of 4` + exit 1。
  - 输出目录覆盖策略：陈旧产物清除、`videos/` PRESERVE 保留（断言双方）+ exit 1。
  - 命令面真值：多余参数被忽略、诊断仍是 ENOENT（非 Usage）+ exit 1。
- 排重：glm-q 已覆盖事件管线成功段/DATA 段/图像段/全管线 exit 0/FBP 越界/截断 SSS，
  本文件全部 fullName 前缀 `KIMI-R1 CLI：` 无重叠（inventory 排重验证：全仓唯一
  duplicate fullName 为既有 shop-author-merge 一例，非本卡产出）。
- 成功退出（exit 0）与格式错误的相邻既有证据：cli-isolated.glm-q.test.ts（不改动）。

**C2 · events/slice.ts:30-193 + disasm/annotate/recompile**

- 源锚/caller：`events/slice.ts`（caller `cli.ts:271`）、`events/disasm.ts`（`cli.ts:260`）、
  `events/recompile.ts`（`cli.ts:263`、`events/roundtrip.ts:27`）、`events/roundtrip.ts`
  （fastTestExcludes 的 roundtrip.test.ts 之外，本卡补合成输入路径）。
- 合成输入：typed `Command[]`（end/goto/showDialog/raw 等 disasm 可出形状）与手工
  8B 指令流（bytes+sha256 硬断言锚）；SSS.MKF/M.MSG 全合成。
- oracle/fullName：
  - `slice.kimi-r1.test.ts`（`78ec8b65…`，8 例）：具名命令 fall-through（:30）、EO
    越界跳过/trigger=0 不入口/auto>0 入口（:67-69）、end reset 缺 resetTo（:98）、
    globalEntries 越界/去重（:132）、global BFS end advance/reset 变体（:137-141）、
    goto L_N 跟随与 shared#L_N 不跟随（:145-147）、字符串字段 L_N 扫描（:150-153）。
  - `disasm.kimi-r1.test.ts`（`a50f4d05…`，5 例）：setPalette case（:109）、具名未
    结构化 opcode 落 raw 保字节、表外未知 opcode 0x0100、JUMP_TARGET_OPERAND/0xA2
    标签收集、entryIps 越界双向；合法 round-trip bytes/hash 逐例断言。
  - `roundtrip.kimi-r1.test.ts`（`ec1ba7fd…`，2 例）：合法往返 ok=true（bytes/hash 锚）、
    内容不符 ok=false + firstDiffOffset/Instruction/Opcode 精确。
  - `misc-guards.kimi-r1.test.ts`（`010e628b…`，16 例）：map 长度守卫+合法 65536B、
    palette 短缓冲 ?? 0、word 短缓冲 break、bdf 非法 hex/零宽/ENDCHAR 截断、
    asset-manifest 同 path 排序等臂、extractCharacterSprites 缺 chunk、
    enemies 双 builder 短缓冲、parseItems 截断、rgm 0 宽/高、spells 无 words、
    stores/battle-fields 不整除、parseLevelUpMagic 三边界、enemy-teams 无名槽。
- 空事件/截断payload/未知 opcode：空命令清单与不可达填充由 slice/disasm 各例覆盖；
  截断 bytecode（%8≠0）由既有 disasm.boundaries 覆盖（不重复）。

**C3 · migrate pal-assets.ts:339-955**

- 源锚/caller：`loadPalStaticImages`/`loadPalSoundAssets`/`loadPalWorldSprites`/
  `loadPalBattleSprites`/`loadPalAssets`（全部经 `repo` 参数注入 mkdtemp 合成
  extracted 树）；`materializePalAssets`（真实 resolver 写盘进 mkdtemp projects/pal）。
  loadPalEffectSprites/loadPalFrameAnimations 为模块私有，唯一公开入口 loadPalAssets，
  一律经其实跑（上游合成闭包自洽，不 mock 核心管线）。
- oracle/fullName（`pal-assets-loaders.kimi-r1.test.ts` `b5f21e5c…` 23 例 +
  `pal-assets-materialize.kimi-r1.test.ts` `e43a5d8e…` 2 例）：
  - 资产缺失：立绘 87≠88、物品图标源缺失、世界精灵源集合不完整、battle 目录漂移。
  - hash/bytes 校验：effect 非 gzip（经 loadPalAssets）、world/battle 非 gzip 单轴
    （首字节合法次字节非法）、world 字节总量漂移、battle 基线漂移（bad-tail=1）、
    战场背景尺寸/像素非法。
  - 资源类别分派：static happy path 378 条记录 kind/path/mediaType/label/origin 逐字段 +
    bytes/sha256 与来源自洽；battle player canonical/enemy legacy 双向 + 坏尾归集。
  - 可选/必需：portraits existsSync 跳缺后 88 计数、sounds 363 非空+142 空三方闭包全绿。
  - 失败回滚/预检：origin 改写精确拒绝且目标目录不落地（预检先于任何写入）；
    materialize written/unchanged/authored 三路 + 最终重读闭包。
  - RNG manifest 段数/段号/帧清单/下标/解码帧数五守卫（经 loadPalAssets）。

**C4 · migration-merge.ts / migration-transaction.ts / 两个 .mts / labels / registry**

- `migration-merge.kimi-r1.test.ts`（`3ca276cb…`，10 例）：orderedIds 链式锚定双方向
  （:226，ours 交换顺序使 lastInserted.get 命中）、页内 delete-modify、mergePages
  theirs 尾短（:319）、base 缺失数组 mode 分派 id/scene-index/pages 有身份/pages
  无身份回退/atomic（:377-380）。
- `migration-transaction.kimi-r1.test.ts`（`ea03d0d4…`，6 例）：journal version/id 三态
  （:108）、previousHash 非 hex+缺省（:124）、precondition hash 非 hex+缺省（:150）、
  afterOperation 删 journal 后 cleanup 容忍（:260）、expectedPreviousHash 非 hex+
  defineProperty 注入 undefined（:303）、非 project 携带 expectedPreviousHash（:306）。
  事务 apply/rollback 写入全部进 mkdtemp 临时 repo。
- `pal-item-scheme-labels.kimi-r1.test.ts`（`b2203445…`，4 例）：walkCommands 容器
  分派全家族（branch±else/loop/startBattle±onLose·onFlee/teleportOut±onFail）、
  flowEdges use/非 use/缺 channel 三方向、节点重复、order+id 不唯一。
- `pal-world-sprite-registry.kimi-r1.test.ts`（`bd0237db…`，5 例）：layoutKey loop
  ±ticksPerFrame（经 overlay spriteNum 236/242 语义角色精灵）、entity 缺
  nSpriteFrames ?? 0、sceneEvidence tie-break 三级、overlay/role 同键去重、
  同 registration 二次 ensure 幂等。
- `migrate-content-script.kimi-r1.test.ts`（`a0d16463…`，3 例）：`--help` usage+exit 0、
  未知参数精确诊断+exit 1、`--write --bogus` 仍按未知参数拒绝（公开脚本子进程实跑；
  参数解析先于事务恢复与数据加载，不读写真实工程）。dry-run/--write 隔离证明见
  ledger L04。

### 反控（真实变异点三态；原始/变异/恢复 sha256 + 执行身份 + exit code）

驱动 `docs/ops/evidence/coverage85-kimi-extract-migrate-r1/mutants.mjs`（vitest load 钩注入，
产品磁盘零写入；marker 文件证明注入执行；testNamePattern 锁唯一 fullName；
businessRed 要求 exit 1 + 恰好一条 executed + 纯业务 AssertionError，拒绝 timeout/
unhandled/额外错误类型）。机账 `docs/ops/evidence/coverage85-kimi-extract-migrate-r1/
mutation-receipt.json`；每针完整 command/cwd/env、stdout/stderr 原始件、exit/signal/
spawnError 见机账与 `docs/ops/evidence/coverage85-kimi-extract-migrate-r1/*.txt`
（control×2 + red/green×6，signal 全 null、spawnError 全 null）。

| # | 注入点 | 变异 | 指定业务红（AssertionError） | 执行身份（vitest file × fullName） | red/green exit | 三态 sha256（original→mutant→restored） |
|---|---|---|---|---|---|---|
| M1 | pal-extract events/slice.ts:169 | `Math.max(n, 2)`→`Math.max(n, 1)` | `expected [] to deeply equal [ { op: 'end', advance: true }, …(1) ]` | slice.kimi-r1.test.ts × `KIMI-R1 sliceByScene globalEntries BFS 残余分支 end advance：global BFS 收 i+1 续行` | 1 / 0 | `6cb5a4f08c26…`→`4712f303ae8c…`→`6cb5a4f08c26…` |
| M2 | pal-extract events/recompile.ts:31 | advance opcode `0x0001`→`0x0000` | `expected { ok: false, originalSize: 16, …(4) } to deeply equal { ok: true, originalSize: 16, …(1) }` | roundtrip.kimi-r1.test.ts × `KIMI-R1 roundtripCheck 合成输入 合法事件 round-trip：ok=true 且尺寸相等（合成 bytes/hash 锚）` | 1 / 0 | `70a5ac15d498…`→`2e15d91649eb…`→`70a5ac15d498…` |
| M3 | pal-extract events/roundtrip.ts:39 | `!==`→`===` | `expected { ok: false, originalSize: 16, …(4) } to deeply equal { ok: false, originalSize: 16, …(4) }`（firstDiffOffset 4→0） | roundtrip.kimi-r1.test.ts × `KIMI-R1 roundtripCheck 合成输入 内容不一致：ok=false 报告首个差异 offset/instruction/opcode` | 1 / 0 | `06e63ab10477…`→`c558be5516dc…`→`06e63ab10477…` |
| M4 | migrate migration-transaction.ts:108 | 删除 `candidate.version !== 2 \|\|` 子句 | `expected [Function] to throw an error` | migration-transaction.kimi-r1.test.ts × `KIMI-R1 迁移事务 journal 校验残余分支 version≠2 与 id 非 16-hex 均拒绝（不恢复、不清理）` | 1 / 0 | `f22787611d1e…`→`21bbd17811b3…`→`f22787611d1e…` |
| M5 | migrate migration-merge.ts:124 | `'delete-modify' : 'add-add'` 互换 | `expected [ [ '/@string:x', 'add-add' ], …(3) ] to deeply equal [ …(4) ]` | migration-merge.kimi-r1.test.ts × `KIMI-R1 mergeIdentityArray orderedIds 链式锚定 ours 全改 + theirs 删中段：后段插入锚定前段插入（?? candidate 回退方向）` | 1 / 0 | `e1d3a877f72e…`→`d41462e07869…`→`e1d3a877f72e…` |
| M6 | migrate pal-assets.ts:790 | gzip 魔数 `\|\|`→`&&` | `expected [Function] to throw error including 'PAL 大世界精灵 1 必须是 gzip RLE' but got 'incorrect header check'` | pal-assets-loaders.kimi-r1.test.ts × `KIMI-R1 loadPalWorldSprites 残余守卫 sprite 1 非 gzip 精确拒绝（首字节合法、次字节非法的单轴输入）` | 1 / 0 | `131b101ef065…`→`351d18cf0802…`→`131b101ef065…` |

- M6 的 r1 输入双字节同坏无法判别 `||`/`&&`，已把在测合同强化为单轴输入（首字节
  合法、次字节非法）后重取证——在测合同判别力因此提升（测试少而精口径）。
- 恢复语义：load 钩注入使磁盘产品文件从未被改写；逐针 original=restored 校验 +
  全部运行后六产品文件 hash 集合相等（机账 hashesBefore/hashesAfter）。

### Unreachable ledger（一手不可达证明；均附源码条件与公开入口调查）

> pal-extract 剩余 **126 边已逐条列账**（source:file:line、公开入口、不可构造条件、
> 反例，非总数）：见 `docs/ops/evidence/coverage85-kimi-extract-migrate-r1/README.md`
> 的 U1（cli.ts 93）/ U2（extract-videos.ts 12）/ U3（类型防御等 21）三节。
> 下方 L01-L03 为其组级摘要；migrate 侧 L04-L07 与证据文档 U4-U15 同构。

**L01 · pal-extract src/cli.ts 全部 93 边（167-872 行 BRDA）**

- 源码条件：cli.ts 无导出、import 即执行 `main()`；`REPO_ROOT/RAW/OUT` 由
  `import.meta.url` 派生为真实仓库常量（cli.ts:73-77）；main 首步即清理真实
  `data/extracted`（:189-197），随后逐阶段写盘。
- 公开入口调查：唯一公开入口 `pnpm extract`（tsx 子进程）。覆盖归因一手证明：
  `docs/ops/evidence/coverage85-kimi-extract-migrate-r1/subprocess-coverage-probe.txt` ——
  fast 全量覆盖实跑中，spawn tsx 执行真实脚本的测试全绿而同一份 lcov 中该脚本的
  DA/BRDA 全部归零（non-zero DA/BRDA entries: 0）；glm-q 套件 21 次子进程实跑下
  cli.ts 基线恒 0/93 为三年史证。在 vitest 进程内 import cli.ts 会以真实 REPO_ROOT
  运行 main → 清理并覆写真实 data/extracted —— 卡面禁止触碰真实数据；mkdtemp 复制
  的副本其文件路径在 coverage.include（`src/**/*.ts`）之外且属仓库根之外，不计入。
  OUT-guard（:189）另因 OUT 恒由固定后缀构造而不可达。
- 行为合同已由 C1 子进程测试钉住（诊断/exit code 精确）；V8 归因在卡面约束下不可达。

**L02 · pal-extract scripts/extract-videos.ts 全部 12 边**

- 同 L01 归因证明；另需 ffmpeg + 真实 `data/raw/{1-6}.avi` + 写真实
  `data/extracted/videos`；无导出、import 即跑 main。子进程行为由生产命令
  `pnpm extract:videos` 持有，本卡不伪造。

**L03 · pal-extract 类型防御/无生产者/政策未定边（21 边）**

- annotate.ts:43/48/53（6）：RULES 的 spellId/personId/enemyId 字段无任何 Command
  变体携带（packages/shared/src/events.ts 全 union 枚举grep 为证）；唯一 caller
  cli.ts 只喂 disasm 产物，无生产者。
- disasm.ts:225×3/235×2/238（6）：emitRawFallback 的 `operands[f] ?? 0`（disasm 恒传
  定长三元组，noUncheckedIndexedAccess 类型防御）；findOpcodeByName `found ===
  undefined || n < found` 双臂（能走到这里的 verb 在 opcodeTable 均单映射：
  startBattle/waitFrames/setObjectXY/setScriptEntry/setObjectState/playMusic/playSfx/
  ifItemLess 枚举为证）；`found ?? 0`（verb 必在表内）。
- recompile.ts:34/35/41/42（4）：`resetTo/idleFrames/frameDelay ?? 0` 与 dangling
  label 写 0 —— 真实 caller（disasm 产物）恒齐全；且 R04/R05 既有评审明确「缺
  label 默认值政策未定、不为其新增正确绿测」（docs/ops/archive/tasks/done/
  TEST-RESOURCE-TOOLS-COVERAGE-1-rle-events-font.md:51），按政策不钉。
- slice.ts:35/193（2）：`operands[0] ?? 0`（RawCommand 定长三元组）；
  `sceneCount[i] ?? 0`（sceneCount 与 commands 同长）。:67 `!eo` 越界索引方向
  已由两 scene EO 区间越界测试覆盖。
- roundtrip.ts:29（1）：disasm 每 8B 恒产 1 命令、recompile 每命令恒产 8B，
  byteLength 结构相等。
- scene.ts:52（1）：`if (!scene) continue`（dumpAllEventObjects 循环上界为
  scenes.length，dense 数组构造上不可达）。
- player-roles.ts:211（1）：cursor 守卫（入函数先验 900B + 固定步进，恒等）。

**L04 · migrate scripts/bake-assets.mts 25 边 + scripts/migrate-content.mts 20 边**

- bake-assets.mts：无导出、顶层即读写 `ROOT=realpath(import.meta.url)/../../..`
  派生的真实仓库路径；写真实 `packages/reforge/src/engine-chrome/assets`
  （:69-181）+ 冻结基线校验（:190-197）。唯一公开入口 `pnpm --filter @type-pal/migrate
  bake`（tsx 子进程 → L01 同款零归因证明）；进程内 import = 真实写入，卡面禁止。
- migrate-content.mts：dry-run（:54-107）只读但只能经子进程到达（零归因）；
  进程内 import 会以真实 repo 跑 publication 并于 dry-run 末尾 `process.exit(0)`
  杀死 fork worker（未处理 signal/worker 退出）；`--write`（:109-162）写真实
  projects/pal。命令面（:45-52）已由子进程合同测试钉住（C4 末行）。
- dry-run 与写入隔离的另一层证明：公开函数级 `createMigrationPlan`/`commitMigrationTransaction`
  合同由 migration-plan/write-plan/transaction 各既有套件持有（不重复）；本卡
  transaction 测试在 mkdtemp repo 内实跑 apply/rollback。

**L05 · migrate pal-assets.ts 剩余 73 边**

- :339/:412/:533/:1059（PNG 长度、未知 roleId、strict 0 帧×2）：构造上不可达
  （PNG.sync.read 恒 w*h*4；face/role 冻结常量闭包；parseSpriteChunkStrict 对
  declaredCount<=0 先抛）。
- :530/:546/:559-564/:705hit/:707hit/:716hit（effect/RNG 阶段）：frameAnimations 全段
  通过需合法 YJ2 压缩 RNG 帧；唯一合法 YJ2 Huffman 编码器是 pal-extract 专属
  fixture（src/__tests__/glm-q/yj2-encoder.ts，有 r10 回引 bug 史），migrate 跨包
  引用越界、自造压缩流非法；真实数据路径由 full profile 覆盖。
- :793（一手实探：gzip([01 00 00 00]) 全 sentinel 输入由 shared parser 先抛
  「sprite chunk legacy 尾槽前不含有效帧」）。
- :819hit/:821/:822/:825/:829（world）与 :940hit/:941/:949/:954/:955（battle）：
  字节/帧数/坏尾/digest 等值断言是真实数据冻结常量，合成输入不可构造等值；
  可达漂移臂 :819/:940 已覆盖。
- :1050-1101（tileset/catalog/roles）：world/battle 冻结哨兵（:825/:955）阻断合成
  输入到达；:1087 重复 AssetId、:1096-1098 catalog 基线、:1101 角色引用同理。
- :1148（退役路径越界）：validateAssetCatalog 的 ownedPrefix 与
  validateProjectRelativePath 先行拒绝全部触发形态。
- :1253（write-loop `!target`）：precheck 循环已先行拒绝缺失目标。

**L06 · migrate 其余卡面合同文件剩余边**

- migration-merge.ts:124add-add臂/:137-139/:184-200/:242/:257/:292/:326（14）：
  逐条证明见 `migration-merge.kimi-r1.test.ts` 头注（same() 吸收、调用点恒对象、
  primitive 恒 false、anchor⇒rootAnchor、live() 过滤、稀疏数组 some() 跳过）。
- migration-transaction.ts:198（1）：manifest 操作在 scope 规则与重复目标拒绝的
  双重前置下不可能出现两个（逐路径枚举，见测试头注）。
- pal-item-scheme-labels.ts:314（1）：roots 只来自 args.items 自身 id，grouped 键
  必是 itemsById 成员。
- pal-world-sprite-registry.ts:92/:109（2）：overlay 冻结常量无重复；sceneLayout
  只在有场景证据时求值，[0] 恒在。

**L07 · migrate 非卡面文件 86 边（out of scope 声明）**

pal-authored-overlays(8)、pal-casualty-scripts(7)、project-map-converter(7)、
pal-item-message-source(6)、pal-store-boundary(6)、pal-current-publication(4)、
pal-world-sprite-layouts(4)、migration-project-io(3)、pal-world-sprite-semantic-alias(3)、
migration-plan(2)、migration-write-plan(2)、project-map-audit(2)、bake-indexed-rgba(1)、
migration-baseline(1)、pal-content-supply(1) —— 不在本卡合同点清单（卡面
「独占范围与明确合同点」），migrate 包已 89.20% 过 85% 门，按越界不取原则留待
对应 wave/卡处理，不做无合同堆测。

### 定向/相邻测试声明

- 定向：每个新 fullName 对应头注中枚举的 lcov BRDA 锚；未命中即返工（bdf:47、
  slice:67、registry:52-53、labels:160、merge:226、transaction `?? ''` 臂均经
  一手测量-返工-复测闭环）。
- 相邻：CLI exit 2 与 glm-q exit 0/1 相邻；merge mode 分派与既有三方真值表相邻；
  pal-assets happy path 与 ownership/retirements 相邻；未改任何旧测试。

### diff 摘要（本分支相对 codex/coverage-85-dispatch-r1）

- 新增 12 个测试文件（hash 见 `docs/ops/evidence/coverage85-kimi-extract-migrate-r1/evidence.json`
  testFileHashes），共 91 例；改动 2 个文档（本任务卡、`docs/testing/README.md` 索引行）；
  新增证据 1 套（`docs/ops/evidence/coverage85-kimi-extract-migrate-r1/README.md` +
  `coverage85-kimi-extract-migrate-r1/` 目录 + `-mutants.mjs` 驱动）。
- 产品代码、旧测试、共享配置、baseline、projects/pal、data/* 零改动；
  r1 污染内容（lore/timeline、testing e2e 文档、E2E-006 卡归档与 board、content/
  editor/reforge 产品文件、projects/pal 场景、scripts/e2e、package.json）均不在本分支。

### 下一位 Agent 提示词（Codex 独立验收）

你是 Codex，负责本卡独立验收。先读 `AGENTS.md`、本卡、
`docs/ops/evidence/coverage85-kimi-extract-migrate-r1/README.md` 与
`docs/ops/agent-workflow.md` 的测试质量验收节，然后：

1. 核对 branch delta 与全量 fast 实跑记录（migrate 1594/1787=89.20% 过门、
   pal-extract 413/539=76.62% 且 539−126=413 闭合）；可自行以
   `node scripts/coverage/run.mjs fast` 复跑全量门（本卡不改 baseline，ratchet 由你决策）。
2. 逐条抽查 unreachable ledger（L01-L07，证据文档 U1-U20 同构）的一手证明是否成立，
   重点：L01 子进程零归因探针、L03 的 grep 枚举、L05 的 YJ2 边界与冻结常量、
   L06/U11 的构造性死边证明。
3. 按测试质量验收核 91 例：原子性、合法输入、真实 caller/oracle、排重、判别力
   （反控机账 `docs/ops/evidence/coverage85-kimi-extract-migrate-r1/mutation-receipt.json`
   + 驱动 `-mutants.mjs` 可复跑）、隔离与 mkdtemp 清理证明；拒收项（零执行/只查
   exit/额外错/pending/skip/spawn 失败）不存在于本卡。
4. 质量门：typecheck 双包 exit 0、`pnpm lint` 零诊断 PASS、`pnpm check:docs` PASS。
5. 输出 `accept` 或 `counter`；不得合 main/标 done（由你按协议收口）。

## 下一位 Agent 提示词

你是 Codex，负责本卡独立验收（见上方「Kimi r2 交付回执 · 下一位 Agent 提示词」，
五步核对清单与证据路径均在回执内）。

---

## Codex quality closure (2026-10-04)

本卡按“少而精”的合同质量标准收口，不以单卡覆盖率百分比或新增用例数量作为通过条件。Kimi 的测试与证据内容已由提交 `440289527` 集成到 main；Codex 对当前 main 并集独立复跑确认：pal-extract 新测试 38/38、migrate 新测试 53/53，6 针反控全部 detected，两个包 typecheck 通过，lint 3154 文件 0/0/0，docs 与 diff 通过。合同具备合法 typed 输入、真实 caller/oracle、排重与 mkdtemp 隔离证据。原 Kimi 候选分支只保留为历史副本，现已完成集成并进入退休清理。
