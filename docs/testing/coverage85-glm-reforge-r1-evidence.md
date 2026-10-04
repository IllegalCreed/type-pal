# TEST-COVERAGE85-GLM-REFORGE-1 交付证据

Owner: GLM · Branch: `codex/coverage85-glm-reforge-r1`（base `b95a69473`，dispatch tip `76475c01c`）
状态: 待 Codex 独立验收（不合 main、不标 done）

## 交付物

- 8 个新专属测试文件（`*.c85-*.test.ts`，117 测试（r2 删除与 main.glm-n.test.ts 重复的 gallery/battle-preview/party 四测），全部公开 caller 入口、零 unsafe cast/`@ts-expect-error`/skip/timeout 扩大）。
- 2 个证据脚本：`packages/reforge/scripts/c85-mutation-counterproof.mjs`（三态反控驱动）、`packages/reforge/scripts/c85-branch-delta.mjs`（基线对比）。
- 证据 JSON 全部提交在候选内 `packages/reforge/src/__tests__/coverage85/`：[identity（file×fullName×status）](../../packages/reforge/src/__tests__/coverage85/c85-identity-status.json)、[branch delta](../../packages/reforge/src/__tests__/coverage85/c85-branch-delta.json)（附基线/终态 lcov 原始拷贝）、[family ledger](../../packages/reforge/src/__tests__/coverage85/c85-family-ledger.json)、[mutation receipt](../../packages/reforge/src/__tests__/coverage85/c85-mutation-counterproof.json)。

## 度量（fast profile，与官方 runner 同参数）

| 指标 | 基线（baseline.fast.json） | 终态 | Δ |
|---|---|---|---|
| branches | 9657/12166 (79.39%) | 9784/12166 (80.42%) | **+127** |
| statements | 15761/17939 | 15841 | +80 |
| functions | 2561/2916 | 2566 | +5 |
| lines | 14162/15662 | 14209 | +47 |

逐文件 branch 闭合（基线未覆盖 → 本卡闭合的臂数，详见 [c85-branch-delta.json](../../packages/reforge/src/__tests__/coverage85/c85-branch-delta.json)）：

| 文件 | 闭合臂数 |
|---|---|
| src/script-runner.ts | 41 |
| src/script-host-adapter.ts | 26 |
| src/script-world.ts | 19 |
| src/battle/battle-core.ts | 12 |
| src/battle/battle-session.ts | 8 |
| src/main.ts | 7 |
| src/entity-motion.ts | 7 |
| src/runtime-script-project.ts | 5 |
| src/script-runner-core.ts | 2 |
| src/script-project-core.ts | 0 |
| **合计** | **127** |

诚实声明：未达到 85%（需 ~685）。本卡为第一轮交付：117 个新测试身份、127 个基线未覆盖 branch 闭合、9 个真实注入点三态反控全过、21 条不可达判定（U1–U21）带一手证据。剩余 ~2377 未覆盖臞中：main.ts（~780）与 battle-session.ts（~390）的长尾为「可达但未覆盖」（多数需要交互式 shell/渲染断言 harness），不在本轮闭合；见下方账目。

## admitted branch family 账（每家族：源行/caller/合法输入/oracle）

完整逐测试映射见 [c85-family-ledger.json](../../packages/reforge/src/__tests__/coverage85/c85-family-ledger.json)。抽样（合同区间内）：

