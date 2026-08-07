# W9 - 实体暂离、重现与明雷逃跑冷却

Status: draft
Phase: phase2
Capability: W9 / B8 / B9 / X1
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex + User
Unavailable Agents: none（2026-08-07 GLM/Kimi 均已恢复,补审中）
Branch: main

## 目标

用干净、可保存的实体生命周期模型替代第二阶段当前的 `respawnSeconds + host.wait` 临时实现，完整承接迁移内容中的两类原始语义：实体可见但暂停自动触碰、敌对遭遇和 autoScript 的短冷却，以及实体隐藏、所属场景的世界逻辑 tick 计时并在当前坐标离开固定视野后重现。明雷战斗成功分支和玩家逃跑必须分别走正确生命周期，切换场景、保存读档或盯着实体都不能绕过规则。

## 范围

- 范围内:
  - content schema 中语义明确、彼此分离的“暂停自动行为”和“隐藏待重现”能力。
  - 以稳定 `EntityAddress` 为身份的 WorldState 生命周期状态及其校验。
  - Reforge 当前场景生命周期 reducer、渲染/碰撞/trigger/auto/hostile gate、重现时动作帧复位。
  - SAVE / content epoch 升级与旧版本确定性迁移或明确拒绝策略。
  - `0x4B`、`0x52` 和标准明雷脚本折叠的上游迁移修复及全量 PAL 重生成。
  - 编辑器对明雷胜利策略、逃跑冷却和两类脚本能力的中文 CRUD。
  - B8 / B9 / X1 capability-map 口径修正。
- 范围外:
  - 敌人混乱攻击同伴；该纯战斗问题属于 backlog 18a。
  - 改写战斗胜负判定、伤害公式或战斗动画。
  - 把原版全局事件对象数组、负数状态或 `sVanishTime` 原样带入公共 schema。
- 明确不做:
  - 不继续用 detached `host.wait()` 维持实体生命周期。
  - 不把 `0x4B` 和 `0x52` 合并成同一个含糊的 `vanishEntity`。
  - 不直接修 `projects/pal` 生成产物。
  - 不以“当前模型功能上可用”为由放弃一阶段已记录的机制真值。

## 上下文锚点

- 已拍板决策 / 铁律:
  - 用户于 2026-07-30 明确要求：涉及游戏机制优先参考 `docs/phase1/game-mechanics.md`，其中是一阶段已核实真值，不得自行猜测。
  - `docs/phase2/READ-FIRST.md` 铁律 9：战斗、数值与机制真值以一阶段 `game-mechanics.md` 为首选；铁律 10：迁移缺陷先修上游并全量重生成。
  - 本任务行为真值包含一阶段刻意保留的固定 `320×320` 离屏边界，`y + 320` 也不得擅自改成实际屏高；第二阶段只重建干净架构，不重猜行为。
  - 这是 schema / save / migration / 公共世界状态 / capability-map 变化，属于高风险任务；三方设计签字前不得修改实现文件。
- 代码锚点(`file:line`):
  - `docs/phase1/game-mechanics.md:1000-1111`：完整生命周期、10fps、`0x4B`、`0x52`、固定 `320×320` 离屏门和一阶段实现状态。
  - `packages/game/src/core/scene-system.ts:190-225`：一阶段倒计时、离屏重现和触发 gate 真值实现。
  - `packages/game/src/core/scene-system-search.ts:69-98`：`sVanishTime < 0` 期间手动确认搜索仍可命中 triggerMode 1–3。
  - `packages/game/src/core/event-system.ts:1186-1189`：一阶段 autoScript gate。
  - `packages/game/src/core/event-system.ts:3930-3947`：一阶段 `0x4B` / `0x52` 真值实现。
  - `packages/content/src/index.ts:67-104`：当前 `EntityDef.hostile.respawnSeconds`。
  - `packages/content/src/script.ts:83-89`、`packages/content/src/script-v5.ts:74-85`：当前含糊的 `vanishEntity`。
  - `packages/reforge/src/main.ts:1454`、`packages/reforge/src/main.ts:3234-3263`：当前 runtime 隐藏与 detached wait。
  - `packages/reforge/src/save/types.ts:82-111`：当前 WorldScriptState / SAVE envelope。
  - `packages/migrate/src/translate-events.ts:1651-1657`：当前把 `0x4B` / `0x52` 合并的翻译。
  - `packages/migrate/src/migrate-content.ts:2441-2470`：当前标准明雷折叠。
  - `packages/editor/src/ui/App.tsx:2681`、`packages/editor/src/ui/App.tsx:2982-2990`：当前重生秒编辑入口。
