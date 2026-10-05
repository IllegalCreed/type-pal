# TEST-GLM-EVENT-WAVE-K-1 · Codex 独立首轮审核（4ebea2b5）

结论：**rework，候选未合 main；不运行官方 ratchet / protected fast，不记正式收益。**
候选 `4ebea2b58e4110133cc2ffdd37974c2c6a1a7ade` 基于 `e8757f50`；
main 在审核时为 `625bdff5`（额外的 Reforge 覆盖率随机源修复，未改本波目标）。
候选只改六个冻结新测和 `docs/testing/archive/legacy/batches/glm-event-wave-k/**`，产品、旧测、官方基线未变。
源码 hash 1/1 与冻结一致；19 个新增用例在交付 JSON 中均为 passed。

Codex 在候选工作树独立复跑：`verify-targets.mjs`、Game 全包 **2772/2772**、Game
typecheck、完整 `pnpm lint`（2760 文件，0 error / 0 warning / 0 info）、docs
（789 Markdown / 4133 链接 / 0 issue）、diff 均通过。反控脚本实际复跑三枚，
均产生一个指定的 `AssertionError`、exit1、执行数非零且临时副本已删；
但下述输入与判据合同仍未闭合。复跑只变动了回执时间戳，已用窄补丁恢复候选字节；
候选分支工作树保持干净。

## 必须在原白名单内返工

1. **K04 “无 mapReloader” 对照未实际执行无 handler 臂。**
   候选 `packages/game/src/core/event-system.glm-event-k04.test.ts`
   第 91–94 行注入回调，第二个 `gsNoReloader` 在第 108–115 行运行时仍未调用
   `setMapReloader(null)`；唯一清理在第 116–117 行 `finally`。因此第二次也会调用
   mapReloader，`gsNoReloader` 变量名与注释并非事实，回执“守卫臂”不成立。
   在第二次执行前真正撤下注入，并证明 `reloadedMaps` 保持 `[99]`；保留
   `finally` 清理。不要仅改文案或删除负控来凑绿。

2. **三枚反控变异了期望值，而非任务卡要求的合法业务输入单轴变异。**
   候选 `docs/testing/archive/legacy/batches/glm-event-wave-k/counter-control/run-counter-controls.mjs` 的
   K02 `expect(...).toBe(1→0)`、
   K05 `toBe(1440→720)`、K03 `toBe('sell'→'buy')` 都只把测试答案改错。
   这能证断言会红，不能证它识别脚本/操作数的业务错误。以原断言不动的隔离副本，
   对合法输入做单轴变异，例如 K02 `idleFrames:3→4`、K05 fade 速度 `1→0`、
   K03 sell opcode→buy opcode；仍须单针唯一、正控 exit0、反控恰一个指定业务断言红。
   runner 的 `noCollectionOrInfraError` 仅查 `failureMessages.length>0`，超时同样可能被判
   `valid`；它也未核 JSON 的绝对文件路径，`judge=FAIL` 时仍退出 0。
   修成单一可执行判据，明确拒 timeout/collect/skip/零执行/混错/非目标文件，
   invalid 必须非零退出，并以小型自测覆盖至少 timeout 与非目标文件反例。

3. **K03 不应把卖出 opcode 的 operand[0] 当成产品合同。**
   `reference/sdlpal/script.c:1168-1173` 的 0x27 调用 `PAL_SellMenu()`，不读 operand；
   `packages/game/src/shell/bootstrap.ts:1239-1248` 的 sell 分支同样忽略 `storeNum`。
   当前候选 `packages/game/src/core/event-system.glm-event-k03.test.ts`
   第 45–61 行却用 `0x27[4]` 固化 `calls[0].storeNum===4`，把一个未消费的实现细节
   写成“卖出侧”真值。保留 `mode='sell'`、等待/ip/实际菜单方向断言，撤掉卖出
   storeNum 语义断言；如要证明 operand 无关，可用两个合法值作单轴对照。

4. **K06 战斗正控夹具不是合法会话。**
   候选 `packages/game/src/core/event-system.glm-event-k06.test.ts`
   第 36–70 行自造 `BattleState` 为 `players:[]`、`enemies:[]`，但第 64 行又设置
   `caster:{type:'player',idx:0}`；`event-system.ts:953-960` 明确该索引应指向
   `state.players`。这能让不读取 caster 的分支碰巧绿，却不满足卡面“合法正控/现行构造器”。
   使用 `createBattleState` 或现行合法 fixture，保证 caster 指向真实玩家；
   同时保留 K06 三态返回与 giveItem 断言。

完成后交新完整候选 SHA、更新六组回执/新鲜 JSON/反控证据，复跑 Game 定向+相邻、
typecheck、全仓 lint 0/0/0、docs/diff；GLM 不改产品/旧测/官方基线、不合 main、不标 done。
Codex 再审通过后才选择性集成并串行 `check → ratchet → protected fast`。
