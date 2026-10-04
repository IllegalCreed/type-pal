# TEST-COVERAGE85-GLM-REFORGE-1 — Reforge runtime branch-contract closure

Status: build
Owner: GLM
Reviewer: Codex
Base: `b95a6947369bf5d32db5746df0c82acae27b3663`
Branch: `codex/coverage85-glm-reforge-r1`
Capability: test-quality / coverage branch closure

## Codex build allowed

当前 fast 基线 reforge 为 statements `15761/17939`、branches `9657/12166`、functions
`2561/2916`、lines `14162/15662`；达到 package branch 85% 至少需闭合约 685 个既有
未覆盖 edges。不得把 685 当作测试数量，也不得为覆盖率改变产品或删除旧合同。

## 独占范围与明确合同点

只允许写 `packages/reforge` 的新专属测试、必要 typed fixture 和本卡证据；不得改产品实现、
旧测试、配置、baseline、真实 PAL 数据或其它卡目录。以公开 runtime/caller 为边界，优先核验：

- `src/main.ts:284-937`：启动参数/入口解析、project/source 装配、ready/error/abort 生命周期、
  host 注入和清理；每条测试必须走公开启动入口，不能调用私有函数或伪造 world state。
- `src/battle/battle-session.ts:385-803`、`src/battle/battle-core.ts:328-1139`：
  session phase、输入锁、目标选择、行动提交/拒绝、状态效果、胜负/逃跑/清理；分别覆盖
  空/单/多目标、合法/非法阶段和恢复路径，断言业务状态/事件而非内部调用次数。
- `src/script-runner.ts:234-820`、`src/script-runner-core.ts:175-638`、
  `src/script-host-adapter.ts:30-332`：脚本生命周期、yield/resume、unknown opcode、
  host capability、signal/exception/cleanup；用合成脚本和公开 host，不能接 PAL 世界后门。
- `src/entity-motion.ts:135-1031`、`src/script-project-core.ts`、`src/script-world.ts`、
  `src/runtime-script-project.ts`：移动/碰撞/边界、project scope、脚本世界隔离和恢复；只写
  与当前 content22/SAVE11 合同相符的 typed 输入。

不可由公开 caller 合法到达的宿主/错误臂必须留在 ledger 中，提供源码条件、调用图和反例，不能
用业务核心 mock、私有 state 或扩大 timeout 强行命中。

## 验收交付

每个 admitted branch family 都要有独立业务 oracle 和精确 fullName；重复同一状态轴、只断言
`toHaveBeenCalled`、只测 collection/runtime 错或空执行的用例不计入。反控按真实注入点逐项提供
原始/变异/恢复三态、唯一指定 AssertionError、执行身份和源 hash，拒收 pending/skip/额外错误。
禁止 `as unknown as`、`@ts-expect-error`、ignore/skip、产品实现改动和 baseline 手改。

回执包含 fresh `file×fullName×status` JSON、源 hash、branch delta、existing-proof/unreachable
账，以及定向/相邻/typecheck/lint/docs/diff 结果。以 reforge branch 达到 85% 或剩余臂有一手
不可达证明为收口条件；不得合 main/标 done，交 Codex 独立验收。

## 下一位 Agent 提示词

你是 GLM，负责本卡 Reforge runtime。先读 `AGENTS.md`、`CLAUDE.md`、`docs/phase2/READ-FIRST.md`、
本卡和 fast baseline，逐行核对 main/battle/script/motion 的真实 caller。只写本卡白名单；
交付时在本卡登记每个合同的源锚、合法输入、oracle、fullName、三态反控和覆盖变化，并给出
`accept` 或 `counter`；不得改产品、旧测、配置或标 done。

## GLM 交付回执（r5 窄返工，2026-10-04，待 Codex 独立验收）

- 候选分支 `codex/coverage85-glm-reforge-r1`（dispatch tip `76475c01c` 起，产品文件零改动，
  `git status` 仅新增本卡测试/脚本/证据）。