- 已知坑 / 审计文档:
  - `docs/phase2/design-backlog.md` 议题 18b。
  - `docs/phase2/foundation/phase1-knowledge-harvest.md`：机制重写先读一阶段知识。
  - `docs/ops/audits/kimi-p7-r13-source-semantics-audit.md`：迁移源语义不能在折叠时丢失。
  - 当前 PAL 生成数据初步清点：73 个场景有 828 个 `respawnSeconds`（826 个 80 秒、1 个 10 秒、1 个 15 秒）；28 个场景仍有 193 个 `vanishEntity`（100 个来自错误翻成 2 秒隐藏的 `0x4B`，93 个来自 `0x52`）。进入 build 前由 GLM 复核并冻结正式账本。
  - `0x4B` 期间并非全面禁止手动交互：世界更新跳过自动触碰触发与 autoScript，但手动确认搜索不检查 `sVanishTime`；triggerMode 1–3 仍可手动触发。
  - `0x52` 是 `sState *= -1` 的 toggle，不是无条件“设为 despawned”。进入 build 前必须用源站点账证明调用前状态，或冻结异常前态策略。
  - 原版倒计时依赖世界逻辑更新；战斗、菜单或阻塞脚本暂停 world update 时不能用墙钟/后台 timer 偷跑。
  - startBattle 只有“玩家逃跑”走 operand2；敌人逃跑或 terminate 走成功 fallthrough，但没有普通胜利奖励。不能把所有 flee 都归到 onFlee / `0x4B`。
- 不得重新引入:
  - 原版下标式实体身份、全局事件对象数组或正负数字哨兵进入 public schema。
  - 场景切换后丢状态、重新 clone 场景即复活、读档立即复活。
  - 只在同场景异步回调中成立的计时器。
  - “缺 `respawnSeconds` = 永久击杀”但 WorldState 无持久记录的虚假承诺。
  - 逃跑与胜利共用同一消失策略。
- 相关测试:
  - `packages/game/src/core/scene-system.test.ts:669`：一阶段倒计时 / 离屏重现测试。
  - `packages/game/src/core/event-system.test.ts:2013`：一阶段 opcode 与生命周期测试。
  - Reforge world、save、script runner、migrate 和 editor 各自新增覆盖；完整矩阵见下。

## 验收条件

- 功能:
  - “短暂暂停”精确持续 15 个 100ms 世界逻辑 tick：实体仍可见并保持原碰撞；自动触碰触发、autoScript 和 hostile 遭遇暂停，但 triggerMode 1–3 的手动确认仍可触发；结束后原地恢复。
  - “隐藏待重现”期间不渲染、不碰撞、不触发、不跑 auto/hostile；倒计时只在所属场景为当前场景时推进。
  - 世界逻辑暂停（战斗、菜单、阻塞脚本）时生命周期不推进；离场冻结，回场精确续算，禁止墙钟或后台 timer。
  - 倒计时到零但实体当前投影坐标仍在相对相机固定 `320×320` 边界内（端点包含）时继续隐藏；到 `-1/321` 外才重现。只复位动作帧 0，不重置当前位置、朝向或碰撞类别。
  - 生命周期状态跨场景、保存与读档保持；不得靠重新装载场景绕过。
  - 明雷普通胜利、敌人逃跑和 terminate 都进入成功脚本接续；敌人逃跑/terminate 保留无奖励语义。只有玩家逃跑进入可见的 1.5 秒自动触碰/敌对冷却。
  - `0x52` 保留 toggle 语义：正态进入隐藏待重现；负态调用会转回正态并按正倒计时暂藏；`state = 0` 仍为 0。迁移账必须证明常见站点前态，异常前态不得静默改写。
  - 永久移除有显式、可保存的语义，不再依赖缺字段推测。
