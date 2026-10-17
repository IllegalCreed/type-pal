# QUALITY-PRE94-RETROSPECTIVE-1 — 94前全部治理成果逐卡复审

> 2026-10-18 波次门勘误：本页引用的 [47–52统一门回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md) 已撤回“通过/收口”信用，未证明零诊断；不得沿用为本片验收或合并依据。本页原逐文件/定向结果按各自证据保留，旧计数不改写为0。

Status: build
Owner: Codex
Reviewer: Codex（当前源码与证据复核；不冒充第三方）
Phase: engineering first; phase1/phase2按真实路径分别准入
Capability: governance evidence reliability
Visual Verification Timing: 按逐卡风险登记，源码/测试工具本身N/A

## 当前用户要求、范围与准入

用户2026-10-16重申“复审94号之前的所有卡的成果”，本卡当前覆盖全部83张CODE-QUALITY编号小于94的卡，包含字母后缀，不是抽样。77张历史done、1张build、4张review、1张draft仅是原卡状态；本轮重新accept为0。当前复审队列已推进为50张partial、33张pending；partial只表示有限证据切片，不是验收。按当前Git tracked路径收集，大小写敏感编号规则排除行政卡CODE-QUALITY-3Y-CLOSEOUT-1；不按编号空缺虚构卡。完整83行清单与卡SHA见[复审队列](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/all-cards.md)。原36卡结构/8卡全文抽查是历史部分证据，不能替代任何整卡成果复验。3y的58差异卡矩阵也不是全部83卡。

唯一工作树/分支codex/code-quality-3y；主树和其它Owner只读，不再新建治理分支。94–102及editor既有返工继续保留；C10未完成检查点bea19f80c已提交推送，当前先推进本卡。工程→模块→功能→文件；先6a的账本/清单四文件，再核92的受保护门证据，继而逐卡回到shared/extract/game等模块。活跃53/57/79/80/81/90只读协调，未核前不抢写其实现。

Codex premise verified / design agree / build allowed：完整读取任务卡、实现、真实caller/出口/类型/生命周期，核注释事实、可复用代码边界、内聚耦合、输入/错误/异步取消/清理/ownership；测试核合法输入、真实oracle、排重、判别力与隔离。只读复核、隔离反控、测试与治理证据允许；发现需修复时先钉有限白名单和反例，低风险工具/测试补证逐批准入。产品机制、schema/save/migration/资产、公共接口或可感知行为变化立即停线专卡，不用本卡泛化授权。

逐卡状态只记pending/partial/rework/accept等实际结论；源码全文读取不等于caller已核，测试全绿不等于合同完备，旧done不等于本轮accept。原账本关闭遇直接counter才精确重开，不批量假验收/假否定。每个有限切片记录实际读取路径和SHA、primary/caller/oracle、问题/未修、定向相邻和反控；完整check/official ratchet/protected fast在稳定模块窗口集中。error/warning/info及运行时诊断未清前不合main，不宣布全仓完成。

## 当前推进

83卡当前全量accept=0、50partial/33pending；6a、92、CODE1 RLE、CODE2 MKF/RNG、CODE2b YJ2、3b SSS/MSG、3c动画清理、3d PNG、3g CLI、3h assets/shell、CODE71 fetch取消与测试、CODE3/3f切分与标注已有逐文件证据与有限返工，仍partial、统一门待续。CODE75已有MIDI重复退役局部证据，仍不等于该卡整文件复审结束。其它卡既有抽查/旧卡证据按历史保留，当前未完成项仍pending/partial。每卡范围须由全文读取后人工核定；清单生成只抽取文本和字节SHA，不伪装为语义阅读。

无下一位Agent提示词，Codex单Agent继续全量复审，不把本卡交回GLM。


### 2026-10-17 CODE-QUALITY-3r event-system 当前复审

完整读取 `event-system.ts`（5,117 行）、`event-system.test.ts`（5,974 行）及 K01/K02/K03、control-flow、state-opcodes、dialogue-pagination、cross-module、mode/search 合同；对照 SDLPal `script.c/play.c/scene.c/global.h` 与 mode/scene/bootstrap/menu caller，未发现可由 primary source + 真实 caller 证实的新 direct defect，未改实现或产品边界。

验证：game package test 实际 `321 files / 3,619 tests passed`，game typecheck 通过；coverage ratchet、protected fast、全仓 `pnpm check` 和官方 coverage 本小批未运行。3r 当前 `partial`，证据见 [`3r-event-system`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3r-event-system/README.md)，下一批继续选择不重叠的 pending 文件。

### 2026-10-17 CODE-QUALITY-3s battle-system 当前复审

完整读取 `battle-system.ts`（3,141 行）、`battle-system.test.ts`（4,248 行）及 cov85/GLM/runtime-context/finalization/settlement/state/state-machine/turn-boundaries 合同；对照 SDLPal `battle.c/fight.c/script.c/global.h` 与 `mode.ts`、`bootstrap.ts`、`battle-finalization.ts`、`battle-settlement.ts` caller，未发现可由 primary source + 真实 caller 证实的新实现 direct defect。

本片修复测试隔离：cov85 两个 `console.error` spy 使用 `try/finally` 恢复，主测试两个战斗集成 describe 的 `console.warn` spy 使用 `afterEach` 恢复；不改变产品行为或战斗机制。测试判别力核验保留合法输入、反例、业务 oracle 和相邻职责边界；部分直接摆 typed BattleState 的测试仅隔离 phase/guard，未扩张为完整生产路径验收。

验证：定向 9 files / 242 tests passed；`pnpm --filter @type-pal/game typecheck` passed，无失败、跳过或测试 stderr。coverage ratchet、protected fast、全仓 `pnpm check`、官方 coverage 本小批未运行，不能宣称统一质量门通过。3s 当前 `partial`，证据见 [`3s-battle-system`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3s-battle-system/README.md)，下一批继续选择不重叠的 pre-94 pending 文件。

### 2026-10-17 CODE-QUALITY-3v battle actions 当前复审

完整读取 `actions/attack.ts`（614 行）、`attack-mate.ts`（111 行）、`defend.ts`（20 行）、`flee.ts`（81 行）、专属 `attack-mate.test.ts`（148 行）和 `attack.glm-next-wave.test.ts`（64 行）；读取 `actions.test.ts` 的 attack/confused/defend/flee 相关段与 animation/formula 相邻 oracle。对照 SDLPal `fight.c`/`battle.c`/`battle.h`、`battle-system.ts` action caller 和已批准的敌吉运修复，未发现可由 primary source + 真实 caller 证实的新实现 direct defect。

本片无实现改动；测试判别力保留合法输入、死亡/空目标、RNG、cover/auto-defend、boss/装备、失败动画和资源缺失反例。`actions.test.ts`、完整 animation/formula 文件和其它 action family 仅作相邻部分证据，不在本片关闭。

验证：定向 6 files / 154 tests passed；本片未改产品实现，因此不重复运行 game typecheck。coverage ratchet、protected fast、全仓 `pnpm check`、官方 coverage 本小批未运行，不能宣称统一质量门通过。3v 当前 `partial`，证据见 [`3v-battle-actions`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3v-battle-actions/README.md)，下一批继续选择不重叠的 pre-94 pending 文件。

### 2026-10-17 CODE-QUALITY-3x battle progression 当前复审

完整读取 `battle-progression.ts`（306 行）、`battle-progression.glm-next-wave.test.ts`（142 行）、`battle-levelup.test.ts`（303 行）和 settlement progression caller；对照 SDLPal `battle.c:991-1373`、`global.c:2347-2409`，核对活人 gate、主/隐藏经验顺序与 RNG、stat cap 差异、HP/MP 回满时机、法术去重和 runtime/equipment snapshot，未发现可由 primary source + 真实 caller 证实的新 direct defect。

本片无实现改动；相邻 settlement 与 battle-system 只作 owner/caller oracle，不重复关闭。测试保留 >99 level、隐藏无 cap、多池顺序、死亡/阈值/连升/满级、法术等级门与 runtime projection 反例。

验证：定向 4 files / 207 tests passed；本片未改产品实现，因此不重复运行 game typecheck。coverage ratchet、protected fast、全仓 `pnpm check`、官方 coverage 本小批未运行，不能宣称统一质量门通过。3x 当前 `partial`，证据见 [`3x-battle-progression`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3x-battle-progression/README.md)，下一批继续选择不重叠的 pre-94 pending 文件。

### 2026-10-17 CODE-QUALITY-42 dialog-box 当前复审

完整读取 `dialog-box.ts`（958 行）、`dialog-box.test.ts`（761 行）、`dialog-box.glm-next-wave.test.ts`（84 行）及 event/present caller；对照 SDLPal `text.c:1208-1815`、`uigame.c:878-930`，发现 narration/center-window 的 `~NN` 尾暂停错误计入 `doneAt`。先加入反例确认旧实现失败，再将尾暂停限定为 `!isDialog`；普通对话尾暂停保持不变。

验证：定向 2 files / 83 tests passed；game typecheck通过。相邻 event/present 4 files / 97 tests通过，`dialog-box-pixels.grok-r1.test.ts` 另有 1 条 `document is not defined` 环境诊断，保持 review；coverage ratchet、protected fast、全仓 `pnpm check`、官方 coverage 本小批未运行。42 当前 `partial`，证据见 [`42-dialog-box`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/42-dialog-box/README.md)，下一批继续选择不重叠的 pre-94 pending 文件。

### 2026-10-17 CODE-QUALITY-46 draw-confirm 当前复审

完整读取 `draw-confirm.ts`（48 行）、`draw-confirm.glm-phase1-leaves.test.ts`（67 行）、`opening-confirm-pixels.grok-r1.test.ts`（177 行）及 present/draw-menu/draw-shop caller；对照 SDLPal `uigame.c:242-388`，未发现可由 primary source + 真实 caller 证实的新 direct defect。多字标签动态偏移属于通用 PAL_SelectionMenu 合同，而真实 helper callers 只传单字合法标签，本片不扩大公共 UI 合同。

验证：定向 2 files / 10 tests passed；相邻 draw-menu/present 3 files / 69 tests passed；game typecheck passed。coverage ratchet、protected fast、全仓 `pnpm check`、官方 coverage 本小批未运行。46 当前 `partial`，证据见 [`46-draw-confirm`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/46-draw-confirm/README.md)，下一批继续选择不重叠的 pre-94 pending 文件。

### 2026-10-18 CODE-QUALITY-47 draw-box 当前复审

完整读取 `draw-box.ts`（191 行）、`draw-box.test.ts`（101 行）、`draw-box.glm-phase1-leaves.test.ts`（79 行）和 `box-shadow-pixels.grok-r1.test.ts`（232 行）；读取 framebuffer owner 与九个真实菜单/战斗/对话 caller；对照 SDLPal `ui.c:131-340,762-833`、`ui.h:195-254`。9-slice/single-line frame identity、几何、shadow/opaque 顺序、palette-0/透明孔、屏外裁剪、缺帧、文本宽度与 caller 合法长度均一致，未发现可由 primary + caller 证实的新 direct defect。

验证：直接 3 files / 22 tests passed；相邻 10 files / 127 tests passed；`pnpm --filter @type-pal/game typecheck` passed。coverage ratchet、protected fast、全仓 `pnpm check`、official coverage 本小批未运行；不据此宣称统一质量门通过。47 当前 `partial`，证据见 [`47-draw-box`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/47-draw-box/README.md)，下一批继续选择不重叠的 pre-94 pending 文件。

### 2026-10-18 CODE-QUALITY-48 draw-equip 当前复审

完整读取 `draw-equip.ts`（279 行）、两份直接边界/像素测试（124/367 行）和 P03 caller/oracle（208 行）；读取 equip-menu 生命周期、menu-driver dispatch、inventory count owner、draw-menu/present 注入；对照 SDLPal `uigame.c:1793-2055`、`itemmenu.c:28-224`、`play.c:328-359`、`global.c:1175-1225`。装备列表/选人页的资源、party role 位、6 槽/5 stat、颜色、数量、边界和 ownership 一致，未发现可直接证明的新实现缺陷。SDLPal 无条件绘制数量与 TS 零数量隐藏的差异只出现在直接构造的非法/不可达 pick-role 输入：正常库存归零会删除条目，确认入口要求正数量；本片保留该边界，不改用户行为。

验证：直接 3 files / 16 tests passed；相邻 9 files / 167 tests passed；`pnpm --filter @type-pal/game typecheck` passed。coverage ratchet、protected fast、全仓 `pnpm check`、official coverage 本小批未运行。48 当前 `partial`，证据见 [`48-draw-equip`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/48-draw-equip/README.md)，下一批继续选择不重叠的 pre-94 pending 文件。

### 2026-10-18 CODE-QUALITY-49 draw-inventory 当前复审

完整读取 `draw-inventory.ts`（390 行）、三份范围测试和 P01/P02 caller/oracle；读取 inventory-menu、menu-driver、draw-menu/present 注入；对照 SDLPal `uigame.c:1289-1473`、`itemmenu.c:28-310`、`play.c:268-323`。live count、zero branch、目标层 UI、列表过滤/描述、状态与资源 ownership 已与 primary/caller 对齐，未发现新的实现缺陷；用户已批准的大世界 live-zero 行为沿用，不扩大到其它端。

验证：范围 3 files 中 11 tests passed，`inventory-list-pixels` 另有 1 条 `document is not defined` 环境诊断；相邻 10 files / 190 tests passed；`pnpm --filter @type-pal/game typecheck` passed。该像素测试文件保持 `review`，coverage ratchet、protected fast、全仓 `pnpm check`、official coverage 本小批未运行。49 当前 `partial`，证据见 [`49-draw-inventory`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/49-draw-inventory/README.md)，下一批继续选择不重叠的 pre-94 pending 文件。

### 2026-10-18 CODE-QUALITY-50 draw-magic 当前复审

完整读取 `draw-magic.ts`（359 行）、三份专属测试（235/267/584 行）、P06 caller/oracle（345 行）、in-game-magic-menu 状态生命周期与 SDLPal `magicmenu.c:1-484`、`uigame.c:653-875`、`uibattle.c:31-269`。施法人/仙术/目标三阶段、MP/说明/分页/光标、运行时数值和资源边界均有合同，直接 4 files/25 tests、相邻 5 files/136 tests和 game typecheck通过。

