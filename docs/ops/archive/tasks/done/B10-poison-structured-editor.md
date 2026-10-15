# B10 - 毒/状态系统结构化编辑页(编辑器侧闭合)

Status: done
Owner: Opus(选择器铁律「先闭合半done格」;C3 后用户选 B10)
Reviewer: 用户(观感待复验);Codex/GLM 补签可选
Phase: phase2
Capability: B10 状态/异常(能力地图)
Last reviewed: 2026-10-15
Governance Owner: Codex（历史卡包 B 文档治理）
Template: task-card-v1 / 1.0.0

## 目标

保留毒定义结构化编辑页的历史闭合：让毒本体进入编辑器数据链与PoisonTab，不把仅引用毒id误认为已能编辑定义。BattleStatus联合原本通过技能/物品效果配置，范围不同。

## 范围

二阶段poisons原序数组、project-io声明才写、Add/UpdatePoisonCommand与DataMode毒页。引擎07-06已数据化是原前提，本卡不重判毒机制、不变当前schema或状态表。

## 前提与证据

原poisons.json顺序551..560,137,561不能经数值Record转数组而升序重排，否则首存无谓diff；Update patch的undefined表示删键。反例为roundtrip顺序/删键invert漂移，或把关系总览的单向不对称误当成引擎缺陷。本卡无实现SHA/raw路径或独立用户观感复验凭据。

## 验收

原editor99（+4=保序1+命令3）、七包零失败与6010 pal13条毒/三尸蛊双tick序列、致死三对/相克六环保持。清鹤顶红lethalWith→不对称警告→undo恢复是编辑器历史交互；Reviewer“用户观感待复验”保留，不用顶部done代签。

## 状态与交接

保留原顶部状态、Owner或Coding Owner及原审查身份。2026-10-16根线程已独立接收本次文档迁移并写中央review/SHA；接收范围仅文档，旧产品build不重新准入。原交接提示词与旧“待门禁/待签字”按下述历史时点读取，不作为可执行授权。无下一位产品贡献者提示词；原未决验证按本卡历史范围保留。

## 历史范围

原引擎前提日期2026-07-06；编辑器实际执行日期未标，不推算为同日。原Owner Opus与Codex/GLM可选补签说明仅作历史，不恢复当前固定签字门。

## 当时证据

原40行卡包含输入数列/关系与Playwright陈述；没有实现commit、截图/日志或用户复验回执，本轮不补造。

## 当前有效性

historical。保留编辑器列⚠→✅的原能力表陈述，不据此改当前capability-map；用户观感未证，原runtime毒机制不由此次文档重验。

## 继任文档

新毒编辑需求按[二阶段规则](../../../../phase2/READ-FIRST.md)与[现行流程](../../../agent-workflow.md)核实际模型/合法输入；本卡未指定已完成的用户复验继任任务。

## 原始结论

完整原卡按原始时点保留；原字节可从 Git blob `e8b7ea129a4dfab815f2bc5c03ae6257bb9e241d` 回读。引用中的旧授权、命令、提示词与分支清理不能因本次迁移重新执行。

> # B10 - 毒/状态系统结构化编辑页(编辑器侧闭合)
>
> Status: done
> Owner: Opus(选择器铁律「先闭合半done格」;C3 后用户选 B10)
> Reviewer: 用户(观感待复验);Codex/GLM 补签可选
> Phase: phase2
> Capability: B10 状态/异常(能力地图)
>
> ## 目标(达成)
> 引擎侧毒系统 2026-07-06 已全数据化(tick 序列指针推进/致死配对/相克环/可解度门),但编辑器
> **零入口** —— poisons 压根不在 EditorState(能力地图旧备注「经 item/skill 页可编」只是物品
> 引用毒 id,毒本体没法编)。本卡补齐:数据模式新「毒」页,毒定义全字段结构化编辑。
>
> ## 落地
> 1. **数据链打通**:ContentBundle 加 `poisons?`(content/validate-refs);loader 暴露**原序数组**
>    `project.poisons`(⚠ 保序陷阱:poisons.json 原序 551..560,137,561 非升序,经 poisonsById
>    的 Record<number,…> 转数组会被 JS 数值键升序重排 → 首存无谓 diff。round-trip 测试钉死);
>    project-io:toEditorState 注入 + serializeProject 产出(manifest 声明才写,同 music 规矩)。
> 2. **命令**:UpdatePoisonCommand(patch 语义,undefined = 删键,如清 lethalWith)+
>    AddPoisonCommand(最小缺省:常规/单 tick)。3 单测(不可变/invert/删键还原/重复 id 不动)。
> 3. **PoisonTab UI**(照 SkillTab/ItemTab idiom,`.skill-form` 复用紧凑网格):
>    - 左:13 条毒列表(id + 可解度徽章)+ 过滤 + 新建;
>    - 中:基础(名/可解度三档带释义/染色#)+ **玩家/敌人双 tick 序列编辑**(扣血/半血上限/
>      产道具下拉/自解勾,增删上下移,行号)+ 关系(致死配对/所克之毒下拉);
>    - 右:提示 + **全局关系总览(数据推导)**:致死对去重列出并做**对称性校验**(单向标
>      ⚠ 不对称)、相克链沿 counters 推导(闭环标 ⟲);点关系里的毒名即跳转选中。
> 4. DataMode 注册「☠️ 毒」页(技能/物品/敌人之后),App 传 `state.poisons`。
>
> ## 验证
> - ✅ pnpm check 全绿(editor 99 测 = +4:round-trip 保序 1 + 命令 3;全仓 7 包零失败)。
> - ✅ Playwright 实测(6010 pal):13 条毒全列;三尸蛊 = 5 格递进(0/-1/-2/-3/-200+自解勾)+
>   敌侧 3 格双档(-111/-222/-333)+ 致死血海棠/相克孔雀胆;右栏自动推导**致死三对**
>   (三尸蛊☠血海棠/鹤顶红☠孔雀胆/断肠草☠金蚕蛊)+ **相克六环**(三尸蛊→孔雀胆→金蚕蛊→
>   鹤顶红→血海棠→断肠草 ⟲)全部正确。
> - ✅ 交互闭环:清鹤顶红致死配对 → 总览立即亮「⚠ 不对称」→ ⌘Z 撤销 → 警告消、值复原、undo 栈清。
>
> ## 遗留
> - 乱/定/眠/封等 BattleStatus 是类型联合(无定义表),它们的配置本来就在技能/物品效果行里
>   (applyStatus/removeStatus),已可编 —— B10 编辑器缺口就是毒定义表,本卡闭合。
> - 引擎列 B10 本就 ✅;编辑器列 ⚠️→✅。
