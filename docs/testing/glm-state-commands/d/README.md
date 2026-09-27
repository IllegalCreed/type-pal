# D批：工程定义命令

状态：GLM 已实施（2026-09-27）。范围D01–D04，见[工作包](../README.md)与[冻结账](../targets.freeze.json)。
合法种子形状取自 shop-lifecycle / world-variable-commands 现行测试；删除一律 `realRefs`
（`collectCurrentProjectReferenceIndex` 真实当前引用索引，恒不 mock 恒空）。

## 命令与 exit（新鲜 JSON）

- 定向四文件：`env -u NODE_COMPILE_CACHE pnpm exec vitest run src/core/{shop,ambience,battle-field,world-variable}-commands.glm-boundaries.test.ts`（cwd packages/editor）→ **22/22 exit 0**，JSON `/tmp/batch-d-directed.json`。
- 相邻六文件（shop-lifecycle、project-io、battle-field-commands.test、commands-world.boundaries、world-variable-commands.test、commands.test）→ **142/142 exit 0**。
- editor `tsc --noEmit` → 零诊断；Biome（本批六文件）→ 0/0/0；docs PASS；`git diff --check` → 干净。

## 4行 ledger

| ID | 当前公开入口/守卫 | 选中差异合同 | 旧文件 + 精确 fullName | 新文件 + 精确 fullName / 分类 | 理由/调用域 | 反控 |
|---|---|---|---|---|---|---|
| D01 | `nextShopId`/`UpdateShopCommand`/`AddShopCommand`/`DuplicateShopCommand`/`DeleteShopCommand`（shop-commands.ts，validateShops 守卫） | UpdateShop 缺席 id/缺席表三向 no-op 与旁店铺同引用、二次 apply 首轮旧货单、未 apply invert 原引用；AddShop shops 缺席首次 manifest 登记、undo 原引用还原、undo→再 apply 保持首轮 manifest；DuplicateShop 来源缺席整串恰抛、未 apply invert 原引用；DeleteShop 缺席 id/未 apply invert 原引用 | shop-lifecycle.test.ts「keeps shop constructors on the old commands barrel and guards nextShopId overflow」「first shop0 registers persistence path, add undo/redo and invalid identities」「copy snapshots occurrences and fixed identity; redo survives changed or deleted source」「delete restores original occurrence/order…」「provider failure and a live unsaved buy never authorize deletion」；project-io.test.ts「shop create/copy/stock/delete save and reopen…」 | 新增六例：`D01 shop-commands 残差 UpdateShop：缺席 id 与缺席表 apply 原引用；未 apply invert 原引用` 等（创建/copy/删除 happy 与 manifest 登记为 existing-proof 不重领） | 货单 update/copy/删除与首登 manifest 为 D01 必核方向 | shop-update-first-capture（恰红 UpdateShop 二次 apply 例） |
| D02 | `UpdateAmbienceCommand`/`AddAmbienceCommand`/`DeleteAmbienceCommand`（ambience-commands.ts，真实引用索引阻断） | UpdateAmbience 缺席表/缺席 id/未 apply invert 三向原引用、二次 apply 首轮 oldPatch；AddAmbience 缺席表追加+invert 清空、未添加 invert 原引用；DeleteAmbience 缺席表 apply 原引用、未 apply invert 原引用、二次 apply 首轮快照原索引、undo 重占用整串恰抛、缺席表 invert 仍插回 | commands.test.ts「UpdateAmbience:调乘色,invert 还原;源不变」「AddAmbience:追加恒等白;invert 移除;重复 id 不动」「DeleteAmbience:零引用时删除;invert 按原索引恢复且源不变」「DeleteAmbience:脚本显式引用、昼夜隐式引用和运行态引用均阻断且不改源」「DeleteAmbience:删除时重读独立脚本会话并阻断尚未投影的引用」「DeleteAmbience:缺目标跳过 oracle，失败零写，redo 重验最新引用」；AmbienceTab.test.tsx 15 例 | 新增五例：`D02 ambience-commands 残差 UpdateAmbience：缺席表与缺席 id apply 原引用；未 apply invert 原引用` 等 | 合法 tint/定义更新、重复/缺席、首轮旧值、删后 id 重占用、缺席表插回为 D02 必核方向 | ambience-undo-occupied-silent（恰红 undo 重占用例） |
| D03 | `BATTLE_FIELDS_PATH`/`nextBattleFieldId`/`AddBattleFieldCommand`/`CopyBattleFieldCommand`/`DeleteBattleFieldCommand`/`UpdateBattleFieldCommand`（battle-field-commands.ts，validateBattleFields + 表快照原子 undo） | nextBattleFieldId 空表默认值与溢出整串恰抛；Add 未 apply invert 原引用、缺席表首次创建 manifest 原子登记+undo 完整还原；Copy 来源缺席整串恰抛、未 apply invert 原引用；Delete 缺席 id/缺席表 apply 原引用、未 apply invert 原引用；Update 缺席 id 原引用、二次 apply 首轮 oldPatch、可选键 undefined 删键与精确还原、undo 时字段消失原引用 | battle-field-commands.test.ts「四命令、BattleFieldInUseError、nextBattleFieldId、BATTLE_FIELDS_PATH 同一构造器/值」「instanceof 双向可识别…」「first-create 原子登记 manifest + undo 精确还原;构造后改输入不影响命令(深保真)」「update patch/invert 还原、源不变;构造后改 patch 不影响命令;非法五行在边界拒绝」「复制共享资源引用且整体可逆,id 冲突拒绝」「未引用可删、删空保留已声明空表、undo 原位还原;系统默认字段删除被阻断」；commands.test.ts「UpdateBattleField:patch name/magicEffect…」 | 新增六例：`D03 battle-field-commands 残差 nextBattleFieldId：空表 → DEFAULT_BATTLE_FIELD_ID；溢出整串恰抛` 等（F2 已拆分的身份与默认表 happy path 不重领） | 当前定义/稳定数值 id、manifest 原子登记、可选字段清除为 D03 必核方向 | battlefield-undefined-delete-drop（恰红 undefined 删键例） |
| D04 | `WorldVariableInUseError`/`AddWorldVariableCommand`/`UpdateWorldVariableCommand`/`DeleteWorldVariableCommand`（world-variable-commands.ts，validateWorldVariableRegistryV1 + 真实引用索引） | Add/Update/Delete 在 worldVariables 缺席表下的注册/插回（`?? {}` 回退臂）；Update 缺席 id 原引用、二次 apply 首轮 previous、undo 时变量缺席表仅插回该键；Delete 二次 apply 首轮快照往返一致、未 apply invert 原引用、缺席表插回 | world-variable-commands.test.ts 六例（「keeps world-variable constructors…」「create and metadata update participate in undo/redo…」「identical updates are no-ops…」「delete blocks every referenced definition and keeps zero-reference deletion undoable」「DeleteWorldVariable 在动作边界读取 current canonical…」「delete redo rechecks newly added canonical references…」）；commands-world.boundaries.test.ts 六例（重复 id 幂等、零值保真、缺目标 no-op、invert 占用拒绝、删后往返深快照） | 新增五例：`D04 world-variable-commands 残差 Add：worldVariables 缺席 → 注册成功；invert 清回空表` 等（同值 no-op/引用阻断/占用拒绝/redo 重验为 existing-proof 不重领；不新增系统全局槽或旧版本 fallback） | 当前 registry 守卫、同值 no-op、真实脚本引用/解除、删除 undo 碰撞为 D04 必核方向 | 共用判据覆盖本文件（本批三针见 D01/D02/D03 行） |

