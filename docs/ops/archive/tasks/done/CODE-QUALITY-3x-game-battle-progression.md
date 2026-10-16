# CODE-QUALITY-3x - game battle progression / hidden experience 逐文件治理

Status: done
Phase: phase1 game
Capability: ops / code-quality / phase1-mechanics
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: e2e-deferred（结算视觉集中 E2E；本卡只验升级/隐藏经验/法术学习合同）
Contributor: Codex
Branch: codex/code-quality-governance
Last reviewed: 2026-10-16
Governance Owner: Codex（文档治理；非作者独立复核后根接收）
Template: task-card-v1 / 1.0.0

## 目标

保存10-05 phase1 progression/hidden经验逐文件审计，原未改实现、未发现直接缺陷；主升级、隐藏池、法术学习与快照按原primary/caller分域，不写成一次生产修复。

## 范围

原306行battle-progression、139行专属GLM测试与340行levelup测试，system progression/settlement仅相邻caller/oracle；不关闭battle-system全文、settlement/finalization、其它actions、UI或runner。

## 前提与证据

原活人主经验gate、主升级/隐藏经验池顺序与RNG消费、主升级999 cap与隐藏无该cap、回满时点及法术槽去重是独立合同。最强替代解释是装备有效值/隐藏池/旧存档差异而非bug；本轮未重读这些生产/tests或C源码，保留原审查范围而不新认证数值。

## 验收

原4 test files/205相邻通过与全仓/ratchet/protected fast/Biome零诊断保留；只新增关闭1product+2专属test=3，system/settlement相邻不算本卡新增全文。原2966/226/5/2735与Q3x后229/5/2732按当时时点列，不拿本包源22ee所留3290对账差额或共享汇总冲突在本卡擅改。

## 状态与交接

原done与Codex身份、10-05接续Q3w和无实现改动保持。旧prompt的活动tasks路径只在完整原文中保留为历史producer引用，本页仍以稳定归档路径公开；新反例另开不重叠卡，不重新执行旧全门/coverage。 2026-10-16文档迁移经非作者history_cards_c_tail复核、根Codex接收；不增加产品或动态验收。

以下同名标题保留原GFM入口，仅导航到本次具体归纳或完整历史原文。旧prompt、命令、分支和签字均按原日期读取，不恢复执行授权。

### 目标与范围

