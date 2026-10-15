# CODE-QUALITY-98 — menu 域剩余状态机审核（opening-menu / player-status）

Status: rework
Owner: GLM（2026-10-15 按总 goal 自主推进）
Reviewer: Codex（独立验收）
Phase: phase1
Capability: Q3 menu state contract governance
Visual Verification Timing: N/A（纯数据层，无产品/UI行为修改）

## Codex R2 当前验收（2026-10-15）

候选 `1f8bcd468`，独立验收分支 `codex/quality-menu-accept-94-95`，主线基点 `cddf65557`。
counter：choice用例重复；真实标题取消未复位已开高风险卡。状态页局部合同不升级整卡通过。

逐文件实际读取、primary/caller/oracle、反证、全部质量门状态和可直接复制的GLM返工提示词见
[Codex R2再验收](../evidence/CODE-QUALITY-94/codex-r2-review.md)。本卡适用该提示词；
仅修本卡已核测试/注释白名单，三个新GAME高风险draft卡无build allowed，不得开始实现。
全仓check与新ratchet/protected仍带真实诊断，不能称完整门通过；本轮0新闭合，未合main。

## GLM及前轮交付记录（历史）

下文原签字、统计与“通过”是各自revision当时的作者/前轮声明，当前以本节Codex R2为准；
不追溯改写旧回执，不用作者自验替代独立验收。交接到GLM时先fetch并核最新任务状态与独占Owner。

## 目标与范围

menu 域逐文件治理第三批（2 文件，最小不重叠，不碰 CODE94/95 白名单 30 文件与 CODE-97 两文件）：

- `packages/game/src/core/menu/opening-menu.ts`（74 行，product）
- `packages/game/src/core/menu/player-status.ts`（58 行，product）

及其 3 个专属测试（`opening-menu.test.ts`、`opening-menu.glm-phase1-leaves.test.ts`、`player-status.test.ts`）+ 相邻 `menu-driver.test.ts`。零代码改动；交付物=逐文件结论+死面登记。

## 前提真值门

一句话工程前提：两个状态机的行为合同由 sdlpal primary source 与真实 caller（bootstrap/menu-driver/battle-system/present 渲染层）共同钉住，本批只核不改。

| 方向 | 直接证据 |
|---|---|
| Primary source | opening-menu.ts:2/22-32/51 锚 `uigame.c:42-167`（2 项 value 0/1、Cancel 重置 wDefaultItem:150）、`ui.h:48-49`（WORD id 7/8，含 byte 级 GBK 解码备注）；player-status.ts:2-17/35-50 锚 `uigame.c:1051-1286`（输入循环 1265-1284：Menu=-1 直退、Left/Up=prev、Right/Down/Search=next、越界关）。 |
| 第一阶段 | 真实 caller：opening-menu 被 bootstrap.ts:68（开机建菜单）、menu-driver.ts:88/440（choice 分发）、draw-opening-menu.ts:13（labels 渲染）消费；player-status 被 menu-driver.ts:98（分发/关菜单）、battle-system.ts:61（战斗中状态屏，与 menu-stack resumeAfterMenusClosed 的 gs.battleState→battle 回退语义一致）、draw-player-status.ts:38（渲染）消费。 |
| 第二阶段 | N/A；不涉及 reforge/editor/content。 |
| 目标 | 逐文件四维结论 + 死面登记；不改行为、不删代码。 |

最强替代解释：注释锚可能过时。复核：player-status 头注"v1 page 概念已删"与现实现（无 page 字段）一致；opening-menu WORD id 7/8 与 opening-menu.test/leaves 测试的 flat[7]/flat[8] 词表断言一致；未见注释与实现/caller 漂移。

## 逐文件结论（四维）

### opening-menu.ts — 通过

- 正确性与边界：2 项固定、wrap 导航、choice 按 WORD id 反查、空表防御 undefined 均有判别性测试；`openingMenuLabels` 与菜单 items 同源 getWord（词表载入同步性有 leaves 测试钉住）。
- 注释质量：高——含 id 7/8 的 byte 级 GBK 解码验证备注（hex→"新的故事"/"旧的回忆"）与 WORD.DAT 单一文案源说明，"state machine 不持坐标"的 ownership 边界明示。
- 内聚/耦合：纯数据状态机；坐标/渲染留 present 层，dispatch 留 menu-driver，职责分离清楚。
- 复用：正确复用 primitives.SelectionMenu（环绕/默认位），未另造轮子。
- 无死面：5 个导出全部有生产 caller（labels→draw-opening-menu，choice→menu-driver:440，create→bootstrap，Up/Down→menu-driver）。

### player-status.ts — 通过（1 项登记）

- 正确性与边界：空队伍 create 即 done、prev/next 越界即 done、done 后幂等（不再 mutate cursor，防 dispatcher 重复触发）均有测试；`partyMembers` 快照拷贝防外改。
- 注释质量：高——输入循环逐键锚 uigame.c:1271/1276/1281；头注诚实记录 v1 `page` 概念被用户截图证伪删除的历史（防回归设计错误）；done 标志 ownership（state 不直接动 menuStack，由 dispatcher 关）明示。
- 内聚/耦合：最小状态（cursor/partyMembers/done）；渲染全屏布局由 draw-player-status 负责，状态机零呈现侵入。
- 复用：party 遍历语义与 in-game-magic-menu targetCursor 边界 noop 不同（此处越界=关菜单）——两者各有 sdlpal 锚，属不同业务合同，不强行共享（符合 D 纪律）。
- 发现 E-6（P3）：`currentRoleId` 无生产 caller（全局 grep 仅本文件+测试；menu-driver/draw 直接读 state）。test-only 公共 API，删除须另卡，本批不执行。

### 测试质量（3 文件）

- 去重表清晰（leaves 文件列明与主测试的差异轴：choice 映射值、词表同步、空表防御）。
- 断言有判别力：wrap 方向各一、越界关菜单两个方向、done 幂等、数组不共享引用（identity）、labels 非空兜底。
- 合法输入：全部直调公开入口，无强转/非法 fixture。

## 验证

- 定向：3 专属 + menu-driver 相邻 = 4 files / 52 tests PASS（VITEST_MAX_WORKERS=1，2026-10-15 00:53）。
- 全门：本批零代码改动，与 CODE94/95 批共用同一棵已过全门的树（`5cb6b9d22`：全仓 pnpm check exit 0、official ratchet、protected fast exit 0、lint-zero 零诊断）+ CODE-97 批后 docs/lint 复验；本批追加文档后 check:docs / lint / ledger 复验见证据目录。
- 账本：新增 2 行 review（GLM 结论待 Codex 验收）。

## 下一步

Codex 独立验收后收口；E-6 并入 E-1..E-5 待 94/95 验收后的实现批。menu 域 core 状态机至此全部覆盖（save-slot-menu 属存档域、menu-driver/sell-menu 另域处理）。无用户裁决需求。
