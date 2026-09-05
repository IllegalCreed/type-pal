# B10 - 毒/状态系统结构化编辑页(编辑器侧闭合)

Status: done
Owner: Opus(选择器铁律「先闭合半done格」;C3 后用户选 B10)
Reviewer: 用户(观感待复验);Codex/GLM 补签可选
Phase: phase2
Capability: B10 状态/异常(能力地图)

## 目标(达成)
引擎侧毒系统 2026-07-06 已全数据化(tick 序列指针推进/致死配对/相克环/可解度门),但编辑器
**零入口** —— poisons 压根不在 EditorState(能力地图旧备注「经 item/skill 页可编」只是物品
引用毒 id,毒本体没法编)。本卡补齐:数据模式新「毒」页,毒定义全字段结构化编辑。

## 落地
1. **数据链打通**:ContentBundle 加 `poisons?`(content/validate-refs);loader 暴露**原序数组**
   `project.poisons`(⚠ 保序陷阱:poisons.json 原序 551..560,137,561 非升序,经 poisonsById
   的 Record<number,…> 转数组会被 JS 数值键升序重排 → 首存无谓 diff。round-trip 测试钉死);
   project-io:toEditorState 注入 + serializeProject 产出(manifest 声明才写,同 music 规矩)。
2. **命令**:UpdatePoisonCommand(patch 语义,undefined = 删键,如清 lethalWith)+
   AddPoisonCommand(最小缺省:常规/单 tick)。3 单测(不可变/invert/删键还原/重复 id 不动)。
3. **PoisonTab UI**(照 SkillTab/ItemTab idiom,`.skill-form` 复用紧凑网格):
   - 左:13 条毒列表(id + 可解度徽章)+ 过滤 + 新建;
   - 中:基础(名/可解度三档带释义/染色#)+ **玩家/敌人双 tick 序列编辑**(扣血/半血上限/
     产道具下拉/自解勾,增删上下移,行号)+ 关系(致死配对/所克之毒下拉);
   - 右:提示 + **全局关系总览(数据推导)**:致死对去重列出并做**对称性校验**(单向标
     ⚠ 不对称)、相克链沿 counters 推导(闭环标 ⟲);点关系里的毒名即跳转选中。
4. DataMode 注册「☠️ 毒」页(技能/物品/敌人之后),App 传 `state.poisons`。

## 验证
- ✅ pnpm check 全绿(editor 99 测 = +4:round-trip 保序 1 + 命令 3;全仓 7 包零失败)。
- ✅ Playwright 实测(6010 pal):13 条毒全列;三尸蛊 = 5 格递进(0/-1/-2/-3/-200+自解勾)+
  敌侧 3 格双档(-111/-222/-333)+ 致死血海棠/相克孔雀胆;右栏自动推导**致死三对**
  (三尸蛊☠血海棠/鹤顶红☠孔雀胆/断肠草☠金蚕蛊)+ **相克六环**(三尸蛊→孔雀胆→金蚕蛊→
  鹤顶红→血海棠→断肠草 ⟲)全部正确。
- ✅ 交互闭环:清鹤顶红致死配对 → 总览立即亮「⚠ 不对称」→ ⌘Z 撤销 → 警告消、值复原、undo 栈清。

## 遗留
- 乱/定/眠/封等 BattleStatus 是类型联合(无定义表),它们的配置本来就在技能/物品效果行里
  (applyStatus/removeStatus),已可编 —— B10 编辑器缺口就是毒定义表,本卡闭合。
- 引擎列 B10 本就 ✅;编辑器列 ⚠️→✅。
