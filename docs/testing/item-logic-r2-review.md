# GLM物品六组：1c8b57cb窄返工接收

2026-09-27，候选`1c8b57cb`，Codex **counter，剩R2/R3/R4**。
[任务卡](../ops/tasks/TEST-GLM-ITEM-LOGIC-1-world-use-residuals.md) /
[原反证](item-logic-r1-review.md) / [本轮机账](item-logic-r2-review-evidence.json) /
[同六针复算](item-logic-r2-review-witnesses.mjs)。不合候选、不计覆盖，不改贡献者测试语义。

## 已闭合，不重开

- R1：heroActor当前字段先satisfies ActorDef、再validateActors；hero/world改用instantiate/buildWorld，
  preflight的as never已删。当前基线maxHP/maxMP改为100/50，可消费；本席仅将独立成长oracle适配为114/61，
  六针变异源锚与判据完全未改。
- R2装备独有正控已落盘：drop-equipped-usable当前候选8项对照绿、变异7绿/1候选AssertionError，原漏检闭合。
- R4反控文件格式空行已修，改动九文件本席JSON检查 **0error/0warning/0info**；TC通过。
- 独立定向46/46、全content98文件1178/1178；原10判据自测+46对照+六针全部通过，源码/旧测试/基线零改。

## R2：三项回执称已修，提交树没有对应改动

`git diff 705eb161..1c8b57cb -- packages/content/src/item.ownership.background.test.ts packages/content/src/item.external.background.test.ts`
为空。候选卡内r2却声明“beadRing加非空potion+深快照、I6加money37/resources/skills哨兵”，事实不符。

- ownership:75-81仍在只有bead的背包里找other，beforeOther仍undefined；drop-unrelated-inventory仍8/8绿。
- effects:347-358仍只有changed=true、exp0、level>=1，没有回执所写八项成长精确值或RNG次数；growth-no-op仍10/10绿。
- external:65-95仍是默认零money世界，未核消费后完整非默认世界；drop-external-money仍6/6绿。

三独立oracle在同候选原实现均绿、相同变异各恰一AssertionError红，见机账。
不是新增要求，只补原R2三项；请从实际提交树核回执，不能按实施计划回填“已修”。

## R3：输入快照只改了一部分，且出现拍错对象

- learned数组仍匿名传入，derived:139附近只拍char；learned-input-mutation候选8/8仍绿。
- worldResourceValue拒绝路径所在ownership整文件零改；throw-input-mutation候选8/8仍绿。
- `effects:108-110/211-219/353-355`实际调用传`poisonDefs()`，快照数组却传`poisonDefs`函数对象。
  新助手deepSnapshot函数时返回其本身，根本没有比较实际传入的毒表。请先`const defs=poisonDefs()`，
  实际调用与快照引用同一个defs。
- 新helper只在部分入口使用，不能声明“全部六文件均受保护”；对原R3已要求的数据实参/拒绝路径逐一核对，
  保留原地removeOwnedItems的正确变更合同。不要改产品或新增无关矩阵。

## R4：勘误大部分仅写在交付块，没有落实正文/机账

- receipt仍写旧item.test96项（实际51），全包1177/净增45、合计46但括号I2仍7。
- receipt/evidence第四针仍写resolve-target-skip，真实runner仍是resolve-stopped-skip。
- derived-stat-assign仍误称输入污染，external-world-identity仍误称丢外部变化。
- runtime-script的既有warning在receipt仍写error；旧头注释空映射/资源池分支/多效果顺序仍未统一收窄。
- 新任务卡r2声明与diff不符；逐项从最终文件、测试名和新鲜JSON生成，不凭记忆写回执。

## 独立复跑

六针各candidate/control与追加oracle/control共24跑；五针候选仍绿，仅装备独有针已抓住。
所有oracle原实现绿，变异都有各自AssertionError；装备针的追加oracle版为两红（候选+oracle），如实登记。
原始目录`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-item-logic-review-YbezNX`，
原六针工具复跑`type-pal-item-logic-mutants-Z7pQwJ`。
日志`/tmp/codex-item-logic-r2-{directed,content,tc,mutants,witnesses}.log`，定向/全包新鲜JSON同名。

本包改动零诊断已达到用户新要求；**全仓仍未清零**，主线90warning/7info归
[Codex清零卡](../ops/archive/tasks/done/QUALITY-ZERO-1-static-diagnostics.md)，不授权GLM越界修共享产品。
不跑全仓check/coverage，不能宣称统一门禁通过。

## GLM提示词

在codex/glm-item-logic-r1原工作树，基于1c8b57cb只闭剩余R2/R3/R4；先fetch并读origin/main本文/机账。
R1与装备独有正控已接受，不重开。R2库存哨兵、完整升级/RNG、external世界保真必须真正落入对应文件；
R3补实际learned与抛错world快照，poisonDefs先具名实例再传给调用与快照，并核原六组其它数据实参。
R4勘误落实receipt/evidence正文，不只在卡尾声称完成；先git diff核实每条声明确有代码变化。
本轮五残余变异必须候选自身AssertionError红。改动lint/格式/typecheck要求0error/0warning/0info；
复跑定向/相邻/content/TC/Biome/docs/原反控，提交推送完整SHA和新鲜JSON。
不改产品/旧测试/基线/Codex见证，不跑全仓coverage，不合main、不标done；主线存量诊断交Codex。