- 测试:
  - 生命周期 reducer 单测覆盖暂停、隐藏、世界逻辑暂停、当前场景计时、离屏门、精确投影边界、帧复位和非法状态。
  - runtime 集成覆盖普通胜利、玩家逃跑、敌人逃跑、terminate、手动确认、自动触碰、原地等待、场景往返与碰撞/渲染 gate。
  - save round-trip 覆盖暂停中、倒计时中、等待离屏、永久移除四类状态及剩余 tick、`awaitingExit`、离场冻结后续算。
  - 迁移测试逐类钉死 `0x4B` / `0x52` operand（0→800、1→1、N→N 及 SHORT 边界）、toggle 前态、标准明雷 success/player-flee；正式账本所有站点有 disposition。
  - 全量重迁只写白名单，第二次迁移 `writes/conflicts/deletes = 0/0/0`。
  - 编辑器命令、撤销/重做、保存重开与删除/引用保护闭环。
- 文档:
  - 更新 content/save schema、迁移说明、capability-map B8/B9/X1 和 `design-backlog` 18b。
  - 任务卡记录冻结账本、版本决策、命令与完整验证证据。
- 视觉 / 手工验证:
  - 至少选一个标准明雷和一个特殊 `0x52` 实体，实际验证玩家逃跑、成功分支、80 秒世界 tick、盯实体当前位置、离屏重现、场景往返和保存读档。
  - 编辑器以中文区分“玩家逃跑后短暂不自动触发”和“成功后隐藏并重现”，不向作者暴露 `sVanishTime`。

## 推进签字

签字是阶段门禁。开卡任务必须集齐三方签字才能推进；缺签只能由用户明确豁免。`Status` 字段不能替代签字。

### 进入 build 前:设计签字

- Codex: **agree**（2026-08-06，设计冻结完成：四态状态机/默认值/320×320 边界含 sdlpal y=320
  typo 忠实复刻、0x52 toggle 前态、BattleResult 四分类、hostile success/playerFlee 拆分、
  SAVE 可选字段不 bump 先例——见「冻结设计」）
- Kimi: **agree**（2026-08-07，额度恢复补审，架构/save/schema 主审：四态/计时基准/toggle
  前态/320×320 边界对源成立，附 K1-K4 build 准入钉——旧档 entityState 隐藏态映射规则、
  content epoch 与 MG2 边界、BattleResult 公共接口边界、派生状态单一源；见「Kimi 设计压测」）
- GLM: **agree（2026-08-07，迁移账本/测试矩阵主审：四态状态机 + 计时基准(有效世界 tick) + 320×320 边界 + 0x52 toggle 前态对源 game-mechanics.md:1060-1101 逐条核实成立；SAVE 可选字段不 bump 先例(skillUseCounts/collectValue)认可。附 G1-G2 build 准入钉：源账本 828+193 mutually-exclusive disposition + 总数守恒、SAVE 升级矩阵口径(确定性迁移 vs sidecar 前拒绝二选一)由 build 期 GLM 冻结。见「GLM 设计压测」）**
- counter / 分歧处理: 无 counter
- 缺签豁免: N/A（Kimi/GLM 补签完成）
- build 准入结论: **allowed**（2026-08-07，三方 agree 齐；G1-G2 + K1-K4 为 build 验收钉，
  不阻塞准入）

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

