# R28 phase1 plans readonly review

**verdict:** `accept-readonly-proposal` · **scope:** 22/22 · **issues:** 0

独立全文读取 `docs/phase1/plans/` 指定 22 篇 Markdown（932841 bytes，9998 physical line slots），严格 UTF-8 解码并记录 SHA-256/Git blob SHA-1。全部历史边界保留；未迁移正文、未写账本，runtime/E2E/视觉/coverage 均为 0。

- 固定治理 source revision: `45d890e4ce3862aeac9c54eef2d7d18a32032cee`。
- Registry/review/catalog：22/22 路径存在，source/after SHA 全匹配；旧 review 每篇恰 1 条，duplicate=0。
- Routing：22 篇均未进入 `migratedDocuments`，保持 archive-only。
- 分类建议：13 篇 `plan-status-v1 + archive-record-v1 overlay`，2 篇 `design-spec-v1 + archive-record-v1 overlay`，6 篇 `audit-report-v1 + archive-record-v1 overlay`，README 1 篇 `governance-index-v1 + archive-record-v1 overlay`。

## Per-document evidence

| # | File | Type / date | Bytes | Source SHA | After SHA | Registry/review/catalog | Routing | Proposed classification |
|---:|---|---|---:|---|---|---|---|---|
| 1 | `docs/phase1/plans/2026-05-31-d-batch2-enemy-ai.md` | plan-status / 2026-05-31 | 11323 | `2334c00020011843e2cb4cd7979653b07cfd5918998329a319faa9969624e55d` | `2334c00020011843e2cb4cd7979653b07cfd5918998329a319faa9969624e55d` | PASS | archive-only | archive-plan-status |
| 2 | `docs/phase1/plans/2026-05-31-d-batch6-numeric-equip.md` | plan-status / 2026-05-31 | 11804 | `c8ef20f2dc9ab2a5135ada4ad2b091d76ac16bbac6e9a4bc45f16efef1203b89` | `c8ef20f2dc9ab2a5135ada4ad2b091d76ac16bbac6e9a4bc45f16efef1203b89` | PASS | archive-only | archive-plan-status |
| 3 | `docs/phase1/plans/2026-05-31-d-series-completion-roadmap.md` | plan-status / 2026-05-31 | 13844 | `0fe9f548f6043c8c6e81118074a25b1dc4b289d9e3425473befc61d529ad7f4f` | `0fe9f548f6043c8c6e81118074a25b1dc4b289d9e3425473befc61d529ad7f4f` | PASS | archive-only | archive-plan-status |
| 4 | `docs/phase1/plans/2026-05-31-poison-and-portrait-color.md` | plan-status / 2026-05-31 | 5959 | `d6cdfbd33a3ccaede59411873aff3e9902ac08c2297e8e746a299fb8f317c40b` | `d6cdfbd33a3ccaede59411873aff3e9902ac08c2297e8e746a299fb8f317c40b` | PASS | archive-only | archive-plan-status |
| 5 | `docs/phase1/plans/2026-06-01-d-series-test-cases.md` | plan-status / 2026-06-01 | 194551 | `e5b17e2d48f418636f28f96b4246ad7e4567f1f9bfe63270f610bd2e5bbc801b` | `e5b17e2d48f418636f28f96b4246ad7e4567f1f9bfe63270f610bd2e5bbc801b` | PASS | archive-only | archive-plan-status |
| 6 | `docs/phase1/plans/2026-06-01-feature-status-audit.md` | audit-report / 2026-06-01 | 6245 | `631626a9f460ee18aa43369cb69aaf7540e737ab3f2b6444921e36322885773d` | `631626a9f460ee18aa43369cb69aaf7540e737ab3f2b6444921e36322885773d` | PASS | archive-only | audit-report |
| 7 | `docs/phase1/plans/2026-06-01-gameoveractive-refactor.md` | plan-status / 2026-06-01 | 17970 | `a49e069c3ac85b4e0e5ee1ed8f31958d1ca9be2f96229eda1061017d09230160` | `a49e069c3ac85b4e0e5ee1ed8f31958d1ca9be2f96229eda1061017d09230160` | PASS | archive-only | archive-plan-status |
| 8 | `docs/phase1/plans/2026-06-01-remaining-work-plan.md` | plan-status / 2026-06-01 | 11334 | `8a82755a4ab62a922bf158e473b05220a12c02d2af056b7e0827e11f8aafedfe` | `8a82755a4ab62a922bf158e473b05220a12c02d2af056b7e0827e11f8aafedfe` | PASS | archive-only | archive-plan-status |
| 9 | `docs/phase1/plans/2026-06-01-sdlpal-feature-surface-audit.md` | audit-report / 2026-06-01 | 47458 | `7ffffc5e6cde1f1d0d437fb58185dfa558e42a3466f27596739e25698ea22592` | `7ffffc5e6cde1f1d0d437fb58185dfa558e42a3466f27596739e25698ea22592` | PASS | archive-only | audit-report |
| 10 | `docs/phase1/plans/2026-06-02-item-audit.md` | audit-report / 2026-06-02 | 20916 | `f5370361515195631fc1274d76d45bf74a163be37c0c806a69e7507dbbfdf568` | `f5370361515195631fc1274d76d45bf74a163be37c0c806a69e7507dbbfdf568` | PASS | archive-only | audit-report |
| 11 | `docs/phase1/plans/2026-06-06-battle-system-current-audit.md` | audit-report / 2026-06-06 | 3873 | `ebe68652d716825ef012051b9ce9357f9fceec6ebecde2b9535e53b93bb83165` | `ebe68652d716825ef012051b9ce9357f9fceec6ebecde2b9535e53b93bb83165` | PASS | archive-only | audit-report |
| 12 | `docs/phase1/plans/2026-06-07-sdlpal-diff-audit.md` | audit-report / 2026-06-07 | 320221 | `eb548e4b6202fe666816fc4ee6cb074ab8909fb064fb55198d4badeaefd8f414` | `eb548e4b6202fe666816fc4ee6cb074ab8909fb064fb55198d4badeaefd8f414` | PASS | archive-only | audit-report |
| 13 | `docs/phase1/plans/2026-06-10-sdlpal-deep-audit.md` | audit-report / 2026-06-10 | 38486 | `4d947c9c9b3c14dabc585beb1f32db26dced4ff07cba6970d1e4641be2411f1b` | `4d947c9c9b3c14dabc585beb1f32db26dced4ff07cba6970d1e4641be2411f1b` | PASS | archive-only | audit-report |
| 14 | `docs/phase1/plans/2026-06-13-canvas-resolution-setting.md` | plan-status / 2026-06-13 | 17523 | `a296220f590610c7906cb363fde2ad92c1ce6235378610be360a7f9cc50482cd` | `a296220f590610c7906cb363fde2ad92c1ce6235378610be360a7f9cc50482cd` | PASS | archive-only | archive-plan-status |
| 15 | `docs/phase1/plans/2026-06-13-offline-precache-sw.md` | plan-status / 2026-06-13 | 26345 | `abe15bfdfb745ca63533cd3c9b45bf9bdf57deb5cb7dd26c7ab5cf5b1c54d6ae` | `abe15bfdfb745ca63533cd3c9b45bf9bdf57deb5cb7dd26c7ab5cf5b1c54d6ae` | PASS | archive-only | archive-plan-status |
| 16 | `docs/phase1/plans/2026-06-13-prod-tools-panel.md` | plan-status / 2026-06-13 | 44259 | `48be7fcb7d43db926b8f731cddf3196f19e42ea4b68740f7031612c2f7b4657e` | `48be7fcb7d43db926b8f731cddf3196f19e42ea4b68740f7031612c2f7b4657e` | PASS | archive-only | archive-plan-status |
| 17 | `docs/phase1/plans/2026-06-14-unified-precache-progress-gate-impl.md` | plan-status / 2026-06-14 | 36177 | `bc41ff609083cd6ddca46fbb29a0be8ef6452959adc6e2301036b0e25cd4b294` | `bc41ff609083cd6ddca46fbb29a0be8ef6452959adc6e2301036b0e25cd4b294` | PASS | archive-only | archive-plan-status |
| 18 | `docs/phase1/plans/2026-06-14-unified-precache-progress-gate.md` | design-spec / 2026-06-14 | 6771 | `0b4d47ebd7d6c349f106f2843667c4a23e9f6fe8357665314eddbd84d5975e99` | `0b4d47ebd7d6c349f106f2843667c4a23e9f6fe8357665314eddbd84d5975e99` | PASS | archive-only | archive-design-spec |
| 19 | `docs/phase1/plans/2026-06-18-speedrun-timer-design.md` | design-spec / 2026-06-18 | 17640 | `6fd7bb18d3887867288e0e37b7d2fa6349e28e0b90bc8cabc52b9cd2e4f00d28` | `6fd7bb18d3887867288e0e37b7d2fa6349e28e0b90bc8cabc52b9cd2e4f00d28` | PASS | archive-only | archive-design-spec |
| 20 | `docs/phase1/plans/2026-06-18-speedrun-timer.md` | plan-status / 2026-06-18 | 63459 | `49c2c20b5a2a5723b27e5bb2b5274d8e908c35287e581593f69c161d6d1328d8` | `49c2c20b5a2a5723b27e5bb2b5274d8e908c35287e581593f69c161d6d1328d8` | PASS | archive-only | archive-plan-status |
| 21 | `docs/phase1/plans/2026-06-22-tileset-atlas-packing.md` | plan-status / 2026-06-22 | 10077 | `ade58414e9128ba82dc65beaba7497d70bf4875dbbea83e6503f0953aef19d91` | `ade58414e9128ba82dc65beaba7497d70bf4875dbbea83e6503f0953aef19d91` | PASS | archive-only | archive-plan-status |
| 22 | `docs/phase1/plans/README.md` | plan-status / README.md | 6606 | `6647b1a1eb72b3eef34c56505835b9e04f273d381cf169a802d249d4df191c82` | `6647b1a1eb72b3eef34c56505835b9e04f273d381cf169a802d249d4df191c82` | PASS | archive-only | governance-index |

