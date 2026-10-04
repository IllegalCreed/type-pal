# TEST-GLM-REFORGE-RUNTIME-SESSION-1 证据

分支 `codex/glm-reforge-runtime-session-r1`;base `origin/main` `6a5675efa`
(r2:Codex typecheck counter 后换基重放并完成基线归属核实;开卡基 `a2857c123`,
r1 基 `45d890e4c`,四目标源文件与其既有测试在各基间零变化,证据在 r2 基全量
重生成)。范围:runtime input router、frame session、world-motion runtime、
runtime project view 四文件的未证明公开合同(输入仲裁、帧推进、暂停/恢复、取消、
迟到回执、scene token 失效、world-view 替换),不做覆盖率百分比承诺。

## 交付物

- 4 个专属测试文件,15 条合同(全部公开 caller,零 unsafe cast、零 `@ts-expect-error`、
  零 skip、零 timeout 扩大、零业务核心 mock):
  - `packages/reforge/src/runtime-input-router.runtime-session-1.test.ts`(1):菜单层完整
    按键集合原样送达(路由器不预滤 Escape/F5/`[`、不旁路二次派发)。
  - `packages/reforge/src/runtime-frame-session.runtime-session-1.test.ts`(2):混合截止
    时间等待的到期子集逆向结算(含 0ms 与 `>=` 边界、未到期不连带);恢复后淡入从
    gameplay 时间推进而非墙钟。
  - `packages/reforge/src/world-motion-runtime.runtime-session-1.test.ts`(8):在途走位
    中止的来源署名消息与注册表清理;预中止信号四注册入口全拒;在途 auto 单步中止零
    续点残留;同目标重复注册的替换接管(同源 + auto 跨类);实体 authority 接管清空
    步态/侧避锁;单步 attempted 后与追逐取消后的迟到回执静默;scene token 注册时快照
    与 teardown 失效语义(含取消先于 authority 释放的顺序回执)。
  - `packages/reforge/src/runtime-project-view.runtime-session-1.test.ts`(4):hostile
    onLose 命令体剥离(gameOver/其余字段逐字);canonical 缺席实体的刷新跳过;
    scratch 可选腿(followers/mapOverride/entityLayer)深拷贝;runtimeProjectView 整体
    替换面(入口重投影、items 适配、scriptStore 显式 undefined、其余引用透传)。

## 三账(包内 `packages/reforge/src/__tests__/runtime-session-1/`)

- `rs1-identity-status.json`:15 条 file×fullName×status(重建:
  `node packages/reforge/scripts/rs1-identity-status.mjs`)。
- `rs1-family-ledger.json`:逐合同 name→family→源行→caller→oracle,与身份账双向唯一
  匹配(重建:`node packages/reforge/scripts/rs1-family-ledger.mjs`,仓库 biome 定稿,
  再生成逐字节一致,sha256 `8f7a2416…cab3ee` 双跑相同)。
- `rs1-mutation-counterproof.json` + `counterproof-raw/`:三态反控 **5/5 PASS**
  (重建:`node packages/reforge/scripts/rs1-mutation-counterproof.mjs`,clean-tree 前置,
  original/mutant/restored/rebuilt 四 sha256,console+json 原文全量落盘,
  executed/failed/skipped 分账,mkdtemp+finally 清理)。注入点:
  - `ROUTER-MENU-PREFILTER`(runtime-input-router.ts:37,菜单 input 预滤变异);
  - `FRAME-FADE-REALTIME`(runtime-frame-session.ts:104,淡入改喂 realNow);
  - `MOTION-MOVE-ABORT-MSG`(world-motion-runtime.ts:258,中止署名消息改写);
  - `MOTION-TOKEN-SNAPSHOT`(world-motion-runtime.ts:276 首处,token 快照改常量);
  - `VIEW-HOSTILE-ONLOSE-KEEP`(runtime-project-view.ts:154,onLose 剥离改保留)。
  每注入的指定用例以唯一业务 AssertionError 变红(执行分账 passed=0/failed=1),
  恢复与重建后回绿且 hash 一致。

## 既有证明账(排重,未重复建设)

- 输入仲裁:128 层组合链、确认/探索优先级、同帧菜单/对话阻断调试导航、商店/奖励吞
  Enter/Escape/`]`、对话层忽略非确认键(Escape/F5/F9/`]`)由
  `runtime-input-router.test.ts:5/32/50/63/77/87/102/111` 既有覆盖。候选补充
  "对话层方向键""商店吞 F5/F9"与既有同 caller/同 oracle(非确认键在活跃层不触发
  低层动作),按排重纪律不建合同。
