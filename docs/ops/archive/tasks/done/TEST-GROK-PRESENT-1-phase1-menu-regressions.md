# TEST-GROK-PRESENT-1 — 一阶段菜单与索引渲染十组候选回归

Status: done
Owner: Codex（正式接入及产品实现）
Contribution Owner: Grok（隔离非视觉候选测试）
Reviewer: Codex
Phase: phase1
Capability: 一阶段菜单/渲染验证准备；不改玩法或能力格
Visual Verification Timing: N/A（像素数组断言不是视觉验收）
Branch: codex/grok-present-tests-r1

Revision: r1
Evidence freeze: 1763ac58

## 目标和并行边界

用户2026-09-25说明Grok有大量额度，可承担中等复杂工作。首包给十组真实绘制调用的非视觉候选回归，
按顺序连续完成；不需要截图、浏览器或PAL原版输入。Grok不是三贤人签字席位，不代签Kimi/GLM。
只在[隔离实验目录](../../../../testing/grok-present-regressions/README.md)产出测试/证据，draft准备可执行；
**不开放产品build或正式测试接入**，不直接修改一阶段/二阶段代码、资源与格式。

从本次Codex交付提交新建worktree `/Users/zhangxu/illegal/type-pal-grok-present`，
分支`codex/grok-present-tests-r1`；开工核工作树/路径归属，不在main、GLM或Cursor目录切分支。
本包交付提交在独立复核分支，不为取包合main。源码冻结1763ac58，新提交只含工作分配文档。

分工互斥：GLM负责其八组跨模块/生命周期与四组视觉，Cursor负责工具纯函数；Grok不重领这些工作。
允许菜单绘制读取真实核心getter/公开状态工厂，但不扩审事件解释器/装备写入/迁移；Codex A3主线不触碰。
前两批文档材料accept、五份指南修订门与原有full/E2E/Q1/Q2边界保持不变。

## 选题依据与前提真值

Codex只读现有`coverage/fast/summary.json`及game coverage-summary：快照生成于
2026-09-24T16:44:10.539Z，8034项/641生产文件；inventory/equip/shop绘制较弱。
这是排期线索，不是本包重跑结果，也不能证明所有候选轴都缺测。源码/既有断言仍须逐组核对去重。

| 真值方向 | 本包依据与限制 |
|---|---|
| 原版/primary reference | `reference/sdlpal/itemmenu.c:29`、`magicmenu.c:36`、`uigame.c:1289/1503/1615/1710/1755/1794`为已入库参考实现的菜单入口；`battle.c:62-76`为背景色阶处理。它们不是原版二进制实测，不冒称PAL原版验证 |
| 当前第一阶段 | `present/menu/draw-inventory.ts`的DrawInventoryInput/drawInventoryMenu、draw-equip/draw-shop/draw-menu等公开入口；`present/framebuffer.ts:20`真实像素缓冲；现有测试与下表精确去重文件 |
| 当前第二阶段 | N/A：不验证Reforge/editor消费者，不把phase1角色数组下标规则推广至phase2 |
| 本任务目标 | 对既有已核合同补自包含输入、最终索引像素、只读状态保真与可定位失败证据；代码/玩法/格式零变化，候选未经Codex接收不进官方统计 |

先读AGENTS/CLAUDE的阶段纪律、`docs/phase1/engineering-notes.md`§1.3/§2.1/§3.7/§3.8，
以及`docs/phase1/game-mechanics.md`§攻击力/防御值由什么构成（约201-207行）。涉及其它机制时补读该节，
不能用伪造公式生成期望；本包只观察预设数据被正确显示，不改计算机制。
最强替代解释：旧用例已经充分覆盖；synthetic UI帧/字形过于相同掩盖错位；构造了真实工厂到不了的菜单态；
把SDL参考和当前已批准差异混为一谈。遇到这种情况记existing-proof/invalid-fixture/pending-contract，先排除再报bug。

