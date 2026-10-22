# GAME-BATTLE-NONPARTY-EXTRA-CLEANUP-1 — 非队员Extra战后清理可达性

Status: review
Owner: Codex
Phase: phase1
Capability: battle / equipment effect lifecycle
Coding Owner: Codex（唯一写入Owner；本节窄修build allowed）
Reviewer: Codex（自身核读，不冒充独立第三方）
Visual Verification Timing: core-observed / 浏览器及普通剧情未跑
Branch: codex/code-quality-3y

## 目标

核清战后Extra角色域的静态差异是否能由真实生产caller触发。当前已通过可被V1导入接受的改动存档证明真实core残留；正常原盘剧情可达性仍未知，不称普通游玩已复现。用户已批准战后清所有角色临时Extra；当前按有限白名单先正式红例再修复，不外推为广域换队修复。

## 范围

已读battle-finalization、startBattle、setParty/updateAllEquipments及真实物品/装备/脚本/存档caller。获批仅清理owner和一个新正式回归；现已实现全角色Extra清理，保留毒的队伍位置规则、装备部位0..5、>999装备状态、schema/save、资产与公共接口。更大的队伍快照同步不在本次修复范围。

## 前提真值门

| 维度 | 当前证据与边界 |
|---|---|
| primary | reference/sdlpal/battle.c:1822–1830：ClearAllPlayerStatus后，对0..MAX_PLAYER_ROLES-1调用CurePoisonByLevel(3)/RemoveEquipmentEffect(Extra)。global.c:1567–1614的解毒函数会先role→party查找，离队role直接return，因此不能把Extra差异混成解毒角色域bug。 |
| 第一阶段 | 修复前cleanup同一个party循环清毒/Extra；当前finalizeBattleCleanup保留party解毒、单独按六角色清Extra。startBattle和OP_SET_PARTY仍调updateAllEquipments重建；equipment-state.ts:removeEquipmentEffect负责清指定role/part字段。 |
| 二阶段 | N/A，第一阶段数值槽/回合约定不外推Reforge。 |
| 本卡目标 | 已证接受的改动V1输入完整core链；普通原盘剧情可达性继续unknown。用户已批有限清理修复；不从本结果外推广域队伍同步准入。 |

### 反证与替代解释

此前最强替代解释是开战和换队重建已消除残留；当前导入反证已显示真实物品写入发生在重建之后，并经过实际逃跑出口和再次消费，故该解释不覆盖全部已接受输入。单独手塞Extra直调cleanup仍不算反证；普通原盘剧情是否能发生相同链仍待核。

## 上下文锚点

- [父卡](QUALITY-PRE94-RETROSPECTIVE-1.md)与[本批证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3u-3w-finalization/README.md)。
- docs/phase1/game-mechanics.md:1529–1577为历史机制说明；“1:1等价”须按当前caller收窄，不能当已证明全域等价。
- CODE-QUALITY-53/79/90的毒/复活停止线不由本卡解除；只核Extra角色域。

## 验收条件

1. 先核所有Extra写入和开战/换队/战后脚本真实caller，使用合法typed输入和原始数据锚。
2. 可达则另定有限产品白名单、用户裁决、先精确失败反例后修；不可达须给完整不变量证明，不凭一次绿测关闭。
3. 语义、静态、runtime/视觉证据分别记录；不复用旧统一门作为当前结果。

## Draft: 设计与风险

用户批准全角色Extra清理。原owner将解毒的party循环与Extra的角色循环分开，后者复用已有removeEquipmentEffect(role,6)，角色域来自canonical六列runtime。原盘正常剧情域与更大的队伍快照ownership仍待核；不把局部修复当广域同步方案。

## Build: 实现与自测

[当前实现/八维/正式红绿](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3w-post-scripts/extra-cleanup-fix.json)：正式旧实现恰一业务AssertionError后窄修；当前28定向、39+169相邻及game typecheck零诊断。新增case覆盖合法最后role5，仙女剑脚本真实授8武术/32760双攻，退出后保留；未手塞Extra/终态、无核心mock。原版runtime/浏览器与当前全仓/official/protected未新跑，留3w多卡模块收尾。

## Review: 审查与返工

已批准的输入域缺陷在原owner修复，源/新测试各有具体八维、当前指纹及原生红绿。新文件与原实现继续review等待模块收口；正常剧情影响unknown，未授3w整卡accept。没有固定三签或第三方冒名。

## 用户验收

