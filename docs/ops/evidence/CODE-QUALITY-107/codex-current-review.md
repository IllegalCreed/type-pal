# CODE-QUALITY-107 — Codex 当前验收（2026-10-17）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本件回答:CODE-QUALITY-97/98 menu 基础切片（`primitives.ts`、`item-select.ts` 与五个专属测试）的当前逐文件状态,及 E-4/E-5 两个未决边界。

## 范围与证据

完整读取两实现与五测试,并读取 inventory-menu/sell-menu/equip-menu/magic-select/in-game-magic-menu/menu-driver/draw-inventory 及战斗选择 caller 相关路径;公开 caller 只消费纯 state/过滤结果,没有私有 helper mock。

## 发现

`primitives.ts` 的 cursor/page/confirm/triple/switch 合同与 SDLPal 逐项移动一致;disabled 可停留、空表、越界和 pageOffset 有判别性 oracle;pageUp/pageDown/findNextSelectable 是 test-only,当前没有生产 caller,保留 E-4 供后续公共出口准入。`item-select.ts` 的 filter 真值表与 usable/sellable primary 入口一致;important 是显式工程近似;目录外 id、缺名、空库存、pageSize、sell price floor 和数据层 disabled=false 均有合法 typed 反例;`createItemSelectMenu` 当前无生产 caller,保留 E-5,不擅自删除。

## 结论

定向 7 files/78 tests PASS 0 stderr;相邻 40 files/377 tests PASS 但 `magic-script.test.ts` 保留 2 条预期缺失 labelMap stderr（不在白名单,未静音或改断言）;game typecheck PASS;本批无生产或测试源修改。

## 整改与复核

没有发现可在本批直接修复的产品缺陷或弱测试;两个实现文件与五个测试文件登记 review,不标已验证;E-4/E-5 仍需独立删除/公共出口准入证据。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1667B / SHA-256 0909d3190b271bd2845a794501a697a90ea3097cf04efad556182219b68092b1；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-107 — Codex 当前验收（2026-10-17）

## 读取范围

完整读取 `primitives.ts`、`item-select.ts` 和五个专属测试；读取 `inventory-menu.ts`、
`sell-menu.ts`、`equip-menu.ts`、`magic-select.ts`、`in-game-magic-menu.ts`、`menu-driver.ts`、
`draw-inventory.ts` 及战斗选择 caller 的相关路径。公开 caller 只消费纯 state/过滤结果，
没有私有 helper mock。

## 当前结论

`primitives.ts` 的 cursor/page/confirm/triple/switch 合同与 SDLPal 逐项移动一致；disabled
可停留、空表、越界和 pageOffset 有判别性 oracle。pageUp/pageDown/findNextSelectable 是
test-only，当前没有生产 caller，保留 E-4 供后续公共出口准入。

`item-select.ts` 的 filter 真值表与 usable/sellable primary 入口一致；important 是显式工程
近似。目录外 id、缺名、空库存、pageSize、sell price floor 和数据层 disabled=false 均有
合法 typed 反例。`createItemSelectMenu` 当前无生产 caller，保留 E-5，不擅自删除。

## 当前验证

- 定向：7 files / 78 tests PASS，0 stderr。
- game menu 相邻：40 files / 377 tests PASS，但 `magic-script.test.ts` 保留 2 条预期缺失
  labelMap stderr；该文件不在白名单，未静音或改断言。
- game typecheck：PASS；当前没有生产或测试源修改；后续需补全仓 check、
  coverage ratchet/protected fast、lint-zero、docs 和 ledger 批次 receipt。

## 裁决

没有发现可在本批直接修复的产品缺陷或弱测试；两个实现文件与五个测试文件登记为
`review`，不标 `已验证`。E-4/E-5 仍需独立删除/公共出口准入证据。
```
<!-- incremental-original-source:end -->
