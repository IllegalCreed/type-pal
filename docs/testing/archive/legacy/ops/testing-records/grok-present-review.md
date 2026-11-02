# TEST-GROK-PRESENT-1 — Codex 独立候选复核

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GROK-PRESENT-1 的三轮独立复核（首轮 bd6fad55 counter C1-C3→r2 5cb98087 counter 仅 C1a→r3 `503a2d24` **accept（仅隔离候选材料）**，2026-09-25；正式接入与统一覆盖率见 grok-present-integration.md——集成后 5fc04913/ec2bf0f7 已推送）。

## Scope

- r3 残项闭合：diff 5cb98087..503a2d24 只含 README 与 P01/P02/P04/P05/P07 五个候选测试；P05 各 draw 与前后 cloneInputs 使用同一具名 items；本席把 r2 同型见证放真实 makeGs→createInventoryMenu→confirmInventoryItem→openMenu→drawMenuStack 链（draw 实传数组 find 加 call-through 钩追加合法 Item），输出 {"sameSnapshot":false,"actualItemsLength":2} exit0（r2 同场景 sameSnapshot:true）；候选 JSON 25/25、23 项真实 draw+2 项快照 helper 分栏正确、tsc/Biome/文档/diff exit0、三针仍原树绿业务红源 SHA 不变。

## Execution and assertions

