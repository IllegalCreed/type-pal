# Cursor 三包纯逻辑补测工作包

[任务卡](../../ops/tasks/TEST-CURSOR-PURE-WAVE-1-twelve-modules.md) / [当前看板](../../ops/board.md) /
[A content](a/README.md) / [B reforge](b/README.md) / [C editor](c/README.md)。
冻结源树 `19b0101c`。下表为开工前源码 hash 和一次旧 fast 报告的未命中分支臂，
只帮助选择题目；是否可达、是否已有语义测试由 Cursor 逐条读源码及旧测判定。
旧报告位于本机 `build/verification/reforge-001-3901f1d6/coverage-fast/<package>/lcov.info`；
贡献者工作树不必复制该报告。它不是本包交付后的官方覆盖率。

| ID | 目标（`packages/`下） | SHA-256 | 旧报告未命中臂 | 先读旧测试 |
|---|---|---|---:|---|
| A01 | `content/src/frame-sequence.ts` | `c4d91861ebbb6f5f8590a98e5dc64c723c3cb0f76b474d5d91e9b82cf7994842` | 30 | `frame-sequence.test.ts`、`.contracts.test.ts`、`.residual.test.ts`、`.resource-boundaries.test.ts` |
| A02 | `content/src/script-library.ts` | `aa7ba01496e0dc41bc222a5863fdf6cd558499b741c6326ab9cb1b994f47da95` | 13 | `script-library.test.ts`、`.resource-boundaries.test.ts` |
| A03 | `content/src/stamp.ts` | `272fb28dcde6a8ce99dcb7a7adb24951afd11c7b3e25bcb9b1880ffbe48ce42a` | 6 | `stamp.test.ts`、`tileset-stamp.contracts.test.ts` |
| A04 | `content/src/item.ts` | `1a2ff2c2ef96070cf1609bd26c1f2756e851c9aec525749131582f6fd696963b` | 23 | `item.test.ts`、`item.*.background.test.ts` |
| B01 | `reforge/src/dither-transition.ts` | `da5d1f2db988c8406b03831dd08805f3141e789195dd4cd561a3af750c79adde` | 36 | `dither-transition.test.ts` |
| B02 | `reforge/src/screen-fx.ts` | `21af23eb8a04f82eaa3beaa8ac1ed9540aabda83efe94e3388dec3873e400174` | 36 | `screen-fx.test.ts` |
| B03 | `reforge/src/project-map.ts` | `3e301a36bbdfe7d0ec9b53fdc32c359d692090b929dc9e7b1179de45fe973a2e` | 36 | `project-map.test.ts` 与 editor 既有地图调用方测试 |
| B04 | `reforge/src/script-chunk-store.ts` | `6baba0b3d36f2d10a43280d36baf0b8f51cf9083cf0acb215c2e8d1eb7aff17f` | 27 | `script-chunk-store.test.ts` |
| C01 | `editor/src/core/item-references.ts` | `4a1625a26c4977ef36ee115d98794e90a9e280232f3bd9dfd348b2e366231783` | 13 | `item-references.test.ts` 与 current canonical 调用方 |
| C02 | `editor/src/core/battle-data-references.ts` | `7fa87bd40f396f997bd7fdba2e073baaa5f1e924fd706483141c7226b2d451e8` | 11 | `battle-data-references.test.ts`、`.wave2.test.ts` |
| C03 | `editor/src/core/asset-diagnostics.ts` | `0518d49cf211c9a110c14bc46cd578864a3c0f3e7c6be2282f6db47c00216ae2` | 10 | `asset-diagnostics.test.ts` |
| C04 | `editor/src/core/stamp-ownership.ts` | `0d0a98e8cbdb500f3f77d4fc47e226b06515e90a5df9eba818a18a3f1dd18f71` | 11 | `stamp-ownership.test.ts`、`.background.test.ts`，及已 done Cursor 地图组 |

## 按组推进

A：`frame-sequence` 用实际 encoder→parser/index 验证字节边界，不喂随意假 deflate；
`script-library` 核稳定 scriptId/chunk 归属与正负引用；`stamp` 核尺寸/稀疏槽/往返；
`item` 优先仍未证的上下文与旁物品轴，C3/C8旧测试已证的装备交换不重做。
格式/资源字节有疑义时登记，不在测试里发明新版本兼容。

B：`dither-transition` 和 `screen-fx` 用确定性的时间、网格与小 Canvas 宿主核状态，
不以截图色差判断算法；`project-map` 使用正式空白地图构造器，核几何、边界和非目标层；
`script-chunk-store` 核 chunk 身份/读取/替换/缺席与缓存状态，不接真实磁盘工程。

C：从 `buildBlankProject` 或已有通过 `assertProjectSaveValid` 的合法 fixture 起步，再对某一引用轴
单独变体；核真实收集器输出的完整引用身份/来源和旁记录。`stamp-ownership` 使用合法 map 与
实际 placement，先去重已完成 Cursor 地图包。已退役的 legacy 路径、无现行消费者的防御分支，
按 existing/guarded/pending 分类，不为提升比例恢复旧能力。

每组有一行去重/业务断言/新测试或已有证据的账；每包两个可复现的单点负控。
三包相互独立，某组遇到未定产品政策时留局部诊断并推进其它组，最后统一交付整包给 Codex。

## Cursor 交付（作者自验，不能替代 Codex 独立复核）

候选分支 `codex/cursor-pure-wave-r1`。生产源 hash 与上表冻结值一致。不合 main，不标 done。

| 提交 | SHA | 说明 |
|---|---|---|
| A | `321e06b5136a2518ab13feba092b65a11ccb4fc4` | 保留位 [5]/[7]、getScriptBody fallback；A03/A04 无负控名额 |
| B | `7ba813296aa361605bfd6708d4dcf211670aaa67` | 隐藏层 tilesInView、二次 cache hit；B01/B02 existing-proof |
| C | `42d1f0349626ae1eca73f66043a186cf87100442` | loop hasItem、trial-sword grantSkill；C03/C04 existing-proof |
| 文档索引 | 本提交 | `a/b/c` README 导航；`check:docs` PASS 0 issues |

六针反控均 `redExit=1`、`AssertionError`、`hit`、源 hash 未变。证据目录：

- A：`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/cursor-pure-wave-mutants-m0ZR62`
- B03：`…/cursor-pure-wave-mutants-EJgROl`；B04：`…/cursor-pure-wave-mutants-fqabkd`
- C01：`…/cursor-pure-wave-mutants-07Ys6o`；C02：`…/cursor-pure-wave-mutants-hEePU7`

整包命令（本机隔离工作树，`node_modules` 为指向主仓的 symlink）：

- content 全测：102 files / 1182 tests，exit 0
- reforge 全测：192 files / 1747 tests 通过；`scripts/battle-trial-host.test.ts` 因 Vite `Denied ID` 解析到主仓 `type-pal/packages/reforge/src/engine-chrome/assets/...` 套件失败（非本包新增）
- editor 全测：277 files / 2254 tests 通过；84 个 UI 套件同 Vite `Denied ID`；`tests/world-sprite-behavior.pal.test.ts` 2 条因工作树缺 `projects/pal` ENOENT
- `check:docs`：补导航后应 exit 0；初跑 6 条为 `a/b/c` 缺 README / 未进父导航
