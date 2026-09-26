# ARCH-F2-CURSOR-BATCH-2 — 剩余九组命令整理回执

2026-09-26。Cursor 在独立 worktree `/Users/zhangxu/illegal/type-pal-cursor-commands-wave2`、分支 `codex/cursor-commands-wave2` 上连续实施 C1–C9。生产冻结 `51048353fc3bde5a3e6bf50653786b905fd2857d`；用户冻结 / 开工祖先 `ef19ae7eb15f71736ffb5129d4d15a8a7b033839`。没有合 main，没有标 done，没有跑官方覆盖率 / ratchet / 严格全仓门。

`commands.ts` 保留旧公开出口；新模块对 `Command` 只 type-import `command-contract.ts`，运行期不回引 `commands.ts`。产品白名单只有 `commands.ts` + 13 个命名模块。身份合同见 `commands-wave2.*.test.ts`。作者自验不能替代 Codex 独立验收。

## 九行总账

| 组 | 状态 | 提交 SHA | 新模块 | 业务证据(精确 file + title) | 代表反控 |
|---|---|---|---|---|---|
| C1 | 已实施 | `8615388c246592a13f55a5b6368f6347d46a0bb5` | `composite-command.ts`、`command-scene-state.ts` | `packages/editor/src/core/commands-wave2.composite.test.ts` · `applies children in order and inverts in reverse` | — |
| C2 | 已实施 | `2285105c7359d6c9ed3535ac00da0f63ffae2875` | `entity-commands.ts` | `packages/editor/src/core/entity-address-references.test.ts` · `delete is fail-loud while lifecycle references exist and remains undoable after cleanup` | [c2-mutant.json](cursor-commands-wave2/c2-mutant.json) |
| C3 | 已实施 | `9bf3c17fcc695cb1b3bc99802a2f84525341e354` | `scene-commands.ts` | `packages/editor/src/core/commands.test.ts` · `W4-1 改名/移动不改变两处引用的稳定 id；引用落点禁止删除` | [c3-mutant.json](cursor-commands-wave2/c3-mutant.json) |
| C4 | 已实施 | `d8cd042035020643f123ffa2b35a74f1b793a160` | `map-asset-commands.ts` | `packages/editor/src/core/commands.test.ts` · `delete 被引用时列出场景并阻止；解除后删除与 undo 保序恢复` | — |
| C5 | 已实施 | `2fbc02e82ff01c14b16a56023ad91d5a67da7e42` | `map-edit-commands.ts` | `packages/editor/src/core/commands.test.ts` · `画瓦按稳定 layer.id 写入；invert 还原，源 state 不动` | [c5-mutant.json](cursor-commands-wave2/c5-mutant.json) |
| C6 | 已实施 | `141b19bd96a4d9d69df0c936600b05906a971b4f` | `tileset-commands.ts`、`command-asset-record.ts`（`sameAssetRecord` + `assert*Record`） | `packages/editor/src/core/tileset-lifecycle.test.ts` · `导入拒绝二进制长度不符与其它 AssetId 的路径碰撞` | [c6-mutant.json](cursor-commands-wave2/c6-mutant.json) |
| C7 | 已实施 | `091c12662c2e62fddbcef66525da1e8028faf4a8` | `sprite-commands.ts` | `packages/editor/src/core/sprite-reference-commands.test.ts` · `action edge blocks both action and definition deletion while definition-only use does not lock action` | — |
| C8 | 已实施 | `cc6c5614a44e656f769f5e0b1ea2353041136b87` | `actor-commands.ts` | `packages/editor/src/core/actor-commands.test.ts` · `coveredBy 自引用与 levelUp 伴随边随人物删除，外部 coveredBy 仍阻断` | [c8-mutant.json](cursor-commands-wave2/c8-mutant.json) |
| C9 | 已实施 | `6952ffeec978e7716e7f3e48fd5f240244f07f93` | `asset-commands.ts`、`startup-commands.ts`、`battle-sprite-commands.ts` | `packages/editor/src/core/commands.test.ts` · `Upsert/Delete:二进制随注册表写入删除，undo 还原`；同文件 `SetEnemyBattleSprite:只切换 enemy profile 定义并可撤销` | — |

无阻断组。批末 5 个代表反控，不复制九套判据框架。机器汇总：[evidence.json](cursor-commands-wave2/evidence.json)（`count=5`、`allOk=true`、`allHit=true`、全部 `redExit=1`、`hashUnchanged=true`）。工具 JSON/日志在 `/tmp`，未入仓。

本回执与反控 JSON 同证据提交 `docs: record remaining command extraction receipt`；最终 HEAD 即该提交（`git rev-parse HEAD`）。产品 C9 HEAD 仍是 `6952ffeec978e7716e7f3e48fd5f240244f07f93`。

## 出口与运行期依赖

AST 点名 `commands.ts` 公开出口：**119**，与 `ef19ae7e` 同一集合。`commands.ts` 无残留本地 class/type/function，只做 `export { … } from './<family>.js'`（及 `export type { Command }`）。`SetEnemyBattleSpriteCommand` 在 `battle-sprite-commands.ts`；`SetActorBattleSpriteCommand` 在 `actor-commands.ts`。`enemy-commands.ts` 对 `ef19ae7e` 空 diff。

新模块运行期图：对 `Command` 只 type-import `command-contract.ts`；无任何新模块 import `commands.ts`；新模块之间无运行期环、无新 SCC。`battle-sprite-commands.ts` 运行期依赖既有 `enemy-commands.ts`（`withEnemy`）与同批 `sprite-commands.ts` / `command-asset-record.ts`，单向。

