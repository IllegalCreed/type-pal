# 批55:editor ui 中件 48 文件（零整改批）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本页审计主题:packages/editor/src/ui/ 151-400 行生产文件 48 件的八维审查(A–H)。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收;可复用范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 范围与证据

范围 48 件(含 design-system 大件 floating-layer/help-tips/multi-select/navigation/overlays/add-picker/draft-input-state/field-controls/list-header/icons 与页面级组件/hook),全文读毕 10.8k 行;零整改批(纯读批,零源码改动、零 diff)。验证证据:本批不新跑,复用批54 的 src/ui 全量 2504/2505(唯一红=M05)与单套件重跑 2/2 绿(批54 retry.json);原回执超 1MiB,与 editor-ui-small 为同一次执行的同字节报告,复用同一附件 [directed.json.gz](../editor-ui-small/directed.json.gz)(解压字节/SHA 与冻结 5af1b6372 一致)。零 diff 批不适用 body-invariance。

## 发现

design-system 深件:DsFloatingLayer 锚定 portal 进最近的 open dialog(top-layer z-index 不可跨;全几何重算订阅 resize/scroll/visualViewport/双 ResizeObserver);DsDialog/Drawer useDialogState 开启-收口周期(scroll lock 引用计数、外部 opener 记忆、rAF 后初始焦点链、受控 close 的 pending 事件抵消、焦点可恢复性五重校验);DsMultiSelect role=dialog 弹层+搜索+全选;DsMenuBar 双向漫游+menuitemcheckbox;DsAddPickerDialog confirm 三契约+cycle 代际防旧回调。draft-input-state 输入事务内核:draftSource 三段身份键(draftKey+syncToken+value)、IME 组合期 Enter/Escape 放行(含 keyCode 229)、组合期 blur 延迟提交、onCommit false 回滚净稿、replaceAndCommit 程序化通道。session-selector:useSyncExternalStoreWithSelector 语义自实现(等选择不重渲染);诊断徽标首帧绘制后发布。页面级 hook/会话:useEditorProjectSession save 全生命周期(PAL 确认门→pickDir→中断首存恢复 resumeOwnProjectSave→preflight→serializeEditorSnapshot 合并投影→授权 target→writeProject 进度节流;markSaved 双会话版本守卫);useEditorNavigationSession;useMapTransformSession reducer 表驱动;MapPointerGestureSession window blur 自动取消。领域组件:BattleSpriteInlinePreview 双视图域;EnemyBattleSpriteThumbnailCache LRU 64;FireEffectPreview 引擎语义帧时长 (speed+5)×10ms、fireDelay 循环点;LevelCurveEditor 拖点=一次撤销;MapContentSelectionPreview 直接读地图成员实值不拿来源模板冒充。命令表单族四家族分派与窄适配器。无障碍纪律贯穿。

## 结论

八维审查(A–H)作者主张全部通过,零源码改动、零 diff;登记移交无新清理候选。本批验证为复用证据:2504/2505(唯一红=M05 批54 已登记)。

## 整改与复核

本批零整改。Codex 2026-10-19 勘误与接管:本片 directed.json 与 editor-ui-small 是同 SHA/同 startTime 的同一次执行复用,不算第二次独立红或绿;M05 原因未核证,后续全量绿仅给该次结果信用,旧『并行互扰』归因撤回。未重跑测试;候选待 Owner 接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4432B / SHA-256 7761e7642b8baf4d147241ac3a5e21178a381be28efc73e8fa878d7fc38aedfd；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# 批55:editor ui 中件 48 文件（零整改批）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

范围:`packages/editor/src/ui/` 151-400 行生产文件 48 件(含 design-system 大件 floating-layer/help-tips/multi-select/navigation/overlays/add-picker/draft-input-state/field-controls/list-header/icons 与页面级组件/hook)。全文读毕 10.8k 行。八维审查（A–H）全部通过,零源码改动、零 diff。

## 结论(要点)