**冻结设计（2026-08-06，Codex；待 Kimi/GLM 压测签字。字段名可在不改变语义前提下收敛）**

**1. 状态机（精确，源自 game-mechanics.md:1000-1111 + sdlpal play.c:81-166）**

生命周期四态，语义状态不复制原版 `sVanishTime`/`sState×-1` 数字协议：

| 状态 | 语义 | 可见性 | 碰撞 | 自动触碰/auto/hostile | 手动确认(triggerMode 1-3) | 计时 |
|---|---|---|---|---|---|---|
| `suspended` | 0x4B 短暂暂停（源 `sVanishTime<0`，默认 15 tick=1.5s） | 可见 | 保持 | 暂停 | **允许** | 每有效世界 tick −1 |
| `despawned` | 0x52 隐藏待重现（源 `sVanishTime>0` + `sState<0`，默认 800 tick=80s） | 隐藏 | 退出 | 禁止 | 禁止 | 每有效世界 tick −1 |
| `awaitingExit` | 倒计时归零、仍隐藏，等待离开固定 320×320 视口 | 隐藏 | 退出 | 禁止 | 禁止 | 不推进；离屏即转 `normal` |
| `removed` | 显式永久移除（可保存、不依赖缺字段推测） | 隐藏 | 退出 | 禁止 | 禁止 | 永久 |

- 默认值：0x4B=15 tick（1.5s）、0x52=800 tick（80s）；0x52 带操作数 N → N tick。卡内 828 hostile
  账本（826×80s + 1×10s + 1×15s）与 0x52 账本逐站对账。
- 计时基准：仅**所属场景为当前场景**的有效世界逻辑 tick（100ms）推进；战斗/菜单/阻塞脚本暂停
  world update、离场均冻结；回场从持久剩余 tick 续算。**禁止墙钟/后台 timer/detached wait**。
- 重现：`awaitingExit` 时实体当前投影坐标在**相对相机固定 320×320 边界内**（端点包含）继续隐藏；
  离开边界才转 `normal`，只复位动作帧 0，不重置位置/朝向/碰撞类别。**y 比较复刻 sdlpal 320
  （play.c 疑 typo 应为 200，忠实保留，不得“修正”）**。
- 0x52 toggle 语义：公共命令表达**前态感知的 toggle**——`normal → despawned`（正倒计时）；
  负态调用转回 `normal` 并按正倒计时暂藏；`state=0` 保持 0。迁移账本必须证明常见站点前态；
  异常前态 fail-loud，不得静默改写。

**2. Schema（content + save）**

- `EntityDef` 新增生命周期能力（语义名，非原版数字）：
  - `lifecycle?: { onSuspend?: { ticks: number }; onHide?: { ticks: number } }` —— 0x4B/0x52
    作者命令拆开，中文可解释；具体类型名由设计复审冻结。
- `hostile.policy` 拆成两个显式字段：
  - `success`：普通胜利后隐藏待重现（`onHide`）或保持现状；
  - `playerFlee`：玩家逃跑后 `onSuspend(15)`（1.5s 自动触碰/敌对冷却）。
  - 敌人逃跑/terminate 走 success 接续但**不触发隐藏**、**不给奖励**（B7a 战果口径不变）。
- `WorldState.entityLifecycles: Record<EntityAddress, LifecycleEntry>`：
  `{ phase: 'suspended'|'despawned'|'awaitingExit'|'removed', remainingTicks: number }`；
  稳定 `EntityAddress` 为键，不复制原版下标/全局数组。
- SAVE：`WorldScriptState` 增加可选字段；旧档缺省 → 实体均为 `normal`（确定性默认，不 bump
  SAVE_VERSION，先例 = skillUseCounts/collectValue）；升级矩阵由设计复审冻结（确定性迁移或
  任何 sidecar I/O 前明确拒绝，二选一写死）。

