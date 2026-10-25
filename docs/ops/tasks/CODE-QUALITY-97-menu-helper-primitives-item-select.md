# CODE-QUALITY-97 — menu 基础 helper 逐文件审核（primitives / item-select）

Status: review
Owner: Codex（2026-10-15用户授权接手本批返工；GLM原交付保留为历史）
Reviewer: Codex（独立验收）
Phase: phase1
Capability: Q3 menu helper state/contract governance
Visual Verification Timing: N/A（纯数据层，无产品/UI行为修改）

## 2026-10-25 当前复审增量

完整核当前helper与五专测，复用CODE107/GLM29真值/否决位证据；只补质量欠账。primitives旧未来Step3注释已纠正；boundaries混合第一例拆成空表/单项/入参不变三个合同，leaf的Confirm/Switch混例一分二，原断言完整迁移，5文件51例全绿。公共page/旧物品factory仍等待GAME-MENU-HELPER-API-1裁决，未删除；item-select的混合filter/builder测试将在接口结果确定后收敛，不借当前绿关闭。

唯一分支`codex/code-quality-94-102`，起点`8ebcb70f0`；新证据和逐文件八维见[本次入口](../evidence/CODE-QUALITY-94/current-review/README.md)。昂贵门待相关范围稳定后集中，原下方日期结论保持历史。无下一位Agent提示词，Codex继续。

## 2026-10-15 最终模块窗口（当前）

稳定源码候选bb94ad8e2，完整check/official ratchet/protected fast均exit0，
但分别仍有3620/3610/3523条未包act、各577条act环境及2条导航诊断，统一门不通过。
定向125、game全包3564与七包typecheck通过；本卡保持review，本轮0文件关闭。
实际读取/修改文件、caller/oracle、完整回执、官方baseline diff和剩余风险见
[完整窗口](../evidence/CODE-QUALITY-94/codex-final-window.md)；不以包绿升级逐文件验收。

## Codex 接手修复（2026-10-15，作者自验证）

Important 与翻页锚已由Codex修正；未知test-only合同仍review。
实改范围、红绿反例及后续统一门见 [Codex接手日志](../evidence/CODE-QUALITY-94/codex-takeover.md)。
这是作者修复/自验证，不冒充再次独立accept；本卡保持review、不标done、不增加closed。

## Codex R3 独立验收与接手（2026-10-15，冻结作者旧交付）

候选 `5477af1e4`，最新主线 `f98d0ddd8`，独立验收树 0 behind / 17 ahead。
counter/rework：位序和独立负例成立，内联 Important 与测试翻页锚仍错误；test-only 合同保持 review。
直接证据、逐文件读取、反例与真实门见 [Codex 三验](../evidence/CODE-QUALITY-94/codex-r3-review.md)。
本轮 0 新闭合；3283 / 229 closed / 44 review / 3010 pending，未合 main。
用户本轮授权质量不足时由 Codex 接手；后续低风险测试/注释修复的 Coding Owner 改为 Codex，
GLM 不再写本批修复文件。三张 GAME 高风险卡保持 draft，无 build allowed；不扩产品/Save/公共接口。
无下一位 Agent 提示词，由 Codex 继续；原 GLM/R2 结论以下按历史保留。

## Codex R2 验收（历史，2026-10-15）

候选 `1f8bcd468`，独立验收分支 `codex/quality-menu-accept-94-95`，主线基点 `cddf65557`。
counter：装备位注释反事实、伪disabled反例、否决位混淆，test-only出口需核。

逐文件实际读取、primary/caller/oracle、反证、全部质量门状态和可直接复制的GLM返工提示词见
[Codex R2再验收](../evidence/CODE-QUALITY-94/codex-r2-review.md)。本卡适用该提示词；
仅修本卡已核测试/注释白名单，三个新GAME高风险draft卡无build allowed，不得开始实现。
全仓check与新ratchet/protected仍带真实诊断，不能称完整门通过；本轮0新闭合，未合main。

## GLM及前轮交付记录（历史）

下文原签字、统计与“通过”是各自revision当时的作者/前轮声明，当前以本节Codex R2为准；
不追溯改写旧回执，不用作者自验替代独立验收。交接到GLM时先fetch并核最新任务状态与独占Owner。

## 目标与范围

CODE94/95 的 30 文件窗口不含 menu 模块两个基础 helper，本批补上（2 文件，最小不重叠）：

- `packages/game/src/core/menu/primitives.ts`（175 行，product）
- `packages/game/src/core/menu/item-select.ts`（94 行，product）

及其 5 个测试文件（`__tests__/primitives.test.ts`、`primitives.boundaries.test.ts`、`primitives.glm-phase1-leaves.test.ts`、`item-select.glm-phase1-leaves.test.ts`、`__tests__/item-magic-select.test.ts`）。零代码改动；交付物=逐文件结论+发现登记。

## 前提真值门

一句话工程前提：两个 helper 是 menu 域共享纯函数，行为合同由 sdlpal primary source 与现有 caller 共同钉住，本批只核不改。

