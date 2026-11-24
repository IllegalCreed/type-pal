# Reforge 战斗治理后的 Q2 源码引用

Status: recorded
Owner: Codex
Last reviewed: 2026-11-24
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

在同一治理分支比较基点 `3f1f672ab878521fa58a443a72781adc9602c187` 与源码候选 `9ea79951b60b67f9949c568b2d807f0655403dab`。核对 [Q2 报告](../../testing/domains/cross-phase/battle-foundation/report.md) 的四个现行源码引用和对应目录、机器回执。

## 来源与输入

| 源码 | 旧行 → 新行 | 旧 SHA-256 | 新 SHA-256 |
|---|---|---|---|
| `packages/reforge/src/battle/battle-command-selection.ts` | 59 → 59 | `3f09578da534395781360d9de73a6b0fb4c30e8d417695c5c7ce715aa7f350d9` | `c2663b97aed6480b87bfb42e910c0c9867418692ee254ab58f8dbbeb6cf73e5e` |
| `packages/reforge/src/battle/settlement.ts` | 322 → 311 | `a8cabfe0f8c62dbffcae25f379b9e5a7bb621c6bc8106c417ca8fa1018bd9be5` | `a144efcfb83be1f5b91a516e3bdb986dcf4599bf2a00866ed49a0682e4289575` |
| `packages/reforge/src/battle/battle-core.ts` | 2528 → 2533 | `6fca1c43f9159eee6357b6f4efb985878b322c473423c86346b0090b99d79d13` | `1b1e823d68a66b8a3233d924a2f8727bc29e62013174cc5db451d8a43151fc1d` |
| `scripts/e2e/battle-reforge-instrumentation.mjs` | 18 → 18 | `a27b2d225e393e7b64f3f39d08ad3502810d1db353b7822f0b1f5242205d8254` | `686a3a62db9685c835847190c04f7347002cab0b194713bd50d46a5a4bedb62f` |

## 断言与业务 oracle

使用 Git 取两份整文件并核对 SHA-256。选中两侧声明行后逐字节比较。类 `BattleCommandSelection`、习得页绘制函数 `drawLearnMagic` 、扫全函数 `performAttackAll` 及取证脚本音效入口 `observeSfx` 的四个声明行一致。取证脚本的目标取消分支适配了独立敌我方法，原音效入口片段一致。

## 结果

三个载体用上述现行坐标和摘要，并追加持久来源履历。旧的 execution、样本、主张、版本和候选身份仍指各自原记录。

## 限制与复核

本回执证明四处声明行的引用适用性。战斗行为及取证工具变更的失败、修复与定向验证从[治理卡](../cards/QUALITY-REFORGE-BATTLE-1.md)进入。用 `node scripts/docs/check-testing.mjs` 核现行引用，用 `node scripts/docs/check-document-model.mjs` 核相同片段与保留的历史。
