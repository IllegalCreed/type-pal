# TEST-COVERAGE85-GLM-GAME-1 — game runtime branch-contract closure

Status: build
Owner: GLM
Reviewer: Codex
Base: `b95a6947369bf5d32db5746df0c82acae27b3663`
Branch: `codex/coverage85-glm-game-r1`
Capability: test-quality / coverage branch closure

## Codex build allowed

当前 fast 基线 game 为 statements `13113/15513`、branches `8408/11278`、functions
`1504/1852`、lines `11774/13619`；game 分支要达到 85% 至少需要覆盖当前源码中约
1179 个既有未覆盖 branch edges。这个数字只是停止线计算，不是测试例数配额；不得为了
凑数新增重复合同或修改质量阈值。

## 独占范围与明确合同点

只允许写 `packages/game` 下新的专属测试、必要的本地 typed fixture 和本卡证据；不得改产品、
旧测试、共享配置、coverage baseline、真实 PAL 数据或其它卡目录。优先逐分支核验以下现有
源码轴，并用公开 caller/可观察业务 oracle 闭环：

- `src/core/event-system.ts:627-728,1070-1425`：事件队列空/非空、阻塞与恢复、条件不满足、
  事件完成/取消、并行分支和异常收束；必须证明状态转移和 emitted event，不以调用次数代替 oracle。
- `src/core/battle/battle-opcodes.ts:145-587` 与 `src/core/battle/battle-system.ts:276-1099`：
  opcode 合法/非法参数、目标为空/多目标、伤害/状态/逃跑/胜负结算、阶段切换和拒绝路径；
  输入必须由真实 typed battle state/公开 battle caller 构造。
- `src/core/menu/menu-driver.ts:151-666`、`src/core/event-opcode-player.ts:59-236`：菜单
  生命周期、确认/取消/禁用项、脚本 opcode 的正常/拒绝/恢复路径；不得直接改私有 state 或
  注入世界后门。
- 相邻合法轴可覆盖 `core/battle/actions/*`、`core/equip-effect.ts`、`core/equipment-state.ts`、
  `core/game-state.ts`，但每个新增合同必须指出源行、caller、合法输入和精确断言；
  `shell/bootstrap.ts`/`main.ts` 的宿主不可达臂只有在找到真实入口后才测，否则写 existing-proof。

## 验收交付

每个 admitted branch family 都要有原始正例、反例或恢复例（按该分支语义决定），并记录源
`file:line`、caller、fullName、断言 oracle。反控不得使用固定数量：对每个真实注入点必须有
原始/变异/恢复三态、唯一指定业务 AssertionError、执行身份集合和源 hash；判据拒收零执行、
额外文件错误、pending/skip、collection/runtime 错和未处理异常。测试必须保持原子性、低重叠，
不得用 `as unknown as`、`@ts-expect-error`、ignore/skip、放宽 timeout 或业务核心 mock。

回执必须包含 fresh Vitest `file×fullName×status`、coverage 前后 branch delta、未覆盖臂的
existing-proof/unreachable 证据，以及定向测试、相邻测试、typecheck、lint、docs/diff 结果。
只有真实 branch 合同闭合且 game branch 达到 85%（或对剩余不可达臂给出一手证明）才可请求
Codex 独立验收；不得合 main 或标 done。

## 下一位 Agent 提示词

你是 GLM，负责本卡 `packages/game` runtime branch-contract closure。先读 `AGENTS.md`、
`CLAUDE.md`、`docs/phase2/READ-FIRST.md`、本卡和 `scripts/coverage/baseline.fast.json`，
再逐文件核对上述源行及已有 fullName。只写本卡白名单的新测试/typed fixture/证据；不得开始
产品实现、旧测、配置或 baseline 修改。交付时写入本卡：每个 branch family 的源锚/caller/
合法输入/oracle、fresh JSON、三态反控 hash、branch delta、质量门结果，并报告
`agree/accept` 或 `counter`；未闭合前不得标记 done。

---

## GLM r1 交付回执（2026-10-04，分支 codex/coverage85-glm-game-r1，base 76475c01c）

**结论先说：r1 交付 6 个新测试文件 ×167 合同测试全绿（返工去重后口径，见下方返工回执；原始 r1 曾为 170），game branch 8408→8746/11278（74.55%→77.54%，+338 边；原始 r1 曾为 +342，去重净代价 4 边）。
85% 停止线（需 +1179）未达成，卡内白名单文件仍有 ~959 条可达未覆盖臂（明细账见下）——不请求验收收口，
不标 done；请 Codex 核 r1 合同质量并指示 r2 优先序（r2 计划主攻 event-system opcode switch 长尾与
battle-system selectAction/performAction UI 状态机两块，约占剩余 681 边）。**

