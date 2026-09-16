# GLM四包基础测试补强回执

任务：[TEST-FOUNDATION-COVERAGE-1](../ops/tasks/TEST-FOUNDATION-COVERAGE-1-core-boundaries.md)，r1，build。
冻结产品：`d64bbf6d2817ba971ae2bd3bbe9a24f3870e7e86`（分支对冻结树零产品 diff；三签见任务卡）。
分支：`codex/glm-foundation-coverage-r1`（自 648b4086=三签+开门禁建立）。

## GLM设计与只读矩阵准备

已在任务卡本席完成（premise verified / design agree，5d39f7bf）：A/C 原盘格式合同锚点
（mkf.ts:1-5 N+1 LE 头 / player-roles.ts:92-105 整 DATA.MKF chunk3+900B 尺寸门）、
去重边界（shared rng.test.ts 已测 0x00/0x02/0x06/0x0d 四族 opcode；decodeRngFrames 无 fast 直测；
mkf/yj2 既有 io 测试在 pal-extract 资产域）、B/D 入口行号直读、白名单目标不存在可新增。

## GLM A组回执（shared，提交 a83c7308）

- 测试：`mkf.boundaries.test.ts`(9) / `rng.boundaries.test.ts`(14) / `yj2.boundaries.test.ts`(5)，共 **28**，全绿。
- 命令：`pnpm --filter @type-pal/shared exec vitest run src/mkf.boundaries.test.ts src/rng.boundaries.test.ts src/yj2.boundaries.test.ts` → exit0。
- 合同源：mkf.ts:1-5（N+1 头/子文件数公式）、rng.ts:19-35（opcode 真值表）、yj2.ts:8-20（头/树/符号语义）。
- 新增：MKF 头三种已定义错误+首末索引边界+空 chunk+subarray byteOffset（越界损坏偏移=未定义不设合同）；
  RNG 补齐 0x03/0x04/0x07-0x0a/0x0b/0x0c/0x0e-0x10/0x11/0x12/0x13 族+MARK 未触字节精确断言+连续帧基面；
  decodeRngFrames 合成 sub-MKF 链（两帧 delta/帧拷贝独立/空与非法 sub-chunk 跳过）；YJ2 固定向量
  （初始树结构文档导出，期望=符号语义推导非解码器回算）：三字面/重叠回引 ABCABCA/EOS 余量零。
- 去重：rng.test.ts 已测 opcode（0x00/0x02/0x06/0x0d+unknown）不重复；pal-extract io 测试为资产域。
- 负控：mkf-out-of-range-gate-removed、yj2-literal-off-by-one（长度突变会被 uncompLen 钳制掩蔽——越界写被
  Uint8Array 静默忽略——故负控改字面路径，已记录）。
- 待证：YJ2 树归约（weight==0x8000）与空窗口回引（dst-pos-1<0）不能在不复制生产算法下独立构造，列待证。

## GLM B组回执（content，提交 29a7ec0f）

- 测试：validate-start-world(20)/validate-actors(8)/validate-author-items(6)/validate-skills-poisons(30)/
  author-script-current(12)/enemy-script(8)，共 **69**，全绿。
- 命令：六文件定向 vitest → exit0；`pnpm --filter @type-pal/content exec tsc --noEmit` → rc0。
- 合同源：validate.ts:94-160/427-501/559-760/1329-1360、author-script.ts:115-159、author-script-core.ts:612-628/950-995、
  enemy-script.ts:458-558。
- 新增：StartWorld 逐字段损坏矩阵+合法零值(money=0/count=0)与丰富正控；Actors id/spriteId 非 string+旧
  battleSpriteNum 退役门；作者物品 item-private 槽唯一门+battleOnly 上下文门；**validatePoisons 全矩阵（此前零直测）**
  含 id 重复静默覆盖禁令；allowSceneEntry 仅 initial 门+forbidLoadScene 门+stage 机 where 路径；
  EnemyHookFlow/Ai 结构门。
- 去重：validate.test.ts/validate-author.test.ts/author-script-core.test.ts/enemy-script.test.ts 既有断言不重复
  （各文件头注明与既有用例的边界）。
- 负控：poisons-duplicate-id-gate-removed、author-stage-entry-gate-removed。
- 缺陷：无（未发现现行合同与实现冲突）。

## GLM C组回执（pal-extract，提交 6b05bd48）

- 测试：`parsers/__tests__/enemies.boundaries.test.ts`(5)/`player-roles.boundaries.test.ts`(4)/`spells.boundaries.test.ts`(6)，共 **15**，全绿。
- 命令：三文件定向 vitest → exit0；`pnpm --filter @type-pal/pal-extract exec tsc --noEmit` → rc0。
- 布局证据：enemies.ts:22-39（35×WORD=70B 字段偏移表+signed 语义）、player-roles.ts:53-62/111-208
  （SoA 75 行×12B=900B 真字段序）、spells.ts:38-58/60-102（SPELL_OFF/MAGIC_OFF/MAGIC_TYPE）。
- 新增：ENEMY 字段映射（signed modifier 0xFFFF→-1/五行抗具名/id=chunk1 下标）+整除门+OBJECT_ENEMY 反查
  _name（首见优先；enemyId 与 objectIndex 398+ 分开）；PlayerRoles SoA 轴向（行=字段列=6 角色，装备/仙术/抗性
  轴不颠倒）+**rgwName 指针反查含 role3/4 故意对调真值**+898B 尺寸门；parseSpells flags 位拆解+梦蛇 295 追加+
  截断门；parseObjectMagics floor 计数；parseMagicTable type 枚举与 other 兜底+signed speed/sound+整除门。