- **首轮 C1**：cloneInputs 不覆盖实际输入：fixtures/world.ts:120-145 只记录 frames/icons 的 indices/opaque 不记录 width/height、接口无 spells/magics/portraitIcons/equipBg/statusBg/objectPoisons/levelUpExp；独立运行原 helper 改 frames[0].width=99 与 spells[0]._name 后快照 JSON 仍完全相等（snapshotEqualAfterTwoInputMutations:true）——判据确实漏检；P09 匿名位图直接传入不比对实际 indices、P08 三种 screen 与 UI 帧未做保真
- **首轮 C2**：对照绘制之后才取快照（p05:50/:56、p07:71/:74）：首轮 draw 原地改写输入而第二轮只读时深比仍绿；每次 draw 前拍真实实参紧接 draw 后比较；不把合法 openMenu/confirm/playerStatusNext 状态机改变算作绘制污染
- **首轮 C3**：P06 MP fixture 非产品调用链状态（roles.roles[4].mp=10 与 gs.PlayerRolesRuntime.rgwMP[4]=8 不一致；正式入口 menu-driver:167-168,485-489 先把 runtime 投影到角色）；候选判断 10 MP 菜单画 8 MP 数字；费用 4/30 在两预算下恰好同向无法发现陈旧预算；改用 runtime 一致输入或现行投影+区分 8 与 10 的边界费用正反对照
- **r2 C1a**：部分快照仍不是传给 draw 的同一个 catalog 数组（p05:59-66/[item] 与实际 drawMenuStack 新建数组各一份、p02 同）；本席隔离见证：实传数组 find 加钩追加合法 Item，输出 sameSnapshot:true/actualItemsLength:2/checkedItemsLength:1——真实绘制消费已变实参候仍绿，违反「绘制前取实际数据独立快照绘制后立即深比」；返工：catalog 数组具名一次让快照与产品调用指向同一数组对象；快照自测至少验证一次数组增删/重排可被发现；不把修改另一份等值数组当反控
- **已核不重开**：白名单相对 16fb1cbf 只有 grok-present-regressions/**（png-rgba.ts 属 P10 必需原卡遗漏本席补录不拒收）；23/23（十文件 4/3/2/2/3/3/1/1/2/2）+相邻六文件 17/17；逐读九个真实 draw 函数，字形单点/三色数字/7 对 4/图标 0x84/nibble 边界/RGBA/opaque 0 与透明孔均由真实 Framebuffer 断言无烘焙快照；mutants 三针原树绿单点业务红（7→4 数字/图标缺失/close 0→1）源 SHA 不变；反控只证明三项鉴别力不为遗漏输入快照背书；r2 已核：fixtures 补全 IndexedImage 四字段+实际 spells/magics/portrait/背景/毒/升级表；P06 改 projectRuntimeToBattleRoles 费用 8 与 9 在 8 MP 边界区分（旧静态 10 MP 会放行 9）

## Results

- accept 不等于正式接入/产品修复/浏览器视觉/官方覆盖率；任务仍 draft 不合 main 不标 done（后续集成另文）；Grok 只是候选测试贡献者；无下一位提示词。

## Evidence

- 证据路径：本复核正文（quote 保全）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 三轮复核 | 2026-09-25 | C1-C3→C1a→闭合 | r3 accept（隔离候选） | 首轮 counter |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy ops/testing-records 的 Grok present 三轮复核回执；固定来源与 source SHA 见下方保全节。

## 原始结论

三轮递进：cloneInputs 漏检（宽高/法术/毒/升级表缺）→快照时机（绘制后才拍）→P06 MP 投影链→实参数组身份；r3 同一具名数组+call-through 见证闭合 accept。

## 当时证据

三轮反证与已核清单在 quote 保全。

## 当前有效性

historical。复核按候选时点；正式接入见 integration 回执。

## 继任文档

当前结论归 grok-present-integration 与官方覆盖账。

## 原文保全

固定源 revision `e0ddc80b28ab45394aa560855d51de65ecd568e1`，source SHA `189d0800d8527652840d929e2e6d3ec251ca95b68cb26749be7a6e683cf2013c`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GROK-PRESENT-1 — Codex 独立候选复核
>
> > 本报告记录隔离候选的历史接收；正式接入与统一覆盖率结果见[集成记录](grok-present-integration.md)。下文“未合main/未计官方覆盖率”均指各候选审查时点，不覆盖后来Codex选择性接入的结果。
>
> ## 当前结论：r3 accept（仅隔离候选材料）
>
> 2026-09-25，Grok 返工 `503a2d24f162e9de7fb9e0a57c3f5a1243219adb`（对比 r2 `5cb98087`）。本轮唯一残项 C1a 已闭合；**无剩余阻断 counter**。该 accept 不等于正式测试接入、产品修复、浏览器视觉验收或官方覆盖率增长；任务仍为 `draft`，不合 main、不标 done，正式移入 package 测试及统一质量门由 Codex 另行决定。
>
> - `git diff 5cb98087..503a2d24 --name-status` 只含 `README.md` 和 P01/P02/P04/P05/P07 五个候选测试；实际源码、旧测试、资产、锁文件、脚本和官方覆盖率基线相对 `1763ac58` 零 diff。候选远端 tip 与本地完整 SHA 相等，工作树干净。
> - P05 物品、装备、空目录的各 draw 都与前后 `cloneInputs` 使用同一具名 `items`；P01/P02/P04卖列表/P07 的同型调用逐项抽核同样成立，P03/买列表原本已共用。`P05 同一items数组增删或重排会使输入快照失败` 对同一数组 push/reverse/pop 三次均明确不等；不拿另一份等值数组充数。
> - 本席把 r2 同型见证重新放在真实 `makeGs→createInventoryMenu→confirmInventoryItem→openMenu→drawMenuStack` 链：在 draw 对**实传数组**的 `find` 作 call-through 钩，仅在本次调用中追加一个合法 Item，恢复方法后快照输出 `{"sameSnapshot":false,"actualItemsLength":2}`，exit0；r2 同场景结果为 `sameSnapshot:true`。候选产品/测试文件未作磁盘变异。
> - 独立复跑候选 JSON **25/25**、0 failed/pending；按运行标题为 **23 项真实 draw + 2 项快照 helper 自测**，回执正确分栏。候选 tsc、17 文件 Biome、文档检查、diff 检查均 exit0；P02/P05/P10 三针仍是原树绿、指定业务 `AssertionError` 红且三份生产源 SHA 前后相同。r2 的相邻六文件21/21证据保持，本轮未改其目标源码/旧测试，按用户要求不重开像素/P06/首次绘制项目。
>
> 结论已写入本人的审查席位与看板，Grok 仍只是候选测试贡献者，不当作自己成果的独立第三方。下次若 Codex 决定正式集成，须另核 official testSelection/完整 check/ratchet/受保护 fast 和入库路径；本次不预签这些结果。无下一位 Grok/Kimi/GLM 提示词，等待 Codex 正式接入排期。
>
> ## r2 结论与反证（历史，C1a 已闭）
>
> ### 当轮结论：r2 counter，仅余 C1a 实参数组身份
>
> 2026-09-25 返工候选 `5cb98087ed441396aabc7f5fc1a1d0132d75d576`（对比首包登记 `e180cb56`）。本席按当前“贡献者执行、Codex 独立验收”模式复核；Grok 自验不算独立结论。C2、C3 与 C1 的位图宽高/法术/背景/毒/升级表遗漏均已闭合；像素坐标、旧例去重、P02/P05/P10 三针不重开。**只剩 C1a，暂不正式接入或记官方覆盖率。**
>
> ### C1a — 部分快照仍不是传给 draw 的同一个 catalog 数组
>
> `tests/p05-menu-stack.test.ts:59-66` 的 `forwardedInputs.items` 是 `[item]`，实际 `drawMenuStack` 传入的是另一个新建的 `[item]`；同文件 `:94-109` 的 `[sword]`、`:135-152` 的两份 `[]` 也如此。`tests/p02-inventory-target.test.ts:59-70,111-126` 同样在快照与真实 `drawInventoryMenu` 调用各新建一次 `[item]`。其它 P01/P04/P07 的内联数组按同一标准抽核。两数组共享 Item 对象不等于共享容器；绘制器若改变真实 catalog 的成员/顺序，当前 `cloneInputs` 会比较另一个未改数组并误报只读。
>
> 本席用候选的真实 `makeGs/createInventoryMenu/confirmInventoryItem/openMenu/drawMenuStack` 链和同一 `cloneInputs` 作隔离见证：给**实际传入**的数组的 `find` 加 call-through 钩，绘制调用期间只向该数组追加一个合法 Item，不改生产源码或候选文件；输出 `{"sameSnapshot":true,"actualItemsLength":2,"checkedItemsLength":1}`，exit 0。即使真实绘制消费了已变的实参，候选判据仍绿。该差异直接违反任务卡“绘制前取**实际** gs/menu/catalog/bitmap 数据独立快照，绘制后立即深比”的验收句。
>
> 返工只需将每个受影响 draw 的 catalog 数组具名一次，让快照与产品调用指向**同一数组对象**；需要区分调用前后的业务状态时每次重新取快照。保留现有像素断言和 typed fixture。新增的快照自测应至少验证一次数组增删/重排可被同一实参快照发现；不要把修改另一份等值数组当作反控。回执把 24 项中的 P06 快照 helper 自测与 23 项真实生产 draw 用例分栏，避免将纯测试工具自测称为新增业务覆盖。无需改产品、旧测试、三针负控或官方配置。
>
> ### r2 本席已核通过（不重开）
>
> - 返工 diff 仅 `docs/testing/archive/legacy/batches/grok-present-regressions/**` 11 文件；相对 `1763ac58` 的产品、脚本、锁文件和官方覆盖资产零 diff；远端 tip 与本地 `5cb98087` 一致，候选工作树干净。
> - 候选 JSON 24/24、0 failed/pending；相邻六文件 21/21；候选 tsc、17 文件 Biome、文档检查、diff 检查均 exit 0。P02/P05/P10 隔离反控各原树绿、指定业务 `AssertionError` 红且三份生产源 SHA 不变。
> - `fixtures/world.ts` 现含 `IndexedImage.width/height/indices/opaque` 及实际 spells/magics、portrait、背景、毒、升级表、screen；P05/P07 首轮对照已改成各 draw 前后立即快照；P08 四种 screen、P09 三张背景均持有同一具名对象。P06 用 `projectRuntimeToBattleRoles`，费用 8 与 9 在 runtime 8 MP 边界区分，旧静态 10 MP 对照会放行 9，正式投影会禁用。
>
> 以下首轮记录保留作历史；C1/C2/C3 只按本节当前残项解释，不再整体阻断。
>
> ## 首轮结论与反证（历史，除 C1a 外已闭）
>
> 2026-09-25；候选 `bd6fad55242285bbeb800ad8da2513e6e6bbeb51`，登记 tip `e180cb56a60750fb995559507ec7d202b81c02f9`；源码冻结 `1763ac58`。本席只审隔离测试材料，不授权产品 build、正式测试接入或官方覆盖率记账。
>
> ### 首轮结论：counter（候选未接入）
>
> 像素合同和去重方向总体成立，三针反控也都是真实业务红；但“输入只读”断言有确定盲区，P06 的施法者 MP fixture 还绕开了实际菜单投影链。卡面明确要求可达状态及每次绘制前后对实际输入取深快照；23 项全绿不能替代这两项。没有发现可据此登记的产品缺陷，不改 Grok 候选文件，不合 main，不代他席签字，不标 done。
>
> ### C1 — `cloneInputs` 不覆盖实际输入，多个“只读”证明不成立
>
> - `docs/testing/archive/legacy/batches/grok-present-regressions/fixtures/world.ts:120-145` 只记录 `frames/icons` 的 `indices/opaque`，不记录真实 `IndexedImage.width/height`；接口也没有 `spells/magics`、`portraitIcons`、`equipBg/statusBg`、`objectPoisons`、`levelUpExp`。这些正是 `p05-menu-stack.test.ts:95-101,133-140`、`p06-magic.test.ts:147-159`、`p07-status.test.ts:59-76` 交给绘制器的可变实参。
> - 独立运行原 helper 后，将 `frames[0].width` 改成 99、`spells[0]._name` 改成“错”，前后 `cloneInputs(...)` 的 JSON 仍完全相等（命令 `node --import tsx --input-type=module -e ...`，exit 0；输出 `snapshotEqualAfterTwoInputMutations:true`）。这不是抽象上的担心，而是当前判据确实漏检实际输入变化。
> - `p09-background.test.ts:25-42,58-66,76-87` 把匿名位图直接传入，不保留或比对实际 `indices`；P08 除 level-up data 外的三种 screen 以及 UI 帧同样未做绘制前后保真。依卡面 `测试质量与首次小样` 第 4 项，需为实际传入对象建立独立快照，绘制后立即比同一对象；扩展 helper 时连尺寸及各有名 bitmap 也要覆盖。`toSpriteImages` 保持输入数组同引用的既有合同，不要求深拷贝。
>
> ### C2 — 对照绘制之后才取快照，首轮绘制污染会被当成基线
>
> - `p05-menu-stack.test.ts:50` 无 extra 绘制，`:56` 才拍 `gs/menu/frames`；同文件 `:90→:95`、`:127→:133` 重复此模式。
> - `p07-status.test.ts:71` 首次无背景绘制，`:74` 才取快照。若首轮 draw 原地改写输入，而第二轮只是读取，当前深比仍会绿。应在每次 draw 之前拍其真实实参，并紧接每次 draw 后比较；不要把合法 `openMenu/confirm/playerStatusNext` 状态机改变算作绘制污染。
>
> ### C3 — P06 的 MP 判定 fixture 不是产品调用链状态
>
> `p06-magic.test.ts:133-143` 令 `roles.roles[4].mp=10`、`gs.PlayerRolesRuntime.rgwMP[4]=8`，随后直接用旧 `roles` 调 `createInGameMagicMenu/confirmCaster`。但正式入口 `menu-driver.ts:167-168,485-489` 先把 runtime 投影到角色；渲染入口 `present.ts:690-694` 也这样做。`in-game-magic-menu.ts:119-123` 用传入角色的 `mp` 决定法术 `disabled`，故候选判断的是 10 MP 的菜单、画的是 8 MP 数字。费用 4/30 在 8 与 10 两种预算下恰好同向，无法发现陈旧预算。请使菜单输入与 runtime 一致或复用现行投影，并用区分 8 与 10 的边界费用作正反对照；保留“现行 MP 像素为 8”的断言。
>
> ## 已核通过的部分（返工不重开）
>
> - 白名单相对 `16fb1cbf` 只有 `docs/testing/archive/legacy/batches/grok-present-regressions/**`；相对源码冻结 `1763ac58` 的 `packages/game`、`packages/shared`、`scripts`、锁文件与官方 coverage 均无 diff。补充 PNG fixture `fixtures/png-rgba.ts` 属 P10 必需的真实 PNG 输入；原卡遗漏该文件名，本席已补录白名单，不以此拒收。
> - 候选 JSON 实测 **23/23**（十文件各 4/3/2/2/3/3/1/1/2/2），0 failed/0 pending；相邻六个既有 present/assets 测试文件 **17/17**；候选 `tsc --noEmit`、17 文件 Biome 均 exit 0。此轮未跑全仓或官方 coverage，故不报覆盖率增量。
> - 逐读真实 `drawInventoryMenu/drawEquipMenu/drawShopMenu/drawMenuStack/drawInGameMagicMenu/drawPlayerStatus/drawBattleSettlement/drawBattleBg/decodePngToIndices`。字形单点和三色数字各自可辨，P02 的 7 对 4、P05 的图标 `0x84`、P09 的 nibble 边界/RGBA、P10 的 opaque 0 与透明孔均由真实 Framebuffer 输出断言；没有从生产输出烘焙快照。与已有 `draw-menu/draw-magic/draw-player-status/draw-battle-bg/png/present-battle` 测试的具体差异基本如回执所述，未发现整案换名复制。
> - `mutants.mjs` 复跑 exit 0：P02/P05/P10 各有原树绿对照，单点候选各 exit 1 且指定 `AssertionError`（7→4 数字、图标缺失、close 0→1）；三份生产源 SHA 与回执相同、复跑前后不变。反控只证明这三项鉴别力，不为遗漏的输入快照背书。
>
> 返工范围只限 C1–C3 和回执同步；已核的像素坐标、旧测试去重、三针及产品冻结不需重做。下一次接收仍由 Codex 独立核对，不自动并入正式测试。无下一位 Kimi/GLM 提示词；若需 Grok 返工，仅在其隔离候选分支修改测试与回执，不修改产品或官方基线。
>
<!-- original-source-quote:end -->
