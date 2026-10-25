# CODE-QUALITY-94 — menu 独立阶段集成窗口

Status: build
Owner: Codex（2026-10-15用户授权接手本批返工；GLM原交付保留为历史）
Reviewer: Codex（独立验收）
Phase: phase1
Capability: Q3 menu state contract integration
Visual Verification Timing: N/A（无产品/UI行为修改）

本轮统一证据入口：[94–102当前逐文件复审与原件](../evidence/CODE-QUALITY-94/current-review/README.md)。

## 2026-10-25 94–102复审与必要返工（当前准入）

用户在pre94正式合并后明确继续94–102：复用已有证据，只补质量缺口和必要返工；只保留一条治理分支，多张相关卡完成后再集中全仓与coverage，零诊断后由Codex自行提交、推送、PR合并。

- 基点最新origin/main `8ebcb70f0e054038f52e6a3b3f7b35a1f6e536b8`；隔离树 `/Users/zhangxu/.codex/worktrees/quality-94-102/type-pal`，唯一分支 `codex/code-quality-94-102`。旧3y已在PR22合并、删除和可恢复归档，主树及四处未跟踪语言资源未动。
- Coding Owner=Codex（单Agent）。build allowed限94–102原范围、实际关联测试/叶、注释/结构/合法fixture/去重与证据缺口。94原30路径按当前pre94 `menu-core-closeout`/renderer版本绑定复用，不因旧卡仍写review就重新生产整套审查；96既有精确退役及102已有闭合逐项保留，普通包绿不升级文件。
- 接手机器基线3452tracked／511closed／63review／2878pending；八个新读域仅登记review后为511／71／2870，0新closed。安装使用现有lock的pnpm10.29.2 frozen/offline，202 reused、0 downloaded，依赖/lock零改。
- 重点余项：97的test-only翻页/物品工厂；98角色索引和测试合同；99路由职责、死参/死出口、已登记两条坏注释；100排重漏迁已补的最终证据；101输入域、IDB open/close/失败ownership；102既有工具caller变化和八维缺项。
- 原GAME-MENU-HELPER-API-1与GAME-SAVE-INPUT-DOMAIN-1两停止线已集中请求明确裁决，未收到前不删出口、不收紧槽号行为。新产品/格式/数据库版本/清档/资源变化不自动获准；已有批准的事务complete/标题取消和V1类型分离不重复请示。
- 卡内只跑必要定向/相邻/TC/静态；全仓check、official ratchet/protected和单PR放在上述相关范围稳定冻结后集中。原始失败与非零诊断保留，显式default reporter核可见日志。无下一位Agent提示词，Codex持续推进。

下方各“当前/最新”标题和数字属于其明示日期的历史候选，不能代替本次状态；本次代码验收、统一门与发布分别记载。

## C02诊断治理最新窗口

用户继续要求修妥94、95、97–102已发现问题，goal持续active；既有两项获批行为修复保持，未批准显示取舍不偷改。
7433f71f5的全仓check/确认版ratchet/普通protected数值通过，仍有真实诊断，不合main，0新关闭。
C02 G04十例先404→0，oracle补强并合并同合同undo后九例0诊断；三文件review。
实际原件、逐文件界限与后续G01/G02/G05范围见[最新窗口](../evidence/QUALITY-EDITOR-DIAGNOSTICS-2/window-review.md)。
下方旧menu窗口数字按其冻结候选保留，不当当前诊断数。

## 2026-10-15 最终模块窗口（当前）

稳定源码候选bb94ad8e2，完整check/official ratchet/protected fast均exit0，
但分别仍有3620/3610/3523条未包act、各577条act环境及2条导航诊断，统一门不通过。
定向125、game全包3564与七包typecheck通过；本卡保持rework，本轮0文件关闭。
实际读取/修改文件、caller/oracle、完整回执、官方baseline diff和剩余风险见
[完整窗口](../evidence/CODE-QUALITY-94/codex-final-window.md)；不以包绿升级逐文件验收。

## Codex 接手修复（2026-10-15，作者自验证）

测试/注释返工分提交6766a3c2e、01931b3f2、0a039271c；manifest当前摘要及比较revision已重算。
详见 [Codex接手日志](../evidence/CODE-QUALITY-94/codex-takeover.md)。当前重新集中跑完整门，
机制/Save三卡保持draft，editor诊断另由QUALITY-EDITOR-DIAGNOSTICS-1登记，不静音、不强关30条。

