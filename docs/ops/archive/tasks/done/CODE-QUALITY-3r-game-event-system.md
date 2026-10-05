# CODE-QUALITY-3r - game event-system 事件解释器/脚本生命周期逐文件治理

Status: done
Phase: phase1 game
Capability: ops / code-quality / phase1-mechanics
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: e2e-deferred（剧情/演出视觉集中 E2E；本卡只验解释器/状态合同）
Contributor: Codex
Branch: codex/code-quality-governance

## 目标

逐文件审计 `packages/game/src/core/event-system.ts`（5110 行）的全局脚本表、trigger/autoScript/event 主循环、raw opcode
解释、等待态/异步收尾、scene/battle/menu 接回、runEnterScript 与 poison/item 辅助 caller；所有高风险行为先以
SDLPal primary source、第一阶段状态所有权、真实 caller 和测试核真值，只有直接反例才修复。

## 范围

- 范围内：`event-system.ts` 全文件、其公开生产 callers 与已有 event-system/cross-module/scene/battle tests。
- 范围外：`scene-system.ts`（已由 CODE-QUALITY-3q 关闭）、battle-opcodes 全文件、save/schema/migration、生成物、剧情 E2E、UI 形态和 coverage runner。
- 明确不做：不重写事件格式，不把第一阶段解释器迁入 Reforge，不凭静态 opcode 数量或覆盖率改玩法，不改 `data/extracted`。

## 前提真值门

### 一句话行为 / 工程前提

事件脚本解释器必须保持 SDLPal 的 opcode 控制流、caller-owned 状态和阻塞/异步收尾语义；任何 cursor、waiting、sceneLoading、palette/fade、battle resume 错配都不得让脚本跳错、永久等待、重复触发或跨模式污染。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | SDLPal 单解释器 `PAL_InterpretInstruction`、`PAL_RunTriggerScript`、`PAL_RunAutoScript`、scene/battle/menu 同步返回点与 opcode 分支 | `reference/sdlpal/script.c:30-307,3130-3670`、`:608-750,1140-1410,1600-1815,1850-1990,2050-2145,2290-2385,2385-2555,2570-2775,2970-3070`；`play.c:56-238`、`scene.c:779-847`、`global.h:75-121,512-531` |
| 第一阶段 | 当前 TS `tickEventSystem`/`tickAutoScripts`/`applyRawOpcode`/`runEnterScript` 与 mode/bootstrap/scene/battle/menu/equipment/poison callers 的真实链 | `event-system.ts:1208-2888,2903-3212,3227-4603,4693-5110`、`mode.ts:20-92`、`shell/bootstrap.ts:778-887,1168-1180,1556-1584`、`scene-system.ts:303-339,444-585`；`event-system.test.ts` 5973 行及 K01–K06/cross-module/mode/dialogue tests 已读取入口与合同 |
| 当前二阶段 | N/A（仅 packages/game phase1） | `CLAUDE.md` 阶段规则 |
| 本任务目标 | 每个生命周期/解释段有 caller、primary source、可证伪反例和验证结果；未知项保留 review/blocked | 本卡、file ledger、定向/相邻测试和全仓门禁 |

### 反证与替代解释

- 最强替代解释：某些 `waiting`、global fallback、sceneLoading 清理、同步 `runEnterScript` 和 battle/menu resume 是已批准的异步化补偿或 dev-only caller 边界，不因静态复杂度删除。
- 什么观察会推翻前提：真实合法 raw opcode + 真实 caller 在同一输入下出现与 C 不同的 ip/callStack/waiting/mode/状态收尾；或移除 guard 后唯一业务 assertion 仍全绿。
- audit 红项替代根因：runtime 命令分类、原版/第一阶段理解、提取/数据解码、测试模型四类必须分别排查；大规模 script census 只证明 mismatch，不直接授权迁移。

### 用户可见偏离

- 是否主动偏离已核真值：no
- `before -> after`：从“event-system 尚未逐文件治理”到“解释器与生命周期每段证据化；仅根因修复，不改变脚本格式/玩法/演出取舍”。
- 代表场景：trigger/autoScript/onEnter/event/battle-resume 脚本在合法 raw 输入下逐 tick 推进并正确收尾。
- 用户裁决：N/A（保持已核真值；证据冲突才停线请示）。

## 上下文锚点

- 已拍板决策 / 铁律：`AGENTS.md` 前提真值门、第一阶段忠实还原、C 阻塞异步化同帧后续、时间状态指定收尾人、硬零诊断、测试少而精。
- 代码锚点：`event-system.ts:1208-1470` auto/event tick、`:1471-1828` 主循环、`:3262-5110` raw opcode/同步入口；`mode.ts:20-92` 调度；`bootstrap.ts:778-887,1168-1180,1556-1584` 生产加载；`scene-system.ts:303-339,444-585` trigger caller。
- 已知坑 / 审计文档：`docs/phase1/engineering-notes.md:71-107` 双解释器/相机/sceneLoading/异步同帧后续；`docs/phase1/game-mechanics.md:1371-1380,1481-1485,1573-1581` 事件/毒/属性边界；Q3q scene-system card 的 global ip/trigger owner 证据。
- 不得重新引入：全局 ip 与 per-scene slice 混用、`sceneLoading`/fade 永久孤儿、TouchFar 首帧死锁、battle/menu 切回露帧、旧版本兼容 fallback、`applyRawOpcode` 与 caller 双写同一状态。
- 相关测试：`event-system.test.ts`、`event-system.glm-event-k*.test.ts`、`event-dialogue-pagination.test.ts`、`mode.test.ts`、`scene-system.test.ts`、`cross-module-boundaries.test.ts`、battle/menu/equipment/poison ownership tests。