## 十组执行范围

以下路径均相对`packages/game/src/`；每组先搜索整个包的现有调用/测试，不能只看同名文件是否存在。
渲染必须走真实draw/数字/文字/Framebuffer实现，输入层正反对照，不把mock调用次数当画面已正确。

| 组 | 主入口 / 去重入口 | 验证轴 | 候选文件 |
|---|---|---|---|
| P01 物品列表 | `present/menu/draw-inventory.ts:drawInventoryMenu`；core/menu inventory/item-select及present同域旧例 | 空/非空、多于一页的合法列表与移动后光标；可用/不可用/装备虚拟条目的实际色/数量；opaque索引0与透明孔分开。固定Date，避免选中色抖动 | `tests/p01-inventory-list.test.ts` |
| P02 物品目标 | 同入口的use-target/noDesc路径；`core/menu/inventory-menu.ts`公开create/confirm函数与旧例 | 通过真实入口进入目标选择；角色顺序非roleId顺序的两人队；显示当前HP/MP/有效属性；旧菜单库存快照与gs实时数量不同，必须证明读到现行合同的数据；noDesc不误关目标层 | `tests/p02-inventory-target.test.ts` |
| P03 装备绘制 | `present/menu/draw-equip.ts:drawEquipMenu`；`core/menu/equip-menu.ts`与旧例 | list→pick-role、可装备/不可装备、现有六槽名称、选中图标/数量/预览属性及背景有无；多角色身份正确，重复绘制不改gs/catalog/menu。预览具体读取源先核代码/合同，不臆造临时换装机制 | `tests/p03-equip.test.ts` |
| P04 商店 | `present/menu/draw-shop.ts:drawShopMenu/drawSellOverlay`；core/menu shop/sell旧例 | 非空买列表/确认层/卖overlay；现有量含背包与队内装备，钱/价格/选中图标各有不同哨兵；不涉及真实买卖执行或价格政策改动 | `tests/p04-shop.test.ts` |
| P05 菜单栈转发 | `present/menu/draw-menu.ts:drawMenuStack`及draw-menu.test.ts | 用公开openMenu与状态工厂组合法栈，验证extra的items/icons/roles/bg/poisons传到真实下层绘制；至少一个合成图标/数值在最终像素可区分。不要把旧hub/system六例换名重写，不mock下层draw函数 | `tests/p05-menu-stack.test.ts` |
| P06 仙术页 | `present/menu/draw-magic.ts:drawInGameMagicMenu`；draw-magic.test.ts两例及core/menu in-game-magic旧例 | 施法者/仙术/目标三阶段合法状态，MP够/不足、非空描述、翻页与两人不同属性；既有WIN95布局不重开，不计算战斗伤害。只读绘制不授技/扣MP | `tests/p06-magic.test.ts` |
| P07 角色状态 | `present/menu/draw-player-status.ts:drawPlayerStatus`；draw-player-status.test.ts毒row三例及core/menu player-status旧例 | 非空装备/立绘/角色切换/等级经验/HP-MP；以真实Framebuffer补充现有spy证据，毒名已有合同复用不换名复制；角色id与队列位置错开，状态/输入不被绘制污染 | `tests/p07-status.test.ts` |
| P08 结算呈现 | `present/battle/draw-battle-settlement.ts:drawBattleSettlement`；对应__tests__/draw-battle-settlement.test.ts及present-battle旧例 | exp-cash/level-up/hidden-exp-up/learn-magic四种公开screen输入；非空旧/新属性和名称，实际数字/箭头/文本区域可区分；不计算或重复结算经验奖励，不改hiddenExp机制 | `tests/p08-settlement.test.ts` |
| P09 背景索引链 | `present/battle/draw-battle-bg.ts`→真实Framebuffer→toImageData；draw-battle-bg/framebuffer旧例 | 合法正/负bgColorShift的低半字节边界、高半字节保留、不透明0；真实尺寸裁剪与输出RGBA对应。期望手算少量代表像素，范围从真实caller/SDL reference核定，不任意fuzz非法值 | `tests/p09-background.test.ts` |
| P10 PNG消费/释放 | `assets/png.ts:decodePngToIndices`→`toSpriteImages/drawSprite`→Framebuffer；png/draw-sprite/framebuffer旧例 | 小型真实PNG含opaque0/透明孔/不同非零索引，解码后消费链实际像素相符；解码失败与createImageBitmap之后绘制/getImageData失败的关闭归属，同输入正常对照。已有逐帧anchor六例只引用，别再复制 | `tests/p10-indexed-png.test.ts` |

