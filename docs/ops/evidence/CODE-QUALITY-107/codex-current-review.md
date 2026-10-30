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
