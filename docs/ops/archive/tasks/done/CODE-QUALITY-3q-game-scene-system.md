# CODE-QUALITY-3q - game scene-system 移动/碰撞/触发逐文件治理

Status: done
Phase: phase1 game
Capability: ops / code-quality / phase1-mechanics
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: e2e-deferred（剧情/演出观感集中 E2E；本卡只验纯机制合同）
Contributor: Codex
Branch: codex/code-quality-governance

## 目标

逐文件审计 `packages/game/src/core/scene-system.ts`（662 行）的输入顺序、移动步长、碰撞/可行走、触发/auto-script、场景加载和队伍 trail caller；所有高风险行为先以原版 primary source、第一阶段代码和真实测试核真值，只有直接反例才修复。

## 范围

- 范围内：`scene-system.ts` 全文件、其直接 scene/event/present caller 与已有 scene-system/scene tests。
- 范围外：event-system 全文件、battle-system、save/schema/migration、生成物、剧情 E2E、UI 形态和 coverage runner。
- 明确不做：不凭截图/记忆改碰撞坐标，不批量迁移 scene 数据，不把用户可见路线取舍藏在代码修复里。

## 前提真值门

### 一句话行为 / 工程前提

scene-system 每 tick 的 input→触发→autoScript→移动→碰撞→camera/trail 顺序必须保持第一阶段已核实行为；scene loading/碰撞异常不得静默让角色或 NPC 穿墙、死锁或跨场景污染。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | `PAL_StartFrame`/`PAL_GameUpdate`/`PAL_UpdateParty`/`PAL_CheckObstacle`/`PAL_Search` 的顺序、步长、返回值和场景索引 | `reference/sdlpal/play.c:25-238,423-591`、`reference/sdlpal/scene.c:512-847`、`reference/sdlpal/map.c:277-299`、`reference/sdlpal/res.c:229-301`、`reference/sdlpal/global.h:75-121,512-531` |
| 第一阶段 | 当前 TS scene-system 与 `event-system`/`present`/`mode`/bootstrap/dev panel 的真实跨模块链 | `packages/game/src/core/scene-system.ts:187-662`、`mode.ts:20-92`、`event-system.ts:1208-1251,3344-3380`、`shell/bootstrap.ts:778-887`、`dev/dev-panel.ts:2260-2300`；`scene-system.test.ts` 全 2064 行、`scene-system-search.test.ts` 全文、`main-loop-gates.grok-r1.test.ts` caller 合同 |
| 当前二阶段 | N/A（仅 packages/game phase1） | `CLAUDE.md` 阶段规则 |
| 本任务目标 | 每个职责段有 caller、primary-source 锚点、可证伪反例和验证结果；未知项保留 review/blocked | 本卡、file ledger、测试/门禁输出 |

### 反证与替代解释

- 最强替代解释：某些 `sceneLoading`/trigger/collision fallback 可能是已批准的异步化补偿或 raw 数据边界，不因静态看似复杂就删除。
- 什么观察会推翻前提：真实 opcode/scene fixture 在合法输入下与 C 顺序或帧级坐标不一致；或删除某 guard 后唯一业务 assertion 仍全绿。
- audit 红项替代根因：runtime 命令分类、原版/第一阶段理解、extractor/map/data decode、test model 四类均须排查；大 census 只证明 mismatch，不直接授权迁移。

### 用户可见偏离

- 是否主动偏离已核真值：no
- `before -> after`：从“scene-system 尚未逐段治理”到“每段证据化；仅根因修复，不改变已核路线/坐标”。
- 代表场景：真实 scene trigger/party walk/auto script 在一 tick 内的输入顺序和碰撞结果。
- 用户裁决：N/A（保持已核真值；若证据冲突再停线请示）。

## 上下文锚点

- 已拍板决策 / 铁律：`AGENTS.md` 前提真值门、第一阶段忠实还原、迁移上游优先、硬零诊断、测试少而精。
- 代码锚点：`scene-system.ts` 全文；`mode.ts:20-92` 调度；`event-system.ts` scene/auto callers；`present.ts` follower/camera caller。
- 已知坑 / 审计文档：工程笔记 §1.1/§3.2/§3.3/§3.4；scene-system.test 中 P0/DH/M5.6/P2#5 回归块；`docs/phase1/game-mechanics.md` 相关移动/碰撞条目。
- 不得重新引入：绝对 camera 回正抹 0x7F 偏移、sceneLoading 黑屏/冻结、TouchFar 异步死锁、trail 多退一格、用近似坐标替换 raw 真值。
- 相关测试：`scene-system.test.ts`、`scene-system-search.test.ts`、cross-module/dependency-ownership、`present.test.ts` 相邻 follower/camera 合同。

