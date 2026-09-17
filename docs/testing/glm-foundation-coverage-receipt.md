# GLM四包基础测试补强回执（r1 返工交付 · 2026-09-17 定点返工）

任务：[TEST-FOUNDATION-COVERAGE-1](../ops/archive/tasks/done/TEST-FOUNDATION-COVERAGE-1-core-boundaries.md)，r1，done（2026-09-17，三席accept、用户确认后由Codex收口归档）。
四目标包源码冻结：`d64bbf6d2817ba971ae2bd3bbe9a24f3870e7e86`（shared/content/pal-extract/migrate产品源码未变；三签见任务卡，不重签）。
Codex集成核定：合入3b1cff4f时继承了主线dff3442d保存修复，因此全仓相对d64并非零产品diff；本次交付相对3b1cff4f没有产品改动，适配主线基点862733ba。
集成候选：`48d3b8e323f5bc801954c7960d3c25efd7d35fef`，由Codex在main核定，后续SHA回填仅文档。
分支：`codex/glm-foundation-coverage-r1`（自 648b4086 建立；已合入 Codex counter `8126f5c0` 与收窄复核
`3b1cff4f`，counter 原文保留于[接收报告](glm-foundation-coverage-review.md)与本文件末节）。

## 返工总账（R1～R4 对账 · 定点返工后）

- **实际文件清单**（`git diff --name-status 3b1cff4f HEAD -- packages docs/testing` 的独有增量）：
  **A×15 新测试 + A×3 fixture + A×1诊断脚本 + A×1诊断配置 + M×1回执 = 21文件**（Codex按639e9e4e提交树复算；交接所称20漏计本轮新增配置）。
  新增配置为`docs/testing/glm-foundation-coverage.config.mts`，属于原白名单；产品/既有测试/官方基线零修改。
- **本人新增代码文件 Biome exit0**（全部新增 `.ts/.mjs` 经 `pnpm exec biome check` → rc0）。
- **最终测试计数（现场生成）**：A **27**（mkf 9/rng 13/yj2 5）+ B **69**（start-world 20/actors 6/author-items 4/
  skills-poisons 21/author-script 9/enemy-script 9）+ C **19**（enemies 5/player-roles 4/spells 10）+ D **24**
  （merge 8/plan 8/baseline 8）= **139 项**，四包定向命令全绿；四包 `tsc --noEmit` rc0。
- **相邻既有套件**：shared 106 绿；content 557 绿；pal-extract 149 绿+3 skip（同排 7 个缺资产文件）；
  migrate unit（官方 fast 排除口径，经入仓[诊断配置](glm-foundation-coverage.config.mts)）338 绿。

## GLM A组回执（返工后 27 项）

- 命令：`pnpm --filter @type-pal/shared exec vitest run src/mkf.boundaries.test.ts src/rng.boundaries.test.ts src/yj2.boundaries.test.ts` → exit0。
- **R4 去重**：删除与既有 `rng.test.ts`「空 chunk → 空帧数组」重复的空输入用例（原 28→27）；保留增强的
  连续帧基面（全缓冲未触字节断言为既有用例没有的增量）与容器内空 sub-chunk 跳过（index 保持，与空输入不同路径）。
- 负控：mkf-out-of-range-gate-removed、yj2-literal-off-by-one（长度突变被 uncompLen 钳制掩蔽已记录，负控走字面路径）。
- **YJ2 两项待证的后续归属（按 counter 裁定，非本批完成）**：
  1. 树归约（weight==0x8000）：后续独立解码向量工作。尝试记录：固定向量经文档化初始树导出，多符号合法流可构造
     （字面/回引向量已证）；归约分支需累计权重达 0x8000 的超长流，fast 内构造需镜像解码器树更新算法（卡面禁令），
     列后续以有界高资源输入+独立进程诊断再做，不称不可构造。
  2. 空窗口回引（dst-pos-1<0）：合法输入合同待核。尝试记录：合成向量中回引总在先输出字面后发生；该分支语义
     （JS 越界读 undefined→写 0）是否为原格式定义行为无一手证据，不固定为正确合同，下一步先查 sdlpal yj1.c
     对首符号回引的处理再立合同。

## GLM B组回执（69 项，计数已按实际更正）

