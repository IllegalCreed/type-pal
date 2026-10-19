# 批55:editor ui 中件 48 文件（零整改批）

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