停线发现：SDLPal 复用的 `PAL_PlayerInfoBox` 会按中毒重染头像并绘制乱/定/眠/封状态字，当前 `draw-magic.ts` 明确省略，且第一阶段文档把该行为记为已修复。该用户可见差异需要独立高风险裁决，已开 [`GAME-MAGIC-PLAYERINFO-STATUS-1`](../tasks/GAME-MAGIC-PLAYERINFO-STATUS-1.md)，本批未改公共输入或产品实现；50 当前 `partial`。coverage ratchet、protected fast、全仓 `pnpm check`、official coverage 本小批未运行。

### 2026-10-18 CODE-QUALITY-51 draw-opening-menu 当前复审

完整读取 `draw-opening-menu.ts`（94 行）、两份专属测试（101/79 行）、opening-confirm 相邻像素测试、opening/menu caller 与 SDLPal `uigame.c:42-167`、`ui.c:458`。背景、两项文案、长文案 x 公式、闪烁色、三影、缺背景和状态隔离均一致，直接 3 files/17 tests、相邻 4 files/107 tests和 game typecheck通过，未发现 direct defect。

51 当前 `partial`，coverage ratchet、protected fast、全仓 `pnpm check`、official coverage 本小批未运行；证据见 [`51-draw-opening-menu`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/51-draw-opening-menu/README.md)，等待 present/menu wave 统一门。

### 2026-10-18 CODE-QUALITY-52 draw-shop 当前复审

完整读取 `draw-shop.ts`、两份直接测试、P04 caller/oracle、shop/menu 生命周期和 SDLPal `uigame.c:1503-1777`。买/卖价格、ownedCount（库存+装备）、半价、确认层、缺资源和 framebuffer ownership 均一致，直接范围 3 files 中 18/19 tests通过，另有 `shop-preview-pixels` 的 `document is not defined` 环境诊断；相邻 6 files/117 tests、game typecheck通过。52 当前 `partial`，shop-preview 文件保持 `review`；coverage ratchet、protected fast、全仓 `pnpm check`、official coverage 本小批未运行。

## 历史：2026-10-15抽查准入原文（已被上方全量范围取代）

Historical status: review
Owner: Codex
Reviewer: Codex（只读抽审；不冒充第三方）
Phase: engineering / phase1 sample
Capability: governance evidence reliability
Visual Verification Timing: N/A（只读代码/证据）

## 用户目标与边界

用户要求大致浏览94卡之前的治理，确认注释、复用、内聚/耦合及测试质量。不能按模型名称推断质量；本卡按当前源码、实际caller、SDLPal与原件核对。36张卡结构盘点不等于全文复验；完整读取名单与部分caller段分别记录。单Agent，主树/GLM树只读。94–102与editor诊断清理原goal继续，不被本卡替换。

## 准入

Codex premise verified / design agree，build allowed仅只读抽审、探针、测试执行及治理记录；不修改产品/schema/save/迁移/资产/公共接口。高风险毒状态域转专卡draft。不能给全部旧卡补accept，也不能把历史文字改成已执行新门。

本轮先抽3o毒键、3u/3w清理测试、2b codec/边界与6a账本门，另核92工程纠错。保留历史原件，直接反证才撤回对应文件结论；其它229旧闭合不批量撤销或重验通过。

## 输出与交接

报告须区分直接支持、确认不足、未知待复验；记录实际读取文件、测试原件与未修问题，机器账本按当前结果。全仓门与editor稳定窗口合跑，本卡只读不会授权集成。无下一位Agent提示词，Codex继续。

## 6a有限测试补证准入（2026-10-16）

已全文读取ledger实现142行/测试123行、inventory实现216行/测试48行，以及原6a卡、根package.json caller。隔离副本仅删除ledger的CLI导入guard，原九例仍全部通过且导入产生真实CLI输出，证明“导入不启动CLI”缺乏测试判别力；实现当前guard正确，不称为产品缺陷。inventory原例标题声称deterministic但只运行一次、未检验--out出口，属测试证据缺口。

Codex build allowed补证白名单仅两份现有测试：ledger.test.mjs新增隔离子进程导入安静合同；inventory.test.mjs在原例核对stdout和临时目录--out字节一致、从无关cwd调用并finally/after清理。两实现只读；不新建公共helper/配置，不改任何游戏行为/覆盖规则。反控在同目录临时副本运行，真实原件SHA保持且finally清除；全量门待稳定窗口，不凭补证关闭文件。

### 6a当前结果

两枚隔离反控旧绿/新精确单例红，恢复11/11、相邻quality-tools38/38；工具实现未修改，仅两测试补证。ledger测试旧关闭撤回review，inventory测试pending→review，0新增关闭。四源职责/输入/caller/oracle/注释/复用与未核范围见[6a证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/6a/README.md)。全仓check/ratchet/protected未重跑，editor诊断未清，6a整卡partial，本轮83卡accept仍0。下一片92工程门原件和源码快照。

6a检查点docs/lint-zero/ledger/diff-check均通过，lint4376文件0/0/0；机器3287/222closed/201review/2864pending。全仓check/ratchet/protected未重跑，editor诊断仍未清，保持build/partial，禁止合main。

## CODE92当前复审

历史protected失败/成功与同commit全仓check原件已核SHA/exit，旧收口实际有门执行；当前30源20相同/10变化，全部继续review。成功raw缺结构化环境，后续保存环境白名单/ref/baseline SHA，不追补原件。工程门实现/依赖与原生定向测试实际读取见[92证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/92/README.md)。0新增关闭、全83卡accept仍0；下一片CODE1 shared RLE，94–102/editor原返工继续保留。

## CODE1 RLE有限复审与测试补证准入

已全文读取rle.ts/主测试/boundaries/runtime-resource及相邻glm-o，核shared公共barrel、game tileset/rle-decode、extract sprite全文件与reforge assets实际caller分段；读取SDLPal原函数和phase2铁律。发现高位literal语义差异已立即停线至QUALITY-RLE-COMMAND-TRUTH-1 draft，算法/格式/资源与公共接口不得实现。

独立的已定测试合同：原CODE1明确宽容入口必须捕获decoder畸形输入并保留其后合法帧。隔离副本把catch改成rethrow，四份原RLE测试54/54仍绿；主测试所谓截断样本连header不完整，实际未进入catch。Codex build allowed仅修packages/shared/src/rle.test.ts这一现有测试的合法容器/坏帧字节和精确oracle，保持测试身份数量；先验证旧反控存活，再新反控精确一红、恢复定向/共享包与相邻。rle.ts与encoder/资源/格式probe边界全部只读；这不是允许实施高位literal修复。其它原卡范围仍pending/partial，0新增关闭。

### CODE1本片结果

只补主RLE测试一例，54身份保持，rethrow反控旧54绿→新53绿1业务红，恢复shared typecheck/131例与game21/extract6/reforge20通过。decoder/主测试/boundary三旧关闭撤回review；高位literal格式真值专卡draft，未改算法或资源。GOP67715成功帧结构trace未见分类分歧，不等同SDL native像素对比。全83卡accept仍0、统一门待续；下一片CODE2 MKF/RNG。

## CODE2 MKF/RNG补证准入（2026-10-16）

全文读mkf.ts、rng.ts、两boundary测试与rng主测试；核共享fixture/barrel、extract MKF重导出及RNG PNG wrapper、game rng-player caller全文件，SDLPal对应MKF/RNG函数。当前没有生产实现缺陷证据。隔离删整数guard，MKF旧11例仍绿；YJ2失败catch错误清空surface，RNG旧16例仍绿。原注释还把已拒绝的offset越界写成未定义，与实现/现有反例矛盾。

Codex premise verified/design agree/build allowed白名单仅两现有测试：mkf.boundaries.test.ts校正注释、在同一索引拒绝例加入NaN/非整数并明确共享视图ownership；rng.boundaries.test.ts把坏YJ2例加强为正常帧→坏帧→后续delta，直接核旧画面保持和最终完整plane。保持例数，不改mkf/rng/YJ2实现、公共API、错误政策或资源。原例标题必要时精确更名，映射落证据，不伪造旧身份相同；官方baseline仅后续真实ratchet生成。先旧反控存活→新精确单例红→恢复定向/相邻与必要typecheck。

同时只读核真实MKF区间与RNG当前解码结果；若运行native源码则记录原函数SHA/给定解压payload的比较边界，不把它冒充YJ2或pal.exe验证。无新产品取舍，不借本片解除RLE格式draft或接管CODE53等活动实现。

### CODE2 B段：已证重复精简准入

A段保持例数的两项补证已通过旧绿/新单例红与恢复绿。全文排重确认rng.test.ts的“delta累加”与rng.boundaries.test.ts“连续帧基面保留”均是literal写前两字节→0x02跳过→写后两字节；后者还精确约束全320×200未触区域。小零面与大MARK面在该调用无尺寸/像素值分支，前者断言是后者合同的弱子集，真实caller面为320×200；其它小面/越界合同仍在，不能因文件短保留重复。

按用户测试少而精规则，Codex build allowed B段只退役rng.test.ts该一例（7→6）并核oracle转移反控；A段两测试保留。仅必要时新增approved-test-retirements.mjs精确7→6/双身份digest/源SHA条目，更新固定表测试23项/净52；matcher、拒绝合同、scope规则及baseline比例不改。原生Vitest list身份与三父快照比对后再登记，baseline只由后续官方ratchet生成。无产品/算法变化，统一门未跑不合main。

### CODE2当前结果

两项补证各有旧绿/新单例AssertionError；精确退役一条重复delta并验证oracle转移。生产MKF/RNG及YJ2字节未改；原始15MKF/2373chunks区间一致，给定相同解压payload的native SDL1464帧逐像素/索引一致。最终33定向、shared130+typecheck、game13/extract17与coverage-tools68通过。三测试旧关闭转review、0新关闭，统一门仍待续；全83卡accept仍0，下一片CODE2b YJ2。

## CODE2b YJ2有限测试精度准入

全文读取shared/yj2.ts、边界测试、rle.glm-o.test.ts与固定fixture，extract/io/yj2.ts及测试、resources/map.ts，SDLPal YJ2类型/查表/建树/调整/位读/解压原函数；核shared/rng完整caller沿CODE2源hash，CLI分段定位。当前无算法修改授权。原注释仍否认已存在的空窗口反例；extract两例仅核预分配长度；GLM-o的YJ2四例由规范边界合同覆盖，固定向量两次自比不能证明字节真值。

Codex premise verified/design agree/build allowed限三个现有测试：yj2.boundaries.test.ts校注释并承接精确异常、零长尾随payload和两次独立固定expected输出；rle.glm-o.test.ts只移除YJ2四例/专用imports并修文件职责说明，RLE测试体不改；extract/io/yj2.test.ts把两个smoke整合为真实MGO前20chunk的独立native冻结字节digest。只在未改SDL原函数与真实raw对拍/合法输入前提确认后写golden，不用当前TS结果自制oracle。精确退役所需table数据/固定计数可同步，matcher/规则/基线不改，源实现与资源只读。

先隔离length-only解压变异证明旧测试盲点，再原生oracle/转移反控/恢复；混合文件13→9需原生list旧/新digest与源SHA精确登记，extract raw测试不在fast inventory则不伪造退役豁免。未知树归约独立fixture仍pending，不用raw数量冒充该轴已证。若真实native/raw有分歧立即停线专卡，不直接实现。

### CODE2b当前结果

原算法/重导出未改，native SDL2626段/34367608B对拍一致；规范9例承接四条混合YJ2合同并纠正注释，混合13→9、extract2弱例→1独立native字节oracle。共享变异七个失败集合完整保留，extract旧2绿/新1业务红。恢复34定向/shared126+typecheck/相邻18+typecheck/coverage-tools69通过。树归约独立向量仍待证，统一门未跑，0新关闭；下一片CODE3c工程runner，再回CODE3。

## CODE3c当前复审及有限补证准入

全文读取原卡、SpriteFrameWorkbench.tsx及四份相邻测试、SpriteFrames/BattleSpriteInlinePreview真实caller、world/battle语义组生成器、content sprite类型；按实际区间读取reforge公共出口与resolveSpriteActionPosition及相邻测试。原3c最终交付是缺帧动画测试，并非runner实现修复；该生产文件与专属测试仍与8fea6a4ec字节相同。缺帧是编辑器修复预览输入，非运行时严格动作绑定接受越界的新授权。

隔离副本三针：删除缺帧fallback与完成guard均使现有1例产生指定AssertionError；只删除clearTimeout则原例仍1绿，证明活动定时器的卸载清理未被本例判别。生产cleanup当前正确，不称为用户行为bug。Codex premise verified/design agree/build allowed白名单仅animation-boundary.test.tsx：在同一动作合同内再激活后带活动timer卸载，断言queue归零且卸载画布不再绘制；把帧初始化移入try并用嵌套finally保证恢复。保持1例身份，不新增helper、规则、ignore、sleep或产品改动。先旧绿/新精确业务红，再恢复定向/相邻与typecheck；旧覆盖率门保留历史，当前统一门仍待续。

### CODE3c本片结果

原1身份加强活动timer卸载，三针各精确1个业务AssertionError、恢复正常1绿；生产与规则/baseline未动。editor模块36绿但6act，reforge相邻22零诊断、editor typecheck通过；全仓门未新跑，不合main。原两条关闭转review、0新关闭，当前机器已确认213closed/211review/2863pending。3c本轮partial；全部83卡accept仍0，7卡partial/76pending，下一片CODE3 extraction event/type模块。

## CODE3切分测试有限补证准入

全文读取slice/annotate实现、四slice测试/两annotation测试、disasm/recompile/roundtrip、shared事件类型、SSS/WORD/MSG解析，真实CLI入口收集/事件写出片段及SDLPal相关case。原卡纯类型收紧未改变BFS，当前annotate另含3f parseSymbols增量。人读元数据伪边与带计数goto遗漏续行已停线QUALITY-EVENT-SLICE-CONTROL-TRUTH-1 draft，生产算法/重复BFS抽取与生成物冻结。

隔离三针（删A2随机边、resetTo有值时漏续行、EO auto入口错定为1），原四文件28例均绿，证明对应旧断言不能判别。Codex premise verified/design agree/build allowed白名单仅slice.test.ts及slice.kimi-r1.test.ts：原A2例用end隔断普通fall-through并核完整有序集合；原reset例用非零idleFrames与完整目标/续行oracle；原EO auto例区分目标身份，修正现有fixture raw字段布局、相关注释。保持28身份，不新增测试、ignore、弱断言、规则/runner或生成物；先新三针各指定AssertionError再恢复定向/相邻/typecheck。Kimi字符串扫描旧例仅保留历史行为观察，不能作为正确控制流真值；不借补证实施高风险算法修复。

### CODE3本片结果

