# TEST-GLM-EVENT-WAVE-K-1 — 一阶段事件系统六组当前脚本合同补测

Status: done
Owner: GLM Wave K（本包唯一测试 Coding Owner）
Reviewer: Codex（独立验收、选择性集成与官方覆盖结算）
Phase: phase1
Capability: current-script-contract / coverage

## 准入、前提与上下文锚点

2026-09-29 用户要求再给 GLM 一包。Codex 核定此包只增当前一阶段脚本的非重复测试与隔离证据，
**build allowed**；不修改任何产品、旧测、共享配置、原始/提取资产、官方基线、既有任务卡。
[冻结表](../../../../testing/glm-event-wave-k/targets.json)指定唯一产品目标和六个新测试路径；
先运行 `node docs/testing/glm-event-wave-k/verify-targets.mjs`。
源 SHA256 `c3332dd087e5b7b3ef5b9056c32a27d342a93d6f087c516b904ec40949868fcb`，
与 Kimi/GLM 六个既有目标队列无交集。最新 fast 报告对该源显示 595 个未覆盖分支，
但它并非收益承诺；旧 `event-system.test.ts` 约 6,000 行，必须先逐项排重。

| 方向 | 一手依据与边界 |
|---|---|
| 原版 / primary source | 具体 opcode 的操作数先核 `data/raw/SSS.MKF` 或只读、字节不变的提取结果；`reference/sdlpal/script.c:587,3140,3482` 只证 SDL 引擎路径，不冒充 pal.exe 实测。未核实的原版细节不得固化为测试预期。 |
| 第一阶段 | `packages/game/src/core/event-system.ts:1208,1471,2903,3286,5035` 是 auto、事件、战斗脚本/物品及进场入口；`packages/game/src/core/mode.ts:63,91` 和 `battle/actions/item.ts:97` 是现行调用方。`CLAUDE.md`、`docs/phase1/engineering-notes.md:71-100` 的双解释器与帧序警戒必须读。 |
| 当前二阶段 | N/A：本包只测试 `packages/game`，不拿 Reforge 的行为来定义一阶段真值，不改二阶段产品。 |
| 本任务目标 | before → after：产品脚本语义不变；用合法输入为尚未被旧测证明的当前公开合同增加可失败回归。 |

最强替代解释是历史未命中分支已由别的测试/相邻入口证明、是防御死路或需要非法状态才能进入。
可证伪观察：读完整旧断言和现行 caller 后找不到新可达合同，或只靠私有调用/非法 fixture 才能打中，
则该组记 `existing-proof/unreachable`，不写伪新测。若原始字节/SDL/当前行为相冲突、发现真 bug、
或需改产品语义，停该组交 Codex 另卡裁决；不得把当前错误行为写死成“原版”。

## 六组交付范围

组别、标题和新测试路径由[冻结表](../../../../testing/glm-event-wave-k/targets.json)唯一规定：
K01 trigger 游标/子脚本/恢复，K02 auto/onEnter/等待，K03 物品金钱商店队伍，
K04 场景对象地图相机，K05 对话调色板音画，K06 战斗/大世界脚本与失败门。
每组至少交「caller、旧测 fullName/断言、一手真值、缺口结论」审计行；
只有确有新合同才新增正反成对测试。特别排除 I wave 所领
`event-opcode-player.ts` 的测试重做，也不修改 Codex 正在推进的 E2E-R4-1 或二阶段任务。
GameState 走现行构造器，脚本入口走实际导出与调度；必要的只读原版脚本可抽最短真实序列，
记录 source index/字节与截取方式。负控从合法输入单轴变异，断言前后状态/命令与帧序；
不得 `any`、双强转、`@ts-ignore`/`@ts-expect-error`、mock 核心逻辑、私有 API 强访。
全局 handler 注册、随机源、fake timer、环境变量均在 `finally` 复原；不用睡眠代替时间合同。

写入白名单：冻结表中六个新测试路径（无需为已证/不可达组制造文件），
`packages/game/src/core/__tests__/glm-event-wave-k/**` 内 typed fixture，
`docs/testing/glm-event-wave-k/**` 的证据/只读核对/反控脚本。
任务卡、看板、共享索引由 Codex 独占；GLM 只在专属 evidence/README 记录交付。
工作树 `/Users/zhangxu/.codex/worktrees/glm-union-intake/type-pal`，
分支 `codex/glm-event-wave-k-r1`；此树已从 A–J 集成工作释放并复用。

## 验收与交接

- `node docs/testing/glm-event-wave-k/verify-targets.mjs` 通过；产品 1/1 hash 与冻结一致。
- 新鲜定向六组及旧 `event-system.test.ts`、相邻 `mode`/`scene-system`/相关战斗调用测试通过，
  Vitest JSON列新增 file/fullName/status，注明旧测复跑范围；若组仅作排重，记零新测理由。