## Codex R3 独立验收与接手（2026-10-15，冻结作者旧交付）

候选 `5477af1e4`，最新主线 `f98d0ddd8`，独立验收树 0 behind / 17 ahead。
counter/rework：保留有效排重和 typed 修正；统一门非零诊断、法术机制反证、manifest 当前 SHA 待修。30 条不关闭。
直接证据、逐文件读取、反例与真实门见 [Codex 三验](../evidence/CODE-QUALITY-94/codex-r3-review.md)。
本轮 0 新闭合；3283 / 229 closed / 44 review / 3010 pending，未合 main。
用户本轮授权质量不足时由 Codex 接手；后续低风险测试/注释修复的 Coding Owner 改为 Codex，
GLM 不再写本批修复文件。三张 GAME 高风险卡保持 draft，无 build allowed；不扩产品/Save/公共接口。
无下一位 Agent 提示词，由 Codex 继续；原 GLM/R2 结论以下按历史保留。

## Codex R2 验收（历史，2026-10-15）

候选 `1f8bcd468`，独立验收分支 `codex/quality-menu-accept-94-95`，主线基点 `cddf65557`。
counter：R1诊断未清，另有C2机制反证、C5测试质量与manifest旧布尔；30条不关闭。

逐文件实际读取、primary/caller/oracle、反证、全部质量门状态和可直接复制的GLM返工提示词见
[Codex R2再验收](../evidence/CODE-QUALITY-94/codex-r2-review.md)。本卡适用该提示词；
仅修本卡已核测试/注释白名单，三个新GAME高风险draft卡无build allowed，不得开始实现。
全仓check与新ratchet/protected仍带真实诊断，不能称完整门通过；本轮0新闭合，未合main。

## GLM及前轮交付记录（历史）

下文原签字、统计与“通过”是各自revision当时的作者/前轮声明，当前以本节Codex R2为准；
不追溯改写旧回执，不用作者自验替代独立验收。交接到GLM时先fetch并核最新任务状态与独占Owner。

## 目标与范围

从最新 `origin/main=cddf65557e60619e40e38168b276cf01981a106a` 建独立分支 `codex/code-quality-menu-integration`，有限接收 CODE83–89/91 的30条 menu 状态/测试记录及 CODE92 更正证据。CODE93 四文件仅在其真实 protected gate 收口后接收。白名单逐路径见 `docs/ops/evidence/CODE-QUALITY-94/source-manifest.json`。

当前 source 分支 `codex/code-quality-3y` 还含未收口行为，不整条合 main。不导入 CODE53/57/79/80/81/90 实现、毒键、状态页、战斗/Dev Panel/thumbnail/save/音频/生成物，也不导入其 coverage baseline；新候选由官方工具重新核基线。

## 前提真值门

一句话工程前提：逐文件语义证据只有在当前源码仍对应已审版本、测试输入/合同仍合法且独立主线候选通过全部质量门时，才能在主线恢复闭合。

| 方向 | 直接证据 |
|---|---|
| Primary source | CODE83–89/91 原卡的 SDLPal uigame/itemmenu/magicmenu/ui/play/script 直接锚点及逐文件记录，CODE92 的30条 closure source SHA；本卡不作新的原版实机/视觉声明。 |
| 第一阶段 | source-manifest 列出每文件 closure/current/main/candidate SHA；主线所有菜单实现在范围内只存在一条过时注释更正，行为源码未改。 |
| 第二阶段 | N/A；不接收 reforge/editor/content 生产修改。 |
| 目标 | 30条先登记 review；复核质量 counter、跑独立候选的定向/相邻/typecheck/check/official ratchet/protected fast/lint/docs/ledger，再允许主线阶段集成。 |

最强替代解释：源字节相等不能证明旧审阅本身充分。已发现三份旧测试非法/不完整 fixture，另开 CODE95 直接修正并撤回旧信用；其余未知仍待逐文件审阅，不借全仓绿灯扩大关闭范围。

## 上下文与准入

- AGENTS.md 当前临时模式、CLAUDE.md 忠实还原与零诊断、agent-workflow 测试质量验收继续适用；单 Agent/单一写入 Owner Codex。
- 原卡/原件保留历史身份；check:fast 历史误标由 CODE92 更正，不能替代本候选的 `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`。
- Codex build allowed：仅复制白名单已审候选与原件，处理已证测试夹具 counter，维护任务/账本与集成证据；不改生产机制、公共接口、schema/save 或资源管线。
- 工作树 `/Users/zhangxu/.codex/worktrees/quality-menu-integration/type-pal`；主工作树未写入。冻结 lockfile offline install 202 reused / 0 downloaded，未改依赖/lockfile。