三针旧28绿/新各27绿1指定业务红，恢复定向45、extract72/434+typecheck、shared16/126+typecheck均零诊断。仅两测试补证，生产/规则/baseline与资源未改；控制流/元数据风险专卡draft继续，不借此抽重复BFS。机器已确认211closed/214review/2862pending，0新关闭；全83卡8partial/75pending/0accept。下一片继续CODE3 annotation测试质量，之后3b；94–102与editor返工保留，统一门未清不合main。

## CODE3/3f annotation测试有限返工准入

全文重读annotate109行及两测试106/121行、3f原卡、WORD parser/测试、shared类型与出口；核真实CLI和schema人读注释边界。无生产修改证据或授权。六枚隔离变异（截sequence、改choice文本、漏无else then、改调用数组、丢合法spell表、漏表类型guard）旧17例全部绿。旧“零突变”传的是新数组且仅1项；结构断言多靠强转后单字段，不能证明完整输出。

Codex premise verified/design agree/build allowed白名单为annotate.test.ts、annotate.glm-runtime-resource.test.ts：用独立完整expected替代局部强转、每例新建词表、直接检查真实调用数组及输入所有权；现有sequence承接多步骤、choice承接完整选项、无else承接有效then注释。主测试两远端缺名/一raw用例与GLM一正向/优先级用例已证重复，明确转移到保留的邻位缺名/直接输入守恒/主WORD与symbols合同；旧混合坏symbols拆为顶层形状、未知键、表形状、表值四个合同，不为少测而混轴。最终9→6、8→10，共17→16。名称更正与拆分精确记录，不伪称身份保持。

仅在原生list核旧/新身份并对main/旧3y快照后，为主文件9→6登记approved-test-retirements精确count/双digest/新SHA，固定表25项/净59可同步；matcher、拒绝合同、runner和baseline不改。其它三枚oracle转移诊断单独记录完整失败集合，不冒充六枚单例业务反控。当前symbols/annotation算法、切分高风险专卡及生成物保持冻结；统一门仍待后续窗口。

### CODE3/3f本片结果与包诊断纠正

两测试17→16，四条已证重复有精确转移，坏symbols四层合同独立；六针旧17绿/新各15绿1指定AssertionError，恢复正常16绿；三多红转移诊断另记，非单例针。主文件9→6双digest/新SHA经main与旧3y对照登记，其他24项/matcher和baseline原字节不变。定向52、shared126/typecheck、extract typecheck和coverage工具70通过，原件见[标注证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3-annotate/README.md)。

完整extract虽原生72文件433 passed/0pending，完整stderr却有10块/52行，六例因root指错packages/data/raw后return而未执行断言；另四块parser负面日志。故包验收未过。上一片434的“均零诊断”说法不成立，只有act/环境/navigation三模式为0，历史日志保留且当前纠正。新开[原盘测试执行完整性](QUALITY-EXTRACT-RAW-TEST-EXECUTION-1.md)draft，下一批先核两测试和实际caller/primary，不静音、不新增排除、不改decoder/原盘/生成物。

本片两旧关闭撤回review，0新增关闭；CODE3/3f仍partial，全83卡9partial/74pending/0accept。原卡范围其它文件/统一check、ratchet、protected和editor诊断未清；不合main。先处理六条假绿，再续3b及94–102/editor；无下一位Agent提示词，单Agent继续。

本检查点docs/ledger/diff-check通过，lint-zero4428文件error/warning/info全0。机器3287 inventory /209closed /216review /2862pending；没有新增关闭或统一门通过声明。恢复、原件与精确退役已另进程复核，不冒充第三方验收。

### 原盘执行完整性支持片

[原盘任务/证据](../evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/README.md)已修两测试六假绿，native SDL1332图像完整RGBA oracle、七旧绿新红；一空块重复转移，21→20。共享test-only摘要与相邻事实注释均review，0关闭；完整extract432仍4stderr块，统一门未清。全83卡仍9partial/74pending/0accept；本支持片不替代CODE3b/3g/其它卡全文复审。先核四处诊断真实输出合同，再续编号卡与94–102/editor。

### C1同步诊断合同支持片

[C1完整证据](../evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/diagnostics-c1/README.md)：两测试补真实warn/Error/null与异常恢复，八有效反控；BALL精简一同输入弱例，53定向/shared126/typecheck/71工具通过、生产局部V8保持。extract431仍2stderr块，三测试/helper仅review、0关闭；全83卡仍9partial/74pending/0accept，不以支持片代替编号卡成果复审。先C2，再3b及94–102/editor。


### C2实际检查点

[C2原件与逐文件结论](../evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/diagnostics-c2/README.md)：两测试完整DTO/实际输入ownership/真实同步IO，7旧绿新单例AssertionError；raw名字既有oracle和同999字节oracle各1→1转移另列。tables90→89、P07 2→3，总92但原生身份变化公开；既有fast不含tables，无新增豁免/baseline改动。生产enemy-teams实际V8 32/32、2/2、22/22保持。完整extract72/431、shared126、真实战斗caller186、双方typecheck与71工具通过，0stderr块。

两测试只review；enemies.ts两处不存在的EnemyTeam.slots注释是直接counter，旧关闭撤回review，生产未改。机器3289/208closed/226review/2855pending，0新关闭；全83卡仍9partial/74pending/0accept。完整check/ratchet/protected未新跑、editor诊断未清，不合main；回CODE3b四文件继续，原94–102/editor保留。无下一位Agent提示词。

C2静态门与历史失败保留见[最终回执](../evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/diagnostics-c2/gates.md)；只更新本卡导航，无其它Owner状态变化。整体验收/统一三门未通过不合main。

## CODE3b 当前复审与有限测试准入

已全文读原3b卡、msg.ts/sss.ts、两boundary及两真实raw测试、utils/gbk.ts、roundtrip.ts、io/mkf.ts；共享fixture沿C1全文同SHA并重读1–155。真实CLI200–250、SDL global.h95–121、text.c792–850及工程笔记22/62/172为当前锚点。生产两个parser继续只读，未发现本片实现缺陷；SSS固定结构的非对齐拒绝和MSG越界/倒序拒绝已由旧3b实施，不能沿用旧P03“政策未定”注释。

Codex premise verified/design agree/build allowed白名单仅sss.boundaries.test.ts、msg.boundaries.test.ts：将SSS的实际父buffer及其前后非零保护区纳入调用前后比较，手列两EO/两scene完整语义与raw字段及独立bytecode字节；MSG核实际bytes/offsets和父buffer不变。六项隔离故障（SSS前/后保护、第二EO/scene字段、MSG两输入修改）须先证旧绿，再新各恰一指定AssertionError，原件/源/测试hash与清理完整保存。

原SSS两组混合拒绝拆成五个独立chunk输入轴，MSG混合拒绝拆成越界/倒序两例，明确身份变化，不用总数假装相同。原两正例、合法单offset零消息合同保留；只修错误注释与测试证据，不新增共享helper或改变解码/资源/schema/API/错误策略。生产bytecode当前借用输入视图、其它解析数组自行分配；本片不擅自改变返回ownership。全量统一门仍在诊断稳定窗口集中，editor未清不合main，不因局部反控关闭文件/整卡。


### CODE3b 本片结果

[逐文件与原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3b/README.md)：六针旧16绿→新各19绿1指定AssertionError，恢复20绿；保护父buffer、两完整EO/scene、两MSG输入ownership，原拒绝轴拆独立5+2例并修过期注释。生产两个parser字节不变；独立Python struct全量5077 EO/295 scene/3955 WORD/13514 offsets/43503指令一致，正文摘要只作观察，不冒充native/text oracle。

42定向相邻含真实roundtrip、extract72/435、shared126及双方typecheck、71工具通过，0stderr；全仓check/ratchet/protected未新跑。两boundary旧关闭撤回review，两个raw sanity pending→review待精度/排重，0关闭。机器3289/206closed/230review/2853pending；83卡10partial/73pending/0accept。下一片先两raw测试，再3d/3g；94–102/editor保留，未统一零诊断不合main。无下一位Agent提示词。

## CODE3b raw测试有限准入

Codex premise verified/design agree/build allowed：只改io/sss.test.ts与io/msg.test.ts两现有原盘测试，生产/共享fixture/资源/规则/baseline保持。SSS沿上片独立Python struct全5077 EO/295 scene/3955 WORD/13514 offsets/43503指令结果与原件SHA，固定完整字段/表/字节码摘要；expected不由当前TS生成。MSG仅以独立raw DWORD偏移和Python严格GBK直接读出的0/1/100/6757/13512五条原字节为固定文本oracle，保留控制标记/标点/全角空格，明确是当前原盘已核子集，不冒充全正文/fixup/native验证。

原SSS六sanity→一个完整同次解析结果合同，固定count/全字段/原字节摘要蕴含旧非空、8B和raw16槽；MSG三smoke→一个精确count/五文本合同，13513条蕴含旧规模、ID1明确逍遥、ID100精确字符串承接旧类型抽查。类型smoke不另计业务。两文件均既有fast排除，不新增退役豁免，不动matcher/基线；须原生JSON公开9→2及身份变化，不把少测等于质量。

反控先证五缺口旧绿（后续EO字段丢失、真实字节码尾损、正文首/中/末错值），再新各一指定AssertionError；字节码空与逍遥名字替换的旧有oracle转移单列1→1，不计新缺口。完整四测试集合、源/副本/原生JSON/raw/exit/signal与临时清理全保留；恢复后定向/相邻/TC及静态门。正文全量未知、其它旧卡及94–102/editor原目标继续；统一门未过不关闭/合main。


### CODE3b raw测试本片结果

[raw逐文件/独立oracle/反控](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3b/raw-tests/README.md)：两raw测试9→2，完整四文件20→13；SSS固定全5077 EO/295 scene/3955 WORD/13514offsets/43503指令的独立struct oracle，MSG独立raw区间/严格GBK五原文与13513条数。五针旧20绿/新各12绿1指定AssertionError，字节码空/逍遥替换两原oracle各1→1单列，恢复13绿；两生产实现未改，原盘/规则/baseline不动，无新增退役豁免。

35定向相邻、extract72/428、shared126及双方typecheck、71工具通过，0stderr；原3b after按Git3a9重建7轮，当前16轮原件/源/副本/清理另进程核验。两raw仅review，MSG其余正文/fixup全量与其它边界仍待；机器3289/206closed/230review/2853pending不变，0新关闭。全83卡10partial/73pending/0accept，下一片3d PNG输入，再续3g和94–102/editor；统一check/ratchet/protected未新跑，不合main。无下一位Agent提示词。

当前优先级：3g输出边界只等该策略裁决；独立续3h assets/shell。editor余诊断与94–102返工保留，并在稳定窗口集中执行统一门和阶段合并。全部83卡成果持续在范围内，未核项不变更为accept。


用户再次重申全部83卡成果均须复审。C10恢复仅保存测试检查点：Wizard28零诊断，editor4943通过仍624act/243环境/1表单告警，0文件关闭、未合main。下一片回CODE3d PNG完整caller/alpha/输入合同，再3g；不继续以editor余诊断替代全量83卡队列。原10partial/73pending/0accept未变，94–102/editor返工与稳定窗口统一门仍保留。


## CODE3d PNG 有限复审与测试准入

全文读取原3d卡、sprite.ts及boundary/main/GLM三测试、BALL/RGM/FIRE/RNG PNG wrapper和game PNG consumer；真实CLI仅353–391/603–631/835–864，SDL palcommon仅RLE写入和SpriteGetFrame原函数范围，不冒充CLI/SDL整文件验收。PNG是type-pal运输合同，SDL本身不编码PNG；alpha区分来自RLE跳过与写像素、game R/A读取。旧头引用不存在的sprite.c::PAL_LoadSprite；GLM头声称主测试覆盖PNG魔数/首帧等，当前主测试没有这些调用。尺寸旧反例仅width0/小数，height分支判别力须隔离核实。

Codex premise verified/design agree/build allowed白名单只三现有源：sprite.boundaries.test.ts拆开width非正/非整数、height非正/非整数、pixels短、opaque短六独立合同；sprite.ts只更正primary引用、RGBA压缩运输说明与无mask的实际FBP caller注释；sprite.glm-runtime-resource.test.ts只校正职责/排重事实头，测试body保持。先证两height guard变异旧9绿，再新各一指定AssertionError及正常恢复；源图/原件/身份/清理完整保存，不以测试数量当质量。PNG算法/签名/资源/RLE高位语义/生成物/旧compat均不得改；超大尺寸域与generated-only原测试仍待，不借本片扩张接口或资源政策。全仓统一门随稳定窗口集中，非零editor诊断不合main，不关闭文件或整卡。


### CODE3d 本片结果

[PNG逐文件证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3d/README.md)：两height guard变异旧9例均绿，补证后各12绿1指定AssertionError，恢复13零诊断；boundary两混合例拆六独立合同，原四断言保留、补两个height轴。sprite.ts仅改错误primary/运输/FBP caller注释，GLM仅校排重事实头；实现与GLM测试body逐字节不变，资源/规则/退役/基线未动。

实际相邻六文件47、完整extract72文件432、game PNG三文件8和extract typecheck通过，0stderr。相邻命令两不存在路径未计为执行；完整包原件已确认真正BALL/RGM文件。两旧关闭撤回review、另两测试pending→review，0新关闭；机器已重跑确认3289/204closed/237review/2848pending。3d整卡partial，全部83卡11partial/72pending/0accept；下一片3g CLI IO，94–102/editor及当前统一门仍未收口、不合main。无下一位Agent提示词，Codex单Agent继续。

## CODE3g CLI IO 复审与停止线

已全文读CLI901行、五份CLI测试、两共享输入fixture、asset-manifest及BDF parser。输出root/data父symlink的四场景真实临时树复现已得到直接counter，转QUALITY-EXTRACT-OUTPUT-BOUNDARY-1 draft：实际治理树extracted链接主树；产品CLI/清理策略冻结，等用户裁决，没有在真实共享输出运行提取命令。旧3g的“固定suffix即清理安全”不能维持当前整文件关闭。

独立低风险准入只改cli-font-lookup.glm-q.test.ts的一条错误注释：19970实际为U+4E02“丂”，不是0x4E2D“中”（20013）。fixture与test body/身份不动，不修BDF格式/管线，不把注释校正等同机制修复。其它源码/共享配置/生成物只读；CLI/error/isolated/font四目标仅review/rework，0新关闭。相邻五CLI和BDF真实原生集合及静态门补证；83卡全量范围与94–102/editor原目标保留。

### CODE3g 本片结果