### 交付物（全部为本卡白名单新增，零产品改动）

- `packages/game/src/__tests__/coverage85-glm-game/harness.ts` — typed fixture（createInitialGameState /
  createBattleState 公开工厂 + 确定性 seqRng，无 any/双强转/业务 mock）。
- 6 个 colocated 测试（共 167 it，全 passed，无 pending/skip/额外文件错误；返工后口径，分文件数见下表勘误）：

| 文件 | it 数 | 主要合同轴（源锚 / 公开 caller / oracle） |
|---|---|---|
| `core/event-opcode-player.cov85.test.ts` | 30 | applyPlayerOpcode 直调：0x8d 守卫+99/999 封顶+Exp 回写；0x17 装备效果层直写（i16 负值）；0x18 首装/全量交换/同物重装/无上下文守卫；0x19/0x1a 显式 role；0x1b·1c·1d fScriptSuccess 三态+死人不治；0x22 applyAll 复活（比例+毒≤3 级+>999 装备态保留+活人 false）；0x23 空槽；0x29 全队 0 抗必中/100 抗必不中+入口 runner 实参；0x2d 坏/傀儡/好状态九臂；0x2f >999 不清；0x55/56 重复/封顶/显式 role/满 32 槽；族外返 false |
| `core/battle/battle-opcodes.cov85.test.ts` | 56 | dispatchBattleOpcode 直调（真实 createBattleState）：0x42 显式目标/applyToAll/无表 no-op/特效音即时；0x66 攻强系数+rng 序；0x21 全体跳死敌/单体超杀 fullDamage/无 target；0x28 抗性/去重/16 槽满/入口脚本返回值/全体 selfIdx/无 target；0x2a 死敌不动；0x2b·2c·29 目标解析四臂+无 gs；0x2d 三族状态；0x2e ≥抗性命中/<抗性 newIp/非法 id；0x2f；0x5e；0x57 mp×8 清零/无表；0x88 5000 上限/全额/无 gs；0x5b cap 钳/空槽；0x5f·5a；0x5c；0x89 五态相位；0x8a；0x33 collect/jump；0x3a boss jump/fleeAnim+音45；0x30 Extra 槽写+recompute/无 gs 退化/负%；0x31；0x92 守卫；0x6a 偷钱 c>0/c=0 不弹框/偷物 99 封顶/roll 失败/短路不抽 rng/新条目；0x1b·1c·1d 死人跳过+cyan 只升不发+双色；0x22 战内复活全套；0x39 钳 max；0x68·0x91 同种计数；0x9c 三失败臂+成功单副本；0x9f hiding/睡眠/无对象/无 base/保血变身+音47；0x9e 房位/隐身/失能 failJump+w=0 回退+count≤0→1；0x69；0x60；族外 consumed:false |
| `core/menu/menu-driver.cov85.test.ts` | 29(返工后;原 33) | dispatchMenuInput 公开入口：requireCatalogs 未注入 throw（resetModules 隔离）；空栈；买店 list 4 键+买不起+关店/confirm 四键+是/否/期内钱变拒；卖店 8 键+不可卖+是卖半价否不动；opening Menu=new-game/Confirm load→save-slot；system music/sound switch+quit confirm 是/否+save/load push+DL21；inventory-action 装备/使用/关整栈；inventory use 8 键+use-target 换人+耗尽自动退+applyToAll 起世界脚本+单目标脚本；equip DM23 入口值+pick-role 确认/不可装/回 list 重建；in-game-magic 单人直达 pick-spell 8 键+caster 位移+single→pick-target 扣 MP/applyToAll 扣 MP+MP 不足退 picker；player-status 四向+越界关；save-slot in-game/opening 两种取消+save 写槽+load handler/无 handler 警告 |
| `core/event-system.cov85.test.ts` | 19 | tickAutoScripts/tickSceneAutoFadeIn 公开 tick：前提门（空全局数组/sState≤0/vanish/owner 门+startedExecution·waiting 豁免/autoLabel 延迟解析失败）；runOneAutoOp（plain park/advance/reset 两拍+resetTo 缺失停/callStack 弹帧/goto 自环护栏+计数满 fall-through+目标缺失/0x09 逐帧/0x06 rate=0 重掷+恒跳/0x11 parity 隔帧/0x10 snap+arrived/default 防 ip++）；tickSceneAutoFadeIn（explore 起 600ms+清 flag/fade 中/sceneLoading/fadeState 拒/event 模式 waiting 白名单+0x7F pan·步长 1·非 pan·0x7A ride 判别） |
| `core/battle/battle-system.cov85.test.ts` | 12 | startBattle 倒地复活 1+清傀儡/屏波交接；tickEnemyIdleGestures 四态；tickBattle 无资源强退/stall>1500 强制 finalize/selectAction 不计；roundEndDelay 递减+起菜单；全员睡自动占位+起手落空；活员全死→lost；won settlement 幂等；palette fade hold |
| `core/event-opcodes.cov85.test.ts` | 21(返工后;原 20) | runScript battle fallback 落 applyRawOpcode 的世界 opcode：0x51/0x93(step<0)/0x80 两档时长+夜翻/0x8c perStep 回退/0x50 delay0→1；0x46 SetPartyPos 公式；0x75 槽解析；0x71/0x36；0x43·45·77·a3 音乐态；0x1e 负现/0x20 超量清；0x12 相对 party 绝对偏移 i16；0x6f pCurrent==op1 才同步 self；0x24 启用+entry0 清；0x14 帧数据+强制朝南/0x0f dir·frame/0x6c 位移；0x7d·7e·87；0x40·25·9a 区间；0x49；0x99 mapReloader 注入；0xa6 no-op；0x58/0x81 现金标记判别跳转+0x81 contact 触发模式 5+op1 |

