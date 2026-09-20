# EDITOR-ITEM-AUTHORING-1 GLM 只读取证包（G1～G5）

任务卡：[EDITOR-ITEM-AUTHORING-1](../ops/archive/tasks/done/EDITOR-ITEM-AUTHORING-1-item-script-identity.md)（draft/r1）。
本席：GLM。冻结产品 `1e0388b0`；分支 `codex/glm-item-authoring-audit`，worktree
`/Users/zhangxu/illegal/type-pal-glm-item-audit`（`git diff 1e0388b0..HEAD -- packages/ scripts/` 为空）。
方法：全部结论来自本人在冻结树上直读一手源码（`sed`/`grep`，锚点 `file:line` 均本人复核）；
未运行 Codex 探针、未读 Kimi 结论、未改产品/正式测试/基线、未做视觉。静态分类按
reproduced（源码直读证实结构）/ covered（既有测试已覆盖）/ risk（待实施验证）/ N/A 标注。

## G1 物品创建/复制/删除调用者与两会话所有权

生产调用者普查（`grep -rn 'new AddItemCommand|new DeleteItemCommand|AddItemPrivateScriptCommand'`，
排除 `*.test.*`）：**唯一生产入口为 ItemTab.tsx**，其余命中全部是测试文件。

| 操作 | 入口（file:line） | 命令与会话 | 现状判定 |
|---|---|---|---|
| 新建 | `ItemTab.tsx:1072-1077` `createBlankItem`→`session.dispatch(new AddItemCommand)` | 仅主会话 | **不写脚本会话 canonical**（D-06 根因，reproduced） |
| 复制 | `ItemTab.tsx:1079-1084` `cloneItemForAuthoring`→`AddItemCommand(copy, at)` | 仅主会话 | structuredClone 整个源物品→副本保留源私有 ref（reproduced，见 G4 行 2） |
| 删除 | `ItemTab.tsx:1086-1113` `DeleteItemCommand(item.id, getCurrentReferenceIndex)` | 仅主会话 | 引用阻断保留（ItemInUseError）；脚本会话 canonical/私有 body 不随删（内存孤儿，保存由 shell 驱动不含它） |
| 新建私有脚本 | `ItemTab.tsx:1117-1170` `historyCoordinator.dispatch(AddItemPrivateScriptCommand, UpdateItemCommand)` | **唯一配对路径** | 缺 coordinator 显式 throw（:1149-1150） |

所有权：主会话（EditSession）持 shell 物品（runtime ref 形态 effects）；脚本会话持 canonical
作者物品（含私有 body）+sharedScripts；跨会话原子只经 `EditorHistoryCoordinator`（配对 caller
共七处，`editor-history-paired-workflows.test.ts` P12 源码快照断言）；选择状态在 ItemTab 本地
（`setSelId`/`deletedSelectionRef`）；删除阻断用诊断引用索引 provider；dirty 各会话自持，保存走
`App.tsx:2148-2157` `serializeEditorSnapshot`→`mergeEditorProjectionWithCurrentAuthorState`→
`serializeProject`→`assertProjectSaveValid`。

命令语义直读：`commands.ts:2046-2064` AddItemCommand id 冲突 fail-loud；`:2087-2132`
DeleteItemCommand apply 前每次重验 blockers、捕获 migrationDiagnostics、invert 按原 index 恢复且
id 被占用时 throw（`无法撤销删除`）；`script-editor.ts:2007-2036` AddItemPrivateScriptCommand
transform 要求 canonical item 存在否则 `物品不存在 ${itemId}`（:2022-2023，D-06 抛点），
每物品至多一条、`replaceDetached` 显式替换。

## G2 共享/私有引用全链与前缀猜身份处

canonical 模型（`author-item-core.ts:14-18`）：共享 `{kind:'runScript', script: ScriptId 字符串}`、
私有 `{kind:'itemPrivateScript', script: {id:'use', body}}`，throw 槽无脚本。runtime 投影
（`runtime-project-view.ts:44-56`）：共享→`{chunk:'__author-script-runtime', id}`；私有→
`{chunk:'__author-script-runtime', id:'item:<ItemId>:use'}`（拼接）。

**按字符串猜身份的现行站点清单（全量 sweep reproduced）**：