- 命令：六文件定向 vitest → exit0；逐文件计数 20/6/4/21/9/9（修正首轮 20/8/6/30/12/8 的回执笔误；总数 69 无误）。
- 内容与首轮一致（见 `git show 01c149b5:docs/testing/glm-foundation-coverage-receipt.md` 的 B 组节），
  本轮仅 Biome 格式化，无断言变化。

## GLM C组回执（返工后 19 项）

- 命令：三文件定向 vitest → exit0。
- **R3 C2**：装备/仙术断言改为**完整数组长度+非首/末槽非对称标记**——角色2 装备第 5 行（饰品）=123、仙术第 31 槽=456，
  与角色 0/1 的首行/首槽标记交错；`toEqual([0,0,0,0,0,123])` 与 32 长 magic 数组钉住轴向与截断。
  Codex 两针（`equipment/magic: rows.slice(0,1).map` 坏实现）已并入本人负控脚本，见下。
- **R3 C3 补齐**：parseObjectPoisons（字段映射 level/color/playerScript/enemyScript、floor 计数、零长合法）与
  parseObjectPlayers（id=36..41、偏移 4/6 映射、<(36+6)×14B 截断门）——**不再以"分支较少"后置**。
  与既有 `resources/tables.test.ts:283-335` 局部合成断言的关系：该套件收集依赖原盘不进 fast，本文件为自包含补强；
  重叠的 magicNumber/flags 主字段断言保留（去重说明：既有断言在资产域套件，fast 域首次自包含覆盖）。
- 负控：enemies-attack-strength-unsigned、player-roles-name-pointer-degraded、
  **player-roles-equipment-truncated、player-roles-magic-truncated（后两针= Codex counter 见证复建，本轮必红）**。

## GLM D组回执（返工后 24 项 = merge 8/plan 8/baseline 8）

- 命令：`pnpm --filter @type-pal/migrate exec vitest run --config vitest.config.ts --project unit src/migration-merge.boundaries.test.ts src/migration-plan.boundaries.test.ts src/migration-baseline-pure.boundaries.test.ts` → exit0。
- **R2 冲突删除门**：冲突 fixture 增加真实待删除文件 `content/delete.json`（theirs 删除+ours 未动）——原实现冲突时
  `deletes=[]`；同 fixture 消除冲突的正控证明正常路径 `deletes=['content/delete.json']`。Codex 删除逃逸针
  （删除循环移出 `if (!conflicts.length)`）已并入负控脚本 `plan-deletes-escape-conflicts-gate`，本轮必红。
- **R2 恒真自比较替换**：原 `sha256(s(v4map())) === sha256(s(v4map()))` 自比较删除，改为两次**独立构造**等值图
  （`v4map()` vs `v4map({tilesetRefs:['t']})`）hash 相等 + 真实字段差异（改名）hash 不等的双向对照。
- **R2 absent/null 纯函数合同**：显式 null（files 含 null）→ present=true、hash=sha256('null\n')、
  baselineWrites 含 `'null\n'` 正文；**真正缺席**（managed 却无 files/hashes）→ present=false、
  `baselineWrites` 抛「baseline 托管清单缺文件或 hash」（已定义门）；metadata/write-map 对应：
  `_state.json` 记录的 hash == write-map 正文字节摘要 == snapshotFileHash（三向一致）。
- **R2 输入不变（2026-09-17 定点修复，Codex immutability 反例合同）**：三侧 before 改为**真正独立深快照**
  （files 值对象 `structuredClone` 脱离原引用），并附深快照自证（改 `before.base` 值不影响输入）；浅容器展开
  会把产品侧原地污染同步进 before 从而漏检——`plan-pollutes-{base,ours,theirs}` 三轴负控永久钉住。
- 负控：merge-same-ours-theirs-removed、plan-conflicts-still-write、plan-deletes-escape-conflicts-gate、
  **plan-pollutes-base/ours/theirs（三轴输入污染，Codex immutability 见证永久化）**。
  **红因更正（R4）**：`merge-same-ours-theirs-removed` 的业务红来自 ID 数组新增同 id 'a' 的无冲突断言
  （快径失效后落入 add-add 冲突），并非对象"同改同值"用例（后者有递归叶级快径保护）——负控有效，归因以此为准。

## 逐族分类表（R4）

