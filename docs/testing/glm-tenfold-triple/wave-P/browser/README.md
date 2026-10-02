# Wave P browser 目录索引（F01–F20 浏览器流程证据）

- 逐流程记录：[flows.json](flows.json)（id/name/result/phaseEvidence/console）。
- 汇总账（含截图 SHA256 全表与 18/20 完整证明口径）：[browser-evidence.json](browser-evidence.json)。
- 自有 lab 工程复现配方（不在仓库树内）：[lab-project.md](lab-project.md)。
- 截图：`f<NN>-*.png`，66 张；SHA256 以 browser-evidence.json 的 `screenshotSha256` 为准。

## 流程 → 截图对照

| 流程 | before | after |
|---|---|---|
| F01 | f01-before.png | f01-after.png |
| F02 | f02-before.png | f02-after-created.png, f02-after-undo.png |
| F03 | f03-before.png | f03-after-created.png, f03-after-undo.png |
| F04 | f04-before.png | f04-after-blank.png, f04-after-rename.png, f04-after-undo.png |
| F05 | f05-before.png | f05-after-created.png, f05-after-undo.png |
| F06 | f06-before.png | f06-after-paint.png, f06-after-undo.png |
| F07 | f07-before.png | f07-after.png |
| F08 | f08-before.png | f08-after-add.png, f08-after-undo.png, f08-after-lock.png |
| F09 | f09-before.png | f09-after-search.png, f09-after-clear.png, f09-after-blank-name.png, f09-after-invalid-tileid.png, f09-after-fix-tileid.png |
| F10 | f10-before.png | f10-after-select.png, f10-after-esc.png |
| F11 | f11-before.png | f11-after-rename.png, f11-after-menu-undo.png, f11-after-menu-redo.png |
| F12 | f12-before.png | f12-after-rename.png, f12-after-undo.png |
| F13 | f13-before.png | f13-after-create.png, f13-after-undo.png |
| F14 | f14-before.png, f14-creating.png | f14-after-created.png, f14-after-undo.png, f14-after-redo.png, f14-after-reopen.png（r18：创建/提交/undo/redo 实证；保存重开子相位 blocked——原生目录选择器不可达；旧 attempt 截图保留） |
| F15 | f15-before.png | f15-after-create.png, f15-after-undo.png |
| F16 | f16-before.png | f16-after-select.png（面板常显，如实登记） |
| F17 | f17-before.png | —（浏览记录） |
| F18 | f18-narrow-before.png | f18-nav-open.png, f18-nav-open-retry.png, f18-overlay-detail.png（r18：产品级 blocked——375px 工具栏完全覆盖导航触发，10/10 命中测试；键盘派发宿主不可用；旧 attempt 截图保留） |
| F19 | f19-before.png | f19-after-toggle.png |
| F20 | f20-before.png | —（浏览记录） |