| # | 站点 | 判定方式 |
|---|---|---|
| 1 | `script-editor-projection.ts:95-106` `projectedItemPrivateScriptId` | `startsWith('item:<itemId>:')` |
| 2 | `ItemTab.tsx:1139-1143` `shellHasPrivate` | 同上 startsWith |
| 3 | `ItemUseEffectEditor.tsx:883-886` `isPrivateScriptEffect` | 同上 startsWith（效果独占/场景分类） |
| 4 | `main.ts:5393-5395` dispatch host.runScript | `startsWith('item:')` + `split(':')` 取 [1]/[2] |
| 5 | `item-use-executor.ts:46-55` `isItemPrivateRuntimeEffect` | 全等 `item:<itemId>:use` |
| 6 | 构造侧：`ItemTab.tsx:1157`、`runtime-project-view.ts:51-53`、`ItemUseEffectEditor.tsx:878` | `item:${id}:use` 模板拼接 |

链路表面：loader→`toEditorState`（`project-io.ts:80-110`，scriptChunks 恒 `{}` 默认）→主会话
shell；脚本会话 canonical；UI/诊断/保存经 `projectCurrentAuthorReferenceSlices`/
`mergeCurrentItemShell`（`script-editor-projection.ts:107-135`：私有 ref 换 canonical body、
**共享 ref 转纯字符串**、无 body 的私有 ref 在投影中被丢弃仅保存边界拒绝）；runtime 经
runtime-project-view→main dispatch→item-use-executor。合并保存门
`mergeEditorProjectionWithCurrentAuthorState`（`:199-227`）对缺私有 body 显式
`正文缺失，拒绝保存` fail-closed（保留项）。

## G3 validateReferences 三个生产输入

`validate-refs.ts:1565-1572`：物品 `runScript` 效果读 `b.scriptChunks?.[effect.script.chunk]`
与 `.scripts[effect.script.id]`——**按旧分片 chunk/id 形态取值**。

| 生产调用域 | 输入（file:line） | 实际形态 | 结论 |
|---|---|---|---|
| 编辑器实时诊断 | `project-diagnostics.ts:676-692`（`projectCurrentAuthorReferenceSlices` 产物） | 共享=字符串、私有=itemPrivateScript；scriptChunks 未填（EditorState 默认 `{}`） | 字符串上读 `.chunk/.id`→undefined→**任何带共享脚本的物品在实时诊断也应报「共享脚本 "undefined" 不在脚本库」**（reproduced-static；动态面属实施验证） |
| 编辑器保存 | `App.tsx:2154`→`project-io.ts:229` `assertProjectSaveValid(合并态)` | 同上（merge 把共享 ref 转字符串） | 与前提探针「shared/plain 报 undefined」一致（本人结构证 + Codex 动态证） |
| PAL publication | `pal-current-publication.ts:338-361`（`resolveAuthorDialogueTree(authorItems)`） | canonical 字符串脚本（`as never` 压编译器） | 同一面；PAL 源物品无脚本故未暴露，作者新物品带共享脚本即断（reproduced-static） |

**scriptChunks 生产供给普查**：`toEditorState` 默认 `{}`（project-io.ts:84）、`open-local.ts:90`
`{}`、无任何生产装配器填真实 chunk。⇒ item-runScript 的 chunk/id 分支**没有当前生产 caller 能
合法喂入**，属旧分片遗留表面；r1 方案 3「按 ScriptId 对 sharedScripts 核验、旧分支退役」有据。
但退役前仍须逐 caller 改造（三个域都要换表面），不能只删分支。

## G4 合法输入矩阵（入口/守卫/反例条件）

| # | 输入 | 入口与现行守卫 | 反例条件（现状失败模式） |
|---|---|---|---|
| 1 | 新建→立即启用 use→加私有脚本 | ItemTab 新建（主会话）→`AddItemPrivateScriptCommand` 要求 canonical 存在 | `物品不存在 item-001`（D-06）；保存重开后成功 |
| 2 | 复制带私有脚本物品 | `cloneItemForAuthoring` structuredClone 保源 ref `item:<源>:use` | 副本 shell ref 前缀属源→投影当共享→merge 转字符串→保存报共享不存在；runtime 若可达会路由到**源的**私有脚本（语义串用） |
| 3 | 复制带共享脚本物品 | 同上 | merge 转字符串后 validateReferences 读 undefined→保存失败（D-07 第三根因，无前缀也失败） |
| 4 | 共享 ScriptId 恰为 `item:<本物品>:use` | `checkBaseScriptLibrary`（author-script-core.ts:1122）仅 nonEmptyString，**无保留前缀**；loader 接受 | UI 加脚本门 startsWith 误判「已有」；投影误判私有；main startsWith 误路由 private；executor 全等误分类（D-07 碰撞四面） |
| 5 | 共享 ScriptId 带其它 `item:` 前缀 | 同上 | main `split(':')` 路由到不存在物品的私有脚本→runtime throw/错跑 |
| 6 | ItemId 含冒号（生成器产 item-NNN 无冒号，但 authored id 未禁冒号；validate.ts:1329 只验 use 结构） | 私有 ref 拼接 `item:<含冒号id>:use` | main `split(':')` 取错段→`item private script ref 非法` throw——**合法 id 的私有脚本不可执行** |
| 7 | 删除→撤销→重做 | DeleteItemCommand blockers+原位恢复 | 现行可用；重用同 id 新建后加脚本走 `replaceDetached`（script-editor.ts:2018-2030）不接回旧 body ✓ |
| 8 | 私有缺正文 | 保存边界 merge（:213-220） | `私有脚本 use 正文缺失，拒绝保存` fail-closed ✓（方案须保留） |
| 9 | 混合效果（私有+其它） | `item-use-executor.ts:57+` executeMixedItemPrivateUse | 私有恰 1 条才走混合；`item:<id>:use` 全等判定的碰撞面同 #4 |
| 10 | 坏共享 ID（真实缺失） | validateReferences 报错 | 现报 `undefined` 而非原 ID——验收要求「准确报原ID」有据 |