## Semantic outline, conflicts and successors

### `docs/phase1/plans/2026-05-31-d-batch2-enemy-ai.md`
- Title/status/date: B2 — 敌方 AI 真值 + 脚本驱动(D9 / D10残 / D24残 / D27残)详细 plan / historical (catalog `draft`) / 2026-05-31; headings: 17.
- Outline: B2 enemy AI truth/script-driven TDD, target selection, opcodes, state paths and completion.
- Conflicts/unresolved retained: 正文信号 15:| D10 0x67 | "未真驱动" | **已真驱动**;剩 silence 漏判(真 bug)/0xFFFF/群体魔法 | 正文信号 16:| D10 0x90 | "battle 未实现自禁" | 写 gs.rgObject 已对;**sdlpal 战斗内从不同步 rgObject→敌;真 show-once = 脚本返回值回写**(c7),0x90 与自禁无关 → 0x90 **不加 battle sync** | 正文信号 17:| D10 0x79 | "battle 未实现" | **已 fallthrough 生效** → 仅清 stale 注释 |
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current battle AI/script code, tests, feature/opcode status and source review.
- Proposed template: `plan-status-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/2026-05-31-d-batch6-numeric-equip.md`
- Title/status/date: B6 — 数值精度 + 装备(D3残 / D14残)详细 plan / historical (catalog `draft`) / 2026-05-31; headings: 16.
- Outline: B6 numeric precision/equipment callpaths, formula gaps, TDD and completion.
- Conflicts/unresolved retained: 历史材料当前有效性需要继任文档或当前代码复核
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current canonical phase1 status tables/code/tests and a fresh primary-source review; historical claims require revalidation.
- Proposed template: `plan-status-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/2026-05-31-d-series-completion-roadmap.md`
- Title/status/date: D 系列(战斗系统)完工 roadmap / historical (catalog `draft`) / 2026-05-31; headings: 11.
- Outline: D-series B1-B7 roadmap, discipline, logic-first order and real-device cases.
- Conflicts/unresolved retained: 正文信号 10:> 本 roadmap 完成后这些表的 D 段全部应从 ⚠️/⬜ 收口到 ✅(claimed,待 user 拍 verified)。 正文信号 48:- D8: `confused`(混乱)攻友军 / `paralyzed`(麻痹)跳回合 行为**未在 selectAction 真接**;`boolean` 类状态(haste/protect/dualAttack)**不衰减**。 正文信号 49:- D21: `finalizeBattle` **未** clear sleep/confused/paralyzed(整条 ⬜)。 正文信号 51:**sdlpal 入口(待详细 plan 完整 read)**: 正文信号 60:- `core/battle/turn-queue.ts`(paralyzed 跳过排程?待 read 确认 sdlpal 真值) 正文信号 73:- D9: 敌 AI 选 target 仍**简版 random + magicRate**;真值 target 偏好(`fight.c:4520 PAL_BattleSelectEnemyTargetIndex`)+ **Bug-1 死循环 safety**(fight.c:4500-4517 全敌死无退出 while)未做。
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current D-series status and user-verified behavior evidence.
- Proposed template: `plan-status-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/2026-05-31-poison-and-portrait-color.md`
- Title/status/date: 中毒机制 + 战斗头像颜色 实现规划(2026-05-31) / historical (catalog `draft`) / 2026-05-31; headings: 12.
- Outline: Poison application/resistance/damage and battle portrait poison/death colors, TDD batches.
- Conflicts/unresolved retained: 正文信号 33:- 玩家版同构(用 player resistance — 待查 PAL_AddPoisonForPlayer 真值)。 正文信号 39:| 处 | 现状 | 待做 |
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current canonical phase1 status tables/code/tests and a fresh primary-source review; historical claims require revalidation.
- Proposed template: `plan-status-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/2026-06-01-d-series-test-cases.md`
- Title/status/date: D 系列真机手测用例表(2026-06-01) / historical (catalog `draft`) / 2026-06-01; headings: 115.
- Outline: D1-D21 real-device cases with fixtures, assertions, RNG boundaries and prerequisites.
- Conflicts/unresolved retained: 正文信号 8:## 真机设施纠正(critic 揪出,用例里凡冲突以此段为准) 正文信号 31:- **D14** 装备:console 调不到 runEquipScript 等(未挂 window)→ partially,须走装备菜单 UI 正文信号 42:无 stub/简版子部分需排除 —— startBattle 本体(找队/展开槽位/建态/切 mode/缓存资源)是完整实现。一处简化注明:enemyTeam 槽位"直接当 enemies.json id 索引"(battle-system.ts:18-22,T23 baseline 待校),若选某队后敌人数/种类与原版对不上属此映射、非启动流程 bug,D 正文信号 53:- **预期**: startBattle 遍历 team.enemies 槽位(battle-system.ts:269-284):跳 0/0xFFFF,其余每槽 input.enemies.find(en=>en.id===slot) 解引用压入 enemyList;找不到的槽位 console.warn '[battle] startBattle: e 正文信号 73:**已知边界/排除**: 无未做子部分:单体 jitter(RandomLong(1,2))、暴击 ×3(1/6 或 bravery)、李逍遥额外 ×2(roleId===0 && 1/12)、末尾 RandomFloat(1,1.125)、<=0→1 钳位、群攻命中序 [2,1,0,4,3] + division 逐敌翻倍、DualAttack 双击,at 正文信号 74:注意两点边界,非「未做」但用户测时要知道:(1) 暴击/李逍遥/双击都是 RNG 概率事件(1/6、1/12、装备授),真机单次攻击不一定触发 —— 验证靠多次重复看伤害分布 / 区间,而非一击定值,故用例验证点用「范围 + 重复观察」。(2) 群攻和 DualAttack 需要装备授(attackAll 武器 / 0x2D DualAttack 状态),d
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current harness plus user-run evidence; manual cases are not runtime proof.
- Proposed template: `plan-status-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/2026-06-01-feature-status-audit.md`
- Title/status/date: feature-status.md 重审报告(2026-06-01) / historical (catalog `draft`) / 2026-06-01; headings: 9.
- Outline: feature-status three-way audit of TS, sdlpal and tests; correct overclaims and TODO statuses.
- Conflicts/unresolved retained: 正文信号 12:| **done-1to1** | 57 | 核对 ts 与 sdlpal 真值一致忠实(待 user 真机核) | 正文信号 13:| **simplified** | 22 | 能跑但近似/简版/缺真值分支(表几乎全已自标 ⚠️) | 正文信号 15:| **not-done** | 8 | stub/缺失(全部 = 音频 3 + 外设 3 + 炼丹蛊 2,**全是明确 todo,无意外**) | 正文信号 25:### D12 战斗逃跑 —— 状态列 `✅ claimed` 应降 `⚠️ partial` 正文信号 28:- **矛盾点**:表 `✅ claimed` 按定义 = "Claude 自认**1:1**",且备注还写"逃跑公式对齐 fight.c" —— 但公式输入恰恰没对齐。这是自知的简化,按表自身规则该归 ⚠️ partial。 正文信号 29:- **修**:状态 `✅ claimed` → `⚠️ partial`;备注补"flee str 用 raw fleeRate 非装备感知 getPlayerFleeRate(M3 简化,装备逃跑加成被忽略)"。
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current feature-status and canonical code/source checks.
- Proposed template: `audit-report-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/2026-06-01-gameoveractive-refactor.md`
- Title/status/date: gameOverActive 重构设计(2026-06-01,user 报石长老必败战误红屏 + 架构返工) / historical (catalog `draft`) / 2026-06-01; headings: 15.
- Outline: deathHoldActive/gameOverActive split, consumers, tick timing and focused tests.
- Conflicts/unresolved retained: 正文信号 11:>   **已知差异(非 bug,user 未报)**:team21 林月如 lost→对白→`goto L_41075`,judge 遇 goto 停 → 不预置 deathHold, 正文信号 50:> 为何不只挪判据到 0x4F、不加新标记?Q6 已证:T0 末 onPresent 时 0x4F 尚未跑(在 ip 41076,前面 41075 是 0x43 `break` 续跑),`gameOverActive=false` → 走 `present.ts:162 fb.clear()` 露大世界 1 帧。必须有 T0 同步点亮的过渡标记补这一帧。`d 正文信号 99:return   // 纯 hold:此刻无死亡 dialog,palette 也还没 ramp(0x4F 未跑) 正文信号 178:- 红测:① lost+lostIp 指死亡 run(含 0x4F)→ `gs.deathHoldActive===true` 且 `gs.gameOverActive` **未置**;② lost+lostIp 指 team21-like(0x4F 前有 goto)→ deathHold/gameOver 都 false;③ lost+lostIp und
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current canonical phase1 status tables/code/tests and a fresh primary-source review; historical claims require revalidation.
- Proposed template: `plan-status-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/2026-06-01-remaining-work-plan.md`
- Title/status/date: type-pal 剩余工作执行计划(2026-06-01) / historical (catalog `draft`) / 2026-06-01; headings: 12.
- Outline: Corrected remaining-work W1-W5/L plan, false gaps, risks and order.
- Conflicts/unresolved retained: 正文信号 4:> 31 项排查 → **20 真待办**(W1-W5)+ **11 其实已做**(订正 roadmap)+ **2 死代码该删** + **2 sdlpal 真值冲突不该做**。 正文信号 10:## ⚠️ 先订正认知(这些不是缺口) 正文信号 20:| D20-2 中毒精灵本体紫色 | **sdlpal 真值冲突,不该做**:全源 grep 证实中毒从不设精灵 iColorShift 紫色(头像染色已做) | 正文信号 50:> - 2026-06-01 的“trance magic id 47 完全未被引用”结论已废弃。真实路径是 object-magic 295「梦蛇」 正文信号 70:| **A4 OpeningMenu 坐标公式** | S | draw-opening-menu.ts:39 硬编码 x=125;真值 `125-(w>4?(w-4)*8:0)`,w=PAL_WordWidth | port wordWidth helper(ui.c:836)。⚠️ '新的故事'4 字 → w=4 → x=125 **可能已对**,gap 正文信号 71:| **F1 默认新游戏字段核对** | M | (标题"非 SAVEDGAME 反序列化"是误解:sdlpal 新游戏读 MKF chunk + 字段初始化,非读存档)真活 = 逐字段核 ts hydrate 齐 global.c:434-467 默认值 | bootstrap.ts:1150 startNewGameFromPrimary + game-
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current canonical phase1 status tables/code/tests and a fresh primary-source review; historical claims require revalidation.
- Proposed template: `plan-status-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/2026-06-01-sdlpal-feature-surface-audit.md`
- Title/status/date: SDLPal 功能面覆盖审计 / historical (catalog `draft`) / 2026-06-01; headings: 43.
- Outline: SDLPal feature-surface mapping to feature-status, gaps and priorities.
- Conflicts/unresolved retained: 正文信号 29:按可见玩法估算，当前版本已经覆盖了主线可玩所需的大部分骨架：地图、脚本、菜单、物品、法术、战斗流程、存档、RNG/FBP/MKF 资源、结局与大量视觉层都已经存在。但距离“SDLPal 行为级还原”仍有几个核心差距：运行时音频未接入、战斗若干数值公式不完全一致、隐藏属性经验系统缺失、部分战斗视觉与菜单细节仍是简化实现。 正文信号 36:| Opcode 框架与脚本执行 | 85-95% | opcode 面覆盖很高，但部分 opcode 是状态记录或 present/audio 待接 | 正文信号 40:| 运行时音频 | 0-15% | 资源已抽取，播放器和脚本驱动基本未接 | 正文信号 41:| 输入与平台层 | 50-70% | 键盘主路径完成，鼠标、手柄、触摸、SDL 视频配置多为 Web 替代或待办 | 正文信号 53:| `play.c` | 地图更新、使用/装备物品、搜索、按键等待 | 主要路径已实现；搜索/物品特殊链路需要更多端到端验证 | 正文信号 59:| `input.c` / `video.c` / `audio.c` / `sound.c` | 输入、视频、音频、MIDI/SFX | 键盘与画面主路径可用；音频、鼠标/手柄/触摸、平台配置待补或 N/A |
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current feature/resource/opcode tables and implementation.
- Proposed template: `audit-report-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/2026-06-02-item-audit.md`
- Title/status/date: 物品功能实现完整性审计(type-pal vs sdlpal) / historical (catalog `draft`) / 2026-06-02; headings: 18.
- Outline: Item opcode gaps, per-item findings, data labels and severity fixes.
- Conflicts/unresolved retained: 正文信号 10:> - 0x34 紫金葫芦炼丹已弹 `item-box` dialog,并有等待/按键关闭单测。 正文信号 14:> - 0x47 PlaySound 已入 `gs.pendingSounds`;0x31 ChangeBattleSprite 已写 `BattlePlayer.spriteNumOverride`。 正文信号 28:- **战斗使用**:原列 4 处(0x29/0x2B/0x2C 单目标因 item.ts 不传 eventObjectId 失效、0x50 战斗淡屏未实现),当前这些已修或重判;0x73 战斗 raw fallback 可达性另行低优核验。 正文信号 31:- **音频/演出**:原列 0x47/0x31/0x73 多为 stub;当前 0x47 已走 pendingSounds、0x31 已接 sprite override、0x73 大世界 dither fade 已接。 正文信号 36:## 2. opcode-gap 表(未实现 / stub / 边界偏差) 正文信号 46:| **0x47** PlaySound | `AUDIO_PlaySound(op0)` 播音效 | script.c:1704-1709 | yes | yes | 所有带音效的物品脚本 | event-system.ts pushes `gs.pendingSounds`;battle-opcodes.ts fallback 同队列 | ✅ 不再是 c
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current item script/opcode code and focused tests.
- Proposed template: `audit-report-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/2026-06-06-battle-system-current-audit.md`
- Title/status/date: 2026-06-06 Battle System Current Audit / historical (catalog `draft`) / 2026-06-06; headings: 5.
- Outline: Current battle audit: false-positive exclusions, P0/P1/P2 findings.
- Conflicts/unresolved retained: 正文信号 8:- Protect 已参与敌方物理/法术伤害除因子,旧注释「未建模」已清理。 正文信号 28:- 已修: `tickBattle` 会在 `paletteFadeState` 未完成时同步阻塞后续行动队列,淡完收尾后再继续。 正文信号 33:- 已修:物品菜单按本回合 pendingActions 计算已预占数量,`count - inUse <= 0` 时灰掉且不可确认。 正文信号 34:- 已修:Menu 回退上一队员会删除其 pending action,下次建表自然释放预占。
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current battle code/tests and fresh audit.
- Proposed template: `audit-report-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/2026-06-07-sdlpal-diff-audit.md`
- Title/status/date: type-pal × sdlpal 差异审查报告 / historical (catalog `draft`) / 2026-06-07; headings: 81.
- Outline: First diff audit: statistics, M/L fixes, rejected false positives.
- Conflicts/unresolved retained: 正文信号 12:| ❌ 复核否决(误报) | 6 | 正文信号 13:| ❓ 待定 | 0 | 正文信号 25:- **未修**:无 —— **64 条 confirmed(2 high + 15 medium + 47 low)已 100% 修复**。 正文信号 28:下方速查索引与各 finding 标题前缀:**✅ 已修**、**⏸ 暂缓**、无前缀=未修。 正文信号 41:| M7 | ✅ 通过 | `fForce/fRepeat` 已变成整队粘滞标志,剩余待选队员自动提交,全员动作填完后清标志。 | 正文信号 54:> 审查日期:2026-06-07。范围:速查索引中已标 ✅ 的 47 条 Low 修改(全部),按实现消费链 + 回归测试锚点复核。结论:47 条已完整收口,未发现新的遗漏。
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current code plus new source-anchored diff audit.
- Proposed template: `audit-report-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/2026-06-10-sdlpal-deep-audit.md`
- Title/status/date: type-pal × sdlpal 第二轮深挖差异审查报告 / historical (catalog `draft`) / 2026-06-10; headings: 26.
- Outline: Second deep audit: lifecycle/order/side-effect/system handoff/frame findings.
- Conflicts/unresolved retained: 正文信号 14:| 🟡 low | 39(其中 8 条已对抗复核,31 条未复核) | 正文信号 18:> low 级中标 `[未复核]` 的条目未做对抗复核,修复前请先按行号核对 C 源。 正文信号 33:对象建 rgObject overlay 机制,latent 零收益 —— 待真实数据出现再做。 正文信号 37:- DL19(0x73 等键豁免):与"fade backup 须含对话像素"的视觉机制直接冲突,且全数据 0 相邻实例。 正文信号 39:flFadeTime(audio.c)—— **忠实不做** gain ramp;计算保留注释供未来 OGG/RIX 后端。 正文信号 42:2 个测试 fixture 缺陷(e2e flee 未同步 runtime fleeRate、casualty 阈值锁旧行为)。
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current code/tests and renewed lifecycle audit.
- Proposed template: `audit-report-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/2026-06-13-canvas-resolution-setting.md`
- Title/status/date: 游戏分辨率(canvas 显示尺寸)设置 Implementation Plan / historical (catalog `draft`) / 2026-06-13; headings: 10.
- Outline: Canvas display scale, integer sizing, persistence/window adaptation and decisions.
- Conflicts/unresolved retained: 正文信号 377:/* 显示尺寸由 display-scale.ts(initDisplayScale)按持久化档/适应窗口设;此处仅 JS 未就绪时的兜底 3×。 */ 正文信号 396:.catch((err: unknown) => { 正文信号 451:- **待你拍板的设计点**:① 改分辨率的入口用"左上角常驻 DOM 控件"(本plan)——也可改成键盘快捷键(Ctrl +/-、F 全屏)或塞进某个游戏内菜单;② 全屏用"最大整数倍(锐利,留黑边)"——也可做"分数铺满(填满但像素略不均)"。两点都易调,确认后再实现。
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current display-scale/canvas code and product decision.
- Proposed template: `plan-status-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/2026-06-13-offline-precache-sw.md`
- Title/status/date: 离线资源预缓存(Service Worker)Implementation Plan / historical (catalog `draft`) / 2026-06-13; headings: 15.
- Outline: Service worker manifest, resumable batch cache, fallback fetch and loader contract.
- Conflicts/unresolved retained: 正文信号 21:- **兜底**:SW 不可用 / 未注册 / 预缓存未覆盖到的资源 → 各 loader 的原 `fetch` 照常按需拉(**绝不比现状差**)。 正文信号 87:Expected: FAIL（`buildManifest` 未导出 / 模块不存在） 正文信号 319:> 注:`Date.now()` 在 SW 里可用(这是 SW 脚本,不是 workflow 脚本)。续传靠 `cache.match` 跳过——重载/中断后再触发会从未缓存项继续。 正文信号 558:.catch((err: unknown) => { 正文信号 663:- **占位扫描**:无 TBD/TODO;每个代码步给了完整代码。 正文信号 665:- **已知后续(非本plan)**:① 76k 小文件请求开销大,未来可把 world 图块打包成少量归档(改资源管线 + loader)大幅降请求数;② 移动端/计费网络可加"暂停预缓存"开关。
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current service worker/precache implementation and deployment evidence.
- Proposed template: `plan-status-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/2026-06-13-prod-tools-panel.md`
- Title/status/date: 生产增强工具面板(Production Tools Panel)Implementation Plan / historical (catalog `draft`) / 2026-06-13; headings: 18.
- Outline: Production tools panel visual contract, tabs, controls, volume and dependencies.
- Conflicts/unresolved retained: 正文信号 15:> 本节为最终口径,与下方 Task 冲突处**以本节为准**(原 Task 的功能骨架/TDD 步骤不变,仅样式 + tab 结构按此调整)。核心诉求:视觉从 dev-panel 风格升级为生产级,配色贴近 load 界面(index.html `#boot-loading` + precache-ui)。 正文信号 39:- **左竖 Tab**:宋体竖列;选中 = 金底暗字 + 左侧 2px 朱红条;未选柔金 hover 微亮 + 槽底。 正文信号 323:let obj: { format?: string; version?: number; gs?: unknown } 正文信号 760:masterGain.gain.value = pendingBgmVolume ?? 1 // 若 setBgmVolume 在 ready 前被调,用暂存值 正文信号 766:let pendingBgmVolume: number | undefined 正文信号 768:pendingBgmVolume = v
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current tools panel/design system and display-scale contract.
- Proposed template: `plan-status-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/2026-06-14-unified-precache-progress-gate-impl.md`
- Title/status/date: 统一预缓存进度 + 可玩门 + 进入解锁 Implementation Plan / historical (catalog `draft`) / 2026-06-14; headings: 15.
- Outline: Unified precache progress/playable gate implementation, SW bridge and deployment.
- Conflicts/unresolved retained: 正文信号 141:Expected: FAIL（`createUnifiedProgressUi` 未导出） 正文信号 339:Expected: FAIL（`onReady`/`onUnavailable`/`boostPrecache` 未实现) 正文信号 471:if (spawnMore) spawnMore() // 已在跑 → 立即补 worker;未跑 → 下次 precacheAll 直接全速 正文信号 618:const isProd = (import.meta as unknown as { env?: { PROD?: boolean } }).env?.PROD === true 正文信号 646:.catch((err: unknown) => { 正文信号 657:.catch((err: unknown) => {
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current precache/progress gate code and deployment evidence.
- Proposed template: `plan-status-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/2026-06-14-unified-precache-progress-gate.md`
- Title/status/date: 统一资源预缓存进度 + 可玩门 + 进入解锁 — Design Spec / historical (catalog `draft`) / 2026-06-14; headings: 13.
- Outline: Design of unified precache progress/playable gate and acceptance.
- Conflicts/unresolved retained: 正文信号 80:- 76k 小文件请求数大,未来可把 world 图块打包成少量归档降请求数(改资源管线 + loader)。
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current precache gate implementation.
- Proposed template: `plan-status-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/2026-06-18-speedrun-timer-design.md`
- Title/status/date: 速通计时器 设计方案（Speedrun Timer） / historical (catalog `draft`) / 2026-06-18; headings: 25.
- Outline: Speedrun wall-clock, checkpoint detectors, best persistence, overlay and tools tab.
- Conflicts/unresolved retained: 正文信号 46:- **打点**：每帧对「当前待触发节点」求值其 detector，命中即把主时钟快照写入该节点 `current`，并推进到下一节点（严格按序，不可乱序、不可回退）。 正文信号 176:1. **自动**：一局跑到「通关」且**本局总时间 < `best[通关]`**（或基准为空）→ 用本局逐点 `current` **整条覆盖** `perCheckpoint`。半途快但未通关的跑不更新。 正文信号 177:2. **手动**：设置里「用本次成绩设为最佳」→ 整条覆盖（即使未破纪录，允许手动锚定）。 正文信号 194:- 每行 4 列：**节点名 | 最佳 | 差值(±色) | 本次**。当前待触发节点高亮；未到达的点本次列留空。
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current timer code/product decision and behavior review.
- Proposed template: `plan-status-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/2026-06-18-speedrun-timer.md`
- Title/status/date: 速通计时器 Implementation Plan / historical (catalog `draft`) / 2026-06-18; headings: 16.
- Outline: Speedrun timer implementation, detectors, main loop, overlay and tests.
- Conflicts/unresolved retained: 正文信号 169:} as unknown as GameState 正文信号 190:const s = buildSnapshot(fakeGs({ battleState } as unknown as Partial<GameState>)) 正文信号 275:- Produces: `type DetectorMem = Record<string, unknown>`；`type Detector = (cur: ProgressSnapshot, prev: ProgressSnapshot | null, mem: DetectorMem) => boolean`；工厂 `enterScene/leaveS 正文信号 353:export type DetectorMem = Record<string, unknown> 正文信号 704:it('未破纪录 → 不动 bests', () => { 正文信号 882:// 香蕉树(反作弊/中场休息):开关开 + 本局未做过
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current timer code/tests and tools-panel integration.
- Proposed template: `plan-status-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/2026-06-22-tileset-atlas-packing.md`
- Title/status/date: 瓦片资源管线优化:每地图 RLE blob（取代 atlas 方案） / historical (catalog `draft`) / 2026-06-22; headings: 15.
- Outline: Per-map gzip/RLE blob replacing atlas, measurements, migration and risks.
- Conflicts/unresolved retained: 正文信号 8:> - **v1(atlas)—— 已否决**:每地图把 tile 拼成一张大 PNG。实测体积只砍 **13%**(见 §7),远低于预期。 正文信号 73:| atlas RGBA(v1,已否决) | 230 MB | 13.2% | 正文信号 74:| 原始 RLE(未压缩) | 133 MB | 49.9% | 正文信号 102:## 7. 被否决的方案(留痕) 正文信号 105:- **WebP/AVIF lossless**:需 Node 端编码器(sharp/cwebp,当前未装);且运行时仍走 `createImageBitmap`+canvas,解码开销一分不省;压缩比也不及 RLE+brotli。被支配。 正文信号 124:- [ ] 生产 SW 预缓存时间明显下降(数分钟 → 数十秒,实测)—— 待部署后验证。
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current resource pipeline/phase2 tileset decisions and measured evidence.
- Proposed template: `plan-status-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

