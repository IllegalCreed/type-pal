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

## 2026-11-25 留审收口后的引用

基点为 #77 合并提交 `cd6cd4ddb48d1e51b5726faa25284d6d69fa4bbb`，当前源码候选为 `d7e786615e5a93acda9e7368b877ab15ec976fe8`。已核战斗宿主、会话 Owner 与 Q2 报告的八处现行坐标。旧执行、截图、报告正文和业务主张各自保留原候选。

| 路径 | 原行 | 当前行 |
|---|---|---|
| `packages/reforge/src/battle/battle-host.test.ts` | 14-37 | 14-37 |
| `packages/reforge/src/battle/battle-session.ts` | 252-254 | 251-253 |
| `packages/reforge/src/battle/battle-session.ts` | 427-439 | 426-438 |
| `packages/reforge/src/battle/battle-session.ts` | 1313-1322 | 1312-1321 |
| `packages/reforge/src/battle/battle-turn-readiness.test.ts` | 37-60 | 36-58 |
| `packages/reforge/src/battle/battle-command-selection.test.ts` | 72-95 | 73-96 |
| `scripts/e2e/battle-reforge-instrumentation.mjs` | 18 | 18 |
| `packages/reforge/src/battle/battle-core.ts` | 2533 | 2509 |

其中七处片段逐字节相同。快照专测改用真实建态和可变毒槽，动作、毒游标的判据逐项保留。源码对照、原生用例与实际候选摘要见[留审关闭执行归档](QUALITY-REFORGE-BATTLE-CLOSEOUT-1.tar.gz)的 `source-reference-bindings.json`。历史脚本修正记录中的旧酒神测试名仍可经原 Git 基点找回，本轮将职责迁到施法侧别及酒神两个现行套件。