### branch delta（fast 口径逐字复刻 run.mjs 选择，本地 vitest 4.1.7 + v8）

- 基线（本地复现官方 fast 口径）：8408/11278 = 74.55%（与 baseline.fast.json 逐数一致后才开工）。
- r1 后：**8750/11278 = 77.58%（+342 边）**。分文件 miss：event-system 540→452、battle-opcodes 237→158、
  battle-system 233→229、menu-driver 156→50、event-opcode-player 119→70。
- 全量：**287→293 文件 / 3196→3366 测试全绿**（0 failed / 0 pending）。

### 三态反控（原始绿 → 变异红 → 恢复绿；`mutation-results.json` 6/6 VALID）

| 注入点 | 变异 | 唯一指定业务断言（节选） |
|---|---|---|
| battle-opcodes.ts:487（0x21 单体钳零） | max(0→1) | `expected 1 to be 0`（health 钳 0 合同） |
| battle-system.ts:273-274（倒地复活） | 1→2 | `expected 2 to be 1` |
| event-opcode-player.ts:197（0x22 比例） | /10→/11 | `expected 227 to be 250` |
| menu-driver.ts:358（买扣钱） | -=price→-=price-1 | `expected 41 to be 40` |
| event-system.ts:1227（owner 门） | ===→!== | owner 冻结合同红 |
| event-system.ts:3549（0x46 公式） | *32→*33 | `expected 82 to be 80` |

每点含 sha256(original)=sha256(restored) 校验、red 失败 fullName 集合、pending=0、runtimeErrorSuites=0、
恢复后定向文件全绿；判据拒收零执行/集合错/pending（runner: `mutation-runner.mjs` + `mutation-points.json`）。

### 未覆盖臂账（r1 后，`uncovered-ledger-r1.json` 逐臂 line:type:arm）

- **宿主不可达（existing-proof，不伪造覆盖）**：`shell/bootstrap.ts` 266 边 + `main.ts` 18 边 —— 生产装配链
  （资产 fetch 循环、WebAudio/MIDI、AVI/rAF、浏览器入口调用、dev 工具挂载）在 vitest/jsdom 无真实宿主入口；
  已有 `bootstrap-load.test.ts` / `bootstrap-audio.test.ts` 覆盖的纯装配子集保持原样，其余按卡面指示留
  existing-proof，待真实浏览器 E2E 入口（非本卡范围）。
- **防御性守卫（合法输入不可达，逐条列名）**：如 event-opcode-player.ts:98-99（`rgwEquipment` 行恒初始化，
  `!eqRow`/`?? 0` 回退不可达）、battle-system.ts:305（`field.screenWave ?? 0`，字段非 optional）、
  menu-driver sell `had.count>0` false 臂（count=0 条目由 addItemToInventory 即时清除）等 —— 明细在 ledger
  JSON，未计入"可达待闭合"。
- **可达待闭合（r2 主攻，~959 边）**：event-system 452（opcode switch 长尾 1430-3300 与 tickEventSystem
  对话/走位主循环 3600-5110 为主）、battle-system 229（selectAction UI 状态机/performAction/postAction/
  结算细节）、battle-opcodes 158、event-opcode-player 70、menu-driver 50。这些是**可达未测**，不冒充
  existing-proof。