用户2026-10-22回复：“批准清除所有角色的战斗临时加成（推荐）”。build allowed仅battle-finalization.ts和新battle-finalization-extra.test.ts及配套证据；保持装备部位0..5、>999装备状态、现有解毒规则和存档格式。先正式业务红再有限修复；既有目标传递授权不重复申请。

## 交接日志

- 2026-10-18 Codex：实际核读cleanup、C战末/解毒、真实开战和换队重建路径，先登记unknown并冻结实现；父卡继续合法fixture、handoff时序和资源owner测试治理。

## 下一位Agent提示词

无下一位Agent提示词，Codex单Agent维护。复用已证导入core链和当前正式红绿，不重复取证。继续核3w PhaseE对话可观察性与GS/BattleState广域ownership；多卡稳定后集中门及合并，不把本卡窄修当全文件接受。

## 2026-10-22 当前写入域增量

371b00c7d已包含用户批准的战斗物品目标角色传递及8D投影刷新。原盘大蒜84的0x17现在通过真实performItem→runScript给选中role写30毒抗；这修复了旧漏上下文，不等于证明非队员Extra残留。startBattle和0x75仍全量重建；若要证后续残留，须串起真实换队、旧BattleState角色写入、无再次重建及实际消费，不能把状态手塞到Extra里当剧情反例。

当前runScript原头注“不会写party”等不变量失实：battleCtx.gs经raw fallback可执行0x75。两段头注仅作事实纠正，parsedTS/JS一致，见[当前八维与边界](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3w-post-scripts/ownership-current.json)。这是清理策略获批前的文案时点；当前准入与实现见用户验收/Build节。任意脚本/C阻塞与TS排队的广域等价仍未证明，不由窄修关闭。

## 2026-10-22 真实导入与战斗出口反证

[当前证据与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3w-post-scripts/extra-reachability.json)；[只读快检](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3w-post-scripts/verify-extra-reachability.mjs)。原盘即时闭包初筛未见换队，不据此证明不可达；0x24/25只写未来NPC指针，旧过近似路径已分开。

将存档OBJECT398的敌人回合脚本改为原盘已有20557，真实V1解析/内存Save读写均接受；队伍[0,4]开实际0号敌队，两次tick执行0x75后GS在队[0]、BattleState仍[0,4]。这时实际performItem给旧战斗槽1的阿奴用大蒜，Extra由0变30且只扣一件；真实performFlee(seed7)及18tick释放资源后，getter与再次导出仍为30。未手塞Extra、未手设终态，全部原盘数据只读。第二轮补齐原盘战场和毒表注入，结果一致，stdout979/stderr0；两轮完整原件保留。

此为**接受的改动V1输入→真实core链**，不是普通剧情、完整UI/战斗、原生C或浏览器复现，也不是正式Vitest先红。物品目标传递授权未被外推；本卡另获用户明确批准。现已按先红后绿实现战后清六角色Extra，装备部位0..5、>999装备状态、毒的队伍位置和存档格式保持。更大GS/BattleState队伍分叉单列3s风险，不借一个清理循环宣称已修。

该私有观察发生在批准/正式修复之前；当前正式红绿见Build节。新增测试登记review，库存3356/373closed/114review/2869pending；3w保持partial、0新增关闭。旧产品门只覆盖修复前，不沿用为修复后全仓通过；覆盖率集中到模块收尾。

## 2026-10-22 已批窄修开工

唯一Owner Codex，白名单为清理owner及一份真实导入/开战/物品/逃跑回归，不改其它Owner或公开接口。正式用最后角色role5补六角色上界，不仅复写原私有role4观察；仙女剑脚本真实授予role1的8武术和32760双攻作保护边界。现已取得旧实现恰一业务AssertionError：逃跑并释放资源后Extra末列仍30；非collection/环境失败，完整default+JSON原件保存。普通原盘剧情可达性仍未证明，生命周期修复不代表更大的GS/BattleState队伍同步已解决。

## 本片交付与剩余

当前236实际定向/相邻测试及game typecheck通过。两个不存在的初始CLI过滤路径不授执行信用，native分别证明实际4文件28与2文件39；真实opcodes路径核存在后另跑3文件169。default+JSON完整原件含旧单红，未隐藏失败；测试从正式红到绿字节一致。全仓check/官方coverage/protected在本次产品变化后均未新跑，不合main；先提交推送同一3y保存进度。61accept/22partial不变，不把新测试登记review当专项完成。
