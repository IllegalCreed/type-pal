# P3 · ScriptEditor / CommandForm / SceneScriptWorkspace 取证（ARCH-SUPPORT-GLM-1）

日期 2026-09-25。冻结 SHA `3270473862…`。对象：`ui/ScriptEditor.tsx`（实测 **4361 行**）、
`ui/CommandForm.tsx`（**2098 行**）、`ui/SceneScriptWorkspace.tsx`（约 200 行）。静态只读。

## 1. 命令族全景（CommandForm 按命令族的表单分派）

CommandForm.tsx 的渲染分派为 **50 个 `case '<kind>'`**（:337 起），实测命令族完整清单：
dialog / wait / fade / holdScreen / revealScreen / ditherScreen / teleportParty / setPartyFacing /
moveParty / moveEntity / setEntityState / setEntityFacing / setEntityFrame / playEntityAction /
stopEntityAction / stepEntity / animEntity / nudgeEntity / nudgeParty / setActorSprite /
setActorAppearance / loadScene / takeEntity / releaseEntity / applyActorCondition /
clearActorCondition / setParty / mountParty / ride / setFlag / setVar / addVar / branch /
playSound / playMusic / openShop / setAmbience / giveMoney / learnSkill / giveItem / loseItem /
setEntityAuto / setEntityTrigger / setSceneOnEnter / setSceneOnTeleport / jumpScript / callScript /
cameraPan / clearDialog / cameraSnap。
共享子件：`WorldVariablePicker`（:172 按定义过滤 + :191 flag/数值变量占位分叉）、
`useDsReorderKeys`（:328-329 dialog 行序/setParty 成员序两个族复用）。

## 2. 校验 / 引用 / 可用性 / 存储层

- **校验**：CommandForm 为受控原子事务回调（characterization test :143
  `显示称谓交给 locale+cue 原子事务回调`、:287 `world variable picker commits only a registered id`
  ——非法/未注册值不 commit）；类型切换重建 exact condition 不留旧字段（:397 标题）。
- **引用**：ScriptEditor.tsx:793 `ref: { chunk: 'shared', id: command.script }` + :1803-1811
  sharedScripts 注册表校验（缺失脚本命令在共享脚本面板有对应 unavailable 表达）。
- **可用性**：插入候选统一 `unavailableReason` 模型（:3098-3105
  `unavailableReason: '触发区没有朝向；请先选择一个可见实体'`），禁用原因用户可见。
- **存储层**：canonical body 走 props.body + 路径（getAuthorCommandAt/parseAuthorCommandPath），
  共享脚本 `state.sharedScripts`；无本地持久化、无 localStorage 写入。

## 3. 共享逻辑重复与不能合并的语义差异

- `focusRevision` 三处同构 effect：ScriptEditor :3212（命令路径聚焦）、:3721（section tab 聚焦）、
  :3866（flow step 聚焦）——同为"revision 变化 → 校验目标存在 → 选中/聚焦"模式但各自持有
  `lastApplied*Ref` 防重。可共享为一个 hook（`useFocusRevision`），但三处目标解析语义不同
  （命令路径/tab/step id），**可合并不等于应强并**；建议实施时抽通用 hook 保留三个薄适配。
- SceneScriptWorkspace :94 有一处 **biome-ignore useExhaustiveDependencies**（跨场景复用同实体 ID
  的跟随逻辑），属有意豁免且有注释论证——不是重复，是不能合并的语义点。
- playback 生命周期（SceneScriptWorkspace :186-193）：`onUi` 挂载 + `stop()` 清理对称，
  previewSourceKey 变化先 stop——闭环。

## 4. default / hook / session 清理 / undo 现有测试精确标题

| 测试（文件:行） | 确实证明 | 备注 |
|---|---|---|
| ScriptEditor.test.tsx:71 `has an author-facing Chinese name for every enabled canonical command kind` | 50 命令族全覆盖命名 | 族清单的守门 |
| ScriptEditor.test.tsx:83 `renders command rows in the existing Chinese script-tree language` | 中文脚本树语言 | covered |
| ScriptEditor.test.tsx:114 `keeps the command list full width and edits or inserts through dialogs` | 插入走对话框 | covered |
| ScriptEditor.test.tsx:173 `copies, reorders and removes an entity-state command through shared row actions` | 共享行动作 | covered |
| ScriptEditor.test.tsx:225 `[reorder-family:script-siblings] nested reorder follows locally, then external undo/redo clears path identity` | 嵌套重排+外部 undo 清路径 | covered |
| ScriptEditor.test.tsx:273 `[reorder-family:command-arrays] canonical dialogue reorder stays local until one commit and restores through real undo/redo` | 对话重排一次提交+undo 还原 | covered |
| CommandForm.current-characterization.test.tsx 13 条（:117/:143/:162/:188/:226/:244/:276/:287/:294/:305/:367/:397/:418） | 立绘域/原子事务/速度字段/危险动作/number 0 语义/world var/select/entity-state/状态词表/条件重建/清除命令 | covered |
| SceneScriptWorkspace.test.tsx 5 条（:219/:261/:304/:324/:387） | 场景跟随不覆盖显式 tab、预览范围、实体 tab 门控、引用联动、owner 定位 | covered |

## 5. 证据条目

- **P3-001 covered** 上表 42 条精确标题（24+13+5）。
- **P3-002 risk** focusRevision 三处同构 effect（:3212/:3721/:3866）+ 各自 `lastApplied*Ref`——
  拆分时可抽公共 hook；当前无行为缺陷证据。risk（可维护性）。
- **P3-003 covered** SceneScriptWorkspace playback stop/onUi 对称清理 + previewSourceKey 先停
  （静态核对；test :261 证预览范围行为）。
- **P3-004 risk** ScriptEditor :3174 选取路径保持逻辑以 `JSON.stringify` 指纹比较 body——大 body
  每次渲染序列化一次（O(size)）；行为正确（测试 :225/:273 钉住），性能成本随脚本增大线性。
  risk（非缺陷）。
- **P3-005 N/A** CommandForm 2 个 effect（WorldVariablePicker 过滤与占位分叉）均为纯派生，无资源。

## 6. 未证风险

- 50 命令族的表单分派无逐族快照测试（characterization 13 条只覆盖代表性族）；完整族矩阵属
  V1 视觉组范围，本包未运行。
- `cleanInsertionExample` 的净化语义未逐 kind 验证。
