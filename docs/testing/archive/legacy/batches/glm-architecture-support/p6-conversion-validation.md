# P6 · 迁移/校验边界取证（ARCH-SUPPORT-GLM-1）

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 ARCH-SUPPORT-GLM-1 P6 迁移/校验边界取证（2026-09-25，冻结 3270473862；对象 mapScenesStatic :2126、walkBody :977、author-script-core↔enemy-script、migration-transaction 写盘层；纪律：未跑 --write、未改 generated/schema/事务格式、不发明新校验政策，全部静态读取+既有测试对账）。含 r2 返工更正四条（校验递归双向/mapScenesStatic 6 参数/无 fs 收窄四模块/纯函数不作主张）。

## Scope

- 转换与写盘责任图：只读源→mapScenesStatic（无 fs 转换入口）+walkBody（纯递归翻译）+checkEnemyHookFlow（翻译后自检）→内存产物（gap 登记 :878、assertNoMigrationGaps :885 fail-loud）→事务写盘（writeFileSync 只在 commitMigrationTransaction :348 与 journal 持久化 :367；recover/hasPending 供写盘保护恢复——migration-write-guard 卡已三席收口）。

## Execution and assertions

- **校验递归**：checkBaseAuthorCommands 自递归 7 处（:661 then/:663 else/:669 body/:708 onLose/:710 onFlee/:722 onFail/:726 onNo——r3 函数体逐行核对统一口径），author 树七类容器臂全覆盖；另 :712 经 checkBattleChoreography 进 enemy-script；checkEnemyHookFlow 消费 checkCommands+checkAuthorCondition，迁移侧唯一调用域 translate-enemy-scripts.ts:89（翻译后立即校验带 @L_地址定位）；r2 更正为双向协议：author:3/:712→checkBattleChoreography、enemy:6/:598→checkBaseAuthorCommands——共享校验面是双向协议非单向分层；分层方向裁断与下沉建议属实施卡不提
- **测试对账**：translate-events.test 66 条（stable id 正交重放/未知名字 fail-loud 不泄漏数字/gap 不冒充/root-target 绑定）+author-script-core 17+enemy-script 6+write-guard/baseline/path/project-io 各自测试；输出精确性/错误 fail-loud/gap 不冒充 covered；未覆盖区：mapScenesStatic 顶层入参组合矩阵无逐参数快照（pal-* 集成间接覆盖）标 risk-P6-002
- **证据条目**：P6-001 covered（66+17+6 精确计数）；P6-002 risk（6 参数签名组合矩阵无直接快照回归）；P6-003 covered r2 收窄（四模块零 fs import grep 实证+grep writeFileSync 仅 transaction 两处——不外推整个管线仅此两写入点，baseline/path/project-io 有只读 fs 其余未审）；P6-004 N/A（双向协议不裁断分层）；P6-005 risk（walkBody 同文件 3 递归点无显式深度上限——原版输入有界，防御性非缺陷不建议加政策）

## Results

- 未证风险：未运行任何迁移命令（--write 明令禁止；连只读 --check 类也未跑——卡面限定迁移写盘回避且沙盒资源不完整）；soundAssetForNum 行为依赖真实资源（V0 已证 worktree 资源不完整）。

## Evidence

- 证据路径：本报告正文（quote 保全）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| P6 取证 | 2026-09-25 | 责任图+递归+对账+r2 更正 | 5 条目（2 covered/2 risk/1 N/A） | intake counter |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy batches/glm-architecture-support 的 P6 取证报告；固定来源与 source SHA 见下方保全节。

## 原始结论

转换/写盘责任边界+双向校验协议+测试对账；r2 四条更正（双向/6 参数/fs 收窄/纯函数撤回）。

## 当时证据

责任图、递归调用域、对账表与五条目在 quote 保全。

## 当前有效性

historical。取证按冻结 3270473862 静态读取。

## 继任文档

当前结论归 ARCH-SUPPORT-GLM-1 任务卡。

## 原文保全