## 测试质量与首次小样

1. 先完成P01一个非空列表像素正控、P02一条实时数量区别案例，确认真实入口/typed fixture/配置可运行，
   自检通过即可连续做余组，不必等Codex逐组签字。失败先归因fixture/环境/合同，不放大成产品问题。
2. 用`createInitialGameState`和相应公开菜单工厂/确认操作构造可达状态。第一阶段按shared/真实core类型，
   **不套第二阶段content guard**；`PlayerRoles`/`Item`/`Magic`等完整typed输入，不用as unknown as/ts-nocheck。
   两人队可故意用非连续roleId，但只在现行有效范围；队员1～3人，不发明四人玩法。
3. UI sprite帧/数字/名字字形用小型确定性数据，选中图标、数字1/2/3、背景/前景颜色必须能相互区分；
   同色全实心方块不能证明文字/数字身份。每个案例至少有非空正控，比较少量**独立手算**代表区域和未改区域，
   必要时比整缓冲，不直接从生产输出烘焙快照当oracle，不只断言“有像素/没抛错”。
4. 除Framebuffer输出、明确宿主资源生命周期外，绘制前取实际gs/menu/catalog/bitmap数据的独立快照，
   绘制后立即深比；create/confirm阶段与draw阶段分开，不能把菜单状态机的合法原地更新判成渲染污染。
   `toSpriteImages`共享输入数组是已有合同，不擅自要求深拷贝。
5. 只替代浏览器/时间/解码故障边界；不可mock真实draw/font/getter以决定像素结果。可用call-through spy辅助定位，
   但核心结论必须由真实输出证明。Date/global描述符、WordTable、global events等逐例恢复，finally不遮盖原错误。
   解码Promise用真实entered/结局，不靠sleep；资源要释放，真实pending必须消费完。
6. 发现违背已核合同的实现时保留`diagnostics/`独立失败例与正控，不skip/test.fails、降低断言或顺手修产品。
   原版/当前合同冲突停该子项并记pending-contract，其它组继续；不得把未知行为先写成“正确”。

## 少量关键反控

整包最多三组，优先P02实时数量、P05参数转发、P10 bitmap.close。对实际新增回归挑一处单点变异，
在本人的临时模块副本/隔离加载配置中进行，**原生产源hash前后不变**。每针有完整实现绿对照与精确差异，
断言必须由候选自身的业务结果变红；0执行/错标题/TypeError/超时/配置失败不算有效负控。
记录exact test file/fullName、命中见证、exit1与候选AssertionError；未能隔离或已有重叠保护如实登记，
不删多层守卫硬凑放行。允许复用已严格验证的判据模式，不复制整套大型突变框架。

## 白名单、环境与交付

唯一写入`docs/testing/grok-present-regressions/**`：

```text
README.md                    # 唯一交付摘要/证据索引
tests/p01-*.test.ts           # 上表P01～P10，缺口已充分覆盖可不新增
fixtures/{images,font,world,png-rgba}.ts  # P10真实PNG自包含编码夹具；不做生产解码替身
vitest.config.mts             # 显式候选配置，不改官方配置
tsconfig.json                # 候选/fixture真实类型检查
mutants.mjs                  # 可选，最多三组小型单点反控
diagnostics/pXX-*.test.ts     # 显式失败/待证，不进默认绿集合
```

