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
