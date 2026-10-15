# 逐文件代码治理账本

基点：`b9ba7e0faadf56519da024c0343f5b44b9a5c447`。机器全量清单由
[`code-quality-inventory.mjs`](../../../scripts/quality/code-quality-inventory.mjs) 生成；本账本只登记已经由
Codex 直接读过源码、生产 caller/合同和验证证据的文件，不把“所在包全绿”推成文件已审。

起始基点机器清单：2,962。当前 tracked 清单（最新主线与统一3y候选）：3,289。
当前已闭合核验：206；已读但待审：230；尚未逐文件核验：2,853；合计未闭合：3,083。
`待核` 不等于“没有问题”，也不等于允许跳过；只有补齐职责、调用方、风险判断、证据和验证后才可改为 `已验证`、`保留`、`blocked` 或 `rework`。

2026-10-07存档测试有限集成新增`current-codec.contracts.test.ts`，仅同步tracked机器清单及待核数；本专项已审/待审状态不变。测试合同验收见[存档三审](../evidence/TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1/codex-review-r3.md)，不以测试通过替代本专项逐文件语义审核。

2026-10-11 合入 E2E-CONTINUOUS-001-006 后，实际 inventory 比原清单净增 166 项，计入待核，
不因此增加本专项已闭合数量。PAL 引用测试已核保留独立 collector/index blocker parity，当前
内容 census 与真实 loader 回归通过；coverage 配置仅移除已删除 `pal-project.test.ts` 的排除项，
其历史质量证据不重写。主线验收与本专项全仓逐文件审核仍分开记录。

2026-10-11 CI 干净 checkout 修复新增一份原始记录测试夹具，仅同步库存与待核数；
测试断言及原始 SSS 字节核验不自动计为本专项逐文件审核完成。

2026-10-11 三个 GLM 有限测试包新增三个测试文件，库存增加三项并计入待核；
本次合同验收不自动增加本专项逐文件治理闭合数量。

2026-10-12 编辑器初始状态方案新增两个实现文件、两个测试文件和一份合法场景夹具，
实际 inventory 增加五项并计入待核；功能验收与本专项逐文件治理分开记录。

2026-10-13 CODE53候选复核：毒键语义与0x61额外机制边界使两个已有实现恢复review；没有新增关闭。状态页、battle-system、inspect、dev-panel仍pending，待整文件/生命周期证据与统一门。

2026-10-13 CODE53 ownership补证：离队角色5条合同、正式0x75清毒与装备重建共7个有效反控已记录；两份测试仍待整文件验收。CODE80只读复现dev换队生命周期并等待产品裁决；该检查点当时没有新增关闭，计数为338/10/2919。

2026-10-13 CODE80裁决与实现：用户批准战斗期间 B 面板禁止入队/离队、大世界照常编辑；dev-panel 队伍卡增加 battle disabled/mode guard，探索切队补正式 `updateAllEquipments` 重建伪毒。新增 party-lifecycle 测试与两个实现后反控；最终 check/ratchet/protected fast/lint/docs/ledger 全部通过，但没有新增关闭；dev-panel listener/observer/thumbnail 生命周期风险继续 pending。
2026-10-13 CODE81 picker 生命周期：直接 caller 核实 `setupDevPanel`/scene picker/`bootstrap.renderSceneThumbnail` 边界；新增 observer disconnect、scene generation 与 rejection placeholder 合同。真实 scene-jumps 夹具的 5 个定向反例、game typecheck、Biome、check、ratchet、protected fast、lint-zero 与 ledger 均通过；仅新增生命周期测试文件完成逐文件关闭，复合 dev-panel 生产文件与既有 GLM 测试继续待核。
2026-10-13 CODE82 DATA.MKF 诊断：独立读取 `audit-data-mkf.mjs`、shared MKF 与 extractor CLI/SDLPal chunk caller；修复机器绝对路径并补 header/offset/chunk fail-closed 校验，保留 standalone Node `.mjs` 入口。临时 checkout/cwd 反例与真实 DATA.MKF 输出等价证据通过；新增诊断测试文件与脚本进入已验证，其他 Q3/Q6 文件不受影响。
2026-10-14 CODE87 in-game/system menu state：完整读取 `in-game-menu.ts` 及三份测试，核对 `menu-driver.ts:457-620`、`game-state.ts`、`draw-menu.ts`、P05/menu-driver/draw-menu caller，并对照 SDLPal `uigame.c`/`ui.c`；未发现直接缺陷。补强确认重置、WORD id mapping、词表隔离和开关初始化测试 oracle；7 个定向测试文件共 74 tests、全仓 `pnpm check`、official ratchet、protected fast、lint-zero、docs/content-review、ledger 全部通过。只关闭上述四条记录，当前 inventory 3,270：closed 360、review 9、pending 2,901。相邻 save/load/audio/quit 与 CODE53/57/79/80/81 保持原状态。
2026-10-14 CODE88 magic-select state/catalog：完整读取 `magic-select.ts` 与三份测试（组合文件含 ItemSelect/MagicSelectionMenu），核对 `in-game-magic-menu.ts`、battle-system magic builder/input、draw-magic/draw-battle-ui、primitives、shared types、extractor/player-role parser callers，并对照 SDLPal `magicmenu.c`/`uigame.c`。object-id 排序、Spell→Magic 成本连接、MP 等值/不足、缺失关联、空槽、名称回退、disabled cursor 与输入隔离均有直接 oracle；未发现生产实现直接缺陷。修正测试中的非法最小 fixture 与旧局部 id 断言，3 针隔离反控均业务红→恢复绿且源哈希一致；定向/相邻 10 files / 261 tests、game typecheck/Biome、全仓 `pnpm check`、official ratchet、protected fast、lint-zero、docs/content-review、ledger 全部通过，ratchet 基线未变。只关闭上述四条记录，当前 inventory 3,270：closed 364、review 9、pending 2,897。shared `tables.ts` 旧 Spell.id 注释与 parser 真值不一致，保留 pending，未修改公共类型；in-game-magic/battle/present 生产文件仍按整文件范围待后续治理。
2026-10-14 CODE89 in-game-magic state/execution boundary：完整读取 `in-game-magic-menu.ts` 与三份测试，核对 `menu-driver.ts:190-205,856-950`、runtime hydrate/project、`magic-script.ts:225-251`、draw-magic caller 与 SDLPal `uigame.c`/`magicmenu.c`。施法人 phase、单人快速道、非顺序 party role id、法术/目标确认、取消、光标记忆、MP refresh、battle-only outside filter 与脚本/MP ownership均有直接 oracle；未发现生产实现直接缺陷。清理三份测试的不完整 `as unknown` fixture，并补齐 battle-only spell 的 Magic 关联使过滤反控可判别；3 针隔离反控均业务红→恢复绿且源哈希一致。定向/相邻 9 files / 158 tests、白名单 3 files / 37 tests、game typecheck/Biome、全仓 `pnpm check`、official ratchet、protected fast、lint-zero、docs/content-review、ledger 全部通过，ratchet 基线未变。只关闭上述四条记录，当前 inventory 3,270：closed 368、review 9、pending 2,893。script/MP caller、battle magic、draw 与 shared Spell 类型继续保持 pending，专项仍未完成。
2026-10-14 CODE91 inventory-action menu contract：完整读取 `inventory-action-menu.ts` 与两份白名单测试，核对 `menu-driver.ts:459-503,605-651`、`game-state.ts:1017,1920`、`primitives.ts:50-105`、`draw-menu.ts` caller/oracle，并对照 SDLPal `uigame.c:878-919`、`ui.h:80-81`、`play.c:244-359`。装备/使用顺序、WORD 22/23、static cursor 记忆、边界与环绕、WORD 文案源、空选择防御均有直接证据；未发现白名单直接生产缺陷，未改实现。初次等价 Down→Up 变异被识别并撤销，保留 4 个可判别业务反控；定向/相邻 5 files / 85 tests、game typecheck/Biome、全仓质量门、official ratchet、protected fast、lint-zero、docs/content-review、ledger 均通过后关闭三条记录。当前 inventory 3,270：closed 371、review 9、pending 2,890；`menu-driver`/`inventory-menu`/`equip-menu`/`draw-menu` 与 CODE53/57/79/80/81、CODE90 仍保持原状态。

2026-10-14 CODE86 equip menu state/role swap：完整读取 `equip-menu.ts` 及三份测试，核对 `menu-driver.ts:753-852`、`equip-effect.ts`、`equipment-state.ts`、`game-state.ts`、`draw-equip.ts` callers/ownership，并对照 SDLPal `itemmenu.c`、`uigame.c`、`play.c`、`script.c`；未发现白名单生产实现直接缺陷。清理测试中的 `as never`/空 party 输入并补齐完整 typed Item/PlayerRoles fixture。12 个定向测试文件共 127 tests、game typecheck/Biome、全仓 `pnpm check`、official ratchet、protected fast、lint-zero、docs/content-review、ledger 全部通过；只关闭上述四条记录，当前 inventory 3,270：closed 356、review 9、pending 2,905。相邻 dispatcher/equip-effect/inventory-state 与 CODE53/57/79/80/81 继续保持原状态。

2026-10-14 CODE85 shop menu state/transaction：完整读取 `shop-menu.ts` 与三份测试，核对 `menu-driver`、`bootstrap`、`event-system`、`game-state`、`sell-menu`、`draw-shop` callers/ownership，并对照 SDLPal `uigame.c:1615-1791`、`itemmenu.c:287-310`、`play.c:289-320`；未发现 shop 状态机直接缺陷或高风险边界。清理 dead touch import 与恒真 clone 自比，改为真实 catalog 不变性 oracle。11 个定向测试文件共 408 tests、game typecheck/Biome、全仓 `pnpm check`、official ratchet、protected fast、lint-zero、docs/content-review、ledger 全部通过；只关闭上述四条记录，当前 inventory 3,270：closed 352、review 9、pending 2,909。相邻 transaction/inventory capacity 与 CODE53/57/79/80/81 继续保持原状态。

2026-10-14 CODE84 inventory menu state/target：完整读取 `inventory-menu.ts` 及三份测试，核对 `menu-driver`、`event-system`、`draw-inventory`、`item-select`、`game-state` caller/ownership，并对照 SDLPal `itemmenu.c`、`uigame.c`、`play.c` primary source；未发现直接缺陷或高风险边界。9 个定向测试文件共 413 tests、game typecheck/Biome、全仓 `pnpm check`、official ratchet、protected fast、lint-zero、docs/content-review、ledger 全部通过；只关闭上述四条记录，当前 inventory 3,270：closed 348、review 9、pending 2,913。CODE53/57/79/80/81 与其它 Q3 core/present/shell/analytics/tools 文件仍保持原状态，下一批继续从最新 ledger 选择互斥 pending 文件。

2026-10-14 CODE83 menu mode/stack：完整读取 `menu-mode.ts`、`menu-stack.ts`、`menu-mode.test.ts`，并核对 mode/scene/menu-driver/battle/shop/present caller、GameState ownership 与 SDLPal `uigame.c`/`script.c`/`uibattle.c` 返回语义；无实现缺陷、无高风险边界或行为变更。定向 342 tests、game typecheck/Biome、全仓 `pnpm check`、official ratchet、protected fast、lint-zero、docs/content-review、ledger 全部通过；仅这 3 条记录标记已验证。

2026-10-14 CODE90 phase1 magic revive 行为切片：完整读过 `magic-script.ts`/测试并核对 SDLPal、runtime status ownership、event-opcode-player 与 menu-driver caller；先红 2 failed/29 passed 后补 `<=999` 清除，保留 `>999` 武器/装备状态。31 定向 tests、518 相邻 tests、game typecheck/Biome、full check 与 lint4022零诊断已通过；official ratchet 原命令重试完整通过并自动提升6项基线，protected fast 的 pal-extract CLI 5000ms 超时按原命令重试，最终回执待续。整文件仍有 script-chain/输入/unsupported-op/step-limit 待核，以及无断言伪用例、Spell fixture/poison table 隔离质量项，因此两文件仅改 review，不增加 closed。当前 inventory 3,270：closed371、review11、pending2,888。二阶段 grantedStatuses/status 模型未修改。

2026-10-14 酒剑仙传功修复新增 `event-rng-scene-restore.test.ts`，tracked inventory 增加一项并计入待核。
专项四合同、像素回归与反控见[修复证据](../evidence/game-rng-scene-restore-1/README.md)，不自动增加本账本治理闭合数量。

2026-10-15 第一阶段音乐音源与缓存回归新增16项tracked记录，均计入待核；功能/独立复核不自动增加本专项语义治理闭合数。精确路径见[新增机器清单](../evidence/game-rix-music-1/release-inventory-delta.json)。

2026-10-14 同步 origin/main `5116cd5bb`：合入音频静态分包、RNG scene-redraw 修复及其库存纠正，主工作树未修改。机器 inventory 3271；新增 RNG 测试计 pending，不因功能验收增加本专项 closed。event-system 的 dispatcher 已有新机制改动，旧 CODE3r 完整核验保留历史，本专项对最新整文件核验未完成，保守转 review；未更改 RNG 实现或其任务状态。当前 closed370/review12/pending2889。CODE90此前 full check/ratchet 回执保留旧基点事实；最新基点需重跑质量门，取消旧基点在跑的 fast 记录保留。

2026-10-14 CODE92 工程门命令纠错：CODE83–89、CODE91 的 pnpm check:fast 被误记为 protected fast；正确门是 TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast。30条记录暂转review，旧语义核验/实际日志/历史任务结论保留；只有真正受保护覆盖门通过并核当前源与逐文件证据一致后才可恢复关闭。本次未改变测试、规则或产品。当前机器库存3271：closed340/review42/pending2889。

2026-10-16 C10保存未完成检查点：Wizard30例仍2act，相邻80例仍8act；typecheck通过，反控/排重/统一门未完成。按用户优先级转94前全量复审，本片不新增关闭或变更逐文件状态，机器3287/223/199/2865。

2026-10-16 94前全83卡复审恢复；6a四文件全文核验发现两份测试判别力缺口，补安静导入与--out字节合同。两反控旧绿/新单例红，恢复定向11及quality-tools38绿。精确撤回ledger测试一条旧关闭、inventory测试pending→review，0新增关闭。机器重跑确认222closed/201review/2864pending，统一门待续。

2026-10-16 CODE92原件复审：历史门与同commit全仓check存在，当前30源20字节相同/10变化，30项当前已review，未恢复关闭或新增重开。本片只核工程证据，3287/222/201/2864不变；当前统一门未重跑。

2026-10-16 CODE1 RLE四文件复审：主测试catch合同已补证，54身份不变；native SDL高位literal分歧停线draft，boundary描述问题待核修。三条旧关闭精确撤回review，0新增关闭；机器已确认3287/219/204/2864。当前统一门未重跑，editor诊断未清。

2026-10-16 CODE2复审：两项测试补证、一条重复delta退役，原实现未改；15MKF/2373chunks与给定YJ2 payload的native RNG1464帧对拍通过。定向33/shared130+typecheck/相邻30/coverage-tools68；三份测试旧关闭转review，0新关闭，机器已确认3287/216/207/2864。统一check/ratchet/protected仍待续。

2026-10-16 CODE2b复审：native SDL2626段/34367608B一致；四混合YJ2合同转规范boundary、extract两smoke整合独立native字节oracle。混合测试旧关闭转review、extract测试pending→review，规范boundary保持review；0新关闭。机器3287/215closed/209review/2863pending，统一门待续。

