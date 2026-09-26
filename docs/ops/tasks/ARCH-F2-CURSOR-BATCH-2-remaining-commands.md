# ARCH-F2-CURSOR-BATCH-2 — 剩余九组编辑命令模块整理

Status: rework
Owner: Cursor
Reviewer / Integration Owner: Codex
Phase: phase2
Visual Verification Timing: dev-functional（Codex集成时最小核验；无新UI）
Production Base: `51048353fc3bde5a3e6bf50653786b905fd2857d`
Branch: `codex/cursor-commands-wave2`
Worktree: `/Users/zhangxu/illegal/type-pal-cursor-commands-wave2`

实际起点记录为包含本卡的最新main SHA。51048353冻结的是本卡editor目标正文；Codex同期获准的Reforge变化
不归Cursor差异，不得回退。白名单以实际开工提交→候选核对；目标声明仍对51048353做搬迁对照。

## 目标与前提

在当前119个commands出口不变的前提下，将剩余命令归到领域模块；只改内部依赖归属，不改apply/invert正文、
构造时/首次apply时的输入采样、异常、引用门与undo/redo。不是重写资产管线或调整保存格式。
Codex于2026-09-26独立读当前`commands.ts`，确认剩余类与下表边界，用户明确要求再委派一批。

一手来源：`packages/editor/src/core/commands.ts:108/:123/:174/:226/:434/:585/:855/:1171/:1408/:1566/:1955/:2107/:2731`。
第一阶段/原版N/A：本包是二阶段作者命令内部组织，不以旧引擎接口为目标；当前二阶段源码、既有命令测试为合同。
before→after：同一编辑输入、返回对象/引用、历史与错误不变，只改变模块归属。最强替代解释是共享helper迫使反向依赖；
若拆后出现新runtime SCC或新模块回引commands barrel，说明边界不成立，应在内部下层拆helper而非增加万能Context。

必读：AGENTS/CLAUDE/READ-FIRST、[治理台账](../audits/architecture-debt.md)、
[前批验收](../../testing/cursor-architecture-batch-integration.md)、`command-contract.ts`、`edit-session.ts`。
不复活旧schema/旧入口，旧有fallback是否有问题另登记，不借机械拆分偷偷删除或“修好”。

## 九组顺序（连续完成，不逐组等批准）

| ID | 冻结源码范围/符号 | 目标模块与重点 |
|---|---|---|
| C1 | :108 CompositeCommand；:174–224 五个scene/entity不可变helper | composite-command.ts、command-scene-state.ts；倒序invert与旁支同引用 |
| C2 | :226–432 Move/Add/Delete/UpdateEntity、EntityPatch；:2064 SetEntitySprite | entity-commands.ts；首次成功捕获、zone分支、删除引用保护 |
| C3 | :434–583 UpdateScene/UpsertSceneEntry/DeleteSceneEntry；:2107–2273 scene CRUD | scene-commands.ts；ScenePatch/SceneEntryInUseError/SceneInUseError原身份与引用门 |
| C4 | :585–854 map catalog helpers、Create/Duplicate/Rename/Bind/DeleteMap、CreateProjectMap | map-asset-commands.ts；稳定id、首次捕获、目录manifest回滚 |
| C5 | :855–1170 PaintTiles/Collision、ApplyProjectMapPatch、四层命令、Resize | map-edit-commands.ts；权限快照与prepared patch保真，不改map-patch算法 |
| C6 | :1171–1407 tileset四类；:136 assertTilesetRecord | tileset-commands.ts；generation/proof/旧字节恢复 |
| C7 | :1408–1565 sprite helper/Update；:2396–2730 sprite导入/替换/定义/清理 | sprite-commands.ts；保留帧需求/proof/当前引用重验 |
| C8 | :1566–1893 actor helper/六命令；:3123 SetActorBattleSprite | actor-commands.ts；覆盖/装备/成长表/形象字段守卫，不扩字段 |
| C9 | :1955–2063 asset CRUD；:2274–2395 manifest/startup；:2731–3122 battle sprite族 | asset-commands.ts、startup-commands.ts、battle-sprite-commands.ts；共享record helper可下沉command-asset-record.ts |

行号仅冻结定位，实施按完整AST声明搬迁。`SetEnemyBattleSpriteCommand`归battle-sprite模块；既有enemy模块保持零语义改动。
跨组需要helper直接导入下层；不从commands反导入、不复制相同helper、不扩旧barrel出口。

## 白名单

- 产品：`packages/editor/src/core/commands.ts`及上表明确命名的13个新模块。其他既有命令/生产模块零diff。
- 测试：最多每目标域一个新`packages/editor/src/core/commands-wave2.<域>.test.ts`；共享fixture仅
  `packages/editor/src/core/__tests__/commands-wave2/`。既有测试仅源码路径绑定确受移动影响时机械适配，逐处说明，旧断言零改。