### `docs/phase1/plans/README.md`
- Title/status/date: docs/plans/ — 开发过程历史档案(索引) / historical (catalog `draft`) / README.md; headings: 9.
- Outline: Historical plans index, legend, links and later-history entry points.
- Conflicts/unresolved retained: 正文信号 3:> ⚠️ **本目录是历史快照,不代表当前状态。** 正文信号 16:- 🔄 **可能含未完项** —— 原文列了 backlog / roadmap;**现状须对照状态表核实**,勿直接照搬当待办执行。 正文信号 17:- 🧪 **待实测** —— 列了交给 user 的真机验收用例,verified 与否以 user 核对为准。 正文信号 56:| [remaining-work-plan](../../../phase1/plans/2026-06-01-remaining-work-plan.md) | 剩余工作执行计划(W1–W5,20 真待办) | 🔄 |
- Stop line: do not promote historical claims to current truth without a current source or user decision
- Successor: Current phase1 README/status indexes; navigation only.
- Proposed template: `governance-index-v1 + archive-record-v1 overlay`; runtime/E2E/visual/coverage credit: 0/0/0/0.

## Boundaries and authorization

- `accept-readonly-proposal` is a historical document proposal verdict only; it does not authorize migration or ledger writes.
- Dates from filenames are recorded as document-date hints; embedded historical dates and status words remain in `bodyDates`/`statusSignals` and are not rewritten.
- All unresolved TODOs, milestone conflicts, current-vs-historical claims and successor references remain open for future product work.
- No repository files were modified by this review; outputs are only the two `/tmp` reports.