- 去重：真实资产集成在 PAL 组（gitignored），本批纯合成字节，fast 不依赖 data/raw|extracted。
- 负控：enemies-attack-strength-unsigned、player-roles-name-pointer-degraded。
- 待证：object magics/poisons/players 视图全字段矩阵（本批覆盖 magicNumber/flags 主字段，poisons/players
  视图未展开——分支较少，列后续候选）。

## GLM D组回执（migrate，提交 3aa7ef47）

- 测试：migration-merge/migration-plan/migration-baseline-pure 三文件定向运行 **Tests 21 passed**，全绿
  （plan 冲突用例强化后含同 fixture 双向断言，用例数不变）。
- 命令：`pnpm --filter @type-pal/migrate exec vitest run --config vitest.config.ts --project unit src/migration-merge.boundaries.test.ts src/migration-plan.boundaries.test.ts src/migration-baseline-pure.boundaries.test.ts` → exit0；tsc rc0。
- 合同源：migration-merge.ts:111-133/248-294/411-426、migration-plan.ts:30-217、migration-baseline.ts:29-77。
- 新增：原子三方六组合（含 delete-modify/add-add/value，结果保留作者侧）；ID 数组并集（theirs 序为锚 :216-217）+
  item 级 '/@string:a/v' 冲突路径+invalid-identity；plan 分类 summary 精确计数+未管理文件不进计划+冲突清空
  全部 writes/deletes（含无关净改文件，附同 fixture 正控）+同输入稳定+输入不被修改；**原子地图 hash 字节合同**
  （真实字段变化 write；未知字段经 canonical 序列化归一无 write；theirs 删除→deletes；ours 已缺席无需 delete）；
  纯辅助六边界+已知 sha256 摘要+缺席/显式 null 字节可区分。fixture 用合法最小 v4 ProjectMap。
- 边界：未触碰 migration-write-plan/transaction/pal-assets/CLI（IO 域，卡面排除）。
- 负控：merge-same-ours-theirs-removed、plan-conflicts-still-write。

## GLM整批交付

- 单点负控入口：`node docs/testing/glm-foundation-coverage-mutants.mjs`（[脚本](glm-foundation-coverage-mutants.mjs)）。
  **4 对照 exit0 + 8 反控全 exit1 且业务 AssertionError 红（MUTATION_HIT 见证+产品文件前后 hash 一致）**；
  汇总 JSON 含源 hash/命令/exit/日志 hash。首跑日志 `/var/…/T/fc1-mutants-s1SIH2/`。
- 覆盖同树前后对照（tmp 产物 `/tmp/fc1-cov/`，json-summary，include 固定目标源码；before=既有测试集，
  after=+本批新测试；migrate 两侧同用官方 fast 排除口径+本批差异，pal-extract 两侧同排除 7 个缺资产文件）：

| 包 | 目标源 | 行 before→after | 分支 before→after |
|---|---|---|---|
| shared | mkf/rng/yj2 | 28/179 → **170/179** | 10/53 → **48/53** |
| content | validate/author-script-core/author-script/runtime-script/enemy-script | 1351/1796 → **1421/1796** | 1071/1656 → **1152/1656** |
| pal-extract | parsers enemies/player-roles/spells | 0/215 → **197/215** | 0/48 → **42/48** |
| migrate | migration-merge/plan/baseline | 269/292 → **272/292** | 318/376 → **325/376** |

  局部测量不冒称官方 fast/full；未跑官方 ratchet/full/strict-fast，未改排除/超时/基线。
- 测试合计：**133 项**（28+69+15+21），四包 typecheck rc0、改动文件 Biome 0 error；产品/既有测试/配置/基线零改动
  （`git diff --stat 648b4086..HEAD -- packages | grep -v boundaries | grep -v __tests__` 为空）。
- 分类总账：新增=上表全部；已有证据=各组去重注记；**缺陷=0**；待证=YJ2 树归约/空窗回引、C 组 poisons/players
  视图（均附具体阻断与下一步，不虚标完成）。
- 环境说明：pal-extract/migrate 全量套件中缺 gitignored 资产的真实盘用例在本地环境失败（fast/PAL 组拆分所致），
  覆盖对照两侧同集排除，差异只来自本批新测试；Codex 集成时按官方口径复算。

## Codex接收复核（GLM不得填写）

2026-09-16：候选01c149b5已独立复核，**counter，未集成测试或基线**。完整[接收报告及R1～R4](glm-foundation-coverage-review.md)。
候选分支内GLM四组回执保留，不从尚未合入分支复制并覆盖本主线占位；读取方式为`git show 01c149b5:docs/testing/glm-foundation-coverage-receipt.md`。
133项及8负控真实通过，pal/migrate同口径覆盖增量认可；但Biome27错、删除门/槽位完整性漏测、D组自比较与缺席替身及交付账需修。
三项待证：YJ2两项可明确后续归属，C3对象视图本轮补齐。GLM不作为自己测试的独立终审；下一步由其定点返工，不转Kimi、不标done。
