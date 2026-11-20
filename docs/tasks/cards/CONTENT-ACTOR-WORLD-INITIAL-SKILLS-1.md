# CONTENT-ACTOR-WORLD-INITIAL-SKILLS-1 — 角色首次入队的技能归属

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
Last reviewed: 2026-11-19
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 本次准入

**build allowed**。Codex 准入，单一 Coding Owner。仅修实际登记角色在开局和首次入队的技能种子读写，保留已存在的玩法进度。用作者 guard、真实 world／setParty 入口和同名合法角色复验。范围为 character.ts、character.test.ts 及定向相邻验证。

## 目标

核清当前角色定义、开局和第一次入队之间的技能所有权。此卡处理已经实证的初始技能分歧。另有作者导入边界归 validate.ts 的活动 Owner 核定。

## 范围

记录新世界与角色第一次入队的初始技能问题。角色定义的 `baseStats` 和 `initialEquipment` 校验由现有 Owner 另核。

## 前提与证据

- 合法注册的 actor ID 可以等于 `constructor`。[作者定义与开局校验](../../../packages/content/src/validate.ts)和[开局、初始仙术跨表校验](../../../packages/content/src/validate-refs.ts)均接受实际登记的定义。真实 loader 用 `Object.fromEntries` 构建角色字典。
- [世界初始化与首次入队](../../../packages/content/src/character.ts)确实创建该角色。初次取证时，新世界的技能表和队伍候选技能表为普通对象，`seedActorInitialSkills` 读取尚未登记的 ID 时拿到继承字段，误认为已有进度。正式函数的两条反例因缺少正确的已学技能记录而失败，普通 ID 控制通过。现行 PAL 工程的 8 条角色定义均未使用与对象原型同名的 ID。
- `validateActors` 另外只要求 `battler.baseStats`／`initialEquipment` 键存在，没有检查该两个成员的运行时形状。旧守卫测试以 `baseStats: {}` 或敌方属性表当作合法玩家样本，已换为符合 `BattlerSpec` 的玩家数据。旧用例的实际输入与结果保存在原 Git。完整值域与工程存量须由 `validate.ts` 的实际 Owner 核定，当前保留待核，不写入产品实现。

### 一手调用与原件

- [内容合同](../../phase2/specs/content-schema.md)的角色初始化段规定 `ActorDef.battler.initialMagic` 是唯一出厂种子；既有空技能数组属于运行进度。
- [Reforge 工程加载](../../../packages/reforge/src/project-loader.ts)及[当前引擎启动与 setParty](../../../packages/reforge/src/main.ts)会创建运行世界。setParty 在候选资源加载和运行者检查后提交技能与队伍，不应把首入队默认值和既有空进度合并。
- [引用治理原件](../evidence/QUALITY-CONTENT-REFERENCES-1-execution.tar.gz)中 `continuation/maps-and-world-actors/actor-start-skill-red/` 存放原生结果、实际命令及指纹，`actor-start-skill.fixture.txt` 可恢复定向失败用例。另见[逐文件合入范围](QUALITY-CONTENT-REFERENCES-1.md#地图与角色校验)。

## 本次修复

用自有键识别已有技能进度，首录按可枚举的自有数据字段写入。已登记同名角色正常取初始技能，普通空进度继续保留。运行世界和候选队伍均由既有所有者提交。SAVE12 继续维护现行数据形状。

| 文件 | A 正确性 | B 注释 | C 职责 | D 复用 | E 测试 | F 可读性 | G 简洁 | H 可测试 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| character.ts | 实际角色在开局或首次入队写入自有初始技能，已存在的进度受保护 | 写属性的理由及按键判断解释原型同名角色 | 出厂输入归 actor 定义，运行进度归 world，队伍候选按现有事务提交 | 两条入口使用同一播种函数 | 作者合法形状、两种同名 ID、开局与首次入队，原空进度与失败原子性测试保留 | 角色 ID 与技能表职责明确 | 独立自有键写入，未新增迁移或兼容层 | 测试运行准确保留归属和顺序 |

## 验收

原有 constructor 两条反例纳入定向，并补 __proto__ 自有数据字段的同形覆盖。Content 的角色与启动合同以及 Reforge 的实际世界、SAVE12 定向复验通过。归档保留初始技能缺失的四条失败及全部恢复身份。

## 状态与交接

集中门已通过，实际命令和零诊断回执见后继归档。当前 PAL 开局与 18 条已编写的队伍配置逐条以现有入口对照修复前后，36 次入队、回队变化得到相同世界。测试目录的 20 条版本引用只读取未变的内容 23、最低存档 12 声明。旧版本引用按 41 个现行载体同步指纹和复核历史。版本声明、旧引用、执行、报告正文和结论按固定前驱复验。出处适用性不会产生新执行。适用性证明、引用范围和初次门禁失败原件见归档。validate.ts 的 baseStats 和 initialEquipment 原待核项归其活动 Owner。当前补丁聚焦 character.ts 的技能种子行为与真实调用。

[本次执行归档](../evidence/QUALITY-CONTENT-REFERENCES-1-review-closeout.tar.gz)固定实际命令、候选文件、失败与通过。