| 族 | 新增测试（文件:用例族） | 已有证据（锚点） | 缺陷 | 待证/后续 |
|---|---|---|---|---|
| A1 MKF | mkf.boundaries 9（头合同/首末边界/空 chunk/subarray/三错误门） | pal-extract io/mkf.test.ts（资产域） | 无 | — |
| A2 RNG | rng.boundaries 13（skip/literal/repeat 族+0x13+两帧链+容器内空/非法 sub-chunk） | rng.test.ts:6-32（0x00/0x02/0x06/0x0d+unknown）、:44（空输入） | 无 | — |
| A3 YJ2 | yj2.boundaries 5（短头/uncompLen=0/三字面/重叠回引/EOS） | pal-extract io/yj2.test.ts（资产域） | 无 | 树归约/空窗回引→后续独立工作（见 A 组节） |
| B1 StartWorld | validate-start-world 20 | validate.test.ts:1149-1212（resources 零值/seed carrier） | 无 | — |
| B2 Actors | validate-actors 6 | validate.test.ts:345-434（C0/E18-1 主体） | 无 | — |
| B3 作者物品 | validate-author-items 4 | validate-author.test.ts:124-220（ScriptRef/私有槽组合主体） | 无 | — |
| B4 Skill/Poison | validate-skills-poisons 21 | validate.test.ts:482-624（技能执行/cost/lifetimeLimit） | 无 | — |
| B5 作者脚本入口 | author-script-current 9 | author-script-core.test.ts:15-630（选择/cursor/条件/转移/SCC/分页主体） | 无 | — |
| B6 敌方脚本 | enemy-script 9 | enemy-script.test.ts:85-225（state/effect/抗性/SCC/terminal 主体）、enemy-ai.test.ts | 无 | — |
| C1 Enemy | enemies 5 | PAL 组真实资产集成（gitignored） | 无 | — |
| C2 PlayerRoles | player-roles 4（SoA 完整轴向/尺寸门/零表/rgwName 对调） | 同上 | 无 | — |
| C3 Spell/Magic/Object | spells 10（flags 位拆解+梦蛇/截断/magic 视图 floor/MAGIC 表 type+signed+整除/poisons 视图/players 视图+截断） | resources/tables.test.ts:283-335（资产域局部合成） | 无 | — |
| D1/D2 merge | migration-merge 8 | migration-merge.test.ts（既有主体） | 无 | — |
| D3/D4 plan | migration-plan 8 | migration-plan.test.ts（既有主体） | 无 | — |
| D5 baseline 纯辅助 | migration-baseline 8 | migration-baseline.test.ts（磁盘链域） | 无 | — |

## 负控总账（可重建）

入口：`node docs/testing/glm-foundation-coverage-mutants.mjs` → **4 对照 exit0 + 14 单点负控全部 exit1 且业务
AssertionError 红（MUTATION_HIT 见证+被替换产品文件前后 hash 一致）**。14 = 原 8（有效部分全保留）+
R2/R3 新增 3（plan-deletes-escape-conflicts-gate / player-roles-equipment-truncated / player-roles-magic-truncated，
即 Codex counter 三见证）+ **定点返工新增 3（plan-pollutes-base/ours/theirs，Codex immutability 三轴见证永久化：
在唯一 `canonicalSnapshot(base)` 前对指定侧 `content/a.json` 值原地写 v=17；正常实现绿、深快照不变断言业务红）**。

## 覆盖对照（两个时点，命令可整段复制）

**历史快照（01c149b5 时代，133 项树）**：shared 行 28/179→170/179 分支 10/53→48/53；content 1351/1796→1421/1796
分支 1071/1656→1152/1656；pal-extract 0/215→197/215 分支 0/48→42/48；migrate 269/292→272/292 分支 318/376→325/376。
该表出自返工前候选，pal/migrate 数字已经 Codex 独立复算认可（见接收报告）；C3 新增两导出与 D5 纯辅助不在其中。

**当前时点（本定点返工最终树，139 项）现场重测**：shared 行 28/179→170/179 分支 10/53→48/53（去重用例与既有
覆盖重合，数字不变）；content 1351/1796→1421/1796 分支 1071/1656→1152/1656（测试面未变）；
**pal-extract 0/215→214/215 分支 0/48→44/48（C3 两视图新增 +17 行 +2 分支）；migrate 269/292→272/292
分支 318/376→326/376（D5 纯辅助 +1 分支）**。正式官方口径由 Codex 集成后统一测量，本表不冒充官方 fast/full。

完整可复制命令（八段，报告目录自行替换；shared/content 的 before 侧把 `--exclude` 中的三个/六个 boundaries
文件包含进去即为 before 形态——下面 shared-before 已给完整形态，其余同型改文件名与 include）：