[逐文件/反证/原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3g/README.md)：四次真实临时CLI运行，其中OUT根/data父链接两场景删除另一自有临时树marker；子项链接目标保留对照明确，首个探针setup失败单列。正式CLI未改，输出策略转[高风险卡](QUALITY-EXTRACT-OUTPUT-BOUNDARY-1.md)draft等裁决；仅更正字形测试一条码点注释，body/身份/fixture保持。

五CLI+三BDF实际41通过、0失败/跳过/运行时诊断，extract typecheck通过；完整包未重复执行，上一c2同源432原件沿用。CLI旧关闭转rework，三测试pending→review，0新关闭；机器已重新确认3289/203closed/241review/2845pending。全83卡12partial/71pending/0整卡accept；静态门按本片gates实测，统一check/ratchet/protected及editor诊断仍未收口，不合main。输出策略只暂停该实现，其他3h assets/shell与94–102/editor目标继续；无下一位Agent提示词，Codex单Agent推进。

## CODE3h PNG 测试质量切片准入

最新46fb9d5fe、main=f98d0ddd8，唯一codex/code-quality-3y。全文读旧3h卡及六生产源、PNG三测试/P10和配置硬件适配、真实loader/dialog/drawSprite/framebuffer与现有RGBA fixture encoder；bootstrap仅所列caller片段。产品png.ts保持只读，RLE格式/共享输出两停线卡不因本片解除。

Codex premise verified/design agree/build allowed仅四现有测试：assets/png.test.ts、png-decode.grok-r1.test.ts、png.glm-phase1-leaves.test.ts和present/__tests__/grok-present/p10-indexed-png.test.ts。独立RGBA字节fixture复用现有小型encoder，不引入核心mock或新配置。Grok cause例以默认透传spy观察真实createImageBitmap Promise，核原始失败对象身份；3×2例核完整有序indices/opaque；主例明确保留高位索引200。P10把draw/getImageData失败拆独立合同，成功close并入原有真实Framebuffer正向例，finally恢复全部硬件观测/故障端口，不新增强转。

两bad-Blob弱重复（Grok A04、GLM坏输入摘要）及P10混合例中的同一坏Blob摘要并到保留的cause/完整上下文例；先原10例完整反控，再新9例同样完整运行。两新缺口候选为合法palette index1丢失、cause替换；须各证旧10绿/新8绿1指定AssertionError。错误前缀与close故障仅作原oracle转移，完整失败集合另列，不计新针。所有临时源/测试副本、原生JSON/raw、执行集合/exit/signal/spawn和SHA及精确清理保留。

Grok5→4、GLM2→1只有在原生list/三快照与当前SHA精确确认后，才可为两文件追加退役数据并将固定表计数27/net62同步到29/net64；旧27项、matcher/拒绝合同、baseline和规则不改。P10 2→3是合同拆分/合并后的实际身份变化，不伪称原数量或用数量领信用。局部真实V8复测后执行定向/相邻/typecheck/静态门；完整check/official ratchet/protected在稳定窗口集中，0新增关闭，3h仍partial，全83卡/94–102/editor原范围持续。

### CODE3h PNG 本片结果

[逐文件/primary/caller/oracle与原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/README.md)：两故障旧10绿/新各8绿1指定AssertionError，正常9绿；完整平面与真实原始cause身份补证。坏Blob oracle由4→1、close由2→4的转移诊断单列，不冒充新针。四测试10→9，复用现有独立PNG encoder、去错误caller注释和canvas强转，生产六源/资源/规则/baseline不变。

原生list和main/旧3y/基点三快照确认两精确退役，29项/net64、旧27与matcher/拒绝合同不变；真实png.ts局部V8 20/20 statements、2/2 functions、4/4 branches保持。相邻game17/107、extract4/16、coverage工具74、game typecheck通过，0运行时诊断。初轮探针分类/首次resume表示错误保留，原四native回执未重跑；另进程只读重建10轮反控与4轮list/V8。

四测试仅pending→review，0新增关闭；全83卡13partial/70pending/0整卡accept，原94–102/editor目标保留。机器计数、docs/lint/diff最终以本片gates实际回执为准；统一check/official ratchet/protected未新跑，editor诊断未清，不合main。下一片3h bootstrap-resources两测试及fetch-retry边界，先合法fixture/真实caller/排重，不触碰bootstrap.ts或CLI未决策略。无下一位Agent提示词，Codex单Agent继续全部83卡。

## CODE3h 启动测试与fixture有限准入

f2529c5fa基点、main仍f98d0ddd8、0behind，机器3289/203closed/245review/2841pending。完整读取bootstrap-resources.ts及两测试、fetch-retry.ts与三测试、grok-boot-mid-1/legal.ts、font.ts、main.ts及原BOOT-MEDIUM卡；bootstrap和audio-midi只读实际注入/资源ready/settle caller段。fetch三测试有相邻待核项，本片冻结留下一片；活跃57与其它Owner实现不改。

Codex premise verified/design agree/build allowed仅bootstrap-resources.test.ts、bootstrap-resources.grok-mid-1.test.ts及共用grok-boot-mid-1/legal.ts三文件。前者移除空对象/异常强转、用完整typed fixture与原始soundfont错误身份；后者将原同时放行三端口例改为assets/dialog已结局但glyph仍pending，核真实屏障，所有deferred和默认真实fetch端口均在finally结局/消费，不残留永远pending请求。fixture补齐真实loadAll要求的role0、事件segment并移除无必要空数组强转；只作端口输入，不冒充完整bootstrap或游戏可玩性。

原main的glyph降级例是Grok“glyph失败后仍等assets/dialog”完整值/警告/屏障合同弱子集，待旧/新原生集合和转移反控确认后精简4→3、族13→12，Grok9身份保持。两新缺口候选：soundfont错误替换但消息相同、glyph错误跟随assets/dialog提早放行；须旧全绿、新各指定单例AssertionError。丢glyph警告/错误fallback值两个原oracle转移另列，不混作新针。所有副本/源/原件/集合/清理SHA保存；两默认fetch例另核实际四pending→全部结局，失败断言也须收尾。

退役数据仅在原生list与main/旧3y/当前基点对照后为主测试追加一项精确4→3，并同步固定计数29/net64→30/net65；旧29/matcher/拒绝合同及baseline/配置不动。产品/音色库/资产/启动行为保持只读；不引入core mock、新依赖或ignore/强转。定向、相邻、必要typecheck、局部V8与静态门按实际输出登记；稳定模块窗口集中全仓check/ratchet/protected，0新增关闭，全部83卡与94–102/editor目标继续。

### CODE3h 启动测试本片结果

[逐文件/primary/caller/原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/bootstrap/README.md)：两个旧13绿缺口已各新11绿1指定AssertionError，正常族12绿；glyph警告/降级值两oracle由2→1转移，主4→3精简，Grok九身份保持。实际透传IO观测旧两默认例各4 pending，新正常及两故意失败断言后的恢复边界均0。三测试/fixture补证，生产、音色库、资源、规则与baseline不改。

三轮原生list核清main/基点4+9、旧3y3+9（未有FM例）的真实差异，精确批准仅当前4→3且旧digest等于官方baseline记录。表30/net65、旧29/matcher/拒绝合同不变；真实源局部V8 statements12/13、functions6/7、branches6/6保持，不虚称全覆盖。相邻22文件129例、game typecheck、75覆盖工具通过，零运行时诊断；另进程重建10业务/转移轮、3 IO轮与5 list/V8。collector历史快照差异停机和verifier相同hook错误分组误判保留，原生回执未重跑/改写。

三文件仅pending→review，0新关闭，全83卡仍13partial/70pending/0整卡accept。最新机器与静态门以本片gates回执为准；全仓check/official ratchet/protected未新跑，editor诊断未清，不合main。下一片fetch-retry三测试，优先不同attempt Error身份、真实卸载/重装及method/取消/退避边界，逐合同补证和排重；bootstrap.ts/CLI策略与活跃Owner实现继续只读。无下一位Agent提示词，单Agent继续全部83卡与94–102/editor。

## CODE3h/CODE71 fetch三测试有限准入

dfd03a811基点，fresh fetch main仍f98d0ddd8，0behind；机器3289/203closed/248review/2838pending。全文读fetch-retry源/三测试、main/boot-loading/audio-midi/ending-avi-host与历史71卡；新[取消生命周期卡](QUALITY-FETCH-ABORT-LIFECYCLE-1.md)draft记录真实Node原生fetch/HTTP的退避未取消、Request自定义reason重复attempt，生产立即停线只读。本卡不得把历史71的done当build授权，也不把3条底层调用写成3条HTTP请求。

Codex premise verified/design agree/build allowed独立白名单仅fetch-retry.test.ts、fetch-retry.boundaries.test.ts、fetch-retry.glm-phase1-leaves.test.ts：去现有fetch强转、最后网络错误用每attempt不同对象/默认重试数，终态503核原Response身份，卸载例实际使用原flaky并核恢复引用；重装例实测网络失败后的真实重试。保留AbortError IO合同，补当前已正确支持的“init.signal已取消但reason为非AbortError”合同；Request/退避取消风险不在本片实现或断言成正确行为。

main耗尽弱例的消息/默认次数oracle转入boundary不同错误身份例；main混合503/404拆两独立轴，预计main仍6但身份改变、boundary10→11、GLM2保留，族18→19须以原生list实际确认，不能凭净数假装无精简。没有测试文件计数下降时不改精确退役表/规则/baseline。先完整旧族反控：保留第一错误、卸载不恢复fetch、删init.signal guard，候选末503 clone另按实际区分旧已保护/新缺口；再补证各指定业务AssertionError。原有默认次数/404等oracle转移单列，不把已保护项领新信用。

测试finally/afterEach必须消费实际promise、恢复自己拥有的global/timer/mock，不让被测卸载故障污染后续例；不得靠测试收尾恢复假称产品恢复正确。生产、取消高风险策略、所有公共接口与资产保持；CODE71当前开始成果复审但无整卡accept，全部83卡及94–102/editor继续。定向/相邻/typecheck与局部V8后走静态门，统一check/ratchet/protected在稳定窗口集中，0新增关闭。

### CODE3h/CODE71 本片结果与候选域修正

[逐文件/primary/caller/原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/fetch-retry/README.md)：保留首错、卸载不恢复fetch、删除init.signal guard三个变异旧18全绿，最终各18绿1指定AssertionError；正常19绿。clone终态Response原已一红，默认次数/404原oracle各一对一转移，不计新缺口。main弱耗尽转boundary、混合503/404拆轴，实际6/11/2，数量/身份变化公开；没有文件计数下降，精确退役表/规则/baseline未改。

初始新增例要求已取消init必须调用一次底层，合法预检reference使其一红；最终改成实际请求开始后取消，精确一次调用保留，同reference19绿。初始after和一次完整game原件保留且归属清楚；最终七轮/正常对照、list/V8/相邻重跑，旧before七轮未改。真实源局部V8旧/新33/33 statements、5/5 functions、41/41 branches保持；三个测试缺口在旧100%覆盖下仍存活，不能据此关闭文件。

最终25文件156例、game typecheck、75工具均零运行时诊断通过。完整game按三片合跑一次：初始候选320文件3605 passed/0pending，但17块stderr涉及14测试，包质量不通过；输出/源SHA见[诊断](QUALITY-GAME-RUNTIME-DIAGNOSTICS-1.md)，未全文核14文件、不静音、不改写旧日志。生产取消两个真实IO counter归[生命周期卡](QUALITY-FETCH-ABORT-LIFECYCLE-1.md)draft；旧71已有“不等退避”策略，需失败反例/独立实现准入，不重复让用户选既定策略。

fetch-retry.ts旧关闭撤回rework、boundary旧关闭撤回review，主/GLM保持review，0新关闭。全83卡14partial/69pending/0整卡accept；机器与静态门以本片gates实际回执为准。统一check/official ratchet/protected未新跑，game与editor诊断未清，不合main。下一片取消生命周期反例与准入，随后game17块/editor余诊断稳定窗口；全部83卡/94–102/editor原目标保留。已知boundary“网关耗尽拒绝”过期注释留待取消实现片校正，未声称整文件注释清零。无下一位Agent提示词，单Agent继续。

### 2026-10-17 C1 取消生命周期与最新main收口

当前治理分支已合并 `origin/main=36caec0251b48f94fa5b9d5c4c786571037f9869`，0 behind/160 ahead。`QUALITY-FETCH-ABORT-LIFECYCLE-1` 已从失败反例进入 build：`fetch-retry.ts` 增加可取消退避与 Request.signal 归属，合并后四文件26例、game typecheck 和全仓 `pnpm check` 通过；本批抽取输出边界C1另有定向9/9、pal-extract 72/434、全仓 `pnpm check` 通过，lint 4959 文件0/0/0，当前账本3307/226/12/3069。

官方 `pnpm coverage:ratchet` 与 `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast` 均因 baseline 回退失败：shared statements 447/466、branches 203/218；pal-extract statements 1068/1546、branches 461/593、functions 111/140、lines 943/1367。未改 baseline、未新增弱测试。C2 已把 game 完整 verbose stderr 从17块降为15块，但剩余15块和 editor 全包运行时诊断仍未逐文件清零；不合main、不关闭任何ledger文件。下一批继续 game/editor 诊断和83卡逐文件复审。

### 2026-10-17 C2 game 运行时诊断切片

本批完整读取并核对 `e2-equipment-effects.test.ts`、`e4-run-equip-script.test.ts`、`equip-effect.ts`、`equipment-state.ts`、stats fixture 与相邻装备/跨模块 caller。未知 row 999 和未注册 `L_99999` 是合法负输入，测试现在在 finally 内捕获并精确断言生产 warning；未改生产日志、公共接口、状态 ownership 或资源。未改测试 8/8 但有2块 stderr，改后8/8且0 stderr；game typecheck、相邻6文件66 tests、根 `pnpm check` 和 docs/lint/ledger 门通过。

本批两测试登记为 `review`，当前账本3307/226/12/3069；完整 game 321/3612 通过但仍15块 stderr。official ratchet/protected fast 的 coverage tools 各75/75通过，正式 coverage 门仍因 shared/pal-extract baseline 回退失败，未改 baseline。C2 已提交 `2f36cb0d2` 并推送治理分支，不合main；下一片继续剩余15块 game stderr 或切 editor，依旧不把全包绿替代逐文件验收。

### 2026-10-17 CODE3j time-format 当前复审切片

本片先同步最新 `origin/main`，当前分支 `codex/code-quality-3y` 为 `0 behind / 174 ahead`；完整读取 `time-format.ts`、三份直接合同测试、`store.ts`/测试、`overlay.ts`、`timer.ts`、`speedrun/index.ts`，并读取 `tools-panel.ts` 的模块与 `parseHms` caller 范围。证据与 SHA 见 [`3j-time-format`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-time-format/README.md)。