**3. 迁移（先修上游 + 全量重生成）**

- `translate-events.ts:1651-1657` 拆 `0x4B`/`0x52`：`0x4B` → `onSuspend(15)`（operand 0→800、
  1→1、N→N 及 SHORT 边界逐站对账）；`0x52` → `onHide` toggle（记录调用前 `sState`）。
- `migrate-content.ts:2441-2470` 标准明雷折叠改为按 `BattleResult` 四分类接续（普通胜利/玩家
  逃跑/敌人逃跑/terminate），hostile policy 显式落 `success`/`playerFlee`。
- 源账本（GLM 冻结前复核）：828 hostile（826×80s + 1×10s + 1×15s）+ 193 residual
  （100×误翻 2s 隐藏的 0x4B + 93×0x52）→ mutually-exclusive disposition + 总数守恒。
- 生成产物不手修；二次迁移 0/0/0。

**4. 运行时（reforge）**

- 场景世界逻辑统一 reducer 推进生命周期表；渲染/碰撞/trigger/auto/hostile 都查询同一派生
  状态（不各自维护布尔副本）。`main.ts:3234-3263` detached wait 退役。
- `BattleResult` 显式区分普通胜利/玩家逃跑/敌人逃跑/terminate；W9 只从该边界接续，与 18a
  （混乱战斗）互不侵入。

**5. 编辑器**

- 中文 CRUD：明雷 victory 隐藏/重现策略、玩家逃跑冷却、`onSuspend`/`onHide` 两能力；
  不暴露 `sVanishTime`。`App.tsx:2681/2982-2990` 重生秒编辑入口改为新语义字段。

### 已知风险

- 风险: WorldState 与 SAVE envelope 改动会影响 canonical 脚本 cursor 和当前 R13 内容版本。
- 缓解: W9 不与 R13-5 并行改 schema；等当前 R13 批次形成已审候选后再冻结 W9 版本矩阵。
- 风险: 旧 `vanishEntity` 同时承载两种源语义，不能仅靠 seconds 可靠反推所有作者意图。
- 缓解: 以原始 opcode provenance / R13 source disposition 建正式站点账本；歧义站点逐项列出，不猜测。
- 风险: hostile 折叠可能丢掉战斗逃跑分支和战后脚本接续。
- 缓解: 普通胜利、玩家逃跑、敌人逃跑和 terminate 独立建模，并用生成前后源闭包与代表场景手工验收证明。
- 风险: 固定 `320×320` 与当前实际画布尺寸不同，容易被“修正”为自适应视口。
- 缓解: 任务卡明确这是用户指定采用的一阶段机制真值，写边界回归测试和代码注释。
- 风险: 828 + 193 处初步统计可能有重叠、已折叠或特殊编排。
- 缓解: GLM 在设计签字前冻结 mutually-exclusive disposition 和总数守恒。
- 风险: 初稿曾把 `0x4B` 简写为“不可触发”，容易误伤仍可用的手动确认。
- 缓解: 以 SDLPal `play.c` 手动搜索和一阶段 `scene-system-search.ts` 为精确锚点，并同步更正文档措辞。

### 主审立场

- Reviewer: Kimi（架构/save/schema）+ GLM（迁移账本/测试矩阵）
- 结论: **GLM agree（附 G1-G2）+ Kimi agree（附 K1-K4）**
- 必改项: 见 G1-G2 + K1-K4（build 准入钉）
- 是否建议进入 build: **双方同意进入 build（钉子均为验收钉，不阻塞准入）**

### 三方争议记录(按需)

- Codex: 采用语义生命周期表、统一世界 reducer、固定 `320×320` 行为真值；二次核对后补入手动确认、0x52 toggle、world-update pause 与敌逃/terminate 成功分支，不复制原版数据结构。
- Kimi: **agree（2026-08-07，架构/save/schema 主审）**。详见「Kimi 设计压测」。
- GLM: **agree（2026-08-07，迁移账本/测试矩阵主审）**。详见「GLM 设计压测」。
- 用户拍板: 2026-07-30，游戏机制以一阶段 `game-mechanics.md` 已核实真值为参考，不得猜测。