- 选 2–4 个跨不同组的代表新业务断言做单点反控：同一判据验证无注入正控 exit0，
  注入后只有指定测试的一个业务断言红且进程 exit1、实际执行数非零；混错、skip、timeout、
  零执行、收集错误、基础设施红均 invalid。反控须能在候选分支独立复跑并清理临时注入。
- `pnpm --filter @type-pal/game run typecheck`、`pnpm lint` 完整报告、
  `node scripts/docs/check.mjs`、`git diff --check`；硬性 error/warning/info 全为零。
  若仓库外因素阻断，交原始日志，不谎报通过。
- 提交推送完整 40 位候选 SHA；回执含六组对照、确证/未证、反控判据、完整诊断计数。
  GLM 不合 main、不改官方 baseline、不运行/解释正式 ratchet/受保护 fast、不标 done。
  Codex 独立审候选及业务反控后选择性集成，再串行全仓 `check → ratchet → protected fast`，
  只以 main 并集实测报告收益。当前全仓 78.12%，仍差 4,360 臂才到 85%。

准入核对：2026-09-29 Codex 直接核现行调用入口、旧测厚度、冻结源码 SHA、与既有六队列零交集，
卡面限定单一写入 Owner 和测试/证据白名单；`review → done` 待独立验收。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-EVENT-WAVE-K-1 的唯一测试 Coding Owner。只在
/Users/zhangxu/.codex/worktrees/glm-union-intake/type-pal 的
codex/glm-event-wave-k-r1 分支工作。先读 AGENTS.md、CLAUDE.md、
docs/phase1/engineering-notes.md、docs/phase1/game-mechanics.md、
docs/ops/tasks/TEST-GLM-EVENT-WAVE-K-1-current-script-contracts.md、
docs/testing/glm-event-wave-k/README.md 与 targets.json，并运行 verify-targets.mjs。
逐组核现行 caller、reference/sdlpal/script.c/必要的原始脚本字节，通读旧
event-system.test.ts 和相邻旧测试的实际断言；只为可达、未重复的当前公开合同加新测试。
只写冻结六个新测试路径、专属 typed fixture 和本包隔离证据/反控；产品、旧测、
共享配置/依赖、原始/提取资产、官方基线、任务卡/看板均只读。不从覆盖分支数推断语义，
不改产品凑绿；真 bug/原版争议单列诊断停对应组。复跑新测和相关旧测、Game typecheck、
完整 pnpm lint 0/0/0、docs/diff、2–4 枚代表反控。交六组 caller→旧证→新证或
existing-proof/unreachable 对照、新鲜 Vitest JSON file/fullName/status、反控正控/有效红、
零诊断报告和完整 40 位提交 SHA，推送分支。你不合 main、不标 done；Codex 独立验收
和正式 check→ratchet→protected fast 收口。595 未覆盖臂只是选题线索，85% 不保证。
```

## 2026-09-29 Codex 独立首轮审核

候选 `4ebea2b58e4110133cc2ffdd37974c2c6a1a7ade` **rework，未合 main**。
[独立审核回执](../../../../testing/glm-event-wave-k/codex-review-4ebea2b5.md)记录：白名单/冻结 hash、
Game 2772 全绿及静态零诊断成立；K04“无 handler”对照仍保留 handler，三反控仅改答案且判据
可误收 timeout/未核文件，K03 将卖出 opcode 未消费的 storeNum 锁为真值，K06 正控 caster
指向空玩家表。只在原白名单内返工后推新完整 SHA；Codex 再审前不合 main、不标 done。

下一位 GLM 提示词：你仍是本卡唯一测试 Coding Owner，在原工作树/原分支返工
`4ebea2b58e4110133cc2ffdd37974c2c6a1a7ade`。先读本卡与上述独立审核回执，
从 main 同步当前卡面/审核证据并保留候选测试。逐项闭合四个返工点；
重新提交六组回执、定向 JSON、三枚合法输入反控及零诊断，推送新 40 位 SHA。
产品、旧测、共享配置/基线只读；不得合 main 或标 done。Codex 独立再审。

## 2026-09-29 Codex r2 独立验收与集成终态

新候选 `1f26d421ab81090c83b704968973e369473d563a` 的四项返工
已由 Codex 独立闭合；[接收与正式结算回执](../../../../testing/glm-event-wave-k/codex-accept-r2-1f26d421.md)
记录 20 个新增测试、3/3 合法输入反控与 8/8 判据自测。贡献经快进进入 main；
串行 `pnpm check → coverage:ratchet → coverage:fast` 均通过，静态门零诊断。
目标源和生产分母未变，官方 fast 基线净增 55 分支，至 49584/63398（78.21%）；
85% 尚差 4305，`0x12` 符号表示疑点另证，不包含在本包完成范围。

本卡纯测试/证据按验收条件由 Codex 标记 `done` 并归档。
无下一位 Agent 提示词；前文派发/返工提示词仅为历史记录。