发现 `parseHms` 对超长十进制段只拒绝 `NaN`，可把总毫秒算成 `Infinity`；工具面板会将其送入 `setSpeedrunBest`，持久化时被 JSON 静默写成 `null`。先加入 `${'9'.repeat(308)}:59:59` 失败反例，再让段值和总毫秒都必须 finite；合法格式、小时无固定上界和 UI 形态保持不变。未发现 schema/save、迁移、资产、公共游戏接口或第一阶段机制边界，未扩大到无 caller 证据的非 finite 格式化输入。

定向四文件 `15 passed`，相邻 overlay/timer/tools-panel 六文件 `43 passed`，`pnpm --filter @type-pal/game run typecheck` 通过且无诊断。覆盖率、official ratchet、protected fast 和全仓 `pnpm check` 按用户明确的成本规则留到完整大模块收口；本片不把历史 3j done 或本切片证据升为整卡 accept。3j 其余工具文件与 3i/后续 pre-94 卡仍 pending；94–102 继续后置。

### 2026-10-17 CODE-QUALITY-3i 对话资源 / 预缓存 / 音量 / 商标切片

- 范围：`packages/game/src/assets/dialog-assets.ts`、`packages/game/src/shell/{precache-client,precache-ui,audio-volume,trademark-fallback}.ts` 与直接测试；另读 `main.ts`、`bootstrap.ts` 相关资源/可玩门/三路音量/RNG caller，`present.ts`、`tools-panel.ts`、`public/sw.js` 相关区间。
- primary/caller/oracle：`reference/sdlpal/main.c:197-203`；extracted portraits/icon manifest、shared PNG/RLE 解码器；`main.ts` 的 onPlayable/startPrecache、`bootstrap.ts` 的 resource barrier/PresentContext/BattleAssets/onPresent、`sw.js:112-151` 进度消息生产；直接测试的真实 DOM/canvas、storage/sink、MessageEvent/ready 和 framebuffer oracle。
- 直接发现：`precache-ui.ts` 的 `setNecessaryProgress`/`setFullProgress` 对 `NaN` 未拒绝，旧实现会写入 `NaN` 状态并污染后续合法进度。先行红测 2 例确认，随后加入有限/非负边界与总量上限归一；正常阶段、零总量和生命周期合同保持。
- 未修/保留：dialog 资源按单资产失败隔离；precache-client 的 onPlayable/ready race/SW 协议保留，模块级 worker 状态在多次 bootstrap/HMR 下缺生产 caller 证据，仍为 review 候选；音量与商标流程未发现新的直接缺陷。没有触碰 schema/save、生成物、公共接口或用户可见形态。
- 验证：先行 `precache-ui-host.grok-r1.test.ts` 22 例中 2 例失败；修复后定向 12 files/79 tests passed，`pnpm --filter @type-pal/game typecheck` passed。覆盖率、official ratchet、protected fast、全仓 `pnpm check` 按用户成本规则留到完整大模块收口；本片已读清单与 SHA 见 [`3i-dialog-precache`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3i-dialog-precache/README.md)。3i 整卡保持 `partial`，不据此宣布全仓完成。

### 2026-10-17 CODE-QUALITY-3k present primitives 三文件切片

- 范围：`packages/game/src/present/{framebuffer,screen-shake,screen-wave}.ts` 与七份直接测试；读取 `present.ts` 的 clear/wave/shake/flush caller、`draw-tilemap.ts`/`draw-sprite.ts` 的 `writePixel` caller，以及 SDL `scene.c`、`video.c`、`global.h` 对应 primary 区间。
- primary/caller/oracle：`scene.c:365-430,486`、`video.c:571-620`、`global.h:379,538-539`；真实 typed framebuffer、行级像素搬运、循环守恒、相位 reset、advance=false 和 present 时序。
- 逐文件结论：framebuffer 默认/离屏尺寸、越界静默写、palette 缺色 fallback；screen-shake 奇偶搬运/黑条/level 边界/递减；screen-wave 32 相位、循环卷动、WORD 关断、跨帧相位和 fade-only 均与 caller/primary 一致，未发现新直接缺陷。历史 raw opcode/mutant 证据未在本片重跑，不扩写成当前运行结果。
- 未修/保留：`dither-fade`、`draw-number`、`follower-pos` 未读，真实视觉/E2E 与整卡统一质量门保持 pending/partial；未触碰 battle/menu/dialog/save/schema 或 UI 形态。
- 验证：定向 7 files/35 tests passed，`pnpm --filter @type-pal/game typecheck` passed，无测试 stderr。覆盖率、official ratchet、protected fast、全仓 `pnpm check` 按用户成本规则留到完整大模块收口；已读清单与 SHA 见 [`3k-present-primitives`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3k-present-primitives/README.md)。3k 整卡保持 `partial`。

### 2026-10-17 CODE-QUALITY-3k dither / number / follower 三文件切片

- 范围：`packages/game/src/present/{dither-fade,draw-number,follower-pos}.ts` 与六份直接测试；读取 `present.ts` 的 dither/follower caller、battle present intro/summon/数字弹幕区间、menu/dialog/battle 的 `drawNumber` caller。
- primary/caller/oracle：`reference/sdlpal/video.c`、`battle.c`、`ui.c:640-732`、`scene.c:658-780`；真实 framebuffer/opaque mask、dither phase/backup、方向轴/障碍/冻结 oracle。
- 逐文件结论：dither 的 72-step/RG_INDEX/backup ownership 和 follower 的 walking/静止冻结/障碍回退/朝向/trail fallback 均与 primary/caller 一致；draw-number 的合法颜色/对齐/R-to-L/truncate/mask/缺帧合同一致，但正 Infinity 会在长度循环中无限循环，生产可达性未证，已将实现行置 `review`，不在本批擅改公共绘制合同。
- 未修/保留：非有限数字输入的产品边界与安全反例待后续独立裁决；没有运行可能卡死的直接反例，也未触碰 UI 形态、save/schema 或 battle 行为。3k 整卡保持 `partial`。
- 验证：定向 6 files/42 tests passed，`pnpm --filter @type-pal/game typecheck` passed，无测试 stderr；覆盖率、official ratchet、protected fast、全仓 `pnpm check` 按用户成本规则留到完整大模块收口。已读清单与 SHA 见 [`3k-dither-number-follower`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3k-dither-number-follower/README.md)。

### 2026-10-17 CODE-QUALITY-3l battle-present 三文件切片

- 范围：`packages/game/src/present/battle/{draw-battle-bg,draw-battle-effect,draw-battle-num}.ts` 与四份直接测试；读取 `present-battle.ts` 背景/keepEffect/波动/精灵/overlay/UI/飘字装配区间和 `battle.c`、`uibattle.c`、`fight.c` primary 区间。
- primary/caller/oracle：`battle.c:50-90,565-620,982`、`uibattle.c:1746-1767,1770-1808`、`fight.c:600-720,2130-2200,2740-2770`；真实 framebuffer 像素、opaque mask、奇数宽 anchor、颜色基址、缺资源 no-op、寿命/位移 oracle。
- 逐文件结论：背景索引0不透明/低 nibble染色/裁剪、effect/magic 底中 anchor/mask/缺帧降级、floating numbers 40ms age/0..10寿命/上移/5位对齐均与 caller/primary 一致，未发现新直接缺陷。drawNumber 的正 Infinity review 风险沿 3k 保持，未扩写为战斗可达 bug。
- 未修/保留：`draw-battle-settlement`、`draw-battle-sprites`、`draw-battle-ui` 和整卡统一门/E2E 未核；未触碰 battle core、公式、schema/save 或 UI 形态。3l 整卡保持 `partial`。
- 验证：定向 4 files/23 tests passed，`pnpm --filter @type-pal/game typecheck` passed；覆盖率、official ratchet、protected fast、全仓 `pnpm check` 按用户成本规则留到完整大模块收口。已读清单与 SHA 见 [`3l-battle-present-primitives`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3l-battle-present-primitives/README.md)。

### 2026-10-17 CODE-QUALITY-3l 战斗结算屏切片

- 范围：`packages/game/src/present/battle/draw-battle-settlement.ts` 与三份直接/像素测试；读取 `present-battle.ts` 结算 caller、`draw-number.ts`/`font.ts`/`draw-box.ts` 公共绘制端口，以及 `battle.c:991-1373`、`ui.c:640-732` primary。
- 逐文件结论：经验/金钱、升级八项、隐藏经验涨点和练成屏的 box/文字/数字/arrow/slash/mask/动态字宽均有像素 oracle，缺资源保持 no-op；未发现直接缺陷。共享 `drawNumber` 正 Infinity 风险仍按 3k review 保留。
- 未修/保留：精灵/UI/完整装配器仍未核，不改变 battle core、玩法、schema/save 或 UI 形态；3l 整卡继续 `partial`。
- 验证：定向 3 files/11 tests passed，`pnpm --filter @type-pal/game typecheck` passed，无测试 stderr；coverage、official ratchet、protected fast、全仓 `pnpm check` 留到完整大模块收口。已读清单与 SHA 见 [`3l-settlement`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3l-settlement/README.md)。

### 2026-10-17 CODE-QUALITY-3l 战斗精灵切片

- 范围：`packages/game/src/present/battle/draw-battle-sprites.ts` 与三份直接测试；读取 `present-battle.ts` 精灵/overlay caller、`battle-positions.ts`，以及 battle/fight/uibattle/palcommon primary 区间。
- 逐文件结论：敌我 anchor、idle/睡眠定格、死亡姿态/72-step fade、隐身/变身、opaque mask、color shift、target highlight、混乱抖动、Y/X 与 overlay 排序、边缘裁剪均有像素/状态 oracle，未发现直接缺陷。共享 `drawNumber` 正 Infinity 风险仍按 3k review 保留。
- 未修/保留：`draw-battle-ui` 和完整 present-battle 装配器仍未核；未改变战斗坐标、玩法或 UI 形态。3l 整卡保持 `partial`。
- 验证：定向 3 files/69 tests passed，`pnpm --filter @type-pal/game typecheck` passed，无测试 stderr；coverage、official ratchet、protected fast、全仓 `pnpm check` 留到完整大模块收口。已读清单与 SHA 见 [`3l-sprites`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3l-sprites/README.md)。

### 2026-10-17 CODE-QUALITY-3l 战斗 UI 切片

- 范围：`packages/game/src/present/battle/draw-battle-ui.ts` 与三份直接测试；读取 `present-battle.ts` caller、`player-poison-state.ts` party-slot mapper，以及 `uibattle.c`、`magicmenu.c`、`itemmenu.c` primary 区间。
- 逐文件结论：对话/逃跑/自动战斗早退、InfoBox/party-slot 毒头像、主图标合法性、目标箭头、misc/magic/item 网格、MP/数量/说明和 CLASSIC 全体目标过渡均与 primary/caller 一致，未发现直接缺陷。共享 `drawNumber` 正 Infinity 风险仍按 3k review 保留。
- 未修/保留：未改变战斗 UI 形态、公共接口或 party-slot 语义；3l 整卡统一门/完整装配器仍按 `partial` 保持。
- 验证：定向 3 files/51 tests passed，`pnpm --filter @type-pal/game typecheck` passed，无测试 stderr；coverage、official ratchet、protected fast、全仓 `pnpm check` 留到完整大模块收口。已读清单与 SHA 见 [`3l-battle-ui`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3l-battle-ui/README.md)。

### 2026-10-17 CODE-QUALITY-3m battle positions 只读切片

- 高风险边界：3m 涉及 battle core 坐标/公式/状态/RNG；本片只读 `battle-positions.ts`，不改机制、坐标、存档或公共接口。
- primary/caller：`battle.c:27,903-939`、`global.h:401-404`；`battle-state.ts` 初始 pos、`battle-opcodes.ts` 动态阵型、present sprite/UI anchor caller，`battle-state.test.ts` 位置/fallback fixture。
- 结论：1/2/3 人 SDL 表、4/5 fallback、EnemyPos 缺失 fallback 与 idx bounds 逐文件核验；未发现直接缺陷。3m 其余 formulas/magic-damage/status/turn-queue/rng 仍 pending，不作高风险取舍。
- 验证：按关键词定向 `battle-state.test.ts` 为 `1 passed / 13 skipped`，game typecheck 无诊断；coverage、official ratchet、protected fast、全仓 `pnpm check` 留待完整大模块收口。已读清单与 SHA 见 [`3m-battle-positions`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3m-battle-positions/README.md)。3m 整卡保持 `partial`。

### 2026-10-17 CODE-QUALITY-3m turn-queue 只读切片

- 高风险边界：不改 action order、RNG、dualMove 或玩法；完整读取 `turn-queue.ts`/直接测试，读取 `battle-system.ts:680-770` caller、`fight.c:1451-1584` 和 `battle.h` ACTIONQUEUE primary。
- 结论：敌先填充、玩家后填充、dex 降序稳定排序、dualMove dex2 两方向标记与 caller 的失能 dex=0/不耗 RNG 接线一致；未发现直接缺陷。NaN/越界 dex 不在合法 caller 域，保持未裁决。
- 验证：`turn-queue.test.ts` + `battle-state-machine.glm-battle.test.ts` 关键词定向 `5 passed / 14 skipped`，game typecheck 通过；coverage、official ratchet、protected fast、全仓 `pnpm check` 留待完整大模块收口。已读清单与 SHA 见 [`3m-turn-queue`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3m-turn-queue/README.md)。3m 整卡保持 `partial`。

### 2026-10-17 CODE-QUALITY-3m status 复审/最小修复切片

- 范围：`packages/game/src/core/battle/status.ts`、`__tests__/status.test.ts`；读取 `battle-state.ts` 状态 shape/seed、`battle-system.ts` 状态消费与回合末 caller、`battle-finalization.ts` 战后清理；primary 为 `global.h:38-56`、`fight.c:1632-1661`、`global.c:2173-2344`、`battle.c:1818-1835`、`script.c:1052-1102`，并对照 `docs/phase1/game-mechanics.md` 状态寿命段。
- 发现并修复：TS 原先按 `health > 0` 跳过死敌状态，SDLPal 对 `wMaxEnemyIndex` 的全部敌方槽位统一递减。先把既有“死敌不 tick”测试改为 primary 反例并确认旧实现 `1 failed / 6 passed`，再删除 HP 过滤；未改变 status shape、存档或公共接口。
- 结论：玩家/敌方全部 status counter 仍统一 `>0` 后减一；战末/复活 `<=999` 清理和 `>999` 装备授予保留由现有 owner 负责。死槽递减合同已由直接测试固定；3m 公式、magic-damage、RNG 与统一质量门仍未完成，整卡保持 `partial`。
- 验证：status/actions/battle-system/state-machine/finalization/state 六组定向共 `308 passed`，无测试 stderr；`pnpm --filter @type-pal/game typecheck` 通过；coverage、official ratchet、protected fast、全仓 `pnpm check` 留待完整大模块收口。已读清单与 SHA 见 [`3m-status`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3m-status/README.md)。

