# TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1 — Item use effect residual contracts

Status: done（2026-10-11 Codex 独立验收 accept）
Owner: GLM（贡献者）；验收：Codex
Base/source freeze: `9aa3bed892728f17c70d2f86d1fe07db10a718b8`（工作基 `38408cb82`，仅多三张 dispatch 任务卡）
Branch: `codex/glm-editor-item-effect-residual-r1`；候选提交 `ce2d9cb0b`（测试）+ 证据/本卡提交
White-list: `packages/editor/src/ui/ItemUseEffectEditor.residual.glm.test.tsx` and this card/evidence only.

## Finite scope

Read `ItemUseEffectEditor.test.tsx`, `ItemUseEffectEditor.glm-m.test.tsx`, `ItemUseEffectEditor.kimi-workflows.test.tsx`, archived alchemy cards, and current `codex-review.md` before selecting contracts. Only investigate legal public UI paths still unproved after the accepted alchemy batch: failure/repair behavior for a real scene/entity reference, non-consuming resource-pool/craft reference absence and recovery, or an effect-kind transition whose submitted schema is not already covered. Do not repeat default-value enumeration, ordinary add/reorder/undo, existing poison/status/script/throw contracts, or withdrawn fake-parent B5/B10 windows.

Each retained/new contract gets source:line, public caller, legal fixture, old fullName/actual assertion, exact oracle, and keep/merge/unreachable/blocked/product-counter decision. Use real `ItemTab`/session callers and schema-valid typed fixtures; no casts, private state, core mocks, skip/ignore, timeout changes, or product/config edits. Counterproof must be complete three-state native evidence, exact cleanup/hashes. Zero-new-contract is valid.

## 候选登记与裁决（逐项）

排重底账先读：base `ItemUseEffectEditor.test.tsx`、`glm-ui-wave`（U1c）、`kimi-workflows`（K10）、
`glm-m`（M02）、`entity-address-references.test.ts`、已接收 `ItemAlchemyTab.boundary-contracts`
（B 批）与 `docs/ops/evidence/TEST-CONTRACT-BATCH-20261008/codex-review.md` 裁决。

### 保留（3 新合同，全部真实 ItemTab caller + 真实 loader 场景）

| # | 合同 | source:line | caller | 输入 | 旧证明 | oracle | 裁决 |
|---|---|---|---|---|---|---|---|
| R1 | 场景有效而实体引用失效：⚠ 实体选项保留、场景名经 sceneIndex 解析且场景轴无 ⚠、同场景改选实体修复、修复前后编辑器保存门红/绿极性翻转、单命令可撤销 | `ItemUseEffectEditor.tsx:813-833`（实体选择 ⚠ 臂+改选修复）、`project-diagnostics.ts:866-876`（保存门 `collectMissingEntityAddressReferences`）；真值核：`checkEntityAddress` 只查形状（`author-script-core.ts:421-426`），loader 接受失效地址（本卡 probe 实证） | 真实 `ItemTab`（`ItemTab.tsx:1855-1872` 传 scenes/sceneIndex/patchUse） | 作者文件种子：scene-res(e1,e2) + item `placeEntityInFront target={scene-res, ghost-e}` | base:526（双失效 ⚠ + 切场景修复，useState 回调层、无 sceneIndex、未触保存门）；core collector existing-proof `entity-address-references.test.ts:167-216` | UI 触发显示断言 + `UpdateItemCommand` 后 spec 深比较（entity=e2）+ `assertProjectSaveValid` 红→绿→红（undo 复原） + historyVersion 单命令 | keep |
| R3 | healHp 转入 placeEntityInFront：默认目标跳过 index 首位无实体场景（'start'）取首个有实体场景（scene-res/e1）、完整 schema（state 2 + 默认提示）单命令落库、target→scene 联动、保存门通过、undo 还原 | `ItemUseEffectEditor.tsx:276-286`（默认目标挑首个有实体场景）、`945-957`（changeKind 独占）、`906-932`（target 联动） | 同上（类型选择组合框 `效果 1 类型`） | 同 R1 场景种子 + healHp 单效果物品 | base:147（纯默认值，首场景即有实体，未证跳空）；塌缩/联动机制 base:394 + U1c:153 existing-proof | spec 深比较（scene-res/e1/state2/message）+ historyVersion +1 + 保存门 + undo 深还原 | keep（不重复证塌缩/联动机制，聚焦跳空与提交 schema） |
| R5 | 项目无可放置实体：类型选项经独占绕过仍提供“把场景实体放到玩家面前”，选择失败经公开 `onStatusNotice` 精确报错且零提交 | `ItemUseEffectEditor.tsx:962`（EXCLUSIVE 先于 try 直通）、`954-956`（catch→onError）、`279`（抛点）；公开出口 `ItemTab.tsx:1210-1213` | 同上（类型选择 + notice sink） | blank 项目（唯一场景 'start' 无实体）+ healHp 物品 | 无（该失败臂从未被证；base:226 只证纯函数 throw） | notices 深比较恰一条精确消息 + historyVersion 零漂移 + spec 不变 + 保存门仍绿 | keep |

