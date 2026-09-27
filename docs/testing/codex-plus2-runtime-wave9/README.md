# Codex 自有覆盖率第十批 · 当前脚本命令与施法时间线

本批只新增三份 Reforge 测试共 14 项、两份隔离负控工具及本回执；
生产代码、现有测试、资源、统计排除、官方 testSelection 和覆盖率门槛零改。
命令测试通过完整 `ScriptHost` 端口运行真实 `ScriptRunner`，消费者为当前编辑器
脚本预览；动画测试运行战斗会话当前调用的 `buildPlayerCast`、`buildEnemyCast`、
`buildOffMagic`，不借私有字段反射或修改核心实现。

| 新文件 | 项数 | 业务断言 |
|---|---:|---|
| `script-runner.dispatch-residual.test.ts` | 8 | 批量实体状态、位置/图层/波幅、clean 宿主能力、追逐 self、形象 patch、商店阻塞、逃跑分支、地图覆写与缺黑屏能力拒绝 |
| `battle-anim.summon.residual.test.ts` | 4 | 神将入退场与二级音、零召唤、四类正式落点、非召唤前摇与敌受击数字 |
| `battle-anim.enemy-cast.residual.test.ts` | 2 | 敌法术无专属帧回落、屏波/前后震/烙背景/音效、缺目标底锚 |

`node docs/testing/codex-plus2-runtime-wave9/mutants.mjs` 钉住图层世界写回、
召唤二级音抑制、敌法术背景烙印三处单点；每针精确运行新增测试标题，
绿对照与红例分别通过、业务 `AssertionError`，拒绝超时及其它异常，并核
生产源码 SHA-256 前后相同。新增及相邻八文件 **93/93**、Reforge typecheck
和五个改动代码文件 Biome **零诊断**。

画面时间线断言不是浏览器像素、音轨或剧情通关验收。整批串行
`pnpm check` exit0：全仓 **10,143** 项、docs PASS、严格 lint 扫描 **2,382** 文件，
error/warning/info 均为 0。官方 `pnpm coverage:ratchet` exit0 后，以
`TYPE_PAL_COVERAGE_BASE_REF=af84871d pnpm coverage:fast` 对同一冻结候选
执行受保护单次严格复核，exit0。两次 fast 均为 **9,682** 项/730 生产文件，
全仓分支 **47,489/63,323=74.99%**。相对上一批 47,425/63,323，
Codex 自有测试净增 **64** 个已覆盖臂、分母不变；Reforge 包
8,230/11,458→8,294/11,458。

用户本轮从 46,201/63,315=72.970070% 起算的绝对 +2pp 当前分母阈值
为 47,474/63,323，本次高出 **15** 臂；精确提升 **2.024797pp**。
原冻结 +5pp 目标（68.723290%→至少73.723290%）亦已超过，精确
提升 **6.271578pp**。这只是官方 fast 范围；full/Q1/Q2、浏览器画面、
远端 CI 以及独立帧编辑工作包仍另证，不随本批自动关闭。