- `script-runner.ts:510,518,521,528` — `ScriptRunner.run`（公开）合成命令缺省臂：fade 300/dither 720/chase range 8 speed 4/vanish seconds 2，oracle = 宿主收到的逐参调用序。
- `script-runner.ts:234-287` — `evalCondition`（公开导出）条件臂：var 六算子、flag 缺省 false、ownsItem atLeast 缺省、currentScene 缺查询 fail-loud、all/any/not、entitiesNear/facingEntity 透传。
- `script-host-adapter.ts:30-332` — `executeScriptHostEffect`（公开）跨场景 EntityAddress 过滤臂（14 命令逐命令零派发）、loadScene spawn 三字段臂、setActorAppearance 部分补丁臂、后台 playEntityAction 失败上报/abort 静默臂。
- `battle-core.ts:488-517` — `createBattleState`+`stepBattle`（公开）毒 tick：mpDelta 分侧（玩家扣蓝/敌无 mp 槽跳过）、毒名缺省合成、grantItem 叠已有槽位。
- `battle-core.ts:632-666` — cast 效果链驱动 performSteal：偷钱 R(2,3) 分成/moneyDelta/notice、偷物入包、未知名回落 itemId、余量耗尽一无所获。
- `battle-core.ts:866-971` — `decideEnemyAction`（公开）：沉默 cast fallback 拦截（经 fallback 动作路径）、transform/summon 缺数据落普攻 log、无 enemyId 召唤回落自身、混乱咬同伴/自身豁免、随机目标重掷。
- `battle-session.ts:845-850,697-702` — 公开构造器+tick 驱动演出动作：stopMusic fadeMs>0 排程/越时原 serial 停曲/排程后 cancel serial 失配静默、fleeBattle 敌逃终局、applyActorGrowth 队伍外角色 fail-loud、endBattle 重复登记 fail-loud、构造期形象缺定义 fail-loud、cancel 双守卫。
- `script-world.ts:131-445` — 公开纯函数与 `FlowRuntimeCoordinator`：page/behavior/hook 校验 fail-loud、inherit 清除手动选择、租约 epoch/停机臂、barrier 句柄 release/cancel 全臂、activation gate 中止、owner idle 唤醒。
- `entity-motion.ts:393-672` — `planEntityMotion`（公开）输入验证：重复 actor/空足迹/重复意图/缺 actor/过期原点/非法 quantum/epoch/侧杖四类非法、公平拍非整数、原地意图朝向回落、floating 无视地形。
- `runtime-script-project.ts:329-462` / `script-runner-core.ts:175-186` — 公开 `ScriptProjectRuntime`/`ProjectScriptRuntimeHost`/`RuntimeScriptRunner.runFlow`：digest 校验、script 初始化、runEntityTrigger 时机/桥缺失/派发、lifecycle 提交、私有脚本缺席、场景错位安静 false、completed cursor 双臂、resume 缺游标、gate stop。
- `main.ts:284-937` — 公开 `bootGame`：?gallery 速查图臂、?battle-preview 摆位/拒绝臂、?party 覆写拉满、?motion-entity 探针在场/缺席、indexedDB 缺席回落 MemorySaveStore。

## 不可达/防御臂账（源码条件 + 调用图 + 反例）