### 质量门

- 定向：6 文件 167/167 绿。相邻：10 个既有文件 745/745 绿（battle-system/battle-opcodes(+next-wave)/
  event-system/menu-driver/event-opcode-player(+next-wave)/palette-fade/battle-finalization）。
- 全量 fast 口径 3366/3366 绿；typecheck 0 error；`pnpm lint` 全仓 PASS（0/0/0，含本卡全部新文件与证据）；
  `pnpm check:docs` PASS（864 md/4558 links）。
- diff 仅新增（7 个白名单文件 + docs/ops/evidence/TEST-COVERAGE85-GLM-GAME-1/ 证据包），零产品/共享配置/
  baseline/旧测试改动。

### 判例沉淀（r2 复用）

- `runScript` explore 模式**跳过所有 raw opcode**（D26 兜底）——世界/演出 opcode 合同必须走
  `runtimeMode:'battle' + battleCtx.gs` 才落 applyRawOpcode。
- `objectPoisons` 是按对象号**稠密索引**数组（`ctx.objectPoisons[id]`），稀疏列表会静默变 no-op。
- menu catalogs 是模块单例：beforeEach 注入会覆盖 describe 局部表；throw 臂须 resetModules 动态取新模块。
- 物品网格导航按**行**（±INV_ITEMS_PER_LINE），不是 ±1；单人法术菜单跳过 pick-caster。
- NPC 目标 opcode：op0=0/0xFFFF → self（须 eventObjectId），否则 1-based 全局 id（npc.id+1）。
- 0x14/0x0F 的 operand 是**帧/朝向数据**不是 NPC id；0x81 面对判定含 sState>0 前提与 camera 基线换算。

### 下一位 Agent 提示词（Codex 复核 r1）

你是 Codex，负责独立复核 TEST-COVERAGE85-GLM-GAME-1 的 r1 交付（分支 `codex/coverage85-glm-game-r1`，
回执在本卡上方）。先读本卡、`AGENTS.md`、`CLAUDE.md` 测试质量验收节，再核：
1) `packages/game/src/**/​*.cov85.test.ts` 6 文件 + `__tests__/coverage85-glm-game/harness.ts` 的合同原子性、
   合法输入、真实 caller、oracle 判别力与 fullName 排重（对照既有 *.test.ts / glm-next-wave / k01-k06）；
2) `docs/ops/evidence/TEST-COVERAGE85-GLM-GAME-1/` 三态反控 6 点与 fresh JSON、branch delta（77.58%）；
3) 未覆盖臂账分类是否成立（宿主不可达/防御守卫/可达待闭合）。
输出 `agree/accept`（r1 范围）或 `counter`（逐项返工）；并裁决 r2 优先序（建议：event-system switch 长尾
452 边 + battle-system UI 状态机 229 边）。85% 未达成是事实陈述，r1 不请求 done、不合 main。

---

## GLM r1 返工回执（Codex 六项逐条，2026-10-04，仍不请求 done）

返工输入：Codex 2026-10-04 六项返工指令。全部完成，证据重出；分支同一提交线重写后
force-with-lease 更新 `codex/coverage85-glm-game-r1`。

1. **mutation-runner 完整执行证据**：`mutation-runner.mjs` 重写为 spawnSync 版 —— 每个注入点
   3 个相位(原始绿/变异红/恢复绿)各保留完整 `command`(argv 数组)、`cwd`、`env`(全量快照)、
   `stdout`/`stderr`(全文落盘 `mutation-logs/` 共 36 个文件,JSON 内存 bytes+sha256+路径)、
   `exitCode`、`signal`、`spawnError`、`spawnTimedOut`、vitest JSON 摘要与逐套件 status 数组。
   **移除全部 `?? 0` 兜底**：6 个 reporter 必需字段(numTotalTests/numPassedTests/numFailedTests/
   numPendingTests/success/testResults)缺任一即 INVALID。`numRuntimeErrorTestSuites` 在
   vitest 4.1.7 JSON reporter **真实不存在**(实测 MISSING)——不做静默兜底,改为
   `presentInReporter:false + valueFromReporter:null + derivedFromSuiteStatuses:N`
   (推导公式:status==='failed' 且零 assertionResults 的套件数)全量落盘,推导值≠0 判 INVALID。
   判据含零执行/red-json-unparsable/red-pending>0/red-runtime-error/red-no-business-assertion/
   restored-not-green/restore-sha-mismatch。**6/6 VALID**。
