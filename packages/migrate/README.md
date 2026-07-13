# @type-pal/migrate — 第二阶段迁移器

> 状态:资产迁移已起(2026-06-28,UI box 首切片);数据迁移 ③ 阶段。
> 完整设计:[asset-pipeline.md](../../docs/phase2/migrate/asset-pipeline.md)、[decisions D18/D15](../../docs/phase2/decisions.md)。

把第一阶段产物(`data/extracted`)→ 第二阶段内容工程的**总迁移器**。两大类职责:

## A. 资产迁移(indexed/原格式 → RGBA/可直接用)

和数据 schema **正交**,现在就能做。核心 = `bakeIndexedRgba(src, palette)`(index → 真彩)。

| 资产 | 状态 | 备注 |
|---|---|---|
| 头像 portraits | ✅ | chunk 1/2(鬼话);可扩 88 |
| 菜单 UI box | ✅ | 黄框 frame-00..08 |
| 地块 tiles | ⬜ | 同 `bakeIndexedRgba`,换源 |
| 精灵 sprites(角色/NPC/敌人/法术) | ⬜ | 同上 |
| 其他 UI(卷轴/光标/战斗) | ⬜ | 同上 |
| 字体 font | ⬜ | 略特殊(点阵 1-bit mask,非 palette 烤色) |

- palette 标准 = **palette 0**([asset-pipeline D-a](../../docs/phase2/migrate/asset-pipeline.md):UI/头像在 pal0 正确,pal1/2 乱色)。
- 产物 → `packages/reforge/public/`(权宜;内容工程独立目录待数据迁移落地)。
- 跑:`pnpm bake`(根)或 `pnpm --filter @type-pal/migrate run bake`。

## B. 数据迁移(原版数据结构 → content schema 实例)

PAL 数据采用 MG2 结构化三方合并，安全重导而不覆盖编辑器/人工修改：

```txt
base   = 上一次纯迁移的 theirs(完整 baseline)
ours   = 当前 projects/pal 工程
theirs = 本次只读 data/extracted 产出的纯生成结果
```

- 脚本/事件 bytecode → 事件演出 schema。
- 对话 → `DialogueLine` + `locale.json`。
- 数据表(角色/道具/法术/敌人/敌队/音乐/战场/毒/商店)→ schema 实例。
- 全局下标 → 稳定 id；场景脚本按 M3 chunk 分片并重算派生元数据。

### 命令

```bash
# 日常 plan：生成 + 三方合并 + 全门禁，不写盘
pnpm --filter @type-pal/migrate run migrate:content

# plan 无冲突后显式写盘
pnpm --filter @type-pal/migrate run migrate:content -- --write

# 仅首次无 baseline 时：生成/校验精确分类报告
pnpm --filter @type-pal/migrate run migrate:content -- --bootstrap

# 首次报告生成后：执行 PAL 专用硬白名单分类，再重新跑上条命令校验
pnpm exec tsx packages/migrate/scripts/classify-pal-bootstrap.mts

# 分类报告闭合且审查通过后，建立首份 baseline
pnpm --filter @type-pal/migrate run migrate:content -- --bootstrap --write
```

默认永远是 dry-run。`--write` 前会完成结构化合并、内容形状/跨引用、脚本闭包/体积、对话 locale 引用和 TOCTOU 哈希复核。冲突时 `writes=0/deletes=0`，完整三值报告写到 `.type-pal-migrate/pal-conflicts.json`。

### Baseline 与事务

- baseline 在 `packages/migrate/baselines/pal/`，保存上一次**纯 theirs**，绝不保存合并后工程。
- baseline 是开发期机器产物，需进 Git 供跨机器/跨 Agent 共享；Git 冲突时**禁止手工拼 baseline**，必须重跑迁移。
- 工程文件和 baseline 在同一 journal 事务中提交。中断后下次命令会先幂等补完同一事务，不会拿旧 base 开始新合并。
- 首次 bootstrap 的每项差异必须有精确哈希、`ours/theirs` 选择和理由；`unresolved/upstream-overlay` 任一存在就禁止写盘。
- `packages/migrate/bootstrap/pal.json` 是本地一次性审查报告，已忽略 Git；可由 `--bootstrap` 加精确分类器重建，首份 baseline 建立后即可删除。
- 成功提交后命令会重读提取源并执行第二轮，必须严格得到 `writes=0/deletes=0/conflicts=0`。

### 操作纪律

- 迁移写盘时不得让编辑器同时保存；迁移成功后，已打开的编辑器必须重载工程。
- 禁止修改 `projects/pal` 后再“回读生成 theirs”；PAL 手工补录必须上移为确定性纯 overlay。
- 禁止整目录删除 scripts，禁止文本行级 JSON merge，禁止整库 `prefer ours/theirs`。
- 托管域：actors/sprites/items/skills/enemies/enemyTeams/locale/scenes/scripts/music/battle-fields/poisons/shops。
- 非托管域：manifest/ambiences/tilesets/自有 maps/assets；迁移前后按原字节 SHA-256 保护。

## 边界(免得变垃圾桶)

1. 只做**离线转换/安全重导**，**不在运行时** —— reforge 只消费产物、绝不调 migrate。
2. 运行时逻辑 → reforge;数据模型 → content;编辑器 → editor。migrate 只是"extracted → 内容工程"管线。
3. migrate 是内容供应链，不是运行时主体；增量合并只负责保护人工工程与吸收上游修复。

## 依赖边界

- ✅ `@type-pal/content`(目标 schema)
- ✅ `@type-pal/shared`(读原版解码)—— **唯一**合法碰第一阶段的第二阶段包(两阶段桥)
- ❌ 不依赖 `reforge` / `editor`