```sh
pnpm --filter @type-pal/shared exec vitest run --exclude src/mkf.boundaries.test.ts --exclude src/rng.boundaries.test.ts --exclude src/yj2.boundaries.test.ts --exclude '**/node_modules/**' --coverage.enabled --coverage.reporter=json-summary --coverage.reportsDirectory=/tmp/fc1-cov2/shared-before --coverage.include='**/src/mkf.ts' --coverage.include='**/src/rng.ts' --coverage.include='**/src/yj2.ts'

pnpm --filter @type-pal/shared exec vitest run --exclude '**/node_modules/**' --coverage.enabled --coverage.reporter=json-summary --coverage.reportsDirectory=/tmp/fc1-cov2/shared-after --coverage.include='**/src/mkf.ts' --coverage.include='**/src/rng.ts' --coverage.include='**/src/yj2.ts'

pnpm --filter @type-pal/content exec vitest run --exclude src/validate-start-world.boundaries.test.ts --exclude src/validate-actors.boundaries.test.ts --exclude src/validate-author-items.boundaries.test.ts --exclude src/validate-skills-poisons.boundaries.test.ts --exclude src/author-script-current.boundaries.test.ts --exclude src/enemy-script.boundaries.test.ts --exclude '**/node_modules/**' --coverage.enabled --coverage.reporter=json-summary --coverage.reportsDirectory=/tmp/fc1-cov2/content-before --coverage.include='**/src/validate.ts' --coverage.include='**/src/author-script-core.ts' --coverage.include='**/src/author-script.ts' --coverage.include='**/src/runtime-script.ts' --coverage.include='**/src/enemy-script.ts'

pnpm --filter @type-pal/content exec vitest run --exclude '**/node_modules/**' --coverage.enabled --coverage.reporter=json-summary --coverage.reportsDirectory=/tmp/fc1-cov2/content-after --coverage.include='**/src/validate.ts' --coverage.include='**/src/author-script-core.ts' --coverage.include='**/src/author-script.ts' --coverage.include='**/src/runtime-script.ts' --coverage.include='**/src/enemy-script.ts'

pnpm --filter @type-pal/pal-extract exec vitest run --exclude src/io/msg.test.ts --exclude src/io/sss.test.ts --exclude src/io/word.test.ts --exclude src/io/yj2.test.ts --exclude src/resources/map.test.ts --exclude src/resources/tables.test.ts --exclude src/events/roundtrip.test.ts --exclude src/resources/parsers/__tests__/enemies.boundaries.test.ts --exclude src/resources/parsers/__tests__/player-roles.boundaries.test.ts --exclude src/resources/parsers/__tests__/spells.boundaries.test.ts --exclude '**/node_modules/**' --coverage.enabled --coverage.reporter=json-summary --coverage.reportsDirectory=/tmp/fc1-cov2/pal-before --coverage.include='**/src/resources/parsers/enemies.ts' --coverage.include='**/src/resources/parsers/player-roles.ts' --coverage.include='**/src/resources/parsers/spells.ts'

pnpm --filter @type-pal/pal-extract exec vitest run --exclude src/io/msg.test.ts --exclude src/io/sss.test.ts --exclude src/io/word.test.ts --exclude src/io/yj2.test.ts --exclude src/resources/map.test.ts --exclude src/resources/tables.test.ts --exclude src/events/roundtrip.test.ts --exclude '**/node_modules/**' --coverage.enabled --coverage.reporter=json-summary --coverage.reportsDirectory=/tmp/fc1-cov2/pal-after --coverage.include='**/src/resources/parsers/enemies.ts' --coverage.include='**/src/resources/parsers/player-roles.ts' --coverage.include='**/src/resources/parsers/spells.ts'

GLM_FC_EXCLUDE_BOUNDARIES=1 pnpm --filter @type-pal/migrate exec vitest run --config ../../docs/testing/glm-foundation-coverage.config.mts --project unit --coverage.enabled --coverage.reporter=json-summary --coverage.reportsDirectory=/tmp/fc1-cov2/migrate-before --coverage.include='**/src/migration-merge.ts' --coverage.include='**/src/migration-plan.ts' --coverage.include='**/src/migration-baseline.ts'

pnpm --filter @type-pal/migrate exec vitest run --config ../../docs/testing/glm-foundation-coverage.config.mts --project unit --coverage.enabled --coverage.reporter=json-summary --coverage.reportsDirectory=/tmp/fc1-cov2/migrate-after --coverage.include='**/src/migration-merge.ts' --coverage.include='**/src/migration-plan.ts' --coverage.include='**/src/migration-baseline.ts'
```