原时点内容见[原始结论](#原始结论)；不得从导航标题推定当前准入或实跑。

### 前提真值门

原时点内容见[前提与证据](#前提与证据)；不得从导航标题推定当前准入或实跑。

### 一句话行为 / 工程前提

原时点内容见[前提与证据](#前提与证据)；不得从导航标题推定当前准入或实跑。

### 替代解释与可证伪观察

原时点内容见[原始结论](#原始结论)；不得从导航标题推定当前准入或实跑。

### 逐段证据与结论（2026-10-05 Codex）

原时点内容见[原始结论](#原始结论)；不得从导航标题推定当前准入或实跑。

### 上下文锚点

原时点内容见[前提与证据](#前提与证据)；不得从导航标题推定当前准入或实跑。

### 验收条件

原时点内容见[验收](#验收)；不得从导航标题推定当前准入或实跑。

### 当前模式推进记录

原时点内容见[原始结论](#原始结论)；不得从导航标题推定当前准入或实跑。

### 进入 done 前：独立验收

原时点内容见[原始结论](#原始结论)；不得从导航标题推定当前准入或实跑。

### 收口证据

原时点内容见[原始结论](#原始结论)；不得从导航标题推定当前准入或实跑。

### 交接日志

原时点内容见[原始结论](#原始结论)；不得从导航标题推定当前准入或实跑。

### 下一位 Agent 提示词

原时点内容见[原始结论](#原始结论)；不得从导航标题推定当前准入或实跑。

## 历史范围

2026-10-05 phase1 game，原主实现306行及专属测试139/340行是原审查者全文声明。19285 tests/726统计源、205相邻与3文件关闭属于不同轴；本次只全文读原卡，不把其全读声明继承给作者。

## 当时证据

原卡40–53/77–89保留battle.c/global.c、settlement caller、205与完整门/比率；总纲198–232和ledger124–134窄段直接说明3记录及机器门不替语义。旧测试/raw/coverage产物当前可用性未验，未执行任何producer。

## 当前有效性

historical。原活人经验、隐藏无cap与回满语义不能按直觉改动；相邻测试不是专属文件关闭。总纲2966/3058多时点及本包基点的inventory差额归根共享G处理，H保原数字与未知，不发当前全仓质量信用。

## 继任文档

[Q3w](CODE-QUALITY-3w-game-battle-settlement-finalization.md)提供相邻结算历史，[Q6a](CODE-QUALITY-6a-ledger-integrity.md)限定记录门；现行入口是[质量总纲](../../../audits/code-quality-governance.md)/[ledger](../../../audits/code-quality-file-ledger.md)，新机制争议须按一手证据另卡。

## 原始结论

保存10-05 phase1 progression/hidden经验逐文件审计，原未改实现、未发现直接缺陷；主升级、隐藏池、法术学习与快照按原primary/caller分域，不写成一次生产修复。

当轮验收范围：原4 test files/205相邻通过与全仓/ratchet/protected fast/Biome零诊断保留；只新增关闭1product+2专属test=3，system/settlement相邻不算本卡新增全文。原2966/226/5/2735与Q3x后229/5/2732按当时时点列，不拿本包源22ee所留3290对账差额或共享汇总冲突在本卡擅改。

完整原卡来自Git blob `d018f68bea267a0351d771dab427cda3dedc03a0`，source revision `22eead43a6c825e1345feb92441e09d340d22c18`；预审 `83750d8425709257a609c1b9f62b8c6686d53987` 对应blob完全相同。以下非空行仅增加 `> `、空行仅增加 `>`，原UTF-8字节可严格逆回读。所有历史产品决定、日期、失败、非零诊断、数字、用户裁决与prompt完整保留；引用不是今天产品执行、测试质量或独立签收。

<!-- original-source-quote:start -->

> # CODE-QUALITY-3x - game battle progression / hidden experience 逐文件治理
>
> Status: done
> Phase: phase1 game
> Capability: ops / code-quality / phase1-mechanics
> Coding Owner: Codex
> Generation Owner: N/A
> Reviewer: Codex（独立验收）
> Visual Verification Owner: N/A
> Visual Verification Timing: e2e-deferred（结算视觉集中 E2E；本卡只验升级/隐藏经验/法术学习合同）
> Contributor: Codex
> Branch: codex/code-quality-governance
>
> ## 目标与范围
>
> 逐文件审计 `packages/game/src/core/battle/battle-progression.ts`（306 行）的主升级、隐藏经验分配、属性 cap、法术学习和结算快照；以 SDLPal `battle.c:991-1373`、`global.c:2347-2454`、真实 settlement caller、battle-progression/battle-levelup tests 核真值，只有直接反例才修复。
>
> - 范围内：`battle-progression.ts` 全文件、`battle-progression.glm-next-wave.test.ts` 全文件、`battle-levelup.test.ts` 和 `battle-system.test.ts` progression 相关段、settlement caller。
> - 范围外：`battle-settlement.ts`/`battle-finalization.ts`（Q3w 已关闭）、battle-system 全文件、公式/magic/status/actions、save/schema/migration、生成物、E2E/UI/coverage runner。
> - 明确不做：不改变升级数值、隐藏经验顺序、法术槽 schema 或结算 UI 形态；证据冲突时停线交用户裁决。
>
> ## 前提真值门
>
> ### 一句话行为 / 工程前提
>
> 战斗胜利升级必须只对战后存活队员结算主经验，严格保持主升级与隐藏经验的池顺序、随机消费、属性 cap/不 cap差异、HP/MP 回满时机和法术学习去重；结果快照只能反映 runtime 真源与装备有效值。
>
> | 维度 | 当前真值 | 直接证据 |
> |---|---|---|
> | 原版 / primary source | `PAL_BattleWon` 主/隐藏经验、等级成长、法术学习、半血前升级顺序 | `reference/sdlpal/battle.c:991-1373`、`global.c:2347-2454` |
> | 第一阶段 | `battleWonLevelUp`/`applyHiddenExpGrowth` 写 `PlayerRolesRuntime`，settlement 读取 snapshot；battle-system/settlement caller 只负责 phase/屏序 | `battle-progression.ts:1-306`、`battle-settlement.ts:109-205`、`battle-system.ts:3137-3138`；progression/levelup/system tests 已读取 |
> | 当前二阶段 | N/A（仅 packages/game phase1） | `CLAUDE.md` 阶段规则 |
> | 本任务目标 | 306 行实现和直接 tests 按池/升级/法术/快照逐段核验，未知保留 review/blocked | 本卡、file ledger、定向/相邻 tests 与全仓门禁 |
>
> ### 替代解释与可证伪观察
>
> - 最强替代解释：某些看似数值差异来自装备有效值/旧存档/隐藏经验池，而非 progression bug；`battle-settlement` 的半血恢复不应在本卡重复实现。
> - 推翻前提的观察：死亡角色获经验、隐藏经验顺序/RNG 位移、主升级 cap 与隐藏池 cap 混淆、无主升级错误回满、法术重复/越界写槽、snapshot 与 runtime 不一致。
>
> ## 逐段证据与结论（2026-10-05 Codex）
>
> 已读取实现文件 306 行、settlement caller、battle.c/global.c primary source、`battle-progression.glm-next-wave.test.ts` 139 行、`battle-levelup.test.ts` 340 行及 `battle-system.test.ts` progression 相关段；未改实现。
>
> | 实现段 | family / owner | primary source 与 caller | oracle / 结论 |
> |---|---|---|---|
> | `battle-progression.ts:1-88` | hidden-pool schema/顺序与 result DTO | `battle.c:1226-1284`；settlement `:150-164` | GLM/系统 tests；Health→Magic→Attack→MagicPower→Defense→Dexterity→Flee 顺序、label word 和 result DTO 对齐 |
> | `:89-141` | `applyHiddenExpGrowth` 总量/整数截断/level 99/RandomLong/无 STAT_LIMIT | `battle.c:1238-1284` | battle-system 基础 + GLM 边界 tests；多池比例、wLevel>99 clamp、99 级继续扣阈值、属性突破999、RNG 顺序均闭合，无反例 |
> | `:142-244` | `battleWonLevelUp` 活人 gate、primary exp、连升、主升级 stat cap/HP-MP 回满、snapshot | `battle.c:1088-1120,1153-1212`；`global.c:2347-2408`；settlement caller | `battle-levelup.test.ts` 全文 + system relevant tests；死亡跳过、阈值/余数/连升/满级扣 exp、STAT_LIMIT 999、runtime→battle projection 与有效装备 stat 均闭合 |
> | `:245-306` | hidden-after-main timing、主升级后回满、level-up magic scan/dedupe/slot | `battle.c:1224-1328`；`global.c:2084` | levelup/GLM/system tests；无主升级隐藏 maxHP 不回满、主升级含隐藏抬升回满、level gate、去重、槽满/0 magic 边界均闭合 |
>
> 定向/相邻实测：4 个 test files、205 tests 全绿（progression GLM、levelup、battle-system、settlement GLM）；progression/levelup 专属文件全文核验，system/settlement 作相邻 caller/oracle，不以数量或 coverage 单独验收。
>
> 本批只读核验未发现直接缺陷；没有改实现、数值、schema/save、生成物或 UI。
>
> ## 上下文锚点
>
> - 已拍板决策 / 铁律：`AGENTS.md` 前提真值门、第一阶段数值忠实、runtime raw base 与装备有效值分离、硬零诊断、测试少而精。
> - 先读：`CLAUDE.md`、`docs/phase1/game-mechanics.md`、`docs/phase1/engineering-notes.md`、本卡、progression/levelup tests、settlement caller、`battle.c/global.c` 对应段。
> - 不得重新引入：把装备加成写回 raw base、隐藏经验套主升级 STAT_LIMIT、改变池顺序/RNG 消费、用测试数量/coverage 替代数值 oracle、重复实现 settlement cleanup。
>
> ## 验收条件
>
> - 功能：battle-progression.ts 全 306 行按主升级/隐藏池/法术/快照 family 登记 owner/caller/primary source/risk/conclusion。
> - 测试：直接 tests 全文核验、定向/相邻 progression/settlement tests、game typecheck；若改代码再跑完整 check、official ratchet、protected fast、Biome 零诊断。
> - 文档：更新 file ledger/治理正文/卡/index；每个闭合批次 commit+push+archive。
>
> ## 当前模式推进记录
>
> - 前提核验：`premise verified`；范围/设计：`design agree`；build：`build allowed`（只读审计，无实现变更）。
>
> ### 进入 done 前：独立验收
>
> - 贡献者交付与自验：`accept`（306 行实现与 progression/levelup 专属测试全文核验、205 定向/相邻 tests）。
> - Codex 独立复核：`accept`（本批文档、完整 check、ratchet、protected fast、zero diagnostics 已完成）。
> - done 准入结论：`accept`。
>
> ## 收口证据
>
> - 定向/相邻：4 个 test files、205 tests 全绿；progression/levelup 专属文件全文核验，system/settlement 作相邻 caller/oracle。
> - 全仓 `pnpm check`：docs 914 Markdown / 4708 links / 313 tasks；content 149/1490；shared 16/131；game 298/3403；pal-extract 69/421；reforge 325/8682；editor 606/4845；migrate 95/723；Biome 3200 files，0 errors / 0 warnings / 0 infos。
> - `pnpm coverage:ratchet` 与 `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`：726 files / 19,285 tests；statements 88.89%、branches 82.67%、functions 88.59%、lines 90.80%；baseline unchanged，0 improvements，未下降。
> - `node scripts/quality/code-quality-ledger.mjs`：2966 files / 226 closed / 5 review / 2735 pending；semantic review still required。
> - 文档/静态：`node scripts/docs/check.mjs --json` 0 issues，`git diff --check` 通过；未修改实现、数值、schema/save、生成物或 UI。
> - 结论：`battle-progression.ts` 与 2 个专属测试文件逐文件核验，未发现直接缺陷；system/settlement 测试只作相邻 oracle，不计入本卡关闭。
>
> ## 交接日志
>
> - 2026-10-05 Codex：Q3w 已归档；建立 progression 窄卡，先全文核验 306 行实现、专属 GLM/levelup tests、battle-system progression 段与 battle.c/global.c primary source。
> - 2026-10-05 Codex：完成全文核验与 205 定向/相邻测试，未发现直接缺陷；全仓门、账本 integrity gate、ratchet、protected fast 和零诊断通过，卡转 done 后归档。
>
> ## 下一位 Agent 提示词
>
> ```text
> 接手任务：CODE-QUALITY-3x game battle progression / hidden experience 逐文件治理
> 任务卡：docs/ops/tasks/CODE-QUALITY-3x-game-battle-progression.md
> 当前状态：done；本卡已由 Codex 独立验收并归档。
> 先读：AGENTS.md、CLAUDE.md、docs/phase1/game-mechanics.md、docs/phase1/engineering-notes.md、本卡、battle-progression.ts 全文、battle-progression.glm-next-wave.test.ts、battle-levelup.test.ts、battle-system.test.ts progression 段、battle-settlement caller、battle.c/global.c。
> 输出：无下一位 Agent 提示词；若发现新反例，另开不重叠返工卡，不回写已核验行为。
> ```