### 2026-10-17 CODE-QUALITY-3m formulas / magic-damage 只读切片

- 范围：完整读取 `packages/game/src/core/battle/formulas.ts`、`magic-damage.ts` 及两份直接测试；读取 `actions/magic.ts`、`actions/attack.ts`、`actions/coop-magic.ts`、`battle-opcodes.ts`、`battle-system.ts` 与 runtime→battle 投影 caller；primary 为 `fight.c:131-389,4012-4017,4245-4330,4673-4853,5300-5400`、`global.c:1736-1975`、`util.c:251-275` 和机制文档对应公式段。
- 结论：SHORT/WORD 与三段 base damage、元素/毒抗、场效、玩家/敌人两套 multiplier、各目标 RNG、auto-defend 前置抽样、inline/simulate 下限、死队员/空槽跳过和 object-magic 解析均与 primary/caller 一致，未发现直接缺陷；测试 fixture 的窄 `as any` 仅用于大型共享类型补齐，不改变真实 oracle。
- 验证：公式、magic-damage、battle actions、coop magic、敌法术 E2、battle opcode、throw-item 共 `8 files / 222 passed`，无测试 stderr；`pnpm --filter @type-pal/game typecheck` 通过。coverage、official ratchet、protected fast、全仓 `pnpm check` 留待完整大模块收口。已读清单与 SHA 见 [`3m-formulas-magic`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3m-formulas-magic/README.md)。3m 整卡保持 `partial`。

### 2026-10-17 CODE-QUALITY-3m RNG 复审/边界修复切片

- 范围：完整读取 `packages/game/src/core/rng.ts`、`rng.test.ts`、`enemy-ai.ts`、`actions/flee.ts`、`battle-progression.ts`；读取 `battle-system.ts` 的队列 jitter、自动选法术、混乱目标、隐藏经验/升级 caller；primary 为 `util.c:169-275` 和 `fight.c:1474-1563,3637-3658,4143,4540-4658`。
- 发现并修复：SDLPal `RandomLong/RandomFloat` 在 `to <= from` 时直接返回 `from` 且不消费状态；TS 三个 range API 原先会额外 `next()`，倒序区间还返回错误值。先行反例 `1 failed / 7 passed`，再加前置分支；合法区间分布不变。
- 测试修正：单人队 `RandomLong(0,0)` 的 battle-system 回归显式固定后续伤害掷骰，解除对旧错误抽样副作用的隐式依赖；仍验证目标越界不崩溃且玩家受击。
- 验证：rng/enemy-ai/actions/battle-system/progression/state-machine/event-system 共 `7 files / 638 passed`；无新增测试诊断。coverage、official ratchet、protected fast、全仓 `pnpm check` 留待完整大模块收口。已读清单与 SHA 见 [`3m-rng`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3m-rng/README.md)。3m 整卡保持 `partial`。

### 2026-10-17 CODE-QUALITY-3n fade / identity / catalog 当前复审切片

- 范围：完整读取 `palette-fade.ts`、`scene-identity.ts`、`word-lookup.ts`、`script-catalog.ts` 及四份直接/跨模块测试；读取 `event-system.ts` fade/catalog caller、`scene-system.ts` map identity、`present.ts`/battle present palette step、`bootstrap.ts` WORD/global/map 注入；primary 为 `palette.c:123-666`、`text.c:966-1000`、`script.c` 相关脚本入口。
- 发现并修复：`PAL_PaletteFade` C 实现使用 32 步、每通道 `/31` 整数截断；TS 原 `Math.round` 在 0→1 边界提前一档。先行反例确认旧实现失败，再改为 `floor(progress*32)` + `/31` + `Math.trunc`；原80色中点 oracle同步改为 C 真值41。
- 结论：scene identity 单一 map ownership、WORD 表优先/fallback、script catalog own-property/null-prototype、已批准 zero-item overlay 与 fade freeze/quantization/remap 均与 caller/primary 一致，未发现其它直接缺陷。3n 当前 `partial`，不标 accept/done。
- 验证：直接/跨模块四文件 `34 passed`、无测试 stderr；相邻 event/scene/present 八文件 `554 passed`，但有既有 fixture 的预期 `console.warn`（未知 label、无当前对象、越界 scene object），因此运行时诊断未清零。game typecheck通过；coverage、official ratchet、protected fast、全仓 `pnpm check` 留待完整大模块收口。已读清单与 SHA 见 [`3n-fade-identity-catalog`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3n-fade-identity-catalog/README.md)。

### 2026-10-17 CODE-QUALITY-3o mode / history / poison / search 当前复审切片

- 范围：完整读取 `dialog-history.ts`、`mode.ts`、`player-poison-state.ts`、`scene-system-search.ts` 及直接测试；读取 menu/scene/event/bootstrap caller；primary 为 `play.c:25-215,362-510,534-610`、`global.c:1420-1685`、`scene.c:503-507`。
- 结论：history trim/dedup/map/CAP/老档恢复、mode autoScript gate/同 tick event resume、party-slot poison dedup/runner/level99/cure、Search 13-cell/grid/h/trigger threshold/first-hit 均与 primary/caller 一致；未发现直接缺陷。反直觉 Search 阈值和 party-slot ownership 保持原合同，不凭直觉改写。
- 验证：直接 helper/ownership 五文件 `45 passed`（mode fixture有一条预期 ip 越界 warning）；相邻 event/scene/battle 八文件 `667 passed`，另有既有 fixture warnings。game typecheck通过；运行时诊断未清零，coverage、official ratchet、protected fast、全仓 `pnpm check` 留待完整大模块收口。已读清单与 SHA 见 [`3o-mode-history-poison-search`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3o-mode-history-poison-search/README.md)。3o 整卡保持 `partial`。

### 2026-10-17 CODE-QUALITY-3p event-opcode-player 当前复审切片

- 范围：完整读取 `event-opcode-player.ts` 与四份直接测试；读取 event-system 唯一 dispatch、equip/inventory/player-poison owner；primary 为 `script.c:752-832,1052-1135,1257-1405,1623-1627,1816-1846`、`global.c:1459-1685,2173-2344`。
- 结论：role/slot/0xFFFF、SHORT/WORD、fScriptSuccess、HP/MP clamp、装备交换、复活/毒/状态/魔法的合法 no-op 与 owner 边界一致；未发现新直接缺陷，不改 event format、battle-opcodes 或 save/schema。
- 验证：四份 event-opcode 直接测试 `61 passed`、无测试 stderr；加入 event-system/equip/ownership/magic-script 相邻回归后 `8 files / 471 passed`，有既有 fixture warning，因此运行时诊断未清零。game typecheck通过；coverage、official ratchet、protected fast、全仓 `pnpm check` 留待完整大模块收口。已读清单与 SHA 见 [`3p-event-opcode-player`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3p-event-opcode-player/README.md)。3p 整卡保持 `partial`。

### 2026-10-17 CODE-QUALITY-3q scene-system 当前复审切片

- 范围：完整读取 `scene-system.ts`（662行）与 `scene-system.test.ts`（2064行），另读 `scene-system-search.test.ts`、`mode.test.ts`；读取 mode/event/bootstrap caller；primary 为 `play.c:25-238,362-591`、`scene.c:512-847`、`map.c:277-299`、`res.c:229-301`、`global.h:75-121,512-531`。
- 结论：方向优先、16×8半tile、菱形 bit13、fCheckRange、sState blocker、triggerMode 4..8、vanish/复活、13-cell search、NPC/party pose、camera/trail、scene/onEnter/resume、TouchFar 首帧移动均与 primary/caller 一致；未发现新直接缺陷，不改 scene 数据/坐标/公共接口。
- 验证：scene-system/search/mode/dependency/event 五文件 `467 passed`，有既有 fixture warnings（未知 label、无当前对象、越界 scene object、脚本 IP 越界），故运行时诊断未清零；game typecheck通过。coverage、official ratchet、protected fast、全仓 `pnpm check` 留待完整大模块收口。已读清单与 SHA 见 [`3q-scene-system`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3q-scene-system/README.md)。3q 整卡保持 `partial`。

### 2026-10-17 CODE1/CODE2 boundary carry-over

本片接收工作树中已完成的两个窄测试合同：`packages/shared/src/rle.boundaries.test.ts` 新增“相邻 offset 截断前一帧帧头即拒绝”反例；`packages/shared/src/rng.boundaries.test.ts` 新增同一 surface 连续 delta 累加并保留首帧像素的 ownership 合同。两项都只改测试，不改 RLE/RNG/YJ2 实现、公共出口、资源或格式策略；RLE 高位 literal 风险继续留在 `QUALITY-RLE-COMMAND-TRUTH-1` draft。

验证：shared 定向 `3 files / 30 tests passed`，shared 全包 `16 files / 128 tests passed`，shared typecheck 通过；本片不运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`。两测试从历史 ledger `已验证` 重开为 `review`，不增加 closed；CODE1/CODE2 整卡仍 partial，未把测试绿灯推成格式或全仓验收。

### 2026-10-17 CODE3j countdown 当前复审切片

完整读取 `packages/game/src/tools/speedrun/countdown.ts`、两份直接合同测试、`speedrun/index.ts` 及其两份 caller 测试；另读 tools-panel 的 pause caller 和 toast 相邻 DOM 生命周期。`showCountdown` 的单例节点、文本变更、`null` 清理、重复清理和无 document no-op 均由真实合同覆盖；index 在计时器停用时主动清理，在启用时只传正倒计时文本，未发现直接缺陷或重复测试。

定向 `4 files / 17 tests passed`，无失败、跳过或 stderr；本片不运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`。证据见 [`3j-countdown`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-countdown/README.md)，3j 整卡保持 partial，94–102 继续后置。

### 2026-10-17 CODE3j display-scale / fps-overlay 当前复审切片

完整读取 `display-scale.ts`、两份直接测试、`fps-overlay.ts`、`fps-overlay.test.ts`、display/fps leaves 和 tools-panel 的委派合同；另核 `main-loop.ts` 的 rAF 时间戳 caller 与 bootstrap 的 controller 构造范围。NaN/损坏存储、clamp/round、居中样式、fullscreen 委派、FPS 采样/50阈值、关闭清理和 module state ownership 均有直接判别力，没有发现新的实现缺陷或重复合同。

定向 5 文件 `40 passed`，game typecheck 通过且无诊断；本片不运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`。证据见 [`3j-scale-fps`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-scale-fps/README.md)，3j 整卡保持 partial。

### 2026-10-17 CODE3j toast / map-names / checkpoints 当前复审切片

完整读取 `toast.ts`、`map-names.ts`、`speedrun/checkpoints.ts` 及直接测试、detectors/store 和 shared authored map-name caller。toast 的容器/元素两个 timer 与空容器清理、map-name 的 shared 薄适配/缺名回退、checkpoint 的 21/id/时间/BANANA 静态合同均有直接证据；PalTimer 坐标和边缘点仍按源码注释保持 runtime unknown，不擅改速通数据。

定向 `5 files / 22 tests passed`，无失败、跳过或 stderr；本片不运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`。证据见 [`3j-toast-map-checkpoints`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-toast-map-checkpoints/README.md)，3j 七个生产文件已有切片证据但整卡仍 partial。

### 2026-10-18 CODE52 波次质量门收口（覆盖 47–52）

- 本波次把 47–52 的低成本逐包回归集中收口：`pnpm check` 通过，docs/coverage-tools/quality-tools/E2E-tools/script-governance 全绿；七包 typecheck/test 均通过，最终 lint-zero 为 5002 files、0 errors / 0 warnings / 0 infos。
- 官方 ratchet 默认模式按 fail-closed 识别 6 个已有测试身份精简；逐项核对任务卡、approved-test-retirements 精确账、双 digest/文件 SHA 与相邻 oracle 后，使用仓库现成的 `--allow-scope-removal` ratchet 正式生成新基线，提升 13 项、范围变化 10 项。没有生产 scope removal，没有新增 ignore/exclude，也没有弱化规则。
- protected fast（`TYPE_PAL_COVERAGE_BASE_REF=origin/main`）通过；737 source files / 19,930 tests，总 coverage 为 90.02% statements、83.71% branches、89.64% functions、91.90% lines。完整命令、包级计数和基线数值见 [`53-wave-gates`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md)。
- 本波次不改变卡状态：47–52 仍 `partial`；环境诊断像素文件、draw-magic 高风险 PlayerInfoBox 状态差异和其它 pending/review 继续保留。下一批仍优先 pre-94，且避开活跃任务。

### 2026-10-18 CODE-QUALITY-55 draw-menu 当前复审

- 范围：`draw-menu.ts`、两份专属测试；完整读取 `present.ts:679-705`、`menu-driver.ts`/`menu-mode.ts`/`menu-stack.ts`、menu state owners 与 SDLPal `uigame.c`/`ui.c:458` primary。
- 结论：stack 顺序、cash/主菜单/system/confirm/switch/save-slot/inventory-action/shop-sell 坐标和 extra ownership 与 primary/caller 一致，未发现产品行为或公共接口缺陷。删除无实际用途的 `SelectionMenuState` lint 伪用法，纯重构不改输出。
- 验证：直接 3 files/15 tests、相邻 11 files/197 tests、game typecheck、lint-zero 5002 files 0/0/0、diff-check 均通过；coverage 等沿用已收口的 [`53-wave-gates`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md)。55 从 pending 提升为 `partial`，不作整卡 accept/done。

### 2026-10-18 CODE-QUALITY-56 minimap thumbnail 生命周期当前复审

- 范围：`minimap.ts`、两份专属测试；完整读取 bootstrap thumbnail renderer、tools-panel/dev-panel caller、scene-system、draw-tilemap 两层绘制与 phase1 相机边界。
- 结论：`baseLoading` 直到 `Image.onload/onerror` 才释放，成功/失败缓存与 map/outW dedup ownership 均成立；未发现新产品缺陷。临时提前释放 loading 的变异使专属测试 1 failed / 5 passed，证明反例有判别力；变异已恢复，未留下实现改动。
- 验证：直接 2 files/20 tests、相邻 tools/dev 4 files/51 tests + picker lifecycle 5 tests、game typecheck通过；coverage 等沿用 [`53-wave-gates`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md)。56 从 pending 提升为 `partial`，seam repair/视觉差异留 CODE-QUALITY-57。