- 当前Vitest为4.1.7，用仓内实际版本/类型校验配置，不照抄旧技能示例版本。配置指向本worktree真实game源码，
  保留所需jsdom/canvas宿主行为，可复用game/vitest.setup.ts；只include实验tests，诊断单独显式运行。
- 依赖按pnpm技能冻结锁文件安装；不加新依赖、不改锁文件，不整目录链接main/node_modules导致源码解析串树。
  缺native canvas时记录具体错误，不用手写PNG解码/静默skip掩盖；P01～P09可优先按真实可用宿主推进。
- 至多2 workers，候选/相邻/反控串行，去掉NODE_COMPILE_CACHE，不提高超时/retry、不跑benchmark。
  允许本包候选、明确相关现有present/core菜单测试、候选tsc、本人Biome及docs/diff检查；
  **不跑全仓check、官方coverage/ratchet/strict，不写baseline/include/exclude，不运行迁移/提取或浏览器**。
- 每两组一提交，十组连续交完；一组阻塞不拖其它组。测试数与失败数由Vitest JSON结果生成，日志在本人/tmp，
  README逐组列candidate-green / existing-proof / reproduced-defect / pending-contract / blocked-environment，
  给确切测试标题、去重差异、合同/source锚点、命令/cwd/exit、fixture自证及复现步骤，不手写多份总账。
- 整包交正文SHA/登记tip，原产品/旧测试/脚本/配置/资产零diff。Grok贡献须在正式终审披露，
  不作为自己测试的独立第三方；不代签、不标done、不合main，正式转正和统一质量门由Codex另核。

## 当前模式推进记录与交接

- Codex：2026-09-25核对入口/旧测试与参考源，授权本卡draft隔离准备；未预签任何测试结果或覆盖增量。
- 旧 Kimi/GLM 席位说明只作历史；用户随后明确暂休三贤人固定签字，当前由 Grok 贡献、Codex 独立验收。候选仍未开放产品 build 或正式测试接入，不因旧席位 pending 自动阻断。
- 此阶段只分配工作，不改变一阶段行为/政策，不扩大其它卡或用户豁免。

### Codex r3 接收复核（2026-09-25）

- 候选 `503a2d24`（对比 `5cb98087`）：**accept，仅隔离候选材料**，[本人独立证据](../../../../testing/grok-present-review.md)。P01/P02/P04/P05/P07的当次实传 `items` 与快照同一数组；P05工具自测 push/reverse/pop 均能检出，Codex真实 draw 隔离见证由 r2 `sameSnapshot:true` 反转为 `false`。C1a 已闭，C1/C2/C3 全部无剩余 counter。
- 本席复跑 25/25（23 项真实绘制、2 项快照自测）、tsc、Biome、docs/diff及P02/P05/P10三针；来源产品/旧测试/基线零 diff。r2相邻21/21保持，不重跑已闭像素与P06链。Status仍 `draft`，**未合 main、未标 done、未计官方覆盖率**；正式接入及完整质量门另由 Codex 排期，不以作者自验充独立终审。
- 当前无下一位 Agent 提示词；Grok本轮返工已闭，不再让其重复修 C1a。以下 r2/r1 块及提示词均为历史，不能用于再次返工。

### Codex r2 收窄接收复核（历史，C1a 已闭）

- 候选 `5cb98087`（对比 `e180cb56`）：**counter，仅剩 C1a**；仍为 `draft` 隔离候选，[独立证据](../../../../testing/grok-present-review.md)。C2、C3 与 C1 位图/背景/法术/毒等字段遗漏已闭；24/24候选、相邻21/21、tsc/Biome/docs与三针均通过，但它们不能证明实际传入的 `items` 数组容器不被污染。
- `p05-menu-stack.test.ts:59-66,94-109,135-152` 的快照 `items` 与传给 `drawMenuStack` 的内联数组不是同一对象；P01/P02/P04/P07同型调用需抽核。本席真实 draw 隔离见证在调用期间把实参数组从1项改成2项，当前快照仍 `sameSnapshot:true`，故暂不正式接入。只返工同一实际 catalog 容器的前后快照，并把新增 helper 自测与生产 draw 用例分栏；不改已闭像素、去重、三针或产品源码。
- 本卡按当前“Codex分派—Grok贡献—Codex独立验收”流程处理，不等待固定三席签字；未接收候选不计官方覆盖率。