- **r5 窄返工（Codex 六项）**：① 删除误提交的字面量名文件 `packages/reforge/\$\{identityJsonPath\}`
  （r4 模板转义 bug 的产物）；② 反控回执 r5 重设计——clean 树前置强制、stdout/stderr 全量
  raw 文件入库（c85-counterproof-raw/，entry 只存路径）、executedSet/skippedSet 分账
  （skipped/pending 不入 credited 集合）、唯一业务 AssertionError（file×fullName+message+
  expectedErrorPart 指定匹配）、四态 hash 且 rebuilt 非空硬校验、变异前后树必须 clean、
  mkdtemp+finally 全临时文件清理；③ ledger/delta 脚本复跑后提交 JSON `git diff` 为空
  （逐字节可再生成，无绝对 worktree 路径、无固定 /tmp 路径）；④ `-t` 过滤的 executed/skipped
  分集记录进回执；⑤ 诚实覆盖率维持 80.44%（9787/12166，+130），未声称 85%，剩余可达分支
  后续范围不变；⑥ 全套门重跑后双段提交（主提交 + 干净树回执提交）。

- **r4 返工（Codex 七项）**：① 反控回执改为干净 checkout 流程生成（先提交全部工作使
  工作树 clean，再跑驱动，回执独立提交入库；本版 workingTree 快照为空 = 当前 SHA 有效
  证据）；② 回执字段齐备（command/cwd/env digest/stdout stderr/exit signal spawn/
  testFile×fullName/AssertionError/四 hash/tree-clean/零临时目录）；③ ledger/delta 两脚本
  mkdtemp+finally 零 /tmp 残留、输出确定性化（双跑逐字节一致，delta 去绝对路径），提交 JSON
  可重复再生；④ 继续补合法合同：script-runner 后台 AbortError 静默臂 + onTeleport stages
  臂、runtime 无行为/无钩子/完成游标复入安静臂（+2 净新臂，**+130**，80.44%，距 85% 差
  ~554，不达标不收口；entity-motion 侧踏求解器臂经探针实证需多拍场景，已列后续范围）；
  ⑤ 证据迁至 `docs/ops/evidence/TEST-COVERAGE85-GLM-REFORGE-1/`，docs/testing/README.md
  越界行已撤回基线；⑥ dedup/公开 observation/无 as never/无私有 __rf* 全部保持（复核零
  残留）。

- **r3 返工（Codex 七项）**：① 反控回执补齐 command/cwd/env（子集+digest）、stdout/stderr
  分轨尾、exit/signal/spawnError、testFile×fullName、original/mutant/restored/**rebuilt** 四
  hash、工作树 before/after 快照（零临时目录零残留证明），并加 vitest4 `-t` 零匹配 exit0
  的 vacuous 硬防（曾抓到旧名注入的假绿）；② family ledger 改为逐 fullName→family→源行→
  caller→oracle（`scripts/c85-family-ledger.mjs` 表驱动可重建，108 条全匹配）；③ 撤销与
  既有测试重复的 battle-core divide/transform/summon/混乱/重掷/濒死/enemies 别名与
  battle-session fleeBattle 合同（均闭合 0 新臂），偷窃合并为 notice/回落/c=0 非重复臂；
  ④ main.c85-boot 已无 __rf* 私有口（r2 完成，r3 复核零残留）；⑤ 本卡新增代码零 unsafe
  cast/`as never`（复核）；⑥ 证据路径全部指向候选内真实文件、修一处乱码、docs 改动仅
  卡内 3 文件；⑦ 重算 branch delta = **+128**（9785/12166 = 80.42%，距 85% 差 ~557 臂，
  未达标不收口），剩余可达分支的后续范围（main 长尾/battle-session 表现层观测口前提/
  runner-core 续跑帧/非合同域）已写入证据文档。

- **r2 返工（Codex 七项）**：① `c85-branch-delta.mjs` 修复 total++ ReferenceError，参数化
  lcov 路径可从干净 checkout 按脚本头注释重建，且双 lcov 原始拷贝随账提交；② 证据链接全部
  改指候选内真实文件（原 `evidence/` 幻路径已清）；③ 删除与 main.glm-n.test.ts 重复的
  gallery/battle-preview/party 四测（私有重复不计覆盖）；④ 删除 `Reflect.get(window,
  '__rfWorld'/'__rfScene')` 私有 debug 口，改 runtime-shell 公开 `observation()` 与 canvas
  DEV dataset（DOM 面）；⑤ 删除 script-world 两处 `as never` 强构造，on 值域守卫按类型不可
  达登记 U21；⑥ 反控驱动 r2：逐注入 try/finally 恢复、original/mutant/restored 三 sha256、
  command/cwd/exitCode、原始输出尾与执行身份，回执直接写提交目录；⑦ branch delta 重算
  （基线=排除本卡测试的 fast 全量 317 文件/8569 全绿，精确复现官方 9657 口径；终态 9784，
  **+127，不作为 85% 达标**——距 85% 仍差 ~557 臂）。
- **第一轮交付，未达 85%**：fast 口径 branches 9657→**9784**/12166（**+127**），
  statements +80 / functions +5 / lines +47（基线 317 文件/8569 测试全绿复现官方口径；终态 325 文件/8686 全绿）。逐文件闭合与剩余臂诚实披露见
  [证据](../evidence/TEST-COVERAGE85-GLM-REFORGE-1/README.md)。
