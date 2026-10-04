# TEST-COVERAGE85-GLM-REFORGE-1 交付证据（r4）

Owner: GLM · Branch: `codex/coverage85-glm-reforge-r1`（base `b95a69473`，dispatch tip `76475c01c`）
状态: 待 Codex 独立验收（不合 main、不标 done）。r1 `76f3c6bf2` → r2 `746f0c4f8` → r3 `4cef72844` → r4 `75a12d84b`+`3c19c45cb` → r5 本版。

## 度量（fast 口径，与官方 runner 同参数）

| 指标 | 基线（baseline.fast.json） | 终态（r3） | Δ |
|---|---|---|---|
| branches | 9657/12166 (79.39%) | 9787/12166 (80.44%) | **+130** |
| statements | 15761/17939 | 15841 | +80 |
| functions | 2561/2916 | 2566 | +5 |
| lines | 14162/15662 | 14209 | +47 |

基线复现：在候选分支上以 `--exclude '**/*.c85-*.test.ts'` 跑同参 fast 全量 = 317 文件/8569
测试/9657 branches，与 `scripts/coverage/baseline.fast.json` 逐数一致（重建命令见
`packages/reforge/scripts/c85-branch-delta.mjs`（见 `c85-branch-delta.mjs`） 头注释；双 lcov
原始拷贝随账提交，可免跑复核臂级归属）。

**80.44% ≠ 85%：距 85%（10341 臂）仍差约 554 臂，本卡不作为达标收口**（见「后续范围」）。

## 交付物

- 8 个新专属测试文件、**113 个测试**（r4 追加 script-runner 后台 AbortError 静默臂/onTeleport stages 臂与 runtime 无行为/无钩子/完成游标复入安静臂）（identity 见
  `packages/reforge/src/__tests__/coverage85/c85-identity-status.json`（见 `c85-identity-status.json`）），
  全部公开 caller（bootGame / BattleSession 构造器+tick / createBattleState+stepBattle /
  decideEnemyAction / applyEnemyEffect / ScriptRunner / evalCondition / executeScriptHostEffect /
  planEntityMotion / ScriptProjectRuntime / ProjectScriptRuntimeHost / RuntimeScriptRunner.runFlow /
  FlowRuntimeCoordinator / 公开纯函数）；零 unsafe cast、零 `@ts-expect-error`、零 skip、
  零 timeout 扩大；不读 `window.__rf*` 私有 debug 口（观测面 = runtime-shell 公开
  `observation()` 与 canvas DEV dataset（DOM 面））。
- 逐 fullName → family → 源行 → caller → oracle 映射账
  `packages/reforge/src/__tests__/coverage85/c85-family-ledger.json`（见 `c85-family-ledger.json`）
  （由 `packages/reforge/scripts/c85-family-ledger.mjs`（见 `c85-family-ledger.mjs`） 从 vitest
  list + 表重建，未匹配即报错退出）。
- 三态反控 9/9：`packages/reforge/scripts/c85-mutation-counterproof.mjs`（见 `c85-mutation-counterproof.mjs`）
  → `packages/reforge/src/__tests__/coverage85/c85-mutation-counterproof.json`（见 `c85-mutation-counterproof.json`）。
- 逐文件臂级闭合账 `packages/reforge/src/__tests__/coverage85/c85-branch-delta.json`（见 `c85-branch-delta.json`）。

### 逐文件 branch 闭合（基线未覆盖 → 本卡闭合）

| 文件 | 闭合臂数 |
|---|---|
| src/script-runner.ts | 43 |
| src/script-host-adapter.ts | 26 |
| src/battle/battle-core.ts | 13 |
| src/script-world.ts | 19 |
| src/battle/battle-session.ts | 8 |
| src/main.ts | 7 |
| src/entity-motion.ts | 7 |
| src/runtime-script-project.ts | 5 |
| src/script-runner-core.ts | 2 |
| src/script-project-core.ts | 0 |
| **合计** | **130** |

### r3 重复合同撤销（覆盖信用回退）

以下合同与既有测试重复，r3 已删除、不计覆盖（闭合臂数按删除后重算）：

- battle-core：deprecated `enemies` 别名、divide 门/均分/扩上限、transform 保 HP 换 def、
  summon resolvedTarget/初始态、混乱派发（pass/咬同伴/自身豁免）、目标重掷、濒死睡眠挡
  dying —— 分别与 `battle-core.test.ts`（divide/transform/summon/站位）、
  `battle-enemy-confused.test.ts`（混乱/抽签）、`battle-casualty.test.ts`（伤亡 sweep）重复。
- battle-core 偷窃：入包/余量递减/偷光/偷钱 moneyDelta 与 `battle-core.test.ts:3074` 重复；
  合并为单条**非重复臂**测试（lastAction notice 文案、未知道具名回落 itemId、c=0 静默，
  即 battle-core.ts:651/654/663）。
