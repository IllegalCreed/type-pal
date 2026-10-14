# CODE-QUALITY-95 — menu 测试夹具合法性 counter

Status: build
Owner: Codex
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
- 完整门前不恢复已验证、不标 done；无下一位 Agent 提示词，同一 Codex 继续。

## 跨工作树候选与用户交接

独立候选 `/Users/zhangxu/.codex/worktrees/quality-menu-integration/type-pal` 的三份测试已补完整 typed fixture；24文件/241相邻定向 tests 和 game typecheck、docs/content-review、lint4008零诊断通过。原治理分支3份源仍为旧版本，明确保持review；不能用候选结果恢复旧字节信用。
用户于2026-10-14要求当前部分完成后停止，后续GLM接手；CODE94/95候选待独立全仓门/主线集成，Codex不再领取新批次。
