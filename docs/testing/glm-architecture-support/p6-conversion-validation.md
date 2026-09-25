# P6 · 迁移/校验边界取证（ARCH-SUPPORT-GLM-1）

日期 2026-09-25。冻结 SHA `3270473862…`。对象：`migrate/src/migrate-content.ts`
（`mapScenesStatic` :2126）、`migrate/src/translate-events.ts`（`walkBody` :977）、
`content/src/author-script-core.ts` ↔ `content/src/enemy-script.ts`、写盘责任层
`migrate/src/migration-transaction.ts`。**纪律**：未跑 `--write`、未改 generated/schema/事务格式、
不发明新校验政策；全部静态读取 + 既有测试对账。

> **r2 返工更正（Codex intake counter 0e751efe）**
> ① **校验递归是双向的**（撤回 r1"author 底层、enemy 上层"单向表述）：author-script-core :3 import
> checkBattleChoreography（enemy-script 提供）并在 :712 调用；enemy-script :6 import
> checkBaseAuthorCommands 并在 :598 回调。author 递归容器实测含 onLose/onFlee/onFail/onNo 等臂（函数体内自递归共 7 处）
> （:708-727）。② **mapScenesStatic 为 6 参数**（+options），r1 误写 5。③ 无 fs 事实**收窄**：
> 只断言四个转换/校验模块（translate-events/migrate-content/author-script-core/enemy-script）；
> 不外推"整个迁移管线仅 transaction 两个写入点"（baseline/path/project-io 有只读 fs，写路径未审；
> authoring 等其它模块未审）。④ "纯函数绝不改输入"不作主张（未做输入变异审计）。

## 1. 转换阶段与磁盘写入责任图

```
[只读源] pal 原始资源/SCENE/EVENT
   │  mapScenesStatic (migrate-content.ts:2126，无 fs 的转换入口：srcScenes+eventsByScene+映射表 → SceneMigrationResult+report)
   │  walkBody (translate-events.ts:977，纯递归翻译；P0 只读溯源栈 :210)
   │  checkEnemyHookFlow (translate-enemy-scripts.ts:89 在翻译后自检)
   ▼
[内存产物] SceneMigrationResult / TranslateReport（gap 登记 :878 recordMigrationGap；:885 assertNoMigrationGaps fail-loud）
   ▼
[事务写盘] migration-transaction.ts：writeFileSync 只出现在 commitMigrationTransaction(:348)
   与 journal 持久化(:367)；recoverMigrationTransaction(:264)/hasPendingMigrationTransaction(:273)
   供写盘保护恢复（migration-write-guard 卡已三席收口）
```

**责任边界（r3 收窄口径）**：四个已审模块（translate-events/migrate-content/author-script-core/
enemy-script）无 node:fs import（grep 实证）；fs 集中在 migration-{baseline,path,project-io,
transaction}.ts，其中 transaction 是这五个文件中唯一 writeFileSync 点。**不作扩大结论**："全部纯函数"
与"整个迁移管线仅此两个写入点"均已撤回（未做输入变异审计，未审其余模块写路径——与顶部更正④一致）。
`walkBody` 递归同文件内 3 处调用（:398/:772/:1368），无跨包重定义。

## 2. 校验递归的真实调用域

- `checkBaseAuthorCommands`（author-script-core.ts:600）：**自递归 7 处**（:661 then / :663 else / :669 body /
  :708 onLose / :710 onFlee / :722 onFail / :726 onNo，r3 以函数体逐行核对统一口径）——**author 树七类
  容器臂**全部覆盖；另 :712 经 checkBattleChoreography 进入 enemy-script。
- `checkEnemyHookFlow`（enemy-script.ts:458）：内部消费 `checkCommands`（script.js，:10 import）
  与 `checkAuthorCondition`（:588）——enemy-hook 流是 author/script 两套校验的组合面；
  迁移侧唯一调用域 = translate-enemy-scripts.ts:89（翻译后立即校验，带 `@L_地址` 定位）。
- `checkEntityAddress`（:390）：实体地址断言（asserts 签名），被树遍历复用。
- **协议观察（r2 更正为双向）**：author-script-core 与 enemy-script **互为调用面**（author:3/:712
  → checkBattleChoreography；enemy:6/:598 → checkBaseAuthorCommands），加上 enemy-script:588 调
  checkAuthorCondition、:599 条件性调 checkCommands——共享校验面是双向协议，不是单向分层。
  分层方向裁断与下沉建议属实施卡工作，本包不提。

## 3. 幂等/精确输出/错误路径的现有测试对账

| 测试（文件:行） | 确实证明 | 与本包差异 |
|---|---|---|
| translate-events.test.ts 66 条，如 :75 `当前产品输出 stable id；冻结 6A 输入可正交重放 numeric team`、:111 `未知名字对象 fail-loud，不泄漏数字字符串到 canonical actorId`、:163 `不可译命令只登记 gap，不得冒充 emitted`、:175 `同地址同 owner 的 root 与 target 结果绑定各自 canonical body` | 输出精确性/错误 fail-loud/gap 不冒充 | covered |
| author-script-core.test.ts **17 条**（含 wave2） | author 校验递归四容器 | covered |
| enemy-script.test.ts **6 条** + enemy-script.boundaries.test.ts | hook 流校验 | covered |
| migration-write-guard.test.ts（:88-89 等） | 事务恢复 true/false 真实语义 | covered（三席收口卡） |
| migration-baseline / migration-path / migration-project-io 各自测试 | 只读 IO 前置校验 | covered |

**未覆盖区**：`mapScenesStatic` 顶层入参组合（roleSpritesByNum/globalRoots/soundAssetForNum
四参组合矩阵）无逐参数快照测试——由 pal-* 集成测试间接覆盖；标 risk-P6-002。

## 4. 证据条目

- **P6-001 covered** 上表（66+17+6+若干）精确计数：translate-events 66、author-script-core 17、
  enemy-script 6。
- **P6-002 risk（r2 参数数更正）** `mapScenesStatic` **6 参数**签名（:2126-2135：srcScenes/eventsByScene/roleSpritesByNum/globalRoots/soundAssetForNum/options）的参数组合矩阵无直接快照回归——
  现靠 pal-* 端到端测试间接覆盖；若后续改签名，建议先补参数级快照再动。静态证据。
- **P6-003 covered（r2 收窄）** 四个转换/校验模块（translate-events/migrate-content/author-script-core/
  enemy-script）零 fs import（grep 实证）；`grep writeFileSync migrate/src` 仅 migration-transaction.ts
  :348/:367 两处（commit/journal 路径）。**收窄声明**：不外推"整个迁移管线仅此两个写入点"——
  baseline/path/project-io 有只读 fs，其余模块写路径未审。
- **P6-004 N/A（r2 改述）** 校验面为**双向协议**（见 P6-001），分层方向不做裁断；下沉建议不提
  （不发明重构）。
- **P6-005 risk** `walkBody` 同文件 3 个递归调用点（:398/:772/:1368）+ 递归深度无显式上限
  （未发现 depth guard 证据）——原版脚本深度受引擎约束，实际输入有界；标 risk（防御性），
  非缺陷，不建议本包加政策。

## 5. 未证风险

- 未运行任何迁移命令（--write 明令禁止；连只读 --check 类命令也未跑，因卡面限定
  "迁移写盘"回避且沙盒资源接入不完整）。
- `soundAssetForNum` catalog 过滤路径的行为依赖真实资源（V0 小样已证 worktree 资源不完整）。