## G5 旧测试去重（精确标题与缺口）

| 既有测试 | 覆盖 | 归属/状态 | 实施时缺口 |
|---|---|---|---|
| `item-authoring.boundaries.test.ts`：「copy 与 copy-2 均占用后生成 -3…」「clone 只换 id/name；结构深复制…」 | id 分配与 clone 深复制语义 | 九批已 done（TB07 复制测试，贡献保留） | 不重复；新增复制**两会话/私有语义**用例 |
| `item-commands.test.ts`（AddItem 冲突/DeleteItem blockers/missing no-op/vessel） | 单会话命令语义 | 既有 | 不重复；补跨会话成对注册 |
| `editor-history-paired-workflows.test.ts` P01-P20（P06/P07 私有脚本配对、P08-P11 顺序、P16 双侧失败保全、P19 真实 seed→loader→序列化→重开） | Coordinator 原子性/失败保全/真实链 | D-01/A-03 已 done | 不重建协议；新 caller（创建/复制/删除配对）接入后按 P12 模式扩 caller 对账 |
| `script-editor-projection(.boundaries).test.ts`：私有 body 取脚本会话/保存边界合并/「shell removal does not revive a detached canonical item script」/切片保真 | 合并语义 | 既有 | 补新 tag 投影/判定/不碰撞 |
| 350da702（TEST-RUNTIME-STATE-BOUNDARIES）/ccc67dcc（TEST-CONTENT-RESIDUAL，含 actual-argument fidelity） | 运行态取消/content 校验保真 | Codex 接收中 | 不重复返工；validateReferences 表面改造若触碰其断言按原卡补正 |

## r1 方案核对与结论

- 方案 1（成对记录+Coordinator）：与 G1 普 census 一致——只有 ItemTab 三个单会话入口需改配对；
  P01-P20 已证协议可行；「无 coordinator 显式拒绝」在 addPrivateScript 已有先例（:1149）。
- 方案 2（显式 tag `__author-item-private-runtime`+id=ItemId）：G2 全量 6 站点清单与方案声称的
  「projector/编辑器识别/executor/main host 同时更新」对齐，无遗漏站点（本人 sweep）；
  区分维度从 id 前缀移到 chunk，`item:<id>:use` 形共享 ID 不再可能碰撞（共享/私有不同 chunk
  命名空间）；canonical 持久形态不变（itemPrivateScript），无格式/版本变化。
- 方案 3（校验消费正确表面）：G3 证实三分支输入全部喂错形态、旧 chunk 分支无当前生产 caller；
  「不往保存输入塞假 scriptChunks」与现状 scriptChunks 恒 `{}` 一致。
- 方案 4（原子边界保持）：缺私有 body 的 fail-closed（:213-220）与引用阻断守卫都列明保留。
- 非阻断备注：① G3 诊断域「共享脚本 undefined」静态推断成立但未动态复现，实施回归应同时钉
  实时诊断与保存两处报错面；② ItemId 含冒号（G4#6）建议纳入方案 2 的验收矩阵显式用例
  （卡面「包含冒号/非ASCII的合法ID」已列，予以支持）；③ 复制后 main 路由到源私有脚本的
  语义串用（G4#2 runtime 侧）卡面仅记「保存报共享不存在」，runtime 面建议入负控。

无 counter：前提四行全部本人一手复证，方案与现行结构无冲突，未发现需要用户产品裁决的
before→after。
