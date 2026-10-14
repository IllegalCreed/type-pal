# CODE-QUALITY-95 — menu 测试夹具合法性 counter

Status: review
Owner: GLM（用户指定后续 Coding Owner；Codex 当前交付 review 检查点）
Reviewer: Codex（独立验收）
Phase: phase1
Capability: menu test legal typed input and isolation
Visual Verification Timing: N/A（纯测试治理）

## 目标与白名单

撤回并纠正三份测试的旧闭合信用：

- `packages/game/src/core/menu/inventory-menu.test.ts`
- `packages/game/src/core/menu/inventory-menu.boundaries.test.ts`
- `packages/game/src/core/menu/shop-menu.boundaries.test.ts`

修改 Owner Codex，实施仅在 `codex/code-quality-menu-integration` 工作树；原治理分支只更新 counter/账本，不在 coverage 运行中改源。

## 前提与证据

工程前提：测试使用的 Item/PlayerRoles 必须符合当前公开类型和 caller 数据形态。原测试虽然绿，但 boundary `roles()` 把 `PlayerRole[]` 写为 `Object.fromEntries` 对象，主测试死人 fixture 只有 id/hp/name，shop fixture 缺 Item 必需字段；均以 `as unknown as` 掩盖。

- 直接类型：`packages/shared/src/tables.ts:51-76,491-592`，Item 必填字段与 PlayerRoles.roles 的数组合同。
- 真实 caller：`inventory-menu.ts:213-254` 按 `playerRoles.roles[roleId]` 构建目标；`shop-menu.ts` public factory/select/confirm 读取合法 Item catalog。
- Oracle：party `[2,0]` 返回真实 roleId 0、死人仍可选、inUse 等值门、cash===price/price-1、确认意图与实际 catalog 不变性。
- Primary/phase1 behavior：沿用已核 itemmenu/uigame 的目标/选择合同；本卡不改变机制。phase2 N/A。
- 最强替代解释：当前函数只读 id/name/price，最小夹具也能跑；但 public caller 的完整类型/数组形态明确，不可借只读字段把非法对象算业务覆盖。合法 typed fixture 若改变业务 oracle，即须停线复核测试模型。

## 修正与停止线

Codex build allowed：补齐 typed Item/PlayerRole；按 roleId 索引构造真实数组；删无必要强转；数量使用合法域，不改变业务断言或规则。复用已完整读取的 `__tests__/coverage85-glm-game/harness.ts` 纯 `makeRole` 工厂，工厂无顶层状态/IO，参数覆盖返回 fresh typed 对象。

不修改产品、公共接口、schema/save、ItemFlags 或 caller；不加 ignore/exclude/timeout/fallback。测试合同重复/独立轴问题继续按真实 oracle 分拆/排重，未知不强关。

## 验证与状态

- 三份文件须全文复核，定向/相邻与 typecheck 先完成；独立 CODE94 候选的全部质量门作为同一模块集成门，不以旧源分支门冒充。
- 原治理分支三条由已验证恢复 review；旧卡/旧 receipt 作为历史保留，不追溯改写成符合新结论。
- 完整门前不恢复已验证、不标 done；下一位 GLM 按本卡末尾提示词接手；未验收前不得标 done。

## 当前交付结果

24 files / 241 tests、game typecheck、docs/content-review、lint4008零诊断与ledger通过；30文件仍review。尚未运行独立全仓check/official ratchet/protected fast，不合main。用户要求Codex当前部分完成后停止，本候选保存为可恢复检查点。

## 下一位 Agent 提示词（GLM，2026-10-14 用户指定接手）

继续 type-pal 有限模块代码治理，默认单 Agent。先读 AGENTS.md、CLAUDE.md、docs/ops/agent-workflow.md、board.md、code-quality-governance.md、code-quality-file-ledger.md、phase1 engineering-notes/game-mechanics，以及 CODE94/95 与 CODE83–89/91/92 的历史卡和证据。工作目录 `/Users/zhangxu/.codex/worktrees/quality-menu-integration/type-pal`，分支 `codex/code-quality-menu-integration`；main 基点 cddf65557e60619e40e38168b276cf01981a106a。先 fetch/status/show/ledger，核对最新 main；不得写主工作树 `/Users/zhangxu/illegal/type-pal` 或覆盖别人未提交文件。

本候选30文件见 `docs/ops/evidence/CODE-QUALITY-94/source-manifest.json`。全部保持 review；CODE95 三份非法 fixture 已改为完整 Item/PlayerRole 和真实 roleId 数组，须独立全文复核，不以旧闭合信用或字节相同替代合法输入验收。已实测：24 files/241 tests、game typecheck、docs/content-review、lint4008零诊断、ledger3267/closed229/review35/pending3003。独立候选的全仓 check、官方 ratchet、真实 protected fast 尚未执行，不得标 done 或合 main。

先接手 CODE94/95 验收并补全部门。CODE93/96 在 `codex/code-quality-3y` 单独收口后才可按白名单接收；如接收卖菜单删重，必须同时核精确退役 metadata 的 count/两端 identity digest/文件SHA，不能复制源分支整份 coverage baseline。用官方工具重新测，保留失败原件；禁止降低规则/ignore/exclude/强转/弱断言。每文件完整读取实现、真实 caller、出口、类型、生命周期和 primary/oracle；行为修复先失败反例，触高风险先停线开卡。不得整条合入含 CODE53/90 未收口行为的旧治理分支。

允许在 CODE94/95 白名单内修复已证测试问题并补证，当前生产行为/公共接口/schema/save/资产改动未授权。与 ED-ENTITY-STATE-PLAN-1、活跃 GLM 分支不抢写。阶段交付先 commit/push，再 fetch 确认 origin/main...HEAD 的 behind=0；提交逐文件结论、未修风险、全部真实门、账本数字和下一批候选供 Codex 独立验收。未知保持 review/pending，不得自行把历史 accept 搬成当前验收。完成本模块后再按最新账本选2–4文件最小不重叠批次。