- 帧推进/暂停:相位顺序、战斗采样与帧吞没、模态冻结、暂停不追帧、长帧上限、单步
  一次/复位/冻结组合、同截止时间等待逆序、abort/pre-abort/clear、错误同步传播、
  会话独立由 `runtime-frame-session.test.ts` 全量既有覆盖;本卡只补混合截止渐进
  子集与恢复后淡入时基两轴。
- 取消/替换:队伍走位替换与完成、双注册表 commit-先于-唤醒、authority 采样、追逐
  注册/取消回调、party epoch、trace 克隆/淘汰、teardown 全量取消由
  `world-motion-runtime.test.ts` 与 `.residual.test.ts` 既有覆盖;host-lifecycle 卡
  (已归档)不涉本四文件。
- world-view:页/行为/hook 投影、有→无→有刷新、completed 失效、shared/private 引用
  适配、items/scratch 别名隔离、hook 游标入场、依赖捕获稳定、入口只读由
  `runtime-project-view.test.ts`/`.boundaries.test.ts` 既有覆盖。

## 非合同与受阻账(blocked/non-contract)

- `completePartyMove(旧槽)` 身份守卫:替换即结算旧等待者,旧槽 `settled` 幂等墙使
  守卫在公开面不可区分(无唯一 oracle),不建合同(`world-motion-runtime.ts:243-245`)。
- teardown 钩子顺序(beforeCancelSlots→cancelAllSlots→beforeReleaseAllAuthority→
  releaseAllAuthority→invalidateSceneSession)的变异面在
  `motion-runtime-wiring.ts:189-203`,不在本卡四文件白名单内;顺序回执已并入
  scene token 合同断言(assert 前值),独立合同归 Codex 后续支配。
- `gameplay-clock`/`entity-motion`/`motion-batch`/`async-intent` 邻域文件不在本卡
  独占范围,仅作相邻回归运行,不新增合同。

## 基线缺陷披露(非本卡引入;Codex counter 后已完成一手归属核实,详见任务卡 counter 记录)

- `origin/main`(核实时 tip `6a5675efa`)上 `packages/reforge` typecheck 恒红 1 条:
  `src/pal-script-successor-governance.test.ts(11,27): TS2307` —— 该测试 import
  `docs/testing/script-governance/successor-repairs.json`,而提交
  `4548a895b1ef23e3fd0cd051d9208194be0366ce`("docs: finish testing layout
  cleanup",origin/main 祖先)已把该 JSON 以 R100 移入
  `docs/testing/archive/legacy/batches/script-governance/` 未同步测试引用。
- **归属一手复现(r2)**:`git worktree add --detach` 纯净检出 `origin/main`
  `6a5675efa`(零本卡文件),install 后 `pnpm --filter @type-pal/reforge run
  typecheck` → exit 2,唯一错误同址同文。根因链:测试 blob `2fcd7943` 自
  `379304503`(2026-10-03,当时旧路径 JSON blob `d64b1107` 在场)至 tip 未变;
  `4548a895b` 移档未同步 import。**结论:main 既有缺陷,非本分支拓扑**
  (本卡 diff 不触该测试与两个 JSON 路径中的任何一个)。
- 同一缺陷令该测试文件在 vitest 下收集失败(0 tests,import 解析失败)。全量
  reforge 333 文件中 332 过、唯一失败文件即它,其余 8700 测试全绿(8685 基线 +
  15 本卡)。修复涉旧测,按卡面约束留 Codex 一行修正;本卡未触碰、未加
  ignore/豁免。

## 验证

- 定向 4 文件 15/15 绿;相邻 12 文件 151 绿(六个同域旧测 + coordinator/clock/
  batch/wiring/entity-motion/async-intent);
- 全量 reforge:8700/8700 测试绿 + 上述基线失败文件单列;
- `pnpm --filter @type-pal/reforge run typecheck`:全包恰 1 错=基线 TS2307(归属见
  上节),本卡文件 0 错误;
- 全仓 `pnpm lint`:PASS,3287 文件 0 error/0 warning/0 info;
- `pnpm check:docs`(含 phase-lore governance)与 testing docs:PASS(0 issues);
- `git diff --check`:干净。r2 门禁数字均在新基 `6a5675efa` 重跑取得。
