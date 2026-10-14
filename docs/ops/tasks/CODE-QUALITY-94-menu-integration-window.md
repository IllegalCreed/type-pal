# CODE-QUALITY-94 — menu 独立阶段集成窗口

Status: review
Owner: GLM（用户指定后续 Coding Owner；Codex 当前交付 review 检查点）
Reviewer: Codex（独立验收）
Phase: phase1
Capability: Q3 menu state contract integration
Visual Verification Timing: N/A（无产品/UI行为修改）

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

24 files / 241 tests、game typecheck、docs/content-review、lint4008零诊断与ledger通过；30文件仍review。尚未运行独立全仓check/official ratchet/protected fast，不合main。用户要求Codex当前部分完成后停止，本候选保存为可恢复检查点。

## 下一位 Agent 提示词（GLM，2026-10-14 用户指定接手）

继续 type-pal 有限模块代码治理，默认单 Agent。先读 AGENTS.md、CLAUDE.md、docs/ops/agent-workflow.md、board.md、code-quality-governance.md、code-quality-file-ledger.md、phase1 engineering-notes/game-mechanics，以及 CODE94/95 与 CODE83–89/91/92 的历史卡和证据。工作目录 `/Users/zhangxu/.codex/worktrees/quality-menu-integration/type-pal`，分支 `codex/code-quality-menu-integration`；main 基点 cddf65557e60619e40e38168b276cf01981a106a。先 fetch/status/show/ledger，核对最新 main；不得写主工作树 `/Users/zhangxu/illegal/type-pal` 或覆盖别人未提交文件。

本候选30文件见 `docs/ops/evidence/CODE-QUALITY-94/source-manifest.json`。全部保持 review；CODE95 三份非法 fixture 已改为完整 Item/PlayerRole 和真实 roleId 数组，须独立全文复核，不以旧闭合信用或字节相同替代合法输入验收。已实测：24 files/241 tests、game typecheck、docs/content-review、lint4008零诊断、ledger3267/closed229/review35/pending3003。独立候选的全仓 check、官方 ratchet、真实 protected fast 尚未执行，不得标 done 或合 main。

先接手 CODE94/95 验收并补全部门。CODE93/96 在 `codex/code-quality-3y` 单独收口后才可按白名单接收；如接收卖菜单删重，必须同时核精确退役 metadata 的 count/两端 identity digest/文件SHA，不能复制源分支整份 coverage baseline。用官方工具重新测，保留失败原件；禁止降低规则/ignore/exclude/强转/弱断言。每文件完整读取实现、真实 caller、出口、类型、生命周期和 primary/oracle；行为修复先失败反例，触高风险先停线开卡。不得整条合入含 CODE53/90 未收口行为的旧治理分支。

允许在 CODE94/95 白名单内修复已证测试问题并补证，当前生产行为/公共接口/schema/save/资产改动未授权。与 ED-ENTITY-STATE-PLAN-1、活跃 GLM 分支不抢写。阶段交付先 commit/push，再 fetch 确认 origin/main...HEAD 的 behind=0；提交逐文件结论、未修风险、全部真实门、账本数字和下一批候选供 Codex 独立验收。未知保持 review/pending，不得自行把历史 accept 搬成当前验收。完成本模块后再按最新账本选2–4文件最小不重叠批次。