固定源 revision `5cd599bd28c6aaa67d61e00479bb5379099b9157`，source SHA `ee2535720670a6304f04ad03a62c47aaa4c94cd0f4e4cca509e99e65dd5e34e9`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # P6 · 迁移/校验边界取证（ARCH-SUPPORT-GLM-1）
>
> 日期 2026-09-25。冻结 SHA `3270473862…`。对象：`migrate/src/migrate-content.ts`
> （`mapScenesStatic` :2126）、`migrate/src/translate-events.ts`（`walkBody` :977）、
> `content/src/author-script-core.ts` ↔ `content/src/enemy-script.ts`、写盘责任层
> `migrate/src/migration-transaction.ts`。**纪律**：未跑 `--write`、未改 generated/schema/事务格式、
> 不发明新校验政策；全部静态读取 + 既有测试对账。
>
> > **r2 返工更正（Codex intake counter 0e751efe）**
> > ① **校验递归是双向的**（撤回 r1"author 底层、enemy 上层"单向表述）：author-script-core :3 import
> > checkBattleChoreography（enemy-script 提供）并在 :712 调用；enemy-script :6 import
> > checkBaseAuthorCommands 并在 :598 回调。author 递归容器实测含 onLose/onFlee/onFail/onNo 等臂（函数体内自递归共 7 处）
> > （:708-727）。② **mapScenesStatic 为 6 参数**（+options），r1 误写 5。③ 无 fs 事实**收窄**：
> > 只断言四个转换/校验模块（translate-events/migrate-content/author-script-core/enemy-script）；
> > 不外推"整个迁移管线仅 transaction 两个写入点"（baseline/path/project-io 有只读 fs，写路径未审；
> > authoring 等其它模块未审）。④ "纯函数绝不改输入"不作主张（未做输入变异审计）。
>
> ## 1. 转换阶段与磁盘写入责任图
>
> ```
> [只读源] pal 原始资源/SCENE/EVENT
>    │  mapScenesStatic (migrate-content.ts:2126，无 fs 的转换入口：srcScenes+eventsByScene+映射表 → SceneMigrationResult+report)
>    │  walkBody (translate-events.ts:977，纯递归翻译；P0 只读溯源栈 :210)
>    │  checkEnemyHookFlow (translate-enemy-scripts.ts:89 在翻译后自检)
>    ▼
> [内存产物] SceneMigrationResult / TranslateReport（gap 登记 :878 recordMigrationGap；:885 assertNoMigrationGaps fail-loud）
>    ▼
> [事务写盘] migration-transaction.ts：writeFileSync 只出现在 commitMigrationTransaction(:348)
>    与 journal 持久化(:367)；recoverMigrationTransaction(:264)/hasPendingMigrationTransaction(:273)
>    供写盘保护恢复（migration-write-guard 卡已三席收口）
> ```
>
> **责任边界（r3 收窄口径）**：四个已审模块（translate-events/migrate-content/author-script-core/
> enemy-script）无 node:fs import（grep 实证）；fs 集中在 migration-{baseline,path,project-io,
> transaction}.ts，其中 transaction 是这五个文件中唯一 writeFileSync 点。**不作扩大结论**："全部纯函数"
> 与"整个迁移管线仅此两个写入点"均已撤回（未做输入变异审计，未审其余模块写路径——与顶部更正④一致）。
> `walkBody` 递归同文件内 3 处调用（:398/:772/:1368），无跨包重定义。
>
> ## 2. 校验递归的真实调用域
>
> - `checkBaseAuthorCommands`（author-script-core.ts:600）：**自递归 7 处**（:661 then / :663 else / :669 body /
>   :708 onLose / :710 onFlee / :722 onFail / :726 onNo，r3 以函数体逐行核对统一口径）——**author 树七类
>   容器臂**全部覆盖；另 :712 经 checkBattleChoreography 进入 enemy-script。
> - `checkEnemyHookFlow`（enemy-script.ts:458）：内部消费 `checkCommands`（script.js，:10 import）
>   与 `checkAuthorCondition`（:588）——enemy-hook 流是 author/script 两套校验的组合面；
>   迁移侧唯一调用域 = translate-enemy-scripts.ts:89（翻译后立即校验，带 `@L_地址` 定位）。
> - `checkEntityAddress`（:390）：实体地址断言（asserts 签名），被树遍历复用。
> - **协议观察（r2 更正为双向）**：author-script-core 与 enemy-script **互为调用面**（author:3/:712
>   → checkBattleChoreography；enemy:6/:598 → checkBaseAuthorCommands），加上 enemy-script:588 调
>   checkAuthorCondition、:599 条件性调 checkCommands——共享校验面是双向协议，不是单向分层。
>   分层方向裁断与下沉建议属实施卡工作，本包不提。
>
> ## 3. 幂等/精确输出/错误路径的现有测试对账
>
> | 测试（文件:行） | 确实证明 | 与本包差异 |
> |---|---|---|
> | translate-events.test.ts 66 条，如 :75 `当前产品输出 stable id；冻结 6A 输入可正交重放 numeric team`、:111 `未知名字对象 fail-loud，不泄漏数字字符串到 canonical actorId`、:163 `不可译命令只登记 gap，不得冒充 emitted`、:175 `同地址同 owner 的 root 与 target 结果绑定各自 canonical body` | 输出精确性/错误 fail-loud/gap 不冒充 | covered |
> | author-script-core.test.ts **17 条**（含 wave2） | author 校验递归四容器 | covered |
> | enemy-script.test.ts **6 条** + enemy-script.boundaries.test.ts | hook 流校验 | covered |
> | migration-write-guard.test.ts（:88-89 等） | 事务恢复 true/false 真实语义 | covered（三席收口卡） |
> | migration-baseline / migration-path / migration-project-io 各自测试 | 只读 IO 前置校验 | covered |
>
> **未覆盖区**：`mapScenesStatic` 顶层入参组合（roleSpritesByNum/globalRoots/soundAssetForNum
> 四参组合矩阵）无逐参数快照测试——由 pal-* 集成测试间接覆盖；标 risk-P6-002。
>
> ## 4. 证据条目
>
> - **P6-001 covered** 上表（66+17+6+若干）精确计数：translate-events 66、author-script-core 17、
>   enemy-script 6。
> - **P6-002 risk（r2 参数数更正）** `mapScenesStatic` **6 参数**签名（:2126-2135：srcScenes/eventsByScene/roleSpritesByNum/globalRoots/soundAssetForNum/options）的参数组合矩阵无直接快照回归——
>   现靠 pal-* 端到端测试间接覆盖；若后续改签名，建议先补参数级快照再动。静态证据。
> - **P6-003 covered（r2 收窄）** 四个转换/校验模块（translate-events/migrate-content/author-script-core/
>   enemy-script）零 fs import（grep 实证）；`grep writeFileSync migrate/src` 仅 migration-transaction.ts
>   :348/:367 两处（commit/journal 路径）。**收窄声明**：不外推"整个迁移管线仅此两个写入点"——
>   baseline/path/project-io 有只读 fs，其余模块写路径未审。
> - **P6-004 N/A（r2 改述）** 校验面为**双向协议**（见 P6-001），分层方向不做裁断；下沉建议不提
>   （不发明重构）。
> - **P6-005 risk** `walkBody` 同文件 3 个递归调用点（:398/:772/:1368）+ 递归深度无显式上限
>   （未发现 depth guard 证据）——原版脚本深度受引擎约束，实际输入有界；标 risk（防御性），
>   非缺陷，不建议本包加政策。
>
> ## 5. 未证风险
>
> - 未运行任何迁移命令（--write 明令禁止；连只读 --check 类命令也未跑，因卡面限定
>   "迁移写盘"回避且沙盒资源接入不完整）。
> - `soundAssetForNum` catalog 过滤路径的行为依赖真实资源（V0 小样已证 worktree 资源不完整）。
>
<!-- original-source-quote:end -->
