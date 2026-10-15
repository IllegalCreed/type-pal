# CODE-QUALITY-91 - game inventory-action menu contract

Status: done
Phase: phase1
Capability: code-quality / game core menu
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: Codex
Visual Verification Timing: e2e-deferred
Contributor: Codex
Branch: codex/code-quality-3y

> 当前采用 [`AGENTS.md`](../../../../../AGENTS.md) 的“Codex 分派—贡献者执行—Codex 独立验收”临时模式；本批不修改产品实现，仅完成三份已存在实现/测试文件的逐文件核验与证据收口。

## 目标

逐文件核验物品一级子菜单的实现、测试和阶段一边界：装备/使用的 canonical WORD id、顺序、光标记忆、环绕移动、文案来源、防御性空选择，以及其 menu-driver caller/返回链与 SDLPal primary source 对齐；只有直接证据成立的三份文件才关闭。

## 范围

- 范围内:
  - `packages/game/src/core/menu/inventory-action-menu.ts`
  - `packages/game/src/core/menu/inventory-action-menu.test.ts`
  - `packages/game/src/core/menu/inventory-action-menu.glm-phase1-leaves.test.ts`
  - 相关 caller/oracle：`menu-driver.ts`、`inventory-menu.ts`、`primitives.ts`、`draw-menu.ts`、game state cursor ownership。
- 范围外:
  - `menu-driver.ts`、`inventory-menu.ts`、`equip-menu.ts`、`draw-menu.ts` 及 shared primitive 的实现修改；它们仅作 caller/oracle 读取与相邻回归。
  - CODE-QUALITY-90 revive status boundary、CODE-QUALITY-53/79 poison key、快捷键直达物品路径。
- 明确不做:
  - 不改变产品行为、公共接口、schema/save、生成物或 UI 形态。
  - 不把包级绿灯、覆盖率或测试数量当作逐文件关闭理由。

## 前提真值门

### 一句话行为 / 工程前提

物品入口先展示两个项目的一级框：装备（WORD 22）与使用（WORD 23）；静态选择记忆上次 cursor，Confirm 再由 caller 分派到对应 equip/use 菜单，单体 primitive 负责边界与环绕。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | `PAL_InventoryMenu` 建立两项、static `w` 记忆、WORD labels 22/23，Confirm 分派 `PAL_GameEquipItem` / `PAL_GameUseItem`。 | `reference/sdlpal/uigame.c:878-919`; `reference/sdlpal/ui.h:80-81`; `reference/sdlpal/play.c:244-325,327-359` |
| 第一阶段 | TS 实现以 `INVENTORY_ACTION_LABELS` 保持 equip/use 顺序和真实 WORD id，文案经 `getWord`，default cursor 仅接受有效第二项，Up/Down 委托 selection primitive 环绕。 | `packages/game/src/core/menu/inventory-action-menu.ts:32-79`; `packages/game/src/core/menu/primitives.ts:50-105` |
| 当前二阶段 | 此批仅核验 phase1 game menu slice；无 ref​​orge/editor/content 代码变更或行为迁移。 | `CLAUDE.md`; `docs/phase1/engineering-notes.md`; `docs/phase1/game-mechanics.md` |
| 本任务目标 | 三份白名单文件的 caller/oracle/边界证据充分，测试输入合法、逐合同可反证、无直接生产缺陷；生产文件不改。 | `packages/game/src/core/menu/menu-driver.ts:617-651`; `packages/game/src/core/menu/menu-driver.test.ts:238-271`; 本卡验证与 evidence |

### 反证与替代解释

- 最强替代解释: TS 的 `inventory-action` 可能只是绘制层标签，未必真正承接 InGameMenu 的物品 Confirm 或写回持久 cursor；需以 `menu-driver` dispatcher 与 game-state 字段为 caller 证据。
- 什么观察会推翻当前前提: 任一 primary-source 分支显示顺序/id/取消返回链不同；或 menu-driver 未将 action choice 分派到 equip/use；或合法状态下 choice/label/cursor 发生不可观察的静默丢失。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: 读取 `menu-driver.ts:459-503,617-651` 与 `primitives.ts:83-105`，action 层只负责一级选择，caller 负责栈转移。
  - 原版 / 第一阶段理解: 对照 `uigame.c:878-919`、`ui.h:80-81`、`play.c:244-359` 与实现注释。
  - extractor / 地图 / 数据解码: N/A；本批无资产或迁移链。
  - audit / test model: 逐读三份白名单测试，并以 caller 相邻 `menu-driver.test.ts` / `menu-driver.cov85.test.ts` 与 draw oracle 复核；mutation controls 覆盖 id mapping、cursor guard、wrap、WORD lookup、empty selection。

### 用户可见偏离

- 是否主动偏离已核真值: no
- `before -> after` 一句话: N/A（本批不改实现或用户行为）
- 代表场景: 从大世界按 ESC → 物品，一级框显示“装备/使用”；Down 选择“使用”，Confirm 进入可用物品列表。
- 用户裁决: N/A

## 上下文锚点