## 验收条件

- 功能：event-system 全 5110 行按职责段登记 owner、caller、primary source、风险和结论；关键未知不标已验证。
- 测试：定向/相邻事件与生命周期 tests、game typecheck；若改代码再跑全仓 `pnpm check`、official ratchet、protected fast、Biome 零诊断。
- 文档：更新 file ledger/治理正文/卡/board/index；每个闭合批次 commit+push+archive。
- 视觉 / 手工验证：N/A（剧情视觉集中 E2E；本卡纯解释器/生命周期合同）。
- E2E 用例登记：N/A；若发现无法靠纯合同推进的实际视觉缺陷，另开 E2E 卡。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单：Codex / `codex/code-quality-governance` / 仅 `event-system.ts` 与专属回归（若 direct evidence）。
- 前提核验：verified（已逐段读取 primary source、当前实现、生产 callers、主测试合同；见下方审计日志）
- 范围、设计和验收条件：agree（audit-first；不主动改变脚本格式、玩法、公共 API 或状态所有权）
- 高风险用户产品裁决：N/A（保持已核真值；证据冲突才暂停）
- build 准入结论：build allowed（当前无实现变更白名单需求；若直接反例出现，先补证据再作最小修复）

### 进入 done 前：独立验收

- 贡献者交付与自验：event-system 主测试 + K01–K06 + dialogue-pagination + cross-module + mode 定向 10 files / 370 tests 通过；game typecheck 通过；当前无实现修改。
- Codex 独立复核：accept（完整 `pnpm check`、official `pnpm coverage:ratchet`、`TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast` 和 Biome 零诊断均通过；726 files / 19,285 tests，逐包及全仓无回退，提升 0）。
- 用户体验/产品验收：N/A（纯机制；剧情视觉延后）。
- done 准入结论：done allowed；本卡只关闭 event-system 与其主测试文件，不代表 battle-opcodes、save 或账本剩余待核记录已完成。

## 交接日志

- 2026-10-05 Codex：Q3q 已归档；建立 event-system 高风险卡，先完成 5110 行实现、5973 行主测试、primary source 与真实 callers 的逐段核验；未获 build 准入前不得修改实现。
- 2026-10-05 Codex：完成 event-system 5110 行源码全文读取，覆盖全局表、auto/event 主循环、runScript、poison/item、battle resume、raw opcode、对象解析、移动/镜头和 runEnterScript；对照 `script.c`/`play.c`/`scene.c`/`global.h` 直接证据。主测试按职责段与 K01–K06/cross-module/mode/dialogue caller 合同读取，未发现可由 primary source + 真实 caller 证实的新 direct defect；进入 audit-only build。
- 2026-10-05 Codex：定向 10 files/370 tests 与 game typecheck 通过；stderr 中仅为测试覆盖的预期 warn/debug（invalid label、missing handler、unimplemented raw 诊断），未发现 failure 或零诊断门问题；暂不改实现。
- 2026-10-05 Codex：event-system 无实现变更；完整 check（game 3403、editor 606/4845、migrate 95/723、lint 3198 files 零诊断）、official ratchet、protected fast 全部通过，coverage 基线未变化。归档本卡，继续下一个未核文件。

## 逐段审计证据（2026-10-05）

