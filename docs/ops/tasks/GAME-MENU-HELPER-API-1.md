# GAME-MENU-HELPER-API-1 — menu helper 公共出口删除准入

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「GAME-MENU-HELPER-API-1 — menu helper 公共出口删除准入」的任务归属与历史边界。原目标见原文(摘录:Capability: menu helper public API ownership Reviewer: Codex Visual Verification Timing: N/A（公共出口/测试);本页治理不重开已终态任务。

## 范围

原卡含章节[GAME-MENU-HELPER-API-1 — menu helper 公共出口删除准入、2026-10-25 本地统一门收口（当前）、当前裁决与准入（2026-10-25）、发现与停止线（历史，2026-10-17）、事实锚点、准入条件],共2个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源4582B(SHA d6e1047c2cf2);原卡前提按原时点保留。当前存活入口:[codex-current-review.md](../evidence/CODE-QUALITY-107/codex-current-review.md)、[README.md](../evidence/CODE-QUALITY-94/approved-closeout/README.md)

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:done),治理不改写。

## 状态与交接

done保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。

## 历史范围

原卡属固定main时点;GAME-MENU-HELPER-API-1 — menu helper 公共出口删除准入的原始范围与日期在保全块内逐字保留。

## 原始结论

原卡结论按其Status(done)原样;治理不撤销/不恢复旧信用。

## 当时证据

原文2个链接与当时回执属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;不凭旧基点认定当前实现或授权新产品取舍。

## 继任文档

接替/关联入口见原文链接;当前任务导航以看板为准。 关联:[codex-current-review.md](../evidence/CODE-QUALITY-107/codex-current-review.md)、[README.md](../evidence/CODE-QUALITY-94/approved-closeout/README.md)


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4582B / SHA-256 d6e1047c2cf21b880107767ac94bc448ccabf7f29670f2a5a83a69bf85ca82c7；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# GAME-MENU-HELPER-API-1 — menu helper 公共出口删除准入

Status: done
Phase: phase1
Capability: menu helper public API ownership
Coding Owner: Codex
Reviewer: Codex
Visual Verification Timing: N/A（公共出口/测试边界）

## 2026-10-25 本地统一门收口（当前）

单一Owner Codex；同一codex/code-quality-94-102，main基点8ebcb70f0。用户两项裁决已落实，原范围54路径中20个新关闭、34既有关闭按版本桥接保留；12个相邻路径只验实际delta，不另授整文件信用。逐文件A–H、精确合同去向与完整失败/恢复原件见[当前收口](../evidence/CODE-QUALITY-94/approved-closeout/README.md)。

全仓20605产品＋714工具、七包TC与lint6111文件0/0/0；唯一official20168例／807源完成，原四条比率拒绝保留，仅三文件结构删除精确重计，同报告原ratchet/protected判据exit0；五项精确退役全部匹配。收尾docs/lint/ledger/diff原件提交前补齐，未齐不发布。状态done仅指本卡有限代码/质量门收口；本地冻结时尚未推送/PR/合并，实际远端发布由关联Git/PR与main CI记录，不能从本节预告继承。

旧日期或下方“当前/待裁决/rework”属于其明示候选，历史原件保留；不扩103+或重开pre94。

## 当前裁决与准入（2026-10-25）

用户明确批准删除零生产调用的旧菜单接口并删去或迁移相应测试。Codex单Owner，build allowed：pageUp/pageDown及私有查找、旧物品列表factory/config/display types、makeEquipMenuEntry、currentRoleId；同类不被实现读取的内部菜单参数与全部仓库调用点一并清理。matchesFilter、真实库存网格和角色导航行为保留。

同文件追加核明Confirm/Triple/Switch八个helper及三类型也仅测试调用，纳入同一用户“删除未使用旧接口”的清理范围；现用确认/开关由具体菜单状态机持有。上一份current-review的G“其它出口实际消费”过宽，撤回该句；本轮以实际全仓import/caller清单代替，不继承错误信用。

纯死代码清理以生产caller清单、删除影响、真实相邻回归及最终集中门验收，不伪造“失败例证明零caller”。下方旧准入第3条的该表述不作为本轮证明方法，历史原文保留。唯一分支codex/code-quality-94-102，接续已推b8b2ffaf4；不恢复旧分支。

## 发现与停止线（历史，2026-10-17）

CODE-QUALITY-107 对 menu helper 实现、测试、真实 caller 和 SDLPal primary 做了完整读取。
当前 caller census 显示：

- `packages/game/src/core/menu/primitives.ts` 的 `pageUp`、`pageDown` 为导出函数，内部
  `findNextSelectable` 仅由它们调用；全仓生产源码没有 caller，现有消费只在
  `primitives.test.ts` 与 `primitives.glm-phase1-leaves.test.ts`。
- `packages/game/src/core/menu/item-select.ts` 的 `createItemSelectMenu`、
  `ItemDisplayMode` 和 rightText 建表逻辑没有生产 caller；现有消费只在
  `item-select.glm-phase1-leaves.test.ts` 与 `__tests__/item-magic-select.test.ts`。
  真实 inventory/shop/sell 路径使用各自菜单 builder，不调用该 helper。

删除这些导出会改变公共模块接口，也可能影响未被当前仓库静态搜索捕获的外部 caller。
按 AGENTS.md 公共接口停止线，本卡只登记事实，不删除代码、不改测试、不改产品行为，
没有 `build allowed`。

## 事实锚点

- 当前实现与测试证据：[CODE-QUALITY-107 review](../evidence/CODE-QUALITY-107/codex-current-review.md)。
- 当前 primary：SDLPal `ui.c:510-572`（逐项光标，无 PgUp/PgDn 产品路径）、
  `itemmenu.c:28-466`、`play.c:266`、`uigame.c:1777`（真实物品入口）。
- 当前真实 callers：`inventory-menu.ts`、`sell-menu.ts`、`equip-menu.ts`、
  `in-game-magic-menu.ts` 与 `menu-driver.ts`；它们不消费待删除 helper。

## 准入条件

只有在确认以下事项后才能进入 `build`：

1. 用户确认这些导出不属于外部包、插件或未纳入仓库的运行时 caller；
2. 明确选择删除 test-only helper，或保留并标记为有意的测试合同；
3. 若删除，先写失败反例证明真实公共出口不可达，再删除实现与仅依赖该出口的弱测试，
   并运行 game/menu 相邻测试、typecheck、全仓质量门和 coverage ratchet/protected fast；
4. 不用 `as`、ignore、exclude、导出重命名或空壳包装绕过接口变化。

在准入前，CODE-QUALITY-107 的 E-4/E-5 保持 review，相关文件不标已验证。
```
<!-- incremental-original-source:end -->
