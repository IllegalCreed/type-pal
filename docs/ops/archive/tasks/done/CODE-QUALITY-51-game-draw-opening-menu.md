# CODE-QUALITY-51 — game draw opening menu wave member

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

原卡目标:逐文件核验标题菜单绘制三文件（`draw-opening-menu.ts` 与两份测试）,确认 FBP 全屏背景上的两行 `PAL_ReadMenu` 文本（不画 9-slice box）、两项文案、长文案 x 公式、闪烁选中色、阴影与缺背景边界对齐 SDLPal `uigame.c:42-167`、`ui.c:458`;`opening-menu.ts` 负责 cursor/choice,绘制层不拥有输入或存档。本卡与 CODE-QUALITY-52 组成 present/menu wave,先定向证据后统一跑全仓门。

## 范围

三文件;只读相邻 opening-confirm-pixels.grok-r1、draw-menu 公共出口、present.ts FBP chunk 2 注入、opening-menu 状态机、menu-driver。标题菜单观感留集中 E2E。

## 前提与证据

最强替代解释"测试只验证 tofu/素色 fixture 而遗漏真实词表 fallback、背景尺寸或 state ownership"由真实 caller、primary source 与缺资源反例域界定。历史收口:定向 3 files/17 tests、wave 统一门（check、ratchet、protected fast、lint-zero 3994 0/0/0、docs/content、ledger）通过,账本 3266/275 closed。

## 验收

历史 accept 后历经两轮再验:2026-10-18 Codex 复审 partial——直接 3 files/17、相邻 4 files/107、game typecheck 通过,未发现可由 primary+caller 证实的新 direct defect;coverage/ratchet/protected/full check 留 wave 收口,证据见 [README.md](../../../../ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/51-draw-opening-menu/README.md)。2026-10-21 renderer 八维统一门收口:按原三文件逐项 A–H 接受——收窄移植/宽度说明,补 100ms/600ms 与缺背景不清零的旧绿新单红;第四字断言迁移后截首字仍单红,弱 cursor 例交由精确色值例承接;原选择/读档状态和接口不改。逐文件记录见 [renderer-local.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-local.json),完整集中门与原件见 [renderer-gates.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json)。

## 状态与交接

done 保持原历史语义;2026-10-18 复审 partial、2026-10-21 renderer 收口按原范围接受且不附带广域文件接受;无产品行为/schema/save/管线/调用接口变化,视觉/E2E 仍延后。

## 历史范围

原卡属 2026-10-12 wave 时点;原始记录与历史提示词在保全块内逐字保留。

## 原始结论

原卡结论按 Status(done) 原样:未发现直接缺陷;定向 17+wave 全仓门通过。治理不撤销/不恢复旧信用。

## 当时证据

当时回执（17 定向、wave 统一门、lint 3994 零诊断）属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;renderer 收口结论以其原件为准,不凭旧基点授权新产品取舍。

## 继任文档

renderer 收口证据见上方链接;相邻 opening-confirm 像素 oracle 已由其它卡收口;当前任务导航以看板为准。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 6419B / SHA-256 6346b8694cb7546d2690832758171cddb73b0c398ce3dd57c00351c4c63b0df1；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# CODE-QUALITY-51 — game draw opening menu wave member

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 present/menu wave
Visual Verification Timing: e2e-deferred（标题菜单观感留集中 E2E；本批核背景/文字/选择色合同）

## 目标

逐文件核验标题菜单绘制实现与两份专属测试，确认 FBP 背景、两项文案、长文案 x 公式、闪烁色、阴影和缺背景边界对齐 SDLPal；本卡是 present/menu wave 成员，先完成定向证据，wave 完整后统一跑全仓质量门。

## 范围

- `packages/game/src/present/menu/draw-opening-menu.ts`
- `packages/game/src/present/menu/draw-opening-menu.test.ts`
- `packages/game/src/present/menu/draw-opening-menu.glm-phase1-leaves.test.ts`

只读相邻 oracle：`packages/game/src/present/menu/opening-confirm-pixels.grok-r1.test.ts`、`draw-menu.ts`、`present.ts`、`core/menu/opening-menu.ts`、`menu-driver.ts`。

## 前提真值门

- 一句话行为 / 工程前提：标题菜单是 FBP 全屏背景上的两行 `PAL_ReadMenu` 文本，不画 9-slice box；选中色、shadow 和 x/y 位置必须保持 SDLPal。
- 真值来源：`reference/sdlpal/uigame.c:42-167`（PAL_OpeningMenu、背景 chunk、文案坐标）；`reference/sdlpal/ui.c:458`（PAL_ReadMenu 文字/阴影）；`packages/game/src/core/menu/opening-menu.ts:39-75`（状态/光标生命周期）。
- 当前 `before` -> 目标 `after`：保持标题菜单用户可见形态与当前状态机不变 -> 通过逐文件 caller/oracle 与定向测试后登记已验证；发现 primary/caller 冲突立即停线。
- 最强替代解释 / 什么观察会推翻前提：测试可能只验证 tofu/素色 fixture 而遗漏真实词表 fallback、背景尺寸或 state ownership；真实 caller、primary source 或缺资源反例击穿时留 review/rework。
- 是否主动偏离已核真值：N/A（只读审计，wave 尚未统一收口）。

