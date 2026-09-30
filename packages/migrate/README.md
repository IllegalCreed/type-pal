# @type-pal/migrate — PAL current 内容供应链

本包是第二阶段唯一允许读取第一阶段提取数据的桥：离线读取 `data/extracted`，向
`projects/pal` 重导当前 `contentVersion 20 / SAVE8` 工程的原始源分区。运行时和编辑器不依赖本包。
（content20 于 2026-09-05 由 ED-SCENE-LIFECYCLE-1 引入 SceneIndex；当前版本常量以
`packages/content/src/character.ts` 为准。）

## 当前发布模型

```txt
base   = 上一次 current 纯发布 baseline
ours   = 当前 projects/pal（包含作者编辑）
theirs = current baseline + 本次窄供应分区（catalog / maps / tilesets / shops / 六角色）
```

三方合并保护作者修改；原始源拥有的分区由确定性生成器刷新。当前 baseline、工程 JSON 和
manifest 通过同一个可恢复事务发布，二进制资源先按 catalog hash 物化。产品中不存在历史
content epoch、rewind、transition seal、旧存档 sidecar 或 bootstrap 升级入口。

局部文件的 `ProjectMap.version = 4`、`AssetCatalog.version = 1` 等是当前独立格式轴，不代表
产品还支持 content4/content1。

场景/共享脚本、技能、敌AI等作者正文不从原版重生成；作者场景路径和自定义角色/精灵保留。
物品只同步268炼蛊皿、270资源池用途的失败原文，形状漂移停止；六角色保留四个原始伤亡回调。
角色精灵别名仍核真实静态布局和显式引用清单，不重新推导原版环境动作。

## 命令

日常作者工程校验从仓库根运行`pnpm check:content [工程目录]`，不读取原版输入，不生成内容，
不恢复事务或写盘。作者修改继续通过编辑器现有安全保存入口提交，不需要先跑PAL重导。
以下迁移命令仅用于需要从PAL原始源重建资源、地图或其它明确源分区的维护任务：

```bash
# 生成、三方合并和 current 闭包校验；见下方事务恢复边界
pnpm --filter @type-pal/migrate migrate:content

# 发布；提交后在同一进程内复核零差异，不再重复跑一遍完整生成器
pnpm --filter @type-pal/migrate migrate:content --write

# 快速单测 / 含真实 PAL source 的完整相关门禁
pnpm --filter @type-pal/migrate test:fast
pnpm --filter @type-pal/migrate check
```

不带`--write`时不发起新的发布事务，但命令首先恢复已存在的中断事务，因此**不能作为
绝对只读检查**。冲突、当前 schema 错误、未知跨引用或资源闭包失败都会在创建新事务
journal 前停止。`--write`前还会做baseline / project TOCTOU复核；中断后下一次命令先恢复
同一事务。仅需检查作者工程时使用上方`check:content`。

## 目录职责

- `src/pal-content-supply{,-io}.ts`：PAL资源/地图/静态表窄供应及原始输入入口。
- `src/pal-{role-mapping,item-message-source,world-sprite-registry}.ts`：静态角色/布局与窄物品提示源。
- `src/pal-current-publication.ts`：PAL原始源重导的current publication组装与专用闭包门。
- `src/migration-{baseline,merge,plan,transaction,write-plan}.ts`：通用三方合并和事务基础设施。
- `baselines/pal/`：上一次纯 current publication；进入 Git，禁止手工拼接。
- `scripts/migrate-content.mts`：PAL原始源重导命令；不是通用作者工程保存或校验入口。

完整原版剧情/战斗脚本转换核及原版动作审计按用户裁决退役，历史实现和审计证据保存在Git。
当前删除批次及验收状态跟随
[ARCH-PAL-SUPPLY-1](../../docs/ops/tasks/ARCH-PAL-SUPPLY-1-author-publication-and-import-retirement.md)，
资源供应、安全重导、地图审计与UI资产bake继续维护，migrate包本身不退休。

## 操作纪律

- 迁移写盘时不要让编辑器同时保存；成功后重载已打开的工程。
- 普通工程写删携带规划时的原始字节hash（新文件为显式不存在），提交前和staging时检查；冲突停止，不把新作者字节重新采样为可覆盖旧值。已发布journal的恢复仍核原previousHash。
- 资源目标与本次临时路径拒绝父链/叶节点/悬空符号链接，写点再次检查；临时文件独占创建，失败只清仍属于本次且路径安全的文件。中途换链时不沿新链清理。
- 上述保护不是跨进程原子CAS或OS级沙箱，最后一次检查到syscall之间仍有外部竞态；单writer纪律不因增加校验而解除。资源物化失败也不承诺整批自动回滚。
- 资源供应缺陷修生成真源，再安全重导；作者脚本改当前工程，不回头修改旧原版转换规则。
- current baseline 不存在时应从已核准的 current 工程重新生成，而不是读取历史工程或恢复旧
  upgrader。
- `migrate` 只做离线资源供应/安全重导：运行时逻辑归 `reforge`，数据模型归 `content`，编辑器归
  `editor`。

当前 PAL 内容导入与发布见 [PAL 内容导入与发布](../../docs/phase2/guides/content-publication.md)。
维护者从 `data/extracted` 重建 reforge engine-chrome 默认 UI 见
[本地开发服务器](../../docs/ops/guides/dev-servers.md) 的 bake 说明；该命令不写 `projects/pal`。