### 2026-10-18 CODE-QUALITY-58 tools-panel 当前复审

- 范围：完整读取 `tools-panel.ts`、两份专属测试、bootstrap setup caller、minimap/save-io/quick-save/battle-inspect 依赖；核 DOM/键盘传播、tab 投影、战斗刷新签名、音频/缩放/FPS/fullscreen 委托与 timer lifecycle。
- 结论：面板根节点与样式幂等、Backquote 放行/其它键阻断、真实依赖委托和战斗 250ms 刷新均有 caller/oracle；未发现本卡直接缺陷。不改 save-io VERSION/payload 或公共接口。
- 验证：定向 2 files/18 tests、game typecheck通过；coverage 等沿用 [`53-wave-gates`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md)。58 从 pending 提升为 `partial`，save/import 版本风险继续由 CODE-QUALITY-59 独立处理。

### 2026-10-18 CODE-QUALITY-61 speedrun store 当前复审

- 范围：完整读取 `speedrun/store.ts`、两份专属测试、`speedrun/index.ts`/`overlay.ts`/`tools-panel.ts:723-805` caller 与 timer/checkpoint 设计边界。
- 结论：设置仅识别 1/0；bests 以 defaults 为骨架，拒绝坏 JSON、未知 key、数组/标量、负数、Infinity、字符串/对象并保留合法小数毫秒；未发现直接缺陷。
- 验证：直接 2 files/9 tests、相邻 3 files/30 tests通过；coverage 等沿用 [`53-wave-gates`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md)。61 从 pending 提升为 `partial`，不作整卡 accept/done。

### 2026-10-18 CODE-QUALITY-62 speedrun timer 当前复审

- 范围：完整读取 `speedrun/timer.ts`、三份 timer 测试及 `index.ts`/`snapshot.ts`/`store.ts`/`overlay.ts` caller。
- 结论：起表门、wall-clock delta、依序单步、PB、香蕉直接恢复、F8 三秒倒计时、setStep/reset、一次性 flags 与 detector 边界均有真实状态 oracle，未发现直接缺陷。
- 验证：3 files/22 tests、game typecheck通过；coverage 等沿用 [`53-wave-gates`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md)。62 从 pending 提升为 `partial`，不作整卡 accept/done。

### 2026-10-18 CODE-QUALITY-63 speedrun snapshot 当前复审

- 范围：完整读取 `speedrun/snapshot.ts`、`snapshot.test.ts`，并读取 `index.ts`、`timer.ts`、`detectors.ts`、`shell/main-loop.ts` caller、`GameState` 相关 owner 与 speedrun design §4.1。
- 结论：inventory count>0、battle enemy id/总血、每次调用新建 Set、explore/sceneLoading/paletteFade/suspendRaf 的 canMove 门控与真实消费方一致，未发现 direct defect。
- 验证：直接 1 file/7 tests；相邻 5 files/32 tests；game typecheck通过。coverage 等沿用 [`53-wave-gates`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md)。63 从 pending 提升为 `partial`，不作整卡 accept/done。

### 2026-10-18 CODE-QUALITY-64 speedrun detectors 当前复审

- 范围：完整读取 `speedrun/detectors.ts`、两份专属测试，并读取 `timer.ts`、`snapshot.ts`、`checkpoints.ts` 与 speedrun design §4.2–4.3。
- 结论：prev/mem 生命周期、enter/leave/any、坐标容差、boss/item/music 谓词和彩依两阶段状态机与真实消费方一致，未发现 direct defect。
- 验证：六文件 42 tests、game typecheck通过；coverage 等沿用 [`53-wave-gates`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md)。64 从 pending 提升为 `partial`，不作整卡 accept/done。

### 2026-10-18 CODE-QUALITY-65 speedrun index 当前复审

- 范围：完整读取 `speedrun/index.ts`、两份 index 测试，及 `shell/main-loop.ts`、`tools-panel.ts`、snapshot/timer/store/overlay/countdown caller。
- 结论：disabled/tick/overlay、设置/PB persistence、F4/F8/F2、manual/banana pause、SSR/解绑与单例 ownership 均与真实 caller 一致，未发现 direct defect。
- 验证：六文件 39 tests、game typecheck通过；coverage 等沿用 [`53-wave-gates`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md)。65 从 pending 提升为 `partial`，不作整卡 accept/done。

### 2026-10-18 CODE-QUALITY-66 speedrun overlay 当前复审

- 范围：完整读取 `speedrun/overlay.ts`、两份测试及 index/timer/store/time-format/tools-panel caller。
- 结论：DOM/style ownership、checkpoint 行映射、差值分色、ETA、暂停前缀、SSR/hide 清理与 caller 一致；补充一条差值/ETA oracle 测试，未发现实现 direct defect。
- 验证：5 文件 25 tests、game typecheck通过；coverage 等沿用 [`53-wave-gates`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md)。66 从 pending 提升为 `partial`，不作整卡 accept/done。

### 2026-10-18 CODE-QUALITY-67 speedrun checkpoint tests 当前复审

- 范围：完整读取 `checkpoints.test.ts`、`timer.boundaries.test.ts` 与 `checkpoints.ts`、`timer.ts`、`detectors.ts`、`index.ts` caller，核对 speedrun design §4.4。
- 结论：21-id/单调/香蕉静态合同、同 now/finished/暂停/step/mem 和 detector 边界均有真实 oracle；运行时坐标/BGM/香蕉校准未实跑，保持 unknown，不改数据。
- 验证：四文件 31 tests、game typecheck通过；coverage 等沿用 [`53-wave-gates`](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md)。67 从 pending 提升为 `partial`，不作整卡 accept/done。

### 2026-10-18 CODE68 countdown 测试精度

两测试的创建/更新/移除 oracle 合并，补同文字 DOM MutationObserver 和无 document 输入边界，四例职责独立。隔离 guard 变异旧4绿→新3绿1个指定 AssertionError，身份1→1与移除2→1红证明旧oracle转移；生产源未改。20文件104例和game typecheck通过，原件见 [68证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/68-countdown-tests/README.md)。两测试已验证，282closed/44review/2985pending；本轮46partial/37pending/0accept。新全仓check/ratchet/protected未运行，不能沿用53波次为本候选认证；下批69 time-format，活跃高风险实现保持隔离。

### 2026-10-18 CODE69 time-format 测试精度

全文核实现/三测试及 overlay/store/真实文本入口。去除重复小时/负数 oracle，纠正59.995s进位标题并拆开不同函数边界；两枚词法/分钟守卫变异均旧10绿→新13绿1个指定AssertionError，恢复14绿。相邻20文件108例、game typecheck通过；源未改，三测试闭合，285closed/44review/2982pending。证据见 [69](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/69-time-format-tests/README.md)；本轮47partial/36pending/0整卡accept，新统一门未运行。先回核相邻fixture强转，随后70；94–102/editor保持原后续顺序。

### 2026-10-18 CODE58 夹具与隔离勘误

回核发现前次“合法fixture、fake timer隔离”证据不足：核心as never隐藏缺字段/status错型，旧监听器跨例回读前态。只修两测试与共用宿主，正式构造器/hydrate、分轴HP/turn、全屏/FPS拆职责；跨例旧19绿1指定AssertionError→新21绿，正式19绿。相邻34文件199例、game typecheck通过；原源/API/save未改。证据见 [58夹具勘误](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/58-tools-panel-fixtures/README.md)。新增宿主1项验证，3312/286closed/44review/2982pending；47partial/36pending/0整卡accept不变。新全仓/coverage/protected未跑；后续先核63/65夹具再续70，避免继承前次过度表述。

### 2026-10-18 CODE63/65 核心夹具与解绑勘误

三测试移除双重强转/非法Facing/空淡入态，改公开初态/战斗/淡入构造器。实际计时验证解绑后不再重置，反控静默重置旧20绿→新19绿1个指定AssertionError，恢复20绿；PB默认精确值和afterEach资源清理补齐，数量不变。原源/API/save未改，账本3312/286closed/44review/2982pending不变；47partial/36pending/0accept。证据与相邻/typecheck/静态门见[63/65](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/63-65-speedrun-fixtures/README.md)，新统一门未跑。下一批70及剩余36卡。

### 2026-10-18 CODE70 音量合同与注释

完整实现/两测试、bootstrap与tools-panel实际caller已核。重复静音改目标归main，stored/default与volume/mute-key轴拆开，精确sink/state/storage与失败清理补全，纠正共享键读写/自动同步注释。忽略keyMute旧6绿→新7绿1AssertionError，恢复8绿；相邻6文件36例和game typecheck通过。生产/API/UI/save未改。证据[70](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/70-audio-volume/README.md)，main新增一项闭合，3312/287closed/44review/2981pending；48partial/35pending/0accept。无新统一门，下一批72三文件。

### 2026-10-18 CODE72 真实fetch合同与失败态counter

149行实现、两测试、main/UI/并行资源caller完整相关核验。20例数量不变，排弱重复、加Request/init/Response透传、reject身份、分母与清理；三枚旧20绿→新19绿1AssertionError，正式20绿、相邻54绿/typecheck通过。另以真实模块组合证失败文本被迟到进度覆写，生产未改，开[高风险卡](QUALITY-BOOT-FAILURE-PROGRESS-1.md)冻结源；UI旧关闭撤回rework，main/boot review。原件[72](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/72-boot-loading/README.md)，3312/288closed/47review/2977pending，49partial/34pending/0accept；新统一门未跑，下一批73。

### 2026-10-18 CODE72批准修复与47–52回执勘误

用户批准后完成失败终态、入口清理及本轮fetch ownership；4条旧指定单红→新相邻58绿，原组合反例重放1绿，game typecheck通过。真实PROD旧错误被覆盖→新保持、fetch已释放，正常按钮进场与三张实际截图完成。boot-loading.ts新增闭合，main/UI与UI主测试仍review；3312/289closed/47review/2976pending，83卡49partial/34pending/0accept不变。证据见[72批准修复](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/72-boot-loading/approved-fix/README.md)。

另核f544b9b94只附28行README，会话执行记录存在持久化截断，无法认证当轮act/环境诊断计数；已撤回47–52统一门通过/收口及18份后续沿用声明，保留原文、4份执行片段、未知计数和旧C10实测范围。见[回执审计](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/receipt-audit/audit.json)。本次没有重跑全仓/coverage/protected或调整baseline；下一步同片UI测试合同/隔离，再续73及剩余pre-94，94–102/editor优先级不提前。

### 2026-10-18 GLM独立审计摘要的四项收口返工

用户转达GLM对7b8365195..f544b9b94相关波次的独立审计摘要：内容层通过、收口纪律四项返工。该摘要不是本轮Codex重验全部71锚/五产品修复的原始证据。Codex单一Owner `build allowed` 仅：两处SDLPal引用范围与本轮对应docs/账本的精确更正、六条退役实际授权来源和registry注释，以及任务/看板/证据绑定。产品、测试body、matcher/拒绝规则、退役payload、baseline和原历史quote不改；不重跑全仓/coverage补造旧原件。

前两项已于7fc92e98撤回统一门通过/收口并公开四份会话持久化片段；当轮完整日志与act/环境精确计数仍缺，保持unknown/rework。现核primary：uibattle.c全长1808，飘字循环1746–1767、PAL_BattleUIShowNum 1770–1808；global.c全长2409，PAL_PlayerLevelUp 2347–2409。六退役的用户依据来自早于新增提交的本会话通用精简规则/全仓或editor范围指令，逐项执行裁定人为Codex，不登记为逐条用户签字，不援引OPQ旧五文件授权。源消息ID/时间/摘录、六实际快照与未运行项见[审计后续](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/receipt-audit/README.md)。

## 2026-10-18 完整独立审计返工队列

优先处理用户转交的三机制counter，另开[高风险卡](QUALITY-BATTLE-MAGIC-PARITY-1.md)，不推进新编号103+任务。三条经C/真实caller核实、先红后绿；本次15定向、37文件935相邻、五单红反控均已形成原件，统一门/视觉待续。CODE3t由pending转partial，当前83卡50partial/33pending/0accept；其余内容结论不因审计概述而批量重签。五条旧闭合记录直接counter后转review，本片无新增closed。

注释返工十项均保持pending：scene-system-search方向及3o说明；turn-queue源函数；attack/battle-system投影锚；draw-shop全屏说明；CurePoisonByKind锚；STAT_LIMIT锚；formulas半开区间和冗余算式；minimap/tools/bootstrap尺寸；bootstrap快捷键；palette ColorFade等价性及removePoisonLevel99非压缩差异。纯注释另提交；formulas冗余算式先核浮点/取整影响，不冒充纯注释。draw-equip单人rows和draw-inventory阴影两行为差异只读核证、保持pending，不借本卡直接改UI。

证据返工：53-wave-gates已撤回零诊断通过，旧完整raw确实缺失；已补四执行持久化片段、两锚真实EOF与六退役实际用户指令来源（不冒充六条逐项用户签字），见53 receipt-audit。其余六项已在第二批按字节修正：42行数、实际五份battle.c短SHA、51/49读取计数、55当前后补boundary、3j真实pause caller、3v当前源范围。55历史原件不宣称找回；53完整raw/历史诊断仍缺、门仍rework。历史原件不改写成新结果；下一批先收这些证据与注释，再续UI/73及其它pre-94。

相邻追加：H01单敌fixture多造101，显式reporter 1块stderr；单红后修终止符，该测试旧closed转review。原3s“无stderr”当前信用已加counter，不以隐式摘要无展示声称0诊断。

## 2026-10-18 审计证据第二批

[簿记返工](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/audit-metadata-repair/README.md)修正上述六项，另纠正EOF383/1858两处范围；5份短SHA按64位实际C字节核定。工作树意外消失后已在原路径/同分支恢复，旧字节附件由Git770精确恢复并验证；55明确是当前全文后补，不回填历史日期。无产品/测试改动、0新增closed，3314/284/55/2975及83卡50partial/33pending/0accept不变。下一步十项注释/两UI差异；53原波次完整raw仍缺、rework。

## 2026-10-18 九笔代码补审有限返工

