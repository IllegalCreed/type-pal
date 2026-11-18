# CONTENT-ACTOR-WORLD-INITIAL-SKILLS-1 — 角色首次入队的技能归属

Status: draft
Phase: phase2
Owner: Codex
Coding Owner: 未分配
Last reviewed: 2026-11-19
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

核清当前角色定义、开局和第一次入队之间的技能所有权。此卡记录可复验分歧及另一项作者导入边界，等待单独准入。

## 范围

记录新世界与角色第一次入队的初始技能问题。角色定义的 `baseStats` 和 `initialEquipment` 校验由现有 Owner 另核。

## 前提与证据

- 合法注册的 actor ID 可以等于 `constructor`。[作者定义与开局校验](../../../packages/content/src/validate.ts)和[开局、初始仙术跨表校验](../../../packages/content/src/validate-refs.ts)均接受实际登记的定义。真实 loader 用 `Object.fromEntries` 构建角色字典。
- [世界初始化与首次入队](../../../packages/content/src/character.ts)确实创建该角色。新世界的技能表和队伍候选技能表为普通对象，`seedActorInitialSkills` 读取尚未登记的 ID 时拿到继承字段，误认为已有进度。正式函数的两条反例因缺少正确的已学技能记录而失败，普通 ID 控制通过。实际项目里是否有该命名尚未核实。
- `validateActors` 另外只要求 `battler.baseStats`／`initialEquipment` 键存在，没有检查该两个成员的运行时形状。旧守卫测试以 `baseStats: {}` 或敌方属性表当作合法玩家样本，已换为符合 `BattlerSpec` 的玩家数据。旧用例的实际输入与结果保存在原 Git。完整值域与工程存量须由 `validate.ts` 的实际 Owner 核定，当前保留待核，不写入产品实现。

### 一手调用与原件

- [内容合同](../../phase2/specs/content-schema.md)的角色初始化段规定 `ActorDef.battler.initialMagic` 是唯一出厂种子；既有空技能数组属于运行进度。
- [Reforge 工程加载](../../../packages/reforge/src/project-loader.ts)及[当前引擎启动与 setParty](../../../packages/reforge/src/main.ts)会创建运行世界。setParty 在候选资源加载和运行者检查后提交技能与队伍，不应把首入队默认值和既有空进度合并。
- [引用治理原件](../evidence/QUALITY-CONTENT-REFERENCES-1-execution.tar.gz)中 `continuation/maps-and-world-actors/actor-start-skill-red/` 存放原生结果、实际命令及指纹，`actor-start-skill.fixture.txt` 可恢复定向失败用例。另见[逐文件合入范围](QUALITY-CONTENT-REFERENCES-1.md#地图与角色校验)。

## 验收

待准入后核同名合法角色在两条真实入口取得种子技能、既有空技能数组保留及正常角色对照。现有反例仅授予问题复现的证据。

## 状态与交接

`character.ts` 维持 review，调用者验证与测试夹具整改可独立交付。下一位 Owner 先核同名合法 ID、已有空数组、正常角色首次加入及真实工程／SAVE12 消费者。作者数据输入值域、运行时获得技能和隐式兼容不随此审查获得 build 授权。E2E 当前工作包内的 `validate.ts` 不抢写。