## 验收条件

- 功能：scene-system 全 662 行分段登记职责、owner、caller、primary source、风险和结论；关键未知不标已验证。
- 测试：定向/相邻 scene tests、game typecheck；若改代码再跑全仓 `pnpm check`、official ratchet、protected fast、Biome 零诊断。
- 文档：更新 file ledger/治理正文/卡/board/index；每个闭合批次 commit+push+archive。
- 视觉 / 手工验证：N/A（剧情/演出视觉集中 E2E；本卡纯机制）。
- E2E 用例登记：N/A；若发现无法靠纯合同推进的实际视觉缺陷，另开 E2E 卡。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单：Codex / `codex/code-quality-governance` / 仅 `scene-system.ts` 与专属回归（若 direct evidence）。
- 前提核验：verified（已逐段读取 primary source、当前实现、生产 callers、测试；见下方审计日志）
- 范围、设计和验收条件：agree（audit-first；不主动改变坐标、触发、scene 索引或异步状态语义）
- 高风险用户产品裁决：N/A（保持已核真值；证据冲突才暂停）
- build 准入结论：build allowed（本批无实现变更白名单需求；若发现 direct bug 仍须先补反例再修）

### 进入 done 前：独立验收

- 贡献者交付与自验：scene-system 定向 3 files/131 tests、game typecheck 通过；完整 `pnpm check` 第二次重跑通过，editor 606/4,845、migrate 95/723，最终 lint 3198 files / 0 errors / 0 warnings / 0 infos。
- Codex 独立复核：accept（逐段 primary source/caller/test 证据核对；官方 ratchet 与 `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast` 均通过，726 files / 19,285 tests，逐包及全仓无回退，提升 0）。
- 用户体验/产品验收：N/A（纯机制；剧情视觉延后）。
- done 准入结论：done allowed；本卡只关闭 scene-system 与其专属 scene-system.test.ts 的逐文件治理，不代表 event-system、battle-system、save 或全仓剩余 2,760 个待核记录已完成。

## 交接日志

- 2026-10-05 Codex：Q3p 已归档；建立 scene-system 高风险卡，先完成全文/primary/caller/测试读取，未获 build 准入前不得修改实现。
- 2026-10-05 Codex：完成 scene-system 662 行、scene-system.test.ts 2064 行、scene-system-search.test.ts 88 行的全文读取；对照 `play.c`/`scene.c`/`map.c`/`res.c`/`global.h` 及 `mode.ts`、`event-system.ts`、`bootstrap.ts`、dev-panel callers。定向 3 files/131 tests 全绿；未发现可由当前 primary source + 真实 caller 证实的 direct defect，准入 audit-only build。
- 2026-10-05 Codex：第一次完整 check 的 editor serial 阶段因资源竞争出现静态审计/React workflow 超时；逐项单跑通过，随后第二次完整 check 稳定通过，故不改测试 timeout/排除，也不把第一次环境性失败当产品缺陷。
- 2026-10-05 Codex：完整 `pnpm check`、官方 `pnpm coverage:ratchet`、保护 `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast` 和 Biome 零诊断全部通过；ratchet 基线未变化，protected fast 逐包/全仓 0 回退。

## 逐段审计证据（2026-10-05）

