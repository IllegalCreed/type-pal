# TEST-CURSOR-COMMAND-BOUNDARIES-3 — 八组命令残项回执

2026-09-26。Cursor 在独立 worktree `/Users/zhangxu/illegal/type-pal-cursor-command-boundaries-r3`、分支 `codex/cursor-command-boundaries-r3` 上连续补 C1–C8。生产冻结 `7cac1d72ac0b8a44521a353cc87dbe1d18d65fa5`；准入/开工祖先 `7d64de139643a7aa890b3a9434b8bfb720050f44`。没有合 main，没有标 done，没有跑官方覆盖率 / ratchet / 严格全仓门。

本批只补公开 Command 构造/apply/invert 行为残项，不重做 F2 出口同一性。`commands.ts` 的 **119** 个公开出口集合与本包无关（不核、不扩、不对账）。相对冻结 `7cac1d72` 无产品 diff。合法输入走 `buildBlankProject` → 正式 loader → `toEditorState`。作者自验不能替代 Codex 独立验收。

本文件位于专属目录 `docs/testing/cursor-command-boundaries-r3/`。仓内 `c*-mutant.json` / `evidence.json` 是紧凑摘要，不是原始 green/red JSON 或日志。复跑默认只写唯一 `/tmp` 目录并打印路径，不回写已跟踪摘要；需要更新摘要时从该临时目录显式复制。

残项 title / 数量来自 `vitest --reporter=json`：7 个新文件 **29** 项全绿。C8 无新 residual 文件，只登记既有证明。

## 八行总账

