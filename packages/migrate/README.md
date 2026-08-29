# @type-pal/migrate — PAL current 内容供应链

本包是第二阶段唯一允许读取第一阶段提取数据的桥：离线读取 `data/extracted`，向
`projects/pal` 发布当前 `contentVersion 19 / SAVE8` 工程。运行时和编辑器不依赖本包。

## 当前发布模型

```txt
base   = 上一次 current 纯发布 baseline
ours   = 当前 projects/pal（包含作者编辑）
theirs = current baseline + 本次从原始源重建的 catalog / maps / tilesets
```

三方合并保护作者修改；原始源拥有的分区由确定性生成器刷新。当前 baseline、工程 JSON 和
manifest 通过同一个可恢复事务发布，二进制资源先按 catalog hash 物化。产品中不存在历史
content epoch、rewind、transition seal、旧存档 sidecar 或 bootstrap 升级入口。

局部文件的 `ProjectMap.version = 4`、`AssetCatalog.version = 1` 等是当前独立格式轴，不代表
产品还支持 content4/content1。

## 命令

```bash
# 只读生成、三方合并和 current 闭包校验
pnpm --filter @type-pal/migrate migrate:content

# 发布；提交后在同一进程内复核零差异，不再重复跑一遍完整生成器
pnpm --filter @type-pal/migrate migrate:content --write

# 快速单测 / 含真实 PAL source 的完整相关门禁
pnpm --filter @type-pal/migrate test:fast
pnpm --filter @type-pal/migrate check
```

默认命令永远是 dry-run。冲突、当前 schema 错误、未知跨引用或资源闭包失败都会在创建事务
journal 前停止。`--write` 前还会做 baseline / project TOCTOU 复核；中断后下一次命令先恢复
同一事务。

## 目录职责

- `src/pal-migration.ts`：原始 PAL 数据的隔离转换实现；其内部局部 V1 文件结构不是产品 epoch。
- `src/pal-current-publication.ts`：唯一 current publication 组装与闭包门。
- `src/migration-{baseline,merge,plan,transaction,write-plan}.ts`：通用三方合并和事务基础设施。
- `baselines/pal/`：上一次纯 current publication；进入 Git，禁止手工拼接。
- `scripts/migrate-content.mts`：唯一产品内容发布命令。

## 操作纪律

- 迁移写盘时不要让编辑器同时保存；成功后重载已打开的工程。
- 迁移缺陷修生成真源，再全量发布；不得只改 `projects/pal` 生成结果。
- current baseline 不存在时应从已核准的 current 工程重新生成，而不是读取历史工程或恢复旧
  upgrader。
- `migrate` 只做离线转换/安全重导：运行时逻辑归 `reforge`，数据模型归 `content`，编辑器归
  `editor`。

资产烘焙细节见 [asset-pipeline.md](../../docs/phase2/migrate/asset-pipeline.md)。
