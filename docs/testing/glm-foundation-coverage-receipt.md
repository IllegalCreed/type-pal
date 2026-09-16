# GLM四包基础测试补强回执（r1 返工交付）

任务：[TEST-FOUNDATION-COVERAGE-1](../ops/tasks/TEST-FOUNDATION-COVERAGE-1-core-boundaries.md)，r1，build。
冻结产品：`d64bbf6d2817ba971ae2bd3bbe9a2463870e7e86`（分支对冻结树零产品 diff；三签见任务卡，不重签）。
分支：`codex/glm-foundation-coverage-r1`（自 648b4086 建立；返工基点=合入 Codex counter `8126f5c0`，counter 原文保留于
[接收报告](glm-foundation-coverage-review.md)与本文件末节）。

## 返工总账（R1～R4 对账）

- **实际文件清单**（对 `git diff --name-only --diff-filter=A 648b4086 HEAD`）：**15 个新测试 + 3 个 fixture + 2 个
  文档/诊断 = 20 文件**（修正首轮 12+4+2 口径；fixture 为 shared/content/pal-extract 各 1）。
- **pal fixture 已移回精确白名单** `packages/pal-extract/src/__tests__/glm-foundation-fixtures.ts`（原
  `src/resources/parsers/__tests__/` 下同名文件移除，三个 C 测试 import 更新）。
- **本人新增 19 个代码文件 Biome exit0**（`git diff --name-only --diff-filter=A 648b4086 HEAD -z -- packages
  docs/testing/glm-foundation-coverage-mutants.mjs | xargs -0 pnpm exec biome check` → rc0；首轮 27 errors 已全部
  格式化/import 整理修复，未触碰产品或既有测试）。
- **最终测试计数（现场生成）**：A **27**（mkf 9/rng 13/yj2 5）+ B **69**（start-world 20/actors 6/author-items 4/
  skills-poisons 21/author-script 9/enemy-script 9）+ C **19**（enemies 5/player-roles 4/spells 10）+ D **24**
  （merge 11/plan 8/baseline 5）= **139 项**，四包定向命令全绿；四包 `tsc --noEmit` rc0。
- **相邻既有套件**：shared 106 绿；content 557 绿；pal-extract 149 绿+3 skip（同排 7 个缺资产文件）；
  migrate unit（官方 `migrateCoverageFastTestExcludes` 口径 tmp config）338 绿。

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

## GLM D组回执（返工后 24 项）

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
- **R2 输入不变范围**：三侧输入（base/ours/theirs 的 files+managedFiles+hashes）调用前后完整快照比较（原仅 base.files）。
- 负控：merge-same-ours-theirs-removed、plan-conflicts-still-write、plan-deletes-escape-conflicts-gate。
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
| D1/D2 merge | migration-merge 11 | migration-merge.test.ts（既有主体） | 无 | — |
| D3/D4 plan | migration-plan 8 | migration-plan.test.ts（既有主体） | 无 | — |
| D5 baseline 纯辅助 | migration-baseline-pure 5 | migration-baseline.test.ts（磁盘链域） | 无 | — |

## 负控总账（可重建）

入口：`node docs/testing/glm-foundation-coverage-mutants.mjs` → **4 对照 exit0 + 11 单点负控全部 exit1 且业务
AssertionError 红（MUTATION_HIT 见证+8 个被替换产品文件前后 hash 一致）**。11 = 原 8（有效部分全保留）+
R2/R3 新增 3（plan-deletes-escape-conflicts-gate / player-roles-equipment-truncated / player-roles-magic-truncated，
即 Codex counter 的三见证，已从一次性 tmp 脚本固化为永久负控）。

## 覆盖对照可重建命令（R4 补齐；数字已经 Codex 独立复算认可，不重跑）

同树同 include、before=既有测试集、after=+本批；`--coverage.enabled --coverage.reporter=json-summary`，
include 用 `**/src/<file>.ts` 绝对匹配形态。四组命令模板（报告目录替换 before/after）：

```sh
pnpm --filter @type-pal/shared exec vitest run [--exclude src/{mkf,rng,yj2}.boundaries.test.ts ...] \
  --exclude '**/node_modules/**' --coverage.enabled --coverage.reporter=json-summary \
  --coverage.reportsDirectory=<tmp>/shared-{before,after} \
  --coverage.include='**/src/mkf.ts' --coverage.include='**/src/rng.ts' --coverage.include='**/src/yj2.ts'
# content 同型（include=validate/author-script-core/author-script/runtime-script/enemy-script；before 额外排除六个 boundaries 文件）
# pal-extract 同型（include=三 parsers；两侧同排 7 个缺资产文件：io/{msg,sss,word,yj2}+resources/{map,tables}+events/roundtrip）
# migrate 两侧用复刻官方 fast 排除的 tmp config（unit project + migrateCoverageFastTestExcludes，
#   before 追加排除三个 boundaries 文件；CLI --exclude 不作用于 project 级 include，已如实记录）
```

过程失败如实记录（不计证据）：首轮 `--coverage.include=src/x.ts` 相对形态不匹配绝对模块 id（0/0）；
一次 zsh 变量无分词导致参数粘连（CACError）；migrate CLI exclude 被项目配置忽略一次——最终以上述命令成功。
结果：shared 行 28/179→170/179 分支 10/53→48/53；content 1351/1796→1421/1796 分支 1071/1656→1152/1656；
pal-extract 0/215→197/215 分支 0/48→42/48；migrate 269/292→272/292 分支 318/376→325/376。

## GLM整批交付（返工）

- 返工提交：R1-R3 修复+R4 回执（本提交）；分支远端推送后由 Codex 复核差异、定向/负控与待证归属，
  再合入最新产品树串行完整 check→官方 ratchet→受保护单次严格 fast。
- 分类总账见逐族表：**缺陷=0**；待证 2 项（YJ2 树归约/空窗回引，均已按 counter 裁定列后续归属并记录尝试）。
- 产品/既有测试/原探针/配置/基线零改动；GLM 不作为自己测试贡献的独立第三方证明。

## Codex接收复核（GLM不得填写）

2026-09-16：候选01c149b5已独立复核，**counter，未集成测试或基线**。完整[接收报告及R1～R4](glm-foundation-coverage-review.md)。
候选分支内GLM四组回执保留，不从尚未合入分支复制并覆盖本主线占位；读取方式为`git show 01c149b5:docs/testing/glm-foundation-coverage-receipt.md`。
133项及8负控真实通过，pal/migrate同口径覆盖增量认可；但Biome27错、删除门/槽位完整性漏测、D组自比较与缺席替身及交付账需修。
三项待证：YJ2两项可明确后续归属，C3对象视图本轮补齐。GLM不作为自己测试的独立终审；下一步由其定点返工，不转Kimi、不标done。

2026-09-17：c0c94333返工复核已完成，139项、11负控及相邻通过，R1/R3和R2主体闭环；**仅R2三侧输入浅副本仍阻断**，
另有回执计数/SHA/覆盖时点与重建命令勘误。见同一[报告末节](glm-foundation-coverage-review.md)，已核通过部分不重做。
候选尚未合入，正式主线基线仍6591；GLM分支原回执可用`git show c0c94333:docs/testing/glm-foundation-coverage-receipt.md`读取。
