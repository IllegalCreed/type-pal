# CODE-QUALITY-3u - game battle-state/runtime-context/positions 逐文件治理

Status: draft
Phase: phase1 game
Capability: ops / code-quality / phase1-mechanics
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: e2e-deferred（战斗演出视觉集中 E2E；本卡只验状态/资源/位置合同）
Contributor: Codex
Branch: codex/code-quality-governance

## 目标

逐文件审计 `packages/game/src/core/battle/battle-state.ts`（918 行）、`battle-runtime-context.ts`（98 行）和
`battle-positions.ts`（93 行）的 BattleState 工厂、战斗资源/运行时上下文 ownership、玩家/敌人站位表与边界；以
SDLPal `battle.h`/`global.h`/`fight.c`/`battle.c` primary source、真实 battle-system/finalization/anim/opcode callers
和 state/runtime/positions tests 核真值，只有直接反例才修复。

## 范围

- 范围内：上述 3 个实现文件、其直接工厂/清理/动画/inspect caller，以及 `battle-state`、`battle-runtime-context`、`battle-positions` 专属测试和必要 cross-module oracle。
- 范围外：`battle-system.ts`（CODE-QUALITY-3s 已关闭）、`battle-opcodes.ts`（CODE-QUALITY-3t 已关闭）、公式/magic/status/queue、save/schema/migration、生成物、剧情 E2E、UI 形态和 coverage runner。
- 明确不做：不改玩家/敌人容量、坐标常量或 BattleState 公共字段；若发现产品行为需变更，停线交用户裁决。

## 前提真值门

### 一句话行为 / 工程前提

BattleState 必须是每场战斗独立且可清理的工作状态，runtime context 只能由公开 battle owner 注入/清理，位置表必须按当前敌人数量和固定战斗坐标合同生成，不得以数组位置误认稳定对象身份。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | SDLPal `BATTLE`/`BATTLEPLAYER`/`BATTLEENEMY` 结构、EnemyPos 表和 start/cleanup 读写路径 | `reference/sdlpal/battle.h:62-119,170-210`、`global.h:377-445`、`battle.c:565-682,1531-1838`、`fight.c:117-145,2175-2190,3209-3245`；待逐段补实现对应行号 |
| 第一阶段 | `createBattleState` 从 GameState/资源投影独立 players/enemies/field；runtime context 以 GameState owner 绑定 runScript/resources，finalization 清理；positions 只提供纯坐标表解析 | `battle-state.ts:698-918`、`battle-runtime-context.ts`、`battle-positions.ts`、`battle-system.ts:203-370,2760-3065`、`battle-finalization.ts`；专属 tests 待读取 |
| 当前二阶段 | N/A（仅 packages/game phase1） | `CLAUDE.md` 阶段规则 |
| 本任务目标 | 3 个文件逐段登记字段 ownership、容量/空槽/坐标边界、caller、风险和验证结果；未知项保留 review/blocked | 本卡、file ledger、定向/相邻测试和全仓门禁 |

### 反证与替代解释

- 最强替代解释：部分 optional 字段是旧 fixture 兼容而非产品缺陷；runtime context 的模块级 owner 可能是为了避免把资源塞进每个 action 参数，不能仅凭“全局”字样判错。
- 什么观察会推翻前提：同一 GameState 的两场战斗共享可变 BattleState/runtime context；finalization 后仍有 caller 读到旧资源；合法敌人数/空槽/位置表输入得到越界、重复或错误坐标；或移除 guard 后业务 oracle 仍全绿。
- 审计红项替代根因：BattleState schema/owner 误读、SDL 结构与 TS 工作副本误读、敌人位置数据解码错误、测试 fixture/模型错误四类必须分别排查；大 census 不直接授权改 schema。

### 用户可见偏离

- 是否主动偏离已核真值：no
- `before -> after`：从“3 个战斗基础文件尚未逐文件治理”到“字段/资源/位置 ownership 与边界均有直接证据；仅根因修复，不改变战斗容量、坐标或演出形态”。
- 代表场景：开战建立独立 BattleState，战斗结束清理 runtime context；同一敌队数量下每个 active slot 得到稳定合法位置，死亡/空槽不污染下一场。
- 用户裁决：N/A（若证据要求行为变化则暂停）。