## 上下文锚点

- `draw-menu.ts:118-128` 是 opening 菜单公共出口，`present.ts:686-690` 注入 FBP chunk 2；`opening-menu.ts` 负责 cursor/choice，绘制层不拥有输入或存档。
- 目标实现/测试已全文读取；`opening-confirm-pixels.grok-r1.test.ts` 是已收口的相邻像素 oracle，本卡不重复关闭该文件。
- wave 节奏：本卡只运行定向测试并落证据；不在单卡阶段重复全仓 editor/migrate coverage。wave 完整后统一执行 `pnpm check`、ratchet、protected fast、lint-zero、docs/content review、ledger。

## 验证

- 定向：`draw-opening-menu.test.ts`、`draw-opening-menu.glm-phase1-leaves.test.ts`、`opening-confirm-pixels.grok-r1.test.ts`。
- 测试质量：真实 `drawOpeningMenu` caller、直接 framebuffer oracle、合法词表/缺词表/缺背景输入、Date.now 冻结、阴影与输入隔离；不以覆盖率单独验收。
- 全仓门：延至 present/menu wave 完整后运行并记录在 wave 收口卡/本卡交接；本卡未标 done 前不得把定向绿当作全仓通过。

## 当前模式推进记录

- Codex 范围/前提核验: verified（已读取实现、3 个范围测试、相邻 caller/oracle 与 primary source）
- 受委派 Coding Owner / 隔离分支: Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / `codex/code-quality-3y`
- build 准入: Codex build allowed（本卡只读审计；发现行为冲突立即升级）
- 贡献者交付/自验: N/A
- Codex 独立验收: accept（3 文件逐段证据、定向 17 tests、wave 全量质量门完成；未发现直接缺陷）
- 用户产品裁决/体验验收: N/A（保持现有形态）
- done 准入: Codex done allowed；wave 统一质量门已通过，本批无产品代码修改。

## 交接

- 2026-10-12 Codex：wave 成员完成。定向 3 files/17 tests 通过；与 CODE-QUALITY-52 一起通过全仓 `pnpm check`（editor631/4951、migrate96/739、game311/3519 等）、coverage ratchet、protected fast、lint-zero（3994 files 0/0/0）、docs/content review、diff-check、ledger。无产品代码/schema/save/资源格式变化；账本收口为 `3266 / 275 closed / 5 review / 2986 pending`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-51 game draw opening menu wave member
任务卡：docs/ops/tasks/CODE-QUALITY-51-game-draw-opening-menu.md
当前状态：build，属于 present/menu wave
角色：Codex 独立核验；允许读/测本卡白名单，不得标记 done
先读：本卡、AGENTS.md、CLAUDE.md、reference/sdlpal/uigame.c:42-167、draw-opening-menu.ts、3 个定向/相邻测试
请做：跑定向测试并记录 primary/caller/oracle；等 wave 完整后统一跑全仓质量门
不要做：不得改变产品形态、schema/save、资源格式或公共接口；不得用单包全绿关闭文件
输出：证据、测试结果、counter/返工项，或 wave 收口待办
```


## Codex 当前复审（2026-10-18）

历史 `done` 不等于本轮验收。本轮完整读取三个范围文件、opening-confirm 相邻像素 oracle、opening/menu caller 与 SDLPal `uigame.c:42-167`、`ui.c:458`；直接 3 files / 17 tests、相邻 4 files / 107 tests、game typecheck 通过，未发现可由 primary + caller 证实的新 direct defect。复审状态为 `partial`，不标 `accept`；coverage/ratchet/protected/full check 留 present/menu wave 收口。证据见 [`51-draw-opening-menu`](../../../../ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/51-draw-opening-menu/README.md)。

## 2026-10-21 renderer八维与统一门收口

本轮按原范围逐项A–H接受；实际caller/primary、结构取舍、测试判别力/合同迁移及当前身份见[逐文件记录](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-local.json)。有效旧证据按版本复用，不继承历史done或包绿信用。

只按opening原三文件：收窄移植/宽度说明，补100ms/600ms与缺背景不清零的旧绿新单红；第四字断言迁移后截首字仍单红，弱cursor例交由精确色值例承接。原选择/读档状态和接口不改。

[完整集中门与原件](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/renderer-gates.json)同时披露check之后唯一baseline授权数据条目及其86consumer复验，不冒称原check已执行新数据。无产品行为/schema/save/管线/调用接口变化；视觉/E2E仍按原卡延后，不附带广域文件接受。提交/推送/合main依实际最终门与Git交接。
````
<!-- incremental-original-source:end -->