#### Kimi 设计压测（2026-08-07，架构/save/schema，额度恢复补审）：**agree（附 K1-K4 build 准入钉）**

**方法**：只读设计压测；一手核 game-mechanics.md:1000-1111 真值段、content/script-v5.ts:74-99
（entityState 持久结构）、reforge save/migration.ts:657-713（旧档 entityState 迁移点）、
save/ops.ts:123-131（可选字段缺省先例）。未修改实现。

**对源核实（架构层成立，与 GLM 互补）**：

1. **四态 + 计时基准**：suspended/despawned/awaitingExit/removed 与源 sVanishTime 正负语义
   对齐;「仅所属场景为当前场景的有效世界 tick 推进」从架构上杜绝墙钟/detached wait——
   这是本卡替代 `respawnSeconds + host.wait` 临时实现的核心收益,方向正确。
2. **0x52 toggle 前态**:前态感知命令依赖运行时前态(normal→despawned / 负态→normal 暂藏 /
   state=0 保持)——对回放确定性敏感但源语义如此(sState×=−1),保留正确;迁移账证明前态
   (GLM G1)是正确兜底。
3. **awaitingExit 320×320**:固定边界 + 端点包含 + y 比较复刻 320 typo——用户拍板真值,
   「不得修正为自适应视口」纪律 + 边界回归测试正确。
4. **BattleResult 四分类接续**:普通胜利/玩家逃跑/敌人逃跑/terminate 显式区分,敌逃/terminate
   走 success 但不隐藏不奖励(B7a 口径不变)——接续边界干净。
5. **不得重新引入清单逐条对**:EntityAddress 键(非下标)、WorldState 持久(非场景 clone)、
   removed 显式(非缺字段推测)、success/playerFlee 拆(非共用消失策略)——全满足。

**K 钉（build 准入必落,增量于 G1-G2,不阻塞 agree）**：

- **K1（旧档 entityState 隐藏态映射规则——SAVE 兼容真实边界）**:现有 `world.script.entityState`
  （Record<实体,数字表>,script-v5.ts:78）跟存档;旧档里被 vanishEntity 隐藏的实体在
  entityState 有持久标记。新增 entityLifecycles 可选字段缺省 → 全 normal,意味着**旧档已隐藏
  实体读档后复活**。build 前必须显式二选一写入 G2 升级矩阵：(a) 确定性映射（旧 entityState
  隐藏标记 → despawned,remainingTicks 重计 800）;或 (b) 文档化「旧档复活」为一次性可接受
  偏差（内容上这些实体 80s 后本就会重现）。**不得静默复活而不记录**。
- **K2（content epoch 与 MG2 边界）**:EntityDef.lifecycle / hostile.policy 拆分是 content
  schema 变化——走 contentVersion bump + MG2 append-only 迁移账(R13 批次先例);与 R13
  串行不并行改 schema(卡内风险节已声明);版本矩阵 build 前冻结（与 GLM G2 合并冻结）。
- **K3（BattleResult 公共接口边界）**:四分类是 battle-core 公共接口扩展——与 B11-1 casualty
  sweep、18a 混乱(范围外)边界不互侵入;success 接续不得改变 B7a 战果/奖励口径(敌逃/
  terminate 不给奖励=不发奖励事件);接口消费点(battle-session/main.ts 接续)逐项核。
- **K4（派生状态单一源）**:reducer 输出统一派生(可见/可碰撞/可触发/auto 允许/hostile 允许);
  渲染/碰撞/trigger/auto/hostile 全部消费同一派生——测试证明无第二布尔副本(防一阶段
  「共享状态漏判」重演,议题 14 证据 A/B 的根因纪律)。