| 实现段 | 当前行 | 真实 caller / oracle | primary source | 结论 |
|---|---:|---|---|---|
| SceneContext / singleton 与资源上下文 | `44-52,609-636` | `shell/bootstrap.ts:645-657,778-887`、`dev/dev-panel.ts:2260-2300`、`dependency-ownership.test.ts` | `res.c:229-301`、`global.h:115-121` | `loadScene` 写入新 tilemap/commands/labels/mapNum；生产异步路径另有 `loadSceneCommon`，未见旧 context 可继续消费的直接反例 |
| 输入顺序、方向优先级、步长 | `66-105,468-571` | `mode.ts:57-64`、`main-loop.ts:100-106`、scene tests P0/System A | `play.c:513-591`、`scene.c:779-847`、`input.c:180-189` | 先 pre-input，再走路，再菜单/快捷键/Search；方向为 held Set 末位，`±16/±8` 与 C 一致 |
| 自动触发 / vanish / revive / facing | `187-267` | `tickScenePreInput:444-466`、`event-system.ts:1208-1251`、scene trigger/deadlock tests | `play.c:81-191`、`global.h:75-92` | `sVanishTime`、负 `sState` 复活、4..8 加权阈值、单 cursor 同帧触发门与 `suppressAutoTriggerOnce` 均有直接合同；未发现错误 guard |
| blocker push | `269-297` | `tickScenePreInput`、scene push tests | `play.c:197-238`、`scene.c:512-633` | 只看 `sState>=2 && spriteNum!=0`，按 NPC facing 后四向尝试并传 `fCheckRange=true`；不写 trail/步态与 C 一致 |
| 事件装载 / global ip / owner | `299-339` | Confirm Search 与 auto trigger caller、event-system cursor/restore | `play.c:153-165`、`script.c:3187`、`global.h:120` | `triggerResume` 优先、global label 解析、`fScriptSuccess`/owner/current object 写入均与现行单数组模型一致 |
| 菱形碰撞 / tile bit / NPC blocker | `341-426` | `tickSceneInput`、`present/follower-pos.ts`、battle/scene callers、collision tests | `scene.c:522-633`、`map.c:277-299`、`global.h:77-80` | h=0/1 四分法、bit13、越界阻挡、`sState>=2` 曼哈顿 `<16` 和 `fCheckRange` 下边界均有正反例；未用静态 census 推断缺陷 |
| camera / trail / walking frame | `428-435,484-527` | `present.ts:416`、follower tests、main-loop/mode | `scene.c:636-847`、`res.c:301` | 走成功才 unshift trail、步态 0..3/站立复位、camera 依据 partyoffset；已知脚本相对 camera 由 event-system 独立维护，未在本文件误改为绝对回正 |
| `loadScene` lazy/cache/onEnter/partyStart | `588-662` | `SceneAssetsCache`、bootstrap `loadSceneCommon`、dev panel；loadScene tests + event K02 contracts | `play.c:56-75`、`global.h:115-121`、`script.c:1870-1887,2292-2357` | sceneId 0-based→`wNumScene+1`、NPC slice、context 更新、onEnter 先跑后由显式 partyStart 覆盖；测试覆盖 cache、持久 NPC、死亡标记、onEnter label 缺失。`partyStart` 是 dev helper 产品边界，未扩大到保存/迁移 |

### 反证排查记录

- 运行时语义/命令分类：`mode.ts` 与 `event-system.ts` 的 autoScript、scene-load、camera-pan gates 已逐段比对；`tickScenePreInput`/`tickSceneInput` 没有把 event mode 的 cursor 解释重复实现。
- 原版/第一阶段理解：方向、`fCheckRange` 返回值、NPC blocker state、trigger mode 阈值和 scene 1-based 索引均直接回到 C，而不是由测试 fixture 反推。
- 提取/地图/数据解码：本卡只消费 `SceneAssets`/`Tilemap` 已解析数据；未发现需要改 extractor/map decoder 的反例，因此不改生成物或迁移层。
- 审计/测试模型：scene tests 使用真实 `tickSceneSystem`、`tickEventSystem`、`SceneAssetsCache`、`setGlobalEvents`；包含非法 label、边界阈值、越界 tile、阻挡/非阻挡、异步触发死锁反例，不把全绿或数量单独当作结论。

### build / review 结论

- `premise verified`：Codex；证据为上述 primary-source 行号、生产 caller 和真实测试全文读取。
- `design agree`：Codex；audit-only，保持行为/接口/schema/save/生成物/UI 边界。
- `accept` 前置条件：全部通过；scene-system 无实现变更，保持现有行为/API/schema/save/生成物/UI 边界。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-3q game scene-system 移动/碰撞/触发逐文件治理
任务卡：docs/ops/tasks/CODE-QUALITY-3q-game-scene-system.md
当前状态：done；scene-system 已完成逐段证据与质量门，**不得把本卡扩大为未列文件或全仓治理完成**。
你的角色：Codex 先完成前提真值与独立证据核验。
先读：AGENTS.md、CLAUDE.md、docs/phase1/engineering-notes.md、docs/phase1/game-mechanics.md、本卡、scene-system.ts 全文、play.c/scene.c/map.c、真实 callers/tests。
请你做：写完四向真值矩阵、替代解释和可证伪观察；逐段记录职责/owner/caller/风险；若发现 direct bug，先更新前提与 build 准入再改。
不要做：不得凭截图/记忆改坐标，不得改 scene 数据/save/schema/迁移/E2E/coverage runner。
输出要求：历史交接已收口；无下一位 Agent 提示词，继续治理必须新开不重叠卡并重新过前提真值门。
```