- 新增 8 个专属测试文件 117 测试（r2 删除与既有 main.glm-n.test.ts 重复的 gallery/battle-preview/party 合同、删除 Reflect 私有 debug 口改 observation()/canvas dataset、删除 as never 强构造并登记 U21）（`*.c85-*.test.ts`，全部公开 caller：bootGame/BattleSession
  构造器+tick/createBattleState+stepBattle/decideEnemyAction/applyEnemyEffect/ScriptRunner/
  executeScriptHostEffect/planEntityMotion/ScriptProjectRuntime/RuntimeScriptRunner.runFlow/
  FlowRuntimeCoordinator/公开纯函数）；零 unsafe cast、零 `@ts-expect-error`、零 skip、
  零 timeout 扩大。
- 三态反控 9/9（`packages/reforge/scripts/c85-mutation-counterproof.mjs` r2：逐注入 try/finally 恢复，
  original/mutant/restored 三 sha256 + command/cwd/exitCode + 原始输出尾 + 执行身份；回执直接写入提交内
  `src/__tests__/coverage85/c85-mutation-counterproof.json`）。
- 账目：identity（`c85-identity-status.json` 117 条 file×fullName×status）、branch delta
  （`c85-branch-delta.json`）、family ledger（`c85-family-ledger.json` 源行/caller/oracle）、
  21 条不可达/防御臂判定（证据文档 U1–U21，各带源码条件+调用图+反例一手锚点）。
- 验证：定向 117/117 绿；全量 fast 325 文件/8686 测试全绿（含相邻既有文件与 battle-trial
  scripts 测试）；`typecheck` 0 错误；`pnpm lint` 全仓 3145 文件零诊断 PASS；`pnpm check:docs`
  PASS；`git diff` 产品零改动。
- 已知未闭合（非不可达，留后续轮）：main.ts 主循环/菜单/演出长尾（~780 臂）、battle-session
  表现层（~390 臂，`state` 为 private 无公开观测口，未越权反射）、script-runner-core 续跑帧
  内部（~24 臂）。85% 目标需后续轮继续或按卡面裁决。

## 下一位 Agent 提示词（更新）

Codex 独立验收：读本卡与 [证据](../evidence/TEST-COVERAGE85-GLM-REFORGE-1/README.md)，复跑
`node packages/reforge/scripts/c85-mutation-counterproof.mjs`（约 2 分钟，9 注入应全 PASS 且
源恢复）、`pnpm --filter @type-pal/reforge run typecheck`、定向 8 文件与全量 fast、
`pnpm lint`/`pnpm check:docs`。核对 identity/delta/family/不可达四账与源锚；重点抽查：
反控指定 AssertionError 是否唯一归因、U3/U10/U17 守卫锚是否仍在一手位置、121 测试是否与
既有 fullName 重复状态轴。裁决 accept/counter/rework；未验收前不合 main、不标 done。
