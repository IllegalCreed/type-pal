# CODE-QUALITY-95 — menu 测试夹具合法性 counter

Status: review
Owner: GLM（用户指定后续 Coding Owner；Codex 当前交付 review 检查点）
Reviewer: Codex（独立验收）
Phase: phase1
Capability: menu test legal typed input and isolation
Visual Verification Timing: N/A（纯测试治理）

## Codex R2 当前验收（2026-10-15）

候选 `1f8bcd468`，独立验收分支 `codex/quality-menu-accept-94-95`，主线基点 `cddf65557`。
accept仅限三份fixture修正：R4单体caller前提已纠正，字段/数组/oracle成立；统一门未通过，不标done。

逐文件实际读取、primary/caller/oracle、反证、全部质量门状态和可直接复制的GLM返工提示词见
[Codex R2再验收](../evidence/CODE-QUALITY-94/codex-r2-review.md)。本卡适用该提示词；
仅修本卡已核测试/注释白名单，三个新GAME高风险draft卡无build allowed，不得开始实现。
全仓check与新ratchet/protected仍带真实诊断，不能称完整门通过；本轮0新闭合，未合main。

## GLM及前轮交付记录（历史）

下文原签字、统计与“通过”是各自revision当时的作者/前轮声明，当前以本节Codex R2为准；
不追溯改写旧回执，不用作者自验替代独立验收。交接到GLM时先fetch并核最新任务状态与独占Owner。

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

## GLM 独立复核（2026-10-15）

三份修复全文复核裁定合法（详见 `../evidence/CODE-QUALITY-94/glm-review.md`）：typed Item/PlayerRoles 数组形态与 `tables.ts` 合同及 `inventory-menu.ts:213-254`/`shop-menu.ts` 真实 caller 一致；`makeRole` harness 纯函数核验（无顶层状态/IO、fresh typed、`magic` 可选字段合法）；关键保 oracle 核对——旧"空角色"用例断言本就期望 use-target+selectedItemId=200（closure 原文），修复仅更正误导标题并新增 targetMenu 空断言（加强），party[2,0] roleId≠cursor、cash===price/price-1、inUse 恰等门均与 closure 一致；id 400/401→105/110 后 oracle 等价。三份相对 closure 增量即修复本身，无夹带。定向/相邻/typecheck/docs/lint/ledger 与 CODE94 同批独立复跑通过；ratchet/protected fast 回执见 CODE94 证据目录。仍 review，待 Codex 独立验收。

## GLM R4 返工（2026-10-15，响应 Codex counter）

死人目标用例输入已修正：inventory-menu.test 的 200 由 applyToAll:true 改单体 usable consuming（合成 fixture 注释声明不代表原始物品属性）——真实 caller menu-driver:711-717 对 applyToAll 跳过选人直跑脚本（play.c:268-323 同），原输入不在选人域；oracle（死人可选/roleId/取消）保留未弱化。另按 R3 清理 menu-mode/shop-menu 残留掩盖强转。三份仍 review 交 Codex 再验收。

## 下一位 Agent 提示词（GLM，2026-10-14 用户指定接手）

继续 type-pal 有限模块代码治理，默认单 Agent。先读 AGENTS.md、CLAUDE.md、docs/ops/agent-workflow.md、board.md、code-quality-governance.md、code-quality-file-ledger.md、phase1 engineering-notes/game-mechanics，以及 CODE94/95 与 CODE83–89/91/92 的历史卡和证据。工作目录 `/Users/zhangxu/.codex/worktrees/quality-menu-integration/type-pal`，分支 `codex/code-quality-menu-integration`；main 基点 cddf65557e60619e40e38168b276cf01981a106a。先 fetch/status/show/ledger，核对最新 main；不得写主工作树 `/Users/zhangxu/illegal/type-pal` 或覆盖别人未提交文件。

本候选30文件见 `docs/ops/evidence/CODE-QUALITY-94/source-manifest.json`。全部保持 review；CODE95 三份非法 fixture 已改为完整 Item/PlayerRole 和真实 roleId 数组，须独立全文复核，不以旧闭合信用或字节相同替代合法输入验收。已实测：24 files/241 tests、game typecheck、docs/content-review、lint4008零诊断、ledger3267/closed229/review35/pending3003。独立候选的全仓 check、官方 ratchet、真实 protected fast 尚未执行，不得标 done 或合 main。

先接手 CODE94/95 验收并补全部门。CODE93/96 在 `codex/code-quality-3y` 单独收口后才可按白名单接收；如接收卖菜单删重，必须同时核精确退役 metadata 的 count/两端 identity digest/文件SHA，不能复制源分支整份 coverage baseline。用官方工具重新测，保留失败原件；禁止降低规则/ignore/exclude/强转/弱断言。每文件完整读取实现、真实 caller、出口、类型、生命周期和 primary/oracle；行为修复先失败反例，触高风险先停线开卡。不得整条合入含 CODE53/90 未收口行为的旧治理分支。

允许在 CODE94/95 白名单内修复已证测试问题并补证，当前生产行为/公共接口/schema/save/资产改动未授权。与 ED-ENTITY-STATE-PLAN-1、活跃 GLM 分支不抢写。阶段交付先 commit/push，再 fetch 确认 origin/main...HEAD 的 behind=0；提交逐文件结论、未修风险、全部真实门、账本数字和下一批候选供 Codex 独立验收。未知保持 review/pending，不得自行把历史 accept 搬成当前验收。完成本模块后再按最新账本选2–4文件最小不重叠批次。

## Codex 独立验收（2026-10-15）

Codex counter：当前GLM统一门含3489/3527/3499条React act警告，且各有2条jsdom导航诊断，虽然exit0也不能算干净通过。inventory-menu仍有id0/stub过时注释；组合测试残缺flags入参强转与“21测试零强转”报告矛盾，逐文件测试证据不能合并一行。见同批evidence/CODE-QUALITY-94/codex-review.md及codex-review-proof.json的直接锚点、SHA与返工项。

Codex独立24files/241tests及game typecheck通过；CODE95完整字段/数组修正成立，但R4真实caller前提不成立，30文件整批不accept，不标done、不合main。CODE94/95均转rework，账本信用不增加。未修改任何实现/测试源，不扩大到CODE97–102验收；当前机器数量按ledger工具。

下一位GLM：先fetch本分支读上述counter，按R2/R3/R4只在白名单内修注释/fixture类型并补逐文件证据；R1集中诊断须核Owner/另卡白名单，不为过门静音或越界改UI。保留原失败/带诊断原件，统一门未干净通过不得标done。完整可复制交接提示词在codex-review.md末尾。

### Codex caller 复核补充：CODE95同样counter

库存测试的200物品applyToAll=true，死人目标/取消却直接进选人；生产menu-driver:711-717和SDLPal play.c:268-323会跳过picker。因此“typed修正局部通过”初判须收紧：字段/数组修正成立，真实单体caller前提仍需R4修正，CODE95转rework。见codex-review.md的R4；只修合法测试输入，不改变产品行为。30文件保持review，未有accept、未合main。