- 已拍板决策 / 铁律: 当前分派模式由 Codex 独立验收；测试少而精；同一实现文件单一 Coding Owner；高风险机制差异必须停线。CODE-QUALITY-90 revive status 仍 blocked，不与本批混改。
- 代码锚点(`file:line`): `inventory-action-menu.ts:4-25,32-79`; `menu-driver.ts:459-503,605-651`; `game-state.ts:1017,1920`; `primitives.ts:50-105`; `draw-menu.ts:140-145`。
- 已知坑 / 审计文档: 旧 T10b 漏过 `PAL_InventoryMenu` 一级 box，当前实现注释与 caller 已显式保留该边界；快捷键 E/W 直达路径另有 dispatcher，不纳入本批。
- 不得重新引入: 直接从 InGameMenu 跳 fullscreen item list、用下标替代 WORD id 22/23、绕过 `getWord`、在 selection primitive 外复制环绕逻辑、用不完整 fixture/cast 掩盖边界。
- 相关测试: 白名单两份 state tests；`menu-driver.test.ts:238-271`、`menu-driver.cov85.test.ts:510-535`、`draw-menu.glm-phase1-leaves.test.ts:74-88` 为相邻 caller/render oracle。

## 验收条件

- 功能: 三份白名单逐文件完整读取并给出 primary source/caller/oracle 证据；未发现直接生产缺陷时只关闭证据成立的记录。
- 测试: 白名单与相邻 menu-driver/draw 测试定向通过；合法 typed 输入；合同按 id mapping、cursor guard、wrap、label source、empty choice 分轴；3+ 精确 mutation controls 均业务失败、恢复全绿且字节还原。
- 文档: 任务卡、board、ledger、governance、tasks index、evidence 同步；ledger 使用机器重跑计数。
- 视觉 / 手工验证: 本批无 UI 改动，沿用 draw-menu caller oracle；剧情 E2E 不适用。
- E2E 用例登记: N/A（功能性 menu primitive 无剧情演出）。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单: Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / 仅任务卡、board/index、evidence、governance、ledger；实现白名单只读。
- 前提核验: verified（SDLPal `uigame.c:878-919`、`ui.h:80-81`、`play.c:244-359` 与 TS/caller 逐行读取；可证伪观察见反证节）。
- 范围、设计和验收条件: agree（纯治理/证据批，不改产品实现；定向测试、相邻测试、typecheck、Biome、mutation 与全量质量门）。
- 高风险用户产品裁决: N/A（保持已核真值且不改行为）。
- build 准入结论: Codex build allowed（仅文档/证据/账本写入；不得改实现文件）。

### 进入 done 前：独立验收

- 贡献者交付与自验: accept（Codex；无实现 diff；evidence 完整）。
- Codex 独立复核: accept（5 files / 85 targeted-adjacent tests；4 针精确反控；game typecheck/Biome；full check、ratchet、protected fast、lint-zero、ledger 全通过）。
- 用户体验/产品验收: N/A（无产品行为变化）
- done 准入结论: Codex done allowed；本卡只关闭三份白名单记录。

## Draft: 设计与风险

### 设计结论

保持实现不变；以 primary source → TS implementation → menu-driver caller → tests/oracles 的链路核验文件，补齐机器可复现证据和精确 mutation controls，再更新治理账本。

### 已知风险

- 风险: 相邻 `menu-driver` 已有重复合同，若不排重会把同一行为重复计入。
- 缓解: 白名单测试只按自身实现边界计数；caller/renderer 仅作 oracle 与相邻回归，不关闭相邻文件；mutation runner 使用临时 package tree 并记录 hash/恢复。

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: 任务卡、board/index、`docs/ops/audits/code-quality-governance.md`、`docs/ops/audits/code-quality-file-ledger.md`、`docs/ops/evidence/CODE-QUALITY-91/*`。
- 实现摘要: 无生产实现修改；三份白名单文件完成逐文件核验，未发现直接缺陷。
- 运行命令: 白名单/相邻 5 files / 85 tests；`node docs/ops/evidence/CODE-QUALITY-91/mutation-runner.mjs`（4 针精确 identity 反控）；`pnpm --filter @type-pal/game typecheck`；Biome 白名单；`pnpm check`；`pnpm coverage:ratchet`；`pnpm check:fast`；`pnpm lint`；`node scripts/quality/code-quality-ledger.mjs`。
- 浏览器 / 手工检查: N/A（无 UI 改动）。
- 跳过的检查及原因: 无浏览器/剧情 E2E（本批无产品行为或剧情演出变更）。

## Review: 审查与返工

- Reviewer: Codex
- 审查结论: 三份白名单逐文件证据完整；primary source、caller、oracle、合法输入、排重与有效反控均通过。
- 必须返工项: 无。
- Accept / rework: accept

## 用户验收

- 用户结论: N/A（无产品行为变化）
- 后续任务: CODE-QUALITY-90 仍待用户裁决；本批不解除其 blocked。

## 交接日志

- 2026-10-14 Codex: 完整读取三份白名单、menu-driver dispatch/state cursor、inventory/equip caller、selection primitive、draw oracle 与 SDLPal `uigame.c`/`ui.h`/`play.c`；确认本批无直接生产缺陷，准许仅文档/证据写入。Evidence: 本卡上下文锚点与 `docs/ops/evidence/CODE-QUALITY-91/`。Next: Codex 跑定向/相邻/全量质量门并独立收口。

## 下一位 Agent 提示词

无下一位 Agent 提示词；当前由 Codex 完成本批验证与收口。
