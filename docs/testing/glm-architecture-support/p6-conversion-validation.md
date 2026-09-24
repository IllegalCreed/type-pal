# P6 · 迁移/校验边界取证（ARCH-SUPPORT-GLM-1）

日期 2026-09-25。冻结 SHA `3270473862…`。对象：`migrate/src/migrate-content.ts`
（`mapScenesStatic` :2126）、`migrate/src/translate-events.ts`（`walkBody` :977）、
`content/src/author-script-core.ts` ↔ `content/src/enemy-script.ts`、写盘责任层
`migrate/src/migration-transaction.ts`。**纪律**：未跑 `--write`、未改 generated/schema/事务格式、
不发明新校验政策；全部静态读取 + 既有测试对账。

## 1. 转换阶段与磁盘写入责任图

```
[只读源] pal 原始资源/SCENE/EVENT
   │  mapScenesStatic (migrate-content.ts:2126，纯函数：srcScenes+eventsByScene+映射表 → SceneMigrationResult+report)
   │  walkBody (translate-events.ts:977，纯递归翻译；P0 只读溯源栈 :210)
   │  checkEnemyHookFlow (translate-enemy-scripts.ts:89 在翻译后自检)
   ▼
[内存产物] SceneMigrationResult / TranslateReport（gap 登记 :878 recordMigrationGap；:885 assertNoMigrationGaps fail-loud）
   ▼
[事务写盘] migration-transaction.ts：writeFileSync 只出现在 commitMigrationTransaction(:348)
   与 journal 持久化(:367)；recoverMigrationTransaction(:264)/hasPendingMigrationTransaction(:273)
   供写盘保护恢复（migration-write-guard 卡已三席收口）
```

**责任边界清晰**：翻译/校验全部是纯函数（无 node:fs import——实测 translate-events.ts/
migrate-content.ts/author-script-core.ts/enemy-script.ts 均无 fs 写调用；fs 只在
migration-{baseline,path,project-io,transaction}.ts，且 transaction 是唯一 writeFileSync 点）。
`walkBody` 递归同文件内 3 处调用（:398/:772/:1368），无跨包重定义。

## 2. 校验递归的真实调用域

- `checkBaseAuthorCommands`（author-script-core.ts:600）：自递归 4 处（:661 then / :663 else /
  :669 body / :708 onLose）——**author 树四类容器**全部覆盖，递归域=author 命令树。
- `checkEnemyHookFlow`（enemy-script.ts:458）：内部消费 `checkCommands`（script.js，:10 import）
  与 `checkAuthorCondition`（:588）——enemy-hook 流是 author/script 两套校验的组合面；
  迁移侧唯一调用域 = translate-enemy-scripts.ts:89（翻译后立即校验，带 `@L_地址` 定位）。
- `checkEntityAddress`（:390）：实体地址断言（asserts 签名），被树遍历复用。
- **协议观察（非缺陷）**：author-script-core 与 enemy-script 存在对 condition/dialog 的校验
  交叉（enemy-script:588 调 checkAuthorCondition、:599 条件性调 checkCommands）——共享底层已存在
  （author-script-core 即共享层），enemy-script 是其上的 hook 方言层。**纯函数候选**：enemy-hook
  的 runtime 语义（cursor/advance）已独立在 reforge/enemy-hook-runtime.ts；校验侧无进一步下沉需求
  证据，如实不发明重构。

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
- **P6-002 risk** `mapScenesStatic` 5 参签名（:2126-2133）的参数组合矩阵无直接快照回归——
  现靠 pal-* 端到端测试间接覆盖；若后续改签名，建议先补参数级快照再动。静态证据。
- **P6-003 covered** 写盘单点：`grep writeFileSync migrate/src` 仅 migration-transaction.ts:348/:367
  两处，均在 commit/journal 路径；翻译层零 fs（grep 实证）。**责任图结论有直接证据**。
- **P6-004 N/A** 共享底层协议（author-script-core 作为 condition/dialog 校验的共享层）已存在，
  无新协议建议；不发明重构。
- **P6-005 risk** `walkBody` 同文件 3 个递归调用点（:398/:772/:1368）+ 递归深度无显式上限
  （未发现 depth guard 证据）——原版脚本深度受引擎约束，实际输入有界；标 risk（防御性），
  非缺陷，不建议本包加政策。

## 5. 未证风险

- 未运行任何迁移命令（--write 明令禁止；连只读 --check 类命令也未跑，因卡面限定
  "迁移写盘"回避且沙盒资源接入不完整）。
- `soundAssetForNum` catalog 过滤路径的行为依赖真实资源（V0 小样已证 worktree 资源不完整）。