| 组 | 模块 | 新测试文件 | 新增项(真实title) | 已有证明(file+title) | 无法公开到达 | 代表反控 |
|---|---|---|---|---|---|---|
| C1 | actor-commands | `packages/editor/src/core/actor-commands.residual.test.ts` | `AddActor 拒绝首尾空格 name，输入态不变`；`AddActor 新 id 且 locale 缺名称键 → 名称文本不存在或为空`；`AddActor 只坏 face 一轴 → 小头像资源不存在或类型错误`；`UpdateActor 只改 coveredBy 为不存在人物 → 援护者不存在`；`AddEntity actor:ghost 后 DetachActorEntity → 人物不存在` | `packages/editor/src/core/actor-commands.test.ts` · `coveredBy 自引用与 levelUp 伴随边随人物删除，外部 coveredBy 仍阻断` | 未 apply 的 invert 防御返回；UpdateActor 缺目标 no-op。Add 路径 coveredBy 与 patch 同文案，本批只证 UpdateActor | [c1-mutant.json](c1-mutant.json) |
| C2 | entity-commands | `packages/editor/src/core/entity-commands.residual.test.ts` | `AddEntity 构造后改入参不泄漏；SetEntitySprite 可 undo/redo 换 sprite`；`SetEntitySprite 对 actor 实例是现行 no-op（同引用）`；`UpdateEntity facing 对触发区抛无朝向，输入态不变`；`AddEntity：构造后改 entity，apply 仍用 clone` | `packages/editor/src/core/entity-address-references.test.ts` · `delete is fail-loud while lifecycle references exist and remains undoable after cleanup`；`packages/editor/src/core/commands.test.ts` · `UpdateEntity:改 hidden + facing 多字段,invert 还原各自旧值(interact 已随 demo 旧路退役)` | 未 apply 的 invert；缺 scene/entity 早退 | [c2-mutant.json](c2-mutant.json) |
| C3 | tileset-commands | `packages/editor/src/core/tileset-commands.residual.test.ts` | `AddTileset 重复定义 id starter → 瓦片集定义 id 已存在`；`AddTileset 同 AssetId 但记录不同 → 瓦片集 AssetId 已存在且记录不同`；`AddTileset 新定义共享 starter 资产：createdAsset=false，撤销不删共享资源`；`UpdateTilesetMetadata name 空白 → 瓦片集名称不能为空`；`UpdateTilesetMetadata category 空串 → 瓦片集分类不能为空` | `packages/editor/src/core/tileset-lifecycle.test.ts` · `改名/分类只修改领域定义，catalog label 不形成第二名称真值`；同文件 `导入拒绝二进制长度不符与其它 AssetId 的路径碰撞` | 未 apply 的 invert；缺定义早退。正式成功 proof 不伪造 | [c3-mutant.json](c3-mutant.json) |
| C4 | sprite-commands | `packages/editor/src/core/sprite-commands.residual.test.ts` | `UpdateSprite 非法预制动作 durationMs=0 → 预制动作非法`；`UpdateSprite proof.actualFrameCount 为 0 → 实际帧数非法`；`先合法加入预制动作，再 poses:{} 且无 currentReferences → 无法读取引用索引`；`DeleteUnusedSpriteAssetCommand 删除 hero 资产 → 精灵资产仍被定义引用`；`AddSprite 缺 asset 字段 → 精灵定义缺 AssetId` | `packages/editor/src/core/sprite-reference-commands.test.ts` · `action edge blocks both action and definition deletion while definition-only use does not lock action` | 未 apply 的 invert；替换/缩帧过期证明需另造内部 proof，本批不扩 | [c4-mutant.json](c4-mutant.json) |
| C5 | battle-sprite-commands | `packages/editor/src/core/battle-sprite-commands.residual.test.ts` | `AddBattleSprite 重复 id starter-fighter → 已存在`；`AddBattleSprite 新 id 但路径已被 starter 战斗精灵登记`；`AddEnemy 后 SetEnemyBattleSprite(starter-fighter) → 敌人只能引用 enemy profile`；`UpdateBattleSpriteDefinition 改 profile kind 且无 currentReferences` | `packages/editor/src/core/commands.test.ts` · `SetEnemyBattleSprite:只切换 enemy profile 定义并可撤销` | 未 apply 的 invert；缺敌人 no-op；缩帧/替换证明臂不另造内部 proof | [c5-mutant.json](c5-mutant.json) |
| C6 | map-asset-commands | `packages/editor/src/core/map-asset-commands.residual.test.ts` | `CreateMapAssetCommand id=start（已在 mapIndex）→ 地图 id "start" 已存在`；`CreateMapAsset 构造后改 def.name / map.width，catalog 仍用 clone，且可 undo/redo` | `packages/editor/src/core/commands.test.ts` · `delete 被引用时列出场景并阻止；解除后删除与 undo 保序恢复` | 未 apply 的 invert；缺目标 no-op。bind/rename 已由旧用例证明 | — |
| C7 | startup-commands | `packages/editor/src/core/startup-commands.residual.test.ts` | `UpdateManifestAssetRoles 清除 visual.standardColorTable，undo/redo 恢复原 AssetId`；`SetStartupEntries 空/空白 defaultEntryId → 直接启动入口 id 必须是无首尾空格的非空字符串`；`SetStartupEntries 空入口名称 → 名称不能为空`；`SetStartupEntries 空入口场景 → 场景不能为空` | `packages/editor/src/core/commands.test.ts` · `直接启动入口与入口表原子 apply-invert，且清除 introVideo 缺席字段`；同文件 `入口点拒绝空/重复/带首尾空格 id、缺失开局和无效默认入口` | 未 apply 的 invert。不改启动政策，不另造合法 startWorld 矩阵 | — |
| C8 | asset-label-command | 无新 residual 文件 | 无新增项。登记既有：`keeps asset-label constructor on the old commands barrel and clears empty labels`；`更新存在资产标签并 invert；缺目标与同名 no-op（现行合同）`；`UpdateAssetLabel:起名/清名/invert，AssetId 与 path 不变` | `packages/editor/src/core/asset-label-command.test.ts` · `keeps asset-label constructor on the old commands barrel and clears empty labels`；`packages/editor/src/core/commands-assets.boundaries.test.ts` · `更新存在资产标签并 invert；缺目标与同名 no-op（现行合同）`；`packages/editor/src/core/commands.test.ts` · `UpdateAssetLabel:起名/清名/invert，AssetId 与 path 不变` | 无。缺目标/清名/invert/稳定 id+path 已由上列三文件公开到达，不为凑组造测试 | — |

无阻断组。批末 **5** 个代表反控（C1–C5），不复制八套判据框架。仓内紧凑汇总：[evidence.json](evidence.json)（`count=5`、`allOk=true`、`allHit=true`、全部 `redExit=1`、`hashUnchanged=true`）。原始 green/red JSON 与日志只在 runner 打印的 `/tmp` 目录。

## 代表反控

`judgeGreen` / `judgeRed` 钉全范围执行数与目标、拒套件/全局 `file.message`、拒额外失败、逐 message 拒混错与 `timed out`；保留 Vitest 堆栈里的 `runWithTimeout` 函数名。`--self-test` 调用同一组 judge：原拒绝 + 合法绿/红对照 + 混错/`timed out`/额外失败/套件错误拒绝 + `runWithTimeout` 堆栈对照。`mergeConfig` + `enforce: 'pre'`、`MUTANT_HIT:<id>`、唯一针、绝对 file+fullName、红侧恰 exit 1、源 hash 前后相同。Vite 配置落在 `packages/editor/.mutant-<id>-` 后删除。`env -u NODE_COMPILE_CACHE`。