用户转交的七笔通过结论保持，不重复改写。Save排重漏迁已由API单文件补测，提取dd341e5f3性质勘误/三个边界pending逐条写回原卡，770f9168e对应三机制、真实caller和先红后修原件已补交接。[完整记录](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/supplementary-audit/README.md)。只修已核counter，不恢复53旧门信用；1旧测试关闭撤回review，0新关闭，83卡仍50partial/33pending/0accept。pre94十项注释、formulas算术风险和两UI差异继续在前，94–102其它修复/editor在后；本支持片不开始新103+范围。另见GameState.runtime.rgwAttackStrength“含装备”旧注与已核裸基础ownership冲突，记录留注释波，不在本片改实现。昂贵全仓check/coverage/protected留大任务收尾，本次不合main。

## 2026-10-18 搜索注释/测试边界与新停止线

本有限批只改scene-system-search实现注释和其专测：纠正阈值方向、完整13点手算oracle、近/普通上界与紧邻外侧、最远far点和真正first-hit优先级；10→12，无生产可执行变化。六精确变异均旧10绿→新11绿1个指定AssertionError、无pending/runtime error，源/spec恢复。caller相邻仅明确筛选3条真实Confirm链，不冒称整110例或game全包。

全文核读另发现turn-queue稳定sort与原C交换顺序分叉，原生13槽C片段对照成立；开[队列卡](GAME-ACTION-QUEUE-TIE-ORDER-1.md)，用户已批准SDL对齐，后续独立行为提交先正式红例。GLM指出的Wear毒列表不压缩也已原生对照确认，开[毒列表卡](GAME-PLAYER-POISON-SLOT-COMPACTION-1.md)只读待因果，未改其行为。两者原件不是完整SDLPal/浏览器，首版C片段漏外括号的编译失败完整保留、不计counter信用。

本片5条旧closed转review、0新closed，83卡仍50partial/33pending/0accept。搜索注释项已修，其余9项及两UI差异仍待；队列行为窄修优先依用户批准推进，毒压缩与其它前提未知项不抢写。[本片证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/README.md)。全仓check/coverage/protected继续大窗口收尾，未合main。

## 2026-10-18 已批准队列窄修

搜索注释批c3d943dde已先提交推送；本批分离实现第一阶段队列排序：原C13槽/SHORT交换/速度0xffff前缀，真实按键caller和dualMove标记已核。正式初红7；最终敌方WORD边界spec对仅旧queue源重放7红，当前7绿、旧9绿，38/942相邻零stderr后仅复跑最终改动7例；六指定单红反控恢复SHA一致。初版高WORD队员边界不记生产caller信用，实际原件全部保留。

源/旧测仍review，新增parity与H fixture review，0新增closed；83卡仍50partial/33pending/0accept。两项审计注释（Search/turn-queue）已处理，剩余8组、formulas冗余算式和两UI差异继续；phase1毒列表卡只读。证据见[批准队列修复](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/queue-approved-fix/README.md)。昂贵统一门/coverage/protected未运行，未合main，不扩大新103+范围。

## 2026-10-18 毒/升级注释与合法夹具准入

Codex premise verified / design agree / build allowed：基点27358f9d9、3y隔离树单一Owner，只改player-poison-state.ts、battle-progression.ts的事实注释，以及battle-progression.glm-next-wave.test.ts、battle-levelup.test.ts的错注/不完整核心夹具和直接RNG oracle。两实现全文及global.c真实函数、PAL_BattleWon/caller已核。poison首空槽/全槽去重、Wear压缩差异归已有draft卡，只记录不实现；STAT_LIMIT/EOF/MAX_LEVELS错锚与主升级余exp写回、seeded RNG和SDL算法信用分开。

旧levelup投影例用as any as PlayerRole且未实际开下一场战斗；改复用完整typed角色工厂，标题收窄为实际投影合同。H02只判Health→Magic两池，不能声称全七池；回满例实际主6抽+隐藏2抽，旧7值回退描述须更正并精确断言真实抽样。计划隔离额外RNG消费变异：先证旧例存活，再补oracle恰一业务红、恢复定向与相邻。无产品执行改动；全部质量门仅按本片和用户大窗口成本纪律记录，不重跑全仓check/coverage/protected，未执行不闭合文件。

### 2026-10-18 毒/升级注释与夹具当前结果

四文件有限批：CureKind、Wear/首空槽与升级MAX_LEVELS/STAT_LIMIT/EOF/余exp/RNG说明已更正，两实现removeComments JS字节与27358基点一致。旧投影例改完整typed工厂，标题仅写实际公开投影；H02纠正“七池”、dwExp200与“主6+隐藏1/7值”错注，主6+隐藏2的8抽逐参数核验。相同多耗一抽变异旧5绿→新4绿1指定AssertionError、0skip/runtime额外失败，源finally恢复；恢复27定向+16相邻绿、无stderr，game typecheck通过。

不因少量绿恢复整文件信用：升级源/两测试旧closed→review，poison保持review；3315 tracked/275closed/66review/2974pending，0新closed，83卡50partial/33pending/0accept。毒全槽去重/首空槽差异补回原draft卡，只读不实现；原盘表重算、全部七池测试、C WORD数值极端、真正开战/视觉和统一门待续。四组审计注释现已处理，余六组/冗余算术/两UI继续，94–102/editor在后。

完整原件见[本片](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/poison-progression-comments/README.md)。官方coverage/protected与全仓check按用户成本要求留大任务收尾，本片未跑，不合main；无下一位Agent提示词，Codex单Agent继续。

本片收尾另同步phase1-dependency-ownership唯一catalog entry及report/evidence的注释sourceRef/history；其它17对象/出版日期状态/历史版本运行字段不变，不借此重验D1。首文档门漏父导航1issue、首consumer回放sourceRef2issues均保留原件；修后所有consumer零issue、初125工具测试保持绿，不重复未变工具测试。具体命令与边界见本片gates。

## 2026-10-18 runtime投影注释有限准入

Codex premise verified / design agree / build allowed：bcec7f0fe基点，同一3y树单Owner，完整读取attack.ts 614行、battle-system.ts 3141行、game-state.ts 2111行、battle-state.ts 918行。白名单仅这四源的事实注释；生产bootstrap投影、装备effective getter/0x30刷新、outside-battle 0x2D、开战seed与终态cleanup均已按实际边界核读，SDLPal getter/选靶/自动选法术/入场函数/状态设置清除逐项对照。纠正runtime裸值、快照与HP/MP回写边界，状态表不限装备，自动目标Confirm记忆、随机评分与动作游标hold错注。

不改变可执行逻辑、schema/save/UI/公开类型接口，不借此处理装备重建时序等未有反例的假设。all-HP0+Puppet不是新机制counter：C仅改fOnlyPuppet未清fEnded，照样判负；hidden runtime stash仍在，不能宣称已迁到WeakMap。原假设明确排除。计划四源removeComments编译字节对照、已有定向/相邻回归与game typecheck；全仓check/official ratchet/protected仍留大任务收尾。注释信用与整文件验收分开，未知继续review，不扩大103+或94–102优先级。

### 2026-10-18 runtime投影注释当前结果

四源事实错注已修：runtime裸值与装备effect分开，投影是快照、HPMP单向回写不叫严格逆；普通大世界状态同样seed。宿主纠正自动法术随机评分、Confirm记忆、0槽保留、入场VIDEO_SwitchScreen和动作/fade游标归属，音效只描述当前caller、不再超卖时序等价；错贴performAction头移回所属函数。去注释后的parsed TypeScript和JS字节均与bcec7f0fe一致，零产品行为变化。

75定向+199相邻恢复绿、game typecheck通过，完整raw零stderr/act/环境/unhandled；未改任何测试。裸scanner不理解模板重扫导致一次验证器假报，改用TS parser/printer后两种输出一致，原失败保留，不计业务反控。game-state.test旧双强转/造型静态错注本次只登记后续，绿色不换整文件验收。

三旧源码关闭转review，GameState从pending转review；0新增closed，账本实测3315 /272closed /70review /2973pending。83卡仍50partial/33pending/0accept；五组审计注释已修，余draw-shop/formulas/尺寸/快捷键/ColorFade、冗余算术与两UI差异继续。完整[原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/runtime-projection-comments/README.md)。全仓check/official coverage ratchet/protected按用户大窗口成本要求未跑，统一门rework，未合main，94–102/editor仍在pre94之后。

## 2026-10-18 商店布局与宿主测试有限准入

Codex premise verified / design agree / build allowed：206b18563基点，3y同树单Owner；全文draw-shop.ts、draw-shop leaves、draw-menu leaves、shop-preview pixels四文件。只改买/卖布局事实注释及三测试的合法输入/必要oracle/排重，不改绘制逻辑、共享fixture、配置、baseline、交易或公开接口。draw-menu全文与present入口、menu-driver真实buy/sell、core买卖/栈/库存状态和SDLPal Buy/Sell/ItemSelect callback已核。

当前counter：L12所谓跨队装备只给role0一件，不能区分只计首人；非卖品承诺无售价却未断言数字。L09空grid强造confirm，未证明全屏grid/图标/noDesc/overlay装配，缺catalog三菜单复用不完整state。G07-B06强造买不起confirm，B12同一物品同时占两部位且所有role equipableBy=false。改为公开构造与合法转换、party[4,1]同手部槽/非队员哨兵；保留库存缺省的独立边界。

先记录原22例正式runner结果，再做旧绿新指定单红的隔离反控；正式恢复与相邻/typecheck、注释去除后JS/TS一致。四源/测试保持review，不因当前jsdom能跑canvas就恢复旧文件信用；历史node环境失败不擦除。全仓check/official ratchet/protected仅大窗口收尾。无产品/形态选择，故不新增用户审批或103+。

### 2026-10-18 商店布局与宿主测试当前结果

四文件：卖出实际是全屏grid→overlay→confirm，注释已纠正，去注释TS/JS与206b基点同字节。L12改party[4,1]与非队员哨兵，补空店目录/图标、非卖品数字负oracle；半价25移动到真实可卖库存经公开状态确认的栈装配。L09覆盖grid/icon/noDesc/金额/确认与输入不变，缺extra改正式工厂/hydrate，前后清理脚本/word单例。G07确认改公开入口、B12改允许装备的两队员手部，3条被精确值蕴含的否定删除，22例数量保持，三标题映射保留。

8精确反控：五枚旧4绿→新3绿1指定AssertionError；三枚旧5绿→新4绿1指定AssertionError。完整source/spec/mutant/raw/native JSON与finally恢复保留。恢复22直接、35相邻与game typecheck通过，无stderr/act/环境/unhandled；既有jsdom下canvas13也绿，不反写历史node失败或声称改变了环境。

三旧关闭转review，G07仍review，0新增closed；269closed/73review/2973pending（提交前实测），83卡50partial/33pending/0accept不变。共六组注释已修，余formulas、尺寸、快捷键、ColorFade及算术风险、两UI差异继续。P04装备资格与两共享role工厂mp99/maxMP40只读问题登记；blit可复用候选须核调用域，未在本片提取或伪称不存在重复。

证据见[本片](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/shop-layout-tests/README.md)，源码与旧52/55过度结论已在当前正文收窄，旧原件保留。昂贵全仓check/official ratchet/protected/视觉/E2E未跑、不合main；无下一位Agent提示词，Codex单Agent继续pre94。

### 2026-10-18 CODE3m公式数值与测试当前结果

有限白名单仅formulas.ts与magic-damage.ts事实注释、既有formulas.test.ts判别力；由父卡低风险注释/测试准入推进，产品数值不在本片build范围。全文核三文件与RNG/H工厂，真实hydrate/projection/createBattleState/applyMagicDamage及C FLOAT/WORD赋值；clang O0/O2正常域161，真实TS/SeedableRng(244049)扣160/HP8840，一次抽样状态一致。开GAME-MAGIC-NUMERIC-ASSIGNMENT-1只读draft卡请求裁决，未收到回复前不改公式，不以删除*10/10代替修复。

第七组错注已修：玩家身法无level、抗性除数1/20、TS半开与C含端点、抗性倍率[0,5]及投影前提；parsedTS/去注释JS均同字节。原测试28例保持，五灵五个独立值与非零毒抗、合法1.05倍率；删除被精确值蕴含的finite/单调两断言。两反控各旧28绿→新27绿1指定AssertionError，源/测finally字节恢复；C原函数给相同矩阵/毒抗/中点oracle。51定向/293相邻与game typecheck零诊断，文档与lint以本片原件为准。

formulas源/测两旧关闭转review，magic-damage原review保持；267closed/75review/2973pending（提交前机器复核），83卡50partial/33pending/0accept不变。尚余三组注释、毒列表/新数值/两UI风险、极端WORD与其它FLOAT系数等，不能因小值绿关闭。rng.ts的rangeFloat“对齐SDL”端点说明及asShort复用仅只读登记，未扩写实现/公开出口。4个测试标题映射保留，protected身份/coverage基准待大任务统一收尾。证据见[本片](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/formula-numeric-audit/README.md)；不跑昂贵全仓check/official coverage/protected，不合main。无下一位Agent提示词，Codex继续pre94。

### 2026-10-18 CODE3n ColorFade输入域与原17例返工

本有限白名单为palette-fade.ts事实注释及palette-fade.test.ts原例补强，由父卡低风险准入推进。全文核两文件与真实palette提取器，读event cursor/cursorless构造、waiting与present收尾caller、原C GetPalette/ColorFade/FadeToRed。原C完整ColorFade以typed最小上下文O0/O2捕获65次完整256色提交，两个同网格正反palette与真实TS步骤一致；C正常getPalette v<<2保持4倍数，人工非网格输入才往返且64步后补终值，不把它当真实原版“永久振荡”缺陷。真实decodePalette的合法6位合成768字节给101/81/40等展开值，TS饱和合同与C字节域分清；未改提取器、生成物、时间/色值执行或公开接口。

第八组错注修正：连续lerp/任意8位等价/视觉1:1、夜色“未提取”与错误GetPalette99–104锚撤回，收尾SceneFade63/64例外说清。原17例保持，black行/新快照独立、ColorFade非网格/上升下降/同时间重绘不累积补强；最大RGB255测试撤销“能辨clamp删除”夸大标题。四反控各完整旧17绿→新16绿1指定业务AssertionError；恢复17、相邻3文件86和typecheck零诊断。控制后仅修一处source引用，控制基点gzip及两轮parsedTS/JS同一证明保留，未重跑无关测试。

两旧关闭转review、0新增closed；265closed/77review/2973pending（提交前机器核），83卡50partial/33pending/0accept不变。全部逐文件/primary/caller/oracle及原始日志见[本片](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/palette-approach-tests/README.md)；未授全色域/视觉/原盘/完整机制信用。docs/lint看最终回执，全仓check、官方coverage/protected仍留大任务收尾，不合main。下一范围尺寸/快捷键；其它数值/毒列表/两UI风险继续，法术160/161裁决仍pending。无下一位Agent提示词。