## 上下文锚点

- 已拍板决策 / 铁律：`AGENTS.md` 前提真值门、第一阶段忠实还原、BattleState/runtime context 单一 owner、硬零诊断、测试少而精。
- 先读：`CLAUDE.md`、`docs/phase1/engineering-notes.md`、`docs/phase1/game-mechanics.md`、本卡、3 个实现文件全文、直接 callers/tests、`reference/sdlpal/battle.h/global.h/battle.c/fight.c` 对应段。
- 代码锚点：`battle-state.ts:461-918`；`battle-runtime-context.ts` 全文；`battle-positions.ts` 全文；`battle-system.ts:203-370,2760-3065`；`battle-finalization.ts:1-67`；`battle-anim-driver.ts:1-254`。
- 不得重新引入：探索态复用 BattleState、runtime 资源跨战斗残留、敌槽数量与稳定 objectId 混淆、位置表越界 fallback、数组位置充当对象身份、旧版本兼容字段扩张。
- 相关测试：`__tests__/battle-state.test.ts`、`battle-state.glm-next-wave.test.ts`、`battle-runtime-context.test.ts`、`battle-system.test.ts` 相关工厂段、`battle-finalization.test.ts`、`battle-anim-driver.test.ts`、`cross-module-boundaries.test.ts`。

## 验收条件

- 功能：3 个实现文件全文按职责/字段/owner/caller/primary source/risk/conclusion 登记；关键未知不标已验证。
- 测试：定向/相邻 state/runtime/positions/finalization/animation tests、game typecheck；若改代码再跑全仓 `pnpm check`、official ratchet、protected fast、Biome 零诊断。
- 文档：更新 file ledger/治理正文/卡/board/index；每个闭合批次 commit+push+archive。
- 视觉 / 手工验证：N/A；战斗演出视觉集中 E2E。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单：Codex / `codex/code-quality-governance` / 仅本卡 3 个实现文件与专属回归（若 direct evidence）。
- 前提核验：pending（先完成逐文件 primary/caller/oracle 读取）
- 范围、设计和验收条件：pending
- 高风险用户产品裁决：N/A（保持已核真值；证据冲突才暂停）
- build 准入结论：blocked（允许继续只读审计；不得开始实现/不得标记 done）。

## 交接日志

- 2026-10-05 Codex：Q3t 已归档；建立 battle-state/runtime-context/positions 窄卡，先完成 918/98/93 行实现、真实 owners/callers、专属 tests 与 battle.h/global.h/battle.c/fight.c primary source 逐段核验；未获 build 准入前不得修改实现。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-3u game battle-state/runtime-context/positions 逐文件治理
任务卡：docs/ops/tasks/CODE-QUALITY-3u-game-battle-state-runtime.md
当前状态：draft；前提真值门未完成，允许只读取证，**不得开始实现/不得标记 done**。
你的角色：Codex 先完成前提真值与独立证据核验。
先读：AGENTS.md、CLAUDE.md、docs/phase1/engineering-notes.md、docs/phase1/game-mechanics.md、本卡、battle-state.ts/runtime-context.ts/battle-positions.ts 全文、battle-system/finalization/anim callers、专属 tests、battle.h/global.h/battle.c/fight.c。
请你做：写完四向真值矩阵、替代解释和可证伪观察；逐段记录字段/owner/容量/位置 family/caller/风险；若发现 direct bug，先更新前提与 build 准入再改。
不要做：不得改变战斗容量/坐标/schema/save，不得修改 battle-system/opcodes 全文件、生成物/E2E/coverage runner，不得把 Reforge 结构带回第一阶段。
输出要求：Codex `premise verified/counter`、`design agree/counter`、build allowed 或 blocked；若准入，运行定向/相邻与全部质量门；把证据写入卡和 file ledger。
```