- 证据：`docs/testing/cursor-commands-wave2/**`与本卡作者交付块。不改看板/索引/其它卡，由Codex维护。
- 禁止修改App/MapMode/UI/CSS、content/reforge产品、保存/迁移/项目资产、package配置、超时、coverage基线与范围。

## 验收与交付

1. 先C1/C2小样，核出口集合/声明token正文/新模块运行期图，再继续九组。允许仅import/export及必要类型归属变化，
   每个非机械差异单列。无需凑新增测试数；直接复用有精确title/file的旧业务证据，禁止复制断言冲量。
2. 正控fixture须当前typed模型且先过生产guard；对实际传入state取structuredClone后比较，同样覆盖非空旁支/undo/redo。
   九组各至少一条明确业务回归或精确已有证据；批末3–5个代表单点反控即可，不复制九套判据框架。
3. 开发定向/相邻/TC；最终整包一次editor check、改动Biome、docs、diff。`env -u NODE_COMPILE_CACHE`；
   不跑全仓check/ratchet/strict，不占6010，不触用户工程。依赖用自身worktree，资产只作gitignored环境补齐。
4. 反控复用前批真实判据：唯一注入命中、目标绝对file+fullName、恰exit1、候选自身AssertionError；拒timeout/混错/零执行。
   工具输出写/tmp，源hash前后相同。测试与实现冲突只登记具体阻断，不改业务预期凑绿。
5. 各领域一提交、同分支连续推进，最终一份九行回执+机器结果、真实SHA与可复制命令；无截图/资产/大JSON日志入仓。
   截断一组时其余可继续，整包交Codex。Codex独立接收后负责最小UI、统一全仓门与覆盖率、集成和清理。

## 推进记录

- Codex：premise verified / build allowed，2026-09-26；源码范围与Codex的reforge活动场景、GLM的content测试互斥。
- Coding Owner：Cursor；贡献者自验与Codex独立验收分列。
- 作者交付：候选b2e8d712已收到；[原作者回执](https://github.com/IllegalCreed/type-pal/blob/b2e8d712cacad8253fbbe9aaf2225753d6d9de80/docs/testing/cursor-commands-wave2.md)留在候选，未改其正文。
- Codex验收：产品九组搬移核验通过；整包counter，仅R1–R3工具/一个fixture/回执收尾。见[独立复核](../../testing/cursor-commands-wave2-review.md)及[机账](../../testing/cursor-commands-wave2-review-evidence.json)。done未开放，不需要Kimi/GLM固定签字。

## Codex接收日志（2026-09-26）

119出口、90声明正文、62运行期绑定和无新环事实已独立通过；editor2829/2829与TC、五针真实业务红均通过。
判据会误收四类坏报告；新增C1的空强转fixture及回执位置/doc门须窄修。不改候选生产正文，不重做九组。
未合main、未跑官方覆盖率，保持8232/688；保留分支与worktree用于返工。原有作者块由其分支保留，不代签。

## 下一位 Cursor 窄返工提示词

```text
在原codex/cursor-commands-wave2窄返工ARCH-F2-CURSOR-BATCH-2，候选b2e8d712。
fetch后先git show origin/main:docs/testing/cursor-commands-wave2-review.md，状态rework，只修R1–R3。
产品九组、90声明/119出口/62绑定/无环、2829全包与五针本次有效红已核；不重做、不改产品或旧断言。
R1：实际judge拒同message混错、timed out、额外执行失败、suite/global错误；绿红均校验完整报告，
自测走同一真实judge并包含本席四反例与合法对照；默认输出只进/tmp，不回写已跟踪JSON。
R2：commands-wave2.composite.test.ts的空EditorState强转改合法typed输入并先过现行构造/guard，
对实际输入快照，保留原执行顺序断言。只修这一新例，不清理历史fixture，不造大矩阵。
R3：回执移入专属目录receipt.md，校准目录README、卡面和内部相对链接；docs check必须通过。
不动父索引/看板/配置/基线，不改Codex审计工具；提交推送准确SHA，不合main、不标done。
Codex负责后续独立复验、必要UI、统一全仓门与集成；不用重新跑整组覆盖率。
```

## 下一位 Cursor 提示词

```text
接手ARCH-F2-CURSOR-BATCH-2，先读本卡、AGENTS/CLAUDE/READ-FIRST及前批验收。
从包含本卡的origin/main新建独立worktree type-pal-cursor-commands-wave2，分支codex/cursor-commands-wave2。
生产冻结51048353；按C1–C9连续实施，允许卡内commands与13个新模块，旧正文/119出口/异常/采样/undo保真。
先C1/C2小样后继续，不等待三签。不改UI、其它产品/格式/配置/基线。复用真实旧回归，缺口才补测。
交声明/出口/运行期依赖对账、九组业务证据、3–5个严格单点反控、一次editor check/TC/Biome/docs/diff。
每组提交，整包推送；只写本卡交付区及专属证据目录，不合main、不标done、不跑官方覆盖率。
Codex负责独立验收和集成；遇到非机械行为冲突只阻断该组，给直接反证，继续其他组。
```
