# GLM 战场命令族拆分候选回执（ARCH-F2-EDITOR-BATTLE-FIELD-COMMANDS-1）

任务卡：[ARCH-F2-EDITOR-BATTLE-FIELD-COMMANDS-1](../ops/tasks/ARCH-F2-EDITOR-BATTLE-FIELD-COMMANDS-1.md)。
状态：**候选，未合 main，未 done**；等待 Codex 独立复核。本卡与 ARCH-REGRESSION-LAB 候选的
Codex counter 无关，该包未用于本卡自验。

- 分支：`codex/glm-arch-battle-field-commands-r1`（独立 worktree `/Users/zhangxu/illegal/type-pal-glm-battle-field-commands`）
- 生产冻结 / 基点：`f5f166aaf7291cb15eb0046e09819f0d6c99cc61`（2026-09-26 实际 fetch 后的 origin/main；任务卡写作时的 620a29dd 已被 fast-forward 覆盖，本基点为其后代）
- Coding Owner：GLM；Review/Integration Owner：Codex

## 改动（白名单内）

| 文件 | 变更 |
|---|---|
| `packages/editor/src/core/battle-field-commands.ts` | 新建，222 行。承接 `withBattleField`、表快照（capture/restore/append）、`BATTLE_FIELDS_PATH`、`nextBattleFieldId`、四命令、`BattleFieldInUseError`、`BattleFieldPatch` |
| `packages/editor/src/core/commands.ts` | 删除战场族实现（原 2185–2387），原位改为 re-export 同一批公开符号；移除 `BattleFieldDef`/`DEFAULT_BATTLE_FIELD_ID`/`validateBattleFields` 三个因此不再使用的 import |
| `packages/editor/src/core/battle-field-commands.test.ts` | 新建同证测试 6 条（身份 + 行为，见下） |
| `docs/testing/glm-arch-battle-field-commands.md`、`docs/testing/README.md` | 本回执与一条索引 |

`git diff --name-status`（最终树）：

```text
M	packages/editor/src/core/commands.ts
```

另新增两个未跟踪文件（上表前两行外的两个新文件）。合计 commands.ts 13 insertions / 206 deletions；
无其它任何文件改动。`packages/content`、`reforge`、`main/App/MapMode/ScriptEditor`、schema/SAVE8、
资产/生成工程、公共配置、覆盖基线全部未触碰；无新增 `await`、副作用或状态采样时点变化。

## 保真证据

**逐字节搬移**：`sed -n '2185,2387p'`（origin/main 版本）与新模块函数体区段 `diff` 为空
（"BODY STILL BYTE-IDENTICAL"，Biome import 排序修复后复核仍一致）。

**出口集合前后对照**（TS 编译器 API 解析 export 声明）：

```text
commands.ts export count: old = 119 | new union(commands + battle-field-commands) = 119
in old but NOT in new union: []
in new union but NOT in old: []
battle-field-commands.ts public exports: AddBattleFieldCommand, BATTLE_FIELDS_PATH, BattleFieldInUseError,
  BattleFieldPatch, CopyBattleFieldCommand, DeleteBattleFieldCommand, UpdateBattleFieldCommand, nextBattleFieldId
family defined in bfc and re-exported by commands.ts: true
```

**运行期 import 图**（type-only 剔除；`export … from` 计运行期边；上表经脚本复核，
`export type` 不计）：

```text
commands.ts              -> ./map-patch.js, ./project-reference.js, ./project-reference-adapters.js,
                            ./stamp-lifecycle.js, ./stamp-ownership.js, ./tileset-references.js,
                            ./battle-field-commands.js   (re-export)
battle-field-commands.ts -> ./project-reference-adapters.js
edit-session.ts          -> ./editor-history-participant.js, ./map-reference-facts.js, ./commands.js (既有 MoveEntityCommand re-export，非本次引入)
project-reference-adapters.ts -> actor/battle-data/editor-asset/entity-address/item/world-variable-references,
                                 project-reference, script-editor, script-editor-projection
```

新模块对 `Command`/`EditorState`/`ProjectReferenceEdge` 仅 type import（编译期擦除）；对
adapters 的运行期依赖是 commands.ts 原本就有的边的子集，故唯一新增运行期边是
`commands → battle-field-commands`，无新环。adapters 子图按全仓 grep 无任何运行期
`from './commands.js'` 回边（core 内 commands.js 的运行期消费者只有 item-alchemy 与
edit-session 的既有 MoveEntityCommand re-export，均不在该子图）。运行期行为旁证：
新模块在 vitest 独立加载（不 import commands.js）可构造命令；两模块在 vitest 同图加载下
七个公开符号 `===` 全等、`BATTLE_FIELDS_PATH` 与 `BattleFieldInUseError.name` 正确。
（说明：tsx/node 直载 commands.ts 不可行，因 reforge 既有 `import.meta.glob` 是 Vite
宿主能力，与本次改动无关，故运行期取证经 vitest 真实模块图完成。）