### 裁决为不新增（含理由）

| 候选 | 轴 | 裁决 | 理由 |
|---|---|---|---|
| 资源池/配方引用缺失与恢复（本编辑器内） | 轴 2 | zero-new | 本编辑器对 `craftRecipe`/`drawFromResourcePool` 是只读镜像（摘要 + 精确跳转 + 禁删/禁排），引用缺失的呈现与恢复全在机制页：B2 深链已删空态、B4 缺失集合去重 + 不自动修复、B7 公开补材料恢复、旧 `ItemAlchemyTab.test.tsx:731` 灵葫奖励缺引用明示；镜像侧 base:246 已证摘要/跳转/禁删。`effect.resource`/`rewards[].itemId` 在保存门只查形状（`validate.ts:972-993`），失效域修复责任在机制页，不在本编辑器新增可观察行为 |
| placeEntityInFront `state=0`（allowZero 臂）与 `unavailableMessage` 清空删键 | 不在三轴内 | drop | allowZero→0 是薄钳制臂；清空删键语义已由 B6（crafting 提示）与 glm-m（灵葫提示）在会话层证明，此处为同 DsDraftTextField 语义换字段（换包装不算新合同）；且非本卡三轴 |
| runSceneHook 提示字段提交/清空 | 不在三轴内 | drop | 同上：键删除语义 existing-proof；runSceneHook 默认形态已由 K10:299 落库 |
| gate/scaleCurrentHp/levelUp/applyStatus/removeStatus/healMp 等转入默认值 | 轴 3 | drop | 纯默认值已被 base:147 全枚举证明；经 UI 再落一次属任务卡明令禁止的 default-value enumeration；无新增 schema 后果（无独占塌缩/目标联动/引用差异） |
| runScript 无脚本失败臂 | 轴 3 邻域 | drop（登记） | 与 R5 同一 catch 机制（`changeKind` catch→onError），仅 throw 点不同（`firstScript`:205-209）；换包装不算新合同 |
| 无实体场景时 placeEntityInFront 从“添加效果”路径的缺席 | 轴 1 | drop（被 R5 覆盖更优） | `firstAppendableKind`（:970-978）对抛错 kind 跳过 → 选项缺席是静默过滤；R5 证的是更强的“选项在场+失败可见”臂 |

### product-counter 登记（不写绿测试、不夹修产品）

| 编号 | 发现 | 证据 | 建议 |
|---|---|---|---|
| P1 | 状态选择器允许选“傀儡”（puppet）且 UI 不自动补 `battleOnly`，提交的 spec 到保存门才被拒（`validate.ts:1238-1244` 傀儡必须 battleOnly）；对照 `patchEffects` 对 hideParty 有自动 `battleOnly:true` 联动（`ItemUseEffectEditor.tsx:918-924`），puppet 无对称处理，编辑期零提示 | `ItemUseEffectEditor.tsx:47-57`（STATUSES 含傀儡）+ `content/src/item.ts:234-235`（applyStatus: battle 恒真 → 链兼容不拦）+ `validate.ts:1238-1244`；`validate.test.ts:785` 已证内容层规则 | 交 Codex/用户裁决：puppet 选中时自动开 battleOnly 或编辑期提示；本卡不修产品不固化现状 |

## 前提真值记录（本卡为测试审计包，无产品行为改动）

- 失效实体地址：content schema 形状合法（`checkEntityAddress` 只查非空字符串）；真实 loader 可装载（本卡 probe 实证）；编辑器保存门 `collectMissingEntityAddressReferences` 拒绝。R1 以此极性为 oracle，不虚构“失效引用静默合法”。
- 场景实体 sprite 必须在 sprites 注册表（`validate-refs.ts:1474-1479` error 级）——夹具用 blank 项目注册的 `hero`（cov85 同源），不自造未注册 sprite。
- 独占/场景效果集合与保存门规则（`validate.ts:1222-1231/1249-1281`）与编辑器 `EXCLUSIVE_EFFECTS`/`SCENE_EFFECTS`（:82-94）一致，R3/R5 夹具满足唯一性/scene 目标约束。