## 验证与交付

- 定向覆盖各菜单状态及相邻 menu-driver/event/present caller，必要 game typecheck 与全仓 check。
- 官方 ratchet、protected fast、最终 lint-zero、docs/content-review、ledger 均须独立运行；退出0但有诊断不接收。
- 所有阶段提交先推送候选分支；PR/合并前 fetch 并确认 behind=0；合并后重新 fetch 主线。
- 新候选还未通过全部门，不标 done；main pending 不因源分支历史数量改变。下一位 GLM 按本卡末尾提示词接手；未验收前不得标 done。

## 当前交付结果

源批 CODE93/96 已在 `codex/code-quality-3y` 的 `d4cf7f57d237895d920ddee72f69e0278680157a` 完成并推送：sell-menu 四文件及 approved-test-retirements 两文件全文/caller/oracle验收、96定向相邻、59coverage工具、37quality工具、七包typecheck/full check、official ratchet、真正protected fast（731源码/19874tests，精确3→2退役获准）、最终lint4056零诊断/docs/ledger均通过。源账本3271/373closed/15review/2883pending，0behind/86ahead，未合main。本候选尚未接收这六个文件，30条review与3267/229/35/3003口径不变；候选最终lint4012零诊断。GLM接收时按精确白名单及其证据，不复制整份源baseline或未收口行为，不把源门当成本候选门。

用户指定Codex完成当前部分后停止。本卡交GLM的review检查点，只补交接事实；未执行候选完整check/ratchet/protected，不标done。原用户裁决详见源CODE95卡：第一阶段复活清<=999临时状态、保留>999装备状态；第二阶段使用status/grantedStatuses区分来源，不能混用。

24 files / 241 tests、game typecheck、docs/content-review、lint4008零诊断与ledger通过；30文件仍review。尚未运行独立全仓check/official ratchet/protected fast，不合main。用户要求Codex当前部分完成后停止，本候选保存为可恢复检查点。

## GLM 逐文件复核与独立门（2026-10-15，基点不变 cddf65557，0 behind/2 ahead）

- 30/30 候选全文复核完成：9 生产实现（纯状态机、caller=menu-driver/scene-system/draw-menu 接线核对、sdlpal 锚注释抽核无误）+ 21 测试（合同正交、typed fixture 零强转、防御分支标注"公开 state 直造"）；逐文件结论与"好代码"四维（注释/复用/测试质量/内聚耦合）见 `docs/ops/evidence/CODE-QUALITY-94/glm-review.md`。
- manifest 机械复核：candidate/main SHA 30/30 字节一致；closure 身份 27/30 候选=闭合版本，恰 3 份按标记偏离=closureSha 记录准确的 CODE95 修复。无 CODE53/57/79/80/81/90/毒键/状态页导入，新增强转 0，sell-menu.ts（CODE93 域）未被触碰，baseline.fast.json 未被预改。
- CODE95 三份独立裁定合法（详见 glm-review.md）：旧"空角色"用例断言经 closure 原文核对 oracle 未变、仅更正误导标题并加强断言；makeRole 工厂纯函数核验通过。
- 独立复跑门：定向 24 files/241 tests PASS（VITEST_MAX_WORKERS=1）、game typecheck 0 错、check:docs PASS、lint-zero PASS 4012 files 0/0/0、ledger PASS 3267=229 closed/35 review/3003 pending。
- protected fast 首跑按设计 fail-closed：七包 731 files/19822 tests 全绿、覆盖率无回退，范围审计报 game 测试内容变化 4 文件/+2 测试（3495→3497）+执行 digest 变化 → 按门指示接 official ratchet（exit 0，基线只升不降更新，提升 0 项/范围变化 2 项；baseline diff 精确=+2 计数、4 文件 identityDigest、game scope/execution digest，无其它改动）；protected fast 终跑 exit 0「覆盖率门禁通过；相对 fast 基线未下降」。全仓 `pnpm check` exit 0（最终 lint-zero 4012 files 0/0/0）。board.md content-review pin 按 Codex 先例外科刷新（×2 处+history 追加）。
- 发现登记（不在本窗口执行）：E-1 equip-menu.confirmEquipItem 死参（公共签名，另卡）；E-2 5 处测试内联 PlayerRole/Magic 工厂可统一至 harness（~150 行重复）；E-3 item-magic-select flags 展开强转清理。
- 30 条账本保持 review 交 Codex 独立验收；不标 done、不合 main。