## 验证序列与计数

命令均在 `packages/editor` 下执行（`pnpm exec vitest run` / `pnpm typecheck`）， Biome 在仓根执行：

| 时点 | 命令 | 结果 |
|---|---|---|
| 拆分前基线 | `vitest run src/core/commands.test.ts -t "D24"` | 8 passed / 106 skipped |
| 拆分前基线 | `vitest run src/core/commands.test.ts` | 114 passed |
| 拆分后 | 同上 + `battle-field-commands.test.ts` | 120 passed（114 旧断言原样 + 6 新） |
| 拆分后相邻 | `commands.test.ts` + `battle-field-commands.test.ts` + `ui/BattleFieldTab.test.tsx` + `core/project-diagnostics.test.ts` | 4 files, **156 passed** |
| typecheck | `pnpm typecheck`（tsc --noEmit） | exit 0 |
| Biome | `biome check` 三个改动文件 | exit 0（首轮 3 处可自动修复：test 文件 format + 两处 organizeImports，`--write` 后复核为 0） |

拆分前记录的 D24 子集标题（8 条，拆后全绿且未删改迁就）：

```text
D24 战场命令(不可变 + invert) > UpdateBattleField:patch name/magicEffect,invert 还原;源不变
D24 战场命令(不可变 + invert) > first-create 原子登记 manifest，undo 精确恢复整个表与路径
D24 战场命令(不可变 + invert) > 新建/复制拒绝 id 冲突，复制共享资源引用且整体可逆
D24 战场命令(不可变 + invert) > 未引用条目可删，删最后一项保留已声明空表；undo 恢复原位
D24 战场命令(不可变 + invert) > 系统默认、场景默认、hostile 与嵌套 startBattle 都会阻断删除
D24 战场命令(不可变 + invert) > DeleteBattleField 在 apply 时读取 live canonical 精确引用
D24 战场命令(不可变 + invert) > DeleteBattleField 缺目标跳过 oracle，失败零写，redo 重验最新引用
D24 战场命令(不可变 + invert) > UpdateBattleField 在命令边界拒绝非法五行结构
```

## 同证测试（新增文件内容概要）

`battle-field-commands.test.ts` 6 条，不重复 D24 完整矩阵，只锁「搬移不改行为」：

1. 旧入口与新模块七个公开符号同一绑定（`toBe`）。
2. `instanceof` 双向可识别（旧入口实例 vs 新模块类，反之亦然）。
3. first-create 原子登记 + undo 精确还原；**构造后篡改输入不影响命令**（深保真）。
4. update patch/invert 还原、源不变；构造后篡改 patch 不影响命令；非法五行边界拒绝。
5. 复制共享资源引用、整体可逆、id 冲突拒绝。
6. 未引用可删、删空保留已声明空表、undo 原位还原；系统默认字段删除阻断，且错误经旧入口
   `BattleFieldInUseError` 同样 `instanceof` 可辨。

## 隔离反控（不入仓，运行取证后已删除）

两反控均以 `vi.mock('./battle-field-commands.js', importOriginal)` 注入破损实现（零生产文件
改动；re-export 链使旧入口同样拿到坏实现，证明现行 `commands.test.ts` 会红），各自以
「注入后现行合同断言必须失败」为通过条件：

- **反控 A（删除 blocker 可红）**：注入跳过 `collectCurrentProjectDeletionImpact` 的
  `DeleteBattleFieldCommand` → 现行断言形态
  `expect(() => delete.apply(state)).toThrow(BattleFieldInUseError)` 失败（AssertionError:
  promise resolved…），默认字段 24 在返回态被静默删除 → 阻断回归可被现行测试捕获。✅
- **反控 B（undo/还原可红）**：注入 `invert` 恒等返回的 `AddBattleFieldCommand`（apply 保持
  原样以隔离单一变量）→ 现行断言形态 `back.battleFields` 为 undefined、`back.manifest`
  还原，两者失败 → undo 回归可被现行测试捕获。✅

反控文件 `__isolation-control-{A,B}.test.ts` 已删除，不在提交内。

## 可证伪观察兑现情况

卡面列出的翻船观察逐项核对：无运行期 import 环（上图 + 独立加载 + 全图测试通过）；旧入口
`instanceof` 身份不变（`toBe`/双向 instanceof 同证）；首次 apply/invert 保真与删除阻断轨迹
不变（逐字节搬移 + 156/156 + 反控证明现行断言对回归敏感）。未发现需要停线 counter 的情形；
重构过程中未发现需另报的产品缺陷。

## 边界声明

- 本回执不更新任何官方覆盖率基线/计数；不宣称行数减少为收益。
- 不合 main、不标 done；Codex 接收后统一串行全仓 check→ratchet→受保护 strict-fast 与最小功能核验。