| 文件 | 类别 | 状态 | 证据 / 验证 | 备注 |
|---|---|---|---|---|
| `packages/pal-extract/src/io/yj2.test.ts` | test | review | CODE2b当前复审；[primary/caller/oracle/反控](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/2b/README.md) | 旧长度smoke零输出变异2绿，新MGO20段native完整字节oracle1红；2→1，既有fast不含本文件；从pending登记review |
| `packages/game/src/dev/dev-panel-picker-lifecycle.test.ts` | test | review | CODE-QUALITY-81 review；真实 `setupDevPanel` caller、真实 scene-jumps 夹具、hydrated runtime、typed fake `IntersectionObserver` 与 deferred/null/rejecting thumbnail oracle；5 定向 tests、game typecheck、Biome、check、ratchet、protected fast、lint-zero、ledger | close/cache reopen、filter late result、null/无 IO/rejection 合同；HEAD 原实现 3 failed/2 passed；mutation runner 两个精确反控各 1 failed/4 passed；不替代 dev-panel.ts 整文件治理；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/shared/src/rle.ts` | product | review | CODE1当前复审；[逐文件/primary/caller/oracle证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/rle/README.md) | SDLPal高位literal与当前TS格式域存在分歧，转QUALITY-RLE-COMMAND-TRUTH-1 draft；禁止直接改算法，旧关闭撤回review |
| `packages/shared/src/rle.test.ts` | test | review | CODE1当前复审；[逐文件/primary/caller/oracle证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/rle/README.md) | 原坏帧fixture绕过catch，现有身份补证；反控旧54绿/新53绿1红，恢复shared131及相邻47；统一门待续 |
| `packages/shared/src/rle.boundaries.test.ts` | test | review | CODE1当前复审；[逐文件/primary/caller/oracle证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/rle/README.md) | 标题/注释声称header轴但实际尺寸非法、1长度正控实际2；直接证据待窄修，不把描述当已验证 |
| `packages/shared/src/rle.glm-runtime-resource.test.ts` | test | 已验证 | CODE-QUALITY-1；真实 runtime resource caller | 宽容入口合同 |
| `packages/shared/src/mkf.ts` | product | 已验证 | CODE-QUALITY-2；raw 2,373 chunks、shared 全包、全仓门 | offset table 边界 |
| `packages/shared/src/mkf.boundaries.test.ts` | test | review | CODE2当前复审；[caller/primary/oracle与有效反控](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/2/README.md) | 旧整数guard反控11绿→补证10绿1红；纠正过期注释及借用view，11例/一标题更名；统一门待续 |
| `packages/shared/src/rng.ts` | product | 已验证 | CODE-QUALITY-2；raw 1,464 frames、shared 全包、全仓门 | payload/surface 边界 |
| `packages/shared/src/rng.boundaries.test.ts` | test | review | CODE2当前复审；[caller/primary/oracle与有效反控](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/2/README.md) | 旧坏YJ2清面反控16绿→补证15绿1红；真实中间坏帧保留完整plane，16例不变；统一门待续 |
| `packages/editor/src/core/project-reference.pal.test.ts` | test | 已验证 | CODE-QUALITY-1b；collector 直接结果与历史提交证据 | 仅更新过期 oracle |
| `packages/pal-extract/src/events/annotate.ts` | product | 已验证 | CODE-QUALITY-3a + Q3f；typed annotation 与 symbols sidecar boundary、全仓 gates | Q3f done |
| `packages/pal-extract/src/events/annotate.test.ts` | test | review | CODE3/3f当前复审；[caller/完整oracle/反控与退役](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3-annotate/README.md) | 六旧绿新红；9→6，三重复转移；统一门未清，旧关闭撤回 |
| `packages/pal-extract/src/events/annotate.glm-runtime-resource.test.ts` | test | review | CODE3/3f当前复审；[合法输入/五表/输入守恒/隔离证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3-annotate/README.md) | 8→10：一重复转主合同，混合坏输入拆四原子；整文件仍待统一门 |
| `packages/pal-extract/src/events/slice.ts` | product | review | CODE3当前复审；[真实caller/控制流/反控](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3/README.md) | 人读伪边与计数goto风险停线专卡draft；原实现未改，不以roundtrip/包绿关闭 |
| `packages/pal-extract/src/events/slice.test.ts` | test | review | CODE3当前复审；[A2/reset完整oracle与反控](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3/README.md) | 两旧反控均绿，新各指定AssertionError；例数身份不变，统一门待续 |
| `packages/pal-extract/src/events/slice.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3a；切分边界反例 | 真实 caller |
| `packages/pal-extract/src/events/slice.glm-runtime-resource.test.ts` | test | 已验证 | CODE-QUALITY-3a；真实资源 slice 合同 | 不改生成物 |
| `packages/pal-extract/src/events/slice.kimi-r1.test.ts` | test | review | CODE3当前复审；[EO身份oracle/反控](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3/README.md) | 旧auto入口错为1仍绿、新精确一红；字符串扫描例不能证明正确控制流，风险专卡未解 |
| `packages/pal-extract/src/io/msg.ts` | product | 已验证 | CODE-QUALITY-3b；offset 越界/倒序 34/34，pal-extract/full check、ratchet、protected fast | Q3b done |
| `packages/pal-extract/src/io/msg.boundaries.test.ts` | test | review | [CODE3b完整输入ownership/原子拒绝/有效反控](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3b/README.md) | 两输入修改旧绿/新指定AssertionError；纠正政策未定注释，3→4独立轴；旧关闭撤回review |
| `packages/pal-extract/src/io/sss.ts` | product | 已验证 | CODE-QUALITY-3b；chunk2/3/4 对齐反例，真实 SSS，全包/check/ratchet/protected | Q3b done |
| `packages/pal-extract/src/io/sss.boundaries.test.ts` | test | review | [CODE3b父buffer/完整EO与scene/有效反控](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3b/README.md) | 原view不含guard，四反控旧绿/新指定AssertionError；4→7独立chunk拒绝，生产未改，旧关闭撤回review |
| `packages/pal-extract/src/io/msg.test.ts` | test | review | [CODE3b真实raw读取/caller与oracle核验](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3b/README.md) | 三sanity仅规模/类型/含逍遥；完整文本oracle未证，类型smoke与排重待独立精简，本片未改 |
| `packages/pal-extract/src/io/sss.test.ts` | test | review | [CODE3b真实raw读取/独立struct全量对照](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3b/README.md) | 六sanity不能证明完整字段；探针对拍不自动提升测试质量，raw例精度/排重留下一片，本片未改 |
| `packages/shared/package.json` | product | 已验证 | shared check/typecheck；仅 workspace 元数据 | 无运行时逻辑 |
| `packages/shared/tsconfig.json` | product | 已验证 | shared typecheck；编译边界 | 无产品行为 |
| `packages/shared/src/events.ts` | product | 已验证 | 直接读取 Command union；shared typecheck/events 合同 | 类型 schema，未改公共接口 |
| `packages/shared/src/input.ts` | product | 已验证 | 直接读取 AbstractKey/InputSource；input type contract | 类型 schema，未改输入语义 |
| `packages/shared/src/index.ts` | product | 已验证 | 直接读取 barrel exports；shared typecheck | 公共出口保持 |
| `packages/shared/src/pal-authored-map-names.ts` | product | 已验证 | authored fixture hash/222 entries 测试 | 缺名显式 undefined，无 fallback |
| `packages/shared/src/resources.ts` | product | 已验证 | 直接读取全部资源接口；pal-extract/game callers 与 typecheck | 纯类型合同 |
| `packages/shared/src/rle-encode.ts` | product | 已验证 | encode roundtrip、独立 byte oracle、128KB guard | 与 RLE decoder 合同一致 |
| `packages/shared/src/tables.ts` | product | 已验证 | 直接读取表类型与 pal-extract/game callers；typecheck/tables type contract | 纯类型合同 |
| `packages/shared/src/yj2.ts` | product | 已验证 | CODE-QUALITY-2b；2,626 raw chunks / 34,367,608B 逐字节一致，位流/回引边界与反控 | Q2b done |
| `packages/shared/src/__tests__/glm-foundation-fixtures.ts` | test | 已验证 | YJ2/MKF/RNG 固定向量直接被 shared tests 消费 | test-only fixture |
| `packages/shared/src/__tests__/resources-types.ts` | test | 已验证 | shared type fixtures；typecheck | test-only fixture |
| `packages/shared/src/events.test.ts` | test | 已验证 | Command union type contract | 不以数量验收 |
| `packages/shared/src/index.test.ts` | test | 已验证 | timing constants contract | 公共常量 oracle |
| `packages/shared/src/input.test.ts` | test | 已验证 | AbstractKey/InputSnapshot/InputSource contract | 类型 contract |
| `packages/shared/src/pal-map-names.test.ts` | test | 已验证 | 222 entries/hash/undefined gaps | authored fixture oracle |
| `packages/shared/src/rle-encode.boundaries.test.ts` | test | 已验证 | 126/127/128 byte oracle、pad/offset | 高判别力反控 |
| `packages/shared/src/rle-encode.glm-runtime-resource.test.ts` | test | 已验证 | 真实 runtime resource encoder contract | caller oracle |
| `packages/shared/src/rle-encode.test.ts` | test | 已验证 | encoder/decoder roundtrip、128KB guard | 合法输入合同 |
| `packages/shared/src/rle.glm-o.test.ts` | test | review | CODE2b当前复审；[primary/caller/oracle/反控](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/2b/README.md) | 四弱重复YJ2合同转规范boundary，13→9，RLE测试体不变；精确旧关闭撤回review，未知RLE轴不关闭 |
| `packages/shared/src/rng.test.ts` | test | review | CODE2当前复审；[caller/primary/oracle与有效反控](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/2/README.md) | 精确退役一条弱重复delta，7→6；保留full-plane oracle及转移反控；三父旧digest/新SHA精确登记，统一门待续 |
| `packages/shared/src/tables.test.ts` | test | 已验证 | type-only Item contract | 类型 contract |
| `packages/shared/src/yj2.boundaries.test.ts` | test | review | CODE2b当前复审；[primary/caller/oracle/反控](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/2b/README.md) | 9规范合同精确承接短头/零长尾随/重复固定值；七项变异业务红集合保持；树归约独立向量仍待证，统一门待续 |
| `packages/pal-extract/src/resources/sprite.ts` | product | 已验证 | CODE-QUALITY-3d；indexed PNG 尺寸/pixels/opaque 输入边界，callers、全包/check/ratchet/protected/lint | Q3d done |
| `packages/pal-extract/src/resources/sprite.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3d；非法尺寸/短 pixels/短 opaque 反例与 negative control | Q3d done |
| `packages/editor/src/ui/SpriteFrameWorkbench.tsx` | product | review | CODE3c当前复审；[动画切片/真实caller/边界](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3c/README.md) | 原实现未改；单branch与门不能覆盖684行整文件，picker/拖拽/其它生命周期仍待验，统一门未过 |
| `packages/editor/src/ui/SpriteFrameWorkbench.animation-boundary.test.tsx` | test | review | CODE3c当前复审；[像素/时序/三反控](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3c/README.md) | cleanup变异旧绿/新指定业务红，原1身份保留；生产未改，相邻36绿仍6act，统一门待续 |
| `packages/pal-extract/src/resources/parsers/_utils.ts` | product | 已验证 | 直接读取 layout 常量与 u16/s16 helper；所有 parser callers、typecheck | 纯布局 helper |
| `packages/pal-extract/src/resources/parsers/ball.ts` | product | 已验证 | RLE header/坏帧 skip、BALL caller 与 parser tests；全包通过 | 保留空 chunk skip |
| `packages/pal-extract/src/resources/parsers/ball.glm-runtime-resource.test.ts` | test | review | [C1真实IO/PNG/反控/精简](../evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/diagnostics-c1/README.md) | 5→4同输入弱重复；坏尺寸warn+Error/null完整核，8反控有效、局部V8不降；统一门待续 |
| `packages/pal-extract/src/resources/misc-guards.kimi-r1.test.ts` | test | review | [C1同步RGM/sprite诊断与throw清理](../evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/diagnostics-c1/README.md) | 原16身份保留；只核本片IO与异常清理，其它混合parser/重复/注释待整文件复审 |
| `packages/pal-extract/src/__tests__/parser-diagnostics.ts` | test | review | [C1真实Console/完整记录校验/同步ownership](../evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/diagnostics-c1/README.md) | 新helper只处理同步parser指定IO；stdout空/stderr全消费，finally恢复，0关闭 |
| `packages/pal-extract/src/resources/parsers/__tests__/enemy-teams.boundaries.test.ts` | test | review | [C2完整DTO/输入ownership/真实IO与反控](../evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/diagnostics-c2/README.md) | 正例补403，2→3独立未知域；七旧绿新红与raw名字/999 oracle保留转移，统一门待续 |
| `packages/pal-extract/src/resources/tables.test.ts` | test | review | [C2精确13行弱子集转移](../evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/diagnostics-c2/README.md) | 沿C1全文SHA仅删旧999弱例90→89，剩余混合table合同与重复继续待核，0关闭 |
| `packages/pal-extract/src/resources/parsers/battle-fields.ts` | product | 已验证 | 12B fixed record/signed effects guard、真实 DATA caller 与 tests | 非整除显式失败 |
| `packages/pal-extract/src/resources/parsers/data-misc.ts` | product | 已验证 | level-up/effect table contracts、现有短输入宽容测试与 real DATA caller | 宽容截断合同有直接测试，未擅改 |
| `packages/pal-extract/src/resources/parsers/__tests__/data-misc.test.ts` | test | review | [原盘caller/SDL像素与反控](../evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/README.md) | 修两原盘早退，71/85完整RGBA；表测试排重/统一门仍待，未关闭 |
| `packages/pal-extract/src/resources/parsers/__tests__/misc-mkf.test.ts` | test | review | [真实输入/固定oracle/精简/反控](../evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/README.md) | 修四早退，88/251/837及FIRE0完整RGBA；9→8，helper非CLI实际调用，统一门未清 |
| `packages/pal-extract/src/resources/parsers/__tests__/indexed-frame-digest.ts` | test | review | [唯一test-only摘要接线与caller](../evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/README.md) | 新tracked helper；每例独立SHA，PNG真解码，只产actual不产expected；0关闭 |
| `packages/pal-extract/src/resources/parsers/fire.glm-runtime-resource.test.ts` | test | review | [四合同全文/空块转移与注释counter](../evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/README.md) | 空块原合同保留0与7，另外三体/四身份不变；纠正raw多帧不可达注释，未整文件accept |
| `packages/pal-extract/src/resources/parsers/enemies.ts` | product | review | [C2当前全文/caller/类型复核](../evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/diagnostics-c2/README.md) | 注释两处EnemyTeam.slots指向不存在字段且混淆raw身份；实现未改，旧关闭撤回review，待专片修注释/完整合同 |
| `packages/pal-extract/src/resources/parsers/enemy-teams.ts` | product | 已验证 | 10B team record、slot sentinel/translation/name map tests | 0/FFFF 语义保真 |
| `packages/pal-extract/src/resources/parsers/fire.ts` | product | 已验证 | FIRE YJ2/raw fallback、empty/short group guard 与 callers/tests | 不改资源降级 |
| `packages/pal-extract/src/resources/parsers/items.ts` | product | 已验证 | OBJECT item range/truncation guard、wObjectID/MengShe split 与 tests | 稳定全局 ID |
| `packages/pal-extract/src/resources/parsers/player-roles.ts` | product | 已验证 | 900B SoA exact guard/cursor check、DATA caller/role fixtures | 不改角色 schema |
| `packages/pal-extract/src/resources/parsers/rgm.ts` | product | 已验证 | RGM header/RLE/PNG caller 与 tests | 空 chunk skip |
| `packages/pal-extract/src/resources/parsers/rng-frames.ts` | product | 已验证 | shared RNG decoder + PNG adapter caller/fixtures | 不复制 codec |
| `packages/pal-extract/src/resources/parsers/sounds.ts` | product | 已验证 | metadata pure mapping、SOUNDS caller/tests | 不解析 WAV 内容 |
| `packages/pal-extract/src/resources/parsers/spells.ts` | product | 已验证 | OBJECT magic/union fields、DATA magic callers/tests | 保持 scriptDesc offset contract |
| `packages/pal-extract/src/resources/parsers/stores.ts` | product | 已验证 | 18B STORE guard、zero sentinel/real DATA tests | 不改 store IDs |
| `packages/pal-extract/src/events/disasm.ts` | product | 已验证 | SSS raw disasm/roundtrip callers、事件全包与真实 bytecode | 未改 opcode 语义 |
| `packages/pal-extract/src/events/recompile.ts` | product | 已验证 | roundtrip inverse 与全量 bytecode digest | 结构命令 fail-loud |
| `packages/pal-extract/src/events/opcodes.ts` | product | 已验证 | opcode table 与 primary script.c、disasm/slice callers | raw fallback 保持 |
| `packages/pal-extract/src/events/roundtrip.ts` | product | 已验证 | parseSss/parseMessages/disasm/recompile 真实入口 | mismatch 报告合同 |
| `packages/pal-extract/src/font/bdf-to-json.ts` | product | 已验证 | BDF parser/glyph JSON tests 与 optional CLI caller | 非法行宽容合同已有反例 |
| `packages/pal-extract/src/io/mkf.ts` | product | 已验证 | shared MKF re-export、2,373 raw chunks、shared check | 无重复 codec |
| `packages/pal-extract/src/io/rle.ts` | product | 已验证 | shared RLE re-export、extractor callers | 无重复 codec |
| `packages/pal-extract/src/io/word.ts` | product | 已验证 | WORD raw/content pins 与宽容短输入既有合同 | 不擅改并行宽容行为 |
| `packages/pal-extract/src/io/yj2.ts` | product | 已验证 | shared YJ2 re-export、2,626 raw segments | 无重复 codec |
| `packages/pal-extract/src/resources/asset-manifest.ts` | product | 已验证 | manifest determinism/DS_Store/self exclusion tests、CLI caller | path/version pure contract |
| `packages/pal-extract/src/resources/battle-sprite.ts` | product | 已验证 | kind/id composite key、missing chunk skip、PNG callers/tests | 不混 enemy/player identity |
| `packages/pal-extract/src/resources/enemy-pos.ts` | product | 已验证 | 100B fixed table/signed layout boundary tests、CLI caller | layout transpose explicit |
| `packages/pal-extract/src/resources/map.ts` | product | 已验证 | 65536B map guard、real MAP/GOP decode、CLI caller | raw tilemap output |
| `packages/pal-extract/src/resources/palette.ts` | product | 已验证 | VGA/night color pins、short-input宽容既有合同、CLI caller | 不改变 palette mapping |
| `packages/pal-extract/src/resources/scene.ts` | product | 已验证 | scene range dump/real resource tests、CLI caller | dense scene bounds |
| `packages/pal-extract/src/resources/tables.ts` | product | 已验证 | parser barrel exports、all table callers/typecheck | 无运行时实现 |
| `packages/pal-extract/src/cli.ts` | product | 已验证 | Q3f/Q3g；全量 73-896 行 IO/清理/降级/manifest 直接审计；full check/ratchet/protected/lint | Q3g done |
| `packages/content/src/asset.ts` | product | 已验证 | 直接读取 AssetCatalog/path/origin/role closure validators 与 1490 content tests/full check | 保持 stable AssetId/path ownership |
| `packages/content/src/project-map.ts` | product | 已验证 | 直接读取 canonical version 4/map matrix/stamp placement validator 与 content tests | 不改 schema |
| `packages/content/src/scene-index.ts` | product | 已验证 | 直接读取 stable scene id/path/index validator 与 content tests | 路径 fail-closed |
| `packages/content/src/validate-runtime.ts` | product | 已验证 | 直接读取 runtime scene/hooks/entities validator 与 content tests | 旧 cast 仅校验后 DTO 投影 |
| `packages/content/src/actor-condition.ts` | product | 已验证 | 直接读取 carried-status/condition shape guards 与 content contract tests | 稳定 status/poison 引用 |
| `packages/content/src/entity-lifecycle.ts` | product | 已验证 | 直接读取 lifecycle shape/reference closure/normalization 与 content tests | 缺 map 归一空表合同 |
| `packages/content/src/map-index.ts` | product | 已验证 | 直接读取 stable map id/path/index guards 与 content tests | 路径 fail-closed |
| `packages/content/src/migration-diagnostic.ts` | product | 已验证 | 直接读取 migration sidecar schema/category/source validation 与 content tests | 仅迁移诊断，不污染运行时 schema |
| `packages/content/src/runtime-scene.ts` | product | 已验证 | 直接读取 runtime hostile/chase/victory/flee policy guards 与 content tests | explicit policy contract |
| `packages/content/src/enemy-team.ts` | product | 已验证 | 直接读取 stable enemy-team id/slot/reference validators 与 content tests | 不用数组位置当身份 |
| `packages/content/src/enemy-ai-condition-guard.ts` | product | 已验证 | 直接读取 AI condition recursive guard 与 content tests | 条件联合边界明确 |
| `packages/migrate/src/migration-transaction.ts` | product | 已验证 | 直接读取 journal v2/path/scope/precondition/atomic rename/recovery；migrate 95/723 与 transaction boundary suites | 事务写盘 ownership 已有反控 |
| `packages/migrate/src/pal-source-io.ts` | product | review | 直接读取 extracted source partitions/scene and asset callers；发现 generic JSON casts 需后续 schema/source-contract 批次 | 不改 generated source |
| `packages/migrate/src/migration-project-io.ts` | product | review | 直接读取 managed-file discovery/TOCTOU hash ownership；JSON shape validation 与 content validators 的边界留 Q4 | 不改 project output |
| `scripts/quality/lint-zero.mjs` | tool | 已验证 | whole-repository Biome JSON report/fail-closed wrapper；3198-file zero-diagnostic runs | 不接受过滤参数 |
| `scripts/quality/code-quality-inventory.mjs` | tool | 已验证 | scoped git inventory/caller propagation、quality inventory tests | machine snapshot 不冒充 verdict |
| `scripts/quality/code-quality-ledger.mjs` | tool | 已验证 | CODE-QUALITY-6a；真实 inventory/ledger uniqueness/status/count verifier、37 quality-tool tests | 只校验记录完整性，不把机器 PASS 当语义审查 verdict；fail-closed |
| `scripts/quality/code-quality-ledger.test.mjs` | test | review | 6a当前复审；CLI导入副作用反控旧9绿/新9绿1红→恢复10绿；[证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/6a/README.md) | 原测试漏护import guard；历史关闭撤回，补证后统一门仍待续 |
| `scripts/quality/code-quality-inventory.test.mjs` | test | review | 6a当前复审；真实stdout/--out字节与无关cwd合同；错误写入反控旧1绿/新1红→恢复1绿；[证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/6a/README.md) | 临时目录after清理；pending登记review，不以字段全绿宣称图或整卡完备 |
| `packages/game/src/core/battle/battle-progression.ts` | product | 已验证 | CODE-QUALITY-3x；battle.c:991-1373,1226-1328；global.c:2347-2454；settlement/battle-system callers | 306 行逐段核验主升级、隐藏经验池顺序/整数截断/99 边界、主升级 cap、HP/MP 时机、法术学习去重与 snapshot 有效值；205 定向/相邻 tests、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷 |
| `packages/game/src/core/battle/battle-progression.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3x；139 行全文、CHECK_HIDDEN_EXP/主升级边界与 205 定向/相邻 tests | wLevel>99、隐藏无999 cap、池 RNG 顺序、无主升级不回满/主升级含隐藏回满反例 |
| `packages/game/src/core/battle/__tests__/battle-levelup.test.ts` | test | 已验证 | CODE-QUALITY-3x；340 行全文、主升级/法术/投影 oracle 与 205 定向/相邻 tests | 活人 gate、阈值/余数/连升/满级、STAT_LIMIT、法术去重/level gate、runtime→battle projection 反例 |
| `scripts/docs/check.mjs` | tool | 已验证 | Markdown link/task/board/index verifier；docs check runs | fail-closed task state |
| `scripts/docs/check-testing.mjs` | tool | 已验证 | testing catalog/index/legacy flat verifier；testing docs runs | 独立测试文档门 |
| `scripts/docs/config.mjs` | tool | 已验证 | current docs versions/sections/exceptions source | 不改历史格式 |
| `scripts/coverage/metrics.mjs` | tool | 已验证 | exact integer ratio/aggregate comparison tests | 不用 pct 四舍五入 |
| `scripts/coverage/inventory.mjs` | tool | 已验证 | source/test scope diff and removal contracts | 不静默缩窄范围 |
| `scripts/coverage/environment.mjs` | tool | 已验证 | compile-cache disabled child environment contract | 保留无关环境 |
| `scripts/coverage/protected-baseline.mjs` | tool | 已验证 | protected baseline bootstrap/compare fail-closed tests | 无 baseline 不 fail-open |
| `scripts/coverage/config.mjs` | tool | 已验证 | seven-package source/test selection and fast exclusions | E2E exclusion boundaries |
| `scripts/coverage/run.mjs` | tool | 已验证 | direct read of package runner/ratchet/protected orchestration; Q3c SpriteFrame branch fixed and support-mode gates passed | Q6 runner audit slice |
| `scripts/script-governance/run.mjs` | tool | 已验证 | canonical install census CLI, output symlink guard, script-governance tests | 不写产品数据 |
| `packages/pal-extract/package.json` | product | 已验证 | package scripts/dependency boundary；pal-extract check/full gates | 无运行时逻辑 |
| `packages/pal-extract/tsconfig.json` | product | 已验证 | source/scripts include 与 typecheck | 无产品行为 |
| `packages/pal-extract/src/utils/gbk.ts` | product | 已验证 | GBK/PUA residue mapping tests与M.MSG caller | 资源正文转码合同 |
| `packages/pal-extract/scripts/grep-sdlpal-chunks.ts` | product | 已验证 | execFile 参数数组、reference-only read helper | 无写盘 |
| `packages/pal-extract/scripts/extract-videos.ts` | product | review | ffmpeg external IO/mtime skip/empty output 直接读过 | 需后续工具失败反控，不与主 extract 混写 |
| `packages/pal-extract/scripts/find-scenes-without-setpartypos.mjs` | product | review | scene/event/tilemap BFS 与写盘脚本直接读过 | 诊断生成器需后续 path/input 复核 |
| `packages/pal-extract/audit-data-mkf.mjs` | product | review | DATA.MKF diagnostic census 直接读过；发现绝对 repo path 与 shared MKF duplicate | 仅诊断脚本，Q6/CLI tool audit 待核 |
| `packages/pal-extract/src/audit-data-mkf.test.ts` | test | review | CODE-QUALITY-82；真实 Node 子进程、临时 checkout、合法/损坏 MKF 与 cwd 隔离；8 tests，修复前 8 failed，修复后 8 passed | 真实 caller/oracle；验证原输出等价与失败传播，不覆盖 extractor 生成管线；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/assets/loader.ts` | product | 已验证 | CODE-QUALITY-3h；全量读取 loadAll/fetchPalette/SceneAssetsCache，真实 bootstrap caller、asset tests、game 定向测试 | fetch/status 与可选资源降级均有 caller；cache LRU/protect 合同保留，未发现直接缺陷 |
| `packages/game/src/assets/tileset-blob.ts` | product | 已验证 | CODE-QUALITY-3h；gzip/raw blob、shared parseSpriteChunk、tileset/NPC/battle/magic callers 与 snapshot/load tests | gzip 魔数防双解压、HTTP 状态和帧 key 合同已有反例；未改资源格式 |
| `packages/game/src/assets/png.ts` | product | 已验证 | CODE-QUALITY-3h；createImageBitmap/canvas/alpha mask caller 与 PNG failure/close tests | 解码失败保留 cause，bitmap finally close；未发现直接缺陷 |
| `packages/game/src/assets/rle-decode.ts` | product | 已验证 | CODE-QUALITY-3h；shared codec re-export、dialog-assets base64 caller、identity tests | 无重复 codec；base64 非法输入继续 fail-loud |
| `packages/game/src/shell/fetch-retry.ts` | product | 已验证 | CODE-QUALITY-3h；main.ts 唯一生产安装 caller；GET/HTTP/非幂等合同、定向测试与 invalid-options negative control | 非法 retries 不再零次请求后 `throw undefined`；非法 backoff 不再交给平台钳制；有效配置行为不变 |
| `packages/game/src/shell/bootstrap-resources.ts` | product | 已验证 | CODE-QUALITY-3h；bootstrap.ts 真实 soundfont/resourcesReady caller、并发屏障和 rejection/degradation tests | soundfont 原始 rejection 与 settle barrier 分离；glyph 仅显式 tofu 降级；未发现直接缺陷 |
| `packages/game/src/shell/fetch-retry.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3h；无效配置合同、HTTP/method/backoff/最终身份反例；删除 guard 的 mutant 失败 | 高判别力输入合同，不以数量验收 |
| `packages/game/src/assets/dialog-assets.ts` | product | 已验证 | CODE-QUALITY-3i；portrait/icon manifest callers、PNG/RLE adapters、dialog-assets/host tests 与 game typecheck | 资产缺失按现行空 map 降级；不伪造 manifest 帧，不改资源格式 |
| `packages/game/src/shell/precache-client.ts` | product | 已验证 | CODE-QUALITY-3i；main/bootstrap SW caller、ready/start/pause/resume/unavailable tests | onPlayable 前不启动 precache，ready race 仅缓冲 start；现行 SW 协议保留 |
| `packages/game/src/shell/precache-ui.ts` | product | 已验证 | CODE-QUALITY-3i；DOM widget/unified phase tests、host boundary 20 contracts、功能性 DOM 状态 | 两段进度单调/clamp、进入/完成/失败生命周期已有合同；未发现直接缺陷 |
| `packages/game/src/shell/audio-volume.ts` | product | 已验证 | CODE-QUALITY-3i；bootstrap 三通道 caller、storage/key tests、NaN negative control | 修复 NaN 音量进入 sink/localStorage；有限/0..1 合法行为不变 |
| `packages/game/src/shell/trademark-fallback.ts` | product | 已验证 | CODE-QUALITY-3i；reference/sdlpal main.c:197-203、rng-player caller、trademark/splash framebuffer/timing tests | 只纠正过时 skipKeys 注释；DOS chunk 6/1000ms/600ms 行为未改 |
| `packages/game/src/shell/audio-volume.boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3i；NaN/0/default/三通道共享 mute 合同；删除 NaN guard 的 mutant 失败 | 直接 setter/storage/sink oracle，不重复 clamp 主干 |
| `packages/game/src/shell/fetch-retry.test.ts` | test | review | CODE-QUALITY-71；GET/HTTP/POST/idempotent/AbortError 主 oracle；6 tests | 取消不重复请求；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/fetch-retry.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-71；uninstall/重新安装生命周期 oracle；2 tests | 还原后不再重试；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/display-scale.ts` | product | 已验证 | CODE-QUALITY-3j；canvas/localStorage/fullscreen callers、scale tests；NaN negative control | 修复 NaN 百分比写入 NaN CSS/storage；有限百分比 clamp/居中形态不变 |
| `packages/game/src/tools/fps-overlay.ts` | product | 已验证 | CODE-QUALITY-3j；tools-panel/rAF caller、启停/采样/DOM tests | module sampling state 在停用时清零；非法持久值仅 `'1'` 开启 |
| `packages/game/src/tools/toast.ts` | product | 已验证 | CODE-QUALITY-3j；save/tool callers、success/error/info/stack lifecycle tests | DOM 单例/多 toast 到期自删合同完整，未发现直接缺陷 |
| `packages/game/src/tools/map-names.ts` | product | 已验证 | CODE-QUALITY-3j；shared authored map-name caller 与 known/fallback tests | 缺名保持 `地图N` 回退，不改 authored table |
| `packages/game/src/tools/speedrun/time-format.ts` | product | 已验证 | CODE-QUALITY-3j；speedrun store/overlay callers、format/parse boundary + leaves tests | 合法时钟/解析/符号/负数合同完整，未发现直接缺陷 |
| `packages/game/src/tools/speedrun/countdown.ts` | product | 已验证 | CODE-QUALITY-3j；speedrun store caller、singleton/update/remove DOM tests | 单节点复用、null 幂等移除；未发现直接缺陷 |
| `packages/game/src/tools/speedrun/checkpoints.ts` | product | 已验证 | CODE-QUALITY-3j；speedrun store/detectors caller、21-id/monotonic/BANANA tests 与 PalTimer 注释 | 只读核对坐标/物品/检测器；不擅改速通数据 |
| `packages/game/src/tools/display-scale.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3j；NaN/round/fullscreen/FPS lifecycle 合同；删除 NaN guard 的 mutant 失败 | 合并现有 display-scale/FPS 合同，不堆弱断言 |
| `packages/game/src/present/framebuffer.ts` | product | 已验证 | CODE-QUALITY-3k；present.ts/scene thumbnails/shell callers、framebuffer + leaves tests | fixed-size/default 与离屏尺寸、边界静默写、palette 缺色 fallback 合同完整；未发现直接缺陷 |
| `packages/game/src/present/screen-shake.ts` | product | 已验证 | CODE-QUALITY-3k；present.ts:707-715 caller、sdlpal video.c anchor、shake/bounds tests | 奇偶垂直搬移、level 越界、advance=false 补帧和 shakeTime 递减合同完整 |
| `packages/game/src/present/screen-wave.ts` | product | 已验证 | CODE-QUALITY-3k；present.ts:313-317 caller、sdlpal scene.c:389-399、global.h:379 WORD、real raw opcode 0x71 `[255,65532,0]`、wave/leaves/mirror tests | 修复 JS number 负 progression 跨过 0 未关断；`<=0` 对齐 C WORD 回绕后 `>=256` 收尾，既有相位/循环行为不变 |
| `packages/game/src/present/dither-fade.ts` | product | 已验证 | CODE-QUALITY-3k；present.ts:658-673 caller、battle fade caller、dither/nibble tests | 72-step RG_INDEX/低位逼近合同完整；不改 fade 公式 |
| `packages/game/src/present/draw-number.ts` | product | 已验证 | CODE-QUALITY-3k；battle/menu/dialog callers、sdlpal ui.c:640-732、draw-number/slots tests | color base/alignment/R-to-L/truncate/opaque mask/缺帧合同完整 |
| `packages/game/src/present/follower-pos.ts` | product | 已验证 | CODE-QUALITY-3k；present.ts:393-417 caller、sdlpal scene.c:658/745、follower tests | walking/静止冻结/障碍回退/朝向源/trail fallback 合同完整；坐标保持原版 |
| `packages/game/src/present/framebuffer.test.ts` | test | 已验证 | CODE-QUALITY-3k；默认尺寸/write-clear/toImageData RGBA 合同 | 直接 framebuffer oracle |
| `packages/game/src/present/framebuffer.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3k；越界、自定义尺寸、缺色 fallback 反例 | 高判别力边界合同 |
| `packages/game/src/present/screen-shake.test.ts` | test | 已验证 | CODE-QUALITY-3k；奇偶搬移/递减/level 0/连续帧合同 | 公式 oracle |
| `packages/game/src/present/screen-shake-bounds.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3k；level 199/200/256、advance=false 边界合同 | 不重复主干 |
| `packages/game/src/present/screen-wave.test.ts` | test | 已验证 | CODE-QUALITY-3k；渐弱/清零/循环守恒合同 | 相位 reset 隔离 |
| `packages/game/src/present/screen-wave.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3k；advance=false/循环/跨帧相位/真实 raw 负 progression 收尾合同；mutant 4 total/3 fail→恢复 4/4 | typed indices + raw oracle |
| `packages/game/src/present/screen-wave-mirror.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3k；镜像 wave 表/关断/累加边界合同 | 独立行 shift oracle |
| `packages/game/src/present/dither-fade.test.ts` | test | 已验证 | CODE-QUALITY-3k；step0/outer1/72-step 收敛合同 | 原版 nibble oracle |
| `packages/game/src/present/dither-fade-nibble.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3k；RG_INDEX 顺序/低位回退/邻接不动合同 | 相位合同 |
| `packages/game/src/present/draw-number.test.ts` | test | 已验证 | CODE-QUALITY-3k；align/color/truncate/缺帧合同 | sdlpal UI oracle |
| `packages/game/src/present/draw-number-slots.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3k；opaque mask/末行/缺位/nLength=0 合同 | 直接 framebuffer oracle |
| `packages/game/src/present/follower-pos.test.ts` | test | 已验证 | CODE-QUALITY-3k；walking/frozenOffset/0x46/船/隐龙窟回归合同 | 一阶段行为回归 |
| `packages/game/src/present/follower-pos-axis.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3k；方向轴/障碍/短 trail/静止不调用 caller 合同 | 轴向反例 |
| `packages/game/src/present/battle/draw-battle-bg.ts` | product | 已验证 | CODE-QUALITY-3l；present-battle caller、battle.c:982 FBP 320×200、draw-battle-bg tests | 背景索引 0 不透明；尺寸裁剪/召唤低 nibble 染色合同完整 |
| `packages/game/src/present/battle/draw-battle-effect.ts` | product | 已验证 | CODE-QUALITY-3l；fight.c:2183/2188/2760 anchor、effect/magic overlay callers/tests | 底中 anchor、opaque mask、缺资源/坏 frame no-op 合同完整 |
| `packages/game/src/present/battle/draw-battle-num.ts` | product | 已验证 | CODE-QUALITY-3l；uibattle.c:1746-1808、present-battle showDamageNum caller、num tests | 40ms age、0..10 寿命、y 上移、5 位 right align 合同完整 |
| `packages/game/src/present/battle/draw-battle-settlement.ts` | product | 已验证 | CODE-QUALITY-3l；battle.c:1037-1321、word lookup/drawNumber/font callers、settlement pixel tests | exp/cash/level/hidden-exp/learn-magic screens 保持布局与 mask |
| `packages/game/src/present/battle/draw-battle-sprites.ts` | product | 已验证 | CODE-QUALITY-3l；battle.c/fight.c/uibattle.c anchors、present-battle caller、sprite pixel/leaves tests | target highlight、idle/death/fade、color shift、Y-sort/opaque mask 合同完整 |
| `packages/game/src/present/battle/draw-battle-ui.ts` | product | 已验证 | CODE-QUALITY-3l；uibattle.c UI state/early-return anchors、draw UI pixel/leaves tests | dialog/escape early return、menu/target/status layers 保持现行形态 |
| `packages/game/src/present/battle/present-battle.ts` | product | 已验证 | CODE-QUALITY-3l；battle.c scene order、screen-wave/shake/dither callers、present-battle tests | bg→wave→sprites→nums→UI→fade/shake 装配顺序直接核对 |
| `packages/game/src/present/battle/__tests__/draw-battle-bg.test.ts` | test | 已验证 | CODE-QUALITY-3l；背景写入/低 nibble shift 合同 | 直接 framebuffer oracle |
| `packages/game/src/present/battle/__tests__/draw-battle-effect.test.ts` | test | 已验证 | CODE-QUALITY-3l；overlay anchor/mask/缺资源合同 | 直接 framebuffer oracle |
| `packages/game/src/present/battle/__tests__/draw-battle-num.test.ts` | test | 已验证 | CODE-QUALITY-3l；floating nums age/position/clear 合同 | 真实 layer caller |
| `packages/game/src/present/battle/__tests__/draw-battle-settlement.test.ts` | test | 已验证 | CODE-QUALITY-3l；各结算 screen 合法输入合同 | typed settlement oracle |
| `packages/game/src/present/battle/__tests__/draw-battle-sprites.test.ts` | test | 已验证 | CODE-QUALITY-3l；anchor/idle/color shift/death 合同 | battle state oracle |
| `packages/game/src/present/battle/__tests__/draw-battle-ui.test.ts` | test | 已验证 | CODE-QUALITY-3l；UI state/early-return/menu/grid 合同 | typed UI oracle |
| `packages/game/src/present/battle/__tests__/present-battle.test.ts` | test | 已验证 | CODE-QUALITY-3l；装配顺序/命令消费/跨帧状态合同 | 真实 BattlePresent caller |
| `packages/game/src/present/battle/draw-battle-settlement.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3l；结算文字/布局 leaves 合同 | 不重复主干 |
| `packages/game/src/present/battle/draw-battle-sprites.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3l；sprite state/target/fade leaves 合同 | 不重复主干 |
| `packages/game/src/present/battle/draw-battle-ui.glm-phase1-leaves.test.ts` | test | 已验证 | CODE-QUALITY-3l；UI 分支/对话/目标 leaves 合同 | 不重复主干 |
| `packages/game/src/present/battle/battle-effect-num-pixels.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3l；effect/number pixel 证据 | 高判别力像素 oracle |
| `packages/game/src/present/battle/battle-settlement-pixels.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3l；settlement pixel/word layout 证据 | 高判别力像素 oracle |
| `packages/game/src/present/battle/battle-sprite-pixels.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3l；sprite pixel/mask/z-order 证据 | 高判别力像素 oracle |
| `packages/game/src/present/battle/battle-ui-pixels.grok-r1.test.ts` | test | 已验证 | CODE-QUALITY-3l；battle UI pixel/early-return 证据 | 高判别力像素 oracle |
| `packages/game/src/core/battle/formulas.ts` | product | 已验证 | CODE-QUALITY-3m；fight.c:131-389 primary source、battle callers、formula tests | SHORT cast/CLASSIC formula/resist/element field 合同逐段核对；未发现直接缺陷 |
| `packages/game/src/core/battle/magic-damage.ts` | product | 已验证 | CODE-QUALITY-3m；fight.c:4270-4318/5300-5400/4673-4853、inline/Simulate/throw callers、magic tests | per-target RNG/minDamage/def/resistance/autoDefend/defeated skip 合同逐段核对 |
| `packages/game/src/core/battle/status.ts` | product | 已验证 | CODE-QUALITY-3m；fight.c:1632-1661、battle-system turn-end caller、status/actions tests | 全 status counter tick、alive enemy、canAct/canCast 合同完整 |
| `packages/game/src/core/battle/turn-queue.ts` | product | 已验证 | CODE-QUALITY-3m；fight.c:1451-1584、battle-system caller、turn-queue tests | stable dex sort、dualMove dex2/legacy fallback、enemy-first tie 合同完整 |
| `packages/game/src/core/battle/battle-positions.ts` | product | 已验证 | CODE-QUALITY-3m；battle.c g_rgPlayerPos/ENEMYPOS anchors、present core callers、UI/sprite tests | party count layouts/fallback/idx bounds 合同完整 |
| `packages/game/src/core/rng.ts` | product | 已验证 | CODE-QUALITY-3m；battle/event/shell callers、rng tests、seed state contract | mulberry32 deterministic state/range APIs；sdlpal LCG 差异为已记录设计，不擅改 |
| `packages/game/src/core/battle/__tests__/formulas.test.ts` | test | 已验证 | CODE-QUALITY-3m；base/physical/magic/dex formula contracts | primary-source numeric oracle |
| `packages/game/src/core/battle/__tests__/magic-damage.test.ts` | test | 已验证 | CODE-QUALITY-3m；inline/Simulate/enemy magic/autoDefend contracts | real BattleState caller oracle |
| `packages/game/src/core/battle/__tests__/status.test.ts` | test | 已验证 | CODE-QUALITY-3m；all status tick/alive enemy/canAct contracts | counter lifecycle oracle |
| `packages/game/src/core/battle/__tests__/turn-queue.test.ts` | test | 已验证 | CODE-QUALITY-3m；sort/tie/dualMove/dex2 contracts | queue identity oracle |
| `packages/game/src/core/rng.test.ts` | test | 已验证 | CODE-QUALITY-3m；same seed/different seed/range/state contracts | deterministic RNG oracle |
| `packages/game/src/core/palette-fade.ts` | product | 已验证 | CODE-QUALITY-3n；event-system fade builders、present/present-battle callers、palette-fade tests | fade60/fade63/lerp/approach/freeze/nightColors contracts；caller normalizes zero delays |
| `packages/game/src/core/scene-identity.ts` | product | 已验证 | CODE-QUALITY-3n；bootstrap scene load/restore callers、history/map-name readers | single current map identity setter/getter；caller ownership explicit |
| `packages/game/src/core/word-lookup.ts` | product | 已验证 | CODE-QUALITY-3n；bootstrap setWordTable、menu/settlement/event callers、word tests | table-first/fallback/empty/out-of-range contract；未改 WORD schema |
| `packages/game/src/core/script-catalog.ts` | product | 已验证 | CODE-QUALITY-3n；bootstrap setGlobalEvents、event-system resolveLabel/getCmds callers、dependency ownership tests；prototype-label negative controls | 修复 inherited `toString`/`constructor`/`__proto__` 被误解析为脚本 IP；global label map 改为 own-property/null-prototype，zero-item fixup 边界保留 |
| `packages/game/src/core/palette-fade.test.ts` | test | 已验证 | CODE-QUALITY-3n；fade60/fade63/lerp/approach/finalize/bounds contracts | primary palette oracle |
| `packages/game/src/core/word-lookup.test.ts` | test | 已验证 | CODE-QUALITY-3n；unloaded/fallback/table priority/out-of-range contracts | direct WORD caller oracle |
| `packages/game/src/core/dependency-ownership.test.ts` | test | review | CODE-QUALITY-3n；catalog/scene identity ownership、prototype label negative controls、cross-entrypoint identity | 真实公开 entrypoint oracle；QUALITY-PRE94-RETROSPECTIVE-1直接counter见[回溯证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/README.md)，旧关闭结论撤回 |
| `packages/game/src/core/cross-module-boundaries.test.ts` | test | 已验证 | CODE-QUALITY-3n；scene/event/equipment/battle cross-module caller contracts | 相邻模块回归证据 |
| `packages/game/src/core/dialog-history.ts` | product | 已验证 | CODE-QUALITY-3o；event-system history writer/tools caller、dialog-history tests | trim/连续去重/map 维度/CAP/restore 老档归一合同完整 |
| `packages/game/src/core/mode.ts` | product | 已验证 | CODE-QUALITY-3o；main-loop caller、event/scene/battle/menu mode tests | frameNum、autoScript gate、mode dispatch、同步 event 再驱动合同完整 |
| `packages/game/src/core/player-poison-state.ts` | product | rework | CODE-QUALITY-3o；event-opcode/equipment/battle callers、ownership/poison tests | poison definition ownership/level99/slot dedup/cure/runner 合同完整；QUALITY-PRE94-RETROSPECTIVE-1直接counter见[回溯证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/README.md)，旧关闭结论撤回 |
| `packages/game/src/core/scene-system-search.ts` | product | 已验证 | CODE-QUALITY-3o；scene-system Confirm caller、play.c:362-510、search tests | 13-cell range、trigger mode 阈值、grid/h/sState/first-hit 合同完整 |
| `packages/game/src/core/scene-system.ts` | product | 已验证 | CODE-QUALITY-3q；play.c:25-238,423-591、scene.c:512-847、map.c:277-299、res.c:229-301、global.h:75-121；mode/event/bootstrap/dev callers | 662 行逐段核验；131 定向测试、game typecheck、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷 |
| `packages/game/src/core/event-system.ts` | product | review | CODE-QUALITY-3r；script.c:30-307,608-750,1140-1410,1600-1815,1850-1990,2050-2145,2290-2385,2385-2555,2570-2775,2970-3070；mode/bootstrap/scene/battle/menu/equipment/poison callers | 5110 行逐段核验全局脚本表、auto/event/runScript、waiting/fade/modal、scene/battle resume、raw opcode、对象解析与移动；定向 370、game typecheck、完整 check、official ratchet、protected fast、Biome 零诊断均通过，未发现直接缺陷 |
| `packages/game/src/core/battle/battle-opcodes.ts` | product | review | CODE-QUALITY-3t；script.c:867-950,1026-1102,1175-1425,1437-1449,1573-1640,1848-2054,2547-2668,2776-2995,3267-3297；fight.c:602-716,2387-2390,4214-4323,5193-5400；battle.c:1397-1434；event-system/actions/battle-system callers | 1528 行逐段核验 dispatch、BattleCtx ownership、目标/状态/伤害/毒、召唤/分裂/变身/逃跑、动画/偷窃/战斗结果与 consumed/newIp；定向/相邻 470 tests、game typecheck、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷；0x2E `>=` 为 game-mechanics 已记录的原版后期产品决策 |
| `packages/game/src/core/battle/__tests__/battle-opcodes.test.ts` | test | 已验证 | CODE-QUALITY-3t；2386 行全文、主 oracle、script.c/fight.c caller/合同、470 定向/相邻 tests | 合法目标、边界、失败分支、目标缺失、动画/资源副作用与 consumed/newIp 反控；无弱化断言 |
| `packages/game/src/core/battle/battle-opcodes.cov85.test.ts` | test | 已验证 | CODE-QUALITY-3t；1189 行全文、dispatch family branch contracts、470 定向/相邻 tests | 真实 state/ctx caller 合同、非法/缺资源/满槽/无目标反例；不以 coverage 数量单独验收 |
| `packages/game/src/core/battle/battle-opcodes.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3t；70 行全文、0x05/0x8E dialog clear 与 0x6B signed blow-away primary contract | 清框只影响下一段对白、SHORT 负值边界与 negative control |
| `packages/game/src/battle-summon-slot-reuse.glm-q.test.ts` | test | 已验证 | CODE-QUALITY-3t；203 行全文、0x9E 战中死亡空槽复用/对象身份/阵型重算 oracle | 活槽不复用、毒/身份清理与阵型锚点反例 |
| `packages/game/src/core/battle/battle-state.ts` | product | 已验证 | CODE-QUALITY-3u；battle.h:49-119,158-206；global.h:395-404,441-444；battle.c:900-943,1531-1775；fight.c:117-127,2173-2190,3209-3245；battle-system/finalization/anim callers | 918 行逐段核验 BattleState 字段、phase/UI/queue、玩家/敌人快照、null 空槽、对象身份、脚本/毒/动画/结算 ownership；55 定向/相邻 tests、game typecheck、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷 |
| `packages/game/src/core/battle/battle-runtime-context.ts` | product | 已验证 | CODE-QUALITY-3u；battle.c:1741-1754,1838-1857；battle-system:324-344；battle-finalization:63；runtime/finalization callers | 98 行逐段核验资源表与 runner stash、live-role identity、override 优先级和 finalize release；未发现跨战斗残留或清理缺口 |
| `packages/game/src/core/battle/__tests__/battle-state.test.ts` | test | 已验证 | CODE-QUALITY-3u；BattleState 工厂/位置/状态 seed oracle，定向/相邻 55 tests | 383 行逐段读取；未知 role、>3 player、状态 seed、快照、EnemyPos/fallback/y offset 和独立坐标对象反例 |
| `packages/game/src/core/battle/battle-state.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3u；null 空槽、maxHealth/object identity、autoBattle/scriptPrevHp oracle，定向/相邻 55 tests | 81 行逐段读取；0 占位槽不压缩、真实槽浅拷贝、开战 seed 反例 |
| `packages/game/src/core/battle/battle-finalization.test.ts` | test | review | CODE-QUALITY-3u；finalization cleanup/resume caller oracle，定向/相邻 55 tests | 80 行逐段读取；状态/波场/模式/资源释放顺序与 0x07 resume 反例；QUALITY-PRE94-RETROSPECTIVE-1直接counter见[回溯证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/README.md)，旧关闭结论撤回 |
| `packages/game/src/core/battle/actions/attack.ts` | product | 已验证 | CODE-QUALITY-3v；fight.c:3618-3754,4910-5148,4591-4654；battle-system:2769-2825；action/anim/formula callers | 614 行逐段核验玩家/敌方物攻、群攻/DualAttack、auto-defend/cover/protect、equiv poison、混乱友敌与 timeline/legacy fallback；154 定向/相邻 tests、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷 |
| `packages/game/src/core/battle/actions/attack-mate.ts` | product | 已验证 | CODE-QUALITY-3v；fight.c:3760-3853；battle-system attack-mate dispatch；attack-mate/action tests | 111 行逐段核验随机活友军、目标防御/protect、HP clamp、武器声、动画与无目标 Pass；未发现直接缺陷 |
| `packages/game/src/core/battle/actions/defend.ts` | product | 已验证 | CODE-QUALITY-3v；fight.c:4110-4117,4924-4929；battle-system dispatch；actions tests | 20 行全文核验；只写 defending，减伤由 enemy attack owner 消费，越界 no-op 合同闭合 |
| `packages/game/src/core/battle/actions/flee.ts` | product | 已验证 | CODE-QUALITY-3v；fight.c:4119-4172；battle.c:1455-1528；battle-system dispatch；actions tests | 81 行逐段核验 flee rate/装备、敌吉运修复、boss RNG、空槽/SHORT 溢出、失败动画与 exp；未发现直接缺陷 |
| `packages/game/src/core/battle/__tests__/attack-mate.test.ts` | test | 已验证 | CODE-QUALITY-3v；111 行实现对应的 7 个 AttackMate oracle，154 定向/相邻 tests | 148 行全文读取；随机 self/dead 跳过、protect/defend/clamp/无活友军/武器声与 HP ownership 反例 |
| `packages/game/src/core/battle/actions/attack.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3v；64 行命中特效帧基号/缺表反例，154 定向/相邻 tests | 全文读取；flat index `sprite*2+1`、×3、undefined fallback 与真实 timeline oracle |
| `packages/game/src/core/battle/battle-finalization.ts` | product | 已验证 | CODE-QUALITY-3w；battle.c:1822-1857；battle-system:415,530；finalization/settlement callers | 67 行全文核验 outcome、状态/毒/装备/波场/mode/runtime/postBattle cleanup 顺序；196 定向/相邻 tests、完整 check、official ratchet、protected fast、Biome 零诊断均通过；未发现直接缺陷 |
| `packages/game/src/core/battle/battle-settlement.ts` | product | 已验证 | CODE-QUALITY-3w；battle.c:991-1373；battle-system:390-530；progression/settlement callers | 246 行全文核验 exp/cash/HP-MP 回写、屏序/timeout、Phase E once、对话 hold、半血与 finalize；未发现直接缺陷 |
| `packages/game/src/core/battle/battle-settlement.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3w；settlement screen/timeout/Phase E/half-heal oracle，196 定向/相邻 tests | 259 行全文读取；首帧残键、74+1 timeout、屏序、Phase E once/dialog hold/半血恢复反例 |
| `packages/game/src/core/dialog-history.test.ts` | test | 已验证 | CODE-QUALITY-3o；trim/dedup/map/CAP/restore contracts | direct history oracle |
| `packages/game/src/core/mode.test.ts` | test | 已验证 | CODE-QUALITY-3o；mode/frame/autoScript/event dispatch contracts | main loop dispatch oracle |
| `packages/game/src/core/scene-system-search.test.ts` | test | 已验证 | CODE-QUALITY-3o；13-cell/facing/trigger threshold/first hit contracts | primary search oracle |
| `packages/game/src/core/scene-system.test.ts` | test | 已验证 | CODE-QUALITY-3q；真实 tickSceneSystem/tickEventSystem/SceneAssetsCache/setGlobalEvents caller，play.c/scene.c/map.c oracle | 2064 行全文核验；方向/顺序、4..8 trigger、vanish/revive、blocker push、tile h/bit13、trail/步态、loadScene/cache/onEnter、TouchFar 死锁和 invalid-label 反例均有高判别力合同 |
| `packages/game/src/core/event-system.test.ts` | test | 已验证 | CODE-QUALITY-3r；真实 tickEventSystem/tickAutoScripts/runScript/runEnterScript callers，script.c/play.c/scene.c/text.c oracle | 5973 行主测试全文核验；dialog/wait/confirm/end、battle fallback、global ip/call、移动/镜头/fade、scene/item/poison/object 条件与特效生命周期合同完整 |
| `packages/game/src/core/battle/__tests__/battle-system.test.ts` | test | 已验证 | CODE-QUALITY-3s；公开 startBattle/tickBattle/mode/menu/actions callers，battle.c/fight.c/uibattle.c/script.c oracle | 4182 行主生命周期/UI测试全文核验；start/phase/queue/cleanup、菜单/target、动画/dialog、毒/状态/逃跑、敌槽/dualMove、Repeat、投掷/道具/召唤和波场 contracts |
| `packages/game/src/core/battle/battle-system.cov85.test.ts` | test | 已验证 | CODE-QUALITY-3s；公开 startBattle/tickBattle/tickEnemyIdleGestures callers，battle.c/fight.c oracle | 276 行 branch guard/phase/idle/资源缺失/settlement contracts，18 tests 通过 |
| `packages/game/src/core/battle/battle-system.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3s；公开 startBattle/tickBattle + event-system battle script caller，battle.c turn-start oracle | 122 行 turn-start dialog-clear 与终态 break contracts，2 tests 通过 |
| `packages/game/src/core/battle/battle-runtime-context.test.ts` | test | 已验证 | CODE-QUALITY-3s；startBattle 安装/cleanup 与 runScript fallback caller | resource/live-role identity、runner override/clear ownership contracts，3 tests 通过 |
| `packages/game/src/core/event-opcode-player.ts` | product | 已验证 | CODE-QUALITY-3p；script.c/global.c opcode 0x17-0x2F/0x41/0x55/0x56/0x8D、event-system caller、event/equip/poison tests | role/slot/SHORT/WORD/fScriptSuccess/owner contracts逐段核对；未发现直接缺陷 |
| `packages/game/src/core/event-opcode-player.test.ts` | test | 已验证 | CODE-QUALITY-3p；player/equipment/HP-MP/revive/poison/status/magic opcode contracts | direct opcode oracle |
| `packages/game/src/core/event-opcode-player.cov85.test.ts` | test | 已验证 | CODE-QUALITY-3p；opcode family branch contracts | branch boundary oracle |
| `packages/game/src/core/event-opcode-player.glm-next-wave.test.ts` | test | 已验证 | CODE-QUALITY-3p；role context/slot/poison runner/invalid input contracts | independent caller/negative oracle |
| `packages/editor/src/ui/command-form-control.residual.glm.test.tsx` | test | 待核 | TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1；Codex 接收 1 合同与 2 针反控；语义治理待后续专专项读取 | 测试合同已独立验收，未计入逐文件代码治理闭合 |
| `packages/editor/src/ui/ItemUseEffectEditor.residual.glm.test.tsx` | test | 待核 | TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1；Codex 接收 3 合同与 3 针反控；语义治理待后续专项读取 | P1 puppet product-counter 保留，未固化产品行为 |
| `packages/reforge/src/menu/menu-box.residual.glm.test.ts` | test | 待核 | TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1；Codex 接收 5 合同与 5 针反控；语义治理待后续专项读取 | draw-call oracle 测试文件，未计入逐文件代码治理闭合 |
| `packages/game/src/analytics/analytics-consent.ts` | product | review | CODE-QUALITY-3y；install-analytics/main callers、analytics tests、定向 Vitest | storage/DNT-GPC/广播/失败关闭合同逐段核验；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/analytics/analytics-consent.test.ts` | test | review | CODE-QUALITY-3y；真实 consent public functions 与 storage/event oracle | 合法选择、损坏存储、隐私信号与 unsubscribe 合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/analytics/analytics-consent.boundaries.test.ts` | test | review | CODE-QUALITY-3y；宿主边界与异常 EventTarget oracle | getter/dispatch 异常、非 CustomEvent、stored 优先级反例；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/analytics/google-analytics.ts` | product | review | CODE-QUALITY-3z；install-analytics/main callers、Google tests、URL/consent lifecycle oracle、game full test | measurement ID、UTM sanitization、page-view dedupe、script retry、disable flag、异常隔离逐段核验；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/analytics/google-analytics.test.ts` | test | review | CODE-QUALITY-3z；真实 startGoogleAnalytics caller 与 dataLayer/page-view oracle | 合法/非法 ID、敏感 URL、路径去重、撤回、脚本失败、gtag arguments 合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/analytics/google-analytics.boundaries.test.ts` | test | review | CODE-QUALITY-3z；真实 window/dataLayer 与宿主网络隔离 oracle | ID/UTM 长度边界、无 page subscriber、regrant、disable flag 反例；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/analytics/install-analytics.ts` | product | review | CODE-QUALITY-40；main.ts production caller、consent/google/UI lifecycle、game typecheck/full test | enabled 开关、navigator privacy 传递、storage ownership、destroy cleanup 与异常隔离逐段核验；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/analytics/install-analytics.test.ts` | test | review | CODE-QUALITY-40；真实 installTypePalAnalytics public entry、DOM/dataLayer oracle、game full test | 开发零副作用、DNT/GPC 默认关闭、UI/安装生命周期和销毁合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/analytics/analytics-consent-ui.ts` | product | review | CODE-QUALITY-41；install-analytics caller、DOM/ARIA lifecycle、UI test、local dev AX/screenshot | consent panel/preferences visibility、button ownership、storage failure、destroy cleanup 与现有布局合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/analytics/analytics-consent-ui.test.ts` | test | review | CODE-QUALITY-41；真实 mountAnalyticsConsentUi public entry、DOM/focus/storage oracle、game full test | panel placement、privacy signal、choice persistence、storage failure 与 destroy 反例；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/dialog-box.ts` | product | review | CODE-QUALITY-42；event-system/present callers、text.c/uigame.c、dialog tests与pixel oracle | 几何/边框/文字/头像、分页/清理、资源失败与 framebuffer ownership逐段核验；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/dialog-box.test.ts` | test | review | CODE-QUALITY-42；公开 dialog draw/clear caller、直接 framebuffer/状态 oracle | 合法布局、分页、头像、清理、缺资源与边界反例；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/dialog-box.glm-next-wave.test.ts` | test | review | CODE-QUALITY-42；真实 dialog/present caller 与分页/残留边界 oracle | 82项定向合同排重、合法输入、负控与跨帧清理判别力；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/draw-sprite.ts` | product | review | CODE-QUALITY-43；present.ts/battle sprite callers、scene.c anchors、framebuffer/pixel tests | 逐帧 anchor、opaque mask、palette-0、屏外裁剪与 buffer ownership逐段核验；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/draw-sprite.test.ts` | test | review | CODE-QUALITY-43；公开 drawSprite/toSpriteImages caller、直接 framebuffer oracle | 高度剖面/底边、mask、palette-0、屏外反例；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/draw-sprite-clip.grok-r1.test.ts` | test | review | CODE-QUALITY-43；真实 framebuffer caller 与奇数宽/裁剪/孔洞 oracle | 合法 typed 输入、8 条边界合同、无弱化断言；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/font.ts` | product | review | CODE-QUALITY-44；dialog/menu/battle/present callers、text.c/font.c/ui.c、font tests | glyph load/failure、tofu、逐字/阴影、颜色 fallback、measure/Pal width 与 framebuffer ownership逐段核验；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/font.test.ts` | test | review | CODE-QUALITY-44；真实 renderText/measure/pal width public oracle | 合法 glyph、CJK/ASCII width、tofu、empty 与 framebuffer反例；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/font.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-44；renderColoredText/缺字形/阴影真实 oracle | 逐字颜色、缺色 0x4F、三影和 tofu 像素合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/font-width.grok-r1.test.ts` | test | review | CODE-QUALITY-44；loadGlyphs fetch caller与width/render framebuffer oracle | HTTP 状态/baseUrl、codepoint width、shadow/底色保留合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/follower-render.ts` | product | review | CODE-QUALITY-45；present.ts caller、scene.c/res.c anchors、follower tests | 0x98 sprite chunk、trail[3+k]、direction/3-frame step、standing/walking、缺槽 ownership逐段核验；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/follower-render.test.ts` | test | review | CODE-QUALITY-45；公开 computeFollowerRenderItems oracle | 空 follower、缺槽、位置/身份、站立/行走步帧、多 follower 合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/follower-render-gap.grok-r1.test.ts` | test | review | CODE-QUALITY-45；真实 typed trail/follower caller与边界 oracle | 越界 step、稀疏槽、朝左步帧、第二 follower 缺槽反例；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/draw-confirm.ts` | product | review | CODE-QUALITY-46；present/menu/shop callers、uigame.c:242-388、confirm pixel tests | 双框坐标、selectedColor 时间生命周期、labels 复用、shadow 与 framebuffer ownership逐段核验；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/draw-confirm.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-46；真实 drawConfirmBox public caller、fixture framebuffer oracle | 默认/右选、0xF9/0x4F、三影、关/开标签合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/opening-confirm-pixels.grok-r1.test.ts` | test | review | CODE-QUALITY-46；opening/menu/confirm pixel caller与state clone oracle | 空/多字标签、背景 sentinel、光标隔离与框体像素反例；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/draw-box.ts` | product | review | CODE-QUALITY-47；dialog/menu/shop/battle callers、ui.c/uigame.c、draw-box/pixel tests | 9-slice/单行框 frame identity、shadow、opaque mask、边界裁剪、menuTextMaxCols 与 fail-loud 合同逐段核验；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/draw-box.test.ts` | test | review | CODE-QUALITY-47；公开 drawBox framebuffer oracle | style/rows-cols/grid、动态 shadow、缺帧反例；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/draw-box.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-47；drawBox/drawSingleLineBox/menuTextMaxCols typed caller oracle | 缺 44-46、shadow=0、屏外、空 rows-cols、width 合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/box-shadow-pixels.grok-r1.test.ts` | test | review | CODE-QUALITY-47；像素 framebuffer 与透明孔/单行框 caller oracle | 12 条高判别力阴影、透明孔、palette-0、标签宽度合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/draw-opening-menu.ts` | product | review | CODE-QUALITY-51；draw-menu/present callers、uigame.c:42-167、ui.c:458、opening-menu state | FBP 全屏背景、两行文案、长文案 x 公式、闪烁色、shadow 与缺背景边界逐段核验；未发现直接缺陷；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/draw-opening-menu.test.ts` | test | review | CODE-QUALITY-51；drawOpeningMenu/openingItemX 真实 caller 与 framebuffer oracle | 5 tests；背景/缺背景、两行坐标、cursor 差异、长文案 x 公式与输入合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/draw-opening-menu.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-51；词表/fixture glyph 与 framebuffer oracle | 3 tests；选中/未选色、三影、词表 fallback 与无 frames 合同；与 opening-confirm 像素测试排重；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/draw-shop.ts` | product | review | CODE-QUALITY-52；draw-menu/present/menu-driver callers、uigame.c:1503-1777、shop-menu state | 买/卖列表与价格、预览框/图标、库存+装备 ownedCount、金钱、确认框、卖价半价与缺资源边界逐段核验；未发现直接缺陷；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/draw-shop.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-52；真实 drawShopMenu/drawSellOverlay caller 与 framebuffer oracle | 4 tests；owned equipment、空店、非卖品、空 cursor/半价 overlay 合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/shop-preview-pixels.grok-r1.test.ts` | test | review | CODE-QUALITY-52；P04 caller、像素/palette oracle与输入快照 | 13 tests；rightText 价格、shadow/缺帧/缺图标、确认层、库存/装备 owned、0 金钱、半价与 palette 合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/draw-magic.ts` | product | review | CODE-QUALITY-50；draw-menu/present/menu-driver callers、magicmenu.c:36-299/301-484、uigame.c:653-875、uibattle.c:31-269 | 施法人/仙术/目标三阶段、PlayerInfoBox、MP/说明、禁用色、分页/光标、缺帧与 runtime stats 逐段核验；未发现直接缺陷；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/draw-magic.test.ts` | test | review | CODE-QUALITY-50；真实 drawInGameMagicMenu caller、magicmenu.c WIN95 MP/说明 oracle | 2 tests；多行说明、左侧 MP 与右侧空区布局，合法 typed state 与 global script fixture；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/draw-magic.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-50；真实状态/fixture framebuffer oracle | 5 tests；死亡/MP 禁用色、空表、缺 catalog、role/name fallback 与缺资源边界，排重 P06；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/magic-menu-pixels.grok-r1.test.ts` | test | review | CODE-QUALITY-50；P06 相邻 caller 与直接像素 oracle | 15 tests；坐标/说明多行/头像/HP-MP/缺帧/目标箭头/透明孔/运行时数值隔离；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/draw-inventory.ts` | product | review | CODE-QUALITY-49；draw-menu/present/menu-driver callers、itemmenu.c:28-310、uigame.c:1289-1470、P01/P02 与 menu-driver oracle | list/use-target 布局、6 色规则、live inventory、缺帧/资源、描述/noDesc 与 framebuffer ownership 逐段核验；修复数量归零时仍绘制目标物品图标/名称的 bug；未改退出状态机；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/draw-inventory.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-49；真实 drawInventoryMenu caller 与 fixture framebuffer oracle | 未知目录/过滤混列/use-target 缺上下文反例；与 P01/P02、像素测试排重，3 tests 通过；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/inventory-list-pixels.grok-r1.test.ts` | test | review | CODE-QUALITY-49；真实大世界目标层 live-count 与 framebuffer pixel oracle | 12 tests；先以最后一件物品归零反例证实旧实现失败，再验证 SDLPal 语义下图标/名称/数字均隐藏；其余 shadow、数量差额、缺帧、属性和 palette oracle 保持；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/draw-equip.ts` | product | review | CODE-QUALITY-48；draw-menu/present/menu-driver callers、uigame.c:1793-2055、itemmenu.c:28-224、装备绘制 tests | list 复用 InventoryMenu；pick-role 背景/图标/装备槽/运行时属性/角色四色/数量投影、缺资源与 framebuffer ownership 逐段核验；未发现直接缺陷；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/draw-equip.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-48；真实 drawEquipMenu caller 与 fixture framebuffer oracle | 非顺序 party/roleId 位、未知已装备、空槽、缺 role 行反例；与 P03/像素测试排重，3 tests 通过；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/equip-role-pixels.grok-r1.test.ts` | test | review | CODE-QUALITY-48；真实 EquipMenu state 与 framebuffer pixel oracle | 单人框高、done/缺目录/越界光标/数量 0、运行时属性与 live inventory 反例；11 tests 通过，输入快照隔离；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/draw-tilemap.ts` | product | review | CODE-QUALITY-54；SDLPal map.c/scene.c、present/bootstrap callers、extractor exact 64×128 contract；tilemap/present 定向 20 + 相邻 58 tests、全仓 check/ratchet/protected fast/lint | 坐标、layer、height、cover 与 primary 一致；seam repair 是 TS 持久帧补偿，bootstrap 缩略图未纳入本批；未发现直接缺陷；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/draw-tilemap.test.ts` | test | review | CODE-QUALITY-54；direct framebuffer/coverage oracle；9 tests 通过，波次全门通过 | h 子行、fence、9-bit id、fallback、coverage、seam dilation 合同；高判别力反例；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/draw-tilemap-pixels.grok-r1.test.ts` | test | review | CODE-QUALITY-54；真实 drawTilemap/repair caller、像素与裁剪 oracle；11 tests 通过，波次全门通过 | 缺帧、透明/opaque palette-0、边界裁剪、扫描顺序与 maxPasses 反例；不覆盖 bootstrap 缩略图；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/draw-menu.ts` | product | review | CODE-QUALITY-55；uigame.c/ui.c、present/menu-driver callers、P05 stack oracle；draw-menu/P05 15 + 波次相邻共 93 tests、全仓 check/ratchet/protected fast/lint | stack 顺序、坐标/颜色、cash/slot/overlay/placeholder 与资源转发已读；不拥有 poison key，runtime-zero 风险留 CODE-QUALITY-53；未发现直接缺陷；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/draw-menu.test.ts` | test | review | CODE-QUALITY-55；drawMenuStack framebuffer/state oracle；6 tests 通过，波次全门通过 | 空栈、主/系统/confirm、stack 叠层、缺帧 fail-loud；与 P05/GLM leaves 排重；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/present/menu/draw-menu.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-55；save-slot/inventory-action/switch/shop-sell/placeholder 真实 state 与像素 oracle；5 tests 通过，波次全门通过 | savedTimes、选中色、overlay、缺 extra 与输入快照隔离；不替代 runtime/poison ownership 审计；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/minimap.ts` | product | review | CODE-QUALITY-56；bootstrap/tools-panel/dev-panel callers、draw-tilemap/world pixel contract；定向 20 + 相邻 68 tests、game typecheck、全仓 check/ratchet/protected fast/lint | worldToThumb、分类、缩放、底图 cache 与 Image 生命周期逐段核验；失败反例证明并修复 loading ownership；bootstrap seam repair 差异留后续卡；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/minimap.test.ts` | test | review | CODE-QUALITY-56；world/trigger/data oracle；14 tests 全绿，波次全门通过 | 合法命令、label fallback、item/teleport/NPC 分类与 zoom 边界；与 leaves 排重；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/minimap.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-56；真实 canvas 与 localStorage/controller oracle；6 tests 全绿，波次全门通过 | 像素、toggle、持久化、延迟 Image.onload 与 decode failure 资源反控；不替代 bootstrap seam repair 审计；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/bootstrap.ts` | product | review | CODE-QUALITY-57；SDLPal scene.c、present/draw-tilemap、dev-panel/tools-panel/minimap callers；bootstrap 全文件读取，定向 helper/资源 tests 6 通过 | 资源/scene/save/modal ownership 已读；thumbnail 直绘未调用 seam repair，缺真实 thumbnail pixel oracle，保持 review |
| `packages/game/src/shell/bootstrap-load.test.ts` | test | review | CODE-QUALITY-57；bootstrap palette transition oracle；1 test 通过 | helper 合同真实且独立；不覆盖 bootstrap thumbnail closure，随卡保留 review |
| `packages/game/src/shell/bootstrap.glm-next-wave.test.ts` | test | review | CODE-QUALITY-57；showError canvas port oracle；2 tests 通过 | 启动失败显示/无 2D context 反例；不覆盖 thumbnail closure，随卡保留 review |
| `packages/game/src/tools/tools-panel.ts` | product | review | CODE-QUALITY-58；bootstrap/minimap/save/inspect callers；定向 18 + save wave 29 tests、全仓 check/ratchet/protected fast/lint | tab/DOM/键盘/委托/战斗签名/工具状态逐段读取；save version 由 CODE-QUALITY-59 收口；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/tools-panel.test.ts` | test | review | CODE-QUALITY-58；DOM/keyboard/audio/dialog/timer/battle oracle；16 tests、全仓门通过 | 真实注入依赖、受控 timer、输入传播与状态隔离；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/tools-panel.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-58；display-scale/fullscreen/FPS delegation oracle；2 tests、全仓门通过 | 公开委托参数与持久键观察；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/save-io.ts` | product | review | CODE-QUALITY-59；tools-panel/Save API callers、phase1 VERSION=1 plan、phase2 SAVE12 boundary；wrong-version 失败反例、全仓门通过 | `VERSION=1` guard fail-closed；不改 Save API/旧 upgrader；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/save-io.test.ts` | test | review | CODE-QUALITY-59；serialize/parse合法、格式/必填/wrong-version 反例；4 tests | 失败反例先行，未知 version 不再送入 Save API；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/save-import-quicksave.glm-msio.test.ts` | test | review | CODE-QUALITY-59；真实 parse/quick-save caller与必填守卫；4 tests、全仓门通过 | 当前合法输入、缺字段、快存错误反馈合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/quick-save.ts` | product | review | Codex takeover: complete GameState/feedback and listener balance verified in quick-save.test.ts; approved Save commit fix verified; open/connection/input contracts remain review | evidence/CODE-QUALITY-94/codex-takeover.md; no closure |
| `packages/game/src/tools/quick-save.test.ts` | test | review | CODE-QUALITY-60；canQuickSave、F5/F9、战斗拒绝与 caller oracle；4 tests、save wave全门通过 | 合法准入、反例、异步委托与输入隔离合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/store.ts` | product | review | CODE-QUALITY-61；speedrun/index/tools-panel/overlay callers；非法值反例、小数毫秒反例、全仓 check/ratchet/protected fast/lint | localStorage settings/bests 默认副本、坏 JSON/未知 key/非法容器 fail-closed；有限非负小数成绩保留；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/store.test.ts` | test | review | CODE-QUALITY-61；defaults/round-trip/真实 SpeedrunTimer 小数毫秒 oracle；5 tests | 合法合同与存储 round-trip；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/store.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-61；坏 JSON/ghost key/settings/非法数值/非法容器 oracle；4 tests | 非法值反控；不堆弱断言；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/timer.ts` | product | review | CODE-QUALITY-62；index/snapshot/detectors/tools-panel callers；timer 主/GLM/boundary 与全仓质量门 | wall-clock/暂停/PB/setStep 状态机逐段核验，未发现直接缺陷；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/timer.test.ts` | test | review | CODE-QUALITY-62；起表/打点/PB/香蕉/手动暂停 oracle；timer wave 全门通过 | 主合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/timer.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-62；countdown/dirty/reset oracle；timer wave 全门通过 | 一次性 flags 与恢复边界；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/snapshot.ts` | product | review | CODE-QUALITY-63；index/main-loop/timer callers；6 tests、game 全包/check/ratchet/protected fast/lint | inventory/BattleSnap/canMove 门控逐文件核验，未发现直接缺陷；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/snapshot.test.ts` | test | review | CODE-QUALITY-63；snapshot/canMove 合同；6 tests | count>0、battle HP、sceneLoading/paletteFade/suspendRaf 反例；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/detectors.ts` | product | review | CODE-QUALITY-64；timer/checkpoints/snapshot callers；detector 主/边界 13 tests、全仓门 | prev/mem/容差/彩依两段状态机逐段核验，未发现直接缺陷；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/detectors.test.ts` | test | review | CODE-QUALITY-64；enter/leave/spot/boss/item/music/caiyi 主 oracle；7 tests | 主合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/detectors.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-64；null prev、集合、容差、自定义 enemy 边界 oracle；6 tests | 边界合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/checkpoints.test.ts` | test | review | CODE-QUALITY-67；21-id/单调/首尾/香蕉配置 oracle；3 tests、speedrun wave 全门 | 无重复弱断言，数据合同完整；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/timer.boundaries.test.ts` | test | review | CODE-QUALITY-67；同 now/finished/暂停边界/setStep/mem 隔离/detector boundary oracle；6 tests、speedrun wave 全门 | 状态机边界判别力完整；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/countdown.test.ts` | test | review | CODE-QUALITY-68；挂出/更新/null remove DOM oracle；2 tests、speedrun wave 全门 | 倒计时元素生命周期；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/countdown.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-68；单例复用/重建/pointer-events oracle；2 tests | DOM 单节点合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/time-format.test.ts` | test | review | CODE-QUALITY-69；clock/HMS/parse/diff 合法值 oracle；4 tests | 常规格式合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/time-format.boundaries.test.ts` | test | review | CODE-QUALITY-69；进位/负数/符号/非法 parse boundary oracle；3 tests | 高判别力边界合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/time-format.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-69；小时进位/负数 oracle；2 tests | 与主/边界测试排重；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/audio-volume.test.ts` | test | review | CODE-QUALITY-70；主 volume/mute/storage oracle；3 tests | 主合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/audio.ts` | product | review | CODE-QUALITY-74；SDLPal sound/midi caller、bootstrap/dev-panel callers、audio 主/边界 tests；27 定向 tests、全仓质量门 | SFX queue ownership、BGM track/loop、同号去重、开关/补播、OGG release 逐段核验；未发现直接缺陷；MIDI async race 留 CODE-QUALITY-75；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/audio.test.ts` | test | review | CODE-QUALITY-74；URL/track、AudioManager、SFX mapping/dedup、OGG lifecycle oracle；主合同全绿 | 合法输入、真实 MusicBackend caller、资源释放与高判别力反例；不覆盖 MIDI fetch 逆序；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/audio.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-74；OGG volume 与 audio-midi no-WebAudio/no-op 端口 oracle；27 定向 tests 全绿 | 与主合同排重；audio-midi async race 明确留 CODE-QUALITY-75；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/audio-midi.ts` | product | review | CODE75当前复审Y01：全文读取并核MusicBackend/AudioManager/source-controller caller及SpessaSynth 4.3.6异步事件协议；精确保留最新main字节 | 旧3y实现已由main发布实现替代；12定向、44相邻、game typecheck与stop代际反控通过；公共输入/整生命周期及统一质量门仍待核，不恢复历史closed |
| `packages/game/src/shell/audio-midi.test.ts` | test | review | CODE75当前复审Y01：全文323行、合法SMF/canonical SF3/实际Response与受控body完成oracle；两个旧合同精确映射到现有12例；隔离stop反控12绿→11绿1指定业务红→恢复12绿 | 主线原字节未改；旧boundaries两例重复且FakeSequencer协议过期，删除原件与file×fullName映射见[本片证据](../evidence/CODE-QUALITY-3Y-CLOSEOUT-1/midi-review/README.md)；全仓门尚未收口 |
| `packages/game/src/shell/main-loop.ts` | product | review | CODE-QUALITY-76；SDLPal `game.c:43-86`/`play.c:513-565`、bootstrap/mode/speedrun callers；33 定向、全仓质量门 | fixed cadence、accumulator、mode clamp、freeze、present/input gates、scene context、RAF cancel 逐段核验；未发现直接缺陷；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/main-loop.test.ts` | test | review | CODE-QUALITY-76；tickN/interval/accumulator/present/fade/input oracle；12 tests | 主合同与 SDLPal cadence 对照；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/main-loop-gates.grok-r1.test.ts` | test | review | CODE-QUALITY-76；drain/nowMs/dump/freeze/mode-switch/RAF cancel boundary oracle；13 tests | 宿主边界与主合同排重；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/rng-player.ts` | product | review | CODE-QUALITY-77；SDLPal `rngplay.c:372-448`/`main.c:197-203`/`video.c:571-616`、bootstrap/event/trademark callers；33 定向、全仓质量门 | frame window、chunk in-flight cache、失败驱逐、fade、skip、shake、flush lifecycle 逐段核验；未发现直接缺陷；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/rng-player.test.ts` | test | review | CODE-QUALITY-77；合法播放/失败/skip/shake/fade/cache oracle；主合同全绿 | 直接 framebuffer/canvas 与真实 loader seam，26 tests；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/rng-player.glm-next-wave.test.ts` | test | review | CODE-QUALITY-77；窗口外零请求、失败 Promise 驱逐 oracle；2 tests | 补齐未占用 frame window 与 retry 合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/avi-player.ts` | product | review | CODE-QUALITY-78；SDLPal `aviplay.c:643-747`、bootstrap/main/ending callers；32 定向/相邻、全仓质量门 | video DOM/cleanup、skip/500ms、autoplay fallback、warm-up、volume owner、迟到 Promise 生命周期逐段核验；未发现直接缺陷；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/avi-player.test.ts` | test | review | CODE-QUALITY-78；video creation/ended/error/skip/volume/cleanup oracle；主合同全绿 | 合法视频与生命周期反例，13 tests；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/avi-player.glm-next-wave.test.ts` | test | review | CODE-QUALITY-78；autoplay reject overlay、warm-up resolve/reject oracle；2 tests | 补齐浏览器拒绝与同步手势解锁边界；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/boot-loading.ts` | product | review | CODE-QUALITY-72；bootstrap/main-loop/DOM caller；20 tests、全仓 check/ratchet/protected fast/lint | fetch counting、进度、SW onProgress、finish/fail/restore、rAF fallback lifecycle 逐段核验；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/boot-loading.test.ts` | test | review | CODE-QUALITY-72；计数/进度/finish/fail/nop DOM oracle；9 tests | 主合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/boot-loading-host.grok-r1.test.ts` | test | review | CODE-QUALITY-72；host DOM/缺节点/rAF/onProgress 反例；11 tests | 宿主边界合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/input.ts` | product | review | CODE-QUALITY-73；main-loop/input caller、SDLPal input.c key map、主/边界/回放 tests；31 tests、全仓门 | held/pressed/repeat/fade suppression/detach 与回放 ownership逐段核验，未发现直接缺陷；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/input.test.ts` | test | review | CODE-QUALITY-73；key map/held/pressed/replay/recording 主 oracle；19 tests | 主合同与原版键位映射；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/input.boundaries.test.ts` | test | review | CODE-QUALITY-73；alias/detach/unknown keyup/fade boundary oracle；3 tests | 宿主边界；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/shell/input-replay.grok-r1.test.ts` | test | review | CODE-QUALITY-73；multi-source/order/replay cursor/recording ownership oracle；11 tests | 回放与多源生命周期；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/index.ts` | product | review | CODE-QUALITY-65；main-loop/tools-panel/timer/store/overlay/countdown callers；12 tests、game 全包/check/ratchet/protected fast/lint | 单例/tick/暂停/快捷键/PB 持久化编排逐段核验，未发现直接缺陷；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/index.test.ts` | test | review | CODE-QUALITY-65；disabled/tick/overlay/hotkey/pause oracle；10 tests | 主编排合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/index.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-65；解绑/未启用 shortcut 反例；2 tests | 输入监听生命周期；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/overlay.ts` | product | review | CODE-QUALITY-66；index/timer/time-format caller；6 tests、game 全包/check/ratchet/protected fast/lint | DOM row/ETA/diff/clock/pause/style ownership逐段核验，未发现直接缺陷；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/overlay.test.ts` | test | review | CODE-QUALITY-66；overlay row/value oracle；4 tests | 功能性 DOM 合同；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/tools/speedrun/overlay.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-66；DOM cleanup/diff/paused prefix 反例；2 tests | 视觉形态保持，不做剧情 E2E；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/core/menu/menu-mode.ts` | product | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/menu-stack.ts` | product | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/menu-mode.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/inventory-menu.ts` | product | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/inventory-menu.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/inventory-menu.boundaries.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/inventory-menu.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/shop-menu.ts` | product | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/shop-menu.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/shop-menu.boundaries.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/shop-menu.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/equip-menu.ts` | product | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/equip-menu.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/equip-menu.boundaries.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/equip-menu.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/in-game-menu.ts` | product | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/in-game-menu.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/in-game-menu.boundaries.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/in-game-menu.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/magic-select.ts` | product | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/magic-select.boundaries.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/magic-select.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/__tests__/item-magic-select.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/in-game-magic-menu.ts` | product | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/in-game-magic-menu.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/in-game-magic-menu.boundaries.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/in-game-magic-menu.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/inventory-action-menu.ts` | product | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/inventory-action-menu.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/inventory-action-menu.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-94 集成候选；治理分支 CODE83–89/91 逐文件审阅与CODE92源字节一致性证据已接收；Codex R2全文/caller/oracle复核见evidence/CODE-QUALITY-94/codex-r2-review.md；counter，统一门与机制/测试返工未闭合 | 不借源分支全绿关闭；不带CODE53/90实现 |
| `packages/game/src/core/menu/magic-script.ts` | product | review | CODE-QUALITY-90；SDLPal `script.c:1052-1102`/`global.c:2279-2344`、runtime/menu-driver/event-opcode-player；41 targeted、518 adjacent、4 exact mutation controls；full check/official ratchet/protected fast/lint/docs 均通过 | revive <=999 repair only; full spell-chain/input/unsupported-op/step-limit contract not closed |
| `packages/game/src/core/menu/magic-script.test.ts` | test | review | CODE-QUALITY-90；真实 GameState HP/status/poison oracle；999/1000/32760、party [2,0] 与 party 外隔离；先红后绿/4 mutations | poison-table cleanup, remaining synthetic fixtures and full runner input/unsupported-op/step-limit review remain unclosed |
| `packages/game/src/core/menu/sell-menu.ts` | product | review | CODE-QUALITY-93；全文/SDLPal uigame/itemmenu/global、menu-driver/bootstrap/event/draw caller 已核；96 定向相邻、typecheck、3 精确反控通过 | check/ratchet/protected fast/lint/docs/ledger全部通过；实现未改；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/core/menu/sell-menu.test.ts` | test | review | CODE-QUALITY-93；typed Item/GameState、公共导航/选择/意图与 cash/inventory ownership oracle；确认默认重置反控 | 已移除强转，独立导航/取消/意图合同；check/ratchet/protected fast/lint/docs/ledger全部通过；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/core/menu/sell-menu.boundaries.test.ts` | test | review | CODE-QUALITY-93；inUse 等值、confirm 期四键逐次不变、等长/空/增表与非零 cursor oracle；2 精确反控 | typed fixture；独立输入轴与快照不别名；check/ratchet/protected fast/lint/docs/ledger全部通过；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `packages/game/src/core/menu/sell-menu.glm-phase1-leaves.test.ts` | test | review | CODE-QUALITY-93；真实公共入口进入 confirm，空库存与重复选择/确认合同 | 已删与主测试重复的缩表用例；check/ratchet/protected fast/lint/docs/ledger全部通过；3Y-CLOSEOUT当前复审未完成，旧关闭只保留历史 |
| `scripts/coverage/approved-test-retirements.mjs` | tool | review | QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1；精确身份/源SHA与66例真实工具回归见[证据](../evidence/QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1/README.md) | matcher不变；历史表各输入来源未在本片重核，统一门待续，不关闭 |
| `scripts/coverage/approved-test-retirements.test.mjs` | tool | review | QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1；精确身份/源SHA与66例真实工具回归见[证据](../evidence/QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1/README.md) | matcher不变；历史表各输入来源未在本片重核，统一门待续，不关闭 |
| `packages/game/src/core/menu/primitives.ts` | product | review | Codex takeover: page helpers remain test-only/unknown; false SDL page anchor and selectable guarantees corrected; no API or behavior change | evidence/CODE-QUALITY-94/codex-takeover.md; no closure |
| `packages/game/src/core/menu/item-select.ts` | product | review | Codex takeover: equip bit and Important approximation comments corrected; production matchesFilter retained; factory cleanup remains review | evidence/CODE-QUALITY-94/codex-takeover.md; no closure |
| `packages/game/src/core/menu/opening-menu.ts` | product | review | Codex R3: choice dedupe accepted; title cancel fixed in driver after user approval, real chain/browser verified; global diagnostics remain | evidence/CODE-QUALITY-94/codex-takeover.md; no closure |
| `packages/game/src/core/menu/player-status.ts` | product | review | Codex takeover: role index versus object ID comment corrected; currentRoleId test-only remains review | evidence/CODE-QUALITY-94/codex-takeover.md; no closure |
| `packages/game/src/core/menu/menu-driver.ts` | product | review | Codex takeover: C4 legal-role oracle red/green, handler cast removed, approved title cancel cursor fixed; 125 targeted/3564 game tests pass; global diagnostics remain | evidence/CODE-QUALITY-94/codex-takeover.md; no closure |
| `packages/game/src/core/menu/save-slot-menu.ts` | product | review | Codex takeover: removed self-model test; documented actual direct Save/handler, cancel ownership and dual storage path | evidence/CODE-QUALITY-94/codex-takeover.md; no closure |
| `packages/game/src/core/save/api.ts` | product | review | CODE-101 C5 返工后：头注释已更正（E-10 关闭，双路径现状）；"hot-reload 已处理"过 claim 已回收（openDb 失败缓存/未 close 未证） | NaN/小数合同列 review 不改接口；U-1 引用既有卡；待 Codex 再验收 |
| `packages/game/src/core/save/indexed-db.ts` | product | review | 用户批准后c81f469e3修复：put/delete等transaction complete；success后abort拒绝并保留旧槽，真实Save调用回归通过 | GAME-SAVE-IDB-COMMIT-1仍review等完整门；连接/失败缓存未决不关闭 |
| `packages/game/src/core/save/__tests__/indexed-db.test.ts` | test | review | 用户批准事务修复的新三条真实Save→IDB回归：提交时机/正常存读删、覆盖abort保旧槽、删除abort保旧槽；完整typed GameState，独立IDBFactory及连接/global/spy清理 | 作者自验，尚未独立闭合；不以3绿或覆盖率升高关闭文件 |
| `packages/editor/src/ui/SpriteResourceViewer.c03-g03.cursor-r1.test.tsx` | test | review | QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1；全文/caller/反例/真实IO/有效反控见[证据](../evidence/QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1/README.md) | 20例先清51act再精确退役1条；19定向0诊断，相邻63act/全域排重/完整门待续，不关闭 |
| `packages/editor/src/ui/SpriteResourceViewer.c03-g04.cursor-r1.test.tsx` | test | review | QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1；全文/caller/反例/真实IO/有效反控见[证据](../evidence/QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1/README.md) | 20例先清51act再精确退役1条；19定向0诊断，相邻63act/全域排重/完整门待续，不关闭 |
| `packages/editor/src/ui/SpriteResourceViewer.kimi-workflows.test.tsx` | test | review | QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1 C09；全文/合法输入/caller/oracle与反控见[本片](../evidence/QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1/c09/README.md) | 五例身份保留；宿主去重/真实IO与提交等待56→44→0act，两枚反控旧新各4绿1指定业务红；全域排重/统一门待续，0关闭 |
| `packages/editor/src/__tests__/cursor-asset-r1/upload-harness.tsx` | test | review | QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1；全文/caller/反例/真实IO/有效反控见[证据](../evidence/QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1/README.md) | 20例先清51act再精确退役1条；19定向0诊断，相邻63act/全域排重/完整门待续，不关闭 |
| `packages/editor/src/__tests__/cursor-asset-r1/upload-ui.ts` | test | review | QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1；全文/caller/反例/真实IO/有效反控见[证据](../evidence/QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1/README.md) | 20例先清51act再精确退役1条；19定向0诊断，相邻63act/全域排重/完整门待续，不关闭 |
| `packages/editor/src/__tests__/cursor-asset-r1/world-sprite-harness.tsx` | test | review | QUALITY-EDITOR-DIAGNOSTICS-1；全文与真实viewer/cache/session调用已核；604→200→0分步诊断证据见evidence/QUALITY-EDITOR-DIAGNOSTICS-1 | 另核QUALITY-EDITOR-WORLD-SPRITE-DIAGNOSTICS-1；共享sprite/palette IO与finally清理，9定向/121相邻0诊断；全域caller/统一门待核，不关闭 |
| `packages/editor/src/ui/WorldSpriteLibrary.kimi-workflows.test.tsx` | test | review | QUALITY-EDITOR-WORLD-SPRITE-DIAGNOSTICS-1；全文/caller/原始诊断与有效反控见[证据](../evidence/QUALITY-EDITOR-WORLD-SPRITE-DIAGNOSTICS-1/README.md) | 9身份保留、121相邻零诊断；全域排重/其它caller/新窗口未完成，不关闭 |
| `packages/editor/src/ui/WorldSpriteLibrary.glm-ui-wave.test.tsx` | test | review | QUALITY-EDITOR-WORLD-SPRITE-DIAGNOSTICS-1；全文/caller/原始诊断与有效反控见[证据](../evidence/QUALITY-EDITOR-WORLD-SPRITE-DIAGNOSTICS-1/README.md) | 9身份保留、121相邻零诊断；全域排重/其它caller/新窗口未完成，不关闭 |
| `packages/editor/src/ui/__tests__/kimi-editor-workflows/k02-fixtures.ts` | test | review | QUALITY-EDITOR-WORLD-SPRITE-DIAGNOSTICS-1；全文/caller/原始诊断与有效反控见[证据](../evidence/QUALITY-EDITOR-WORLD-SPRITE-DIAGNOSTICS-1/README.md) | 9身份保留、121相邻零诊断；全域排重/其它caller/新窗口未完成，不关闭 |
| `packages/editor/src/__tests__/cursor-asset-r1/kit.ts` | test | review | QUALITY-EDITOR-DIAGNOSTICS-1；全文与真实viewer/cache/session调用已核；604→200→0分步诊断证据见evidence/QUALITY-EDITOR-DIAGNOSTICS-1 | 作者自验；3个oracle有效反控，67定向0诊断；完整门带外部诊断/其它caller待核，不关闭 |
| `packages/editor/src/ui/WorldSpriteLibrary.c01.cursor-r1.test.tsx` | test | review | QUALITY-EDITOR-DIAGNOSTICS-1；全文与真实viewer/cache/session调用已核；604→200→0分步诊断证据见evidence/QUALITY-EDITOR-DIAGNOSTICS-1 | 作者自验；3个oracle有效反控，67定向0诊断；完整门带外部诊断/其它caller待核，不关闭 |
| `packages/editor/src/__tests__/cursor-asset-r1/battle-sprite-harness.tsx` | test | review | QUALITY-EDITOR-DIAGNOSTICS-2；全文/caller与G04生命周期消融见[证据](../evidence/QUALITY-EDITOR-DIAGNOSTICS-2/README.md) | G04十例局部0诊断；其它caller/排重及全仓门仍待核，不关闭 |
| `packages/editor/src/__tests__/cursor-asset-r1/battle-sprite-ui.ts` | test | review | QUALITY-EDITOR-DIAGNOSTICS-2；全文/caller与G04生命周期消融见[证据](../evidence/QUALITY-EDITOR-DIAGNOSTICS-2/README.md) | G04十例局部0诊断；其它caller/排重及全仓门仍待核，不关闭 |
| `packages/editor/src/ui/BattleSpriteLibrary.c02-g04.cursor-r1.test.tsx` | test | review | QUALITY-EDITOR-DIAGNOSTICS-2；全文/caller与G04生命周期消融见[证据](../evidence/QUALITY-EDITOR-DIAGNOSTICS-2/README.md) | G04十例局部0诊断；其它caller/排重及全仓门仍待核，不关闭 |
| `packages/editor/src/ui/BattleSpriteLibrary.c02-g01.cursor-r1.test.tsx` | test | review | QUALITY-EDITOR-DIAGNOSTICS-3；全文/真实caller与生命周期证据见[本片](../evidence/QUALITY-EDITOR-DIAGNOSTICS-3/README.md) | 29定向/77相邻0诊断；pending反控与oracle转移已测；完整门仍有全仓诊断，不关闭 |
| `packages/editor/src/ui/BattleSpriteLibrary.c02-g02.cursor-r1.test.tsx` | test | review | QUALITY-EDITOR-DIAGNOSTICS-3；全文/真实caller与生命周期证据见[本片](../evidence/QUALITY-EDITOR-DIAGNOSTICS-3/README.md) | 29定向/77相邻0诊断；pending反控与oracle转移已测；完整门仍有全仓诊断，不关闭 |
| `packages/editor/src/ui/BattleSpriteLibrary.c02-g05.cursor-r1.test.tsx` | test | review | QUALITY-EDITOR-DIAGNOSTICS-3；全文/真实caller与生命周期证据见[本片](../evidence/QUALITY-EDITOR-DIAGNOSTICS-3/README.md) | 29定向/77相邻0诊断；pending反控与oracle转移已测；完整门仍有全仓诊断，不关闭 |
| `packages/editor/src/ui/BattleSpriteLibrary.kimi-workflows.test.tsx` | test | review | QUALITY-EDITOR-DIAGNOSTICS-4；全文/真实caller及三反控见[本片](../evidence/QUALITY-EDITOR-DIAGNOSTICS-4/README.md) | 六例398→0；两旧绿/新红oracle，统一门与未知排重待核，不关闭 |
| `packages/editor/src/__tests__/cursor-asset-r1/battle-sprite-fixtures.ts` | test | review | QUALITY-EDITOR-DIAGNOSTICS-4；全文读取与复用caller见[本片](../evidence/QUALITY-EDITOR-DIAGNOSTICS-4/README.md) | 本片仅头注改为测试复用，未改构造实现；输入防御与全库caller未逐项闭合 |
| `packages/editor/src/ui/design-system/navigation.glm-leaf-wave.test.tsx` | test | review | QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1；全文/真实事件/caller见[证据](../evidence/QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1/README.md) | native 1→0，六例保留；public helper无生产caller与统一门仍待核，不关闭 |
| `packages/reforge/src/main.host-lifecycle-1.test.ts` | test | review | QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1；全文/真实reload与旧绿新红见[证据](../evidence/QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1/README.md) | native 1→0，八例保留；音频端口/其它故障与统一门未清，不关闭 |
| `packages/editor/src/ui/LevelingEditor.test.tsx` | test | review | QUALITY-EDITOR-FORM-FIXTURES-1；全文/caller/合法输入/oracle见[证据](../evidence/QUALITY-EDITOR-FORM-FIXTURES-1/README.md) | 定向与相邻零诊断；统一门及未知排重仍待核，不关闭 |
| `packages/editor/src/ui/LevelCurveEditor.ui.test.tsx` | test | review | QUALITY-EDITOR-FORM-FIXTURES-1；全文/caller/合法输入/oracle见[证据](../evidence/QUALITY-EDITOR-FORM-FIXTURES-1/README.md) | 定向与相邻零诊断；统一门及未知排重仍待核，不关闭 |
| `packages/editor/src/ui/CasualtyEditor.test.tsx` | test | review | QUALITY-EDITOR-FORM-FIXTURES-1；全文/caller/合法输入/oracle见[证据](../evidence/QUALITY-EDITOR-FORM-FIXTURES-1/README.md) | 定向与相邻零诊断；统一门及未知排重仍待核，不关闭 |
| `packages/editor/src/ui/CasualtyEditor.glm-m.test.tsx` | test | review | QUALITY-EDITOR-FORM-FIXTURES-1；全文/caller/合法输入/oracle见[证据](../evidence/QUALITY-EDITOR-FORM-FIXTURES-1/README.md) | 定向与相邻零诊断；统一门及未知排重仍待核，不关闭 |
后续每个 Q3b/Q3c/Q4/Q5/Q6 子批都必须先把文件加入这里并写直接证据；只跑 `pnpm check`、只看 lint、只看覆盖率或只看静态计数，都不能把 `待核` 变成已审。全量账本未清零前，专项不得宣布“所有代码治理完成”。

2026-10-14 CODE92 门纠错收口：`TYPE_PAL_COVERAGE_BASE_REF=origin/main VITEST_MAX_WORKERS=1 pnpm coverage:fast` 在新 baseline `edbcad970` 后 exit 0，7包/731 files/19,870 tests；30/30 当前源码与各自关闭提交字节一致。恢复 CODE83–89/CODE91 关联30条记录为已验证。CODE90 两文件仍 review，event-system 与其它 pending/review 不因门通过关闭。当前 inventory3271：closed370/review12/pending2889。

2026-10-14 CODE95 集成前语义 counter：3份旧测试仍含非法 PlayerRoles 对象映射/最小不完整角色/Item fixture，强转掩盖 public 输入合同。撤回3条已验证并转review；源字节相同和 protected 全绿不能替代合法输入验收。修复仅在独立 codex/code-quality-menu-integration，原分支正在 coverage 时不改测试。当前 inventory3271：closed367/review19/pending2885；CODE93四文件仍review。

2026-10-14 CODE93/96收口：只关闭sell-menu四文件和精确退役保护账两工具文件；全文/caller/primary/oracle、96相邻定向、59coverage工具、37quality工具、game与七包typecheck、全仓check、official ratchet、真实protected fast、最终lint/docs/ledger通过。731生产源码/19874fast tests；退役只准指定3→2/count+identity+SHA，规则/阈值/生产范围未降。CODE95三旧测试继续review，未以候选绿灯恢复旧字节信用。机器库存3271：closed373/review15/pending2883。用户指定当前部分后Codex停止，下一位GLM先接CODE94/95独立集成候选，不整条合旧治理分支；全仓专项尚未完成。

## 验收线合入前的历史补充


2026-10-15 Codex三验：候选5477af1e4、main=f98d0ddd8，独立0behind/17ahead；[R3逐文件与反证](../evidence/CODE-QUALITY-94/codex-r3-review.md)。C5有效typed/排重/错误反馈局部接收；CODE95三份局部accept但仍review；新发现quick-save匿名监听器泄漏、driver C4空角色假正例、无必要双重强转、残留错误注释及一条candidate SHA过时。三份GAME高风险draft维持；所有原review/pending状态保持，0新关闭；3283/229closed/44review/3010pending。用户授权Codex接手低风险返工，后续修复另记，不追溯改作者回执。

后续每个 Q3b/Q3c/Q4/Q5/Q6 子批都必须先把文件加入这里并写直接证据；只跑 `pnpm check`、只看 lint、只看覆盖率或只看静态计数，都不能把 `待核` 变成已审。全量账本未清零前，专项不得宣布“所有代码治理完成”。

2026-10-14 CODE94 独立 menu 集成窗口：从最新 origin/main cddf65557 建分支，仅接收治理分支已闭合30条 menu 记录及其测试治理候选，完整原卡/证据保留。集成前暂登记 review，当前机器 inventory3267：closed229/review35/pending3003；主线其它 pending 不升级，不导入 CODE53/90 等未收口生产行为。
2026-10-15 CODE94/95 GLM 复核：30/30 全文复核（四维质量+caller/oracle）与 manifest SHA 机械核验完成；CODE95 三份 fixture 修复裁定合法且 oracle 无弱化；定向241/typecheck/docs/lint-zero 4012/ledger 独立复跑通过；protected fast 首跑 fail-closed（范围变化 4 文件/+2 测试）后经 official ratchet 确认新基线再复跑，回执见 evidence/CODE-QUALITY-94。30 条仍 review 交 Codex 独立验收，不因本批复核自动 closed。
2026-10-15 CODE-QUALITY-97 review-only 批：新增 primitives/item-select 两行 review（四维结论+E-4/E-5 死面登记），review35→37、pending3003→3001；零代码改动，与 CODE94/95 批共用 5cb6b9d22 树的完整门禁。
2026-10-15 CODE-QUALITY-98 review-only 批：新增 opening-menu/player-status 两行 review（四维结论+E-6 currentRoleId test-only 登记），review37→39、pending3001→2999；零代码改动，共用 5cb6b9d22 树门禁。
2026-10-15 CODE-QUALITY-99 review-only 批：新增 menu-driver.ts 一行 review（四维结论+E-8 死参/E-9 死导出+E-7 menu-driver.test.ts fixture counter 同 CODE95 口径），review39→40、pending2999→2998；零代码改动，共用 5cb6b9d22 树门禁。
2026-10-15 CODE-QUALITY-100 review-only 批：新增 save-slot-menu.ts 一行 review（存档域边界切片，无 schema/写路径触碰，四维通过），review40→41、pending2998→2997；零代码改动，共用 5cb6b9d22 树门禁。
2026-10-15 CODE-QUALITY-101 review-only 批：新增 save/api.ts + indexed-db.ts 两行 review（schema/save 边界零触碰；E-10 注释过时/E-12 IDB 驱动无 game 内直接测试登记；U-1 引用既有卡），review41→43、pending2997→2995；零代码改动，共用 5cb6b9d22 树门禁。
2026-10-15 CODE-QUALITY-102 review-only 批：新增 quick-save.ts 一行 review（四维通过；quick-save.test.ts E-13 as never 部分 GameState fixture 登记），review43→44、pending2995→2994；零代码改动，共用 5cb6b9d22 树门禁。

2026-10-15 Codex独立验收CODE94/95：GLM全仓check/ratchet/protected终跑分别含3489/3527/3499条React act警告，各另2条jsdom导航诊断；exit0及lint0不构成干净统一门。已证inventory-menu旧id0/stub注释、组合测试flags入参强转和合并报告证据问题，CODE94返工。CODE95局部修正通过独立241定向/typecheck，但30条保持review，closed不增加；CODE97–102未在本次验收范围。当前机器ledger口径不因counter改数。

同次caller复核追加CODE95 counter：inventory-menu.test以applyToAll=true物品直接进单体目标层，违背menu-driver/SDLPal实际picker前提；typed字段修正不等于真实调用域成立。CODE95同样返工；没有新增关闭，所有原review计数不变，详见CODE94/codex-review.md R4。

2026-10-15 Codex R2独立再验收：候选1f8bcd468，CODE94/97–102 counter/rework；CODE95三份fixture局部accept、状态review，完整门未收。30条manifest源码与额外97–102范围逐文件全文读取，实际caller段落、SDLPal/W3C及反证详见[evidence/CODE-QUALITY-94/codex-r2-review.md](../evidence/CODE-QUALITY-94/codex-r2-review.md)。所有既有review/pending保持，0新关闭；3267/229closed/44review/2994pending，不借36files/323tests或包绿关闭。三份GAME高风险draft卡仅登记，未改产品/schema/save/公共接口。原GLM的完整门声明被counter覆盖，旧原件保留。

2026-10-15 Codex R2同步最新main 8f5d17ff1：保留本候选44条review与主线新增16条音乐pending；3283/229closed/44review/3010pending。没有新closed，没有把治理合main；此前3267口径仅历史候选。
2026-10-15 C5 返工（codex-r2-review）：94/97-102 白名单内注释/fixture/排重/判别力修正（E-7/E-10/E-13 关闭，E-1..E-6/E-8/E-9/E-12 维持）；pageDown 钳制真实语义钉真；三个高风险机制（C2/C3/C4）归 GAME-* draft 卡未动。计数不变（229/44）。

2026-10-15 Codex takeover after R3: 6766a3c2e / 01931b3f2 / 0a039271c repair test oracles/isolation and comments only; manifest digests recomputed. All ledger statuses unchanged: 3283 inventory /229 closed /44 review /3010 pending; no file closure. Test and commentary fixes are author-verified, not a new independent acceptance. Full gate and product-risk cards remain open; see evidence/CODE-QUALITY-94/codex-takeover.md.

2026-10-15 Codex最终模块窗口：稳定源码bb94ad8e2；两项用户批准行为已修并推送，125定向与game3564通过。
全仓check/ratchet/protected均exit0但分别3620/3610/3523条未包act，另各577条act环境与2条导航，零诊断门不通过。
官方fast基线736源文件/19865tests、覆盖率无回退，精确历史退役通过；未合main。
实际读取/逐文件改动、primary/caller/oracle、原件完整性与下一片边界见
[完整窗口](../evidence/CODE-QUALITY-94/codex-final-window.md)。所有状态保持；3284/229closed/45review/3010pending，0新关闭。

2026-10-15 editor首片：三个既有文件仅从pending转review；229closed/48review/3007pending，库存3284不变。生命周期定向70通过且诊断0，typecheck通过；oracle、相邻与完整模块门待续，0新关闭。

2026-10-15 editor首片完整窗口：c8ad9416f，67定向0诊断、3有效反控、精简3严格重复；七包20271与typecheck通过。
check/确认版ratchet/普通protected均exit0，但未包act3001/3009/2955、各577环境/2导航，零诊断门不通过，未合main。
首跑ratchet确认门exit1原件保留，官方基线736/19862且所有覆盖计数完全不变。
[逐文件/读取边界及全部原件](../evidence/QUALITY-EDITOR-DIAGNOSTICS-1/window-review.md)。3284/229closed/48review/3007pending，0文件关闭。

2026-10-15 C02三文件review：G04十例404→0，全部oracle保留后合并一条undo重复，最终九例0诊断、两有效反控。完整门及其它caller/全库排重未闭合；3284/229closed/51review/3004pending，0新关闭。见[本片证据](../evidence/QUALITY-EDITOR-DIAGNOSTICS-2/README.md)。

C02完整窗口7433f71f5：七包20270与typecheck通过，check/确认版ratchet/protected仍带2049/2076/2081条act、577/584/584环境与各2导航；零诊断门不通过。官方baseline736/19861、覆盖计数不变，未合main，三个review不升级closed。见[完整窗口](../evidence/QUALITY-EDITOR-DIAGNOSTICS-2/window-review.md)。

2026-10-15 C02导入/历史三测试仅从pending列review；共用UI助手已在review，本轮仍review。3284/229closed/54review/3001pending，0文件关闭。

2026-10-15 用户要求94前回溯：36卡结构盘点、8卡与13源码/测试/工具全文抽查，四条旧关闭因直接前提/fixture/注释counter撤回；3284/225closed/75review/2984pending，0新关闭。旧计数保持历史，未复验其它225条。见[回溯](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/README.md)。

2026-10-16 CODE75复审Y01：统一3y保留main MIDI产品与12例测试原字节，删除已证明合同重复且库协议过期的旧boundaries两例（原件无损留存）。12定向、44相邻、game typecheck均通过且无运行时诊断；隔离stop代际失效仅指定业务断言失败，恢复12绿并独立核SHA/身份/清理。账本仅删除退役review行、将现有main测试pending转review；机器结果3287/223closed/198review/2866pending，0新增关闭。58卡整体验收和check/official ratchet/两父protected fast仍待集中窗口，不因本片通过合main。

2026-10-16 C09 Viewer真实编辑宿主：目标五条原身份保留，宿主消融56→44act，实际解码/提交/revision和迟到读取完成等待后0；两针业务反控旧/新各4绿1指定红，最终恢复5绿。相邻80通过但其它63act；editor typecheck、docs/lint-zero/ledger通过，完整editor包631/4945全绿但759act/243环境及1只读表单告警，零诊断未过。仅目标pending→review，共享helper仍review，3287/223closed/199review/2865pending，0新关闭；全仓门留稳定窗口，未合main。

2026-10-16 CODE3c复审：真实缺帧像素/终点两反控有效，但活动timer卸载变异旧1例仍绿；同一原用例补证后新精确一红，生产/规则/baseline不改。editor八文件36绿仍6act，reforge相邻22零诊断、editor typecheck通过；两旧关闭精确转review，0新增关闭，机器已重新确认213closed/211review/2863pending。原卡最终是动画回归而非已证runner缺陷，整卡partial、统一门待续。

2026-10-16 CODE3复审：两测试修A2/reset/EO三个判别力缺口，四文件28身份保留，三针旧28绿/新各27绿1指定AssertionError。元数据伪边/计数goto停线专卡draft，生产与资源未改。raw43503指令roundtrip一致、当前元数据投影相同，17非零goto待核实际影响；定向45、extract72/434+typecheck、shared16/126+typecheck通过，0新关闭。机器已重跑确认211closed/214review/2862pending，统一门及editor诊断未清。

2026-10-16 CODE3/3f标注测试复审：两测试完整expected与真实输入守恒补证，六针旧17绿/新各15绿1指定AssertionError；四重复精简/混合合同拆分，总17→16，精确退役表25项净59，matcher/baseline不改。定向52/shared126/工具70与typecheck通过；完整extract虽433 passed，但完整stderr十块、六例原盘路径错误早退，包验收不通过，优先draft原盘执行卡。此前434包结果的“零诊断”仅三模式计数，现明确纠正，原日志保留。两旧关闭撤回review、0新增关闭；机器已按本轮原命令确认209closed/216review/2862pending。全83卡9partial/74pending/0accept，统一门及editor未清，不合main。

2026-10-16 Extract原盘执行完整性：修两测试错误root/六早退，native SDL1332图像固定RGBA，七反控旧21绿/新各19绿1指定AssertionError，空块重复由GLM承接21→20。新增唯一test-only摘要helper，四文件仅登记review；机器原命令已确认库存3288、209closed/220review/2859pending，0新关闭。定向36/shared126及typecheck通过；完整extract432绿仍4stderr块/46行，包级零诊断不通过。规则/baseline/25项退役表与生产/资源原字节不动；统一门及editor待续，未合main。

2026-10-16 C1 BALL/RGM诊断IO：六旧漏日志反控和两个新harness合同各精确一业务AssertionError，重复高度反控旧2红→新1红，21→20。新增同步test-only Console边界，真实warn/原Error全核；两生产解析器局部V8 covered/total前后一致。53定向/shared126/typecheck/工具71通过，完整extract431仍2stderr块，包级零诊断未过；static门待原命令，规则/baseline/产品不改。机器原命令已确认3289/209closed/223review/2857pending，0关闭；全83卡9partial/74pending/0accept，续C2和94–102/editor。

2026-10-16 C2敌队测试：完整DTO/ownership/真实诊断，七旧绿新红与两既有oracle保留/转移；生产和baseline未改，完整extract431零stderr，相邻shared126/game186/TC通过。两测试pending→review；enemies.ts注释不存在的slots字段直接counter，旧关闭撤回review。机器3289/208closed/226review/2855pending，0新关闭；统一门未新跑，83卡复审未完成。

2026-10-16 CODE3b当前复审：两boundary补六判别力缺口与父buffer/完整字段，原拒绝轴拆独立5+2；生产不变。独立raw struct全量对照一致，正文codec不冒称重验。42相邻/extract435/shared126/TC/71工具通过，0stderr；两test旧关闭精确重开，两个raw sanity pending→review，0关闭。机器3289/206closed/230review/2853pending；全83卡10partial/73pending/0accept，统一门仍待editor稳定窗口。