## GLM R1–R4 返工（2026-10-15，响应 Codex counter 8c951cd7a）

- R1：三门"PASS exit 0"报告已更正为"带存量诊断非干净通过"（act 警告 3,489/3,527/3,499+jsdom 导航 2）；归属量化：**全部 editor 包**（139 个 .tsx，Top=WorldSpriteLibrary/BattleSpriteLibrary 系），game 域零贡献；不静音不越界，交 Codex 集中清理卡核 Owner/白名单。
- R2：inventory-menu.ts 两处过时注释已更正（stub log→startOverworldItemScript 真链；id 0"观音符"→wObjectID 61..294/0 哨兵，一手核提取器 items.ts）。
- R3：item-magic-select makeItem 改显式 Partial flags 参数域+删 6 处强转；menu-mode/shop-menu 残留掩盖 3 处同清；21 份测试逐文件证据表重写（caller/oracle/合法输入/隔离/判别/强转账六列）；"重复≥3必须提取"自创规则删除。
- R4：inventory-menu.test 200 改单体 usable 合成 fixture（真实 caller 选人域前提，注释声明合成属性）；死人/取消 oracle 未动；相邻 driver applyToAll/单体回归保留。
- manifest 5 文件 candidateSha 更新+reworkCounter 标注；返工门禁回执 glm-r2-*.txt 同证据目录。30 条仍 review 交 Codex 再验收。

## GLM C5 返工（2026-10-15，响应 Codex codex-r2-review）

- C5-94：menu-mode.test 两处假 inventory state 改真工厂；equip leaves 重复 filter/phase/cursor 条删除（主测试全覆盖）；in-game-magic-menu.test 三处 JSON.parse any 改 structuredClone（恢复类型检查并补非空断言）；in-game-menu leaves 拆分残留标题更正；manifest 30 条布尔按当前候选全量重算（10 条修正，candidate==closure 20/30，"27/30"旧断言作废并注明 revision 归属）。
- C5-97..102（详见各卡 R2 段）：item-select 位序/虚构枚举注释更正（global.h:135-136 一手核）；primitives PgUp 虚构锚更正+pageDown 钳制优先真实语义钉真；potion/important 否决位独立化；opening leaves 重复删除；player-status 域限定；menu-driver.test 全面 typed（E-7 关闭）+确定性 cursor 安排；cov85 11 条库存改不同 id+异步 reject/同步 throw oracle；simulateSave 重复模型删除+IDB 隔离错误声明收回+幽灵引用更正；api.ts 头注释更正（E-10 关闭）+过 claim 回收；quick-save.test 重写（E-13 关闭：真 GameState/计时器与 DOM 清理/preventDefault/解绑/三异步反馈）。
- C1 存量诊断维持（editor 域，归属已量化，Codex 集中清理卡）；C2/C3/C4 三高风险机制归 GAME-OUTSIDE-MAGIC-DISABLED-1 / GAME-OPENING-CANCEL-CURSOR-1 / GAME-SAVE-IDB-COMMIT-1（draft 无 build allowed，本返工零触碰）。
- 门禁：定向+相邻 36 files/326 tests 零诊断、game typecheck 0、docs、lint-zero 4073 files 0/0/0、ledger PASS；全仓 check/ratchet/protected fast 链回执 glm-c5-*.txt（含 act 警告计数）。30 条仍 review。

## 下一位 Agent 提示词（GLM，2026-10-14 用户指定接手）

继续 type-pal 有限模块代码治理，默认单 Agent。先读 AGENTS.md、CLAUDE.md、docs/ops/agent-workflow.md、board.md、code-quality-governance.md、code-quality-file-ledger.md、phase1 engineering-notes/game-mechanics，以及 CODE94/95 与 CODE83–89/91/92 的历史卡和证据。工作目录 `/Users/zhangxu/.codex/worktrees/quality-menu-integration/type-pal`，分支 `codex/code-quality-menu-integration`；main 基点 cddf65557e60619e40e38168b276cf01981a106a。先 fetch/status/show/ledger，核对最新 main；不得写主工作树 `/Users/zhangxu/illegal/type-pal` 或覆盖别人未提交文件。