## 负控回执（[tools](../tools/README.md) 共用判据，`node state-commands-mutants.mjs d`）

判据自测 10 例全按预期；对照跑 exit 0 全绿（22 项）；三针各自**恰 exit1、恰一红**、失败记录绝对
文件与实际 fullName 逐字匹配、AssertionError-only、生产四源 sha256 每轮复验不变、entered.json 见证：

| 针 | 生产注入 | 类别 | 恰红用例（fullName 尾段） |
|---|---|---|---|
| shop-update-first-capture | UpdateShopCommand.apply `if (!this.captured)` → `if (true)` | 坏undo：首轮旧货单被覆盖 | UpdateShop：二次 apply 保持首轮旧货单 |
| ambience-undo-occupied-silent | DeleteAmbienceCommand.invert 占用 throw → `void 0` | 坏undo：undo 重占用 fail-loud 被静默吞掉 | DeleteAmbience：undo 时 id 已被占用恰抛 |
| battlefield-undefined-delete-drop | UpdateBattleFieldCommand.apply 删键循环 `if (v === undefined) delete next[k]` → `if (false) void k` | 输入污染：可选键 undefined 残留 | UpdateBattleField：…可选键 undefined 删键与还原 |

明细 JSON/日志：`/var/folders/…/type-pal-state-commands-mutants-b0xu79`（summary.json）。

## 边界与披露

- 引用阻断、provider 失败零写、redo 重验、同值 no-op、重复 id 幂等等为旧测 existing-proof，未重领。
- `AddShopCommand` 无重复 id 守卫（重复 apply 同一状态会被 validateShops 拒绝），与本批缺席表/undo
  往返合同不冲突，按现状钉死；未发现产品疑似缺陷。
- D04 本批无独立针（每批 2–3 针约束下由 D01/D02/D03 三针覆盖）。
- 视觉 N/A；作者自验不替代 Codex 独立验收；不合 main、不标 done。