| # | 源锚 | 判定 | 一手证据 |
|---|---|---|---|
| U1 | script-runner.ts:392 | `yieldForJump` 内 `if (this.signal.aborted) abort()` 同步复查：同步 ScriptJump 抛出前的最后 `throwIfAborted`（:359/367/374）与 yield 之间无 await 窗口，abort 只能先落在 :388 的 listener 臂（已覆盖）。 | 调用图 runBody→exec(同步 throw ScriptJump)→runLoop catch→yieldForJump；无 await。 |
| U2 | script-runner.ts:504 default | switch 穷尽性：`Command` 联合已全 case；default 分支的 `never` 由编译器保证。 | script-runner.ts:826-830 `const unhandled: never`。 |
| U3 | script-host-adapter.ts:57-60 | vanishEntity case：current 编译守卫直接拒绝（`runtime-script-compiler.ts:151`『current 禁止 vanishEntity』）；`runtime-script-project.ts:104` 二道拒绝；`BaseRuntimeLeafCommand` 类型 Exclude（script-compiler-core.ts:21）。公开 caller 无法投递该叶。 | 三重守卫 file:line。反例：任何经 `compileRuntimeCommands`/`compileBaseCommands` 的合法输入在守卫处 fail-loud。 |
| U4 | script-host-adapter.ts:31-32 | runEntityTrigger throw：`ProjectScriptRuntimeHost.execute`（runtime-script-project.ts:168-174）先于 adapter 拦截并要求 interactive+调用桥；adapter 的 throw 对公开 runtime 不可达。 | 调用图 + 我的测试实证两道门各自 fail-loud。 |
| U5 | battle-core.ts:453 | divide 槽位越界 throw：唯一 caller `applyEnemyEffect` divide 传入的 slot 来自 `emptyEnemySlotIndices(s, MAX_ENEMIES)` ∈ [0,MAX_ENEMIES)，恒不越界。 | battle-core.ts:1017-1037 调用图。 |
| U6 | battle-core.ts:556 | `applyEnemyPoisonEffect` 新毒未落槽 throw：`tryApplyPoisonToEnemy` 返回 'applied' 的同同步栈内刚 push（:541），findIndex 必中。 | :539-544 同步序。 |
| U7 | battle-core.ts:951 | 混乱敌 upper<0 pass：decideEnemyAction 要求存在活敌 e；任何活敌 ⇒ maxEnemyIndex ≥ 0 ⇒ upper ≥ 0。maxEnemyIndex=-1 仅在零敌槽建态出现，此时无 e 可传。 | battle-core.ts:331-350 + 950。 |
| U8 | battle-core.ts:927 | sampleLivePlayerSlot 全灭兜底 `alivePlayers(s)[0] ?? target`：decideEnemyAction 在 :941 已对零活玩家提前 return pass，采样永不在全员死亡时进行。 | :940-944 早退。 |
| U9 | script-runner-core.ts:175 | compilerVersion 不匹配：可执行对象仅由同进程 `compileBaseScriptFlow`/`compileRuntimeScriptFlow` 产出并盖当前版本；公开 API 不接受外来 executable。 | script-compiler-core.ts:122 与 runtime-script-compiler.ts:52 唯二产出点。 |
| U10 | script-runner-core.ts:442/445/448/451 | 控制命令位置守卫：author 校验（content author-script-core.ts:733-764）拒绝 finishStep 出正文根/returnScript 出脚本根/breakLoop/continueLoop 出词法循环；两个编译入口都跑该校验，编译产物不可能违反位置。 | 校验源码 file:line。 |
| U11 | script-runner-core.ts:328/366/540 | 缺帧/缺命令 defensive：runCommands 的 for 由 commands.length 界定；runCommand/runLoopCommand 仅由已 push 帧的调用点进入。 | 循环边界调用图。 |
| U12 | script-runner-core.ts:595 | shared executable 缓存过期 throw：resolver（BaseSharedScriptResolver/RuntimeSharedScriptResolver）同进程编译并带同 digest， mismatch 不可构造。 | script-compiler-core.ts BaseSharedScriptResolver 唯一产出。 |
| U13 | script-project-core.ts:572-573 | withSaveBarrier 异步快照拒绝：`SynchronousSnapshot<T>` 类型把 Promise 返回的 snapshot 收窄为 never，类型化 caller 无法传入。 | script-project-core.ts:382 类型定义。 |
| U14 | script-project-core.ts:100 | entityAt scene 不匹配 throw：target 由同一 scene 对象构造（:410 `const target = { scene: scene.id, entity: entityId }`），scene.id !== target.scene 不可构造。 | :409-411。 |
| U15 | runtime-script-project.ts:104 | vanishEntity 拒绝（同 U3 守卫族）。 | runtime-script-compiler.ts:151。 |
| U16 | main.ts:558 | `world.script ?? emptyWorldScriptState()`：buildWorld 恒物化 script 字段。 | content character.ts buildWorld `script: {` 物化行。 |
| U17 | main.ts:436-438 | requireSpriteDef throw：loader 参照校验把不在 sprites 注册表的引用判 error，公开 bootGame 的工程不可能带缺精灵引用进场。 | content validate-refs.ts:1476『不在 sprites 注册表』+ validate-refs.test.ts:558 同轴既有测试。 |
| U18 | main.ts:300/461/801/834/843 | `import.meta.env.DEV` 的 false 臂为生产构建常量；vitest 环境 DEV 恒 true，false 臂在测试环境不可达（与官方 coverage 工具口径一致，不以此豁免质量门）。 |
| U19 | entity-motion.ts:177/183 | requiredMapValue/requiredArrayValue throw：求解器内部查询全部发生在 normalization（:393-455 已验证存在性）之后的固定键集合上。 | normalization 调用图。 |
| U20 | battle-core.ts:1218-1232 | applyPlayerSkill 缺技能/酒神限用/MP 不足守卫：源注『正常不可达:validatePlayerAction 已降级』（:1225/1232 原注），入队动作先经降级。 | battle-core.ts:1928-1937 validatePlayerAction 前置。 |
| U21 | script-world.ts:306 | trigger activation `on` 值域守卫：`TriggerActivation.on: 'interact' \| 'touch'`（content 类型）已把非法 on 排除在类型层，类型化 caller 无法构造 `on:'auto'` 输入；守卫为跨层双保险。 | content 类型定义 + 本卡 r1 曾用 `as never` 强构造被 r2 删除（返工第 5 条）。 |

## 剩余可达未覆盖（诚实披露，非不可达）

- main.ts 长尾（~780 臂）：主循环/菜单/存档/演出交互路径，需 shell-host 逐场景驱动（本轮只交付启动区间 7 臂 + 探针）。
- battle-session.ts 表现层（~390 臂）：render/timeline/结算屏臂，需录制 ctx 或公开 state 观测口（`state` 为 private，本卡未获公开观测口，未越权反射）。
- script-runner-core.ts 续跑帧内部（~24 臂）：需手工 AutoCommandFrame 续跑 fixture。
- 其余 reforge 文件（dither/audio/save codec 等，~700 臂）：不在本卡合同四域内。

## 验证

- 定向：8 个新文件 117/117 绿（`vitest run <files>`）。
- 相邻/全量：fast profile 全量 325 文件 / 8691 测试全绿（含 battle-trial scripts 测试与全部既有相邻文件）。
- typecheck：`pnpm --filter @type-pal/reforge run typecheck` 零错误。
- 反控：`node scripts/c85-mutation-counterproof.mjs` 9/9（原始绿→变异红[指定 AssertionError]→恢复绿；r2 驱动逐注入 try/finally 恢复 + original/mutant/restored 三 sha256 + command/cwd/exitCode/输出尾），receipt [c85-mutation-counterproof.json](../../packages/reforge/src/__tests__/coverage85/c85-mutation-counterproof.json)。
- 产品零改动：`git status` 仅新增本卡测试/脚本/证据文件；反控驱动的变异全部原地恢复（sha256 对账）。