## Verification（GLM 自测）

- 定向：`vitest run src/ui/ItemUseEffectEditor.residual.glm.test.tsx` 3/3（worktree `/private/tmp/tp-item-effect-residual`）。
- 相邻：ItemUseEffectEditor 全家 5 文件 + ItemTab 全家 4 文件 + ItemAlchemyTab.boundary-contracts = 10 文件 75/75。
- 反控三态：green0/N1/N2/N3/green2/replay-n1 全 VALID；每针恰一指定业务 AssertionError、产品 sha 精确还原、判据自证 5/5；证据见 [evidence/TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1](../../../evidence/TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1/README.md)。
- editor 全包：串行 `vitest run --no-file-parallelism` 628 文件 4933 测试 = 4932 过 + 1 既有失败（`number-field-adoption.test.ts` 的 `command-form-controls.tsx@Num: expected 37 to be 39`；基提交 `38408cb82` 单文件复现同一断言，登记件 [preexisting-adoption-gate-base.txt](../../../evidence/TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1/preexisting-adoption-gate-base.txt)，非本卡引入、不在白名单内不修）。首次全包曾与反控针相位并行（不合规），串行重跑后结论以本次为准。
- typecheck `@type-pal/editor` 通过；biome 定向 0 诊断；全仓 `pnpm lint` 0/0/0（3964 文件）。
- docs 门：本卡引起的三项（index 状态、board 行、evidence 导航）已闭合（index 经官方 `--print-task-index` 重出）；基提交 `38408cb82` 既有三项红（兄弟卡 CONTROL-FORM/MENU-BOX 的 board 行、TEST-DISPATCH-20261011 导航）不在本卡白名单内，留 Codex 集成处理。
- editor 全包结果见最终提交说明（Codex 复核以自己的门为准）。

## Acceptance

Codex independently checks caller/schema validity, dedup ledger, mutation selectivity, targeted/adjacent tests, lint/typecheck/docs/diff-check. GLM must not mark done.

## 下一位 Agent 提示词（Codex 独立验收）

```text
接手任务：TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1 验收
任务卡：docs/ops/tasks/TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1.md
当前状态：review（GLM 候选已推 codex/glm-editor-item-effect-residual-r1，基 38408cb82）
你的角色：Codex 独立验收（caller/schema 合法性、排重账、反控判别力、定向/相邻/全包与质量门）
先读：任务卡候选登记与裁决表、ItemUseEffectEditor.residual.glm.test.tsx、
  evidence/TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1/{README.md,counterproof.mjs,receipts/counterproof-receipt.json}、
  ItemUseEffectEditor.tsx:276-286/813-833/945-969、ItemTab.tsx:1855-1872/1210-1213、
  project-diagnostics.ts:866-876、entity-address-references.test.ts:167-216
已完成：R1/R3/R5 三合同 + 三针反控全 VALID + P1 product-counter 登记 + 资源池/配方轴零新增裁决
请你做：核每合同 caller/oracle/排重与针选择性；复跑定向与相邻；按你的门跑全包/lint/docs；
  对 P1（puppet 无自动 battleOnly）给出产品裁决或另开卡
不要做：GLM 侧不再改动；本卡不授权产品/配置/旧测试修改
输出：accept/counter + 理由写入本卡；接收后由你合并推送并清理分支
```


## Codex 独立验收与收口（2026-10-11）

- 候选提交：`ce2d9cb0b` 及证据提交 `cdba9a060..f9d8d9ca4`，源冻结 `9aa3bed892728f17c70d2f86d1fe07db10a718b8`。
- 定向复核：使用隔离 wrapper，1 file / 3 tests passed；R1/R3/R5 均走真实 ItemTab/session caller，schema-valid 输入与三针三态反控证据通过。
- 质量证据：相邻 10 文件 75/75；全包唯一失败为基线 `number-field-adoption`，已在 `38408cb82` 同命令复现；typecheck、lint 0/0/0、diff-check 与 P1 product-counter 登记通过。
- P1（puppet 未自动 battleOnly）保留为 product-counter，不以测试固化或夹修。
- 收口：`accept`，状态更新为 `done`。未修改产品、旧测试、配置或 baseline。
