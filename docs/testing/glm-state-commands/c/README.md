# C批：人物与资源命令

状态：GLM 已实施（2026-09-27）。范围C01–C04，见[工作包](../README.md)与[冻结账](../targets.freeze.json)。
基线一律取 `buildBlankProject` 正式空白项目（`loadBoundaryProject`）；字节/记录读自真实种子编码产物，
实际帧数来自 `decodeWorldSpriteAssetBytes`/`decodeBattleSpriteAssetBytes` 对真实字节的解码，
不把任意字节宣称合法 gzip/RLE。

## 命令与 exit（新鲜 JSON）

- 定向四文件：`env -u NODE_COMPILE_CACHE pnpm exec vitest run src/core/{actor,sprite,battle-sprite,tileset}-commands.glm-boundaries.test.ts`（cwd packages/editor）→ **33/33 exit 0**，JSON `/tmp/batch-c-directed.json`。
- 相邻十二文件（actor-commands.test/residual、三个资源命令 residual、tileset-lifecycle、tileset-references、sprite-reference-commands、commands-wave2 sprite/battle-sprite/tileset、commands.test）→ **170/170 exit 0**。
- editor `tsc --noEmit` → 零诊断；Biome（本批六文件）→ 0/0/0；`git diff --check` → 干净。

## 4行 ledger

| ID | 当前公开入口/守卫 | 选中差异合同 | 旧文件 + 精确 fullName | 新文件 + 精确 fullName / 分类 | 理由/调用域 | 反控 |
|---|---|---|---|---|---|---|
| C01 | `AddActorCommand`/`CopyActorCommand`/`DeleteActorCommand`/`DetachActorEntityCommand`/`UpdateActorCommand`/`SetActorBattleSpriteCommand`（actor-commands.ts，validateActors + assertActorCanBeAdded/Patch） | 空串字段左操作数恰抛；AddActor battler 战斗精灵/援护者缺席恰抛；CopyActor 无 levelUp 时 `levelUp` 同引用保留；Delete/Update/SetActor/Detach 未 apply invert 原引用；portraits previous-集合豁免/拒绝两轴 + 合法立绘放行后 undo 清回 undefined；face 同值豁免；Detach 缺场景/普通实体 no-op、二次 apply 首轮 original（含实体被改后再 detach 的区分）；undo 重占用恰抛 | actor-commands.residual.test.ts「AddActor 拒绝首尾空格 name，输入态不变」「AddActor 新 id 且 locale 缺名称键…」「AddActor 只坏 face 一轴…」「UpdateActor 只改 coveredBy 为不存在人物…」「AddEntity actor:ghost 后 DetachActorEntity → 人物不存在」；actor-commands.test.ts 13 例；commands.test.ts 114 例 | 新增十例：`C01 actor-commands 残差 AddActor：空字符串 id → 字段必须是非空字符串（整串 message）；构造期深拷贝` 等（[24,1,1] withActor miss = unreachable；旧五条 residual 的 name 空白轴等不重领，全部避开「仅换字符串」轴） | 冻结池 29 臂：三向 no-op/首轮捕获/undo 占用/引用豁免均为编辑器表单直接调用域 | actor-detach-first-capture（恰红 DetachActorEntity 二次 apply 例） |
| C02 | `UpdateSpriteCommand`/`AddSpriteCommand`/`ReplaceSpriteAssetCommand`/`AddSpriteDefinitionCommand`/`RemoveSpriteDefinitionCommand`/`DeleteUnusedSpriteAssetCommand`（sprite-commands.ts，SpriteLayoutEditProof sha 绑定） | 缺席三向 no-op；仅 label 补丁无需解码证明；证明 sha 过期恰抛 + 合法 static 布局经真实解码帧数放行；AddSprite 重复 id/AssetId 记录不同/路径被占三向恰抛；共享物理资产第二语义 createdAsset=false、undo 保留 catalog/blob；AddSpriteDefinition 真实帧数证明内成功且不触 catalog/blob、越界/过期恰抛；RemoveSpriteDefinition 三向 no-op 与原索引恢复；ReplaceSpriteAsset 守卫族与同帧数合法替换可完整 undo（旧 blob 删新 blob 写） | sprite-commands.residual.test.ts 五例（「UpdateSprite 非法预制动作 durationMs=0…」「proof.actualFrameCount 为 0…」「先合法加入预制动作，再 poses:{} 且无 currentReferences…」「DeleteUnusedSpriteAssetCommand 删除 hero 资产…」「AddSprite 缺 asset 字段…」）；commands.test.ts「UpdateSprite layout…」「UpdateSprite poses…」「AddSprite 原子加入…」；sprite-reference-commands.test.ts 四例；WorldSpriteLibrary.test.tsx/SpriteActionEditorDialog.test.tsx UI 例 | 新增十例：`C02 sprite-commands 残差 AddSprite：共享物理资产第二语义 → createdAsset=false，undo 保留 catalog/blob` 等（[28,1,1] withSprite miss = unreachable；证明 sha/帧数来自解码真值） | 消费者集合漂移、证明过期、共享资产旁记录保留为 C02 必核方向；帧数口径与既有 accepted fixture 对齐 | sprite-share-undo-overdelete（恰红共享第二语义 undo 例） |
| C03 | `AddBattleSpriteCommand`/`UpdateBattleSpriteDefinitionCommand`/`ReplaceBattleSpriteAssetCommand`/`RemoveBattleSpriteDefinitionCommand`/`DeleteUnusedBattleSpriteAssetCommand`/`SetEnemyBattleSpriteCommand`（battle-sprite-commands.ts，BattleSpriteEditProof + 真实引用索引） | UpdateBattleSprite 缺席 id/未 apply invert；仅 label 补丁无需 ABI 证明；证明过期恰抛；player-fighter→enemy 换型与 live 引用（hero.battler）不兼容守卫（真实引用索引，含运行期 where 片段）；ReplaceBattleSprite 守卫族（定义/资产不一致、缺席 catalog、证明过期、消费者漂移、无确认消费者）；Remove/DeleteUnused 三向 no-op、仍被定义引用恰抛；SetEnemyBattleSprite 缺席敌人 no-op 与成功切换+undo | battle-sprite-commands.residual.test.ts 四例（重复 id/路径占用/SetEnemy enemy profile/profile 换型无索引）；sprite-reference-commands.test.ts「battle definition removal and profile kind changes use the live canonical oracle」等四例；commands.test.ts「SetEnemyBattleSprite:只切换 enemy profile…」「Actor/Enemy 上传新定义并设置引用…」 | 新增六例：`C03 battle-sprite-commands 残差 UpdateBattleSpriteDefinition：缺席 id/未 apply invert 原引用；仅 label 补丁无需 ABI 证明` 等（旧重复 id/错误 profile 四例不重领） | ABI 编辑绑定解码证明、profile 换型 fail-loud 为 C03 必核方向 | 共用判据覆盖本文件（本批三针见 C01/C02/C04 行） |
| C04 | `AddTilesetCommand`/`RemoveTilesetCommand`/`UpdateTilesetMetadataCommand`/`ReplaceTilesetAssetCommand`（tileset-commands.ts，TilesetRemoval/ReplacementProof + CurrentMapReferenceBatchProvider） | AddTileset 缺 AssetId 恰抛、缺席表追加+invert 清空；RemoveTileset 缺席 id/缺席表 apply 原引用（守卫前短路）、共享分支后 invert 保 catalog/blob、persistedBytes 缺省不覆盖 blob；UpdateTilesetMetadata 缺席 id/缺席表/未 apply invert 原引用、旁 tileset 同引用；ReplaceTilesetAsset 缺席 asset 原引用、kind 错误/路径被占/定义不一致整串恰抛、换新路径成功的 blob 精确差值与 invert（真实字节+真实 proof 扫描） | tileset-commands.residual.test.ts 五例（重复 id/记录不同/共享 createdAsset=false/name 空白/category 空串）；tileset-lifecycle.test.ts 七例（含「删除共享定义不误删 record/blob」「共享资产缩帧先列出完整范围…」）；tileset-references.test.ts 九例；commands-wave2.tileset.test.ts barrel | 新增七例：`C04 tileset-commands 残差 AddTileset：缺 AssetId 恰抛；tilesets 缺席 → 追加成功 + invert 清空` 等（共享臂 [121,18,1]/[48,7,1] 经 residual/lifecycle 现有例触达=existing-proof，不重领） | 记录路径归属、真实 MapReferenceBatch 与替换 proof、共享旧路径保留为 C04 必核方向 | tileset-remove-shared-cascade（恰红共享分支 invert 例） |