13 个命名模块：`composite-command.ts`、`command-scene-state.ts`、`entity-commands.ts`、`scene-commands.ts`、`map-asset-commands.ts`、`map-edit-commands.ts`、`tileset-commands.ts`、`sprite-commands.ts`、`actor-commands.ts`、`asset-commands.ts`、`startup-commands.ts`、`battle-sprite-commands.ts`、`command-asset-record.ts`。

产品白名单对账：`git diff --stat ef19ae7e --` 上述 13 模块 + `commands.ts` 共 **14** 个产品文件。测试仅 `commands-wave2.*.test.ts`。无 UI / 算法 / 格式 / 基线 / package 配置改动。

## 非机械差异

必须单列（允许的 helper 可见性 / 单一身份下沉，不是行为改写）：

- 五个 scene helper 从 `command-scene-state.ts` 导出（原 `commands.ts` 私有）：`withScene`、`withEntities`、`findScene`、`withEntityPos`、`entityPos`。
- `sameAssetRecord` 与 `assertTilesetRecord` / `assertSpriteRecord` / `assertBattleSpriteRecord` 从 `command-asset-record.ts` 导出。
- `AssetInUseError` 在 C7 下沉到 `command-asset-record.ts`：`DeleteUnusedSpriteAssetCommand` 需要同一身份；桶上 `export { AssetInUseError } from './command-asset-record.js'`。

未改 map-patch 算法、保存格式、UI、超时或 coverage 基线。

## 代表反控

复用前批判据：`judgeGreen` / `judgeRed` / 8 条 `--self-test` 拒绝、`mergeConfig` + `enforce: 'pre'`、`MUTANT_HIT:<id>`、唯一针、绝对 file+fullName、红侧恰 exit 1、仅候选自身 `AssertionError`；拒 timeout / 混错 / 零执行。Vite 配置落在 `packages/editor/.mutant-<id>-` 后删除；源 hash 前后相同。

| id | 针 | 红侧断言 |
|---|---|---|
| `c2-entity-delete-guard` | `if (references.length)` + `实体 "..." 仍被引用` → `void references` | expected function to throw |
| `c3-scene-entry-guard` | `SceneEntryInUseError` 删除门 → `void references` | expected function to throw |
| `c5-map-edit` | `paintProjectMapTiles(map, this.edits)` → `const next = map` | expected null to be 5 |
| `c6-tileset-or-c7-sprite` | 瓦片集路径碰撞 throw → `void pathOwner` | expected function to throw |
| `c8-actor-in-use` | `ActorInUseError` → `void blockers` | expected function to throw |

## 验证

作者自验，不能替代 Codex 独立接收。done 未开放。

- `pnpm --filter @type-pal/editor typecheck` exit 0。
- 改动 Biome：formatter error 已清。保留变异字面量 2 条 `noTemplateCurlyInString` warning。
- `git diff --check` 干净。
- 负控 `--self-test` 8 条均按预期拒绝；5 针全部 ok+hit。
- `pnpm --filter @type-pal/editor check`：typecheck exit 0，**324 files / 2829 tests exit 0**（本 worktree 本地依赖 + gitignored 环境内 PAL `projects/pal/assets/{runtime,migrated}` 符号链接，指向既有主仓资产，不入 Git，不改用户工程）。相对前批 313/2813，多出的 11 文件 / 16 项即本包 `commands-wave2.*.test.ts`。
- 未跑官方 coverage / ratchet / 受保护 strict / 全仓 check。未开浏览器，6010 未动。

## 可复制命令

```bash
cd /Users/zhangxu/illegal/type-pal-cursor-commands-wave2
git fetch origin
git rev-parse origin/main HEAD
# 生产冻结 51048353fc3bde5a3e6bf50653786b905fd2857d
# 用户冻结 ef19ae7eb15f71736ffb5129d4d15a8a7b033839
# C9 产品 6952ffeec978e7716e7f3e48fd5f240244f07f93；最终 HEAD 见本证据提交

env -u NODE_COMPILE_CACHE node docs/testing/cursor-commands-wave2/module-mutants.mjs --self-test

env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor typecheck

env -u NODE_COMPILE_CACHE node docs/testing/cursor-commands-wave2/module-mutants.mjs
# 或单组：node docs/testing/cursor-commands-wave2/module-mutants.mjs c2

env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor check

git diff --check ef19ae7e
git diff --stat ef19ae7e -- packages/editor/src/core/commands.ts \
  packages/editor/src/core/composite-command.ts \
  packages/editor/src/core/command-scene-state.ts \
  packages/editor/src/core/entity-commands.ts \
  packages/editor/src/core/scene-commands.ts \
  packages/editor/src/core/map-asset-commands.ts \
  packages/editor/src/core/map-edit-commands.ts \
  packages/editor/src/core/tileset-commands.ts \
  packages/editor/src/core/sprite-commands.ts \
  packages/editor/src/core/actor-commands.ts \
  packages/editor/src/core/asset-commands.ts \
  packages/editor/src/core/startup-commands.ts \
  packages/editor/src/core/battle-sprite-commands.ts \
  packages/editor/src/core/command-asset-record.ts
```

任务卡：[ARCH-F2-CURSOR-BATCH-2](../ops/tasks/ARCH-F2-CURSOR-BATCH-2-remaining-commands.md)。Cursor 自验不是独立证明。Codex 负责隔离 UI、全仓 check、官方 ratchet 与受保护严格 fast。
