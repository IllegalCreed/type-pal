# ED-5J - 物品私有脚本新建入口（use 能力卡）

Status: build
Owner: Kimi
Reviewer: GLM（异步抽审）
Phase: phase2
Capability: ED-5I / C8（依赖）

## 目标

补齐物品私有脚本的**新建**入口：作者在物品「使用」能力卡内一键新建一条归当前物品拥有的
内联脚本正文，立即可编辑、排序、删除、撤销/重做，保存重开后以 canonical
`itemPrivateScript` 落盘。不改变现有 schema、SAVE、迁移与既有 14 条迁移私有脚本。

## 范围

- 范围内:
  - v5 会话新命令 `AddItemPrivateScriptV5Command`（向物品 use.effects 追加
    `{kind:'itemPrivateScript', script:{id,label,body:[]}}`，scriptId 唯一性 fail-loud）。
  - shell 侧同步追加 `{kind:'runScript', script:{id:'item:<itemId>:<scriptId>', chunk:V5_SCRIPT_CHUNK}}`
    效果行（与 createAndBindScript 先例同构的双会话写入）。
  - 「使用」能力卡「＋ 添加效果」旁「＋ 添加私有脚本」按钮；新建后行经既有
    `privateScriptsV5` 绑定立即渲染 `ItemPrivateScriptBodyEditorV5`。
  - 命名与基数：canonical `ItemPrivateScriptV5.id` 恒为字面量 `'use'`（item-v5.ts:5-9），
    每件物品至多一条；重复新建 fail-loud，按钮在已存在时禁用。
  - 测试：命令单测（追加/重复 fail-loud）、ItemTab 集成（新建→正文编辑→撤销重做→
    序列化含 canonical itemPrivateScript）、保存重开保留。
- 范围外:
  - throw 槽私有脚本（现有内容为 use 侧概念；投掷为 typed ThrowEffect 编辑器）。
  - 共享脚本创建（剧情→脚本库已有路径）；结构化效果种类冻结集（不动 20 项 EFFECT_KINDS）。
  - 删除时 v5 孤儿正文清理策略变化（维持现状：shell 行删除后保存时自然不落盘，
    与既有删除语义一致）。
- 明确不做:
  - 不改 content schema / SAVE_VERSION / 迁移器 / 运行时消费路径。
  - 不为「效果列表形态 ⇄ 私有脚本形态」做互转 UI。

## 上下文锚点

- 已拍板决策 / 铁律:
  - AGENTS.md：常规迭代（既定 schema 上的编辑器 UX），Coding Owner 自测 + 记录验证；
    不碰三方必审清单（无 schema/save/migration/asset pipeline/公共接口变更）。
  - N3-1 终态：单调用方脚本内联私有，共享库只放真复用业务脚本。
- 代码锚点:
  - `packages/editor/src/core/script-v5-editor.ts:1301`（SetItemPrivateScriptBodyV5Command，
    新命令同位）；`script-v5-editor.ts:306-321`（私有正文引用扫描已识别 itemPrivateScript）。
  - `packages/editor/src/core/project-io-v5.ts:154-182`（mergeItemEffectsV5：shell
    `runScript(item:<id>:<privateId>)` ↔ canonical itemPrivateScript；缺正文 fail-loud）。
  - `packages/editor/src/ui/ItemTab.tsx:780-830`（privateScriptsV5 绑定）、`:910-953`
    （createAndBindScript 先例 + v5 拒斥信息）。
  - `packages/editor/src/ui/ItemUseEffectEditor.tsx:33-54`（EFFECT_KINDS 冻结集）、
    `:1249-1253`（私有行渲染）、`:1278-1293`（添加效果按钮）。
  - `packages/editor/src/ui/App.tsx:1241-1249`（保存 = mergeLegacyEditorShellIntoV5(
    canonicalState, shellState)，shell 管效果链、v5 会话管正文）。
- 已知坑:
  - battlePlayers 式双写回冲教训：只写一层会被投影回冲，必须双会话各入一笔。
  - scriptId 命名冲突会导致 mergeItemEffectsV5 把两行映射到同一正文；必须唯一性 fail-loud。
- 相关测试:
  - `packages/editor/src/ui/ItemTab.test.tsx:589-676`（私有脚本原子增删排序/正文保留先例）。
  - `packages/editor/src/core/script-v5-editor.test.ts`（v5 命令测试位）。

## 验证

- 命令单测：追加成功；同 scriptId 追加第二笔 fail-loud；undo/redo 往返。
- ItemTab 集成：新建→行渲染 BodyEditor→编辑正文→撤销（行消失）→重做（行+正文回）；
  `serializeProjectV5` 产物含 `itemPrivateScript` canonical；project-io 保存重开保留。
- editor 全套（pnpm --filter @type-pal/editor test）与 typecheck 绿；浏览器抽查
  （新物品上新建→写两条指令→保存→重开）。

