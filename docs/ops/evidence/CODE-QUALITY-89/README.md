# CODE-QUALITY-89 evidence — game in-game-magic state / execution boundary

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE-QUALITY-89（game in-game-magic state/execution boundary 核验）证据目录的索引页,对应归档任务卡 docs/ops/archive/tasks/done/CODE-QUALITY-89-game-in-game-magic-contract.md（done）。本批核验四个 in-game-magic-menu 文件。证据原件即下方逐字节保全的固定main源(1023B,SHA 05e9df1b3323)。

## 来源与输入

来源为固定Git载体,非本次运行;本页正文无 markdown 链接(原0个链接,处置见作者review的linkDisposition)。真实内容:

- 生产状态实现未修改;三份状态测试的非法不完整 as unknown fixture 已改为完整 typed PlayerRole/Spell/Magic,并补齐 battle-only spell 的真实 Magic 关联以使 outside filter oracle 有判别力。
- targeted.txt: 白名单 + menu-driver/runtime projection/magic-script/draw-magic 相邻回归。
- source-callers.txt: 完整白名单、dispatcher、hydrate/project runtime、script runner、draw caller 与 SDLPal primary source 索引。
- mutation-results.json 与 mutation-raw/: 三个精确变异(single-target confirm skips target phase; target cancel no longer returns to spell phase; outside picker includes battle-only spells)均业务红,恢复后全绿且源文件哈希字节一致;本体与 raw 副本字节相同。
- gate-check.txt、gate-ratchet.txt、gate-protected-fast.txt、lint.txt: 本批质量门结果。

## 断言与业务 oracle

文档事实核对(currentExecution=false):各记录按其自身字段成立。本轮核读 mutation-results.json 确认三突变身份;账本在收口后由 3,270 / 364 / 9 / 2,897 更新为 3,270 / 368 / 9 / 2,893(四文件关闭)。脚本/MP caller、battle magic、绘制与 shared Spell 类型不在本批关闭范围。空数组/exit0不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;本轮语义整改把 fixture 类型化改造、三突变身份与账本变化写回可见正文,不重开任务、不重跑执行。不产生新执行结果。

## 限制与复核

未重跑原命令;历史结论保持原时点。各 *.txt 日志不在本轮1916候选集合内,数字按原文见证。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1023B / SHA-256 0b868b1dffadf1f7fc7f8ae7667b2eb3185b89a08213070f37b6a123e04885a0；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-89 evidence — game in-game-magic state / execution boundary

本批核验四个 `in-game-magic-menu` 文件。生产状态实现未修改；三份状态测试的非法不完整 `as unknown` fixture 已改为完整 typed `PlayerRole`/`Spell`/`Magic`，并补齐 battle-only spell 的真实 Magic 关联以使 outside filter oracle 有判别力。

- `targeted.txt`：白名单 + menu-driver/runtime projection/magic-script/draw-magic 相邻回归。
- `source-callers.txt`：完整白名单、dispatcher、hydrate/project runtime、script runner、draw caller 与 SDLPal primary source 索引。
- `mutation-results.json` 与 `mutation-raw/`：3 个精确变异均业务红，恢复后全绿且源文件哈希字节一致。
- `gate-check.txt`、`gate-ratchet.txt`、`gate-protected-fast.txt`、`lint.txt`：本批质量门结果。

账本在收口后由 3,270 / 364 / 9 / 2,897 更新为 3,270 / 368 / 9 / 2,893；脚本/MP caller、battle magic、绘制与 shared Spell 类型不在本批关闭范围。
```
<!-- incremental-original-source:end -->
