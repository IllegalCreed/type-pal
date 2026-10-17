# GAME-PLAYER-POISON-SLOT-COMPACTION-1 — 卸装备后的毒列表压缩差异

Status: draft
Phase: phase1
Capability: pre-94 CODE3o / equipment poison lifecycle
Coding Owner: Codex
Generation Owner: N/A
Visual Verification Owner: Codex
Contributor: Codex
Reviewer: Codex（源码/原生C片段核证；不冒充第三方）
Branch: codex/code-quality-3y
Visual Verification Timing: e2e-deferred

## 发现与停止线

GLM指出removePoisonLevel99的非压缩差异未文档化；本轮全文重读player-poison-state.ts及SDLPal `PAL_RemoveEquipmentEffect` Wear分支，直接确认TS原地清零高等级毒，C则将低于99的幸存毒移到前部，遇首空槽停止扫描，再清尾。不是只有引用行号错误。此项涉及状态次序及持久化GameState毒槽，当前只登记/核证，**无build allowed，不改清毒、压缩、队伍键或存档**。

## 直接证据

- primary：`reference/sdlpal/global.c:1413-1454` Wear分支；相邻`PAL_AddPoisonForPlayer`遇首空槽，`PAL_CurePoisonByKind`只清零而不压缩。
- 真实caller：`core/equipment-state.ts:384-391`卸Wear调用removePoisonLevel99；角色ID先经partySlotForRole转队伍位置。这里讨论的是同一位角色的**毒列表位置**，不改变队伍位置或中毒者身份。
- 合法叶合同对照：party=[2]，该成员毒列表第0项为level99、第1项为普通毒；清理后实际TS普通毒仍在列表位置1，原C分支将其移到位置0，ID和script相同。
- [原生C片段与真实TS叶函数完整回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/primary-counters.json)：合成typed毒定义正ID1/2、level99/1；不宣称原盘对应这两个ID或完整SDLPal运行。所有输入与全量程序保存，可复现。

## 当前限制与下一步

尚需按真实装备/脚本catalog追踪孔洞在施毒、毒tick顺序、查询/绘制和保存加载中的影响，以及C首空槽后的行为边界；旧稀疏状态是否需要处理也未定。不能为了形式上压缩就引入旧档upgrader或改schema；先核机制文档和完整caller，再提交具体裁决方案，获准后先红再修。

2026-10-18 Codex交接：player-poison-state旧整文件闭合信用转review，3o保持partial；已批准的party-slot ownership、装备>999状态与二阶段grantedStatuses均不在本卡改动范围。父卡其它注释/搜索测试可继续。全仓/coverage/protected未运行，未合main；无下一位Agent提示词。

## 目标与范围

先厘清第一阶段卸Wear后毒列表压缩在真实生命周期中的影响，再提出可裁决修复；当前只读player-poison-state/equipment及毒施加/tick/query/save caller和原C。范围外为队伍角色键迁移、装备>999状态、Reforge与任何schema/upgrader实现。

## 前提真值门

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版/primary | Wear清理保留低级毒并前移，遇首空槽停止，清尾 | global.c:1413-1454；原生完整Wear分支 |
| 第一阶段 | TS逐16槽仅清零高等级毒，幸存项不前移 | player-poison-state.ts全文、equipment-state.ts:384-391；合成typed公开叶函数重放 |
| 当前二阶段 | N/A：不把phase1伪毒模型写入grantedStatuses | 本卡范围 |
| 当前目标 | 记录真实差异，完整因果/历史稀疏输入影响unknown，不能开始修复 | primary-counters.json及本卡限制 |

最强替代解释是稀疏表示本身为项目有意选择，最终可见行为仍可能相同；当前只证明物理毒列表位置不同，尚不证明所有场景药效不同。若完整caller不依赖次序/首空槽，应相应收窄缺陷结论。数据解码未变，未假称正ID1/2是原盘装备毒。是否偏离产品真值待核；before→after策略未裁决，用户方向pending。

## 上下文锚点

AGENTS/CLAUDE第一阶段保真原则、父卡3o证据、已有CODE53/79边界和本卡原C/真实caller；已批准party-slot ownership不能代替压缩行为批准，也不重问队伍键选择。

## 验收条件

先核所有毒slot消费者与合法真实装备/脚本，覆盖连续毒列表、解毒后孔洞、多毒tick顺序和卸Wear；若提出实现，先用户裁决、可证伪反例和最小修复，再跑相邻战斗/装备/事件及必要质量门。视觉/真实游戏步骤待前提明确后固定，本轮没有实跑信用。

## 当前模式推进记录

Codex/3y单一Owner，仅只读核证已准入；物理差异verified、行为因果unknown，产品build blocked，无build allowed。实现、自测、独立整文件验收、用户产品裁决和done均pending/blocked；父治理与其它独立文件继续，不代表整个goal blocked。

## Draft: 设计与风险

尚不选压缩算法或历史状态处理策略。风险为毒脚本tick次序、首空槽、保存状态和角色映射；先完整追踪，不以“更整齐”作为改状态理由，不增加兼容层或改存档。

## Build: 实现与自测

未改产品。已保存原C片段最小上下文原生编译与真实TS helper的对照，非完整SDLPal/native原盘或浏览器实跑。

## Review: 审查与返工

旧3o的全部毒语义等价结论撤回当前信用，源文件review；纯引用勘误与实现偏差不得混称同类。保留旧报告，不重写历史为已验。

## 用户验收

压缩修复/兼容策略未请求亦未批准，当前先核完整因果后再提交具体方案。

## 交接日志

- 2026-10-18 Codex：GLM差异已通过原C片段/真实TS叶函数确认；原件完整、临时树清理。下一步只读完整生命周期，未改状态。

## 下一位Agent提示词

无；Codex单Agent继续核证，未批准不得实现。

## 2026-10-18 只读补充：首空槽与现有测试的证据边界

全文重读玩家毒helper，核PAL_AddPoisonForPlayer/两类Cure与装备/opcode生产caller：C施毒只在首空槽之前检查同毒，TS先扫全部16槽去重；CureByKind本身只清零可留下孔洞，因此不能把稀疏域差异只归于Wear。当前只按源码记录这两个控制流，不把它称作已跑通的真实物品/毒tick/存读链。helper注释已显式分开TS行为与C；正ID/原盘catalog/孔洞后的入口脚本与tick顺序仍待完整核证。

现有dependency-ownership专测直接断言卸Wear后低毒仍在slot1，验证的是当前TS跨入口ownership，不能据其全绿认证SDL压缩等价。本批保持该测试与产品行为；0新批准，不实现压缩、去重策略、队伍键或save/upgrader。有限注释/夹具返工证据见[本片](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/poison-progression-comments/README.md)。