**结论**：**agree**。架构方向(语义生命周期表 + 统一 reducer + 单一派生)正确;K1-K4 为
build 验收钉,不阻塞准入。建议进入 build(G1 census 由 GLM build 期冻结)。

**边界**：本 agree 只准入 W9 build,不代表 done。

#### GLM 设计压测（2026-08-07，迁移账本/测试矩阵）：**agree（附 G1-G2 build 准入钉）**

**方法**：只读设计压测；一手核实 game-mechanics.md:1060-1101（sVanishTime/sState 生命周期真值 +
0x4B/0x52 默认值 + 320×320 视口外重现 + 跨场景持久）、sdlpal play.c 锚点（卡内引用）、
设计冻结四态 + schema + SAVE 口径。未修改实现。

**对源核实（设计成立）** ✅：
1. 四态状态机对源：`suspended`(0x4B sVanishTime<0 可见暂停自动)、`despawned`(0x52 sVanishTime>0+sState<0
   隐藏倒计时)、`awaitingExit`(倒计时归零仍隐藏等离屏)、`removed`(永久)——与 game-mechanics.md:1068-1101
   的 sVanishTime 正负语义 + sState<0 隐藏待复活逐条吻合。默认值 0x4B=15tick(1.5s)/0x52=800tick(80s)对源。
2. 计时基准：仅所属场景为当前场景的有效世界逻辑 tick(100ms)推进，战斗/菜单/阻塞脚本暂停——对源
   game-mechanics.md:1060「切场景、战斗、菜单或阻塞脚本暂停世界更新时不会用墙钟偷跑」。禁止墙钟/detached wait 正确。
3. 320×320 边界 + y 比较复刻 sdlpal 320(疑 typo 忠实保留)：用户拍板的一阶段机制真值，设计明确不"修正"，
   写边界回归测试 + 注释——纪律正确。
4. 0x52 toggle 前态语义(normal→despawned 正倒计时 / 负态→normal 暂藏 / state=0 保持)：迁移账本须证明
   常见站点前态、异常 fail-loud——口径正确。
5. hostile.policy 拆 success/playerFlee + 敌逃/terminate 走 success 但不触发隐藏/不给奖励(B7a 口径不变)：清晰。
6. SAVE 可选字段不 bump SAVE_VERSION（先例 skillUseCounts/collectValue）：认可——旧档缺省→normal 确定性默认。

**G 钉（build 准入必落，非 agree 阻塞）**：
- **G1（源账本 828+193 守恒——GLM build 期冻结责任）**：828 hostile(826×80s+1×10s+1×15s) + 193 residual
  (100×误翻 2s 隐藏的 0x4B + 93×0x52) 必须落 mutually-exclusive disposition + 总数守恒 census（build 期 GLM
  逐站核对源 disposition，证明无重叠/已折叠/特殊编排漏计）。这是设计卡明确的 GLM 责任，build 前冻结。
- **G2（SAVE 升级矩阵口径）**：设计写"确定性迁移或任何 sidecar I/O 前明确拒绝，二选一写死"——build 前
  必须二选一并落测试（旧档缺省→normal 的确定性 + sidecar 拒绝路径单测）。不得留"二选一"悬空到实现。