本候选30文件见 `docs/ops/evidence/CODE-QUALITY-94/source-manifest.json`。全部保持 review；CODE95 三份非法 fixture 已改为完整 Item/PlayerRole 和真实 roleId 数组，须独立全文复核，不以旧闭合信用或字节相同替代合法输入验收。已实测：24 files/241 tests、game typecheck、docs/content-review、lint4008零诊断、ledger3267/closed229/review35/pending3003。独立候选的全仓 check、官方 ratchet、真实 protected fast 尚未执行，不得标 done 或合 main。

先接手 CODE94/95 验收并补全部门。CODE93/96 在 `codex/code-quality-3y` 单独收口后才可按白名单接收；如接收卖菜单删重，必须同时核精确退役 metadata 的 count/两端 identity digest/文件SHA，不能复制源分支整份 coverage baseline。用官方工具重新测，保留失败原件；禁止降低规则/ignore/exclude/强转/弱断言。每文件完整读取实现、真实 caller、出口、类型、生命周期和 primary/oracle；行为修复先失败反例，触高风险先停线开卡。不得整条合入含 CODE53/90 未收口行为的旧治理分支。

允许在 CODE94/95 白名单内修复已证测试问题并补证，当前生产行为/公共接口/schema/save/资产改动未授权。与 ED-ENTITY-STATE-PLAN-1、活跃 GLM 分支不抢写。阶段交付先 commit/push，再 fetch 确认 origin/main...HEAD 的 behind=0；提交逐文件结论、未修风险、全部真实门、账本数字和下一批候选供 Codex 独立验收。未知保持 review/pending，不得自行把历史 accept 搬成当前验收。完成本模块后再按最新账本选2–4文件最小不重叠批次。

## 下一位 Agent 提示词（Codex 独立验收，2026-10-15 GLM 交付后）

CODE94/95 的 GLM 复核与独立门已完成并推送至 `codex/code-quality-menu-integration`（候选提交后 0 behind）。验收材料：`docs/ops/evidence/CODE-QUALITY-94/glm-review.md`（逐文件结论+四维质量+CODE95 裁定+机械核验）、证据目录新增 glm-* 回执（定向 241 复跑/typecheck/docs/lint/ledger/protected-fast 首跑 fail-closed/ratchet/protected-fast 终跑/全仓 check）、账本 30 条仍 review。Codex 按卡独立核：30 文件抽样直读、CODE95 oracle 保持性、ratchet 基线 diff 只含 game 测试范围合法变化、protected fast exit 0。验收通过后由 Codex 收口集成（对齐 main、合并、重 fetch）；E-1/E-2/E-3 为下一批候选不在本窗口。不得由 GLM 自行标 done。

## Codex 独立验收（2026-10-15）

Codex counter：当前GLM统一门含3489/3527/3499条React act警告，且各有2条jsdom导航诊断，虽然exit0也不能算干净通过。inventory-menu仍有id0/stub过时注释；组合测试残缺flags入参强转与“21测试零强转”报告矛盾，逐文件测试证据不能合并一行。见同批evidence/CODE-QUALITY-94/codex-review.md及codex-review-proof.json的直接锚点、SHA与返工项。

Codex独立24files/241tests及game typecheck通过；CODE95完整字段/数组修正成立，但R4真实caller前提不成立，30文件整批不accept，不标done、不合main。CODE94/95均转rework，账本信用不增加。未修改任何实现/测试源，不扩大到CODE97–102验收；当前机器数量按ledger工具。

下一位GLM：先fetch本分支读上述counter，按R2/R3/R4只在白名单内修注释/fixture类型并补逐文件证据；R1集中诊断须核Owner/另卡白名单，不为过门静音或越界改UI。保留原失败/带诊断原件，统一门未干净通过不得标done。完整可复制交接提示词在codex-review.md末尾。

### Codex caller 复核补充：CODE95同样counter

库存测试的200物品applyToAll=true，死人目标/取消却直接进选人；生产menu-driver:711-717和SDLPal play.c:268-323会跳过picker。因此“typed修正局部通过”初判须收紧：字段/数组修正成立，真实单体caller前提仍需R4修正，CODE95转rework。见codex-review.md的R4；只修合法测试输入，不改变产品行为。30文件保持review，未有accept、未合main。
