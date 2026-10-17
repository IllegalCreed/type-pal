# CODE-QUALITY-50 — game draw magic 窄批

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 present/menu
Visual Verification Timing: e2e-deferred（菜单观感留集中 E2E；本批核 framebuffer、布局、状态投影合同）

## 目标

逐文件核验大世界仙术菜单绘制实现和三份专属测试，确认施法人选择、仙术网格、WIN95 MP/说明布局、目标箭头、角色信息框、运行时数值、缺资源边界与 framebuffer ownership 对齐 SDLPal；只在直接证据支持时修复，不把包级全绿推成文件已审。

## 范围

- `packages/game/src/present/menu/draw-magic.ts`
- `packages/game/src/present/menu/draw-magic.test.ts`
- `packages/game/src/present/menu/draw-magic.glm-phase1-leaves.test.ts`
- `packages/game/src/present/menu/magic-menu-pixels.grok-r1.test.ts`

只读上下文：`packages/game/src/present/menu/draw-menu.ts`、`packages/game/src/present/present.ts`、`packages/game/src/core/menu/in-game-magic-menu.ts`、`packages/game/src/core/menu/menu-driver.ts`、`packages/game/src/present/__tests__/grok-present/p06-magic.test.ts`。

## 前提真值门

- 一句话行为 / 工程前提：`drawInGameMagicMenu` 只把现有仙术菜单状态与运行时角色/法术资源投影到 framebuffer，必须保持 SDLPal 的施法人/仙术/目标三阶段布局、禁用色、MP 说明位置、角色信息框和资源缺失安全边界。
- 真值来源：`reference/sdlpal/magicmenu.c:36-299,301-410,413-484`（网格、颜色、分页、说明、MP、cursor）；`reference/sdlpal/uigame.c:653-875`（施法人/目标流程、信息框与目标箭头）；`reference/sdlpal/uibattle.c:31-269`（PlayerInfoBox 数值/图标布局）；`packages/game/src/core/menu/in-game-magic-menu.ts:1-220`（当前状态生命周期）。
- 当前 `before` -> 目标 `after`：现有仙术菜单用户可见布局和状态投影保持不变 -> 逐文件证据、反例和质量门齐全后将本批 4 个文件登记为已验证；若发现 primary/caller 冲突立即停线升级。
- 最强替代解释 / 什么观察会推翻前提：测试可能只覆盖素色像素而未覆盖真实 state/caller、角色 ID/运行时统计或说明脚本；若 caller 的 phase/party/resource ownership 与当前实现不同，或 primary source 反例能击穿现有 oracle，则本批留 review/rework，不关闭文件。
- 是否主动偏离已核真值：N/A（仅审计；若需用户可见行为改变，另开高风险卡并请求裁决）。

## 上下文锚点

- `draw-menu.ts` 的 `in-game-magic` 分支负责 playerRoles/spells/magics 注入；`present.ts` 负责 runtime role projection 与 UI frames。
- `in-game-magic-menu.ts` 定义 pick-caster/pick-spell/pick-target/done 生命周期、disabled 由 MP/死亡/usable outside battle 构造，绘制层不拥有输入/脚本/MP 扣除。
- 4 个范围文件已全文读取；P06 caller/oracle覆盖合法施法人/网格/目标/MP/翻页，GLM leaves覆盖死亡/禁用/空表/缺 catalog，pixels覆盖坐标/缺帧/运行时属性/说明多行/透明孔。

## 验证

- 测试质量：逐断言核对合法 typed state、真实 draw caller、直接 framebuffer oracle、反例判别力、旧 P06 合同排重、时间冻结和输入快照隔离；不以测试数量/覆盖率单独验收。
- 定向：`draw-magic.test.ts`、`draw-magic.glm-phase1-leaves.test.ts`、`magic-menu-pixels.grok-r1.test.ts`、P06 caller。
- 相邻：game typecheck、game 全包。
- 全仓质量门：`pnpm check`、`pnpm coverage:ratchet`、`TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`、`node scripts/quality/lint-zero.mjs`、`node scripts/docs/check-content-review.mjs --strict`、`git diff --check`、`node scripts/quality/code-quality-ledger.mjs`。

## 当前模式推进记录

- Codex 范围/前提核验: verified（已读取 primary source、caller、状态生命周期和 4 个范围文件；尚待测试结果）
- 受委派 Coding Owner / 隔离分支: Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / `codex/code-quality-3y`
- build 准入: Codex build allowed（仅本批白名单；发现行为/primary 冲突立即停线）
- 贡献者交付/自验: N/A（Codex 直接执行）
- Codex 独立验收: accept（4 个范围文件全文、primary source/caller、定向/相邻与全仓质量门完成；未发现直接缺陷）
- 用户产品裁决/体验验收: N/A（不主动改变形态；视觉留集中 E2E）
- done 准入: Codex done allowed；本批无产品代码修改、schema/save/资源格式或公共接口变化。

## 交接

- 2026-10-12 Codex：从最新 `origin/main` 建立本批；当前分支相对主线 ahead 20 / behind 0；完整读取 4 个范围文件、P06 caller、draw-menu/present/menu-driver/in-game-magic-menu 及 `magicmenu.c`/`uigame.c`/`uibattle.c` primary source；未发现直接缺陷。定向 4 files/25 tests、game typecheck、game 全包 311/3519、全仓 `pnpm check`（editor631/4951、migrate96/739，其余包全绿）均通过；coverage ratchet 与 protected fast 通过且基线保持、0 项下降；lint-zero 3994 files、error/warning/info 全 0；docs/content review、git diff --check、ledger 均通过。未触碰高风险边界；视觉留集中 E2E。账本更新为 `3266 files / 269 closed / 5 review / 2992 pending`。下一批建议先累积相邻 `present/menu` 只读核验，形成独立 wave 后再统一跑全仓门。

## 下一位 Agent 提示词

```text
无下一位 Agent；本批已完成并归档，下一批先累积相邻菜单只读核验再统一跑质量门。
```


## Codex 当前复审（2026-10-18）

历史 `done` 不等于本轮验收。本轮完整读取四个范围文件、P06 caller/oracle、menu/state 生命周期与 SDLPal `magicmenu.c:1-484`、`uigame.c:653-875`、`uibattle.c:31-269`；直接 25/25、相邻 5 files/136 tests 和 game typecheck 通过。

发现高风险用户可见差异：SDLPal `PAL_PlayerInfoBox` 在仙术页复用的底部信息框中绘制中毒头像染色和乱/定/眠/封状态字，当前 `draw-magic.ts` 明确省略。已开 [`GAME-MAGIC-PLAYERINFO-STATUS-1`](../../../tasks/GAME-MAGIC-PLAYERINFO-STATUS-1.md) 等待用户裁决；本批未改实现或公共输入，draw-magic.ts 登记 `review`，三份测试按自身合同登记已验证。50 当前复审为 `partial`，不标 `accept`。