**结论**：设计方向干净、四态对源、计时/边界/toggle/SAVE 口径正确，无 schema 泄漏（不 bump SAVE_VERSION）。
**agree**。G1（源账本守恒 census）、G2（SAVE 升级矩阵二选一写死）为 build 准入必落钉——GLM 席位于 build 期
冻结 G1 census + 核 G2 落地。建议进入 build（blocked on Kimi 架构/save/schema 主审）。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: pending；设计三签前不得开始实现。
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: N/A

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex + User
- 验证方式: pending
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-07-30 Codex: 根据用户要求，对照一阶段机制真值和第二阶段实现完成只读审计并开 W9 高风险任务卡；确认 18b 是 world/save/migration/editor 的系统性缺口，不是 battle-core 小补丁。
- 2026-07-30 Codex 二次真值核对: 发现初稿把 `0x4B` 手动确认也禁掉、把 `0x52` 当单向 set、漏了 world-update pause 和敌逃/terminate success 分支；已撤回 Codex 设计签字并补齐验收。Next: 先冻结这些差异及 schema/save/迁移账本，再三方签字。
- 2026-08-06 Codex: 设计冻结完成（见「冻结设计」节）：0x4B=-15/0x52=800 默认值、suspended 手动确认
  放行、awaitingExit 320×320 边界（含 sdlpal y 比较 320 typo）、0x52 toggle 前态、hostile
  success/playerFlee 拆分、BattleResult 四分类、SAVE 可选字段不 bump、828+193 源账本待 GLM
  冻结。Next: Kimi/GLM 设计压测签字。
- 2026-08-07 GLM: 设计压测 agree（G1 源账本 census、G2 SAVE 升级矩阵二选一写死）。
- 2026-08-07 Kimi: 额度恢复补审,设计压测 **agree（附 K1-K4）**——三方 agree 齐,**build 准入
  allowed**。K1 旧档 entityState 隐藏态映射规则（不得静默复活不记录）、K2 content epoch +
  MG2 append-only 边界、K3 BattleResult 公共接口边界（B11-1/18a 不互侵入、B7a 口径不变）、
  K4 派生状态单一源（无第二布尔副本）。详见「Kimi 设计压测」。Next: Codex build
  （G1 census 由 GLM build 期冻结）。

## 下一位 Agent 提示词

```text
接手任务: W9 实体暂离、重现与明雷逃跑冷却实现（三方 agree 齐,build allowed）
任务卡: docs/ops/tasks/W9-entity-lifecycle-respawn.md
当前状态: draft → build 准入 allowed(Codex/GLM/Kimi 三方 agree,2026-08-07)。
你的角色: Coding Owner——build 阶段唯一实现文件修改者。
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡全文(冻结设计 + GLM G1-G2 + Kimi K1-K4);
  docs/phase1/game-mechanics.md:1000-1111、卡内全部代码锚点。
必落钉(build 验收逐项核):
  - G1(GLM build 期冻结): 源账本 828+193 mutually-exclusive disposition + 总数守恒 census。
  - G2+K1: SAVE 升级矩阵写死——旧档缺省→normal 确定性 + entityState 隐藏态映射规则
    (确定性映射 despawned 重计,或文档化一次性偏差)+ sidecar 拒绝路径单测。
  - K2: content schema 变化走 contentVersion bump + MG2 append-only;与 R13 串行。
  - K3: BattleResult 四分类公共接口边界;敌逃/terminate 走 success 不隐藏不奖励;
    B7a 战果口径不变。
  - K4: 统一 reducer 单一派生状态;渲染/碰撞/trigger/auto/hostile 同消费;测试证无第二
    布尔副本。
  - 冻结设计全部: 四态语义/默认值(15/800 tick)/320×320 边界(含 y=320 typo)/0x52 toggle
    前态/手动确认放行/有效世界 tick 计时(禁墙钟/detached wait)。
迁移: 拆 0x4B/0x52、明雷折叠四分类、全量重生成、二次迁移 0/0/0;不手修生成产物。
编辑器: 中文 CRUD 两能力 + 明雷策略/逃跑冷却;不暴露 sVanishTime。
验收输出: 实现摘要 + G/K 钉逐项对照 + 测试证据;回卡交 Kimi/GLM review 签字。
```

```text
接手任务: W9 实体暂离、重现与明雷逃跑冷却（设计压测）——已执行完毕,勿再执行
说明: 本提示词为历史记录,Kimi/GLM 已于 2026-08-07 签 agree(G1-G2 + K1-K4),
  三方 agree 齐,build 准入 allowed。请改用上方实现提示词。
```
