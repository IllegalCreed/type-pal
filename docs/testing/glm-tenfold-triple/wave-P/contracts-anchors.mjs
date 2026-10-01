/** r3 P-R2-02：逐合同真实旧断言锚点（old test file + 已证 fullName/断言 + 本合同新轴）。 */
export const anchors = {
  'P01-G01-01': {
    old: 'project-io.test.ts 「shop create/copy/stock/delete save and reopen preserves occurrences and an explicit empty table」已证内容表序列化主链',
    axis: 'stamps 未登记守卫为旧测未触达臂',
  },
  'P01-G01-02': {
    old: 'project-io-admission.test.ts 「declared stamps must be loaded explicitly, and the loaded nonempty table survives serialization/reopen」已证缺参抛错',
    axis: '登记后的规范化产出与 parser round-trip 为新轴',
  },
  'P01-G01-03': {
    old: 'battle-simulator-library.test.ts 「normal project history restores exact configuration, protects aliases and retains redo on no-op」已证库解析',
    axis: 'serializeProject 的保留路径产物/空库省略为新轴',
  },
  'P01-G01-04': {
    old: 'save-preflight-boundaries.test.ts P04 已证非 catalog 二进制豁免',
    axis: 'pending blob 未登记 catalog 的序列化层拒绝为旧测未断言臂',
  },
  'P01-G01-05': {
    old: 'project-io.test.ts 「serializes only the current manifest and current author content paths」已证路径映射',
    axis: '两内容表同路径的 addFile 冲突（skills 先于 items 的迭代序）为新轴',
  },
  'P01-G01-06': {
    old: 'project-serialization-boundaries.test.ts S04 已证声明表按路径输出',
    axis: '缺 content.maps 声明拒绝为旧测未触达臂',
  },
  'P01-G01-07': {
    old: 'project-io.test.ts round-trip 主链已证有值表输出',
    axis: '声明路径+state 缺数组的空表缺省臂为新轴',
  },
  'P01-G02-01': {
    old: 'battle-simulator-library.test.ts 「parser/resolver detach nested data and section overrides never change presets」已证 parser 隔离',
    axis: 'toEditorState 入参解析隔离（改 state 不动入参）为新轴',
  },
  'P01-G02-02': {
    old: 'project-io.test.ts 「projects a current loaded project into one current editor state」已证值投影',
    axis: 'poisons 直传别名 vs sceneIndex clone 的引用语义为新轴',
  },
  'P01-G03-01': {
    old: 'author-save-journal.test.ts 「catalog double writes retain separate prefix positions」间接消费 diff',
    axis: 'computedSignatures 直读（字符串+二进制签名记录与 write 精确性）为新轴',
  },
  'P01-G03-02': {
    old: 'project-serialization-boundaries.test.ts S02 已证 copy-through 输出',
    axis: 'diffFiles 字符串原文比较与 prev 独有键 remove 为新轴',
  },
  'P01-G03-03': {
    old: 'binary-signature.test.ts 「same-length payloads with different bytes cannot share a digest」已证签名函数',
    axis: 'diffFiles 消费同长异字节判变为新轴',
  },
  'P01-G04-01': {
    old: 'save-batch-open.test.ts P7 已证 battle-simulator 哨兵读侧',
    axis: 'preflight 对 battle-simulator 字符串文件的解析/坏 kind 拒绝为新轴',
  },
  'P01-G04-02': {
    old: 'save-preflight-boundaries.test.ts P01–P03 已证 catalog 资源臂',
    axis: 'battle-simulator 非 JSON 语法错误传播为新轴',
  },
  'P01-G04-03': {
    old: 'workspace-persistence.test.ts 「项目写入和删除都不能覆盖 workspace identity 旁车」已证写入口',
    axis: 'preflight 纯函数入口的同守卫为独立入口臂',
  },
  'P01-G05-01': {
    old: 'project-copy.test.ts 「复制清单重复路径在私有暂存前拒绝，不调用源读取」已证重复拒绝',
    axis: 'copy 与编辑产物同路径让位（编辑值胜出+恰一次 close）为新轴',
  },
  'P01-G05-02': {
    old: 'project-copy.test.ts 另存为删除清单流已证 removePaths 主链',
    axis: 'copy 撞 removePaths 的让位优先级为新轴',
  },
  'P01-G05-03': {
    old: 'workspace-persistence.test.ts 授权消费合同已证',
    axis: '非 firstSave 目标携带 copies 的守卫拒绝为新轴',
  },
  'P01-G05-04': {
    old: 'workspace-final-boundaries.test.ts 「a genuine finalized or expired writer scope cannot begin another author mutation」已证能力消费',
    axis: '缺 verifySource 的准备期拒绝与目标零写为新轴',
  },
  'P01-G05-05': {
    old: 'author-save-conflict.test.ts 会话级增量保存已证',
    axis: 'writeProject 直调的 prevSnapshot 精确写集与快照签名为新轴',
  },
  'P01-G05-06': {
    old: 'author-save-journal.test.ts 进度回调未直接断言',
    axis: '进度不提早 100%（commit 前逐帧 <total、终帧恰一）为新轴',
  },
  'P01-G05-07': {
    old: 'project-copy.test.ts 空目录保留已证 directories 主链',
    axis: 'directories 声明创建真实目录且不进快照为新轴',
  },
  'P01-G05-08': {
    old: 'author-save-conflict.test.ts 「own-page retry reconciles an uncertain close」已证恢复主链',
    axis: '成功提交后 resumeOwnProjectSave 返回 null 的清洁合同为新轴',
  },
  'P01-G05-09': {
    old: 'project-io.test.ts 未断言 close 顺序',
    axis: 'manifest 引用表最后 close（sidecar 除外）为新轴',
  },
  'P01-G06-01': {
    old: 'project-diagnostics.test.ts 1240/1247 已证世界变量未登记与 flag-number 臂',
    axis: 'manifest 缺注册表路径的保存门前缀为新轴（r3 重建为 typed-legal）',
  },
  'P01-G06-02': {
    old: 'validate.ts validateEnemies 逐字段臂由 content 侧测试覆盖',
    axis: '保存门敌人分段前缀（空 battleSprite 值级违规）为新轴（r3 重建为 typed-legal）',
  },
  'P01-G06-03': {
    old: 'author-script-core.test 系已证脚本库校验主链',
    axis: '保存门共享脚本分段前缀（空 id 键）为新轴（r3 重建为 typed-legal）',
  },
  'P01-G06-04': {
    old: 'EnemyTab.test / author-dialogue 测试已证对话主链',
    axis: '保存门对话身份分段前缀（未知 Actor 指名）为新轴',
  },
  'P01-G06-05': {
    old: 'ItemUseEffectEditor.test 已证 placeEntityInFront 表单',
    axis: '保存门实体引用分段前缀（placeEntityInFront 悬空地址）为新轴',
  },
  'P01-G06-06': {
    old: 'validate.ts resources 校验由 content 测试覆盖',
    axis: '保存门开局分段 collectValue 保留键拒绝为新轴',
  },
  'P01-G06-07': {
    old: 'project-diagnostics.test.ts 资源注册表校验主链已证',
    axis: '保存门资源注册表分段前缀（bytes 负值）为新轴',
  },
  'P01-G06-08': {
    old: 'project-diagnostics.test.ts 1145 已证 missing-sprite 内容引用臂',
    axis: 'scene.mapId 悬空的内容引用臂为新轴',
  },
  'P01-G06-09': {
    old: 'validateScenes 主链由 content 测试覆盖',
    axis: '保存门场景分段前缀（页记录缺 id）为新轴（r3 重建为 typed-legal）',
  },
  'P01-G07-01': {
    old: 'project-diagnostics.test.ts 436 已证 missing-entry-point-scene codes 与 duplicate target',
    axis: '唯一 id 的 objectId 携带与空白 id #序号消息为新轴',
  },
  'P01-G07-02': {
    old: 'project-diagnostics.test.ts 1095/1213 已证 seedStats/重复开局臂',
    axis: 'resources 非法键的 issue 形状（path+target）为新轴',
  },
  'P01-G07-03': {
    old: 'project-diagnostics.test.ts 资源诊断 target 映射已证',
    axis: 'catalog 非法时资产闭包诊断整体跳过为新轴',
  },
  'P01-G07-04': {
    old: 'project-diagnostics.test.ts 1129 已证资源角色保存门',
    axis: 'manifest-assets-invalid 的 issue 形状（path=assets/target=startup）为新轴',
  },
  'P01-G07-05': {
    old: 'project-diagnostics.test.ts 已证 #24 缺失警告出现',
    axis: '#24 在场时警告静默的对照合同为新轴',
  },
  'P01-G07-06': {
    old: 'project-diagnostics.test.ts 已证缓存忽略变量作者元数据',
    axis: '同 state 对象的引用快路径（复用同一数组）为新轴',
  },
  'P01-G08-01': {
    old: 'editor-asset-reader 由 UI 测试经 assetBase 间接消费',
    axis: '未知 AssetId 拒绝指名为直读新轴',
  },
  'P01-G08-02': {
    old: 'editor-asset-reader 由 UI 测试经 assetBase 间接消费（PreviewCanvas.glm-ui-wave.test.tsx 的 record/kind 路径）；无旧直读 fullName',
    axis: '期望 kind 与实际不符报双 kind 为新轴',
  },
  'P01-G08-03': {
    old: 'save-preflight-boundaries P05 已证 pending blob 落盘',
    axis: 'readBytes 的 pending 覆盖与副本语义为新轴',
  },
  'P01-G08-04': {
    old: 'AssetRole 校验由 content 测试覆盖',
    axis: 'readRoleBytes 缺角色指名/已登记角色读字节为新轴',
  },
  'P01-G08-05': {
    old: 'PreviewCanvas 测试经 urlFor 间接消费',
    axis: 'pending blob object URL（mediaType 透传、零源读取）为新轴',
  },
  'P01-G09-01': {
    old: 'file-system-access.test.ts:16 已证 insecure-context 分类与文案',
    axis: '非法 URL 的 localhostOrigin 回退为不同残余轴（r3 排重后仅保留本条）',
  },
  'P01-G10-01': {
    old: 'seed.test.ts 「当前 manifest 不做路径兼容转换」已证不转换',
    axis: 'scenesDir 三臂归一化（缺省/补斜杠/原样）为新轴',
  },
  'P01-G10-02': {
    old: 'workspace-context-boundaries.test.ts F3 已证指纹函数',
    axis: 'palFingerprintPaths 缺省/自定义 scenes 归一与 maps 缺席为新轴',
  },
  'P01-G10-03': { old: 'seed.test.ts 克隆清单主链已证', axis: '克隆清单内容路径重复拒绝为新轴' },
  'P01-G11-01': {
    old: 'save-as-boundaries.test.ts 「cancel Save As before file construction」已证取消臂',
    axis: '带源目录缺源基线证据的校验期拒绝为新轴（293 读取证据臂 typed 不可达已登记 unreachable）',
  },
  'P02-G01-01': {
    old: 'MapSelectionInspector.glm-l.test.tsx 135 已证高度 alert 与空输入清错',
    axis: '活动层隐藏警告文案为新轴',
  },
  'P02-G01-02': {
    old: 'MapSelectionInspector.glm-l.test.tsx › L01 selection inspector gaps › 高度字段的非整数输入走 alert 校验，空输入只清错误不提交（已证高度校验）',
    axis: '活动层锁定警告文案为新轴',
  },
  'P02-G01-03': {
    old: 'glm-l 已证三通道清空 patch',
    axis: '选区命中隐藏层成员警告（按层计数）为新轴',
  },
  'P02-G01-04': { old: 'glm-l 已证移动到图层回退', axis: '选区命中锁定层成员警告为新轴' },
  'P02-G01-05': {
    old: 'MapMode.test.tsx 已证 inspector 分区布局',
    axis: '跨层选区副标题「、」连接与范围行为新轴',
  },
  'P02-G01-06': {
    old: 'glm-l 已证 tileId/collision 空输入静默',
    axis: '纯格点选区「无视觉层」+范围为新轴',
  },
  'P02-G01-07': {
    old: 'glm-l commit() 显式 focusout 已证 blur 提交',
    axis: 'Enter 键直触 blur 提交（无手动移焦）为新轴',
  },
  'P02-G01-08': {
    old: 'glm-l 135 已证高度非整数 alert',
    axis: 'tileId 负数校验消息与零 patch 为新轴',
  },
  'P02-G02-01': {
    old: 'MapMode.test.tsx 已证聚焦机制存在',
    axis: 'LayerPaintContext 聚焦按钮 aria-pressed/文案互斥为直读新轴',
  },
  'P02-G02-02': {
    old: 'MapMode.test.tsx 已证图层高控件挂载',
    axis: '显示高度滑杆 range 回调与 output 实时值为新轴',
  },
  'P02-G02-03': {
    old: 'MapMode.test.tsx 已证图层管理统一控件',
    axis: 'addDisabledReason 禁用+原因段为直读新轴',
  },
  'P02-G02-04': {
    old: 'MapMode.test.tsx 已证最小层删除规则',
    axis: '最小层规则 HelpTip 与原因段抑制关系为新轴',
  },
  'P02-G02-05': {
    old: 'MapMode.test.tsx › [reorder-family:layer-stack] 反向图层栈经 handle 单命令排序并可 undo/redo 与 图层动作组上移按稳定 ID 只派发一条 MoveProjectMapLayerCommand（已证图层管理主链）；原因段渲染无旧 fullName',
    axis: 'add/delete 同因共享单段（false 条件 r3 反控针）为新轴',
  },
  'P02-G03-01': {
    old: 'MapMode.test.tsx 700 已证笔刷面积托盘点选',
    axis: '触发器 ArrowDown/Enter 开盘+aria-expanded 相位为新轴',
  },
  'P02-G03-02': {
    old: 'MapMode.test.tsx › 笔刷面积用横向图标托盘选择并按 2 × 2 一笔写入（已证托盘点选主链）；Escape 臂无旧 fullName',
    axis: '托盘 Escape 关盘回焦触发器为新轴',
  },
  'P02-G03-03': {
    old: 'glm-leaf-wave select.test 已证通用 select 键盘',
    axis: '托盘 Home/End/ArrowLeft/Right 相对移焦为新轴',
  },
  'P02-G03-04': {
    old: 'MapMode.test.tsx 675 已证非画笔工具隐藏托盘',
    axis: 'disabled 托盘按键不开盘为新轴',
  },
  'P02-G03-05': {
    old: 'MapMode.test.tsx 701 已证绘制高度托盘挂载',
    axis: '绘制高度按 maxPaintHeight 枚举与提交为新轴',
  },
}