### Codex 首轮接收复核（历史，除 C1a 外已闭）

- 候选 `bd6fad55` / 登记 `e180cb56`：**counter（仅候选材料）**，保留 `draft`；[独立证据与返工范围](../../../../testing/grok-present-review.md)。Grok 为测试贡献者，不算独立第三方；不合 main、不标 done。
- 已核通过：十文件 23/23、相邻 17/17、tsc/Biome、P02/P05/P10 三针业务红、源码零漂移；像素与旧例去重方向成立。
- 剩余 C1：`cloneInputs` 未纳入真实位图尺寸和多组实际 catalog/bitmap，P08/P09 等未完整做绘制输入保真；独立见证修改 frame 宽度和 spell 名后快照仍相等。C2：P05/P07 多处首轮 draw 后才取快照。C3：P06 用静态 10 MP 构造法术菜单、runtime 8 MP 绘制；正式菜单先投影 runtime，4/30 费用不能鉴别陈旧预算。
- 当轮返工只改隔离候选测试/fixture/回执；P10所需 `png-rgba.ts` 已由本席补录卡面 fixture 白名单。不改产品、旧测试、官方配置/基线。该旧结论不覆盖上方 r2 收窄结果。

## r2 下一位 Agent 提示词（历史，已完成）

```text
在 /Users/zhangxu/illegal/type-pal-grok-present 的 codex/grok-present-tests-r1 分支窄返工 TEST-GROK-PRESENT-1。当前候选5cb98087，卡状态draft；fetch 后用 git show origin/main:AGENTS.md 读取当前委派模式（本候选旧基点的 AGENTS.md 仍是历史三贤人文本），再读候选 README，并用 git show origin/codex/doc-cursor-review-r1:docs/testing/grok-present-review.md 读取 Codex r2 C1a 反证（只读，不合入复核分支）。接手前同步分支并核干净工作树。
只修实际传给 draw 的 catalog 数组身份：P05 :59-66/:94-109/:135-152 和 P01/P02/P04/P07 同型内联数组，先具名一次、同一对象交快照与产品调用；每次 draw 前后立即深比。自测至少钉一次真实实参数组成员增删或顺序变化能使快照红，不用另一份等值数组冒充。README将24项分为23项真实绘制回归+1项 helper 自测，不报新增官方覆盖率。
C2/C3、位图宽高等C1已闭项、像素/旧例去重及P02/P05/P10三针不重开。只改隔离候选测试/fixture/回执，不改产品、旧测、官方配置/基线；复跑候选/相邻/tsc/Biome/docs/三针，交精确SHA、JSON计数和实参数组污染负控。提交推送，不合main、不标done；Codex独立接收后决定集成。当前不要求Kimi/GLM签字。
```

## 首轮返工提示词（历史，已被上方 C1a 提示词替代）