- **design-system 深件**:DsFloatingLayer(锚定 portal 进最近的 open dialog——top-layer z-index 不可跨;全几何重算订阅 resize/scroll/visualViewport/双 ResizeObserver);DsDialog/Drawer(useDialogState 开启-收口周期:scroll lock 引用计数、外部 opener 记忆、rAF 后初始焦点链 autofocus→input→button、受控 close 的 pending 事件抵消、焦点可恢复性五重校验);DsMultiSelect(role=dialog 弹层+搜索+全选/清空);DsMenuBar(menubar 双向漫游+menuitemcheckbox);DsAddPickerDialog(confirm 三契约通知/接受/显式 false 拒绝,cycle 代际防旧回调)。
- **draft-input-state**:输入事务内核——draftSource 三段身份键(draftKey+syncToken+value)、IME 组合期 Enter/Escape 放行(含 keyCode 229)、组合期 blur 延迟提交、onCommit false 回滚净稿、replaceAndCommit 程序化通道。
- **session-selector**:useSyncExternalStoreWithSelector 语义自实现(version memo+committed 引用保持,等选择不重渲染);useEditorDerivedSnapshotAfterPaint(诊断徽标在首帧绘制后发布,不阻塞字段提交反馈)。
- **页面级 hook/会话**:useEditorProjectSession(save 全生命周期:PAL 确认门→pickDir→中断首存恢复(resumeOwnProjectSave)→preflight→serializeEditorSnapshot 合并投影→授权 target→writeProject 进度节流;markSaved 双会话版本守卫);useEditorNavigationSession(URL/历史/三栏滚动恢复/per-module 记忆);useMapTransformSession(reducer 表驱动含 overwrite 确认态);MapPointerGestureSession(#private 类:笔画/拖选/平移/hover 瞬态,window blur 自动取消)。
- **领域组件**:BattleSpriteInlinePreview(layout=library 走 RawFrameInspector+SemanticFrameShelf;解码证明 asset+sha 绑定);EnemyBattleSpriteThumbnailCache(EnemyTab 持有生命周期,LRU 64,revision 复合键);FireEffectPreview(引擎语义帧时长 (speed+5)×10ms、fireDelay 循环点、音效循环点同步单实例);SpriteThumb(三层缓存 assetBase×reader×asset+revision);LevelCurveEditor(拖点=一次撤销,niceCeil Y 量程,滚轮 non-passive 缩放+触控板横滑平移,视窗裁剪渲染);MapContentSelectionPreview(placement 非 prefab——直接读地图成员实值绘制,注释明确不得拿来源模板冒充)。
- **命令表单族**:CommandForm 四家族分派(Dialogue/World/Actor/Control);command-form-controls(Row/Num/Txt/Sel 窄适配器+WorldVariablePicker 未登记显式报警+EntitySel 不在场标注+JSON 兜底);EffectEditorChain/Card(删除焦点恢复+polite 通知越过卸载存活)。
- **无障碍纪律贯穿**:menuitemcheckbox/aria-haspopup=listbox/fieldset+legend 包内联选项/删除禁用原因 aria-describedby/live region。

## 登记移交（无新增）
本批无新清理候选。

## 验证
- 定向测试:复用 src/ui 全量(2504/2505,唯一红=批54已登记并行互扰,本批零 diff 无新输入;单套件重跑 2/2 绿见批54 retry.json)——本批为纯读批,证据引用同目录 directed.json（directed.json 复制自批54全量）。
- 零 diff 批:无源码改动,不适用 body-invariance。


## Codex当前勘误与接管（2026-10-19）

本片directed.json与editor-ui-small是同SHA/同startTime的同一次执行复用，不算第二次独立红或绿。M05原因未核证，后续全量绿仅给该次结果信用；旧“并行互扰”归因撤回。 [当前返工与限制](../codex-stage2-rework.json)。


## 原生附件无损迁移（Codex，2026-10-19）

原directed.json超过现行1MiB检查边界；现以[原始JSON的无损gzip](../editor-ui-small/directed.json.gz)保留，解压字节/SHA与冻结5af1b6372一致。本片与small为同一次执行的同字节报告，复用同一附件。 未放宽files.maxSize或新增ignore；迁移与失败/恢复身份见[当前回执](../codex-stage2-rework.json)。
```
<!-- incremental-original-source:end -->