| 实现段 | 当前行 | 真实 caller / oracle | primary source | 结论 |
|---|---:|---|---|---|
| 全局脚本表/导出与注入 handler | `91-130,584-1041` | bootstrap 全局事件/资源注入、battle/menu/effect handlers、dependency ownership | `script.c:3140-3195`、`global.h` globals | 解释器不直接依赖 shell/menu/battle 资源；handler owner 明确，fallback 合同均有测试，未见跨层双写反例 |
| 帧动画 helper / 对话样式与 palette fade 门 | `527-730,1064-1192` | present/dialogue/palette、mode、scene-system callers；event dialogue/K05 tests | `scene.c:503-508`、`text.c:1271-1815`、`script.c:3267-3426` | `walkFrameMod`、dialog clear/style/RNG backup、fade/sceneLoading 收尾均有状态 oracle；未知 fallback 保留 review 而非静态删除 |
| autoScript runner | `1208-1470` | `mode.ts:28-55`、scene pre-input、K01/K02/K04/K06 与主 auto tests | `play.c:169-238`、`script.c:3482-3651` | sState/vanish gate、owner 首条间隙、goto 同帧、0x06 专用语义、call stack、walk stagger 均直对 C；未发现循环/永停 direct 反例 |
| event 主循环 / waiting / dialog | `1471-2115` | `mode.ts:57-92`、main-loop、dialog-box、scene-system/event tests | `play.c:56-166,513-591`、`script.c:3180-3478`、`text.c:1433-1815` | frame/camera/fade/palette/scene-load/shop/modal/wait-key/confirm/dialog 收尾与 ip++ 时机均有合同；invalid goto 会清 cursor，不自旋至 limit |
| raw 特效/移动/scene handlers | `2160-2888` | bootstrap scene loader/map reloader/effect handlers、scene/present tests、K03/K04/K05 | `script.c:1870-1900,2050-2145,2290-2385,2570-2775`、`scene.c:887-902` | startBattle/save resume、walk/ride/camera relative、fade/RNG/FBP、loadScene deferred、changeMap fire-and-forget 与 C 返回点一致；未改 scene-system 已闭合范围 |
| battle `runScript` 与 poison sync | `2903-3212` | battle-system/battle-opcodes/equip-effect/poison callers、K06、battle tests | `script.c:1175-1404,3180-3478`、`fight.c` script callers | battleCtx required/forbidden、dispatch fallback、call/end resume、dialog queue、pending animation/damage、poison entry limit 合同均有真实 caller；不把 battle-opcodes 误收本卡 |
| trigger/item/battle lifecycle helpers | `3227-3453` | scene-system trigger、menu item use、battle finalize、game-state resume | `play.c:244-325`、`script.c:3318-3331,3258-3265` | fScriptSuccess/item consume、applyToAll mode restore、scene reload failure解冻、global jump/confirm goto 语义直接核验 |
| `applyRawOpcode` data/state/object families | `3464-4691` | event-opcode-player/equipment/inventory/poison、scene/global object、bootstrap injections、A1/A2/A3 tests | `script.c:608-750,752-1404,1600-1815,1850-1990,2050-2145,2385-2555,2570-2775,2970-3070` | SHORT/WORD、self vs pCurrent、1-based global object、current-scene-only predicates、jump target fallback、state/party/map/follower ownership逐段核验；未发现直接缺陷 |
| movement/chase/enter sync helpers | `4693-5110` | scene-system pre-input、present/follower、bootstrap onEnter、movement tests | `script.c:30-307`、`scene.c:72-200,887-902`、`play.c:235-238` | NPC/party/ride/chase steps、camera relative、trail timing、obstacle hook、runEnter checkpoint/end persistence 与 C 对齐 |

### 反证排查记录

- 运行时语义/命令分类：`mode.ts` 的 autoScript/event gates 与 event-system waiting 状态逐项对照；battle 特定 raw 先由 `dispatchBattleOpcode` 消费，其余才 fallback `applyRawOpcode`。
- 原版/第一阶段理解：控制流 ip-1/ip++、0x00/0x01/0x02 end、0x03/0x06/0xA2 跳转、0x04 call、0x09/0x0A/0x4D waits、SHORT/WORD 和 1-based object id 均回到 C 源，不由 fixture 猜测。
- 提取/地图/数据解码：本卡只消费 canonical `Command`/GameState/SceneAssets；没有证据指向 extractor/map decoder，保持生成物与迁移边界不动。
- 审计/测试模型：主测试覆盖真实 `tickEventSystem`/`tickAutoScripts`/`runScript`/`runEnterScript`，K01–K06 与 cross-module tests 覆盖 invalid label、wait/fade/modal failure、battle fallback、global object scope、真实多行 dialog/移动序列；全绿/例数只作为必要条件，不单独证明正确。

### build / review 结论

- `premise verified`：Codex；primary source、生产 callers、主测试和相邻合同已直接读取。
- `design agree`：Codex；audit-only，保持行为/接口/schema/save/生成物/UI 边界。
- `accept` 前置条件：定向 event/caller tests、game typecheck、全仓 `pnpm check`、official ratchet、protected fast、Biome 零诊断全部通过；否则保留 review，不归档。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-3r game event-system 事件解释器/脚本生命周期逐文件治理
任务卡：docs/ops/tasks/CODE-QUALITY-3r-game-event-system.md
当前状态：draft；前提真值门未完成，允许只读取证，**不得开始实现/不得标记 done**。
你的角色：Codex 先完成前提真值与独立证据核验。
先读：AGENTS.md、CLAUDE.md、docs/phase1/engineering-notes.md、docs/phase1/game-mechanics.md、本卡、event-system.ts 全文、event-system.test.ts 全文、script.c/play.c/scene.c/global.h、mode/bootstrap/scene/battle/menu/equipment/poison callers。
请你做：写完四向真值矩阵、替代解释和可证伪观察；逐段记录职责/owner/caller/风险；若发现 direct bug，先更新前提与 build 准入再改。
不要做：不得凭 opcode 数量改玩法，不得改 scene 数据/save/schema/迁移/生成物/E2E/coverage runner，不得把 Reforge 结构带回第一阶段。
输出要求：历史交接已收口；无下一位 Agent 提示词，继续治理必须新开不重叠卡并重新过前提真值门。
```