- battle-session：fleeBattle 演出臂与 `battle-session.test.ts:1405` 重复，已删。

## 反控回执（r5 字段与清洁生成流程）

r5 设计：驱动**前置强制 clean 树**（非 clean 直接 abort，receipt 因此绑定当前 SHA）；
每针三次运行采用 default+json 双 reporter——stdout/stderr **全量原始文件**入库
`packages/reforge/src/__tests__/coverage85/c85-counterproof-raw/<ID>.<phase>.stdout/.stderr`
（JSON entry 只存路径不存正文）；json report 解析出 `executedSet`（status=passed|failed）
与 `skippedSet`（skipped/pending/todo，**不进入任何 credited 集合**）；`vacuous`
（executedSet 为空，即 vitest4 `-t` 零匹配 exit0 陷阱）硬防；变异命中的唯一业务
AssertionError 以 `businessAssertionError`（file×fullName+message）记录并按
`expectedErrorPart` 指定匹配；四态 hash original/mutant/restored/rebuilt（rebuilt 非空且
=original 硬校验）；变异前后工作树快照必须 clean；驱动临时文件全部 mkdtemp+finally 清理。

（历史：r4 起回执在干净树上生成；r3 及以前的 dirty-tree 回执仅作历史，不作证据。）

r4 起回执在**干净 checkout**上生成：先提交全部工作（工作树 clean），再运行驱动，回执作为
独立提交入库——`workingTreeBefore/After` 快照在本版为空串（零 M/??），即当前 SHA 的有效
证据。r3 及以前回执含 dirty-tree 快照，仅作历史保留，不作证据。

每注入记录：`testFile`×`fullName` 执行身份；三次运行各自的 `command`/`cwd`/`env`（关键
变量子集 + 全环境 sha256 digest）/`exitCode`/`signal`/`spawnError`/`timedOut`/
`stdoutTail`/`stderrTail`；`originalSha256`/`mutantSha256`/`restoredSha256`/`rebuiltSha256`
四 hash（rebuilt = 恢复运行结束后再读源文件）；变异写入在 try/finally 中恢复并逐字节复核；
驱动零临时目录（变异原位进行），`workingTreeBefore/After` git status 快照证明零残留；
vitest4 `-t` 零匹配 exit0 陷阱以 `vacuous` 标记硬防。

每注入记录：`testFile`×`fullName` 执行身份；三次运行各自的 `command`/`cwd`/`env`（关键
变量子集 + 全环境 sha256 digest）/`exitCode`/`signal`/`spawnError`/`timedOut`/
`stdoutTail`/`stderrTail`；`originalSha256`/`mutantSha256`/`restoredSha256`/`rebuiltSha256`
四 hash（rebuilt = 恢复运行结束后再读源文件，证明恢复运行本身未再改源）；变异写入在
try/finally 中恢复并逐字节复核；驱动零临时目录，`workingTreeBefore/After` git status 快照
证明零残留；vitest4 `-t` 零匹配 exit0 陷阱以 `vacuous` 标记硬防（vacuous 运行不得当作
绿/红证据）。

## 不可达/防御臂账（U1–U21）

