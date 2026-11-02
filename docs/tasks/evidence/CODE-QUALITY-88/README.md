# CODE-QUALITY-88 evidence — game magic-select state / catalog

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE-QUALITY-88（game magic-select state/catalog 核验）证据目录的索引页,对应归档任务卡 docs/ops/archive/tasks/done/CODE-QUALITY-88-game-magic-select-contract.md（done）。本批核验并关闭四个法术选择文件: magic-select.ts、magic-select.boundaries.test.ts、magic-select.glm-phase1-leaves.test.ts 与组合文件 __tests__/item-magic-select.test.ts 的 MagicSelectionMenu 合同。生产建表逻辑未修改;测试夹具改为完整 typed 输入,并使用生产 SDLPal object id 295/296…。证据原件即下方逐字节保全的固定main源(1246B,SHA 4e2f5fd0db1c)。

## 来源与输入

来源为固定Git载体,非本次运行;本页正文无 markdown 链接(原0个链接,处置见作者review的linkDisposition)。真实内容:

- targeted.txt: 白名单 + in-game-magic caller + battle builder/input + draw-magic 相邻测试,10 files / 261 tests 通过。
- source-callers.txt: 四个白名单完整读取,真实大世界/战斗 caller、shared 类型、extractor/player-role parser 与 SDLPal primary source 索引。
- mutation-results.json 与 mutation-raw/: 三个精确变异(reverse object-id sort; disable exact-MP spell; resolve spell by magicNumber instead of object id)均 exit 1 且业务 AssertionError,恢复后 exit 0、源文件字节哈希一致、无 runtime error;本体与 raw 副本字节相同。
- gate-check.txt(全仓 pnpm check)、gate-ratchet.txt(官方 coverage ratchet)、gate-protected-fast.txt(pnpm check:fast)、lint.txt(lint-zero)。

## 断言与业务 oracle

文档事实核对(currentExecution=false):各记录按其自身字段成立。本轮核读 mutation-results.json 确认三突变身份与红绿计数;账本由 3,270 files / 360 closed / 9 review / 2,901 pending 更新为 3,270 / 364 / 9 / 2,897(四文件关闭)。shared tables.ts 仍有旧 Spell.id 注释风险,本批只记录不修改公共类型。空数组/exit0不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;本轮语义整改把关闭范围、三突变身份与账本变化写回可见正文,不重开任务、不重跑执行。不产生新执行结果。

## 限制与复核

未重跑原命令;历史结论保持原时点。各 *.txt 日志不在本轮1916候选集合内,数字按原文见证。shared Spell 类型风险保持未解决。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1246B / SHA-256 7a64f140249e652ef304ccc8ee5997f2eb0b2896bd5b4993fc45adfc64dd690c；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-88 evidence — game magic-select state / catalog

本批核验并关闭四个法术选择文件：`magic-select.ts`、`magic-select.boundaries.test.ts`、`magic-select.glm-phase1-leaves.test.ts` 与组合文件 `__tests__/item-magic-select.test.ts` 的 MagicSelectionMenu 合同。生产建表逻辑未修改；测试夹具改为完整 typed 输入，并使用生产 SDLPal object id 295/296…。

- `targeted.txt`：白名单 + in-game-magic caller + battle builder/input + draw-magic 相邻测试，10 files / 261 tests 通过。
- `source-callers.txt`：四个白名单完整读取，真实大世界/战斗 caller、shared 类型、extractor/player-role parser 与 SDLPal primary source 索引。
- `mutation-results.json` 与 `mutation-raw/`：3 个精确变异均 exit 1 且业务 AssertionError，恢复后 exit 0、源文件字节哈希一致、无 runtime error。
- `gate-check.txt`：全仓 `pnpm check`；`gate-ratchet.txt`：官方 coverage ratchet；`gate-protected-fast.txt`：`pnpm check:fast`；`lint.txt`：lint-zero。

账本由 3,270 files / 360 closed / 9 review / 2,901 pending 更新为 3,270 / 364 / 9 / 2,897。shared `tables.ts` 仍有旧 Spell.id 注释风险，本批只记录不修改公共类型。
```
<!-- incremental-original-source:end -->
