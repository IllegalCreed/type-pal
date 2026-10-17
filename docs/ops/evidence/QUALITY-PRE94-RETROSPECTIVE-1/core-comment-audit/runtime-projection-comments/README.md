# pre94 runtime投影与战斗宿主事实注释

Status: recorded
Owner: Codex（单Agent，自身核证，不冒充独立第三方）
Date: 2026-10-18
Base: `bcec7f0fe1ecac8612c8d83374e4882f2c8f8f0a`
Branch: `codex/code-quality-3y`

## 证据身份与准入

id: QUALITY-PRE94-RETROSPECTIVE-1 / runtime-projection-comments；schemaVersion:1；status:recorded。准入和交接见[父卡](../../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)。只改四源注释，无测试/行为/API/schema/save/生成物修改；商店与其余pre94仍待，不扩大103+。源全文、caller/primary实际区间与SHA见[读边界](read-boundaries.json)；不是grep命中即全文。

## 逐文件发现与修复

- attack.ts：全文614行；攻击用开战投影的有效武术，纠正失效game-state:1279锚，避免把等级敌方项重复加给队员。其余action/极端WORD并未据本片重新接受。
- battle-system.ts：全文3141行；纠正过时1282锚、0槽保留、资源stash owner、自动法术参数实为0..range随机评分非MP阈值、Confirm记忆非hover、动作完成先推进游标/fade暂停下一动作。入场对应PAL_StartBattle→PAL_BattleMain→VIDEO_SwitchScreen(5)换屏360ms一段，不包括此前200ms delay；不能称完整演出等价。音效sweep有动作收尾和毒后两个caller，不固定称回合初/仅回合末，不承诺C时序完全等价。
- game-state.ts：全文2111行；runtime武术是裸基础值，装备与Extra另存；造型也可变。投影是含回退/钳制/覆盖的对象快照，HP/MP边界回写不是完整逆函数；无第三参的menuRoles不合装备。更正“只建stat行”“合击待P2”和“状态表只存装备buff”等旧说明。
- battle-state.ts：全文918行；状态seed同时带普通和装备状态，fade字段纠正顶层driver和游标归属，目标记忆说明对应Confirm；工厂说明移到真实函数上。其余类型/API、状态或布局边界保持review。

## Primary、caller与oracle

真实bootstrap注入projectRuntimeToBattleRoles(runtime,static,effect)；menuRoles只传前两参，不能合并描述。equipment-state数值getter与row writer、event-system 0x19/0x1A resync、battle-opcodes 0x30 Extra刷新、outside-battle 0x2D、createBattleState seed与finalizeBattleCleanup清<=999状态组成当前ownership链。参考SDLPal global.c的属性getter/覆盖与状态函数，fight.c的自动选靶/终态，uibattle.c自动选法术评分，battle.c入场与战末cleanup，video.c换屏。SDLPal仅源证据，不冒充原版EXE运行；原盘装备数据和全部调用时序仍未接受。

全HP0+Puppet的新缺陷假设已排除：C该分支仅清fOnlyPuppet，未清fEnded，仍判负；只修坏注释。runtime-context仍存隐藏字段，不能伪称已迁到WeakMap。装备重建时序等猜测没有真实反例，不写成已验证缺陷或直接实现。

## 测试与可执行不变证据

四源TS parser/printer去注释输出一致，同时removeComments JS字节一致（emit-identity.json），类型/表达式未变。裸scanner首版未按parser上下文重扫模板，误把带注释的大片正文当模板token，emit-preflight退出1；不是生产失败或有效业务反控。原raw保留，后用parser/JS两条对照，未改runner/规则消诊断。

定向2文件75例（GameState61、BattleState14），相邻3文件199例（宿主186、attack2、ownership11）；原生Vitest JSON/raw全部保存，0失败/skip/pending，完整输出无stderr块/act/环境/unhandled诊断。现有GameState投影测试用了as any as PlayerRole且有旧造型注释，本片只读相关区间，不能凭61绿接受其整文件；未写新弱测试或为覆盖率堆量。最后两项注释微调未重复跑测试，以初/末编译同字节证明执行候选一致。

## 状态、门与限制

0新增closed；三旧源码closure撤回review，GameState原pending只提升review；83卡仍50partial/33pending/0accept。账本实测3315 tracked /272 closed /70 review /2973 pending；完整pnpm check:docs首次exit0，125工具测试及所有consumer零issue。lint/diff最终结果以gates.json为准，未运行的门不登记通过。全仓check、official coverage ratchet、protected fast、浏览器/视觉/E2E均未运行，留大任务收尾；未合main，统一门仍rework。

五组审计注释已处理；下一组draw-shop全屏装配，之后formulas半开区间/冗余算术、640尺寸与快捷键、ColorFade；draw-equip单人rows/draw-inventory阴影及毒列表因果继续只读。旧fixture也列后续，不把4源注释修正当整个pre94完成。

附件初核另发现两份README快照仅用basename造成覆盖，metadata首次退出1；源SHA/阅读范围不变，现分别命名3s/3v，原错boundary与覆盖附件均保留，见snapshot-collision-repair.json。此为证据producer缺陷，不计业务反控；修后metadata-final复验全部附件。

全仓lint本次5197文件0error/0warning/0info，metadata-final核全部当前边界/原件/TS与JS一致、旧账本fence和catalog字节不变；之后新增回执单独格式/静态核验。完整pnpm check:docs首次125/125工具测试和所有消费者零issue；末尾回执文字新增后只回放consumer，不重跑未变的125测试或覆盖率。