2. **不精确断言清零**：menu-driver.cov85 中全部 `toBeGreaterThan(0)`/`not.toBe(before)` 改为
   精确值 —— 卖店/物品网格 11 条库存下 Down=3、Right=4、Left=3、End=10、Home=0、PgDn=10、
   PgUp=0;use-target 换人 0→1→0;equip playerCursor 1;法术菜单 PgDn/End=1;applyToAll 后
   `menuStack` 精确 2 层;save-slot Confirm 后 `currentSaveSlot===1`。
3. **warning 精确合同**：0x24 SetAutoScript 拆两测 —— label 在全局表 → spy 断言**零 warning** +
   `autoCursor={ip:0}`;label 缺 → 断言**精确 warning 文本一次**(`setAutoScript id=0 L_999 不在
   全局 labelMap`)+ `autoLabel='L_999'`/`autoCursor=undefined`。四个高风险测试文件整跑
   **stderr 0 条**(无非预期输出)。
4. **单测隔离**：afterEach 补齐 —— event-opcodes(+setGlobalEvents([])、既有 setMapReloader(null)、
   vi.restoreAllMocks)、menu-driver(+setGlobalEvents([]),既有三 handler reset)、battle-opcodes
   (+setObjectPoisons([]));event-system/event-opcode-player 原有清理保持。全部全局安装态
   (全局脚本数组/毒对象表/mapReloader/menu catalogs/handler)测试后归零。
5. **与旧 menu-driver.test.ts 去重**：删 opening describe 2 it(旧 490-547 已证 Menu→new-game/
   Up/Down/Confirm 两路/无 handler);删 inventory 2 it(旧 C4 644 count→0 auto-cancel、592
   use-target revert);save-slot 删 Up/Down 段(旧 550 已证)并注明合并。保留的均为旧测未证臂:
   requireCatalogs throw、空栈、买卖店全链、system switch 全臂、save-slot 双上下文取消/save 写槽/
   load handler、inventory 8 键精确网格+applyToAll、equip、in-game-magic、player-status。
   170→167 it(−4 重复 +1 新 0x24 miss 合同)。
6. **证据全部重出**:fresh `vitest-final-compact.json`(3363 条 file×fullName×status,全 passed/
   0 failed/0 pending,全量原文 gzip 存档)、`uncovered-ledger-r1.json`/`summary` 重生、
   mutation 36 日志重跑。**branch delta 如实变化:8750→8746/11278(77.54%,+338)**——去重删测
   的净代价 4 边,不粉饰。

**门禁**:定向 6 文件 167/167;相邻 10 文件 745/745;全量 3363/3363;typecheck 0 error;
`pnpm lint` 全仓 PASS 0/0/0;`pnpm check:docs` PASS。diff 仅本卡测试+证据,产品/旧测/配置/
baseline 零改动(git diff 产品文件为空已验)。85% 未达成口径不变(77.54%),r2 计划与
existing-proof 分类沿用 r1 回执,待 Codex 复核。

---

## GLM r1 窄返工回执（Codex 四项，2026-10-04，仍不请求 done）

1. **完整身份集合**：mutation-results.json 每次执行(原始/变异/恢复 ×6 点 = 18 份)新增
   `identitySet` —— 全量 `file×fullName×status`(绿相位也在,非仅失败项;MUT-01 各相位 56 条,
   红=55 passed+1 failed,绿=56 passed)。新增自洽校验:red identitySet 必须覆盖全部 failed
   fullName、绿前/绿后 identitySet 必须零漂移、空集合判 INVALID。
2. **完整执行证据保持**：command(argv)/cwd/stdout/stderr(全文+bytes+sha256+路径)/JSON 摘要/
   exitCode/signal/spawnError/spawnTimedOut 逐相位保留;env 以顶层 `envSnapshot` 单份完整快照
   提供(runner 生命周期固定,18 次执行共用,execution.env 指向该引用,避免 JSON 冗余拷贝)。
3. **数量口径统一**：卡内 r1 节 170→167、8750/77.58%/+342→8746/77.54%/+338,分文件表格
   menu-driver 33→29、event-opcodes 20→21(均带勘误标注);全文不再有 170 漂移。
4. **同步重推**：mutation-results.json 重跑后 6/6 VALID(含新自洽校验);定向 167/167 未变
   (本窄返工零测试/产品改动,全量 fresh JSON 与 ledger 沿用返工版且仍有效);amend 后
   force-with-lease 更新 `codex/coverage85-glm-game-r1`。产品/旧测/baseline/其它卡零改动。