```text
在 /Users/zhangxu/illegal/type-pal-grok-present 的 codex/grok-present-tests-r1 分支返工 TEST-GROK-PRESENT-1 候选；卡状态 draft，尚未开放正式 build/done。先读 AGENTS.md、CLAUDE.md、docs/testing/grok-present-regressions/README.md；fetch 后用 git show origin/codex/doc-cursor-review-r1:docs/testing/grok-present-review.md 与同分支任务卡读取 Codex C1-C3 原反证（只读，不把复核分支合入候选）。复核候选 bd6fad55/登记 e180cb56；接手前同步分支、核干净工作树。
只修 C1-C3：C1 为每次真实 draw 的 gs/menu/catalog/bitmap 等可变实参取完整独立快照，IndexedImage 连 width/height 都算，P06 spells/magics、P07 portrait/levelUpExp/bg、P05 bg/poisons、P08/P09 实际输入别漏；保留 toSpriteImages 同引用合同。C2 把 P05/P07 首轮绘制的快照移到该次调用之前，并在之后立即比较，不把 create/confirm/导航当绘制污染。C3 P06 施法者构造按正式 runtime→roles 投影或等效同步当前 MP，用能区分 8 与 10 的费用边界验证 disabled，同时保留屏幕现行 MP=8 像素断言。Codex 已补录 P10 png-rgba fixture 白名单，不需改产品或卡面他席。
已核过像素坐标/去重方向/23项及 P02/P05/P10 三针，别重开已通过项目。返工后复跑候选 JSON、相邻定向、tsc、Biome、三针；给实际输入污染的单点反控或其他可复建见证，证明原盲区已堵。只改 docs/testing/grok-present-regressions/**，README 如实更新候选/命令/计数与缺口。提交推送返工候选，交确切 SHA 与结果；不合 main、不代签、不标 done，不跑官方覆盖率或改基线。Codex再独立接收，Grok自己的绿结果不算独立第三方证明。
```

## 原开工提示词（历史，已被上方返工提示词替代）

```text
接手TEST-GROK-PRESENT-1，从Codex交付提交创建独立worktree /Users/zhangxu/illegal/type-pal-grok-present，
分支codex/grok-present-tests-r1；不在main/Cursor/GLM目录切分支，不为取包合main。
先读AGENTS/CLAUDE/READ-FIRST、docs/ops/tasks/TEST-GROK-PRESENT-1-phase1-menu-regressions.md、
卡内第一阶段工程笔记/机制与SDL参考锚点。证据冻结1763ac58。
按P01～P10连续完成一阶段菜单与索引渲染候选回归。先交P01非空像素/P02实时量两个自验小样，再做余组，
不用逐组等签字。真实draw/Framebuffer，typed可达菜单状态，去重后补例，不mock核心渲染，不造原版规则。
唯一写入docs/testing/grok-present-regressions/**；只用自包含像素/字形/角色数据，不需浏览器/PAL输入。
业务正反控及输入深快照齐全；最多三组单点变异在隔离副本，源hash不变，必须候选业务AssertionError红。
发现bug留显式诊断，不改产品/旧测试/资产/官方配置或基线；不skip/test.fails，不增timeout/retry。
每两组提交，十组连续完成；只跑本包/必要相邻/候选tsc/本人Biome/docs，不跑全仓check或官方覆盖率。
整包push，交正文SHA/登记tip、精确测试名及JSON计数、命令结果与给Codex的接收提示词。
不合main、不代签、不标done；Grok仅贡献者，产品修复/正式接入与质量门归Codex。
```

## Codex 正式接入与 done 收口（2026-09-25）

- 用户在 r3 材料 accept 后明确要求 Codex 开始合并推送。Grok 候选 `503a2d24`、Codex 隔离复核 `8ac65c4f` 分别保留贡献与审查归属；[正式接入证据](../../../../testing/grok-present-integration.md)记录选择性 port，避免旧候选分支直接 merge 造成主线回退。
- Codex 正式提交 `5fc04913` 将 25项（23生产绘制/解码+2快照工具自测）接入game； `pnpm check`、受保护官方ratchet、单次严格fast均exit0，快照8090项/641生产文件，七包分母不变，全仓分支+157。测试发现的产品缺陷数为0；full/E2E/Q1/Q2不借本卡关闭。
- 当前委派模式下由Codex独立accept并核`done allowed`；历史r1/r2 counter均由r3证据闭合。无下一位Agent提示词，本卡归档；正式测试与本报告留main。