migrate 两侧统一走[入仓诊断配置](glm-foundation-coverage.config.mts)（复刻官方 `migrateCoverageFastTestExcludes`，
`GLM_FC_EXCLUDE_BOUNDARIES=1` 为 before 形态）；pal-extract 两侧同排 7 个缺 gitignored 资产文件（属 fast/PAL
组拆分，非本批排除）。历史过程失败如实记录（不计证据）：`--coverage.include=src/x.ts` 相对形态不匹配（0/0）、
zsh 变量无分词参数粘连（CACError）、migrate CLI exclude 被项目配置忽略、.mts 注释中 `**/` 提前闭合 JSDoc——均已修正。

## GLM整批交付（定点返工 · 2026-09-17）

- 本轮仅改：migration-plan 输入不变断言（真深快照+自证）、负控脚本 +3 污染轴（8→11→14 针）、回执勘误
  （完整冻结 SHA、D 组 8/8/8、文件增量按 `git diff --name-status 3b1cff4f`、旧覆盖表标 01c149b5 历史并补
  当前时点重测、八段可复制命令+入仓诊断 config、`null`/`{a:null}` 用例标题更名）。已通过的 139 项/其余
  11 针/Biome/删除门/absent-null/角色槽位/C3 视图均不重做。
- 分支远端推送后由 Codex 复核差异、定向/负控与待证归属，再合入最新产品树串行完整 check→官方 ratchet→
  受保护单次严格 fast。分类总账见逐族表：**缺陷=0**；待证 2 项（YJ2 树归约/空窗回引，归属不变）。
- 产品/既有测试/原探针/官方配置/基线零改动；GLM 不作为自己测试贡献的独立第三方证明。

## Codex接收复核（GLM不得填写）

2026-09-17（639e9e4e）：R1～R4技术返工项已独立复核通过，139项/四包tc/Biome及4对照+14反控通过；
Codex原三轴污染见证按新标题重跑均在不变性断言业务红，确认深快照不是其它用例碰巧报错。
已在862733ba主线完成集成及统一门禁，Codex本席accept；随后Kimi独立终审与GLM实现者自验均accept，用户确认后由Codex核定done。下面两轮counter保留历史，不代签或改写他席结论。
Codex仅调整诊断配置为直接导入`migrateCoverageFastTestExcludes`，不以正则收集其他包的排除项；实测原正则29项中额外20项不匹配当前migrate文件，实际选例不变。
文件数/全仓冻结表述按真实树勘误；正式测试和fixture保持GLM候选原样。官方check7218、ratchet与BASE_REF=862733ba单次严格fast6730/617均exit0。
全部旧identity与生产文件/指标分母保留，reforge/game/editor基线对象不变；全仓行70.90%/分支62.50%，不是全覆盖或E2E完成。
完整数字与YJ2后续归属见[最终接收节](glm-foundation-coverage-review.md)。三席签字已齐、无返工；候选48d3b8e3未漂移，本次只做文档收口。

2026-09-16：候选01c149b5已独立复核，**counter，未集成测试或基线**。完整[接收报告及R1～R4](glm-foundation-coverage-review.md)。
候选分支内GLM四组回执保留，不从尚未合入分支复制并覆盖本主线占位；读取方式为`git show 01c149b5:docs/testing/glm-foundation-coverage-receipt.md`。
133项及8负控真实通过，pal/migrate同口径覆盖增量认可；但Biome27错、删除门/槽位完整性漏测、D组自比较与缺席替身及交付账需修。
三项待证：YJ2两项可明确后续归属，C3对象视图本轮补齐。GLM不作为自己测试的独立终审；下一步由其定点返工，不转Kimi、不标done。

2026-09-17：c0c94333返工复核已完成，139项、11负控及相邻通过，R1/R3和R2主体闭环；**仅R2三侧输入浅副本仍阻断**，
另有回执计数/SHA/覆盖时点与重建命令勘误。见同一[报告末节](glm-foundation-coverage-review.md)，已核通过部分不重做。
候选尚未合入，正式主线基线仍6591；GLM分支原回执可用`git show c0c94333:docs/testing/glm-foundation-coverage-receipt.md`读取。