| # | 源锚 | 判定 | 一手证据 |
|---|---|---|---|
| U1 | script-runner.ts:392 | `yieldForJump` 内同步 abort 复查：同步 ScriptJump 抛出前的最后 `throwIfAborted`（:359/367/374）与 yield 之间无 await 窗口；abort 只能先落 :388 listener 臂。 | runBody→exec(同步 throw)→runLoop catch→yieldForJump 调用图。 |
| U2 | script-runner.ts:504 default | switch 穷尽性：`Command` 联合已全 case；default 的 `never` 由编译器保证。 | script-runner.ts:826-830 `const unhandled: never`。 |
| U3 | script-host-adapter.ts:57-60 | vanishEntity case：current 编译守卫拒绝（`runtime-script-compiler.ts:151`）+ `runtime-script-project.ts:104` 二道 + `BaseRuntimeLeafCommand` Exclude（script-compiler-core.ts:21）。 | 三重守卫 file:line；合法输入在守卫 fail-loud。 |
| U4 | script-host-adapter.ts:31-32 | runEntityTrigger throw：`ProjectScriptRuntimeHost.execute`（runtime-script-project.ts:168-174）先拦截并要求 interactive+调用桥。 | 调用图 + 本卡两道门各自 fail-loud 实证。 |
| U5 | battle-core.ts:453 | divide 槽位越界 throw：唯一 caller 传入 slot ∈ [0,MAX_ENEMIES)。 | battle-core.ts:1017-1037 调用图。 |
| U6 | battle-core.ts:556 | 新毒未落槽 throw：'applied' 同步栈内刚 push（:541），findIndex 必中。 | :539-544 同步序。 |
| U7 | battle-core.ts:951 | 混乱敌 upper<0 pass：存在活敌 ⇒ maxEnemyIndex ≥ 0 ⇒ upper ≥ 0。 | :331-350 + :950。 |
| U8 | battle-core.ts:927 | sampleLivePlayerSlot 全灭兜底：decideEnemyAction 在 :941 对零活玩家提前 pass。 | :940-944 早退。 |
| U9 | script-runner-core.ts:175 | compilerVersion 不匹配：executable 仅由同进程 compile* 产出并盖当前版本。 | script-compiler-core.ts:122 / runtime-script-compiler.ts:52 唯二产出点。 |
| U10 | script-runner-core.ts:442/445/448/451 | 控制命令位置守卫：author 校验（content author-script-core.ts:733-764）拒绝越位；两个编译入口都跑该校验。 | 校验源码 file:line。 |
| U11 | script-runner-core.ts:328/366/540 | 缺帧/缺命令 defensive：for 由 length 界定；调用点必先 push 帧。 | 循环边界调用图。 |
| U12 | script-runner-core.ts:595 | shared executable 过期 throw：resolver 同进程编译带同 digest，mismatch 不可构造。 | BaseSharedScriptResolver 唯一产出。 |
| U13 | script-project-core.ts:572-573 | withSaveBarrier 异步快照拒绝：`SynchronousSnapshot<T>` 把 Promise 返回收窄为 never。 | script-project-core.ts:382 类型定义。 |
| U14 | script-project-core.ts:100 | entityAt scene 不匹配 throw：target 由同一 scene 构造（:410）。 | :409-411。 |
| U15 | runtime-script-project.ts:104 | vanishEntity 拒绝（同 U3 守卫族）。 | runtime-script-compiler.ts:151。 |
| U16 | main.ts:558 | `world.script ?? empty`：buildWorld 恒物化 script。 | content character.ts buildWorld `script: {`。 |
| U17 | main.ts:436-438 | requireSpriteDef throw：loader 参照校验把缺精灵引用判 error。 | content validate-refs.ts:1476 + validate-refs.test.ts:558。 |
| U18 | main.ts:300/461/801/834/843 | `import.meta.env.DEV` false 臂为生产构建常量；vitest 环境 DEV 恒 true。 | 构建期常量。 |
| U19 | entity-motion.ts:177/183 | required* throw：求解器查询只发生在 normalization（:393-455）后的固定键集合上。 | normalization 调用图。 |
| U20 | battle-core.ts:1218-1232 | applyPlayerSkill 缺技能/限用/MP 守卫：源注『正常不可达:validatePlayerAction 已降级』。 | battle-core.ts:1928-1937 前置。 |
| U21 | script-world.ts:306 | activation `on` 值域守卫：`TriggerActivation.on` 联合类型已排除非法值，类型化 caller 不可构造。 | content 类型定义；r1 曾 `as never` 强构造被 r2 删除。 |

## 后续范围（剩余可达分支，85% 需再闭 ~557 臂）

按域列出剩余可达未覆盖臂的规模与所需 harness（非不可达，是后续轮工作面）：

1. **main.ts 主循环/交互长尾（~780 臂）**：输入路由、菜单流、存档流、演出宿主回调分支。
   驱动方式 = runtime-shell `installShellHost` + `key()/frame()` 逐场景推进（本卡 boot 区间
   已验证该 harness 可行）；按 main.<domain>-flows 系列既有家族模式扩展。
2. **battle-session.ts 表现层（~390 臂）**：render/timeline/结算屏/召唤染色。`state` 为
   private 且无公开观测口——需先落产品观测口（公开 snapshot/observer）或以
   `render(ctx)` + 录制 ctx 断言 draw 序列；观测口落地前无法合法断言，本卡未伪造。
3. **script-runner-core.ts 续跑帧内部（~22 臂）**：需手工 `AutoCommandFrame` 续跑 fixture
   （resume frames 带 control phase），属 checkpoint/continuation 专项。
3b. **entity-motion.ts 求解器臂（~41 臂）**：sideCandidate 符号臂/持杖候选/求解器让位与
   预约臂——探针实证「party 正面撞静止 NPC 的首次规划被拒（reason=actor）」，侧踏接受需
   按运行时 side-stick 重试纪律构造多拍场景，属运动专项续卡。
4. **其余 reforge 文件（dither/audio/save codec/menu 等，~160 臂）**：不在本卡合同四域，
   归后续通用覆盖轮。

## 验证

- 定向：8 个新文件 113/113 绿。
- 全量：fast 全量 325 文件/8682 测试全绿（基线复现 317 文件/8569 全绿）。
- typecheck：零错误。lint：全仓 3145 文件零诊断 PASS。docs：PASS。
- 反控：9/9（含 vacuous 零匹配硬防）；四 hash 对账 + 工作树快照零残留。
- diff：产品文件零改动（`git status` 仅本卡测试/脚本/证据/文档）。