| 方向 | 直接证据 |
|---|---|
| Primary source | primitives.ts:4/83/109 锚 `uigame.c:242-451`、`ui.c:510-572`（L38 不跳 disabled）、`ui.c:540+`（PgUp/PgDn）；item-select.ts:52/56 锚 `play.c:266`（kItemFlagUsable 入口）、`uigame.c:1777`（kItemFlagSellable 入口）、`itemmenu.c`（price/2）。 |
| 第一阶段 | 生产 caller：matchesFilter 被 sell-menu.ts:99（sellable 门）、equip-menu.ts:66（equip 门）、draw-inventory.ts:314（着色 isUsable）消费；SelectionMenu 系被 battle-state/battle-system/shop/opening/save-slot/inventory/magic-select 等 10+ 文件消费。 |
| 第二阶段 | N/A；不涉及 reforge/editor/content。 |
| 目标 | 逐文件四维（注释/复用/测试质量/内聚耦合）结论 + 死面登记；不改行为、不删代码。 |

最强替代解释：注释锚可能过时（文件曾改）。复核：L38 不跳 disabled 的语义与 in-game-magic-menu/battle handle*SelectInput 的 `!sel.disabled` no-op 消费方一致；pageUp/pageDown 的 findNextSelectable 落点与测试四态一致，未见注释与实现漂移。

## 逐文件结论（四维）

### primitives.ts — 通过（2 项登记）

- 正确性/边界：空表/单项/越界 clamp/环绕/ensureCursorVisible 视窗不变量均由测试钉住；`(from + dir*step + n*step) % n` 对负 from（pageUp target-1=-1）验证正确。
- 注释质量：高。L38 决策注释写明"为什么逐项不跳 disabled、翻页跳"双语义及消费方；锚点齐全。
- 内聚/耦合：纯 data+cursor 操作，无 IO/DOM；被 10+ 生产文件共享，是正当的共享 primitive（非过度抽象）。
- 发现 E-4（P3）：`pageUp`/`pageDown`/`findNextSelectable` 无当前生产 caller（primitives.boundaries.test.ts 头注"已签排除，撤回保活"）；`findNextSelectable` 的 `dir=-1` 臂无任何调用。删除属公共接口变化，须另卡+caller/输入域/替代证据，本批不执行。
- 测试质量：三文件去重表清晰（主干/边界/叶各自分工），49 用例含全 disabled 兜底、负 cursor、identity 透传（`getSelected` 同对象引用）等判别性断言。

### item-select.ts — 通过（1 项登记）

- 正确性/边界：matchesFilter 七分支真值表（含 potion 双否决位、battle 三分支）由 item-select.glm-phase1-leaves 直接表钉住；sellPrice=floor(price/2) 有奇数价断言。
- 注释质量：诚实——"M5 简版"近似（important≈非卖非装备、sell 模式 disabled 恒 false）均显式标注为已知近似而非机制事实；两个 filter 入口带 sdlpal 行号锚。
- 内聚/耦合：纯建表函数；与 inventory-menu（全显示+渲染着色）职责差异在测试中显式区分（建表期过滤 vs 全显示）。
- 发现 E-5（P3）：`createItemSelectMenu`/`ItemDisplayMode`/rightText 逻辑无生产 caller（全局 grep 仅测试消费；真实菜单走 inventory/shop/sell-menu 1:1 port）。同理另卡处理，本批不删。
- 测试质量：目录外 itemId 剔除、缺 _name 回退、空表、pageSize 覆写、floor 奇数价均为合法 typed fixture 判别性断言。

## 验证

- 定向：5 files / 49 tests PASS（VITEST_MAX_WORKERS=1，2026-10-15 00:49）。
- 全门：本批零代码改动，与 CODE94/95 批共用同一棵已过全门的树（`5cb6b9d22`：全仓 pnpm check exit 0、official ratchet、protected fast exit 0、lint-zero 4012 零诊断、docs、ledger）；本批仅追加文档，追加后 check:docs/lint 复验见证据目录。
- 账本：新增 2 行 review（GLM 结论待 Codex 验收）。

## R2/C5 返工（2026-10-15，响应 Codex codex-r2-review）

- item-select.ts 注释更正：equip 位引用改 kItemFlagEquipable=1<<1（global.h:136 一手核；旧注"0x01 装备类"位序反）；kItemFlagImportant 声明为工程近似（枚举无此项，global.h:134-141）。
- primitives.ts：PgUp 注释锚更正——PAL_ReadMenu(ui.c)无 kKeyPgUp 分支（旧 ui.c:540 锚系 Up/Left 行）；pageUp/pageDown 显式标注 test-only 保留与另卡删除路径（E-4 维持）。
- primitives.glm-phase1-leaves：pageDown"跳过 disabled"标题与行为不符已改真——发现并钉住 target 钳制优先于跳过的真实语义（与 pageUp 方向不对称），注释说明；potion 投掷否决隔离（usable+throwable）；important 双守卫各自单真用例隔离。
- item-select.glm-phase1-leaves：同上否决位独立化。

## 下一步

Codex 独立验收后收口为已验证；E-4/E-5 与 CODE94/95 登记的 E-1/E-2/E-3 合并为后续实现批候选。无用户裁决需求。