## 负控回执（[tools](../tools/README.md) 共用判据，`node state-commands-mutants.mjs c`）

判据自测 10 例全按预期；对照跑 exit 0 全绿（33 项）；三针各自**恰 exit1、恰一红**、失败记录绝对
文件与实际 fullName 逐字匹配、AssertionError-only、生产四源 sha256 每轮复验不变、entered.json 见证：

| 针 | 生产注入 | 类别 | 恰红用例（fullName 尾段） |
|---|---|---|---|
| sprite-share-undo-overdelete | AddSpriteCommand.apply `this.createdAsset = !existing` → `= true` | 资产旁记录被删 | AddSprite：共享物理资产第二语义 |
| tileset-remove-shared-cascade | RemoveTilesetCommand.apply 共享分支 `if (nextTilesets.some(...))` → `if (false)` | 资产旁记录被删 | RemoveTileset：共享分支后 invert 保 catalog/blob |
| actor-detach-first-capture | DetachActorEntityCommand.apply `if (!this.original)` → `if (true)` | 坏undo：首轮实体快照被覆盖 | DetachActorEntity：二次 apply 保持首轮 original |

明细 JSON/日志：`/var/folders/…/type-pal-state-commands-mutants-s1gouk`（summary.json）。

## 边界与披露

- 未用资产删除、引用拒删、redo 重验等大量合同为旧 residual/lifecycle/references 测 existing-proof，未重领。
- `expectErrorContaining` 仅用于 profile 换型引用不兼容这一含运行期 where 片段的守卫消息，其余一律整串比较。
- 本批未发现产品疑似缺陷；C03 本批无独立针（每批 2–3 针约束下由 C01/C02/C04 三针覆盖）。
- 视觉 N/A；作者自验不替代 Codex 独立验收；不合 main、不标 done。