## 推进签字

- build 准入: Kimi（Owner，本卡即实现方案） | Codex N/A | GLM 异步抽审 | 结论 allowed（常规迭代）
- done 准入: Kimi **accept**（2026-08-06，实现 + 自验，证据见交接） | GLM pending（异步抽审） | 用户验收 pending | 结论 blocked on GLM 抽审/用户验收

## 交接

- 2026-08-06 Kimi: 开卡。Evidence: 用户追问暴露的新建缺口（EFFECT_KINDS 无
  itemPrivateScript、全仓无新建命令、ItemTab v5 拒斥信息指向不存在的内联入口）。Next: 实现。
- 2026-08-06 Kimi: **实现完成 + 自验通过**。
  - 实现（6 文件）：
    - `core/script-v5-editor.ts`：`AddItemPrivateScriptV5Command`（use 槽至多一条，
      重复 fail-loud；canonical id 恒为 `'use'`）。
    - `ui/ItemTab.tsx`：`addPrivateScript`——双会话各入一笔（v5 会话入 canonical 正文 +
      shell 效果链入 `runScript(item:<id>:use)` 占位 ref），两笔各走各 undo 栈。
    - `ui/ItemUseEffectEditor.tsx`：`onAddPrivateScript` prop +「＋ 添加私有脚本」按钮
      （已有私有脚本或效果链不相容时禁用）。
    - `core/project-io-v5.ts`：`mergeItemEffectsV5` 新增 `tolerateMissingPrivateScript`
      参数——**健壮性必修**：新建带来的双写 undo 中间态（shell ref 尚在、正文刚撤）会让
      原 strict merge 在每次渲染抛错；现投影（`projectActiveScriptEditorStateV5`，渲染/
      扫描）容忍丢 ref，保存链（`mergeLegacyEditorShellIntoV5`）保持缺正文 fail-loud。
    - 测试：`core/script-v5-editor.test.ts`（创建/重复 fail-loud/undo/redo）、
      `ui/ItemTab.test.tsx`（按钮创建→双会话入帐→正文编辑→双会话 undo/redo→投影
      含 canonical 正文）。
  - 自验：editor typecheck 绿；editor 全套 **93 files / 800 passed**（798+2 新测）；
    浏览器实测（6010，观音符）：创建→「归当前物品拥有 · 不进入共享脚本库」正文渲染→
    添加指令→3 次 undo 全链回滚→按钮禁用/启用正确→不保存重开恢复原状；git status 仅
    实现文件与卡，projects/pal 零改动。
  - Evidence: 上述测试与实测。Next: GLM 异步抽审；通过后交用户。
- 2026-08-06 Codex（应用户「再审核一下」抽查）：
  - 复跑 editor typecheck 绿 + 全套 **93 files / 800 passed**（含 ED-5J 2 新测），
    与 Kimi 自验一致。
  - 码级核对：`AddItemPrivateScriptV5Command` 经 SnapshotCommandV5 先克隆后 transform
    （无共享态原地 mutate），至多一条 + 重复 fail-loud；shell ref `runScript` id
    `item:<id>:use` 与 canonical script.id='use' 在 mergeItemEffectsV5 双向映射一致，
    `__script-v5-runtime` chunk 通过 isV5RuntimeScriptRef；project-io 容错仅投影层
    （渲染/扫描丢 dangling ref），保存链保持缺正文 fail-loud，undo 中间态不炸。
  - 范围纪律：仅 editor 6 文件 + 卡/看板，无 content schema/SAVE/迁移/运行时改动，
    常规迭代定性成立。
  - 记录项（不阻塞）：`addPrivateScript` 先 dispatch v5 命令再 patchUse，若 patchUse
    异常会出现单侧已提交的中间态（低概率，patchUse 为受控命令）；双 undo 栈语义
    已在卡内明示并由容错投影兜底。**Codex 抽查结论：实现通过**，等待 GLM 抽审 +
    用户验收后提交收口。

## 下一位 Agent 提示词

```text
接手任务: ED-5J 物品私有脚本新建入口审查（异步抽审）
任务卡: docs/ops/tasks/ED-5J-item-private-script-create.md
当前状态: build；Kimi 实现中。
你的角色: GLM 异步抽审（只读）。
先读: 本卡锚点；packages/editor/src/core/script-v5-editor.ts（AddItemPrivateScriptV5Command）、
  ui/ItemUseEffectEditor.tsx（添加入口）、ui/ItemTab.tsx（addPrivateScript）、
  core/project-io-v5.ts（mergeItemEffectsV5）。
请你做: 抽审实现是否保持 shell/canonical 双层一致、undo/redo、保存重开、无幽灵引用；
  签 accept 或写反例。
不要做: 不改实现文件。
输出要求: 卡内交接节签 accept / counter。
```
