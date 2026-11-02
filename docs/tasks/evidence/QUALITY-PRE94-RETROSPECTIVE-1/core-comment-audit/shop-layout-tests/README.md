# pre94 商店布局与宿主测试判别力返工

Status: recorded
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「pre94 商店布局与宿主测试判别力返工」的治理候选页;证据原件即下方逐字节保全的固定main源(4569B,SHA c315549bd810)。本批语义:在base 206b185(codex/code-quality-3y worktree)对商店布局/宿主测试四个文件做判别力返工——draw-shop.ts仅改源码事实注释(emit-identity双identical=true证明),三个测试文件改判到真实合法输入与oracle,不新增数量。

## 来源与输入

来源为固定Git载体,非本次运行;原2个链接处置见作者review的linkDisposition。当前存活入口:[QUALITY-PRE94-RETROSPECTIVE-1.md](../../../../cards/QUALITY-PRE94-RETROSPECTIVE-1.md) [read-boundaries.json](read-boundaries.json)。四文件全文核读与fixture owners边界见read-boundaries.json(18全读+11部分读,含SDLPal uigame.c L1503-1792/itemmenu.c L404-433对照)。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。本批真实oracle事实:(1)8枚独立源变异各跑完整未过滤旧/新文件,旧全绿(4或5绿)测不出、新文件各出1个指定AssertionError(如owned-all-roles期望181实测180;host-grid 90对34),全部记录于controls.json并逐字节恢复;(2)同22例三时点(baseline/direct/restored)各22绿,相邻6文件35例仅回归;(3)三标题映射把虚构计数(跨队1件=3、空grid强造confirm、同物品两部位)改为真实oracle(队员[4,1]各一件=4、目录有可卖物品也不画售价、两队员同手部槽);(4)G07-B13真实canvas/PNG读回通过,但旧52的18/19与document错误原命令缺失,不据新绿抹旧失败。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。批结论:8/8变异新文件全部单点测出、三时点全绿、typecheck/lint(5229文件0诊断)/check:docs(125工具)/biome(4文件)/git diff --check全exit0;newClosed=0,三旧关闭撤回review、G07继续review;notRun明列整仓check/official coverage ratchet/protected fast/browser visual/E2E;未合main,统一门仍rework。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。原文明示剩余边界:剩余5装备部位枚举/WORD极值/shared role fixtures mp99/maxMP40/P04装备资格摆设/真实UI/原盘/极端域未验收;重复blit仅发现调用候选未证等价;下一批formulas半开区间与冗余算式风险。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4569B / SHA-256 c315549bd810f9842559a989c3b291147c13b27961c0bbd2ede71878cf4b750d；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# pre94 商店布局与宿主测试判别力返工

Status: recorded
Owner: Codex（单Agent，自身核证/反控，不冒充第三方）
Date: 2026-10-18
Base: `206b18563e07569414f4ec90f08597c5b8ac66de`
Branch: `codex/code-quality-3y`

## 身份、准入与实际读取

id: QUALITY-PRE94-RETROSPECTIVE-1 / shop-layout-tests；schemaVersion:1；status:recorded。准入/交接见[父卡](../../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)，旧52/55报告当前结论已收窄，原字节gzip保留。四文件全文：draw-shop源码、draw-shop leaves、draw-menu leaves与shop-preview pixels；draw-menu源和真实买/卖/栈/脚本描述/fixture owners已按[实际边界](read-boundaries.json)核读。未读的域、只执行的相邻不计整文件accept。

## Primary与生产caller

SDLPal uigame.c PAL_BuyMenu/OnItemChange、PAL_SellMenu/OnItemChange，itemmenu.c带callback设g_fNoDesc，支持“买紧凑、卖全屏picker+金额+确认”。TS present menu-mode gate→drawMenuStack→drawInventoryMenu(noDesc=true)→drawSellOverlay→confirm，与core sellSelectItem/sellMoveRight合法转换对照；交易归menu-driver。本次只修源码事实注释，parsed TS与去注释JS均同字节，无产品/UI/API/schema/save/资源生成变化；不是原版EXE或浏览器视觉验收。

## 逐文件问题与修复

- draw-shop.ts：撤销过时“卖紧凑且用户已认可”的说明，明确两入口职责、不可卖项灰显与确认guard。没有据函数短/全绿关闭该文件。
- draw-shop leaves：旧“跨队”只有role0一件；现库存2+party[4,1]两件=4，非队员2同装备不得计入，资格显式允许。空店给真实目录/图标反哨兵，非卖品补数字不得画；第四例仅缺cursor，正半价/标签移至真实栈装配，4例数量保持。
- draw-menu leaves：原空grid强造confirm，漏grid/icon/noDesc资源转发仍绿；现非空可卖库存经公开select/toggle、真描述脚本与图标，核全屏框/名称/图标/描述抑制/现金/售价/确认与inputs不变。缺extra用正式PlayerStatus/Equip/Magic工厂及显式hydrate，word/scripts前后清理；库存光标快照不冒称按键路由，5例保持。
- shop-preview pixels：B06可支付后走公开购买确认；B12不再同物品两部位/禁止装备资格，改无库存下两队员同手部槽。B01/B08/B11精确值已蕴含的三个not.toBe删除，13例保持。B12当前不证明其它部位枚举；原稀疏/非法装备布置不作保覆盖理由。

## 判别力、排重与原件

8枚独立源变异逐一跑整个旧/新文件，无test过滤：只计首队员、party-slot误当role、计全体role、空店回退首catalog、非卖品仍画数字各旧4绿→新3绿1指定AssertionError；丢noDesc、图标、全屏grid各旧5绿→新4绿1指定AssertionError。没有collection/runtime伪红、skip/pending或额外失败。controls.json记录command/cwd/exit/signal/spawn、源/测试/变异SHA、完整file×fullName、raw/native JSON、finally逐字节恢复与临时树移除。

22原基线、22改后、22恢复定向都绿；相邻6文件35例仅回归。完整输出零stderr/act/环境/unhandled，game typecheck通过。三标题映射保留；未编辑baseline/retirement，官方身份门留大窗口。不重复跑coverage；测试未增数量，不用弱新例补指标。

当前正式package runner使用既有jsdom，G07-B13真实canvas/PNG读回通过；旧52的18/19与document错误原命令缺失，不能断言它是现在默认环境，也不能用新绿抹旧失败。未修改任何Vitest设置、规则或豁免。

## 状态、未修与下一批

三旧关闭撤回review，G07继续review；0新增closed，3315 tracked/269 closed/73 review/2973 pending。83卡仍50partial/33pending/0accept。shared role fixtures的mp99/maxMP40、P04装备资格摆设、六装备部位枚举、真实UI/原盘/极端域仍待核；不因22/35绿换取整文件合法性或视觉信用。

重复blit在draw-shop/draw-inventory/draw-equip/draw-player-status仅发现调用候选；须另核mask/clipping/边界与全部owner才能提取，不冒称已证等价或没有可复用代码。本片没有新增公共出口。

实际门以gates.json和完整附件为准；全仓check/official coverage ratchet/protected fast按用户成本纪律仅大任务收尾，当前未跑。六组审计注释已处理；下一批formulas半开区间与冗余算式的浮点/取整风险，再续尺寸/快捷键/ColorFade和两UI只读差异。未合main，统一门仍rework，专项未完成。
```
<!-- incremental-original-source:end -->