默认输出：唯一 `/tmp/cursor-command-boundaries-r3-mutants-*`（stderr 打印 `mutant output:`）。不在复跑中改仓内已跟踪 JSON。

| id | 针 | 红侧断言 |
|---|---|---|
| `c1-actor-covered-by` | patch 路径 `previous.battler?.coveredBy` + `援护者不存在` → `void actor` | expected function to throw |
| `c2-zone-facing` | `触发区 "..." 无朝向` → `void 0` | expected function to throw |
| `c3-tileset-empty-name` | `瓦片集名称不能为空` → `void 0` | expected function to throw |
| `c4-sprite-asset-in-use` | `精灵资产 ${this.asset} 仍被定义引用` → `void 0` | expected function to throw matching /精灵资产 .* 仍被定义引用/ |
| `c5-enemy-profile` | `敌人只能引用 enemy profile` → `void 0` | expected function to throw |

## 验证

作者自验，不能替代 Codex 独立接收。Status 保持 build。产品相对 `7cac1d72` 空 diff。

- `pnpm --filter @type-pal/editor typecheck` exit 0。
- 改动 Biome：formatter error 已清（fixture、7 份 residual、runner、本目录文档、任务卡交付块）。
- `git diff --check` 干净。
- `node scripts/docs/check.mjs` 通过（回执在本目录 `receipt.md`，由本目录 README 链接）。
- 负控 `--self-test` 调用运行用的同一 `judgeGreen` / `judgeRed`。
- 定向残项 JSON：**7 files / 29 tests** exit 0。
- 相邻：`actor-commands.test.ts`、`tileset-lifecycle.test.ts`、`asset-label-command.test.ts`、`commands-wave2.actor.test.ts`。
- 全 editor check：**331 files / 2858 tests exit 0**（本 worktree 本地依赖 + gitignored 环境内 PAL `projects/pal/assets/{runtime,migrated}` 符号链接，指向既有主仓资产，不入 Git，不改用户工程，不动 6010）。相对准入 324/2829，多出的 7 文件 / 29 项即本包 residual。
- 未跑官方 coverage / ratchet / 受保护 strict / 全仓 check。未开浏览器，6010 未动。

## 可复制命令

```bash
cd /Users/zhangxu/illegal/type-pal-cursor-command-boundaries-r3
git fetch origin
git rev-parse origin/main HEAD
# 生产冻结 7cac1d72ac0b8a44521a353cc87dbe1d18d65fa5
# 准入 7d64de139643a7aa890b3a9434b8bfb720050f44

env -u NODE_COMPILE_CACHE node docs/testing/cursor-command-boundaries-r3/module-mutants.mjs --self-test

env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor typecheck

env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run \
  src/core/actor-commands.residual.test.ts \
  src/core/entity-commands.residual.test.ts \
  src/core/tileset-commands.residual.test.ts \
  src/core/sprite-commands.residual.test.ts \
  src/core/battle-sprite-commands.residual.test.ts \
  src/core/map-asset-commands.residual.test.ts \
  src/core/startup-commands.residual.test.ts \
  src/core/actor-commands.test.ts \
  src/core/tileset-lifecycle.test.ts \
  src/core/asset-label-command.test.ts \
  src/core/commands-wave2.actor.test.ts

env -u NODE_COMPILE_CACHE node docs/testing/cursor-command-boundaries-r3/module-mutants.mjs
# 摘要写到打印的 /tmp 目录；不回写本目录已跟踪 JSON
# 或单组：node docs/testing/cursor-command-boundaries-r3/module-mutants.mjs c1

node scripts/docs/check.mjs

git diff --check 7cac1d72
git diff --stat 7cac1d72 -- packages/editor/src/core/actor-commands.ts \
  packages/editor/src/core/entity-commands.ts \
  packages/editor/src/core/tileset-commands.ts \
  packages/editor/src/core/sprite-commands.ts \
  packages/editor/src/core/battle-sprite-commands.ts \
  packages/editor/src/core/map-asset-commands.ts \
  packages/editor/src/core/startup-commands.ts \
  packages/editor/src/core/asset-label-command.ts \
  packages/editor/src/core/commands.ts
```

任务卡：[TEST-CURSOR-COMMAND-BOUNDARIES-3](../../ops/tasks/TEST-CURSOR-COMMAND-BOUNDARIES-3-editor-residuals.md)。Cursor 自验不是独立证明。Codex 负责隔离接收、全仓 check、官方 ratchet 与受保护严格 fast。
